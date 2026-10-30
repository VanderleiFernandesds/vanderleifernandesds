// Gera assets/tech-stack.svg (card de tecnologias no mesmo visual do GitHub stats).
// Uso: npm i --no-save simple-icons && node scripts/tech-stack.mjs
// Para mudar a lista, edite GROUPS abaixo e rode de novo.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as si from "simple-icons";

const OUT = process.env.OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "tech-stack.svg");

// light: cor do ícone em fundo escuro, quando a cor da marca é escura demais
const GROUPS = [
  {
    title: "Front-End", color: "#8B5CF6", grad: ["#9F7AFA", "#6D3FE6"], cols: 3,
    items: [
      ["HTML", si.siHtml5], ["CSS", si.siCss, "#9B6BDF"], ["JavaScript", si.siJavascript],
      ["TypeScript", si.siTypescript], ["React", si.siReact], ["Next.js", si.siNextdotjs, "#FFFFFF"],
      ["Vite", si.siVite], ["Tailwind CSS", si.siTailwindcss],
    ],
  },
  {
    title: "Back-End", color: "#1D8CF8", grad: ["#3B9EFF", "#1A6FE0"], cols: 2,
    items: [
      ["Node.js", si.siNodedotjs], ["Express", si.siExpress, "#FFFFFF"], ["MySQL", si.siMysql, "#5B9BD5"],
      ["Python", si.siPython, "#4B8BD6"], ["FastAPI", si.siFastapi],
    ],
  },
  {
    title: "Ferramentas", color: "#10B981", grad: ["#22C08A", "#0E9466"], cols: 1,
    items: [["Figma", si.siFigma], ["Git", si.siGit], ["GitHub", si.siGithub, "#FFFFFF"]],
  },
];

const W = 1530;
const C_TILE = "#121721", C_EDGE = "#1F2633", C_TEXT = "#F3F4F6", C_MUTED = "#C9D1D9";
const PILL_H = 58, GAP = 14, PAD = 28, TOP = 120, HEAD = 92;
const rows = Math.max(...GROUPS.map((g) => Math.ceil(g.items.length / g.cols)));
const TILE_H = HEAD + rows * PILL_H + (rows - 1) * GAP + PAD;
const H = TOP + TILE_H + 42;

const ICON_GROUP = {
  "Front-End": `<path fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/>`,
  "Back-End": `<g fill="none" stroke="#FFFFFF" stroke-width="2.2"><ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></g>`,
  Ferramentas: `<path fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.4-.4-2.4z"/>`,
  header: `<g fill="#FFFFFF"><path d="M12 2.5l9 4.2-9 4.2-9-4.2z"/><path d="M3 11.2l2.4-1.1L12 13.2l6.6-3.1 2.4 1.1-9 4.2z"/><path d="M3 15.7l2.4-1.1L12 17.7l6.6-3.1 2.4 1.1-9 4.2z"/></g>`,
};

function iconBox(x, y, w, h, rx, fill, icon) {
  const s = (Math.min(w, h) * 0.56) / 24;
  const tx = x + w / 2 - 12 * s, ty = y + h / 2 - 12 * s;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/><g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(3)})">${icon}</g>\n`;
}

let defs = "";
let body = "";
let x = 55;
const totalW = 1480 - 55 - GAP * 2 * (GROUPS.length - 1);
const pillW = (totalW - GROUPS.reduce((s, g) => s + PAD * 2 + (g.cols - 1) * GAP, 0)) / GROUPS.reduce((s, g) => s + g.cols, 0);
let delay = 0.1;

GROUPS.forEach((g, gi) => {
  const w = PAD * 2 + g.cols * pillW + (g.cols - 1) * GAP;
  const y = TOP;
  const id = gi + 1;
  defs += `<linearGradient id="tint${id}" x1="0" y1="1" x2="0.6" y2="0"><stop offset="0" stop-color="${g.color}" stop-opacity="0.2"/><stop offset="0.55" stop-color="${g.color}" stop-opacity="0.04"/><stop offset="1" stop-color="${g.color}" stop-opacity="0"/></linearGradient>
<linearGradient id="edge${id}" x1="0" y1="1" x2="0.5" y2="0"><stop offset="0" stop-color="${g.color}" stop-opacity="0.9"/><stop offset="0.35" stop-color="${g.color}" stop-opacity="0.15"/><stop offset="1" stop-color="${C_EDGE}"/></linearGradient>
<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g.grad[0]}"/><stop offset="1" stop-color="${g.grad[1]}"/></linearGradient>
<clipPath id="clip${id}"><rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${TILE_H}" rx="18"/></clipPath>\n`;
  body += `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${TILE_H}" rx="18" fill="${C_TILE}"/>
<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${TILE_H}" rx="18" fill="url(#tint${id})"/>
<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${TILE_H}" rx="18" fill="none" stroke="url(#edge${id})" stroke-width="1.5"/>
<rect x="${x}" y="${y + TILE_H - 5}" width="70" height="5" fill="${g.color}" clip-path="url(#clip${id})"/>\n`;
  body += iconBox(x + PAD, y + 22, 50, 48, 11, `url(#g${id})`, ICON_GROUP[g.title]);
  body += `<text x="${x + PAD + 68}" y="${y + 54}" font-size="21" font-weight="700" fill="${C_TEXT}">${g.title}</text>\n`;

  g.items.forEach(([name, icon, light], i) => {
    const c = i % g.cols, r = Math.floor(i / g.cols);
    const px = x + PAD + c * (pillW + GAP), py = y + HEAD + r * (PILL_H + GAP);
    const color = light || `#${icon.hex}`;
    body += `<g class="in" style="animation-delay:${delay.toFixed(2)}s">`;
    body += `<rect x="${px.toFixed(1)}" y="${py}" width="${pillW.toFixed(1)}" height="${PILL_H}" rx="14" fill="#161B24" stroke="${C_EDGE}"/>`;
    body += `<rect x="${(px + 10).toFixed(1)}" y="${py + 10}" width="38" height="38" rx="10" fill="${color}" fill-opacity="0.14"/>`;
    body += `<g transform="translate(${(px + 18).toFixed(1)} ${py + 18}) scale(0.9167)"><path fill="${color}" d="${icon.path}"/></g>`;
    body += `<text x="${(px + 62).toFixed(1)}" y="${py + 36}" font-size="18" font-weight="500" fill="${C_TEXT}">${name}</text></g>\n`;
    delay += 0.05;
  });
  x += w + GAP * 2;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Tecnologias e ferramentas</title>
<desc id="d">${GROUPS.map((g) => `${g.title}: ${g.items.map((i) => i[0]).join(", ")}`).join(". ")}.</desc>
<style>
text{font-family:'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif}
.in{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
${defs}</defs>
<rect width="${W}" height="${H}" rx="28" fill="#0D1117"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.06"/>
${iconBox(55, 40, 49, 48, 10, "#1B2440", ICON_GROUP.header)}<text x="128" y="72" font-size="23" font-weight="700" fill="${C_TEXT}">Tecnologias e ferramentas</text>
${body}</svg>
`;

writeFileSync(OUT, svg);
console.log("SVG gerado:", OUT);
