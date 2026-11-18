/**
 * AP Physics 1 — Unit 5: Torque and Rotational Dynamics (rotational
 * kinematics, linking linear and angular motion, torque, rotational inertia,
 * rotational equilibrium and Newton's second law for rotation). Assembled into
 * the course in ./index.ts.
 *
 * Original AceAP instructional content. Objective codes ("PHYS-5.C") are
 * AceAP's own and are not College Board codes. Algebra-based throughout;
 * angles in radians, counterclockwise positive, g = 9.8 m/s².
 */
import type { UnitPart } from "./shared";
import { unit5Questions } from "./unit-5.questions";

const r = String.raw;
const S = (id: string) => `physics-1.u5.${id}`;
const Q = (id: string) => `physics-1.q.u5.${id}`;
const M = (id: string) => `physics-1.m.u5.${id}`;
const T = (id: string) => `physics-1.u5.t.${id}`;
const EX = (id: string) => `physics-1.ex.u5.${id}`;
const U = "physics-1.u5";

const rps = r`\,\text{rad/s}`;
const rps2 = r`\,\text{rad/s}^2`;
const Nm = r`\,\text{N}\cdot\text{m}`;
const kgm2 = r`\,\text{kg}\cdot\text{m}^2`;

/** Exercise config: immediate feedback, hints allowed, five questions drawn per attempt. */
const exercise = { feedback: "immediate", assistance: "allowed", questionsPerAttempt: 5 } as const;
const pool = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => Q(`${prefix}-${from + i}`));

export const unit5: UnitPart = {
  skills: [
    {
      id: S("angular-quantities"),
      name: "Angular position, velocity and acceleration",
      description: "Measure angles in radians, convert from degrees, revolutions and rpm, and find angular displacement, angular velocity and angular acceleration with their signs.",
      difficulty: 2,
      keywords: ["radian", "angular position", "angular displacement", "angular velocity", "angular speed", "angular acceleration", "rpm to rad/s", "revolutions to radians", "degrees to radians", "period of rotation", "omega", "alpha", "clockwise counterclockwise sign"],
      prerequisites: ["physics-1.position-displacement", "physics-1.acceleration-concept"],
      patternLabels: { convert: "Converting angles", "average-omega": "Average angular velocity", rpm: "Converting rpm", period: "Angular velocity from the period", "sign-direction": "Signs and directions of rotation", "angular-acceleration": "Calculating angular acceleration", "omega-table": "Reading an angular velocity table" },
    },
    {
      id: S("rotational-kinematics"),
      name: "Constant angular acceleration",
      description: "Choose and apply the constant-angular-acceleration equations, including stopping problems, revolution counts and proportional reasoning.",
      difficulty: 3,
      keywords: ["rotational kinematics", "constant angular acceleration", "omega = omega0 + alpha t", "theta = omega0 t + 1/2 alpha t^2", "omega^2 = omega0^2 + 2 alpha theta", "how many revolutions", "spin down", "spin up", "angular velocity graph"],
      prerequisites: [S("angular-quantities"), "physics-1.kinematic-equations"],
      patternLabels: { analogy: "Linear and rotational twins", "omega-after-time": "Angular velocity after a time", "angle-after-time": "Angle turned in a time", "stopping-angle": "Angle turned while stopping", "revolutions-count": "Counting revolutions", "choose-equation": "Choosing an equation", "omega-after-angle": "Angular velocity after an angle", proportional: "Proportional reasoning", "graph-area": "Angle from an ω–t graph", symbolic: "Results in symbols", "rolling-revolutions": "Revolutions of a rolling wheel" },
    },
    {
      id: S("linear-angular"),
      name: "Linking linear and angular motion",
      description: "Use s = rθ, v = rω and a_t = rα for points on rotating objects, rolling wheels and belt-linked pulleys, recognising that a rigid object shares one angular velocity.",
      difficulty: 2,
      keywords: ["arc length", "s = r theta", "v = r omega", "tangential speed", "tangential acceleration", "rolling without slipping", "points on a rotating object", "same angular velocity different speed", "belt and pulleys"],
      prerequisites: [S("angular-quantities")],
      patternLabels: { "arc-length": "Arc length", "tangential-speed": "Speed of a point", "same-omega": "Points on a rigid object", rolling: "Rolling without slipping", belt: "Belt-linked pulleys", "tangential-accel": "Tangential acceleration", symbolic: "Results in symbols" },
    },
    {
      id: S("rotating-accelerations"),
      name: "Centripetal and tangential acceleration",
      description: "Find the centripetal acceleration rω² and the tangential acceleration rα of a point on a rotating object, and combine them.",
      difficulty: 3,
      keywords: ["centripetal acceleration", "r omega squared", "v^2/r", "tangential acceleration", "total acceleration", "acceleration at constant angular velocity", "direction of acceleration rotating", "centrifuge"],
      prerequisites: [S("linear-angular")],
      patternLabels: { "compute-centripetal": "Calculating centripetal acceleration", "constant-omega": "Acceleration at constant ω", "compare-radii": "Comparing radii", "total-accel": "Total acceleration", direction: "Direction of the acceleration", ratio: "Scaling with ω", "accel-equal": "When the two parts are equal" },
    },
    {
      id: S("torque-magnitude"),
      name: "Calculating torque",
      description: "Calculate torque with τ = rF sin θ or force times lever arm, and explain how the size, position and direction of a force change its turning effect.",
      difficulty: 3,
      keywords: ["torque", "tau = r F sin theta", "lever arm", "moment arm", "line of action", "newton metre", "wrench", "door hinge", "angle of force", "perpendicular component"],
      prerequisites: ["physics-1.vector-components"],
      patternLabels: { perpendicular: "Perpendicular forces", "angled-force": "Forces at an angle", "zero-torque": "Forces with no torque", "lever-arm": "Lever arms", scaling: "What changes the torque", "max-torque": "Getting the largest torque", symbolic: "Torque in symbols", "compare-torques": "Comparing torques", "required-lever-arm": "Lever arm needed", "required-force": "Force needed" },
    },
    {
      id: S("net-torque"),
      name: "Direction of rotation and net torque",
      description: "Assign a sign to each torque from the direction it tends to turn an object, add torques to find the net torque, and predict which way an object will start to rotate.",
      difficulty: 3,
      keywords: ["net torque", "clockwise", "counterclockwise", "sign of torque", "direction of rotation", "sum of torques", "which way will it rotate", "opposing torques"],
      prerequisites: [S("torque-magnitude")],
      patternLabels: { "sign-direction": "Sign of a torque", "net-two-forces": "Net torque of two forces", "direction-of-rotation": "Which way it turns", "net-several": "Net torque of several forces", "zero-net": "Making the net torque zero", "net-angled": "Net torque with angled forces", symbolic: "Net torque in symbols" },
    },
    {
      id: S("inertia-point-masses"),
      name: "Rotational inertia of point masses",
      description: "Calculate rotational inertia as I = Σmr² for point masses, and reason about how it changes with mass, distance and choice of axis.",
      difficulty: 2,
      keywords: ["rotational inertia", "moment of inertia", "I = m r^2", "sum of m r squared", "point masses", "kg m^2", "dumbbell", "distance squared", "axis of rotation"],
      patternLabels: { "single-mass": "One point mass", "several-masses": "Several point masses", ratio: "Scaling with distance", "axis-choice": "Changing the axis", "compare-arrangements": "Comparing arrangements", concept: "Properties of rotational inertia", symbolic: "Rotational inertia in symbols" },
    },
    {
      id: S("inertia-distribution"),
      name: "Mass distribution and extended objects",
      description: "Use given formulas for hoops, discs, spheres and rods, compare objects by how their mass is distributed, and apply the parallel-axis theorem.",
      difficulty: 3,
      keywords: ["hoop vs disc", "solid sphere", "rod about end", "rod about centre", "1/2 M R^2", "M R^2", "parallel axis theorem", "mass distribution", "figure skater arms in", "shape and rotational inertia"],
      prerequisites: [S("inertia-point-masses")],
      patternLabels: { "hoop-vs-disc": "Hoop vs disc", "shape-formula": "Using a shape formula", "compare-shapes": "Ranking shapes", "axis-concept": "Axis through the centre or the end", "parallel-axis": "Parallel-axis theorem", scaling: "Scaling a shape", concept: "Moving mass in or out" },
    },
    {
      id: S("torque-balance"),
      name: "Balancing torques",
      description: "Apply zero net torque to seesaws, levers and metre sticks to find an unknown force, mass or position, including the weight of the beam itself.",
      difficulty: 3,
      keywords: ["seesaw", "balance", "lever", "metre stick", "rotational equilibrium", "clockwise torque equals counterclockwise torque", "where to sit", "crowbar", "balance point", "weight of the beam"],
      prerequisites: [S("net-torque")],
      patternLabels: { "balance-condition": "Condition for balance", "seesaw-position": "Where to sit", "metre-stick": "Metre-stick balance", "several-masses": "Several masses", "beam-weight": "Including the beam's weight", symbolic: "Balance in symbols", "lever-force": "Force from a lever", "balance-point": "Finding the balance point" },
    },
    {
      id: S("static-equilibrium"),
      name: "Static equilibrium",
      description: "Use both conditions for static equilibrium (zero net force and zero net torque) to find support, hinge and cable forces, choosing a convenient pivot.",
      difficulty: 4,
      keywords: ["static equilibrium", "net force zero and net torque zero", "support forces", "beam on two supports", "hinge force", "cable tension", "choose a pivot", "ladder against a wall", "tipping"],
      prerequisites: [S("torque-balance")],
      patternLabels: { conditions: "Conditions for equilibrium", "two-supports": "Beam on two supports", "force-condition": "Using the force condition", "choose-pivot": "Choosing the pivot", "hinge-cable": "Hinged beam and cable", "hinge-force": "Force at a hinge", "both-conditions": "Checking both conditions", tipping: "On the point of tipping", ladder: "Ladder against a wall", "load-shift": "Moving a load" },
    },
    {
      id: S("rotational-second-law"),
      name: "Newton's second law for rotation",
      description: "Apply τ_net = Iα to find angular acceleration, torque or rotational inertia, combine it with rotational kinematics, and recognise that zero net torque means constant angular velocity.",
      difficulty: 4,
      keywords: ["tau = I alpha", "newton's second law for rotation", "net torque and angular acceleration", "zero net torque constant angular velocity", "friction torque", "spin up time", "rotational dynamics"],
      prerequisites: [S("net-torque"), S("inertia-point-masses"), S("rotational-kinematics")],
      patternLabels: { "compute-alpha": "Finding α", "zero-torque": "Zero net torque", "compute-torque": "Finding the torque needed", "with-kinematics": "Torque and spin-up time", "friction-torque": "Friction torque", compare: "Comparing objects", "net-torque-alpha": "Net torque with friction", "tangential-force": "Tangential force on a disc or hoop", "rope-unwind": "Rope unwinding from a cylinder", "inertia-change": "Changing the rotational inertia" },
    },
    {
      id: S("pulley-systems"),
      name: "Pulleys with rotational inertia",
      description: "Analyse a hanging mass on a pulley that has rotational inertia, linking the block's acceleration to the pulley's angular acceleration and finding the acceleration and tension.",
      difficulty: 4,
      keywords: ["massive pulley", "pulley with rotational inertia", "hanging mass", "string wrapped around a pulley", "tension less than weight", "a = R alpha", "a = mg/(m + I/R^2)", "measuring moment of inertia"],
      prerequisites: [S("rotational-second-law"), S("linear-angular")],
      patternLabels: { "tension-concept": "Tension vs weight", "string-link": "Linking a and α", "disc-pulley-accel": "Acceleration with a disc pulley", "tension-value": "Finding the tension", "compare-pulleys": "Comparing pulleys", "general-pulley": "Acceleration with a given I", symbolic: "Acceleration in symbols", "measure-inertia": "Measuring rotational inertia", "table-pulley": "Two blocks and a pulley" },
    },
  ],

  misconceptions: [
    { id: M("revolutions-not-radians"), skillId: S("angular-quantities"), title: "Uses revolutions or degrees where radians are needed", description: "Puts degrees, revolutions or rpm straight into equations such as s = rθ, v = rω or a = rω², or forgets the factor of 2π when converting between revolutions and radians.", remediation: "The rotational equations that link to linear motion only work in radians. Convert first: one revolution is 2π rad and 360°, and one minute is 60 s. Check: a quarter turn is about 1.6 rad, not 90 and not 0.25." },
    { id: M("rotation-sign"), skillId: S("angular-quantities"), title: "Loses track of the sign of a rotation", description: "Treats clockwise and counterclockwise turns or torques as if they had the same sign, or reads the size of a quantity as its sign.", remediation: "State the positive direction (usually counterclockwise, seen from a stated side) before you start. Give every angle, angular velocity, acceleration and torque a sign from the direction it describes, then add with the signs." },
    { id: M("alpha-sign-slowing"), skillId: S("angular-quantities"), title: "Reads the sign of α alone as speeding up or slowing down", description: "Assumes positive angular acceleration means speeding up and negative means slowing down, or that α must point the same way the object spins.", remediation: "Compare the signs of ω and α. Same signs: the spin speeds up. Opposite signs: it slows down. α tells you which way ω is changing, not which way the object turns." },
    { id: M("drops-half-rotation"), skillId: S("rotational-kinematics"), title: "Drops the ½ (or the 2) in the rotational equations", description: "Writes Δθ = αt² instead of ½αt², leaves the 2 out of ω² = ω₀² + 2αΔθ, or uses the final angular velocity for the whole time when speeding up from rest.", remediation: "When ω changes steadily, the average angular velocity is halfway between its start and end values. Δθ = ½(ω₀ + ω)t is a quick check on any answer from the other equations." },
    { id: M("rigid-body-speeds"), skillId: S("linear-angular"), title: "Mixes up which quantity is shared on rotating objects", description: "Thinks every point of a rigid rotating object has the same linear speed, or that points farther out have a greater angular velocity; or that wheels linked by a belt share an angular velocity.", remediation: "Points on one rigid object share θ, ω and α, but their linear speeds are v = rω, so they grow with distance from the axis. Wheels linked by a belt or chain share the belt's speed at their rims, so the smaller wheel has the larger ω." },
    { id: M("centripetal-unsquared"), skillId: S("rotating-accelerations"), title: "Forgets to square ω in a_c = rω²", description: "Uses rω (a speed) as the centripetal acceleration, expects a_c to scale with ω rather than ω², or forgets the square root when solving for ω.", remediation: "a_c = rω² = v²/r. Check units: rω has units of m/s, but an acceleration needs m/s². Doubling ω quadruples a_c." },
    { id: M("constant-omega-no-acceleration"), skillId: S("rotating-accelerations"), title: "Thinks a point rotating at constant ω is not accelerating", description: "Believes a point on an object spinning at a constant rate has zero acceleration because its speed is constant.", remediation: "Acceleration is any change in velocity, including a change of direction. A point moving in a circle has a centripetal acceleration rω² toward the axis even when ω is constant; only its tangential acceleration is zero." },
    { id: M("tangential-centripetal-confusion"), skillId: S("rotating-accelerations"), title: "Confuses tangential and centripetal acceleration", description: "Thinks a point on a speeding-up wheel accelerates only toward the centre or only along its motion, or adds the two perpendicular components as plain numbers.", remediation: "Tangential acceleration a_t = rα changes the speed and points along the motion. Centripetal acceleration a_c = rω² changes the direction and points to the axis. They are perpendicular: combine them with the Pythagorean theorem." },
    { id: M("torque-angle"), skillId: S("torque-magnitude"), title: "Mishandles the angle in τ = rF sin θ", description: "Uses rF for a force that is not perpendicular, uses cos θ instead of sin θ, or uses an angle measured from the wrong line.", remediation: "θ is the angle between the position vector (from axis to where the force acts) and the force. Only the perpendicular component F sin θ turns the object. Sketch it, or find the lever arm: the perpendicular distance from the axis to the line of the force." },
    { id: M("force-not-torque"), skillId: S("torque-magnitude"), title: "Thinks a bigger force always gives a bigger turning effect", description: "Judges turning effect by the size of the force alone, ignoring where it acts and in which direction; for example, expects a large force through the hinge to open a door.", remediation: "What turns an object is torque: force times lever arm. A force whose line passes through the axis gives zero torque, however large. A small force far from the axis can beat a large force close to it." },
    { id: M("torques-add-magnitudes"), skillId: S("net-torque"), title: "Adds torques that turn in opposite directions", description: "Finds a net torque by adding the sizes of all the torques, or ignores an opposing torque such as friction.", remediation: "Give each torque a sign from the way it tends to turn the object, then add. Torques in opposite directions partly cancel; friction always opposes the motion." },
    { id: M("inertia-unsquared"), skillId: S("inertia-point-masses"), title: "Uses mr instead of mr² for rotational inertia", description: "Forgets to square the distance, expecting I to double (not quadruple) when the distance doubles.", remediation: "Each bit of mass contributes m × r². Mass twice as far out counts four times as much. Check units: rotational inertia is in kg·m²." },
    { id: M("inertia-mass-only"), skillId: S("inertia-distribution"), title: "Thinks rotational inertia depends only on mass", description: "Treats rotational inertia as a fixed property like mass: the same for objects of equal mass whatever their shape, and the same about every axis.", remediation: "Rotational inertia depends on how the mass is arranged around the chosen axis. Equal masses can have very different I (a hoop has twice the I of a disc), and moving the axis or moving mass outward changes I." },
    { id: M("balance-equal-weights"), skillId: S("torque-balance"), title: "Thinks balance needs equal weights or equal distances", description: "Expects a seesaw or lever to balance only when the weights (or the distances) on each side are equal, or that adding equal weights to both sides keeps it balanced.", remediation: "Balance needs equal torques: weight × distance on one side equals weight × distance on the other. A lighter child balances a heavier one by sitting farther out." },
    { id: M("ignores-beam-weight"), skillId: S("torque-balance"), title: "Leaves out the weight of the beam itself", description: "Ignores the weight of a plank, metre stick or board, or forgets that it acts at the centre of mass (which may not be at the pivot).", remediation: "Every beam has a weight, acting at its centre of mass (the middle, if it is uniform). Include it in both the force and torque equations; it gives no torque only if the pivot is at the centre of mass." },
    { id: M("equilibrium-forces-only"), skillId: S("static-equilibrium"), title: "Thinks equilibrium needs only zero net force", description: "Believes an object is in equilibrium whenever the forces cancel, forgetting the torque condition, or thinks a balanced object has no forces on it.", remediation: "Static equilibrium needs two conditions: ΣF = 0 (no linear acceleration) and Στ = 0 (no angular acceleration). Two equal and opposite forces at different points can cancel as forces but still spin the object." },
    { id: M("supports-share-equally"), skillId: S("static-equilibrium"), title: "Assumes supports share the load equally", description: "Splits the total weight evenly between two supports regardless of where the loads sit, or keeps the split fixed as a load moves.", remediation: "The force condition fixes only the sum of the support forces. The torque condition decides the split: the support nearer the load carries more. Take torques about one support to find the other." },
    { id: M("zero-torque-no-rotation"), skillId: S("rotational-second-law"), title: "Thinks zero net torque means no rotation", description: "Believes a spinning object needs a net torque to keep spinning, so with zero net torque it must stop or slow down.", remediation: "Net torque changes rotation; it does not maintain it. With zero net torque, α = 0 and ω stays constant: an object at rest stays at rest, and a spinning object keeps spinning at the same rate." },
    { id: M("tension-equals-weight"), skillId: S("pulley-systems"), title: "Assumes the string tension equals the hanging weight", description: "Sets T = mg for a block that is accelerating on a string, so the block would have no net force.", remediation: "Write Newton's second law for the block: mg − T = ma. If the block accelerates downward, T is less than mg. T = mg only when a = 0." },
    { id: M("ignores-pulley-inertia"), skillId: S("pulley-systems"), title: "Ignores the pulley's rotational inertia", description: "Treats a heavy pulley as massless, giving the hanging block an acceleration of g (or the massless-pulley value) and equal tensions on both sides.", remediation: "A pulley with rotational inertia needs a net torque to spin up, so the string must pull on it, which slows the blocks. Include TR = Iα with α = a/R; the pulley acts like an extra mass I/R² in the denominator." },
  ],

  units: [
    {
      id: U,
      number: 5,
      title: "Torque and Rotational Dynamics",
      description: "Describing and explaining rotation: angular position, velocity and acceleration; linking rotation to the motion of points on an object; torque and rotational inertia; balanced objects in static equilibrium; and Newton's second law in rotational form, including pulleys with mass.",
      topics: [
        {
          id: T("rotational-kinematics"),
          title: "Rotational kinematics",
          description: "Describe spinning objects with angles in radians, angular velocity and angular acceleration, and use the constant-angular-acceleration equations.",
          objectives: [
            { id: "physics-1.o.u5.a", code: "PHYS-5.A", description: "Describe rotation using angular position, displacement, velocity and acceleration measured in radians, with a stated sign convention.", skillIds: [S("angular-quantities")] },
            { id: "physics-1.o.u5.b", code: "PHYS-5.B", description: "Apply the constant-angular-acceleration equations to spinning objects.", skillIds: [S("rotational-kinematics")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u5.describing-rotation",
              title: "Describing rotation",
              summary: "Radians, angular displacement, angular velocity and angular acceleration: the rotational versions of position, velocity and acceleration.",
              estMinutes: 14,
              skillIds: [S("angular-quantities")],
              blocks: [
                { type: "text", md: r`So far, objects have been treated as points that move from place to place. But a wheel, a fan or a spinning skater can rotate without going anywhere. To describe that, we swap distances for **angles**.

This unit deals with **rigid objects**: objects that keep their shape, so every point stays the same distance from the rotation axis. When a rigid object turns, every part of it turns through the same angle at the same time. That is what lets one number describe the rotation of the whole object.` },
                { type: "definition", term: "Angular position", md: r`The angle $\theta$ between a line painted on the object (from the axis outward) and a fixed reference direction. As with position on a line, you choose the zero and the positive direction. In this course **counterclockwise is positive**, as seen by a stated viewer.` },
                { type: "definition", term: "Radian", md: r`The natural unit of angle. An angle of $1$ radian makes an arc whose length equals the radius. A full turn has an arc of $2\pi r$ (the circumference), so a full turn is $2\pi$ radians.` },
                { type: "formula", latex: r`\theta\ (\text{in radians}) = \frac{s}{r} \qquad 1\ \text{rev} = 2\pi\ \text{rad} = 360^\circ`, caption: "An angle in radians is arc length divided by radius, so it is a pure ratio. One radian is about 57.3°." },
                { type: "text", md: r`| Angle | Revolutions | Degrees | Radians |
|---|---|---|---|
| Quarter turn | $0.25$ | $90^\circ$ | $\pi/2 \approx 1.57$ |
| Half turn | $0.5$ | $180^\circ$ | $\pi \approx 3.14$ |
| Full turn | $1$ | $360^\circ$ | $2\pi \approx 6.28$ |` },
                { type: "check", questionId: Q("aq-check-1"), lead: "Convert a familiar angle." },
                { type: "definition", term: "Angular displacement", md: r`The change in angular position, $\Delta\theta = \theta_f - \theta_i$. Its sign says which way the object turned: positive for counterclockwise. A wheel that turns two revolutions forward and one back has an angular displacement of one revolution, $2\pi$ rad.` },
                { type: "definition", term: "Angular velocity", md: r`How fast the angle changes: $\omega = \dfrac{\Delta\theta}{\Delta t}$, in radians per second. Its sign gives the direction of spin; its magnitude is the **angular speed**. An object turning steadily with period $T$ (the time for one revolution) has $\omega = \dfrac{2\pi}{T}$.` },
                { type: "formula", latex: r`\omega_{\text{avg}} = \frac{\Delta\theta}{\Delta t} \qquad \omega = \frac{2\pi}{T}`, caption: "Angular velocity in rad/s. The second form is for steady rotation with period T." },
                {
                  type: "worked_example",
                  title: "Converting a spin rate",
                  problem: r`A washing machine drum spins at $900$ rpm (revolutions per minute) during its final cycle. Find its angular velocity in rad/s and the angle it turns through in $10\,\text{s}$.`,
                  steps: [
                    { title: "Revolutions per second", md: r`$900$ rev per $60\,\text{s}$ is $15$ rev/s.` },
                    { title: "Radians per second", md: r`Each revolution is $2\pi$ rad: $\omega = 15 \times 2\pi = 30\pi \approx 94${rps}$.` },
                    { title: "Angle in 10 s", md: r`$\Delta\theta = \omega\,\Delta t \approx (94${rps})(10\,\text{s}) \approx 940\,\text{rad}$, which is $150$ revolutions.` },
                  ],
                  answer: r`$\omega \approx 94${rps}$; about $940\,\text{rad}$ in $10\,\text{s}$`,
                },
                { type: "check", questionId: Q("aq-check-2") },
                { type: "definition", term: "Angular acceleration", md: r`How fast the angular velocity changes: $\alpha = \dfrac{\Delta\omega}{\Delta t}$, in $\text{rad/s}^2$. An angular acceleration of $3${rps2}$ means the angular velocity changes by $3${rps}$ every second.` },
                {
                  type: "worked_example",
                  title: "A fan slowing down",
                  problem: r`Seen from below, a ceiling fan turns counterclockwise (positive) at $18${rps}$. After it is switched to a lower setting, it slows steadily to $6.0${rps}$ in $4.0\,\text{s}$. Find its angular acceleration.`,
                  steps: [
                    { title: "Change in angular velocity", md: r`$\Delta\omega = 6.0 - 18 = -12${rps}$.` },
                    { title: "Divide by the time", md: r`$\alpha = \dfrac{-12${rps}}{4.0\,\text{s}} = -3.0${rps2}$.` },
                    { title: "Interpret the signs", md: r`ω is positive (still counterclockwise) and α is negative: opposite signs, so the fan is slowing down.` },
                  ],
                  answer: r`$\alpha = -3.0${rps2}$`,
                },
                { type: "callout", tone: "warning", title: "Negative α does not always mean slowing down", md: r`Just as in Unit 1, compare signs. **Same signs of ω and α: speeding up. Opposite signs: slowing down.** A wheel spinning clockwise ($\omega < 0$) with $\alpha < 0$ is spinning up. And α need not point the way the object spins: a fan turning counterclockwise while braking has a clockwise α.` },
                { type: "callout", tone: "key", title: "One rotation, one set of numbers", md: r`Every point on a rigid object turns through the same $\Delta\theta$ in the same time, so the whole object has one $\omega$ and one $\alpha$. A point near the rim and a point near the axis have the same angular velocity, even though the rim point covers far more distance. The next topic connects the two.` },
                { type: "summary", points: [r`Angles are measured in radians: $\theta = s/r$, and one revolution is $2\pi$ rad.`, r`Angular displacement $\Delta\theta$, angular velocity $\omega = \Delta\theta/\Delta t$ and angular acceleration $\alpha = \Delta\omega/\Delta t$ mirror $\Delta x$, $v$ and $a$.`, "Counterclockwise is positive; the sign of ω gives the direction of spin.", "Same signs of ω and α: speeding up. Opposite signs: slowing down.", r`To convert rpm to rad/s, divide by 60 and multiply by $2\pi$.`] },
              ],
            },
            {
              id: "physics-1.l.u5.constant-angular-acceleration",
              title: "Constant angular acceleration",
              summary: "The rotational twins of the constant-acceleration equations, and how to pick the right one.",
              estMinutes: 14,
              skillIds: [S("rotational-kinematics")],
              blocks: [
                { type: "text", md: r`When the angular acceleration is constant, rotation follows exactly the same rules as straight-line motion with constant acceleration. Every equation from Unit 1 has a rotational twin, made by swapping symbols:

| Straight line | Rotation |
|---|---|
| position $x$ | angle $\theta$ |
| velocity $v$ | angular velocity $\omega$ |
| acceleration $a$ | angular acceleration $\alpha$ |` },
                { type: "formula", latex: r`\omega = \omega_0 + \alpha t`, caption: "Angular velocity after a time t." },
                { type: "formula", latex: r`\Delta\theta = \omega_0 t + \tfrac12\alpha t^2`, caption: "Angle turned in a time t." },
                { type: "formula", latex: r`\omega^2 = \omega_0^2 + 2\alpha\,\Delta\theta`, caption: "The equation with no time in it." },
                { type: "callout", tone: "tip", title: "Choosing an equation", md: r`List the five quantities $\omega_0$, $\omega$, $\alpha$, $t$ and $\Delta\theta$. Mark the three you know and the one you want. The fifth is the one you neither know nor want: pick the equation that leaves it out. And $\Delta\theta = \tfrac12(\omega_0 + \omega)t$ is a handy fourth equation when α is the missing one.` },
                {
                  type: "worked_example",
                  title: "A fan spinning up",
                  problem: r`A ceiling fan starts from rest and speeds up with a constant angular acceleration of $1.5${rps2}$ for $6.0\,\text{s}$. Find its angular velocity at the end and the number of revolutions it makes.`,
                  steps: [
                    { title: "Angular velocity", md: r`$\omega = \omega_0 + \alpha t = 0 + (1.5)(6.0) = 9.0${rps}$.` },
                    { title: "Angle", md: r`$\Delta\theta = \omega_0 t + \tfrac12\alpha t^2 = 0 + \tfrac12(1.5)(6.0)^2 = 27\,\text{rad}$.` },
                    { title: "Revolutions", md: r`$\dfrac{27}{2\pi} \approx 4.3$ revolutions.` },
                    { title: "Check with the average", md: r`Average angular velocity $\tfrac12(0 + 9.0) = 4.5${rps}$, times $6.0\,\text{s}$, is $27\,\text{rad}$. ✓` },
                  ],
                  answer: r`$9.0${rps}$; about $4.3$ revolutions`,
                },
                { type: "check", questionId: Q("rk-check-1") },
                {
                  type: "worked_example",
                  title: "A wheel coasting to a stop",
                  problem: r`A bicycle is held upside down and one wheel is spun at $25${rps}$. Friction slows it steadily, and it stops after turning through $50\,\text{rad}$. Find its angular acceleration and how long it took to stop.`,
                  steps: [
                    { title: "No time given: use the timeless equation", md: r`$0 = (25)^2 + 2\alpha(50) \Rightarrow \alpha = -\dfrac{625}{100} = -6.25${rps2}$.` },
                    { title: "Now the time", md: r`$t = \dfrac{\omega - \omega_0}{\alpha} = \dfrac{0 - 25}{-6.25} = 4.0\,\text{s}$.` },
                    { title: "Check", md: r`Average $12.5${rps}$ for $4.0\,\text{s}$ gives $50\,\text{rad}$. ✓` },
                  ],
                  answer: r`$\alpha = -6.25${rps2}$; $4.0\,\text{s}$`,
                },
                { type: "callout", tone: "warning", title: "Two easy slips", md: r`**Use radians.** If a problem gives revolutions or rpm, convert them to radians and rad/s before using these equations, and convert back at the end if revolutions are asked for.

**Keep the ½ and the 2.** Leaving the ½ out of $\tfrac12\alpha t^2$, or the 2 out of $2\alpha\Delta\theta$, doubles or halves the answer. The average-angular-velocity check above catches both.` },
                { type: "check", questionId: Q("rk-check-2"), lead: "Starting from rest: watch the ½." },
                { type: "text", md: r`## Angular velocity–time graphs

On a graph of ω against $t$, the **slope** is the angular acceleration and the **area** between the line and the time axis is the angular displacement, just as for velocity–time graphs. A straight sloping line means constant α; a horizontal line means steady spinning.` },
                { type: "tutor_prompt", prompts: ["Why do the rotational equations look exactly like the linear ones?", "How do I decide which rotational kinematics equation to use?", "If I double the time, why does the angle turned from rest go up by four?"] },
                { type: "summary", points: [r`With constant α: $\omega = \omega_0 + \alpha t$, $\Delta\theta = \omega_0 t + \tfrac12\alpha t^2$, $\omega^2 = \omega_0^2 + 2\alpha\Delta\theta$.`, "Choose the equation that leaves out the quantity you neither know nor need.", "Work in radians and rad/s; convert revolutions at the start and the end.", r`$\Delta\theta = \tfrac12(\omega_0 + \omega)t$ is a quick check.`, "On an ω–t graph, slope is α and area is Δθ."] },
              ],
            },
          ],
        },
        {
          id: T("linear-angular"),
          title: "Connecting linear and rotational motion",
          description: "Relate the distance, speed and acceleration of a point on a rotating object to the object's angle, angular velocity and angular acceleration.",
          objectives: [
            { id: "physics-1.o.u5.c", code: "PHYS-5.C", description: "Relate the linear distance, speed and acceleration of a point on a rotating object to the object's angular motion, including centripetal acceleration.", skillIds: [S("linear-angular"), S("rotating-accelerations")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u5.linear-and-angular",
              title: "From spinning to moving",
              summary: "How far, how fast and with what acceleration a point on a rotating object moves: s = rθ, v = rω, a_t = rα and a_c = rω².",
              estMinutes: 16,
              skillIds: [S("linear-angular"), S("rotating-accelerations")],
              blocks: [
                { type: "text", md: r`A rotating object has one angle, one angular velocity and one angular acceleration. But each *point* on it moves along a circle, and points at different distances from the axis cover different distances. The link between the two descriptions is the radius $r$ of each point's circle.` },
                { type: "formula", latex: r`s = r\theta \qquad v = r\omega \qquad a_t = r\alpha`, caption: "Arc length, speed and tangential acceleration of a point at distance r from the axis. Angles must be in radians." },
                { type: "callout", tone: "key", title: "Same ω, different speeds", md: r`On a rigid rotating object every point shares the same $\omega$, but its speed $v = r\omega$ is proportional to its distance from the axis. Points on the axis do not move at all; points on the rim move fastest. On a merry-go-round the rider at the edge is moving much faster than the one near the centre, even though both go round once in the same time.` },
                {
                  type: "worked_example",
                  title: "Two horses on a carousel",
                  problem: r`A carousel turns at a steady $0.50${rps}$. One horse is $4.0\,\text{m}$ from the axis and another is $2.0\,\text{m}$ from it. Find each horse's angular velocity and speed.`,
                  steps: [
                    { title: "Angular velocity", md: r`The carousel is rigid, so both horses have $\omega = 0.50${rps}$.` },
                    { title: "Speeds", md: r`Outer: $v = (4.0)(0.50) = 2.0\,\text{m/s}$. Inner: $v = (2.0)(0.50) = 1.0\,\text{m/s}$.` },
                    { title: "Make sense of it", md: r`The outer horse travels a circle twice as long in the same time, so it moves twice as fast.` },
                  ],
                  answer: r`Both $0.50${rps}$; $2.0\,\text{m/s}$ and $1.0\,\text{m/s}$`,
                },
                { type: "check", questionId: Q("la-check-1") },
                { type: "text", md: r`## Rolling and belts

- A wheel **rolling without slipping** moves forward one circumference for each revolution, so the speed of its centre is $v = R\omega$.
- Two wheels joined by a **belt or chain** that does not slip have the same *rim speed*, $r_1\omega_1 = r_2\omega_2$, so the smaller wheel spins faster. That is how bicycle gears trade speed for ease of pedalling.` },
                { type: "check", questionId: Q("la-check-2") },
                { type: "text", md: r`## Two kinds of acceleration

A point moving in a circle can accelerate in two ways at once:

- **Tangential acceleration** $a_t = r\alpha$, along the direction of motion, changes the point's **speed**. It is zero when ω is constant.
- **Centripetal acceleration**, toward the axis, changes the point's **direction**. It is present whenever the object rotates, even at constant ω.` },
                { type: "formula", latex: r`a_c = \frac{v^2}{r} = r\omega^2`, caption: "Centripetal acceleration of a point at distance r from the axis, directed toward the axis." },
                {
                  type: "worked_example",
                  title: "A grinding wheel speeding up",
                  problem: r`At one instant, a grinding wheel of radius $0.30\,\text{m}$ spins at $10${rps}$ with an angular acceleration of $20${rps2}$. Find the tangential, centripetal and total acceleration of a point on its rim.`,
                  steps: [
                    { title: "Tangential", md: r`$a_t = r\alpha = (0.30)(20) = 6.0\,\text{m/s}^2$, along the rim.` },
                    { title: "Centripetal", md: r`$a_c = r\omega^2 = (0.30)(10)^2 = 30\,\text{m/s}^2$, toward the centre.` },
                    { title: "Total", md: r`The two are perpendicular: $a = \sqrt{6.0^2 + 30^2} \approx 31\,\text{m/s}^2$, pointing mostly inward and a little forward.` },
                  ],
                  answer: r`$a_t = 6.0\,\text{m/s}^2$, $a_c = 30\,\text{m/s}^2$, $a \approx 31\,\text{m/s}^2$`,
                },
                { type: "callout", tone: "warning", title: "Constant spin still means acceleration", md: r`A point on a wheel spinning at a perfectly steady rate is still accelerating: its velocity keeps changing direction. Only the tangential part is zero. And remember to **square** ω: $r\omega$ is a speed in m/s, while $r\omega^2$ is an acceleration in $\text{m/s}^2$. Doubling ω makes the centripetal acceleration four times larger.` },
                { type: "check", questionId: Q("cr-check-1") },
                { type: "check", questionId: Q("cr-check-2"), lead: "Which part needs α?" },
                { type: "note_prompt", prompt: "Explain why two riders on the same merry-go-round have the same angular velocity but different speeds and different centripetal accelerations.", suggestedTitle: "Linear vs angular on a rotating object", starter: "Same for every point: ω, α\nDifferent: v = rω, a_t = rα, a_c = rω²\n\nMy example: \n\nLinks: [[Linking linear and angular motion]] [[Centripetal and tangential acceleration]]" },
                { type: "summary", points: [r`For a point at distance $r$: $s = r\theta$, $v = r\omega$, $a_t = r\alpha$, with θ in radians.`, "All points on a rigid object share ω and α; their speeds grow in proportion to r.", r`Rolling without slipping: $v = R\omega$. Belt-linked wheels share rim speed.`, r`Centripetal acceleration $a_c = r\omega^2 = v^2/r$ points to the axis and is present even at constant ω.`, "Tangential and centripetal accelerations are perpendicular; combine them with the Pythagorean theorem."] },
              ],
            },
          ],
        },
        {
          id: T("torque"),
          title: "Torque",
          description: "Measure the turning effect of a force, and combine several turning effects into a net torque with a direction.",
          objectives: [
            { id: "physics-1.o.u5.d", code: "PHYS-5.D", description: "Calculate the torque of a force from its size, point of application and direction, and find the net torque and the direction of rotation it produces.", skillIds: [S("torque-magnitude"), S("net-torque")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u5.torque",
              title: "Torque: the turning effect of a force",
              summary: "Why where and how you push matters as much as how hard: τ = rF sin θ and the lever arm.",
              estMinutes: 15,
              skillIds: [S("torque-magnitude")],
              blocks: [
                { type: "text", md: r`Try opening a heavy door by pushing right next to the hinges: it barely moves. Push at the handle and it swings easily. Push on the edge but straight toward the hinges and nothing happens at all. The same force can have a large turning effect, a small one or none.

Three things decide the turning effect of a force about an axis: **how big** the force is, **how far** from the axis it acts, and **in which direction** it points.` },
                { type: "definition", term: "Torque", md: r`The turning effect of a force about an axis, written $\tau$ (the Greek letter tau). It is measured in newton-metres ($\text{N}\cdot\text{m}$).` },
                { type: "formula", latex: r`\tau = rF\sin\theta`, caption: "r is the distance from the axis to where the force acts; θ is the angle between that line (the position vector) and the force." },
                { type: "text", md: r`The factor $\sin\theta$ picks out the part of the force that actually turns the object. A force perpendicular to the position vector ($\theta = 90^\circ$, $\sin\theta = 1$) gives the most torque. A force along the position vector, pointing toward or away from the axis ($\theta = 0^\circ$ or $180^\circ$), gives none.` },
                {
                  type: "worked_example",
                  title: "Where you push on a door",
                  problem: r`A door is $0.75\,\text{m}$ wide. Find the torque about the hinges of a $40\,\text{N}$ push perpendicular to the door (a) at the handle on the outer edge and (b) $0.25\,\text{m}$ from the hinges.`,
                  steps: [
                    { title: "(a) At the handle", md: r`$\tau = rF\sin 90^\circ = (0.75)(40)(1) = 30${Nm}$.` },
                    { title: "(b) Near the hinges", md: r`$\tau = (0.25)(40)(1) = 10${Nm}$.` },
                    { title: "Compare", md: r`Same force, a third of the distance, a third of the torque. To get $30${Nm}$ at $0.25\,\text{m}$ you would need to push with $120\,\text{N}$.` },
                  ],
                  answer: r`(a) $30${Nm}$; (b) $10${Nm}$`,
                },
                { type: "check", questionId: Q("tm-check-1") },
                { type: "definition", term: "Lever arm", md: r`The perpendicular distance $r_\perp$ from the axis to the **line of action** of the force (the line the force arrow lies along, extended in both directions). Since $r_\perp = r\sin\theta$, torque is also force times lever arm: $\tau = F r_\perp$.` },
                {
                  type: "worked_example",
                  title: "A push at an angle",
                  problem: r`A mechanic pushes on a wrench $0.30\,\text{m}$ from the bolt with a force of $90\,\text{N}$ directed at $60^\circ$ to the handle. Find the torque two ways.`,
                  steps: [
                    { title: "Using the angle", md: r`$\tau = rF\sin\theta = (0.30)(90)\sin 60^\circ \approx (27)(0.866) \approx 23${Nm}$.` },
                    { title: "Using the lever arm", md: r`$r_\perp = 0.30\sin 60^\circ \approx 0.26\,\text{m}$, so $\tau = (90)(0.26) \approx 23${Nm}$. ✓` },
                    { title: "Compare with a perpendicular push", md: r`Pushing perpendicular would give $27${Nm}$. The angled push wastes some of its force pulling along the handle.` },
                  ],
                  answer: r`About $23${Nm}$`,
                },
                { type: "callout", tone: "warning", title: "Check the angle and the line of action", md: r`- θ is the angle between the **position vector and the force**, not between the force and the horizontal. If the angle you are given is measured from something else, sketch it and work out the right one.
- A force whose line of action passes through the axis has **no** torque, however large it is. Torque is not the same as force: a small force far out can beat a large force close in.` },
                { type: "check", questionId: Q("tm-check-2"), lead: "Include the angle." },
                { type: "callout", tone: "info", title: "Newton-metres are not joules", md: r`Torque and work both have units of force times distance, but they are different ideas. For work, the force is along the displacement; for torque, the force is perpendicular to the lever arm. Physicists write torque in $\text{N}\cdot\text{m}$ and keep "joule" for energy.` },
                { type: "summary", points: [r`Torque is the turning effect of a force: $\tau = rF\sin\theta$, in $\text{N}\cdot\text{m}$.`, "θ is the angle between the position vector (axis to point of application) and the force.", r`Equivalently, $\tau = Fr_\perp$, where the lever arm $r_\perp$ is the perpendicular distance from the axis to the line of action.`, "A perpendicular force far from the axis gives the most torque; a force through the axis gives none.", "A bigger force does not always mean a bigger torque."] },
              ],
            },
            {
              id: "physics-1.l.u5.net-torque",
              title: "Net torque and the direction of rotation",
              summary: "Give torques signs, add them up, and predict which way an object will start to turn, including the torque from an object's own weight.",
              estMinutes: 13,
              skillIds: [S("net-torque")],
              blocks: [
                { type: "text", md: r`Most objects feel several torques at once. A seesaw has a child on each side; a wheel has a motor turning it one way and friction resisting. To combine torques we need a direction for each, just as forces along a line need signs.

For rotation about a fixed axis there are only two directions: **counterclockwise** and **clockwise** (as seen by a stated viewer). We take counterclockwise as positive.` },
                { type: "callout", tone: "key", title: "Finding the sign of a torque", md: r`Imagine the force acting **alone** on an object that is free to turn about the axis. Which way would the object start to rotate? Counterclockwise: positive torque. Clockwise: negative torque. A force through the axis: zero.` },
                { type: "formula", latex: r`\tau_{\text{net}} = \sum \tau = \tau_1 + \tau_2 + \tau_3 + \cdots`, caption: "Add the torques with their signs. The sign of the net torque is the direction the object tends to start rotating." },
                {
                  type: "worked_example",
                  title: "Three forces on a rod",
                  problem: r`A light rod is pivoted at its centre. A $6.0\,\text{N}$ weight hangs $0.25\,\text{m}$ left of the pivot, a $4.0\,\text{N}$ weight hangs $0.50\,\text{m}$ right of the pivot, and a string pulls straight up with $3.0\,\text{N}$ at $0.10\,\text{m}$ right of the pivot. Find the net torque and which way the rod starts to turn.`,
                  steps: [
                    { title: "Left weight", md: r`It pulls the left end down: counterclockwise. $\tau_1 = +(0.25)(6.0) = +1.5${Nm}$.` },
                    { title: "Right weight", md: r`It pulls the right end down: clockwise. $\tau_2 = -(0.50)(4.0) = -2.0${Nm}$.` },
                    { title: "Upward string", md: r`Lifting the right side: counterclockwise. $\tau_3 = +(0.10)(3.0) = +0.30${Nm}$.` },
                    { title: "Add with signs", md: r`$\tau_{\text{net}} = 1.5 - 2.0 + 0.30 = -0.20${Nm}$. Negative: the rod starts to turn clockwise (right end down).` },
                  ],
                  answer: r`$-0.20${Nm}$: clockwise`,
                },
                { type: "check", questionId: Q("nt-check-1") },
                { type: "callout", tone: "warning", title: "Opposite torques cancel", md: r`Adding the sizes of all the torques ($1.5 + 2.0 + 0.30$ above) gives a number with no meaning. Torques that turn an object in opposite directions partly cancel, exactly like forces in opposite directions. Friction torque always opposes the motion, so it always has the opposite sign to the spin it resists.` },
                { type: "text", md: r`## The torque of an object's own weight

Gravity pulls on every part of an extended object, but for torques you can treat the whole weight as acting at one point: the **centre of mass** (the middle of a uniform rod or plank). For example, a uniform $2.0\,\text{m}$ rod weighing $30\,\text{N}$, pivoted at its left end and held horizontal, feels a gravitational torque of $(1.0\,\text{m})(30\,\text{N}) = 30${Nm}$ clockwise about the pivot. If the pivot is at the centre of mass, the weight gives no torque at all.` },
                { type: "check", questionId: Q("nt-check-2") },
                { type: "summary", points: ["Counterclockwise torques are positive and clockwise torques negative (for a stated viewer).", "Find each sign by imagining the force acting alone.", "The net torque is the signed sum; its sign is the direction the object starts to rotate.", "Torques in opposite directions cancel; never add their sizes.", "An object's weight acts at its centre of mass."] },
              ],
            },
          ],
        },
        {
          id: T("rotational-inertia"),
          title: "Rotational inertia",
          description: "Measure how hard an object is to spin up or slow down, and how that depends on where its mass is.",
          objectives: [
            { id: "physics-1.o.u5.e", code: "PHYS-5.E", description: "Determine the rotational inertia of point masses and of common shapes, and explain how it depends on the distribution of mass about the axis.", skillIds: [S("inertia-point-masses"), S("inertia-distribution")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u5.inertia-point-masses",
              title: "Rotational inertia of point masses",
              summary: "The rotational version of mass: I = Σmr², and why distance from the axis counts twice.",
              estMinutes: 12,
              skillIds: [S("inertia-point-masses")],
              blocks: [
                { type: "text", md: r`Mass measures how hard it is to change an object's velocity. Rotation has its own version: **rotational inertia** measures how hard it is to change an object's angular velocity.

Try spinning a broom about its length, then about an axis through its middle crosswise. Same broom, same mass, but the second is much harder to start and stop. Rotational inertia depends not just on how much mass there is, but on **how far it is from the axis**.` },
                { type: "definition", term: "Rotational inertia", md: r`A measure of an object's resistance to changes in its rotation about a particular axis, written $I$ and measured in $\text{kg}\cdot\text{m}^2$. (It is also called the moment of inertia.)` },
                { type: "formula", latex: r`I = \sum m r^2 = m_1r_1^2 + m_2r_2^2 + \cdots`, caption: "For small (point) masses, each at distance r from the axis. A mass on the axis contributes nothing." },
                {
                  type: "worked_example",
                  title: "Two masses on a rod",
                  problem: r`A light rod spins about an axis through a point on it. A $0.60\,\text{kg}$ mass sits $0.25\,\text{m}$ from the axis on one side, and another $0.60\,\text{kg}$ mass sits $0.50\,\text{m}$ from the axis on the other side. Find the rotational inertia.`,
                  steps: [
                    { title: "Inner mass", md: r`$m r^2 = (0.60)(0.25)^2 = 0.0375${kgm2}$.` },
                    { title: "Outer mass", md: r`$m r^2 = (0.60)(0.50)^2 = 0.15${kgm2}$.` },
                    { title: "Add", md: r`$I = 0.0375 + 0.15 \approx 0.19${kgm2}$. Which side a mass is on does not matter: $r^2$ is never negative.` },
                    { title: "Notice", md: r`The outer mass is only twice as far out but contributes four times as much.` },
                  ],
                  answer: r`$I \approx 0.19${kgm2}$`,
                },
                { type: "check", questionId: Q("ip-check-1") },
                { type: "callout", tone: "key", title: "Distance counts twice", md: r`Because of the $r^2$, moving a mass twice as far from the axis makes its contribution **four** times as large; three times as far, **nine** times. That is why a long pole helps a tightrope walker: the mass far out gives a large rotational inertia, so the walker tips over slowly.` },
                {
                  type: "worked_example",
                  title: "Same object, different axis",
                  problem: r`Two $1.0\,\text{kg}$ masses are fixed to the ends of a light $0.60\,\text{m}$ rod. Find the rotational inertia about an axis through the centre and about an axis through one mass (both perpendicular to the rod).`,
                  steps: [
                    { title: "Axis through the centre", md: r`Each mass is $0.30\,\text{m}$ away: $I = 2(1.0)(0.30)^2 = 0.18${kgm2}$.` },
                    { title: "Axis through one mass", md: r`One mass is on the axis ($r = 0$); the other is $0.60\,\text{m}$ away: $I = (1.0)(0.60)^2 = 0.36${kgm2}$.` },
                    { title: "Compare", md: r`Same masses, same rod, twice the rotational inertia. The axis is part of the question.` },
                  ],
                  answer: r`$0.18${kgm2}$ about the centre; $0.36${kgm2}$ about one end`,
                },
                { type: "callout", tone: "warning", title: "Rotational inertia is not a fixed property", md: r`An object has one mass, but many rotational inertias: one for every possible axis. Always say which axis you mean, and remember that moving mass inward or outward changes $I$ even though the mass stays the same.` },
                { type: "check", questionId: Q("ip-check-2") },
                { type: "summary", points: [r`Rotational inertia $I$ measures resistance to changes in rotation, in $\text{kg}\cdot\text{m}^2$.`, r`For point masses, $I = \sum mr^2$.`, "Distance from the axis is squared: twice as far out contributes four times as much.", "A mass on the axis contributes nothing.", "The same object has different rotational inertias about different axes."] },
              ],
            },
            {
              id: "physics-1.l.u5.inertia-shapes",
              title: "Shapes, axes and mass distribution",
              summary: "Rotational inertias of hoops, discs, spheres and rods; comparing shapes; and the parallel-axis theorem.",
              estMinutes: 13,
              skillIds: [S("inertia-distribution")],
              blocks: [
                { type: "text", md: r`A solid object is made of a huge number of tiny pieces, each contributing $mr^2$. Adding them all up needs mathematics beyond this course, but the results for common shapes are simple, and you will be given them when you need them:

| Object (mass $M$) | Axis | $I$ |
|---|---|---|
| Thin hoop or ring, radius $R$ | through centre, perpendicular to the hoop | $MR^2$ |
| Solid disc or cylinder, radius $R$ | through centre, along the axle | $\tfrac12MR^2$ |
| Solid sphere, radius $R$ | through centre | $\tfrac25MR^2$ |
| Thin spherical shell, radius $R$ | through centre | $\tfrac23MR^2$ |
| Thin rod, length $L$ | through centre, perpendicular to the rod | $\tfrac1{12}ML^2$ |
| Thin rod, length $L$ | through one end, perpendicular to the rod | $\tfrac13ML^2$ |` },
                { type: "callout", tone: "key", title: "Read the fraction as a story about where the mass is", md: r`All of a hoop's mass is at distance $R$, so $I = MR^2$ exactly. A disc of the same mass and radius has much of its mass closer in, so its $I$ is smaller ($\tfrac12MR^2$). A solid sphere has even more of its mass near the centre ($\tfrac25MR^2$). **The more mass far from the axis, the larger the rotational inertia.**` },
                {
                  type: "worked_example",
                  title: "Hoop versus disc",
                  problem: r`A thin hoop and a solid disc each have mass $3.0\,\text{kg}$ and radius $0.20\,\text{m}$. Find each rotational inertia about the central axis.`,
                  steps: [
                    { title: "Hoop", md: r`$I = MR^2 = (3.0)(0.20)^2 = 0.12${kgm2}$.` },
                    { title: "Disc", md: r`$I = \tfrac12MR^2 = \tfrac12(3.0)(0.20)^2 = 0.060${kgm2}$.` },
                    { title: "Meaning", md: r`The same torque would give the disc twice the angular acceleration of the hoop.` },
                  ],
                  answer: r`Hoop $0.12${kgm2}$; disc $0.060${kgm2}$`,
                },
                { type: "check", questionId: Q("dist-check-1") },
                { type: "text", md: r`## Moving the axis: the parallel-axis theorem

If you know an object's rotational inertia $I_{\text{cm}}$ about an axis through its centre of mass, you can find it about any **parallel** axis a distance $d$ away:` },
                { type: "formula", latex: r`I = I_{\text{cm}} + Md^2`, caption: "Parallel-axis theorem. The rotational inertia is always smallest about an axis through the centre of mass." },
                {
                  type: "worked_example",
                  title: "A rod about its end, from its centre",
                  problem: r`Use the parallel-axis theorem to find the rotational inertia of a uniform rod (mass $M$, length $L$) about one end, starting from $I_{\text{cm}} = \tfrac1{12}ML^2$.`,
                  steps: [
                    { title: "Distance between the axes", md: r`The end is $d = \tfrac{L}{2}$ from the centre.` },
                    { title: "Apply the theorem", md: r`$I = \tfrac1{12}ML^2 + M\left(\tfrac{L}{2}\right)^2 = \tfrac1{12}ML^2 + \tfrac3{12}ML^2 = \tfrac4{12}ML^2 = \tfrac13ML^2$.` },
                    { title: "Check", md: r`That matches the table: a rod is four times harder to spin about its end than about its middle.` },
                  ],
                  answer: r`$I = \tfrac13ML^2$`,
                },
                { type: "callout", tone: "warning", title: "Equal mass does not mean equal rotational inertia", md: r`Two objects with the same mass can have very different rotational inertias, and one object has different rotational inertias about different axes. When comparing, ask where the mass sits relative to the axis, not only how much mass there is.` },
                { type: "check", questionId: Q("dist-check-2") },
                { type: "summary", points: [r`Common shapes: hoop $MR^2$, disc $\tfrac12MR^2$, solid sphere $\tfrac25MR^2$, rod $\tfrac1{12}ML^2$ (centre) or $\tfrac13ML^2$ (end).`, "For the same mass and size, more mass far from the axis means a larger I.", r`Parallel-axis theorem: $I = I_{\text{cm}} + Md^2$.`, "I is smallest about an axis through the centre of mass.", "A skater pulling in her arms lowers her rotational inertia without changing her mass."] },
              ],
            },
          ],
        },
        {
          id: T("rotational-equilibrium"),
          title: "Rotational equilibrium",
          description: "Balance torques on seesaws and levers, and use both conditions for static equilibrium to find support, hinge and cable forces.",
          objectives: [
            { id: "physics-1.o.u5.f", code: "PHYS-5.F", description: "Apply the conditions for rotational and static equilibrium (zero net torque and zero net force) to find unknown forces and positions.", skillIds: [S("torque-balance"), S("static-equilibrium")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u5.balancing-torques",
              title: "Balancing torques",
              summary: "Newton's first law for rotation, and how to balance seesaws, levers and metre sticks.",
              estMinutes: 13,
              skillIds: [S("torque-balance")],
              blocks: [
                { type: "text", md: r`Newton's first law says an object's velocity stays constant when the net force on it is zero. Rotation has a matching law: **when the net torque on an object is zero, its angular velocity stays constant.** An object at rest stays at rest, and a spinning object keeps spinning at the same rate.

An object with zero net torque is in **rotational equilibrium**. For a seesaw or lever at rest, that means the torques trying to turn it one way exactly match those trying to turn it the other way.` },
                { type: "formula", latex: r`\sum\tau = 0 \quad\Longleftrightarrow\quad \sum\tau_{\text{counterclockwise}} = \sum\tau_{\text{clockwise}}`, caption: "Condition for rotational equilibrium about any axis." },
                {
                  type: "worked_example",
                  title: "Balancing a parent and a child",
                  problem: r`A $270\,\text{N}$ child sits $2.5\,\text{m}$ from the central pivot of a seesaw. Where should a $450\,\text{N}$ parent sit, on the other side, to balance it?`,
                  steps: [
                    { title: "Set the torques equal", md: r`$(270)(2.5) = (450)d$.` },
                    { title: "Solve", md: r`$d = \dfrac{675}{450} = 1.5\,\text{m}$.` },
                    { title: "Check the idea", md: r`The parent is $\tfrac{450}{270} \approx 1.67$ times heavier and sits $\tfrac{2.5}{1.5} \approx 1.67$ times closer. Weight × distance matches on both sides.` },
                  ],
                  answer: r`$1.5\,\text{m}$ from the pivot`,
                },
                { type: "check", questionId: Q("tb-check-1") },
                { type: "callout", tone: "warning", title: "Balance is about torques, not weights", md: r`A seesaw does not need equal weights on each side, or equal distances. It needs equal **torques**. A light child far out can balance a heavy adult close in. Adding the same weight to both sides, or moving both people out by the same distance, usually *breaks* the balance, because the extra torques are not equal.` },
                {
                  type: "worked_example",
                  title: "A metre stick that is not supported at its middle",
                  problem: r`A uniform metre stick of mass $150\,\text{g}$ rests on a pivot at its $35\,\text{cm}$ mark. What mass hung at the $5\,\text{cm}$ mark will balance it?`,
                  steps: [
                    { title: "Where does the stick's weight act?", md: r`At its centre of mass, the $50\,\text{cm}$ mark: $15\,\text{cm}$ to the right of the pivot. So it gives a clockwise torque.` },
                    { title: "Distance of the hanging mass", md: r`From $35\,\text{cm}$ to $5\,\text{cm}$ is $30\,\text{cm}$, on the left.` },
                    { title: "Balance (g cancels)", md: r`$m(30) = (150)(15) \Rightarrow m = 75\,\text{g}$.` },
                  ],
                  answer: r`$75\,\text{g}$`,
                },
                { type: "callout", tone: "tip", title: "Include the beam", md: r`A beam's own weight acts at its centre of mass. If the pivot is there, the beam's weight gives no torque and you can leave it out. If the pivot is anywhere else, the beam's weight is one of the torques.` },
                { type: "check", questionId: Q("tb-check-2") },
                { type: "summary", points: ["Zero net torque means constant angular velocity: the rotational form of Newton's first law.", "For a balanced object, counterclockwise torques equal clockwise torques.", "Balance needs equal torques (weight × distance), not equal weights or equal distances.", "A beam's weight acts at its centre of mass and gives a torque unless the pivot is there.", "g cancels when every torque comes from a hanging mass, so masses can be used directly."] },
              ],
            },
            {
              id: "physics-1.l.u5.static-equilibrium",
              title: "Static equilibrium",
              summary: "Zero net force and zero net torque together: finding support forces, hinge forces and cable tensions.",
              estMinutes: 16,
              skillIds: [S("static-equilibrium")],
              blocks: [
                { type: "text", md: r`Bridges, shelves, ladders and cranes are designed to stay perfectly still. An object that is at rest and stays at rest, neither moving off nor starting to turn, is in **static equilibrium**. That takes two conditions, not one.` },
                { type: "formula", latex: r`\sum F_x = 0 \qquad \sum F_y = 0 \qquad \sum\tau = 0`, caption: "Static equilibrium: no linear acceleration and no angular acceleration. The torque condition holds about every point." },
                { type: "callout", tone: "key", title: "A strategy that always works", md: r`1. Draw the object and **every** force on it, including its own weight at its centre of mass.
2. **Choose a pivot** at the point where an unknown force acts. That force has no lever arm there, so it drops out of the torque equation.
3. Write $\sum\tau = 0$ about that pivot and solve.
4. Use $\sum F = 0$ to find whatever is left.` },
                {
                  type: "worked_example",
                  title: "A plank on two supports",
                  problem: r`A uniform plank $5.0\,\text{m}$ long weighing $250\,\text{N}$ rests on supports at its two ends. A $500\,\text{N}$ person stands $1.0\,\text{m}$ from the left end. Find both support forces.`,
                  steps: [
                    { title: "Forces", md: r`Up: $F_L$ at the left end and $F_R$ at the right end. Down: $250\,\text{N}$ at the middle ($2.5\,\text{m}$) and $500\,\text{N}$ at $1.0\,\text{m}$.` },
                    { title: "Torques about the left end", md: r`$F_L$ drops out. $F_R(5.0) = (250)(2.5) + (500)(1.0) = 1125$, so $F_R = 225\,\text{N}$.` },
                    { title: "Force condition", md: r`$F_L + F_R = 750\,\text{N}$, so $F_L = 525\,\text{N}$.` },
                    { title: "Sense check", md: r`The person stands near the left end, so the left support carries most of the load.` },
                  ],
                  answer: r`$F_L = 525\,\text{N}$, $F_R = 225\,\text{N}$`,
                },
                { type: "check", questionId: Q("se-check-1") },
                {
                  type: "worked_example",
                  title: "A hinged beam held by a cable",
                  problem: r`A uniform horizontal beam $2.4\,\text{m}$ long weighing $120\,\text{N}$ is hinged to a wall. A cable from its outer end to the wall makes $30^\circ$ with the beam. Find the cable tension and the force from the hinge.`,
                  steps: [
                    { title: "Torques about the hinge", md: r`The hinge force drops out. Cable: $T(2.4)\sin 30^\circ = 1.2T$ counterclockwise. Weight: $(120)(1.2) = 144${Nm}$ clockwise. So $1.2T = 144$ and $T = 120\,\text{N}$.` },
                    { title: "Horizontal forces", md: r`The cable pulls toward the wall with $T\cos 30^\circ \approx 104\,\text{N}$, so the hinge pushes outward with $H_x \approx 104\,\text{N}$.` },
                    { title: "Vertical forces", md: r`$H_y + T\sin 30^\circ = 120 \Rightarrow H_y = 120 - 60 = 60\,\text{N}$ upward.` },
                  ],
                  answer: r`$T = 120\,\text{N}$; hinge force components $104\,\text{N}$ outward and $60\,\text{N}$ up`,
                },
                { type: "callout", tone: "warning", title: "Two common traps", md: r`- **Supports do not share the load equally** unless everything is symmetric. The force condition fixes only their sum; the torque condition decides the split.
- **Zero net force is not enough.** Two equal, opposite forces at opposite ends of a rod cancel as forces but both turn it the same way, so the rod spins. Always check torques too.` },
                { type: "check", questionId: Q("se-check-2"), lead: "Now the force condition." },
                { type: "tutor_prompt", prompts: ["How do I decide where to put the pivot in an equilibrium problem?", "Why can a support force be bigger than the total weight?", "Can you walk me through a ladder leaning against a wall?"] },
                { type: "summary", points: [r`Static equilibrium needs $\sum F = 0$ and $\sum\tau = 0$.`, "Put the pivot where an unknown force acts to remove it from the torque equation.", "For an object in equilibrium, the net torque is zero about every point, so any pivot gives the same answers.", "Support forces add up to the total weight, but the nearer support carries more.", "Include the object's own weight at its centre of mass."] },
              ],
            },
          ],
        },
        {
          id: T("rotational-second-law"),
          title: "Newton's second law for rotation",
          description: "Connect net torque, rotational inertia and angular acceleration, including a hanging mass on a pulley that has rotational inertia.",
          objectives: [
            { id: "physics-1.o.u5.g", code: "PHYS-5.G", description: "Apply Newton's second law in rotational form, τ_net = Iα, alone and together with Newton's second law for linear motion in systems such as a mass on a pulley.", skillIds: [S("rotational-second-law"), S("pulley-systems")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u5.newtons-second-law-rotation",
              title: "Net torque and angular acceleration",
              summary: "τ_net = Iα: the rotational version of F = ma, and what happens when the net torque is zero.",
              estMinutes: 13,
              skillIds: [S("rotational-second-law")],
              blocks: [
                { type: "text", md: r`A net force gives a mass a linear acceleration: $F_{\text{net}} = ma$. The rotational version swaps each quantity for its twin: net torque for net force, rotational inertia for mass, angular acceleration for acceleration.` },
                { type: "formula", latex: r`\tau_{\text{net}} = I\alpha`, caption: "Newton's second law for rotation about a fixed axis. Use the net torque, with signs, and the rotational inertia about the same axis." },
                { type: "text", md: r`It says two things you already feel: a bigger net torque spins an object up faster, and an object with a bigger rotational inertia spins up more slowly for the same torque.` },
                {
                  type: "worked_example",
                  title: "Pushing a merry-go-round",
                  problem: r`A merry-go-round has rotational inertia $800${kgm2}$ and radius $2.0\,\text{m}$. A parent pushes tangentially on its edge with $150\,\text{N}$, while friction in the bearing exerts an opposing torque of $60${Nm}$. Starting from rest, how long does it take to reach $1.5${rps}$?`,
                  steps: [
                    { title: "Net torque", md: r`Push: $(2.0)(150) = 300${Nm}$. Friction opposes it: $\tau_{\text{net}} = 300 - 60 = 240${Nm}$.` },
                    { title: "Angular acceleration", md: r`$\alpha = \dfrac{\tau_{\text{net}}}{I} = \dfrac{240}{800} = 0.30${rps2}$.` },
                    { title: "Kinematics", md: r`$t = \dfrac{\omega - \omega_0}{\alpha} = \dfrac{1.5}{0.30} = 5.0\,\text{s}$.` },
                  ],
                  answer: r`$5.0\,\text{s}$`,
                },
                { type: "check", questionId: Q("rs-check-1") },
                { type: "callout", tone: "key", title: "No net torque, no change in spin", md: r`If $\tau_{\text{net}} = 0$ then $\alpha = 0$, so ω stays constant. A spinning wheel on a perfectly frictionless axle would spin forever. Real wheels slow down because friction supplies a small opposing torque, not because spinning "uses up" anything. A torque is needed to *change* rotation, not to keep it going.` },
                { type: "check", questionId: Q("rs-check-2") },
                { type: "callout", tone: "warning", title: "Use the net torque and the right I", md: r`Include every torque, with its sign; friction always opposes the spin. And use the rotational inertia about the axis the object actually turns around. The same torque gives a solid disc twice the angular acceleration of a hoop of equal mass and radius, because the hoop's I is twice as large.` },
                { type: "summary", points: [r`$\tau_{\text{net}} = I\alpha$ is Newton's second law for rotation.`, "Larger net torque: larger α. Larger rotational inertia: smaller α.", "Zero net torque means constant angular velocity, which may be zero or not.", "Friction torque opposes the spin; subtract it to get the net torque.", "Combine α with the rotational kinematics equations to find times, angles and angular velocities."] },
              ],
            },
            {
              id: "physics-1.l.u5.pulleys",
              title: "Pulleys with rotational inertia",
              summary: "A hanging mass on a real pulley: two Newton's laws linked by a = Rα.",
              estMinutes: 15,
              skillIds: [S("pulley-systems")],
              blocks: [
                { type: "text", md: r`In Unit 2, pulleys were "light": they changed the direction of a string without needing any force to turn them. A real pulley has mass, so it has rotational inertia, and the string must exert a torque on it to spin it up. That changes the motion of everything attached.

The method is to write one equation for each object and link them:

- **Hanging block** (linear): $mg - T = ma$, taking down as positive.
- **Pulley** (rotational): $TR = I\alpha$, since the string pulls tangentially at radius $R$.
- **Link**: if the string does not slip, the block's acceleration equals the rim's tangential acceleration, $a = R\alpha$.` },
                {
                  type: "worked_example",
                  title: "A block on a disc pulley",
                  problem: r`A $1.5\,\text{kg}$ block hangs from a light string wound around a pulley that is a solid disc of mass $3.0\,\text{kg}$ and radius $0.10\,\text{m}$, on a frictionless axle. Find the block's acceleration and the string tension.`,
                  steps: [
                    { title: "Pulley equation", md: r`$TR = I\alpha = \tfrac12MR^2 \cdot \dfrac{a}{R}$, so $T = \tfrac12Ma = 1.5a$ (in newtons, with $a$ in $\text{m/s}^2$).` },
                    { title: "Block equation", md: r`$mg - T = ma$: $(1.5)(9.8) - 1.5a = 1.5a$.` },
                    { title: "Solve", md: r`$14.7 = 3.0a \Rightarrow a = 4.9\,\text{m/s}^2$. Then $T = 1.5 \times 4.9 \approx 7.4\,\text{N}$.` },
                    { title: "Sense check", md: r`$a$ is less than $g$, and $T$ is less than the block's weight ($14.7\,\text{N}$), as it must be for a block accelerating downward.` },
                  ],
                  answer: r`$a = 4.9\,\text{m/s}^2$; $T \approx 7.4\,\text{N}$`,
                },
                { type: "check", questionId: Q("ps-check-1") },
                { type: "formula", latex: r`a = \frac{mg}{m + I/R^2}`, caption: "Acceleration of a block hanging from a string wound on a pulley with rotational inertia I and radius R. For a solid-disc pulley, I/R² = M/2." },
                { type: "callout", tone: "tip", title: "Check the limits", md: r`If the pulley had no rotational inertia ($I \to 0$), the formula gives $a = g$: free fall, with zero tension. A heavier pulley makes the denominator bigger and the acceleration smaller. The pulley behaves like an extra mass $I/R^2$ that has to be accelerated too.` },
                { type: "callout", tone: "warning", title: "The tension is not the weight", md: r`It is tempting to set the tension equal to $mg$. But if $T = mg$ the block would feel no net force and could not accelerate. Whenever the block speeds up downward, $T < mg$. And with a heavy pulley, the tensions on its two sides (if it has two) are **different**: their difference is what provides the net torque.` },
                { type: "check", questionId: Q("ps-check-2") },
                { type: "summary", points: [r`Write $mg - T = ma$ for the block, $TR = I\alpha$ for the pulley, and link them with $a = R\alpha$.`, r`Result: $a = \dfrac{mg}{m + I/R^2}$; for a solid-disc pulley, $a = \dfrac{mg}{m + M/2}$.`, "A pulley with rotational inertia reduces the acceleration below g (or below the massless-pulley value).", "The tension is less than the hanging weight whenever the block accelerates downward.", "A pulley with mass has different tensions on its two sides."] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: unit5Questions,

  assessments: [
    // ── Topic 1: Rotational kinematics ──
    {
      id: EX("radians-angular-velocity"),
      kind: "exercise",
      title: "Measure angles in radians and find angular velocity",
      description: "Convert between revolutions, degrees, rpm and radians, and find angular displacements, velocities and accelerations with the right signs.",
      unitId: U,
      topicId: T("rotational-kinematics"),
      questionIds: pool("aq", 1, 8),
      config: exercise,
    },
    {
      id: EX("angular-kinematics"),
      kind: "exercise",
      title: "Use the constant-angular-acceleration equations",
      description: "Pick the right rotational equation and use it to find angular velocities, angles, times and numbers of revolutions.",
      unitId: U,
      topicId: T("rotational-kinematics"),
      questionIds: pool("rk", 1, 8),
      config: exercise,
    },
    {
      id: EX("spin-up-spin-down"),
      kind: "exercise",
      title: "Reason about spinning up and slowing down",
      description: "Use signs, tables, graphs and proportional reasoning to describe objects that spin up, slow down or reverse.",
      unitId: U,
      topicId: T("rotational-kinematics"),
      questionIds: [...pool("aq", 9, 11), ...pool("rk", 9, 13)],
      config: exercise,
    },
    // ── Topic 2: Linear and angular ──
    {
      id: EX("arc-length-speed"),
      kind: "exercise",
      title: "Find arc lengths and speeds of rotating points",
      description: "Use s = rθ and v = rω for points on spinning objects, rolling wheels and belt-linked pulleys.",
      unitId: U,
      topicId: T("linear-angular"),
      questionIds: pool("la", 1, 8),
      config: exercise,
    },
    {
      id: EX("rotating-accelerations"),
      kind: "exercise",
      title: "Find tangential and centripetal accelerations",
      description: "Calculate rα and rω², combine them, and decide which way a rotating point accelerates.",
      unitId: U,
      topicId: T("linear-angular"),
      questionIds: [...pool("cr", 1, 7), Q("la-9"), Q("la-10")],
      config: exercise,
    },
    // ── Topic 3: Torque ──
    {
      id: EX("calculate-torque"),
      kind: "exercise",
      title: "Calculate a torque",
      description: "Use τ = rF sin θ for perpendicular and angled forces, and decide what changes a torque.",
      unitId: U,
      topicId: T("torque"),
      questionIds: pool("tm", 1, 8),
      config: exercise,
    },
    {
      id: EX("lever-arms"),
      kind: "exercise",
      title: "Use lever arms and the angle of a force",
      description: "Find lever arms, compare the torques of different pushes, and work out the force or wrench length a job needs.",
      unitId: U,
      topicId: T("torque"),
      questionIds: pool("tm", 9, 16),
      config: exercise,
    },
    {
      id: EX("net-torque"),
      kind: "exercise",
      title: "Find the net torque and the direction of rotation",
      description: "Give each torque a sign, add them up, and predict which way an object will start to turn.",
      unitId: U,
      topicId: T("torque"),
      questionIds: pool("nt", 1, 8),
      config: exercise,
    },
    {
      id: "physics-1.quiz.u5.1",
      kind: "skill_quiz",
      title: "Quiz 1: rotational motion and torque",
      description: "Seven questions on angular quantities, constant angular acceleration, linking linear and rotational motion, and torque. No hints.",
      unitId: U,
      topicId: T("torque"),
      questionIds: [Q("aq-quiz-1"), Q("rk-quiz-1"), Q("la-quiz-1"), Q("cr-quiz-1"), Q("tm-quiz-1"), Q("tm-quiz-2"), Q("nt-quiz-1")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 630 },
    },
    // ── Topic 4: Rotational inertia ──
    {
      id: EX("point-mass-inertia"),
      kind: "exercise",
      title: "Calculate the rotational inertia of point masses",
      description: "Add up mr² for one or several masses, and see how distance and the choice of axis change the result.",
      unitId: U,
      topicId: T("rotational-inertia"),
      questionIds: pool("ip", 1, 8),
      config: exercise,
    },
    {
      id: EX("mass-distribution"),
      kind: "exercise",
      title: "Compare shapes, axes and mass distributions",
      description: "Use the formulas for hoops, discs, spheres and rods, rank objects by rotational inertia, and apply the parallel-axis theorem.",
      unitId: U,
      topicId: T("rotational-inertia"),
      questionIds: pool("dist", 1, 8),
      config: exercise,
    },
    // ── Topic 5: Rotational equilibrium ──
    {
      id: EX("balance-seesaw"),
      kind: "exercise",
      title: "Balance a seesaw or lever",
      description: "Set clockwise torques equal to counterclockwise torques to find where to sit, what to hang, or what force a lever gives.",
      unitId: U,
      topicId: T("rotational-equilibrium"),
      questionIds: pool("tb", 1, 8),
      config: exercise,
    },
    {
      id: EX("support-forces"),
      kind: "exercise",
      title: "Find the support forces on a beam",
      description: "Use both equilibrium conditions to find support, hinge and cable forces on beams.",
      unitId: U,
      topicId: T("rotational-equilibrium"),
      questionIds: pool("se", 1, 8),
      config: exercise,
    },
    {
      id: EX("equilibrium-problems"),
      kind: "exercise",
      title: "Choose a pivot and solve equilibrium problems",
      description: "Pick the pivot that removes an unknown, and solve harder problems: load limits, tipping, hanging platforms, booms and ladders.",
      unitId: U,
      topicId: T("rotational-equilibrium"),
      questionIds: [...pool("se", 9, 14), Q("tb-9"), Q("tb-10")],
      config: exercise,
    },
    // ── Topic 6: Newton's second law for rotation ──
    {
      id: EX("torque-angular-acceleration"),
      kind: "exercise",
      title: "Relate net torque to angular acceleration",
      description: "Apply τ_net = Iα, combine it with rotational kinematics, and reason about zero net torque.",
      unitId: U,
      topicId: T("rotational-second-law"),
      questionIds: pool("rs", 1, 8),
      config: exercise,
    },
    {
      id: EX("pulley-inertia"),
      kind: "exercise",
      title: "Hanging mass on a pulley with rotational inertia",
      description: "Link a falling block to a spinning pulley and find the acceleration, tension and the pulley's rotational inertia.",
      unitId: U,
      topicId: T("rotational-second-law"),
      questionIds: pool("ps", 1, 8),
      config: exercise,
    },
    {
      id: "physics-1.quiz.u5.2",
      kind: "skill_quiz",
      title: "Quiz 2: rotational inertia, equilibrium and dynamics",
      description: "Seven questions on rotational inertia, balancing torques, static equilibrium and Newton's second law for rotation. No hints.",
      unitId: U,
      topicId: T("rotational-second-law"),
      questionIds: [Q("ip-quiz-1"), Q("dist-quiz-1"), Q("tb-quiz-1"), Q("se-quiz-1"), Q("se-quiz-2"), Q("rs-quiz-1"), Q("ps-quiz-1")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 630 },
    },
    // ── Unit test and full-course practice ──
    {
      id: "physics-1.test.u5",
      kind: "unit_test",
      title: "Unit 5 test: torque and rotational dynamics",
      description: "Fifteen questions, 30 minutes. Covers the whole unit: rotational kinematics, linear and angular motion, torque, rotational inertia, equilibrium and τ = Iα.",
      unitId: U,
      questionIds: [
        Q("aq-test-1"), Q("rk-test-1"), Q("rk-test-2"), Q("la-test-1"), Q("cr-test-1"), Q("tm-test-1"), Q("nt-test-1"), Q("ip-test-1"),
        Q("dist-test-1"), Q("tb-test-1"), Q("se-test-1"), Q("se-test-2"), Q("rs-test-1"), Q("rs-test-2"), Q("ps-test-1"),
      ],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 30 * 60 },
    },
    {
      id: "physics-1.exam.u5",
      kind: "exam_practice",
      title: "AP-style practice: torque and rotational dynamics",
      description: "Seven multi-step problems that combine ideas from across Unit 5: rolling wheels, pulleys with mass, hinged beams and changing rotational inertia. 14 minutes.",
      questionIds: [Q("exam-1"), Q("exam-2"), Q("exam-3"), Q("exam-4"), Q("exam-5"), Q("exam-6"), Q("exam-7")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 14 * 60 },
    },
  ],
};
