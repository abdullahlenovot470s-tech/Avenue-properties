import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}

function resolveAdminEmail() {
  const fromEnv = String(process.env.MANAGEMENT_GOOGLE_EMAIL || '').trim();
  if (fromEnv) {
    return fromEnv;
  }

  const brandConfigPath = path.join(ROOT_DIR, 'src', 'config', 'brand.config.ts');
  const brandSource = fs.readFileSync(brandConfigPath, 'utf8');
  const match = brandSource.match(/managementGoogleEmail\s*:\s*['"]([^'"]+)['"]/);
  if (!match || !match[1]) {
    throw new Error('Could not find managementGoogleEmail in src/config/brand.config.ts');
  }
  return match[1].trim();
}

function resolveBackendMode() {
  return String(process.env.VITE_BACKEND_MODE || 'static').trim().toLowerCase() === 'server'
    ? 'server'
    : 'static';
}

const adminEmail = resolveAdminEmail();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  throw new Error(`Invalid admin email address: "${adminEmail}"`);
}

const backendMode = resolveBackendMode();
const RULE_FILES = ['firestore.rules', 'storage.rules'];
const EMAIL_PATTERN = /request\.auth\.token\.email == '[^']+'/g;
const EMAIL_REPLACEMENT = `request.auth.token.email == '${adminEmail}'`;

const INQUIRIES_RULE_REGEX =
  /(\/\/ \[BEGIN INQUIRIES_CREATE_RULE\]\r?\n)([ \t]*)[^\r\n]+(\r?\n[ \t]*\/\/ \[END INQUIRIES_CREATE_RULE\])/;
const STATIC_INQUIRIES_CREATE_RULE =
  "allow create: if isValidId(inquiryId) && isValidInquiry(incoming(), inquiryId) && incoming().status == 'new';";
const SERVER_INQUIRIES_CREATE_RULE = 'allow create: if false;';

const updatedFiles = [];

for (const relPath of RULE_FILES) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) continue;

  const original = fs.readFileSync(fullPath, 'utf8');
  let next = original.replace(EMAIL_PATTERN, EMAIL_REPLACEMENT);

  if (relPath === 'firestore.rules') {
    if (!INQUIRIES_RULE_REGEX.test(next)) {
      throw new Error(
        'Could not find [BEGIN INQUIRIES_CREATE_RULE] / [END INQUIRIES_CREATE_RULE] markers in firestore.rules'
      );
    }
    const targetRule =
      backendMode === 'server' ? SERVER_INQUIRIES_CREATE_RULE : STATIC_INQUIRIES_CREATE_RULE;
    next = next.replace(INQUIRIES_RULE_REGEX, `$1$2${targetRule}$3`);
  }

  if (next !== original) {
    fs.writeFileSync(fullPath, next, 'utf8');
    updatedFiles.push(relPath);
  }
}

console.log(
  `Generated security rules for backend mode: ${backendMode} (/inquiries create: ${
    backendMode === 'server' ? 'disabled (allow create: if false)' : 'public validated'
  }).`
);

if (updatedFiles.length > 0) {
  console.log(`Synced admin email (${adminEmail}) & mode rules in: ${updatedFiles.join(', ')}`);
} else {
  console.log(
    `All security rules already match admin email (${adminEmail}) and mode (${backendMode}).`
  );
}
