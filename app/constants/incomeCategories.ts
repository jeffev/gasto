import { CategoriaEntrada } from "../lib/types";

export interface CategoriaEntradaConfig {
  label: CategoriaEntrada;
  icon: string;
  cor: string;
  corFundo: string;
}

export const CATEGORIAS_ENTRADA: CategoriaEntradaConfig[] = [
  { label: "Salário",          icon: "💼", cor: "#2ECC71", corFundo: "#EAFAF1" },
  { label: "Freelance",        icon: "💻", cor: "#27AE60", corFundo: "#E8F8F5" },
  { label: "Investimentos",    icon: "📈", cor: "#16A085", corFundo: "#E8F6F3" },
  { label: "Aluguel recebido", icon: "🏠", cor: "#1ABC9C", corFundo: "#E8FAF6" },
  { label: "Presente",         icon: "🎁", cor: "#48C9B0", corFundo: "#EAFAF6" },
  { label: "Outros",           icon: "➕", cor: "#76D7C4", corFundo: "#F0FAF8" },
];

export function getCategoriaEntrada(nome: string): CategoriaEntradaConfig {
  return (
    CATEGORIAS_ENTRADA.find((c) => c.label === nome) ??
    CATEGORIAS_ENTRADA[CATEGORIAS_ENTRADA.length - 1]
  );
}
