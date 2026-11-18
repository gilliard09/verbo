import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { PDFDocument } from 'pdf-lib';

const MODELO_URL = 'https://auuancsrpqaununsuigy.supabase.co/storage/v1/object/public/materiais/modelo%20certificado.pdf';
const MODELO_WIDTH = 2339;
const MODELO_HEIGHT = 1754;
const A4_WIDTH = 841.89;
const A4_HEIGHT = 595.28;
const SCALE_X = A4_WIDTH / MODELO_WIDTH;
const SCALE_Y = A4_HEIGHT / MODELO_HEIGHT;
const ROXO = '#2c126a';
let fontesPromise;

async function carregarPoppins() {
  if (!fontesPromise) {
    fontesPromise = new Promise((resolve, reject) => {
      const existente = document.getElementById('verbo-poppins-certificado');
      if (existente) {
        Promise.all([
          document.fonts.load('500 68px Poppins'),
          document.fonts.load('700 49px Poppins'),
        ]).then(resolve).catch(reject);
        return;
      }

      const link = document.createElement('link');
      link.id = 'verbo-poppins-certificado';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&display=swap';
      link.onload = () => Promise.all([
        document.fonts.load('500 68px Poppins'),
        document.fonts.load('700 49px Poppins'),
      ]).then(resolve).catch(reject);
      link.onerror = () => reject(new Error('Não foi possível carregar a fonte Poppins.'));
      document.head.appendChild(link);
    });
  }
  return fontesPromise;
}

function quebrarTexto(ctx, texto, largura) {
  const palavras = String(texto).trim().split(/\s+/);
  const linhas = [];
  let atual = '';
  palavras.forEach((palavra) => {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (atual && ctx.measureText(teste).width > largura) {
      linhas.push(atual);
      atual = palavra;
    } else atual = teste;
  });
  if (atual) linhas.push(atual);
  return linhas;
}

async function textoImagem(pdf, texto, { tamanho, peso = 500, largura, alturaLinha = 1.25, alinhamento = 'center' }) {
  const fator = 3;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível preparar o certificado.');
  ctx.font = `${peso} ${tamanho * fator}px Poppins`;
  const linhas = quebrarTexto(ctx, texto, largura * fator);
  const altura = Math.ceil(tamanho * alturaLinha * linhas.length);
  canvas.width = Math.ceil(largura * fator);
  canvas.height = Math.ceil(altura * fator);
  const c = canvas.getContext('2d');
  c.scale(fator, fator);
  c.font = `${peso} ${tamanho}px Poppins`;
  c.fillStyle = ROXO;
  c.textAlign = alinhamento;
  c.textBaseline = 'middle';
  linhas.forEach((linha, i) => c.fillText(linha, alinhamento === 'left' ? 0 : alinhamento === 'right' ? largura : largura / 2, tamanho * alturaLinha * i + tamanho * 0.62));
  return { imagem: await pdf.embedPng(canvas.toDataURL('image/png')), largura, altura };
}

async function textoRicoImagem(pdf, linhas, { tamanho, largura, alturaLinha = 1.28, alinhamento = 'center' }) {
  const fator = 3;
  const canvas = document.createElement('canvas');
  const medir = canvas.getContext('2d');
  if (!medir) throw new Error('Não foi possível preparar o certificado.');

  const ajustadas = linhas.map((trechos) => {
    let fonte = tamanho;
    const medirLinha = () => trechos.reduce((soma, trecho) => {
      medir.font = `${trecho.peso || 500} ${fonte * fator}px Poppins`;
      return soma + medir.measureText(trecho.texto).width;
    }, 0);
    while (medirLinha() > largura * fator && fonte > 32) fonte -= 1;
    return { trechos, fonte };
  });

  const altura = Math.ceil(tamanho * alturaLinha * linhas.length);
  canvas.width = Math.ceil(largura * fator);
  canvas.height = Math.ceil(altura * fator);
  const ctx = canvas.getContext('2d');
  ctx.scale(fator, fator);
  ctx.fillStyle = ROXO;
  ctx.textBaseline = 'middle';

  ajustadas.forEach(({ trechos, fonte }, i) => {
    const larguraLinha = trechos.reduce((soma, trecho) => {
      ctx.font = `${trecho.peso || 500} ${fonte}px Poppins`;
      return soma + ctx.measureText(trecho.texto).width;
    }, 0);
    let x = alinhamento === 'right' ? largura - larguraLinha : alinhamento === 'left' ? 0 : (largura - larguraLinha) / 2;
    const y = tamanho * alturaLinha * i + tamanho * 0.62;
    trechos.forEach((trecho) => {
      ctx.font = `${trecho.peso || 500} ${fonte}px Poppins`;
      ctx.fillText(trecho.texto, x, y);
      x += ctx.measureText(trecho.texto).width;
    });
  });

  return { imagem: await pdf.embedPng(canvas.toDataURL('image/png')), largura, altura };
}

async function gerarImagemQr(pdf, valor) {
  const svgOriginal = renderToStaticMarkup(React.createElement(QRCodeSVG, {
    value: valor,
    size: 480,
    level: 'H',
    marginSize: 0,
    bgColor: 'transparent',
    fgColor: ROXO,
  }));

  // Safari pode falhar ao decodificar SVG carregado por Blob URL.
  // Data URI com namespace explícito é mais compatível com Image() nesses navegadores.
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
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const png = canvas.toDataURL('image/png');
  if (!png.startsWith('data:image/png;base64,')) {
    throw new Error('Não foi possível converter o QR Code para PNG.');
  }
  return pdf.embedPng(png);
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
  nomeAluno, nomeCurso, dataFormatada, codigoValidacao, janelaImpressao = null,
}) {
  await carregarPoppins();

  const resposta = await fetch(MODELO_URL);
  if (!resposta.ok) throw new Error('Não foi possível carregar o modelo oficial do certificado.');
  const modelo = await resposta.arrayBuffer();

  const pdf = await PDFDocument.create();
  const [fundo] = await pdf.embedPdf(modelo);
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  // Redimensiona o PDF original proporcionalmente para uma única página A4 horizontal.
  page.drawPage(fundo, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT });

  const aluno = String(nomeAluno || '').trim();
  const curso = String(nomeCurso || '').trim();
  const urlValidacao = `https://appverbo.com.br/verificar?codigo=${encodeURIComponent(codigoValidacao)}`;

  const certificacao = await textoRicoImagem(pdf, [
    [
      { texto: 'A ', peso: 500 },
      { texto: 'ACADEMIA VERBO', peso: 700 },
      { texto: ' certifica que ', peso: 500 },
      { texto: aluno, peso: 700 },
    ],
    [
      { texto: 'concluiu o curso de ', peso: 500 },
      { texto: curso, peso: 700 },
      { texto: ' com sucesso.', peso: 500 },
    ],
  ], { tamanho: 49, largura: 1050, alturaLinha: 1.28, alinhamento: 'right' });

  const data = await textoRicoImagem(pdf, [[
    { texto: 'ACADEMIA VERBO, ', peso: 500 },
    { texto: dataFormatada, peso: 700 },
  ]], { tamanho: 49, largura: 1050, alturaLinha: 1.2, alinhamento: 'right' });

  const qr = await gerarImagemQr(pdf, urlValidacao);

  // Coordenadas no arquivo-base: texto organizado no eixo esquerdo/direito
  // e QR dimensionado para caber dentro do retângulo de validação.
  const eixoDireitoTexto = 1235;
  // O título do curso foi removido. A certificação e a data ficam abaixo
  // da palavra CERTIFICADO, mantendo a borda direita no mesmo eixo visual.
  desenharImagem(page, certificacao, eixoDireitoTexto - certificacao.largura, 790);
  desenharImagem(page, data, eixoDireitoTexto - data.largura, 930);
  page.drawImage(qr, {
    x: 1878 * SCALE_X,
    y: A4_HEIGHT - ((1250 + 300) * SCALE_Y),
    width: 300 * SCALE_X,
    height: 300 * SCALE_Y,
  });

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const pdfUrl = URL.createObjectURL(blob);

  if (janelaImpressao && !janelaImpressao.closed) {
    janelaImpressao.location.replace(pdfUrl);
    janelaImpressao.addEventListener('beforeunload', () => URL.revokeObjectURL(pdfUrl), { once: true });
    return;
  }

  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = `Certificado - ${aluno} - ${curso}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
}
