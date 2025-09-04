@echo off
echo ============================================
echo    MominAI Hybrid Sandbox Launcher
echo ============================================
echo.
echo Checking system requirements...
echo.

REM Check if port 3000 is available
netstat -an | find "3000" >nul 2>&1
if %errorlevel%==0 (
    echo WARNING: Port 3000 appears to be in use.
    echo Please close any other development servers first.
    echo.
    pause
    exit /b 1
)

REM Check if local Node.js exists
if exist "node-v22.19.0-win-x64\node.exe" (
    echo ✓ Local Node.js found (v22.19.0)
    echo Starting development server...
    echo.
    cd /d "%~dp0"
    "node-v22.19.0-win-x64\node.exe" "node-v22.19.0-win-x64\node_modules\npm\bin\npm-cli.js" run dev
) else (
    echo ! Local Node.js not found, trying system npm...
    echo Make sure Node.js and npm are installed globally.
    echo.
    cd /d "%~dp0"
    npm run dev
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to start the development server.
    echo Please check:
    echo - Node.js installation
    echo - npm packages (run: npm install)
    echo - Environment variables in .env.local
    echo - Port 3000 availability
    echo.
) else (
    echo.
    echo ✓ Server started successfully!
    echo Visit: http://localhost:3000
    echo.
)

echo Press any key to close this window...
pause >nul