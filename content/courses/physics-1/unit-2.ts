/**
 * AP Physics 1 — Unit 2: Force and Translational Dynamics (systems and center
 * of mass, forces and free-body diagrams, Newton's three laws, gravitation,
 * friction, springs and uniform circular motion). Assembled into the course in
 * ./index.ts.
 *
 * Original AceAP instructional content. Objective codes ("PHYS-2.C") are
 * AceAP's own and are not College Board codes. Algebra-based throughout;
 * g = 9.8 m/s² unless a problem says otherwise.
 */
import type { UnitPart } from "./shared";
import { unit2Questions } from "./unit-2.questions";

const r = String.raw;
const S = (id: string) => `physics-1.u2.${id}`;
const Q = (id: string) => `physics-1.q.u2.${id}`;
const M = (id: string) => `physics-1.m.u2.${id}`;
const T = (id: string) => `physics-1.u2.t.${id}`;
const EX = (id: string) => `physics-1.ex.u2.${id}`;
const U2 = "physics-1.u2";

/** Exercise config shared by every topic exercise in this unit. */
const practice = (questionsPerAttempt = 5) => ({ feedback: "immediate" as const, assistance: "allowed" as const, questionsPerAttempt });

export const unit2: UnitPart = {
  skills: [
    {
      id: S("systems-com"),
      name: "Systems and center of mass",
      description: "Choose a system, sort the forces on it into internal and external, locate its center of mass, and recognise that only external forces change the motion of the center of mass.",
      difficulty: 2,
      keywords: ["system", "center of mass", "centre of mass", "internal force", "external force", "choosing a system", "x cm", "weighted average position", "center of mass outside the object", "explosion center of mass"],
      prerequisites: [],
      patternLabels: { "com-two-masses": "Center of mass of two objects", "com-three-masses": "Center of mass of several objects", "com-shape": "Center of mass of shapes", "com-unknown": "Working back to a mass or position", "internal-external": "Internal or external?", "system-motion": "Motion of the center of mass", "system-choice": "Choosing a useful system" },
    },
    {
      id: S("free-body-diagrams"),
      name: "Forces and free-body diagrams",
      description: "Identify every force acting on an object (each with an agent), draw a free-body diagram, and use it to find normal forces and the net force.",
      difficulty: 2,
      keywords: ["force", "free body diagram", "FBD", "normal force", "tension", "weight", "gravitational force", "contact force", "field force", "net force", "what forces act", "force diagram", "newton unit"],
      prerequisites: [S("systems-com"), "physics-1.vector-components"],
      patternLabels: { "identify-forces": "Which forces act?", "no-force-of-motion": "No force “of motion”", "contact-vs-field": "Contact and field forces", "net-force-from-fbd": "Net force from a diagram", "normal-force-cases": "When the normal force is not mg", "fbd-rules": "Rules for free-body diagrams" },
    },
    {
      id: S("third-law"),
      name: "Newton's third law",
      description: "Identify interaction (third-law) force pairs, recognise that they are equal in size, opposite in direction and act on different objects, and use them to explain propulsion and collisions.",
      difficulty: 2,
      keywords: ["newton's third law", "action reaction", "interaction pair", "third law pair", "equal and opposite", "who pushes harder", "collision forces", "why does a horse pull a cart", "walking friction forward", "rocket propulsion"],
      prerequisites: [S("free-body-diagrams")],
      patternLabels: { "identify-pair": "Finding the partner force", "pair-magnitude": "Comparing pair forces", "pair-vs-balanced": "Pairs versus balanced forces", "pair-acceleration": "Equal forces, different accelerations", propulsion: "What pushes you forward?" },
    },
    {
      id: S("equilibrium"),
      name: "Newton's first law and equilibrium",
      description: "Use Newton's first law to link zero net force with constant velocity, and solve translational equilibrium problems by making the force components in each direction sum to zero.",
      difficulty: 3,
      keywords: ["newton's first law", "inertia", "equilibrium", "translational equilibrium", "constant velocity", "net force zero", "balanced forces", "terminal velocity", "tension in two ropes", "hanging sign", "does motion need a force"],
      prerequisites: [S("free-body-diagrams"), "physics-1.vector-components"],
      patternLabels: { "first-law-concept": "Constant velocity and zero net force", "momentary-rest": "At rest for an instant", inertia: "Inertia and mass", "equilibrium-1d": "Balancing forces along a line", "equilibrium-angles": "Ropes and forces at angles", "equilibrium-rules": "What equilibrium requires" },
    },
    {
      id: S("second-law"),
      name: "Newton's second law",
      description: "Apply a = F_net / m to a single object: find the net force from a free-body diagram, then the acceleration (or a required force), and link it to kinematics.",
      difficulty: 3,
      keywords: ["newton's second law", "F = ma", "net force", "acceleration", "a = F/m", "force and acceleration", "lifting with a rope", "braking force", "stopping distance from force", "proportional reasoning force mass"],
      prerequisites: [S("equilibrium"), "physics-1.acceleration-concept", "physics-1.kinematic-equations"],
      patternLabels: { "compute-acceleration": "Acceleration from the net force", "find-force": "Force needed for an acceleration", "vertical-rope": "Ropes and vertical acceleration", proportional: "Proportional reasoning", "kinematics-link": "Forces and then motion", "direction-reasoning": "Direction of net force and acceleration", "second-law-rules": "What the second law says" },
    },
    {
      id: S("connected-objects"),
      name: "Connected objects",
      description: "Analyse blocks in contact and objects joined by strings over pulleys (including Atwood machines), using the whole system for the acceleration and a single object for an internal force.",
      difficulty: 4,
      keywords: ["connected objects", "atwood machine", "pulley", "tension", "blocks in contact", "contact force between blocks", "two blocks string", "hanging mass on table", "system acceleration", "massless string"],
      prerequisites: [S("second-law"), S("third-law")],
      patternLabels: { "system-acceleration": "Acceleration of the whole system", "contact-force": "Force between touching blocks", "string-tension": "Tension in a connecting string", atwood: "Atwood machines", "table-pulley": "Block on a table with a hanging mass", "tension-reasoning": "Reasoning about tension" },
    },
    {
      id: S("inclines"),
      name: "Objects on inclines",
      description: "Resolve gravity into components parallel and perpendicular to a ramp and find normal forces, accelerations and holding forces on inclines.",
      difficulty: 4,
      keywords: ["inclined plane", "incline", "ramp", "mg sin theta", "mg cos theta", "normal force on incline", "acceleration down a ramp", "tilted axes", "frictionless incline", "force to hold on a slope"],
      prerequisites: [S("second-law"), "physics-1.vector-components"],
      patternLabels: { "incline-components": "Components of gravity on a ramp", "incline-acceleration": "Sliding down a frictionless ramp", "incline-normal": "Normal force on a ramp", "incline-hold": "Holding an object on a ramp", "incline-trends": "Changing the angle", "incline-speed": "Speed along the ramp", "incline-pulley": "Ramps with pulleys" },
    },
    {
      id: S("gravitation"),
      name: "Universal gravitation",
      description: "Use Newton's law of universal gravitation, including inverse-square scaling, to find gravitational forces and the gravitational field strength g on or above a planet.",
      difficulty: 3,
      keywords: ["universal gravitation", "Gm1m2/r^2", "inverse square law", "gravitational constant", "gravitational field", "g on another planet", "g at altitude", "weightless astronauts", "why astronauts float", "earth moon force"],
      prerequisites: [S("free-body-diagrams")],
      patternLabels: { "gravity-compute": "Calculating a gravitational force", "inverse-square": "Changing the distance", "g-field": "Field strength g", "gravity-pair": "Both bodies feel the same force", "gravity-in-orbit": "Gravity in orbit", "gravity-symbolic": "Gravitation in symbols" },
    },
    {
      id: S("apparent-weight"),
      name: "Weight and apparent weight",
      description: "Distinguish mass from weight, compute weight as mg, and find the reading of a scale (the normal force) in an accelerating elevator or in free fall.",
      difficulty: 3,
      keywords: ["weight", "mass vs weight", "W = mg", "apparent weight", "elevator scale", "scale reading", "feel heavier", "weightlessness", "free fall scale reads zero", "weight on mars"],
      prerequisites: [S("second-law"), S("gravitation")],
      patternLabels: { "weight-compute": "Weight from mass", "mass-vs-weight": "Mass or weight?", "elevator-numeric": "Scale reading in an elevator", "elevator-reasoning": "Heavier or lighter?", "free-fall-scale": "Scales in free fall", "elevator-backward": "Acceleration from a scale reading", "elevator-cable": "Cable tension in an elevator" },
    },
    {
      id: S("friction"),
      name: "Static and kinetic friction",
      description: "Use f_k = μ_k N for sliding, treat static friction as whatever is needed up to μ_s N, and solve level-surface, angled-pull and incline problems with friction.",
      difficulty: 4,
      keywords: ["friction", "static friction", "kinetic friction", "coefficient of friction", "mu", "f = mu N", "maximum static friction", "will it slide", "friction on an incline", "sliding to a stop", "angle of repose"],
      prerequisites: [S("second-law"), S("free-body-diagrams")],
      patternLabels: { "kinetic-compute": "Kinetic friction force", "friction-acceleration": "Acceleration with friction", "friction-stopping": "Sliding to a stop", "coefficient-from-data": "Finding a coefficient", "angled-pull": "Pulling at an angle", "friction-rules": "What friction depends on", "static-threshold": "Will it start to slide?", "static-actual": "How big is static friction?", "friction-incline": "Friction on a ramp", "static-accelerates": "Static friction that speeds things up" },
    },
    {
      id: S("springs"),
      name: "Spring forces",
      description: "Apply Hooke's law, F = kx with x the stretch or compression from natural length, and use spring forces in equilibrium and second-law problems.",
      difficulty: 3,
      keywords: ["spring", "hooke's law", "F = kx", "spring constant", "stretch", "compression", "natural length", "restoring force", "spring scale", "stiffness", "N/m"],
      prerequisites: [S("equilibrium")],
      patternLabels: { "hooke-compute": "Force from the stretch", "spring-constant": "Finding the spring constant", "stretch-vs-length": "Stretch versus length", "hanging-mass": "Hanging masses", "spring-proportional": "Proportional reasoning", "spring-direction": "Direction of the spring force", "spring-dynamics": "Springs that accelerate things", "spring-system": "Springs in larger problems" },
    },
    {
      id: S("circular-motion"),
      name: "Centripetal acceleration",
      description: "Describe uniform circular motion: velocity tangent to the circle, acceleration v²/r toward the center, and speed from the period, v = 2πr/T.",
      difficulty: 3,
      keywords: ["uniform circular motion", "centripetal acceleration", "v^2/r", "period", "2 pi r / T", "acceleration toward center", "tangential velocity", "constant speed acceleration", "released from a circle", "frequency of rotation"],
      prerequisites: ["physics-1.acceleration-concept", "physics-1.vector-components"],
      patternLabels: { "ac-compute": "Centripetal acceleration from v and r", "period-speed": "Speed from the period", "ac-direction": "Direction of velocity and acceleration", "ac-scaling": "Changing speed or radius", "tangent-release": "When the string breaks", "ucm-concepts": "What changes and what does not", "ac-symbolic": "Centripetal acceleration in symbols" },
    },
    {
      id: S("circular-forces"),
      name: "Forces in circular motion",
      description: "Identify which real forces supply the centripetal net force and apply F_net = mv²/r to flat curves, strings, vertical circles (top and bottom) and circular orbits.",
      difficulty: 4,
      keywords: ["centripetal force", "centrifugal force", "flat curve friction", "maximum speed on a curve", "vertical circle", "top of a loop", "bottom of a loop", "roller coaster normal force", "orbit", "orbital speed", "car over a hill"],
      prerequisites: [S("circular-motion"), S("second-law")],
      patternLabels: { "centripetal-source": "What supplies the centripetal force?", "flat-curve": "Cars on flat curves", "horizontal-string": "Strings and horizontal circles", "vertical-bottom": "Bottom of a vertical circle", "vertical-top": "Top of a vertical circle", "orbit-speed": "Circular orbits", "hill-crest": "Over the top of a hill" },
    },
  ],

  misconceptions: [
    { id: M("com-inside-object"), skillId: S("systems-com"), title: "Thinks the center of mass must be inside the material", description: "Expects the center of mass to sit on the object itself, or always at its geometric middle, even for rings, L-shapes or objects made of unequal parts.", remediation: "The center of mass is a mass-weighted average position, not a point you can touch. For a ring or a boomerang it lies in the empty space the shape surrounds, and for two unequal masses it sits closer to the heavier one." },
    { id: M("internal-forces"), skillId: S("systems-com"), title: "Thinks internal forces can change a system's overall motion", description: "Expects forces between parts of a system (a push between two skaters, an explosion, a person pushing on the boat they sit in) to change the velocity of the system's center of mass.", remediation: "Internal forces come in third-law pairs inside the system, so they cancel when you add up all the forces on the system. Only external forces, exerted by things outside the system, can change how the center of mass moves." },
    { id: M("force-of-motion"), skillId: S("free-body-diagrams"), title: "Draws a force in the direction of motion", description: "Adds a “force of motion”, a “force of the throw” or a lingering push to the free-body diagram of an object that is moving but no longer being pushed.", remediation: "Every force needs an agent touching the object (or gravity). Once a ball leaves your hand, your hand exerts no force on it. Motion continues because of inertia, not because a force travels with the object." },
    { id: M("normal-equals-weight"), skillId: S("free-body-diagrams"), title: "Assumes the normal force always equals mg", description: "Sets the normal force equal to the weight even when other forces push or pull vertically, when the surface is tilted, or when the object accelerates vertically.", remediation: "The normal force is whatever the surface must supply to stop the object sinking into it. Find it from the free-body diagram: add up the forces perpendicular to the surface and use the acceleration in that direction (usually zero). It equals mg only for a level surface with no other vertical forces and no vertical acceleration." },
    { id: M("pair-cancels"), skillId: S("third-law"), title: "Thinks third-law pair forces act on the same object and cancel", description: "Picks two forces on the same object (such as weight and normal force) as a third-law pair, or argues that action and reaction cancel so nothing can accelerate.", remediation: "Write each force as “force on A by B”. Its third-law partner is “force on B by A”: same type of force, swapped labels. Because the two act on different objects, they never appear on the same free-body diagram and never cancel each other." },
    { id: M("bigger-exerts-more"), skillId: S("third-law"), title: "Thinks the bigger, faster or active object exerts the larger force", description: "Expects a truck to push harder on a car than the car pushes on the truck, or the person doing the pushing to exert more force than they receive.", remediation: "Interaction forces are always equal in size, whatever the masses or speeds. What differs is the effect: the same force gives the smaller mass the larger acceleration (a = F/m), which is why the car, not the truck, is badly damaged." },
    { id: M("force-velocity-link"), skillId: S("equilibrium"), title: "Links net force to velocity instead of acceleration", description: "Believes a moving object needs a net force in its direction of motion to keep going, that a net force points the way the object moves, or that an object at rest for an instant has no net force on it.", remediation: "Net force determines acceleration, not velocity. Zero net force means constant velocity (which may be zero or not). An object can be moving one way while the net force points the other way (it is slowing down), and it can be at rest for an instant while a net force acts (the top of a throw)." },
    { id: M("single-force-not-net"), skillId: S("second-law"), title: "Uses one force instead of the net force", description: "Divides a single applied force by the mass, leaves gravity out of a vertical problem, or sets one force equal to ma while ignoring the others.", remediation: "The second law is about the net force: the vector sum of every force on the object. Draw the free-body diagram first, choose a positive direction, add the forces with signs, and only then divide by the mass." },
    { id: M("partial-system-mass"), skillId: S("connected-objects"), title: "Uses only part of the system's mass", description: "Divides the external force on a group of connected objects by the mass of just one of them when finding the shared acceleration.", remediation: "If objects move together, they share one acceleration, and the external force has to accelerate all of them. For the whole system, a = (net external force) ÷ (total mass). Use a single object only when you want a force between objects." },
    { id: M("tension-equals-weight"), skillId: S("connected-objects"), title: "Assumes a supporting force equals the hanging weight during acceleration", description: "Sets a rope tension or spring force equal to the weight of the object it supports even when that object is accelerating, for example in an Atwood machine or an accelerating elevator.", remediation: "The tension equals the weight only when the hanging object has zero acceleration. Apply the second law to the hanging object alone: if it accelerates downward the tension is less than mg; if it accelerates upward the tension is more than mg." },
    { id: M("incline-sin-cos"), skillId: S("inclines"), title: "Swaps sine and cosine when resolving forces", description: "Uses mg cos θ for the component of gravity along a ramp (or mg sin θ into it), or swaps sine and cosine for a rope pulling at an angle.", remediation: "Check with an extreme case. On a level surface (θ = 0) nothing pulls you along the ramp, so the parallel component must be zero: that is mg sin θ, since sin 0 = 0. The perpendicular component is mg cos θ, which equals mg when the ramp is flat. For a rope at angle θ to the horizontal, the horizontal part is F cos θ." },
    { id: M("inverse-not-square"), skillId: S("gravitation"), title: "Uses an inverse rather than an inverse-square dependence on distance", description: "Halves the gravitational force when the distance doubles, or forgets that the distance in the law is measured between centers, not from the surface.", remediation: "Gravity falls off as 1/r². Doubling the center-to-center distance divides the force by 2² = 4; tripling it divides by 9. Measure r from the center of the planet, so an orbit 400 km up is at r = R + 400 km." },
    { id: M("no-gravity-in-space"), skillId: S("gravitation"), title: "Thinks there is no gravity in orbit", description: "Explains floating astronauts or orbiting satellites by saying there is no gravity in space or that the satellite is beyond Earth's pull.", remediation: "At the height of the space station gravity is still about 90% as strong as at the surface. Astronauts float because they and their station are falling together: gravity is the only force, and it supplies exactly the centripetal force for the orbit." },
    { id: M("mass-weight"), skillId: S("apparent-weight"), title: "Confuses mass and weight", description: "Gives a mass in kilograms when a weight (a force in newtons) is asked, uses the mass where mg belongs, or thinks an object's mass changes on another planet.", remediation: "Mass is how much matter (and inertia) an object has, in kilograms, and it is the same everywhere. Weight is the gravitational force on it, W = mg in newtons, and it depends on where you are." },
    { id: M("apparent-weight-velocity"), skillId: S("apparent-weight"), title: "Thinks apparent weight depends on the direction of motion", description: "Expects a scale to read more whenever an elevator is moving up and less whenever it is moving down, regardless of whether it is speeding up or slowing down.", remediation: "The scale reading depends on the acceleration, not the velocity. Upward acceleration (speeding up going up, or slowing down going down) makes the scale read more than mg; downward acceleration makes it read less; constant velocity in either direction gives exactly mg." },
    { id: M("static-always-max"), skillId: S("friction"), title: "Always uses μ_s N for static friction", description: "Treats the static friction force as always equal to its maximum μ_s N, even when the object is at rest and a smaller force would hold it.", remediation: "Static friction is a responsive force: it is exactly as large as needed to prevent sliding, up to a limit of μ_s N. If a 20 N push does not move a box, static friction is 20 N, whatever μ_s N is. Use μ_s N only to test whether sliding starts." },
    { id: M("spring-length"), skillId: S("springs"), title: "Uses the spring's length instead of its stretch", description: "Puts the total length of a spring into F = kx instead of the change from its natural (unstretched) length, or reports a stretch when a length is asked.", remediation: "In Hooke's law, x is the stretch or compression: how far the spring is from its natural length. Subtract the natural length from the current length first. A spring at its natural length exerts no force, however long it is." },
    { id: M("constant-speed-no-accel"), skillId: S("circular-motion"), title: "Thinks constant speed in a circle means zero acceleration", description: "Says an object moving around a circle at steady speed is not accelerating, or that its velocity is constant.", remediation: "Velocity is a vector, so a change of direction is a change of velocity. An object going round a circle is always changing direction, so it always accelerates, toward the center, with magnitude v²/r, even when its speed never changes." },
    { id: M("flies-outward"), skillId: S("circular-motion"), title: "Thinks an object released from circular motion flies straight outward", description: "Expects a ball whose string breaks to fly radially away from the center, or to keep curving.", remediation: "Once the string breaks, no horizontal force acts, so by the first law the ball continues in a straight line in the direction it was moving at that instant: along the tangent to the circle, not along the radius." },
    { id: M("extra-circular-force"), skillId: S("circular-forces"), title: "Adds a separate centripetal or centrifugal force", description: "Draws an outward “centrifugal” force on the free-body diagram, or adds a “centripetal force” alongside gravity, tension, friction and the normal force as if it were another agent.", remediation: "Centripetal is a job description, not a new force. Draw only real forces with agents (gravity, tension, normal, friction). Their net component toward the center is what supplies mv²/r. The outward push you feel in a turning car is your inertia, not a force on you." },
  ],

  units: [
    {
      id: U2,
      number: 2,
      title: "Force and Translational Dynamics",
      description: "Why things move the way they do: systems and center of mass, forces and free-body diagrams, Newton's three laws, gravitation and weight, friction, springs, and the forces behind uniform circular motion.",
      topics: [
        // ───────────────────────── Systems and center of mass ─────────────────────────
        {
          id: T("systems"),
          title: "Systems and center of mass",
          description: "Decide what you are studying, sort the forces into internal and external, and find the one point whose motion summarises the whole system.",
          objectives: [
            { id: "physics-1.o.u2.a", code: "PHYS-2.A", description: "Define a system, classify forces as internal or external to it, and locate and use the system's center of mass.", skillIds: [S("systems-com")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u2.systems",
              title: "Systems and the center of mass",
              summary: "Draw a boundary around the objects you care about, find their center of mass, and see why only forces from outside the boundary can change how that point moves.",
              estMinutes: 14,
              skillIds: [S("systems-com")],
              blocks: [
                { type: "text", md: r`Unit 1 described motion. This unit explains it: **forces** are what change motion. Before talking about forces, though, you have to decide *which object's* motion you are explaining. A car, a car and its trailer, two skaters pushing apart, a whole exploding firework: each choice is a different **system**, and a good choice can make a hard problem easy.` },
                { type: "definition", term: "System", md: r`The object or group of objects you choose to study. Everything else is the **surroundings** (or environment). You draw the boundary; nature does not.` },
                { type: "definition", term: "Internal and external forces", md: r`An **internal** force is exerted by one part of the system on another part of the same system. An **external** force is exerted on the system by something outside it.` },
                { type: "text", md: r`Take a car towing a trailer. If the system is *car + trailer*, the hitch pulling the trailer forward and the hitch pulling the car backward are internal. Earth's gravity, the road's normal and friction forces, and air resistance are external. If instead the system is *the trailer alone*, the hitch force on the trailer becomes external, because the car is now outside the boundary.` },
                { type: "callout", tone: "key", title: "Internal forces cancel in pairs", md: r`Every internal force has a partner (Newton's third law, coming soon) that is equal in size, opposite in direction, and **also inside the system**. When you add up all the forces on the system, the internal ones cancel in pairs. Only external forces are left to change the system's overall motion.` },
                { type: "check", questionId: Q("com-1"), lead: "Sort one force." },
                { type: "definition", term: "Center of mass", md: r`The mass-weighted average position of a system. For several small objects along a line, each object's position counts in proportion to its mass.` },
                { type: "formula", latex: r`x_{\text{cm}} = \frac{m_1x_1 + m_2x_2 + m_3x_3 + \cdots}{m_1 + m_2 + m_3 + \cdots}`, caption: "Center of mass along a line. Use the same formula with y-coordinates for the vertical position." },
                {
                  type: "worked_example",
                  title: "A dumbbell with unequal ends",
                  problem: r`A light bar $0.60\,\text{m}$ long has a $2.0\,\text{kg}$ weight on its left end and a $4.0\,\text{kg}$ weight on its right end. Where is the center of mass?`,
                  steps: [
                    { title: "Pick an origin", md: r`Put $x = 0$ at the left end, right positive. Then $x_1 = 0$ and $x_2 = 0.60\,\text{m}$.` },
                    { title: "Weighted average", md: r`$x_{\text{cm}} = \dfrac{(2.0)(0) + (4.0)(0.60)}{2.0 + 4.0} = \dfrac{2.4}{6.0} = 0.40\,\text{m}$.` },
                    { title: "Sense check", md: r`The center of mass is $0.40\,\text{m}$ from the light end and $0.20\,\text{m}$ from the heavy end: closer to the heavier mass, as it should be. Twice the mass, half the distance.` },
                  ],
                  answer: r`$0.40\,\text{m}$ from the $2.0\,\text{kg}$ end`,
                },
                { type: "check", questionId: Q("com-2"), lead: "Your turn with a weighted average." },
                { type: "callout", tone: "warning", title: "It does not have to be on the object", md: r`For a uniform, symmetric object the center of mass is at the geometric center. For a ring, a horseshoe or a boomerang, that center is in **empty space**. The center of mass is a calculated point, not a piece of material.` },
                { type: "text", md: r`## Why the center of mass matters

However complicated the motion of the parts, the center of mass of a system moves as if all the mass were concentrated there and all the **external** forces acted on it. A spinning wrench tossed across the floor wobbles, but its center of mass glides in a straight line. A firework that bursts in mid-air scatters pieces everywhere, but (until pieces hit the ground) their center of mass carries on along the original parabola, because the explosion forces are internal.` },
                { type: "callout", tone: "tip", title: "Choosing a good system", md: r`If you want a force *between* two objects, put the boundary between them so that force is external to one of them. If you want the motion of objects that move together, put them all inside one system so the forces between them drop out.` },
                { type: "summary", points: ["A system is whatever you choose to study; forces from outside it are external, forces between its parts are internal.", "Internal forces cancel in pairs, so only external forces change the motion of the system's center of mass.", r`$x_{\text{cm}}$ is the mass-weighted average position and always lies closer to the heavier parts.`, "The center of mass can lie outside the material, as for a ring.", "Choose the system to suit the question: together for a shared acceleration, separately for a force between objects."] },
              ],
            },
          ],
        },

        // ───────────────────────── Forces and interactions ─────────────────────────
        {
          id: T("forces"),
          title: "Forces, free-body diagrams and interactions",
          description: "Name the forces acting on an object, draw them on a free-body diagram, and pair each one with its third-law partner.",
          objectives: [
            { id: "physics-1.o.u2.b", code: "PHYS-2.B", description: "Identify the forces acting on an object, each with an agent, and represent them on a free-body diagram used to find normal forces and the net force.", skillIds: [S("free-body-diagrams")] },
            { id: "physics-1.o.u2.c", code: "PHYS-2.C", description: "Identify third-law interaction pairs and explain why they are equal and opposite but act on different objects.", skillIds: [S("third-law")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u2.forces-fbd",
              title: "Forces and free-body diagrams",
              summary: "Every force is a push or pull by a specific agent. Draw only the forces on one object, and the diagram tells you the net force.",
              estMinutes: 16,
              skillIds: [S("free-body-diagrams")],
              blocks: [
                { type: "definition", term: "Force", md: r`A push or a pull exerted **on** one object **by** another object. Force is a vector, measured in **newtons**: $1\,\text{N} = 1\,\text{kg·m/s}^2$. Every force has an agent: something that does the pushing or pulling.` },
                { type: "text", md: r`In this course you will meet a small cast of forces again and again:

| Force | Symbol | Agent | Direction |
|---|---|---|---|
| Gravitational force (weight) | $F_g = mg$ | Earth (or another planet) | Toward the planet's center (down) |
| Normal force | $F_N$ | A surface being pressed | Perpendicular to the surface, away from it |
| Tension | $F_T$ | A rope, string or cable | Along the rope, pulling away from the object |
| Friction | $f$ | A surface | Parallel to the surface, opposing sliding (or attempted sliding) |
| Spring force | $F_s$ | A spring | Back toward the spring's natural length |

Gravity is a **field** (non-contact) force. All the others here are **contact** forces: if nothing is touching the object, none of them can act.` },
                { type: "definition", term: "Free-body diagram", md: r`A sketch of **one** object (often drawn as a dot or box) with an arrow for every force acting **on** it, each starting at the object, pointing the way the force acts, and labelled with its type and agent. Forces the object exerts on other things do not belong on it.` },
                {
                  type: "worked_example",
                  title: "A crate dragged across a floor",
                  problem: r`A worker drags a crate across a rough floor with a horizontal rope. List the forces on the crate and describe its free-body diagram.`,
                  steps: [
                    { title: "Field force", md: r`Earth pulls the crate down: $F_g$, straight down.` },
                    { title: "What touches the crate?", md: r`The floor and the rope. The floor supplies two forces: the normal force $F_N$ (up, perpendicular to the floor) and kinetic friction $f$ (backward, opposite the sliding). The rope supplies tension $F_T$ (forward, along the rope).` },
                    { title: "Nothing else", md: r`The worker does not touch the crate, so there is no separate “worker force”; the worker acts through the rope. There is no “force of motion” either.` },
                  ],
                  answer: r`Four arrows: $F_g$ down, $F_N$ up, $F_T$ forward, $f$ backward.`,
                },
                { type: "callout", tone: "warning", title: "Motion is not a force", md: r`Once a ball leaves your hand, your hand no longer pushes it. A ball rising after a throw has **one** force on it (gravity, down), even though it is moving up. If you want to draw an arrow for the motion, you are drawing velocity, and velocity does not go on a free-body diagram.` },
                { type: "check", questionId: Q("fbd-1"), lead: "Count the forces on a ball in flight." },
                { type: "text", md: r`## The net force

The **net force** is the vector sum of all the forces on the object. For forces along one line, choose a positive direction and add with signs. For forces at angles, add the $x$-components and $y$-components separately (exactly as for any vectors in Unit 1).` },
                { type: "formula", latex: r`F_{\text{net},x} = \textstyle\sum F_x \qquad F_{\text{net},y} = \textstyle\sum F_y`, caption: "Add components direction by direction." },
                { type: "check", questionId: Q("fbd-2"), lead: "Read the net force off a diagram." },
                { type: "callout", tone: "warning", title: "The normal force is not automatically mg", md: r`The normal force adjusts to whatever keeps the object from sinking into the surface. A $5\,\text{kg}$ box resting on a floor has $F_N = 49\,\text{N}$. Press down on it with an extra $20\,\text{N}$ and the floor pushes back with $69\,\text{N}$. Pull up on it with $20\,\text{N}$ and $F_N$ drops to $29\,\text{N}$. Always find $F_N$ from the diagram.` },
                {
                  type: "worked_example",
                  title: "A sled pulled at an angle",
                  problem: r`A $10\,\text{kg}$ sled sits on level snow. A child pulls on its rope with $50\,\text{N}$ at $30^\circ$ above the horizontal, but the sled is not lifted off the ground. Find the normal force.`,
                  steps: [
                    { title: "Vertical forces", md: r`Up: $F_N$ and the vertical part of the tension, $50\sin 30^\circ = 25\,\text{N}$. Down: $F_g = (10)(9.8) = 98\,\text{N}$.` },
                    { title: "No vertical acceleration", md: r`The sled stays on the snow, so the vertical forces balance: $F_N + 25 = 98$.` },
                    { title: "Solve", md: r`$F_N = 73\,\text{N}$, less than the weight, because the rope carries some of it.` },
                  ],
                  answer: r`$F_N = 73\,\text{N}$`,
                },
                { type: "summary", points: ["A force is a push or pull on an object by an agent; it is a vector measured in newtons.", "Gravity acts without contact; normal, tension, friction and spring forces need contact.", "A free-body diagram shows only the forces on one object, never its velocity and never forces it exerts on others.", "Net force = vector sum of all forces; add components direction by direction.", "Find the normal force from the diagram: it equals mg only in the simplest case."] },
              ],
            },
            {
              id: "physics-1.l.u2.third-law",
              title: "Newton's third law: forces come in pairs",
              summary: "Every force is half of an interaction. The two halves are equal and opposite, act on different objects, and explain how anything gets moving.",
              estMinutes: 12,
              skillIds: [S("third-law")],
              blocks: [
                { type: "text", md: r`Push on a wall and the wall pushes back on your hand. Step off a small boat and the boat drifts backward. Forces never come alone: they are always the two sides of an **interaction** between two objects.` },
                { type: "callout", tone: "key", title: "Newton's third law", md: r`If object A exerts a force on object B, then B exerts a force on A that is **equal in magnitude** and **opposite in direction**:

$$\vec F_{\text{A on B}} = -\vec F_{\text{B on A}}$$

The two forces are the same type (both gravitational, both normal, both friction…) and act on **different** objects.` },
                { type: "text", md: r`A reliable way to find a partner: write the force as "**on** ___ **by** ___", then swap the two names. The partner of "the gravitational force *on* the apple *by* Earth" is "the gravitational force *on* Earth *by* the apple". Yes, the apple pulls Earth upward just as hard as Earth pulls the apple down; Earth's enormous mass means its acceleration is unnoticeably small.` },
                { type: "check", questionId: Q("n3-2"), lead: "Use the swap rule." },
                { type: "callout", tone: "warning", title: "Pairs never cancel", md: r`A book resting on a table has two forces on it: gravity (down) and the normal force (up). They are equal and opposite, but they are **not** a third-law pair: both act on the book, and they are different types of force. They balance because the book is not accelerating (the first law). The partner of the normal force on the book is the push of the book on the table; the partner of gravity on the book is the book's pull on Earth.` },
                {
                  type: "worked_example",
                  title: "Truck versus car",
                  problem: r`A $6000\,\text{kg}$ truck and a $1200\,\text{kg}$ car collide head-on. During the collision the truck pushes on the car with an average force of $3.0\times10^4\,\text{N}$. Find the force on the truck and each vehicle's acceleration.`,
                  steps: [
                    { title: "Third law", md: r`The car pushes on the truck with the same $3.0\times10^4\,\text{N}$, in the opposite direction. Size and speed do not matter.` },
                    { title: "Different effects", md: r`Car: $a = \dfrac{3.0\times10^4}{1200} = 25\,\text{m/s}^2$. Truck: $a = \dfrac{3.0\times10^4}{6000} = 5.0\,\text{m/s}^2$.` },
                    { title: "Interpret", md: r`Equal forces, but the car's acceleration is five times larger, because its mass is five times smaller. That is why the car's occupants have the worse time.` },
                  ],
                  answer: r`$3.0\times10^4\,\text{N}$ on each; $25\,\text{m/s}^2$ for the car, $5.0\,\text{m/s}^2$ for the truck`,
                },
                { type: "check", questionId: Q("n3-1"), lead: "Who pushes harder?" },
                { type: "text", md: r`## How anything gets going

To speed up, an object needs an external force **on it**, so it has to push on something else and let the third law push back. When you walk, your shoe pushes backward on the ground and the ground's friction pushes you forward. A swimmer pushes water back; the water pushes the swimmer forward. A rocket pushes exhaust gas out of its nozzle; the gas pushes the rocket the other way, with no ground or air needed.` },
                { type: "summary", points: ["Forces come in interaction pairs: the force on A by B and the force on B by A.", "The pair forces are equal in size, opposite in direction and the same type of force.", "They act on different objects, so they never cancel and never appear on the same free-body diagram.", "Equal forces can produce very different accelerations when the masses differ.", "Walking, swimming and rockets all work by pushing on something else and being pushed back."] },
              ],
            },
          ],
        },

        // ───────────────────────── First law and equilibrium ─────────────────────────
        {
          id: T("first-law"),
          title: "Newton's first law and equilibrium",
          description: "Zero net force means constant velocity. Use that to reason about motion and to solve for unknown forces in balanced situations.",
          objectives: [
            { id: "physics-1.o.u2.d", code: "PHYS-2.D", description: "Relate zero net force to constant velocity and solve translational equilibrium problems using force components.", skillIds: [S("equilibrium")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u2.first-law",
              title: "Newton's first law and equilibrium",
              summary: "Objects keep doing what they are doing unless a net force acts. Balanced forces mean constant velocity, which is the key to solving for unknown forces.",
              estMinutes: 15,
              skillIds: [S("equilibrium")],
              blocks: [
                { type: "text", md: r`For most of history people believed that keeping something moving required a continual push. Everyday experience seems to agree: stop pedalling and your bike slows down. The catch is that friction and air resistance are always quietly pushing back. Take them away (a puck on smooth ice, a probe in deep space) and motion simply carries on.` },
                { type: "callout", tone: "key", title: "Newton's first law", md: r`If the net force on an object is zero, its velocity stays constant: an object at rest stays at rest, and a moving object keeps moving in a straight line at constant speed. Conversely, if the velocity is constant, the net force must be zero.` },
                { type: "definition", term: "Inertia", md: r`An object's tendency to keep its velocity unchanged. Mass is the measure of inertia: the more mass, the harder it is to speed up, slow down or turn. Inertia is not a force.` },
                { type: "definition", term: "Translational equilibrium", md: r`The state of an object whose net force is zero, and which therefore has zero acceleration. It may be at rest **or** moving at constant velocity.` },
                { type: "check", questionId: Q("eq-1"), lead: "Engines off in deep space." },
                { type: "callout", tone: "warning", title: "Velocity is not what the net force decides", md: r`A car cruising at a steady $25\,\text{m/s}$ has zero net force: the forward push from the road exactly balances air resistance and rolling friction. A ball at the top of its flight is momentarily at rest but has a net force of $mg$ downward. Net force is about **changing** velocity, not about having it.` },
                { type: "text", md: r`## Solving equilibrium problems

1. Choose the object and draw its free-body diagram.
2. Choose axes; split every angled force into components.
3. Write $\sum F_x = 0$ and $\sum F_y = 0$.
4. Solve for the unknowns.` },
                {
                  type: "worked_example",
                  title: "A sign hanging from two cables",
                  problem: r`A $120\,\text{N}$ shop sign hangs from two cables, each making $40^\circ$ with the horizontal, one on each side. Find the tension in each cable.`,
                  steps: [
                    { title: "Diagram", md: r`Three forces: weight $120\,\text{N}$ down, and two tensions $T$ (equal, by symmetry) pulling up and outward at $40^\circ$ above the horizontal.` },
                    { title: "Horizontal", md: r`$T\cos40^\circ$ to the left and $T\cos40^\circ$ to the right cancel automatically.` },
                    { title: "Vertical", md: r`Each cable's vertical part is $T\sin40^\circ$ (the side opposite the $40^\circ$ angle). So $2T\sin40^\circ = 120\,\text{N}$.` },
                    { title: "Solve", md: r`$T = \dfrac{120}{2(0.643)} = 93\,\text{N}$. Each cable carries more than half the weight, because only part of its pull is upward.` },
                  ],
                  answer: r`$T \approx 93\,\text{N}$ in each cable`,
                },
                { type: "callout", tone: "tip", title: "Shallow cables, huge tensions", md: r`As the cables get closer to horizontal, $\sin\theta$ shrinks and the tension needed grows without limit. That is why a washing line can never be pulled perfectly straight once something hangs on it.` },
                { type: "check", questionId: Q("eq-2"), lead: "Balance the forces." },
                { type: "summary", points: ["First law: zero net force ⇔ constant velocity (including at rest).", "Mass measures inertia; inertia is not a force.", "Equilibrium means zero acceleration, not necessarily zero velocity.", r`Solve equilibrium problems with $\sum F_x = 0$ and $\sum F_y = 0$ after resolving angled forces.`, "An object at rest for only an instant (top of a throw) is not in equilibrium."] },
              ],
            },
          ],
        },

        // ───────────────────────── Second law ─────────────────────────
        {
          id: T("second-law"),
          title: "Newton's second law",
          description: "Net force causes acceleration. Apply it to single objects, to objects joined together, and to objects on ramps.",
          objectives: [
            { id: "physics-1.o.u2.e", code: "PHYS-2.E", description: "Apply Newton's second law to a single object to find its acceleration or an unknown force, and connect the result to kinematics.", skillIds: [S("second-law")] },
            { id: "physics-1.o.u2.f", code: "PHYS-2.F", description: "Apply Newton's second law to connected objects and to objects on inclines, choosing systems and axes that simplify the analysis.", skillIds: [S("connected-objects"), S("inclines")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u2.second-law",
              title: "Newton's second law",
              summary: "The acceleration of an object is the net force divided by its mass, in the direction of the net force. Draw the diagram, add the forces, divide.",
              estMinutes: 16,
              skillIds: [S("second-law")],
              blocks: [
                { type: "text", md: r`The first law covers the case of zero net force. The second law says what happens otherwise: the velocity changes, and how quickly it changes depends on how big the net force is and how much mass it has to move.` },
                { type: "formula", latex: r`\vec a = \frac{\vec F_{\text{net}}}{m} \qquad\Longleftrightarrow\qquad \vec F_{\text{net}} = m\vec a`, caption: "Newton's second law. The acceleration points the same way as the net force." },
                { type: "callout", tone: "key", title: "Net force, not any force", md: r`The $F$ in $F = ma$ is the **net** force: the vector sum of every force on the object. Using a single applied force and forgetting friction, gravity or a rope is the most common mistake in this unit.` },
                { type: "check", questionId: Q("n2-1"), lead: "The simplest case." },
                { type: "text", md: r`## A recipe that always works

1. Pick the object; draw its free-body diagram.
2. Choose a positive direction for each axis, ideally along the acceleration.
3. Write $\sum F = ma$ separately for each axis.
4. Solve, then check the sign and size make sense.` },
                {
                  type: "worked_example",
                  title: "Hauling a bucket up a well",
                  problem: r`A rope pulls a $12\,\text{kg}$ bucket of water upward, giving it an upward acceleration of $0.80\,\text{m/s}^2$. Find the tension in the rope.`,
                  steps: [
                    { title: "Diagram", md: r`Tension $T$ up, gravity $mg = (12)(9.8) = 117.6\,\text{N}$ down. Take up as positive.` },
                    { title: "Second law", md: r`$T - mg = ma$, so $T = m(g + a)$.` },
                    { title: "Numbers", md: r`$T = 12(9.8 + 0.80) = 127\,\text{N}$.` },
                    { title: "Check", md: r`The tension exceeds the weight, as it must for an upward acceleration. If the bucket rose at constant speed, $T$ would equal $117.6\,\text{N}$ exactly.` },
                  ],
                  answer: r`$T \approx 127\,\text{N}$`,
                },
                { type: "callout", tone: "warning", title: "Net force and velocity can point opposite ways", md: r`A car braking while it drives east has a net force pointing **west**. Its acceleration is west too, which is exactly why it slows down. The direction of motion tells you nothing about the direction of the net force.` },
                {
                  type: "worked_example",
                  title: "From force to stopping distance",
                  problem: r`A $1500\,\text{kg}$ car moving at $20\,\text{m/s}$ brakes with a constant net backward force of $7500\,\text{N}$. How far does it travel while stopping?`,
                  steps: [
                    { title: "Acceleration from forces", md: r`$a = \dfrac{F_{\text{net}}}{m} = \dfrac{-7500}{1500} = -5.0\,\text{m/s}^2$ (forward positive).` },
                    { title: "Kinematics from Unit 1", md: r`$v^2 = v_0^2 + 2a\Delta x$ with $v = 0$: $\Delta x = \dfrac{-v_0^2}{2a} = \dfrac{-(20)^2}{2(-5.0)} = 40\,\text{m}$.` },
                  ],
                  answer: r`$40\,\text{m}$`,
                },
                { type: "check", questionId: Q("n2-2"), lead: "Reason with proportions." },
                { type: "summary", points: [r`$\vec a = \vec F_{\text{net}}/m$: acceleration is in the direction of the net force.`, "Always use the net force: add every force with signs before dividing by the mass.", "For the same net force, doubling the mass halves the acceleration.", "Velocity and net force can point in opposite directions (slowing down).", "The second law gives a; Unit 1's equations then give speeds, times and distances."] },
              ],
            },
            {
              id: "physics-1.l.u2.connected-inclines",
              title: "Connected objects and inclines",
              summary: "Treat objects that move together as one system to find their acceleration, then split them apart to find the forces between them. On ramps, tilt your axes.",
              estMinutes: 18,
              skillIds: [S("connected-objects"), S("inclines")],
              blocks: [
                { type: "text", md: r`Many problems involve objects joined by strings or pushed together. They share an acceleration, which makes a two-step strategy very powerful:

1. **Whole system** for the acceleration: forces between the objects are internal and cancel, so $a = \dfrac{F_{\text{net, external}}}{m_{\text{total}}}$.
2. **One object** for an internal force: the force between the objects is now external to that object, and $F = ma$ for it alone reveals the force.

Ideal strings and pulleys in this course are massless and frictionless: a string has the same tension all along its length, and a pulley only changes the direction of the pull.` },
                {
                  type: "worked_example",
                  title: "Two blocks pulled by a string",
                  problem: r`On a frictionless table, a $3.0\,\text{kg}$ block is pulled with a horizontal $12\,\text{N}$ force. A string ties it to a $1.0\,\text{kg}$ block behind it. Find the acceleration and the string tension.`,
                  steps: [
                    { title: "System: both blocks", md: r`The only external horizontal force is $12\,\text{N}$. $a = \dfrac{12}{3.0 + 1.0} = 3.0\,\text{m/s}^2$.` },
                    { title: "One object: the rear block", md: r`Only the string pulls it horizontally: $T = (1.0)(3.0) = 3.0\,\text{N}$.` },
                    { title: "Check with the front block", md: r`$12 - T = (3.0)(3.0)$ gives $T = 3.0\,\text{N}$. Same answer.` },
                  ],
                  answer: r`$a = 3.0\,\text{m/s}^2$, $T = 3.0\,\text{N}$`,
                },
                { type: "check", questionId: Q("conn-1"), lead: "Find the shared acceleration." },
                { type: "text", md: r`## Atwood machines

Two masses hang on either side of a pulley. The heavier side wins: the net driving force on the system is the difference of the weights, $(m_2 - m_1)g$, and it has to accelerate both masses:

$$a = \frac{(m_2 - m_1)g}{m_1 + m_2}$$

The tension is **not** equal to either weight. The lighter mass accelerates upward, so the tension must exceed its weight; the heavier mass accelerates downward, so the tension must be less than its weight.` },
                { type: "check", questionId: Q("conn-2"), lead: "Compare the tension with the weights." },
                { type: "text", md: r`## Objects on inclines

On a ramp, the acceleration (if any) is along the surface. So tilt your axes: $x$ along the ramp, $y$ perpendicular to it. Then the normal force and friction lie along the axes, and only gravity needs splitting.` },
                { type: "formula", latex: r`F_{g\parallel} = mg\sin\theta \qquad F_{g\perp} = mg\cos\theta`, caption: "Components of gravity on a ramp of angle θ: along the slope (down it) and into the surface." },
                { type: "callout", tone: "tip", title: "Sine or cosine? Test θ = 0", md: r`On a flat surface ($\theta = 0$) nothing drags an object sideways, so the along-slope part must vanish: $mg\sin 0 = 0$. ✓ And the whole weight presses into the surface: $mg\cos 0 = mg$. ✓ For a vertical "ramp" ($\theta = 90^\circ$) the roles swap, and the object is simply falling.` },
                {
                  type: "worked_example",
                  title: "A box on a frictionless ramp",
                  problem: r`A $4.0\,\text{kg}$ box slides down a frictionless ramp inclined at $30^\circ$. Find the normal force and the acceleration.`,
                  steps: [
                    { title: "Perpendicular", md: r`No acceleration into the ramp: $F_N = mg\cos30^\circ = (4.0)(9.8)(0.866) = 34\,\text{N}$, less than the weight $39.2\,\text{N}$.` },
                    { title: "Along the slope", md: r`Only $mg\sin\theta$ acts: $a = \dfrac{mg\sin30^\circ}{m} = g\sin30^\circ = 4.9\,\text{m/s}^2$, down the slope.` },
                    { title: "Notice", md: r`The mass cancelled. On a frictionless ramp every object has the same acceleration, $g\sin\theta$, just as every object falls with $g$.` },
                  ],
                  answer: r`$F_N \approx 34\,\text{N}$; $a = 4.9\,\text{m/s}^2$ down the slope`,
                },
                { type: "check", questionId: Q("inc-1"), lead: "The normal force on a ramp." },
                { type: "check", questionId: Q("inc-2"), lead: "One more ramp." },
                { type: "summary", points: ["For objects moving together: whole system for the acceleration, one object for the force between them.", "An ideal string has one tension throughout; an ideal pulley just redirects it.", r`Atwood machine: $a = (m_2 - m_1)g/(m_1 + m_2)$, and the tension lies between the two weights.`, r`On a ramp, tilt the axes: $mg\sin\theta$ along the slope, $mg\cos\theta$ into it.`, r`On a frictionless ramp $a = g\sin\theta$ and $F_N = mg\cos\theta < mg$.`] },
              ],
            },
          ],
        },

        // ───────────────────────── Gravitational force ─────────────────────────
        {
          id: T("gravity"),
          title: "Gravitational force and weight",
          description: "Newton's law of universal gravitation, the field strength g, and the difference between your weight and what a scale says.",
          objectives: [
            { id: "physics-1.o.u2.g", code: "PHYS-2.G", description: "Use Newton's law of universal gravitation, including inverse-square scaling, to find gravitational forces and field strengths.", skillIds: [S("gravitation")] },
            { id: "physics-1.o.u2.h", code: "PHYS-2.H", description: "Distinguish mass from weight and determine apparent weight (a scale reading) for objects with vertical acceleration.", skillIds: [S("apparent-weight")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u2.gravitation",
              title: "Universal gravitation",
              summary: "Every mass attracts every other mass with a force that falls off as the square of the distance. The same law gives g at Earth's surface and in orbit.",
              estMinutes: 15,
              skillIds: [S("gravitation")],
              blocks: [
                { type: "text", md: r`Newton's great insight was that the force that drops an apple is the same force that holds the Moon in its orbit. Any two objects with mass attract each other; for everyday objects the force is far too small to notice, but for planets and stars it shapes everything.` },
                { type: "formula", latex: r`F_g = \frac{G\,m_1 m_2}{r^2} \qquad G = 6.67\times10^{-11}\,\text{N·m}^2/\text{kg}^2`, caption: "Newton's law of universal gravitation. r is the distance between the centers of the two objects." },
                { type: "callout", tone: "key", title: "Inverse-square scaling", md: r`Double the distance and the force drops to $\tfrac14$; triple it and it drops to $\tfrac19$. Double one of the masses and the force doubles. Most AP questions about gravitation can be answered with this kind of ratio reasoning, without ever touching the value of $G$.` },
                { type: "check", questionId: Q("grav-1"), lead: "Scale the force." },
                { type: "text", md: r`The force is mutual: Earth pulls you down with the same size of force that you pull Earth up. That is Newton's third law, and it holds for any two bodies however different their masses.` },
                { type: "definition", term: "Gravitational field strength g", md: r`The gravitational force per kilogram at a location: $g = F_g/m$. Near a planet of mass $M$ and at distance $r$ from its center, $g = \dfrac{GM}{r^2}$. Near Earth's surface $g \approx 9.8\,\text{N/kg}$, which is the same as $9.8\,\text{m/s}^2$.` },
                {
                  type: "worked_example",
                  title: "Gravity at twice the distance",
                  problem: r`A satellite orbits at a height above Earth's surface equal to Earth's radius. What is $g$ there?`,
                  steps: [
                    { title: "Measure from the center", md: r`The satellite is one radius above the surface, so it is $r = 2R_E$ from Earth's center.` },
                    { title: "Ratio", md: r`$g \propto 1/r^2$, so doubling $r$ gives $g = \dfrac{9.8}{2^2} = 2.45\,\text{m/s}^2$.` },
                  ],
                  answer: r`$2.45\,\text{m/s}^2$`,
                },
                { type: "callout", tone: "warning", title: "There is gravity in orbit", md: r`The International Space Station orbits about $400\,\text{km}$ up, only about 6% farther from Earth's center than the surface. Gravity there is about 90% of its surface value. Astronauts float because they and the station are both **falling** around Earth together, not because gravity has switched off.` },
                { type: "check", questionId: Q("grav-2"), lead: "Another planet." },
                { type: "summary", points: [r`$F_g = Gm_1m_2/r^2$, with $r$ measured between centers.`, "Doubling the distance divides the force by 4; doubling a mass doubles it.", "The two bodies feel equal and opposite gravitational forces.", r`$g = GM/r^2$ is the gravitational force per kilogram; $9.8\,\text{N/kg}$ at Earth's surface.`, "Orbiting astronauts feel weightless because they are in free fall, not because gravity is absent."] },
              ],
            },
            {
              id: "physics-1.l.u2.apparent-weight",
              title: "Weight and apparent weight",
              summary: "Your weight is the gravitational force on you. A scale measures something else: the normal force, which changes whenever you accelerate up or down.",
              estMinutes: 14,
              skillIds: [S("apparent-weight")],
              blocks: [
                { type: "definition", term: "Mass and weight", md: r`**Mass** $m$ measures the amount of matter and the inertia of an object, in kilograms; it is the same everywhere. **Weight** is the gravitational force on the object, $F_g = mg$, in newtons; it depends on the local $g$.` },
                { type: "check", questionId: Q("appw-1"), lead: "On the Moon." },
                { type: "text", md: r`A bathroom scale does not measure gravity directly. You press on the scale and it pushes back up on you; the number it shows is the size of that **normal force**. If you are not accelerating, the normal force balances gravity and the scale shows your true weight. If you are accelerating vertically, it does not.` },
                { type: "definition", term: "Apparent weight", md: r`The size of the support force (normal force or tension) on an object; what a scale reads. It equals $mg$ only when the vertical acceleration is zero.` },
                { type: "formula", latex: r`F_N - mg = ma \quad\Longrightarrow\quad F_N = m(g + a)`, caption: "Up positive. a > 0 (upward acceleration): reading above mg. a < 0: below mg." },
                {
                  type: "worked_example",
                  title: "An elevator ride",
                  problem: r`A $55\,\text{kg}$ student stands on a scale in an elevator. Find the reading when the elevator (a) speeds up going upward at $1.2\,\text{m/s}^2$, (b) moves up at constant speed, (c) slows down going upward at $1.2\,\text{m/s}^2$.`,
                  steps: [
                    { title: "(a) Acceleration up", md: r`$a = +1.2\,\text{m/s}^2$: $F_N = 55(9.8 + 1.2) = 605\,\text{N}$. The student feels heavier.` },
                    { title: "(b) Constant velocity", md: r`$a = 0$: $F_N = 55(9.8) = 539\,\text{N}$, the true weight.` },
                    { title: "(c) Slowing while rising", md: r`Velocity up, but slowing, so the acceleration is **down**: $a = -1.2\,\text{m/s}^2$. $F_N = 55(9.8 - 1.2) = 473\,\text{N}$. The student feels lighter even though the elevator is still going up.` },
                  ],
                  answer: r`(a) $605\,\text{N}$, (b) $539\,\text{N}$, (c) $473\,\text{N}$`,
                },
                { type: "callout", tone: "warning", title: "Acceleration decides, not direction of travel", md: r`"Going up" does not mean "heavier". Ask which way the elevator is **accelerating**. Speeding up going up and slowing down going down both mean upward acceleration (heavier). Speeding up going down and slowing down going up both mean downward acceleration (lighter).` },
                { type: "check", questionId: Q("appw-2"), lead: "Predict the scale reading." },
                { type: "text", md: r`If the cable snapped (and safety brakes failed), the elevator and everything in it would fall with $a = -g$. Then $F_N = m(g - g) = 0$: the scale reads zero. This is the "weightlessness" of free fall, the same thing astronauts experience in orbit.` },
                { type: "summary", points: ["Mass (kg) is the same everywhere; weight mg (N) depends on g.", "A scale reads the normal force on you: your apparent weight.", r`Apparent weight $F_N = m(g + a)$ with up positive.`, "Upward acceleration makes you feel heavier; downward acceleration makes you feel lighter; constant velocity changes nothing.", "In free fall the apparent weight is zero, although gravity still acts."] },
              ],
            },
          ],
        },

        // ───────────────────────── Friction ─────────────────────────
        {
          id: T("friction"),
          title: "Friction",
          description: "Kinetic friction for sliding, static friction for gripping, and how to tell which one you have.",
          objectives: [
            { id: "physics-1.o.u2.i", code: "PHYS-2.I", description: "Model kinetic and static friction, decide whether an object slides, and include friction in equilibrium and second-law analyses.", skillIds: [S("friction")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u2.friction",
              title: "Static and kinetic friction",
              summary: "Sliding surfaces feel a kinetic friction force of μ_k N. Surfaces that grip feel whatever static friction is needed, up to a limit of μ_s N.",
              estMinutes: 18,
              skillIds: [S("friction")],
              blocks: [
                { type: "text", md: r`Friction is the force a surface exerts **parallel** to itself, opposing sliding between two surfaces in contact. Without it you could not walk, drive, or hold a pencil. There are two kinds, and telling them apart is most of the battle.` },
                { type: "definition", term: "Kinetic friction", md: r`Friction between surfaces that are **sliding** relative to each other. It points opposite the sliding and, to a good approximation, has a fixed size that depends only on how hard the surfaces are pressed together and what they are made of.` },
                { type: "formula", latex: r`f_k = \mu_k F_N`, caption: "μ_k (mu-k) is the coefficient of kinetic friction: a number with no units, typically 0.05–1." },
                { type: "callout", tone: "info", title: "What kinetic friction does not depend on", md: r`In this model, kinetic friction does not depend on the speed of sliding or on the area of contact. It depends on the normal force, which is why pulling a sled upward at an angle (reducing $F_N$) also reduces friction.` },
                { type: "check", questionId: Q("fric-2"), lead: "Compute a kinetic friction force." },
                { type: "definition", term: "Static friction", md: r`Friction between surfaces that are **not** sliding relative to each other. It takes whatever size and direction are needed to prevent sliding, up to a maximum.` },
                { type: "formula", latex: r`f_s \le \mu_s F_N`, caption: "Static friction can be anything from zero up to μ_s N. Usually μ_s > μ_k: it is harder to start something sliding than to keep it sliding." },
                { type: "callout", tone: "warning", title: "μ_s N is a limit, not the answer", md: r`Push a heavy box with $20\,\text{N}$ and it does not budge: static friction is $20\,\text{N}$. Push with $50\,\text{N}$ and it still does not budge: static friction is now $50\,\text{N}$. Only when your push exceeds $\mu_sF_N$ does the box break free. Use $\mu_sF_N$ to **test** whether sliding starts, never as the value of static friction for a box that is sitting still.` },
                { type: "check", questionId: Q("fric-1"), lead: "How big is static friction here?" },
                {
                  type: "worked_example",
                  title: "Will it move, and how fast?",
                  problem: r`A $25\,\text{kg}$ crate rests on a level floor with $\mu_s = 0.50$ and $\mu_k = 0.35$. A worker pushes horizontally with $100\,\text{N}$, then with $150\,\text{N}$. What happens each time?`,
                  steps: [
                    { title: "Normal force and the static limit", md: r`$F_N = mg = (25)(9.8) = 245\,\text{N}$. Maximum static friction: $\mu_sF_N = (0.50)(245) = 122.5\,\text{N}$.` },
                    { title: "100 N push", md: r`$100 < 122.5$, so the crate stays put. Static friction is exactly $100\,\text{N}$, backward.` },
                    { title: "150 N push", md: r`$150 > 122.5$, so the crate starts sliding and kinetic friction takes over: $f_k = (0.35)(245) = 85.75\,\text{N}$.` },
                    { title: "Acceleration", md: r`$a = \dfrac{150 - 85.75}{25} = 2.6\,\text{m/s}^2$.` },
                  ],
                  answer: r`At $100\,\text{N}$: no motion, $f_s = 100\,\text{N}$. At $150\,\text{N}$: slides with $a \approx 2.6\,\text{m/s}^2$.`,
                },
                { type: "callout", tone: "tip", title: "Static friction can speed things up", md: r`Friction opposes *sliding between the surfaces*, not motion. A crate on the bed of an accelerating truck is carried forward by static friction from the truck bed; your foot pushing back on the ground gets a forward static friction force that moves you. Friction points whichever way prevents the surfaces from slipping.` },
                {
                  type: "worked_example",
                  title: "Friction on a ramp",
                  problem: r`A $2.0\,\text{kg}$ block slides down a $35^\circ$ ramp with $\mu_k = 0.30$. Find its acceleration.`,
                  steps: [
                    { title: "Normal force", md: r`$F_N = mg\cos35^\circ = (2.0)(9.8)(0.819) = 16.1\,\text{N}$.` },
                    { title: "Friction", md: r`$f_k = (0.30)(16.1) = 4.82\,\text{N}$, up the slope (opposing the sliding).` },
                    { title: "Along the slope", md: r`$mg\sin35^\circ = (2.0)(9.8)(0.574) = 11.2\,\text{N}$ down the slope. $a = \dfrac{11.2 - 4.82}{2.0} = 3.2\,\text{m/s}^2$ down the slope.` },
                  ],
                  answer: r`$a \approx 3.2\,\text{m/s}^2$ down the slope`,
                },
                { type: "summary", points: [r`Kinetic friction: $f_k = \mu_kF_N$, opposite the sliding, independent of speed and contact area.`, r`Static friction: whatever is needed to prevent sliding, up to $\mu_sF_N$.`, r`Test for sliding by comparing the force needed with $\mu_sF_N$.`, "Find the normal force from the free-body diagram first; angled pulls and ramps change it.", "Friction opposes slipping between surfaces, so static friction can point in the direction of motion."] },
              ],
            },
          ],
        },

        // ───────────────────────── Springs ─────────────────────────
        {
          id: T("springs"),
          title: "Spring forces",
          description: "Hooke's law for ideal springs, and springs as one more force on a free-body diagram.",
          objectives: [
            { id: "physics-1.o.u2.j", code: "PHYS-2.J", description: "Apply Hooke's law to ideal springs and include spring forces in equilibrium and second-law analyses.", skillIds: [S("springs")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u2.springs",
              title: "Spring forces and Hooke's law",
              summary: "An ideal spring pulls or pushes back toward its natural length with a force proportional to how far it is stretched or compressed.",
              estMinutes: 13,
              skillIds: [S("springs")],
              blocks: [
                { type: "text", md: r`Stretch a spring and it pulls back; squash it and it pushes back. Either way the spring tries to return to its **natural length** (its length with no force on it). For a wide range of stretches, the force is simply proportional to the stretch.` },
                { type: "formula", latex: r`F_s = kx`, caption: "Hooke's law (magnitude). x is the stretch or compression from natural length, in metres; k is the spring constant, in N/m." },
                { type: "definition", term: "Spring constant k", md: r`The force needed per metre of stretch. A stiff spring has a large $k$; a soft spring has a small $k$. On a graph of force against stretch, $k$ is the slope.` },
                { type: "callout", tone: "key", title: "Restoring force", md: r`The spring force always points **back toward the natural length**: a stretched spring pulls in, a compressed spring pushes out. Written with signs, $F_s = -kx$; the minus sign records that the force opposes the displacement from natural length.` },
                { type: "check", questionId: Q("spr-1"), lead: "Apply Hooke's law." },
                { type: "callout", tone: "warning", title: "Stretch, not length", md: r`A spring with natural length $20\,\text{cm}$ that is pulled out to $26\,\text{cm}$ has $x = 6\,\text{cm} = 0.06\,\text{m}$, not $26\,\text{cm}$. Always subtract the natural length first, and convert to metres.` },
                { type: "check", questionId: Q("spr-2"), lead: "Read a spring correctly." },
                {
                  type: "worked_example",
                  title: "Calibrating a spring scale",
                  problem: r`A $0.40\,\text{kg}$ mass hangs at rest from a spring and stretches it by $5.0\,\text{cm}$. Find $k$, then the stretch produced by a $1.0\,\text{kg}$ mass.`,
                  steps: [
                    { title: "Equilibrium", md: r`At rest, the spring force balances gravity: $kx = mg$, so $k = \dfrac{(0.40)(9.8)}{0.050} = 78.4\,\text{N/m}$.` },
                    { title: "New mass", md: r`$x = \dfrac{mg}{k} = \dfrac{(1.0)(9.8)}{78.4} = 0.125\,\text{m} = 12.5\,\text{cm}$.` },
                    { title: "Proportional check", md: r`The mass went up by a factor of $2.5$, so the stretch did too: $5.0 \times 2.5 = 12.5\,\text{cm}$. ✓` },
                  ],
                  answer: r`$k = 78.4\,\text{N/m}$; $12.5\,\text{cm}$`,
                },
                { type: "text", md: r`A spring is just another force on a free-body diagram. In an accelerating elevator, a mass hanging from a spring stretches it more (upward acceleration) or less (downward acceleration), exactly like the scale reading in the last topic. A spring pulling a cart across a frictionless track gives it $a = kx/m$.` },
                { type: "summary", points: [r`Hooke's law: $F_s = kx$, with $x$ measured from natural length.`, "k is the stiffness in N/m and the slope of a force–stretch graph.", "The spring force always points back toward natural length.", "Use the stretch, not the length, and work in metres.", "Springs join free-body diagrams like any other force, in equilibrium and in second-law problems."] },
              ],
            },
          ],
        },

        // ───────────────────────── Circular motion ─────────────────────────
        {
          id: T("circular"),
          title: "Uniform circular motion",
          description: "Moving in a circle at constant speed means accelerating toward the center. Find that acceleration and the real forces that produce it.",
          objectives: [
            { id: "physics-1.o.u2.k", code: "PHYS-2.K", description: "Describe the velocity and centripetal acceleration of an object in uniform circular motion and calculate them from speed, radius and period.", skillIds: [S("circular-motion")] },
            { id: "physics-1.o.u2.l", code: "PHYS-2.L", description: "Identify the forces that provide the centripetal net force and apply Newton's second law to horizontal circles, vertical circles and circular orbits.", skillIds: [S("circular-forces")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u2.centripetal",
              title: "Uniform circular motion",
              summary: "Constant speed around a circle still means a changing velocity, so the object accelerates toward the center with magnitude v²/r.",
              estMinutes: 14,
              skillIds: [S("circular-motion")],
              blocks: [
                { type: "definition", term: "Uniform circular motion", md: r`Motion around a circle of radius $r$ at constant speed $v$. The velocity at every instant is **tangent** to the circle.` },
                { type: "text", md: r`The speed never changes, but the direction of the velocity changes all the time. Since velocity is a vector, a changing direction *is* a changing velocity, so the object is accelerating. Compare the velocity arrows at two nearby moments: the change between them points toward the center of the circle.` },
                { type: "callout", tone: "key", title: "Centripetal acceleration", md: r`An object in uniform circular motion accelerates **toward the center** of the circle with magnitude

$$a_c = \frac{v^2}{r}$$

"Centripetal" just means "center-seeking".` },
                { type: "check", questionId: Q("cac-1"), lead: "Which way does it accelerate?" },
                { type: "text", md: r`Often you know how long one revolution takes (the **period** $T$) rather than the speed. In one period the object travels one circumference, so

$$v = \frac{2\pi r}{T}$$` },
                {
                  type: "worked_example",
                  title: "A spinning salad drier",
                  problem: r`A salad spinner basket of radius $0.12\,\text{m}$ makes one revolution every $0.20\,\text{s}$. Find the speed and the centripetal acceleration of a lettuce leaf stuck to its wall.`,
                  steps: [
                    { title: "Speed from the period", md: r`$v = \dfrac{2\pi(0.12)}{0.20} = 3.77\,\text{m/s}$.` },
                    { title: "Acceleration", md: r`$a_c = \dfrac{v^2}{r} = \dfrac{(3.77)^2}{0.12} = 118\,\text{m/s}^2$, toward the axis: about $12g$.` },
                  ],
                  answer: r`$v \approx 3.8\,\text{m/s}$; $a_c \approx 120\,\text{m/s}^2$ toward the center`,
                },
                { type: "callout", tone: "warning", title: "When the string breaks", md: r`Whirl a ball on a string and let go: the ball flies off along the **tangent**, in a straight line, in the direction it was moving at the instant of release. It does not fly straight outward, and it does not keep curving. With no force toward the center, the first law takes over.` },
                { type: "check", questionId: Q("cac-2"), lead: "Compute an acceleration." },
                { type: "callout", tone: "tip", title: "Scaling", md: r`$a_c \propto v^2$: double the speed on the same circle and the acceleration quadruples. $a_c \propto 1/r$ at fixed speed: a tighter turn means a bigger acceleration. That is why sharp turns at high speed are dangerous.` },
                { type: "summary", points: ["In uniform circular motion the speed is constant but the velocity is not.", "Velocity is tangent to the circle; acceleration points to the center.", r`$a_c = v^2/r$ and $v = 2\pi r/T$.`, "Released objects leave along the tangent in a straight line.", "Doubling the speed quadruples the centripetal acceleration."] },
              ],
            },
            {
              id: "physics-1.l.u2.circular-forces",
              title: "Forces in circular motion",
              summary: "Some real force (or combination) must pull toward the center with net size mv²/r: friction on a curve, tension in a string, gravity in an orbit, normal force in a loop.",
              estMinutes: 18,
              skillIds: [S("circular-forces")],
              blocks: [
                { type: "text", md: r`Newton's second law applies to circular motion like anything else. The acceleration is $v^2/r$ toward the center, so the **net force** must point toward the center with size $mv^2/r$:` },
                { type: "formula", latex: r`F_{\text{net, toward center}} = \frac{mv^2}{r}`, caption: "Add the components of the real forces that point toward the center (positive) and away from it (negative)." },
                { type: "callout", tone: "key", title: "Centripetal is a role, not a force", md: r`Never draw a "centripetal force" arrow on a free-body diagram, and never draw an outward "centrifugal" force. Draw the real forces (gravity, normal, tension, friction), then ask which of them, or which combination, points toward the center. That combination *is* the centripetal force.

| Situation | What supplies the centripetal force |
|---|---|
| Car on a flat curve | Static friction from the road |
| Ball on a string in a horizontal circle | Tension |
| Satellite or Moon in orbit | Gravity |
| Rider at the bottom of a loop | Normal force minus gravity |` },
                { type: "check", questionId: Q("cfor-1"), lead: "Draw only real forces." },
                {
                  type: "worked_example",
                  title: "Maximum speed on a flat curve",
                  problem: r`A car rounds a flat curve of radius $50\,\text{m}$. The coefficient of static friction between tires and road is $0.70$. What is the fastest it can go without skidding?`,
                  steps: [
                    { title: "Who pulls inward?", md: r`Only static friction (the tires grip sideways). Vertically, $F_N = mg$.` },
                    { title: "Second law toward the center", md: r`At the limit, $\mu_s mg = \dfrac{mv^2}{r}$. The mass cancels: $v = \sqrt{\mu_s g r}$.` },
                    { title: "Numbers", md: r`$v = \sqrt{(0.70)(9.8)(50)} = \sqrt{343} = 18.5\,\text{m/s}$ (about $67\,\text{km/h}$).` },
                  ],
                  answer: r`$v_{\max} \approx 18.5\,\text{m/s}$`,
                },
                { type: "text", md: r`## Vertical circles

At the **bottom** of a loop or a dip, the center is above you. The normal force points up (toward the center) and gravity points down (away from it): $F_N - mg = \dfrac{mv^2}{r}$, so $F_N = mg + \dfrac{mv^2}{r}$: you feel heavier.

At the **top** of a loop (riding inside it, upside down), the center is below you, and both gravity and the track's normal force point down, toward the center: $F_N + mg = \dfrac{mv^2}{r}$. As the speed drops, $F_N$ shrinks; at the minimum speed $F_N = 0$ and gravity alone supplies the centripetal force: $v_{\min} = \sqrt{gr}$.

Riding **over** a hill crest (on top of it), the center is below you and the normal force points up, away from the center: $mg - F_N = \dfrac{mv^2}{r}$, so you feel lighter, and at high enough speed the car leaves the road.` },
                {
                  type: "worked_example",
                  title: "Top of a roller-coaster loop",
                  problem: r`A $50\,\text{kg}$ rider goes over the top of a vertical loop of radius $8.0\,\text{m}$, upside down, at $11\,\text{m/s}$. Find the normal force from the seat.`,
                  steps: [
                    { title: "Toward the center is down", md: r`Gravity $mg = 490\,\text{N}$ and $F_N$ both point down, toward the center.` },
                    { title: "Required net force", md: r`$\dfrac{mv^2}{r} = \dfrac{(50)(11)^2}{8.0} = 756\,\text{N}$.` },
                    { title: "Solve", md: r`$F_N + 490 = 756$, so $F_N = 266\,\text{N}$, down (the seat presses the rider toward the center).` },
                  ],
                  answer: r`$F_N \approx 270\,\text{N}$ toward the center`,
                },
                { type: "check", questionId: Q("cfor-2"), lead: "Tension in a horizontal circle." },
                { type: "text", md: r`## Orbits

A satellite in a circular orbit has just one force on it: gravity, pointing to the center of Earth. Setting $\dfrac{GMm}{r^2} = \dfrac{mv^2}{r}$ gives $v = \sqrt{\dfrac{GM}{r}}$, independent of the satellite's mass. The satellite is continuously falling toward Earth, but it moves sideways fast enough that the surface curves away beneath it just as fast.` },
                { type: "summary", points: [r`Circular motion needs a net inward force of $mv^2/r$, supplied by real forces.`, "Never add a separate centripetal or centrifugal force to a free-body diagram.", r`Flat curve: $\mu_s mg \ge mv^2/r$, so $v_{\max} = \sqrt{\mu_s g r}$.`, r`Bottom of a vertical circle: $F_N = mg + mv^2/r$; top (inside the loop): $F_N = mv^2/r - mg$, with $v_{\min} = \sqrt{gr}$.`, r`In a circular orbit gravity alone supplies the centripetal force: $v = \sqrt{GM/r}$.`] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: unit2Questions,

  assessments: [
    // ───────────── Topic exercises (learn, then practise) ─────────────
    {
      id: EX("locate-com"),
      kind: "exercise",
      title: "Locate the center of mass",
      description: "Find the center of mass of two or more objects, of symmetric shapes, and work backward to an unknown mass.",
      unitId: U2,
      topicId: T("systems"),
      questionIds: [Q("com-3"), Q("com-4"), Q("com-5"), Q("com-6"), Q("com-7"), Q("com-8"), Q("com-9"), Q("com-10")],
      config: practice(),
    },
    {
      id: EX("choose-system"),
      kind: "exercise",
      title: "Choose a system: internal and external forces",
      description: "Sort forces into internal and external and predict how a system's center of mass moves.",
      unitId: U2,
      topicId: T("systems"),
      questionIds: [Q("com-11"), Q("com-12"), Q("com-13"), Q("com-14"), Q("com-15"), Q("com-16"), Q("com-17"), Q("com-18")],
      config: practice(),
    },
    {
      id: EX("identify-forces"),
      kind: "exercise",
      title: "Identify the forces on an object",
      description: "Name every force acting on an object, with its agent, and leave out forces that are not there.",
      unitId: U2,
      topicId: T("forces"),
      questionIds: [Q("fbd-3"), Q("fbd-4"), Q("fbd-5"), Q("fbd-6"), Q("fbd-7"), Q("fbd-8"), Q("fbd-9"), Q("fbd-10")],
      config: practice(),
    },
    {
      id: EX("read-fbd"),
      kind: "exercise",
      title: "Draw and read free-body diagrams",
      description: "Use free-body diagrams to find net forces and normal forces, including angled pulls.",
      unitId: U2,
      topicId: T("forces"),
      questionIds: [Q("fbd-11"), Q("fbd-12"), Q("fbd-13"), Q("fbd-14"), Q("fbd-15"), Q("fbd-16"), Q("fbd-17"), Q("fbd-18")],
      config: practice(),
    },
    {
      id: EX("interaction-pairs"),
      kind: "exercise",
      title: "Find Newton's third-law pairs",
      description: "Identify interaction pairs, compare their sizes, and explain what different accelerations they cause.",
      unitId: U2,
      topicId: T("forces"),
      questionIds: [Q("n3-3"), Q("n3-4"), Q("n3-5"), Q("n3-6"), Q("n3-7"), Q("n3-8"), Q("n3-9"), Q("n3-10")],
      config: practice(),
    },
    {
      id: EX("first-law-reasoning"),
      kind: "exercise",
      title: "Reason with Newton's first law",
      description: "Decide when the net force is zero and explain motion with inertia rather than with a “force of motion”.",
      unitId: U2,
      topicId: T("first-law"),
      questionIds: [Q("eq-3"), Q("eq-4"), Q("eq-5"), Q("eq-6"), Q("eq-7"), Q("eq-8"), Q("eq-9"), Q("eq-10")],
      config: practice(),
    },
    {
      id: EX("solve-equilibrium"),
      kind: "exercise",
      title: "Solve equilibrium problems",
      description: "Find unknown tensions and forces by making the components in each direction sum to zero.",
      unitId: U2,
      topicId: T("first-law"),
      questionIds: [Q("eq-11"), Q("eq-12"), Q("eq-13"), Q("eq-14"), Q("eq-15"), Q("eq-16"), Q("eq-17"), Q("eq-18")],
      config: practice(),
    },
    {
      id: EX("net-force-acceleration"),
      kind: "exercise",
      title: "Find net force and acceleration",
      description: "Apply Newton's second law to single objects, including ropes, braking and the link to kinematics.",
      unitId: U2,
      topicId: T("second-law"),
      questionIds: [Q("n2-3"), Q("n2-4"), Q("n2-5"), Q("n2-6"), Q("n2-7"), Q("n2-8"), Q("n2-9"), Q("n2-10")],
      config: practice(),
    },
    {
      id: EX("connected-objects"),
      kind: "exercise",
      title: "Connected objects and Atwood machines",
      description: "Use the whole system for the shared acceleration and one object for the tension or contact force.",
      unitId: U2,
      topicId: T("second-law"),
      questionIds: [Q("conn-3"), Q("conn-4"), Q("conn-5"), Q("conn-6"), Q("conn-7"), Q("conn-8"), Q("conn-9"), Q("conn-10")],
      config: practice(),
    },
    {
      id: EX("inclines"),
      kind: "exercise",
      title: "Objects on frictionless inclines",
      description: "Resolve gravity along and into a ramp to find normal forces, accelerations, holding forces and speeds.",
      unitId: U2,
      topicId: T("second-law"),
      questionIds: [Q("inc-3"), Q("inc-4"), Q("inc-5"), Q("inc-6"), Q("inc-7"), Q("inc-8"), Q("inc-9"), Q("inc-10")],
      config: practice(),
    },
    {
      id: EX("universal-gravitation"),
      kind: "exercise",
      title: "Use universal gravitation",
      description: "Calculate gravitational forces and field strengths and scale them with mass and distance.",
      unitId: U2,
      topicId: T("gravity"),
      questionIds: [Q("grav-3"), Q("grav-4"), Q("grav-5"), Q("grav-6"), Q("grav-7"), Q("grav-8"), Q("grav-9"), Q("grav-10")],
      config: practice(),
    },
    {
      id: EX("elevators"),
      kind: "exercise",
      title: "Weight and apparent weight in elevators",
      description: "Compute weights and predict scale readings in accelerating elevators and in free fall.",
      unitId: U2,
      topicId: T("gravity"),
      questionIds: [Q("appw-3"), Q("appw-4"), Q("appw-5"), Q("appw-6"), Q("appw-7"), Q("appw-8"), Q("appw-9"), Q("appw-10")],
      config: practice(),
    },
    {
      id: EX("friction-level"),
      kind: "exercise",
      title: "Friction on a level surface",
      description: "Compute kinetic friction and the resulting acceleration or stopping distance, including angled pulls.",
      unitId: U2,
      topicId: T("friction"),
      questionIds: [Q("fric-3"), Q("fric-4"), Q("fric-5"), Q("fric-6"), Q("fric-7"), Q("fric-8"), Q("fric-9"), Q("fric-10")],
      config: practice(),
    },
    {
      id: EX("static-or-kinetic"),
      kind: "exercise",
      title: "Static or kinetic? Deciding whether things slide",
      description: "Test for sliding with μ_s N, find the actual static friction force, and handle friction on ramps.",
      unitId: U2,
      topicId: T("friction"),
      questionIds: [Q("fric-11"), Q("fric-12"), Q("fric-13"), Q("fric-14"), Q("fric-15"), Q("fric-16"), Q("fric-17"), Q("fric-18")],
      config: practice(),
    },
    {
      id: EX("hookes-law"),
      kind: "exercise",
      title: "Apply Hooke's law",
      description: "Relate spring force, stretch and spring constant, and keep stretch and length apart.",
      unitId: U2,
      topicId: T("springs"),
      questionIds: [Q("spr-3"), Q("spr-4"), Q("spr-5"), Q("spr-6"), Q("spr-7"), Q("spr-8"), Q("spr-9"), Q("spr-10")],
      config: practice(),
    },
    {
      id: EX("springs-in-systems"),
      kind: "exercise",
      title: "Springs in force problems",
      description: "Put spring forces on free-body diagrams with friction, ramps, elevators and accelerating carts.",
      unitId: U2,
      topicId: T("springs"),
      questionIds: [Q("spr-11"), Q("spr-12"), Q("spr-13"), Q("spr-14"), Q("spr-15"), Q("spr-16"), Q("spr-17"), Q("spr-18")],
      config: practice(),
    },
    {
      id: EX("centripetal-acceleration"),
      kind: "exercise",
      title: "Centripetal acceleration",
      description: "Find speeds and centripetal accelerations from radius and period, and reason about directions and scaling.",
      unitId: U2,
      topicId: T("circular"),
      questionIds: [Q("cac-3"), Q("cac-4"), Q("cac-5"), Q("cac-6"), Q("cac-7"), Q("cac-8"), Q("cac-9"), Q("cac-10")],
      config: practice(),
    },
    {
      id: EX("forces-in-circles"),
      kind: "exercise",
      title: "Find the force that keeps it turning",
      description: "Identify the real forces supplying the centripetal force on curves, strings, loops and orbits, and apply F = mv²/r.",
      unitId: U2,
      topicId: T("circular"),
      questionIds: [Q("cfor-3"), Q("cfor-4"), Q("cfor-5"), Q("cfor-6"), Q("cfor-7"), Q("cfor-8"), Q("cfor-9"), Q("cfor-10")],
      config: practice(),
    },

    // ───────────── Checkpoint quizzes ─────────────
    {
      id: "physics-1.quiz.u2.1",
      kind: "skill_quiz",
      title: "Quiz 1",
      description: "Eight questions on systems, free-body diagrams, Newton's third and first laws, and Newton's second law (single objects, connected objects and inclines). No hints.",
      unitId: U2,
      topicId: T("second-law"),
      questionIds: [Q("com-19"), Q("fbd-19"), Q("n3-11"), Q("eq-19"), Q("n2-11"), Q("n2-12"), Q("conn-11"), Q("inc-11")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 8 * 90 },
    },
    {
      id: "physics-1.quiz.u2.2",
      kind: "skill_quiz",
      title: "Quiz 2",
      description: "Eight questions on gravitation, apparent weight, friction, springs and uniform circular motion. No hints.",
      unitId: U2,
      topicId: T("circular"),
      questionIds: [Q("grav-11"), Q("appw-11"), Q("fric-19"), Q("fric-20"), Q("spr-19"), Q("cac-11"), Q("cfor-11"), Q("cfor-12")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 8 * 90 },
    },

    // ───────────── Unit test ─────────────
    {
      id: "physics-1.test.u2",
      kind: "unit_test",
      title: "Unit 2 test: force and translational dynamics",
      description: "Sixteen questions, 32 minutes, across the whole unit: systems, free-body diagrams, Newton's laws, connected objects and inclines, gravitation and apparent weight, friction, springs and circular motion.",
      unitId: U2,
      questionIds: [
        Q("com-20"), Q("fbd-20"), Q("n3-12"), Q("eq-20"), Q("n2-13"), Q("n2-14"), Q("conn-12"), Q("inc-12"),
        Q("grav-12"), Q("grav-13"), Q("appw-12"), Q("fric-21"), Q("fric-22"), Q("spr-20"), Q("cac-12"), Q("cfor-13"),
      ],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 32 * 60 },
    },

    // ───────────── Full-course practice ─────────────
    {
      id: "physics-1.exam.u2",
      kind: "exam_practice",
      title: "AP-style practice set: forces and Newton's laws",
      description: "Seven original multi-step AP-style items on dynamics under exam-like timing (2 minutes per question).",
      questionIds: [Q("eq-21"), Q("n2-15"), Q("conn-13"), Q("inc-13"), Q("appw-13"), Q("fric-23"), Q("cfor-14")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 14 * 60 },
    },
  ],
};
