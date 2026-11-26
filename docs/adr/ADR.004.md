# ADR-004 — Adoção de Configuração Validada e Padrões Seguros de HTTP

## Contexto

O backend da Nexus Commerce irá se integrar com APIs externas, bancos de dados, provedores de LLM e serviços de observabilidade.

Configurações inválidas, definições de HTTP sem restrições e respostas de erro não controladas podem introduzir vulnerabilidades de segurança e falhas operacionais.

## Decisão

Usaremos o ConfigModule do NestJS combinado com o Zod para validar as variáveis de ambiente durante a inicialização da aplicação.

A aplicação adotará inicialização fail-fast e padrões seguros de HTTP.

A configuração de HTTP será centralizada e reutilizada pelos testes end-to-end.

## Controles de segurança

- Configuração de ambiente validada.
- Nenhum fallback direto para variáveis de ambiente não validadas por meio do ConfigService.
- Valores de configuração sensíveis excluídos das mensagens de erro de validação.
- Configuração explícita de origens do CORS.
- Cabeçalhos HTTP de segurança por meio do Helmet.
- Limites de tamanho para o corpo de requisições JSON.
- Corpos de requisição comprimidos desativados.
- Respostas de erro HTTP sanitizadas.
- Endpoint de liveness mínimo.
- Encerramento gracioso (graceful shutdown).

## Alternativas consideradas

- Uso direto de process.env em toda a aplicação.
- Interfaces TypeScript sem validação em tempo de execução.
- Configuração de CORS sem restrições.
- Retornar mensagens de exceção cruas aos clientes.

## Justificativa

A validação centralizada em tempo de execução reduz erros de configuração e melhora a previsibilidade, a testabilidade e a segurança.

Limites explícitos de HTTP reduzem a exposição desnecessária de recursos.

Respostas sanitizadas minimizam a divulgação de informações.

## Consequências

A aplicação se recusará a iniciar quando a validação da configuração falhar.

Novas variáveis de configuração devem ser registradas no schema.

Mudanças na configuração de HTTP devem ser acompanhadas de testes automatizados apropriados.

CORS, cabeçalhos de segurança e limites de payload não substituem autenticação, autorização, rate limiting ou segurança em nível de rede.

## Validação

Testes unitários validarão a configuração de ambiente.

Testes end-to-end verificarão os cabeçalhos de segurança HTTP, o comportamento do CORS, os limites de payload, a sanitização de erros e o liveness.