import { describe, expect, it } from "vitest";
import { pendingFromLaunch, signPendingLink, verifyPendingLink } from "@/modules/integrations/lms/launchFlow";
import type { LaunchContext } from "@/modules/integrations/lms/types";

const SECRET = "test-secret-for-pending-links-0123456789";
const T0 = new Date("2026-11-17T12:00:00Z");

const launch: LaunchContext = {
  connectionId: "11111111-1111-1111-1111-111111111111",
  organizationId: "22222222-2222-2222-2222-222222222222",
  messageType: "LtiResourceLinkRequest",
  issuer: "https://canvas.test",
  clientId: "1000",
  deploymentId: "dep",
  userSub: "canvas-user-42",
  roles: ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"],
  userName: "Someone",
  userEmail: "someone@example.test",
  context: { id: "course-1", title: "AP Calculus AB", label: null },
  resourceLink: { id: "rl-1", title: null },
  targetLinkUri: "https://aceap.test/api/lti/launch",
  custom: { aceap_assignment_id: "33333333-3333-3333-3333-333333333333" },
  ags: null,
  nrps: null,
  deepLinking: null,
};

describe("LTI pending-link tokens", () => {
  it("round-trips the launch facts needed to link, without names or emails", () => {
    const p = pendingFromLaunch(launch, T0)!;
    const token = signPendingLink(p, SECRET);
    const back = verifyPendingLink(token, T0, SECRET)!;
    expect(back).toMatchObject({ connectionId: launch.connectionId, userSub: "canvas-user-42", instructor: false, assignmentId: launch.custom.aceap_assignment_id });
    expect(token).not.toContain("someone");
    expect(JSON.stringify(back)).not.toContain("someone@example.test");
  });

  it("rejects tampered, foreign-key and expired tokens", () => {
    const token = signPendingLink(pendingFromLaunch(launch, T0)!, SECRET);
    const [body, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), userSub: "attacker" })).toString("base64url");
    expect(verifyPendingLink(`${forged}.${mac}`, T0, SECRET)).toBeNull();
    expect(verifyPendingLink(token, T0, "a-different-secret-entirely-xxxxxxxx")).toBeNull();
    expect(verifyPendingLink(token, new Date(T0.getTime() + 11 * 60_000), SECRET)).toBeNull();
    expect(verifyPendingLink("garbage", T0, SECRET)).toBeNull();
  });

  it("anonymous launches produce no pending link", () => {
    expect(pendingFromLaunch({ ...launch, userSub: null }, T0)).toBeNull();
  });
});
