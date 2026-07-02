document.addEventListener('DOMContentLoaded', () => {

  // ========== Scroll-Spy Navigation ==========
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link[data-section]');

  function setActiveNav(sectionId) {
    navLinks.forEach(link => {
      if (link.dataset.section === sectionId) {
        link.classList.add('nav__link--active');
      } else {
        link.classList.remove('nav__link--active');
      }
    });
  }

  // Set "Home" as active by default
  setActiveNav('home');

  const scrollSpyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setActiveNav(entry.target.id);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '-70px 0px -50% 0px'
  });

  sections.forEach(section => {
    scrollSpyObserver.observe(section);
  });

  // ========== Mobile Menu Toggle ==========
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

    toggle.addEventListener('click', () => {
      setMenuOpen(!navLinksList.classList.contains('nav__links--open'));
    });

    // Close on: link tap, scrim (outside) tap, or Escape key
    navLinksList.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => setMenuOpen(false));
    });
    if (navScrim) navScrim.addEventListener('click', () => setMenuOpen(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    });
  }

  // ========== Scroll-Triggered Reveal Animations ==========
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.classList.contains('reveal-stagger')) {
          entry.target.classList.add('reveal-stagger--visible');
        } else {
          entry.target.classList.add('reveal--visible');
        }
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
    observer.observe(el);
  });

  // ========== Abstract Toggle ==========
  // Height is driven from the content's own scrollHeight so the FULL abstract
  // is revealed at any viewport width (no fixed max-height cap that clips text).
  const openAbstracts = [];

  document.querySelectorAll('.abstract-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const abstract = btn.nextElementSibling;
      if (!abstract || !abstract.classList.contains('abstract-content')) return;

      const isOpen = abstract.classList.toggle('abstract-content--open');
      if (isOpen) {
        abstract.style.maxHeight = abstract.scrollHeight + 'px';
        if (!openAbstracts.includes(abstract)) openAbstracts.push(abstract);
      } else {
        abstract.style.maxHeight = null;
      }
      btn.textContent = isOpen ? 'Hide Abstract' : 'Show Abstract';
    });
  });

  // Re-measure open abstracts when the layout reflows (rotate / resize)
  window.addEventListener('resize', () => {
    openAbstracts.forEach(abstract => {
      if (abstract.classList.contains('abstract-content--open')) {
        abstract.style.maxHeight = 'none';
        const full = abstract.scrollHeight;
        abstract.style.maxHeight = full + 'px';
      }
    });
  });

  // ========== Hero Canvas: Particles + Brownian Motion ==========
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H;
  const DPR = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();

  // --- Utility: Box-Muller for Gaussian random ---
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // ==========================================
  //  SHARED STATE: pointer, parallax, intro fade
  // ==========================================
  const isSmallScreen = window.innerWidth < 768;

  // Pointer position in canvas coordinates (drives interaction + spotlight)
  const pointer = { x: 0, y: 0, active: false };
  // Parallax: eased offset (-1..1 of viewport) → subtle depth shift on mouse-move
  const parallax = { tx: 0, ty: 0, x: 0, y: 0 };

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = pointer.x >= 0 && pointer.x <= W && pointer.y >= 0 && pointer.y <= H;
    parallax.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    parallax.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('mouseout', () => { pointer.active = false; });

  let intro = 0;       // 0→1 entrance fade
  let pathPhase = 0;   // frame counter for the pulsing lead dots

  // ==========================================
  //  GLOW SPRITE — cached radial-gradient bloom (drawImage is cheaper
  //  and softer than per-frame arc fills)
  // ==========================================
  function makeGlowSprite(rgb) {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(' + rgb + ', 0.9)');
    grd.addColorStop(0.25, 'rgba(' + rgb + ', 0.35)');
    grd.addColorStop(1, 'rgba(' + rgb + ', 0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  }
  const GLOW_SPRITES = [
    makeGlowSprite('120, 205, 255'),
    makeGlowSprite('55, 179, 237'),
    makeGlowSprite('20, 157, 221'),
  ];

  // ==========================================
  //  PARTICLES — depth-layered field (z drives size, brightness, parallax)
  // ==========================================
  const PARTICLE_COUNT = isSmallScreen ? 72 : 150;   // fuller field, kept airy via motion
  const CONNECTION_DIST = isSmallScreen ? 115 : 150;  // keep the network legible
  const INTERACT = isSmallScreen ? 90 : 150;   // pointer influence radius
  const particles = [];

  function spawnParticle() {
    const z = 0.35 + Math.random() * 0.65;     // depth: 0.35 (far) .. 1 (near)
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      z,
      r: (0.8 + Math.random() * 1.7) * z,       // near particles larger
      alpha: (0.12 + Math.random() * 0.18) * (0.55 + z * 0.45),
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      sprite: GLOW_SPRITES[Math.floor(Math.random() * GLOW_SPRITES.length)],
      cr: 40 + Math.floor(Math.random() * 70),
      cg: 165 + Math.floor(Math.random() * 40),
      cb: 210 + Math.floor(Math.random() * 45),
      _x: 0, _y: 0,
    };
  }
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawnParticle());

  function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // Brownian drift (livelier — larger step, lighter damping below)
      p.vx += randn() * 0.07;
      p.vy += randn() * 0.07;

      // Gentle attraction toward the pointer (near-layer particles react more)
      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < INTERACT * INTERACT && d2 > 4) {
          const d = Math.sqrt(d2);
          const force = (1 - d / INTERACT) * 0.045 * p.z;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }

      p.vx *= 0.97;
      p.vy *= 0.97;
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;
    }
  }

  function drawParticles() {
    // Parallax-adjusted draw coordinates (near layers shift more)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p._x = p.x + parallax.x * 18 * p.z;
      p._y = p.y + parallax.y * 12 * p.z;
    }

    // Particle-to-particle connections, brightened near the pointer
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a._x - b._x;
        const dy = a._y - b._y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          let opacity = (1 - dist / CONNECTION_DIST) * 0.06;
          if (pointer.active) {
            const mx = (a._x + b._x) / 2, my = (a._y + b._y) / 2;
            const pd = Math.hypot(pointer.x - mx, pointer.y - my);
            if (pd < INTERACT) opacity += (1 - pd / INTERACT) * 0.18;
          }
          ctx.beginPath();
          ctx.moveTo(a._x, a._y);
          ctx.lineTo(b._x, b._y);
          ctx.strokeStyle = 'rgba(110, 195, 245, ' + opacity * intro + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // Constellation lines from the pointer to nearby particles
    if (pointer.active) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pd = Math.hypot(pointer.x - p._x, pointer.y - p._y);
        if (pd < INTERACT) {
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(p._x, p._y);
          ctx.strokeStyle = 'rgba(130, 210, 255, ' + (1 - pd / INTERACT) * 0.22 * intro + ')';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    // Glowing dots: soft bloom sprite + crisp core
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const glowR = p.r * 7;
      ctx.globalAlpha = Math.min(1, p.alpha * intro * 1.2);
      ctx.drawImage(p.sprite, p._x - glowR, p._y - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p._x, p._y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.cr + ',' + p.cg + ',' + p.cb + ',' + Math.min(1, (p.alpha + 0.4) * intro) + ')';
      ctx.fill();
    }
  }

  // ==========================================
  //  FLOWING PRICE PATHS — mean-reverting (Ornstein–Uhlenbeck) streams that
  //  scroll continuously like a live feed, with glow + a pulsing lead dot.
  // ==========================================
  const PATHS = [
    { color: '120, 205, 255', width: 2.2, glow: 14, startY: 0.60, theta: 0.020, amp: 0.11 },
    { color: '55, 179, 237',  width: 1.6, glow: 10, startY: 0.34, theta: 0.032, amp: 0.085 },
  ];
  const STEP_PX = 7;        // horizontal spacing between samples
  const SCROLL_PX = 0.45;   // leftward scroll per frame
  const pathData = [];

  // OU step around 0 → bounded, stationary-looking wander (unit variance)
  function nextOU(prev, theta) {
    const sigma = Math.sqrt(2 * theta);
    const v = prev * (1 - theta) + sigma * randn();
    return Math.max(-3.5, Math.min(3.5, v));
  }

  function initPaths() {
    pathData.length = 0;
    const count = Math.ceil(W / STEP_PX) + 3;
    for (const cfg of PATHS) {
      const values = new Array(count);
      values[0] = 0;
      for (let i = 1; i < count; i++) values[i] = nextOU(values[i - 1], cfg.theta);
      pathData.push({ cfg, values, offset: 0 });
    }
  }

  function updatePaths() {
    for (const pd of pathData) {
      pd.offset += SCROLL_PX;
      while (pd.offset >= STEP_PX) {
        pd.offset -= STEP_PX;
        pd.values.shift();
        pd.values.push(nextOU(pd.values[pd.values.length - 1], pd.cfg.theta));
      }
    }
  }

  function drawPaths() {
    for (const pd of pathData) {
      const cfg = pd.cfg;
      const centerY = H * cfg.startY;
      const band = H * cfg.amp;
      const vals = pd.values;

      const pts = new Array(vals.length);
      for (let i = 0; i < vals.length; i++) {
        pts[i] = {
          x: i * STEP_PX - pd.offset + parallax.x * 10,
          y: centerY - vals[i] * band + parallax.y * 6,
        };
      }

      // Smooth curve with glow + left-edge fade gradient
      ctx.save();
      ctx.shadowColor = 'rgba(' + cfg.color + ', 0.55)';
      ctx.shadowBlur = cfg.glow;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(' + cfg.color + ', 0)');
      grad.addColorStop(0.12, 'rgba(' + cfg.color + ', ' + 0.32 * intro + ')');
      grad.addColorStop(1, 'rgba(' + cfg.color + ', ' + 0.55 * intro + ')');
      ctx.strokeStyle = grad;
      ctx.lineWidth = cfg.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();

      // Pulsing lead dot at the right-most on-screen point
      let lead = pts[0];
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].x <= W) lead = pts[i]; else break;
      }
      const pulse = 2.2 + Math.sin(pathPhase * 0.06 + cfg.startY * 10) * 0.9;
      ctx.save();
      ctx.shadowColor = 'rgba(' + cfg.color + ', 0.8)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(lead.x, lead.y, pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + cfg.color + ', ' + 0.9 * intro + ')';
      ctx.fill();
      ctx.restore();
    }
  }

  initPaths();
  window.addEventListener('resize', () => {
    resize();
    initPaths();
    for (let i = 0; i < particles.length; i++) {
      particles[i].x = Math.random() * W;
      particles[i].y = Math.random() * H;
    }
  });

  // ==========================================
  //  ANIMATION LOOP (with visibility optimization)
  // ==========================================
  let animationId = null;
  let isHeroVisible = true;

  // Pause canvas animation when hero is not visible (performance)
  const heroSection = document.getElementById('home');
  if (heroSection) {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isHeroVisible = entry.isIntersecting;
        if (isHeroVisible && !animationId) {
          animate();
        }
      });
    }, { threshold: 0.01 });
    heroObserver.observe(heroSection);
  }

  function animate() {
    if (!isHeroVisible) {
      animationId = null;
      return;
    }
    intro = Math.min(1, intro + 0.02);                 // ~0.8s entrance fade
    parallax.x += (parallax.tx - parallax.x) * 0.05;   // ease toward target
    parallax.y += (parallax.ty - parallax.y) * 0.05;
    pathPhase++;

    ctx.clearRect(0, 0, W, H);
    updatePaths();
    updateParticles();
    drawPaths();        // price streams behind
    drawParticles();    // particle network in front
    animationId = requestAnimationFrame(animate);
  }

  // Respect prefers-reduced-motion: render a single static frame
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    animate();
  } else {
    intro = 1;
    drawPaths();
    drawParticles();
  }

});
