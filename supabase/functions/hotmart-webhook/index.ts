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
    const status = body.event // Evento enviado pela Hotmart
    const hotmartProductId = body.data?.product?.id?.toString() // ID do produto na Hotmart

    // --- ATUALIZAÇÃO: Aceita Compra Aprovada OU Compra Completa ---
    const eventosValidos = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];

    if (eventosValidos.includes(status) && email && hotmartProductId) {
      
      // 3. Buscar o usuário pelo e-mail
      const { data: userData, error: userError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (userError || !userData) {
        // Retornamos 200 mesmo se não achar o perfil para a Hotmart não ficar tentando reenviar infinitamente
        console.error("Usuário não encontrado no banco:", email)
        return new Response(JSON.stringify({ error: "Usuário não encontrado no profiles" }), { status: 200 })
      }

      // 4. Buscar o curso que tem esse hotmart_id vinculado
      const { data: cursoData, error: cursoError } = await supabaseClient
        .from('cursos')
        .select('id')
        .eq('hotmart_id', hotmartProductId)
        .single()

      if (cursoError || !cursoData) {
        console.error("Curso não vinculado a esse ID Hotmart:", hotmartProductId)
        return new Response(JSON.stringify({ error: "Curso não configurado no app" }), { status: 200 })
      }

      // 5. Criar ou atualizar a matrícula para o curso correto (upsert evita duplicidade)
      const { error: matriculaError } = await supabaseClient
        .from('matriculas')
        .upsert({ 
          user_id: userData.id, 
          curso_id: cursoData.id,
          status: 'ativo' 
        }, { onConflict: 'user_id, curso_id' }) // Garante que não duplique se os dois eventos chegarem

      if (matriculaError) throw matriculaError

      return new Response(JSON.stringify({ message: `Acesso liberado via ${status}!` }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      })
    }

    // Para qualquer outro evento (cancelamento, boleto impresso, etc), retornamos 200 para limpar o log da Hotmart
    return new Response(JSON.stringify({ message: "Evento recebido e ignorado logicamente" }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 
    })

  } catch (error) {
    console.error("Erro no processamento:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 // Mantemos 200 no catch para evitar retentativas infinitas da Hotmart por erros de lógica
    })
  }
})