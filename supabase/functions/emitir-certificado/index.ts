import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://appverbo.com.br",
  "https://www.appverbo.com.br",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const getCorsHeaders = (origin: string | null) => ({
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
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, corsHeaders);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "É necessário estar autenticado para emitir o certificado." }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authorization.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ error: "Sessão inválida ou expirada. Entre novamente." }, 401, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const cursoId = typeof body.cursoId === "string" ? body.cursoId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(cursoId)) {
      return json({ error: "Curso inválido." }, 400, corsHeaders);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = authData.user.id;

    const { data: course, error: courseError } = await admin
      .from("cursos").select("id, titulo").eq("id", cursoId).maybeSingle();
    if (courseError) throw courseError;
    if (!course) return json({ error: "Curso não encontrado." }, 404, corsHeaders);

    const { data: existing, error: existingError } = await admin
      .from("certificates")
      .select("id, verification_code, student_name, course_name, completion_date, issued_at, status")
      .eq("user_id", userId).eq("curso_id", cursoId).eq("status", "valid")
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return json({ certificate: existing, alreadyIssued: true }, 200, corsHeaders);
    }


    const { data: subjects, error: subjectsError } = await admin
      .from("materias").select("id").eq("curso_id", cursoId);
    if (subjectsError) throw subjectsError;
    const subjectIds = (subjects || []).map((item) => item.id);
    if (!subjectIds.length) {
      return json({ error: "Este curso ainda não possui matérias cadastradas." }, 409, corsHeaders);
    }

    const { data: lessons, error: lessonsError } = await admin
      .from("aulas").select("id").in("materia_id", subjectIds);
    if (lessonsError) throw lessonsError;
    const lessonIds = (lessons || []).map((item) => item.id);
    if (!lessonIds.length) {
      return json({ error: "Este curso ainda não possui aulas cadastradas." }, 409, corsHeaders);
    }

    const { data: progress, error: progressError } = await admin
      .from("progresso_aulas")
      .select("aula_id, concluida_em")
      .eq("user_id", userId)
      .in("aula_id", lessonIds)
      .order("concluida_em", { ascending: false });
    if (progressError) throw progressError;

    const completedIds = new Set((progress || []).map((item) => item.aula_id));
    const missing = lessonIds.filter((id) => !completedIds.has(id));
    if (missing.length) {
      return json({
        error: "O curso ainda não está 100% concluído.",
        aulasPendentes: missing.length,
      }, 409, corsHeaders);
    }

    const completionTimestamp = (progress || [])
      .map((item) => item.concluida_em)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    if (!completionTimestamp) {
      return json({ error: "Não foi possível determinar a data de conclusão." }, 409, corsHeaders);
    }
    const completionDate = new Date(completionTimestamp).toISOString().slice(0, 10);

    const { data: profile, error: profileError } = await admin
      .from("profiles").select("full_name").eq("id", userId).maybeSingle();
    if (profileError) throw profileError;

    const studentName = (
      profile?.full_name ||
      authData.user.user_metadata?.full_name ||
      authData.user.email?.split("@")[0] ||
      ""
    ).trim();
    if (!studentName) {
      return json({ error: "Não foi possível identificar o nome do aluno no perfil." }, 422, corsHeaders);
    }

    const payload = {
      user_id: userId,
      curso_id: cursoId,
      student_name: studentName,
      course_name: course.titulo,
      completion_date: completionDate,
    };

    const { data: inserted, error: insertError } = await admin
      .from("certificates")
      .insert(payload)
      .select("id, verification_code, student_name, course_name, completion_date, issued_at, status")
      .single();

    if (insertError?.code === "23505") {
      const { data: raced, error: racedError } = await admin
        .from("certificates")
        .select("id, verification_code, student_name, course_name, completion_date, issued_at, status")
        .eq("user_id", userId).eq("curso_id", cursoId).eq("status", "valid")
        .single();
      if (racedError) throw racedError;
      return json({ certificate: raced, alreadyIssued: true }, 200, corsHeaders);
    }
    if (insertError) throw insertError;

    // Mantém os campos legados da matrícula sincronizados quando houver matrícula.
    await admin.from("matriculas")
      .update({ concluido_em: completionTimestamp, certificado_emitido: true })
      .eq("user_id", userId).eq("curso_id", cursoId);

    return json({ certificate: inserted, alreadyIssued: false }, 201, corsHeaders);
  } catch (error) {
    console.error("emitir-certificado:", error);
    return json({ error: "Não foi possível emitir o certificado agora. Tente novamente." }, 500, corsHeaders);
  }
});
