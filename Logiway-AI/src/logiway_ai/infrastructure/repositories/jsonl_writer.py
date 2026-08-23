from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path
from uuid import uuid4

from logiway_ai.domain.models import DatasetRow


class JsonlDatasetWriter:
    def write(self, rows: Sequence[DatasetRow], output: Path) -> Path:
        resolved = output.expanduser().resolve()
        resolved.parent.mkdir(parents=True, exist_ok=True)
        identifiers = [row.id for row in rows]
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("dataset row identifiers must be unique")
        temporary = resolved.with_name(f".{resolved.name}.{uuid4().hex}.tmp")
        try:
            with temporary.open("w", encoding="utf-8", newline="\n") as stream:
                for row in rows:
                    stream.write(json.dumps(row.to_dict(), ensure_ascii=False, sort_keys=True))
                    stream.write("\n")
            temporary.replace(resolved)
        finally:
            temporary.unlink(missing_ok=True)
        return resolved
