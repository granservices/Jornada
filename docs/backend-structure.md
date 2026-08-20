# Backend Structure

## Principle

O backend sera `feature-based`, sem dividir a aplicacao inteira por camada global.

Nao usar:

- pasta global de `controllers`
- pasta global de `services`
- pasta global de `repositories`

Usar:

- cada feature com seus proprios `controller`, `dto`, `service`, `repository` e contratos

## Suggested API structure

```text
apps/api/
  prisma/
  src/
    main.ts
    app.module.ts
    common/
      decorators/
      filters/
      guards/
      interceptors/
      pipes/
      utils/
    config/
    database/
    modules/
      auth/
      employees/
      boarding-schedule/
      expiring-requirements/
      communications/
      chat/
      drake/
    test/
```

## Feature shape

Exemplo recomendado:

```text
modules/drake/
  controllers/
  dto/
  interfaces/
  services/
  repositories/
  mappers/
  events/
  tests/
```

Nem toda feature precisa de todas as pastas.

Regra:

- criar somente o que a feature precisa
- manter nomes previsiveis
- nao extrair abstração cedo demais

## DTO policy

DTO sempre que:

- entra payload externo
- sai resposta publica
- existe fronteira clara entre modulos

Evitar:

- trafegar objetos do ORM como contrato publico

## Services

Services concentram:

- regra de negocio
- orquestracao
- autorizacao local da feature
- transacoes
- disparo de eventos internos

Evitar:

- controller com regra
- repository com regra de negocio

## Repositories

Repositories concentram:

- queries
- persistencia
- detalhes de ORM

Evitar:

- vazar detalhes de Prisma para controller

## Interfaces

Usar interfaces quando:

- houver mais de uma implementacao possivel
- houver provider externo
- houver boundary que precisa ser protegida

Nao usar interface so por formalismo.

## Common

`common` e apenas para recursos tecnicos transversais.

Exemplos aceitaveis:

- exception filters
- guards comuns
- interceptors
- decoradores
- pipes
- helpers tecnicos

Exemplos nao desejados:

- services de dominio
- repositories de negocio
- DTOs de feature

