/**
 * GET /api/lti/jwks — the tool's public JSON Web Key Set.
 *
 * Registered in the LMS as the tool's "Public JWK URL". Contains public key
 * material only; when no tool key is configured the key set is empty (and the
 * integration is reported as not configured elsewhere).
 */
import { getPublicJwks } from "@/modules/integrations/lms/lti/keys";

export function GET(): Response {
  return Response.json(getPublicJwks(), {
    headers: {
      // Short-lived so a rotated key is picked up quickly by the platform.
      "cache-control": "public, max-age=300, must-revalidate",
      "x-content-type-options": "nosniff",
    },
  });
}
