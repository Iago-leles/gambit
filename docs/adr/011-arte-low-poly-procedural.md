# 011 — Arte low-poly, peças geradas por código

**Status:** Aceito

## Contexto

O 3D precisa rodar a 60 fps parado num celular médio. O site é servido como assets estáticos de um Worker no plano gratuito. Mármore e latão pedem materiais PBR e HDRI, que pesam mais.

## Decisão

- Direção de arte: **low-poly estilizado**, com cores chapadas e sombreamento plano.
- As peças são geradas por código (`LatheGeometry`, extrusão e caixas). Não há arquivo de modelo.
- Luz simples (hemisférica e direcional) e `ContactShadows`. Sem HDRI.

## Consequências

- Zero bytes de modelo, textura ou HDRI. Não há asset externo para creditar.
- Um `InstancedMesh` por cor e tipo de peça: 12 chamadas de desenho para todas as peças.
- Trocar o visual depois mexe só em `components/scene/`.
- Draco e meshopt deixam de ser necessários. Se entrarem modelos GLTF no futuro, registrar fonte e licença (CC0) num arquivo de créditos.
