FROM python:3.12-slim
WORKDIR /app
COPY services/guard_model/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY platform_shared/ ./platform_shared/
COPY services/guard_model/app.py .

# Run as a non-root user (audit finding H6).
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8200", "--workers", "2"]
