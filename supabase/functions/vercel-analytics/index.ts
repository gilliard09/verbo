import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VERCEL_TOKEN      = Deno.env.get('VERCEL_TOKEN')!
const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID')!
const VERCEL_API        = 'https://vercel.com/api/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Busca page views da Vercel Analytics
async function getPageViews(from: string, to: string) {
  const params = new URLSearchParams({
    projectId: VERCEL_PROJECT_ID,
    from,
    to,
    filter: '{}',
    limit:  '250',
  })

  const res = await fetch(`${VERCEL_API}/web-analytics/timeseries?${params}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Vercel API error: ${res.status} — ${err}`)
  }

  return res.json()
}

// Busca visitantes únicos
async function getVisitors(from: string, to: string) {
  const params = new URLSearchParams({
    projectId: VERCEL_PROJECT_ID,
    from,
    to,
    filter: '{}',
    limit:  '250',
  })

  const res = await fetch(`${VERCEL_API}/web-analytics/visitors?${params}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Vercel API error: ${res.status} — ${err}`)
  }

  return res.json()
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const hoje = new Date()
    const treintaDiasAtras = new Date(hoje)
    treintaDiasAtras.setDate(hoje.getDate() - 30)

    const from = treintaDiasAtras.toISOString().split('T')[0]
    const to   = hoje.toISOString().split('T')[0]

    // Busca em paralelo
    const [pageViewsData, visitorsData] = await Promise.all([
      getPageViews(from, to),
      getVisitors(from, to),
    ])

    // Soma total de visitantes únicos no período
    const totalVisitantes = visitorsData?.data?.reduce(
      (acc: number, d: any) => acc + (d.visitors ?? d.value ?? 0), 0
    ) ?? 0

    // Soma total de page views
    const totalPageViews = pageViewsData?.data?.reduce(
      (acc: number, d: any) => acc + (d.pageViews ?? d.value ?? 0), 0
    ) ?? 0

    // Visitantes dos últimos 7 dias (para o gráfico)
    const seteDiasAtras = new Date(hoje)
    seteDiasAtras.setDate(hoje.getDate() - 7)

    const visitantes7d = visitorsData?.data?.filter((d: any) => {
      const data = new Date(d.date ?? d.key)
      return data >= seteDiasAtras
    }) ?? []

    const totalVisitantes7d = visitantes7d.reduce(
      (acc: number, d: any) => acc + (d.visitors ?? d.value ?? 0), 0
    )

    return new Response(
      JSON.stringify({
        totalVisitantes,
        totalPageViews,
        totalVisitantes7d,
        periodo: { from, to },
        raw: {
          pageViews: pageViewsData,
          visitors:  visitorsData,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    console.error('[vercel-analytics]', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})