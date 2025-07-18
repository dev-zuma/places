# Pattern Recognition Clue Update Script

This script updates existing games to use the enhanced pattern recognition format for Turn 1 clues.

## New Pattern Format

**Old format**: `🌊🌉🎭` (3-4 emojis without descriptions)

**New format**: `🐉 Wawel Dragon 🥟 Pierogi` (2 emojis with descriptive terms)

### New Format Rules:
- Exactly 2 emojis per location
- One emoji must be a specific local food
- One emoji must be a unique cultural symbol
- Each emoji includes 1-2 word description
- Focuses on lesser-known cultural features

## Usage

### 1. Test Mode (Recommended First)
Update only the most recent game to test the changes:
```bash
node update-pattern-clues.js --test
```

### 2. Dry Run Mode
Preview what changes would be made without actually updating:
```bash
node update-pattern-clues.js --dry-run
```

Or with a limit:
```bash
node update-pattern-clues.js --dry-run --limit=5
```

### 3. Update All Games
Update all published games (use with caution):
```bash
node update-pattern-clues.js
```

### 4. Update Limited Number
Update only a specific number of games:
```bash
node update-pattern-clues.js --limit=10
```

## What the Script Does

1. Fetches all published games with their pattern recognition clues
2. For each game, generates new enhanced patterns using OpenAI
3. Updates the database with the new pattern format
4. Shows before/after comparisons in the console
5. Includes rate limiting to avoid API limits

## Example Output

```
Processing game: The Counterfeit Coup
Theme: A global counterfeiting ring creating fake historical artifacts
Locations: Prague, Cairo, Istanbul

  Current pattern clues:
    Location 1 (Prague): 🏰🌉🍺⏰
    Location 2 (Cairo): 🐪🔺📜🌴
    Location 3 (Istanbul): 🕌🌉🫖🐱

  NEW pattern clues that would be generated:
    Location 1 (Prague): 🏰 Prague Castle 🥨 Trdelník
    Location 2 (Cairo): 🔺 Giza Pyramids 🧆 Falafel
    Location 3 (Istanbul): 🕌 Blue Mosque 🍢 Kebab
```

## Notes

- The script preserves game functionality while enhancing the clues
- Frontend automatically handles both old and new formats
- Rate limited to 1 game per second to avoid OpenAI limits
- All changes are logged for transparency