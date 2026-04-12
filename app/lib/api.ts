import { ParseResult } from "./types";
import { classificarTexto } from "./classifier";

/**
 * Processa texto digitado ou transcrito — sem rede.
 * Usa TF-IDF + LinearSVC embutidos (model.json).
 */
export async function parseTexto(texto: string): Promise<ParseResult> {
  return classificarTexto(texto);
}
