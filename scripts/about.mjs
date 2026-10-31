// Gera assets/about-dark.svg e assets/about-light.svg ("Sobre mim", fundo transparente).
// O README usa <picture> para mostrar a versão certa no tema escuro ou claro do GitHub.
// Uso: node scripts/about.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

const TITLE = "Sobre mim";
const SUBTITLE = "Conheça um pouco da minha trajetória, foco e o que me motiva a desenvolver.";
const PARAGRAPHS = [
  ["Sou desenvolvedor Full Stack com foco em Front-End e UI/UX,", "formado em Análise e Desenvolvimento de Sistemas (UNICID)."],
  ["Gosto de transformar ideias em experiências digitais, unindo", "código, design e performance para criar soluções modernas,", "intuitivas e com propósito."],
];
const CARDS = [
  ["monitor", "Foco em UI/UX", "Interfaces intuitivas e funcionais"],
  ["bolt", "Performance", "Sites rápidos e otimizados"],
  ["layers", "Visão completa", "Front-End e Back-End"],
  ["target", "Evolução constante", "Estudo e prática diária"],
];

const THEMES = {
  dark: { text: "#FFFFFF", muted: "#C9D1D9", dim: "#8B98AE", card: "#0A1424", edge: "#1C4A86", divider: "#1F2A3C", blue: "#3B9EFF" },
  light: { text: "#0D1117", muted: "#424A53", dim: "#57606A", card: "#F6F8FA", edge: "#C9DAF2", divider: "#D0D7DE", blue: "#1F6FEB" },
};

const W = 1752, H = 440;
const FONT = `'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ICON = {
  user: (c) => `<g fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4.2"/><path d="M4.5 21v-1.2c0-3.3 2.7-5.8 6-5.8h3c3.3 0 6 2.5 6 5.8V21z"/></g>`,
  bars: (c) => `<g fill="${c}"><rect x="3" y="11" width="4" height="10" rx="1"/><rect x="10" y="4" width="4" height="17" rx="1"/><rect x="17" y="8" width="4" height="13" rx="1"/></g>`,
  monitor: (c) => `<g fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"><rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M9 21h6M12 16.5V21"/></g><rect x="5" y="6" width="14" height="8" rx="1" fill="${c}" fill-opacity=".35"/>`,
  bolt: (c) => `<path fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" d="M13.5 2L4.5 13.5h6.5L9.5 22l10-12.5h-6.5z"/>`,
  layers: (c) => `<g fill="${c}"><path d="M12 2.5l9 4.2-9 4.2-9-4.2z"/><path d="M3 11.2l2.4-1.1L12 13.2l6.6-3.1 2.4 1.1-9 4.2z" fill-opacity=".8"/><path d="M3 15.7l2.4-1.1L12 17.7l6.6-3.1 2.4 1.1-9 4.2z" fill-opacity=".6"/></g>`,
  target: (c) => `<g fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="13" r="8.5"/><circle cx="11" cy="13" r="4.5"/><path d="M11 13l8-8M16 5h3v3"/></g><circle cx="11" cy="13" r="1.6" fill="${c}"/>`,
};
const icon = (name, color, cx, cy, size) => `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 24})">${ICON[name](color)}</g>`;

function build(t) {
  let b = "";
  // cabeçalho
  b += `<g class="in"><rect x="73" y="22" width="102" height="100" rx="22" fill="url(#ib)" stroke="#2F7BEA" stroke-opacity=".7" stroke-width="1.5"/>`;
  b += icon("user", "#5EB1FF", 124, 72, 52);
  b += `<text x="198" y="74" font-size="46" font-weight="800" fill="${t.text}" letter-spacing="-0.5">${TITLE}</text>`;
  b += `<text x="199" y="112" font-size="25" fill="${t.muted}">${esc(SUBTITLE)}</text></g>\n`;

  // texto
  let y = 210;
  b += `<g class="in" style="animation-delay:.12s">`;
  PARAGRAPHS.forEach((p, i) => {
    p.forEach((line) => { b += `<text x="72" y="${y}" font-size="25" fill="${t.muted}">${esc(line)}</text>`; y += 35; });
    if (i < PARAGRAPHS.length - 1) y += 29;
  });
  b += `</g>\n<path d="M856 152V402" stroke="${t.divider}" stroke-width="1.5"/>\n`;

  // diferenciais
  b += `<g class="in" style="animation-delay:.2s">${icon("bars", t.blue, 941, 169, 36)}<text x="980" y="182" font-size="34" font-weight="800" fill="${t.text}">Meus diferenciais</text></g>\n`;
  const pos = [[916, 210, 410], [1342, 210, 355], [916, 323, 410], [1342, 323, 355]];
  CARDS.forEach(([ic, title, desc], i) => {
    const [x, cy, w] = pos[i];
    b += `<g class="in" style="animation-delay:${(0.28 + i * 0.08).toFixed(2)}s"><rect x="${x}" y="${cy}" width="${w}" height="87" rx="20" fill="${t.card}" stroke="${t.edge}" stroke-width="1.5"/>`;
    b += icon(ic, t.blue, x + 49, cy + 44, 40);
    b += `<text x="${x + 99}" y="${cy + 37}" font-size="24" font-weight="700" fill="${t.text}">${esc(title)}</text>`;
    b += `<text x="${x + 99}" y="${cy + 69}" font-size="19" fill="${t.dim}">${esc(desc)}</text></g>\n`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">${TITLE}</title>
<desc id="d">${esc(PARAGRAPHS.flat().join(" "))} Meus diferenciais: ${CARDS.map((c) => `${c[1]} (${c[2]})`).join(", ")}.</desc>
<style>
text{font-family:${FONT}}
.in{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs><linearGradient id="ib" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E3E96"/><stop offset="1" stop-color="#0A1E44"/></linearGradient></defs>
${b}</svg>
`;
}

for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(DIR, `about-${name}.svg`), build(t));
  console.log("SVG gerado:", `about-${name}.svg`);
}
