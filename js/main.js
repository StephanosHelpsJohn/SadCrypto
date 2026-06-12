import { Input } from "./input.js";
import { AudioEngine } from "./audio.js";
import { Game } from "./game.js";
import { loadAssets } from "./assets.js";

const canvas = document.getElementById("game");
const input = new Input();
const audio = new AudioEngine();
const game = new Game(canvas, input, audio);

canvas.addEventListener("click", () => {
  audio.init();
  audio.resume();
});

// Faces composite in as soon as they finish loading; the game runs immediately.
loadAssets();
game.run();
