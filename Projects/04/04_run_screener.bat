@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPORTS_DIR=%SCRIPT_DIR%Reports"
set "ENV_FILE=%SCRIPT_DIR%.env"
set "ENV_EXAMPLE=%SCRIPT_DIR%.env.example"
set "PY_SCRIPT=%SCRIPT_DIR%run_screener.py"
set "REQUIREMENTS=%SCRIPT_DIR%requirements.txt"

echo.
echo ============================================================
echo   Screener.in Multibagger Scan Runner
echo ============================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install from https://python.org and add to PATH.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [INFO] Using %%v

:: Check .env exists
if not exist "%ENV_FILE%" (
    echo.
    echo [SETUP] .env file not found. Creating from template...
    copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
    echo.
    echo  ACTION REQUIRED:
    echo   1. Open Chrome and log in to https://www.screener.in
    echo   2. Press F12 -^> Application -^> Cookies
    echo   3. Find the "sessionid" row and copy the Value
    echo   4. Paste into .env after SCREENER_SESSION_ID=
    echo.
    start notepad "%ENV_FILE%"
    pause
    exit /b 0
)

:: Check placeholder not still there
findstr /C:"paste_your_sessionid" "%ENV_FILE%" >nul 2>&1
if not errorlevel 1 (
    echo [ERROR] .env still has the placeholder session ID.
    echo.
    echo  Steps to fix:
    echo   1. Log in to https://www.screener.in in Chrome/Edge
    echo   2. F12 -^> Application -^> Cookies
    echo   3. Copy the Value of the "sessionid" cookie
    echo   4. Paste into .env after SCREENER_SESSION_ID=
    echo.
    start notepad "%ENV_FILE%"
    pause
    exit /b 1
)

:: Install dependencies
echo [INFO] Checking Python dependencies...
python -m pip install -q -r "%REQUIREMENTS%"
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo [OK] Dependencies ready.
echo.

:: Create Reports folder
if not exist "%REPORTS_DIR%" mkdir "%REPORTS_DIR%"

:: Run the screener
echo [INFO] Output folder: %REPORTS_DIR%
echo.
python -X utf8 "%PY_SCRIPT%"

if errorlevel 1 (
    echo.
    echo [ERROR] Script exited with errors. See output above.
    echo.
    echo  If you see "Session expired":
    echo   1. Log in to https://www.screener.in in Chrome/Edge
    echo   2. F12 -^> Application -^> Cookies -^> copy "sessionid" Value
    echo   3. Update SCREENER_SESSION_ID in .env
    echo.
    pause
    exit /b 1
)

echo [INFO] Opening Reports folder...
explorer "%REPORTS_DIR%"

endlocal
pause
