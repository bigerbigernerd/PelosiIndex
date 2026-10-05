// Canvas renderer for the live disclosure graph. Framework-free: React only mounts it and listens to events.
import {forceSimulation, forceManyBody, forceCollide, forceLink, forceX, forceY} from 'd3-force';

export const CAT_COLORS = ['#ff6a4d', '#f4b740', '#3ee08f', '#45c6ff', '#b18cff'];
const KIND_COLORS = {hold: [214, 226, 214], add: [62, 224, 143], new: [62, 224, 143], buy: [62, 224, 143],
  trim: [255, 93, 77], exit: [255, 93, 77], sell: [255, 93, 77], mixed: [244, 183, 64], other: [130, 145, 138]};
const FLOW = {add: 1, new: 1, buy: 1, trim: -1, exit: -1, sell: -1, mixed: 1};
const TAU = Math.PI * 2;
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

function glowSprite(rgb, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},0.9)`);
  grad.addColorStop(0.25, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export class GraphEngine {
  constructor(canvas, data, {atlas = null, atlasMeta = null, reducedMotion = false, english = false} = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: false});
    this.data = data;
    this.atlas = atlas;
    this.atlasMeta = atlasMeta;
    this.reduced = reducedMotion;
    this.english = english;
    this.listeners = {};
    this.hidden = new Set();          // hidden category indexes
    this.hover = null;
    this.selected = null;
    this.focusSet = null;
    this.cam = {x: 0, y: 0, k: 0.5};
    this.camTarget = null;
    this.t0 = performance.now();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.running = false;
    this.lastInput = 0;
    this.build();
    this.bindInput();
    this.resize();
    this.fit(false);
  }

  on(name, fn) { (this.listeners[name] ||= []).push(fn); return () => { this.listeners[name] = this.listeners[name].filter(f => f !== fn); }; }
  emit(name, value) { for (const fn of this.listeners[name] || []) fn(value); }

  build() {
    const {S, T, E, kinds} = this.data;
    const deg = new Array(T.length).fill(0);
    const sdeg = new Array(S.length).fill(0);
    for (const [s, t] of E) { deg[t]++; sdeg[s]++; }
    this.nodes = [
      ...S.map((s, i) => ({kind: 's', i, ref: s, c: s.c, x: s.x, y: s.y, r: 18 + Math.min(10, Math.sqrt(sdeg[i]) * 1.8), deg: sdeg[i],
        label: (this.english ? (s.en || s.n) : s.n), img: s.img, phase: Math.random() * TAU, color: CAT_COLORS[s.c]})),
      ...T.map((t, i) => ({kind: 't', i, ref: t, x: t.x, y: t.y, r: 5.5 + Math.sqrt(t.w || 0) * 5 + Math.min(7, Math.sqrt(deg[i]) * 1.3), deg: deg[i],
        label: t.t, img: t.img, phase: Math.random() * TAU, tone: [0, 0]})),
    ];
    this.nodes.forEach((n, idx) => { n.idx = idx; });
    const ns = S.length;
    this.links = E.map(([s, t, k, v]) => {
      const kind = kinds[k];
      const tn = this.nodes[ns + t];
      if (FLOW[kind] > 0) tn.tone[0]++; else if (FLOW[kind] < 0) tn.tone[1]++;
      return {source: this.nodes[s], target: tn, kind, v, rgb: KIND_COLORS[kind] || KIND_COLORS.hold, flow: FLOW[kind] || 0, off: Math.random()};
    });
    this.adj = this.nodes.map(() => []);
    this.links.forEach((l, idx) => { this.adj[l.source.idx].push(idx); this.adj[l.target.idx].push(idx); });
    this.glow = CAT_COLORS.map(c => glowSprite(hexRgb(c).join(',')));
    this.particleSprites = {up: glowSprite('62,224,143', 24), down: glowSprite('255,93,77', 24), mid: glowSprite('244,183,64', 24)};
    for (const n of this.nodes) if (n.kind === 't') n.ring = n.tone[0] > n.tone[1] ? [62, 224, 143] : n.tone[1] > n.tone[0] ? [255, 93, 77] : [214, 226, 214];

    this.sim = forceSimulation(this.nodes)
      .force('link', forceLink(this.links).distance(l => 70 + 90 / Math.sqrt(l.target.deg || 1)).strength(l => 0.5 / Math.sqrt(l.target.deg || 1)))
      .force('charge', forceManyBody().strength(d => d.kind === 's' ? -520 : -40 - 6 * Math.sqrt(d.deg)).distanceMax(900))
      .force('collide', forceCollide(d => d.r + (d.kind === 's' ? 12 : 3)).iterations(1))
      .force('x', forceX(0).strength(0.004))
      .force('y', forceY(0).strength(0.004))
      .force('drift', alpha => {               // gentle brownian swirl keeps the graph alive after it settles
        if (this.reduced) return;
        const t = (performance.now() - this.t0) / 1000;
        for (const n of this.nodes) {
          const a = n.kind === 's' ? 0.012 : 0.025;
          n.vx += Math.cos(t * 0.21 + n.phase) * a;
          n.vy += Math.sin(t * 0.17 + n.phase * 1.3) * a;
        }
      })
      .alpha(0.05).alphaTarget(this.reduced ? 0 : 0.012).alphaDecay(0.02).velocityDecay(0.45)
      .stop();
  }

  // ---------- camera
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.draw(performance.now());
  }

  bounds(nodes = this.nodes) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodes) { if (this.isHidden(n)) continue; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    return {x0, y0, x1, y1};
  }

  fit(animate = true, pad = 70) {
    const b = this.bounds();
    if (!isFinite(b.x0)) return;
    let k = Math.min((this.w - pad * 2) / (b.x1 - b.x0 || 1), (this.h - pad * 2) / (b.y1 - b.y0 || 1), 1.4);
    k *= 1.12;                                   // let the outer halo bleed past the edges; nodes read larger
    if (this.w < 720) k = Math.max(k, 0.3);      // phones: start closer and let people pan
    this.flyTo((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, Math.max(0.12, k), animate);
  }

  flyTo(x, y, k, animate = true) {
    if (!animate || this.reduced) { this.cam = {x, y, k}; this.camTarget = null; return; }
    this.camTarget = {x, y, k, from: {...this.cam}, t0: performance.now(), dur: 1400};
  }

  focusNode(n, k = 1.5) {
    if (!n) return;
    const nb = this.neighbors(n);
    const b = this.bounds([n, ...nb]);
    const pad = this.w < 720 ? 40 : 120;
    const fitK = Math.min((this.w - pad * 2 - (this.w > 900 ? 380 : 0)) / (b.x1 - b.x0 || 1), (this.h * (this.w <= 900 ? 0.38 : 1) - pad * 2) / (b.y1 - b.y0 || 1));
    const kk = Math.max(0.35, Math.min(k, fitK));
    // keep the focus clear of the detail drawer (right panel on desktop, bottom sheet on small screens)
    const sx = this.w > 900 ? 190 / kk : 0;
    const sy = this.w <= 900 ? this.h * 0.27 / kk : 0;
    this.flyTo((b.x0 + b.x1) / 2 + sx, (b.y0 + b.y1) / 2 + sy, kk);
  }

  toScreen(x, y) { return [(x - this.cam.x) * this.cam.k + this.w / 2, (y - this.cam.y) * this.cam.k + this.h / 2]; }
  toWorld(sx, sy) { return [(sx - this.w / 2) / this.cam.k + this.cam.x, (sy - this.h / 2) / this.cam.k + this.cam.y]; }

  // ---------- state
  isHidden(n) { return n.kind === 's' ? this.hidden.has(n.c) : this.hidden.size > 0 && this.adj[n.idx].every(i => this.hidden.has(this.links[i].source.c)); }
  neighbors(n) {
    return this.adj[n.idx].map(i => { const l = this.links[i]; return l.source === n ? l.target : l.source; });
  }
  setHidden(set) { this.hidden = new Set(set); }
  setSelected(n) {
    this.selected = n;
    this.focusSet = n ? new Set([n, ...this.neighbors(n)]) : null;
  }
  find(kind, key) { return this.nodes.find(n => n.kind === kind && (kind === 's' ? n.ref.id === key : n.ref.t === key)); }

  // ---------- input
  bindInput() {
    const c = this.canvas;
    const pointers = new Map();
    let drag = null, pinch = null, moved = 0;
    const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    this.onDown = e => {
      c.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, pos(e));
      this.lastInput = performance.now();
      this.camTarget = null;
      moved = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = {d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: this.cam.k};
        drag = null;
        return;
      }
      const [sx, sy] = pos(e);
      const hit = this.hit(sx, sy);
      drag = hit ? {node: hit, sx, sy} : {pan: true, sx, sy, cx: this.cam.x, cy: this.cam.y};
      if (hit) { hit.fx = hit.x; hit.fy = hit.y; }
    };
    this.onMove = e => {
      const [sx, sy] = pos(e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [sx, sy]);
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        this.cam.k = Math.max(0.1, Math.min(4, pinch.k * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d));
        this.lastInput = performance.now();
        return;
      }
      if (drag) {
        moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
        this.lastInput = performance.now();
        if (drag.pan) { this.cam.x = drag.cx - (sx - drag.sx) / this.cam.k; this.cam.y = drag.cy - (sy - drag.sy) / this.cam.k; }
        else { const [wx, wy] = this.toWorld(sx, sy); drag.node.fx = wx; drag.node.fy = wy; this.sim.alpha(Math.max(this.sim.alpha(), 0.12)); }
        return;
      }
      const hit = this.hit(sx, sy);
      if (hit !== this.hover) { this.hover = hit; c.style.cursor = hit ? 'pointer' : 'grab'; this.emit('hover', hit); }
    };
    this.onUp = e => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!drag) return;
      if (drag.node) { drag.node.fx = null; drag.node.fy = null; }
      if (moved < 6) {
        const n = drag.node || null;
        this.emit('select', n);
      }
      drag = null;
    };
    this.onWheel = e => {
      e.preventDefault();
      this.lastInput = performance.now();
      this.camTarget = null;
      const [sx, sy] = pos(e);
      const [wx, wy] = this.toWorld(sx, sy);
      const k = Math.max(0.1, Math.min(4, this.cam.k * Math.exp(-e.deltaY * 0.0015)));
      this.cam.k = k;
      this.cam.x = wx - (sx - this.w / 2) / k;
      this.cam.y = wy - (sy - this.h / 2) / k;
    };
    this.onLeave = () => { if (this.hover) { this.hover = null; this.emit('hover', null); } };
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('pointerleave', this.onLeave);
    c.addEventListener('wheel', this.onWheel, {passive: false});
  }

  hit(sx, sy) {
    const [wx, wy] = this.toWorld(sx, sy);
    let best = null, bd = Infinity;
    for (const n of this.nodes) {
      if (this.isHidden(n)) continue;
      const rr = Math.max(n.r, 9 / this.cam.k);
      const d = (n.x - wx) ** 2 + (n.y - wy) ** 2;
      if (d < rr * rr && d < bd) { bd = d; best = n; }
    }
    return best;
  }

  // ---------- loop
  start() {
    if (this.running) return;
    this.running = true;
    const loop = now => {
      if (!this.running) return;
      this.frame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  destroy() {
    this.stop();
    this.sim.stop();
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown); c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp); c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('pointerleave', this.onLeave); c.removeEventListener('wheel', this.onWheel);
  }

  frame(now) {
    if (!this.reduced || this.sim.alpha() > 0.01) this.sim.tick();
    if (this.camTarget) {
      const t = Math.min(1, (now - this.camTarget.t0) / this.camTarget.dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const f = this.camTarget.from;
      // zoom out slightly mid-flight for a cinematic arc
      const arc = 1 - 0.25 * Math.sin(Math.PI * e) * (Math.abs(Math.log(this.camTarget.k / f.k)) < 0.2 ? 1 : 0.4);
      this.cam = {x: f.x + (this.camTarget.x - f.x) * e, y: f.y + (this.camTarget.y - f.y) * e, k: (f.k + (this.camTarget.k - f.k) * e) * arc};
      if (t >= 1) { this.cam = {x: this.camTarget.x, y: this.camTarget.y, k: this.camTarget.k}; this.camTarget = null; }
    }
    this.draw(now);
  }

  draw(now) {
    const {ctx, cam, dpr} = this;
    if (!this.w) return;
    const time = (now - this.t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#070b0a';
    ctx.fillRect(0, 0, this.w, this.h);
    this.drawGrid(time);
    ctx.setTransform(dpr * cam.k, 0, 0, dpr * cam.k, dpr * (this.w / 2 - cam.x * cam.k), dpr * (this.h / 2 - cam.y * cam.k));
    const focus = this.focusSet || (this.hover ? new Set([this.hover, ...this.neighbors(this.hover)]) : null);
    const active = this.selected || this.hover;
    const k = cam.k;

    // edges
    ctx.lineCap = 'round';
    for (const l of this.links) {
      const s = l.source, t = l.target;
      if (this.hidden.has(s.c)) continue;
      const on = focus && (l.source === active || l.target === active);
      const dim = focus && !on;
      const a = on ? 0.75 : dim ? 0.025 : (l.kind === 'hold' ? 0.07 : 0.16);
      ctx.strokeStyle = `rgba(${l.rgb},${a})`;
      ctx.lineWidth = (on ? 1.6 : 0.8) / Math.max(0.6, k);
      const mx = (s.x + t.x) / 2 + (t.y - s.y) * 0.12, my = (s.y + t.y) / 2 - (t.x - s.x) * 0.12;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(mx, my, t.x, t.y); ctx.stroke();
    }

    // particles: money flowing along changed edges (subject→stock for buys/adds, stock→subject for sells/trims)
    if (!this.reduced) {
      ctx.globalCompositeOperation = 'lighter';
      for (const l of this.links) {
        if (!l.flow || this.hidden.has(l.source.c)) continue;
        const on = focus && (l.source === active || l.target === active);
        if (focus && !on) continue;
        const sprite = l.kind === 'mixed' ? this.particleSprites.mid : l.flow > 0 ? this.particleSprites.up : this.particleSprites.down;
        const count = on ? 3 : 1;
        for (let p = 0; p < count; p++) {
          let u = (time * 0.18 + l.off + p / count) % 1;
          if (l.flow < 0) u = 1 - u;
          const s = l.source, t = l.target;
          const mx = (s.x + t.x) / 2 + (t.y - s.y) * 0.12, my = (s.y + t.y) / 2 - (t.x - s.x) * 0.12;
          const x = (1 - u) ** 2 * s.x + 2 * (1 - u) * u * mx + u * u * t.x;
          const y = (1 - u) ** 2 * s.y + 2 * (1 - u) * u * my + u * u * t.y;
          const size = (on ? 14 : 9) / Math.max(0.7, k);
          ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // stocks
    const cell = this.atlasMeta?.size || 64;
    const cols = this.atlasMeta?.cols || 1;
    for (const n of this.nodes) {
      if (n.kind !== 't' || this.isHidden(n)) continue;
      const dim = focus && !focus.has(n);
      ctx.globalAlpha = dim ? 0.12 : 1;
      const breathe = this.reduced ? 0 : Math.sin(time * 1.3 + n.phase) * 0.6;
      const r = n.r + breathe * 0.3;
      ctx.fillStyle = '#0d1513';
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.fill();
      if (this.atlas && n.img >= 0 && r * k > 7) {
        const sx = (n.img % cols) * cell, sy = Math.floor(n.img / cols) * cell;
        ctx.drawImage(this.atlas, sx, sy, cell, cell, n.x - r * 0.86, n.y - r * 0.86, r * 1.72, r * 1.72);
      }
      else if (r * k > 13) {
        ctx.fillStyle = 'rgba(232,230,220,0.9)';
        ctx.font = `600 ${Math.min(r * 0.62, 11 / k * 1.2)}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(n.label.length > 5 ? n.label.slice(0, 5) : n.label, n.x, n.y + 0.5);
      }
      ctx.strokeStyle = `rgba(${n.ring},${n === active ? 1 : 0.7})`;
      ctx.lineWidth = (n === active ? 2.2 : 1.2) / Math.max(0.7, k);
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // subjects: glow halo + avatar coin + category ring
    for (const n of this.nodes) {
      if (n.kind !== 's' || this.hidden.has(n.c)) continue;
      const dim = focus && !focus.has(n);
      const pulse = this.reduced ? 0 : (Math.sin(time * 1.6 + n.phase) + 1) / 2;
      ctx.globalAlpha = dim ? 0.12 : 1;
      const halo = n.r * (n === active ? 4.2 : 2.6 + pulse * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (dim ? 0.05 : n === active ? 0.9 : 0.35 + pulse * 0.15);
      ctx.drawImage(this.glow[n.c], n.x - halo, n.y - halo, halo * 2, halo * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = dim ? 0.15 : 1;
      ctx.fillStyle = '#0b1210';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();
      if (this.atlas && n.img >= 0) {
        const sx = (n.img % cols) * cell, sy = Math.floor(n.img / cols) * cell;
        ctx.drawImage(this.atlas, sx, sy, cell, cell, n.x - n.r * 0.92, n.y - n.r * 0.92, n.r * 1.84, n.r * 1.84);
      } else {
        ctx.fillStyle = n.color;
        ctx.font = `600 ${n.r * 0.72}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(initials(n.ref.en || n.label), n.x, n.y + 1);
      }
      ctx.strokeStyle = n.color;
      ctx.lineWidth = (n === active ? 3 : 1.8) / Math.max(0.6, k);
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke();
      if (n === this.selected) {          // rotating target reticle
        ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(time * 0.8);
        ctx.strokeStyle = n.color; ctx.lineWidth = 1.2 / k;
        for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(0, 0, n.r + 9, q * Math.PI / 2 + 0.2, q * Math.PI / 2 + 1.2); ctx.stroke(); }
        ctx.restore();
      }
    }
    if (this.selected && this.selected.kind === 't') {
      const n = this.selected;
      ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(-time * 0.8);
      ctx.strokeStyle = '#e8e6dc'; ctx.lineWidth = 1.2 / k;
      for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(0, 0, n.r + 7, q * Math.PI / 2 + 0.2, q * Math.PI / 2 + 1.2); ctx.stroke(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // labels in screen space so text stays crisp at any zoom
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const placed = [];
    const order = this.labelOrder ||= [...this.nodes].sort((a, b) => (b.kind === 's') - (a.kind === 's') || b.deg - a.deg);
    const sorted = active ? [active, ...order.filter(n => n !== active)] : order;
    for (const n of sorted) {
      if (this.isHidden(n)) continue;
      const isS = n.kind === 's';
      const inFocus = focus ? focus.has(n) : false;
      if (focus && !inFocus) continue;
      if (!isS && !inFocus && k < 1.05 && !(k > 0.7 && n.deg >= 6)) continue;
      if (isS && !inFocus && k < 0.32) continue;
      const [x, y] = this.toScreen(n.x, n.y);
      if (x < -60 || y < -40 || x > this.w + 60 || y > this.h + 40) continue;
      const fs = isS ? Math.max(10, Math.min(13, 9 + k * 3)) : 10;
      ctx.font = isS ? `500 ${fs}px "PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif` : `600 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
      const yy = y + n.r * k + 5;
      const tw = ctx.measureText(n.label).width;
      const box = [x - tw / 2 - 2, yy - 1, x + tw / 2 + 2, yy + fs + 1];
      if (n !== active && placed.some(q => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) continue;
      placed.push(box);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(7,11,10,0.85)';
      ctx.strokeText(n.label, x, yy);
      ctx.fillStyle = isS ? (n === active ? n.color : 'rgba(232,230,220,0.92)') : (n === active ? '#fff' : 'rgba(200,212,204,0.8)');
      ctx.fillText(n.label, x, yy);
    }
  }

  drawGrid(time) {
    const {ctx, cam} = this;
    const step = 48 * cam.k < 18 ? 48 * 4 : 48;
    const s = step * cam.k;
    const ox = (this.w / 2 - cam.x * cam.k) % s, oy = (this.h / 2 - cam.y * cam.k) % s;
    ctx.fillStyle = 'rgba(214,226,214,0.07)';
    for (let x = ox; x < this.w; x += s) for (let y = oy; y < this.h; y += s) ctx.fillRect(x, y, 1, 1);
    if (!this.reduced) {            // slow scanning beam
      const bx = ((time * 60) % (this.w + 400)) - 200;
      const grad = ctx.createLinearGradient(bx - 120, 0, bx + 120, 0);
      grad.addColorStop(0, 'rgba(62,224,143,0)'); grad.addColorStop(0.5, 'rgba(62,224,143,0.025)'); grad.addColorStop(1, 'rgba(62,224,143,0)');
      ctx.fillStyle = grad; ctx.fillRect(bx - 120, 0, 240, this.h);
    }
  }
}

function initials(name) {
  const parts = String(name || '?').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/)
    .filter((w, i, all) => i === 0 || !/^(INC|LLC|LP|LLP|LTD|CO|CORP|GROUP|MANAGEMENT|MGMT|CAPITAL|ADVISORS|PARTNERS|HOLDINGS|THE|OF|AND)$/i.test(w) || all.length < 2);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || ''))).toUpperCase();
}
