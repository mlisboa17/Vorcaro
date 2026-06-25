@echo off
title Vorcaro Dev Launcher
echo ==============================================
echo   VORCARO DEV ENVIRONMENT AUTO-START SCRIPT
echo ==============================================

echo.
echo [1/4] Iniciando containers Docker (Postgres ^& Redis)...
docker compose up -d

echo.
echo Aguardando 5 segundos para inicializacao dos bancos...
timeout /t 5 /nobreak > nul

echo.
echo [2/4] Sincronizando o esquema do banco de dados (Prisma DB Push)...
call npx prisma db push

echo.
echo [3/4] Semeando o banco de dados local com dados iniciais...
call npx prisma db seed

echo.
echo [4/4] Iniciando o servidor local Next.js na porta 3000...
call npm run dev
pause
