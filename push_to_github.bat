@echo off
chcp 65001 >nul
title 舒尔特方格 - 推送到 GitHub

echo ==========================================================
echo   正在自动读取 F:\code\taken.txt 并推送到 GitHub...
echo ==========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0push_to_github.ps1"

pause
