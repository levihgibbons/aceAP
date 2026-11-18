/**
 * Search over shared curriculum (full 43-course catalog + pilot content) and
 * the requester's own vault notes.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lessonVersions, questionVersions, skills, vaultNotes } from "@/db/schema";
import { describeCorrectAnswer } from "@/modules/assessments/grading";
import { createUser, type SessionUser } from "@/modules/auth/service";
import { syncContent } from "@/modules/content/sync";
import { invalidateSearchIndex, search, stem, tokenize, type SearchResponse } from "@/modules/search/service";

let alice: SessionUser;
let bob: SessionUser;
let teacher: SessionUser;
let aliceNoteId: string;
let bobNoteId: string;

beforeAll(async () => {
  const db = await getDb();
  await syncContent(db);
  invalidateSearchIndex();
  const pw = "correct-horse-battery";
  alice = await createUser({ name: "Alice", email: "alice@search.test", password: pw, role: "student" });
  bob = await createUser({ name: "Bob", email: "bob@search.test", password: pw, role: "student" });
  teacher = await createUser({ name: "Tess", email: "tess@search.test", password: pw, role: "teacher", createPersonalOrganization: true });
  [{ id: aliceNoteId }] = await db
    .insert(vaultNotes)
    .values({ userId: alice.id, title: "Photosynthesis summary", body: "Light reactions happen in the **chloroplast**. Mnemonic: zebrafinch.", tags: ["biology"] })
    .returning({ id: vaultNotes.id });
  [{ id: bobNoteId }] = await db
    .insert(vaultNotes)
    .values({ userId: bob.id, title: "Bob's private plan", body: "Photosynthesis quokka secret. Chain rule trig derivative zebrafinch.", tags: [] })
    .returning({ id: vaultNotes.id });
});

const allResults = (r: SearchResponse) => [...r.courses, ...r.units, ...r.lessons, ...r.skills, ...r.objectives, ...r.formulas, ...r.notes];

describe("text processing", () => {
  it("stems plurals, -ing and -ed forms to the same root", () => {
    expect(stem("derivatives")).toBe(stem("derivative"));
    expect(stem("differentiating")).toBe(stem("differentiate"));
    expect(stem("maximizing")).toBe(stem("maximization"));
    expect(stem("graphs")).toBe("graph");
    expect(stem("velocities")).toBe("velocity");
  });

  it("drops stop words and strips Markdown and LaTeX", () => {
    expect(tokenize("How do I find the **slope**?")).toEqual([stem("slope")]);
    expect(tokenize(String.raw`$\dfrac{d}{dx}\left[\sin x\right]$`)).toEqual(expect.arrayContaining(["sin", stem("derivative")]));
  });
});

describe("curriculum ranking", () => {
  it("'chain rule trig' ranks the trig chain-rule skill first and calculus above physics", async () => {
    const r = await search(alice, "chain rule trig");
    expect(r.skills[0]).toMatchObject({ id: "calculus-ab.chain-trig", href: "/app/skills/calculus-ab.chain-trig", courseId: "calculus-ab", courseName: "AP Calculus AB" });
    expect(r.skills[0].reason.length).toBeGreaterThan(5);
    expect(r.lessons[0].id).toBe("calculus-ab.l.chain-functions");
    expect(r.lessons[0].href).toBe("/app/learn/calculus-ab.l.chain-functions");
    expect(r.best.slice(0, 5).every((x) => x.courseId === "calculus-ab" || x.group === "notes")).toBe(true);
  });

  it("'derivative of sin(x^2)' recognises a composite and points at the chain rule", async () => {
    const r = await search(alice, "derivative of sin(x^2)");
    expect(r.skills[0].id).toBe("calculus-ab.chain-trig");
    expect(r.best[0].courseId).toBe("calculus-ab");
  });

  it("'difference between distance and displacement' finds the physics skill and lesson", async () => {
    const r = await search(alice, "difference between distance and displacement");
    expect(r.skills[0].id).toBe("physics-1.distance-vs-displacement");
    expect(r.lessons[0].id).toBe("physics-1.l.position-displacement");
    expect(r.best[0].courseId).toBe("physics-1");
    expect(r.skills.some((s) => s.courseId === "calculus-ab")).toBe(false);
  });

  it("'area under velocity time graph' finds velocity–time graphs", async () => {
    const r = await search(alice, "area under velocity time graph");
    expect(r.skills[0].id).toBe("physics-1.vt-graphs");
    expect(r.best[0].courseId).toBe("physics-1");
    // Both Unit 1 graph lessons teach the area under a velocity–time graph.
    expect(r.lessons.slice(0, 2).map((l) => l.id)).toContain("physics-1.l.motion-graphs");
    expect(r.lessons[0].id).toMatch(/^physics-1\.l\./);
  });

  it("matches lesson text, formula captions and LaTeX-derived tokens", async () => {
    const r = await search(alice, "leibniz notation rates multiply");
    const f = r.formulas.find((x) => x.latex?.includes(String.raw`\frac{dy}{dx}`));
    expect(f).toBeDefined();
    expect(f!.href).toBe("/app/learn/calculus-ab.l.chain-rule");
    const dydx = await search(alice, "dy/dx");
    expect(dydx.formulas.length + dydx.lessons.length).toBeGreaterThan(0);
  });

  it("boosts skills linked to a matching lesson", async () => {
    const r = await search(alice, "gear turns 3 times as fast");
    // Only the lesson text mentions gears; the skill it teaches is pulled in by the relationship.
    expect(r.lessons[0].id).toBe("calculus-ab.l.chain-rule");
    const linked = r.skills.find((s) => s.id === "calculus-ab.chain-polynomial");
    expect(linked?.reason).toMatch(/lesson/i);
  });

  it("filters by course and returns nothing for stop-word-only queries", async () => {
    const r = await search(alice, "graph slope", { courseId: "physics-1" });
    const curriculum = allResults(r).filter((x) => x.group !== "notes");
    expect(curriculum.length).toBeGreaterThan(0);
    expect(curriculum.every((x) => x.courseId === "physics-1")).toBe(true);
    const empty = await search(alice, "how do I the");
    expect(empty.best).toEqual([]);
    await expect(search(alice, "x".repeat(400))).rejects.toMatchObject({ code: "invalid" });
  });

  it("profit-maximizing monopoly query ranks the microeconomics rule first (when that course is registered)", async () => {
    const db = await getDb();
    const [micro] = await db.select({ id: skills.id }).from(skills).where(eq(skills.id, "microeconomics.profit-max-rule"));
    if (!micro) return; // Microeconomics content not registered in this build.
    const r = await search(alice, "How do I find profit-maximizing quantity in a monopoly?");
    expect(r.skills[0].id).toBe("microeconomics.profit-max-rule");
  });
});

describe("catalog honesty", () => {
  it("'photosynthesis' finds AP Biology's outline, flagged as not yet available", async () => {
    const r = await search(alice, "photosynthesis");
    const bio = allResults(r).filter((x) => x.courseId === "biology");
    expect(bio.length).toBeGreaterThan(0);
    for (const b of bio) {
      expect(b.availability).not.toBe("available");
      expect(b.reason).toMatch(/outline only|catalog listing only/i);
    }
    expect(r.units.some((u) => u.courseId === "biology" && u.href === "/app/courses/biology/units/unit-3")).toBe(true);
    expect(r.skills.some((s) => s.courseId === "calculus-ab")).toBe(false);
  });

  it("finds catalog-only courses by name", async () => {
    const r = await search(alice, "Art History");
    expect(r.courses[0]).toMatchObject({ id: "art-history", href: "/app/courses/art-history" });
    expect(r.courses[0].availability).not.toBe("available");
  });
});

describe("privacy", () => {
  it("returns the requester's own notes and never another user's", async () => {
    const a = await search(alice, "photosynthesis");
    expect(a.notes.map((n) => n.id)).toEqual([aliceNoteId]);
    expect(a.notes[0].href).toBe(`/app/vault/notes?note=${aliceNoteId}`);
    expect(JSON.stringify(a)).not.toContain(bobNoteId);

    const quokka = await search(alice, "quokka");
    expect(quokka.notes).toEqual([]);
    const bobs = await search(bob, "quokka");
    expect(bobs.notes.map((n) => n.id)).toEqual([bobNoteId]);

    const shared = await search(alice, "zebrafinch");
    expect(shared.notes.map((n) => n.id)).toEqual([aliceNoteId]);
    const asTeacher = await search(teacher, "zebrafinch");
    expect(asTeacher.notes).toEqual([]);
  });

  it("never indexes question answer keys or solutions", async () => {
    const db = await getDb();
    const lessonText = JSON.stringify(await db.select({ b: lessonVersions.blocks }).from(lessonVersions)).toLowerCase();
    const versions = await db.select().from(questionVersions);
    const secrets: string[] = [];
    for (const v of versions) {
      for (const text of [v.solution, describeCorrectAnswer(v.body)]) {
        const chunk = text.match(/[A-Za-z][A-Za-z ,.()]{29,}/)?.[0]?.trim();
        if (chunk && chunk.length >= 30 && !lessonText.includes(chunk.toLowerCase())) secrets.push(chunk);
      }
      if (secrets.length >= 6) break;
    }
    expect(secrets.length).toBeGreaterThan(0);
    for (const secret of secrets) {
      const r = await search(alice, secret.split(/\s+/).slice(0, 8).join(" "), { limit: 50 });
      // Everything except the echoed query itself.
      expect(JSON.stringify(allResults(r).concat(r.best)).toLowerCase()).not.toContain(secret.toLowerCase());
    }
  });
});

describe("index cache", () => {
  it("rebuilds after invalidation with the same results", async () => {
    const before = await search(alice, "chain rule trig");
    invalidateSearchIndex();
    const after = await search(alice, "chain rule trig");
    expect(after.best.map((x) => x.id)).toEqual(before.best.map((x) => x.id));
  });
});
