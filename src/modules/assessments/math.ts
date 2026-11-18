/**
 * Safe mathematical expression handling for grading.
 *
 * Student input is parsed with mathjs into an AST, checked against a strict
 * whitelist (no assignments, property access, function definitions or unknown
 * symbols) and only then evaluated. Equivalence is decided by deterministic
 * numeric sampling, which accepts any algebraically equivalent form.
 */
import { create, all, type MathNode } from "mathjs";

const math = create(all, {});

const ALLOWED_FUNCTIONS = new Set([
  "sin", "cos", "tan", "sec", "csc", "cot",
  "asin", "acos", "atan", "arcsin", "arccos", "arctan",
  "sinh", "cosh", "tanh",
  "sqrt", "cbrt", "exp", "ln", "log10", "log2", "abs",
]);
const CONSTANTS = new Set(["e", "pi"]);
const ALLOWED_OPERATORS = new Set(["+", "-", "*", "/", "^", "unaryMinus", "unaryPlus"]);

const EXTRA_SCOPE = {
  ln: (x: number) => Math.log(x),
  arcsin: (x: number) => Math.asin(x),
  arccos: (x: number) => Math.acos(x),
  arctan: (x: number) => Math.atan(x),
};

export class ExpressionError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
  }
}

/** Normalise the notation students commonly type or paste. */
export function normalizeInput(raw: string): string {
  return raw
    .trim()
    .replace(/[−–—]/g, "-")
    .replace(/[×·⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/\*\*/g, "^")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/^\s*(?:y|f\s*'?\s*\(\s*[a-z]\s*\)|[a-z]'|d[a-zA-Z]\/d[a-z])\s*=\s*/i, "");
}

/**
 * mathjs reads `x(x+1)` as a call to a function named x. Students mean
 * multiplication, so make it explicit for variables and constants.
 */
function explicitMultiplication(input: string, variables: ReadonlySet<string>): string {
  return input.replace(/([A-Za-z]+)\s*\(/g, (match, name: string) =>
    variables.has(name) || CONSTANTS.has(name) ? `${name}*(` : match,
  );
}

function validate(node: MathNode, variables: ReadonlySet<string>): void {
  node.traverse((n: MathNode) => {
    switch (n.type) {
      case "ConstantNode": {
        const v = (n as unknown as { value: unknown }).value;
        if (typeof v !== "number" || !Number.isFinite(v)) throw new ExpressionError("Only ordinary numbers are allowed.");
        return;
      }
      case "SymbolNode": {
        const name = (n as unknown as { name: string }).name;
        if (variables.has(name) || CONSTANTS.has(name) || ALLOWED_FUNCTIONS.has(name)) return;
        if (name === "log")
          throw new ExpressionError("Write ln(x) for the natural logarithm, or log10(x) for base 10.");
        throw new ExpressionError(`"${name}" isn't recognised here. Allowed variables: ${[...variables].join(", ") || "none"}.`);
      }
      case "OperatorNode": {
        const fn = (n as unknown as { fn: string; op: string }).fn;
        const op = (n as unknown as { op: string }).op;
        if (ALLOWED_OPERATORS.has(op) || ALLOWED_OPERATORS.has(fn)) return;
        throw new ExpressionError(`The operator "${op}" isn't supported.`);
      }
      case "FunctionNode": {
        const name = (n as unknown as { fn: { name?: string } }).fn?.name;
        if (name && ALLOWED_FUNCTIONS.has(name)) return;
        if (name === "log") throw new ExpressionError("Write ln(x) for the natural logarithm, or log10(x) for base 10.");
        throw new ExpressionError(`The function "${name ?? "?"}" isn't supported.`);
      }
      case "ParenthesisNode":
        return;
      default:
        throw new ExpressionError("That doesn't look like a mathematical expression.");
    }
  });
}

export interface CompiledExpression {
  evaluate(scope: Record<string, number>): number;
}

export function compileExpression(raw: string, variables: string[]): CompiledExpression {
  const input = normalizeInput(raw);
  if (!input) throw new ExpressionError("Enter an answer first.");
  if (input.length > 200) throw new ExpressionError("That answer is too long.");
  let node: MathNode;
  try {
    node = math.parse(explicitMultiplication(input, new Set(variables)));
  } catch {
    throw new ExpressionError("We couldn't read that. Check your parentheses and use ^ for powers.");
  }
  validate(node, new Set(variables));
  const code = node.compile();
  return {
    evaluate(scope) {
      const v = code.evaluate({ ...EXTRA_SCOPE, ...scope });
      if (typeof v === "number") return v;
      // Complex results (e.g. sqrt of a negative) are treated as undefined at that point.
      return Number.NaN;
    },
  };
}

/** Parse a purely numeric answer such as "3.5", "-7/2" or "2*sqrt(3)". */
export function parseNumber(raw: string): number {
  const cleaned = normalizeInput(raw).replace(/,(?=\d{3}\b)/g, "");
  const value = compileExpression(cleaned, []).evaluate({});
  if (!Number.isFinite(value)) throw new ExpressionError("That isn't a finite number.");
  return value;
}

/** Small deterministic PRNG so the same item is always sampled identically. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface EquivalenceOptions {
  variables: string[];
  domain?: [number, number];
  /** Seed text (e.g. question id) — keeps sampling deterministic per item. */
  seed: string;
  samples?: number;
}

/**
 * True when two expressions agree at every sampled point where the reference
 * is defined. Points where the reference is undefined are skipped; a candidate
 * that is undefined where the reference is defined is not equivalent.
 */
export function expressionsEquivalent(reference: CompiledExpression, candidate: CompiledExpression, opts: EquivalenceOptions): boolean {
  const [lo, hi] = opts.domain ?? [-3, 3];
  const rand = mulberry32(hashString(opts.seed));
  const wanted = opts.samples ?? 12;
  let compared = 0;
  for (let tries = 0; tries < wanted * 6 && compared < wanted; tries++) {
    const scope: Record<string, number> = {};
    // Avoid integers and zero, where many wrong answers accidentally agree.
    for (const v of opts.variables) scope[v] = lo + (hi - lo) * (0.03 + 0.94 * rand());
    let ref: number;
    try {
      ref = reference.evaluate(scope);
    } catch {
      continue;
    }
    if (!Number.isFinite(ref) || Math.abs(ref) > 1e9) continue;
    let got: number;
    try {
      got = candidate.evaluate(scope);
    } catch {
      return false;
    }
    if (!Number.isFinite(got)) return false;
    const tol = 1e-6 * Math.max(1, Math.abs(ref));
    if (Math.abs(got - ref) > tol) return false;
    compared++;
  }
  return compared >= Math.min(4, wanted);
}

export { hashString, mulberry32 };
