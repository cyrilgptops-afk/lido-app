# =============================================================================
# Lido Connect - Rasa NLP Setup (no Docker required)
# Run once: .\setup.ps1
# Then start the server: .\start.ps1
# =============================================================================
#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$RasaDir   = $PSScriptRoot
$VenvDir   = Join-Path $RasaDir ".venv"
$PythonExe = $null

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Lido Connect - Rasa NLP Setup"        -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Find a compatible Python (3.8 - 3.10) ---------------------------
# Rasa 3.x requires Python >= 3.8 and < 3.11
#
# Windows App Execution Aliases (the Microsoft Store stubs) intercept bare
# "python" / "python3" commands even when a real install exists.
# We probe known install directories FIRST, then fall back to PATH commands.

$knownDirs = @(
  "${env:LOCALAPPDATA}\Programs\Python\Python310",
  "${env:LOCALAPPDATA}\Programs\Python\Python39",
  "${env:LOCALAPPDATA}\Programs\Python\Python38",
  "C:\Python310",
  "C:\Python39",
  "C:\Python38"
)

foreach ($dir in $knownDirs) {
  $exe = Join-Path $dir "python.exe"
  if (Test-Path $exe) {
    try {
      $ver = & $exe --version 2>&1
      if ($ver -match "3\.(8|9|10)") {
        $PythonExe = $exe

        # Ensure this Python and its Scripts folder are on the current-session PATH
        $scripts = Join-Path $dir "Scripts"
        if ($env:PATH -notlike "*$dir*") { $env:PATH = "$dir;$scripts;$env:PATH" }

        # Persist to user PATH so future terminals work without running setup.ps1
        $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
        $toAdd = @($dir, $scripts) | Where-Object { $userPath -notlike "*$_*" }
        if ($toAdd.Count -gt 0) {
          $updated = ($userPath.TrimEnd(";") + ";" + ($toAdd -join ";")).TrimStart(";")
          [System.Environment]::SetEnvironmentVariable("PATH", $updated, "User")
          Write-Host "[OK] Added Python to user PATH (takes effect in new terminals)" -ForegroundColor DarkGray
        }

        Write-Host "[OK] Found $ver" -ForegroundColor Green
        Write-Host "     $exe" -ForegroundColor DarkGray
        break
      }
    } catch {}
  }
}

# Fall back to PATH-resolved commands (in case Python is installed elsewhere)
if (-not $PythonExe) {
  $candidates = @("py", "python3.10", "python3.9", "python3.8", "python3", "python")
  foreach ($cmd in $candidates) {
    try {
      $ver = & $cmd --version 2>&1
      if ($ver -match "3\.(8|9|10)(\.\d+)?") {
        $PythonExe = $cmd
        Write-Host "[OK] Found $ver ($cmd)" -ForegroundColor Green
        break
      }
    } catch {}
  }
}

if (-not $PythonExe) {
  Write-Host ""
  Write-Host "[...] Python 3.10 not found - installing via winget..." -ForegroundColor Yellow
  try {
    winget install --id Python.Python.3.10 --source winget --silent --accept-package-agreements --accept-source-agreements
  } catch {
    Write-Host "[ERR] winget install failed. Please install Python 3.10 manually:" -ForegroundColor Red
    Write-Host "      https://www.python.org/downloads/release/python-31011/" -ForegroundColor Yellow
    Write-Host "      Tick 'Add Python to PATH' during install, then rerun .\setup.ps1" -ForegroundColor Yellow
    exit 1
  }
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
              [System.Environment]::GetEnvironmentVariable("PATH","User")
  $PythonExe = "python"
}

Write-Host ""
Write-Host "[TIP] If 'python' still opens the Microsoft Store in new terminals:" -ForegroundColor DarkGray
Write-Host "      Settings -> Apps -> Advanced app settings -> App execution aliases" -ForegroundColor DarkGray
Write-Host "      Toggle OFF: python.exe  and  python3.exe" -ForegroundColor DarkGray
Write-Host ""

# --- Step 2: Create virtual environment --------------------------------------
if (Test-Path $VenvDir) {
  Write-Host "[OK] Virtual environment already exists - skipping create" -ForegroundColor Green
} else {
  Write-Host "[...] Creating virtual environment at $VenvDir ..." -ForegroundColor Yellow
  & $PythonExe -m venv $VenvDir
  Write-Host "[OK] Virtual environment created" -ForegroundColor Green
}

# --- Step 3: Activate --------------------------------------------------------
$Activate = Join-Path $VenvDir "Scripts\Activate.ps1"
if (-not (Test-Path $Activate)) {
  Write-Host "[ERR] Could not find activation script at $Activate" -ForegroundColor Red
  exit 1
}
. $Activate
Write-Host "[OK] Virtual environment activated" -ForegroundColor Green

# --- Step 4: Upgrade pip -----------------------------------------------------
Write-Host ""
Write-Host "[...] Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet

# --- Step 5: Install Rasa ----------------------------------------------------
Write-Host ""
Write-Host "[...] Installing Rasa 3.6.x (this takes 3-10 minutes the first time)..." -ForegroundColor Yellow
Write-Host "      Sit back - Rasa pulls in TensorFlow, spaCy and friends." -ForegroundColor DarkGray
pip install "rasa==3.6.21"

# --- Step 6: Train model -----------------------------------------------------
Write-Host ""
Write-Host "[...] Training NLP model..." -ForegroundColor Yellow
Set-Location $RasaDir
rasa train

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  [OK] Setup complete!"                 -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the NLP server:  .\start.ps1" -ForegroundColor White
Write-Host "  2. Start the API:         cd ..\apps\api ; npm run dev" -ForegroundColor White
Write-Host ""