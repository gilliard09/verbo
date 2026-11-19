import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShieldCheck, Search, CheckCircle2, XCircle, Clock3, Loader2, BookOpen, ArrowLeft, GraduationCap } from 'lucide-react';

const formatarData = (valor) => {
  if (!valor) return '—';
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '—';
};

export default function VerificarCertificado() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [codigo, setCodigo] = useState(searchParams.get('codigo') || '');
  const [status, setStatus] = useState('idle');
  const [certificado, setCertificado] = useState(null);
  const [erro, setErro] = useState('');

  const consultar = async (valor = codigo) => {
    const codigoLimpo = String(valor || '').trim().toUpperCase();
    if (!codigoLimpo) {
      setErro('Digite o código de validação informado no certificado.');
      setStatus('error');
      setCertificado(null);
      return;
    }

    setCodigo(codigoLimpo);
    setSearchParams({ codigo: codigoLimpo }, { replace: true });
    setStatus('loading');
    setErro('');
    setCertificado(null);

    try {
      const { data, error } = await supabase.functions.invoke('validar-certificado', {
        body: { codigo: codigoLimpo },
      });
      if (error) throw error;
      if (!data?.encontrado) {
        setStatus('not-found');
        return;
      }
      setCertificado(data.certificado);
      setStatus(data.certificado?.status === 'valid' ? 'valid' : 'revoked');
    } catch (e) {
      console.error('Erro ao validar certificado:', e);
      setErro('Não foi possível consultar o registro agora. Verifique sua conexão e tente novamente.');
      setStatus('error');
    }
  };

  useEffect(() => {
    const codigoUrl = searchParams.get('codigo');
    if (codigoUrl) {
      setCodigo(codigoUrl);
      consultar(codigoUrl);
    }
  }, []);

  const resultado = status === 'valid' || status === 'revoked';

  return (
    <main className="min-h-screen bg-[#F7F6FA] px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2c126a] text-white shadow-lg shadow-violet-950/15">
            <BookOpen size={27} strokeWidth={1.8} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[.24em] text-[#6D28D9]">Academia Verbo</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Validação de certificado</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
            Confirme a autenticidade de um certificado emitido pela Academia Verbo usando o código ou QR Code do documento.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_60px_rgba(35,20,70,.07)] sm:p-8">
          <label htmlFor="codigo-certificado" className="mb-2 block text-sm font-bold text-slate-800">Código de validação</label>
          <form onSubmit={(e) => { e.preventDefault(); consultar(); }} className="flex flex-col gap-3 sm:flex-row">
            <input
              id="codigo-certificado"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex.: VRB-..."
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold tracking-wide text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2c126a] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-violet-950/15 transition hover:bg-[#3a1985] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
              Validar
            </button>
          </form>

          {status === 'loading' && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-violet-50 p-4 text-sm text-violet-900">
              <Loader2 size={19} className="animate-spin" />
              Consultando o registro oficial...
            </div>
          )}

          {status === 'not-found' && (
            <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <XCircle className="mt-0.5 shrink-0 text-amber-700" size={21} />
              <div>
                <p className="font-bold text-amber-900">Certificado não localizado</p>
                <p className="mt-1 text-sm leading-5 text-amber-800">Não encontramos um registro com esse código. Confira os caracteres e tente novamente.</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{erro}</div>
          )}

          {resultado && certificado && (
            <div className={`mt-6 overflow-hidden rounded-2xl border ${status === 'valid' ? 'border-emerald-200' : 'border-red-200'}`}>
              <div className={`flex items-center gap-3 px-5 py-4 ${status === 'valid' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {status === 'valid'
                  ? <CheckCircle2 className="shrink-0 text-emerald-700" size={25} />
                  : <XCircle className="shrink-0 text-red-700" size={25} />}
                <div>
                  <p className={`font-extrabold ${status === 'valid' ? 'text-emerald-900' : 'text-red-900'}`}>
                    {status === 'valid' ? 'Certificado autêntico' : 'Certificado revogado'}
                  </p>
                  <p className={`mt-0.5 text-xs ${status === 'valid' ? 'text-emerald-800' : 'text-red-800'}`}>
                    {status === 'valid' ? 'Este documento consta como válido no registro oficial.' : 'Este documento consta como revogado no registro oficial.'}
                  </p>
                </div>
              </div>
              <dl className="grid gap-0 divide-y divide-slate-100 px-5 sm:grid-cols-2 sm:divide-y-0">
                <div className="py-4 sm:pr-4"><dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aluno</dt><dd className="mt-1.5 break-words text-sm font-bold text-slate-900">{certificado.student_name}</dd></div>
                <div className="py-4 sm:pl-4"><dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Curso</dt><dd className="mt-1.5 break-words text-sm font-bold text-slate-900">{certificado.course_name}</dd></div>
                <div className="py-4 sm:pr-4"><dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Conclusão</dt><dd className="mt-1.5 text-sm font-semibold text-slate-700">{formatarData(certificado.completion_date)}</dd></div>
                <div className="py-4 sm:pl-4"><dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Emissão</dt><dd className="mt-1.5 text-sm font-semibold text-slate-700">{formatarData(certificado.issued_at)}</dd></div>
              </dl>
              {Array.isArray(certificado.academic_history) && certificado.academic_history.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-5">
                  <div className="mb-4 flex items-center gap-2">
                    <GraduationCap size={19} className="text-[#5B21B6]" />
                    <h2 className="text-sm font-extrabold text-slate-900">Histórico acadêmico</h2>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-violet-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Matérias</p><p className="mt-1 text-xl font-black text-violet-950">{certificado.academic_history.length}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avaliações concluídas</p><p className="mt-1 text-xl font-black text-slate-900">{certificado.academic_history.reduce((n, m) => n + m.assessments.filter((a) => a.status === 'completed').length, 0)}</p></div>
                    <div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Média das notas</p><p className="mt-1 text-xl font-black text-slate-900">{(() => { const grades = certificado.academic_history.flatMap((m) => m.assessments.filter((a) => a.status === 'completed' && a.grade !== null).map((a) => Number(a.grade))); return grades.length ? (grades.reduce((s, n) => s + n, 0) / grades.length).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—'; })()}</p></div>
                  </div>
                  <div className="space-y-3">
                    {certificado.academic_history.map((materia, index) => (
                      <div key={index} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-slate-900">{materia.title}</h3><span className="text-[11px] font-medium text-slate-500">{materia.lessons_completed}/{materia.lessons_total} aulas concluídas</span></div>
                        {materia.assessments.length > 0 ? <div className="mt-3 divide-y divide-slate-100">
                          {materia.assessments.map((avaliacao, idx) => (
                            <div key={idx} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                              <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-700">{avaliacao.title}</p><p className="mt-1 text-[10px] text-slate-400">{avaliacao.status === 'completed' ? `Concluída em ${formatarData(avaliacao.completed_at)}` : avaliacao.active === false ? 'Avaliação desativada no momento da emissão' : 'Não realizada'}{avaliacao.minimum_grade !== null ? ` · Nota mínima: ${avaliacao.minimum_grade}` : ''}</p></div>
                              {avaliacao.status === 'completed' ? <div className="text-right"><p className="text-sm font-black text-slate-900">{Number(avaliacao.grade).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p><p className={`text-[10px] font-bold ${avaliacao.passed ? 'text-emerald-700' : 'text-amber-700'}`}>{avaliacao.passed ? 'Aprovado' : 'Não aprovado'}</p></div> : <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${avaliacao.active === false ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>{avaliacao.active === false ? 'Inativa' : 'Pendente'}</span>}
                            </div>
                          ))}
                        </div> : <p className="mt-2 text-xs text-slate-500">Matéria concluída sem avaliação cadastrada.</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!Array.isArray(certificado.academic_history) || certificado.academic_history.length === 0) && <div className="border-t border-slate-100 px-5 py-4 text-xs leading-5 text-slate-500">O histórico acadêmico não está disponível para este certificado, emitido antes da implantação deste recurso.</div>}
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3"><p className="break-all text-[10px] font-medium text-slate-400">Código: {certificado.verification_code}</p></div>
            </div>
          )}
        </section>

        <footer className="mt-8 text-center">
          <p className="text-xs leading-5 text-slate-400">A validação é realizada diretamente no registro oficial da Academia Verbo.</p>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#5B21B6] transition hover:text-[#2c126a]">
            <ArrowLeft size={14} /> Voltar ao Verbo
          </Link>
        </footer>
      </div>
    </main>
  );
}
