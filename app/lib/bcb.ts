export interface Indicador {
  label: string;
  valor: string;
  detalhe: string;
  emoji: string;
  serie: number;
}

const SERIES = [
  { serie: 1,     label: "Dólar",  emoji: "🇺🇸", format: "moeda" },
  { serie: 21619, label: "Euro",   emoji: "🇪🇺", format: "moeda" },
  { serie: 4389,  label: "CDI",    emoji: "🏦",  format: "pct_aa" },
  { serie: 4390,  label: "Selic",  emoji: "📊",  format: "pct_mes" },
  { serie: 433,   label: "IPCA",   emoji: "📈",  format: "pct_mes" },
] as const;

async function fetchSerie(serie: number): Promise<{ data: string; valor: string }> {
  const res = await fetch(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/1?formato=json`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`BCB série ${serie}`);
  const json = await res.json();
  return json[0];
}

function formatValor(valor: string, format: string): { principal: string; detalhe: string } {
  const num = parseFloat(valor);
  if (isNaN(num)) return { principal: "—", detalhe: "" };
  switch (format) {
    case "moeda":
      return {
        principal: `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        detalhe: "PTAX",
      };
    case "pct_aa":
      return {
        principal: `${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
        detalhe: "ao ano",
      };
    case "pct_mes":
      return {
        principal: `${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
        detalhe: "no mês",
      };
    default:
      return { principal: num.toFixed(2), detalhe: "" };
  }
}

export async function fetchIndicadores(): Promise<Indicador[]> {
  const resultados = await Promise.allSettled(SERIES.map((s) => fetchSerie(s.serie)));
  return resultados.map((r, i) => {
    const s = SERIES[i];
    if (r.status === "rejected") {
      return { label: s.label, valor: "—", detalhe: "", emoji: s.emoji, serie: s.serie };
    }
    const { data, valor } = r.value;
    const { principal, detalhe } = formatValor(valor, s.format);
    return { label: s.label, valor: principal, detalhe, emoji: s.emoji, serie: s.serie };
  });
}
