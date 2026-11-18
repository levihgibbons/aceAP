/**
 * Content licensing registry. Every third-party resource AceAP references,
 * links, embeds or adapts must have a row here BEFORE it is used.
 * "not_used" rows record resources that were evaluated and deliberately left out.
 */
export interface ContentSourceRow {
  id: string;
  title: string;
  provider: string;
  url: string;
  license: string;
  attribution: string;
  commercialUse: "allowed" | "not_allowed" | "requires_agreement" | "unverified";
  modification: "allowed" | "not_allowed" | "unverified";
  usage: "alignment_reference" | "linked" | "embedded" | "adapted" | "not_used";
  approvalStatus: "approved" | "pending_review" | "rejected";
  notes: string;
  reviewedOn: string | null;
}

export const CONTENT_SOURCES: ContentSourceRow[] = [
  {
    id: "collegeboard-ap-central-course-index",
    title: "AP Central course index and course pages",
    provider: "College Board",
    url: "https://apcentral.collegeboard.org/courses",
    license: "© College Board. All rights reserved. AP® is a registered trademark of College Board.",
    attribution: "AP® and Advanced Placement® are trademarks registered by the College Board, which is not affiliated with, and does not endorse, AceAP.",
    commercialUse: "not_allowed",
    modification: "not_allowed",
    usage: "alignment_reference",
    approvalStatus: "approved",
    notes:
      "Used only as an alignment reference: official course names and unit titles (short factual names) are listed with links back to the source. No learning objectives, essential knowledge statements, exam questions or other College Board text are reproduced. All lessons and questions are original.",
    reviewedOn: "2026-11-17",
  },
  {
    id: "phet-interactive-simulations",
    title: "PhET Interactive Simulations",
    provider: "University of Colorado Boulder",
    url: "https://phet.colorado.edu/en/licensing",
    license: "Licence terms must be confirmed on the provider's licensing page for each simulation before any use.",
    attribution: "PhET Interactive Simulations, University of Colorado Boulder, https://phet.colorado.edu",
    commercialUse: "unverified",
    modification: "unverified",
    usage: "not_used",
    approvalStatus: "pending_review",
    notes:
      "Not embedded or redistributed. AceAP is intended to be a commercial product, so commercial-use and embedding terms require legal review first. AceAP ships original native simulations instead. Iframe embeds would not expose simulation-internal telemetry.",
    reviewedOn: null,
  },
  {
    id: "openstax-textbooks",
    title: "OpenStax textbooks (Calculus, University/College Physics, Principles of Microeconomics)",
    provider: "OpenStax, Rice University",
    url: "https://openstax.org/",
    license: "Varies by title (some are CC BY 4.0, some CC BY-NC-SA 4.0). Must be verified per book and edition.",
    attribution: "Per-title attribution statement required by each book's licence.",
    commercialUse: "unverified",
    modification: "unverified",
    usage: "not_used",
    approvalStatus: "pending_review",
    notes: "No OpenStax text or figures are used. Non-commercial (NC) titles could not be adapted for a commercial product. Verify the licence of each specific work before linking or adapting.",
    reviewedOn: null,
  },
  {
    id: "openstax-college-physics-ap-2e",
    title: "College Physics for AP® Courses 2e",
    provider: "OpenStax, Rice University",
    url: "https://openstax.org/details/books/college-physics-ap-courses-2e",
    license: "CC BY 4.0 (as stated on the book's page; re-verify before any adaptation).",
    attribution: "If text or figures are ever adapted: “Access for free at openstax.org”, with the CC BY 4.0 notice and a list of changes.",
    commercialUse: "allowed",
    modification: "allowed",
    usage: "alignment_reference",
    approvalStatus: "pending_review",
    notes:
      "Consulted only to check the topic scope of the AP Physics 1 units (which ideas an algebra-based course covers, and in what order). No OpenStax text, worked examples, problems or figures are reproduced or adapted; every AceAP lesson and question is original. Human review should confirm the licence before any future adaptation.",
    reviewedOn: null,
  },
];
