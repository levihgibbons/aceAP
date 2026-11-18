/**
 * AP Microeconomics — question bank for the pilot sequence (short-run
 * production, short-run costs and the price-taking firm). All items are
 * original AceAP content about clearly hypothetical firms; none are College
 * Board questions. Answers are checked by `npm run content:validate`.
 *
 * Currency is written in words ("14 dollars") rather than with the dollar
 * sign, because that character delimits LaTeX in lesson and question text.
 */
import type { AuthoredQuestionInput } from "@/modules/content/schema";

const r = String.raw;
const S = (id: string) => `microeconomics.${id}`;
const M = (id: string) => `microeconomics.m.${id}`;
const LAB = "firm-behavior-lab";

// ─────────────────────────── Shared data tables ────────────────────────────
// Every table is internally consistent: TC = FC + VC, MC = ΔTC/ΔQ.

/** Pottery studio. MP: 8, 12, 10, 6, 2. AP: 8, 10, 10, 9, 7.6. */
const POTTERY_TABLE = `| Workers | Total product (mugs per day) |
|---|---|
| 0 | 0 |
| 1 | 8 |
| 2 | 20 |
| 3 | 30 |
| 4 | 36 |
| 5 | 38 |`;

/** T-shirt printer, FC = 50. VC: 0, 20, 36, 55, 80. MC: 20, 16, 19, 25. */
const SHIRT_TABLE = `| Batches of shirts (Q) | Total cost (dollars) |
|---|---|
| 0 | 50 |
| 1 | 70 |
| 2 | 86 |
| 3 | 105 |
| 4 | 130 |`;

/**
 * Candle maker, FC = 40. VC: 0, 20, 34, 45, 60, 80, 108. MC: 20, 14, 11, 15, 20, 28.
 * AVC: 20, 17, 15, 15, 16, 18 (min 15). ATC: 60, 37, 28.33, 25, 24, 24.67 (min 24 at Q = 5).
 */
const CANDLE_TABLE = `| Cases of candles (Q) | Total cost (dollars) |
|---|---|
| 0 | 40 |
| 1 | 60 |
| 2 | 74 |
| 3 | 85 |
| 4 | 100 |
| 5 | 120 |
| 6 | 148 |`;

/**
 * Carrot grower, FC = 30. MC: 8, 6, 8, 10, 13, 16, 19.
 * ATC: 38, 22, 17.33, 15.5, 15, 15.17, 15.71 (min 15 at Q = 5).
 * Profit at P = 17: −30, −21, −10, −1, 6, 10, 11, 9 → best at Q = 6.
 */
const CARROT_TABLE = `| Crates of carrots (Q) | Total cost (dollars) |
|---|---|
| 0 | 30 |
| 1 | 38 |
| 2 | 44 |
| 3 | 52 |
| 4 | 62 |
| 5 | 75 |
| 6 | 91 |
| 7 | 110 |`;

export const microeconomicsQuestions: AuthoredQuestionInput[] = [
  // ─────────────────────── Marginal and average product ────────────────────
  {
    id: "microeconomics.q.mp-1",
    skillIds: [S("marginal-product")],
    difficulty: 1,
    pattern: "mp-from-table",
    estSeconds: 60,
    prompt: `A pottery studio has one kiln, which it cannot replace or add to this month. It can hire workers by the day.

${POTTERY_TABLE}

What is the **marginal product** of the 4th worker?`,
    body: {
      type: "numeric",
      answer: 6,
      tolerance: { abs: 0.01 },
      unit: "mugs per day",
      commonErrors: [
        { value: 9, misconception: M("marginal-vs-average"), note: "9 is the average product with 4 workers (36 ÷ 4). Marginal product is the change in total product when the 4th worker is added." },
        { value: 36, misconception: M("marginal-vs-average"), note: "36 is the total product of all 4 workers. The 4th worker alone added only the difference between 36 and 30." },
      ],
    },
    hints: ["Marginal product is the extra output from adding one more worker.", "Compare total product with 4 workers (36) to total product with 3 workers (30)."],
    solution: r`Marginal product is the change in total product: $MP = 36 - 30 = 6$ mugs per day.`,
  },
  {
    id: "microeconomics.q.mp-2",
    skillIds: [S("marginal-product")],
    difficulty: 2,
    pattern: "ap-from-table",
    estSeconds: 60,
    prompt: `A pottery studio has one kiln and hires workers by the day.

${POTTERY_TABLE}

What is the **average product** of labor when the studio employs 4 workers?`,
    body: {
      type: "numeric",
      answer: 9,
      tolerance: { abs: 0.01 },
      unit: "mugs per worker",
      commonErrors: [{ value: 6, misconception: M("marginal-vs-average"), note: "6 is the marginal product of the 4th worker (36 − 30). Average product divides all the output by all the workers." }],
    },
    hints: ["Average product is output per worker.", "Divide total product with 4 workers by 4."],
    solution: r`$AP = \dfrac{TP}{L} = \dfrac{36}{4} = 9$ mugs per worker. (The 4th worker's marginal product is only 6, which is why the average has slipped from 10 to 9.)`,
  },
  {
    id: "microeconomics.q.mp-3",
    skillIds: [S("marginal-product")],
    difficulty: 2,
    pattern: "diminishing-returns",
    estSeconds: 75,
    prompt: `A pottery studio has one kiln and hires workers by the day.

${POTTERY_TABLE}

With which worker do **diminishing marginal returns** begin?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The 2nd worker", rationale: "The 2nd worker adds 12 mugs, more than the 1st worker's 8. Marginal product is still rising here." },
        { id: "b", text: "The 5th worker", misconception: M("diminishing-means-falling"), rationale: "Marginal product has been falling since the 3rd worker. It does not have to get close to zero before returns count as diminishing." },
        { id: "c", text: "The 3rd worker", rationale: "Marginal product falls for the first time here: from 12 mugs (2nd worker) to 10 mugs (3rd worker)." },
        { id: "d", text: "They never begin, because total product rises with every worker", misconception: M("diminishing-means-falling"), rationale: "Diminishing returns is about marginal product getting smaller, not about total product falling." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Work out the marginal product of each worker first.", "The marginal products are 8, 12, 10, 6 and 2. Where does the list first turn down?"],
    solution: "The marginal products are 8, 12, 10, 6 and 2 mugs. Marginal product rises with the 2nd worker and then falls from the 3rd worker onward, so diminishing marginal returns begin with the 3rd worker — even though total product keeps rising.",
  },
  {
    id: "microeconomics.q.mp-4",
    skillIds: [S("marginal-product")],
    difficulty: 1,
    pattern: "input-types",
    estSeconds: 45,
    prompt: "A pizzeria has signed a one-year lease on its building and oven. Thinking about the next month, which of its inputs is **fixed**?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Pizza dough and toppings", rationale: "The pizzeria buys more of these whenever it makes more pizzas — a variable input." },
        { id: "b", text: "Hours worked by part-time staff", rationale: "Staff hours can be raised or lowered week to week — a variable input." },
        { id: "c", text: "Delivery boxes", rationale: "More pizzas delivered means more boxes — a variable input." },
        { id: "d", text: "The oven and building", rationale: "The lease locks these in for the year, so their quantity cannot change with output this month." },
      ],
      correctChoiceId: "d",
    },
    hints: ["A fixed input is one whose quantity cannot be changed during the period you are looking at.", "Which input is locked in by the one-year lease?"],
    solution: "The oven and building are fixed for the month: the lease means the pizzeria has the same amount of them whether it sells 10 pizzas or 1,000. Dough, staff hours and boxes all rise and fall with output.",
  },
  {
    id: "microeconomics.q.mp-5",
    skillIds: [S("marginal-product")],
    difficulty: 3,
    pattern: "why-diminishing",
    estSeconds: 75,
    prompt: "A café keeps hiring identical, equally skilled baristas to work at its single espresso machine. Why does the marginal product of baristas eventually fall?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Each additional barista has less of the fixed equipment to work with, so adds less output than the one before", rationale: "The variable input is being spread ever more thinly over a fixed input." },
        { id: "b", text: "Baristas hired later are less skilled than baristas hired earlier", rationale: "The baristas are identical. Diminishing returns would appear even with perfectly identical workers." },
        { id: "c", text: "Total output starts falling as soon as the café hires a second barista", misconception: M("diminishing-means-falling"), rationale: "Total output usually keeps rising; it is the size of each addition that shrinks." },
        { id: "d", text: "The café has grown too large to manage, which raises its long-run costs", rationale: "That describes a long-run scale problem, where every input changes. Diminishing returns is a short-run idea with one input held fixed." },
      ],
      correctChoiceId: "a",
    },
    hints: ["What stays the same while the number of baristas grows?", "Picture four baristas queuing to use one machine."],
    solution: "Diminishing marginal returns come from adding more of a variable input to a fixed input. With only one espresso machine, each extra barista has less equipment to work with and adds fewer drinks than the barista before — even though all of them are equally skilled.",
  },
  {
    id: "microeconomics.q.mp-6",
    skillIds: [S("marginal-product")],
    difficulty: 3,
    pattern: "mp-ap-link",
    estSeconds: 75,
    prompt: "A farm's 5 workers have an average product of 12 crates each. A 6th worker is hired and has a marginal product of 9 crates. What happens to average product?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "It rises, because total output went up", misconception: M("marginal-vs-average"), rationale: "Total product does rise, but the average rises only if the new worker adds more than the current average." },
        { id: "b", text: "It falls, because the marginal product is below the average product", rationale: "Total product becomes 60 + 9 = 69 crates, so average product is 69 ÷ 6 = 11.5." },
        { id: "c", text: "It stays at 12, because average product does not depend on the last worker", rationale: "The average is recalculated over all six workers, including the new one." },
        { id: "d", text: "It falls to 9 crates", misconception: M("marginal-vs-average"), rationale: "9 is the marginal product. The average moves toward it but only part of the way: 69 ÷ 6 = 11.5." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Find total product before the 6th worker: 5 workers × 12 crates.", "Add the 6th worker's 9 crates and divide the new total by 6."],
    solution: r`Before: $TP = 5 \times 12 = 60$. After: $TP = 69$, so $AP = 69 \div 6 = 11.5$. Whenever the marginal product is below the average product, the average is pulled down.`,
  },
  {
    id: "microeconomics.q.mp-7",
    skillIds: [S("marginal-product")],
    difficulty: 2,
    pattern: "stages",
    estSeconds: 75,
    prompt: "A bakery keeps adding workers to a kitchen of fixed size. Put the three stages of production in the order they occur as employment increases.",
    body: {
      type: "ordering",
      items: [
        { id: "inc", text: "Increasing marginal returns: each new worker adds more than the last, because workers can specialize" },
        { id: "dim", text: "Diminishing marginal returns: each new worker adds less than the last, but total output still rises" },
        { id: "neg", text: "Negative marginal returns: an added worker gets in the way and total output falls" },
      ],
      correctOrder: ["inc", "dim", "neg"],
    },
    hints: ["What can two workers do in a kitchen that one worker cannot?", "Marginal product first rises, then falls while staying positive, and only then drops below zero."],
    solution: "The first few workers divide up tasks, so marginal product rises. As the fixed kitchen becomes crowded, marginal product falls but stays positive, so total output still grows. With enough crowding, marginal product turns negative and total output falls.",
  },

  // ─────────────────────── Fixed, variable and total cost ──────────────────
  {
    id: "microeconomics.q.ct-1",
    skillIds: [S("cost-types")],
    difficulty: 1,
    pattern: "classify",
    estSeconds: 45,
    prompt: "A food truck owner pays for all of the following. Which one is a **variable** cost?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The annual city vending permit", misconception: M("fixed-variable-mixup"), rationale: "The permit costs the same whether the truck sells 5 meals or 5,000 — a fixed cost." },
        { id: "b", text: "The monthly loan payment on the truck", misconception: M("fixed-variable-mixup"), rationale: "The payment is owed even in a month with no sales — a fixed cost." },
        { id: "c", text: "Ingredients for each meal sold", rationale: "Every extra meal needs more ingredients, so this cost rises with output." },
        { id: "d", text: "The insurance premium for the year", misconception: M("fixed-variable-mixup"), rationale: "The premium does not depend on how many meals are sold — a fixed cost." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Ask of each bill: would it be larger if the truck sold one more meal today?", "Three of these must be paid even if the truck stays parked."],
    solution: "Ingredients are a variable cost: the more meals sold, the more is spent on them. The permit, loan payment and insurance are the same at every level of output, so they are fixed costs.",
  },
  {
    id: "microeconomics.q.ct-2",
    skillIds: [S("cost-types")],
    difficulty: 2,
    pattern: "classify-select",
    estSeconds: 90,
    prompt: "A bakery has the costs below this month. Select **all** of the fixed costs.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "Rent on the shop" },
        { id: "b", text: "Flour and butter", misconception: M("fixed-variable-mixup"), rationale: "Every extra loaf uses more flour and butter, so this cost rises with output." },
        { id: "c", text: "This month's installment of the annual insurance premium" },
        { id: "d", text: "Wages of bakers who are paid by the hour and scheduled as needed", misconception: M("fixed-variable-mixup"), rationale: "The bakery schedules more baker-hours when it bakes more, so this cost varies with output." },
        { id: "e", text: "The lease payment on the oven" },
      ],
      correctChoiceIds: ["a", "c", "e"],
    },
    hints: ["A fixed cost is the same whether the bakery bakes nothing or bakes all day.", "Rent, insurance and a lease are set by contracts, not by the number of loaves."],
    solution: "Rent, the insurance installment and the oven lease are owed regardless of output — fixed costs. Flour, butter and hourly wages rise as the bakery bakes more — variable costs.",
  },
  {
    id: "microeconomics.q.ct-3",
    skillIds: [S("cost-types")],
    difficulty: 2,
    pattern: "compute-from-table",
    estSeconds: 75,
    prompt: `A T-shirt printer's short-run total cost is shown below.

${SHIRT_TABLE}

What is the **variable cost** of producing 3 batches?`,
    body: {
      type: "numeric",
      answer: 55,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 105, misconception: M("fixed-variable-mixup"), note: "105 is total cost. Subtract the fixed cost — the 50 dollars owed even at zero output." },
        { value: 19, misconception: M("marginal-vs-average"), note: "19 is the marginal cost of the 3rd batch alone (105 − 86). Variable cost counts all three batches." },
      ],
    },
    hints: ["Find fixed cost first: it is total cost when output is zero.", "Variable cost = total cost − fixed cost = 105 − 50."],
    solution: r`Fixed cost is the total cost at $Q = 0$: 50 dollars. So $VC = TC - FC = 105 - 50 = 55$ dollars.`,
  },
  {
    id: "microeconomics.q.ct-4",
    skillIds: [S("cost-types")],
    difficulty: 1,
    pattern: "fixed-cost-at-zero",
    estSeconds: 45,
    prompt: "A printing shop's total cost is 240 dollars on a day it prints nothing and 600 dollars on a day it prints 40 posters. What is its **fixed cost** per day?",
    body: {
      type: "numeric",
      answer: 240,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 0, misconception: M("fixed-variable-mixup"), note: "Fixed cost is owed even when nothing is produced — that is exactly why total cost is 240 dollars at zero output." },
        { value: 360, misconception: M("fixed-variable-mixup"), note: "360 is the variable cost of printing 40 posters (600 − 240)." },
      ],
    },
    hints: ["With zero output there is no variable cost.", "So everything the shop pays on a day it prints nothing is fixed cost."],
    solution: "When output is zero, variable cost is zero, so total cost equals fixed cost: 240 dollars. (The other 360 dollars on the busy day is the variable cost of 40 posters.)",
  },
  {
    id: "microeconomics.q.ct-5",
    skillIds: [S("cost-types")],
    difficulty: 2,
    pattern: "total-from-parts",
    estSeconds: 75,
    prompt: "A lawn-care business pays 900 dollars a month for equipment leases and insurance, no matter how many lawns it mows. Fuel and labor cost 12 dollars per lawn. What is its **total cost** in a month when it mows 150 lawns?",
    body: {
      type: "numeric",
      answer: 2700,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 1800, misconception: M("fixed-variable-mixup"), note: "1,800 dollars is the variable cost only. Add the 900 dollars of fixed cost." },
        { value: 912, misconception: M("per-unit-not-total"), note: "The 12 dollars is per lawn. Multiply by 150 lawns before adding fixed cost." },
      ],
    },
    hints: ["Total cost = fixed cost + variable cost.", "Variable cost is 12 dollars × 150 lawns = 1,800 dollars."],
    solution: r`$VC = 12 \times 150 = 1800$ and $FC = 900$, so $TC = 900 + 1800 = 2700$ dollars.`,
  },

  // ─────────────────────────────── Marginal cost ───────────────────────────
  {
    id: "microeconomics.q.mc-1",
    skillIds: [S("marginal-cost")],
    difficulty: 1,
    pattern: "mc-from-table",
    estSeconds: 60,
    prompt: `A candle maker's short-run total cost is shown below.

${CANDLE_TABLE}

What is the **marginal cost** of the 4th case?`,
    body: {
      type: "numeric",
      answer: 15,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 25, misconception: M("marginal-vs-average"), note: "25 is average total cost at 4 cases (100 ÷ 4). Marginal cost is the change in total cost from the 3rd case to the 4th." },
        { value: 100, misconception: M("marginal-vs-average"), note: "100 is the total cost of all four cases. The 4th case alone added 100 − 85." },
      ],
    },
    hints: ["Marginal cost is the extra cost of producing one more unit.", "Subtract total cost at 3 cases from total cost at 4 cases."],
    solution: r`$MC = \Delta TC \div \Delta Q = (100 - 85) \div 1 = 15$ dollars.`,
  },
  {
    id: "microeconomics.q.mc-2",
    skillIds: [S("marginal-cost")],
    difficulty: 2,
    pattern: "mc-from-change",
    estSeconds: 75,
    prompt: "A bottling plant raises output from 200 to 250 cases a day, and its total cost rises from 3,000 to 3,400 dollars. What is the marginal cost **per case** over this range?",
    body: {
      type: "numeric",
      answer: 8,
      tolerance: { abs: 0.01 },
      unit: "dollars per case",
      commonErrors: [{ value: 13.6, misconception: M("marginal-vs-average"), note: "3,400 ÷ 250 = 13.60 is average total cost at the new output. Marginal cost uses only the changes: 400 extra dollars for 50 extra cases." }],
    },
    hints: ["When output changes by more than one unit, divide the change in total cost by the change in quantity.", "Total cost rises by 400 dollars while output rises by 50 cases."],
    solution: r`$MC = \dfrac{\Delta TC}{\Delta Q} = \dfrac{3400 - 3000}{250 - 200} = \dfrac{400}{50} = 8$ dollars per case.`,
  },
  {
    id: "microeconomics.q.mc-3",
    skillIds: [S("marginal-cost"), S("marginal-product")],
    difficulty: 3,
    pattern: "wage-over-mp",
    estSeconds: 90,
    prompt: "A workshop pays each worker 120 dollars a day, and labor is its only variable input. The last worker hired adds 20 chairs a day to output. What is the marginal cost of each of those chairs?",
    body: { type: "numeric", answer: 6, tolerance: { abs: 0.01 }, unit: "dollars per chair" },
    hints: ["Hiring the worker adds 120 dollars to cost and 20 chairs to output.", "Marginal cost = extra cost ÷ extra output = wage ÷ marginal product."],
    solution: r`The extra worker adds 120 dollars of cost and 20 chairs of output, so $MC = \dfrac{\text{wage}}{MP} = \dfrac{120}{20} = 6$ dollars per chair. If diminishing returns cut the next worker's marginal product to 12 chairs, marginal cost would rise to $120 \div 12 = 10$ dollars.`,
  },
  {
    id: "microeconomics.q.mc-4",
    skillIds: [S("marginal-cost"), S("marginal-product")],
    difficulty: 3,
    pattern: "why-mc-rises",
    estSeconds: 75,
    prompt: "A firm hires workers at a constant wage. Once diminishing marginal returns set in, what happens to the marginal cost of output, and why?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Marginal cost falls, because fixed cost is spread over more units", misconception: M("marginal-vs-average"), rationale: "Spreading fixed cost lowers average fixed cost. Marginal cost ignores fixed cost entirely." },
        { id: "b", text: "Marginal cost stays constant, because the wage has not changed", rationale: "The cost per worker is constant, but each worker now adds fewer units, so the cost per extra unit rises." },
        { id: "c", text: "Marginal cost rises only if the firm has to pay higher wages to attract more workers", rationale: "Marginal cost rises even at a constant wage, because the same wage buys less extra output." },
        { id: "d", text: "Marginal cost rises, because each additional worker costs the same wage but adds fewer units", rationale: "Marginal cost is the wage divided by marginal product; a smaller marginal product means a larger marginal cost." },
      ],
      correctChoiceId: "d",
    },
    hints: ["Marginal cost of a unit = wage ÷ marginal product of labor.", "If the wage is constant and marginal product is shrinking, what happens to that ratio?"],
    solution: r`$MC = \dfrac{\text{wage}}{MP}$. With a constant wage and a falling marginal product, each extra unit of output takes more labor time, so marginal cost rises. Rising marginal cost is diminishing marginal returns seen from the cost side.`,
  },
  {
    id: "microeconomics.q.mc-5",
    skillIds: [S("marginal-cost"), S("cost-types")],
    difficulty: 3,
    pattern: "fixed-cost-irrelevant",
    estSeconds: 90,
    prompt: `A candle maker's short-run total cost is shown below. Fixed cost is 40 dollars.

${CANDLE_TABLE}

Insurance becomes more expensive, raising fixed cost from 40 to 70 dollars. Nothing else changes. What is the marginal cost of the 4th case **now**?`,
    body: {
      type: "numeric",
      answer: 15,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 45, misconception: M("fixed-cost-in-decision"), note: "Adding 30 dollars to total cost in every row leaves the difference between rows — marginal cost — unchanged." },
        { value: 22.5, misconception: M("fixed-cost-in-decision"), note: "Spreading the extra 30 dollars over 4 cases changes average cost, not marginal cost." },
        { value: 32.5, misconception: M("marginal-vs-average"), note: "32.50 is the new average total cost at 4 cases (130 ÷ 4). Marginal cost is still 130 − 115." },
      ],
    },
    hints: ["Add 30 dollars to total cost in the 3-case row and in the 4-case row.", "The new totals are 115 and 130. What is their difference?"],
    solution: r`Every row's total cost rises by 30, so the 3-case and 4-case totals become 115 and 130. $MC = 130 - 115 = 15$ dollars — exactly what it was before. A change in fixed cost never changes marginal cost.`,
  },

  // ─────────────────────── Average costs: AFC, AVC, ATC ────────────────────
  {
    id: "microeconomics.q.ac-1",
    skillIds: [S("average-costs")],
    difficulty: 1,
    pattern: "atc-from-table",
    estSeconds: 60,
    prompt: `A T-shirt printer's short-run total cost is shown below.

${SHIRT_TABLE}

What is **average total cost** when the printer produces 4 batches?`,
    body: {
      type: "numeric",
      answer: 32.5,
      tolerance: { abs: 0.01 },
      unit: "dollars per batch",
      commonErrors: [
        { value: 25, misconception: M("marginal-vs-average"), note: "25 is the marginal cost of the 4th batch (130 − 105). Average total cost spreads the whole 130 dollars over 4 batches." },
        { value: 20, misconception: M("fixed-variable-mixup"), note: "20 is average variable cost (80 ÷ 4). Average total cost also includes the 50 dollars of fixed cost." },
      ],
    },
    hints: ["Average total cost is total cost per unit.", "Divide 130 by 4."],
    solution: r`$ATC = \dfrac{TC}{Q} = \dfrac{130}{4} = 32.50$ dollars per batch.`,
  },
  {
    id: "microeconomics.q.ac-2",
    skillIds: [S("average-costs"), S("cost-types")],
    difficulty: 2,
    pattern: "avc-from-table",
    estSeconds: 90,
    prompt: `A candle maker's short-run total cost is shown below.

${CANDLE_TABLE}

What is **average variable cost** when the firm produces 5 cases?`,
    body: {
      type: "numeric",
      answer: 16,
      tolerance: { abs: 0.01 },
      unit: "dollars per case",
      commonErrors: [
        { value: 24, misconception: M("fixed-variable-mixup"), note: "24 is average total cost (120 ÷ 5). Remove the 40 dollars of fixed cost before dividing." },
        { value: 20, misconception: M("marginal-vs-average"), note: "20 is the marginal cost of the 5th case (120 − 100). Average variable cost spreads all variable cost over all 5 cases." },
      ],
    },
    hints: ["Fixed cost is total cost at zero output: 40 dollars.", "Variable cost at 5 cases is 120 − 40 = 80. Divide by 5."],
    solution: r`$FC = 40$, so $VC = 120 - 40 = 80$ and $AVC = \dfrac{80}{5} = 16$ dollars per case.`,
  },
  {
    id: "microeconomics.q.ac-3",
    skillIds: [S("average-costs")],
    difficulty: 2,
    pattern: "afc-behavior",
    estSeconds: 60,
    prompt: "As a firm produces more and more output in the short run, what happens to its average fixed cost?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "It stays constant, because fixed cost does not change", misconception: M("marginal-vs-average"), rationale: "Total fixed cost is constant. Average fixed cost is that constant divided by a growing quantity, so it shrinks." },
        { id: "b", text: "It falls at first and then rises, like average total cost", rationale: "ATC turns up because AVC eventually rises. AFC has nothing pulling it up." },
        { id: "c", text: "It rises, because diminishing returns push costs up", rationale: "Diminishing returns raise marginal and variable cost. Fixed cost is unaffected by output." },
        { id: "d", text: "It falls continuously, because the same fixed cost is spread over more units", rationale: "A constant number divided by a larger and larger quantity keeps getting smaller." },
      ],
      correctChoiceId: "d",
    },
    hints: [r`$AFC = \dfrac{FC}{Q}$, and $FC$ never changes in the short run.`, "Try it: a fixed cost of 100 dollars spread over 10, 20 and 50 units."],
    solution: r`$AFC = FC \div Q$. The numerator is constant and the denominator grows, so AFC falls at every higher output — steeply at first, then more and more gently, without ever turning back up.`,
  },
  {
    id: "microeconomics.q.ac-4",
    skillIds: [S("average-costs"), S("cost-types")],
    difficulty: 3,
    pattern: "afc-gap",
    estSeconds: 90,
    prompt: "At an output of 20 units, a firm's average total cost is 18 dollars and its average variable cost is 13 dollars. What is the firm's **total fixed cost**?",
    body: {
      type: "numeric",
      answer: 100,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 5, misconception: M("per-unit-not-total"), note: "5 dollars is average fixed cost. Multiply by the 20 units to get total fixed cost." },
        { value: 360, misconception: M("fixed-variable-mixup"), note: "360 is total cost (18 × 20). Fixed cost is only the part that is not variable cost." },
        { value: 260, misconception: M("fixed-variable-mixup"), note: "260 is total variable cost (13 × 20). Fixed cost is the rest of total cost." },
      ],
    },
    hints: ["ATC = AVC + AFC, so the gap between ATC and AVC is average fixed cost.", "AFC = 18 − 13 = 5 dollars per unit. Turn that into a total for 20 units."],
    solution: r`$AFC = ATC - AVC = 18 - 13 = 5$ dollars per unit, so $FC = AFC \times Q = 5 \times 20 = 100$ dollars.`,
  },
  {
    id: "microeconomics.q.ac-5",
    skillIds: [S("average-costs"), S("marginal-cost")],
    difficulty: 2,
    pattern: "formulas",
    estSeconds: 75,
    prompt: "Match each cost measure with the calculation that produces it.",
    body: {
      type: "matching",
      left: [
        { id: "l1", text: "Average fixed cost (AFC)" },
        { id: "l2", text: "Average variable cost (AVC)" },
        { id: "l3", text: "Average total cost (ATC)" },
        { id: "l4", text: "Marginal cost (MC)" },
      ],
      right: [
        { id: "r1", text: r`$\dfrac{FC}{Q}$` },
        { id: "r2", text: r`$\dfrac{VC}{Q}$` },
        { id: "r3", text: r`$\dfrac{TC}{Q}$` },
        { id: "r4", text: r`$\dfrac{\Delta TC}{\Delta Q}$` },
      ],
      pairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
    },
    hints: ["Each average divides a total by the quantity produced.", "Only one of the four is about a change — the cost of one more unit."],
    solution: r`The three averages each divide a total by output: $AFC = FC/Q$, $AVC = VC/Q$, $ATC = TC/Q$. Marginal cost is different in kind: it is the change in total cost per extra unit, $\Delta TC/\Delta Q$.`,
  },

  // ─────────────────────── How MC, AVC and ATC fit together ────────────────
  {
    id: "microeconomics.q.cc-1",
    skillIds: [S("cost-curve-relationships")],
    difficulty: 2,
    pattern: "marginal-pulls-average",
    estSeconds: 60,
    prompt: "At its current output, a firm's marginal cost is 9 dollars and its average total cost is 14 dollars. If it produces one more unit, average total cost will…",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "fall, because the extra unit costs less than the current average", rationale: "Adding a below-average value always pulls an average down." },
        { id: "b", text: "rise, because producing more always adds to total cost", misconception: M("marginal-vs-average"), rationale: "Total cost does rise, but the average falls whenever the new unit costs less than the average." },
        { id: "c", text: "stay at 14 dollars, because marginal cost affects only variable cost", rationale: "Marginal cost is the change in total cost, so it moves ATC as well as AVC." },
        { id: "d", text: "fall all the way to 9 dollars", misconception: M("marginal-vs-average"), rationale: "The average moves toward the marginal value, but one unit cannot drag it all the way there." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Think of a test average of 14 followed by a new score of 9.", "A new value below the average pulls the average down — but only part of the way."],
    solution: "Marginal cost (9) is below average total cost (14), so the next unit costs less than the typical unit so far and pulls the average down. ATC falls, though it stays well above 9.",
  },
  {
    id: "microeconomics.q.cc-2",
    skillIds: [S("cost-curve-relationships")],
    difficulty: 2,
    pattern: "mc-crosses-min",
    estSeconds: 60,
    prompt: "On a standard set of short-run cost curves, where does the marginal cost curve cross the average total cost curve?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "At the lowest point of the marginal cost curve", rationale: "MC bottoms out earlier, at a smaller output, while it is still below both average curves." },
        { id: "b", text: "At the lowest point of the average total cost curve", rationale: "Left of the crossing MC is below ATC, so ATC falls; right of it MC is above ATC, so ATC rises. The turning point is the minimum." },
        { id: "c", text: "At the output where average fixed cost equals average variable cost", rationale: "That output has no special connection to marginal cost." },
        { id: "d", text: "Nowhere — marginal cost stays below average total cost", rationale: "Once diminishing returns push MC high enough, it rises above ATC." },
      ],
      correctChoiceId: "b",
    },
    hints: ["When MC is below ATC, is ATC falling or rising? What about when MC is above ATC?", "ATC stops falling and starts rising exactly where MC catches up with it."],
    solution: "While MC is below ATC, each extra unit pulls the average down; once MC is above ATC, each extra unit pulls it up. ATC therefore switches from falling to rising exactly where MC equals ATC — its minimum point.",
  },
  {
    id: "microeconomics.q.cc-3",
    skillIds: [S("cost-curve-relationships"), S("average-costs")],
    difficulty: 3,
    pattern: "gap-atc-avc",
    estSeconds: 75,
    prompt: "On a cost-curve graph, what does the vertical gap between the ATC curve and the AVC curve represent, and how does it change as output rises?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Marginal cost; the gap widens as output rises", rationale: "Marginal cost is its own curve. ATC minus AVC is average fixed cost." },
        { id: "b", text: "Average fixed cost; the gap stays the same size because fixed cost is constant", misconception: M("marginal-vs-average"), rationale: "Total fixed cost is constant, but the gap is fixed cost per unit, which shrinks as output grows." },
        { id: "c", text: "Average fixed cost; the gap narrows as output rises", rationale: "ATC − AVC = AFC, and AFC falls as the same fixed cost is spread over more units." },
        { id: "d", text: "Profit per unit; the gap narrows as output rises", rationale: "Profit per unit is price minus ATC — it needs the price line, not AVC." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Start from ATC = AVC + AFC and rearrange.", "What happens to FC ÷ Q as Q gets larger?"],
    solution: r`Because $ATC = AVC + AFC$, the vertical gap is $ATC - AVC = AFC$. Since $AFC = FC/Q$ falls as output rises, the two curves get closer together as you move right — though they never touch.`,
  },
  {
    id: "microeconomics.q.cc-4",
    skillIds: [S("cost-curve-relationships"), S("marginal-cost"), S("average-costs")],
    difficulty: 5,
    pattern: "infer-from-averages",
    estSeconds: 120,
    prompt: "A firm's average total cost is 12 dollars when it produces 50 units. Producing a 51st unit raises average total cost to 12.50 dollars. What is the **marginal cost** of the 51st unit?",
    body: {
      type: "numeric",
      answer: 37.5,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 0.5, misconception: M("marginal-vs-average"), note: "0.50 is the change in the average. Marginal cost is the change in total cost, so convert each average to a total first." },
        { value: 12.5, misconception: M("marginal-vs-average"), note: "12.50 is the new average. To pull the average of 51 units up by 0.50, the 51st unit must cost far more than the average." },
      ],
    },
    hints: ["Turn each average back into a total: TC = ATC × Q.", "Total cost rises from 12 × 50 = 600 to 12.50 × 51 = 637.50."],
    solution: r`$TC_{50} = 12 \times 50 = 600$ and $TC_{51} = 12.50 \times 51 = 637.50$, so $MC = 637.50 - 600 = 37.50$ dollars. That is far above the average — which is exactly why the average rose.`,
  },
  {
    id: "microeconomics.q.cc-5",
    skillIds: [S("cost-curve-relationships"), S("average-costs")],
    difficulty: 4,
    pattern: "locate-output",
    estSeconds: 120,
    prompt: "At an output of 30 units, a firm has marginal cost of 22 dollars, average variable cost of 18 dollars and average total cost of 25 dollars. Its cost curves have the usual U shapes. Select **all** of the statements that must be true.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "AVC is rising at this output" },
        { id: "b", text: "ATC is rising at this output", misconception: M("marginal-vs-average"), rationale: "MC (22) is below ATC (25), so one more unit pulls ATC down — ATC is still falling." },
        { id: "c", text: "Output is greater than the quantity that minimizes AVC" },
        { id: "d", text: "Output is greater than the quantity that minimizes ATC", rationale: "ATC is still falling here, so its minimum lies at a larger output, to the right." },
        { id: "e", text: "Average fixed cost is 7 dollars" },
      ],
      correctChoiceIds: ["a", "c", "e"],
    },
    hints: ["Compare MC with each average separately: above the average means that average is rising.", "ATC − AVC gives average fixed cost."],
    solution: r`MC (22) is above AVC (18), so AVC is rising and the firm is past the minimum of AVC. MC (22) is below ATC (25), so ATC is still falling and the firm has not yet reached the minimum of ATC. And $AFC = ATC - AVC = 25 - 18 = 7$ dollars. The firm sits between the two minimum points.`,
  },
  {
    id: "microeconomics.q.cc-6",
    skillIds: [S("cost-curve-relationships")],
    difficulty: 3,
    pattern: "curve-order",
    estSeconds: 90,
    prompt: "A firm's MC, AVC and ATC curves have the usual U shapes. As output increases from zero, put these events in the order they occur.",
    body: {
      type: "ordering",
      items: [
        { id: "mcmin", text: "Marginal cost reaches its lowest point" },
        { id: "avcmin", text: "MC crosses AVC, where AVC is at its lowest point" },
        { id: "atcmin", text: "MC crosses ATC, where ATC is at its lowest point" },
      ],
      correctOrder: ["mcmin", "avcmin", "atcmin"],
    },
    hints: ["MC must already be rising when it crosses an average curve from below.", "ATC = AVC + AFC, and AFC is still falling when AVC bottoms out — so ATC keeps falling a little longer."],
    solution: "MC turns up first, while it is still below both averages. Rising MC then crosses AVC at AVC's minimum. At that output ATC is still falling, because falling AFC outweighs the slow rise in AVC, so MC reaches ATC — at ATC's minimum — only at a larger output.",
  },

  // ─────────────────── Profit-maximizing output (MR = MC) ──────────────────
  {
    id: "microeconomics.q.pm-1",
    skillIds: [S("profit-max-rule")],
    difficulty: 1,
    pattern: "mr-equals-price",
    estSeconds: 60,
    prompt: "A wheat farmer in a perfectly competitive market can sell any amount at the market price of 9 dollars a bushel. Why is the farmer's marginal revenue 9 dollars for every bushel?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Because the farmer chooses a price that just covers the cost of each bushel", rationale: "A price taker does not choose the price at all; the market sets it." },
        { id: "b", text: "Because each extra bushel sells at the market price without pushing that price down", rationale: "One farm is too small to move the market price, so every extra bushel adds exactly 9 dollars to revenue." },
        { id: "c", text: "Because the farmer must cut the price on every bushel in order to sell one more", rationale: "That describes a firm with market power. It would make marginal revenue less than price." },
        { id: "d", text: "Because competitive firms always earn zero profit", rationale: "Marginal revenue equals price whether the firm is making a profit or a loss." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Marginal revenue is the extra revenue from selling one more unit.", "Does selling one more bushel change the price this farmer receives?"],
    solution: "A price taker can sell as much as it likes at the going price, and its own output is too small to change that price. So each additional bushel adds exactly the price — 9 dollars — to total revenue: MR = P.",
  },
  {
    id: "microeconomics.q.pm-2",
    skillIds: [S("profit-max-rule"), S("marginal-cost")],
    difficulty: 2,
    pattern: "apply-rule-table",
    estSeconds: 120,
    prompt: `A carrot grower is a price taker. Its short-run total cost per day is shown below.

${CARROT_TABLE}

The market price is 17 dollars a crate. How many crates per day maximize the grower's profit?`,
    body: {
      type: "numeric",
      answer: 6,
      tolerance: { abs: 0.01 },
      unit: "crates",
      commonErrors: [
        { value: 7, misconception: M("revenue-not-profit"), note: "Seven crates brings in the most revenue, but the 7th crate adds 19 dollars to cost and only 17 dollars to revenue." },
        { value: 5, misconception: M("min-atc-rule"), note: "ATC is lowest at 5 crates, but the 6th crate still adds more to revenue (17) than to cost (16)." },
        { value: 2, misconception: M("min-mc-rule"), note: "Marginal cost is lowest for the 2nd crate. Cheap extra crates are a reason to keep expanding, not to stop." },
      ],
    },
    hints: ["Find the marginal cost of each crate, then compare it with the 17 dollars each crate brings in.", "Marginal costs are 8, 6, 8, 10, 13, 16 and 19. Which is the last crate that costs no more than 17 dollars to add?"],
    solution: r`Marginal costs of crates 1–7 are 8, 6, 8, 10, 13, 16 and 19 dollars. Every crate through the 6th adds no more than its 17 dollars of revenue; the 7th would add 19 to cost. So the grower produces 6 crates. Check: profit is $17 \times 6 - 91 = 11$ dollars, compared with 10 dollars at 5 crates and 9 dollars at 7.`,
  },
  {
    id: "microeconomics.q.pm-3",
    skillIds: [S("profit-max-rule")],
    difficulty: 2,
    pattern: "adjust-output",
    estSeconds: 75,
    prompt: "A price-taking firm is producing 500 units. At that output the market price is 12 dollars, marginal cost is 9 dollars, and marginal cost is rising. To increase its profit, the firm should…",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "raise its price above 12 dollars", rationale: "A price taker that charges more than the market price sells nothing." },
        { id: "b", text: "cut output, because marginal cost is rising", rationale: "Rising marginal cost is not a problem while it is still below the price." },
        { id: "c", text: "keep output at 500, because price already exceeds marginal cost", rationale: "Price above marginal cost means the next unit would add to profit — money left on the table." },
        { id: "d", text: "increase output, because the next unit adds more to revenue than to cost", rationale: "The next unit brings in 12 dollars and costs about 9 dollars to make." },
      ],
      correctChoiceId: "d",
    },
    hints: ["Compare what one more unit adds to revenue with what it adds to cost.", "MR = 12 and MC = 9. Is the next unit worth producing?"],
    solution: "Marginal revenue (12 dollars) exceeds marginal cost (9 dollars), so producing another unit raises profit by about 3 dollars. The firm should keep expanding until rising marginal cost reaches 12 dollars.",
  },
  {
    id: "microeconomics.q.pm-4",
    skillIds: [S("profit-max-rule")],
    difficulty: 3,
    pattern: "rule-concept",
    estSeconds: 90,
    prompt: "A price-taking firm sells its product for 20 dollars. At its current output, average total cost is 15 dollars and the marginal cost of the last unit was 26 dollars. A manager says, “We make 5 dollars on every unit, so we should produce even more.” What is the best response?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Agree: profit per unit is positive, so more output means more profit", misconception: M("marginal-vs-average"), rationale: "Average profit per unit says nothing about the next unit. The decision to expand depends on marginal cost, not ATC." },
        { id: "b", text: "Disagree: the last unit added 26 dollars to cost but only 20 dollars to revenue, so the firm should produce less", rationale: "Cutting that unit raises profit by 6 dollars." },
        { id: "c", text: "Disagree: the firm should cut output back to where average total cost is lowest", misconception: M("min-atc-rule"), rationale: "The firm should cut back only until MC falls to 20 dollars; that is usually not the minimum of ATC." },
        { id: "d", text: "Agree: total revenue rises with every unit sold", misconception: M("revenue-not-profit"), rationale: "Revenue rises, but cost rises faster at the margin, so profit falls." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Which number tells you about the next unit: average total cost or marginal cost?", "The last unit brought in 20 dollars and cost 26 dollars."],
    solution: "The firm is profitable overall (P > ATC), but it has gone too far: the last unit cost 26 dollars to make and sold for 20 dollars, lowering profit by 6 dollars. It should reduce output until marginal cost falls to the price. Decisions about how much to produce are made at the margin.",
  },
  {
    id: "microeconomics.q.pm-5",
    skillIds: [S("profit-max-rule")],
    difficulty: 3,
    pattern: "rule-statements",
    estSeconds: 90,
    prompt: "A perfectly competitive firm is producing its profit-maximizing output, and that output is greater than zero. Select **all** of the statements that must be true.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "Price equals marginal cost" },
        { id: "b", text: "Average total cost is at its lowest point", misconception: M("min-atc-rule"), rationale: "That is true only when the price happens to equal minimum ATC. At a higher price the firm produces beyond that point." },
        { id: "c", text: "Marginal revenue equals marginal cost" },
        { id: "d", text: "Total revenue is as large as it can be", misconception: M("revenue-not-profit"), rationale: "A price taker's revenue keeps rising with every unit sold; profit does not." },
        { id: "e", text: "Marginal cost is at its lowest point", misconception: M("min-mc-rule"), rationale: "At the best output marginal cost is rising and equal to the price, not at its minimum." },
      ],
      correctChoiceIds: ["a", "c"],
    },
    hints: ["The rule is MR = MC. What is MR for a price taker?", "Profit maximization says nothing about any curve being at its minimum."],
    solution: "A firm maximizes profit where MR = MC, and for a price taker MR is the price, so P = MC as well. Neither ATC nor MC needs to be at its minimum, and revenue is not being maximized — a price taker could always raise revenue by selling more.",
  },
  {
    id: "microeconomics.q.pm-6",
    skillIds: [S("profit-max-rule"), S("firm-graph-reading")],
    difficulty: 2,
    pattern: "sim-find-q",
    estSeconds: 120,
    prompt: "Use the Firm Behavior Lab. The market price is set to 14 dollars. What quantity maximizes this firm's profit? Give your answer to the nearest tenth.",
    stimulus: { simulation: { id: LAB, params: { price: 14 } } },
    body: {
      type: "numeric",
      answer: 15.1,
      tolerance: { abs: 0.2 },
      unit: "units",
      commonErrors: [
        { value: 6.67, misconception: M("min-mc-rule"), note: "That is where marginal cost is lowest. Profit is largest where the rising MC curve meets the price line." },
        { value: 13.36, misconception: M("min-atc-rule"), note: "That is where ATC is lowest. At a price of 14 dollars, units beyond that point still add more to revenue than to cost." },
      ],
    },
    hints: ["Profit is largest where the horizontal price line meets the rising part of the MC curve.", "Move the quantity until marginal cost reads 14, or read the profit-maximizing quantity from the lab's readout. It is a little above 15."],
    solution: r`The firm's marginal cost is $MC = 10 - 2q + 0.15q^2$. Setting $MC = 14$ gives $0.15q^2 - 2q - 4 = 0$, whose larger root is $q \approx 15.1$ — the point where the price line crosses the rising part of MC in the lab.`,
  },

  // ─────────────────────── Calculating profit and loss ─────────────────────
  {
    id: "microeconomics.q.pc-1",
    skillIds: [S("profit-calculation")],
    difficulty: 1,
    pattern: "tr-minus-tc",
    estSeconds: 60,
    prompt: "A firm sells 40 units at 15 dollars each. Its total cost is 480 dollars. What is its profit?",
    body: {
      type: "numeric",
      answer: 120,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 600, misconception: M("revenue-not-profit"), note: "600 dollars is total revenue. Profit is what is left after subtracting total cost." },
        { value: 3, misconception: M("per-unit-not-total"), note: "3 dollars is the profit on each unit (15 − 12). Multiply by the 40 units sold." },
      ],
    },
    hints: ["Profit = total revenue − total cost.", "Total revenue is 15 × 40 = 600 dollars."],
    solution: r`$TR = 15 \times 40 = 600$, so profit $= TR - TC = 600 - 480 = 120$ dollars.`,
  },
  {
    id: "microeconomics.q.pc-2",
    skillIds: [S("profit-calculation")],
    difficulty: 2,
    pattern: "price-minus-atc",
    estSeconds: 75,
    prompt: "A price-taking firm maximizes profit by producing 150 units. The market price is 20 dollars and average total cost at that output is 16 dollars. What is the firm's total economic profit?",
    body: {
      type: "numeric",
      answer: 600,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 4, misconception: M("per-unit-not-total"), note: "4 dollars is profit per unit. Multiply by the 150 units to get total profit." },
        { value: 3000, misconception: M("revenue-not-profit"), note: "3,000 dollars is total revenue (20 × 150). Subtract total cost, 16 × 150 = 2,400." },
      ],
    },
    hints: ["Price minus ATC is the profit on each unit.", "Multiply the 4 dollars per unit by the number of units."],
    solution: r`Profit $= (P - ATC) \times Q = (20 - 16) \times 150 = 600$ dollars.`,
  },
  {
    id: "microeconomics.q.pc-3",
    skillIds: [S("profit-calculation"), S("profit-max-rule")],
    difficulty: 4,
    pattern: "from-table",
    estSeconds: 150,
    prompt: `A candle maker is a price taker. Its short-run total cost per day is shown below.

${CANDLE_TABLE}

The market price is 30 dollars a case. If the firm produces the profit-maximizing number of cases, what is its profit?`,
    body: {
      type: "numeric",
      answer: 32,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 30, misconception: M("min-atc-rule"), note: "30 dollars is the profit at 5 cases, where ATC is lowest. The 6th case adds 30 to revenue and only 28 to cost, so it adds 2 more dollars of profit." },
        { value: 180, misconception: M("revenue-not-profit"), note: "180 dollars is total revenue at 6 cases. Subtract the total cost of 148 dollars." },
        { value: 5.33, misconception: M("per-unit-not-total"), note: "About 5.33 dollars is profit per case at 6 cases. Multiply by 6 for total profit." },
      ],
    },
    hints: ["First find the best quantity: produce each case whose marginal cost is no more than 30 dollars.", "Marginal costs are 20, 14, 11, 15, 20 and 28, so the firm produces 6 cases. Now compute TR − TC."],
    solution: r`Marginal costs of cases 1–6 are 20, 14, 11, 15, 20 and 28 dollars — all at or below the price of 30 — so the firm produces 6 cases. Profit $= 30 \times 6 - 148 = 180 - 148 = 32$ dollars. (At 5 cases, where ATC is lowest, profit would be only 30 dollars.)`,
  },
  {
    id: "microeconomics.q.pc-4",
    skillIds: [S("profit-calculation")],
    difficulty: 2,
    pattern: "economic-vs-accounting",
    estSeconds: 100,
    prompt: "Priya leaves a job paying 30,000 dollars a year to open a tutoring business. In its first year the business takes in 90,000 dollars and pays 55,000 dollars in rent, wages and supplies. By putting her savings into the business, she also gives up 2,000 dollars of interest. What are her accounting profit and her economic profit?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Accounting profit is 35,000 dollars; economic profit is 3,000 dollars", rationale: "Accounting profit subtracts only the bills paid; economic profit also subtracts the 32,000 dollars of salary and interest she gave up." },
        { id: "b", text: "Accounting profit is 35,000 dollars; economic profit is 35,000 dollars", rationale: "Economic profit must also subtract implicit costs — the salary and interest Priya gave up." },
        { id: "c", text: "Accounting profit is 3,000 dollars; economic profit is 35,000 dollars", rationale: "These are reversed. Economic profit subtracts more costs, so it is never the larger of the two." },
        { id: "d", text: "Accounting profit is 35,000 dollars; economic profit is 5,000 dollars", rationale: "This subtracts the forgone salary but leaves out the 2,000 dollars of forgone interest." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Accounting profit = revenue − explicit costs (money actually paid out).", "Economic profit also subtracts implicit costs: the 30,000-dollar salary and the 2,000 dollars of interest."],
    solution: r`Accounting profit $= 90{,}000 - 55{,}000 = 35{,}000$ dollars. Implicit costs are $30{,}000 + 2{,}000 = 32{,}000$ dollars, so economic profit $= 35{,}000 - 32{,}000 = 3{,}000$ dollars. It is positive, so Priya is doing slightly better than her next-best alternative.`,
  },
  {
    id: "microeconomics.q.pc-5",
    skillIds: [S("profit-calculation")],
    difficulty: 3,
    pattern: "loss",
    estSeconds: 90,
    prompt: "A price-taking firm produces 200 units, the output where P = MC. The price is 9 dollars. At that output average total cost is 11.50 dollars and average variable cost is 8 dollars. What is the firm's economic profit?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "A loss of 2.50 dollars", misconception: M("per-unit-not-total"), rationale: "2.50 dollars is the loss on each unit. Multiply by 200 units." },
        { id: "b", text: "A profit of 200 dollars", misconception: M("fixed-variable-mixup"), rationale: "(9 − 8) × 200 leaves out fixed cost. Profit compares price with average total cost." },
        { id: "c", text: "A loss of 500 dollars", rationale: "(9 − 11.50) × 200 = −500." },
        { id: "d", text: "A profit of 1,800 dollars", misconception: M("revenue-not-profit"), rationale: "1,800 dollars is total revenue. Total cost is 11.50 × 200 = 2,300 dollars." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Profit = (P − ATC) × Q. Use ATC, not AVC.", "Price is 2.50 dollars below ATC on each of 200 units."],
    solution: r`Profit $= (P - ATC) \times Q = (9 - 11.50) \times 200 = -500$ dollars: a loss of 500 dollars. (Because the price of 9 dollars is above AVC of 8 dollars, the firm still does better by producing than by shutting down.)`,
  },
  {
    id: "microeconomics.q.pc-6",
    skillIds: [S("profit-calculation"), S("firm-graph-reading")],
    difficulty: 3,
    pattern: "sim-profit",
    estSeconds: 120,
    prompt: "Use the Firm Behavior Lab with the market price at 14 dollars. At the profit-maximizing quantity, what is the firm's **total** profit?",
    stimulus: { simulation: { id: LAB, params: { price: 14 } } },
    body: {
      type: "numeric",
      answer: 56.26,
      tolerance: { rel: 0.03 },
      unit: "dollars",
      commonErrors: [
        { value: 3.73, misconception: M("per-unit-not-total"), note: "About 3.73 dollars is price minus ATC — the profit on each unit. Multiply by the quantity of about 15.1 units." },
        { value: 211.39, misconception: M("revenue-not-profit"), note: "About 211 dollars is total revenue. Subtract total cost of about 155 dollars." },
      ],
    },
    hints: ["Find the profit-maximizing quantity first (where MC meets the price line), then read revenue and total cost there.", "At about 15.1 units, revenue is about 211 dollars and total cost about 155 dollars."],
    solution: r`At a price of 14 dollars the best quantity is $q \approx 15.1$. There $TR \approx 14 \times 15.1 \approx 211.4$ and $TC \approx 155.1$, so profit $\approx 56.3$ dollars. The same answer comes from $(P - ATC) \times q \approx (14 - 10.27) \times 15.1$.`,
  },
  {
    id: "microeconomics.q.pc-7",
    skillIds: [S("profit-calculation"), S("profit-max-rule")],
    difficulty: 5,
    pattern: "from-equations",
    estSeconds: 180,
    prompt: r`A price-taking firm has total cost $TC = 250 + 2q + 0.1q^2$, which gives marginal cost $MC = 2 + 0.2q$. The market price is 14 dollars. What is the firm's maximum profit?`,
    body: {
      type: "numeric",
      answer: 110,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 840, misconception: M("revenue-not-profit"), note: "840 dollars is total revenue at 60 units. Subtract total cost of 730 dollars." },
        { value: 1.83, misconception: M("per-unit-not-total"), note: "About 1.83 dollars is profit per unit (14 − 12.17). Multiply by 60 units." },
      ],
    },
    hints: [r`Set price equal to marginal cost to find the best quantity: $14 = 2 + 0.2q$.`, r`$q = 60$. Now compute $TR = 14 \times 60$ and $TC = 250 + 2(60) + 0.1(60)^2$.`],
    solution: r`Set $P = MC$: $14 = 2 + 0.2q$, so $q = 60$. Then $TR = 14 \times 60 = 840$ and $TC = 250 + 120 + 360 = 730$, so profit $= 840 - 730 = 110$ dollars. (Average variable cost at 60 units is $2 + 0.1 \times 60 = 8$ dollars, below the price, so producing is the right choice.)`,
  },

  // ─────────────────────────── The shutdown decision ───────────────────────
  {
    id: "microeconomics.q.sd-1",
    skillIds: [S("shutdown-decision")],
    difficulty: 2,
    pattern: "compare-price-avc",
    estSeconds: 75,
    prompt: "A price-taking firm finds that at the output where P = MC, the price is 7 dollars, average variable cost is 5 dollars and average total cost is 9 dollars. What should it do in the short run?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Shut down, because price is below ATC and it is losing money", misconception: M("shutdown-at-loss"), rationale: "Shutting down would lose all of fixed cost. Producing loses less, because price more than covers variable cost." },
        { id: "b", text: "Raise its price to 9 dollars so that it breaks even", rationale: "A price taker cannot sell anything above the market price." },
        { id: "c", text: "Keep producing: revenue covers all of variable cost and part of fixed cost", rationale: "Each unit brings in 2 dollars more than its variable cost, which goes toward the fixed cost bill." },
        { id: "d", text: "Keep producing, because it is earning an economic profit", rationale: "Price is below ATC, so the firm loses 2 dollars per unit. It produces because that loss is smaller than its fixed cost." },
      ],
      correctChoiceId: "c",
    },
    hints: ["For the shutdown decision, compare price with average variable cost, not average total cost.", "Price (7) is above AVC (5) but below ATC (9). What does each comparison tell you?"],
    solution: "Price is below ATC, so the firm takes a loss. But price is above AVC: every unit sold covers its own variable cost and contributes 2 dollars toward fixed cost, which must be paid either way. Producing therefore loses less than shutting down, so the firm stays open in the short run.",
  },
  {
    id: "microeconomics.q.sd-2",
    skillIds: [S("shutdown-decision"), S("profit-calculation")],
    difficulty: 2,
    pattern: "loss-comparison",
    estSeconds: 100,
    prompt: "A print shop's fixed cost is 500 dollars a week. If it stays open and produces its best output, it will bring in 1,200 dollars of revenue and pay 1,000 dollars of variable cost. What is the smallest weekly **loss** the shop can achieve? Enter the size of the loss as a positive number.",
    body: {
      type: "numeric",
      answer: 300,
      tolerance: { abs: 0.01 },
      unit: "dollars",
      commonErrors: [
        { value: 500, misconception: M("shutdown-at-loss"), note: "500 dollars is the loss from shutting down. Staying open loses only 300 dollars, because revenue covers variable cost with 200 dollars left over toward fixed cost." },
        { value: 200, misconception: M("fixed-variable-mixup"), note: "200 dollars is revenue minus variable cost. The 500 dollars of fixed cost still has to be subtracted." },
      ],
    },
    hints: ["Work out the loss under each choice: staying open, and shutting down.", "Open: 1,200 − 1,000 − 500. Shut down: the shop still owes its fixed cost."],
    solution: r`If it operates: profit $= 1200 - 1000 - 500 = -300$. If it shuts down: profit $= 0 - 0 - 500 = -500$. Operating loses less, because revenue exceeds variable cost by 200 dollars. The smallest loss is 300 dollars.`,
  },
  {
    id: "microeconomics.q.sd-3",
    skillIds: [S("shutdown-decision"), S("cost-types")],
    difficulty: 3,
    pattern: "shutdown-concept",
    estSeconds: 75,
    prompt: "Why is fixed cost left out of a firm's short-run decision about whether to shut down?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "It must be paid whether the firm produces or not, so it is the same under both choices", rationale: "A cost that is identical under every option cannot tip the decision either way." },
        { id: "b", text: "Fixed cost drops to zero when the firm shuts down", misconception: M("fixed-variable-mixup"), rationale: "It is variable cost that drops to zero. Rent and leases are still owed in the short run." },
        { id: "c", text: "Fixed cost is already included in marginal cost", misconception: M("fixed-cost-in-decision"), rationale: "Marginal cost contains no fixed cost at all; it is the change in variable cost." },
        { id: "d", text: "Fixed cost is usually small compared with variable cost", rationale: "The size of fixed cost is irrelevant. Even a very large fixed cost is owed under both choices." },
      ],
      correctChoiceId: "a",
    },
    hints: ["List what the firm pays if it produces, and what it pays if it shuts down. Which item appears on both lists?", "A decision should depend only on the things that differ between the options."],
    solution: "In the short run the firm owes its fixed cost whether it produces or not. Because that cost is the same under both choices, it cancels out of the comparison. What differs is revenue and variable cost — so the firm produces only if revenue covers variable cost (P ≥ AVC).",
  },
  {
    id: "microeconomics.q.sd-4",
    skillIds: [S("shutdown-decision"), S("average-costs")],
    difficulty: 4,
    pattern: "shutdown-price-table",
    estSeconds: 150,
    prompt: `A candle maker is a price taker. Its short-run total cost per day is shown below.

${CANDLE_TABLE}

What is the lowest price at which this firm would be willing to produce in the short run rather than shut down?`,
    body: {
      type: "numeric",
      answer: 15,
      tolerance: { abs: 0.01 },
      unit: "dollars per case",
      commonErrors: [
        { value: 24, misconception: M("shutdown-at-loss"), note: "24 dollars is minimum ATC — the break-even price. Below it the firm loses money but keeps producing as long as price covers AVC." },
        { value: 11, misconception: M("marginal-vs-average"), note: "11 dollars is the lowest marginal cost. The shutdown comparison uses average variable cost." },
      ],
    },
    hints: ["The firm produces as long as price covers average variable cost at some output.", "Compute VC = TC − 40 and AVC = VC ÷ Q for each row, then find the smallest AVC."],
    solution: "Fixed cost is 40 dollars, so variable cost is 20, 34, 45, 60, 80 and 108 dollars and AVC is 20, 17, 15, 15, 16 and 18 dollars. The minimum of AVC is 15 dollars. At any price below 15 dollars, revenue cannot cover variable cost at any output, so the firm shuts down; at 15 dollars or more it produces.",
  },
  {
    id: "microeconomics.q.sd-5",
    skillIds: [S("shutdown-decision"), S("firm-graph-reading")],
    difficulty: 2,
    pattern: "sim-shutdown-price",
    estSeconds: 120,
    prompt: "Use the Firm Behavior Lab. Starting from a price of 9 dollars, lower the price until the firm's decision switches from operating to shutting down. At about what price does the switch happen?",
    stimulus: { simulation: { id: LAB, params: { price: 9 } } },
    body: {
      type: "numeric",
      answer: 5,
      tolerance: { abs: 0.2 },
      unit: "dollars",
      commonErrors: [{ value: 10.06, misconception: M("shutdown-at-loss"), note: "About 10.06 dollars is minimum ATC, where profit turns into a loss. The firm keeps producing below that price until price falls under minimum AVC." }],
    },
    hints: ["Watch the operate / shut down readout as you lower the price a little at a time.", "The switch happens where the price line drops below the lowest point of the AVC curve."],
    solution: r`The firm's average variable cost is $AVC = 10 - q + 0.05q^2$, which has its minimum of 5 dollars at $q = 10$. At any price below 5 dollars revenue cannot cover variable cost, so the firm shuts down. Between 5 dollars and about 10.06 dollars (minimum ATC) it loses money but keeps producing.`,
  },
  {
    id: "microeconomics.q.sd-6",
    skillIds: [S("shutdown-decision")],
    difficulty: 3,
    pattern: "compare-select",
    estSeconds: 100,
    prompt: `The market price is 10 dollars. Four price-taking firms face the average costs below (in dollars) at the output where P = MC. Select **all** of the firms that should shut down in the short run.

| Firm | AVC | ATC |
|---|---|---|
| A | 8 | 12 |
| B | 11 | 13 |
| C | 6 | 9 |
| D | 10.50 | 16 |`,
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "Firm A", misconception: M("shutdown-at-loss"), rationale: "Firm A loses money (price below ATC) but covers its variable cost (price above AVC), so it keeps producing." },
        { id: "b", text: "Firm B" },
        { id: "c", text: "Firm C", rationale: "Firm C earns a profit: the price of 10 dollars is above its ATC of 9 dollars." },
        { id: "d", text: "Firm D" },
      ],
      correctChoiceIds: ["b", "d"],
    },
    hints: ["Ignore the ATC column for this decision.", "A firm shuts down when the price is below its average variable cost."],
    solution: "Compare the price of 10 dollars with each firm's AVC. Firms B (AVC 11) and D (AVC 10.50) cannot cover even their variable cost, so they shut down. Firm A loses money but covers its variable cost, so it stays open; Firm C is profitable.",
  },
  {
    id: "microeconomics.q.sd-7",
    skillIds: [S("shutdown-decision"), S("profit-calculation")],
    difficulty: 4,
    pattern: "operate-vs-shutdown",
    estSeconds: 120,
    prompt: "At the output where P = MC, a price-taking firm would produce 100 units. The price is 6 dollars, average variable cost is 7 dollars and average total cost is 10 dollars. Which choice minimizes its short-run loss?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Produce 100 units and lose 400 dollars", rationale: "That is the loss from operating — larger than the 300 dollars of fixed cost the firm would lose by shutting down." },
        { id: "b", text: "Shut down and lose nothing", misconception: M("fixed-variable-mixup"), rationale: "Fixed cost is still owed when the firm produces nothing." },
        { id: "c", text: "Produce 100 units and lose 100 dollars", rationale: "100 dollars is the variable cost that revenue fails to cover. It comes on top of the 300 dollars of fixed cost." },
        { id: "d", text: "Shut down and lose 300 dollars", rationale: "Fixed cost is (10 − 7) × 100 = 300 dollars, less than the 400 dollars lost by operating." },
      ],
      correctChoiceId: "d",
    },
    hints: ["Find fixed cost from the gap between ATC and AVC: (ATC − AVC) × Q.", "Compare the loss from operating, (P − ATC) × Q, with the loss from shutting down, which is fixed cost."],
    solution: r`Fixed cost $= (ATC - AVC) \times Q = (10 - 7) \times 100 = 300$ dollars. Operating: profit $= (6 - 10) \times 100 = -400$. Shutting down: profit $= -300$. Because price (6) is below AVC (7), each unit produced adds to the loss, so the firm shuts down and loses 300 dollars.`,
  },

  // ────────────────── Reading the competitive firm's graph ─────────────────
  {
    id: "microeconomics.q.fg-1",
    skillIds: [S("firm-graph-reading")],
    difficulty: 2,
    pattern: "classify-outcome",
    estSeconds: 60,
    prompt: "On a perfectly competitive firm's graph, the horizontal price line passes **above** the lowest point of the ATC curve. At its profit-maximizing quantity, the firm…",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "earns a positive economic profit, because price exceeds ATC at that quantity", rationale: "The firm could earn a profit even at minimum ATC, and choosing the best quantity can only do better." },
        { id: "b", text: "breaks even, because price equals marginal cost", rationale: "P = MC picks the quantity. Whether there is a profit depends on comparing price with ATC." },
        { id: "c", text: "takes a loss but keeps producing", rationale: "That happens when the price line lies below minimum ATC but above minimum AVC." },
        { id: "d", text: "produces at the lowest point of ATC", misconception: M("min-atc-rule"), rationale: "With the price above minimum ATC, the price line meets MC to the right of that point." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Find the quantity where the price line meets MC, then compare the price with ATC at that quantity.", "If price is above ATC, each unit sells for more than it costs on average."],
    solution: "With the price line above minimum ATC, the price is above ATC at the quantity where P = MC, so the firm earns a positive economic profit — the rectangle between the price line and the ATC curve, out to that quantity.",
  },
  {
    id: "microeconomics.q.fg-2",
    skillIds: [S("firm-graph-reading"), S("profit-calculation")],
    difficulty: 3,
    pattern: "identify-region",
    estSeconds: 90,
    prompt: "On a competitive firm's graph, economic profit appears as a rectangle. Which dimensions describe that rectangle? (Here $q^*$ is the quantity where P = MC.)",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Height: price minus AVC at $q^*$. Width: $q^*$.", misconception: M("fixed-variable-mixup"), rationale: "That rectangle is revenue minus variable cost. It still includes fixed cost, so it overstates profit." },
        { id: "b", text: "Height: price minus ATC at $q^*$. Width: $q^*$.", rationale: "Profit per unit times the number of units." },
        { id: "c", text: "Height: price minus the minimum of ATC. Width: the quantity where ATC is lowest.", misconception: M("min-atc-rule"), rationale: "Both measurements must be taken at the quantity actually produced, not at the bottom of ATC." },
        { id: "d", text: "Height: price. Width: $q^*$.", misconception: M("revenue-not-profit"), rationale: "That rectangle is total revenue." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Profit = (P − ATC) × Q. Which part is a height, and which a width?", "Read ATC at the quantity the firm actually produces."],
    solution: r`Profit $= (P - ATC) \times q^*$. On the graph that is a rectangle whose height is the vertical distance from the price line down to the ATC curve at $q^*$, and whose width is $q^*$.`,
  },
  {
    id: "microeconomics.q.fg-3",
    skillIds: [S("firm-graph-reading"), S("shutdown-decision")],
    difficulty: 3,
    pattern: "supply-curve",
    estSeconds: 75,
    prompt: "Which part of its cost curves is a perfectly competitive firm's short-run supply curve?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The entire marginal cost curve", rationale: "At prices below minimum AVC the firm shuts down and supplies nothing, so that part of MC is not on the supply curve." },
        { id: "b", text: "The marginal cost curve above minimum ATC", misconception: M("shutdown-at-loss"), rationale: "The firm still produces at prices between minimum AVC and minimum ATC, even though it takes a loss there." },
        { id: "c", text: "The marginal cost curve above minimum AVC", rationale: "For every price at or above minimum AVC, the firm supplies the quantity where P = MC." },
        { id: "d", text: "The rising part of the average total cost curve", rationale: "Quantity is chosen where price equals marginal cost, not average cost." },
      ],
      correctChoiceId: "c",
    },
    hints: ["A supply curve shows the quantity the firm produces at each price. Which curve does the firm use to pick its quantity?", "Below what price does the firm produce nothing at all?"],
    solution: "At each price the firm produces where P = MC, so its quantity supplied is read off the MC curve — but only at prices high enough to cover average variable cost. The short-run supply curve is therefore the MC curve above minimum AVC; at lower prices quantity supplied is zero.",
  },
  {
    id: "microeconomics.q.fg-4",
    skillIds: [S("firm-graph-reading"), S("shutdown-decision")],
    difficulty: 2,
    pattern: "sim-classify",
    estSeconds: 100,
    prompt: "Use the Firm Behavior Lab. Set the market price to 8 dollars and look at where the price line sits relative to the ATC and AVC curves at the firm's best output. Which statement describes the firm?",
    stimulus: { simulation: { id: LAB, params: { price: 8 } } },
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "It earns an economic profit", rationale: "At 8 dollars the price line lies below the whole ATC curve, so no output is profitable." },
        { id: "b", text: "It breaks even", rationale: "Break-even needs a price equal to minimum ATC, which is about 10.06 dollars here." },
        { id: "c", text: "It shuts down and produces nothing", misconception: M("shutdown-at-loss"), rationale: "A loss alone is not a reason to shut down. The price of 8 dollars is above minimum AVC of 5 dollars." },
        { id: "d", text: "It takes a loss but keeps producing", rationale: "Price is below ATC (a loss) but above AVC (so producing beats shutting down)." },
      ],
      correctChoiceId: "d",
    },
    hints: ["Compare the price with ATC at the best output to see whether there is a profit or a loss.", "Then compare the price with AVC to see whether the firm should produce at all."],
    solution: "At a price of 8 dollars the best output is about 12.2 units, where ATC is about 10.15 dollars and AVC about 5.25 dollars. Price is below ATC, so the firm loses about 26 dollars — but price is above AVC, and that loss is much smaller than the 60 dollars of fixed cost it would lose by shutting down. It keeps producing.",
  },
  {
    id: "microeconomics.q.fg-5",
    skillIds: [S("firm-graph-reading"), S("profit-calculation")],
    difficulty: 3,
    pattern: "sim-breakeven",
    estSeconds: 150,
    prompt: "Use the Firm Behavior Lab with fixed cost at 60 dollars. At a price of 12 dollars the firm earns a profit. Lower the price until its maximum profit is just zero. About what price is that?",
    stimulus: { simulation: { id: LAB, params: { price: 12, fixedCost: 60 } } },
    body: {
      type: "numeric",
      answer: 10.06,
      tolerance: { abs: 0.25 },
      unit: "dollars",
      commonErrors: [{ value: 5, misconception: M("shutdown-at-loss"), note: "5 dollars is the shutdown price (minimum AVC). Break-even compares price with ATC: profit is zero when the price equals minimum ATC." }],
    },
    hints: ["Profit is zero when the price line just touches the lowest point of the ATC curve.", "Look for a price slightly above 10 dollars — or read minimum ATC from the lab."],
    solution: r`Profit is $(P - ATC) \times q$, so it is zero when the price equals ATC at the best output — which happens when the price line just touches the bottom of the ATC curve. Here $ATC = 10 - q + 0.05q^2 + \dfrac{60}{q}$ has its minimum of about 10.06 dollars at $q \approx 13.4$, so the break-even price is about 10.06 dollars.`,
  },
  {
    id: "microeconomics.q.fg-6",
    skillIds: [S("firm-graph-reading"), S("shutdown-decision")],
    difficulty: 3,
    pattern: "match-outcomes",
    estSeconds: 100,
    prompt: "Match each position of the market price with what a perfectly competitive firm does in the short run.",
    body: {
      type: "matching",
      left: [
        { id: "l1", text: "Price is above minimum ATC" },
        { id: "l2", text: "Price equals minimum ATC" },
        { id: "l3", text: "Price is between minimum AVC and minimum ATC" },
        { id: "l4", text: "Price is below minimum AVC" },
      ],
      right: [
        { id: "r1", text: "Produces and earns a positive economic profit" },
        { id: "r2", text: "Produces and earns zero economic profit" },
        { id: "r3", text: "Produces at a loss that is smaller than fixed cost" },
        { id: "r4", text: "Produces nothing; its loss equals fixed cost" },
      ],
      pairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
    },
    hints: ["Comparing price with ATC tells you profit or loss.", "Comparing price with AVC tells you whether to produce at all."],
    solution: "Above minimum ATC the firm earns a profit; exactly at minimum ATC it breaks even. Between minimum AVC and minimum ATC it loses money but covers its variable cost, so it produces and loses less than its fixed cost. Below minimum AVC it shuts down and loses exactly its fixed cost.",
  },
  {
    id: "microeconomics.q.fg-7",
    skillIds: [S("firm-graph-reading"), S("profit-max-rule"), S("cost-types")],
    difficulty: 4,
    pattern: "sim-fixed-cost",
    estSeconds: 150,
    prompt: "Use the Firm Behavior Lab with the market price at 14 dollars. Note the profit-maximizing quantity and the profit. Then raise fixed cost from 60 to 120 dollars. What happens?",
    stimulus: { simulation: { id: LAB, params: { price: 14, fixedCost: 60 } } },
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The best quantity falls, because higher costs make production less worthwhile", misconception: M("fixed-cost-in-decision"), rationale: "Fixed cost does not change the cost of any extra unit, so MC — and the P = MC quantity — stays put." },
        { id: "b", text: "The best quantity rises, so the larger fixed cost can be spread over more units", misconception: M("fixed-cost-in-decision"), rationale: "Extra units beyond P = MC cost more than they bring in. Spreading fixed cost thinner does not make them worth producing." },
        { id: "c", text: "The best quantity is unchanged and profit falls by 60 dollars", rationale: "MC and the price line do not move; only the ATC curve shifts up." },
        { id: "d", text: "The firm shuts down, because it now takes a loss", misconception: M("shutdown-at-loss"), rationale: "The firm does slip into a small loss, but the price of 14 dollars is far above minimum AVC of 5 dollars, so it keeps producing." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Which curves move when you change fixed cost: MC, AVC, ATC?", "The quantity is chosen where the price line meets MC. Did either of those move?"],
    solution: "Raising fixed cost shifts ATC up but leaves MC and AVC exactly where they were. The price line still meets MC at about 15.1 units, so the best quantity is unchanged. Profit simply falls by the extra 60 dollars of fixed cost — from about 56 dollars to a loss of about 4 dollars — and because price is still well above AVC, the firm keeps producing.",
  },
];
