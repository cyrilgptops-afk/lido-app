# =============================================================================
# Lido Connect — Re-train Rasa model (no Docker)
# Run after editing nlu.yml / domain.yml / stories.yml
# =============================================================================
#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$RasaDir  = $PSScriptRoot
$VenvDir  = Join-Path $RasaDir ".venv"
$Activate = Join-Path $VenvDir "Scripts\Activate.ps1"

if (-not (Test-Path $Activate)) {
  Write-Host "❌ Virtual environment not found. Run .\setup.ps1 first." -ForegroundColor Red
  exit 1
}

. $Activate
Set-Location $RasaDir

Write-Host "⚙️  Training Rasa NLP model..." -ForegroundColor Yellow
rasa train

Write-Host ""
Write-Host "✅ Training complete. Restart .\start.ps1 to load the new model." -ForegroundColor Green
