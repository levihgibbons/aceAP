/**
 * AP Physics 1 — Unit 6: Energy and Momentum of Rotating Systems (rotational
 * kinetic energy, work and power from torques, angular momentum and angular
 * impulse, conservation of angular momentum, rolling without slipping, and
 * orbiting satellites). Assembled into the course in ./index.ts.
 *
 * Original AceAP instructional content. Objective codes ("PHYS-6.C") are
 * AceAP's own and are not College Board codes. Algebra-based throughout;
 * angles in radians, counterclockwise positive, g = 9.8 m/s².
 */
import type { UnitPart } from "./shared";
import { unit6Questions } from "./unit-6.questions";

const r = String.raw;
const S = (id: string) => `physics-1.u6.${id}`;
const Q = (id: string) => `physics-1.q.u6.${id}`;
const M = (id: string) => `physics-1.m.u6.${id}`;
const T = (id: string) => `physics-1.u6.t.${id}`;
const U = "physics-1.u6";

/** LaTeX unit snippets (with a leading thin space). */
const KGM2 = r`\,\text{kg}\cdot\text{m}^2`;
const LU = r`\,\text{kg}\cdot\text{m}^2\text{/s}`;
const NM = r`\,\text{N}\cdot\text{m}`;
const RAD = r`\,\text{rad/s}`;

const exerciseConfig = { feedback: "immediate", assistance: "allowed", questionsPerAttempt: 5 } as const;

export const unit6: UnitPart = {
  skills: [
    {
      id: S("rotational-ke"),
      name: "Rotational kinetic energy",
      description: "Calculate and compare the kinetic energy of a spinning object with K = ½Iω², using angular speed in rad/s and accounting for how the mass is distributed.",
      difficulty: 2,
      keywords: ["rotational kinetic energy", "1/2 I omega squared", "spinning kinetic energy", "flywheel energy", "moment of inertia", "rotational inertia", "rev per minute to rad/s", "energy of a spinning wheel"],
      patternLabels: { "compute-krot": "Calculating ½Iω²", "scale-omega": "Scaling with angular speed", "rpm-convert": "Converting rev/min first", "solve-omega": "Working back to ω", "compare-shapes": "Comparing shapes", concept: "What sets rotational KE", "symbolic-krot": "Rotational KE in symbols", "compare-flywheels": "Comparing two flywheels", "work-to-spin-up": "Energy to spin something up", "energy-change": "Energy removed by slowing" },
    },
    {
      id: S("total-ke"),
      name: "Kinetic energy of systems that move and spin",
      description: "Add translational and rotational kinetic energy for objects that move while spinning, and apply energy conservation to systems with spinning parts such as massive pulleys.",
      difficulty: 3,
      keywords: ["total kinetic energy", "translational and rotational kinetic energy", "massive pulley", "pulley with mass", "energy conservation with rotation", "falling block and pulley", "yo-yo energy", "atwood machine energy"],
      prerequisites: [S("rotational-ke")],
      patternLabels: { "translate-and-spin": "Moving and spinning at once", "pulley-concept": "Massive pulleys: the idea", "fraction-rotational": "Rotational share of KE", "classify-energy": "Which kinds of KE?", "compare-total": "Same energy, different wheels", "symbolic-total": "Total KE in symbols", "energy-conversion": "Where the energy goes", "pulley-speed": "Speed with a massive pulley", "energy-share": "Pulley's share of energy", "symbolic-pulley": "Pulley systems in symbols", "compare-pulleys": "Comparing pulleys", "system-ke": "KE of a whole system", "pulley-height": "Drop height needed", "energy-accounting": "Energy bookkeeping", "spin-and-flight": "Spin during flight" },
    },
    {
      id: S("torque-work"),
      name: "Work done by a torque",
      description: "Calculate the work done by a constant torque as W = τΔθ (angle in radians), decide its sign, and use the rotational work–energy theorem to find speeds and angles.",
      difficulty: 3,
      keywords: ["work done by torque", "W = tau delta theta", "rotational work", "work energy theorem rotation", "friction torque", "revolutions to radians", "winch work", "negative work"],
      prerequisites: [S("rotational-ke")],
      patternLabels: { "compute-work": "Torque times angle", "revs-to-rad": "Angles given in revolutions", "force-at-rim": "Force at the rim", "no-rotation-no-work": "No rotation, no work", "work-energy-rotation": "Work–energy theorem", "find-angle": "Angle to stop", "sign-of-work": "Positive or negative work", "symbolic-work": "Work and speed in symbols", "compare-work": "Comparing work", "net-torque-work": "Net work with friction" },
    },
    {
      id: S("rotational-power"),
      name: "Rotational power",
      description: "Calculate power delivered by a torque as P = τω or as energy per unit time, convert rev/min to rad/s, and reason about the torque–speed trade-off at fixed power.",
      difficulty: 3,
      keywords: ["rotational power", "P = tau omega", "engine power and torque", "motor power", "horsepower torque rpm", "gears torque speed trade-off", "average power flywheel"],
      prerequisites: [S("torque-work")],
      patternLabels: { "compute-power": "Torque times angular speed", "gear-tradeoff": "Torque–speed trade-off", "rpm-power": "Power from rev/min", "find-torque": "Torque from power", "energy-over-time": "Energy per unit time", concept: "Reading P = τω", "symbolic-power": "Power in symbols", "compare-power": "Comparing motors" },
    },
    {
      id: S("angular-momentum"),
      name: "Angular momentum",
      description: "Calculate angular momentum as L = Iω for a rigid object and L = mvr⊥ for a point mass (including one moving in a straight line), with signs for the sense of rotation.",
      difficulty: 3,
      keywords: ["angular momentum", "L = I omega", "L = mvr", "angular momentum of a point mass", "perpendicular distance", "angular momentum straight line", "direction of angular momentum", "kg m^2/s"],
      patternLabels: { "rigid-L": "Rigid objects: L = Iω", "straight-line-L": "Point mass in a straight line", "point-L": "Point mass in a circle", "direction-L": "Signs and directions", "rpm-L": "Angular momentum from rev/min", "compare-L": "Comparing angular momenta", concept: "What angular momentum means", "symbolic-L": "Angular momentum in symbols" },
    },
    {
      id: S("angular-impulse"),
      name: "Angular impulse",
      description: "Relate net torque, time and change in angular momentum (τΔt = ΔL), including areas under torque–time graphs, opposing torques and stopping times.",
      difficulty: 3,
      keywords: ["angular impulse", "torque times time", "change in angular momentum", "torque time graph area", "rotational impulse momentum theorem", "stopping time friction torque", "net torque zero constant spin"],
      prerequisites: [S("angular-momentum")],
      patternLabels: { "compute-impulse": "Torque times time", "compare-impulse": "Comparing angular impulses", "find-final-omega": "Final angular speed", "friction-stop": "Stopping time", "torque-time-graph": "Area under a torque–time graph", "sign-impulse": "Opposing torques and reversal", concept: "What changes angular impulse", "constant-L": "Constant spin, zero net torque", "symbolic-impulse": "Angular impulse in symbols", "multi-step": "Spin-up then coast" },
    },
    {
      id: S("angular-momentum-conservation"),
      name: "Conservation of angular momentum",
      description: "Apply I₁ω₁ = I₂ω₂ when no external torque acts and a system changes shape, and explain why rotational kinetic energy changes even though angular momentum does not.",
      difficulty: 3,
      keywords: ["conservation of angular momentum", "figure skater pulls in arms", "spinning stool dumbbells", "diver tuck", "collapsing star spin", "I1 omega1 = I2 omega2", "kinetic energy increases skater", "no external torque"],
      prerequisites: [S("angular-momentum")],
      patternLabels: { "skater-omega": "Skater pulls in", "ke-change": "What happens to the energy", "stool-weights": "Spinning stool and weights", "concept-why": "Why L is conserved", "star-collapse": "Collapsing stars", "which-conserved": "When is L conserved?", "rpm-ratio": "Working with ratios", "merry-go-round-walk": "Walking on a merry-go-round", "symbolic-cam": "Conservation in symbols" },
    },
    {
      id: S("rotational-collisions"),
      name: "Collisions with rotating objects",
      description: "Use conservation of angular momentum about a pivot or axle for objects that hit, land on or stick to rotating objects, and decide which quantities are and are not conserved.",
      difficulty: 4,
      keywords: ["rotational collision", "child jumps on merry-go-round", "clay hits rod", "bullet hits door", "disk dropped on turntable", "angular momentum about pivot", "linear momentum not conserved pivot", "inelastic rotational collision"],
      prerequisites: [S("angular-momentum-conservation")],
      patternLabels: { "clay-on-disk": "Disks that lock together", "ke-loss": "Kinetic energy lost", "jump-on-mgr": "Jumping onto a merry-go-round", "concept-pivot": "What a pivot changes", "projectile-on-rod": "Projectile hits a pivoted rod", "radial-jump": "Jumping on along a radius", "collision-facts": "What is conserved?", "symbolic-collision": "Collisions in symbols", "free-vs-pivot": "Free object vs pivoted object" },
    },
    {
      id: S("rolling-motion"),
      name: "Rolling without slipping",
      description: "Link a rolling object's speed and spin with v = ωR, find the speeds of points on a rolling wheel, convert between distance and revolutions, and tell rolling from skidding.",
      difficulty: 3,
      keywords: ["rolling without slipping", "v = omega r", "contact point at rest", "top of wheel moves at 2v", "skidding bowling ball", "wheel revolutions distance", "tyre rpm", "static friction rolling"],
      patternLabels: { "omega-from-v": "Angular speed from speed", "point-speeds": "Speeds of points on the wheel", "v-from-omega": "Speed from angular speed", "distance-revolutions": "Distance and revolutions", "slip-or-roll": "Rolling or skidding?", "contact-facts": "The contact point", "symbolic-rolling": "Rolling in symbols" },
    },
    {
      id: S("rolling-energy"),
      name: "Energy of rolling objects",
      description: "Split a rolling object's kinetic energy between translation and rotation, find speeds and heights with energy conservation, and predict which shape wins a race down a ramp.",
      difficulty: 4,
      keywords: ["rolling down a ramp", "which rolls fastest", "hoop vs disk race", "rolling kinetic energy", "speed at bottom of incline rolling", "fraction rotational energy", "rolling vs sliding", "shape factor beta"],
      prerequisites: [S("rolling-motion"), S("total-ke")],
      patternLabels: { "rolling-total": "Total KE of a rolling object", "ramp-race": "Who wins the race?", "speed-at-bottom": "Speed at the bottom", "ke-fraction": "Rotational share of KE", "height-needed": "Height needed", "race-facts": "Ramp-race facts", "roll-up": "Rolling up a slope", "symbolic-rolling-speed": "Rolling speed in symbols", "rotational-part": "The rotational part", "rank-race": "Ranking a race", "speed-ratio": "Ratio of speeds", "why-race": "Why one shape wins", "roll-vs-slide": "Rolling vs sliding" },
    },
    {
      id: S("circular-orbits"),
      name: "Satellites in circular orbits",
      description: "Use gravity as the centripetal force to find orbital speed, period, orbit radius or central mass, and explain weightlessness and why orbital speed does not depend on the satellite's mass.",
      difficulty: 4,
      keywords: ["orbital speed", "satellite orbit", "v = sqrt(GM/r)", "orbital period", "geostationary orbit", "kepler's third law", "weightlessness free fall", "altitude vs orbit radius", "mass of a planet from orbit"],
      patternLabels: { "orbital-speed": "Orbital speed", "mass-independence": "Satellite mass doesn't matter", "radius-from-surface": "Orbit radius from altitude", period: "Orbital period", "concept-freefall": "Why astronauts float", "compare-orbits": "Higher and lower orbits", "kepler-ratio": "Period and radius ratios", "central-mass": "Mass of the central body", "orbit-facts": "Facts about circular orbits", "symbolic-orbit": "Orbits in symbols", geostationary: "A 24-hour orbit" },
    },
    {
      id: S("orbit-energy-momentum"),
      name: "Energy and angular momentum in orbits",
      description: "Apply conservation of angular momentum and of energy to orbits: speeds at the near and far points of an ellipse, the signs of orbital energies, energy to change orbit and escape speed.",
      difficulty: 4,
      keywords: ["elliptical orbit speed", "perihelion aphelion", "angular momentum of a planet", "equal areas equal times", "gravitational potential energy -GMm/r", "total energy of orbit negative", "escape speed", "energy to raise an orbit"],
      prerequisites: [S("circular-orbits"), S("angular-momentum")],
      patternLabels: { "elliptical-speed": "Speeds around an ellipse", "fastest-point": "Where is it fastest?", "orbit-energy-signs": "Orbital energies and signs", "ke-pe-exchange": "Trading kinetic and potential energy", "circular-L": "Angular momentum of a circular orbit", "ellipse-facts": "Facts about elliptical orbits", "why-L-conserved": "Why L is conserved in orbit", "energy-change-orbit": "Energy to change orbit", "escape-speed": "Escape speed", "orbit-change-summary": "Moving to a higher orbit", "equal-areas": "Equal areas in equal times" },
    },
  ],

  misconceptions: [
    { id: M("ke-omega-linear"), skillId: S("rotational-ke"), title: "Treats rotational kinetic energy as proportional to ω", description: "Doubles the energy when the angular speed doubles, uses ½Iω instead of ½Iω², or expects halving ω and doubling I to cancel.", remediation: "Rotational kinetic energy is ½Iω², just as translational kinetic energy is ½mv²: the speed is squared. Doubling ω quadruples the energy; cutting ω to a third cuts the energy to a ninth. When comparing, write the ratio (ω₂/ω₁)² explicitly." },
    { id: M("ignores-distribution"), skillId: S("rotational-ke"), title: "Ignores how the mass is distributed about the axis", description: "Treats every spinning object as if all its mass were at the rim (I = MR²), uses the wrong axis, or assumes objects with the same mass and radius have the same rotational inertia, energy or spin rate.", remediation: "Rotational inertia depends on where the mass is relative to the axis: mass far from the axis counts much more (as r²). A hoop (MR²) has twice the rotational inertia of a solid disk (½MR²) of the same mass and radius. Always pick the formula for the actual shape and axis." },
    { id: M("ignores-rotational-ke"), skillId: S("total-ke"), title: "Leaves out rotational kinetic energy", description: "Counts only ½mv² for objects that also spin, ignores a massive pulley in energy conservation, or treats a rolling object as if it slid without friction (v = √(2gh)).", remediation: "List every moving part and every way it moves. A spinning pulley, a rolling wheel or a spiralling ball carries ½Iω² as well as ½mv². In energy conservation the lost potential energy is shared among all of these, so each part ends up slower than it would if it had the energy to itself." },
    { id: M("non-radian"), skillId: S("torque-work"), title: "Uses revolutions or degrees where radians are needed", description: "Puts rev/min, rev/s, revolutions or degrees straight into W = τΔθ, P = τω, K = ½Iω², L = Iω or v = ωR, or reports radians as revolutions.", remediation: "Rotational formulas that link to linear quantities need radians: one revolution is 2π rad, so ω (rad/s) = 2π × (rev/s) = 2π × (rev/min) ÷ 60. Ratios such as I₁ω₁ = I₂ω₂ are the exception, since the unit cancels. Before substituting, check that every angle is in rad and every angular speed in rad/s." },
    { id: M("force-for-torque"), skillId: S("torque-work"), title: "Uses force where torque belongs", description: "Multiplies a force (rather than a torque) by an angle to get work, by a time to get angular impulse, or assumes the same force always has the same rotational effect wherever it is applied.", remediation: "In rotation, the force's lever arm matters: τ = r⊥F. Work is τΔθ and angular impulse is τΔt, both built from the torque. A check: τΔθ = F·(rΔθ), which is force times the arc length actually moved." },
    { id: M("torque-alone"), skillId: S("angular-impulse"), title: "Judges a rotational effect by the torque alone", description: "Expects the larger torque always to give the larger change in angular momentum (ignoring how long it acts) or the larger power (ignoring how fast the shaft turns).", remediation: "Torque is only half of each story. Angular impulse is τΔt: a small torque for a long time can match a large torque for a short time. Power is τω: a slow shaft with a big torque can deliver less power than a fast shaft with a small one. Compute the product before comparing." },
    { id: M("l-without-rotation"), skillId: S("angular-momentum"), title: "Thinks only rotating objects have angular momentum", description: "Assigns zero angular momentum to an object moving in a straight line, even about a point that is not on its line of motion.", remediation: "Angular momentum is always measured about a chosen point. A point mass has L = mvr⊥ about that point, where r⊥ is the perpendicular distance from the point to its line of motion. Only if the line passes through the point (r⊥ = 0) is L zero. This is what lets a running child give angular momentum to a merry-go-round." },
    { id: M("full-r"), skillId: S("angular-momentum"), title: "Uses the straight-line distance instead of the perpendicular distance", description: "Computes the angular momentum of a moving point mass with its current distance from the point rather than the perpendicular distance from the point to its line of motion.", remediation: "Draw the line along which the object moves and drop a perpendicular from the reference point to that line. That perpendicular length is r⊥ in L = mvr⊥. For straight-line motion it never changes, which is why L stays constant, even though the object's distance from the point does change." },
    { id: M("ignores-direction"), skillId: S("angular-momentum"), title: "Adds angular momenta without signs", description: "Adds the sizes of angular momenta or angular impulses that point in opposite senses (clockwise and counterclockwise), or loses the sign when a torque reverses a rotation.", remediation: "Choose a positive sense (usually counterclockwise) and give every angular velocity, angular momentum and torque a sign. Opposite spins partly cancel. After a reversing torque, a negative answer is meaningful: it says the object now spins the other way." },
    { id: M("omega-conserved"), skillId: S("angular-momentum-conservation"), title: "Thinks angular velocity, not angular momentum, is conserved", description: "Keeps ω the same when a spinning system changes shape (a skater pulling in her arms, a child walking inward), or inverts the ratio.", remediation: "With no external torque, the product L = Iω stays fixed. If I gets smaller, ω must get larger by the same factor: ω₂ = ω₁ × I₁/I₂. Sanity check with a skater: arms in means faster spinning." },
    { id: M("ke-conserved-with-l"), skillId: S("angular-momentum-conservation"), title: "Thinks kinetic energy is conserved whenever angular momentum is", description: "Assumes rotational kinetic energy stays constant when a skater changes shape, or that kinetic energy is conserved in a sticking collision with a rotating object, because angular momentum is conserved.", remediation: "Angular momentum and kinetic energy are conserved under different conditions. Write K = L²/2I: with L fixed, pulling in (smaller I) raises K, and the extra energy comes from work done by muscles; spreading out lowers K. In a collision where objects stick or rub, angular momentum is conserved but kinetic energy is lost to thermal energy." },
    { id: M("linear-momentum-pivot"), skillId: S("rotational-collisions"), title: "Conserves linear momentum when a pivot acts", description: "Applies conservation of linear momentum to a collision with an object on a fixed pivot or axle, or forgets that both momenta are conserved when nothing outside the system pushes.", remediation: "A pivot exerts an external force during the collision, so linear momentum changes. But that force acts at the pivot, so it has no torque about it, and angular momentum about the pivot is conserved. For a free object (no pivot, frictionless surface), both linear and angular momentum are conserved." },
    { id: M("forgets-added-inertia"), skillId: S("rotational-collisions"), title: "Forgets the rotational inertia that is added", description: "After an object lands on, sticks to or is carried by a rotating object, divides the angular momentum by the original rotational inertia only, or thinks something that brings no angular momentum cannot change the spin.", remediation: "After the collision everything turns together, so the final rotational inertia is the sum: I + mr² for a point mass at distance r. Even an object that brings no angular momentum (dropped straight down, or running along a radius) adds inertia and slows the spin." },
    { id: M("all-points-same-speed"), skillId: S("rolling-motion"), title: "Thinks every point of a rolling wheel moves at the centre's speed", description: "Gives the top or the contact point of a rolling wheel the same speed as its centre, ignoring how the spin adds to or subtracts from the forward motion.", remediation: "Each point's velocity is the centre's velocity plus its velocity from the spin, ωR along the rim. Rolling without slipping makes ωR = v, so at the top they add (2v) and at the bottom they cancel (0). Points level with the centre move at √2·v." },
    { id: M("mass-decides-race"), skillId: S("rolling-energy"), title: "Thinks heavier or bigger objects roll down faster", description: "Predicts that the heavier (or larger) of two rolling objects wins a race down a ramp, instead of looking at their shapes.", remediation: "For rolling without slipping, v = √(2gh/(1+β)) where I = βMR²: mass and radius cancel. Only the shape factor β matters. Two solid spheres always tie, whatever their masses; a solid sphere beats a hoop however heavy the hoop." },
    { id: M("orbit-speed-factors"), skillId: S("circular-orbits"), title: "Thinks orbital speed depends on the satellite's mass, or grows with orbit size", description: "Expects heavier satellites to orbit faster or slower than light ones in the same orbit, or expects higher orbits to be faster.", remediation: "From GMm/r² = mv²/r, the satellite's mass cancels: v = √(GM/r) depends only on the central mass and the orbit radius. Larger r means weaker gravity and a slower orbit (and a much longer period, since T² ∝ r³)." },
    { id: M("no-gravity-in-orbit"), skillId: S("circular-orbits"), title: "Thinks there is no gravity in orbit", description: "Explains floating astronauts or orbiting satellites by saying gravity is zero or negligible in space.", remediation: "At a few hundred kilometres up, gravity is about 90% as strong as at the surface, and it is exactly what keeps a satellite curving around Earth. Astronauts float because they and their spacecraft are in free fall together, sharing the same acceleration, so nothing presses them against the floor." },
    { id: M("altitude-for-radius"), skillId: S("circular-orbits"), title: "Uses the altitude as the orbit radius", description: "Substitutes the height above the surface for r in v = √(GM/r), T = 2πr/v or U = −GMm/r.", remediation: "In Newton's law of gravitation, r is measured between centres. For a satellite at altitude h above a planet of radius R, the orbit radius is r = R + h. Low satellites have r only slightly larger than R." },
    { id: M("elliptical-constant-speed"), skillId: S("orbit-energy-momentum"), title: "Thinks a satellite moves at constant speed in an elliptical orbit", description: "Assumes the speed (or kinetic energy) is the same all around an elliptical orbit, or that the satellite is slower when it is closer to the central body.", remediation: "Gravity points at the central body, so it exerts no torque about it and angular momentum is conserved: at the near and far points r₁v₁ = r₂v₂, so closer means faster. Energy agrees: falling inward converts potential energy into kinetic energy. Only a circular orbit has constant speed." },
    { id: M("orbital-energy-sign"), skillId: S("orbit-energy-momentum"), title: "Sign errors or missing pieces in orbital energy", description: "Gives gravitational potential energy or the total energy of a bound orbit a positive sign, or reports the potential energy alone (or its change alone) as the total.", remediation: "With U = 0 at infinite separation, U = −GMm/r is always negative. In a circular orbit K = GMm/2r, so E = K + U = −GMm/2r: negative, and half the size of U. Moving to a higher orbit makes E less negative (energy must be added), even though K decreases." },
  ],

  units: [
    {
      id: U,
      number: 6,
      title: "Energy and Momentum of Rotating Systems",
      description: "Energy and momentum ideas for things that spin: rotational kinetic energy, work and power from torques, angular momentum and angular impulse, conservation of angular momentum in spins and collisions, rolling without slipping, and the motion of orbiting satellites.",
      topics: [
        // ───────────────────────── Topic 1 ─────────────────────────
        {
          id: T("rotational-ke"),
          title: "Rotational kinetic energy",
          description: "The kinetic energy stored in spinning objects, and how to account for it when objects move and spin at the same time.",
          objectives: [
            { id: "physics-1.o.u6.a", code: "PHYS-6.A", description: "Calculate and compare the rotational kinetic energy of rigid objects from their rotational inertia and angular speed.", skillIds: [S("rotational-ke")] },
            { id: "physics-1.o.u6.b", code: "PHYS-6.B", description: "Find the total kinetic energy of objects and systems that both translate and rotate, and apply energy conservation to systems with spinning parts.", skillIds: [S("total-ke")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u6.rotational-ke",
              title: "Kinetic energy of a spinning object",
              summary: "Why a wheel spinning in place has kinetic energy, where ½Iω² comes from, and why both the angular speed and the shape matter.",
              estMinutes: 14,
              skillIds: [S("rotational-ke")],
              blocks: [
                { type: "text", md: r`A flywheel spinning on its axle is not going anywhere: its centre stays put. Yet it clearly has energy. Grab its rim and it will drag your hand along; let a brake slow it and the brake gets hot. That energy is **kinetic energy**, stored in the motion of every bit of the wheel as it goes round.

In Unit 5 you met rotational inertia, $I$, which measures how hard an object is to spin up. Here it reappears as the "mass" in the energy of rotation.` },
                { type: "callout", tone: "info", title: "Where the formula comes from", md: r`Split the spinning object into many small pieces. A piece of mass $m$ at distance $r$ from the axis moves in a circle at speed $v = r\omega$, so its kinetic energy is $\tfrac12 m(r\omega)^2 = \tfrac12 (mr^2)\omega^2$. Every piece shares the same $\omega$, so adding them all up gives

$$K = \tfrac12\left(\sum mr^2\right)\omega^2 = \tfrac12 I\omega^2.$$

The sum $\sum mr^2$ is exactly the rotational inertia.` },
                { type: "definition", term: "Rotational kinetic energy", md: r`The kinetic energy an object has because it spins: $K_{\text{rot}} = \tfrac12 I\omega^2$, where $I$ is the rotational inertia about the spin axis and $\omega$ is the angular speed **in radians per second**. Like all energy it is a scalar, measured in joules.` },
                { type: "formula", latex: r`K_{\text{rot}} = \tfrac12 I\omega^2`, caption: "Compare with ½mv²: I plays the role of mass and ω the role of speed." },
                { type: "text", md: r`## Rotational inertias you will use

| Object (axis through the centre unless stated) | $I$ |
|---|---|
| Point mass at distance $r$ | $mr^2$ |
| Thin hoop or ring | $MR^2$ |
| Solid disk or cylinder | $\tfrac12 MR^2$ |
| Solid sphere | $\tfrac25 MR^2$ |
| Thin spherical shell (hollow ball) | $\tfrac23 MR^2$ |
| Thin rod, axis through its centre | $\tfrac1{12} ML^2$ |
| Thin rod, axis through one end | $\tfrac13 ML^2$ |

Problems will give you the formula you need; what matters is understanding why the numbers differ. The more of the mass that sits far from the axis, the bigger the number in front.` },
                { type: "callout", tone: "key", title: "Angular speed must be in rad/s", md: r`$K = \tfrac12 I\omega^2$ was built from $v = r\omega$, which only works with $\omega$ in radians per second. Speeds are often quoted in revolutions per minute (rpm), so convert first:

$$\omega\ (\text{rad/s}) = \text{rpm} \times \frac{2\pi}{60}.$$

For example, $300\,\text{rpm} = 300 \times 2\pi/60 = 10\pi \approx 31.4${RAD}$.` },
                {
                  type: "worked_example",
                  title: "A spinning bicycle wheel",
                  problem: r`A bicycle wheel on a repair stand is close to a thin hoop of mass $1.2\,\text{kg}$ and radius $0.34\,\text{m}$. It spins at $180\,\text{rpm}$. How much kinetic energy does it have?`,
                  steps: [
                    { title: "Rotational inertia", md: r`Treat it as a hoop: $I = MR^2 = (1.2)(0.34)^2 \approx 0.139${KGM2}$.` },
                    { title: "Convert the angular speed", md: r`$\omega = 180 \times \dfrac{2\pi}{60} = 6\pi \approx 18.8${RAD}$.` },
                    { title: "Kinetic energy", md: r`$K = \tfrac12 I\omega^2 = \tfrac12(0.139)(18.8)^2 \approx 24.6\,\text{J}$.` },
                    { title: "Sanity check", md: r`The rim moves at $v = \omega R \approx 6.4\,\text{m/s}$. If all $1.2\,\text{kg}$ moved at that speed in a straight line, it would have $\tfrac12(1.2)(6.4)^2 \approx 24.6\,\text{J}$, the same, because a hoop really does have all its mass at the rim.` },
                  ],
                  answer: r`About $25\,\text{J}$`,
                },
                { type: "check", questionId: Q("rke-1"), lead: "Try one: square the angular speed." },
                { type: "callout", tone: "warning", title: "ω is squared", md: r`Because $K \propto \omega^2$, doubling the spin rate **quadruples** the energy, and halving it leaves only a quarter. This is why flywheels used for energy storage spin as fast as their materials allow, and why a brake has to remove most of a wheel's energy in the first part of slowing down.` },
                { type: "check", questionId: Q("rke-2") },
                {
                  type: "worked_example",
                  title: "Same mass, same size, different energy",
                  problem: r`A solid disk and a thin hoop each have mass $3.0\,\text{kg}$ and radius $0.20\,\text{m}$, and each spins at $10${RAD}$. Compare their kinetic energies.`,
                  steps: [
                    { title: "Disk", md: r`$I = \tfrac12(3.0)(0.20)^2 = 0.060${KGM2}$, so $K = \tfrac12(0.060)(10)^2 = 3.0\,\text{J}$.` },
                    { title: "Hoop", md: r`$I = (3.0)(0.20)^2 = 0.12${KGM2}$, so $K = \tfrac12(0.12)(10)^2 = 6.0\,\text{J}$.` },
                    { title: "Why", md: r`Every part of the hoop moves at the rim speed $\omega R$. Much of the disk is near the axle, where it moves slowly and carries little energy.` },
                  ],
                  answer: r`The hoop has twice the kinetic energy of the disk.`,
                },
                { type: "callout", tone: "warning", title: "Where the mass is matters, not just how much", md: r`Two objects with the same mass, radius and spin can store different amounts of energy. Never assume $I = MR^2$ for everything: that is only true when all the mass is at the rim. Use the formula for the actual shape and the actual axis.` },
                { type: "tutor_prompt", prompts: ["Why does a hoop store more energy than a disk spinning at the same rate?", "How do I convert revolutions per minute to radians per second?", "Why is the angular speed squared in rotational kinetic energy?"] },
                { type: "summary", points: [r`A spinning object has kinetic energy $K_{\text{rot}} = \tfrac12 I\omega^2$, even if its centre is not moving.`, r`$\omega$ must be in rad/s: multiply rpm by $2\pi/60$.`, r`$K$ grows as $\omega^2$: double the spin, four times the energy.`, "At the same angular speed, the object with more mass far from the axis (larger I) stores more energy."] },
              ],
            },
            {
              id: "physics-1.l.u6.total-ke",
              title: "Spinning and moving: total kinetic energy",
              summary: "Objects that travel while they spin carry two kinds of kinetic energy, and energy conservation must count both, including the energy that goes into massive pulleys.",
              estMinutes: 15,
              skillIds: [S("total-ke")],
              blocks: [
                { type: "text", md: r`A thrown football spirals, a bowling ball skids and spins down the lane, a bicycle wheel both turns and travels. Each of these has two kinds of kinetic energy at once:

- **translational** kinetic energy, from its centre of mass moving: $\tfrac12 Mv^2$;
- **rotational** kinetic energy, from spinning about its centre of mass: $\tfrac12 I\omega^2$.

The total is simply the sum.` },
                { type: "formula", latex: r`K_{\text{total}} = \tfrac12 Mv_{\text{cm}}^2 + \tfrac12 I_{\text{cm}}\omega^2`, caption: "v_cm is the speed of the centre of mass; I_cm is the rotational inertia about an axis through the centre of mass." },
                {
                  type: "worked_example",
                  title: "A skidding bowling ball",
                  problem: r`A $6.0\,\text{kg}$ bowling ball of radius $0.11\,\text{m}$ ($I = \tfrac25 MR^2$) slides down the lane at $7.0\,\text{m/s}$ while spinning at $20${RAD}$. Find its total kinetic energy.`,
                  steps: [
                    { title: "Translational part", md: r`$\tfrac12 Mv^2 = \tfrac12(6.0)(7.0)^2 = 147\,\text{J}$.` },
                    { title: "Rotational part", md: r`$I = \tfrac25(6.0)(0.11)^2 \approx 0.0290${KGM2}$, so $\tfrac12 I\omega^2 = \tfrac12(0.0290)(20)^2 \approx 5.8\,\text{J}$.` },
                    { title: "Total", md: r`$K \approx 147 + 5.8 \approx 153\,\text{J}$. Here the spin carries only a few percent of the energy; for a rolling ball, as you will see later in the unit, it is a much bigger share.` },
                  ],
                  answer: r`About $153\,\text{J}$`,
                },
                { type: "check", questionId: Q("tke-1") },
                { type: "text", md: r`## Energy conservation with spinning parts

When a block hangs from a string wrapped around a pulley, the block speeds up as it falls, but so does the pulley. If the pulley has mass, it ends up with rotational kinetic energy, and that energy has to come from somewhere: from the block's lost gravitational potential energy.

Because the string does not slip, the rim of the pulley moves at the same speed as the string, which links the two motions:

$$v_{\text{block}} = \omega R.$$` },
                { type: "callout", tone: "key", title: "Count every moving part", md: r`Write energy conservation for the whole system:

$$\text{lost } U_g = \tfrac12 mv^2_{\text{block}} + \tfrac12 I_{\text{pulley}}\omega^2 + \dots$$

then use $\omega = v/R$ to put everything in terms of one speed. For a solid-disk pulley, $\tfrac12\left(\tfrac12 MR^2\right)(v/R)^2 = \tfrac14 Mv^2$: the radius cancels.` },
                {
                  type: "worked_example",
                  title: "A block and a heavy pulley",
                  problem: r`A $1.5\,\text{kg}$ block hangs from a string wrapped around a solid-disk pulley ($I = \tfrac12 MR^2$) of mass $3.0\,\text{kg}$, on a frictionless axle. It is released from rest. How fast is it moving after falling $1.2\,\text{m}$?`,
                  steps: [
                    { title: "Energy conservation", md: r`$mgh = \tfrac12 mv^2 + \tfrac12 I\omega^2$.` },
                    { title: "Write the pulley's term with v", md: r`$\tfrac12 I\omega^2 = \tfrac12\left(\tfrac12 MR^2\right)\left(\tfrac{v}{R}\right)^2 = \tfrac14 Mv^2$.` },
                    { title: "Solve", md: r`$(1.5)(9.8)(1.2) = \left(\tfrac12(1.5) + \tfrac14(3.0)\right)v^2$, so $17.6 = 1.5v^2$ and $v \approx 3.43\,\text{m/s}$.` },
                    { title: "Compare with free fall", md: r`Dropped freely, the block would reach $\sqrt{2gh} \approx 4.85\,\text{m/s}$. Here the pulley takes half the energy ($\tfrac14 M = \tfrac12 m$), so the block is noticeably slower.` },
                  ],
                  answer: r`About $3.4\,\text{m/s}$`,
                },
                { type: "callout", tone: "warning", title: "Don't forget the spin", md: r`The most common slip in this topic is to write $mgh = \tfrac12 mv^2$ and get $v = \sqrt{2gh}$ for a block on a massive pulley, a yo-yo or a rolling ball. That answer is only right if nothing else shares the energy. Ask: *what else is moving, and is it spinning?*` },
                { type: "check", questionId: Q("tke-2"), lead: "Where does the energy go?" },
                { type: "callout", tone: "info", title: "A spinning ball in flight", md: r`Gravity acts at a ball's centre of mass, so it exerts no torque about that point. Ignoring air, a ball's spin (and its rotational kinetic energy) stays exactly the same throughout its flight. Only the translational part trades with gravitational potential energy.` },
                { type: "summary", points: [r`Objects that move and spin have $K = \tfrac12 Mv_{\text{cm}}^2 + \tfrac12 I_{\text{cm}}\omega^2$.`, r`A string that does not slip links a pulley's spin to the string's speed: $v = \omega R$.`, "In energy conservation, the potential energy lost is shared among all moving parts, including massive pulleys.", r`A massive pulley always makes the block slower than $\sqrt{2gh}$; the bigger the pulley's rotational inertia, the bigger its share.`] },
              ],
            },
          ],
        },

        // ───────────────────────── Topic 2 ─────────────────────────
        {
          id: T("work-power"),
          title: "Work and power in rotation",
          description: "How torques transfer energy to and from rotating objects, and how fast they do it.",
          objectives: [
            { id: "physics-1.o.u6.c", code: "PHYS-6.C", description: "Calculate the work done by a constant torque and use the rotational work–energy theorem.", skillIds: [S("torque-work")] },
            { id: "physics-1.o.u6.d", code: "PHYS-6.D", description: "Calculate the power delivered by a torque and reason about the trade-off between torque and angular speed.", skillIds: [S("rotational-power")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u6.work-power",
              title: "Work and power from torques",
              summary: "A torque that turns an object through an angle does work, W = τΔθ, and delivers power P = τω. Both connect directly to rotational kinetic energy.",
              estMinutes: 18,
              skillIds: [S("torque-work"), S("rotational-power")],
              blocks: [
                { type: "text", md: r`In linear motion, a force does work when it acts through a distance: $W = Fd$. The rotational version replaces force with **torque** and distance with **angle**.

Picture a rope pulling tangentially on the rim of a winch drum of radius $r$ with force $F$. As the drum turns through an angle $\Delta\theta$, the rim (and the rope) move along an arc of length $s = r\Delta\theta$. The work done is

$$W = Fs = F(r\Delta\theta) = (rF)\Delta\theta = \tau\,\Delta\theta.$$` },
                { type: "formula", latex: r`W = \tau\,\Delta\theta`, caption: "Work done by a constant torque, with Δθ in radians. Units: N·m × rad = J." },
                { type: "callout", tone: "key", title: "Three things to check", md: r`1. **Radians.** The derivation used $s = r\Delta\theta$, which needs radians. One revolution is $2\pi\,\text{rad}$.
2. **Sign.** A torque in the same direction as the rotation does positive work (adds energy); a torque against the rotation, such as friction, does negative work.
3. **No turning, no work.** However hard you push on a stuck bolt, if it does not turn, $\Delta\theta = 0$ and no work is done on it.` },
                {
                  type: "worked_example",
                  title: "Turning a crank",
                  problem: r`A constant torque of $12${NM}$ turns a crank through $2.5$ revolutions. How much work is done?`,
                  steps: [
                    { title: "Convert the angle", md: r`$\Delta\theta = 2.5 \times 2\pi = 5\pi \approx 15.7\,\text{rad}$.` },
                    { title: "Multiply", md: r`$W = \tau\,\Delta\theta = (12)(15.7) \approx 188\,\text{J}$.` },
                  ],
                  answer: r`About $190\,\text{J}$`,
                },
                { type: "check", questionId: Q("tw-1") },
                { type: "text", md: r`## The work–energy theorem for rotation

Just as the net work on an object equals its change in translational kinetic energy, the net work done by torques on a rigid object spinning about a fixed axis equals its change in rotational kinetic energy:

$$W_{\text{net}} = \tau_{\text{net}}\,\Delta\theta = \Delta K_{\text{rot}} = \tfrac12 I\omega_f^2 - \tfrac12 I\omega_i^2.$$

This is often the fastest way to connect a torque to a speed, without finding the angular acceleration.` },
                {
                  type: "worked_example",
                  title: "How far does it coast?",
                  problem: r`A flywheel ($I = 0.80${KGM2}$) spins at $25${RAD}$. A constant friction torque of $2.0${NM}$ acts on it. Through what angle does it turn before stopping?`,
                  steps: [
                    { title: "Initial energy", md: r`$K_i = \tfrac12(0.80)(25)^2 = 250\,\text{J}$; $K_f = 0$.` },
                    { title: "Work done by friction", md: r`Friction opposes the rotation, so its work is $-\tau\,\Delta\theta$. Setting $-\tau\Delta\theta = 0 - 250\,\text{J}$ gives $\Delta\theta = 250/2.0 = 125\,\text{rad}$.` },
                    { title: "In revolutions", md: r`$125/(2\pi) \approx 20$ revolutions.` },
                  ],
                  answer: r`$125\,\text{rad}$, about $20$ turns`,
                },
                { type: "check", questionId: Q("tw-2"), lead: "Watch the units of the angle." },
                { type: "callout", tone: "warning", title: "Torque, not force; radians, not revolutions", md: r`Two slips account for most wrong answers here. Multiplying the **force** by the angle leaves out the lever arm: use $\tau = rF$ first. And putting **revolutions** or **degrees** into $W = \tau\Delta\theta$ gives an answer that is too small by a factor of $2\pi$ (or $57$). Convert first, every time.` },
                { type: "text", md: r`## Rotational power

Power is the rate of doing work. For a constant torque, in a short time $\Delta t$ the object turns through $\Delta\theta = \omega\Delta t$, so

$$P = \frac{W}{\Delta t} = \frac{\tau\,\Delta\theta}{\Delta t} = \tau\omega.$$

This is the rotational partner of $P = Fv$. It is why engine data sheets quote torque together with rpm.` },
                { type: "formula", latex: r`P = \tau\omega`, caption: "Power delivered by a torque, with ω in rad/s. Units: N·m × rad/s = W." },
                {
                  type: "worked_example",
                  title: "An electric motor",
                  problem: r`A motor exerts $0.80${NM}$ of torque while running at $1800\,\text{rpm}$. What power does it deliver?`,
                  steps: [
                    { title: "Convert", md: r`$\omega = 1800 \times 2\pi/60 = 60\pi \approx 188${RAD}$.` },
                    { title: "Multiply", md: r`$P = \tau\omega = (0.80)(188) \approx 151\,\text{W}$.` },
                  ],
                  answer: r`About $150\,\text{W}$`,
                },
                { type: "check", questionId: Q("pw-1") },
                { type: "callout", tone: "key", title: "The torque–speed trade-off", md: r`For a fixed power, torque and angular speed trade off: $\tau = P/\omega$. A bicycle in a low gear lets your legs turn the pedals quickly with modest torque while the wheel turns slowly with large torque, perfect for hills. A wind turbine's slow rotor carries an enormous torque; a dentist's drill spins very fast with a tiny one. So a bigger torque does **not** by itself mean more power.` },
                { type: "check", questionId: Q("pw-2") },
                { type: "summary", points: [r`Work by a constant torque: $W = \tau\,\Delta\theta$, with $\Delta\theta$ in radians.`, "Torque with the rotation does positive work; against it, negative work; no rotation, no work.", r`Rotational work–energy theorem: $\tau_{\text{net}}\Delta\theta = \Delta(\tfrac12 I\omega^2)$.`, r`Power: $P = \tau\omega$ (or energy transferred ÷ time), with $\omega$ in rad/s.`, "At fixed power, a slower shaft needs a larger torque."] },
              ],
            },
          ],
        },

        // ───────────────────────── Topic 3 ─────────────────────────
        {
          id: T("angular-momentum"),
          title: "Angular momentum and angular impulse",
          description: "The rotational counterpart of momentum, for spinning objects and for point masses, and how torques acting over time change it.",
          objectives: [
            { id: "physics-1.o.u6.e", code: "PHYS-6.E", description: "Calculate the angular momentum of rigid objects and point masses about a chosen axis or point.", skillIds: [S("angular-momentum")] },
            { id: "physics-1.o.u6.f", code: "PHYS-6.F", description: "Relate angular impulse to the change in angular momentum, including from torque–time graphs.", skillIds: [S("angular-impulse")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u6.angular-momentum",
              title: "Angular momentum",
              summary: "Angular momentum for spinning objects (L = Iω) and for moving point masses (L = mvr⊥), and why a point mass moving in a straight line can have it.",
              estMinutes: 15,
              skillIds: [S("angular-momentum")],
              blocks: [
                { type: "text", md: r`Linear momentum, $p = mv$, measures how much "motion" an object carries in a straight line, and how hard it is to stop. Spinning objects carry a rotational version: **angular momentum**. A heavy spinning flywheel is hard to stop and hard to tilt; a spinning top stays upright. Both are angular momentum at work.` },
                { type: "definition", term: "Angular momentum of a rigid object", md: r`For an object spinning about a fixed axis, $L = I\omega$: rotational inertia times angular velocity. Units: $\text{kg}\cdot\text{m}^2/\text{s}$. It has a direction, the sense of rotation; in this course we give it a sign, with counterclockwise positive.` },
                { type: "formula", latex: r`L = I\omega`, caption: "The rotational partner of p = mv." },
                { type: "check", questionId: Q("am-1") },
                { type: "text", md: r`## Point masses

A small object of mass $m$ moving in a circle of radius $r$ at speed $v$ has $I = mr^2$ and $\omega = v/r$, so

$$L = I\omega = mr^2\cdot\frac{v}{r} = mvr.$$

The same idea works for **any** moving point mass, even one travelling in a straight line. About a chosen point P, its angular momentum is

$$L = mvr_\perp,$$

where $r_\perp$ is the **perpendicular distance** from P to the line along which the object moves.` },
                { type: "formula", latex: r`L = mvr_\perp`, caption: "Angular momentum of a point mass about a point P. r⊥ is the perpendicular distance from P to the line of motion." },
                {
                  type: "worked_example",
                  title: "A puck sliding past a post",
                  problem: r`A $0.16\,\text{kg}$ hockey puck slides at $20\,\text{m/s}$ in a straight line that passes $1.5\,\text{m}$ from a goalpost (measured perpendicular to its path). At one moment it is $2.5\,\text{m}$ from the post. Find its angular momentum about the post.`,
                  steps: [
                    { title: "Pick the right distance", md: r`Draw the puck's line of motion and drop a perpendicular from the post: $r_\perp = 1.5\,\text{m}$. The $2.5\,\text{m}$ distance is not perpendicular to the velocity.` },
                    { title: "Calculate", md: r`$L = mvr_\perp = (0.16)(20)(1.5) = 4.8${LU}$.` },
                    { title: "Notice", md: r`$m$, $v$ and $r_\perp$ do not change as the puck slides, so $L$ about the post is the same at every point of its path, as it must be, since no torque acts.` },
                  ],
                  answer: r`$4.8${LU}$`,
                },
                { type: "callout", tone: "warning", title: "Rotation is not required", md: r`An object does not need to spin, or move in a circle, to have angular momentum about a point. It only needs to move along a line that misses the point. That is how a child running past a merry-go-round can set it turning by jumping on. The angular momentum is zero only when the line of motion passes **through** the point ($r_\perp = 0$).` },
                { type: "check", questionId: Q("am-2") },
                { type: "callout", tone: "key", title: "Signs matter", md: r`Angular momenta in opposite senses cancel. Two disks on one axle, one with $L = +6.0${LU}$ (counterclockwise) and one with $L = -4.0${LU}$ (clockwise), have a total of $+2.0${LU}$, not $10$. Give every angular momentum a sign before you add.` },
                { type: "tutor_prompt", prompts: ["How can something moving in a straight line have angular momentum?", "Why do I use the perpendicular distance in L = mvr?", "What's the difference between angular momentum and rotational kinetic energy?"] },
                { type: "summary", points: [r`Rigid object about a fixed axis: $L = I\omega$, in $\text{kg}\cdot\text{m}^2/\text{s}$.`, r`Point mass about a point: $L = mvr_\perp$, using the perpendicular distance to the line of motion.`, "A point mass moving in a straight line has constant, non-zero angular momentum about any point off its line.", "Angular momentum has a sense of rotation: give it a sign (counterclockwise positive) and add with signs."] },
              ],
            },
            {
              id: "physics-1.l.u6.angular-impulse",
              title: "Angular impulse: changing angular momentum",
              summary: "A net torque acting for a time changes angular momentum: τΔt = ΔL. Reading torque–time graphs, and why no torque is needed to keep something spinning.",
              estMinutes: 14,
              skillIds: [S("angular-impulse")],
              blocks: [
                { type: "text", md: r`In Unit 4 you saw that a net force acting for a time changes linear momentum: $F\Delta t = \Delta p$. The rotational version says that a net **torque** acting for a time changes **angular** momentum.` },
                { type: "definition", term: "Angular impulse", md: r`The product of a net torque and the time it acts, $\tau\Delta t$ (for a constant torque). It equals the change in angular momentum it produces. Units: $\text{N}\cdot\text{m}\cdot\text{s}$, which is the same as $\text{kg}\cdot\text{m}^2/\text{s}$.` },
                { type: "formula", latex: r`\tau_{\text{net}}\,\Delta t = \Delta L`, caption: "Angular impulse–momentum theorem. Equivalently, τ_net = ΔL/Δt: net torque is the rate of change of angular momentum." },
                {
                  type: "worked_example",
                  title: "Spinning up a wheel",
                  problem: r`A wheel ($I = 0.40${KGM2}$) starts at rest. A net torque of $3.0${NM}$ acts on it for $2.0\,\text{s}$. Find its final angular momentum and angular speed.`,
                  steps: [
                    { title: "Angular impulse", md: r`$\tau\Delta t = (3.0)(2.0) = 6.0${LU}$.` },
                    { title: "Final angular momentum", md: r`$L_f = L_i + \Delta L = 0 + 6.0 = 6.0${LU}$.` },
                    { title: "Angular speed", md: r`$\omega = L/I = 6.0/0.40 = 15${RAD}$.` },
                  ],
                  answer: r`$L = 6.0${LU}$, $\omega = 15${RAD}$`,
                },
                { type: "check", questionId: Q("ai-1") },
                { type: "text", md: r`## Torque–time graphs

When the torque changes with time, the angular impulse is the **area under the torque–time graph**, just as linear impulse is the area under a force–time graph. Split the area into rectangles and triangles.

For example, if the torque rises steadily from $0$ to $8.0${NM}$ in the first $1.0\,\text{s}$ and then stays at $8.0${NM}$ for $2.0\,\text{s}$, the area is $\tfrac12(1.0)(8.0) + (2.0)(8.0) = 4.0 + 16 = 20${LU}$. Area below the time axis (a torque in the negative sense) counts as negative.` },
                { type: "callout", tone: "warning", title: "Bigger torque is not the whole story", md: r`The change in angular momentum depends on torque **and** time. A $4${NM}$ torque for $5\,\text{s}$ gives exactly the same angular impulse as a $10${NM}$ torque for $2\,\text{s}$. Compare the products, not just the torques.` },
                { type: "check", questionId: Q("ai-2") },
                { type: "callout", tone: "key", title: "No torque needed to keep spinning", md: r`If the net torque is zero, $\Delta L = 0$: a spinning object keeps spinning at the same rate forever. Real wheels slow down because friction supplies a torque. A motor running a fan at constant speed is not "keeping it going"; it is cancelling the friction and air-drag torques so the **net** torque is zero.` },
                { type: "callout", tone: "tip", title: "Opposing torques can reverse a spin", md: r`Use signs. A turntable with $L = +20${LU}$ hit by an angular impulse of $-30${LU}$ ends with $L = -10${LU}$: the torque first stopped it and then spun it the other way.` },
                { type: "summary", points: [r`Angular impulse $\tau\Delta t$ equals the change in angular momentum $\Delta L$.`, "For a varying torque, the angular impulse is the area under the torque–time graph.", "The effect depends on both torque and time; a small torque for a long time can match a big torque for a short time.", "Zero net torque means constant angular momentum: no torque is needed to keep something spinning."] },
              ],
            },
          ],
        },

        // ───────────────────────── Topic 4 ─────────────────────────
        {
          id: T("conservation"),
          title: "Conservation of angular momentum",
          description: "When no external torque acts, angular momentum stays constant: spinning skaters, divers and stools, and collisions with rotating objects.",
          objectives: [
            { id: "physics-1.o.u6.g", code: "PHYS-6.G", description: "Apply conservation of angular momentum to systems that change their rotational inertia, and analyse the accompanying energy changes.", skillIds: [S("angular-momentum-conservation")] },
            { id: "physics-1.o.u6.h", code: "PHYS-6.H", description: "Apply conservation of angular momentum to collisions involving rotating objects, and identify which quantities are conserved.", skillIds: [S("rotational-collisions")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u6.conservation",
              title: "Conservation of angular momentum",
              summary: "With no external torque, Iω stays constant. Why a skater spins faster when she pulls in her arms, and where the extra kinetic energy comes from.",
              estMinutes: 15,
              skillIds: [S("angular-momentum-conservation")],
              blocks: [
                { type: "text", md: r`From the last lesson: $\Delta L = \tau_{\text{net}}\Delta t$. So if no net **external** torque acts on a system, its angular momentum cannot change. Forces between parts of the system (a skater's muscles pulling her arms in, a diver grabbing her knees) are internal, and they cannot change the total.` },
                { type: "callout", tone: "key", title: "Conservation of angular momentum", md: r`If the net external torque on a system about an axis is zero, the system's angular momentum about that axis stays constant:

$$I_i\omega_i = I_f\omega_f.$$

If the system rearranges itself so that $I$ decreases, $\omega$ must increase by the same factor, and vice versa.` },
                {
                  type: "worked_example",
                  title: "A skater pulls in her arms",
                  problem: r`A skater spins at $1.2\,\text{rev/s}$ with her arms outstretched, where her rotational inertia is $4.5${KGM2}$. She pulls her arms in, reducing her rotational inertia to $1.5${KGM2}$. How fast does she spin now?`,
                  steps: [
                    { title: "Is L conserved?", md: r`Smooth ice and air exert almost no torque about her vertical axis, so yes.` },
                    { title: "Apply it", md: r`$I_i\omega_i = I_f\omega_f \Rightarrow \omega_f = \omega_i\dfrac{I_i}{I_f} = 1.2 \times \dfrac{4.5}{1.5} = 3.6\,\text{rev/s}$.` },
                    { title: "A note on units", md: r`Because this is a ratio, the unit of $\omega$ cancels, so rev/s is fine here. (Energy calculations still need rad/s.)` },
                  ],
                  answer: r`$3.6\,\text{rev/s}$, three times faster`,
                },
                { type: "check", questionId: Q("cam-1") },
                { type: "text", md: r`## The same idea, everywhere

- A **diver** tucks to rotate quickly, then straightens out before entering the water to slow her rotation.
- A student on a **spinning stool** holding dumbbells speeds up dramatically when she pulls them in.
- A collapsing **star** shrinks enormously, so its rotation speeds up until it may spin many times per second.
- A **cat** dropped upside down twists its body in a way that changes the rotational inertia of its front and back halves, landing on its feet without any external torque.` },
                { type: "callout", tone: "warning", title: "Angular momentum is conserved, not angular velocity", md: r`It is tempting to keep $\omega$ the same when someone changes shape. But it is the **product** $I\omega$ that is fixed. Arms in (smaller $I$) means faster; arms out (larger $I$) means slower.` },
                { type: "text", md: r`## What happens to the energy?

Rewrite rotational kinetic energy using $L = I\omega$:

$$K = \tfrac12 I\omega^2 = \frac{(I\omega)^2}{2I} = \frac{L^2}{2I}.$$

With $L$ fixed, a **smaller** $I$ means a **larger** $K$. In the skater example, $I$ drops by a factor of $3$, so her kinetic energy triples. Where does the extra energy come from? From her muscles: pulling her arms inward against their tendency to fly outward takes work.` },
                { type: "callout", tone: "warning", title: "Kinetic energy is not conserved here", md: r`Angular momentum is conserved because there is no external torque. Kinetic energy is a different quantity with different rules: it rises when the skater pulls in (she does positive work) and falls when she spreads out. Never assume that one being conserved means the other is.` },
                { type: "check", questionId: Q("cam-2") },
                { type: "summary", points: [r`With no net external torque, $L = I\omega$ is constant: $I_i\omega_i = I_f\omega_f$.`, "Internal forces cannot change a system's total angular momentum.", "Decreasing I increases ω by the same factor (and vice versa).", r`$K = L^2/2I$: pulling in raises the rotational kinetic energy, and the extra comes from work done by internal forces.`] },
              ],
            },
            {
              id: "physics-1.l.u6.rotational-collisions",
              title: "Collisions with rotating objects",
              summary: "Objects that land on, hit or stick to a rotating object: conserve angular momentum about the axle or pivot, add the new rotational inertia, and expect kinetic energy to be lost.",
              estMinutes: 16,
              skillIds: [S("rotational-collisions")],
              blocks: [
                { type: "text", md: r`A child jumps onto a merry-go-round. A lump of clay hits a hanging rod. A second record is dropped onto a spinning turntable. These are **rotational collisions**. As with ordinary collisions, the forces between the objects are huge but brief, and they are internal to the system. The question is which quantity survives the collision.` },
                { type: "callout", tone: "key", title: "Conserve angular momentum about the pivot", md: r`If the rotating object turns on a fixed axle or pivot, the axle can push on it during the collision, so **linear momentum is not conserved**. But the axle's force acts at the axle, so it has **zero torque** about the axle. With a frictionless axle, the system's angular momentum about the axle is conserved:

$$L_{\text{before}} = L_{\text{after}},\qquad I_{\text{after}} = I_{\text{object}} + mr^2 \text{ for anything that sticks at distance } r.$$` },
                {
                  type: "worked_example",
                  title: "Dropping a ring onto a turntable",
                  problem: r`A turntable ($I = 0.050${KGM2}$) spins freely at $3.0${RAD}$. A ring ($I = 0.025${KGM2}$ about the same axis), not spinning, is dropped onto it and quickly turns with it. Find the final angular speed and the fraction of kinetic energy lost.`,
                  steps: [
                    { title: "Conserve angular momentum", md: r`$(0.050)(3.0) = (0.050 + 0.025)\omega_f \Rightarrow \omega_f = 0.15/0.075 = 2.0${RAD}$.` },
                    { title: "Energy before and after", md: r`$K_i = \tfrac12(0.050)(3.0)^2 = 0.225\,\text{J}$; $K_f = \tfrac12(0.075)(2.0)^2 = 0.15\,\text{J}$.` },
                    { title: "Loss", md: r`$0.075\,\text{J}$ lost, one third of the original. While the ring slipped on the turntable, kinetic friction turned that energy into thermal energy.` },
                  ],
                  answer: r`$\omega_f = 2.0${RAD}$; one third of the kinetic energy is lost.`,
                },
                { type: "check", questionId: Q("rc-1") },
                {
                  type: "worked_example",
                  title: "Jumping onto a merry-go-round",
                  problem: r`A $30\,\text{kg}$ child runs at $3.0\,\text{m/s}$ along a line tangent to the rim of a stationary merry-go-round ($I = 270${KGM2}$, radius $1.5\,\text{m}$) and jumps on at the rim. Find the angular speed afterwards.`,
                  steps: [
                    { title: "Child's angular momentum about the axle", md: r`Her line of motion is tangent to the rim, so $r_\perp = 1.5\,\text{m}$: $L = mvr_\perp = (30)(3.0)(1.5) = 135${LU}$.` },
                    { title: "Rotational inertia afterwards", md: r`$I_f = 270 + (30)(1.5)^2 = 270 + 67.5 = 337.5${KGM2}$.` },
                    { title: "Angular speed", md: r`$\omega = L/I_f = 135/337.5 = 0.40${RAD}$.` },
                  ],
                  answer: r`$0.40${RAD}$`,
                },
                { type: "callout", tone: "warning", title: "Remember the added rotational inertia", md: r`After the collision everything turns together, so divide by the **total** rotational inertia, including $mr^2$ for the object that stuck. Even something that brings no angular momentum (a lump dropped straight down, a child running straight at the centre, whose $r_\perp = 0$) adds rotational inertia and slows the spin.` },
                { type: "callout", tone: "warning", title: "Which quantities are conserved?", md: r`| Situation | Linear momentum | Angular momentum | Kinetic energy |
|---|---|---|---|
| Object on a fixed pivot or axle | **not** conserved (pivot pushes) | conserved about the pivot | lost if objects stick |
| Free object (no pivot, frictionless surface) | conserved | conserved | lost if objects stick |` },
                { type: "check", questionId: Q("rc-2") },
                { type: "summary", points: ["In a collision with an object on a frictionless axle, angular momentum about the axle is conserved, but linear momentum is not.", r`Find the incoming angular momentum with $mvr_\perp$; afterwards, divide by the total rotational inertia, including $mr^2$ for anything that sticks.`, "Collisions where objects stick or slip against each other lose kinetic energy.", "An object with no angular momentum about the axle still slows the rotation when it joins it."] },
              ],
            },
          ],
        },

        // ───────────────────────── Topic 5 ─────────────────────────
        {
          id: T("rolling"),
          title: "Rolling without slipping",
          description: "Wheels and balls that roll: how speed and spin are linked, how fast different points move, and how rolling objects share their energy.",
          objectives: [
            { id: "physics-1.o.u6.i", code: "PHYS-6.I", description: "Relate the translational and rotational motion of an object rolling without slipping, including the speeds of points on the object.", skillIds: [S("rolling-motion")] },
            { id: "physics-1.o.u6.j", code: "PHYS-6.J", description: "Apply energy conservation to rolling objects and predict the outcome of races down a ramp.", skillIds: [S("rolling-energy")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u6.rolling",
              title: "Rolling without slipping",
              summary: "The rolling condition v = ωR, why the contact point is momentarily at rest while the top moves at 2v, and how to tell rolling from skidding.",
              estMinutes: 14,
              skillIds: [S("rolling-motion")],
              blocks: [
                { type: "text", md: r`A rolling wheel does two things at once: its centre moves forward, and it spins about its centre. When it rolls **without slipping**, these two motions are locked together.

Think about one full revolution. A point on the rim goes once around, and the strip of ground it touched is exactly as long as the circumference, $2\pi R$. So in the time of one revolution the centre moves forward $2\pi R$. Dividing by the time of one revolution: $v_{\text{cm}} = \omega R$.` },
                { type: "formula", latex: r`v_{\text{cm}} = \omega R`, caption: "The rolling condition: the centre's speed equals the angular speed times the radius (ω in rad/s). Also: distance rolled = R × angle turned." },
                { type: "text", md: r`## How fast does each point move?

Every point on the wheel shares the centre's forward velocity $v$, and also has a velocity $\omega R = v$ along the rim from the spin. Add them:

| Point on the rim | From the centre | From the spin | Total |
|---|---|---|---|
| Top | $v$ forward | $v$ forward | $2v$ forward |
| Front or back, level with the centre | $v$ forward | $v$ down or up | $\sqrt2\,v$ |
| Bottom (touching the ground) | $v$ forward | $v$ backward | $0$ |

So the bottom of a rolling wheel is **momentarily at rest**, while the top races along at twice the car's speed. Photographs of moving bicycles show this: the top spokes are blurred, the bottom ones sharp.` },
                {
                  type: "worked_example",
                  title: "A car tyre",
                  problem: r`A car moves at $18\,\text{m/s}$ on tyres of radius $0.30\,\text{m}$ that roll without slipping. Find (a) the tyre's angular speed in rad/s and rpm, and (b) the speed of the top of the tyre relative to the road.`,
                  steps: [
                    { title: "(a) Angular speed", md: r`$\omega = v/R = 18/0.30 = 60${RAD}$. In rpm: $60 \times \dfrac{60}{2\pi} \approx 573\,\text{rpm}$.` },
                    { title: "(b) Top of the tyre", md: r`$v_{\text{top}} = 2v = 36\,\text{m/s}$.` },
                  ],
                  answer: r`(a) $60${RAD}$ (about $570\,\text{rpm}$); (b) $36\,\text{m/s}$`,
                },
                { type: "check", questionId: Q("rk-1") },
                { type: "callout", tone: "warning", title: "Not every point moves at v", md: r`Only the centre of a rolling wheel moves at $v$. The spin adds to the forward motion at the top and cancels it at the bottom. If the contact point really moved at $v$ along the road, the tyre would be sliding: skidding, not rolling.` },
                { type: "text", md: r`## Rolling or skidding?

Compare $v$ with $\omega R$:

- $v = \omega R$: rolling without slipping. The contact point is at rest, so any friction there is **static** friction, which does no work.
- $v > \omega R$: the bottom slides **forward** (a bowling ball just after release, or a car skidding with locked brakes, where $\omega = 0$).
- $v < \omega R$: the bottom slides **backward** (wheels spinning on ice as a car tries to pull away).

Kinetic friction while skidding acts to bring $v$ and $\omega R$ together until the object rolls.` },
                { type: "check", questionId: Q("rk-2") },
                { type: "summary", points: [r`Rolling without slipping: $v_{\text{cm}} = \omega R$ and distance rolled $= R\,\Delta\theta$ (one circumference per revolution).`, "The contact point is momentarily at rest; the top moves at 2v; points level with the centre move at √2·v.", r`If $v \neq \omega R$ the object is skidding, and kinetic friction acts at the contact point.`, "Static friction on a rolling object does no work, because the contact point does not slide."] },
              ],
            },
            {
              id: "physics-1.l.u6.rolling-energy",
              title: "Energy of rolling objects and ramp races",
              summary: "How a rolling object splits its kinetic energy between moving and spinning, why shape (not mass) decides a race down a ramp, and how to find speeds and heights.",
              estMinutes: 16,
              skillIds: [S("rolling-energy")],
              blocks: [
                { type: "text", md: r`A rolling object has both kinds of kinetic energy, and the rolling condition $\omega = v/R$ ties them together. Write its rotational inertia as $I = \beta MR^2$, where $\beta$ (a pure number) depends only on the shape: $1$ for a hoop, $\tfrac12$ for a solid cylinder, $\tfrac25$ for a solid sphere, $\tfrac23$ for a hollow sphere. Then

$$K = \tfrac12 Mv^2 + \tfrac12(\beta MR^2)\left(\frac{v}{R}\right)^2 = \tfrac12 Mv^2(1 + \beta).$$` },
                { type: "formula", latex: r`K_{\text{rolling}} = \tfrac12 Mv^2\,(1 + \beta)\qquad (I = \beta MR^2)`, caption: "The fraction of the kinetic energy that is rotational is β/(1 + β)." },
                { type: "text", md: r`| Shape | $\beta$ | Total KE | Share that is rotational |
|---|---|---|---|
| Solid sphere | $\tfrac25$ | $\tfrac7{10}Mv^2$ | $\tfrac27 \approx 29\%$ |
| Solid cylinder or disk | $\tfrac12$ | $\tfrac34 Mv^2$ | $\tfrac13 \approx 33\%$ |
| Hollow sphere | $\tfrac23$ | $\tfrac56 Mv^2$ | $\tfrac25 = 40\%$ |
| Thin hoop | $1$ | $Mv^2$ | $\tfrac12 = 50\%$ |` },
                {
                  type: "worked_example",
                  title: "A ball rolls down a ramp",
                  problem: r`A solid ball starts from rest and rolls without slipping down a ramp, dropping $0.80\,\text{m}$ vertically. How fast is it moving at the bottom? Compare with a block sliding down a frictionless ramp of the same height.`,
                  steps: [
                    { title: "Energy conservation", md: r`Static friction does no work, so $Mgh = \tfrac12 Mv^2(1 + \tfrac25) = \tfrac7{10}Mv^2$.` },
                    { title: "Solve", md: r`$v = \sqrt{\tfrac{10}{7}gh} = \sqrt{\tfrac{10}{7}(9.8)(0.80)} = \sqrt{11.2} \approx 3.35\,\text{m/s}$.` },
                    { title: "Compare", md: r`The sliding block: $v = \sqrt{2gh} \approx 3.96\,\text{m/s}$. Both have the same kinetic energy at the bottom, but the ball has put $\tfrac27$ of it into spinning.` },
                  ],
                  answer: r`About $3.35\,\text{m/s}$ (the sliding block: about $3.96\,\text{m/s}$)`,
                },
                { type: "check", questionId: Q("re-1") },
                { type: "text", md: r`## Ramp races

Release several objects from rest at the same height. Energy conservation at any height $h$ below the start gives

$$v = \sqrt{\frac{2gh}{1 + \beta}}.$$

The mass $M$ and the radius $R$ have cancelled. So:

- the **smaller** $\beta$, the faster the object at every point, and the sooner it reaches the bottom;
- objects of the **same shape tie**, whatever their size or mass;
- something sliding without friction (nothing spinning, effectively $\beta = 0$) beats everything that rolls.

Order of finish: frictionless slider, solid sphere, solid cylinder, hollow sphere, hoop.` },
                { type: "callout", tone: "warning", title: "Heavier does not win", md: r`A heavier ball feels a bigger pull down the slope, but it also has proportionally more inertia, both translational and rotational. The two effects cancel exactly. A steel ball and a wooden ball of the same shape roll side by side all the way down.` },
                { type: "callout", tone: "info", title: "Why friction doesn't steal energy here", md: r`A rolling object needs friction to make it spin up. But the contact point is momentarily at rest, so the static friction force acts on a point that does not move, and it does no work. Friction only redirects energy into rotation; the total kinetic energy at the bottom is still $Mgh$.` },
                { type: "check", questionId: Q("re-2"), lead: "Predict the race." },
                {
                  type: "worked_example",
                  title: "Rolling up a slope",
                  problem: r`A solid disk rolls without slipping across the floor at $2.5\,\text{m/s}$ and then rolls up a ramp. How high does it rise?`,
                  steps: [
                    { title: "All the kinetic energy becomes height", md: r`$\tfrac34 Mv^2 = Mgh$.` },
                    { title: "Solve", md: r`$h = \dfrac{3v^2}{4g} = \dfrac{3(2.5)^2}{4(9.8)} \approx 0.48\,\text{m}$, higher than the $v^2/2g \approx 0.32\,\text{m}$ a sliding block would reach, because the disk's rotational energy also turns into height.` },
                  ],
                  answer: r`About $0.48\,\text{m}$`,
                },
                { type: "tutor_prompt", prompts: ["Why does a hoop lose a race to a solid disk?", "Why doesn't the mass of a rolling ball affect how fast it rolls down?", "If friction is needed for rolling, why doesn't it take away energy?"] },
                { type: "summary", points: [r`Rolling: $K = \tfrac12 Mv^2(1 + \beta)$ with $I = \beta MR^2$; the rotational share is $\beta/(1+\beta)$.`, "Static friction does no work on a rolling object, so its kinetic energy at the bottom of a ramp is still Mgh.", r`Speed after dropping $h$: $v = \sqrt{2gh/(1+\beta)}$, independent of mass and radius.`, "In a race, smaller β wins: frictionless slider, solid sphere, solid cylinder, hollow sphere, hoop."] },
              ],
            },
          ],
        },

        // ───────────────────────── Topic 6 ─────────────────────────
        {
          id: T("orbits"),
          title: "Motion of orbiting satellites",
          description: "Satellites and planets held in orbit by gravity: speeds and periods of circular orbits, and energy and angular momentum in circular and elliptical orbits.",
          objectives: [
            { id: "physics-1.o.u6.k", code: "PHYS-6.K", description: "Determine the speed, period and radius of circular orbits, and the mass of the central body, using gravity as the centripetal force.", skillIds: [S("circular-orbits")] },
            { id: "physics-1.o.u6.l", code: "PHYS-6.L", description: "Apply conservation of energy and angular momentum to satellites in circular and elliptical orbits, including escape.", skillIds: [S("orbit-energy-momentum")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u6.circular-orbits",
              title: "Satellites in circular orbits",
              summary: "Gravity as the centripetal force: orbital speed v = √(GM/r), period, why the satellite's mass doesn't matter, and why astronauts float.",
              estMinutes: 15,
              skillIds: [S("circular-orbits")],
              blocks: [
                { type: "text", md: r`Throw a ball horizontally and it curves down to the ground. Throw it faster and it lands farther away. Throw it fast enough, about $8\,\text{km/s}$ near Earth's surface (and above the air), and the ground curves away beneath it as fast as it falls. It never lands: it is **in orbit**. A satellite is an object in continuous free fall that keeps missing the Earth.` },
                { type: "text", md: r`## Orbital speed

In a circular orbit of radius $r$ around a body of mass $M$, the only force on the satellite is gravity, $\dfrac{GMm}{r^2}$, and it provides exactly the centripetal force $\dfrac{mv^2}{r}$:

$$\frac{GMm}{r^2} = \frac{mv^2}{r} \quad\Rightarrow\quad v = \sqrt{\frac{GM}{r}}.$$

One trip around takes $T = \dfrac{2\pi r}{v}$. Combining the two gives $T^2 = \dfrac{4\pi^2}{GM}\,r^3$: the square of the period is proportional to the cube of the radius (Kepler's third law).` },
                { type: "formula", latex: r`v = \sqrt{\frac{GM}{r}},\qquad T = \frac{2\pi r}{v} = 2\pi\sqrt{\frac{r^3}{GM}}`, caption: "Circular orbits. G = 6.67 × 10⁻¹¹ N·m²/kg²; M is the mass of the central body; r is measured from its centre." },
                { type: "callout", tone: "key", title: "r is measured from the centre", md: r`Newton's law of gravitation uses the distance between **centres**. For a satellite at altitude $h$ above a planet of radius $R$, use $r = R + h$. A satellite $400\,\text{km}$ up is only about $6\%$ farther from Earth's centre than you are.` },
                {
                  type: "worked_example",
                  title: "A satellite 1000 km up",
                  problem: r`A satellite orbits $1.00\times10^6\,\text{m}$ above Earth's surface. Find its speed and period. (Earth: $M = 5.97\times10^{24}\,\text{kg}$, $R = 6.37\times10^6\,\text{m}$; $GM \approx 3.98\times10^{14}\,\text{m}^3/\text{s}^2$.)`,
                  steps: [
                    { title: "Orbit radius", md: r`$r = 6.37\times10^6 + 1.00\times10^6 = 7.37\times10^6\,\text{m}$.` },
                    { title: "Speed", md: r`$v = \sqrt{\dfrac{3.98\times10^{14}}{7.37\times10^6}} = \sqrt{5.40\times10^7} \approx 7.35\times10^3\,\text{m/s}$.` },
                    { title: "Period", md: r`$T = \dfrac{2\pi(7.37\times10^6)}{7350} \approx 6.30\times10^3\,\text{s} \approx 105\,\text{min}$.` },
                  ],
                  answer: r`About $7.35\,\text{km/s}$; period about $105$ minutes`,
                },
                { type: "check", questionId: Q("orb-1") },
                { type: "callout", tone: "warning", title: "What does (and doesn't) set the orbital speed", md: r`The satellite's own mass $m$ cancels, so a tiny bolt and a huge space station in the same orbit move at the same speed. Only the central mass and the orbit radius matter. And **higher orbits are slower**: gravity is weaker farther out, so less speed is needed to stay on a circle. They also have farther to go, so their periods grow quickly; the Moon takes about $27$ days.` },
                { type: "check", questionId: Q("orb-2") },
                { type: "callout", tone: "warning", title: "Weightless is not gravity-free", md: r`At $400\,\text{km}$ up, gravity is still about $90\%$ as strong as on the ground. Astronauts float because they and their spacecraft are falling together, with the same acceleration, so the floor never needs to push on them. Gravity is what keeps them in orbit; without it they would fly off in a straight line.` },
                { type: "summary", points: [r`In a circular orbit, gravity is the centripetal force: $GMm/r^2 = mv^2/r$, so $v = \sqrt{GM/r}$.`, r`Period $T = 2\pi r/v$, and $T^2 \propto r^3$.`, "Orbital speed does not depend on the satellite's mass; higher orbits are slower, with longer periods.", "Measure r from the centre of the planet (R + h).", "Astronauts feel weightless because they are in free fall with their spacecraft, not because gravity is absent."] },
              ],
            },
            {
              id: "physics-1.l.u6.orbit-energy",
              title: "Energy and angular momentum in orbits",
              summary: "Negative orbital energies, escape speed, and how conservation of energy and of angular momentum explain the changing speed of a satellite in an elliptical orbit.",
              estMinutes: 17,
              skillIds: [S("orbit-energy-momentum")],
              blocks: [
                { type: "text", md: r`Far from Earth's surface, $mgh$ is no longer a good model for gravitational potential energy, because $g$ weakens with distance. The general expression, with $U = 0$ when the objects are infinitely far apart, is

$$U = -\frac{GMm}{r}.$$

It is negative because you would have to **add** energy to pull the satellite away to infinity, where $U$ reaches zero.` },
                { type: "text", md: r`## Energies of a circular orbit

From $v = \sqrt{GM/r}$, the kinetic energy is $K = \tfrac12 mv^2 = \dfrac{GMm}{2r}$. So for a circular orbit:

| Quantity | Expression | Sign |
|---|---|---|
| Kinetic energy | $K = \dfrac{GMm}{2r}$ | positive |
| Potential energy | $U = -\dfrac{GMm}{r} = -2K$ | negative |
| Total energy | $E = K + U = -\dfrac{GMm}{2r} = -K$ | negative |` },
                { type: "callout", tone: "key", title: "Negative total energy means bound", md: r`A satellite in orbit has $E < 0$: it does not have enough energy to escape. To move it to a **higher** orbit, energy must be added, making $E$ less negative, even though it ends up moving more slowly (smaller $K$). The potential energy rises by twice as much as the kinetic energy falls.` },
                { type: "text", md: r`## Escape speed

To escape completely, an object must be able to reach $r \to \infty$ with at least zero kinetic energy, so its total energy must be at least zero:

$$\tfrac12 mv_{\text{esc}}^2 - \frac{GMm}{r} = 0 \quad\Rightarrow\quad v_{\text{esc}} = \sqrt{\frac{2GM}{r}}.$$

This is $\sqrt2$ times the circular orbital speed at the same radius. From Earth's surface it is about $11.2\,\text{km/s}$.` },
                {
                  type: "worked_example",
                  title: "Energy of an orbiting satellite",
                  problem: r`A $100\,\text{kg}$ satellite is in a circular orbit of radius $7.0\times10^6\,\text{m}$ ($GM_E = 3.98\times10^{14}\,\text{m}^3/\text{s}^2$). Find its kinetic, potential and total energies.`,
                  steps: [
                    { title: "Kinetic energy", md: r`$K = \dfrac{GMm}{2r} = \dfrac{(3.98\times10^{14})(100)}{2(7.0\times10^6)} \approx 2.84\times10^9\,\text{J}$.` },
                    { title: "Potential energy", md: r`$U = -2K \approx -5.69\times10^9\,\text{J}$.` },
                    { title: "Total", md: r`$E = K + U \approx -2.84\times10^9\,\text{J}$.` },
                  ],
                  answer: r`$K \approx 2.84\times10^9\,\text{J}$, $U \approx -5.69\times10^9\,\text{J}$, $E \approx -2.84\times10^9\,\text{J}$`,
                },
                { type: "callout", tone: "warning", title: "Watch the signs", md: r`$U = -GMm/r$ is always negative, and so is the total energy of any orbit. Reporting $U$ alone as the total, or dropping the minus signs, are the classic slips. Check: in a circular orbit the total energy should be exactly $-K$.` },
                { type: "text", md: r`## Elliptical orbits

Most real orbits are ellipses, with the central body at one focus. Two conservation laws describe how a satellite moves around one:

- **Angular momentum is conserved.** Gravity always points straight at the central body, so it exerts no torque about it. At the nearest point (perigee or perihelion) and the farthest point (apogee or aphelion), the velocity is perpendicular to the radius, so $L = mvr$ there and $r_{\text{near}}v_{\text{near}} = r_{\text{far}}v_{\text{far}}$. Closer means faster. The same fact means the line to the satellite sweeps out **equal areas in equal times**.
- **Mechanical energy is conserved.** As the satellite falls inward, $U$ decreases and $K$ increases; climbing outward, the reverse. The total $E = K + U$ stays fixed.` },
                {
                  type: "worked_example",
                  title: "Speed at the far point",
                  problem: r`A satellite's elliptical orbit takes it from $6.8\times10^6\,\text{m}$ (perigee) to $2.0\times10^7\,\text{m}$ (apogee) from Earth's centre. At perigee it moves at $9.0\,\text{km/s}$. How fast does it move at apogee?`,
                  steps: [
                    { title: "Conserve angular momentum", md: r`$r_pv_p = r_av_a$, because at both points the velocity is perpendicular to the radius.` },
                    { title: "Solve", md: r`$v_a = v_p\dfrac{r_p}{r_a} = 9.0 \times \dfrac{6.8\times10^6}{2.0\times10^7} \approx 3.1\,\text{km/s}$.` },
                  ],
                  answer: r`About $3.1\,\text{km/s}$`,
                },
                { type: "check", questionId: Q("oem-1") },
                { type: "callout", tone: "warning", title: "Speed changes around an ellipse", md: r`Only a circular orbit has constant speed. In an ellipse, gravity has a component along the motion: it speeds the satellite up on the way in and slows it on the way out. Fastest at the nearest point, slowest at the farthest.` },
                { type: "check", questionId: Q("oem-2") },
                { type: "summary", points: [r`$U = -GMm/r$ (zero at infinity). Circular orbit: $K = GMm/2r$, $U = -2K$, $E = -GMm/2r$.`, "Negative total energy means the satellite is bound; raising an orbit requires adding energy.", r`Escape speed: $v_{\text{esc}} = \sqrt{2GM/r}$, $\sqrt2$ times the circular orbital speed.`, r`Gravity exerts no torque about the central body, so angular momentum is conserved: $r_1v_1 = r_2v_2$ at the near and far points, and equal areas are swept in equal times.`, "Energy is conserved too: kinetic and potential energy trade places around an elliptical orbit."] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: unit6Questions,

  assessments: [
    // ── Topic 1: Rotational kinetic energy
    {
      id: "physics-1.ex.u6.rotational-ke",
      kind: "exercise",
      title: "Calculate rotational kinetic energy",
      description: "Find ½Iω² for spinning objects: converting rev/min, working back to ω, and seeing how shape and spin rate change the energy.",
      unitId: U,
      topicId: T("rotational-ke"),
      questionIds: [Q("rke-3"), Q("rke-4"), Q("rke-5"), Q("rke-6"), Q("rke-7"), Q("rke-8"), Q("rke-9"), Q("rke-10")],
      config: exerciseConfig,
    },
    {
      id: "physics-1.ex.u6.compare-ke",
      kind: "exercise",
      title: "Compare the kinetic energy of spinning and moving objects",
      description: "Add translational and rotational kinetic energy, find the rotational share, and compare objects that spin differently.",
      unitId: U,
      topicId: T("rotational-ke"),
      questionIds: [Q("rke-11"), Q("rke-12"), Q("tke-3"), Q("tke-4"), Q("tke-5"), Q("tke-6"), Q("tke-7"), Q("tke-8")],
      config: exerciseConfig,
    },
    {
      id: "physics-1.ex.u6.pulley-energy",
      kind: "exercise",
      title: "Use energy conservation with massive pulleys",
      description: "Falling blocks and spinning pulleys: share the lost potential energy among every moving part to find speeds, heights and energy shares.",
      unitId: U,
      topicId: T("rotational-ke"),
      questionIds: [Q("tke-9"), Q("tke-10"), Q("tke-11"), Q("tke-12"), Q("tke-13"), Q("tke-14"), Q("tke-15"), Q("tke-16")],
      config: exerciseConfig,
    },
    // ── Topic 2: Work and power
    {
      id: "physics-1.ex.u6.torque-work",
      kind: "exercise",
      title: "Find the work done by a torque",
      description: "Use W = τΔθ with angles in radians, decide the sign of the work, and connect it to changes in rotational kinetic energy.",
      unitId: U,
      topicId: T("work-power"),
      questionIds: [Q("tw-3"), Q("tw-4"), Q("tw-5"), Q("tw-6"), Q("tw-7"), Q("tw-8"), Q("tw-9"), Q("tw-10")],
      config: exerciseConfig,
    },
    {
      id: "physics-1.ex.u6.rotational-power",
      kind: "exercise",
      title: "Calculate rotational power",
      description: "Engines, motors and turbines: P = τω from rev/min, torque from power, and the torque–speed trade-off.",
      unitId: U,
      topicId: T("work-power"),
      questionIds: [Q("pw-3"), Q("pw-4"), Q("pw-5"), Q("pw-6"), Q("pw-7"), Q("pw-8"), Q("pw-9"), Q("pw-10")],
      config: exerciseConfig,
    },
    // ── Topic 3: Angular momentum and angular impulse
    {
      id: "physics-1.ex.u6.angular-momentum",
      kind: "exercise",
      title: "Calculate angular momentum",
      description: "L = Iω for spinning objects and L = mvr⊥ for moving point masses, with the right distance and the right sign.",
      unitId: U,
      topicId: T("angular-momentum"),
      questionIds: [Q("am-3"), Q("am-4"), Q("am-5"), Q("am-6"), Q("am-7"), Q("am-8"), Q("am-9"), Q("am-10")],
      config: exerciseConfig,
    },
    {
      id: "physics-1.ex.u6.angular-impulse",
      kind: "exercise",
      title: "Use angular impulse to change a spin",
      description: "τΔt = ΔL: spin-up and stopping times, areas under torque–time graphs, and torques that reverse a rotation.",
      unitId: U,
      topicId: T("angular-momentum"),
      questionIds: [Q("ai-3"), Q("ai-4"), Q("ai-5"), Q("ai-6"), Q("ai-7"), Q("ai-8"), Q("ai-9"), Q("ai-10")],
      config: exerciseConfig,
    },
    // ── Topic 4: Conservation
    {
      id: "physics-1.ex.u6.changing-shape",
      kind: "exercise",
      title: "Spinning objects that change shape",
      description: "Skaters, divers, spinning stools and collapsing stars: conserve Iω and track what happens to the kinetic energy.",
      unitId: U,
      topicId: T("conservation"),
      questionIds: [Q("cam-3"), Q("cam-4"), Q("cam-5"), Q("cam-6"), Q("cam-7"), Q("cam-8"), Q("cam-9"), Q("cam-10")],
      config: exerciseConfig,
    },
    {
      id: "physics-1.ex.u6.rotational-collisions",
      kind: "exercise",
      title: "Collisions with rotating objects",
      description: "Children jumping onto merry-go-rounds, clay hitting rods and disks locking together: conserve angular momentum about the axle and find the energy lost.",
      unitId: U,
      topicId: T("conservation"),
      questionIds: [Q("rc-3"), Q("rc-4"), Q("rc-5"), Q("rc-6"), Q("rc-7"), Q("rc-8"), Q("rc-9"), Q("rc-10")],
      config: exerciseConfig,
    },
    // ── Topic 5: Rolling
    {
      id: "physics-1.ex.u6.rolling-motion",
      kind: "exercise",
      title: "Link speed and spin for rolling objects",
      description: "Use v = ωR, find the speeds of points on a rolling wheel, convert distance to revolutions, and tell rolling from skidding.",
      unitId: U,
      topicId: T("rolling"),
      questionIds: [Q("rk-3"), Q("rk-4"), Q("rk-5"), Q("rk-6"), Q("rk-7"), Q("rk-8"), Q("rk-9"), Q("rk-10")],
      config: exerciseConfig,
    },
    {
      id: "physics-1.ex.u6.rolling-energy",
      kind: "exercise",
      title: "Energy of rolling objects",
      description: "Split kinetic energy between rolling and spinning, and use energy conservation to find speeds at the bottom and heights reached.",
      unitId: U,
      topicId: T("rolling"),
      questionIds: [Q("re-3"), Q("re-4"), Q("re-5"), Q("re-6"), Q("re-7"), Q("re-8"), Q("re-9"), Q("re-10")],
      config: exerciseConfig,
    },
    {
      id: "physics-1.ex.u6.ramp-races",
      kind: "exercise",
      title: "Predict races down a ramp",
      description: "Hoops, disks, spheres and sliding blocks: rank who wins, explain why, and compare their speeds.",
      unitId: U,
      topicId: T("rolling"),
      questionIds: [Q("rk-11"), Q("rk-12"), Q("re-11"), Q("re-12"), Q("re-13"), Q("re-14"), Q("re-15"), Q("re-16")],
      config: exerciseConfig,
    },
    // ── Topic 6: Orbits
    {
      id: "physics-1.ex.u6.orbital-speed-period",
      kind: "exercise",
      title: "Find orbital speeds and periods",
      description: "Use gravity as the centripetal force to find speeds, periods and central masses, and explain weightlessness.",
      unitId: U,
      topicId: T("orbits"),
      questionIds: [Q("orb-3"), Q("orb-4"), Q("orb-5"), Q("orb-6"), Q("orb-7"), Q("orb-8"), Q("orb-9"), Q("orb-10")],
      config: exerciseConfig,
    },
    {
      id: "physics-1.ex.u6.orbit-energy-momentum",
      kind: "exercise",
      title: "Track energy and angular momentum in orbits",
      description: "Speeds around elliptical orbits, signs of orbital energies, energy to change orbit, and escape speed.",
      unitId: U,
      topicId: T("orbits"),
      questionIds: [Q("oem-3"), Q("oem-4"), Q("oem-5"), Q("oem-6"), Q("oem-7"), Q("oem-8"), Q("oem-9"), Q("oem-10")],
      config: exerciseConfig,
    },
    // ── Checkpoints
    {
      id: "physics-1.quiz.u6.1",
      kind: "skill_quiz",
      title: "Quiz 1: rotational energy, work, power and angular momentum",
      description: "Seven questions on rotational kinetic energy, massive pulleys, work and power from torques, angular momentum and angular impulse. No hints.",
      unitId: U,
      topicId: T("angular-momentum"),
      questionIds: [Q("rke-13"), Q("tke-17"), Q("tw-11"), Q("pw-11"), Q("am-11"), Q("am-13"), Q("ai-11")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 90 },
    },
    {
      id: "physics-1.quiz.u6.2",
      kind: "skill_quiz",
      title: "Quiz 2: conservation, rolling and orbits",
      description: "Seven questions on conservation of angular momentum, rotational collisions, rolling without slipping and orbiting satellites. No hints.",
      unitId: U,
      topicId: T("orbits"),
      questionIds: [Q("cam-11"), Q("rc-11"), Q("rk-13"), Q("re-17"), Q("orb-11"), Q("orb-12"), Q("oem-11")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 7 * 90 },
    },
    {
      id: "physics-1.test.u6",
      kind: "unit_test",
      title: "Unit 6 test: energy and momentum of rotating systems",
      description: "Fourteen questions, 28 minutes. Covers the whole unit: rotational kinetic energy, work and power, angular momentum and impulse, conservation in spins and collisions, rolling, and orbits.",
      unitId: U,
      questionIds: [
        Q("rke-14"), Q("tke-18"), Q("tw-12"), Q("pw-12"), Q("am-12"), Q("ai-12"), Q("cam-12"),
        Q("cam-13"), Q("rc-12"), Q("rk-14"), Q("re-18"), Q("orb-13"), Q("oem-12"), Q("oem-14"),
      ],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 28 * 60 },
    },
    {
      id: "physics-1.exam.u6",
      kind: "exam_practice",
      title: "AP-style practice set: energy and momentum of rotating systems",
      description: "Seven original multi-step AP-style items on rotating systems, rolling and orbits under exam-like timing (2 minutes per question).",
      questionIds: [Q("tke-19"), Q("tw-13"), Q("ai-13"), Q("rc-13"), Q("re-19"), Q("orb-14"), Q("oem-13")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 14 * 60 },
    },
  ],
};
