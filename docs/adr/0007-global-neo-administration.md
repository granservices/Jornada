# Administracao global do Neo

## Status

Accepted on 2026-09-02.

## Context

O catalogo de aplicativos e os grants por usuario sustentam todos os modulos
do Neo. Manter essa gestao dentro da navegacao do Jornada confundia a
responsabilidade do modulo do colaborador com configuracoes transversais.

## Decision

O Neo possui uma experiencia global de administracao em `/administracao`,
protegida exclusivamente pela role global `ADMIN`.

- A experiencia usa o mesmo shell e design system do Neo, mas uma lateral
  propria, sem itens do Jornada, Focall ou QuickForms.
- `/administracao/aplicativos` e a fonte de manutencao do catalogo de
  modulos nativos e redirecionamentos externos.
- `/administracao/usuarios` usa os endpoints centrais de `auth` para listar
  pessoas, conceder ou revogar acesso por aplicacao e ajustar os papeis
  contextuais do acesso.
- O Jornada nao exibe mais a administracao de aplicativos em sua lateral.
- Permissao continua sendo verificada no backend; esconder navegacao no
  frontend nunca substitui a autorizacao.

## Consequences

Administracao vira um quarto contexto de interface, nao um quarto modulo de
negocio. Novas configuracoes globais, como politicas de acesso e auditoria,
entram nesta area. Configuracoes de dominio continuam nos proprios modulos:
regras de atendimento no Focall e fontes/formularios no QuickForms.
