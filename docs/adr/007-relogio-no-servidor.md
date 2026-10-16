# 007 — Relógio no servidor, sem tiques

**Status:** Aceito

## Contexto

O relógio precisa ser justo e não pode depender do cliente. Mandar um "tique" por segundo gasta requisições do plano gratuito e impede a hibernação.

## Decisão

O servidor guarda o tempo restante de cada lado e o instante em que o turno começou. O tempo vai junto com cada lance. Um alarme único é agendado para o instante em que o relógio zeraria.

## Consequências

- Uma sala parada não gera mensagens nem custo.
- O cliente só exibe a contagem regressiva, a partir de `serverNow`.
- As funções do relógio são puras e testáveis com `now` injetado.
