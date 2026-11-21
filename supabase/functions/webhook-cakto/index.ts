import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cakto-secret, x-cakto-timestamp, x-cakto-signature',
}

const PRODUTO_PLUS = Deno.env.get('CAKTO_PRODUTO_PLUS_ID') ?? ''
const PRODUTO_ESSENCIAL = Deno.env.get('CAKTO_PRODUTO_ESSENCIAL_ID') ?? '4e2c36c0-586e-4475-8e12-b7c8b2435cee'
const PRODUTO_FUNDADOR = Deno.env.get('CAKTO_PRODUTO_FUNDADOR_ID') ?? ''
const PRODUTO_VITALICIO = Deno.env.get('CAKTO_PRODUTO_VITALICIO_ID') ?? ''
const CAKTO_SECRET = Deno.env.get('CAKTO_WEBHOOK_SECRET') ?? ''

// ID da oferta presente no checkout vitalício publicado no app.
const OFERTA_VITALICIO_ID = 'zeegt89_920646'
const JANELA_ATRIBUICAO_MS = 30 * 24 * 60 * 60 * 1000
const TOLERANCIA_ASSINATURA_SEGUNDOS = 5 * 60

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

const constantTimeEqual = (left: string, right: string): boolean => {
  const a = new TextEncoder().encode(left)
  const b = new TextEncoder().encode(right)
  if (a.length !== b.length) return false

  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

const validarAssinaturaCakto = async (
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string,
): Promise<boolean> => {
  const timestampNumber = Number(timestamp)
  if (
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() / 1000 - timestampNumber) > TOLERANCIA_ASSINATURA_SEGUNDOS
  ) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  )

  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return constantTimeEqual(signature, `v1=${hex}`)
}

const autenticarCakto = async (
  req: Request,
  rawBody: string,
  body: JsonObject,
): Promise<boolean> => {
  if (!CAKTO_SECRET) {
    console.error('CAKTO_WEBHOOK_SECRET não configurado.')
    return false
  }

  const timestamp = req.headers.get('x-cakto-timestamp') ?? ''
  const signature = req.headers.get('x-cakto-signature') ?? ''

  // Quando a Cakto envia os headers HMAC, exige a assinatura e sua janela temporal.
  if (timestamp || signature) {
    if (!timestamp || !signature) return false
    return await validarAssinaturaCakto(rawBody, timestamp, signature, CAKTO_SECRET)
  }

  // Compatibilidade com entregas sem os headers HMAC e com integrações legadas por header.
  const secretRecebido = asString(body.secret) || req.headers.get('x-cakto-secret') || ''
  return constantTimeEqual(secretRecebido, CAKTO_SECRET)
}

const buscarPerfilPorEmail = async (supabaseClient: ReturnType<typeof createClient>, email: string) => {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id,plano,cakto_subscription_id,plano_atualizado_em')
    .eq('email', email)
    .maybeSingle()

  if (error) throw error
  return data
}

const processarEvento = async (
  evento: string,
  data: JsonObject,
  supabaseClient: ReturnType<typeof createClient>,
): Promise<string> => {
  const customer = asObject(data.customer)
  const product = asObject(data.product)
  const offer = asObject(data.offer)
  const subscription = asObject(data.subscription)

  // O contato do cliente no nível superior é o campo completo documentado pela Cakto.
  const email = asString(customer.email).toLowerCase().trim()
  const productId = asString(product.id) || asString(subscription.product)
  const productName = asString(product.name) || asString(data.product_name) || 'Produto Cakto'
  const offerId = asString(offer.id)
  const checkoutUrl = asString(data.checkoutUrl)
  const orderId = asString(data.id) || asString(data.order_id)
  const subscriptionId = asString(subscription.id) || asString(data.subscription_id)
  const amount = Number(data.amount ?? subscription.amount ?? offer.price ?? 0)
  const paidAt = asString(data.paidAt) || asString(data.createdAt) || new Date().toISOString()
  const paymentMethod = asString(data.paymentMethod) || asString(subscription.paymentMethod) || null

  console.log('Evento Cakto recebido:', evento, '| Produto:', productId || 'sem-id')

  const eventosCompra = [
    'purchase_approved',
    'subscription_created',
    'subscription_renewed',
    'subscription_late_recovered',
  ]

  if (eventosCompra.includes(evento)) {
    if (
      data.status &&
      asString(data.status).toLowerCase() !== 'paid' &&
      evento !== 'subscription_late_recovered'
    ) {
      return 'Pagamento ainda não aprovado; evento ignorado.'
    }

    if (!orderId || !email || !Number.isFinite(amount) || amount < 0) {
      console.warn('Compra aprovada sem identificador, e-mail ou valor válido.')
      return 'Dados insuficientes para registrar a compra.'
    }

    const ehVitalicio =
      (!!PRODUTO_VITALICIO && productId === PRODUTO_VITALICIO) ||
      offerId === OFERTA_VITALICIO_ID ||
      checkoutUrl.includes('/' + OFERTA_VITALICIO_ID)

    const ehPlus = !!PRODUTO_PLUS && productId === PRODUTO_PLUS
    const ehEssencial = !!PRODUTO_ESSENCIAL && productId === PRODUTO_ESSENCIAL
    const ehFundador = !!PRODUTO_FUNDADOR && productId === PRODUTO_FUNDADOR

    if (!ehVitalicio && !ehPlus && !ehEssencial && !ehFundador) {
      console.log('Produto Cakto não mapeado para os planos do Verbo; compra ignorada.')
      return 'Produto não mapeado; evento ignorado.'
    }

    const planoVenda = ehVitalicio ? 'plus_vitalicio' : ehFundador ? 'fundador' : ehEssencial ? 'essencial' : 'plus'
    const planoAcesso = ehFundador ? 'fundador' : ehEssencial ? 'essencial' : 'plus'

    const perfil = await buscarPerfilPorEmail(supabaseClient, email)

    const { data: compraExistente, error: erroCompraExistente } = await supabaseClient
      .from('cakto_purchases')
      .select('user_id,popup_variant')
      .eq('order_id', orderId)
      .maybeSingle()

    if (erroCompraExistente) throw erroCompraExistente

    let variantePopup: string | null = compraExistente?.popup_variant ?? null
    if (perfil?.id && !variantePopup) {
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
        user_id: perfil?.id ?? compraExistente?.user_id ?? null,
        plan: planoVenda,
        product_id: productId || ('offer:' + offerId),
        product_name: productName,
        offer_id: offerId || null,
        amount,
        status: 'approved',
        payment_method: paymentMethod,
        paid_at: paidAt,
        cakto_subscription_id: subscriptionId || null,
        popup_variant: variantePopup,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'order_id' })

    if (erroCompra) throw erroCompra

    if (!perfil?.id) {
      console.warn('Compra registrada sem conta correspondente; plano ficará pendente.')
      const { error: erroPendente } = await supabaseClient
        .from('planos_pendentes')
        .upsert({
          email,
          plano: planoAcesso,
          cakto_subscription_id: subscriptionId || null,
        }, { onConflict: 'email' })

      if (erroPendente) throw erroPendente
      return 'Compra registrada; plano pendente aguardando cadastro.'
    }

    const instanteCompra = new Date(paidAt).getTime()
    const instantePlano = perfil.plano_atualizado_em
      ? new Date(perfil.plano_atualizado_em).getTime()
      : 0
    const eventoAntigo = Number.isFinite(instanteCompra) && instantePlano > instanteCompra
    const renovacaoDeOutraAssinatura =
      evento === 'subscription_renewed' &&
      !!perfil.cakto_subscription_id &&
      !!subscriptionId &&
      perfil.cakto_subscription_id !== subscriptionId

    if (eventoAntigo || renovacaoDeOutraAssinatura) {
      console.warn('Compra registrada, mas não alterou o perfil: evento antigo ou de outra assinatura.')
      return 'Compra registrada; plano atual preservado.'
    }

    const { error: erroUpdate } = await supabaseClient
      .from('profiles')
      .update({
        plano: planoAcesso,
        cakto_subscription_id: ehVitalicio ? null : (subscriptionId || null),
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

    return 'Compra Cakto registrada e plano atualizado.'
  }

  const eventosEstorno = ['refund', 'chargeback', 'purchase_refunded', 'purchase_chargeback']
  if (eventosEstorno.includes(evento)) {
    if (!orderId) {
      console.warn('Estorno/chargeback sem ID de pedido; nenhum plano foi alterado.')
      return 'Estorno recebido sem ID de pedido.'
    }

    const novoStatus = evento.includes('chargeback') ? 'chargeback' : 'refunded'
    const { data: compraAfetada, error: erroAtualizarCompra } = await supabaseClient
      .from('cakto_purchases')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .select('user_id,plan,cakto_subscription_id')
      .maybeSingle()

    if (erroAtualizarCompra) throw erroAtualizarCompra

    const { error: erroAtualizarVitalicio } = await supabaseClient
      .from('subscriptions')
      .update({ status: novoStatus })
      .eq('cakto_order_id', orderId)

    if (erroAtualizarVitalicio) throw erroAtualizarVitalicio

    let perfil = null
    if (compraAfetada?.user_id) {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id,plano,cakto_subscription_id')
        .eq('id', compraAfetada.user_id)
        .maybeSingle()
      if (error) throw error
      perfil = data
    } else if (email) {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id,plano,cakto_subscription_id')
        .eq('email', email)
        .maybeSingle()
      if (error) throw error
      perfil = data
    }

    if (!perfil || perfil.plano === 'fundador') {
      return 'Estorno registrado; plano legado ou perfil não alterado.'
    }

    const { data: vitalicioAtivo, error: erroVitalicioAtivo } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', perfil.id)
      .eq('plan', 'plus_vitalicio')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (erroVitalicioAtivo) throw erroVitalicioAtivo
    if (vitalicioAtivo) return 'Estorno registrado; outra licença vitalícia permanece ativa.'

    const idAssinaturaAfetada = subscriptionId || asString(compraAfetada?.cakto_subscription_id)
    const estornoDaAssinaturaAtual =
      !!idAssinaturaAfetada &&
      !!perfil.cakto_subscription_id &&
      perfil.cakto_subscription_id === idAssinaturaAfetada
    const estornoDaLicencaVitalicia =
      compraAfetada?.plan === 'plus_vitalicio' &&
      !perfil.cakto_subscription_id &&
      perfil.plano === 'plus'

    if (!estornoDaAssinaturaAtual && !estornoDaLicencaVitalicia) {
      console.warn('Estorno registrado sem rebaixar o perfil: a compra não corresponde ao acesso atual.')
      return 'Estorno registrado; plano atual preservado.'
    }

    const { error: erroRebaixar } = await supabaseClient
      .from('profiles')
      .update({
        plano: 'gratuito',
        cakto_subscription_id: null,
        plano_expira_em: null,
        plano_atualizado_em: new Date().toISOString(),
      })
      .eq('id', perfil.id)

    if (erroRebaixar) throw erroRebaixar
    return 'Estorno/chargeback registrado e acesso correspondente revogado.'
  }

  if (evento === 'subscription_canceled') {
    if (!subscriptionId) {
      console.warn('Cancelamento sem ID de assinatura; plano preservado por segurança.')
      return 'Cancelamento recebido sem ID de assinatura; nenhum plano foi alterado.'
    }

    const { data: perfil, error: erroPerfil } = await supabaseClient
      .from('profiles')
      .select('id,plano,cakto_subscription_id')
      .eq('cakto_subscription_id', subscriptionId)
      .maybeSingle()

    if (erroPerfil) throw erroPerfil
    if (!perfil) {
      console.warn('Cancelamento ignorado: ID não corresponde a uma assinatura atual do Verbo.')
      return 'Cancelamento recebido; nenhuma assinatura atual correspondente.'
    }

    if (perfil.plano === 'fundador') {
      return 'Cancelamento recebido; acesso Fundador legado preservado.'
    }

    const { data: vitalicioAtivo, error: erroVitalicioAtivo } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', perfil.id)
      .eq('plan', 'plus_vitalicio')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (erroVitalicioAtivo) throw erroVitalicioAtivo
    if (vitalicioAtivo) {
      return 'Cancelamento recebido; licença vitalícia ativa preservada.'
    }

    const { error: erroRebaixar } = await supabaseClient
      .from('profiles')
      .update({
        plano: 'gratuito',
        cakto_subscription_id: null,
        plano_expira_em: null,
        plano_atualizado_em: new Date().toISOString(),
      })
      .eq('id', perfil.id)
      .eq('cakto_subscription_id', subscriptionId)

    if (erroRebaixar) throw erroRebaixar
    return 'Assinatura cancelada e acesso correspondente revogado.'
  }

  // Atraso, recusa de renovação e pausa não são cancelamentos definitivos.
  // O acesso permanece até a Cakto confirmar recuperação ou cancelamento final.
  const eventosInformativos = [
    'subscription_late',
    'subscription_renewal_refused',
    'subscription_paused',
    'subscription_resumed',
    'refund_requested',
    'purchase_refused',
  ]

  if (eventosInformativos.includes(evento)) {
    console.log('Evento informativo Cakto recebido; acesso não alterado:', evento)
    return 'Evento recebido; acesso preservado até confirmação de mudança definitiva.'
  }

  console.log('Evento Cakto recebido e não tratado:', evento)
  return 'Evento recebido e ignorado.'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!CAKTO_SECRET) {
    console.error('Webhook Cakto indisponível: CAKTO_WEBHOOK_SECRET não configurado.')
    return jsonResponse({ error: 'Webhook authentication is not configured.' }, 503)
  }

  try {
    const rawBody = await req.text()
    let body: JsonObject
    try {
      body = JSON.parse(rawBody) as JsonObject
    } catch {
      console.error('Webhook Cakto recebeu JSON inválido.')
      return jsonResponse({ error: 'Invalid JSON' }, 400)
    }

    if (!await autenticarCakto(req, rawBody, body)) {
      console.warn('Webhook Cakto recusado: autenticação inválida.')
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const evento = asString(body.event).toLowerCase()
    if (!evento) return jsonResponse({ error: 'Missing event' }, 400)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Webhook V1 envia um objeto; V2 pode enviar vários pedidos no mesmo array.
    const dados = Array.isArray(body.data)
      ? body.data.map(asObject)
      : [asObject(body.data)]

    if (!dados.length || dados.some((item) => !Object.keys(item).length)) {
      return jsonResponse({ error: 'Invalid event data' }, 400)
    }

    const resultados: string[] = []
    for (const data of dados) {
      resultados.push(await processarEvento(evento, data, supabaseClient))
    }

    return jsonResponse({
      message: 'Evento Cakto recebido.',
      processed: resultados.length,
      results: resultados,
    })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro no processamento do webhook Cakto:', mensagem)
    return jsonResponse({ error: 'Falha ao processar evento Cakto.' }, 500)
  }
})
