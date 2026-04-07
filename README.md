# Fight Timer

Boxing and Tabata timer built with Expo Router.

## Get started

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

Background timer audio does not work reliably in Expo Go. Use a development build or production build when testing locked-screen or background round bells.

## Background audio note

The app keeps the audio session alive during workouts with a bundled silent loop at `assets/keepalive/silence.wav`.

If you specifically want the keepalive asset as `assets/sounds/silence.mp3`, generate it manually with:

```bash
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame assets/sounds/silence.mp3
```

Then update the keepalive asset reference in `hooks/use-sound.ts` if you want to switch from WAV to MP3.

## Verification checklist

- Start a workout, lock the phone, and wait for a round transition in a development build.
- Start music in Spotify or Apple Music, then start a workout and confirm bells mix over the music.
- End the workout and confirm the silent keepalive track stops immediately.

## Links

- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Router docs](https://docs.expo.dev/router/introduction/)
