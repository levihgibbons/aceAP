/**
 * AP Physics 1: Algebra-Based — pilot sequence: Unit 1, Kinematics
 * (motion along a straight line).
 *
 * Original AceAP instructional content. The unit title follows College Board's
 * published unit name (see content/catalog/ap-catalog.json); objective codes
 * ("PHYS-1.C") are AceAP's own and are not College Board codes.
 *
 * Algebra-based throughout: slopes and areas of graphs, no calculus notation.
 * Free-fall examples use g = 9.8 m/s² with up as the positive direction.
 */
import { defineCourse } from "@/modules/content/schema";
import { physicsQuestions } from "./physics-1.questions";

const r = String.raw;
const S = (id: string) => `physics-1.${id}`;
const Q = (id: string) => `physics-1.q.${id}`;
const M = (id: string) => `physics-1.m.${id}`;

export default defineCourse({
  courseId: "physics-1",
  version: {
    id: "physics-1@2025",
    label: "Aligned to the AP Physics 1: Algebra-Based course framework (current in 2025–26)",
    alignmentSourceUrl: "https://apcentral.collegeboard.org/courses/ap-physics-1",
    alignmentNotes:
      "The unit name matches the published course outline. Topics, objectives, lessons and questions are original AceAP content written to address one-dimensional kinematics; they do not reproduce College Board text. Vectors, two-dimensional motion and projectile motion are not yet written.",
  },
  provenance: {
    author: "AceAP curriculum team",
    origin: "ai_assisted_original",
    reviewedBy: "Automated answer validation; human subject-matter review pending",
    notes: "Every numeric answer and answer key is machine-checked by content:validate.",
  },

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
      patternLabels: { "slope-acceleration": "Acceleration from the slope", "area-displacement": "Displacement from the area", "shape-to-motion": "Shape to motion", "area-below-axis": "Area below the axis", "axis-crossing": "Crossing the time axis", "interpret-all": "Reading everything from one graph" },
    },
    {
      id: S("kinematic-equations"),
      name: "Constant-acceleration equations",
      description: "Choose and apply the three constant-acceleration equations, including turnaround points and free fall.",
      difficulty: 4,
      keywords: ["kinematic equations", "constant acceleration", "v = v0 + at", "x = x0 + v0 t + 1/2 a t^2", "v^2 = v0^2 + 2 a delta x", "which kinematic equation to use", "free fall", "g = 9.8", "stopping distance", "turnaround point", "thrown straight up"],
      prerequisites: [S("speeding-slowing"), S("vt-graphs")],
      patternLabels: { "velocity-time": "Velocity after a time", "position-time": "Position after a time", "stopping-distance": "Stopping distance", "free-fall": "Free fall", proportional: "Proportional reasoning", "choose-equation": "Choosing an equation", turnaround: "Motion Lab: turnaround", "sim-readout": "Motion Lab: position" },
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
  ],

  units: [
    {
      id: "physics-1.u1",
      number: 1,
      title: "Kinematics",
      description: "Describing motion with position, velocity and acceleration. AceAP's pilot covers motion along a straight line; vectors, two-dimensional motion and projectile motion are not yet written.",
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
          ],
        },
        {
          id: "physics-1.u1.constant-acceleration",
          title: "Constant-acceleration motion",
          description: "Three equations that predict position and velocity whenever the acceleration is constant, including free fall.",
          objectives: [
            { id: "physics-1.o.1e", code: "PHYS-1.E", description: "Select and apply the constant-acceleration equations to predict position, velocity and time for motion along a line, including free fall.", skillIds: [S("kinematic-equations")] },
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
      ],
    },
  ],

  questions: physicsQuestions,

  assessments: [
    {
      id: "physics-1.quiz.motion-basics",
      kind: "skill_quiz",
      title: "Quiz: position, displacement and velocity",
      description: "Six questions on position and displacement, distance travelled, and average and instantaneous velocity. No hints.",
      unitId: "physics-1.u1",
      topicId: "physics-1.u1.position-velocity",
      questionIds: [Q("pd-2"), Q("dd-2"), Q("dd-3"), Q("avs-2"), Q("avs-3"), Q("vsd-2")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    {
      id: "physics-1.quiz.acceleration-graphs",
      kind: "lesson_quiz",
      title: "Quiz: acceleration and motion graphs",
      description: "Six questions on acceleration, speeding up versus slowing down, and reading position–time and velocity–time graphs. No hints.",
      unitId: "physics-1.u1",
      topicId: "physics-1.u1.acceleration-graphs",
      questionIds: [Q("ac-3"), Q("ss-2"), Q("ss-3"), Q("xt-3"), Q("vt-3"), Q("vt-4")],
      config: { feedback: "after_submit", assistance: "disabled" },
    },
    {
      id: "physics-1.test.u1-kinematics",
      kind: "unit_test",
      title: "Unit 1 test: one-dimensional kinematics",
      description: "Ten questions, 25 minutes. Covers motion along a straight line — the part of Unit 1 AceAP currently teaches. Vectors, two-dimensional motion and projectile motion are not included.",
      unitId: "physics-1.u1",
      questionIds: [Q("pd-3"), Q("dd-4"), Q("avs-4"), Q("vsd-3"), Q("ac-4"), Q("ss-4"), Q("xt-4"), Q("vt-5"), Q("ke-3"), Q("ke-4")],
      config: { feedback: "after_submit", assistance: "disabled", timeLimitSeconds: 25 * 60 },
    },
    {
      id: "physics-1.exam.set-1",
      kind: "exam_practice",
      title: "AP-style practice set: motion along a line",
      description: "Eight original AP-style items on one-dimensional kinematics under exam-like timing (2 minutes per question).",
      questionIds: [Q("avs-5"), Q("vsd-4"), Q("ac-6"), Q("ss-5"), Q("xt-5"), Q("vt-6"), Q("ke-5"), Q("ke-6")],
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
});
