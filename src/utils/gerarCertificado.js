// utils/gerarCertificado.js
export function gerarCertificado({ nomeAluno, nomeCurso, dataFormatada, codigoValidacao }) {
  const qrUrl = `https://appverbo.com.br/verificar?codigo=${codigoValidacao}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Certificado — ${nomeAluno}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background:#f0eef8;
    display:flex; align-items:center; justify-content:center;
    min-height:100vh;
    font-family:'DM Sans',sans-serif;
  }
  .page {
    width:297mm; height:210mm;
    background:#fff;
    position:relative; overflow:hidden;
    display:flex; flex-direction:row;
    box-shadow:0 40px 120px rgba(91,45,255,0.18);
  }

  /* ── Faixa lateral ── */
  .sidebar {
    width:64px;
    background:linear-gradient(180deg,#5B2DFF 0%,#3d1db3 60%,#1a0a5e 100%);
    display:flex; flex-direction:column;
    align-items:center; justify-content:space-between;
    padding:24px 0; flex-shrink:0;
  }
  .sidebar-text {
    writing-mode:vertical-rl; text-orientation:mixed;
    transform:rotate(180deg);
    font-size:8.5px; font-weight:500; letter-spacing:0.22em;
    text-transform:uppercase; color:rgba(255,255,255,0.38);
  }
  .sidebar-logo {
    width:36px; height:36px;
    background:rgba(255,255,255,0.13);
    border-radius:10px; border:1px solid rgba(255,255,255,0.2);
    display:flex; align-items:center; justify-content:center;
  }
  .sidebar-dot { width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,0.28); }

  /* ── Corpo ── */
  .body {
    flex:1; display:flex; flex-direction:column;
    padding:28px 38px 24px 32px; position:relative;
    justify-content:space-between;
  }

  /* Ornamento geométrico */
  .ornament {
    position:absolute;
    right:-30px; top:50%; transform:translateY(-50%);
    opacity:0.04; pointer-events:none;
  }

  /* ── Topo: logo + badge ── */
  .top-row {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom:16px;
    border-bottom:1px solid #ede8ff;
  }
  .brand-name { font-size:13px; font-weight:600; color:#1a0a5e; letter-spacing:0.04em; }
  .brand-sub { font-size:8.5px; color:#9b8fd4; letter-spacing:0.12em; text-transform:uppercase; margin-top:1px; }
  .cert-badge {
    font-size:8.5px; font-weight:500; letter-spacing:0.2em;
    text-transform:uppercase; color:#b09fe8;
    background:#f5f2ff; border:1px solid #e0d8ff;
    padding:4px 12px; border-radius:20px;
  }

  /* ── Seção central — ocupa toda a área do meio ── */
  .center {
    flex:1;
    display:flex; flex-direction:column;
    justify-content:center;
    padding:10px 0 8px;
    gap:0;
  }

  .cert-eyebrow {
    font-family:'DM Sans',sans-serif;
    font-size:9.5px; font-weight:500;
    letter-spacing:0.26em; text-transform:uppercase;
    color:#b09fe8; margin-bottom:6px;
  }

  .cert-headline {
    font-family:'Playfair Display',serif;
    font-size:54px; font-weight:900;
    color:#0f0730; line-height:0.95;
    letter-spacing:-0.025em;
    margin-bottom:20px;
  }
  .cert-headline span { color:#5B2DFF; }

  /* Linha "que o(a) aluno(a) + nome" lado a lado */
  .award-row {
    display:flex; align-items:baseline; gap:12px;
    margin-bottom:8px; flex-wrap:wrap;
  }
  .award-label {
    font-size:12px; color:#8878b8; font-weight:400; white-space:nowrap;
  }
  .student-name {
    font-family:'Playfair Display',serif;
    font-size:38px; font-weight:700; font-style:italic;
    color:#5B2DFF; letter-spacing:-0.01em; line-height:1.05;
  }

  /* Linha "concluiu + curso" */
  .course-row {
    display:flex; align-items:center; gap:14px; flex-wrap:wrap;
  }
  .course-label {
    font-size:12px; color:#8878b8; font-weight:400; white-space:nowrap;
  }
  .course-name {
    font-family:'Playfair Display',serif;
    font-size:22px; font-weight:700;
    color:#0f0730; letter-spacing:-0.01em;
    background: linear-gradient(135deg,#5B2DFF,#9b6fff);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
    background-clip:text;
  }

  /* ── Rodapé ── */
  .footer {
    display:flex; align-items:flex-end; justify-content:space-between;
    padding-top:16px; border-top:1px solid #ede8ff;
    gap:20px;
  }

  /* Assinatura */
  .signature-block { display:flex; flex-direction:column; gap:3px; }
  .sig-name {
    font-family:'Playfair Display',serif; font-style:italic;
    font-size:21px; color:#2d1a6e; line-height:1;
    border-bottom:1.5px solid #c4b8f0; padding-bottom:5px;
    min-width:155px; margin-bottom:4px;
  }
  .sig-label { font-size:10px; font-weight:600; color:#1a0a5e; }
  .sig-title { font-size:8.5px; color:#9b8fd4; }

  /* Metadados */
  .meta-center {
    display:flex; flex-direction:column; align-items:center; gap:6px;
  }
  .meta-item { display:flex; flex-direction:column; align-items:center; gap:1px; }
  .meta-label { font-size:7.5px; letter-spacing:0.18em; text-transform:uppercase; color:#c4b8f0; font-weight:500; }
  .meta-value { font-size:10.5px; font-weight:600; color:#2d1a6e; }
  .meta-code { font-family:monospace; font-size:10px; letter-spacing:0.1em; color:#2d1a6e; font-weight:600; }
  .meta-divider { width:32px; height:1px; background:#e8e0ff; }

  /* QR */
  .qr-block { display:flex; flex-direction:column; align-items:center; gap:4px; }
  .qr-box {
    width:50px; height:50px;
    background:#f5f2ff; border:1.5px solid #e0d8ff;
    border-radius:10px; padding:4px;
    display:flex; align-items:center; justify-content:center;
  }
  .qr-label { font-size:7.5px; color:#c4b8f0; letter-spacing:0.1em; text-transform:uppercase; font-weight:500; }

  @media print {
    body { background:none; }
    .page { box-shadow:none; width:297mm; height:210mm; }
    @page { size:A4 landscape; margin:0; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="sidebar">
    <div class="sidebar-logo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z" fill="rgba(255,255,255,0.9)"/>
        <path d="M9 12l2 2 4-4" stroke="#5B2DFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="sidebar-text">Academia Verbo · Certificado de Conclusão</div>
    <div class="sidebar-dot"></div>
  </div>

  <div class="body">

    <!-- Ornamento fundo -->
    <svg class="ornament" width="340" height="340" viewBox="0 0 340 340">
      <circle cx="170" cy="170" r="160" fill="none" stroke="#5B2DFF" stroke-width="1.5"/>
      <circle cx="170" cy="170" r="130" fill="none" stroke="#5B2DFF" stroke-width="0.8"/>
      <circle cx="170" cy="170" r="100" fill="none" stroke="#5B2DFF" stroke-width="1.5"/>
      <circle cx="170" cy="170" r="70" fill="none" stroke="#5B2DFF" stroke-width="0.8"/>
      <line x1="10" y1="170" x2="330" y2="170" stroke="#5B2DFF" stroke-width="0.8"/>
      <line x1="170" y1="10" x2="170" y2="330" stroke="#5B2DFF" stroke-width="0.8"/>
      <line x1="57" y1="57" x2="283" y2="283" stroke="#5B2DFF" stroke-width="0.5"/>
      <line x1="283" y1="57" x2="57" y2="283" stroke="#5B2DFF" stroke-width="0.5"/>
    </svg>

    <!-- Topo -->
    <div class="top-row">
      <div>
        <div class="brand-name">Verbo</div>
        <div class="brand-sub">Academia Ministerial</div>
      </div>
      <div class="cert-badge">Certificado Oficial</div>
    </div>

    <!-- Centro -->
    <div class="center">
      <div class="cert-eyebrow">Certificado de Conclusão</div>
      <div class="cert-headline">Certificamos</div>

      <div class="award-row">
        <span class="award-label">que o(a) aluno(a)</span>
        <span class="student-name">${nomeAluno}</span>
      </div>

      <div class="course-row">
        <span class="course-label">concluiu com êxito o curso</span>
        <span class="course-name">${nomeCurso}</span>
      </div>
    </div>

    <!-- Rodapé -->
    <div class="footer">
      <div class="signature-block">
        <div class="sig-name">Jeferson Rocha</div>
        <div class="sig-label">Pr. Jeferson Rocha</div>
        <div class="sig-title">Diretor · Academia Verbo</div>
      </div>

      <div class="meta-center">
        <div class="meta-item">
          <div class="meta-label">Data de Conclusão</div>
          <div class="meta-value">${dataFormatada}</div>
        </div>
        <div class="meta-divider"></div>
        <div class="meta-item">
          <div class="meta-label">Código de Validação</div>
          <div class="meta-code">${codigoValidacao}</div>
        </div>
      </div>

      <div class="qr-block">
        <div class="qr-box">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=44x44&data=${encodeURIComponent(qrUrl)}&color=5B2DFF&bgcolor=f5f2ff&margin=0" width="44" height="44" alt="QR" style="border-radius:6px"/>
        </div>
        <div class="qr-label">Verificar</div>
      </div>
    </div>

  </div>
</div>

<script>
  document.fonts.ready.then(() => {
    setTimeout(() => window.print(), 700);
  });
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}