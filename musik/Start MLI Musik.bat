@echo off
echo ============================================
echo   MLI Musik App — Lokal Server
echo ============================================
echo.
echo Starter lokal webserver paa port 8080...
echo Aabner browseren om 2 sekunder...
echo.
echo Tryk Ctrl+C for at stoppe serveren.
echo ============================================
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

:: Start Python HTTP server in the musik directory
cd /d "%~dp0"
python -m http.server 8080
