@echo off
echo ============================================
echo      MominAI Hybrid Sandbox - Simple Start
echo ============================================
echo.
echo Starting server with local Node.js...
echo.

cd /d "%~dp0"

REM Use full path to node.exe
set NODE_EXE=%~dp0node-v22.19.0-win-x64\node.exe
set NPM_CMD=%~dp0node-v22.19.0-win-x64\npm.cmd

echo Using Node.js: %NODE_EXE%
echo Using npm: %NPM_CMD%
echo.

if exist "%NODE_EXE%" (
    echo ✓ Node.js found at: %NODE_EXE%
    echo Starting Next.js development server...
    echo.

    REM Start the server directly
    "%NODE_EXE%" "%~dp0node-v22.19.0-win-x64\node_modules\npm\bin\npm-cli.js" run dev -- -p 3001

) else (
    echo ❌ Node.js not found at expected location
    echo Expected: %NODE_EXE%
    echo.
    echo Please check your Node.js installation.
    echo.
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to start server.
    echo Error code: %errorlevel%
    echo.
    echo Troubleshooting:
    echo 1. Check if all files are in the correct location
    echo 2. Try running as Administrator
    echo 3. Check antivirus/firewall settings
    echo.
) else (
    echo.
    echo ✓ Server should be running!
    echo Visit: http://localhost:3001
    echo.
)

echo Press any key to close...
pause >nul