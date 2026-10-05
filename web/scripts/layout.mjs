// Precompute a settled force layout at build time so the hero graph is fully formed on first paint.
// Usage: node scripts/layout.mjs <graph-nolayout.json> <graph.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {forceSimulation, forceManyBody, forceCollide, forceLink, forceX, forceY} from 'd3-force';

const [input, output] = process.argv.slice(2);
const g = JSON.parse(readFileSync(input, 'utf8'));
const R = 760;
const anchors = g.cats.map((_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / g.cats.length;
  return {x: Math.cos(a) * R, y: Math.sin(a) * R};
});
const deg = new Array(g.T.length).fill(0);
for (const [, t] of g.E) deg[t]++;
const nodes = [
  ...g.S.map((s, i) => ({id: 's' + i, kind: 's', c: s.c, x: anchors[s.c].x + (Math.random() - 0.5) * 200, y: anchors[s.c].y + (Math.random() - 0.5) * 200})),
  ...g.T.map((t, i) => ({id: 't' + i, kind: 't', w: t.w, d: deg[i], x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300})),
];
const links = g.E.map(([s, t]) => ({source: 's' + s, target: 't' + t}));
// seed stocks near the mean of their holders' anchors so cross-category stocks land between clusters
const pull = new Map();
for (const [s, t] of g.E) {
  const p = pull.get(t) || {x: 0, y: 0, n: 0};
  p.x += anchors[g.S[s].c].x; p.y += anchors[g.S[s].c].y; p.n++; pull.set(t, p);
}
for (const [t, p] of pull) { const n = nodes[g.S.length + t]; n.x = p.x / p.n * 0.7 + (Math.random() - 0.5) * 120; n.y = p.y / p.n * 0.7 + (Math.random() - 0.5) * 120; }

const sim = forceSimulation(nodes)
  .force('link', forceLink(links).id(d => d.id).distance(l => 70 + 90 / Math.sqrt(l.target.d)).strength(l => 0.5 / Math.sqrt(l.target.d)))
  .force('charge', forceManyBody().strength(d => d.kind === 's' ? -520 : -40 - 6 * Math.sqrt(d.d)).distanceMax(900))
  .force('collide', forceCollide(d => d.kind === 's' ? 30 : 7 + Math.sqrt(d.w || 0) * 7 + Math.min(6, d.d)).iterations(2))
  .force('x', forceX(d => d.kind === 's' ? anchors[d.c].x : 0).strength(d => d.kind === 's' ? 0.07 : 0.012))
  .force('y', forceY(d => d.kind === 's' ? anchors[d.c].y : 0).strength(d => d.kind === 's' ? 0.07 : 0.012))
  .stop();
for (let i = 0; i < 700; i++) sim.tick();

g.S.forEach((s, i) => { s.x = Math.round(nodes[i].x); s.y = Math.round(nodes[i].y); });
g.T.forEach((t, i) => { const n = nodes[g.S.length + i]; t.x = Math.round(n.x); t.y = Math.round(n.y); });
writeFileSync(output, JSON.stringify(g));
console.log(`layout: ${g.S.length} subjects, ${g.T.length} stocks, ${g.E.length} edges -> ${output}`);
