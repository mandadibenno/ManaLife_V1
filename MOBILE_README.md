> **ManaLife 2.0 note:** the steps below still apply. `npm run build:mobile` is now a shortcut for `node scripts/build-mobile.mjs`. The new app bundles its fonts, so native builds render correctly offline.

# ManaLife — Android APK + iOS/TestFlight Preparation

This is a **drop-in native build kit** for the **existing** `ManaLife_V1` GitHub/Windows project. It does NOT include an APK or a signed TestFlight IPA: those must be compiled. It does not replace your source, Supabase schema, or domain setup.

## Status / What's included

- `capacitor.config.json`: native app identity `in.pramodbenno.manalife`, app name ManaLife, bundles `dist/` (not a remote site iframe).
- `vite.config.js`: keeps the website's `base: '/'` and PWA intact; switches off PWA service worker only for native bundle builds.
- `scripts/build-mobile.mjs`: a portable build command for Android/iOS web assets.
- `scripts/setup-android.cmd`: Android Studio project creation on your Windows PC.
- `scripts/setup-ios.sh`: iOS project creation on a Mac with Xcode.
- `.github/workflows/manalife-android-apk.yml`: builds a downloadable **Android debug APK** in GitHub Actions.
- `.github/workflows/manalife-ios-xcode.yml`: generates an **unsigned iOS Xcode project**, not an IPA, through GitHub Actions on macOS.

## 1. Add files to your existing Windows project

Your existing project (the one already connected to Supabase, GitHub Pages, and your domain):

`C:\Users\Pmand\Desktop\Projects\ManaLife_V1`

1. Extract the kit ZIP. Open the `ManaLife_Mobile_Kit` folder.
2. Copy its `capacitor.config.json`, `vite.config.js`, `scripts` folder, and `.github` folder into **your existing** `ManaLife_V1` folder. When Windows offers to merge `.github` folders, merge; do not delete your existing `deploy.yml`.
3. Allow `vite.config.js` to replace the old file (the change is intentional: web PWA stays enabled, native bundle does not register a service worker).
4. **Never upload `.env.local`**, your Supabase database password, or any `sb_secret_`/service-role key to GitHub. You already have GitHub Actions Variables for the **project URL** and **publishable key** from the Pages setup.
5. Inspect your changes using `git status` before committing.

## 2. Android test APK from GitHub (easiest, even without Android Studio)

From Windows CMD in `ManaLife_V1`:

```cmd
git add capacitor.config.json vite.config.js scripts .github/workflows/manalife-android-apk.yml .github/workflows/manalife-ios-xcode.yml
git commit -m "Add ManaLife Android and iOS native build workflows"
git push origin main
```

Then visit:

`https://github.com/mandadibenno/ManaLife_V1/actions`

- Choose **ManaLife Android APK (test)** on the left.
- Click **Run workflow** -> `main` -> **Run workflow**.
- Open the completed run. Under **Artifacts**, download `ManaLife-Android-debug-APK`.
- Unzip it, and transfer `app-debug.apk` to your Android phone.
- Tap the APK and allow installation from that trusted source if Android asks.
- Sign in with your ManaLife owner account. This is a **test/debug APK**, not a Play Store release or a production-signed APK. The debug signing certificate can differ between builds; you may need to uninstall a previous debug build before installing a new one.

### If Android GitHub Action fails

- `npm ci`: your existing GitHub repository must contain `package-lock.json` (it does based on the earlier repository). Fix lockfile mismatch on Windows with `npm install`, then commit `package-lock.json`.
- Missing env: go to **GitHub -> Settings -> Secrets and variables -> Actions -> Variables** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Both are frontend-safe public values. DO NOT add privileged keys.
- Gradle/SDK: open the failed job log; the generated native Gradle project may require newer build tools. Android Studio can run the project locally as fallback.
- Debug APK will be available only after a successful GitHub build (not included in this ZIP).

## 3. Android project locally (optional)

Install current Node.js 22+ and **Android Studio 2025.2.1+** on Windows, with its SDK. Open CMD in `ManaLife_V1`:

```cmd
scripts\setup-android.cmd
npx cap open android
```

In Android Studio wait for Gradle sync. Go to **Build -> Build Bundle(s) / APK(s) -> Build APK(s)** or run Gradle `assembleDebug`. Expected file:

`android\app\build\outputs\apk\debug\app-debug.apk`

If you modify React source after this, run:

```cmd
node scripts\build-mobile.mjs
npx cap sync android
```

Then rebuild. These are not background reminder notifications; V1 notifications are not implemented.

## 4. iPhone / TestFlight — what is possible

TestFlight accepts an **iOS app build** uploaded to App Store Connect, *not* an Android APK. This kit prepares the same ManaLife React UI for iOS.

**Without a Mac:** In GitHub -> Actions -> **ManaLife iOS Xcode project (source only)** -> **Run workflow**, you can download `ManaLife-iOS-Xcode-Project-UNSIGNED`. This is the native iOS project source, NOT an installable IPA. GitHub-hosted macOS Actions may consume billed CI minutes.

**To actually upload to TestFlight** you need:

1. Active **Apple Developer Program** membership (normally **US$99/year**; local pricing/taxes may vary).
2. Access to **macOS + Xcode 26+** (your Mac or a correctly configured macOS cloud build/signing provider).
3. Apple App Store Connect app record & registered Bundle ID (`in.pramodbenno.manalife`, unless you change it everywhere first).
4. An Apple development team and distribution signing/certificates/provisioning; let Xcode manage signing when possible.
5. In Xcode open the generated iOS project (`npx cap open ios` on a Mac with this kit and Capacitor installed), choose the Apple Team under **Signing & Capabilities**, check Bundle Identifier and app icons, then **Product -> Archive -> Distribute App -> App Store Connect -> Upload**.
6. After Apple processes the build, App Store Connect -> **TestFlight** -> add testers. Your wife's invitation as an **external** tester may require Apple's beta app review; internal testers generally need App Store Connect access.

Mac setup (in original ManaLife repo):

```bash
bash scripts/setup-ios.sh
npx cap open ios
```

**This kit does not generate a signed IPA or submit to TestFlight**. Those require your Apple signing credentials and an actual build/upload environment. Do not put Apple certificates/passwords into this ZIP or public GitHub.

## 5. Supabase email confirmation and household security

- Native APK/iOS apps use your **same Supabase database**, so authorized users see the same shared household tasks, groceries, bills and calendar. RLS stays enforced by the database.
- For email/password signup, Supabase confirmation links may lead to the configured **public web site** (`https://app.pramodbenno.in`), not directly to the native app. After confirming in the browser, return to the native app and sign in. Native deep-link handling is a separate feature; not included here.
- An account is NOT household membership; only the allowlisted owner or email-verified invited partner can join. Do not test using unapproved addresses.
- V1 requires internet for shared data. PWA installability or an APK does not add offline editing, push notifications, or background automation.

## 6. Important follow-up testing

- Android device: launch -> sign-in -> create task -> close/reopen -> task still exists.
- Wife account: invite -> email confirm -> join code -> sees same task.
- Android and website: task sync by visiting/foregrounding app (V1 polls while open).
- Logout and login again, check session and loading.
- Verify no private/unauthorized household data shows for a third test account.
- iOS TestFlight: repeat all tests; check app icon, back navigation, keyboard and safe-area layout.

## Official references

- Capacitor setup: https://capacitorjs.com/docs/getting-started
- Capacitor Android: https://capacitorjs.com/docs/android
- Capacitor environment: https://capacitorjs.com/docs/getting-started/environment-setup
- Apple TestFlight: https://developer.apple.com/testflight/
- Apple upload: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
