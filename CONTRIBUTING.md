# Como trabalhamos

## Fluxo

1. Crie uma branch a partir da `main`.
2. Abra um PR. O CI precisa passar.
3. O merge é sempre **squash**. O título do PR vira o commit na `main`.
4. A branch é apagada depois do merge.

A `main` é protegida: não aceita push direto nem force push.

## Nomes de branch

`tipo/descricao-curta`. Exemplos:

- `feat/servidor-salas`
- `fix/relogio-incremento`
- `chore/ci-cache`
- `docs/adr-011`

## Título do PR

Segue [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em português:

```
feat(server): criação de sala e assentos (Fase 2a)
```

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.
Escopos: `core`, `web`, `server`, `docs`.

## Antes de abrir o PR

```bash
pnpm check
```

Roda typecheck, lint, formatação e testes. É o mesmo que o CI roda.

Mexeu em algo que o jogador vê? Rode também o E2E:

```bash
pnpm test:e2e
```

Ele sobe o servidor (porta 8788) e o web (porta 3100) sozinho, e joga com dois navegadores. Na primeira vez, instale o Chromium com `pnpm exec playwright install chromium`.

## Testes

Código novo nasce com teste escrito antes (TDD). O `core` é a parte mais testada do projeto.

## Decisões

Mudou uma decisão de arquitetura? Crie um ADR novo em `docs/adr/` e marque o antigo como substituído.
