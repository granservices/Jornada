# Administrative User Provisioning And Access Governance

## Status

Accepted on 2026-09-02.

## Context

O Neo ja centraliza identidade, catalogo de aplicacoes, grants e papeis
contextuais. O cadastro publico cria uma senha e uma sessao imediatamente,
mas nao atende ao controle necessario quando a conta e provisionada pela TI.

## Decision

O Neo passa a adotar convite administrativo como fluxo inicial de entrada.

- Somente o `ADMIN` global pode criar, ativar, bloquear, desativar ou ajustar
  o acesso de uma conta nesta fase.
- A criacao administrativa gera uma conta pendente e um convite de uso unico,
  valido por sete dias e armazenado somente como hash. Reenvio invalida todo
  convite anterior ainda ativo.
- O destinatario define a propria senha ao aceitar o convite. Administradores
  nunca definem, recebem ou visualizam senhas.
- O convite pode conter os acessos iniciais por aplicacao e seus papeis
  contextuais, que devem aparecer para revisao antes do envio.
- Nenhuma aplicacao e concedida por padrao: cada acesso inicial precisa ser
  escolhido explicitamente pelo administrador.
- Os dados minimos do convite sao nome completo, email de contato valido e
  matricula opcional. O email pode ser corporativo ou pessoal; CPF,
  nascimento, saude e documentos nao pertencem a este fluxo.
- Mudancas sensiveis exigem justificativa: concessao de papel administrativo,
  bloqueio, desativacao e revogacao de acesso.
- A justificativa usa categoria obrigatoria (`ONBOARDING`, `ROLE_CHANGE`,
  `SECURITY`, `OFFBOARDING`, `ACCESS_CORRECTION` ou `OTHER`) e comentario
  opcional sanitizado.
- As mudancas e suas justificativas entram na auditoria na mesma transacao da
  alteracao de negocio, com dados sanitizados.
- O sistema deve impedir a remocao ou desativacao do ultimo `ADMIN` global e
  revogar sessoes ativas quando o usuario for bloqueado ou desativado.

O cadastro publico nao deve coexistir em producao com este modelo, salvo
decisao explicita para um caso de negocio independente.

Email, matricula e identificador externo sao unicos. Um conflito bloqueia a
criacao e apresenta a conta existente ao `ADMIN`; mesclagem ou religacao de
identidade exige acao explicita e auditada, nunca reconciliacao automatica.

Ao aceitar convite enviado para email pessoal, a pessoa ve um aviso curto de
finalidade do email e acesso a politica de privacidade. Isso e transparencia,
nao consentimento generico.

## Consequences

O primeiro pacote de gestao de usuarios passa a incluir convite, aceitacao,
expiracao, reenvio, status da conta, revogacao de sessoes e historico de
alteracoes. A delegacao para gestores fica para uma fase posterior, com
limites proprios e sem poder de elevar roles globais.

Os estados da conta sao `PENDING`, `ACTIVE`, `BLOCKED` e `DISABLED`.
`BLOCKED` representa suspensao reversivel; `DISABLED`, encerramento de acesso.
O historico administrativo fica inicialmente restrito a `ADMIN` global e deve
permitir filtro por usuario, periodo, aplicacao e acao.

Contas com historico nao sao excluidas pelo fluxo administrativo. O
desligamento usa `DISABLED`, revoga as sessoes e preserva a trilha de negocio.
Nao ha anonimizacao ou descarte automatico ate orientacao juridica e politica
de retencao LGPD formalmente aprovadas.

O Neo devera iniciar revisoes periodicas de acesso: a cada seis meses para
`ADMIN`, `MANAGER` e `PUBLISHER`, e anualmente para os demais papeis. O
primeiro ciclo informa responsavel e prazo, sem revogacao automatica.

Alteracao de email e tratada inicialmente apenas pela TI, com justificativa,
auditoria e invalidacao de convite pendente quando aplicavel. Convite,
ativacao, bloqueio, desativacao, troca de email e alteracao de papel geram
aviso de seguranca ao usuario por email, entregue por canal transacional.

Elevacao a `ADMIN` global somente pode ser executada por outro `ADMIN`, em
fluxo proprio com justificativa, dupla confirmacao e notificacao ao promovido.
Ninguem pode promover a propria conta. O bootstrap por ambiente continua
restrito ao primeiro administrador.

Auditoria administrativa e consultada inicialmente dentro do Neo. Exportacao
fica fora do primeiro pacote e so pode ser considerada com escopo minimo,
justificativa, auditoria e retencao formalmente definidos.

Inativar uma aplicacao a oculta do Hub e bloqueia novas entradas, sem apagar
grants, papeis ou historico. Reativacao restaura os acessos registrados;
revogacao em massa e uma acao distinta e justificada.

As revisoes periodicas de acesso ficam inicialmente sob responsabilidade da
TI por meio dos `ADMIN`s globais. Gestores poderao revisar apenas seu escopo
em fase posterior. A TI pode revogar todas as sessoes de uma conta sem
bloquea-la, com motivo e notificacao ao usuario.

MFA para `ADMIN` e requisito futuro obrigatorio antes de ampliar a gestao
administrativa para uso operacional amplo. Ele nao esta implementado nesta
decisao.

Os papeis de modulo devem migrar gradualmente de roles globais legadas para
`UserApplicationRole`. `ADMIN` permanece global por representar administracao
transversal do Neo. A migracao deve manter compatibilidade controlada ate cada
policy de modulo consultar somente o contexto da aplicacao.
