# LGPD And Privacy

## Decision

LGPD e requisito obrigatorio do Jornada.

O produto deve proteger dados pessoais e dados sensiveis desde a modelagem, sem transformar a experiencia do funcionario em um fluxo burocratico.

Diretriz:

- privacidade por padrao
- coleta minima
- transparencia simples
- permissao e finalidade claras
- seguranca tecnica proporcional ao risco
- auditoria sem expor segredo ou dado sensivel em log

Este documento orienta arquitetura e produto. Validacoes juridicas finais devem ser feitas com responsavel legal/encarregado de dados da empresa.

## Principles

Aplicar os principios da LGPD como criterios de engenharia:

- finalidade: cada dado precisa ter motivo claro
- adequacao: dado coletado deve combinar com a funcionalidade
- necessidade: nao coletar campo que a tela ou processo nao usa
- livre acesso: funcionario deve conseguir entender dados principais usados no app
- qualidade dos dados: dados relevantes devem ser corretos e atualizaveis
- transparencia: explicar de forma curta por que o dado e usado
- seguranca: proteger dados contra acesso indevido, vazamento e perda
- prevencao: reduzir risco antes do incidente
- responsabilizacao: manter trilha de decisao e auditoria

## Data Classification

Classificacao minima para o Jornada:

| Classe | Exemplos | Regra |
| --- | --- | --- |
| Publico interno | nome de equipe, status generico | pode aparecer para usuarios autenticados conforme permissao |
| Pessoal | nome, email, matricula, telefone, agenda, cargo | minimizacao, RBAC e auditoria |
| Sensivel ou alto risco | dados de saude/ASO, documentos, CPF, anexos, comentarios com dados medicos | criptografia, acesso restrito, logs sanitizados |
| Segredo | senha, token, refresh token, bearer token, secrets de integracao | hash/criptografia, nunca retornar, nunca logar |

## Backend Rules

- Controllers finos; regras de privacidade ficam em services/policies.
- DTO de resposta nao deve espelhar tabela quando houver dado pessoal ou sensivel.
- Filtros de permissao devem rodar no backend.
- Logs devem conter ids tecnicos/correlacao, nao documentos, CPF, senha, token, descricao medica ou conteudo sensivel de mensagem.
- Historicos longos devem ser paginados.
- Exportacoes devem ter trilha de auditoria e escopo minimo.
- Dados sensiveis devem ser isolados por campo/tabela quando isso facilitar criptografia, retencao e controle de acesso.

## Audit and external observability

Auditoria e observabilidade tem papeis diferentes.

`AuditLog` no banco registra acao rastreavel do sistema: usuario ator, acao, entidade, id, data, resumo sanitizado e metadados minimos.

Sentry ou ferramenta similar registra erro tecnico, trace, performance e diagnostico. Nao substitui auditoria de negocio.

Regras LGPD:

- nao enviar CPF, CNPJ, senha, bearer token, refresh token, cookie, documento, descricao medica ou texto livre sensivel para observabilidade externa
- configurar scrubber/`beforeSend` antes de habilitar Sentry em producao
- desabilitar ou filtrar query string em eventos externos, pois query string pode conter PII
- ticket SSO efemero tambem e segredo: armazenar apenas hash, nunca inclui-lo em log/observabilidade e usar politica de referrer restritiva no destino
- o login e centralizado no Jornada; apps de destino podem transportar somente codigo do app e caminho local allowlisted, nunca token, identificador pessoal ou credencial na URL
- manter `sendDefaultPii` desabilitado salvo decisao explicita e documentada
- guardar diffs de auditoria apenas quando o campo for seguro; para campo sensivel, registrar classe, id tecnico e acao
- definir retencao de auditoria por classe de dado antes de exportacao/anexo sensivel

## Encryption Direction

Criptografar obrigatoriamente:

- senhas: hash forte, nunca criptografia reversivel
- refresh tokens e reset tokens: hash
- secrets de integracao: criptografia ou vault
- anexos sensiveis: criptografia em repouso
- campos de alto risco quando persistidos diretamente, como CPF e detalhes sensiveis de saude/documentos

Criptografia em transito:

- HTTPS obrigatorio fora do desenvolvimento local
- cookies/tokens com configuracao segura quando forem usados em producao
- WebSocket autenticado com o mesmo rigor do HTTP

## Consent And Legal Basis UX

Nem todo tratamento depende de consentimento. Alguns usos podem estar ligados a contrato de trabalho, obrigacao legal/regulatoria, execucao de contrato, protecao da saude, exercicio regular de direitos ou legitimo interesse.

Mesmo assim, o app deve explicar de forma simples:

- que dado sera usado
- para qual finalidade
- quem pode acessar
- como pedir correcao ou suporte

Convite enviado para email pessoal deve informar que o endereco sera usado
para acesso e comunicacoes de seguranca da conta. Esse aviso e transparencia
de finalidade; nao deve usar uma caixa de consentimento generico quando a base
legal do tratamento for outra.

Implementacao inicial de convite:

- convite persiste somente hash do segredo e expira em sete dias
- auditoria e eventos de entrega registram ids tecnicos, nunca o token bruto
- nome, email e matricula opcional sao o minimo permitido no convite; CPF,
  nascimento, saude, documentos e comentarios livres do funcionario nao entram
- o adaptador transacional de email continua pendente; nenhum segredo pode ser
  exposto no retorno administrativo para compensar essa ausencia

Quando consentimento for necessario:

- pedir de forma destacada
- registrar versao do termo, data, usuario, finalidade e origem
- permitir bloquear o fluxo se o consentimento for indispensavel
- evitar textos longos na jornada principal; usar resumo curto e detalhe expansivel

## Employee Experience

O funcionario deve perceber boas praticas sem sofrer com burocracia.

Padrao recomendado:

- textos curtos proximos do campo sensivel
- "por que pedimos isso?" como detalhe secundario
- aviso claro quando dado sensivel for anexado
- confirmacao antes de enviar documento ou informacao medica
- feedback simples: recebido, em analise, resolvido
- politica completa acessivel em tela propria

## Application Catalog

O catalogo de aplicativos armazena apenas metadados operacionais: codigo, nome, descricao, tipo de entrada, rota ou URL, imagem e status. Ele nao deve conter credenciais, tokens, identificadores pessoais ou dados de acesso de terceiros.

- somente `ADMIN` pode criar ou alterar entradas, com auditoria de antes/depois
- URLs de imagem e redirecionamento sao validadas no backend; a imagem e opcional e deve permanecer publica ou atender a uma futura politica de midia privada
- concessao de acesso continua em `UserApplicationAccess`; cadastrar um app nao concede acesso a ninguem
- links externos nao recebem token de sessao, ticket SSO ou dados pessoais pela URL

## Support Module Rules

Atendimento pode conter dados pessoais e sensiveis porque o funcionario pode relatar problema de documento, ASO, saude ocupacional, escala ou dados familiares.

Regras especificas:

- mensagem e descricao devem ser tratadas como potencialmente sensiveis
- texto livre de atendimento deve ser normalizado por policy e nunca aparecer em logs operacionais
- eventos de auditoria devem guardar metadados de privacidade, nao copiar o conteudo sensivel
- eventos de dominio de formularios devem carregar apenas ids tecnicos, origem e estado; respostas e anexos nunca devem seguir no payload de fila ou log
- anexos nas fases futuras devem nascer privados
- equipe ve apenas atendimentos permitidos
- atendente individual ve o que esta atribuido ou permitido pela equipe
- avaliacao deve medir experiencia sem pedir dado sensivel
- comentario de avaliacao deve ter limite e aviso contra envio de dado sensivel
- fechamento, resolucao e transferencia devem registrar motivo operacional seguro
- atendimento fechado nao deve receber novas mensagens sem reabertura formal futura

## Checklist For New Features

Antes de implementar feature nova, responder:

1. Qual dado pessoal entra?
2. Qual dado sensivel pode aparecer?
3. Qual finalidade justifica cada campo?
4. Qual base legal provavel sustenta o tratamento?
5. Quem pode ver, editar, exportar e excluir?
6. O frontend precisa mesmo desse campo?
7. O dado aparece em log, erro, analytics ou cache?
8. Existe retencao ou descarte definido?
9. Precisa consentimento ou apenas aviso/transparencia?
10. O fluxo bloqueia corretamente se autorizacao for obrigatoria?

## Next Implementation Items

- criar `PrivacyConsent` para registrar aceite quando houver consentimento real
- criar `DataProcessingNotice` para versoes de avisos de privacidade
- criar policy/helper de mascaramento de CPF, telefone e email
- criar padrao de campos criptografados para dados sensiveis
- revisar logs existentes para sanitizacao
- criar pagina de privacidade do colaborador
- definir retencao para mensagens, anexos e auditorias
- manter contas desativadas sem descarte automatico ate orientacao juridica
- definir retencao, desativacao e eventual anonimizacao de contas com historico
- definir fluxo privado de anexos antes de permitir upload em atendimento
- configurar observabilidade externa somente com scrubber LGPD e query string filtrada
# Piloto Drake: programacao do colaborador

Finalidade: exibir ao proprio colaborador sua programacao operacional no Jornada. A consulta e sob demanda, autenticada e limitada por intervalo.

- o browser nunca recebe `DRAKE_AUTH_TOKEN`, tenant, `WorkerId`, unidade operacional, propriedades brutas ou resposta completa da fonte; a pre-visualizacao administrativa usa referencia opaca, curta e vinculada ao administrador;
- o backend devolve somente o `ScheduleItem` necessario para a timeline;
- cada leitura normal e administrativa e auditada com origem, escopo, quantidade e intervalo, sem persistir itens sensiveis ou payload externo no log;
- a pre-visualizacao administrativa e excepcional, restrita a `ADMIN`, e serve para validar o vinculo antes de uso pelo colaborador;
- nao usar a programacao para nova finalidade, notificacao ou decisao automatizada sem nova revisao de base legal, transparencia e retencao.

# Piloto Drake: qualificacoes do colaborador

Finalidade: exibir ao proprio colaborador suas necessidades de ASO, treinamentos e qualificacoes no Jornada. A consulta e sob demanda, autenticada, filtrada pelo vinculo interno do funcionario e sem limite artificial de quantidade ou janela de vencimento no Jornada.

- o browser nunca recebe `DRAKE_AUTH_TOKEN`, tenant, `WorkerId`, identificador externo da necessidade, propriedades brutas ou resposta completa da fonte;
- o backend devolve somente o `RequirementExpiration` necessario para Inbox e Vencimentos;
- cada leitura e auditada com origem, escopo e quantidade, sem persistir payload externo ou dados sensiveis no log;
- a pre-visualizacao administrativa e excepcional, restrita a `ADMIN`, usa referencia opaca curta vinculada ao administrador e serve para validar vencimentos por colaborador sem criar conta operacional falsa;
- nao usar vencimentos para nova finalidade, notificacao automatizada ou decisao disciplinar sem nova revisao de base legal, transparencia e retencao.
