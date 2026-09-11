# Server Intake Map

Guia rapido para rastrear recebimentos no servidor de producao do Jornada sem procurar nos lugares errados.

## Servidor

- Host publico: `jornada.granhub.com.br`
- IP atual: `46.202.146.234`
- API exposta diretamente: `http://46.202.146.234:3004`
- API publica recomendada: `https://jornada.granhub.com.br`
- Container da API: `jornada-api`
- Hostname observado no servidor: `srv413106`
- Diretorio da aplicacao no servidor: `/opt/jornada-api`

### Acesso operacional

```bash
ssh root@46.202.146.234
cd /opt/jornada-api
```

Cheque rapido:

```bash
hostname
docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}' | grep jornada-api
curl -s http://127.0.0.1:3004/api/health
```

De fora do servidor:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri 'https://jornada.granhub.com.br/api/health'
Invoke-WebRequest -UseBasicParsing -Uri 'http://46.202.146.234:3004/api/health'
```

## Rotas publicadas

Rotas Drake esperadas:

- `POST /api/integrations/drake/employees`
- `POST /api/integrations/drake/expiring-requirements`
- `POST /api/integrations/drake/boarding-schedule`

Rota SISPAT:

- `POST /api/integrations/sispat/employees-csv`

Rota de health:

- `GET /api/health`

Captura temporaria de debug:

- `POST /`

Observacao: a captura da raiz nao fica junto dos arquivos Drake finais. Ela fica em `data/webhooks/root-captures`.

## Diretorios e arquivos de auditoria

Sempre verificar estes pontos, nesta ordem:

1. Requisicoes Drake recebidas ou tentadas:

```bash
/opt/jornada-api/data/webhooks/_requests.ndjson
```

2. Requisicoes Drake rejeitadas pelo parser/limite:

```bash
/opt/jornada-api/data/webhooks/_rejected.ndjson
```

3. Payloads Drake salvos:

```bash
/opt/jornada-api/data/webhooks/*employees*.json
/opt/jornada-api/data/webhooks/*expiring-requirements*.json
/opt/jornada-api/data/webhooks/*boarding-schedule*.json
```

4. Capturas de `POST /`:

```bash
/opt/jornada-api/data/webhooks/root-captures/_requests.ndjson
/opt/jornada-api/data/webhooks/root-captures/_rejected.ndjson
/opt/jornada-api/data/webhooks/root-captures/*root-post.json
```

5. Arquivos SISPAT:

```bash
/opt/jornada-api/data/sispat-imports
```

6. Logs do container:

```bash
docker logs jornada-api
```

7. Logs Nginx padrao, se a rota passar por Nginx:

```bash
/var/log/nginx/access.log
/var/log/nginx/error.log
```

Observacao: na verificacao de 2026-08-21, `access.log` estava vazio para esta rota. A porta `3004` estava exposta diretamente pelo Docker, entao o log mais confiavel era o da aplicacao/container.

## Comandos de rastreio

### Horario

O servidor esta em UTC. Para comparar com Brasil:

```bash
date -u -Is
TZ=America/Sao_Paulo date -Is
```

Para buscar "hoje no Brasil", usar meia-noite BRT. Exemplo para 2026-08-21:

```bash
START_UTC='2026-08-21T03:00:00Z'
```

### Listar arquivos novos de hoje

```bash
cd /opt/jornada-api
find data/webhooks -type f -newermt "$START_UTC" -printf '%TY-%Tm-%Td %TH:%TM:%TS %s %p\n' | sort
```

Inclui subpastas, especialmente `root-captures`.

### Contar arquivos por tipo

```bash
cd /opt/jornada-api
for key in employees expiring-requirements boarding-schedule; do
  count=$(find data/webhooks -maxdepth 1 -type f -name "*$key*.json" | wc -l)
  printf "%s=%s\n" "$key" "$count"
done

root_count=$(find data/webhooks/root-captures -maxdepth 1 -type f -name '*root-post.json' 2>/dev/null | wc -l)
printf "root=%s\n" "$root_count"
```

### Resumir requisicoes Drake

```bash
cd /opt/jornada-api
node - <<'NODE'
const fs = require('fs');
const path = 'data/webhooks/_requests.ndjson';
if (!fs.existsSync(path)) process.exit(0);
const rows = fs.readFileSync(path, 'utf8')
  .split(/\n/)
  .filter(Boolean)
  .flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
const counts = new Map();
for (const row of rows) {
  const key = `${row.method} ${row.url}`;
  counts.set(key, (counts.get(key) || 0) + 1);
}
for (const [key, total] of [...counts.entries()].sort()) {
  console.log(`${total}\t${key}`);
}
NODE
```

### Resumir requisicoes da raiz

```bash
cd /opt/jornada-api
node - <<'NODE'
const fs = require('fs');
const path = 'data/webhooks/root-captures/_requests.ndjson';
if (!fs.existsSync(path)) {
  console.log('NO_ROOT_REQUESTS');
  process.exit(0);
}
const rows = fs.readFileSync(path, 'utf8')
  .split(/\n/)
  .filter(Boolean)
  .flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
console.log(`rootRequests=${rows.length}`);
for (const row of rows.slice(-20)) {
  console.log(`${row.capturedAt}\t${row.method}\t${row.url}\t${row.ip}\t${row.contentType || ''}\t${row.contentLength || ''}\t${row.userAgent || ''}\t${row.bodyKind || ''}`);
}
NODE
```

### Abrir ultimos payloads da raiz

```bash
cd /opt/jornada-api
for file in $(find data/webhooks/root-captures -maxdepth 1 -type f -name '*root-post.json' -printf '%T@ %p\n' | sort -n | tail -5 | cut -d' ' -f2-); do
  echo "--- $file"
  node -e "const fs=require('fs'); const o=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(JSON.stringify({capturedAt:o.capturedAt,method:o.method,url:o.url,ip:o.ip,headers:o.headers,bodyKind:o.bodyKind,rawBodyText:o.rawBodyText ? o.rawBodyText.slice(0,500) : null}, null, 2))" "$file"
done
```

### Ver rejeitados

```bash
cd /opt/jornada-api
tail -n 80 data/webhooks/_rejected.ndjson 2>/dev/null || true
tail -n 80 data/webhooks/root-captures/_rejected.ndjson 2>/dev/null || true
```

### Logs do container por periodo

```bash
docker logs --since "$START_UTC" jornada-api 2>&1 | tail -n 300
docker logs --since "$START_UTC" jornada-api 2>&1 | grep -Ei 'Webhook|received|stored|rejected|error|413|500|404|employees|expiring|boarding|root' | tail -n 200
```

## Campos de origem atuais

Campos armazenados hoje em `_requests.ndjson` e capturas:

- `method`
- `url`
- `ip`
- `contentType`
- `contentLength`
- `userAgent`
- `bodyKind` em capturas da raiz
- `authorization: [present]` em capturas da raiz

Limitacao importante:

- Quando a chamada entra via Docker/proxy, `ip` pode aparecer como `::ffff:172.20.0.1`, que e o gateway interno Docker, nao o IP real externo.
- Em 2026-08-21, as chamadas da raiz vieram majoritariamente com `userAgent: null` e `authorization: [present]`.
- O logger atual nao guarda `host`, `x-forwarded-for`, `x-real-ip`, `forwarded`, `referer` nem headers completos sanitizados.

Melhoria recomendada:

- salvar headers sanitizados nas auditorias
- incluir `host`, `x-forwarded-for`, `x-real-ip`, `forwarded`, `referer`, `origin`
- habilitar `trust proxy` se a API ficar atras de proxy reverso confiavel

## Evidencia observada em 2026-08-21

- `POST /api/integrations/drake/employees` chegou uma vez com `contentLength: 0` e `userAgent: PostmanRuntime/7.56.1`.
- `POST /` chegou em grande volume em `data/webhooks/root-captures`.
- Payloads da raiz tinham `EventType: MATRIZ_DE_TREINAMENTO`.
- Exemplo de payload da raiz:

```json
{
  "EventType": "MATRIZ_DE_TREINAMENTO",
  "Payload": {
    "EmpresaTrabalhador": "GRAN SERVICES S.A.",
    "TipoPessoa": "Funcionario",
    "Necessidades": []
  }
}
```

## Checklist rapido para evitar falso negativo

1. Confirmar horario UTC/BRT.
2. Ver `data/webhooks/_requests.ndjson`.
3. Ver `data/webhooks/_rejected.ndjson`.
4. Ver JSONs finais em `data/webhooks/*.json`.
5. Ver `data/webhooks/root-captures/_requests.ndjson`.
6. Ver JSONs da raiz em `data/webhooks/root-captures/*root-post.json`.
7. Ver rejeitados da raiz em `data/webhooks/root-captures/_rejected.ndjson`.
8. Ver `docker logs jornada-api`.
9. So depois olhar Nginx ou outras camadas.

