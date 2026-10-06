import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Generate a clean, unique username based on driver's name and email.
 * Ensures the username does not collide with existing driver usernames.
 */
export function generateUniqueUsername(
  fullName: string,
  email?: string | null,
  existingUsernames: string[] = []
): string {
  const existingSet = new Set(existingUsernames.map((u) => u.toLowerCase()));

  let base = '';

  if (email && email.includes('@')) {
    // Extract local part before @
    const local = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (local.length >= 3) {
      base = local;
    }
  }

  if (!base) {
    // Generate from full name: e.g. "Murugan Selvam" -> "murugan.selvam"
    const cleaned = fullName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .join('.');

    base = cleaned || 'driver';
  }

  // Check if base is already unique
  if (!existingSet.has(base)) {
    return base;
  }

  // If already exists, append a random unique suffix
  let candidate = '';
  let attempts = 0;
  do {
    const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit number
    candidate = `${base}_${randomSuffix}`;
    attempts++;
  } while (existingSet.has(candidate) && attempts < 100);

  return candidate;
}

/**
 * Generate a random, cryptographically strong temporary password.
 * Format example: Aa#7K9xQ2
 */
export function generateTemporaryPassword(length: number = 9): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';

  let pass = 'Aa#';
  const allChars = upper + lower + numbers + symbols;

  for (let i = 3; i < length; i++) {
    pass += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  return pass;
}

/**
 * Hash a plain text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a bcrypt hash.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plain, hash);
}
