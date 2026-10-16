# Jornada Context

## Objetivo

Este arquivo fixa o vocabulario de dominio que ja foi decidido para evitar nomes duplicados, fluxos ambiguos e implementacoes divergentes entre frontend, backend e documentacao.

## Vocabulario oficial

### Fonte Externa

Sistema fora do dominio interno do Jornada que pode alimentar dados do aplicativo no futuro.

_Avoid_: API como nome de dominio, webhook ativo por padrao, sistema fonte ativo sem decisao.

### Contrato Interno do Jornada

Formato de dado que as telas e regras do Jornada consomem independentemente da origem externa.

_Avoid_: payload externo como modelo da tela, resposta da API externa como dominio.

### EmployeeProfile

Resumo do colaborador consumido pelo Jornada.

_Avoid_: payload de funcionario externo, cadastro bruto do sistema origem.

### UserProfilePreference

Ajustes pessoais editaveis pelo proprio usuario, separados dos dados oficiais
de `Person` e `Employee`.

Exemplos atuais:

- nome de preferencia
- telefone
- contato de emergencia
- base principal
- canal preferido de aviso

_Avoid_: sobrescrever nome oficial, CPF, matricula, setor ou dado vindo de
fonte corporativa pela tela de perfil do colaborador.

### ScheduleItem

Item de programacao do colaborador.

_Avoid_: evento bruto de agenda externa, linha de planilha como modelo da tela.

### RequirementExpiration

Pendencia ou vencimento operacional associado ao colaborador.

_Avoid_: documento completo, exame completo, payload bruto de vencimento.

### InboxItem

Sinal resumido e acionavel da home do colaborador.

_Avoid_: widget de dashboard, detalhe completo de modulo.

### Communication

Comunicado operacional direcionado ao colaborador ou a um publico autorizado.

_Avoid_: notificacao tecnica, mensagem de chat, log operacional.

### Communication To Tickets Handoff

Navegacao contextual de um `Communication` do Jornada para o Tickets, sem
leitura ou escrita direta entre tabelas dos modulos.

O contexto minimo inclui identificador do comunicado, modulo de origem e rota
permitida. A criacao futura de atendimento sera comando idempotente do Tickets.

### IntegrationSyncRun

Registro de execucao de uma importacao, webhook ou sincronizacao de Fonte Externa.

_Avoid_: log bruto, payload externo salvo como trilha oficial.

_Avoid_: tratar como cadastro de colaborador, contrato interno do Jornada ou
mensagem enviada de fato ao colaborador.

### IntegrationSource

Nome tecnico futuro para representar uma Fonte Externa quando ela precisar ser cadastrada, sincronizada ou auditada.

_Avoid_: ExternalSource, DataSource, API.

### Module

Experiencia funcional interna do Neo, publicada dentro do mesmo frontend e protegida por acesso contextual.

Exemplos atuais:

- Jornada
- Tickets
- QuickForms

Um modulo possui rota, navegacao, permissoes, telas, testes e regras de dominio proprias, mas nao exige frontend, sessao ou PWA separados.

_Avoid_: chamar todo modulo interno de aplicacao quando a conversa for de produto ou UX.

### Atendimento

Unidade de trabalho do Tickets para registrar, acompanhar e resolver uma solicitacao.

Um atendimento pode ter conversa, campos de formulario, responsavel, equipe,
SLA, eventos de auditoria e avaliacao, mas a tela principal deve tratar o
atendimento como o objeto central. A conversa e parte do atendimento, nao o
dominio inteiro.

_Avoid_: chamado como apenas chat, ticket como termo principal na interface,
demanda generica sem responsavel operacional.

### Para Assumir

Fila de atendimentos ativos da equipe que ainda nao possuem atendente
responsavel.

_Avoid_: backlog da equipe, sem responsavel como nome principal da fila.

### Meus Atendimentos

Fila de atendimentos ativos atribuidos ao usuario operacional atual.

_Avoid_: comigo, minha fila.

### Da Equipe

Visao dos atendimentos ativos acessiveis pela equipe do usuario operacional,
incluindo atendimentos atribuidos a colegas.

_Avoid_: todos como fluxo principal de trabalho.

### SLA Critico

Fila operacional de atendimentos ativos com prioridade alta/urgente ou prazo
vencido.

_Avoid_: alta prioridade quando o criterio tambem inclui prazo.

### Todos

Visao de consulta ampla dos atendimentos acessiveis ao usuario operacional.

_Avoid_: usar Todos como entrada principal de trabalho diario.

### External Application

Sistema fora do frontend Neo para o qual o Hub pode apenas redirecionar um usuario autorizado.

Nao e modulo interno, nao compartilha automaticamente a sessao e nao pode ser tratado como parte do bundle ou das regras de negocio do Neo.

### Administrative Invitation

Convite emitido por um `ADMIN` global para iniciar uma conta controlada no
Neo, entregue ao email de contato valido do destinatario, corporativo ou
pessoal.

O destinatario define a propria senha ao aceitar o convite. Convite nao e
recuperacao de senha, nem concede permissao fora dos acessos explicitamente
atribuidos a conta.

### Account Lifecycle

Estados administrativos de uma conta de acesso: pendente de convite, ativa,
bloqueada ou desativada.

O ciclo de vida da conta e diferente do vinculo operacional de `Employee` e
do acesso contextual a um modulo.

### Access Grant

Autorizacao explicita que permite a uma conta abrir um modulo ou aplicacao.

Nao existe acesso padrao no convite administrativo. Cada `Access Grant` tem
um contexto de aplicacao e pelo menos um papel contextual.

### Platform Administrator

Pessoa com o unico papel global `ADMIN`, responsavel por configuracoes
transversais do Neo, como usuarios, catalogo, grants e auditoria.

Nao representa, por si so, ownership ou atuacao irrestrita nos dominios dos
modulos.

### Application Role

Papel versionado e definido pelo proprio modulo para expressar a atuacao de
uma pessoa naquele contexto.

O banco registra a atribuicao; capacidades e policies correspondentes vivem
no codigo do modulo. Papeis nao sao criados livremente por administradores.

### Domain Policy

Regra de autorizacao executada no backend por um modulo.

Combina papel contextual com fatos do dominio, como equipe, setor, ownership
e estado do recurso. Uma `Application Role` sozinha nao autoriza uma acao que
depende desses fatos.

### Access Change Reason

Motivo estruturado associado a uma alteracao administrativa sensivel de
acesso. Usa uma categoria controlada e pode ter comentario sanitizado.

Nao e justificativa livre sem classificacao, nem substitui o evento auditado.

### Access Review

Revalidacao periodica de um `Access Grant` por uma pessoa responsavel.

Nao e concessao nova, nem revogacao automatica. O primeiro ciclo registra
pendencia, responsavel e prazo para reduzir acessos esquecidos.

### Security Notification

Aviso transacional enviado a conta quando uma acao administrativa sensivel
altera sua entrada, estado, email ou papel.

Informa a acao, data e canal de suporte, sem expor segredo ou dado sensivel.

### Global Administrator Elevation

Promocao de uma pessoa para o papel global `ADMIN` por outro administrador.

Exige motivo, dupla confirmacao e auditoria. Autoelevacao nao e permitida.

### Session Revocation

Encerramento administrativo de todas as sessoes ativas de uma conta sem mudar
seu estado de acesso.

Usado em incidente, perda de dispositivo ou mudanca de funcao; exige motivo,
auditoria e aviso de seguranca.

### Tickets

Nome de produto do modulo operacional de atendimento antes denominado Tickets.

Responsabilidades:

- filas, ownership e SLA
- configuracao de setores, assuntos, equipes e roteamento
- workspace de atendimento e auditoria operacional

_Avoid_: tratar Tickets como dono de formularios ou como simples pagina de chat.

### SupportDepartment

Setor visivel para o funcionario.

Exemplos:

- Financeiro
- RH
- Medicina
- TI

Responsabilidades:

- aparecer na abertura do atendimento
- agrupar assuntos visiveis ao funcionario
- servir como contexto primario de triagem e roteamento

### SupportTopic

Motivo ou assunto escolhido dentro de um setor.

Exemplos:

- Contracheque
- Ferias
- ASO
- Atestado

Regras:

- o setor e obrigatorio na abertura
- o assunto e opcional no MVP
- sem assunto, o atendimento nasce como `Geral do setor`
- o assunto classifica a demanda, escolhe formulario, rota, SLA futuro e politica de abertura
- o assunto nao deve ser tratado como campo comum do formulario

### Case Opening Policy

Politica que define como um assunto abre ou reutiliza atendimento.

Modos canonicos:

- `conversa continua`: uma nova mensagem reaproveita atendimento ativo do mesmo funcionario, setor e assunto
- `solicitacao individual`: cada envio validado abre um atendimento proprio
- `chave de negocio`: reaproveita ou cria atendimento conforme uma chave derivada da demanda

Exemplos:

- duvida geral de RH usa conversa continua
- reembolso usa solicitacao individual
- ASO ou treinamento pode usar chave de negocio quando houver requisito especifico

Regras:

- a politica pertence ao assunto, nao ao formulario
- formulario pode fornecer campos que ajudam a montar titulo, chave de negocio, roteamento e aprovacao
- ciclos de SLA nao devem ser misturados quando a demanda representa solicitacoes independentes

### SupportTeam

Estrutura interna de operacao.

Pode representar:

- fila operacional
- equipe especializada
- caixinha interna de atendimento

Nao e visivel como escolha para o funcionario.

Exemplos:

- Medicina - Atestados
- Medicina - ASO
- RH - Ferias

### Team backlog

Fila compartilhada da equipe.

Regras:

- itens sem responsavel ficam no backlog da equipe autorizada
- a interface chama esse recorte de `Para Assumir`
- a mesa operacional usa `Para Assumir`, `Meus Atendimentos`, `Da Equipe`, `SLA Critico` e `Todos`

### Ownership

Camada de posse operacional do atendimento.

Regras:

- item sem responsavel pertence ao backlog da equipe atual
- item assumido pertence ao atendente atual
- gestores e admins operacionais podem atravessar ownership quando permitido
- transferencia entre equipes limpa o responsavel atual e devolve o item ao backlog da equipe de destino

### SupportCase

Atendimento em si.

Regras:

- uma transferencia nao cria outro atendimento no MVP
- o mesmo atendimento preserva a conversa, os eventos e a trilha de auditoria
- historico de transferencia deve ficar no mesmo caso
- titulo e resumo humano do atendimento; pode ser gerado automaticamente e editado por operador autorizado
- descricao/mensagem inicial e texto livre da conversa, nao campo estrutural do formulario
- formularios podem anexar respostas estruturadas ao atendimento sem virar o proprio atendimento

### FormDefinition

Formulario versionado e independente do suporte.

Regras:

- pertence ao dominio `/forms`
- pode ser reutilizado por mais de um fluxo no futuro
- atendimento nao toma posse do formulario; apenas consome por vinculo

### SupportTopicFormBinding

Vinculo entre assunto e formulario.

Regra atual do MVP:

- um assunto pode ter varios vinculos no modelo
- apenas um vinculo principal ativo deve ser usado na abertura do atendimento

### ApprovalRequest

Solicitacao de aprovacao gerada a partir de uma demanda.

Regras:

- aprovacao nao e campo de formulario
- aprovacao pode nascer de um atendimento, formulario enviado ou regra de negocio
- deve preservar aprovador, decisao, data, justificativa, versao do formulario e dados avaliados
- o atendimento acompanha a conversa e o SLA; a aprovacao acompanha a decisao formal

### SupportResponsibilityPeriod

Periodo que identifica quem estava responsavel pelo tempo do atendimento.

Tipos:

- suporte/equipe interna
- colaborador solicitante
- equipe aprovadora
- externo

Regras:

- nao substitui o status do atendimento
- permite calcular quanto tempo ficou com atendimento, aprovacao, colaborador ou externo
- aprovacao pendente abre periodo de equipe aprovadora e muda o atendimento para `WAITING_APPROVAL`
- decisao da aprovacao encerra o periodo da equipe aprovadora e abre o proximo periodo de responsabilidade
- tempo aguardando colaborador, equipe aprovadora ou externo nao deve contar contra o atendente
- a transferencia entre equipes encerra o periodo operacional anterior e abre novo periodo para a equipe de destino
- a trilha de responsabilidade deve permitir separar tempo total do atendimento de tempo atribuivel ao suporte

### SLA do Atendimento

Meta operacional associada ao atendimento e a sua equipe responsavel no momento.

Regras:

- a abertura calcula o prazo inicial pela politica de SLA vigente
- quando o atendimento e transferido, o SLA operacional passa para a equipe de destino conforme a politica aplicavel
- a transferencia recalcula novo prazo operacional para a equipe de destino, preservando no historico o prazo anterior e o tempo consumido
- estados de espera, como `WAITING_REQUESTER` e `WAITING_APPROVAL`, devem preservar o rastreio do tempo, mas nao contabilizar contra o atendente
- o colaborador nao precisa ver a meta interna; a experiencia dele deve mostrar status humano do andamento
- a proxima configuracao deve priorizar politica por equipe e prioridade; assunto pode sobrescrever depois quando houver necessidade real

### Case Change Reason

Motivo estruturado para mudancas relevantes no atendimento.

Usos canonicos:

- transferencia entre equipes
- resolucao
- fechamento
- cancelamento
- reabertura

Regras:

- o motivo tipificado e obrigatorio nas acoes criticas
- motivos devem ser separados por acao, porque transferencia, resolucao, fechamento e reabertura possuem semanticas diferentes
- motivos comecam como lista fixa do dominio, para preservar consistencia de indicadores; configuracao administrativa futura so entra se a operacao demonstrar necessidade
- comentario detalhado pode complementar o motivo, mas nao substitui a classificacao
- motivos devem ajudar auditoria e indicadores sem obrigar o atendente a escrever texto longo em todo caso

### Case Resolution Lifecycle

Ciclo de encerramento em dois passos.

Estados canonicos:

- `RESOLVED`: atendimento resolvido, ainda dentro da janela de avaliacao ou reabertura
- `CLOSED`: atendimento encerrado final

Regras:

- o atendente marca como `RESOLVED` quando considera a demanda atendida
- o colaborador pode avaliar ou reabrir dentro da janela de reabertura
- apos 7 dias sem resposta do colaborador, o sistema pode fechar automaticamente com motivo `sem retorno apos resolucao`
- o fechamento automatico deve ser preparado no dominio antes de depender de job/agendador; status, eventos, motivo e testes vem primeiro
- `CLOSED` nao deve reabrir por simples resposta fora da janela; nova interacao cria outro atendimento conforme a politica de abertura do assunto

### Case Reopening Window

Periodo em que uma resposta do colaborador pode reabrir um atendimento encerrado.

Regra atual:

- resposta do colaborador ate 7 dias apos encerramento pode reabrir o mesmo atendimento
- reabertura pelo colaborador deve ser uma acao explicita, com botao proprio e mensagem obrigatoria
- reabertura dentro da janela volta para a ultima equipe responsavel antes da resolucao, sem responsavel individual, retornando ao backlog da equipe
- apos a janela de reabertura, nova interacao deve criar outro atendimento conforme a politica de abertura do assunto
- a reabertura preserva historico, eventos e responsabilidade do mesmo `SupportCase`

## Regras operacionais fechadas

### Abertura do atendimento

Fluxo base:

1. funcionario escolhe setor
2. funcionario pode escolher assunto
3. assunto define formulario, rota inicial e politica de abertura
4. se existir formulario principal no assunto, ele entra antes da conversa
5. titulo pode ser gerado por assunto e campos principais
6. mensagem inicial pode ser obrigatoria somente em assunto sem formulario suficiente
7. atendimento nasce ou e reaproveitado conforme politica do assunto
8. conversa continua no mesmo caso em formato de chat/helpdesk

### Workspace do atendente

Ordem de prioridade visual e operacional:

1. backlog da equipe
2. atendimento selecionado
3. contexto secundario recolhivel

Padrao inicial:

- abrir por `Para Assumir`
- manter filas rapidas para `Meus Atendimentos`, `Da Equipe`, `SLA Critico` e `Todos`
- atendimento assumido continua visivel para a equipe, mas em estado proprio

### Transferencia

Regra oficial:

- transferencia troca a equipe atual do caso
- limpa o responsavel atual
- devolve o item ao backlog da equipe de destino
- preserva o mesmo `SupportCase`
- exige motivo tipificado e permite comentario complementar
- transfere tambem a responsabilidade operacional e a apuracao de SLA para a equipe de destino
- atendentes escolhem apenas equipes autorizadas ou visiveis para transferencia; `ADMIN` ou gestor amplo podem atravessar escopos conforme policy propria
- o SLA anterior da transferencia deve ser preservado como evento auditavel no primeiro momento; tabela propria de historico fica reservada para quando relatorios exigirem calculo mais pesado

### Inbox acionavel de atendimento

Regra oficial:

- o Inbox do colaborador mostra apenas atendimentos que exigem acao ou leitura relevante
- entram sinais como `WAITING_REQUESTER`, resposta nova ainda nao lida e aprovacao devolvida com ajuste solicitado
- resposta nova significa mensagem ou evento criado por suporte depois da ultima leitura do colaborador, desde que o caso nao esteja `CLOSED`
- nao deve listar todo atendimento aberto para evitar virar segunda tela de atendimento

### Fila operacional de atendimento

Lista de trabalho do atendente antes do detalhe.

Sinais minimos:

- status
- equipe atual
- responsavel atual, quando houver
- prioridade
- vencimento de SLA em forma relativa compacta, com data/hora absoluta em detalhe ou tooltip
- tempo na responsabilidade atual
- ultimo movimento
- indicador de aguardando colaborador ou aprovacao
- SLA vencido gera alerta visual e indicador operacional, nao muda o status do ciclo do atendimento

## Escopo de autorizacao

Autorizacao operacional combina tres camadas:

1. acesso ao app
2. papel contextual no app
3. ownership e membership operacional

Isso significa:

- entrar no app `ATENDIMENTO` nao autoriza ver qualquer caso
- membership em equipe define backlog elegivel
- ownership define a posse do caso assumido

## Principios de modelagem

- setor e linguagem de negocio para o funcionario
- equipe/fila e linguagem interna de operacao
- formulario fica desacoplado do suporte
- assunto classifica; formulario coleta; atendimento rastreia; aprovacao decide
- o caso preserva historico continuo mesmo quando muda de equipe
- nomes e telas devem refletir essa separacao
