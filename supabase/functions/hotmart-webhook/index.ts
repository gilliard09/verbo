import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lidar com o preflight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Receber os dados da Hotmart
    const body = await req.json()
    console.log("Recebido da Hotmart:", body)

    const email = body.data?.buyer?.email
    const status = body.event // 'PURCHASE_APPROVED'
    const hotmartProductId = body.data?.product?.id?.toString() // ID do produto na Hotmart

    if (status === 'PURCHASE_APPROVED' && email && hotmartProductId) {
      
      // 3. Buscar o usuário pelo e-mail
      const { data: userData, error: userError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (userError || !userData) {
        return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 404 })
      }

      // 4. Buscar o curso que tem esse hotmart_id vinculado
      const { data: cursoData, error: cursoError } = await supabaseClient
        .from('cursos')
        .select('id')
        .eq('hotmart_id', hotmartProductId)
        .single()

      if (cursoError || !cursoData) {
        console.error("Curso não vinculado a esse ID Hotmart:", hotmartProductId)
        return new Response(JSON.stringify({ error: "Curso não configurado no app" }), { status: 404 })
      }

      // 5. Criar a matrícula para o curso correto
      const { error: matriculaError } = await supabaseClient
        .from('matriculas')
        .upsert({ 
          user_id: userData.id, 
          curso_id: cursoData.id,
          status: 'ativo' 
        })

      if (matriculaError) throw matriculaError

      return new Response(JSON.stringify({ message: "Acesso liberado com sucesso!" }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      })
    }

    return new Response(JSON.stringify({ message: "Evento ignorado" }), { status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400 
    })
  }
})