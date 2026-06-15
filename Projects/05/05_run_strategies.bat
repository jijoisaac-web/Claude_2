@echo off
TITLE Institutional Strategy Engine ^| Project 05

echo ============================================================
echo   INSTITUTIONAL STRATEGY ENGINE  ^|  Project 05
echo   Indian Equities  ^|  Zerodha NRE  ^|  INR 20 Lakhs
echo ============================================================

python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found. Install Python and add to PATH.
    pause
    exit /b 1
)

cd /d "%~dp0"

echo Installing / updating required libraries...
pip install -r requirements.txt --quiet

echo.
echo Running all institutional strategies...
echo (This may take 3-5 minutes while downloading market data)
echo.

python main.py

echo.
echo Done! Check the results folder for your strategy report Excel.
pause
