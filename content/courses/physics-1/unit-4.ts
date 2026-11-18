/**
 * AP Physics 1 — Unit 4: Linear Momentum. Momentum as a vector, impulse and
 * force–time graphs, conservation of momentum for a chosen system, elastic and
 * inelastic collisions, explosions and recoil, simple two-dimensional
 * (perpendicular) cases, and the velocity of a system's center of mass.
 * Assembled into the course in ./index.ts.
 *
 * Original AceAP instructional content. Objective codes ("PHYS-4.C") are
 * AceAP's own and are not College Board codes. Algebra-based throughout;
 * SI units, g = 9.8 m/s², a stated positive direction in every problem.
 */
import type { UnitPart } from "./shared";
import { unit4Questions } from "./unit-4.questions";

const r = String.raw;
const S = (id: string) => `physics-1.u4.${id}`;
const Q = (id: string) => `physics-1.q.u4.${id}`;
const M = (id: string) => `physics-1.m.u4.${id}`;
const T = (id: string) => `physics-1.u4.t.${id}`;
const L = (id: string) => `physics-1.l.u4.${id}`;
const EX = (id: string) => `physics-1.ex.u4.${id}`;
const UNIT = "physics-1.u4";

/** Topic exercise: immediate feedback, hints allowed, a fresh draw from the pool each attempt. */
const exercise = (id: string, topic: string, title: string, description: string, questionIds: string[], questionsPerAttempt: number) => ({
  id: EX(id),
  kind: "exercise" as const,
  title,
  description,
  unitId: UNIT,
  topicId: T(topic),
  questionIds: questionIds.map(Q),
  config: { feedback: "immediate" as const, assistance: "allowed" as const, questionsPerAttempt },
});

/** range("mom", 4, 11) → mom-4 … mom-11 */
const range = (slug: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${slug}-${from + i}`);

export const unit4: UnitPart = {
  skills: [
    {
      id: S("momentum-definition"),
      name: "Momentum of an object",
      description: "Calculate momentum as mass times velocity, treat it as a vector with a sign along a line, compare momenta, and add the momenta of several objects in a system.",
      difficulty: 1,
      keywords: ["momentum", "linear momentum", "p = mv", "kg m/s", "momentum is a vector", "negative momentum", "total momentum", "momentum of a system", "momentum vs kinetic energy", "what is momentum"],
      prerequisites: ["physics-1.velocity-sign-direction"],
      patternLabels: { "compute-momentum": "Calculating momentum", "sign-direction": "Momentum with a sign", "compare-momenta": "Comparing momenta", "system-total": "Total momentum of a system", "solve-for-velocity": "Velocity from momentum", "momentum-properties": "Properties of momentum", proportional: "Momentum ratios", symbolic: "Total momentum in symbols" },
    },
    {
      id: S("change-in-momentum"),
      name: "Change in momentum",
      description: "Find the change in an object's momentum as final minus initial momentum with signs, including stops, speed changes and bounces where the direction reverses.",
      difficulty: 2,
      keywords: ["change in momentum", "delta p", "bounce", "rebound", "reverses direction", "final minus initial momentum", "ball bounces off wall", "stopping", "momentum change direction"],
      prerequisites: [S("momentum-definition")],
      patternLabels: { bounce: "Bounces and rebounds", "compare-bounce-stick": "Bouncing vs stopping", stop: "Coming to a stop", "speed-up": "Speeding up", "dp-direction": "Direction of the change", "which-dp": "Matching changes in momentum", symbolic: "Change in momentum in symbols", "final-velocity": "Final velocity from a change" },
    },
    {
      id: S("impulse-average-force"),
      name: "Impulse and average force",
      description: "Use the impulse–momentum theorem, J = F_avg Δt = Δp, to find impulses, average forces, contact times and velocities after a push.",
      difficulty: 2,
      keywords: ["impulse", "impulse momentum theorem", "J = F delta t", "average force", "N s", "newton second", "contact time", "force times time", "impulse equals change in momentum"],
      prerequisites: [S("change-in-momentum")],
      patternLabels: { "impulse-from-force": "Impulse from force and time", "force-from-dp": "Average force from a change in momentum", "time-from-dp": "Time from impulse", "impulse-units": "Units of impulse", "impulse-equals-dp": "Impulse equals change in momentum", "velocity-after-impulse": "Velocity after an impulse", "bounce-force": "Average force in a bounce", "impulse-properties": "Properties of impulse", symbolic: "Impulse in symbols", "landing-force": "Contact force including weight" },
    },
    {
      id: S("force-time-graphs"),
      name: "Impulse from force–time graphs",
      description: "Find impulse as the signed area under a force–time graph, including triangles and combined shapes, and use it to find velocities and average forces.",
      difficulty: 3,
      keywords: ["force time graph", "area under force time graph", "impulse from graph", "triangle area", "peak force", "average force from graph", "negative area", "force sensor"],
      prerequisites: [S("impulse-average-force")],
      patternLabels: { "rectangle-area": "Constant force", "triangle-area": "Triangular pulses", "trapezoid-area": "Combined shapes", "velocity-from-graph": "Velocity from a graph", "graph-meaning": "What the area means", "compare-graphs": "Comparing graphs", "average-from-graph": "Average force from a graph", "signed-area": "Areas below the axis" },
    },
    {
      id: S("collision-time-safety"),
      name: "Stopping time and safety",
      description: "Explain and calculate how lengthening the time of a collision with the same change in momentum reduces the average force, as in airbags, crumple zones, mats and bending your knees.",
      difficulty: 2,
      keywords: ["airbag", "crumple zone", "bend your knees", "seat belt", "padding", "stopping time", "why airbags work", "longer time smaller force", "egg drop", "catching a ball"],
      prerequisites: [S("impulse-average-force")],
      patternLabels: { "explain-cushion": "Explaining cushioning", "force-ratio": "How much the force drops", "stopping-force": "Average stopping force", "design-choice": "Safety features", "same-impulse": "Same impulse, different force", symbolic: "Stopping force in symbols", "stopping-time": "Stopping time", "bounce-vs-stop": "Bouncing vs stopping" },
    },
    {
      id: S("systems-external-forces"),
      name: "Systems, internal and external forces",
      description: "Choose a system, classify forces as internal or external, and decide when the system's total momentum is conserved, using Newton's third law to show that internal forces give equal and opposite impulses.",
      difficulty: 3,
      keywords: ["system", "internal force", "external force", "isolated system", "when is momentum conserved", "Newton's third law collision", "equal and opposite impulse", "choosing a system", "net external force"],
      prerequisites: [S("impulse-average-force")],
      patternLabels: { "internal-external": "Internal or external?", "conserved-or-not": "Is momentum conserved?", "choose-system": "Choosing a system", "third-law-collision": "Equal and opposite forces", "momentum-of-part": "One part's change in momentum", "impulse-approximation": "Brief collisions" },
    },
    {
      id: S("conservation-1d"),
      name: "Conservation of momentum in one dimension",
      description: "Apply conservation of momentum to collisions along a line to find an unknown velocity or mass, keeping track of signs.",
      difficulty: 3,
      keywords: ["conservation of momentum", "momentum before equals momentum after", "collision", "one dimensional collision", "find final velocity", "head on collision", "carts collide", "total momentum conserved"],
      prerequisites: [S("systems-external-forces"), S("momentum-definition")],
      patternLabels: { "find-final-velocity": "Final velocity", "opposite-directions": "Objects moving toward each other", "find-initial-velocity": "Initial velocity", "find-mass": "Unknown mass", "momentum-table": "Before-and-after tables", "check-outcome": "Possible outcomes", symbolic: "Collisions in symbols", "total-conserved": "What happens to the total", "two-stage": "Two collisions in a row" },
    },
    {
      id: S("perfectly-inelastic"),
      name: "Perfectly inelastic collisions",
      description: "Find the common velocity of objects that stick together, including objects moving toward each other, and work backward to an initial speed or mass.",
      difficulty: 3,
      keywords: ["perfectly inelastic", "objects stick together", "common velocity", "couple", "embedded", "ballistic pendulum", "tackle", "combined velocity", "move together after collision"],
      prerequisites: [S("conservation-1d")],
      patternLabels: { "common-velocity": "Common velocity", "opposite-directions": "Head-on sticking collisions", "find-initial": "Initial speed from the result", concept: "What sticking means", symbolic: "Sticking in symbols", "same-direction": "Catching up and coupling", "ends-at-rest": "When they stop dead", "find-mass": "Unknown mass", "ballistic-pendulum": "Ballistic pendulum" },
    },
    {
      id: S("collision-kinetic-energy"),
      name: "Kinetic energy in collisions",
      description: "Compare total kinetic energy before and after a collision to classify it as elastic, inelastic or perfectly inelastic, and recognise that momentum is conserved in all of them while kinetic energy may not be.",
      difficulty: 3,
      keywords: ["elastic collision", "inelastic collision", "kinetic energy lost", "is kinetic energy conserved", "classify collision", "energy in collisions", "1/2 m v^2", "momentum conserved kinetic energy not"],
      prerequisites: [S("conservation-1d")],
      patternLabels: { "compute-ke-loss": "Kinetic energy lost", classify: "Classifying collisions", "fraction-lost": "Fraction of kinetic energy lost", "energy-destination": "Where the energy goes", "what-is-conserved": "What is conserved", "elastic-check": "Checking an elastic collision", "possible-outcomes": "Impossible outcomes", "equal-momentum-ke": "Equal momentum, different energy" },
    },
    {
      id: S("explosions-recoil"),
      name: "Explosions and recoil",
      description: "Use conservation of momentum for objects that push apart, explode or recoil, including systems already moving, and relate the pieces' speeds and kinetic energies to their masses.",
      difficulty: 3,
      keywords: ["recoil", "explosion", "rifle recoil", "push apart", "spring released", "astronaut throws", "zero total momentum", "pieces fly apart", "kinetic energy increases"],
      prerequisites: [S("conservation-1d")],
      patternLabels: { "recoil-velocity": "Recoil velocity", "speed-ratio": "Comparing speeds", "total-momentum-zero": "Total momentum after an explosion", "moving-explosion": "Splitting while moving", "find-mass": "Unknown mass", "energy-ratio": "Comparing kinetic energies", "recoil-concepts": "Recoil ideas", symbolic: "Recoil in symbols", "energy-released": "Energy released" },
    },
    {
      id: S("momentum-2d"),
      name: "Momentum in two dimensions",
      description: "Treat momentum as a vector in a plane: resolve it into components, add perpendicular momenta, and conserve the x- and y-components separately in perpendicular collisions and explosions.",
      difficulty: 4,
      keywords: ["two dimensional collision", "momentum components", "perpendicular collision", "intersection crash", "x and y momentum conserved separately", "glancing collision", "momentum vector", "explosion into three pieces", "direction of total momentum"],
      prerequisites: [S("conservation-1d"), "physics-1.vector-components"],
      patternLabels: { components: "Components of momentum", "perpendicular-total": "Adding perpendicular momenta", direction: "Direction of total momentum", "vector-concepts": "Momentum as a vector", symbolic: "Perpendicular momenta in symbols", "change-2d": "Change in momentum in 2-D", "stick-perpendicular": "Perpendicular sticking collisions", "missing-piece": "The missing fragment", "glancing-collision": "Glancing collisions", "explosion-2d": "Splitting in two dimensions", "intersection-crash": "Reconstructing a crash" },
    },
    {
      id: S("center-of-mass-velocity"),
      name: "Velocity of the center of mass",
      description: "Find the velocity of a system's center of mass as total momentum divided by total mass, and use the fact that it changes only when a net external force acts, through collisions and explosions alike.",
      difficulty: 3,
      keywords: ["center of mass", "centre of mass velocity", "v cm", "total momentum over total mass", "mass weighted average", "center of mass explosion", "center of mass collision", "boat and person", "center of mass projectile"],
      prerequisites: [S("conservation-1d")],
      patternLabels: { "compute-vcm": "Center-of-mass velocity", "vcm-constant": "When it stays constant", "com-position": "Center-of-mass position", "vcm-meaning": "Meaning of v_cm", symbolic: "v_cm in symbols", "find-unknown": "Unknown velocity from v_cm", "vcm-collision": "Through a collision", "vcm-explosion": "Through an explosion", "vcm-projectile": "Exploding projectiles", "vcm-external": "External forces" },
    },
  ],

  misconceptions: [
    { id: M("drops-momentum-sign"), skillId: S("momentum-definition"), title: "Drops the sign (direction) of momentum", description: "Treats momentum as a size only: writes a positive momentum for an object moving in the negative direction, or adds a change in momentum with the wrong sign.", remediation: "Momentum is mass × velocity, and velocity carries a direction. State the positive direction first, give every velocity its sign, and let the sign of the product tell you the direction of the momentum. A negative impulse makes the momentum smaller (more negative)." },
    { id: M("heavier-more-momentum"), skillId: S("momentum-definition"), title: "Thinks the heavier object always has more momentum", description: "Judges momentum by mass alone, for example saying a parked truck has more momentum than a running dog, or that the heavier of two recoiling objects gets more momentum.", remediation: "Momentum needs both mass and velocity: p = mv. A massive object at rest has zero momentum, and a light object can match a heavy one by moving faster. Always multiply before comparing." },
    { id: M("bounce-subtracts-speeds"), skillId: S("change-in-momentum"), title: "Subtracts speeds when an object bounces", description: "Finds the change in velocity of a rebounding object by subtracting the two speeds, or says a ball that bounces back at the same speed has no change in momentum.", remediation: "Write both velocities with signs. A ball arriving at +6 m/s and leaving at −4 m/s has Δv = −4 − 6 = −10 m/s: the speeds add when the direction reverses. Reversing an object's motion needs a bigger change in momentum than just stopping it." },
    { id: M("impulse-is-force"), skillId: S("impulse-average-force"), title: "Treats impulse as if it were the force", description: "Expects a larger force to mean a larger impulse regardless of time, judges a force–time graph by its peak, or reports an impulse (N·s) as a force (N).", remediation: "Impulse is force × time: the whole area under the force–time graph. A large force for a very short time can deliver less impulse than a small force acting for longer. To get an average force from an impulse, divide by the time." },
    { id: M("net-force-is-contact-force"), skillId: S("impulse-average-force"), title: "Uses the net force as the force from one object", description: "Finds the average net force from Δp/Δt and reports it as the force from the floor, mat or ground, forgetting that gravity also acts during the stop.", remediation: "Impulse–momentum gives the net force. List every force on the object during the contact: for a landing, the floor pushes up while gravity pulls down, so F_floor − mg = Δp/Δt and the floor's force is the net force plus the weight." },
    { id: M("peak-force-times-time"), skillId: S("force-time-graphs"), title: "Multiplies the peak force by the whole time", description: "Finds the impulse of a triangular or rounded force–time pulse as peak force × duration, or uses the peak force as the average force.", remediation: "Impulse is the area under the graph. A triangle's area is ½ × base × height, half of peak × duration. Split other shapes into rectangles and triangles. The average force is the height of a rectangle with the same area and width: for a symmetric triangle, half the peak." },
    { id: M("cushion-reduces-impulse"), skillId: S("collision-time-safety"), title: "Thinks cushions reduce the impulse or change in momentum", description: "Explains airbags, crumple zones or bent knees by saying they reduce the change in momentum or the impulse, rather than the force.", remediation: "The change in momentum is fixed by the start and end of the motion: from your speed to rest, whatever stops you. A cushion cannot change that, so the impulse is the same. What it changes is the time: F_avg = Δp/Δt, so a longer stop means a smaller average force." },
    { id: M("internal-forces-change-total"), skillId: S("systems-external-forces"), title: "Thinks internal forces change a system's total momentum", description: "Believes forces between parts of a system (a collision, a push-off, an explosion) can make the system's total momentum increase or decrease, or misclassifies such forces as external.", remediation: "Internal forces come in Newton's third law pairs: equal size, opposite direction, acting for the same time. Their impulses are equal and opposite, so whatever momentum one part gains, another part loses. Only forces from outside the chosen system can change its total momentum." },
    { id: M("conserved-without-isolation"), skillId: S("systems-external-forces"), title: "Applies conservation of momentum to a system that is not isolated", description: "Says the momentum of a single falling ball, braking car or bouncing ball is conserved, or picks a system that leaves out one of the interacting objects.", remediation: "Momentum is conserved only for a system with no net external force (or a negligible external impulse). Before using conservation, list the forces from outside the system. If one acts, either enlarge the system to include its source or use impulse instead." },
    { id: M("unequal-collision-forces"), skillId: S("systems-external-forces"), title: "Thinks the bigger or faster object exerts the bigger force in a collision", description: "Expects a truck to push harder on a car than the car pushes on the truck, or expects the lighter object to receive the larger change in momentum (confusing equal Δp with equal Δv).", remediation: "Newton's third law: the two forces in a collision are always equal in size and opposite in direction, and they act for the same time. So the impulses and the changes in momentum are equal and opposite. The lighter object's velocity changes more because Δv = Δp/m." },
    { id: M("adds-opposite-momenta"), skillId: S("conservation-1d"), title: "Adds momenta of objects moving in opposite directions", description: "Adds the sizes of momenta (or uses all-positive velocities) when objects move toward each other, so the total comes out too large.", remediation: "Choose a positive direction and give each velocity its sign before multiplying. Momenta in opposite directions partly or fully cancel. Two lumps with +6 and −6 kg·m/s have a total of zero, not 12." },
    { id: M("averages-velocities"), skillId: S("perfectly-inelastic"), title: "Averages the velocities instead of using momentum", description: "Finds the common velocity after objects stick (or the velocity of a center of mass) by averaging the initial velocities, ignoring the masses.", remediation: "The common velocity is total momentum ÷ total mass, a mass-weighted average. A heavy object counts for more. The plain average of the velocities is right only when the masses are equal." },
    { id: M("ke-always-conserved"), skillId: S("collision-kinetic-energy"), title: "Assumes kinetic energy is conserved in every collision", description: "Uses kinetic energy conservation for sticking or crumpling collisions, or expects the total kinetic energy to be the same after any collision.", remediation: "Momentum is conserved in every collision of an isolated system; kinetic energy only in elastic ones. When objects stick, deform, heat up or make a sound, some kinetic energy becomes other forms. Check by computing ½mv² before and after." },
    { id: M("momentum-lost-inelastic"), skillId: S("collision-kinetic-energy"), title: "Thinks momentum is lost in inelastic collisions", description: "Believes the momentum, like the kinetic energy, is partly 'used up' as heat, sound or deformation when a collision is inelastic.", remediation: "Momentum has no other form to turn into: the impulses of the internal forces cancel exactly, so the total momentum is unchanged in every collision of an isolated system, elastic or not. It is kinetic energy, a separate scalar quantity, that is converted." },
    { id: M("momentum-ke-same"), skillId: S("collision-kinetic-energy"), title: "Confuses momentum with kinetic energy", description: "Uses ½mv² for momentum (or mv for kinetic energy), expects equal momenta to mean equal kinetic energies, or thinks one turns into the other.", remediation: "Momentum p = mv is a vector, conserved in every isolated collision. Kinetic energy KE = ½mv² = p²/2m is a scalar that may or may not be conserved. For the same momentum, the lighter object is faster and has more kinetic energy." },
    { id: M("equal-recoil-speeds"), skillId: S("explosions-recoil"), title: "Expects objects that push apart to move at equal speeds", description: "Gives a recoiling rifle, cannon or skater the same speed as the bullet, ball or partner, instead of the same size of momentum.", remediation: "Pushing apart from rest gives the two objects equal and opposite momenta: m₁v₁ = m₂v₂. Speeds are inversely proportional to masses, so a rifle 400 times heavier than its bullet recoils 400 times more slowly." },
    { id: M("zero-momentum-zero-energy"), skillId: S("explosions-recoil"), title: "Thinks zero total momentum means zero kinetic energy", description: "Concludes that because the pieces of an explosion or push-off have zero total momentum, their total kinetic energy must be zero or unchanged.", remediation: "Momentum is a vector, so equal and opposite momenta cancel. Kinetic energy is a scalar that is never negative, so the pieces' kinetic energies add up. In an explosion, stored chemical or elastic energy becomes kinetic energy while the total momentum stays zero." },
    { id: M("adds-perpendicular-momenta"), skillId: S("momentum-2d"), title: "Adds perpendicular momenta as plain numbers", description: "Adds the magnitudes of momenta that point in different directions (for example 3 east + 4 north = 7), or treats total speed or total momentum magnitude as the conserved quantity in two dimensions.", remediation: "Momentum is a vector. Split every momentum into x- and y-components, conserve each component separately, and only then combine them with the Pythagorean theorem: √(3² + 4²) = 5. The direction comes from tan θ = p_y / p_x." },
    { id: M("unweighted-cm-velocity"), skillId: S("center-of-mass-velocity"), title: "Averages velocities or positions without weighting by mass", description: "Finds the center-of-mass velocity (or position) as the plain average of the objects' velocities (or positions).", remediation: "v_cm = (m₁v₁ + m₂v₂ + …)/(m₁ + m₂ + …): total momentum divided by total mass. Heavier objects count for more, so v_cm is closer to the heavy object's velocity. The plain average is right only for equal masses." },
    { id: M("cm-changes-internal"), skillId: S("center-of-mass-velocity"), title: "Thinks collisions or explosions change the center-of-mass velocity", description: "Expects the center of mass to stop, speed up or change direction when parts of the system collide, stick, push apart or explode.", remediation: "Only a net external force changes a system's total momentum, and v_cm = p_total / M_total. Collisions, springs and explosions are internal, so the center of mass sails on unchanged: at rest stays at rest, and a projectile's center of mass stays on its parabola." },
  ],

  units: [
    {
      id: UNIT,
      number: 4,
      title: "Linear Momentum",
      description: "Momentum as a vector, impulse and force–time graphs, why longer stops mean smaller forces, conservation of momentum for a well-chosen system, elastic and inelastic collisions, explosions and recoil, perpendicular collisions in two dimensions, and the motion of a system's center of mass.",
      topics: [
        // ───────────────────────────── Topic 1 ─────────────────────────────
        {
          id: T("momentum"),
          title: "Momentum and its changes",
          description: "Define momentum as a vector, add the momenta of several objects, and find how an object's momentum changes when it speeds up, stops or bounces.",
          objectives: [
            { id: "physics-1.o.4a", code: "PHYS-4.A", description: "Calculate the momentum of an object and the total momentum of a system along a line, treating momentum as a vector with a sign.", skillIds: [S("momentum-definition")] },
            { id: "physics-1.o.4b", code: "PHYS-4.B", description: "Determine the change in an object's momentum, including motions that reverse direction.", skillIds: [S("change-in-momentum")] },
          ],
          lessons: [
            {
              id: L("momentum"),
              title: "Momentum: mass in motion",
              summary: "What momentum is, why it is a vector, how to compare the momenta of very different objects, and how to add up the momentum of a whole system.",
              estMinutes: 13,
              skillIds: [S("momentum-definition")],
              blocks: [
                { type: "text", md: r`Stopping a rolling shopping trolley is easy. Stopping a rolling freight car at the same speed is not. Stopping a bullet is hard too, even though it is tiny. What these situations have in common is a quantity that combines **how much stuff** is moving with **how fast and which way** it moves.

That quantity is **momentum**. It turns out to be one of the most useful ideas in physics, because in a collision or an explosion the total momentum of the objects involved does not change, even when the forces are far too violent and brief to measure.` },
                { type: "definition", term: "Momentum", md: r`The product of an object's mass and its velocity, written $\vec p$. Its SI unit is the kilogram-metre per second, $\text{kg·m/s}$. Momentum is a **vector**: it points in the same direction as the velocity.` },
                { type: "formula", latex: r`\vec p = m\vec v`, caption: "Momentum: mass (kg) times velocity (m/s). Along a line, p = mv with v carrying its sign." },
                { type: "callout", tone: "key", title: "Momentum has a direction", md: r`Because mass is always positive, momentum points wherever the velocity points. In one dimension you show that direction with a sign:

- choose a positive direction (right, east, up…);
- give each velocity its sign;
- multiply by the mass. The sign of $p$ is the direction of motion.

A $2\,\text{kg}$ ball moving left at $3\,\text{m/s}$ (right positive) has $p = (2)(-3) = -6\,\text{kg·m/s}$.` },
                { type: "check", questionId: Q("mom-1"), lead: "Mind the sign." },
                { type: "text", md: r`## Comparing momenta

Momentum depends on **both** factors. A large mass moving slowly can have the same momentum as a small mass moving quickly:

| Object | Mass | Speed | Momentum |
|---|---|---|---|
| Bowling ball | $6.0\,\text{kg}$ | $5.0\,\text{m/s}$ | $30\,\text{kg·m/s}$ |
| Cricket ball | $0.16\,\text{kg}$ | $40\,\text{m/s}$ | $6.4\,\text{kg·m/s}$ |
| Parked bus | $12\,000\,\text{kg}$ | $0$ | $0$ |

The parked bus, by far the most massive, has no momentum at all.` },
                { type: "callout", tone: "warning", title: "Heavier does not mean more momentum", md: r`It is tempting to judge momentum by size. But an object at rest has zero momentum however massive it is, and doubling the speed doubles the momentum just as surely as doubling the mass. Always multiply $m \times v$ before you compare.` },
                { type: "check", questionId: Q("mom-2"), lead: "A heavy object and a light one." },
                { type: "callout", tone: "warning", title: "Momentum is not kinetic energy", md: r`Both depend on mass and speed, and both are written with an $m$ and a $v$, but they are different quantities:

| | Momentum | Kinetic energy |
|---|---|---|
| Formula | $p = mv$ | $KE = \tfrac12mv^2$ |
| Vector or scalar? | Vector (has a direction) | Scalar (never negative) |
| Doubling the speed… | doubles it | quadruples it |
| Unit | $\text{kg·m/s}$ | $\text{J}$ |

Keep them apart: a lot of collision problems use both.` },
                { type: "text", md: r`## The momentum of a system

A **system** is whatever collection of objects you decide to study: two carts, a skater and a ball, every fragment of a firework. The total momentum of a system is the **vector sum** of the momenta of its parts. Along a line, that means adding the signed values.` },
                {
                  type: "worked_example",
                  title: "Two gliders on an air track",
                  problem: r`On an air track (right positive) a $0.60\,\text{kg}$ glider moves at $+2.5\,\text{m/s}$ and a $0.40\,\text{kg}$ glider moves at $-1.5\,\text{m/s}$. Find the total momentum of the two gliders.`,
                  steps: [
                    { title: "Momentum of each glider, with signs", md: r`$p_1 = (0.60)(+2.5) = +1.5\,\text{kg·m/s}$. $\;p_2 = (0.40)(-1.5) = -0.60\,\text{kg·m/s}$.` },
                    { title: "Add the signed values", md: r`$p_{\text{total}} = +1.5 + (-0.60) = +0.90\,\text{kg·m/s}$.` },
                    { title: "Interpret", md: r`The total is positive: the system as a whole carries momentum to the right, even though one glider moves left. Adding the sizes ($2.1\,\text{kg·m/s}$) would ignore the fact that the momenta partly cancel.` },
                  ],
                  answer: r`$+0.90\,\text{kg·m/s}$ (to the right)`,
                },
                { type: "check", questionId: Q("mom-3"), lead: "Total momentum of two carts." },
                { type: "tutor_prompt", prompts: ["Why is momentum a vector but kinetic energy a scalar?", "Can a small object have more momentum than a large one?", "What does a negative momentum mean?"] },
                { type: "summary", points: [r`Momentum is $\vec p = m\vec v$, measured in $\text{kg·m/s}$.`, "It is a vector pointing along the velocity; along a line its sign gives the direction.", "Compare momenta by multiplying mass and velocity: an object at rest has none, however massive.", r`Momentum ($mv$, vector) is not kinetic energy ($\tfrac12mv^2$, scalar).`, "A system's total momentum is the vector sum of its parts' momenta; opposite momenta partly cancel."] },
              ],
            },
            {
              id: L("change-in-momentum"),
              title: "Change in momentum: stops and bounces",
              summary: "Work out how much an object's momentum changes, and why bouncing back changes it more than stopping.",
              estMinutes: 11,
              skillIds: [S("change-in-momentum")],
              blocks: [
                { type: "text", md: r`Things that hit, push or pull an object change its momentum. Before asking about the forces (next topic), we need to measure the change itself. As always, a change means **final minus initial**.` },
                { type: "definition", term: "Change in momentum", md: r`$\Delta p = p_f - p_i$. For an object whose mass does not change, $\Delta p = m(v_f - v_i) = m\,\Delta v$. Like momentum, it is a vector: its sign shows which way the momentum changed.` },
                { type: "formula", latex: r`\Delta p = p_f - p_i = m\,(v_f - v_i)`, caption: "Change in momentum, with every velocity written with its sign." },
                {
                  type: "worked_example",
                  title: "A ball hits a wall",
                  problem: r`A $0.20\,\text{kg}$ ball moving at $10\,\text{m/s}$ hits a wall head-on. Find its change in momentum if (a) it sticks to the wall, (b) it bounces straight back at $10\,\text{m/s}$. Take the ball's initial direction as positive.`,
                  steps: [
                    { title: "Initial momentum", md: r`$p_i = (0.20)(+10) = +2.0\,\text{kg·m/s}$.` },
                    { title: "(a) It sticks", md: r`$p_f = 0$, so $\Delta p = 0 - 2.0 = -2.0\,\text{kg·m/s}$.` },
                    { title: "(b) It bounces back", md: r`$v_f = -10\,\text{m/s}$, so $p_f = -2.0\,\text{kg·m/s}$ and $\Delta p = -2.0 - (+2.0) = -4.0\,\text{kg·m/s}$.` },
                    { title: "Compare", md: r`The bounce changes the momentum **twice as much**: first the wall has to stop the ball, then it has to send it back. Both changes point away from the wall: the direction the wall pushes.` },
                  ],
                  answer: r`(a) $-2.0\,\text{kg·m/s}$; (b) $-4.0\,\text{kg·m/s}$`,
                },
                { type: "callout", tone: "warning", title: "When the direction reverses, the speeds add", md: r`For a ball arriving at $6\,\text{m/s}$ and leaving at $4\,\text{m/s}$ in the opposite direction, it is tempting to say "its speed changed by $2\,\text{m/s}$". But its **velocity** changed from $+6$ to $-4\,\text{m/s}$, a change of $-10\,\text{m/s}$.

So the change in momentum is $m \times 10\,\text{m/s}$, not $m \times 2\,\text{m/s}$. And a ball that rebounds at the same speed has certainly had its momentum changed, even though its speed has not.` },
                { type: "check", questionId: Q("dp-1"), lead: "A rebound: keep both signs." },
                { type: "callout", tone: "tip", title: "The change points the way the push points", md: r`The change in momentum always points in the direction of the (average) force that caused it. A wall pushes a bouncing ball away from itself, a floor pushes a bouncing ball up, brakes push a car backward. If your $\Delta p$ points the other way, recheck your signs.` },
                { type: "check", questionId: Q("dp-2"), lead: "Sticking versus bouncing." },
                { type: "summary", points: [r`$\Delta p = p_f - p_i = m(v_f - v_i)$, with every velocity signed.`, "Stopping an object changes its momentum by its whole momentum; bouncing it back at the same speed doubles that change.", "When the motion reverses, the speeds add to give the size of the velocity change.", "The change in momentum points in the direction of the force that caused it."] },
              ],
            },
          ],
        },

        // ───────────────────────────── Topic 2 ─────────────────────────────
        {
          id: T("impulse"),
          title: "Impulse and force",
          description: "Connect the change in an object's momentum to the force on it and the time that force acts, read impulse from force–time graphs, and use the idea to explain why cushions and crumple zones save lives.",
          objectives: [
            { id: "physics-1.o.4c", code: "PHYS-4.C", description: "Apply the impulse–momentum theorem to relate average force, contact time and change in momentum, including impulse found from the area under a force–time graph.", skillIds: [S("impulse-average-force"), S("force-time-graphs")] },
            { id: "physics-1.o.4d", code: "PHYS-4.D", description: "Explain and calculate how increasing the duration of a collision reduces the average force for the same change in momentum.", skillIds: [S("collision-time-safety")] },
          ],
          lessons: [
            {
              id: L("impulse"),
              title: "Impulse: force acting over time",
              summary: "Derive the impulse–momentum theorem from Newton's second law and use it to find average forces, contact times and final velocities.",
              estMinutes: 14,
              skillIds: [S("impulse-average-force")],
              blocks: [
                { type: "text", md: r`Newton's second law says a net force causes acceleration. Combine that with the definition of acceleration and something useful drops out.

For a constant net force, $F = ma$ and $a = \dfrac{\Delta v}{\Delta t}$. So

$$F = m\frac{\Delta v}{\Delta t} \quad\Longrightarrow\quad F\,\Delta t = m\,\Delta v = \Delta p$$

The product of a force and the time it acts equals the change in momentum it produces. That product has its own name.` },
                { type: "definition", term: "Impulse", md: r`The product of a force and the time interval over which it acts, written $\vec J$. For a force that varies, use the **average** force: $\vec J = \vec F_{\text{avg}}\,\Delta t$. Impulse is a vector in the direction of the force, measured in newton-seconds ($\text{N·s}$), which is the same unit as $\text{kg·m/s}$.` },
                { type: "formula", latex: r`\vec J = \vec F_{\text{avg}}\,\Delta t = \Delta\vec p`, caption: "The impulse–momentum theorem: the net impulse on an object equals its change in momentum." },
                { type: "callout", tone: "key", title: "Two ways to the same change", md: r`The theorem says what matters for changing momentum is force **and** time together. The same impulse can come from

- a **large force acting briefly** (a bat hitting a ball), or
- a **small force acting for a long time** (a gentle, steady push).

Real collision forces change rapidly and are hard to measure, but the impulse is easy: it is just $m\,\Delta v$. Dividing by the contact time then gives the **average** force.` },
                { type: "check", questionId: Q("imp-1"), lead: "Force times time." },
                {
                  type: "worked_example",
                  title: "Kicking a ball off a wall",
                  problem: r`A $0.45\,\text{kg}$ ball moving at $8.0\,\text{m/s}$ hits a wall and rebounds along the same line at $6.0\,\text{m/s}$. The contact lasts $0.030\,\text{s}$. Find the average force the wall exerts on the ball.`,
                  steps: [
                    { title: "Choose a direction", md: r`Take the rebound direction (away from the wall) as positive: $v_i = -8.0\,\text{m/s}$, $v_f = +6.0\,\text{m/s}$.` },
                    { title: "Change in momentum", md: r`$\Delta p = m(v_f - v_i) = (0.45)(6.0 - (-8.0)) = (0.45)(14) = +6.3\,\text{kg·m/s}$.` },
                    { title: "Average force", md: r`$F_{\text{avg}} = \dfrac{\Delta p}{\Delta t} = \dfrac{6.3}{0.030} = +210\,\text{N}$.` },
                    { title: "Check the direction", md: r`Positive means away from the wall, which is the way a wall must push to turn the ball around.` },
                  ],
                  answer: r`$210\,\text{N}$, directed away from the wall`,
                },
                { type: "callout", tone: "warning", title: "A bigger force is not automatically a bigger impulse", md: r`Impulse is the product $F\,\Delta t$. A hammer blow of $2000\,\text{N}$ lasting $0.001\,\text{s}$ delivers $2\,\text{N·s}$; a $50\,\text{N}$ push lasting $1\,\text{s}$ delivers $50\,\text{N·s}$, twenty-five times more. Also keep the units straight: an impulse in $\text{N·s}$ is not a force in $\text{N}$. You only get the average force after dividing by the time.` },
                { type: "check", questionId: Q("imp-2"), lead: "From change in momentum to average force." },
                { type: "callout", tone: "warning", title: "Net force versus the force from one object", md: r`$\Delta p / \Delta t$ gives the **net** force. When a person lands on the ground, two forces act during the stop: the ground pushes up and gravity pulls down. The impulse–momentum theorem fixes their sum, so the ground's push is the net force **plus** the weight:

$$F_{\text{ground}} - mg = \frac{\Delta p}{\Delta t}$$

For very brief, violent collisions the weight is tiny by comparison and is often ignored; for slower stops it matters.` },
                { type: "summary", points: [r`Impulse $\vec J = \vec F_{\text{avg}}\Delta t$, in $\text{N·s}$ ($= \text{kg·m/s}$).`, r`The net impulse equals the change in momentum: $\vec F_{\text{avg}}\Delta t = \Delta\vec p$.`, "The same impulse can come from a large force briefly or a small force for longer.", r`Average force $= \Delta p / \Delta t$; this is the net force, so include gravity when finding a contact force.`] },
              ],
            },
            {
              id: L("force-time-safety"),
              title: "Force–time graphs and softer stops",
              summary: "Read impulse as the area under a force–time graph, and see why stretching out a collision reduces the force without changing the impulse.",
              estMinutes: 15,
              skillIds: [S("force-time-graphs"), S("collision-time-safety")],
              blocks: [
                { type: "text", md: r`Real collision forces are not constant. When a foot kicks a ball, the force builds up from zero as the ball squashes, peaks, and falls back to zero as the ball leaves. A force sensor records this as a **force–time graph**: a pulse a few milliseconds wide.

For a constant force, $F\Delta t$ is the area of a rectangle on such a graph. The same idea works for any shape.` },
                { type: "callout", tone: "key", title: "Impulse is the area under a force–time graph", md: r`The impulse delivered by a force equals the **area between the force–time graph and the time axis**.

- Area above the axis is positive impulse; area below is negative.
- A triangle's area is $\tfrac12 \times \text{base} \times \text{height}$.
- Split other shapes into rectangles and triangles and add them.

The **average force** is the height of a rectangle with the same area and the same width: $F_{\text{avg}} = J / \Delta t$.` },
                {
                  type: "worked_example",
                  title: "A tennis serve",
                  problem: r`The force of a racket on a $0.058\,\text{kg}$ tennis ball (initially almost at rest) rises in a straight line from $0$ to $1400\,\text{N}$ in $2.5\,\text{ms}$, then falls in a straight line to $0$ over the next $2.5\,\text{ms}$. Find (a) the impulse, (b) the ball's speed afterward, (c) the average force.`,
                  steps: [
                    { title: "(a) Area of the triangle", md: r`Base $= 5.0\,\text{ms} = 5.0\times10^{-3}\,\text{s}$, height $= 1400\,\text{N}$. $J = \tfrac12(5.0\times10^{-3})(1400) = 3.5\,\text{N·s}$.` },
                    { title: "(b) Speed from the impulse", md: r`$J = \Delta p = mv - 0$, so $v = \dfrac{3.5}{0.058} \approx 60\,\text{m/s}$.` },
                    { title: "(c) Average force", md: r`$F_{\text{avg}} = \dfrac{J}{\Delta t} = \dfrac{3.5}{5.0\times10^{-3}} = 700\,\text{N}$: half the peak, as for any symmetric triangle.` },
                  ],
                  answer: r`(a) $3.5\,\text{N·s}$; (b) about $60\,\text{m/s}$; (c) $700\,\text{N}$`,
                },
                { type: "callout", tone: "warning", title: "Don't multiply the peak by the whole time", md: r`Peak force × duration is the area of the rectangle that encloses the pulse, which overcounts a triangle by a factor of 2. Likewise, the peak force is not the average force. Find the area properly, then divide by the time if you need the average.` },
                { type: "check", questionId: Q("ftg-1"), lead: "Area of a triangular pulse." },
                { type: "check", questionId: Q("ftg-2"), lead: "Which graph has more area?" },
                { type: "text", md: r`## Stretching out the stop

Here is the key question for safety engineering. A passenger in a car crash must go from the car's speed to rest: that **change in momentum is fixed**. What can be designed is **how long** the stop takes.

$$F_{\text{avg}} = \frac{\Delta p}{\Delta t}$$

With $\Delta p$ fixed, a longer $\Delta t$ means a proportionally smaller average force. On a force–time graph, the area stays the same; a longer stop makes the pulse **wider and lower**.` },
                {
                  type: "worked_example",
                  title: "Dashboard or airbag?",
                  problem: r`A $60\,\text{kg}$ passenger moving at $14\,\text{m/s}$ is stopped either by a dashboard in $0.012\,\text{s}$ or by an airbag in $0.20\,\text{s}$. Compare the average forces.`,
                  steps: [
                    { title: "Same change in momentum", md: r`$|\Delta p| = (60)(14) = 840\,\text{kg·m/s}$ either way.` },
                    { title: "Dashboard", md: r`$F = \dfrac{840}{0.012} = 7.0\times10^4\,\text{N}$: about 120 times the passenger's weight.` },
                    { title: "Airbag", md: r`$F = \dfrac{840}{0.20} = 4.2\times10^3\,\text{N}$, about 17 times smaller.` },
                  ],
                  answer: r`$7.0\times10^4\,\text{N}$ versus $4.2\times10^3\,\text{N}$; the impulse ($840\,\text{N·s}$) is the same`,
                },
                { type: "callout", tone: "warning", title: "Cushions reduce the force, not the impulse", md: r`It is a common slip to say an airbag "reduces your momentum change" or "absorbs the impulse". It cannot: you go from moving to stopped whatever stops you, so $\Delta p$, and therefore the impulse, is the same. The airbag's only job is to make $\Delta t$ longer, which makes the **force** smaller.

The same physics explains crumple zones, padded dashboards, gymnastics mats, bending your knees on landing, and pulling your hands back as you catch a ball.` },
                { type: "check", questionId: Q("safe-1"), lead: "What does an airbag actually change?" },
                { type: "callout", tone: "tip", title: "Bouncing makes it worse", md: r`If a helmet liner or a dashboard makes your head bounce back, the change in momentum is **bigger** (stop, then reverse). In the same contact time, that means a bigger force. Good protective materials crush and absorb rather than spring back.` },
                { type: "check", questionId: Q("safe-2"), lead: "How much smaller is the force?" },
                { type: "note_prompt", prompt: "Explain in your own words why an airbag reduces injury. Use the words impulse, change in momentum, time and average force.", suggestedTitle: "Why airbags work", starter: "**Fixed:** the passenger's change in momentum (and so the impulse).\n**Changed:** \n**Result:** \n\nLinks: [[Impulse and average force]] [[Stopping time and safety]]" },
                { type: "summary", points: ["Impulse is the signed area under a force–time graph; use ½ × base × height for triangles.", r`Average force $= J/\Delta t$: for a symmetric triangle, half the peak.`, r`For a fixed change in momentum, $F_{\text{avg}} \propto 1/\Delta t$: a longer stop means a smaller force.`, "Airbags, crumple zones, mats and bent knees lengthen the stop; they do not change the impulse.", "A bounce increases the change in momentum, and so the force, for the same contact time."] },
              ],
            },
          ],
        },

        // ───────────────────────────── Topic 3 ─────────────────────────────
        {
          id: T("conservation"),
          title: "Systems and conservation of momentum",
          description: "Choose a system, sort forces into internal and external, and use conservation of momentum to predict the outcome of collisions along a line.",
          objectives: [
            { id: "physics-1.o.4e", code: "PHYS-4.E", description: "Choose a system, identify internal and external forces, and justify whether the system's total momentum is conserved.", skillIds: [S("systems-external-forces")] },
            { id: "physics-1.o.4f", code: "PHYS-4.F", description: "Apply conservation of momentum to one-dimensional collisions to determine unknown velocities or masses.", skillIds: [S("conservation-1d")] },
          ],
          lessons: [
            {
              id: L("systems"),
              title: "Choosing a system: internal and external forces",
              summary: "Why forces between parts of a system cannot change its total momentum, and how to decide when momentum is conserved.",
              estMinutes: 13,
              skillIds: [S("systems-external-forces")],
              blocks: [
                { type: "text", md: r`When two carts collide, each one pushes on the other. Cart A's momentum changes; so does cart B's. Is there anything that **doesn't** change? To answer that, we draw a boundary around the objects we care about and call what is inside **the system**.` },
                { type: "definition", term: "Internal and external forces", md: r`Once a system is chosen, an **internal force** is one exerted by one part of the system on another part. An **external force** is one exerted on the system by something outside it. The same force can be internal for one choice of system and external for another.` },
                { type: "text", md: r`## Why internal forces cancel

Newton's third law says that when A pushes on B, B pushes back on A with a force of the **same size** in the **opposite direction**, and the two forces last **exactly as long** as each other (they start and stop together). So their impulses are equal and opposite:

$$\vec J_{\text{on A}} = -\vec J_{\text{on B}} \quad\Longrightarrow\quad \Delta\vec p_A = -\Delta\vec p_B$$

Whatever momentum A gains, B loses. Add them up and the total momentum of the A + B system does not change.` },
                { type: "callout", tone: "key", title: "Conservation of momentum", md: r`If the net external force on a system is zero (or its impulse is negligible), the **total momentum of the system is constant**:

$$\vec p_{\text{total, before}} = \vec p_{\text{total, after}}$$

Internal forces, however large, only move momentum from one part of the system to another.` },
                { type: "check", questionId: Q("sys-1"), lead: "Internal or external?" },
                { type: "callout", tone: "warning", title: "The big object does not push harder", md: r`In a collision between a truck and a small car, the forces on the two vehicles are **equal in size**: a third-law pair. So are their changes in momentum. The car fares worse because the same change in momentum, divided by a much smaller mass, gives it a much larger change in velocity (and a much larger acceleration).` },
                { type: "check", questionId: Q("sys-2"), lead: "Truck versus car." },
                {
                  type: "worked_example",
                  title: "Is momentum conserved?",
                  problem: r`For each case, decide whether the stated system's momentum is conserved. (a) A ball falling freely; system: the ball. (b) The same ball; system: the ball and Earth. (c) Two pucks colliding on a level air table; system: both pucks.`,
                  steps: [
                    { title: "(a) Ball alone", md: r`Earth is outside the system, so gravity is an external force. The ball speeds up: its momentum is **not** conserved.` },
                    { title: "(b) Ball and Earth", md: r`Gravity is now internal: the ball pulls Earth up as hard as Earth pulls the ball down. The ball's downward momentum is matched by an equal upward momentum of Earth (which, with its enormous mass, has an immeasurably small velocity). Total momentum **is** conserved.` },
                    { title: "(c) Two pucks", md: r`External forces: gravity and the air cushion's upward push, which cancel. No horizontal external force. The collision forces are internal. Horizontal momentum **is** conserved.` },
                  ],
                  answer: "(a) No; (b) yes; (c) yes",
                },
                { type: "callout", tone: "tip", title: "Brief collisions: external forces barely matter", md: r`Real systems are rarely perfectly isolated: cars in a crash feel road friction. But impulse is force × time. During a collision lasting a few hundredths of a second, the enormous collision forces swamp the modest external ones, so the external impulse is negligible. That is why "momentum just before = momentum just after" works so well for collisions and explosions.` },
                { type: "summary", points: ["Choose a system first; forces between its parts are internal, forces from outside are external.", "Internal forces come in third-law pairs with equal and opposite impulses, so they cannot change the total momentum.", "A system's total momentum is conserved when the net external force (or its impulse) is zero.", "In a collision both objects get equal and opposite changes in momentum; the lighter one's velocity changes more.", "For brief collisions, external impulses are usually negligible."] },
              ],
            },
            {
              id: L("conservation-1d"),
              title: "Conservation of momentum in one dimension",
              summary: "Set up and solve 'momentum before = momentum after' for collisions along a line, with careful signs.",
              estMinutes: 14,
              skillIds: [S("conservation-1d")],
              blocks: [
                { type: "text", md: r`Conservation of momentum lets you predict the outcome of a collision without knowing anything about the forces involved. For two objects moving along a line:` },
                { type: "formula", latex: r`m_1v_{1i} + m_2v_{2i} = m_1v_{1f} + m_2v_{2f}`, caption: "Total momentum before equals total momentum after (no net external force). Every velocity carries its sign." },
                { type: "callout", tone: "key", title: "A reliable method", md: r`1. **Choose the system** (usually both colliding objects) and check that external forces can be ignored.
2. **Choose a positive direction** and write every velocity with its sign.
3. **Write the total momentum before** and **the total after**, with the unknown as a symbol.
4. **Set them equal** and solve.
5. **Check** that the answer is sensible: does the direction make sense? Is the answer within a believable range?` },
                {
                  type: "worked_example",
                  title: "Head-on collision of two carts",
                  problem: r`A $4.0\,\text{kg}$ cart moving at $+3.0\,\text{m/s}$ hits a $2.0\,\text{kg}$ cart moving at $-2.0\,\text{m/s}$ on a frictionless track. After the collision the $2.0\,\text{kg}$ cart moves at $+3.0\,\text{m/s}$. Find the velocity of the $4.0\,\text{kg}$ cart.`,
                  steps: [
                    { title: "Momentum before", md: r`$(4.0)(+3.0) + (2.0)(-2.0) = 12 - 4.0 = +8.0\,\text{kg·m/s}$.` },
                    { title: "Momentum after", md: r`$(4.0)v + (2.0)(+3.0) = 4.0v + 6.0$.` },
                    { title: "Set equal and solve", md: r`$4.0v + 6.0 = 8.0 \Rightarrow v = +0.50\,\text{m/s}$.` },
                    { title: "Check", md: r`The heavy cart slowed from $3.0$ to $0.50\,\text{m/s}$ (lost $10\,\text{kg·m/s}$); the light cart went from $-2.0$ to $+3.0\,\text{m/s}$ (gained $10\,\text{kg·m/s}$). Equal and opposite, as they must be.` },
                  ],
                  answer: r`$+0.50\,\text{m/s}$ (still moving forward, more slowly)`,
                },
                { type: "check", questionId: Q("cons-1"), lead: "One unknown velocity." },
                { type: "callout", tone: "warning", title: "Opposite directions, opposite signs", md: r`When the objects move toward each other, one momentum is negative. Adding the sizes (here $12 + 4 = 16$ instead of $12 - 4 = 8$) is the most common error in collision problems. Write the sign into every velocity before you multiply, and let the algebra decide which way things go.` },
                { type: "check", questionId: Q("cons-2"), lead: "Total momentum of carts moving toward each other." },
                { type: "callout", tone: "tip", title: "Momentum can rule outcomes out", md: r`Conservation of momentum alone does not tell you exactly how two objects come apart: many outcomes have the right total. But any proposed outcome with the wrong total is impossible. (In the next topic, kinetic energy narrows the possibilities further.)` },
                { type: "tutor_prompt", prompts: ["How do I know which direction to call positive?", "Why can I ignore friction during a collision?", "What if my answer for a velocity comes out negative?"] },
                { type: "summary", points: [r`With no net external force: $m_1v_{1i} + m_2v_{2i} = m_1v_{1f} + m_2v_{2f}$.`, "Choose a positive direction and sign every velocity before multiplying.", "Solve for the one unknown; a negative result just means motion in the negative direction.", "Check that the two objects' changes in momentum are equal and opposite.", "An outcome that changes the total momentum is impossible."] },
              ],
            },
          ],
        },

        // ───────────────────────────── Topic 4 ─────────────────────────────
        {
          id: T("collisions"),
          title: "Collisions and explosions",
          description: "Objects that stick together, collisions classified by what happens to kinetic energy, and explosions and recoil where objects push apart.",
          objectives: [
            { id: "physics-1.o.4g", code: "PHYS-4.G", description: "Determine the common velocity in perfectly inelastic collisions and compare kinetic energy before and after to classify a collision as elastic, inelastic or perfectly inelastic.", skillIds: [S("perfectly-inelastic"), S("collision-kinetic-energy")] },
            { id: "physics-1.o.4h", code: "PHYS-4.H", description: "Apply conservation of momentum to explosions and recoil, and relate the pieces' speeds and kinetic energies to their masses.", skillIds: [S("explosions-recoil")] },
          ],
          lessons: [
            {
              id: L("sticking"),
              title: "Sticking together: perfectly inelastic collisions",
              summary: "When colliding objects lock together they share one velocity, which makes conservation of momentum especially simple.",
              estMinutes: 12,
              skillIds: [S("perfectly-inelastic")],
              blocks: [
                { type: "text", md: r`A dart sinks into a target. Two rail cars couple. A linebacker wraps up a running back. In each case, the objects move off **together**, with a single shared velocity. That removes one unknown and makes the collision easy to solve.` },
                { type: "definition", term: "Perfectly inelastic collision", md: r`A collision in which the objects stick together and move with a common final velocity. Momentum is conserved (for an isolated system); kinetic energy is not.` },
                { type: "formula", latex: r`m_1v_{1i} + m_2v_{2i} = (m_1 + m_2)\,v_f`, caption: "Perfectly inelastic: one shared final velocity." },
                {
                  type: "worked_example",
                  title: "Coupling rail cars",
                  problem: r`A $10\,000\,\text{kg}$ rail car moving at $4.0\,\text{m/s}$ runs into and couples with a $30\,000\,\text{kg}$ car moving at $1.2\,\text{m/s}$ in the same direction. Find their speed after coupling.`,
                  steps: [
                    { title: "Momentum before", md: r`$(10\,000)(4.0) + (30\,000)(1.2) = 40\,000 + 36\,000 = 76\,000\,\text{kg·m/s}$.` },
                    { title: "Share it among the combined mass", md: r`$v_f = \dfrac{76\,000}{40\,000} = 1.9\,\text{m/s}$.` },
                    { title: "Sense check", md: r`The answer lies between the two initial speeds, and much closer to the heavy car's $1.2\,\text{m/s}$ than to $4.0\,\text{m/s}$, because the heavy car counts for more.` },
                  ],
                  answer: r`$1.9\,\text{m/s}$`,
                },
                { type: "callout", tone: "warning", title: "Not the average of the velocities", md: r`The common velocity is **total momentum ÷ total mass**: a *mass-weighted* average. The plain average of the two velocities ($2.6\,\text{m/s}$ above) is right only when the masses are equal. A $1\,\text{kg}$ ball of clay hitting a $9\,\text{kg}$ cart at rest leaves the pair at one-tenth of the clay's speed, not half.` },
                { type: "check", questionId: Q("stick-1"), lead: "Car meets truck." },
                { type: "text", md: r`## Head-on: momenta can cancel

If the objects move toward each other, their momenta have opposite signs and partly cancel. The wreckage moves in the direction of the larger momentum, and if the momenta are equal and opposite, the combined object stops dead, however fast the pieces were moving.` },
                { type: "check", questionId: Q("stick-2"), lead: "Equal and opposite momenta." },
                { type: "callout", tone: "info", title: "Working backward", md: r`Measuring a final velocity lets you find an initial one. That is how a **ballistic pendulum** measures a bullet's speed: the bullet embeds in a hanging block (perfectly inelastic, momentum conserved), then the block swings up (energy conserved during the swing). The two steps must be kept separate: kinetic energy is **not** conserved while the bullet embeds.` },
                { type: "summary", points: [r`Perfectly inelastic: objects stick and share one velocity, $v_f = \dfrac{m_1v_{1i} + m_2v_{2i}}{m_1 + m_2}$.`, "The common velocity is a mass-weighted average, not the plain average of the velocities.", "In head-on sticking collisions the momenta partly cancel; equal and opposite momenta leave the wreck at rest.", "Momentum is conserved in the collision; kinetic energy is not."] },
              ],
            },
            {
              id: L("collision-energy"),
              title: "Kinetic energy in collisions: elastic or inelastic?",
              summary: "Momentum is conserved in every isolated collision, but kinetic energy only sometimes. Use that to classify collisions and to spot impossible outcomes.",
              estMinutes: 15,
              skillIds: [S("collision-kinetic-energy")],
              blocks: [
                { type: "text", md: r`In every collision of an isolated system, momentum is conserved. **Kinetic energy** ($KE = \tfrac12mv^2$) is a different story: when objects crumple, heat up or make a noise, some of their kinetic energy turns into those other forms. Comparing the kinetic energy before and after sorts collisions into three types.` },
                { type: "text", md: r`| Type | Momentum | Kinetic energy | What it looks like |
|---|---|---|---|
| **Elastic** | conserved | conserved | objects bounce apart with no lasting deformation (billiard balls, magnetic bumpers, atoms) |
| **Inelastic** | conserved | decreases | objects bounce apart but something is dented, warmed or noisy |
| **Perfectly inelastic** | conserved | decreases the most possible | objects stick together |` },
                { type: "callout", tone: "key", title: "Momentum always, kinetic energy sometimes", md: r`Momentum is conserved because internal impulses cancel exactly; momentum has no other form to turn into. Kinetic energy is just one form of energy, and in an inelastic collision some of it becomes thermal energy, sound and the work of permanent deformation. Total energy is still conserved; **kinetic** energy is not.` },
                {
                  type: "worked_example",
                  title: "Classifying a collision",
                  problem: r`A $2.0\,\text{kg}$ cart moving at $+4.0\,\text{m/s}$ hits a $3.0\,\text{kg}$ cart at rest. Afterward the $2.0\,\text{kg}$ cart moves at $+1.0\,\text{m/s}$ and the $3.0\,\text{kg}$ cart at $+2.0\,\text{m/s}$. Classify the collision.`,
                  steps: [
                    { title: "Check momentum", md: r`Before: $(2.0)(4.0) = 8.0\,\text{kg·m/s}$. After: $(2.0)(1.0) + (3.0)(2.0) = 8.0\,\text{kg·m/s}$ ✓.` },
                    { title: "Kinetic energy before", md: r`$\tfrac12(2.0)(4.0)^2 = 16\,\text{J}$.` },
                    { title: "Kinetic energy after", md: r`$\tfrac12(2.0)(1.0)^2 + \tfrac12(3.0)(2.0)^2 = 1.0 + 6.0 = 7.0\,\text{J}$.` },
                    { title: "Classify", md: r`$9.0\,\text{J}$ of kinetic energy has gone, but the carts move apart separately: **inelastic** (not perfectly inelastic).` },
                  ],
                  answer: r`Inelastic: momentum conserved, $9.0\,\text{J}$ of kinetic energy converted`,
                },
                { type: "check", questionId: Q("ke-1"), lead: "How much kinetic energy did the crash convert?" },
                { type: "callout", tone: "warning", title: "Don't assume kinetic energy is conserved", md: r`Using "kinetic energy before = kinetic energy after" for a sticking or crumpling collision gives wrong answers, sometimes wildly wrong (for a ballistic pendulum, a bullet speed ten times too small). Use kinetic energy conservation only when a problem says the collision is elastic, or when you have checked.

And the reverse error: momentum is **not** "lost as heat" in an inelastic collision. Only kinetic energy is.` },
                { type: "check", questionId: Q("ke-2"), lead: "Elastic, inelastic or perfectly inelastic?" },
                { type: "text", md: r`## Momentum and kinetic energy are linked, but different

Since $p = mv$, kinetic energy can be written in terms of momentum:

$$KE = \tfrac12mv^2 = \frac{p^2}{2m}$$

So two objects with the **same momentum** have **different** kinetic energies if their masses differ: the lighter one, moving faster, has more kinetic energy.` },
                { type: "callout", tone: "tip", title: "Kinetic energy can't appear from nowhere", md: r`In a collision with no stored energy released (no springs, no explosives), the total kinetic energy afterward can equal or be less than the total before, but never more. That gives a second test for proposed outcomes: an outcome that conserves momentum but **increases** kinetic energy is impossible.` },
                { type: "summary", points: ["Momentum is conserved in every isolated collision; kinetic energy only in elastic ones.", "Elastic: kinetic energy unchanged. Inelastic: some lost. Perfectly inelastic: objects stick and the most is lost.", "Lost kinetic energy becomes thermal energy, sound and deformation; momentum is never 'lost'.", r`$KE = p^2/2m$: equal momenta do not mean equal kinetic energies.`, "Without a stored energy source, a collision cannot increase the total kinetic energy."] },
              ],
            },
            {
              id: L("explosions"),
              title: "Explosions and recoil",
              summary: "A collision run backward: objects that push apart share zero (or unchanged) total momentum, so lighter pieces fly off faster.",
              estMinutes: 13,
              skillIds: [S("explosions-recoil")],
              blocks: [
                { type: "text", md: r`A rifle kicks back when it fires. Two skaters who push off each other glide apart. A firework bursts into glowing fragments. These are all **explosions** in the physics sense: internal forces push the parts of a system apart. Since the forces are internal, the total momentum does not change. If the system starts at rest, it **stays** at zero total momentum.` },
                { type: "formula", latex: r`0 = m_1v_1 + m_2v_2 \quad\Longrightarrow\quad m_1v_1 = -m_2v_2`, caption: "Two objects pushing apart from rest: equal and opposite momenta." },
                { type: "callout", tone: "key", title: "Equal momenta, unequal speeds", md: r`The two pieces get momenta of **equal size** in **opposite directions**. Their speeds are therefore inversely proportional to their masses:

$$\frac{v_1}{v_2} = \frac{m_2}{m_1}$$

A rifle 400 times heavier than its bullet recoils at $\tfrac1{400}$ of the bullet's speed.` },
                {
                  type: "worked_example",
                  title: "Recoil of a toy cannon",
                  problem: r`A $1.2\,\text{kg}$ toy cannon on a frictionless track fires a $0.030\,\text{kg}$ ball forward at $+16\,\text{m/s}$. Both start at rest. Find the cannon's recoil velocity.`,
                  steps: [
                    { title: "Total momentum before", md: r`Zero: everything is at rest.` },
                    { title: "Total momentum after", md: r`$(0.030)(+16) + (1.2)v = 0.48 + 1.2v$.` },
                    { title: "Solve", md: r`$0.48 + 1.2v = 0 \Rightarrow v = -0.40\,\text{m/s}$.` },
                  ],
                  answer: r`$-0.40\,\text{m/s}$: backward, 40 times slower than the ball`,
                },
                { type: "check", questionId: Q("boom-1"), lead: "Rifle recoil." },
                { type: "callout", tone: "warning", title: "Same momentum, not same speed", md: r`A frequent slip is to give both pieces the same speed. Check with momentum: equal speeds and unequal masses would give a nonzero total, which internal forces cannot produce.` },
                { type: "check", questionId: Q("boom-2"), lead: "Two skaters push off." },
                { type: "text", md: r`## Where does the energy come from?

Before the explosion nothing moves, so the kinetic energy is zero. Afterward both pieces move, so the kinetic energy is positive, even though the total **momentum** is still zero. That is no contradiction: momentum is a vector, and equal and opposite momenta cancel; kinetic energy is a scalar that is never negative, so the pieces' energies **add**. The energy comes from a store inside the system: chemical energy in gunpowder, elastic energy in a spring, or the muscles of the skaters.

Since $KE = p^2/2m$ and the momenta are equal in size, the **lighter piece gets more of the kinetic energy**.` },
                { type: "callout", tone: "tip", title: "Explosions on the move", md: r`If the system is already moving, the total momentum is not zero, but it is still unchanged. A $3.0\,\text{kg}$ object moving at $+2.0\,\text{m/s}$ that splits in two must still have pieces whose momenta add to $+6.0\,\text{kg·m/s}$.` },
                { type: "summary", points: ["In an explosion or push-off the forces are internal, so the total momentum is unchanged (zero, if it started at rest).", r`Starting from rest, the pieces get equal and opposite momenta; speeds are inversely proportional to masses.`, "Kinetic energy increases in an explosion; it comes from stored chemical, elastic or muscular energy.", "With equal momenta, the lighter piece has more kinetic energy.", "If the system was already moving, the pieces' momenta add to the original momentum."] },
              ],
            },
          ],
        },

        // ───────────────────────────── Topic 5 ─────────────────────────────
        {
          id: T("two-dimensions"),
          title: "Momentum in two dimensions",
          description: "Treat momentum as a vector in a plane and conserve each component separately in perpendicular collisions and explosions.",
          objectives: [
            { id: "physics-1.o.4i", code: "PHYS-4.I", description: "Resolve and combine momentum vectors in two dimensions, and apply conservation of momentum separately to perpendicular components in collisions and explosions.", skillIds: [S("momentum-2d")] },
          ],
          lessons: [
            {
              id: L("two-dimensions"),
              title: "Momentum vectors in two dimensions",
              summary: "Split momentum into components, conserve x and y separately, and recombine with the Pythagorean theorem.",
              estMinutes: 17,
              skillIds: [S("momentum-2d")],
              blocks: [
                { type: "text", md: r`Cars meet at a crossroads, pucks glance off each other on an air table, a shell bursts into three fragments. The motion is no longer along a single line, so the signs we have been using are not enough: we need the full **vector** nature of momentum. The good news is that you already have the tools from vectors in kinematics.` },
                { type: "callout", tone: "key", title: "Conserve each component separately", md: r`If no net external force acts, the total momentum vector is constant. That means **both components** are constant, independently:

$$p_{x,\text{before}} = p_{x,\text{after}} \qquad p_{y,\text{before}} = p_{y,\text{after}}$$

Two-dimensional problems become two one-dimensional problems, one for each axis.` },
                { type: "text", md: r`## Components of momentum

An object of mass $m$ moving at speed $v$ at angle $\theta$ above the $+x$ axis has

$$p_x = mv\cos\theta \qquad p_y = mv\sin\theta$$

Going the other way, from components to magnitude and direction:

$$p = \sqrt{p_x^2 + p_y^2} \qquad \tan\theta = \frac{p_y}{p_x}$$` },
                { type: "check", questionId: Q("twod-1"), lead: "Resolve a momentum." },
                { type: "callout", tone: "warning", title: "Perpendicular momenta don't simply add", md: r`$3\,\text{kg·m/s}$ east plus $4\,\text{kg·m/s}$ north is **not** $7\,\text{kg·m/s}$. The two momenta are the legs of a right triangle and the total is the hypotenuse: $\sqrt{3^2 + 4^2} = 5\,\text{kg·m/s}$, pointing about $53^\circ$ north of east. Add components, then combine.` },
                { type: "check", questionId: Q("twod-2"), lead: "Add two perpendicular momenta." },
                {
                  type: "worked_example",
                  title: "Collision at an icy crossroads",
                  problem: r`A $1200\,\text{kg}$ car moving east at $15\,\text{m/s}$ collides with a $1500\,\text{kg}$ van moving north at $8.0\,\text{m/s}$. They lock together. Find the speed and direction of the wreck just after the collision.`,
                  steps: [
                    { title: "x-momentum (east)", md: r`Only the car moves east: $p_x = (1200)(15) = 18\,000\,\text{kg·m/s}$.` },
                    { title: "y-momentum (north)", md: r`Only the van moves north: $p_y = (1500)(8.0) = 12\,000\,\text{kg·m/s}$.` },
                    { title: "Total momentum (conserved)", md: r`$p = \sqrt{18\,000^2 + 12\,000^2} \approx 21\,600\,\text{kg·m/s}$.` },
                    { title: "Speed of the wreck", md: r`$v = \dfrac{p}{m_{\text{total}}} = \dfrac{21\,600}{2700} \approx 8.0\,\text{m/s}$.` },
                    { title: "Direction", md: r`$\tan\theta = \dfrac{12\,000}{18\,000} \approx 0.667$, so $\theta \approx 34^\circ$ north of east.` },
                  ],
                  answer: r`About $8.0\,\text{m/s}$ at $34^\circ$ north of east`,
                },
                { type: "callout", tone: "warning", title: "Use momenta, not velocities, for the direction", md: r`The wreck moves along the **total momentum**, so the angle comes from $p_y/p_x$, which includes the masses. Using the velocities ($8.0/15$) gives the wrong angle unless the masses happen to be equal.` },
                { type: "text", md: r`## Glancing collisions and explosions

The same component bookkeeping handles every perpendicular case:

- **A puck at rest is struck.** There was no y-momentum before, so after the collision the two pucks' y-momenta must be equal and opposite: they fly off on opposite sides of the original line.
- **An object at rest bursts into three pieces.** The total stays zero, so the third piece's momentum is equal and opposite to the vector sum of the other two.
- **Change in momentum in 2-D.** A ball that turns from east to north at the same speed has had its momentum changed: subtract the vectors component by component.` },
                { type: "check", questionId: Q("twod-3"), lead: "What is conserved in a glancing collision?" },
                { type: "tutor_prompt", prompts: ["Why can I treat the x and y directions separately?", "How do I find the direction of the total momentum?", "What happens to the y-momentum when a puck moving along x hits a puck at rest?"] },
                { type: "summary", points: [r`In two dimensions, momentum has components $p_x = mv\cos\theta$, $p_y = mv\sin\theta$.`, "With no net external force, the x- and y-components of total momentum are each conserved.", r`Combine components with $p = \sqrt{p_x^2 + p_y^2}$ and $\tan\theta = p_y/p_x$; never add perpendicular magnitudes directly.`, "Directions after a collision come from momentum components, which include the masses.", "Pieces of an object at rest must have momenta that add (as vectors) to zero."] },
              ],
            },
          ],
        },

        // ───────────────────────────── Topic 6 ─────────────────────────────
        {
          id: T("center-of-mass"),
          title: "The center of mass of a system",
          description: "Find where a system's center of mass is and how fast it moves, and use the fact that only external forces can change that motion.",
          objectives: [
            { id: "physics-1.o.4j", code: "PHYS-4.J", description: "Determine the velocity of a system's center of mass from its total momentum, and predict that it is unchanged by collisions, explosions and other internal interactions.", skillIds: [S("center-of-mass-velocity")] },
          ],
          lessons: [
            {
              id: L("center-of-mass"),
              title: "The velocity of a system's center of mass",
              summary: "A system moves as if all its mass were at the center of mass, and internal forces cannot change that point's velocity.",
              estMinutes: 15,
              skillIds: [S("center-of-mass-velocity")],
              blocks: [
                { type: "text", md: r`When a firework bursts, the fragments fly in every direction, yet the cloud of sparks as a whole keeps drifting along the shell's original path. There is a single point that keeps moving smoothly through all the chaos: the system's **center of mass**.` },
                { type: "definition", term: "Center of mass", md: r`The mass-weighted average position of a system. For objects along a line, $x_{\text{cm}} = \dfrac{m_1x_1 + m_2x_2 + \dots}{m_1 + m_2 + \dots}$. It lies closer to the heavier objects.` },
                { type: "text", md: r`Divide each position by a time interval and the same averaging gives the velocity of the center of mass. Its numerator is just the total momentum:` },
                { type: "formula", latex: r`v_{\text{cm}} = \frac{m_1v_1 + m_2v_2 + \dots}{m_1 + m_2 + \dots} = \frac{p_{\text{total}}}{M_{\text{total}}}`, caption: "Velocity of the center of mass: total momentum divided by total mass." },
                { type: "callout", tone: "key", title: "A system moves like one particle at its center of mass", md: r`Rearranged, $p_{\text{total}} = M_{\text{total}}\,v_{\text{cm}}$: the whole system carries momentum as if all its mass moved with the center of mass. So:

- If the total momentum is **constant** (no net external force), $v_{\text{cm}}$ is **constant**.
- Collisions, explosions, springs and push-offs are internal: they rearrange the parts but leave $v_{\text{cm}}$ alone.
- Only a **net external force** can change $v_{\text{cm}}$.` },
                {
                  type: "worked_example",
                  title: "Before and after a sticking collision",
                  problem: r`A $3.0\,\text{kg}$ cart moving at $+4.0\,\text{m/s}$ approaches a $1.0\,\text{kg}$ cart moving at $-2.0\,\text{m/s}$. Find (a) the velocity of the center of mass, (b) the velocity of the carts if they stick together.`,
                  steps: [
                    { title: "(a) Total momentum over total mass", md: r`$v_{\text{cm}} = \dfrac{(3.0)(4.0) + (1.0)(-2.0)}{4.0} = \dfrac{10}{4.0} = +2.5\,\text{m/s}$.` },
                    { title: "(b) After sticking", md: r`Stuck together, the carts move as one object, which must be moving with the center of mass: $+2.5\,\text{m/s}$. (Conservation of momentum gives the same: $10 = 4.0\,v_f$.)` },
                    { title: "Interpret", md: r`The center of mass moved at $+2.5\,\text{m/s}$ before, during and after the collision. The plain average of the velocities, $+1.0\,\text{m/s}$, ignores the masses and is wrong.` },
                  ],
                  answer: r`(a) $+2.5\,\text{m/s}$; (b) $+2.5\,\text{m/s}$`,
                },
                { type: "check", questionId: Q("vcm-1"), lead: "Weight by mass." },
                { type: "callout", tone: "warning", title: "Weighted, not plain, average", md: r`$v_{\text{cm}}$ is a **mass-weighted** average. A $2\,\text{kg}$ cart at $+3\,\text{m/s}$ and a $1\,\text{kg}$ cart at $-3\,\text{m/s}$ have $v_{\text{cm}} = +1\,\text{m/s}$, not zero: the heavier cart counts twice as much.` },
                { type: "text", md: r`## Explosions leave the center of mass alone

- A firework at rest bursts: total momentum zero, so the center of mass **stays put** while fragments fly outward.
- A person walks along a boat floating at rest: the boat slides the other way, and their combined center of mass does not move.
- A shell explodes in mid-flight: gravity is the only external force, so the center of mass of the fragments **continues along the original parabola**. If one fragment drops straight down, the others must land farther away to keep the center of mass on track.` },
                { type: "callout", tone: "warning", title: "Internal forces cannot steer the center of mass", md: r`It can feel as though a violent collision or explosion must change how the system as a whole moves. It cannot: every internal push comes with an equal and opposite push, so the total momentum (and with it $v_{\text{cm}}$) is unchanged. Look for an **external** force before concluding that $v_{\text{cm}}$ changes.` },
                { type: "check", questionId: Q("vcm-2"), lead: "Where is the center of mass after a burst?" },
                { type: "summary", points: [r`Center of mass: the mass-weighted average position, $x_{\text{cm}} = \sum mx / \sum m$.`, r`$v_{\text{cm}} = p_{\text{total}}/M_{\text{total}}$, a mass-weighted average velocity.`, r`With no net external force, $v_{\text{cm}}$ is constant through collisions, explosions and push-offs.`, "Objects that stick together move at the center-of-mass velocity.", "The center of mass of an exploding projectile follows the original parabola."] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: unit4Questions,

  assessments: [
    // Topic 1 — Momentum and its changes
    exercise("calc-momentum", "momentum", "Calculate and compare momentum", "Find momentum with its sign, compare the momenta of different objects, and add up the momentum of a system.", range("mom", 4, 11), 5),
    exercise("change-in-momentum", "momentum", "Find the change in momentum: stops and bounces", "Work out how much an object's momentum changes when it speeds up, stops or rebounds, keeping track of direction.", range("dp", 3, 10), 5),
    // Topic 2 — Impulse and force
    exercise("impulse-theorem", "impulse", "Use impulse to find forces, times and velocities", "Apply the impulse–momentum theorem to find impulses, average forces, contact times and velocities after a push.", range("imp", 3, 11), 6),
    exercise("force-time-graphs", "impulse", "Read impulse from force–time graphs", "Find impulse as the area under force–time graphs of different shapes, and use it to find velocities and average forces.", range("ftg", 3, 10), 5),
    exercise("stopping-safely", "impulse", "Explain why longer stops mean smaller forces", "Use impulse to explain and calculate how airbags, crumple zones, mats and soft catches reduce forces.", range("safe", 3, 10), 5),
    // Topic 3 — Systems and conservation
    exercise("is-momentum-conserved", "conservation", "Decide whether a system's momentum is conserved", "Choose systems, sort forces into internal and external, and use Newton's third law to reason about momentum changes.", range("sys", 3, 11), 6),
    exercise("collisions-1d", "conservation", "Solve one-dimensional collisions", "Use momentum before = momentum after to find unknown velocities and masses in collisions along a line.", range("cons", 3, 11), 6),
    // Topic 4 — Collisions and explosions
    exercise("sticking-collisions", "collisions", "Find the velocity when objects stick together", "Solve perfectly inelastic collisions, including head-on collisions and working back to an initial speed or mass.", range("stick", 3, 11), 6),
    exercise("collision-energy", "collisions", "Check kinetic energy: elastic or inelastic?", "Compare kinetic energy before and after collisions to classify them and to rule out impossible outcomes.", range("ke", 3, 11), 6),
    exercise("explosions-recoil", "collisions", "Work out recoil and explosions", "Find recoil velocities, compare the speeds and energies of pieces that push apart, and handle systems that split while moving.", range("boom", 3, 11), 6),
    // Topic 5 — Two dimensions
    exercise("momentum-vectors", "two-dimensions", "Add momentum vectors in two dimensions", "Resolve momentum into components, add perpendicular momenta, and find the size and direction of a total momentum.", range("twod", 4, 11), 5),
    exercise("perpendicular-collisions", "two-dimensions", "Solve perpendicular collisions and explosions", "Conserve x- and y-momentum separately for objects that stick, glance off each other or burst apart at right angles.", range("twod", 12, 19), 5),
    // Topic 6 — Center of mass
    exercise("cm-velocity", "center-of-mass", "Find the velocity of the center of mass", "Calculate the position and velocity of a system's center of mass as mass-weighted averages.", range("vcm", 3, 10), 5),
    exercise("cm-interactions", "center-of-mass", "Track the center of mass through collisions and explosions", "Use the fact that internal forces leave the center-of-mass velocity unchanged to analyse collisions, explosions and exploding projectiles.", range("vcm", 11, 18), 5),

    {
      id: "physics-1.quiz.u4.1",
      kind: "skill_quiz",
      title: "Quiz 1: momentum, impulse and conservation",
      description: "Seven questions on momentum, changes in momentum, impulse and force–time graphs, stopping safely, systems, and one-dimensional collisions. No hints.",
      unitId: UNIT,
      topicId: T("conservation"),
      questionIds: [Q("mom-12"), Q("dp-11"), Q("imp-12"), Q("ftg-11"), Q("safe-11"), Q("sys-12"), Q("cons-12")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 90 },
    },
    {
      id: "physics-1.quiz.u4.2",
      kind: "skill_quiz",
      title: "Quiz 2: collisions, two dimensions and center of mass",
      description: "Seven questions on sticking collisions, kinetic energy in collisions, recoil, perpendicular collisions and the center of mass. No hints.",
      unitId: UNIT,
      topicId: T("center-of-mass"),
      questionIds: [Q("stick-12"), Q("ke-12"), Q("ke-13"), Q("boom-12"), Q("twod-20"), Q("twod-21"), Q("vcm-19")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 90 },
    },
    {
      id: "physics-1.test.u4",
      kind: "unit_test",
      title: "Unit 4 test: linear momentum",
      description: "Thirteen questions, 26 minutes, covering the whole unit: momentum and impulse, force–time graphs, systems and conservation, elastic and inelastic collisions, explosions, two-dimensional collisions and the center of mass.",
      unitId: UNIT,
      questionIds: [
        Q("mom-13"), Q("dp-12"), Q("imp-13"), Q("ftg-12"), Q("safe-12"), Q("sys-13"), Q("cons-13"),
        Q("stick-13"), Q("ke-14"), Q("boom-13"), Q("twod-22"), Q("twod-23"), Q("vcm-20"),
      ],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 13 * 120 },
    },
    {
      id: "physics-1.exam.u4",
      kind: "exam_practice",
      title: "AP-style practice set: linear momentum",
      description: "Eight original multi-step AP-style items on impulse, collisions, explosions, two-dimensional momentum and the center of mass, under exam-like timing (2 minutes per question).",
      questionIds: [Q("imp-14"), Q("sys-14"), Q("cons-14"), Q("stick-14"), Q("ke-15"), Q("boom-14"), Q("twod-24"), Q("vcm-21")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 8 * 120 },
    },
  ],
};
