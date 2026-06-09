import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── IDs dos produtos de assinatura na Cakto ────────────────────────────────
// Preencha com os UUIDs reais dos produtos no painel da Cakto
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
    // A Cakto envia o secret dentro do body JSON (campo "secret")
    // ou via header x-cakto-secret — verificamos os dois
    const secretNoBody   = (body.secret as string | undefined) ?? ''
    const secretNoHeader = req.headers.get('x-cakto-secret') ?? ''
    const secretRecebido = secretNoBody || secretNoHeader

    if (CAKTO_SECRET && secretRecebido !== CAKTO_SECRET) {
      console.warn("Secret inválido recebido:", secretRecebido)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // ── 3. Extrair campos do payload da Cakto ─────────────────────────────
    const evento       = (body.event as string | undefined) ?? ''
    const data         = (body.data as Record<string, unknown> | undefined) ?? {}
    const buyer        = (data.buyer       as Record<string, unknown> | undefined) ?? {}
    const product      = (data.product     as Record<string, unknown> | undefined) ?? {}
    const subscription = (data.subscription as Record<string, unknown> | undefined) ?? null

    const email          = ((buyer.email as string | undefined) ?? '').toLowerCase().trim()
    const produtoId      = (product.id as string | undefined)?.toString() ?? ''
    const subscriptionId = subscription?.id?.toString() ?? null

    console.log("Evento Cakto:", evento, "| Produto:", produtoId, "| Email:", email)

    // ── 4. Eventos de compra aprovada e assinatura renovada ───────────────
    const eventosCompra = [
      'purchase_approved',
      'PURCHASE_APPROVED',
      'subscription_renewed',
      'SUBSCRIPTION_RENEWED',
    ]

    if (eventosCompra.includes(evento) && email && produtoId) {

      const ehPlus     = produtoId === PRODUTO_PLUS
      const ehFundador = produtoId === PRODUTO_FUNDADOR

      // ── 4a. É uma assinatura Verbo (Plus ou Fundador) ──────────────────
      if (ehPlus || ehFundador) {
        const novoPlano = ehFundador ? 'fundador' : 'plus'

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

        // Atualizar plano — usa a nova coluna cakto_subscription_id
        const { error: errUpdate } = await supabaseClient
          .from('profiles')
          .update({
            plano: novoPlano,
            cakto_subscription_id: subscriptionId,   // ← coluna nova
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

      // ── 4b. Produto não mapeado — logar e ignorar ─────────────────────
      console.warn("Produto não mapeado como Plus ou Fundador:", produtoId)
      return new Response(
        JSON.stringify({ message: 'Produto não mapeado, evento ignorado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ── 5. Cancelamento, reembolso ou chargeback → rebaixar para gratuito ─
    const eventosCancelamento = [
      'subscription_cancellation', 'SUBSCRIPTION_CANCELLATION',
      'subscription_canceled',
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
            cakto_subscription_id: null,   // ← limpa coluna nova
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