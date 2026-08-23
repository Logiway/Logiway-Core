from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import StrEnum
from typing import Any, Literal


class VerificationStatus(StrEnum):
    VERIFIED = "verified"
    PENDING = "pending"


@dataclass(frozen=True, slots=True)
class DatasetProvenance:
    kind: Literal["synthetic_estimate"]
    is_synthetic: Literal[True]
    is_official: Literal[False]
    is_verified: Literal[False]
    seed: int
    generator_version: str
    source_description: str

    @classmethod
    def synthetic(cls, seed: int, generator_version: str) -> DatasetProvenance:
        return cls(
            kind="synthetic_estimate",
            is_synthetic=True,
            is_official=False,
            is_verified=False,
            seed=seed,
            generator_version=generator_version,
            source_description="Programmatically generated Indonesian logistics scenario",
        )


@dataclass(frozen=True, slots=True)
class DatasetRow:
    id: str
    system: str
    instruction: str
    output: str
    provenance: DatasetProvenance

    def __post_init__(self) -> None:
        values = (self.id, self.system, self.instruction, self.output)
        if any(not value.strip() for value in values):
            raise ValueError("dataset row text fields must be non-empty")
        valid_provenance = (
            self.provenance.kind == "synthetic_estimate"
            and self.provenance.is_synthetic
            and not self.provenance.is_official
            and not self.provenance.is_verified
        )
        if not valid_provenance:
            raise ValueError("dataset rows must use non-official synthetic-estimate provenance")
        combined_text = " ".join((self.system, self.instruction, self.output)).casefold()
        forbidden_claims = (
            "berdasarkan data resmi",
            "sumber resmi menyatakan",
            "data terverifikasi",
            "official data",
            "verified data",
        )
        if any(claim in combined_text for claim in forbidden_claims):
            raise ValueError("synthetic rows cannot contain official or verified claims")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class Scenario:
    code: str
    category: str
    start_hour: int
    end_hour: int
    risk_during_window: str
    assumption: str
    advice: str

    def __post_init__(self) -> None:
        if not 0 <= self.start_hour <= 23 or not 0 <= self.end_hour <= 23:
            raise ValueError("scenario hours must be between 0 and 23")

    def includes_hour(self, hour: int) -> bool:
        if not 0 <= hour <= 23:
            raise ValueError("hour must be between 0 and 23")
        if self.start_hour <= self.end_hour:
            return self.start_hour <= hour <= self.end_hour
        return hour >= self.start_hour or hour <= self.end_hour


@dataclass(frozen=True, slots=True)
class RegulationRecord:
    id: str
    title: str
    jurisdiction: str
    status: VerificationStatus
    source_reference: str | None
    operational: bool

    def __post_init__(self) -> None:
        if not self.id.strip() or not self.title.strip() or not self.jurisdiction.strip():
            raise ValueError("regulation fields must be non-empty")
        if self.status is VerificationStatus.PENDING and self.operational:
            raise ValueError("pending regulation records must be non-operational")
        if self.status is VerificationStatus.VERIFIED and not self.source_reference:
            raise ValueError("verified regulation records require a source reference")
