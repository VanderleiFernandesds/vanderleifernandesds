// Gera assets/github-numbers.svg ("GitHub em números") com dados reais do GitHub.
// Uso: GITHUB_TOKEN=... node scripts/github-numbers.mjs
// Teste local sem token: MOCK=1 node scripts/github-numbers.mjs
// Para contar repositórios e commits privados, use um token pessoal (secret STATS_TOKEN) com escopos repo e read:user.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LOGIN = process.env.STATS_LOGIN || "VanderleiFernandesds";
const TZ = "America/Sao_Paulo";
const OUT = process.env.OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "github-numbers.svg");

// ---------- Dados ----------

async function gql(query, variables = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN ausente");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "numbers-svg" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
}

async function fetchData() {
  const base = await gql(`query($login:String!){ user(login:$login){ id createdAt } }`, { login: LOGIN });
  const days = new Map();
  let from = new Date(base.user.createdAt);
  const now = new Date();
  while (from < now) {
    const to = new Date(Math.min(from.getTime() + 365 * 864e5, now.getTime()));
    const d = await gql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){ user(login:$login){ contributionsCollection(from:$from,to:$to){
        contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } } } }`,
      { login: LOGIN, from: from.toISOString(), to: to.toISOString() }
    );
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks)
      for (const day of w.contributionDays) days.set(day.date, Math.max(days.get(day.date) || 0, day.contributionCount));
    from = to;
  }

  // repositórios próprios (sem forks); com token pessoal inclui os privados
  const repos = [];
  let after = null;
  do {
    const d = await gql(
      `query($login:String!,$after:String){ user(login:$login){ repositories(first:50, after:$after, ownerAffiliations:OWNER, isFork:false){
        pageInfo{ hasNextPage endCursor }
        nodes{ name primaryLanguage{ name color } } } } }`,
      { login: LOGIN, after }
    );
    const r = d.user.repositories;
    repos.push(...r.nodes);
    after = r.pageInfo.hasNextPage ? r.pageInfo.endCursor : null;
  } while (after);

  // commits do autor no branch padrão de cada repositório (horário e linguagem)
  const commits = [];
  for (const repo of repos) {
    let cursor = null;
    try {
      do {
        const d = await gql(
          `query($owner:String!,$name:String!,$uid:ID!,$after:String){ repository(owner:$owner,name:$name){ defaultBranchRef{ target{ ... on Commit{
            history(first:100, after:$after, author:{id:$uid}){ pageInfo{ hasNextPage endCursor } nodes{ authoredDate } } } } } } }`,
          { owner: LOGIN, name: repo.name, uid: base.user.id, after: cursor }
        );
        const h = d.repository?.defaultBranchRef?.target?.history;
        if (!h) break;
        for (const c of h.nodes) commits.push({ date: c.authoredDate, lang: repo.primaryLanguage });
        cursor = h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
      } while (cursor);
    } catch (e) {
      console.warn(`Commits de ${repo.name} ignorados:`, e.message);
    }
  }

  return { since: base.user.createdAt, days, repos, commits };
}

function mockData() {
  const days = new Map();
  let seed = 11;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let t = Date.now() - 480 * 864e5; t <= Date.now(); t += 864e5) {
    const recent = t > Date.now() - 40 * 864e5;
    days.set(new Date(t).toISOString().slice(0, 10), rnd() < (recent ? 0.97 : 0.3) ? Math.floor(rnd() * 9) + 1 : 0);
  }
  const L = (name, color) => ({ name, color });
  const langs = [L("JavaScript", "#f1e05a"), L("CSS", "#663399"), L("TypeScript", "#3178c6"), L("HTML", "#e34c26"), L("Python", "#3572A5"), null];
  const repos = Array.from({ length: 26 }, (_, i) => ({ name: "r" + i, primaryLanguage: langs[[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 5, 0, 0, 1, 2, 3, 0][i]] }));
  const commits = [];
  const weight = [6, 30, 28, 29, 12, 8, 2, 1, 2, 6, 10, 8, 4, 3, 7, 9, 8, 7, 16, 12, 14, 22, 20, 12];
  for (let i = 0; i < 420; i++) {
    let x = rnd() * weight.reduce((a, b) => a + b, 0), h = 0;
    while (x > weight[h]) x -= weight[h++];
    const d = new Date(Date.now() - Math.floor(rnd() * 300) * 864e5);
    d.setUTCHours((h + 3) % 24, Math.floor(rnd() * 60));
    commits.push({ date: d.toISOString(), lang: repos[Math.floor(rnd() * repos.length)].primaryLanguage });
  }
  return { since: "2024-07-03T12:00:00Z", days, repos, commits };
}

// ---------- Cálculos ----------

const isoTZ = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function streaks(days, today) {
  // atual: termina hoje, ou ontem se hoje ainda não teve contribuição
  let endCur = (days.get(today) || 0) > 0 ? today : addDays(today, -1);
  let cur = 0, curStart = null;
  for (let d = endCur; (days.get(d) || 0) > 0; d = addDays(d, -1)) { cur++; curStart = d; }
  let best = 0, bestStart = null, bestEnd = null, run = 0, runStart = null;
  const sorted = [...days.keys()].sort();
  if (sorted.length) {
    for (let d = sorted[0]; d <= today; d = addDays(d, 1)) {
      if ((days.get(d) || 0) > 0) {
        if (!run) runStart = d;
        run++;
        if (run >= best) { best = run; bestStart = runStart; bestEnd = d; }
      } else run = 0;
    }
  }
  return { cur, curStart, curEnd: cur ? endCur : null, best, bestStart, bestEnd };
}

function langShare(entries, palette) {
  // entries: Map nome -> { v, color }
  let list = [...entries.entries()].map(([name, o]) => ({ name, ...o })).sort((a, b) => b.v - a.v);
  const total = list.reduce((s, l) => s + l.v, 0) || 1;
  if (list.length > 5) list = [...list.slice(0, 4), { name: "Outras", v: list.slice(4).reduce((s, l) => s + l.v, 0), color: "#94A3B8" }];
  return list.map((l, i) => ({ ...l, frac: l.v / total, color: l.color || palette[i % palette.length] }));
}

// ---------- SVG ----------

const W = 1752;
const FONT = `'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif`;
const MONO = `'Geist Mono','JetBrains Mono','Fira Code',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
const BLUE = "#3B9EFF", C_TEXT = "#F3F6FB", C_MUTED = "#C9D1D9", C_DIM = "#8B98AE";
const TILE = "#0A1424", EDGE = "#1C4A86";
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const LANG_PALETTE = ["#1E8BFF", "#8B5CF6", "#22D3EE", "#A855F7", "#94A3B8"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => n.toLocaleString("pt-BR");

const GITHUB_PATH = "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z";

const ICON = {
  commit: `<g fill="none" stroke="${BLUE}" stroke-width="2.2" stroke-linecap="round"><circle cx="6" cy="5" r="2.6"/><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="19" r="2.6"/><path d="M6 7.6v8.8M18 7.6c0 5-12 3.5-12 8.8"/></g>`,
  repo: `<g fill="none" stroke="${BLUE}" stroke-width="2" stroke-linejoin="round"><path d="M5 3.5h13a1.5 1.5 0 0 1 1.5 1.5v14H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22h13v-3"/><rect x="9" y="7" width="6" height="4.5" rx="1"/></g>`,
  star: `<path fill="none" stroke="${BLUE}" stroke-width="2.1" stroke-linejoin="round" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>`,
  calendar: `<g fill="none" stroke="${BLUE}" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></g><g fill="${BLUE}"><rect x="7" y="13" width="3" height="3" rx=".6"/><rect x="14" y="13" width="3" height="3" rx=".6"/></g>`,
  code: `<path fill="none" stroke="${BLUE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/>`,
};
const icon = (name, cx, cy, size) => `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 24})">${ICON[name]}</g>`;

// textura ASCII do topo (determinística)
function asciiBand() {
  const chars = "0123456789S8#=+xX";
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const cols = 168, rows = 8, cw = 10.45, rh = 17;
  let layers = ["", "", ""];
  let out = "";
  for (let r = 0; r < rows; r++) {
    const ls = ["", "", ""];
    for (let c = 0; c < cols; c++) {
      const ch = chars[Math.floor(rnd() * chars.length)];
      const pick = rnd();
      const k = pick < 0.5 ? 0 : pick < 0.8 ? 1 : 2;
      for (let j = 0; j < 3; j++) ls[j] += j === k ? ch : " ";
    }
    for (let j = 0; j < 3; j++)
      out += `<text class="a${j}" x="0" y="${14 + r * rh}" textLength="${W}" lengthAdjust="spacing" xml:space="preserve">${esc(ls[j])}</text>`;
  }
  return out;
}

const MESES_C = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const LANG_FALLBACK = ["#4F8DF7", "#F2D74C", "#F0507E", "#F07B1D", "#E74C3C"];
const TEAL = "#5EEAD4";

function dataBR(iso, withYear) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_C[m - 1]}${withYear ? " " + y : ""}`;
}
function faixa(a, b, today) {
  const y = today.slice(0, 4);
  const yr = a.slice(0, 4) !== y || b.slice(0, 4) !== y;
  return a === b ? dataBR(a, yr) : `${dataBR(a, yr)} a ${dataBR(b, yr)}`;
}

function card(x, y, w, h, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${TILE}" stroke="${EDGE}" stroke-width="1.5"${extra}/>`;
}

function donut(list, x, y, cardW, title) {
  let b = card(x, y, cardW, 290);
  b += icon("code", x + 52, y + 46, 34);
  b += `<text x="${x + 86}" y="${y + 55}" font-size="23" font-weight="700" fill="${C_TEXT}">${title}</text>`;
  if (!list.length) return b + `<text x="${x + cardW / 2}" y="${y + 170}" text-anchor="middle" font-size="18" fill="${C_DIM}">Sem dados ainda</text>\n`;
  list.forEach((l, i) => {
    const ly = y + 108 + i * 38;
    b += `<circle cx="${x + 50}" cy="${ly - 7}" r="8" fill="${l.color}"/>`;
    b += `<text x="${x + 72}" y="${ly}" font-size="20" fill="${C_TEXT}">${esc(l.name)}</text>`;
    b += `<text x="${x + 430}" y="${ly}" text-anchor="end" font-size="20" fill="${C_MUTED}">${Math.round(l.frac * 100)}%</text>`;
  });
  const cx = x + cardW - 200, cy = y + 168, r = 80, sw = 30, C = 2 * Math.PI * r, gap = list.length > 1 ? 3 : 0;
  b += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity=".05" stroke-width="${sw}"/>`;
  let acc = 0;
  list.forEach((l, i) => {
    const len = Math.max(0.5, l.frac * C - gap);
    b += `<circle class="seg" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${l.color}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" style="animation-delay:${(0.3 + i * 0.1).toFixed(1)}s"/>`;
    acc += l.frac * C;
  });
  b += `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="36" font-weight="800" fill="#FFFFFF">${Math.round(list[0].frac * 100)}%</text>`;
  b += `<text x="${cx}" y="${cy + 34}" text-anchor="middle" font-size="16" fill="${C_DIM}">${esc(list[0].name)}</text>\n`;
  return b;
}

function build({ since, days, repos, commits }) {
  const today = isoTZ(new Date());
  const total = [...days.values()].reduce((s, v) => s + v, 0);
  const st = streaks(days, today);

  const byRepo = new Map(), byCommit = new Map();
  for (const r of repos) if (r.primaryLanguage) {
    const k = r.primaryLanguage.name;
    byRepo.set(k, { v: (byRepo.get(k)?.v || 0) + 1, color: r.primaryLanguage.color });
  }
  for (const c of commits) if (c.lang) {
    const k = c.lang.name;
    byCommit.set(k, { v: (byCommit.get(k)?.v || 0) + 1, color: c.lang.color });
  }
  const langRepo = langShare(byRepo, LANG_FALLBACK), langCommit = langShare(byCommit, LANG_FALLBACK);

  const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" });
  const hours = Array(24).fill(0);
  for (const c of commits) hours[Number(hourFmt.format(new Date(c.date))) % 24]++;

  const X0 = 46, X1 = W - 46, CW = X1 - X0;
  let b = "";

  // cabeçalho
  b += `<rect x="52" y="15" width="104" height="98" rx="22" fill="#0B1A33" stroke="${EDGE}" stroke-width="1.5"/>`;
  b += `<rect x="52" y="15" width="104" height="98" rx="22" fill="none" stroke="${BLUE}" stroke-opacity=".25" stroke-width="6" filter="url(#blur6)"/>`;
  b += `<g transform="translate(78 37) scale(3.25)"><path fill="${BLUE}" d="${GITHUB_PATH}"/></g>\n`;
  b += `<text x="182" y="58" font-size="44" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">GitHub em números</text>\n`;
  b += `<text x="183" y="99" font-size="24" fill="${C_MUTED}">Minha atividade, contribuições e evolução no GitHub.</text>\n`;

  // linha 1: total, sequência atual, maior sequência
  const Y1 = 140, H1 = 190, wSide = 520, wMid = CW - 2 * wSide - 40;
  const xA = X0, xB = X0 + wSide + 20, xC = xB + wMid + 20;
  const sinceIso = isoTZ(new Date(since));

  b += `<g class="in" style="animation-delay:.1s">${card(xA, Y1, wSide, H1)}`;
  b += `<text x="${xA + 40}" y="${Y1 + 50}" font-size="21" fill="${C_MUTED}">Total de contribuições</text>`;
  b += `<text x="${xA + 36}" y="${Y1 + 134}" font-size="92" font-weight="800" fill="#FFFFFF" letter-spacing="-2">${fmt(total)}</text>`;
  b += `<text x="${xA + 40}" y="${Y1 + 168}" font-size="19" font-weight="600" fill="${TEAL}">Desde ${dataBR(sinceIso, true)}</text></g>\n`;

  const rcx = xB + 130, rcy = Y1 + H1 / 2, rr = 64, RC = 2 * Math.PI * rr;
  const frac = st.best ? Math.max(0.02, st.cur / st.best) : 0;
  const ang = -Math.PI / 2 + frac * 2 * Math.PI;
  b += `<g class="in" style="animation-delay:.18s">${card(xB, Y1, wMid, H1, ` stroke-opacity="0"`)}`;
  b += `<rect x="${xB}" y="${Y1}" width="${wMid}" height="${H1}" rx="22" fill="url(#midGlow)" stroke="#8B7CF6" stroke-opacity=".7" stroke-width="1.5"/>`;
  b += `<circle cx="${rcx}" cy="${rcy}" r="${rr}" fill="none" stroke="#FFFFFF" stroke-opacity=".07" stroke-width="13"/>`;
  b += `<circle cx="${rcx}" cy="${rcy}" r="${rr}" fill="none" stroke="#8B5CF6" stroke-opacity=".35" stroke-width="20" filter="url(#blur6)" stroke-dasharray="${(frac * RC).toFixed(1)} ${RC.toFixed(1)}" transform="rotate(-90 ${rcx} ${rcy})"/>`;
  b += `<circle class="ring" cx="${rcx}" cy="${rcy}" r="${rr}" fill="none" stroke="url(#ringGrad)" stroke-width="13" stroke-linecap="round" stroke-dasharray="${(frac * RC).toFixed(1)} ${RC.toFixed(1)}" transform="rotate(-90 ${rcx} ${rcy})"/>`;
  if (frac) b += `<circle cx="${(rcx + rr * Math.cos(ang)).toFixed(1)}" cy="${(rcy + rr * Math.sin(ang)).toFixed(1)}" r="5" fill="#FFFFFF"/>`;
  b += `<text x="${rcx}" y="${rcy + 12}" text-anchor="middle" font-size="44" font-weight="800" fill="#FFFFFF">${st.cur}</text>`;
  b += `<text x="${rcx}" y="${rcy + 36}" text-anchor="middle" font-size="15" fill="${C_DIM}">${st.cur === 1 ? "dia" : "dias"}</text>`;
  const tx = xB + 240;
  b += `<text x="${tx}" y="${Y1 + 74}" font-size="28" font-weight="800" fill="#FFFFFF">Sequência atual</text>`;
  b += `<text x="${tx}" y="${Y1 + 110}" font-size="19" font-weight="600" fill="${TEAL}">${st.cur ? faixa(st.curStart, st.curEnd, today) : "Nenhuma no momento"}</text>`;
  const note = st.cur && st.cur === st.best ? "Igual à maior sequência" : `Maior sequência: ${st.best} ${st.best === 1 ? "dia" : "dias"}`;
  b += `<text x="${tx}" y="${Y1 + 144}" font-size="18" fill="${C_DIM}">${note}</text></g>\n`;

  const bestStr = String(st.best);
  b += `<g class="in" style="animation-delay:.26s">${card(xC, Y1, wSide, H1)}`;
  b += `<text x="${xC + 40}" y="${Y1 + 50}" font-size="21" fill="${C_MUTED}">Maior sequência</text>`;
  b += `<text x="${xC + 36}" y="${Y1 + 134}" font-size="92" font-weight="800" fill="#FFFFFF" letter-spacing="-2">${bestStr}</text>`;
  b += `<text x="${xC + 36 + bestStr.length * 50 + 14}" y="${Y1 + 134}" font-size="30" fill="${C_MUTED}">${st.best === 1 ? "dia" : "dias"}</text>`;
  b += `<text x="${xC + 40}" y="${Y1 + 168}" font-size="19" font-weight="600" fill="${TEAL}">${st.best ? faixa(st.bestStart, st.bestEnd, today) : "Sem contribuições ainda"}</text></g>\n`;

  // linha 2: calendário de contribuições
  const Y2 = Y1 + H1 + 22, H2 = 318;
  b += `<g class="in" style="animation-delay:.32s">${card(X0, Y2, CW, H2)}`;
  b += icon("calendar", X0 + 54, Y2 + 44, 36);
  const end = new Date(today + "T12:00:00Z");
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - end.getUTCDay() - 52 * 7);
  const startIso = start.toISOString().slice(0, 10);
  const yearTotal = [...days.entries()].filter(([d]) => d >= startIso && d <= today).reduce((s, [, v]) => s + v, 0);
  b += `<text x="${X0 + 88}" y="${Y2 + 52}" font-size="23" fill="${C_TEXT}"><tspan font-weight="700">Contribuições</tspan> (últimos 12 meses)</text>`;
  b += `<text x="${X1 - 40}" y="${Y2 + 52}" text-anchor="end" font-size="20" fill="${C_MUTED}"><tspan font-weight="700" fill="#FFFFFF">${fmt(yearTotal)}</tspan> no período</text>\n`;
  const vals = [...days.entries()].filter(([d, v]) => v > 0 && d >= startIso).map(([, v]) => v).sort((a, b) => a - b);
  const q = (p) => vals.length ? vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] : 1;
  const th = [q(0.25), q(0.5), q(0.75)];
  const LEVEL = ["#111C30", "#0E3B7E", "#1660C9", "#1E8BFF", "#22D3EE"];
  const gx = X0 + 112, gy = Y2 + 108, step = (X1 - 40 - gx) / 53, cell = step - 5.5, rowStep = 26;
  let lastMonth = -1;
  for (let w = 0; w < 53; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setUTCDate(start.getUTCDate() + w * 7 + d);
      if (dt > end) continue;
      const v = days.get(dt.toISOString().slice(0, 10)) || 0;
      const lvl = v === 0 ? 0 : v <= th[0] ? 1 : v <= th[1] ? 2 : v <= th[2] ? 3 : 4;
      const glow = lvl === 4 ? ` filter="url(#cellGlow)"` : "";
      b += `<rect x="${(gx + w * step).toFixed(1)}" y="${(gy + d * rowStep).toFixed(1)}" width="${cell.toFixed(1)}" height="${(rowStep - 5.5).toFixed(1)}" rx="4" fill="${LEVEL[lvl]}"${glow}/>`;
      if (d === 0) {
        const m = dt.getUTCMonth();
        if (m !== lastMonth && dt.getUTCDate() <= 7 && w < 51)
          b += `<text x="${(gx + w * step).toFixed(1)}" y="${gy - 18}" font-size="18" fill="${C_MUTED}">${MESES[m]}</text>`;
        if (w === 0 || dt.getUTCDate() <= 7) lastMonth = m;
      }
    }
  }
  [["Seg", 1], ["Qua", 3], ["Sex", 5]].forEach(([l, d]) => {
    b += `<text x="${X0 + 40}" y="${(gy + d * rowStep + 15).toFixed(1)}" font-size="18" fill="${C_MUTED}">${l}</text>`;
  });
  b += "</g>\n";

  // linha 3: commits por hora
  const Y3 = Y2 + H2 + 22, H3 = 300;
  b += `<g class="in" style="animation-delay:.4s">${card(X0, Y3, CW, H3)}`;
  b += icon("commit", X0 + 54, Y3 + 44, 34);
  b += `<text x="${X0 + 88}" y="${Y3 + 52}" font-size="23" font-weight="700" fill="${C_TEXT}">Commits por hora</text>`;
  b += `<text x="${X1 - 40}" y="${Y3 + 52}" text-anchor="end" font-size="18" fill="${C_DIM}">Horário de Brasília (UTC-3) · ${fmt(commits.length)} commits</text>\n`;
  const maxH = Math.max(...hours, 1);
  const tick = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find((t) => maxH / t <= 4) || Math.ceil(maxH / 4);
  const top = Math.ceil(maxH / tick) * tick;
  const cx0 = X0 + 90, cx1 = X1 - 40, cyTop = Y3 + 112, cyBot = Y3 + 248, slot = (cx1 - cx0) / 24, bw = slot * 0.62;
  for (let t = 0; t <= top; t += tick) {
    const yy = cyBot - (t / top) * (cyBot - cyTop);
    b += `<line x1="${cx0}" x2="${cx1}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#FFFFFF" stroke-opacity="${t ? 0.06 : 0.14}" ${t ? 'stroke-dasharray="4 6"' : ""}/>`;
    b += `<text x="${cx0 - 16}" y="${(yy + 6).toFixed(1)}" text-anchor="end" font-size="16" fill="${C_DIM}">${t}</text>`;
  }
  let peak = 0, peakSum = -1;
  for (let h = 0; h <= 21; h++) { const s = hours[h] + hours[h + 1] + hours[h + 2]; if (s > peakSum) { peakSum = s; peak = h; } }
  const hasData = commits.length > 0;
  if (hasData) {
    const px = cx0 + peak * slot + 4, pw = slot * 3 - 8;
    b += `<rect x="${px.toFixed(1)}" y="${Y3 + 76}" width="${pw.toFixed(1)}" height="${cyBot - Y3 - 70}" rx="12" fill="${TEAL}" fill-opacity=".07" stroke="${TEAL}" stroke-opacity=".18"/>`;
    b += `<text x="${(px + pw / 2).toFixed(1)}" y="${Y3 + 100}" text-anchor="middle" font-size="16" font-weight="700" fill="${TEAL}">Horário de pico</text>`;
  }
  hours.forEach((v, h) => {
    const bh = Math.max(v ? 4 : 0, (v / top) * (cyBot - cyTop));
    const bx = cx0 + h * slot + (slot - bw) / 2;
    const isPeak = hasData && h >= peak && h < peak + 3;
    if (bh) b += `<rect class="bar" x="${bx.toFixed(1)}" y="${(cyBot - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="5" fill="url(#${isPeak ? "barPeak" : "bar"})" style="animation-delay:${(0.45 + h * 0.025).toFixed(2)}s"/>`;
    if (h % 3 === 0 || h === 23)
      b += `<text x="${(cx0 + h * slot + slot / 2).toFixed(1)}" y="${cyBot + 30}" text-anchor="middle" font-size="16" fill="${C_DIM}">${String(h).padStart(2, "0")}h</text>`;
  });
  if (!hasData) b += `<text x="${(cx0 + cx1) / 2}" y="${(cyTop + cyBot) / 2}" text-anchor="middle" font-size="18" fill="${C_DIM}">Sem dados ainda</text>`;
  b += "</g>\n";

  // linha 4: linguagens
  const Y4 = Y3 + H3 + 22, half = (CW - 22) / 2;
  b += `<g class="in" style="animation-delay:.48s">${donut(langRepo, X0, Y4, half, "Linguagens por repositório")}</g>`;
  b += `<g class="in" style="animation-delay:.54s">${donut(langCommit, X0 + half + 22, Y4, half, "Linguagens por commit")}</g>\n`;

  const H = Y4 + 290 + 40;
  const pct = (l) => l.map((x) => `${x.name} ${Math.round(x.frac * 100)}%`).join(", ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">GitHub em números</title>
<desc id="d">${fmt(total)} contribuições desde ${dataBR(sinceIso, true)}. Sequência atual de ${st.cur} dias, maior sequência de ${st.best} dias. ${fmt(yearTotal)} contribuições nos últimos 12 meses. Pico de commits entre ${peak}h e ${peak + 3}h. Linguagens por repositório: ${pct(langRepo)}. Linguagens por commit: ${pct(langCommit)}.</desc>
<style>
text{font-family:${FONT}}
.ascii text{font-family:${MONO};font-size:15px;fill:#2F8BFF}
.a0{opacity:.18}.a1{opacity:.35;animation:fl 2.8s steps(2) infinite}.a2{opacity:.6;animation:fl2 1.9s steps(2) infinite}
@keyframes fl{0%,100%{opacity:.12}50%{opacity:.5}}
@keyframes fl2{0%,100%{opacity:.7}50%{opacity:.2}}
.in{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.seg{animation:fade .8s ease both}
@keyframes fade{from{opacity:0}to{opacity:1}}
.bar{transform-box:fill-box;transform-origin:bottom;animation:grow .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes grow{from{transform:scaleY(0)}to{transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
  <linearGradient id="fadeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="fadeH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".45" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff"/></linearGradient>
  <mask id="maskV"><rect width="${W}" height="150" fill="url(#fadeV)"/></mask>
  <mask id="maskH"><rect width="${W}" height="150" fill="url(#fadeH)"/></mask>
  <radialGradient id="glowTop" cx=".75" cy="0" r=".6"><stop offset="0" stop-color="#1E6BFF" stop-opacity=".35"/><stop offset="1" stop-color="#1E6BFF" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowBottom" cx=".2" cy="1" r=".6"><stop offset="0" stop-color="#1E6BFF" stop-opacity=".12"/><stop offset="1" stop-color="#1E6BFF" stop-opacity="0"/></radialGradient>
  <radialGradient id="midGlow" cx=".2" cy=".5" r=".9"><stop offset="0" stop-color="#3B2A8C" stop-opacity=".55"/><stop offset="1" stop-color="${TILE}"/></radialGradient>
  <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A78BFA"/><stop offset="1" stop-color="${TEAL}"/></linearGradient>
  <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B8CF8"/><stop offset="1" stop-color="#4F46E5"/></linearGradient>
  <linearGradient id="barPeak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#99F6E4"/><stop offset="1" stop-color="#6366F1"/></linearGradient>
  <filter id="blur6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="cellGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="#050B16"/>
  <rect width="${W}" height="${H}" fill="url(#glowTop)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBottom)"/>
  <g mask="url(#maskV)"><g mask="url(#maskH)"><g class="ascii">${asciiBand()}</g></g></g>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity=".06"/>
${b}
</svg>
`;
}

const data = process.env.MOCK ? mockData() : await fetchData();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, build(data));
console.log("SVG gerado:", OUT);
