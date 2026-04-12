import { Categoria } from "../lib/types";

export interface CategoriaConfig {
  label: Categoria;
  icon: string;  // emoji
  cor: string;
  corFundo: string;
}

export const CATEGORIAS: CategoriaConfig[] = [
  { label: "Alimentação", icon: "🍽️", cor: "#FF6B6B", corFundo: "#FFF0F0" },
  { label: "Transporte",  icon: "🚗", cor: "#4ECDC4", corFundo: "#F0FFFE" },
  { label: "Saúde",       icon: "💊", cor: "#45B7D1", corFundo: "#F0FAFF" },
  { label: "Lazer",       icon: "🎬", cor: "#96CEB4", corFundo: "#F0FFF6" },
  { label: "Casa",        icon: "🏠", cor: "#FFEAA7", corFundo: "#FFFDF0" },
  { label: "Educação",    icon: "📚", cor: "#DDA0DD", corFundo: "#FDF0FF" },
  { label: "Assinaturas", icon: "📱", cor: "#F0A500", corFundo: "#FFF8E1" },
  { label: "Vestuário",   icon: "👕", cor: "#A8E6CF", corFundo: "#F0FFF8" },
  { label: "Outros",      icon: "📦", cor: "#B0BEC5", corFundo: "#F5F5F5" },
];

export function getCategoria(nome: string): CategoriaConfig {
  return (
    CATEGORIAS.find((c) => c.label === nome) ??
    CATEGORIAS[CATEGORIAS.length - 1]
  );
}
