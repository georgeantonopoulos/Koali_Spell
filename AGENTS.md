# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Development Workflow

No build tools or dependencies. Open `index.html` directly in a browser to run the app. All development is editing `index.html`.

## Architecture

**Single-file app** — all HTML, CSS, and JavaScript lives in `index.html` (~2900 lines). No frameworks, no bundler, no external dependencies.

### Key Sections in index.html

| Line range | Content |
|---|---|
| 1–100 | HTML structure / screen skeletons |
| ~100–1450 | CSS (animations, themes, responsive layout) |
| ~1450–1600 | Data: `DEFAULT_WORDS`, `MAYA_DEFAULT_WORDS`, `PROFILES` config object |
| ~1600–1650 | Global game state variables |
| ~1650–1800 | Initialization: `init()`, `selectProfile()`, `applyTheme()` |
| ~1800–2250 | Core game loop: `loadChallenge()`, spelling round, math round, scoring |
| ~2250–2630 | Boss battle system |
| ~2630–2800 | Settings UI: word editor, times table grid |
| ~2800–2910 | Web Audio synthesis (all sounds, no audio files) |

### Profiles

Two profiles — **Christopher** (`id: 'christopher'`) and **Maya** (`id: 'maya'`) — each defined in the `PROFILES` object. Key profile fields:

- `defaultWords` — points to `DEFAULT_WORDS` or `MAYA_DEFAULT_WORDS`
- `defaultTables` — array of multiplication tables (e.g. `[4, 9]`)
- `storagePrefix` — `'koali'` or `'bear'` (prefixes all localStorage keys)
- `mathRounds` — `null` means match word count; `5` means fixed 5 math rounds
- `bodyGradient`, `bossGradient` — CSS gradient strings for theme switching

### Persistence (localStorage)

All data stored via `storageKey(suffix)` which returns `{storagePrefix}_{suffix}`:
- `customWords` — JSON array of `{word, emoji, hint}` objects
- `timesTables` — JSON array of numbers
- `totalPounds` — lifetime currency count
- `lastProfile` — `'christopher'` or `'maya'`

Custom words override defaults when present. Saving `null`/empty removes customization and restores defaults.

### Word Data Shape

```js
{ word: "torch", emoji: "🔦", hint: "A light you can carry" }
```

Words are always lowercase. The game renders the emoji during play; the hint is shown as a clue.

### Game Flow

```
selectProfile() → loadWords() / loadTimesTables()
startGame()     → build roundSchedule[] (interleaved 'spelling'/'math')
loadChallenge() → dispatch to loadSpellingRound() or loadMathRound()
checkWord() / checkMathAnswer() → score/streak update → nextRound()
startBossBattle() → mixed spelling+math with HP/hearts → showVictory()
```

Round scheduling interleaves math rounds evenly across spelling rounds. Boss battle triggers after all regular rounds complete.

### Scoring

- Correct answer: `10 + max(0, streak-1) * 5` points
- Up to 5 "Pounds" earned per game: beating boss, accuracy thresholds (70%/90%), streak ≥ 5, no hearts lost

### Adding/Changing Default Words

Edit `DEFAULT_WORDS` (Christopher) or `MAYA_DEFAULT_WORDS` (Maya) near line 1474. Each entry needs `word`, `emoji`, and `hint`. Custom words saved in localStorage will override defaults until the user resets to defaults in settings.
