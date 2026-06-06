"""
Microserviço OCR local — PaddleOCR (Sprint 15.1).
POST /ocr — multipart file (+ optional password for PDF).
"""
from __future__ import annotations

import io
import os
import time
from typing import Any

import cv2
import fitz  # pymupdf
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from paddleocr import PaddleOCR
from PIL import Image

OCR_LANG = os.getenv("OCR_LANG", "pt")
MAX_PAGES = int(os.getenv("OCR_MAX_PAGES", "10"))

app = FastAPI(title="LOGOS OCR Service", version="1.0.0")

_ocr_engine: PaddleOCR | None = None


def get_ocr() -> PaddleOCR:
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang=OCR_LANG,
            show_log=False,
        )
    return _ocr_engine


def preprocess_image(img: np.ndarray) -> np.ndarray:
    """Grayscale + contraste (CLAHE) para prints e fotos."""
    if img.ndim == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def bytes_to_bgr(content: bytes) -> np.ndarray:
    arr = np.frombuffer(content, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=422, detail="Arquivo inválido ou corrompido.")
    return img


def pdf_pages_to_images(content: bytes, password: str | None) -> list[np.ndarray]:
    doc = fitz.open(stream=content, filetype="pdf")
    if doc.is_encrypted:
        if not password:
            doc.close()
            raise HTTPException(
                status_code=422,
                detail={"code": "PDF_PASSWORD_REQUIRED", "message": "Documento protegido por senha."},
            )
        if doc.authenticate(password) == 0:
            doc.close()
            raise HTTPException(
                status_code=400,
                detail={"code": "PDF_INVALID_PASSWORD", "message": "Senha inválida para este PDF."},
            )

    images: list[np.ndarray] = []
    page_count = min(len(doc), MAX_PAGES)
    for i in range(page_count):
        page = doc[i]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        elif pix.n == 1:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        images.append(img)
    doc.close()
    return images


def run_ocr_on_image(img: np.ndarray) -> tuple[list[str], list[float]]:
    processed = preprocess_image(img)
    engine = get_ocr()
    result = engine.ocr(processed, cls=True)
    lines: list[str] = []
    confidences: list[float] = []
    if not result:
        return lines, confidences
    for block in result:
        if not block:
            continue
        for line in block:
            if not line or len(line) < 2:
                continue
            text_part = line[1]
            if not text_part or len(text_part) < 2:
                continue
            text = str(text_part[0]).strip()
            conf = float(text_part[1])
            if text:
                lines.append(text)
                confidences.append(conf * 100.0)
    return lines, confidences


def is_pdf(content: bytes, filename: str, content_type: str | None) -> bool:
    if content_type == "application/pdf":
        return True
    if filename.lower().endswith(".pdf"):
        return True
    return content[:4] == b"%PDF"


def is_image(content_type: str | None, filename: str) -> bool:
    if content_type and content_type.startswith("image/"):
        return True
    lower = filename.lower()
    return lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "provider": "paddleocr", "lang": OCR_LANG}


@app.post("/ocr")
async def ocr_endpoint(
    file: UploadFile = File(...),
    password: str | None = Form(default=None),
) -> dict[str, Any]:
    started = time.perf_counter()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Arquivo vazio.")

    filename = file.filename or "upload"
    content_type = file.content_type

    all_lines: list[str] = []
    all_confidences: list[float] = []
    pages = 0

    try:
        if is_pdf(content, filename, content_type):
            images = pdf_pages_to_images(content, password)
            pages = len(images)
            for img in images:
                lines, confs = run_ocr_on_image(img)
                all_lines.extend(lines)
                all_confidences.extend(confs)
        elif is_image(content_type, filename):
            img = bytes_to_bgr(content)
            pages = 1
            lines, confs = run_ocr_on_image(img)
            all_lines.extend(lines)
            all_confidences.extend(confs)
        else:
            raise HTTPException(status_code=400, detail="Tipo de arquivo não suportado para OCR.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Falha no OCR: {exc}") from exc

    text = "\n".join(all_lines).strip()
    confidence = int(round(sum(all_confidences) / len(all_confidences))) if all_confidences else 0
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    return {
        "text": text,
        "confidence": confidence,
        "provider": "paddleocr",
        "pages": pages,
        "raw": {
            "line_count": len(all_lines),
            "elapsed_ms": elapsed_ms,
            "lang": OCR_LANG,
        },
    }
