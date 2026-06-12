import { CANVAS_W, CANVAS_H } from "./config.js";
import { faces } from "./assets.js";

export { CANVAS_W, CANVAS_H };

// Late-90s fighting game style sprite rendering

// Draws a knocked-out face portrait centered horizontally at the head,
// scaled to a target on-screen width, anchored so the chin sits at chinY.
function drawFace(ctx, faceCanvas, targetW, chinY) {
  if (!faceCanvas) return false;
  const aspect = faceCanvas.height / faceCanvas.width;
  const w = targetW;
  const h = w * aspect;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(faceCanvas, -w / 2, chinY - h, w, h);
  return true;
}

export function drawCryptoFighter(ctx, x, y, facing, state, frame, hitFlash) {
  ctx.save();
  ctx.translate(x, y);
  if (facing < 0) ctx.scale(-1, 1);
  if (hitFlash > 0) {
    ctx.globalAlpha = 0.5 + Math.sin(hitFlash * 30) * 0.3;
    ctx.filter = "brightness(2)";
  }

  const walk = Math.sin(frame * 0.4) * 3;
  const isAttack = state === "punch" || state === "kick" || state === "special";
  const legSpread = state === "kick" ? 14 : isAttack ? 4 : walk;

  // Muscular legs — white pants
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(-10, 0, 8, 28 + legSpread * 0.3);
  ctx.fillRect(2, 0, 8, 28 - legSpread * 0.3);
  ctx.fillStyle = "#111";
  ctx.fillRect(-10, 26, 8, 4);
  ctx.fillRect(2, 26, 8, 4);

  // Jacked torso — white suit, open jacket
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(-16, -42, 32, 44);
  // Abs peek
  ctx.fillStyle = "#c4a882";
  ctx.fillRect(-6, -20, 12, 14);
  ctx.fillStyle = "#e5c4a0";
  for (let a = 0; a < 3; a++) ctx.fillRect(-5, -18 + a * 5, 10, 2);

  // White suit lapels
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(-16, -42, 8, 44);
  ctx.fillRect(8, -42, 8, 44);

  // Arms — muscular
  const punchExt = state === "punch" ? 18 : state === "special" ? 12 : 0;
  const kickExt = state === "kick" ? 10 : 0;
  ctx.fillStyle = "#c4a882";
  ctx.fillRect(-22 - punchExt, -38, 10, 28);
  ctx.fillRect(12 + kickExt, -38, 10, 28);
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(-24 - punchExt, -40, 12, 12);
  ctx.fillRect(10 + kickExt, -40, 12, 12);

  // Sparkle glove
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(-26 - punchExt, -28, 14, 14);
  ctx.fillStyle = "#fff";
  ctx.fillRect(-22 - punchExt, -24, 4, 4);
  ctx.fillRect(-18 - punchExt, -20, 3, 3);

  // Neck
  ctx.fillStyle = "#c4a882";
  ctx.fillRect(-5, -46, 10, 8);

  // Face — portrait image composited onto the body (falls back to drawn head)
  if (!drawFace(ctx, faces.crypto, 58, -38)) {
    ctx.fillStyle = "#c4a882";
    ctx.fillRect(-10, -58, 20, 18);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-7, -52, 5, 4);
    ctx.fillRect(2, -52, 5, 4);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-6, -51, 3, 3);
    ctx.fillRect(3, -51, 3, 3);
    ctx.fillRect(-8, -54, 5, 2);
    ctx.fillRect(3, -54, 5, 2);
    ctx.fillRect(-4, -44, 8, 2);
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(-16, -68, 32, 6);
    ctx.fillRect(-12, -78, 24, 12);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(-2, -78, 4, 12);
  }

  // Jump pose
  if (state === "jump") {
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(-14, 4, 10, 8);
    ctx.fillRect(4, 4, 10, 8);
  }

  ctx.restore();
}

export function drawBossFighter(ctx, x, y, facing, state, frame, boss, hitFlash) {
  ctx.save();
  ctx.translate(x, y);
  if (facing < 0) ctx.scale(-1, 1);
  if (hitFlash > 0) {
    ctx.globalAlpha = 0.5 + Math.sin(hitFlash * 30) * 0.3;
    ctx.filter = "brightness(2)";
  }

  const scale = 1.15;
  ctx.scale(scale, scale);
  const walk = Math.sin(frame * 0.35) * 2;
  const isAttack = state === "punch" || state === "kick";

  // Jacked legs
  ctx.fillStyle = boss.suit;
  ctx.fillRect(-12, 0, 10, 30 + walk);
  ctx.fillRect(2, 0, 10, 30 - walk);
  ctx.fillStyle = "#111";
  ctx.fillRect(-12, 28, 10, 4);
  ctx.fillRect(2, 28, 10, 4);

  // Massive torso
  ctx.fillStyle = boss.suit;
  ctx.fillRect(-20, -48, 40, 50);
  // Muscles bursting suit
  ctx.fillStyle = boss.skin;
  ctx.fillRect(-8, -30, 16, 18);
  ctx.fillStyle = boss.skin;
  ctx.fillRect(-18, -44, 10, 20);
  ctx.fillRect(8, -44, 10, 20);
  // Abs
  for (let a = 0; a < 4; a++) {
    ctx.fillStyle = a % 2 === 0 ? boss.skin : "#b8956e";
    ctx.fillRect(-6, -28 + a * 4, 12, 3);
  }

  // Tie
  ctx.fillStyle = boss.tie;
  ctx.fillRect(-3, -38, 6, 28);

  // Arms — huge
  const ext = isAttack ? 16 : 0;
  ctx.fillStyle = boss.skin;
  ctx.fillRect(-26 - ext, -44, 12, 32);
  ctx.fillRect(14 + ext, -44, 12, 32);
  ctx.fillStyle = boss.suit;
  ctx.fillRect(-28 - ext, -46, 14, 14);
  ctx.fillRect(12 + ext, -46, 14, 14);

  // Neck
  ctx.fillStyle = boss.skin;
  ctx.fillRect(-6, -52, 12, 8);

  // Face — CEO portrait image composited onto the body (fallback to drawn head)
  if (!drawFace(ctx, faces[boss.faceKey], 60, -44)) {
    ctx.fillStyle = boss.skin;
    ctx.fillRect(-11, -64, 22, 18);
    ctx.fillStyle = boss.hair;
    if (boss.features.baldish) {
      ctx.fillRect(-10, -66, 20, 6);
    } else {
      ctx.fillRect(-12, -68, 24, 8);
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(-8, -58, 6, 5);
    ctx.fillRect(2, -58, 6, 5);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-7, -57, 4, 4);
    ctx.fillRect(3, -57, 4, 4);
  }

  // Company accent armband
  ctx.fillStyle = boss.accent;
  ctx.fillRect(-20, -36, 6, 10);
  ctx.fillRect(14, -36, 6, 10);

  ctx.restore();
}

export function drawBitcoinStar(ctx, x, y, frame, facing) {
  ctx.save();
  ctx.translate(x, y);

  // glowing motion trail behind the coin
  for (let i = 1; i <= 4; i++) {
    ctx.globalAlpha = 0.16 * (5 - i);
    ctx.fillStyle = "#f7931a";
    ctx.beginPath();
    ctx.arc(-facing * i * 7, 0, 13 - i * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // spin: squash horizontally like a flipping coin
  const spin = Math.abs(Math.cos(frame * 0.35));
  const rw = 2 + spin * 13;

  // outer glow
  ctx.shadowColor = "#f7931a";
  ctx.shadowBlur = 12;

  // coin face — Bitcoin orange
  const grad = ctx.createLinearGradient(0, -14, 0, 14);
  grad.addColorStop(0, "#ffb14d");
  grad.addColorStop(0.5, "#f7931a");
  grad.addColorStop(1, "#c2710c");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rw, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // rim
  ctx.strokeStyle = "#ffd27f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rw, 14, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Bitcoin ₿ logo, scaled with the spin so it reads as a flipping coin
  if (rw > 6) {
    ctx.save();
    ctx.scale(rw / 14, 1);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u20BF", 0, 1);
    ctx.restore();
  }

  ctx.restore();
}

function drawAvatar(ctx, faceCanvas, x, y, size, accent, flip) {
  ctx.save();
  // frame
  ctx.fillStyle = "#05050c";
  ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);
  // clipped face
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.fillStyle = accent + "33";
  ctx.fillRect(x, y, size, size);
  if (faceCanvas) {
    const aspect = faceCanvas.height / faceCanvas.width;
    const w = size * 1.15;
    const h = w * aspect;
    ctx.imageSmoothingEnabled = false;
    if (flip) {
      ctx.translate(x + size, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(faceCanvas, -(w - size) / 2 - size * 0.075, y - h * 0.06, w, h);
    } else {
      ctx.drawImage(faceCanvas, x - (w - size) / 2, y - h * 0.06, w, h);
    }
  }
  ctx.restore();
}

function drawWinPips(ctx, x, y, wins, color, align) {
  for (let i = 0; i < 2; i++) {
    const px = x + (align === "right" ? -i * 12 : i * 12);
    ctx.beginPath();
    ctx.arc(px, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = i < wins ? color : "#1a1a2e";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function drawBossOrb(ctx, proj) {
  const { x, y, color, frame, r } = proj;
  ctx.save();
  ctx.translate(x, y);
  // energy trail
  for (let i = 1; i <= 4; i++) {
    ctx.globalAlpha = 0.14 * (5 - i);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(-proj.facing * i * 7, 0, r - i * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // core
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.5, color);
  g.addColorStop(1, "#00000000");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r + Math.sin(frame * 0.4) * 2, 0, Math.PI * 2);
  ctx.fill();
  // crackle ring
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, r - 3, frame * 0.2, frame * 0.2 + Math.PI * 1.3);
  ctx.stroke();
  ctx.restore();
}

export function drawFightHUD(ctx, p1, p2, timer, round, bossName, bossFaceKey) {
  const barH = 18;
  const av = 34;
  const barW = 210;

  // CRYPTO avatar + bar (left)
  drawAvatar(ctx, faces.crypto, 16, 14, av, "#ffd700", false);
  const lbx = 16 + av + 8;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(lbx, 14, barW + 4, barH + 4);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(lbx + 2, 16, 3, barH);
  const hp1 = Math.max(0, p1.hp / p1.maxHp);
  const g1 = ctx.createLinearGradient(0, 16, 0, 16 + barH);
  g1.addColorStop(0, hp1 > 0.3 ? "#4ade80" : "#f87171");
  g1.addColorStop(1, hp1 > 0.3 ? "#15803d" : "#b91c1c");
  ctx.fillStyle = g1;
  ctx.fillRect(lbx + 5, 16, (barW - 4) * hp1, barH);
  ctx.fillStyle = "#ffd700";
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "left";
  ctx.fillText("CRYPTO", lbx + 2, 12);

  // BOSS avatar + bar (right)
  drawAvatar(ctx, faces[bossFaceKey], CANVAS_W - 16 - av, 14, av, p2.accent || "#ef4444", true);
  const rbx = CANVAS_W - 16 - av - 8 - (barW + 4);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(rbx, 14, barW + 4, barH + 4);
  ctx.fillStyle = p2.accent || "#ef4444";
  ctx.fillRect(rbx + barW + 1, 16, 3, barH);
  const hp2 = Math.max(0, p2.hp / p2.maxHp);
  const g2 = ctx.createLinearGradient(0, 16, 0, 16 + barH);
  const c2 = p2.accent || "#ef4444";
  g2.addColorStop(0, hp2 > 0.3 ? c2 : "#7f1d1d");
  g2.addColorStop(1, "#1f1030");
  ctx.fillStyle = g2;
  ctx.fillRect(rbx + 1 + (barW - 1) * (1 - hp2), 16, (barW - 1) * hp2, barH);
  ctx.textAlign = "right";
  ctx.fillStyle = "#fff";
  ctx.fillText(bossName, rbx + barW, 12);

  // Timer
  ctx.textAlign = "center";
  ctx.fillStyle = "#05050c";
  ctx.fillRect(CANVAS_W / 2 - 22, 12, 44, 26);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2;
  ctx.strokeRect(CANVAS_W / 2 - 22, 12, 44, 26);
  ctx.fillStyle = "#ffd700";
  ctx.font = "16px 'Press Start 2P', monospace";
  const t = Math.ceil(timer);
  ctx.fillText(String(t).padStart(2, "0"), CANVAS_W / 2, 32);
  ctx.font = "6px 'Press Start 2P', monospace";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(`ROUND ${round}`, CANVAS_W / 2, 48);

  // Special meter — Crypto only
  const smW = 180;
  const smX = lbx;
  const smY = 40;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(smX, smY, smW + 4, 10);
  const sp = p1.special / p1.specialMax;
  const gs = ctx.createLinearGradient(smX, 0, smX + smW, 0);
  if (sp >= 1) { gs.addColorStop(0, "#fde047"); gs.addColorStop(1, "#f59e0b"); }
  else { gs.addColorStop(0, "#818cf8"); gs.addColorStop(1, "#4338ca"); }
  ctx.fillStyle = gs;
  ctx.fillRect(smX + 2, smY + 2, smW * sp, 6);
  ctx.font = "5px 'Press Start 2P', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = sp >= 1 ? "#ffd700" : "#9ca3af";
  ctx.fillText(sp >= 1 ? "★ BITCOIN STARS READY  [C]" : "SPECIAL", smX, smY - 2);
}

export function drawAnnouncerText(ctx, text, subtext, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, CANVAS_H / 2 - 50, CANVAS_W, 100);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd700";
  ctx.font = "16px 'Press Start 2P', monospace";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;
  ctx.strokeText(text, CANVAS_W / 2, CANVAS_H / 2 - 10);
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2 - 10);
  if (subtext) {
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(subtext, CANVAS_W / 2, CANVAS_H / 2 + 20);
  }
  ctx.restore();
}
