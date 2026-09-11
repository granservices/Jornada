# Identity And Access

## Objective

Definir a base de identidade do `Jornada` sem fechar a porta para evolucao futura com `PJ`, representantes e multiplos vinculos.

## Current implementation decision

Para a fase atual, a implementacao oficial fica assim:

- `Person`: identidade da pessoa fisica
- `Employee`: vinculo operacional do colaborador
- `User`: conta de acesso

O conceito arquitetural mais amplo continua sendo `IdentitySubject` ou `Party`, mas ele permanece apenas como direcao de modelagem neste momento.

## Current boundaries

### `Person`

Responsavel por:

- nome completo
- CPF
- nascimento
- identidade basica da pessoa

Observacao:

Toda conta do `Jornada` pertence a uma `Person`.

### `Employee`

Responsavel por:

- matricula operacional
- identificador externo
- setor ou departamento
- vinculo de colaborador consumido por agenda, vencimentos e comunicados

Observacao:

Nem toda `Person` precisa ser `Employee`.

Exemplo:

- admin bootstrap pode existir como `User` + `Person`, sem `Employee`

### `User`

Responsavel por:

- email ou login
- senha
- roles
- status
- sessao
- auditoria de autenticacao

Observacao:

`User` nao e a identidade principal do dominio. `User` representa acesso.

### `UserProfilePreference`

Responsavel por ajustes pessoais de autoatendimento do usuario autenticado:

- nome de preferencia
- telefone de contato
- contato e telefone de emergencia
- base principal declarada
- canal preferido de aviso

Esses campos nao substituem dados oficiais de `Person` ou `Employee`.
Nome civil, CPF, nascimento, matricula e setor continuam leitura protegida
para o colaborador comum e dependem de fluxo administrativo/fonte corporativa.

Endpoints atuais:

- `GET /auth/me/profile`
- `PATCH /auth/me/profile`

O `PATCH` altera apenas `UserProfilePreference` e registra auditoria. O retorno
continua minimizado: CPF vem mascarado e identificadores externos nao sao
expostos.

## Why this split

Este desenho evita misturar:

- identidade civil
- vinculo trabalhista
- credencial de acesso

Isso simplifica a evolucao futura para:

- uma mesma pessoa com mais de um vinculo
- usuario representando pessoa juridica
- federacao futura com `Entra ID`
- onboarding diferente para admin, colaborador e operador interno

## Admin login rule

O login admin deve continuar possivel mesmo sem matricula.

Regra:

- `admin bootstrap` cria `User` com role `ADMIN`
- esse `User` sempre tem uma `Person`
- esse `User` pode nao ter `Employee`
- login admin acontece por email e senha

## Administrative provisioning

O fluxo inicial oficial para novas contas e convite administrativo.

- `ADMIN` global cria a conta pendente, define os acessos iniciais por
  aplicacao e emite o convite.
- nenhum modulo e concedido automaticamente; os acessos e papeis iniciais sao
  selecionados explicitamente para cada conta.
- nome completo, email de contato valido e matricula opcional sao os dados
  minimos da criacao. O email pode ser corporativo ou pessoal. Dados civis,
  medicos e documentos ficam fora deste fluxo.
- o destinatario escolhe a propria senha em um convite expiravel e de uso
  unico, valido por sete dias; o segredo deve ser armazenado somente como
  hash. Reenvio invalida convite anterior ainda ativo.
- TI opera este fluxo inicialmente. Delegacao para gestores depende de uma
  policy propria, sem permissao para elevar `ADMIN` ou alterar administradores.
- cadastro publico nao deve permanecer habilitado em producao junto deste
  fluxo, salvo decisao futura para um caso de negocio separado.
- bloquear ou desativar uma conta revoga suas sessoes ativas.
- nao e permitido remover ou desativar o ultimo `ADMIN` global.
- concessao de papel administrativo, bloqueio, desativacao e revogacao de
  acesso exigem justificativa auditada e sanitizada.
- a consulta inicial do historico administrativo fica restrita a `ADMIN`, com
  filtros por usuario, periodo, aplicacao e acao.
- a justificativa de acao sensivel usa categoria obrigatoria: `ONBOARDING`,
  `ROLE_CHANGE`, `SECURITY`, `OFFBOARDING`, `ACCESS_CORRECTION` ou `OTHER`.
  Comentario adicional e opcional e sanitizado.
- email, matricula e identificador externo sao unicos. Conflitos bloqueiam a
  criacao; nenhuma identidade e mesclada automaticamente.
- convite para email pessoal mostra finalidade de uso do endereco e link para
  politica de privacidade. Isso nao substitui a base legal aplicavel.

MFA para `ADMIN` e requisito futuro antes da ampliacao do uso administrativo,
mas nao esta implementado neste momento.

## Account retention and access review

Contas com historico de acesso ou auditoria nao sao apagadas pelo fluxo
administrativo. Desligamento desativa a conta e revoga sessoes; anonimizacao
ou descarte nao acontecem automaticamente ate orientacao juridica e politica
de retencao LGPD formalmente aprovadas.

O Neo deve revisar acessos semestralmente para `ADMIN`, `MANAGER` e
`PUBLISHER`, e anualmente para os demais papeis. O primeiro ciclo cria
pendencias com responsavel e prazo, sem revogar acesso automaticamente.

## Contact changes and security notifications

Alteracao de email fica restrita a TI nesta fase. A mudanca exige justificativa
e auditoria; convite pendente para o endereco anterior e invalidado.

O Neo envia aviso de seguranca por email para convite, ativacao, bloqueio,
desativacao, troca de email e alteracao de papel. O aviso informa a acao, data
e canal de suporte, sem transportar segredo ou dados sensiveis.

## Global administrator elevation and audit access

Somente um `ADMIN` global pode promover outra conta a `ADMIN`. A elevacao usa
tela propria, motivo obrigatorio, dupla confirmacao, auditoria e notificacao ao
promovido. Autoelevacao nao e permitida; o bootstrap por ambiente segue sendo
o caminho exclusivo para o primeiro administrador.

O historico administrativo e consultado inicialmente dentro do Neo. Exportacao
de auditoria fica fora do primeiro pacote e depende de escopo minimo,
justificativa, auditoria e retencao definidos.

## Application lifecycle and session revocation

Inativar uma aplicacao a oculta do Hub e bloqueia novas entradas, sem apagar
grants, papeis ou historico. Reativacao restaura os acessos registrados;
revogacao em massa e uma acao separada e justificada.

TI, por meio dos `ADMIN`s globais, responde inicialmente pelas revisoes de
acesso. Gestores poderao revisar somente seu proprio escopo em fase futura.

TI tambem pode revogar todas as sessoes ativas de uma conta sem bloquea-la,
por incidente, perda de dispositivo ou mudanca de funcao. A acao exige motivo,
auditoria e aviso ao usuario.

## Migration of module roles

`ADMIN` permanece uma role global porque protege a administracao transversal
do Neo. Papeis de negocio como atendimento, TI, medicina e operacoes devem
migrar gradualmente para `UserApplicationRole` no modulo aplicavel.

Durante a migracao, a compatibilidade com roles globais legadas deve ser
controlada e temporaria. Cada policy migrada passa a consultar apenas o acesso
e os papeis contextuais da aplicacao; o fallback legado so e removido quando
nao houver risco de interromper acesso ja concedido.

## Role and permission ownership

O Neo usa tres niveis de autorizacao:

1. `ADMIN` global protege apenas configuracoes transversais do Neo.
2. cada modulo define papeis contextuais proprios e versionados em codigo.
3. policies de dominio no backend combinam o papel com equipe, ownership,
   setor e estado do recurso.

O banco guarda grants e atribuicoes de papeis. Ele nao vira um editor generico
de permissoes. O catalogo inicial recomendado e:

| Modulo | Papeis |
| --- | --- |
| Jornada | `MEMBER`, `MANAGER` |
| Focall | `REQUESTER`, `AGENT`, `MANAGER` |
| QuickForms | `VIEWER`, `AUTHOR`, `PUBLISHER`, `MANAGER` |

Papeis customizados por administrador ficam fora do escopo ate existir uma
necessidade operacional comprovada.

## Authorization model

O modelo atual e `RBAC` pragmatico:

- roles definem capacidade geral
- `EMPLOYEE` acessa a experiencia do colaborador
- `ADMIN` representa administracao global do app
- `SUPPORT` representa gestao ampla de atendimento
- roles setoriais como `TI`, `MEDICINE` e `OPERATIONS` limitam atuacao a filas/equipes correspondentes

Direcao obrigatoria para escalar:

- evoluir para um hibrido `RBAC + ABAC`
- `RBAC`: o que a pessoa pode fazer
- `ABAC`: onde ela pode fazer, considerando setor, equipe, membership e relacionamento com o atendimento
- frontend pode ocultar menus e acoes, mas a permissao final sempre fica no backend
- qualquer dado sensivel ou administrativo deve ser filtrado no backend antes de chegar ao browser

Status atual:

- atendimentos ja possuem restricoes por papel e fila em parte dos fluxos
- catalogo administrativo ja bloqueia colaborador comum
- manutencao de setores foi restringida a `ADMIN`
- escopo fino de catalogo por setor/equipe ainda precisa virar policy reutilizavel antes de liberar configuracao ampla para usuarios setoriais

## Ecosystem access direction

Para o ecossistema de apps do Jornada, a identidade nao basta sozinha.

Precisamos separar, sem confundir nome tecnico com nome de produto:

- `User`: quem autentica
- `Application`: registro tecnico de um modulo nativo ou aplicacao externa no catalogo
- `UserApplicationAccess`: quais apps esse usuario pode abrir
- `UserApplicationRole`: qual papel esse usuario exerce dentro de cada app

Exemplo:

- a mesma pessoa pode ter acesso ao app `JORNADA`
- essa mesma pessoa pode ter acesso ao modulo Focall (`HELP_HUB` como codigo tecnico)
- no `JORNADA`, ela pode ser apenas `USER`
- no Focall, ela pode ser `AGENT`, `MANAGER` ou `ADMIN`
- a visao dentro de cada app continua dependente do contexto e das permissoes do proprio dominio

Regra arquitetural:

- `auth` define identidade, sessao e acesso ao app
- `auth` passa a sustentar tambem o papel contextual por aplicacao
- cada app define o comportamento interno apos a entrada
- permissoes finas de atendimento, formularios ou admin nao devem morar no catalogo central de apps

Gestao central inicial implementada:

- `GET /auth/admin/applications`
- `GET /auth/admin/users/application-access`
- `PUT /auth/admin/users/:userId/applications/:applicationCode`

Superficie de administracao:

- `/administracao` e a experiencia transversal do Neo, separada dos modulos
  de negocio e protegida por `ADMIN`
- `/administracao/aplicativos` mantem metadados e destinos do catalogo
- `/administracao/usuarios` lista pessoas e permite conceder ou revogar o
  acesso por aplicacao, bem como editar os papeis contextuais antes de salvar

Escopo atual:

- somente `ADMIN` global pode conceder e revogar acesso por aplicacao
- o payload central decide se o acesso esta habilitado
- o payload central define os papeis contextuais do usuario naquele app
- revogar acesso tambem revoga os papeis daquele app

## Atendimento e ownership

No dominio de atendimento, abrir o modulo Focall nao significa poder atuar em qualquer caso.

Regra operacional desejada:

- item sem responsavel pertence ao backlog da equipe autorizada
- item atribuido pertence ao atendente atual
- outro atendente so atua se houver transferencia, devolucao para fila ou permissao operacional ampla
- gestor/admin operacional pode atravessar ownership quando necessario
- o workspace do atendente abre por padrao no backlog da equipe, nao apenas na carteira pessoal
- atendimento assumido continua visivel para a equipe com estado proprio, sem sumir da operacao
- transferencia entre equipes limpa o responsavel atual e devolve o item ao backlog da equipe de destino
- transferencia preserva o mesmo atendimento e a mesma trilha historica; nao cria outro caso no MVP

Conclusao:

- acesso ao app e uma camada
- papel no app e outra camada
- ownership do atendimento e uma terceira camada de autorizacao

## Future expansion path

Quando `PJ` entrar, a direcao recomendada e:

- `Organization`
- vinculo de representacao entre `Person/User` e `Organization`

Nao modelar agora:

- login direto da empresa
- senha da empresa
- conta tecnica se passando por pessoa juridica

Quem acessa sempre e uma pessoa fisica.

## Immediate implementation order

1. manter `auth` ligado a `User`
2. mover nome e identidade para `Person`
3. mover matricula e identificadores operacionais para `Employee`
4. usar `Employee` como ponte para agenda, vencimentos e comunicados
