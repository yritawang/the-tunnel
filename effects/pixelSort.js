// ═══════════════════════════════════════════════════════
// PIXEL SORT EFFECT
// Triggered by: 7 of clubs, 2 of spades, Jack of clubs,
//               5 of spades, Ace of spades, The Tower
// Intensity tied to sectionIndex (0-3)
// Sits on top of tunnel photos as overlay
// ═══════════════════════════════════════════════════════

const PIXEL_SORT_CARDS = [
  '7 of clubs',
  '2 of spades',
  'Jack of clubs',
  '5 of spades',
  'Ace of spades',
  'The Tower',
];

// Section intensity config — escalates with section
const SORT_INTENSITY = [
  { threshold: 200, sampleStep: 3, sortLength: 0.15, opacity: 0.55 }, // section 1 — subtle
  { threshold: 160, sampleStep: 3, sortLength: 0.35, opacity: 0.70 }, // section 2 — creeping
  { threshold: 110, sampleStep: 4, sortLength: 0.40, opacity: 0.85 }, // section 3 — heavy, toned down
  { threshold:  60, sampleStep: 4, sortLength: 0.55, opacity: 1.00 }, // section 4 — overwhelming, toned down
];

// ── Entry point ──────────────────────────────────────
// Call from startActiveEffect() in sketch.js when
// the picked card name is in PIXEL_SORT_CARDS.
// Returns the p5 instance so stopActiveEffect can remove it.
//
// Usage in sketch.js:
//   import / include this file before sketch.js in index.html
//   then in startActiveEffect:
//     if (PIXEL_SORT_CARDS.includes(effect)) {
//       p5Instance = startPixelSortEffect(sectionIndex, p5CanvasDiv);
//     }
// ─────────────────────────────────────────────────────
function startPixelSortEffect(sectionIndex, p5CanvasDiv) {
  const cfg = SORT_INTENSITY[Math.min(sectionIndex, 3)];

  return new p5(sk => {
    let sourceImg      = null;
    let loaded         = false;
    let animT          = 0;
    let liveThreshold  = cfg.threshold + 60; // starts high, drops over time
    let lastSrc        = '';

    sk.setup = () => {
      const cnv = sk.createCanvas(window.innerWidth, window.innerHeight);
      cnv.style('position', 'fixed');
      cnv.style('top', '0');
      cnv.style('left', '0');
      cnv.style('pointer-events', 'none');
      sk.pixelDensity(1);
      sk.colorMode(sk.RGB);
    };

    sk.draw = () => {
      sk.clear();
      animT++;

      // Threshold slowly drops — sorting region spreads as section progresses
      liveThreshold = Math.max(cfg.threshold - 40, liveThreshold - 0.3);

      // Reload source pixels if tunnel frame changed
      loadCurrentFrame();
      if (!loaded || !sourceImg) return;

      // Row coverage grows from 0 → cfg.sortLength over ~80 frames
      const rowCoverage = Math.min(animT / 80, 1.0) * cfg.sortLength;

      const W    = sourceImg.width;
      const H    = sourceImg.height;
      const step = cfg.sampleStep;

      sourceImg.loadPixels();

      sk.push();
      sk.noStroke();

      for (let y = 0; y < H; y++) {
        // Use perlin noise to decide which rows get sorted
        // so coverage spreads organically rather than top-down
        const rowNoise = sk.noise(y * 0.008, animT * 0.004);
        if (rowNoise > rowCoverage) continue;

        // Collect pixel data for this row
        const rowPixels = [];
        for (let x = 0; x < W; x++) {
          const idx        = (y * W + x) * 4;
          const r          = sourceImg.pixels[idx];
          const g          = sourceImg.pixels[idx + 1];
          const b          = sourceImg.pixels[idx + 2];
          const brightness = r * 0.299 + g * 0.587 + b * 0.114;
          rowPixels.push({ x, r, g, b, brightness });
        }

        // Find runs of pixels above threshold and sort them by brightness
        let runStart = -1;
        for (let i = 0; i <= rowPixels.length; i++) {
          const above = i < rowPixels.length && rowPixels[i].brightness > liveThreshold;

          if (above && runStart === -1) {
            runStart = i;
          } else if (!above && runStart !== -1) {
            const run = rowPixels.slice(runStart, i);
            run.sort((a, b) => b.brightness - a.brightness);

            // Draw sorted pixels at screen scale
            const scaleX = sk.width  / W;
            const scaleY = sk.height / H;

            run.forEach((p, ri) => {
              const screenX = rowPixels[runStart + ri].x * scaleX;
              const screenY = y * scaleY;
              sk.fill(p.r, p.g, p.b, cfg.opacity * 255);
              sk.rect(screenX, screenY, scaleX + 0.5, scaleY + 0.5);
            });

            runStart = -1;
          }
        }
      }

      // Occasional horizontal streak for extra glitch texture
      if (Math.random() > 0.72) {
        const streakY   = sk.random(sk.height);
        const streakLen = sk.random(sk.width * 0.15, sk.width * 0.75);
        const streakX   = sk.random(sk.width - streakLen);
        sk.fill(255, 255, 255, sk.random(20, 70));
        sk.rect(streakX, streakY, streakLen, Math.ceil(sk.height / H) + 1);
      }

      sk.pop();
    };

    sk.windowResized = () => {
      sk.resizeCanvas(window.innerWidth, window.innerHeight);
      loaded    = false;
      sourceImg = null;
      lastSrc   = '';
    };

    function loadCurrentFrame() {
      const activeImg = document.querySelector('#tunnelBg img.active');
      if (!activeImg || !activeImg.complete || !activeImg.naturalWidth) return;
      if (activeImg.src === lastSrc) return; // same frame, no reload needed

      // Sample at reduced resolution for performance
      const sampleW = Math.floor(window.innerWidth  / cfg.sampleStep);
      const sampleH = Math.floor(window.innerHeight / cfg.sampleStep);

      const off    = document.createElement('canvas');
      off.width    = sampleW;
      off.height   = sampleH;
      const octx   = off.getContext('2d');

      try {
        octx.drawImage(activeImg, 0, 0, sampleW, sampleH);
      } catch(e) { return; }

      const imgData = octx.getImageData(0, 0, sampleW, sampleH);
      const p5img   = sk.createImage(sampleW, sampleH);
      p5img.loadPixels();
      for (let i = 0; i < imgData.data.length; i++) {
        p5img.pixels[i] = imgData.data[i];
      }
      p5img.updatePixels();

      sourceImg = p5img;
      lastSrc   = activeImg.src;
      loaded    = true;
    }

  }, p5CanvasDiv);
}