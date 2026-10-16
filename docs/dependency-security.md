# Dependency Security

## CI policy

O CI bloqueia vulnerabilidades criticas nas dependencias de runtime com:

```bash
npm audit --omit=dev --audit-level=critical
```

Vulnerabilidades altas continuam visiveis no relatorio e devem ser tratadas
por dependência, sem executar `npm audit fix --force` automaticamente.

## Estado conhecido

- `proxy-addr`: corrigido pelo `npm audit fix` compativel.
- `xlsx`: possui avisos de prototype pollution e ReDoS sem correcao upstream.
  O uso deve continuar restrito a entradas autenticadas, com limite de tamanho,
  validacao de extensao e processamento controlado.
- `nodemailer` e dependencias transitivas do Prisma: atualizacoes maiores
  exigem teste de compatibilidade antes de trocar a versao principal.

Antes de uma publicacao de producao, executar:

```bash
npm audit --omit=dev
npm run check
```

Registrar a decisao de aceitar, mitigar ou corrigir cada aviso alto relevante.
