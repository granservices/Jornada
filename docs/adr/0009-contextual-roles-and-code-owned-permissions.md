# Contextual Roles And Code-Owned Permissions

## Status

Accepted on 2026-09-02.

## Context

O Neo possui roles globais legadas e um enum generico de papeis por aplicacao.
Essa combinacao permite a transicao inicial, mas mistura administracao da
plataforma, acesso a modulos e autorizacao de negocio.

## Decision

O Neo usara tres niveis de autorizacao:

1. `PlatformRole`: somente `ADMIN`, para configuracoes transversais do Neo.
2. `ApplicationRole`: papel atribuido a uma pessoa dentro de um modulo.
3. policy de dominio: regra que combina papel contextual, equipe, ownership e
   atributos do recurso no backend.

As permissoes nao serao cadastradas livremente na interface. Cada modulo
declara em codigo os seus papeis validos, suas capacidades e seus nomes de
produto. O banco guarda apenas a atribuicao de papel a pessoa e o historico.

Catalogo inicial recomendado:

| Modulo | Papeis |
| --- | --- |
| Jornada | `MEMBER`, `MANAGER` |
| Focall | `REQUESTER`, `AGENT`, `MANAGER` |
| QuickForms | `VIEWER`, `AUTHOR`, `PUBLISHER`, `MANAGER` |

`ADMIN` global pode acessar a administracao transversal, mas nao substitui
automaticamente as policies de ownership do Focall. A elevacao administrativa
em um modulo deve ser explicita e auditada quando for necessaria.

## Migration

As roles globais legadas serao migradas para papeis contextuais por modulo,
com compatibilidade temporaria. Cada modulo sera migrado e validado de forma
isolada; o fallback global so sera removido apos o mapeamento e a revisao de
acesso efetivo dos usuarios existentes.

## Consequences

O enum generico atual de papeis por aplicacao deve evoluir para o catalogo
versionado de cada modulo. Policies de frontend servem apenas para UX; a
decisao final continua no backend. Papéis customizados por administrador ficam
fora do escopo ate existir uma necessidade operacional comprovada.
