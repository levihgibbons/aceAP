/**
 * Live preview for expression answers: calculator syntax ("6*x*(x^2+1)^2")
 * → LaTeX (via mathjs' parser) → KaTeX HTML. Both libraries load on demand,
 * only when an expression question is on screen. A preview failure is never
 * an error for the student — grading happens on the server either way.
 */
type MathJs = typeof import("mathjs");
type KaTeX = typeof import("katex").default;

let mathjs: Promise<MathJs> | null = null;
let katex: Promise<KaTeX> | null = null;

const loadMathjs = () => (mathjs ??= import("mathjs"));
const loadKatex = () => (katex ??= import("katex").then((m) => m.default));

const CONSTANTS = new Set(["e", "pi"]);

/** Mirrors the grader's input normalisation (src/modules/assessments/math.ts). */
function normalize(raw: string): string {
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

function explicitMultiplication(input: string, variables: ReadonlySet<string>): string {
  return input.replace(/([A-Za-z]+)\s*\(/g, (match, name: string) => (variables.has(name) || CONSTANTS.has(name) ? `${name}*(` : match));
}

/** Rendered KaTeX HTML for the typed expression, or null when it can't be previewed (yet). */
export async function renderExpressionPreview(raw: string, variables: string[]): Promise<string | null> {
  const input = normalize(raw);
  if (!input || input.length > 200) return null;
  const [m, k] = await Promise.all([loadMathjs(), loadKatex()]);
  let tex: string;
  try {
    const node = m.parse(explicitMultiplication(input, new Set(variables)));
    tex = node
      .toTex({ parenthesis: "keep", implicit: "hide" })
      .replace(/\mathrm\{(ln|log10|log2|arcsin|arccos|arctan)\}/g, (_s, fn: string) => (fn === "ln" ? "\ln" : `\operatorname{${fn}}`));
  } catch {
    return null;
  }
  try {
    return k.renderToString(tex, { throwOnError: false, displayMode: false, strict: "ignore", output: "html", trust: false });
  } catch {
    return null;
  }
}
