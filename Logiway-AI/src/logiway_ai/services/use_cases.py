from __future__ import annotations

from pathlib import Path

from logiway_ai.repositories.contracts import DatasetWriter
from logiway_ai.services.generator import SyntheticDatasetGenerator


class GenerateSyntheticDataset:
    def __init__(
        self,
        generator: SyntheticDatasetGenerator,
        writer: DatasetWriter,
    ) -> None:
        self._generator = generator
        self._writer = writer

    def execute(self, count: int, seed: int, output: Path) -> Path:
        if count <= 0:
            raise ValueError("count must be a positive integer")
        rows = self._generator.generate(count=count, seed=seed)
        return self._writer.write(rows, output)
