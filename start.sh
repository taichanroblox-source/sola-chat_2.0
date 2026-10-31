#!/bin/sh
set -e

python -c "from app import init_db; init_db()"

exec gunicorn app:app
