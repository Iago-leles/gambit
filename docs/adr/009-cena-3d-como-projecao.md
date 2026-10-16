# 009 — Cena 3D como projeção do estado

**Status:** Aceito

## Contexto

Se a cena 3D guardar estado de jogo, ela vira uma segunda fonte da verdade. Também fica difícil oferecer uma versão 2D.

## Decisão

A cena 3D só lê o store (Zustand) e anima as transições. Ela nunca guarda a verdade.

## Consequências

- Existe um tabuleiro 2D alternativo, para acessibilidade e celulares fracos.
- A lógica pode ser construída e testada antes do 3D.
- Trocar a direção de arte não mexe na lógica.
