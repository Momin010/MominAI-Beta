@echo off
echo ============================================
echo   MominAI Hybrid Sandbox - Direct Start
echo ============================================
echo.
echo Bypassing npm, running Next.js directly...
echo.

cd /d "%~dp0"

REM Direct Next.js execution
echo Starting Next.js development server on port 3001...
echo.
echo If this works, you'll see:
echo - ready started server on 0.0.0.0:3001
echo - event compiled successfully
echo.

node-v22.19.0-win-x64\node.exe node_modules\.bin\next dev -p 3001

if %errorlevel% neq 0 (
    echo.
    echo ❌ Direct start failed.
    echo Error code: %errorlevel%
    echo.
    echo Trying alternative approach...
    echo.
    node-v22.19.0-win-x64\node.exe node_modules\next\dist\bin\next dev -p 3001
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ All direct start attempts failed.
    echo.
    echo Please try the manual commands in MANUAL_START.txt
    echo.
) else (
    echo.
    echo ✓ Server appears to be running!
    echo Visit: http://localhost:3001
    echo.
)

echo Press any key to close...
pause >nul