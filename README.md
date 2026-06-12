# Sad Crypto — Fighter Edition

A late-90s Street Fighter-style boss rush. Play as **Crypto** (jacked MJ in white suit & fedora) and defeat five AI CEOs in their futuristic corporate HQs — with nerds and cheer squads cheering you on.

## Play

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

**Click the game canvas once** to enable sound.

## Controls

| Key | Action |
|-----|--------|
| ← → | Move |
| ↑ | Jump |
| Z | Punch |
| X | Kick |
| C | Bitcoin special — throws spinning Bitcoin coins (charges as you fight) |
| Double-tap ← / → | Dash |
| Hold away | Block (hold the direction away from the boss) |
| Enter | Start / continue |

You can also **punch/kick in the air** for jump-in attacks, and **chain hits into combos** for bonus damage.

## Bosses (defeat each once)

1. **Michael Truell** — Cursor HQ — *Tab Blade*
2. **Elon Musk** — xAI / Tesla HQ — *Rocket*
3. **Sam Altman** — OpenAI HQ — *GPT Orb*
4. **Dario Amodei** — Anthropic HQ (final) — *Claude Beam*

Each boss is a jacked caricature with their real face on the body, their name on the health bar, and a signature projectile special. Win and Crypto fires off a one-liner — beat Dario for the victory celebration!

## Features

- Street Fighter II–style health bars with face portraits, timer, and announcer
- One fight per CEO, plus a victory quote screen with the boss portrait
- Unique telegraphed boss specials, blocking, dashing, jump-in attacks
- Hit-stop, screen shake, screen flash, hit sparks, and a combo counter with damage scaling
- Bitcoin-coin projectiles as Crypto's special move
- Procedural retro sound effects and chiptune fight music
- Futuristic office arenas with giant company branding and cheering crowds (with arrows pointing to named staff)
