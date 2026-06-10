import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRODUTO_PLUS     = Deno.env.get('CAKTO_PRODUTO_PLUS_ID')     ?? ''
const PRODUTO_FUNDADOR = Deno.env.get('CAKTO_PRODUTO_FUNDADOR_ID') ?? ''
const CAKTO_SECRET     = Deno.env.get('CAKTO_WEBHOOK_SECRET')      ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── 1. Ler body ────────────────────────────────────────────────────────
    const rawBody = await req.text()

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      console.error("Body não é JSON válido:", rawBody)
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
    }

    // ── 2. Verificar chave secreta da Cakto ────────────────────────────────
    const secretNoBody   = (body.secret as string | undefined) ?? ''
    const secretNoHeader = req.headers.get('x-cakto-secret') ?? ''
    const secretRecebido = secretNoBody || secretNoHeader

    if (CAKTO_SECRET && secretRecebido !== CAKTO_SECRET) {
      console.warn("Secret inválido recebido:", secretRecebido)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // ── 3. Extrair campos do payload da Cakto ─────────────────────────────
    // Estrutura real confirmada:
    // body.event
    // body.data.subscription.customer.email
    // body.data.subscription.product  (UUID direto, string)
    // body.data.subscription.id
    const evento       = (body.event as string | undefined) ?? ''
    const data         = (body.data as Record<string, unknown> | undefined) ?? {}
    const subscription = (data.subscription as Record<string, unknown> | undefined) ?? {}
    const customer     = (subscription.customer as Record<string, unknown> | undefined) ?? {}

    const email          = ((customer.email as string | undefined) ?? '').toLowerCase().trim()
    const produtoId      = (subscription.product as string | undefined)?.toString() ?? ''
    const subscriptionId = (subscription.id as string | undefined)?.toString() ?? null

    console.log("Evento Cakto:", evento, "| Produto:", produtoId, "| Email:", email)

    // ── 4. Eventos que ativam o plano ─────────────────────────────────────
    const eventosCompra = [
      'purchase_approved',    'PURCHASE_APPROVED',
      'subscription_created', 'SUBSCRIPTION_CREATED',
      'subscription_renewed', 'SUBSCRIPTION_RENEWED',
    ]

    if (eventosCompra.includes(evento) && email && produtoId) {

      const ehPlus     = produtoId === PRODUTO_PLUS
      const ehFundador = produtoId === PRODUTO_FUNDADOR

      if (ehPlus || ehFundador) {
        const novoPlano = ehFundador ? 'fundador' : 'plus'

        // Buscar usuário pelo e-mail
        const { data: perfil, error: errPerfil } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (errPerfil || !perfil) {
          // Usuário ainda não se cadastrou — salvar como pendente
          console.warn("Usuário não encontrado, salvando como pendente:", email)
          await supabaseClient
            .from('planos_pendentes')
            .upsert(
              { email, plano: novoPlano, cakto_subscription_id: subscriptionId },
              { onConflict: 'email' }
            )

          return new Response(
            JSON.stringify({ message: 'Plano pendente salvo, aguardando cadastro.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }

        // Atualizar plano na tabela profiles
        const { error: errUpdate } = await supabaseClient
          .from('profiles')
          .update({
            plano: novoPlano,
            cakto_subscription_id: subscriptionId,
            plano_expira_em: null,
            plano_atualizado_em: new Date().toISOString()
          })
          .eq('id', perfil.id)

        if (errUpdate) throw errUpdate

        console.log(`Plano ${novoPlano} ativado para:`, email)
        return new Response(
          JSON.stringify({ message: `Plano ${novoPlano} ativado com sucesso!` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      console.warn("Produto não mapeado como Plus ou Fundador:", produtoId)
      return new Response(
        JSON.stringify({ message: 'Produto não mapeado, evento ignorado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ── 5. Cancelamento / reembolso → rebaixar para gratuito ──────────────
    const eventosCancelamento = [
      'subscription_cancellation', 'SUBSCRIPTION_CANCELLATION',
      'subscription_canceled',     'SUBSCRIPTION_CANCELED',
      'purchase_refunded',         'PURCHASE_REFUNDED',
      'purchase_chargeback',       'PURCHASE_CHARGEBACK',
      'refund',
      'chargeback',
    ]

    if (eventosCancelamento.includes(evento) && email) {
      const { data: perfil } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (perfil) {
        await supabaseClient
          .from('profiles')
          .update({
            plano: 'gratuito',
            cakto_subscription_id: null,
            plano_expira_em: null,
            plano_atualizado_em: new Date().toISOString()
          })
          .eq('id', perfil.id)

        console.log("Plano rebaixado para gratuito:", email)
      }

      return new Response(
        JSON.stringify({ message: 'Plano rebaixado para gratuito.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ── 6. Qualquer outro evento — ignorar sem erro ────────────────────────
    console.log("Evento ignorado:", evento)
    return new Response(
      JSON.stringify({ message: 'Evento recebido e ignorado.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Erro no processamento:", (error as Error).message)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})