// Gera os cards de projetos em assets/projects/ e o título da seção (versões tema escuro e claro).
// Uso: npm i --no-save simple-icons && node scripts/projects.mjs
// Para mudar os projetos, edite PROJECTS abaixo e rode de novo.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as si from "simple-icons";

const DIR = process.env.OUT_DIR || join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "projects");
const FONT = `'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TECH = {
  React: [si.siReact.path, "#61DAFB"],
  Tailwind: [si.siTailwindcss.path, "#38BDF8"],
  Vite: [si.siVite.path, "#A78BFA"],
  FastAPI: [si.siFastapi.path, "#14B8A6"],
  TypeScript: [si.siTypescript.path, "#3B8FE0"],
  "Framer Motion": [si.siFramer.path, "#C084FC"],
};

const PROJECTS = [
  {
    slug: "pichau-redesign", brand: "Pichau", name: "Pichau Redesign", accent: "#EF233C", deep: "#2A0509",
    desc: "Redesign da Pichau com foco em UI/UX, performance e experiência de compra mais fluida.",
    tech: ["React", "Tailwind", "Vite"], screen: "shop", prop: "headphones", logo: "cart",
  },
  {
    slug: "revoz", brand: "REVOZ", name: "REVOZ", accent: "#A855F7", deep: "#1B0830",
    desc: "Plataforma de narração, dublagem e transformação de vozes com recursos de áudio e edição.",
    tech: ["React", "FastAPI", "TypeScript"], screen: "wave", prop: "mic", logo: "mic",
  },
  {
    slug: "tech-jobs-map", brand: "Tech Jobs Map", name: "Tech Jobs Map", accent: "#2F8BFF", deep: "#06183A",
    desc: "Mapa interativo de empresas de tecnologia em SP, com filtros, busca e favoritos.",
    tech: ["React", "TypeScript", "Vite"], screen: "map", prop: "pin", logo: "pin",
  },
  {
    slug: "2pontos", brand: "2:pontos", name: "2:pontos", accent: "#8B7CFF", deep: "#140F38",
    desc: "Landing page institucional para criação de sites, com foco em design, conversão e identidade visual.",
    tech: ["React", "Tailwind", "Framer Motion"], screen: "landing", prop: "cursor", logo: null,
  },
];

const W = 420, H = 600;

function wrap(text, max) {
  const lines = []; let cur = "";
  for (const w of text.split(" ")) { if ((cur + " " + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}

const LOGO = {
  cart: (c) => `<path fill="${c}" d="M2 4h3l2.6 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6.3L5.6 5.2A1.6 1.6 0 0 0 4 4z"/><circle cx="10" cy="19.5" r="1.8" fill="${c}"/><circle cx="17" cy="19.5" r="1.8" fill="${c}"/>`,
  mic: (c) => `<rect x="8.5" y="2" width="7" height="12.5" rx="3.5" fill="${c}"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`,
  pin: (c) => `<path fill="${c}" d="M12 1.5a7.5 7.5 0 0 0-7.5 7.5c0 5.6 7.5 13.5 7.5 13.5s7.5-7.9 7.5-13.5A7.5 7.5 0 0 0 12 1.5zm0 10.3a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6z"/>`,
};

// conteúdo da tela do notebook (área 0..196 x 0..118)
function screen(kind, a) {
  if (kind === "shop") {
    return `<rect width="196" height="118" fill="#0B0B0F"/><rect width="196" height="12" fill="#16161C"/><rect x="6" y="4" width="22" height="4" rx="2" fill="${a}"/><rect x="120" y="4" width="70" height="4" rx="2" fill="#2A2A33"/>
<rect x="6" y="17" width="120" height="44" rx="4" fill="${a}" fill-opacity=".9"/><rect x="12" y="25" width="60" height="6" rx="2" fill="#fff"/><rect x="12" y="35" width="44" height="4" rx="2" fill="#fff" fill-opacity=".7"/><rect x="12" y="46" width="28" height="8" rx="3" fill="#0B0B0F"/>
<rect x="131" y="17" width="59" height="44" rx="4" fill="#1C1C24"/><circle cx="160" cy="37" r="12" fill="#2C2C38"/>
${[0, 1, 2, 3].map((i) => `<rect x="${6 + i * 47}" y="67" width="43" height="45" rx="4" fill="#1C1C24"/><rect x="${11 + i * 47}" y="72" width="33" height="20" rx="3" fill="#2C2C38"/><rect x="${11 + i * 47}" y="96" width="26" height="4" rx="2" fill="#3A3A48"/><rect x="${11 + i * 47}" y="103" width="16" height="4" rx="2" fill="${a}"/>`).join("")}`;
  }
  if (kind === "wave") {
    let bars = "";
    for (let i = 0; i < 46; i++) {
      const h = 6 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)) * 40;
      bars += `<rect x="${44 + i * 3.1}" y="${62 - h / 2}" width="1.8" height="${h.toFixed(1)}" rx=".9" fill="${a}"/>`;
    }
    return `<rect width="196" height="118" fill="#0E0A18"/><rect width="36" height="118" fill="#150F24"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="7" y="${12 + i * 14}" width="22" height="5" rx="2.5" fill="${i === 1 ? a : "#2B2240"}"/>`).join("")}
<rect x="44" y="8" width="80" height="6" rx="3" fill="#2B2240"/><rect x="150" y="7" width="38" height="9" rx="4.5" fill="${a}"/>${bars}
<rect x="44" y="94" width="144" height="16" rx="5" fill="#150F24"/><circle cx="54" cy="102" r="4" fill="${a}"/><rect x="64" y="100" width="110" height="4" rx="2" fill="#2B2240"/><rect x="64" y="100" width="48" height="4" rx="2" fill="${a}"/>`;
  }
  if (kind === "map") {
    const pins = [[70, 40], [96, 62], [120, 34], [146, 70], [168, 46], [110, 88], [84, 96], [158, 96], [132, 54]];
    return `<rect width="196" height="118" fill="#07111F"/><rect width="50" height="118" fill="#0B1A2E"/><rect x="6" y="7" width="38" height="7" rx="3.5" fill="#1A2C47"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="6" y="${22 + i * 18}" width="38" height="13" rx="3" fill="#10223B"/><rect x="10" y="${26 + i * 18}" width="20" height="3" rx="1.5" fill="#3B5B88"/>`).join("")}
<g stroke="#15294A" stroke-width="1.2" fill="none"><path d="M50 30C80 40 110 20 196 36M50 76C90 70 130 100 196 84M90 0C96 40 80 80 100 118M150 0C140 50 170 80 150 118"/></g>
${pins.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 2.6 : 3.4}" fill="${a}"/><circle cx="${x}" cy="${y}" r="7" fill="${a}" fill-opacity=".18"/>`).join("")}`;
  }
  return `<rect width="196" height="118" fill="#0F0C24"/><rect width="196" height="12" fill="#151133"/><text x="8" y="9" font-family="${FONT}" font-size="7" font-weight="800" fill="#fff">2:pontos</text><rect x="140" y="4" width="48" height="4" rx="2" fill="#2E2860"/>
<text x="14" y="38" font-family="${FONT}" font-size="11" font-weight="800" fill="#fff">Criação de sites</text><text x="14" y="51" font-family="${FONT}" font-size="11" font-weight="800" fill="#fff">com propósito</text>
<rect x="14" y="58" width="80" height="4" rx="2" fill="#3A3473"/><rect x="14" y="66" width="60" height="4" rx="2" fill="#3A3473"/><rect x="14" y="78" width="40" height="11" rx="5.5" fill="${a}"/>
<rect x="120" y="22" width="66" height="70" rx="6" fill="#1A1640"/><circle cx="141" cy="44" r="7" fill="${a}"/><circle cx="141" cy="64" r="7" fill="${a}"/><rect x="155" y="40" width="22" height="4" rx="2" fill="#3A3473"/><rect x="155" y="62" width="22" height="4" rx="2" fill="#3A3473"/>`;
}

const PROP = {
  headphones: (a) => `<g transform="translate(300 196)"><path d="M8 52V40a42 42 0 0 1 84 0v12" fill="none" stroke="#1B1B22" stroke-width="10" stroke-linecap="round"/><path d="M8 52V40a42 42 0 0 1 84 0v12" fill="none" stroke="${a}" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/>
<rect x="-6" y="44" width="26" height="46" rx="12" fill="#14141A" stroke="${a}" stroke-width="2"/><rect x="80" y="44" width="26" height="46" rx="12" fill="#14141A" stroke="${a}" stroke-width="2"/></g>`,
  mic: (a) => `<g transform="translate(318 168)"><rect x="12" y="0" width="44" height="74" rx="22" fill="#1C1430" stroke="${a}" stroke-width="2.2"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M16 ${14 + i * 9}h36" stroke="${a}" stroke-opacity=".5" stroke-width="1.6"/>`).join("")}
<path d="M2 50a32 32 0 0 0 64 0" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round"/><path d="M34 82v26M18 110h32" stroke="${a}" stroke-width="3.5" stroke-linecap="round"/></g>`,
  pin: (a) => `<g transform="translate(320 176)"><ellipse cx="38" cy="112" rx="34" ry="9" fill="${a}" fill-opacity=".3"/><ellipse cx="38" cy="112" rx="18" ry="5" fill="${a}" fill-opacity=".5"/>
<path d="M38 0A34 34 0 0 0 4 34c0 26 34 72 34 72s34-46 34-72A34 34 0 0 0 38 0z" fill="${a}"/><circle cx="38" cy="34" r="13" fill="#06183A"/></g>`,
  cursor: (a) => `<g transform="translate(318 196) rotate(-8)"><path d="M0 0l78 34-34 10-14 34z" fill="${a}" stroke="#E0DBFF" stroke-width="2.5" stroke-linejoin="round"/></g>`,
};

function card(p) {
  const a = p.accent;
  let techX = 22;
  const pills = p.tech.map((t) => {
    const [path, color] = TECH[t];
    const w = 44 + t.length * 8.1;
    const s = `<rect x="${techX}" y="462" width="${w.toFixed(0)}" height="34" rx="10" fill="#FFFFFF" fill-opacity=".06" stroke="#FFFFFF" stroke-opacity=".12"/>
<g transform="translate(${techX + 10} 471) scale(0.667)"><path fill="${color}" d="${path}"/></g><text x="${techX + 32}" y="484" font-size="14.5" font-weight="500" fill="#E6EAF2">${esc(t)}</text>`;
    techX += w + 8;
    return s;
  }).join("\n");

  const lines = wrap(p.desc, 38).slice(0, 3).map((l, i) => `<text x="22" y="${384 + i * 24}" font-size="17" fill="#C9D1D9">${esc(l)}</text>`).join("");
  const logo = p.logo ? `<g transform="translate(22 26) scale(1.25)">${LOGO[p.logo](a)}</g>` : "";
  const brandX = p.logo ? 60 : 22;
  const brand = p.slug === "2pontos"
    ? `<text x="${brandX}" y="56" font-size="30" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">2<tspan fill="${a}">:</tspan>pontos</text>`
    : `<text x="${brandX}" y="56" font-size="${p.brand.length > 10 ? 24 : 28}" font-weight="800" fill="#FFFFFF" letter-spacing="-0.3">${esc(p.brand)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">${esc(p.name)}</title>
<desc id="d">${esc(p.desc)} Tecnologias: ${p.tech.join(", ")}.</desc>
<style>
text{font-family:${FONT}}
.fl{animation:fl 5s ease-in-out infinite}
@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.gl{animation:gl 3.2s ease-in-out infinite}
@keyframes gl{0%,100%{opacity:.55}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.deep}"/><stop offset=".55" stop-color="#090B12"/><stop offset="1" stop-color="#07080D"/></linearGradient>
  <radialGradient id="halo" cx=".5" cy=".38" r=".55"><stop offset="0" stop-color="${a}" stop-opacity=".45"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${a}" stop-opacity=".25"/><stop offset="1" stop-color="${a}" stop-opacity=".7"/></linearGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
  <clipPath id="clip"><rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="24"/></clipPath>
  <clipPath id="scr"><rect width="196" height="118" rx="3"/></clipPath>
</defs>
<g clip-path="url(#clip)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect class="gl" width="${W}" height="330" fill="url(#halo)"/>
  <g stroke="${a}" stroke-opacity=".08">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M0 ${110 + i * 30}H${W}"/>`).join("")}</g>
</g>
<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="24" fill="none" stroke="url(#edge)" stroke-width="2.5"/>
${logo}
${brand}
<g transform="translate(54 108)">
  <ellipse cx="146" cy="196" rx="150" ry="16" fill="${a}" fill-opacity=".35" filter="url(#blur)"/>
  <rect x="34" y="0" width="224" height="146" rx="10" fill="#15161C" stroke="#2D2F38" stroke-width="2"/>
  <g transform="translate(48 14)" clip-path="url(#scr)">${screen(p.screen, a)}</g>
  <path d="M8 152h276l-14 22H22z" fill="#23252D"/><path d="M8 152h276" stroke="#3A3D48" stroke-width="2"/><rect x="122" y="153" width="48" height="4" rx="2" fill="#15161C"/>
</g>
<g class="fl">${PROP[p.prop](a)}</g>
<text x="22" y="350" font-size="27" font-weight="800" fill="#FFFFFF" letter-spacing="-0.3">${esc(p.name)}<tspan dx="10" font-size="22" fill="${a}">↗</tspan></text>
${lines}
${pills}
<rect x="22" y="520" width="180" height="50" rx="25" fill="#FFFFFF" fill-opacity=".08" stroke="#FFFFFF" stroke-opacity=".22"/>
<text x="48" y="551" font-size="17" font-weight="700" fill="#FFFFFF">Ver projeto</text>
<path d="M164 551l9-9M165 542h8v8" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="216" y="520" width="182" height="50" rx="25" fill="#000000" fill-opacity=".35" stroke="#FFFFFF" stroke-opacity=".18"/>
<g transform="translate(262 535) scale(1.25)"><path fill="#FFFFFF" d="${si.siGithub.path}" transform="scale(0.667)"/></g>
<text x="292" y="551" font-size="17" font-weight="700" fill="#FFFFFF">Código</text>
</svg>
`;
}

// Título da seção, sem fundo
const TW = 1752, TH = 130;
const THEMES = { dark: { text: "#FFFFFF", muted: "#C9D1D9" }, light: { text: "#0D1117", muted: "#424A53" } };
function title(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TW} ${TH}" width="${TW}" height="${TH}" role="img" aria-labelledby="t">
<title id="t">Projetos em destaque</title>
<style>text{font-family:${FONT}}.in{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
<defs><linearGradient id="ib" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E3E96"/><stop offset="1" stop-color="#0A1E44"/></linearGradient></defs>
<g class="in">
<rect x="22" y="14" width="102" height="100" rx="22" fill="url(#ib)" stroke="#2F7BEA" stroke-opacity=".7" stroke-width="1.5"/>
<g transform="translate(47 38) scale(2.15)" fill="none" stroke="#5EB1FF" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.8"/><path d="M1 19.5h22"/></g>
<text x="148" y="66" font-size="46" font-weight="800" fill="${t.text}" letter-spacing="-0.5">Projetos em destaque</text>
<text x="149" y="104" font-size="25" fill="${t.muted}">Alguns dos meus projetos que unem código, design e propósito.</text>
</g></svg>
`;
}

mkdirSync(DIR, { recursive: true });
for (const p of PROJECTS) { writeFileSync(join(DIR, `${p.slug}.svg`), card(p)); console.log("SVG gerado:", p.slug); }
for (const [n, t] of Object.entries(THEMES)) { writeFileSync(join(DIR, `title-${n}.svg`), title(t)); console.log("SVG gerado:", `title-${n}`); }
