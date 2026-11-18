/**
 * Shared, cross-course concept relationships (not per-student).
 *
 * Each relationship must be instructionally real, and its rationale is shown
 * to students, so it has to be accurate at the level of the courses involved.
 * AP Physics 1 and AP Microeconomics do not require calculus; these links are
 * offered as optional connections for students who also take AP Calculus.
 * Relationships whose skills aren't published are skipped by content sync.
 */
import type { SkillRelationType } from "@/db/schema";

export interface CourseRelationship {
  from: string;
  to: string;
  type: SkillRelationType;
  rationale: string;
}

export const COURSE_RELATIONSHIPS: CourseRelationship[] = [
  {
    from: "calculus-ab.power-rule",
    to: "physics-1.xt-graphs",
    type: "APPLIED_IN",
    rationale:
      "The slope of a position–time graph is the derivative of position with respect to time. For x = x₀ + v₀t + ½at², the power rule gives v = v₀ + at.",
  },
  {
    from: "calculus-ab.power-rule",
    to: "physics-1.vt-graphs",
    type: "APPLIED_IN",
    rationale: "Acceleration is the slope (the derivative) of a velocity–time graph, just as velocity is the slope of a position–time graph.",
  },
  {
    from: "calculus-ab.power-rule",
    to: "physics-1.kinematic-equations",
    type: "APPLIED_IN",
    rationale:
      "Differentiating x(t) = x₀ + v₀t + ½at² with the power rule gives v(t) = v₀ + at, and differentiating again gives the constant acceleration a.",
  },
  {
    from: "calculus-ab.power-rule",
    to: "microeconomics.marginal-cost",
    type: "APPLIED_IN",
    rationale:
      "Marginal cost is the derivative of total cost with respect to quantity. For TC = F + aq − bq² + cq³ the power rule gives MC = a − 2bq + 3cq² — and the fixed cost F drops out, which is why fixed cost never affects MC.",
  },
  {
    from: "calculus-ab.power-rule",
    to: "microeconomics.profit-max-rule",
    type: "APPLIED_IN",
    rationale:
      "Profit is highest where its derivative is zero: for a price-taking firm, d(P·q − TC)/dq = P − MC = 0, which is the MR = MC rule.",
  },
  {
    from: "calculus-ab.chain-interpret",
    to: "microeconomics.marginal-cost",
    type: "RELATED_TO",
    rationale:
      "Linked rates multiply: if labour is the only variable input, the cost of one more unit of output is (cost per worker) × (workers per unit of output), so MC = wage ÷ marginal product of labour.",
  },
  {
    from: "physics-1.vt-graphs",
    to: "physics-1.xt-graphs",
    type: "RELATED_TO",
    rationale: "The slope of the position–time graph at any instant equals the height of the velocity–time graph at that instant.",
  },
];
