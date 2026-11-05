"""Production entrypoint: initialize additive database schema before serving requests."""
from app import app, init_db

# init_db uses CREATE TABLE IF NOT EXISTS and additive migrations.
# Run once during worker startup so Render/Gunicorn has the schema expected by APIs.
init_db()
