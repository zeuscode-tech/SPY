# SPY — Шпион

Offline party game for Android (Capacitor) and web (Next.js).

## Stack
Next.js 15, React 18, TypeScript, Tailwind CSS, Framer Motion, Capacitor Android.

## Development
```bash
npm ci
npm run dev
npm run type-check
npm test
```

## Android builds (macOS, Linux, Windows)
```bash
npm run build:cap   # static Next.js export into out/
npm run cap:sync    # build + sync into Android
npm run android:apk # debug APK
npm run android:aab # release AAB; requires your private signing configuration
```

A complete Android build additionally requires Android SDK, JDK, and Android build tools.
The release Gradle configuration reads `android/key.properties` (not committed).

## Important before publishing
- **Do not change the application ID** `com.quantumLimited.SPY`; Google Play updates require the same ID.
- Verify the current Google Play versionCode and published source. The Play Console shows a July 2026 release, while this repository's current main commit is from May 2026.
- Increase `versionCode` beyond the currently published value before uploading an update.
- A release keystore was previously committed publicly at `android/app/release-key.keystore`. Removing it from the latest tree **does not remove it from git history**. If it is an active signing/upload key, follow Google Play's official key-reset guidance and secure the replacement outside git.
- Use `npm run type-check` and `npm run build:cap` before making an Android release; an Android device/emulator smoke test is still required.

## Planned monetization
AdMob and Google Play Billing are **not** configured in this codebase yet. Do not enable ads or purchases without checking merchant eligibility, user consent, Play policies, and updating the published privacy policy and Data safety declarations.

## Game
Supports Classic Spy and Different Word, custom words, multiple spies, timer, category packs, reveal cards, and local settings.

## SPY 2.0 UI structure (draft)

All visible game screens are split into focused React components:

| Screen | File |
| --- | --- |
| Round setup | `components/SetupScreen.tsx` |
| Category selection (search / select all / clear) | `components/CategoryScreen.tsx` |
| Private role reveal / safe handoff | `components/RoleRevealScreen.tsx` |
| First player selection (touch arena) | `components/StarterScreen.tsx` |
| Discussion timer, pause, word search, early finish | `components/PlayingScreen.tsx` |
| Player names, custom words, privacy | `components/SettingsScreen.tsx` |
| Round outcome / restart | `components/ResultsScreen.tsx` |

`components/GameComponent.tsx` owns the round state and coordinates the screens. `data/categorySelection.ts` preserves an intentionally empty selection between launches.

### Android smoke checklist before merge

1. Launch application and change players, spies, mode and timer.
2. Search/select/clear category packs; verify empty selection persists after force-close/reopen.
3. Reveal roles for every player in both modes; ensure passing is only possible after re-hiding.
4. Test starting player selection using 2+ touch points; test skip and winner outcome.
5. Test pause/resume/reset/early finish/word search; include background/foreground.
6. Validate results, spy roster, alternate spy word, and immediate replay.
7. Edit names/custom words, restart and confirm persistence; verify offline.
8. Verify Android Back behaviour across screens (known open issue QA-002).
9. Inspect logcat, smaller phone screens and current Play Console signing/versionCode.

**Passing web-build and TypeScript CI does not substitute for Android smoke QA.**
