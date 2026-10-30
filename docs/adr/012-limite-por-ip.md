# 012 — Limite de criação de sala por IP

**Status:** Aceito

## Contexto

`POST /api/rooms` era aberto. Quem quisesse podia criar milhares de salas e gastar as 100 mil requisições por dia dos Durable Objects no plano gratuito (ADR 010). Passou do limite, o jogo para até as 00:00 UTC.

A regra de origem (PR #7) não resolve. Pedidos sem o cabeçalho `Origin` (curl, scripts) passam por ela.

## Opções

1. **Binding de Workers Rate Limiting.** Não tem custo em requisições de Durable Object. Mas só aceita janelas de 10 ou 60 segundos, conta por ponto de presença da Cloudflare (não é global) e "pode passar do limite". Não dá um limite como "20 salas em 10 minutos" nem um `Retry-After` correto. Também é difícil de testar com o tempo.
2. **Contador num Durable Object por IP.** Preciso e global. A janela é a que a gente escolher. Custa 1 requisição de Durable Object por criação de sala. A lógica fica pura e testável.
3. **Regra de rate limiting no painel da Cloudflare (WAF).** O plano gratuito só tem janela de 10 segundos e bloqueio de 10 segundos. Não fica no código e não tem teste.

## Decisão

Opção 2. Cada IP tem um Durable Object `RateLimiter`, com janela fixa: até **20 salas por 10 minutos**. Passou, o servidor responde `429` com o cabeçalho `Retry-After` e o corpo `{"error":"rate_limited","retryAfterSeconds":N}`.

- A conta é uma função pura com relógio injetado (`apps/server/src/rate-limit.ts`). O Durable Object só guarda o estado e apaga tudo num alarme quando a janela acaba.
- A ordem no servidor: origem (403), tamanho (413), regras (400), limite (429). Só conta pedido que de fato vai criar sala. Origem recusada e regras inválidas não contam. Por isso o POST de teste do deploy (regras inválidas, espera 400) nunca vira 429.
- O IP vem de `CF-Connecting-IP`. Sem ele (desenvolvimento e testes) todos dividem a chave de reserva `no-ip`.
- A resposta 429 leva os cabeçalhos CORS da origem permitida, para o site conseguir ler o erro.
- Os valores ficam em `vars` do `wrangler.jsonc`: `RATE_LIMIT_MAX_ROOMS` e `RATE_LIMIT_WINDOW_SECONDS`.
- Os testes de integração e o E2E criam muitas salas do mesmo IP. Eles sobem o Worker com `RATE_LIMIT_MAX_ROOMS` alto. O teste do limite usa valores próprios e curtos.

## Consequências

- Cada criação de sala gasta 1 requisição extra de Durable Object. Um pedido recusado também gasta 1. O limite protege contra um IP, não contra uma botnet.
- Janela fixa permite até o dobro do máximo na virada da janela. É aceitável aqui.
- Quem divide um IP (escola, empresa) divide também a cota. 20 por 10 minutos é folgado para isso.
- Este limite não impede que o Worker receba o pedido. Os pedidos ao Worker têm a própria cota diária de 100 mil. Se isso virar problema, o passo seguinte é uma regra de WAF no painel.
