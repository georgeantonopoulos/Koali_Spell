# Koali Spell Hosted MVP

Koali Spell is now structured as a static web app that can be hosted for free on Cloudflare Pages while using Firebase Authentication and Cloud Firestore for parent accounts and saved child profiles.

## Project structure

- `index.html` - app shell and game DOM
- `src/styles.css` - extracted UI and gameplay styles
- `src/app.js` - gameplay logic, auth flow, dashboard, and profile editor
- `src/firebase-config.js` - Firebase web config placeholder
- `src/firebase.js` - Firebase app/auth/firestore bootstrap
- `src/store.js` - cloud data access and local cache helpers
- `firestore.rules` - Firestore security rules for households and child profiles

## Local setup

1. Create a Firebase project.
2. Enable `Authentication` with `Email/Password`.
3. Enable `Cloud Firestore` in production mode.
4. Replace the placeholder values in `src/firebase-config.js` with your Firebase web config.
5. Add your local dev URL and Cloudflare Pages domain to Firebase Auth `Authorized domains`.
6. Open `index.html` through a static server.

Example local server:

```bash
python3 -m http.server 4173
```

Then visit [http://localhost:4173](http://localhost:4173).

## Firebase setup

### Authentication

- Provider: `Email/Password`
- Recommended for v1: disable email-link auth and social sign-in until needed

### Firestore

Apply the rules from [`firestore.rules`](/Users/georgeantonopoulos/Dev/Koali_Spell/firestore.rules).

Data model:

- `users/{uid}`
- `households/{uid}`
- `households/{uid}/children/{childId}`
- `households/{uid}/children/{childId}/words/{wordId}`

## Cloudflare Pages deployment

1. Push the repository to GitHub.
2. Create a new Cloudflare Pages project connected to the repo.
3. Use these settings:
   - Build command: none
   - Build output directory: `/`
   - Production branch: `main`
4. Deploy once to get the Pages domain.
5. Add that Pages domain to Firebase Auth `Authorized domains`.
6. After production is stable, attach the custom domain in Cloudflare.

## Notes

- Firebase web config is public and belongs in the client.
- Security comes from Firebase Auth and Firestore rules, not from hiding client config.
- Legacy `localStorage` profiles are offered for one-time import when a new household signs in on a device that already has local Koali/Bear data.
