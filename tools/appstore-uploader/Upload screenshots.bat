@echo off
title Accessible Backrooms uploader
echo Accessible Backrooms: uploading screenshots to the App Store.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0upload.ps1"
echo.
echo Press any key to close this window.
pause >nul
