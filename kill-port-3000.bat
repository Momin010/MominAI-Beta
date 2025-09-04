@echo off
echo ============================================
echo        Port 3000 Process Killer
echo ============================================
echo.
echo Finding process using port 3000...
echo.

REM Find the process using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    set PID=%%a
    goto :found
)

echo No process found using port 3000.
echo The port might already be free.
echo.
pause
exit /b 0

:found
echo Found process with PID: %PID%
echo.

REM Get process name
for /f "tokens=1" %%b in ('tasklist /FI "PID eq %PID%" /FO TABLE /NH') do (
    set PROCESS_NAME=%%b
    goto :kill
)

:kill
echo Process Name: %PROCESS_NAME%
echo.
set /p choice="Do you want to kill this process? (y/n): "

if /i "%choice%"=="y" (
    echo.
    echo Killing process %PID% (%PROCESS_NAME%)...
    taskkill /PID %PID% /F
    if %errorlevel%==0 (
        echo ✓ Process killed successfully!
        echo Port 3000 should now be free.
    ) else (
        echo ❌ Failed to kill process.
        echo You may need to run this as Administrator.
    )
) else (
    echo Process not killed.
    echo You can manually kill it or use a different port.
)

echo.
echo Alternative: Use start-dev-alt-port.bat to run on port 3001
echo.
pause