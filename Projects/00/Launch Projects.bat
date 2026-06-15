@echo off
cd /d "%~dp0"
python launcher.py
if errorlevel 1 (
    echo.
    echo Python not found or error occurred.
    echo Make sure Python is installed and on PATH.
    pause
)
