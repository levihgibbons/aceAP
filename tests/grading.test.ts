import { describe, expect, it } from "vitest";
import { gradeResponse, toStudentQuestion, type GradeResult } from "@/modules/assessments/grading";
import { compileExpression, expressionsEquivalent, normalizeInput, parseNumber } from "@/modules/assessments/math";
import type { QuestionBody } from "@/modules/content/schema";

const scoreOf = (r: GradeResult) => (r.status === "graded" ? r.score : r.status);

describe("expression grading", () => {
  const body: QuestionBody = {
    type: "expression",
    answer: "6*x*(x^2+1)^2",
    variables: ["x"],
    commonErrors: [{ expr: "3*(x^2+1)^2", misconception: "m.inner", note: "Multiply by the derivative of the inside." }],
  };
  const grade = (value: string) => gradeResponse("q.test", body, { type: "expression", value });

  it("accepts algebraically equivalent forms", () => {
    for (const v of ["6*x*(x^2+1)^2", "6x(x^2+1)^2", "(x^2+1)^2*6x", "3(x^2+1)^2 * 2x", "6x^5 + 12x^3 + 6x", "f'(x) = 6x(x²+1)²", "6·x·(x^2+1)^2"])
      expect(scoreOf(grade(v)), v).toBe(1);
  });

  it("rejects wrong answers and tags a known common error", () => {
    const r = grade("3(x^2+1)^2");
    expect(r).toMatchObject({ status: "graded", score: 0, misconceptionId: "m.inner" });
    expect(grade("6x(x^2+1)")).toMatchObject({ status: "graded", score: 0, misconceptionId: null });
    expect(grade("6x(x^2+1)^2 + 0.001")).toMatchObject({ status: "graded", score: 0 });
  });

  it("returns invalid (not incorrect) for unreadable input", () => {
    expect(grade("6x(x^2+1")).toMatchObject({ status: "invalid" });
    expect(grade("")).toMatchObject({ status: "invalid" });
    expect(grade("6y")).toMatchObject({ status: "invalid" });
    expect(grade("log(x)").status).toBe("invalid");
  });

  it("refuses anything that is not plain mathematics", () => {
    for (const evil of ["x = 5", "g(t) = t", "import('fs')", "a.b", "[1,2]", "{a:1}", "x; 2", "createUnit('x')", "evaluate('1')", "cos.constructor", '"x"'])
      expect(grade(evil).status, evil).toBe("invalid");
  });

  it("handles trig, exponential and log answers", () => {
    const trig: QuestionBody = { type: "expression", answer: "3*cos(3*x)", variables: ["x"] };
    expect(scoreOf(gradeResponse("t", trig, { type: "expression", value: "3cos(3x)" }))).toBe(1);
    expect(scoreOf(gradeResponse("t", trig, { type: "expression", value: "cos(3x)" }))).toBe(0);
    const expo: QuestionBody = { type: "expression", answer: "2*x*e^(x^2)", variables: ["x"] };
    expect(scoreOf(gradeResponse("e", expo, { type: "expression", value: "2x exp(x^2)" }))).toBe(1);
    const ln: QuestionBody = { type: "expression", answer: "2*x/(x^2+1)", variables: ["x"] };
    expect(scoreOf(gradeResponse("l", ln, { type: "expression", value: "(2x)/(x^2+1)" }))).toBe(1);
    const domain: QuestionBody = { type: "expression", answer: "1/x", variables: ["x"], domain: [0.5, 4] };
    expect(scoreOf(gradeResponse("d", domain, { type: "expression", value: "x^(-1)" }))).toBe(1);
  });

  it("does not treat a function undefined on the domain as equivalent", () => {
    const ref = compileExpression("x", ["x"]);
    const cand = compileExpression("sqrt(x)^2", ["x"]);
    expect(expressionsEquivalent(ref, cand, { variables: ["x"], seed: "s", domain: [-3, 3] })).toBe(false);
    expect(expressionsEquivalent(ref, cand, { variables: ["x"], seed: "s", domain: [0.5, 3] })).toBe(true);
  });
});

describe("numeric grading", () => {
  const body: QuestionBody = {
    type: "numeric",
    answer: 12.5,
    tolerance: { abs: 0.05 },
    unit: "m",
    commonErrors: [{ value: 25, misconception: "m.half", note: "Don't forget the ½." }],
  };
  const grade = (value: string) => gradeResponse("n", body, { type: "numeric", value });

  it("applies tolerance and accepts fractions", () => {
    expect(scoreOf(grade("12.5"))).toBe(1);
    expect(scoreOf(grade("12.54"))).toBe(1);
    expect(scoreOf(grade("25/2"))).toBe(1);
    expect(scoreOf(grade("12.6"))).toBe(0);
    expect(scoreOf(grade("-12.5"))).toBe(0);
  });

  it("supports relative tolerance", () => {
    const rel: QuestionBody = { type: "numeric", answer: 2000, tolerance: { rel: 0.01 } };
    expect(scoreOf(gradeResponse("r", rel, { type: "numeric", value: "2015" }))).toBe(1);
    expect(scoreOf(gradeResponse("r", rel, { type: "numeric", value: "2,000" }))).toBe(1);
    expect(scoreOf(gradeResponse("r", rel, { type: "numeric", value: "2030" }))).toBe(0);
  });

  it("tags common errors and rejects non-numbers as invalid", () => {
    expect(grade("25")).toMatchObject({ status: "graded", score: 0, misconceptionId: "m.half" });
    expect(grade("twelve").status).toBe("invalid");
    expect(grade("1/0").status).toBe("invalid");
  });

  it("parses the notations students type", () => {
    expect(parseNumber("−3.5")).toBe(-3.5);
    expect(parseNumber("2*sqrt(4)")).toBe(4);
    expect(normalizeInput("x² · 3")).toBe("x^2 * 3");
  });
});

describe("selection, ordering and matching", () => {
  const mc: QuestionBody = {
    type: "multiple_choice",
    choices: [
      { id: "a", text: "A", misconception: "m.a", rationale: "Why A is tempting" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
    ],
    correctChoiceId: "b",
  };

  it("grades multiple choice and surfaces the distractor's misconception", () => {
    expect(scoreOf(gradeResponse("m", mc, { type: "multiple_choice", choiceId: "b" }))).toBe(1);
    expect(gradeResponse("m", mc, { type: "multiple_choice", choiceId: "a" })).toMatchObject({ score: 0, misconceptionId: "m.a", note: "Why A is tempting" });
    expect(gradeResponse("m", mc, { type: "multiple_choice", choiceId: "zzz" }).status).toBe("invalid");
    expect(gradeResponse("m", mc, { type: "numeric", value: "1" }).status).toBe("invalid");
  });

  it("requires the exact set for select-all", () => {
    const ms: QuestionBody = { type: "multi_select", choices: mc.choices, correctChoiceIds: ["a", "c"] };
    expect(scoreOf(gradeResponse("s", ms, { type: "multi_select", choiceIds: ["c", "a"] }))).toBe(1);
    expect(scoreOf(gradeResponse("s", ms, { type: "multi_select", choiceIds: ["a"] }))).toBe(0);
    expect(scoreOf(gradeResponse("s", ms, { type: "multi_select", choiceIds: ["a", "b", "c"] }))).toBe(0);
  });

  it("grades ordering and gives partial credit on matching", () => {
    const ord: QuestionBody = { type: "ordering", items: [{ id: "1", text: "x" }, { id: "2", text: "y" }, { id: "3", text: "z" }], correctOrder: ["1", "2", "3"] };
    expect(scoreOf(gradeResponse("o", ord, { type: "ordering", order: ["1", "2", "3"] }))).toBe(1);
    expect(scoreOf(gradeResponse("o", ord, { type: "ordering", order: ["2", "1", "3"] }))).toBe(0);
    expect(gradeResponse("o", ord, { type: "ordering", order: ["1", "2"] }).status).toBe("invalid");

    const match: QuestionBody = {
      type: "matching",
      left: [{ id: "l1", text: "" }, { id: "l2", text: "" }],
      right: [{ id: "r1", text: "" }, { id: "r2", text: "" }],
      pairs: { l1: "r1", l2: "r2" },
    };
    expect(scoreOf(gradeResponse("x", match, { type: "matching", pairs: { l1: "r1", l2: "r2" } }))).toBe(1);
    const half = gradeResponse("x", match, { type: "matching", pairs: { l1: "r1", l2: "r1" } });
    expect(half).toMatchObject({ status: "graded", score: 0.5, correct: false });
  });

  it("holds written responses for teacher review", () => {
    const sr: QuestionBody = { type: "short_response", rubric: [{ id: "c1", description: "", points: 2 }], sampleResponse: "" };
    expect(gradeResponse("w", sr, { type: "short_response", text: "Because marginal cost rises." }).status).toBe("pending_review");
  });
});

describe("student view of a question", () => {
  it("never includes the answer key, rationales or misconception tags", () => {
    const view = toStudentQuestion(
      {
        id: "q",
        version: 1,
        prompt: "P",
        difficulty: 2,
        hints: ["h1", "h2"],
        stimulus: null,
        body: {
          type: "multiple_choice",
          choices: [
            { id: "a", text: "A", misconception: "secret-tag", rationale: "secret-rationale" },
            { id: "b", text: "B" },
          ],
          correctChoiceId: "b",
        },
      },
      "attempt-1",
    );
    const json = JSON.stringify(view);
    expect(json).not.toContain("secret");
    expect(json).not.toContain("correctChoiceId");
    expect(view.hintCount).toBe(2);
    const again = toStudentQuestion({ id: "q", version: 1, prompt: "P", difficulty: 2, hints: [], stimulus: null, body: { type: "expression", answer: "2*x", variables: ["x"] } }, "s");
    expect(JSON.stringify(again)).not.toContain("2*x");
  });
});
