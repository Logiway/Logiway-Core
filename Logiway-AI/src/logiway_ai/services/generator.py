from __future__ import annotations

import random

from logiway_ai import __version__
from logiway_ai.domain.models import DatasetProvenance, DatasetRow, Scenario
from logiway_ai.domain.scenarios import (
    AREA_TYPES,
    CITIES,
    QUESTION_TEMPLATES,
    SCENARIOS,
    TIMES,
    VEHICLES,
)


class SyntheticDatasetGenerator:
    def generate(self, count: int, seed: int) -> tuple[DatasetRow, ...]:
        if count <= 0:
            raise ValueError("count must be a positive integer")
        randomizer = random.Random(seed)
        provenance = DatasetProvenance.synthetic(seed=seed, generator_version=__version__)
        return tuple(
            self._generate_row(index, randomizer, provenance) for index in range(1, count + 1)
        )

    def _generate_row(
        self,
        index: int,
        randomizer: random.Random,
        provenance: DatasetProvenance,
    ) -> DatasetRow:
        scenario = randomizer.choice(SCENARIOS)
        city = randomizer.choice(CITIES)
        area = randomizer.choice(AREA_TYPES)
        vehicle = randomizer.choice(VEHICLES)
        time_text, hour = randomizer.choice(TIMES)
        location = f"{city}, {area}"
        instruction = randomizer.choice(QUESTION_TEMPLATES).format(
            vehicle=vehicle,
            location=location,
            time=time_text,
        )
        output = self._build_output(scenario, location, time_text, hour)
        return DatasetRow(
            id=f"synthetic-{provenance.seed}-{index:06d}",
            system=(
                "Kamu adalah asisten simulasi logistik Indonesia. Semua jawaban adalah "
                "estimasi sintetis untuk pengujian, bukan fakta lapangan, sumber hukum, "
                "atau data otoritas. Minta pengguna memeriksa kondisi dan sumber aktual."
            ),
            instruction=instruction,
            output=output,
            provenance=provenance,
        )

    @staticmethod
    def _build_output(
        scenario: Scenario,
        location: str,
        time_text: str,
        hour: int,
    ) -> str:
        during_window = scenario.includes_hour(hour)
        risk = scenario.risk_during_window if during_window else "lebih rendah"
        timing = (
            "berada dalam jendela asumsi skenario"
            if during_window
            else "berada di luar jendela utama asumsi skenario"
        )
        return "\n".join(
            (
                "Status: ESTIMASI SINTETIS, bukan data resmi atau kondisi terverifikasi.",
                f"Skenario: {location} dimodelkan dengan {scenario.category}.",
                f"Perkiraan: Pukul {time_text} {timing}; tingkat risiko sintetis {risk}.",
                f"Asumsi: {scenario.assumption}.",
                f"Mitigasi: {scenario.advice}.",
                (
                    "Verifikasi: Periksa kondisi rute, cuaca, fasilitas, dan arahan "
                    "otoritas yang berlaku sebelum berangkat."
                ),
            )
        )
