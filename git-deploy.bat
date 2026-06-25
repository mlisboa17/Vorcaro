@echo off
title Vorcaro Git Deploy
echo ==============================================
echo   VORCARO GIT COMMIT ^& PUSH UTILITY
echo ==============================================

echo.
echo [1/3] Removendo arquivos de ambiente do index do Git (evitar leak)...
call git rm --cached .env 2>nul
call git rm --cached .env.local 2>nul

echo.
echo [2/3] Adicionando arquivos e realizando commit...
call git add .
call git commit -m "refactor: bulk approve idempotency, route protection, telegram webhook async processing and local env loaders"

echo.
echo [3/3] Enviando alteracoes para o GitHub (branch main)...
call git push origin main

echo.
echo Processo concluido!
pause
