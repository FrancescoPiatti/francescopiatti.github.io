document.addEventListener('DOMContentLoaded', () => {

  // ========== Active Page Highlighting ==========
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const pageMap = {
    'index.html': 'home',
    '': 'home',
    'publications.html': 'publications',
    'cv.html': 'cv',
    'teaching.html': 'teaching'
  };
  const activePage = pageMap[currentPage];
  document.querySelectorAll('.nav__link').forEach(link => {
    if (link.dataset.page === activePage) {
      link.classList.add('nav__link--active');
    }
  });

  // ========== Mobile Menu Toggle ==========
  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('nav__links--open');
      toggle.classList.toggle('nav__toggle--active');
      document.body.classList.toggle('menu-open');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('nav__links--open');
        toggle.classList.remove('nav__toggle--active');
        document.body.classList.remove('menu-open');
      });
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

  // ========== Abstract Toggle (Publications Page) ==========
  document.querySelectorAll('.abstract-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const abstract = btn.nextElementSibling;
      if (abstract && abstract.classList.contains('abstract-content')) {
        abstract.classList.toggle('abstract-content--open');
        btn.textContent = abstract.classList.contains('abstract-content--open')
          ? 'Hide Abstract'
          : 'Show Abstract';
      }
    });
  });

  // ========== Hero Canvas: Particles + Brownian Motion (Home Page Only) ==========
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return; // Not on home page

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
  //  PARTICLES
  // ==========================================
  const PARTICLE_COUNT = 90;
  const CONNECTION_DIST = 130;
  const particles = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1.5 + Math.random() * 2,           // radius 1.5-3.5px
      alpha: 0.15 + Math.random() * 0.20,    // opacity 0.15-0.35
      vx: (Math.random() - 0.5) * 0.3,       // slow base drift
      vy: (Math.random() - 0.5) * 0.3,
      // green hue variation
      g: 180 + Math.floor(Math.random() * 40),  // green channel 180-220
      b: 120 + Math.floor(Math.random() * 40),  // blue channel 120-160
    });
  }

  function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // Brownian-like drift: base velocity + small random increment
      p.vx += randn() * 0.04;
      p.vy += randn() * 0.04;
      // Damping to prevent runaway
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;
    }
  }

  function drawParticles() {
    // Draw connection lines first
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          const opacity = (1 - dist / CONNECTION_DIST) * 0.07;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(52, 211, 153, ' + opacity + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // Draw particles as glowing dots
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(52, ' + p.g + ', ' + p.b + ', ' + (p.alpha * 0.15) + ')';
      ctx.fill();
      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(52, ' + p.g + ', ' + p.b + ', ' + p.alpha + ')';
      ctx.fill();
    }
  }

  // ==========================================
  //  BROWNIAN MOTION PATHS (Geometric BM)
  // ==========================================
  const BM_PATHS = [
    { color: 'rgba(52, 211, 153, 0.40)', width: 2.5, mu: 0.0002, sigma: 0.012, startY: 0.55 },
    { color: 'rgba(16, 185, 129, 0.30)', width: 2, mu: -0.0001, sigma: 0.015, startY: 0.35 },
  ];

  // Number of steps = horizontal pixels
  const BM_STEPS = 400;
  const bmData = []; // Holds generated path data

  // Generate one GBM path
  function generateGBM(mu, sigma, startPrice, steps) {
    const prices = [startPrice];
    const dt = 1 / steps;
    for (let i = 1; i < steps; i++) {
      const prev = prices[i - 1];
      const drift = (mu - 0.5 * sigma * sigma) * dt;
      const diffusion = sigma * Math.sqrt(dt) * randn();
      prices.push(prev * Math.exp(drift + diffusion));
    }
    return prices;
  }

  function initBMPaths() {
    bmData.length = 0;
    for (let p = 0; p < BM_PATHS.length; p++) {
      const cfg = BM_PATHS[p];
      const startPrice = 100;
      const prices = generateGBM(cfg.mu, cfg.sigma, startPrice, BM_STEPS);

      // Normalize to screen coordinates
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const range = maxP - minP || 1;

      // Map to vertical band around cfg.startY (±20% of H)
      const centerY = H * cfg.startY;
      const bandH = H * 0.35;

      const points = prices.map((val, i) => ({
        x: (i / (BM_STEPS - 1)) * W,
        y: centerY - ((val - minP) / range - 0.5) * bandH
      }));

      bmData.push({ points, drawProgress: 0, cfg });
    }
  }

  initBMPaths();
  window.addEventListener('resize', () => {
    resize();
    initBMPaths();
    // Reset particle positions
    for (let i = 0; i < particles.length; i++) {
      particles[i].x = Math.random() * W;
      particles[i].y = Math.random() * H;
    }
  });

  // Draw-in speed: reveal over ~5 seconds at 60fps => ~300 frames
  const DRAW_SPEED = 1 / 300;

  function drawBMPaths() {
    for (let p = 0; p < bmData.length; p++) {
      const bm = bmData[p];
      // Advance draw progress
      if (bm.drawProgress < 1) {
        bm.drawProgress = Math.min(1, bm.drawProgress + DRAW_SPEED);
      }

      const endIdx = Math.floor(bm.drawProgress * (bm.points.length - 1));
      if (endIdx < 1) continue;

      ctx.beginPath();
      ctx.moveTo(bm.points[0].x, bm.points[0].y);

      for (let i = 1; i <= endIdx; i++) {
        // Smooth curve using quadratic bezier between midpoints
        if (i < endIdx) {
          const xc = (bm.points[i].x + bm.points[i + 1].x) / 2;
          const yc = (bm.points[i].y + bm.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(bm.points[i].x, bm.points[i].y, xc, yc);
        } else {
          ctx.lineTo(bm.points[i].x, bm.points[i].y);
        }
      }

      ctx.strokeStyle = bm.cfg.color;
      ctx.lineWidth = bm.cfg.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  // ==========================================
  //  ANIMATION LOOP
  // ==========================================
  function animate() {
    ctx.clearRect(0, 0, W, H);
    updateParticles();
    drawParticles();
    drawBMPaths();
    requestAnimationFrame(animate);
  }

  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    animate();
  } else {
    // Draw a single static frame
    drawParticles();
    for (let p = 0; p < bmData.length; p++) {
      bmData[p].drawProgress = 1;
    }
    drawBMPaths();
  }

});
