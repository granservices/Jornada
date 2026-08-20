param(
  [int]$StartPort = 5434,
  [int]$MaxPort = 5450
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$rootEnvPath = Join-Path $repoRoot '.env'
$rootEnvExamplePath = Join-Path $repoRoot '.env.example'
$apiEnvPath = Join-Path $repoRoot 'apps/api/.env'
$apiEnvExamplePath = Join-Path $repoRoot 'apps/api/.env.example'

function Ensure-EnvFile {
  param(
    [string]$TargetPath,
    [string]$ExamplePath
  )

  if (-not (Test-Path -LiteralPath $TargetPath)) {
    Copy-Item -LiteralPath $ExamplePath -Destination $TargetPath
  }
}

function Get-FirstFreePort {
  param(
    [int]$InitialPort,
    [int]$FinalPort
  )

  for ($port = $InitialPort; $port -le $FinalPort; $port++) {
    $inUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $inUse) {
      return $port
    }
  }

  throw "Nenhuma porta livre encontrada entre $InitialPort e $FinalPort."
}

function Get-ExistingJornadaPort {
  $dockerOutput = docker ps --format "{{.Names}}|{{.Ports}}" 2>$null
  if (-not $dockerOutput) {
    return $null
  }

  $line = $dockerOutput | Where-Object { $_ -like 'jornada-postgres|*' } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  if ($line -match '0\.0\.0\.0:(\d+)->5432') {
    return [int]$Matches[1]
  }

  return $null
}

function Set-OrAppendEnvValue {
  param(
    [string]$FilePath,
    [string]$Key,
    [string]$Value
  )

  $escapedKey = [regex]::Escape($Key)
  $content = Get-Content -LiteralPath $FilePath -Raw

  if ($content -match "(?m)^$escapedKey=") {
    $updated = [regex]::Replace($content, "(?m)^$escapedKey=.*$", "$Key=$Value")
  }
  else {
    $separator = if ($content.EndsWith("`n")) { '' } else { [Environment]::NewLine }
    $updated = "$content$separator$Key=$Value$([Environment]::NewLine)"
  }

  Set-Content -LiteralPath $FilePath -Value $updated
}

function Update-ApiDatabaseUrl {
  param(
    [string]$FilePath,
    [int]$Port
  )

  $content = Get-Content -LiteralPath $FilePath -Raw
  $fullValue = "postgresql://jornada:jornada@localhost:$Port/jornada?schema=public"

  if ($content -match '(?m)^DATABASE_URL=') {
    $updated = [regex]::Replace($content, '(?m)^DATABASE_URL=.*$', "DATABASE_URL=$fullValue")
  }
  else {
    $separator = if ($content.EndsWith("`n")) { '' } else { [Environment]::NewLine }
    $updated = "$content$separator" + "DATABASE_URL=$fullValue" + [Environment]::NewLine
  }

  Set-Content -LiteralPath $FilePath -Value $updated
}

Ensure-EnvFile -TargetPath $rootEnvPath -ExamplePath $rootEnvExamplePath
Ensure-EnvFile -TargetPath $apiEnvPath -ExamplePath $apiEnvExamplePath

$selectedPort = Get-ExistingJornadaPort
if (-not $selectedPort) {
  $selectedPort = Get-FirstFreePort -InitialPort $StartPort -FinalPort $MaxPort
}

Set-OrAppendEnvValue -FilePath $rootEnvPath -Key 'JORNADA_POSTGRES_PORT' -Value $selectedPort
Update-ApiDatabaseUrl -FilePath $apiEnvPath -Port $selectedPort

Write-Host "Usando porta PostgreSQL local: $selectedPort"
docker compose up -d --force-recreate postgres redis

Write-Host "Infra local pronta."
Write-Host "DATABASE_URL atualizado para localhost:$selectedPort em apps/api/.env"
