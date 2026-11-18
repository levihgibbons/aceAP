/**
 * Answer keys for the questions the browser tests answer.
 *
 * PGlite lets only one process open a data directory and the e2e server holds
 * `.data/e2e`, so the tests can't read answer keys from the database. These
 * are copied from the authored content (verified by `npm run content:validate`):
 *   content/courses/calculus-ab.questions.ts
 *   content/courses/physics-1.questions.ts
 * Each entry also has a `marker`: a substring of the question's KaTeX source
 * (KaTeX keeps the TeX in a MathML <annotation>), used to recognise the
 * question when an attempt shuffles its order.
 */

export type AnswerKey =
  | { type: "expression"; correct: string; wrong?: { value: string; misconception: string } }
  | { type: "numeric"; correct: string; wrong?: { value: string; misconception: string } }
  | { type: "multiple_choice"; correct: string; wrong?: { value: string; misconception: string } };

export interface KnownQuestion {
  id: string;
  marker: string;
  key: AnswerKey;
}

/** calculus-ab.q.cp-1 — d/dx (x^2+1)^3 (chain-rule lesson check 1). */
export const CP1: KnownQuestion = {
  id: "calculus-ab.q.cp-1",
  marker: "(x^2+1)^3",
  key: {
    type: "expression",
    correct: "6*x*(x^2+1)^2",
    wrong: { value: "3*(x^2+1)^2", misconception: "Omitted the derivative of the inner function" },
  },
};

/** calculus-ab.q.cp-2 — d/dx (3x-5)^4 (chain-rule lesson check 2). */
export const CP2: KnownQuestion = {
  id: "calculus-ab.q.cp-2",
  marker: "(3x-5)^4",
  key: {
    type: "expression",
    correct: "12*(3*x-5)^3",
    wrong: { value: "4*(3*x-5)^3", misconception: "Omitted the derivative of the inner function" },
  },
};

/** The six questions of calculus-ab.quiz.chain. */
export const CHAIN_QUIZ: KnownQuestion[] = [
  {
    id: "calculus-ab.q.io-4",
    marker: "\\sqrt{x^2+9}",
    key: {
      type: "multiple_choice",
      correct: "b",
      wrong: { value: "a", misconception: "Swapped the inner and outer functions" },
    },
  },
  {
    id: "calculus-ab.q.cp-4",
    marker: "(2x^3+x)^5",
    key: { type: "expression", correct: "5*(2*x^3+x)^4*(6*x^2+1)" },
  },
  {
    id: "calculus-ab.q.ct-2",
    marker: "\\cos\\!\\left(x^2\\right)",
    key: { type: "expression", correct: "-2*x*sin(x^2)" },
  },
  {
    id: "calculus-ab.q.ce-2",
    marker: "e^{x^2}",
    key: { type: "expression", correct: "2*x*e^(x^2)" },
  },
  {
    id: "calculus-ab.q.cl-1",
    marker: "\\ln\\!\\left(x^2+1\\right)",
    key: { type: "expression", correct: "2*x/(x^2+1)" },
  },
  {
    id: "calculus-ab.q.ci-2",
    marker: "h(x)=g(f(x))",
    key: {
      type: "numeric",
      correct: "10",
      wrong: {
        value: "12",
        misconception: "Evaluated the outer derivative at x instead of at g(x)",
      },
    },
  },
];

/** physics-1.q.ke-8 — Motion Lab turnaround time (kinematic-equations lesson check). */
export const KE8: KnownQuestion = {
  id: "physics-1.q.ke-8",
  marker: "turns around",
  key: { type: "numeric", correct: "3", wrong: { value: "6", misconception: "" } },
};

export const SKILLS = {
  chainPolynomial: { id: "calculus-ab.chain-polynomial", name: "Chain rule: powers of functions" },
} as const;
