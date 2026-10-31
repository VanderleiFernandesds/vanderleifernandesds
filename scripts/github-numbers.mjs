// Gera assets/github-numbers.svg ("GitHub em números") com dados reais do GitHub.
// Uso: GITHUB_TOKEN=... node scripts/github-numbers.mjs
// Teste local sem token: MOCK=1 node scripts/github-numbers.mjs

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
  const base = await gql(`query($login:String!){ user(login:$login){ createdAt } }`, { login: LOGIN });
  const days = new Map();
  let commits = 0;
  let from = new Date(base.user.createdAt);
  const now = new Date();
  while (from < now) {
    const to = new Date(Math.min(from.getTime() + 365 * 864e5, now.getTime()));
    const d = await gql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){ user(login:$login){ contributionsCollection(from:$from,to:$to){
        totalCommitContributions restrictedContributionsCount
        contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } } } }`,
      { login: LOGIN, from: from.toISOString(), to: to.toISOString() }
    );
    const c = d.user.contributionsCollection;
    commits += c.totalCommitContributions;
    for (const w of c.contributionCalendar.weeks)
      for (const day of w.contributionDays) days.set(day.date, Math.max(days.get(day.date) || 0, day.contributionCount));
    from = to;
  }

  const repos = [];
  let after = null;
  do {
    const d = await gql(
      `query($login:String!,$after:String){ user(login:$login){ repositories(first:50, after:$after, ownerAffiliations:OWNER, isFork:false){
        pageInfo{ hasNextPage endCursor }
        nodes{ stargazerCount forkCount languages(first:20){ edges{ size node{ name } } } } } } }`,
      { login: LOGIN, after }
    );
    const r = d.user.repositories;
    repos.push(...r.nodes);
    after = r.pageInfo.hasNextPage ? r.pageInfo.endCursor : null;
  } while (after);

  return { days, commits, repos };
}

function mockData() {
  const days = new Map();
  let seed = 11;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let t = Date.now() - 400 * 864e5; t <= Date.now(); t += 864e5) {
    days.set(new Date(t).toISOString().slice(0, 10), rnd() < 0.45 ? Math.floor(rnd() * 9) + 1 : 0);
  }
  const L = (name, size) => ({ size, node: { name } });
  const repos = [
    { stargazerCount: 5, forkCount: 2, languages: { edges: [L("TypeScript", 9000), L("CSS", 3000)] } },
    { stargazerCount: 8, forkCount: 3, languages: { edges: [L("JavaScript", 7000), L("HTML", 2500)] } },
    { stargazerCount: 5, forkCount: 1, languages: { edges: [L("TypeScript", 4000), L("Python", 1500), L("Shell", 300)] } },
  ];
  return { days, commits: 320, repos };
}

// ---------- SVG ----------

const W = 1752, H = 528;
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

function build({ days, commits, repos }) {
  const stars = repos.reduce((s, r) => s + r.stargazerCount, 0);
  const forks = repos.reduce((s, r) => s + r.forkCount, 0);

  // linguagens por bytes
  const bytes = new Map();
  for (const r of repos) for (const e of r.languages.edges) bytes.set(e.node.name, (bytes.get(e.node.name) || 0) + e.size);
  let langs = [...bytes.entries()].map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v);
  const totalBytes = langs.reduce((s, l) => s + l.v, 0) || 1;
  if (langs.length > 5) langs = [...langs.slice(0, 4), { name: "Outras", v: langs.slice(4).reduce((s, l) => s + l.v, 0) }];
  langs = langs.map((l, i) => ({ ...l, frac: l.v / totalBytes, color: LANG_PALETTE[l.name === "Outras" ? 4 : i] }));

  let b = "";

  // cabeçalho
  b += `<rect x="52" y="15" width="104" height="98" rx="22" fill="#0B1A33" stroke="${EDGE}" stroke-width="1.5"/>`;
  b += `<rect x="52" y="15" width="104" height="98" rx="22" fill="none" stroke="${BLUE}" stroke-opacity=".25" stroke-width="6" filter="url(#blur6)"/>`;
  b += `<g transform="translate(78 37) scale(3.25)"><path fill="${BLUE}" d="${GITHUB_PATH}"/></g>\n`;
  b += `<text x="182" y="58" font-size="44" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">GitHub em números</text>\n`;
  b += `<text x="183" y="99" font-size="24" fill="${C_MUTED}">Minha atividade, contribuições e evolução no GitHub.</text>\n`;

  // números
  const tiles = [
    [48, 424, "commit", fmt(commits), "Commits"],
    [495, 402, "repo", fmt(repos.length), "Repositórios"],
    [919, 410, "star", fmt(stars), "Stars recebidas"],
    [1352, 343, "commit", fmt(forks), "Forks"],
  ];
  tiles.forEach(([x, w, ic, num, label], i) => {
    b += `<g class="in" style="animation-delay:${(0.1 + i * 0.08).toFixed(2)}s">`;
    b += `<rect x="${x}" y="143" width="${w}" height="108" rx="22" fill="${TILE}" stroke="${EDGE}" stroke-width="1.5"/>`;
    b += icon(ic, x + 74, 194, 54);
    b += `<text x="${x + 150}" y="192" font-size="36" font-weight="800" fill="#FFFFFF">${num}</text>`;
    b += `<text x="${x + 150}" y="227" font-size="22" fill="${C_MUTED}">${label}</text></g>\n`;
  });

  // contribuições
  b += `<rect x="46" y="272" width="1024" height="244" rx="22" fill="${TILE}" stroke="${EDGE}" stroke-width="1.5"/>`;
  b += icon("calendar", 104, 306, 40);
  b += `<text x="144" y="314" font-size="23" fill="${C_TEXT}"><tspan font-weight="700">Contribuições</tspan> (últimos 12 meses)</text>\n`;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const end = new Date(today + "T12:00:00Z");
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - end.getUTCDay() - 52 * 7); // domingo de 52 semanas atrás
  const vals = [...days.entries()].filter(([d, v]) => v > 0 && d >= start.toISOString().slice(0, 10)).map(([, v]) => v).sort((a, b) => a - b);
  const q = (p) => vals.length ? vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] : 1;
  const th = [q(0.25), q(0.5), q(0.75)];
  const LEVEL = ["#111C30", "#0E3B7E", "#1660C9", "#1E8BFF", "#22D3EE"];
  const gx = 145, gy = 372, step = 16.9, cell = 13.2;
  let lastMonth = -1;
  for (let w = 0; w < 53; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setUTCDate(start.getUTCDate() + w * 7 + d);
      if (dt > end) continue;
      const iso = dt.toISOString().slice(0, 10);
      const v = days.get(iso) || 0;
      const lvl = v === 0 ? 0 : v <= th[0] ? 1 : v <= th[1] ? 2 : v <= th[2] ? 3 : 4;
      const glow = lvl === 4 ? ` filter="url(#cellGlow)"` : "";
      b += `<rect x="${(gx + w * step).toFixed(1)}" y="${(gy + d * 16.4).toFixed(1)}" width="${cell}" height="${cell}" rx="2.5" fill="${LEVEL[lvl]}"${glow}/>`;
      if (d === 0) {
        const m = dt.getUTCMonth();
        if (m !== lastMonth && dt.getUTCDate() <= 7 && w < 51) {
          b += `<text x="${(gx + w * step).toFixed(1)}" y="353" font-size="18" fill="${C_MUTED}">${MESES[m]}</text>`;
        }
        if (w === 0 || dt.getUTCDate() <= 7) lastMonth = m;
      }
    }
  }
  b += "\n";
  [["Seg", 1], ["Qua", 3], ["Sex", 5]].forEach(([l, d]) => {
    b += `<text x="84" y="${(gy + d * 16.4 + 11).toFixed(1)}" font-size="18" fill="${C_MUTED}">${l}</text>`;
  });
  b += "\n";

  // linguagens
  b += `<rect x="1094" y="272" width="604" height="244" rx="22" fill="${TILE}" stroke="${EDGE}" stroke-width="1.5"/>`;
  b += icon("code", 1148, 305, 40);
  b += `<text x="1188" y="314" font-size="23" font-weight="700" fill="${C_TEXT}">Linguagens mais usadas</text>\n`;
  const cx = 1263, cy = 421, r = 69, C = 2 * Math.PI * r;
  b += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity=".05" stroke-width="34"/>`;
  let acc = 0;
  langs.forEach((l, i) => {
    const len = l.frac * C;
    b += `<circle class="seg" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${l.color}" stroke-width="34" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" style="animation-delay:${(0.3 + i * 0.1).toFixed(1)}s"/>`;
    acc += len;
  });
  b += `<circle cx="${cx}" cy="${cy}" r="50" fill="#07101E"/><g transform="translate(${cx - 22} ${cy - 22}) scale(2.75)"><path fill="#C9D1D9" d="${GITHUB_PATH}"/></g>\n`;
  langs.forEach((l, i) => {
    const y = 346 + i * 33.5;
    b += `<circle cx="1418" cy="${y}" r="9" fill="${l.color}"/>`;
    b += `<text x="1440" y="${y + 7}" font-size="20" fill="${C_TEXT}">${esc(l.name)}</text>`;
    b += `<text x="1657" y="${y + 7}" text-anchor="end" font-size="20" fill="${C_TEXT}">${(l.frac * 100).toFixed(1).replace(".", ",")}%</text>`;
  });
  if (!langs.length) b += `<text x="1500" y="425" text-anchor="middle" font-size="18" fill="${C_DIM}">Sem dados ainda</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">GitHub em números</title>
<desc id="d">${fmt(commits)} commits, ${repos.length} repositórios, ${stars} stars recebidas, ${forks} forks. Linguagens: ${langs.map((l) => `${l.name} ${(l.frac * 100).toFixed(1)}%`).join(", ")}.</desc>
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
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
  <linearGradient id="fadeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="fadeH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".45" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff"/></linearGradient>
  <mask id="maskV"><rect width="${W}" height="150" fill="url(#fadeV)"/></mask>
  <mask id="maskH"><rect width="${W}" height="150" fill="url(#fadeH)"/></mask>
  <radialGradient id="glowTop" cx=".75" cy="0" r=".6"><stop offset="0" stop-color="#1E6BFF" stop-opacity=".35"/><stop offset="1" stop-color="#1E6BFF" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowBottom" cx=".2" cy="1" r=".6"><stop offset="0" stop-color="#1E6BFF" stop-opacity=".12"/><stop offset="1" stop-color="#1E6BFF" stop-opacity="0"/></radialGradient>
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
