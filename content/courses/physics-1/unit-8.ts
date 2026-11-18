/**
 * AP Physics 1 — Unit 8: Fluids (density, pressure, Pascal's principle,
 * buoyancy, and fluid flow with continuity and Bernoulli's equation).
 * Assembled into the course in ./index.ts.
 *
 * Original AceAP instructional content. Objective codes ("PHYS-8.C") are
 * AceAP's own and are not College Board codes. Algebra-based throughout;
 * g = 9.8 m/s², ρ_water = 1000 kg/m³, P₀ = 1.01 × 10⁵ Pa, fluids
 * incompressible and (when flowing) non-viscous with steady flow.
 */
import type { UnitPart } from "./shared";
import { unit8Questions } from "./unit-8.questions";

const r = String.raw;
const S = (id: string) => `physics-1.u8.${id}`;
const Q = (id: string) => `physics-1.q.u8.${id}`;
const M = (id: string) => `physics-1.m.u8.${id}`;
const T = (id: string) => `physics-1.u8.t.${id}`;
const range = (slug: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => Q(`${slug}-${from + i}`));

const UNIT = "physics-1.u8";
const exercise = { feedback: "immediate", assistance: "allowed", questionsPerAttempt: 5 } as const;

export const unit8: UnitPart = {
  skills: [
    {
      id: S("density"),
      name: "Density",
      description: "Calculate density, mass and volume with ρ = m/V, convert between g/cm³ and kg/m³, and recognise density as a property of a material that does not depend on the size of the sample.",
      difficulty: 1,
      keywords: ["density", "rho", "mass per unit volume", "kg/m^3", "g/cm^3", "average density", "water displacement", "is density the same if you cut it", "internal structure"],
      prerequisites: [],
      patternLabels: {
        "compute-density": "Density from mass and volume",
        "intensive-property": "Density doesn't depend on size",
        "mass-from-density": "Mass from density",
        "volume-from-density": "Volume from density",
        "unit-conversion": "Converting density units",
        "what-changes-density": "What changes a density?",
        "displacement-measurement": "Measuring volume by displacement",
        "density-ratio": "Comparing densities by ratio",
        "symbolic-density": "Density in symbols",
        "average-density": "Average density of a hollow object",
        scaling: "Scaling up an object",
      },
    },
    {
      id: S("float-sink"),
      name: "Floating and sinking",
      description: "Predict whether an object floats, sinks or stays suspended by comparing its (average) density with the fluid's, and explain why mass or size alone does not decide.",
      difficulty: 2,
      keywords: ["float", "sink", "why do ships float", "denser than water", "neutral buoyancy", "layering liquids", "submarine ballast", "egg in salt water", "average density"],
      prerequisites: [S("density")],
      patternLabels: {
        "heavy-vs-dense": "Heavy versus dense",
        "compare-densities": "Comparing with the liquid",
        "classify-floaters": "Which ones float?",
        layering: "Layering liquids",
        "average-density-ship": "Why steel ships float",
        "max-load": "Loading a sealed container",
        "change-the-liquid": "Changing the liquid",
        "neutral-buoyancy": "Neutral buoyancy",
        "adjust-density": "Adjusting average density",
        "sinking-implications": "What sinking tells you",
      },
    },
    {
      id: S("pressure-force-area"),
      name: "Pressure as force per area",
      description: "Use P = F/A to find pressure, force or area, convert areas to square metres, and explain everyday effects of spreading a force over a larger or smaller area.",
      difficulty: 1,
      keywords: ["pressure", "force per area", "pascal", "Pa", "N/m^2", "snowshoes", "high heels", "P = F/A", "atmospheric force on a surface"],
      prerequisites: [],
      patternLabels: {
        "compute-pressure": "Pressure from force and area",
        "area-effect": "Spreading a force out",
        "small-area": "Tiny contact areas",
        "force-from-pressure": "Force from a pressure difference",
        orientation: "Same weight, different faces",
        "weight-then-pressure": "Weight, then pressure",
        units: "Units of pressure",
        "atmospheric-force": "Force of the atmosphere",
        proportional: "Proportional reasoning",
        "reduce-pressure": "Ways to reduce pressure",
        "symbolic-pressure": "Pressure in symbols",
      },
    },
    {
      id: S("pressure-depth"),
      name: "Pressure with depth",
      description: "Apply P = P₀ + ρgh in a still liquid, including pressure differences between depths and layered liquids, and explain why pressure depends on depth but not on the shape or volume of the container.",
      difficulty: 3,
      keywords: ["hydrostatic pressure", "pressure with depth", "P = P0 + rho g h", "rho g h", "pressure at the bottom", "container shape", "dam", "U-tube", "manometer", "pressure in all directions"],
      prerequisites: [S("pressure-force-area"), S("density")],
      patternLabels: {
        "absolute-at-depth": "Absolute pressure at a depth",
        "container-shape": "Does the container shape matter?",
        "pressure-increase": "Pressure increase on descending",
        "solve-for-depth": "Solving for a depth",
        "what-it-depends-on": "What the pressure depends on",
        "pressure-direction": "Which way pressure pushes",
        "pressure-difference": "Pressure difference between depths",
        "layered-liquids": "Layered liquids",
        "symbolic-pressure-depth": "Pressure with depth in symbols",
        "dam-design": "Designing a dam",
        "u-tube": "Liquids in a U-tube",
      },
    },
    {
      id: S("gauge-absolute"),
      name: "Atmospheric, gauge and absolute pressure",
      description: "Distinguish absolute pressure (measured from vacuum) from gauge pressure (measured relative to the atmosphere), convert between them, and explain effects of atmospheric pressure such as drinking straws and barometers.",
      difficulty: 2,
      keywords: ["gauge pressure", "absolute pressure", "atmospheric pressure", "1.01 x 10^5 Pa", "tyre gauge", "tire pressure", "negative gauge pressure", "barometer", "how does a straw work", "suction"],
      prerequisites: [S("pressure-force-area")],
      patternLabels: {
        "gauge-to-absolute": "Gauge to absolute",
        "zero-gauge": "What zero gauge means",
        "gauge-at-depth": "Gauge pressure at a depth",
        "absolute-at-depth": "Absolute pressure at a depth",
        "negative-gauge": "Negative gauge pressure",
        straw: "How a straw works",
        barometer: "The mercury barometer",
        "gauge-statements": "True statements about gauge pressure",
        "net-force-hatch": "Net force from a pressure difference",
        "depth-scaling": "Going twice as deep",
        "depth-from-absolute": "Depth from an absolute pressure",
        "change-atmosphere": "Changing the atmospheric pressure",
      },
    },
    {
      id: S("pascal"),
      name: "Pascal's principle and hydraulics",
      description: "Use Pascal's principle to relate forces, areas and piston distances in hydraulic systems, and explain why a hydraulic lift multiplies force but not energy.",
      difficulty: 3,
      keywords: ["Pascal's principle", "hydraulic lift", "hydraulic press", "hydraulic jack", "brakes", "piston", "F1/A1 = F2/A2", "force multiplier", "work in equals work out", "pressure transmitted"],
      prerequisites: [S("pressure-force-area")],
      patternLabels: {
        "pascal-concept": "Pressure transmitted everywhere",
        "output-force": "Output force",
        "piston-distance": "How far each piston moves",
        "radius-ratio": "Pistons given by radius",
        "what-is-equal": "What is the same at both pistons?",
        "area-ratio": "Choosing an area ratio",
        "diameter-ratio": "Choosing a diameter ratio",
        "pascal-statements": "True statements about hydraulics",
        "change-piston": "Changing a piston",
        brakes: "Hydraulic brakes",
        "symbolic-hydraulic": "Hydraulic force in symbols",
        "work-conservation": "Work in and work out",
        strokes: "Counting pump strokes",
        "energy-concept": "Force multiplier, not energy multiplier",
        "fluid-pressure": "Pressure in the fluid",
        "air-bubble": "Air in the lines",
        "distance-to-force": "Force from piston distances",
        "design-choices": "Design choices",
        "input-force": "Input force needed",
        "lift-with-lever": "Lever plus hydraulics",
      },
    },
    {
      id: S("buoyant-force"),
      name: "Buoyant force and Archimedes' principle",
      description: "Explain the buoyant force as the result of pressure increasing with depth, and calculate it with Archimedes' principle, F_B = ρ_fluid V_displaced g, for submerged and partly submerged objects.",
      difficulty: 3,
      keywords: ["buoyant force", "buoyancy", "Archimedes' principle", "weight of displaced fluid", "upthrust", "displaced volume", "rho V g", "buoyant force and depth", "balloon in air"],
      prerequisites: [S("pressure-depth"), S("float-sink")],
      patternLabels: {
        "compute-buoyant-force": "Buoyant force on a submerged object",
        "same-volume": "Same volume, different materials",
        "depth-independence": "Does depth matter?",
        "buoyancy-in-air": "Buoyancy in air",
        "archimedes-statement": "Stating Archimedes' principle",
        "partly-submerged": "Partly submerged objects",
        "origin-of-buoyancy": "Where buoyancy comes from",
        "volume-from-buoyancy": "Volume from the buoyant force",
        "what-it-depends-on": "What the buoyant force depends on",
        "compare-fluids": "Comparing two fluids",
        "symbolic-buoyancy": "Buoyant force from pressures",
        "newtons-third-law": "Newton's third law and buoyancy",
        "held-under": "Holding a floater under water",
      },
    },
    {
      id: S("apparent-weight"),
      name: "Apparent weight in a fluid",
      description: "Apply Newton's laws to objects in fluids: find apparent weight, the force needed to lift or hold a submerged object, normal forces and accelerations, and use weight readings in air and fluid to find densities.",
      difficulty: 3,
      keywords: ["apparent weight", "weight in water", "spring scale under water", "lifting underwater", "density from weighing", "loss of weight", "tension submerged", "free body diagram buoyancy"],
      prerequisites: [S("buoyant-force")],
      patternLabels: {
        "compute-apparent-weight": "Apparent weight",
        "scale-reading-concept": "What the scale reads",
        "buoyancy-from-readings": "Buoyant force from two readings",
        "density-from-readings": "Density from two readings",
        "authenticity-test": "Testing a material",
        "lift-underwater": "Lifting under water",
        "free-body": "Forces on a submerged object",
        "normal-force-bottom": "Resting on the bottom",
        "net-force-acceleration": "Acceleration of a sinking object",
        "lowering-into-water": "Lowering into water",
        "unknown-liquid": "Density of an unknown liquid",
        "three-readings": "Three weighings",
      },
    },
    {
      id: S("floating-fraction"),
      name: "Floating objects and fraction submerged",
      description: "Use the floating condition (buoyant force equals weight) to find the fraction of an object submerged, the density of a floating object, and how much load a floating object can carry.",
      difficulty: 3,
      keywords: ["floating", "fraction submerged", "tip of the iceberg", "draft", "load a boat", "hydrometer", "buoyant force equals weight", "rho object over rho fluid", "raft"],
      prerequisites: [S("buoyant-force")],
      patternLabels: {
        "fraction-submerged": "Fraction submerged",
        "floating-equilibrium": "Forces on a floating object",
        "fraction-above": "Fraction above the surface",
        "density-from-floating": "Density from how it floats",
        "change-fluid": "Moving into a denser fluid",
        "raft-load": "Loading a raft",
        "submerged-depth": "How deep it sits",
        "loading-ship": "Loading a ship",
        "symbolic-fraction": "Fraction submerged in symbols",
        "floating-statements": "True statements about floating",
        hydrometer: "The hydrometer",
        "barge-draft": "Barge draft and cargo",
      },
    },
    {
      id: S("continuity"),
      name: "The continuity equation",
      description: "Use volume flow rate and the continuity equation A₁v₁ = A₂v₂ for incompressible flow, including pipes given by diameter and branching flows.",
      difficulty: 2,
      keywords: ["continuity equation", "A1 v1 = A2 v2", "volume flow rate", "Q = Av", "narrow pipe faster", "hose nozzle", "conservation of mass", "incompressible flow", "litres per second"],
      prerequisites: [S("density")],
      patternLabels: {
        "speed-from-areas": "Speed from areas",
        "hose-thumb": "Thumb over a hose",
        "flow-rate-time": "Flow rate and filling time",
        "diameter-change": "Pipes given by diameter",
        river: "Rivers and gorges",
        branching: "Branching pipes",
        "flow-rate": "Volume flow rate",
        "falling-stream": "A narrowing stream",
        "symbolic-continuity": "Continuity in symbols",
        "continuity-statements": "True statements about continuity",
        "what-stays-constant": "What stays the same",
      },
    },
    {
      id: S("bernoulli"),
      name: "Bernoulli's equation",
      description: "Apply Bernoulli's equation as energy conservation for a flowing fluid: the speed–pressure trade-off in horizontal pipes, flow with height changes, Torricelli's result for flow from a tank, and everyday Bernoulli effects.",
      difficulty: 4,
      keywords: ["Bernoulli's equation", "Bernoulli's principle", "faster fluid lower pressure", "Venturi", "Torricelli", "speed of water from a hole", "v = sqrt(2gh)", "energy per unit volume", "lift", "roof blown off"],
      prerequisites: [S("continuity"), S("pressure-depth")],
      patternLabels: {
        "speed-pressure": "Speed and pressure",
        "horizontal-pressure-difference": "Pressure difference in a horizontal pipe",
        "torricelli-speed": "Speed of a jet from a tank",
        applications: "Everyday Bernoulli effects",
        "horizontal-pressure": "Pressure after a constriction",
        "height-change": "Flow up a pipe",
        "energy-meaning": "Bernoulli as energy conservation",
        assumptions: "Assumptions behind Bernoulli",
        "speed-and-height": "Speed and height both change",
        "rank-pressures": "Ranking pressures",
        "speed-from-pressure-drop": "Speed from a pressure drop",
        "symbolic-bernoulli": "Bernoulli in symbols",
        "efflux-factors": "What sets the jet speed",
        "torricelli-range": "How far the jet lands",
        "torricelli-scaling": "Scaling the depth",
        "depth-for-speed": "Depth for a given speed",
        "which-are-bernoulli": "Which effects are Bernoulli?",
        "pressurized-tank": "A pressurized tank",
        "draining-tank": "A draining tank",
        "continuity-then-bernoulli": "Continuity, then Bernoulli",
      },
    },
  ],

  misconceptions: [
    { id: M("density-depends-on-size"), skillId: S("density"), title: "Thinks density depends on the size of the sample", description: "Believes a bigger piece of a material is denser (or a smaller piece less dense), that cutting or shaping changes a material's density, or that more of a liquid means a higher density.", remediation: "Density is a ratio: mass ÷ volume. Cut a sample in half and both the mass and the volume halve, so the ratio is unchanged. Density describes the material (or, for a hollow object, its average make-up), not how much of it you have." },
    { id: M("unit-conversion"), skillId: S("density"), title: "Converts units incorrectly", description: "Mixes g/cm³ and kg/m³, forgets that 1 L = 10⁻³ m³, uses 1 cm² = 10⁻² m² instead of 10⁻⁴ m², or reports an answer in the wrong unit.", remediation: "Convert lengths first and then raise the factor to the right power: 1 cm = 10⁻² m, so 1 cm² = 10⁻⁴ m² and 1 cm³ = 10⁻⁶ m³. Useful anchors: water is 1.00 g/cm³ = 1000 kg/m³, and 1 L = 1000 cm³ = 10⁻³ m³." },
    { id: M("heavy-sinks"), skillId: S("float-sink"), title: "Thinks heavy things sink and light things float", description: "Decides floating or sinking from an object's mass, weight or size rather than from its density compared with the fluid's.", remediation: "Compare densities: an object floats if its average density is less than the fluid's and sinks if it is greater. A 5-tonne log floats; a 1-gram steel pin sinks. The amount of material doesn't matter: what matters is how tightly its mass is packed." },
    { id: M("pressure-is-force"), skillId: S("pressure-force-area"), title: "Treats pressure as if it were force", description: "Ignores the area, multiplies force by area, divides area by force, or thinks spreading a force over a bigger area increases the pressure.", remediation: "Pressure is force per unit area, P = F/A, in N/m² = Pa. The same force on a smaller area makes a larger pressure (a knife edge); on a larger area, a smaller pressure (snowshoes). To get a force from a pressure, multiply: F = PA." },
    { id: M("pressure-depends-on-shape"), skillId: S("pressure-depth"), title: "Thinks liquid pressure depends on the container's shape or the amount of liquid", description: "Expects a wider container, a bigger reservoir or more liquid to give a larger pressure at the same depth, or a narrow tube to “squeeze” the pressure up.", remediation: "In a still liquid, P = P₀ + ρgh: only the surface pressure, the density and the depth below the surface matter. A thin tube and a huge lake give the same pressure 2 m down. A bigger container has a bigger total force on its floor only because the floor has more area." },
    { id: M("pressure-direction"), skillId: S("pressure-depth"), title: "Misjudges the direction of fluid pressure", description: "Thinks a fluid pushes only downward (or only upward), or gets the direction of the change with depth backwards, expecting pressure to fall as you go deeper or rise as you go up.", remediation: "At any point in a fluid, pressure pushes equally in all directions, and on any surface it pushes perpendicular to that surface. Pressure increases going down (each layer supports the fluid above it) and decreases going up, by ρg for every metre." },
    { id: M("gauge-absolute-mixup"), skillId: S("gauge-absolute"), title: "Mixes up gauge and absolute pressure", description: "Forgets to add atmospheric pressure when absolute pressure is wanted, adds it when gauge pressure is wanted, treats zero gauge as a vacuum, or uses an absolute pressure where only a pressure difference matters.", remediation: "Absolute pressure is measured from a perfect vacuum; gauge pressure is measured from the atmosphere: P_abs = P_gauge + P₀. In an open liquid, ρgh is the gauge pressure. Net forces on walls, hatches and pistons depend on pressure differences, so the atmosphere often cancels." },
    { id: M("suction-pulls"), skillId: S("gauge-absolute"), title: "Thinks suction pulls fluids", description: "Explains straws, suction cups and pumps as a low pressure “pulling” on a fluid or surface.", remediation: "Pressure only ever pushes. “Suction” lowers the pressure on one side, and the higher pressure on the other side (usually the atmosphere) pushes the fluid or surface toward it. With no atmosphere, a straw would not work." },
    { id: M("hydraulic-multiplies-energy"), skillId: S("pascal"), title: "Thinks a hydraulic system multiplies energy", description: "Expects both pistons to move the same distance, the larger piston to move farther, or the output work to exceed the input work.", remediation: "The fluid is incompressible, so the volume pushed out of one cylinder equals the volume entering the other: A₁d₁ = A₂d₂. The larger piston moves a shorter distance by the area ratio, exactly enough that F₁d₁ = F₂d₂. A hydraulic lift multiplies force, never energy." },
    { id: M("force-transmitted-equally"), skillId: S("pascal"), title: "Thinks the force, not the pressure, is passed on", description: "Treats the forces on the two pistons as equal, or gets which piston has the larger force backwards.", remediation: "Pascal's principle passes on pressure: F₁/A₁ = F₂/A₂. The same pressure acting on a larger area gives a larger force, so the large piston always has the large force. Check: a lift should let a small push hold up a heavy car." },
    { id: M("diameter-not-squared"), skillId: S("pascal"), title: "Uses a ratio of diameters (or radii) as if it were a ratio of areas", description: "Scales forces or flow speeds by the ratio of diameters or radii instead of the square of that ratio, or uses a diameter where a radius is needed.", remediation: "The area of a circle is πr² = πd²/4, so areas scale with the square of the diameter. Doubling a diameter quadruples the area. Whenever pistons or pipes are described by size, square the ratio before using it." },
    { id: M("buoyancy-depends-on-depth"), skillId: S("buoyant-force"), title: "Thinks the buoyant force grows (or shrinks) with depth", description: "Expects a fully submerged object to feel a larger buoyant force deeper down because the pressure is greater there, or a smaller one because more water is above it.", remediation: "The buoyant force comes from the difference between the pressure below an object and the pressure above it. Going deeper raises both by the same amount, so the difference, ρ_fluid V g, is unchanged. Depth matters only while the object is still going under and its submerged volume is growing." },
    { id: M("archimedes-wrong-fluid-or-volume"), skillId: S("buoyant-force"), title: "Uses the wrong density, volume or quantity in Archimedes' principle", description: "Uses the object's density or weight instead of the displaced fluid's, uses the whole volume of a partly submerged object, or stops at the mass of the displaced fluid instead of its weight.", remediation: "F_B = (weight of displaced fluid) = ρ_fluid × V_displaced × g. The density is the fluid's, the volume is only the part below the surface, and multiplying by g turns the displaced mass into a force. The object's own density decides its weight, not the buoyant force." },
    { id: M("sinking-no-buoyancy"), skillId: S("buoyant-force"), title: "Thinks sinking objects feel no buoyant force", description: "Believes the buoyant force acts only on objects that float, so a sinking or sunken object keeps its full weight in the water (or, conversely, that submerged objects are weightless).", remediation: "Any object in a fluid displaces fluid and so feels a buoyant force. A rock sinks because its weight is bigger than the buoyant force, not because the force is missing. That is why rocks feel lighter when you lift them under water, though not weightless." },
    { id: M("apparent-vs-true-weight"), skillId: S("apparent-weight"), title: "Confuses apparent weight with weight or with buoyant force", description: "Adds the buoyant force to the weight, believes the gravitational force on an object decreases in a fluid, or uses an apparent-weight reading as if it were the buoyant force.", remediation: "The gravitational force (true weight) never changes in a fluid. An extra upward force appears: the buoyant force. A scale holding the object reads the apparent weight W − F_B. The loss in reading, W − W_apparent, is the buoyant force, and it is what reveals the object's volume and density." },
    { id: M("fraction-ratio-mixup"), skillId: S("floating-fraction"), title: "Inverts the density ratio or confuses the fraction above with the fraction below", description: "Uses ρ_fluid / ρ_object for the fraction submerged, or reports the fraction above the surface when the fraction submerged was asked (or the reverse).", remediation: "From F_B = W: ρ_fluid V_sub g = ρ_object V g, so V_sub/V = ρ_object/ρ_fluid, a number less than 1 for anything that floats. The fraction above is 1 minus that. Sanity check: wood that is nearly as dense as water should be nearly all submerged." },
    { id: M("floating-bf-greater"), skillId: S("floating-fraction"), title: "Thinks a floating object's buoyant force is larger than its weight", description: "Explains floating as the buoyant force “beating” the weight, or expects a floating object to feel more buoyant force in a denser liquid.", remediation: "An object floating at rest has zero net force, so F_B = W exactly. It sinks until it has displaced its own weight of fluid. In a denser liquid it floats higher, displacing less volume, but the buoyant force is still equal to its weight." },
    { id: M("continuity-inverted"), skillId: S("continuity"), title: "Thinks fluid slows down where a pipe narrows", description: "Expects a fluid to move faster in wide sections and slower in narrow ones, or makes speed proportional to area.", remediation: "An incompressible fluid can't pile up, so the volume per second Q = Av is the same at every cross-section. Where A is smaller, v must be larger. Think of a hose with your thumb over the end, or a river racing through a gorge." },
    { id: M("fast-high-pressure"), skillId: S("bernoulli"), title: "Thinks faster-moving fluid is at higher pressure", description: "Expects the pressure to be highest where a fluid moves fastest, puts the sign of the pressure change backwards in Bernoulli's equation, or thinks squeezing a fluid into a narrow pipe raises its pressure.", remediation: "At a given height, P + ½ρv² is constant along the flow, so where v goes up, P goes down. Physically, a parcel of fluid speeds up only if the pressure behind it is greater than the pressure in front of it, so fluid speeds up as it moves into a region of lower pressure." },
    { id: M("efflux-wrong-factors"), skillId: S("bernoulli"), title: "Uses the wrong quantities for the speed of a jet from a tank", description: "Thinks the speed of liquid leaving a hole depends on the liquid's density or the hole's size, measures the height from the floor or tank bottom instead of from the surface to the hole, or forgets the square root in v = √(2gh).", remediation: "Bernoulli from the surface to the hole gives ρgh = ½ρv², so v = √(2gh): the same speed as falling freely through height h. ρ cancels, the hole size doesn't appear, and h is the depth of the hole below the surface. Doubling h multiplies v by √2." },
  ],

  units: [
    {
      id: UNIT,
      number: 8,
      title: "Fluids",
      description: "How liquids and gases push and flow: density and floating, pressure and how it grows with depth, Pascal's principle and hydraulics, buoyant forces and Archimedes' principle, and moving fluids described by the continuity equation and Bernoulli's equation.",
      topics: [
        // ─────────────────────────── Topic 1: density ───────────────────────────
        {
          id: T("density"),
          title: "Internal structure and density",
          description: "How tightly matter is packed, and how comparing densities predicts what floats and what sinks.",
          objectives: [
            { id: "physics-1.o.8a", code: "PHYS-8.A", description: "Calculate and interpret density as mass per unit volume, and recognise it as a property of the material rather than of the sample size.", skillIds: [S("density")] },
            { id: "physics-1.o.8b", code: "PHYS-8.B", description: "Predict whether an object floats or sinks in a fluid by comparing its average density with the fluid's density.", skillIds: [S("float-sink")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u8.density",
              title: "Density: how tightly matter is packed",
              summary: "What density measures, how to calculate it, how to convert its units, and why cutting an object in half doesn't change it.",
              estMinutes: 12,
              skillIds: [S("density")],
              blocks: [
                { type: "text", md: r`A **fluid** is anything that flows: liquids like water and oil, and gases like air. Fluids don't hold a shape of their own, so instead of tracking the mass of "an object", it is usually more useful to ask how much mass is packed into each cubic metre. That quantity is **density**.

A kilogram of feathers and a kilogram of lead have the same mass, but the lead fits in a box smaller than a matchbox while the feathers fill a pillowcase. The difference is how the atoms are packed: lead atoms are heavy and close together; feathers are mostly air.` },
                { type: "definition", term: "Density", md: r`The mass per unit volume of a substance, written $\rho$ (the Greek letter rho). Its SI unit is the kilogram per cubic metre, $\text{kg/m}^3$.` },
                { type: "formula", latex: r`\rho = \frac{m}{V}`, caption: "Density equals mass divided by volume. Rearranged: m = ρV and V = m/ρ." },
                { type: "text", md: r`## Some densities worth knowing

| Substance | Density ($\text{kg/m}^3$) |
|---|---|
| Air (at room conditions) | about $1.2$ |
| Wood (typical) | $500$–$800$ |
| Ice | about $920$ |
| Fresh water | $1000$ |
| Sea water | about $1025$ |
| Aluminium | $2700$ |
| Steel | about $7800$ |
| Mercury | $13\,600$ |

Water's value is worth memorising: $1000\,\text{kg/m}^3$, which is the same as $1.00\,\text{g/cm}^3$ or $1\,\text{kg}$ per litre.` },
                {
                  type: "worked_example",
                  title: "Is this ring really silver?",
                  problem: r`A ring has a mass of $8.4\,\text{g}$. Lowered into a measuring cylinder, it raises the water level by $0.80\,\text{mL}$. Silver has a density of $10.5\,\text{g/cm}^3$. Could the ring be solid silver?`,
                  steps: [
                    { title: "Find the volume", md: r`The ring pushes aside its own volume of water, so $V = 0.80\,\text{mL} = 0.80\,\text{cm}^3$.` },
                    { title: "Find the density", md: r`$\rho = \dfrac{m}{V} = \dfrac{8.4\,\text{g}}{0.80\,\text{cm}^3} = 10.5\,\text{g/cm}^3$.` },
                    { title: "Convert to SI", md: r`$1\,\text{g/cm}^3 = 1000\,\text{kg/m}^3$, so $\rho = 10\,500\,\text{kg/m}^3$.` },
                    { title: "Compare", md: "This matches silver, so the measurement is consistent with a solid silver ring. (It doesn't prove it: a mixture could have the same density by coincidence.)" },
                  ],
                  answer: r`$\rho = 10.5\,\text{g/cm}^3 = 10\,500\,\text{kg/m}^3$: consistent with silver`,
                },
                { type: "check", questionId: Q("den-1"), lead: "Try one in SI units." },
                { type: "callout", tone: "warning", title: "Converting density units", md: r`Converting $\text{g/cm}^3$ to $\text{kg/m}^3$ involves two changes that pull in opposite directions:

- grams to kilograms: divide by $1000$;
- per cubic centimetre to per cubic metre: multiply by $(100)^3 = 10^6$.

Net effect: **multiply by 1000**. The same trap catches areas: $1\,\text{cm}^2 = (10^{-2}\,\text{m})^2 = 10^{-4}\,\text{m}^2$, not $10^{-2}\,\text{m}^2$. And remember $1\,\text{L} = 10^{-3}\,\text{m}^3$.` },
                { type: "callout", tone: "key", title: "Density belongs to the material", md: r`Saw a steel bar in half and each piece has half the mass **and** half the volume, so $m/V$ is unchanged. A paperclip and a steel girder have the same density.

What *can* change a density is anything that changes mass and volume by different factors: squeezing a gas into a smaller space, heating a material so it expands, or dissolving salt in water.` },
                { type: "check", questionId: Q("den-2") },
                { type: "definition", term: "Average density", md: r`For an object made of several materials, or one with hollow spaces, the total mass divided by the total volume it occupies. A sealed steel can full of air has an average density far below that of steel.` },
                { type: "summary", points: [r`Density is mass per unit volume: $\rho = m/V$, in $\text{kg/m}^3$.`, r`Water: $1000\,\text{kg/m}^3 = 1.00\,\text{g/cm}^3$. To go from $\text{g/cm}^3$ to $\text{kg/m}^3$, multiply by 1000.`, "Density is a property of the material: cutting or reshaping a sample doesn't change it.", "Gases change density easily when squeezed or heated; liquids and solids barely do.", "An object with hollow spaces has an average density: total mass over total volume."] },
              ],
            },
            {
              id: "physics-1.l.u8.float-sink",
              title: "Floating, sinking and comparing densities",
              summary: "Why the density comparison, not the weight, decides whether something floats, and how ships, submarines and fish use average density.",
              estMinutes: 11,
              skillIds: [S("float-sink")],
              blocks: [
                { type: "text", md: r`Drop a steel nail into a bucket of water and it sinks. Push a huge steel ship off a slipway and it floats. So "heavy things sink" can't be the rule. The rule is about density.` },
                { type: "callout", tone: "key", title: "The floating rule", md: r`Compare the object's **average density** with the fluid's density:

- $\rho_{\text{object}} < \rho_{\text{fluid}}$: the object **floats**, partly above the surface;
- $\rho_{\text{object}} > \rho_{\text{fluid}}$: the object **sinks**;
- $\rho_{\text{object}} = \rho_{\text{fluid}}$: the object is **neutrally buoyant** and stays wherever it is placed inside the fluid.

You'll see *why* this works when we meet the buoyant force. For now, use it as a reliable test.` },
                { type: "check", questionId: Q("fs-1"), lead: "Heavy log, light pebble: what decides?" },
                { type: "callout", tone: "warning", title: "Mass and size are not the test", md: r`A 5-tonne log floats; a 1-gram steel pin sinks. Making an object bigger or heavier while keeping the same material changes nothing, because its density is unchanged. Only changing the **density** of the object (on average) or of the **fluid** can switch an object from sinking to floating.` },
                {
                  type: "worked_example",
                  title: "How does a steel ship float?",
                  problem: r`A small steel boat has a total mass of $1200\,\text{kg}$. Its hull, up to the deck, encloses a volume of $4.0\,\text{m}^3$ (mostly air). Will it float in fresh water, and how much cargo could it hold before the water reaches the deck?`,
                  steps: [
                    { title: "Average density of the boat", md: r`$\rho_{\text{avg}} = \dfrac{1200\,\text{kg}}{4.0\,\text{m}^3} = 300\,\text{kg/m}^3$, far below $1000\,\text{kg/m}^3$. It floats.` },
                    { title: "Limit for floating", md: r`It will still float as long as its average density stays at or below $1000\,\text{kg/m}^3$, i.e. a total mass of at most $(1000)(4.0) = 4000\,\text{kg}$.` },
                    { title: "Cargo", md: r`$4000 - 1200 = 2800\,\text{kg}$ of cargo. Any more and the average density exceeds water's: the boat is swamped and sinks.` },
                  ],
                  answer: r`It floats (average density $300\,\text{kg/m}^3$); maximum cargo about $2800\,\text{kg}$`,
                },
                { type: "text", md: r`## Changing the density to float or sink

- **Submarines** flood ballast tanks with sea water to raise their average density and dive, then blow the water out with compressed air to rise.
- **Fish** adjust the gas in a swim bladder to become neutrally buoyant at the depth they want.
- **Salt water** is denser than fresh water, so an egg that sinks in a glass of tap water floats once enough salt is dissolved.
- **Liquids that don't mix** settle into layers, densest at the bottom: oil floats on water, and water floats on syrup.` },
                { type: "check", questionId: Q("fs-2"), lead: "One bead, two liquids." },
                { type: "summary", points: ["An object floats if its average density is less than the fluid's, sinks if greater, and stays suspended if equal.", "Mass and size don't decide floating; density does.", "Hollow objects like ships float because their average density, including the enclosed air, is low.", "Submarines and fish dive or rise by changing their average density.", "Immiscible liquids layer by density, densest at the bottom."] },
              ],
            },
          ],
        },

        // ─────────────────────────── Topic 2: pressure ──────────────────────────
        {
          id: T("pressure"),
          title: "Pressure and depth",
          description: "Pressure as force spread over an area, how it grows with depth in a liquid, and the difference between gauge and absolute pressure.",
          objectives: [
            { id: "physics-1.o.8c", code: "PHYS-8.C", description: "Calculate pressure as the perpendicular force per unit area, and use it to find forces on surfaces.", skillIds: [S("pressure-force-area")] },
            { id: "physics-1.o.8d", code: "PHYS-8.D", description: "Determine the pressure at a depth in a static fluid, and distinguish absolute, gauge and atmospheric pressure.", skillIds: [S("pressure-depth"), S("gauge-absolute")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u8.pressure",
              title: "Pressure: force spread over an area",
              summary: "What pressure is, why it matters more than force for sinking, cutting and crushing, and how big atmospheric pressure really is.",
              estMinutes: 11,
              skillIds: [S("pressure-force-area")],
              blocks: [
                { type: "text", md: r`Press your palm on a balloon and nothing happens. Press a pin into it with a much smaller force and it pops. What matters is not just the force, but **how concentrated** it is.` },
                { type: "definition", term: "Pressure", md: r`The force acting perpendicular to a surface, divided by the area of the surface. Pressure is a scalar: it has no direction of its own, but it always pushes perpendicular to whatever surface it acts on. Its SI unit is the **pascal**: $1\,\text{Pa} = 1\,\text{N/m}^2$.` },
                { type: "formula", latex: r`P = \frac{F_\perp}{A}`, caption: "Pressure equals perpendicular force divided by area. Rearranged: F = PA." },
                {
                  type: "worked_example",
                  title: "Skis versus boots",
                  problem: r`A $720\,\text{N}$ skier stands in boots with a total sole area of $0.060\,\text{m}^2$, then clips into skis with a total area of $0.36\,\text{m}^2$. Find the pressure on the snow in each case.`,
                  steps: [
                    { title: "Boots", md: r`$P = \dfrac{720\,\text{N}}{0.060\,\text{m}^2} = 1.2 \times 10^4\,\text{Pa}$.` },
                    { title: "Skis", md: r`$P = \dfrac{720\,\text{N}}{0.36\,\text{m}^2} = 2.0 \times 10^3\,\text{Pa}$.` },
                    { title: "Compare", md: "Same force, six times the area, one sixth of the pressure. The snow can support the smaller pressure, so the skier stays on top." },
                  ],
                  answer: r`Boots: $1.2 \times 10^4\,\text{Pa}$; skis: $2.0 \times 10^3\,\text{Pa}$`,
                },
                { type: "check", questionId: Q("pfa-1") },
                { type: "callout", tone: "warning", title: "Pressure is not force", md: r`Snowshoes don't reduce the force on the snow: the hiker's weight is the same. They reduce the **pressure** by spreading that force over more area. A sharp knife works the other way: a modest force on a tiny edge area gives an enormous pressure.

When you need a force from a pressure, **multiply**: $F = PA$. Always convert areas to square metres first: $1\,\text{cm}^2 = 10^{-4}\,\text{m}^2$.` },
                { type: "check", questionId: Q("pfa-2"), lead: "Explain an everyday trick." },
                { type: "text", md: r`## The air is pressing on you right now

The atmosphere is a fluid tens of kilometres deep, and its weight presses on everything at the bottom of it. At sea level, **atmospheric pressure** is about

$$P_0 = 1.01 \times 10^5\,\text{Pa}.$$

That is about $10\,\text{N}$ on every square centimetre: roughly the weight of a $1\,\text{kg}$ bag of sugar on each fingernail. You don't feel crushed because the fluids in your body push outward with the same pressure, and because air pushes on every side of an object, not just the top. A tabletop has about $6000\,\text{N}$ pushing down on it, and almost exactly the same pushing up from underneath.` },
                { type: "summary", points: [r`Pressure is perpendicular force per unit area: $P = F/A$, measured in pascals ($1\,\text{Pa} = 1\,\text{N/m}^2$).`, "The same force over a smaller area gives a larger pressure.", r`To find a force from a pressure, multiply: $F = PA$. Convert areas to $\text{m}^2$ first.`, r`Atmospheric pressure at sea level is about $1.01 \times 10^5\,\text{Pa}$, acting on every surface from every side.`] },
              ],
            },
            {
              id: "physics-1.l.u8.pressure-depth",
              title: "Pressure with depth: gauge and absolute",
              summary: "Why pressure grows by ρgh as you go down in a liquid, why the container's shape doesn't matter, and how gauge pressure differs from absolute pressure.",
              estMinutes: 15,
              skillIds: [S("pressure-depth"), S("gauge-absolute")],
              blocks: [
                { type: "text", md: r`Dive to the bottom of a deep pool and your ears start to hurt. The water above you has weight, and the deeper you go the more water there is to hold up. Let's find out exactly how much the pressure grows.` },
                {
                  type: "worked_example",
                  title: "Deriving the depth formula",
                  problem: r`Imagine a column of liquid of density $\rho$, cross-sectional area $A$ and height $h$, standing in a larger body of the same liquid with its top at the surface. Find the pressure at its bottom.`,
                  steps: [
                    { title: "Mass of the column", md: r`$m = \rho V = \rho A h$.` },
                    { title: "Forces on the column", md: r`Down: the air pressing on the top, $P_0 A$, and the column's weight, $\rho A h g$. Up: the liquid below pushing on its base, $PA$. (Sideways pushes cancel.)` },
                    { title: "Balance", md: r`The column is at rest, so $PA = P_0 A + \rho A h g$.` },
                    { title: "Divide by A", md: r`$P = P_0 + \rho g h$. The area cancels: the result doesn't depend on how wide the column is.` },
                  ],
                  answer: r`$P = P_0 + \rho g h$`,
                },
                { type: "formula", latex: r`P = P_0 + \rho g h`, caption: "Absolute pressure at depth h below the surface of a still liquid of density ρ, with pressure P₀ at the surface." },
                { type: "text", md: r`In fresh water, $\rho g = (1000)(9.8) = 9800\,\text{Pa}$ per metre, so every $10.3\,\text{m}$ of depth adds about one more atmosphere.` },
                { type: "check", questionId: Q("pd-1"), lead: "Use the formula." },
                { type: "callout", tone: "warning", title: "Only depth matters, not shape", md: r`$P = P_0 + \rho g h$ contains no width, no volume and no shape. A thin tube, a wide tank and an oddly shaped vase filled with water to the same depth have **exactly the same** pressure at the bottom. A dam holding back a vast lake feels the same pressure as one holding back a narrow channel of the same depth.

The wide tank does have a larger **force** on its floor, but only because the floor has more area: $F = PA$.` },
                { type: "check", questionId: Q("pd-2") },
                { type: "callout", tone: "info", title: "Pressure pushes in every direction", md: r`At any point in a fluid, the pressure pushes equally in all directions, and on any surface it pushes perpendicular to that surface. Water pushes sideways on a dam wall and **upward** on the bottom of a boat. That upward push on the deeper bottom of a submerged object is where the buoyant force comes from.` },
                { type: "definition", term: "Absolute pressure", md: r`The total pressure, measured from a perfect vacuum (zero pressure). Absolute pressure is never negative.` },
                { type: "definition", term: "Gauge pressure", md: r`The amount by which a pressure exceeds atmospheric pressure: $P_{\text{gauge}} = P_{\text{abs}} - P_0$. Tyre gauges and blood-pressure cuffs measure gauge pressure. It is negative for a partial vacuum.` },
                { type: "formula", latex: r`P_{\text{abs}} = P_{\text{gauge}} + P_0`, caption: "In an open liquid, the gauge pressure at depth h is just ρgh." },
                { type: "check", questionId: Q("ga-1"), lead: "Read a tyre gauge." },
                { type: "callout", tone: "warning", title: "Which pressure does the question want?", md: r`- "Absolute pressure", or "the pressure" in a context that includes the air: include $P_0$.
- "Gauge pressure", or "how much greater than atmospheric": leave $P_0$ out.
- **Net force on a wall, hatch or piston** with air on the other side: use the pressure **difference**, which is usually the gauge pressure, because the atmosphere pushes on both sides.

Zero gauge pressure means "atmospheric", not "empty".` },
                { type: "check", questionId: Q("ga-2") },
                { type: "text", md: r`## Atmospheric pressure at work

A **mercury barometer** is a tube, closed at the top with a vacuum above the mercury, standing in a dish of mercury. The atmosphere pushes on the dish and holds up a column of height $h = P_0 / (\rho_{\text{Hg}} g) \approx 0.76\,\text{m}$. A water barometer would need a tube over $10\,\text{m}$ tall.

A **drinking straw** works the same way. Sucking lowers the pressure in the straw; the atmosphere, still pushing on the open surface of the drink, pushes liquid up the straw. Low pressure doesn't pull: high pressure pushes.` },
                { type: "summary", points: [r`In a still liquid, $P = P_0 + \rho g h$: pressure increases linearly with depth.`, "Pressure at a depth depends only on depth, liquid density and surface pressure, not on the container's shape or the amount of liquid.", "Fluid pressure acts in all directions, perpendicular to any surface.", r`Absolute pressure is measured from vacuum; gauge pressure from the atmosphere: $P_{\text{abs}} = P_{\text{gauge}} + P_0$.`, "Net forces depend on pressure differences, so the atmosphere often cancels."] },
              ],
            },
          ],
        },

        // ─────────────────────────── Topic 3: Pascal ────────────────────────────
        {
          id: T("pascal"),
          title: "Pascal's principle and hydraulics",
          description: "How an enclosed fluid passes on a pressure change, and how hydraulic machines use that to multiply force.",
          objectives: [
            { id: "physics-1.o.8e", code: "PHYS-8.E", description: "Apply Pascal's principle to hydraulic systems, relating input and output forces, piston areas and piston distances, consistent with conservation of energy.", skillIds: [S("pascal")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u8.pascal",
              title: "Pascal's principle and hydraulic lifts",
              summary: "A pressure change in an enclosed fluid reaches every part of it, which lets a small force on a small piston hold up a car, at the cost of distance.",
              estMinutes: 15,
              skillIds: [S("pascal")],
              blocks: [
                { type: "text", md: r`Squeeze a sealed, completely full water bottle and the whole bottle stiffens, not just the part under your fingers. Liquids are almost impossible to compress, so a push in one place has nowhere to go except to raise the pressure everywhere.` },
                { type: "definition", term: "Pascal's principle", md: r`A change in pressure applied to an enclosed, incompressible fluid is transmitted undiminished to every part of the fluid and to the walls of its container.` },
                { type: "check", questionId: Q("pas-1") },
                { type: "text", md: r`## The hydraulic lift

Connect a narrow cylinder to a wide one, fill both with oil, and fit each with a piston at the same height. Push down on the small piston (area $A_1$) with force $F_1$. That raises the pressure in the oil by $F_1/A_1$, and by Pascal's principle the same pressure pushes up on the large piston (area $A_2$):` },
                { type: "formula", latex: r`\frac{F_1}{A_1} = \frac{F_2}{A_2} \quad\Longrightarrow\quad F_2 = F_1\,\frac{A_2}{A_1}`, caption: "Equal pressures at equal heights: the output force is the input force times the area ratio." },
                {
                  type: "worked_example",
                  title: "Lifting a car",
                  problem: r`A garage lift has a small piston of radius $1.5\,\text{cm}$ and a large piston of radius $15\,\text{cm}$, at the same height. What force on the small piston holds up a $13\,000\,\text{N}$ car?`,
                  steps: [
                    { title: "Area ratio", md: r`Areas scale with the square of the radius: $\dfrac{A_2}{A_1} = \left(\dfrac{15}{1.5}\right)^2 = 10^2 = 100$.` },
                    { title: "Input force", md: r`$F_1 = F_2\,\dfrac{A_1}{A_2} = \dfrac{13\,000\,\text{N}}{100} = 130\,\text{N}$.` },
                    { title: "Check the size", md: "130 N is about the weight of a 13 kg bag: a small push holds up a car." },
                  ],
                  answer: r`$130\,\text{N}$`,
                },
                { type: "callout", tone: "warning", title: "Square the ratio of radii or diameters", md: r`A piston ten times wider has $10^2 = 100$ times the area, not ten times. If pistons are described by radius or diameter, square the ratio before using it.

And remember that Pascal's principle passes on **pressure**, not force. The forces on the two pistons are different, and the bigger piston always gets the bigger force.` },
                { type: "check", questionId: Q("pas-2"), lead: "Force in, force out." },
                { type: "text", md: r`## There's no free lunch: distances

Push the small piston down a distance $d_1$ and it squeezes a volume $A_1 d_1$ of oil into the big cylinder. Oil can't compress, so the big piston must rise by enough to make room for that volume: $A_1 d_1 = A_2 d_2$.` },
                { type: "formula", latex: r`A_1 d_1 = A_2 d_2 \quad\Longrightarrow\quad F_1 d_1 = F_2 d_2`, caption: "The large piston moves a shorter distance by the same ratio that its force is larger, so work in equals work out." },
                { type: "callout", tone: "key", title: "Force multiplier, not energy multiplier", md: r`In the car example the force is multiplied by $100$, so the car rises only $1/100$ as far as the small piston moves. To lift the car $0.20\,\text{m}$, the small piston must travel $20\,\text{m}$, which is why real jacks are pumped stroke after stroke. Work in $= F_1 d_1$ equals work out $= F_2 d_2$; hydraulics trade force for distance, just as levers do.` },
                { type: "check", questionId: Q("pas-3"), lead: "How far does the big piston move?" },
                { type: "summary", points: ["Pascal's principle: a pressure change in an enclosed incompressible fluid reaches every part of it undiminished.", r`Hydraulic pistons at the same height: $F_1/A_1 = F_2/A_2$, so the larger piston gets the larger force.`, "If pistons are described by radius or diameter, square the ratio to get the area ratio.", r`The volume moved is the same: $A_1 d_1 = A_2 d_2$, so the large piston moves less.`, "Work in equals work out: hydraulics multiply force, never energy."] },
              ],
            },
          ],
        },

        // ─────────────────────────── Topic 4: buoyancy ──────────────────────────
        {
          id: T("buoyancy"),
          title: "Fluids and Newton's laws: buoyancy",
          description: "Where the buoyant force comes from, how big it is, and how it combines with weight and other forces for objects that sink, hang or float.",
          objectives: [
            { id: "physics-1.o.8f", code: "PHYS-8.F", description: "Explain the buoyant force as a consequence of pressure differences in a fluid, and calculate it using Archimedes' principle.", skillIds: [S("buoyant-force")] },
            { id: "physics-1.o.8g", code: "PHYS-8.G", description: "Apply Newton's laws to objects in fluids, including apparent weight and the fraction of a floating object that is submerged.", skillIds: [S("apparent-weight"), S("floating-fraction")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u8.buoyant-force",
              title: "Buoyant force and Archimedes' principle",
              summary: "Why pressure differences push up on anything in a fluid, and why that push equals the weight of the fluid pushed aside.",
              estMinutes: 14,
              skillIds: [S("buoyant-force")],
              blocks: [
                { type: "text", md: r`Pick up a friend in a swimming pool and they feel surprisingly light. The water is pushing up on them. That upward push from a fluid is the **buoyant force**, and it comes straight from the fact that pressure grows with depth.` },
                {
                  type: "worked_example",
                  title: "Pressure forces on a submerged box",
                  problem: r`A box with a top and bottom of area $A$ and a height $h$ is completely submerged in a liquid of density $\rho$. Find the net force of the liquid's pressure on it.`,
                  steps: [
                    { title: "Sides", md: "The pushes on opposite side faces are equal and opposite: they cancel." },
                    { title: "Top and bottom", md: r`If the top is at depth $d$, the liquid pushes down on it with $(P_0 + \rho g d)A$ and up on the bottom, at depth $d + h$, with $(P_0 + \rho g (d + h))A$.` },
                    { title: "Net force", md: r`Up minus down: $\rho g h A = \rho g V$, where $V = Ah$ is the box's volume. $P_0$ and $d$ have cancelled.` },
                    { title: "Interpret", md: r`$\rho V$ is the mass of liquid that would fill the box's space, so $\rho V g$ is the **weight of the displaced liquid**.` },
                  ],
                  answer: r`An upward force $F_B = \rho g V$`,
                },
                { type: "definition", term: "Archimedes' principle", md: r`An object partly or completely immersed in a fluid experiences an upward buoyant force equal to the weight of the fluid it displaces.` },
                { type: "formula", latex: r`F_B = \rho_{\text{fluid}}\,V_{\text{displaced}}\,g`, caption: "ρ_fluid is the fluid's density (not the object's). V_displaced is the volume of the object below the surface." },
                { type: "check", questionId: Q("bf-1"), lead: "Whose density goes in the formula?" },
                { type: "callout", tone: "warning", title: "The fluid's density, the submerged volume", md: r`- The density in $F_B$ is the **fluid's**. The object's density affects its weight, not the buoyant force.
- The volume is only the part **below the surface**. A half-submerged block displaces half its volume.
- Sinking objects feel a buoyant force too. A rock sinks because its weight is bigger than the buoyant force, not because there isn't one.

So an aluminium block and a lead block of the same size, both under water, feel exactly the same buoyant force.` },
                { type: "check", questionId: Q("bf-2") },
                { type: "callout", tone: "info", title: "Depth doesn't matter once it's under", md: r`In the box derivation the depth $d$ cancelled. Going deeper raises the pressure on the top and the bottom by the same amount, so their difference is unchanged. As long as the fluid's density stays the same (true for water, to a very good approximation), a fully submerged object feels the same buoyant force at any depth.` },
                { type: "check", questionId: Q("bf-3") },
                { type: "text", md: r`## The floating rule explained

Now we can see why the density test from the start of the unit works. For a fully submerged object of volume $V$:

$$F_B = \rho_{\text{fluid}} V g \qquad W = \rho_{\text{object}} V g$$

The volume and $g$ are common to both, so the buoyant force beats the weight exactly when $\rho_{\text{fluid}} > \rho_{\text{object}}$. Archimedes' principle applies to gases too: a helium balloon rises because the air it displaces weighs more than the balloon and its helium.` },
                { type: "summary", points: ["Pressure increases with depth, so a fluid pushes up on the bottom of an object harder than down on its top: that net push is the buoyant force.", r`Archimedes' principle: $F_B = \rho_{\text{fluid}} V_{\text{displaced}}\,g$, the weight of the displaced fluid.`, "Use the fluid's density and only the submerged volume.", "Sinking objects still feel a buoyant force; it's just smaller than their weight.", "For a fully submerged object in an incompressible fluid, the buoyant force doesn't depend on depth."] },
              ],
            },
            {
              id: "physics-1.l.u8.apparent-weight-floating",
              title: "Apparent weight and floating objects",
              summary: "Newton's laws with a buoyant force: why things feel lighter under water, how weighing in water reveals density, and how much of a floating object sits below the surface.",
              estMinutes: 16,
              skillIds: [S("apparent-weight"), S("floating-fraction")],
              blocks: [
                { type: "text", md: r`The buoyant force is just another force. Add it to the free-body diagram with everything else, then use Newton's laws as usual. Two situations come up again and again: an object hanging or held **under** the surface, and an object **floating** at it.` },
                { type: "text", md: r`## Objects held under water

Hang a rock from a spring scale and lower it into water. Three forces act: its weight $W$ down, the buoyant force $F_B$ up, and the scale's tension $T$ up. At rest,

$$T + F_B = W \quad\Longrightarrow\quad T = W - F_B.$$

The scale reads less than in air. That reading is the rock's **apparent weight**.` },
                { type: "definition", term: "Apparent weight", md: r`The reading of a scale supporting an object in a fluid: its true weight minus the buoyant force, $W_{\text{app}} = W - F_B$. The gravitational force on the object is unchanged.` },
                { type: "check", questionId: Q("aw-1"), lead: "Find the buoyant force first." },
                {
                  type: "worked_example",
                  title: "Finding a density by weighing in water",
                  problem: r`A metal bolt reads $3.9\,\text{N}$ on a spring scale in air and $3.4\,\text{N}$ when fully submerged in water. Find the density of the metal.`,
                  steps: [
                    { title: "Buoyant force", md: r`The loss in reading is the buoyant force: $F_B = 3.9 - 3.4 = 0.50\,\text{N}$.` },
                    { title: "What that tells you", md: r`$F_B$ is the weight of a volume of water equal to the bolt's volume. So the bolt weighs $\dfrac{3.9}{0.50} = 7.8$ times as much as the same volume of water.` },
                    { title: "Density", md: r`$\rho = 7.8 \times 1000 = 7800\,\text{kg/m}^3$: steel.` },
                  ],
                  answer: r`$7800\,\text{kg/m}^3$`,
                },
                { type: "callout", tone: "warning", title: "Weight doesn't change under water", md: r`An object in water is not "lighter" in the sense of having less gravity on it. Its weight $mg$ is unchanged; an extra **upward** force has appeared. So subtract the buoyant force when finding apparent weight, never add it. And remember that a sinking object is not weightless under water: the scale still carries $W - F_B$.` },
                { type: "check", questionId: Q("aw-2") },
                { type: "text", md: r`## Floating objects

A floating object settles at the depth where it is in equilibrium. With no other forces acting,

$$F_B = W \quad\Longrightarrow\quad \rho_{\text{fluid}} V_{\text{sub}}\,g = \rho_{\text{object}} V g.$$

Cancel $g$ and rearrange:` },
                { type: "formula", latex: r`\frac{V_{\text{sub}}}{V} = \frac{\rho_{\text{object}}}{\rho_{\text{fluid}}}`, caption: "The fraction of a floating object's volume that is submerged equals the ratio of its average density to the fluid's density." },
                {
                  type: "worked_example",
                  title: "The tip of the iceberg",
                  problem: r`Ice has a density of $917\,\text{kg/m}^3$; sea water, $1025\,\text{kg/m}^3$. What fraction of an iceberg is visible above the sea?`,
                  steps: [
                    { title: "Fraction submerged", md: r`$\dfrac{V_{\text{sub}}}{V} = \dfrac{917}{1025} \approx 0.89$.` },
                    { title: "Fraction above", md: r`$1 - 0.89 = 0.11$: only about $11\%$ is above the surface.` },
                  ],
                  answer: "About 11% above the surface",
                },
                { type: "check", questionId: Q("ff-1"), lead: "A ratio of densities." },
                { type: "callout", tone: "warning", title: "Floating means balanced, not winning", md: r`It is tempting to say a boat floats because the buoyant force is *bigger* than its weight. If that were true, the boat would accelerate upward. A floating object at rest has $F_B = W$ exactly.

Move a boat from a river into denser sea water and it rides a little higher, displacing less volume, but the buoyant force is still equal to its weight. Load the boat and it sinks lower until the extra displaced water weighs as much as the cargo.` },
                { type: "check", questionId: Q("ff-2") },
                { type: "summary", points: ["Put the buoyant force on the free-body diagram and apply Newton's laws as usual.", r`Apparent weight is $W - F_B$; the true weight $mg$ never changes.`, "The loss in weight when submerged equals the buoyant force, which reveals the object's volume and density.", r`A floating object at rest has $F_B = W$, so the fraction submerged is $\rho_{\text{object}}/\rho_{\text{fluid}}$.`, "Adding load to a floating object makes it sink lower until the extra displaced fluid weighs as much as the load."] },
              ],
            },
          ],
        },

        // ─────────────────────────── Topic 5: flow ──────────────────────────────
        {
          id: T("flow"),
          title: "Fluids and conservation laws: flow",
          description: "Moving fluids: conservation of mass gives the continuity equation, and conservation of energy gives Bernoulli's equation.",
          objectives: [
            { id: "physics-1.o.8h", code: "PHYS-8.H", description: "Apply the continuity equation to relate cross-sectional area and flow speed for an incompressible fluid.", skillIds: [S("continuity")] },
            { id: "physics-1.o.8i", code: "PHYS-8.I", description: "Apply Bernoulli's equation as conservation of energy for a flowing fluid, including the speed–pressure relationship and flow from an opening in a tank.", skillIds: [S("bernoulli")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u8.continuity",
              title: "Flow rate and the continuity equation",
              summary: "Why a fluid speeds up where a pipe narrows: the same volume has to pass every point each second.",
              estMinutes: 12,
              skillIds: [S("continuity")],
              blocks: [
                { type: "text", md: r`So far our fluids have been sitting still. Now let them flow. We'll treat liquids as an **ideal fluid**: incompressible, with no internal friction (viscosity), flowing steadily, so the velocity at any given point in the pipe doesn't change with time.` },
                { type: "definition", term: "Volume flow rate", md: r`The volume of fluid passing a cross-section per second, $Q$. For fluid moving at speed $v$ through a cross-sectional area $A$, $Q = Av$, in $\text{m}^3/\text{s}$.` },
                { type: "text", md: r`Why $Av$? In a time $\Delta t$ the fluid moves forward a distance $v\,\Delta t$, so a cylinder of fluid with volume $A\,v\,\Delta t$ passes the cross-section. Divide by $\Delta t$ and you get $Av$.` },
                { type: "callout", tone: "key", title: "The continuity equation", md: r`An incompressible fluid can't pile up anywhere in a pipe, and it can't vanish. So whatever volume enters one end each second must leave the other: the flow rate is the same at every cross-section.

$$A_1 v_1 = A_2 v_2$$

Where the pipe is narrow, the fluid is fast. Where it is wide, the fluid is slow.` },
                {
                  type: "worked_example",
                  title: "A hose nozzle",
                  problem: r`Water flows at $0.80\,\text{m/s}$ in a hose of inner diameter $1.8\,\text{cm}$. The nozzle has a diameter of $0.60\,\text{cm}$. How fast does the water leave the nozzle?`,
                  steps: [
                    { title: "Area ratio from diameters", md: r`$A \propto d^2$, so $\dfrac{A_1}{A_2} = \left(\dfrac{1.8}{0.60}\right)^2 = 3.0^2 = 9.0$.` },
                    { title: "Continuity", md: r`$v_2 = v_1\,\dfrac{A_1}{A_2} = (0.80)(9.0) = 7.2\,\text{m/s}$.` },
                  ],
                  answer: r`$7.2\,\text{m/s}$`,
                },
                { type: "check", questionId: Q("con-1"), lead: "Apply continuity." },
                { type: "callout", tone: "warning", title: "Narrow means fast", md: r`It can feel as if a narrow pipe should "hold the water back". It does not, as long as the same flow is being pushed through. Think of a river: slow and lazy across a wide valley, racing through a narrow gorge. And as with pistons, a pipe with **half the diameter** has a **quarter of the area**, so the fluid moves **four times** as fast.` },
                { type: "check", questionId: Q("con-2") },
                { type: "summary", points: [r`Volume flow rate $Q = Av$, in $\text{m}^3/\text{s}$.`, r`For an incompressible fluid in steady flow, $A_1 v_1 = A_2 v_2$: the flow rate is the same everywhere along a pipe.`, "Fluid moves faster where the cross-section is smaller.", "Square the diameter ratio to get the area ratio.", "When a pipe branches, the flow rates of the branches add up to the flow rate in the main pipe."] },
              ],
            },
            {
              id: "physics-1.l.u8.bernoulli",
              title: "Bernoulli's equation",
              summary: "Energy conservation for a flowing fluid, and the surprising consequence that faster-moving fluid is at lower pressure.",
              estMinutes: 15,
              skillIds: [S("bernoulli")],
              blocks: [
                { type: "text", md: r`Continuity tells us water speeds up as it enters a narrow section of pipe. But speeding up requires a net force. What pushes the water forward? The only candidate is the water behind it: the pressure behind must be **higher** than the pressure ahead. So in the narrow, fast section the pressure must be **lower**. Bernoulli's equation makes this exact.` },
                { type: "formula", latex: r`P_1 + \tfrac{1}{2}\rho v_1^2 + \rho g y_1 = P_2 + \tfrac{1}{2}\rho v_2^2 + \rho g y_2`, caption: "Bernoulli's equation for steady, incompressible, non-viscous flow, comparing two points along the flow; y is the height of each point." },
                { type: "callout", tone: "key", title: "It's energy conservation", md: r`Divide the familiar energies by volume:

- $\tfrac{1}{2}\rho v^2$ is kinetic energy per unit volume ($\tfrac{1}{2}mv^2 \div V$);
- $\rho g y$ is gravitational potential energy per unit volume ($mgy \div V$);
- $P$ is the work per unit volume done by the surrounding fluid pushing the parcel along.

Every term has units of $\text{Pa} = \text{N/m}^2 = \text{J/m}^3$. When one term goes up, the others must go down to keep the total fixed.` },
                { type: "text", md: r`## Horizontal pipes: speed versus pressure

When both points are at the same height, the $\rho g y$ terms cancel:

$$P_1 + \tfrac{1}{2}\rho v_1^2 = P_2 + \tfrac{1}{2}\rho v_2^2.$$

Where the fluid moves faster, its pressure is lower.` },
                { type: "check", questionId: Q("ber-1"), lead: "Use continuity, then Bernoulli." },
                {
                  type: "worked_example",
                  title: "Pressure in a constriction",
                  problem: r`Water flows through a horizontal pipe at $1.0\,\text{m/s}$ where the pressure is $1.50 \times 10^5\,\text{Pa}$. The pipe narrows to one quarter of its area. Find the speed and pressure in the narrow section.`,
                  steps: [
                    { title: "Continuity", md: r`A quarter of the area means four times the speed: $v_2 = 4.0\,\text{m/s}$.` },
                    { title: "Bernoulli, horizontal", md: r`$P_2 = P_1 - \tfrac{1}{2}\rho(v_2^2 - v_1^2) = 1.50 \times 10^5 - \tfrac{1}{2}(1000)(16 - 1.0)$.` },
                    { title: "Calculate", md: r`$P_2 = 1.50 \times 10^5 - 7500 = 1.425 \times 10^5\,\text{Pa}$.` },
                  ],
                  answer: r`$4.0\,\text{m/s}$ and about $1.43 \times 10^5\,\text{Pa}$`,
                },
                { type: "callout", tone: "warning", title: "Fast fluid is at low pressure, not high", md: r`Water in a constriction is not "squeezed" to a higher pressure; liquids barely compress. It is moving faster, and the pressure drop is exactly what accelerated it. If your answer has the fast section at the higher pressure, check the sign of $\tfrac{1}{2}\rho(v_2^2 - v_1^2)$.` },
                { type: "check", questionId: Q("ber-2") },
                { type: "text", md: r`## When the height changes too

If a pipe of constant width rises, continuity keeps the speed the same, so the kinetic terms cancel and $P_2 = P_1 - \rho g\,(y_2 - y_1)$: the same pressure-with-depth rule as for still water. If both the speed and the height change, keep all three terms. A good habit: choose $y = 0$ at the lower point and write every term out before cancelling anything.` },
                { type: "summary", points: [r`Bernoulli: $P + \tfrac{1}{2}\rho v^2 + \rho g y$ is the same at every point along a steady, ideal flow.`, "Each term is an energy per unit volume; the equation is conservation of energy.", "At the same height, faster flow means lower pressure.", "Combine with continuity: find the speeds from the areas first, then the pressures.", r`With no speed change, Bernoulli reduces to the hydrostatic rule $\Delta P = \rho g\,\Delta y$.`] },
              ],
            },
            {
              id: "physics-1.l.u8.bernoulli-applications",
              title: "Bernoulli at work: jets, roofs and draining tanks",
              summary: "Torricelli's result for the speed of liquid leaving a tank, and how the speed–pressure trade-off explains roofs, curtains and lift.",
              estMinutes: 13,
              skillIds: [S("bernoulli")],
              blocks: [
                { type: "text", md: r`Punch a small hole in the side of a tall water tank and a jet shoots out. How fast? Bernoulli's equation answers it in two lines.` },
                {
                  type: "worked_example",
                  title: "Torricelli's result",
                  problem: r`A large open tank has a small hole a depth $h$ below the water surface. Find the speed of the water leaving the hole.`,
                  steps: [
                    { title: "Choose the two points", md: r`Point 1: the water surface. Point 2: just outside the hole. Put $y = 0$ at the hole, so $y_1 = h$ and $y_2 = 0$.` },
                    { title: "Pressures", md: r`Both points are open to the air, so $P_1 = P_2 = P_0$, and they cancel.` },
                    { title: "Speeds", md: r`The tank is large, so the surface drops very slowly: $v_1 \approx 0$.` },
                    { title: "What's left", md: r`$\rho g h = \tfrac{1}{2}\rho v_2^2$, so $v_2 = \sqrt{2gh}$.` },
                  ],
                  answer: r`$v = \sqrt{2gh}$`,
                },
                { type: "formula", latex: r`v = \sqrt{2gh}`, caption: "Torricelli's result: h is the depth of the hole below the liquid's surface." },
                { type: "callout", tone: "info", title: "Just like falling", md: r`$\sqrt{2gh}$ is the speed an object reaches after falling freely through a height $h$. The jet gets the speed it would have had if it had simply fallen from the surface level to the hole. Like a falling object, it doesn't depend on mass, so the liquid's density cancels out. The size of the hole doesn't matter either (as long as it is small): a bigger hole lets out more liquid per second, but at the same speed.` },
                { type: "check", questionId: Q("ber-3"), lead: "Find the jet speed." },
                { type: "callout", tone: "warning", title: "Measure h from the surface to the hole", md: r`The $h$ in $\sqrt{2gh}$ is the depth of the hole **below the liquid's surface**, not the height of the hole above the floor and not the height of the whole tank. Once the water is out, the height of the hole above the floor matters for a different question: how far the jet travels before it lands (a projectile problem).

As the tank drains, $h$ shrinks, so the jet slows down and the flow gets weaker.` },
                { type: "text", md: r`## The speed–pressure trade-off in everyday life

The rule "faster flow, lower pressure" explains a lot:

- **Roofs in storms.** Wind races over the roof while the air inside is still. The pressure above the roof drops below the pressure inside, and the difference, times the roof's large area, can lift it off.
- **Shower curtains** bulge inward because the spray drags air along, lowering the pressure inside the shower.
- **Blowing across a strip of paper** held below your lips makes it rise into the moving air.
- **Aircraft wings** are shaped and angled so that air moves faster over the top surface than under it; the lower pressure on top contributes to lift.

In every case the surface is **pushed** from the high-pressure side toward the fast-moving, low-pressure fluid.` },
                { type: "check", questionId: Q("ber-4") },
                { type: "summary", points: [r`Torricelli: liquid leaves a small hole at depth $h$ below the surface of a large open tank at $v = \sqrt{2gh}$.`, "The jet speed doesn't depend on the liquid's density or the size of the hole.", "h is measured from the liquid's surface down to the hole; as the tank drains, the jet slows.", "Faster-moving air or water is at lower pressure, so surfaces are pushed toward the fast flow: roofs, curtains, paper strips and wings."] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: unit8Questions,

  assessments: [
    // ── Topic 1: density ──
    {
      id: "physics-1.ex.u8.density-calc",
      kind: "exercise",
      title: "Calculate density, mass and volume",
      description: "Use ρ = m/V in every direction, convert units, and reason about what does and doesn't change a density.",
      unitId: UNIT,
      topicId: T("density"),
      questionIds: range("den", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u8.float-sink",
      kind: "exercise",
      title: "Predict floating and sinking",
      description: "Compare densities to decide what floats, sinks or hovers, including hollow objects, layered liquids and submarines.",
      unitId: UNIT,
      topicId: T("density"),
      questionIds: range("fs", 3, 10),
      config: exercise,
    },
    // ── Topic 2: pressure ──
    {
      id: "physics-1.ex.u8.pressure-force-area",
      kind: "exercise",
      title: "Calculate pressure from force and area",
      description: "Find pressures, forces and areas with P = F/A, and explain how spreading or concentrating a force changes the pressure.",
      unitId: UNIT,
      topicId: T("pressure"),
      questionIds: range("pfa", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u8.pressure-depth",
      kind: "exercise",
      title: "Find the pressure at a depth",
      description: "Apply P = P₀ + ρgh, including layered liquids and pressure differences, and explain why container shape doesn't matter.",
      unitId: UNIT,
      topicId: T("pressure"),
      questionIds: range("pd", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u8.gauge-absolute",
      kind: "exercise",
      title: "Work with gauge and absolute pressure",
      description: "Convert between gauge and absolute pressure, use pressure differences for net forces, and explain straws and barometers.",
      unitId: UNIT,
      topicId: T("pressure"),
      questionIds: range("ga", 3, 10),
      config: exercise,
    },
    // ── Topic 3: Pascal ──
    {
      id: "physics-1.ex.u8.hydraulic-forces",
      kind: "exercise",
      title: "Size the forces in a hydraulic lift",
      description: "Use Pascal's principle to find input and output forces from piston areas, radii and diameters.",
      unitId: UNIT,
      topicId: T("pascal"),
      questionIds: range("pas", 4, 11),
      config: exercise,
    },
    {
      id: "physics-1.ex.u8.hydraulic-work",
      kind: "exercise",
      title: "Trade force for distance in hydraulics",
      description: "Relate piston distances and work in hydraulic machines, and explain why they multiply force but not energy.",
      unitId: UNIT,
      topicId: T("pascal"),
      questionIds: range("pas", 12, 19),
      config: exercise,
    },
    // ── Topic 4: buoyancy ──
    {
      id: "physics-1.ex.u8.buoyant-force",
      kind: "exercise",
      title: "Calculate buoyant forces",
      description: "Apply Archimedes' principle to submerged and partly submerged objects in water, sea water, oil and air.",
      unitId: UNIT,
      topicId: T("buoyancy"),
      questionIds: range("bf", 4, 11),
      config: exercise,
    },
    {
      id: "physics-1.ex.u8.apparent-weight",
      kind: "exercise",
      title: "Weigh and lift objects under water",
      description: "Use free-body diagrams with a buoyant force to find apparent weights, lifting forces, normal forces and densities.",
      unitId: UNIT,
      topicId: T("buoyancy"),
      questionIds: range("aw", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u8.floating-fraction",
      kind: "exercise",
      title: "Find how much of a floating object is submerged",
      description: "Use buoyant force = weight to find fractions submerged, densities, floating depths and maximum loads.",
      unitId: UNIT,
      topicId: T("buoyancy"),
      questionIds: range("ff", 3, 10),
      config: exercise,
    },
    // ── Topic 5: flow ──
    {
      id: "physics-1.ex.u8.continuity",
      kind: "exercise",
      title: "Use the continuity equation",
      description: "Relate pipe areas, diameters and flow speeds with A₁v₁ = A₂v₂, and work with volume flow rates.",
      unitId: UNIT,
      topicId: T("flow"),
      questionIds: range("con", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u8.bernoulli",
      kind: "exercise",
      title: "Apply Bernoulli's equation in pipes",
      description: "Find pressures and speeds in pipes that narrow, widen and climb, combining continuity with Bernoulli's equation.",
      unitId: UNIT,
      topicId: T("flow"),
      questionIds: range("ber", 5, 12),
      config: exercise,
    },
    {
      id: "physics-1.ex.u8.torricelli",
      kind: "exercise",
      title: "Jets from tanks and speed–pressure effects",
      description: "Use Torricelli's result for flow from a tank, and explain everyday effects of the speed–pressure trade-off.",
      unitId: UNIT,
      topicId: T("flow"),
      questionIds: range("ber", 13, 20),
      config: exercise,
    },
    // ── Checkpoints, unit test and AP-style practice ──
    {
      id: "physics-1.quiz.u8.1",
      kind: "skill_quiz",
      title: "Quiz 1",
      description: "Seven questions on density, floating and sinking, pressure, pressure with depth, gauge pressure and hydraulics. No hints.",
      unitId: UNIT,
      topicId: T("pascal"),
      questionIds: [Q("den-11"), Q("fs-11"), Q("pfa-11"), Q("pd-11"), Q("ga-11"), Q("pas-20"), Q("pas-21")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 90 },
    },
    {
      id: "physics-1.quiz.u8.2",
      kind: "skill_quiz",
      title: "Quiz 2",
      description: "Six questions on buoyant force, apparent weight, floating, continuity and Bernoulli's equation. No hints.",
      unitId: UNIT,
      topicId: T("flow"),
      questionIds: [Q("bf-12"), Q("aw-11"), Q("ff-11"), Q("con-11"), Q("ber-21"), Q("ber-22")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 6 * 90 },
    },
    {
      id: "physics-1.test.u8",
      kind: "unit_test",
      title: "Unit 8 test: fluids",
      description: "Thirteen questions, 26 minutes, covering the whole unit: density, pressure, hydraulics, buoyancy, continuity and Bernoulli's equation.",
      unitId: UNIT,
      questionIds: [
        Q("den-12"), Q("fs-12"), Q("pfa-12"), Q("pd-12"), Q("ga-12"), Q("pas-22"), Q("bf-13"),
        Q("bf-14"), Q("aw-12"), Q("ff-12"), Q("con-12"), Q("ber-23"), Q("ber-24"),
      ],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 13 * 120 },
    },
    {
      id: "physics-1.exam.u8",
      kind: "exam_practice",
      title: "AP-style practice: fluids",
      description: "Seven harder multi-step fluids problems in the style of the AP exam: manometers, hydraulics with levers, buoyancy with strings, weighing in two liquids, barge loading and pipe flow.",
      questionIds: [Q("pd-13"), Q("pas-23"), Q("bf-15"), Q("aw-13"), Q("ff-13"), Q("ber-25"), Q("ber-26")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 120 },
    },
  ],
};
