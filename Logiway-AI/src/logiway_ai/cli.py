from __future__ import annotations

import argparse
from collections.abc import Sequence
from pathlib import Path

from logiway_ai.infrastructure.repositories.jsonl_writer import JsonlDatasetWriter
from logiway_ai.services.generator import SyntheticDatasetGenerator
from logiway_ai.services.use_cases import GenerateSyntheticDataset

DEFAULT_COUNT = 260
DEFAULT_SEED = 2026
DEFAULT_OUTPUT = Path("data/train_data.jsonl")


def positive_integer(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("value must be a positive integer")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logiway-ai",
        description="Generate explicitly labeled synthetic Indonesian logistics estimates.",
    )
    parser.add_argument("--count", type=positive_integer, default=DEFAULT_COUNT)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    arguments = build_parser().parse_args(argv)
    use_case = GenerateSyntheticDataset(
        generator=SyntheticDatasetGenerator(),
        writer=JsonlDatasetWriter(),
    )
    output = use_case.execute(
        count=arguments.count,
        seed=arguments.seed,
        output=arguments.output,
    )
    print(f"Generated {arguments.count} synthetic estimates at {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
