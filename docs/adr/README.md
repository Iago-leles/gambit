# Decisões de arquitetura (ADRs)

Cada arquivo registra uma decisão: o contexto, o que foi decidido e as consequências.

Quando uma decisão mudar, não apague o ADR antigo. Marque como "Substituído por NNN" e crie um novo.

| #                                             | Decisão                                         | Status |
| --------------------------------------------- | ----------------------------------------------- | ------ |
| [001](001-servidor-autoritativo.md)           | Servidor autoritativo                           | Aceito |
| [002](002-durable-objects-partyserver.md)     | Durable Objects (via PartyServer) para as salas | Aceito |
| [003](003-core-compartilhado.md)              | Lógica de jogo num pacote `core` compartilhado  | Aceito |
| [004](004-regras-como-dados.md)               | Regras como dados validados com Zod             | Aceito |
| [005](005-estado-como-lances.md)              | Estado = regras + posição inicial + lances      | Aceito |
| [006](006-chessops-depois-fairy-stockfish.md) | chessops agora, Fairy-Stockfish depois          | Aceito |
| [007](007-relogio-no-servidor.md)             | Relógio no servidor, sem tiques                 | Aceito |
| [008](008-identidade-por-token.md)            | Identidade por token de assento, sem login      | Aceito |
| [009](009-cena-3d-como-projecao.md)           | Cena 3D como projeção do estado                 | Aceito |
| [010](010-custo-zero-cloudflare.md)           | Custo zero na Cloudflare                        | Aceito |
