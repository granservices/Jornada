# Clean Code And Errors

## Decision

O Jornada deve seguir codigo limpo de forma pragmatica, inspirado por Uncle Bob, SOLID e Object Calisthenics, sem criar arquitetura pesada.

Objetivo:

- codigo legivel
- regras pequenas e testaveis
- baixo acoplamento
- erros explicitos
- fluxo facil de auditar
- privacidade e LGPD como parte do design, nao como remendo

## Clean Code Rules

Diretrizes obrigatorias:

- nomes claros, orientados ao dominio
- funcoes pequenas, com uma razao principal para mudar
- controllers finos
- services com regra de negocio
- DTOs pequenos e orientados ao caso de uso
- factories para criacao com regra, padrao, codigo, invariantes ou composicao repetida
- retorno cedo para casos invalidos
- evitar ramificacoes profundas
- evitar boolean flags que mudam comportamento demais
- evitar objetos/tabelas do ORM vazando direto para UI quando houver dado pessoal ou sensivel
- preferir composicao a heranca

## Factories

Factories sao bem-vindas quando deixam a criacao mais segura e testavel.

Usar factories para:

- codigos e identificadores de dominio com formato proprio
- criacao de agregados com defaults e invariantes
- objetos que precisam de normalizacao antes de persistir
- cenarios de teste com muitos campos obrigatorios
- montagem que ficaria repetida ou escondida dentro de services grandes

Evitar factories quando:

- um construtor, literal ou DTO simples ja resolve
- a factory so repassa parametros sem regra
- a abstracao aumenta cerimonia sem reduzir acoplamento

Regra pratica: factory deve proteger uma regra de criacao ou reduzir duplicacao real. Se ela nao faz isso, nao entra.

## Else And Object Calisthenics

`else` nao e proibido por si so, mas deve ser tratado como sinal de atencao.

Preferir:

- guard clauses
- early return
- metodos privados com nomes claros
- strategies/policies quando a regra varia por tipo
- value objects quando uma regra de validacao/comparacao fica repetida

Aceitavel usar `else` quando:

- melhora a leitura de uma bifurcacao simples
- evita duplicacao artificial
- o fluxo e realmente binario e pequeno

Evitar `else` quando:

- cria escada de decisao
- mistura permissao, validacao e persistencia no mesmo bloco
- dificulta teste unitario
- esconde regra de negocio importante dentro de aninhamento

## SOLID Direction

Aplicar SOLID onde ajuda manutencao:

- Single Responsibility: modulo, service e metodo devem ter responsabilidade clara
- Open/Closed: novas equipes, canais e regras devem entrar por configuracao, strategy ou adapter quando fizer sentido
- Liskov: usar heranca raramente; preferir interfaces pequenas
- Interface Segregation: portas especificas, sem contrato gigante
- Dependency Inversion: regras de negocio dependem de portas/adapters, nao de provedor concreto

Nao aplicar SOLID como teatro arquitetural. Se uma abstracao nao reduz acoplamento real, nao entra.

## Error Rules

Erros devem ser especificos, previsiveis e uteis para operacao.

Obrigatorio:

- nao lançar `Error` generico em regra de negocio
- usar excecoes HTTP do NestJS nos controllers/services HTTP quando apropriado
- criar classes/erros de dominio quando o mesmo erro for reutilizado ou precisar de codigo interno
- mensagens para usuario devem ser claras e seguras
- logs devem ter contexto tecnico sem expor dado pessoal/sensivel
- erros devem permitir acao: corrigir entrada, autenticar, pedir permissao, tentar depois ou acionar suporte

Evitar:

- `catch` vazio
- `catch` que engole erro sem log seguro
- retornar stack trace ao frontend
- usar mensagem tecnica como UX
- logar tokens, CPF, anexos, descricoes medicas ou conteudo sensivel
- incluir ticket SSO, URL completa com ticket ou token de sessao em excecao, log ou auditoria
- duplicar formulario ou regra de login em cada app; o login central e o unico dono da autenticacao e os apps de destino recebem somente ticket SSO opaco
- fazer infraestrutura compartilhada importar cliente ou tipo de dominio concreto; usar porta pequena injetada pelo aplicativo dono
- confiar apenas na validacao visual de rota ou URL do catalogo; `NATIVE`, `REDIRECT` e URL de imagem precisam ser revalidados pelo backend antes de persistir
- aceitar papel contextual sem validar o catalogo do modulo; o DTO aceita o
  formato, mas a policy de aplicacao confirma a combinacao no backend
- ativar convite sem atualizacao condicional; o consumo precisa ser atomico
  para impedir duas ativacoes concorrentes do mesmo token

## Try Catch Rules

Usar `try/catch` quando houver uma decisao real:

- traduzir erro externo para erro do dominio/API
- adicionar contexto seguro ao log
- fazer compensacao ou rollback manual
- tratar parse/entrada opcional de forma controlada
- preservar resiliencia de integracao

Nao usar `try/catch` apenas para relancar o mesmo erro.

Padrao recomendado:

```ts
try {
  return await provider.send(payload);
} catch (error) {
  this.logger.warn({ error: safeError(error), correlationId }, 'Provider failed');
  throw new ServiceUnavailableException('Servico indisponivel no momento.');
}
```

## Domain Error Direction

Quando um fluxo crescer, preferir erros nomeados:

- `SupportCaseNotFoundError`
- `SupportCaseAccessDeniedError`
- `SupportCaseNotRateableError`
- `SupportTeamNotFoundError`
- `PrivacyConsentRequiredError`

No NestJS, esses erros podem ser convertidos em HTTP por filtros ou mapeadores na borda.

Enquanto o modulo ainda estiver pequeno, `BadRequestException`, `ForbiddenException` e `NotFoundException` sao aceitaveis, desde que a mensagem seja especifica e segura.

## Privacy Link

Codigo limpo no Jornada inclui LGPD:

- DTO pequeno e mapper explicito protegem contra vazamento acidental
- erro claro evita suporte pedir dado sensivel de forma errada
- log seguro evita incidente
- guard clause de permissao evita acesso indevido cedo
- testes devem cobrir permissao e fluxo sensivel

## Audit Code Rules

- Acoes de negocio relevantes devem chamar auditoria explicita.
- Operacoes criticas devem preferir auditoria dentro da mesma transacao.
- Mudancas de acesso, estado de conta, elevacao administrativa e revogacao de sessoes devem validar motivo antes de alterar o estado e persistir a auditoria na mesma transacao.
- Auditoria deve usar snapshot/diff sanitizado, nunca segredo ou texto sensivel bruto.
- Observabilidade externa deve receber erro tecnico e contexto minimo, nao trilha oficial de negocio.

Detalhamento de privacidade: `docs/lgpd-and-privacy.md`.

## Checklist For Code Changes

Antes de finalizar uma mudanca:

1. O metodo tem responsabilidade clara?
2. Existe `else` desnecessario que poderia virar guard clause?
3. A regra condicional deveria ser policy/strategy?
4. Algum erro generico chegou na regra de negocio?
5. O frontend recebe apenas os campos que usa?
6. Logs e erros estao livres de dados sensiveis?
7. Permissao roda no backend?
8. Existe teste para o fluxo principal e para o erro mais importante?
9. A criacao tem regra suficiente para justificar uma factory?
10. A abstracao criada reduz acoplamento real?
11. A documentacao foi atualizada se a decisao mudou?
# Leitura externa de programacao

`EmployeeScheduleService` apresenta uma interface pequena: recebe usuario autenticado e intervalo, resolve o vinculo interno e devolve `ScheduleItem`. `DrakeCrewRotationClient` concentra HTTP, autenticacao, timeout, limite de resposta e normalizacao da fonte.

Erros de vinculo sao `NotFoundException`, intervalo invalido e `BadRequestException`, acesso de preview e `ForbiddenException`, e indisponibilidade externa e `ServiceUnavailableException`. Nenhuma mensagem de erro inclui token, tenant, payload cru ou dado pessoal adicional.
