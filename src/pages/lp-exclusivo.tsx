import React, { useState } from 'react';
import {
  ArrowRight, Check, ChevronDown, CirclePlay, Clock3, BookOpen,
  PenTool, Mic2, Wifi, GraduationCap, ShieldCheck, Infinity,
  Star, Quote, Smartphone, Laptop, Sparkles
} from 'lucide-react';

const CHECKOUTS = {
  fundador: 'https://pay.cakto.com.br/c8fyhqn_920183',
  plus: 'https://pay.cakto.com.br/ykwdiud_920168',
  vitalicio: 'https://pay.cakto.com.br/zeegt89_920646',
};

const DEPOIMENTOS = [
  {
    texto: 'Paz pastor adorei o aplicativo do verbo, nossa bem prático, fácil, muito bom mesmo. A gente tem a liberdade de escrever como a gente quiser sem problema nenhum para escrever a mensagem.',
    nome: 'Jayne',
    local: 'Santa Catarina',
    imagem: '/depoimento-jayne.webp',
  },
  {
    texto: 'Bonito e integralizado, boa aparência, fácil manuseio e objetivo!',
    nome: 'Michel',
    local: 'São Paulo',
    imagem: '/depoimento-michel.webp',
  },
  {
    texto: 'Sensacional o app ali mano. Bem organizado e facilita pra organizar o esboço. Benção de Deus!',
    nome: 'Oséas',
    local: 'Santa Catarina',
    imagem: '/depoimento-oseas.webp',
  },
];

const FAQS = [
  ['O Verbo substitui meu estudo bíblico?', 'Não. O Verbo é uma ferramenta para ajudar você a organizar seus estudos e sermões. A interpretação responsável das Escrituras, a oração e a preparação continuam sendo parte do trabalho do pregador.'],
  ['Posso usar no celular e no computador?', 'O Verbo foi pensado para acompanhar sua rotina de preparação. Acesse pelo navegador nos dispositivos compatíveis e entre com sua conta.'],
  ['O que está incluído em cada plano?', 'Os limites e recursos variam conforme o plano. Confira as condições apresentadas no checkout antes de concluir a compra.'],
  ['Como funciona o plano Fundador?', 'O Fundador custa R$ 9,90 por mês. A cobrança é recorrente conforme as condições informadas no checkout da Cakto.'],
  ['Como funciona o Vitalício?', 'O Vitalício é uma oferta de pagamento único. Consulte no checkout o valor, o escopo do acesso e as condições específicas da oferta antes de pagar.'],
  ['Posso cancelar uma assinatura?', 'Para as condições de cancelamento, reembolso e cobrança, consulte os termos apresentados no checkout e as políticas aplicáveis à sua compra.'],
];

function CheckoutButton({ href, children, secondary = false, className = '' }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-bold transition-all duration-200 ${secondary ? 'border border-white/25 bg-white/5 text-white hover:bg-white/10' : 'bg-[#F97316] text-white shadow-lg shadow-orange-950/20 hover:bg-orange-500 hover:-translate-y-0.5'} ${className}`}>
      {children}<ArrowRight size={17} />
    </a>
  );
}

function Faq({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button className="flex w-full items-center justify-between gap-5 py-5 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="font-semibold text-slate-800">{question}</span>
        <ChevronDown className={`shrink-0 text-violet-700 transition-transform ${open ? 'rotate-180' : ''}`} size={19} />
      </button>
      {open && <p className="max-w-3xl pb-5 pr-8 text-sm leading-7 text-slate-600">{answer}</p>}
    </div>
  );
}

export default function LpExclusivo() {
  const [videoAberto, setVideoAberto] = useState(false);
  return (
    <div className="min-h-screen overflow-hidden bg-white font-[Poppins,sans-serif] text-slate-900">
      <div className="bg-[#251044] px-4 py-2 text-center text-xs font-semibold tracking-wide text-white sm:text-sm">
        Conheça o Verbo e escolha o plano que acompanha sua rotina de preparação
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#inicio" className="flex items-center gap-3" aria-label="Verbo - início">
            <img src="/logo.webp" alt="Logo Verbo" className="h-10 w-10 rounded-xl object-contain" />
            <span className="text-xl font-black uppercase tracking-tight text-[#4C1D95]">VERBO</span>
          </a>
          <a href="#planos" className="rounded-full bg-[#4C1D95] px-5 py-3 text-xs font-bold text-white transition hover:bg-violet-800 sm:px-6 sm:text-sm">Ver planos</a>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative isolate overflow-hidden bg-[#160D25] text-white">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_15%,rgba(124,58,237,.38),transparent_40%),radial-gradient(ellipse_at_5%_95%,rgba(249,115,22,.13),transparent_35%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-violet-100">
                <Sparkles size={14} className="text-orange-300" /> Tecnologia que serve à Palavra
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
                Sua próxima mensagem começa <span className="text-orange-400">aqui.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/75 sm:text-lg">
                Prepare, organize e leve suas pregações com mais praticidade. Tenha suas ferramentas de preparação em um só lugar com o Verbo.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#planos" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F97316] px-7 py-4 text-sm font-extrabold text-white shadow-xl shadow-orange-950/30 transition hover:-translate-y-0.5 hover:bg-orange-500 sm:text-base">
                  Escolher meu plano <ArrowRight size={18} />
                </a>
                <button onClick={() => setVideoAberto(true)} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10 sm:text-base">
                  <CirclePlay size={19} /> Ver o Verbo em ação
                </button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-white/65">
                <span className="flex items-center gap-2"><Check size={15} className="text-orange-300" /> Sermões organizados</span>
                <span className="flex items-center gap-2"><Check size={15} className="text-orange-300" /> Modo Púlpito</span>
                <span className="flex items-center gap-2"><Check size={15} className="text-orange-300" /> Recursos bíblicos</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-5 rounded-[2rem] bg-violet-500/20 blur-3xl" />
              <div className="relative rounded-[1.7rem] border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur">
                <div className="overflow-hidden rounded-[1.2rem] bg-white">
                  <img src="/screenshot-editor.jpg" alt="Editor de sermões do aplicativo Verbo" className="aspect-[4/3] w-full object-cover object-top" />
                </div>
                <div className="absolute -bottom-5 -left-3 rounded-2xl border border-white/20 bg-[#281443] p-4 shadow-xl sm:-left-8 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300"><PenTool size={20} /></div>
                    <div><p className="text-sm font-bold text-white">Seu sermão, organizado</p><p className="mt-1 text-xs text-white/60">Pronto para acompanhar você</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-5 py-8 sm:grid-cols-4 sm:px-8">
            {[
              [PenTool, 'Editor de sermões'],
              [BookOpen, 'Bíblia integrada'],
              [Mic2, 'Modo Púlpito'],
              [GraduationCap, 'Academia Verbo'],
            ].map(([Icon, label]) => <div key={label} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#4C1D95]"><Icon size={19} /></span>{label}</div>)}
          </div>
        </section>

        <section className="bg-[#F8F7FB] px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#6D28D9]">Feito para sua rotina</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Menos tempo organizando. Mais atenção à mensagem.</h2>
              <p className="mt-5 leading-7 text-slate-600">O Verbo reúne ferramentas que ajudam você a preparar, organizar e consultar seus sermões durante a semana e na hora de pregar.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                [PenTool, 'Organize seus esboços', 'Escreva e estruture suas mensagens em um espaço pensado para sermões.'],
                [BookOpen, 'Consulte a Bíblia', 'Acesse referências bíblicas sem perder o fio da preparação.'],
                [Mic2, 'Leve ao púlpito', 'Use uma leitura limpa e ajustável para acompanhar sua mensagem.'],
                [Wifi, 'Tenha acesso offline', 'Consulte materiais salvos mesmo quando a conexão não estiver disponível.'],
              ].map(([Icon, title, desc]) => <article key={title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-[#4C1D95]"><Icon size={23} /></span>
                <h3 className="mt-5 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
              </article>)}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#6D28D9]">Veja por dentro</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Ferramentas para acompanhar sua preparação.</h2></div>
              <button onClick={() => setVideoAberto(true)} className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-[#4C1D95] hover:bg-violet-50"><CirclePlay size={18} /> Assistir demonstração</button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                ['/screenshot-editor.jpg', 'Editor de Sermões', 'Escreva, formate e organize seus esboços com salvamento automático.'],
                ['/screenshot-dashboard.jpg', 'Seus sermões organizados', 'Encontre suas mensagens salvas em um só lugar.'],
                ['/screenshot-academia.png', 'Academia Verbo', 'Acesse cursos de teologia e pregação e acompanhe seu progresso.'],
                ['/screenshot-pulpito-limpo.jpg', 'Modo Púlpito', 'Mantenha o foco na mensagem com uma leitura limpa e ajustável.'],
              ].map(([src, title, desc]) => <article key={title} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-hidden bg-slate-100"><img src={src} alt={title} loading="lazy" className="aspect-[16/9] w-full object-cover object-top transition duration-500 hover:scale-[1.02]" /></div>
                <div className="p-6"><h3 className="font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p></div>
              </article>)}
            </div>
          </div>
        </section>

        <section className="bg-[#160D25] px-5 py-20 text-white sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-orange-300">Quem já usa</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Na rotina de pregadores de verdade.</h2><p className="mt-4 leading-7 text-white/65">Veja o que usuários compartilharam sobre a experiência com o Verbo.</p></div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {DEPOIMENTOS.map((d) => <figure key={d.nome} className="flex flex-col rounded-3xl border border-white/10 bg-white/[.06] p-6 sm:p-7">
                <div className="flex gap-1 text-orange-300">{[1,2,3,4,5].map(n => <Star key={n} size={15} fill="currentColor" />)}</div>
                <Quote size={25} className="mt-5 text-white/25" />
                <blockquote className="mt-2 flex-1 text-sm leading-7 text-white/85">“{d.texto}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                  <img src={d.imagem} alt={d.nome} loading="lazy" className="h-11 w-11 rounded-full border border-white/15 object-cover" />
                  <div><p className="text-sm font-bold">{d.nome}</p><p className="mt-1 text-xs text-white/50">{d.local}</p></div>
                </figcaption>
              </figure>)}
            </div>
          </div>
        </section>

        <section id="planos" className="scroll-mt-24 bg-[#F8F7FB] px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#6D28D9]">Escolha seu acesso</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Um Verbo para cada momento da sua jornada.</h2>
              <p className="mt-4 leading-7 text-slate-600">Escolha o plano que faz sentido para sua rotina. Confira os detalhes e as condições no checkout antes de finalizar.</p>
            </div>
            <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
              <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <p className="text-xs font-extrabold uppercase tracking-[.15em] text-slate-500">Para começar</p>
                <h3 className="mt-3 text-2xl font-black">Fundador</h3>
                <p className="mt-4 flex items-baseline gap-1"><span className="text-4xl font-black tracking-tight">R$ 9,90</span><span className="text-sm text-slate-500">/mês</span></p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">Uma forma acessível de começar a organizar suas mensagens com o Verbo.</p>
                <ul className="my-7 space-y-3 text-sm text-slate-700">{['Plano mensal recorrente', 'Ferramentas incluídas conforme a oferta', 'Acesso conforme os limites do plano'].map(t => <li key={t} className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" />{t}</li>)}</ul>
                <CheckoutButton href={CHECKOUTS.fundador} secondary className="mt-auto !border-slate-200 !bg-white !text-[#4C1D95] hover:!bg-violet-50">Assinar Fundador</CheckoutButton>
              </article>

              <article className="relative flex flex-col rounded-3xl border-2 border-[#6D28D9] bg-white p-7 shadow-xl shadow-violet-900/10 sm:p-8 lg:-translate-y-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#6D28D9] px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white">Plano recomendado</div>
                <p className="mt-2 text-xs font-extrabold uppercase tracking-[.15em] text-[#6D28D9]">Para uso contínuo</p>
                <h3 className="mt-3 text-2xl font-black">Plus</h3>
                <p className="mt-4 flex items-baseline gap-1"><span className="text-4xl font-black tracking-tight">R$ 47,00</span><span className="text-sm text-slate-500">/mês</span></p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">Para quem quer usar o Verbo de forma recorrente na preparação e organização das mensagens.</p>
                <ul className="my-7 space-y-3 text-sm text-slate-700">{['Experiência completa conforme o plano', 'Recursos e limites definidos na oferta', 'Acesso recorrente enquanto a assinatura estiver ativa'].map(t => <li key={t} className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" />{t}</li>)}</ul>
                <CheckoutButton href={CHECKOUTS.plus} className="mt-auto">Escolher Plus</CheckoutButton>
              </article>

              <article className="flex flex-col rounded-3xl border border-orange-200 bg-[#241435] p-7 text-white shadow-sm sm:p-8">
                <div className="mb-4 inline-flex items-center gap-2 self-start rounded-full bg-orange-400/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-orange-200"><Clock3 size={13} /> Oferta promocional</div>
                <h3 className="text-2xl font-black">Vitalício</h3>
                <p className="mt-4 text-3xl font-black tracking-tight">Pagamento único</p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-white/70">Uma única compra, sem mensalidade recorrente para o acesso vitalício descrito nas condições da oferta.</p>
                <ul className="my-7 space-y-3 text-sm text-white/85">{['Pagamento único', 'Sem cobrança mensal recorrente', 'Confira escopo e condições no checkout'].map(t => <li key={t} className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-orange-300" />{t}</li>)}</ul>
                <CheckoutButton href={CHECKOUTS.vitalicio} className="mt-auto">Ver oferta Vitalícia</CheckoutButton>
                <p className="mt-3 text-center text-[11px] leading-5 text-white/45">Consulte o preço e as condições vigentes no checkout.</p>
              </article>
            </div>
            <p className="mx-auto mt-7 max-w-3xl text-center text-xs leading-6 text-slate-500">Os preços, recursos, limites de uso, forma de cobrança e condições do Vitalício devem ser conferidos no checkout antes da compra. A disponibilidade promocional está sujeita às condições informadas na oferta.</p>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#6D28D9]">Perguntas frequentes</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Antes de escolher seu plano.</h2><p className="mt-4 leading-7 text-slate-600">Veja as respostas para as dúvidas mais comuns sobre o Verbo e as ofertas.</p><a href="#planos" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#4C1D95]">Voltar aos planos <ArrowRight size={16} /></a></div>
            <div>{FAQS.map(([question, answer]) => <Faq key={question} question={question} answer={answer} />)}</div>
          </div>
        </section>

        <section className="bg-[#160D25] px-5 py-16 text-center text-white sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl"><img src="/logo.webp" alt="" className="mx-auto mb-5 h-12 w-12 rounded-xl object-contain" /><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Organize suas mensagens com o Verbo.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-white/65">Escolha o plano que combina com sua rotina e conheça as condições de acesso.</p><a href="#planos" className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#F97316] px-7 py-4 text-sm font-extrabold text-white transition hover:bg-orange-500">Conhecer os planos <ArrowRight size={18} /></a></div>
        </section>
      </main>

      <footer className="bg-[#10091A] px-5 py-7 text-center text-xs leading-6 text-white/45">
        <p className="font-bold tracking-wide text-white/65">VERBO · O Verbo nasce da Palavra</p>
        <p className="mt-2">Confira os termos, a política de privacidade e as condições da oferta antes de concluir a compra.</p>
        <p className="mt-1">© {new Date().getFullYear()} Verbo. Todos os direitos reservados.</p>
      </footer>

      {videoAberto && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={() => setVideoAberto(false)}>
        <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl" onClick={e => e.stopPropagation()}>
          <button onClick={() => setVideoAberto(false)} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-slate-900">Fechar ✕</button>
          <div className="aspect-video"><iframe className="h-full w-full" src="https://www.youtube-nocookie.com/embed/FFSS5F7JSms?autoplay=1&rel=0" title="Demonstração do Verbo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
        </div>
      </div>}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur md:hidden">
        <a href="#planos" className="flex w-full items-center justify-center gap-2 rounded-full bg-[#4C1D95] px-5 py-3.5 text-sm font-extrabold text-white">Ver planos e ofertas <ArrowRight size={17} /></a>
      </div>
    </div>
  );
}
