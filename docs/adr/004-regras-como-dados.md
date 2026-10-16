# 004 — Regras como dados validados com Zod

**Status:** Aceito

## Contexto

Cada sala tem suas regras: variante, tempo, cor, espectadores. No futuro, regras inventadas pelo usuário. Cliente e servidor precisam concordar sobre elas.

## Decisão

Tudo o que muda a forma de jogar vive num schema Zod (`RoomRules`). O mesmo schema valida o formulário no cliente e a criação da sala no servidor. As mensagens do protocolo também são schemas Zod.

## Consequências

- Os tipos TypeScript saem do schema. Não há tipo duplicado.
- Entrada inválida é rejeitada na borda, antes de chegar na lógica.
- O schema foi pensado para crescer até o nível 3 (regras inventadas).
