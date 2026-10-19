# FMZ Incorporadora — acompanhamento de obras

Acompanhamento de obras da FMZ Incorporadora: o engenheiro vê toda manhã se a entrega
está de pé, o mestre lança o diário no canteiro e o cliente acompanha a obra dele.
React + Vite + Supabase + Vercel, só `@supabase/supabase-js` dentro do app. Perfis e cascas:
Engenheiro (`src/pages/AppEngenheiro.jsx`), Mestre (`AppMestre.jsx`), Cliente (`AppCliente.jsx`),
todos sobre `src/pages/Casca.jsx`. Fonte das decisões: `PLANO-DO-PROJETO.md`, `PRD-FRONTEND.md`,
`PRD-BACKEND.md`. Identidade visual: cores do logo FMZ (azul `#175D8E`, amarelo `#F2AD21`, opção "Azul FMZ"), tokens em `src/index.css`; o `preview.html` ficou só como referência de layout.

## ESTE APP É MULTI-OBRA (vale para todo módulo, agora e depois)

- **Toda tabela de lançamento tem `obra_id` obrigatório**, apontando para `obras`. Sem exceção,
  desde a primeira migration de cada módulo. Também no mock (`src/lib/mockData.js`).
- **Todo módulo novo filtra por `obra_id` — e quem filtra é a camada de dados.**
  `src/lib/dados.js` guarda a obra atual (`definirObraAtual`, chamada só pelo
  `ObraContext`) e injeta o `obra_id` em toda busca e gravação. **As telas nunca passam
  `obra_id`.** Função de lançamento sem obra escolhida devolve erro, nunca "a lista de todas".
- **Nenhuma tela mostra dados de duas obras juntas**, a não ser uma tela que seja
  explicitamente um comparativo entre obras — e esta é uma consulta agregada na camada de
  dados (uma linha por obra), nunca um laço no front. A lista de obras do seletor e da tela
  Obras é o cadastro da obra, não lançamento.
- **Trocar de obra remonta a casca** (`key={obra.id}` em `src/App.jsx`). Nada fica da obra
  anterior na tela, e nada é salvo na obra errada. Todo `useEffect` de busca depende de
  `obra?.id`. Cache, `useRef` ou `localStorage` com dado de obra: a chave leva o `obra_id`.
- **A obra escolhida fica guardada no aparelho, por pessoa** (`chaveObraGuardada` em
  `src/lib/obras.js`). Se ela sumir ou a pessoa perder o acesso, abre a primeira obra em
  andamento (`escolherObraInicial`).
- **Desenvolva e teste sempre com mais de uma obra.** Os dados de exemplo têm três,
  diferentes de propósito (JE-01 com atraso, VN-02 no prazo, CA-03 parada e vazia).
  O `tests/obras.mjs` prova que nenhuma frente vaza entre obras — todo módulo novo
  acrescenta lá a conferência dele.
- No banco (etapa do Supabase): tabela `membros` (obra, pessoa, papel) e a mesma política
  RLS em toda tabela, via uma função `minhas_obras()` usada com `(select ...)`.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura: cálculo, recorte, decisão, formatação.
  Sem React, sem banco, sem `window`. Roda no Node sem bundler (import com
  `.js` explícito). É a única camada com teste.
- **Não → `src/screens/*.jsx`.** Estado de interface, layout, o que se toca.
  A tela **pede a decisão à lib**; não decide.
- `src/lib/dados.js` — **única porta dos dados.** Nenhuma tela chama o Supabase direto.
- `src/lib/supabase.js` — a conexão (fica `null` sem `.env.local`, como nos testes em
  Node; aí `dados.js` usa o mock). Obras e Materiais já vêm do banco.

Três consequências práticas:

1. **`if` de negócio dentro de tela vai para `lib`**, mesmo com três linhas —
   se a linha decide *o que é verdade*, e não *o que aparece*.
2. **Constante compartilhada tem um dono só.** Situações da obra (`SITUACOES` em
   `src/lib/obras.js`), status, papéis: o texto é idêntico ao CHECK do banco.
3. **Arquivo grande não é problema; arquivo confuso é.**

## Régua de verificação

```bash
npm run check
```

Build + lint + testes. **Fecha em zero** — não há linha de base herdada aqui.
Aviso novo é seu e é de agora; conserte no mesmo lote.

Nada disso prova que a tela funciona. Verde com a tela em branco é rotina: abra o app e
troque de obra para conferir.

**Todo bug corrigido em `src/lib/` nasce com teste junto**, no mesmo lote.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, `src/lib/ObraContext.jsx`,
políticas RLS, migrations ou fluxo de dinheiro (medição, valores) → rodar a revisão de
código (`/code-review` no Claude Code, `/review` no Codex) antes de subir. Nesses arquivos
o erro não aparece na tela: filtro de obra esquecido ou RLS frouxa vaza dado sem sintoma.

## Deploy

Ainda não ligado. O padrão desta casa: a pessoa diz "sobe pro GitHub", o agente sobe com
git e a Vercel publica sozinha. A pessoa não digita comando.

## Armadilhas desta base

- **Tabela nova nasce fechada para o app.** Toda tabela precisa de `grant` escrito na
  migration, só para `authenticated`. Erro 42501 é GRANT faltando, não RLS. Nunca
  `grant all`, nunca `to anon`. **Exceção provisória:** até o Capítulo 15 (Login) o app
  roda sem login, então as tabelas atuais liberam `anon` com políticas `dev_*` e a
  marca `publico-de-proposito` na migration. Essas políticas substituem, por enquanto, a
  RLS por obra (`minhas_obras()`). Não publicar o app antes de fechar isso.
- **Banco:** projeto Supabase `fmz-obras` (sa-east-1); conexão no `.env.local`
  (`VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`, nunca a service_role).
  O mapa do banco e os provisórios estão em `banco-resumo.md` — leia antes de mexer.
- **Depois de qualquer migration, regenere `tests/_schema-snapshot.json`** (colunas do
  `list_tables`) e atualize o `banco-resumo.md`. Migration nova vira arquivo em
  `supabase/migrations/` com o mesmo conteúdo aplicado, com nome que ordena na sequência
  em que foi aplicada (`AAAAMMDD-N-assunto.sql`).
- **Provisórios do back-end:** membros, frentes e login ainda são mock, casados com o
  banco pelo `codigo` da obra; `pedidos_material.frente` é texto (vira `frente_id`).
- **Planejamento (Last Planner) ainda é só mock**, sem tabela: `dados.js` guarda as atividades
  em memória por obra (voltam ao exemplo ao recarregar). As 4 abas (EAP, longo, médio, curto)
  usam UMA lista, no `PlanejamentoContext`; restrições e subtarefas ficam dentro da atividade.
  Regras em `src/lib/planejamento.js` (testes em `tests/planejamento.mjs`).
- **No Windows, use `npm.cmd`** (e `npx.cmd`) se o PowerShell bloquear o `npm.ps1`.
  Nunca mude a política de execução do Windows por causa disso.
- **O projeto está dentro do OneDrive.** A `node_modules` é recriável (`npm install`); se o
  OneDrive travar arquivos durante o build, pause a sincronização e rode de novo.
- **Datas como texto `AAAA-MM-DD`** (`src/lib/datas.js`). Nada de `toISOString()` para
  data de obra: vira UTC e pula um dia no fuso do Brasil.

## Higiene de código (vale para toda mudança)

Cada função morta é uma mentira que o próximo leitor precisa desmascarar.

- **Ao remover um recurso, cace a cadeia inteira no mesmo lote:** a função em
  `lib/dados.js` → a exposição no contexto → os chamadores nas telas → a query.
  Função exposta que nenhuma tela chama é lixo.
- **Zero avisos novos de lint.** Aviso antigo que você encontrar, limpe se já
  estiver tocando no arquivo.
- **Código comentado não é backup, o git é.** Comentário explica *por quê*.
  Bloco comentado sem explicação, apague.
- **Antes de apagar, prove que está morto:** grep pelo símbolo no projeto
  inteiro, e verifique quem chama o *wrapper*, não só a função. Depois confira
  órfãos: quem só era chamado pelo que você removeu morre no mesmo commit.
- **Estado que nunca muda ou nunca é lido é lixo** — `useState` sem setter,
  prop que ninguém consome, flag que ninguém liga.
- **Limpeza NUNCA toca no banco nem em arquivo de dado.** Tabela ou coluna
  órfã continua existindo até decisão de quem é dono. Na dúvida, pergunte.
