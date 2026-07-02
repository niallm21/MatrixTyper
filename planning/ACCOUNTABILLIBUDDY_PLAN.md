# Accountabillibuddy — Product Plan

*A buddy-matching app that makes accomplishing your goals feel as compulsive as scrolling.*

---

## 1. The Honest Opinion First (the "super buddy" crux)

You asked for a real opinion, so here it is before anything else.

**The instinct behind paid super buddies is correct.** Accountability works dramatically
better when the partner is (a) skilled at it and (b) has something at stake. Money creates
both. The rating-gated entry ("you must earn lots of 5-star ratings as a free buddy first")
is genuinely clever — it turns your free tier into a farm system for your paid tier, and it
gives every free user a reason to be a *good* buddy, which improves the core product.

**But it is the wrong thing to build first**, for four concrete reasons:

1. **Cold start is doubled.** A normal two-sided marketplace needs supply and demand.
   Yours needs supply that can only be *created inside your own app* (ratings accrue
   in-app). On day one you have zero qualified super buddies, so you can't sell the
   subscription, so nobody has a reason to grind ratings. You must run the free
   peer-matching product successfully for months before the marketplace is even possible.
   That's not a flaw — it's a sequencing fact. Build the free product as if the
   marketplace doesn't exist, and let it earn the marketplace.

2. **Paying humans changes your legal shape.** The moment you pay super buddies you're a
   payments marketplace: Stripe Connect or similar, identity verification (KYC), tax forms
   (1099s in the US), payout disputes, refund policy for "my buddy ghosted me," and
   liability questions when a paid stranger gives someone advice about their health,
   money, or mental state. All solvable, all standard — but it's a company-sized workload
   bolted onto a v1.

3. **Money supercharges the gaming problem.** Right now the worst a fake buddy can do is
   waste someone's time. Attach income to 5-star ratings and you will get rating rings
   (friends rating friends), AI-operated buddy accounts, and review extortion ("5 stars or
   I report you"). Section 8 covers defenses, but understand: the anti-gaming system must
   be *mature before* money flows, not after.

4. **There's a competing money-psychology model worth testing first.** Behavioral science
   says loss aversion beats reward: people work harder to avoid losing $20 than to gain
   $20. Apps like StickK, Beeminder, and Forfeit are built on **commitment stakes** — you
   pledge money against your own goal and lose it if you fail (or it goes to your buddy,
   or to an anti-charity). This is far simpler to build (no marketplace, no payouts to
   vet), it's proven, and it might deliver more of the "actually accomplish your goals"
   outcome than paid coaching does. It's at minimum a strong v2 candidate that could fund
   the company while the super-buddy supply matures.

**Verdict: keep the super-buddy vision, but as Phase 3.** The rating-gated qualification
is the best version of the idea I've seen, and by the time you build it you'll have real
rating data to calibrate the bar. Roadmap in Section 10.

One more honest note on a different part of the brief: you said you want people
**"ADDICTED to accomplishing their goals."** The mechanics below are genuinely habit-forming,
so aim them carefully — the addiction target must be *the goal progress*, not *the app
usage*. An app that people compulsively open but that doesn't move their real-world goals
gets deleted in week three and reviewed badly. Every retention mechanic in this plan is
therefore tied to a real check-in about a real goal, never to raw screen time.

---

## 2. One-Sentence Product Definition

> Accountabillibuddy matches you with one person who shares your goal, and every morning
> (or whenever you set) you check in with each other — with streaks, games, and friendly
> competition that make showing up feel delightful instead of dutiful.

The unit of the product is **the pair**, not the individual. Every design decision below
flows from that.

---

## 3. Why Pairs Work (the psychology this app is built on)

These are the specific, named effects the product should exploit, and *where* each one
lives in the app:

| Effect | What science says | Where it lives in the app |
|---|---|---|
| **Köhler effect** | People persist longer at hard tasks when paired with a slightly-more-capable partner they don't want to let down. | Matching algorithm pairs you with someone *marginally* more consistent than you (see §6). |
| **Implementation intentions** | "I will do X at time Y in place Z" doubles-to-triples follow-through vs. vague goals. | Goal setup forces the when/where, not just the what. The check-in time IS the implementation intention. |
| **Loss aversion** | Losing something hurts ~2x more than gaining it feels good. | Shared pair streak that BOTH people lose if either misses. Later: commitment stakes. |
| **Fresh start effect** | People commit to goals at temporal landmarks (Mondays, month starts, birthdays). | Onboarding and re-engagement pushes are timed to Mondays/month boundaries. "New month, new page" scrapbook metaphor. |
| **Goal gradient effect** | Effort accelerates near a visible finish line. | Progress shown as distance-to-next-milestone, never as raw totals. "3 days to your 30-day stamp." |
| **Endowed progress** | People finish faster when given a head start. | New pairs start with a "Day 1" stamp already placed for completing onboarding together. |
| **Variable reward** | Unpredictable rewards drive the strongest habit loops (the slot-machine core of the Hook model). | Check-in animation/sticker/sound is drawn from a rarity pool. Occasionally your buddy's check-in unlocks a surprise for you. |
| **Reciprocity & mere accountability** | Merely knowing a specific person will see whether you did it is one of the strongest known compliance drivers (ASTD-style studies put a specific accountability appointment at ~95% follow-through vs ~10% for a private intention). | Your buddy always *sees* your check-in or your absence. The app never lets a miss be invisible. |
| **What-the-hell effect** | One broken streak triggers total abandonment ("I ruined it, why bother"). | **Streak freezes** and "repair" mechanics (§5). Never let a single miss zero out weeks of identity. This is the single most important retention detail in the whole app. |
| **Identity-based habit (Fogg/Clear)** | Habits stick when they feed an identity ("I'm a runner"), not an outcome. | Copy throughout says "You're becoming a person who shows up." Scrapbook = accumulating physical *evidence of identity*. |

**The scrapbook aesthetic is not just decoration — it's the psychology.** A scrapbook is
literally *accumulated evidence of who you are*. Every check-in adds an artifact (stamp,
photo, sticker, note from your buddy). Deleting the app means abandoning a beautiful
object you and another person made together. That's endowment + sunk cost + social bond in
one visual metaphor. Lean into it hard.

---

## 4. The Core Loop

```
 TRIGGER            ACTION              REWARD                  INVESTMENT
 Morning push  →    Check in (10s:  →   Stamp animation +   →   Scrapbook page grows;
 at YOUR set        tap "done" +        sound + see buddy's     buddy sends reaction;
 time, phrased      optional photo/     status + variable       streak advances;
 as "Sam is         note)               sticker drop            tomorrow's page
 waiting"                                                       awaits
```

Loop details that matter:

- **The notification names the human, not the task.** "Maya just checked in — your turn"
  outperforms "Don't forget your goal!" because it invokes the social contract, and
  because your buddy checking in first is itself a variable trigger (sometimes you're
  first, sometimes chasing).
- **Check-in must take under 10 seconds** in the minimal case (one tap + confirm). Photo
  proof, notes, and reactions are optional depth, never required friction.
- **Both states are visible.** The pair screen shows two slots every day. An empty slot
  next to your buddy's filled one is deliberately, gently uncomfortable.
- **Check-in window, not check-in instant.** User sets a target time (e.g., 7:00am) and
  the day's window (e.g., until noon). Missing the target but hitting the window = "late
  stamp" (slightly different visual — honest but not punishing).

### Daily surface (the pair page)

One shared page per day, scrapbook-style: two check-in slots, the pair streak, today's
micro-interaction (reaction, nudge, or mini-game), and the running week strip. This page
IS the app. Everything else (settings, history, matching) is secondary.

---

## 5. Streaks, Games, and Friendly Competition

### Streaks — the pair streak is the product's spine

- **Shared pair streak**: advances only when *both* check in. This is the Köhler effect
  weaponized — you can't let your buddy down without feeling it.
- **Individual streak** runs quietly alongside, so a flaky buddy doesn't destroy your
  personal record (critical for fairness and for rematching without rage-quitting).
- **Streak freezes**: each person earns 1 freeze per 7 consecutive days (cap 3 banked).
  A miss auto-consumes a freeze. This is Duolingo's single most effective retention
  mechanic and it directly neutralizes the what-the-hell effect.
- **Repair ritual**: if the pair streak truly breaks, offer a joint "repair": both
  check in for the next 3 consecutive days and the streak is restored with a visible
  "mended" stitch on the scrapbook (torn page taped back together — perfect for the
  aesthetic). Broken-and-repaired is a *better* story than never-broken.
- **Milestone stamps** at 3, 7, 14, 30, 60, 100 days — physical wax-seal/passport-stamp
  visuals that live permanently in the scrapbook.

### Games & competition (friendly, opt-in, never zero-sum by default)

- **Cooperative by default**: weekly pair challenges ("both check in before 8am 5 times
  this week") where you win or lose *together*.
- **Competitive as a mode**: head-to-head weeks ("most early check-ins wins; loser's
  scrapbook page gets decorated by the winner" — stakes that are social and silly, never
  humiliating).
- **Pair vs. pair leagues** (later): your duo competes against other anonymous duos in a
  weekly bracket. Competition *between* pairs strengthens the bond *within* the pair —
  much safer than competing against your own buddy.
- **Micro-games at check-in** (later): 20-second two-player asynchronous games (word
  duel, quick-draw prompt) as an occasional variable-reward surprise after check-in, not
  a daily obligation.

### Motivation tools

- Reaction stickers and short voice notes (voice > text for feeling human, and much
  harder for low-effort/AI buddies to fake warmth in — see §8).
- "Nudge" button with taste: one per day, renders as a hand-drawn doodle poking the
  empty check-in slot.
- Weekly reflection Sunday: 2 prompts, answers become a scrapbook spread both can see.

---

## 6. Matching (the make-or-break system)

Bad matches are why every buddy app before this one died. Treat matching + rematching as
the #1 engineering investment after the core loop.

**Match on, in priority order:**
1. **Goal category + cadence** (daily gym ≠ weekly writing session).
2. **Check-in time window overlap** (timezone-aware — a 7am Lisbon runner and a 7am
   Denver runner can't share a morning).
3. **Consistency tier** — pair people with someone at or *slightly above* their recent
   consistency (Köhler pairing). New users get a provisional tier from onboarding answers.
4. **Intensity preference** — "drill sergeant" vs "gentle cheerleader," self-declared.
5. **Soft signals**: age band, language, optional gender preference for comfort/safety.

**Rematching is a first-class flow, not a failure state.**
- Either person can end a pairing at any time, no reason required, framed as "graduating
  the page" — the shared scrapbook pages are archived, not deleted.
- Auto-rematch triggers: buddy inactive 4+ days → app proactively offers a new match
  ("Your buddy seems to have stepped away — want a new partner while we check on them?").
  The abandoned user must never be stranded; stranding is the app's death.
- A 3-day "trial period" for every new pair, after which both privately confirm. No-fault
  passes don't affect anyone's rating.
- **Buddy ratings** happen at natural boundaries (end of a challenge, end of pairing, each
  30-day milestone), not daily. These are the ratings that later feed super-buddy
  qualification, so their integrity matters from day one (§8).

---

## 7. Design Language — "Elegant Scrapbook"

Your instinct (pastel yellow, cursive, scrapbook, elegant) is a genuinely good and
differentiated direction — every competitor looks like a sterile SaaS dashboard. Specifics
to make it work:

### Palette
- Background: warm pastel butter-yellow (`#FBF3DC` / `#FAF0D7` range) with a subtle paper
  grain texture — reads as cream/parchment, not highlighter.
- Ink: warm near-black (`#3B3226`) — never pure black on cream.
- Accents: dusty rose, sage green, faded denim blue, terracotta — scrapbook-sticker
  colors, all desaturated to sit politely on the yellow.
- One "celebration" color (marigold/gold-leaf) reserved exclusively for streak/milestone
  moments so it keeps its power.

### Typography — the one place to override your instinct slightly
**Cursive for accents only, never for body text.** Cursive body copy tanks legibility and
accessibility (and gets your app abandoned by anyone over 40 or with dyslexia). The
combination that gives you the feeling you want:
- **Display/headers & handwritten moments**: a warm script — *Caveat*, *Dancing Script*,
  or *Homemade Apple* for the "handwritten in the scrapbook" notes, dates, and buddy
  messages.
- **Body**: a warm, slightly bookish serif (*Fraunces*, *Lora*) or rounded humanist sans
  (*Nunito*) for everything that must be read at a glance.
- All handwritten-style text must also pass contrast at its rendered size.

### Materials & motion
- Scrapbook physicality: torn paper edges, washi-tape corners, wax seals, polaroid frames
  for photo check-ins, pressed-flower flourishes at milestones.
- **Check-in animation** (the most-seen animation in the app — spend real money here):
  a rubber stamp thunks onto the page with a satisfying squash-and-settle, ink bleeds
  slightly, a tiny paper-dust puff. Build in **Rive** (or Lottie) for 60fps native feel.
- Page-turn transition between days; pages physically accumulate on the left edge so
  history has visible *thickness* (endowment made literal).
- Sound design: soft, papery, ASMR-adjacent — stamp thunk, page rustle, pencil scratch,
  a warm two-note chime when your buddy checks in. All optional, on by default, ducked
  and brief. Never klaxons or slot-machine noise — "elegant" is the filter for every
  sound.
- Haptics on stamp-down (iOS `impactOccurred(.medium)` / Android equivalent).
- Respect `prefers-reduced-motion`; every animation has a reduced variant.

---

## 8. Anti-Gaming & Anti-AI (designing for the marketplace before it exists)

Full honesty: **you cannot make this perfectly un-gameable, and you shouldn't promise
that.** What you can do is make cheating more expensive than being genuine, and make the
rating signal robust enough that cheaters don't reach super-buddy status. Layers:

### Layer 1 — Make ratings hard to farm
- **Time-gated ratings**: a rating only counts toward super-buddy qualification if the
  pairing lasted ≥ 14 days with ≥ 10 mutual check-ins. Rating rings now cost weeks of
  daily activity per fake rating.
- **Rater-weighted reputation** (PageRank-style): a 5-star from a long-tenured,
  consistent, own-goals-achieving user is worth many times a 5-star from a fresh account.
  Fake accounts rating each other have near-zero weight because none of them have weight.
- **Outcome-linked ratings**: the qualification metric isn't stars alone — it's
  "*partners' check-in consistency while paired with you*" vs. their baseline. You can't
  fake making other people actually show up. This is the single strongest defense: the
  metric measures the *outcome the buyer is paying for*.
- **Velocity + graph anomaly detection**: accounts whose raters cluster (same device
  fingerprints, sign-up cohort, IP range, always-mutual pairings) get flagged for review.
- Ratings are private aggregates; you never see who rated you what, killing extortion.

### Layer 2 — Make accounts expensive
- Phone verification at signup; device fingerprinting; one account per person enforced at
  payout via **KYC** (which the payments provider requires anyway — a happy alignment:
  the money layer's compliance burden *is* an anti-gaming feature).
- Super-buddy application includes a short **live video screen** (recorded async or a
  10-minute call in early days when volume is low). Humans reviewing humans is
  affordable when the qualification funnel is narrow, and it establishes a face that
  later spot-checks can match.

### Layer 3 — Make AI-operated buddies unprofitable, and think clearly about AI-assisted ones
- Distinguish two threats. **AI-operated** (a bot running an account to farm super-buddy
  income) is the real one, and Layers 1–2 mostly kill it: outcome-linked metrics require
  actually improving real humans' consistency for weeks, phone/KYC gates account
  creation, and the video screen requires a face that matches ongoing spot checks.
- **AI-assisted** (a real human using AI to draft better encouragement messages) is —
  honest opinion — *not worth fighting hard*. If the buddy shows up, the partner hits
  their goals, and the partner rates them 5 stars knowing exactly what they experienced,
  the product delivered. Ban impersonation/automation in ToS, require disclosure for
  fully-automated features you might ship yourself later, and let outcome ratings sort
  the rest. Fighting AI-assisted warmth is unwinnable and pointless; fighting AI-operated
  fraud is winnable and essential.
- Structural nudges that favor real humans anyway: voice notes and occasional live
  "sync check-ins" (both online simultaneously) are prominent in the super-buddy tier —
  cheap for a genuine human, expensive to fake continuously.
- Random **liveness spot-checks** for active super buddies (selfie-match against the
  KYC/video-screen identity, ~monthly, 30 seconds).

### Layer 4 — Money-flow safeguards (Phase 3)
- Subscriber payments **escrow monthly**; payout releases only if the subscriber's
  check-in engagement stayed above a floor OR the subscriber actively confirms value.
- Refund-friendly policy funded by holding a percentage in reserve; ghost complaints
  fast-track investigation.
- Super-buddy status is **maintained, not owned**: rolling 90-day window on the
  qualification metrics; decay below the bar → probation → demotion. No lifetime badge
  to farm once and coast on.

---

## 9. Safety, Trust & Ethics (non-negotiable, and cheap if done early)

- Block/report in every conversation surface from day one; paired strangers = dating-app
  levels of moderation duty. Photo check-ins pass through automated content moderation.
- Minimum age 16+ (or 18+ to simplify; decide before launch, not after).
- Goals can touch mental health, weight, money → prominent "we're buddies, not
  professionals" framing, crisis-resource interception on self-harm-adjacent keywords,
  and super buddies explicitly barred from presenting as therapists/financial advisors.
- Privacy: check-in data is intimate behavioral data. Don't sell it, say so loudly, and
  make the scrapbook exportable (it's *theirs* — and exportability builds the trust that
  makes people invest in it).
- Dark-pattern line: streak-loss anxiety and buddy-visibility pressure are acceptable
  *because they serve the user's own stated goal*. Guilt-tripping notifications, fake
  urgency, and pay-to-restore-streak are not. (Streak freezes are earned, never sold —
  selling them converts your core motivation currency into a cynicism generator.)

---

## 10. Roadmap

### Phase 1 — The Pair (MVP, ~3 months of focused work)
The free product that everything else depends on.
- Onboarding: goal + implementation intention + check-in window; provisional matching.
- The pair page, check-in flow, stamp animation + sound, pair & individual streaks,
  streak freezes, milestone stamps.
- Push notifications (buddy-aware copy), nudges, reactions, basic chat.
- Rematching flow + inactive-buddy auto-rescue.
- Ratings collection at boundaries (silently building the dataset Phase 3 needs).
- Block/report, content moderation, phone verification.
- **Success metric: D30 retention of *paired* users, and % of pairs reaching a 14-day
  pair streak.** If pairs that survive 2 weeks retain massively better than solo apps
  (they should), the thesis is proven.

### Phase 2 — Depth & First Revenue (~2–3 months)
- Weekly pair challenges, pair-vs-pair leagues, micro-games.
- Scrapbook history/export, photo check-ins with polaroid frames, voice notes.
- **Premium subscription** (cosmetics: sticker packs, page themes, custom stamps; plus
  multi-goal support and advanced stats). Cosmetics monetize the scrapbook investment
  without paywalling motivation.
- **Commitment stakes pilot** (optional): pledge $X against your weekly challenge;
  failures fund the reward pool / a charity. Tests money-psychology with 5% of the
  marketplace's complexity.

### Phase 3 — Super Buddies (only after Phase 1 metrics prove the loop)
- Qualification: rolling-90-day outcome metrics + weighted ratings + tenure + video
  screen + KYC.
- Subscriber tier: pick your super buddy from qualified profiles (their real aggregate
  stats shown, not testimonials).
- Escrowed payments, spot-check liveness, probation/demotion machinery.
- Take rate: ~20–30% platform fee is market-standard for coaching marketplaces.

### Explicitly deferred
- Group buddies (3+); web app; AI-buddy fallback tier; corporate/wellness B2B (real
  money there eventually, but it warps a consumer product if courted early).

---

## 11. Tech Stack (recommendation)

- **App**: React Native + Expo (iOS + Android from one codebase; this product is
  mobile-first — morning check-ins live on phones). **Rive** for the stamp/page
  animations, `expo-av`/native sound for audio, native haptics.
- **Backend**: Supabase (Postgres + realtime + auth with phone verification) or Firebase.
  Realtime matters: seeing your buddy's stamp land *live* is a core delight.
- **Push**: Expo Notifications → APNs/FCM, with server-side scheduling per-user timezone.
- **Matching**: a nightly job + on-demand queue in plain Postgres is entirely sufficient
  until ~50k users. No ML needed for years; the priority-ordered filter in §6 is a query.
- **Payments**: RevenueCat for subscriptions (Phase 2); Stripe Connect Express for
  super-buddy payouts (Phase 3 — it handles KYC/1099s for you).
- **Moderation**: platform-provided image moderation API + keyword rules + report queue.
- **Analytics**: PostHog or Amplitude; define the §10 metrics before writing code.

---

## 12. Open Questions (decisions to make together next)

1. **Name check**: "accountabilibuddy" originates from South Park and is used by several
   existing small products. Worth a trademark search before falling in love — the
   double-L spelling ("accountabillibuddy") may help or may read as a typo.
2. Age floor: 16+ with extra safeguards, or 18+ and simpler?
3. Launch niche: generic "any goal," or launch into ONE vertical (e.g., gym consistency
   or daily writing) where matching density is achievable with a small user base?
   *(My lean: one vertical. Matching quality with 500 users beats matching breadth with
   500 users spread over 40 goal types.)*
4. Commitment stakes in Phase 2: in or out? (My lean: in, as an opt-in pilot.)
5. Identity level between buddies: first names + avatar only, or real profiles?
   (My lean: first name + avatar for free tier; verified fuller profiles for super
   buddies, where trust is the product.)
