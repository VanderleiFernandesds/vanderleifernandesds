# Banner animado (efeito GradientASCII)

O GitHub não executa JavaScript no README, então o efeito é gravado em uma WebP animada.

1. `node scripts/banner.mjs` gera `assets/profile-banner.svg` (texto do banner).
2. Monte uma página com: o trecho de constantes, shaders e funções auxiliares de `GradientASCII.jsx` (linhas 5 a 422), `runner.js`, um `<canvas>` de 1530x440 e o SVG do banner por cima, sem o fundo.
   Opções usadas: `colors: ['#0b1a5c','#1e3fd8','#3b82f6','#38bdf8']`, `gradientOpacity: 0.75`, `glyphOpacity: 0.75`, `glow: 0.2`, forma `horizon`,
   com um véu escuro radial atrás do texto para manter a leitura.
3. Grave os quadros com Playwright chamando `fx.renderAt(t)` (20 fps, 9 s), faça o loop misturando o último 1 s com o primeiro
   e exporte em WebP a 10 fps, qualidade 65 (`assets/profile-banner.webp`).
