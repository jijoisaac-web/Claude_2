@echo off
title Indian Stock Market Backtester
cd /d "%~dp0"

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python and add it to PATH.
    pause
    exit /b 1
)

echo Installing/checking required packages...
pip install yfinance pandas numpy matplotlib --quiet

echo.
echo Starting Indian Stock Market Backtester...
echo.
python 09_indian_backtester.py

if errorlevel 1 (
    echo.
    echo Script exited with an error.
    pause
)
