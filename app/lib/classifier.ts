/**
 * Classificador offline TF-IDF + LinearSVC — TypeScript puro.
 * Replica exatamente a lógica do backend Python (classifier.py + train.py).
 */

import { Categoria, ParseResult } from "./types";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface ModelData {
  version: string;
  settings: { sublinear_tf: boolean; ngram_range: [number, number] };
  vocab: Record<string, number>;
  idf: number[];
  classes: string[];
  coef: number[][];      // [n_classes][n_features]
  intercept: number[];   // [n_classes]
}

let model: ModelData | null = null;

async function carregarModelo(): Promise<ModelData> {
  if (model) return model;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  model = require("../assets/model.json") as ModelData;
  return model;
}

// ---------------------------------------------------------------------------
// Normalização (espelho de train.py / classifier.py)
// ---------------------------------------------------------------------------

const PADROES_REMOVER = [
  /R\$\s*[\d.,]+/gi,
  /[\d]+[.,][\d]{2}/g,
  /[\d]+\s*reais/gi,
  /\b[\d]+\b/g,
];

const STOPWORDS = new Set([
  "de", "do", "da", "dos", "das", "no", "na", "nos", "nas",
  "em", "para", "por", "com", "um", "uma", "uns", "umas",
  "o", "a", "os", "as", "e", "é", "ao", "aos",
  "pra", "pro", "pros", "pras", "meu", "minha", "meus", "minhas",
  "seu", "sua", "seus", "suas", "que", "se", "já",
  "fui", "foi", "paguei", "comprei", "pedi", "assinei",
  "novo", "nova", "hoje", "semana", "mês", "mes", "mensal",
  "conta", "boleto", "imprevisto", "gasto", "despesa",
]);

function normalizar(texto: string): string {
  let t = texto.toLowerCase().trim();
  for (const p of PADROES_REMOVER) {
    t = t.replace(p, " ");
  }
  // Mantém apenas letras (incluindo acentuadas) e espaços
  t = t.replace(/[^a-záàãâäéèêëíìîïóòõôöúùûüçñ\s]/gi, " ");
  t = t.replace(/\s+/g, " ").trim();
  const tokens = t.split(" ").filter((tok) => tok.length > 1 && !STOPWORDS.has(tok));
  return tokens.join(" ");
}

// ---------------------------------------------------------------------------
// TF-IDF vectorizer
// ---------------------------------------------------------------------------

function gerarNgramas(tokens: string[], min: number, max: number): string[] {
  const ngrams: string[] = [];
  for (let n = min; n <= max; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(" "));
    }
  }
  return ngrams;
}

function tfidfVetorizar(texto: string, m: ModelData): number[] {
  const tokens = texto.split(" ").filter(Boolean);
  const ngrams = gerarNgramas(tokens, m.settings.ngram_range[0], m.settings.ngram_range[1]);

  // Contagem de termos (TF)
  const tf: Record<number, number> = {};
  for (const ng of ngrams) {
    const idx = m.vocab[ng];
    if (idx !== undefined) {
      tf[idx] = (tf[idx] ?? 0) + 1;
    }
  }

  // TF-IDF com sublinear_tf = log(tf) + 1
  const vetor = new Array<number>(m.idf.length).fill(0);
  for (const [idxStr, count] of Object.entries(tf)) {
    const idx = Number(idxStr);
    const tfVal = m.settings.sublinear_tf ? Math.log(count) + 1 : count;
    vetor[idx] = tfVal * m.idf[idx];
  }

  // Normalização L2 (sklearn padrão)
  let norma = 0;
  for (const v of vetor) norma += v * v;
  norma = Math.sqrt(norma);
  if (norma > 0) {
    for (let i = 0; i < vetor.length; i++) vetor[i] /= norma;
  }

  return vetor;
}

// ---------------------------------------------------------------------------
// LinearSVC — decision function = coef · x + intercept
// ---------------------------------------------------------------------------

function predict(vetor: number[], m: ModelData): { categoria: string; scores: number[] } {
  const scores = m.classes.map((_, ci) => {
    let s = m.intercept[ci];
    for (let fi = 0; fi < vetor.length; fi++) {
      if (vetor[fi] !== 0) s += m.coef[ci][fi] * vetor[fi];
    }
    return s;
  });

  let bestIdx = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[bestIdx]) bestIdx = i;
  }

  return { categoria: m.classes[bestIdx], scores };
}

// ---------------------------------------------------------------------------
// Extração de valor
// ---------------------------------------------------------------------------

const PADROES_VALOR = [
  /R\$\s*([\d]+[.,][\d]{2})/i,
  /R\$\s*([\d]+)/i,
  /([\d]+[.,][\d]{2})/,
  /([\d]+)\s*reais/i,
  /\b([\d]+)\b/,
];

const UNIDADES: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3,
  quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, catorze: 14, quinze: 15,
  dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
};
const DEZENAS: Record<string, number> = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
  sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
};
const CENTENAS: Record<string, number> = {
  cem: 100, cento: 100,
  duzentos: 200, duzentas: 200,
  trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400,
  quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600,
  setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800,
  novecentos: 900, novecentas: 900,
};

function removeAcentos(s: string): string {
  return s
    .replace(/[ãâáà]/g, "a").replace(/[êéè]/g, "e")
    .replace(/[îíì]/g, "i").replace(/[õôóò]/g, "o")
    .replace(/[ûúù]/g, "u").replace(/ç/g, "c");
}

function extensoParaNumero(texto: string): number | null {
  const t = removeAcentos(texto.toLowerCase().trim());
  const tokens = t.split(/\s+e\s+|\s+/).filter(Boolean);
  let total = 0;

  for (const tok of tokens) {
    if (tok === "mil") {
      total = (total > 0 ? total : 1) * 1000;
    } else if (tok === "reais" || tok === "real" || tok === "") {
      // ignore
    } else if (CENTENAS[tok] !== undefined) {
      total += CENTENAS[tok];
    } else if (DEZENAS[tok] !== undefined) {
      total += DEZENAS[tok];
    } else if (UNIDADES[tok] !== undefined) {
      total += UNIDADES[tok];
    }
  }

  return total > 0 ? total : null;
}

// Centenas ANTES de unidades curtas para evitar match parcial (ex: "trezentos" antes de "treze")
const EXTENSO_PATTERN =
  /((?:(?:novecentas?|oitocentas?|setecentas?|seiscentas?|quinhentas?|quatrocentas?|trezentas?|duzentas?|cento|cem|mil|dezesseis|dezessete|dezoito|dezenove|quatorze|catorze|quinze|onze|doze|treze|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|dez|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove)[\s]?(?:e[\s])?)+)(?:reais|real)?/i;

function extrairValorExtenso(texto: string): number | null {
  const m = EXTENSO_PATTERN.exec(texto.toLowerCase());
  if (m) return extensoParaNumero(m[1].trim());
  return null;
}

function extrairValor(texto: string): number | null {
  for (const p of PADROES_VALOR) {
    const m = p.exec(texto);
    if (m) {
      const v = parseFloat(m[1].replace(",", "."));
      if (!isNaN(v)) return v;
    }
  }
  return extrairValorExtenso(texto);
}

// ---------------------------------------------------------------------------
// Extração de descrição
// ---------------------------------------------------------------------------

const PADROES_REMOVER_DESC = [
  /R\$\s*[\d.,]+/gi,
  /[\d]+[.,][\d]{2}/g,
  /[\d]+\s*reais/gi,
  /\b[\d]+\b/g,
  // Números por extenso (centenas antes de unidades curtas para evitar match parcial)
  /\b(novecentas?|oitocentas?|setecentas?|seiscentas?|quinhentas?|quatrocentas?|trezentas?|duzentas?)\b/gi,
  /\b(cento|cem|mil)\b/gi,
  /\b(dezesseis|dezessete|dezoito|dezenove|quatorze|catorze|quinze|onze|doze|treze)\b/gi,
  /\b(vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|dez)\b/gi,
  /\b(dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove)\b/gi,
  /\breais\b|\breal\b/gi,
];

function extrairDescricao(texto: string): string {
  let desc = texto;
  for (const p of PADROES_REMOVER_DESC) {
    desc = desc.replace(p, " ");
  }
  desc = desc.replace(/\s+/g, " ").trim();
  desc = desc.replace(/^(comprei|paguei|pedi|assinei|fui n?a?|gastei com)\s+/i, "");
  return desc ? desc.charAt(0).toUpperCase() + desc.slice(1) : texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export async function classificarTexto(texto: string): Promise<ParseResult> {
  const m = await carregarModelo();
  const textoNorm = normalizar(texto);
  const vetor = tfidfVetorizar(textoNorm, m);
  const { categoria, scores } = predict(vetor, m);

  const ranking = m.classes
    .map((c, i) => ({ categoria: c, score: scores[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => ({ categoria: r.categoria, score: Math.round(r.score * 1000) / 1000 }));

  return {
    descricao: extrairDescricao(texto),
    valor: extrairValor(texto),
    categoria: categoria as Categoria,
    sugestoes: ranking,
  };
}
