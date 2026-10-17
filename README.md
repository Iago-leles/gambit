# Xadrez 3D Online

Aplicação de xadrez em 3D no navegador, com salas criadas pelo próprio usuário, cada uma com suas regras e um código para o oponente entrar.

É um projeto pessoal de portfólio, sem fins comerciais, pensado para rodar com **custo zero**.

> **Status:** em construção. Já dá para criar uma sala e jogar online em 3D (com o 2D como opção), com testes E2E em dois navegadores. O servidor já está publicado na Cloudflare. O site está sendo preparado para o deploy ([docs/deploy.md](docs/deploy.md)). O plano completo está em [docs/plano.md](docs/plano.md) e as decisões em [docs/adr/](docs/adr/).

---

## Sumário

1. [Visão](#visão)
2. [Princípios de arquitetura](#princípios-de-arquitetura)
3. [Stack](#stack)
4. [Estrutura do monorepo](#estrutura-do-monorepo)
5. [Salas e tempo real](#salas-e-tempo-real)
6. [Protocolo cliente ↔ servidor](#protocolo-cliente--servidor)
7. [Relógio](#relógio)
8. [Regras customizáveis](#regras-customizáveis)
9. [Frontend 3D](#frontend-3d)
10. [Fluxo de UX](#fluxo-de-ux)
11. [Custo zero](#custo-zero)
12. [Roadmap](#roadmap)
13. [Licenças](#licenças)
14. [Decisões registradas (ADRs resumidos)](#decisões-registradas-adrs-resumidos)

---

## Visão

- Qualquer pessoa cria uma sala, escolhe as regras (tempo, variante, cor, espectadores...) e recebe um código curto, como `K7P-2QX`.
- O oponente entra com esse código ou pelo link e a partida acontece em tempo real, num tabuleiro 3D.
- O diferencial planejado são as **regras customizáveis**: começa com variantes conhecidas e evolui até regras inventadas pelo próprio criador da sala.

O 3D é o que chama atenção no portfólio. O que mostra senioridade é a parte que não aparece:

- servidor autoritativo;
- regras modeladas como dados;
- código de xadrez compartilhado entre cliente e servidor.

## Princípios de arquitetura

1. **O servidor é a fonte da verdade.** O cliente _pede_ um lance e o servidor valida e decide. Isso elimina trapaça e dessincronização.
2. **Lógica compartilhada.** As mesmas regras rodam no navegador (lances legais na hora, animação sem esperar a rede) e no servidor (validação final). Elas ficam no pacote `packages/core`.
3. **Regras são dados.** Tudo o que muda a forma de jogar vive num schema validado com Zod. Assim, cliente e servidor nunca discordam sobre as regras.
4. **A partida é "regras + posição inicial + lista de lances".** Todo o resto é derivado ao reaplicar os lances. Reconexão, espectadores, replay e PGN saem quase de graça.
5. **O 3D é uma projeção do estado.** A cena lê a posição e anima as transições, mas nunca guarda a verdade. Isso permite ter um tabuleiro 2D alternativo.
6. **Ordem de construção:** lógica, depois rede, depois 3D.

## Stack

| Camada                        | Escolha                                                                                | Por quê                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Linguagem                     | TypeScript em todo o projeto                                                           | Tipos compartilhados entre cliente, servidor e protocolo                                       |
| Monorepo                      | pnpm workspaces                                                                        | Simples e rápido; o `core` é importado direto como fonte TS                                    |
| Validação                     | Zod                                                                                    | Schema das regras e de cada mensagem do protocolo                                              |
| Lógica de xadrez              | [chessops](https://github.com/niklasf/chessops) (a biblioteca do Lichess)              | Xadrez padrão e variantes em TypeScript                                                        |
| Variantes inventadas (futuro) | [Fairy-Stockfish / ffish.js](https://github.com/fairy-stockfish/Fairy-Stockfish)       | Variantes definidas pelo usuário via arquivo de configuração, mais um bot que joga a variante  |
| Tempo real                    | [PartyServer](https://github.com/cloudflare/partykit) sobre Cloudflare Durable Objects | Um objeto por sala, estado em memória e armazenamento SQLite próprio, sem servidor para operar |
| Frontend                      | Next.js + React 19                                                                     | Landing page e previews de link (Open Graph) para as salas                                     |
| 3D                            | React Three Fiber v9 + drei                                                            | R3F v9 é a linha compatível com React 19                                                       |
| Estado no cliente             | Zustand                                                                                | Store simples que a cena 3D apenas lê                                                          |
| Testes                        | Vitest (unidade) e Playwright (dois navegadores jogando)                               | —                                                                                              |
| Hospedagem                    | Cloudflare (Workers, Durable Objects, D1)                                              | Tudo numa conta, no plano gratuito                                                             |

**Alternativas consideradas:**

- **Colyseus:** ótimo (MIT, salas e sincronização prontas), mas exige um processo Node rodando o tempo todo.
- **Socket.IO direto:** obrigaria reimplementar salas, reconexão e escalabilidade.
- **Supabase Realtime:** não resolve sozinho a questão do servidor autoritativo.
- **Vite em vez de Next:** mais simples se não houver landing page nem previews de link.

## Estrutura do monorepo

```
gambit/
├── apps/
│   ├── web/              # Next.js + React Three Fiber (a fazer)
│   └── server/           # Worker + Durable Object "Room" (PartyServer)
├── packages/
│   └── core/             # Compartilhado por cliente e servidor
│       └── src/
│           ├── rules.ts      # Schema Zod das regras da sala
│           ├── code.ts       # Geração e validação de códigos de sala
│           ├── clock.ts      # Relógio como dados + funções puras
│           ├── chess960.ts   # Posições iniciais do Chess960
│           ├── result.ts     # Resultados e motivos de fim de partida
│           ├── game.ts       # Classe Game sobre chessops
│           └── protocol.ts   # Mensagens cliente ↔ servidor (Zod)
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Salas e tempo real

**Uma sala = um Durable Object.** O código da sala é o nome do objeto (`getServerByName(env.Room, código)`), então não há tabela de salas nem Redis. Cada objeto guarda a partida em memória e no seu SQLite.

**Códigos de sala**

- 6 caracteres de um alfabeto de 31 símbolos sem ambiguidades (sem `0/O`, `1/I/L`).
- Isso dá cerca de 887 milhões de combinações.
- Gerado com `crypto.getRandomValues` e amostragem por rejeição, para que todos os símbolos sejam igualmente prováveis.
- A entrada é normalizada: `" k7p-2qx "` vira `K7P2QX`. Exibição: `K7P-2QX`.
- Fácil de ditar e cabe num QR code.

**Criação**

1. O cliente faz `POST /api/rooms` com as regras.
2. O Worker valida as regras, gera o código e inicializa o Durable Object por RPC. Se houver colisão, gera outro código.
3. A resposta traz `{ code, creatorToken }`.
4. A conexão WebSocket acontece em `/parties/room/<CÓDIGO>`.

**Identidade sem login**

- Cada assento (brancas ou pretas) tem um token secreto, guardado no `localStorage` do jogador.
- O criador recebe o token dele na criação da sala. O primeiro visitante sem token ocupa o assento livre e recebe o seu.
- Quem reconectar com o token recupera o assento.
- Os demais visitantes viram espectadores, se a sala permitir.
- Login (GitHub/Google) pode vir depois.

**Ciclo de vida**

- Usa a API de WebSocket com **hibernação**: salas ociosas não consomem duração.
- Um único alarme por sala serve a dois propósitos: fim de tempo do relógio e expiração da sala.
- A sala expira após cerca de 24 h sem atividade, e o alarme apaga o armazenamento.
- No fim da partida, o PGN pode ir para o D1, para histórico e replay.

## Protocolo cliente ↔ servidor

Todas as mensagens são JSON, validadas com Zod nos dois lados. Mensagens grandes demais são rejeitadas.

**Cliente → servidor**

| Mensagem | Conteúdo                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `hello`  | `{ playerToken?, name? }` para reivindicar um assento ou entrar como espectador                                                           |
| `move`   | `{ uci, ply }`. `uci` usa formato UCI (`e2e4`, `e7e8q`, `P@e4`); `ply` é o lance esperado, para descartar pedidos atrasados ou duplicados |
| `resign` | —                                                                                                                                         |
| `draw`   | `{ action: "offer" \| "accept" \| "decline" }`                                                                                            |
| `ping`   | `{ t }` para medir latência                                                                                                               |

**Servidor → cliente**

| Mensagem  | Conteúdo                                                                                |
| --------- | --------------------------------------------------------------------------------------- |
| `welcome` | Papel atribuído (`white` / `black` / `spectator`), token do assento e snapshot completo |
| `state`   | Snapshot após qualquer mudança                                                          |
| `error`   | `{ code, message }`, por exemplo um lance ilegal ou fora da vez                         |
| `pong`    | Resposta ao `ping`                                                                      |

**Snapshot** = código, regras, FEN inicial, lances (UCI e SAN), FEN atual, vez, se está em xeque, status, resultado, relógio, `serverNow`, jogadores (nome e se estão conectados) e oferta de empate pendente.

**UI otimista:** o cliente valida com o `core`, move a peça na hora e só desfaz se o servidor rejeitar.

## Relógio

- **O servidor é dono do relógio.** Ele guarda o tempo restante de cada lado e o instante em que o turno atual começou.
- **Nada fica "tiquetaqueando":** o tempo vai junto com cada lance, e o cliente só exibe a contagem regressiva. Uma sala ociosa custa zero.
- **Fim de tempo:** um alarme é agendado para o instante exato em que o relógio zeraria. O tempo também é verificado a cada lance recebido.
- **Início:** o relógio só começa a correr depois do primeiro lance de cada lado, como no Lichess.
- **Incremento Fischer:** é somado depois do lance.
- Todas as funções do relógio são puras e testáveis (`clock.ts`).

## Regras customizáveis

Três níveis. O schema foi desenhado pensando no nível 3, mas a entrega começa pelos níveis 1 e 2.

**Nível 1: opções da sala**

| Campo             | Valores                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `variant`         | `chess` (padrão) e as variantes do nível 2                                 |
| `timeControl`     | `unlimited` ou `fischer` (10 s a 3 h, incremento de 0 a 180 s). Padrão 5+3 |
| `creatorColor`    | `white`, `black` ou `random`                                               |
| `allowSpectators` | `true` / `false`                                                           |
| `initialFen`      | Posição inicial personalizada (só no xadrez padrão)                        |
| `theme`           | Tema visual do tabuleiro                                                   |

**Nível 2: variantes conhecidas (via chessops)**

Chess960, Rei da Colina, Três Xeques, Atômico, Antichess, Crazyhouse, Horde e Racing Kings.

**Nível 3: regras inventadas pelo usuário (futuro)**

O criador monta as regras numa interface (peças, movimentos, condição de vitória). O app gera um arquivo de configuração do Fairy-Stockfish e o ffish.js (WebAssembly) valida os lances no cliente e no servidor. De quebra, existe um bot que joga a variante inventada.

**Simplificações atuais**

- Repetição tripla e regra dos 75 lances encerram a partida automaticamente, em vez de exigirem reivindicação.

> Escrever um motor de regras próprio é tentador, mas é onde projetos pessoais morrem. Ficamos com bibliotecas maduras.

## Frontend 3D

**Princípio:** a cena é uma projeção do estado do store. Por isso existe também um **tabuleiro 2D alternativo**, para acessibilidade e celulares fracos.

**Performance**

- `frameloop="demand"`: renderiza só quando algo muda, porque xadrez fica parado 95% do tempo.
- Peças em GLTF low/mid-poly com compressão Draco ou meshopt, e instancing por tipo de peça.
- Sombras assadas (`AccumulativeShadows` / `ContactShadows`) e iluminação por HDRI. Pós-processamento com moderação.
- Nada de criar objetos dentro do `useFrame`. Geometrias e materiais são descartados quando saem de uso.

**Interação**

- Raycast nas casas, com clique-clique e arrastar (projetando o cursor num plano na altura do tabuleiro).
- Destaque de lances legais e do último lance.
- Animação da peça em arco (sobe, desliza, desce).
- Câmera orbital com limites, que gira automaticamente para o lado das pretas.
- Respeito a `prefers-reduced-motion`.

**Direção de arte:** escolher _uma_ identidade e ir até o fim. Opções em discussão:

- peças esculpidas em mármore e latão, num estúdio escuro;
- diorama low-poly estilizado;
- visual brutalista monocromático.

O tema também pode ser uma opção da sala.

**Som:** madeira no lance e tons diferentes para captura e xeque.

## Fluxo de UX

1. **Home:** "Criar sala" e "Entrar com código".
2. **Criar sala:** formulário de regras com preview ao vivo do tabuleiro.
3. **Lobby:** código em destaque, botão de copiar link, QR code, escolha de cor e lista de espectadores.
4. **Partida:** relógios, lista de lances, oferecer empate, desistir, chat rápido.
5. **Fim:** resultado, revanche com um clique (cores invertidas), replay lance a lance e download do PGN.

**Previews de link:** ao compartilhar no WhatsApp, aparece algo como "Sala K7P-2QX · Rei da Colina · 5+3".

## Custo zero

| Peça                          | Serviço                                                                             | Custo    |
| ----------------------------- | ----------------------------------------------------------------------------------- | -------- |
| Salas em tempo real           | Cloudflare Durable Objects (SQLite), plano Free                                     | Grátis   |
| Frontend                      | Cloudflare Pages/Workers (ou Vercel Hobby, que permite uso pessoal e não comercial) | Grátis   |
| Histórico de partidas         | SQLite dos Durable Objects ou D1                                                    | Grátis   |
| Bot, 3D, validação no cliente | Rodam no navegador do jogador                                                       | Grátis   |
| Assets                        | Blender, HDRIs e texturas CC0 (Poly Haven), sons CC0, Google Fonts                  | Grátis   |
| Domínio próprio               | Opcional; o subdomínio gratuito (`*.workers.dev`, `*.pages.dev`) atende             | Opcional |

**Limites do plano gratuito dos Durable Objects:** 100.000 requisições por dia (incluindo mensagens de WebSocket), 13.000 GB-s de duração por dia e 5 GB de armazenamento por conta. Uma partida gera algumas centenas de mensagens, então cabem centenas de partidas por dia.

**Sem fatura surpresa:** no plano Free, ao passar de um limite, as operações falham com erro até o reset diário (00:00 UTC). Nunca há cobrança.

**Cuidados para continuar no gratuito**

1. Usar WebSocket com hibernação (o PartyServer já faz isso).
2. Não enviar "tique" do relógio. O tempo vai junto com os lances, e um alarme único detecta o fim de tempo.
3. Fazer o deploy do PartyServer na própria conta Cloudflare.
4. Expirar salas inativas para manter o armazenamento limpo.
5. Evitar Supabase para o histórico: até onde sabemos, projetos gratuitos são pausados após um período sem uso, o que atrapalha uma demo aberta meses depois.

## Roadmap

1. **Core e tabuleiro 2D local:** chessops, schema das regras com Zod, testes com Vitest (incluindo testes _perft_).
2. **Salas online:** PartyServer, códigos, reconexão e relógio. Teste com Playwright em dois navegadores.
3. **Cena 3D** substituindo o 2D, que continua como alternativa.
4. **Variantes e regras customizadas** (níveis 1 e 2).
5. **Polimento:** espectadores, replay, sons, previews de link.
6. **Extras:** bot com Stockfish em WASM num Web Worker e o editor de variantes (nível 3).

**Para o portfólio:** demo publicada, README com diagrama, ADRs curtos e um GIF da partida.

## Licenças

O **chessops** e o **Fairy-Stockfish/ffish.js** são **GPL-3.0**. Para um projeto aberto de portfólio isso não é problema, mas o repositório deve ser publicado sob licença compatível (GPL-3.0).

## Decisões registradas (ADRs resumidos)

| #   | Decisão                                         | Motivo                                                                                                          |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 001 | Servidor autoritativo                           | Impede trapaça e dessincronização; o cliente só pede lances                                                     |
| 002 | Durable Objects (via PartyServer) para as salas | "Uma sala = um objeto" encaixa no modelo de código de sala; sem servidor para operar; plano gratuito suficiente |
| 003 | Lógica de jogo num pacote `core` compartilhado  | Mesmo código valida no cliente (UX instantânea) e no servidor (verdade)                                         |
| 004 | Regras como dados validados com Zod             | Cliente e servidor nunca discordam; prepara o terreno para regras inventadas                                    |
| 005 | Estado = regras + posição inicial + lances      | Reconexão, espectadores, replay e PGN derivados do mesmo registro                                               |
| 006 | chessops agora, Fairy-Stockfish depois          | Bibliotecas maduras em vez de motor próprio; Fairy-Stockfish só quando houver regras inventadas                 |
| 007 | Relógio no servidor, sem tiques                 | Justo, barato e sem mensagens enquanto ninguém joga                                                             |
| 008 | Identidade por token de assento, sem login      | Zero atrito para entrar numa sala; login fica opcional                                                          |
| 009 | Cena 3D como projeção do estado                 | Permite tabuleiro 2D alternativo e mantém o 3D fora da lógica                                                   |
| 010 | Custo zero na Cloudflare                        | Projeto pessoal; o plano Free falha em vez de cobrar                                                            |
