# 002 — Durable Objects (via PartyServer) para as salas

**Status:** Aceito

## Contexto

Cada sala precisa de estado em memória, WebSocket e um lugar único que decide. Manter um processo Node rodando o tempo todo custa dinheiro e exige operação.

## Decisão

Uma sala é um Durable Object da Cloudflare. O código da sala é o nome do objeto. Usamos o PartyServer por cima, para ter salas, WebSocket com hibernação e roteamento prontos.

## Consequências

- Não existe tabela de salas nem Redis. O código já endereça o objeto.
- Cada sala tem seu próprio SQLite.
- Salas paradas hibernam e não consomem duração.
- Ficamos presos ao modelo da Cloudflare.

Alternativas avaliadas:

- **Colyseus:** precisa de um processo Node rodando o tempo todo.
- **Socket.IO direto:** obrigaria reimplementar salas e reconexão.
- **Supabase Realtime:** não resolve o servidor autoritativo.
