import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DEMO_FIREBASE_PROJECT_ID = 'gen-lang-client-0156310830';
const DEMO_ADMIN_EMAIL = 'abdullah.lenovot470s@gmail.com';

const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function readAdminEmail() {
  try {
    const brandConfigPath = path.join(ROOT_DIR, 'src', 'config', 'brand.config.ts');
    const source = stripComments(fs.readFileSync(brandConfigPath, 'utf8'));
    const match = source.match(/managementGoogleEmail\s*:\s*['"]([^'"]+)['"]/);
    return match?.[1]?.trim() || '(not configured)';
  } catch {
    return '(unreadable)';
  }
}

function readFirebaseProjectId() {
  try {
    const configPath = path.join(ROOT_DIR, 'firebase-applet-config.json');
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return String(parsed?.projectId || '').trim() || '(not configured)';
  } catch {
    return '(missing firebase-applet-config.json)';
  }
}

function resolveBackendMode() {
  return String(process.env.VITE_BACKEND_MODE || 'static').trim().toLowerCase() === 'server'
    ? 'server'
    : 'static';
}

function resolveTier() {
  const raw = String(process.env.VITE_TIER || '').trim().toLowerCase();
  if (raw === 'plot' || raw === 'villa' || raw === 'estate') {
    return raw;
  }
  return raw ? `${raw} (unrecognized, using default estate preset)` : 'default (estate preset)';
}

function main() {
  const adminEmail = readAdminEmail();
  const firebaseProjectId = readFirebaseProjectId();
  const backendMode = resolveBackendMode();
  const tier = resolveTier();
  const appCheckConfigured = Boolean(String(process.env.VITE_RECAPTCHA_SITE_KEY || '').trim());
  const strictSetup = String(process.env.STRICT_SETUP || '').trim().toLowerCase() === 'true';

  console.log('');
  console.log('=== Project Setup Summary ===');
  console.log(`Admin Email         : ${adminEmail}`);
  console.log(`Firebase Project ID : ${firebaseProjectId}`);
  console.log(`Backend Mode        : ${backendMode}`);
  console.log(`Tier                : ${tier}`);
  console.log(
    `App Check           : ${
      appCheckConfigured
        ? 'enabled (VITE_RECAPTCHA_SITE_KEY is set)'
        : 'not set (VITE_RECAPTCHA_SITE_KEY is empty)'
    }`
  );
  console.log('=============================');

  const warnings = [];
  if (firebaseProjectId === DEMO_FIREBASE_PROJECT_ID) {
    warnings.push(
      `Firebase project ID in firebase-applet-config.json is still "${DEMO_FIREBASE_PROJECT_ID}" (master demo project).`
    );
  }
  if (adminEmail.toLowerCase() === DEMO_ADMIN_EMAIL) {
    warnings.push(
      `Admin email (managementGoogleEmail) in src/config/brand.config.ts is still "${DEMO_ADMIN_EMAIL}" (master demo admin).`
    );
  }

  if (warnings.length > 0) {
    console.warn('');
    console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.warn('WARNING: This build still uses the DEMO Firebase project / admin email. Replace them before delivering to a client.');
    for (const msg of warnings) {
      console.warn(`  - ${msg}`);
    }
    console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.warn('');

    if (strictSetup) {
      console.error('STRICT_SETUP=true: Failing build due to master demo configuration.');
      process.exit(1);
    }
  }
}

main();
