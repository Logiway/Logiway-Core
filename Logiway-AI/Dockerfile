FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

RUN useradd --create-home --uid 10001 logiway \
    && mkdir /output \
    && chown logiway:logiway /output

WORKDIR /app

COPY --chown=logiway:logiway src ./src

USER logiway

ENTRYPOINT ["python", "-m", "logiway_ai.cli"]
CMD ["--count", "260", "--seed", "2026", "--output", "/output/train_data.jsonl"]
