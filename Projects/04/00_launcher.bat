@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"

:MENU
cls
echo.
echo  ============================================================
echo   Jijo's Stock Screener Suite  --  Main Launcher
echo  ============================================================
echo.
echo   [1]  Run Multibagger Screener       (run_screener.py)
echo   [2]  Run Swing + Positional Scans   (swing_screener.py)
echo   [3]  Run High Conviction Strategy   (strategy_scanner.py)
echo.
echo   [4]  Open Reports Folder
echo   [5]  Exit
echo.
echo  ============================================================
set /p CHOICE=  Select option (1-5):

if "%CHOICE%"=="1" goto RUN_SCREENER
if "%CHOICE%"=="2" goto RUN_SWING
if "%CHOICE%"=="3" goto RUN_STRATEGY
if "%CHOICE%"=="4" goto OPEN_REPORTS
if "%CHOICE%"=="5" goto EXIT

echo  [!] Invalid choice. Try again.
timeout /t 1 >nul
goto MENU

:RUN_SCREENER
cls
echo  [INFO] Launching Multibagger Screener...
call "%SCRIPT_DIR%04_run_screener.bat"
goto MENU

:RUN_SWING
cls
echo  [INFO] Launching Swing Screener...
call "%SCRIPT_DIR%04_run_swing.bat"
goto MENU

:RUN_STRATEGY
cls
echo  [INFO] Launching High Conviction Strategy Scanner...
call "%SCRIPT_DIR%04_run_strategy.bat"
goto MENU

:OPEN_REPORTS
if exist "%SCRIPT_DIR%Reports" (
    explorer "%SCRIPT_DIR%Reports"
) else (
    echo  [!] Reports folder not found. Run a scan first.
    pause
)
goto MENU

:EXIT
endlocal
exit /b 0
