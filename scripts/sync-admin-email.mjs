import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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

const adminEmail = resolveAdminEmail();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  throw new Error(`Invalid admin email address: "${adminEmail}"`);
}

const RULE_FILES = ['firestore.rules', 'storage.rules'];
const PATTERN = /request\.auth\.token\.email == '[^']+'/g;
const REPLACEMENT = `request.auth.token.email == '${adminEmail}'`;

const updatedFiles = [];

for (const relPath of RULE_FILES) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) continue;

  const original = fs.readFileSync(fullPath, 'utf8');
  const next = original.replace(PATTERN, REPLACEMENT);

  if (next !== original) {
    fs.writeFileSync(fullPath, next, 'utf8');
    updatedFiles.push(relPath);
  }
}

if (updatedFiles.length > 0) {
  console.log(`Synced admin email (${adminEmail}) in: ${updatedFiles.join(', ')}`);
} else {
  console.log(`All security rules already match admin email (${adminEmail}).`);
}
