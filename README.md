# Momento Login/Register (React + Firebase)

This project currently includes:
- Organizer login (email/password)
- Organizer register page
- Admin permission check after login via Firestore

## 1. Install

```bash
npm install
```

## 2. Add Firebase config

```bash
cp .env.example .env
```

Fill these keys in `.env`:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## 3. Firebase setup

1. In Firebase Console, enable **Authentication > Sign-in method > Email/Password**.
2. In Firestore, create/use collection: `users`.
3. On register, the app creates `users/{uid}` with `isAdmin: false`.
4. To grant admin manually, set:
   - Document: `users/{uid}`
   - Field: `isAdmin`
   - Value: `true`

## 4. Run

```bash
npm run dev
```

If a user logs in with `isAdmin: false`, the app signs them out and shows a permission error.
