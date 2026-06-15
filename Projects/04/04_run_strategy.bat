@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPORTS_DIR=%SCRIPT_DIR%Reports"

echo.
echo ============================================================
echo   High Conviction Strategy Scanner
echo   4-Pillar: Fundamental + Technical + Volume + Options
echo ============================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install from https://python.org and add to PATH.
    pause
    exit /b 1
)

:: Install required packages
echo [INFO] Checking dependencies...
python -m pip install -q yfinance pandas numpy requests beautifulsoup4
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo [OK] Dependencies ready.
echo.

:: Check watchlist exists
if not exist "%REPORTS_DIR%\swing_watchlist.html" (
    echo [ERROR] swing_watchlist.html not found in Reports folder.
    echo.
    echo  Run these first:
    echo   1. 04_run_swing.bat   ^(swing screener - generates swing_watchlist.html^)
    echo   2. Check Reports\ for swing_watchlist.html
    echo.
    pause
    exit /b 1
)

:: Create Reports folder (if missing)
if not exist "%REPORTS_DIR%" mkdir "%REPORTS_DIR%"

echo [INFO] Scanning %REPORTS_DIR%\swing_watchlist.html
echo [INFO] Fetching live price + options data from Yahoo Finance + NSE...
echo [INFO] This takes 2-5 minutes (rate-limited API calls)
echo.

python -X utf8 "%SCRIPT_DIR%strategy_scanner.py"

if errorlevel 1 (
    echo.
    echo [ERROR] Script exited with errors. See output above.
    echo.
    echo  Common issues:
    echo   - NSE options: NSE blocks scraping from non-Indian IPs (use VPN if needed)
    echo   - Yahoo Finance: ensure internet connection is active
    echo   - Missing watchlist: run 04_run_swing.bat first
    echo.
    pause
    exit /b 1
)

echo.
echo [INFO] Opening Reports folder...
explorer "%REPORTS_DIR%"

endlocal
pause
