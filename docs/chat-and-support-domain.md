# Chat And Support Domain

## Decision

No Jornada, `Chat` e `Atendimento/Solicitacao` sao dominios relacionados, mas distintos.

- `Chat` e o canal de conversa.
- `Atendimento` e a responsabilidade operacional em torno da demanda.
- `Solicitacao/Chamado` e o trabalho rastreavel que precisa ser concluido.

Essa separacao evita que a conversa vire uma tabela pesada demais e permite crescer para help desk, filas e tarefas sem reescrever a base.

Para o funcionario, a entrada de produto deve ser apenas `Atendimentos`.
Mesmo uma duvida breve deve abrir ou continuar um atendimento simples. O chat
fica como infraestrutura interna de mensagens, tempo real e historico
conversacional vinculado ao atendimento, nao como item principal de menu.

## Industry References

Referencias usadas como base conceitual:

- Zendesk separa `tickets` de `ticket comments`: comentarios representam a conversa entre solicitantes, colaboradores e agentes, enquanto o ticket guarda status, grupo, responsavel e trabalho.
- Jira Service Management organiza trabalho por filas: pedidos entram como work items e aparecem em filas conforme criterios, ajudando triagem e atribuicao.
- Intercom trata conversas como canal com atribuicao a pessoas/times, tags, prioridade, atributos e SLA por automacao.
- Matrix modela conversa como `room` com eventos e membership, reforcando que participantes devem ser uma entidade propria, nao um campo fixo.

Links:

- https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/
- https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_comments/
- https://support.atlassian.com/jira-service-management-cloud/docs/what-are-queues/
- https://developers.intercom.com/docs/references/2.2/rest-api/conversations/conversation-model
- https://spec.matrix.org/

## Core Concepts

### Department

Representa o setor visivel para o funcionario.

Exemplos:

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

O funcionario deve escolher departamento e assunto, nao equipe interna.

### Topic

Representa o assunto selecionavel dentro de um departamento.

Exemplos:

- Medicina / ASO
- Medicina / Atestado
- Departamento Pessoal / Contracheque
- RH / Ferias

O assunto permite metricas, roteamento, SLA futuro, formularios e triagem inteligente.

O assunto nao e um campo comum do formulario. Ele e a classificacao de negocio
que escolhe formulario, rota inicial, politica de abertura e futuro SLA.

Politicas iniciais de abertura por assunto:

- `conversa continua`: reaproveita atendimento ativo do mesmo funcionario, departamento e assunto, adicionando nova mensagem.
- `solicitacao individual`: cada envio validado abre um atendimento proprio, mesmo que ja exista outro atendimento ativo no mesmo departamento e assunto.
- `chave de negocio`: reaproveita ou cria atendimento conforme uma chave derivada da demanda, como requisito de ASO, treinamento ou periodo.

Use `conversa continua` para duvidas e acompanhamento simples. Use
`solicitacao individual` para reembolso, ferias, documentos e pedidos que
precisam de rastreio proprio. Use `chave de negocio` quando varias mensagens
devem acompanhar o mesmo objeto operacional.

Na politica por chave de negocio, o assunto deve informar `businessKeyFieldCode`.
Esse campo precisa vir do formulario ativo, estar preenchido e nao ser sensivel.
Sem isso, o backend deve recusar a abertura para nao agrupar solicitacoes por
criterio ambiguo.

### Conversation

Representa uma conversa.

Pode ser:

- pessoa com pessoa
- funcionario com setor
- setor com setor
- conversa ligada a um atendimento

Nao deve guardar toda a regra de atendimento. Ela guarda contexto conversacional, estado leve e ponte com mensagens.

### Participant

Representa quem participa da conversa.

Tipos iniciais:

- `USER`
- `TEAM`
- `SECTOR`
- `EXTERNAL`

Isso permite:

- uma conversa com varios usuarios
- uma conversa com varios times ou setores legados
- transferir de setor sem perder historico
- adicionar observadores
- futuramente permitir grupos/equipes

`SECTOR` fica como compatibilidade do desenho inicial. A direcao principal passa a ser `SupportTeam`, porque time/equipe e configuravel por dados e nao exige alterar enum/migration a cada novo setor.

### Message

Representa uma mensagem da conversa.

Regras:

- sempre pertence a uma conversa
- pode ser enviada por usuario, setor ou sistema
- usa `clientMessageId` para evitar duplicidade em reconexao/mobile ruim
- historico deve ser paginado

### Support Case

Representa um atendimento, chamado ou solicitacao formal.

Ele nasce separado da conversa porque possui regras proprias:

- status
- prioridade
- solicitante
- setor atual
- responsavel
- prazo/SLA
- origem
- eventos/auditoria

Pode nascer de:

- uma conversa
- uma mensagem especifica
- um formulario/manual
- integracao futura

O titulo do atendimento e um resumo humano da demanda. Ele deve poder ser
gerado automaticamente a partir de departamento, assunto e campos principais do
formulario, com edicao por operador autorizado quando isso melhorar triagem ou
auditoria.

A descricao ou mensagem inicial e texto livre de conversa. Ela pode ser
obrigatoria em assuntos genericos ou sem formulario suficiente, e opcional como
observacao adicional quando o formulario ja captura o contexto necessario.

As respostas do formulario enriquecem o atendimento de forma estruturada, mas
nao substituem assunto, titulo, mensagem, fila, SLA ou aprovacao.

### Approval Request

Representa uma decisao formal exigida por regra de negocio.

Pode nascer de:

- atendimento criado por formulario
- resposta especifica do formulario
- regra de valor, prazo, tipo de pedido ou cargo
- acao manual futura de um operador autorizado

Regras:

- aprovacao nao e campo de formulario
- aprovacao guarda aprovador, decisao, data, justificativa, regra aplicada,
  versao do formulario e dados avaliados
- atendimento acompanha conversa, fila e SLA
- aprovacao acompanha a decisao formal e sua auditoria
- encerramento ou transferencia do atendimento nao deve apagar a trilha de
  aprovacao
- MVP usa `ApprovalRule`, `ApprovalRequest`, `ApprovalStep` e `ApprovalEvent`
- `SupportTeam` e reutilizado como equipe aprovadora
- qualquer integrante autorizado da equipe aprovadora pode decidir a etapa atual
- `CHANGES_REQUESTED` publica comentario visivel ao colaborador e leva o atendimento para `WAITING_REQUESTER`
- `APPROVED` e `REJECTED` devolvem o atendimento para `OPEN`; o setor decide o proximo passo

### Responsibility Period

Representa quem ficou responsavel pelo tempo decorrido do atendimento.

Tipos iniciais:

- `SUPPORT_TEAM`
- `REQUESTER`
- `APPROVAL_TEAM`
- `EXTERNAL`

Regras:

- o SLA principal do atendimento nao desaparece
- tempos de aprovacao, solicitante e suporte sao medidos separadamente
- aprovacao pendente muda o atendimento para `WAITING_APPROVAL`
- o atendimento continua visivel na fila original e tambem aparece na fila de aprovacoes da equipe aprovadora

### Support Team

Representa uma fila, equipe ou area responsavel pelo atendimento.

Nao deve ser acoplado a setor fixo do Jornada. O time pode apontar para:

- uma area interna simples
- uma fila operacional
- uma configuracao futura de notificacao
- um grupo de atendimento futuro

### Support Assignee

O atendente nao e a equipe. O atendente e um `User` com papel operacional, ligado ao atendimento por `assignedUserId`.

Relacao:

- `SupportTeam` recebe e organiza a fila
- `assignedUser` e a pessoa responsavel naquele momento
- se o responsavel muda, o atendimento continua na mesma fila ou pode ser transferido
- se a fila muda, o historico e a conversa vinculada continuam preservados

Isso permite que o funcionario enxergue uma experiencia simples, enquanto a empresa consegue operar fila, transferencia, turno e responsabilidade individual.

### Support Team Member

Representa o vinculo entre um `User` atendente e uma `SupportTeam`.

Regras:

- um atendente pode participar de varias equipes
- uma equipe pode ter varios atendentes
- a equipe recebe o atendimento; a pessoa assume quando houver responsabilidade individual
- `ADMIN` e `SUPPORT` mantem esse vinculo pela administracao do catalogo
- o funcionario nao enxerga essa estrutura interna

### Integration Link

Representa um vinculo opcional entre o atendimento e uma integracao externa.

Exemplos:

- notificacao enviada para um canal corporativo
- email
- WhatsApp
- outro canal corporativo

O objetivo nao e transformar o Jornada em uma ferramenta corporativa generica de conversa. O Jornada deve focar em resolver problemas do funcionario: triagem, fila, SLA, responsavel, eventos, historico operacional, documentos e conclusao.

O chat interno continua existindo como mecanismo de acompanhamento e ponte para entender a necessidade do colaborador antes ou durante um atendimento, mas nao deve disputar a navegacao principal.

## Naming Direction

No produto:

- `Conversa`
- `Participante`
- `Mensagem`
- `Atendimento`
- `Solicitacao`
- `Tarefa`
- `Fila`

No codigo:

- `ChatConversation`
- `ChatParticipant`
- `ChatMessage`
- `SupportTeam`
- `SupportCase`
- `SupportCaseEvent`
- `SupportIntegrationLink`
- `SupportRating`

## Plugability Boundary

O modulo de chat/suporte deve ser independente o bastante para virar produto separado.

Regras:

- o dominio nao deve depender diretamente de `Employee`, Drake ou telas especificas do Jornada
- identidade entra por uma porta de resolucao de ator, nao por regra fixa no chat
- notificacoes externas entram por adapter, inicialmente no-op
- `SupportTeam` substitui enums rigidos como fonte principal de roteamento
- `SupportCase` guarda o trabalho; `ChatConversation` guarda contexto conversacional
- vinculos de integracao ficam separados para permitir plugar/desplugar notificacoes sem migrar todo o historico

Portas esperadas:

- `ChatIdentityPort`: resolve nomes e atores sem acoplar o modulo a identidade do produto
- `SupportNotificationPort`: notifica sem decidir canal no dominio
- futura `SupportAttachmentPort`: armazena anexos sem prender o dominio ao provedor

## Rating Direction

Ao encerrar um atendimento, o funcionario deve poder avaliar a experiencia.

Base minima:

- nota simples
- comentario opcional
- vinculo ao atendimento
- auditoria de quem avaliou e quando avaliou

Essa avaliacao deve ajudar a empresa a entender onde setores podem melhorar, sem transformar a tela do funcionario em formulario longo.

## Transfer Rules

Transferir conversa e transferir trabalho nao sao a mesma coisa.

Exemplos:

- Se Operacoes identifica que o assunto e ASO, o atendimento pode mudar para Medicina e a conversa continua com o mesmo historico.
- Se Medicina precisa que Cadastro atualize um documento, o atendimento pode continuar com Medicina, mas nasce uma tarefa/chamado para Cadastro.
- Se um atendente sai do turno, o atendimento muda de responsavel, mas o setor pode continuar o mesmo.

## Implementation Direction

Base atual:

- `ChatConversation`
- `ChatParticipant`
- `ChatMessage`
- `ChatReadState`
- `SupportDepartment`
- `SupportTopic`
- `SupportTeam`
- `SupportRoutingRule`
- `SupportTeamMember`
- `SupportCase`
- `SupportCaseEvent`
- `SupportTopicForm`
- `SupportTopicField`
- `SupportCaseFieldValue`
- `SupportTriageSuggestion`
- `SupportIntegrationLink`
- `SupportRating`

Regra:

- `SupportCase` e exposto por `/support/cases`
- catalogo de setores, assuntos e formularios e exposto por `/support/catalog`
- `SupportTeam` e exposto por `/support/teams`
- administracao completa do catalogo e exposta por `/support/catalog/admin` e endpoints filhos protegidos
- a tela `/atendimentos/configuracao` e restrita a `ADMIN` e `SUPPORT`
- acesso a conversa deve passar por `ChatParticipant`
- PostgreSQL guarda historico e trabalho formal
- Redis coordena tempo real, presenca e estado efemero
- `SupportCase` nao substitui `ChatConversation`; ele se relaciona por origem
- no frontend do funcionario, `/chat` deve ficar oculto ou redirecionar para `/atendimento`, a superficie Jornada de contato com atendimento
- `/atendimentos` fica reservado para a mesa operacional de atendentes e configuracoes administrativas
- abertura de atendimento deve priorizar `departmentId + topicId`
- `SupportCase` e o agregador de SLA; a conversa e vinculada ao atendimento, nao ao setor generico
- a politica do assunto define se uma nova abertura reaproveita atendimento ativo, cria solicitacao individual ou usa chave de negocio
- assuntos de duvida simples devem reaproveitar atendimento ativo por colaborador, setor e assunto
- assuntos transacionais, como reembolso, ferias e pedidos formais, devem criar solicitacao propria por envio ou por chave de negocio
- chave de negocio fica persistida no atendimento para reaproveitar somente o ciclo ativo daquele objeto operacional
- regras de aprovacao podem criar `ApprovalRequest` automaticamente na abertura, conforme formulario, assunto e condicoes
- aprovacoes manuais podem ser solicitadas por operador autorizado com equipe aprovadora e motivo
- quando o atendimento estiver `RESOLVED` ou `CLOSED`, uma nova abertura no mesmo setor/assunto cria novo `SupportCase` e nova conversa
- a conversa e arquivada quando o atendimento e fechado, preservando historico e separando ciclos de SLA
- titulo deve ser gerado automaticamente por assunto e campos principais, com edicao por operador autorizado
- mensagem inicial deve ser obrigatoria apenas quando o assunto/formulario nao capturar contexto suficiente
- `teamCode` fica como compatibilidade tecnica/legada
- funcionario nao deve escolher `SupportTeam` diretamente
- roteamento para equipe deve ocorrer no backend por `SupportRoutingRule`
- formularios por assunto devem ser versionados
- notificacoes externas podem ser plugadas por `SupportIntegrationLink` e `SupportNotificationPort`, sem dependencia direta no nucleo
- atualizacao de atendimento passa por permissao de papel e fila
- `ADMIN` e `SUPPORT` podem operar todas as filas
- papeis setoriais operam apenas a fila equivalente, como `TI`, `MEDICINE` e `OPERATIONS`
- transferencia, resolucao e fechamento exigem motivo
- atendimento fechado nao recebe novas mensagens
- descricao, mensagem e comentario sao tratados como potencialmente sensiveis

## Growth Path

1. Atendimentos como entrada unica para duvidas breves e demandas formais.
2. Setores e assuntos selecionaveis.
3. Roteamento interno para equipes.
4. Formularios versionados por assunto.
5. Participantes genericos para pessoa-pessoa, setor-setor e grupos.
6. Atendimento com status, setor atual, equipe interna e responsavel.
7. Solicitacao gerada ou enriquecida a partir de mensagem.
8. Filas por setor/equipe com filtros salvos.
9. Tarefas internas vinculadas ao atendimento.
10. SLA, anexos, aprovacoes e automacoes.
11. Indicadores e melhoria continua por setor.
12. Avaliacao simples ao fim do atendimento.
13. Notificacoes opcionais para canais corporativos, se fizer sentido operacional.
14. Triagem inteligente por regra local e IA controlada.
15. Extracao gradual para produto standalone se o modulo provar valor fora do Jornada.

## MVP Closure

O MVP operacional de suporte/chat fica considerado fechado quando existem:

- chat persistente com historico paginado
- tempo real por `Socket.IO` e Redis adapter
- equipes/fila configuraveis por `SupportTeam`
- abertura, listagem, detalhe e comentario de atendimento
- atribuicao, transferencia, resolucao e fechamento com auditoria
- avaliacao ao fim do atendimento
- permissao no backend para solicitante, atendente e fila
- avisos simples de LGPD nos pontos de texto livre
- DTOs pequenos e historico recente carregado sob demanda

Ficam para fase seguinte:

- anexos privados
- SLA e indicadores de fila
- motivo tipificado
- notificacoes externas
- grupos/espacos de equipe
- auditoria detalhada de acesso/exportacao

## What To Avoid

- modelar conversa apenas como `funcionario + setor`
- transformar toda mensagem em chamado
- criar um kanban completo antes de validar os fluxos reais
- carregar todo historico no frontend
- misturar comentario interno, mensagem ao colaborador e evento de auditoria na mesma entidade sem tipo claro
