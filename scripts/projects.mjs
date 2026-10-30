// Gera um card SVG por projeto em assets/projects/ (mesmo visual dos outros cards).
// Uso: npm i --no-save simple-icons && node scripts/projects.mjs
// Para mudar os projetos, edite PROJECTS abaixo e rode de novo.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as si from "simple-icons";

const DIR = process.env.OUT_DIR || join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "projects");

const TECH = {
  React: [si.siReact.path, "#61DAFB"],
  JavaScript: [si.siJavascript.path, "#F7DF1E"],
  TypeScript: [si.siTypescript.path, "#3B8FE0"],
  "Tailwind CSS": [si.siTailwindcss.path, "#06B6D4"],
  FastAPI: [si.siFastapi.path, "#009688"],
  "UI/UX": [si.siFigma.path, "#F24E1E"],
};

const ICON = {
  cart: `<g fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.5h2.6l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2l1.7-7.3H6"/></g><g fill="#FFFFFF"><circle cx="9.5" cy="20" r="1.7"/><circle cx="17.5" cy="20" r="1.7"/></g>`,
  mic: `<g fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="#FFFFFF"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4M8.5 21.5h7"/></g>`,
  pin: `<path fill="#FFFFFF" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z"/>`,
  dots: `<g fill="#FFFFFF"><circle cx="12" cy="6.5" r="3.4"/><circle cx="12" cy="17.5" r="3.4"/></g>`,
};

const PROJECTS = [
  {
    slug: "pichau-redesign", name: "Pichau Redesign", tag: "E-commerce", color: "#8B5CF6", grad: ["#9F7AFA", "#6D3FE6"], icon: "cart",
    link: "Ver projeto",
    desc: "Redesign conceitual de e-commerce, com foco em navegação, hierarquia visual e experiência de compra.",
    tech: ["React", "JavaScript", "Tailwind CSS"],
  },
  {
    slug: "revoz", name: "REVOZ", tag: "Áudio e IA", color: "#EC4899", grad: ["#F472B6", "#DB2777"], icon: "mic",
    link: "Ver código",
    desc: "Aplicação experimental para narração de textos, transformação vocal e dublagem.",
    tech: ["React", "TypeScript", "FastAPI"],
  },
  {
    slug: "tech-jobs-map", name: "Tech Jobs Map", tag: "Mapa interativo", color: "#10B981", grad: ["#22C08A", "#0E9466"], icon: "pin",
    link: null,
    desc: "Mapa para explorar empresas de tecnologia e oportunidades em São Paulo.",
    tech: ["React", "JavaScript"],
  },
  {
    slug: "2pontos", name: "2:pontos", tag: "Estúdio web", color: "#2F6BFF", grad: ["#3B82F6", "#0142FF"], icon: "dots",
    link: null,
    desc: "Identidade e presença digital para criação de sites e experiências web.",
    tech: ["React", "Tailwind CSS", "UI/UX"],
  },
];

const W = 740, H = 290;
const C_TILE = "#121721", C_EDGE = "#1F2633", C_TEXT = "#F3F4F6", C_MUTED = "#C9D1D9";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(text, max) {
  const lines = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if ((cur + " " + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function card(p) {
  const s = 30 / 24;
  let techX = 32;
  const pills = p.tech.map((t, i) => {
    const [path, color] = TECH[t];
    const w = 58 + t.length * 9.2;
    const out = `<g class="in" style="animation-delay:${(0.35 + i * 0.08).toFixed(2)}s"><rect x="${techX}" y="212" width="${w.toFixed(0)}" height="46" rx="12" fill="#161B24" stroke="${C_EDGE}"/>
<rect x="${techX + 8}" y="220" width="30" height="30" rx="8" fill="${color}" fill-opacity="0.14"/><g transform="translate(${techX + 13} 225) scale(0.8333)"><path fill="${color}" d="${path}"/></g>
<text x="${techX + 48}" y="241" font-size="16" font-weight="500" fill="${C_TEXT}">${esc(t)}</text></g>`;
    techX += w + 10;
    return out;
  }).join("\n");

  const linkPill = p.link
    ? (() => {
        const w = 52 + p.link.length * 9;
        return `<rect x="${W - 32 - w}" y="34" width="${w.toFixed(0)}" height="40" rx="20" fill="${p.color}" fill-opacity="0.14" stroke="${p.color}" stroke-opacity="0.5"/>
<text x="${(W - 32 - w + 18).toFixed(0)}" y="60" font-size="15" font-weight="600" fill="#FFFFFF">${p.link}</text>
<path d="M${W - 50} 61l7-7M${W - 50} 54h7v7" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      })()
    : "";

  const lines = wrap(p.desc, 62).map((l, i) => `<text x="32" y="${140 + i * 28}" font-size="18" fill="${C_MUTED}">${esc(l)}</text>`).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">${esc(p.name)}</title>
<desc id="d">${esc(p.desc)} Tecnologias: ${p.tech.join(", ")}.</desc>
<style>
text{font-family:'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif}
.in{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
  <linearGradient id="tint" x1="0" y1="1" x2="0.6" y2="0"><stop offset="0" stop-color="${p.color}" stop-opacity="0.2"/><stop offset="0.55" stop-color="${p.color}" stop-opacity="0.04"/><stop offset="1" stop-color="${p.color}" stop-opacity="0"/></linearGradient>
  <linearGradient id="edge" x1="0" y1="1" x2="0.5" y2="0"><stop offset="0" stop-color="${p.color}" stop-opacity="0.9"/><stop offset="0.35" stop-color="${p.color}" stop-opacity="0.15"/><stop offset="1" stop-color="${C_EDGE}"/></linearGradient>
  <linearGradient id="ig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.grad[0]}"/><stop offset="1" stop-color="${p.grad[1]}"/></linearGradient>
  <clipPath id="clip"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20"/></clipPath>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20" fill="${C_TILE}"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20" fill="url(#tint)"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20" fill="none" stroke="url(#edge)" stroke-width="1.5"/>
<rect x="1" y="${H - 6}" width="80" height="5" fill="${p.color}" clip-path="url(#clip)"/>
<rect x="32" y="30" width="60" height="58" rx="13" fill="url(#ig)"/>
<g transform="translate(${62 - 15} ${59 - 15}) scale(${s})">${ICON[p.icon]}</g>
<text x="112" y="58" font-size="26" font-weight="800" fill="#FFFFFF" letter-spacing="-0.3">${esc(p.name)}</text>
<text x="113" y="83" font-size="15" font-weight="600" fill="${p.color}">${esc(p.tag)}</text>
${linkPill}
${lines}
${pills}
</svg>
`;
}

mkdirSync(DIR, { recursive: true });
for (const p of PROJECTS) {
  writeFileSync(join(DIR, `${p.slug}.svg`), card(p));
  console.log("SVG gerado:", p.slug);
}

// Título da seção
const TW = 1530, TH = 150;
const rocket = `<g fill="none" stroke="#FFFFFF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4.5c2.6-1.3 5-1.6 6-1 .6 1 .3 3.4-1 6l-6.3 6.3-4-4z"/><path d="M9.2 11.8L6 11.3l2.4-2.9 3.6.2M12.2 14.8l.5 3.2 2.9-2.4-.2-3.6"/><path d="M6.5 15.5c-1.5.5-2.5 2.5-2.5 4.5 2 0 4-1 4.5-2.5"/></g><circle cx="16" cy="8" r="1.6" fill="#FFFFFF"/>`;
writeFileSync(join(DIR, "title.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TW} ${TH}" width="${TW}" height="${TH}" role="img" aria-labelledby="t">
<title id="t">Projetos em destaque</title>
<style>
text{font-family:'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif}
.in{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
  <linearGradient id="ib" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9F7AFA"/><stop offset="1" stop-color="#6D3FE6"/></linearGradient>
</defs>
<rect width="${TW}" height="${TH}" rx="28" fill="#0D1117"/>
<rect x="0.5" y="0.5" width="${TW - 1}" height="${TH - 1}" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.06"/>
<g class="in" transform="translate(20 10)">
<rect x="20" y="22" width="86" height="84" rx="18" fill="url(#ib)"/>
<g transform="translate(39 40) scale(2)">${rocket}</g>
<text x="134" y="68" font-size="46" font-weight="800" fill="#FFFFFF" letter-spacing="-0.6">Projetos em destaque</text>
<text x="136" y="102" font-size="20" fill="#A3ACBD">Interfaces, produtos e experimentos que construí do design ao código</text>
<g transform="translate(1470 64)" text-anchor="end">
<text font-size="56" font-weight="800" fill="#FFFFFF" fill-opacity="0.08" y="18">0${PROJECTS.length}</text>
</g>
</g>
</svg>
`);
console.log("SVG gerado: title");
