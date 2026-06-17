import argon2 from "argon2";

// Single source of truth for password hashing. argon2id is the recommended
// variant (resistant to both GPU and side-channel attacks). Defaults from the
// argon2 library are OWASP-reasonable; kept explicit so they're auditable.
const OPTIONS: argon2.Options = { type: argon2.argon2id };

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // A malformed hash (e.g. not an argon2 digest) throws — treat as no match.
    return false;
  }
}
