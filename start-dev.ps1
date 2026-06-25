Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  VORCARO DEV ENVIRONMENT AUTO-START SCRIPT" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Iniciar containers Docker
Write-Host "`n[1/4] Iniciando containers Docker (Postgres & Redis)..." -ForegroundColor Yellow
docker compose up -d

# Aguardar inicialização
Write-Host "Aguardando 5 segundos para inicialização dos bancos..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 2. Executar migração do Banco de Dados
Write-Host "`n[2/4] Sincronizando o esquema do banco de dados (Prisma DB Push)..." -ForegroundColor Yellow
npx prisma db push

# 3. Executar o Seeding do banco de dados
Write-Host "`n[3/4] Semeando o banco de dados local com dados iniciais..." -ForegroundColor Yellow
npx prisma db seed

# 4. Iniciar Next.js
Write-Host "`n[4/4] Iniciando o servidor local Next.js na porta 3000..." -ForegroundColor Green
npm run dev
