// 신스 기반 오디오 모듈 — 외부 음원 없이 Web Audio API 로 효과음/BGM 합성
(function () {
  const SAVE_KEY = 'ignia-audio-v1';

  const AUDIO = window.AUDIO = {
    ctx: null,
    master: null,
    musicGain: null,
    sfxGain: null,
    musicEnabled: true,
    sfxEnabled: true,
    current: null, // { name, oscs:[], timer:null }

    init() {
      if (this.ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this._loadPrefs();
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.30 : 0;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? 0.70 : 0;
      this.sfxGain.connect(this.master);
    },
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    _loadPrefs() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const o = JSON.parse(raw);
        if (typeof o.music === 'boolean') this.musicEnabled = o.music;
        if (typeof o.sfx === 'boolean') this.sfxEnabled = o.sfx;
      } catch (e) {}
    },
    _savePrefs() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ music: this.musicEnabled, sfx: this.sfxEnabled }));
      } catch (e) {}
    },
    setMusic(on) {
      this.musicEnabled = !!on;
      if (this.musicGain) this.musicGain.gain.value = on ? 0.30 : 0;
      if (this.current && this.current.audio) this.current.audio.volume = on ? 0.55 : 0;
      this._savePrefs();
    },
    setSfx(on) {
      this.sfxEnabled = !!on;
      if (this.sfxGain) this.sfxGain.gain.value = on ? 0.70 : 0;
      this._savePrefs();
    },
    toggleMusic() { this.setMusic(!this.musicEnabled); return this.musicEnabled; },
    toggleSfx()   { this.setSfx(!this.sfxEnabled);     return this.sfxEnabled; },

    // ===== 합성 헬퍼 =====
    _tone(opts) {
      if (!this.ctx) return;
      const dest = opts.dest || this.sfxGain;
      const t = this.ctx.currentTime + (opts.when || 0);
      const dur = opts.dur || 0.15;
      const release = opts.release || 0.06;
      const o = this.ctx.createOscillator();
      o.type = opts.type || 'sine';
      o.frequency.setValueAtTime(opts.freq, t);
      if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freq + opts.slide), t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(opts.vol || 0.2, t + (opts.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + release + 0.02);
      return o;
    },
    _noise(opts) {
      if (!this.ctx) return;
      const dest = opts.dest || this.sfxGain;
      const t = this.ctx.currentTime + (opts.when || 0);
      const dur = opts.dur || 0.1;
      const release = opts.release || 0.04;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = opts.hipass || 200;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = opts.lopass || 8000;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(opts.vol || 0.2, t + (opts.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dest);
      src.start(t); src.stop(t + dur + release + 0.02);
    },
    _arp(notes, stepMs, opts) {
      notes.forEach((f, i) => {
        setTimeout(() => this._tone(Object.assign({ freq: f }, opts)), i * stepMs);
      });
    },

    // ===== 효과음 카탈로그 =====
    sfx(name) {
      this.resume();
      if (!this.ctx || !this.sfxEnabled) return;
      switch (name) {
        case 'click':
          this._tone({ freq: 720, dur: 0.04, type: 'square', vol: 0.10 });
          break;
        case 'hover':
          this._tone({ freq: 880, dur: 0.03, type: 'triangle', vol: 0.06 });
          break;
        case 'attack':
          this._noise({ dur: 0.10, vol: 0.18, hipass: 600, lopass: 5000 });
          this._tone({ freq: 220, dur: 0.16, type: 'sawtooth', vol: 0.18, slide: -120 });
          break;
        case 'crit':
          this._tone({ freq: 880, dur: 0.07, type: 'square', vol: 0.20 });
          this._tone({ freq: 1320, dur: 0.16, type: 'square', vol: 0.16, slide: 220, when: 0.04 });
          this._noise({ dur: 0.18, vol: 0.16, hipass: 800 });
          break;
        case 'skill':
          this._tone({ freq: 110, dur: 0.45, type: 'sawtooth', vol: 0.18, slide: 700 });
          this._noise({ dur: 0.5, vol: 0.14, hipass: 300, lopass: 3500 });
          break;
        case 'fire':
          // 화염 폭발 — 큰 노이즈 + 저음 임팩트
          this._tone({ freq: 80, dur: 0.35, type: 'sawtooth', vol: 0.24, slide: -40 });
          this._noise({ dur: 0.4, vol: 0.20, hipass: 200, lopass: 4500 });
          break;
        case 'meteor':
          // 길게 떨어지는 휘파람 + 임팩트
          this._tone({ freq: 1500, dur: 0.6, type: 'triangle', vol: 0.18, slide: -1300 });
          setTimeout(() => {
            this._tone({ freq: 60, dur: 0.5, type: 'sawtooth', vol: 0.30 });
            this._noise({ dur: 0.5, vol: 0.25, hipass: 100, lopass: 4000 });
          }, 600);
          break;
        case 'defend':
          this._tone({ freq: 100, dur: 0.16, type: 'square', vol: 0.18 });
          this._tone({ freq: 70,  dur: 0.20, type: 'square', vol: 0.16, when: 0.04 });
          break;
        case 'tool':
          this._tone({ freq: 660, dur: 0.08, type: 'triangle', vol: 0.22, slide: 220 });
          break;
        case 'potion':
          this._tone({ freq: 440, dur: 0.10, type: 'triangle', vol: 0.20, slide: 250 });
          this._tone({ freq: 660, dur: 0.10, type: 'triangle', vol: 0.18, slide: 250, when: 0.05 });
          break;
        case 'bomb':
          this._tone({ freq: 60, dur: 0.30, type: 'sawtooth', vol: 0.30 });
          this._noise({ dur: 0.35, vol: 0.25, hipass: 150, lopass: 3000 });
          break;
        case 'hit':
          this._noise({ dur: 0.10, vol: 0.30, hipass: 200, lopass: 1800 });
          this._tone({ freq: 60, dur: 0.12, type: 'sawtooth', vol: 0.20 });
          break;
        case 'heal':
          this._tone({ freq: 660, dur: 0.18, type: 'sine', vol: 0.20, slide: 240 });
          this._tone({ freq: 990, dur: 0.18, type: 'sine', vol: 0.14, slide: 240, when: 0.05 });
          break;
        case 'burn':
          this._noise({ dur: 0.05, vol: 0.08, hipass: 1500, lopass: 4500 });
          break;
        case 'thorn':
          this._tone({ freq: 1500, dur: 0.05, type: 'square', vol: 0.16, slide: -800 });
          break;
        case 'death':
          this._tone({ freq: 220, dur: 0.55, type: 'sawtooth', vol: 0.22, slide: -180 });
          this._noise({ dur: 0.55, vol: 0.18, hipass: 100, lopass: 1500 });
          break;
        case 'flee':
          this._tone({ freq: 880, dur: 0.18, type: 'triangle', vol: 0.16, slide: -400 });
          break;
        case 'coin':
          this._tone({ freq: 1320, dur: 0.05, type: 'square', vol: 0.18 });
          this._tone({ freq: 1760, dur: 0.10, type: 'square', vol: 0.14, when: 0.04 });
          break;
        case 'fork':
          this._tone({ freq: 440, dur: 0.06, type: 'triangle', vol: 0.16 });
          this._tone({ freq: 660, dur: 0.06, type: 'triangle', vol: 0.14, when: 0.05 });
          break;
        case 'select':
          this._tone({ freq: 880, dur: 0.06, type: 'triangle', vol: 0.18 });
          this._tone({ freq: 1320, dur: 0.10, type: 'triangle', vol: 0.14, when: 0.04 });
          break;
        case 'cancel':
          this._tone({ freq: 440, dur: 0.08, type: 'square', vol: 0.14, slide: -120 });
          break;
        case 'open':
          this._tone({ freq: 220, dur: 0.20, type: 'triangle', vol: 0.18, slide: 440 });
          break;
        case 'shop':
          this._arp([523, 659, 784], 70, { dur: 0.12, type: 'triangle', vol: 0.18 });
          break;
        case 'spring':
          // 샘물 — 차임
          this._arp([784, 988, 1175, 1568], 80, { dur: 0.30, type: 'sine', vol: 0.16 });
          break;
        case 'arina':
          // 서큐버스 — 묘한 차임
          this._tone({ freq: 660, dur: 0.4, type: 'sine', vol: 0.18, slide: 200 });
          this._tone({ freq: 990, dur: 0.5, type: 'sine', vol: 0.12, slide: -300, when: 0.1 });
          break;
        case 'boon':
          this._arp([523, 659, 784, 1046], 60, { dur: 0.18, type: 'triangle', vol: 0.18 });
          break;
        case 'levelup':
          this._arp([523, 659, 784, 988], 70, { dur: 0.18, type: 'square', vol: 0.18 });
          break;
        case 'legendary':
          // 골드 임팩트 — 큰 벨 + 화음
          this._tone({ freq: 220, dur: 1.4, type: 'sine', vol: 0.26 });
          this._tone({ freq: 330, dur: 1.4, type: 'sine', vol: 0.22 });
          this._tone({ freq: 440, dur: 1.4, type: 'triangle', vol: 0.18 });
          setTimeout(() => this._tone({ freq: 880, dur: 1.0, type: 'sine', vol: 0.20 }), 80);
          this._noise({ dur: 0.6, vol: 0.10, hipass: 1500, lopass: 6000 });
          break;
        case 'fanfare':
          this._arp([523, 659, 784, 1046, 1318], 110, { dur: 0.30, type: 'square', vol: 0.18 });
          break;
        case 'gameover':
          this._arp([330, 277, 220, 165], 220, { dur: 0.40, type: 'sawtooth', vol: 0.22 });
          break;
      }
    },

    // 파일 기반 BGM 매핑 (없으면 합성)
    _files: {
      title: '../assets/audio/title.mp3',
    },

    // ===== BGM (앰비언트) =====
    music(track) {
      this.resume();
      if (this.current && this.current.name === track) return;
      this._stopMusic();
      if (!track) return;
      if (this._files[track]) {
        this._playFileMusic(track, this._files[track]);
        return;
      }
      if (!this.ctx) {
        this.current = { name: track, stop: () => {} };
        return;
      }
      this._buildMusic(track);
    },
    _playFileMusic(track, src) {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = this.musicEnabled ? 0.55 : 0;
      audio.preload = 'auto';
      audio.play().catch(() => { /* 사용자 제스처 전엔 거부될 수 있음 */ });
      this.current = { name: track, audio, file: true };
    },
    _stopMusic() {
      if (!this.current) return;
      const c = this.current;
      this.current = null;
      if (c.audio) {
        try {
          const a = c.audio;
          // 페이드 아웃
          const start = a.volume;
          let v = start;
          const step = () => {
            v -= start / 10;
            if (v <= 0) { a.pause(); a.currentTime = 0; return; }
            a.volume = Math.max(0, v);
            setTimeout(step, 40);
          };
          step();
        } catch (e) {}
        return;
      }
      try { for (const o of (c.oscs || [])) try { o.stop(); } catch(e){} } catch(e){}
      if (c.timer) { clearInterval(c.timer); }
      if (c.fadeGain && this.ctx) {
        try {
          const t = this.ctx.currentTime;
          c.fadeGain.gain.cancelScheduledValues(t);
          c.fadeGain.gain.setValueAtTime(c.fadeGain.gain.value, t);
          c.fadeGain.gain.linearRampToValueAtTime(0, t + 0.4);
        } catch (e) {}
      }
    },
    _buildMusic(track) {
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const fade = ctx.createGain();
      fade.gain.setValueAtTime(0, t);
      fade.gain.linearRampToValueAtTime(1, t + 1.5);
      fade.connect(this.musicGain);

      // 트랙별 코드
      const chords = {
        title:    [110.0, 138.6, 164.8, 220.0],
        explore:  [98.0,  146.8, 196.0, 261.6],
        battle:   [82.4,  110.0, 138.6, 164.8],
        boss:     [73.4,  87.3,  110.0, 130.8],
        shop:     [130.8, 164.8, 196.0, 261.6],
        result:   [123.5, 155.6, 185.0, 246.9],
      };
      const freqs = chords[track] || chords.title;
      const oscs = [];
      for (const f of freqs) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.07;
        // 느린 LFO 로 살짝씩 진동
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.08 + Math.random() * 0.18;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 0.025;
        lfo.connect(lfoG); lfoG.connect(g.gain);
        o.connect(g); g.connect(fade);
        o.start(t); lfo.start(t);
        oscs.push(o); oscs.push(lfo);
      }

      // 멜로디 패턴 (전투/보스/탐험)
      let timer = null;
      const melodies = {
        battle:  { root: 330, pat: [0, 3, 5, 3, 7, 5, 3, 0], step: 380, type: 'triangle', vol: 0.06 },
        boss:    { root: 220, pat: [0, 3, 2, 5, 3, 2, 0, -2], step: 480, type: 'sawtooth', vol: 0.07 },
        explore: { root: 392, pat: [0, 4, 7, 4],            step: 720, type: 'triangle', vol: 0.045 },
        shop:    { root: 523, pat: [0, 4, 7, 12, 7, 4],     step: 480, type: 'triangle', vol: 0.05 },
      };
      const m = melodies[track];
      if (m) {
        let i = 0;
        const tick = () => {
          if (!this.current || this.current.name !== track) return;
          const semi = m.pat[i % m.pat.length];
          const f = m.root * Math.pow(2, semi / 12);
          this._tone({ dest: fade, freq: f, dur: m.step / 1000 * 0.6, type: m.type, vol: m.vol, attack: 0.02, release: 0.18 });
          i++;
        };
        timer = setInterval(tick, m.step);
        // 첫 노트는 약간 딜레이
        setTimeout(tick, 600);
      }

      this.current = { name: track, oscs, timer, fadeGain: fade };
    },
  };
})();
