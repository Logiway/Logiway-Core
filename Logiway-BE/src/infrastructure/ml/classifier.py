import sys
import json
import os
import warnings

# Suppress Hugging Face, PyTorch, and tqdm progress bars from polluting stderr/backend logs
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["TQDM_DISABLE"] = "1"
os.environ["PYTHONWARNINGS"] = "ignore"
warnings.filterwarnings("ignore")

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, logging as tf_logging

tf_logging.set_verbosity_error()

default_model_dir = os.path.join(os.path.dirname(__file__), "indobert-pungli-classifier")
if not os.path.exists(default_model_dir):
    default_model_dir = os.path.join(os.path.dirname(__file__), "..", "..", "indobert-pungli-classifier")

MODEL_PATH = os.environ.get("MODEL_PATH", default_model_dir)
MODEL_PATH = os.path.abspath(MODEL_PATH)

LABEL_MAP = {
    0: "AMAN_INFORMASI",
    1: "PUNGLI_RINGAN",
    2: "PUNGLI_BERAT",
    3: "REGULASI_ODOL"
}

# Severity scale (1-10) for GraphHopper penalty calculations
LABEL_SEVERITY = {
    "AMAN_INFORMASI": 0,
    "PUNGLI_RINGAN": 4,
    "PUNGLI_BERAT": 9,
    "REGULASI_ODOL": 7
}

_tokenizer = None
_model = None

def get_model_and_tokenizer():
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model path not found: {MODEL_PATH}")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        _model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
        _model.eval()
    return _tokenizer, _model

def classify_text(text: str) -> dict:
    try:
        tokenizer, model = get_model_and_tokenizer()
        inputs = tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        )
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=1).squeeze().tolist()

        if isinstance(probs, float):
            probs = [probs]

        pred_id = int(torch.argmax(logits, dim=1).item())
        label = LABEL_MAP.get(pred_id, f"LABEL_{pred_id}")
        confidence = float(probs[pred_id]) if pred_id < len(probs) else 1.0
        severity = LABEL_SEVERITY.get(label, 0)

        return {
            "success": True,
            "label_id": pred_id,
            "label": label,
            "confidence": round(confidence, 4),
            "severity": severity,
            "probabilities": {LABEL_MAP.get(i, f"LABEL_{i}"): round(float(p), 4) for i, p in enumerate(probs)}
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def classify_batch(items: list) -> list:
    results = []
    for item in items:
        text = item if isinstance(item, str) else item.get("text", "")
        res = classify_text(text)
        if isinstance(item, dict):
            res = {**item, **res}
        results.append(res)
    return results

def main():
    if len(sys.argv) > 1:
        raw_input = sys.argv[1]
        try:
            parsed = json.loads(raw_input)
            if isinstance(parsed, list):
                out = classify_batch(parsed)
            elif isinstance(parsed, dict) and "text" in parsed:
                out = classify_text(parsed["text"])
            else:
                out = classify_text(str(parsed))
        except Exception:
            out = classify_text(raw_input)
    else:
        # Read from stdin
        raw_input = sys.stdin.read().strip()
        if not raw_input:
            out = {"success": False, "error": "No input provided"}
        else:
            try:
                parsed = json.loads(raw_input)
                if isinstance(parsed, list):
                    out = classify_batch(parsed)
                elif isinstance(parsed, dict) and "text" in parsed:
                    out = classify_text(parsed["text"])
                else:
                    out = classify_text(str(parsed))
            except Exception:
                out = classify_text(raw_input)

    print(json.dumps(out))

if __name__ == "__main__":
    main()
