/**
 * AP Physics 1 — Unit 7: Oscillations (simple harmonic motion, period and
 * frequency of mass–spring systems and pendulums, graphs and the cosine model,
 * and energy in oscillators). Assembled into the course in ./index.ts.
 *
 * Original AceAP instructional content. Objective codes ("PHYS-7.C") are
 * AceAP's own and are not College Board codes. Algebra-based throughout;
 * g = 9.8 m/s², ideal springs, frictionless surfaces and small pendulum angles
 * unless stated otherwise. Angles in cos(2πft) are in radians.
 */
import type { UnitPart } from "./shared";
import { unit7Questions } from "./unit-7.questions";

const r = String.raw;
const S = (id: string) => `physics-1.u7.${id}`;
const Q = (id: string) => `physics-1.q.u7.${id}`;
const M = (id: string) => `physics-1.m.u7.${id}`;
const T = (id: string) => `physics-1.u7.t.${id}`;
const U = "physics-1.u7";

const exercise = { feedback: "immediate", assistance: "allowed", questionsPerAttempt: 5 } as const;
const range = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => Q(`${prefix}-${from + i}`));

export const unit7: UnitPart = {
  skills: [
    {
      id: S("restoring-force"),
      name: "Restoring forces and the condition for SHM",
      description: "Identify a restoring force that points toward equilibrium and is proportional to displacement (F = −kx), use Hooke's law, and decide whether a motion is simple harmonic.",
      difficulty: 2,
      keywords: ["restoring force", "simple harmonic motion", "SHM", "Hooke's law", "F = -kx", "spring constant", "equilibrium", "proportional to displacement", "is it simple harmonic", "spring force direction"],
      patternLabels: {
        "force-direction": "Direction of the restoring force",
        "hookes-law-calc": "Hooke's law calculations",
        "identify-shm": "Is it simple harmonic?",
        "proportionality-test": "Testing for proportionality",
        "spring-constant-from-data": "Spring constant from data",
        "force-ratio": "Scaling the force",
        "acceleration-from-force": "Acceleration from the spring force",
        "signed-force": "Force with its sign",
      },
    },
    {
      id: S("oscillation-description"),
      name: "Equilibrium, amplitude and cycles",
      description: "Describe an oscillation by its equilibrium position, amplitude and cycle, including the distance covered in a cycle and where the object is after a fraction of a cycle.",
      difficulty: 1,
      keywords: ["amplitude", "equilibrium position", "cycle", "oscillation", "maximum displacement", "peak to peak", "distance in one cycle", "4A", "quarter cycle", "half cycle"],
      prerequisites: [S("restoring-force"), "physics-1.position-displacement"],
      patternLabels: {
        "amplitude-read": "Reading the amplitude",
        "distance-per-cycle": "Distance per cycle",
        vocab: "Vocabulary of oscillation",
        "cycle-fraction": "Fractions of a cycle",
        "equilibrium-location": "Locating equilibrium",
      },
    },
    {
      id: S("period-frequency"),
      name: "Period and frequency",
      description: "Relate period and frequency (T = 1/f), find them from timing data, and use them to count cycles or find elapsed times.",
      difficulty: 1,
      keywords: ["period", "frequency", "hertz", "Hz", "T = 1/f", "cycles per second", "time for one cycle", "timing oscillations", "reciprocal"],
      prerequisites: [S("oscillation-description")],
      patternLabels: {
        "f-from-T": "Frequency from period",
        "T-from-f": "Period from frequency",
        "count-cycles": "From timing data",
        "time-for-n-cycles": "Cycles and elapsed time",
        "unit-meaning": "What a hertz means",
        rank: "Ranking periods",
        proportional: "Proportional reasoning",
        compare: "Comparing two oscillators",
      },
    },
    {
      id: S("spring-period"),
      name: "Period of a mass–spring oscillator",
      description: "Calculate and reason with T = 2π√(m/k): solve for mass or spring constant, predict how the period scales, and recognise that amplitude and gravity do not affect it.",
      difficulty: 3,
      keywords: ["mass spring period", "T = 2π√(m/k)", "spring constant", "period of a spring", "does amplitude affect period", "vertical spring", "stiffer spring", "heavier mass", "square root scaling", "spring on the Moon"],
      prerequisites: [S("restoring-force"), S("period-frequency")],
      patternLabels: {
        "compute-period": "Calculating the period",
        "scaling-mass": "Changing the mass",
        "frequency-from-mk": "Frequency from m and k",
        "solve-k": "Finding the spring constant",
        "solve-mass": "Finding the mass",
        expression: "Rearranging the formula",
        "vertical-spring": "Vertical springs",
        "scaling-k": "Changing the spring",
        "amplitude-independence": "Amplitude and period",
        "what-changes": "What changes the period?",
        "rank-periods": "Ranking oscillators",
        "gravity-independence": "Gravity and the spring period",
        "added-mass": "Adding mass",
      },
    },
    {
      id: S("pendulum-period"),
      name: "Period of a simple pendulum",
      description: "Calculate and reason with T = 2π√(L/g) for small angles: solve for length or g, predict scaling, and recognise that mass and small amplitudes do not affect the period.",
      difficulty: 3,
      keywords: ["pendulum period", "T = 2π√(L/g)", "simple pendulum", "length of pendulum", "does mass affect pendulum period", "small angle approximation", "pendulum on the Moon", "pendulum clock", "measuring g"],
      prerequisites: [S("period-frequency")],
      patternLabels: {
        "compute-period": "Calculating the period",
        "mass-independence": "Mass and the period",
        "solve-length": "Finding the length",
        frequency: "Pendulum frequency",
        "solve-g": "Measuring g",
        expression: "Rearranging the formula",
        "scaling-length": "Changing the length",
        "gravity-change": "Changing gravity",
        "what-changes": "What changes the period?",
        "compare-systems": "Pendulums and springs compared",
        "small-angle": "Why small angles?",
      },
    },
    {
      id: S("motion-in-cycle"),
      name: "Velocity and acceleration through a cycle",
      description: "Identify where in a cycle the speed, restoring force and acceleration are zero or greatest, give their directions at any point, and decide whether the object is speeding up or slowing down.",
      difficulty: 3,
      keywords: ["where is speed greatest", "maximum acceleration", "turning point", "acceleration at maximum displacement", "velocity at equilibrium", "speeding up or slowing down in SHM", "a = -kx/m", "maximum acceleration kA/m"],
      prerequisites: [S("restoring-force"), S("oscillation-description"), "physics-1.acceleration-concept"],
      patternLabels: {
        "where-max-speed": "Where speed is greatest",
        "where-max-accel": "Where acceleration is greatest",
        "select-at-point": "Everything at one point",
        "ratio-at-position": "Acceleration at a fraction of A",
        "directions-at-point": "Directions at a point",
        "turning-point": "At the turning point",
        "between-points": "Between two points",
        "max-acceleration": "Calculating the maximum acceleration",
      },
    },
    {
      id: S("shm-graphs"),
      name: "Graphs of simple harmonic motion",
      description: "Read amplitude and period from position–time graphs, connect position, velocity and acceleration graphs, and describe phase differences qualitatively.",
      difficulty: 3,
      keywords: ["position time graph SHM", "velocity time graph SHM", "acceleration time graph", "sinusoidal graph", "reading period from graph", "phase difference", "quarter cycle out of phase", "slope of x-t graph"],
      prerequisites: [S("motion-in-cycle"), "physics-1.xt-graphs", "physics-1.vt-graphs"],
      patternLabels: {
        "read-graph-values": "Reading amplitude and period",
        "position-to-velocity": "Velocity from a position graph",
        "match-graphs": "Matching the three graphs",
        "graph-features": "Features of the graph",
        phase: "Phase differences",
        "graph-signs": "Signs from the graph",
        "velocity-table": "Reading a velocity graph",
      },
    },
    {
      id: S("shm-equation"),
      name: "Using x = A cos(2πft)",
      description: "Read amplitude, frequency and period from x = A cos(2πft), evaluate position at a given time in radians, write the equation from a description, and relate sine and cosine starts to phase.",
      difficulty: 3,
      keywords: ["x = A cos(2πft)", "equation of SHM", "sinusoidal model", "radians", "angular frequency", "cosine function oscillation", "sine vs cosine", "phase", "position at time t"],
      prerequisites: [S("shm-graphs"), S("period-frequency")],
      patternLabels: {
        "read-parameters": "Reading A, f and T",
        "evaluate-position": "Position at a given time",
        "write-equation": "Writing the equation",
        "phase-start": "Sine or cosine start",
        "time-to-position": "Time to reach a position",
        "equation-to-k": "From the equation to the spring",
      },
    },
    {
      id: S("energy-exchange"),
      name: "Energy exchange in an oscillator",
      description: "Track how energy moves between kinetic energy and elastic or gravitational potential energy through a cycle, with the total constant for an ideal oscillator, and explain damping.",
      difficulty: 2,
      keywords: ["energy in SHM", "kinetic and potential energy oscillator", "spring potential energy", "pendulum energy", "energy conservation oscillation", "energy bar chart", "damping", "total mechanical energy constant"],
      prerequisites: [S("motion-in-cycle")],
      patternLabels: {
        "energy-at-point": "Energy at a point in the cycle",
        "total-constant": "The total stays constant",
        "pendulum-energy": "Energy in a pendulum",
        "energy-split": "Sharing the total",
        "energy-graph": "Energy–position graphs",
        damping: "Damping",
        "energy-trend": "How the energies change",
      },
    },
    {
      id: S("energy-calculations"),
      name: "Total energy, maximum speed and speed at any point",
      description: "Use E = ½kA² and energy conservation to find total energy, amplitude, maximum speed and the speed at any displacement, and predict how they scale with amplitude, mass and stiffness.",
      difficulty: 4,
      keywords: ["E = 1/2 k A^2", "maximum speed SHM", "v max = A√(k/m)", "speed at displacement x", "energy and amplitude", "doubling amplitude energy", "pendulum speed at bottom", "√(2gh)", "energy at half amplitude"],
      prerequisites: [S("energy-exchange"), S("spring-period")],
      patternLabels: {
        "total-energy": "Total energy",
        "max-speed": "Maximum speed",
        "amplitude-from-energy": "Amplitude from energy",
        "pendulum-max-speed": "Pendulum speed at the bottom",
        "vmax-expression": "Maximum speed in symbols",
        "k-from-vmax": "Spring constant from the maximum speed",
        "scaling-amplitude": "Changing the amplitude",
        "speed-at-x": "Speed at any position",
        "energy-at-fraction": "Energy at a fraction of A",
        "scaling-mass": "Changing the mass",
        "compare-energy": "Comparing oscillators",
        "speed-expression": "Speed at a position in symbols",
      },
    },
  ],

  misconceptions: [
    { id: M("restoring-force-direction"), skillId: S("restoring-force"), title: "Thinks the restoring force points along the motion or the displacement", description: "Expects the spring force (and acceleration) to point in the direction the object is moving, or in the direction of its displacement, instead of back toward equilibrium.", remediation: "Ignore the velocity and look only at where the object is. If it is to the right of equilibrium, the spring pulls it left; if it is to the left, the spring pushes it right. That is what the minus sign in F = −kx says. The acceleration always points the same way as this force." },
    { id: M("any-oscillation-is-shm"), skillId: S("restoring-force"), title: "Thinks any back-and-forth motion is simple harmonic", description: "Treats every repeating or restoring motion (a bouncing ball, a puck between walls, a cart in a V-shaped track) as SHM, or assumes the restoring force or acceleration in SHM is constant.", remediation: "SHM has a specific force law: the net force is proportional to the displacement from equilibrium and opposite to it, F = −kx. Test it: does doubling the displacement double the force? A constant force, or a force only at the walls, gives periodic motion that is not simple harmonic." },
    { id: M("amplitude-peak-to-peak"), skillId: S("oscillation-description"), title: "Uses the distance between the extremes as the amplitude", description: "Reports the full peak-to-peak distance (from one extreme to the other) as the amplitude, or doubles the coefficient in front of the cosine.", remediation: "Amplitude is measured from the equilibrium position, the middle of the motion, to one extreme. Find the midpoint first; the amplitude is the distance from there to either end, which is half the distance between the extremes." },
    { id: M("miscounts-cycle"), skillId: S("oscillation-description"), title: "Miscounts what one full cycle is", description: "Treats a trip from one extreme to the other (half a cycle) or from an extreme to equilibrium (a quarter) as a complete cycle, so distances per cycle come out as A or 2A and periods come out too short.", remediation: "A cycle ends where it began, in the same state: same position and moving the same way. From +A that means to equilibrium, to −A, back to equilibrium and back to +A: four amplitudes of distance and four equal quarters of time." },
    { id: M("period-frequency-swap"), skillId: S("period-frequency"), title: "Swaps period and frequency", description: "Gives the frequency when the period is asked (or the reverse), treats them as equal, or multiplies when one should divide.", remediation: "Period is seconds per cycle; frequency is cycles per second. They are reciprocals: T = 1/f. Check units: a period is a time in s, a frequency is in Hz = 1/s. A big frequency always goes with a short period." },
    { id: M("spring-mass-inverse"), skillId: S("spring-period"), title: "Gets the mass and stiffness dependence backwards", description: "Writes √(k/m) where √(m/k) belongs (or the reverse), expecting a heavier block to oscillate faster or a stiffer spring to oscillate more slowly.", remediation: "Reason physically: a heavier block is harder to accelerate, so it moves more slowly and its period is longer (m on top in T). A stiffer spring pulls harder, so the block moves faster and the period is shorter (k on the bottom in T). For speeds, the reverse: v_max = A√(k/m)." },
    { id: M("no-square-root"), skillId: S("spring-period"), title: "Forgets the square root when scaling", description: "Assumes the period is directly proportional to mass, length or 1/k (or the frequency to 1/m), so that doubling the mass doubles the period.", remediation: "In T = 2π√(m/k) and T = 2π√(L/g) the quantities sit inside a square root. Multiplying m or L by a factor multiplies T by the square root of that factor: four times the mass gives twice the period, nine times the stiffness gives one-third of the period." },
    { id: M("period-depends-amplitude"), skillId: S("spring-period"), title: "Thinks a bigger amplitude changes the period", description: "Expects a larger amplitude to give a longer period (more distance to cover) or a shorter one (bigger force).", remediation: "In SHM the two effects cancel exactly: twice the amplitude means twice the distance but also twice the force and twice the speeds. Neither T = 2π√(m/k) nor (for small angles) T = 2π√(L/g) contains the amplitude." },
    { id: M("spring-depends-g"), skillId: S("spring-period"), title: "Thinks gravity changes the period of a mass on a spring", description: "Expects a mass–spring oscillator to run slower on the Moon or to have a different period when hung vertically, by analogy with a pendulum.", remediation: "A spring supplies its own restoring force, so g does not appear in T = 2π√(m/k). For a vertical spring, gravity only shifts the equilibrium position down; oscillations about that new position have the same period. Only the pendulum, whose restoring force comes from gravity, depends on g." },
    { id: M("pendulum-mass"), skillId: S("pendulum-period"), title: "Thinks a heavier bob changes a pendulum's period", description: "Expects a heavier pendulum bob to swing faster (more pull) or slower (more inertia), or to rise higher.", remediation: "A heavier bob is pulled harder by gravity but is also harder to accelerate, in exactly the same proportion, so mass cancels. T = 2π√(L/g) contains only length and g; the same cancellation means every bob released from the same height rises to the same height." },
    { id: M("pendulum-g-backwards"), skillId: S("pendulum-period"), title: "Gets the effect of g on a pendulum backwards", description: "Expects stronger gravity to make a pendulum swing more slowly (longer period) or weaker gravity to make it swing faster, or writes √(g/L).", remediation: "Gravity is the pendulum's restoring force. Stronger gravity pulls it back harder, so it swings faster and its period is shorter: g is in the denominator of T = 2π√(L/g). A pendulum clock on the Moon runs slow." },
    { id: M("speed-max-at-extreme"), skillId: S("motion-in-cycle"), title: "Thinks the speed is greatest at the turning points", description: "Places the greatest speed (or kinetic energy) at maximum displacement, or thinks the object is at rest at equilibrium.", remediation: "At a turning point the object stops to reverse direction, so its speed is zero. The restoring force speeds it up all the way to equilibrium and slows it down afterward, so the speed is greatest at equilibrium." },
    { id: M("accel-at-extremes"), skillId: S("motion-in-cycle"), title: "Thinks the acceleration is zero at the turning points or greatest at equilibrium", description: "Assumes that zero velocity means zero acceleration at the extremes, or that the acceleration (or force) is largest where the speed is largest.", remediation: "Acceleration follows displacement, not speed: a = −(k/m)x. It is zero at equilibrium, where the object is fastest, and largest at the turning points, where the object is momentarily at rest but its velocity is changing most quickly." },
    { id: M("velocity-in-phase"), skillId: S("shm-graphs"), title: "Thinks velocity peaks when position peaks", description: "Reads the height of a position–time graph as the velocity, or draws the velocity graph in step with the position graph.", remediation: "Velocity is the slope of the position–time graph. At a peak or trough the slope is zero, so the velocity is zero; where the graph crosses the axis it is steepest, so the speed is greatest. The velocity graph is shifted a quarter cycle from the position graph." },
    { id: M("degrees-in-cosine"), skillId: S("shm-equation"), title: "Evaluates cos(2πft) in degrees", description: "Leaves the calculator in degree mode when evaluating x = A cos(2πft), getting a cosine very close to 1 and a position almost equal to A.", remediation: "The angle 2πft is in radians: one full cycle is 2π radians, not 360 of anything else. Switch the calculator to radian mode, or convert t into a fraction of a period and think in quarters of a cycle to check your answer." },
    { id: M("omega-as-frequency"), skillId: S("shm-equation"), title: "Reads the number multiplying t as the frequency", description: "Given x = A cos(6πt), reports the frequency as 6π Hz or 6 Hz instead of solving 2πf = 6π.", remediation: "The number multiplying t is 2πf, not f. Set it equal to 2πf and solve: 6π = 2πf gives f = 3 Hz. Then T = 1/f." },
    { id: M("energy-not-conserved"), skillId: S("energy-exchange"), title: "Thinks the total energy changes during an ideal oscillation", description: "Expects the total mechanical energy to peak at equilibrium or at the turning points, has kinetic and potential energy both at maximum together, or thinks energy vanishes when the object stops.", remediation: "With no friction the total K + U is the same at every instant; energy only moves between the two forms. When one is at its maximum the other is zero. Draw energy bars at three points (one extreme, equilibrium, the other extreme): the bars always add to the same height." },
    { id: M("energy-linear-amplitude"), skillId: S("energy-calculations"), title: "Thinks energy is proportional to amplitude", description: "Expects doubling the amplitude to double the total energy, or doubling the amplitude to be the way to double the energy.", remediation: "E = ½kA² depends on the square of the amplitude. Twice the amplitude stores four times the energy; to double the energy, the amplitude only needs to grow by √2 ≈ 1.41." },
    { id: M("proportional-to-displacement"), skillId: S("energy-calculations"), title: "Splits energy or speed in proportion to displacement", description: "Assumes that at x = A/2 the spring holds half the energy, or the block has half its maximum speed, or draws energy against position as straight lines.", remediation: "Spring energy goes as x²: at x = A/2 it is (1/2)² = 1/4 of the total, so the kinetic energy is 3/4 of the total and the speed is √(3/4) ≈ 0.87 of the maximum. Always find speeds at a position from energy: ½mv² = ½kA² − ½kx²." },
    { id: M("drops-half"), skillId: S("energy-calculations"), title: "Drops the ½ in ½kx² or ½mv²", description: "Writes the spring energy as kA² or the kinetic energy as mv², giving energies twice too large or speeds off by √2.", remediation: "Both energies carry a factor of ½: U_s = ½kx² and K = ½mv². When you equate them (½kA² = ½mv²), the halves cancel, but when you compute either one on its own, keep the ½." },
  ],

  units: [
    {
      id: U,
      number: 7,
      title: "Oscillations",
      description: "Simple harmonic motion: restoring forces and the condition for SHM, period and frequency, the mass–spring oscillator and the simple pendulum, graphs and the equation x = A cos(2πft), and the exchange of kinetic and potential energy in an oscillator.",
      topics: [
        // ─────────────────────────── Topic 1 ────────────────────────────
        {
          id: T("shm"),
          title: "Simple harmonic motion",
          description: "What makes an oscillation simple harmonic, and how to describe one by its equilibrium position, amplitude and cycle.",
          objectives: [
            { id: "physics-1.o.u7.a", code: "PHYS-7.A", description: "Identify a restoring force proportional to and opposite the displacement from equilibrium as the condition for simple harmonic motion, and apply Hooke's law.", skillIds: [S("restoring-force")] },
            { id: "physics-1.o.u7.b", code: "PHYS-7.B", description: "Describe an oscillation in terms of its equilibrium position, amplitude and cycle.", skillIds: [S("oscillation-description")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u7.restoring-force",
              title: "Restoring forces and simple harmonic motion",
              summary: "Why some objects oscillate, and the one force law, F = −kx, that makes an oscillation simple harmonic.",
              estMinutes: 14,
              skillIds: [S("restoring-force")],
              blocks: [
                { type: "text", md: r`A guitar string, a car bouncing on its suspension, a child on a swing, the quartz crystal in a watch: all of these move back and forth about a middle position, over and over. This unit is about that kind of motion, called **oscillation**, and especially about the simplest and most important kind, **simple harmonic motion**.

Every oscillator has two ingredients: a position where it would happily sit still, and a force that pushes it back toward that position whenever it is moved away.` },
                { type: "definition", term: "Equilibrium position", md: r`The position where the net force on the object is zero. Left there at rest, the object would stay put. In this unit we measure the displacement $x$ from the equilibrium position, so equilibrium is $x = 0$.` },
                { type: "definition", term: "Restoring force", md: r`A force that always points back toward the equilibrium position. Displace the object to the right and the restoring force points left; displace it to the left and the force points right.` },
                { type: "text", md: r`## Springs: Hooke's law

Stretch or compress an ideal spring by a distance $x$ from its natural length and it pulls or pushes back with a force proportional to $x$. Twice the stretch, twice the force. The constant of proportionality $k$, the **spring constant**, measures stiffness in newtons per metre.` },
                { type: "formula", latex: r`F_s = -kx`, caption: "Hooke's law. x is the displacement from equilibrium; the minus sign means the force points opposite to x, back toward equilibrium. The size of the force is k|x|." },
                {
                  type: "worked_example",
                  title: "A glider on an air track",
                  problem: r`A glider on a frictionless track is attached to a spring with $k = 60\,\text{N/m}$. Taking $+x$ to the right of equilibrium, find the spring force on the glider when it is (a) $0.050\,\text{m}$ to the right and (b) $0.10\,\text{m}$ to the left of equilibrium.`,
                  steps: [
                    { title: "(a) Displacement with its sign", md: r`$x = +0.050\,\text{m}$, so $F = -kx = -(60)(0.050) = -3.0\,\text{N}$: $3.0\,\text{N}$ to the left, back toward equilibrium.` },
                    { title: "(b) Displacement with its sign", md: r`$x = -0.10\,\text{m}$, so $F = -(60)(-0.10) = +6.0\,\text{N}$: $6.0\,\text{N}$ to the right, again toward equilibrium.` },
                    { title: "Notice", md: r`Twice the displacement gave twice the force, and the force always pointed back toward $x = 0$, whichever side the glider was on.` },
                  ],
                  answer: r`(a) $3.0\,\text{N}$ left; (b) $6.0\,\text{N}$ right`,
                },
                { type: "check", questionId: Q("rf-2"), lead: "Size of a spring force." },
                { type: "callout", tone: "key", title: "The condition for simple harmonic motion", md: r`An object moves in **simple harmonic motion (SHM)** when the net force on it is a restoring force **proportional to its displacement** from equilibrium:

$$F_{\text{net}} = -kx$$

Both parts matter. The force must point back toward equilibrium, *and* its size must grow in proportion to the displacement. A mass on an ideal spring satisfies this exactly; a pendulum swinging through a small angle satisfies it very nearly.` },
                { type: "text", md: r`## What happens during the motion

Pull a block on a spring to the right and let go. The spring pulls it left, so it speeds up toward equilibrium. At equilibrium the force is zero, but the block is moving, so it **overshoots**. Now the spring is compressed and pushes right, slowing the block until it stops on the far side. Then the whole thing runs in reverse. With no friction this repeats forever.

Because $F = ma$, the acceleration in SHM is also proportional to the displacement and opposite to it: $a = -\dfrac{k}{m}x$.` },
                { type: "callout", tone: "warning", title: "The force does not follow the velocity", md: r`It is tempting to think the spring force points the way the block is moving. It does not. The direction of the restoring force depends only on **where** the block is: right of equilibrium, the force points left, whether the block is moving left (speeding up) or right (slowing down). For half of every cycle the force and the velocity point in opposite directions.` },
                { type: "check", questionId: Q("rf-1"), lead: "Which way does the spring pull?" },
                { type: "callout", tone: "warning", title: "Repeating is not enough", md: r`A ball bouncing on a hard floor repeats, and so does a puck sliding back and forth between two walls. Neither is simple harmonic. In the air the ball feels a constant force (gravity), and the puck feels no force at all between the walls. SHM needs a force that grows steadily as the object moves further from equilibrium.` },
                { type: "tutor_prompt", prompts: ["Why does the block overshoot equilibrium instead of stopping there?", "Is a pendulum really simple harmonic, or only approximately?", "How can I tell from a table of force and displacement whether a motion is SHM?"] },
                { type: "summary", points: [r`The equilibrium position is where the net force is zero; displacement $x$ is measured from it.`, "A restoring force always points back toward equilibrium.", r`Hooke's law: an ideal spring exerts $F_s = -kx$, with size $k|x|$ and $k$ in N/m.`, r`SHM happens when the net force is $F = -kx$: restoring **and** proportional to displacement. Then $a = -\tfrac{k}{m}x$.`, "The restoring force depends on position, not on the direction of motion. Periodic motion with a constant restoring force is not SHM."] },
              ],
            },
            {
              id: "physics-1.l.u7.describing-oscillations",
              title: "Equilibrium, amplitude and cycles",
              summary: "The vocabulary for describing any oscillation, and the most common way to miscount a cycle.",
              estMinutes: 10,
              skillIds: [S("oscillation-description")],
              blocks: [
                { type: "text", md: r`Before we can calculate anything about an oscillator we need a precise way to describe it. Three ideas do most of the work: where the middle is, how far the object goes from the middle, and what counts as one complete repetition.` },
                { type: "definition", term: "Amplitude", md: r`The maximum displacement from the equilibrium position, written $A$. An object oscillating with amplitude $A$ moves back and forth between $x = -A$ and $x = +A$. Amplitude is a distance, so it is never negative.` },
                { type: "definition", term: "Cycle", md: r`One complete repetition of the motion, ending in exactly the same state it began: the same position, moving in the same direction. Starting from $+A$, a cycle goes to equilibrium, on to $-A$, back through equilibrium, and back to $+A$.` },
                { type: "callout", tone: "warning", title: "Amplitude is measured from the middle", md: r`If a glider moves between the $10\,\text{cm}$ and $30\,\text{cm}$ marks, its amplitude is **not** $20\,\text{cm}$. The equilibrium position is halfway, at $20\,\text{cm}$, and the amplitude is the distance from there to either end: $10\,\text{cm}$. The distance between the two extremes is $2A$.` },
                { type: "check", questionId: Q("osc-1"), lead: "Find the middle first." },
                { type: "text", md: r`## Splitting a cycle into quarters

A cycle has four equal quarters. Starting from rest at $x = +A$:

| After | Position | Moving |
|---|---|---|
| $\tfrac14$ cycle | equilibrium ($x = 0$) | toward $-x$, fastest |
| $\tfrac12$ cycle | $x = -A$ | momentarily at rest |
| $\tfrac34$ cycle | equilibrium | toward $+x$, fastest |
| $1$ cycle | $x = +A$ | momentarily at rest |

Each quarter takes the same time, and in each quarter the object covers a distance $A$.` },
                {
                  type: "worked_example",
                  title: "A mass bouncing on a spring",
                  problem: r`A mass on a vertical spring bounces between $35\,\text{cm}$ and $47\,\text{cm}$ above a bench. It takes $0.30\,\text{s}$ to go from its lowest point to its highest point. Find (a) the equilibrium height, (b) the amplitude, (c) the distance it travels in one cycle and (d) the time for one cycle.`,
                  steps: [
                    { title: "(a) Equilibrium is the midpoint", md: r`$\dfrac{35 + 47}{2} = 41\,\text{cm}$ above the bench.` },
                    { title: "(b) Amplitude", md: r`From equilibrium to an extreme: $47 - 41 = 6\,\text{cm}$.` },
                    { title: "(c) Distance per cycle", md: r`Up, down, down, up: four amplitudes, $4 \times 6 = 24\,\text{cm}$. (The displacement over the cycle is zero.)` },
                    { title: "(d) Time per cycle", md: r`Lowest to highest is one extreme to the other: **half** a cycle. A full cycle takes $2 \times 0.30 = 0.60\,\text{s}$.` },
                  ],
                  answer: r`(a) $41\,\text{cm}$; (b) $6\,\text{cm}$; (c) $24\,\text{cm}$; (d) $0.60\,\text{s}$`,
                },
                { type: "callout", tone: "warning", title: "One extreme to the other is only half a cycle", md: r`The most common slip in this unit is to treat a trip from one extreme to the other as a full cycle. A cycle has to bring the object **back** to where it started, moving the same way. So one cycle covers $4A$ of distance, not $2A$, and the time from one extreme to the other is half the cycle time.` },
                { type: "check", questionId: Q("osc-2"), lead: "Count the amplitudes." },
                { type: "summary", points: [r`Amplitude $A$ is the maximum distance from equilibrium; the object moves between $-A$ and $+A$.`, "The equilibrium position is midway between the extremes; the distance between the extremes is 2A.", "A cycle ends in the same position and moving the same way as it started.", r`A cycle has four equal quarters; each covers a distance $A$, so one cycle covers $4A$ with zero displacement.`] },
              ],
            },
          ],
        },
        // ─────────────────────────── Topic 2 ────────────────────────────
        {
          id: T("period-frequency"),
          title: "Period, frequency and the mass–spring oscillator",
          description: "Measure how often an oscillation repeats, and find what sets the period of a mass on a spring.",
          objectives: [
            { id: "physics-1.o.u7.c", code: "PHYS-7.C", description: "Relate period and frequency and determine them from observations of an oscillator.", skillIds: [S("period-frequency")] },
            { id: "physics-1.o.u7.d", code: "PHYS-7.D", description: "Calculate and predict changes in the period of a mass–spring oscillator from its mass and spring constant, and explain why amplitude and gravity do not affect it.", skillIds: [S("spring-period")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u7.period-frequency",
              title: "Period and frequency",
              summary: "Two ways of saying how often an oscillation repeats, and how to measure them accurately.",
              estMinutes: 10,
              skillIds: [S("period-frequency")],
              blocks: [
                { type: "text", md: r`Amplitude says how **far** an oscillator goes. The next question is how **often** it repeats. There are two ways to say this, and they are two views of the same fact.` },
                { type: "definition", term: "Period", md: r`The time taken for one complete cycle, written $T$ and measured in seconds.` },
                { type: "definition", term: "Frequency", md: r`The number of complete cycles per second, written $f$. Its unit is the **hertz**: $1\,\text{Hz} = 1$ cycle per second $= 1\,\text{s}^{-1}$.` },
                { type: "formula", latex: r`f = \frac{1}{T} \qquad T = \frac{1}{f}`, caption: "Period and frequency are reciprocals: a short period means a high frequency." },
                {
                  type: "worked_example",
                  title: "Timing a swing",
                  problem: r`A student times a playground swing and counts $12$ complete swings (there and back) in $30\,\text{s}$. Find the period and the frequency.`,
                  steps: [
                    { title: "Period: time per cycle", md: r`$T = \dfrac{30\,\text{s}}{12} = 2.5\,\text{s}$.` },
                    { title: "Frequency: cycles per time", md: r`$f = \dfrac{12}{30\,\text{s}} = 0.40\,\text{Hz}$.` },
                    { title: "Check", md: r`$\dfrac{1}{T} = \dfrac{1}{2.5\,\text{s}} = 0.40\,\text{Hz}$. ✓` },
                  ],
                  answer: r`$T = 2.5\,\text{s}$, $f = 0.40\,\text{Hz}$`,
                },
                { type: "callout", tone: "tip", title: "Time many cycles, then divide", md: r`Your reaction time when starting and stopping a stopwatch is about $0.2\,\text{s}$. Timing a single $1\,\text{s}$ cycle could be off by $20\%$; timing $20$ cycles and dividing by $20$ shrinks that error to about $1\%$.` },
                { type: "check", questionId: Q("pf-2"), lead: "Time per cycle." },
                { type: "callout", tone: "warning", title: "Keep period and frequency apart", md: r`Period is **seconds per cycle**; frequency is **cycles per second**. If you are given one and asked for the other, you must take a reciprocal. A sanity check: a fast oscillator has a large frequency and a small period. If both of your numbers are big, something has gone wrong.` },
                { type: "check", questionId: Q("pf-1"), lead: "From period to frequency." },
                { type: "summary", points: [r`Period $T$: seconds for one cycle. Frequency $f$: cycles per second, in Hz.`, r`$f = 1/T$ and $T = 1/f$; when one doubles, the other halves.`, "Number of cycles = frequency × time = time ÷ period.", "Time many cycles and divide for an accurate period."] },
              ],
            },
            {
              id: "physics-1.l.u7.mass-spring",
              title: "The mass–spring oscillator",
              summary: "What sets the period of a mass on a spring, how it scales, and the surprising things that do not affect it.",
              estMinutes: 15,
              skillIds: [S("spring-period")],
              blocks: [
                { type: "text", md: r`For a block of mass $m$ on an ideal spring of constant $k$, the period can be worked out exactly. The derivation needs calculus, but the result is simple and the reasoning behind each part is not.` },
                { type: "formula", latex: r`T_s = 2\pi\sqrt{\frac{m}{k}}`, caption: "Period of a mass m on a spring of constant k. Mass in kg, k in N/m, T in s." },
                { type: "callout", tone: "key", title: "Reading the formula physically", md: r`- **More mass, longer period.** A heavier block is harder to accelerate, so the same spring moves it more slowly. $m$ is on top.
- **Stiffer spring, shorter period.** A stiffer spring pulls harder at every displacement, so it whips the block back and forth faster. $k$ is on the bottom.
- **No amplitude.** Pull the block twice as far and it has twice as far to go, but the force is twice as big and it moves twice as fast. The effects cancel exactly.
- **No $g$.** The spring provides its own restoring force, so gravity does not appear.` },
                {
                  type: "worked_example",
                  title: "A cart on a spring",
                  problem: r`A $0.80\,\text{kg}$ cart is attached to a spring with $k = 50\,\text{N/m}$ on a level, frictionless track. Find its period and frequency.`,
                  steps: [
                    { title: "Ratio first", md: r`$\dfrac{m}{k} = \dfrac{0.80}{50} = 0.016\,\text{s}^2$.` },
                    { title: "Square root, then 2π", md: r`$\sqrt{0.016} \approx 0.126\,\text{s}$, so $T = 2\pi(0.126) \approx 0.79\,\text{s}$.` },
                    { title: "Frequency", md: r`$f = 1/T \approx 1.26\,\text{Hz}$.` },
                  ],
                  answer: r`$T \approx 0.79\,\text{s}$, $f \approx 1.3\,\text{Hz}$`,
                },
                { type: "check", questionId: Q("sp-1"), lead: "Your turn: m on top." },
                {
                  type: "worked_example",
                  title: "Working backwards to the spring constant",
                  problem: r`A $0.30\,\text{kg}$ block on a spring completes $10$ oscillations in $6.0\,\text{s}$. What is the spring constant?`,
                  steps: [
                    { title: "Period from the timing", md: r`$T = 6.0/10 = 0.60\,\text{s}$.` },
                    { title: "Rearrange", md: r`Square both sides: $T^2 = 4\pi^2\dfrac{m}{k}$, so $k = \dfrac{4\pi^2 m}{T^2}$.` },
                    { title: "Substitute", md: r`$k = \dfrac{4\pi^2(0.30)}{(0.60)^2} = \dfrac{11.8}{0.36} \approx 33\,\text{N/m}$.` },
                  ],
                  answer: r`$k \approx 33\,\text{N/m}$`,
                },
                { type: "text", md: r`## Scaling: the square root matters

Because $m$ and $k$ sit inside a square root, the period changes by the **square root** of whatever factor you change them by:

| Change | Effect on $T$ |
|---|---|
| mass $\times 4$ | $T \times 2$ |
| mass $\times 2$ | $T \times \sqrt2 \approx 1.41$ |
| $k \times 9$ | $T \div 3$ |
| mass $\times 2$ **and** $k \times 2$ | $T$ unchanged |` },
                { type: "callout", tone: "warning", title: "Don't drop the square root", md: r`"Four times the mass, four times the period" is the classic error. The period goes as $\sqrt m$, so four times the mass gives only twice the period. To halve a period you need a quarter of the mass, or a spring four times as stiff.` },
                { type: "check", questionId: Q("sp-2"), lead: "Scaling with mass." },
                { type: "callout", tone: "info", title: "Vertical springs", md: r`Hang the same mass from the same spring vertically and gravity stretches the spring to a new equilibrium position, where $kx_0 = mg$. The mass oscillates about that lower point with exactly the same period, $2\pi\sqrt{m/k}$. The stretch $x_0$ is a handy way to measure $k$: $k = mg/x_0$.` },
                { type: "tutor_prompt", prompts: ["Why doesn't the amplitude change the period of a spring?", "Why does a mass on a spring have the same period on the Moon?", "How do I find k if I only know how far a hanging mass stretches the spring?"] },
                { type: "summary", points: [r`$T_s = 2\pi\sqrt{m/k}$: more mass gives a longer period; a stiffer spring gives a shorter one.`, r`Rearranged: $k = 4\pi^2 m/T^2$ and $m = kT^2/(4\pi^2)$.`, "The period changes by the square root of the factor applied to m or k.", r`Amplitude and $g$ do not affect the period of a mass–spring oscillator; a vertical spring just oscillates about a lower equilibrium.`] },
              ],
            },
          ],
        },
        // ─────────────────────────── Topic 3 ────────────────────────────
        {
          id: T("pendulum"),
          title: "The simple pendulum",
          description: "Find what sets the period of a pendulum, and compare it with a mass on a spring.",
          objectives: [
            { id: "physics-1.o.u7.e", code: "PHYS-7.E", description: "Calculate and predict changes in the period of a simple pendulum at small angles, and explain why mass and amplitude do not affect it while length and gravitational field strength do.", skillIds: [S("pendulum-period")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u7.pendulum",
              title: "The simple pendulum",
              summary: "Why a small-angle pendulum is simple harmonic, what its period depends on, and how it differs from a spring.",
              estMinutes: 15,
              skillIds: [S("pendulum-period")],
              blocks: [
                { type: "text", md: r`A **simple pendulum** is a small, heavy bob on a light string of length $L$, swinging under gravity. Pull it aside and the string and gravity together produce a force pushing it back toward the lowest point: a restoring force.` },
                { type: "text", md: r`## Why it is (nearly) simple harmonic

The restoring force is the part of the bob's weight that points along its path. For small swings this part is very nearly proportional to how far the bob is from the bottom, which is exactly the SHM condition. For large swings it grows more slowly than the displacement, and the motion, though still periodic, is no longer simple harmonic. That is why the pendulum formula comes with the condition **small angles** (in practice, up to about $15^\circ$).` },
                { type: "formula", latex: r`T_p = 2\pi\sqrt{\frac{L}{g}}`, caption: "Period of a simple pendulum of length L at small angles. On Earth g = 9.8 m/s²." },
                { type: "callout", tone: "key", title: "What does and does not change a pendulum's period", md: r`- **Length:** longer pendulum, longer period ($T \propto \sqrt L$).
- **Gravity:** stronger $g$ pulls the bob back harder, so it swings faster: shorter period ($T \propto 1/\sqrt g$).
- **Mass: no effect.** A heavier bob is pulled harder by gravity but is harder to accelerate, in exactly the same proportion.
- **Amplitude: no effect**, as long as the angle stays small.` },
                {
                  type: "worked_example",
                  title: "A pendulum in a stairwell",
                  problem: r`A pendulum hangs $3.6\,\text{m}$ down a stairwell. (a) What is its period? (b) How long would it need to be to have half that period?`,
                  steps: [
                    { title: "(a) Substitute", md: r`$T = 2\pi\sqrt{\dfrac{3.6}{9.8}} = 2\pi\sqrt{0.367} = 2\pi(0.606) \approx 3.8\,\text{s}$.` },
                    { title: "(b) Use the scaling", md: r`$T \propto \sqrt L$. To halve $T$, $\sqrt L$ must halve, so $L$ must be divided by $4$: $3.6/4 = 0.90\,\text{m}$.` },
                    { title: "Check", md: r`$2\pi\sqrt{0.90/9.8} = 2\pi(0.303) \approx 1.9\,\text{s}$, half of $3.8\,\text{s}$. ✓` },
                  ],
                  answer: r`(a) about $3.8\,\text{s}$; (b) $0.90\,\text{m}$`,
                },
                { type: "check", questionId: Q("pp-1"), lead: "Period from length." },
                { type: "callout", tone: "warning", title: "A heavier bob does not swing faster or slower", md: r`It feels as if a heavy bob should either drop back faster (more pull) or move more sluggishly (more inertia). Both are true, and they cancel exactly, just as a heavy and a light ball fall together. Mass appears nowhere in $T = 2\pi\sqrt{L/g}$. A child and an adult on the same swing have the same period.` },
                { type: "check", questionId: Q("pp-2"), lead: "Does the bob's mass matter?" },
                {
                  type: "worked_example",
                  title: "Measuring g on another world",
                  problem: r`On Mars, a $0.50\,\text{m}$ pendulum is timed at $23$ cycles in $53\,\text{s}$. Estimate $g$ on Mars.`,
                  steps: [
                    { title: "Period", md: r`$T = 53/23 \approx 2.30\,\text{s}$.` },
                    { title: "Rearrange for g", md: r`$T^2 = 4\pi^2\dfrac{L}{g} \Rightarrow g = \dfrac{4\pi^2 L}{T^2}$.` },
                    { title: "Substitute", md: r`$g = \dfrac{4\pi^2(0.50)}{(2.30)^2} = \dfrac{19.7}{5.29} \approx 3.7\,\text{m/s}^2$, a little over a third of Earth's.` },
                  ],
                  answer: r`$g \approx 3.7\,\text{m/s}^2$`,
                },
                { type: "text", md: r`## Springs and pendulums side by side

| | Mass on a spring | Simple pendulum |
|---|---|---|
| Period | $2\pi\sqrt{m/k}$ | $2\pi\sqrt{L/g}$ |
| Depends on mass? | yes: more mass, longer $T$ | no |
| Depends on $g$? | no | yes: stronger $g$, shorter $T$ |
| Depends on amplitude? | no | no (small angles) |
| Restoring force from | the spring | gravity |

Take both to the Moon and the spring keeps its period while the pendulum slows down, because only the pendulum relies on gravity for its restoring force.` },
                { type: "callout", tone: "warning", title: "Which way does g push the period?", md: r`$g$ is in the **denominator**. Weaker gravity means a weaker restoring force and a **longer** period: a pendulum clock on the Moon runs slow. And remember the square root: four times the gravity halves the period.` },
                { type: "tutor_prompt", prompts: ["Why doesn't the mass of a pendulum bob affect its period?", "Why does the pendulum formula only work for small angles?", "Would a pendulum clock run fast or slow at the top of a mountain?"] },
                { type: "summary", points: [r`$T_p = 2\pi\sqrt{L/g}$, valid for small angles where the restoring force is nearly proportional to displacement.`, "Longer string: longer period. Stronger gravity: shorter period. Both through a square root.", "The bob's mass and the (small) amplitude do not affect the period.", r`Rearranged: $L = gT^2/(4\pi^2)$ and $g = 4\pi^2L/T^2$, so a pendulum can measure $g$.`, "A spring's period depends on m and k but not g; a pendulum's depends on L and g but not m."] },
              ],
            },
          ],
        },
        // ─────────────────────────── Topic 4 ────────────────────────────
        {
          id: T("representing"),
          title: "Representing and analysing SHM",
          description: "Follow the velocity and acceleration through a cycle, read the motion from graphs, and use the equation x = A cos(2πft).",
          objectives: [
            { id: "physics-1.o.u7.f", code: "PHYS-7.F", description: "Determine where in a cycle the speed and acceleration of an oscillator are zero or greatest, and relate position–, velocity– and acceleration–time graphs of SHM.", skillIds: [S("motion-in-cycle"), S("shm-graphs")] },
            { id: "physics-1.o.u7.g", code: "PHYS-7.G", description: "Use the equation x = A cos(2πft) to describe and predict the motion of a simple harmonic oscillator.", skillIds: [S("shm-equation")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u7.through-a-cycle",
              title: "Velocity and acceleration through a cycle",
              summary: "Where the oscillator is fastest, where its acceleration is largest, and which way each points at any moment.",
              estMinutes: 13,
              skillIds: [S("motion-in-cycle")],
              blocks: [
                { type: "text", md: r`In SHM nothing is constant: position, velocity, force and acceleration all change continuously. But they change in a very orderly way, and a few anchor points let you work out everything else.` },
                { type: "callout", tone: "key", title: "Two rules that settle almost everything", md: r`1. **Acceleration follows position.** Since $a = -\dfrac{k}{m}x$, the acceleration is zero at equilibrium, largest at the turning points ($\pm A$), and always points toward equilibrium.
2. **Speed is the opposite.** The object is momentarily at rest at the turning points and moves fastest as it passes through equilibrium.` },
                { type: "text", md: r`## The anchor points

| Position | Speed | Acceleration (and net force) |
|---|---|---|
| $x = +A$ | zero | largest, pointing $-x$ |
| $x = 0$ | largest | zero |
| $x = -A$ | zero | largest, pointing $+x$ |

Between these points the object is **speeding up** when it moves toward equilibrium (velocity and acceleration point the same way) and **slowing down** when it moves away (they point opposite ways).` },
                { type: "check", questionId: Q("cyc-1"), lead: "Where is it fastest?" },
                { type: "callout", tone: "warning", title: "At rest does not mean no acceleration", md: r`At a turning point the velocity is zero for an instant, but it is changing from one direction to the other as fast as it ever does. That is the largest acceleration of the cycle. If the acceleration really were zero there, the object would simply stay at rest at $x = A$.

The mirror-image mistake is to put the largest acceleration at equilibrium "because it is moving fastest there". Speed and acceleration are different things: at equilibrium the force is zero, so the acceleration is zero.` },
                {
                  type: "worked_example",
                  title: "A block passing a point",
                  problem: r`A $0.50\,\text{kg}$ block on a spring with $k = 200\,\text{N/m}$ oscillates with amplitude $0.10\,\text{m}$ ($+x$ to the right). It is at $x = +0.050\,\text{m}$, moving left. Find the direction and size of its acceleration, say whether it is speeding up or slowing down, and find its largest acceleration in the cycle.`,
                  steps: [
                    { title: "Direction from position", md: r`$x$ is positive, so the acceleration points toward equilibrium: to the left ($-x$).` },
                    { title: "Size", md: r`$|a| = \dfrac{k}{m}|x| = \dfrac{200}{0.50}(0.050) = 20\,\text{m/s}^2$.` },
                    { title: "Speeding up or slowing down?", md: r`It is moving left and accelerating left: same direction, so it is **speeding up** on its way to equilibrium.` },
                    { title: "Largest acceleration", md: r`At $x = \pm A$: $a_{\max} = \dfrac{kA}{m} = \dfrac{(200)(0.10)}{0.50} = 40\,\text{m/s}^2$. At half the amplitude it had half of this.` },
                  ],
                  answer: r`$20\,\text{m/s}^2$ to the left, speeding up; $a_{\max} = 40\,\text{m/s}^2$`,
                },
                { type: "check", questionId: Q("cyc-2"), lead: "At the turning point." },
                { type: "callout", tone: "tip", title: "Pendulums follow the same pattern", md: r`A pendulum bob is momentarily at rest at the top of each swing and fastest at the bottom. Along its path, the restoring push is largest at the ends of the swing and zero at the bottom, just like a block on a spring.` },
                { type: "summary", points: [r`Acceleration follows position: $a = -\tfrac{k}{m}x$, zero at equilibrium, largest ($kA/m$) at $\pm A$, always toward equilibrium.`, "Speed is zero at the turning points and greatest at equilibrium.", "Moving toward equilibrium: speeding up. Moving away: slowing down.", "Zero velocity at a turning point goes with the largest acceleration, not zero acceleration."] },
              ],
            },
            {
              id: "physics-1.l.u7.graphs-equation",
              title: "Graphs and the equation x = A cos(2πft)",
              summary: "The wave-shaped graphs of SHM, how position, velocity and acceleration line up, and how to read and use the cosine model.",
              estMinutes: 16,
              skillIds: [S("shm-graphs"), S("shm-equation")],
              blocks: [
                { type: "text", md: r`Plot the position of a simple harmonic oscillator against time and you get a smooth, repeating wave: a **sinusoid**. The height of the wave is the amplitude and the time for one repeat is the period.` },
                { type: "text", md: r`## Reading a position–time graph

Suppose a cart is released from rest at $x = +5\,\text{cm}$. Readings from its graph:

| $t$ (s) | 0 | 0.2 | 0.4 | 0.6 | 0.8 | 1.0 | 1.2 | 1.4 | 1.6 |
|---|---|---|---|---|---|---|---|---|---|
| $x$ (cm) | 5.0 | 3.5 | 0 | −3.5 | −5.0 | −3.5 | 0 | 3.5 | 5.0 |

- **Amplitude:** the graph swings between $+5$ and $-5\,\text{cm}$ about $0$, so $A = 5\,\text{cm}$.
- **Period:** it first returns to $+5\,\text{cm}$ at $t = 1.6\,\text{s}$, so $T = 1.6\,\text{s}$.
- **Velocity is the slope.** At $t = 0$ and $t = 0.8\,\text{s}$ (peak and trough) the graph is flat: the cart is at rest. At $t = 0.4\,\text{s}$ and $1.2\,\text{s}$ the graph is steepest: the cart is passing equilibrium at top speed.` },
                { type: "check", questionId: Q("gr-1"), lead: "Read the period from a table." },
                { type: "callout", tone: "key", title: "How the three graphs line up", md: r`- **Velocity** is a quarter cycle out of step with position: it is zero at the peaks and troughs of $x$ and largest where $x$ crosses zero.
- **Acceleration** is the position graph turned upside down, because $a = -\tfrac{k}{m}x$: most negative when $x$ is at its peak, most positive when $x$ is at its trough.

So for a cart released from $+A$: $x$ starts at its maximum, $v$ starts at zero and goes negative, and $a$ starts at its most negative value.` },
                { type: "callout", tone: "warning", title: "The velocity graph is not a copy of the position graph", md: r`Where the position graph is highest, the object is at a turning point and its velocity is **zero**. Read velocity from the slope of the $x$–$t$ graph, never from its height.` },
                { type: "text", md: r`## The equation of motion

An oscillator released from rest at $x = +A$ at $t = 0$ follows`},
                { type: "formula", latex: r`x = A\cos(2\pi f t)`, caption: "Position of a simple harmonic oscillator that starts at x = +A. A is the amplitude, f the frequency; the angle 2πft is in radians." },
                { type: "text", md: r`Each time $t$ increases by one period, the angle $2\pi f t$ increases by $2\pi$ radians and the cosine repeats. Quarter-period checkpoints make good sanity checks: at $t = T/4$ the angle is $\pi/2$ and $x = 0$; at $t = T/2$ it is $\pi$ and $x = -A$.` },
                {
                  type: "worked_example",
                  title: "Reading and using the equation",
                  problem: r`A block moves according to $x = (0.12\,\text{m})\cos(5\pi t)$, with $t$ in seconds. Find (a) the amplitude, frequency and period and (b) the position at $t = 0.10\,\text{s}$ and $t = 0.30\,\text{s}$.`,
                  steps: [
                    { title: "(a) Match term by term", md: r`$A = 0.12\,\text{m}$. The number multiplying $t$ is $2\pi f$: $2\pi f = 5\pi$, so $f = 2.5\,\text{Hz}$ and $T = 1/f = 0.40\,\text{s}$.` },
                    { title: "(b) t = 0.10 s", md: r`Angle $= 5\pi(0.10) = 0.5\pi$ rad, and $\cos(\pi/2) = 0$: $x = 0$. That is a quarter period, so the block is passing equilibrium. ✓` },
                    { title: "(b) t = 0.30 s", md: r`Angle $= 1.5\pi$ rad, and $\cos(3\pi/2) = 0$: $x = 0$ again, three-quarters of a period in, passing equilibrium the other way.` },
                  ],
                  answer: r`(a) $0.12\,\text{m}$, $2.5\,\text{Hz}$, $0.40\,\text{s}$; (b) $x = 0$ at both times`,
                },
                { type: "check", questionId: Q("eq-1"), lead: "Read the equation." },
                { type: "callout", tone: "warning", title: "Two traps in the equation", md: r`1. **Radians.** The angle $2\pi f t$ is in radians. A calculator in degree mode will give a cosine close to $1$ for almost any small angle, and a position suspiciously close to $A$.
2. **The number in front of $t$ is $2\pi f$, not $f$.** In $x = A\cos(6\pi t)$ the frequency is $3\,\text{Hz}$, not $6\pi$ or $6\,\text{Hz}$.` },
                { type: "check", questionId: Q("eq-2"), lead: "Radian mode on." },
                { type: "callout", tone: "info", title: "Sine or cosine? Phase", md: r`An oscillator that starts at equilibrium moving in $+x$ follows $x = A\sin(2\pi f t)$ instead. It is the same motion shifted by a quarter cycle. That shift in starting point is called a difference in **phase**: two identical pendulums released at different moments are out of phase with each other.` },
                { type: "summary", points: ["The position–time graph of SHM is a sinusoid: its height is the amplitude and its repeat time is the period.", "Velocity is the slope of the position graph: zero at peaks and troughs, largest at the axis crossings (a quarter cycle out of step).", "The acceleration graph is the position graph upside down.", r`$x = A\cos(2\pi ft)$ for a start at $+A$; the coefficient of $t$ is $2\pi f$, and the angle is in radians.`, "A sine starts at equilibrium: the same motion a quarter cycle out of phase."] },
              ],
            },
          ],
        },
        // ─────────────────────────── Topic 5 ────────────────────────────
        {
          id: T("energy"),
          title: "Energy of simple harmonic oscillators",
          description: "Follow energy between kinetic and potential forms through a cycle, and use the total energy to find amplitudes and speeds.",
          objectives: [
            { id: "physics-1.o.u7.h", code: "PHYS-7.H", description: "Describe the exchange between kinetic energy and elastic or gravitational potential energy in an oscillating system, with constant total energy in the absence of friction.", skillIds: [S("energy-exchange")] },
            { id: "physics-1.o.u7.i", code: "PHYS-7.I", description: "Calculate the total energy, amplitude, maximum speed and speed at any displacement of a simple harmonic oscillator, and predict how they depend on amplitude, mass and spring constant.", skillIds: [S("energy-calculations")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u7.energy-exchange",
              title: "Energy sloshing between kinetic and potential",
              summary: "Where the energy of an oscillator is at each point of a cycle, and why the total stays the same.",
              estMinutes: 12,
              skillIds: [S("energy-exchange")],
              blocks: [
                { type: "text", md: r`An oscillator is an energy-sharing machine. A stretched spring stores energy; a moving block carries energy; and during each cycle the energy passes from one to the other and back again, twice.` },
                { type: "definition", term: "Elastic potential energy", md: r`The energy stored in a spring stretched or compressed by $x$ from its natural length: $U_s = \tfrac12 kx^2$. It is zero at equilibrium and grows with the **square** of the displacement.` },
                { type: "definition", term: "Kinetic energy", md: r`The energy of motion of the block: $K = \tfrac12 mv^2$.` },
                { type: "callout", tone: "key", title: "The total stays constant", md: r`With no friction, the total mechanical energy of the block–spring system does not change:

$$E = K + U_s = \text{constant}$$

At the turning points ($x = \pm A$) the block is at rest, so all of $E$ is spring energy. At equilibrium the spring is unstretched, so all of $E$ is kinetic. In between, the energy is shared.` },
                { type: "text", md: r`## Energy bars through a half-cycle

Released from rest at $x = +A$ with total energy $E$:

| Position | $U_s$ | $K$ | Total |
|---|---|---|---|
| $x = +A$ | $E$ | $0$ | $E$ |
| $x = +A/2$ | $\tfrac14E$ | $\tfrac34E$ | $E$ |
| $x = 0$ | $0$ | $E$ | $E$ |
| $x = -A/2$ | $\tfrac14E$ | $\tfrac34E$ | $E$ |
| $x = -A$ | $E$ | $0$ | $E$ |

The bars change, but they always add to the same height.` },
                { type: "check", questionId: Q("ee-1"), lead: "At a turning point." },
                { type: "callout", tone: "warning", title: "The total does not peak anywhere", md: r`Kinetic energy is greatest at equilibrium; potential energy is greatest at the turning points. The **total** is greatest nowhere in particular: it is the same everywhere. If you ever find both forms at a maximum at the same point, or the total changing, check your reasoning.` },
                { type: "text", md: r`## The pendulum version

For a pendulum the potential energy is **gravitational**. Take the lowest point as zero. Released from rest at height $h$ above the bottom, the bob has $E = mgh$, all potential. At the bottom it is all kinetic: $\tfrac12mv^2 = mgh$. It then climbs to the same height $h$ on the other side. The mass cancels, so every bob released from the same height reaches the same speed at the bottom.` },
                {
                  type: "worked_example",
                  title: "A swinging bob",
                  problem: r`A $0.20\,\text{kg}$ pendulum bob is released from rest $0.15\,\text{m}$ above its lowest point. Find its kinetic energy and speed at the bottom.`,
                  steps: [
                    { title: "Energy at release", md: r`$E = mgh = (0.20)(9.8)(0.15) \approx 0.29\,\text{J}$, all gravitational potential energy.` },
                    { title: "At the bottom", md: r`All of it is kinetic: $K \approx 0.29\,\text{J}$.` },
                    { title: "Speed", md: r`$\tfrac12mv^2 = mgh \Rightarrow v = \sqrt{2gh} = \sqrt{2(9.8)(0.15)} \approx 1.7\,\text{m/s}$.` },
                  ],
                  answer: r`$K \approx 0.29\,\text{J}$; $v \approx 1.7\,\text{m/s}$`,
                },
                { type: "check", questionId: Q("ee-2"), lead: "What happens to the total?" },
                { type: "callout", tone: "info", title: "Real oscillators: damping", md: r`In a real oscillator, friction or air resistance turns a little mechanical energy into thermal energy each cycle. The amplitude shrinks gradually (this is **damping**), but the period stays essentially the same, because the period does not depend on amplitude.` },
                { type: "summary", points: [r`$U_s = \tfrac12kx^2$ and $K = \tfrac12mv^2$; with no friction $K + U$ is constant.`, "At the turning points all the energy is potential; at equilibrium it is all kinetic.", r`For a pendulum, $mgh$ at the top becomes $\tfrac12mv^2$ at the bottom; mass cancels.`, "Damping removes energy: the amplitude decreases while the period stays about the same."] },
              ],
            },
            {
              id: "physics-1.l.u7.energy-calculations",
              title: "Total energy and maximum speed",
              summary: "Use E = ½kA² to find energies, amplitudes and speeds, and predict how they scale.",
              estMinutes: 15,
              skillIds: [S("energy-calculations")],
              blocks: [
                { type: "text", md: r`The energy picture turns into a powerful calculating tool. Because the total is the same everywhere, you can evaluate it wherever it is easiest (usually at a turning point) and use it everywhere else.` },
                { type: "formula", latex: r`E = \tfrac12 kA^2 = \tfrac12 m v_{\max}^2`, caption: "Total energy of a mass–spring oscillator: all spring energy at x = ±A, all kinetic at x = 0." },
                { type: "formula", latex: r`v_{\max} = A\sqrt{\frac{k}{m}}`, caption: "Maximum speed, from setting ½kA² equal to ½mv²max." },
                {
                  type: "worked_example",
                  title: "Energy and top speed",
                  problem: r`A $0.40\,\text{kg}$ block on a spring with $k = 160\,\text{N/m}$ is pulled $0.050\,\text{m}$ from equilibrium and released. Find the total energy and the maximum speed.`,
                  steps: [
                    { title: "Total energy at the turning point", md: r`$E = \tfrac12kA^2 = \tfrac12(160)(0.050)^2 = 0.20\,\text{J}$.` },
                    { title: "All kinetic at equilibrium", md: r`$\tfrac12mv_{\max}^2 = 0.20\,\text{J} \Rightarrow v_{\max} = \sqrt{\dfrac{2(0.20)}{0.40}} = 1.0\,\text{m/s}$.` },
                    { title: "Check with the formula", md: r`$v_{\max} = A\sqrt{k/m} = 0.050\sqrt{400} = 0.050 \times 20 = 1.0\,\text{m/s}$. ✓` },
                  ],
                  answer: r`$E = 0.20\,\text{J}$, $v_{\max} = 1.0\,\text{m/s}$`,
                },
                { type: "check", questionId: Q("ec-1"), lead: "Total energy from the amplitude." },
                { type: "callout", tone: "warning", title: "Keep the halves", md: r`$U_s = \tfrac12kx^2$ and $K = \tfrac12mv^2$ both have a $\tfrac12$. They cancel when you set the two equal, but if you compute either one on its own and drop the $\tfrac12$, your energy comes out twice too big.` },
                { type: "text", md: r`## Speed at any position

At displacement $x$ the spring holds $\tfrac12kx^2$ and the rest of the total is kinetic:

$$\tfrac12mv^2 = \tfrac12kA^2 - \tfrac12kx^2$$` },
                {
                  type: "worked_example",
                  title: "Halfway out",
                  problem: r`For the block above ($E = 0.20\,\text{J}$, $A = 0.050\,\text{m}$, $m = 0.40\,\text{kg}$), find the speed at $x = 0.025\,\text{m}$, half the amplitude.`,
                  steps: [
                    { title: "Spring energy there", md: r`$U_s = \tfrac12(160)(0.025)^2 = 0.050\,\text{J}$: a **quarter** of the total, because $(1/2)^2 = 1/4$.` },
                    { title: "Kinetic energy", md: r`$K = 0.20 - 0.050 = 0.15\,\text{J}$: three-quarters of the total.` },
                    { title: "Speed", md: r`$v = \sqrt{2(0.15)/0.40} \approx 0.87\,\text{m/s}$, about $87\%$ of $v_{\max}$, not $50\%$.` },
                  ],
                  answer: r`$v \approx 0.87\,\text{m/s}$`,
                },
                { type: "callout", tone: "warning", title: "Energy is not shared in proportion to position", md: r`Because $U_s \propto x^2$, at half the amplitude the spring holds only a quarter of the energy, so the block is already moving at about $87\%$ of its top speed. Kinetic and potential energy are equal at $x = A/\sqrt2 \approx 0.71A$, not at $A/2$.` },
                { type: "text", md: r`## How things scale

| Change (same block and spring unless stated) | $E$ | $v_{\max}$ | $T$ |
|---|---|---|---|
| amplitude $\times 2$ | $\times 4$ | $\times 2$ | unchanged |
| mass $\times 4$, same $A$ and $k$ | unchanged | $\times \tfrac12$ | $\times 2$ |
| $k \times 2$, same $A$ and $m$ | $\times 2$ | $\times \sqrt2$ | $\times \tfrac{1}{\sqrt2}$ |

Energy depends on the **square** of the amplitude: to double the energy you only need $\sqrt2$ times the amplitude.` },
                { type: "check", questionId: Q("ec-2"), lead: "From energy to speed." },
                { type: "tutor_prompt", prompts: ["Why is the speed at half the amplitude more than half the maximum speed?", "Why does doubling the amplitude quadruple the energy but only double the maximum speed?", "How do I find the speed of a pendulum bob at the bottom of its swing?"] },
                { type: "summary", points: [r`$E = \tfrac12kA^2 = \tfrac12mv_{\max}^2$, so $v_{\max} = A\sqrt{k/m}$ and $A = \sqrt{2E/k}$.`, r`Speed at any $x$: $\tfrac12mv^2 = \tfrac12kA^2 - \tfrac12kx^2$.`, r`At $x = A/2$ the spring holds $\tfrac14E$; $K = U_s$ at $x = A/\sqrt2$.`, r`$E \propto A^2$; $v_{\max} \propto A$; the period does not depend on $A$.`, r`For a pendulum released from height $h$: $v_{\max} = \sqrt{2gh}$.`] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: unit7Questions,

  assessments: [
    // Topic 1
    {
      id: "physics-1.ex.u7.spot-shm",
      kind: "exercise",
      title: "Recognise simple harmonic motion",
      description: "Decide which way restoring forces point and whether a force law, table or real system gives simple harmonic motion.",
      unitId: U,
      topicId: T("shm"),
      questionIds: range("rf", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u7.amplitude-cycles",
      kind: "exercise",
      title: "Describe an oscillation: equilibrium, amplitude and cycles",
      description: "Find equilibrium positions and amplitudes, count distances per cycle and locate an oscillator after a fraction of a cycle.",
      unitId: U,
      topicId: T("shm"),
      questionIds: range("osc", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u7.hookes-law",
      kind: "exercise",
      title: "Calculate restoring forces and accelerations",
      description: "Use Hooke's law to find spring forces, spring constants and the resulting accelerations, with signs.",
      unitId: U,
      topicId: T("shm"),
      questionIds: range("rf", 11, 18),
      config: exercise,
    },
    // Topic 2
    {
      id: "physics-1.ex.u7.period-frequency",
      kind: "exercise",
      title: "Convert between period and frequency",
      description: "Find periods and frequencies from each other and from timing data, and count cycles in a given time.",
      unitId: U,
      topicId: T("period-frequency"),
      questionIds: range("pf", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u7.spring-period",
      kind: "exercise",
      title: "Calculate the period of a mass on a spring",
      description: "Use T = 2π√(m/k) to find periods, frequencies, masses and spring constants, including a vertical spring.",
      unitId: U,
      topicId: T("period-frequency"),
      questionIds: range("sp", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u7.spring-scaling",
      kind: "exercise",
      title: "Predict how a spring oscillator's period changes",
      description: "Reason about how mass, stiffness, amplitude and gravity affect the period, with square-root scaling.",
      unitId: U,
      topicId: T("period-frequency"),
      questionIds: range("sp", 11, 18),
      config: exercise,
    },
    // Topic 3
    {
      id: "physics-1.ex.u7.pendulum-period",
      kind: "exercise",
      title: "Calculate a pendulum's period and length",
      description: "Use T = 2π√(L/g) to find periods, frequencies, lengths and the gravitational field strength.",
      unitId: U,
      topicId: T("pendulum"),
      questionIds: range("pp", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u7.what-changes-period",
      kind: "exercise",
      title: "Decide what changes a pendulum's period",
      description: "Predict the effect of length, gravity, mass and amplitude on a pendulum, and compare pendulums with springs.",
      unitId: U,
      topicId: T("pendulum"),
      questionIds: range("pp", 11, 18),
      config: exercise,
    },
    // Topic 4
    {
      id: "physics-1.ex.u7.key-points",
      kind: "exercise",
      title: "Find where speed, force and acceleration are greatest",
      description: "Locate the zeros and maxima of speed, force and acceleration in a cycle and give their directions at any point.",
      unitId: U,
      topicId: T("representing"),
      questionIds: range("cyc", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u7.shm-graphs",
      kind: "exercise",
      title: "Read position, velocity and acceleration graphs",
      description: "Read amplitude and period from graphs and tables, connect the three motion graphs and compare phases.",
      unitId: U,
      topicId: T("representing"),
      questionIds: range("gr", 2, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u7.cosine-model",
      kind: "exercise",
      title: "Use x = A cos(2πft)",
      description: "Read amplitude, frequency and period from the equation, evaluate positions in radians and write the equation for a described motion.",
      unitId: U,
      topicId: T("representing"),
      questionIds: range("eq", 3, 10),
      config: exercise,
    },
    // Topic 5
    {
      id: "physics-1.ex.u7.energy-bars",
      kind: "exercise",
      title: "Track kinetic and potential energy through a cycle",
      description: "Say where the energy is at each point of a spring or pendulum cycle, share a fixed total, and explain damping.",
      unitId: U,
      topicId: T("energy"),
      questionIds: range("ee", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u7.total-energy",
      kind: "exercise",
      title: "Calculate total energy and maximum speed",
      description: "Use E = ½kA² and energy conservation to find total energies, amplitudes, maximum speeds and spring constants.",
      unitId: U,
      topicId: T("energy"),
      questionIds: range("ec", 3, 10),
      config: exercise,
    },
    {
      id: "physics-1.ex.u7.amplitude-energy",
      kind: "exercise",
      title: "Reason about amplitude, energy and speed at any point",
      description: "Find speeds and energies at any displacement and predict how energy and speed scale with amplitude and mass.",
      unitId: U,
      topicId: T("energy"),
      questionIds: range("ec", 11, 18),
      config: exercise,
    },
    // Checkpoints
    {
      id: "physics-1.quiz.u7.1",
      kind: "skill_quiz",
      title: "Quiz 1: SHM, period and frequency",
      description: "Seven questions on restoring forces, amplitude and cycles, period and frequency, and the periods of springs and pendulums. No hints.",
      unitId: U,
      topicId: T("pendulum"),
      questionIds: [Q("rf-19"), Q("osc-11"), Q("pf-11"), Q("sp-19"), Q("sp-20"), Q("pp-19"), Q("pp-20")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 90 },
    },
    {
      id: "physics-1.quiz.u7.2",
      kind: "skill_quiz",
      title: "Quiz 2: representing SHM and energy",
      description: "Seven questions on motion through a cycle, SHM graphs, the cosine model and energy in oscillators. No hints.",
      unitId: U,
      topicId: T("energy"),
      questionIds: [Q("cyc-11"), Q("cyc-12"), Q("gr-11"), Q("eq-11"), Q("ee-11"), Q("ec-19"), Q("ec-20")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 90 },
    },
    {
      id: "physics-1.test.u7",
      kind: "unit_test",
      title: "Unit 7 test: oscillations",
      description: "Fifteen questions, 30 minutes. Covers the whole unit: restoring forces, period and frequency, springs and pendulums, graphs and the cosine model, and energy.",
      unitId: U,
      questionIds: [
        Q("rf-20"), Q("osc-12"), Q("pf-12"), Q("sp-21"), Q("sp-22"), Q("pp-21"), Q("pp-22"), Q("cyc-13"),
        Q("gr-12"), Q("gr-13"), Q("eq-12"), Q("ee-12"), Q("ee-13"), Q("ec-21"), Q("ec-22"),
      ],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 15 * 120 },
    },
    {
      id: "physics-1.exam.u7",
      kind: "exam_practice",
      title: "AP-style practice set: oscillations",
      description: "Seven original multi-step items on simple harmonic motion under exam-like timing (2 minutes per question).",
      questionIds: [Q("sp-23"), Q("pp-23"), Q("gr-14"), Q("eq-13"), Q("ee-14"), Q("ec-23"), Q("ec-24")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 120 },
    },
  ],
};
