import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import type { Transporter, TestAccount } from 'nodemailer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PORTFOLIO_PROJECTS, PROPERTY_LISTINGS } from './src/data/realEstateData';
import { BUY_PROPERTIES, type BuyProperty } from './src/data/buyPropertiesData';
import { RENTAL_LISTINGS } from './src/data/rentalsData';
import type { PortfolioProject, PropertyListing, RentalListing } from './src/types/index';

const PORT = Number(process.env.PORT) || 3000;
const STORE_PATH = '/tmp/avenue-auth-users.json';
const CATALOG_PATH = '/tmp/avenue-catalog.json';
const INQUIRIES_PATH = '/tmp/avenue-inquiries.json';
const MANAGEMENT_EMAIL = 'mangament@avenue-properties.come';
const MANAGEMENT_PASSWORD = 'Avenue@developed-by-Abdulah-Hanan';
const MANAGEMENT_TOKEN_SECRET =
  process.env.MANAGEMENT_TOKEN_SECRET ||
  crypto.createHash('sha256').update(`${MANAGEMENT_EMAIL}:${MANAGEMENT_PASSWORD}:avenue`).digest('hex');

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  emailVerified: boolean;
  provider?: 'email' | 'google';
  photoURL?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
  verifyCode?: string;
  verifyToken?: string;
  verifyExpiresAt?: number;
  resetCode?: string;
  resetExpiresAt?: number;
}

interface ContactInquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  office: string;
  subject: string;
  message: string;
  source: string;
  propertyTitle?: string;
  preferredDate?: string;
  timeframe?: string;
  status: 'new' | 'contacted' | 'resolved';
  createdAt: string;
}

const usersByEmail = new Map<string, StoredUser>();
let inquiriesList: ContactInquiryRecord[] = [];

function loadUsersFromDisk() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as StoredUser[];
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          if (u && u.email) {
            usersByEmail.set(u.email.toLowerCase(), u);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not load persisted auth store:', err);
  }
}

function saveUsersToDisk() {
  try {
    const list = Array.from(usersByEmail.values());
    fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist auth store:', err);
  }
}

function loadInquiriesFromDisk() {
  try {
    if (fs.existsSync(INQUIRIES_PATH)) {
      const raw = fs.readFileSync(INQUIRIES_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as ContactInquiryRecord[];
      if (Array.isArray(parsed)) {
        inquiriesList = parsed;
      }
    }
  } catch (err) {
    console.warn('Could not load persisted inquiries store:', err);
  }
}

function saveInquiriesToDisk() {
  try {
    fs.writeFileSync(INQUIRIES_PATH, JSON.stringify(inquiriesList, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist inquiries store:', err);
  }
}

loadUsersFromDisk();
loadInquiriesFromDisk();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const computed = hashPassword(password, salt);
  const bufA = Buffer.from(computed, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

function sanitizeUser(u: StoredUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    provider: u.provider || 'email',
    photoURL: u.photoURL,
    phone: u.phone,
    role: 'client' as const,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

function createManagementToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), role: 'management', iat: Date.now() })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', MANAGEMENT_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyManagementToken(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expectedSig = crypto
    .createHmac('sha256', MANAGEMENT_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      email?: string;
      role?: string;
    };
    return decoded.email === MANAGEMENT_EMAIL && decoded.role === 'management';
  } catch {
    return false;
  }
}

function requireManagement(req: Request, res: Response, next: () => void) {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!verifyManagementToken(token)) {
    return res.status(403).json({
      success: false,
      error: 'Management access required. Please sign in with the management account.',
    });
  }
  return next();
}

let cachedEtherealTransporter: Transporter | null = null;
let cachedEtherealAccount: TestAccount | null = null;

async function getTransporter(): Promise<{
  transporter: Transporter;
  fromAddress: string;
  isEthereal: boolean;
}> {
  const defaultFrom = process.env.EMAIL_FROM || 'Avenue Luxury Properties <no-reply@example.com>';

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return { transporter, fromAddress: defaultFrom, isEthereal: false };
  }

  if (!cachedEtherealTransporter || !cachedEtherealAccount) {
    cachedEtherealAccount = await nodemailer.createTestAccount();
    cachedEtherealTransporter = nodemailer.createTransport({
      host: cachedEtherealAccount.smtp.host,
      port: cachedEtherealAccount.smtp.port,
      secure: cachedEtherealAccount.smtp.secure,
      auth: {
        user: cachedEtherealAccount.user,
        pass: cachedEtherealAccount.pass,
      },
    });
  }

  return {
    transporter: cachedEtherealTransporter,
    fromAddress: `Avenue Luxury Properties <${cachedEtherealAccount.user}>`,
    isEthereal: true,
  };
}

interface SendEmailResult {
  sent: boolean;
  provider: 'resend' | 'smtp' | 'ethereal';
  previewUrl?: string;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  // 1. Optional Resend free tier API if configured
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Avenue Luxury Properties <onboarding@resend.dev>',
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    if (res.ok) {
      return { sent: true, provider: 'resend' };
    }
    const errBody = await res.text();
    console.warn('Resend API error, falling back to Ethereal:', errBody);
  }

  // 2. Nodemailer (configured SMTP or free Ethereal Email API)
  const { transporter, fromAddress, isEthereal } = await getTransporter();
  const info = await transporter.sendMail({
    from: fromAddress,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) || undefined : undefined;
  return {
    sent: true,
    provider: isEthereal ? 'ethereal' : 'smtp',
    previewUrl,
  };
}

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function buildVerificationEmailHtml(name: string, code: string, verifyLink: string): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 32px 20px;">
      <div style="background: #1B2A44; color: #ffffff; padding: 28px 32px; border-radius: 20px 20px 0 0;">
        <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Avenue</div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-top: 4px;">Luxury Properties &amp; Architectural Legacies</div>
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 20px 20px; border: 1px solid #e2e8f0; border-top: none;">
        <h2 style="color: #1B2A44; margin: 0 0 12px; font-size: 20px;">Verify your email address</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Assalam o Alaikum ${name},<br/>
          Thank you for registering with Avenue. Enter the 6-digit verification code below or click the verification button to activate your account.
        </p>
        <div style="background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 6px;">Verification Code</div>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1B2A44; font-family: monospace;">${code}</div>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${verifyLink}" style="display: inline-block; background: #1B2A44; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 14px 28px; border-radius: 999px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
          This code expires in 15 minutes. If you did not create an Avenue account, you may safely ignore this email.
        </p>
      </div>
    </div>
  `;
}

function buildResetEmailHtml(name: string, code: string): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 32px 20px;">
      <div style="background: #1B2A44; color: #ffffff; padding: 28px 32px; border-radius: 20px 20px 0 0;">
        <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Avenue</div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-top: 4px;">Password Reset Request</div>
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 20px 20px; border: 1px solid #e2e8f0; border-top: none;">
        <h2 style="color: #1B2A44; margin: 0 0 12px; font-size: 20px;">Reset your password</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Assalam o Alaikum ${name},<br/>
          We received a request to reset the password for your Avenue client account. Enter the 6-digit code below in the Reset Password window to choose a new password.
        </p>
        <div style="background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 6px;">Reset Code</div>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1B2A44; font-family: monospace;">${code}</div>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
          This code expires in 15 minutes. If you did not request a password reset, please disregard this message.
        </p>
      </div>
    </div>
  `;
}

type CityCategory = 'Lahore' | 'Islamabad' | 'Karachi' | 'Rawalpindi' | 'Murree & Hills';

interface CatalogStore {
  projects: PortfolioProject[];
  listings: PropertyListing[];
  buy: BuyProperty[];
  rent: RentalListing[];
}

const VALID_CITIES: CityCategory[] = ['Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Murree & Hills'];

function normalizeCity(city: string): CityCategory {
  return VALID_CITIES.includes(city as CityCategory) ? (city as CityCategory) : 'Lahore';
}

function getDefaultCatalog(): CatalogStore {
  return {
    projects: JSON.parse(JSON.stringify(PORTFOLIO_PROJECTS)),
    listings: JSON.parse(JSON.stringify(PROPERTY_LISTINGS)),
    buy: JSON.parse(JSON.stringify(BUY_PROPERTIES)),
    rent: JSON.parse(JSON.stringify(RENTAL_LISTINGS)),
  };
}

let catalogStore: CatalogStore = getDefaultCatalog();

const LEGACY_REPLACEMENTS: Record<string, string> = {
  'photo-1600607687644-c7171b42498b': 'photo-1600585154340-be6161a56a0c',
  'photo-1502005229762-ee1b2b93e083': 'photo-1600210492486-724fe5c67fb0',
  'photo-1508873696983-2df5703bc20d': 'photo-1512917774080-9991f1c4c750',
  'photo-1540518614846-7ede433c4550': 'photo-1616486338812-3dadae4b4ace',
};

function normalizeStockImageUrl(url: string): string {
  if (!url) return url;
  const match = url.match(/^https:\/\/images\.unsplash\.com\/(photo-[^?\s'"]+)/);
  if (match) {
    const mapped = LEGACY_REPLACEMENTS[match[1]] || match[1];
    const localPath = path.resolve(process.cwd(), 'public/stock', `${mapped}.jpg`);
    if (fs.existsSync(localPath)) {
      return `/stock/${mapped}.jpg`;
    }
  }
  return url;
}

function normalizeCatalogImages(store: CatalogStore): CatalogStore {
  return {
    projects: store.projects.map((p) => ({
      ...p,
      image: normalizeStockImageUrl(p.image),
      gallery: Array.isArray(p.gallery) ? p.gallery.map(normalizeStockImageUrl) : p.gallery,
    })),
    listings: store.listings.map((l) => ({
      ...l,
      exteriorImage: normalizeStockImageUrl(l.exteriorImage),
      interiorImages: Array.isArray(l.interiorImages)
        ? l.interiorImages.map(normalizeStockImageUrl)
        : l.interiorImages,
    })),
    buy: store.buy.map((b) => ({
      ...b,
      image: normalizeStockImageUrl(b.image),
      gallery: Array.isArray(b.gallery) ? b.gallery.map(normalizeStockImageUrl) : b.gallery,
    })),
    rent: store.rent.map((r) => ({
      ...r,
      image: normalizeStockImageUrl(r.image),
      gallery: Array.isArray(r.gallery) ? r.gallery.map(normalizeStockImageUrl) : r.gallery,
    })),
  };
}

function loadCatalogFromDisk() {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      const raw = fs.readFileSync(CATALOG_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<CatalogStore>;
      const defaults = getDefaultCatalog();
      catalogStore = normalizeCatalogImages({
        projects: Array.isArray(parsed.projects) ? parsed.projects : defaults.projects,
        listings: Array.isArray(parsed.listings) ? parsed.listings : defaults.listings,
        buy: Array.isArray(parsed.buy) ? parsed.buy : defaults.buy,
        rent: Array.isArray(parsed.rent) ? parsed.rent : defaults.rent,
      });
      saveCatalogToDisk();
    } else {
      saveCatalogToDisk();
    }
  } catch (err) {
    console.warn('Could not load persisted catalog store:', err);
  }
}

function saveCatalogToDisk() {
  try {
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalogStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist catalog store:', err);
  }
}

loadCatalogFromDisk();

function parseNumericPKR(input: string | number | undefined, fallback = 50000000): number {
  if (typeof input === 'number' && !Number.isNaN(input) && input > 0) return input;
  const raw = String(input || '').trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  const num = parseFloat(lower.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(num) || num <= 0) return fallback;
  if (lower.includes('crore') || lower.includes('cr')) return Math.round(num * 10000000);
  if (lower.includes('lakh') || lower.includes('lac')) return Math.round(num * 100000);
  if (lower.includes('thousand') || lower.endsWith('k')) return Math.round(num * 1000);
  return Math.round(num);
}

function computePriceRange(numericPrice: number): BuyProperty['priceRange'] {
  if (numericPrice < 10000000) return 'Under 1 Cr';
  if (numericPrice <= 30000000) return '1-3 Cr';
  if (numericPrice <= 70000000) return '3-7 Cr';
  return '7 Cr+';
}

function computeAreaCategory(area: string): BuyProperty['areaCategory'] {
  const lower = area.toLowerCase();
  if (lower.includes('2 kanal') || lower.includes('1,000') || lower.includes('1000')) return '2 Kanal+';
  if (lower.includes('1 kanal') || lower.includes('500')) return '1 Kanal';
  if (lower.includes('10 marla') || lower.includes('7 marla') || lower.includes('8 marla')) return '10 Marla';
  return 'Up to 5 Marla';
}

const DEFAULT_FALLBACK_IMAGE = '/stock/photo-1600585154340-be6161a56a0c.jpg';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(
    '/stock',
    express.static(path.resolve(process.cwd(), 'public/stock'), {
      maxAge: '365d',
      immutable: true,
    })
  );

  // --- Catalog CRUD Routes (Projects, Buy, Rent) ---
  app.get('/api/catalog', (_req: Request, res: Response) => {
    return res.json({ success: true, catalog: catalogStore });
  });

  // Add Project
  app.post('/api/catalog/projects', requireManagement, (req: Request, res: Response) => {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const location = String(body.location || '').trim();
    const category = normalizeCity(String(body.category || 'Lahore'));
    const valuation = String(body.valuation || '').trim();
    const size = String(body.size || '').trim() || '1 Kanal';
    const beds = Math.max(0, Number(body.beds ?? 5) || 0);
    const baths = Math.max(0, Number(body.baths ?? 5) || 0);
    const projectDelivered = String(body.projectDelivered || new Date().getFullYear()).trim();
    const architect = String(body.architect || 'Avenue Design Atelier').trim();
    const summary =
      String(body.summary || '').trim() ||
      `Architectural residence located in ${location || category} with verified title and transfer documentation.`;
    const image = String(body.image || '').trim() || DEFAULT_FALLBACK_IMAGE;
    const galleryInput = Array.isArray(body.gallery)
      ? body.gallery.map((g: unknown) => String(g).trim()).filter(Boolean)
      : [];
    const gallery = galleryInput.length > 0 ? galleryInput : [image];

    if (!title || !location || !valuation) {
      return res.status(400).json({
        success: false,
        error: 'Project title, location, and valuation/price are required.',
      });
    }

    const newProject: PortfolioProject = {
      id: `proj-${crypto.randomBytes(5).toString('hex')}`,
      title,
      location,
      size,
      beds,
      baths,
      projectDelivered,
      image,
      summary,
      architect,
      valuation,
      numericValuation: parseNumericPKR(valuation, 100000000),
      category,
      gallery,
    };

    catalogStore.projects = [newProject, ...catalogStore.projects];
    saveCatalogToDisk();

    return res.status(201).json({ success: true, item: newProject, catalog: catalogStore });
  });

  // Remove Project (checks both projects and listings arrays)
  app.delete('/api/catalog/projects/:id', requireManagement, (req: Request, res: Response) => {
    const { id } = req.params;
    const beforeCount = catalogStore.projects.length + catalogStore.listings.length;
    catalogStore.projects = catalogStore.projects.filter((p) => p.id !== id);
    catalogStore.listings = catalogStore.listings.filter((l) => l.id !== id);
    const afterCount = catalogStore.projects.length + catalogStore.listings.length;

    if (beforeCount === afterCount) {
      return res.status(404).json({ success: false, error: 'Project item not found.' });
    }

    saveCatalogToDisk();
    return res.json({ success: true, catalog: catalogStore });
  });

  // Add Buy Property
  app.post('/api/catalog/buy', requireManagement, (req: Request, res: Response) => {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const city = normalizeCity(String(body.city || 'Lahore'));
    const location = String(body.location || '').trim();
    const rawType = String(body.type || 'House').trim();
    const allowedTypes: BuyProperty['type'][] = ['House', 'Apartment', 'Plot', 'Penthouse'];
    const type: BuyProperty['type'] = allowedTypes.includes(rawType as BuyProperty['type'])
      ? (rawType as BuyProperty['type'])
      : 'House';
    const price = String(body.price || '').trim();
    const area = String(body.area || '').trim() || '10 Marla';
    const beds = type === 'Plot' ? 0 : Math.max(0, Number(body.beds ?? 4) || 0);
    const baths = type === 'Plot' ? 0 : Math.max(0, Number(body.baths ?? 4) || 0);
    const image = String(body.image || '').trim() || DEFAULT_FALLBACK_IMAGE;
    const galleryInput = Array.isArray(body.gallery)
      ? body.gallery.map((g: unknown) => String(g).trim()).filter(Boolean)
      : [];
    const gallery = galleryInput.length > 0 ? galleryInput : [image];
    const description =
      String(body.description || '').trim() ||
      `Verified ${type.toLowerCase()} for sale in ${location || city} with clear society transfer documentation.`;
    const featuresInput = Array.isArray(body.features)
      ? body.features.map((f: unknown) => String(f).trim()).filter(Boolean)
      : String(body.features || '')
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean);
    const features =
      featuresInput.length > 0
        ? featuresInput
        : ['Verified Clear Title', '24/7 Society Security', 'All Utilities Available'];
    const possession = String(body.possession || 'Ready to Move').trim();
    const nocStatus = String(body.nocStatus || 'Society Transfer Ready').trim();

    if (!title || !location || !price) {
      return res.status(400).json({
        success: false,
        error: 'Property title, location, and price are required.',
      });
    }

    const numericPrice = parseNumericPKR(body.numericPrice ?? price, 35000000);
    const newBuy: BuyProperty = {
      id: `buy-${crypto.randomBytes(5).toString('hex')}`,
      title,
      city,
      location,
      type,
      price,
      numericPrice,
      priceRange: computePriceRange(numericPrice),
      area,
      areaCategory: computeAreaCategory(area),
      beds,
      baths,
      image,
      gallery,
      description,
      features,
      possession,
      nocStatus,
    };

    catalogStore.buy = [newBuy, ...catalogStore.buy];
    saveCatalogToDisk();

    return res.status(201).json({ success: true, item: newBuy, catalog: catalogStore });
  });

  // Remove Buy Property
  app.delete('/api/catalog/buy/:id', requireManagement, (req: Request, res: Response) => {
    const { id } = req.params;
    const before = catalogStore.buy.length;
    catalogStore.buy = catalogStore.buy.filter((item) => item.id !== id);
    if (catalogStore.buy.length === before) {
      return res.status(404).json({ success: false, error: 'Property not found.' });
    }
    saveCatalogToDisk();
    return res.json({ success: true, catalog: catalogStore });
  });

  // Add Rental Listing
  app.post('/api/catalog/rent', requireManagement, (req: Request, res: Response) => {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const city = normalizeCity(String(body.city || 'Lahore'));
    const areaSociety = String(body.areaSociety || '').trim();
    const rawType = String(body.type || 'House').trim();
    const allowedTypes: RentalListing['type'][] = ['Apartment', 'House', 'Upper Portion', 'Lower Portion'];
    const type: RentalListing['type'] = allowedTypes.includes(rawType as RentalListing['type'])
      ? (rawType as RentalListing['type'])
      : 'House';
    const monthlyRent = Number(body.monthlyRent);
    const beds = Math.max(1, Number(body.beds ?? 3) || 3);
    const baths = Math.max(1, Number(body.baths ?? 3) || 3);
    const sizeOrFloor = String(body.sizeOrFloor || '').trim() || '10 Marla';
    const furnished: RentalListing['furnished'] =
      String(body.furnished || 'Unfurnished') === 'Furnished' ? 'Furnished' : 'Unfurnished';
    const image = String(body.image || '').trim() || DEFAULT_FALLBACK_IMAGE;
    const galleryInput = Array.isArray(body.gallery)
      ? body.gallery.map((g: unknown) => String(g).trim()).filter(Boolean)
      : [];
    const gallery = galleryInput.length > 0 ? galleryInput : [image];
    const availableFrom = String(body.availableFrom || 'Immediate').trim();
    const securityDeposit = String(body.securityDeposit || "2 months' rent").trim();
    const advanceRent = String(body.advanceRent || '1 month').trim();
    const minContractPeriod = String(body.minContractPeriod || '11 months').trim();
    const amenitiesInput = Array.isArray(body.amenities)
      ? body.amenities.map((a: unknown) => String(a).trim()).filter(Boolean)
      : String(body.amenities || '')
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
    const amenities =
      amenitiesInput.length > 0
        ? amenitiesInput
        : ['Electricity & Sui Gas Connected', '24/7 Gated Security', 'Reserved Parking'];
    const description =
      String(body.description || '').trim() ||
      `Well-maintained ${furnished.toLowerCase()} ${type.toLowerCase()} available for lease in ${areaSociety || city}.`;

    if (!title || !areaSociety || !monthlyRent || Number.isNaN(monthlyRent) || monthlyRent <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Rental title, society/location, and a valid monthly rent in PKR are required.',
      });
    }

    const newRental: RentalListing = {
      id: `rent-${crypto.randomBytes(5).toString('hex')}`,
      title,
      city,
      areaSociety,
      type,
      monthlyRent: Math.round(monthlyRent),
      beds,
      baths,
      sizeOrFloor,
      furnished,
      image,
      gallery,
      availableFrom,
      securityDeposit,
      advanceRent,
      minContractPeriod,
      amenities,
      description,
    };

    catalogStore.rent = [newRental, ...catalogStore.rent];
    saveCatalogToDisk();

    return res.status(201).json({ success: true, item: newRental, catalog: catalogStore });
  });

  // Remove Rental Listing
  app.delete('/api/catalog/rent/:id', requireManagement, (req: Request, res: Response) => {
    const { id } = req.params;
    const before = catalogStore.rent.length;
    catalogStore.rent = catalogStore.rent.filter((item) => item.id !== id);
    if (catalogStore.rent.length === before) {
      return res.status(404).json({ success: false, error: 'Rental listing not found.' });
    }
    saveCatalogToDisk();
    return res.json({ success: true, catalog: catalogStore });
  });

  // Reset Catalog Section to Defaults
  app.post('/api/catalog/reset', requireManagement, (req: Request, res: Response) => {
    const section = String(req.body?.section || 'all');
    const defaults = getDefaultCatalog();
    if (section === 'projects') {
      catalogStore.projects = defaults.projects;
      catalogStore.listings = defaults.listings;
    } else if (section === 'buy') {
      catalogStore.buy = defaults.buy;
    } else if (section === 'rent') {
      catalogStore.rent = defaults.rent;
    } else {
      catalogStore = defaults;
    }
    saveCatalogToDisk();
    return res.json({ success: true, catalog: catalogStore });
  });

  // 1. Signup with Email Verification
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const name = String(req.body?.name || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!name) {
        return res.status(400).json({ success: false, error: 'Full name is required.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password should be at least 8 characters.' });
      }

      if (email === MANAGEMENT_EMAIL) {
        return res.status(403).json({
          success: false,
          error: 'This email is reserved for Avenue Management. Please use the Login page.',
        });
      }

      const existing = usersByEmail.get(email);
      if (existing && existing.emailVerified) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists. Please log in.',
        });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);
      const verifyCode = generateOtpCode();
      const verifyToken = crypto.randomBytes(24).toString('hex');
      const verifyExpiresAt = Date.now() + 15 * 60 * 1000;

      const user: StoredUser = {
        id: existing?.id || `usr_${crypto.randomBytes(10).toString('hex')}`,
        name,
        email,
        passwordHash,
        salt,
        emailVerified: false,
        provider: 'email',
        createdAt: existing?.createdAt || new Date().toISOString(),
        verifyCode,
        verifyToken,
        verifyExpiresAt,
      };

      usersByEmail.set(email, user);
      saveUsersToDisk();

      const verifyLink = `${getBaseUrl(req)}/api/auth/verify-link?token=${verifyToken}&email=${encodeURIComponent(email)}`;
      const emailResult = await sendEmail({
        to: email,
        subject: 'Verify your Avenue Luxury Properties account',
        text: `Assalam o Alaikum ${name}, your Avenue verification code is ${verifyCode}. Or visit: ${verifyLink}`,
        html: buildVerificationEmailHtml(name, verifyCode, verifyLink),
      });

      return res.json({
        success: true,
        email,
        previewUrl: emailResult.previewUrl,
        provider: emailResult.provider,
      });
    } catch (err: unknown) {
      console.error('Signup route error:', err);
      return res.status(500).json({
        success: false,
        error: 'Could not send verification email right now. Please try again.',
      });
    }
  });

  // 2. Resend Verification Email
  app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const user = usersByEmail.get(email);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No pending registration found for this email.',
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          error: 'This email is already verified. Please sign in.',
        });
      }

      const verifyCode = generateOtpCode();
      const verifyToken = crypto.randomBytes(24).toString('hex');
      user.verifyCode = verifyCode;
      user.verifyToken = verifyToken;
      user.verifyExpiresAt = Date.now() + 15 * 60 * 1000;
      saveUsersToDisk();

      const verifyLink = `${getBaseUrl(req)}/api/auth/verify-link?token=${verifyToken}&email=${encodeURIComponent(email)}`;
      const emailResult = await sendEmail({
        to: email,
        subject: 'Your new Avenue verification code',
        text: `Assalam o Alaikum ${user.name}, your new verification code is ${verifyCode}. Or visit: ${verifyLink}`,
        html: buildVerificationEmailHtml(user.name, verifyCode, verifyLink),
      });

      return res.json({
        success: true,
        previewUrl: emailResult.previewUrl,
        provider: emailResult.provider,
      });
    } catch (err: unknown) {
      console.error('Resend verification error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to resend verification email.',
      });
    }
  });

  // 3. Verify Email via 6-digit Code
  app.post('/api/auth/verify-email', (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const user = usersByEmail.get(email);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    if (user.emailVerified) {
      return res.json({ success: true, user: sanitizeUser(user) });
    }

    if (!code || user.verifyCode !== code) {
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please check your email.' });
    }

    if (user.verifyExpiresAt && Date.now() > user.verifyExpiresAt) {
      return res.status(400).json({ success: false, error: 'Verification code expired. Please resend a new one.' });
    }

    user.emailVerified = true;
    user.verifyCode = undefined;
    user.verifyToken = undefined;
    user.verifyExpiresAt = undefined;
    saveUsersToDisk();

    return res.json({ success: true, user: sanitizeUser(user) });
  });

  // 4. Verify Email via Direct Email Link
  app.get('/api/auth/verify-link', (req: Request, res: Response) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    const token = String(req.query.token || '').trim();
    const user = usersByEmail.get(email);

    if (!user || !token || (user.verifyToken !== token && !user.emailVerified)) {
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; background: #E6ECF5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
            <div style="background: white; padding: 40px; border-radius: 24px; max-width: 420px; text-align: center; box-shadow: 0 20px 50px rgba(27,42,68,0.1);">
              <h2 style="color: #1B2A44; margin-top: 0;">Verification Link Invalid</h2>
              <p style="color: #64748b; font-size: 14px;">This verification link has expired or is invalid. Please request a new code in the app.</p>
              <a href="/#/login" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1B2A44; color: white; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 13px;">Go to Login</a>
            </div>
          </body>
        </html>
      `);
    }

    user.emailVerified = true;
    user.verifyCode = undefined;
    user.verifyToken = undefined;
    user.verifyExpiresAt = undefined;
    saveUsersToDisk();

    return res.send(`
      <html>
        <body style="font-family: sans-serif; background: #E6ECF5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
          <div style="background: white; padding: 40px; border-radius: 24px; max-width: 420px; text-align: center; box-shadow: 0 20px 50px rgba(27,42,68,0.1);">
            <div style="width: 56px; height: 56px; border-radius: 999px; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px;">✓</div>
            <h2 style="color: #1B2A44; margin-top: 0;">Email Verified!</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">
              Your Avenue account (${email}) is now active. Return to the app tab and click <strong>"I've verified my email"</strong> or sign in directly below.
            </p>
            <a href="/#/login" style="display: inline-block; margin-top: 18px; padding: 12px 28px; background: #1B2A44; color: white; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 13px;">Sign In to Avenue</a>
          </div>
        </body>
      </html>
    `);
  });

  // 5. Check Verification Status
  app.post('/api/auth/check-verified', (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const user = usersByEmail.get(email);
    if (!user) {
      return res.json({ verified: false });
    }
    return res.json({
      verified: user.emailVerified,
      user: user.emailVerified ? sanitizeUser(user) : undefined,
    });
  });

  // 6. Login with Email & Password
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (email === MANAGEMENT_EMAIL) {
      const providedHash = crypto.createHash('sha256').update(password).digest();
      const expectedHash = crypto.createHash('sha256').update(MANAGEMENT_PASSWORD).digest();
      if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect email or password. Please verify and try again.',
        });
      }

      return res.json({
        success: true,
        user: {
          id: 'mgmt_avenue_admin',
          name: 'Avenue Management',
          email: MANAGEMENT_EMAIL,
          emailVerified: true,
          role: 'management' as const,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
        managementToken: createManagementToken(MANAGEMENT_EMAIL),
      });
    }

    const user = usersByEmail.get(email);

    if (user && user.provider === 'google' && !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'This account uses Google Sign-In. Please click "Continue with Google".',
      });
    }

    if (!user || !user.salt || !user.passwordHash || !verifyPassword(password, user.salt, user.passwordHash)) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect email or password. Please verify and try again.',
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        unverified: true,
        email: user.email,
      });
    }

    user.lastLoginAt = new Date().toISOString();
    saveUsersToDisk();

    return res.json({
      success: true,
      user: sanitizeUser(user),
    });
  });

  // 6b. Sync Google Sign-In Accounts to Backend Registry
  app.post('/api/auth/google-sync', (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim() || 'Avenue Member';
    const uid = String(req.body?.id || '').trim();
    const photoURL = req.body?.photoURL ? String(req.body.photoURL).trim() : undefined;

    if (!email || email === MANAGEMENT_EMAIL) {
      return res.status(400).json({ success: false, error: 'Valid user email required.' });
    }

    const existing = usersByEmail.get(email);
    const now = new Date().toISOString();
    if (existing) {
      existing.name = name || existing.name;
      existing.emailVerified = true;
      if (photoURL) existing.photoURL = photoURL;
      existing.lastLoginAt = now;
      if (!existing.provider) existing.provider = 'google';
      saveUsersToDisk();
      return res.json({ success: true, user: sanitizeUser(existing) });
    }

    const newGoogleUser: StoredUser = {
      id: uid || `usr_${crypto.randomBytes(10).toString('hex')}`,
      name,
      email,
      passwordHash: '',
      salt: '',
      emailVerified: true,
      provider: 'google',
      photoURL,
      createdAt: now,
      lastLoginAt: now,
    };
    usersByEmail.set(email, newGoogleUser);
    saveUsersToDisk();
    return res.status(201).json({ success: true, user: sanitizeUser(newGoogleUser) });
  });

  // 6c. Sync User Phone Update
  app.post('/api/auth/update-phone', (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const user = usersByEmail.get(email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }
    user.phone = phone || undefined;
    saveUsersToDisk();
    return res.json({ success: true, user: sanitizeUser(user) });
  });

  // 7. Forgot Password (Send Reset Code)
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (email === MANAGEMENT_EMAIL) {
        return res.status(403).json({
          success: false,
          error: 'Management account credentials cannot be reset here.',
        });
      }
      const user = usersByEmail.get(email);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No account found with this email address.',
        });
      }

      const resetCode = generateOtpCode();
      user.resetCode = resetCode;
      user.resetExpiresAt = Date.now() + 15 * 60 * 1000;
      saveUsersToDisk();

      const emailResult = await sendEmail({
        to: email,
        subject: 'Avenue Password Reset Code',
        text: `Assalam o Alaikum ${user.name}, your Avenue password reset code is ${resetCode}. It expires in 15 minutes.`,
        html: buildResetEmailHtml(user.name, resetCode),
      });

      return res.json({
        success: true,
        previewUrl: emailResult.previewUrl,
        provider: emailResult.provider,
      });
    } catch (err: unknown) {
      console.error('Forgot password error:', err);
      return res.status(500).json({
        success: false,
        error: 'Could not send password reset email. Please try again.',
      });
    }
  });

  // 8. Reset Password with Code
  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (email === MANAGEMENT_EMAIL) {
      return res.status(403).json({
        success: false,
        error: 'Management account credentials cannot be reset here.',
      });
    }

    const user = usersByEmail.get(email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    if (!code || user.resetCode !== code) {
      return res.status(400).json({ success: false, error: 'Invalid reset code. Please check your email.' });
    }

    if (user.resetExpiresAt && Date.now() > user.resetExpiresAt) {
      return res.status(400).json({ success: false, error: 'Reset code has expired. Please request a new one.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    user.salt = salt;
    user.passwordHash = hashPassword(newPassword, salt);
    user.resetCode = undefined;
    user.resetExpiresAt = undefined;
    user.emailVerified = true;
    saveUsersToDisk();

    return res.json({ success: true });
  });

  // --- Contact & Inquiry Submissions Routes ---
  app.post('/api/inquiries', (req: Request, res: Response) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const office = String(body.office || 'Lahore').trim();
    const subject = String(body.subject || 'General Inquiry').trim();
    const message = String(body.message || '').trim();
    const source = String(body.source || 'Contact Page').trim();
    const propertyTitle = body.propertyTitle ? String(body.propertyTitle).trim() : undefined;
    const preferredDate = body.preferredDate ? String(body.preferredDate).trim() : undefined;
    const timeframe = body.timeframe ? String(body.timeframe).trim() : undefined;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email address or contact phone number.',
      });
    }

    const record: ContactInquiryRecord = {
      id: `inq-${crypto.randomBytes(5).toString('hex')}`,
      name,
      email,
      phone,
      office,
      subject,
      message,
      source,
      propertyTitle,
      preferredDate,
      timeframe,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    inquiriesList = [record, ...inquiriesList];
    saveInquiriesToDisk();

    return res.status(201).json({ success: true, inquiry: record });
  });

  // Management-only endpoints to view & manage Contact Submissions and Registered Accounts
  app.get('/api/management/records', requireManagement, (_req: Request, res: Response) => {
    const accounts = Array.from(usersByEmail.values())
      .map(sanitizeUser)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const inquiries = [...inquiriesList].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json({
      success: true,
      inquiries,
      accounts,
    });
  });

  app.patch('/api/management/inquiries/:id', requireManagement, (req: Request, res: Response) => {
    const { id } = req.params;
    const status = String(req.body?.status || '').trim();
    if (!['new', 'contacted', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value.' });
    }

    const idx = inquiriesList.findIndex((item) => item.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }

    inquiriesList[idx] = {
      ...inquiriesList[idx],
      status: status as ContactInquiryRecord['status'],
    };
    saveInquiriesToDisk();

    return res.json({ success: true, inquiry: inquiriesList[idx] });
  });

  app.delete('/api/management/inquiries/:id', requireManagement, (req: Request, res: Response) => {
    const { id } = req.params;
    const before = inquiriesList.length;
    inquiriesList = inquiriesList.filter((item) => item.id !== id);
    if (inquiriesList.length === before) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }
    saveInquiriesToDisk();
    return res.json({ success: true });
  });

  app.delete('/api/management/accounts/:id', requireManagement, (req: Request, res: Response) => {
    const { id } = req.params;
    let deleted = false;
    for (const [key, user] of usersByEmail.entries()) {
      if (user.id === id) {
        usersByEmail.delete(key);
        deleted = true;
        break;
      }
    }
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }
    saveUsersToDisk();
    return res.json({ success: true });
  });

  // Mount Vite middleware in dev or serve static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
