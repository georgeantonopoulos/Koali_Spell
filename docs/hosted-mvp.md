# Hosted MVP Notes

## What changed

- The app now uses a parent account and household model instead of the old two-profile local picker.
- Child profiles are stored in Firestore and can be edited from the in-app profile editor.
- The original gameplay loop stays client-side and runs from the selected child profile.
- Existing browser-only `koali_*` and `bear_*` local data can be imported into the first cloud-backed household.

## Ops checklist

- Create Firebase project
- Enable Email/Password auth
- Enable Firestore
- Publish Firestore rules
- Update `src/firebase-config.js`
- Add Cloudflare Pages domain to Firebase Auth authorized domains
- Deploy repo to Cloudflare Pages
- Enable Cloudflare Web Analytics

## Current tradeoffs

- Preset avatars, bosses, and themes only
- No image uploads
- No custom backend outside Firebase
- Offline support is lightweight and cache-based, not full Firestore offline persistence

## Good next steps

- Add a dedicated starter-pack selector in the child editor
- Add household rename and child archive flows
- Add a safer inline confirmation UI instead of `window.confirm`
- Add emulator support and a real browser smoke test script
