@echo off
title India Stock Report Generator
echo.
echo ========================================================
echo   India Equity Research Report Generator
echo ========================================================
echo.

:: Change to the folder where this bat file lives
cd /d "%~dp0"

:: Try 'python' first, fall back to 'py' launcher
where python >nul 2>&1
if %errorlevel% == 0 (
    set PYTHON=python
) else (
    where py >nul 2>&1
    if %errorlevel% == 0 (
        set PYTHON=py
    ) else (
        echo [ERROR] Python not found. Please install Python and add it to PATH.
        echo         Download from: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

echo Running report script...
echo.
%PYTHON% india_stock_report.py

if %errorlevel% == 0 (
    echo.
    echo ========================================================
    echo   Done! Opening reports...
    echo ========================================================
    echo.

    :: Open the HTML report in the default browser
    for %%f in (Reports\03_india_stock_report_*.html) do set LATEST_HTML=%%f
    if defined LATEST_HTML (
        start "" "%LATEST_HTML%"
    )

    :: Open the CSV in the default application (usually Excel)
    for %%f in (Reports\03_india_stock_report_*.csv) do set LATEST_CSV=%%f
    if defined LATEST_CSV (
        start "" "%LATEST_CSV%"
    )
) else (
    echo.
    echo [ERROR] Script failed. Check the error message above.
)

echo.
pause
