# Setup Execution Policy temporarily for this process
Set-ExecutionPolicy Bypass -Scope Process -Force

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "      Starting Legal-AI Assistant...         " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Start Backend
Write-Host "[*] Launching FastAPI Backend on Port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; if (Test-Path '..\.venv\Scripts\Activate.ps1') { ..\.venv\Scripts\Activate.ps1 } elseif (Test-Path '.\.venv\Scripts\Activate.ps1') { .\.venv\Scripts\Activate.ps1 }; uvicorn app.main:app --host 0.0.0.0 --port 8000"

# Start Frontend
Write-Host "[*] Launching React Vite Frontend on Port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`n[+] Servers are starting in new windows." -ForegroundColor Green
Write-Host "[+] Backend API: http://localhost:8000" -ForegroundColor Green
Write-Host "[+] Frontend UI: http://localhost:5173" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
