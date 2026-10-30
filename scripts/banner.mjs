// Gera assets/profile-banner.svg (topo do README).
// Uso: node scripts/banner.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = process.env.OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "profile-banner.svg");

const W = 1530, H = 440;
const ACCENT = "#3B82F6", ACCENT_L = "#5EB1FF";
const C_EDGE = "#1F2633", C_TEXT = "#F3F4F6", C_MUTED = "#C9D1D9", C_DIM = "#8B94A7";
const FONT = `'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif`;

const ICON = {
  book: `<g fill="none" stroke="${ACCENT_L}" stroke-width="2.2" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></g>`,
  pin: `<path fill="${ACCENT_L}" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z"/>`,
  cap: `<g fill="${ACCENT_L}"><path d="M12 3L1 8.5 12 14l9-4.5V16h2V8.5z"/><path d="M5.5 12.2V16c0 1.9 2.9 3.5 6.5 3.5s6.5-1.6 6.5-3.5v-3.8L12 15.5z"/></g>`,
  bag: `<g fill="none" stroke="${ACCENT_L}" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/></g>`,
};

const CHIPS = [["pin", "São Paulo, SP"], ["book", "ADS · UNICID"], ["cap", "Pós-graduando em IA"], ["bag", "Freelancer"]];

const chipW = CHIPS.map(([, l]) => 66 + l.length * 9.9);
let chips = "", cx = (W - (chipW.reduce((a, b) => a + b, 0) + 12 * (CHIPS.length - 1))) / 2;
CHIPS.forEach(([icon, label], i) => {
  const w = chipW[i];
  chips += `<g class="in" style="animation-delay:${(0.45 + i * 0.08).toFixed(2)}s"><rect x="${cx.toFixed(1)}" y="330" width="${w.toFixed(0)}" height="48" rx="24" fill="#161B24" stroke="${C_EDGE}"/>
<g transform="translate(${(cx + 17).toFixed(1)} 343) scale(0.9167)">${ICON[icon]}</g>
<text x="${(cx + 48).toFixed(1)}" y="361" font-size="18" font-weight="500" fill="${C_MUTED}">${label}</text></g>\n`;
  cx += w + 12;
});

// rede decorativa à direita
const nodes = [[42, 90], [119, 150], [77, 260], [175, 70], [210, 210], [49, 395], [140, 360], [203, 395], [1488, 90], [1411, 150], [1453, 260], [1355, 70], [1320, 210], [1481, 395], [1390, 360], [1327, 395]];
const edges = [[0, 1], [1, 2], [1, 3], [3, 4], [2, 4], [2, 5], [5, 6], [6, 7], [4, 6],
  [8, 9], [9, 10], [9, 11], [11, 12], [10, 12], [10, 13], [13, 14], [14, 15], [12, 14]];
const net = edges.map(([a, b]) => `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}"/>`).join("");
const dots = nodes.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 3.5 : 4.5}"${i % 4 === 2 ? ' class="pulse"' : ""}/>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Vanderlei Fernandes, Full Stack Developer</title>
<desc id="d">Desenvolvedor Full Stack com foco em Front-End e UI/UX. São Paulo, SP. Análise e Desenvolvimento de Sistemas, UNICID. Pós-graduando em IA. Freelancer.</desc>
<style>
text{font-family:${FONT}}
.in{animation:rise .8s cubic-bezier(.2,.7,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.pulse{animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
  <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#FFFFFF" fill-opacity="0.05"/></pattern>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="#0D1117"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  <g stroke="#26324A" stroke-width="1.5">${net}</g>
  <g fill="#3A4A6B">${dots}</g>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.06"/>

<g class="in" style="animation-delay:.05s">
  <rect x="${W / 2 - 150}" y="58" width="300" height="44" rx="22" fill="${ACCENT}" fill-opacity="0.12" stroke="${ACCENT}" stroke-opacity="0.5"/>
  <circle cx="${W / 2 - 124}" cy="80" r="5" fill="${ACCENT_L}" class="pulse"/>
  <text x="${W / 2 + 9}" y="86.5" text-anchor="middle" font-size="17" font-weight="700" letter-spacing="1.2" fill="${ACCENT_L}">FULL STACK DEVELOPER</text>
</g>
<g class="in" style="animation-delay:.15s">
  <text x="${W / 2}" y="200" text-anchor="middle" font-size="84" font-weight="800" letter-spacing="-2.5" fill="#FFFFFF">Vanderlei Fernandes</text>
</g>
<g class="in" style="animation-delay:.3s">
  <text x="${W / 2}" y="258" text-anchor="middle" font-size="28" font-weight="600" fill="${C_TEXT}">Foco em Front-End e UI/UX</text>
  <text x="${W / 2}" y="298" text-anchor="middle" font-size="21" fill="${C_DIM}">Transformando ideias em experiências digitais.</text>
</g>
${chips}

</svg>
`;

writeFileSync(OUT, svg);
console.log("SVG gerado:", OUT);

// Botões de contato (um SVG por botão, para cada um ter seu link no README)
const BTN_ICON = {
  arrow: (c) => `<path d="M2 14L14 2M5 2h9v9" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  linkedin: (c) => `<path fill="${c}" transform="scale(0.667)" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/>`,
  mail: (c) => `<g fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"><rect x="1" y="2" width="14" height="12" rx="2.5"/><path d="M1.8 3.5L8 8.5l6.2-5"/></g>`,
};
const BUTTONS = [
  { file: "btn-portfolio.svg", label: "Ver portfólio", icon: "arrow", iconRight: true, bg: "#FFFFFF", fg: "#0D1117", stroke: "#FFFFFF" },
  { file: "btn-linkedin.svg", label: "LinkedIn", icon: "linkedin", bg: "#0A66C2", fg: "#FFFFFF", stroke: "#0A66C2" },
  { file: "btn-email.svg", label: "E-mail", icon: "mail", bg: "#0D1117", fg: "#F3F4F6", stroke: "#2A3242" },
];
for (const b of BUTTONS) {
  const h = 56, tw = b.label.length * 9.4;
  const w = Math.round(28 + 16 + 12 + tw + 28);
  const textX = b.iconRight ? 28 : 28 + 16 + 12;
  const iconX = b.iconRight ? 28 + tw + 12 : 28;
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${b.label}">
<style>text{font-family:${FONT}}</style>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${(h - 2) / 2}" fill="${b.bg}" stroke="${b.stroke}" stroke-width="1.5"/>
<g transform="translate(${iconX.toFixed(1)} ${h / 2 - 8})">${BTN_ICON[b.icon](b.fg)}</g>
<text x="${textX.toFixed(1)}" y="${h / 2 + 6.5}" font-size="18" font-weight="700" fill="${b.fg}">${b.label}</text>
</svg>
`;
  writeFileSync(join(dirname(OUT), b.file), out);
  console.log("SVG gerado:", b.file);
}
