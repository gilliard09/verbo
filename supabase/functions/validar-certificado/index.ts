import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://appverbo.com.br",
  "https://www.appverbo.com.br",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const corsHeaders = (origin: string | null) => ({
  ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, headers);

  try {
    const body = await req.json().catch(() => ({}));
    const codigo = typeof body.codigo === "string" ? body.codigo.trim().toUpperCase() : "";

    // O código tem 128 bits aleatórios e formato fixo. A validação do formato
    // evita consultas desnecessárias; o banco continua sendo a fonte oficial.
    if (!/^VRB-[A-F0-9]{32}$/.test(codigo)) {
      return json({ encontrado: false }, 200, headers);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Configuração interna indisponível.");

    // A chave privilegiada permanece exclusivamente no servidor. A função
    // retorna apenas os campos necessários para a conferência pública.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin
      .from("certificates")
      .select("verification_code, student_name, course_name, completion_date, issued_at, status")
      .eq("verification_code", codigo)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ encontrado: false }, 200, headers);

    return json({ encontrado: true, certificado: data }, 200, headers);
  } catch (error) {
    console.error("validar-certificado:", error);
    return json({ error: "Não foi possível consultar o registro oficial." }, 500, headers);
  }
});
