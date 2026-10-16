Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'start-local-dev.ps1'
$content = Get-Content -LiteralPath $scriptPath -Raw
$infraScriptPath = Join-Path $PSScriptRoot 'start-local-infra.ps1'
$infraContent = Get-Content -LiteralPath $infraScriptPath -Raw
$doctorScriptPath = Join-Path $PSScriptRoot 'dev-doctor.ps1'
$doctorContent = Get-Content -LiteralPath $doctorScriptPath -Raw

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

if ($infraContent -match 'Get-FirstFreePort') {
  throw 'A infra local nao deve escolher porta dinamica; use portas fixas do Jornada.'
}

if ($infraContent -notmatch '\$PostgresPort = 55432') {
  throw 'A infra local deve fixar PostgreSQL em 55432.'
}

if ($infraContent -notmatch '\$RedisPort = 56379') {
  throw 'A infra local deve fixar Redis em 56379.'
}

if ($infraContent -notmatch 'Remove-JornadaInfraContainer -Name ''jornada-postgres''') {
  throw 'A infra local deve recriar o container jornada-postgres de forma controlada.'
}

if ($infraContent -notmatch 'Remove-JornadaInfraContainer -Name ''jornada-redis''') {
  throw 'A infra local deve recriar o container jornada-redis de forma controlada.'
}

if ($infraContent -notmatch 'nao parece ser da infra Jornada') {
  throw 'A infra local deve bloquear porta ocupada por processo externo.'
}

if ($doctorContent -notmatch 'jornada-postgres') {
  throw 'O dev doctor deve validar o container PostgreSQL do Jornada.'
}

if ($doctorContent -notmatch 'jornada-redis') {
  throw 'O dev doctor deve validar o container Redis do Jornada.'
}

if ($doctorContent -notmatch 'api/health') {
  throw 'O dev doctor deve validar ou reportar o health check da API.'
}

Write-Host 'Start-local dev health check: ok'
