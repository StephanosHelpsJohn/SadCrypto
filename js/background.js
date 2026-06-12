import { CANVAS_W, CANVAS_H, GROUND_Y } from "./config.js";

const THEMES = {
  cursor:    { back: "#0b1530", mid: "#16264f", floor: "#1e293b", neon: "#3b82f6", glass: "#60a5fa", glow: "#93c5fd", crowd: "#1b2540" },
  xai:       { back: "#100707", mid: "#2a0d0d", floor: "#1c1917", neon: "#dc2626", glass: "#f87171", glow: "#fca5a5", crowd: "#241010" },
  deepmind:  { back: "#04211f", mid: "#0a3a33", floor: "#134e4a", neon: "#10b981", glass: "#6ee7b7", glow: "#a7f3d0", crowd: "#0c2e2a" },
  openai:    { back: "#15123a", mid: "#262163", floor: "#312e81", neon: "#8b5cf6", glass: "#c4b5fd", glow: "#ddd6fe", crowd: "#1c1a44" },
  anthropic: { back: "#2e0d05", mid: "#5c1d0a", floor: "#7c2d12", neon: "#ea580c", glass: "#fdba74", glow: "#fed7aa", crowd: "#34160b" },
};
const KEYS = ["cursor", "xai", "deepmind", "openai", "anthropic"];

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCrowdPerson(ctx, x, y, type, frame, t, seed) {
  const bounce = Math.sin(frame * 0.09 + seed) * (type === "cheer" ? 5 : 2.5);
  const armUp = Math.sin(frame * 0.14 + seed * 1.7) * 6;
  const yy = y + bounce;

  if (type === "nerd") {
    // hoodie body
    ctx.fillStyle = "#475569";
    roundedRect(ctx, x - 7, yy - 16, 14, 18, 3);
    ctx.fill();
    // head
    ctx.fillStyle = "#e8c4a0";
    ctx.fillRect(x - 5, yy - 24, 10, 9);
    // hair
    ctx.fillStyle = "#2d2014";
    ctx.fillRect(x - 6, yy - 26, 12, 4);
    // glasses
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(x - 5, yy - 21, 4, 3);
    ctx.fillRect(x + 1, yy - 21, 4, 3);
    // raised laptop / phone glow
    ctx.fillStyle = t.glow;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x - 3, yy - 30 - Math.max(0, armUp), 6, 4);
    ctx.globalAlpha = 1;
  } else {
    // cheer — bright dress
    ctx.fillStyle = t.neon;
    roundedRect(ctx, x - 6, yy - 16, 12, 16, 4);
    ctx.fill();
    // head
    ctx.fillStyle = "#f1c9a5";
    ctx.fillRect(x - 5, yy - 25, 10, 10);
    // hair
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x - 7, yy - 27, 14, 6);
    ctx.fillRect(x - 7, yy - 23, 3, 8);
    ctx.fillRect(x + 4, yy - 23, 3, 8);
    // pom-poms up
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 11, yy - 24 - armUp, 6, 6);
    ctx.fillRect(x + 5, yy - 24 - armUp, 6, 6);
    ctx.fillStyle = t.glow;
    ctx.fillRect(x - 10, yy - 23 - armUp, 4, 4);
    ctx.fillRect(x + 6, yy - 23 - armUp, 4, 4);
  }
}

function drawStaffArrow(ctx, x, y, name, t, frame) {
  const wob = Math.sin(frame * 0.1 + x) * 2;
  const labelY = y - 40 + wob;
  ctx.font = "6px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  const w = ctx.measureText(name).width + 10;

  // label bubble
  ctx.fillStyle = "rgba(8,10,24,0.92)";
  roundedRect(ctx, x - w / 2, labelY - 9, w, 13, 3);
  ctx.fill();
  ctx.strokeStyle = t.neon;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = t.glow;
  ctx.fillText(name, x, labelY);

  // arrow pointing down to the fan
  ctx.fillStyle = t.neon;
  ctx.beginPath();
  ctx.moveTo(x - 4, labelY + 4);
  ctx.lineTo(x + 4, labelY + 4);
  ctx.lineTo(x, labelY + 12);
  ctx.closePath();
  ctx.fill();
}

export function drawArena(ctx, frame, boss) {
  const t = THEMES[boss.themeKey || "cursor"];
  const company = boss.company || boss.arena;
  const staff = boss.staff || [];

  // --- Back wall: deep gradient + glow ---
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#05050c");
  sky.addColorStop(0.35, t.back);
  sky.addColorStop(1, t.mid);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  // Radial stage glow behind the fighters
  const glow = ctx.createRadialGradient(CANVAS_W / 2, 150, 20, CANVAS_W / 2, 150, 320);
  glow.addColorStop(0, t.neon + "44");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  // --- Far parallax skyline silhouette ---
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  for (let i = 0; i < 14; i++) {
    const bw = 40 + (i % 4) * 18;
    const bh = 50 + ((i * 37) % 70);
    const bx = ((i * 70 - frame * 0.15) % (CANVAS_W + 120)) - 60;
    ctx.fillRect(bx, 110 - bh + 60, bw, bh);
    // window lights
    ctx.fillStyle = t.glass + "55";
    for (let wy = 0; wy < bh - 8; wy += 10) {
      for (let wx = 4; wx < bw - 6; wx += 10) {
        if ((i + wy + wx) % 3 === 0) ctx.fillRect(bx + wx, 110 - bh + 64 + wy, 4, 5);
      }
    }
    ctx.fillStyle = "rgba(0,0,0,0.45)";
  }

  // --- Sweeping spotlights ---
  for (let s = 0; s < 3; s++) {
    const sweep = Math.sin(frame * 0.02 + s * 2) * 120;
    const sx = CANVAS_W / 2 + sweep;
    const lg = ctx.createLinearGradient(CANVAS_W / 2 + (s - 1) * 180, 0, sx, 180);
    lg.addColorStop(0, t.glow + "55");
    lg.addColorStop(1, "transparent");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2 + (s - 1) * 180, 0);
    ctx.lineTo(sx - 40, 180);
    ctx.lineTo(sx + 40, 180);
    ctx.closePath();
    ctx.fill();
  }

  // --- Giant company sign (back wall, below the HUD so it stays readable) ---
  const signY = 66;
  const signH = 50;
  const signW = Math.max(260, company.length * 30 + 70);
  const signX = CANVAS_W / 2 - signW / 2;
  // marquee bulbs frame
  ctx.fillStyle = "#000";
  roundedRect(ctx, signX - 4, signY - 4, signW + 8, signH + 8, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(8,10,24,0.96)";
  roundedRect(ctx, signX, signY, signW, signH, 6);
  ctx.fill();
  ctx.strokeStyle = t.neon;
  ctx.lineWidth = 3;
  ctx.stroke();
  // chasing marquee bulbs
  for (let i = 0; i < signW; i += 18) {
    const on = (Math.floor(frame * 0.2) + i) % 36 < 18;
    ctx.fillStyle = on ? t.glow : "#222";
    ctx.beginPath();
    ctx.arc(signX + i + 9, signY - 1, 2.5, 0, Math.PI * 2);
    ctx.arc(signX + i + 9, signY + signH + 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // glowing company name (big + high contrast)
  ctx.textAlign = "center";
  ctx.shadowColor = t.neon;
  ctx.shadowBlur = 20 + Math.sin(frame * 0.1) * 8;
  ctx.fillStyle = "#ffffff";
  ctx.font = "26px 'Press Start 2P', monospace";
  ctx.fillText(company, CANVAS_W / 2, signY + 32);
  ctx.shadowBlur = 0;
  // colored underglow pass for punch
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = t.glow;
  ctx.fillText(company, CANVAS_W / 2, signY + 32);
  ctx.globalAlpha = 1;
  ctx.fillStyle = t.glass;
  ctx.font = "6px 'Press Start 2P', monospace";
  ctx.fillText("H Q   A R E N A", CANVAS_W / 2, signY + 44);

  // --- Jumbotron side screens (kept clear of the sign) ---
  for (const side of [-1, 1]) {
    const jx = side < 0 ? 12 : CANVAS_W - 64;
    ctx.fillStyle = "#05050c";
    roundedRect(ctx, jx, 70, 52, 36, 3);
    ctx.fill();
    ctx.strokeStyle = t.neon;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = t.neon;
    for (let g = 0; g < 5; g++) {
      const h = 6 + Math.abs(Math.sin(frame * 0.12 + g + side)) * 18;
      ctx.fillRect(jx + 6 + g * 9, 102 - h, 6, h);
    }
  }

  // --- Crowd stand ---
  ctx.fillStyle = t.crowd;
  ctx.fillRect(0, 150, CANVAS_W, 52);
  // tier shading
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 150, CANVAS_W, 6);

  // back row (smaller, dim)
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 26; i++) {
    const cx = 14 + i * 25;
    drawCrowdPerson(ctx, cx, 176, i % 3 === 0 ? "cheer" : "nerd", frame * 0.8, t, i * 2.1);
  }
  ctx.globalAlpha = 1;

  // front row (bigger)
  const frontCount = 16;
  for (let i = 0; i < frontCount; i++) {
    const cx = 24 + i * (CANVAS_W - 48) / (frontCount - 1);
    drawCrowdPerson(ctx, cx, 200, i % 2 === 0 ? "cheer" : "nerd", frame, t, i * 3.3);
  }

  // railing with neon
  ctx.fillStyle = "#2b3450";
  ctx.fillRect(0, 202, CANVAS_W, 7);
  ctx.fillStyle = t.neon;
  ctx.fillRect(0, 202, CANVAS_W, 2);

  // --- Named staff fans with arrows ---
  staff.slice(0, 5).forEach((name, i) => {
    const cx = 70 + i * ((CANVAS_W - 140) / 4);
    drawStaffArrow(ctx, cx, 200, name, t, frame);
  });

  // --- Stage floor (polished, reflective) ---
  const floorGrad = ctx.createLinearGradient(0, GROUND_Y - 14, 0, CANVAS_H);
  floorGrad.addColorStop(0, t.floor);
  floorGrad.addColorStop(0.4, "#0d0d14");
  floorGrad.addColorStop(1, "#000");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, GROUND_Y - 14, CANVAS_W, CANVAS_H - GROUND_Y + 14);

  // neon stage edge
  ctx.fillStyle = t.neon;
  ctx.fillRect(0, GROUND_Y - 14, CANVAS_W, 3);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = t.glow;
  ctx.fillRect(0, GROUND_Y - 11, CANVAS_W, 1);
  ctx.globalAlpha = 1;

  // perspective floor lines
  ctx.strokeStyle = t.neon;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1.5;
  for (let i = -3; i <= 9; i++) {
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, GROUND_Y - 12);
    ctx.lineTo(i * 90, CANVAS_H);
    ctx.stroke();
  }
  for (let yy = GROUND_Y + 6; yy < CANVAS_H; yy += 14) {
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(CANVAS_W, yy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // company watermark on the mat
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = t.glow;
  ctx.font = "20px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText(company, CANVAS_W / 2, CANVAS_H - 14);
  ctx.restore();
}
