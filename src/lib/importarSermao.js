/**
 * Importação local de sermões (sem IA ou serviços externos).
 * DOCX: leitura do XML interno do pacote ZIP.
 * PDF: extração de texto com PDF.js; PDFs digitalizados exigem OCR e não são
 * processados por este importador.
 */

const TAMANHO_MAXIMO = 20 * 1024 * 1024;
const MAX_PAGINAS_PDF = 200;
const MAX_CARACTERES = 500_000;

function validarArquivo(file) {
  if (!file) throw new Error('Selecione um arquivo para importar.');
  if (file.size > TAMANHO_MAXIMO) throw new Error('O arquivo excede o limite de 20 MB.');
  const extensao = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'docx'].includes(extensao)) {
    throw new Error('Formato não suportado. Escolha um arquivo PDF ou DOCX.');
  }
  return extensao;
}

function limitarConteudo(texto) {
  const limpo = texto.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!limpo) {
    throw new Error('Não foi possível encontrar texto neste arquivo. Se for um PDF digitalizado, ele precisa passar por OCR antes da importação.');
  }
  if (limpo.length > MAX_CARACTERES) {
    throw new Error('O documento contém texto demais para importar de uma só vez (limite de 500 mil caracteres).');
  }
  return limpo;
}

function obterTextoElemento(elemento) {
  let texto = '';
  for (const node of Array.from(elemento.childNodes || [])) {
    if (node.nodeType !== 1) continue;
    const nome = node.localName;
    if (nome === 't') texto += node.textContent || '';
    else if (nome === 'tab') texto += '\t';
    else if (nome === 'br' || nome === 'cr') texto += '\n';
    else if (nome === 'drawing' || nome === 'pict' || nome === 'object') continue;
    else texto += obterTextoElemento(node);
  }
  return texto;
}

function formatarRun(run) {
  const texto = obterTextoElemento(run);
  if (!texto) return '';
  const props = Array.from(run.children || []).find(el => el.localName === 'rPr');
  if (!props) return texto;

  const nomes = new Set(Array.from(props.children || []).map(el => el.localName));
  let formatado = texto;
  if (nomes.has('b') || nomes.has('bCs')) formatado = `**${formatado}**`;
  if (nomes.has('i') || nomes.has('iCs')) formatado = `*${formatado}*`;
  return formatado;
}

function converterParagrafo(paragrafo) {
  const pPr = Array.from(paragrafo.children || []).find(el => el.localName === 'pPr');
  const pStyle = pPr && Array.from(pPr.children || []).find(el => el.localName === 'pStyle');
  const estilo = pStyle?.getAttribute('val')?.toLowerCase() || '';
  const numPr = pPr && Array.from(pPr.children || []).some(el => el.localName === 'numPr');

  let texto = '';
  for (const node of Array.from(paragrafo.childNodes || [])) {
    if (node.nodeType !== 1) continue;
    if (node.localName === 'r') texto += formatarRun(node);
    else if (node.localName === 'hyperlink') {
      for (const run of Array.from(node.children || []).filter(el => el.localName === 'r')) {
        texto += formatarRun(run);
      }
    }
  }

  texto = texto.replace(/[\t ]+/g, ' ').trim();
  if (!texto) return '';
  if (/^(title|heading[1-6]|subtitle|título|titulo|subt[ií]tulo)/.test(estilo)) {
    return `**${texto.replace(/^\*\*(.*)\*\*$/, '$1')}**`;
  }
  if (numPr) return `• ${texto}`;
  return texto;
}

async function lerEntradaZip(buffer, nomeArquivo) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const assinaturaFim = 0x06054b50;
  let fim = -1;
  const inicioBusca = Math.max(0, bytes.length - 65_557);
  for (let i = bytes.length - 22; i >= inicioBusca; i--) {
    if (view.getUint32(i, true) === assinaturaFim) { fim = i; break; }
  }
  if (fim < 0) throw new Error('O arquivo Word está corrompido ou não é um DOCX válido.');

  const quantidade = view.getUint16(fim + 10, true);
  let cursor = view.getUint32(fim + 16, true);
  for (let i = 0; i < quantidade; i++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error('Não foi possível ler a estrutura interna do documento Word.');
    }
    const metodo = view.getUint16(cursor + 10, true);
    const tamanhoComprimido = view.getUint32(cursor + 20, true);
    const tamanhoNome = view.getUint16(cursor + 28, true);
    const tamanhoExtra = view.getUint16(cursor + 30, true);
    const tamanhoComentario = view.getUint16(cursor + 32, true);
    const offsetLocal = view.getUint32(cursor + 42, true);
    const nome = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + tamanhoNome));

    if (nome === nomeArquivo) {
      if (view.getUint32(offsetLocal, true) !== 0x04034b50) {
        throw new Error('O conteúdo interno do documento Word é inválido.');
      }
      const nomeLocal = view.getUint16(offsetLocal + 26, true);
      const extraLocal = view.getUint16(offsetLocal + 28, true);
      const inicio = offsetLocal + 30 + nomeLocal + extraLocal;
      const dados = bytes.slice(inicio, inicio + tamanhoComprimido);
      if (metodo === 0) return dados;
      if (metodo !== 8 || typeof DecompressionStream === 'undefined') {
        throw new Error('Este navegador não oferece suporte à descompactação deste documento Word.');
      }
      const stream = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    cursor += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }
  throw new Error(`O documento Word não contém ${nomeArquivo}.`);
}

async function importarDocx(file) {
  const buffer = await file.arrayBuffer();
  const xmlBytes = await lerEntradaZip(buffer, 'word/document.xml');
  const xml = new TextDecoder('utf-8').decode(xmlBytes);
  const documento = new DOMParser().parseFromString(xml, 'application/xml');
  if (documento.querySelector('parsererror')) {
    throw new Error('Não foi possível interpretar o conteúdo deste documento Word.');
  }

  const body = documento.getElementsByTagNameNS('*', 'body')[0];
  if (!body) throw new Error('O documento Word não possui conteúdo reconhecível.');

  const paragrafos = [];
  const percorrer = (elemento) => {
    for (const filho of Array.from(elemento.children || [])) {
      if (filho.localName === 'p') {
        const linha = converterParagrafo(filho);
        if (linha) paragrafos.push(linha);
      } else if (filho.localName === 'tbl') {
        percorrer(filho);
      } else if (filho.localName !== 'sectPr') {
        percorrer(filho);
      }
    }
  };
  percorrer(body);
  return limitarConteudo(paragrafos.join('\n\n'));
}

function formatarLinhaPdf(linha) {
  const texto = linha.trim();
  if (!texto) return '';
  const pareceTitulo = texto.length <= 100 && (
    /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9\s.,:;!?()/-]+$/.test(texto) ||
    /^(INTRODUÇÃO|CONCLUSÃO|APLICAÇÃO|CONTEXTO|TEXTO BASE|ORAÇÃO)\b/i.test(texto) ||
    /^(\d+(\.\d+)*[.)]?|[IVXLCDM]+[.)])\s+/.test(texto)
  );
  return pareceTitulo ? `**${texto}**` : texto;
}

async function importarPdf(file) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const dados = new Uint8Array(await file.arrayBuffer());
  const documento = await pdfjs.getDocument({ data: dados, isEvalSupported: false }).promise;
  if (documento.numPages > MAX_PAGINAS_PDF) {
    await documento.destroy();
    throw new Error(`O PDF tem mais de ${MAX_PAGINAS_PDF} páginas. Divida o documento e tente novamente.`);
  }

  const paginas = [];
  try {
    for (let numero = 1; numero <= documento.numPages; numero++) {
      const pagina = await documento.getPage(numero);
      const conteudo = await pagina.getTextContent();
      const linhas = [];
      for (const item of conteudo.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5] / 2) * 2;
        let linha = linhas.find(l => Math.abs(l.y - y) <= 2);
        if (!linha) {
          linha = { y, itens: [] };
          linhas.push(linha);
        }
        linha.itens.push({ x: item.transform[4], texto: item.str });
      }
      linhas.sort((a, b) => b.y - a.y);
      const textoPagina = linhas.map(linha => {
        linha.itens.sort((a, b) => a.x - b.x);
        return formatarLinhaPdf(linha.itens.map(item => item.texto).join(' ').replace(/\s+/g, ' '));
      }).filter(Boolean).join('\n');
      if (textoPagina) paginas.push(textoPagina);
      pagina.cleanup();
    }
  } finally {
    await documento.destroy();
  }
  return limitarConteudo(paginas.join('\n\n'));
}

export async function importarArquivoSermao(file) {
  const extensao = validarArquivo(file);
  const conteudo = extensao === 'docx'
    ? await importarDocx(file)
    : await importarPdf(file);

  return {
    titulo: file.name.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ').trim(),
    referencia: '',
    conteudo,
    nomeArquivo: file.name,
    formato: extensao.toUpperCase(),
  };
}
