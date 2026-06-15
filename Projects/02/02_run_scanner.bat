@echo off
TITLE Nifty 500 Swing Scanner

echo ============================================
echo   Nifty 500 Swing Scanner - Setup Check
echo ============================================

:: Check Python is installed
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found. Please install Python from https://python.org
    pause
    exit /b 1
)

:: Install dependencies if needed
echo Installing / updating required libraries...
pip install -r requirements.txt --quiet

echo.
echo Starting scan... (takes 2-4 minutes for all 500 stocks)
echo.

python main.py

echo.
echo Done! Check the results folder for your Excel file.
pause
