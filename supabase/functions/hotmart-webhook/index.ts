import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── IDs dos produtos de assinatura na Hotmart ──────────────────────────────
const PRODUTO_PLUS     = Deno.env.get('HOTMART_PRODUTO_PLUS_ID')     ?? '7356565'
const PRODUTO_FUNDADOR = Deno.env.get('HOTMART_PRODUTO_FUNDADOR_ID') ?? '7356510'
const HOTTOK           = Deno.env.get('HOTMART_WEBHOOK_TOKEN')       ?? 'PKRnuD7tvr4NofiG49H3BsFThDCA8Z12748097'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── 1. Verificar token de segurança da Hotmart ─────────────────────────
    const url    = new URL(req.url)
    const hottok = url.searchParams.get('hottok')

    // ── LOG TEMPORÁRIO DE DIAGNÓSTICO — remover após resolver ──────────────
    console.log("=== DIAGNÓSTICO WEBHOOK ===")
    console.log("URL completa:", req.url)
    console.log("Hottok recebido:", hottok)
    console.log("Hottok esperado:", HOTTOK)
    console.log("Batem?", hottok === HOTTOK)
    console.log("Headers:", JSON.stringify(Object.fromEntries(req.headers)))
    console.log("===========================")
    // ──────────────────────────────────────────────────────────────────────

    if (HOTTOK && hottok !== HOTTOK) {
      console.warn("Hottok inválido recebido:", hottok)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // ── 2. Receber payload ─────────────────────────────────────────────────
    const body = await req.json()
    console.log("Evento Hotmart recebido:", body?.event, "| Produto:", body?.data?.product?.id)

    const evento         = body.event
    const email          = body.data?.buyer?.email?.toLowerCase().trim()
    const produtoId      = body.data?.product?.id?.toString()
    const subscriptionId = body.data?.subscription?.subscriber?.code ?? null

    // ── 3. Eventos de compra aprovada ──────────────────────────────────────
    const eventosCompra = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']

    if (eventosCompra.includes(evento) && email && produtoId) {

      const ehAssinaturaPlus     = produtoId === PRODUTO_PLUS
      const ehAssinaturaFundador = produtoId === PRODUTO_FUNDADOR

      // ── 3a. É uma assinatura Verbo (Plus ou Fundador) ──────────────────
      if (ehAssinaturaPlus || ehAssinaturaFundador) {
        const novoPlano = ehAssinaturaFundador ? 'fundador' : 'plus'

        // Buscar usuário pelo e-mail
        const { data: perfil, error: errPerfil } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (errPerfil || !perfil) {
          // Usuário ainda não cadastrou — salvar como pendente
          console.warn("Usuário não encontrado, salvando como pendente:", email)
          await supabaseClient
            .from('planos_pendentes')
            .upsert({ email, plano: novoPlano, hotmart_subscription_id: subscriptionId }, { onConflict: 'email' })

          return new Response(JSON.stringify({ message: 'Plano pendente salvo, aguardando cadastro.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          })
        }

        // Atualizar plano do usuário
        const { error: errUpdate } = await supabaseClient
  .from('profiles')
  .update({
    plano: novoPlano,
    hotmart_subscription_id: subscriptionId,
    plano_expira_em: null,
    plano_atualizado_em: new Date().toISOString()
  })
  .eq('id', perfil.id)

        if (errUpdate) throw errUpdate

        console.log(`Plano ${novoPlano} ativado para:`, email)
        return new Response(JSON.stringify({ message: `Plano ${novoPlano} ativado com sucesso!` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      // ── 3b. É um curso avulso — fluxo original de matrícula ───────────
      const { data: userData, error: userError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (userError || !userData) {
        console.error("Usuário não encontrado para matrícula:", email)
        return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 200 })
      }

      const { data: cursoData, error: cursoError } = await supabaseClient
        .from('cursos')
        .select('id')
        .eq('hotmart_id', produtoId)
        .single()

      if (cursoError || !cursoData) {
        console.error("Curso não vinculado ao ID Hotmart:", produtoId)
        return new Response(JSON.stringify({ error: "Curso não configurado no app" }), { status: 200 })
      }

      const { error: matriculaError } = await supabaseClient
        .from('matriculas')
        .upsert({
          user_id: userData.id,
          curso_id: cursoData.id,
          status: 'ativo'
        }, { onConflict: 'user_id, curso_id' })

      if (matriculaError) throw matriculaError

      console.log("Matrícula criada para:", email, "| Curso:", cursoData.id)
      return new Response(JSON.stringify({ message: 'Matrícula criada com sucesso!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ── 4. Cancelamento ou reembolso — rebaixar para gratuito ─────────────
    const eventosCancelamento = ['SUBSCRIPTION_CANCELLATION', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK']

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
            hotmart_subscription_id: null,
            plano_expira_em: null
          })
          .eq('id', perfil.id)

        console.log("Plano rebaixado para gratuito:", email)
      }

      return new Response(JSON.stringify({ message: 'Plano rebaixado para gratuito.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ── 5. Qualquer outro evento — ignorar sem erro ────────────────────────
    console.log("Evento ignorado:", evento)
    return new Response(JSON.stringify({ message: 'Evento recebido e ignorado.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error("Erro no processamento:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})