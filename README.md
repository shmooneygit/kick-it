# Fight Timer

Fight Timer is an Expo Router app for boxing and tabata interval training. It runs fully offline, stores data locally with AsyncStorage, supports English and Ukrainian, and keeps timer audio alive when the app backgrounds.

## What the app does

- `app/(tabs)/index.tsx`: main home screen for choosing `boxing` or `tabata`, editing rounds/work/rest/countdown, loading presets, saving presets, and starting a workout
- `app/timer.tsx`: active workout screen with animated ring, sounds, haptics, pause/stop controls, and background-resume correction
- `app/result.tsx`: workout summary with rounds completed, total time, repeat action, and newly earned badges
- `app/(tabs)/stats.tsx`: weekly/monthly/all-time metrics, activity grid, and recent workout replay
- `app/(tabs)/achievements.tsx`: level progress, streaks, and badge detail modal
- `app/(tabs)/settings.tsx`: sound previews, vibration toggle, default countdown, language switch, preset deletion, app version, and developer contact

## Main modules

- `store/workout-store.ts`: current config, live timer state, last result, remembered last configs, active preset id
- `store/history-store.ts`: workout history plus aggregate totals and streak tracking
- `store/achievement-store.ts`: persisted badge state and unlock checks
- `store/settings-store.ts`: language, vibration, and default countdown
- `hooks/use-timer.ts`: timer loop and background fast-forward logic
- `hooks/use-sound.ts`: bell/beep playback plus silent keepalive audio
- `hooks/use-presets.ts`: AsyncStorage CRUD for user presets
- `lib/`: pure helpers for timer transitions, workout record creation, history math, formatting, badges, presets, and localization

## Development

```bash
npm install
npm run start
```

Other useful commands:

```bash
npm run lint
npm run test
npx tsc --noEmit
```

## Tests

The repo uses a lightweight native Node test setup:

- `tsconfig.tests.json` compiles a small set of pure TypeScript modules into `.test-dist/`
- `npm run test` runs `node --test` against:
  - `tests/timer-transition.test.ts`
  - `tests/workout-record.test.ts`
  - `tests/history-utils.test.ts`
  - `tests/badges.test.ts`

These cover timer phase transitions, saved workout metadata, streak math, and badge logic without introducing a separate browser or React Native test runner.
