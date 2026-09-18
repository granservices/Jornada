Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

function Get-LocalPortOwners {
  param([int]$Port)

  return @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique)
}

function Get-ProcessCommandLine {
  param([int]$ProcessId)

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    return ''
  }

  return [string]$process.CommandLine
}

function Test-JornadaLocalProcess {
  param(
    [int]$ProcessId,
    [int]$Port
  )

  $commandLine = Get-ProcessCommandLine -ProcessId $ProcessId
  if ($commandLine -like "*$repoRoot*") {
    return $true
  }

  if ($Port -eq 3004 -and $commandLine -match 'node\s+dist/src/main\.js') {
    return $true
  }

  return $false
}

function Stop-JornadaLocalPort {
  param(
    [int]$Port,
    [string]$Label
  )

  $owners = @(Get-LocalPortOwners -Port $Port)
  if ($owners.Count -eq 0) {
    return
  }

  foreach ($owner in $owners) {
    if (-not (Test-JornadaLocalProcess -ProcessId $owner -Port $Port)) {
      $commandLine = Get-ProcessCommandLine -ProcessId $owner
      throw "A porta $Port ($Label) esta ocupada pelo processo $owner, que nao parece ser deste repo. Comando: $commandLine"
    }
  }

  foreach ($owner in $owners) {
    Write-Host "Reiniciando $Label local na porta $Port (PID $owner)..."
    taskkill.exe /PID $owner /T /F | Out-Null
  }
}

function Stop-JornadaStrayFrontendProcesses {
  $processes = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -like "*$repoRoot*" -and
      $_.CommandLine -match 'vite[\\/]bin[\\/]vite\.js'
    })

  foreach ($process in $processes) {
    Write-Host "Reiniciando Neo local antigo (PID $($process.ProcessId))..."
    taskkill.exe /PID $process.ProcessId /T /F | Out-Null
  }
}

Stop-JornadaLocalPort -Port 3004 -Label 'API'
Stop-JornadaLocalPort -Port 3006 -Label 'Neo'
Stop-JornadaStrayFrontendProcesses

& (Join-Path $PSScriptRoot 'start-local-infra.ps1')

$apiStart = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev:api' -WorkingDirectory $repoRoot -NoNewWindow -PassThru

try {
  $healthUrl = 'http://localhost:3004/api/health'
  $deadline = (Get-Date).AddSeconds(180)
  $apiHealthy = $false

  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2 | Out-Null
      $apiHealthy = $true
      break
    }
    catch {
      Start-Sleep -Milliseconds 500
    }
  }

  if (-not $apiHealthy) {
    throw 'A API nao respondeu ao health check em 180 segundos.'
  }

  Write-Host 'API pronta em http://localhost:3004/api/health'
  Write-Host 'Neo disponivel em http://localhost:3006'
  & npm.cmd run dev:jornada
}
finally {
  if (-not $apiStart.HasExited) {
    taskkill.exe /PID $apiStart.Id /T /F | Out-Null
  }
}
