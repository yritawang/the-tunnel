'use strict';
// config
const SECTIONS = [
  {
    id: 1,
    frames: ['section1_1','section1_2','section1_3','section1_4'],
    holdTimes: [7000, 5000, 8000, 6000],
    jesterMood: 'ferretscheme',
    circleSizeStart: 180, circleSizeEnd: 145,
    driftAmp: 0.04,
    driftSpeed: 0.3,
    driftErratic: false,
    loseTime: 3.0,
    cards: [
      { name: '7 of clubs',  effect: 'sphere' },
      { name: '2 of spades', effect: 'rectangles' },
      { name: '6 of hearts', effect: 'eyes' },
    ],
    sectionDialogue: null,
    afterCardDialogue: null,
  },
  {
    id: 2,
    frames: ['section2_1','section2_2','section2_3','section2_4'],
    holdTimes: [5000, 4000, 6000, 4500],
    jesterMood: 'ferretshocked',
    circleSizeStart: 155, circleSizeEnd: 120,
    driftAmp: 0.07,
    driftSpeed: 0.55,
    driftErratic: false,
    loseTime: 2.5,
    cards: [
      { name: '9 of diamonds', effect: 'shadows' },
      { name: 'Jack of clubs',  effect: 'shapes' },
      { name: '5 of spades',    effect: 'crawl' },
    ],
    sectionDialogue: null,
    afterCardDialogue: null,
  },
  {
    id: 3,
    frames: ['section3_1','section3_2','section3_3','section3_4'],
    holdTimes: [4000, 3500, 4500, 3000],
    jesterMood: 'ferretangry',
    circleSizeStart: 130, circleSizeEnd: 95,
    driftAmp: 0.11,
    driftSpeed: 0.85,
    driftErratic: false,
    loseTime: 2.0,
    cards: [
      { name: 'Ace of spades',     effect: 'glitch' },
      { name: 'King of hearts',    effect: 'fragment' },
      { name: 'Queen of diamonds', effect: 'static' },
    ],
    sectionDialogue: null,
    afterCardDialogue: null,
  },
  {
    id: 4,
    frames: ['section4_1','section4_2','section4_3','section4_4'],
    holdTimes: [2500, 2000, 3000, 2000],
    jesterMood: 'ferrethorror',
    circleSizeStart: 110, circleSizeEnd: 70,
    driftAmp: 0.15,
    driftSpeed: 1.2,
    driftErratic: true,
    loseTime: 1.2,
    cards: [
      { name: 'The Fool',  effect: 'everything' },
      { name: 'The Tower', effect: 'everything' },
      { name: 'The Devil', effect: 'everything' },
    ],
    sectionDialogue: null,
    afterCardDialogue: null,
  },
];

const EXIT_FRAME  = 'exit';
const INTRO_FRAME = 'intro';


const G = {
  phase: 'start',
  currentSection: 0,
  currentFrame: 0,
  mouseX: window.innerWidth / 2,
  mouseY: window.innerHeight / 2,
  offTime: 0,
  lastTick: null,
  distracting: false,
  circleX: 0,
  circleY: 0,
  circleSize: 150,
  driftT: 0,
  sectionT: 0,
  sectionDuration: 28,
  activeEffect: null,
};

const $ = id => document.getElementById(id);
const tunnelBg        = $('tunnelBg');
const flashOverlay    = $('flashOverlay');
const bitmapCanvas    = $('bitmapCanvas');
const bCtx            = bitmapCanvas.getContext('2d');
const hudText         = $('hudText');
const circleContainer = $('circleContainer');
const outerCircle     = $('outerCircle');
const innerDot        = $('innerDot');
const jesterEl        = $('jester');
const dialogueBox     = $('dialogueBox');
const dialogueLabel   = $('dialogueLabel');
const dialogueText    = $('dialogueText');
const dialogueBtns    = $('dialogueBtns');
const cardOverlay     = $('cardOverlay');
const cardRow         = $('cardRow');
const p5CanvasDiv     = $('p5Canvas');
const startScreen     = $('startScreen');
const endScreen       = $('endScreen');
const cursorEl        = $('cursor');
// cursor
document.addEventListener('mousemove', e => {
  G.mouseX = e.clientX;
  G.mouseY = e.clientY;
  cursorEl.style.left  = e.clientX + 'px';
  cursorEl.style.top   = e.clientY + 'px';
  innerDot.style.left  = e.clientX + 'px';
  innerDot.style.top   = e.clientY + 'px';
});

function preloadImages() {
  const allFrames = [INTRO_FRAME, EXIT_FRAME];
  SECTIONS.forEach(s => allFrames.push(...s.frames));
  allFrames.forEach(name => {
    const img = new Image();
    img.src = `assets/tunnel/${name}.jpg`;
    img.dataset.name = name;
    tunnelBg.appendChild(img);
  });
}

function showFrame(name) {
  tunnelBg.querySelectorAll('img').forEach(img => {
    img.classList.toggle('active', img.dataset.name === name);
  });
}
// start
$('startBlackBox').addEventListener('click', () => {
  startScreen.style.opacity = '0';
  startScreen.style.transition = 'opacity 0.5s';
  setTimeout(() => {
    startScreen.style.display = 'none';
    beginIntro();
  }, 500);
});


function beginIntro() {
  G.phase = 'intro';
  showFrame(INTRO_FRAME);
  hudText.style.display = 'block';
  setTimeout(() => {
    dialogueLabel.textContent = '';
    showDialogue("let's try out this route for grocery shopping today.", [
      { label: '*Walk into tunnel*', fn: () => { hideDialogue(); beginSection(0); } }
    ]);
  }, 800);
}

function introReply() {
  showDialogue("Great! Let's do something simple.", []);
  setTimeout(() => {
    hideDialogue();
    hideJester();
    beginSection(1);
  }, 2000);
}


function beginSection(sectionIndex) {
  G.currentSection = sectionIndex;
  G.currentFrame   = 0;
  G.offTime        = 0;
  G.distracting    = false;
  G.phase          = 'cards';
  G.driftT         = 0;
  G.sectionT       = 0;
  G.circleX        = 0;
  G.circleY        = 0;
  G.circleSize     = SECTIONS[sectionIndex] ? SECTIONS[sectionIndex].circleSizeStart : 150;
  G.activeEffect   = null;

  if (sectionIndex === 0) {
    startFrameSequence(0);
    return;
  }

  showCards(sectionIndex);
}

function startFrameSequence(sectionIndex) {
  const sec   = SECTIONS[sectionIndex];
  G.phase     = 'playing';
  circleContainer.style.display = 'block';
  showFrame(sec.frames[0]);
  G.currentFrame = 0;
  startGameTick();
  scheduleNextFrame(sectionIndex);
}


let frameTimeout;

function scheduleNextFrame(sectionIndex) {
  clearTimeout(frameTimeout);
  const sec      = SECTIONS[sectionIndex];
  const holdTime = getRandomisedHold(sec.holdTimes[G.currentFrame]);

  frameTimeout = setTimeout(() => {
    if (G.phase !== 'playing') return;
    G.currentFrame++;

    if (G.currentFrame >= sec.frames.length) {
      clearTimeout(frameTimeout);
      stopGameTick();
      stopActiveEffect();
      sectionComplete(sectionIndex);
    } else {
      showFrame(sec.frames[G.currentFrame]);
      scheduleNextFrame(sectionIndex);
    }
  }, holdTime);
}

function getRandomisedHold(base) {
  return base * (0.8 + Math.random() * 0.4);
}


let tickRAF;

function startGameTick() {
  G.lastTick = performance.now();
  tickLoop();
}

function stopGameTick() {
  cancelAnimationFrame(tickRAF);
}

function tickLoop() {
  tickRAF = requestAnimationFrame(tickLoop);
  const now = performance.now();
  const dt  = (now - G.lastTick) / 1000;
  G.lastTick = now;

  if (G.phase !== 'playing') return;

  const sec = SECTIONS[G.currentSection];
  updateCircle(dt);

  const W          = window.innerWidth;
  const H          = window.innerHeight;
  const circleCX   = W / 2 + G.circleX;
  const circleCY   = H / 2 + G.circleY;
  const dx         = G.mouseX - circleCX;
  const dy         = G.mouseY - circleCY;
  const dist       = Math.sqrt(dx * dx + dy * dy);
  const radius     = G.circleSize / 2;
  const isOutside  = dist > radius;
  const severity   = isOutside ? Math.min((dist - radius) / (radius * 1.5), 1.0) : 0;

  if (isOutside) {
    G.offTime += dt;
    outerCircle.classList.add('danger');
    innerDot.classList.add('danger');
    if (severity > 0.1) updateBitmapEffect(severity);
    if (G.offTime >= sec.loseTime) triggerLose();
  } else {
    G.offTime = Math.max(0, G.offTime - dt * 1.5);
    outerCircle.classList.remove('danger');
    innerDot.classList.remove('danger');
    fadeBitmapEffect();
  }
}


function updateCircle(dt) {
  const sec = SECTIONS[G.currentSection];
  const W   = window.innerWidth;
  const H   = window.innerHeight;

  G.driftT   += dt * sec.driftSpeed;
  G.sectionT  = Math.min(G.sectionT + dt / G.sectionDuration, 1.0);

  const amp = sec.driftAmp * Math.min(W, H);

  if (sec.driftErratic) {
    G.circleX = amp * (Math.sin(G.driftT * 1.0) * 0.6 + Math.sin(G.driftT * 2.3 + 1.2) * 0.4);
    G.circleY = amp * (Math.cos(G.driftT * 0.8) * 0.6 + Math.cos(G.driftT * 1.9 + 0.7) * 0.4);
  } else {
    G.circleX = amp * Math.sin(G.driftT);
    G.circleY = amp * Math.cos(G.driftT * 0.7 + 0.5);
  }

  G.circleSize = sec.circleSizeStart + (sec.circleSizeEnd - sec.circleSizeStart) * G.sectionT;

  const cx = W / 2 + G.circleX;
  const cy = H / 2 + G.circleY;
  outerCircle.style.width     = G.circleSize + 'px';
  outerCircle.style.height    = G.circleSize + 'px';
  outerCircle.style.left      = cx + 'px';
  outerCircle.style.top       = cy + 'px';
  outerCircle.style.transform = 'translate(-50%, -50%)';

  const cursorSizes = [10, 16, 22, 30];
  const cursorSize  = cursorSizes[Math.min(G.currentSection, 3)];
  cursorEl.style.width  = cursorSize + 'px';
  cursorEl.style.height = cursorSize + 'px';
}


let bitmapOpacity = 0;
function updateBitmapEffect(severity) {
  bitmapOpacity = severity;
  bitmapCanvas.style.opacity = bitmapOpacity;

  const activeImg = tunnelBg.querySelector('img.active');
  if (!activeImg || !activeImg.complete || !activeImg.naturalWidth) return;

  const W        = window.innerWidth;
  const H        = window.innerHeight;
  bitmapCanvas.width  = W;
  bitmapCanvas.height = H;

  const gridSize = Math.max(4, Math.floor(severity * 28));

  let imgData;
  try {
    const off  = document.createElement('canvas');
    off.width  = W;
    off.height = H;
    const octx = off.getContext('2d');
    octx.drawImage(activeImg, 0, 0, W, H);
    imgData = octx.getImageData(0, 0, W, H);
  } catch(e) { return; }

  bCtx.clearRect(0, 0, W, H);
  bCtx.fillStyle = 'rgba(0,0,0,0.6)';
  bCtx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y += gridSize) {
    for (let x = 0; x < W; x += gridSize) {
      const idx        = (y * W + x) * 4;
      const r          = imgData.data[idx];
      const g          = imgData.data[idx + 1];
      const b          = imgData.data[idx + 2];
      const brightness = (r + g + b) / 3 / 255;
      const dotRadius  = brightness * gridSize * 0.6;
      bCtx.beginPath();
      bCtx.arc(x + gridSize / 2, y + gridSize / 2, dotRadius, 0, Math.PI * 2);
      bCtx.fillStyle = `rgb(${r},${g},${b})`;
      bCtx.fill();
    }
  }
}

function fadeBitmapEffect() {
  bitmapOpacity = Math.max(0, bitmapOpacity - 0.08);
  bitmapCanvas.style.opacity = bitmapOpacity;
}


function showJester(mood) {
  jesterEl.src          = `assets/jester/${mood}.png`;
  jesterEl.style.display = 'block';
}

function hideJester() {
  jesterEl.style.display = 'none';
}

// dialogue
function showDialogue(text, buttons) {
  dialogueText.textContent = text;
  dialogueBtns.innerHTML   = '';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'dialogue-btn';
    btn.textContent = b.label;
    btn.addEventListener('click', b.fn);
    dialogueBtns.appendChild(btn);
  });
  dialogueBox.style.display    = 'block';
  dialogueBox.style.animation  = 'none';
  void dialogueBox.offsetWidth;
  dialogueBox.style.animation  = '';
}

function hideDialogue() {
  dialogueBox.style.display = 'none';
}


function showCards(sectionIndex) {
  G.phase    = 'cards';
  circleContainer.style.display = 'none';
  G.distracting = true;

  const sec = SECTIONS[sectionIndex];
  cardRow.innerHTML = '';

  sec.cards.forEach(card => {
    const el = document.createElement('div');
    el.className = 'card';
    el.textContent = card.name;
    el.addEventListener('click', () => pickCard(card, sectionIndex));
    cardRow.appendChild(el);
  });

  cardOverlay.style.display = 'flex';
}

function pickCard(card, sectionIndex) {
  cardOverlay.style.display = 'none';
  G.activeEffect = card.effect;
  const sec          = SECTIONS[sectionIndex];
  const sectionMs    = sec.holdTimes.reduce((a, b) => a + b, 0);
  startActiveEffect(card.name, card.effect, sectionIndex, sectionMs);
  startFrameSequence(sectionIndex);
}


function sectionComplete(sectionIndex) {
  const nextSection = sectionIndex + 1;

  if (nextSection >= SECTIONS.length) {
    triggerWin();
    return;
  }

  if (sectionIndex === 0) {
    showJester('ferretscheme');
    showDialogue('Hello there! I see you are visiting the tunnel. Care to play a game with me?', [
      { label: 'YES (enthusiasm)',      fn: introReply },
      { label: 'Yes... (apprehensive)', fn: introReply },
    ]);
    return;
  }

  if (sectionIndex === 1) {
    showJester('ferretshocked');
    showDialogue('Woah you made it... uh, care for another one?', []);
    setTimeout(() => { hideDialogue(); hideJester(); beginSection(nextSection); }, 2400);
    return;
  }

  if (sectionIndex === 2) {
    showJester('ferretangry');
    showDialogue('Woah, you actually made it.', []);
    setTimeout(() => {
      showDialogue('Care for another one?', []);
      setTimeout(() => { hideDialogue(); hideJester(); beginSection(nextSection); }, 1800);
    }, 2000);
    return;
  }

  if (sectionIndex === 3) {
    showJester('ferrethorror');
    showDialogue("This is getting frustrating. Let's see if you can handle THIS!", []);
    setTimeout(() => { hideDialogue(); hideJester(); beginSection(nextSection); }, 2600);
    return;
  }
}


let p5Instance  = null;
let effectRunning = false;

let p5Instance2 = null;

function startActiveEffect(cardName, effect, sectionIndex, sectionMs) {
  effectRunning = true;
  p5CanvasDiv.style.display = 'block';

  if (cardName === 'The Devil') {
    p5Instance  = startPixelSortEffect(sectionIndex, p5CanvasDiv);
    p5Instance2 = startGlowCirclesEffect(sectionIndex, p5CanvasDiv, sectionMs);
    return;
  }

  if (PIXEL_SORT_CARDS.includes(cardName)) {
    p5Instance = startPixelSortEffect(sectionIndex, p5CanvasDiv);
    return;
  }

  if (GLOW_CIRCLE_CARDS.includes(cardName)) {
    p5Instance = startGlowCirclesEffect(sectionIndex, p5CanvasDiv, sectionMs);
    return;
  }
}



function stopActiveEffect() {
  effectRunning = false;
  p5CanvasDiv.style.display = 'none';
  if (p5Instance)  { p5Instance.remove();  p5Instance  = null; }
  if (p5Instance2) { p5Instance2.remove(); p5Instance2 = null; }
}


function triggerWin() {
  G.phase = 'win';
  stopGameTick();
  clearTimeout(frameTimeout);
  circleContainer.style.display = 'none';
  hideJester();
  hideDialogue();

  showFrame(EXIT_FRAME);
  setTimeout(() => {
    showJester('ferrethorror');
    showDialogue("I'm not going to be receiving a bonus this quarter.", []);
    setTimeout(() => {
      hideJester();
      hideDialogue();
      showEndCard("Maybe I'll take the long way next time.", true);
    }, 3000);
  }, 1500);
}

function triggerLose() {
  if (G.phase === 'lose') return;
  G.phase = 'lose';
  stopGameTick();
  clearTimeout(frameTimeout);
  circleContainer.style.display = 'none';
  cardOverlay.style.display     = 'none';
  stopActiveEffect();

  flashOverlay.style.background  = 'rgba(255,20,20,0.85)';
  flashOverlay.style.transition  = 'none';
  flashOverlay.style.opacity     = '1';

  setTimeout(() => {
    flashOverlay.style.background = '#ffffff';
    flashOverlay.style.transition = 'opacity 0.8s';
    flashOverlay.style.opacity    = '0';
    showJester('ferretshocked');
    showDialogue('Be careful not to trip now! We have more games to play.', []);
    setTimeout(() => {
      hideJester();
      hideDialogue();
      showEndCard('You looked away.', false);
    }, 3000);
  }, 600);
}

function showEndCard(message, isWin) {
  endScreen.style.display = 'flex';

  const label      = document.createElement('div');
  label.style.cssText = `font-size:clamp(11px,1.2vw,14px);letter-spacing:0.2em;color:rgba(255,255,255,0.4);margin-bottom:16px;font-family:'Courier Prime',monospace;`;
  label.textContent   = isWin ? 'you made it.' : 'you lost.';

  const msg        = document.createElement('div');
  msg.style.cssText = `font-size:clamp(20px,3vw,36px);color:white;font-style:italic;font-family:'Courier Prime',monospace;max-width:600px;line-height:1.4;margin-bottom:32px;`;
  msg.textContent   = message;

  const btn        = document.createElement('button');
  btn.style.cssText = `background:transparent;border:1.5px solid rgba(255,255,255,0.5);color:rgba(255,255,255,0.7);font-family:'Courier Prime',monospace;font-size:14px;letter-spacing:0.15em;padding:10px 24px;cursor:pointer;`;
  btn.textContent   = 'again';
  btn.addEventListener('click', () => location.reload());

  endScreen.innerHTML = '';
  endScreen.appendChild(label);
  endScreen.appendChild(msg);
  endScreen.appendChild(btn);

  if (isWin) lingerEffect();
}


function lingerEffect() {
  p5CanvasDiv.style.display = 'block';
  if (p5Instance) p5Instance.remove();

  p5Instance = new p5(sk => {
    sk.setup = () => {
      const cnv = sk.createCanvas(window.innerWidth, window.innerHeight);
      cnv.style('position', 'fixed');
      cnv.style('top', '0');
      cnv.style('left', '0');
    };
    sk.draw = () => {
      sk.clear();
      if (Math.random() > 0.93) {
        const x = sk.random(window.innerWidth);
        const y = sk.random(window.innerHeight * 0.3) + window.innerHeight * 0.7;
        sk.fill(255, 255, 255, 60);
        sk.noStroke();
        sk.ellipse(x, y, 40, 18);
        sk.fill(0, 0, 0, 40);
        sk.ellipse(x, y, 14, 14);
      }
      if (Math.random() > 0.98) {
        sk.fill(255, 20, 20, 30);
        sk.noStroke();
        sk.rect(0, sk.random(window.innerHeight), window.innerWidth, sk.random(2, 6));
      }
    };
    sk.windowResized = () => sk.resizeCanvas(window.innerWidth, window.innerHeight);
  }, p5CanvasDiv);
}

window.addEventListener('resize', () => {
  bitmapCanvas.width  = window.innerWidth;
  bitmapCanvas.height = window.innerHeight;
});

bitmapCanvas.width  = window.innerWidth;
bitmapCanvas.height = window.innerHeight;
preloadImages();