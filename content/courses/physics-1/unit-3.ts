/**
 * AP Physics 1 — Unit 3: Work, Energy, and Power. Assembled into the course in
 * ./index.ts.
 *
 * Original AceAP instructional content. Objective codes ("PHYS-3.C") are
 * AceAP's own and are not College Board codes. Algebra-based throughout;
 * g = 9.8 m/s², heights measured upward, no air resistance unless a problem
 * says otherwise. Gravitational potential energy always belongs to an
 * object–Earth system and elastic potential energy to a spring.
 */
import type { UnitPart } from "./shared";
import { unit3Questions } from "./unit-3.questions";

const r = String.raw;
const S = (id: string) => `physics-1.u3.${id}`;
const Q = (id: string) => `physics-1.q.u3.${id}`;
const M = (id: string) => `physics-1.m.u3.${id}`;
const T = (id: string) => `physics-1.u3.t.${id}`;
const U1 = (id: string) => `physics-1.${id}`;

const UNIT = "physics-1.u3";
const EXERCISE = { feedback: "immediate", assistance: "allowed", questionsPerAttempt: 5 } as const;
const range = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => Q(`${prefix}-${from + i}`));

export const unit3: UnitPart = {
  skills: [
    {
      id: S("kinetic-energy"),
      name: "Translational kinetic energy",
      description: "Calculate kinetic energy from mass and speed, reason about how it scales with speed and mass, and recognise it as a scalar that is never negative.",
      difficulty: 2,
      keywords: ["kinetic energy", "1/2 m v^2", "energy of motion", "joule", "doubling speed quadruples kinetic energy", "is kinetic energy a vector", "speed from kinetic energy", "scalar"],
      prerequisites: [U1("kinematic-equations")],
      patternLabels: { "compute-ke": "Calculating kinetic energy", "speed-scaling": "How K changes with speed", "compare-objects": "Comparing kinetic energies", "speed-from-ke": "Speed from kinetic energy", "scalar-nature": "Kinetic energy as a scalar", "symbolic-ke": "Kinetic energy in symbols" },
    },
    {
      id: S("work-constant-force"),
      name: "Work done by a constant force",
      description: "Calculate the work done by a constant force with W = Fd cos θ, decide whether it is positive, negative or zero, and add the work of several forces.",
      difficulty: 2,
      keywords: ["work", "W = F d cos theta", "force times displacement", "negative work", "zero work", "perpendicular force does no work", "joule", "newton metre", "work at an angle", "holding something does no work", "net work"],
      prerequisites: [U1("vector-components")],
      patternLabels: { "parallel-force": "Force along the motion", "angled-force": "Force at an angle", "zero-work": "When no work is done", "work-backwards": "Working back to force or distance", "symbolic-work": "Work in symbols", "net-work-sum": "Adding the work of several forces", "units-meaning": "Units of work", "sign-of-work": "The sign of work" },
    },
    {
      id: S("work-by-forces"),
      name: "Work done by gravity, friction and contact forces",
      description: "Find the work done by gravity (which depends only on the change in height), by kinetic and static friction, and by normal and tension forces, and total the work on an object.",
      difficulty: 3,
      keywords: ["work done by gravity", "mgh", "work done by friction", "friction does negative work", "normal force does no work", "work on an incline", "path independence", "static friction work", "total work"],
      prerequisites: [S("work-constant-force")],
      patternLabels: { "gravity-work": "Work done by gravity", "friction-work": "Work done by kinetic friction", "incline-gravity": "Gravity's work on a slope", "normal-force-work": "Work done by a normal force", "total-work": "Total work from several forces", "static-friction": "Work done by static friction" },
    },
    {
      id: S("work-graphs"),
      name: "Work from force–position graphs",
      description: "Find the work done by a changing force as the signed area under a force–position graph, including the triangle under a spring's force line.",
      difficulty: 3,
      keywords: ["force position graph", "force displacement graph", "area under the graph is work", "variable force", "negative area", "spring force graph", "triangle area", "trapezoid"],
      prerequisites: [S("work-constant-force")],
      patternLabels: { "area-rectangle": "Rectangles: constant force", "area-shapes": "Triangles and trapezoids", "negative-area": "Area below the axis", "spring-triangle": "The area under a spring's force line", "graph-concept": "What the area means", "compare-areas": "Comparing two graphs", "graph-to-speed": "From a graph to a speed" },
    },
    {
      id: S("work-energy-theorem"),
      name: "The work–energy theorem",
      description: "Use net work = change in kinetic energy to find speeds, forces and stopping distances, and explain why equal changes in speed need unequal amounts of work.",
      difficulty: 3,
      keywords: ["work energy theorem", "net work equals change in kinetic energy", "stopping distance", "braking distance", "average force from energy", "W net = delta K", "skid distance"],
      prerequisites: [S("kinetic-energy"), S("work-constant-force")],
      patternLabels: { "net-work-from-speeds": "Net work from two speeds", "speed-from-net-work": "Speed after net work", "multi-force": "Several forces at once", "equal-speed-steps": "Equal steps in speed", concept: "Reasoning with the theorem", symbolic: "Results in symbols", "stopping-distance": "Stopping distance", "stopping-scaling": "How stopping distance scales", "force-from-energy": "Average force from energy" },
    },
    {
      id: S("gravitational-pe"),
      name: "Gravitational potential energy",
      description: "Calculate changes in the gravitational potential energy of an object–Earth system near Earth's surface, relate them to the work done by gravity, and recognise that the zero level is a free choice.",
      difficulty: 2,
      keywords: ["gravitational potential energy", "mgh", "U = m g y", "reference level", "zero of potential energy", "negative potential energy", "change in potential energy", "work done by gravity equals minus delta U"],
      prerequisites: [S("work-by-forces")],
      patternLabels: { "compute-delta-u": "Calculating ΔU", "reference-level": "Choosing the zero level", "work-and-delta-u": "Gravity's work and ΔU", "path-independence": "Only height matters", "height-from-u": "Height from ΔU", "compare-u": "Comparing changes", "incline-height": "Height gained on a ramp" },
    },
    {
      id: S("spring-pe"),
      name: "Spring forces and elastic potential energy",
      description: "Use Hooke's law to relate a spring's force and stretch, and calculate the elastic potential energy ½kx², including how it scales with stretch and how it changes between two stretches.",
      difficulty: 3,
      keywords: ["hooke's law", "F = kx", "spring constant", "elastic potential energy", "1/2 k x^2", "spring energy", "compression", "stretch", "N/m"],
      prerequisites: [S("work-graphs")],
      patternLabels: { "hooke-law": "Hooke's law", "compute-us": "Calculating elastic energy", "stretch-scaling": "How energy scales with stretch", "k-from-data": "Finding k from data", "stretch-from-energy": "Stretch from stored energy", "change-between-stretches": "Energy change between two stretches", "spring-facts": "Properties of spring energy", symbolic: "Spring energy in symbols" },
    },
    {
      id: S("energy-systems"),
      name: "Systems and energy bar charts",
      description: "Choose a system, decide which interactions are internal (potential energy) and which are external (work), and use energy bar charts to track energy stores and transfers.",
      difficulty: 3,
      keywords: ["system", "choosing a system", "internal and external forces", "energy bar chart", "LOL diagram", "isolated system", "external work", "potential energy belongs to a system", "double counting"],
      prerequisites: [S("gravitational-pe"), S("spring-pe")],
      patternLabels: { "choose-system": "Choosing a system", "bar-chart-read": "Reading a bar chart", "bar-chart-build": "Building a bar chart", "isolated-system": "Isolated systems", "external-work": "External work on a system", "double-counting": "Counting gravity once" },
    },
    {
      id: S("energy-conservation"),
      name: "Conservation of mechanical energy",
      description: "Apply conservation of mechanical energy to falls, ramps, pendulums, roller coasters and spring launches, and recognise when mass and path shape do and do not matter.",
      difficulty: 3,
      keywords: ["conservation of energy", "mechanical energy", "K + U = constant", "speed at the bottom", "sqrt(2gh)", "roller coaster", "pendulum", "spring launch", "frictionless track", "mass cancels"],
      prerequisites: [S("energy-systems"), S("work-energy-theorem")],
      patternLabels: { "speed-at-bottom": "Speed after a drop from rest", "height-from-speed": "Height from a speed", "mass-independence": "Does mass matter?", "path-independence": "Does the path matter?", "speed-at-height": "Speed at a new height", pendulum: "Pendulums", symbolic: "Results in symbols", "energy-split": "Sharing energy between K and U", "spring-launch": "Spring launches", "conservation-conditions": "When is mechanical energy conserved?" },
    },
    {
      id: S("nonconservative-work"),
      name: "Friction, internal energy and external work",
      description: "Account for energy converted into internal energy by friction and air resistance, and for work done by external forces, when mechanical energy is not conserved.",
      difficulty: 4,
      keywords: ["friction converts energy", "thermal energy", "internal energy", "energy lost to friction", "nonconservative force", "mechanical energy not conserved", "f d", "energy accounting"],
      prerequisites: [S("energy-conservation"), S("work-by-forces")],
      patternLabels: { "internal-from-friction": "Internal energy from friction", "energy-not-destroyed": "Where the energy goes", "energy-converted": "Energy converted on the way", "find-friction": "Finding the friction force", "speed-with-friction": "Speed with friction", "fraction-converted": "Fraction converted", "external-work-friction": "External work with friction", "friction-and-systems": "Friction and system choice", "friction-bar-chart": "Bar charts with friction", symbolic: "Energy with friction in symbols", "constant-speed-friction": "Constant speed with friction", "spring-and-friction": "Springs and friction together" },
    },
    {
      id: S("average-power"),
      name: "Average power",
      description: "Calculate average power as the rate at which work is done or energy is transferred, and use it to find energies and times.",
      difficulty: 2,
      keywords: ["power", "watt", "average power", "P = W / t", "rate of doing work", "kilowatt", "energy per second", "joules per second"],
      prerequisites: [S("work-constant-force")],
      patternLabels: { "compute-power": "Power from work and time", "compare-power": "Comparing powers", "lifting-power": "Power to lift", "energy-from-power": "Energy from power and time", units: "Units of power", "time-from-power": "Time from power", "power-from-delta-k": "Power to speed something up" },
    },
    {
      id: S("power-force-velocity"),
      name: "Power, force and velocity",
      description: "Use P = Fv (and P = Fv cos θ) for a force acting on a moving object, including the power needed to keep a vehicle moving at constant speed.",
      difficulty: 3,
      keywords: ["P = F v", "power force velocity", "constant speed power", "power against air resistance", "low gear", "engine power", "power on a hill"],
      prerequisites: [S("average-power")],
      patternLabels: { "constant-speed": "Power at constant speed", "compute-fv": "Calculating Fv", "speed-from-power": "Speed from power", "force-from-power": "Force from power", "lifting-at-speed": "Lifting at a steady speed", "drag-scaling": "Power and air resistance", symbolic: "Power in symbols", "angled-force": "Force at an angle to the motion", "hill-climb": "Climbing a hill", "gear-reasoning": "Trading force for speed" },
    },
  ],

  misconceptions: [
    { id: M("ke-linear-speed"), skillId: S("kinetic-energy"), title: "Treats kinetic energy as proportional to speed", description: "Expects doubling the speed to double the kinetic energy (or the stopping distance), forgets to square the speed, or forgets the square root when going from energy back to speed.", remediation: "Kinetic energy is ½mv²: the speed is squared. Doubling v multiplies K by 4; tripling it by 9. Going the other way, v = √(2K/m), so four times the energy only doubles the speed. Check every answer with a ratio: (new speed ÷ old speed)² should equal new K ÷ old K." },
    { id: M("ke-direction"), skillId: S("kinetic-energy"), title: "Gives kinetic energy a direction or a sign", description: "Says an object moving in the negative direction has negative kinetic energy, or that kinetic energy points along the velocity.", remediation: "Energy is a scalar. Because v is squared, ½mv² is positive whichever way the object moves and has no direction. Two identical cars at the same speed have the same kinetic energy even when they move in opposite directions." },
    { id: M("work-ignores-angle"), skillId: S("work-constant-force"), title: "Leaves out the angle, or uses the wrong trig function", description: "Multiplies the full force by the distance when the force is at an angle to the motion, uses sin θ where cos θ is needed, or uses a path length along a slope where a vertical height (or a component) belongs.", remediation: "Only the component of the force along the displacement does work: W = Fd cos θ, where θ is the angle between the force and the displacement. Sketch both arrows and find the angle between them before choosing sine or cosine. Check: a force almost along the motion should do almost Fd of work." },
    { id: M("work-without-displacement"), skillId: S("work-constant-force"), title: "Thinks a force does work just by being exerted", description: "Believes that holding, supporting or pushing something counts as work even when it does not move, or that a force perpendicular to the motion (a normal force, a string pulling toward the centre of a circle) does work.", remediation: "Work needs a displacement with a component along the force. Holding a weight still, pushing a wall, and any force perpendicular to the motion all do zero work, however tiring they feel. Ask: does the object move in the direction of this force, or against it? If neither, the work is zero." },
    { id: M("work-sign"), skillId: S("work-constant-force"), title: "Gets the sign of work wrong", description: "Assumes all work is positive, adds the magnitude of friction's work instead of subtracting it, reads the sign from the force's direction on the axes rather than relative to the displacement, or assumes friction always does negative work.", remediation: "The sign comes from cos θ: positive when the force has a component along the displacement, negative when it has a component against it, zero when perpendicular. Kinetic friction on a sliding object does negative work, but static friction can do positive work (it is what speeds up a crate on an accelerating truck). Keep the sign when you add works." },
    { id: M("gravity-path-length"), skillId: S("work-by-forces"), title: "Uses the path length for gravity's work or potential energy", description: "Multiplies mg by the distance travelled along a ramp, slide or staircase, or thinks a longer route between the same two heights involves more work by gravity.", remediation: "Gravity is a constant vertical force, so only the vertical part of the displacement counts: W_g = −mgΔy, whatever the route. A long gentle ramp and a vertical lift to the same height involve exactly the same work by gravity and the same change in gravitational potential energy." },
    { id: M("graph-height-or-slope"), skillId: S("work-graphs"), title: "Reads work from the height or slope of a force–position graph", description: "Gives the force at the end of an interval, the slope, or the largest force times the whole distance, instead of the area under the graph.", remediation: "On a force–position graph, work is the area between the line and the position axis. Check the units: height is newtons, slope is newtons per metre, and only an area has units of N·m = J. For a changing force, split the area into rectangles and triangles." },
    { id: M("net-work-single-force"), skillId: S("work-energy-theorem"), title: "Uses the work of one force instead of the net work", description: "Sets the change in kinetic energy equal to the work done by the applied force alone, ignoring friction or other forces, or says the net work on an object moving at constant speed is positive because someone is pushing it.", remediation: "The work–energy theorem uses the net work: the sum of the works of every force, with signs. List every force, find each one's work, and add. At constant speed the kinetic energy is unchanged, so the net work is zero even while individual forces do work." },
    { id: M("delta-v-squared"), skillId: S("work-energy-theorem"), title: "Uses ½m(Δv)² for a change in kinetic energy", description: "Computes the change in kinetic energy from the change in speed squared, or adds a speed gained from energy directly onto an existing speed.", remediation: "Kinetic energy is not linear in speed, so ΔK = ½m(v_f² − v_i²), not ½m(v_f − v_i)². Work and energy add; speeds do not. Convert every speed to an energy, do the energy bookkeeping, and only convert back to a speed at the end." },
    { id: M("pe-reference-absolute"), skillId: S("gravitational-pe"), title: "Thinks potential energy has one true value", description: "Believes heights must be measured from the ground, that a negative potential energy is impossible or wrong, or that changing the zero level changes ΔU and the predicted motion.", remediation: "The zero of gravitational potential energy is a free choice, like the origin of a coordinate system. Moving it adds the same constant to every value of U, so changes in U, and everything that depends on them, are unaffected. Below the chosen zero, U is negative, and that is fine." },
    { id: M("work-equals-delta-u"), skillId: S("gravitational-pe"), title: "Equates gravity's work with the change in potential energy", description: "Drops the minus sign in W_g = −ΔU, so reports a positive ΔU for a falling object or a negative work by gravity for a falling object.", remediation: "When gravity does positive work (the object falls), the system's potential energy decreases; when gravity does negative work (the object rises), it increases. They are equal in size and opposite in sign: W_g = −ΔU_g." },
    { id: M("spring-full-force"), skillId: S("spring-pe"), title: "Treats a spring's force as constant (drops the ½)", description: "Multiplies the maximum spring force by the stretch (kx · x = kx²) to get the stored energy or the work done, leaving out the ½.", remediation: "A spring's force grows steadily from zero to kx as it is stretched, so on average it is only half of kx. The area under the force–stretch line is a triangle: ½ × x × kx = ½kx²." },
    { id: M("spring-x-squared"), skillId: S("spring-pe"), title: "Mishandles the square in ½kx²", description: "Treats elastic energy as proportional to the stretch (doubling the stretch doubles the energy), forgets to square x, forgets the square root when finding x from an energy, or computes the energy change between two stretches as ½k(x₂ − x₁)².", remediation: "U_s = ½kx² is proportional to the square of the stretch measured from the natural length: double the stretch, four times the energy. For a change between two stretches, find U_s at each and subtract: ½k(x₂² − x₁²). To find x from an energy, solve for x² first, then take the square root." },
    { id: M("pe-system-confusion"), skillId: S("energy-systems"), title: "Confuses potential energy with the system it belongs to", description: "Gives potential energy to a single object (\"the ball's potential energy\" with Earth outside the system), or counts gravity twice, both as potential energy and as work, or treats an internal interaction as external work.", remediation: "Potential energy belongs to a pair of interacting objects that are both inside the system. If Earth is in the system, gravity is internal and appears only as U_g. If Earth is outside, gravity is external and appears only as work. Decide the system first, then count each interaction exactly once." },
    { id: M("bar-chart-unbalanced"), skillId: S("energy-systems"), title: "Draws energy bar charts that do not balance", description: "Lets the total energy of a system change without any external work, copies an energy store into another instead of transferring it, or leaves the external work bar out of the balance.", remediation: "An energy bar chart is an equation: initial bars + external work = final bars (+ any internal energy produced). Energy moves between stores; it is not duplicated. If no external work is done, the total height of the bars must be the same before and after." },
    { id: M("speed-path-mass"), skillId: S("energy-conservation"), title: "Thinks speed after a frictionless drop depends on mass or path", description: "Expects heavier objects to reach the bottom of a frictionless slide faster, or the steepest, shortest or lowest-dipping track to produce the greatest final speed, or a pendulum to rise higher or lower than it started.", remediation: "With only gravity doing work, mgΔh = ½mv²: the mass cancels, and only the change in height appears. Any frictionless path between the same two heights gives the same final speed (though not the same travel time). Mass does matter when the energy comes from something else, such as a spring." },
    { id: M("energy-destroyed"), skillId: S("nonconservative-work"), title: "Thinks friction destroys energy", description: "Says energy is used up, lost or destroyed by friction or in a collision, and lets the total energy of an isolated system decrease.", remediation: "Energy is never destroyed. Friction converts mechanical energy into internal (thermal) energy of the surfaces, which warm up. \"Lost\" only means \"no longer available as kinetic or potential energy\". Show the converted energy as a ΔE_int bar." },
    { id: M("ignores-friction-energy"), skillId: S("nonconservative-work"), title: "Assumes mechanical energy is conserved when friction acts", description: "Uses K + U = constant even though friction or air resistance acts, or thinks constant speed means no energy is converted.", remediation: "Mechanical energy is conserved only if no friction-like forces act and no external work is done. Otherwise write K_i + U_i + W_ext = K_f + U_f + ΔE_int, with ΔE_int = f_k d for kinetic friction. A box sliding at constant speed down a rough ramp converts all its lost potential energy into internal energy." },
    { id: M("power-is-energy"), skillId: S("average-power"), title: "Confuses power with work or energy", description: "Reports the work done when power is asked, multiplies by the time instead of dividing, or thinks the machine that does the most work (or works for longest) is the most powerful.", remediation: "Power is a rate: energy transferred per second, P = W/Δt, in watts (J/s). Doing the same job twice as fast takes twice the power but the same work. Check units: joules are an amount; watts are joules per second." },
    { id: M("constant-speed-no-power"), skillId: S("power-force-velocity"), title: "Thinks no power is needed at constant speed", description: "Reasons that a car, cyclist or elevator moving at constant velocity needs no power because the net force is zero or the kinetic energy is not changing.", remediation: "Zero net force means the driving force exactly balances the resistive forces (or gravity); it is not zero. That driving force acts on a moving object, so it delivers power P = Fv, which goes into internal energy (against friction and drag) or potential energy (when climbing)." },
  ],

  units: [
    {
      id: UNIT,
      number: 3,
      title: "Work, Energy, and Power",
      description: "Energy as a way to analyse motion: kinetic energy, work done by constant and changing forces, the work–energy theorem, gravitational and elastic potential energy, choosing systems and energy bar charts, conservation of mechanical energy, energy converted by friction, and power.",
      topics: [
        // ───────────────────────── Topic 1 ─────────────────────────
        {
          id: T("kinetic-energy-work"),
          title: "Kinetic energy and work",
          description: "The energy of motion, and how a force transfers energy to or from an object by doing work.",
          objectives: [
            { id: "physics-1.o.u3.a", code: "PHYS-3.A", description: "Calculate translational kinetic energy, and calculate and interpret the work done on an object by a constant force, including its sign.", skillIds: [S("kinetic-energy"), S("work-constant-force")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u3.kinetic-energy",
              title: "Kinetic energy",
              summary: "What energy is for, the formula for the energy of motion, and why speed matters so much more than mass.",
              estMinutes: 12,
              skillIds: [S("kinetic-energy")],
              blocks: [
                { type: "text", md: r`So far you have analysed motion with forces and accelerations: Newton's laws tell you what happens from one instant to the next. This unit introduces a second way of thinking that is often much faster: **energy**.

Energy is a number you can calculate for a system that stays the same in total, however complicated the motion inside it, as long as you account for every way it can change form or cross the system boundary. Instead of following a roller-coaster car through every curve, you compare the start and the finish.` },
                { type: "definition", term: "Kinetic energy", md: r`The energy an object has because it is moving. For an object of mass $m$ moving at speed $v$ it is $K = \tfrac12 mv^2$. It is measured in **joules** (J): $1\,\text{J} = 1\,\text{kg·m}^2/\text{s}^2$.` },
                { type: "formula", latex: r`K = \tfrac12 mv^2`, caption: "Translational kinetic energy. m in kg, v in m/s, K in joules." },
                { type: "callout", tone: "key", title: "Kinetic energy is a scalar", md: r`Kinetic energy has a size but **no direction**, and because the speed is squared it is **never negative**. A car moving east at $20\,\text{m/s}$ and an identical car moving west at $20\,\text{m/s}$ have exactly the same kinetic energy. Only the speed matters, not the velocity's direction.` },
                {
                  type: "worked_example",
                  title: "A scooter and a delivery van",
                  problem: r`A $90\,\text{kg}$ rider-and-scooter moves at $12\,\text{m/s}$. A $2400\,\text{kg}$ delivery van crawls along at $3.0\,\text{m/s}$. Which has more kinetic energy?`,
                  steps: [
                    { title: "Scooter", md: r`$K = \tfrac12(90)(12)^2 = 45 \times 144 = 6480\,\text{J}$.` },
                    { title: "Van", md: r`$K = \tfrac12(2400)(3.0)^2 = 1200 \times 9 = 10\,800\,\text{J}$.` },
                    { title: "Compare", md: r`The van has more, but not by as much as its mass suggests: it is about 27 times heavier, yet has less than twice the kinetic energy, because the scooter is 4 times faster and speed counts squared ($4^2 = 16$).` },
                  ],
                  answer: r`Van: $10.8\,\text{kJ}$; scooter: $6.5\,\text{kJ}$`,
                },
                { type: "check", questionId: Q("ke-1"), lead: "Square the speed first." },
                { type: "text", md: r`## Speed counts twice

Because $K \propto v^2$, small changes in speed make big changes in energy:

| Speed | $v$ | $2v$ | $3v$ | $4v$ |
|---|---|---|---|---|
| Kinetic energy | $K$ | $4K$ | $9K$ | $16K$ |

Mass enters only to the first power: double the mass at the same speed and the kinetic energy doubles.` },
                { type: "callout", tone: "warning", title: "Doubling the speed does not double the energy", md: r`It is tempting to think "twice as fast, twice the energy". It is four times. This is why a car crash at $100\,\text{km/h}$ is far more destructive than one at $50\,\text{km/h}$, and why braking distances grow so quickly with speed.

Going the other way, you need a square root: to get the speed from a kinetic energy, $v = \sqrt{2K/m}$. Four times the energy gives only twice the speed.` },
                { type: "check", questionId: Q("ke-2"), lead: "Reason with the ratio, not the numbers." },
                { type: "tutor_prompt", prompts: ["Why is kinetic energy proportional to v² and not v?", "Can kinetic energy ever be negative?", "How can a heavy, slow truck have less kinetic energy than a light, fast car?"] },
                { type: "summary", points: [r`Kinetic energy is the energy of motion: $K = \tfrac12 mv^2$, in joules.`, "It is a scalar: never negative, no direction; it depends on speed, not on which way the object moves.", "Doubling the speed quadruples the kinetic energy; doubling the mass doubles it.", r`To find speed from kinetic energy, $v = \sqrt{2K/m}$: remember the square root.`] },
              ],
            },
            {
              id: "physics-1.l.u3.work",
              title: "Work done by a constant force",
              summary: "How a force transfers energy by acting along a displacement, why the angle matters, and when work is positive, negative or zero.",
              estMinutes: 15,
              skillIds: [S("work-constant-force")],
              blocks: [
                { type: "text", md: r`How does an object gain or lose kinetic energy? A force has to act on it **while it moves**. Physics calls this energy transfer **work**. The word has a precise meaning that is narrower than in everyday speech: holding a heavy bag still for an hour is exhausting, but it does no work on the bag.` },
                { type: "definition", term: "Work (constant force)", md: r`The energy transferred to or from an object by a force acting on it as it moves. For a constant force of magnitude $F$ acting while the object undergoes a displacement of magnitude $d$, with angle $\theta$ between the force and the displacement, $W = Fd\cos\theta$. Work is a scalar, measured in joules ($1\,\text{J} = 1\,\text{N·m}$).` },
                { type: "formula", latex: r`W = Fd\cos\theta`, caption: "θ is the angle between the force and the displacement, not necessarily the angle to the horizontal." },
                { type: "text", md: r`## Why the cosine?

Only the part of the force **along** the displacement transfers energy. If you pull a sled with a rope at an angle, split the pull into components: the part along the ground, $F\cos\theta$, speeds the sled up; the upward part, $F\sin\theta$, just lightens the load on the snow and does no work. So $W = (F\cos\theta)\,d$.` },
                {
                  type: "worked_example",
                  title: "Pulling a sled at an angle",
                  problem: r`A child pulls a sled $15\,\text{m}$ across level snow with a rope tension of $40\,\text{N}$, the rope at $30^\circ$ above the horizontal. How much work does the rope do?`,
                  steps: [
                    { title: "Find the angle between force and displacement", md: r`The sled moves horizontally and the rope is $30^\circ$ above horizontal, so $\theta = 30^\circ$.` },
                    { title: "Apply the formula", md: r`$W = Fd\cos\theta = (40\,\text{N})(15\,\text{m})\cos 30^\circ = 600 \times 0.866 \approx 520\,\text{J}$.` },
                    { title: "Sense check", md: r`A horizontal rope would have done $600\,\text{J}$. The angled rope does a little less, because part of its pull is "wasted" lifting rather than dragging.` },
                  ],
                  answer: r`About $520\,\text{J}$`,
                },
                { type: "check", questionId: Q("wf-1") },
                { type: "text", md: r`## Positive, negative and zero work

The sign of $\cos\theta$ decides the sign of the work:

| Angle between $\vec F$ and $\vec d$ | $\cos\theta$ | Work | Effect on the object |
|---|---|---|---|
| $0^\circ \le \theta < 90^\circ$ | positive | positive | the force adds energy (helps the motion) |
| $\theta = 90^\circ$ | zero | zero | no energy transferred |
| $90^\circ < \theta \le 180^\circ$ | negative | negative | the force removes energy (opposes the motion) |

Examples: gravity does positive work on a falling ball and negative work on a rising one; kinetic friction on a sliding box does negative work; the floor's normal force on a box sliding across it does zero work.` },
                { type: "callout", tone: "warning", title: "No displacement, or a perpendicular force: no work", md: r`Two situations always give zero work, however much effort is involved:

- **The object doesn't move.** Holding a barbell overhead, pushing on a wall: $d = 0$.
- **The force is perpendicular to the motion.** A waiter's upward force on a tray carried across a room, the normal force on something sliding along a floor, the string pulling a ball around a circle.

Effort, force and time are not work. Work needs a displacement with a component **along** the force.` },
                { type: "callout", tone: "tip", title: "The sign of work is not the sign of the force", md: r`Do not look at whether a force points in the "negative direction" of your axes. A leftward force on an object moving left does **positive** work. Compare the force with the **displacement**, every time.` },
                { type: "check", questionId: Q("wf-2"), lead: "Find the angle between the force and the motion first." },
                { type: "text", md: r`## Adding up work

When several forces act, each does its own work. The **net work** (total work) is the sum of the individual works, with their signs. It is also equal to the work done by the net force. For a box pulled with $30\,\text{N}$ against $12\,\text{N}$ of friction over $6.0\,\text{m}$: $W_{\text{net}} = (+180\,\text{J}) + (-72\,\text{J}) = 108\,\text{J} = (18\,\text{N})(6.0\,\text{m})$.` },
                { type: "note_prompt", prompt: "List three situations in your day where a force acts but does no work, and explain why for each.", suggestedTitle: "When forces do no work", starter: "**Work** = F d cos θ (needs a displacement along the force)\n\n1. \n2. \n3. \n\nLinks: [[Work done by a constant force]]" },
                { type: "summary", points: [r`Work is energy transferred by a force acting along a displacement: $W = Fd\cos\theta$, in joules.`, "θ is the angle between the force and the displacement; only the component of the force along the motion does work.", "Work is positive when the force helps the motion, negative when it opposes it, and zero when the force is perpendicular or nothing moves.", "Net work is the sum of every force's work, with signs."] },
              ],
            },
          ],
        },
        // ───────────────────────── Topic 2 ─────────────────────────
        {
          id: T("work-forces-graphs"),
          title: "Work by gravity, friction and springs",
          description: "The work done by the forces you meet most often, and how to find the work done by a force that changes, including a spring's.",
          objectives: [
            { id: "physics-1.o.u3.b", code: "PHYS-3.B", description: "Determine the work done by gravity, friction, normal and tension forces, and determine the work done by a changing force from the area under a force–position graph.", skillIds: [S("work-by-forces"), S("work-graphs")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u3.work-common-forces",
              title: "Work done by gravity, friction and contact forces",
              summary: "Gravity cares only about height; kinetic friction takes energy away; normal forces usually do nothing; static friction can surprise you.",
              estMinutes: 14,
              skillIds: [S("work-by-forces")],
              blocks: [
                { type: "text", md: r`Most problems involve the same handful of forces. Each one has a simple rule for the work it does, and knowing them saves a lot of time.` },
                { type: "text", md: r`## Gravity: only the change in height matters

Near Earth's surface, gravity is a constant force $mg$ straight down. When an object moves, only the **vertical** part of its displacement is along that force, so:

- falling a height $h$: $W_g = +mgh$;
- rising a height $h$: $W_g = -mgh$;
- moving horizontally: $W_g = 0$.

The route does not matter. A ball carried up a winding staircase and a ball lifted straight up to the same height have exactly the same work done on them by gravity.` },
                { type: "formula", latex: r`W_g = -mg\,\Delta y`, caption: "Work done by gravity, with Δy the change in height (up positive). Negative when the object rises." },
                {
                  type: "worked_example",
                  title: "Down a ski slope",
                  problem: r`A $55\,\text{kg}$ skier glides $120\,\text{m}$ down a slope inclined at $12^\circ$ ($\sin 12^\circ = 0.208$). How much work does gravity do on her?`,
                  steps: [
                    { title: "Find the vertical drop", md: r`$h = (120\,\text{m})\sin 12^\circ = 120 \times 0.208 \approx 25\,\text{m}$.` },
                    { title: "Gravity's work", md: r`$W_g = mgh = (55)(9.8)(25) \approx 1.35 \times 10^4\,\text{J}$, positive because she moves down.` },
                    { title: "The other way", md: r`Equivalently, the component of gravity along the slope, $mg\sin 12^\circ$, acts over the full $120\,\text{m}$: $(55)(9.8)(0.208)(120)$ gives the same answer.` },
                  ],
                  answer: r`About $+1.3 \times 10^4\,\text{J}$`,
                },
                { type: "callout", tone: "warning", title: "Use the height, not the path length", md: r`Multiplying $mg$ by the length of a ramp is the most common error with gravity. The $120\,\text{m}$ slope above drops only $25\,\text{m}$; using $120\,\text{m}$ would overstate gravity's work almost five times.` },
                { type: "check", questionId: Q("ws-1") },
                { type: "text", md: r`## Kinetic friction: always against the sliding

Kinetic friction on a sliding object points opposite to its motion relative to the surface, so it does **negative** work: $W_f = -f_k d$, with $f_k = \mu_k N$. On a level surface with no other vertical forces, $N = mg$.

## Normal force and tension

A normal force is perpendicular to the surface. If the object slides **along** the surface, the normal force does **no work**. A rope or cable does work $Td\cos\theta$ like any other force: positive when it pulls along the motion (lifting a bucket), negative when it pulls against it (lowering a load at constant speed).` },
                { type: "callout", tone: "info", title: "Static friction can do positive work", md: r`"Friction opposes motion" is not quite right: friction opposes **slipping** between two surfaces. A crate on the bed of an accelerating truck speeds up because static friction pushes it **forward**, and in the ground's frame the crate moves forward, so static friction does positive work on it. Always compare the force with the displacement rather than relying on a rule of thumb.` },
                { type: "check", questionId: Q("ws-2"), lead: "Kinetic friction: which way does it point?" },
                { type: "summary", points: [r`Gravity: $W_g = -mg\,\Delta y$. Only the change in height matters, never the path length.`, r`Kinetic friction does negative work on a sliding object: $W_f = -f_k d$.`, "A normal force on an object sliding along a surface does no work.", "Tension does positive or negative work depending on whether it pulls along or against the motion.", "Static friction can do positive work; compare each force with the displacement."] },
              ],
            },
            {
              id: "physics-1.l.u3.work-graphs",
              title: "Work from force–position graphs and springs",
              summary: "When a force changes as an object moves, the work is the area under the force–position graph. A spring's straight-line graph gives a triangle.",
              estMinutes: 14,
              skillIds: [S("work-graphs"), S("spring-pe")],
              blocks: [
                { type: "text", md: r`$W = Fd\cos\theta$ assumes the force stays the same throughout the displacement. Many forces do not: a spring pushes harder the more it is compressed, and a car engine's force changes as the car speeds up. How do you find the work then?` },
                { type: "callout", tone: "key", title: "Work is the area under a force–position graph", md: r`Plot the force component along the motion on the vertical axis and position on the horizontal axis. For a constant force, the area of the rectangle under the line is $F \times \Delta x$, exactly the work. For a changing force, imagine slicing the area into thin strips: each strip is a small force times a small displacement, a small piece of work. Add them up and you get the **area under the graph**.

- Area **above** the position axis: positive work.
- Area **below** the axis: negative work (the force opposes the motion).` },
                {
                  type: "worked_example",
                  title: "A force that ramps up, then levels off",
                  problem: r`The force on a cart (along its motion) rises steadily from $0$ at $x = 0$ to $10\,\text{N}$ at $x = 2.0\,\text{m}$, stays at $10\,\text{N}$ until $x = 5.0\,\text{m}$, then drops steadily to $0$ at $x = 6.0\,\text{m}$. How much work does it do?`,
                  steps: [
                    { title: "Split the area into shapes", md: r`Triangle ($0$–$2\,\text{m}$), rectangle ($2$–$5\,\text{m}$), triangle ($5$–$6\,\text{m}$).` },
                    { title: "Add the areas", md: r`$\tfrac12(2.0)(10) + (3.0)(10) + \tfrac12(1.0)(10) = 10 + 30 + 5 = 45\,\text{J}$.` },
                    { title: "Sense check", md: r`If the force had been $10\,\text{N}$ for the whole $6\,\text{m}$, the work would be $60\,\text{J}$. It is less, because the force was smaller near the ends.` },
                  ],
                  answer: r`$45\,\text{J}$`,
                },
                { type: "check", questionId: Q("wg-1"), lead: "Split the area into simple shapes." },
                { type: "text", md: r`## Springs and Hooke's law

An ideal spring pushes or pulls back with a force proportional to how far it is stretched or compressed from its natural length:` },
                { type: "formula", latex: r`F_s = kx`, caption: "Hooke's law (magnitude). x is the stretch or compression from the natural length; k is the spring constant in N/m. The force points back toward the natural length." },
                { type: "text", md: r`To stretch a spring slowly you must pull with a force equal to $kx$, so your force grows steadily from $0$ to $kx$. Its graph against stretch is a straight line through the origin with slope $k$, and the area underneath is a **triangle**:

$$W = \tfrac12 \times x \times kx = \tfrac12 kx^2$$

That is the work you do on the spring, and (as the next topics show) the energy the spring stores.` },
                { type: "callout", tone: "warning", title: "Don't use the final force for the whole stretch", md: r`The spring's force is $kx$ only at the very end. Multiplying $kx$ by $x$ uses the largest force for the whole distance and doubles the answer. The triangle's ½ is essential.

For a stretch from $x_1$ to $x_2$, the area is a trapezoid: $W = \tfrac12 k(x_2^2 - x_1^2)$, **not** $\tfrac12 k(x_2 - x_1)^2$.` },
                { type: "check", questionId: Q("wg-2") },
                { type: "summary", points: ["The work done by a changing force is the area under its force–position graph.", "Area above the axis is positive work; area below it is negative work.", r`Hooke's law: a spring's force has size $kx$ and points back toward its natural length.`, r`The work to stretch a spring from its natural length by $x$ is the triangle area $\tfrac12 kx^2$; from $x_1$ to $x_2$ it is $\tfrac12 k(x_2^2 - x_1^2)$.`] },
              ],
            },
          ],
        },
        // ───────────────────────── Topic 3 ─────────────────────────
        {
          id: T("work-energy-theorem"),
          title: "The work–energy theorem",
          description: "Net work changes kinetic energy: a shortcut from forces and distances straight to speeds.",
          objectives: [
            { id: "physics-1.o.u3.c", code: "PHYS-3.C", description: "Apply the work–energy theorem to relate the net work done on an object to its change in kinetic energy, including stopping distances and average forces.", skillIds: [S("work-energy-theorem")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u3.work-energy-theorem",
              title: "Net work changes kinetic energy",
              summary: "The work–energy theorem, how to use it for speeds, forces and stopping distances, and two traps: using one force instead of the net work, and subtracting speeds.",
              estMinutes: 16,
              skillIds: [S("work-energy-theorem")],
              blocks: [
                { type: "text", md: r`The last two topics introduced kinetic energy and work separately. Here is the link between them, and it is one of the most useful results in mechanics.` },
                { type: "formula", latex: r`W_{\text{net}} = \Delta K = \tfrac12 mv_f^2 - \tfrac12 mv_i^2`, caption: "The work–energy theorem: the net work done on an object equals its change in kinetic energy." },
                { type: "text", md: r`## Where it comes from

Take a constant net force $F$ pushing an object of mass $m$ a distance $d$ along its motion. Newton's second law gives $a = F/m$, and the constant-acceleration equation $v_f^2 = v_i^2 + 2ad$ becomes

$$v_f^2 = v_i^2 + \frac{2Fd}{m} \quad\Longrightarrow\quad Fd = \tfrac12 mv_f^2 - \tfrac12 mv_i^2.$$

The left side is the net work; the right side is the change in kinetic energy. The result also holds for forces that change, as long as you use the total work.` },
                { type: "callout", tone: "key", title: "What the sign of the net work tells you", md: r`- $W_{\text{net}} > 0$: the object speeds up.
- $W_{\text{net}} < 0$: it slows down.
- $W_{\text{net}} = 0$: its speed is unchanged (even if individual forces are doing plenty of work, as when you push a box at constant speed against friction).` },
                {
                  type: "worked_example",
                  title: "Speed after a push with friction",
                  problem: r`A $4.0\,\text{kg}$ box starts from rest. You push it $3.0\,\text{m}$ across a floor with a horizontal $25\,\text{N}$ force while $9.0\,\text{N}$ of kinetic friction acts. How fast is it moving at the end?`,
                  steps: [
                    { title: "Work of each force", md: r`Push: $(25)(3.0) = +75\,\text{J}$. Friction: $-(9.0)(3.0) = -27\,\text{J}$. Gravity and the normal force are perpendicular to the motion: $0$.` },
                    { title: "Net work", md: r`$W_{\text{net}} = 75 - 27 = 48\,\text{J}$.` },
                    { title: "Work–energy theorem", md: r`$48\,\text{J} = \tfrac12(4.0)v_f^2 - 0$, so $v_f^2 = 24$ and $v_f \approx 4.9\,\text{m/s}$.` },
                  ],
                  answer: r`About $4.9\,\text{m/s}$`,
                },
                { type: "callout", tone: "warning", title: "Use the net work, not one force's work", md: r`If you had used only the push ($75\,\text{J}$), you would have predicted $6.1\,\text{m/s}$, too fast. The theorem is about the **total** work from **every** force. Make a list of forces before you start.` },
                { type: "check", questionId: Q("wet-1"), lead: "Find K at each speed, then subtract." },
                { type: "callout", tone: "warning", title: "Energies add; speeds don't", md: r`$\Delta K$ is $\tfrac12 m(v_f^2 - v_i^2)$, which is **not** $\tfrac12 m(v_f - v_i)^2$. Going from $10$ to $20\,\text{m/s}$ takes three times the work of going from $0$ to $10\,\text{m/s}$, even though both steps add $10\,\text{m/s}$. Always convert speeds to energies, do the bookkeeping with energies, and convert back at the end.` },
                {
                  type: "worked_example",
                  title: "Braking distance",
                  problem: r`A $1500\,\text{kg}$ car moving at $18\,\text{m/s}$ brakes with a constant friction force of $9000\,\text{N}$. How far does it travel before stopping? How far would it go from $36\,\text{m/s}$?`,
                  steps: [
                    { title: "Net work removes all the kinetic energy", md: r`$-fd = 0 - \tfrac12 mv_i^2$, so $d = \dfrac{mv_i^2}{2f} = \dfrac{(1500)(18)^2}{2(9000)} = 27\,\text{m}$.` },
                    { title: "Double the speed", md: r`$d \propto v^2$, so from $36\,\text{m/s}$ the car needs $4 \times 27 = 108\,\text{m}$.` },
                  ],
                  answer: r`$27\,\text{m}$; $108\,\text{m}$ at twice the speed`,
                },
                { type: "check", questionId: Q("wet-2") },
                { type: "tutor_prompt", prompts: ["Why does doubling a car's speed quadruple its stopping distance?", "If the net work on an object is zero, can individual forces still do work on it?", "When should I use the work–energy theorem instead of Newton's second law?"] },
                { type: "summary", points: [r`Work–energy theorem: $W_{\text{net}} = \Delta K = \tfrac12 mv_f^2 - \tfrac12 mv_i^2$.`, "Use the net work: the sum of every force's work, with signs.", "Positive net work speeds an object up; negative slows it down; zero leaves its speed unchanged.", "Do the bookkeeping in energies, not speeds; ΔK is not ½m(Δv)².", "With a constant stopping force, stopping distance is proportional to v²."] },
              ],
            },
          ],
        },
        // ───────────────────────── Topic 4 ─────────────────────────
        {
          id: T("potential-energy"),
          title: "Potential energy",
          description: "Energy stored in the arrangement of a system: an object's height above Earth, or a spring's stretch.",
          objectives: [
            { id: "physics-1.o.u3.d", code: "PHYS-3.D", description: "Calculate changes in gravitational potential energy near Earth's surface and elastic potential energy of springs, and relate each to the work done by the corresponding conservative force.", skillIds: [S("gravitational-pe"), S("spring-pe")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u3.gravitational-pe",
              title: "Gravitational potential energy",
              summary: "Energy stored in the separation of an object and Earth: mgΔy, the freedom to choose the zero, and the link to gravity's work.",
              estMinutes: 13,
              skillIds: [S("gravitational-pe")],
              blocks: [
                { type: "text", md: r`Lift a book onto a shelf and you do work on it, yet it ends up at rest: its kinetic energy did not change. Where did the energy go? It is stored in the **book–Earth system**, ready to come back as kinetic energy if the book falls. Energy stored in the arrangement of a system is called **potential energy**.` },
                { type: "definition", term: "Gravitational potential energy", md: r`Energy stored in an object–Earth system because of the object's height. Near Earth's surface, $U_g = mgy$, where $y$ is the height above a chosen zero level. Only **changes** in $U_g$ have physical meaning: $\Delta U_g = mg\,\Delta y$.` },
                { type: "formula", latex: r`\Delta U_g = mg\,\Delta y`, caption: "Change in gravitational potential energy near Earth's surface (up positive)." },
                { type: "callout", tone: "key", title: "Gravity's work and potential energy are two views of the same thing", md: r`When an object rises, gravity does negative work and the potential energy increases; when it falls, gravity does positive work and the potential energy decreases:

$$W_g = -\Delta U_g$$

Because gravity's work depends only on the change in height, so does $\Delta U_g$. A force with this path-independent property is called **conservative**, and only conservative forces have a potential energy.` },
                {
                  type: "worked_example",
                  title: "A trip up a ski lift",
                  problem: r`A $70\,\text{kg}$ snowboarder rides a chairlift from a base station at $1450\,\text{m}$ altitude to a summit at $1830\,\text{m}$. Find the change in gravitational potential energy of the snowboarder–Earth system, and the work done by gravity on the snowboarder.`,
                  steps: [
                    { title: "Change in height", md: r`$\Delta y = 1830 - 1450 = 380\,\text{m}$ (upward).` },
                    { title: "Change in potential energy", md: r`$\Delta U_g = mg\,\Delta y = (70)(9.8)(380) \approx 2.6 \times 10^5\,\text{J}$.` },
                    { title: "Gravity's work", md: r`$W_g = -\Delta U_g \approx -2.6 \times 10^5\,\text{J}$: gravity opposes the upward trip.` },
                  ],
                  answer: r`$\Delta U_g \approx +2.6 \times 10^5\,\text{J}$; $W_g \approx -2.6 \times 10^5\,\text{J}$`,
                },
                { type: "check", questionId: Q("gpe-1") },
                { type: "text", md: r`## Choosing the zero level

You may put $y = 0$ anywhere: the floor, a tabletop, the top of a cliff. Different choices give different values of $U_g$ at each point, and positions below your zero have **negative** potential energy. That is not a problem, because every choice gives the same **changes**, and only changes affect the motion. Pick whatever makes the arithmetic simplest, often the lowest point in the problem.` },
                { type: "callout", tone: "warning", title: "Potential energy belongs to the system, and the path doesn't matter", md: r`Strictly, it is the **object–Earth system** that has gravitational potential energy, not the object alone (this matters when you choose systems in the next topic). And since only $\Delta y$ appears, a long ramp and a vertical lift to the same height give the same $\Delta U_g$.` },
                { type: "check", questionId: Q("gpe-2"), lead: "Two observers, two zero levels." },
                { type: "summary", points: [r`Gravitational potential energy is stored in an object–Earth system: $\Delta U_g = mg\,\Delta y$.`, r`Gravity's work and the potential energy change are opposite: $W_g = -\Delta U_g$.`, "Only the change in height matters, never the path.", "The zero level is your choice; values of U change with it, but changes in U do not. Negative U just means below your zero."] },
              ],
            },
            {
              id: "physics-1.l.u3.elastic-pe",
              title: "Elastic potential energy",
              summary: "A stretched or compressed spring stores energy ½kx²; how that energy scales and how to find changes between two stretches.",
              estMinutes: 12,
              skillIds: [S("spring-pe")],
              blocks: [
                { type: "text", md: r`A drawn bow, a compressed pogo stick and a stretched trampoline all store energy that can be turned into motion. For an ideal spring, the energy stored equals the work needed to stretch or compress it, which you found as a triangle area in the last topic.` },
                { type: "definition", term: "Elastic potential energy", md: r`Energy stored in a spring because it is stretched or compressed from its natural length. For an ideal spring with spring constant $k$ and stretch or compression $x$, $U_s = \tfrac12 kx^2$.` },
                { type: "formula", latex: r`U_s = \tfrac12 kx^2`, caption: "Elastic potential energy. x is measured from the spring's natural (relaxed) length." },
                { type: "callout", tone: "key", title: "Three things to notice", md: r`1. **Stretch or compression, same energy.** $x$ is squared, so $\pm x$ give the same $U_s$, and $U_s$ is never negative.
2. **It grows with the square of the stretch.** Double $x$ and the energy is four times as large.
3. **The spring force is conservative.** The spring gives back all the energy it stores (ideally), so $W_s = -\Delta U_s$, just as $W_g = -\Delta U_g$.` },
                {
                  type: "worked_example",
                  title: "A pinball plunger",
                  problem: r`A pinball plunger spring has $k = 450\,\text{N/m}$. (a) How much energy does it store when pulled back $6.0\,\text{cm}$? (b) How much more energy is stored if it is pulled back to $8.0\,\text{cm}$?`,
                  steps: [
                    { title: "(a) Convert to metres and apply the formula", md: r`$U_s = \tfrac12(450)(0.060)^2 = 225 \times 0.0036 = 0.81\,\text{J}$.` },
                    { title: "(b) Energy at the new stretch", md: r`$U_s = \tfrac12(450)(0.080)^2 = 225 \times 0.0064 = 1.44\,\text{J}$.` },
                    { title: "Subtract", md: r`$\Delta U_s = 1.44 - 0.81 = 0.63\,\text{J}$. Note that $\tfrac12 k(0.020)^2 = 0.09\,\text{J}$ would be badly wrong: the extra $2\,\text{cm}$ is pulled against a force that is already large.` },
                  ],
                  answer: r`(a) $0.81\,\text{J}$; (b) $0.63\,\text{J}$ more`,
                },
                { type: "check", questionId: Q("spe-1"), lead: "Hooke's law first." },
                { type: "callout", tone: "warning", title: "Keep the ½ and square the stretch", md: r`Two errors account for most wrong answers here: writing $kx^2$ (forgetting that the force builds up from zero, so the triangle has a ½), and writing $\tfrac12 kx$ (forgetting to square). Check units: $\text{N/m} \times \text{m}^2 = \text{N·m} = \text{J}$.` },
                { type: "check", questionId: Q("spe-2") },
                { type: "summary", points: [r`Hooke's law: spring force has size $kx$, toward the natural length.`, r`Elastic potential energy: $U_s = \tfrac12 kx^2$, with $x$ from the natural length.`, "Compression and stretch store the same energy; U_s is never negative.", r`Energy scales with $x^2$; between two stretches, $\Delta U_s = \tfrac12 k(x_2^2 - x_1^2)$.`] },
              ],
            },
          ],
        },
        // ───────────────────────── Topic 5 ─────────────────────────
        {
          id: T("energy-conservation"),
          title: "Systems and conservation of energy",
          description: "Choose a system, track its energy with bar charts, and use conservation of mechanical energy to predict speeds and heights.",
          objectives: [
            { id: "physics-1.o.u3.e", code: "PHYS-3.E", description: "Choose a system, identify internal and external interactions, represent energy changes with bar charts, and apply conservation of mechanical energy to predict the motion of objects.", skillIds: [S("energy-systems"), S("energy-conservation")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u3.systems-bar-charts",
              title: "Systems and energy bar charts",
              summary: "Draw a boundary, decide what's inside, and keep an honest energy account with bar charts.",
              estMinutes: 15,
              skillIds: [S("energy-systems")],
              blocks: [
                { type: "text", md: r`Energy bookkeeping starts with one decision: **what is in the system?** Everything else follows from that choice.` },
                { type: "definition", term: "System", md: r`The object or group of objects you choose to analyse. Interactions between objects **inside** the system are internal; forces from objects **outside** it are external. A system on which no external work is done (and across whose boundary no other energy flows) is **isolated**: its total energy is constant.` },
                { type: "callout", tone: "key", title: "Potential energy or work, never both", md: r`An interaction between two objects can be counted in exactly one of two ways:

- **Both objects inside the system:** the interaction is internal and is represented by a **potential energy** ($U_g$ for object + Earth, $U_s$ for object + spring).
- **One object outside:** the interaction is external and is represented by the **work** it does on the system.

For a falling ball, "ball + Earth" uses $U_g$; "ball alone" uses $W_g$. Using both counts the same energy twice.` },
                { type: "text", md: r`## Energy bar charts

A bar chart is an energy equation drawn as columns. List the initial energy stores, any external work, and the final stores (plus any energy converted into internal energy, which you'll meet in the next topic):

$$K_i + U_{g,i} + U_{s,i} + W_{\text{ext}} = K_f + U_{g,f} + U_{s,f} + \Delta E_{\text{int}}$$

| $K_i$ | $U_{g,i}$ | $U_{s,i}$ | $W_{\text{ext}}$ | $K_f$ | $U_{g,f}$ | $U_{s,f}$ | $\Delta E_{\text{int}}$ |
|---|---|---|---|---|---|---|---|
| 0 | 5 | 0 | 0 | 3 | 2 | 0 | 0 |

This chart shows a cart–Earth system rolling down a frictionless track: 5 units of $U_g$ at the top; 2 left partway down, so 3 have become kinetic. Left side total 5 = right side total 5.` },
                {
                  type: "worked_example",
                  title: "Lifting a box: two systems, one answer",
                  problem: r`You lift a $3.0\,\text{kg}$ box $2.0\,\text{m}$ at constant speed. Analyse it (a) with the system "box alone" and (b) with "box + Earth".`,
                  steps: [
                    { title: "(a) Box alone", md: r`Gravity is external: $W_g = -(3.0)(9.8)(2.0) = -58.8\,\text{J}$. Your hand does $W_{\text{hand}}$. The speed is constant, so $\Delta K = 0 = W_{\text{hand}} + W_g$, giving $W_{\text{hand}} = +58.8\,\text{J}$. This system has no potential energy.` },
                    { title: "(b) Box + Earth", md: r`Gravity is internal, represented by $U_g$. Your hand is the only external force: $W_{\text{hand}} = \Delta K + \Delta U_g = 0 + 58.8\,\text{J}$.` },
                    { title: "Compare", md: r`Same physical answer, different bookkeeping. In (a) the energy you add is taken away again by gravity's negative work; in (b) it is stored as $U_g$.` },
                  ],
                  answer: r`$W_{\text{hand}} = 58.8\,\text{J}$ either way`,
                },
                { type: "check", questionId: Q("sys-1"), lead: "Is Earth in the system?" },
                { type: "callout", tone: "warning", title: "Bars move; they don't multiply", md: r`Energy transfers from one store to another. If a spring's 5 units become 5 units of kinetic energy, the spring's bar drops to zero; it does not stay at 5. Unless an external-work bar adds or removes energy, both sides of the chart must have the same total.` },
                { type: "check", questionId: Q("sys-2") },
                { type: "summary", points: ["Choose the system first; interactions inside it are internal, forces from outside are external.", "An internal conservative interaction appears as potential energy; an external force appears as work. Count each once.", "Gravitational potential energy needs both the object and Earth in the system.", "An energy bar chart is an equation: initial stores + external work = final stores + internal energy produced.", "With no external work, the total of the bars is constant."] },
              ],
            },
            {
              id: "physics-1.l.u3.mechanical-energy",
              title: "Conservation of mechanical energy",
              summary: "When only gravity and springs do work inside a system, K + U stays constant: a quick route to speeds and heights.",
              estMinutes: 16,
              skillIds: [S("energy-conservation")],
              blocks: [
                { type: "definition", term: "Mechanical energy", md: r`The sum of a system's kinetic and potential energies: $E_{\text{mech}} = K + U_g + U_s$.` },
                { type: "callout", tone: "key", title: "When is mechanical energy conserved?", md: r`If the only forces doing work are **internal conservative forces** (gravity, with Earth in the system; ideal springs, with the spring in the system), and no external work is done, then

$$K_i + U_i = K_f + U_f.$$

Forces that do no work, such as a normal force on an object moving along a frictionless track or the tension in a pendulum string, don't spoil this. Friction, air resistance and external pushes do.` },
                {
                  type: "worked_example",
                  title: "Speed at the bottom of a frictionless track",
                  problem: r`A cart starts from rest at the top of a frictionless track $3.2\,\text{m}$ above the bottom. How fast is it moving at the bottom? How fast at a point $1.4\,\text{m}$ above the bottom?`,
                  steps: [
                    { title: "Choose the system and zero", md: r`System: cart + Earth. Zero of $U_g$ at the bottom. Only gravity does work, so mechanical energy is conserved.` },
                    { title: "Bottom", md: r`$mgh = \tfrac12 mv^2$. The mass cancels: $v = \sqrt{2gh} = \sqrt{2(9.8)(3.2)} = \sqrt{62.7} \approx 7.9\,\text{m/s}$.` },
                    { title: "Partway down", md: r`Drop so far: $3.2 - 1.4 = 1.8\,\text{m}$. $v = \sqrt{2(9.8)(1.8)} = \sqrt{35.3} \approx 5.9\,\text{m/s}$.` },
                  ],
                  answer: r`$7.9\,\text{m/s}$ at the bottom; $5.9\,\text{m/s}$ at $1.4\,\text{m}$`,
                },
                { type: "check", questionId: Q("cons-1") },
                { type: "callout", tone: "warning", title: "Mass and path shape don't matter (here)", md: r`Notice that $m$ cancelled and the shape of the track never appeared. On frictionless tracks, a heavy cart and a light cart released from the same height reach the bottom at the **same speed**, and a steep, a gentle and a looping track all give the same final speed (though they take different times).

This is special to energy that comes from gravity, because $U_g = mgh$ is itself proportional to the mass. A spring's energy, $\tfrac12 kx^2$, does not depend on the mass it launches, so a heavier block launched by the same spring moves **more slowly**.` },
                { type: "check", questionId: Q("cons-2"), lead: "Write the energy equation and watch the mass." },
                {
                  type: "worked_example",
                  title: "A spring launch up a ramp",
                  problem: r`A $0.50\,\text{kg}$ block compresses a spring ($k = 800\,\text{N/m}$) by $0.15\,\text{m}$ on a frictionless track. When released, how high up a frictionless ramp does it climb?`,
                  steps: [
                    { title: "System and energy stores", md: r`System: block + spring + Earth. Initially all the energy is $U_s$; at the highest point the block is momentarily at rest, so all of it is $U_g$.` },
                    { title: "Spring energy", md: r`$U_s = \tfrac12(800)(0.15)^2 = 400 \times 0.0225 = 9.0\,\text{J}$.` },
                    { title: "Height", md: r`$mgh = 9.0\,\text{J}$, so $h = \dfrac{9.0}{(0.50)(9.8)} \approx 1.8\,\text{m}$.` },
                  ],
                  answer: r`About $1.8\,\text{m}$`,
                },
                { type: "callout", tone: "tip", title: "A three-step routine", md: r`1. **System and zero level.** Include every object whose force does work (usually Earth, and any spring).
2. **Check the conditions.** No friction, no external work? Then $K + U$ is constant.
3. **Write $K_i + U_i = K_f + U_f$** with only the terms that are not zero, then solve. Work with energies; convert to a speed only at the end.` },
                { type: "tutor_prompt", prompts: ["Why doesn't the normal force from a roller-coaster track change the car's mechanical energy?", "Why do heavy and light objects reach the bottom of a frictionless slide at the same speed?", "How do I know when I can use conservation of mechanical energy?"] },
                { type: "summary", points: [r`Mechanical energy $= K + U_g + U_s$.`, "It is conserved when only internal conservative forces (gravity, springs) do work and no external work is done.", "Forces that do no work, such as normal forces on frictionless tracks and pendulum tension, don't affect it.", r`From rest, a drop of $h$ gives $v = \sqrt{2gh}$, independent of mass and path shape.`, "With a spring as the energy source, mass does matter: same energy, so a heavier object moves more slowly."] },
              ],
            },
          ],
        },
        // ───────────────────────── Topic 6 ─────────────────────────
        {
          id: T("nonconservative"),
          title: "Friction and internal energy",
          description: "When friction acts or someone pushes from outside, mechanical energy changes, but total energy is still conserved.",
          objectives: [
            { id: "physics-1.o.u3.f", code: "PHYS-3.F", description: "Account for energy converted to internal energy by friction and for work done by external forces when mechanical energy is not conserved.", skillIds: [S("nonconservative-work")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u3.friction-internal-energy",
              title: "When mechanical energy is not conserved",
              summary: "Friction converts mechanical energy into internal energy; external forces add or remove energy. The full energy equation handles both.",
              estMinutes: 16,
              skillIds: [S("nonconservative-work")],
              blocks: [
                { type: "text", md: r`Real slides are not frictionless. A child on a playground slide arrives at the bottom slower than $\sqrt{2gh}$ predicts, and the slide (and the child's clothes) get slightly warm. Mechanical energy has decreased, but it has not vanished.` },
                { type: "definition", term: "Internal (thermal) energy", md: r`Energy associated with the random motion and arrangement of the particles inside objects. When kinetic friction acts between two sliding surfaces, mechanical energy is converted into internal energy of **both** surfaces, which warm up. For kinetic friction of size $f_k$ acting over a sliding distance $d$, $\Delta E_{\text{int}} = f_k d$.` },
                { type: "callout", tone: "key", title: "Total energy is always conserved", md: r`Friction does not destroy energy; it converts it. The complete energy equation for a system is

$$K_i + U_i + W_{\text{ext}} = K_f + U_f + \Delta E_{\text{int}}$$

- $W_{\text{ext}}$: work done by forces from outside the system (positive adds energy, negative removes it).
- $\Delta E_{\text{int}}$: mechanical energy converted to internal energy by friction or air resistance inside the system.

Conservation of mechanical energy is just the special case where both are zero.` },
                {
                  type: "worked_example",
                  title: "A real playground slide",
                  problem: r`A $30\,\text{kg}$ child slides from rest down a slide with a vertical drop of $2.5\,\text{m}$ and reaches the bottom at $5.0\,\text{m/s}$. (a) How much energy is converted to internal energy? (b) The slide is $4.0\,\text{m}$ long. What is the average friction force?`,
                  steps: [
                    { title: "System", md: r`Child + slide + Earth. No external work. Friction is internal: it produces $\Delta E_{\text{int}}$.` },
                    { title: "(a) Energy equation", md: r`$U_{g,i} = K_f + \Delta E_{\text{int}}$: $(30)(9.8)(2.5) = \tfrac12(30)(5.0)^2 + \Delta E_{\text{int}}$, so $735 = 375 + \Delta E_{\text{int}}$ and $\Delta E_{\text{int}} = 360\,\text{J}$.` },
                    { title: "(b) Friction force", md: r`$\Delta E_{\text{int}} = f_k d$, so $f_k = \dfrac{360}{4.0} = 90\,\text{N}$.` },
                  ],
                  answer: r`(a) $360\,\text{J}$; (b) $90\,\text{N}$`,
                },
                { type: "check", questionId: Q("nc-1") },
                { type: "callout", tone: "warning", title: "\"Lost\" energy is converted, not destroyed", md: r`People say energy is "lost to friction". Physically, it becomes internal energy that is hard to turn back into motion. In bar charts, always show it as a $\Delta E_{\text{int}}$ bar so that the chart balances. And don't assume $K + U$ is constant whenever the speed is steady: a box sliding down a rough ramp at constant speed is converting all of its lost $U_g$ into internal energy.` },
                { type: "text", md: r`## System choice and friction

As with gravity, friction can be counted two ways. With **block alone** as the system, friction from the floor is external and does work $-f_k d$ on the block. With **block + floor** as the system, friction is internal and the system's internal energy rises by $+f_k d$. Both describe the same physics: the block loses $f_k d$ of kinetic energy and the surfaces warm up by $f_k d$.` },
                {
                  type: "worked_example",
                  title: "Pushing a crate up a rough ramp",
                  problem: r`A worker pushes a $40\,\text{kg}$ crate up a ramp at constant speed, raising it $1.2\,\text{m}$. The crate slides $3.0\,\text{m}$ along the ramp against a $60\,\text{N}$ friction force. How much work does the worker do?`,
                  steps: [
                    { title: "System", md: r`Crate + ramp + Earth. The worker is outside: $W_{\text{ext}}$.` },
                    { title: "Energy equation", md: r`$W_{\text{ext}} = \Delta K + \Delta U_g + \Delta E_{\text{int}} = 0 + (40)(9.8)(1.2) + (60)(3.0) = 470 + 180 = 650\,\text{J}$.` },
                  ],
                  answer: r`About $650\,\text{J}$`,
                },
                { type: "check", questionId: Q("nc-2") },
                { type: "summary", points: [r`Kinetic friction converts mechanical energy into internal energy of both surfaces: $\Delta E_{\text{int}} = f_k d$.`, r`Full energy equation: $K_i + U_i + W_{\text{ext}} = K_f + U_f + \Delta E_{\text{int}}$.`, "Total energy is always conserved; mechanical energy is conserved only without friction and external work.", "Constant speed does not mean no energy is converted.", "With the surface outside the system, friction appears as negative work; with it inside, as internal energy."] },
              ],
            },
          ],
        },
        // ───────────────────────── Topic 7 ─────────────────────────
        {
          id: T("power"),
          title: "Power",
          description: "How quickly energy is transferred: average power, and the power delivered by a force on a moving object.",
          objectives: [
            { id: "physics-1.o.u3.g", code: "PHYS-3.G", description: "Calculate average power as the rate of energy transfer, and use P = Fv to relate power, force and speed, including motion at constant speed.", skillIds: [S("average-power"), S("power-force-velocity")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u3.power",
              title: "Power: the rate of energy transfer",
              summary: "Average power is work per unit time; for a force on a moving object it is force times velocity, even at constant speed.",
              estMinutes: 15,
              skillIds: [S("average-power"), S("power-force-velocity")],
              blocks: [
                { type: "text", md: r`Walking up a flight of stairs and running up it take the same work against gravity, $mgh$. Running is harder because you do that work **faster**. The rate at which work is done, or energy is transferred, is **power**.` },
                { type: "definition", term: "Average power", md: r`The work done (or energy transferred) divided by the time taken. Power is a scalar measured in **watts** (W): $1\,\text{W} = 1\,\text{J/s}$. A kilowatt (kW) is $1000\,\text{W}$.` },
                { type: "formula", latex: r`P_{\text{avg}} = \frac{W}{\Delta t} = \frac{\Delta E}{\Delta t}`, caption: "Average power, in watts (joules per second)." },
                {
                  type: "worked_example",
                  title: "Running up the stairs",
                  problem: r`A $62\,\text{kg}$ student runs up a staircase that rises $5.0\,\text{m}$ in $4.0\,\text{s}$. What average power does she develop against gravity? What if she walks up in $12\,\text{s}$?`,
                  steps: [
                    { title: "Work against gravity", md: r`$W = mgh = (62)(9.8)(5.0) = 3038\,\text{J}$ either way.` },
                    { title: "Running", md: r`$P = \dfrac{3038}{4.0} \approx 760\,\text{W}$.` },
                    { title: "Walking", md: r`$P = \dfrac{3038}{12} \approx 250\,\text{W}$: the same work, a third of the power.` },
                  ],
                  answer: r`About $760\,\text{W}$ running; $250\,\text{W}$ walking`,
                },
                { type: "check", questionId: Q("pw-1") },
                { type: "callout", tone: "warning", title: "Power is not energy", md: r`Power tells you **how fast**, not **how much**. A machine that does $2000\,\text{J}$ in $20\,\text{s}$ ($100\,\text{W}$) is less powerful than one that does $300\,\text{J}$ in $1\,\text{s}$ ($300\,\text{W}$). To go from power back to energy, multiply by time: a $60\,\text{W}$ bulb uses $60\,\text{J}$ every second.` },
                { type: "check", questionId: Q("pw-2"), lead: "Same work, different times." },
                { type: "text", md: r`## Power delivered by a force: P = Fv

If a constant force $F$ acts along the motion of an object moving at speed $v$, then in a short time $\Delta t$ the object moves $v\,\Delta t$ and the force does work $F v\,\Delta t$. Dividing by $\Delta t$:` },
                { type: "formula", latex: r`P = Fv\cos\theta`, caption: "Power delivered by a force F on an object moving at speed v; θ is the angle between them (θ = 0 when the force is along the motion)." },
                { type: "callout", tone: "key", title: "Constant speed still takes power", md: r`A car cruising at a steady $25\,\text{m/s}$ has zero **net** force, but the engine's driving force is not zero: it balances air resistance and rolling friction. That driving force acts on a moving car, so the engine delivers $P = F_{\text{drive}}v$, all of it converted into internal energy of the air, tyres and road. Turn the engine off and the car slows down.

Similarly, an elevator rising at constant speed needs $P = mgv$: the cable's force equals $mg$ and moves upward at $v$.` },
                {
                  type: "worked_example",
                  title: "A cyclist against the wind",
                  problem: r`A cyclist rides at a steady $9.0\,\text{m/s}$ on level ground against a total resistive force of $30\,\text{N}$. (a) What power must she supply? (b) Air resistance at these speeds grows roughly as $v^2$. Estimate the power needed to ride at $18\,\text{m/s}$, assuming air resistance is the only resistive force.`,
                  steps: [
                    { title: "(a) Driving force equals resistance", md: r`At constant speed, $F_{\text{drive}} = 30\,\text{N}$. $P = Fv = (30)(9.0) = 270\,\text{W}$.` },
                    { title: "(b) Scale with speed", md: r`Doubling $v$ makes the resistive force about $4\times$ larger, and it acts at twice the speed: $P \propto v^3$, so about $8 \times 270 \approx 2200\,\text{W}$: far more than a person can sustain.` },
                  ],
                  answer: r`(a) $270\,\text{W}$; (b) roughly $2\,\text{kW}$`,
                },
                { type: "check", questionId: Q("pfv-1"), lead: "Constant speed: what is the driving force?" },
                { type: "tutor_prompt", prompts: ["Why does a car need power to keep moving at constant speed?", "Why do trucks shift to a low gear to climb steep hills?", "What is the difference between a joule and a watt?"] },
                { type: "summary", points: [r`Average power is the rate of energy transfer: $P = W/\Delta t$, in watts ($1\,\text{W} = 1\,\text{J/s}$).`, "The same work done in less time means more power, not more energy.", r`A force on a moving object delivers power $P = Fv\cos\theta$.`, "At constant speed the net force is zero but the driving force is not, so power is still needed against resistance or gravity.", r`At fixed power, $F = P/v$: low speed allows a large force.`] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: unit3Questions,

  assessments: [
    // ── Topic 1: kinetic energy and work ──
    { id: "physics-1.ex.u3.kinetic-energy", kind: "exercise", title: "Calculate kinetic energy", description: "Find kinetic energies, speeds from energies, and how kinetic energy changes when speed or mass changes.", unitId: UNIT, topicId: T("kinetic-energy-work"), questionIds: range("ke", 3, 10), config: EXERCISE },
    { id: "physics-1.ex.u3.work-constant-force", kind: "exercise", title: "Find the work done by a constant force", description: "Use W = Fd cos θ for forces along and at an angle to the motion, and total the work of several forces.", unitId: UNIT, topicId: T("kinetic-energy-work"), questionIds: range("wf", 3, 10), config: EXERCISE },
    { id: "physics-1.ex.u3.sign-of-work", kind: "exercise", title: "Decide the sign of work", description: "Decide whether forces do positive, negative or zero work, and reason about the total work when the speed is constant.", unitId: UNIT, topicId: T("kinetic-energy-work"), questionIds: range("wf", 11, 18), config: EXERCISE },
    // ── Topic 2: work by common forces and from graphs ──
    { id: "physics-1.ex.u3.work-common-forces", kind: "exercise", title: "Work done by gravity, friction and the normal force", description: "Find the work done by gravity (using heights, not path lengths), kinetic and static friction, and normal forces.", unitId: UNIT, topicId: T("work-forces-graphs"), questionIds: range("ws", 3, 10), config: EXERCISE },
    { id: "physics-1.ex.u3.work-graphs", kind: "exercise", title: "Find work from a force–position graph", description: "Find work as the signed area under force–position graphs, including the triangle under a spring's force line.", unitId: UNIT, topicId: T("work-forces-graphs"), questionIds: range("wg", 3, 10), config: EXERCISE },
    // ── Topic 3: work–energy theorem ──
    { id: "physics-1.ex.u3.net-work-speed", kind: "exercise", title: "Use net work to find a change in speed", description: "Apply the work–energy theorem to find speeds and changes in kinetic energy when one or several forces act.", unitId: UNIT, topicId: T("work-energy-theorem"), questionIds: range("wet", 3, 10), config: EXERCISE },
    { id: "physics-1.ex.u3.stopping-distance", kind: "exercise", title: "Stopping distances and stopping forces", description: "Use the work–energy theorem to find stopping distances, average stopping forces and how they scale with speed.", unitId: UNIT, topicId: T("work-energy-theorem"), questionIds: range("wet", 11, 18), config: EXERCISE },
    // ── Topic 4: potential energy ──
    { id: "physics-1.ex.u3.gravitational-pe", kind: "exercise", title: "Calculate changes in gravitational potential energy", description: "Find changes in gravitational potential energy, choose zero levels, and connect ΔU to the work done by gravity.", unitId: UNIT, topicId: T("potential-energy"), questionIds: range("gpe", 3, 10), config: EXERCISE },
    { id: "physics-1.ex.u3.springs", kind: "exercise", title: "Spring forces and elastic potential energy", description: "Use Hooke's law and ½kx² to find spring constants, forces, stored energies and stretches.", unitId: UNIT, topicId: T("potential-energy"), questionIds: range("spe", 3, 10), config: EXERCISE },
    // ── Topic 5: systems and conservation ──
    { id: "physics-1.ex.u3.bar-charts", kind: "exercise", title: "Choose a system and use energy bar charts", description: "Decide what is inside the system, count each interaction once, and read and build energy bar charts.", unitId: UNIT, topicId: T("energy-conservation"), questionIds: range("sys", 3, 10), config: EXERCISE },
    { id: "physics-1.ex.u3.energy-conservation", kind: "exercise", title: "Find speeds and heights with energy conservation", description: "Use conservation of mechanical energy for falls, ramps, roller coasters and pendulums.", unitId: UNIT, topicId: T("energy-conservation"), questionIds: range("cons", 3, 10), config: EXERCISE },
    { id: "physics-1.ex.u3.springs-ramps", kind: "exercise", title: "Energy conservation with springs, ramps and pendulums", description: "Combine elastic and gravitational potential energy, and decide when mechanical energy is conserved.", unitId: UNIT, topicId: T("energy-conservation"), questionIds: range("cons", 11, 18), config: EXERCISE },
    // ── Topic 6: friction and internal energy ──
    { id: "physics-1.ex.u3.friction-energy", kind: "exercise", title: "Track energy converted by friction", description: "Find how much mechanical energy friction converts into internal energy, and the speeds that result.", unitId: UNIT, topicId: T("nonconservative"), questionIds: range("nc", 3, 10), config: EXERCISE },
    { id: "physics-1.ex.u3.energy-accounting", kind: "exercise", title: "Energy accounting with friction and external work", description: "Use the full energy equation with external work and internal energy, for different choices of system.", unitId: UNIT, topicId: T("nonconservative"), questionIds: range("nc", 11, 18), config: EXERCISE },
    // ── Topic 7: power ──
    { id: "physics-1.ex.u3.average-power", kind: "exercise", title: "Calculate average power", description: "Find average power from work and time, and energies and times from power.", unitId: UNIT, topicId: T("power"), questionIds: range("pw", 3, 10), config: EXERCISE },
    { id: "physics-1.ex.u3.power-force-speed", kind: "exercise", title: "Power, force and speed", description: "Use P = Fv for vehicles, lifts and tows, including motion at constant speed and on slopes.", unitId: UNIT, topicId: T("power"), questionIds: range("pfv", 2, 9), config: EXERCISE },

    // ── Checkpoint quizzes ──
    {
      id: "physics-1.quiz.u3.1",
      kind: "skill_quiz",
      title: "Quiz 1: kinetic energy, work and the work–energy theorem",
      description: "Six questions on kinetic energy, work done by constant and changing forces, and the work–energy theorem. No hints.",
      unitId: UNIT,
      topicId: T("work-energy-theorem"),
      questionIds: [Q("ke-11"), Q("wf-19"), Q("ws-11"), Q("wg-11"), Q("wet-19"), Q("wet-22")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 6 * 90 },
    },
    {
      id: "physics-1.quiz.u3.2",
      kind: "skill_quiz",
      title: "Quiz 2: potential energy, conservation and power",
      description: "Seven questions on potential energy, systems and bar charts, conservation of energy, friction and power. No hints.",
      unitId: UNIT,
      topicId: T("power"),
      questionIds: [Q("gpe-11"), Q("spe-11"), Q("sys-11"), Q("cons-19"), Q("nc-19"), Q("pw-11"), Q("pfv-10")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 90 },
    },

    // ── Unit test ──
    {
      id: "physics-1.test.u3",
      kind: "unit_test",
      title: "Unit 3 test: work, energy and power",
      description: "Fourteen questions, 28 minutes. Covers the whole unit: kinetic energy, work, the work–energy theorem, potential energy, systems and bar charts, conservation of energy, friction and power.",
      unitId: UNIT,
      questionIds: [
        Q("ke-12"), Q("wf-20"), Q("ws-12"), Q("wg-12"), Q("wet-20"), Q("gpe-12"), Q("spe-12"),
        Q("sys-12"), Q("sys-13"), Q("cons-20"), Q("cons-21"), Q("nc-20"), Q("pw-12"), Q("pfv-12"),
      ],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 14 * 120 },
    },

    // ── AP-style practice (full-course practice) ──
    {
      id: "physics-1.exam.u3",
      kind: "exam_practice",
      title: "AP-style practice set: work, energy and power",
      description: "Eight original multi-step AP-style items on work, energy and power under exam-like timing (2 minutes per question).",
      questionIds: [Q("wg-13"), Q("wet-21"), Q("gpe-13"), Q("spe-13"), Q("sys-14"), Q("cons-22"), Q("nc-21"), Q("pfv-11")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 8 * 120 },
    },
  ],
};
