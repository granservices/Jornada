# Database Migrations

## Estado atual

O repositorio possui uma migration `000000000000_init` que representa o schema
atual do Jornada/Neo. Ela foi consolidada para simplificar o desenvolvimento
local enquanto o projeto ainda nao possui um banco de producao compartilhado
com este repositorio.

Essa migration e um **baseline de banco novo**. Ela nao deve ser aplicada em
uma base existente de producao sem um plano de reconciliacao, porque a base
existente pode ja conter tabelas, dados e historico de migrations diferentes.

## Regra para producao

Antes do primeiro deploy com banco persistente, escolher explicitamente uma
das estrategias:

- criar uma base nova e aplicar o baseline desde o inicio; ou
- registrar o baseline como ja aplicado na base existente, depois de comparar
  o schema real com `apps/api/prisma/schema.prisma` e gerar um backup verificavel.

Nao executar `prisma migrate reset` em ambientes compartilhados. A verificacao
deve usar `prisma migrate deploy`, backup, diff de schema e uma janela de
rollback definida.

## Validacao local

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npx prisma migrate status --schema apps/api/prisma/schema.prisma
```

O banco local pode ser recriado quando necessario. Essa permissao nao se
estende a staging ou producao.
