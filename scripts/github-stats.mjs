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

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const DUR = 14.0;
let kfIndex = 0;
const keyframes = [];
const pct = (sec) => ((sec / DUR) * 100).toFixed(3) + "%";

function kf(body) {
  const name = `k${++kfIndex}`;
  keyframes.push(`@keyframes ${name}{${body}}`);
  return name;
}

// Contador estilo odômetro
function odometer({ value, x, baseline, size, colW, delay, anchor = "start", id }) {
  const digits = String(value).split("").map(Number);
  const step = +(size * 1.4).toFixed(1);
  const width = digits.length * colW;
  const left = anchor === "start" ? x : x - width;
  const clipId = `c${id}`;
  let out = `<clipPath id="${clipId}"><rect x="${left - 4}" y="${(baseline - size * 0.86).toFixed(1)}" width="${width + 8}" height="${(size * 1.12).toFixed(1)}"/></clipPath>\n<g clip-path="url(#${clipId})">\n`;
  digits.forEach((d, i) => {
    const cx = left + colW * i + colW / 2;
    const final = -(10 + d) * step;
    const s = delay + i * 0.12;
    const name = kf(`0%,${pct(0.5 + s)}{transform:translateY(0px);animation-timing-function:cubic-bezier(.2,.8,.2,1)}${pct(2.2 + s)},100%{transform:translateY(${final.toFixed(1)}px)}`);
    out += `<g style="animation:${name} ${DUR}s infinite;transform:translateY(${final.toFixed(1)}px)">\n`;
    for (let n = 0; n < 20; n++)
      out += `<text x="${cx.toFixed(1)}" y="${(baseline + n * step).toFixed(1)}" text-anchor="middle" font-size="${size}" font-weight="800" fill="url(#numfill)">${n % 10}</text>\n`;
    out += `</g>\n`;
  });
  out += `</g>\n`;
  return { svg: out, width };
}

function donut({ cx, cy, items, delay, legendX, legendY, title, tileX }) {
  const r = 68, C = 2 * Math.PI * r, gap = 3;
  let s = `<rect x="${tileX}" y="526" width="550" height="250" rx="20" fill="#FFFFFF" fill-opacity="0.04" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>\n`;
  s += `<text x="${tileX + 28}" y="566" font-size="17" font-weight="700" fill="#E8ECF8">${esc(title)}</text>\n`;
  if (!items.length) {
    s += `<text x="${tileX + 275}" y="660" text-anchor="middle" font-size="14" fill="#8B94B3">Sem dados ainda</text>\n`;
    return s;
  }
  items.forEach((it, i) => {
    const y = legendY + i * 31;
    s += `<circle cx="${legendX}" cy="${y}" r="5" fill="${it.color}"/>\n`;
    s += `<text x="${legendX + 18}" y="${y + 5}" font-size="14" fill="#E8ECF8">${esc(it.name)}</text>\n`;
    s += `<text x="${legendX + 228}" y="${y + 5}" text-anchor="end" font-size="14" font-weight="600" fill="#8B94B3">${it.pct}%</text>\n`;
  });
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="26"/>\n`;
  let acc = 0;
  let t = delay;
  const total = 0.06 * DUR * 0.6; // duração total do preenchimento
  items.forEach((it) => {
    const len = Math.max(it.frac * C - (items.length > 1 ? gap : 0), 0.8);
    const off = -(acc + (items.length > 1 ? gap / 2 : 0));
    const dur = Math.max(it.frac * total * 2, 0.12);
    const name = kf(`0%,${pct(t)}{stroke-dasharray:0 ${C.toFixed(2)};animation-timing-function:linear}${pct(t + dur)},100%{stroke-dasharray:${len.toFixed(2)} ${C.toFixed(2)}}`);
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}" stroke-width="26" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" style="animation:${name} ${DUR}s infinite"/>\n`;
    acc += it.frac * C;
    t += dur;
  });
  const fade = kf(`0%,${pct(t)}{opacity:0;animation-timing-function:ease}${pct(t + 0.5)},100%{opacity:1}`);
  const top = items[0];
  s += `<g style="animation:${fade} ${DUR}s infinite"><text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="24" font-weight="800" fill="url(#numfill)">${top.pct}%</text><text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="12" fill="#8B94B3">${esc(top.name)}</text></g>\n`;
  return s;
}

function build(data) {
  const { createdAt, days, repos, commits } = data;
  const total = [...days.values()].reduce((a, b) => a + b, 0);
  const { current, longest } = computeStreaks(days);
  const sinceIso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(createdAt));

  const hours = Array(24).fill(0);
  for (const c of commits) hours[hourOf(c.date)]++;

  const byRepo = topShares(groupLang(repos.map((r) => r.primaryLanguage)));
  const byCommit = topShares(groupLang(commits.map((c) => c.lang)));

  let body = "";
  body += `<text x="40" y="54" font-size="27" font-weight="800" fill="#E8ECF8" letter-spacing="-0.4">GitHub stats</text>\n`;
  body += `<text x="40" y="78" font-size="14" fill="#8B94B3">${esc(DISPLAY_NAME)}, ${esc(ROLE)}</text>\n`;

  // Tile 1: total
  body += `<rect x="40" y="96" width="300" height="190" rx="20" fill="#FFFFFF" fill-opacity="0.04" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>\n`;
  body += `<text x="68" y="138" font-size="15" font-weight="600" fill="#8B94B3">Total de contribuições</text>\n`;
  const sizeTotal = String(total).length > 4 ? 58 : 72;
  body += odometer({ value: total, x: 68, baseline: 218, size: sizeTotal, colW: sizeTotal * 0.625, delay: 0, id: "total" }).svg;
  body += `<text x="68" y="260" font-size="13" font-weight="600" fill="#5EEAD4">${fmtDay(sinceIso, true)} até hoje</text>\n`;

  // Tile 2: sequência atual
  const C = 2 * Math.PI * 62;
  const ratio = longest.len ? current.len / longest.len : 0;
  const ringOff = (C * (1 - ratio)).toFixed(2);
  const ringKf = kf(`0%,${pct(0.65)}{stroke-dashoffset:${C.toFixed(2)};animation-timing-function:cubic-bezier(.2,.8,.2,1)}${pct(2.35)},100%{stroke-dashoffset:${ringOff}}`);
  body += `<rect x="360" y="96" width="480" height="190" rx="20" fill="#FFFFFF" fill-opacity="0.04" stroke="url(#tileEdge)" stroke-opacity="1" stroke-width="1.4"/>\n`;
  body += `<circle cx="472" cy="191" r="62" fill="none" stroke="#FFFFFF" stroke-opacity="0.1" stroke-width="10"/>\n`;
  body += `<circle cx="472" cy="191" r="62" fill="none" stroke="url(#ring)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${ringOff}" transform="rotate(-90 472 191)" filter="url(#glow)" style="animation:${ringKf} ${DUR}s infinite"/>\n`;
  if (current.len > 0) {
    const dotKf = kf(`0%,${pct(2.4)}{opacity:0;animation-timing-function:ease}${pct(2.8)},100%{opacity:1}`);
    body += `<circle class="dot" r="3.5" fill="#FFFFFF" style="animation:${dotKf} ${DUR}s infinite;opacity:1"><animateMotion dur="6s" repeatCount="indefinite" path="M 472,129 A 62,62 0 1,1 471.99,129"/></circle>\n`;
  }
  const curStr = String(current.len);
  const curSize = curStr.length > 3 ? 36 : 46;
  const curW = curStr.length * curSize * 0.63;
  body += odometer({ value: current.len, x: 472 - curW / 2, baseline: 207, size: curSize, colW: curSize * 0.63, delay: 0.15, id: "cur" }).svg;
  body += `<text x="472" y="229" text-anchor="middle" font-size="12" font-weight="600" fill="#8B94B3">dias</text>\n`;
  body += `<text x="574" y="174" font-size="19" font-weight="700" fill="#E8ECF8">Sequência atual</text>\n`;
  body += `<text x="574" y="200" font-size="14" fill="#5EEAD4" font-weight="600">${current.len ? `${fmtDay(current.start)} a ${fmtDay(current.end)}` : "Nenhuma sequência ativa"}</text>\n`;
  const note = current.len && current.len === longest.len ? "Igual à maior sequência" : `Maior sequência: ${longest.len} dias`;
  body += `<text x="574" y="228" font-size="13" fill="#8B94B3">${note}</text>\n`;

  // Tile 3: maior sequência
  body += `<rect x="860" y="96" width="300" height="190" rx="20" fill="#FFFFFF" fill-opacity="0.04" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>\n`;
  body += `<text x="888" y="138" font-size="15" font-weight="600" fill="#8B94B3">Maior sequência</text>\n`;
  const lg = odometer({ value: longest.len, x: 888, baseline: 218, size: 72, colW: 45, delay: 0.3, id: "long" });
  body += lg.svg;
  body += `<text x="${888 + lg.width + 10}" y="218" font-size="20" font-weight="600" fill="#8B94B3">dias</text>\n`;
  body += `<text x="888" y="260" font-size="13" font-weight="600" fill="#5EEAD4">${longest.len ? `${fmtDay(longest.start, true)} a ${fmtDay(longest.end, true)}` : "Sem dados ainda"}</text>\n`;

  // Commits por hora
  body += `<rect x="40" y="306" width="1120" height="200" rx="20" fill="#FFFFFF" fill-opacity="0.04" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>\n`;
  body += `<text x="68" y="344" font-size="17" font-weight="700" fill="#E8ECF8">Commits por hora</text>\n`;
  body += `<text x="1132" y="344" text-anchor="end" font-size="13" fill="#8B94B3">${esc(TZ_LABEL)}</text>\n`;
  const maxH = Math.max(...hours, 1);
  const stepRaw = maxH / 3;
  const mag = 10 ** Math.floor(Math.log10(stepRaw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= stepRaw);
  const yMax = step * 3;
  const y0 = 472, chartH = 78;
  for (let g = 0; g <= 3; g++) {
    const y = y0 - (chartH * g) / 3;
    body += `<line x1="100" y1="${y.toFixed(1)}" x2="1132" y2="${y.toFixed(1)}" stroke="#FFFFFF" stroke-opacity="${g ? 0.06 : 0.16}"/>\n`;
    body += `<text x="90" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#8B94B3">${+(step * g).toFixed(2)}</text>\n`;
  }
  // janela de 3 horas com mais commits
  let peak = 0, best = -1;
  for (let i = 0; i < 22; i++) { const s = hours[i] + hours[i + 1] + hours[i + 2]; if (s > best) { best = s; peak = i; } }
  const bx = (i) => 112.4 + i * 42.84;
  if (best > 0) {
    const pk = kf(`0%,${pct(2.6)}{opacity:0;animation-timing-function:ease}${pct(3.2)},100%{opacity:1}`);
    const x = bx(peak) - 5.4;
    body += `<g style="animation:${pk} ${DUR}s infinite"><rect x="${x.toFixed(1)}" y="358" width="122.5" height="118.0" rx="10" fill="#5EEAD4" fill-opacity="0.08"/><text x="${(x + 61.25).toFixed(1)}" y="374" text-anchor="middle" font-size="12" font-weight="600" fill="#5EEAD4">Horário de pico</text></g>\n`;
  }
  hours.forEach((v, i) => {
    const h = Math.max((v / yMax) * chartH, v ? 2.6 : 0);
    if (!h) return;
    const s = 1.5 + i * 0.04;
    const name = kf(`0%,${pct(s)}{transform:scaleY(0);animation-timing-function:cubic-bezier(.2,.8,.2,1)}${pct(s + 0.7)},100%{transform:scaleY(1)}`);
    const isPeak = best > 0 && i >= peak && i < peak + 3;
    body += `<rect class="b" x="${bx(i).toFixed(1)}" y="${(y0 - h).toFixed(1)}" width="26" height="${h.toFixed(1)}" rx="5" fill="url(#${isPeak ? "barPeak" : "bar"})" style="animation:${name} ${DUR}s infinite"/>\n`;
  });
  [0, 3, 6, 9, 12, 15, 18, 21, 23].forEach((i) => {
    body += `<text x="${(bx(i) + 13).toFixed(1)}" y="492" text-anchor="middle" font-size="11" fill="#8B94B3">${String(i).padStart(2, "0")}</text>\n`;
  });

  // Linguagens
  body += donut({ cx: 450, cy: 668, items: byRepo, delay: 2.4, legendX: 74, legendY: 611, title: "Linguagens por repositório", tileX: 40 });
  body += donut({ cx: 1020, cy: 668, items: byCommit, delay: 2.7, legendX: 644, legendY: 611, title: "Linguagens por commit", tileX: 610 });

  const updated = fmtDay(todayLocal(), true);
  body += `<text x="1160" y="54" text-anchor="end" font-size="12" fill="#5B6488">Atualizado em ${updated}</text>\n`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800" role="img" aria-labelledby="t d">
<title id="t">GitHub stats de ${esc(DISPLAY_NAME)}</title>
<desc id="d">Total de contribuições, sequência atual e maior sequência, commits por hora e linguagens por repositório e por commit.</desc>
<style>
text{font-family:'Segoe UI Variable Display','Segoe UI','SF Pro Display',Inter,system-ui,-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif;font-variant-numeric:tabular-nums}
.b{transform-box:fill-box;transform-origin:50% 100%}
#content{animation:master ${DUR}s infinite}
@keyframes master{0%{opacity:0}3%{opacity:1}93%{opacity:1}97%{opacity:0}100%{opacity:0}}
${keyframes.join("")}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.dot{display:none}}
</style>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A0F1F"/><stop offset="1" stop-color="#0F1530"/></linearGradient>
  <radialGradient id="glowA" cx="0.12" cy="0.05" r="0.55"><stop offset="0" stop-color="#7C5CFF" stop-opacity="0.28"/><stop offset="1" stop-color="#7C5CFF" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowB" cx="0.92" cy="0.98" r="0.5"><stop offset="0" stop-color="#22D3EE" stop-opacity="0.2"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0"/></radialGradient>
  <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#FFFFFF" fill-opacity="0.055"/></pattern>
  <linearGradient id="numfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9D2F5"/></linearGradient>
  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5EEAD4"/><stop offset="0.55" stop-color="#818CF8"/><stop offset="1" stop-color="#C084FC"/></linearGradient>
  <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B9BFF"/><stop offset="1" stop-color="#4338CA" stop-opacity="0.75"/></linearGradient>
  <linearGradient id="barPeak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CF3E0"/><stop offset="1" stop-color="#6366F1"/></linearGradient>
  <linearGradient id="tileEdge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5EEAD4" stop-opacity="0.55"/><stop offset="0.5" stop-color="#818CF8" stop-opacity="0.35"/><stop offset="1" stop-color="#C084FC" stop-opacity="0.55"/></linearGradient>
  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="frame"><rect width="1200" height="800" rx="28"/></clipPath>
</defs>
<g clip-path="url(#frame)">
  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect width="1200" height="800" fill="url(#dots)"/>
  <rect width="1200" height="800" fill="url(#glowA)"/>
  <rect width="1200" height="800" fill="url(#glowB)"/>
</g>
<rect x="0.5" y="0.5" width="1199" height="799" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.08"/>
<g id="content">
${body}</g>
</svg>
`;
}

const data = process.env.MOCK ? mockData() : await fetchData();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(process.env.OUT || OUT, build(data));
console.log("SVG gerado:", process.env.OUT || OUT);
