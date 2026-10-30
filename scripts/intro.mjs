// Gera assets/intro.svg (apresentação no topo do README).
// Uso: node scripts/intro.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = process.env.OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "intro.svg");

const TEXT = [
  "Desenvolvedor Full Stack com foco em Front-End e UI/UX. Gosto de transformar ideias em",
  "interfaces intuitivas, funcionais e visualmente consistentes.",
];
const CHIPS = [
  ["pin", "São Paulo, SP"],
  ["cap", "Pós-graduando em Inteligência Artificial"],
  ["bag", "Freelancer de sites e sistemas"],
];
const BUTTON = "Ver portfólio";

const W = 1530, H = 272;
const C_EDGE = "#1F2633", C_TEXT = "#F3F4F6", C_MUTED = "#C9D1D9", ACCENT = "#5EB1FF";

const ICON = {
  user: `<g fill="#FFFFFF"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z"/></g>`,
  pin: `<path fill="${ACCENT}" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z"/>`,
  cap: `<g fill="${ACCENT}"><path d="M12 3L1 8.5 12 14l9-4.5V16h2V8.5z"/><path d="M5.5 12.2V16c0 1.9 2.9 3.5 6.5 3.5s6.5-1.6 6.5-3.5v-3.8L12 15.5z"/></g>`,
  bag: `<g fill="none" stroke="${ACCENT}" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/></g>`,
};

let chips = "";
let cx = 55;
CHIPS.forEach(([icon, label], i) => {
  const w = 62 + label.length * 8.3;
  chips += `<g class="in" style="animation-delay:${(0.2 + i * 0.08).toFixed(2)}s"><rect x="${cx}" y="190" width="${w.toFixed(0)}" height="46" rx="23" fill="#161B24" stroke="${C_EDGE}"/>
<g transform="translate(${cx + 16} 202) scale(0.9167)">${ICON[icon]}</g>
<text x="${cx + 46}" y="219" font-size="17" font-weight="500" fill="${C_MUTED}">${label}</text></g>\n`;
  cx += w + 10;
});

const bw = 70 + BUTTON.length * 10.5;
const bx = W - 55 - bw;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Sobre mim</title>
<desc id="d">${TEXT.join(" ")} ${CHIPS.map((c) => c[1]).join(". ")}.</desc>
<style>
text{font-family:'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif}
.in{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<rect width="${W}" height="${H}" rx="28" fill="#0D1117"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.06"/>
<g class="in">
<rect x="55" y="38" width="49" height="48" rx="11" fill="#1B2440"/>
<g transform="translate(66.5 49) scale(1.083)">${ICON.user}</g>
<text x="128" y="70" font-size="23" font-weight="700" fill="${C_TEXT}">Sobre mim</text>
${TEXT.map((l, i) => `<text x="55" y="${122 + i * 30}" font-size="20" fill="${C_MUTED}">${l}</text>`).join("\n")}
<rect x="${bx.toFixed(0)}" y="38" width="${bw.toFixed(0)}" height="50" rx="25" fill="#FFFFFF"/>
<text x="${(bx + 26).toFixed(0)}" y="69" font-size="17" font-weight="700" fill="#0D1117">${BUTTON}</text>
<path d="M${(bx + bw - 38).toFixed(0)} 71l9-9M${(bx + bw - 38).toFixed(0)} 62h9v9" fill="none" stroke="#0D1117" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</g>
${chips}</svg>
`;

writeFileSync(OUT, svg);
console.log("SVG gerado:", OUT);
