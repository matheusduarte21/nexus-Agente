# ADR-018 — Orquestração de Chat e Guardrails

**Status:** Aceito

## Contexto

A aplicação requer uma API de chat voltada ao cliente com respostas fundamentadas (*grounded*) e execução controlada de IA.

## Decisão

* Expor um *endpoint* autenticado `POST /chat`.
* Validar os corpos (*bodies*) de requisição utilizando *schemas* estritos do Zod.
* Manter um fluxo de trabalho acíclico e controlado no LangGraph.
* Gerar respostas determinísticas para dados de pedidos.
* Utilizar saída estruturada (*structured output*) do LLM para respostas de conhecimento.
* Validar as citações em relação às evidências recuperadas.
* Limitar as requisições de chat a cinco por cliente por minuto.
* Aplicar *timeouts* ao modelo e um prazo limite (*deadline*) de execução do agente.
* Não expor o estado bruto do grafo por meio da API HTTP.

## Controles de segurança

* Identidade autenticada confiável.
* Lista explícita de ferramentas permitidas (*allowlist*).
* Validação estrita de entrada e saída.
* Validação de referência das citações.
* Execução limitada de modelos e ferramentas.
* Respostas de falha sanitizadas.
* Nenhuma ferramenta de negócio disponível durante a geração da resposta.

## Consequências

* O histórico de conversas ainda não é persistido.
* A validação de citações não garante implicação factual (*factual entailment*) nem elimina riscos de *prompt injection*.
* O prazo limite (*deadline*) de execução requer suporte a cancelamento por parte das dependências *downstream*.
* Fluxos de cancelamento, memória persistente e *streaming* serão implementados separadamente.