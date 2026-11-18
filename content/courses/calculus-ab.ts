/**
 * AP Calculus AB — pilot sequence: core derivative rules → the chain rule.
 *
 * Original AceAP instructional content. Unit titles follow College Board's
 * published unit names (see content/catalog/ap-catalog.json); objective codes
 * ("CALC-3.B") are AceAP's own and are not College Board codes.
 */
import { defineCourse } from "@/modules/content/schema";
import { calculusQuestions } from "./calculus-ab.questions";

const r = String.raw;
const S = (id: string) => `calculus-ab.${id}`;
const Q = (id: string) => `calculus-ab.q.${id}`;
const M = (id: string) => `calculus-ab.m.${id}`;

export default defineCourse({
  courseId: "calculus-ab",
  version: {
    id: "calculus-ab@2025",
    label: "Aligned to the AP Calculus AB course framework (effective Fall 2020, current in 2025–26)",
    alignmentSourceUrl: "https://apcentral.collegeboard.org/courses/ap-calculus-ab",
    alignmentNotes:
      "Unit names match the published course outline. Topics, objectives, lessons and questions are original AceAP content written to address differentiation of composite functions; they do not reproduce College Board text.",
  },
  provenance: {
    author: "AceAP curriculum team",
    origin: "ai_assisted_original",
    reviewedBy: "Automated answer validation; human subject-matter review pending",
    notes: "Every expression and numeric answer is machine-checked by content:validate.",
  },

  skills: [
    {
      id: S("power-rule"),
      name: "Power rule",
      description: "Differentiate powers of x and polynomials, including negative and fractional exponents.",
      difficulty: 1,
      keywords: ["power rule", "polynomial derivative", "x^n", "derivative of a constant", "negative exponent", "square root derivative"],
      patternLabels: { "single-term": "Single terms", polynomial: "Polynomials", "negative-exponent": "Negative exponents", "fractional-exponent": "Roots and fractional exponents", evaluate: "Evaluating at a point" },
    },
    {
      id: S("basic-derivatives"),
      name: "Derivatives of sin, cos, eˣ and ln x",
      description: "Recall and use the derivatives of the basic trigonometric, exponential and logarithmic functions.",
      difficulty: 2,
      keywords: ["derivative of sine", "derivative of cosine", "derivative of e^x", "derivative of ln x", "natural log", "trig derivatives"],
      patternLabels: { trig: "Sine and cosine", sum: "Sums of basic functions", log: "Natural log", evaluate: "Evaluating at a point" },
    },
    {
      id: S("composite-recognize"),
      name: "Recognize composite functions",
      description: "Tell a composition f(g(x)) apart from sums, products and quotients, and evaluate compositions.",
      difficulty: 2,
      keywords: ["composite function", "composition", "function of a function", "f(g(x))", "which rule", "product vs chain"],
      prerequisites: [],
      patternLabels: { "identify-composite": "Spotting a composition", "select-all": "Sorting several functions", "which-rule": "Choosing the right rule", compose: "Building f(g(x))", "evaluate-composition": "Evaluating f(g(a))" },
    },
    {
      id: S("inner-outer"),
      name: "Identify inner and outer functions",
      description: "Decompose a composite function into its inner function g(x) and outer function f(u), including several layers.",
      difficulty: 2,
      keywords: ["inner function", "outer function", "decompose", "inside function", "outside function", "u-substitution setup"],
      prerequisites: [S("composite-recognize")],
      patternLabels: { "identify-inner": "Finding the inside", "identify-outer": "Finding the outside", "decompose-both": "Writing f and g", "match-inner": "Matching insides", layers: "Ordering several layers" },
    },
    {
      id: S("chain-polynomial"),
      name: "Chain rule: powers of functions",
      description: "Differentiate powers, roots and reciprocals of polynomial expressions with the chain rule.",
      difficulty: 3,
      keywords: ["chain rule", "general power rule", "derivative of (x^2+1)^3", "derivative of a root", "outside inside"],
      prerequisites: [S("inner-outer"), S("power-rule")],
      patternLabels: { "power-of-polynomial": "Powers of polynomials", "power-of-linear": "Powers of linear expressions", root: "Square roots", reciprocal: "Reciprocals", "evaluate-at-point": "Evaluating at a point" },
    },
    {
      id: S("chain-trig"),
      name: "Chain rule: trigonometric functions",
      description: "Differentiate compositions involving sine and cosine, such as sin(3x), cos(x²) and sin²x.",
      difficulty: 3,
      keywords: ["chain rule trig", "derivative of sin(3x)", "derivative of cos(x^2)", "sin squared derivative"],
      prerequisites: [S("inner-outer"), S("basic-derivatives")],
      patternLabels: { "trig-of-linear": "Trig of a linear inside", "trig-of-polynomial": "Trig of a polynomial inside", "power-of-trig": "Powers of trig functions", "evaluate-at-point": "Evaluating at a point" },
    },
    {
      id: S("chain-exp"),
      name: "Chain rule: exponential functions",
      description: "Differentiate exponentials whose exponent is a function of x, such as e^(3x) and e^(x²).",
      difficulty: 3,
      keywords: ["chain rule exponential", "derivative of e^(3x)", "derivative of e^(x^2)", "e to the u"],
      prerequisites: [S("inner-outer"), S("basic-derivatives")],
      patternLabels: { "exp-of-linear": "Linear exponents", "exp-of-polynomial": "Polynomial exponents", "exp-of-trig": "Trig exponents", "evaluate-at-point": "Evaluating at a point" },
    },
    {
      id: S("chain-log"),
      name: "Chain rule: logarithmic functions",
      description: "Differentiate natural logarithms of functions, such as ln(x²+1) and ln(cos x).",
      difficulty: 3,
      keywords: ["chain rule logarithm", "derivative of ln(u)", "u'/u", "derivative of ln(x^2+1)"],
      prerequisites: [S("inner-outer"), S("basic-derivatives")],
      patternLabels: { "log-of-linear": "Log of a linear inside", "log-of-polynomial": "Log of a polynomial", "log-of-trig": "Log of a trig function", "evaluate-at-point": "Evaluating at a point" },
    },
    {
      id: S("chain-interpret"),
      name: "Evaluate and interpret chain-rule results",
      description: "Use the chain rule with tables of values, several layers, graphs and linked rates of change, and say what the result means.",
      difficulty: 4,
      keywords: ["chain rule table", "h'(2) = f'(g(2)) g'(2)", "rates multiply", "three layers", "interpret derivative", "dy/dx = dy/du du/dx"],
      prerequisites: [S("chain-polynomial")],
      patternLabels: { "table-values": "Tables of values", rates: "Linked rates", "multi-layer": "Three layers", meaning: "Meaning and units", "read-from-graph": "Reading a graph" },
    },
  ],

  misconceptions: [
    { id: M("omit-inner"), skillId: S("chain-polynomial"), title: "Omitted the derivative of the inner function", description: "Differentiates the outer function correctly but does not multiply by the derivative of the inside.", remediation: "After differentiating the outside, always ask “what is the derivative of the inside?” and multiply by it. Say it aloud: outside-derivative (inside kept) × inside-derivative." },
    { id: M("inner-in-place"), skillId: S("chain-polynomial"), title: "Replaced the inside with its derivative", description: "Writes f′(g′(x)) — differentiates the inner function in place instead of keeping it and multiplying.", remediation: "The inside stays exactly as it was inside the outer derivative. Its derivative appears as a separate factor multiplied outside." },
    { id: M("outer-at-x"), skillId: S("chain-interpret"), title: "Evaluated the outer derivative at x instead of at g(x)", description: "Uses f′(x)·g′(x) rather than f′(g(x))·g′(x).", remediation: "The outer derivative takes the inner function's output as its input. With tables, find g(a) first and look up f′ at that value." },
    { id: M("power-rule-on-exponential"), skillId: S("chain-exp"), title: "Used the power rule on an exponential", description: "Treats e^(u) like xⁿ, bringing the exponent down and subtracting one.", remediation: "The power rule needs a variable base and constant exponent. For e^(u), the derivative is e^(u) itself times u′." },
    { id: M("trig-sign"), skillId: S("basic-derivatives"), title: "Lost the negative sign on cosine's derivative", description: "Writes the derivative of cos x as +sin x.", remediation: "Sine → cosine, cosine → negative sine. Check with the graph: cosine is decreasing just after x = 0." },
    { id: M("power-rule-slip"), skillId: S("power-rule"), title: "Power rule slip", description: "Forgets to multiply by the exponent, to reduce the exponent by one, or to drop a constant term.", remediation: "Two moves every time: multiply by the exponent, then lower the exponent by one. Constants differentiate to zero." },
    { id: M("product-vs-composite"), skillId: S("composite-recognize"), title: "Confused a product with a composition", description: "Treats two multiplied functions as nested (or the reverse).", remediation: "Ask whether one function is *inside* the other. Side by side → product rule. One inside the other → chain rule." },
    { id: M("inner-outer-swap"), skillId: S("inner-outer"), title: "Swapped the inner and outer functions", description: "Identifies the last operation as the inner function, or composes in the wrong order.", remediation: "Evaluate at a number: the first thing you compute is the inner function; the last is the outer." },
    { id: M("rates-divide"), skillId: S("chain-interpret"), title: "Combined linked rates incorrectly", description: "Divides or adds linked rates of change instead of multiplying them.", remediation: "Write the units of each rate. Multiplying along the chain makes the intermediate unit cancel." },
  ],

  units: [
    {
      id: "calculus-ab.u2",
      number: 2,
      title: "Differentiation: Definition and Fundamental Properties",
      description: "The basic derivative rules every later technique depends on.",
      topics: [
        {
          id: "calculus-ab.u2.rules",
          title: "Core derivative rules",
          description: "The power rule and the derivatives of sine, cosine, eˣ and ln x.",
          objectives: [
            { id: "calculus-ab.o.2a", code: "CALC-2.A", description: "Differentiate power, trigonometric, exponential and logarithmic functions using the basic rules.", skillIds: [S("power-rule"), S("basic-derivatives")] },
          ],
          lessons: [
            {
              id: "calculus-ab.l.rules",
              title: "Derivative rules you'll rely on",
              summary: "A fast, focused review of the power rule and four basic derivatives — the raw material for the chain rule.",
              estMinutes: 10,
              skillIds: [S("power-rule"), S("basic-derivatives")],
              blocks: [
                { type: "text", md: r`The chain rule doesn't replace the rules you already know — it *combines* them. So before we nest functions inside each other, make sure these five derivatives are automatic.` },
                { type: "definition", term: "Power rule", md: r`For any real number $n$, $\;\dfrac{d}{dx}\left[x^n\right] = n\,x^{n-1}$. Bring the exponent down as a multiplier, then lower the exponent by one.` },
                {
                  type: "worked_example",
                  title: "Power rule in three disguises",
                  problem: r`Differentiate (a) $7x^4$, (b) $\dfrac{1}{x^3}$, and (c) $\sqrt{x}$.`,
                  steps: [
                    { title: "(a) A constant multiple", md: r`Constants ride along: $\dfrac{d}{dx}[7x^4] = 7\cdot4x^3 = 28x^3$.` },
                    { title: "(b) Rewrite as a power first", md: r`$\dfrac{1}{x^3} = x^{-3}$, so the derivative is $-3x^{-4} = -\dfrac{3}{x^4}$.` },
                    { title: "(c) Roots are fractional powers", md: r`$\sqrt{x} = x^{1/2}$, so the derivative is $\tfrac12x^{-1/2} = \dfrac{1}{2\sqrt{x}}$.` },
                  ],
                  answer: r`$28x^3$, $\;-\dfrac{3}{x^4}$, $\;\dfrac{1}{2\sqrt{x}}$`,
                },
                { type: "callout", tone: "tip", title: "Rewrite, then differentiate", md: r`Most power-rule mistakes happen *before* any calculus: get the function into the form $x^n$ first. Fractions become negative exponents; roots become fractional exponents.` },
                { type: "check", questionId: Q("pr-1"), lead: "Try one." },
                { type: "text", md: r`## Four derivatives to memorise

| Function | Derivative |
|---|---|
| $\sin x$ | $\cos x$ |
| $\cos x$ | $-\sin x$ |
| $e^x$ | $e^x$ |
| $\ln x$ | $\dfrac{1}{x}$ |

Sums and constant multiples behave exactly as you'd hope: differentiate term by term and keep the constants.` },
                { type: "callout", tone: "warning", title: "Two classic slips", md: r`**Cosine's sign.** $\dfrac{d}{dx}[\cos x] = -\sin x$. Cosine falls just after $x=0$, so its slope there must be negative.

**$e^x$ is not a power of $x$.** The power rule needs the variable in the *base*. In $e^x$ the variable is in the exponent, and the derivative is simply $e^x$.` },
                { type: "check", questionId: Q("bd-1") },
                { type: "summary", points: [r`Power rule: $\frac{d}{dx}[x^n] = n x^{n-1}$ — rewrite roots and fractions as powers first.`, r`$\sin x \to \cos x$, $\;\cos x \to -\sin x$, $\;e^x \to e^x$, $\;\ln x \to \tfrac1x$.`, "Differentiate sums term by term; constants multiply through; a lone constant differentiates to 0."] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "calculus-ab.u3",
      number: 3,
      title: "Differentiation: Composite, Implicit, and Inverse Functions",
      description: "Differentiating functions built from other functions. AceAP's pilot covers composite functions and the chain rule; implicit and inverse-function differentiation are not yet written.",
      topics: [
        {
          id: "calculus-ab.u3.chain",
          title: "The chain rule",
          description: "Recognise compositions, split them into inner and outer functions, and differentiate them.",
          objectives: [
            { id: "calculus-ab.o.3a", code: "CALC-3.A", description: "Recognise a composite function and decompose it into inner and outer functions.", skillIds: [S("composite-recognize"), S("inner-outer")] },
            { id: "calculus-ab.o.3b", code: "CALC-3.B", description: "Apply the chain rule to differentiate composite functions.", skillIds: [S("chain-polynomial"), S("chain-trig"), S("chain-exp"), S("chain-log")] },
            { id: "calculus-ab.o.3c", code: "CALC-3.C", description: "Evaluate and interpret derivatives of composite functions.", skillIds: [S("chain-interpret")] },
          ],
          lessons: [
            {
              id: "calculus-ab.l.composite",
              title: "Composite functions: inside and outside",
              summary: "Learn to see a function as layers — the skill that makes the chain rule straightforward.",
              estMinutes: 10,
              skillIds: [S("composite-recognize"), S("inner-outer")],
              blocks: [
                { type: "text", md: r`Compare two functions that use the same ingredients:

$$p(x) = x^2\cdot\sin x \qquad\text{and}\qquad c(x) = \sin\!\left(x^2\right)$$

In $p$, the two pieces sit **side by side** and are multiplied. In $c$, one piece sits **inside** the other: you square $x$ first, then feed the result into sine. That second kind of function is called a *composite*, and it needs its own derivative rule.` },
                { type: "definition", term: "Composite function", md: r`A function of the form $h(x) = f(g(x))$: the output of an **inner** function $g$ becomes the input of an **outer** function $f$.` },
                { type: "callout", tone: "key", title: "The calculator test", md: r`To find the inner and outer functions, imagine evaluating $h$ at a number, say $x = 2$.

- The **first** thing you compute is the **inner** function.
- The **last** thing you compute is the **outer** function.

For $\sin(x^2)$ at $x=2$: first $2^2 = 4$ (inner: $x^2$), then $\sin(4)$ (outer: $\sin u$).` },
                {
                  type: "worked_example",
                  title: "Decomposing three functions",
                  problem: r`Write each function as $f(g(x))$ by naming the inner function $g(x)$ and outer function $f(u)$: (a) $(3x-5)^4$, (b) $e^{x^2}$, (c) $\cos^2 x$.`,
                  steps: [
                    { title: "(a) A power of an expression", md: r`First you compute $3x-5$; last you raise to the 4th power. Inner: $g(x)=3x-5$. Outer: $f(u)=u^4$.` },
                    { title: "(b) A function in the exponent", md: r`First you square $x$; last you raise $e$ to that power. Inner: $g(x)=x^2$. Outer: $f(u)=e^u$.` },
                    { title: "(c) Watch the notation", md: r`$\cos^2 x$ means $(\cos x)^2$. First you take the cosine; last you square. Inner: $g(x)=\cos x$. Outer: $f(u)=u^2$. Compare $\cos(x^2)$, where the roles are reversed.` },
                  ],
                },
                { type: "check", questionId: Q("cr-1"), lead: "Can you spot the composition?" },
                { type: "text", md: r`## Using $u$ for the inside

It helps to give the inner function a name. Writing $u = g(x)$ turns $h(x)=(3x-5)^4$ into the simple-looking $u^4$. You'll differentiate that simple outer function — and then account for the fact that $u$ is itself changing with $x$. That accounting is the chain rule, in the next lesson.` },
                { type: "check", questionId: Q("io-1") },
                { type: "check", questionId: Q("io-3"), lead: r`One more — notation like $\cos^2x$ trips up many students.` },
                { type: "note_prompt", prompt: "In your own words, how do you tell the inner function from the outer function?", suggestedTitle: "Inner vs outer functions", starter: "The inner function is the one you compute first. Example: \n\nLinks: [[Recognize composite functions]] [[Identify inner and outer functions]]" },
                { type: "summary", points: [r`A composite function $f(g(x))$ applies an outer function to the output of an inner function.`, "Side by side (multiplied) → product. One inside the other → composition.", "Calculator test: computed first = inner; computed last = outer.", r`$\cos^2x=(\cos x)^2$ has inner $\cos x$; $\cos(x^2)$ has inner $x^2$.`] },
              ],
            },
            {
              id: "calculus-ab.l.chain-rule",
              title: "The chain rule",
              summary: "Why rates multiply through a composition, and how to differentiate powers of functions step by step.",
              estMinutes: 15,
              skillIds: [S("chain-polynomial")],
              blocks: [
                { type: "text", md: r`Suppose a gear $A$ turns 3 times as fast as gear $B$, and gear $B$ turns 2 times as fast as gear $C$. How much faster does $A$ turn than $C$? The rates **multiply**: $3\times2=6$.

A composite function works the same way. If $y$ depends on $u$, and $u$ depends on $x$, then a small change in $x$ is first scaled by how fast $u$ responds, and that change in $u$ is then scaled by how fast $y$ responds.` },
                { type: "formula", latex: r`\frac{dy}{dx} \;=\; \frac{dy}{du}\cdot\frac{du}{dx}`, caption: "The chain rule in Leibniz notation: rates multiply along the chain." },
                { type: "formula", latex: r`\frac{d}{dx}\Big[f\big(g(x)\big)\Big] \;=\; f'\big(g(x)\big)\cdot g'(x)`, caption: "The same rule in function notation." },
                { type: "callout", tone: "key", title: "Say it in words", md: r`**Derivative of the outside, leaving the inside alone — times the derivative of the inside.**

Two things to notice in $f'\big(g(x)\big)\cdot g'(x)$:

1. The inside $g(x)$ is **still there**, unchanged, inside $f'$.
2. The derivative of the inside is a **separate factor** multiplied on.` },
                {
                  type: "worked_example",
                  title: "A power of a polynomial",
                  problem: r`Differentiate $y = (x^2+1)^3$.`,
                  steps: [
                    { title: "Name the layers", md: r`Inner: $u = x^2+1$. Outer: $y = u^3$.` },
                    { title: "Differentiate the outside", md: r`$\dfrac{dy}{du} = 3u^2 = 3(x^2+1)^2$. The inside is left exactly as it was.` },
                    { title: "Differentiate the inside", md: r`$\dfrac{du}{dx} = 2x$.` },
                    { title: "Multiply", md: r`$\dfrac{dy}{dx} = 3(x^2+1)^2\cdot 2x = 6x(x^2+1)^2$.` },
                    { title: "Check it", md: r`Expand the original: $(x^2+1)^3 = x^6+3x^4+3x^2+1$, whose derivative is $6x^5+12x^3+6x$. Expanding $6x(x^2+1)^2$ gives the same thing. ✓` },
                  ],
                  answer: r`$6x(x^2+1)^2$`,
                },
                {
                  type: "simulation",
                  simId: "derivative-explorer",
                  title: "See the rates multiply",
                  params: { outer: "u^3", inner: "x^2+1", x: 0.5, span: 1.5, showDerivative: 1 },
                  explore: [
                    r`Move the point and watch the three numbers: the inner slope $g'(x_0)$, the outer slope $f'(u)$, and their product.`,
                    "Compare the product with the slope of the tangent line. Do they ever disagree?",
                    r`Find the point where the tangent is flat. Which of the two factors is zero there?`,
                  ],
                },
                { type: "check", questionId: Q("cp-1"), lead: "Your turn — same structure as the worked example." },
                { type: "callout", tone: "warning", title: "The most common mistake", md: r`Stopping after the outside: writing $\dfrac{d}{dx}(x^2+1)^3 = 3(x^2+1)^2$ and forgetting the $2x$.

A quick self-check: if the inside is anything other than plain $x$, your answer needs an extra factor.` },
                {
                  type: "worked_example",
                  title: "Roots and reciprocals are powers too",
                  problem: r`Differentiate (a) $\sqrt{5x+1}$ and (b) $\dfrac{1}{(2x-3)^2}$.`,
                  steps: [
                    { title: "(a) Rewrite the root", md: r`$\sqrt{5x+1} = (5x+1)^{1/2}$. Outside: $\tfrac12(5x+1)^{-1/2}$. Inside derivative: $5$.` },
                    { title: "(a) Multiply and tidy", md: r`$\tfrac12(5x+1)^{-1/2}\cdot5 = \dfrac{5}{2\sqrt{5x+1}}$.` },
                    { title: "(b) Rewrite the reciprocal", md: r`$\dfrac{1}{(2x-3)^2} = (2x-3)^{-2}$. Outside: $-2(2x-3)^{-3}$. Inside derivative: $2$.` },
                    { title: "(b) Multiply and tidy", md: r`$-2(2x-3)^{-3}\cdot2 = -\dfrac{4}{(2x-3)^3}$.` },
                  ],
                },
                { type: "check", questionId: Q("cp-2") },
                { type: "tutor_prompt", prompts: ["Why do the rates multiply instead of add?", "Show me another example with a square root.", "I keep forgetting the inside derivative — how can I check my work?"] },
                { type: "summary", points: [r`$\dfrac{d}{dx}f(g(x)) = f'(g(x))\cdot g'(x)$: outside-derivative with the inside kept, times inside-derivative.`, r`In Leibniz form: $\dfrac{dy}{dx}=\dfrac{dy}{du}\cdot\dfrac{du}{dx}$.`, "Rewrite roots and reciprocals as powers before differentiating.", "If the inside isn't plain x, expect an extra factor."] },
              ],
            },
            {
              id: "calculus-ab.l.chain-functions",
              title: "Chain rule with trig, exponential and log functions",
              summary: "The same rule with different outer functions: sin(u), cos(u), e^u and ln(u).",
              estMinutes: 15,
              skillIds: [S("chain-trig"), S("chain-exp"), S("chain-log")],
              blocks: [
                { type: "text", md: r`The chain rule never changes: differentiate the outside (keeping the inside), then multiply by the derivative of the inside. What changes is *which* outer function you're differentiating. Using $u$ for the inside and $u'$ for its derivative:

| Outer function | Derivative |
|---|---|
| $\sin u$ | $\cos u\cdot u'$ |
| $\cos u$ | $-\sin u\cdot u'$ |
| $e^{u}$ | $e^{u}\cdot u'$ |
| $\ln u$ | $\dfrac{1}{u}\cdot u' = \dfrac{u'}{u}$ |` },
                {
                  type: "worked_example",
                  title: "Trigonometric compositions",
                  problem: r`Differentiate (a) $\sin(3x)$, (b) $\cos(x^2)$, (c) $\sin^2 x$.`,
                  steps: [
                    { title: "(a) Inside is 3x", md: r`Outside: $\cos(3x)$. Inside derivative: $3$. Result: $3\cos(3x)$.` },
                    { title: "(b) Inside is x²", md: r`Outside: $-\sin(x^2)$. Inside derivative: $2x$. Result: $-2x\sin(x^2)$.` },
                    { title: "(c) Here sine is the INSIDE", md: r`$\sin^2x=(\sin x)^2$. The outer function is squaring: $2(\sin x)$. Inside derivative: $\cos x$. Result: $2\sin x\cos x$.` },
                  ],
                },
                { type: "check", questionId: Q("ct-1") },
                { type: "text", md: r`## Exponentials: the exponent is the inside

For $e^{u}$, the outer derivative is the *same exponential* — then multiply by the derivative of the exponent.

$$\frac{d}{dx}\left[e^{x^2}\right] = e^{x^2}\cdot 2x \qquad\qquad \frac{d}{dx}\left[e^{-4x}\right] = e^{-4x}\cdot(-4)$$` },
                { type: "callout", tone: "warning", title: "Don't bring the exponent down", md: r`Writing $\dfrac{d}{dx}\,e^{3x} = 3x\,e^{3x-1}$ applies the *power* rule to an *exponential*. The power rule is for $x^n$ (variable base). For $e^{u}$ (variable exponent) the exponential stays exactly the same and you multiply by $u'$: $\;3e^{3x}$.` },
                { type: "check", questionId: Q("ce-1") },
                { type: "text", md: r`## Logarithms: derivative of the inside over the inside

$$\frac{d}{dx}\big[\ln u\big] = \frac{u'}{u}$$

For example, $\dfrac{d}{dx}\ln(x^2+1) = \dfrac{2x}{x^2+1}$.` },
                {
                  type: "worked_example",
                  title: "A surprising simplification",
                  problem: r`Differentiate $\ln(5x)$ for $x>0$.`,
                  steps: [
                    { title: "Apply u′/u", md: r`$u=5x$, $u'=5$, so the derivative is $\dfrac{5}{5x}$.` },
                    { title: "Simplify", md: r`$\dfrac{5}{5x} = \dfrac1x$ — the same as the derivative of $\ln x$!` },
                    { title: "Why that makes sense", md: r`By log rules, $\ln(5x) = \ln 5 + \ln x$. The term $\ln 5$ is a constant, so it contributes nothing to the derivative.` },
                  ],
                  answer: r`$\dfrac{1}{x}$`,
                },
                { type: "check", questionId: Q("cl-2") },
                { type: "simulation", simId: "derivative-explorer", title: "Explore a trig composition", params: { outer: "sin(u)", inner: "x^2", x: 1, showDerivative: 1 }, explore: [r`As $x_0$ grows, the inner slope $2x_0$ grows. What happens to how fast the curve wiggles?`, r`Find a point where the outer slope $\cos(u)$ is zero. What does the tangent look like there?`] },
                { type: "summary", points: [r`$\sin u \to \cos u\cdot u'$ and $\cos u \to -\sin u\cdot u'$.`, r`$e^{u} \to e^{u}\cdot u'$ — never use the power rule on an exponential.`, r`$\ln u \to \dfrac{u'}{u}$.`, r`Check which function is outermost: $\sin^2x$ is a *power* of sine; $\sin(x^2)$ is the sine *of* a power.`] },
              ],
            },
            {
              id: "calculus-ab.l.chain-using",
              title: "Using the chain rule: tables, layers and rates",
              summary: "Apply the chain rule when you only have values, when functions are nested three deep, and when rates are linked in the real world.",
              estMinutes: 12,
              skillIds: [S("chain-interpret")],
              blocks: [
                { type: "text", md: r`On the AP exam the chain rule often appears without a formula in sight: you're handed a table of values, a graph, or a description of two linked rates. The rule is the same — the challenge is knowing **where to evaluate each piece**.` },
                {
                  type: "worked_example",
                  title: "Chain rule from a table",
                  problem: r`Let $h(x)=f(g(x))$. Given $g(1)=4$, $g'(1)=3$, $f'(1)=-2$ and $f'(4)=5$, find $h'(1)$.`,
                  steps: [
                    { title: "Write the rule at x = 1", md: r`$h'(1) = f'\big(g(1)\big)\cdot g'(1)$.` },
                    { title: "Evaluate the inside first", md: r`$g(1)=4$, so the outer derivative is needed at $4$: $f'(4)=5$.` },
                    { title: "Multiply", md: r`$h'(1) = 5\cdot3 = 15$.` },
                    { title: "The trap", md: r`$f'(1)=-2$ is in the table to tempt you. The outer derivative is evaluated at the **inner function's output**, not at $x$.` },
                  ],
                  answer: "15",
                },
                { type: "check", questionId: Q("ci-1") },
                { type: "text", md: r`## Three (or more) layers

When functions are nested more than once, keep going: each layer contributes one factor.

$$\frac{d}{dx}\Big[\cos^3(2x)\Big] = \underbrace{3\cos^2(2x)}_{\text{power}}\cdot\underbrace{\big(-\sin(2x)\big)}_{\text{cosine}}\cdot\underbrace{2}_{\text{inside}} = -6\cos^2(2x)\sin(2x)$$

Work from the outside in, and don't stop until the inside is plain $x$.` },
                { type: "callout", tone: "tip", title: "Linked rates and units", md: r`If volume depends on radius and radius depends on time, then

$$\frac{dV}{dt} = \frac{dV}{dr}\cdot\frac{dr}{dt}\qquad \frac{\text{cm}^3}{\text{cm}}\cdot\frac{\text{cm}}{\text{s}} = \frac{\text{cm}^3}{\text{s}}$$

The units tell you the rates must multiply: the middle unit cancels.` },
                { type: "check", questionId: Q("ci-7"), lead: "Now use a graph to check a chain-rule result." },
                { type: "note_prompt", prompt: "Write the chain rule in your own words and add one example you found tricky.", suggestedTitle: "Chain rule", starter: "**Rule:** derivative of the outside (inside kept) × derivative of the inside.\n\n**Tricky example:** \n\nLinks: [[Chain rule: powers of functions]] [[Evaluate and interpret chain-rule results]]" },
                { type: "summary", points: [r`With tables: $h'(a)=f'(g(a))\cdot g'(a)$ — find $g(a)$ first, then look up $f'$ there.`, "Each nested layer contributes one factor; work outside-in until the inside is plain x.", "For linked rates, multiply along the chain and check that the units cancel."] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: calculusQuestions,

  assessments: [
    {
      id: "calculus-ab.quiz.rules",
      kind: "skill_quiz",
      title: "Quiz: core derivative rules",
      description: "Five questions on the power rule and the derivatives of sin, cos, eˣ and ln x.",
      unitId: "calculus-ab.u2",
      topicId: "calculus-ab.u2.rules",
      questionIds: [Q("pr-2"), Q("pr-4"), Q("bd-2"), Q("bd-4"), Q("bd-5")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    {
      id: "calculus-ab.quiz.chain",
      kind: "lesson_quiz",
      title: "Quiz: the chain rule",
      description: "Six questions across decomposing, differentiating and interpreting composite functions. No hints.",
      unitId: "calculus-ab.u3",
      topicId: "calculus-ab.u3.chain",
      questionIds: [Q("io-4"), Q("cp-4"), Q("ct-2"), Q("ce-2"), Q("cl-1"), Q("ci-2")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    {
      id: "calculus-ab.test.u3-chain",
      kind: "unit_test",
      title: "Unit 3 test: the chain rule",
      description: "Ten questions, 25 minutes. Covers the chain-rule portion of Unit 3 — the part of the unit AceAP currently teaches.",
      unitId: "calculus-ab.u3",
      questionIds: [Q("cr-2"), Q("io-5"), Q("cp-3"), Q("cp-5"), Q("ct-3"), Q("ct-4"), Q("ce-4"), Q("cl-3"), Q("ci-4"), Q("ci-5")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 25 * 60 },
    },
    {
      id: "calculus-ab.exam.set-1",
      kind: "exam_practice",
      title: "AP-style practice set: differentiating composite functions",
      description: "Eight original AP-style multiple-choice and short-answer items under exam-like timing (2 minutes per question).",
      questionIds: [Q("cr-4"), Q("io-6"), Q("cp-6"), Q("cp-7"), Q("ct-6"), Q("ce-3"), Q("cl-4"), Q("ci-6")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 16 * 60 },
    },
  ],

  simulations: [
    {
      id: "derivative-explorer",
      name: "Derivative Explorer",
      purpose: "Connect the slope of a tangent line to the derivative, and see how the inner and outer rates of a composite function multiply.",
      variables: [
        { name: "Function", description: "A preset or typed function of x" },
        { name: "Point x₀", description: "Where the tangent line is drawn" },
        { name: "Step h", description: "Width of the optional secant line" },
      ],
      outputs: ["Tangent line", "Instantaneous slope f′(x₀)", "Graph of f′(x)", "Chain-rule breakdown: g′(x₀), f′(u) and their product"],
      skillIds: [S("chain-polynomial"), S("chain-trig"), S("chain-interpret")],
      accessibilityAlternative: "All values shown on the graph (point, slope, inner and outer rates) are also given as text readouts that update as the point moves; the point can be moved with a keyboard-operable slider.",
    },
  ],
});
