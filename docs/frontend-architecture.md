# Frontend Architecture

## Direction

O `Jornada` tera um unico app web, responsivo e mobile-first, com `PWA` desde a base.

Nao vamos criar dois frontends separados para celular e desktop.

## Chosen UI foundation

Stack recomendada:

- `React`
- `React Aria Components`
- `Tailwind CSS`
- `lucide-react`

## Why `React Aria`

Segundo a documentacao atual da Adobe, `React Aria` oferece componentes acessiveis com comportamento embutido, interacoes adaptativas, suporte a internacionalizacao e estrutura pronta para ser estilizada com qualquer solucao de CSS.

Isso combina muito bem com o que queremos:

- app serio e operacional
- forte uso em celular
- formularios importantes
- dialogs, drawers, listas, seletores e overlays
- liberdade visual para um produto proprio, sem cara de template

## Recommendation for Jornada

Sim, faz sentido usar `React Aria` aqui.

Minha recomendacao e:

- usar `React Aria Components` como base de comportamento e acessibilidade
- usar `Tailwind CSS` para estilo, layout e tokens
- criar nossos componentes em `components/ui`
- evitar misturar outra biblioteca de primitives como fundacao paralela

## What this means in practice

Usar `React Aria` nao significa depender de um visual pronto.

Ele resolve principalmente:

- acessibilidade
- navegacao por teclado
- estados de foco
- interacoes touch e desktop
- estrutura de formularios
- componentes interativos complexos

Nos resolvemos:

- identidade visual
- composicao de telas
- densidade operacional
- padroes especificos do `Jornada`

## Suggested component strategy

Camadas sugeridas:

1. `components/ui`
2. `components/patterns`
3. `features/*/components`

### `components/ui`

Primitives reutilizaveis:

- `Button`
- `TextField`
- `PasswordField`
- `Select`
- `ComboBox`
- `Dialog`
- `Drawer`
- `Tabs`
- `Table`
- `Badge`
- `Toast`

### `components/patterns`

Composicoes recorrentes:

- cabecalho mobile
- cards de agenda
- lista de vencimentos
- blocos de comunicados
- empty states

### `features/*/components`

Componentes especificos de dominio:

- card de embarque
- timeline de programacao
- painel de alertas de ASO
- historico de atendimento por setor

## Auth-first impact

Antes de construir agenda, vencimentos e chat, o primeiro fluxo completo do frontend deve ser `auth`.

Fluxos iniciais:

- criar conta
- login
- recuperar senha
- redefinir senha
- manter sessao
- logout

## What we should avoid

- usar kit visual fechado e depois lutar contra ele
- misturar `React Aria`, `Radix` e outra base de primitives sem criterio
- criar componentes fora de uma estrategia de design system leve
- priorizar desktop antes da experiencia mobile
