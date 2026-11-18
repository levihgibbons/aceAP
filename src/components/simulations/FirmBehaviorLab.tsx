"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  DEFAULT_COSTS,
  averageTotalCost,
  averageVariableCost,
  classify,
  marginalCost,
  minAtc,
  minAvc,
  outcome,
  profitMaximizingQuantity,
  type CostParams,
  type FirmStatus,
} from "@/modules/simulations/economics";
import {
  Curve,
  Dot,
  HLine,
  LegendItem,
  LiveSummary,
  Plot,
  PlotLabel,
  Region,
  SimFrame,
  SliderField,
  Stat,
  ToggleField,
  VLine,
  buttonClass,
  clamp,
  formatMoney,
  formatNumber,
  numberParam,
  spoken,
  usePlot,
  type PointerPhase,
} from "./Plot";
import type { SimParams, SimulationProps } from "./types";

const PRICE_MIN = 2;
const PRICE_MAX = 24;
const PRICE_STEP = 0.25;
const FIXED_MAX = 150;
const A_MAX = 16;

const STATUS_LABEL: Record<FirmStatus, string> = {
  economic_profit: "Economic profit",
  break_even: "Break-even",
  loss_continue: "Loss, but keep producing",
  shut_down: "Shut down",
};

interface Setup {
  b: number;
  c: number;
  aMin: number;
  qMax: number;
  yMax: number;
  price: number;
  fixedCost: number;
  a: number;
  /** Initial "try another quantity", or null when the activity did not set one. */
  quantity: number | null;
}

function initialise(params: SimParams | undefined): Setup {
  let b = numberParam(params, "b", DEFAULT_COSTS.b, 0, 3);
  let c = numberParam(params, "c", DEFAULT_COSTS.c, 0.01, 0.5);
  // Marginal cost bottoms out at a − b²/(3c); keep it positive for every a the slider allows.
  let aMin = Math.max(7, Math.ceil(((b * b) / (3 * c) + 0.5) * 2) / 2);
  if (aMin > A_MAX - 2) {
    b = DEFAULT_COSTS.b;
    c = DEFAULT_COSTS.c;
    aMin = 7;
  }
  // Wide enough to hold q* at the highest price, tall enough for the highest break-even price.
  const farthest = profitMaximizingQuantity(PRICE_MAX, { F: 0, a: aMin, b, c }).q;
  const qMax = Math.max(24, Math.ceil((farthest * 1.15) / 2) * 2);
  const tallest = minAtc({ F: FIXED_MAX, a: A_MAX, b, c }).value;
  const yMax = Math.max(30, Math.ceil((tallest * 1.15) / 5) * 5);
  const quantity = numberParam(params, "quantity", Number.NaN, 0, qMax);
  return {
    b,
    c,
    aMin,
    qMax,
    yMax,
    price: numberParam(params, "price", 14, PRICE_MIN, PRICE_MAX),
    fixedCost: numberParam(params, "fixedCost", DEFAULT_COSTS.F, 0, FIXED_MAX),
    a: numberParam(params, "a", DEFAULT_COSTS.a, aMin, A_MAX),
    quantity: Number.isFinite(quantity) ? quantity : null,
  };
}

const qty = (value: number) => formatNumber(value, 2);

/**
 * "Profit $56.03" / "Loss $12.40": inside the rectangle when it is big enough,
 * otherwise just outside its ATC edge (the side away from the price line).
 */
function ProfitTag({
  q,
  price,
  atc,
  text,
}: {
  q: number;
  price: number;
  atc: number;
  text: string;
}) {
  const { scale } = usePlot();
  const heightPx = Math.abs(scale.sy(price) - scale.sy(atc));
  const widthPx = scale.sx(q) - scale.sx(0);
  if (heightPx >= 22 && widthPx >= 120) {
    return (
      <PlotLabel
        x={q / 2}
        y={(price + atc) / 2}
        dy={4}
        text={text}
        anchor="middle"
        className="fill-ink"
      />
    );
  }
  return (
    <PlotLabel
      x={q / 2}
      y={atc}
      dy={atc > price ? -7 : 16}
      text={text}
      anchor="middle"
      className="fill-ink"
    />
  );
}

/**
 * Names the price line. It sits on the side away from the profit/loss
 * rectangle, and drops the amount on narrow plots where it would crowd.
 */
function PriceLabel({ price, text, below }: { price: number; text: string; below: boolean }) {
  const { scale } = usePlot();
  const label = scale.innerWidth < 380 ? "P = MR" : `P = MR = ${text}`;
  return <PlotLabel x={0} y={price} text={label} dx={6} dy={below ? 16 : -7} />;
}

/** A cost-function coefficient in front of a power of q ("q²" rather than "1q²"). */
const coefficient = (value: number) => (value === 1 ? "" : formatNumber(value, 3));

export default function FirmBehaviorLab({ params, compact = false, onInteract }: SimulationProps) {
  const [setup] = useState(() => initialise(params));
  const [price, setPrice] = useState(setup.price);
  const [fixedCost, setFixedCost] = useState(setup.fixedCost);
  const [a, setA] = useState(setup.a);
  const [testing, setTesting] = useState(setup.quantity !== null);
  const [testQ, setTestQ] = useState(setup.quantity ?? 8);

  const { b, c, qMax, yMax } = setup;
  const costs = useMemo<CostParams>(() => ({ F: fixedCost, a, b, c }), [fixedCost, a, b, c]);
  const mc = useMemo(() => (q: number) => marginalCost(q, costs), [costs]);
  const atc = useMemo(() => (q: number) => averageTotalCost(q, costs), [costs]);
  const avc = useMemo(() => (q: number) => averageVariableCost(q, costs), [costs]);

  // Every number below comes from the model in economics.ts.
  const best = profitMaximizingQuantity(price, costs);
  const result = outcome(price, best.q, costs);
  const shutdownPoint = minAvc(costs);
  const breakEvenPoint = minAtc(costs);
  const status = classify(price, costs);
  const producing = !best.shutDown;
  const isLoss = result.profit < -0.005;
  const atShutdownPrice =
    producing && Math.abs(price - shutdownPoint.value) <= 0.005 && fixedCost > 0;

  const test = outcome(price, testQ, costs);
  const testGap = result.profit - test.profit;
  const testAtBest = Math.abs(testQ - best.q) < 0.05;

  const interact =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      onInteract?.();
    };

  const handlePointer = (position: { x: number }, phase: PointerPhase) => {
    if (phase === "end") return;
    const next = clamp(Math.round(position.x * 10) / 10, 0, qMax);
    if (next !== testQ) setTestQ(next);
    if (next !== testQ || phase === "start") onInteract?.();
  };

  const money = formatMoney;
  const fixedText = money(fixedCost);

  let decision: string;
  if (status === "shut_down") {
    decision = `Shut down: the price ${money(price)} is below minimum AVC (${money(shutdownPoint.value)}), so every unit would add more to cost than to revenue. Output is 0 and the loss equals fixed cost, ${fixedText}.`;
  } else if (status === "break_even") {
    decision = `Break-even: the price equals minimum ATC (${money(breakEvenPoint.value)}), so revenue just covers every cost. Economic profit is zero.`;
  } else if (status === "economic_profit") {
    decision = `Economic profit: the price ${money(price)} is above ATC (${money(result.atc)}) at q* = ${qty(best.q)}, so the firm earns ${money(result.profit)} more than all its costs.`;
  } else if (atShutdownPrice) {
    decision = `At the shutdown price: the price equals minimum AVC, so revenue only just covers variable cost. The firm loses its fixed cost, ${fixedText}, whether it produces or not.`;
  } else {
    decision = `Loss, but keep producing: the price ${money(price)} covers average variable cost (${money(result.avc)}) but not ATC (${money(result.atc)}). Producing loses ${money(-result.profit)}, less than the ${fixedText} lost by shutting down.`;
  }

  const profitText = isLoss
    ? `Loss ${money(-result.profit)}`
    : `Profit ${money(Math.max(0, result.profit))}`;

  const graphLabel = spoken(
    `Cost curves of a price-taking firm: marginal cost, average total cost and average variable cost against quantity, with a horizontal price line at ${money(price)}. ` +
      (producing
        ? `Marginal cost equals price at ${qty(best.q)} units, where average total cost is ${money(result.atc)}. ${
            isLoss
              ? `A hatched loss rectangle shows a loss of ${money(-result.profit)}.`
              : `A shaded profit rectangle shows a profit of ${money(Math.max(0, result.profit))}.`
          }`
        : `The price is below minimum average variable cost of ${money(shutdownPoint.value)}, so the firm produces nothing.`) +
      (testing ? ` A test quantity is marked at ${qty(testQ)} units.` : ""),
  );

  // MC leaves the top of the window on its rising branch; label it just before that.
  const mcLabelQ = Math.min(qMax, profitMaximizingQuantity(yMax * 0.9, costs).q);

  let testAdvice = "";
  if (testing) {
    if (best.shutDown) {
      testAdvice =
        testQ > 0
          ? `Producing ${qty(testQ)} units loses ${money(-test.profit)}, which is ${money(testGap)} worse than shutting down.`
          : "Producing nothing loses only the fixed cost. That is the best the firm can do at this price.";
    } else if (testAtBest) {
      testAdvice =
        "This is the profit-maximizing quantity: MR = MC, and no other quantity does better.";
    } else if (testQ < best.q) {
      testAdvice =
        test.mc < price
          ? `MR (${money(price)}) is above MC (${money(test.mc)}) here, so the next unit adds more to revenue than to cost. Produce more.`
          : `MC (${money(test.mc)}) is above MR here, but MC is still falling. Profit is highest on the rising part of MC, at q* = ${qty(best.q)}.`;
    } else {
      testAdvice = `MC (${money(test.mc)}) is above MR (${money(price)}) here, so the last unit cost more than it earned. Produce less.`;
    }
  }

  const stats = (
    <dl className={clsx("grid grid-cols-2 gap-2", !compact && "@xl:grid-cols-4")}>
      <Stat
        label="Profit-maximizing quantity q*"
        value={producing ? `${qty(best.q)} units` : "0 (shut down)"}
      />
      {!compact ? <Stat label="Total revenue (P × q*)" value={money(result.revenue)} /> : null}
      {!compact ? <Stat label="Total cost at q*" value={money(result.totalCost)} /> : null}
      <Stat
        label={isLoss ? "Economic loss" : "Economic profit"}
        value={isLoss ? money(-result.profit) : money(Math.max(0, result.profit))}
        tone={isLoss ? "bad" : result.profit > 0.005 ? "good" : "neutral"}
      />
      <Stat label="ATC at q*" value={producing ? money(result.atc) : "—"} />
      <Stat label="AVC at q*" value={producing ? money(result.avc) : "—"} />
      <Stat label="Shutdown price (min AVC)" value={money(shutdownPoint.value)} />
      <Stat label="Break-even price (min ATC)" value={money(breakEvenPoint.value)} />
    </dl>
  );

  return (
    <SimFrame
      title="Firm Behavior Lab"
      description="A perfectly competitive firm in the short run. It takes the market price as given and chooses how much to produce."
      compact={compact}
    >
      <div
        className={clsx(
          "grid gap-4",
          !compact && "@3xl:grid-cols-[minmax(0,1fr)_18rem] @3xl:gap-5",
        )}
      >
        <div className="min-w-0">
          <Plot
            xDomain={[0, qMax]}
            yDomain={[0, yMax]}
            height={compact ? 240 : 340}
            ariaLabel={graphLabel}
            xLabel="Quantity (units)"
            yLabel="Price and cost ($ per unit)"
            formatY={(value) => `$${formatNumber(value, 0)}`}
            onPointer={testing ? handlePointer : undefined}
          >
            {producing ? (
              <Region
                x1={0}
                x2={best.q}
                y1={price}
                y2={result.atc}
                hatch={isLoss}
                className="fill-good"
                strokeClassName={isLoss ? "stroke-bad" : "stroke-good"}
                fillOpacity={0.2}
              />
            ) : null}
            <Curve
              f={avc}
              className="stroke-chart-5"
              dash="2 5"
              label="AVC"
              labelX={qMax}
              labelAnchor="end"
              labelDx={-6}
              labelDy={17}
            />
            <Curve
              f={atc}
              className="stroke-chart-4"
              dash="8 4"
              label="ATC"
              labelX={qMax}
              labelAnchor="end"
              labelDx={-6}
              labelDy={-8}
            />
            <Curve
              f={mc}
              className="stroke-chart-2"
              strokeWidth={2.5}
              label="MC"
              labelX={mcLabelQ}
              labelAnchor="end"
              labelDx={-9}
              labelDy={5}
            />
            <HLine y={price} className="stroke-chart-1" strokeWidth={2.25} dash="12 3 2 3" />
            <PriceLabel price={price} text={money(price)} below={producing && result.atc > price} />
            {producing ? (
              <>
                <VLine
                  x={best.q}
                  from={0}
                  to={price}
                  className="stroke-ink-2"
                  dash="3 3"
                  strokeWidth={1.25}
                />
                <Dot x={best.q} y={result.atc} r={4} className="fill-surface stroke-chart-4" />
                <Dot x={best.q} y={price} r={5.5} className="fill-chart-1 stroke-surface" />
                <PlotLabel
                  x={best.q}
                  y={0}
                  text={`q* = ${qty(best.q)}`}
                  dx={6}
                  dy={-8}
                  anchor="auto"
                  className="fill-ink"
                />
                <ProfitTag q={best.q} price={price} atc={result.atc} text={profitText} />
              </>
            ) : (
              <>
                <Dot x={0} y={price} r={5.5} className="fill-chart-1 stroke-surface" />
                <PlotLabel
                  x={qMax / 2}
                  y={yMax * 0.55}
                  text={`Shut down: q* = 0, loss = ${fixedText}`}
                  anchor="middle"
                  className="fill-ink"
                />
              </>
            )}
            {testing ? (
              <>
                <VLine x={testQ} className="stroke-accent" dash="6 3" strokeWidth={1.75} />
                <Dot x={testQ} y={test.mc} r={4.5} className="fill-surface stroke-accent" />
                <PlotLabel
                  x={testQ}
                  y={yMax}
                  text={`test q = ${qty(testQ)}`}
                  dx={6}
                  dy={14}
                  anchor="auto"
                  className="fill-accent"
                />
              </>
            ) : null}
          </Plot>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <LegendItem label="MC" className="stroke-chart-2" strokeWidth={2.5} />
            <LegendItem label="ATC" className="stroke-chart-4" dash="8 4" />
            <LegendItem label="AVC" className="stroke-chart-5" dash="2 5" />
            <LegendItem label="P = MR" className="stroke-chart-1" dash="12 3 2 3" />
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
              <span
                aria-hidden="true"
                className="inline-block size-3 rounded-sm border border-good bg-good-soft"
              />
              profit (solid)
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
              <span
                aria-hidden="true"
                className="inline-block size-3 rounded-sm border border-bad"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--bad) 0 1.5px, transparent 1.5px 4px)",
                }}
              />
              loss (hatched)
            </span>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <fieldset className="min-w-0">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Market
            </legend>
            <SliderField
              label="Market price P"
              value={price}
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              onChange={interact(setPrice)}
              display={money(price)}
              valueText={`${money(price)} per unit. ${STATUS_LABEL[status]}.`}
            />
            {!compact ? (
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonClass("secondary")}
                  onClick={() =>
                    interact(setPrice)(clamp(breakEvenPoint.value, PRICE_MIN, PRICE_MAX))
                  }
                >
                  Set to break-even price
                </button>
                <button
                  type="button"
                  className={buttonClass("secondary")}
                  onClick={() =>
                    interact(setPrice)(clamp(shutdownPoint.value, PRICE_MIN, PRICE_MAX))
                  }
                >
                  Set to shutdown price
                </button>
              </div>
            ) : null}
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Cost structure
            </legend>
            <SliderField
              label="Fixed cost F"
              value={fixedCost}
              min={0}
              max={FIXED_MAX}
              step={5}
              onChange={interact(setFixedCost)}
              display={money(fixedCost, 0)}
              valueText={`${money(fixedCost, 0)} fixed cost`}
            />
            {!compact ? (
              <>
                <SliderField
                  label="Base variable cost a"
                  value={a}
                  min={setup.aMin}
                  max={A_MAX}
                  step={0.5}
                  onChange={interact(setA)}
                  display={money(a)}
                  valueText={`${money(a)} per unit base variable cost`}
                />
                <p className="font-mono text-xs leading-relaxed text-muted">
                  TC(q) = {formatNumber(fixedCost, 0)} + {coefficient(a)}q &minus; {coefficient(b)}
                  q&sup2; + {coefficient(c)}q&sup3;
                </p>
              </>
            ) : null}
          </fieldset>

          {!compact || setup.quantity !== null ? (
            <div className="rounded-lg border border-line bg-surface-2 px-3 py-1">
              <ToggleField
                label="Try another quantity"
                checked={testing}
                onChange={interact(setTesting)}
              />
              {testing ? (
                <div className="pb-2">
                  <SliderField
                    label="Test quantity"
                    value={testQ}
                    min={0}
                    max={qMax}
                    step={0.1}
                    onChange={interact(setTestQ)}
                    display={`${qty(testQ)} units`}
                    valueText={spoken(`${qty(testQ)} units, profit ${money(test.profit)}`)}
                    hint={compact ? undefined : "Or drag across the graph."}
                  />
                  <dl className="mt-2 grid grid-cols-2 gap-2">
                    <Stat
                      label={`Profit at q = ${qty(testQ)}`}
                      value={money(test.profit)}
                      tone={test.profit < -0.005 ? "bad" : "neutral"}
                    />
                    <Stat
                      label={best.shutDown ? "Best (q = 0)" : `Maximum (q* = ${qty(best.q)})`}
                      value={money(result.profit)}
                      note={testAtBest || testGap < 0.005 ? "same" : `${money(testGap)} better`}
                    />
                  </dl>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{testAdvice}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className={clsx("space-y-3", compact ? "mt-3" : "mt-4")}>
        <LiveSummary text={decision} className="border border-line text-ink" />
        {stats}
      </div>
    </SimFrame>
  );
}
