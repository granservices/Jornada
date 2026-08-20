# Jornada Agents And Skills

## Agent map

### 1. Webhook Intake Agent

Responsabilidade:

- manter contratos externos do Drake
- validar autenticacao
- garantir resposta consistente

Escopo inicial:

- `employees`
- `expiring-requirements`
- `boarding-schedule`

### 2. Ingestion Normalizer Agent

Responsabilidade:

- transformar payload bruto em formato interno
- padronizar ids, datas, status e origem

Quando entra:

- depois da validacao do recebimento

### 3. Schedule Projection Agent

Responsabilidade:

- montar agenda de embarque do colaborador
- detectar mudancas relevantes

### 4. Compliance Monitor Agent

Responsabilidade:

- identificar ASO e treinamentos proximos de vencimento
- disparar estados de alerta

### 5. Communications Routing Agent

Responsabilidade:

- classificar comunicados por setor, equipe e impacto
- preparar exibicao no app

### 6. Support Triage Agent

Responsabilidade:

- apoiar o futuro chat com roteamento inicial
- sugerir setor certo para atendimento

## Skill map

### Skill: `jornada-platform`

Uso:

- planejamento, arquitetura e implementacao no repositorio `Jornada`
- governanca da API inicial
- evolucao das integracoes e do dominio do produto

### Skill futura: `jornada-drake-contracts`

Uso:

- trabalhar nos contratos reais dos webhooks do Drake
- validacao de schema e exemplos de payload

### Skill futura: `jornada-employee-experience`

Uso:

- quando a frente PWA/mobile-first estiver madura
- jornadas do colaborador, offline, notificacoes e UX

## Loops

### Loop 1 - Webhook receive loop

Receber -> autenticar -> validar -> persistir -> responder

### Loop 2 - Event processing loop

Consumir evento persistido -> normalizar -> aplicar regra -> salvar estado

### Loop 3 - Alerting loop

Ler agenda e vencimentos -> detectar risco -> gerar comunicado/notificacao

### Loop 4 - Support loop

Receber mensagem -> classificar -> encaminhar -> acompanhar resposta

## Harness

### Local webhook harness

Objetivo:

- simular chamadas do Drake via `curl`, Postman ou script

### Payload replay harness

Objetivo:

- reaplicar payload salvo para debug ou regressao

### Integration contract harness

Objetivo:

- rodar payloads fixos contra validadores e transformadores

