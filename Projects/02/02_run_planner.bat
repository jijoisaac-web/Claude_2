@echo off
TITLE Swing Trade Planner - Zerodha NRE

echo ============================================
echo   Swing Trade Planner  ^|  Zerodha NRE
echo   Capital: INR 20 Lakhs
echo ============================================

python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found.
    pause
    exit /b 1
)

echo Installing / updating required libraries...
pip install -r requirements.txt --quiet

echo.
echo Generating trade plan from latest scan...
echo.

python trade_planner.py

echo.
echo Done! Check the results folder for your trade plan Excel.
pause