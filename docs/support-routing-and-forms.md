# Support Routing And Forms

## Decision

Atendimentos sao a entrada unica para duvidas breves e demandas formais do funcionario.

O funcionario deve escolher informacoes simples:

1. setor visivel
2. assunto
3. campos especificos quando o assunto exigir
4. descricao complementar opcional

O roteamento interno fica escondido da experiencia principal.

## Employee Support UX

A tela do funcionario deve priorizar visualizacoes separadas, nao uma composicao unica com tudo junto.

Visualizacoes:

- `list`: primeira visualizacao; mostra filtros, busca, lista de solicitacoes e acao curta para abrir uma nova
- `new`: fluxo dedicado para criar atendimento; mostra setor, assunto, descricao, sugestao local e formulario do assunto quando existir
- `detail`: acompanhamento do atendimento selecionado; deve parecer uma conversa de helpdesk, com mensagens em bolhas, eventos do sistema discretos, composer fixo no rodape do card e contexto/acoes em painel compacto

### Workspace do atendente

Direcao:

- colaborador comum continua em fluxo simples de lista, abertura e detalhe, sem janelas flutuantes obrigatorias
- atendente/gestor pode abrir o atendimento em um `workspace` desacoplado da listagem, pensado para consultar outras telas do app sem perder a conversa
- esse `workspace` deve ser um painel flutuante acoplado ao shell, nao uma janela solta do navegador nem um modal central bloqueando tudo
- no desktop largo, a fila continua como ancora principal; o `workspace` abre sobre a area de conteudo, com largura controlada, cabecalho compacto, composer fixo e contexto recolhivel
- no tablet e mobile, o atendente usa tela dedicada de detalhe, sem flutuacao permanente, para preservar foco, area util e previsibilidade

Regras:

- o atendimento aberto no `workspace` precisa ficar refletido na URL para sobreviver a `F5`, link direto e retomada de sessao
- a fila nao pode desaparecer quando o atendente alterna entre casos; ela continua como lista principal ou como drawer/coluna recolhivel, conforme largura disponivel
- alternancia entre funcionarios deve acontecer por fila, proximos/anterior e busca, nao por pilha de janelas flutuantes
- ao entrar no app, perfis operacionais devem cair direto em `/atendimentos?fila=para-assumir`, reduzindo cliques e reforcando os casos sem atendente como primeira acao
- a fila do operador precisa expor visoes prontas de `Para assumir`, `Meus atendimentos`, `Da equipe`, `SLA critico` e `Todos`
- o `workspace` pode ser minimizado, fixado e reaberto, mantendo rascunho de mensagem local por atendimento enquanto a sessao estiver ativa
- contexto operacional detalhado deve ir para um painel secundario recolhivel dentro do `workspace`; a conversa continua sendo o foco dominante
- a mesma base de detalhe deve servir ao `workspace` desktop e a tela dedicada mobile, evitando dois fluxos de negocio diferentes
- transferir o atendimento para outra equipe deve devolver o caso para a fila de destino, limpando o responsavel atual e preservando o historico

Regras:

- a listagem e a entrada padrao de `/atendimentos`
- a lista deve se comportar como tabela compacta no desktop e como linhas acionaveis no mobile
- a lista rola internamente quando crescer, preservando o shell da aplicacao
- criacao nao deve dividir tela com detalhe, para evitar o funcionario preencher no contexto errado
- detalhe nao deve dividir tela com criacao, para manter foco na conversa de atendimento, contexto e acoes
- o funcionario escolhe setor e assunto; equipe interna continua invisivel
- se o setor ainda nao tiver assunto ativo, a abertura pode seguir como `Geral do setor`, usando apenas `departmentId` e roteamento fallback no backend
- perfis `ADMIN`/`SUPPORT` podem usar o catalogo administrativo como fallback de visualizacao quando o catalogo publico vier vazio; colaborador comum continua limitado ao catalogo ativo
- `ADMIN` pode usar a selecao global temporaria do shell Jornada para validar `/atendimento` como outro colaborador, sem relogin; a API aceita apenas referencia opaca de preview, resolve para usuario interno ativo vinculado a matricula e registra o ator administrativo nos metadados
- filtros e busca ficam na faixa compacta da pagina, com botao `Novo` sempre acessivel
- no detalhe do atendente, a troca entre `conversa`, `dados do solicitante`, `historico` e `acoes` pode virar abas compactas ou paineis recolhiveis, principalmente em mobile
- a experiencia do atendente deve priorizar triagem, resolucao e transferencia; elementos de conversa generica ficam subordinados ao ciclo do atendimento
- campos e mensagens devem manter microcopy de minimizacao de dados sensiveis sem burocratizar o fluxo

## Domain Layers

### Employee-facing

- `SupportDepartment`: setor visivel para o funcionario
- `SupportTopic`: assunto selecionavel dentro do setor
- `FormDefinition`: formulario versionado e reutilizavel, independente do atendimento
- `FormField`: campo versionado do formulario
- `SupportTopicFormBinding`: vinculo entre assunto de atendimento e formulario

### Operational

- `SupportTeam`: equipe/fila interna
- `SupportTeamMember`: atendente vinculado a uma ou mais equipes
- `SupportRoutingRule`: regra que roteia setor/assunto para equipe
- `SupportRoutingRule.conditions`: politica JSON opcional avaliada contra campos do formulario
- `SupportCase`: atendimento criado
- `SupportCaseFieldValue`: respostas estruturadas do atendimento

### Intelligence

- `SupportTriageSuggestion`: sugestao auditavel de roteamento por regra, IA local ou IA externa

## Three-phase Plan

### Phase 1 - Catalog And Simple Routing

Status: implemented with employee and admin surfaces.

Entregas:

- setores visiveis ao funcionario
- assuntos por setor
- regras simples `department + topic -> team`
- abertura de atendimento por setor/assunto
- fallback legado por `teamCode`
- seeds iniciais para setores, assuntos, equipes e regras
- frontend com `Setor` e `Assunto`
- tela administrativa para criar setores, assuntos, equipes, membros e regras

Limite inicial:

- IA
- grupos avancados de condicoes aninhadas

### Phase 2 - Topic Forms

Status: implemented with versioned admin publishing, conditional fields, conditional routing, per-topic opening policy and decoupled form definitions.

Entregas:

- formulario versionado e independente do atendimento
- vinculo de formulario com assunto por `SupportTopicFormBinding`
- campos tipados
- respostas salvas de forma estruturada
- campos sensiveis protegidos na resposta do detalhe
- condicionais simples de visibilidade e obrigatoriedade por campo
- regras de roteamento podem avaliar respostas do formulario
- exemplos iniciais: ferias, ASO, atestado e contracheque
- biblioteca central `/formularios` para listar formularios versionados
- criacao/edicao em `/formularios/novo` e `/formularios/:formKey/editar` usando o criador visual proprio do Jornada
- administracao dedicada de fontes de opcoes em `/formularios/fontes`, separada da biblioteca e do editor

Regras:

- formulario e versionado para nao quebrar atendimentos antigos
- cada chave de formulario pode ter no maximo uma versao `ACTIVE` publicada e uma versao `DRAFT` em edicao
- salvar rascunho reutiliza o `DRAFT` existente da chave; publicar transforma o rascunho em `ACTIVE` e arquiva o `ACTIVE` anterior
- a versao publicada continua atendendo novos atendimentos ate que o rascunho seja publicado
- publicacao exige confirmacao explicita no editor, com resumo das alteracoes e origem/destino da versao
- salvar rascunho ou publicar retorna para a biblioteca `/formularios`, com destaque temporario no formulario atualizado e data da ultima alteracao
- a API deve retornar `latest` como a versao mais relevante para manutencao: `DRAFT` quando houver edicao pendente, senao `ACTIVE`, senao a versao inativa mais recente
- a biblioteca de formularios deve permitir busca por nome/chave/vinculo/status e ordenar por ultima atualizacao, criacao ou nome
- a biblioteca mostra criacao e atualizacao como colunas separadas para auditoria operacional rapida
- nome visivel de formulario deve ser unico no cadastro; versoes do mesmo formulario podem manter o mesmo nome, mas outro formulario logico nao pode reutilizar esse titulo
- formulario pode pertencer a um setor ou ser global, sem nascer preso ao suporte
- criacao de formulario fica fora da configuracao de atendimento, em `/formularios`
- permissao inicial de criacao/versionamento: `ADMIN` e `TI`
- assunto usa vinculo com formulario; isso permite mais de um formulario por assunto futuramente
- MVP usa o primeiro vinculo ativo como formulario principal de abertura
- resposta do atendimento guarda a versao exata usada
- assunto continua separado do formulario; ele escolhe formulario, rota, politica de abertura e SLA futuro
- titulo do atendimento deve ser gerado por assunto e campos principais do formulario, com edicao por operador autorizado
- mensagem inicial vira observacao livre: obrigatoria em assunto generico ou sem formulario suficiente, opcional quando o formulario ja coleta o contexto necessario
- assuntos podem definir politica de abertura: conversa continua, solicitacao individual ou chave de negocio
- reembolso, ferias, documentos e pedidos formais devem preferir solicitacao individual para nao misturar ciclos de SLA e aprovacao
- ASO e treinamentos podem evoluir para chave de negocio quando fizer sentido agrupar por requisito especifico
- politica por chave de negocio usa `businessKeyFieldCode`; o campo precisa existir no formulario, estar preenchido e nao ser sensivel
- aprovacoes futuras devem nascer como fluxo proprio vinculado ao atendimento/formulario enviado, nao como campo comum do formulario
- MVP de aprovacao implementa regras administrativas em `/atendimentos/configuracao/aprovacoes`
- fila operacional de decisoes fica em `/atendimentos/aprovacoes`
- regras de aprovacao podem ser automaticas por assunto/formulario/condicoes ou manuais por operador autorizado
- aprovacao usa `SupportTeam` como equipe aprovadora e registra eventos de decisao
- `WAITING_APPROVAL` indica atendimento aguardando equipe aprovadora, sem remover o atendimento da fila de origem
- `SupportResponsibilityPeriod` separa o tempo de suporte, colaborador, equipe aprovadora e externo para calculos de SLA
- transferencia entre equipes recalcula o prazo operacional para a equipe de destino, preservando o prazo anterior em evento auditavel
- resolucao usa ciclo em dois passos: `RESOLVED` durante a janela de avaliacao/reabertura e `CLOSED` como encerramento final
- colaborador pode reabrir explicitamente um atendimento resolvido em ate 7 dias, com mensagem obrigatoria; a reabertura volta para o backlog da ultima equipe responsavel
- motivos de transferencia, resolucao, fechamento e reabertura sao tipificados por acao, com comentario complementar opcional
- na UX, motivo tipificado e comentario devem ficar separados; o motivo alimenta regra/auditoria e o comentario registra contexto humano
- o Inbox do colaborador mostra apenas atendimento acionavel: resposta aguardando retorno ou atendimento resolvido recente sem avaliacao
- a fila operacional mostra SLA por `dueAt` e nao deve inventar tempo de responsabilidade enquanto o contrato nao expuser o marco real
- a mesa operacional de `/atendimentos` abre em `Para assumir`; as demais visoes sao `Meus atendimentos`, `Da equipe`, `SLA critico` e `Todos`
- `Para assumir` contem atendimentos ativos sem atendente; `Meus atendimentos` contem atendimentos ativos atribuidos ao usuario atual; `Da equipe` e cobertura/coordenação; `Todos` e consulta ampla
- o detalhe do atendimento deve mostrar conversa e acao primaria contextual primeiro; campos, historico, transferencia e demais acoes ficam em `Detalhes` por divulgacao progressiva
- regras de campo sao configuradas pelo builder proprio e executadas no frontend com runtime leve de campos tipados
- backend reavalia visibilidade e obrigatoriedade antes de salvar para evitar bypass por cliente alterado
- condicional de campo deve depender apenas de campos anteriores para evitar ciclos e formulario confuso
- roteamento condicional usa `fieldCode`, nao label visivel, para resistir a ajustes de texto
- regra sem `conditions` funciona como fallback/caso contrario
- prioridade menor vence primeiro; deixe fallback com prioridade numericamente maior quando regras condicionais devem ganhar
- campo sensivel nao deve voltar aberto no DTO de detalhe
- anexo fica fora ate existir storage privado e politica de retencao
- chaves tecnicas de formulario e campo devem ser geradas automaticamente a partir do titulo e rotulo
- edicao manual de chave tecnica fica bloqueada no MVP e reservada para futuro controle por perfil

Formato tecnico persistido em `conditions`:

```json
{
  "all": [
    { "fieldCode": "requestType", "operator": "equals", "value": "ASO" }
  ]
}
```

Operadores suportados:

- `equals`
- `notEquals`
- `in`
- `contains`
- `exists`

Exemplo operacional:

- assunto `Medicina / ASO`
- se `requestType = Atestado`, encaminha para equipe de Atestados
- se `requestType = ASO`, encaminha para equipe de ASO
- sem condicao correspondente, cai na regra fallback da Medicina

Configuracao no admin:

- o usuario operacional usa um builder visual de regras
- cada linha segue `Se [campo do formulario] [operador] [valor]`
- `Todas (E)` significa que todas as linhas precisam bater (`AND`)
- `Qualquer (OU)` significa que uma linha batendo ja permite a regra (`OR`)
- campos `SELECT` e `BOOLEAN` devem oferecer selecao de valor em vez de texto livre
- a tela gera o JSON tecnico para a API sem expor sintaxe ao usuario

Configuracao de campos condicionais:

- formularios usam runtime proprio no frontend para renderizar campos dinamicos
- a montagem administrativa fica em `/formularios/novo` e `/formularios/:formKey/editar`, fora das demais configuracoes, para reduzir acoplamento visual e cognitivo
- a tela de montagem usa builder proprio com campos tipados, preview e painel de propriedades compacto
- condicionais de visibilidade e obrigatoriedade ficam em `visibleWhen` e `requiredWhen` nos campos tipados
- o editor possui preview interativo sem publicar, para testar preenchimento, visibilidade e obrigatoriedade antes de versionar o formulario
- `/formularios` fica apenas como biblioteca/listagem central
- `Mostrar se` controla quando um campo aparece
- `Obrigatorio se` controla quando um campo passa a ser exigido
- operadores iniciais: `=`, `!=`, `contem` e `preenchido`
- combinacoes `E`/`OU` ficam no JSON de condicoes gerado pelo builder visual proprio
- valores booleanos aparecem como `Sim` e `Nao`
- valores de `SELECT` aparecem como lista fechada
- o JSON tecnico continua persistido no banco, mas nao e editado diretamente pelo usuario
- roteamento para equipe continua separado e roda somente depois que o formulario foi enviado e validado

Select dinamico por fonte remota:

- `SELECT` continua aceitando lista manual curta para formularios simples
- para catalogos volumosos, o campo deve apontar para uma `fonte de opcoes` reutilizavel em vez de gravar milhares de valores no formulario
- a fonte e cadastrada separadamente por um perfil administrativo autorizado; o formulario referencia apenas sua chave estavel
- a configuracao da fonte pode conter endpoint, metodo, parametros, mapeamento da resposta e politica de cache, mas esses dados pertencem ao dominio de integracoes, nao ao schema publico do formulario
- o endpoint externo nunca e chamado pelo navegador; a consulta passa por um endpoint interno do Jornada, que aplica autenticacao, allowlist de destinos, timeout, limite de resposta e sanitizacao de erros
- a administracao inicial da fonte fica em uma tela dedicada, com listagem, cadastro, edicao e preview normalizado antes do vinculo ao formulario
- credenciais nao ficam no formulario, no banco em texto puro ou na resposta da API; devem ser referenciadas por um segredo/configuracao segura do ambiente
- backend deve usar adapters para traduzir diferentes origens para um contrato unico de opcoes
- busca, filtro, paginacao e cache acontecem sempre no backend
- frontend consome apenas um contrato padrao como `items`, `value`, `label`, `meta`, `page`, `pageSize`, `total` e `hasMore`
- para volume alto, a experiencia ideal e `combo box` com busca remota e carregamento incremental, nao `select` totalmente carregado
- cada fonte deve poder definir TTL de cache, estrategia de busca e auditoria minima de consulta sem expor dado sensivel
- implementacao recomendada: `OptionSource` + `OptionSourceAdapter` + `OptionSourceQueryService` + endpoint interno unico de consulta normalizada
- rotas administrativas atuais:
  - `GET /api/forms/option-sources`
  - `GET /api/forms/option-sources/:sourceKey`
  - `POST /api/forms/option-sources`
  - `PATCH /api/forms/option-sources/:sourceKey`
  - `POST /api/forms/option-sources/preview`
  - `GET /api/forms/option-sources/:sourceKey/options`

Contrato inicial proposto:

```text
OptionSource
  key: identificador interno estavel
  name: nome exibido no admin
  adapterType: STATIC | HTTP_JSON
  status: ACTIVE | INACTIVE
  config: configuracao privada do adapter
  cacheTtlSeconds: politica de cache

FormField (SELECT)
  optionsMode: MANUAL | REMOTE
  options: lista curta quando MANUAL
  optionSourceKey: chave da fonte quando REMOTE
  searchable: permite busca no combo
  minSearchChars: minimo para consultar catalogo grande
  pageSize: limite por consulta

GET /api/forms/option-sources/:sourceKey/options?q=&cursor=&limit=
  { items: [{ value, label, meta? }], nextCursor, hasMore }
```

Regras de evolucao:

- primeira entrega: `STATIC` e `HTTP_JSON` somente para fontes previamente permitidas pelo backend
- o adapter HTTP deve aceitar mapeamento explicito de `value` e `label`, sem executar codigo ou expressao fornecida pelo usuario
- timeout HTTP fica parametrizado em ambiente e nao no formulario
- preferir cursor para catalogos grandes; pagina e total podem ser adicionados quando a origem fornecer essa informacao com confiabilidade
- cachear somente respostas elegiveis e separar a chave por fonte, consulta e contexto permitido
- rejeitar fonte inativa, consulta acima do limite, destino fora da allowlist, redirecionamento nao permitido e resposta fora do contrato
- registrar auditoria tecnica minima da consulta sem armazenar token, resposta completa ou dados pessoais desnecessarios
- fontes dependentes de outro campo serao suportadas depois com parametros de contexto allowlisted, mantendo o mesmo endpoint interno

### Phase 3 - Intelligent Triage

Status: initial local rules implemented.

Direcao:

- comecar por regras locais e palavras-chave
- usar IA apenas como sugestao, nao decisao final obrigatoria
- registrar sugestao, origem, confianca e aceite/rejeicao
- mascarar dados pessoais antes de qualquer IA externa
- controlar custo por limite de tokens, cache e acionamento sob baixa confianca

RAG entra apenas quando houver base de conhecimento, politicas internas ou documentos de procedimento.

Implementacao atual:

- `POST /support/triage/suggestions`
- regras locais por palavras-chave
- armazenamento de hash do texto, sem persistir o texto bruto
- sugestao conectada na abertura de atendimento

## Initial Catalog

Setores iniciais:

- Financeiro
- Medicina
- Treinamentos
- RH
- Logistica
- Departamento Pessoal
- Almoxarifado
- SMS
- TI
- Outros

Assuntos iniciais:

- Reembolso
- ASO
- Atestado
- Certificado de treinamento
- Ferias
- Beneficios
- Embarque e deslocamento
- Contracheque
- Dados cadastrais
- Uniforme ou material
- Seguranca ou incidente
- Acesso a sistemas
- Nao encontrei meu assunto

## Safety Rules

- funcionario nao escolhe equipe interna diretamente
- regra de roteamento roda no backend
- condicoes de roteamento sao avaliadas no backend depois da validacao do formulario
- DTOs de catalogo sao pequenos
- campos de formulario podem ser marcados como sensiveis
- valores sensiveis nao devem aparecer abertos em detalhe comum
- qualquer IA externa futura deve operar com minimizacao, mascaramento e auditoria
- exclusao de configuracao nao pode quebrar historico ou relacionamento operacional
- quando houver vinculo, a API deve inativar (`INACTIVE`) em vez de apagar
- hard delete fica restrito a registros sem vinculos relacionados
- exclusao direta no banco nao deve ser usada para contornar as policies da API

## Permission Direction

Modelo atual:

- `RBAC` por roles no token (`ADMIN`, `SUPPORT`, `TI`, `MEDICINE`, `OPERATIONS`, `EMPLOYEE`)
- `ADMIN` e `SUPPORT` possuem visao ampla dos atendimentos e catalogo operacional
- roles setoriais usam restricao por fila/equipe nos fluxos de atendimento
- colaborador comum nao acessa configuracao de atendimento

Direcao alvo:

- manter `RBAC` para capacidade geral: acessar, configurar, atender, administrar
- adicionar `ABAC` leve para escopo: setor, equipe, membership, assunto e regra relacionada
- criar/alterar/excluir setores fica restrito a admin global do app
- criar/alterar/excluir assuntos, equipes, membros, regras e formularios deve respeitar o setor/equipe do usuario quando ele nao for admin global ou gestor amplo
- gestores e administradores globais veem todos os setores
- cada setor ve e mantem apenas assuntos, equipes, regras e formularios relacionados ao seu escopo

Status em 23 de agosto de 2026:

- exclusao segura de setor, assunto, equipe, membro e regra foi adicionada no backend
- setor agora exige admin global para manutencao
- cliente web ja possui chamadas DELETE e botoes compactos para consumir essas acoes
- cliente web ja permite carregar setores, assuntos, equipes e regras para edicao e alternar ativo/inativo
- cliente web deixa Setores em modo somente leitura para `SUPPORT`, alinhado com a regra `ADMIN` global do backend
- cliente web ja permite cadastrar condicoes por builder visual compacto
- cliente web usa runtime proprio para renderizar formulario do funcionario com `visibleWhen` e `requiredWhen`
- cliente web separa biblioteca de formularios da criacao/edicao com builder proprio do Jornada
- API usa `FormDefinition.schema` como JSON tecnico de compatibilidade, `FormField` como nucleo tipado principal e `SupportTopicFormBinding` para plugar formularios no suporte
- API ja valida campos condicionais no backend antes de salvar atendimento
- API ja roteia atendimento por resposta do formulario usando `SupportRoutingRule.conditions`
- falta transformar o escopo setorial em policy dedicada reutilizavel para completar o ABAC fino

## Next Admin Work

Para os setores cadastrarem seus proprios assuntos, a entrega administrativa inicial ja inclui:

- endpoints administrativos protegidos por `ADMIN` ou `SUPPORT`
- cadastro/upsert de setores por codigo apenas por `ADMIN` global
- visualizacao de setores por `SUPPORT` em modo somente leitura
- cadastro/upsert de assuntos por setor
- cadastro/upsert de equipes internas
- vinculo de atendentes elegiveis a multiplas equipes
- cadastro de regras `setor + assunto opcional -> equipe`
- publicacao de nova versao de formulario em `/formularios/novo` ou `/formularios/:formKey/editar`
- indice web `/atendimentos/configuracao`, oculto para colaborador comum
- paginas dedicadas para setores, assuntos, equipes e regras; formularios ficam em dominio proprio
- cadastro visual inicial de condicoes em regras para validar roteamento por formulario
- cadastro visual inicial de condicionais de campo para visibilidade e obrigatoriedade

Essa administracao deve ser separada da experiencia do funcionario e protegida por permissao de atendimento/admin.

Proximas melhorias administrativas:

- edicao fina e inativacao diretamente nas listas
- policy dedicada de permissao por setor/equipe para catalogo administrativo
- sinonimos administraveis para triagem local
- evoluir builder visual com grupos, templates, previews e validacao por tipo de campo
- metricas de uso por assunto, setor, equipe e formulario
