@echo off
:: ============================================================
::  Multibagger Scan Report Generator
::  Saves timestamped HTML reports to the .\Reports folder
:: ============================================================

setlocal

:: Resolve paths relative to this batch file
set "SCRIPT_DIR=%~dp0"
set "REPORTS_DIR=%SCRIPT_DIR%Reports"
set "PYTHON_SCRIPT=%SCRIPT_DIR%generate_scans.py"

:: Create Reports folder if it doesn't exist
if not exist "%REPORTS_DIR%" (
    mkdir "%REPORTS_DIR%"
    echo [INFO] Created Reports folder: %REPORTS_DIR%
)

echo.
echo ============================================================
echo   Multibagger Scan Report Generator
echo ============================================================
echo   Script : %PYTHON_SCRIPT%
echo   Output : %REPORTS_DIR%
echo ============================================================
echo.

:: Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python and add it to PATH.
    pause
    exit /b 1
)

:: Run the generator
python "%PYTHON_SCRIPT%" "%REPORTS_DIR%"

if errorlevel 1 (
    echo.
    echo [ERROR] Script failed. Check errors above.
    pause
    exit /b 1
)

echo.
echo [OK] Report saved to: %REPORTS_DIR%
echo.

:: Open the Reports folder in Explorer
explorer "%REPORTS_DIR%"

endlocal
