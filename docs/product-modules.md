# Product Modules

## MVP premium direction

O MVP nao sera um prototipo raso. Ele deve nascer com estrutura de produto real, mesmo que o escopo de features seja controlado.

## Core modules

### 1. Auth

- criar conta
- login
- recuperar senha
- redefinir senha
- refresh de sessao
- logout
- verificacao de email
- perfis
- setores
- trilha de auditoria

Observacao:

`Auth` passa a ser a primeira vertical funcional do produto. Antes de agenda, vencimentos e comunicados, a base de identidade precisa nascer pronta para crescimento.

### 2. Employee

- dados do colaborador
- vinculos operacionais
- identificadores externos

### 3. Boarding Schedule

- agenda de embarque
- agenda de desembarque
- alteracoes de programacao
- status e proximidade

### 4. Expiring Requirements

- ASO
- treinamentos
- certificados e documentos
- estados de alerta

### 5. Communications

- comunicados gerais
- comunicados por setor
- avisos operacionais
- destaque de mudancas relevantes

### 6. Chat and Support

- conversa com setores
- fila de atendimento
- grupos e espacos de equipe

## Future modules

- notifications
- attachments
- teams
- preferences
- admin
- integrations hub

## MyDrake inspiration translated to Jornada

Pontos principais a preservar na visao do produto:

- agenda real como elemento central
- compromissos operacionais
- treinamentos realizados e agendados
- informacao facil para o colaborador
- mudancas e avisos com peso operacional

## Build order recommendation

Ordem recomendada para implementacao:

1. `Auth`
2. `Employee`
3. `Boarding Schedule`
4. `Expiring Requirements`
5. `Communications`
6. `Chat and Support`
