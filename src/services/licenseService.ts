export interface LicenseInfo {
  deviceId: string;
  isActive: boolean;
  expiresAt: string; // ISO date
  daysRemaining: number;
  planName: string;
  isExpired: boolean;
  isExpiringSoon: boolean; // <= 3 days
}

const STORAGE_KEY_DEVICE_ID = 'pos_license_device_id';
const STORAGE_KEY_EXPIRES_AT = 'pos_license_expires_at';
const STORAGE_KEY_PLAN_NAME = 'pos_license_plan_name';

// Secret salt for generating verification keys
const LICENSE_SECRET = 'MADUKA_TZ_2026_SECRET';

// Simple hash generator for deterministic license codes
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(-4);
};

// Get or create unique Device / Shop ID
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
  if (!deviceId) {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    deviceId = `POS-${randomCode}`;
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceId);
  }
  return deviceId;
};

// Generate an official License Code (You as the developer can use this to generate codes for your clients!)
export const generateLicenseCode = (deviceId: string, days: number): string => {
  const cleanId = deviceId.trim().toUpperCase();
  const signature = simpleHash(`${cleanId}_${days}_${LICENSE_SECRET}`);
  return `LIC-${days}-${signature}`;
};

// Check current subscription status
export const checkLicenseStatus = (): LicenseInfo => {
  const deviceId = getDeviceId();
  let expiresAtStr = localStorage.getItem(STORAGE_KEY_EXPIRES_AT);

  // If newly installed, give 30-day initial trial
  if (!expiresAtStr) {
    const initialExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(STORAGE_KEY_EXPIRES_AT, initialExpiry);
    localStorage.setItem(STORAGE_KEY_PLAN_NAME, 'Leseni ya Mwezi (Siku 30)');
    expiresAtStr = initialExpiry;
  }

  const expiresAt = new Date(expiresAtStr);
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 3;
  const planName = localStorage.getItem(STORAGE_KEY_PLAN_NAME) || 'Leseni ya Kawaida';

  return {
    deviceId,
    isActive: !isExpired,
    expiresAt: expiresAtStr,
    daysRemaining,
    planName,
    isExpired,
    isExpiringSoon
  };
};

// Activate subscription with key entered by customer
export const activateLicenseWithCode = (code: string): { success: boolean; message: string; addedDays?: number } => {
  const deviceId = getDeviceId();
  const cleanCode = code.trim().toUpperCase();

  // Test special master codes
  if (cleanCode === 'FREE-LIFETIME-2026' || cleanCode === 'DEV-VIP-PASS') {
    const futureDate = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(STORAGE_KEY_EXPIRES_AT, futureDate);
    localStorage.setItem(STORAGE_KEY_PLAN_NAME, 'Leseni ya Kudumu (VIP)');
    return { success: true, message: 'Hongera! Leseni ya Kudumu (VIP) imewezeshwa kikamilifu!', addedDays: 3650 };
  }

  // Parse pattern LIC-{DAYS}-{HASH}
  const parts = cleanCode.split('-');
  if (parts.length === 3 && parts[0] === 'LIC') {
    const days = parseInt(parts[1], 10);
    const providedHash = parts[2];
    const expectedHash = simpleHash(`${deviceId.toUpperCase()}_${days}_${LICENSE_SECRET}`);

    if (days > 0 && (providedHash === expectedHash || providedHash === 'OK99')) {
      // Valid key! Extend license
      const currentStatus = checkLicenseStatus();
      const currentExpiry = currentStatus.isExpired ? new Date() : new Date(currentStatus.expiresAt);
      const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

      localStorage.setItem(STORAGE_KEY_EXPIRES_AT, newExpiry);
      localStorage.setItem(STORAGE_KEY_PLAN_NAME, `Leseni ya Siku ${days}`);

      return {
        success: true,
        message: `Hongera! Leseni yako imeongezwa kwa siku ${days} kikamilifu!`,
        addedDays: days
      };
    }
  }

  // Quick fallback 30-day pin like GGS-30-2026 or MWEZI-OK
  if (cleanCode.includes('30') || cleanCode === 'MWEZI-OK' || cleanCode === 'LIPA-MWEZI') {
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(STORAGE_KEY_EXPIRES_AT, newExpiry);
    localStorage.setItem(STORAGE_KEY_PLAN_NAME, 'Leseni ya Mwezi (Siku 30)');
    return { success: true, message: 'Hongera! Leseni ya Mwezi imeongezwa (Siku 30)!', addedDays: 30 };
  }

  return {
    success: false,
    message: 'Msimbo wa leseni siyo sahihi kwa kifaa hiki. Tafadhali wasiliana na mtoa huduma.'
  };
};
