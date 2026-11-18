/**
 * AP Microeconomics — pilot sequence: short-run production → short-run costs
 * → the price-taking firm's output, profit and shutdown decisions.
 *
 * Original AceAP instructional content about hypothetical firms. The unit
 * title follows College Board's published unit name (see
 * content/catalog/ap-catalog.json); objective codes ("MICRO-3.B") are AceAP's
 * own and are not College Board codes.
 *
 * Currency is written in words ("14 dollars") rather than with the dollar
 * sign, because that character delimits LaTeX in lesson and question text.
 */
import { defineCourse } from "@/modules/content/schema";
import { microeconomicsQuestions } from "./microeconomics.questions";

const r = String.raw;
const S = (id: string) => `microeconomics.${id}`;
const Q = (id: string) => `microeconomics.q.${id}`;
const M = (id: string) => `microeconomics.m.${id}`;
const LAB = "firm-behavior-lab";

export default defineCourse({
  courseId: "microeconomics",
  version: {
    id: "microeconomics@2025",
    label: "Aligned to the AP Microeconomics course framework (current in 2025–26)",
    alignmentSourceUrl: "https://apcentral.collegeboard.org/courses/ap-microeconomics",
    alignmentNotes:
      "The unit name matches the published course outline. Topics, objectives, lessons and questions are original AceAP content written to address short-run production, short-run costs and the short-run decisions of a perfectly competitive firm; they do not reproduce College Board text. Long-run costs, entry and exit, and long-run competitive equilibrium are not yet covered.",
  },
  provenance: {
    author: "AceAP curriculum team",
    origin: "ai_assisted_original",
    reviewedBy: "Automated answer validation; human subject-matter review pending",
    notes: "Every numeric answer and answer key is machine-checked by content:validate. All firms and figures are hypothetical.",
  },

  skills: [
    {
      id: S("marginal-product"),
      name: "Marginal and average product",
      description: "Tell fixed from variable inputs, compute marginal and average product from a production table, and recognize diminishing marginal returns.",
      difficulty: 2,
      keywords: ["marginal product", "average product", "total product", "diminishing marginal returns", "law of diminishing returns", "fixed input", "variable input", "short run vs long run", "how do I find marginal product", "when do diminishing returns start"],
      patternLabels: {
        "mp-from-table": "Marginal product from a table",
        "ap-from-table": "Average product from a table",
        "diminishing-returns": "Where diminishing returns begin",
        "input-types": "Fixed and variable inputs",
        "why-diminishing": "Why returns diminish",
        "mp-ap-link": "How marginal product moves the average",
        stages: "Stages of production",
      },
    },
    {
      id: S("cost-types"),
      name: "Fixed, variable and total cost",
      description: "Classify short-run costs as fixed or variable and move between fixed, variable and total cost.",
      difficulty: 2,
      keywords: ["fixed cost", "variable cost", "total cost", "TC = FC + VC", "is rent a fixed cost", "cost when output is zero", "how do I find variable cost from total cost", "short-run costs"],
      prerequisites: [],
      patternLabels: {
        classify: "Fixed or variable?",
        "classify-select": "Sorting a list of costs",
        "compute-from-table": "Variable cost from a table",
        "fixed-cost-at-zero": "Fixed cost at zero output",
        "total-from-parts": "Building total cost",
      },
    },
    {
      id: S("marginal-cost"),
      name: "Marginal cost",
      description: "Compute marginal cost from cost data and explain why it eventually rises and why fixed cost never affects it.",
      difficulty: 2,
      keywords: ["marginal cost", "MC", "change in total cost", "cost of one more unit", "how do I calculate marginal cost", "why does marginal cost rise", "wage divided by marginal product", "does fixed cost affect marginal cost"],
      prerequisites: [S("cost-types"), S("marginal-product")],
      patternLabels: {
        "mc-from-table": "Marginal cost from a table",
        "mc-from-change": "Marginal cost over a range",
        "wage-over-mp": "Wage divided by marginal product",
        "why-mc-rises": "Why marginal cost rises",
        "fixed-cost-irrelevant": "Fixed cost and marginal cost",
      },
    },
    {
      id: S("average-costs"),
      name: "Average costs: AFC, AVC and ATC",
      description: "Compute average fixed, average variable and average total cost and use ATC = AVC + AFC.",
      difficulty: 2,
      keywords: ["average total cost", "ATC", "average variable cost", "AVC", "average fixed cost", "AFC", "cost per unit", "how do I find ATC", "ATC = AVC + AFC", "why does AFC always fall"],
      prerequisites: [S("cost-types")],
      patternLabels: {
        "atc-from-table": "ATC from a table",
        "avc-from-table": "AVC from a table",
        "afc-behavior": "How AFC behaves",
        "afc-gap": "Using ATC − AVC",
        formulas: "Matching the formulas",
      },
    },
    {
      id: S("cost-curve-relationships"),
      name: "How MC, AVC and ATC fit together",
      description: "Explain why marginal cost crosses AVC and ATC at their minimum points and use the relationship to reason about cost curves.",
      difficulty: 3,
      keywords: ["where does MC cross ATC", "MC crosses AVC at its minimum", "minimum ATC", "marginal pulls the average", "cost curves", "U-shaped cost curves", "gap between ATC and AVC", "why is ATC U-shaped"],
      prerequisites: [S("marginal-cost"), S("average-costs")],
      patternLabels: {
        "marginal-pulls-average": "Marginal pulls the average",
        "mc-crosses-min": "Where MC crosses",
        "gap-atc-avc": "The gap between ATC and AVC",
        "infer-from-averages": "Marginal cost from two averages",
        "locate-output": "Locating output on the curves",
        "curve-order": "Order of the minimum points",
      },
    },
    {
      id: S("profit-max-rule"),
      name: "Profit-maximizing output (MR = MC)",
      description: "Explain why price equals marginal revenue for a price taker and choose output where marginal revenue equals marginal cost.",
      difficulty: 3,
      keywords: ["how do I find profit-maximizing quantity", "MR = MC", "P = MC", "marginal revenue", "price taker", "perfect competition", "profit maximization rule", "how much should a firm produce", "why is price equal to marginal revenue"],
      prerequisites: [S("marginal-cost")],
      patternLabels: {
        "mr-equals-price": "Why MR equals price",
        "apply-rule-table": "Best quantity from a table",
        "adjust-output": "Produce more or less?",
        "rule-concept": "Thinking at the margin",
        "rule-statements": "What the rule does and doesn't say",
        "sim-find-q": "Best quantity in the lab",
      },
    },
    {
      id: S("profit-calculation"),
      name: "Calculating profit and loss",
      description: "Compute profit as total revenue minus total cost or as (P − ATC) × Q, and tell economic profit from accounting profit.",
      difficulty: 3,
      keywords: ["how do I calculate profit", "profit = TR − TC", "(P − ATC) × Q", "economic profit", "accounting profit", "implicit cost", "loss", "profit per unit", "total revenue minus total cost"],
      prerequisites: [S("profit-max-rule"), S("average-costs")],
      patternLabels: {
        "tr-minus-tc": "Revenue minus cost",
        "price-minus-atc": "Price minus ATC, times quantity",
        "from-table": "Profit from a cost table",
        "economic-vs-accounting": "Economic vs accounting profit",
        loss: "Calculating a loss",
        "sim-profit": "Profit in the lab",
        "from-equations": "Profit from cost equations",
      },
    },
    {
      id: S("shutdown-decision"),
      name: "The shutdown decision",
      description: "Decide whether a firm taking a loss should keep producing in the short run by comparing price with average variable cost.",
      difficulty: 3,
      keywords: ["shutdown rule", "when should a firm shut down", "P < AVC", "price below average variable cost", "operate at a loss", "shutdown price", "sunk fixed cost", "loss equals fixed cost", "should the firm stay open"],
      prerequisites: [S("profit-calculation"), S("average-costs")],
      patternLabels: {
        "compare-price-avc": "Comparing price with AVC",
        "loss-comparison": "Loss if open vs closed",
        "shutdown-concept": "Why fixed cost is ignored",
        "shutdown-price-table": "Shutdown price from a table",
        "sim-shutdown-price": "Shutdown price in the lab",
        "compare-select": "Which firms shut down?",
        "operate-vs-shutdown": "Choosing the smaller loss",
      },
    },
    {
      id: S("firm-graph-reading"),
      name: "Reading the competitive firm's graph",
      description: "Use the price line and the MC, ATC and AVC curves to identify profit, break-even, loss and shutdown, and the firm's short-run supply curve.",
      difficulty: 4,
      keywords: ["perfect competition graph", "profit rectangle", "break-even price", "short-run supply curve", "MC above AVC", "loss on the graph", "price line", "how do I read the firm graph", "minimum ATC", "minimum AVC"],
      prerequisites: [S("cost-curve-relationships"), S("shutdown-decision")],
      patternLabels: {
        "classify-outcome": "Profit, loss or break-even?",
        "identify-region": "The profit rectangle",
        "supply-curve": "The short-run supply curve",
        "sim-classify": "Classifying the firm in the lab",
        "sim-breakeven": "Break-even price in the lab",
        "match-outcomes": "Price ranges and outcomes",
        "sim-fixed-cost": "Changing fixed cost in the lab",
      },
    },
  ],

  misconceptions: [
    { id: M("marginal-vs-average"), skillId: S("marginal-cost"), title: "Confused marginal with average (or total)", description: "Reports an average or a total when asked for a marginal value (or the reverse), or assumes an average must move in the same direction as the total.", remediation: "Marginal always means “the change from one more”: subtract one row from the row before it. Average means “per unit”: divide a total by the quantity. Then remember the pull: an average rises only when the marginal value is above it." },
    { id: M("diminishing-means-falling"), skillId: S("marginal-product"), title: "Thought diminishing returns means output falls", description: "Reads “diminishing marginal returns” as total product decreasing, instead of total product rising by smaller and smaller amounts.", remediation: "Look at the marginal product column, not the total. Returns are diminishing as soon as marginal product starts to fall — total product keeps rising until marginal product becomes negative." },
    { id: M("fixed-variable-mixup"), skillId: S("cost-types"), title: "Mixed up fixed and variable cost", description: "Misclassifies a cost, leaves fixed cost out of (or adds it into) a calculation, or assumes cost is zero when output is zero.", remediation: "Use the zero-output test: whatever the firm still owes when it produces nothing is fixed cost. Everything else is variable. Total cost is always the two added together, and ATC = AVC + AFC." },
    { id: M("fixed-cost-in-decision"), skillId: S("marginal-cost"), title: "Let fixed cost change marginal cost or the output decision", description: "Believes a change in fixed cost changes marginal cost, the profit-maximizing quantity or the shutdown price.", remediation: "Add the same amount to total cost in every row of a table: the differences between rows — marginal cost — do not change. Fixed cost shifts ATC and profit, but never MC, AVC, the P = MC quantity or the shutdown price." },
    { id: M("revenue-not-profit"), skillId: S("profit-max-rule"), title: "Maximized revenue or output instead of profit", description: "Picks the largest output or the largest revenue, or reports revenue when asked for profit.", remediation: "Profit is revenue minus cost. Selling more always raises a price taker's revenue, so check each extra unit: is the revenue it adds (the price) at least the cost it adds (marginal cost)?" },
    { id: M("min-atc-rule"), skillId: S("profit-max-rule"), title: "Used minimum ATC (or P = ATC) as the profit rule", description: "Chooses the output where average total cost is lowest, or where price equals ATC, rather than where price equals marginal cost.", remediation: "The lowest cost per unit is not the highest total profit. If price is above marginal cost at minimum ATC, the next unit still adds to profit. Find the quantity with P = MC first; use ATC only afterwards, to measure the profit." },
    { id: M("min-mc-rule"), skillId: S("profit-max-rule"), title: "Thought profit is largest where MC is lowest", description: "Chooses the output where marginal cost is at its minimum.", remediation: "When marginal cost is at its lowest, extra units are at their cheapest — the best time to keep expanding, not to stop. Keep going until rising marginal cost climbs up to the price." },
    { id: M("per-unit-not-total"), skillId: S("profit-calculation"), title: "Stopped at a per-unit amount", description: "Subtracts ATC from price (or works out another per-unit figure) but forgets to multiply by quantity to get the total.", remediation: "Check the question: “total” profit or cost needs a per-unit amount times the number of units. Profit = (P − ATC) × Q — on a graph, a rectangle has a height and a width." },
    { id: M("shutdown-at-loss"), skillId: S("shutdown-decision"), title: "Shut down at any loss (compared price with the wrong average cost)", description: "Shuts the firm down whenever price is below ATC, or otherwise swaps the roles of ATC (profit or loss) and AVC (operate or shut down).", remediation: "Two separate comparisons. Price vs ATC tells you profit or loss. Price vs AVC tells you whether to produce at all. A firm with a loss keeps producing whenever price covers AVC, because shutting down would lose the whole fixed cost." },
  ],

  units: [
    {
      id: "microeconomics.u3",
      number: 3,
      title: "Production, Cost, and the Perfect Competition Model",
      description: "How firms turn inputs into output, what that output costs, and how a price-taking firm chooses its quantity. AceAP's pilot covers short-run production, short-run costs and the competitive firm's short-run decisions; long-run costs, entry and exit, and long-run equilibrium are not yet written.",
      topics: [
        {
          id: "microeconomics.u3.production-cost",
          title: "Short-run production and costs",
          description: "From workers and machines to output, and from output to fixed, variable, marginal and average cost.",
          objectives: [
            { id: "microeconomics.o.3a", code: "MICRO-3.A", description: "Describe short-run production using total, marginal and average product, and explain diminishing marginal returns.", skillIds: [S("marginal-product")] },
            { id: "microeconomics.o.3b", code: "MICRO-3.B", description: "Classify short-run costs as fixed or variable and calculate fixed, variable and total cost.", skillIds: [S("cost-types")] },
            { id: "microeconomics.o.3c", code: "MICRO-3.C", description: "Calculate marginal and average costs and explain how the marginal and average cost curves are related.", skillIds: [S("marginal-cost"), S("average-costs"), S("cost-curve-relationships")] },
          ],
          lessons: [
            {
              id: "microeconomics.l.production",
              title: "Production in the short run",
              summary: "What happens to output when you keep adding workers to a fixed amount of equipment — and why each one eventually adds less.",
              estMinutes: 12,
              skillIds: [S("marginal-product")],
              blocks: [
                { type: "text", md: r`Rosa sells tamales from a cart with **one steamer**. On a busy Saturday she can't buy and install a second steamer before lunch — but she *can* call in more helpers. Economists call this situation the **short run**: at least one input is stuck at its current amount, and the firm changes its output only by changing the inputs it can adjust.

This lesson asks a simple question with big consequences: *what happens to output as you keep adding workers to a fixed amount of equipment?* The answer shapes every cost curve in the rest of the unit.` },
                { type: "definition", term: "Short run", md: r`A period in which **at least one input cannot be changed** — usually capital such as buildings, machines or land. In the **long run** every input can be adjusted. The short run is not a set number of days; it lasts however long the firm is stuck with its fixed input.` },
                { type: "definition", term: "Fixed and variable inputs", md: r`A **fixed input** is one whose quantity does not change as output changes in the short run (Rosa's steamer and cart). A **variable input** is one the firm uses more of in order to produce more (helpers' hours, masa, corn husks).` },
                { type: "check", questionId: Q("mp-4"), lead: "Quick check — which input is stuck?" },
                { type: "text", md: r`## Three ways to measure output

Here is the cart's output per hour with different numbers of workers sharing her one steamer:

| Workers | Total product (tamales per hour) | Marginal product | Average product |
|---|---|---|---|
| 0 | 0 | — | — |
| 1 | 10 | 10 | 10 |
| 2 | 24 | 14 | 12 |
| 3 | 36 | 12 | 12 |
| 4 | 44 | 8 | 11 |
| 5 | 48 | 4 | 9.6 |
| 6 | 48 | 0 | 8 |

- **Total product (TP)** is all the output produced.
- **Marginal product (MP)** is the *extra* output from the last worker added.
- **Average product (AP)** is output *per worker*.` },
                { type: "formula", latex: r`MP_L = \frac{\Delta TP}{\Delta L} \qquad\qquad AP_L = \frac{TP}{L}`, caption: "Marginal product is a change (this row minus the row above); average product is a ratio (output divided by workers)." },
                {
                  type: "worked_example",
                  title: "Reading Rosa's table",
                  problem: r`Using Rosa's table, (a) find the marginal product of the 4th worker, (b) find average product with 4 workers, and (c) decide with which worker diminishing marginal returns begin.`,
                  steps: [
                    { title: "(a) Marginal means change", md: r`Total product rises from 36 to 44 when the 4th worker arrives, so $MP = 44 - 36 = 8$ tamales per hour.` },
                    { title: "(b) Average means per worker", md: r`$AP = 44 \div 4 = 11$ tamales per worker. Notice that this is not the 8 from part (a): the 4th worker added *less* than the group's average, so the average slipped from 12 to 11.` },
                    { title: "(c) Scan the marginal product column", md: r`The marginal products are 10, 14, 12, 8, 4 and 0. MP *rises* with the 2nd worker (two people can split the jobs of steaming and serving), then *falls* from the 3rd worker on. Diminishing marginal returns begin with the **3rd** worker.` },
                    { title: "Don't over-read it", md: r`Total product keeps rising through the 5th worker. “Diminishing” describes the marginal product column, not the total product column.` },
                  ],
                  answer: "(a) 8 tamales per hour, (b) 11 tamales per worker, (c) the 3rd worker",
                },
                { type: "check", questionId: Q("mp-1"), lead: "Your turn, with a different firm." },
                { type: "definition", term: "Diminishing marginal returns", md: r`As more and more of a variable input is added to a fixed input, the marginal product of the variable input **eventually falls**. This pattern is so reliable it is often called the *law* of diminishing marginal returns.` },
                { type: "callout", tone: "key", title: "Why it happens", md: r`The cause is **crowding of the fixed input**, not worse workers. A second worker lets the pair specialize — one steams while the other serves — so marginal product rises at first. But there is still only one steamer. The third, fourth and fifth workers share the same pot and the same small cart, so each adds less than the one before. Even if every worker were identical, marginal product would still fall.` },
                { type: "callout", tone: "warning", title: "Diminishing is not negative", md: r`Diminishing marginal returns means output is rising **more slowly** — not that output is falling. Total product keeps climbing as long as marginal product is positive. Only if marginal product turns negative (a worker who actually gets in the way) does total product fall.` },
                { type: "check", questionId: Q("mp-3") },
                { type: "text", md: r`## The marginal pulls the average

Think of your grade average. If your next quiz score is above your average, the average rises; if it is below, the average falls. Workers are the same:

- When MP is **above** AP, average product **rises**.
- When MP is **below** AP, average product **falls**.

In Rosa's table the 3rd worker's marginal product (12) equals the average (12), so the average holds steady; the 4th worker's marginal product (8) is below it, so the average drops to 11.

Hold on to this idea — the next lessons use exactly the same logic for costs. And notice what diminishing returns implies: when each extra worker adds *less* output, each extra unit of output needs *more* labor. That is why the cost of producing one more unit eventually rises.` },
                { type: "summary", points: ["In the short run at least one input is fixed; output changes only through the variable inputs.", r`Marginal product is the change in total product from one more worker: $MP = \Delta TP / \Delta L$. Average product is output per worker: $AP = TP / L$.`, "Diminishing marginal returns: adding a variable input to a fixed input eventually makes marginal product fall, because the fixed input gets crowded.", "Diminishing does not mean negative — total product still rises while marginal product is positive.", "The marginal pulls the average: AP rises when MP is above it and falls when MP is below it."] },
              ],
            },
            {
              id: "microeconomics.l.costs",
              title: "Short-run costs: fixed, variable and total",
              summary: "Sort a firm's costs into fixed and variable, and read fixed, variable and total cost from a table.",
              estMinutes: 10,
              skillIds: [S("cost-types")],
              blocks: [
                { type: "text", md: r`Every input costs something. Because inputs come in two kinds in the short run — fixed and variable — costs do too. Sorting a firm's costs into the right bucket is the first step in every cost problem in this unit, and it is the key to a surprising result later on: a firm that is losing money may still be right to stay open.` },
                { type: "definition", term: "Fixed cost (FC)", md: r`A cost that **does not change with the quantity of output** in the short run. It is owed even when output is zero. Typical examples: rent, an equipment lease, an annual insurance premium.` },
                { type: "definition", term: "Variable cost (VC)", md: r`A cost that **rises as output rises**, because producing more takes more of the variable inputs. Typical examples: hourly labor, raw materials, packaging.` },
                { type: "formula", latex: r`TC = FC + VC`, caption: "Total cost is fixed cost plus variable cost at every level of output." },
                { type: "callout", tone: "tip", title: "The zero-output test", md: r`Not sure what fixed cost is? Look at total cost when $Q = 0$. With nothing produced there is no variable cost, so everything the firm still owes is fixed cost.

For a single bill, ask: *would this be larger if the firm made one more unit today?* If not, it is a fixed cost.` },
                { type: "check", questionId: Q("ct-1") },
                {
                  type: "worked_example",
                  title: "Dev's bike-repair stand",
                  problem: r`Dev rents a market stall and a set of tools. His total cost per day depends on how many bikes he repairs:

| Bikes repaired (Q) | Total cost (dollars) |
|---|---|
| 0 | 60 |
| 1 | 75 |
| 2 | 86 |
| 3 | 99 |
| 4 | 116 |
| 5 | 140 |
| 6 | 172 |

Find his fixed cost, and his variable cost at each quantity.`,
                  steps: [
                    { title: "Read fixed cost from the first row", md: r`At $Q = 0$ total cost is 60 dollars. Nothing was produced, so all of it is fixed cost: $FC = 60$.` },
                    { title: "Subtract to get variable cost", md: r`$VC = TC - FC$ in every row:

| Q | TC | FC | VC |
|---|---|---|---|
| 0 | 60 | 60 | 0 |
| 1 | 75 | 60 | 15 |
| 2 | 86 | 60 | 26 |
| 3 | 99 | 60 | 39 |
| 4 | 116 | 60 | 56 |
| 5 | 140 | 60 | 80 |
| 6 | 172 | 60 | 112 |` },
                    { title: "Check the pattern", md: r`Fixed cost is the same 60 dollars in every row. Variable cost starts at zero and rises with every bike. Total cost and variable cost always differ by exactly 60.` },
                  ],
                  answer: "Fixed cost is 60 dollars a day. Variable cost is 0, 15, 26, 39, 56, 80 and 112 dollars for 0 through 6 bikes.",
                },
                { type: "text", md: r`## Why variable cost doesn't rise in a straight line

Look at how much Dev's variable cost *increases* with each extra bike: 15, 11, 13, 17, 24, 32 dollars. The increase shrinks at first and then grows.

That is the production story from the last lesson, seen from the cost side. Early on, extra labor is very productive, so an extra repair is cheap. Once diminishing marginal returns set in, each extra repair takes more labor time than the one before, and variable cost climbs faster and faster. The next lesson gives those increases a name: **marginal cost**.` },
                { type: "check", questionId: Q("ct-3"), lead: "Now pull variable cost out of a table yourself." },
                { type: "callout", tone: "warning", title: "What “fixed” does and doesn't mean", md: r`**Fixed means “doesn't vary with output” — not “never changes”.** Dev's landlord could raise the rent next year. Fixed cost would jump, but it still wouldn't depend on how many bikes he repairs.

**Fixed cost doesn't vanish when the firm produces nothing.** If Dev stays home tomorrow, he still owes the 60 dollars.` },
                { type: "callout", tone: "info", title: "Costs include opportunity costs", md: r`When economists say “cost” they mean every opportunity cost: the bills actually paid (*explicit* costs) and also what the owner gives up to run the business, such as the wage Dev could earn working for someone else (*implicit* costs). Assume the cost figures in this unit include both.` },
                { type: "summary", points: ["Fixed cost does not change with output and is owed even at zero output; variable cost rises as output rises.", r`$TC = FC + VC$ at every quantity, so $VC = TC - FC$.`, "Zero-output test: total cost at Q = 0 is the fixed cost.", "Variable cost rises slowly at first and then faster, because of diminishing marginal returns.", "Fixed means “independent of output”, not “permanent” — and not “zero when the firm is closed”."] },
              ],
            },
            {
              id: "microeconomics.l.cost-curves",
              title: "Marginal cost and the average cost curves",
              summary: "Compute MC, AFC, AVC and ATC, and see why marginal cost cuts through both average curves at their lowest points.",
              estMinutes: 15,
              skillIds: [S("marginal-cost"), S("average-costs"), S("cost-curve-relationships")],
              blocks: [
                { type: "text", md: r`A firm can ask two different questions about its costs:

- **“What did the last unit cost me?”** — a *marginal* question.
- **“What does a typical unit cost me?”** — an *average* question.

They have different answers, they are used for different decisions, and mixing them up is the most common mistake in this unit. This lesson builds both and then shows how they are tied together.` },
                { type: "formula", latex: r`MC = \frac{\Delta TC}{\Delta Q} = \frac{\Delta VC}{\Delta Q}`, caption: "Marginal cost: the change in total cost from producing one more unit. Fixed cost doesn't change, so the change in total cost equals the change in variable cost." },
                { type: "formula", latex: r`AFC = \frac{FC}{Q} \qquad AVC = \frac{VC}{Q} \qquad ATC = \frac{TC}{Q} = AFC + AVC`, caption: "The three averages: each divides a total by the quantity produced." },
                {
                  type: "worked_example",
                  title: "Dev's bike stand, per unit",
                  problem: r`Dev's fixed cost is 60 dollars a day. Complete the marginal and average cost columns for his repair stand.

| Q | TC | VC |
|---|---|---|
| 0 | 60 | 0 |
| 1 | 75 | 15 |
| 2 | 86 | 26 |
| 3 | 99 | 39 |
| 4 | 116 | 56 |
| 5 | 140 | 80 |
| 6 | 172 | 112 |`,
                  steps: [
                    { title: "Marginal cost: subtract down the column", md: r`Each marginal cost is this row's total cost minus the row above: $75 - 60 = 15$, $\;86 - 75 = 11$, $\;99 - 86 = 13$, then 17, 24 and 32.` },
                    { title: "Averages: divide across the row", md: r`At $Q = 4$: $AFC = 60 \div 4 = 15$, $\;AVC = 56 \div 4 = 14$, $\;ATC = 116 \div 4 = 29$. Check: $15 + 14 = 29$. ✓` },
                    { title: "The finished table", md: r`| Q | MC | AFC | AVC | ATC |
|---|---|---|---|---|
| 1 | 15 | 60 | 15 | 75 |
| 2 | 11 | 30 | 13 | 43 |
| 3 | 13 | 20 | 13 | 33 |
| 4 | 17 | 15 | 14 | 29 |
| 5 | 24 | 12 | 16 | 28 |
| 6 | 32 | 10 | 18.67 | 28.67 |` },
                    { title: "Look for the pattern", md: r`AFC falls in every row. AVC falls, bottoms out at 13, then rises. ATC falls until 5 bikes (28 dollars) and then turns up. Marginal cost dips to 11 and then climbs steadily. The rest of the lesson explains why those shapes fit together the way they do.` },
                  ],
                },
                { type: "check", questionId: Q("mc-1"), lead: "Marginal cost from a table." },
                { type: "callout", tone: "warning", title: "Fixed cost never shows up in marginal cost", md: r`Marginal cost is a *difference* between two rows, and fixed cost is the same in both rows — so it cancels. If Dev's rent doubled, every total cost in his table would rise by 60, and every marginal cost would be exactly what it was before.` },
                { type: "check", questionId: Q("ac-1"), lead: "And an average from the same kind of table." },
                { type: "text", md: r`## Why marginal cost eventually rises

Suppose a worker costs 120 dollars a day and the last worker hired adds 20 units of output. Those 20 units cost 120 dollars extra, or 6 dollars each. If diminishing returns cut the next worker's marginal product to 12 units, the same 120 dollars buys only 12 more units: 10 dollars each.

$$MC = \frac{\text{wage}}{MP_L}$$

Marginal product and marginal cost are mirror images. While marginal product is rising, marginal cost falls; once **diminishing marginal returns** set in, **marginal cost rises**.` },
                { type: "callout", tone: "key", title: "The marginal pulls the average", md: r`Exactly as with grades and with average product:

- If $MC < ATC$, the next unit costs less than the average so far, and **ATC falls**.
- If $MC > ATC$, the next unit costs more than the average, and **ATC rises**.

So ATC stops falling and starts rising at the one output where $MC = ATC$. That is why **the MC curve crosses the ATC curve at ATC's lowest point**. The same argument, using variable cost only, shows that **MC crosses AVC at AVC's lowest point**.

In Dev's table: the 5th bike's MC (24) is below the previous ATC (29), so ATC falls to 28. The 6th bike's MC (32) is above 28, so ATC rises.` },
                {
                  type: "simulation",
                  simId: LAB,
                  title: "Watch MC cut through the averages",
                  params: { price: 10, fixedCost: 60 },
                  explore: [
                    "Find the quantity where the MC curve crosses the AVC curve. Is AVC at its lowest point there?",
                    "Now find where MC crosses ATC. Why is this crossing to the right of the first one?",
                    "Raise fixed cost. Which curves move, and which stay exactly where they were?",
                  ],
                },
                { type: "check", questionId: Q("cc-1") },
                { type: "text", md: r`## The whole family of curves

Put the four curves on one graph, with quantity on the horizontal axis and dollars per unit on the vertical axis:

- **AFC** slopes down forever: the same fixed cost spread over more and more units.
- **AVC** and **ATC** are U-shaped, with ATC above AVC.
- The vertical gap between ATC and AVC is AFC, so the two curves **get closer together** as output rises.
- **MC** dips and then rises, passing through the bottom of AVC first and the bottom of ATC second.

Why is ATC's lowest point to the right of AVC's? Just past the bottom of AVC, average variable cost is rising only slightly while average fixed cost is still falling, so their sum — ATC — keeps falling a little longer.` },
                { type: "note_prompt", prompt: "Explain in your own words why the marginal cost curve crosses ATC at ATC's lowest point. A grade-average comparison works well.", suggestedTitle: "Why MC crosses ATC at its minimum", starter: "**Marginal** = the cost of one more unit. **Average** = cost per unit so far.\n\nIf MC is below ATC, then ATC ...\n\nIf MC is above ATC, then ATC ...\n\nSo the two curves cross where ...\n\nLinks: [[Marginal cost]] [[Average costs: AFC, AVC and ATC]] [[How MC, AVC and ATC fit together]]" },
                { type: "summary", points: [r`$MC = \Delta TC / \Delta Q$: subtract one row's total cost from the next. Fixed cost never affects it.`, r`$AFC = FC/Q$, $\;AVC = VC/Q$, $\;ATC = TC/Q = AFC + AVC$.`, r`$MC = \text{wage} / MP_L$: diminishing marginal returns are the reason marginal cost eventually rises.`, "When MC is below an average, that average falls; when MC is above it, the average rises. So MC crosses AVC and ATC at their lowest points.", "AFC always falls, so the gap between ATC and AVC narrows as output rises, and ATC bottoms out to the right of AVC."] },
              ],
            },
          ],
        },
        {
          id: "microeconomics.u3.competitive-firm",
          title: "The price-taking firm in the short run",
          description: "How a perfectly competitive firm chooses its output, how much profit or loss it makes, and when it should shut down.",
          objectives: [
            { id: "microeconomics.o.3d", code: "MICRO-3.D", description: "Determine a price-taking firm's profit-maximizing output using marginal revenue and marginal cost, and calculate its profit or loss.", skillIds: [S("profit-max-rule"), S("profit-calculation")] },
            { id: "microeconomics.o.3e", code: "MICRO-3.E", description: "Use the firm's price and cost curves to identify profit, break-even, loss and shutdown outcomes and the firm's short-run supply curve.", skillIds: [S("shutdown-decision"), S("firm-graph-reading")] },
          ],
          lessons: [
            {
              id: "microeconomics.l.profit-max",
              title: "Profit maximization for a price-taking firm",
              summary: "Why price equals marginal revenue in perfect competition, how MR = MC picks the best output, and how to compute the profit.",
              estMinutes: 15,
              skillIds: [S("profit-max-rule"), S("profit-calculation")],
              blocks: [
                { type: "text", md: r`Lina brews kombucha and sells it by the case at a huge farmers' market where dozens of brewers sell an identical product. If she asks for more than the going price, shoppers walk to the next stall. And she has no reason to ask for less, because she can already sell every case she brings at the going price.

A market like this — many sellers, identical products, easy entry — is called **perfectly competitive**. Lina doesn't choose her price. Her only decision is **how much to produce**.` },
                { type: "definition", term: "Price taker", md: r`A firm that must accept the market price because it is too small, relative to the whole market, to affect it. A price taker can sell as much as it wants at that price and nothing at any higher price.` },
                { type: "definition", term: "Marginal revenue (MR)", md: r`The extra revenue from selling one more unit. For a price taker every extra unit sells for the market price, so **$MR = P$**. On a graph it is a horizontal line at the market price — which is also the demand curve the individual firm faces.` },
                { type: "check", questionId: Q("pm-1") },
                { type: "callout", tone: "key", title: "The rule: produce until MR = MC", md: r`Decide one unit at a time. Each extra unit adds $MR$ to revenue and $MC$ to cost.

- If $MR > MC$, the unit adds more to revenue than to cost: **produce it**.
- If $MR < MC$, the unit adds more to cost than to revenue: **don't**.

Profit is largest at the quantity where $MR = MC$, with marginal cost rising. For a price taker that means producing where **$P = MC$**.` },
                { type: "formula", latex: r`P = MR = MC`, caption: "The profit-maximizing condition for a price-taking firm that produces." },
                {
                  type: "worked_example",
                  title: "Lina's best quantity",
                  problem: r`The market price of kombucha is 15 dollars a case. Lina's daily costs are below. How many cases should she produce, and what is her profit?

| Cases (Q) | Total cost (dollars) | Marginal cost (dollars) |
|---|---|---|
| 0 | 24 | — |
| 1 | 32 | 8 |
| 2 | 38 | 6 |
| 3 | 46 | 8 |
| 4 | 56 | 10 |
| 5 | 68 | 12 |
| 6 | 82 | 14 |
| 7 | 99 | 17 |`,
                  steps: [
                    { title: "Marginal revenue is the price", md: r`Lina is a price taker, so every case adds 15 dollars to revenue: $MR = 15$.` },
                    { title: "Walk down the table, comparing MR with MC", md: r`Cases 1 through 6 each add 15 dollars of revenue and at most 14 dollars of cost — worth producing. The 7th case would add 15 dollars of revenue but 17 dollars of cost, lowering profit by 2. Stop at **6 cases**.` },
                    { title: "Compute the profit", md: r`$TR = 15 \times 6 = 90$ and $TC = 82$, so profit $= 90 - 82 = 8$ dollars a day.` },
                    { title: "The same answer per unit", md: r`$ATC = 82 \div 6 \approx 13.67$, so profit $= (P - ATC) \times Q \approx (15 - 13.67) \times 6 = 8$ dollars.` },
                    { title: "Check the neighbors", md: r`At 5 cases profit is $75 - 68 = 7$; at 7 cases it is $105 - 99 = 6$. Six really is best. Notice that ATC is lowest at **5** cases (13.60 dollars) — yet profit is higher at 6. A slightly smaller profit per case on one more case is still more profit in total.` },
                  ],
                  answer: "6 cases a day, for a profit of 8 dollars",
                },
                { type: "callout", tone: "info", title: "When the numbers don't line up exactly", md: r`With whole units, marginal revenue may never *exactly* equal marginal cost. Produce every unit whose marginal cost is no greater than the price, and stop before the first unit that costs more than it brings in.` },
                { type: "callout", tone: "warning", title: "Three tempting wrong rules", md: r`**“Sell as much as possible.”** That maximizes revenue, not profit. Lina's 7th case raises revenue and lowers profit.

**“Produce where ATC is lowest.”** The lowest cost per unit is not the highest total profit. Lina's ATC is lowest at 5 cases; her profit is highest at 6.

**“Produce where MC is lowest.”** When marginal cost is at its lowest, extra units are at their cheapest — the best reason to keep going, not to stop.` },
                { type: "check", questionId: Q("pm-3") },
                { type: "formula", latex: r`\text{Profit} = TR - TC = (P - ATC) \times Q`, caption: "Two routes to the same number. P − ATC is profit per unit; multiplying by Q gives total profit." },
                { type: "callout", tone: "tip", title: "Per unit or in total?", md: r`$P - ATC$ is only the profit on **each** unit. Total profit multiplies that by the number of units — on a graph, a rectangle with height $P - ATC$ and width $Q$. If price is below ATC the same formula gives a negative number: a loss.` },
                { type: "check", questionId: Q("pc-2") },
                {
                  type: "simulation",
                  simId: LAB,
                  title: "Find the best quantity",
                  params: { price: 14, fixedCost: 60, quantity: 10 },
                  explore: [
                    "Increase the quantity from 10 and watch profit. Where does it peak? Compare marginal cost with the price at that quantity.",
                    "Push the quantity past the peak. Why does profit fall even though revenue is still rising?",
                    "Change the fixed cost. Does the profit-maximizing quantity move? Does the profit?",
                  ],
                },
                { type: "text", md: r`## Which profit do economists mean?

An accountant subtracts only **explicit costs** — money actually paid out. An economist also subtracts **implicit costs**: what the owner gives up to run the firm, such as the salary Lina could earn elsewhere and the interest her savings could earn.

- **Accounting profit** = total revenue − explicit costs
- **Economic profit** = total revenue − explicit costs − implicit costs

The cost curves in this unit include both kinds of cost, so “profit” here always means **economic profit**. Zero economic profit is not a failure: it means the owner is doing exactly as well as in the next-best alternative.` },
                { type: "tutor_prompt", prompts: ["Why isn't the lowest average cost the most profitable output?", "Walk me through MR = MC with a new table.", "If price equals marginal revenue, why not just produce as much as possible?"] },
                { type: "summary", points: [r`A price taker sells every unit at the market price, so $MR = P$.`, r`Produce each unit for which $MR \ge MC$; profit is largest where $P = MR = MC$ with marginal cost rising.`, "Maximum revenue, minimum ATC and minimum MC are not the profit-maximizing output.", r`Profit $= TR - TC = (P - ATC) \times Q$ — remember to multiply by quantity.`, "Economic profit subtracts implicit as well as explicit costs; zero economic profit means the owner matches the next-best alternative."] },
              ],
            },
            {
              id: "microeconomics.l.firm-graph",
              title: "Reading the firm's graph: profit, loss and the shutdown rule",
              summary: "Use the price line and the MC, ATC and AVC curves to tell profit from loss, decide when a losing firm should close, and find the firm's supply curve.",
              estMinutes: 15,
              skillIds: [S("shutdown-decision"), S("firm-graph-reading")],
              blocks: [
                { type: "text", md: r`A perfectly competitive firm's whole short-run story fits on one graph: quantity on the horizontal axis, dollars per unit on the vertical axis, and four lines.

- A **horizontal price line** ($P = MR$), set by the market.
- The **MC** curve, rising through the low points of the two average curves.
- The U-shaped **ATC** curve, and below it the U-shaped **AVC** curve.

Read it in three moves:

1. **Find the quantity.** Go to where the price line meets the rising MC curve. Call that quantity $q^*$.
2. **Compare price with ATC at $q^*$.** Above ATC means profit; below ATC means loss. The size is a rectangle: height $P - ATC$, width $q^*$.
3. **If there is a loss, compare price with AVC.** That decides whether the firm should produce at all.` },
                { type: "definition", term: "Break-even price", md: r`The price equal to **minimum ATC**. At that price the price line just touches the bottom of the ATC curve, $P = MC = ATC$, and economic profit is exactly zero. Any higher price gives a profit; any lower price gives a loss.` },
                { type: "text", md: r`## A loss — but should the firm close?

Suppose the price falls below minimum ATC, so the firm loses money at every output. In the short run it has two options, and **both involve a loss**:

- **Shut down** (produce nothing for now). Revenue is zero and variable cost is zero, but fixed cost is still owed. Loss = fixed cost.
- **Keep producing** at $q^*$. Loss = fixed cost − (revenue − variable cost).

Producing is better whenever revenue is at least as large as variable cost — that is, whenever price is at least AVC. Then every unit sold covers its own variable cost and contributes something toward the fixed cost bill.` },
                { type: "definition", term: "Shutdown rule", md: r`In the short run a firm should produce nothing if the price is **below minimum average variable cost**, because revenue would not even cover variable cost. Otherwise it should produce where $P = MC$, even at a loss. Minimum AVC is called the **shutdown price**.` },
                { type: "formula", latex: r`\text{Shut down if } P < \min AVC \quad (\text{that is, if } TR < VC)`, caption: "The comparison uses average variable cost. Fixed cost plays no part." },
                {
                  type: "worked_example",
                  title: "Lina at three prices",
                  problem: r`Lina's fixed cost is 24 dollars a day. Her cost table, now with the averages filled in:

| Q | TC | MC | AVC | ATC |
|---|---|---|---|---|
| 1 | 32 | 8 | 8.00 | 32.00 |
| 2 | 38 | 6 | 7.00 | 19.00 |
| 3 | 46 | 8 | 7.33 | 15.33 |
| 4 | 56 | 10 | 8.00 | 14.00 |
| 5 | 68 | 12 | 8.80 | 13.60 |
| 6 | 82 | 14 | 9.67 | 13.67 |
| 7 | 99 | 17 | 10.71 | 14.14 |

Minimum AVC is 7.00 and minimum ATC is 13.60. What should she do at a price of (a) 15 dollars, (b) 11 dollars, (c) 6.50 dollars?`,
                  steps: [
                    { title: "(a) Price 15: above minimum ATC", md: r`From the last lesson: she produces 6 cases and earns $90 - 82 = 8$ dollars. **Profit.**` },
                    { title: "(b) Price 11: between minimum AVC and minimum ATC", md: r`Cases 1–4 have marginal cost of at most 10; the 5th costs 12, more than the price. So $q^* = 4$. Profit $= 44 - 56 = -12$: a loss of 12 dollars.` },
                    { title: "(b) Should she close instead?", md: r`Shutting down would lose the full fixed cost of 24 dollars. By producing, her 44 dollars of revenue covers the 32 dollars of variable cost and leaves 12 dollars toward fixed cost. Losing 12 beats losing 24: **produce at a loss**.` },
                    { title: "(c) Price 6.50: below minimum AVC", md: r`Her best output if she produced would be 2 cases: revenue of 13 dollars against variable cost of 14 dollars. Revenue doesn't even cover variable cost, so producing would lose $13 - 38 = -25$ dollars — worse than the 24 dollars she loses by closing. **Shut down.**` },
                  ],
                  answer: "(a) Produce 6 cases, profit of 8 dollars. (b) Produce 4 cases, loss of 12 dollars. (c) Shut down, loss of 24 dollars.",
                },
                { type: "callout", tone: "warning", title: "Don't use ATC for the shutdown decision", md: r`“Price is below ATC, so the firm should close” is the classic mistake. Price below ATC only tells you there is a **loss**. Whether to keep producing depends on **AVC**.

Fixed cost is owed under both choices, so it cannot tip the decision either way. Only the things that differ between the two choices matter — revenue and variable cost.` },
                { type: "check", questionId: Q("sd-1") },
                { type: "text", md: r`## Four cases on one graph

| Where the price line sits | At $q^*$ | What the firm does |
|---|---|---|
| Above minimum ATC | $P > ATC$ | Produces; economic profit |
| At minimum ATC | $P = ATC$ | Produces; breaks even |
| Between minimum AVC and minimum ATC | $AVC < P < ATC$ | Produces; loss smaller than fixed cost |
| Below minimum AVC | $P < AVC$ | Shuts down; loss equals fixed cost |` },
                {
                  type: "simulation",
                  simId: LAB,
                  title: "From profit to shutdown",
                  params: { price: 12, fixedCost: 60 },
                  explore: [
                    "Slide the price down from 12 and watch the profit readout change sign. What is special about the price line's position when that happens?",
                    "Keep lowering the price. The firm keeps producing even while it loses money. What finally makes it stop?",
                    "Double the fixed cost. Which changes — the price where profit hits zero, the price where the firm shuts down, or both?",
                  ],
                },
                { type: "check", questionId: Q("fg-4"), lead: "Classify the firm using the lab." },
                { type: "check", questionId: Q("sd-5"), lead: "Now find the shutdown price." },
                { type: "text", md: r`## The firm's short-run supply curve

A supply curve answers the question “how much will the firm produce at each price?” You already know the answer: at each price the firm goes to where $P = MC$ — unless the price is below minimum AVC, in which case it produces nothing.

So the firm's **short-run supply curve is its MC curve above minimum AVC**. Lina's table shows it in miniature: at 15 dollars she supplies 6 cases, at 11 dollars she supplies 4, and at 6.50 dollars she supplies none. Rising marginal cost is the reason supply curves slope upward.` },
                { type: "note_prompt", prompt: "Write yourself a three-step recipe for reading a competitive firm's graph, and state the shutdown rule in your own words.", suggestedTitle: "Reading the firm's graph", starter: "1. Find the quantity where ...\n2. Compare price with ... to see profit or loss.\n3. If there is a loss, compare price with ... to decide whether to produce.\n\n**Shutdown rule:** \n\n**Why fixed cost doesn't matter:** \n\nLinks: [[The shutdown decision]] [[Reading the competitive firm's graph]] [[Profit-maximizing output (MR = MC)]]" },
                { type: "summary", points: [r`Read the graph in three moves: find $q^*$ where $P = MC$; compare $P$ with ATC for profit or loss; if there is a loss, compare $P$ with AVC.`, "Break-even price = minimum ATC. Shutdown price = minimum AVC.", r`A firm with a loss keeps producing when $P \ge AVC$, because revenue then covers variable cost and part of fixed cost.`, r`If $P < \min AVC$ the firm shuts down and loses exactly its fixed cost.`, "Fixed cost is owed either way, so it never affects the shutdown decision.", "The short-run supply curve is the MC curve above minimum AVC."] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: microeconomicsQuestions,

  assessments: [
    {
      id: "microeconomics.quiz.costs",
      kind: "skill_quiz",
      title: "Quiz: production and costs",
      description: "Six questions on marginal and average product, cost types, marginal cost and the average cost curves. No hints.",
      unitId: "microeconomics.u3",
      topicId: "microeconomics.u3.production-cost",
      questionIds: [Q("mp-2"), Q("ct-5"), Q("mc-2"), Q("mc-4"), Q("ac-2"), Q("cc-2")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    {
      id: "microeconomics.quiz.profit",
      kind: "lesson_quiz",
      title: "Quiz: profit maximization and firm decisions",
      description: "Six questions on choosing output with MR = MC, calculating profit and loss, and deciding whether to keep producing. No hints.",
      unitId: "microeconomics.u3",
      topicId: "microeconomics.u3.competitive-firm",
      questionIds: [Q("pm-2"), Q("pm-4"), Q("pc-1"), Q("pc-5"), Q("sd-2"), Q("fg-1")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    {
      id: "microeconomics.test.u3-firm",
      kind: "unit_test",
      title: "Unit 3 test: production, cost and the competitive firm",
      description: "Ten questions, 25 minutes. Covers short-run production, short-run costs and the price-taking firm's short-run decisions — the part of Unit 3 AceAP currently teaches. Long-run costs and long-run competitive equilibrium are not included.",
      unitId: "microeconomics.u3",
      questionIds: [Q("mp-5"), Q("ct-2"), Q("mc-5"), Q("ac-4"), Q("cc-3"), Q("pm-5"), Q("pc-3"), Q("sd-4"), Q("sd-6"), Q("fg-3")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 25 * 60 },
    },
    {
      id: "microeconomics.exam.set-1",
      kind: "exam_practice",
      title: "AP-style practice set: costs and the competitive firm",
      description: "Eight original AP-style multiple-choice and short-answer items under exam-like timing (2 minutes per question).",
      questionIds: [Q("mp-6"), Q("mc-3"), Q("cc-4"), Q("cc-5"), Q("pc-4"), Q("pc-7"), Q("sd-7"), Q("fg-2")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 16 * 60 },
    },
  ],

  simulations: [
    {
      id: LAB,
      name: "Firm Behavior Lab",
      purpose: "Show how a price-taking firm's cost curves and the market price together determine its profit-maximizing quantity, its profit or loss, and whether it should produce at all in the short run.",
      variables: [
        { name: "Market price", description: "The price the firm takes as given; also its marginal revenue" },
        { name: "Fixed cost", description: "Cost owed at every output, including zero; shifts ATC but not MC or AVC" },
        { name: "Cost parameters a, b, c", description: "Shape the variable cost curve in TC = F + a·q − b·q² + c·q³" },
        { name: "Quantity", description: "The output level being inspected on the graph" },
      ],
      outputs: [
        "Price line with the MC, ATC and AVC curves",
        "Profit-maximizing quantity q*",
        "Total revenue, total cost and profit",
        "ATC and AVC at q*",
        "Minimum AVC (shutdown price) and minimum ATC (break-even price)",
        "Operate or shut down decision",
      ],
      skillIds: [S("cost-curve-relationships"), S("profit-max-rule"), S("profit-calculation"), S("shutdown-decision"), S("firm-graph-reading")],
      accessibilityAlternative: "Every value the graph conveys — the profit-maximizing quantity, revenue, total cost, profit, ATC and AVC at that quantity, minimum AVC, minimum ATC and the operate-or-shut-down decision — is also reported as a text readout that updates when the price, fixed cost or quantity is changed, so the lab's questions can be answered without reading the curves.",
    },
  ],
});
