// Loads CEO/hero face portraits and knocks out their solid background color
// so the heads composite cleanly onto the pixel fighter bodies.

const FACE_FILES = {
  crypto: "assets/face_crypto.png",
  musk: "assets/face_musk.png",
  altman: "assets/face_altman.png",
  amodei: "assets/face_amodei.png",
};

export const faces = {};
export let assetsReady = false;

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

function knockoutBackground(img) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, 0, 0);

  const data = cx.getImageData(0, 0, c.width, c.height);
  const px = data.data;

  // Sample background color from the four corners (averaged)
  const corners = [
    0,
    (c.width - 1) * 4,
    (c.height - 1) * c.width * 4,
    ((c.height - 1) * c.width + (c.width - 1)) * 4,
  ];
  let br = 0, bg = 0, bb = 0;
  for (const i of corners) {
    br += px[i];
    bg += px[i + 1];
    bb += px[i + 2];
  }
  br /= 4; bg /= 4; bb /= 4;

  // Flood-fill from edges so we only remove the contiguous background,
  // never matching colors inside the face/hair.
  const w = c.width, h = c.height;
  const visited = new Uint8Array(w * h);
  const stack = [];
  const tol = 100;

  const pushIfBg = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (colorDist(px[p], px[p + 1], px[p + 2], br, bg, bb) <= tol) {
      visited[idx] = 1;
      stack.push(idx);
    }
  };

  for (let x = 0; x < w; x++) { pushIfBg(x, 0); pushIfBg(x, h - 1); }
  for (let y = 0; y < h; y++) { pushIfBg(0, y); pushIfBg(w - 1, y); }

  while (stack.length) {
    const idx = stack.pop();
    const p = idx * 4;
    px[p + 3] = 0;
    const x = idx % w;
    const y = (idx / w) | 0;
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
  }

  // Soften the cut edge a touch
  cx.putImageData(data, 0, 0);
  return c;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadAssets() {
  const entries = Object.entries(FACE_FILES);
  await Promise.all(
    entries.map(async ([key, src]) => {
      const img = await loadImage(src);
      if (img) faces[key] = knockoutBackground(img);
    })
  );
  assetsReady = true;
}
