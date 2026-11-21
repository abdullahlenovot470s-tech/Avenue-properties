# New client checklist
1. Create a NEW Firebase project for the client (never reuse the demo one).
2. Enable Authentication: Google + Email/Password. Create Firestore and Storage.
3. Replace firebase-applet-config.json with the client's Firebase web config.
4. In src/config/brand.config.ts set: managementGoogleEmail (client's admin
   email), siteUrl, brand name, phones, emails, WhatsApp, social links, images.
5. Run the build once (it syncs the admin email into firestore.rules and
   storage.rules).
6. Paste firestore.rules into Firebase Console > Firestore > Rules > Publish.
7. Paste storage.rules into Firebase Console > Storage > Rules > Publish.
8. Firebase > Authentication > Settings > Authorized domains: add the
   Cloudflare Pages domain and the custom domain. Remove unused ones.
9. Cloudflare Pages > Environment variables: VITE_BACKEND_MODE=static,
   VITE_RECAPTCHA_SITE_KEY, VITE_ENQUIRY_WEBHOOK_URL, VITE_ENQUIRY_KEY,
   VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET.
10. Firebase > App Check: register the web app with reCAPTCHA v3, then
    enforce for Firestore and Storage.
11. Google Cloud Console > APIs & Services > Credentials: restrict the
    browser API key to the client's domains (HTTP referrers).
12. Cloudinary: set the upload preset to images only, with a max file size.
13. Turn on 2-Step Verification on the admin Google account.
14. Test: Google login, email signup, enquiry form, admin /manage, image upload.
