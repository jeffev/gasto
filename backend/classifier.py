"""
Wrapper do modelo de categorização + extração de valor/descrição.
"""

import re
import pickle
import os
from pathlib import Path

MODEL_PATH = Path(__file__).parent.parent / "model" / "data" / "modelo.pkl"

PADROES_VALOR = [
    r"R\$\s*([\d]+[.,][\d]{2})",
    r"R\$\s*([\d]+)",
    r"([\d]+[.,][\d]{2})",
    r"([\d]+)\s*reais",
    r"\b([\d]+)\b",
]

PADROES_REMOVER = [
    r"R\$\s*[\d.,]+",
    r"[\d]+[.,][\d]{2}",
    r"[\d]+\s*reais",
    r"\b[\d]+\b",
]

# Mapeamento de números por extenso em português
_UNIDADES = {
    "um": 1, "uma": 1, "dois": 2, "duas": 2, "três": 3, "tres": 3,
    "quatro": 4, "cinco": 5, "seis": 6, "sete": 7, "oito": 8, "nove": 9,
    "dez": 10, "onze": 11, "doze": 12, "treze": 13,
    "quatorze": 14, "catorze": 14, "quinze": 15,
    "dezesseis": 16, "dezessete": 17, "dezoito": 18, "dezenove": 19,
}
_DEZENAS = {
    "vinte": 20, "trinta": 30, "quarenta": 40, "cinquenta": 50,
    "sessenta": 60, "setenta": 70, "oitenta": 80, "noventa": 90,
}
_CENTENAS = {
    "cem": 100, "cento": 100,
    "duzentos": 200, "duzentas": 200,
    "trezentos": 300, "trezentas": 300,
    "quatrocentos": 400, "quatrocentas": 400,
    "quinhentos": 500, "quinhentas": 500,
    "seiscentos": 600, "seiscentas": 600,
    "setecentos": 700, "setecentas": 700,
    "oitocentos": 800, "oitocentas": 800,
    "novecentos": 900, "novecentas": 900,
}


def _extenso_para_numero(texto: str) -> float | None:
    """Converte números escritos por extenso em pt-BR para float."""
    t = texto.lower().strip()
    # Remove acento simples para normalizar
    t = t.replace("ã", "a").replace("é", "e").replace("ê", "e")
    t = t.replace("á", "a").replace("â", "a").replace("ó", "o")
    t = t.replace("ú", "u").replace("ç", "c").replace("í", "i")

    tokens = re.split(r"\s+e\s+|\s+", t)
    total = 0
    milhares = False

    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok == "mil":
            total = (total if total > 0 else 1) * 1000
            milhares = True
        elif tok in ("reais", "real", ""):
            pass
        elif tok in _CENTENAS:
            total += _CENTENAS[tok]
        elif tok in _DEZENAS:
            total += _DEZENAS[tok]
        elif tok in _UNIDADES:
            total += _UNIDADES[tok]
        i += 1

    return float(total) if total > 0 else None


def _extrair_valor_extenso(texto: str) -> float | None:
    """Tenta extrair valor escrito por extenso antes de 'reais' ou no final."""
    # Padrão: "vinte reais", "mil e duzentos reais", "cinquenta e cinco reais"
    # ATENÇÃO: centenas e palavras longas devem vir ANTES das curtas que são prefixo delas
    # Ex: "trezentos" antes de "treze", "setecentos" antes de "sete"
    padrao = (
        r"((?:(?:"
        r"novecentas?|novecentos?|oitocentas?|oitocentos?|"
        r"setecentas?|setecentos?|seiscentas?|seiscentos?|"
        r"quinhentas?|quinhentos?|quatrocentas?|quatrocentos?|"
        r"trezentas?|trezentos?|duzentas?|duzentos?|"
        r"cento|cem|mil|"
        r"dezesseis|dezessete|dezoito|dezenove|"
        r"quatorze|catorze|quinze|"
        r"onze|doze|treze|"
        r"vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|"
        r"dez|"
        r"um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove"
        r")[\s]?(?:e[\s])?)+)"
        r"(?:reais|real)?"
    )
    m = re.search(padrao, texto.lower())
    if m:
        return _extenso_para_numero(m.group(1).strip())
    return None

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


def normalizar(texto: str) -> str:
    texto = texto.lower().strip()
    for padrao in PADROES_REMOVER:
        texto = re.sub(padrao, " ", texto, flags=re.IGNORECASE)
    texto = re.sub(r"[^a-záàãâäéèêëíìîïóòõôöúùûüçñ\s]", " ", texto)
    texto = " ".join(texto.split())
    tokens = [t for t in texto.split() if t not in STOPWORDS_PT and len(t) > 1]
    return " ".join(tokens)


def extrair_valor(texto: str) -> float | None:
    # Primeiro tenta padrões numéricos (mais preciso)
    for padrao in PADROES_VALOR:
        m = re.search(padrao, texto, re.IGNORECASE)
        if m:
            try:
                return float(m.group(1).replace(",", "."))
            except ValueError:
                continue
    # Fallback: tenta números por extenso
    return _extrair_valor_extenso(texto)


def extrair_descricao(texto: str) -> str:
    desc = texto
    for padrao in PADROES_REMOVER:
        desc = re.sub(padrao, " ", desc, flags=re.IGNORECASE)
    desc = re.sub(r"\s+", " ", desc).strip()
    # Remove verbos de ação comuns
    desc = re.sub(r"^(comprei|paguei|pedi|assinei|fui na?|gastei com)\s+", "", desc, flags=re.IGNORECASE)
    return desc.capitalize() if desc else texto.capitalize()


class Classificador:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._carregar()
        return cls._instance

    def _carregar(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Modelo não encontrado em: {MODEL_PATH}")
        with open(MODEL_PATH, "rb") as f:
            dados = pickle.load(f)
        self.pipeline = dados["pipeline"]
        self.classes = dados["classes"]
        print(f"[Classifier] Modelo carregado — {len(self.classes)} categorias")

    def classificar(self, texto: str) -> dict:
        texto_norm = normalizar(texto)
        categoria = self.pipeline.predict([texto_norm])[0]
        scores = self.pipeline.decision_function([texto_norm])[0]
        ranking = sorted(zip(self.classes, scores.tolist()), key=lambda x: x[1], reverse=True)

        return {
            "descricao": extrair_descricao(texto),
            "valor": extrair_valor(texto),
            "categoria": str(categoria),
            "sugestoes": [{"categoria": str(c), "score": round(s, 3)} for c, s in ranking[:3]],
        }
