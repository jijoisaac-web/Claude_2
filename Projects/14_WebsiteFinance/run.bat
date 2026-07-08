@echo off
cd /d "%~dp0"
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate
)
echo Starting India Shares Tracker at http://127.0.0.1:8000
start http://127.0.0.1:8000
python -m uvicorn backend.main:app --port 8000
