# Plano de desenvolvimento — Xadrez 3D Online (gambit)

## Contexto

O README define o produto e a arquitetura. A pasta `gambit` está vazia. Nada foi escrito ainda.

O plano segue a ordem do próprio README: **lógica → rede → 3D → variantes → polimento → extras**.

Cada fase termina com algo que roda e tem teste. Nenhuma fase depende de decidir a direção de arte.

Licença do repositório: **GPL-3.0** (por causa do chessops).

---

## Fase 0 — Esqueleto do monorepo

**Objetivo:** repositório pronto para receber código, com lint, tipos e testes rodando.

Arquivos:

- `package.json` (raiz, scripts `test`, `typecheck`, `lint`, `dev`)
- `pnpm-workspace.yaml` (`apps/*`, `packages/*`)
- `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`, `moduleResolution: bundler`)
- `packages/core/package.json` (exporta `src/index.ts` direto, sem build)
- `vitest.workspace.ts`
- `.gitignore`, `LICENSE` (GPL-3.0), `.editorconfig`
- `docs/adr/` com os 10 ADRs do README, um arquivo por decisão

Tarefas:

1. `git init` e primeiro commit.
2. Configurar ESLint + Prettier.
3. GitHub Actions: `pnpm install`, `typecheck`, `lint`, `test` em cada push.

**Pronto quando:** `pnpm test` roda (mesmo sem testes) e o CI passa.

---

## Fase 1 — Core + tabuleiro 2D local

**Objetivo:** dá para jogar uma partida completa em 2D, no mesmo navegador, sem rede.

### 1a. Pacote `packages/core` (TDD, um arquivo por vez)

Ordem pensada para cada arquivo depender só dos anteriores:

| Arquivo       | Conteúdo                                                                                                                                                                                                                                           | Testes principais                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code.ts`     | `generateRoomCode()`, `normalizeCode()`, `formatCode()`, `isValidCode()`. Alfabeto de 31 símbolos. Amostragem por rejeição com `crypto.getRandomValues`                                                                                            | Normalização de `" k7p-2qx "`; nunca gera `0/O/1/I/L`; distribuição uniforme (teste estatístico simples)                                                                                        |
| `rules.ts`    | Schema Zod `RoomRules`: `variant`, `timeControl` (união discriminada `unlimited` / `fischer`), `creatorColor`, `allowSpectators`, `initialFen`, `theme`. Padrão 5+3                                                                                | Limites 10 s–3 h e 0–180 s; `initialFen` só aceito com `variant: chess`; FEN inválido rejeitado                                                                                                 |
| `result.ts`   | Tipos `GameStatus` e `GameResult` (`winner`, `reason`: checkmate, timeout, resign, agreement, stalemate, repetition, 75-move, insufficient, variantWin)                                                                                            | Só tipos e helpers de texto                                                                                                                                                                     |
| `clock.ts`    | Estado do relógio como dados. Funções puras: `startTurn`, `applyMove(clock, now)`, `remaining(clock, now)`, `flagTime(clock)`. Relógio só corre após o 1º lance de cada lado. Incremento somado após o lance                                       | Todos os casos com `now` injetado: sem tempo, incremento, primeiro lance, fim de tempo exato                                                                                                    |
| `chess960.ts` | `chess960Fen(n: 0..959)` e sorteio. Pode usar o que o chessops já oferece                                                                                                                                                                          | Posição 518 = posição padrão; bispos em cores opostas; rei entre torres                                                                                                                         |
| `game.ts`     | Classe `Game` sobre chessops. Entrada: regras + FEN inicial + lista de UCI. Expõe `legalMoves()`, `play(uci)`, `fen`, `turn`, `isCheck`, `history` (UCI + SAN), `status`. Detecta repetição tripla (guarda chave da posição) e regra dos 75 lances | **perft** nas posições clássicas (inicial, Kiwipete, posição 3–6) via `chessops/debug`; mate, afogamento, material insuficiente, repetição, 75 lances; replay de lista de lances = mesmo estado |
| `protocol.ts` | Schemas Zod das mensagens cliente→servidor (`hello`, `move`, `resign`, `draw`, `ping`) e servidor→cliente (`welcome`, `state`, `error`, `pong`). Tipo `Snapshot`. Função `parseClientMessage` com limite de tamanho                                | Mensagem válida passa; campo extra, tipo errado e mensagem grande demais falham                                                                                                                 |
| `index.ts`    | Reexporta tudo                                                                                                                                                                                                                                     | —                                                                                                                                                                                               |

Detalhe importante: o chessops não detecta repetição sozinho. A `Game` precisa contar posições (FEN sem os contadores de lance).

### 1b. App `apps/web` mínimo

- Next.js (App Router) + React 19 + Zustand.
- Store `useGameStore`: guarda o `Snapshot` e as ações (`selectSquare`, `move`).
- Componente `Board2D`: grade 8×8 em CSS, clique-clique, destaque de lances legais e do último lance, promoção com escolha da peça.
- Rota `/local`: partida contra si mesmo, usando a `Game` direto.

**Pronto quando:** dá para jogar até o mate em `/local`, e `pnpm test` cobre o core com perft passando.

---

## Fase 2 — Salas online

**Objetivo:** dois navegadores jogam pela internet, com relógio e reconexão.

### 2a. `apps/server` (Worker + Durable Object)

Arquivos:

- `wrangler.jsonc`: binding `Room`, migração com `new_sqlite_classes`.
- `src/index.ts`: Worker. Rota `POST /api/rooms` e `routePartykitRequest` para `/parties/room/<CÓDIGO>`.
- `src/room.ts`: classe `Room extends Server` (PartyServer), com `static options = { hibernate: true }`.

Fluxo de criação:

1. Worker valida `RoomRules` com Zod.
2. Gera código e chama `getServerByName(env.Room, código)`.
3. Chama o método RPC `init(rules)`. Se a sala já existe, gera outro código.
4. Responde `{ code, creatorToken }`.

Lógica da `Room`:

- Estado salvo no SQLite do objeto: regras, FEN inicial, lances, tokens dos assentos, relógio, oferta de empate, `lastActivity`.
- `onConnect` / `onMessage`: parse com `parseClientMessage`. Erro vira mensagem `error`.
- `hello`: token conhecido → recupera assento. Sem token e assento livre → ocupa e recebe token. Senão → espectador (se permitido).
- `move`: confere vez, `ply` esperado e tempo restante. Aplica na `Game`. Atualiza relógio. Faz broadcast de `state`.
- `resign`, `draw`, `ping`.
- Estado de conexão por socket guardado no attachment do WebSocket (sobrevive à hibernação).
- **Alarme único:** `setAlarm(min(fimDoRelógio, lastActivity + 24h))`. No disparo: se o relógio zerou, encerra por tempo; se expirou, apaga o storage.
- No fim da partida: grava PGN no D1 (tabela `games`). Pode ficar para a Fase 5 se atrasar.

Testes:

- Vitest com `@cloudflare/vitest-pool-workers`: criação, colisão de código, reivindicação de assento, lance ilegal, lance fora da vez, `ply` atrasado, fim de tempo por alarme, expiração.

### 2b. Cliente online em `apps/web`

- `lib/api.ts`: `createRoom(rules)`.
- `lib/connection.ts`: `PartySocket` com reconexão automática. Envia `hello` com token do `localStorage`.
- Store recebe `welcome`/`state`. **UI otimista:** aplica o lance local com o core e desfaz se vier `error`.
- Relógio exibido a partir de `serverNow` + diferença de horário local (medida com `ping`).
- Rotas: `/` (criar / entrar com código), `/r/[code]` (sala).

### 2c. E2E

- Playwright com dois contextos de navegador: cria sala, entra pelo código, joga mate do pastor, confere resultado nos dois lados.
- Caso de reconexão: recarrega a página no meio da partida e continua.

**Pronto quando:** o teste E2E passa contra `wrangler dev`, e o deploy no `*.workers.dev` funciona com dois aparelhos reais.

---

## Fase 3 — Cena 3D

**Objetivo:** o 3D substitui o 2D como padrão. O 2D continua como opção.

Antes de começar: **decidir a direção de arte** (mármore e latão, diorama low-poly ou brutalista).

Arquivos em `apps/web/components/scene/`:

- `Scene.tsx`: `<Canvas frameloop="demand">`, HDRI, `ContactShadows`.
- `Board3D.tsx`: casas com raycast.
- `Pieces.tsx`: GLTF com Draco/meshopt, instancing por tipo de peça.
- `useDrag.ts`: arrastar projetando o cursor num plano na altura do tabuleiro.
- `animation.ts`: arco da peça (sobe, desliza, desce). Respeita `prefers-reduced-motion`.
- `CameraRig.tsx`: órbita com limites. Gira para o lado das pretas.

Regras:

- A cena só lê o store. Nunca guarda estado de jogo.
- Nada de criar objetos dentro de `useFrame`.
- Seletor 2D/3D salvo no `localStorage`.

Assets: modelar ou adaptar peças CC0 no Blender. HDRI e texturas do Poly Haven.

**Pronto quando:** a partida online inteira funciona no 3D, e o celular médio roda a 60 fps parado e sem travar na animação.

---

## Fase 4 — Variantes e regras da sala (níveis 1 e 2)

**Objetivo:** o criador escolhe variante e opções.

Tarefas:

1. Ampliar `RoomRules.variant` com: Chess960, Rei da Colina, Três Xeques, Atômico, Antichess, Crazyhouse, Horde, Racing Kings.
2. `Game` usa a regra certa do chessops (`setupPosition(rules, ...)`).
3. Crazyhouse: lances de drop (`P@e4`) no protocolo e na UI (bolso de peças, 2D e 3D).
4. Três Xeques: contador de xeques no snapshot e na UI.
5. Formulário "Criar sala" com preview ao vivo do tabuleiro.
6. `creatorColor: random` e `allowSpectators`.
7. `initialFen` personalizado (só xadrez padrão), com editor simples ou campo de texto.

Testes: perft das variantes (o chessops tem posições de referência) e uma condição de vitória por variante.

**Pronto quando:** cada variante tem um teste de core e um E2E rápido de criação de sala.

---

## Fase 5 — Polimento

1. **Lobby:** código em destaque, copiar link, QR code, escolha de cor, lista de espectadores.
2. **Partida:** lista de lances, oferecer empate, desistir, chat rápido (frases prontas).
3. **Fim:** resultado, revanche com um clique (cores invertidas), replay lance a lance, download do PGN.
4. **Histórico:** PGN no D1 e página `/g/[id]` de replay.
5. **Som:** madeira no lance, tons para captura e xeque (CC0).
6. **Previews de link:** `generateMetadata` + imagem Open Graph em `/r/[code]` ("Sala K7P-2QX · Rei da Colina · 5+3").
7. **Deploy do frontend** na Cloudflare via `@opennextjs/cloudflare`.

**Pronto quando:** o fluxo de UX do README funciona do início ao fim na demo publicada.

---

## Fase 6 — Extras

1. **Bot:** Stockfish WASM num Web Worker, só no navegador. Nível ajustável. Joga xadrez padrão e Chess960.
2. **Editor de variantes (nível 3):** UI para definir peças, movimentos e vitória. Gera config do Fairy-Stockfish. ffish.js valida no cliente e no servidor. O bot passa a jogar a variante.
3. **Login opcional** (GitHub/Google), ligando tokens de assento a uma conta.

Cada item vira um plano separado quando chegar a hora.

---

## Entrega para o portfólio (ao longo do caminho)

- README com diagrama da arquitetura (Mermaid).
- ADRs em `docs/adr/`, atualizados quando uma decisão mudar.
- GIF de uma partida.
- Link da demo no topo do README.

---

## Verificação

Por fase:

- **Fase 1:** `pnpm test` (perft + casos de fim de jogo) e partida manual em `/local`.
- **Fase 2:** testes do Worker com `@cloudflare/vitest-pool-workers` e Playwright com dois navegadores contra `wrangler dev`. Depois, dois aparelhos reais na demo.
- **Fase 3:** mesmo E2E rodando com a cena 3D. Medir fps no DevTools em modo celular.
- **Fase 4:** perft das variantes e um E2E por variante.
- **Fase 5:** revisar a demo publicada e o preview de link colando a URL no WhatsApp.
- **Sempre:** CI verde em cada push. Conferir uso do plano Free no painel da Cloudflare depois do deploy.

## Pontos em aberto (não bloqueiam as Fases 0–2)

- Direção de arte do 3D (decidir antes da Fase 3).
- Nome final: a pasta se chama `gambit`, o README diz `xadrez3d`.
