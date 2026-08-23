from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from logiway_ai.domain.models import RegulationRecord, VerificationStatus


class JsonRegulationCatalogReader:
    def __init__(self, path: Path) -> None:
        self._path = path

    def read(self) -> tuple[RegulationRecord, ...]:
        with self._path.open(encoding="utf-8") as stream:
            payload: Any = json.load(stream)
        if not isinstance(payload, dict) or payload.get("catalog_version") != "1.0":
            raise ValueError("unsupported regulation catalog")
        raw_records = payload.get("records")
        if not isinstance(raw_records, list):
            raise ValueError("regulation catalog records must be a list")
        records: list[RegulationRecord] = []
        for index, raw_record in enumerate(raw_records):
            if not isinstance(raw_record, dict):
                raise ValueError(
                    f"invalid regulation catalog record at index {index}: must be an object"
                )
            try:
                record_id = raw_record["id"]
                title = raw_record["title"]
                jurisdiction = raw_record["jurisdiction"]
                status = raw_record["status"]
                source_reference = raw_record["source_reference"]
                operational = raw_record["operational"]
            except KeyError as error:
                raise ValueError(
                    f"invalid regulation catalog record at index {index}: missing {error.args[0]}"
                ) from error
            field_types = {
                "id": (record_id, str),
                "title": (title, str),
                "jurisdiction": (jurisdiction, str),
                "status": (status, str),
                "operational": (operational, bool),
            }
            for field, (value, expected_type) in field_types.items():
                if type(value) is not expected_type:
                    raise ValueError(
                        f"invalid regulation catalog record at index {index}: "
                        f"{field} must be {expected_type.__name__}"
                    )
            if source_reference is not None and type(source_reference) is not str:
                raise ValueError(
                    f"invalid regulation catalog record at index {index}: "
                    "source_reference must be str or null"
                )
            try:
                record = RegulationRecord(
                    id=record_id,
                    title=title,
                    jurisdiction=jurisdiction,
                    status=VerificationStatus(status),
                    source_reference=source_reference,
                    operational=operational,
                )
            except ValueError as error:
                raise ValueError(
                    f"invalid regulation catalog record at index {index}: {error}"
                ) from error
            records.append(record)
        return tuple(records)
