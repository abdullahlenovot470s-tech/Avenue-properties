# Avenue Luxury Properties

Avenue is a full-stack luxury real estate portal for architectural residences, signature projects, properties for sale, and rental leases in Pakistan (Lahore, Karachi, Islamabad, Rawalpindi, and Murree & Hills).

## Environment Variables

Copy `.env.example` to `.env` for local development or configure these variables in your hosting platform's environment settings (never commit real secrets to source control):

### Required for Production & Persistence
- `MANAGEMENT_EMAIL` — Email address allowed to sign in to `/manage` and `/records` (with `MANAGEMENT_PASSWORD` or Google Sign-In).
- `MANAGEMENT_GOOGLE_EMAILS` — Optional comma-separated Google email addresses granted management access when signing in with verified Google OAuth.
- `MANAGEMENT_PASSWORD` — Password for email/password management portal login.
- `MANAGEMENT_TOKEN_SECRET` — Long random string (`openssl rand -hex 32`) used to sign 8-hour management tokens and client session tokens.
- `FIREBASE_SERVICE_ACCOUNT_JSON` (or `GOOGLE_APPLICATION_CREDENTIALS` / `FIREBASE_USE_ADC=true`) — Credentials for Firebase Admin SDK so registered accounts, property catalog edits, and client enquiries persist in Firestore instead of an in-memory fallback.
- `FIRESTORE_DATABASE_ID` — Optional override for the Firestore database ID configured in `firebase-applet-config.json`.

### Server, Email & Enquiry Alerts (Optional / Recommended)
- `PORT` — HTTP port (defaults to `3000`).
- `NODE_ENV` — Set to `production` when serving the built frontend via `npm start`.
- `APP_URL` — Public origin URL (e.g. `https://your-domain.com`) used inside email verification links.
- `EMAIL_FROM`, `RESEND_API_KEY` (or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) — Outbound transactional email delivery for signup verification and password reset codes (falls back to Ethereal test mail when unset).
- `VITE_ENQUIRY_WEBHOOK_URL`, `VITE_ENQUIRY_KEY` — Google Apps Script Web App endpoint and spam-deterrent key used by enquiry forms and as a fallback if the backend is unreachable.

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your local environment file from the template:
   ```bash
   cp .env.example .env
   ```
   Fill in at least `MANAGEMENT_EMAIL`, `MANAGEMENT_PASSWORD`, `MANAGEMENT_TOKEN_SECRET`, and `FIREBASE_SERVICE_ACCOUNT_JSON` (or leave Firestore unset to test with ephemeral in-memory storage).
3. Start the development server (Express API + Vite middleware on port 3000):
   ```bash
   npm run dev
   ```
4. To test the production build locally:
   ```bash
   npm run build
   npm start
   ```

## Deploy to Cloud Run or Render

### Option A: Google Cloud Run
1. Build and deploy from source or a container that exposes port `3000` (or reads `$PORT`):
   - **Build command**: `npm ci && npm run build`
   - **Start command**: `npm start` (runs `NODE_ENV=production tsx server.ts`)
2. Set environment variables in Cloud Run (`MANAGEMENT_EMAIL`, `MANAGEMENT_PASSWORD`, `MANAGEMENT_TOKEN_SECRET`, `APP_URL`, email provider vars, and `VITE_ENQUIRY_*` at build time).
3. For Firestore persistence on Cloud Run in the Firebase project, either provide `FIREBASE_SERVICE_ACCOUNT_JSON` or grant the Cloud Run service account **Cloud Datastore User** + **Firebase Authentication Viewer** roles on project `gen-lang-client-0156310830` and set `FIREBASE_USE_ADC=true`.
4. Add your deployed `https://<service>-<hash>.run.app` domain to Firebase **Authorized domains** (see below).

### Option B: Render (Web Service)
1. Create a **New Web Service** connected to your repository.
2. Configure build and start settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Add all environment variables under **Environment** (make sure `VITE_ENQUIRY_WEBHOOK_URL` and `VITE_ENQUIRY_KEY` are present during the build step because Vite embeds `VITE_*` variables into the frontend bundle).
4. Set `APP_URL` to your `https://<app>.onrender.com` URL and add `<app>.onrender.com` to Firebase **Authorized domains**.

## Firebase Authentication & Authorized Domains

1. Open the [Firebase Console](https://console.firebase.google.com/) for project `gen-lang-client-0156310830`.
2. Navigate to **Authentication** > **Sign-in method** and ensure **Google** and **Email/Password** providers are enabled.
3. Go to **Authentication** > **Settings** > **Authorized domains** and add every domain where the app is hosted (for example `localhost`, your `*.run.app` Cloud Run URL, `*.onrender.com` Render URL, or custom domain). Google Sign-In will fail with `auth/unauthorized-domain` until the active hostname is listed here.

## Setup alerts

1. Create a Google Sheet and open **Extensions > Apps Script** to add your enquiry email alert script (including any scheduled ~8 PM PKT daily digest trigger).
2. Deploy the script as a **Web app** with **Execute as: Me** and **Who has access: Anyone**.
3. Copy the deployed Web app URL into `VITE_ENQUIRY_WEBHOOK_URL` and set your shared key in `VITE_ENQUIRY_KEY` inside `.env` (see `.env.example`), then rebuild the app (`npm run build`).
4. **Security note**: Vite embeds `VITE_*` environment variables directly into the public frontend bundle, so `VITE_ENQUIRY_KEY` only blocks casual spam and is **not** a password or private secret.
