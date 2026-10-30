// Gera assets/github-stats.svg com dados reais do GitHub.
// Uso: GITHUB_TOKEN=... node scripts/github-stats.mjs
// Teste local sem token: MOCK=1 node scripts/github-stats.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LOGIN = process.env.STATS_LOGIN || "VanderleiFernandesds";
const DISPLAY_NAME = "Vanderlei Fernandes";
const ROLE = "Full Stack Developer";
const TZ = "America/Sao_Paulo";
const TZ_LABEL = "UTC-3 (São Paulo)";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "github-stats.svg");

// ---------- Dados ----------

async function gql(query, variables = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN ausente");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "stats-svg" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
}

async function fetchData() {
  const base = await gql(
    `query($login:String!){ user(login:$login){ id createdAt } }`,
    { login: LOGIN }
  );
  const { id: userId, createdAt } = base.user;

  // Calendário de contribuições, ano a ano (a API aceita no máximo 1 ano por consulta)
  const days = new Map();
  let from = new Date(createdAt);
  const now = new Date();
  while (from < now) {
    const to = new Date(Math.min(from.getTime() + 365 * 864e5, now.getTime()));
    const d = await gql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){ user(login:$login){
        contributionsCollection(from:$from,to:$to){ contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } } } }`,
      { login: LOGIN, from: from.toISOString(), to: to.toISOString() }
    );
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks)
      for (const day of w.contributionDays) days.set(day.date, (days.get(day.date) || 0) + day.contributionCount);
    from = to;
  }

  // Repositórios próprios (sem forks) com linguagem principal e commits do usuário
  const repos = [];
  let after = null;
  do {
    const d = await gql(
      `query($login:String!,$after:String){ user(login:$login){ repositories(first:50, after:$after, ownerAffiliations:OWNER, isFork:false){
        pageInfo{ hasNextPage endCursor }
        nodes{ name primaryLanguage{ name color } defaultBranchRef{ name } } } } }`,
      { login: LOGIN, after }
    );
    const r = d.user.repositories;
    repos.push(...r.nodes);
    after = r.pageInfo.hasNextPage ? r.pageInfo.endCursor : null;
  } while (after);

  const commits = []; // { date, lang }
  for (const repo of repos) {
    if (!repo.defaultBranchRef) continue;
    let cursor = null;
    let pages = 0;
    do {
      const d = await gql(
        `query($login:String!,$name:String!,$author:ID!,$after:String){ repository(owner:$login,name:$name){ defaultBranchRef{ target{ ... on Commit {
          history(first:100, after:$after, author:{id:$author}){ pageInfo{ hasNextPage endCursor } nodes{ authoredDate } } } } } } }`,
        { login: LOGIN, name: repo.name, author: userId, after: cursor }
      );
      const h = d.repository?.defaultBranchRef?.target?.history;
      if (!h) break;
      for (const c of h.nodes) commits.push({ date: c.authoredDate, lang: repo.primaryLanguage });
      cursor = h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
      pages++;
    } while (cursor && pages < 20);
  }

  return { createdAt, days, repos, commits };
}

function mockData() {
  const days = new Map();
  const start = new Date("2024-02-10T00:00:00Z");
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let t = start.getTime(); t <= Date.now(); t += 864e5) {
    const iso = new Date(t).toISOString().slice(0, 10);
    days.set(iso, rnd() < 0.55 ? Math.floor(rnd() * 8) + 1 : 0);
  }
  const L = (name, color) => ({ name, color });
  const langs = [L("JavaScript", "#f1e05a"), L("TypeScript", "#3178c6"), L("CSS", "#663399"), L("HTML", "#e34c26"), L("Python", "#3572A5")];
  const repos = [0, 0, 0, 0, 1, 2, 3, 3, 4].map((i) => ({ primaryLanguage: langs[i] }));
  const commits = [];
  for (let i = 0; i < 600; i++) {
    const h = Math.floor(rnd() * 24);
    commits.push({ date: new Date(Date.UTC(2025, 0, 1, (h + 3) % 24, 0)).toISOString(), lang: langs[Math.min(4, Math.floor(rnd() * rnd() * 5))] });
  }
  return { createdAt: "2024-02-10T00:00:00Z", days, repos, commits };
}

// ---------- Cálculos ----------

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtDay = (iso, withYear = false) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}${withYear ? ` ${y}` : ""}`;
};
const todayLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

function computeStreaks(days) {
  const dates = [...days.keys()].sort();
  const today = todayLocal();
  const list = dates.filter((d) => d <= today);
  let longest = { len: 0, start: null, end: null };
  let run = { len: 0, start: null, end: null };
  for (const d of list) {
    if (days.get(d) > 0) {
      run = run.len ? { ...run, len: run.len + 1, end: d } : { len: 1, start: d, end: d };
      if (run.len > longest.len) longest = { ...run };
    } else run = { len: 0, start: null, end: null };
  }
  // Sequência atual: termina hoje ou ontem (hoje ainda pode não ter contribuição)
  let current = { len: 0, start: null, end: null };
  let i = list.length - 1;
  if (i >= 0 && list[i] === today && !(days.get(today) > 0)) i--;
  const end = list[i];
  while (i >= 0 && days.get(list[i]) > 0) {
    current = { len: current.len + 1, start: list[i], end };
    i--;
  }
  return { current, longest };
}

function hourOf(iso) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(new Date(iso)));
}

function topShares(entries, max = 5) {
  // entries: [{name,color,value}]
  const total = entries.reduce((s, e) => s + e.value, 0) || 1;
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  let top = sorted;
  if (sorted.length > max) {
    const rest = sorted.slice(max - 1).reduce((s, e) => s + e.value, 0);
    top = [...sorted.slice(0, max - 1), { name: "Outras", color: "#64748B", value: rest }];
  }
  // percentuais inteiros somando 100 (maior resto)
  const raw = top.map((e) => (e.value / total) * 100);
  const pct = raw.map(Math.floor);
  let left = 100 - pct.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { pct[i]++; left--; } });
  return top.map((e, i) => ({ ...e, pct: pct[i], frac: e.value / total }));
}

function groupLang(items) {
  const m = new Map();
  for (const lang of items) {
    if (!lang) continue;
    const cur = m.get(lang.name) || { name: lang.name, color: lang.color || "#94A3B8", value: 0 };
    cur.value++;
    m.set(lang.name, cur);
  }
  return [...m.values()];
}

// ---------- SVG ----------

const W = 1530, H = 1028;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const DUR = 4.0; // animação de entrada, roda uma vez
let kfIndex = 0;
const keyframes = [];
const pct = (sec) => ((sec / DUR) * 100).toFixed(3) + "%";
const anim = (name) => `animation:${name} ${DUR}s both`;

function kf(body) {
  const name = `k${++kfIndex}`;
  keyframes.push(`@keyframes ${name}{${body}}`);
  return name;
}

const LANG_COLORS = {
  JavaScript: "#FACC15",
  TypeScript: "#1E8BFF",
  CSS: "#7C3AED",
  HTML: "#F4511E",
  Python: "#3B82F6",
  Java: "#F59E0B",
  PHP: "#8B5CF6",
  SCSS: "#EC4899",
  Shell: "#22C55E",
  Vue: "#10B981",
  Outras: "#64748B",
};
const langColor = (it) => LANG_COLORS[it.name] || it.color || "#94A3B8";

const C_BG = "#0D1117";
const C_TILE = "#121721";
const C_EDGE = "#1F2633";
const C_TEXT = "#F3F4F6";
const C_MUTED = "#C9D1D9";
const C_DIM = "#8B94A7";

const ICONS = {
  github: `<path transform="translate(77 64) scale(2.9)" fill="#FFFFFF" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>`,
  users: `<g fill="#FFFFFF"><circle cx="12" cy="7.6" r="3.3"/><path d="M5.6 18.5c0-3.4 2.9-5.7 6.4-5.7s6.4 2.3 6.4 5.7z"/><circle cx="5.2" cy="9.4" r="2.3"/><circle cx="18.8" cy="9.4" r="2.3"/><path d="M.8 17.2c0-2.4 1.8-4 4.2-4 .8 0 1.5.2 2.1.5-1.3 1-2.1 2.2-2.4 3.5z"/><path d="M23.2 17.2c0-2.4-1.8-4-4.2-4-.8 0-1.5.2-2.1.5 1.3 1 2.1 2.2 2.4 3.5z"/></g>`,
  calendar: (c) => `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></g><g fill="${c}"><rect x="7" y="13" width="3" height="3" rx=".6"/><rect x="14" y="13" width="3" height="3" rx=".6"/></g>`,
  fire: (bg) => `<path fill="#FFFFFF" d="M12 22.5c-4.4 0-7.2-3-7.2-6.8 0-3.6 2.4-5.8 4-8.4.5 1.5 1.3 2.6 2.4 3.2C11.7 6.7 12.7 4 15.1 2c-.2 3 1.2 5 2.5 6.8 1.1 1.6 1.6 3.4 1.6 6.6 0 4-2.9 7.1-7.2 7.1z"/><path fill="${bg}" d="M12 20.4c-1.8 0-3-1.2-3-2.8 0-1.7 1.3-2.8 2.2-4.2.3.9.9 1.5 1.6 1.7.4-1 .7-2.1.5-3.2 1.4 1.2 2.7 2.9 2.7 5.3 0 1.8-1.5 3.2-4 3.2z"/>`,
  bars: `<g fill="#FFFFFF"><rect x="4" y="11" width="4" height="9" rx="1"/><rect x="10" y="5" width="4" height="15" rx="1"/><rect x="16" y="9" width="4" height="11" rx="1"/></g>`,
  code: `<path fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/>`,
  layers: `<g fill="#FFFFFF"><path d="M12 2.5l9 4.2-9 4.2-9-4.2z"/><path d="M3 11.2l2.4-1.1L12 13.2l6.6-3.1 2.4 1.1-9 4.2z"/><path d="M3 15.7l2.4-1.1L12 17.7l6.6-3.1 2.4 1.1-9 4.2z"/></g>`,
};

function iconBox({ x, y, w, h, rx, fill, icon, size = 24 }) {
  const s = (Math.min(w, h) * 0.56) / 24;
  const tx = x + w / 2 - 12 * s, ty = y + h / 2 - 12 * s;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/><g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(3)})">${icon}</g>\n`;
}

// Card com cor de destaque (brilho no canto e barra inferior)
function accentTile({ x, y, w, h, color, id }) {
  return `<linearGradient id="tint${id}" x1="0" y1="1" x2="0.6" y2="0"><stop offset="0" stop-color="${color}" stop-opacity="0.22"/><stop offset="0.55" stop-color="${color}" stop-opacity="0.04"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>
<linearGradient id="edge${id}" x1="0" y1="1" x2="0.5" y2="0"><stop offset="0" stop-color="${color}" stop-opacity="0.9"/><stop offset="0.35" stop-color="${color}" stop-opacity="0.15"/><stop offset="1" stop-color="${C_EDGE}"/></linearGradient>
<clipPath id="clip${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18"/></clipPath>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${C_TILE}"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="url(#tint${id})"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="none" stroke="url(#edge${id})" stroke-width="1.5"/>
<rect x="${x}" y="${y + h - 5}" width="70" height="5" fill="${color}" clip-path="url(#clip${id})"/>\n`;
}

function plainTile({ x, y, w, h }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${C_TILE}" stroke="${C_EDGE}" stroke-width="1.5"/>\n`;
}

// Contador estilo odômetro
function odometer({ value, x, baseline, size, colW, delay, id, fill = "#FFFFFF" }) {
  const digits = String(value).split("").map(Number);
  const step = +(size * 1.4).toFixed(1);
  const width = digits.length * colW;
  const clipId = `c${id}`;
  let out = `<clipPath id="${clipId}"><rect x="${x - 4}" y="${(baseline - size * 0.86).toFixed(1)}" width="${width + 8}" height="${(size * 1.12).toFixed(1)}"/></clipPath>\n<g clip-path="url(#${clipId})">\n`;
  digits.forEach((d, i) => {
    const cx = x + colW * i + colW / 2;
    const final = -(10 + d) * step;
    const s = delay + i * 0.1;
    const name = kf(`0%,${pct(0.2 + s)}{transform:translateY(0px);animation-timing-function:cubic-bezier(.2,.8,.2,1)}${pct(1.6 + s)},100%{transform:translateY(${final.toFixed(1)}px)}`);
    out += `<g style="${anim(name)};transform:translateY(${final.toFixed(1)}px)">`;
    for (let n = 0; n < 20; n++)
      out += `<text x="${cx.toFixed(1)}" y="${(baseline + n * step).toFixed(1)}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${fill}">${n % 10}</text>`;
    out += `</g>\n`;
  });
  out += `</g>\n`;
  return { svg: out, width };
}

function langTile({ x, w, title, icon, iconFill, items, delay, nameX, pctX, cx }) {
  const y = 693, h = 290, cy = 845, r = 87, sw = 38;
  const C = 2 * Math.PI * r;
  let s = plainTile({ x, y, w, h });
  s += iconBox({ x: x + 28, y: y + 19, w: 49, h: 48, rx: 11, fill: iconFill, icon });
  s += `<text x="${x + 101}" y="${y + 51}" font-size="23" font-weight="700" fill="${C_TEXT}">${esc(title)}</text>\n`;
  if (!items.length) {
    s += `<text x="${x + w / 2}" y="${cy}" text-anchor="middle" font-size="17" fill="${C_DIM}">Sem dados ainda</text>\n`;
    return s;
  }
  items.forEach((it, i) => {
    const ly = 801 + i * 45;
    s += `<circle cx="${nameX - 31}" cy="${ly}" r="12" fill="${langColor(it)}"/>\n`;
    s += `<text x="${nameX}" y="${ly + 7}" font-size="19" font-weight="500" fill="${C_TEXT}">${esc(it.name)}</text>\n`;
    s += `<text x="${pctX}" y="${ly + 7}" text-anchor="end" font-size="19" font-weight="500" fill="${C_TEXT}">${it.pct}%</text>\n`;
  });
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="${sw}"/>\n`;
  let acc = 0, t = delay;
  items.forEach((it) => {
    const len = Math.max(it.frac * C, 0.8);
    const dur = Math.max(it.frac * 1.2, 0.1);
    const name = kf(`0%,${pct(t)}{stroke-dasharray:0 ${C.toFixed(2)};animation-timing-function:linear}${pct(t + dur)},100%{stroke-dasharray:${len.toFixed(2)} ${C.toFixed(2)}}`);
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${langColor(it)}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" style="${anim(name)}"/>\n`;
    acc += it.frac * C;
    t += dur;
  });
  const top = items[0];
  s += `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="38" font-weight="800" fill="#FFFFFF">${top.pct}%</text>\n`;
  s += `<text x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="17" font-weight="500" fill="${C_TEXT}">${esc(top.name)}</text>\n`;
  return s;
}

function build(data) {
  const { createdAt, days, repos, commits } = data;
  const total = [...days.values()].reduce((a, b) => a + b, 0);
  const { current, longest } = computeStreaks(days);
  const sinceIso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(createdAt));

  const hours = Array(24).fill(0);
  for (const c of commits) hours[hourOf(c.date)]++;

  const byRepo = topShares(groupLang(repos.map((r) => r.primaryLanguage)), 4);
  const byCommit = topShares(groupLang(commits.map((c) => c.lang)), 4);

  const PURPLE = "#8B5CF6", BLUE = "#1D8CF8", GREEN = "#10B981";
  let b = "";

  // Cabeçalho
  b += `<rect x="55" y="43" width="90" height="87" rx="18" fill="#161B24" stroke="${C_EDGE}"/>\n${ICONS.github}\n`;
  b += `<text x="175" y="89" font-size="52" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">GitHub <tspan fill="url(#titleGrad)">stats</tspan></text>\n`;
  b += `<text x="176" y="125" font-size="21" fill="#A3ACBD">${esc(DISPLAY_NAME)}, ${esc(ROLE)}</text>\n`;
  const upd = `Atualizado em ${fmtDay(todayLocal(), true)}`;
  const pillW = 82 + upd.length * 8.6;
  b += `<rect x="${1480 - pillW}" y="43" width="${pillW.toFixed(0)}" height="55" rx="27.5" fill="#161B24" stroke="${C_EDGE}"/>\n`;
  b += `<circle cx="${(1480 - pillW + 32).toFixed(0)}" cy="71" r="8" fill="#22C55E"/>\n`;
  b += `<text x="${(1480 - pillW + 52).toFixed(0)}" y="77" font-size="16" font-weight="500" fill="${C_MUTED}">${upd}</text>\n`;

  // Card 1: total
  b += accentTile({ x: 55, y: 163, w: 477, h: 225, color: PURPLE, id: 1 });
  b += iconBox({ x: 84, y: 185, w: 60, h: 58, rx: 12, fill: "url(#gPurple)", icon: ICONS.users });
  b += `<text x="185" y="213" font-size="19" font-weight="600" fill="${C_TEXT}">Total de contribuições</text>\n`;
  const tSize = String(total).length > 4 ? 56 : 68;
  b += odometer({ value: total, x: 185, baseline: 300, size: tSize, colW: tSize * 0.6, delay: 0, id: "total" }).svg;
  b += `<g transform="translate(185 329) scale(0.85)">${ICONS.calendar("#A78BFA")}</g>\n`;
  b += `<text x="214" y="346" font-size="18" fill="${C_MUTED}">${fmtDay(sinceIso, true)} até hoje</text>\n`;

  // Card 2: sequência atual
  b += accentTile({ x: 560, y: 163, w: 482, h: 225, color: BLUE, id: 2 });
  b += iconBox({ x: 586, y: 185, w: 58, h: 58, rx: 12, fill: "url(#gBlue)", icon: ICONS.calendar("#FFFFFF") });
  b += `<text x="680" y="213" font-size="19" font-weight="600" fill="${C_TEXT}">Sequência atual</text>\n`;
  const R = 62, RC = 2 * Math.PI * R;
  const ratio = longest.len ? current.len / longest.len : 0;
  const off = (RC * (1 - ratio)).toFixed(2);
  const ringKf = kf(`0%,${pct(0.3)}{stroke-dashoffset:${RC.toFixed(2)};animation-timing-function:cubic-bezier(.2,.8,.2,1)}${pct(1.9)},100%{stroke-dashoffset:${off}}`);
  b += `<circle cx="734" cy="303" r="${R}" fill="none" stroke="#1D3557" stroke-width="14"/>\n`;
  b += `<circle cx="734" cy="303" r="${R}" fill="none" stroke="${BLUE}" stroke-width="14" stroke-linecap="${ratio >= 1 ? "butt" : "round"}" stroke-dasharray="${RC.toFixed(2)}" stroke-dashoffset="${off}" transform="rotate(-90 734 303)" style="${anim(ringKf)}"/>\n`;
  const cStr = String(current.len), cSize = cStr.length > 3 ? 34 : 44, cW = cSize * 0.6;
  b += odometer({ value: current.len, x: 734 - (cStr.length * cW) / 2, baseline: 310, size: cSize, colW: cW, delay: 0.1, id: "cur" }).svg;
  b += `<text x="734" y="332" text-anchor="middle" font-size="15" fill="${C_MUTED}">dias</text>\n`;
  b += `<text x="828" y="294" font-size="19" font-weight="600" fill="#3B9EFF">${current.len ? `${fmtDay(current.start)} a ${fmtDay(current.end)}` : "Nenhuma sequência ativa"}</text>\n`;
  const note = current.len && current.len === longest.len ? "Igual à maior sequência" : `Maior sequência: ${longest.len} dias`;
  b += `<text x="828" y="332" font-size="17" fill="${C_MUTED}">${note}</text>\n`;

  // Card 3: maior sequência
  b += accentTile({ x: 1070, y: 163, w: 410, h: 225, color: GREEN, id: 3 });
  b += iconBox({ x: 1096, y: 185, w: 58, h: 58, rx: 12, fill: "url(#gGreen)", icon: ICONS.fire("#12A673") });
  b += `<text x="1195" y="213" font-size="19" font-weight="600" fill="${C_TEXT}">Maior sequência</text>\n`;
  const lg = odometer({ value: longest.len, x: 1195, baseline: 300, size: 68, colW: 41, delay: 0.2, id: "long" });
  b += lg.svg;
  b += `<text x="${1195 + lg.width + 14}" y="300" font-size="26" font-weight="500" fill="${C_DIM}">dias</text>\n`;
  b += `<text x="1196" y="345" font-size="18" fill="${C_MUTED}">${longest.len ? `${fmtDay(longest.start, true)} a ${fmtDay(longest.end, true)}` : "Sem dados ainda"}</text>\n`;

  // Commits por hora
  b += plainTile({ x: 55, y: 417, w: 1425, h: 250 });
  b += iconBox({ x: 83, y: 440, w: 49, h: 48, rx: 10, fill: "#3B2380", icon: ICONS.bars });
  b += `<text x="156" y="471" font-size="23" font-weight="700" fill="${C_TEXT}">Commits por hora</text>\n`;
  b += `<rect x="1293" y="442" width="165" height="44" rx="22" fill="#161B24" stroke="${C_EDGE}"/>\n`;
  b += `<text x="1375.5" y="469" text-anchor="middle" font-size="15" fill="${C_MUTED}">${esc(TZ_LABEL)}</text>\n`;
  const maxH = Math.max(...hours, 1);
  const raw = maxH / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw));
  const yMax = step * 3, y0 = 627, chartH = 110;
  for (let g = 0; g <= 3; g++) {
    const y = y0 - (chartH * g) / 3;
    b += `<line x1="135" y1="${y.toFixed(1)}" x2="1452" y2="${y.toFixed(1)}" stroke="#FFFFFF" stroke-opacity="${g ? 0.08 : 0.18}" ${g ? 'stroke-dasharray="5 6"' : ""}/>\n`;
    b += `<text x="123" y="${(y + 6).toFixed(1)}" text-anchor="end" font-size="17" fill="${C_MUTED}">${+(step * g).toFixed(2)}</text>\n`;
  }
  const cxH = (i) => 160 + i * 55.5;
  let peak = 0, best = -1;
  for (let i = 0; i < 22; i++) { const s = hours[i] + hours[i + 1] + hours[i + 2]; if (s > best) { best = s; peak = i; } }
  if (best > 0) {
    const px = cxH(peak + 1);
    b += `<rect x="${(px - 75).toFixed(1)}" y="507" width="150" height="33" rx="16.5" fill="#2A1D57"/>\n`;
    b += `<text x="${px.toFixed(1)}" y="529" text-anchor="middle" font-size="15" font-weight="500" fill="#B79CFF">Horário de pico</text>\n`;
  }
  hours.forEach((v, i) => {
    if (!v) return;
    const h = Math.max((v / yMax) * chartH, 5);
    const s = 0.6 + i * 0.03;
    const name = kf(`0%,${pct(s)}{transform:scaleY(0);animation-timing-function:cubic-bezier(.2,.8,.2,1)}${pct(s + 0.6)},100%{transform:scaleY(1)}`);
    b += `<path class="b" d="M${(cxH(i) - 18.5).toFixed(1)} ${y0}V${(y0 - h + 6).toFixed(1)}q0-6 6-6h25q6 0 6 6V${y0}z" fill="url(#barGrad)" style="${anim(name)}"/>\n`;
  });
  [0, 3, 6, 9, 12, 15, 18, 21, 23].forEach((i) => {
    b += `<text x="${cxH(i).toFixed(1)}" y="649" text-anchor="middle" font-size="17" fill="${C_MUTED}">${String(i).padStart(2, "0")}</text>\n`;
  });

  // Linguagens
  b += langTile({ x: 55, w: 707, title: "Linguagens por repositório", icon: ICONS.code, iconFill: "#221B45", items: byRepo, delay: 1.0, nameX: 137, pctX: 425, cx: 630 });
  b += langTile({ x: 790, w: 690, title: "Linguagens por commit", icon: ICONS.layers, iconFill: "#1B2440", items: byCommit, delay: 1.2, nameX: 871, pctX: 1119, cx: 1326 });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">GitHub stats de ${esc(DISPLAY_NAME)}</title>
<desc id="d">Total de contribuições, sequência atual e maior sequência, commits por hora e linguagens por repositório e por commit.</desc>
<style>
text{font-family:'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif;font-variant-numeric:tabular-nums}
.b{transform-box:fill-box;transform-origin:50% 100%}
${keyframes.join("")}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
  <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#3B82F6"/></linearGradient>
  <linearGradient id="gPurple" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9F7AFA"/><stop offset="1" stop-color="#6D3FE6"/></linearGradient>
  <linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B9EFF"/><stop offset="1" stop-color="#1A6FE0"/></linearGradient>
  <linearGradient id="gGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22C08A"/><stop offset="1" stop-color="#0E9466"/></linearGradient>
  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#6236D9"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" rx="28" fill="${C_BG}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.06"/>
${b}</svg>
`;
}

// ---------- Gráfico de atividade (últimos 31 dias) ----------

function buildActivity(days) {
  const AW = 1530, AH = 470;
  const today = todayLocal();
  const pts = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    pts.push({ iso, v: days.get(iso) || 0 });
  }
  const total = pts.reduce((s, p) => s + p.v, 0);
  const active = pts.filter((p) => p.v > 0).length;
  const maxV = Math.max(...pts.map((p) => p.v), 1);
  const raw = (maxV * 1.05) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, Math.ceil([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((v) => v >= raw)));
  const yMax = step * 4;
  const L = 110, R = 1450, T = 175, B = 395;
  const X = (i) => L + ((R - L) * i) / 30;
  const Y = (v) => B - ((B - T) * v) / yMax;

  // curva suave (Catmull-Rom para Bézier), sem passar abaixo de zero
  const P = pts.map((p, i) => [X(i), Y(p.v)]);
  let line = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(B, p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(B, p2[1] - (p3[1] - p1[1]) / 6)];
    line += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const area = `${line}L${R} ${B}L${L} ${B}Z`;

  let g = "";
  for (let k = 0; k <= 4; k++) {
    const y = Y(step * k);
    g += `<line x1="${L}" y1="${y.toFixed(1)}" x2="${R}" y2="${y.toFixed(1)}" stroke="#FFFFFF" stroke-opacity="${k ? 0.08 : 0.18}" ${k ? 'stroke-dasharray="5 6"' : ""}/>`;
    g += `<text x="${L - 14}" y="${(y + 6).toFixed(1)}" text-anchor="end" font-size="17" fill="#C9D1D9">${+(step * k).toFixed(2)}</text>\n`;
  }
  pts.forEach((p, i) => {
    if (i % 5 === 0 || i === 30) {
      const [, m, d] = p.iso.split("-").map(Number);
      g += `<text x="${X(i).toFixed(1)}" y="${B + 30}" text-anchor="middle" font-size="16" fill="#C9D1D9">${d} ${MESES[m - 1]}</text>\n`;
    }
  });
  const dots = P.map(([x, y], i) => pts[i].v ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#0D1117" stroke="#3B82F6" stroke-width="3"/>` : "").join("");

  const statPill = (x, label) => {
    const w = 40 + label.length * 8.4;
    return `<rect x="${(x - w).toFixed(0)}" y="42" width="${w.toFixed(0)}" height="44" rx="22" fill="#161B24" stroke="#1F2633"/><text x="${(x - w / 2).toFixed(1)}" y="69" text-anchor="middle" font-size="15" fill="#C9D1D9">${label}</text>`;
  };
  const p2 = `${active} dias ativos`;
  const w2 = 40 + p2.length * 8.4;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${AW} ${AH}" width="${AW}" height="${AH}" role="img" aria-labelledby="t d">
<title id="t">Atividade no GitHub de ${esc(DISPLAY_NAME)}</title>
<desc id="d">Contribuições por dia nos últimos 31 dias.</desc>
<style>
text{font-family:'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif;font-variant-numeric:tabular-nums}
.ln{stroke-dasharray:4000;stroke-dashoffset:0;animation:draw 2.2s cubic-bezier(.2,.8,.2,1) both}
@keyframes draw{from{stroke-dashoffset:4000}to{stroke-dashoffset:0}}
.ar,.dt{animation:fade 1s ease 1.2s both}
@keyframes fade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
  <linearGradient id="aFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B5CF6" stop-opacity="0.35"/><stop offset="1" stop-color="#8B5CF6" stop-opacity="0"/></linearGradient>
  <linearGradient id="aLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#3B82F6"/></linearGradient>
</defs>
<rect width="${AW}" height="${AH}" rx="28" fill="#0D1117"/>
<rect x="0.5" y="0.5" width="${AW - 1}" height="${AH - 1}" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.06"/>
${iconBox({ x: 55, y: 40, w: 49, h: 48, rx: 10, fill: "#3B2380", icon: `<path fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M3 17l5-6 4 3 4-6 5 4"/>` })}
<text x="128" y="72" font-size="23" font-weight="700" fill="#F3F4F6">Atividade nos últimos 31 dias</text>
${statPill(1480, `${total} contribuições`)}
${statPill(1480 - (40 + `${total} contribuições`.length * 8.4) - 12, p2)}
${g}
<path class="ar" d="${area}" fill="url(#aFill)"/>
<path class="ln" d="${line}" fill="none" stroke="url(#aLine)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<g class="dt">${dots}</g>
</svg>
`;
}

const data = process.env.MOCK ? mockData() : await fetchData();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(process.env.OUT || OUT, build(data));
const OUT_ACT = process.env.OUT_ACT || join(dirname(OUT), "github-activity.svg");
writeFileSync(OUT_ACT, buildActivity(data.days));
console.log("SVGs gerados:", process.env.OUT || OUT, OUT_ACT);
