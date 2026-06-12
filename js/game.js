import { BOSSES, ROUND_TIME, GROUND_Y } from "./config.js";
import { Input } from "./input.js";
import { AudioEngine } from "./audio.js";
import { drawArena } from "./background.js";
import {
  drawCryptoFighter,
  drawBossFighter,
  drawBitcoinStar,
  drawBossOrb,
  drawFightHUD,
  drawAnnouncerText,
  CANVAS_W,
  CANVAS_H,
} from "./sprites.js";
import { Fighter, BossAI, BitcoinStar, Projectile, boxesOverlap, STATES } from "./fighter.js";
import { faces } from "./assets.js";

const GAME_STATES = {
  TITLE: "title",
  STORY: "story",
  ANNOUNCE: "announce",
  FIGHT: "fight",
  KO: "ko",
  VICTORY: "victory",
  ENDING: "ending",
};

export class Game {
  constructor(canvas, input, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = input;
    this.audio = audio;
    this.state = GAME_STATES.TITLE;
    this.bossIndex = 0;
    this.bossDefeated = false;
    this.timer = ROUND_TIME;
    this.announceTimer = 0;
    this.announcePhase = 0;
    this.koTimer = 0;
    this.victoryTimer = 0;
    this.frame = 0;
    this.projectiles = [];
    this.sparks = [];
    this.hitStop = 0;
    this.shake = 0;
    this.flash = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.dashTap = { dir: 0, t: -1 };
    this.dashT = 0;
    this.crowdTimer = 0;
    this.lastTime = 0;
    this.player = null;
    this.boss = null;
    this.bossAI = null;
    this.endingFrame = 0;
    this.storyPanel = 0;
    this.rageBanner = 0;
    this.fireworks = [];
    this.fwTimer = 0;

    // CRT scanline pattern (pre-rendered for perf)
    const sl = document.createElement("canvas");
    sl.width = 4;
    sl.height = 4;
    const sctx = sl.getContext("2d");
    sctx.fillStyle = "rgba(0,0,0,0.16)";
    sctx.fillRect(0, 0, 4, 1);
    this.scanPattern = this.ctx.createPattern(sl, "repeat");

    // Vignette overlay (pre-rendered)
    const vg = document.createElement("canvas");
    vg.width = CANVAS_W;
    vg.height = CANVAS_H;
    const vctx = vg.getContext("2d");
    const vgrad = vctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.45,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.9
    );
    vgrad.addColorStop(0, "rgba(0,0,0,0)");
    vgrad.addColorStop(1, "rgba(0,0,0,0.5)");
    vctx.fillStyle = vgrad;
    vctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.vignette = vg;
  }

  get bossData() {
    return BOSSES[this.bossIndex];
  }

  initFight() {
    const bd = this.bossData;
    this.player = new Fighter({
      x: 160,
      facing: 1,
      isPlayer: true,
      hp: 100,
      maxHp: 100,
    });
    this.boss = new Fighter({
      x: CANVAS_W - 160,
      facing: -1,
      hp: bd.hp,
      maxHp: bd.hp,
      speed: bd.ai.speed,
      ...bd,
    });
    this.bossAI = new BossAI(this.boss, this.player, bd);
    this.projectiles = [];
    this.sparks = [];
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.flash = 0;
    this.timer = ROUND_TIME;
  }

  startBoss(index) {
    this.bossIndex = index;
    this.bossDefeated = false;
    this.initFight();
    this.state = GAME_STATES.ANNOUNCE;
    this.announceTimer = 2.5;
    this.announcePhase = 0;
    this.audio.stopMusic();
    this.audio.play("round");
  }

  update(dt) {
    this.frame += dt * 60;
    this.crowdTimer += dt;
    if (this.flash > 0) this.flash -= dt;

    switch (this.state) {
      case GAME_STATES.TITLE:
        if (this.input.wasPressed("start")) {
          this.audio.init();
          this.audio.resume();
          this.audio.play("select");
          this.storyPanel = 0;
          this.state = GAME_STATES.STORY;
        }
        break;

      case GAME_STATES.STORY:
        if (this.input.wasPressed("start")) {
          this.audio.play("select");
          this.storyPanel++;
          if (this.storyPanel >= 3) this.startBoss(0);
        }
        break;

      case GAME_STATES.ANNOUNCE:
        this.announceTimer -= dt;
        if (this.announcePhase === 0 && this.announceTimer < 1.5) {
          this.announcePhase = 1;
          this.audio.play("fight");
        }
        if (this.announceTimer <= 0) {
          this.state = GAME_STATES.FIGHT;
          this.audio.startMusic(this.bossIndex >= 2 ? "boss" : "fight");
        }
        break;

      case GAME_STATES.FIGHT:
        this.updateFight(dt);
        break;

      case GAME_STATES.KO:
        this.koTimer -= dt;
        // keep particles/feedback alive during the KO pause
        this.updateSparks(dt);
        if (this.shake > 0) this.shake -= dt;
        if (this.koTimer <= 0) {
          if (this.bossDefeated) {
            this.state = GAME_STATES.VICTORY;
            this.victoryTimer = 0;
            this.audio.play("cheer");
          } else {
            // Crypto fell — quick retry of the same CEO
            this.startBoss(this.bossIndex);
          }
        }
        break;

      case GAME_STATES.VICTORY:
        this.victoryTimer += dt;
        if (this.frame % 50 < 1) this.audio.play("cheer");
        if (this.input.wasPressed("start") && this.victoryTimer > 0.6) {
          if (this.bossIndex < BOSSES.length - 1) {
            this.startBoss(this.bossIndex + 1);
          } else {
            this.state = GAME_STATES.ENDING;
            this.endingFrame = 0;
            this.audio.stopMusic();
            this.audio.startMusic("victory");
          }
        }
        break;

      case GAME_STATES.ENDING:
        this.endingFrame += dt * 60;
        if (this.frame % 60 < 1) this.audio.play("cheer");
        // fireworks barrage
        this.fwTimer -= dt;
        if (this.fwTimer <= 0) {
          this.spawnFirework();
          this.fwTimer = 0.3 + Math.random() * 0.45;
        }
        this.updateFireworks(dt);
        if (this.input.wasPressed("start") && this.endingFrame > 180) {
          this.state = GAME_STATES.TITLE;
          this.bossIndex = 0;
          this.fireworks = [];
          this.audio.stopMusic();
        }
        break;
    }

    this.input.endFrame();
  }

  updateFight(dt) {
    // Hit-stop: brief freeze on impact for weight (Street Fighter feel)
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.updateSparks(dt);
      if (this.shake > 0) this.shake -= dt;
      return;
    }

    this.timer -= dt;
    const p = this.player;
    const b = this.boss;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Dash: double-tap a direction for a quick burst
    for (const dir of [-1, 1]) {
      const action = dir < 0 ? "left" : "right";
      if (this.input.wasPressed(action)) {
        if (this.dashTap.dir === dir && this.frame - this.dashTap.t < 14 && p.onGround && p.canAct()) {
          p.vx = dir * 9.5;
          p.facing = dir;
          this.dashT = 0.16;
          this.audio.play("jump");
        }
        this.dashTap = { dir, t: this.frame };
      }
    }
    if (this.dashT > 0) this.dashT -= dt;

    // Player input
    if (p.canAct()) {
      if (this.dashT > 0) {
        // gliding from a dash — keep momentum, allow attacks to cancel
      } else if (this.input.isDown("left")) p.move(-1);
      else if (this.input.isDown("right")) p.move(1);
      else if (p.state === STATES.WALK) p.state = STATES.IDLE;

      if (this.input.wasPressed("up") && p.jump()) this.audio.play("jump");
      if (this.input.wasPressed("punch") && p.punch()) this.audio.play("punch");
      if (this.input.wasPressed("kick") && p.kick()) this.audio.play("kick");
      if (this.input.wasPressed("special") && p.startSpecial()) {
        this.audio.play("special");
        this.spawnBitcoinStars(p);
        this.shake = Math.max(this.shake, 0.3);
        this.flash = Math.max(this.flash, 0.3);
      }
    }

    // Player blocks by holding away from the boss while grounded
    const awayAction = b.x > p.x ? "left" : "right";
    p.guarding = p.onGround && this.dashT <= 0 && this.input.isDown(awayAction) &&
      (p.state === STATES.WALK || p.state === STATES.IDLE || p.state === STATES.BLOCK);

    // Face each other when idle
    if (p.state === STATES.IDLE && p.canAct() && this.dashT <= 0) p.facing = p.x < b.x ? 1 : -1;

    p.updatePhysics(dt);
    b.updatePhysics(dt);

    this.bossAI.update(
      dt,
      (type) => this.audio.play(type),
      () => this.fireBossSpecial()
    );

    // Rage mode: boss powers up below 35% HP
    if (!b.enraged && b.hp <= b.maxHp * 0.35) {
      b.enraged = true;
      b.speed *= 1.3;
      this.bossAI.ai = {
        ...this.bossAI.ai,
        aggression: Math.min(0.95, this.bossAI.ai.aggression + 0.18),
      };
      if (this.bossAI.special) {
        this.bossAI.special = { ...this.bossAI.special, cooldown: this.bossAI.special.cooldown * 0.6 };
      }
      this.rageBanner = 1.8;
      this.flash = Math.max(this.flash, 0.25);
      this.shake = Math.max(this.shake, 0.35);
      this.audio.play("rage");
    }
    if (this.rageBanner > 0) this.rageBanner -= dt;

    this.resolveAttacks(p, b);
    this.resolveAttacks(b, p);

    // Projectiles
    this.projectiles = this.projectiles.filter((proj) => {
      const alive = proj.update(dt);
      if (!alive) return false;
      const target = proj.owner === p ? b : p;
      if (!proj.hit.has(target) && boxesOverlap(proj.hitbox, target.hitbox)) {
        proj.hit.add(target);
        const res = target.takeHit(proj.damage, proj.x, 5);
        if (res.hit) {
          this.onImpact(target, res.blocked, proj.owner === p, "#f7931a");
        }
        return false;
      }
      return alive;
    });

    this.updateSparks(dt);
    if (this.shake > 0) this.shake -= dt;

    // Crowd cheer occasionally
    if (Math.random() < 0.004) this.audio.play("cheer");

    // Timer-out: lower HP loses the round (keeps remaining health, SF-style)
    if (this.timer <= 0) {
      if (p.hp <= b.hp) p.state = STATES.KO;
      else b.state = STATES.KO;
    }

    if (p.state === STATES.KO || b.state === STATES.KO) {
      this.handleKO(b.state === STATES.KO);
    }
  }

  handleKO(playerWon) {
    this.bossDefeated = playerWon;
    this.state = GAME_STATES.KO;
    this.koTimer = 2.4;
    this.shake = 0.6;
    this.flash = 0.4;
    this.projectiles = [];
    this.audio.play("ko");
    this.audio.stopMusic();
  }

  fireBossSpecial() {
    const b = this.boss;
    const sp = this.bossData.special;
    if (!sp) return;
    const y = sp.gap === "low" ? b.y - 30 : b.y - 56;
    this.projectiles.push(new Projectile(b.x + b.facing * 30, y, b.facing, b, sp));
    this.audio.play("special");
    this.flash = Math.max(this.flash, 0.18);
    this.shake = Math.max(this.shake, 0.18);
  }

  // Shared impact feedback: sparks, hit-stop, shake, sound, combo, meter
  onImpact(target, blocked, byPlayer, color) {
    const sx = target.x;
    const sy = target.y - 44;
    this.spawnSparks(sx, sy, blocked ? "#9ca3af" : color, blocked ? 5 : 12);
    this.audio.play(blocked ? "block" : "hit");
    this.hitStop = blocked ? 0.04 : 0.08;
    this.shake = Math.max(this.shake, blocked ? 0.12 : 0.28);

    if (byPlayer) {
      this.player.addSpecial(blocked ? 8 : 22);
      if (!blocked) {
        this.combo++;
        this.comboTimer = 1.4;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
      }
    } else {
      // taking a hit still builds a little meter
      if (!blocked) this.player.addSpecial(8);
    }
  }

  spawnSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      this.sparks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1,
        life: 0.3 + Math.random() * 0.2,
        max: 0.5,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  updateSparks(dt) {
    this.sparks = this.sparks.filter((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.3;
      s.life -= dt;
      return s.life > 0;
    });
  }

  spawnFirework() {
    const colors = ["#ffd700", "#ff5e5e", "#5ec8ff", "#b15eff", "#7cfc00", "#ff9d2e"];
    const x = 60 + Math.random() * (CANVAS_W - 120);
    const y = 40 + Math.random() * 110;
    const color = colors[(Math.random() * colors.length) | 0];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const sp = 1.4 + Math.random() * 1.8;
      this.fireworks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.7 + Math.random() * 0.4,
        max: 1.1,
        color,
        size: 2 + Math.random() * 2,
      });
    }
    this.audio.play("firework");
  }

  updateFireworks(dt) {
    this.fireworks = this.fireworks.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.life -= dt;
      return p.life > 0;
    });
  }

  spawnBitcoinStars(fighter) {
    for (let i = -1; i <= 1; i++) {
      this.projectiles.push(
        new BitcoinStar(fighter.x + fighter.facing * 30, fighter.y - 50 + i * 18, fighter.facing, fighter)
      );
    }
  }

  resolveAttacks(attacker, defender) {
    const atk = attacker.attackBox;
    if (!atk || attacker.attackLanded) return;
    if (boxesOverlap(atk, defender.hitbox) && defender.invincible <= 0 && defender.state !== STATES.KO) {
      attacker.attackLanded = true;
      const kb = atk.type === "kick" ? 5 : 3;
      // Combo damage scaling rewards chains
      const bonus = attacker.isPlayer ? Math.min(this.combo, 6) * 1.2 : 0;
      const res = defender.takeHit(atk.damage + bonus, attacker.x, kb);
      if (res.hit) this.onImpact(defender, res.blocked, attacker.isPlayer, "#fde047");
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    switch (this.state) {
      case GAME_STATES.TITLE:
        this.renderTitle(ctx);
        break;
      case GAME_STATES.STORY:
        this.renderStory(ctx);
        break;
      case GAME_STATES.ANNOUNCE:
      case GAME_STATES.FIGHT:
      case GAME_STATES.KO:
        this.renderFight(ctx);
        break;
      case GAME_STATES.VICTORY:
        this.renderFight(ctx);
        this.renderVictory(ctx);
        break;
      case GAME_STATES.ENDING:
        this.renderEnding(ctx);
        break;
    }

    // Global flash overlay (special / KO pops)
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, this.flash)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Retro post-processing: CRT scanlines + vignette
    ctx.fillStyle = this.scanPattern;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(this.vignette, 0, 0);
  }

  renderTitle(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#05050c");
    grad.addColorStop(0.5, "#150a30");
    grad.addColorStop(1, "#2a1050");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Sweeping spotlights converge on Crypto
    for (let s = 0; s < 2; s++) {
      const sweep = Math.sin(this.frame * 0.015 + s * Math.PI) * 150;
      const lg = ctx.createLinearGradient(CANVAS_W / 2 + sweep, 0, CANVAS_W / 2, 160);
      lg.addColorStop(0, "rgba(255,215,0,0.18)");
      lg.addColorStop(1, "transparent");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2 + sweep - 30, 0);
      ctx.lineTo(CANVAS_W / 2 + sweep + 30, 0);
      ctx.lineTo(CANVAS_W / 2 + 60, 170);
      ctx.lineTo(CANVAS_W / 2 - 60, 170);
      ctx.closePath();
      ctx.fill();
    }

    // Hero portrait
    const face = faces.crypto;
    if (face) {
      const w = 96;
      const h = w * (face.height / face.width);
      ctx.save();
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 24 + Math.sin(this.frame * 0.08) * 8;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(face, CANVAS_W / 2 - w / 2, 14, w, h);
      ctx.restore();
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd700";
    ctx.font = "22px 'Press Start 2P', monospace";
    ctx.strokeStyle = "#6b21a8";
    ctx.lineWidth = 5;
    ctx.strokeText("SAD CRYPTO", CANVAS_W / 2, 196);
    ctx.fillText("SAD CRYPTO", CANVAS_W / 2, 196);
    ctx.font = "9px 'Press Start 2P', monospace";
    ctx.fillStyle = "#a78bfa";
    ctx.fillText("RISE TO FAME", CANVAS_W / 2, 218);

    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.fillStyle = "#9ca3af";
    const lines = [
      "Forgotten by the world, Crypto fights",
      "3 AI CEOs to win back the spotlight.",
      "",
      "Z punch · X kick · C bitcoin special",
      "Double-tap to dash · hold back to block",
    ];
    let y = 244;
    for (const l of lines) {
      ctx.fillText(l, CANVAS_W / 2, y);
      y += 15;
    }

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = "#ffd700";
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText("PRESS ENTER", CANVAS_W / 2, CANVAS_H - 18);
    }
  }

  renderStory(ctx) {
    const panels = [
      {
        title: "THE GLORY DAYS",
        tint: "#1a1040",
        lines: [
          "Once, CRYPTO was the most talked-",
          "about thing on Earth. Headlines.",
          "Charts. Fans chanting his name.",
        ],
      },
      {
        title: "FORGOTTEN",
        tint: "#0a0a12",
        lines: [
          "Then AI stole the spotlight.",
          "No mentions. No headlines.",
          "Nobody talks about Crypto anymore.",
        ],
      },
      {
        title: "THE COMEBACK",
        tint: "#2e0d05",
        lines: [
          "To rise back to popularity, he must",
          "defeat the AI CEOs one by one.",
          "Fame is earned with fists.",
        ],
      },
    ];
    const p = panels[Math.min(this.storyPanel, 2)];

    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#05050c");
    grad.addColorStop(1, p.tint);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Portrait — dim and sad for panels 1-2, lit for the comeback
    const face = faces.crypto;
    if (face) {
      const w = 110;
      const h = w * (face.height / face.width);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (this.storyPanel < 2) {
        ctx.globalAlpha = 0.55;
        ctx.filter = "grayscale(0.8)";
      } else {
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 26;
      }
      ctx.drawImage(face, CANVAS_W / 2 - w / 2, 26, w, h);
      ctx.restore();
    }

    ctx.textAlign = "center";
    ctx.fillStyle = this.storyPanel === 2 ? "#ffd700" : "#e5e7eb";
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.strokeText(p.title, CANVAS_W / 2, 220);
    ctx.fillText(p.title, CANVAS_W / 2, 220);

    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.fillStyle = "#cbd5e1";
    let y = 248;
    for (const l of p.lines) {
      ctx.fillText(l, CANVAS_W / 2, y);
      y += 16;
    }

    ctx.fillStyle = "#6b7280";
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.fillText(`${this.storyPanel + 1} / 3`, CANVAS_W / 2, CANVAS_H - 36);
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = "#ffd700";
      ctx.fillText("ENTER to continue", CANVAS_W / 2, CANVAS_H - 18);
    }
  }

  renderFight(ctx) {
    const bd = this.bossData;

    // World layer (shakes on impact)
    ctx.save();
    if (this.shake > 0) {
      const m = this.shake * 14;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    drawArena(ctx, this.frame, bd);

    // Soft drop shadows under the fighters
    const drawShadow = (f, w) => {
      if (!f) return;
      const s = Math.max(0.35, 1 - (GROUND_Y - f.y) / 160);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(f.x, GROUND_Y + 33, w * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawShadow(this.player, 24);
    drawShadow(this.boss, 30);

    // Rage aura behind an enraged boss
    if (this.boss?.enraged && this.boss.state !== STATES.KO) {
      const pr = 60 + Math.sin(this.frame * 0.3) * 9;
      const ag = ctx.createRadialGradient(this.boss.x, this.boss.y - 45, 8, this.boss.x, this.boss.y - 45, pr);
      ag.addColorStop(0, "rgba(255,60,30,0.4)");
      ag.addColorStop(1, "rgba(255,60,30,0)");
      ctx.fillStyle = ag;
      ctx.fillRect(this.boss.x - pr, this.boss.y - 45 - pr, pr * 2, pr * 2);
    }

    if (this.player) drawCryptoFighter(ctx, this.player.x, this.player.y, this.player.facing, this.player.state, this.player.animFrame, this.player.hitFlash);
    if (this.boss) drawBossFighter(ctx, this.boss.x, this.boss.y, this.boss.facing, this.boss.state, this.boss.animFrame, bd, this.boss.hitFlash);

    for (const proj of this.projectiles) {
      if (proj.kind === "bitcoin") drawBitcoinStar(ctx, proj.x, proj.y, proj.frame, proj.facing);
      else drawBossOrb(ctx, proj);
    }

    this.renderSparks(ctx);
    ctx.restore();

    // HUD layer (no shake)
    if (this.player && this.boss) {
      drawFightHUD(ctx, this.player, this.boss, Math.max(0, this.timer), this.bossIndex + 1, bd.name, bd.faceKey);
    }

    // Combo counter
    if (this.combo >= 2) {
      ctx.save();
      ctx.textAlign = "left";
      const pop = 1 + Math.max(0, this.comboTimer - 1.1) * 4;
      ctx.font = `${Math.round(14 * pop)}px 'Press Start 2P', monospace`;
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 3;
      ctx.strokeText(`${this.combo} HITS`, 30, 110);
      ctx.fillText(`${this.combo} HITS`, 30, 110);
      ctx.restore();
    }

    // Rage announcement
    if (this.rageBanner > 0 && this.state === GAME_STATES.FIGHT) {
      ctx.save();
      ctx.textAlign = "center";
      const rp = 1 + Math.sin(this.frame * 0.5) * 0.08;
      ctx.font = `${Math.round(13 * rp)}px 'Press Start 2P', monospace`;
      ctx.fillStyle = "#ff3b30";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.strokeText(`${bd.shortName} IS ENRAGED!`, CANVAS_W / 2, 78);
      ctx.fillText(`${bd.shortName} IS ENRAGED!`, CANVAS_W / 2, 78);
      ctx.restore();
    }

    if (this.state === GAME_STATES.ANNOUNCE) {
      if (this.announcePhase === 0) drawAnnouncerText(ctx, `STAGE ${this.bossIndex + 1}/${BOSSES.length}`, `${bd.arena} — ${bd.name}`);
      else drawAnnouncerText(ctx, "FIGHT!", bd.name);
    }

    if (this.state === GAME_STATES.KO) {
      const playerLost = this.player?.state === STATES.KO;
      const sub = playerLost ? "CRYPTO DOWN — RETRYING..." : `${bd.name} DEFEATED!`;
      drawAnnouncerText(ctx, "K.O.!", sub);
    }
  }

  renderVictory(ctx) {
    const bd = this.bossData;
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Boss portrait in a framed box
    const boxW = 120, boxH = 120;
    const bx = CANVAS_W / 2 - boxW / 2;
    const by = 70;
    ctx.fillStyle = "#05050c";
    ctx.fillRect(bx - 4, by - 4, boxW + 8, boxH + 8);
    ctx.strokeStyle = bd.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(bx - 4, by - 4, boxW + 8, boxH + 8);
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, boxW, boxH);
    ctx.clip();
    const face = faces[bd.faceKey];
    if (face) {
      const aspect = face.height / face.width;
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(face, bx, by - 8, boxW, boxW * aspect);
    }
    // "defeated" red wash
    ctx.fillStyle = "rgba(120,0,0,0.35)";
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ef4444";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText("DEFEATED", CANVAS_W / 2, by + boxH + 22);

    ctx.fillStyle = "#ffd700";
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillText("CRYPTO WINS", CANVAS_W / 2, 50);

    // Crypto's quip
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.fillText(`"${bd.quote}"`, CANVAS_W / 2, by + boxH + 44);

    if (this.maxCombo >= 3) {
      ctx.fillStyle = "#a78bfa";
      ctx.font = "6px 'Press Start 2P', monospace";
      ctx.fillText(`Best combo: ${this.maxCombo} hits`, CANVAS_W / 2, by + boxH + 58);
    }

    // Popularity rising — the comeback meter
    const pct = Math.round(((this.bossIndex + 1) / BOSSES.length) * 100);
    const animPct = Math.min(pct, Math.round(this.victoryTimer * 60));
    const mw = 240;
    const mx = CANVAS_W / 2 - mw / 2;
    const my = by + boxH + 70;
    ctx.fillStyle = "#9ca3af";
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.fillText("WORLD POPULARITY", CANVAS_W / 2, my - 4);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(mx, my, mw, 12);
    const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    mg.addColorStop(0, "#fde047");
    mg.addColorStop(1, "#f59e0b");
    ctx.fillStyle = mg;
    ctx.fillRect(mx + 2, my + 2, (mw - 4) * (animPct / 100), 8);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx, my, mw, 12);
    ctx.fillStyle = "#ffd700";
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.fillText(`${animPct}%`, CANVAS_W / 2, my + 24);

    if (this.victoryTimer > 0.6 && Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "7px 'Press Start 2P', monospace";
      const next = this.bossIndex < BOSSES.length - 1 ? "ENTER — Next CEO" : "ENTER — Finale";
      ctx.fillText(next, CANVAS_W / 2, CANVAS_H - 18);
    }
  }

  renderSparks(ctx) {
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  renderEnding(ctx) {
    const t = this.endingFrame / 60;
    drawArena(ctx, this.endingFrame, {
      themeKey: "openai",
      company: "CRYPTO",
      arena: "WORLD COMEBACK TOUR",
      staff: ["Super Fans", "Paparazzi", "The Press", "Old Friends", "New Fans"],
    });

    // Paparazzi camera flashes in the crowd
    for (let i = 0; i < 3; i++) {
      if (Math.random() < 0.28) {
        const fx = 20 + Math.random() * (CANVAS_W - 40);
        const fy = 158 + Math.random() * 46;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(fx, fy, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Fireworks
    for (const p of this.fireworks) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Crypto moonwalks across the stage (faces opposite to his motion)
    const cx = CANVAS_W / 2 + Math.sin(t * 1.1) * 130;
    const facing = Math.cos(t * 1.1) > 0 ? -1 : 1;
    // spotlight follows him
    const sg = ctx.createRadialGradient(cx, GROUND_Y - 40, 10, cx, GROUND_Y - 40, 90);
    sg.addColorStop(0, "rgba(255,215,0,0.25)");
    sg.addColorStop(1, "transparent");
    ctx.fillStyle = sg;
    ctx.fillRect(cx - 90, GROUND_Y - 130, 180, 180);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, GROUND_Y + 33, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    drawCryptoFighter(ctx, cx, GROUND_Y, facing, "walk", this.endingFrame, 0);

    // Confetti rain
    for (let i = 0; i < 60; i++) {
      const cfx = (i * 37 + this.endingFrame * 2.5) % CANVAS_W;
      const cfy = (i * 23 + this.endingFrame * (1.5 + (i % 3))) % CANVAS_H;
      ctx.fillStyle = ["#ffd700", "#ef4444", "#22d3ee", "#a855f7", "#7cfc00"][i % 5];
      ctx.fillRect(cfx, cfy, 4, 4);
    }

    // Breaking-news ticker
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, CANVAS_W, 16);
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd700";
    const msg = "* CRYPTO #1 TRENDING WORLDWIDE * AI CEOS SPEECHLESS * EVERYONE IS TALKING ABOUT CRYPTO AGAIN * FAME METER BROKEN ";
    const tw = ctx.measureText(msg).width;
    const off = (this.endingFrame * 1.4) % tw;
    ctx.fillText(msg, -off, 11);
    ctx.fillText(msg, -off + tw, 11);

    // Big pulsing headline
    ctx.textAlign = "center";
    const pulse = 1 + Math.sin(t * 4) * 0.06;
    ctx.font = `${Math.round(14 * pulse)}px 'Press Start 2P', monospace`;
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffd700";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.strokeText("CRYPTO IS FAMOUS AGAIN!", CANVAS_W / 2, 44);
    ctx.fillText("CRYPTO IS FAMOUS AGAIN!", CANVAS_W / 2, 44);
    ctx.shadowBlur = 0;

    // Popularity meter charging to MAX
    const fill = Math.min(1, t / 4);
    const mw = 320;
    const mx = CANVAS_W / 2 - mw / 2;
    const my = CANVAS_H - 26;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(mx - 4, my - 14, mw + 8, 34);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.fillText("WORLD POPULARITY", CANVAS_W / 2, my - 4);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(mx, my, mw, 12);
    const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    mg.addColorStop(0, "#fde047");
    mg.addColorStop(1, "#f59e0b");
    ctx.fillStyle = mg;
    ctx.fillRect(mx + 2, my + 2, (mw - 4) * fill, 8);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx, my, mw, 12);
    if (fill >= 1 && Math.floor(Date.now() / 300) % 2 === 0) {
      ctx.fillStyle = "#ffd700";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillText("MAX FAME!", CANVAS_W / 2, my + 11);
    }

    // Restart prompt after the celebration has had a moment
    if (t > 3 && Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.fillText("Press ENTER to play again", CANVAS_W / 2, 62);
    }
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    if (dt > 0) {
      this.update(dt);
      this.render();
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  run() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }
}
