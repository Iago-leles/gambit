# 001 — Servidor autoritativo

**Status:** Aceito

## Contexto

Num jogo online, se cada cliente decidir o estado, é fácil trapacear. Também é fácil os dois lados ficarem com posições diferentes.

## Decisão

O servidor é a fonte da verdade. O cliente só _pede_ um lance. O servidor valida, aplica e avisa todos os conectados.

## Consequências

- Não dá para fazer lance ilegal nem jogar fora da vez.
- Os dois jogadores sempre veem o mesmo estado.
- Para não parecer lento, o cliente usa UI otimista: move a peça na hora e desfaz se o servidor rejeitar.
