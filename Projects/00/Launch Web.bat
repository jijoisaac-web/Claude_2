@echo off
cd /d "%~dp0"
echo Installing Flask if needed...
python -m pip install flask -q --break-system-packages 2>nul || python -m pip install flask -q
echo.
echo Starting Project Launcher Web Edition...
echo Open: http://localhost:5050
echo Press Ctrl+C to stop.
echo.
python web_launcher.py
if errorlevel 1 (
    echo.
    echo Error: Make sure Python is installed and on PATH.
    pause
)
