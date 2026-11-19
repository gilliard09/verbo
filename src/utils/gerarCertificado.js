import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { PDFDocument } from 'pdf-lib';

// ATENÇÃO: sempre que trocar o PDF do modelo, suba com um nome NOVO (v3, v4...)
// para evitar cache da CDN do Supabase.
const MODELO_URL = 'https://auuancsrpqaununsuigy.supabase.co/storage/v1/object/public/materiais/modelo-certificado-v2';

// Sistema de coordenadas da arte de referência. Todas as posições são proporcionais.
const BASE_WIDTH = 2048;
const BASE_HEIGHT = 1448;
const A4_WIDTH = 841.89;
const A4_HEIGHT = 595.28;
const SCALE_X = A4_WIDTH / BASE_WIDTH;
const SCALE_Y = A4_HEIGHT / BASE_HEIGHT;

const ROXO = '#2c126a';
const FONT_FAMILY = 'Poppins';
const RENDER_SCALE = 3;

// ── Nome do curso (topo esquerdo) ───────────────────────────────────────────
const CURSO_X = BASE_WIDTH * 0.112;
const CURSO_TOP = BASE_HEIGHT * 0.16;
const CURSO_MAX_WIDTH = BASE_WIDTH * 0.28;
const CURSO_FONT_SIZE = 68;
const CURSO_MIN_FONT_SIZE = Math.round(CURSO_FONT_SIZE * 0.70); // mínimo de 70% do tamanho original.
const CURSO_LINE_HEIGHT = 1.0;

// ── Parágrafo e data ────────────────────────────────────────────────────────
const TEXTO_X = BASE_WIDTH * 0.112;
// Até 76%, limitado à borda esquerda do QR com 0,5% de respiro.
const TEXTO_MAX_WIDTH = Math.min(BASE_WIDTH * 0.76, BASE_WIDTH * (0.80 - 0.112 - 0.005));
const TEXTO_FONT_SIZE = 49;
// Centro vertical da PRIMEIRA linha do parágrafo (59,4% da altura).
const LINHA_1_CENTER_Y = BASE_HEIGHT * 0.594;
// Distância entre os centros de duas linhas consecutivas do parágrafo (referência: 860 -> 907).
const TEXTO_LINE_PITCH = 47;
// Distância entre o centro da ÚLTIMA linha do parágrafo e o centro da data (referência: 907 -> 990).
const DATA_GAP = 83;

// ── QR Code: retângulo aproximado do modelo e margem interna de 6% ─────────
const QR_BOX = {
  x: BASE_WIDTH * 0.80,
  y: BASE_HEIGHT * 0.71,
  width: BASE_WIDTH * 0.14,
  height: BASE_HEIGHT * 0.20,
};
const QR_INNER_MARGIN = 0.06;

let fontesPromise;

async function carregarPoppins() {
  if (!fontesPromise) {
    fontesPromise = (async () => {
      const existente = document.getElementById('verbo-poppins-certificado');
      if (!existente) {
        const link = document.createElement('link');
        link.id = 'verbo-poppins-certificado';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&display=swap';
        document.head.appendChild(link);
        await new Promise((resolve, reject) => {
          link.onload = resolve;
          link.onerror = () => reject(new Error('Não foi possível carregar a fonte Poppins.'));
        });
      }
      await Promise.all([
        document.fonts.load('500 68px Poppins'),
        document.fonts.load('700 49px Poppins'),
      ]);
      await document.fonts.ready;
      if (!document.fonts.check('500 68px Poppins') || !document.fonts.check('700 49px Poppins')) {
        throw new Error('A fonte Poppins não ficou disponível para gerar o certificado.');
      }
    })();
  }
  return fontesPromise;
}

function configurarTexto(ctx, peso, tamanho) {
  ctx.font = `${peso} ${tamanho}px ${FONT_FAMILY}`;
  ctx.fillStyle = ROXO;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.5px';
}

function quebrarEmDuasLinhas(ctx, texto, larguraMaxima, tamanhoInicial) {
  const palavras = String(texto || '').trim().split(/\s+/).filter(Boolean);
  if (!palavras.length) return { linhas: [], tamanho: tamanhoInicial };

  for (let tamanho = tamanhoInicial; tamanho >= CURSO_MIN_FONT_SIZE; tamanho -= 1) {
    configurarTexto(ctx, 500, tamanho);
    const linhas = [];
    let linha = '';
    for (const palavra of palavras) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (linha && ctx.measureText(tentativa).width > larguraMaxima) {
        linhas.push(linha);
        linha = palavra;
      } else {
        linha = tentativa;
      }
    }
    if (linha) linhas.push(linha);
    if (linhas.length <= 2 && linhas.every(item => ctx.measureText(item).width <= larguraMaxima)) {
      return { linhas, tamanho };
    }
  }

  const tamanho = CURSO_MIN_FONT_SIZE;
  configurarTexto(ctx, 500, tamanho);
  const linhas = [];
  let linha = '';
  for (const palavra of palavras) {
    const tentativa = linha ? `${linha} ${palavra}` : palavra;
    if (linha && ctx.measureText(tentativa).width > larguraMaxima) {
      linhas.push(linha);
      linha = palavra;
    } else {
      linha = tentativa;
    }
  }
  if (linha) linhas.push(linha);
  if (linhas.length > 2) {
    throw new Error('O nome do curso é longo demais para caber em duas linhas com a fonte mínima de 70%. Ajuste o nome do curso para emitir o certificado.');
  }
  return { linhas, tamanho };
}

async function criarImagemCurso(pdf, nomeCurso) {
  const canvasMedida = document.createElement('canvas');
  const medir = canvasMedida.getContext('2d');
  if (!medir) throw new Error('Não foi possível preparar o nome do curso.');

  const { linhas, tamanho } = quebrarEmDuasLinhas(
    medir,
    String(nomeCurso || '').trim().toLocaleLowerCase('pt-BR'),
    CURSO_MAX_WIDTH,
    CURSO_FONT_SIZE,
  );

  const largura = CURSO_MAX_WIDTH;
  const alturaLinha = tamanho * CURSO_LINE_HEIGHT;
  const altura = Math.max(alturaLinha, linhas.length * alturaLinha);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(largura * RENDER_SCALE);
  canvas.height = Math.ceil(altura * RENDER_SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível desenhar o nome do curso.');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  configurarTexto(ctx, 500, tamanho);
  linhas.forEach((linha, index) => {
    ctx.fillText(linha, 0, tamanho / 2 + index * alturaLinha);
  });

  return {
    imagem: await pdf.embedPng(canvas.toDataURL('image/png')),
    largura,
    altura,
  };
}

// Desenha um trecho de texto "rico" (mistura de pesos) com quebra automática.
// O centro da PRIMEIRA linha fica a `pad` px do topo da imagem, e as linhas seguintes
// descem sempre `pitch` px. Assim o chamador posiciona pelo centro da primeira linha
// e sabe exatamente onde termina o bloco (totalLinhas, pitch).
async function criarLinhaRica(pdf, trechos, {
  tamanho = TEXTO_FONT_SIZE,
  larguraMaxima = TEXTO_MAX_WIDTH,
  espacamento = TEXTO_LINE_PITCH,
} = {}) {
  const canvasMedida = document.createElement('canvas');
  const medir = canvasMedida.getContext('2d');
  if (!medir) throw new Error('Não foi possível preparar os textos do certificado.');

  const palavras = [];
  trechos.forEach(trecho => {
    const partes = String(trecho.texto || '').trim().split(/\s+/).filter(Boolean);
    partes.forEach(palavra => {
      palavras.push({
        texto: palavra,
        peso: trecho.peso,
        espacoAntes: palavras.length > 0,
      });
    });
  });

  let tamanhoFinal = tamanho;
  let linhas = [];

  const montarLinhas = () => {
    const resultado = [];
    let linha = [];
    let larguraLinha = 0;
    palavras.forEach(item => {
      configurarTexto(medir, item.peso, tamanhoFinal);
      const larguraPalavra = medir.measureText(item.texto).width;
      const larguraEspaco = item.espacoAntes
        ? (configurarTexto(medir, 500, tamanhoFinal), medir.measureText(' ').width)
        : 0;
      const larguraAdicional = larguraPalavra + larguraEspaco;
      if (linha.length && larguraLinha + larguraAdicional > larguraMaxima) {
        resultado.push(linha);
        linha = [];
        larguraLinha = 0;
      }
      const espaco = linha.length ? larguraEspaco : 0;
      linha.push({
        ...item,
        largura: larguraPalavra,
        espacoAntes: Boolean(espaco),
        larguraEspaco: espaco,
      });
      larguraLinha += larguraPalavra + espaco;
    });
    if (linha.length) resultado.push(linha);
    return resultado;
  };

  linhas = montarLinhas();
  while (linhas.some(linha => {
    const larguraLinha = linha.reduce(
      (soma, item) => soma + item.largura + item.larguraEspaco,
      0,
    );
    return larguraLinha > larguraMaxima;
  }) && tamanhoFinal > 24) {
    tamanhoFinal -= 1;
    linhas = montarLinhas();
  }

  const totalLinhas = Math.max(linhas.length, 1);
  // Se a fonte precisou encolher, o espaçamento encolhe junto (proporcional).
  const pitch = espacamento * (tamanhoFinal / tamanho);
  // Folga acima/abaixo para não cortar acentos e descendentes (g, p, ç...).
  const pad = Math.ceil(tamanhoFinal * 0.6);
  const altura = (totalLinhas - 1) * pitch + pad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(larguraMaxima * RENDER_SCALE);
  canvas.height = Math.ceil(altura * RENDER_SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível desenhar os textos do certificado.');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(RENDER_SCALE, RENDER_SCALE);

  linhas.forEach((linha, linhaIndex) => {
    let x = 0;
    linha.forEach(item => {
      configurarTexto(ctx, item.peso, tamanhoFinal);
      if (x > 0) x += item.larguraEspaco;
      ctx.fillText(item.texto, x, pad + linhaIndex * pitch);
      x += item.largura;
    });
  });

  return {
    imagem: await pdf.embedPng(canvas.toDataURL('image/png')),
    largura: larguraMaxima,
    altura,
    pad,
    pitch,
    totalLinhas,
  };
}

function formatarDataExtenso(valor) {
  const entrada = String(valor || '').trim();
  const iso = entrada.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const data = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return `${data.getDate()} de ${data.toLocaleDateString('pt-BR', {
      month: 'long',
    })} de ${data.getFullYear()}.`;
  }
  const semPonto = entrada.replace(/[.\s]+$/, '');
  return semPonto ? `${semPonto}.` : '';
}

async function gerarImagemQr(pdf, valor) {
  const svgOriginal = renderToStaticMarkup(React.createElement(QRCodeSVG, {
    value: valor,
    size: 960,
    level: 'H',
    marginSize: 0,
    bgColor: 'transparent',
    fgColor: ROXO,
  }));
  const svg = svgOriginal.includes('xmlns=')
    ? svgOriginal
    : svgOriginal.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  img.decoding = 'sync';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('O navegador não conseguiu converter o QR Code em imagem.'));
    img.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível preparar a imagem do QR Code.');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return pdf.embedPng(canvas.toDataURL('image/png'));
}

function desenharImagem(page, item, x, topo) {
  page.drawImage(item.imagem, {
    x: x * SCALE_X,
    y: A4_HEIGHT - ((topo + item.altura) * SCALE_Y),
    width: item.largura * SCALE_X,
    height: item.altura * SCALE_Y,
  });
}

export async function gerarCertificado({
  nomeAluno,
  nomeCurso,
  dataFormatada,
  codigoValidacao,
  janelaImpressao = null,
}) {
  await carregarPoppins();

  // Única origem do fundo: arquivo oficial em branco (sem cache).
  const resposta = await fetch(MODELO_URL, { cache: 'no-store' });
  if (!resposta.ok) {
    throw new Error('Não foi possível carregar o modelo oficial do certificado.');
  }
  const modelo = await resposta.arrayBuffer();
  const pdf = await PDFDocument.create();
  const [fundo] = await pdf.embedPdf(modelo);
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  page.drawPage(fundo, {
    x: 0,
    y: 0,
    width: A4_WIDTH,
    height: A4_HEIGHT,
  });

  const aluno = String(nomeAluno || '').trim().toLocaleUpperCase('pt-BR');
  const cursoMaiusculo = String(nomeCurso || '').trim().toLocaleUpperCase('pt-BR');
  const cursoTopo = String(nomeCurso || '').trim().toLocaleLowerCase('pt-BR');
  const dataExtenso = formatarDataExtenso(dataFormatada);
  const urlValidacao = `https://appverbo.com.br/verificar?codigo=${encodeURIComponent(codigoValidacao)}`;

  // O nome do curso é desenhado uma única vez.
  const tituloCurso = await criarImagemCurso(pdf, cursoTopo);

  // Parágrafo: bloco 1 (A ACADEMIA VERBO certifica que ALUNO).
  const linha1 = await criarLinhaRica(pdf, [
    { texto: 'A ', peso: 500 },
    { texto: 'ACADEMIA VERBO', peso: 700 },
    { texto: ' certifica que ', peso: 500 },
    { texto: aluno, peso: 700 },
  ]);

  // Parágrafo: bloco 2 (concluiu o curso de CURSO com sucesso.). Pode quebrar em mais de uma linha.
  const linha2 = await criarLinhaRica(pdf, [
    { texto: 'concluiu o curso de ', peso: 500 },
    { texto: cursoMaiusculo, peso: 700 },
    { texto: ' com sucesso.', peso: 500 },
  ]);

  const linhaData = await criarLinhaRica(pdf, [
    { texto: 'ACADEMIA VERBO, ', peso: 500 },
    { texto: dataExtenso, peso: 700 },
  ]);

  const qr = await gerarImagemQr(pdf, urlValidacao);

  // Curso: x = 11,2%; topo = 16%; largura máxima = 28%.
  desenharImagem(page, tituloCurso, CURSO_X, CURSO_TOP);

  // Empilhamento sequencial: cada bloco começa uma linha abaixo do fim do anterior,
  // então nada se sobrepõe, mesmo que o nome do aluno ou do curso quebre em mais linhas.
  const centro1 = LINHA_1_CENTER_Y;
  const fim1 = centro1 + (linha1.totalLinhas - 1) * linha1.pitch;

  const centro2 = fim1 + linha1.pitch;
  const fim2 = centro2 + (linha2.totalLinhas - 1) * linha2.pitch;

  // A data fica sempre DATA_GAP abaixo da última linha do parágrafo.
  const centroData = fim2 + DATA_GAP;

  desenharImagem(page, linha1, TEXTO_X, centro1 - linha1.pad);
  desenharImagem(page, linha2, TEXTO_X, centro2 - linha2.pad);
  desenharImagem(page, linhaData, TEXTO_X, centroData - linhaData.pad);

  // QR transparente, centralizado no retângulo do modelo com margem interna de 6%.
  const margemX = QR_BOX.width * QR_INNER_MARGIN;
  const margemY = QR_BOX.height * QR_INNER_MARGIN;
  const qrSize = Math.min(
    QR_BOX.width - margemX * 2,
    QR_BOX.height - margemY * 2,
  );
  const qrX = QR_BOX.x + (QR_BOX.width - qrSize) / 2;
  const qrTop = QR_BOX.y + (QR_BOX.height - qrSize) / 2;
  page.drawImage(qr, {
    x: qrX * SCALE_X,
    y: A4_HEIGHT - ((qrTop + qrSize) * SCALE_Y),
    width: qrSize * SCALE_X,
    height: qrSize * SCALE_Y,
  });

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const pdfUrl = URL.createObjectURL(blob);

  if (janelaImpressao && !janelaImpressao.closed) {
    janelaImpressao.location.replace(pdfUrl);
    janelaImpressao.addEventListener(
      'beforeunload',
      () => URL.revokeObjectURL(pdfUrl),
      { once: true },
    );
    return;
  }

  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = `Certificado - ${aluno} - ${cursoMaiusculo}.pdf`
    .replace(/[/\\?%*:|"<>]/g, '-');
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
}
