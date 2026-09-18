@echo off
title Stop Kyvex Local Bot and Free PC Resources
powershell -ExecutionPolicy Bypass -File "%~dp0remove-startup.ps1"
pause
