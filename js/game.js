import { BOSSES, ROUND_TIME } from "./config.js";
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
  INTRO: "intro",
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
          this.startBoss(0);
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
        if (this.input.wasPressed("start")) {
          this.state = GAME_STATES.TITLE;
          this.bossIndex = 0;
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
  }

  renderTitle(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#0a0a1a");
    grad.addColorStop(1, "#1a1040");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawCryptoFighter(ctx, CANVAS_W / 2, 260, 1, "idle", this.frame, 0);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd700";
    ctx.font = "20px 'Press Start 2P', monospace";
    ctx.strokeStyle = "#6b21a8";
    ctx.lineWidth = 4;
    ctx.strokeText("SAD CRYPTO", CANVAS_W / 2, 80);
    ctx.fillText("SAD CRYPTO", CANVAS_W / 2, 80);
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = "#a78bfa";
    ctx.fillText("FIGHTER EDITION", CANVAS_W / 2, 110);
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.fillStyle = "#9ca3af";
    const lines = [
      "Crypto vs 4 AI CEOs — beat each once",
      "Z punch  X kick  C bitcoin special",
      "Double-tap to dash · hold back to block",
      "",
      "Press ENTER to fight",
    ];
    let y = 150;
    for (const l of lines) {
      if (l.startsWith("Press") && Math.floor(Date.now() / 500) % 2) { y += 16; continue; }
      ctx.fillText(l, CANVAS_W / 2, y);
      y += 16;
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
      ctx.fillText(`Best combo: ${this.maxCombo} hits`, CANVAS_W / 2, by + boxH + 60);
    }

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
    drawArena(ctx, this.endingFrame, { themeKey: "anthropic", company: "CRYPTO", arena: "CRYPTO WORLD TOUR", staff: ["Fans", "Press", "Critics", "Legends", "The World"] });
    drawCryptoFighter(ctx, CANVAS_W / 2, 260, 1, "idle", this.endingFrame, 0);

    // Confetti
    for (let i = 0; i < 50; i++) {
      const cx = (i * 37 + this.endingFrame * 3) % CANVAS_W;
      const cy = (i * 23 + this.endingFrame * 2) % 200;
      ctx.fillStyle = ["#ffd700", "#ef4444", "#22d3ee", "#a855f7"][i % 4];
      ctx.fillRect(cx, cy, 5, 5);
    }

    drawAnnouncerText(ctx, "CRYPTO WINS!", "The world celebrates! Crypto is famous again!");
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "center";
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText("Press ENTER to play again", CANVAS_W / 2, CANVAS_H - 30);
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
