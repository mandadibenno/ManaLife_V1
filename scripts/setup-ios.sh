#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo '[ManaLife] iOS project setup (requires macOS and Xcode 26+)'
npm install @capacitor/core@8 @capacitor/ios@8
npm install -D @capacitor/cli@8
node scripts/build-mobile.mjs
if [ ! -d ios/App ]; then
  npx cap add ios
fi
npx cap sync ios
printf '
Ready: npx cap open ios
'
printf 'To distribute with TestFlight, sign/archive/upload with your Apple Developer team in Xcode.
'
