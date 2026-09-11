Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'start-local-dev.ps1'
$content = Get-Content -LiteralPath $scriptPath -Raw

if ($content -notmatch '\$apiHealthy = \$false') {
  throw 'O orquestrador precisa registrar o sucesso do health check.'
}

if ($content -notmatch '\$apiHealthy = \$true') {
  throw 'O health check bem-sucedido precisa marcar a API como pronta.'
}

if ($content -notmatch 'if \(-not \$apiHealthy\)') {
  throw 'O timeout deve depender da ausencia de sucesso, nao apenas do relogio.'
}

if ($content -notmatch 'AddSeconds\(180\)') {
  throw 'O cold start da API deve ter uma janela de 180 segundos.'
}

if ($content -notmatch 'Get-LocalPortOwners') {
  throw 'O orquestrador precisa detectar os donos das portas de desenvolvimento ja ocupadas.'
}

if ($content -notmatch 'Stop-JornadaLocalPort -Port 3004') {
  throw 'O orquestrador precisa reiniciar automaticamente a API local antiga.'
}

if ($content -notmatch 'Stop-JornadaLocalPort -Port 3006') {
  throw 'O orquestrador precisa reiniciar automaticamente o Neo local antigo.'
}

if ($content -notmatch 'nao parece ser deste repo') {
  throw 'O orquestrador deve bloquear portas ocupadas por processos externos ao repo.'
}

if ($content -notmatch 'node\\s\+dist/src/main\\\.js') {
  throw 'O orquestrador precisa reconhecer a API start:prod local na porta 3004.'
}

Write-Host 'Start-local dev health check: ok'
