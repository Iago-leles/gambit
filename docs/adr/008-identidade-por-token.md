# 008 — Identidade por token de assento, sem login

**Status:** Aceito

## Contexto

Pedir login para jogar uma partida rápida afasta as pessoas. Mas o jogador precisa recuperar o assento se a conexão cair.

## Decisão

Cada assento (brancas ou pretas) tem um token secreto, guardado no `localStorage`. Quem reconecta com o token recupera o assento. Quem chega sem token ocupa o assento livre ou vira espectador.

## Consequências

- Zero atrito para entrar numa sala.
- Trocar de navegador ou de aparelho perde o assento.
- Login (GitHub/Google) pode vir depois, ligado aos tokens.
