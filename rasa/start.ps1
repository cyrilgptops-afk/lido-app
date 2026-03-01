# =============================================================================
# Lido Connect — Start Rasa NLP server (no Docker)
# Prerequisite: run .\setup.ps1 first
# =============================================================================
#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$RasaDir  = $PSScriptRoot
$VenvDir  = Join-Path $RasaDir ".venv"
$Activate = Join-Path $VenvDir "Scripts\Activate.ps1"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Lido Connect — Rasa NLP Server"       -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# ── Sanity checks ─────────────────────────────────────────────────────────────
if (-not (Test-Path $Activate)) {
  Write-Host "❌ Virtual environment not found." -ForegroundColor Red
  Write-Host "   Run .\setup.ps1 first." -ForegroundColor Yellow
  exit 1
}

. $Activate
Set-Location $RasaDir

# Check that at least one trained model exists
$models = Get-ChildItem -Path (Join-Path $RasaDir "models") -Filter "*.tar.gz" -ErrorAction SilentlyContinue
if (-not $models) {
  Write-Host "⚠️  No trained model found — training now..." -ForegroundColor Yellow
  rasa train
}

# ── Resolve token from env (set RASA_TOKEN in your .env or shell before running) ──
$token = $env:RASA_TOKEN

Write-Host "🚀 Starting Rasa on http://localhost:5005" -ForegroundColor Green
if ($token) {
  Write-Host "🔐 Token authentication enabled" -ForegroundColor DarkGray
  rasa run --enable-api --cors "*" --port 5005 --auth-token $token --debug
} else {
  Write-Host "⚠️  No RASA_TOKEN set — running without authentication (dev mode)" -ForegroundColor Yellow
  rasa run --enable-api --cors "*" --port 5005 --debug
}
