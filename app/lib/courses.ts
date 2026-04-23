export interface Pilula {
  id: string;
  titulo: string;
  emoji: string;
  nivel: string;
  tempo: string;
  conteudo: string[];
  dica_app: string;
  link_externo: string;
}

export interface Trilha {
  id: string;
  titulo: string;
  emoji: string;
  cor: string;
  nivel: string;
  descricao: string;
  pilulas: Pilula[];
}

export interface CoursesData {
  versao: string;
  atualizado: string;
  trilhas: Trilha[];
}

const COURSES_URL = "https://jeffev.github.io/gasto/courses.json";
const TTL_MS = 10 * 60 * 1000;

let cache: CoursesData | null = null;
let cacheAt = 0;

export async function fetchCourses(): Promise<CoursesData> {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  const res = await fetch(COURSES_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: CoursesData = await res.json();
  cache = data;
  cacheAt = Date.now();
  return data;
}

export function getPilulaById(data: CoursesData, id: string): { pilula: Pilula; trilha: Trilha } | null {
  for (const trilha of data.trilhas) {
    const pilula = trilha.pilulas.find((p) => p.id === id);
    if (pilula) return { pilula, trilha };
  }
  return null;
}
