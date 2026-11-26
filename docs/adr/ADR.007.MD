# ADR-007 — Estabelecer Identidade Confiável do Cliente

## Contexto

A Nexus Commerce requer identificação confiável do cliente antes de permitir o acesso a conversas, pedidos e operações de cancelamento.

Identificadores fornecidos pelo usuário e argumentos de ferramentas gerados por LLMs não podem ser considerados confiáveis como evidência de autenticação.

O desafio técnico permite autenticação simulada e prevê a integração futura de um mecanismo de autenticação fornecido pelo avaliador (*recruiter*).

## Decisão

A autenticação será implementada como um módulo independente seguindo a Arquitetura Hexagonal.

A aplicação exporá um contrato `Authenticator` e dependerá de uma porta (*port*) interna `CredentialVerifier`.

Para demonstração local, um verificador de credenciais simulado (*mock*) associará tokens opacos de alta entropia, gerados de forma independente, a identidades sintéticas de clientes.

Apenas hashes SHA-256 dos tokens serão armazenados na configuração do servidor.

O verificador simulado (*mock*) será proibido em ambientes de produção.

### Controles de segurança
* Nenhuma autenticação baseada exclusivamente em identificadores de usuário fornecidos pelo cliente.
* Credenciais independentes para cada cliente sintético.
* Tokens de demonstração gerados criptograficamente.
* Verificação de credenciais baseada em hash.
* Comparação de hashes resistente a ataques de temporização (*timing-safe*).
* Rejeição de credenciais malformadas e duplicadas.
* Comportamento *fail-closed* (bloqueio por padrão) quando as credenciais não estiverem configuradas.
* Ausência de valores de credenciais nos logs da aplicação.
* Representação mínima da identidade autenticada.

## Alternativas consideradas

* Confiar em um identificador de usuário enviado no corpo (*body*) da requisição.
* Cabeçalhos (*headers*) de identidade do cliente não verificados.
* Implementar um serviço completo de autenticação JWT.
* Integração externa com OAuth 2.0 ou OpenID Connect.

## Justificativa

A verificação simulada de credenciais atende aos requisitos atuais de demonstração sem introduzir uma plataforma desnecessária de gerenciamento de identidade.

A inversão de dependência permite a substituição do verificador simulado pelo mecanismo de autenticação fornecido pelo avaliador ou por um provedor de identidade de nível de produção.

## Consequências

* O verificador simulado é restrito apenas a demonstrações e testes.
* Ele não implementa expiração de tokens, revogação automatizada, federação de identidade, autenticação multifator (MFA) ou gerenciamento do ciclo de vida de identidades em produção.
* A autenticação não substitui a autorização em nível de recurso.

## Verificação

Testes unitários devem verificar credenciais válidas e inválidas, separação de identidades de clientes, rejeição de credenciais duplicadas, configuração malformada e comportamento *fail-closed*.

*Guards* de autenticação HTTP, autorização de recursos e testes ponta a ponta (*end-to-end*) adversariais serão implementados em etapas subsequentes.