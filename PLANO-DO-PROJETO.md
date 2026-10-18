# Plano do Projeto — FMZ Incorporadora (app de acompanhamento de obras)

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 18/10/2026 — as três etapas estão fechadas e PRD-FRONTEND.md e PRD-BACKEND.md estão escritos. Falta só a decisão da cor.

## Em uma frase

Um sistema de **acompanhamento de obra** que responde, toda manhã, **se a data de entrega do cliente está de pé** para o **engenheiro que toca várias obras ao mesmo tempo**, juntando num lugar só o diário do mestre, o avanço de cada frente de serviço e a medição dos empreiteiros.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — A sexta-feira perdida juntando informação
- **Como acontece hoje:** toda sexta à tarde o engenheiro junta três fontes na mão: o que o mestre contou no canteiro, o que os empreiteiros mandaram no WhatsApp e o que está na planilha de medição.
- **Frequência:** toda semana.
- **Custo:** uma tarde inteira por semana. `[PENDENTE: quantas horas, mais ou menos — 4h?]`
- **Último caso:** `[PENDENTE: não informado]`

### Problema 2 — O atraso só aparece duas semanas depois
- **Como acontece hoje:** mesmo depois da sexta, na segunda ainda não dá para dizer se a entrega está de pé. Quando aparece que uma frente atrasou, já se passaram duas semanas.
- **Frequência:** em toda obra.
- **Custo:** duas semanas de reação perdidas por atraso, e a resposta ao cliente vira chute.
- **Último caso:** `[PENDENTE: não informado]`

### Problema 3 — Informação espalhada que ninguém relê
- **Como acontece hoje:** a medição fica numa planilha com uma aba por empreiteiro, sempre desatualizada. O diário fica num caderno. As fotos ficam soltas em cinco grupos de WhatsApp. O levantamento de material e de mão de obra é feito na mão para cada serviço. O cronograma está no MS Project, que só é aberto quando o cliente pergunta.
- **Frequência:** todo dia.
- **Custo:** retrabalho, e nenhuma fonte confiável na hora de responder ao cliente.

## A solução

O mestre lança o diário pelo celular, no canteiro: o que andou em cada frente, as fotos e o que foi concluído. O sistema calcula, para cada frente, há quantos dias ela não anda e até quando dá para decidir antes de empurrar a entrega. O engenheiro abre a lista de manhã, já ordenada pelo que está pior, e não precisa perguntar nada a ninguém. A medição dos empreiteiros sai dos mesmos dados, e o cliente vê o avanço e as fotos num acesso só dele.

**O que ele NÃO faz (v1):**
- **Montar** orçamento ou composição de preço: isso continua no seu programa de orçamento. O sistema **importa o orçamento analítico pronto**, mostra e usa os serviços dele, mas não serve para orçar (decisão do engenheiro, 18/10/2026).
- Importar o arquivo do MS Project: na v1 as frentes e as datas são cadastradas no sistema. Importar ficaria para a v2.
- Pagamento de empreiteiro ou financeiro da obra: o sistema mede, mas não paga.
- Materiais por frente (levantamento, pedido e entrega): ficou para a v2, por decisão do engenheiro.
- Mandar mensagens pelo WhatsApp ou ler o WhatsApp dos empreiteiros (eles continuam só no WhatsApp, e o sistema não se liga a ele).

## Funcionalidades

### 1. Painel de frentes (a tela do dia)
- **Abre em:** lista, com a obra escolhida no seletor do topo.
- **Mostra:** serviço · ambiente · responsável (empreiteiro ou equipe própria) · % de avanço · **há quantos dias não anda** · **data limite de decisão** · folga em dias (data limite menos hoje).
- **Ordem e filtro:** a menor folga primeiro; folga negativa (a entrega já está empurrada) fica no topo, em vermelho. Filtros: responsável e ambiente. Frentes concluídas ficam escondidas.
- **Ações:** só olhar e abrir o detalhe.
- **Ao clicar num item:** abre o detalhe da frente, com o histórico do diário, as fotos e as quantidades medidas.
- **Vazio:** "Nenhuma frente cadastrada nesta obra. Cadastre as frentes do cronograma para começar."
- **As duas contas que eu chutei:**
  - **Dias sem andar:** conta desde o último diário em que o avanço da frente subiu.
  - **Data limite de decisão (confirmada pelo engenheiro):** a data mais tarde em que a frente pode terminar sem empurrar a entrega, menos os dias de trabalho que ainda faltam.
    - Exemplo: alvenaria com 60% feitos → desconta os dias que faltam para os 40% restantes.
    - **Ritmo usado: o real dos últimos 14 dias de diário (confirmado).** Dias que faltam = % restante ÷ avanço médio por dia nesses 14 dias. Assim, a frente lenta sobe no painel logo no começo, e não perto do fim.
    - **Reserva:** quando a frente ainda não tem diário suficiente (menos de 3 lançamentos com avanço), o sistema usa o ritmo do cronograma.
    - **Frente sem nenhum avanço em 14 dias:** não dá para calcular uma data. Ela aparece no topo, em vermelho, como "Parada — sem ritmo".

### 1A. Orçamento analítico (a base de tudo — pedido pelo engenheiro)
- **De onde vem:** o engenheiro **importa** a planilha do orçamento analítico (Excel ou CSV) exportada do programa de orçamento que ele já usa. Uma obra tem um orçamento, e uma nova importação substitui a versão anterior, preservando as frentes já ligadas aos itens que continuam existindo. **Na v1, o importador lê a planilha modelo do próprio sistema** (`modelo-orcamento-analitico.csv`, nesta pasta, já preenchida com o orçamento de exemplo). O engenheiro copia e cola do programa dele para o modelo. `[PENDENTE: ler direto a exportação do programa de orçamento — aguardando um arquivo real de exemplo, decisão do engenheiro em 18/10/2026]`
- **Mostra:** a árvore de **etapas → itens** (código, descrição, unidade, quantidade, custo unitário, total), com a barra de **executado** de cada item e o total orçado da obra.
- **Item do orçamento** (ao tocar):
  - a **composição analítica** (insumos de material, mão de obra e equipamento, com coeficiente e custo);
  - o **levantamento automático** de material e mão de obra (coeficiente × quantidade), para o item inteiro e para o que falta executar. É o "levantamento de materiais e mão de obra para cada serviço" que hoje é feito na mão;
  - **orçado × contratado × medido**, separando a mão de obra;
  - as **frentes** ligadas ao item.
- **Quem vê:** só o engenheiro, porque tem valores.
- **Como os serviços são usados:**
  - **Frentes:** toda frente é **uma parte de um item do orçamento**. Um item pode virar várias frentes (ex.: 4.1 Alvenaria, com 1.250 m², vira "Alvenaria 1º pav", com 620 m², e "Alvenaria 2º pav", com 630 m²). A soma das frentes não pode passar da quantidade do item.
  - **Diário:** o avanço que o mestre lança na frente vira **quantidade executada do item** (% × quantidade da frente).
  - **Medição:** mede a frente na unidade do item e compara com o orçado do item.
- **Cronograma físico-financeiro** (pedido pelo engenheiro): aba dentro do Orçamento, com **previsto × realizado × a realizar**, mês a mês, por etapa.
  - **Quatro números:** previsto até hoje, realizado até hoje (em % e R$), desvio em R$ e o que falta realizar.
  - **Curva S:** previsto acumulado × realizado acumulado da obra, com a marca de "hoje".
  - **Tabela mês a mês:** em **Financeiro (R$)** ou **Físico (%)**, com duas linhas por etapa (previsto e realizado), totais, realizado, a realizar e a situação de cada etapa (atrasada, adiantada, no prazo, a iniciar), sempre com o texto escrito e não só a cor.
  - **De onde vêm os números, sem digitar nada:**
    - **Previsto:** o valor de cada frente (quantidade × custo do item) espalhado igualmente entre o início e o fim previstos da frente, e somado por mês e por etapa.
    - **Realizado:** o avanço lançado no diário × quantidade × custo do item, no mês em que foi lançado.
    - **A realizar:** o total menos o realizado.
  - **Linha de base:** o previsto é **congelado** (linha de base v1). Reprogramar uma frente depois não apaga o desvio. Quando a obra for reprogramada de verdade, o engenheiro toca "Nova linha de base": a v1 fica guardada e o planejamento atual vira a v2.
  - Os valores são de **custo direto** (o orçamento importado). `[DESCOBRIR NO USO: espalhar o valor da frente igualmente pelos dias é um chute; dá para trocar por uma curva mais concentrada no meio]`
- **Calculadora de serviços e materiais** (pedido pelo engenheiro): aba dentro do Orçamento, com dois modos.
  - **Por medidas** (sem IA, conta exata, sem custo):
    - escolhe-se um serviço do orçamento que tenha composição;
    - informam-se os trechos (comprimento × altura × vezes) e os vãos a descontar (porta, janela);
    - opcionalmente, uma perda extra em %.
    - O sistema mostra a quantidade do serviço e, pela composição, **o que precisa de cada insumo**, já arredondado para comprar: blocos inteiros, m³ com duas casas, horas de mão de obra também em dias de 8 h. O engenheiro vê também o custo pelo orçamento.
    - Botões: "Criar frente com esta quantidade" e "PDF da lista", para mandar à compradora.
  - **Projeto em PDF ou texto** (com IA):
    - o engenheiro envia o PDF do projeto (planta, corte, memorial) e/ou descreve com as próprias palavras;
    - a IA lê, **compara com os itens do orçamento** e propõe uma lista de serviços com quantidade e **memória de cálculo** de cada linha;
    - o que não existe no orçamento vem marcado para conferir;
    - o engenheiro marca o que vale, e o sistema soma os materiais e a mão de obra dos marcados e pode criar as frentes.
    - **A IA só propõe.** Nada entra no sistema sem a confirmação do engenheiro.
  - **Limites, com franqueza:**
    - a leitura de PDF funciona bem com projeto **exportado do CAD, com cotas legíveis**. Planta escaneada, à mão ou sem cotas pode sair errada, e por isso a memória de cálculo aparece sempre;
    - escala, cotas cortadas e pranchas com muita informação são as fontes de erro mais comuns.
  - **Custo da IA:** cobrado por uso na API do Claude (Anthropic), não na assinatura. Na estimativa, uma leitura de projeto de algumas pranchas custa **de US$ 0,10 a US$ 0,50**. Exige uma conta na Anthropic com crédito e uma chave de API, que o engenheiro cria. A chave fica guardada no servidor, nunca no aparelho. `[PENDENTE: criar a conta e a chave da API da Anthropic, quando chegar a fase da IA]`
  - **Fases:** a calculadora por medidas entra na Fase 2. A leitura de PDF/texto com IA é a Fase 3, opcional, porque é a única parte do sistema com custo por uso e com resultado que precisa de conferência.
- **Navegação:** no menu do engenheiro, "Orçamento" entra no lugar de "Frentes". As frentes ficam numa aba dentro do Orçamento. O mestre continua com "Frentes", sem valores e sem acesso ao orçamento.

### 2. Frentes de serviço (o cronograma, por dentro)
- **Abre em:** lista por obra (aba dentro de Orçamento, para o engenheiro).
- **Mostra:** **item do orçamento** · serviço · ambiente(s) · responsável · início e fim previstos · data mais tarde para terminar sem empurrar a entrega · quantidade (na unidade do item) · valor orçado (**calculado**: quantidade × custo unitário do item) e valor contratado (os dois só o engenheiro vê).
- **Ordem e filtro:** pelo início previsto. Filtro por responsável.
- **Ações:** criar, editar, apagar (só o engenheiro).
- **Ao clicar num item:** editar.
- **Vazio:** "Nenhuma frente ainda."
- **Nasce e morre:** quem cria é o engenheiro. Quando a frente é concluída, ela sai do painel mas continua no histórico.

### 3. Diário de obra (o lançamento do mestre)
- **Abre em:** lista por dia, e o botão "Lançar hoje".
- **Mostra:** data · clima de **manhã, tarde e noite** · frentes trabalhadas, cada uma com o avanço do dia (% ou quantidade) e o **efetivo por função** (as 14 funções principais da construção civil, com a opção de acrescentar outras) · fotos, cada uma ligada a uma frente e a um ambiente · ocorrências em texto livre · "serviço concluído" (marcado por frente) · **ferramentas e equipamentos do dia** (equipamento, quantidade, próprio ou alugado, situação), com o botão "Repetir a lista de ontem".
- **Projeto marcado** (pedido pelo engenheiro): aba dentro do Diário, ao lado de "Dias". Permite **marcar sobre o PDF do projeto o que já foi executado**, como escavação, concretagem de vigas baldrame, radier, instalações e alvenaria.
  - **O projeto:** o engenheiro envia o PDF, e cada prancha vira uma página escolhida por botões (ex.: "Prancha 02 · Fundações", "Prancha 03 · Planta baixa térreo").
  - **A escala** é calibrada uma vez por prancha: tocam-se os dois extremos de uma cota conhecida e digita-se a medida.
  - **Marcar:** escolhe-se o serviço (ligado a um item do orçamento ou frente), toca-se "Marcar executado" e toca-se a planta. Pode ser uma **linha** (parede, viga, tubulação), pelo caminho, ou uma **área** (escavação, radier, laje), pelos cantos. Ao concluir, a marcação fica com a cor do serviço, a **data** e **quem marcou**, e o sistema calcula a **medida** pela escala (m ou m²).
  - **Ver:** legenda com um botão por serviço, para mostrar ou esconder cada um, e o filtro **"Mostrar o executado até {data}"**, que mostra a obra como estava em qualquer dia. Cada marcação tem rótulo escrito (serviço · data). Embaixo, a lista em tabela com serviço, medida, data e quem marcou.
  - **Quem marca: só o engenheiro** (decisão do engenheiro, 18/10/2026). O mestre **vê** a planta marcada, sem os botões de marcar. O cliente não vê.
  - **As medidas são referência:** o avanço oficial continua sendo o lançado no diário. `[DESCOBRIR NO USO: usar a medida marcada para sugerir o avanço do diário]`
  - **Cores dos serviços:** paleta fixa de 6 cores, testada para daltonismo (azul, laranja, verde-água, amarelo, rosa, verde, nesta ordem). Como três delas têm pouco contraste sobre o papel branco, toda marcação leva rótulo escrito, e a lista em tabela existe para isso.
  - **Biblioteca extra:** mostrar o PDF dentro do sistema exige o **pdf.js** (Mozilla, gratuito). É a única exceção à regra de uma biblioteca só. `[PENDENTE: o engenheiro confirma a biblioteca extra no começo da construção desta tela]`
  - **Fase:** 2.
- **PDF do diário (RDO)** (pedido pelo engenheiro): gera o Relatório Diário de Obra em PDF, de **um dia** ou de **um período** (uma página por dia), com ou sem fotos. Leva logo FMZ, número do RDO, clima por período, efetivo por função, serviços executados, equipamentos, ocorrências, fotos e espaço para as assinaturas do mestre e do responsável técnico. Não leva nenhum valor em R$. Engenheiro e mestre geram, o cliente não. O PDF sai pela impressão do navegador ("Salvar como PDF"), sem biblioteca extra.
- **Fotos para o cliente:** toda foto nasce escondida do cliente. O engenheiro marca, foto a foto ou com "Liberar todas da semana", quais o cliente pode ver.
- **Ordem e filtro:** o mais recente primeiro.
- **Ações:** criar e editar o próprio lançamento no mesmo dia. Só o engenheiro edita lançamento de dias anteriores.
- **Ao clicar num item:** abre o dia inteiro.
- **Vazio:** "Nenhum diário lançado. Toque em 'Lançar hoje'."

### 4. Medição de empreiteiros (substitui a planilha)
- **Abre em:** lista de empreiteiros da obra, cada um com o total contratado, o total medido e o saldo.
- **Mostra (por medição):** período · frentes · quantidade medida · valor · status (Rascunho, Fechada).
- **Ordem e filtro:** a medição mais recente primeiro. Filtro por empreiteiro.
- **Ações:** criar, editar o rascunho, fechar e exportar para planilha. Só o engenheiro faz tudo isso.
- **Ao clicar num item:** abre a medição.
- **Vazio:** "Nenhuma medição ainda para este empreiteiro."
- **Ideia:** a medição já começa preenchida com o avanço que o mestre lançou no diário, e o engenheiro só confere.

### 5. Portal do cliente
- **Abre em:** painel da obra dele.
- **Mostra:** avanço por ambiente (%), as fotos da semana por ambiente e a **data de entrega combinada no contrato** (confirmado). O cliente nunca vê a data que o sistema está prevendo. Não mostra custo, nome de empreiteiro, ocorrências do diário nem frentes atrasadas.
- **Vazio:** "As fotos desta semana aparecem aqui assim que forem lançadas."

### 6. Obras e equipe (cadastro)
- O engenheiro cria a obra (código/apelido, nome, endereço, cliente, data de início, data-meta de entrega = a do contrato, situação Em andamento/Concluída/Parada, e o valor do contrato com o cliente), cadastra os ambientes e os empreiteiros e convida quem trabalha em cada obra.

## Unidade principal

**Obra** — vai existir mais de uma? **sim** (já são várias ao mesmo tempo). Alguém trabalha em mais de uma ao mesmo tempo? **sim**, só o engenheiro. O mestre, o almoxarife e a compradora trabalham numa obra de cada vez (confirmado). O sistema ainda deixa o engenheiro mudar alguém de obra quando uma termina, e o que essa pessoa lançou continua na obra antiga. Para quem tem uma obra só, o seletor de obra nem aparece.

Cada registro diz a qual obra pertence. Cada pessoa só enxerga as obras em que foi colocada, e o seletor no topo troca tudo o que está na tela.

## Perfis de usuário

- **Engenheiro (administrador):** toca as obras e decide. Primeira tela: painel de frentes.
- **Mestre de obras:** lança o diário no canteiro, pelo celular. Primeira tela: "Lançar hoje".
- **Almoxarife e compradora:** não têm login na v1. Entram na v2, junto com o módulo de materiais. Quando entrarem, veem nome de empreiteiro, mas nenhum valor (já confirmado).
- **Cliente:** acompanha a obra dele. Primeira tela: portal do cliente.
- **Empreiteiro:** **não usa o sistema** e continua só no WhatsApp (confirmado). É cadastrado como responsável pelas frentes, mas não tem login. O que ele manda chega ao sistema pelo diário do mestre ou pelo engenheiro.

### Matriz de permissões

| Ação | Engenheiro | Mestre | Cliente |
|---|---|---|---|
| Ver as frentes e o painel | sim | sim, **sem valores** | não |
| Ver valor contratado e medido | **sim** | **não** | **não** |
| Lançar diário e fotos | sim | sim | não |
| Marcar serviço concluído | sim | sim | não |
| Editar o diário de dias anteriores | sim | não | não |
| Criar e editar frentes | sim | não | não |
| Fazer medição | sim | não | não |
| Ver nome de empreiteiro | sim | sim | **não** |
| Ver avanço por ambiente e fotos | sim | sim | **só a obra dele** |
| Ver data de entrega | contrato e prevista | contrato e prevista | **só a do contrato** |
| Apagar qualquer coisa | sim | não | não |
| Gerenciar usuários e obras | sim | não | não |
| **Quem não fez login** | não vê nada | | |

## Fluxo de cadastro

Não existe cadastro aberto. O engenheiro convida cada pessoa por email, já escolhendo o perfil e a obra. A pessoa recebe o convite, cria a senha e entra vendo só o que o perfil permite. Escolhi assim, e não "se cadastra e espera liberação", porque o cliente não pode entrar sozinho e cair na obra errada.

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | a assinatura que você já tem |
| React + Vite | a interface | grátis |
| Supabase | banco, login e fotos | grátis até crescer (as fotos são o que mais pesa) |
| Vercel | colocar no ar | grátis |
| GitHub | guardar o código | grátis |
| API do Claude (Anthropic) | ler projeto em PDF ou texto na calculadora (Fase 3, opcional) | por uso: estimativa de US$ 0,10 a 0,50 por leitura de projeto |

**Total por mês:** R$ 0 no começo. `[PENDENTE: com muitas obras e muitas fotos, o Supabase pode passar para o plano pago, de uns US$ 25 por mês]`
**O que custaria a alternativa pronta:** `[PENDENTE: nenhum dos concorrentes publica preço — ver a Etapa 2]`

## Prazo

- **Quer começar a construir:** hoje, 18/10/2026.
- **Quer usar de verdade em:** `[PENDENTE: data em que a primeira obra real passa a usar]`
- **Horas por semana disponíveis:** 1.
- **Alerta:** não cabe. Os 6 módulos, com login e no ar, levam várias sessões de construção. Com 1 hora por semana, são semanas, não um dia. `[PENDENTE: escolher o corte da v1 — ver a proposta do "Primeiro pedaço"]`
- **Proposta — o Primeiro pedaço:** Obras + Frentes + Diário do mestre + Painel de frentes. É o mínimo que já responde à pergunta "a entrega está de pé?". Medição e Portal do cliente entram depois, sem refazer nada.

---

# 2. Insights do Mercado

## Benchmark

Pesquisado em 18/10/2026. Nenhum dos três publica preço no site: é preciso pedir orçamento ou demonstração. `[PENDENTE: preço real das alternativas]`

### Prevision (Sienge)
- Site: https://sienge.com.br/prevision/ · Preço: não publicado (tem demonstração e teste grátis de 15 dias)
- Faz bem: cronograma em Gantt e Linha de Balanço, na nuvem, com app de celular e integração com o WhatsApp.
- Falta: é feito para construtora com equipe de planejamento e ligado ao orçamento do Sienge, que você não quer.

### Diário de Obras (OrçaFascio)
- Site: https://www.orcafascio.com/modulos-e-plugins/diario-de-obras · Preço: não publicado
- Faz bem: diário de obra com aplicativo que funciona sem internet, direto do canteiro.
- Falta: é um módulo de um sistema de orçamento. O diário não vira, sozinho, "há quantos dias essa frente não anda".

### Obra Prima
- Preço: não publicado
- Faz bem: sistema simples para empreiteiro e construtora pequena, com diário digital, compras, orçamento e app.
- Falta: é um sistema de gestão completo (com financeiro e orçamento), muito maior do que a sua dor.

## Por que ainda vale construir o meu

Rascunho para você confirmar:

> Os três sistemas registram a obra, mas nenhum responde à minha pergunta da segunda-feira: a data de entrega está de pé? O meu é 10% do tamanho deles e é construído em volta de uma conta só: o ritmo real de cada frente contra a data limite. Também não me obriga a levar o orçamento junto.

## Referências de interface

- **Usa mais em:** o mestre no **celular, no canteiro**: botão grande, pouca digitação, foto direto da câmera. O engenheiro **nos dois** (confirmado): no celular, barra inferior; no computador, menu lateral, aproveitando a largura para mostrar a lista do painel e o detalhe da frente lado a lado.
- **Estilo escolhido: tela 3, "Painel"** (veja `referencias/estilos-de-tela.png`). É um cockpit denso: tudo numa tela, listas compactas, números de resumo em cartões no topo, etiquetas de status (ex.: `-2 DIAS`) e abas finas.
  - **Da imagem vale o estilo, não o conteúdo.** "Pendências", "Entregas", "Materiais" e "Planej." são do exemplo. No nosso Painel, a lista é a de frentes de serviço, e os cartões do topo podem ser, por exemplo: frentes atrasadas · paradas sem ritmo · menor folga em dias.
- **Paleta (escolhida pelo engenheiro):**

| Cor | Papel na tela |
|---|---|
| `#175D8E` azul FMZ (do logo) | cor principal: botões, barras de avanço, links, selo do código da obra |
| `#124A72` / `#E6EFF7` | tons do azul: pressionado / fundos de destaque e item ativo |
| `#0F3D5E` azul-marinho | cabeçalho, menu lateral e login; o logo vai numa plaquinha `#F6F6F6` |
| `#F2AD21` amarelo FMZ (do logo) | acento e **atenção**. Texto escuro por cima |
| `#B42318` / `#C2412D` vermelho | **atrasado** e "Parada — sem ritmo" (textos / faixas) |
| `#2F855A` verde | **ok**, com folga |
| `#0B2236` / `#4A5B6B` / `#F1F5F9` / `#0F3D5E` | texto, texto secundário, fundo, menu lateral do computador |

**Identidade final (Fundação, 18/10/2026):** o engenheiro trocou a paleta verde-petróleo pelas **cores do logo FMZ** e escolheu primeiro a opção "FMZ claro", trocada logo depois pela **"Azul FMZ"** (cabeçalho azul-marinho). O nome do app passou a ser **FMZ Incorporadora**. O vermelho de verdade substituiu o coral no "atrasado", porque coral e amarelo da marca se confundiriam.

- **Quando uma frente fica amarela:** quando a folga chega a 7 dias ou menos. `[DESCOBRIR NO USO: 7 dias é um chute meu]`
- **Tema:** claro, com fundo cinza-esverdeado claro, que funciona melhor no sol do canteiro.
- **Logo:** FMZ Incorporadora, em `referencias/logo-fmz.jpeg`. As cores do logo são azul `#175D8E` e amarelo `#F2AD21`. O amarelo virou a cor de "atenção". O logo aparece no cabeçalho de todas as telas e no Login.
- **Prévia visual:** `preview.html`, nesta pasta. `[DESCOBRIR NO USO: aguardando a aprovação do engenheiro — depois de aprovada, vira a referência visual do app]`
  - `[PENDENTE: o logo é um JPEG com fundo cinza. Uma versão em PNG com fundo transparente fica melhor sobre o fundo e sobre o cabeçalho escuro]`

---

# 3. Arquitetura

## Mapa de telas

```
Login
├── Engenheiro                      (seletor de obra no topo)
│   ├── Painel de frentes           ← tela de abertura
│   │   └── Detalhe da frente (histórico do diário, fotos, ritmo)
│   ├── Orçamento                   (abas: Itens do orçamento · Cronograma físico-financeiro · Frentes de serviço · Calculadora)
│   │   └── Item do orçamento (composição analítica, levantamento, orçado × contratado × medido, frentes)
│   ├── Diário de obra              (ler e corrigir)
│   ├── Medição                     (por empreiteiro)
│   └── Obras e equipe              (obras, ambientes, empreiteiros, convites)
├── Mestre                          (uma obra só, sem seletor)
│   ├── Lançar hoje                 ← tela de abertura
│   ├── Diário de obra              (os dias anteriores, só leitura)
│   └── Frentes                     (sem valores)
└── Cliente                         (só a obra dele)
    └── Minha obra                  (avanço por ambiente, fotos da semana, data do contrato)
```

**Navegação:** no celular, barra inferior. No computador, menu lateral. O engenheiro tem 5 itens e o mestre tem 3, dentro do limite de 6.

## Processos automáticos

Nenhum foi pedido pelo engenheiro. O "há quantos dias não anda" e a "data limite de decisão" são calculados na hora em que a tela abre, sem nada rodando por trás. Ficaram só dois processos técnicos, descritos no PRD-BACKEND:
1. **Convite:** envia o email e liga a pessoa à obra.
2. **Status da frente pelo diário:** a frente vira "Em andamento" no primeiro avanço e "Concluída" quando o mestre marca "concluído".

O aviso "o mestre não lançou o diário" aparece no rodapé do Painel, e não como mensagem enviada.

## Modelagem de dados

Toda tabela tem `id` (uuid) e `created_at`. Toda tabela que pertence a uma obra tem `obra_id`.

### `profiles` — quem é cada pessoa que faz login
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | o mesmo código do login |
| nome | text | sim | |
| role | text | sim | CHECK: `Engenheiro`, `Mestre`, `Cliente` |

### `obras`
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| codigo | text | sim | código/apelido, ex.: "JE-01" (pedido na Fundação) |
| nome | text | sim | ex.: "Residencial Jardim Europa" |
| endereco | text | não | |
| cliente | text | sim | |
| data_inicio | date | sim | (pedido na Fundação) |
| data_entrega | date | sim | data-meta de entrega = a do contrato (confirmado), a única que o cliente vê |
| situacao | text | sim | CHECK: `Em andamento`, `Concluída`, `Parada` ("Parada" pedido na Fundação) |

### `membros` — quem trabalha em qual obra
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| profile_id | uuid | sim | |
| papel | text | sim | CHECK: `Engenheiro`, `Mestre`, `Cliente` |

### `empreiteiros` — sem login, só o cadastro
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| nome | text | sim | |
| telefone | text | não | o WhatsApp dele |

Vale para todas as obras: o mesmo empreiteiro pode trabalhar em várias.

### `ambientes`
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| nome | text | sim | ex.: "Cozinha", "Suíte 1", "Fachada" |

### `orcamento_itens` — a árvore do orçamento (etapas e itens)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| pai_id | uuid | não | a etapa de cima (vazio na etapa raiz) |
| tipo | text | sim | CHECK: `Etapa`, `Item` |
| codigo | text | sim | ex.: "4", "4.1" |
| referencia | text | não | código da base (SINAPI, própria…) |
| descricao | text | sim | |
| unidade | text | só item | |
| quantidade | numeric | só item | |
| custo_unitario | numeric(14,4) | só item | |
| ordem | integer | sim | a ordem da planilha |

### `orcamento_composicoes` — os insumos de cada item (a parte analítica)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| item_id | uuid | sim | |
| tipo | text | sim | CHECK: `Material`, `Mão de obra`, `Equipamento`, `Serviço` |
| codigo | text | não | |
| descricao | text | sim | ex.: "Bloco cerâmico 14x19x39 cm" |
| unidade | text | sim | |
| coeficiente | numeric(14,6) | sim | quanto do insumo por unidade do item |
| custo_unitario | numeric(14,4) | sim | |

### `projetos`, `projeto_pranchas` e `projeto_marcas` — o projeto marcado
- **`projetos`:** obra, nome (ex.: "Executivo rev. 03"), o arquivo PDF no Storage e a data de envio.
- **`projeto_pranchas`:** o projeto, o número da página, o nome da prancha e a escala calibrada (metros por unidade da página).
- **`projeto_marcas`:** a prancha, o serviço (`orcamento_item_id` e, se houver, `frente_id`), o tipo (CHECK `Linha`, `Área`), os pontos (lista de coordenadas na página), a medida calculada, a data de execução e quem marcou.

### `leituras_ia` — cada leitura de projeto feita pela IA (Fase 3)
Obra, quem pediu, arquivo do PDF (no Storage) e/ou o texto, a resposta proposta (as linhas com item, quantidade, unidade e memória de cálculo), os tokens usados e o custo estimado, e a data. Serve para conferir depois o que a IA propôs e para acompanhar o gasto. A calculadora por medidas não grava nada: o resultado vira frente ou PDF.

### `cronograma_bases` e `cronograma_base_valores` — a linha de base congelada
- **`cronograma_bases`:** obra, versão (1, 2…), data em que foi congelada, quem congelou, observação (ex.: "reprogramação após chuva de outubro"). Só uma versão é a atual por obra.
- **`cronograma_base_valores`:** a base, o item do orçamento, o mês (primeiro dia do mês, `date`) e o valor previsto (numeric(14,2)). Uma linha por item e por mês.

O realizado não tem tabela: sai do diário.

### `frentes` — as frentes de serviço (o cronograma)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| orcamento_item_id | uuid | sim | **o item do orçamento de que a frente é parte** |
| servico | text | sim | ex.: "Alvenaria 2º pavimento" |
| ambiente_id | uuid | não | |
| empreiteiro_id | uuid | não | vazio = equipe própria |
| inicio_previsto | date | sim | |
| fim_previsto | date | sim | dá o ritmo do cronograma (a reserva) |
| fim_limite | date | sim | a data mais tarde para terminar sem empurrar a entrega |
| quantidade | numeric | sim | na unidade do item (ex.: 630 m²). A soma das frentes de um item não passa da quantidade do item |
| status | text | sim | CHECK: `Não iniciada`, `Em andamento`, `Concluída` |

### `frentes_valores` — o valor contratado, numa tabela à parte
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| frente_id | uuid | sim | uma linha por frente |
| valor_contratado | numeric(14,2) | sim | o que foi fechado com o empreiteiro |

O **valor orçado** da frente não é mais digitado: é a quantidade da frente × o custo unitário do item. A parte de mão de obra sai da composição.

### `obras_valores` — o valor do contrato com o cliente
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | uma linha por obra |
| valor_contrato_cliente | numeric(14,2) | sim | |

Também fica separada pelo mesmo motivo: o cliente vê a linha da obra, mas nunca este valor.

**Por que fica separada (`frentes_valores`):** o banco só consegue esconder uma linha inteira, não uma coluna. Se o valor ficasse em `frentes`, o mestre, que precisa ver a frente, conseguiria ver o valor também. Separado, só o engenheiro enxerga esta tabela.

### `diarios` — um por obra por dia
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| data | date | sim | uma por obra por dia |
| clima_manha, clima_tarde, clima_noite | text | não | um por período (pedido pelo engenheiro). CHECK: `Sol`, `Nublado`, `Chuva`, `Chuva forte` |
| ocorrencias | text | não | o cliente não vê |
| autor_id | uuid | sim | quem lançou |

### `diario_avancos` — o que andou em cada frente naquele dia
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| diario_id | uuid | sim | |
| frente_id | uuid | sim | |
| avanco_acumulado | numeric | sim | % total da frente depois do dia (0–100) |
| concluido | boolean | sim | "serviço concluído" |

É desta tabela que saem o ritmo real, os dias sem andar e a data limite. Ela é a mais importante do sistema.

### `diario_efetivo` — mão de obra por função (pedido pelo engenheiro)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| diario_avanco_id | uuid | sim | a frente naquele dia |
| funcao | text | sim | uma das 14 principais (Pedreiro, Servente, Carpinteiro, Armador, Eletricista, Encanador, Pintor, Gesseiro, Azulejista, Serralheiro, Soldador, Impermeabilizador, Operador de máquinas, Encarregado) ou outra que o mestre acrescentar |
| quantidade | integer | sim | > 0 |

### `diario_equipamentos` — ferramentas e equipamentos do dia (pedido pelo engenheiro)
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| diario_id | uuid | sim | |
| equipamento | text | sim | ex.: "Betoneira 400 L", "Andaime (módulos)" |
| quantidade | integer | sim | |
| origem | text | sim | CHECK: `Próprio`, `Alugado` |
| situacao | text | sim | CHECK: `Em uso`, `Parado`, `Com defeito` |

No lançamento, um botão **"Repetir a lista de ontem"** evita que o mestre digite tudo todo dia. `[DESCOBRIR NO USO: os campos origem e situação são chute meu]`

### `fotos`
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| diario_id | uuid | sim | |
| frente_id | uuid | não | |
| ambiente_id | uuid | não | |
| arquivo | text | sim | o link do arquivo guardado no Storage |
| visivel_cliente | boolean | sim | **começa como não**. Só o engenheiro libera (confirmado) |

### `medicoes` e `medicao_itens` (entram depois do Primeiro pedaço)
- **`medicoes`:** obra, empreiteiro, início e fim do período, status (CHECK: `Rascunho`, `Fechada`).
- **`medicao_itens`:** a medição, a frente, a quantidade medida e o valor (numeric(14,2)).

### Permissões por tabela

- **`obras`, `ambientes`, `frentes`, `diarios`, `diario_avancos`:** quem vê é quem é membro da obra. O cliente não vê `frentes`, `diarios` nem `diario_avancos` diretamente: vê só o resumo do avanço por ambiente.
- **`orcamento_itens`, `orcamento_composicoes`, `leituras_ia`, `cronograma_bases`, `cronograma_base_valores`, `frentes_valores`, `obras_valores`, `medicoes`, `medicao_itens`:** só o engenheiro, em tudo. O mestre vê a frente (com o nome do serviço), mas não o orçamento.
- **`diario_equipamentos`:** o mesmo que o diário (o mestre lança no dia, o engenheiro sempre). O cliente não vê.
- **`empreiteiros`:** o engenheiro e o mestre veem. O cliente não vê.
- **`fotos`:** os membros veem. O cliente vê só as que o engenheiro liberou (`visivel_cliente = sim`). Só o engenheiro muda esse campo.
- **Criar e editar o diário, os avanços e as fotos:** o mestre, só no dia. O engenheiro, sempre.
- **Apagar qualquer coisa:** só o engenheiro.
- **Sem login:** nada.

**Avanço por ambiente (o que o cliente vê):** a média do avanço das frentes daquele ambiente, ponderada pelo valor contratado. A conta é feita no banco, então o cliente recebe só o % e nunca o valor. `[DESCOBRIR NO USO: ponderar por valor ou fazer média simples]`

## A pergunta de um ano

**"Onde foi o lucro?"** (resposta do engenheiro)

Para responder isso daqui a um ano, três dados precisam estar sendo guardados desde o primeiro dia:
1. **Quanto entra:** o valor do contrato com o cliente (`obras_valores`).
2. **Quanto se previa gastar em cada serviço:** o orçamento analítico importado (`orcamento_itens` + `orcamento_composicoes`), separado em material, mão de obra e equipamento.
3. **Quanto se gastou de fato:** a mão de obra medida (`medicao_itens`).

Assim, **item a item do orçamento**, dá para ver **orçado × contratado × medido**, e é aí que aparece onde a margem escapou. Exemplo da prévia: no item 4.1, a mão de obra orçada é R$ 46.406,25 e a contratada é R$ 52.500,00, ou seja, R$ 6.093,75 acima.

**O limite, dito com franqueza:** o material orçado já está no sistema (pela composição), mas o material **comprado** só entra na v2. Até lá, a comparação real cobre **só a mão de obra**. O custo de equipamento alugado também fica de fora: hoje o sistema registra que a betoneira estava alugada, mas não quanto ela custou. `[PENDENTE: aditivos de contrato com o cliente — mudam o "quanto entra"]`

## Melhorias para a v2

- Materiais por frente, com login do almoxarife e da compradora: cortado por decisão do engenheiro, para a v1 sair mais rápido. **Ficou mais fácil:** o levantamento já sai da composição do orçamento, e a v2 só precisa acrescentar pedido, entrega e custo real.
- Importar o cronograma do MS Project: cortado porque, na v1, cadastrar as frentes é mais rápido do que fazer um importador.
- Medição e Portal do cliente: entram logo depois do Primeiro pedaço, em cima das mesmas tabelas.

---

# A conta que vai chegar depois

- `[PENDENTE: custo de armazenar fotos com várias obras]` — custo: possível plano pago do Supabase.
- `[PENDENTE: arquivo real do programa de orçamento]` — custo: enquanto ele não vem, o orçamento entra pela planilha modelo, copiando e colando. Quando vier, o importador passa a ler o arquivo do programa direto.

# Decidir depois de usar

- `[DESCOBRIR NO USO: com quantos dias de folga a frente fica amarela]` — por enquanto ficou: 7 dias.
- `[DESCOBRIR NO USO: avanço por ambiente ponderado por valor ou média simples]` — por enquanto ficou: ponderado pelo valor contratado.
