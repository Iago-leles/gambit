# Deploy na Cloudflare

Tudo roda no plano gratuito (ADR 010). São dois Workers:

| App           | Worker          | O que é                                               |
| ------------- | --------------- | ----------------------------------------------------- |
| `apps/server` | `gambit-server` | API de criação de sala e os Durable Objects das salas |
| `apps/web`    | `gambit-web`    | O site (Next.js, pelo OpenNext)                       |

## Endereços

- Servidor: `https://gambit-server.iago-leles.workers.dev`
- Site: `https://gambit-web.iago-leles.workers.dev` (depois do primeiro deploy)

## Antes de tudo

Entre na Cloudflare uma vez por máquina:

```bash
pnpm --filter @gambit/server exec wrangler login
```

## Servidor

```bash
pnpm --filter @gambit/server release
```

Não use `pnpm deploy`. É um comando do próprio pnpm e não roda o script do projeto. Por isso o script se chama `release`.

Teste depois do deploy:

```bash
curl -X POST https://gambit-server.iago-leles.workers.dev/api/rooms -H "content-type: application/json" -d "{}"
```

A resposta deve ser `201`, com `code` e `creatorToken`. No PowerShell, use `curl.exe` no lugar de `curl`.

## Site

O site precisa saber o endereço do servidor. Esse valor entra no código na hora do build. Ele fica em `apps/web/.env.production` e é público.

```bash
pnpm --filter @gambit/web release
```

Para ver o site no `workerd` local antes de publicar:

```bash
pnpm --filter @gambit/web preview
```

### Windows

O build do OpenNext cria links simbólicos. No Windows, isso dá o erro `EPERM` se o Modo Desenvolvedor estiver desligado. Há dois caminhos:

1. **Modo Desenvolvedor.** Ative em Configurações, Privacidade e segurança, Para desenvolvedores. Depois feche e abra o terminal.
2. **WSL.** Clone o repositório dentro do Ubuntu e rode os mesmos comandos de lá. Não use a pasta `/mnt/c`.

O CI roda o mesmo build no Linux a cada PR (job `cloudflare-build`). Se ele passa, a configuração está certa. Só o seu computador precisa da permissão.

## Limites do plano gratuito

- 100.000 requisições por dia nos Durable Objects, contando as mensagens de WebSocket.
- Passou do limite, as operações falham até as 00:00 UTC. Nunca há cobrança.
- Salas inativas por 24 horas apagam o próprio armazenamento.

## Pendente

- Restringir o CORS do servidor à origem do site. Hoje aceita qualquer origem (`*`).
- Limite de uso por IP em `POST /api/rooms`.
- Deploy automático pelo GitHub Actions, com um token da Cloudflare em segredo.
