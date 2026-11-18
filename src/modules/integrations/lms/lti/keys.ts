/**
 * The tool's (AceAP's) RSA signing key.
 *
 * Loaded from `LTI_TOOL_PRIVATE_KEY` (PEM, PKCS#8 or PKCS#1) and
 * `LTI_TOOL_KEY_ID`. Used to sign OAuth2 client assertions and deep-linking
 * responses; the public half is published as a JWKS for the platform.
 *
 * Private material never leaves this module: nothing here logs it, returns it
 * or includes it in an error message.
 */
import { createHmac, createPrivateKey, createPublicKey, generateKeyPairSync, type KeyObject } from "node:crypto";
import { SignJWT, type JWK, type JWTPayload } from "jose";
import { fail, ok, systemClock, type Clock, type LmsResult } from "../types";

export const DEFAULT_TOOL_KEY_ID = "aceap-lti-key-1";
export const TOOL_SIGNING_ALG = "RS256";
const MIN_MODULUS_BITS = 2048;

export interface ToolKeyStatus {
  configured: boolean;
  kid: string;
  /** Why the key is unusable. Present only when `configured` is false. */
  reason?: string;
}

export interface PublicJwks {
  keys: JWK[];
}

interface LoadedKey {
  kid: string;
  privateKey: KeyObject;
  publicJwk: JWK;
}

type LoadOutcome = { ok: true; key: LoadedKey } | { ok: false; kid: string; reason: string };

export type ToolKeyEnv = Record<string, string | undefined>;

let cache: { pem: string; kid: string; outcome: LoadOutcome } | null = null;

/** Accepts PEMs pasted into env files with literal `\n` sequences or wrapping quotes. */
function normalisePem(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .trim();
}

function parseKey(pem: string, kid: string): LoadOutcome {
  if (!pem) return { ok: false, kid, reason: "LTI_TOOL_PRIVATE_KEY is not set." };
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey({ key: pem, format: "pem" });
  } catch {
    // Deliberately do not include the parser's message: it can echo key bytes.
    return { ok: false, kid, reason: "LTI_TOOL_PRIVATE_KEY is not a valid PEM-encoded private key." };
  }
  if (privateKey.asymmetricKeyType !== "rsa") {
    return { ok: false, kid, reason: "LTI_TOOL_PRIVATE_KEY must be an RSA key (RS256)." };
  }
  const bits = privateKey.asymmetricKeyDetails?.modulusLength ?? 0;
  if (bits < MIN_MODULUS_BITS) {
    return { ok: false, kid, reason: `LTI_TOOL_PRIVATE_KEY must be at least ${MIN_MODULUS_BITS} bits.` };
  }
  const exported = createPublicKey(privateKey).export({ format: "jwk" });
  const publicJwk: JWK = { kty: "RSA", n: exported.n, e: exported.e, kid, alg: TOOL_SIGNING_ALG, use: "sig" };
  return { ok: true, key: { kid, privateKey, publicJwk } };
}

function load(env: ToolKeyEnv = process.env): LoadOutcome {
  const pem = normalisePem(env.LTI_TOOL_PRIVATE_KEY);
  const kid = env.LTI_TOOL_KEY_ID?.trim() || DEFAULT_TOOL_KEY_ID;
  if (cache && cache.pem === pem && cache.kid === kid) return cache.outcome;
  const outcome = parseKey(pem, kid);
  cache = { pem, kid, outcome };
  return outcome;
}

/** Whether a usable tool key is configured. Never throws. */
export function getToolKeyStatus(env?: ToolKeyEnv): ToolKeyStatus {
  const outcome = load(env);
  return outcome.ok ? { configured: true, kid: outcome.key.kid } : { configured: false, kid: outcome.kid, reason: outcome.reason };
}

/** Public key set for the platform. An empty set when no key is configured. */
export function getPublicJwks(env?: ToolKeyEnv): PublicJwks {
  const outcome = load(env);
  return { keys: outcome.ok ? [{ ...outcome.key.publicJwk }] : [] };
}

export interface SignOptions {
  expiresInSeconds: number;
  now?: Clock;
  env?: ToolKeyEnv;
}

/** Sign `claims` with the tool key (RS256, `kid` header). `iat`/`exp` are set here. */
export async function signToolJwt(claims: JWTPayload, options: SignOptions): Promise<LmsResult<string>> {
  const outcome = load(options.env);
  if (!outcome.ok) return fail("not_configured", `LTI tool key is not configured: ${outcome.reason}`);
  const issuedAt = Math.floor((options.now ?? systemClock)().getTime() / 1000);
  const jwt = await new SignJWT(claims)
    .setProtectedHeader({ alg: TOOL_SIGNING_ALG, kid: outcome.key.kid, typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + options.expiresInSeconds)
    .sign(outcome.key.privateKey);
  return ok(jwt);
}

/**
 * Secret for HMAC-signing OIDC state tokens, derived from the tool key so no
 * extra secret has to be provisioned. Null when no key is configured.
 */
export function deriveStateSecret(env?: ToolKeyEnv): Buffer | null {
  const outcome = load(env);
  if (!outcome.ok) return null;
  const der = outcome.key.privateKey.export({ format: "der", type: "pkcs8" });
  return createHmac("sha256", der).update("aceap:lti:oidc-state:v1").digest();
}

/**
 * Generate a fresh RSA private key as a PKCS#8 PEM, for documentation and
 * tests. It is returned to the caller only — never written to disk, the
 * environment or the database.
 */
export function generateDevKeyPem(modulusLength = MIN_MODULUS_BITS): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength });
  return privateKey.export({ format: "pem", type: "pkcs8" }).toString();
}
