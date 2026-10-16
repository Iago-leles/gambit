# 003 — Lógica de jogo num pacote `core` compartilhado

**Status:** Aceito

## Contexto

O cliente precisa saber os lances legais na hora, sem esperar a rede. O servidor precisa validar tudo. Duas implementações iriam divergir.

## Decisão

Toda a lógica de jogo, regras, relógio e protocolo fica em `packages/core`. Cliente e servidor importam o mesmo código-fonte TypeScript.

## Consequências

- Uma regra corrigida vale para os dois lados ao mesmo tempo.
- O `core` não pode depender de nada do navegador nem do Worker. Precisa rodar nos dois ambientes.
- O `core` é a parte com mais testes do projeto.
