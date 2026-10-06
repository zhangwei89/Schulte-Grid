/**
 * 舒尔特方格 (Schulte Table) - 核心游戏引擎与交互逻辑
 * Schulte Focus Master - Interactive Web Game Engine
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. 字符生成与映射库 (科学规范汉字与字母)
  // =========================================================================

  function toChineseSimple(n) {
    const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (n <= 10) return digits[n];
    if (n < 20) return '十' + digits[n % 10];
    const tens = Math.floor(n / 10);
    const units = n % 10;
    return digits[tens] + '十' + (units > 0 ? digits[units] : '');
  }

  function toChineseUpper(n) {
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'];
    if (n <= 10) return digits[n];
    if (n < 20) return '拾' + digits[n % 10];
    const tens = Math.floor(n / 10);
    const units = n % 10;
    return digits[tens] + '拾' + (units > 0 ? digits[units] : '');
  }

  function getCharLabel(num, type) {
    if (type === 'letter') {
      if (num <= 26) return String.fromCharCode(64 + num); // A - Z
      if (num <= 52) return String.fromCharCode(96 + (num - 26)); // a - z
      return 'A' + (num - 52);
    }
    if (type === 'chinese_simple' || type === 'chinese') {
      return toChineseSimple(num);
    }
    if (type === 'chinese_upper') {
      return toChineseUpper(num);
    }
    return String(num);
  }

  const RATING_THRESHOLDS = {
    3: { sss: 4.0, ss: 6.0, s: 8.5, a: 12.0 },
    4: { sss: 7.5, ss: 11.0, s: 15.0, a: 22.0 },
    5: { sss: 12.0, ss: 18.0, s: 25.0, a: 35.0 },
    6: { sss: 22.0, ss: 32.0, s: 45.0, a: 60.0 },
    7: { sss: 36.0, ss: 52.0, s: 72.0, a: 95.0 }
  };

  const RATING_DESCRIPTIONS = {
    SSS: {
      title: 'SSS 级 · 超常神级专注力 (飞行员/速读大师级)',
      desc: '恭喜！你的周边视野（余光）极其开阔，视线跳跃与短时记忆极快，达到了专业飞行员、特种速读学员的卓越水平！'
    },
    SS: {
      title: 'SS 级 · 极优秀专注力',
      desc: '非常出色！注意力高度凝聚，反应极快，周边余光利用效率远超常人水平，请继续保持！'
    },
    S: {
      title: 'S 级 · 良好水平',
      desc: '成绩优秀，注意力分配平衡，属于普通人群中的佼佼者。尝试训练视线固定在中心，用余光抓取目标会更快！'
    },
    A: {
      title: 'A 级 · 中等常态水平',
      desc: '正常生理反应水平。建议每日坚持训练 3-5 局，训练时眼球尽量不要剧烈转动，尝试扩大余光视野。'
    },
    B: {
      title: 'B 级 · 需进一步练习',
      desc: '目前视线可能还在逐格搜索，容易造成眼肌疲劳。请尝试注视正中心锚点，练习用周边视野感知周围数字。'
    }
  };

  // =========================================================================
  // 2. 音频合成引擎 (Web Audio API)
  // =========================================================================

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.gainNode = null;
      this.muted = false;
      this.volume = 0.7;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.gainNode = this.ctx.createGain();
          this.gainNode.gain.value = this.muted ? 0 : this.volume;
          this.gainNode.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setMuted(muted) {
      this.muted = muted;
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
      }
    }

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol / 100));
      if (this.gainNode && this.ctx && !this.muted) {
        this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
    }

    playCorrect(stepIndex, totalSteps) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const baseFreq = 440;
      const topFreq = 880;
      const progress = totalSteps > 1 ? stepIndex / totalSteps : 1;
      const freq = baseFreq + (topFreq - baseFreq) * progress;

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      noteGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.28, this.ctx.currentTime + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.14);

      osc.connect(noteGain);
      noteGain.connect(this.gainNode);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    }

    playError() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(95, this.ctx.currentTime + 0.22);

      noteGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.22);

      osc.connect(noteGain);
      noteGain.connect(this.gainNode);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.23);
    }

    playCountdownTick(isFinal) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = isFinal ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isFinal ? 880 : 523.25, this.ctx.currentTime);

      g.gain.setValueAtTime(0.001, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(isFinal ? 0.35 : 0.2, this.ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + (isFinal ? 0.35 : 0.15));

      osc.connect(g);
      g.connect(this.gainNode);

      osc.start();
      osc.stop(this.ctx.currentTime + (isFinal ? 0.38 : 0.18));
    }

    playVictory() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const chords = [523.25, 659.25, 783.99, 1046.50];
      const now = this.ctx.currentTime;
      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);

        const t = now + idx * 0.11;
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

        osc.connect(g);
        g.connect(this.gainNode);

        osc.start(t);
        osc.stop(t + 0.55);
      });
    }
  }

  // =========================================================================
  // 3. 庆祝烟花粒子系统 (Canvas Confetti)
  // =========================================================================

  class ConfettiEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.animId = null;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    burst() {
      this.resize();
      this.particles = [];
      const colors = ['#4f46e5', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
      for (let i = 0; i < 90; i++) {
        this.particles.push({
          x: this.canvas.width * (0.3 + Math.random() * 0.4),
          y: this.canvas.height * 0.45,
          vx: (Math.random() - 0.5) * 16,
          vy: (Math.random() - 0.8) * 18,
          size: Math.random() * 8 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          opacity: 1,
          decay: Math.random() * 0.008 + 0.006
        });
      }
      if (this.animId) cancelAnimationFrame(this.animId);
      this.render();
    }

    render() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      let alive = 0;
      for (let p of this.particles) {
        if (p.opacity <= 0) continue;
        alive++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.42;
        p.vx *= 0.98;
        p.rotation += p.rotSpeed;
        p.opacity -= p.decay;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = Math.max(0, p.opacity);
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.3);
        this.ctx.restore();
      }

      if (alive > 0) {
        this.animId = requestAnimationFrame(() => this.render());
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  // =========================================================================
  // 4. 舒尔特方格核心游戏控制器 (SchulteGame)
  // =========================================================================

  class SchulteGame {
    constructor() {
      // DOM 元素获取
      this.sizeSelector = document.getElementById('sizeSelector');
      this.modeSelector = document.getElementById('modeSelector');
      this.timerDisplay = document.getElementById('timerDisplay');
      this.targetDisplay = document.getElementById('targetDisplay');
      this.bestRecordDisplay = document.getElementById('bestRecordDisplay');
      this.errorDisplay = document.getElementById('errorDisplay');
      this.focalPoint = document.getElementById('focalPoint');
      this.schulteGrid = document.getElementById('schulteGrid');
      this.gridOverlay = document.getElementById('gridOverlay');
      this.overlayContent = document.getElementById('overlayContent');
      this.overlayTitle = document.getElementById('overlayTitle');
      this.overlayDesc = document.getElementById('overlayDesc');
      this.startPlayBtn = document.getElementById('startPlayBtn');
      this.restartBtn = document.getElementById('restartBtn');
      this.soundToggleBtn = document.getElementById('soundToggleBtn');
      this.soundText = document.getElementById('soundText');
      this.focalToggleBtn = document.getElementById('focalToggleBtn');
      this.fullscreenBtn = document.getElementById('fullscreenBtn');
      this.progressBar = document.getElementById('progressBar');
      this.themeToggleBtn = document.getElementById('themeToggleBtn');

      // 弹窗元素
      this.resultModal = document.getElementById('resultModal');
      this.resultRankBadge = document.getElementById('resultRankBadge');
      this.resultTitle = document.getElementById('resultTitle');
      this.resultSubtitle = document.getElementById('resultSubtitle');
      this.resultTime = document.getElementById('resultTime');
      this.resultAvgReaction = document.getElementById('resultAvgReaction');
      this.resultErrors = document.getElementById('resultErrors');
      this.resultFastest = document.getElementById('resultFastest');
      this.ratingTitle = document.getElementById('ratingTitle');
      this.ratingDesc = document.getElementById('ratingDesc');
      this.paceChartBars = document.getElementById('paceChartBars');
      this.resultShareBtn = document.getElementById('resultShareBtn');
      this.resultAgainBtn = document.getElementById('resultAgainBtn');

      this.statsModal = document.getElementById('statsModal');
      this.statsBtn = document.getElementById('statsBtn');
      this.totalGamesCount = document.getElementById('totalGamesCount');
      this.standardBestTime = document.getElementById('standardBestTime');
      this.averageTimeOverall = document.getElementById('averageTimeOverall');
      this.pbGrid = document.getElementById('pbGrid');
      this.historyTableBody = document.getElementById('historyTableBody');
      this.clearDataBtn = document.getElementById('clearDataBtn');

      this.settingsModal = document.getElementById('settingsModal');
      this.settingsBtn = document.getElementById('settingsBtn');
      this.settingCountdown = document.getElementById('settingCountdown');
      this.settingNextHint = document.getElementById('settingNextHint');
      this.settingErrorPenalty = document.getElementById('settingErrorPenalty');
      this.settingSoundVol = document.getElementById('settingSoundVol');
      this.settingNumType = document.getElementById('settingNumType');
      this.settingThemeHue = document.getElementById('settingThemeHue');

      this.guideModal = document.getElementById('guideModal');
      this.guideBtn = document.getElementById('guideBtn');

      // 烟花与音效
      this.confettiCanvas = document.getElementById('confettiCanvas');
      this.sound = new SoundEngine();
      this.confetti = new ConfettiEngine(this.confettiCanvas);

      // 状态变量
      this.size = 5;
      this.mode = 'classic';
      this.status = 'idle';
      this.currentTarget = 1;
      this.stepIndex = 0;
      this.totalSteps = 25;
      this.startTime = 0;
      this.elapsedTime = 0;
      this.penaltyTime = 0;
      this.timerId = null;
      this.errors = 0;
      this.lastStepTime = 0;
      this.paceHistory = [];
      this.countdownTimer = null;
      this.isFocalVisible = true;

      // 关键高亮管理：记录当前选中的方格
      // 用户要求：选中的数字变色，选择其他文字时恢复原有颜色
      this.lastSelectedCell = null;

      // 设置项
      this.settings = {
        countdown: true,
        nextHint: false,
        errorPenalty: true,
        soundVol: 70,
        numType: 'arabic',
        themeHue: 'indigo'
      };

      this.loadSettings();
      this.initTheme();
      this.bindEvents();
      this.updatePBDisplay();
      this.renderBoard();
    }

    loadSettings() {
      try {
        const saved = localStorage.getItem('schulte_settings_v2');
        if (saved) {
          Object.assign(this.settings, JSON.parse(saved));
        }
      } catch (e) {}

      if (this.settingCountdown) this.settingCountdown.checked = this.settings.countdown;
      if (this.settingNextHint) this.settingNextHint.checked = this.settings.nextHint;
      if (this.settingErrorPenalty) this.settingErrorPenalty.checked = this.settings.errorPenalty;
      if (this.settingSoundVol) this.settingSoundVol.value = this.settings.soundVol;
      if (this.settingNumType) this.settingNumType.value = this.settings.numType;
      if (this.settingThemeHue) this.settingThemeHue.value = this.settings.themeHue;

      this.sound.setVolume(this.settings.soundVol);
      const isMuted = localStorage.getItem('schulte_muted') === 'true';
      this.sound.setMuted(isMuted);
      this.updateSoundBtnUI(isMuted);

      document.documentElement.setAttribute('data-hue', this.settings.themeHue);
    }

    saveSettings() {
      try {
        localStorage.setItem('schulte_settings_v2', JSON.stringify(this.settings));
      } catch (e) {}
    }

    initTheme() {
      const savedTheme = localStorage.getItem('schulte_theme_mode') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.documentElement.setAttribute('data-hue', this.settings.themeHue);
    }

    toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('schulte_theme_mode', next);
    }

    updateSoundBtnUI(muted) {
      if (!this.soundToggleBtn) return;
      if (muted) {
        this.soundToggleBtn.classList.add('muted');
        if (this.soundText) this.soundText.textContent = '音效已静音';
      } else {
        this.soundToggleBtn.classList.remove('muted');
        if (this.soundText) this.soundText.textContent = '音效开启';
      }
    }

    toggleSound() {
      const nextMuted = !this.sound.muted;
      this.sound.setMuted(nextMuted);
      localStorage.setItem('schulte_muted', String(nextMuted));
      this.updateSoundBtnUI(nextMuted);
    }

    toggleFocalPoint() {
      this.isFocalVisible = !this.isFocalVisible;
      if (this.focalPoint) {
        if (this.isFocalVisible) {
          this.focalPoint.classList.remove('hidden');
        } else {
          this.focalPoint.classList.add('hidden');
        }
      }
      if (this.focalToggleBtn) {
        this.focalToggleBtn.classList.toggle('active', this.isFocalVisible);
      }
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }

    getModeName(mode) {
      const map = {
        classic: '正序 (1→N)',
        reverse: '倒序 (N→1)',
        blind: '记忆消隐',
        color: '色彩干扰',
        shuffle: '动态微移'
      };
      return map[mode] || mode;
    }

    bindEvents() {
      if (this.sizeSelector) {
        this.sizeSelector.addEventListener('click', (e) => {
          const btn = e.target.closest('.seg-btn');
          if (!btn) return;
          const s = parseInt(btn.dataset.size, 10);
          if (s && s !== this.size) {
            this.sizeSelector.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.size = s;
            this.resetGame();
          }
        });
      }

      if (this.modeSelector) {
        this.modeSelector.addEventListener('click', (e) => {
          const btn = e.target.closest('.seg-btn');
          if (!btn) return;
          const m = btn.dataset.mode;
          if (m && m !== this.mode) {
            this.modeSelector.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.mode = m;
            this.resetGame();
          }
        });
      }

      if (this.startPlayBtn) {
        this.startPlayBtn.addEventListener('click', () => this.startGame());
      }
      if (this.restartBtn) {
        this.restartBtn.addEventListener('click', () => this.resetGame());
      }
      if (this.soundToggleBtn) {
        this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
      }
      if (this.focalToggleBtn) {
        this.focalToggleBtn.addEventListener('click', () => this.toggleFocalPoint());
      }
      if (this.fullscreenBtn) {
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
      }
      if (this.themeToggleBtn) {
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
      }

      if (this.guideBtn) {
        this.guideBtn.addEventListener('click', () => this.openModal('guideModal'));
      }
      if (this.statsBtn) {
        this.statsBtn.addEventListener('click', () => {
          this.renderStatsModal();
          this.openModal('statsModal');
        });
      }
      if (this.settingsBtn) {
        this.settingsBtn.addEventListener('click', () => this.openModal('settingsModal'));
      }
      if (this.clearDataBtn) {
        this.clearDataBtn.addEventListener('click', () => this.clearAllData());
      }
      if (this.resultAgainBtn) {
        this.resultAgainBtn.addEventListener('click', () => {
          this.closeModal('resultModal');
          this.startGame();
        });
      }
      if (this.resultShareBtn) {
        this.resultShareBtn.addEventListener('click', () => this.copyShareReport());
      }

      document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
          if (e.target.classList.contains('modal-backdrop') || e.target.closest('[data-close]')) {
            modal.classList.remove('active');
          }
        });
      });

      if (this.settingCountdown) {
        this.settingCountdown.addEventListener('change', (e) => {
          this.settings.countdown = e.target.checked;
          this.saveSettings();
        });
      }
      if (this.settingNextHint) {
        this.settingNextHint.addEventListener('change', (e) => {
          this.settings.nextHint = e.target.checked;
          this.saveSettings();
          this.updateHintHighlight();
        });
      }
      if (this.settingErrorPenalty) {
        this.settingErrorPenalty.addEventListener('change', (e) => {
          this.settings.errorPenalty = e.target.checked;
          this.saveSettings();
        });
      }
      if (this.settingSoundVol) {
        this.settingSoundVol.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.settings.soundVol = val;
          this.sound.setVolume(val);
          this.saveSettings();
        });
      }
      if (this.settingNumType) {
        this.settingNumType.addEventListener('change', (e) => {
          this.settings.numType = e.target.value;
          this.saveSettings();
          this.renderBoard();
        });
      }
      if (this.settingThemeHue) {
        this.settingThemeHue.addEventListener('change', (e) => {
          this.settings.themeHue = e.target.value;
          document.documentElement.setAttribute('data-hue', e.target.value);
          this.saveSettings();
        });
      }

      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        if (e.code === 'Space') {
          e.preventDefault();
          if (this.resultModal && this.resultModal.classList.contains('active')) {
            this.closeModal('resultModal');
            this.startGame();
          } else if (this.status === 'idle' || this.status === 'finished') {
            this.startGame();
          }
        } else if (e.key === 'r' || e.key === 'R') {
          this.resetGame();
        } else if (e.key === 'm' || e.key === 'M') {
          this.toggleSound();
        } else if (e.key === 'h' || e.key === 'H') {
          this.toggleFocalPoint();
        } else if (e.key === 'f' || e.key === 'F') {
          this.toggleFullscreen();
        } else if (e.key === 'Escape') {
          document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
      });
    }

    openModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.add('active');
    }

    closeModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove('active');
    }

    renderBoard() {
      this.totalSteps = this.size * this.size;
      this.schulteGrid.className = 'schulte-grid size-' + this.size;

      if (this.mode === 'blind') {
        this.schulteGrid.classList.add('dim-clicked');
      } else {
        this.schulteGrid.classList.remove('dim-clicked');
      }

      this.currentTarget = (this.mode === 'reverse') ? this.totalSteps : 1;
      this.stepIndex = 0;
      this.lastSelectedCell = null;
      this.updateTargetDisplay();

      if (this.progressBar) {
        this.progressBar.style.width = '0%';
      }

      const nums = [];
      for (let i = 1; i <= this.totalSteps; i++) {
        nums.push(i);
      }
      for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }

      const colorPalette = [
        '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
        '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'
      ];

      this.schulteGrid.innerHTML = '';
      const fragment = document.createDocumentFragment();

      nums.forEach((val, idx) => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.value = val;
        cell.dataset.index = idx;
        cell.textContent = getCharLabel(val, this.settings.numType);

        if (this.mode === 'color') {
          const c = colorPalette[(val - 1) % colorPalette.length];
          cell.style.color = c;
          cell.dataset.origColor = c;
        }

        cell.addEventListener('pointerdown', (e) => this.handleCellClick(cell, val, e));
        fragment.appendChild(cell);
      });

      this.schulteGrid.appendChild(fragment);

      this.updateHintHighlight();

      this.gridOverlay.classList.remove('hidden');
      this.overlayTitle.textContent = '舒尔特专注力挑战';
      this.overlayDesc.textContent = '规格 ' + this.size + '×' + this.size + ' · ' + this.getModeName(this.mode) + '。点击开始或按空格键！';
      this.startPlayBtn.textContent = '开始挑战';
      this.startPlayBtn.style.display = 'inline-block';

      this.updatePBDisplay();
    }

    updateTargetDisplay() {
      if (this.targetDisplay) {
        this.targetDisplay.textContent = getCharLabel(this.currentTarget, this.settings.numType);
      }
    }

    updateHintHighlight() {
      document.querySelectorAll('.grid-cell.hint-target').forEach(c => c.classList.remove('hint-target'));
      if (!this.settings.nextHint || this.status !== 'playing') return;

      const targetCell = this.schulteGrid.querySelector(`.grid-cell[data-value="${this.currentTarget}"]`);
      if (targetCell) {
        targetCell.classList.add('hint-target');
      }
    }

    startGame() {
      if (this.status === 'playing' || this.status === 'countdown') return;

      this.sound.init();

      if (this.settings.countdown) {
        this.startCountdown();
      } else {
        this.launchGamePlay();
      }
    }

    startCountdown() {
      this.status = 'countdown';
      this.startPlayBtn.style.display = 'none';
      let count = 3;

      this.overlayTitle.textContent = String(count);
      this.overlayDesc.textContent = '准备专注，目视正中心锚点...';
      this.sound.playCountdownTick(false);

      if (this.countdownTimer) clearInterval(this.countdownTimer);

      this.countdownTimer = setInterval(() => {
        count--;
        if (count > 0) {
          this.overlayTitle.textContent = String(count);
          this.sound.playCountdownTick(false);
        } else if (count === 0) {
          this.overlayTitle.textContent = '开始!';
          this.sound.playCountdownTick(true);
        } else {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          this.launchGamePlay();
        }
      }, 700);
    }

    launchGamePlay() {
      this.gridOverlay.classList.add('hidden');
      this.status = 'playing';
      this.stepIndex = 0;
      this.errors = 0;
      if (this.errorDisplay) this.errorDisplay.textContent = '0';
      this.penaltyTime = 0;
      this.paceHistory = [];
      this.lastSelectedCell = null;

      this.startTime = performance.now();
      this.lastStepTime = this.startTime;
      this.elapsedTime = 0;

      if (this.timerId) cancelAnimationFrame(this.timerId);
      this.timerId = requestAnimationFrame(() => this.tickTimer());

      this.updateHintHighlight();
    }

    tickTimer() {
      if (this.status !== 'playing') return;
      const now = performance.now();
      this.elapsedTime = now - this.startTime;
      const totalMs = this.elapsedTime + this.penaltyTime;
      if (this.timerDisplay) {
        this.timerDisplay.textContent = this.formatTime(totalMs);
      }
      this.timerId = requestAnimationFrame(() => this.tickTimer());
    }

    formatTime(ms) {
      if (ms < 0) ms = 0;
      const totalHundredths = Math.floor(ms / 10);
      const hundredths = totalHundredths % 100;
      const totalSeconds = Math.floor(totalHundredths / 100);
      const seconds = totalSeconds % 60;
      const minutes = Math.floor(totalSeconds / 60);

      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');
      const hStr = String(hundredths).padStart(2, '0');
      return `${mStr}:${sStr}.${hStr}`;
    }

    /**
     * 方格点击核心交互逻辑
     * 严格执行用户规则：选中的数字变色，选择其他文字时恢复原有颜色
     */
    handleCellClick(cell, val, e) {
      if (e) e.preventDefault();

      if (this.status !== 'playing') {
        if (this.status === 'idle') {
          this.startGame();
        }
        return;
      }

      const targetVal = this.currentTarget;

      if (val === targetVal) {
        // ==================== 正确击中 ====================
        const now = performance.now();
        const stepPace = this.lastStepTime > 0 ? (now - this.lastStepTime) : (now - this.startTime);
        this.lastStepTime = now;
        this.paceHistory.push(Math.round(stepPace));

        this.stepIndex++;
        this.sound.playCorrect(this.stepIndex, this.totalSteps);

        // 1. 恢复上一个选中方格的原有颜色
        if (this.lastSelectedCell && this.lastSelectedCell !== cell) {
          this.lastSelectedCell.classList.remove('selected');
          if (this.lastSelectedCell.dataset.origColor) {
            this.lastSelectedCell.style.color = this.lastSelectedCell.dataset.origColor;
          } else {
            this.lastSelectedCell.style.color = '';
          }
          if (this.lastSelectedCell.dataset.origBg) {
            this.lastSelectedCell.style.backgroundColor = this.lastSelectedCell.dataset.origBg;
          } else {
            this.lastSelectedCell.style.backgroundColor = '';
          }

          // 在记忆消隐模式下，恢复原有样式后渐隐目标
          if (this.mode === 'blind') {
            this.lastSelectedCell.classList.add('blind-hidden');
          }
        }

        // 2. 当前选中的数字变色高亮
        cell.classList.add('selected');
        cell.classList.add('hit-correct');
        cell.classList.add('clicked');
        setTimeout(() => cell.classList.remove('hit-correct'), 300);

        // 更新记录：当前方格成为最新选中的方格
        this.lastSelectedCell = cell;

        // 3. 模式特殊效果：动态微移
        if (this.mode === 'shuffle') {
          this.shuffleUnclickedCells();
        }

        // 4. 进度条更新
        if (this.progressBar) {
          const pct = (this.stepIndex / this.totalSteps) * 100;
          this.progressBar.style.width = pct + '%';
        }

        // 5. 结算或推进下一目标
        if (this.stepIndex >= this.totalSteps) {
          this.finishGame();
        } else {
          if (this.mode === 'reverse') {
            this.currentTarget--;
          } else {
            this.currentTarget++;
          }
          this.updateTargetDisplay();
          this.updateHintHighlight();
        }

      } else {
        // ==================== 误触惩罚 ====================
        this.sound.playError();
        this.errors++;
        if (this.errorDisplay) {
          this.errorDisplay.textContent = String(this.errors);
        }

        if (this.settings.errorPenalty) {
          this.penaltyTime += 1000;
          if (this.timerDisplay) {
            this.timerDisplay.classList.add('hit-error');
            setTimeout(() => this.timerDisplay.classList.remove('hit-error'), 300);
          }
        }

        cell.classList.add('hit-error');
        setTimeout(() => cell.classList.remove('hit-error'), 350);
      }
    }

    shuffleUnclickedCells() {
      const allCells = Array.from(this.schulteGrid.querySelectorAll('.grid-cell:not(.selected)'));
      if (allCells.length < 2) return;

      const idxA = Math.floor(Math.random() * allCells.length);
      let idxB = Math.floor(Math.random() * allCells.length);
      while (idxB === idxA && allCells.length > 1) {
        idxB = Math.floor(Math.random() * allCells.length);
      }

      const cellA = allCells[idxA];
      const cellB = allCells[idxB];

      const tempVal = cellA.dataset.value;
      const tempText = cellA.textContent;
      const tempColor = cellA.dataset.origColor || '';

      cellA.dataset.value = cellB.dataset.value;
      cellA.textContent = cellB.textContent;
      cellA.dataset.origColor = cellB.dataset.origColor || '';
      if (this.mode === 'color') cellA.style.color = cellA.dataset.origColor;

      cellB.dataset.value = tempVal;
      cellB.textContent = tempText;
      cellB.dataset.origColor = tempColor;
      if (this.mode === 'color') cellB.style.color = cellB.dataset.origColor;
    }

    finishGame() {
      this.status = 'finished';
      if (this.timerId) {
        cancelAnimationFrame(this.timerId);
        this.timerId = null;
      }

      const finalMs = this.elapsedTime + this.penaltyTime;
      if (this.timerDisplay) {
        this.timerDisplay.textContent = this.formatTime(finalMs);
      }

      this.sound.playVictory();
      this.confetti.burst();

      // 评级计算
      const rank = this.calculateRank(this.size, finalMs / 1000);
      const rating = RATING_DESCRIPTIONS[rank] || RATING_DESCRIPTIONS.A;

      if (this.resultRankBadge) {
        this.resultRankBadge.textContent = rank;
        this.resultRankBadge.className = 'result-rank-badge rank-' + rank.toLowerCase();
      }
      if (this.resultTime) this.resultTime.textContent = this.formatTime(finalMs);
      if (this.resultAvgReaction) {
        const avg = (finalMs / this.totalSteps / 1000).toFixed(2);
        this.resultAvgReaction.textContent = `${avg} 秒/格`;
      }
      if (this.resultErrors) {
        this.resultErrors.textContent = this.errors === 0
          ? '0 次 (完美无失误)'
          : `${this.errors} 次 (+${this.errors}.00s 惩罚)`;
      }
      if (this.resultFastest) {
        const minPace = this.paceHistory.length > 0 ? (Math.min(...this.paceHistory) / 1000).toFixed(2) : '0.00';
        this.resultFastest.textContent = `${minPace}s`;
      }
      if (this.ratingTitle) this.ratingTitle.textContent = rating.title;
      if (this.ratingDesc) this.ratingDesc.textContent = rating.desc;

      this.renderPaceChart();
      this.saveRecord(finalMs, rank);
      this.updatePBDisplay();

      setTimeout(() => {
        this.openModal('resultModal');
      }, 350);
    }

    calculateRank(size, seconds) {
      const th = RATING_THRESHOLDS[size] || RATING_THRESHOLDS[5];
      if (seconds <= th.sss) return 'SSS';
      if (seconds <= th.ss) return 'SS';
      if (seconds <= th.s) return 'S';
      if (seconds <= th.a) return 'A';
      return 'B';
    }

    renderPaceChart() {
      if (!this.paceChartBars) return;
      this.paceChartBars.innerHTML = '';
      if (!this.paceHistory || this.paceHistory.length === 0) return;

      const maxPace = Math.max(...this.paceHistory, 200);

      this.paceHistory.forEach((pace, idx) => {
        const bar = document.createElement('div');
        bar.className = 'pace-bar';
        const heightPct = Math.max(12, Math.round((pace / maxPace) * 100));
        bar.style.height = heightPct + '%';
        bar.title = `#${idx + 1} 目标点击间隔: ${pace}ms`;
        this.paceChartBars.appendChild(bar);
      });
    }

    saveRecord(timeMs, rank) {
      try {
        const pbKey = `schulte_pb_${this.size}_${this.mode}`;
        const prevPb = localStorage.getItem(pbKey);
        if (!prevPb || timeMs < parseFloat(prevPb)) {
          localStorage.setItem(pbKey, String(timeMs));
        }

        // 战局明细历史
        const histKey = 'schulte_history_v2';
        const rawHist = localStorage.getItem(histKey);
        const historyList = rawHist ? JSON.parse(rawHist) : [];

        historyList.unshift({
          id: Date.now(),
          timeStr: new Date().toLocaleTimeString(),
          size: `${this.size}×${this.size}`,
          mode: this.getModeName(this.mode),
          timeMs: timeMs,
          formatted: this.formatTime(timeMs),
          errors: this.errors,
          rank: rank
        });

        if (historyList.length > 50) historyList.pop();
        localStorage.setItem(histKey, JSON.stringify(historyList));
      } catch (e) {}
    }

    updatePBDisplay() {
      if (!this.bestRecordDisplay) return;
      try {
        const pbKey = `schulte_pb_${this.size}_${this.mode}`;
        const pb = localStorage.getItem(pbKey);
        if (pb) {
          this.bestRecordDisplay.textContent = this.formatTime(parseFloat(pb));
        } else {
          this.bestRecordDisplay.textContent = '--:--.--';
        }
      } catch (e) {
        this.bestRecordDisplay.textContent = '--:--.--';
      }
    }

    renderStatsModal() {
      try {
        const histKey = 'schulte_history_v2';
        const rawHist = localStorage.getItem(histKey);
        const historyList = rawHist ? JSON.parse(rawHist) : [];

        if (this.totalGamesCount) {
          this.totalGamesCount.textContent = String(historyList.length);
        }

        // 5x5 数据统计
        const pb5x5Key = 'schulte_pb_5_classic';
        const pb5x5 = localStorage.getItem(pb5x5Key);
        if (this.standardBestTime) {
          this.standardBestTime.textContent = pb5x5 ? this.formatTime(parseFloat(pb5x5)) : '--';
        }

        const standardGames = historyList.filter(g => g.size === '5×5' && g.mode.includes('正序'));
        if (this.averageTimeOverall) {
          if (standardGames.length > 0) {
            const sum = standardGames.reduce((acc, cur) => acc + cur.timeMs, 0);
            const avg = sum / standardGames.length;
            this.averageTimeOverall.textContent = this.formatTime(avg);
          } else {
            this.averageTimeOverall.textContent = '--';
          }
        }

        // PB 格子
        if (this.pbGrid) {
          this.pbGrid.innerHTML = '';
          const sizes = [3, 4, 5, 6, 7];
          sizes.forEach(s => {
            const pbVal = localStorage.getItem(`schulte_pb_${s}_classic`);
            const item = document.createElement('div');
            item.className = 'pb-item';
            item.innerHTML = `
              <div class="pb-size">${s}×${s}</div>
              <div class="pb-val">${pbVal ? this.formatTime(parseFloat(pbVal)) : '--'}</div>
            `;
            this.pbGrid.appendChild(item);
          });
        }

        // 最近 15 局表格
        if (this.historyTableBody) {
          this.historyTableBody.innerHTML = '';
          const recent = historyList.slice(0, 15);
          if (recent.length === 0) {
            this.historyTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem;">暂无训练记录，快去挑战一局吧！</td></tr>';
          } else {
            recent.forEach(r => {
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td>${r.timeStr}</td>
                <td>${r.size}</td>
                <td>${r.mode}</td>
                <td style="font-family:var(--font-mono);font-weight:600;">${r.formatted}</td>
                <td>${r.errors}</td>
                <td><span class="badge-${r.rank.toLowerCase()}" style="font-weight:bold;">${r.rank}</span></td>
              `;
              this.historyTableBody.appendChild(tr);
            });
          }
        }
      } catch (e) {}
    }

    clearAllData() {
      const ok = confirm('确定要清空所有训练战绩与个人最佳记录吗？该操作不可恢复！');
      if (!ok) return;

      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('schulte_pb_') || key.startsWith('schulte_history'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        this.renderStatsModal();
        this.updatePBDisplay();
        alert('已清空所有历史数据');
      } catch (e) {}
    }

    copyShareReport() {
      const finalMs = this.elapsedTime + this.penaltyTime;
      const rank = this.calculateRank(this.size, finalMs / 1000);
      const avg = (finalMs / this.totalSteps / 1000).toFixed(2);
      const text = `【舒尔特方格专注力挑战战报】
规格：${this.size}×${this.size} (${this.totalSteps}格)
模式：${this.getModeName(this.mode)}
耗时：${this.formatTime(finalMs)}
失误：${this.errors}次
平均反应：${avg} 秒/格
评级：${rank}
快来挑战你的周边视野极限吧！`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          alert('成绩战报已成功复制到剪贴板！');
        }).catch(() => {
          prompt('请复制以下战报文本：', text);
        });
      } else {
        prompt('请复制以下战报文本：', text);
      }
    }

    resetGame() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      if (this.timerId) {
        cancelAnimationFrame(this.timerId);
        this.timerId = null;
      }
      this.status = 'idle';
      this.elapsedTime = 0;
      this.penaltyTime = 0;
      this.errors = 0;
      this.lastSelectedCell = null;

      if (this.timerDisplay) this.timerDisplay.textContent = '00:00.00';
      if (this.errorDisplay) this.errorDisplay.textContent = '0';
      if (this.progressBar) this.progressBar.style.width = '0%';

      this.renderBoard();
    }
  }

  // =========================================================================
  // 5. 初始化启动
  // =========================================================================

  window.addEventListener('DOMContentLoaded', () => {
    window.schulteGame = new SchulteGame();
  });

})();
