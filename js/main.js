document.addEventListener('DOMContentLoaded', () => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ========== Scroll-spy ==========
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link[data-section]');
  const setActiveNav = (id) => navLinks.forEach(l => l.classList.toggle('nav__link--active', l.dataset.section === id));
  setActiveNav('home');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) setActiveNav(e.target.id); });
  }, { threshold: 0.15, rootMargin: '-90px 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  // ========== Menu (phones: full glass sheet) ==========
  const toggle = document.getElementById('nav-toggle');
  const navLinksList = document.getElementById('nav-links');
  const navScrim = document.getElementById('nav-scrim');
  if (toggle && navLinksList) {
    toggle.setAttribute('aria-expanded', 'false');
    const setMenuOpen = (open) => {
      navLinksList.classList.toggle('nav__links--open', open);
      toggle.classList.toggle('nav__toggle--active', open);
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setMenuOpen(!navLinksList.classList.contains('nav__links--open')));
    navLinksList.querySelectorAll('.nav__link').forEach(l => l.addEventListener('click', () => setMenuOpen(false)));
    navLinksList.addEventListener('click', (e) => { if (e.target === navLinksList) setMenuOpen(false); });
    if (navScrim) navScrim.addEventListener('click', () => setMenuOpen(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenuOpen(false); });
  }

  // ========== Scroll reveal (hidden state lives behind html.js) ==========
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add(entry.target.classList.contains('reveal-stagger') ? 'reveal-stagger--visible' : 'reveal--visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => revealObserver.observe(el));

  // ========== Abstract toggle (CSS grid-rows animation; the class is the whole state) ==========
  document.querySelectorAll('.abstract-toggle').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const abstract = btn.nextElementSibling;
      if (!abstract || !abstract.classList.contains('abstract-content')) return;
      const isOpen = abstract.classList.toggle('abstract-content--open');
      btn.textContent = isOpen ? 'Hide Abstract' : 'Show Abstract';
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // ========== Glass spotlight: the pane's edge lights where the pointer is ==========
  if (finePointer) {
    document.querySelectorAll('.glass:not(.nav)').forEach(pane => {
      pane.addEventListener('pointermove', (e) => {
        const r = pane.getBoundingClientRect();
        pane.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        pane.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      pane.addEventListener('pointerenter', () => pane.classList.add('is-lit'));
      pane.addEventListener('pointerleave', () => pane.classList.remove('is-lit'));
    });
  }

  // =====================================================================
  //  HERO TERMINAL — live GBM price paths over a Brownian particle swarm
  // =====================================================================
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const trail = document.createElement('canvas');          // offscreen buffer that keeps the swarm's fading trails
  const tctx = trail.getContext('2d');
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0, small = false;

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); small = W < 768;
    for (const [c, g] of [[canvas, ctx], [trail, tctx]]) {
      c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }
  resize();

  function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- pointer / attractor ----
  const pointer = { x: 0, y: 0, active: false, tx: 0, ty: 0 };
  const parallax = { tx: 0, ty: 0, x: 0, y: 0 };
  if (finePointer) {
    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = e.clientX - r.left; pointer.ty = e.clientY - r.top;
      pointer.active = pointer.tx >= 0 && pointer.tx <= W && pointer.ty >= 0 && pointer.ty <= H;
      parallax.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      parallax.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { pointer.active = false; });
    document.addEventListener('mouseleave', () => { pointer.active = false; });
  }

  // ---- price paths: geometric Brownian motion, rolling window, adaptive scale ----
  const STEP_PX = 6;
  const PATHS = [
    { yc: 0.30, band: 0.25, rgb: [130, 210, 255], width: 2.0, alpha: 1.0, sigma: 0.011, mu: 0.00035, fill: true,  label: 'S' },
    { yc: 0.22, band: 0.16, rgb: [55, 155, 235],  width: 1.3, alpha: 0.55, sigma: 0.015, mu: 0.0002,  fill: false, label: 'σ 0.22' },
    { yc: 0.41, band: 0.12, rgb: [40, 120, 210],  width: 1.1, alpha: 0.40, sigma: 0.009, mu: 0.0003,  fill: false, label: 'σ 0.12' },
  ];
  const paths = [];
  function gbmStep(s, cfg) {
    const jump = Math.random() < 0.012 ? randn() * 2.6 * cfg.sigma * s : 0;
    return s * Math.exp(cfg.mu - 0.5 * cfg.sigma * cfg.sigma + cfg.sigma * randn()) + jump;
  }
  function initPaths() {
    paths.length = 0;
    const count = Math.ceil(W / STEP_PX) + 4;
    PATHS.forEach((cfg, i) => {
      const v = [100]; for (let k = 1; k < count; k++) v.push(gbmStep(v[k - 1], cfg));
      const lo = Math.min(...v), hi = Math.max(...v);
      paths.push({ cfg, v, offset: 0, lo, hi, tag: tags[i] });
    });
  }
  function updatePaths(dt) {
    for (const p of paths) {
      p.offset += 0.6 * dt;
      while (p.offset >= STEP_PX) { p.offset -= STEP_PX; p.v.shift(); p.v.push(gbmStep(p.v[p.v.length - 1], p.cfg)); }
      let lo = Infinity, hi = -Infinity; for (const x of p.v) { if (x < lo) lo = x; if (x > hi) hi = x; }
      p.lo = lerp(p.lo, lo, 0.04 * dt); p.hi = lerp(p.hi, hi, 0.04 * dt);   // the chart re-scales gently, never jumps
    }
  }
  function pathY(p, val) { const r = (p.hi - p.lo) || 1; return H * p.cfg.yc - ((val - p.lo) / r - 0.5) * H * p.cfg.band; }

  // Price tags (DOM) along the right edge
  const tagWrap = document.getElementById('price-tags');
  const tags = PATHS.map(cfg => {
    const el = document.createElement('div'); el.className = 'price-tag';
    el.innerHTML = `<span class="price-tag__label">${cfg.label}</span><span class="price-tag__value"></span><span class="price-tag__chg"></span>`;
    if (tagWrap) tagWrap.appendChild(el);
    return { el, val: el.children[1], chg: el.children[2], y: 0 };
  });
  let tagTick = 0;
  function updateTags() {
    if (!tagWrap || (++tagTick % 8)) return;
    const ys = [];
    for (const p of paths) {
      const n = p.v.length; const last = p.v[n - 2], first = p.v[0];
      const y = pathY(p, last) + parallax.y * 6;
      p.tag.y = y; p.tag.val.textContent = last.toFixed(2);
      const c = (last / first - 1) * 100;
      p.tag.chg.textContent = (c >= 0 ? '+' : '') + c.toFixed(2) + '%';
      p.tag.chg.className = 'price-tag__chg ' + (c >= 0 ? 'price-tag__chg--up' : 'price-tag__chg--down');
      ys.push(p.tag);
    }
    ys.sort((a, b) => a.y - b.y);                                       // keep tags from overlapping
    for (let i = 1; i < ys.length; i++) if (ys[i].y - ys[i - 1].y < 28) ys[i].y = ys[i - 1].y + 28;
    ys.forEach(t => { t.el.style.top = t.y.toFixed(1) + 'px'; });
  }

  function drawGrid() {
    ctx.save(); ctx.setLineDash([2, 6]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(120, 180, 240, 0.10)';
    for (const f of [0.14, 0.26, 0.38, 0.50]) { ctx.beginPath(); ctx.moveTo(0, H * f); ctx.lineTo(W, H * f); ctx.stroke(); }
    ctx.restore();
  }

  function drawPaths(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const p of paths) {
      const { rgb, width, alpha } = p.cfg; const col = rgb.join(',');
      const n = p.v.length; const px = new Float32Array(n), py = new Float32Array(n);
      for (let i = 0; i < n; i++) { px[i] = i * STEP_PX - p.offset + parallax.x * 8; py[i] = pathY(p, p.v[i]) + parallax.y * 6; }
      const trace = () => { ctx.beginPath(); ctx.moveTo(px[0], py[0]); for (let i = 1; i < n; i++) ctx.lineTo(px[i], py[i]); };
      if (p.cfg.fill) {
        const top = H * (p.cfg.yc - p.cfg.band * 0.5), bottom = H * (p.cfg.yc + p.cfg.band * 0.9);
        const g = ctx.createLinearGradient(0, top, 0, bottom);
        g.addColorStop(0, `rgba(${col},${0.26 * intro})`); g.addColorStop(1, `rgba(${col},0)`);
        trace(); ctx.lineTo(px[n - 1], bottom); ctx.lineTo(px[0], bottom); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      }
      ctx.globalAlpha = alpha * intro;
      trace(); ctx.strokeStyle = `rgba(${col},0.22)`; ctx.lineWidth = width + 5; ctx.stroke();   // bloom
      trace(); ctx.strokeStyle = `rgba(${col},0.95)`; ctx.lineWidth = width; ctx.stroke();        // line
      // lead dot: the last on-screen sample, pulsing
      let i = n - 1; while (i > 0 && px[i] > W) i--;
      const pulse = 2.4 + Math.sin(t * 0.004 + p.cfg.yc * 20) * 0.8;
      ctx.beginPath(); ctx.arc(px[i], py[i], pulse * 3, 0, Math.PI * 2); ctx.fillStyle = `rgba(${col},0.18)`; ctx.fill();
      ctx.beginPath(); ctx.arc(px[i], py[i], pulse, 0, Math.PI * 2); ctx.fillStyle = 'rgba(223,243,255,0.95)'; ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ---- swarm: Brownian particles in a slow flow field, trails, a vortex at the pointer ----
  const N = small ? 90 : 220;
  const swarm = [];
  const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(140,210,255,0.9)'); r.addColorStop(0.3, 'rgba(90,180,255,0.35)'); r.addColorStop(1, 'rgba(60,150,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 32, 32); return c; })();
  function spawn() { const z = 0.3 + Math.random() * 0.7; return { x: Math.random() * W, y: Math.random() * H * 0.9, px: 0, py: 0, vx: 0, vy: 0, z }; }
  for (let i = 0; i < N; i++) { const p = spawn(); p.px = p.x; p.py = p.y; swarm.push(p); }

  const attractor = { x: 0, y: 0, r: small ? 170 : 260 };
  function flowAngle(x, y, t) {
    return Math.sin(x * 0.0045 + t * 0.00025) + Math.cos(y * 0.0052 - t * 0.0002) + Math.sin((x + y) * 0.0025 + t * 0.0003);
  }
  function updateSwarm(t, dt) {
    pointer.x = lerp(pointer.x, pointer.tx, 0.18 * dt); pointer.y = lerp(pointer.y, pointer.ty, 0.18 * dt);
    if (pointer.active) { attractor.x = pointer.x; attractor.y = pointer.y; }
    else { attractor.x = W * (0.5 + 0.36 * Math.sin(t * 0.00021)); attractor.y = H * 0.32 * (1 + 0.45 * Math.sin(t * 0.00031 + 1.3)); }
    for (const p of swarm) {
      p.px = p.x; p.py = p.y;
      const a = flowAngle(p.x, p.y, t);
      const sp = 0.28 * p.z;
      p.vx += Math.cos(a) * sp * 0.08 + randn() * 0.1;
      p.vy += Math.sin(a) * sp * 0.08 + randn() * 0.1;
      const dx = attractor.x - p.x, dy = attractor.y - p.y, d = Math.hypot(dx, dy);
      if (d < attractor.r && d > 2) {
        const f = (1 - d / attractor.r) * (pointer.active ? 1 : 0.55) * p.z;
        p.vx += (-dy / d) * f * 0.75 + (dx / d) * f * 0.12;             // swirl + a little pull
        p.vy += ( dx / d) * f * 0.75 + (dy / d) * f * 0.12;
      }
      p.vx *= 0.9; p.vy *= 0.9;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -20) { p.x = W + 20; p.px = p.x; } if (p.x > W + 20) { p.x = -20; p.px = p.x; }
      if (p.y < -20) { p.y = H + 20; p.py = p.y; }  if (p.y > H + 20) { p.y = -20; p.py = p.y; }
    }
  }
  function drawSwarm(t) {
    // fade the trail buffer a little, then stroke each particle's last step into it
    tctx.save(); tctx.globalCompositeOperation = 'destination-out'; tctx.fillStyle = 'rgba(0,0,0,0.085)'; tctx.fillRect(0, 0, W, H); tctx.restore();
    tctx.save(); tctx.globalCompositeOperation = 'lighter'; tctx.lineCap = 'round';
    for (const p of swarm) {
      const dim = p.y > H * 0.62 ? Math.max(0.15, 1 - (p.y - H * 0.62) / (H * 0.38)) : 1;
      tctx.strokeStyle = `rgba(110,195,255,${(0.32 * p.z * dim * intro).toFixed(3)})`; tctx.lineWidth = 0.6 + 1.4 * p.z;
      tctx.beginPath(); tctx.moveTo(p.px, p.py); tctx.lineTo(p.x, p.y); tctx.stroke();
    }
    tctx.restore();
    ctx.drawImage(trail, 0, 0, W, H);

    // connections ignite only around the attractor
    const near = []; for (const p of swarm) { if (Math.hypot(p.x - attractor.x, p.y - attractor.y) < attractor.r) near.push(p); if (near.length > 70) break; }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 0.6;
    const strength = pointer.active ? 0.5 : 0.22;
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
      const a = near[i], b = near[j]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 95) { ctx.strokeStyle = `rgba(140,210,255,${((1 - d / 95) * strength * intro).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    // the points themselves: bloom sprite + core, parallax by depth
    for (const p of swarm) {
      const x = p.x + parallax.x * 14 * p.z, y = p.y + parallax.y * 10 * p.z;
      const dim = p.y > H * 0.62 ? Math.max(0.15, 1 - (p.y - H * 0.62) / (H * 0.38)) : 1;
      const s = (6 + 14 * p.z); ctx.globalAlpha = 0.55 * p.z * dim * intro;
      ctx.drawImage(glow, x - s / 2, y - s / 2, s, s);
      ctx.globalAlpha = (0.45 + 0.5 * p.z) * dim * intro; ctx.fillStyle = '#dff3ff';
      ctx.beginPath(); ctx.arc(x, y, 0.5 + 1.1 * p.z, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  // ---- loop ----
  let intro = 0, raf = null, last = 0, heroVisible = true;
  initPaths();
  window.addEventListener('resize', () => {
    if (Math.abs(canvas.parentElement.getBoundingClientRect().width - W) < 1) return;   // phone address-bar resizes: ignore
    resize(); initPaths(); for (const p of swarm) { const q = spawn(); Object.assign(p, q, { px: q.x, py: q.y }); } tctx.clearRect(0, 0, W, H);
  });

  const hero = document.getElementById('home');
  if (hero) new IntersectionObserver((entries) => entries.forEach(e => { heroVisible = e.isIntersecting; if (heroVisible && !raf && !reduceMotion) { last = 0; raf = requestAnimationFrame(frame); } }), { threshold: 0.01 }).observe(hero);

  function frame(t) {
    if (!heroVisible) { raf = null; return; }
    const dt = last ? Math.min(2.2, (t - last) / 16.67) : 1; last = t;
    intro = Math.min(1, intro + 0.02 * dt);
    parallax.x = lerp(parallax.x, parallax.tx, 0.05 * dt); parallax.y = lerp(parallax.y, parallax.ty, 0.05 * dt);
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    updateSwarm(t, dt); drawSwarm(t);
    updatePaths(dt); drawPaths(t); updateTags();
    raf = requestAnimationFrame(frame);
  }
  if (reduceMotion) { intro = 1; drawGrid(); drawSwarm(0); drawPaths(0); tagTick = 7; updateTags(); }
  else raf = requestAnimationFrame(frame);
});
