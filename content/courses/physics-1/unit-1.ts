/**
 * AP Physics 1 — Unit 1: Kinematics (motion along a line, motion diagrams and
 * graphs, constant acceleration, free fall, motion data, vectors, relative
 * motion and projectile motion). Assembled into the course in ./index.ts.
 * Each topic teaches in lessons, then practises in exercises (pools of nine,
 * five per attempt); Quiz 1 and Quiz 2 close each half and the unit test ends
 * the unit. Ids that predate the exercises are live in databases: keep them.
 *
 * Original AceAP instructional content. Objective codes ("PHYS-1.C") are
 * AceAP's own and are not College Board codes. Algebra-based throughout;
 * g = 9.8 m/s², up positive, no air resistance unless a problem says otherwise.
 */
import type { UnitPart } from "./shared";
import { physicsQuestions } from "./unit-1.questions";

const r = String.raw;
const S = (id: string) => `physics-1.${id}`;
const Q = (id: string) => `physics-1.q.${id}`;
const M = (id: string) => `physics-1.m.${id}`;

/**
 * A topic exercise: a pool of `size` questions with ids physics-1.q.u1.<slug>-1 … -<size>, served five at a
 * time with immediate feedback and hints allowed.
 */
const EX = (slug: string, topicId: string, title: string, description: string, size = 9): UnitPart["assessments"][number] => ({
  id: `physics-1.ex.u1.${slug}`,
  kind: "exercise",
  title,
  description,
  unitId: "physics-1.u1",
  topicId,
  questionIds: Array.from({ length: size }, (_, i) => Q(`u1.${slug}-${i + 1}`)),
  config: { feedback: "immediate", assistance: "allowed", questionsPerAttempt: 5 },
});

export const unit1: UnitPart = {
  skills: [
    {
      id: S("position-displacement"),
      name: "Position and displacement",
      description: "Describe where an object is using an origin and a sign convention, and find its displacement as a signed change in position.",
      difficulty: 1,
      keywords: ["position", "displacement", "origin", "reference frame", "coordinate system", "sign convention", "delta x", "change in position", "negative position", "what is displacement"],
      patternLabels: { "compute-displacement": "Final minus initial", "final-position": "Finding the final position", "origin-shift": "Moving the origin", "sign-meaning": "What the signs mean", "position-table": "Reading a position table" },
    },
    {
      id: S("distance-vs-displacement"),
      name: "Distance vs displacement",
      description: "Tell the total distance travelled apart from the displacement, especially when an object reverses direction.",
      difficulty: 1,
      keywords: ["distance", "displacement", "difference between distance and displacement", "distance travelled", "path length", "round trip", "total distance", "net displacement", "scalar vs vector"],
      prerequisites: [S("position-displacement")],
      patternLabels: { "out-and-back": "Out-and-back trips", "total-distance": "Adding up distance", "net-displacement": "Net displacement of several legs", concept: "Comparing the two ideas", "sim-readout": "Motion Lab: distance travelled" },
    },
    {
      id: S("average-velocity-speed"),
      name: "Average velocity and average speed",
      description: "Calculate average velocity from displacement and average speed from distance, and explain why they can differ.",
      difficulty: 2,
      keywords: ["average velocity", "average speed", "difference between speed and velocity", "displacement over time", "distance over time", "total distance divided by total time", "average of two speeds", "round trip average velocity"],
      prerequisites: [S("distance-vs-displacement")],
      patternLabels: { "compute-average-velocity": "Average velocity from two positions", "compare-velocity-speed": "Velocity and speed for one trip", "distance-legs": "Legs of equal distance", "round-trip": "Round trips", "timed-legs": "Legs of given duration", "sim-readout": "Motion Lab: average speed" },
    },
    {
      id: S("velocity-sign-direction"),
      name: "Velocity: sign and direction",
      description: "Interpret instantaneous velocity, using its sign for direction and its magnitude for speed.",
      difficulty: 2,
      keywords: ["instantaneous velocity", "negative velocity", "what does negative velocity mean", "direction of motion", "speed is magnitude of velocity", "sign of velocity", "velocity at an instant"],
      prerequisites: [S("average-velocity-speed")],
      patternLabels: { "sign-meaning": "What the sign means", "compare-speeds": "Comparing speeds", "position-table": "Direction from a position table", "instantaneous-estimate": "Estimating instantaneous velocity", "describe-motion": "Describing the motion" },
    },
    {
      id: S("acceleration-concept"),
      name: "Acceleration",
      description: "Define acceleration as the rate of change of velocity, calculate it with signs and units, and recognise that it can be non-zero when velocity is zero.",
      difficulty: 2,
      keywords: ["acceleration", "change in velocity", "m/s^2", "metres per second squared", "rate of change of velocity", "acceleration at the top of a throw", "zero velocity zero acceleration", "delta v over delta t"],
      prerequisites: [S("velocity-sign-direction")],
      patternLabels: { "compute-acceleration": "Calculating acceleration", "zero-velocity": "Acceleration when velocity is zero", "direction-change": "Acceleration through a reversal", "meaning-units": "Meaning and units", rank: "Ranking accelerations", "velocity-table": "Reading a velocity table" },
    },
    {
      id: S("speeding-slowing"),
      name: "Speeding up or slowing down",
      description: "Decide whether an object is speeding up or slowing down by comparing the signs of its velocity and acceleration.",
      difficulty: 3,
      keywords: ["speeding up", "slowing down", "is negative acceleration slowing down", "deceleration", "signs of velocity and acceleration", "same sign opposite sign", "negative acceleration speeding up", "turnaround"],
      prerequisites: [S("acceleration-concept")],
      patternLabels: { "sign-analysis": "Comparing signs", classify: "Sorting the four cases", scenario: "Signs from a description", "time-interval": "When does it speed up?", "select-all": "Picking out slowing objects", "sim-readout": "Motion Lab: slowing down" },
    },
    {
      id: S("xt-graphs"),
      name: "Position–time graphs",
      description: "Read position from the height and velocity from the slope of a position–time graph, and match graph shapes to motions.",
      difficulty: 3,
      keywords: ["position time graph", "x-t graph", "slope of position time graph", "slope is velocity", "curved position graph", "horizontal line at rest", "reading motion graphs", "steeper means faster"],
      prerequisites: [S("velocity-sign-direction")],
      patternLabels: { "slope-value": "Velocity from the slope", "shape-to-motion": "Shape to motion", "compare-slopes": "Comparing segments", "curved-graph": "Curved graphs", "match-shapes": "Matching shapes" },
    },
    {
      id: S("vt-graphs"),
      name: "Velocity–time graphs",
      description: "Read velocity from the height, acceleration from the slope and displacement from the area of a velocity–time graph.",
      difficulty: 3,
      keywords: ["velocity time graph", "v-t graph", "area under velocity time graph", "slope of velocity time graph", "slope is acceleration", "area is displacement", "graph crosses the time axis", "negative area"],
      prerequisites: [S("acceleration-concept"), S("xt-graphs")],
      patternLabels: { "slope-acceleration": "Acceleration from the slope", "area-displacement": "Displacement from the area", "shape-to-motion": "Shape to motion", "area-below-axis": "Area below the axis", "axis-crossing": "Crossing the time axis", "interpret-all": "Reading everything from one graph", "trapezoid-area": "Areas of trapezoids", "final-position": "Final position from the area" },
    },
    {
      id: S("kinematic-equations"),
      name: "Constant-acceleration equations",
      description: "Choose and apply the three constant-acceleration equations, including turnaround points and free fall.",
      difficulty: 4,
      keywords: ["kinematic equations", "constant acceleration", "v = v0 + at", "x = x0 + v0 t + 1/2 a t^2", "v^2 = v0^2 + 2 a delta x", "which kinematic equation to use", "free fall", "g = 9.8", "stopping distance", "turnaround point", "thrown straight up"],
      prerequisites: [S("speeding-slowing"), S("vt-graphs")],
      patternLabels: { "velocity-time": "Velocity after a time", "position-time": "Position after a time", "stopping-distance": "Stopping distance", "free-fall": "Free fall", proportional: "Proportional reasoning", "choose-equation": "Choosing an equation", turnaround: "Motion Lab: turnaround", "sim-readout": "Motion Lab: position", "identify-knowns": "Listing the knowns", "leaves-out": "What each equation leaves out", "symbolic-solve": "Solving in symbols", "spot-the-error": "Spotting a wrong equation choice", "solution-routine": "The problem-solving routine", "time-to-speed": "Time to reach a speed", "find-acceleration": "Finding the acceleration", "average-velocity-method": "Displacement from the average velocity", "two-stage": "Two-stage motion", "turnaround-time": "When it turns around", "turnaround-position": "Where it turns around", "turnaround-distance": "Distance through a turnaround", "turnaround-reasoning": "Reasoning about a turnaround", meeting: "Catching up" },
    },
    {
      id: S("scalars-vectors"),
      name: "Scalars and vectors",
      description: "Tell scalar quantities (size only) from vector quantities (size and direction), and add vectors by drawing them head to tail, including the special cases of parallel and perpendicular vectors.",
      difficulty: 2,
      keywords: ["scalar", "vector", "magnitude", "direction", "resultant", "head to tail", "adding vectors", "vector addition", "perpendicular vectors", "pythagorean theorem", "negative of a vector", "is speed a vector"],
      prerequisites: [S("distance-vs-displacement")],
      patternLabels: { classify: "Scalar or vector?", "perpendicular-resultant": "Resultant of perpendicular vectors", "resultant-range": "Possible sizes of a resultant", "collinear-sum": "Adding vectors along a line", "head-to-tail": "Adding by drawing head to tail", "vector-algebra": "Negatives and multiples of vectors", "vector-difference": "Change in a vector", "resultant-direction": "Direction of a resultant" },
    },
    {
      id: S("vector-components"),
      name: "Vector components",
      description: "Resolve a vector into perpendicular components with sine and cosine, add vectors by components, and recover a magnitude and direction from components.",
      difficulty: 3,
      keywords: ["vector components", "x component", "y component", "resolving vectors", "sine and cosine", "adding vectors by components", "magnitude and direction", "inverse tangent", "horizontal component", "vertical component", "trigonometry"],
      prerequisites: [S("scalars-vectors")],
      patternLabels: { resolve: "Finding components", "component-signs": "Signs of components", "component-expression": "Components in symbols", "add-components": "Adding by components", "magnitude-direction": "Magnitude and direction from components", "magnitude-from-component": "Magnitude from one component", "missing-vector": "Finding a missing vector" },
    },
    {
      id: S("relative-velocity-1d"),
      name: "Reference frames and relative velocity in one dimension",
      description: "Describe motion from different reference frames and combine velocities along a line, such as walking on a moving walkway or one car seen from another.",
      difficulty: 2,
      keywords: ["reference frame", "frame of reference", "relative velocity", "relative motion", "moving walkway", "velocity relative to", "observer", "overtaking", "closing speed", "walking on a train"],
      prerequisites: [S("velocity-sign-direction")],
      patternLabels: { walkway: "Moving walkways", "opposite-directions": "Moving toward each other", "in-vehicle": "Walking inside a moving vehicle", "frame-concept": "Describing motion from different frames", "closing-time": "Time to meet or catch up", "same-direction": "Moving the same way", "upstream-downstream": "Up and back along a current" },
    },
    {
      id: S("relative-velocity-2d"),
      name: "Relative velocity in two dimensions",
      description: "Add perpendicular relative velocities as vectors for boats in a current and aircraft in a wind, including crossing times, downstream drift and aiming upstream.",
      difficulty: 3,
      keywords: ["river crossing", "boat and current", "airplane crosswind", "plane in wind", "ground speed", "airspeed", "heading", "drift downstream", "aim upstream", "relative velocity vectors"],
      prerequisites: [S("relative-velocity-1d"), S("vector-components")],
      patternLabels: { "river-resultant": "Speed relative to the shore", "crossing-time": "Time to cross", "downstream-drift": "Drift downstream", "heading-upstream": "Aiming to go straight across", "plane-wind": "Aircraft in a crosswind", "symbolic-crossing": "Crossing time in symbols", "current-effects": "What the current changes", "symbolic-drift": "Drift in symbols", "plane-heading": "Heading into a crosswind", "ground-direction": "Direction of travel over the ground" },
    },
    {
      id: S("projectile-horizontal"),
      name: "Horizontally launched projectiles",
      description: "Treat a projectile's horizontal and vertical motions independently, linked only by time, to find the time of flight, horizontal distance and landing velocity of a horizontal launch.",
      difficulty: 3,
      keywords: ["projectile motion", "horizontal launch", "thrown horizontally", "rolls off a table", "independence of horizontal and vertical motion", "time of flight", "horizontal distance", "dropped and thrown land together", "two dimensional motion"],
      prerequisites: [S("kinematic-equations"), S("vector-components")],
      patternLabels: { "dropped-vs-thrown": "Dropped vs launched", "time-from-height": "Time to fall", "horizontal-range": "How far it lands", "independence-concept": "Independent components", "landing-velocity": "Velocity at landing", "compare-launches": "Comparing two launches", symbolic: "Results in symbols", "launch-speed": "Working back to the launch speed", "component-table": "Reading a table of positions", "graph-shapes": "Shapes of component graphs" },
    },
    {
      id: S("projectile-angled"),
      name: "Projectiles launched at an angle",
      description: "Resolve an angled launch velocity into components and find the time to the top, maximum height, time of flight and range, recognising what is and is not zero at the top of the path.",
      difficulty: 4,
      keywords: ["projectile launched at an angle", "launch angle", "maximum height", "range", "time of flight", "top of the trajectory", "velocity at the top", "acceleration at the top", "complementary angles", "45 degrees maximum range"],
      prerequisites: [S("projectile-horizontal")],
      patternLabels: { "top-of-path": "At the top of the path", "time-to-top": "Time to the top", "max-height": "Maximum height", range: "Range on level ground", symmetry: "Symmetry of the flight", "launch-from-height": "Angled launch from a height", "compare-angles": "Comparing launch angles", "symbolic-flight": "Time of flight in symbols", "launch-components": "Resolving the launch velocity", "symbolic-height": "Maximum height in symbols", "graph-shapes": "Shapes of component graphs", "graph-slope": "Slopes of component graphs", "component-table": "Reading a table of components", "speed-graph": "Speed through the flight", "graph-area": "Height from the area under the vertical-velocity graph" },
    },
    {
      id: S("u1.motion-diagrams"),
      name: "Motion diagrams",
      description: "Read and build motion diagrams (dots at equal time intervals with velocity and acceleration arrows) and use them to tell constant velocity, speeding up, slowing down and turning around apart.",
      difficulty: 2,
      keywords: ["motion diagram", "dot diagram", "strobe diagram", "ticker tape", "equal time intervals", "velocity arrows", "acceleration arrow", "dots getting closer", "dots spreading out", "spacing of dots"],
      prerequisites: [S("acceleration-concept")],
      patternLabels: { "read-spacing": "Reading the dot spacing", "acceleration-arrow": "Direction of the acceleration arrow", turnaround: "Turning around", "spacing-to-acceleration": "Acceleration from the spacing", "match-description": "Matching a diagram to a description", "from-graph": "Motion diagram from a graph" },
    },
    {
      id: S("u1.graph-connections"),
      name: "Connecting position, velocity and acceleration graphs",
      description: "Translate one motion between its position–time, velocity–time and acceleration–time graphs using slopes (going down the chain) and areas (going up it).",
      difficulty: 3,
      keywords: ["acceleration time graph", "a-t graph", "sketch velocity graph from position graph", "connect motion graphs", "slope of position graph gives velocity graph", "area under acceleration graph", "change in velocity from area", "matching graphs of the same motion"],
      prerequisites: [S("xt-graphs"), S("vt-graphs")],
      patternLabels: { "xt-to-vt": "Position graph to velocity graph", "vt-to-at": "Velocity graph to acceleration graph", "at-to-dv": "Change in velocity from an acceleration graph", "match-graphs": "Matching graphs of the same motion", "vt-to-xt": "Velocity graph to position graph" },
    },
    {
      id: S("u1.free-fall-concepts"),
      name: "Free fall: reasoning",
      description: "Explain free fall as motion with only gravity acting: the same downward acceleration for every object, at every point of the flight, whether it is rising, at the top or falling.",
      difficulty: 2,
      keywords: ["free fall", "heavier objects fall faster", "acceleration due to gravity", "g = 9.8 m/s^2", "thrown up acceleration", "free fall on the way up", "feather and hammer", "air resistance", "symmetry of vertical throw"],
      prerequisites: [S("acceleration-concept")],
      patternLabels: { "same-acceleration": "Every mass falls alike", "accel-on-path": "Acceleration on the way up, at the top and down", signs: "Signs of velocity and acceleration", symmetry: "Symmetry of a vertical throw", "vt-graph": "Velocity–time graph of a vertical throw", "compare-objects": "Comparing two falling objects" },
    },
    {
      id: S("u1.free-fall-calculations"),
      name: "Free fall: calculations",
      description: "Apply the constant-acceleration equations with a = −9.8 m/s² (up positive) to drops, upward throws and downward throws, including objects launched from a height.",
      difficulty: 3,
      keywords: ["free fall problems", "dropped from a height", "how long to fall", "speed when it hits the ground", "maximum height of a throw", "thrown straight up", "thrown downward", "time in the air", "a = -9.8"],
      prerequisites: [S("u1.free-fall-concepts"), S("kinematic-equations")],
      patternLabels: { "drop-time": "Time to fall from rest", "drop-speed": "Speed after falling", "max-height": "Maximum height of a throw", "time-to-top": "Time to the top", "thrown-down": "Thrown downward", "launch-from-height": "Thrown from a height, landing below", symbolic: "Free fall in symbols", "position-at-time": "Position at a later time", "drop-distance": "Distance fallen in a given time" },
    },
    {
      id: S("u1.motion-data"),
      name: "Reading motion data tables",
      description: "Extract velocities and accelerations from tables of position or velocity against time, decide whether the velocity or acceleration is constant, and spot the pattern of position changes in equal time intervals.",
      difficulty: 3,
      keywords: ["data table", "position time data", "velocity from data", "acceleration from data", "first differences", "second differences", "constant acceleration test", "experimental data", "motion sensor", "photogate"],
      prerequisites: [S("average-velocity-speed"), S("acceleration-concept")],
      patternLabels: { "velocity-from-table": "Velocity from a position table", "constant-check": "Is it constant?", "acceleration-from-table": "Acceleration from data", "odd-number-spacing": "Spacing in equal intervals from rest", "fastest-interval": "Which interval is fastest?", "instantaneous-estimate": "Estimating velocity at an instant" },
    },
    {
      id: S("u1.linearization"),
      name: "Linearizing data and proportional reasoning",
      description: "Choose what to plot so that motion data fall on a straight line (for example position against time squared), interpret the slope and intercept physically, and predict how one quantity scales when another changes.",
      difficulty: 4,
      keywords: ["linearization", "linearize data", "x vs t squared", "plot against t^2", "slope gives acceleration", "best fit line", "proportional reasoning", "doubling the time", "scaling", "straight-line graph"],
      prerequisites: [S("u1.motion-data"), S("kinematic-equations")],
      patternLabels: { "choose-axes": "Choosing axes for a straight line", "slope-meaning": "What the slope means", "slope-to-a": "Acceleration from a slope", "proportional-scale": "Scaling with squares and roots", "intercept-meaning": "Reading slope and intercept" },
    },
  ],

  misconceptions: [
    { id: M("distance-is-displacement"), skillId: S("distance-vs-displacement"), title: "Treats distance and displacement as the same", description: "Reports the displacement when distance is asked (or the reverse), or assumes that zero displacement means nothing moved.", remediation: "Ask two separate questions. “How much ground was covered?” adds every leg and never cancels: that is distance. “Where did it end up relative to the start?” is final position minus initial position, with a sign: that is displacement. They match only when the object never turns around." },
    { id: M("speed-for-velocity"), skillId: S("average-velocity-speed"), title: "Mixes up average speed and average velocity (ignores direction)", description: "Uses total distance when average velocity is asked, uses displacement when average speed is asked, or drops the sign from a velocity.", remediation: "Average velocity = displacement ÷ time and keeps its sign. Average speed = distance ÷ time and is never negative. Before dividing, check which word the question uses and pick the matching numerator." },
    { id: M("average-of-speeds"), skillId: S("average-velocity-speed"), title: "Averages the speeds instead of using total over total", description: "Finds an average velocity or speed by taking the mean of the values for each leg, even when the legs last different amounts of time.", remediation: "An average rate is always a total divided by a total: find the whole displacement (or distance) and the whole time first. The mean of the leg values is only right when every leg lasts the same time." },
    { id: M("sign-direction"), skillId: S("position-displacement"), title: "Sign errors with direction", description: "Drops or flips a sign, subtracts initial and final values in the wrong order, or reads a sign as a size or a location instead of a direction.", remediation: "State the positive direction before you start and write every position, velocity and acceleration with its sign. Changes are always final minus initial. A sign on a velocity or displacement tells you a direction, not how big the quantity is or where the object is." },
    { id: M("negative-accel-slowing"), skillId: S("speeding-slowing"), title: "Believes negative acceleration always means slowing down", description: "Reads the sign of the acceleration alone as “speeding up” (positive) or “slowing down” (negative), without considering the direction of the velocity.", remediation: "Compare the signs of velocity and acceleration. Same signs: speeding up. Opposite signs: slowing down. A negative acceleration only means the velocity is becoming more negative, which speeds up an object that is already moving in the negative direction." },
    { id: M("zero-velocity-zero-accel"), skillId: S("acceleration-concept"), title: "Thinks zero velocity means zero acceleration", description: "Assumes that an object that is momentarily at rest (for example at the top of a throw or at a turnaround) has no acceleration.", remediation: "Acceleration is about how the velocity is changing, not what it currently is. At a turnaround the velocity passes through zero on its way from one sign to the other, so it is still changing. If the acceleration really were zero there, the object would stay at rest." },
    { id: M("height-as-velocity"), skillId: S("xt-graphs"), title: "Reads the height of a position–time graph as the velocity", description: "Takes a large position value to mean a large velocity, divides a single position by a single time, or looks for where the position is zero when the question is about where the velocity is zero.", remediation: "On a position–time graph the height is where the object is; the slope is how fast it is moving. Find velocity from two points: change in position divided by change in time. A flat section means at rest, however high it is." },
    { id: M("slope-area-mixup"), skillId: S("vt-graphs"), title: "Confuses slope and area on a velocity–time graph", description: "Reads the slope of a velocity–time graph as the displacement, or gives the area when the acceleration is asked.", remediation: "On a velocity–time graph: height is velocity, slope is acceleration, and the area between the line and the time axis is displacement. Check units: a slope is (m/s) ÷ s = m/s², an area is (m/s) × s = m." },
    { id: M("drops-half"), skillId: S("kinematic-equations"), title: "Drops the ½ in ½at²", description: "Writes the position equation with at² instead of ½at², or leaves out the factor of 2 in v² = v₀² + 2aΔx.", remediation: "The ½ comes from the triangle under the velocity–time graph: the extra velocity builds up from zero to at, so on average only half of it applies. Check a result with average velocity × time; if the two disagree by a factor of 2, the ½ has gone missing." },
    { id: M("scalar-vector-confusion"), skillId: S("scalars-vectors"), title: "Mixes up scalars and vectors", description: "Gives a direction to quantities such as speed, distance, time or mass, or treats velocity, displacement and acceleration as plain numbers whose direction can be dropped. Often decides by whether a quantity can be negative.", remediation: "Ask “does it make sense to say which way?” Displacement, velocity and acceleration need a direction to be complete: they are vectors. Distance, speed, time and mass are fully described by a size and a unit: they are scalars. A minus sign is not the test: a temperature can be negative and has no direction, and a magnitude is never negative." },
    { id: M("adds-magnitudes"), skillId: S("scalars-vectors"), title: "Adds vector magnitudes instead of combining the vectors", description: "Adds (or subtracts) the sizes of two vectors that do not point along the same line, for example giving 3 m + 4 m = 7 m for perpendicular displacements, or adds the speeds of a boat and a sideways current.", remediation: "Magnitudes only add directly when the vectors point the same way, and only subtract when they point in opposite directions. Otherwise draw the vectors head to tail, or split them into components, add the x-parts and the y-parts separately, and only then use the Pythagorean theorem. The resultant is always between the difference and the sum of the two magnitudes." },
    { id: M("sin-cos-swap"), skillId: S("vector-components"), title: "Mixes up sine and cosine for components", description: "Uses sine for the component next to the angle (or cosine for the one opposite it), assumes the x-component always uses cosine even when the angle is measured from the vertical, or inverts the tangent ratio when finding a direction.", remediation: "Sketch the right triangle and mark the angle. The side touching the angle (adjacent) is A cos θ; the side across from it (opposite) is A sin θ. Which one is “x” depends on where the angle is measured from, so decide from the sketch, not from habit. Check: a small angle above the horizontal should give a large horizontal component." },
    { id: M("absolute-velocity"), skillId: S("relative-velocity-1d"), title: "Thinks an object has one true velocity", description: "Believes the velocity measured from the ground is the “real” one and other observers are wrong, or that an object at rest relative to the ground is at rest for every observer.", remediation: "Every velocity is measured relative to a chosen reference frame, and observers moving relative to each other legitimately measure different velocities for the same object. The ground is a convenient frame, not a special one. Always say “relative to what” and write it in the subscript." },
    { id: M("relative-add-subtract"), skillId: S("relative-velocity-1d"), title: "Adds relative velocities when they should subtract (or the reverse)", description: "Adds speeds when the motions are in opposite directions relative to the frame, subtracts when they are in the same direction, or combines speeds by instinct instead of with signs.", remediation: "Choose a positive direction, give every velocity a sign, and chain the frames: (A relative to C) = (A relative to B) + (B relative to C). For object B seen from object A, subtract A's ground velocity from B's ground velocity. Let the signs decide whether the sizes add or subtract." },
    { id: M("current-changes-crossing-time"), skillId: S("relative-velocity-2d"), title: "Thinks a sideways current changes the time to cross", description: "Divides the river width by the boat's resultant speed relative to the shore, or expects a faster current to speed up or slow down a crossing made with the boat aimed straight across.", remediation: "Split the motion into the across-river direction and the along-river direction. Only the across component of the velocity carries the boat across, so the crossing time is width ÷ across speed. A current perpendicular to that direction only adds drift downstream: it changes where the boat lands, not when." },
    { id: M("horizontal-velocity-changes"), skillId: S("projectile-horizontal"), title: "Thinks a projectile's horizontal velocity changes during flight", description: "Expects the horizontal velocity of a projectile to die away (as in cartoons, where the object stops and then drops), to grow as it falls, or to be gone by the time it lands.", remediation: "With no air resistance nothing acts horizontally, so the horizontal acceleration is zero and the horizontal velocity is the same at every point of the flight, including the instant before landing. Only the vertical velocity changes, by 9.8 m/s downward each second." },
    { id: M("horizontal-speed-affects-fall"), skillId: S("projectile-horizontal"), title: "Thinks horizontal speed changes how long a projectile takes to fall", description: "Expects a faster horizontal launch to keep an object in the air longer (or to bring it down sooner) than an object dropped from the same height.", remediation: "The vertical motion knows nothing about the horizontal motion. Objects launched horizontally from the same height all start with zero vertical velocity and fall with the same acceleration, so they reach the ground at the same time. A faster launch only makes the object land farther away." },
    { id: M("wrong-launch-vy"), skillId: S("projectile-angled"), title: "Uses the wrong vertical launch velocity for an angled launch", description: "Treats an angled launch as if the vertical velocity started at zero (as it does for a horizontal launch), or uses the whole launch speed in place of its vertical component.", remediation: "Resolve the launch velocity first: v₀ₓ = v₀ cos θ and v₀ᵧ = v₀ sin θ for an angle θ above the horizontal. The vertical motion starts with v₀ᵧ, which is neither zero nor the full launch speed. Only a horizontal launch (θ = 0) has v₀ᵧ = 0." },
    { id: M("velocity-zero-at-top"), skillId: S("projectile-angled"), title: "Thinks a projectile's velocity is zero at the top of its path", description: "Says the projectile is momentarily at rest at its highest point, forgetting that only the vertical component of the velocity is zero there.", remediation: "At the top the vertical velocity is zero, which is why it stops rising. The horizontal velocity is unchanged, so the projectile is still moving sideways at v₀ cos θ. Its speed at the top is the smallest of the flight, but it is zero only for a launch straight up." },
    { id: M("accel-zero-at-top"), skillId: S("projectile-angled"), title: "Thinks a projectile's acceleration is zero at the top of its path", description: "Assumes that because the vertical velocity is zero at the highest point, gravity has stopped acting there or the acceleration has become zero.", remediation: "Gravity acts throughout the flight, so the acceleration is 9.8 m/s² downward at every point, including the top. The vertical velocity passes through zero there on its way from upward to downward; if the acceleration really were zero, the projectile would keep moving horizontally at that height forever." },
    { id: M("u1.accel-along-motion"), skillId: S("u1.motion-diagrams"), title: "Thinks acceleration always points in the direction of motion", description: "Draws the acceleration arrow on a motion diagram pointing the way the object moves, even when the dots are getting closer together (slowing down).", remediation: "The acceleration arrow points the way the velocity is changing. Compare two successive velocity arrows: if the later one is shorter, the change points backward, against the motion. Speeding up: acceleration along the motion. Slowing down: acceleration against it." },
    { id: M("u1.spacing-is-position"), skillId: S("u1.motion-diagrams"), title: "Reads dot spacing as position or as acceleration", description: "Takes widely spaced dots to mean the object is far from the origin, or takes equally spaced dots to mean the acceleration is large.", remediation: "Dots are taken at equal time intervals, so the gap between two dots is how far the object moves in one interval: it shows the speed. Equal gaps mean constant velocity (zero acceleration). Gaps that grow or shrink are what show acceleration." },
    { id: M("u1.graph-shape-copy"), skillId: S("u1.graph-connections"), title: "Copies the shape of one motion graph onto another", description: "Sketches a velocity–time graph that looks like the position–time graph (or an acceleration graph that looks like the velocity graph), instead of plotting its slope.", remediation: "Each graph down the chain is the slope of the one above it. Go through the first graph piece by piece and ask “how steep is it here, and which way does it slope?”, then plot that number. A straight sloping line becomes a flat line; a flat line becomes zero." },
    { id: M("u1.heavier-falls-faster"), skillId: S("u1.free-fall-concepts"), title: "Believes heavier objects fall faster", description: "Expects a heavier object to have a larger free-fall acceleration, to reach the ground sooner, or to land faster than a lighter one dropped from the same height, with air resistance negligible.", remediation: "With air resistance negligible, every object near Earth's surface falls with the same acceleration, 9.8 m/s² downward, whatever its mass. Dropped together from the same height, a bowling ball and a marble land together. Differences you see in everyday life (a feather, a sheet of paper) come from air resistance, not from mass." },
    { id: M("u1.free-fall-only-down"), skillId: S("u1.free-fall-concepts"), title: "Thinks free fall only applies to falling objects", description: "Believes an object thrown upward is not in free fall until it starts coming down, or that its acceleration is different (smaller, zero, or upward) while it rises.", remediation: "“Free fall” means gravity is the only thing acting, not “moving downward”. Once a ball leaves the hand it is in free fall on the way up, at the top and on the way down, and its acceleration is 9.8 m/s² downward throughout. On the way up that acceleration slows it; on the way down it speeds it up." },
    { id: M("u1.g-sign"), skillId: S("u1.free-fall-calculations"), title: "Uses the wrong sign for g", description: "Uses a = +9.8 m/s² while also taking up as positive (or mixes conventions within one problem), so a rising ball speeds up or a dropped ball moves upward.", remediation: "Pick a positive direction first. With up positive, a = −9.8 m/s² for the whole flight, an upward velocity is positive and a downward displacement is negative. Check your answer: a ball thrown up must slow down while it rises." },
    { id: M("u1.values-not-differences"), skillId: S("u1.motion-data"), title: "Uses table values instead of changes between them", description: "Divides a single position by a single time to get a velocity (or a single velocity by a time to get an acceleration), or judges acceleration from the positions themselves rather than from how the position changes between equal time intervals.", remediation: "Rates come from changes: velocity = (change in position) ÷ (change in time), acceleration = (change in velocity) ÷ (change in time). Make a column of differences between neighbouring rows. Constant first differences in position mean constant velocity; constant first differences in velocity (constant second differences in position) mean constant acceleration." },
    { id: M("u1.slope-equals-a"), skillId: S("u1.linearization"), title: "Takes the slope of x against t² as the acceleration", description: "Plots position against time squared for motion from rest and reports the slope as the acceleration, forgetting that x = ½at² makes the slope equal to ½a.", remediation: "Match the graph to the equation before reading the slope. For motion from rest, x = (½a)·t², which has the form y = (slope)·(horizontal quantity) with t² on the horizontal axis. So the slope is ½a and the acceleration is twice the slope." },
    { id: M("u1.linear-scaling"), skillId: S("u1.linearization"), title: "Scales a squared relationship as if it were linear", description: "Assumes that doubling the time doubles the distance fallen from rest, or that doubling the speed doubles the stopping distance, when the relationship involves a square.", remediation: "Write the relationship as a proportion first. Distance from rest grows with t², so doubling t multiplies the distance by 2² = 4. Stopping distance at constant deceleration grows with v₀², so doubling the speed quadruples it. A square root goes the other way: four times the height gives only twice the fall time." },
  ],

  units: [
    {
      id: "physics-1.u1",
      number: 1,
      title: "Kinematics",
      description: "Describing motion with position, velocity and acceleration: motion along a line and its graphs, constant acceleration and free fall, vectors, reference frames and relative motion, and projectile motion in two dimensions.",
      topics: [
        {
          id: "physics-1.u1.position-velocity",
          title: "Position, displacement and velocity",
          description: "Say where an object is, how its position changes, and how fast and in which direction it moves.",
          objectives: [
            { id: "physics-1.o.1a", code: "PHYS-1.A", description: "Describe position and displacement along a line using an origin and a sign convention, and distinguish displacement from distance travelled.", skillIds: [S("position-displacement"), S("distance-vs-displacement")] },
            { id: "physics-1.o.1b", code: "PHYS-1.B", description: "Calculate and interpret average and instantaneous velocity, and distinguish velocity from speed.", skillIds: [S("average-velocity-speed"), S("velocity-sign-direction")] },
          ],
          lessons: [
            {
              id: "physics-1.l.position-displacement",
              title: "Position, displacement and distance",
              summary: "Set up a coordinate system, then separate two ideas that everyday language blurs together: how far you travelled and how much your position changed.",
              estMinutes: 12,
              skillIds: [S("position-displacement"), S("distance-vs-displacement")],
              blocks: [
                { type: "text", md: r`Kinematics is the part of physics that **describes** motion: where something is, how fast it is going, and how that is changing. It does not yet ask *why* things move; that comes with forces.

In this unit everything moves along a single straight line, so one number with a sign is enough to say where an object is. But "where" only means something once you have said **relative to what**.` },
                { type: "definition", term: "Position", md: r`An object's location along the line, written $x$ and measured from a chosen **origin** (the point where $x = 0$). The sign of $x$ says which side of the origin the object is on: positive on the side you chose as the positive direction, negative on the other side.` },
                { type: "callout", tone: "key", title: "You choose the coordinate system", md: r`Every one-dimensional problem starts with two choices:

1. **Where is the origin?** A doorway, the starting line, the ground: anywhere convenient.
2. **Which direction is positive?** Right, east, up: again, your call.

Nature does not make these choices for you, and the physics comes out the same whichever you pick. What matters is that you **state** them and then **stick with them** for the whole problem.` },
                { type: "text", md: r`For example, put the origin at a mailbox and call east positive. A dog standing $3\,\text{m}$ west of the mailbox is at $x = -3\,\text{m}$. A bike parked $9\,\text{m}$ east of it is at $x = +9\,\text{m}$. The minus sign is not "less than nothing"; it is a label meaning "on the west side".` },
                { type: "definition", term: "Displacement", md: r`The **change** in an object's position, written $\Delta x$ (say "delta x"). It has a size and a sign: the sign gives the direction of the change. The symbol $\Delta$ always means *final value minus initial value*.` },
                { type: "formula", latex: r`\Delta x = x_f - x_i`, caption: "Displacement: final position minus initial position. Positive means a net move in the positive direction." },
                {
                  type: "worked_example",
                  title: "A dog on the sidewalk",
                  problem: r`Origin at a mailbox, east positive. A dog starts $3\,\text{m}$ west of the mailbox, trots to a point $9\,\text{m}$ east of it, then comes back to a point $4\,\text{m}$ east of it. Find (a) the displacement for each leg, (b) the displacement for the whole trip, and (c) the total distance travelled.`,
                  steps: [
                    { title: "Write the positions with signs", md: r`Start: $x = -3\,\text{m}$. Turning point: $x = +9\,\text{m}$. End: $x = +4\,\text{m}$.` },
                    { title: "(a) Each leg: final minus initial", md: r`Leg 1: $\Delta x = 9\,\text{m} - (-3\,\text{m}) = +12\,\text{m}$ (eastward). Leg 2: $\Delta x = 4\,\text{m} - 9\,\text{m} = -5\,\text{m}$ (westward).` },
                    { title: "(b) Whole trip", md: r`Only the very first and very last positions matter: $\Delta x = 4\,\text{m} - (-3\,\text{m}) = +7\,\text{m}$. The legs agree: $(+12\,\text{m}) + (-5\,\text{m}) = +7\,\text{m}$.` },
                    { title: "(c) Distance", md: r`Distance counts every metre of ground covered, whichever way it points: $12\,\text{m} + 5\,\text{m} = 17\,\text{m}$.` },
                    { title: "Compare", md: r`The dog covered $17\,\text{m}$ of ground but ended only $7\,\text{m}$ east of where it started. The $5\,\text{m}$ of backtracking **added** to the distance and **subtracted** from the displacement.` },
                  ],
                  answer: r`(a) $+12\,\text{m}$ and $-5\,\text{m}$; (b) $+7\,\text{m}$; (c) $17\,\text{m}$`,
                },
                { type: "check", questionId: Q("pd-1"), lead: "Try one: final minus initial." },
                { type: "definition", term: "Distance travelled", md: r`The total length of the path an object actually covers. It has no direction and is never negative: every leg adds, none cancel.` },
                { type: "text", md: r`## Two different questions

| | Displacement $\Delta x$ | Distance travelled |
|---|---|---|
| What it answers | How did the position change, start to end? | How much ground was covered? |
| Can it be negative? | Yes: the sign is the direction | No: it only ever adds up |
| Depends on the route taken? | No: only on the start and end positions | Yes: every metre counts |
| For a round trip back to the start | Zero | Twice the one-way length |` },
                { type: "callout", tone: "warning", title: "They only match when there is no turning back", md: r`If an object moves in one direction the whole time, the distance equals the size of the displacement. The moment it reverses, they part company: distance keeps growing while displacement shrinks.

So "the displacement is zero" does **not** mean "nothing moved". A lap of a pool, a trip to the shop and back, a ball thrown up and caught again: all have zero displacement and plenty of distance.` },
                { type: "check", questionId: Q("dd-1"), lead: "A round trip: what happens to each quantity?" },
                { type: "callout", tone: "tip", title: "Displacement does not care where the origin is", md: r`Move the origin and every position changes by the same amount, so the *difference* between two positions stays the same. In the dog example, an observer who puts the origin at the dog's starting point records positions of $0$, $+12\,\text{m}$ and $+7\,\text{m}$: different positions, the same displacements.` },
                { type: "note_prompt", prompt: "Explain the difference between distance and displacement in your own words, with one example of your own where they are not equal.", suggestedTitle: "Distance vs displacement", starter: "**Displacement** = final position − initial position (has a sign).\n**Distance** = total ground covered (never negative).\n\nMy example where they differ: \n\nLinks: [[Position and displacement]] [[Distance vs displacement]]" },
                { type: "summary", points: [r`Position $x$ is measured from an origin you choose; its sign says which side of the origin.`, r`Displacement is the change in position, $\Delta x = x_f - x_i$; its sign says which way the position changed.`, "Distance travelled adds up every leg of the path and is never negative.", "Distance equals the size of the displacement only if the object never reverses; otherwise the distance is larger.", "Changing the origin changes positions but not displacements."] },
              ],
            },
            {
              id: "physics-1.l.velocity",
              title: "Velocity: how fast and which way",
              summary: "Average velocity versus average speed, what velocity at an instant means, and how to see velocity as the slope of a position–time graph.",
              estMinutes: 14,
              skillIds: [S("average-velocity-speed"), S("velocity-sign-direction")],
              blocks: [
                { type: "text", md: r`Position tells you where an object is. The next question is how quickly that position is changing, and in which direction. Physics has two words for "how fast", and they are built from the two quantities in the last lesson:

- **velocity** is built from **displacement**, so it has a direction (a sign);
- **speed** is built from **distance**, so it does not.` },
                { type: "definition", term: "Average velocity", md: r`Displacement divided by the time it took. It has the same sign as the displacement, so it tells you the overall direction of the motion as well as the rate.` },
                { type: "formula", latex: r`v_{\text{avg}} = \frac{\Delta x}{\Delta t} = \frac{x_f - x_i}{t_f - t_i}`, caption: "Average velocity, in metres per second (m/s)." },
                { type: "definition", term: "Average speed", md: r`Total distance travelled divided by the time it took. It is never negative and says nothing about direction.` },
                {
                  type: "worked_example",
                  title: "Out and part of the way back",
                  problem: r`A skater on a straight path (east positive) starts at $x = 0$. She skates to $x = 60\,\text{m}$ in $12\,\text{s}$, then turns and skates back to $x = 20\,\text{m}$ in the next $8\,\text{s}$. Find her average velocity and her average speed for the whole $20\,\text{s}$.`,
                  steps: [
                    { title: "Displacement", md: r`$\Delta x = x_f - x_i = 20\,\text{m} - 0 = +20\,\text{m}$.` },
                    { title: "Average velocity", md: r`$v_{\text{avg}} = \dfrac{\Delta x}{\Delta t} = \dfrac{+20\,\text{m}}{20\,\text{s}} = +1.0\,\text{m/s}$ (eastward).` },
                    { title: "Distance", md: r`Out: $60\,\text{m}$. Back: $60\,\text{m} - 20\,\text{m} = 40\,\text{m}$. Total: $100\,\text{m}$.` },
                    { title: "Average speed", md: r`$\dfrac{100\,\text{m}}{20\,\text{s}} = 5.0\,\text{m/s}$.` },
                    { title: "Make sense of it", md: r`Leg by leg her velocity was $\dfrac{+60\,\text{m}}{12\,\text{s}} = +5\,\text{m/s}$ and then $\dfrac{-40\,\text{m}}{8\,\text{s}} = -5\,\text{m/s}$: she skated at $5\,\text{m/s}$ the whole time. Her average *speed* reports that. Her average *velocity* is much smaller because the trip back undid most of the trip out.` },
                  ],
                  answer: r`Average velocity $+1.0\,\text{m/s}$; average speed $5.0\,\text{m/s}$`,
                },
                { type: "check", questionId: Q("avs-1"), lead: "Keep the sign." },
                { type: "callout", tone: "warning", title: "An average is a total over a total", md: r`It is tempting to find an average velocity by averaging the velocities of each leg. That only works if every leg lasts the same **time**.

Suppose a cart rolls $100\,\text{m}$ at $2\,\text{m/s}$ and then another $100\,\text{m}$ at $10\,\text{m/s}$, in the same direction. The first leg takes $50\,\text{s}$ and the second only $10\,\text{s}$, so

$$v_{\text{avg}} = \frac{200\,\text{m}}{60\,\text{s}} \approx 3.3\,\text{m/s}$$

not the "obvious" $6\,\text{m/s}$. The cart spends most of its time going slowly, so the slow leg counts for more.` },
                { type: "definition", term: "Instantaneous velocity", md: r`The velocity at a single instant: what a speedometer with a direction arrow would read at that moment. It is the value the average velocity settles toward as the time interval around that instant is made shorter and shorter. From here on, "velocity" on its own, written $v$, means instantaneous velocity. **Speed** is its magnitude.` },
                { type: "text", md: r`## The sign is the direction

| Velocity | Meaning |
|---|---|
| $v > 0$ | moving in the positive direction |
| $v < 0$ | moving in the negative direction |
| $v = 0$ | at rest at that instant |

Two things the sign of a velocity does **not** tell you:

- **where the object is**: an object at a positive position can have a negative velocity (it is heading back toward the origin);
- **how big the velocity is**: $-5\,\text{m/s}$ is *faster* than $+3\,\text{m/s}$. Compare speeds using magnitudes.` },
                { type: "check", questionId: Q("vsd-1") },
                { type: "text", md: r`## Velocity is the slope of a position–time graph

Plot position on the vertical axis and time on the horizontal axis. Between any two points on the graph, "rise over run" is $\dfrac{\Delta x}{\Delta t}$, which is exactly the average velocity. So:

- a **straight line** means constant velocity, equal to its slope;
- a **steeper** line means a faster object;
- a line sloping **downward** means a negative velocity;
- a **horizontal** line means the object is at rest.

If the graph is a curve, the velocity is changing. The instantaneous velocity at one moment is the slope of the curve at that point: the slope of the straight line that just touches the curve there.` },
                { type: "callout", tone: "info", title: "Looking ahead (not needed for AP Physics 1)", md: r`If you go on to calculus, you will meet this "slope at a single point" idea again under the name *derivative*. In this course, slopes of graphs and short time intervals are all you need.` },
                { type: "check", questionId: Q("xt-1"), lead: "Find a velocity from two points on a graph." },
                { type: "summary", points: [r`Average velocity $= \dfrac{\Delta x}{\Delta t}$: displacement over time, with a sign.`, "Average speed = distance ÷ time: never negative. For a trip with a reversal it is larger than the size of the average velocity.", "An average is a total over a total, not the mean of the leg values.", "The sign of a velocity is the direction of motion; its magnitude is the speed.", "On a position–time graph, velocity is the slope: steeper is faster, downward is negative, flat is at rest."] },
              ],
            },
          ],
        },
        {
          id: "physics-1.u1.acceleration-graphs",
          title: "Acceleration and motion graphs",
          description: "Describe how velocity changes, and read whole motions from position–time and velocity–time graphs.",
          objectives: [
            { id: "physics-1.o.1c", code: "PHYS-1.C", description: "Calculate and interpret acceleration, and determine from the signs of velocity and acceleration whether an object is speeding up or slowing down.", skillIds: [S("acceleration-concept"), S("speeding-slowing")] },
            { id: "physics-1.o.1d", code: "PHYS-1.D", description: "Interpret the height, slope and area of position–time and velocity–time graphs.", skillIds: [S("xt-graphs"), S("vt-graphs")] },
            { id: "physics-1.o.1i", code: "PHYS-1.E", description: "Represent one motion consistently with a motion diagram and with position–time, velocity–time and acceleration–time graphs, translating between them with slopes and areas.", skillIds: [S("u1.motion-diagrams"), S("u1.graph-connections")] },
          ],
          lessons: [
            {
              id: "physics-1.l.acceleration",
              title: "Acceleration: how velocity changes",
              summary: "What acceleration measures, what its sign does and does not mean, and why an object can have zero velocity without having zero acceleration.",
              estMinutes: 15,
              skillIds: [S("acceleration-concept"), S("speeding-slowing")],
              blocks: [
                { type: "text", md: r`Velocity describes how position changes. **Acceleration** describes how velocity changes.

In everyday speech "accelerate" means "speed up". In physics it is broader: an object accelerates whenever its velocity changes at all. Speeding up, slowing down and reversing direction are all accelerations.` },
                { type: "definition", term: "Acceleration", md: r`The rate at which velocity changes: the change in velocity divided by the time over which it happens. Like velocity, it has a sign.` },
                { type: "formula", latex: r`a_{\text{avg}} = \frac{\Delta v}{\Delta t} = \frac{v_f - v_i}{t_f - t_i}`, caption: "Average acceleration. When the acceleration is constant, this is the acceleration at every instant." },
                { type: "text", md: r`## Reading the unit

Dividing a velocity (m/s) by a time (s) gives metres per second **per second**, written $\text{m/s}^2$. An acceleration of $3\,\text{m/s}^2$ means: *each second, the velocity changes by $3\,\text{m/s}$.*

| $t$ (s) | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| $v$ (m/s) | 2 | 5 | 8 | 11 |

The velocity climbs by the same $3\,\text{m/s}$ in every second. That steady climb *is* the acceleration.` },
                {
                  type: "worked_example",
                  title: "Acceleration through a reversal",
                  problem: r`A cart on a track (right is positive) is moving at $+12\,\text{m/s}$. After $4.0\,\text{s}$ of constant acceleration its velocity is $-4\,\text{m/s}$. Find the acceleration and describe the motion.`,
                  steps: [
                    { title: "Change in velocity, with signs", md: r`$\Delta v = v_f - v_i = (-4\,\text{m/s}) - (+12\,\text{m/s}) = -16\,\text{m/s}$.` },
                    { title: "Divide by the time", md: r`$a = \dfrac{\Delta v}{\Delta t} = \dfrac{-16\,\text{m/s}}{4.0\,\text{s}} = -4.0\,\text{m/s}^2$.` },
                    { title: "Check second by second", md: r`Dropping by $4\,\text{m/s}$ each second: $+12 \to +8 \to +4 \to 0 \to -4\,\text{m/s}$. ✓` },
                    { title: "Describe it", md: r`For the first $3\,\text{s}$ the cart moves right and slows down. At $t = 3\,\text{s}$ it is at rest for an instant. In the last second it moves left and speeds up. The acceleration is $-4.0\,\text{m/s}^2$ **the whole time**, including the instant the cart is at rest.` },
                  ],
                  answer: r`$a = -4.0\,\text{m/s}^2$`,
                },
                { type: "check", questionId: Q("ac-1") },
                { type: "text", md: r`## Speeding up or slowing down? Compare the signs

The worked example shows one acceleration, $-4.0\,\text{m/s}^2$, first slowing the cart and then speeding it up. So the sign of the acceleration alone cannot tell you which is happening. You need the sign of the velocity too.

| Velocity | Acceleration | What the object is doing |
|---|---|---|
| $+$ | $+$ | moving in the positive direction, **speeding up** |
| $+$ | $-$ | moving in the positive direction, **slowing down** |
| $-$ | $-$ | moving in the negative direction, **speeding up** |
| $-$ | $+$ | moving in the negative direction, **slowing down** |

**Same signs: speeding up. Opposite signs: slowing down.** An acceleration in the direction of motion pushes the speed up; an acceleration against the motion brings it down.` },
                { type: "callout", tone: "warning", title: "Negative acceleration does not mean slowing down", md: r`A negative acceleration means only that the velocity is becoming **more negative** (or less positive). For an object already moving in the negative direction, that makes it *faster*: $-8\,\text{m/s}$ becomes $-10\,\text{m/s}$.

Likewise, a car heading in the negative direction and braking has a **positive** acceleration. The everyday word "deceleration" hides all of this, so it is safer to avoid it and talk about the signs of $v$ and $a$ instead.` },
                { type: "check", questionId: Q("ss-1"), lead: "Both signs negative: what is the speed doing?" },
                {
                  type: "simulation",
                  simId: "motion-lab",
                  title: "Watch the signs of v and a",
                  params: { x0: 0, v0: 8, a: -2, duration: 8 },
                  explore: [
                    r`Press play and watch the velocity readout. For the first $4\,\text{s}$, $v$ is positive and $a$ is negative. Is the object speeding up or slowing down?`,
                    r`After $t = 4\,\text{s}$ the velocity is negative and the acceleration is *still* $-2\,\text{m/s}^2$. What is happening to the speed now?`,
                    r`Predict first, then test: with $v_0 = -8\,\text{m/s}$ and $a = +2\,\text{m/s}^2$, during which seconds will the object be slowing down?`,
                  ],
                },
                { type: "callout", tone: "key", title: "Zero velocity is not zero acceleration", md: r`Throw a ball straight up. At the top it stops for an instant: $v = 0$. Is its acceleration zero there?

No. Just before the top its velocity is slightly upward; just after, slightly downward. The velocity is **changing** as it passes through zero, at the same rate as during the rest of the flight ($9.8\,\text{m/s}$ every second, downward). If the acceleration really were zero at the top, the velocity would stay zero and the ball would hang in the air.

Velocity answers "how fast is the position changing?" Acceleration answers "how fast is the *velocity* changing?" One can be zero while the other is not.` },
                { type: "check", questionId: Q("ac-2") },
                { type: "text", md: r`## Acceleration is the slope of a velocity–time graph

Plot velocity against time and "rise over run" is $\dfrac{\Delta v}{\Delta t}$: the acceleration. A straight, sloping velocity–time graph means constant acceleration; a horizontal one means zero acceleration (constant velocity). The next lesson puts this to work.` },
                { type: "tutor_prompt", prompts: ["How can an object have a negative acceleration and still be speeding up?", "Why isn't the acceleration zero at the top of a throw?", "Give me a real-life example of slowing down with a positive acceleration."] },
                { type: "summary", points: [r`Acceleration is the rate of change of velocity: $a = \dfrac{\Delta v}{\Delta t}$, in $\text{m/s}^2$ (metres per second, per second).`, "The sign of the acceleration is the direction in which the velocity is changing, not the direction of motion.", "Same signs of v and a: speeding up. Opposite signs: slowing down.", "A negative acceleration speeds up an object that is moving in the negative direction.", "At a turnaround the velocity is zero for an instant but the acceleration is not."] },
              ],
            },
            {
              id: "physics-1.l.motion-graphs",
              title: "Reading motion graphs",
              summary: "Height, slope and area: what each one means on a position–time graph and on a velocity–time graph.",
              estMinutes: 16,
              skillIds: [S("xt-graphs"), S("vt-graphs")],
              blocks: [
                { type: "text", md: r`A motion graph packs an entire trip into one picture. Reading one comes down to two habits:

1. **Check the vertical axis first.** Is this a graph of position or of velocity? The same shape means completely different things on each.
2. **Decide what the question needs**: a *height* (read a value), a *slope* (a rate of change) or an *area*.` },
                { type: "text", md: r`## Position–time graphs

| Feature of the graph | What it tells you |
|---|---|
| Height at some time | Position at that time |
| Slope | Velocity |
| Straight sloping line | Constant velocity |
| Horizontal line | At rest |
| Curve getting steeper | Speeding up |
| Curve flattening out | Slowing down |` },
                { type: "callout", tone: "warning", title: "A graph is not a picture of the path", md: r`A position–time graph that rises and then falls is not a hill. The object is on a straight track the whole time: it moved in the positive direction, then came back.

And **high is not fast**. A point high on a position–time graph means the object is far from the origin on the positive side. How fast it is moving depends only on how steep the graph is there. A flat stretch at the very top of the graph is an object standing still.` },
                {
                  type: "worked_example",
                  title: "Reading a position–time graph",
                  problem: r`A position–time graph has three straight segments: A from $(0\,\text{s},\ 0\,\text{m})$ to $(4\,\text{s},\ 12\,\text{m})$; B from $(4\,\text{s},\ 12\,\text{m})$ to $(7\,\text{s},\ 12\,\text{m})$; C from $(7\,\text{s},\ 12\,\text{m})$ to $(10\,\text{s},\ -3\,\text{m})$. Find the velocity in each segment, then the displacement and the distance for the whole $10\,\text{s}$.`,
                  steps: [
                    { title: "Segment A", md: r`Slope $= \dfrac{12\,\text{m} - 0\,\text{m}}{4\,\text{s} - 0\,\text{s}} = +3\,\text{m/s}$.` },
                    { title: "Segment B", md: r`Slope $= \dfrac{12\,\text{m} - 12\,\text{m}}{7\,\text{s} - 4\,\text{s}} = 0$. The object is at rest at $x = 12\,\text{m}$.` },
                    { title: "Segment C", md: r`Slope $= \dfrac{-3\,\text{m} - 12\,\text{m}}{10\,\text{s} - 7\,\text{s}} = \dfrac{-15\,\text{m}}{3\,\text{s}} = -5\,\text{m/s}$.` },
                    { title: "Displacement and distance", md: r`Displacement: $x_f - x_i = -3\,\text{m} - 0 = -3\,\text{m}$. Distance: $12\,\text{m}$ out plus $15\,\text{m}$ back $= 27\,\text{m}$.` },
                    { title: "Notice", md: r`The object is **fastest in segment C** ($5\,\text{m/s}$), where the graph is heading down, and it is not moving at all in segment B, where the graph is highest.` },
                  ],
                  answer: r`$+3\,\text{m/s}$, $0$, $-5\,\text{m/s}$; displacement $-3\,\text{m}$; distance $27\,\text{m}$`,
                },
                { type: "check", questionId: Q("xt-2"), lead: "Height or slope?" },
                { type: "text", md: r`## Velocity–time graphs

| Feature of the graph | What it tells you |
|---|---|
| Height at some time | Velocity at that time (above the axis: positive direction; below: negative direction) |
| Slope | Acceleration |
| Horizontal line | Constant velocity (at rest only if the line lies *on* the time axis) |
| Line crossing the time axis | The object stops for an instant and reverses direction |
| Line moving away from the time axis | Speeding up |
| Line moving toward the time axis | Slowing down |
| Area between the line and the time axis | Displacement (area below the axis counts as negative) |` },
                { type: "callout", tone: "key", title: "Why area means displacement", md: r`At constant velocity, displacement is velocity times time: $\Delta x = v\,\Delta t$. On a velocity–time graph that is *height × width*: the area of a rectangle.

If the velocity changes, slice the time into thin strips. Over each thin strip the velocity is nearly constant, so each strip's area is the small displacement during that strip. Add the strips and you get the whole area, which is the whole displacement.

The units agree: $(\text{m/s}) \times \text{s} = \text{m}$. Compare the slope: $(\text{m/s}) \div \text{s} = \text{m/s}^2$, an acceleration.` },
                {
                  type: "worked_example",
                  title: "Slope and area from one line",
                  problem: r`A velocity–time graph is a straight line from $(0\,\text{s},\ 4\,\text{m/s})$ to $(6\,\text{s},\ 16\,\text{m/s})$. Find (a) the acceleration and (b) the displacement during the $6\,\text{s}$.`,
                  steps: [
                    { title: "(a) Slope", md: r`$a = \dfrac{\Delta v}{\Delta t} = \dfrac{16\,\text{m/s} - 4\,\text{m/s}}{6\,\text{s}} = 2\,\text{m/s}^2$.` },
                    { title: "(b) Split the area", md: r`Under the line is a rectangle ($6\,\text{s}$ wide, $4\,\text{m/s}$ high) with a triangle on top (base $6\,\text{s}$, height $16 - 4 = 12\,\text{m/s}$).` },
                    { title: "(b) Add the pieces", md: r`Rectangle: $(6\,\text{s})(4\,\text{m/s}) = 24\,\text{m}$. Triangle: $\tfrac12(6\,\text{s})(12\,\text{m/s}) = 36\,\text{m}$. Displacement $= 60\,\text{m}$.` },
                    { title: "Check", md: r`For a straight velocity–time line, the average velocity is midway between the start and end values: $\dfrac{4 + 16}{2} = 10\,\text{m/s}$. Then $10\,\text{m/s} \times 6\,\text{s} = 60\,\text{m}$. ✓` },
                  ],
                  answer: r`(a) $2\,\text{m/s}^2$; (b) $60\,\text{m}$`,
                },
                { type: "check", questionId: Q("vt-1"), lead: "Slope or area?" },
                {
                  type: "simulation",
                  simId: "motion-lab",
                  title: "Two graphs, one motion",
                  params: { x0: 0, v0: 2, a: 1, duration: 6 },
                  explore: [
                    "Drag the time scrubber and compare the steepness of the position–time graph with the velocity readout. What happens to the slope as the velocity grows?",
                    r`Scrub to $t = 4\,\text{s}$. The velocity–time line runs from $2\,\text{m/s}$ to $6\,\text{m/s}$. Work out the area under it, then compare with the displacement readout.`,
                    r`Set the acceleration to $0$. What shape does each graph take, and why?`,
                  ],
                },
                { type: "callout", tone: "tip", title: "When the line dips below the axis", md: r`Take a velocity–time line from $(0\,\text{s},\ 8\,\text{m/s})$ to $(6\,\text{s},\ -4\,\text{m/s})$. Its slope is $-2\,\text{m/s}^2$, so it crosses the time axis at $t = 4\,\text{s}$: the object reverses there.

- Area above the axis: $\tfrac12(4\,\text{s})(8\,\text{m/s}) = 16\,\text{m}$ (forward).
- Area below the axis: $\tfrac12(2\,\text{s})(4\,\text{m/s}) = 4\,\text{m}$ (backward).

**Displacement** subtracts the part below the axis: $16 - 4 = 12\,\text{m}$. **Distance** adds both: $16 + 4 = 20\,\text{m}$.` },
                { type: "check", questionId: Q("vt-2"), lead: "Now an area made of two pieces." },
                { type: "note_prompt", prompt: "Make yourself a two-column cheat sheet: for each graph type, what do the height, the slope and the area tell you?", suggestedTitle: "Motion graphs: height, slope, area", starter: "**Position–time graph**\n- height = \n- slope = \n\n**Velocity–time graph**\n- height = \n- slope = \n- area = \n\nThe mistake I am most likely to make: \n\nLinks: [[Position–time graphs]] [[Velocity–time graphs]]" },
                { type: "summary", points: ["Check the vertical axis before anything else: position or velocity?", "Position–time graph: height is position, slope is velocity. Flat means at rest; a curve means the velocity is changing.", "Velocity–time graph: height is velocity, slope is acceleration, area is displacement.", "Where a velocity–time line crosses the time axis the object reverses; area below the axis is negative displacement.", "High on a position–time graph does not mean fast, and a graph is never a picture of the path."] },
              ],
            },
            {
              id: "physics-1.l.u1.motion-diagrams",
              title: "Motion diagrams and linked graphs",
              summary: "Show a motion as dots and arrows, then move between position–time, velocity–time and acceleration–time graphs of the same motion using slopes and areas.",
              estMinutes: 15,
              skillIds: [S("u1.motion-diagrams"), S("u1.graph-connections")],
              blocks: [
                { type: "text", md: r`You now have several ways to show one motion: words, numbers in a table, equations and graphs. This lesson adds one more picture, the **motion diagram**, and then ties all the graphs together so you can start from any one of them and produce the others.

A physicist checks a solution by asking whether every representation tells the same story. If the motion diagram says "slowing down" and the velocity graph moves away from the axis, something is wrong.` },
                { type: "definition", term: "Motion diagram", md: r`A drawing of an object's position at **equal time intervals**, like the frames of a video laid on top of each other, with one dot per frame. Velocity arrows can be drawn at the dots, and a single acceleration arrow shows which way the velocity is changing.` },
                { type: "callout", tone: "key", title: "The gaps are the story", md: r`Because the dots are equally spaced in **time**, the gap between two neighbouring dots is how far the object moves in one interval: a big gap means fast, a small gap means slow.

- **Equal gaps**: constant velocity, zero acceleration.
- **Growing gaps**: speeding up.
- **Shrinking gaps**: slowing down.
- **Dots that bunch up and come back**: the object stops for an instant and turns around.

Where a dot sits on the page tells you its *position*. The gaps, and how they change, tell you about *velocity* and *acceleration*.` },
                { type: "text", md: r`## Velocity arrows and the acceleration arrow

At each dot draw a velocity arrow pointing the way the object moves, with a length that matches the gap there. Then compare two neighbouring velocity arrows: the acceleration points from the earlier arrow's tip toward the later arrow's tip, that is, in the direction of the **change** in velocity.

| Gaps | Velocity arrows | Acceleration arrow |
|---|---|---|
| equal | all the same length | none (zero) |
| growing | getting longer | same direction as the motion |
| shrinking | getting shorter | opposite to the motion |` },
                {
                  type: "worked_example",
                  title: "A cart rolling up a ramp and back",
                  problem: r`A cart is given a push up a straight ramp and released. A camera records its position every $0.5\,\text{s}$, with the positive direction up the ramp: $0$, $1.2$, $2.0$, $2.4$, $2.4$, $2.0$, $1.2$ and $0\,\text{m}$. Describe its motion diagram, its velocity arrows and its acceleration arrow, and say what happens between the 4th and 5th dots.`,
                  steps: [
                    { title: "Find the gaps", md: r`Going up: $1.2$, $0.8$, $0.4\,\text{m}$. Then $0$ between the two dots at $2.4\,\text{m}$. Coming back: $0.4$, $0.8$, $1.2\,\text{m}$ down the ramp.` },
                    { title: "Read the motion", md: r`Up the ramp the gaps shrink: the cart slows. Two dots almost on top of each other at $2.4\,\text{m}$: it reaches its highest point and turns around between them. Down the ramp the gaps grow: it speeds up.` },
                    { title: "Velocity arrows", md: "Going up they point up the ramp and get shorter; coming down they point down the ramp and get longer. Near the turnaround they are very short." },
                    { title: "Acceleration arrow", md: r`On the way up the velocity is shrinking, so the change points down the ramp. On the way down the velocity grows in the down-ramp direction, so the change again points down the ramp. One acceleration arrow, **down the ramp**, fits the whole trip, including the turnaround. The gaps change by $0.4\,\text{m}$ every interval, so the acceleration is constant.` },
                  ],
                  answer: "Slowing on the way up, turning around at 2.4 m, speeding up on the way down; acceleration down the ramp throughout.",
                },
                { type: "callout", tone: "warning", title: "The acceleration arrow is not the direction of motion", md: r`It is tempting to point the acceleration arrow the way the object moves. That is only right when the object is speeding up. A car braking as it drives east has its acceleration pointing **west**. Decide from the velocity arrows: is the later arrow longer or shorter than the earlier one?` },
                { type: "check", questionId: Q("u1.check-md-1"), lead: "Shrinking gaps: which way is the acceleration?" },
                { type: "check", questionId: Q("u1.check-md-2") },
                { type: "text", md: r`## One motion, three graphs

Each graph in the chain is the **slope** of the one above it, and each graph's **area** gives the change in the one above it:

| Start from | Its slope gives | Its area gives |
|---|---|---|
| position–time graph | velocity | (not used) |
| velocity–time graph | acceleration | displacement $\Delta x$ |
| acceleration–time graph | (not used) | change in velocity $\Delta v$ |

So to go **down** the chain (position → velocity → acceleration), measure slopes. To go **up** (acceleration → velocity → position), add up areas and start from a known value.` },
                { type: "formula", latex: r`\Delta v = \text{area under the } a\text{–}t \text{ graph} \qquad \Delta x = \text{area under the } v\text{–}t \text{ graph}`, caption: "Areas below the time axis count as negative." },
                {
                  type: "worked_example",
                  title: "From a velocity graph to the other two",
                  problem: r`A lift (up positive) starts from rest at the ground floor. Its velocity–time graph rises in a straight line to $2\,\text{m/s}$ at $t = 2\,\text{s}$, stays at $2\,\text{m/s}$ until $t = 8\,\text{s}$, then falls in a straight line to $0$ at $t = 10\,\text{s}$. Describe its acceleration–time and position–time graphs.`,
                  steps: [
                    { title: "Slopes give the acceleration graph", md: r`$0$ to $2\,\text{s}$: slope $\dfrac{2}{2} = +1\,\text{m/s}^2$. $2$ to $8\,\text{s}$: slope $0$. $8$ to $10\,\text{s}$: slope $\dfrac{-2}{2} = -1\,\text{m/s}^2$. The acceleration–time graph is three flat steps: $+1$, $0$, $-1\,\text{m/s}^2$.` },
                    { title: "Areas give the positions", md: r`$0$–$2\,\text{s}$: triangle $\tfrac12(2)(2) = 2\,\text{m}$. $2$–$8\,\text{s}$: rectangle $(6)(2) = 12\,\text{m}$. $8$–$10\,\text{s}$: triangle $2\,\text{m}$. The lift ends $16\,\text{m}$ up.` },
                    { title: "Shape of the position graph", md: r`It starts flat and curves upward (speeding up) to $x = 2\,\text{m}$ at $2\,\text{s}$, rises in a straight line to $14\,\text{m}$ at $8\,\text{s}$ (constant velocity), then curves over and levels off at $16\,\text{m}$ (slowing to a stop).` },
                  ],
                  answer: r`$a$–$t$: steps of $+1$, $0$, $-1\,\text{m/s}^2$; $x$–$t$: curve up, straight line, curve over, ending at $16\,\text{m}$`,
                },
                { type: "callout", tone: "warning", title: "Don't copy the shape", md: r`A rising straight line on a position graph does **not** become a rising line on the velocity graph: its slope is constant, so the velocity graph is **flat**. Work through the first graph one piece at a time and ask "how steep is it here, and which way?" Plot that number, not the height.` },
                { type: "check", questionId: Q("u1.check-gc-1"), lead: "Slope, not shape." },
                { type: "check", questionId: Q("u1.check-gc-2"), lead: "Now go up the chain with an area." },
                { type: "summary", points: ["A motion diagram shows positions at equal time intervals; the gaps show speed and how they change shows acceleration.", "Equal gaps: constant velocity. Growing gaps: speeding up. Shrinking gaps: slowing down.", "The acceleration arrow points the way the velocity is changing: along the motion when speeding up, against it when slowing down.", "Down the chain x → v → a, take slopes; up the chain a → v → x, add areas to a known starting value.", "Area under an acceleration–time graph is the change in velocity; area under a velocity–time graph is the displacement."] },
              ],
            },
          ],
        },
        {
          id: "physics-1.u1.constant-acceleration",
          title: "Constant-acceleration motion",
          description: "Three equations that predict position and velocity whenever the acceleration is constant, including free fall.",
          objectives: [
            { id: "physics-1.o.1e", code: "PHYS-1.F", description: "Select and apply the constant-acceleration equations to predict position, velocity and time for motion along a line, including free fall.", skillIds: [S("kinematic-equations")] },
          ],
          lessons: [
            {
              id: "physics-1.l.kinematic-equations",
              title: "The constant-acceleration equations",
              summary: "Where the three kinematic equations come from, how to choose between them, and how to handle turnarounds and free fall with signs.",
              estMinutes: 18,
              skillIds: [S("kinematic-equations")],
              blocks: [
                { type: "text", md: r`When the acceleration is **constant**, the velocity–time graph is a straight line. Everything in this lesson follows from that one picture: the line's *slope* gives one equation, the *area* under it gives another, and combining the two gives a third.

Notation: $x_0$ and $v_0$ are the position and velocity at $t = 0$; $x$ and $v$ are the position and velocity at a later time $t$; $a$ is the constant acceleration; and $\Delta x = x - x_0$.` },
                { type: "formula", latex: r`v = v_0 + at`, caption: "From the slope: the velocity starts at v₀ and changes by a every second." },
                { type: "formula", latex: r`x = x_0 + v_0t + \tfrac12at^2`, caption: "From the area: starting position, plus the displacement at the initial velocity, plus the extra from accelerating." },
                { type: "callout", tone: "key", title: "Where the ½ comes from", md: r`The area under the velocity–time line from $0$ to $t$ splits into two pieces:

- a **rectangle** of height $v_0$ and width $t$: area $v_0t$;
- a **triangle** on top, of base $t$ and height $at$ (the velocity gained): area $\tfrac12 \cdot t \cdot at = \tfrac12at^2$.

The ½ is the triangle's ½. In words: the extra velocity builds up steadily from $0$ to $at$, so *on average* only half of it is acting.` },
                { type: "formula", latex: r`v^2 = v_0^2 + 2a\,\Delta x`, caption: "Combining the first two to remove the time: useful when t is neither known nor wanted." },
                { type: "text", md: r`## Choosing an equation

Five quantities describe a stretch of constant-acceleration motion: $\Delta x$, $v_0$, $v$, $a$ and $t$. Each equation leaves one of them out.

| Equation | Leaves out |
|---|---|
| $v = v_0 + at$ | $\Delta x$ |
| $x = x_0 + v_0t + \tfrac12at^2$ | $v$ |
| $v^2 = v_0^2 + 2a\,\Delta x$ | $t$ |

So the routine is:

1. Choose the positive direction and write down each known quantity **with its sign**.
2. Name the quantity you want.
3. Find the quantity that is neither known nor wanted, and use the equation that leaves it out.

These equations hold only while the acceleration is constant. If the acceleration changes part-way (a car speeds up, then cruises), treat each stage separately.` },
                {
                  type: "worked_example",
                  title: "Braking to a stop",
                  problem: r`A cyclist moving at $+12\,\text{m/s}$ brakes with a constant acceleration of $-3.0\,\text{m/s}^2$. Find (a) how long she takes to stop and (b) how far she travels while stopping.`,
                  steps: [
                    { title: "List with signs", md: r`$v_0 = +12\,\text{m/s}$, $a = -3.0\,\text{m/s}^2$, and "stops" means $v = 0$.` },
                    { title: "(a) Time: displacement is not involved", md: r`Use $v = v_0 + at$: $0 = 12 + (-3.0)t$, so $t = 4.0\,\text{s}$.` },
                    { title: "(b) Distance: use the equation without time", md: r`$v^2 = v_0^2 + 2a\,\Delta x$ gives $0 = (12)^2 + 2(-3.0)\,\Delta x$, so $\Delta x = \dfrac{-144}{-6.0}\,\text{m} = 24\,\text{m}$.` },
                    { title: "Check with the position equation", md: r`$\Delta x = v_0t + \tfrac12at^2 = (12)(4.0) + \tfrac12(-3.0)(4.0)^2 = 48 - 24 = 24\,\text{m}$. ✓` },
                  ],
                  answer: r`(a) $4.0\,\text{s}$; (b) $24\,\text{m}$`,
                },
                { type: "check", questionId: Q("ke-1") },
                { type: "check", questionId: Q("ke-2"), lead: "Starting from rest: mind the ½ and the square." },
                { type: "text", md: r`## Turnaround points

If the velocity and acceleration have opposite signs, the object slows, stops for an instant and comes back. The turnaround is the instant where $v = 0$:

$$0 = v_0 + at \quad\Longrightarrow\quad t_{\text{turn}} = -\frac{v_0}{a}$$

Three things to remember about that instant:

- the velocity is zero, but the **acceleration is not**: it has the same value as at every other moment;
- the position equation keeps working straight through it. You do not need separate "out" and "back" calculations to find a position or displacement;
- **distance** is different: after a turnaround, add the outward leg and the return leg separately.` },
                {
                  type: "simulation",
                  simId: "motion-lab",
                  title: "Predict, then check",
                  params: { x0: 4, v0: -6, a: 1.5, duration: 8 },
                  explore: [
                    r`Before pressing play, use $v = v_0 + at$ to predict when the object turns around. Then run the lab and check where the velocity readout reaches zero.`,
                    r`Use $x = x_0 + v_0t + \tfrac12at^2$ to predict the position at $t = 2\,\text{s}$, then compare with the lab's table of evaluated equations.`,
                    r`At $t = 8\,\text{s}$ the object is back where it started. Compare the displacement and distance-travelled readouts and explain the difference.`,
                  ],
                },
                {
                  type: "worked_example",
                  title: "Free fall: a ball thrown straight up",
                  problem: r`A ball is thrown straight up at $19.6\,\text{m/s}$. Ignore air resistance and use $g = 9.8\,\text{m/s}^2$. Take **up as positive** and put the origin at the point of release. Find (a) the time to reach the top, (b) the maximum height, and (c) the ball's velocity when it comes back to the release point.`,
                  steps: [
                    { title: "Set up the signs", md: r`Gravity makes the velocity change by $9.8\,\text{m/s}$ downward every second, whether the ball is rising or falling. With up positive: $a = -9.8\,\text{m/s}^2$ for the entire flight, $v_0 = +19.6\,\text{m/s}$, $x_0 = 0$.` },
                    { title: "(a) The top is a turnaround: v = 0", md: r`$0 = 19.6 + (-9.8)t$, so $t = 2.0\,\text{s}$.` },
                    { title: "(b) Position at that time", md: r`$x = 0 + (19.6)(2.0) + \tfrac12(-9.8)(2.0)^2 = 39.2 - 19.6 = 19.6\,\text{m}$.` },
                    { title: "(c) Back at the release point: x = 0", md: r`$0 = 19.6t - 4.9t^2 = t(19.6 - 4.9t)$, so $t = 0$ (the throw) or $t = 4.0\,\text{s}$. Then $v = 19.6 + (-9.8)(4.0) = -19.6\,\text{m/s}$.` },
                    { title: "Read the result", md: r`The ball returns with the same speed it left with, in the opposite direction, and the trip down takes as long as the trip up. At the top, $v = 0$ but $a$ is still $-9.8\,\text{m/s}^2$.` },
                  ],
                  answer: r`(a) $2.0\,\text{s}$; (b) $19.6\,\text{m}$; (c) $-19.6\,\text{m/s}$`,
                },
                { type: "callout", tone: "tip", title: "g is a positive number", md: r`$g = 9.8\,\text{m/s}^2$ is the *size* of the free-fall acceleration. Whether you write $a = -9.8\,\text{m/s}^2$ or $a = +9.8\,\text{m/s}^2$ depends on your choice of positive direction: negative if up is positive (the convention in this course), positive if you chose down as positive. Decide once, at the start, and give every velocity and displacement a sign that matches.` },
                { type: "check", questionId: Q("ke-8"), lead: "Use the Motion Lab to find a turnaround, then confirm it with an equation." },
                { type: "summary", points: [r`Constant acceleration only: $v = v_0 + at$, $\;x = x_0 + v_0t + \tfrac12at^2$, $\;v^2 = v_0^2 + 2a\,\Delta x$.`, "The ½ is the area of the triangle under the velocity–time line.", "List the knowns with signs, name the unknown, and pick the equation that leaves out the quantity you neither know nor want.", r`At a turnaround $v = 0$ but $a \neq 0$; displacement carries straight through it, distance must be added leg by leg.`, r`Free fall with up positive: $a = -9.8\,\text{m/s}^2$ on the way up, at the top and on the way down.`] },
              ],
            },
          ],
        },
        {
          id: "physics-1.u1.t.free-fall",
          title: "Free fall",
          description: "Objects moving under gravity alone: the same downward acceleration for every object, at every point of a vertical flight, and the calculations that follow from it.",
          objectives: [
            { id: "physics-1.o.1j", code: "PHYS-1.G", description: "Explain free fall as constant downward acceleration independent of mass, and apply the constant-acceleration equations to objects dropped, thrown upward and thrown downward.", skillIds: [S("u1.free-fall-concepts"), S("u1.free-fall-calculations")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u1.free-fall",
              title: "Free fall",
              summary: "What free fall means, why every object falls with the same acceleration, and how to handle drops, upward throws and launches from a height with one sign convention.",
              estMinutes: 15,
              skillIds: [S("u1.free-fall-concepts"), S("u1.free-fall-calculations")],
              blocks: [
                { type: "text", md: r`You have already used the constant-acceleration equations on a ball thrown straight up. Vertical motion near the ground is so common (dropped phones, divers, rockets after their engines cut out, a basketball at the top of a jump shot) that it deserves its own topic.

Throughout, air resistance is treated as negligible, $g = 9.8\,\text{m/s}^2$, and **up is positive**.` },
                { type: "definition", term: "Free fall", md: r`Motion in which gravity is the **only** influence on the object. It has nothing to do with the direction of motion: an object is in free fall from the instant it is released until it hits something, whether it is moving up, momentarily at rest at the top, or moving down.` },
                { type: "callout", tone: "key", title: "One acceleration for everything", md: r`Near Earth's surface every object in free fall has the same acceleration:

$$a = 9.8\,\text{m/s}^2 \text{ downward}$$

It does not depend on the object's mass, its size, or whether it is rising or falling. Each second, every free-falling object's velocity changes by $9.8\,\text{m/s}$ in the downward direction.` },
                { type: "callout", tone: "warning", title: "Heavier objects do not fall faster", md: r`Drop a full water bottle and an empty one from the same height at the same instant and they land together. Everyday experience seems to disagree (a sheet of paper flutters down slowly), but that is **air resistance**, which matters a lot for light, spread-out objects. Crumple the paper into a tight ball and it falls almost exactly like the bottle. With air resistance negligible, mass makes no difference at all.` },
                { type: "check", questionId: Q("u1.check-ff-1"), lead: "Predict before you calculate." },
                { type: "text", md: r`## Up, top and down: the same acceleration

Toss a ball straight up at $14.7\,\text{m/s}$. Every half-second its velocity drops by $4.9\,\text{m/s}$:

| $t$ (s) | 0 | 0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 |
|---|---|---|---|---|---|---|---|
| $v$ (m/s) | $+14.7$ | $+9.8$ | $+4.9$ | $0$ | $-4.9$ | $-9.8$ | $-14.7$ |

The velocity changes at the same steady rate the whole time, so the velocity–time graph is **one straight line** with slope $-9.8\,\text{m/s}^2$. It crosses the time axis at the top ($t = 1.5\,\text{s}$) without bending. The table is also symmetric: the ball passes each height on the way down with the same speed it had there on the way up.` },
                { type: "callout", tone: "warning", title: "Free fall is not just falling", md: r`While the ball rises it is slowing down, and slowing down while moving up means the acceleration points **down**. So the acceleration is $9.8\,\text{m/s}^2$ downward on the way up, $9.8\,\text{m/s}^2$ downward at the top (where $v = 0$ for an instant), and $9.8\,\text{m/s}^2$ downward on the way down. It never switches off and never points up.` },
                { type: "check", questionId: Q("u1.check-ff-2") },
                { type: "text", md: r`## The equations with $a = -g$

With up positive, the constant-acceleration equations become:` },
                { type: "formula", latex: r`v = v_0 - gt \qquad y = y_0 + v_0t - \tfrac12gt^2 \qquad v^2 = v_0^2 - 2g\,\Delta y`, caption: "Up positive, g = 9.8 m/s² (a positive number). An upward v₀ is positive, a downward one negative; a drop below the start gives a negative Δy." },
                {
                  type: "worked_example",
                  title: "A phone slips off a balcony",
                  problem: r`A phone slips out of someone's hand on a balcony and reaches the ground $1.5\,\text{s}$ later. Find (a) the height it fell from and (b) its velocity just before it lands.`,
                  steps: [
                    { title: "Set up", md: r`Origin at the balcony, up positive. "Slips" means it starts from rest: $v_0 = 0$, $a = -9.8\,\text{m/s}^2$, $t = 1.5\,\text{s}$.` },
                    { title: "(a) Displacement", md: r`$\Delta y = v_0t - \tfrac12gt^2 = 0 - \tfrac12(9.8)(1.5)^2 = -11.0\,\text{m}$. The minus sign says the phone ended $11.0\,\text{m}$ **below** the balcony, so it fell from about $11\,\text{m}$.` },
                    { title: "(b) Velocity", md: r`$v = v_0 - gt = 0 - (9.8)(1.5) = -14.7\,\text{m/s}$: $14.7\,\text{m/s}$ downward.` },
                  ],
                  answer: r`(a) about $11\,\text{m}$; (b) $14.7\,\text{m/s}$ downward`,
                },
                {
                  type: "worked_example",
                  title: "Thrown up from a cliff, landing below",
                  problem: r`A ball is thrown straight up at $8.0\,\text{m/s}$ from the edge of a cliff $20\,\text{m}$ above a beach. It rises, falls past the cliff edge and lands on the beach. Find (a) how long it is in the air and (b) its speed when it lands.`,
                  steps: [
                    { title: "Set up", md: r`Origin at the cliff edge, up positive: $v_0 = +8.0\,\text{m/s}$, $a = -9.8\,\text{m/s}^2$, and the beach is at $\Delta y = -20\,\text{m}$. The ball is in free fall the whole time, so one equation covers the rise, the top and the fall.` },
                    { title: "(a) Position equation gives a quadratic", md: r`$-20 = 8.0t - 4.9t^2$, so $4.9t^2 - 8.0t - 20 = 0$ and $t = \dfrac{8.0 \pm \sqrt{8.0^2 + 4(4.9)(20)}}{2(4.9)} = \dfrac{8.0 \pm 21.4}{9.8}$.` },
                    { title: "Keep the root that makes sense", md: r`The positive root is $t \approx 3.0\,\text{s}$. The negative root ($\approx -1.4\,\text{s}$) is a time before the throw, so it is rejected.` },
                    { title: "(b) Landing speed without the time", md: r`$v^2 = v_0^2 - 2g\,\Delta y = 8.0^2 - 2(9.8)(-20) = 64 + 392 = 456$, so $|v| \approx 21.4\,\text{m/s}$ (moving down). Check: $v = 8.0 - 9.8(3.0) \approx -21.4\,\text{m/s}$ ✓` },
                  ],
                  answer: r`(a) about $3.0\,\text{s}$; (b) about $21.4\,\text{m/s}$`,
                },
                { type: "callout", tone: "tip", title: "Signs are the whole game", md: r`Most free-fall mistakes are sign mistakes. Before calculating, write a list: $v_0 = ?$ (positive if thrown up, negative if thrown down, zero if dropped), $a = -9.8\,\text{m/s}^2$, $\Delta y = ?$ (negative if it ends below the start). Then check the answer makes sense: a ball thrown up must slow down while rising, and it must land moving downward.` },
                { type: "check", questionId: Q("u1.check-ff-3"), lead: "A drop from rest: remember the ½." },
                { type: "note_prompt", prompt: "Explain to a friend why a ball thrown upward is in free fall even while it is still rising, and what its acceleration is at the very top.", suggestedTitle: "Free fall", starter: "**Free fall means**: \n**Acceleration on the way up / at the top / on the way down**: \n**Why mass doesn't matter**: \n\nLinks: [[Free fall: reasoning]] [[Constant-acceleration equations]]" },
                { type: "summary", points: ["Free fall means gravity is the only influence; it covers rising, the top and falling.", r`Every free-falling object accelerates at $9.8\,\text{m/s}^2$ downward, whatever its mass (air resistance negligible).`, r`With up positive, $a = -9.8\,\text{m/s}^2$ for the whole flight; the velocity–time graph is one straight line of slope $-9.8\,\text{m/s}^2$.`, "At the top v = 0 but a is still 9.8 m/s² downward; the flight is symmetric when it lands at its launch height.", "For a launch from a height, use the position equation with a negative Δy, solve the quadratic and keep the positive root."] },
              ],
            },
          ],
        },
        {
          id: "physics-1.u1.t.motion-data",
          title: "Analyzing motion data",
          description: "Turning measurements into physics: velocities and accelerations from data tables, testing for constant acceleration, and straightening curved data to read off an acceleration.",
          objectives: [
            { id: "physics-1.o.1k", code: "PHYS-1.H", description: "Determine velocity and acceleration from tables of motion data, and linearize data (for example position against time squared) to find an acceleration from a slope and to predict how quantities scale.", skillIds: [S("u1.motion-data"), S("u1.linearization")] },
          ],
          lessons: [
            {
              id: "physics-1.l.u1.motion-data",
              title: "Analyzing motion data",
              summary: "Read velocities and accelerations from tables of measurements, test whether the acceleration is constant, and plot data so it falls on a straight line whose slope tells you the acceleration.",
              estMinutes: 16,
              skillIds: [S("u1.motion-data"), S("u1.linearization")],
              blocks: [
                { type: "text", md: r`In a lab you rarely get an equation handed to you. You get a **table of measurements** from a motion sensor, a video or a stopwatch, and you have to decide what kind of motion it shows and what the numbers are. On the AP exam, questions about experimental data are common. Two tools do most of the work: **differences** and **straight-line graphs**.` },
                { type: "text", md: r`## Differences: changes between rows

A cart is released from rest on a ramp, and its position is recorded every $0.5\,\text{s}$ (positive down the ramp):

| $t$ (s) | 0 | 0.5 | 1.0 | 1.5 | 2.0 |
|---|---|---|---|---|---|
| $x$ (m) | 0 | 0.10 | 0.40 | 0.90 | 1.60 |
| change in $x$ (m) | | 0.10 | 0.30 | 0.50 | 0.70 |

The **first differences** (changes in position each interval) are not equal, so the velocity is not constant. Dividing each by $0.5\,\text{s}$ gives the average velocity in each interval: $0.2$, $0.6$, $1.0$ and $1.4\,\text{m/s}$.` },
                { type: "callout", tone: "key", title: "What the differences tell you", md: r`For equal time intervals:

- **constant first differences** in position: constant velocity;
- first differences that grow (or shrink) by the **same amount each time**, so constant **second differences**: constant acceleration;
- starting from rest with constant acceleration, the distances covered in successive equal intervals go in the ratio $1 : 3 : 5 : 7 : \dots$ (the odd numbers). The cart above shows exactly that: $0.10 : 0.30 : 0.50 : 0.70$.` },
                {
                  type: "worked_example",
                  title: "Acceleration from the cart data",
                  problem: r`Use the cart table above to find the cart's acceleration, and check the result against the position at $t = 2.0\,\text{s}$.`,
                  steps: [
                    { title: "Velocities in each interval", md: r`The average velocity over an interval equals the instantaneous velocity at the middle of that interval (for constant acceleration). So $v = 0.2\,\text{m/s}$ at $t = 0.25\,\text{s}$, $0.6\,\text{m/s}$ at $0.75\,\text{s}$, $1.0\,\text{m/s}$ at $1.25\,\text{s}$ and $1.4\,\text{m/s}$ at $1.75\,\text{s}$.` },
                    { title: "Change in velocity per second", md: r`The velocity rises by $0.4\,\text{m/s}$ every $0.5\,\text{s}$: $a = \dfrac{0.4\,\text{m/s}}{0.5\,\text{s}} = 0.8\,\text{m/s}^2$, the same for every pair, so the acceleration is constant.` },
                    { title: "Check with an equation", md: r`From rest, $x = \tfrac12at^2 = \tfrac12(0.8)(2.0)^2 = 1.6\,\text{m}$ at $t = 2.0\,\text{s}$, matching the table. ✓` },
                  ],
                  answer: r`$a = 0.8\,\text{m/s}^2$`,
                },
                { type: "callout", tone: "warning", title: "Use changes, not single values", md: r`Dividing one position by one time (say $1.60\,\text{m} \div 2.0\,\text{s}$) gives the average velocity *since $t = 0$*, not the velocity at $t = 2.0\,\text{s}$. And large positions do not mean large acceleration. Velocity comes from **changes in position**; acceleration comes from **changes in velocity**. Build a column of differences first.` },
                { type: "check", questionId: Q("u1.check-data-1"), lead: "Change in position over change in time." },
                { type: "text", md: r`## Linearization: make the data straight

Real measurements scatter a little, and a curve is hard to read accurately by eye. A **straight line** is easy: a best-fit line averages out the scatter, and its slope and intercept can be read directly. So physicists choose what to plot so that the expected relationship becomes a straight line. This is called **linearizing** the data.

For motion from rest with constant acceleration, $x = \tfrac12at^2$. Compare it with the equation of a straight line through the origin, $y = mX$:` },
                { type: "formula", latex: r`\underbrace{x}_{y} = \underbrace{\left(\tfrac12a\right)}_{\text{slope } m}\,\underbrace{t^2}_{X}`, caption: "Plot x on the vertical axis against t² on the horizontal axis: a straight line through the origin with slope ½a." },
                { type: "text", md: r`| Situation | Plot | Straight line? | Slope means |
|---|---|---|---|
| constant acceleration | $v$ against $t$ | yes | $a$ |
| from rest, constant acceleration | $x$ against $t^2$ | yes, through origin | $\tfrac12a$ |
| from rest, constant acceleration | $v^2$ against $\Delta x$ | yes, through origin | $2a$ |
| dropped from height $h$ | $h$ against $t^2$ | yes, through origin | $\tfrac12g$ |` },
                {
                  type: "worked_example",
                  title: "Finding g from a drop experiment",
                  problem: r`Students drop a ball from several heights and time each fall with light gates. Their results (heights in m, times in s): $0.50$ m in $0.32$ s, $1.00$ m in $0.45$ s, $1.50$ m in $0.55$ s, $2.00$ m in $0.64$ s. Linearize the data and use it to estimate $g$.`,
                  steps: [
                    { title: "Choose the axes", md: r`From rest, $h = \tfrac12gt^2$, so plot $h$ against $t^2$ and expect a straight line through the origin with slope $\tfrac12g$.` },
                    { title: "Compute t²", md: r`$t^2 \approx 0.102$, $0.203$, $0.303$ and $0.410\,\text{s}^2$. The ratios $h/t^2$ are about $4.9$, $4.9$, $5.0$ and $4.9\,\text{m/s}^2$: the points do lie close to one straight line through the origin.` },
                    { title: "Read the slope", md: r`A best-fit line through these points has a slope of about $4.9\,\text{m/s}^2$.` },
                    { title: "Turn the slope into g", md: r`Slope $= \tfrac12g$, so $g \approx 2 \times 4.9 = 9.8\,\text{m/s}^2$.` },
                  ],
                  answer: r`$g \approx 9.8\,\text{m/s}^2$ (twice the slope)`,
                },
                { type: "callout", tone: "warning", title: "The slope is not always the acceleration", md: r`Always match your graph to its equation before reading the slope. On a $v$–$t$ graph the slope is $a$. On an $x$–$t^2$ graph (from rest) it is $\tfrac12a$, so $a$ is **twice** the slope. On a $v^2$–$\Delta x$ graph it is $2a$, so $a$ is **half** the slope.` },
                { type: "check", questionId: Q("u1.check-lin-1"), lead: "Which plot makes the data straight?" },
                { type: "text", md: r`## Proportional reasoning

The same relationships let you predict without a calculator:

- from rest, $x \propto t^2$: **double the time, four times the distance**;
- stopping from speed $v_0$ with the same braking, $\Delta x \propto v_0^2$: **double the speed, four times the stopping distance**;
- dropped from height $h$, $t \propto \sqrt{h}$: **four times the height, only twice the time**.` },
                { type: "callout", tone: "warning", title: "Squares do not scale linearly", md: r`The most common slip is to scale everything in proportion: "twice as fast, so twice the stopping distance". Write the relationship as a proportion first ($\Delta x \propto v_0^2$), then apply the factor to the quantity *inside* the square.` },
                { type: "check", questionId: Q("u1.check-lin-2"), lead: "Double the speed: what happens to the stopping distance?" },
                { type: "tutor_prompt", prompts: ["How can I tell from a table whether an object's acceleration is constant?", "Why do we plot position against time squared?", "Why is the acceleration twice the slope of an x–t² graph?"] },
                { type: "summary", points: ["Velocity comes from changes in position, acceleration from changes in velocity: build a column of differences.", "Equal time steps: constant first differences mean constant velocity; constant second differences mean constant acceleration; 1 : 3 : 5 : 7 spacing means constant acceleration from rest.", "Linearize by choosing axes that make the expected relationship a straight line, e.g. x against t² for motion from rest.", r`Read the slope through the equation: $v$–$t$ slope $= a$; $x$–$t^2$ slope $= \tfrac12a$; $v^2$–$\Delta x$ slope $= 2a$.`, r`Proportional reasoning: $x \propto t^2$, $\Delta x_{\text{stop}} \propto v_0^2$, $t_{\text{fall}} \propto \sqrt{h}$.`] },
              ],
            },
          ],
        },
        {
          id: "physics-1.u1.vectors",
          title: "Scalars, vectors and components",
          description: "The language of direction: which quantities are vectors, how to add them by drawing, and how to break them into components for calculation.",
          objectives: [
            { id: "physics-1.o.1f", code: "PHYS-1.I", description: "Distinguish scalar from vector quantities, add vectors graphically and by components, and find a vector's magnitude and direction from its components.", skillIds: [S("scalars-vectors"), S("vector-components")] },
          ],
          lessons: [
            {
              id: "physics-1.l.vectors",
              title: "Scalars and vectors",
              summary: "Why some quantities need a direction and others do not, and how to add quantities that have a direction by drawing arrows head to tail.",
              estMinutes: 13,
              skillIds: [S("scalars-vectors")],
              blocks: [
                { type: "text", md: r`Along a straight line, a sign was enough to show direction: $+3\,\text{m/s}$ one way, $-3\,\text{m/s}$ the other. As soon as motion leaves the line (a ball kicked across a field, a boat crossing a river) a plus or minus sign is no longer enough. "North-east", "$30^\circ$ above the horizontal", "straight across the river" are all directions a single sign cannot express.

Before handling motion in two dimensions, it helps to sort physical quantities into two families: those that have a direction and those that do not.` },
                { type: "definition", term: "Scalar", md: r`A quantity described completely by a size (a number with a unit). Time, mass, distance, speed and temperature are scalars. Some scalars can be negative (a temperature of $-5\,^\circ\text{C}$), but the sign never means a direction.` },
                { type: "definition", term: "Vector", md: r`A quantity with both a size, called its **magnitude**, and a direction. Displacement, velocity and acceleration are vectors. A vector is written with an arrow, $\vec{A}$, and its magnitude as $|\vec{A}|$ or simply $A$. A magnitude is never negative.` },
                { type: "text", md: r`## Scalar and vector partners

Several ideas from this unit come in pairs: one scalar, one vector.

| Scalar (size only) | Vector (size and direction) |
|---|---|
| distance travelled | displacement |
| speed | velocity |
| time | (no vector partner) |
| | acceleration |

The test is a question you can ask of any quantity: **does it make sense to say which way?** "Which way is your velocity?" is a sensible question. "Which way is your mass?" is not.` },
                { type: "callout", tone: "warning", title: "A minus sign is not what makes a vector", md: r`In one dimension we used the sign of a vector to show its direction, so it is tempting to think "can be negative" means "vector". It does not. Temperature can be negative and has no direction. Speed is a scalar and is never negative, even when the velocity is. Decide by asking whether a direction is part of the quantity's meaning.` },
                { type: "check", questionId: Q("sv-1"), lead: "Sort the quantities into their families." },
                { type: "text", md: r`## Adding vectors head to tail

Draw a vector as an arrow: its length shows the magnitude (to some scale) and it points in the vector's direction. To add two vectors, think of them as two legs of a trip. Walk the first leg, then walk the second leg **starting from where the first one ended**. The overall change, from the very start to the very end, is the sum.` },
                { type: "callout", tone: "key", title: "The head-to-tail method", md: r`To find $\vec{R} = \vec{A} + \vec{B}$:

1. Draw $\vec{A}$.
2. Draw $\vec{B}$ with its **tail at the head** (arrow tip) of $\vec{A}$, keeping its length and direction.
3. The **resultant** $\vec{R}$ runs from the tail of $\vec{A}$ to the head of $\vec{B}$.

The order does not matter: $\vec{A} + \vec{B}$ and $\vec{B} + \vec{A}$ give the same resultant.` },
                { type: "text", md: r`Three cases are worth knowing by heart:

- **Same direction**: the magnitudes add. $5\,\text{m}$ east plus $3\,\text{m}$ east is $8\,\text{m}$ east.
- **Opposite directions**: the magnitudes subtract, and the resultant points the way of the larger one. $5\,\text{m}$ east plus $3\,\text{m}$ west is $2\,\text{m}$ east.
- **Perpendicular**: the two vectors and the resultant form a right triangle, so the Pythagorean theorem gives the magnitude and an inverse tangent gives the direction.

For any other angle the resultant's magnitude lies somewhere between the difference and the sum of the two magnitudes.` },
                { type: "formula", latex: r`R = \sqrt{A^2 + B^2} \qquad \text{(only when } \vec{A} \perp \vec{B}\text{)}`, caption: "Magnitude of the resultant of two perpendicular vectors." },
                {
                  type: "worked_example",
                  title: "A delivery drone's displacement",
                  problem: r`A delivery drone flies $120\,\text{m}$ north, then $50\,\text{m}$ east. Find the magnitude and direction of its displacement, and compare it with the distance it flew.`,
                  steps: [
                    { title: "Sketch head to tail", md: r`Draw $120\,\text{m}$ north, then from its tip draw $50\,\text{m}$ east. The resultant runs from the start to the end point: the hypotenuse of a right triangle.` },
                    { title: "Magnitude", md: r`$R = \sqrt{(120\,\text{m})^2 + (50\,\text{m})^2} = \sqrt{16\,900}\,\text{m} = 130\,\text{m}$.` },
                    { title: "Direction", md: r`Measured from north toward east: $\theta = \tan^{-1}\!\left(\dfrac{50}{120}\right) \approx 23^\circ$. The displacement is $130\,\text{m}$ at about $23^\circ$ east of north.` },
                    { title: "Compare with the distance", md: r`The drone flew $120\,\text{m} + 50\,\text{m} = 170\,\text{m}$ of path, but ended only $130\,\text{m}$ from its start. Adding the magnitudes gives the distance travelled, not the size of the displacement.` },
                  ],
                  answer: r`$130\,\text{m}$ at about $23^\circ$ east of north (distance flown: $170\,\text{m}$)`,
                },
                { type: "callout", tone: "warning", title: "Magnitudes only add when the arrows line up", md: r`$120 + 50 = 170$ would be the size of the displacement only if both legs pointed the same way. For vectors at an angle, the shortcut across the corner is always shorter than going around it. A quick check for any sum: $|A - B| \le R \le A + B$.` },
                { type: "check", questionId: Q("sv-2"), lead: "Two perpendicular legs." },
                { type: "text", md: r`## The negative of a vector, and subtraction

The vector $-\vec{B}$ has the same magnitude as $\vec{B}$ and points in the opposite direction. Subtracting a vector means adding its negative:

$$\vec{A} - \vec{B} = \vec{A} + (-\vec{B})$$

This matters because every **change** in a vector quantity is a subtraction. The change in velocity is $\Delta\vec{v} = \vec{v}_f - \vec{v}_i$, and acceleration is that change divided by the time it takes.` },
                { type: "callout", tone: "tip", title: "Changing direction is a change in velocity", md: r`A car going round a bend at a steady $15\,\text{m/s}$ has a constant **speed**, but its **velocity** keeps changing, because its direction does. So it is accelerating, even though the speedometer never moves. In one dimension a change of direction meant a change of sign; in two dimensions any turn at all changes the velocity vector.` },
                { type: "note_prompt", prompt: "List the scalars and vectors you have met so far in this unit, and write the one-question test you use to tell them apart.", suggestedTitle: "Scalars and vectors", starter: "**Scalars** (size only): \n**Vectors** (size and direction): \n\nMy test: \n\nWhy 3 m + 4 m is not always 7 m: \n\nLinks: [[Scalars and vectors]] [[Distance vs displacement]]" },
                { type: "summary", points: ["A scalar has only a size; a vector has a magnitude and a direction.", "Distance and speed are scalars; displacement, velocity and acceleration are vectors.", "Add vectors head to tail: the resultant runs from the first tail to the last head.", r`Magnitudes add only for vectors in the same direction; for perpendicular vectors use $R = \sqrt{A^2 + B^2}$.`, r`$-\vec{B}$ has the same magnitude as $\vec{B}$ and the opposite direction; a change $\Delta\vec{v} = \vec{v}_f - \vec{v}_i$ is a vector subtraction.`] },
              ],
            },
            {
              id: "physics-1.l.vector-components",
              title: "Vector components",
              summary: "Replace any vector by two perpendicular pieces, use them to add vectors with simple arithmetic, and turn components back into a magnitude and a direction.",
              estMinutes: 16,
              skillIds: [S("vector-components")],
              blocks: [
                { type: "text", md: r`Head-to-tail drawings show what is happening, but measuring arrows with a ruler is slow and imprecise. The calculating method replaces each vector with two perpendicular **components**, one along each axis. Along each axis the problem is one-dimensional again, and one-dimensional vectors add like signed numbers.` },
                { type: "definition", term: "Components", md: r`The $x$-component $A_x$ and $y$-component $A_y$ of a vector $\vec{A}$ are two perpendicular vectors, along the axes, that add head to tail to make $\vec{A}$. Each is written as a signed number: positive if it points along the positive axis, negative if it points the other way.` },
                { type: "text", md: r`## Finding components with sine and cosine

A vector and its two components form a right triangle with the vector as the hypotenuse. If $\theta$ is the angle between the vector and one of the axes:

- the component **along** that axis (adjacent to $\theta$) is $A\cos\theta$;
- the component **perpendicular** to that axis (opposite $\theta$) is $A\sin\theta$.

For the common case of an angle measured above or below the horizontal:` },
                { type: "formula", latex: r`A_x = A\cos\theta \qquad A_y = A\sin\theta`, caption: "θ measured from the horizontal (x) axis. Give each component the sign of the direction it points." },
                { type: "callout", tone: "key", title: "Adjacent gets cosine, wherever the angle is", md: r`Do not memorise "$x$ uses cosine". If a direction is given as "$30^\circ$ west of north", the angle is measured from the north (vertical) axis, so the north component is $A\cos 30^\circ$ and the west component is $A\sin 30^\circ$. Sketch the triangle, mark the angle, and let the sketch tell you which side is adjacent.` },
                {
                  type: "worked_example",
                  title: "Components of a kick",
                  problem: r`A football is kicked at $18\,\text{m/s}$ at $40^\circ$ above the horizontal. Find the horizontal and vertical components of its initial velocity.`,
                  steps: [
                    { title: "Sketch", md: r`Draw the velocity as the hypotenuse of a right triangle, $40^\circ$ up from the horizontal. The horizontal side is adjacent to the angle; the vertical side is opposite it.` },
                    { title: "Horizontal component", md: r`$v_x = v\cos\theta = (18\,\text{m/s})\cos 40^\circ \approx 13.8\,\text{m/s}$.` },
                    { title: "Vertical component", md: r`$v_y = v\sin\theta = (18\,\text{m/s})\sin 40^\circ \approx 11.6\,\text{m/s}$, upward.` },
                    { title: "Check", md: r`$\sqrt{13.8^2 + 11.6^2} \approx 18.0\,\text{m/s}$ ✓. And a $40^\circ$ angle is less than $45^\circ$, so the horizontal component should be the larger one. It is.` },
                  ],
                  answer: r`$v_x \approx 13.8\,\text{m/s}$, $v_y \approx 11.6\,\text{m/s}$ upward`,
                },
                { type: "check", questionId: Q("vc-1") },
                { type: "text", md: r`## Signs of components

With east (or right) as $+x$ and north (or up) as $+y$, the direction of a vector fixes the signs of its components:

| Vector points | $x$-component | $y$-component |
|---|---|---|
| north-east | $+$ | $+$ |
| north-west | $-$ | $+$ |
| south-west | $-$ | $-$ |
| south-east | $+$ | $-$ |

Work out the sizes with sine and cosine, then attach the signs from the direction.` },
                { type: "check", questionId: Q("vc-2"), lead: "Signs only: no calculation needed." },
                { type: "text", md: r`## Adding vectors by components

1. Resolve every vector into $x$- and $y$-components, with signs.
2. Add all the $x$-components to get $R_x$, and all the $y$-components to get $R_y$.
3. Use the Pythagorean theorem for the magnitude, and an inverse tangent for the angle. Name the direction using the signs of $R_x$ and $R_y$.` },
                { type: "formula", latex: r`R = \sqrt{R_x^2 + R_y^2} \qquad \theta = \tan^{-1}\!\left(\frac{|R_y|}{|R_x|}\right)`, caption: "Magnitude, and angle measured from the x-axis toward the y-axis. The signs of the components say which quadrant." },
                {
                  type: "worked_example",
                  title: "A two-leg flight",
                  problem: r`A drone flies $40\,\text{m}$ east, then $30\,\text{m}$ in a direction $60^\circ$ north of west. Find its overall displacement. Take east as $+x$ and north as $+y$.`,
                  steps: [
                    { title: "Leg 1", md: r`$A_x = +40\,\text{m}$, $A_y = 0$.` },
                    { title: "Leg 2", md: r`The angle is measured from the west direction, so west is adjacent: $B_x = -(30\,\text{m})\cos 60^\circ = -15\,\text{m}$ and $B_y = +(30\,\text{m})\sin 60^\circ \approx +26.0\,\text{m}$.` },
                    { title: "Add the components", md: r`$R_x = 40 - 15 = +25\,\text{m}$; $R_y = 0 + 26.0 = +26.0\,\text{m}$.` },
                    { title: "Magnitude and direction", md: r`$R = \sqrt{25^2 + 26.0^2} \approx 36\,\text{m}$. Both components are positive, so the displacement points north-east, at $\tan^{-1}\!\left(\dfrac{26.0}{25}\right) \approx 46^\circ$ north of east.` },
                  ],
                  answer: r`About $36\,\text{m}$ at $46^\circ$ north of east`,
                },
                { type: "callout", tone: "warning", title: "Never add the magnitudes of vectors that point different ways", md: r`$40\,\text{m} + 30\,\text{m} = 70\,\text{m}$ is the distance flown, not the displacement. The second leg partly undid the first (its $x$-component was negative), so the resultant is only about $36\,\text{m}$. Components are the safe route: add like with like, $x$ with $x$ and $y$ with $y$, and only combine them at the end.` },
                { type: "callout", tone: "tip", title: "Sanity checks", md: r`- The resultant's magnitude must be at least the difference and at most the sum of the magnitudes you added.
- The quadrant of your answer must match the signs of $R_x$ and $R_y$.
- If the angle is under $45^\circ$ from an axis, the component along that axis is the bigger one.` },
                { type: "tutor_prompt", prompts: ["Why does the x-component use cosine in some problems and sine in others?", "How do I find the direction of a vector from its components?", "Why can't I just add the magnitudes of two vectors?"] },
                { type: "summary", points: [r`Components replace a vector by two perpendicular signed pieces: $A_x = A\cos\theta$, $A_y = A\sin\theta$ for $\theta$ measured from the $x$-axis.`, "The side adjacent to the angle uses cosine and the opposite side uses sine, wherever the angle is measured from.", "Signs come from the direction the vector points, not from the trigonometry.", r`To add vectors, add the $x$-components and the $y$-components separately; then $R = \sqrt{R_x^2 + R_y^2}$ and $\theta = \tan^{-1}(|R_y| / |R_x|)$.`, "Adding magnitudes directly only works for vectors along the same line."] },
              ],
            },
          ],
        },
        {
          id: "physics-1.u1.relative-motion",
          title: "Reference frames and relative motion",
          description: "Every velocity is measured relative to something. Combine velocities measured in different frames, along a line and in two dimensions.",
          objectives: [
            { id: "physics-1.o.1g", code: "PHYS-1.J", description: "Describe motion as observed from different reference frames, and combine relative velocities along a line and, as vectors, in two dimensions.", skillIds: [S("relative-velocity-1d"), S("relative-velocity-2d")] },
          ],
          lessons: [
            {
              id: "physics-1.l.relative-motion",
              title: "Reference frames and relative velocity",
              summary: "Why the same object has different velocities for different observers, how to chain velocities with subscripts, and how to handle boats in currents and planes in wind.",
              estMinutes: 18,
              skillIds: [S("relative-velocity-1d"), S("relative-velocity-2d")],
              blocks: [
                { type: "text", md: r`You are sitting on a train moving at $30\,\text{m/s}$. How fast are you going?

- relative to your seat: $0$;
- relative to the platform you just passed: $30\,\text{m/s}$;
- relative to a passenger walking down the aisle toward you: a little more than $0$, toward them.

None of these is the "real" answer. A velocity only means something once you say what it is measured **relative to**.` },
                { type: "definition", term: "Reference frame", md: r`The viewpoint from which motion is measured: an observer together with a coordinate system that moves with them. Observers in different frames, moving relative to each other, measure different positions and velocities for the same object, and each description is equally valid.` },
                { type: "callout", tone: "info", title: "What frames agree on", md: r`In this course, reference frames move at **constant velocity** relative to one another. Observers in such frames disagree about velocities, but they measure the **same acceleration** for any object, because a constant difference in velocity does not change how fast velocity changes.` },
                { type: "formula", latex: r`v_{\text{AC}} = v_{\text{AB}} + v_{\text{BC}}`, caption: "Velocity of A relative to C equals velocity of A relative to B plus velocity of B relative to C. The inner subscripts match." },
                { type: "callout", tone: "key", title: "Read the subscripts", md: r`$v_{\text{AB}}$ means "the velocity of A, as measured by an observer moving with B". Two rules make the bookkeeping automatic:

- **Chain**: when the inner letters match, they link up: $v_{\text{AB}} + v_{\text{BC}} = v_{\text{AC}}$.
- **Reverse**: swapping the letters flips the sign: $v_{\text{BA}} = -v_{\text{AB}}$. If you see a car going east at $5\,\text{m/s}$, the car sees you going west at $5\,\text{m/s}$.` },
                {
                  type: "worked_example",
                  title: "Walking on a moving walkway",
                  problem: r`An airport walkway moves at $0.8\,\text{m/s}$ relative to the floor. Priya walks at $1.2\,\text{m/s}$ relative to the walkway. Take the walkway's direction of motion as positive. Find her velocity relative to the floor (a) when she walks in the walkway's direction and (b) when she turns round and walks back toward its start at the same pace.`,
                  steps: [
                    { title: "Label the frames", md: r`P = Priya, W = walkway, F = floor. We want $v_{\text{PF}} = v_{\text{PW}} + v_{\text{WF}}$, with $v_{\text{WF}} = +0.8\,\text{m/s}$.` },
                    { title: "(a) Walking with the walkway", md: r`$v_{\text{PW}} = +1.2\,\text{m/s}$, so $v_{\text{PF}} = 1.2 + 0.8 = +2.0\,\text{m/s}$.` },
                    { title: "(b) Walking against it", md: r`$v_{\text{PW}} = -1.2\,\text{m/s}$, so $v_{\text{PF}} = -1.2 + 0.8 = -0.4\,\text{m/s}$.` },
                    { title: "Interpret", md: r`Walking back, Priya still makes progress toward the start, but only at $0.4\,\text{m/s}$ relative to the floor. The signs did the work: the speeds added in (a) and subtracted in (b) without any guessing.` },
                  ],
                  answer: r`(a) $+2.0\,\text{m/s}$; (b) $-0.4\,\text{m/s}$`,
                },
                { type: "check", questionId: Q("rv-1") },
                { type: "text", md: r`## One moving object seen from another

Often both velocities are given relative to the ground and you want one object as seen from the other. Chain through the ground (G):

$$v_{\text{BA}} = v_{\text{BG}} + v_{\text{GA}} = v_{\text{BG}} - v_{\text{AG}}$$

In words: **the velocity of B as seen by A is B's ground velocity minus A's ground velocity.**` },
                {
                  type: "worked_example",
                  title: "Overtaking on a highway",
                  problem: r`A car travels east at $32\,\text{m/s}$ and a truck travels east at $26\,\text{m/s}$ on a straight highway. The car is $30\,\text{m}$ behind the truck. Find the truck's velocity relative to the car, and how long the car takes to close the gap.`,
                  steps: [
                    { title: "Signs", md: r`East positive: $v_{\text{CG}} = +32\,\text{m/s}$, $v_{\text{TG}} = +26\,\text{m/s}$.` },
                    { title: "Truck relative to car", md: r`$v_{\text{TC}} = v_{\text{TG}} - v_{\text{CG}} = 26 - 32 = -6\,\text{m/s}$. From the car, the truck drifts backward (west) at $6\,\text{m/s}$.` },
                    { title: "Closing the gap", md: r`In the car's frame the truck is $30\,\text{m}$ ahead and approaching at $6\,\text{m/s}$: $t = \dfrac{30\,\text{m}}{6\,\text{m/s}} = 5.0\,\text{s}$.` },
                  ],
                  answer: r`$6\,\text{m/s}$ west relative to the car; $5.0\,\text{s}$`,
                },
                { type: "callout", tone: "warning", title: "Let the signs decide whether speeds add or subtract", md: r`Two objects moving the **same** way have a relative speed equal to the **difference** of their speeds; two moving **toward each other** have a relative speed equal to the **sum**. Rather than memorising this, write every velocity with a sign and subtract: $v_{\text{BA}} = v_{\text{BG}} - v_{\text{AG}}$. Cars approaching head-on at $25\,\text{m/s}$ and $-20\,\text{m/s}$ close in on each other at $25 - (-20) = 45\,\text{m/s}$.` },
                { type: "check", questionId: Q("rv-2"), lead: "Head-on: keep the signs." },
                { type: "text", md: r`## Relative velocity in two dimensions

The same chaining rule holds when the velocities point in different directions, but now the addition is **vector** addition: head to tail, or by components.

For a boat (B) on a river, the water (W) moves relative to the shore (S):

$$\vec{v}_{\text{BS}} = \vec{v}_{\text{BW}} + \vec{v}_{\text{WS}}$$

The boat's motor sets $\vec{v}_{\text{BW}}$; the current is $\vec{v}_{\text{WS}}$; what someone on the bank sees is $\vec{v}_{\text{BS}}$. An aircraft works the same way: its velocity relative to the air plus the wind's velocity relative to the ground gives its velocity relative to the ground.` },
                {
                  type: "worked_example",
                  title: "Crossing a river",
                  problem: r`A river is $72\,\text{m}$ wide and flows at $1.0\,\text{m/s}$. A motorboat is aimed straight across and moves at $2.4\,\text{m/s}$ relative to the water. Find (a) the boat's speed relative to the shore, (b) how long it takes to cross and (c) how far downstream it lands.`,
                  steps: [
                    { title: "Sketch", md: r`The boat's velocity relative to the water points straight across; the current points downstream. They are perpendicular, so they add as the two legs of a right triangle.` },
                    { title: "(a) Speed relative to the shore", md: r`$v_{\text{BS}} = \sqrt{(2.4)^2 + (1.0)^2}\,\text{m/s} = 2.6\,\text{m/s}$, angled about $\tan^{-1}(1.0/2.4) \approx 23^\circ$ downstream of straight across.` },
                    { title: "(b) Crossing time: across component only", md: r`Only the across-river component, $2.4\,\text{m/s}$, carries the boat across: $t = \dfrac{72\,\text{m}}{2.4\,\text{m/s}} = 30\,\text{s}$.` },
                    { title: "(c) Drift: along-river component only", md: r`During those $30\,\text{s}$ the current carries the boat downstream: $(1.0\,\text{m/s})(30\,\text{s}) = 30\,\text{m}$.` },
                  ],
                  answer: r`(a) $2.6\,\text{m/s}$; (b) $30\,\text{s}$; (c) $30\,\text{m}$ downstream`,
                },
                { type: "check", questionId: Q("rv2-1"), lead: "Perpendicular velocities add as vectors." },
                { type: "callout", tone: "key", title: "The current does not change the crossing time", md: r`Perpendicular components are **independent**. The across-river motion depends only on the across-river velocity, so a boat aimed straight across takes the same time to cross whether the current is still or fast. The current changes only *where* it lands. (Dividing the width by the $2.6\,\text{m/s}$ resultant speed would be wrong: the resultant path is longer than the width.) You will use the same idea for projectiles, whose horizontal and vertical motions are independent in exactly this way.` },
                { type: "check", questionId: Q("rv2-2"), lead: "Which component carries the boat across?" },
                { type: "text", md: r`## Aiming upstream to go straight across

To land directly opposite its starting point, the boat must point partly **upstream**, so that the upstream component of its velocity relative to the water cancels the current. The rest of its velocity carries it across.

Take a boat that moves at $2.6\,\text{m/s}$ relative to water flowing at $1.0\,\text{m/s}$. The upstream component must be $1.0\,\text{m/s}$, so the across component is $\sqrt{2.6^2 - 1.0^2} = 2.4\,\text{m/s}$, and the boat points $\sin^{-1}(1.0/2.6) \approx 23^\circ$ upstream of straight across. It is the same right triangle as in the worked example, with the roles swapped: now the boat's own speed is the hypotenuse. Going straight across always costs some speed.

Pilots do the same in a crosswind: they point the aircraft (its **heading**) partly into the wind so that its velocity relative to the ground follows the route they want.` },
                { type: "tutor_prompt", prompts: ["Why doesn't a sideways current change how long it takes to cross a river?", "How do I know whether to add or subtract velocities in relative motion?", "Is the ground the 'correct' reference frame?"] },
                { type: "summary", points: ["Every velocity is measured relative to a reference frame; different frames give different, equally valid velocities.", r`Chain velocities with matching inner subscripts: $v_{\text{AC}} = v_{\text{AB}} + v_{\text{BC}}$; reversing the subscripts flips the sign.`, r`B as seen by A: $v_{\text{BA}} = v_{\text{BG}} - v_{\text{AG}}$, with every velocity signed.`, "In two dimensions relative velocities add as vectors: head to tail, or by components.", "Perpendicular components are independent: a boat aimed straight across crosses in width ÷ across speed, whatever the current; the current only adds drift."] },
              ],
            },
          ],
        },
        {
          id: "physics-1.u1.projectile-motion",
          title: "Motion in two dimensions: projectiles",
          description: "Objects moving through the air under gravity alone. Split the motion into a constant-velocity horizontal part and a free-fall vertical part that share the same clock.",
          objectives: [
            { id: "physics-1.o.1h", code: "PHYS-1.K", description: "Analyse projectile motion by treating horizontal and vertical motion independently, for horizontal and angled launches, to determine time of flight, maximum height, range and velocity.", skillIds: [S("projectile-horizontal"), S("projectile-angled")] },
          ],
          lessons: [
            {
              id: "physics-1.l.projectiles-horizontal",
              title: "Projectiles: two motions at once",
              summary: "Why a projectile's horizontal and vertical motions are independent, and how to use that to analyse anything launched horizontally.",
              estMinutes: 17,
              skillIds: [S("projectile-horizontal")],
              blocks: [
                { type: "text", md: r`A **projectile** is an object moving through the air with only gravity acting on it: a ball rolling off a table, a stone skimmed off a cliff, a long-jumper in mid-air. Its path is curved, which looks like a hard two-dimensional problem.

The key idea of this topic turns it into two easy one-dimensional problems. Throughout, ignore air resistance unless a problem says otherwise, and use $g = 9.8\,\text{m/s}^2$.` },
                { type: "callout", tone: "key", title: "Two motions, one clock", md: r`Split the projectile's motion into components:

- **Horizontal**: nothing acts sideways, so $a_x = 0$. The horizontal velocity $v_x$ stays the same for the whole flight.
- **Vertical**: gravity gives $a_y = -9.8\,\text{m/s}^2$ (taking up as positive), exactly the free fall you met with the constant-acceleration equations.

The two motions do not affect each other. The only thing they share is **time**: the projectile spends the same number of seconds moving sideways as it does falling.` },
                { type: "formula", latex: r`x = x_0 + v_{0x}t \qquad v_x = v_{0x}`, caption: "Horizontal: constant velocity, because there is no horizontal acceleration." },
                { type: "formula", latex: r`y = y_0 + v_{0y}t - \tfrac12 g t^2 \qquad v_y = v_{0y} - g t`, caption: "Vertical: free fall with up as positive (a_y = −g, where g = 9.8 m/s²)." },
                { type: "text", md: r`## Dropped or launched, they land together

Picture two identical balls at the edge of a table. At the same instant one is simply dropped and the other is flicked horizontally off the edge.

Vertically, the two balls are identical: both start with **zero vertical velocity**, from the same height, with the same downward acceleration. So at every instant they are at the same height, and they hit the floor together. The flicked ball also moves sideways, but that horizontal motion has no effect on how fast it falls.` },
                { type: "check", questionId: Q("ph-1"), lead: "Predict before you calculate anything." },
                { type: "callout", tone: "warning", title: "The horizontal velocity does not run out", md: r`Cartoon characters run off a cliff, hang in the air, then drop straight down. Real projectiles do not. With no air resistance there is nothing to slow the sideways motion, so a projectile keeps the same horizontal velocity all the way to the ground. A parcel released from a plane flying at constant velocity stays directly below the plane as it falls, because both keep the same horizontal velocity.` },
                {
                  type: "worked_example",
                  title: "Off the edge of a table",
                  problem: r`A toy car rolls off a horizontal tabletop $0.441\,\text{m}$ high at $2.0\,\text{m/s}$. Find (a) how long it takes to reach the floor, (b) how far from the foot of the table it lands and (c) its velocity just before landing.`,
                  steps: [
                    { title: "Set up two columns", md: r`Origin at the table edge, up and forward positive. Horizontal: $v_{0x} = 2.0\,\text{m/s}$, $a_x = 0$. Vertical: $v_{0y} = 0$ (it leaves horizontally), $a_y = -9.8\,\text{m/s}^2$, and it lands at $y = -0.441\,\text{m}$.` },
                    { title: "(a) Time from the vertical motion", md: r`$y = v_{0y}t - \tfrac12gt^2$ gives $-0.441 = 0 - 4.9t^2$, so $t^2 = 0.090\,\text{s}^2$ and $t = 0.30\,\text{s}$.` },
                    { title: "(b) Distance from the horizontal motion", md: r`$x = v_{0x}t = (2.0\,\text{m/s})(0.30\,\text{s}) = 0.60\,\text{m}$.` },
                    { title: "(c) Landing velocity: combine the components", md: r`$v_x = 2.0\,\text{m/s}$ (unchanged). $v_y = 0 - (9.8)(0.30) = -2.94\,\text{m/s}$. Speed: $\sqrt{2.0^2 + 2.94^2} \approx 3.6\,\text{m/s}$, at $\tan^{-1}(2.94/2.0) \approx 56^\circ$ below the horizontal.` },
                  ],
                  answer: r`(a) $0.30\,\text{s}$; (b) $0.60\,\text{m}$; (c) about $3.6\,\text{m/s}$ at $56^\circ$ below the horizontal`,
                },
                { type: "callout", tone: "tip", title: "Organise every projectile problem in two columns", md: r`| Horizontal | Vertical |
|---|---|
| $a_x = 0$ | $a_y = -9.8\,\text{m/s}^2$ |
| $v_{0x}$ | $v_{0y}$ |
| $\Delta x$ | $\Delta y$ |

Time $t$ belongs to both columns. Usually the vertical column has enough information to find $t$; then carry $t$ across to the horizontal column.` },
                { type: "check", questionId: Q("ph-2"), lead: "Which column gives you the time?" },
                { type: "callout", tone: "key", title: "Height sets the time; launch speed sets the distance", md: r`For a horizontal launch from height $h$ onto level ground, the vertical motion alone fixes the time in the air:

$$h = \tfrac12 g t^2 \quad\Longrightarrow\quad t = \sqrt{\frac{2h}{g}}$$

The launch speed does not appear. Throw twice as fast from the same height and the object stays up for the same time, so it lands twice as far away.` },
                { type: "note_prompt", prompt: "Explain to a friend why a ball dropped from a table and a ball rolled off the same table land at the same time. Use the words horizontal, vertical and independent.", suggestedTitle: "Independence of horizontal and vertical motion", starter: "**Horizontal motion**: \n**Vertical motion**: \n**What they share**: \n\nWhy the dropped and rolled balls land together: \n\nLinks: [[Horizontally launched projectiles]] [[Constant-acceleration equations]]" },
                { type: "summary", points: ["A projectile moves under gravity alone; ignore air resistance unless told otherwise.", r`Horizontally: $a_x = 0$, so $v_x$ is constant for the whole flight.`, r`Vertically: free fall with $a_y = -9.8\,\text{m/s}^2$ (up positive); a horizontal launch starts with $v_{0y} = 0$.`, "The two motions are independent and share only the time; find t from one column and use it in the other.", r`From height $h$, $t = \sqrt{2h/g}$ whatever the launch speed; a faster launch only lands farther away.`] },
              ],
            },
            {
              id: "physics-1.l.projectiles-angled",
              title: "Projectiles launched at an angle",
              summary: "Resolve the launch velocity, follow the vertical velocity up through zero and back down, and find the time to the top, maximum height, time of flight and range.",
              estMinutes: 18,
              skillIds: [S("projectile-angled")],
              blocks: [
                { type: "text", md: r`A ball kicked or thrown upward at an angle starts with velocity in both directions at once. Everything from the last lesson still applies (constant horizontal velocity, free fall vertically, a shared clock), with one new first step: **resolve the launch velocity into components.**` },
                { type: "formula", latex: r`v_{0x} = v_0\cos\theta \qquad v_{0y} = v_0\sin\theta`, caption: "Launch speed v₀ at angle θ above the horizontal." },
                { type: "callout", tone: "warning", title: "The vertical launch velocity is neither zero nor v₀", md: r`For a horizontal launch $v_{0y} = 0$, but an angled launch starts with an upward velocity $v_{0y} = v_0\sin\theta$. Using $0$ (copying the horizontal-launch method) or the whole launch speed $v_0$ in the vertical equations are the two most common errors in this topic. Resolve first, every time.` },
                { type: "text", md: r`## Following the velocity through the flight

Take a launch with $v_{0x} = 15\,\text{m/s}$ and $v_{0y} = 19.6\,\text{m/s}$ over level ground. Each second the vertical velocity drops by $9.8\,\text{m/s}$; the horizontal velocity never changes.

| $t$ (s) | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| $v_x$ (m/s) | 15 | 15 | 15 | 15 | 15 |
| $v_y$ (m/s) | $+19.6$ | $+9.8$ | $0$ | $-9.8$ | $-19.6$ |

On the way up the ball slows vertically; at $t = 2\,\text{s}$ it reaches the top; on the way down the vertical velocity grows again in the downward direction. The pattern is symmetric about the top.` },
                { type: "callout", tone: "key", title: "What is zero at the top, and what is not", md: r`At the highest point:

- the **vertical velocity is zero**: that is what "stopped rising" means;
- the **horizontal velocity is not zero**: it is still $v_{0x}$, so the ball is moving sideways at its slowest speed of the flight;
- the **acceleration is not zero**: it is $9.8\,\text{m/s}^2$ downward, as at every other point. Gravity does not switch off at the top; it is what turns the motion from rising to falling.` },
                { type: "check", questionId: Q("pa-1"), lead: "Velocity, components and acceleration at the peak." },
                {
                  type: "worked_example",
                  title: "A kicked ball over level ground",
                  problem: r`A ball is kicked from level ground at $20\,\text{m/s}$, at an angle $\theta$ above the horizontal with $\sin\theta = 0.60$ and $\cos\theta = 0.80$ (about $37^\circ$). Find (a) the time to reach the top, (b) the maximum height, (c) the total time in the air and (d) the range.`,
                  steps: [
                    { title: "Resolve the launch velocity", md: r`$v_{0x} = (20)(0.80) = 16\,\text{m/s}$; $\;v_{0y} = (20)(0.60) = 12\,\text{m/s}$ upward.` },
                    { title: "(a) Top of the path: v_y = 0", md: r`$0 = v_{0y} - gt = 12 - 9.8t$, so $t_{\text{top}} = \dfrac{12}{9.8} \approx 1.22\,\text{s}$.` },
                    { title: "(b) Maximum height", md: r`Use the equation without time: $v_y^2 = v_{0y}^2 - 2g\,\Delta y$ gives $0 = 12^2 - 2(9.8)H$, so $H = \dfrac{144}{19.6} \approx 7.3\,\text{m}$.` },
                    { title: "(c) Time in the air: back to y = 0", md: r`$0 = 12t - 4.9t^2 = t(12 - 4.9t)$, so $t = 0$ (the kick) or $t = \dfrac{12}{4.9} \approx 2.45\,\text{s}$. That is exactly twice the time to the top.` },
                    { title: "(d) Range: horizontal column", md: r`$\Delta x = v_{0x}t = (16\,\text{m/s})(2.45\,\text{s}) \approx 39\,\text{m}$.` },
                  ],
                  answer: r`(a) $1.22\,\text{s}$; (b) $7.3\,\text{m}$; (c) $2.45\,\text{s}$; (d) about $39\,\text{m}$`,
                },
                { type: "callout", tone: "tip", title: "Symmetry over level ground", md: r`When a projectile lands at the same height it was launched from:

- the time going up equals the time coming down, so the total time is $2t_{\text{top}}$;
- it lands with the same speed it was launched with, at the same angle **below** the horizontal as its launch angle above it.

These are useful checks, but they hold **only** for equal launch and landing heights.` },
                { type: "check", questionId: Q("pa-2"), lead: "Resolve first, then use the vertical column." },
                { type: "text", md: r`## Launch angle and range

For a fixed launch speed over level ground:

- a steeper launch gives a larger $v_{0y}$, so the projectile goes **higher** and stays up **longer**, but its smaller $v_{0x}$ carries it sideways more slowly;
- the two effects balance best at $45^\circ$, which gives the greatest range;
- **complementary angles** (such as $30^\circ$ and $60^\circ$) give the same range: the steeper one trades horizontal speed for extra time in the air.` },
                { type: "callout", tone: "warning", title: "Launch and landing at different heights", md: r`If the projectile lands below or above its launch point (thrown from a cliff, or onto a roof), the symmetry shortcuts and the "45° is best" rule no longer hold. Go back to the vertical position equation, $y = y_0 + v_{0y}t - \tfrac12gt^2$, put in the landing height with its sign, and solve the quadratic for $t$. Keep the positive root.` },
                { type: "tutor_prompt", prompts: ["Why isn't the acceleration zero at the top of a projectile's path?", "Why do 30° and 60° launches land at the same place?", "How do I find the time of flight when the ball is thrown from a cliff?"] },
                { type: "summary", points: [r`Resolve first: $v_{0x} = v_0\cos\theta$, $v_{0y} = v_0\sin\theta$. The vertical launch velocity is neither $0$ nor $v_0$.`, r`$v_x$ is constant; $v_y$ falls by $9.8\,\text{m/s}$ each second, passing through zero at the top.`, r`At the top, $v_y = 0$ but $v_x \neq 0$, and the acceleration is still $9.8\,\text{m/s}^2$ downward.`, r`Time to the top: $t = v_{0y}/g$. Maximum height from $0 = v_{0y}^2 - 2gH$. Range $= v_{0x} \times$ time of flight.`, "Over level ground the flight is symmetric and 45° gives the greatest range; for different launch and landing heights, solve the vertical position equation."] },
              ],
            },
          ],
        },
      ],
    },
  ],

  questions: physicsQuestions,

  // Guided path per topic: lessons, then that topic's exercises and topic quiz. Quiz 1 closes the
  // one-dimensional half (after "Analyzing motion data"), Quiz 2 closes the unit (after projectiles),
  // and the unit test (no topicId) comes last. The ids of the original quizzes, test and exam sets are
  // live in databases and the demo seed: never rename them.
  assessments: [
    // ── Position, displacement and velocity ──
    EX("displacement-distance", "physics-1.u1.position-velocity", "Find displacement and distance", "Signed displacements, total distance and multi-leg trips, from descriptions, number lines and tables."),
    EX("average-velocity", "physics-1.u1.position-velocity", "Calculate average velocity and speed", "Total over total: average velocity from displacement, average speed from distance, and what the sign of a velocity means."),
    {
      id: "physics-1.quiz.motion-basics",
      kind: "skill_quiz",
      title: "Topic quiz: position, displacement and velocity",
      description: "Six questions on position and displacement, distance travelled, and average and instantaneous velocity. No hints.",
      unitId: "physics-1.u1",
      topicId: "physics-1.u1.position-velocity",
      questionIds: [Q("pd-2"), Q("dd-2"), Q("dd-3"), Q("avs-2"), Q("avs-3"), Q("vsd-2")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    // ── Acceleration and motion graphs ──
    EX("acceleration-signs", "physics-1.u1.acceleration-graphs", "Calculate acceleration and read its sign", "Acceleration from changes in velocity, with signs and units, and deciding from the signs of v and a whether an object speeds up or slows down."),
    EX("motion-diagrams", "physics-1.u1.acceleration-graphs", "Draw and read motion diagrams", "Dot spacing, velocity arrows and the direction of the acceleration arrow, including turnarounds."),
    EX("velocity-graph-displacement", "physics-1.u1.acceleration-graphs", "Find displacement from velocity graphs", "Areas of rectangles, triangles and trapezoids under velocity–time graphs, area below the axis, and displacement versus distance."),
    EX("connect-graphs", "physics-1.u1.acceleration-graphs", "Connect position, velocity and acceleration graphs", "Slopes going down the chain, areas going up it, and picking out graphs that describe the same motion."),
    {
      id: "physics-1.quiz.acceleration-graphs",
      kind: "lesson_quiz",
      title: "Topic quiz: acceleration and motion graphs",
      description: "Six questions on acceleration, speeding up versus slowing down, and reading position–time and velocity–time graphs. No hints.",
      unitId: "physics-1.u1",
      topicId: "physics-1.u1.acceleration-graphs",
      questionIds: [Q("ac-3"), Q("ss-2"), Q("ss-3"), Q("xt-3"), Q("vt-3"), Q("vt-4")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    // ── Constant-acceleration motion ──
    EX("choose-equation", "physics-1.u1.constant-acceleration", "Choose the right constant-acceleration equation", "List the knowns with signs, name the unknown and pick the equation that leaves out the rest."),
    EX("constant-acceleration-calc", "physics-1.u1.constant-acceleration", "Solve constant-acceleration problems", "Velocities, displacements, times and stopping distances for motion with constant acceleration."),
    EX("multi-stage", "physics-1.u1.constant-acceleration", "Solve multi-stage and turnaround problems", "Motion in stages, turnaround times and positions, catching up, and distance through a turnaround."),
    // ── Free fall ──
    EX("free-fall-reasoning", "physics-1.u1.t.free-fall", "Reason about free fall", "Same acceleration for every mass, acceleration on the way up, at the top and down, symmetry, and the velocity–time graph of a throw."),
    EX("free-fall-calc", "physics-1.u1.t.free-fall", "Calculate free-fall motion", "Drops, upward and downward throws, maximum heights and launches from a height, with up positive."),
    // ── Analyzing motion data ──
    EX("data-tables", "physics-1.u1.t.motion-data", "Read motion data tables", "Velocities and accelerations from tables of measurements, and testing for constant velocity or constant acceleration."),
    EX("linearize", "physics-1.u1.t.motion-data", "Linearize data to find acceleration", "Choose axes that make the data straight, turn slopes into accelerations, and predict how quantities scale."),
    {
      id: "physics-1.quiz.u1.1",
      kind: "skill_quiz",
      title: "Quiz 1: motion along a line",
      description: "Eight questions covering the first half of the unit: velocity, acceleration, motion diagrams and graphs, constant acceleration, free fall and motion data. 12 minutes, no hints.",
      unitId: "physics-1.u1",
      topicId: "physics-1.u1.t.motion-data",
      questionIds: [Q("u1.quiz1-1"), Q("u1.quiz1-2"), Q("u1.quiz1-3"), Q("u1.quiz1-4"), Q("u1.quiz1-5"), Q("u1.quiz1-6"), Q("u1.quiz1-7"), Q("u1.quiz1-8")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 12 * 60 },
    },
    // ── Scalars, vectors and components ──
    EX("vector-addition", "physics-1.u1.vectors", "Classify and add vectors", "Scalar or vector, sums along a line and at right angles, the possible sizes of a resultant, and changes in a vector."),
    EX("resolve-components", "physics-1.u1.vectors", "Resolve vectors into components", "Sine or cosine from a sketch, angles measured from either axis, and signs of components in every quadrant."),
    EX("add-components", "physics-1.u1.vectors", "Add vectors by components", "Add two or three vectors by components, then find the magnitude and direction of the resultant."),
    {
      id: "physics-1.quiz.vectors",
      kind: "skill_quiz",
      title: "Topic quiz: scalars, vectors and components",
      description: "Six questions on scalars and vectors, adding vectors, and working with components. No hints.",
      unitId: "physics-1.u1",
      topicId: "physics-1.u1.vectors",
      questionIds: [Q("sv-3"), Q("sv-4"), Q("sv-7"), Q("vc-3"), Q("vc-4"), Q("vc-5")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    // ── Reference frames and relative motion ──
    EX("relative-1d", "physics-1.u1.relative-motion", "Find relative velocity along a line", "Walkways, trains, overtaking and head-on approaches: combine velocities with signs and find meeting times."),
    EX("boats-planes", "physics-1.u1.relative-motion", "Boats in currents and planes in wind", "Add perpendicular relative velocities: crossing times, drift, aiming upstream and flying into a crosswind."),
    {
      id: "physics-1.quiz.relative-motion",
      kind: "skill_quiz",
      title: "Topic quiz: reference frames and relative motion",
      description: "Six questions on relative velocity along a line and in two dimensions. No hints.",
      unitId: "physics-1.u1",
      topicId: "physics-1.u1.relative-motion",
      questionIds: [Q("rv-3"), Q("rv-4"), Q("rv-5"), Q("rv2-3"), Q("rv2-4"), Q("rv2-5")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    // ── Motion in two dimensions: projectiles ──
    EX("horizontal-launch", "physics-1.u1.projectile-motion", "Solve horizontal-launch problems", "Time from the height, distance from the launch speed, and landing velocity, for objects launched horizontally."),
    EX("angled-launch", "physics-1.u1.projectile-motion", "Find angled-launch quantities", "Resolve the launch velocity, then find the time to the top, maximum height, time of flight and range."),
    EX("projectile-graphs", "physics-1.u1.projectile-motion", "Read projectile components and graphs", "Which of x, y, vx, vy and the accelerations change during a flight, and how their graphs and tables look."),
    {
      id: "physics-1.quiz.projectiles",
      kind: "lesson_quiz",
      title: "Topic quiz: projectile motion",
      description: "Six questions on horizontal and angled launches. No hints.",
      unitId: "physics-1.u1",
      topicId: "physics-1.u1.projectile-motion",
      questionIds: [Q("ph-3"), Q("ph-4"), Q("ph-5"), Q("pa-3"), Q("pa-4"), Q("pa-5")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    {
      id: "physics-1.quiz.u1.2",
      kind: "skill_quiz",
      title: "Quiz 2: vectors, relative motion and projectiles",
      description: "Seven questions covering the second half of the unit: vectors and components, relative velocity and projectile motion. 11 minutes, no hints.",
      unitId: "physics-1.u1",
      topicId: "physics-1.u1.projectile-motion",
      questionIds: [Q("u1.quiz2-1"), Q("u1.quiz2-2"), Q("u1.quiz2-3"), Q("u1.quiz2-4"), Q("u1.quiz2-5"), Q("u1.quiz2-6"), Q("u1.quiz2-7")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 11 * 60 },
    },
    // ── Unit level ──
    {
      id: "physics-1.test.u1-kinematics",
      kind: "unit_test",
      title: "Unit 1 test: kinematics",
      description: "Nineteen questions, 45 minutes. Covers the whole unit: motion along a line, motion diagrams and graphs, constant acceleration and free fall, motion data, vectors and components, relative motion, and projectile motion.",
      unitId: "physics-1.u1",
      questionIds: [
        Q("pd-3"), Q("dd-4"), Q("avs-4"), Q("vsd-3"), Q("ac-4"), Q("ss-4"), Q("xt-4"), Q("vt-5"), Q("ke-3"), Q("ke-4"),
        Q("sv-5"), Q("vc-6"), Q("rv-6"), Q("rv2-6"), Q("ph-6"), Q("pa-6"),
        Q("u1.test-1"), Q("u1.test-2"), Q("u1.test-3"),
      ],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 45 * 60 },
    },
    // ── Full-course practice (no unitId) ──
    {
      id: "physics-1.exam.set-1",
      kind: "exam_practice",
      title: "AP-style practice set: motion along a line",
      description: "Eight original AP-style items on one-dimensional kinematics under exam-like timing (2 minutes per question).",
      questionIds: [Q("avs-5"), Q("vsd-4"), Q("ac-6"), Q("ss-5"), Q("xt-5"), Q("vt-6"), Q("ke-5"), Q("ke-6")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 16 * 60 },
    },
    {
      id: "physics-1.exam.set-2",
      kind: "exam_practice",
      title: "AP-style practice set: vectors and motion in two dimensions",
      description: "Eight original AP-style items on vectors, relative motion and projectile motion under exam-like timing (2 minutes per question).",
      questionIds: [Q("sv-6"), Q("vc-7"), Q("rv-7"), Q("rv2-7"), Q("ph-7"), Q("ph-8"), Q("pa-7"), Q("pa-8")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 16 * 60 },
    },
  ],

  simulations: [
    {
      id: "motion-lab",
      name: "Motion Lab",
      purpose: "Connect a moving object to its position–time and velocity–time graphs for motion with constant acceleration, and compare displacement with distance travelled, especially through a turnaround.",
      variables: [
        { name: "Initial position x₀ (m)", description: "Where the object is at t = 0" },
        { name: "Initial velocity v₀ (m/s)", description: "How fast, and in which direction, the object is moving at t = 0" },
        { name: "Acceleration a (m/s²)", description: "The constant rate at which the velocity changes" },
        { name: "Duration (s)", description: "How long the motion runs; the time scrubber moves within this interval" },
      ],
      outputs: ["Object moving along a track", "Position–time graph", "Velocity–time graph", "Live readouts of t, x, v, displacement and distance travelled", "Table of the constant-acceleration equations evaluated at the current time"],
      skillIds: [S("distance-vs-displacement"), S("speeding-slowing"), S("xt-graphs"), S("vt-graphs"), S("kinematic-equations")],
      accessibilityAlternative: "Every value shown on the track and graphs (time, position, velocity, displacement and distance travelled) is also given as a text readout and in the equation table, which update as the time changes; the time scrubber and the parameter sliders are keyboard-operable.",
    },
  ],
};
