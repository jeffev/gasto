"""
Teste interativo do modelo de categorização.
Carrega o modelo treinado e classifica frases em tempo real.
"""

import pickle
import re
import sys

# ---------------------------------------------------------------------------
# Mesma normalização do train.py
# ---------------------------------------------------------------------------

PADROES_VALOR = [
    r"R\$\s*[\d.,]+",
    r"[\d]+[.,][\d]{2}",
    r"[\d]+\s*reais",
    r"\b[\d]+\b",
]

STOPWORDS_PT = {
    "de", "do", "da", "dos", "das", "no", "na", "nos", "nas",
    "em", "para", "por", "com", "um", "uma", "uns", "umas",
    "o", "a", "os", "as", "e", "é", "ao", "aos",
    "pra", "pro", "pros", "pras", "meu", "minha", "meus", "minhas",
    "seu", "sua", "seus", "suas", "que", "se", "já",
    "fui", "foi", "paguei", "comprei", "pedi", "assinei",
    "novo", "nova", "hoje", "semana", "mês", "mes", "mensal",
    "conta", "boleto", "imprevisto", "gasto", "despesa",
}


def normalizar(texto):
    texto = texto.lower().strip()
    for padrao in PADROES_VALOR:
        texto = re.sub(padrao, " ", texto, flags=re.IGNORECASE)
    texto = re.sub(r"[^a-záàãâäéèêëíìîïóòõôöúùûüçñ\s]", " ", texto)
    texto = " ".join(texto.split())
    tokens = [t for t in texto.split() if t not in STOPWORDS_PT and len(t) > 1]
    return " ".join(tokens)


# ---------------------------------------------------------------------------
# Extrator de valor monetário
# ---------------------------------------------------------------------------

def extrair_valor(texto):
    """Extrai o valor em float do texto."""
    padroes = [
        r"R\$\s*([\d]+[.,][\d]{2})",   # R$ 20,00
        r"R\$\s*([\d]+)",               # R$ 20
        r"([\d]+[.,][\d]{2})",          # 20,00
        r"([\d]+)\s*reais",             # 20 reais
        r"\b([\d]+)\b",                 # 20
    ]
    for padrao in padroes:
        m = re.search(padrao, texto, re.IGNORECASE)
        if m:
            val = m.group(1).replace(",", ".")
            try:
                return float(val)
            except ValueError:
                continue
    return None


def extrair_descricao(texto):
    """Remove o valor do texto para obter só a descrição."""
    desc = texto
    for padrao in PADROES_VALOR:
        desc = re.sub(padrao, " ", desc, flags=re.IGNORECASE)
    desc = re.sub(r"\s+", " ", desc).strip()
    # Capitaliza primeira letra
    return desc.capitalize() if desc else texto.capitalize()


# ---------------------------------------------------------------------------
# Classificador
# ---------------------------------------------------------------------------

class ClassificadorDespesas:
    def __init__(self, model_path="data/modelo.pkl"):
        with open(model_path, "rb") as f:
            dados = pickle.load(f)
        self.pipeline = dados["pipeline"]
        self.classes = dados["classes"]
        print(f"Modelo carregado — {len(self.classes)} categorias: {self.classes}")

    def classificar(self, texto):
        texto_norm = normalizar(texto)
        categoria = self.pipeline.predict([texto_norm])[0]

        # Probabilidade via decision_function (distância das margens)
        scores = self.pipeline.decision_function([texto_norm])[0]
        # Converte scores para ranking de confiança
        ranking = sorted(zip(self.classes, scores), key=lambda x: x[1], reverse=True)

        valor = extrair_valor(texto)
        descricao = extrair_descricao(texto)

        return {
            "descricao": descricao,
            "valor": valor,
            "categoria": categoria,
            "confianca_top3": [(cat, round(score, 3)) for cat, score in ranking[:3]],
        }


# ---------------------------------------------------------------------------
# Exemplos de teste predefinidos
# ---------------------------------------------------------------------------

TESTES = [
    # Alimentação
    "lanche 20 reais",
    "almoço no restaurante R$ 45,00",
    "mercado 150",
    "iFood pizza 38,90",
    "café da manhã 12",
    "cerveja no bar 25",

    # Transporte
    "uber 18 reais",
    "gasolina 200 reais",
    "passagem de ônibus 4,40",
    "estacionamento 15",
    "99 pra casa 22",

    # Saúde
    "farmácia 35 reais",
    "consulta médica 150",
    "academia mensal 89,90",
    "remédio pressão 45",
    "exame de sangue 80",

    # Lazer
    "netflix 39,90",
    "cinema 28 reais",
    "show de rock 120",
    "spotify mensal 21,90",

    # Casa
    "aluguel 1200",
    "conta de luz 180",
    "internet 99,90",
    "gás 110",

    # Educação
    "Udemy curso python 29,90",
    "mensalidade faculdade 1500",
    "livro javascript 65",

    # Assinaturas
    "Disney+ 27,90",
    "plano Tim 49,90",
    "iCloud 4,90",

    # Vestuário
    "tênis Nike 350",
    "camisa nova 89",
    "comprei calça jeans 120",

    # Outros
    "presente de aniversário 80",
    "veterinário 200",
    "anuidade cartão 250",

    # Casos difíceis (sem valor, abreviações)
    "uber",
    "netflix",
    "mercado",
    "academia",
    "dentista 300",
    "churrasco 85",
    "passagem avião latam 450",
]


def rodar_testes(classificador):
    print("\n" + "=" * 70)
    print("TESTES PREDEFINIDOS")
    print("=" * 70)
    print(f"{'ENTRADA':<40} {'CATEGORIA':<18} {'VALOR':<10}")
    print("-" * 70)

    acertos_esperados = {
        "Alimentação": ["lanche", "almoço", "mercado", "ifood", "café", "cerveja", "churrasco"],
        "Transporte": ["uber", "gasolina", "passagem", "estacionamento", "99"],
        "Saúde": ["farmácia", "consulta", "academia", "remédio", "exame"],
        "Lazer": ["netflix", "cinema", "show", "spotify"],
        "Casa": ["aluguel", "luz", "internet", "gás"],
        "Educação": ["udemy", "faculdade", "livro"],
        "Assinaturas": ["disney", "tim", "icloud"],
        "Vestuário": ["tênis", "camisa", "calça"],
        "Outros": ["presente", "veterinário", "anuidade"],
    }

    for texto in TESTES:
        resultado = classificador.classificar(texto)
        valor_str = f"R$ {resultado['valor']:.2f}" if resultado["valor"] else "-"
        print(f"{texto:<40} {resultado['categoria']:<18} {valor_str:<10}")

    print("-" * 70)


def modo_interativo(classificador):
    print("\n" + "=" * 60)
    print("MODO INTERATIVO — digite uma despesa (ou 'sair' para encerrar)")
    print("=" * 60)

    while True:
        entrada = input("\nDespesa: ").strip()
        if entrada.lower() in ("sair", "exit", "quit", "q"):
            break
        if not entrada:
            continue

        resultado = classificador.classificar(entrada)
        print(f"\n  Descrição : {resultado['descricao']}")
        print(f"  Valor     : R$ {resultado['valor']:.2f}" if resultado["valor"] else "  Valor     : não informado")
        print(f"  Categoria : {resultado['categoria']}")
        print(f"  Top 3     :")
        for cat, score in resultado["confianca_top3"]:
            barra = "█" * max(1, int((score + 3) * 5))
            print(f"              {cat:<20} {barra}")


if __name__ == "__main__":
    model_path = "data/modelo.pkl"

    try:
        clf = ClassificadorDespesas(model_path)
    except FileNotFoundError:
        print(f"Modelo não encontrado em '{model_path}'.")
        print("Execute primeiro: python train.py")
        sys.exit(1)

    rodar_testes(clf)

    if "--interativo" in sys.argv or "-i" in sys.argv:
        modo_interativo(clf)
    else:
        print("\nDica: rode com -i para modo interativo")
        print("  python test.py -i")
