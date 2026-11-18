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


async function buildAcademicHistory(admin: ReturnType<typeof createClient>, userId: string, cursoId: string, subjectIds: string[]) {
  const { data: subjects, error: subjectsError } = await admin
    .from("materias")
    .select("id, titulo, ordem")
    .eq("curso_id", cursoId)
    .order("ordem", { ascending: true });
  if (subjectsError) throw subjectsError;
  if (!subjects?.length) return [];

  const ids = subjects.map((subject) => subject.id);
  const { data: lessons, error: lessonsError } = await admin
    .from("aulas")
    .select("id, materia_id")
    .in("materia_id", ids);
  if (lessonsError) throw lessonsError;

  const lessonIds = (lessons || []).map((lesson) => lesson.id);
  const { data: progress, error: progressError } = lessonIds.length
    ? await admin.from("progresso_aulas").select("aula_id, concluida_em")
        .eq("user_id", userId).in("aula_id", lessonIds)
    : { data: [], error: null };
  if (progressError) throw progressError;

  const completed = new Set((progress || []).filter((item) => item.concluida_em).map((item) => item.aula_id));
  const { data: evaluations, error: evaluationsError } = await admin
    .from("avaliacoes")
    .select("id, materia_id, titulo, nota_minima")
    .in("materia_id", ids)
    .order("created_at", { ascending: true });
  if (evaluationsError) throw evaluationsError;

  const evaluationIds = (evaluations || []).map((item) => item.id);
  const { data: attempts, error: attemptsError } = evaluationIds.length
    ? await admin.from("tentativas_avaliacao")
        .select("avaliacao_id, nota, acertos, total_questoes, aprovado, concluida_em")
        .eq("user_id", userId)
        .in("avaliacao_id", evaluationIds)
        .not("concluida_em", "is", null)
        .order("concluida_em", { ascending: false })
    : { data: [], error: null };
  if (attemptsError) throw attemptsError;

  const latestAttempt = new Map<string, typeof attempts[number]>();
  for (const attempt of attempts || []) {
    if (!latestAttempt.has(attempt.avaliacao_id)) latestAttempt.set(attempt.avaliacao_id, attempt);
  }

  return subjects.map((subject) => {
    const subjectLessons = (lessons || []).filter((lesson) => lesson.materia_id === subject.id);
    const subjectEvaluations = (evaluations || []).filter((evaluation) => evaluation.materia_id === subject.id);
    return {
      title: subject.titulo,
      lessons_completed: subjectLessons.filter((lesson) => completed.has(lesson.id)).length,
      lessons_total: subjectLessons.length,
      assessments: subjectEvaluations.map((evaluation) => {
        const attempt = latestAttempt.get(evaluation.id);
        return {
          title: evaluation.titulo,
          minimum_grade: evaluation.nota_minima,
          status: attempt ? "completed" : "not_taken",
          grade: attempt?.nota ?? null,
          passed: attempt?.aprovado ?? null,
          correct_answers: attempt?.acertos ?? null,
          total_questions: attempt?.total_questoes ?? null,
          completed_at: attempt?.concluida_em ?? null,
        };
      }),
    };
  }).filter((subject) => subject.lessons_total > 0);
}

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
      .select("id, verification_code, student_name, course_name, completion_date, issued_at, status, academic_history")
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

    // Congela o histórico acadêmico no momento da emissão.
    const academicHistory = await buildAcademicHistory(admin, userId, cursoId, subjectIds);

    const payload = {
      academic_history: academicHistory,
      user_id: userId,
      curso_id: cursoId,
      student_name: studentName,
      course_name: course.titulo,
      completion_date: completionDate,
    };

    const { data: inserted, error: insertError } = await admin
      .from("certificates")
      .insert(payload)
      .select("id, verification_code, student_name, course_name, completion_date, issued_at, status, academic_history")
      .single();

    if (insertError?.code === "23505") {
      const { data: raced, error: racedError } = await admin
        .from("certificates")
        .select("id, verification_code, student_name, course_name, completion_date, issued_at, status, academic_history")
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
