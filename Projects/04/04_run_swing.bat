@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPORTS_DIR=%SCRIPT_DIR%Reports"

echo.
echo ============================================================
echo   Swing and Positional Screener  --  screener.in
echo ============================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install from https://python.org and add to PATH.
    pause
    exit /b 1
)

:: Create Reports folder
if not exist "%REPORTS_DIR%" mkdir "%REPORTS_DIR%"

:: Run the swing screener
python -X utf8 "%SCRIPT_DIR%swing_screener.py"

if errorlevel 1 (
    echo.
    echo [ERROR] Script exited with errors. See output above.
    echo.
    pause
    exit /b 1
)

echo.
echo [INFO] Opening Reports folder...
explorer "%REPORTS_DIR%"

endlocal
pause
