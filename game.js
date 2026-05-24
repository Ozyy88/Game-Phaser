/**
 * Water Hop - Complete Clean Game Engine (v2)
 * Fixed: platform index bug, null DOM refs, roundRect compat, click input, coin Y
 */

// ─── Polyfill roundRect for older browsers ──────────────────────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y,     x + w, y + h, r);
    this.arcTo(x + w, y + h, x,     y + h, r);
    this.arcTo(x,     y + h, x,     y,     r);
    this.arcTo(x,     y,     x + w, y,     r);
    this.closePath();
    return this;
  };
}

// ─── Sound Manager (with audio file support + procedural fallback) ───────────
class SoundManager {
  constructor() {
    this.actx = null;
    this.muted = false;
    this.bgmTimer = null;
    this.bgmPlaying = false;
    this.audioFiles = {};
    this._preloadAudioFiles();
  }

  _preloadAudioFiles() {
    const audioSrc = {
      jump:     'assets/audio/jump.mp3',
      coin:     'assets/audio/coin.mp3',
      splash:   'assets/audio/splash.mp3',
      gameover: 'assets/audio/gameover.mp3',
      bgm:      'assets/audio/bgm.mp3'
    };
    Object.entries(audioSrc).forEach(([key, path]) => {
      const audio = new Audio();
      audio.src = path;
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => { this.audioFiles[key] = audio; });
      audio.addEventListener('error', () => { this.audioFiles[key] = null; });
    });
  }

  _playFile(key, volume = 0.5) {
    const file = this.audioFiles[key];
    if (file && !this.muted) {
      const clone = file.cloneNode();
      clone.volume = volume;
      clone.play().catch(() => {});
      return true;
    }
    return false;
  }

  _init() {
    if (this.actx) return;
    try { this.actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }

  _resume() { if (this.actx && this.actx.state === 'suspended') this.actx.resume(); }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) { clearTimeout(this.bgmTimer); this.bgmPlaying = false; }
    else            { this.playBGM(); }
    return this.muted;
  }

  _beep(type, freq, endFreq, dur, vol) {
    if (this.muted || !this.actx) return;
    const t = this.actx.currentTime;
    const o = this.actx.createOscillator();
    const g = this.actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(this.actx.destination);
    o.start(); o.stop(t + dur + 0.01);
  }

  playJump() {
    if (this._playFile('jump', 0.4)) return;
    this._init(); this._resume(); this._beep('triangle', 150, 600, 0.15, 0.15);
  }

  playCoin() {
    if (this._playFile('coin', 0.35)) return;
    this._init(); this._resume(); this._beep('sine', 587, 880, 0.25, 0.12);
  }

  playGameOver() {
    if (this._playFile('gameover', 0.5)) return;
    this._init(); this._resume(); [220,196,174].forEach((f,i)=>setTimeout(()=>this._beep('sawtooth',f,null,0.25,0.08),i*120));
  }

  playSplash() {
    if (this._playFile('splash', 0.5)) return;
    this._init(); this._resume();
    if (!this.actx || this.muted) return;
    const t = this.actx.currentTime;
    const buf = this.actx.createBuffer(1, this.actx.sampleRate * 0.4, this.actx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { d[i] = (last + 0.02*(Math.random()*2-1))/1.02; last = d[i]; d[i]*=3.5; }
    const n = this.actx.createBufferSource(); n.buffer = buf;
    const f = this.actx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(400,t); f.frequency.exponentialRampToValueAtTime(50,t+0.35);
    const g = this.actx.createGain(); g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.01,t+0.38);
    n.connect(f); f.connect(g); g.connect(this.actx.destination);
    n.start(); n.stop(t+0.4);
  }

  playBGM() {
    if (this.muted || this.bgmPlaying) return;
    // Try file-based BGM first
    const bgmFile = this.audioFiles['bgm'];
    if (bgmFile) {
      this.bgmPlaying = true;
      bgmFile.loop = true;
      bgmFile.volume = 0.2;
      bgmFile.play().catch(() => { this._playProceduralBGM(); });
      return;
    }
    this._playProceduralBGM();
  }

  _playProceduralBGM() {
    this._init(); this._resume();
    if (!this.actx) return;
    this.bgmPlaying = true;
    const tick = () => {
      if (!this.bgmPlaying || this.muted) return;
      const t = this.actx.currentTime;
      const bases = [110, 130.81, 146.83, 164.81];
      this._beep('sine', bases[Math.floor(Math.random()*bases.length)], null, 1.8, 0.03);
      if (Math.random() > 0.3) {
        const bells = [440, 523, 587, 659, 784];
        setTimeout(() => this._beep('sine', bells[Math.floor(Math.random()*bells.length)], null, 1.2, 0.02), 400);
      }
      this.bgmTimer = setTimeout(tick, 2000);
    };
    tick();
  }

  stopBGM() {
    clearTimeout(this.bgmTimer);
    this.bgmPlaying = false;
    const bgmFile = this.audioFiles['bgm'];
    if (bgmFile) { bgmFile.pause(); bgmFile.currentTime = 0; }
  }
}


// ─── Particle System ─────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, type, extra = '') {
    this.x = x; this.y = y; this.alive = true;
    this.extra = extra;
    switch(type) {
      case 'splash':
        this.vx=(Math.random()-.5)*6; this.vy=-Math.random()*7-3;
        this.size=Math.random()*4+2; this.grav=0.35;
        this.color=`rgba(56,189,248,${Math.random()*.5+.5})`; this.life=1; this.decay=.025; break;
      case 'dust':
        this.vx=(Math.random()-.5)*2; this.vy=-Math.random()*1.5-.5;
        this.size=Math.random()*6+3; this.grav=-.01;
        this.color=`rgba(255,255,255,${Math.random()*.25+.15})`; this.life=1; this.decay=.04; break;
      case 'sparkle':
        const a=Math.random()*Math.PI*2, sp=Math.random()*3+1;
        this.vx=Math.cos(a)*sp; this.vy=Math.sin(a)*sp;
        this.size=Math.random()*3+1.5; this.grav=.05;
        if (this.extra === 'cyan') {
          this.color=`rgba(6,182,212,${Math.random()*.5+.5})`;
          this.extra = ''; // clear text so it draws as a circle
        } else {
          this.color=`rgba(251,191,36,${Math.random()*.5+.5})`;
        }
        this.life=1; this.decay=.02; break;
      case 'bubble':
        this.vx=(Math.random()-.5)*.6; this.vy=-Math.random()*1.2-.3;
        this.size=Math.random()*3+1; this.grav=-.005;
        this.color=`rgba(255,255,255,${Math.random()*.15+.08})`; this.life=1; this.decay=.008; break;
      case 'text':
        this.vx=0; this.vy=-1.6;
        this.size=14; this.grav=0.01;
        this.color = extra.includes('Detik') ? '#06b6d4' : '#22c55e'; // Cyan for time, green for score/coin
        this.life=1.2; this.decay=0.02; break;
    }
  }
  update() {
    this.vy += this.grav; this.x += this.vx; this.y += this.vy;
    this.life -= this.decay; if (this.life <= 0) this.alive = false;
  }
  draw(ctx) {
    ctx.save(); ctx.globalAlpha = Math.max(this.life, 0);
    if (this.extra) {
      ctx.fillStyle = this.color;
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.extra, this.x, this.y);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() { this.list = []; }
  spawn(x, y, type, count=5, extra='') { for(let i=0;i<count;i++) this.list.push(new Particle(x,y,type,extra)); }
  update() { this.list = this.list.filter(p => { p.update(); return p.alive; }); }
  draw(ctx) { this.list.forEach(p => p.draw(ctx)); }
  clear() { this.list = []; }
}

// ─── Asset Loader ─────────────────────────────────────────────────────────────
class AssetLoader {
  constructor() {
    this.imgs = {};
    const src = {
      character_idle: 'assets/asetgame/character_idle.png',
      character_jump: 'assets/asetgame/character_jump.png',
      character_fall: 'assets/asetgame/character_fall.png',
      character_drown:'assets/asetgame/character_drown.png',
      platform:       'assets/asetgame/platform.png',
      coin:           'assets/asetgame/coin.png',
      time:           'assets/asetgame/time.png',
      bg_sky:         'assets/asetgame/bg_sky.png',
      bg_hills:       'assets/asetgame/bg_hills.png'
    };
    Object.entries(src).forEach(([k,v]) => {
      const img = new Image(); img.src = v;
      img.onload = () => { this.imgs[k] = img; };
      img.onerror = () => { this.imgs[k] = null; };
    });
  }
  get(key) { return this.imgs[key] || null; }
}

// ─── Globals ─────────────────────────────────────────────────────────────────
const sfx        = new SoundManager();
const particles  = new ParticleSystem();
const assets     = new AssetLoader();

// ─── Main Game Class ──────────────────────────────────────────────────────────
class WaterHopGame {
  constructor() {
    this.canvas    = document.getElementById('gameCanvas');
    this.ctx       = this.canvas.getContext('2d');
    this.container = document.getElementById('gameContainer');

    // UI
    this.playBtn         = document.getElementById('playBtn');
    this.restartBtn      = document.getElementById('restartBtn');
    this.mainMenuScreen  = document.getElementById('mainMenuScreen');
    this.gameOverScreen  = document.getElementById('gameOverScreen');
    this.audioToggleBtn  = document.getElementById('audioToggleBtn');
    this.topBarBadges    = document.querySelector('.top-bar-badges');
    this.currentScoreVal = document.getElementById('currentScoreVal');
    this.currentCoinsVal = document.getElementById('currentCoinsVal');
    this.currentTimerVal = document.getElementById('currentTimerVal');
    this.finalScoreVal   = document.getElementById('finalScoreVal');
    this.finalCoinsVal   = document.getElementById('finalCoinsVal');
    this.bestScoreVal    = document.getElementById('bestScoreVal');

    // Constants
    this.GRAVITY   = 0.5;
    this.MIN_DIST  = 130;
    this.MAX_DIST  = 240;
    this.PLAT_H    = 28;

    // Runtime
    this.state     = 'MENU';
    this.score     = 0;
    this.coins     = 0;
    this.highScore = parseInt(localStorage.getItem('wh_hi') || '0');
    this.time      = 0;
    this.timeLeft  = 30;
    this.lastSecondTime = Date.now();
    this.cameraX   = 0;
    this.camTarget = 0;

    // *** FIXED: use direct platform refs, not array index ***
    this.platforms        = [];   // visible pool for rendering
    this.currentPlatform  = null; // platform player is standing on
    this.nextPlatform     = null; // target platform

    this.coinsList = [];

    this.player = { x:0, y:0, vx:0, vy:0, rot:0, radius:20 };

    this.targetX     = 0;
    this.targetTimer = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._bindInput();
    requestAnimationFrame(() => this._loop());
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  resize() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    this.W = rect.width;
    this.H = rect.height;
    this.canvas.width  = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.GROUND = this.H * 0.70; // Y where platforms sit
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  _bindInput() {
    // Buttons — stop propagation so click doesn't reach game canvas
    this.playBtn.addEventListener('click', e => { e.stopPropagation(); this.startGame(); });
    this.restartBtn.addEventListener('click', e => { e.stopPropagation(); this.startGame(); });
    this.audioToggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      const m = sfx.toggleMute();
      this.audioToggleBtn.textContent = m ? '🔇' : '🔊';
    });

    // Game click/tap — on window, ignore if over a button or screen overlay
    const onTap = (clientX, clientY) => {
      sfx._init(); sfx._resume(); // unlock audio on first interaction
      if (this.state !== 'PLAYING') return;

      const rect = this.canvas.getBoundingClientRect();
      // Map client coords → canvas design coords
      const cx = (clientX - rect.left) * (this.W / rect.width);
      const worldX = cx + this.cameraX;
      const dist   = worldX - this.player.x;

      if (dist > 15) {
        this.targetX     = worldX;
        this.targetTimer = 1.0;
        this._doJump(dist);
      }
    };

    window.addEventListener('pointerdown', e => {
      if (e.target.closest && (e.target.closest('button') || e.target.closest('.screen.active'))) return;
      onTap(e.clientX, e.clientY);
    });

    window.addEventListener('keydown', e => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (this.state !== 'PLAYING' || !this.nextPlatform) return;
      const dist = this.nextPlatform.x - this.player.x;
      this.targetX = this.nextPlatform.x;
      this.targetTimer = 1.0;
      this._doJump(dist);
    });

    // Start BGM on first interaction (unblocks Web Audio API autoplay restriction)
    const initBGM = () => {
      sfx._init();
      sfx.playBGM();
      window.removeEventListener('pointerdown', initBGM);
      window.removeEventListener('keydown', initBGM);
    };
    window.addEventListener('pointerdown', initBGM);
    window.addEventListener('keydown', initBGM);
  }

  // ── Start Game ───────────────────────────────────────────────────────────
  startGame() {
    sfx._init();
    sfx.playBGM();

    this.mainMenuScreen.classList.remove('active');
    this.gameOverScreen.classList.remove('active');
    this.topBarBadges.style.display = 'flex';

    this.score  = 0;
    this.coins  = 0;
    this.timeLeft = 30;
    this.lastSecondTime = Date.now();
    this.currentScoreVal.textContent = '0';
    this.currentCoinsVal.textContent = '0';
    this._updateTimerUI();
    this.cameraX   = 0;
    this.camTarget = 0;
    this.targetTimer = 0;

    particles.clear();
    this.platforms = [];
    this.coinsList = [];

    // First platform — wide and safe
    const p0 = this._makePlatform(100, 100);
    this.platforms.push(p0);
    this.currentPlatform = p0;

    // Generate one ahead (fixes overlapping bug)
    const p1 = this._spawnNext(p0);
    this.nextPlatform = p1;

    // Place player on center of first platform
    this.player.x   = p0.x;
    this.player.y   = this.GROUND - this.PLAT_H - this.player.radius + 6;
    this.player.vx  = 0;
    this.player.vy  = 0;
    this.player.rot = 0;

    this.state = 'PLAYING';
  }

  _updateTimerUI() {
    if (this.currentTimerVal) {
      this.currentTimerVal.textContent = this.timeLeft;
      if (this.timeLeft <= 10) {
        this.currentTimerVal.parentElement.classList.add('low-time');
      } else {
        this.currentTimerVal.parentElement.classList.remove('low-time');
      }
    }
  }

  _makePlatform(x, width) {
    return { x, width, height: this.PLAT_H };
  }

  _spawnNext(fromPlat) {
    const difficulty = Math.min(this.score * 2.5, 60);
    const dist  = this.MIN_DIST + Math.random() * (this.MAX_DIST - this.MIN_DIST) + difficulty;
    const w     = Math.max(70, 100 - this.score * 1.2 + Math.random() * 15); // Wider platforms look nicer for floating rings
    const plat  = this._makePlatform(fromPlat.x + dist, w);
    this.platforms.push(plat);

    // 45% item spawn on each platform except the first
    if (this.score > 0 || this.platforms.length > 2) {
      if (Math.random() < 0.45) {
        // 70% Coin, 30% Time Booster
        const itemType = Math.random() < 0.70 ? 'coin' : 'time';
        this.coinsList.push({
          x: plat.x,
          type: itemType,
          collected: false,
          pulse: Math.random() * Math.PI * 2
        });
      }
    }

    // Keep platform pool tidy (only keep last 6 to prevent duplication)
    while (this.platforms.length > 6) this.platforms.shift();
    return plat;
  }

  // ── Jump Physics ──────────────────────────────────────────────────────────
  _doJump(dist) {
    if (this.state !== 'PLAYING') return;
    this.state = 'JUMPING';
    sfx.playJump();

    // Parabolic formula: R = vx * T, H_peak from vy
    // With vx = k*p, vy = -m*p and gravity G:
    // time of flight T = 2*m*p/G
    // R = k*p * 2*m*p/G = 2*k*m*p² / G
    // So p = sqrt(R*G / (2*k*m))
    const k = 0.50, m = 0.90;
    const p = Math.sqrt(Math.max(dist, 10) * this.GRAVITY / (2 * k * m));
    this.player.vx  = p * k;
    this.player.vy  = -p * m;
    this.player.rot = 0;

    particles.spawn(this.player.x, this.player.y + this.player.radius, 'dust', 6);
  }

  // ── Game Over ─────────────────────────────────────────────────────────────
  _gameOver() {
    this.state = 'GAMEOVER';
    sfx.stopBGM();
    sfx.playGameOver();

    const isNewHigh = this.score > this.highScore;
    if (isNewHigh) {
      this.highScore = this.score;
      localStorage.setItem('wh_hi', this.highScore);
    }

    this.finalScoreVal.textContent = this.score;
    this.finalCoinsVal.textContent = this.coins;
    this.bestScoreVal.textContent  = this.highScore;

    // Dynamic Title Celebrations
    const titleEl = document.getElementById('gameOverTitle');
    const subEl   = document.getElementById('gameOverSub');
    if (titleEl && subEl) {
      if (isNewHigh) {
        titleEl.textContent = "REKOR BARU! 🏆";
        titleEl.style.color = "#fbbf24"; // Gold color
        titleEl.style.webkitTextFillColor = "#fbbf24";
        subEl.textContent = "Selamat! Kamu mencetak skor terbaik baru.";
      } else {
        titleEl.textContent = "BASAH KUYUP!";
        titleEl.style.color = "#ef4444"; // Red color
        titleEl.style.webkitTextFillColor = "#ef4444";
        subEl.textContent = "Kamu tenggelam di sungai";
      }
    }

    this.gameOverScreen.classList.add('active');
    this.topBarBadges.style.display = 'none';
  }

  // ── Update ────────────────────────────────────────────────────────────────
  _update() {
    this.time += 0.018;
    this.cameraX += (this.camTarget - this.cameraX) * 0.08;
    if (this.targetTimer > 0) this.targetTimer -= 0.04;

    // Countdown Timer Logic
    if (this.state === 'PLAYING' || this.state === 'JUMPING') {
      const now = Date.now();
      if (now - this.lastSecondTime >= 1000) {
        const elapsed = Math.floor((now - this.lastSecondTime) / 1000);
        this.timeLeft -= elapsed;
        this.lastSecondTime += elapsed * 1000;

        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this._updateTimerUI();
          this._gameOver();
        } else {
          this._updateTimerUI();
        }
      }
    }

    // Ambient bubbles
    if (Math.random() < 0.06) {
      particles.spawn(this.cameraX + Math.random() * this.W, this.H + 5, 'bubble', 1);
    }
    particles.update();

    // ─ JUMPING ─
    if (this.state === 'JUMPING') {
      this.player.vy += this.GRAVITY;
      this.player.x  += this.player.vx;
      this.player.y  += this.player.vy;
      this.player.rot += 0.05;

      // Coin & Time Booster pickup
      this.coinsList.forEach(c => {
        if (c.collected) return;
        const coinY = this.GROUND - this.PLAT_H - 34;
        const dx = this.player.x - c.x;
        const dy = this.player.y - coinY;
        if (Math.sqrt(dx*dx+dy*dy) < this.player.radius + 15) {
          c.collected = true;

          if (c.type === 'time') {
            // Clock collected (Adds only time!)
            this.timeLeft = Math.min(this.timeLeft + 5, 50);
            this._updateTimerUI();
            sfx.playCoin();
            particles.spawn(c.x, coinY, 'sparkle', 12, 'cyan');
            particles.spawn(c.x, coinY - 15, 'text', 1, '+5 Detik');
          } else {
            // Gold coin collected (Adds score & coin count, NO time!)
            this.coins++;
            this.currentCoinsVal.textContent = this.coins;
            sfx.playCoin();
            particles.spawn(c.x, coinY, 'sparkle', 12);
            particles.spawn(c.x, coinY - 15, 'text', 1, '+1 Koin');
          }
        }
      });

      // Landing detection — use direct refs
      if (!this.nextPlatform) return;
      const platTop = this.GROUND - this.PLAT_H;
      const half    = this.nextPlatform.width / 2;

      if (this.player.vy > 0 && this.player.y >= platTop - this.player.radius + 5) {
        const onNext = this.player.x >= this.nextPlatform.x - half &&
                       this.player.x <= this.nextPlatform.x + half;

        if (onNext) {
          // Safe landing!
          this.state       = 'PLAYING';
          this.score++;
          this.currentScoreVal.textContent = this.score;
          this.player.y    = platTop - this.player.radius + 6;
          this.player.vx   = 0;
          this.player.vy   = 0;
          this.player.rot  = 0;
          this.camTarget   = this.nextPlatform.x - 110;

          particles.spawn(this.player.x, this.player.y + this.player.radius, 'dust', 5);
          particles.spawn(this.player.x, this.player.y + this.player.radius, 'splash', 3);

          // Advance platform refs
          this.currentPlatform = this.nextPlatform;
          this.nextPlatform    = this._spawnNext(this.currentPlatform);
        } else {
          // Missed — check if overshot or between platforms
          const pastNext = this.player.x > this.nextPlatform.x + half;
          const inGap    = this.currentPlatform &&
                           this.player.x > this.currentPlatform.x + this.currentPlatform.width/2 &&
                           this.player.x < this.nextPlatform.x - half;
          if (pastNext || inGap) this.state = 'FALLING';
        }
      }

      // Fell below screen
      if (this.player.y > this.H + 50) this.state = 'FALLING';
    }

    // ─ FALLING ─
    if (this.state === 'FALLING') {
      this.player.vy += this.GRAVITY;
      this.player.x  += this.player.vx * 0.4;
      this.player.y  += this.player.vy;
      this.player.rot += 0.14;

      if (this.player.y >= this.GROUND + 20) {
        this.state      = 'DROWNING';
        this.player.vx  = 0;
        this.player.vy  = 0.8;
        sfx.playSplash();
        particles.spawn(this.player.x, this.GROUND + 30, 'splash', 22);
        particles.spawn(this.player.x, this.GROUND + 40, 'bubble', 8);
      }
    }

    // ─ DROWNING ─
    if (this.state === 'DROWNING') {
      this.player.y  += this.player.vy;
      this.player.vy  = Math.min(this.player.vy * 1.02, 4);
      if (Math.random() < 0.2) particles.spawn(this.player.x, this.player.y, 'bubble', 1);
      if (this.player.y > this.H + 60) this._gameOver();
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    const W = this.W, H = this.H, G = this.GROUND;
    ctx.clearRect(0, 0, W, H);

    // ── Sky Background ──
    const sky = ctx.createLinearGradient(0, 0, 0, G);
    sky.addColorStop(0, '#c8eeff');
    sky.addColorStop(1, '#a8dcf0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // ── Clouds ──
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 230 + 60 - this.cameraX * 0.08) % (W + 260) + W + 260) % (W + 260) - 130;
      const cy = 45 + (i % 3) * 28;
      const cr = 18 + (i % 2) * 8;
      ctx.beginPath();
      ctx.arc(cx,      cy,      cr,    0, Math.PI*2);
      ctx.arc(cx+cr*1.1, cy-8, cr*1.3, 0, Math.PI*2);
      ctx.arc(cx+cr*2.2, cy,    cr,    0, Math.PI*2);
      ctx.fill();
    }

    // ── Distant hills ──
    ctx.fillStyle = 'rgba(167,220,242,0.45)';
    for (let i = -1; i < W/250+2; i++) {
      const hx = i*250 + ((- this.cameraX * 0.18) % 250 + 250) % 250;
      ctx.beginPath(); ctx.arc(hx, G + 50, 180, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(140,210,235,0.35)';
    for (let i = -1; i < W/190+2; i++) {
      const hx = i*190 + 80 + ((- this.cameraX * 0.28) % 190 + 190) % 190;
      ctx.beginPath(); ctx.arc(hx, G + 60, 140, 0, Math.PI*2); ctx.fill();
    }

    // ── Camera transform ──
    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // ── Target ring ──
    if (this.targetTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.targetTimer;
      const r = 12 + (1 - this.targetTimer) * 30;
      ctx.strokeStyle = 'rgba(2,132,199,0.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.arc(this.targetX, G, r, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(this.targetX, G, 5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // ── Platforms ──
    this.platforms.forEach(p => this._drawPlatform(p));

    // ── Collectibles (Coins & Time Boosters) ──
    this.coinsList.forEach(c => {
      if (c.collected) return;
      const cy = G - this.PLAT_H - 34 + Math.sin(this.time * 3 + c.pulse) * 4;
      this._drawCollectible(c, cy);
    });

    // ── Particles ──
    particles.draw(ctx);

    // ── Player ──
    this._drawPlayer();

    ctx.restore(); // end camera

    // ── Water waves (foreground, screen-space) ──
    this._drawWater(W, H, G);
  }

  _drawPlatform(p) {
    const ctx = this.ctx;
    const img = assets.get('platform');
    if (img) {
      const top = this.GROUND - this.PLAT_H;
      ctx.drawImage(img, p.x - p.width / 2, top, p.width, this.PLAT_H);
      return;
    }

    const top = this.GROUND - this.PLAT_H;
    const centerY = top + this.PLAT_H / 2;
    const rx = p.width / 2;
    const ry = this.PLAT_H * 0.8;

    // 1. Water shadow below
    ctx.fillStyle = 'rgba(0, 40, 80, 0.15)';
    ctx.beginPath();
    ctx.ellipse(p.x, centerY + 8, rx + 4, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main body — single solid swim ring
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(p.x, centerY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Highlight shine on top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x, centerY - ry * 0.2, rx * 0.75, ry * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Subtle segment lines
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(p.x - rx * 0.7, centerY - ry * 0.6);
    ctx.quadraticCurveTo(p.x - rx * 0.85, centerY, p.x - rx * 0.7, centerY + ry * 0.6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p.x + rx * 0.7, centerY - ry * 0.6);
    ctx.quadraticCurveTo(p.x + rx * 0.85, centerY, p.x + rx * 0.7, centerY + ry * 0.6);
    ctx.stroke();
  }


  _drawCollectible(c, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(c.x, y);

    const spin = Math.abs(Math.cos(this.time * 4.5 + c.pulse));

    if (c.type === 'time') {
      const img = assets.get('time');
      if (img) {
        // Draw image with spin animation scale
        ctx.scale(spin, 1);
        ctx.drawImage(img, -15, -15, 30, 30);
        ctx.restore();
        return;
      }

      // ── Cyan Time Booster (Clock) ──
      // Glow
      const glow = ctx.createRadialGradient(0,0,1,0,0,22);
      glow.addColorStop(0,'rgba(6,182,212,0.45)');
      glow.addColorStop(1,'rgba(6,182,212,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.ellipse(0,0,22*spin+2,22,0,0,Math.PI*2); ctx.fill();

      // Outer rim (Cyan)
      ctx.fillStyle = '#0891b2';
      ctx.beginPath(); ctx.ellipse(0,0,14*spin,14,0,0,Math.PI*2); ctx.fill();

      // Clock face (White/Cyan)
      ctx.fillStyle = '#e0f7fa';
      ctx.beginPath(); ctx.ellipse(0,0,11*spin,11,0,0,Math.PI*2); ctx.fill();

      // Clock hands (Dark Cyan)
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(0, -6);
      ctx.moveTo(0,0);
      ctx.lineTo(5 * spin, 2);
      ctx.stroke();

      // Clock ringing bell ears (Top left & top right)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath(); ctx.arc(-9*spin, -9, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(9*spin, -9, 3, 0, Math.PI*2); ctx.fill();

    } else {
      const img = assets.get('coin');
      if (img) {
        // Draw image with spin animation scale
        ctx.scale(spin, 1);
        ctx.drawImage(img, -14, -14, 28, 28);
        ctx.restore();
        return;
      }

      // ── Gold Coin ──
      // Glow
      const glow = ctx.createRadialGradient(0,0,1,0,0,20);
      glow.addColorStop(0,'rgba(251,191,36,0.35)');
      glow.addColorStop(1,'rgba(251,191,36,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.ellipse(0,0,20*spin+2,20,0,0,Math.PI*2); ctx.fill();

      // Rim
      ctx.fillStyle = '#b45309';
      ctx.beginPath(); ctx.ellipse(0,0,14*spin,14,0,0,Math.PI*2); ctx.fill();

      // Face
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.ellipse(0,0,12*spin,12,0,0,Math.PI*2); ctx.fill();

      // Shine
      if (Math.sin(this.time*6+c.pulse) > 0.5) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.arc(3*spin,-3,2,0,Math.PI*2); ctx.fill();
      }
    }

    ctx.restore();
  }

  _drawPlayer() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.player.rot);

    const spr = assets.get(
      this.state === 'PLAYING' ? 'character_idle' :
      (this.state === 'JUMPING' && this.player.vy < 0) ? 'character_jump' :
      (this.state === 'DROWNING') ? 'character_drown' : 'character_fall'
    );

    if (spr) {
      const r = this.player.radius + 6;
      ctx.drawImage(spr, -r, -r, r*2, r*2);
    } else {
      // ── Cute Orange Cat Character ──
      const R = this.player.radius;
      const isJump = this.state === 'JUMPING' && this.player.vy < 0;
      const isFall = this.state === 'JUMPING' && this.player.vy >= 0;
      const isDrown = this.state === 'DROWNING';

      // Shadow
      ctx.save(); ctx.rotate(-this.player.rot);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(0, R+4, R*.7, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Tail
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (isDrown) {
        ctx.moveTo(12, 5); ctx.quadraticCurveTo(20, 15, 28, 12);
      } else if (isJump) {
        ctx.moveTo(10, 12); ctx.quadraticCurveTo(30, 10, 26, -10);
      } else if (isFall) {
        ctx.moveTo(10, -5); ctx.quadraticCurveTo(30, -15, 20, -25);
      } else {
        ctx.moveTo(12, 8); ctx.quadraticCurveTo(28, -5, 22, -18);
      }
      ctx.stroke();

      // Body
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.ellipse(0, 5, R*0.75, R*0.6, 0, 0, Math.PI*2); ctx.fill();

      // Belly
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath(); ctx.ellipse(0, 8, R*0.45, R*0.4, 0, 0, Math.PI*2); ctx.fill();

      // Legs
      ctx.fillStyle = '#f97316';
      if (isJump) {
        ctx.beginPath(); ctx.roundRect(-14, 12, 8, 14, 3); ctx.fill();
        ctx.beginPath(); ctx.roundRect(6, 12, 8, 14, 3); ctx.fill();
      } else if (isFall) {
        ctx.save(); ctx.rotate(-0.3);
        ctx.beginPath(); ctx.roundRect(-16, 10, 8, 12, 3); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.rotate(0.3);
        ctx.beginPath(); ctx.roundRect(8, 10, 8, 12, 3); ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.roundRect(-12, 14, 8, 10, 3); ctx.fill();
        ctx.beginPath(); ctx.roundRect(4, 14, 8, 10, 3); ctx.fill();
        // Paws
        ctx.fillStyle = '#fdba74';
        ctx.beginPath(); ctx.ellipse(-8, 24, 5, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, 24, 5, 3, 0, 0, Math.PI*2); ctx.fill();
      }

      // Head
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(0, -8, R*0.7, 0, Math.PI*2); ctx.fill();

      // Ears
      ctx.beginPath();
      ctx.moveTo(-12, -18); ctx.lineTo(-6, -28); ctx.lineTo(0, -18);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -18); ctx.lineTo(6, -28); ctx.lineTo(12, -18);
      ctx.fill();

      // Inner ears
      ctx.fillStyle = '#fda4af';
      ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(-6, -25); ctx.lineTo(-2, -18); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -18); ctx.lineTo(6, -25); ctx.lineTo(10, -18); ctx.fill();

      // Face
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath(); ctx.ellipse(0, -4, R*0.5, R*0.35, 0, 0, Math.PI*2); ctx.fill();

      // Stripes on forehead
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(-3, -15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(3, -15); ctx.stroke();

      // Eyes
      if (isDrown) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2; ctx.lineCap = 'round';
        [-7, 7].forEach(ex => {
          ctx.beginPath(); ctx.moveTo(ex-3, -10); ctx.lineTo(ex+3, -6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ex+3, -10); ctx.lineTo(ex-3, -6); ctx.stroke();
        });
      } else {
        const ey = isJump ? -10 : -8;
        const er = isJump ? 4 : 3.5;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.ellipse(-7, ey, 3.5, er, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(7, ey, 3.5, er, 0, 0, Math.PI*2); ctx.fill();
        // Eye highlights
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-8.5, ey-1.5, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(5.5, ey-1.5, 1.5, 0, Math.PI*2); ctx.fill();
      }

      // Nose
      ctx.fillStyle = '#fb7185';
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(-2.5, -2); ctx.lineTo(2.5, -2); ctx.closePath(); ctx.fill();

      // Mouth
      if (isDrown) {
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 2, 4, 0.2*Math.PI, 0.8*Math.PI); ctx.stroke();
      } else if (isJump) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 2.5, 0, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, -1, 4, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
      }

      // Whiskers
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-22, -7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-22, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-22, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(22, -7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(22, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(22, 3); ctx.stroke();

      // Drowning bubbles
      if (isDrown) {
        ctx.fillStyle = 'rgba(186,230,253,0.6)';
        ctx.beginPath(); ctx.arc(-8, -22, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-4, -28, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, -25, 2.5, 0, Math.PI*2); ctx.fill();
      }
    }

    ctx.restore();
  }

  _drawWater(W, H, G) {
    const ctx = this.ctx;
    // Water body
    const wg = ctx.createLinearGradient(0, G+25, 0, H);
    wg.addColorStop(0, '#7dd3fc');
    wg.addColorStop(1, '#38bdf8');
    ctx.fillStyle = wg;
    ctx.fillRect(0, G+25, W, H - G - 25);

    // Three animated sine waves layered
    const waves = [
      { speed:1.6, wl:160, amp:9,  col:'rgba(186,230,253,0.55)', top: G+18 },
      { speed:2.4, wl:220, amp:12, col:'rgba(125,211,252,0.70)', top: G+26 },
      { speed:1.1, wl:180, amp:7,  col:'rgba(56,189,248,0.88)',  top: G+35 }
    ];
    waves.forEach(w => {
      ctx.fillStyle = w.col;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const wx = x + this.cameraX;
        const y  = w.top + Math.sin(wx/w.wl + this.time*w.speed) * w.amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    });
  }

  // ── Loop ─────────────────────────────────────────────────────────────────
  _loop() {
    if (this.state !== 'MENU' && this.state !== 'GAMEOVER') this._update();
    this._draw();
    requestAnimationFrame(() => this._loop());
  }
}

// Start
window.addEventListener('load', () => { window.game = new WaterHopGame(); });
