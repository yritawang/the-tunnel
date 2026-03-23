// ═══════════════════════════════════════════════════════
// GLOW CIRCLES EFFECT
// Triggered by: 6 of hearts, 9 of diamonds, King of hearts,
//               Queen of diamonds, The Fool
// Also layered on The Devil (combined with pixel sort)
// ═══════════════════════════════════════════════════════

const GLOW_CIRCLE_CARDS = [
  '6 of hearts',
  '9 of diamonds',
  'King of hearts',
  'Queen of diamonds',
  'The Fool',
  'The Devil',
];

const GLOW_INTENSITY = [
  { count: 6,  maxRadius: 120, speed: 0.6, pulseRate: 0.03 },
  { count: 10, maxRadius: 180, speed: 0.9, pulseRate: 0.05 },
  { count: 16, maxRadius: 260, speed: 1.3, pulseRate: 0.07 },
  { count: 14, maxRadius: 220, speed: 1.8, pulseRate: 0.11 },
];

function startGlowCirclesEffect(sectionIndex, p5CanvasDiv, sectionMs) {
  const cfg        = GLOW_INTENSITY[Math.min(sectionIndex, 3)];
  const GROW_IN_MS  = 4000;             // grow in over 2 seconds
  const GROW_OUT_MS = 2500;             // grow out over 2.5 seconds
  const GROW_OUT_START = (sectionMs || 15000) - GROW_OUT_MS; // when to start shrinking

  return new p5(sk => {
    let circles  = [];
    let animT    = 0;
    let elapsed  = 0;  // ms elapsed since effect started
    let lastTime = null;
    // Sampled colours from the current tunnel frame
    let sampledColors = [];

    sk.setup = () => {
      const cnv = sk.createCanvas(window.innerWidth, window.innerHeight);
      cnv.style('position', 'fixed');
      cnv.style('top', '0');
      cnv.style('left', '0');
      cnv.style('pointer-events', 'none');
      sk.pixelDensity(1);
      sampleBackgroundColors();
      spawnCircles();
    };

    sk.draw = () => {
      sk.clear();
      animT++;

      // Re-sample when frame changes (every ~3s)
      if (animT % 90 === 0) sampleBackgroundColors();

      // Track real elapsed ms for accurate grow-out timing
      const now   = performance.now();
      if (lastTime === null) lastTime = now;
      elapsed    += now - lastTime;
      lastTime    = now;

      // Envelope: grow in over GROW_IN_MS, hold, grow out over GROW_OUT_MS
      const growIn  = Math.min(elapsed / GROW_IN_MS, 1.0);
      const growOut = elapsed > GROW_OUT_START
        ? Math.max(1.0 - (elapsed - GROW_OUT_START) / GROW_OUT_MS, 0.0)
        : 1.0;
      const fadeIn  = growIn * growOut;

      circles.forEach((c, i) => {
        c.phase       += cfg.pulseRate * (0.8 + i * 0.07);
        const pulse    = Math.sin(c.phase) * 0.25 + 0.75;
        const r        = c.baseRadius * pulse * fadeIn;

        c.x += Math.sin(animT * 0.007 + c.offsetPhase) * cfg.speed * 0.4;
        c.y += Math.cos(animT * 0.005 + c.offsetPhase) * cfg.speed * 0.3;

        if (c.x < -cfg.maxRadius)             c.x = sk.width  + cfg.maxRadius;
        if (c.x >  sk.width  + cfg.maxRadius) c.x = -cfg.maxRadius;
        if (c.y < -cfg.maxRadius)             c.y = sk.height + cfg.maxRadius;
        if (c.y >  sk.height + cfg.maxRadius) c.y = -cfg.maxRadius;

        drawSmoothGlow(c.x, c.y, r, c.col, fadeIn);
      });

      // Burst rings
      if (animT % Math.floor(60 / cfg.speed) === 0) spawnBurst();
    };

    sk.windowResized = () => {
      sk.resizeCanvas(window.innerWidth, window.innerHeight);
      spawnCircles();
    };

    // ── Sample dominant colours from the active tunnel frame ──
    function sampleBackgroundColors() {
      const activeImg = document.querySelector('#tunnelBg img.active');
      if (!activeImg || !activeImg.complete || !activeImg.naturalWidth) {
        sampledColors = fallbackPalette(sectionIndex);
        return;
      }

      try {
        const off  = document.createElement('canvas');
        off.width  = 40; // tiny sample — just need broad colour areas
        off.height = 40;
        const octx = off.getContext('2d');
        octx.drawImage(activeImg, 0, 0, 40, 40);
        const data = octx.getImageData(0, 0, 40, 40).data;

        // Sample 8 points spread across the image
        const points = [
          [5,5], [20,5], [35,5],
          [5,20],[35,20],
          [5,35],[20,35],[35,35]
        ];

        sampledColors = points.map(([x, y]) => {
          const idx = (y * 40 + x) * 4;
          let r = data[idx];
          let g = data[idx + 1];
          let b = data[idx + 2];
          // Boost saturation and brightness so sampled colours glow
          const boosted = boostColor(r, g, b, sectionIndex);
          return boosted;
        });
      } catch(e) {
        sampledColors = fallbackPalette(sectionIndex);
      }
    }

    // Boost a sampled RGB colour — increase saturation, shift hue slightly
    function boostColor(r, g, b, section) {
      // Convert to HSL, crank saturation, return
      let [h, s, l] = rgbToHsl(r, g, b);
      // Push saturation way up — tunnel colours are mostly grey/beige
      s = Math.min(1.0, s + 0.5 + section * 0.1);
      // Keep lightness in a glowy mid range
      l = 0.45 + section * 0.1;
      return hslToRgb(h, s, l);
    }

    function fallbackPalette(section) {
      const palettes = [
        [{r:232,g:160,b:180},{r:160,g:212,b:212},{r:232,g:196,b:160},{r:180,g:160,b:232}],
        [{r:255,g:107,b:138},{r:78,g:205,b:196},{r:255,g:217,b:61},{r:199,g:125,b:255}],
        [{r:255,g:0,  b:85}, {r:0,  g:255,b:204},{r:255,g:204,b:0}, {r:204,g:0,  b:255}],
        [{r:255,g:0,  b:0},  {r:0,  g:255,b:255},{r:255,g:255,b:0}, {r:255,g:0,  b:255}],
      ];
      return palettes[Math.min(section, 3)];
    }

    function spawnCircles() {
      if (!sampledColors.length) sampledColors = fallbackPalette(sectionIndex);
      circles = [];
      for (let i = 0; i < cfg.count; i++) {
        circles.push({
          x:           sk.random(sk.width),
          y:           sk.random(sk.height),
          baseRadius:  sk.random(cfg.maxRadius * 0.3, cfg.maxRadius),
          phase:       sk.random(sk.TWO_PI),
          offsetPhase: sk.random(sk.TWO_PI),
          col:         sampledColors[i % sampledColors.length],
        });
      }
    }

    function spawnBurst() {
      if (!sampledColors.length) return;
      const col = sampledColors[Math.floor(sk.random(sampledColors.length))];
      const bx  = sk.random(sk.width);
      const by  = sk.random(sk.height);
      let   br  = cfg.maxRadius * 0.1;
      let   ba  = 1.0;

      const expand = setInterval(() => {
        if (ba <= 0) { clearInterval(expand); return; }
        sk.noFill();
        sk.stroke(col.r, col.g, col.b, ba * 160);
        sk.strokeWeight(2);
        sk.ellipse(bx, by, br * 2, br * 2);
        br += cfg.speed * 6;
        ba -= 0.06;
      }, 16);
    }

    // ── Smooth glow using canvas radial gradient ──
    // Bypasses p5 fill layers — uses native gradient for silky falloff
    function drawSmoothGlow(x, y, radius, col, alpha) {
      const ctx     = sk.drawingContext;
      const { r, g, b } = col;
      const grad    = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);

      // Smooth gradient from opaque core to fully transparent edge
      grad.addColorStop(0,    `rgba(255,255,255,${alpha * 0.45})`);
      grad.addColorStop(0.15, `rgba(${r},${g},${b},${alpha * 0.55})`);
      grad.addColorStop(0.40, `rgba(${r},${g},${b},${alpha * 0.22})`);
      grad.addColorStop(0.65, `rgba(${r},${g},${b},${alpha * 0.07})`);
      grad.addColorStop(1.0,  `rgba(${r},${g},${b},0)`);

      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Colour utilities ──
    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      let h, s, l = (max + min) / 2;
      if (max === min) { h = s = 0; }
      else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return [h, s, l];
    }

    function hslToRgb(h, s, l) {
      let r, g, b;
      if (s === 0) { r = g = b = l; }
      else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1; if (t > 1) t -= 1;
          if (t < 1/6) return p + (q-p)*6*t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q-p)*(2/3-t)*6;
          return p;
        };
        const q = l < 0.5 ? l*(1+s) : l+s-l*s;
        const p = 2*l-q;
        r = hue2rgb(p,q,h+1/3);
        g = hue2rgb(p,q,h);
        b = hue2rgb(p,q,h-1/3);
      }
      return { r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255) };
    }

  }, p5CanvasDiv);
}