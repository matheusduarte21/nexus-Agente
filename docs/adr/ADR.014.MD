# ADR-014 — Processamento de Documentos e Provedores de Embedding

**Status:** Aceito

## Contexto

A Nexus Commerce requer capacidades de processamento de documentos e recuperação semântica para fornecer respostas de suporte ao cliente fundamentadas (*grounded*).

## Decisão

* Dar suporte a documentos PDF, TXT e Markdown.
* Utilizar o `RecursiveCharacterTextSplitter` do LangChain.
* Iniciar com fragmentos (*chunks*) de 1.600 caracteres e sobreposição (*overlap*) de 240 caracteres.
* Preservar os hashes dos documentos e os números de página dos PDFs.
* Utilizar o modelo `text-embedding-3-small` da OpenAI com 1.536 dimensões.
* Fornecer um provedor local determinístico simulado (*mock*) de *embeddings*.
* Armazenar o identificador do modelo de *embedding* junto a cada vetor.

### Controles de segurança
* Restringir formatos e tamanhos de documentos suportados.
* Processar apenas documentos locais aprovados.
* Limitar a contagem de páginas de PDF e o tamanho do texto extraído.
* Validar entradas e saídas de *embeddings*.
* Limitar o tamanho dos lotes (*batches*) de *embeddings*.
* Aplicar *timeouts* aos provedores e desabilitar tentativas automáticas (*retries*).
* Manter credenciais de API fora do código-fonte.
* Tratar o conteúdo dos documentos como dados não confiáveis.

## Justificativa

A abstração de provedores permite realizar testes sem custos de APIs externas, preservando a compatibilidade com a geração real de *embeddings*.

O LangChain fornece divisão reutilizável de documentos (*document splitting*) sem exigir uma implementação customizada de *chunking*.

## Consequências

* Os tamanhos de fragmentos baseados em caracteres podem exigir ajustes após a avaliação da recuperação (*retrieval*).
* O provedor simulado (*mock*) não oferece *embeddings* semânticos reais.
* *Embeddings* produzidos por modelos diferentes não devem ser misturados durante a recuperação.
* A ingestão de documentos, filtragem na recuperação, citações e controles contra *prompt injection* serão implementados em etapas subsequentes.