Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$rootEnvPath = Join-Path $repoRoot '.env'
$apiEnvPath = Join-Path $repoRoot 'apps/api/.env'

$expectedPostgresPort = 55432
$expectedRedisPort = 56379
$expectedDatabaseUrl = "postgresql://jornada:jornada@localhost:$expectedPostgresPort/jornada?schema=public"
$expectedRedisUrl = "redis://localhost:$expectedRedisPort"

function Write-Check {
  param(
    [string]$Label,
    [bool]$Ok,
    [string]$Detail = ''
  )

  $status = if ($Ok) { 'ok' } else { 'falhou' }
  $message = "[$status] $Label"
  if ($Detail) {
    $message = "$message - $Detail"
  }

  Write-Host $message
}

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return $null
  }

  $escapedKey = [regex]::Escape($Key)
  $line = Get-Content -LiteralPath $FilePath | Where-Object { $_ -match "^$escapedKey=" } | Select-Object -Last 1
  if (-not $line) {
    return $null
  }

  return ($line -split '=', 2)[1]
}

function Assert-Check {
  param(
    [string]$Label,
    [bool]$Condition,
    [string]$FailureDetail
  )

  Write-Check -Label $Label -Ok $Condition -Detail $(if ($Condition) { '' } else { $FailureDetail })
  if (-not $Condition) {
    throw $FailureDetail
  }
}

docker info *> $null
Assert-Check -Label 'Docker engine' -Condition ($LASTEXITCODE -eq 0) -FailureDetail 'Docker Desktop nao esta disponivel.'

$containers = @(docker ps --format "{{.Names}}|{{.Status}}|{{.Ports}}")
$postgresLine = $containers | Where-Object { $_ -like 'jornada-postgres|*' } | Select-Object -First 1
$redisLine = $containers | Where-Object { $_ -like 'jornada-redis|*' } | Select-Object -First 1

Assert-Check -Label 'Container jornada-postgres' -Condition ($null -ne $postgresLine) -FailureDetail 'Execute npm run infra:up.'
Assert-Check -Label 'Container jornada-redis' -Condition ($null -ne $redisLine) -FailureDetail 'Execute npm run infra:up.'
Assert-Check -Label "PostgreSQL na porta $expectedPostgresPort" -Condition ($postgresLine -match ":$expectedPostgresPort->5432") -FailureDetail "jornada-postgres nao esta publicado em localhost:$expectedPostgresPort."
Assert-Check -Label "Redis na porta $expectedRedisPort" -Condition ($redisLine -match ":$expectedRedisPort->6379") -FailureDetail "jornada-redis nao esta publicado em localhost:$expectedRedisPort."

$rootPostgresPort = Get-EnvValue -FilePath $rootEnvPath -Key 'JORNADA_POSTGRES_PORT'
$rootRedisPort = Get-EnvValue -FilePath $rootEnvPath -Key 'JORNADA_REDIS_PORT'
$apiDatabaseUrl = Get-EnvValue -FilePath $apiEnvPath -Key 'DATABASE_URL'
$apiRedisUrl = Get-EnvValue -FilePath $apiEnvPath -Key 'REDIS_URL'

Assert-Check -Label '.env JORNADA_POSTGRES_PORT' -Condition ($rootPostgresPort -eq "$expectedPostgresPort") -FailureDetail "Esperado $expectedPostgresPort, encontrado '$rootPostgresPort'."
Assert-Check -Label '.env JORNADA_REDIS_PORT' -Condition ($rootRedisPort -eq "$expectedRedisPort") -FailureDetail "Esperado $expectedRedisPort, encontrado '$rootRedisPort'."
Assert-Check -Label 'apps/api/.env DATABASE_URL' -Condition ($apiDatabaseUrl -eq $expectedDatabaseUrl) -FailureDetail 'DATABASE_URL local nao aponta para o Postgres fixo do Jornada.'
Assert-Check -Label 'apps/api/.env REDIS_URL' -Condition ($apiRedisUrl -eq $expectedRedisUrl) -FailureDetail 'REDIS_URL local nao aponta para o Redis fixo do Jornada.'

$apiHealthOk = $false
try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3004/api/health' -TimeoutSec 2
  $apiHealthOk = $response.StatusCode -eq 200
}
catch {
  $apiHealthOk = $false
}

Write-Check -Label 'API health local' -Ok $apiHealthOk -Detail $(if ($apiHealthOk) { 'http://localhost:3004/api/health' } else { 'API ainda nao esta rodando; use npm run dev ou npm run dev:api.' })

Write-Host 'Dev doctor concluido.'
