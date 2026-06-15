@echo off
REM ============================================================
REM  India Equity Momentum Screener - one-click runner
REM  Usage:
REM    run_screener.bat                 full run
REM    run_screener.bat fast            skip earnings (price+flows only)
REM    run_screener.bat fastest         skip earnings and flows
REM  Any other args are passed straight to run_all.py
REM ============================================================
setlocal
cd /d "%~dp0"

REM ---- find Python ----
where python >nul 2>&1
if %errorlevel%==0 (set PY=python) else (
    where py >nul 2>&1
    if %errorlevel%==0 (set PY=py) else (
        echo [ERROR] Python not found on PATH. Install from https://www.python.org/downloads/
        pause & exit /b 1
    )
)

REM ---- install dependencies on first run ----
if not exist ".deps_installed" (
    echo [setup] Installing dependencies...
    %PY% -m pip install -r 08_requirements.txt --quiet
    if errorlevel 1 (
        echo [ERROR] pip install failed. Check your internet connection.
        pause & exit /b 1
    )
    echo done > .deps_installed
)

REM ---- map shortcut args ----
set ARGS=%*
if /i "%~1"=="fast"    set ARGS=--skip-earnings
if /i "%~1"=="fastest" set ARGS=--skip-earnings --skip-flows

echo [run] %PY% run_all.py %ARGS%
%PY% run_all.py %ARGS%
if errorlevel 1 (
    echo [ERROR] Screener failed - see messages above.
    pause & exit /b 1
)

REM ---- open the newest Excel report ----
set LATEST=
for /f "delims=" %%f in ('dir /b /o-d "output\08_Momentum_Screener_Report*.xlsx" 2^>nul') do (
    if not defined LATEST set LATEST=%%f
)
if defined LATEST (
    echo [done] Opening Excel: %LATEST%
    start "" "output\%LATEST%"
)

REM ---- open the newest HTML dashboard in default browser ----
set LATEST_HTML=
for /f "delims=" %%f in ('dir /b /o-d "output\08_Momentum_Screener_Report*.html" 2^>nul') do (
    if not defined LATEST_HTML set LATEST_HTML=%%f
)
if defined LATEST_HTML (
    echo [done] Opening HTML dashboard: %LATEST_HTML%
    start "" "output\%LATEST_HTML%"
)
pause
endlocal
