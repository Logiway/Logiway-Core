from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from typing import Protocol

from logiway_ai.domain.models import DatasetRow, RegulationRecord


class DatasetWriter(Protocol):
    def write(self, rows: Sequence[DatasetRow], output: Path) -> Path: ...


class RegulationCatalog(Protocol):
    def read(self) -> tuple[RegulationRecord, ...]: ...
