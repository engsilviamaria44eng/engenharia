# PRD Frontend — FMZ Incorporadora (app de acompanhamento de obras)

> Especificação da interface. Quem constrói lê este arquivo.
> Nesta fase não existe banco: as telas funcionam com os dados de exemplo do fim deste arquivo.
> Fonte das decisões: `PLANO-DO-PROJETO.md`. Quando uma decisão mudar, este arquivo muda junto.

## O que o sistema é

Um sistema de acompanhamento de obra que responde, toda manhã, se a data de entrega do cliente está de pé, a partir do diário que o mestre lança no canteiro. O mestre usa no **celular, no canteiro**. O engenheiro usa **no celular e no computador**. O cliente, quase sempre no celular.

## Ordem de construção

- **Fase 1 — Primeiro pedaço:** Login, Orçamento (com a importação) e Item do orçamento, Painel de frentes, Detalhe da frente, Frentes de serviço, Lançar hoje, Diário de obra, PDF do diário (RDO), Obras e equipe. O orçamento vem primeiro, porque as frentes nascem dos itens dele.
- **Fase 2:** Medição, Minha obra (portal do cliente), Cronograma físico-financeiro, Calculadora por medidas e Projeto marcado.
- **Fase 3 (opcional):** Calculadora com leitura de projeto em PDF ou texto pela IA. Precisa da conta e da chave da API da Anthropic e tem custo por uso.

A Fase 2 usa os mesmos dados da Fase 1. Nada da Fase 1 é refeito.

## Padrão técnico

- React + Vite (versões atuais), sem biblioteca de componente pronta.
- O visual sai de um `index.css` próprio.
- Navegação por estado, sem endereço no navegador.
- Estilo **"Painel"** (referência: `referencias/estilos-de-tela.png`, tela 3): cockpit denso, tudo numa tela, cartões de número no topo, listas compactas, etiquetas de status e abas finas.
- Tema claro. **Identidade FMZ, opção "Azul FMZ"** (escolhida pelo engenheiro na Fundação, no lugar da "FMZ claro"). Cores medidas no logo, tokens em `src/index.css`:
  - `#175D8E` azul FMZ: cor principal (botões, barras de avanço, links, selo do código da obra). Texto branco por cima: 7:1.
  - `#124A72` azul fechado (pressionado/hover) e `#E6EFF7` azul claro (fundos de destaque, item ativo).
  - `#0F3D5E` azul-marinho: **cabeçalho** (texto branco, secundário `#BFD3E3`), menu lateral do computador e fundo do Login. O logo fica numa plaquinha `#F6F6F6` (o cinza do fundo dele) e o código da obra num selo amarelo.
  - `#F2AD21` amarelo FMZ: acento (selo do código da obra no cabeçalho, item ativo do menu lateral, contorno de foco sobre o azul-marinho) e **atenção**. Sempre com texto escuro, nunca branco.
  - `#B42318` vermelho (textos e etiquetas) e `#C2412D` (faixas e bordas): **atrasado** ou **parado**. O coral saiu para não se confundir com o amarelo da marca.
  - `#2F855A` verde: **ok**.
  - `#0B2236` texto principal, `#4A5B6B` texto secundário, `#F1F5F9` fundo das telas, `#0F3D5E` azul-marinho do menu lateral no computador.
- **Referência visual:** `preview.html`, nesta pasta. Depois de aprovado pelo engenheiro, o espaçamento, o tamanho dos números, os cartões e a navegação seguem esse arquivo.
- **Para o canteiro:** alto contraste, texto-base de 17px, botões e áreas de toque com no mínimo 44px e rótulo, e o dado que importa (número, status) sempre maior que o resto.
- Logo: `public/logo-fmz-recorte.png` (recorte do logo, só a marca), **no cabeçalho de todas as telas** e no topo do Login. No menu lateral do computador aparece o nome "FMZ Incorporadora".
- Celular: barra inferior fixa. Computador (a partir de 900px de largura): menu lateral à esquerda.
- Fotos tiradas direto da câmera do celular.

## Perfis

- **Engenheiro:** entra no **Painel de frentes**. Vê tudo de todas as obras em que é membro, inclusive valores. Troca de obra pelo seletor do cabeçalho.
- **Mestre:** entra em **Lançar hoje**. Vê a obra dele (uma só, sem seletor), sem nenhum valor em dinheiro.
- **Cliente:** entra em **Minha obra**. Vê o avanço por ambiente, as fotos que o engenheiro liberou e a data de entrega do contrato. Não vê custo, nome de empreiteiro, ocorrências nem frentes.

## Mapa de navegação

```
Login
├── Engenheiro: Painel · Orçamento · Diário · Medição · Obras      (5 itens)
│     Painel → Detalhe da frente
│     Orçamento → Item do orçamento · aba Frentes de serviço
│     Diário → Dia do diário
│     Medição → Medição do empreiteiro
├── Mestre:     Hoje · Diário · Frentes                            (3 itens)
└── Cliente:    Minha obra                                         (tela única, sem barra)
```

O cabeçalho de todas as telas tem: o nome da obra, o seletor "Trocar" (só para o engenheiro com mais de uma obra) e o menu da pessoa (nome e "Sair").

---

## As contas do painel

Elas valem para o Painel, o Detalhe da frente e a previsão de entrega. **Hoje** é a data do aparelho. Todas as contas usam dias corridos.

- **Avanço atual:** o `avanco_acumulado` do diário mais recente que cita a frente. Se nenhum diário cita a frente, o avanço é 0%.
- **Dias sem andar:** hoje menos a data do último diário em que o avanço da frente subiu. Se a frente nunca andou e o `inicio_previsto` já passou, conta desde o `inicio_previsto`. Se o início ainda não chegou, mostra "—".
- **Situação de ritmo**, decidida nesta ordem:
  1. **Parada:** a frente já teve avanço alguma vez (ou o início previsto passou há mais de 14 dias) e **não andou nada nos últimos 14 dias**.
  2. **Ritmo do cronograma** (a reserva): a frente tem menos de 3 diários com avanço nos últimos 14 dias. O ritmo é 100% dividido pelos dias entre `inicio_previsto` e `fim_previsto`.
  3. **Ritmo real:** o avanço de hoje menos o avanço de 14 dias atrás, dividido por 14. É o resultado em % por dia.
- **Dias que faltam:** (100 − avanço atual) ÷ ritmo, arredondado para cima.
- **Data limite de decisão:** `fim_limite` menos os dias que faltam. Uma frente **Parada** não tem data: mostra "Parada — sem ritmo".
- **Folga:** a data limite de decisão menos hoje, em dias.
- **Cor da linha:**
  - **vermelho** se a folga é negativa ou a frente está Parada;
  - **amarelo** se a folga vai de 0 a 7 dias;
  - **sem cor** se a folga é maior que 7 dias.
- **Previsão de entrega** (só para engenheiro e mestre): a data do contrato mais o maior atraso entre as frentes, ou seja, o maior valor de (−folga), quando ele for maior que zero. Se nenhuma frente estiver atrasada, a previsão é a própria data do contrato.

---

## Tela: Login

**Quem acessa:** todos, antes de entrar.

**O que aparece**
O logo FMZ, os campos email e senha, o botão Entrar e o link "Esqueci minha senha". **Não existe "Criar conta"**: só entra quem foi convidado.

**Ações**
- **Entrar:** valida e leva para a tela inicial do perfil.
- **Esqueci minha senha:** envia um email para trocar a senha.
- **Link do convite (vem por email):** abre a tela "Definir senha". Depois de salvar a senha, a pessoa entra direto.

**Estado vazio**
Não se aplica.

---

## Tela: Painel de frentes

**Quem acessa:** Engenheiro.
**Chega aqui por:** é a tela de abertura, e o item "Painel" do menu.

**O que aparece**, de cima para baixo:
1. **Faixa da entrega**, a resposta da segunda-feira:
   - verde-neutro: "Entrega de pé — 15/03/2027", quando nenhuma frente está vermelha;
   - vermelho: "Entrega em risco — previsão 29/03/2027 (+14 dias)", quando alguma está.
2. **Três cartões de número:** Atrasadas · Paradas · Menor folga (em dias).
3. **A lista de frentes** que não estão concluídas, na ordem: primeiro as Paradas, depois a menor folga. Cada linha é compacta e mostra:
   - o serviço, em negrito, e o ambiente;
   - o responsável (o empreiteiro ou "Equipe própria");
   - a barra de avanço, com o %;
   - "há X dias sem andar";
   - a data limite de decisão;
   - a etiqueta de folga, por exemplo `-3 DIAS` em vermelho, `5 DIAS` em amarelo, `22 DIAS` neutra, ou `PARADA` em vermelho.
4. **Rodapé:** "Diário de hoje: lançado às 17h40" ou, em amarelo, "Diário de hoje: não lançado".

No computador, a lista ocupa a esquerda e o Detalhe da frente abre à direita, sem sair da tela.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Serviço | texto | — | da frente |
| Ambiente | texto | — | pode estar vazio |
| Responsável | texto | — | o nome do empreiteiro ou "Equipe própria" |
| Avanço | % | — | calculado |
| Dias sem andar | número | — | calculado |
| Data limite de decisão | data | — | calculada |
| Folga | número de dias | — | calculada, define a cor |

**Ações**
- **Tocar numa linha:** abre o Detalhe da frente.
- **Filtros (abas finas no topo da lista):** Todas · por responsável · por ambiente.
- **Trocar (no cabeçalho):** escolhe outra obra. Tudo na tela troca, e não sobra nada da obra anterior.

**Regras por perfil**
- **Engenheiro:** vê tudo.
- O mestre não vê esta tela: para ele, a lista equivalente fica em "Frentes".

**Estado vazio**
"Nenhuma frente cadastrada nesta obra. Cadastre as frentes do cronograma para começar." Embaixo, o botão "Cadastrar frentes".

---

## Tela: Detalhe da frente

**Quem acessa:** Engenheiro e Mestre.
**Chega aqui por:** um toque numa linha do Painel (engenheiro) ou da lista de Frentes (mestre).

**O que aparece**
1. O serviço, o ambiente, o responsável e o status.
2. **O quadro das contas:**
   - avanço atual;
   - ritmo, com a origem escrita: "real, últimos 14 dias", "do cronograma" ou "parada";
   - dias que faltam;
   - fim limite;
   - data limite de decisão;
   - folga.
3. As datas previstas: início, fim e fim limite.
4. **Histórico:** os lançamentos do diário que citam a frente, do mais recente ao mais antigo, com data, avanço acumulado e efetivo por função (ex.: "2 pedreiros · 2 serventes").
5. As fotos da frente, em grade.
6. **Valores**, só para o engenheiro: orçado de mão de obra (quantidade da frente × parte de mão de obra da composição do item), valor contratado (e quanto está acima ou abaixo do orçado), valor medido até agora e saldo. Embaixo, o link "Item {código} do orçamento · {quantidade da frente} de {quantidade do item}", que abre o Item do orçamento.

**Ações**
- **Editar frente:** só o engenheiro. Abre o formulário da tela Frentes de serviço.
- **Tocar numa foto:** abre a foto grande.

**Regras por perfil**
- **Mestre:** não vê o bloco Valores nem o botão Editar.

**Estado vazio**
Histórico: "Esta frente ainda não apareceu em nenhum diário."

---

## Tela: Orçamento

**Quem acessa:** Engenheiro (tem valores; o mestre e o cliente não veem).
**Chega aqui por:** o item "Orçamento" do menu.

**O que aparece**
1. **Três cartões:** Total orçado (custo direto, sem centavos no celular) · Executado (% físico, ponderado pelo valor dos itens) · Itens (e quantas etapas).
2. **Linha da importação:** "Importado de {arquivo} em {data}. O orçamento é feito no seu programa; aqui ele só é usado." e o botão **"Importar nova versão"**.
3. **Quatro abas** (chips que rolam para o lado no celular):
   - **Itens do orçamento** (ativa);
   - **Cronograma físico-financeiro** (tela abaixo);
   - **Frentes de serviço** (a lista da tela Frentes de serviço, com o código do item em cada linha);
   - **Calculadora** (tela abaixo).
4. **Árvore do orçamento:** cada **etapa** é uma faixa com código, nome em maiúsculas e total, e abre ou fecha ao tocar. Dentro dela, cada **item** mostra código, descrição, total, "quantidade unidade × custo unitário", a barra de **executado** com o % e quantas frentes usam o item.

**Executado do item:** a soma, nas frentes do item, de (avanço da frente × quantidade da frente), dividida pela quantidade do item.

**Ações**
- **Tocar numa etapa:** abre ou fecha os itens.
- **Tocar num item:** abre o Item do orçamento.
- **Importar nova versão / Importar orçamento analítico:** abre a importação (ver abaixo).

**Estado vazio**
Ícone, "Esta obra ainda não tem orçamento", "Importe o orçamento analítico exportado do seu programa de orçamento (planilha Excel ou CSV). Os serviços dele viram a base das frentes, do diário e das medições." e o botão **"Importar orçamento analítico"**.

### Importação do orçamento

1. Escolher o arquivo. **Na v1, o formato aceito é a planilha modelo do sistema** (`modelo-orcamento-analitico.csv`, colunas descritas no PRD-BACKEND), e há o botão **"Baixar planilha modelo"** ao lado.
2. O sistema lê e mostra a prévia: quantas etapas, quantos itens e quantas composições, o total, e as linhas que não entendeu (ex.: item sem unidade), marcadas em vermelho.
3. **Confirmar importação.** Numa nova versão, o sistema avisa antes de confirmar quais itens com frentes ligadas mudaram de quantidade ou sumiram. Item com frente ligada não é apagado: ele fica marcado "fora do orçamento atual" até o engenheiro decidir.

`[PENDENTE: ler direto a exportação do programa de orçamento do engenheiro, quando houver um arquivo real de exemplo. Até lá, a planilha modelo resolve.]`

---

## Tela: Cronograma físico-financeiro

**Quem acessa:** Engenheiro.
**Chega aqui por:** a aba "Cronograma físico-financeiro" do Orçamento.

**O que aparece**
1. **Quatro cartões** (2 por linha no celular, 4 no computador):
   - **Previsto até {mês de hoje}:** % e R$;
   - **Realizado até {mês de hoje}:** % e R$, com a diferença em pontos. Fica em coral se estiver mais de 2 pontos abaixo, e em verde se não estiver;
   - **Desvio:** realizado − previsto, em R$, com a frase "realizado abaixo/acima do previsto";
   - **A realizar:** R$ e % da obra.
2. **Curva S:** um gráfico de linhas com **Previsto acumulado** (roxo `#6A55B0`, tracejado) e **Realizado acumulado** (verde-petróleo `#00939E`, contínuo, com pontos até o mês de hoje).
   - Eixo de 0 a 100% com grade clara, uma linha pontilhada "HOJE" e rótulos diretos no fim de cada linha ("Previsto", "Realizado 58%"), além da legenda.
   - **Dica ao passar o mouse ou tocar** num mês: o mês, o previsto acumulado (% e R$) e o realizado acumulado. Nos meses futuros, o total a realizar.
   - No celular, o gráfico usa uma proporção própria, para os textos manterem o tamanho de leitura.
   - As duas cores passaram no teste de daltonismo, e o tracejado é uma segunda forma de diferenciar as linhas.
3. **Tabela mês a mês**, com a chave **Financeiro (R$ mil)** / **Físico (% de cada etapa)**:
   - **Linhas:** para cada etapa, uma linha "previsto" e outra "realizado". No fim, "Previsto acumulado" e "Realizado acumulado".
   - **Colunas:** os meses da obra (o mês de hoje fica destacado), depois Total, Realizado, A realizar e **Situação hoje**.
   - **Situação hoje:** uma etiqueta com texto. `ATRASADA −x pts` se o realizado acumulado da etapa estiver mais de 5 pontos abaixo do previsto, `ADIANTADA +x pts` se estiver mais de 5 acima, senão `NO PRAZO`. Se nada estava previsto nem foi feito, `A INICIAR`.
   - **Célula vazia:** "·". Meses futuros ficam sem realizado.
   - A primeira coluna fica fixa ao rolar a tabela para o lado no celular.
4. **Linha de base:** a frase "O previsto é a linha de base v{n}, congelada em {data}. Reprogramar uma frente não muda o previsto." e o botão **"Nova linha de base"**. Ele pede confirmação, guarda a versão atual e congela o planejamento de hoje como a próxima versão.

**De onde vêm os números (nada é digitado nesta tela)**
- **Previsto:** os valores congelados da linha de base atual. Ao congelar, cada frente tem o seu valor (quantidade × custo unitário do item) distribuído igualmente pelos dias entre o início e o fim previstos e somado por mês. O total por etapa é a soma dos itens dela.
- **Realizado do mês:** para cada lançamento do diário no mês, (avanço do dia em pontos ÷ 100) × quantidade da frente × custo unitário do item.
- **Físico %:** o realizado (ou previsto) da etapa ÷ o total da etapa. Na obra, o mesmo cálculo ponderado pelo valor.

**Estado vazio**
"Sem cronograma ainda. O cronograma físico-financeiro nasce do orçamento e das datas das frentes. Importe o orçamento e cadastre as frentes para ele aparecer." e o botão "Ir para o orçamento".

---

## Tela: Calculadora de serviços e materiais

**Quem acessa:** Engenheiro.
**Chega aqui por:** a aba "Calculadora" do Orçamento.
**Fase:** "Por medidas" na Fase 2. "Projeto em PDF ou texto" na Fase 3, opcional, porque precisa da API do Claude.

**O que aparece**
No topo, dois botões grandes de modo: **"Por medidas"** (você informa paredes, áreas e vãos) e **"Projeto em PDF ou texto"** (a IA lê e propõe o levantamento).

### Modo "Por medidas"

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Serviço do orçamento | escolha | sim | só itens que têm composição analítica. Mostra "código · descrição curta (unidade)" |
| Trechos | lista: descrição, comprimento (m), altura (m), vezes | sim, ao menos 1 | no forro, "comprimento × largura". Cada linha mostra a conta embaixo ("4,20 × 2,80 × 2 = 23,52 m²"). Botão "+ Parede ou trecho" |
| Descontos (vãos) | lista: descrição, largura (m), altura (m), vezes | não | não aparece em serviço de forro ou piso. Botão "+ Vão" |
| Perda extra (%) | número | não | padrão 0. A composição já tem a perda normal; isto é um extra |

- **Números:** aceitam vírgula ou ponto decimal ("4,20" ou "4.20"). O recálculo acontece ao sair do campo.
- **Resultado:**
  - a **quantidade** em destaque (ex.: "40,20 m²"), com a conta escrita ("bruto 43,68 − vãos 3,48");
  - a lista de insumos da composição, com **"Precisa"** já arredondado para comprar: unidades para cima, m³ com 2 casas, horas com 1 casa e o equivalente em dias de 8 h ("30,2 h ≈ 3,8 dias");
  - o custo pelo orçamento, só para o engenheiro;
  - no celular, a lista mostra só Insumo, Precisa e Custo.
- **Ações:**
  - **"Criar frente com esta quantidade"** abre o formulário de frente com o item e a quantidade preenchidos;
  - **"PDF da lista"** sai pela impressão do navegador, como o RDO.

### Modo "Projeto em PDF ou texto" (IA)

- **Entrada:**
  - **área de envio do PDF**, com a orientação "Planta, corte ou memorial. Funciona melhor com PDF exportado do CAD, com cotas legíveis";
  - **caixa de texto** "Ou descreva com as suas palavras (pode ser junto com o PDF)";
  - botão **"Ler e propor levantamento"**;
  - embaixo, o aviso: "Usa inteligência artificial (Claude). Cada leitura custa alguns centavos de dólar, conforme o tamanho do projeto. A IA só propõe; a quantidade que vale é a que você confirmar."
- **Enquanto lê:** "Lendo o projeto e comparando com os itens do orçamento…", com indicador girando. Pode levar até alguns minutos em projetos grandes.
- **Resultado:**
  - faixa amarela **"Proposta da IA — confira antes de usar"**;
  - uma linha por serviço proposto, com caixa de marcar (já marcada), "código · descrição", quantidade e unidade e, embaixo, a **memória de cálculo** em fonte mono (ex.: "perímetro 2×(4,20+3,60) = 15,60 m × 2,80 m = 43,68 m² − porta 1,68 − janela 1,80 = 40,20 m²");
  - o que a IA encontrou e **não existe no orçamento** vem com "?" e fundo amarelo, sem caixa de marcar ("não há item no orçamento — confira se precisa");
  - a quantidade de cada linha pode ser corrigida antes de usar.
- **Lista somada:** os insumos de todos os serviços marcados, somados (ex.: as horas de pedreiro do chapisco e do reboco viram uma linha só), com "Precisa" e custo.
- **Ações:**
  - **"Criar frentes dos marcados"** cria uma frente por serviço marcado, já com a quantidade, e abre a lista para completar datas e responsável;
  - **"PDF da lista"**.
- **Erro:** se a leitura falhar ou o PDF for ilegível: "Não consegui ler este projeto com segurança. Tente um PDF exportado do CAD ou descreva as medidas no texto." Nada é cobrado em dobro e nada é gravado.

**Estado vazio**
Modo "Por medidas" sem nenhum item com composição: "Nenhum serviço do orçamento tem composição analítica. Importe o orçamento com as composições para usar a calculadora."

---

## Tela: Item do orçamento

**Quem acessa:** Engenheiro.
**Chega aqui por:** um toque num item do Orçamento, ou pelo link no Detalhe da frente.

**O que aparece**
1. **Cabeçalho:** código, etapa, referência (ex.: SINAPI ou própria), a descrição completa e "quantidade × custo unitário = total".
2. **Seis números:** Executado (quantidade e %) · Falta executar · Orçado de mão de obra (e o valor por unidade) · Contratado de mão de obra (em coral se passar do orçado, com a diferença) · Medido (e % do contratado) · Saldo a medir.
3. **Composição analítica** (por unidade do item): tipo (etiqueta colorida: Material, Mão de obra, Equipamento), insumo, unidade, coeficiente, custo unitário e custo por unidade do item. A última linha é o custo unitário do serviço.
4. **Levantamento de material e mão de obra** (automático): para cada insumo, coeficiente × quantidade do **item inteiro** e coeficiente × quantidade que **falta executar**, esta em destaque.
5. **Frentes deste item:** nome, quantidade, ambiente, responsável, status, medido de contratado e o %. Embaixo, o botão **"+ Nova frente deste item"** abre o formulário de frente já com o item escolhido e a quantidade do saldo.

**Estado vazio**
Frentes: "Nenhuma frente usa este item ainda." e o botão "+ Nova frente deste item".

---

## Tela: Frentes de serviço

**Quem acessa:** Engenheiro (edita) e Mestre (só olha, sem valores).
**Chega aqui por:** o item "Frentes" do menu.

**O que aparece**
A lista de todas as frentes da obra, inclusive as concluídas, na ordem do início previsto. Cada linha mostra o serviço, o ambiente, o responsável, o início e o fim previstos, o status e o %. Para o engenheiro, há o botão "Nova frente".

**Formulário da frente** (só o engenheiro)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Serviço | texto | sim | ex.: "Alvenaria 2º pavimento" |
| Ambiente | escolha da lista de ambientes | não | |
| Responsável | escolha da lista de empreiteiros, ou "Equipe própria" | sim | |
| Início previsto | data | sim | |
| Fim previsto | data | sim | não pode ser antes do início |
| Fim limite | data | sim | a data mais tarde para terminar sem empurrar a entrega. Não pode ser antes do fim previsto |
| Item do orçamento | escolha na árvore do orçamento (só itens, não etapas) | sim | mostra código, descrição, unidade e **saldo disponível** (quantidade do item menos a das outras frentes) |
| Quantidade | número | sim | na unidade do item, que aparece ao lado e não se digita. Não pode passar do saldo disponível. Se for a primeira frente do item, já vem com a quantidade inteira |
| Status | escolha: `Não iniciada`, `Em andamento`, `Concluída` | sim | começa como `Não iniciada` |
| Valor orçado (R$) | dinheiro | — | **calculado e só mostrado**: quantidade × custo unitário do item, com a parte de mão de obra ao lado |
| Valor contratado (R$) | dinheiro | sim | |

**Ações**
- **Nova frente:** abre o formulário vazio. Ao salvar, a frente aparece na lista e no Painel, sem recarregar a página.
- **Tocar numa linha:** o engenheiro abre o formulário preenchido; o mestre abre o Detalhe da frente.
- **Excluir** (dentro do formulário, só o engenheiro): pede confirmação. Se a frente já aparece em algum diário, a exclusão é recusada com a mensagem "Esta frente já tem diário. Marque como Concluída em vez de excluir."

**Regras por perfil**
- **Mestre:** só leitura. Sem valores e sem "Nova frente".

**Estado vazio**
"Nenhuma frente ainda." Para o engenheiro, vem junto o botão "Nova frente".

---

## Tela: Lançar hoje

**Quem acessa:** Mestre (é a tela de abertura dele) e Engenheiro (pelo Diário).
**Chega aqui por:** o item "Hoje" do menu do mestre.

**O que aparece**
Um formulário de uma coluna só, com botões grandes, feito para o celular em pé no canteiro:

1. **Data:** hoje, fixa para o mestre.
2. **Clima por período:** três linhas, **Manhã**, **Tarde** e **Noite**, cada uma com quatro botões grandes (`Sol`, `Nublado`, `Chuva`, `Chuva forte`) e o valor escolhido escrito ao lado do nome do período. Tocar de novo no botão marcado desmarca. Cada período é opcional e aparece como "não informado".
3. **Frentes trabalhadas hoje:** a lista das frentes em andamento e das não iniciadas. Para cada frente que o mestre tocar, abrem:
   - o avanço acumulado, com um deslizador de 0 a 100 de 5 em 5 e um campo numérico ao lado. O valor começa no último avanço lançado;
   - o **efetivo por função**: uma lista com as principais funções de mão de obra, cada uma com os botões − e +, e o total de pessoas somado no título. As funções são, nesta ordem: Pedreiro, Servente, Carpinteiro, Armador, Eletricista, Encanador, Pintor, Gesseiro, Azulejista, Serralheiro, Soldador, Impermeabilizador, Operador de máquinas e Encarregado. As que têm quantidade aparecem destacadas. Embaixo, o campo **"Outra função"** com o botão "+ Acrescentar": a função nova entra na lista daquela obra (com a etiqueta "nova") e passa a aparecer nas próximas frentes e nos próximos dias;
   - a caixa "Serviço concluído". Marcar essa caixa leva o avanço para 100%.
4. **Fotos:** o botão "Tirar foto" abre a câmera. Cada foto pede a frente e o ambiente (os dois opcionais).
5. **Ferramentas e equipamentos:** o botão **"Repetir a lista de ontem"** e, abaixo, a lista. Cada item tem equipamento, quantidade, `Próprio`/`Alugado` e `Em uso`/`Parado`/`Com defeito`. Há o botão "+ Equipamento".
6. **Ocorrências:** texto livre.
7. **Botão Salvar diário**, grande, fixo no rodapé.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Clima — manhã | escolha | não | `Sol`, `Nublado`, `Chuva`, `Chuva forte` |
| Clima — tarde | escolha | não | as mesmas opções |
| Clima — noite | escolha | não | as mesmas opções |
| Avanço acumulado | % de 0 a 100 | sim, para cada frente marcada | não pode ser menor que o último lançado. Se for, aparece o aviso "Menor que o último lançado (60%). Confirma?" |
| Efetivo por função | função + quantidade (inteiro ≥ 0) | não | lista fixa de 14 funções + as que o mestre acrescentar. Quantidade 0 não é gravada |
| Outra função | texto | não | primeira letra maiúscula. Se já existir com outro jeito de escrever (ex.: "pedreiro"), soma na que existe em vez de duplicar |
| Serviço concluído | sim/não | sim | |
| Foto | imagem | não | comprimida antes de subir |
| Equipamento | texto | sim, para cada item | |
| Quantidade | inteiro | sim | começa em 1 |
| Origem | escolha | sim | `Próprio`, `Alugado` |
| Situação | escolha | sim | `Em uso`, `Parado`, `Com defeito` |
| Ocorrências | texto longo | não | |

**Ações**
- **Salvar diário:** grava tudo e mostra "Diário de hoje salvo". Se já existe diário de hoje, a tela abre preenchida e salvar atualiza o mesmo diário.
- **Repetir a lista de ontem:** copia os equipamentos do último diário.
- **Tirar foto:** abre a câmera. A foto aparece em miniatura logo depois.

**Regras por perfil**
- **Mestre:** só lança e edita o dia de hoje.
- **Engenheiro:** pode escolher a data e editar qualquer dia.

**Estado vazio**
Se a obra não tem frentes: "Ainda não há frentes nesta obra. Peça ao engenheiro para cadastrar."

---

## Tela: Diário de obra

**Quem acessa:** Engenheiro e Mestre.
**Chega aqui por:** o item "Diário" do menu.

**O que aparece**
No topo, dois botões: **"Lançar hoje"** e **"Gerar PDF"**. Abaixo, a lista de dias, do mais recente ao mais antigo. Cada linha tem o botão **"PDF"** à direita e mostra a data com o dia da semana, o número do RDO, o clima de manhã, de tarde e de noite (ex.: "Sol · Chuva · Chuva"), quantas frentes andaram, o efetivo total, quantas fotos tem e, para o engenheiro, quantas fotos ainda não foram liberadas ao cliente.

**Dia do diário** (ao tocar numa linha): tudo o que foi lançado naquele dia. Para o engenheiro, cada foto tem a chave **"Cliente vê"**, desligada de início, e no topo fica o botão **"Liberar todas da semana"**.

**Ações**
- **Tocar num dia:** abre o Dia do diário.
- **Lançar (engenheiro):** abre Lançar hoje, com a escolha da data.
- **Editar (engenheiro):** abre o dia no formulário de Lançar hoje.
- **Chave "Cliente vê" (engenheiro):** libera ou esconde a foto para o cliente na hora.
- **Liberar todas da semana (engenheiro):** pede confirmação ("Liberar 12 fotos para o cliente?") e liga a chave de todas as fotos dos últimos 7 dias.
- **Gerar PDF** (no topo, ou "PDF" na linha de um dia): abre uma folha de escolha com:
  - **"Só o dia {data}"** (já vem marcado);
  - **"Um período (uma página por dia)"**, com dois seletores, **De** e **Até**, entre os dias lançados;
  - **"Incluir as fotos do dia"** (marcado de início);
  - os botões **Cancelar** e **Ver o PDF**.
  "Ver o PDF" abre a tela PDF do diário.

**Regras por perfil**
- **Mestre:** só leitura dos dias anteriores, sem as chaves de foto. Não vê a contagem de "não liberadas". Pode gerar PDF.

**Estado vazio**
"Nenhum diário lançado nesta obra. O primeiro diário aparece aqui assim que alguém lançar o dia. Depois, dá para gerar o PDF de um dia ou de um período." Embaixo, o botão "Lançar o primeiro diário".

---

## Tela: Projeto marcado

**Quem acessa:** Engenheiro (o **único** que marca, envia PDF e calibra a escala) e Mestre (**só vê**: sem "Marcar executado", sem "+ Enviar PDF", sem "Calibrar escala"). O cliente não.
**Chega aqui por:** a aba "Projeto marcado" do Diário de obra (o Diário passa a ter as abas **Dias** · **Projeto marcado**).
**Fase:** 2. Usa o **pdf.js** para mostrar a página do PDF, a única biblioteca além do `@supabase/supabase-js`, e precisa da confirmação do engenheiro no começo da construção.

**O que aparece**
1. **Pranchas:** um botão por página do PDF, com o nome da prancha, e o botão **"+ Enviar PDF"**.
2. **Legenda dos serviços:** um botão por serviço, com quadrado de cor e nome, que mostra ou esconde as marcações daquele serviço.
   - As cores seguem uma ordem fixa, por ordem de criação do serviço na obra, e nunca mudam: `#2a78d6`, `#eb6834`, `#1baf7a`, `#eda100`, `#e87ba4`, `#008300`.
   - Do 7º serviço em diante, a cor se repete, com textura de listras.
3. **"Mostrar o executado até":** uma escolha de data (as datas com marcação e hoje). Esconde o que foi marcado depois.
4. **A planta:** a página do PDF em fundo branco, com as marcações por cima.
   - **Linha:** traço grosso na cor do serviço, com contorno branco para destacar do desenho. Instalações ficam tracejadas.
   - **Área:** preenchimento translúcido (28%) com borda na cor.
   - **Rótulo** "Serviço · data" em cada marcação, com fundo branco.
   - **Dica** ao passar o mouse ou tocar: serviço, medida, data e quem marcou.
   - No celular, a planta fica no tamanho de leitura (largura mínima de 620 px), arrasta para os lados e aceita o gesto de pinça para aproximar, com o aviso "↔ Arraste a planta para os lados".
5. **Ferramentas:**
   - escolha do **serviço a marcar** (com o item do orçamento) e o botão **"Marcar executado"**;
   - no modo de marcar: **"Desfazer ponto"**, **"Cancelar"** e **"Concluir marcação"**, com a dica "Toque na planta para marcar os cantos da área / o caminho de {serviço}. {n} pontos · mínimo 3/2. A data é a de hoje.";
   - fora do modo de marcar: "Escala: 1:50, calibrada pela cota de 10,40 m." e o link **"Calibrar escala"** (tocar os dois extremos de uma cota conhecida e digitar a medida).
6. **Marcações desta prancha:** tabela com serviço (quadrado de cor + nome), medida (m ou m²), executado em e marcado por. As que estão depois do filtro de data aparecem apagadas.
7. **Nota:** "As medidas saem da escala do projeto e ficam como referência para o diário e a medição: o avanço oficial continua sendo o lançado no diário."

**Ações**
- **Concluir marcação:** exige pelo menos 2 pontos (linha) ou 3 (área). Grava com a data de hoje e quem marcou, e mostra "{Serviço}: {medida} marcados como executados hoje".
- **Editar ou apagar uma marcação:** só o engenheiro.

**Estado vazio**
Sem PDF: ícone, "Nenhum projeto enviado nesta obra. Envie o PDF do projeto para marcar sobre ele o que já foi executado." e o botão "Enviar PDF do projeto".

---

## Tela: PDF do diário (RDO)

**Quem acessa:** Engenheiro e Mestre. **O cliente não**, porque o RDO tem ocorrências, nomes de empreiteiros e equipamentos.
**Chega aqui por:** "Ver o PDF", na folha de escolha do Diário de obra.

**O que aparece**
No topo, o botão **"Salvar em PDF"** e uma linha explicando o que vai sair (ex.: "5 RDOs · 17/10/2026 a 13/10/2026. No celular, escolha 'Salvar como PDF' na tela de impressão"). Abaixo, a prévia das folhas A4, uma por dia, cada uma com:

1. **Cabeçalho:** o logo FMZ, "RELATÓRIO DIÁRIO DE OBRA", o nome da obra e, à direita, o **RDO nº** e a data.
2. **Dados:** obra, data com o dia da semana, cliente, entrega em contrato, quem lançou e a que horas, e o responsável técnico.
3. **Condições do tempo:** tabela Manhã · Tarde · Noite ("Não informado" quando vazio).
4. **Mão de obra (efetivo):** tabela função × quantidade, somando todas as frentes do dia, com a linha **Total**.
5. **Serviços executados:** frente, ambiente, responsável, avanço no dia, avanço acumulado e equipe por função.
6. **Ferramentas e equipamentos:** equipamento, quantidade, origem e situação.
7. **Ocorrências:** o texto do dia.
8. **Registro fotográfico** (se marcado): fotos em grade de 2 colunas, cada uma com ambiente, frente e data na legenda. Entram **todas** as fotos do dia, liberadas ou não, porque o RDO é documento interno.
9. **Assinaturas:** duas linhas, "Mestre de obras" (com o nome de quem lançou) e "Responsável técnico".
10. **Rodapé:** "Gerado pelo app FMZ Incorporadora", com data e hora da geração.

**Nunca aparece no RDO:** valores em R$ (orçado, contratado, medido), folga, data limite de decisão e previsão de entrega calculada.

**Ações**
- **Salvar em PDF:** abre a impressão do navegador, já em A4 e só com as folhas, sem menu nem botões. Ali, a pessoa escolhe "Salvar como PDF" (ou manda direto para a impressora). Não precisa de biblioteca nenhuma: é a impressão do próprio navegador, com uma folha de estilo de impressão.
- **Voltar:** volta para o Diário de obra.

**Número do RDO:** é a posição do diário na obra, em ordem de data (o primeiro diário da obra é o RDO nº 1). É calculado, não digitado.

---

## Tela: Obras e equipe

**Quem acessa:** Engenheiro.
**Chega aqui por:** o item "Obras" do menu.

**O que aparece**
Quatro abas finas: **Obras · Ambientes · Empreiteiros · Equipe**.

| Aba | Campos |
|---|---|
| Obras | código/apelido* (ex.: JE-01), nome*, endereço, cliente*, data de início*, data-meta de entrega* (= a do contrato), valor do contrato com o cliente (R$)*, situação (`Em andamento` / `Concluída` / `Parada`) |
| Ambientes (da obra escolhida) | nome* |
| Empreiteiros (valem para todas as obras) | nome*, telefone/WhatsApp |
| Equipe (da obra escolhida) | lista de quem tem acesso: nome, email e papel (`Engenheiro`, `Mestre`, `Cliente`). Botão "Convidar" |

*obrigatório

**Ações**
- **Nova obra:** cria a obra e já coloca o engenheiro como membro dela. A obra nova aparece no seletor na hora.
- **Convidar:** pede nome, email e papel e envia o convite por email. A pessoa aparece na lista com a etiqueta "Convite enviado".
- **Remover da obra:** pede confirmação. A pessoa perde o acesso àquela obra, e o que ela lançou continua guardado.
- **Desativar / Reativar:** bloqueia ou devolve o acesso da pessoa a todas as obras, sem apagar nada.
- **Excluir ambiente ou empreiteiro:** é recusado se estiver em uso, com a mensagem "Em uso em N frentes".

**Estado vazio**
- Obras: "Nenhuma obra ainda. Crie a primeira para começar."
- Ambientes: "Cadastre os ambientes (ex.: Cozinha, Suíte 1, Fachada) para o cliente ver o avanço por ambiente."
- Empreiteiros: "Nenhum empreiteiro cadastrado."
- Equipe: "Só você tem acesso a esta obra."

---

## Tela: Medição (Fase 2)

**Quem acessa:** Engenheiro.
**Chega aqui por:** o item "Medição" do menu.

**O que aparece**
A lista dos empreiteiros da obra. Cada um mostra o total contratado, o total medido, o saldo e a data da última medição. Ao tocar, abre a lista de medições daquele empreiteiro, cada uma com período, valor e status.

**Medição do empreiteiro** (formulário)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Período (início e fim) | datas | sim | |
| Itens: item do orçamento (código e descrição) · frente · quantidade medida (na unidade do item) · preço unitário contratado · valor (R$) · orçado de mão de obra para essa quantidade | lista | sim, pelo menos 1 | **começa preenchida**: para cada frente do empreiteiro, a quantidade sugerida é (avanço no fim do período − avanço no início) × quantidade da frente. O preço unitário contratado é o valor contratado ÷ quantidade da frente. Quando o valor medido passa do orçado de mão de obra, a linha fica em coral |
| Status | `Rascunho` / `Fechada` | sim | |

**Ações**
- **Nova medição:** cria um Rascunho já preenchido.
- **Fechar medição:** pede confirmação. Depois de fechada, não se edita mais.
- **Exportar:** baixa uma planilha (CSV) da medição.

**Estado vazio**
"Nenhuma medição ainda para este empreiteiro."

---

## Tela: Minha obra (portal do cliente, Fase 2)

**Quem acessa:** Cliente.
**Chega aqui por:** é a única tela dele.

**O que aparece**
1. O nome da obra e o logo FMZ.
2. **"Entrega prevista em contrato: 15/03/2027"**. É sempre a data do contrato, nunca a calculada.
3. **Avanço geral (%)** e a **lista de ambientes**, cada um com uma barra de avanço.
4. **Fotos da semana:** as fotos liberadas pelo engenheiro nos últimos 7 dias, agrupadas por ambiente. Tocar abre a foto grande.

**Regras por perfil**
- O cliente nunca vê: valores, nomes de empreiteiro, ocorrências, equipamentos, frentes individuais, folga, previsão calculada ou fotos não liberadas.

**Estado vazio**
"As fotos desta semana aparecem aqui assim que forem liberadas."

---

## Textos do sistema

- **Botões:** Salvar, Cancelar, Nova frente, Excluir, Convidar, Trocar, Sair, Salvar diário, Tirar foto.
- **Confirmação de exclusão:** "Excluir {nome}? Isso não pode ser desfeito."
- **Diário salvo:** "Diário de hoje salvo."
- **Sem permissão:** "Você não tem acesso a esta informação."
- **Erro genérico:** "Não foi possível salvar. Verifique a internet e tente de novo. Nada do que você digitou foi perdido."

## Dados de exemplo

Data de referência: hoje = **18/10/2026**. São **duas obras**, para provar que trocar de obra troca tudo e não mistura nada.

**Obras**
- **Residencial Jardim Europa** · cliente Paula Mendes · entrega em contrato 15/03/2027 · contrato R$ 1.850.000,00.
- **Casa Vila Nova** · cliente Ricardo Teixeira · entrega em contrato 20/12/2026 · contrato R$ 920.000,00.

**Ambientes**
- Jardim Europa: Estrutura, Sala, Cozinha, Suíte 1, Fachada.
- Vila Nova: Térreo, Pavimento superior, Área externa.

**Empreiteiros:** Silva Alvenarias · Construtora Pereira (estrutura) · Elétrica Luz Forte · Gesso & Cia.

**Usuários**
- Engenheiro (membro das duas obras).
- Mestre Ricardo Alves (só Jardim Europa).
- Mestre Marcos Dias (só Vila Nova).
- Cliente Paula Mendes (só Jardim Europa).

**Frentes** (avanço e histórico, para gerar cada situação do painel)

| Obra | Serviço | Ambiente | Responsável | Status | Avanço | Situação esperada no painel |
|---|---|---|---|---|---|---|
| Jardim Europa | Alvenaria 2º pavimento | Suíte 1 | Silva Alvenarias | Em andamento | 60%, último avanço em 13/10 | ritmo real, amarelo (folga de 5 dias) |
| Jardim Europa | Laje do 2º pavimento | Estrutura | Construtora Pereira | Em andamento | 40%, sem avanço desde 01/10 | **Parada — sem ritmo** (vermelho) |
| Jardim Europa | Instalações elétricas — tubulação | Sala | Elétrica Luz Forte | Em andamento | 25% | ritmo real, vermelho (folga de −3 dias) |
| Jardim Europa | Reboco interno | Cozinha | Equipe própria | Em andamento | 10%, só 2 diários | ritmo do cronograma, folga de 22 dias |
| Jardim Europa | Gesso forro | Sala | Gesso & Cia | Não iniciada | 0%, início previsto 05/11 | "—" sem andar, folga grande |
| Jardim Europa | Fundação | Estrutura | Construtora Pereira | Concluída | 100% | não aparece no painel |
| Vila Nova | Contrapiso | Térreo | Equipe própria | Em andamento | 70% | ritmo real, folga de 15 dias |
| Vila Nova | Alvenaria | Pavimento superior | Silva Alvenarias | Em andamento | 85% | ritmo real, amarelo (folga de 2 dias) |
| Vila Nova | Muro de divisa | Área externa | Equipe própria | Não iniciada | 0%, início previsto 10/10 (já passou) | 8 dias sem andar, ritmo do cronograma |

**Diários:** para cada obra, diários nas últimas 3 semanas, de segunda a sábado, que produzam os avanços acima. Inclua:
- pelo menos um dia com `Chuva` e efetivo baixo;
- duas ou três fotos por semana por obra, metade liberada e metade não;
- equipamentos (ex.: "Betoneira 400 L", 1, `Alugado`, `Em uso`; "Andaime (módulos)", 20, `Próprio`, `Em uso`; "Serra mármore", 1, `Próprio`, `Com defeito`);
- **o diário de hoje lançado no Vila Nova e não lançado no Jardim Europa.**

**Orçamento** (Jardim Europa): 7 etapas e 12 itens, como no `preview.html`. O item **4.1 Alvenaria de vedação** tem 1.250 m² a R$ 70,15/m², e a composição é:

| Insumo | Coeficiente | Custo unitário |
|---|---|---|
| Bloco cerâmico | 13 un/m² | R$ 2,10 |
| Argamassa | 0,011 m³/m² | R$ 520,00 |
| Pedreiro | 0,75 h/m² | R$ 28,50 |
| Servente | 0,75 h/m² | R$ 21,00 |

O item tem duas frentes: Alvenaria 1º pav (620 m², concluída) e Alvenaria 2º pav (630 m², 60%). O Vila Nova tem um orçamento pequeno, e a Casa Alphaville não tem orçamento (estado vazio).

**Valores** (só engenheiro): o contratado em cada frente, de forma que pelo menos um item tenha a mão de obra contratada acima da orçada. Na prévia, o 4.1 tem R$ 52.500,00 contratados contra R$ 46.406,25 orçados.

## Critérios de aceite

- [ ] O engenheiro entra e cai no Painel de frentes da última obra usada, com a faixa da entrega no topo.
- [ ] No Jardim Europa, a ordem do painel é: Laje (Parada), Elétrica (−3), Alvenaria (5, amarelo), Reboco (22), Gesso. A Fundação não aparece.
- [ ] Trocar para o Vila Nova troca a faixa, os cartões, a lista e o rodapé, e nenhuma frente do Jardim Europa continua na tela.
- [ ] A faixa mostra "Entrega em risco" no Jardim Europa e "Entrega de pé" no Vila Nova.
- [ ] O mestre Ricardo entra em "Lançar hoje" do Jardim Europa, não vê seletor de obra e não encontra nenhum valor em R$ em tela nenhuma.
- [ ] Salvar o diário com a Alvenaria em 65% faz o painel do engenheiro mudar sem recarregar a página.
- [ ] Lançar um avanço menor que o anterior mostra o aviso e pede confirmação.
- [ ] "Repetir a lista de ontem" copia os equipamentos do último diário.
- [ ] Uma foto nova não aparece em Minha obra até o engenheiro ligar "Cliente vê".
- [ ] A cliente Paula vê só o Jardim Europa: avanço por ambiente, fotos liberadas e a data do contrato. Nenhum nome de empreiteiro, nenhum valor.
- [ ] "Gerar PDF" de um período de 5 dias produz 5 folhas A4, uma por dia, e a impressão mostra só as folhas, sem menu nem botões.
- [ ] O RDO não mostra nenhum valor em R$, nenhuma folga e nenhuma previsão calculada. O cliente não tem acesso a ele.
- [ ] O Orçamento mostra as 7 etapas e os 12 itens do Jardim Europa, e tocar numa etapa abre e fecha os itens dela.
- [ ] O item 4.1 mostra a composição (custo unitário R$ 70,15), o levantamento (16.250 blocos no item inteiro, 3.276 no que falta) e as duas frentes, e o executado é 79,8%.
- [ ] Criar uma frente com quantidade maior que o saldo do item é recusado com a mensagem "Passa do saldo do item ({saldo} {unidade})".
- [ ] O mestre não encontra o Orçamento no menu nem consegue abrir um item.
- [ ] No Jardim Europa, o Cronograma mostra previsto 67,4% × realizado 58,0% até out/26, com a Estrutura e a Elétrica "ATRASADA" e a Alvenaria "ADIANTADA".
- [ ] No Projeto marcado, uma linha de (250,210) a (560,210) na escala de 50 unidades/m mede 6,20 m, e a área do radier mede 10,64 m².
- [ ] O filtro "Mostrar o executado até 19/09" esconde o radier (30/09) e as instalações (26/09) da prancha de fundações.
- [ ] Esconder um serviço na legenda some com as marcações dele na planta, mas não na tabela.
- [ ] O mestre vê a planta marcada, mas não encontra "Marcar executado", "+ Enviar PDF" nem "Calibrar escala", e o banco recusa uma marcação feita por ele.
- [ ] Na calculadora por medidas, 4,20/3,60 × 2,80 (2 vezes cada) menos porta 0,80×2,10 e janela 1,50×1,20 dá 40,20 m² de alvenaria, com 523 blocos, 0,45 m³ de argamassa e 30,2 h de pedreiro.
- [ ] Digitar "4.20" e "4,20" dá o mesmo resultado.
- [ ] No modo com IA, nenhuma frente é criada sem o engenheiro tocar "Criar frentes dos marcados", e as linhas desmarcadas saem da lista somada.
- [ ] Alterar a data de uma frente não muda o previsto do cronograma. "Nova linha de base" muda, e a versão anterior continua guardada.
- [ ] A tabela do cronograma rola para o lado no celular com a coluna "Etapa" fixa, e a página não rola para o lado.
- [ ] Todas as telas funcionam no celular (375px) sem rolagem horizontal. No computador, a barra inferior vira menu lateral.
- [ ] Cada lista tem um estado vazio com texto próprio.

## A conta que vai chegar depois

- `[PENDENTE: logo em PNG com fundo transparente]` — sem ele, o logo aparece com um fundo cinza sobre o cabeçalho.

## Decidir depois de usar

- `[DESCOBRIR NO USO: com quantos dias de folga a frente fica amarela]` — por enquanto: 7 dias.
- `[DESCOBRIR NO USO: o passo do deslizador de avanço]` — por enquanto: 5 em 5%.
