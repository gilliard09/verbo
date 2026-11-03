import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cakto-secret',
}

const PRODUTO_PLUS = Deno.env.get('CAKTO_PRODUTO_PLUS_ID') ?? ''
const PRODUTO_FUNDADOR = Deno.env.get('CAKTO_PRODUTO_FUNDADOR_ID') ?? ''
const PRODUTO_VITALICIO = Deno.env.get('CAKTO_PRODUTO_VITALICIO_ID') ?? ''
const CAKTO_SECRET = Deno.env.get('CAKTO_WEBHOOK_SECRET') ?? ''

// ID da oferta presente no checkout vitalício publicado no app.
const OFERTA_VITALICIO_ID = 'zeegt89_920646'
const JANELA_ATRIBUICAO_MS = 30 * 24 * 60 * 60 * 1000

type JsonObject = Record<string, unknown>

const asObject = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : {}

const asString = (value: unknown): string =>
  value == null ? '' : String(value)

const jsonResponse = (body: JsonObject, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const rawBody = await req.text()
    let body: JsonObject
    try {
      body = JSON.parse(rawBody) as JsonObject
    } catch {
      console.error('Webhook Cakto recebeu JSON inválido.')
      return jsonResponse({ error: 'Invalid JSON' }, 400)
    }

    const secretNoBody = asString(body.secret)
    const secretNoHeader = req.headers.get('x-cakto-secret') ?? ''
    const secretRecebido = secretNoBody || secretNoHeader

    if (CAKTO_SECRET && secretRecebido !== CAKTO_SECRET) {
      console.warn('Webhook Cakto recusado: segredo inválido.')
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const evento = asString(body.event).toLowerCase()
    const data = asObject(body.data)
    const customer = asObject(data.customer)
    const product = asObject(data.product)
    const offer = asObject(data.offer)
    const subscription = asObject(data.subscription)

    // Compatibilidade com payloads antigos e com o formato atual documentado pela Cakto.
    const legacyCustomer = asObject(subscription.customer)
    const email = (asString(customer.email) || asString(legacyCustomer.email)).toLowerCase().trim()
    const productId = asString(product.id) || asString(subscription.product)
    const productName = asString(product.name) || asString(data.product_name) || 'Produto Cakto'
    const offerId = asString(offer.id)
    const checkoutUrl = asString(data.checkoutUrl)
    const orderId = asString(data.id) || asString(data.order_id)
    const subscriptionId = asString(subscription.id) || asString(data.subscription_id) || null
    const amount = Number(data.amount ?? subscription.amount ?? offer.price ?? 0)
    const paidAt = asString(data.paidAt) || asString(data.createdAt) || new Date().toISOString()
    const paymentMethod = asString(data.paymentMethod) || asString(subscription.paymentMethod) || null

    console.log('Evento Cakto recebido:', evento, '| Produto:', productId || 'sem-id')

    const eventosCompra = [
      'purchase_approved',
      'subscription_created',
      'subscription_renewed',
    ]

    if (eventosCompra.includes(evento)) {
      if (data.status && asString(data.status).toLowerCase() !== 'paid') {
        return jsonResponse({ message: 'Pagamento ainda não aprovado; evento ignorado.' })
      }

      if (!orderId || !email || !Number.isFinite(amount)) {
        console.warn('Compra aprovada sem identificador, e-mail ou valor válido.')
        return jsonResponse({ message: 'Dados insuficientes para registrar a compra.' }, 202)
      }

      const ehVitalicio =
        (PRODUTO_VITALICIO && productId === PRODUTO_VITALICIO) ||
        offerId === OFERTA_VITALICIO_ID ||
        checkoutUrl.includes('/' + OFERTA_VITALICIO_ID)

      const ehPlus = !!PRODUTO_PLUS && productId === PRODUTO_PLUS
      const ehFundador = !!PRODUTO_FUNDADOR && productId === PRODUTO_FUNDADOR

      // Só registra produtos de assinatura do Verbo. Outros produtos Cakto não entram no relatório.
      if (!ehVitalicio && !ehPlus && !ehFundador) {
        console.log('Produto Cakto não mapeado para os planos do Verbo; compra ignorada.')
        return jsonResponse({ message: 'Produto não mapeado; evento ignorado.' })
      }

      const planoVenda = ehVitalicio ? 'plus_vitalicio' : ehFundador ? 'fundador' : 'plus'
      const planoAcesso = ehFundador ? 'fundador' : 'plus'

      const { data: perfil, error: erroPerfil } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (erroPerfil) throw erroPerfil

      let variantePopup: string | null = null
      if (perfil?.id) {
        const inicioJanela = new Date(new Date(paidAt).getTime() - JANELA_ATRIBUICAO_MS).toISOString()
        const { data: ultimoClique, error: erroClique } = await supabaseClient
          .from('eventos_modal_upgrade')
          .select('variante')
          .eq('user_id', perfil.id)
          .in('acao', ['clicou', 'clicou_plus', 'clicou_vitalicio'])
          .gte('criado_em', inicioJanela)
          .lte('criado_em', paidAt)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (erroClique) console.warn('Não foi possível recuperar clique anterior do pop-up.')
        else variantePopup = ultimoClique?.variante ?? null
      }

      const { error: erroCompra } = await supabaseClient
        .from('cakto_purchases')
        .upsert({
          order_id: orderId,
          user_id: perfil?.id ?? null,
          plan: planoVenda,
          product_id: productId || ('offer:' + offerId),
          product_name: productName,
          offer_id: offerId || null,
          amount,
          status: 'approved',
          payment_method: paymentMethod,
          paid_at: paidAt,
          cakto_subscription_id: subscriptionId,
          popup_variant: variantePopup,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'order_id' })

      if (erroCompra) throw erroCompra

      if (!perfil?.id) {
        console.warn('Compra registrada sem conta correspondente; plano ficará pendente.')
        await supabaseClient.from('planos_pendentes').upsert({
          email,
          plano: planoAcesso,
          cakto_subscription_id: subscriptionId,
        }, { onConflict: 'email' })

        return jsonResponse({ message: 'Compra registrada; plano pendente aguardando cadastro.' })
      }

      const { error: erroUpdate } = await supabaseClient
        .from('profiles')
        .update({
          plano: planoAcesso,
          cakto_subscription_id: ehVitalicio ? null : subscriptionId,
          plano_expira_em: null,
          plano_atualizado_em: new Date().toISOString(),
        })
        .eq('id', perfil.id)

      if (erroUpdate) throw erroUpdate

      // Mantém a tabela legada usada pelos indicadores de vendas vitalícias do Admin.
      if (ehVitalicio) {
        const { error: erroVitalicio } = await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: perfil.id,
            status: 'active',
            plan: 'plus_vitalicio',
            price: amount,
            started_at: paidAt,
            expires_at: null,
            cakto_order_id: orderId,
          }, { onConflict: 'cakto_order_id' })

        if (erroVitalicio) throw erroVitalicio
      }

      return jsonResponse({ message: 'Compra Cakto registrada e plano atualizado.' })
    }

    const eventosEstorno = ['refund', 'purchase_refunded', 'purchase_chargeback', 'chargeback']
    if (eventosEstorno.includes(evento)) {
      if (orderId) {
        const novoStatus = evento.includes('chargeback') ? 'chargeback' : 'refunded'
        const { error } = await supabaseClient
          .from('cakto_purchases')
          .update({ status: novoStatus, updated_at: new Date().toISOString() })
          .eq('order_id', orderId)
        if (error) throw error

        await supabaseClient.from('subscriptions')
          .update({ status: novoStatus })
          .eq('cakto_order_id', orderId)
      }

      if (email) {
        const { data: perfil } = await supabaseClient
          .from('profiles')
          .select('id,cakto_subscription_id')
          .eq('email', email)
          .maybeSingle()

        if (perfil) {
          const { data: vitalicioAtivo } = await supabaseClient
            .from('subscriptions')
            .select('id')
            .eq('user_id', perfil.id)
            .eq('plan', 'plus_vitalicio')
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

          if (!vitalicioAtivo) {
            await supabaseClient.from('profiles').update({
              plano: 'gratuito',
              cakto_subscription_id: null,
              plano_expira_em: null,
              plano_atualizado_em: new Date().toISOString(),
            }).eq('id', perfil.id)
          }
        }
      }

      return jsonResponse({ message: 'Estorno/chargeback registrado.' })
    }

    const eventosCancelamento = ['subscription_canceled', 'subscription_cancellation', 'subscription_canceled']
    if (eventosCancelamento.includes(evento)) {
      if (!email) return jsonResponse({ message: 'Cancelamento sem e-mail; evento recebido.' })

      const { data: perfil } = await supabaseClient
        .from('profiles')
        .select('id,cakto_subscription_id')
        .eq('email', email)
        .maybeSingle()

      if (perfil) {
        const assinaturaConfere = !subscriptionId ||
          !perfil.cakto_subscription_id ||
          perfil.cakto_subscription_id === subscriptionId

        if (assinaturaConfere) {
          const { data: vitalicioAtivo } = await supabaseClient
            .from('subscriptions')
            .select('id')
            .eq('user_id', perfil.id)
            .eq('plan', 'plus_vitalicio')
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

          if (!vitalicioAtivo) {
            await supabaseClient.from('profiles').update({
              plano: 'gratuito',
              cakto_subscription_id: null,
              plano_expira_em: null,
              plano_atualizado_em: new Date().toISOString(),
            }).eq('id', perfil.id)
          }
        }
      }

      return jsonResponse({ message: 'Cancelamento processado.' })
    }

    console.log('Evento Cakto recebido e não tratado:', evento)
    return jsonResponse({ message: 'Evento recebido e ignorado.' })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro no processamento do webhook Cakto:', mensagem)
    return jsonResponse({ error: 'Falha ao processar evento Cakto.' }, 500)
  }
})
