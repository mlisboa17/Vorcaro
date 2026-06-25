Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  VORCARO GIT COMMIT & PUSH UTILITY (PS)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Remover arquivos de ambiente do index do Git (evitar leak de secrets)
Write-Host "`n[1/3] Removendo .env e .env.local do index (prevent leak)..." -ForegroundColor Yellow
git rm --cached .env 2>$null
git rm --cached .env.local 2>$null

# 2. Adicionar e commitar
Write-Host "`n[2/3] Adicionando arquivos e realizando commit..." -ForegroundColor Yellow
git add .
git commit -m "refactor: bulk approve idempotency, route protection, telegram webhook async processing and local env loaders"

# 3. Push para o GitHub
Write-Host "`n[3/3] Enviando alterações para o GitHub (branch main)..." -ForegroundColor Green
git push origin main

Write-Host "`nProcesso concluído com sucesso!" -ForegroundColor Green
