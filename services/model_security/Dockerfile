# Model artifact security scanner — wraps Protect AI's ModelScan (Apache 2.0).
# Same two-stage shape as services/garak/Dockerfile: build deps isolated to
# the builder stage, slim runtime image.

FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY services/model_security/requirements.txt .
RUN python -m venv /venv \
    && /venv/bin/pip install --no-cache-dir --upgrade pip \
    && /venv/bin/pip install --no-cache-dir -r requirements.txt


FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /venv /venv
ENV PATH="/venv/bin:${PATH}"

COPY services/model_security/app.py .
COPY services/model_security/findings_client.py .

CMD ["/venv/bin/uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8300"]
