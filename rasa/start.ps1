# =============================================================================
# Lido Connect - Start Rasa NLP Server
# Run: .\start.ps1
# =============================================================================
#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$RasaDir = $PSScriptRoot
$VenvDir = Join-Path $RasaDir ".venv"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Lido Connect - Rasa NLP Server"       -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Activate virtual environment
$Activate = Join-Path $VenvDir "Scripts\Activate.ps1"
if (-not (Test-Path $Activate)) {
  Write-Host "[ERR] Virtual environment not found. Run .\setup.ps1 first." -ForegroundColor Red
  exit 1
}
. $Activate
Write-Host "[OK] Virtual environment activated" -ForegroundColor Green

# Train if no model exists
$ModelsDir = Join-Path $RasaDir "models"
$HasModel  = (Test-Path $ModelsDir) -and ((Get-ChildItem $ModelsDir -Filter "*.tar.gz" -ErrorAction SilentlyContinue).Count -gt 0)
if (-not $HasModel) {
  Write-Host "[...] No model found - training first..." -ForegroundColor Yellow
  Set-Location $RasaDir
  rasa train
}

# Start Rasa server
Write-Host ""
Write-Host "[...] Starting Rasa server on http://localhost:5005 ..." -ForegroundColor Yellow
Write-Host "      Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""
Set-Location $RasaDir
rasa run --enable-api --cors "*" --port 5005