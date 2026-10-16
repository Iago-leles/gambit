# 006 — chessops agora, Fairy-Stockfish depois

**Status:** Aceito

## Contexto

Escrever um motor de regras de xadrez é longo e cheio de casos especiais. É onde projetos pessoais morrem.

## Decisão

Usamos o chessops (a biblioteca do Lichess) para o xadrez padrão e as variantes conhecidas. O Fairy-Stockfish (ffish.js) só entra quando houver regras inventadas pelo usuário.

## Consequências

- Regras corretas desde o início, conferidas com testes perft.
- O chessops é GPL-3.0. O repositório também precisa ser GPL-3.0.
- O chessops não detecta repetição tripla sozinho. A classe `Game` cuida disso.
