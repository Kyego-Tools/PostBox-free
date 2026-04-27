/**
 * Generate JWT_PRIVATE_KEY, JWKS, and TOKEN_ENCRYPTION_KEY for Convex Auth.
 * Writes a .env file that can be used with `npx convex env set --from-file`.
 *
 * Usage:
 *   node scripts/generate-keys.mjs <output-file>
 *
 * Requires: jose (already in project dependencies via @convex-dev/auth)
 */
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const outputFile = process.argv[2];
if (!outputFile) {
  console.error("Usage: node generate-keys.mjs <output-file>");
  process.exit(1);
}

const keys = await generateKeyPair("RS256", { extractable: true });

const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
const encryptionKey = randomBytes(32).toString("hex");

// Format private key: replace newlines with spaces (Convex Auth convention)
const formattedPrivateKey = privateKey.trimEnd().replace(/\n/g, " ");

// Write as .env file
const envContent = [
  `JWT_PRIVATE_KEY=${formattedPrivateKey}`,
  `JWKS=${jwks}`,
  `TOKEN_ENCRYPTION_KEY=${encryptionKey}`,
].join("\n") + "\n";

writeFileSync(outputFile, envContent);
console.log("  ✓ Generated JWT_PRIVATE_KEY, JWKS, TOKEN_ENCRYPTION_KEY");
