# Frontend Architecture

## Direction

O `Jornada` tera um unico app web, responsivo e mobile-first, com `PWA` desde a base.

Nao vamos criar dois frontends separados para celular e desktop.

## Theme direction

Tema recomendado para a base 1:

- claro como padrao principal
- neutros frios e cinzas suaves como superficie
- transparencias acinzentadas com blur moderado
- vermelho apenas como acento de marca e estados criticos

Racional:

- leitura em ambiente externo tende a ser melhor no tema claro
- vermelho em produto operacional precisa ter peso sem contaminar a interface inteira
- superficies claras com contraste firme funcionam melhor para agenda, vencimentos e comunicados

Paleta inicial recomendada:

- `canvas`: `#f3f5f7`
- `panel`: `#ffffff`
- `panel-strong`: `#eef2f5`
- `text-primary`: `#111827`
- `text-secondary`: `#4b5563`
- `text-muted`: `#6b7280`
- `brand-red`: `#c7352c`
- `brand-red-strong`: `#a92f27`
- `warning`: `#b45309`
- `critical`: `#b42318`

O dark mode pode entrar depois, mas nao como tema principal do MVP.

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

Padrao recomendado:

- uma biblioteca unica de componentes responsivos
- variacoes de layout por breakpoint
- variantes separadas apenas quando a interacao muda de verdade

Exemplos em que vale separar:

- navegacao inferior mobile versus sidebar desktop
- drawer mobile versus painel lateral desktop

Exemplos em que nao vale separar:

- button
- text field
- badge
- card de informacao

Isso reduz manutencao e deixa o produto mais consistente.

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
