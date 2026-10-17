# Deploy na Cloudflare

Tudo roda no plano gratuito (ADR 010). São dois Workers:

| App           | Worker          | O que é                                               |
| ------------- | --------------- | ----------------------------------------------------- |
| `apps/server` | `gambit-server` | API de criação de sala e os Durable Objects das salas |
| `apps/web`    | `gambit-web`    | O site (Next.js, pelo OpenNext)                       |

## Como o deploy acontece

O deploy é **automático**. Quando um PR entra na `main`, o workflow `.github/workflows/deploy.yml` publica o servidor e depois o site. Leva uns 3 minutos. Também dá para rodar pelo botão "Run workflow", na aba Actions do GitHub.

Ele testa o resultado no ar: o servidor deve responder `400` a regras inválidas, e o site deve abrir com o texto "Gambit". Se algo falhar, a versão anterior continua no ar.

Os comandos manuais mais abaixo servem para o servidor, ou para quem usa Linux ou WSL. No Windows, o site só publica pelo GitHub (veja "Windows").

## Configurar o deploy automático (uma vez só)

O GitHub precisa de permissão para publicar na sua conta da Cloudflare.

1. **Criar o token.** No painel da Cloudflare: My Profile, API Tokens, Create Token. Use o modelo **Edit Cloudflare Workers**.
2. **Pegar o ID da conta.** Rode `pnpm --filter @gambit/server exec wrangler whoami`. O ID aparece na tabela.
3. **Guardar no GitHub.** No repositório: Settings, Secrets and variables, Actions, New repository secret. Crie dois segredos:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

Cole o token só nesse campo do GitHub. Nunca em chat, issue ou commit.

Sem os segredos, o workflow falha logo no início, com uma mensagem dizendo qual está faltando.

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

O build do site com OpenNext **não funciona de forma confiável no Windows**, mesmo com permissão de administrador ou com o Modo Desenvolvedor ligado:

- Sem permissão, ele falha com `EPERM` ao criar links simbólicos.
- Com permissão, ele falha mais adiante, com `Acesso negado` ao ler as pastas ligadas por link.

O OpenNext avisa isso na própria saída ("not fully compatible with Windows"). Por isso o site é publicado pelo GitHub, que roda no Linux. O mesmo build roda a cada PR no job `cloudflare-build` do CI.

Quem quiser publicar da própria máquina precisa do WSL. Clone o repositório dentro do Ubuntu, fora de `/mnt/c`, e rode os mesmos comandos de lá.

O servidor não tem esse problema e pode ser publicado do Windows.

## Limites do plano gratuito

- 100.000 requisições por dia nos Durable Objects, contando as mensagens de WebSocket.
- Passou do limite, as operações falham até as 00:00 UTC. Nunca há cobrança.
- Salas inativas por 24 horas apagam o próprio armazenamento.

## Pendente

- Restringir o CORS do servidor à origem do site. Hoje aceita qualquer origem (`*`).
- Limite de uso por IP em `POST /api/rooms`.
