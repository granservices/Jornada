# Frontend Architecture

## Direction

O Neo possui um frontend publicado, com modulos internos de responsabilidades distintas:

- `apps/neo/src/modules/jornada`: colaborador
- `apps/neo/src/modules/tickets`: operacao de atendimento
- `apps/neo/src/modules/quick-forms`: formularios reutilizaveis
- Hub: rota `/aplicativos` dentro de `apps/neo`, com Neo identificado como plataforma e sem regra de negocio propria
- Administracao Neo: rotas `/administracao/*`, capacidade transversal protegida por `ADMIN`

Ambas continuam web, responsivas e com identidade compartilhada, mas nao devem dividir a mesma experiencia de navegacao.

Nao vamos criar dois frontends separados para celular e desktop dentro de um mesmo app. A separacao recomendada e por produto e contexto de uso, nao por device.

Etapa atual dessa separacao:

- `apps/neo` publica todos os modulos internos
- `Tickets` e o modulo operacional de atendimento
- o portal `/aplicativos` ja introduz a escolha explicita de contexto para usuarios com mais de um app
- o shell do colaborador mostra apenas navegacao `JORNADA`
- o shell operacional mostra navegacao `TICKETS`
- `apps/neo` redireciona rotas antigas de atendimento para o Tickets e de formularios para o QuickForms
- `apps/api` continua compartilhado por enquanto
- o runtime publicado do `apps/neo` e servido por Nginx em container, com `/api` e `/socket.io` encaminhados internamente para `apps/api`
- Tickets e QuickForms usam rotas lazy para preservar entrypoint leve
- QuickForms possui modulo proprio para biblioteca, fontes e builder; `/aplicativos` e a entrada neutra de modulos dentro do Jornada

## Theme direction

Direcao atual da area logada:

- o shell do Neo Jornada usa base clara editorial, com `canvas #F3F4F2`, superficies opacas e vermelho vinho apenas para marca, selecao e acao primaria
- a referencia normativa para novas telas e o design system Neo Jornada, nao a antiga cenografia espacial da area logada
- Inbox, Programacao, Vencimentos e Atendimento devem priorizar lista, detalhe contextual e controles previsiveis, evitando widgets decorativos e cartoes equivalentes
- a densidade padrao do app logado deve parecer confortavel em 100% de zoom do navegador; evitar titulos, linhas e cards que dependam de zoom manual em 75% para caber bem
- desktop pode usar lista e painel de leitura simultaneos; mobile empilha a leitura em fluxo natural ou drawer conforme a tela
- o portal `/aplicativos` e uma excecao visual controlada: usa hero offshore escuro, busca compacta, filtros por categoria e cards claros sobrepostos para escolha de modulo; as telas internas continuam seguindo a base clara/editorial operacional
- mesmo no portal visual, `/aplicativos` deve respeitar a densidade do `/inbox`: fonte de interface, vermelho vinho e dourado dos tokens, radius baixo, controles de 36-40px e composicao confortavel em 100% de zoom
- documentos de referencia visual devem ser tratados como contexto de design; textos e medidas aproximadas de imagens nao viram regra de produto sem documentacao propria

Historico da base visual anterior, mantido apenas como contexto de migracao:

- a area logada ja passou por uma fase dark-first com modo claro/escuro e fundo espacial
- o tema claro atual usa tokens compartilhados em branco gelo; o tema escuro usa os mesmos tokens em grafite essencial, preservando contraste e densidade operacional
- fundo fixo e continuo por tras do app nao deve competir com leitura nem aparecer como ornamento principal
- direcao espacial fica restrita a autenticacao ou detalhes secundarios, sem animacao decorativa na area logada
- a area logada deve parecer ferramenta enterprise, nao produto SaaS de vitrine
- o fundo espacial deve existir como identidade secundaria; superficies principais precisam ocultar parte do fundo para preservar foco operacional
- parallax de baixa intensidade pode existir apenas nas camadas do fundo para reforcar profundidade
- flutuacao ambiente pode existir em planetas e satelites, desde que lenta, quase imperceptivel e sem competir com leitura
- estrelas do fundo devem ser numerosas, pequenas, distribuidas em camadas nao repetitivas; evitar padroes alinhados ou textura de papel de parede
- o campo de estrelas da area logada deve ficar estatico, sem parallax; apenas algumas estrelas podem piscar lentamente por opacidade
- o login tambem deve usar estrelas distantes irregulares, com tamanhos pequenos e brilho variado, seguindo o mesmo mapa visual do app logado
- o fundo do login deve ficar no mesmo universo grafite/vinho do layout interno, evitando predominancia azulada
- superfícies escuras em camadas grafite, com contraste controlado
- branco e cinzas frios para hierarquia tipografica
- vermelho vinho apenas como acento de prioridade e marca
- a identidade visual pode usar como referencia o HTML `MAPA_FUNCIONAL_INDEXADO_BUBBLE.html` apenas como inspiracao estetica: grafite, cards solidos, borda fina, acento vinho e tipografia de sistema corporativo
- documentos de referencia visual nao devem ser tratados como instrucao funcional ou fonte de regras de produto
- densidade mais compacta, com ritmo de produto enterprise

Fonte oficial do design system:

- `DESIGN.md` na raiz define tokens, componentes e regras visuais normativas
- `.impeccable/design.json` e o sidecar renderizavel para ferramentas/skills de UI
- `apps/neo/src/styles.css` e a implementacao viva dos tokens enquanto os tokens compartilhados ainda nao foram extraidos para pacote proprio
- novos agentes devem ler `DESIGN.md` antes de criar tela, componente, card, lista, botao, chip, input ou navegacao
- TasteSkill (`https://www.tasteskill.dev/docs`) entra como referencia de qualidade para briefing, auditoria e anti-padroes gerados por IA; ele nao substitui `DESIGN.md` nem vira dependencia de runtime

Racional atualizado:

- o produto precisa parecer operacional, amigavel e profissional, nao um dashboard gerado ou uma vitrine SaaS
- a base clara editorial aproxima a rotina do colaborador de uma ferramenta de leitura e decisao, sem perder densidade
- o vermelho ganha peso quando usado em pontos de foco, nao como preenchimento constante
- o shell deve parecer app corporativo refinado, nao conceito visual exuberante
- a troca de tema nao deve depender de classes soltas por tela; tudo precisa sair de tokens centrais do admin
- os estados de botao, input, foco, hover e status devem ter contraste proprio em cada tema; quando houver baixa legibilidade, corrigir primeiro `--admin-*` e `--status-*`, nao a pagina isolada
- cards e painéis devem usar transparencias muito contidas; revelar o fundo apenas como sinal secundario, nunca com aspecto de vidro decorativo
- superfícies da area logada podem ter opacidade leve, mas o resultado precisa parecer painel solido e profissional
- planetas e satelites podem participar da composicao, mas como cenografia de fundo e nunca como foco funcional
- superfícies devem ser padronizadas por nível: elementos no mesmo nível visual usam exatamente o mesmo token de fundo
- cantos devem ser quase retos na area logada: painéis principais em torno de 6px, agrupamentos internos e controles entre 4px e 6px, e pílulas apenas para status/badges pequenos
- evitar sobreposicao visual excessiva de cards; quando houver um painel dentro de outro, a diferenca precisa ser funcional e discreta

Sistema inicial de superfícies da area logada:

- `canvas`: fundo base espacial
- `shell`: camada persistente de navegacao, solida o suficiente para leitura longa
- `surface-1`: card/painel principal; mesmo tom para header, sidebar cards e conteudo, com opacidade maior que a versao inicial glass
- `surface-2`: agrupamentos internos dentro de `surface-1`
- `surface-3`: microelementos dentro de `surface-2`, como badges, canais e icones internos
- `panel-active`: apenas estado ativo/hover; nao deve substituir nivel estrutural
- `text-primary`: `#eceff1`
- `text-secondary`: `#a3a9b1`
- `text-muted`: `#69717b`
- `brand-red`: `#9b1f2e`
- `brand-red-strong`: `#62111b`
- `warning`: `#f59e0b`
- `critical`: `#ef4444`
- fonte base preferencial: `"Segoe UI", Roboto, Arial, system-ui`

As telas de autenticacao podem continuar com linguagem propria, desde que conversem com essa base.

Regra de componentes:

- `SectionCard` e a superficie padrao para paineis e cards da area logada
- `Button`, `StatusPill` e `ListAction` devem ser reaproveitados antes de criar estilos locais
- a configuracao do atendimento, a biblioteca de formularios e o Inbox devem usar os mesmos tokens de superficie por nivel
- AntD, Formily e Designable foram removidos do frontend; novas telas nao devem reintroduzir essas dependencias sem ADR
- o editor principal de formularios e o criador oficial em `/formularios/novo` e `/formularios/:formKey/editar`
- o criador oficial usa `react-aria-components` para biblioteca/canvas com drag and drop acessivel, `RJSF` como runtime/schema, wrappers proprios de `SearchField`, `DatePicker`, `Select`, `ComboBox` e `NumberField`, e layout salvo por blocos (`field`, `section`, `content`)
- decisoes registradas em `docs/adr/0002-remove-antd-formily-designable-from-frontend.md` e `docs/adr/0003-use-custom-form-builder-as-official-flow.md`

## Shell layout direction

No desktop, o shell deve parecer uma ferramenta instalada dentro do espaco da tela, nao uma pagina grudada nas bordas.

Regras:

- sidebar como card vertical flutuante, com margem em todas as bordas
- topo da sidebar alinhado ao topo do header
- header fixo dentro da coluna de conteudo, com altura curta e funcao de orientacao
- header e conteudo principal usam a mesma largura maxima para nao criar desalinhamento visual
- no desktop, a coluna de conteudo deve ter no maximo a mesma altura visual da sidebar
- rolagem concentrada no conteudo principal quando necessario
- quando houver excesso de informacao, apenas o corpo do conteudo rola; sidebar e header permanecem alinhados
- no desktop, o shell ocupa a altura util da viewport; sidebar e coluna de conteudo compartilham essa mesma altura
- o conteudo deve se adaptar dinamicamente a largura disponivel quando a sidebar recolhe ou expande
- evitar `max-width` estreito nas paginas operacionais; a largura util deve ser aproveitada para listas, tabelas, filtros e formularios
- gaps externos entre sidebar, header e conteudo devem ser compactos para preservar area de trabalho
- o header global mostra nome da pagina e acoes globais pequenas; filtros e busca pertencem ao card compacto do modulo
- paginas internas podem ter uma secao compacta de ferramentas, mas essa secao deve conter apenas controles como filtros, busca e acoes
- a secao compacta de ferramentas nao deve repetir nome da pagina, subtitulo ou descricao
- filtros devem ocupar o espaco disponivel com quebra responsiva; evitar barra horizontal quando houver largura para distribuir os controles
- botoes de filtro devem manter altura, largura minima e fonte padronizadas entre modulos, independentemente do tamanho do texto
- acoes compactas em listas devem usar o componente compartilhado `ListAction` para nao quebrar a leitura linha a linha; no mobile, ocupam a largura total da linha para facilitar toque e leitura
- scrollbars devem ser discretas e tokenizadas, combinando com o fundo espacial
- desktop usa sidebar recolhivel por padrao para preservar area de trabalho: recolhida mostra apenas icones, expande ao hover quando em modo automatico e oferece trava para manter aberta ou fechada
- a expansao da sidebar no desktop participa do layout; ao recolher, a coluna de conteudo ganha largura, e ao expandir ela se reorganiza dentro da largura disponivel
- a preferencia de trava da sidebar fica persistida localmente, pois e uma preferencia ergonomica do operador
- a animacao da sidebar deve usar `motion`, transicao curta e respeitar `prefers-reduced-motion`
- mobile continua com navegacao inferior fixa, fluxo vertical natural e estado ativo no mesmo padrao visual da sidebar
- o header global deve ser compacto e funcional, sem funil contextual ou slogan; o colaborador ja esta dentro do app para consultar e resolver informacoes
- o portal `/aplicativos` deve destacar a descoberta de modulos com hero offshore, busca, filtros por categoria e cards de destino claros; proximas acoes ficam no Inbox para nao misturar catalogo com fila operacional
- o Inbox deve destacar uma unica proxima acao acima dos filtros; filtros continuam secundarios, pois a lista existe para decisao rapida

## Motion direction

Animacao recomendada para a base:

- `motion` com transicoes curtas de entrada
- hover de 1px ou microescala
- nada de animacao continua pesada
- icones animados apenas em pontos de foco, nao como ornamento constante

`animate-ui` pode entrar depois para componentes mais refinados, mas a base inicial nao precisa depender disso para ficar boa.

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

Regra de implementacao:

- desenhar sempre primeiro para telas pequenas
- expandir a composicao progressivamente para tablet e desktop
- evitar ajustes tardios focados em desktop que quebrem o fluxo mobile
- tratar breakpoint como adaptacao de layout, densidade e navegacao, nao como dois apps diferentes

Exemplos em que vale separar:

- navegacao inferior mobile versus sidebar desktop
- drawer mobile versus painel lateral desktop

Exemplos em que nao vale separar:

- button
- text field
- badge
- card de informacao

Isso reduz manutencao e deixa o produto mais consistente.

## Responsive quality bar

Todo fluxo novo deve nascer com estes cuidados:

- funcionar sem quebra visual em larguras pequenas de celular
- preservar toque confortavel, hierarquia clara e leitura rapida
- crescer por breakpoint sem overflow, sobreposicao ou perda de contexto
- manter os mesmos componentes base entre mobile e desktop sempre que possivel

Breakpoints minimos para validacao visual:

- celular pequeno: `360px`
- celular medio: `390px` a `430px`
- tablet: `768px`
- desktop: `1280px`

## Frontend safety bar

Todo fluxo novo do frontend deve manter uma protecao minima antes de ser considerado concluido:

- bug reportado em tela interativa vira teste de regressao quando for reproduzivel
- formularios com estado local precisam ser cobertos por teste de digitacao ou selecao quando houver risco de loop, evento sintetico ou campo repetido
- `event.currentTarget.value` deve ser copiado para uma constante antes de entrar em updater funcional de estado
- `npm run test:jornada:guards` protege automaticamente esse padrao nos arquivos `tsx` do Jornada
- `npm run test:jornada` cobre regressao rapida de componentes sem depender de navegador real
- Playwright fica reservado para os principais fluxos E2E, como login, abrir atendimento, comentar, transferir, resolver e avaliar
- ocultar item de menu no frontend nunca substitui permissao no backend

Quando um fluxo precisar mudar muito entre contextos, preferimos:

- mesma regra de negocio
- mesmos componentes base
- layout e navegacao adaptados por breakpoint

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
- cards de programacao
- lista de vencimentos
- blocos de comunicados
- empty states

### `features/*/components`

Componentes especificos de dominio:

- card de embarque
- timeline de programacao
- painel de alertas de ASO
- historico de atendimento por setor

## Employee inbox direction

A pagina inicial da area logada do colaborador deve ser um `Inbox`, nao um dashboard.

Regra de produto:

- `/inbox` e a home logada do colaborador
- `/app` fica apenas como redirecionamento temporario para `/inbox`
- o Inbox concentra notificacoes de embarque, desembarque, treinamento, ASO, compromissos e mensagens
- no recorte operacional atual, o Inbox mostra apenas o proximo embarque ou desembarque futuro, treinamentos com vencimento em ate 120 dias, atendimentos em `WAITING_REQUESTER` e atendimentos `RESOLVED` recentes sem avaliacao
- cada registro mostra apenas o resumo necessario
- acoes completas levam para modulos proprios, como `/programacao`, `/vencimentos`, `/atendimentos` e `/perfil`, possivelmente com filtros aplicados pela rota
- respostas de atendimento aparecem como sinal acionavel para o colaborador responder no detalhe do caso; atendimentos resolvidos recentes sem avaliacao aparecem como acao de avaliar/reabrir, sem carregar a conversa completa dentro do Inbox
- dashboard personalizavel por widgets deve ser tratado depois como visao de gestor/admin, nao como home do colaborador

Regra visual:

- leitura em uma coluna como padrao mobile
- filtros minimos: todos, criticos e hoje
- prioridade visivel por status e prazo, sem metricas duplicadas
- lista resumida e acionavel, sem expansao de detalhes na home
- no maximo um resumo superior curto antes da lista
- busca e filtros do Inbox ficam em uma secao compacta da propria pagina, separada do header global
- Inbox deve ser compacto; a listagem tem prioridade sobre explicacoes e widgets
- no desktop, o Inbox deve ocupar a altura disponivel do shell sem ultrapassar a sidebar; filtros e busca ficam fixos no topo do modulo e apenas as linhas da lista rolam dentro do card
- a lista do Inbox pode usar gradiente/sombra sutil no topo e rodape para indicar continuidade das linhas durante a rolagem
- o viewport interno da lista deve herdar o raio e o fundo do card para evitar cantos claros ou quadrados dentro de superficies arredondadas
- evitar badges redundantes quando o proprio filtro ja comunica contagem ou estado
- sem hero grande, command rail, widgets administrativos ou cards de KPI na home do colaborador
- no desktop, a Inbox pode manter lista e painel de leitura simultaneos quando isso reduzir navegacao e preservar contexto; a lista continua sendo a fonte principal, e o painel nao deve duplicar regras que pertencem a Vencimentos, Programacao ou Atendimento

Racional:

- o colaborador precisa saber rapidamente o que exige acao
- mobile e conectividade ruim favorecem uma lista leve e progressiva
- programacao continua sendo dominio central, mas aparece no Inbox como notificacao acionavel quando houver impacto
- Vencimentos continua sendo a tela completa de requisitos; o Inbox so mostra o recorte de treinamento em risco para evitar virar segunda tela de compliance

## Employee programacao direction

## Employee profile direction

A tela `/perfil` mostra dados oficiais e ajustes pessoais no mesmo lugar, mas
com responsabilidades separadas.

Regra de produto:

- nome oficial, CPF mascarado, matricula, setor, email e status de conta sao
  leitura protegida
- ajustes editaveis pelo colaborador ficam em `UserProfilePreference`
- a tela pode permitir nome de preferencia, telefone, contato de emergencia,
  base principal e canal preferido de aviso
- alteracoes usam `PATCH /api/auth/me/profile` e nao devem tocar `Person` ou
  `Employee`
- sem sessao ou em testes visuais, a fixture sanitizada continua sendo fallback
  do seam de contrato interno

Regra visual:

- manter layout compacto em paineis operacionais
- usar icones para identidade, vinculo, contato, acesso e acoes de salvar
- separar claramente dados bloqueados de campos editaveis
- organizar a pagina em abas compactas (`Identidade`, `Contato`, `Acesso` e
  `Documentos`) para evitar mistura de informacoes oficiais, ajustes pessoais e
  pendencias
- evitar formularios longos ou campos administrativos no perfil do colaborador

## Employee programacao direction

A tela de `Programacao` deve ser uma timeline cronologica unica no MVP. A decisao reduz carga visual, melhora o uso mobile e evita manter varias visoes paralelas antes de termos dados reais suficientes.

Regra de produto:

- mostrar eventos do funcionario em uma linha do tempo unica
- agrupar eventos por mes e destacar o mes atual
- destacar o evento do dia atual quando existir
- eventos do funcionario incluem embarque, desembarque e compromissos de setores
- filtros podem reduzir a timeline por tipo de evento
- quando houver backend real, carregar por intervalo e pagina, com filtros resolvidos na API
- o intervalo padrao da programacao deve cobrir aproximadamente 120 dias, de 60 dias atras ate 60 dias a frente, para dar visao recente e proxima sem inflar a consulta
- detalhes completos devem carregar sob demanda, nao junto com a lista inicial

Regra visual:

- a timeline ocupa a area principal restante, horizontal e verticalmente, respeitando a altura do shell/sidebar
- a rolagem acontece dentro do card da programacao, nao na pagina inteira
- cada evento deve ser uma linha compacta, com data, tipo, titulo, rota/origem e horario
- usar sombra/gradiente sutil no topo e rodape para indicar continuidade quando houver rolagem interna
- no mobile, a mesma timeline continua funcionando sem trocar para outra metafora de navegacao

## Expiring requirements direction

A tela de `Vencimentos` concentra ASO, treinamentos e documentos do colaborador.

Regra de produto:

- a pagina mostra lista operacional, nao dashboard
- filtros minimos: todos, criticos, ASO, treinamentos e documentos
- busca local pode existir no mock; no backend real, filtros e busca devem ser resolvidos na API quando houver volume
- cada item mostra tipo, prazo, situacao com icone e uma acao curta; a origem externa nao precisa aparecer como coluna da tabela
- a acao de ASO deve abrir `/atendimento?modo=new&setor=MEDICINE&assunto=ASO`; a acao de treinamento deve abrir `/atendimento?modo=new&setor=TRAINING&assunto=CERTIFICATE`, mantendo o colaborador dentro do Jornada enquanto o catalogo/roteamento interno resolve equipe e formulario
- contagens aparecem nos filtros, evitando cards de metrica redundantes
- a ordenacao padrao deve ser por vencimento mais proximo
- acoes visiveis devem usar rotulos curtos para evitar quebra ou corte em telas compactas
- quando houver sessao de colaborador, `/vencimentos` e `/inbox` consultam `GET /api/expiring-requirements/me`; sem sessao, fixtures continuam sendo o seam visual e de teste
- contas recem-criadas por convite podem ainda nao ter vinculo externo de programacao ou qualificacoes; nesse caso os endpoints protegidos retornam listas vazias para a UI renderizar estado vazio, sem tratar a navegacao como erro
- administradores recebem uma selecao global temporaria de colaborador no shell da Jornada para validacao da aplicacao; apos selecao explicita, Programacao, Vencimentos e Atendimento consultam contratos protegidos de preview, sem alterar a semantica de `/me`
- resultados da busca administrativa global devem exibir o nome completo do colaborador, com matricula e unidade em linha secundaria, para distinguir nomes parecidos
- esse seletor e recurso de teste/validacao e deve ser removido ou substituido por impersonacao auditada antes de uso operacional amplo
- apos selecionar um colaborador, o controle global precisa continuar parecendo alternavel, com rotulo de troca e menu rolavel para listas longas
- a resposta consumida pelas telas e o DTO interno minimizado, sem `WorkerId`, tenant, credencial, payload Drake ou identificador externo da necessidade
- o recorte exibido deve considerar todas as necessidades retornadas para o colaborador, sem janela artificial de 120 dias

Regra visual:

- mesma secao compacta de ferramentas usada no Inbox
- em telas pequenas, filtros de Vencimentos podem virar um menu suspenso compacto; no desktop, os botoes rapidos continuam permitidos quando couberem sem poluir a leitura
- lista como elemento principal, com comportamento de tabela no desktop
- no mobile, cada linha deve empilhar as informacoes mantendo a acao em largura total
- estado vazio claro para filtros sem resultado
- sem explicacoes longas na tela do colaborador
- manter `Vencimentos` em uma tela dedicada do trabalhador; Inbox pode exibir sinais resumidos, mas nao deve possuir a tela nem acoplar sua renderizacao
- cada linha deve usar icone de indicador para vencido, proximo do vencimento, em dia ou sem data, sem depender apenas de cor ou texto; todo vencimento em ate 120 dias entra como proximo do vencimento em tom alaranjado

## Chat direction

O `Chat` nasce como conversa por setores, com lista leve e painel de mensagens.

Regra de produto:

- filtros minimos: todas, novas, operacoes, medicina e treinamento
- lista de conversas mostra setor, ultima mensagem, tempo e pendencias
- painel de mensagens mostra apenas a conversa selecionada
- campo de resposta envia pelo backend real com `clientMessageId` para evitar duplicidade
- o Inbox mostra apenas o ultimo sinal; detalhes ficam no modulo `/chat`
- historico de mensagens usa paginacao; mensagens antigas so carregam quando o usuario pede
- eventos em tempo real chegam por `Socket.IO`, coordenado por Redis no backend

Regra visual:

- lista e painel devem dividir a tela no desktop
- no mobile, manter fluxo vertical simples e sem overlays obrigatorios
- evitar carregar historico completo; mensagens antigas entram paginadas quando houver backend
- lista de mensagens pode usar virtualizacao para manter desempenho em mobile

## Employee support contact direction

O colaborador fala com o atendimento dentro do Jornada, sem precisar conhecer ou entrar no app operacional.

Regra de produto:

- `/atendimento` e a superficie Jornada para abrir mensagem e acompanhar respostas de solicitacoes proprias
- atalhos de Inbox, Comunicados e Vencimentos devem apontar para `/atendimento`, com setor/assunto/contexto quando houver
- a tela deve mostrar somente conversas do colaborador, abertura simples por setor/assunto e campo de resposta
- atendimentos `RESOLVED` dentro da janela de 7 dias podem ser reabertos explicitamente na propria conversa, com motivo tipificado e mensagem obrigatoria
- fora da janela de reabertura, a interface orienta abrir uma nova mensagem
- sempre exibir titulo e mensagem na abertura; quando o assunto tiver formulario ativo, renderizar os campos adicionais antes da mensagem
- se ja houver atendimento ativo do colaborador para o mesmo setor e assunto, uma nova abertura deve virar mensagem nesse atendimento, sem reiniciar SLA
- nao expor fila, atendente responsavel, transferencia, SLA interno, regras, equipe ou nomenclatura Tickets para o colaborador
- `/chat` redireciona para `/atendimento` enquanto o produto de conversa direta nao for retomado como experiencia separada

## Support administration direction

A configuracao de atendimento deve ficar separada da jornada do funcionario.

Regra de produto:

- `/atendimentos` e a tela operacional para atender, acompanhar, comentar, transferir, resolver e avaliar solicitacoes
- essa tela pertence ao modulo Tickets em `apps/neo/src/modules/tickets`
- `/atendimentos` deve separar visualmente `list`, `new` e `detail`: lista primeiro, criacao em fluxo dedicado e acompanhamento em detalhe dedicado
- a listagem de atendimentos deve parecer tabela compacta no desktop, virar linhas acionaveis no mobile e rolar internamente quando houver muitas solicitacoes
- o detalhe de atendimento deve ser uma experiencia de conversa de helpdesk: mensagens em bolhas, eventos de sistema discretos, campo de resposta no rodape do card e painel lateral compacto para contexto/acoes
- para atendentes no desktop amplo, o detalhe pode abrir em `workspace` flutuante acoplado ao shell, preservando acesso a outras telas operacionais sem perder a conversa ativa
- esse `workspace` deve nascer do mesmo detalhe de atendimento; muda o container, nao a regra de negocio
- a fila/lista continua sendo a ancora principal do atendente para alternar rapidamente entre funcionarios
- o modo padrao do atendente deve abrir em `Para assumir`, com filas compactas para `Meus atendimentos`, `Da equipe`, `SLA critico` e `Todos`
- se a operacao evoluir para Kanban, as colunas devem nascer das mesmas filas filtradas no backend (`para-assumir`, `meus-atendimentos`, `da-equipe`, `sla-critico`, `todos`), evitando logica paralela no cliente
- o Kanban deve ser um modo alternativo da mesma listagem operacional, nao um modulo com regras proprias; drag and drop muda ownership/status/equipe por acao de dominio
- em mobile, preferir rota dedicada para detalhe do atendente, com secoes compactas por aba/drawer, sem flutuacao persistente
- abertura de atendimento deve carregar setores do catalogo ativo; para usuarios de suporte/admin, pode usar fallback do catalogo administrativo quando o catalogo publico estiver vazio
- setor sem assunto ativo pode abrir atendimento como `Geral do setor`, mantendo a equipe interna escondida do funcionario
- setor permanece obrigatorio na abertura; assunto fica opcional no MVP para reduzir friccao do funcionario
- quando houver formulario principal vinculado ao assunto, ele deve entrar antes da conversa para gerar intake curto e contexto minimo
- o botao `Novo` deve ficar sempre acessivel na faixa compacta da pagina, sem transformar a tela em painel de cards
- `/atendimentos/configuracao` e apenas o indice administrativo para `ADMIN` e `SUPPORT`
- `/atendimentos/configuracao/setores` mostra setores para `ADMIN` e `SUPPORT`, mas manutencao de setor e exclusiva do `ADMIN` global
- `/atendimentos/configuracao/assuntos` mantem assuntos
- `/atendimentos/configuracao/equipes` mantem equipes e atendentes
- `/atendimentos/configuracao/regras` mantem roteamento
- `/formularios` mantem a biblioteca central de formularios versionados
- `/formularios/fontes` mantem as fontes reutilizaveis de opcoes, com tela propria de listagem, edicao e preview
- `/formularios/novo` cria nova versao com o builder proprio do Jornada
- `/formularios/:formKey/editar` abre o builder proprio para publicar nova versao do formulario existente
- `/atendimentos/configuracao/formularios` redireciona para `/formularios`
- o colaborador comum nao ve o item de configuracao no menu
- setores e assuntos sao visiveis ao funcionario; equipes, membros e regras sao estruturas internas
- formularios sao publicados por nova versao para preservar atendimentos antigos

Regra visual e tecnica:

- a configuracao usa a mesma camada compacta do admin, sem novo visual system
- evitar juntar manutencao de setores, assuntos, equipes, regras e formularios em uma unica tela com abas
- a rota e carregada por lazy import/chunk separado para nao pesar a home mobile
- rotas antigas de atendimento e formularios devem resolver localmente para os modulos nativos Tickets e QuickForms em `apps/neo`
- o frontend nao deve carregar dependencias pesadas de designer visual na home mobile do funcionario
- telas administrativas devem continuar densas, filtraveis e com controles pequenos
- listas administrativas podem mostrar status e contagem, mas metricas profundas ficam para modulo futuro
- a UI administrativa deve esconder acoes que o backend nao permite; quando `SUPPORT` abrir Setores, a lista fica em modo somente leitura
- no workspace do atendente, a hierarquia visual ideal e `fila -> conversa -> contexto`; evitar varios cards equivalentes disputando peso
- o workspace flutuante deve viver dentro da area util do conteudo, respeitando header e sidebar, e acompanhar a largura disponivel quando a navegacao recolhe ou expande
- a conversa ocupa a maior parte horizontal e vertical do workspace; dados do solicitante, SLA, historico e acoes ficam recolhiveis
- o workspace do shell pode ser minimizado sem encerrar o atendimento aberto; ao reabrir, deve restaurar o rascunho da resposta por atendimento dentro da sessao atual
- a fila do atendente precisa ajudar decisao rapida: mostrar sinais compactos de `com voce`, `sem responsavel` e `criticos`, alem de permitir avancar para o caso anterior/proximo sem sair do detalhe
- cada linha operacional deve mostrar sinal compacto de SLA a partir de `dueAt`; quando o contrato nao expuser inicio real da responsabilidade atual, nao inferir tempo de responsabilidade no frontend
- acoes criticas do atendente usam motivo tipificado e comentario complementar separado, preservando auditoria sem depender de texto livre como chave de regra
- atendimento transferido deve continuar no mesmo detalhe e no mesmo historico; muda apenas ownership/equipe/status operacional
- previews auxiliares, como perfil, documentos ou historico relacionado, entram como drawer/aba secundaria, nao como terceira coluna permanente em telas pequenas
- permissoes finais continuam no backend; ocultar menu e apenas protecao de experiencia

## Lightweight data direction

Todo modulo do colaborador deve evitar carregar dados demais.

Regras:

- pedir ao backend apenas campos usados na tela atual
- filtrar no backend sempre que o recorte afetar volume, permissao ou ordenacao
- paginar historico, listas longas e qualquer consulta que possa crescer com o tempo
- carregar detalhes apenas na pagina de detalhe ou modulo proprio
- usar cache para dados que mudam pouco, como perfil, metadados de treinamento e referencias estaveis
- evitar joins/projecoes grandes no frontend; a API deve entregar DTOs pequenos e orientados ao uso

## Auth-first impact

Antes de construir programacao, vencimentos e chat, o primeiro fluxo completo do frontend deve ser `auth`.

Fluxos iniciais:

- criar conta
- login
- recuperar senha
- redefinir senha
- manter sessao
- logout

Status em 21 de agosto de 2026:

- tela de login conectada ao backend de `auth`
- area logada protegida por sessao local
- cabecalho da area logada ja consome o usuario autenticado
- rotas de `auth` limpam query string sensivel antes de qualquer submit ou reload
- cena de login simplificada para manter apenas profundidade distante, sem elementos proximos quebrando a imersao
- shell da area logada evoluida para um layout operacional dark-first, com sidebar, command rail e leitura por contexto
- naquele momento, o conteudo logado ainda respondia a abas internas para painel, programacao, vencimentos, avisos e suporte
- em 21 de agosto de 2026 o shell administrativo foi redesenhado para reduzir aspecto genérico e reforcar acabamento mobile-first premium
- a iteracao seguinte compactou header, cards e painéis para uma leitura mais enterprise, com menos cor e menos massa visual
- a iteracao atual adicionou alternancia real entre temas escuro e claro, com persistencia local e mesma linguagem visual nas duas variantes
- o shell administrativo agora usa fundo espacial fixo, estrelas estaticas e planetas sem animacao, com mais transparencia nas superfícies
- a composicao do fundo foi ampliada com melhor distribuicao dos planetas, satelites e parallax vertical sutil por scroll
- foi adicionada uma flutuacao ambiente minima nos corpos do fundo para manter a cena viva mesmo em repouso
- as superfícies do shell e da pagina principal foram normalizadas por camadas (`surface-1`, `surface-2`, `surface-3`) para manter o mesmo tom em todo elemento equivalente
- a pagina inicial passou a usar uma base de dashboard personalizavel por widgets, com composicao padrao para programacao, treinamentos, ASO, compromissos e chat setorial

Status em 22 de agosto de 2026:

- a home do colaborador foi simplificada para `/inbox`
- `/app` passou a redirecionar para `/inbox`
- a navegacao logada deixou de usar query string para abas e passou a usar rotas reais
- a tela inicial foi limpa para manter apenas resumo curto, filtros minimos e acoes para paginas de detalhe
- em 25 de agosto de 2026, a camada visual da area logada foi aproximada da documentacao Bubble usada como referencia estetica: grafite solido, acento vinho, menos transparencia e tipografia de sistema corporativo
- o conceito de dashboard personalizavel fica reservado para uma futura visao de gestor/admin
- a programacao do colaborador deve abrir com eventos atuais e proximos; historico entra apenas quando o usuario aciona filtro/visao especifica
- o chat por setores passou a usar API real, historico paginado, envio persistido e Socket.IO com Redis para eventos em tempo real
- a administracao de atendimento foi criada em `/atendimentos/configuracao`, carregada sob demanda e restrita no menu a `ADMIN`/`SUPPORT`
- a tela de `/atendimentos` passou a tratar o detalhe como conversa de helpdesk e a abertura ganhou fallback seguro para setores cadastrados sem assuntos ativos

Status em 31 de agosto e 1 de setembro de 2026:

- houve uma fase intermediaria com frontends separados e pacote compartilhado, registrada nas ADRs `0004` e `0006`.
- essa fase foi encerrada: o estado atual e um unico frontend Neo em `apps/neo`, com Tickets e QuickForms como modulos internos lazy.
- `/administracao/aplicativos` e a tela administrativa lazy do catalogo central: lista filtravel a esquerda e formulario de criacao/edicao a direita, restrita a `ADMIN`
- futuras telas de convite, usuarios, auditoria e revisao de acesso pertencem a `/administracao/*`, carregadas sob demanda e protegidas por `ADMIN`; a UI nunca decide a permissao final
- `/aplicativos` usa `GridList` com busca por nome/descricao e badge de destino; `NATIVE` abre rota interna, redirecionamentos externos diretos nao emitem ticket, e `TICKETS`/`QUICK_FORMS` mantem SSO opaco por serem apps internos separados
- o Hub usa `HubLayout` proprio, sem sidebar de Jornada: ele e a entrada neutra quando nao ha um app especifico na rota. A sidebar so e renderizada depois que o usuario entra na experiencia de um aplicativo.

Status em 2 de setembro de 2026:

- ADR `0006-unify-frontend-as-modules.md` foi materializada: `apps/neo` e o unico frontend publicado e PWA do Neo.
- `Jornada`, `Tickets` e `QuickForms` sao modulos internos lazy em `apps/neo/src/modules`; `TICKETS` e o codigo ativo do catalogo de Tickets.
- `/atendimentos` e `/formularios` mantem URLs diretas e entram no mesmo shell autenticado, sem recarga de origem nem ticket SSO interno.
- o Hub resolve destinos `NATIVE` localmente; apenas entradas `REDIRECT` saem do frontend Neo.
- workspaces e pacote de frontend separados foram removidos apos a consolidacao no frontend unico.
- a lateral dos modulos contem apenas navegacao e o atalho `Modulos`; nome e perfil ativo ficam no header.
- o header usa `Select` do React Aria para exibir e trocar o modulo atual apenas entre grants da sessao; avatar e identidade ficam juntos.
- a administracao global usa o mesmo shell do Neo, com lateral propria em `/administracao`, sem reutilizar a navegacao do Jornada.
- o catalogo de aplicativos esta em `/administracao/aplicativos`; a listagem, concessao/revogacao e edicao de papeis por aplicacao esta em `/administracao/usuarios`.
- o build separa React, Router, Query, Motion e icones em chunks de cache; imports do React Aria devem usar submodulos (`react-aria-components/Select`, por exemplo) para nao reunir o pacote inteiro no entrypoint.

Status em 3 de setembro de 2026:

- `/administracao/usuarios` oferece convite administrativo com nome, email, matricula opcional e selecao explicita de modulos; papeis exibidos variam conforme o modulo selecionado
- `/register` redireciona para o login central porque o fluxo inicial de conta e convite administrativo
- `/comunicados` pertence ao Jornada e usa a fixture do contrato interno; o link ao Tickets leva somente `communicationId` e `sourceModule` na navegacao

Status em 1 de outubro de 2026:

- `/administracao/usuarios` deve permitir concessao, revogacao e edicao de papeis tambem para aplicativos criados no catalogo que ainda nao tenham papeis proprios declarados; nesses casos a UI usa `Colaborador` (`MEMBER`) e `Gestor` (`MANAGER`) como conjunto padrao.
- `Neo` e um app real do portal, com entrada nativa em `/aplicativos`; areas internas como Programacao e Vencimentos continuam fora do catalogo de apps.
- convite administrativo pode receber `previewToken` somente fora de producao; em producao o usuario recebe email SMTP com link para `/convite?token=...`, define a senha e entra no app.
- em desenvolvimento, `/administracao/usuarios` mostra o link de aceite retornado por `previewToken` logo apos criar o convite, para simular primeiro acesso de usuarios reais sem consultar a API manualmente.
- usuarios com status `PENDING` exibem acao `Reenviar acesso`, que invalida o convite anterior no backend e devolve novo email/link de aceite conforme o ambiente.
- `/convite` e uma rota publica independente do `AuthLayout` antigo e usa o mesmo sistema visual da pagina atual de login, incluindo fundo grafite/vinho, painel editorial e campos `neo-login`.

Status em 23 de setembro de 2026:

- a area logada do Neo Jornada passou a seguir o design system claro/editorial proposto para a Inbox, com superficies opacas, divisorias simples, vermelho vinho contido e tipografia de interface unica
- `/inbox` ganhou composicao de fila de trabalho com filtros por abas, busca e painel de leitura lateral no desktop, sem bloco introdutorio
- `/aplicativos` voltou ao portal visual offshore escuro, com imagem de plataforma no hero, busca compacta, filtros por categoria e cards claros acionaveis sobrepostos na divisa entre hero e conteudo
- `/aplicativos` lista os apps reais disponiveis no ecossistema atual: `Jornada`, `Tickets`, `QuickForms` e `Neo`; nao deve listar areas internas como Programacao, Vencimentos, Documentos ou Relatorios como se fossem apps
- Tickets Atendimentos segue a linguagem visual da `/inbox`: lista/detalhe, controles compactos, superficies claras/editoriais, vermelho vinho escasso e divulgacao progressiva para detalhes operacionais
- a mesa operacional do Tickets usa filas orientadas a acao: `Para assumir`, `Meus atendimentos`, `Da equipe`, `SLA critico` e `Todos`; `Todos` e consulta, nao fluxo principal
- no desktop, Tickets usa list/detail para preservar contexto; no mobile, a fila abre primeiro e o atendimento ocupa tela inteira, com `Detalhes` atras de controle explicito
- o shell deve manter fundo neutro empresarial: o vermelho vinho fica reservado a marca, acoes e estados selecionados, sem tingir o canvas principal
- no mobile, a identidade do usuario aparece no topo esquerdo com primeiro nome e perfil; `Perfil` fica no menu `Mais` para preservar uma barra inferior de icones enxuta
- a densidade visual foi compactada para aproximar a sensacao de trabalho do app ao uso em 75% de zoom, mas com escala real em 100% no navegador
- o fundo espacial permanece como linguagem das telas de autenticacao e legado visual, mas nao deve comandar as superficies principais da area logada
- a Inbox deve se comportar como caixa de trabalho: abre em `Acao`, mostra somente itens acionaveis nesse filtro, reserva `Tudo` para a lista completa e deixa a acao primaria apenas no painel de detalhe
- a Inbox deve abrir direto nos controles e na lista; evitar titulo editorial, slogan ou texto explicativo acima dos filtros
- vermelho vinho `#9f2635` e dourado operacional `#a66a05` sao os tons de referencia para selecao, acoes e prazos na area logada clara

## What we should avoid

- usar kit visual fechado e depois lutar contra ele
- misturar `React Aria`, `Radix` e outra base de primitives sem criterio
- criar componentes fora de uma estrategia de design system leve
- priorizar desktop antes da experiencia mobile
- criar novos `rgba()` locais para cards/painéis quando ja existe um token de superfície equivalente
- criar widgets com cores proprias que quebrem as camadas compartilhadas do painel
- transformar a home do colaborador em painel administrativo
# Programacao externa controlada

A rota `/programacao` consulta `GET /api/boarding-schedule/me` somente quando existe sessao autenticada. Sem sessao, fixtures continuam sendo o seam visual e de teste. A tela nunca monta URL, credencial ou payload do Drake.

Administradores recebem uma busca de validacao separada para o piloto. A escolha explicita do colaborador chama somente os endpoints administrativos de preview; esse controle nao existe para perfis de colaborador e nao muda a semantica do endpoint `me`.
