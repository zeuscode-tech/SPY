# SPY — Шпион

Offline party game for Android (Capacitor) and web (Next.js).

## Stack
Next.js 15, React 18, TypeScript, Tailwind CSS, Framer Motion, Capacitor Android.

## Development
```bash
npm ci
npm run dev
npm run type-check
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
