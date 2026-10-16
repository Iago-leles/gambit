# 005 — Estado = regras + posição inicial + lances

**Status:** Aceito

## Contexto

Reconexão, espectadores, replay e PGN precisam do estado da partida. Guardar o estado de várias formas abre espaço para inconsistência.

## Decisão

A partida é guardada como: regras + posição inicial (FEN) + lista de lances (UCI). Todo o resto é derivado ao reaplicar os lances.

## Consequências

- Reconexão e espectadores recebem o mesmo snapshot.
- Replay e PGN saem quase de graça.
- Reaplicar lances custa um pouco de CPU. Para partidas de xadrez isso é desprezível.
