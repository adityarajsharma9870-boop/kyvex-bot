@echo off
title Kyvex Discord Bot ^& Web 24/7
cd /d "%~dp0"
echo ========================================================
echo         KYVEX DISCORD BOT & DASHBOARD 24/7 LAUNCHER     
echo ========================================================
:loop
echo [%date% %time%] Starting Kyvex Engine with 2GB High Performance Buffer...
node --max-old-space-size=2048 src/index.js
echo.
echo [%date% %time%] Warning: Bot stopped or restarted. Re-launching in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
