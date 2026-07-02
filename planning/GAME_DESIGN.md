# Accountabillibuddy — Game & Reward Design (v0.2–v0.3)

The reward stack, what psychological lever each piece pulls, and the rules that
keep it pointed at the user's goal instead of at screen time.

## The one rule above all rules

**Every reward in the app triggers off exactly one action: a real check-in on a
real goal.** No login rewards, no watch-this tap-this engagement candy, no
pay-to-win. If a mechanic can fire without the user having shown up for their
goal, it doesn't ship. (This is the line between "addicted to accomplishing your
goals" and "addicted to an app.")

## The reward stack

| Mechanic | Lever | Detail |
|---|---|---|
| **Sticker drop on every check-in** | Variable-ratio reinforcement (the strongest known reinforcement schedule) | The *reward* is certain; the *rarity* is the gamble. Common 55% / uncommon 30% / rare 12% / precious 3%. |
| **Peel-to-reveal moment** | Anticipation — dopamine peaks *before* the reward, not at it | Stamp lands → beat of delay → "a sticker fell out of today's page…" → user taps to peel. The pause and the tap are deliberate. |
| **Pity timer** | Protects the schedule from despair | 7 check-ins without a rare+ guarantees one. Slot machines can starve you; we don't. |
| **Sticker book (34 to collect)** | Collection/completion drive + endowment | Grid with silhouettes for the unfound. "27 of 34" is an itch. Duplicates counted (×3) so no drop feels wasted. |
| **Early-bird bonus** | Shaping — reward the *better* version of the behavior | Checking in before your target time = gold-edged stamp + boosted rarity odds (18% rare / 5% precious). |
| **Weekly quest card** (3 quests, Mon–Sun) | Goal gradient + fresh-start effect | Progress bars accelerate effort near completion; the card resets every Monday, a built-in fresh start. All 3 done = "golden week" + guaranteed precious sticker. |
| **First-to-the-page race** | Friendly competition, kept tiny | Whoever stamps first gets a little crown on their polaroid; weekly tally on the quest card. Deliberately cosmetic — competing *with* your buddy must never threaten the pair bond. |
| **Streak flame tiers** | Identity progression made visible | The badge itself evolves: ember → flame (3) → warm glow (7) → bright (14) → gold aura (30). Losing a grown flame hurts more than losing a number. |
| **Titles** | Identity-based habit ("I'm someone who shows up") | Earned by lifetime stamps, shown under your name: day one → getting started (3) → one week strong (7) → the regular (15) → keeper of pages (30) → unstoppable (60) → legend of the book (100). Lifetime = never lost to a broken streak. |
| **Evening tension state** | Loss aversion, applied gently | After 6pm unstamped: "today's page is still open… 🔥 6 on the line" + softly pulsing badge. States a fact the user cares about; never guilt, never shame. |
| **Buddy reaction** | Social reward, variably timed | A minute or three after you stamp, Sunny reacts (❤️ on your polaroid + chime). Variable timing makes it a second, unpredictable hit — and it models what real buddies will do. |
| **Streak freezes & repair** | Neutralizes the what-the-hell effect | Unchanged from v0.1: earn 1 per 7 days (cap 3), auto-consumed. The single most important anti-churn mechanic. |

## Added in v0.3

| Mechanic | Lever | Detail |
|---|---|---|
| **Daily notification** (native) | External trigger — the missing half of the habit loop | Fires at the user's chosen time; copy invokes the buddy ("Sunny already stamped today 🌻"), never guilt. Survives reboots; toggleable in settings. |
| **The mend ritual** | Redemption arc vs. the what-the-hell effect | One missed day (freezes exhausted) isn't death: stamp the next 3 days in a row and the tear is stitched shut — streak restored, 🪡 mark in the strip and journal. "Broken-and-repaired is a better story than never-broken." Two-day gaps still break for real: mending must cost something. |
| **Sunny's weekly gift** | Reciprocity + variable social reward | One deterministic day per week, a 🎁 waits on the buddy's polaroid; claiming runs the reveal flow with an uncommon/rare sticker. Models what real buddies will do for each other later. |
| **The promise note** | Self-persuasion + implementation intention deepening | "Why does this goal matter?" — asked after the second stamp (not during onboarding, when motivation talk is cheap). Their own words are replayed in the evening tension state: "you wrote: …". People don't argue with themselves. |
| **Monthly spreads** | Chunking + endowment | The journal groups into month album cards with stamp/together/sticker counts. A finished month is a *possession*. |
| **Unlockable washi palette** | Cosmetic progression, no economy | Best-ever streak of 7 unlocks two tape colors, 30 unlocks two more; each day's page is taped in colors drawn from the unlocked palette. Progress you can see without a number. |

## Tuning notes

- **Sound design carries more of the dopamine than visuals.** Stamp thunk
  (filtered noise + 120→45Hz sine), sticker peel (rising bandpass sweep), rarity
  arpeggio (2 notes common → 4 notes precious). All synthesized, all < 0.7s,
  all optional.
- **Rarity is felt through material, not text**: uncommon = sage scalloped edge,
  rare = gold foil + moving shine, precious = holographic gradient + confetti.
  The word ("RARE") is a whisper under the name; the shine does the talking.
- **Sticker placement**: stickers glue themselves along the page margins at a
  random tilt — decoration, never occlusion.

## What we deliberately did NOT copy from Duolingo

- **No gems/currency** — a second economy exists to be sold; ours would rot into
  pay-to-skip.
- **No purchasable streak freezes** — freezes are earned only. Selling absolution
  converts streak pride into cynicism.
- **No leagues of strangers (yet)** — league pressure works but burns people out;
  if we add it, it's pair-vs-pair so the pressure bonds the duo.
- **No guilt notifications** — the pull is "your page is open" and "your buddy
  stamped," never "you're letting everyone down."

## Later (needs backend / real buddies)

- Real buddy reactions and voice notes replacing Sunny's simulated ones.
- Pair-vs-pair weekly leagues; co-op challenges with shared quest cards.
- Sticker trading between buddies (one trade/week — scarcity keeps it a ritual).
- Seasonal sticker sets (fresh-start effect at month boundaries).
