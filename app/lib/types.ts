export type Categoria =
  | "Alimentação"
  | "Transporte"
  | "Saúde"
  | "Lazer"
  | "Casa"
  | "Educação"
  | "Assinaturas"
  | "Vestuário"
  | "Outros";

export interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  categoria: Categoria;
  data: string; // ISO date string YYYY-MM-DD
  input_original: string;
  recorrente: number; // 0 ou 1
  criado_em: string;
}

export interface Orcamento {
  id: number;
  categoria: Categoria;
  limite: number;
}

export type CategoriaEntrada =
  | "Salário"
  | "Freelance"
  | "Investimentos"
  | "Aluguel recebido"
  | "Presente"
  | "Outros";

export interface Entrada {
  id: number;
  descricao: string;
  valor: number;
  categoria: CategoriaEntrada;
  data: string;
  recorrente: number;
  criado_em: string;
}

export interface ParseResult {
  descricao: string;
  valor: number | null;
  categoria: Categoria;
  sugestoes: Array<{ categoria: string; score: number }>;
}
