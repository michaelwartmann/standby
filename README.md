# Standby – Hold the Castle (28 nights without power)

A small, free app that helps a healthy household get through three to four weeks without electricity, and through what follows from it: no heating, no tap water, no mobile network, no shops. Spartan, not prepper.

- **The castle quest:** Ylva, a fierce ten-year-old, holds her crooked tower for 28 nights, with her dog Brumm, Oma Ilse and the village. Your home is the castle: ten rooms from the cellar up (Well, Granary & Kitchen, Hearth, Workshop, Herb Room, Great Hall, Bard's Corner, Gatehouse, Signal Tower, Lantern Tower), each with its own questions, gaps and guidance. A rough "nights your castle holds" score (water, food, warmth, toilet) and a weakest room. Each night visitor stands for a real risk: Frost the fox (cold), the pantry rats (food), the Murk toad (water), the magpie (light and phone power), the rumour crows (false news), the Grumble troll (low spirits), the Muddy Boots gang (fire and smoke).
- **Planned for the worst case:** the whole country without power for 28 winter days, nothing coming in. Each need (warmth, water, food, light and information, toilet) is a chain from source to use; the engine (`plan.js`) finds the level a household reaches (not yet safe / survive without any electricity / okay / comfortable) and the missing links, cheapest and most important first. Extreme climates get a plain answer: plan to leave early. Background study: "Hold the Castle – study" (Ukraine 2022–26, Berlin 2026, Texas 2021, Puerto Rico 2017, TAB report to the Bundestag).
- **Battle plan:** your five chains, the nights your castle holds, and a to-do list you tick off on the phone.
- **Walk the castle (the check):** 20 questions → a gap list (red / amber / green), sorted water → warmth → fire safety → toilet → food → light → health → people, each with the cheapest fix.
- **Stock calculator:** the BBK 10-day checklist scaled to your household and number of days, plus non-food items.
- **Guidance:** what to do hour by hour, water, warmth, food, toilet and hygiene, light and phone power, health and first aid, tech and repair, mind and community, communication without the mobile network.
- **Communication card:** meeting point, times, radio channel, emergency point, who to check on. Saved on the phone, printable.
- **Everything to print:** paper works when the phone is empty.

English and German. Works offline after the first visit, installable on the home screen. No server, no account, no tracking, no outside requests. Answers stay in the phone's local storage.

Not medical advice. Do a first-aid course. Sources are listed on every page (BBK, TAB report to the Bundestag, WHO, ERC, USDA, Berlin 2026 commission); the first-aid page is waiting for a review by DRK trainers.

Files: `index.html` (shell, castle, check, calculator, card), `content.js` (all guidance, EN/DE), `quest.js` (rooms, visitors, crew, EN/DE), `plan.js` (questions and chain engine), `art/` (pictures made with Google Gemini, original characters), `sw.js` (offline), `manifest.webmanifest`, `icons/` (from the Gemini app icon).

MIT licence (see the repository's LICENSE).
