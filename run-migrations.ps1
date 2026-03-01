# Run all pending Lido database migrations
# Usage: .\run-migrations.ps1

Write-Host "=== Lido Database Migration Runner ===" -ForegroundColor Cyan
Write-Host ""

# Find MySQL executable
$possiblePaths = @(
    "D:\Tools\xamp73\mysql\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
)

$mysqlPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $mysqlPath = $path
        Write-Host "✓ Found MySQL at: $mysqlPath" -ForegroundColor Green
        break
    }
}

if (-not $mysqlPath) {
    Write-Host "✗ MySQL executable not found in common locations." -ForegroundColor Red
    Write-Host "  Please provide the full path to mysql.exe" -ForegroundColor Yellow
    $mysqlPath = Read-Host "MySQL path"
    
    if (-not (Test-Path $mysqlPath)) {
        Write-Host "✗ Invalid path. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
$password = Read-Host "Enter MySQL root password" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "Running migrations..." -ForegroundColor Cyan

# Migration files
$migrations = @(
    "apps/api/db/migrations/013_create_bot_scripts_schema.sql",
    "apps/api/db/migrations/014_bot_script_versioning.sql"
)

foreach ($migration in $migrations) {
    $fileName = Split-Path $migration -Leaf
    
    if (-not (Test-Path $migration)) {
        Write-Host "  ✗ $fileName - File not found" -ForegroundColor Red
        continue
    }
    
    Write-Host "  -> Running $fileName..." -ForegroundColor Yellow
    
    try {
        $sql = Get-Content $migration -Raw
        $sql | & $mysqlPath -u root -p"$plainPassword" lido_dev 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $fileName - Success" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $fileName - Failed (Exit code: $LASTEXITCODE)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ $fileName - Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Migration process complete!" -ForegroundColor Cyan
