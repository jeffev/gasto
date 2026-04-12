"""
Backend FastAPI — Finança App
Endpoints:
  POST /parse       → texto → {descricao, valor, categoria}
  POST /transcribe  → audio (m4a/wav) → {texto}
  POST /feedback    → salva correção do usuário para re-treino
  GET  /health      → status do servidor
"""

import os
import csv
import tempfile
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from classifier import Classificador

app = FastAPI(title="Finança API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

clf = Classificador()

FEEDBACK_PATH = Path(__file__).parent.parent / "model" / "data" / "feedbacks.csv"

# Carrega o modelo Whisper uma vez no startup (evita reload a cada transcrição)
_whisper_model = None

def get_whisper():
    global _whisper_model
    if _whisper_model is None:
        try:
            import whisper
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                _whisper_model = whisper.load_model("small")
            print("[Whisper] Modelo carregado.")
        except ImportError:
            pass
    return _whisper_model


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ParseRequest(BaseModel):
    texto: str


class FeedbackRequest(BaseModel):
    texto_original: str
    categoria_sugerida: str
    categoria_confirmada: str
    aceito: bool


class ParseResponse(BaseModel):
    descricao: str
    valor: float | None
    categoria: str
    sugestoes: list[dict]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "model": "loaded", "categorias": clf.classes}


@app.post("/parse", response_model=ParseResponse)
def parse(req: ParseRequest):
    if not req.texto.strip():
        raise HTTPException(status_code=400, detail="Texto vazio")
    return clf.classificar(req.texto.strip())


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Recebe um arquivo de áudio e retorna a transcrição via Whisper.
    Requer: pip install openai-whisper  +  ffmpeg instalado no sistema.
    """
    model = get_whisper()
    if model is None:
        raise HTTPException(
            status_code=501,
            detail="Whisper não instalado. Execute: pip install openai-whisper"
        )

    suffix = Path(audio.filename or "audio.m4a").suffix or ".m4a"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        import re
        result = model.transcribe(
            tmp_path,
            language="pt",
            temperature=0,
            initial_prompt=(
                "Transcrição de despesas financeiras em português brasileiro. "
                "Exemplos: paguei aluguel mil reais, uber vinte reais, "
                "supermercado cento e cinquenta reais, academia cinquenta reais, "
                "farmácia trinta e cinco reais, lanche quinze reais."
            ),
        )
        texto = result["text"].strip()
        texto = re.sub(r"[.!?,;]+$", "", texto).strip()
    finally:
        os.unlink(tmp_path)

    return {"texto": texto}


@app.post("/feedback")
def feedback(req: FeedbackRequest):
    """Salva a correção do usuário para alimentar re-treino futuro."""
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)

    escrever_header = not FEEDBACK_PATH.exists()
    with open(FEEDBACK_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if escrever_header:
            writer.writerow(["texto", "categoria_sugerida", "categoria_confirmada", "aceito", "timestamp"])
        writer.writerow([
            req.texto_original,
            req.categoria_sugerida,
            req.categoria_confirmada,
            req.aceito,
            datetime.now().isoformat(),
        ])

    return {"status": "ok"}
