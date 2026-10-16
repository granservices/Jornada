# Jornada Repo Guide

## Purpose

`Jornada` e o hub operacional mobile-first da GranServices.

Fases do produto:

1. autenticacao robusta, portal de apps e area logada do colaborador
2. contratos internos para colaborador, programacao, vencimentos, comunicados e atendimento
3. dados mockados/seedados enquanto fontes externas nao estiverem decididas
4. integracoes externas futuras alimentando o dominio interno por adapters

## Current source of truth

- Frontend e API atuais: `apps/neo` e `apps/api`. Jornada, Tickets e QuickForms sao modulos internos lazy do Neo; o portal neutro fica em `/aplicativos`, sem ser um quarto app.
- Subdominio planejado: `jornada.granhub.com.br`
- Porta interna atual: `3004`
- Stack base da API: `NestJS 11.2.1` com `Node.js 24 LTS`

## Delivery rule

Durante a fase atual, priorize contratos internos do Jornada e a evolucao segura do app. Fontes externas somente entram por decisao explicita, adapter backend e contrato interno estavel.

- Fontes externas futuras devem alimentar modelos internos por adapters/importadores.
- O frontend nao deve depender diretamente do formato de API externa.
- Use dados mockados, seedados ou internos enquanto a fonte real nao estiver decidida.
- Mudancas em endpoints historicos devem preservar compatibilidade ate decisao explicita de remocao.

## External source direction

Drake possui dois caminhos independentes: webhooks historicos/preparados e piloto ativo controlado de leitura de programacao. O piloto alimenta apenas `ScheduleItem`, sob demanda, pelo adapter de Crew Rotation; nunca expor credenciais, tenant ou payload externo ao frontend.

Fontes externas futuras devem ser tratadas como `Fonte Externa` no produto/documentacao e como `IntegrationSource` quando houver modelagem tecnica. Antes de implementar consumo real, defina:

- dado que a fonte alimenta
- contrato interno do Jornada afetado
- frequencia esperada
- autenticacao e segredo por ambiente
- risco LGPD
- estrategia de idempotencia, auditoria, erro e retry

## Architecture direction

- Controllers finos
- Regras em services
- Organizacao por feature/module
- Configuracao por `env` validado
- Contratos internos estaveis antes de adapters externos
- Persistencia/auditoria para sincronizacoes e acoes rastreaveis
- Evolucao posterior para fila, processamento assincrono, notificacoes e integracoes
- Codigo limpo pragmatico: guard clauses, metodos pequenos, baixo aninhamento, SOLID quando agregar clareza, Object Calisthenics como guia e nao como dogma
- Use factories quando a criacao tiver regra, codigo, default, invariante ou repeticao real; evite factory que so repassa parametros
- Erros especificos e seguros: evitar `Error` generico em regra de negocio, `catch` vazio e mensagens/logs com dados pessoais ou sensiveis
- LGPD obrigatoria: minimizacao, finalidade, permissao no backend, DTOs pequenos, logs sanitizados, criptografia/hash quando necessario e transparencia simples para o funcionario
- Formularios dinamicos devem ser dominio independente e versionado em `/forms`; features como atendimento devem plugar por vinculo, sem tomar posse direta do formulario

## Documentation rule

Antes de expandir o dominio, mantenha estes arquivos atualizados:

- `docs/roadmap.md`
- `docs/checklist.md`
- `docs/agents-and-skills.md`
- `docs/frontend-architecture.md`
- `docs/lgpd-and-privacy.md`
- `docs/clean-code-and-errors.md`

## Docs and library usage

- Para NestJS, Node, Docker e bibliotecas relacionadas, consulte a documentacao atual via Context7 antes de decisoes estruturais.
- Prefira versoes estaveis e LTS para tudo que entrar no deploy.
