/**
 * AP Physics 1 — question bank for the pilot sequence (Unit 1, Kinematics:
 * motion along a straight line). All items are original AceAP content; none
 * are College Board questions. Answers are checked by `npm run content:validate`.
 *
 * Conventions used throughout: SI units; one stated positive direction per
 * item; free-fall items use g = 9.8 m/s² with up as positive (so a = −9.8 m/s²).
 */
import type { AuthoredQuestionInput } from "@/modules/content/schema";

const r = String.raw;
const S = (id: string) => `physics-1.${id}`;
const M = (id: string) => `physics-1.m.${id}`;
/** Motion Lab stimulus: 1-D constant acceleration with the given starting values. */
const LAB = (x0: number, v0: number, a: number, duration: number) => ({ simulation: { id: "motion-lab", params: { x0, v0, a, duration } } });

export const physicsQuestions: AuthoredQuestionInput[] = [
  // ─────────────────────── Position and displacement ───────────────────────
  {
    id: "physics-1.q.pd-1",
    skillIds: [S("position-displacement")],
    difficulty: 1,
    pattern: "compute-displacement",
    estSeconds: 45,
    prompt: r`A cart on a straight track moves from position $x_i = 2\,\text{m}$ to position $x_f = -5\,\text{m}$. What is the cart's displacement?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$-3\,\text{m}$`, rationale: "This adds the two positions. Displacement is the final position minus the initial position." },
        { id: "b", text: r`$+7\,\text{m}$`, misconception: M("sign-direction"), rationale: "Right size, wrong sign. The cart ends on the negative side of where it started, so its displacement is negative." },
        { id: "c", text: r`$-7\,\text{m}$`, rationale: r`$\Delta x = x_f - x_i = -5 - 2 = -7\,\text{m}$: seven metres in the negative direction.` },
        { id: "d", text: r`$-5\,\text{m}$`, rationale: "That is the final position. Displacement is how much the position changed, so the starting position matters too." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Displacement is the change in position: final position minus initial position.", r`Compute $\Delta x = x_f - x_i = (-5\,\text{m}) - (2\,\text{m})$.`],
    solution: r`$\Delta x = x_f - x_i = (-5\,\text{m}) - (2\,\text{m}) = -7\,\text{m}$. The negative sign says the cart ended $7\,\text{m}$ from its starting point in the negative direction.`,
  },
  {
    id: "physics-1.q.pd-2",
    skillIds: [S("position-displacement")],
    difficulty: 2,
    pattern: "final-position",
    estSeconds: 60,
    prompt: r`A hallway robot uses a coordinate system with the origin at its charging dock and the positive direction pointing north. It starts at $x_i = +4\,\text{m}$ and then undergoes a displacement of $\Delta x = -9\,\text{m}$.

What is the robot's final position?`,
    body: {
      type: "numeric",
      answer: -5,
      tolerance: { abs: 0.01 },
      unit: "m",
      commonErrors: [
        { value: 13, misconception: M("sign-direction"), note: "Adding 9 m treats the displacement as northward. A negative displacement moves the robot south." },
        { value: 5, misconception: M("sign-direction"), note: "The size is right, but the robot has passed the dock and is now on the south (negative) side of the origin." },
      ],
    },
    hints: [r`Rearrange $\Delta x = x_f - x_i$ to get $x_f = x_i + \Delta x$.`, r`Add the signed numbers: $x_f = 4\,\text{m} + (-9\,\text{m})$.`],
    solution: r`$x_f = x_i + \Delta x = 4\,\text{m} + (-9\,\text{m}) = -5\,\text{m}$. The robot ends $5\,\text{m}$ south of the dock.`,
  },
  {
    id: "physics-1.q.pd-3",
    skillIds: [S("position-displacement")],
    difficulty: 3,
    pattern: "origin-shift",
    estSeconds: 90,
    prompt: r`Arjun and Bea watch the same person walk along a straight corridor. Both call east the positive direction, but Arjun puts his origin at a doorway and Bea puts hers $3\,\text{m}$ east of that doorway.

The person walks from the doorway to a point $5\,\text{m}$ east of the doorway. How do Arjun's and Bea's descriptions compare?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "They agree about both the positions and the displacement.", rationale: "Positions are measured from the origin, and their origins are in different places, so the position values differ." },
        { id: "b", text: r`They disagree about the positions, but both find a displacement of $+5\,\text{m}$.`, rationale: r`Arjun: $0 \to +5\,\text{m}$. Bea: $-3\,\text{m} \to +2\,\text{m}$. Both changes are $+5\,\text{m}$.` },
        { id: "c", text: r`They disagree about both: Bea finds a displacement of $+2\,\text{m}$.`, rationale: r`$+2\,\text{m}$ is Bea's value for the final position. Her displacement is $2 - (-3) = +5\,\text{m}$.` },
        { id: "d", text: r`They disagree about both: Bea finds a displacement of $-3\,\text{m}$.`, rationale: r`$-3\,\text{m}$ is Bea's value for the starting position, not a change in position.` },
      ],
      correctChoiceId: "b",
    },
    hints: ["Write down the starting and ending positions each observer would record.", r`For Bea the doorway is at $x = -3\,\text{m}$ and the end point is at $x = +2\,\text{m}$. Now subtract.`],
    solution: r`Arjun records $x_i = 0$ and $x_f = +5\,\text{m}$. Bea's origin is $3\,\text{m}$ further east, so she records $x_i = -3\,\text{m}$ and $x_f = +2\,\text{m}$. The positions differ, but $\Delta x = +5\,\text{m}$ for both. Moving the origin shifts every position by the same amount, and that shift cancels when you subtract.`,
  },
  {
    id: "physics-1.q.pd-4",
    skillIds: [S("position-displacement")],
    difficulty: 2,
    pattern: "sign-meaning",
    estSeconds: 90,
    prompt: "An object moves along a horizontal track whose positive direction points to the right. Select **all** of the statements that are correct.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "A negative position means the object is to the left of the origin." },
        { id: "b", text: "A negative displacement means the object ended up to the left of where it started." },
        { id: "c", text: "A negative displacement means the object ended up at a negative position.", misconception: M("sign-direction"), rationale: r`The sign of a displacement gives the direction of the change, not which side of the origin the object is on. Moving from $x = 9\,\text{m}$ to $x = 6\,\text{m}$ is a displacement of $-3\,\text{m}$ that ends at a positive position.` },
        { id: "d", text: "An object can have a positive position and a negative displacement." },
        { id: "e", text: "The displacement between two moments depends on where the origin is placed.", rationale: "Moving the origin changes both positions by the same amount, so their difference is unchanged." },
      ],
      correctChoiceIds: ["a", "b", "d"],
    },
    hints: ["Keep two questions separate: “where is it?” (position) and “how did its position change?” (displacement).", r`Test each statement with an example such as moving from $x = 9\,\text{m}$ to $x = 6\,\text{m}$.`],
    solution: r`Position sign tells you the side of the origin (a ✓). Displacement sign tells you the direction of the change (b ✓). They are independent: going from $9\,\text{m}$ to $6\,\text{m}$ gives a negative displacement at a positive position (d ✓, c ✗). Displacement is a difference of positions, so the choice of origin cancels out (e ✗).`,
  },
  {
    id: "physics-1.q.pd-5",
    skillIds: [S("position-displacement")],
    difficulty: 2,
    pattern: "position-table",
    estSeconds: 75,
    prompt: r`The table gives the position of a model train on a straight track at four times.

| $t$ (s) | 0 | 2 | 4 | 6 |
|---|---|---|---|---|
| $x$ (m) | 3 | 8 | 1 | $-4$ |

What is the train's displacement between $t = 2\,\text{s}$ and $t = 6\,\text{s}$?`,
    body: {
      type: "numeric",
      answer: -12,
      tolerance: { abs: 0.01 },
      unit: "m",
      commonErrors: [{ value: 12, misconception: M("sign-direction"), note: "The size is right, but this subtracts in the wrong order. Final minus initial gives a negative displacement here." }],
    },
    hints: [r`Only two entries matter: the position at $t = 2\,\text{s}$ and the position at $t = 6\,\text{s}$.`, r`$\Delta x = x(6\,\text{s}) - x(2\,\text{s}) = (-4\,\text{m}) - (8\,\text{m})$.`],
    solution: r`$\Delta x = x(6\,\text{s}) - x(2\,\text{s}) = -4\,\text{m} - 8\,\text{m} = -12\,\text{m}$. What happened in between (and where the train was at $t = 0$) does not affect the displacement for this interval.`,
  },

  // ─────────────────────── Distance vs displacement ────────────────────────
  {
    id: "physics-1.q.dd-1",
    skillIds: [S("distance-vs-displacement")],
    difficulty: 1,
    pattern: "out-and-back",
    estSeconds: 45,
    prompt: r`A swimmer swims one length of a $25\,\text{m}$ pool, turns, and swims back to the starting wall. For the whole swim, what are the distance travelled and the displacement?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`Distance $50\,\text{m}$; displacement $50\,\text{m}$`, misconception: M("distance-is-displacement"), rationale: "Displacement compares only the start and end positions, and here they are the same place." },
        { id: "b", text: r`Distance $50\,\text{m}$; displacement $0\,\text{m}$`, rationale: "Every metre swum counts toward distance, but the swimmer finishes where she started, so the position has not changed." },
        { id: "c", text: r`Distance $0\,\text{m}$; displacement $50\,\text{m}$`, rationale: "These are swapped: distance adds up the whole path, displacement is the net change in position." },
        { id: "d", text: r`Distance $0\,\text{m}$; displacement $0\,\text{m}$`, misconception: M("distance-is-displacement"), rationale: "The displacement is zero, but the swimmer certainly covered ground: distance never cancels." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Distance asks “how much ground was covered?” Displacement asks “how far, and which way, is the end from the start?”", "Where does the swimmer finish compared with where she began?"],
    solution: r`Distance adds both lengths: $25\,\text{m} + 25\,\text{m} = 50\,\text{m}$. The swimmer ends at the starting wall, so $\Delta x = x_f - x_i = 0$.`,
  },
  {
    id: "physics-1.q.dd-2",
    skillIds: [S("distance-vs-displacement")],
    difficulty: 2,
    pattern: "total-distance",
    estSeconds: 60,
    prompt: r`A line-following robot on a straight track moves $8\,\text{m}$ to the right and then $11\,\text{m}$ to the left. What total **distance** does it travel?`,
    body: {
      type: "numeric",
      answer: 19,
      tolerance: { abs: 0.01 },
      unit: "m",
      commonErrors: [
        { value: 3, misconception: M("distance-is-displacement"), note: "3 m is how far the robot ends from its start. Distance adds every metre of the path, whichever way it points." },
        { value: -3, misconception: M("distance-is-displacement"), note: "−3 m is the displacement (taking right as positive). Distance is the total path length and is never negative." },
      ],
    },
    hints: ["Distance ignores direction: add the length of every leg.", r`$8\,\text{m} + 11\,\text{m}$.`],
    solution: r`Distance $= 8\,\text{m} + 11\,\text{m} = 19\,\text{m}$. (Its displacement, with right as positive, is $8 - 11 = -3\,\text{m}$: a different quantity.)`,
  },
  {
    id: "physics-1.q.dd-3",
    skillIds: [S("distance-vs-displacement"), S("position-displacement")],
    difficulty: 2,
    pattern: "net-displacement",
    estSeconds: 75,
    prompt: r`A supply cart moves along a straight north–south hallway. Taking north as positive, it travels $14\,\text{m}$ north, then $20\,\text{m}$ south, then $4\,\text{m}$ north.

What is the cart's **displacement** for the whole trip?`,
    body: {
      type: "numeric",
      answer: -2,
      tolerance: { abs: 0.01 },
      unit: "m",
      commonErrors: [
        { value: 38, misconception: M("distance-is-displacement"), note: "38 m is the total distance. For displacement, southward legs count as negative." },
        { value: 2, misconception: M("sign-direction"), note: "The size is right, but the cart ends south of its start, and south is the negative direction here." },
      ],
    },
    hints: ["Give each leg a sign: north is positive, south is negative.", r`Add the signed legs: $(+14) + (-20) + (+4)$.`],
    solution: r`$\Delta x = (+14\,\text{m}) + (-20\,\text{m}) + (+4\,\text{m}) = -2\,\text{m}$: the cart ends $2\,\text{m}$ south of where it began, even though it travelled $38\,\text{m}$ in total.`,
  },
  {
    id: "physics-1.q.dd-4",
    skillIds: [S("distance-vs-displacement")],
    difficulty: 3,
    pattern: "concept",
    estSeconds: 75,
    prompt: "An object moves along a straight line during some time interval. Which statement is **always** true?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The distance travelled equals the magnitude of the displacement.", misconception: M("distance-is-displacement"), rationale: "This holds only if the object never reverses direction during the interval." },
        { id: "b", text: "The magnitude of the displacement is greater than or equal to the distance travelled.", rationale: "It is the other way round: backtracking adds to distance but cancels in displacement." },
        { id: "c", text: "If the displacement is zero, the distance travelled is zero.", misconception: M("distance-is-displacement"), rationale: "Any round trip has zero displacement and a non-zero distance." },
        { id: "d", text: "The distance travelled is greater than or equal to the magnitude of the displacement.", rationale: "They are equal when the object never turns around; any reversal makes the distance larger." },
      ],
      correctChoiceId: "d",
    },
    hints: ["Think about what happens to each quantity when the object turns around and retraces part of its path.", "Compare a one-way trip with a round trip."],
    solution: "With no reversal, the distance equals the size of the displacement. Each time the object doubles back, the distance keeps growing while the displacement shrinks. So distance ≥ |displacement| always, with equality only for motion in a single direction.",
  },
  {
    id: "physics-1.q.dd-5",
    skillIds: [S("distance-vs-displacement"), S("kinematic-equations")],
    difficulty: 3,
    pattern: "sim-readout",
    estSeconds: 150,
    prompt: r`In the Motion Lab below, set the initial position to $x_0 = 0\,\text{m}$, the initial velocity to $v_0 = 6\,\text{m/s}$ and the acceleration to $a = -2\,\text{m/s}^2$. Run the motion, then move the time scrubber to $t = 5\,\text{s}$.

What total **distance** has the object travelled by $t = 5\,\text{s}$?`,
    stimulus: LAB(0, 6, -2, 6),
    body: {
      type: "numeric",
      answer: 13,
      tolerance: { abs: 0.3 },
      unit: "m",
      commonErrors: [{ value: 5, misconception: M("distance-is-displacement"), note: "5 m is the displacement at t = 5 s. The object went out 9 m and then came back 4 m, and both legs count toward distance." }],
    },
    hints: ["Watch the object on the track: does it keep moving in one direction for the whole 5 s? Compare the “displacement” and “distance travelled” readouts.", r`It turns around at $t = 3\,\text{s}$, where $x = 9\,\text{m}$. Add the outward leg to the return leg.`],
    solution: r`The velocity $v = 6 - 2t$ reaches zero at $t = 3\,\text{s}$, where $x = 6(3) + \tfrac12(-2)(3)^2 = 9\,\text{m}$. At $t = 5\,\text{s}$, $x = 6(5) + \tfrac12(-2)(5)^2 = 5\,\text{m}$. The object travelled $9\,\text{m}$ out and $9 - 5 = 4\,\text{m}$ back: distance $= 13\,\text{m}$, while the displacement is only $+5\,\text{m}$.`,
  },

  // ─────────────────── Average velocity and average speed ──────────────────
  {
    id: "physics-1.q.avs-1",
    skillIds: [S("average-velocity-speed")],
    difficulty: 1,
    pattern: "compute-average-velocity",
    estSeconds: 60,
    prompt: r`A cyclist on a straight path is at $x = 40\,\text{m}$ at $t = 0$ and at $x = 10\,\text{m}$ at $t = 6\,\text{s}$. What is the cyclist's average velocity for this interval?`,
    body: {
      type: "numeric",
      answer: -5,
      tolerance: { abs: 0.05 },
      unit: "m/s",
      commonErrors: [{ value: 5, misconception: M("speed-for-velocity"), note: "5 m/s is the average speed. The cyclist moved in the negative direction, so the average velocity is negative." }],
    },
    hints: [r`Average velocity is displacement divided by elapsed time: $v_{\text{avg}} = \dfrac{\Delta x}{\Delta t}$.`, r`$\Delta x = 10\,\text{m} - 40\,\text{m} = -30\,\text{m}$ and $\Delta t = 6\,\text{s}$.`],
    solution: r`$v_{\text{avg}} = \dfrac{\Delta x}{\Delta t} = \dfrac{10\,\text{m} - 40\,\text{m}}{6\,\text{s}} = -5\,\text{m/s}$. The negative sign means the cyclist travelled in the negative direction.`,
  },
  {
    id: "physics-1.q.avs-2",
    skillIds: [S("average-velocity-speed"), S("distance-vs-displacement")],
    difficulty: 2,
    pattern: "compare-velocity-speed",
    estSeconds: 100,
    prompt: r`A runner jogs $400\,\text{m}$ east along a straight road in $100\,\text{s}$, then immediately turns around and jogs $100\,\text{m}$ west in $50\,\text{s}$. For the whole $150\,\text{s}$, what are the runner's average velocity and average speed?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`Average velocity $3.3\,\text{m/s}$ east; average speed $3.3\,\text{m/s}$`, misconception: M("speed-for-velocity"), rationale: "Average velocity uses displacement (300 m east), not the 500 m of ground covered." },
        { id: "b", text: r`Average velocity $2.0\,\text{m/s}$ east; average speed $2.0\,\text{m/s}$`, misconception: M("distance-is-displacement"), rationale: "Average speed uses the total distance, 500 m, not the 300 m displacement." },
        { id: "c", text: r`Average velocity $2.0\,\text{m/s}$ east; average speed $3.3\,\text{m/s}$`, rationale: r`$\dfrac{300\,\text{m}}{150\,\text{s}}$ east and $\dfrac{500\,\text{m}}{150\,\text{s}}$.` },
        { id: "d", text: r`Average velocity $3.0\,\text{m/s}$ east; average speed $3.0\,\text{m/s}$`, misconception: M("average-of-speeds"), rationale: "This averages the two leg speeds (4 m/s and 2 m/s). The legs took different times, so the simple mean is not the average." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Find two totals first: the displacement and the distance.", r`Displacement $= 400 - 100 = 300\,\text{m}$ east; distance $= 400 + 100 = 500\,\text{m}$. Divide each by $150\,\text{s}$.`],
    solution: r`Displacement: $400\,\text{m} - 100\,\text{m} = 300\,\text{m}$ east, so $v_{\text{avg}} = \dfrac{300\,\text{m}}{150\,\text{s}} = 2.0\,\text{m/s}$ east. Distance: $400\,\text{m} + 100\,\text{m} = 500\,\text{m}$, so average speed $= \dfrac{500\,\text{m}}{150\,\text{s}} \approx 3.3\,\text{m/s}$.`,
  },
  {
    id: "physics-1.q.avs-3",
    skillIds: [S("average-velocity-speed")],
    difficulty: 3,
    pattern: "distance-legs",
    estSeconds: 120,
    prompt: r`A toy train travels in one direction along a straight track. It covers the first $60\,\text{m}$ at a steady $3.0\,\text{m/s}$ and the next $60\,\text{m}$ at a steady $6.0\,\text{m/s}$.

What is the train's average speed for the whole $120\,\text{m}$?`,
    body: {
      type: "numeric",
      answer: 4,
      tolerance: { abs: 0.05 },
      unit: "m/s",
      commonErrors: [{ value: 4.5, misconception: M("average-of-speeds"), note: "4.5 m/s is the mean of the two speeds. The train spends twice as long on the slow section, so the slow speed counts for more." }],
    },
    hints: ["Average speed is total distance divided by total time, so you need the time for each section.", r`First section: $\dfrac{60\,\text{m}}{3.0\,\text{m/s}} = 20\,\text{s}$. Second section: $\dfrac{60\,\text{m}}{6.0\,\text{m/s}} = 10\,\text{s}$.`],
    solution: r`Times: $\dfrac{60}{3.0} = 20\,\text{s}$ and $\dfrac{60}{6.0} = 10\,\text{s}$, a total of $30\,\text{s}$. Average speed $= \dfrac{120\,\text{m}}{30\,\text{s}} = 4.0\,\text{m/s}$. It is below the simple mean ($4.5\,\text{m/s}$) because the train spends more time moving slowly.`,
  },
  {
    id: "physics-1.q.avs-4",
    skillIds: [S("average-velocity-speed"), S("distance-vs-displacement")],
    difficulty: 3,
    pattern: "round-trip",
    estSeconds: 90,
    prompt: r`A delivery robot leaves its dock, travels back and forth along a straight corridor, and arrives back at the dock $80\,\text{s}$ later. Its wheel sensor shows it covered $120\,\text{m}$ in total. Which pair of values describes the whole trip?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`Average velocity $0\,\text{m/s}$; average speed $1.5\,\text{m/s}$`, rationale: "The robot ends where it began, so its displacement is zero, but it covered 120 m in 80 s." },
        { id: "b", text: r`Average velocity $1.5\,\text{m/s}$; average speed $1.5\,\text{m/s}$`, misconception: M("speed-for-velocity"), rationale: "Average velocity is displacement over time, and the displacement for a round trip is zero." },
        { id: "c", text: r`Average velocity $0\,\text{m/s}$; average speed $0\,\text{m/s}$`, misconception: M("distance-is-displacement"), rationale: "Average speed uses distance, which does not cancel when the robot turns around." },
        { id: "d", text: r`Average velocity $1.5\,\text{m/s}$; average speed $0\,\text{m/s}$`, rationale: "These are swapped: the displacement is zero, the distance is 120 m." },
      ],
      correctChoiceId: "a",
    },
    hints: ["What is the robot's displacement if it finishes where it started?", r`Average velocity $= \dfrac{0}{80\,\text{s}}$; average speed $= \dfrac{120\,\text{m}}{80\,\text{s}}$.`],
    solution: r`The robot returns to the dock, so $\Delta x = 0$ and $v_{\text{avg}} = 0$. Average speed $= \dfrac{120\,\text{m}}{80\,\text{s}} = 1.5\,\text{m/s}$. An average velocity of zero does not mean the object stood still.`,
  },
  {
    id: "physics-1.q.avs-5",
    skillIds: [S("average-velocity-speed")],
    difficulty: 3,
    pattern: "timed-legs",
    estSeconds: 120,
    prompt: r`A sled on a straight, level track moves at a constant $+5.0\,\text{m/s}$ for $4.0\,\text{s}$, then at a constant $-2.0\,\text{m/s}$ for $6.0\,\text{s}$. (Ignore the brief time it takes to reverse.)

What is the sled's average velocity for the whole $10\,\text{s}$?`,
    body: {
      type: "numeric",
      answer: 0.8,
      tolerance: { abs: 0.02 },
      unit: "m/s",
      commonErrors: [
        { value: 3.2, misconception: M("speed-for-velocity"), note: "3.2 m/s is the average speed (32 m of path in 10 s). Average velocity uses the net displacement, 8 m." },
        { value: 1.5, misconception: M("average-of-speeds"), note: "Averaging +5.0 and −2.0 directly ignores that the second leg lasted longer. Use total displacement over total time." },
        { value: 3.5, misconception: M("average-of-speeds"), note: "This is the mean of the two speeds. Average velocity is total displacement divided by total time." },
      ],
    },
    hints: [r`Find the displacement during each leg with $\Delta x = v\,\Delta t$, keeping the signs.`, r`$\Delta x = (+5.0)(4.0) + (-2.0)(6.0) = 20 - 12 = +8\,\text{m}$.`],
    solution: r`Leg 1: $(+5.0\,\text{m/s})(4.0\,\text{s}) = +20\,\text{m}$. Leg 2: $(-2.0\,\text{m/s})(6.0\,\text{s}) = -12\,\text{m}$. Net displacement $= +8\,\text{m}$ in $10\,\text{s}$, so $v_{\text{avg}} = \dfrac{8\,\text{m}}{10\,\text{s}} = +0.8\,\text{m/s}$.`,
  },
  {
    id: "physics-1.q.avs-6",
    skillIds: [S("average-velocity-speed"), S("distance-vs-displacement")],
    difficulty: 3,
    pattern: "sim-readout",
    estSeconds: 150,
    prompt: r`In the Motion Lab below, set $x_0 = -5\,\text{m}$, $v_0 = 8\,\text{m/s}$ and $a = -2\,\text{m/s}^2$, with a duration of at least $8\,\text{s}$. Run the motion and move the scrubber to $t = 8\,\text{s}$.

Use the readouts to find the object's **average speed** over the first $8\,\text{s}$.`,
    stimulus: LAB(-5, 8, -2, 8),
    body: {
      type: "numeric",
      answer: 4,
      tolerance: { abs: 0.1 },
      unit: "m/s",
      commonErrors: [{ value: 0, misconception: M("speed-for-velocity"), note: "Zero is the average velocity: the object is back at x = −5 m, so its displacement is zero. Average speed uses the distance travelled, 32 m." }],
    },
    hints: ["Average speed needs the “distance travelled” readout, not the displacement readout.", r`At $t = 8\,\text{s}$ the distance travelled is $32\,\text{m}$. Divide by the elapsed time.`],
    solution: r`The object moves from $x = -5\,\text{m}$ out to $x = 11\,\text{m}$ (turning around at $t = 4\,\text{s}$) and back to $x = -5\,\text{m}$ at $t = 8\,\text{s}$: a distance of $16 + 16 = 32\,\text{m}$. Average speed $= \dfrac{32\,\text{m}}{8\,\text{s}} = 4\,\text{m/s}$. Its average velocity over the same interval is zero, because the displacement is zero.`,
  },

  // ───────────────────── Velocity: sign and direction ──────────────────────
  {
    id: "physics-1.q.vsd-1",
    skillIds: [S("velocity-sign-direction")],
    difficulty: 1,
    pattern: "sign-meaning",
    estSeconds: 45,
    prompt: r`On a straight road the positive $x$-direction points east. At one instant a car's velocity is $-15\,\text{m/s}$. Which statement describes the car at that instant?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`It is moving west at $15\,\text{m/s}$.`, rationale: "The sign of a velocity gives the direction of motion; its size gives the speed." },
        { id: "b", text: r`It is moving east at $15\,\text{m/s}$.`, misconception: M("sign-direction"), rationale: "East is the positive direction, so an eastbound car would have a positive velocity." },
        { id: "c", text: "It is located west of the origin.", misconception: M("sign-direction"), rationale: "That would be a negative position. Velocity says which way the car is moving, not where it is." },
        { id: "d", text: "It is moving east and slowing down.", rationale: "A velocity value alone cannot tell you whether the speed is changing; that takes acceleration. The negative sign only gives the direction, west." },
      ],
      correctChoiceId: "a",
    },
    hints: ["For velocity, the sign is the direction and the size is the speed.", "Which direction is negative in this coordinate system?"],
    solution: r`East is positive, so a negative velocity means motion toward the west. The speed is the magnitude, $15\,\text{m/s}$. The sign says nothing about where the car is or whether its speed is changing.`,
  },
  {
    id: "physics-1.q.vsd-2",
    skillIds: [S("velocity-sign-direction")],
    difficulty: 2,
    pattern: "compare-speeds",
    estSeconds: 60,
    prompt: r`Two carts move on the same straight track. Cart A has velocity $+3\,\text{m/s}$ and cart B has velocity $-5\,\text{m/s}$. Which statement is correct?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`Cart A is moving faster, because $+3$ is greater than $-5$.`, misconception: M("sign-direction"), rationale: "The sign of a velocity is a direction label, not a size. Compare the magnitudes to compare speeds." },
        { id: "b", text: "Cart B is slowing down, because its velocity is negative.", rationale: "A negative velocity only says B moves in the negative direction. Nothing here says its speed is changing." },
        { id: "c", text: "Cart B is behind cart A on the track.", rationale: "Velocities do not tell you positions. Either cart could be anywhere on the track." },
        { id: "d", text: "Cart B is moving faster, in the direction opposite to cart A.", rationale: r`Speeds are $5\,\text{m/s}$ and $3\,\text{m/s}$, and the opposite signs mean opposite directions.` },
      ],
      correctChoiceId: "d",
    },
    hints: ["Speed is the magnitude of velocity.", r`Compare $|+3|$ with $|-5|$, then use the signs for the directions.`],
    solution: r`Speed is the magnitude of velocity: A moves at $3\,\text{m/s}$ and B at $5\,\text{m/s}$, so B is faster. The opposite signs mean they travel in opposite directions.`,
  },
  {
    id: "physics-1.q.vsd-3",
    skillIds: [S("velocity-sign-direction"), S("average-velocity-speed")],
    difficulty: 3,
    pattern: "position-table",
    estSeconds: 120,
    prompt: r`A beetle walks along a ruler. Its position is recorded once per second.

| $t$ (s) | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| $x$ (cm) | 6 | 9 | 9 | 4 | $-1$ |

Select **all** of the statements that are correct.`,
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: r`Between $t = 0$ and $t = 1\,\text{s}$ the beetle's average velocity is positive.` },
        { id: "b", text: r`Between $t = 1\,\text{s}$ and $t = 2\,\text{s}$ the beetle's average velocity is zero.` },
        { id: "c", text: r`Between $t = 2\,\text{s}$ and $t = 3\,\text{s}$ the beetle's average velocity is $-5\,\text{cm/s}$.` },
        { id: "d", text: r`The beetle's average velocity first becomes negative in the interval from $t = 3\,\text{s}$ to $t = 4\,\text{s}$, when its position becomes negative.`, misconception: M("sign-direction"), rationale: "The sign of velocity depends on the direction of motion, not on the sign of the position. The beetle is already moving in the negative direction between 2 s and 3 s, while its position is still positive." },
        { id: "e", text: r`The beetle moves faster between $t = 3\,\text{s}$ and $t = 4\,\text{s}$ than between $t = 2\,\text{s}$ and $t = 3\,\text{s}$.`, rationale: "Both intervals have a displacement of −5 cm in 1 s, so the average speed is the same." },
      ],
      correctChoiceIds: ["a", "b", "c"],
    },
    hints: [r`For each one-second interval, compute $\Delta x = x_f - x_i$. Its sign is the sign of the average velocity.`, r`The changes are $+3$, $0$, $-5$ and $-5\,\text{cm}$.`],
    solution: r`The displacements in successive seconds are $+3$, $0$, $-5$ and $-5\,\text{cm}$, so the average velocities are $+3$, $0$, $-5$ and $-5\,\text{cm/s}$. Statements a, b and c are correct. The velocity is negative from $t = 2\,\text{s}$ onward, even while the position is still positive (d ✗), and the last two intervals have equal speeds (e ✗).`,
  },
  {
    id: "physics-1.q.vsd-4",
    skillIds: [S("velocity-sign-direction"), S("average-velocity-speed")],
    difficulty: 3,
    pattern: "instantaneous-estimate",
    estSeconds: 110,
    prompt: r`A ball rolls along a straight ramp, speeding up. A motion sensor records these positions:

| $t$ (s) | 1.00 | 1.10 | 2.00 |
|---|---|---|---|
| $x$ (m) | 2.00 | 2.31 | 5.00 |

Which value is the best estimate of the ball's **instantaneous** velocity at $t = 1.00\,\text{s}$?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$3.0\,\text{m/s}$`, rationale: "This is the average velocity over the full second from 1.00 s to 2.00 s. The ball is speeding up, so a long interval overestimates the velocity at its start." },
        { id: "b", text: r`$3.1\,\text{m/s}$`, rationale: "The average velocity over the shortest available interval starting at 1.00 s is the closest stand-in for the velocity at that instant." },
        { id: "c", text: r`$2.0\,\text{m/s}$`, rationale: "This divides the position by the clock reading. Velocity comes from a change in position over a change in time." },
        { id: "d", text: r`$2.1\,\text{m/s}$`, rationale: "This divides the position at 1.10 s by 1.10 s. Use the change in position, not the position itself." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Instantaneous velocity is what the average velocity approaches as the time interval shrinks around the instant.", r`Use the shortest interval that starts at $t = 1.00\,\text{s}$: from $1.00\,\text{s}$ to $1.10\,\text{s}$.`],
    solution: r`Over the short interval from $1.00\,\text{s}$ to $1.10\,\text{s}$: $v_{\text{avg}} = \dfrac{2.31\,\text{m} - 2.00\,\text{m}}{0.10\,\text{s}} = 3.1\,\text{m/s}$. The shorter the interval, the less the velocity can change during it, so this is the best available estimate of the velocity at $t = 1.00\,\text{s}$.`,
  },
  {
    id: "physics-1.q.vsd-5",
    skillIds: [S("velocity-sign-direction")],
    difficulty: 2,
    pattern: "describe-motion",
    estSeconds: 90,
    prompt: "A cart moves on a horizontal track whose positive direction points to the right. Match each description of the cart's velocity with the motion it represents.",
    body: {
      type: "matching",
      left: [
        { id: "l1", text: r`$v = +4\,\text{m/s}$ throughout` },
        { id: "l2", text: r`$v = -4\,\text{m/s}$ throughout` },
        { id: "l3", text: r`$v = 0$ throughout` },
        { id: "l4", text: r`$v$ changes steadily from $+4\,\text{m/s}$ to $-4\,\text{m/s}$` },
      ],
      right: [
        { id: "r1", text: "Moving right at a steady speed" },
        { id: "r2", text: "Moving left at a steady speed" },
        { id: "r3", text: "At rest" },
        { id: "r4", text: "Moving right, stopping for an instant, then moving left" },
      ],
      pairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
    },
    hints: ["The sign of the velocity is the direction of motion; right is positive here.", "When a velocity changes from positive to negative it must pass through zero on the way."],
    solution: r`Positive velocity is motion to the right and negative velocity is motion to the left; the size ($4\,\text{m/s}$) is the speed. Zero velocity means at rest. A velocity that falls from $+4\,\text{m/s}$ through zero to $-4\,\text{m/s}$ describes a cart that moves right, stops for an instant and then moves left.`,
  },

  // ───────────────────────────── Acceleration ──────────────────────────────
  {
    id: "physics-1.q.ac-1",
    skillIds: [S("acceleration-concept")],
    difficulty: 1,
    pattern: "compute-acceleration",
    estSeconds: 60,
    prompt: r`A scooter moving in the positive direction increases its velocity from $+4\,\text{m/s}$ to $+16\,\text{m/s}$ in $3.0\,\text{s}$. What is its average acceleration?`,
    body: {
      type: "numeric",
      answer: 4,
      tolerance: { abs: 0.05 },
      unit: "m/s²",
      commonErrors: [{ value: -4, misconception: M("sign-direction"), note: "This subtracts in the wrong order. The change in velocity is final minus initial: 16 − 4 = +12 m/s." }],
    },
    hints: [r`Acceleration is the change in velocity divided by the time taken: $a_{\text{avg}} = \dfrac{\Delta v}{\Delta t}$.`, r`$\Delta v = 16\,\text{m/s} - 4\,\text{m/s} = 12\,\text{m/s}$, over $3.0\,\text{s}$.`],
    solution: r`$a_{\text{avg}} = \dfrac{\Delta v}{\Delta t} = \dfrac{16\,\text{m/s} - 4\,\text{m/s}}{3.0\,\text{s}} = 4\,\text{m/s}^2$. Each second, the velocity grows by $4\,\text{m/s}$.`,
  },
  {
    id: "physics-1.q.ac-2",
    skillIds: [S("acceleration-concept")],
    difficulty: 2,
    pattern: "zero-velocity",
    estSeconds: 75,
    prompt: "A ball is thrown straight up and air resistance is negligible. At the very top of its path, which statement about the ball is correct?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Its velocity is zero and its acceleration is zero.", misconception: M("zero-velocity-zero-accel"), rationale: "If the acceleration were zero at the top, the velocity would stay zero and the ball would hang there. The velocity is still changing at that instant." },
        { id: "b", text: r`Its velocity is zero and its acceleration is $9.8\,\text{m/s}^2$ upward.`, misconception: M("sign-direction"), rationale: "The ball's velocity is changing from upward to downward, so the acceleration points downward." },
        { id: "c", text: r`Its velocity is zero and its acceleration is $9.8\,\text{m/s}^2$ downward.`, rationale: "The ball is momentarily at rest, but its velocity is changing at the same rate as everywhere else in the flight." },
        { id: "d", text: r`Its velocity is $9.8\,\text{m/s}$ downward and its acceleration is zero.`, rationale: "At the top the ball is momentarily at rest; 9.8 is the size of its acceleration in m/s², not a velocity." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Velocity is how fast position changes. Acceleration is how fast velocity changes. Ask the two questions separately.", "Just before the top the velocity is slightly upward; just after, slightly downward. Is the velocity changing at the top?"],
    solution: r`At the top the ball stops for an instant, so $v = 0$. But its velocity is passing from upward values to downward values, changing by $9.8\,\text{m/s}$ every second throughout the flight, so the acceleration is $9.8\,\text{m/s}^2$ downward at the top as well. Zero velocity does not imply zero acceleration.`,
  },
  {
    id: "physics-1.q.ac-3",
    skillIds: [S("acceleration-concept")],
    difficulty: 2,
    pattern: "direction-change",
    estSeconds: 90,
    prompt: r`A cart on a track (positive direction to the right) has velocity $+6\,\text{m/s}$. After $4.0\,\text{s}$ of constant acceleration its velocity is $-10\,\text{m/s}$. What is the cart's acceleration?`,
    body: {
      type: "numeric",
      answer: -4,
      tolerance: { abs: 0.05 },
      unit: "m/s²",
      commonErrors: [
        { value: 4, misconception: M("sign-direction"), note: "The size is right, but the velocity became more negative, so the change in velocity (and the acceleration) is negative." },
        { value: 1, misconception: M("sign-direction"), note: "This uses the speeds (10 − 6). The cart reversed direction, so the velocity changed by −10 − (+6) = −16 m/s." },
        { value: -1, misconception: M("sign-direction"), note: "This adds the velocities instead of subtracting: Δv = v_f − v_i = −10 − (+6) = −16 m/s." },
      ],
    },
    hints: [r`Keep the signs: $\Delta v = v_f - v_i$.`, r`$\Delta v = (-10\,\text{m/s}) - (+6\,\text{m/s}) = -16\,\text{m/s}$, over $4.0\,\text{s}$.`],
    solution: r`$a = \dfrac{\Delta v}{\Delta t} = \dfrac{(-10\,\text{m/s}) - (+6\,\text{m/s})}{4.0\,\text{s}} = \dfrac{-16\,\text{m/s}}{4.0\,\text{s}} = -4\,\text{m/s}^2$. The velocity goes $+6, +2, -2, -6, -10\,\text{m/s}$ at one-second steps: down by $4\,\text{m/s}$ each second.`,
  },
  {
    id: "physics-1.q.ac-4",
    skillIds: [S("acceleration-concept")],
    difficulty: 2,
    pattern: "meaning-units",
    estSeconds: 75,
    prompt: r`An object moving along a straight line has a constant acceleration of $-3\,\text{m/s}^2$. What does this tell you?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`Every second, the object's velocity changes by $-3\,\text{m/s}$.`, rationale: "Acceleration is the change in velocity per unit of time: (m/s) per second." },
        { id: "b", text: r`Every second, the object's position changes by $-3\,\text{m}$.`, rationale: "A steady change in position each second describes a velocity of −3 m/s, not an acceleration." },
        { id: "c", text: "The object must be slowing down.", misconception: M("negative-accel-slowing"), rationale: "Whether it slows down depends on the direction of its velocity. If the velocity is also negative, the object is speeding up." },
        { id: "d", text: "The object must be moving in the negative direction.", misconception: M("sign-direction"), rationale: "The sign of the acceleration is the direction of the change in velocity, not the direction of motion." },
      ],
      correctChoiceId: "a",
    },
    hints: [r`Read the unit aloud: metres per second, per second.`, "Acceleration describes how the velocity changes, not how the position changes and not which way the object moves."],
    solution: r`$a = -3\,\text{m/s}^2$ means the velocity changes by $-3\,\text{m/s}$ during each second: for example $+7 \to +4 \to +1 \to -2\,\text{m/s}$. On its own it does not tell you the direction of motion or whether the object is speeding up; those depend on the velocity as well.`,
  },
  {
    id: "physics-1.q.ac-5",
    skillIds: [S("acceleration-concept")],
    difficulty: 3,
    pattern: "rank",
    estSeconds: 120,
    prompt: r`Four carts move along the same straight track. Each cart's velocity changes steadily over a $2.0\,\text{s}$ interval as described. Rank the carts by acceleration, from **most negative** to **most positive**.`,
    body: {
      type: "ordering",
      items: [
        { id: "A", text: r`Cart A: $+2\,\text{m/s}$ to $+10\,\text{m/s}$` },
        { id: "B", text: r`Cart B: $-8\,\text{m/s}$ to $-2\,\text{m/s}$` },
        { id: "C", text: r`Cart C: $+5\,\text{m/s}$ to $+1\,\text{m/s}$` },
        { id: "D", text: r`Cart D: $-3\,\text{m/s}$ to $-9\,\text{m/s}$` },
      ],
      correctOrder: ["D", "C", "B", "A"],
    },
    hints: [r`For each cart compute $\Delta v = v_f - v_i$ with signs, then divide by $2.0\,\text{s}$.`, r`Cart B's velocity goes from $-8$ to $-2\,\text{m/s}$: that is a change of $+6\,\text{m/s}$, a positive acceleration.`],
    solution: r`A: $\dfrac{10 - 2}{2.0} = +4\,\text{m/s}^2$. B: $\dfrac{-2 - (-8)}{2.0} = +3\,\text{m/s}^2$. C: $\dfrac{1 - 5}{2.0} = -2\,\text{m/s}^2$. D: $\dfrac{-9 - (-3)}{2.0} = -3\,\text{m/s}^2$. From most negative to most positive: D, C, B, A. Notice that B is slowing down with a positive acceleration and D is speeding up with a negative one.`,
  },
  {
    id: "physics-1.q.ac-6",
    skillIds: [S("acceleration-concept"), S("speeding-slowing")],
    difficulty: 4,
    pattern: "velocity-table",
    estSeconds: 120,
    prompt: r`The velocity of a glider on a straight air track is recorded each second.

| $t$ (s) | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| $v$ (m/s) | $-6$ | $-4$ | $-2$ | 0 | $+2$ |

Which statement about the glider's acceleration is supported by the data?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`It is zero at $t = 3\,\text{s}$, because the glider is momentarily at rest.`, misconception: M("zero-velocity-zero-accel"), rationale: "The velocity is zero at 3 s, but it is still changing by +2 m/s each second through that instant." },
        { id: "b", text: r`It is negative for the first $3\,\text{s}$ and positive afterwards, matching the sign of the velocity.`, misconception: M("sign-direction"), rationale: "Acceleration has its own sign, set by how the velocity changes. Here the velocity increases throughout." },
        { id: "c", text: r`It is $-2\,\text{m/s}^2$ for the first $3\,\text{s}$, because the glider is slowing down.`, misconception: M("negative-accel-slowing"), rationale: "Slowing down does not require a negative acceleration. The glider slows because its acceleration (positive) is opposite to its velocity (negative)." },
        { id: "d", text: r`It is $+2\,\text{m/s}^2$ for the whole $4\,\text{s}$, including the instant when the velocity is zero.`, rationale: "The velocity rises by 2 m/s in every one-second interval, before, at and after the instant it passes through zero." },
      ],
      correctChoiceId: "d",
    },
    hints: ["Work out the change in velocity during each one-second interval, keeping signs.", r`From $-6$ to $-4$ is a change of $+2\,\text{m/s}$. Is every interval the same?`],
    solution: r`Each second the velocity changes by $+2\,\text{m/s}$ ($-6 \to -4 \to -2 \to 0 \to +2$), so $a = +2\,\text{m/s}^2$ throughout. For the first $3\,\text{s}$ the glider moves in the negative direction and slows down, because $a$ and $v$ have opposite signs. At $t = 3\,\text{s}$ it is momentarily at rest while its acceleration is still $+2\,\text{m/s}^2$; afterwards it speeds up in the positive direction.`,
  },

  // ─────────────────────── Speeding up or slowing down ─────────────────────
  {
    id: "physics-1.q.ss-1",
    skillIds: [S("speeding-slowing")],
    difficulty: 2,
    pattern: "sign-analysis",
    estSeconds: 60,
    prompt: r`At a certain instant an object moving along a straight line has velocity $-8\,\text{m/s}$ and acceleration $-2\,\text{m/s}^2$. At that instant the object is`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "moving in the negative direction and slowing down.", misconception: M("negative-accel-slowing"), rationale: "A negative acceleration slows an object only when its velocity is positive. Here both point the same way." },
        { id: "b", text: "moving in the negative direction and speeding up.", rationale: "Velocity and acceleration have the same sign, so the speed is increasing." },
        { id: "c", text: "moving in the positive direction and slowing down.", misconception: M("sign-direction"), rationale: "The velocity is negative, so the motion is in the negative direction." },
        { id: "d", text: "momentarily at rest.", rationale: "Its velocity is −8 m/s, not zero." },
      ],
      correctChoiceId: "b",
    },
    hints: ["The sign of the velocity gives the direction of motion.", "Compare the signs of velocity and acceleration: same sign means speeding up, opposite signs mean slowing down."],
    solution: r`The velocity is negative, so the object moves in the negative direction. The acceleration is also negative, so one second later the velocity is $-10\,\text{m/s}$: the speed has grown from $8$ to $10\,\text{m/s}$. Same signs mean speeding up.`,
  },
  {
    id: "physics-1.q.ss-2",
    skillIds: [S("speeding-slowing")],
    difficulty: 3,
    pattern: "classify",
    estSeconds: 100,
    prompt: "Match each combination of velocity and acceleration with the motion it describes at that instant.",
    body: {
      type: "matching",
      left: [
        { id: "l1", text: r`$v = +5\,\text{m/s}$, $a = +2\,\text{m/s}^2$` },
        { id: "l2", text: r`$v = +5\,\text{m/s}$, $a = -2\,\text{m/s}^2$` },
        { id: "l3", text: r`$v = -5\,\text{m/s}$, $a = -2\,\text{m/s}^2$` },
        { id: "l4", text: r`$v = -5\,\text{m/s}$, $a = +2\,\text{m/s}^2$` },
      ],
      right: [
        { id: "r1", text: "Moving in the positive direction, speeding up" },
        { id: "r2", text: "Moving in the positive direction, slowing down" },
        { id: "r3", text: "Moving in the negative direction, speeding up" },
        { id: "r4", text: "Moving in the negative direction, slowing down" },
      ],
      pairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
    },
    hints: ["Use the sign of v for the direction of motion.", "Then compare signs: v and a alike means speeding up; v and a opposite means slowing down."],
    solution: r`The sign of $v$ sets the direction. Same signs ($+,+$ or $-,-$) mean the speed increases; opposite signs ($+,-$ or $-,+$) mean it decreases. So $(+5, +2)$: positive direction, speeding up; $(+5, -2)$: positive direction, slowing down; $(-5, -2)$: negative direction, speeding up; $(-5, +2)$: negative direction, slowing down.`,
  },
  {
    id: "physics-1.q.ss-3",
    skillIds: [S("speeding-slowing")],
    difficulty: 3,
    pattern: "scenario",
    estSeconds: 75,
    prompt: "A car is travelling west along a straight road when the driver applies the brakes. Taking **east** as the positive direction, what are the signs of the car's velocity and acceleration while it brakes?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Velocity negative; acceleration negative", misconception: M("negative-accel-slowing"), rationale: "Braking does not automatically mean a negative acceleration. If both were negative, the westbound car would be speeding up." },
        { id: "b", text: "Velocity positive; acceleration negative", misconception: M("sign-direction"), rationale: "The car is moving west, which is the negative direction here, so its velocity is negative." },
        { id: "c", text: "Velocity negative; acceleration positive", rationale: "Westward motion is negative, and to slow down the acceleration must point the opposite way: east, which is positive." },
        { id: "d", text: "Velocity positive; acceleration positive", rationale: "The car moves west (negative), and same-sign velocity and acceleration would mean speeding up." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Start with the velocity: which way is the car moving, and is that the positive or negative direction?", "To slow down, the acceleration must point opposite to the velocity."],
    solution: "The car moves west, the negative direction, so its velocity is negative. Slowing down requires an acceleration opposite to the velocity, so the acceleration points east: positive. This is a case of slowing down with a positive acceleration.",
  },
  {
    id: "physics-1.q.ss-4",
    skillIds: [S("speeding-slowing"), S("kinematic-equations")],
    difficulty: 4,
    pattern: "time-interval",
    estSeconds: 120,
    prompt: r`An object starts with velocity $+6\,\text{m/s}$ and has a constant acceleration of $-2\,\text{m/s}^2$. During which part of the first $5\,\text{s}$ is the object **speeding up**?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`From $t = 0$ to $t = 3\,\text{s}$ only`, rationale: "During these 3 s the velocity is positive while the acceleration is negative, so the object is slowing down." },
        { id: "b", text: "Never, because the acceleration is negative the whole time", misconception: M("negative-accel-slowing"), rationale: "Once the velocity is also negative (after 3 s), a negative acceleration makes the object faster." },
        { id: "c", text: r`For the entire $5\,\text{s}$, because the acceleration never changes`, rationale: "A constant acceleration means the velocity changes at a steady rate, not that the speed always increases." },
        { id: "d", text: r`From $t = 3\,\text{s}$ to $t = 5\,\text{s}$ only`, rationale: "After the velocity passes through zero at 3 s it is negative, the same sign as the acceleration." },
      ],
      correctChoiceId: "d",
    },
    hints: [r`Write the velocity at each second: $v = 6 - 2t$.`, r`The velocity is zero at $t = 3\,\text{s}$. Compare the signs of $v$ and $a$ before and after that instant.`],
    solution: r`$v = 6 - 2t$ gives $+6, +4, +2, 0, -2, -4\,\text{m/s}$ at $t = 0$ to $5\,\text{s}$. Before $t = 3\,\text{s}$, $v > 0$ and $a < 0$: slowing down. After $t = 3\,\text{s}$, $v < 0$ and $a < 0$: speeding up (the speed grows from $0$ to $4\,\text{m/s}$). The acceleration is $-2\,\text{m/s}^2$ throughout.`,
  },
  {
    id: "physics-1.q.ss-5",
    skillIds: [S("speeding-slowing")],
    difficulty: 4,
    pattern: "select-all",
    estSeconds: 120,
    prompt: "Each option describes an object moving along a straight line at one instant. Select **all** of the objects that are **slowing down** at that instant.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: r`$v = +12\,\text{m/s}$, $a = -3\,\text{m/s}^2$` },
        { id: "b", text: r`$v = -7\,\text{m/s}$, $a = +2\,\text{m/s}^2$` },
        { id: "c", text: r`$v = -7\,\text{m/s}$, $a = -2\,\text{m/s}^2$`, misconception: M("negative-accel-slowing"), rationale: "Velocity and acceleration are both negative, so the speed is increasing: 7 m/s, then 9 m/s a second later." },
        { id: "d", text: r`$v = +3\,\text{m/s}$, $a = +1\,\text{m/s}^2$`, rationale: "Same signs: the object is speeding up." },
        { id: "e", text: "A ball still moving upward just after being thrown straight up (taking up as positive, air resistance negligible)" },
      ],
      correctChoiceIds: ["a", "b", "e"],
    },
    hints: ["An object slows down when its velocity and acceleration have opposite signs.", r`For the thrown ball with up positive: $v > 0$ while it rises, and $a = -9.8\,\text{m/s}^2$.`],
    solution: r`Slowing down means $v$ and $a$ have opposite signs. (a) $+,-$ ✓. (b) $-,+$ ✓. (c) $-,-$: speeding up ✗. (d) $+,+$: speeding up ✗. (e) The rising ball has $v > 0$ and $a = -9.8\,\text{m/s}^2$: opposite signs ✓.`,
  },
  {
    id: "physics-1.q.ss-6",
    skillIds: [S("speeding-slowing"), S("velocity-sign-direction")],
    difficulty: 3,
    pattern: "sim-readout",
    estSeconds: 150,
    prompt: r`In the Motion Lab below, set $x_0 = 0\,\text{m}$, $v_0 = -4\,\text{m/s}$ and $a = +2\,\text{m/s}^2$, with a duration of at least $6\,\text{s}$. Run the motion and use the scrubber to follow the velocity readout.

For how many seconds during the first $6\,\text{s}$ is the object **slowing down**?`,
    stimulus: LAB(0, -4, 2, 6),
    body: {
      type: "numeric",
      answer: 2,
      tolerance: { abs: 0.1 },
      unit: "s",
      commonErrors: [{ value: 0, misconception: M("negative-accel-slowing"), note: "A positive acceleration does not rule out slowing down. For the first 2 s the velocity is negative while the acceleration is positive, so the speed is falling." }],
    },
    hints: ["Slowing down means the speed (the size of the velocity readout) is getting smaller.", r`Find the time at which the velocity readout reaches zero. Before that instant, $v$ is negative and $a$ is positive.`],
    solution: r`$v = -4 + 2t$ is negative until $t = 2\,\text{s}$, where it reaches zero. During those first $2\,\text{s}$ the velocity and acceleration have opposite signs, so the object slows down (speed $4 \to 0\,\text{m/s}$). From $t = 2\,\text{s}$ to $6\,\text{s}$ both are positive and it speeds up. So it slows down for $2\,\text{s}$.`,
  },

  // ───────────────────────── Position–time graphs ──────────────────────────
  {
    id: "physics-1.q.xt-1",
    skillIds: [S("xt-graphs")],
    difficulty: 2,
    pattern: "slope-value",
    estSeconds: 75,
    prompt: r`A position–time graph is a straight line passing through the points $(0\,\text{s},\ 2\,\text{m})$ and $(4\,\text{s},\ 14\,\text{m})$. What is the object's velocity?`,
    body: {
      type: "numeric",
      answer: 3,
      tolerance: { abs: 0.02 },
      unit: "m/s",
      commonErrors: [{ value: 3.5, misconception: M("height-as-velocity"), note: "14 ÷ 4 uses the height of the graph at 4 s. Velocity is the slope: the change in position divided by the change in time." }],
    },
    hints: ["Velocity is the slope of a position–time graph: rise over run.", r`Rise $= 14\,\text{m} - 2\,\text{m}$; run $= 4\,\text{s} - 0\,\text{s}$.`],
    solution: r`$v = \text{slope} = \dfrac{\Delta x}{\Delta t} = \dfrac{14\,\text{m} - 2\,\text{m}}{4\,\text{s} - 0\,\text{s}} = 3\,\text{m/s}$. The line does not start at the origin, so dividing a single position by a single time would give the wrong answer.`,
  },
  {
    id: "physics-1.q.xt-2",
    skillIds: [S("xt-graphs")],
    difficulty: 2,
    pattern: "shape-to-motion",
    estSeconds: 60,
    prompt: r`A position–time graph is a horizontal straight line at $x = 5\,\text{m}$. What is the object doing?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`It is at rest, $5\,\text{m}$ from the origin.`, rationale: "A horizontal line has zero slope, so the velocity is zero; the height of the line is the unchanging position." },
        { id: "b", text: r`It is moving at a constant $5\,\text{m/s}$.`, misconception: M("height-as-velocity"), rationale: "The height of a position–time graph is the position, not the velocity. Velocity is the slope, which is zero here." },
        { id: "c", text: "It is moving in the positive direction at a steady speed.", rationale: "Steady motion in the positive direction would be a straight line that slopes upward." },
        { id: "d", text: "It is moving with constant acceleration.", rationale: "Constant (non-zero) acceleration gives a curved position–time graph." },
      ],
      correctChoiceId: "a",
    },
    hints: ["On a position–time graph, the vertical axis tells you where the object is.", "What is the slope of a horizontal line, and what does slope mean on this kind of graph?"],
    solution: r`The position stays at $5\,\text{m}$ for all times, so the object is not moving. Equivalently, the slope of the graph (the velocity) is zero.`,
  },
  {
    id: "physics-1.q.xt-3",
    skillIds: [S("xt-graphs")],
    difficulty: 3,
    pattern: "compare-slopes",
    estSeconds: 110,
    prompt: r`A position–time graph for a toy car is made of three straight segments.

| Segment | Starts at | Ends at |
|---|---|---|
| A | $(0\,\text{s},\ 0\,\text{m})$ | $(2\,\text{s},\ 8\,\text{m})$ |
| B | $(2\,\text{s},\ 8\,\text{m})$ | $(6\,\text{s},\ 8\,\text{m})$ |
| C | $(6\,\text{s},\ 8\,\text{m})$ | $(8\,\text{s},\ 2\,\text{m})$ |

During which segment is the car moving **fastest**?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`Segment A, where its speed is $4\,\text{m/s}$`, rationale: "A is the steepest segment: 8 m in 2 s." },
        { id: "b", text: "Segment B, because the car's position is greatest there", misconception: M("height-as-velocity"), rationale: "B is the highest part of the graph, but it is flat. Zero slope means the car is at rest." },
        { id: "c", text: "Segment C, because the graph is heading downward", rationale: "C has slope −3 m/s: a speed of 3 m/s, less than A's 4 m/s. Sloping down only means motion in the negative direction." },
        { id: "d", text: "Segments A and C equally, because both are sloped", rationale: "The slopes have different sizes: 4 m/s for A and 3 m/s for C." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Speed is the steepness of a position–time graph, whichever way it slopes.", r`Slopes: A is $\dfrac{8 - 0}{2 - 0}$, B is $\dfrac{8 - 8}{6 - 2}$, C is $\dfrac{2 - 8}{8 - 6}$.`],
    solution: r`Slopes: A: $\dfrac{8\,\text{m}}{2\,\text{s}} = +4\,\text{m/s}$. B: $\dfrac{0\,\text{m}}{4\,\text{s}} = 0$. C: $\dfrac{-6\,\text{m}}{2\,\text{s}} = -3\,\text{m/s}$. The speeds are $4$, $0$ and $3\,\text{m/s}$, so the car is fastest in segment A. In B the car is parked at its greatest position.`,
  },
  {
    id: "physics-1.q.xt-4",
    skillIds: [S("xt-graphs"), S("velocity-sign-direction")],
    difficulty: 3,
    pattern: "slope-value",
    estSeconds: 90,
    prompt: r`A position–time graph is a straight line from $(1\,\text{s},\ 9\,\text{m})$ to $(5\,\text{s},\ -3\,\text{m})$. What is the object's velocity during this interval?`,
    body: {
      type: "numeric",
      answer: -3,
      tolerance: { abs: 0.02 },
      unit: "m/s",
      commonErrors: [
        { value: 3, misconception: M("sign-direction"), note: "3 m/s is the speed. The line slopes downward, so the velocity is negative." },
        { value: -0.6, misconception: M("height-as-velocity"), note: "−3 ÷ 5 uses the final height of the graph and the final clock reading. Velocity is the slope between the two points." },
      ],
    },
    hints: [r`Slope $= \dfrac{x_f - x_i}{t_f - t_i}$. Neither point is at the origin, so use both.`, r`$\Delta x = -3\,\text{m} - 9\,\text{m} = -12\,\text{m}$ and $\Delta t = 5\,\text{s} - 1\,\text{s} = 4\,\text{s}$.`],
    solution: r`$v = \dfrac{\Delta x}{\Delta t} = \dfrac{-3\,\text{m} - 9\,\text{m}}{5\,\text{s} - 1\,\text{s}} = \dfrac{-12\,\text{m}}{4\,\text{s}} = -3\,\text{m/s}$. The object moves in the negative direction at $3\,\text{m/s}$, passing through the origin on the way.`,
  },
  {
    id: "physics-1.q.xt-5",
    skillIds: [S("xt-graphs"), S("speeding-slowing")],
    difficulty: 4,
    pattern: "curved-graph",
    estSeconds: 120,
    prompt: r`A position–time graph for an object on a straight track is a smooth curve. At $t = 0$ it rises steeply. It then becomes gradually less steep until it is horizontal at $t = 4\,\text{s}$, where the position is greatest. After $t = 4\,\text{s}$ it falls, becoming steeper and steeper.

Which description of the motion is correct?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The object travels up a hill, reaches the top after 4 s, and comes down the other side.", rationale: "A position–time graph is not a picture of the path. The object stays on a straight track; the curve shows how its position along that track changes with time." },
        { id: "b", text: r`The object speeds up until $t = 4\,\text{s}$, where it is fastest because its position is greatest, and then slows down.`, misconception: M("height-as-velocity"), rationale: "Speed comes from the steepness of the graph, not its height. The graph is flat at 4 s, so the object is momentarily at rest there." },
        { id: "c", text: r`The object moves in the positive direction while slowing down, is momentarily at rest at $t = 4\,\text{s}$, and then moves in the negative direction while speeding up.`, rationale: "Positive slope that flattens means slowing in the positive direction; zero slope means at rest; a negative slope that steepens means speeding up in the negative direction." },
        { id: "d", text: r`The object's acceleration is zero at $t = 4\,\text{s}$, because its velocity is zero there.`, misconception: M("zero-velocity-zero-accel"), rationale: "The slope is changing from positive to negative through 4 s, so the velocity is changing and the acceleration is not zero." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Read the slope, not the height: the slope at each instant is the velocity.", "Steep and rising → fast in the positive direction. Flat → at rest. Falling and steepening → faster and faster in the negative direction."],
    solution: r`The slope starts large and positive and shrinks to zero at $t = 4\,\text{s}$: the object moves in the positive direction, slowing down, and is momentarily at rest at its greatest position. Afterwards the slope is negative and growing in size: the object moves back in the negative direction, speeding up. The velocity decreases throughout, so the acceleration is negative the whole time, including at $t = 4\,\text{s}$.`,
  },
  {
    id: "physics-1.q.xt-6",
    skillIds: [S("xt-graphs")],
    difficulty: 3,
    pattern: "match-shapes",
    estSeconds: 100,
    prompt: "Match each **position–time** graph shape with the motion it represents.",
    body: {
      type: "matching",
      left: [
        { id: "l1", text: "A straight line sloping upward" },
        { id: "l2", text: "A horizontal straight line" },
        { id: "l3", text: "A straight line sloping downward" },
        { id: "l4", text: "A curve that rises and gets steeper" },
      ],
      right: [
        { id: "r1", text: "Constant velocity in the positive direction" },
        { id: "r2", text: "At rest" },
        { id: "r3", text: "Constant velocity in the negative direction" },
        { id: "r4", text: "Speeding up in the positive direction" },
      ],
      pairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
    },
    hints: ["On a position–time graph the slope is the velocity.", "A straight line has one constant slope. A curve has a slope that changes, which means the velocity is changing."],
    solution: "Slope is velocity. Upward straight line: constant positive velocity. Horizontal line: zero velocity, at rest. Downward straight line: constant negative velocity. A rising curve that steepens has a positive slope that keeps growing: the object speeds up in the positive direction.",
  },

  // ───────────────────────── Velocity–time graphs ──────────────────────────
  {
    id: "physics-1.q.vt-1",
    skillIds: [S("vt-graphs")],
    difficulty: 2,
    pattern: "slope-acceleration",
    estSeconds: 75,
    prompt: r`A velocity–time graph is a straight line from $(0\,\text{s},\ 2\,\text{m/s})$ to $(5\,\text{s},\ 12\,\text{m/s})$. What is the object's acceleration?`,
    body: {
      type: "numeric",
      answer: 2,
      tolerance: { abs: 0.02 },
      unit: "m/s²",
      commonErrors: [{ value: 35, misconception: M("slope-area-mixup"), note: "35 is the area under the line, which is the displacement in metres. Acceleration is the slope." }],
    },
    hints: ["Acceleration is the slope of a velocity–time graph.", r`Slope $= \dfrac{12\,\text{m/s} - 2\,\text{m/s}}{5\,\text{s} - 0\,\text{s}}$.`],
    solution: r`$a = \text{slope} = \dfrac{\Delta v}{\Delta t} = \dfrac{12\,\text{m/s} - 2\,\text{m/s}}{5\,\text{s}} = 2\,\text{m/s}^2$.`,
  },
  {
    id: "physics-1.q.vt-2",
    skillIds: [S("vt-graphs")],
    difficulty: 3,
    pattern: "area-displacement",
    estSeconds: 120,
    prompt: r`A velocity–time graph for a tram on a straight track has two parts: a straight line from $(0\,\text{s},\ 0\,\text{m/s})$ to $(4\,\text{s},\ 8\,\text{m/s})$, followed by a horizontal line at $8\,\text{m/s}$ from $t = 4\,\text{s}$ to $t = 10\,\text{s}$.

What is the tram's displacement during the $10\,\text{s}$?`,
    body: {
      type: "numeric",
      answer: 64,
      tolerance: { abs: 0.5 },
      unit: "m",
      commonErrors: [{ value: 2, misconception: M("slope-area-mixup"), note: "2 is the slope of the first part: the acceleration in m/s². Displacement is the area between the graph and the time axis." }],
    },
    hints: ["Displacement is the area between a velocity–time graph and the time axis.", r`Split the area into a triangle (base $4\,\text{s}$, height $8\,\text{m/s}$) and a rectangle (width $6\,\text{s}$, height $8\,\text{m/s}$).`],
    solution: r`Triangle: $\tfrac12(4\,\text{s})(8\,\text{m/s}) = 16\,\text{m}$. Rectangle: $(6\,\text{s})(8\,\text{m/s}) = 48\,\text{m}$. Displacement $= 16\,\text{m} + 48\,\text{m} = 64\,\text{m}$.`,
  },
  {
    id: "physics-1.q.vt-3",
    skillIds: [S("vt-graphs"), S("velocity-sign-direction")],
    difficulty: 3,
    pattern: "shape-to-motion",
    estSeconds: 75,
    prompt: r`A velocity–time graph is a horizontal straight line at $v = -3\,\text{m/s}$. What is the object doing?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`It is at rest at the position $x = -3\,\text{m}$.`, rationale: "This reads the graph as if it were a position–time graph. The vertical axis here is velocity: the object is at rest only when the line lies on the time axis." },
        { id: "b", text: r`It is moving in the negative direction at a constant speed of $3\,\text{m/s}$.`, rationale: "The height of a velocity–time graph is the velocity; a flat line means it is not changing." },
        { id: "c", text: "It is moving in the negative direction and slowing down.", rationale: "Slowing down would show as a line heading toward the time axis. A flat line means the velocity is constant." },
        { id: "d", text: "It is moving in the negative direction and speeding up.", rationale: "Speeding up needs a non-zero slope (an acceleration) pointing the same way as the velocity. This line has zero slope, so the speed stays at 3 m/s." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Check the vertical axis first: this graph shows velocity, not position.", "The height of the line is the velocity at each moment. The slope of the line is the acceleration."],
    solution: r`The velocity is $-3\,\text{m/s}$ at every moment: the object moves in the negative direction at a steady $3\,\text{m/s}$. The slope is zero, so the acceleration is zero.`,
  },
  {
    id: "physics-1.q.vt-4",
    skillIds: [S("vt-graphs")],
    difficulty: 3,
    pattern: "area-displacement",
    estSeconds: 100,
    prompt: r`A velocity–time graph for a braking bicycle is a straight line from $(0\,\text{s},\ 10\,\text{m/s})$ to $(5\,\text{s},\ 0\,\text{m/s})$. How far does the bicycle travel while it brakes?`,
    body: {
      type: "numeric",
      answer: 25,
      tolerance: { abs: 0.3 },
      unit: "m",
      commonErrors: [
        { value: -2, misconception: M("slope-area-mixup"), note: "−2 is the slope of the line: the acceleration in m/s². The distance comes from the area under the line." },
        { value: 2, misconception: M("slope-area-mixup"), note: "2 is the size of the slope (the acceleration). The distance comes from the area under the line." },
      ],
    },
    hints: ["The bicycle never reverses, so the distance equals the displacement: the area under the line.", r`The area is a triangle with base $5\,\text{s}$ and height $10\,\text{m/s}$.`],
    solution: r`Area of the triangle $= \tfrac12(5\,\text{s})(10\,\text{m/s}) = 25\,\text{m}$. The velocity stays positive, so the distance travelled equals this displacement.`,
  },
  {
    id: "physics-1.q.vt-5",
    skillIds: [S("vt-graphs"), S("distance-vs-displacement")],
    difficulty: 4,
    pattern: "area-below-axis",
    estSeconds: 150,
    prompt: r`A velocity–time graph is a straight line from $(0\,\text{s},\ 6\,\text{m/s})$ to $(4\,\text{s},\ -2\,\text{m/s})$. What is the object's **displacement** from $t = 0$ to $t = 4\,\text{s}$?`,
    body: {
      type: "numeric",
      answer: 8,
      tolerance: { abs: 0.2 },
      unit: "m",
      commonErrors: [
        { value: 10, misconception: M("distance-is-displacement"), note: "10 m is the distance travelled (9 m forward plus 1 m back). For displacement, area below the time axis counts as negative." },
        { value: -2, misconception: M("slope-area-mixup"), note: "−2 is the slope of the line: the acceleration in m/s². Displacement is the signed area." },
      ],
    },
    hints: [r`The line crosses the time axis. Find where: the slope is $-2\,\text{m/s}^2$, so $v = 0$ at $t = 3\,\text{s}$.`, r`Area above the axis: $\tfrac12(3)(6)$. Area below the axis: $\tfrac12(1)(2)$, which counts as negative.`],
    solution: r`The slope is $\dfrac{-2 - 6}{4} = -2\,\text{m/s}^2$, so the line reaches $v = 0$ at $t = 3\,\text{s}$. Above the axis: $\tfrac12(3\,\text{s})(6\,\text{m/s}) = +9\,\text{m}$. Below the axis: $\tfrac12(1\,\text{s})(-2\,\text{m/s}) = -1\,\text{m}$. Displacement $= 9 - 1 = 8\,\text{m}$. (The distance travelled is $9 + 1 = 10\,\text{m}$.)`,
  },
  {
    id: "physics-1.q.vt-6",
    skillIds: [S("vt-graphs"), S("acceleration-concept")],
    difficulty: 4,
    pattern: "axis-crossing",
    estSeconds: 120,
    prompt: r`A velocity–time graph is a straight line from $(0\,\text{s},\ -4\,\text{m/s})$ to $(8\,\text{s},\ +4\,\text{m/s})$, crossing the time axis at $t = 4\,\text{s}$. Which statement about the instant $t = 4\,\text{s}$ is correct?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`The object reverses direction, and its acceleration is $+1\,\text{m/s}^2$.`, rationale: "The velocity changes sign there, and the slope of the line is the same at every point, including the crossing." },
        { id: "b", text: "The object is back at its starting position.", rationale: "Crossing the time axis means the velocity is zero, not that the position is back to its starting value. At 4 s the object is 8 m from its start, the farthest it gets; it returns at t = 8 s." },
        { id: "c", text: "The object's acceleration is zero, because its velocity is zero.", misconception: M("zero-velocity-zero-accel"), rationale: "Acceleration is the slope of the line, which is +1 m/s² everywhere, including where the line crosses zero." },
        { id: "d", text: "The object begins to slow down.", rationale: "It was slowing down before 4 s (v negative, a positive). After 4 s both are positive, so it speeds up." },
      ],
      correctChoiceId: "a",
    },
    hints: ["On a velocity–time graph, height is velocity and slope is acceleration.", r`The slope is $\dfrac{4 - (-4)}{8 - 0}$ everywhere on the line. What does a change of sign in the velocity mean?`],
    solution: r`The slope is $\dfrac{+4 - (-4)}{8\,\text{s}} = +1\,\text{m/s}^2$ at every instant. At $t = 4\,\text{s}$ the velocity passes from negative to positive, so the object stops for an instant and reverses direction while its acceleration stays $+1\,\text{m/s}^2$. Its displacement by then is $\tfrac12(4)(-4) = -8\,\text{m}$, so it is not back at the start.`,
  },
  {
    id: "physics-1.q.vt-7",
    skillIds: [S("vt-graphs"), S("speeding-slowing")],
    difficulty: 4,
    pattern: "interpret-all",
    estSeconds: 150,
    prompt: r`A velocity–time graph is a straight line from $(0\,\text{s},\ 6\,\text{m/s})$ to $(6\,\text{s},\ -6\,\text{m/s})$. Select **all** of the statements that are correct for the interval from $t = 0$ to $t = 6\,\text{s}$.`,
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: r`The acceleration is $-2\,\text{m/s}^2$ throughout.` },
        { id: "b", text: r`The object changes direction at $t = 3\,\text{s}$.` },
        { id: "c", text: "The displacement for the whole interval is zero." },
        { id: "d", text: "The distance travelled in the whole interval is zero.", misconception: M("distance-is-displacement"), rationale: "The object moves 9 m forward and 9 m back. Those cancel in the displacement but add to give a distance of 18 m." },
        { id: "e", text: "The object is slowing down for the whole interval.", misconception: M("negative-accel-slowing"), rationale: "It slows down only until 3 s. After that the velocity is negative, like the acceleration, so it speeds up." },
      ],
      correctChoiceIds: ["a", "b", "c"],
    },
    hints: ["Slope gives acceleration; where the line crosses the time axis the object reverses; signed area gives displacement.", r`The two triangles (above the axis from $0$ to $3\,\text{s}$, below it from $3$ to $6\,\text{s}$) have equal areas of $9\,\text{m}$.`],
    solution: r`Slope: $\dfrac{-6 - 6}{6} = -2\,\text{m/s}^2$ (a ✓). The velocity is zero at $t = 3\,\text{s}$ and changes sign there (b ✓). Areas: $+9\,\text{m}$ above the axis and $-9\,\text{m}$ below, so the displacement is zero (c ✓) while the distance is $18\,\text{m}$ (d ✗). After $t = 3\,\text{s}$ the velocity and acceleration are both negative, so the object speeds up (e ✗).`,
  },

  // ──────────────────── Constant-acceleration equations ────────────────────
  {
    id: "physics-1.q.ke-1",
    skillIds: [S("kinematic-equations")],
    difficulty: 2,
    pattern: "velocity-time",
    estSeconds: 75,
    prompt: r`A cart moving at $+20\,\text{m/s}$ has a constant acceleration of $-4\,\text{m/s}^2$. What is its velocity $3.0\,\text{s}$ later?`,
    body: {
      type: "numeric",
      answer: 8,
      tolerance: { abs: 0.05 },
      unit: "m/s",
      commonErrors: [{ value: 32, misconception: M("sign-direction"), note: "This adds 12 m/s. The acceleration is negative, so the velocity drops by 4 m/s each second." }],
    },
    hints: [r`Use $v = v_0 + at$.`, r`$v = 20\,\text{m/s} + (-4\,\text{m/s}^2)(3.0\,\text{s})$.`],
    solution: r`$v = v_0 + at = 20\,\text{m/s} + (-4\,\text{m/s}^2)(3.0\,\text{s}) = 20 - 12 = 8\,\text{m/s}$.`,
  },
  {
    id: "physics-1.q.ke-2",
    skillIds: [S("kinematic-equations")],
    difficulty: 3,
    pattern: "position-time",
    estSeconds: 90,
    prompt: r`A drone starts from rest at $x_0 = 0$ and moves along a straight line with a constant acceleration of $3.0\,\text{m/s}^2$. What is its position after $4.0\,\text{s}$?`,
    body: {
      type: "numeric",
      answer: 24,
      tolerance: { abs: 0.2 },
      unit: "m",
      commonErrors: [{ value: 48, misconception: M("drops-half"), note: "This is a·t² without the ½. The ½ is there because the average velocity during the 4 s is half the final velocity." }],
    },
    hints: [r`Use $x = x_0 + v_0t + \tfrac12at^2$ with $x_0 = 0$ and $v_0 = 0$.`, r`$x = \tfrac12(3.0\,\text{m/s}^2)(4.0\,\text{s})^2$. Square the time before multiplying.`],
    solution: r`$x = x_0 + v_0t + \tfrac12at^2 = 0 + 0 + \tfrac12(3.0\,\text{m/s}^2)(4.0\,\text{s})^2 = \tfrac12(3.0)(16) = 24\,\text{m}$. Check: the final velocity is $12\,\text{m/s}$, so the average velocity is $6\,\text{m/s}$, and $6\,\text{m/s} \times 4.0\,\text{s} = 24\,\text{m}$.`,
  },
  {
    id: "physics-1.q.ke-3",
    skillIds: [S("kinematic-equations")],
    difficulty: 3,
    pattern: "position-time",
    estSeconds: 100,
    prompt: r`A cart is at $x_0 = 5\,\text{m}$ moving at $v_0 = +4\,\text{m/s}$ when it begins to accelerate at a constant $+2\,\text{m/s}^2$. What is its position $3.0\,\text{s}$ later?`,
    body: {
      type: "numeric",
      answer: 26,
      tolerance: { abs: 0.2 },
      unit: "m",
      commonErrors: [{ value: 35, misconception: M("drops-half"), note: "The last term should be ½·a·t² = ½(2)(9) = 9 m, not 18 m." }],
    },
    hints: [r`Use $x = x_0 + v_0t + \tfrac12at^2$, and work out the three terms one at a time.`, r`$x = 5 + (4)(3.0) + \tfrac12(2)(3.0)^2$.`],
    solution: r`$x = x_0 + v_0t + \tfrac12at^2 = 5\,\text{m} + (4\,\text{m/s})(3.0\,\text{s}) + \tfrac12(2\,\text{m/s}^2)(3.0\,\text{s})^2 = 5 + 12 + 9 = 26\,\text{m}$.`,
  },
  {
    id: "physics-1.q.ke-4",
    skillIds: [S("kinematic-equations")],
    difficulty: 4,
    pattern: "stopping-distance",
    estSeconds: 120,
    prompt: r`A car travelling at $20\,\text{m/s}$ in the positive direction brakes with a constant acceleration of $-5.0\,\text{m/s}^2$ until it stops. How far does it travel while braking?`,
    body: {
      type: "numeric",
      answer: 40,
      tolerance: { abs: 0.4 },
      unit: "m",
      commonErrors: [
        { value: 80, misconception: M("drops-half"), note: "This leaves out the factor of 2 in 2aΔx: the result should be v₀² ÷ (2 × 5.0), not v₀² ÷ 5.0." },
        { value: -40, misconception: M("sign-direction"), note: "The car keeps moving in the positive direction while it slows, so its displacement is positive. Check that a = −5.0 m/s² went in with its sign." },
      ],
    },
    hints: [r`The time is not given or asked for, so use $v^2 = v_0^2 + 2a\,\Delta x$ with $v = 0$.`, r`$0 = (20)^2 + 2(-5.0)\,\Delta x$. Solve for $\Delta x$.`],
    solution: r`With $v = 0$: $0 = v_0^2 + 2a\,\Delta x$, so $\Delta x = \dfrac{-v_0^2}{2a} = \dfrac{-(20\,\text{m/s})^2}{2(-5.0\,\text{m/s}^2)} = \dfrac{-400}{-10}\,\text{m} = 40\,\text{m}$. Check: stopping takes $\dfrac{20}{5.0} = 4.0\,\text{s}$ at an average velocity of $10\,\text{m/s}$, which is $40\,\text{m}$.`,
  },
  {
    id: "physics-1.q.ke-5",
    skillIds: [S("kinematic-equations")],
    difficulty: 5,
    pattern: "free-fall",
    estSeconds: 210,
    prompt: r`A ball is thrown straight **up** at $14.7\,\text{m/s}$ from a balcony $19.6\,\text{m}$ above the ground. Ignore air resistance, take up as positive and use $g = 9.8\,\text{m/s}^2$.

How long after it is thrown does the ball hit the ground?`,
    body: {
      type: "numeric",
      answer: 4,
      tolerance: { abs: 0.05 },
      unit: "s",
      commonErrors: [{ value: 1, misconception: M("sign-direction"), note: "1 s is the answer for a ball thrown downward at 14.7 m/s. With up as positive, the initial velocity is +14.7 m/s while the acceleration and the displacement to the ground are negative." }],
    },
    hints: [r`Put the origin at the balcony. Then $x_0 = 0$, $v_0 = +14.7\,\text{m/s}$, $a = -9.8\,\text{m/s}^2$, and the ground is at $x = -19.6\,\text{m}$. One equation covers the whole flight, up and down.`, r`$-19.6 = 14.7t - 4.9t^2$. Divide through by $4.9$ to get $t^2 - 3t - 4 = 0$ and factor.`],
    solution: r`With up positive and the origin at the balcony: $x = x_0 + v_0t + \tfrac12at^2$ becomes $-19.6 = 14.7t - 4.9t^2$. Dividing by $4.9$ and rearranging: $t^2 - 3t - 4 = 0$, so $(t - 4)(t + 1) = 0$. The positive root is $t = 4.0\,\text{s}$. Check: $14.7(4) - 4.9(16) = 58.8 - 78.4 = -19.6\,\text{m}$ ✓. There is no need to split the flight into "up" and "down": the signs take care of it.`,
  },
  {
    id: "physics-1.q.ke-6",
    skillIds: [S("kinematic-equations")],
    difficulty: 4,
    pattern: "proportional",
    estSeconds: 120,
    prompt: r`A car starts from rest and moves in a straight line with constant acceleration. It covers a distance $d$ during the first $T$ seconds. How far is it from its starting point after $2T$ seconds?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$2d$`, rationale: "Doubling the time doubles the distance only at constant velocity. This car keeps getting faster, so it covers more ground in the second interval than in the first." },
        { id: "b", text: r`$3d$`, rationale: r`$3d$ is the extra distance covered during the second interval. The total from the start is $d + 3d$.` },
        { id: "c", text: r`$8d$`, rationale: r`Distance from rest grows with $t^2$: doubling $t$ multiplies it by $2^2 = 4$, not $2^3$.` },
        { id: "d", text: r`$4d$`, rationale: r`From rest, $\Delta x = \tfrac12at^2$, so doubling the time multiplies the distance by four.` },
      ],
      correctChoiceId: "d",
    },
    hints: [r`Starting from rest, $\Delta x = \tfrac12at^2$. How does $\Delta x$ change when $t$ is doubled?`, r`Compare $\tfrac12a(2T)^2$ with $\tfrac12aT^2$.`],
    solution: r`From rest, $d = \tfrac12aT^2$. After $2T$: $\tfrac12a(2T)^2 = 4\left(\tfrac12aT^2\right) = 4d$. Distance grows with the square of the time because both the time and the average velocity have doubled.`,
  },
  {
    id: "physics-1.q.ke-7",
    skillIds: [S("kinematic-equations")],
    difficulty: 2,
    pattern: "choose-equation",
    estSeconds: 75,
    prompt: "A skateboarder with a known initial velocity speeds up with a known constant acceleration over a known displacement. You want her final velocity. The time taken is neither given nor asked for. Which equation gives the answer in one step?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$v = v_0 + at$`, rationale: "This needs the time, which is not known." },
        { id: "b", text: r`$x = x_0 + v_0t + \tfrac12at^2$`, rationale: "This contains the unknown time and does not contain the final velocity." },
        { id: "c", text: r`$v^2 = v_0^2 + 2a\,\Delta x$`, rationale: "This links final velocity, initial velocity, acceleration and displacement without involving time." },
        { id: "d", text: r`$\Delta x = v\,t$`, rationale: "This is only valid when the velocity is constant, and it also needs the time." },
      ],
      correctChoiceId: "c",
    },
    hints: [r`List what is known ($v_0$, $a$, $\Delta x$), what is wanted ($v$) and what is missing ($t$).`, "Choose the equation that does not contain the missing quantity."],
    solution: r`Known: $v_0$, $a$, $\Delta x$. Wanted: $v$. Not involved: $t$. The equation without $t$ is $v^2 = v_0^2 + 2a\,\Delta x$.`,
  },
  {
    id: "physics-1.q.ke-8",
    skillIds: [S("kinematic-equations"), S("speeding-slowing")],
    difficulty: 3,
    pattern: "turnaround",
    estSeconds: 150,
    prompt: r`In the Motion Lab below, set $x_0 = 0\,\text{m}$, $v_0 = 6\,\text{m/s}$ and $a = -2\,\text{m/s}^2$. Run the motion and use the time scrubber to find the instant at which the object **turns around**.

At what time does it turn around?`,
    stimulus: LAB(0, 6, -2, 6),
    body: {
      type: "numeric",
      answer: 3,
      tolerance: { abs: 0.1 },
      unit: "s",
      commonErrors: [{ value: 6, misconception: M("height-as-velocity"), note: "At 6 s the position is back to zero, but the object turned around earlier. The turnaround is where the velocity is zero: the top of the position–time curve, not where it returns to x = 0." }],
    },
    hints: ["At the turnaround the object is momentarily at rest. Scrub until the velocity readout is zero (the peak of the position–time graph).", r`Check with $v = v_0 + at$: solve $0 = 6 + (-2)t$.`],
    solution: r`The object turns around when $v = 0$: $0 = v_0 + at = 6 + (-2)t$, so $t = 3\,\text{s}$. In the lab this is where the velocity–time line crosses the time axis and the position–time curve peaks (at $x = 9\,\text{m}$). The acceleration is still $-2\,\text{m/s}^2$ at that instant.`,
  },
  {
    id: "physics-1.q.ke-9",
    skillIds: [S("kinematic-equations")],
    difficulty: 3,
    pattern: "sim-readout",
    estSeconds: 150,
    prompt: r`In the Motion Lab below, set $x_0 = 0\,\text{m}$, $v_0 = 6\,\text{m/s}$ and $a = -2\,\text{m/s}^2$. Run the motion and move the time scrubber to $t = 5\,\text{s}$.

What is the object's **position** at $t = 5\,\text{s}$? Confirm the readout with the position equation.`,
    stimulus: LAB(0, 6, -2, 6),
    body: {
      type: "numeric",
      answer: 5,
      tolerance: { abs: 0.3 },
      unit: "m",
      commonErrors: [
        { value: 55, misconception: M("sign-direction"), note: "This treats the acceleration as +2 m/s². With a = −2 m/s², the ½at² term is −25 m." },
        { value: -20, misconception: M("drops-half"), note: "This uses a·t² = −50 m for the last term. It should be ½·a·t² = −25 m." },
        { value: 13, misconception: M("distance-is-displacement"), note: "13 m is the distance travelled. Position is where the object is: 9 m out, then 4 m back, leaves it at x = 5 m." },
      ],
    },
    hints: ["Read the x readout (not the distance readout) with the scrubber at 5 s.", r`$x = x_0 + v_0t + \tfrac12at^2 = 0 + (6)(5) + \tfrac12(-2)(5)^2$.`],
    solution: r`$x = x_0 + v_0t + \tfrac12at^2 = 0 + (6\,\text{m/s})(5\,\text{s}) + \tfrac12(-2\,\text{m/s}^2)(5\,\text{s})^2 = 30 - 25 = 5\,\text{m}$. The object went out to $9\,\text{m}$, turned around at $t = 3\,\text{s}$ and has come $4\,\text{m}$ back.`,
  },
];
