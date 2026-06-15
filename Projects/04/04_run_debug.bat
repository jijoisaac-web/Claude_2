@echo off
:: ============================================================
::  Screener.in Debug Runner
::  Diagnoses why scan results return 0 companies
:: ============================================================

setlocal

set "SCRIPT_DIR=%~dp0"
set "ENV_FILE=%SCRIPT_DIR%.env"
set "PY_SCRIPT=%SCRIPT_DIR%debug_screener.py"
set "DEBUG_OUT=%SCRIPT_DIR%debug_response.html"

echo.
echo ============================================================
echo   Screener.in Debug Runner
echo ============================================================
echo.

:: ── Check Python ──────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install from https://python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [INFO] %%v

:: ── Check .env ────────────────────────────────────────────────
if not exist "%ENV_FILE%" (
    echo [ERROR] .env file not found. Run run_screener.bat first to create it.
    pause
    exit /b 1
)

:: ── Install deps ──────────────────────────────────────────────
echo [INFO] Checking dependencies ...
python -m pip install -q requests beautifulsoup4 python-dotenv lxml
echo [OK] Dependencies ready.
echo.

:: ── Run debug script ──────────────────────────────────────────
echo [INFO] Running debug probe against screener.in ...
echo ============================================================
echo.
python "%PY_SCRIPT%"
echo.
echo ============================================================

:: ── Open debug response in browser if it exists ───────────────
if exist "%DEBUG_OUT%" (
    echo [INFO] Opening debug_response.html in browser ...
    start "" "%DEBUG_OUT%"
)

echo.
echo [INFO] Copy the output above and share it for analysis.
echo.
endlocal
pause
