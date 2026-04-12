"""
Exporta o modelo treinado (TF-IDF + LinearSVC) para JSON,
para ser usado pelo classificador TypeScript offline.
"""

import json
import pickle
import numpy as np
import os


def exportar(model_path="data/modelo.pkl", output_path="../app/assets/model.json"):
    print("Carregando modelo...")
    with open(model_path, "rb") as f:
        data = pickle.load(f)

    pipeline = data["pipeline"]
    tfidf = pipeline.named_steps["tfidf"]
    clf = pipeline.named_steps["clf"]

    print(f"Classes: {list(clf.classes_)}")
    print(f"Vocabulário: {len(tfidf.vocabulary_)} termos")
    print(f"Coeficientes: {clf.coef_.shape}")

    # TF-IDF
    vocab = {word: int(idx) for word, idx in tfidf.vocabulary_.items()}
    idf = tfidf.idf_.tolist()

    # LinearSVC
    coef = clf.coef_.tolist()        # shape: [n_classes, n_features]
    intercept = clf.intercept_.tolist()  # shape: [n_classes]
    classes = list(clf.classes_)

    # Settings
    settings = {
        "sublinear_tf": tfidf.sublinear_tf,
        "ngram_range": list(tfidf.ngram_range),
    }

    model_json = {
        "version": "1.0",
        "settings": settings,
        "vocab": vocab,
        "idf": idf,
        "classes": classes,
        "coef": coef,
        "intercept": intercept,
    }

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(model_json, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(output_path) / 1024
    print(f"\nExportado para: {output_path}")
    print(f"Tamanho: {size_kb:.1f} KB")


if __name__ == "__main__":
    exportar()
