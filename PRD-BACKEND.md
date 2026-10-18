# PRD Backend — FMZ Incorporadora (app de acompanhamento de obras)

> Especificação dos dados e das permissões. É lida na etapa de criar o banco no Supabase.
> O SQL não está aqui: ele é escrito na hora de construir, a partir desta descrição.
> Fonte das decisões: `PLANO-DO-PROJETO.md`. Quando uma decisão mudar, este arquivo muda junto.

## Convenções

- Tabelas no plural, em minúsculo, sem acento, com underline.
- Colunas em minúsculo, com underline.
- Toda tabela tem `id` (uuid, gerado pelo banco) e `created_at` (timestamptz, automático).
- Chave estrangeira termina em `_id`.
- Campo de lista fechada vira CHECK, com o texto **idêntico** ao da interface, com acento e maiúscula.
- Datas como `date` ou `timestamptz`. Dinheiro como `numeric(14,2)`.
- Fotos vão para o Storage. O banco guarda só o caminho do arquivo.
- **Fuso horário:** "hoje" é a data em `America/Sao_Paulo`. Toda regra "só no dia" usa esse fuso, e não o UTC do servidor.

---

## Unidade principal

**Obra.** Vai existir mais de uma? **Sim**: o engenheiro já toca várias ao mesmo tempo. Por isso:
- existe a tabela `obras`;
- existe `obra_id` em **toda** tabela que pertence a uma obra;
- existe a tabela `membros` (obra, pessoa, papel), que diz quem tem acesso a qual obra.

Só o engenheiro é membro de mais de uma obra. Mestre e cliente são membros de uma só, mas o banco não impede que isso mude.

**Os dois papéis:**
- `profiles.role` diz **o que a pessoa é** no sistema: só quem tem `Engenheiro` cria obras e convida.
- `membros.papel` diz **o que ela é naquela obra**, e é ele que manda nas permissões de cada linha.

---

## Tabela `profiles`

Liga o login à pessoa.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave; é o próprio código do login |
| nome | text | sim | |
| email | text | sim | único |
| role | text | sim | CHECK: `Engenheiro`, `Mestre`, `Cliente` |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

É criada por um gatilho quando um convite é aceito, com o `nome` e o `role` que vieram no convite.

## Tabela `obras`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| codigo | text | sim | código/apelido curto, ex.: `JE-01`. Único |
| nome | text | sim | |
| endereco | text | não | |
| cliente | text | sim | nome do cliente |
| data_inicio | date | sim | |
| data_entrega | date | sim | a data-meta de entrega **é a do contrato** (decisão do engenheiro): a única data de entrega que o cliente vê |
| situacao | text | sim | CHECK: `Em andamento`, `Concluída`, `Parada`. Padrão: `Em andamento`. Idêntico a `SITUACOES` em `src/lib/obras.js` |
| created_at | timestamptz | sim | |

**Multi-obra (regra do projeto, registrada no `AGENTS.md`):** toda tabela de lançamento, desta e das próximas fases, tem `obra_id uuid not null references obras(id)` e um índice começando por `obra_id`. Os nomes das colunas acima já são os usados pelo app (`src/lib/mockData.js`).

**Relações:** tem vários `membros`, `ambientes`, `frentes` e `diarios`; tem um `obras_valores`.

## Tabela `obras_valores`

Fica separada de `obras` porque o cliente vê a linha da obra, e o banco não esconde só uma coluna.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | único (uma linha por obra) |
| valor_contrato_cliente | numeric(14,2) | sim | ≥ 0 |
| created_at | timestamptz | sim | |

## Tabela `membros`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| profile_id | uuid | sim | |
| papel | text | sim | CHECK: `Engenheiro`, `Mestre`, `Cliente` |
| created_at | timestamptz | sim | |

**Regra:** o par (obra_id, profile_id) é único.
**Índices úteis:** profile_id. Essa coluna é usada em todas as regras de permissão.

## Tabela `empreiteiros`

Não pertence a uma obra: o mesmo empreiteiro trabalha em várias. Empreiteiro não tem login.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| nome | text | sim | |
| telefone | text | não | |
| created_at | timestamptz | sim | |

## Tabela `ambientes`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| nome | text | sim | único dentro da obra |
| created_at | timestamptz | sim | |

## Tabela `orcamento_itens`

A árvore do orçamento analítico importado: etapas e itens. O orçamento **não é montado aqui**: vem da planilha exportada do programa de orçamento do engenheiro.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| pai_id | uuid | não | a etapa de cima. Vazio nas etapas do primeiro nível |
| tipo | text | sim | CHECK: `Etapa`, `Item` |
| codigo | text | sim | ex.: `4`, `4.1`. Único dentro da obra |
| referencia | text | não | código da base de origem (SINAPI, própria…) |
| descricao | text | sim | |
| unidade | text | só `Item` | |
| quantidade | numeric(14,4) | só `Item` | > 0 |
| custo_unitario | numeric(14,4) | só `Item` | ≥ 0 |
| ordem | integer | sim | a ordem da planilha |
| ativo | boolean | sim | padrão verdadeiro. Fica falso quando uma nova importação não traz mais o item, mas ele tem frente ligada |
| created_at | timestamptz | sim | |

**Regra:** `Item` tem unidade, quantidade e custo unitário. `Etapa` não tem.
**Índices úteis:** (obra_id, codigo), pai_id.
**Totais de etapa e da obra:** calculados (soma de quantidade × custo unitário dos itens), não guardados.

## Tabela `orcamento_composicoes`

Os insumos de cada item, a parte "analítica".

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| item_id | uuid | sim | um `orcamento_itens` do tipo `Item` |
| tipo | text | sim | CHECK: `Material`, `Mão de obra`, `Equipamento`, `Serviço` |
| codigo | text | não | |
| descricao | text | sim | |
| unidade | text | sim | |
| coeficiente | numeric(14,6) | sim | > 0. Quanto do insumo por unidade do item |
| custo_unitario | numeric(14,4) | sim | ≥ 0 |
| created_at | timestamptz | sim | |

**Levantamento de material e mão de obra:** calculado na consulta, coeficiente × quantidade (do item, da frente ou do que falta executar). Não é guardado.

## Tabela `cronograma_bases`

As versões congeladas do planejamento (linha de base) do cronograma físico-financeiro.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| versao | integer | sim | 1, 2, 3… (obra_id, versao) é único |
| atual | boolean | sim | só uma `atual = verdadeiro` por obra |
| congelada_em | timestamptz | sim | |
| autor_id | uuid | sim | o engenheiro que congelou |
| observacao | text | não | ex.: "reprogramação após a chuva de outubro" |
| created_at | timestamptz | sim | |

## Tabela `cronograma_base_valores`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| base_id | uuid | sim | |
| orcamento_item_id | uuid | sim | |
| mes | date | sim | sempre o dia 1 do mês. (base_id, orcamento_item_id, mes) é único |
| valor_previsto | numeric(14,2) | sim | ≥ 0 |
| created_at | timestamptz | sim | |

**O realizado não tem tabela:** sai de `diario_avancos` (avanço do dia × quantidade da frente × custo unitário do item), agrupado por mês da `data` do diário.
**Uma base congelada nunca é editada.** Reprogramar = criar a próxima versão.

## Tabela `frentes`

Toda frente é **parte de um item do orçamento**.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| orcamento_item_id | uuid | sim | um item (`tipo = Item`) da mesma obra |
| servico | text | sim | |
| ambiente_id | uuid | não | o ambiente tem que ser da mesma obra |
| empreiteiro_id | uuid | não | vazio = `Equipe própria` |
| inicio_previsto | date | sim | |
| fim_previsto | date | sim | ≥ inicio_previsto |
| fim_limite | date | sim | ≥ fim_previsto |
| quantidade | numeric(14,4) | sim | > 0, na unidade do item (a unidade não é repetida aqui) |
| status | text | sim | CHECK: `Não iniciada`, `Em andamento`, `Concluída`. Padrão: `Não iniciada` |
| created_at | timestamptz | sim | |

**Índices úteis:** obra_id, status, orcamento_item_id.
**Regras de negócio:**
- Uma frente citada em algum diário não pode ser apagada.
- A soma da `quantidade` das frentes de um item não pode passar da `quantidade` do item. A conferência é feita no banco, ao gravar.
- **Quantidade executada da frente** = avanço atual × quantidade. **Executado do item** = soma disso nas frentes ÷ quantidade do item.
- **Orçado da frente** = quantidade × custo unitário do item. **Orçado de mão de obra da frente** = quantidade × soma (coeficiente × custo) dos insumos `Mão de obra` do item. Os dois são calculados, não guardados.

## Tabela `frentes_valores`

Fica separada para o mestre ver a frente sem nunca ver o valor.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| frente_id | uuid | sim | único |
| valor_contratado | numeric(14,2) | sim | ≥ 0. O preço unitário contratado é este valor ÷ quantidade da frente |
| created_at | timestamptz | sim | |

## Tabela `diarios`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| data | date | sim | (obra_id, data) é único: um diário por obra por dia |
| clima_manha | text | não | CHECK: `Sol`, `Nublado`, `Chuva`, `Chuva forte` |
| clima_tarde | text | não | mesmo CHECK |
| clima_noite | text | não | mesmo CHECK. A chuva da noite também conta, porque afeta concreto, escavação e o começo do dia seguinte |
| ocorrencias | text | não | |
| autor_id | uuid | sim | quem lançou (profiles) |
| created_at | timestamptz | sim | |

## Tabela `diario_avancos`

A tabela mais importante: é dela que saem o ritmo, os dias sem andar e a data limite.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | igual ao do diário e ao da frente |
| diario_id | uuid | sim | |
| frente_id | uuid | sim | (diario_id, frente_id) é único |
| avanco_acumulado | numeric(5,2) | sim | CHECK entre 0 e 100 |
| concluido | boolean | sim | padrão falso. Se verdadeiro, avanco_acumulado = 100 |
| created_at | timestamptz | sim | |

**Índices úteis:** (frente_id, diario_id).
**Regras de negócio:**
- Marcar `concluido` muda a frente para `Concluída`.
- O primeiro avanço maior que 0 muda a frente de `Não iniciada` para `Em andamento`.

## Tabela `diario_efetivo`

Quantas pessoas de cada função trabalharam numa frente naquele dia. Substitui o campo único de efetivo.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| diario_avanco_id | uuid | sim | a linha de `diario_avancos` (frente + dia) |
| funcao | text | sim | **texto livre, sem CHECK**: a lista das 14 funções principais fica na interface, e o mestre pode acrescentar outras. Gravado já com a primeira letra maiúscula |
| quantidade | integer | sim | > 0 (quantidade 0 não é gravada) |
| created_at | timestamptz | sim | |

**Regra:** (diario_avanco_id, funcao) é único.
**Funções acrescentadas pelo mestre:** a lista de "outras" de uma obra é o conjunto das `funcao` já gravadas nela que não estão entre as 14. Não precisa de tabela própria.
**Por que vale guardar assim:** junto com a medição, permite responder depois quantos dias de pedreiro e de servente cada frente consumiu. Isso alimenta a pergunta "onde foi o lucro?".

## Tabela `diario_equipamentos`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| diario_id | uuid | sim | |
| equipamento | text | sim | |
| quantidade | integer | sim | > 0 |
| origem | text | sim | CHECK: `Próprio`, `Alugado` |
| situacao | text | sim | CHECK: `Em uso`, `Parado`, `Com defeito` |
| created_at | timestamptz | sim | |

## Tabela `fotos`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| diario_id | uuid | sim | |
| frente_id | uuid | não | |
| ambiente_id | uuid | não | |
| arquivo | text | sim | caminho no Storage: `fotos/{obra_id}/{diario_id}/{id}.jpg` |
| visivel_cliente | boolean | sim | **padrão falso**. Só o engenheiro muda |
| created_at | timestamptz | sim | |

## Tabela `medicoes` (Fase 2)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| empreiteiro_id | uuid | sim | |
| periodo_inicio | date | sim | |
| periodo_fim | date | sim | ≥ periodo_inicio |
| status | text | sim | CHECK: `Rascunho`, `Fechada`. Padrão: `Rascunho` |
| created_at | timestamptz | sim | |

**Regra de negócio:** uma medição `Fechada` não aceita mudança, nem nela nem nos itens.

## Tabela `medicao_itens` (Fase 2)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| medicao_id | uuid | sim | |
| frente_id | uuid | sim | a frente tem que ser do mesmo empreiteiro da medição |
| quantidade | numeric | sim | ≥ 0 |
| valor | numeric(14,2) | sim | ≥ 0 |
| created_at | timestamptz | sim | |

---

## O resumo do cliente

O cliente **não lê** `frentes`, `diario_avancos` nem `frentes_valores`. Ele recebe o avanço por uma **função do banco** que devolve só isto, e só para uma obra da qual ele é membro:

| ambiente | avanco_percentual |
|---|---|

**Como a função calcula:** a média do avanço atual das frentes do ambiente, ponderada pelo `valor_contratado`. Quando uma frente não tem valor, ela entra com peso 1. O avanço geral é a mesma conta sobre todas as frentes da obra. O cliente recebe só os percentuais, nunca os valores.

---

## Permissões

Escrito em português. Vira RLS na hora de construir.
- "**Membro**" = existe uma linha em `membros` com a obra e a pessoa.
- "**Engenheiro da obra**" = membro com papel `Engenheiro`.
- **Toda tabela:** RLS ligada, GRANT só para `authenticated`, e **quem não fez login não vê nada**.

### `profiles`
- **Ver:** a própria linha; o engenheiro vê também as pessoas das obras dele.
- **Editar:** cada um edita o próprio `nome`. Só um engenheiro muda `role` e `ativo` de quem está nas obras dele.
- **Criar:** só o gatilho do convite.
- **Apagar:** ninguém (para tirar alguém, desativa).

### `obras`
- **Ver:** membros.
- **Criar:** quem tem `profiles.role = Engenheiro`. Quem cria vira membro `Engenheiro` na hora.
- **Editar e apagar:** engenheiro da obra. Apagar só é aceito se a obra não tem diário.

### `orcamento_itens`, `orcamento_composicoes`, `cronograma_bases`, `cronograma_base_valores`, `obras_valores`, `frentes_valores`, `medicoes`, `medicao_itens`
- **Ver, criar, editar e apagar:** só o engenheiro da obra.
- Mestre e cliente: nada, nem ver.

### `membros`
- **Ver:** o engenheiro da obra vê todos. Os outros veem só a própria linha.
- **Criar:** só pelo processo de convite.
- **Apagar:** engenheiro da obra (e nunca a própria linha).

### `empreiteiros`
- **Ver:** quem é membro `Engenheiro` ou `Mestre` de alguma obra. **O cliente não vê.**
- **Criar e editar:** quem tem `profiles.role = Engenheiro`.
- **Apagar:** engenheiro, só se nenhuma frente usa o empreiteiro.

### `ambientes`
- **Ver:** membros (inclusive o cliente, que precisa do nome dos ambientes).
- **Criar, editar e apagar:** engenheiro da obra.

### `frentes`
- **Ver:** membros `Engenheiro` e `Mestre`. **O cliente não vê.**
- **Criar, editar e apagar:** engenheiro da obra.
- **Mudança de status pelo diário:** acontece pelo gatilho do `diario_avancos`, e não por edição do mestre.

### `diarios`, `diario_avancos`, `diario_efetivo`, `diario_equipamentos`
- **Ver:** membros `Engenheiro` e `Mestre`. O cliente não vê.
- **Criar e editar:**
  - mestre da obra, **só quando a data do diário é hoje** (fuso de São Paulo);
  - engenheiro da obra, **qualquer data entre `obras.data_inicio` e hoje** (diário atrasado). Data futura ou anterior ao início da obra é recusada pelo banco, não só pela tela.
- **Apagar:** engenheiro da obra.

**Diário atrasado:**
- **Sem coluna nova:** `diarios.created_at` guarda quando foi lançado, e `diarios.data`, o dia a que se refere. "Atrasado" = `created_at` (na data de São Paulo) depois de `data`, calculado na consulta.
- **Ordem do avanço:** ao gravar `diario_avancos`, o banco confere que o `avanco_acumulado` fica **entre** o do diário anterior e o do diário seguinte da mesma frente, em ordem de `data`. Fora disso, recusa com a mensagem que a tela mostra. O mesmo vale ao editar um dia antigo.
- **Status da frente:** o gatilho de status olha o avanço do diário de **data mais recente** da frente, não o do último lançado. Um diário atrasado de agosto não reabre uma frente concluída em setembro.
- **Fotos de diário atrasado:** vêm da galeria. `fotos.created_at` = quando subiu; a data da foto é a do diário.

### `fotos`
- **Ver:**
  - membros `Engenheiro` e `Mestre`: todas da obra;
  - cliente: só as com `visivel_cliente = verdadeiro` da obra dele.
- **Criar:** mestre (só no diário de hoje) e engenheiro.
- **Editar `visivel_cliente`:** só o engenheiro da obra.
- **Apagar:** engenheiro da obra (apaga o registro e o arquivo).

### Storage — pasta `fotos`
- Pasta **privada**. A foto é mostrada por um link temporário.
- Quem pode ler um arquivo é quem pode ver a linha correspondente em `fotos`: o cliente só lê arquivos liberados.
- Enviar: mestre e engenheiro da obra, na pasta da própria obra.

---

## Fluxo de cadastro e liberação

1. **Cadastro público desligado.** Ninguém cria conta sozinho.
2. O engenheiro, em Obras e equipe → Equipe → Convidar, informa nome, email e papel.
3. O processo **Convite** (abaixo) envia o email e já deixa a pessoa ligada à obra.
4. A pessoa abre o link, define a senha e entra direto na tela do papel dela, vendo só aquela obra.
5. Para tirar alguém: o engenheiro remove a pessoa da obra (apaga a linha em `membros`) ou a desativa (`ativo = falso`). Quem está desativado não vê nada, mesmo que ainda tenha a linha em `membros`.

**O primeiro acesso:** o primeiro engenheiro é criado à mão no painel do Supabase, na hora de construir, com `role = Engenheiro`. Dali em diante, tudo é por convite.

## Processos automáticos

### Leitura de projeto pela IA (Fase 3, opcional)
- **Gatilho:** o engenheiro toca "Ler e propor levantamento" na Calculadora.
- **Onde roda:** numa **Edge Function do Supabase** (`ler-projeto`, em TypeScript), nunca no navegador. A chave da API da Anthropic fica como segredo do Supabase (`ANTHROPIC_API_KEY`). A função recusa quem não for engenheiro da obra.
- **Passos:**
  1. O PDF sobe para o Storage, na pasta privada `projetos/{obra_id}/`. Máximo de 32 MB, o limite da API.
  2. A função monta o pedido com o **SDK oficial da Anthropic** (`@anthropic-ai/sdk`):
     - modelo `claude-opus-5-5`, com `thinking: {type: "adaptive"}`;
     - o PDF como bloco `document` (base64) antes do texto;
     - o texto do engenheiro e a **lista de itens do orçamento da obra** (código, descrição, unidade) que tenham composição;
     - a instrução de usar só esses códigos ou deixar `codigo_item` vazio quando não houver item.
  3. A resposta vem em **saída estruturada** (`output_config.format`), com linhas de `codigo_item` (ou nulo), `descricao`, `quantidade`, `unidade`, `memoria_calculo` e `confianca` (`alta`, `media`, `baixa`).
  4. Com `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`), um pedido recusado pelos filtros de segurança passa automaticamente para outro modelo. A função confere sempre o `stop_reason` antes de ler a resposta.
  5. Uso de streaming, porque a leitura de um projeto grande pode demorar.
  6. A função grava a leitura em `leituras_ia` (obra, autor, arquivo, texto, resposta, tokens de entrada e saída e custo estimado) e devolve as linhas à tela.
- **Resultado:** a proposta aparece para conferência. **A função nunca cria frentes:** isso só acontece quando o engenheiro confirma, pela mesma gravação de frentes de sempre, com as mesmas regras (saldo do item etc.).
- **Se falhar:** a tela mostra "Não consegui ler este projeto com segurança…", e a falha fica registrada em `leituras_ia` com o erro.
- **Custo:** cobrado por token na conta da Anthropic do engenheiro (Claude Opus 5.5: US$ 4 por milhão de tokens de entrada e US$ 20 por milhão de saída). Estimativa de US$ 0,10 a 0,50 por leitura de projeto de algumas pranchas. `[DESCOBRIR NO USO: o custo real por projeto — fica registrado em leituras_ia]`

## Tabela `projetos` (Projeto marcado, Fase 2)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| nome | text | sim | ex.: "Executivo rev. 03" |
| arquivo | text | sim | caminho no Storage, pasta privada `projetos/{obra_id}/` |
| enviado_por | uuid | sim | |
| created_at | timestamptz | sim | |

## Tabela `projeto_pranchas`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| projeto_id | uuid | sim | |
| pagina | integer | sim | ≥ 1. (projeto_id, pagina) é único |
| nome | text | sim | ex.: "Prancha 02 · Fundações" |
| metros_por_unidade | numeric(14,8) | não | a escala calibrada. Vazio = ainda não calibrada (as marcações aparecem sem medida) |
| created_at | timestamptz | sim | |

## Tabela `projeto_marcas`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| prancha_id | uuid | sim | |
| orcamento_item_id | uuid | sim | o serviço marcado |
| frente_id | uuid | não | quando a marcação é de uma frente específica |
| tipo | text | sim | CHECK: `Linha`, `Área` |
| pontos | jsonb | sim | lista de `[x, y]` em coordenadas da página. Linha ≥ 2 pontos, área ≥ 3 |
| medida | numeric(14,4) | não | m (linha) ou m² (área), calculada pela escala ao gravar |
| data_execucao | date | sim | |
| autor_id | uuid | sim | |
| created_at | timestamptz | sim | |

**Permissões:**
- **Ver:** membros `Engenheiro` e `Mestre` da obra. O cliente não.
- **Criar, editar e apagar:** **só o engenheiro da obra** (decisão do engenheiro). O mestre só lê.
- O mesmo vale para `projetos` e `projeto_pranchas` (enviar PDF e calibrar escala).
- **Storage `projetos/`:** só engenheiro e mestre da obra leem. Só o engenheiro envia.

**A medida não muda o diário:** é referência. O avanço oficial continua em `diario_avancos`.

## Tabela `leituras_ia` (Fase 3)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | |
| obra_id | uuid | sim | |
| autor_id | uuid | sim | |
| arquivo | text | não | caminho no Storage (`projetos/…`) |
| texto | text | não | a descrição digitada |
| resposta | jsonb | não | as linhas propostas |
| status | text | sim | CHECK: `Concluída`, `Falhou` |
| erro | text | não | |
| tokens_entrada | integer | não | |
| tokens_saida | integer | não | |
| custo_estimado_usd | numeric(10,4) | não | |
| created_at | timestamptz | sim | |

Permissões: só o engenheiro da obra vê. Ninguém edita nem apaga pela tela (é registro).

### Congelar linha de base do cronograma
- **Gatilho:** o engenheiro toca "Nova linha de base" (ou "Congelar linha de base", na primeira vez) e confirma.
- **Passos:**
  1. Uma função do banco cria a próxima versão em `cronograma_bases`.
  2. Para cada frente, distribui o valor (quantidade × custo unitário do item) igualmente pelos dias entre `inicio_previsto` e `fim_previsto`, soma por item e por mês e grava em `cronograma_base_valores`.
  3. Marca a nova versão como `atual` e a anterior como não atual. Tudo numa transação só.
- **Resultado:** o cronograma passa a comparar o realizado com a nova versão, e as antigas ficam guardadas.
- **Se falhar:** nada muda, a base anterior continua atual e o engenheiro vê o erro genérico.

### Importação do orçamento analítico
- **Gatilho:** o engenheiro confirma a importação de uma planilha (Excel ou CSV) na tela Orçamento.
- **Passos:**
  1. A planilha é lida **no navegador** e transformada em etapas, itens e composições. A prévia mostra os totais e as linhas com problema.
  2. Ao confirmar, tudo é gravado de uma vez numa função do banco, numa única transação.
  3. **Numa nova versão:** itens com o mesmo `codigo` são atualizados. Itens novos entram. Itens que sumiram sem frente ligada são apagados. Itens que sumiram mas têm frente ligada ficam com `ativo = falso`. As composições de cada item são trocadas inteiras.
- **Resultado:** a árvore do orçamento atualizada e as frentes preservadas.
- **Se falhar:** nada é gravado (a transação volta inteira), e o engenheiro vê qual linha da planilha causou o erro.
- **Formato aceito na v1: a planilha modelo do sistema**, `modelo-orcamento-analitico.csv` (nesta pasta). É um CSV com ponto e vírgula, vírgula decimal e UTF-8, que abre direto no Excel. As colunas, nesta ordem, são `tipo;codigo;referencia;descricao;unidade;quantidade;coeficiente;custo_unitario`.
  - `tipo` = `Etapa`, `Item`, `Material`, `Mão de obra`, `Equipamento` ou `Serviço`.
  - **Etapa:** só `codigo` e `descricao`. A etapa-pai de um item sai do código: `4.1` pertence a `4`.
  - **Item:** `unidade`, `quantidade` e `custo_unitario`.
  - **Insumo** (Material, Mão de obra, Equipamento, Serviço): o `codigo` é o do item a que pertence, mais `unidade`, `coeficiente` e `custo_unitario`.
  - O próprio sistema oferece o botão "Baixar planilha modelo" na tela de importação.
- `[PENDENTE: ler direto a exportação do programa de orçamento do engenheiro. Fica para quando houver um arquivo real de exemplo. Até lá, o engenheiro copia e cola do programa para a planilha modelo.]`

### Convite
- **Gatilho:** o engenheiro toca "Convidar".
- **Passos:**
  1. Uma função no servidor (Edge Function) confere se quem pediu é engenheiro daquela obra.
  2. Envia o convite por email pelo Supabase Auth, levando `nome` e `role`.
  3. Cria a linha em `membros` (obra, pessoa, papel).
  4. Se o email já tem conta, pula o envio e só cria a linha em `membros`.
- **Resultado:** a pessoa aparece na Equipe com "Convite enviado" e recebe o email.
- **Se falhar:** nada é criado pela metade, e o engenheiro vê "Não foi possível enviar o convite para {email}. Confira o endereço e tente de novo."

### Status da frente pelo diário
- **Gatilho:** gravação em `diario_avancos`.
- **Passos:**
  1. Se `concluido` = verdadeiro, a frente vira `Concluída`.
  2. Senão, se o avanço é maior que 0 e a frente está `Não iniciada`, ela vira `Em andamento`.
- **Resultado:** o Painel e as Frentes mostram o status certo sem ninguém editar a frente.
- **Se falhar:** o lançamento inteiro do diário é desfeito, e o mestre vê o erro genérico, sem perder o que digitou na tela.

## PDF do diário (RDO)

- **Nenhuma tabela nova.** O RDO é montado no navegador a partir de `diarios`, `diario_avancos`, `diario_efetivo`, `diario_equipamentos` e `fotos`, e salvo em PDF pela impressão do navegador. O PDF não é guardado no Storage.
- **Número do RDO:** `data − obras.data_inicio + 1` (o dia da obra, em dias corridos), calculado na consulta, não é coluna. Lançar um diário atrasado ou apagar um dia **não muda o número de nenhum outro RDO**. (Substitui a regra antiga, "posição em ordem de data", que renumeraria RDOs já assinados.)
- **Permissões:** quem gera é quem já pode ler o diário, ou seja, membros `Engenheiro` e `Mestre`. O cliente não lê essas tabelas, então não consegue gerar o RDO.
- **Fotos no RDO:** entram todas as fotos do dia (inclusive as não liberadas ao cliente), pelo mesmo link temporário do Storage.

## Arquivos

- Guardados no Storage, na pasta privada `fotos`, em `fotos/{obra_id}/{diario_id}/{id}.jpg`.
- Imagem comprimida no navegador antes de subir: no máximo 1600px, qualidade 0,8.
- O banco guarda só o caminho, em `fotos.arquivo`.

## Critérios de aceite

- [ ] Sem login, nenhuma tabela devolve linha nenhuma.
- [ ] O cadastro público está desligado: criar conta sem convite é recusado.
- [ ] Logado como o mestre do Jardim Europa, uma consulta direta a `frentes`, `diarios` e `fotos` **não devolve nenhuma linha do Vila Nova**. Testado, não presumido.
- [ ] Logado como mestre, consultar `frentes_valores`, `obras_valores`, `medicoes` ou `medicao_itens` devolve zero linhas.
- [ ] O mestre consegue lançar o diário de hoje, mas não consegue editar o de ontem.
- [ ] O engenheiro lança um diário de 3 meses atrás; o RDO de um dia posterior já existente mantém o mesmo número.
- [ ] Um diário com data futura, ou antes do início da obra, é recusado pelo banco.
- [ ] Num diário atrasado, um avanço maior que o do diário seguinte da mesma frente é recusado.
- [ ] Um diário atrasado de agosto não reabre uma frente marcada como Concluída em setembro.
- [ ] Logado como cliente, consultar `frentes`, `diarios`, `diario_avancos`, `empreiteiros` ou `frentes_valores` devolve zero linhas.
- [ ] O cliente lê `fotos` e recebe só as liberadas. Tentar abrir o arquivo de uma foto não liberada falha.
- [ ] A função do resumo devolve o avanço por ambiente para o cliente da obra e recusa a mesma chamada para outra obra.
- [ ] Gravar `clima_manha = 'sol'` (minúsculo) é recusado pelo CHECK. Os valores do banco são idênticos aos da interface.
- [ ] `avanco_acumulado = 120` é recusado.
- [ ] Marcar `concluido` num avanço muda a frente para `Concluída`.
- [ ] Um segundo diário para a mesma obra e o mesmo dia é recusado.
- [ ] Apagar uma frente que já aparece num diário é recusado.
- [ ] Uma medição `Fechada` não aceita edição.
- [ ] Logado como mestre, `orcamento_itens` e `orcamento_composicoes` devolvem zero linhas.
- [ ] Gravar uma frente que faz a soma das frentes de um item passar da quantidade do item é recusado.
- [ ] Uma frente ligada a uma `Etapa` (e não a um `Item`) é recusada.
- [ ] Reimportar o orçamento sem um item que tem frente ligada deixa o item com `ativo = falso`, sem apagar a frente nem o diário dela.
- [ ] Uma importação com erro numa linha não grava nada.
- [ ] Editar uma linha de `cronograma_base_valores` de uma base já congelada é recusado.
- [ ] Depois de "Nova linha de base", existe exatamente uma base `atual` na obra, e a soma dos `valor_previsto` da base é igual à soma do orçado das frentes.
- [ ] Logado como mestre, `cronograma_bases` e `cronograma_base_valores` devolvem zero linhas.
- [ ] A Edge Function `ler-projeto` recusa quem não é engenheiro da obra, e a chave da Anthropic não aparece em nenhuma resposta nem no código do navegador.
- [ ] Uma leitura pela IA nunca cria frentes. Toda leitura, com sucesso ou falha, fica em `leituras_ia` com os tokens usados.
- [ ] Toda tabela tem GRANT escrito para `authenticated` na migration, e nenhum GRANT para `anon`.

## A conta que vai chegar depois

- `[PENDENTE: aditivos de contrato com o cliente]` — sem eles, o "quanto entra" da pergunta "onde foi o lucro?" fica incompleto quando o contrato muda.
- `[PENDENTE: custo de materiais e de equipamento alugado]` — entra na v2. Até lá, "onde foi o lucro?" responde só pela mão de obra.
- `[PENDENTE: armazenamento das fotos]` — com várias obras, as fotos podem passar do limite grátis do Supabase (plano pago de uns US$ 25 por mês).

## Decidir depois de usar

- `[DESCOBRIR NO USO: avanço por ambiente ponderado por valor ou média simples]` — por enquanto: ponderado pelo valor contratado.
