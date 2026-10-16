# 010 — Custo zero na Cloudflare

**Status:** Aceito

## Contexto

É um projeto pessoal de portfólio. A demo precisa continuar no ar por meses sem gerar conta.

## Decisão

Tudo roda no plano Free da Cloudflare: Workers, Durable Objects (SQLite) e D1. Bot, 3D e validação no cliente rodam no navegador do jogador.

## Consequências

- No plano Free, passar do limite faz as operações falharem até o reset diário. Nunca há cobrança.
- Precisamos de hibernação, relógio sem tiques e expiração de salas inativas.
- Evitamos serviços que pausam projetos gratuitos parados (como o Supabase).
