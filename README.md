# Avenue Luxury Properties

Avenue is a modern, high-performance luxury real estate portal for architectural residences, signature projects, properties for sale, and rental leases in Pakistan (Lahore, Karachi, Islamabad, Rawalpindi).

## Firebase Authentication Setup Instructions

This application integrates real Firebase Authentication (Spark free tier) with Google Sign-In and Email/Password verification.

### 1. Enable Authentication Providers in Firebase Console
1. Open the [Firebase Console](https://console.firebase.google.com/) for project `gen-lang-client-0156310830`.
2. Navigate to **Authentication** > **Sign-in method**.
3. Enable the **Google** provider (select support email and save).
4. Enable the **Email/Password** provider (Email link passwordless can remain optional).

### 2. Add Authorized Domains
1. In Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**.
2. Add your deployment or custom domain (e.g. `*.run.app` or custom domain).
3. The default Firebase staging domain (`gen-lang-client-0156310830.firebaseapp.com`) is already configured.
4. *Fallback Note*: If running inside an iframe where popups are blocked or the preview domain is not yet authorized in Firebase Console, the app automatically offers an authentic Pakistani demo account chooser so you can test all features without interruption.

### 3. Architecture & Security
- **No passwords in localStorage**: All authentication states and sessions are securely managed via Firebase Auth SDK tokens (`onAuthStateChanged` and `signOut`).
- **Standard Google Branding**: Standard Google "G" logo button with white pill, dark typography, and inline SVG.
- **Email Verification Flow**: Signups send email verification (`sendEmailVerification`) and feature a 60-second cooldown timer with real-time verification checks.
- **Privacy & Decoupled Phone**: Phone numbers are completely removed from signup requirements. A verified client may optionally provide a Pakistani phone number (`03XX XXXXXXX` or `+923XXXXXXXXX`) in their private profile.
- **Lead Capture Forms**: Lead forms (Book Site Visit, Consultation, Contact) maintain direct phone fields for concierge follow-ups.
