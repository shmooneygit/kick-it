# Fight Timer

A dual-mode interval training timer for boxing and fitness workouts, built with React Native and Expo. Targets iOS, Android, and Web. Dark-themed neon UI with background audio support, achievements, statistics, and bilingual localization (English / Ukrainian).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Timer Engine](#timer-engine)
- [Audio System](#audio-system)
- [Achievements & Progression](#achievements--progression)
- [Localization](#localization)
- [Theme & Design](#theme--design)
- [Getting Started](#getting-started)
- [Background Audio Note](#background-audio-note)
- [Verification Checklist](#verification-checklist)

---

## Features

### Boxing Mode

Alternates between timed work rounds and rest periods. Designed for classic boxing round training.

- **Built-in presets**: Classic (3×3min), Sparring (5×2min), Rocky (15×3min), Warm-up (6×1min)
- Customizable rounds (1–50), work duration (15s–15min), rest duration (5s–5min)
- 10-second warning sound before the end of each round (plays 2× beep)
- Final 3-second countdown ticks (one beep per second)
- Fixed bell sound scheme

### Tabata Mode

Short, high-intensity intervals following the Tabata protocol.

- **Built-in presets**: Classic (8×20s/10s), Beginner (8×30s/15s), Advanced (10×40s/20s), Endurance (12×20s/10s)
- Customizable rounds (1–30), work (10–120s), rest (5–60s)
- Selectable sound scheme: bell, beep, or whistle
- Last interval highlighted in amber with a 3× warning beep pattern

### Shared Features

- **Countdown timer**: Configurable 5–30 seconds before each workout starts
- **Duration targeting**: Set an approximate workout duration (5–60 min) and rounds are calculated automatically
- **User presets**: Create and save unlimited custom presets per mode (stored locally)
- **Pause / Resume**: Timer pauses with a blinking UI indicator; resume resets the drift reference
- **Stop with confirmation**: Tapping stop triggers a confirmation dialog before ending the workout
- **Haptic feedback**: Light impact on UI interactions, success notification on phase transitions; globally toggleable
- **Keep screen awake**: Screen stays on during active workouts
- **Background audio**: Timer continues running when the phone is locked or the app is backgrounded
- **Recent workouts**: Last 3 workouts shown on the home screen; tap to repeat a configuration
- **Post-workout results screen**: Shows completed rounds, total duration, and any newly unlocked achievements

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Framework | Expo | 54.0 |
| UI | React Native | 0.81 |
| Language | TypeScript | 5.9 |
| Routing | Expo Router (file-based, tab navigation) | 6.0 |
| State management | Zustand | 5.0 |
| Animations | React Native Reanimated | 4.1 |
| Audio | expo-av | 16.0 |
| Haptics | expo-haptics | 15.0 |
| Storage | @react-native-async-storage | 2.2 |
| Gradients | expo-linear-gradient | 15.0 |
| i18n | i18n-js | 4.5 |
| Fonts | Orbitron, Bebas Neue, Exo 2 (Google Fonts via Expo) | — |
| Linting | ESLint + expo-lint | 9.25 |

Platform configuration: portrait-only orientation, dark UI style, iOS background audio mode enabled (`UIBackgroundModes: ["audio"]`), Android edge-to-edge enabled.

---

## Project Structure

```
boxing-timer/
├── app/                            # Expo Router screens
│   ├── _layout.tsx                 # Root layout: font loading, store initialization
│   ├── timer.tsx                   # Active timer screen (main workout UI)
│   ├── result.tsx                  # Post-workout results & new achievements
│   ├── (tabs)/                     # Bottom tab navigation (4 tabs)
│   │   ├── _layout.tsx             # Tab bar configuration
│   │   ├── index.tsx               # Home: mode selection cards + recent workouts
│   │   ├── stats.tsx               # Workout history & cumulative statistics
│   │   ├── achievements.tsx        # Badges, level, streak display
│   │   └── settings.tsx            # Language, sound, vibration, countdown prefs
│   ├── boxing/
│   │   └── config.tsx              # Boxing preset picker & custom configuration
│   └── tabata/
│       └── config.tsx              # Tabata preset picker & custom configuration
│
├── components/                     # Reusable UI components
│   ├── timer-display.tsx           # Countdown number with animated pulse/scale
│   ├── control-buttons.tsx         # Play, Pause, Stop with animated borders & glow
│   ├── settings-form.tsx           # Config form: rounds, durations, presets, sounds
│   ├── mode-card.tsx               # Home screen mode card (gradient, spring animation)
│   ├── number-stepper.tsx          # +/− stepper with hold-to-accelerate (300ms→80ms)
│   ├── duration-stepper.tsx        # MM:SS time stepper wrapping NumberStepper
│   ├── neon-button.tsx             # Primary action button with neon glow
│   ├── sound-picker.tsx            # Bottom-sheet sound scheme selector
│   └── error-boundary.tsx          # Root-level React error boundary with restart
│
├── hooks/                          # Custom React hooks
│   ├── use-timer.ts                # Core timer logic: countdown, phases, drift correction
│   ├── use-sound.ts                # Sound playback, pattern queuing, keep-alive loop
│   └── use-presets.ts              # CRUD for user-created presets (AsyncStorage)
│
├── store/                          # Zustand state stores
│   ├── settings-store.ts           # Language, sound scheme, vibration, countdown
│   ├── workout-store.ts            # Current workout config & live timer state
│   ├── history-store.ts            # Workout history log & cumulative stats
│   └── achievement-store.ts        # Badge states & unlock progress
│
├── lib/                            # Business logic & utilities
│   ├── types.ts                    # TypeScript interfaces (WorkoutConfig, TimerState, etc.)
│   ├── presets.ts                  # Built-in preset definitions (4 boxing, 4 tabata)
│   ├── sounds.ts                   # Sound asset mapping (bell, beep, silence)
│   ├── badges.ts                   # Badge definitions & unlock conditions
│   ├── levels.ts                   # Level progression thresholds
│   ├── format.ts                   # Time and text formatting helpers
│   ├── haptics.ts                  # Vibration feedback wrappers
│   ├── session-result.ts           # Post-workout result calculations
│   └── i18n.ts                     # i18n-js configuration & locale detection
│
├── constants/
│   └── theme.ts                    # Design tokens: colors, spacing, fonts, glow
│
├── locales/                        # Translation files
│   ├── en.json                     # English UI strings
│   └── uk.json                     # Ukrainian UI strings
│
├── assets/
│   ├── sounds/
│   │   ├── bell1.wav               # Bell sound (~0.5s)
│   │   ├── beep1.wav               # Beep sound (~0.3s)
│   │   └── keepalive/
│   │       └── silence.wav         # Silent audio for background keep-alive
│   └── images/                     # App icons, splash screen, favicon
│
├── app.json                        # Expo project configuration
├── package.json                    # Dependencies & scripts
└── tsconfig.json                   # TypeScript configuration
```

---

## Architecture

### State Management

The app uses **Zustand** with four independent stores. Three persist to AsyncStorage; one is in-memory only.

#### 1. Settings Store (`store/settings-store.ts`)

Persists to AsyncStorage key `app_settings`. Loaded on app startup in `_layout.tsx`.

| Field | Type | Default | Notes |
|---|---|---|---|
| `language` | `'uk' \| 'en'` | Auto-detected | Device locale; falls back to English |
| `soundScheme` | `'bell' \| 'beep' \| 'whistle'` | `'bell'` | |
| `vibrationEnabled` | `boolean` | `true` | Global haptic toggle |
| `defaultCountdown` | `number` | `5` | 5–30s, in 5s steps |

#### 2. Workout Store (`store/workout-store.ts`)

**In-memory only** — resets when the app closes. Holds the current workout configuration and live timer state.

- Workout config: mode, rounds, work/rest durations, sound scheme, countdown
- Timer state: `phase` (`countdown | work | rest | finished`), `currentRound`, `totalRounds`, `secondsRemaining`, `totalElapsedSeconds`, `isPaused`, `isRunning`
- Active preset ID (for tracking which preset is in use)
- Last session result (for the results screen)
- Config sanitization: all values are validated and clamped before state updates

#### 3. History Store (`store/history-store.ts`)

Persists to AsyncStorage keys `workout_history` and `user_stats`.

- Stores up to **500 workout records** (auto-truncates oldest entries)
- Tracks cumulative stats: total workouts, total rounds, total duration
- Calculates **streak** (consecutive days with at least one workout) using drift-corrected date logic
- Updated after every completed workout

#### 4. Achievement Store (`store/achievement-store.ts`)

Persists to AsyncStorage key `badge_states`.

- Tracks progress and unlock state for all 19 badges
- `checkAndUnlockBadges()` runs after every workout completion
- Coordinates with History Store data for milestone-based badges

### Data Flow

1. User interacts with UI → component calls a store action
2. Store validates and transforms the data → updates state
3. State persisted to AsyncStorage (async, non-blocking) where applicable
4. Components re-render via Zustand hook subscriptions
5. Cross-store coordination: completing a workout triggers Workout Store → History Store → Achievement Store

---

## Timer Engine

The core timer logic lives in `hooks/use-timer.ts`.

### Phase Transitions

```
Countdown (5–30s)
    ↓ onPhaseChange('work')
Work (15s – 15min)
    ↓ onPhaseChange('rest')  OR  onFinish (if last round)
Rest (5s – 5min)
    ↓ onPhaseChange('work') + increment round
    ... repeat until final rest ends → Finished
```

### Timing Mechanism

Uses a **chained setTimeout** approach (not setInterval) with drift correction:

```
expected += 1000
drift = Date.now() - expected
nextDelay = Math.max(0, 1000 - drift)
```

This keeps precision within ±1–3 seconds over long workouts.

### Callbacks

| Callback | Fires when | Triggers |
|---|---|---|
| `onPhaseChange(phase, round)` | Phase transition | Sound playback, haptic feedback |
| `onTick(secondsRemaining, phase, round)` | Every second | Final 3s tick sounds, 10s boxing warning |
| `onFinish()` | Workout complete | Finish sound, stop keep-alive |

### Background Handling

When the app returns from the background, the timer calculates total elapsed time since it was backgrounded and fast-forwards through any missed phase transitions. Total elapsed time is capped to the planned workout duration to prevent inflation.

### Pause / Resume

- **Pause**: Stops the setTimeout chain, sets `isPaused: true`. UI blinks (opacity 0.3 ↔ 1.0).
- **Resume**: Resets the reference timestamp and restarts the setTimeout chain.

### Example Workout Flow (Boxing: 2 rounds × 1min work, 30s rest, 5s countdown)

```
t=0s   → phase=countdown, seconds=5
t=5s   → phase=work, seconds=60          → bell sound
t=55s  → phase=work, seconds=10          → warning (2× beep)
t=62-64s → phase=work, seconds=3,2,1     → tick sounds
t=65s  → phase=rest, seconds=30, round=1 → bell + haptic
t=95s  → phase=work, seconds=60, round=2 → bell
t=155s → phase=finished                  → finish sound
```

---

## Audio System

Implemented in `hooks/use-sound.ts` and `lib/sounds.ts`.

### Sound Schemes

| Scheme | Asset | Default for |
|---|---|---|
| `bell` | `assets/sounds/bell1.wav` | Boxing |
| `beep` | `assets/sounds/beep1.wav` | Tabata |
| `whistle` | (uses beep asset) | — |

### Sound Events & Patterns

| Event | When | Pattern |
|---|---|---|
| `round` | Work phase starts | 1 sound |
| `rest` | Rest phase starts | 2 sounds (150ms spacing) |
| `warning` | 10s before round end (boxing) | 2 sounds |
| `tick` | Final 3, 2, 1 seconds | 1 sound per second |
| `finish` | Workout complete | Finish sound |
| Tabata last interval | Last work interval starts | 3 sounds (warning) |

Sounds are preloaded on app startup (bell and beep assets).

### Background Keep-Alive

A silent audio file (`assets/keepalive/silence.wav`) plays in a continuous loop at 0.01× volume during active workouts. This keeps the iOS audio session alive so the app isn't suspended when locked or backgrounded.

### Platform Audio Configuration

```
iOS:    playsInSilentMode=true, interruptionMode=MixWithOthers
Android: shouldDuckAndroid=false, interruptionMode=DuckOthers
Both:   staysActiveInBackground=true
```

This means workout sounds will **mix over** any playing music on iOS and duck on Android.

---

## Achievements & Progression

### Badges (`lib/badges.ts`)

19 badges unlock based on cumulative stats and specific conditions:

| Badge | Condition |
|---|---|
| First Workout | Complete 1 workout |
| 10 Workouts | Complete 10 total |
| 50 Workouts | Complete 50 total |
| 100 Rounds | Accumulate 100 rounds |
| 500 Rounds | Accumulate 500 rounds |
| 1000 Rounds | Accumulate 1000 rounds |
| 3-Day Streak | 3 consecutive days |
| 7-Day Streak | 7 consecutive days |
| 30-Day Streak | 30 consecutive days |
| Early Bird | Workout before 7 AM |
| Night Fighter | Workout after 10 PM |
| Marathon | Single workout > 45 minutes |
| Rocky | Complete the Rocky preset in full |
| Tabata Fan | 20 tabata workouts |
| Boxing Fan | 20 boxing workouts |
| + 4 additional badges | Various milestone conditions |

Badges are checked after every workout via `checkAndUnlockBadges()` in the Achievement Store.

### Level System (`lib/levels.ts`)

Levels are based on **total rounds completed**:

| Level | Rounds Required |
|---|---|
| Rookie | 0–49 |
| Amateur | 50–299 |
| Fighter | 300–999 |
| Champion | 1,000–4,999 |
| Legend | 5,000+ |

### Streak Tracking

Streaks count consecutive calendar days with at least one completed workout. The History Store calculates this using date-based logic with drift correction for timezone edge cases.

---

## Localization

The app supports **English** and **Ukrainian** via i18n-js (`lib/i18n.ts`).

- **Auto-detection**: On first launch, the device locale is checked via `expo-localization`. If Ukrainian is detected, `uk` is set; otherwise falls back to `en`.
- **Manual switching**: Users can change language in the Settings tab. The choice persists in the Settings Store.
- **Translation files**: `locales/en.json` and `locales/uk.json` contain all UI strings.
- **User presets**: Saved with bilingual names (both `uk` and `en` fields).

---

## Theme & Design

Defined in `constants/theme.ts`. The app uses a **dark-only** neon aesthetic.

### Color Palette

| Role | Color | Hex |
|---|---|---|
| Primary | Cyan | `#00F5FF` |
| Work phase | Neon Green | `#39FF14` |
| Rest phase / Danger | Pink | `#FF006E` |
| Countdown / Last interval | Amber | `#FFB800` |
| Achievements | Purple | `#B24BF3` |
| Background | Dark Navy | `#0A0A0F` |
| Surface | Dark | `#12121C` |
| Surface (lighter) | | `#1A1A2E` |

### Fonts

| Use | Font | Style |
|---|---|---|
| Headings | Orbitron | Futuristic, uppercase |
| Timer display | Bebas Neue | Bold, 120pt |
| Body text | Exo 2 | Regular (400), SemiBold (600), Bold (700) |

### Animations (React Native Reanimated)

- **Timer pulse**: Scale animation on the countdown number during the final 10 seconds
- **Phase color transitions**: Smooth color interpolation between phases
- **Button press**: Spring scale (0.96–1.0) on tap
- **Pause glow**: Pulsing shadow opacity while paused
- **Progress bars**: Animated width fill (300ms timing)
- **Mode cards**: FadeInUp entrance with staggered delays (100ms, 250ms)

### Spacing & Radii

- Spacing scale: 4, 8, 12, 16, 24, 32 px
- Border radii: 8, 12, 14, 16, 20 (pill) px

---

## Getting Started

### Prerequisites

- Node.js
- Expo CLI (`npx expo`)
- For iOS testing: Xcode (development build required for background audio)
- For Android testing: Android Studio or a physical device

### Installation

1. Install dependencies

   ```bash
   npm install
   ```

2. Use a development build for background-audio testing

   ```bash
   npx expo run:ios
   ```

   Or build one with EAS:

   ```bash
   eas build --profile development --platform ios
   ```

3. Start the dev server for the development build

   ```bash
   npx expo start --dev-client
   ```

> **Note:** Background timer audio does not work reliably in Expo Go. Use a development build or production build when testing locked-screen or background round bells.

---

## Background Audio Note

The app keeps the audio session alive during workouts with a bundled silent loop at `assets/keepalive/silence.wav`.

If you specifically want the keepalive asset as `assets/sounds/silence.mp3`, generate it manually with:

```bash
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame assets/sounds/silence.mp3
```

Then update the keepalive asset reference in `hooks/use-sound.ts` if you want to switch from WAV to MP3.

---

## Verification Checklist

- Start a workout, lock the phone, and wait for a round transition in a development build.
- Start music in Spotify or Apple Music, then start a workout and confirm bells mix over the music.
- End the workout and confirm the silent keepalive track stops immediately.

---

## Links

- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Router docs](https://docs.expo.dev/router/introduction/)
