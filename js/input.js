import { CONTROLS } from "./config.js";

export class Input {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.enabled = true;

    window.addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      if (!this.keys.has(e.key)) this.justPressed.add(e.key);
      this.keys.add(e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key);
    });
  }

  isDown(action) {
    return CONTROLS[action].some((k) => this.keys.has(k));
  }

  wasPressed(action) {
    return CONTROLS[action].some((k) => this.justPressed.has(k));
  }

  endFrame() {
    this.justPressed.clear();
  }
}
