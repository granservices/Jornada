# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Colaboradores embarcados acessam a Jornada diretamente para consultar informacoes e resolver pendencias com pouco atrito, inclusive em conexoes instaveis. Equipes de atendimento e administradores usam o HelpHub e o QuickForms para operar filas, regras e formularios.

## Product Purpose

Neo e o acesso unificado aos aplicativos internos da GranServices. Uma mesma identidade permite que cada pessoa entre diretamente no aplicativo autorizado ou use o hub para escolher entre os modulos disponiveis.

## Positioning

Os aplicativos permanecem dominios independentes, mas compartilham identidade, sessao e catalogo de acessos. Jornada, HelpHub e QuickForms se comunicam por contratos internos e nao por acesso direto a dados de outro dominio.

## Operating Context

Jornada acompanha programacao, vencimentos, comunicacoes e demandas do colaborador. HelpHub trata solicitacoes por setor e fila. QuickForms cria e versiona formularios reutilizaveis por outros aplicativos.

## Capabilities and Constraints

- Aplicacao web mobile-first com PWA para Jornada.
- Acessibilidade e interacoes de componentes fornecidas por React Aria Components.
- Dados externos futuros entram por integracoes e alimentam modelos internos; nao sao dependencia ativa do MVP.
- O produto atende requisitos de LGPD, com permissao validada no backend e minimizacao de dados expostos.

## Brand Commitments

O nome provisório da plataforma e Neo. A linguagem deve ser empresarial, precisa e calma: informacao inteligente ao alcance, sem limitar a plataforma a embarque.

## Evidence on Hand

- Logo em `apps/jornada/public/crew-logo.png`.
- Cenário visual Neo em `apps/jornada/public/neo-offshore-platform.png`.
- Aplicativos atuais: Jornada, HelpHub e QuickForms.

## Product Principles

- O acesso mais frequente deve levar diretamente ao trabalho do usuario.
- Modulos compartilham identidade, mas preservam suas responsabilidades de negocio.
- Informacao operacional deve ser clara, compacta e confiavel em telas pequenas.
- A interface deve favorecer manutencao por componentes e contratos estaveis.

## Accessibility & Inclusion

Fluxos essenciais devem funcionar por teclado, toque e tecnologias assistivas. Movimento decorativo deve respeitar a preferencia de reduzir movimento.
