"""
Treinamento do modelo de categorização de despesas.
Pipeline: normalização → TF-IDF → LinearSVC
"""

import re
import csv
import pickle
import os
from collections import Counter

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

# ---------------------------------------------------------------------------
# Normalização de texto
# ---------------------------------------------------------------------------

# Remove valores monetários para que o modelo aprenda pela descrição, não pelo valor
PADROES_VALOR = [
    r"R\$\s*[\d.,]+",       # R$ 20,00 / R$20
    r"[\d]+[.,][\d]{2}",    # 20,00 / 20.00
    r"[\d]+\s*reais",       # 20 reais
    r"\b[\d]+\b",           # número solto (ex: "uber 15")
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

    # Remove valores monetários
    for padrao in PADROES_VALOR:
        texto = re.sub(padrao, " ", texto, flags=re.IGNORECASE)

    # Remove caracteres especiais, mantém letras e espaços
    texto = re.sub(r"[^a-záàãâäéèêëíìîïóòõôöúùûüçñ\s]", " ", texto)

    # Normaliza acentos comuns de digitação rápida
    substituicoes = {
        "ã": "a", "â": "a", "á": "a", "à": "a",
        "ê": "e", "é": "e", "è": "e",
        "î": "i", "í": "i", "ì": "i",
        "õ": "o", "ô": "o", "ó": "o", "ò": "o",
        "û": "u", "ú": "u", "ù": "u",
        "ç": "c",
    }
    # Mantém os acentos (importante pro português), só normaliza duplicatas
    texto = " ".join(texto.split())  # remove espaços duplos

    # Remove stopwords
    tokens = [t for t in texto.split() if t not in STOPWORDS_PT and len(t) > 1]

    return " ".join(tokens)


# ---------------------------------------------------------------------------
# Carregamento do dataset
# ---------------------------------------------------------------------------

def carregar_dataset(path="data/dataset.csv"):
    textos, categorias = [], []
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            textos.append(row["texto"])
            categorias.append(row["categoria"])
    return textos, categorias


# ---------------------------------------------------------------------------
# Pipeline de treinamento
# ---------------------------------------------------------------------------

def treinar(dataset_path="data/dataset.csv", model_path="data/modelo.pkl"):
    print("=" * 60)
    print("TREINAMENTO DO MODELO DE CATEGORIZAÇÃO")
    print("=" * 60)

    # 1. Carrega dados
    print("\n[1/5] Carregando dataset...")
    textos, categorias = carregar_dataset(dataset_path)
    print(f"      {len(textos)} registros carregados")

    # 2. Normaliza textos
    print("[2/5] Normalizando textos...")
    textos_norm = [normalizar(t) for t in textos]

    # 3. Split treino/teste
    print("[3/5] Separando treino (80%) e teste (20%)...")
    X_train, X_test, y_train, y_test = train_test_split(
        textos_norm, categorias,
        test_size=0.2,
        random_state=42,
        stratify=categorias
    )
    print(f"      Treino: {len(X_train)} | Teste: {len(X_test)}")

    # 4. Treina pipeline
    print("[4/5] Treinando TF-IDF + LinearSVC...")
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 2),     # unigramas e bigramas
            min_df=2,               # ignora termos raríssimos
            max_df=0.95,            # ignora termos muito comuns
            sublinear_tf=True,      # log(tf) — melhora performance
        )),
        ("clf", LinearSVC(
            C=1.0,
            max_iter=2000,
            random_state=42,
        )),
    ])

    pipeline.fit(X_train, y_train)

    # 5. Avalia
    print("[5/5] Avaliando modelo...\n")
    y_pred = pipeline.predict(X_test)
    acuracia = (np.array(y_pred) == np.array(y_test)).mean()

    print(f"Acurácia no conjunto de teste: {acuracia:.2%}\n")
    print("Relatório por categoria:")
    print(classification_report(y_test, y_pred, zero_division=0))

    # Validação cruzada
    print("Validação cruzada (5-fold):")
    scores = cross_val_score(pipeline, textos_norm, categorias, cv=5, scoring="accuracy")
    print(f"  Acurácia média: {scores.mean():.2%} (+/- {scores.std():.2%})")
    print(f"  Por fold: {[f'{s:.2%}' for s in scores]}\n")

    # Salva modelo
    os.makedirs(os.path.dirname(model_path) if os.path.dirname(model_path) else ".", exist_ok=True)
    with open(model_path, "wb") as f:
        pickle.dump({
            "pipeline": pipeline,
            "classes": list(pipeline.classes_),
            "versao": "1.0",
        }, f)

    print(f"Modelo salvo em: {model_path}")
    return pipeline


if __name__ == "__main__":
    treinar(dataset_path="data/dataset.csv", model_path="data/modelo.pkl")
