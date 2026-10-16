param(
  [int]$PostgresPort = 55432,
  [int]$RedisPort = 56379
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

function Get-ProcessCommandLine {
  param([int]$ProcessId)

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    return ''
  }

  return [string]$process.CommandLine
}

function Get-DockerContainersPublishingPort {
  param([int]$Port)

  $lines = @(docker ps -a --format "{{.Names}}|{{.Ports}}" 2>$null)
  return @($lines | Where-Object { $_ -match "[:.]$Port->" })
}

function Assert-PortIsSafeForJornadaInfra {
  param(
    [int]$Port,
    [string]$Label,
    [string[]]$AllowedContainerNames
  )

  foreach ($line in Get-DockerContainersPublishingPort -Port $Port) {
    $name = ($line -split '\|', 2)[0]
    if ($AllowedContainerNames -notcontains $name) {
      throw "A porta $Port ($Label) esta publicada pelo container externo '$name'. Pare esse container ou ajuste o ambiente antes de subir o Jornada."
    }
  }

  $owners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique)

  if ($owners.Count -eq 0) {
    return
  }

  $publishedByAllowedContainer = @(Get-DockerContainersPublishingPort -Port $Port |
    Where-Object {
      $name = ($_ -split '\|', 2)[0]
      $AllowedContainerNames -contains $name
    }).Count -gt 0

  if ($publishedByAllowedContainer) {
    return
  }

  foreach ($owner in $owners) {
    $commandLine = Get-ProcessCommandLine -ProcessId $owner
    throw "A porta $Port ($Label) esta ocupada pelo processo $owner, que nao parece ser da infra Jornada. Comando: $commandLine"
  }
}

function Remove-JornadaInfraContainer {
  param([string]$Name)

  $containerId = docker ps -a --filter "name=^/$Name$" --format "{{.ID}}" 2>$null
  if (-not $containerId) {
    return
  }

  Write-Host "Recriando container local $Name..."
  docker rm -f $Name | Out-Null
}

Ensure-EnvFile -TargetPath $rootEnvPath -ExamplePath $rootEnvExamplePath
Ensure-EnvFile -TargetPath $apiEnvPath -ExamplePath $apiEnvExamplePath

Assert-PortIsSafeForJornadaInfra -Port $PostgresPort -Label 'PostgreSQL Jornada' -AllowedContainerNames @('jornada-postgres')
Assert-PortIsSafeForJornadaInfra -Port $RedisPort -Label 'Redis Jornada' -AllowedContainerNames @('jornada-redis')

Remove-JornadaInfraContainer -Name 'jornada-postgres'
Remove-JornadaInfraContainer -Name 'jornada-redis'

Set-OrAppendEnvValue -FilePath $rootEnvPath -Key 'JORNADA_POSTGRES_PORT' -Value $PostgresPort
Set-OrAppendEnvValue -FilePath $rootEnvPath -Key 'JORNADA_REDIS_PORT' -Value $RedisPort
Set-OrAppendEnvValue -FilePath $apiEnvPath -Key 'NODE_ENV' -Value 'development'
Set-OrAppendEnvValue -FilePath $apiEnvPath -Key 'DATABASE_URL' -Value "postgresql://jornada:jornada@localhost:$PostgresPort/jornada?schema=public"
Set-OrAppendEnvValue -FilePath $apiEnvPath -Key 'REDIS_URL' -Value "redis://localhost:$RedisPort"

Write-Host "Usando portas locais fixas: PostgreSQL $PostgresPort, Redis $RedisPort"
docker compose up -d --force-recreate postgres redis

Write-Host 'Infra local pronta.'
Write-Host "DATABASE_URL atualizado para localhost:$PostgresPort em apps/api/.env"
Write-Host "REDIS_URL atualizado para localhost:$RedisPort em apps/api/.env"
