import { CANVAS_W, GROUND_Y, GRAVITY } from "./config.js";

export const STATES = {
  IDLE: "idle",
  WALK: "walk",
  JUMP: "jump",
  CROUCH: "crouch",
  PUNCH: "punch",
  KICK: "kick",
  HIT: "hit",
  BLOCK: "block",
  SPECIAL: "special",
  KO: "ko",
};

export class Fighter {
  constructor(opts) {
    Object.assign(this, {
      x: 200,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      facing: 1,
      hp: 100,
      maxHp: 100,
      special: 0,
      specialMax: 100,
      state: STATES.IDLE,
      stateTimer: 0,
      animFrame: 0,
      hitFlash: 0,
      invincible: 0,
      onGround: true,
      isPlayer: false,
      attackLanded: false,
      guarding: false,
      width: 40,
      height: 80,
      speed: 3.8,
      jumpForce: -10,
      ...opts,
    });
  }

  reset(x, facing) {
    this.x = x;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.special = 0;
    this.state = STATES.IDLE;
    this.stateTimer = 0;
    this.hitFlash = 0;
    this.invincible = 0;
    this.onGround = true;
  }

  get hitbox() {
    return {
      x: this.x,
      y: this.y - this.height / 2,
      w: this.width,
      h: this.height,
    };
  }

  get attackBox() {
    const air = !this.onGround;
    if (this.state === STATES.PUNCH && this.stateTimer > 0.04 && this.stateTimer < 0.2) {
      return air
        ? { x: this.x + this.facing * 30, y: this.y - 56, w: 34, h: 30, damage: 10, type: "punch" }
        : { x: this.x + this.facing * 35, y: this.y - 45, w: 32, h: 26, damage: 8, type: "punch" };
    }
    if (this.state === STATES.KICK && this.stateTimer > 0.06 && this.stateTimer < 0.28) {
      return air
        ? { x: this.x + this.facing * 36, y: this.y - 48, w: 40, h: 28, damage: 14, type: "kick" }
        : { x: this.x + this.facing * 42, y: this.y - 30, w: 38, h: 22, damage: 13, type: "kick" };
    }
    return null;
  }

  canAct() {
    return ![STATES.HIT, STATES.KO, STATES.PUNCH, STATES.KICK, STATES.SPECIAL].includes(this.state);
  }

  updatePhysics(dt) {
    if (this.state === STATES.KO) return;

    if (!this.onGround && this.state !== STATES.HIT) {
      this.vy += GRAVITY;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
      if (this.state === STATES.JUMP) this.state = STATES.IDLE;
    } else {
      this.onGround = false;
    }

    this.x = Math.max(60, Math.min(CANVAS_W - 60, this.x));
    this.vx *= 0.75;

    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.invincible > 0) this.invincible -= dt;
    this.animFrame += dt * 60;

    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.state === STATES.HIT || this.state === STATES.BLOCK) this.state = STATES.IDLE;
        if (this.state === STATES.PUNCH || this.state === STATES.KICK || this.state === STATES.SPECIAL) {
          this.state = STATES.IDLE;
          this.attackLanded = false;
        }
      }
    }
  }

  move(dir) {
    if (!this.canAct() || !this.onGround) return;
    this.vx = dir * this.speed;
    this.facing = dir;
    this.state = STATES.WALK;
  }

  jump() {
    if (!this.canAct() || !this.onGround) return false;
    this.vy = this.jumpForce;
    this.onGround = false;
    this.state = STATES.JUMP;
    return true;
  }

  punch() {
    if (!this.canAct()) return false;
    this.state = STATES.PUNCH;
    this.stateTimer = 0.26;
    this.attackLanded = false;
    if (this.onGround) this.vx = 0;
    return true;
  }

  kick() {
    if (!this.canAct()) return false;
    this.state = STATES.KICK;
    this.stateTimer = 0.32;
    this.attackLanded = false;
    if (this.onGround) this.vx = 0;
    return true;
  }

  startSpecial() {
    if (!this.canAct() || this.special < this.specialMax || !this.onGround) return false;
    this.state = STATES.SPECIAL;
    this.stateTimer = 0.4;
    this.special = 0;
    this.attackLanded = false;
    this.vx = 0;
    return true;
  }

  // Boss spell-cast windup (no meter required)
  cast() {
    if (!this.canAct() || !this.onGround) return false;
    this.state = STATES.SPECIAL;
    this.stateTimer = 0.45;
    this.attackLanded = false;
    this.vx = 0;
    return true;
  }

  takeHit(damage, attackerX, knockback = 4) {
    if (this.invincible > 0 || this.state === STATES.KO) return { hit: false };
    const dir = this.x > attackerX ? 1 : -1;

    // Block: holding away from the attacker while grounded
    const facingAttacker = (attackerX > this.x ? 1 : -1) === this.facing || true;
    if (this.guarding && this.onGround && facingAttacker) {
      const chip = Math.max(1, Math.round(damage * 0.12));
      this.hp -= chip;
      this.state = STATES.BLOCK;
      this.stateTimer = 0.18;
      this.invincible = 0.12;
      this.vx = dir * 2;
      if (this.hp <= 0) { this.hp = 0; this.state = STATES.KO; }
      return { hit: true, blocked: true, dir };
    }

    this.hp -= damage;
    this.state = STATES.HIT;
    this.stateTimer = 0.32;
    this.hitFlash = 0.3;
    this.invincible = 0.42;
    this.vx = dir * knockback;
    this.vy = -3;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = STATES.KO;
    }
    return { hit: true, blocked: false, dir };
  }

  addSpecial(amount) {
    this.special = Math.min(this.specialMax, this.special + amount);
  }
}

export class BossAI {
  constructor(fighter, player, bossData) {
    this.fighter = fighter;
    this.player = player;
    this.ai = bossData.ai;
    this.special = bossData.special;
    this.thinkTimer = 0;
    this.action = "idle";
    this.actionTimer = 0;
    this.specialCD = 2.5;
    this.blockBias = false;
  }

  update(dt, onAttack, onSpecial) {
    const f = this.fighter;
    const p = this.player;
    f.guarding = false;
    if (f.state === STATES.KO || f.state === STATES.HIT) return;

    this.thinkTimer -= dt;
    this.actionTimer -= dt;
    this.specialCD -= dt;

    const dx = p.x - f.x;
    f.facing = dx > 0 ? 1 : -1;
    const dist = Math.abs(dx);
    const playerAttacking = p.state === STATES.PUNCH || p.state === STATES.KICK || p.state === STATES.SPECIAL;

    // Signature special: fire a projectile from range
    if (this.special && this.specialCD <= 0 && dist > 130 && f.canAct() && f.onGround && Math.random() < 0.6) {
      if (f.cast()) {
        this.specialCD = this.special.cooldown + Math.random() * 1.2;
        onSpecial?.();
        return;
      }
    }

    if (this.thinkTimer <= 0) {
      this.thinkTimer = 0.2 + Math.random() * 0.35;
      this.blockBias = Math.random() < 0.5 - this.ai.aggression * 0.22;
      const roll = Math.random();
      if (dist > 90) {
        this.action = dx > 0 ? "walk_right" : "walk_left";
        this.actionTimer = 0.4;
      } else if (roll < this.ai.aggression) {
        this.action = roll < this.ai.aggression * 0.5 ? "punch" : "kick";
        this.actionTimer = 0.3;
      } else {
        this.action = "idle";
      }
    }

    // Defensive: hold guard when the player is swinging and close
    if (this.blockBias && playerAttacking && dist < 80 && f.onGround && f.canAct()) {
      f.guarding = true;
      if (f.state === STATES.WALK) f.state = STATES.IDLE;
      return;
    }

    if (f.canAct()) {
      switch (this.action) {
        case "walk_left":
          f.move(-1);
          break;
        case "walk_right":
          f.move(1);
          break;
        case "punch":
          if (f.punch()) onAttack?.("punch");
          this.action = "idle";
          break;
        case "kick":
          if (f.kick()) onAttack?.("kick");
          this.action = "idle";
          break;
        default:
          if (f.state === STATES.WALK) f.state = STATES.IDLE;
      }
    }

    // Occasional jump-in
    if (f.canAct() && Math.random() < 0.004 && dist > 70) f.jump();
  }
}

export class BitcoinStar {
  constructor(x, y, facing, owner) {
    this.kind = "bitcoin";
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.owner = owner;
    this.speed = 9;
    this.damage = 20;
    this.life = 1.5;
    this.frame = 0;
    this.hit = new Set();
  }

  update(dt) {
    this.x += this.facing * this.speed;
    this.life -= dt;
    this.frame += dt * 60;
    return this.life > 0 && this.x > -20 && this.x < CANVAS_W + 20;
  }

  get hitbox() {
    return { x: this.x, y: this.y, w: 28, h: 28 };
  }
}

// Generic boss projectile (themed orb/beam). "gap" controls whether the player
// can duck/jump it: "high" travels at head height, "low" at body height.
export class Projectile {
  constructor(x, y, facing, owner, opts) {
    this.kind = "orb";
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.owner = owner;
    this.speed = opts.speed || 6;
    this.damage = opts.damage || 14;
    this.color = opts.color || "#ffffff";
    this.name = opts.name || "";
    this.life = 2.2;
    this.frame = 0;
    this.r = 13;
    this.hit = new Set();
  }

  update(dt) {
    this.x += this.facing * this.speed;
    this.life -= dt;
    this.frame += dt * 60;
    return this.life > 0 && this.x > -20 && this.x < CANVAS_W + 20;
  }

  get hitbox() {
    return { x: this.x, y: this.y, w: this.r * 2, h: this.r * 2 };
  }
}

export function boxesOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}
