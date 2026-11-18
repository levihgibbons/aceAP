/**
 * AP Physics 1 — Unit 5 question bank (Torque and Rotational Dynamics). All
 * items are original AceAP content; none are College Board questions. Answers
 * are checked by `npx tsx scripts/validate-physics-unit.ts 5` and
 * `npm run content:validate`.
 *
 * Conventions used throughout: SI units, angles in radians unless a degree
 * value is given; counterclockwise (as seen by the viewer described in the
 * item) is the positive direction for angular quantities and torques;
 * g = 9.8 m/s²; strings do not slip on pulleys and axles are frictionless
 * unless an item says otherwise.
 */
import type { AuthoredQuestionInput } from "@/modules/content/schema";

const r = String.raw;
const S = (id: string) => `physics-1.u5.${id}`;
const M = (id: string) => `physics-1.m.u5.${id}`;

// Skill slugs
const AQ = "angular-quantities";
const RK = "rotational-kinematics";
const LA = "linear-angular";
const CR = "rotating-accelerations";
const TM = "torque-magnitude";
const NT = "net-torque";
const IP = "inertia-point-masses";
const DI = "inertia-distribution";
const TB = "torque-balance";
const SE = "static-equilibrium";
const RS = "rotational-second-law";
const PS = "pulley-systems";

// Units for KaTeX
const rad = r`\,\text{rad}`;
const rps = r`\,\text{rad/s}`;
const rps2 = r`\,\text{rad/s}^2`;
const Nm = r`\,\text{N}\cdot\text{m}`;
const kgm2 = r`\,\text{kg}\cdot\text{m}^2`;
const m = r`\,\text{m}`;
const cm = r`\,\text{cm}`;
const ms = r`\,\text{m/s}`;
const ms2 = r`\,\text{m/s}^2`;
const N = r`\,\text{N}`;
const s = r`\,\text{s}`;
const kg = r`\,\text{kg}`;
const g_ = r`\,\text{g}`;

type Q = AuthoredQuestionInput;
type Body = Q["body"];
type Err = { value: number; misconception: string; note?: string };

function q(slug: string, skills: string[], difficulty: number, pattern: string, estSeconds: number, rest: { prompt: string; body: Body; hints: string[]; solution: string }): Q {
  return { id: `physics-1.q.u5.${slug}`, skillIds: skills.map(S), difficulty, pattern, estSeconds, ...rest };
}
/** Numeric body; pass "" as the unit for a pure number (a ratio or factor). */
const num = (answer: number, unit: string, tolerance: { abs?: number; rel?: number }, commonErrors?: Err[]): Body => ({
  type: "numeric",
  answer,
  tolerance,
  ...(unit ? { unit } : {}),
  ...(commonErrors ? { commonErrors } : {}),
});

export const unit5Questions: Q[] = [
  // ───────────── Angular position, displacement, velocity, acceleration ─────────────
  q("aq-1", [AQ], 1, "convert", 45, {
    prompt: r`A bicycle wheel turns through exactly 3 revolutions. Through what angle has it turned, in radians?`,
    body: num(18.85, "rad", { abs: 0.05 }, [
      { value: 3, misconception: M("revolutions-not-radians"), note: "That is the number of revolutions. Each revolution is 2π radians." },
      { value: 1080, misconception: M("revolutions-not-radians"), note: "That is the angle in degrees. The question asks for radians." },
    ]),
    hints: ["How many radians make up one full turn?", "Multiply the number of turns by that amount."],
    solution: r`One revolution is $2\pi$ radians, so $3$ revolutions is $3 \times 2\pi = 6\pi \approx 18.8${rad}$.`,
  }),
  q("aq-2", [AQ], 1, "convert", 45, {
    prompt: r`A robot arm swings through an angle of $135^\circ$. What is this angle in radians?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$\dfrac{3\pi}{4}$`, rationale: r`$135^\circ \times \dfrac{\pi}{180^\circ} = \dfrac{3\pi}{4}$.` },
        { id: "b", text: r`$\dfrac{4\pi}{3}$`, rationale: r`This is the conversion turned upside down. $\dfrac{4\pi}{3}$ is $240^\circ$.` },
        { id: "c", text: r`$135${rad}$`, misconception: M("revolutions-not-radians"), rationale: "Degrees and radians are different units. 135 rad would be more than 21 full turns." },
        { id: "d", text: r`$\dfrac{3\pi}{8}$`, rationale: r`$\dfrac{3\pi}{8}$ is $67.5^\circ$, half of the angle given.` },
      ],
      correctChoiceId: "a",
    },
    hints: [r`A half turn is $180^\circ$ and also $\pi$ radians.`, r`What fraction of $180^\circ$ is $135^\circ$?`],
    solution: r`$180^\circ = \pi$ rad, so $135^\circ = \dfrac{135}{180}\pi = \dfrac{3}{4}\pi$ rad.`,
  }),
  q("aq-3", [AQ], 2, "average-omega", 60, {
    prompt: r`A merry-go-round turns through $2.5$ revolutions in $20${s}$. What is its average angular velocity, in rad/s?`,
    body: num(0.785, "rad/s", { abs: 0.01 }, [
      { value: 0.125, misconception: M("revolutions-not-radians"), note: "That is in revolutions per second. Convert the revolutions to radians first." },
      { value: 45, misconception: M("revolutions-not-radians"), note: "That is in degrees per second. Angular velocity in rad/s needs the angle in radians." },
    ]),
    hints: ["Average angular velocity is angular displacement divided by time.", "Write the angular displacement in radians before dividing."],
    solution: r`$\Delta\theta = 2.5 \times 2\pi = 5\pi \approx 15.7${rad}$. $\omega_{\text{avg}} = \dfrac{\Delta\theta}{\Delta t} = \dfrac{15.7${rad}}{20${s}} \approx 0.785${rps}$.`,
  }),
  q("aq-4", [AQ], 2, "rpm", 60, {
    prompt: r`A drill bit spins at $1200$ revolutions per minute (rpm). What is its angular velocity in rad/s?`,
    body: num(125.7, "rad/s", { abs: 0.5 }, [
      { value: 20, misconception: M("revolutions-not-radians"), note: "20 is the rate in revolutions per second. Each revolution is 2π rad." },
    ]),
    hints: ["Convert minutes to seconds and revolutions to radians separately.", r`One revolution is $2\pi$ rad and one minute is $60${s}$.`],
    solution: r`$\omega = 1200\,\dfrac{\text{rev}}{\text{min}} \times \dfrac{2\pi\,\text{rad}}{1\,\text{rev}} \times \dfrac{1\,\text{min}}{60${s}} = 40\pi \approx 126${rps}$.`,
  }),
  q("aq-5", [AQ], 2, "period", 60, {
    prompt: r`A potter's wheel turns at a steady rate, completing one revolution every $1.8${s}$. What is its angular velocity in rad/s?`,
    body: num(3.49, "rad/s", { abs: 0.03 }, [
      { value: 0.556, misconception: M("revolutions-not-radians"), note: "That is revolutions per second. One revolution is 2π rad." },
    ]),
    hints: ["In one period the wheel turns through one full revolution.", "Write that angle in radians and divide by the time it takes."],
    solution: r`$\omega = \dfrac{2\pi}{T} = \dfrac{2\pi${rad}}{1.8${s}} \approx 3.49${rps}$.`,
  }),
  q("aq-6", [AQ], 2, "sign-direction", 45, {
    prompt: r`Looking at the face of a wall clock, take counterclockwise as positive. The minute hand moves from pointing at 12 to pointing at 3. What is its angular displacement?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$+\dfrac{\pi}{2}${rad}$`, misconception: M("rotation-sign"), rationale: "The size is right, but a clock hand turns clockwise, which is the negative direction here." },
        { id: "b", text: r`$-\dfrac{\pi}{2}${rad}$`, rationale: "A quarter turn is π/2 rad, and clockwise is negative in this convention." },
        { id: "c", text: r`$-90${rad}$`, misconception: M("revolutions-not-radians"), rationale: "90 is the angle in degrees. In radians a quarter turn is π/2." },
        { id: "d", text: r`$-0.25${rad}$`, misconception: M("revolutions-not-radians"), rationale: "0.25 is the angle in revolutions. Multiply by 2π to get radians." },
      ],
      correctChoiceId: "b",
    },
    hints: ["What fraction of a full turn is 12 to 3?", "Which way does a clock hand turn, and is that the positive or negative direction here?"],
    solution: r`From 12 to 3 is a quarter of a revolution: $\tfrac14 \times 2\pi = \tfrac{\pi}{2}$ rad. Clock hands turn clockwise, which is negative here, so $\Delta\theta = -\tfrac{\pi}{2}${rad}$.`,
  }),
  q("aq-7", [AQ], 3, "angular-acceleration", 60, {
    prompt: r`A spinning top's angular velocity changes from $+12${rps}$ to $+3.0${rps}$ in $4.5${s}$. What is its average angular acceleration? Include the sign.`,
    body: num(-2.0, "rad/s²", { abs: 0.02 }, [
      { value: 2, misconception: M("rotation-sign"), note: "The size is right, but the angular velocity got smaller, so the change in ω is negative." },
    ]),
    hints: [r`Angular acceleration is $\dfrac{\Delta\omega}{\Delta t}$, with $\Delta\omega$ = final minus initial.`, "Keep the sign of the change."],
    solution: r`$\alpha = \dfrac{\omega_f - \omega_i}{\Delta t} = \dfrac{3.0 - 12}{4.5}${rps2} = -2.0${rps2}$. The top is spinning in the positive direction and slowing down.`,
  }),
  q("aq-8", [AQ], 3, "sign-direction", 90, {
    prompt: r`A wheel (counterclockwise positive) has angular velocity $\omega = -5.0${rps}$ and constant angular acceleration $\alpha = +2.0${rps2}$. Select **all** the statements that are correct at this instant.`,
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "The wheel is turning clockwise." },
        { id: "b", text: "The wheel is slowing down." },
        { id: "c", text: "The wheel is speeding up, because its angular acceleration is positive.", misconception: M("alpha-sign-slowing"), rationale: "The sign of α alone does not say speeding up or slowing down. Here ω and α have opposite signs, so the wheel is slowing." },
        { id: "d", text: r`The wheel's angular speed is $5.0${rps}$.` },
        { id: "e", text: r`One second later its angular velocity will be $-3.0${rps}$.` },
        { id: "f", text: "Its angular acceleration must be clockwise, because it is turning clockwise.", misconception: M("alpha-sign-slowing"), rationale: "α is the direction ω is changing, which need not be the direction of spin. Here α is counterclockwise." },
      ],
      correctChoiceIds: ["a", "b", "d", "e"],
    },
    hints: ["What does the sign of ω tell you about the direction of spin?", "Compare the signs of ω and α to decide whether the spin is speeding up or slowing down."],
    solution: r`Negative ω means clockwise (a ✓) at angular speed $5.0${rps}$ (d ✓). ω and α have opposite signs, so the wheel is slowing (b ✓, c ✗). After $1${s}$: $\omega = -5.0 + 2.0(1) = -3.0${rps}$ (e ✓). α is counterclockwise even though the spin is clockwise (f ✗).`,
  }),
  q("aq-9", [AQ], 2, "sign-direction", 45, {
    prompt: r`Seen from below, a ceiling fan turns counterclockwise (take this as positive). It is switched off and gradually slows down. What are the signs of its angular velocity $\omega$ and angular acceleration $\alpha$ while it slows?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$\omega > 0$ and $\alpha > 0$`, misconception: M("alpha-sign-slowing"), rationale: "With both signs the same the fan would be speeding up. α does not have to point the way the fan spins." },
        { id: "b", text: r`$\omega > 0$ and $\alpha < 0$`, rationale: "It still turns counterclockwise (ω > 0), and ω is decreasing, so α < 0." },
        { id: "c", text: r`$\omega < 0$ and $\alpha < 0$`, misconception: M("rotation-sign"), rationale: "The fan is still turning counterclockwise, the positive direction, so ω is positive." },
        { id: "d", text: r`$\omega = 0$ and $\alpha < 0$`, rationale: "ω is zero only at the moment the fan stops. While it slows it is still turning." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Which way is it still turning while it slows?", "Is ω getting larger or smaller?"],
    solution: r`The fan keeps turning counterclockwise, so $\omega > 0$. Its angular velocity is decreasing toward zero, so $\Delta\omega < 0$ and $\alpha < 0$. Opposite signs of ω and α mean slowing down.`,
  }),
  q("aq-10", [AQ], 3, "omega-table", 75, {
    prompt: r`The table shows the angular velocity of a turntable (counterclockwise positive).

| $t$ (s) | 0 | 2 | 4 | 6 | 8 |
|---|---|---|---|---|---|
| $\omega$ (rad/s) | 0 | 6 | 6 | 3 | 0 |

Assuming the angular velocity changes steadily between the listed times, during which interval is the angular acceleration negative?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$0$ to $2${s}$`, rationale: "ω rises from 0 to 6 rad/s here, so α is positive." },
        { id: "b", text: r`$2$ to $4${s}$`, rationale: "ω stays at 6 rad/s, so α is zero." },
        { id: "c", text: r`$4$ to $8${s}$`, rationale: "ω falls from 6 to 0 rad/s, so α is negative (−1.5 rad/s²)." },
        { id: "d", text: "Never, because the angular velocity is never negative.", misconception: M("alpha-sign-slowing"), rationale: "α is negative whenever ω is decreasing, even if ω itself stays positive." },
      ],
      correctChoiceId: "c",
    },
    hints: ["α is the rate of change of ω.", "Look for the interval where ω is decreasing."],
    solution: r`α is negative whenever ω decreases. From $4$ to $8${s}$ ω drops from $6$ to $0${rps}$: $\alpha = \dfrac{0 - 6}{4} = -1.5${rps2}$. The turntable still spins counterclockwise; it is just slowing.`,
  }),
  q("aq-11", [AQ], 3, "average-omega", 90, {
    prompt: r`A cable reel turns $5.0$ revolutions counterclockwise and then $2.0$ revolutions clockwise, all in $14${s}$. Taking counterclockwise as positive, what is the reel's average angular velocity over the $14${s}$?`,
    body: num(1.346, "rad/s", { abs: 0.02 }, [
      { value: 3.142, misconception: M("rotation-sign"), note: "That adds the clockwise turns as if they were counterclockwise. Angular displacement is the net turn." },
      { value: 0.214, misconception: M("revolutions-not-radians"), note: "That is in revolutions per second. Convert to radians." },
    ]),
    hints: ["Find the net angular displacement first: turns in opposite directions cancel.", "Convert the net turn to radians, then divide by the time."],
    solution: r`Net turn: $5.0 - 2.0 = 3.0$ rev counterclockwise $= 3.0 \times 2\pi = 6\pi \approx 18.8${rad}$. $\omega_{\text{avg}} = \dfrac{18.8${rad}}{14${s}} \approx +1.35${rps}$.`,
  }),
  q("aq-check-1", [AQ], 1, "convert", 30, {
    prompt: r`A steering wheel is turned through half a revolution. What is this angle in radians?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$\pi${rad}$`, rationale: r`Half a turn is $180^\circ$, which is $\pi$ radians.` },
        { id: "b", text: r`$2\pi${rad}$`, rationale: r`$2\pi$ rad is a full turn.` },
        { id: "c", text: r`$\dfrac{\pi}{2}${rad}$`, rationale: r`$\dfrac{\pi}{2}$ rad is a quarter turn.` },
        { id: "d", text: r`$180${rad}$`, misconception: M("revolutions-not-radians"), rationale: "180 is the angle in degrees, not radians." },
      ],
      correctChoiceId: "a",
    },
    hints: ["How many radians are in one full revolution?", "Take half of that."],
    solution: r`A full revolution is $2\pi$ rad, so half a revolution is $\tfrac12 \times 2\pi = \pi$ rad (that is, $180^\circ$).`,
  }),
  q("aq-check-2", [AQ], 2, "rpm", 45, {
    prompt: r`A vinyl record turns at $45$ rpm (revolutions per minute). What is its angular velocity in rad/s?`,
    body: num(4.71, "rad/s", { abs: 0.03 }, [
      { value: 0.75, misconception: M("revolutions-not-radians"), note: "0.75 is revolutions per second. Multiply by 2π rad per revolution." },
    ]),
    hints: ["First find the revolutions per second.", r`Then convert revolutions to radians with $2\pi$ rad per revolution.`],
    solution: r`$45$ rev/min $= 0.75$ rev/s. $\omega = 0.75 \times 2\pi \approx 4.71${rps}$.`,
  }),
  q("aq-quiz-1", [AQ], 2, "rpm", 60, {
    prompt: r`The rotor of a large wind turbine makes $18$ revolutions per minute. What is its angular velocity in rad/s?`,
    body: num(1.885, "rad/s", { abs: 0.02 }, [
      { value: 0.3, misconception: M("revolutions-not-radians"), note: "0.3 is revolutions per second. One revolution is 2π rad." },
    ]),
    hints: ["Convert minutes to seconds.", "Convert revolutions to radians."],
    solution: r`$18$ rev/min $= 0.30$ rev/s; $\omega = 0.30 \times 2\pi \approx 1.88${rps}$.`,
  }),
  q("aq-test-1", [AQ], 2, "convert", 60, {
    prompt: "Which of these angles is the largest?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$3.0${rad}$`, rationale: r`$3.0$ rad $\approx 172^\circ$: close, but a little less than half a turn, since $\pi \approx 3.14$.` },
        { id: "b", text: r`$150^\circ$`, rationale: r`$150^\circ$ is less than half a turn.` },
        { id: "c", text: "0.50 revolution", rationale: r`Half a revolution is $180^\circ$ ($\pi$ rad), the largest of the four.` },
        { id: "d", text: r`$\dfrac{\pi}{2}${rad}$`, rationale: r`$\dfrac{\pi}{2}$ rad is only $90^\circ$.` },
      ],
      correctChoiceId: "c",
    },
    hints: ["Convert every angle to the same unit.", r`Remember $\pi \approx 3.14$.`],
    solution: r`In degrees: $3.0$ rad $\approx 172^\circ$, $150^\circ$, $0.50$ rev $= 180^\circ$, $\tfrac{\pi}{2}$ rad $= 90^\circ$. Half a revolution is the largest.`,
  }),

  // ───────────────────── Constant angular acceleration ─────────────────────
  q("rk-1", [RK], 1, "analogy", 60, {
    prompt: "Every equation for straight-line motion has a rotational twin. Match each linear quantity or equation with its rotational counterpart.",
    body: {
      type: "matching",
      left: [
        { id: "x", text: r`Position $x$` },
        { id: "v", text: r`Velocity $v$` },
        { id: "a", text: r`Acceleration $a$` },
        { id: "eq", text: r`$\Delta x = v_0 t + \tfrac12 a t^2$` },
      ],
      right: [
        { id: "theta", text: r`Angular position $\theta$` },
        { id: "omega", text: r`Angular velocity $\omega$` },
        { id: "alpha", text: r`Angular acceleration $\alpha$` },
        { id: "req", text: r`$\Delta\theta = \omega_0 t + \tfrac12 \alpha t^2$` },
        { id: "other", text: r`$\omega = \dfrac{2\pi}{T}$` },
      ],
      pairs: { x: "theta", v: "omega", a: "alpha", eq: "req" },
    },
    hints: ["Swap each linear symbol for its Greek rotational partner.", "One option on the right is left over."],
    solution: r`$x \to \theta$, $v \to \omega$, $a \to \alpha$, and the position equation becomes $\Delta\theta = \omega_0 t + \tfrac12\alpha t^2$. The period formula has no linear twin in this list.`,
  }),
  q("rk-2", [RK], 2, "omega-after-time", 45, {
    prompt: r`A ceiling fan starts from rest with a constant angular acceleration of $3.0${rps2}$. What is its angular velocity after $4.0${s}$?`,
    body: num(12, "rad/s", { abs: 0.05 }),
    hints: ["Which equation links ω, ω₀, α and t?", r`Starting from rest means $\omega_0 = 0$.`],
    solution: r`$\omega = \omega_0 + \alpha t = 0 + (3.0)(4.0) = 12${rps}$.`,
  }),
  q("rk-3", [RK], 2, "angle-after-time", 60, {
    prompt: r`A lathe starts from rest and speeds up with a constant angular acceleration of $2.5${rps2}$. Through what angle does it turn in the first $6.0${s}$?`,
    body: num(45, "rad", { abs: 0.2 }, [
      { value: 90, misconception: M("drops-half-rotation"), note: "The position equation has ½αt², not αt²." },
    ]),
    hints: [r`Use $\Delta\theta = \omega_0 t + \tfrac12\alpha t^2$.`, r`Here $\omega_0 = 0$.`],
    solution: r`$\Delta\theta = 0 + \tfrac12(2.5)(6.0)^2 = \tfrac12(2.5)(36) = 45${rad}$ (about 7.2 revolutions).`,
  }),
  q("rk-4", [RK], 3, "stopping-angle", 75, {
    prompt: r`A grinding wheel spinning at $60${rps}$ is switched off and slows uniformly with an angular acceleration of magnitude $4.0${rps2}$. Through what angle does it turn before it stops?`,
    body: num(450, "rad", { abs: 2 }, [
      { value: 900, misconception: M("drops-half-rotation"), note: "The factor of 2 in ω² = ω₀² + 2αΔθ has gone missing." },
    ]),
    hints: ["The time is not given. Which equation does not need it?", "The final angular velocity is zero and α is negative."],
    solution: r`$\omega^2 = \omega_0^2 + 2\alpha\Delta\theta$ with $\omega = 0$, $\alpha = -4.0${rps2}$: $0 = 3600 + 2(-4.0)\Delta\theta$, so $\Delta\theta = \dfrac{3600}{8.0} = 450${rad}$.`,
  }),
  q("rk-5", [RK], 3, "revolutions-count", 90, {
    prompt: r`A laboratory centrifuge spinning at $300${rps}$ is switched off and slows uniformly to rest in $25${s}$. How many **revolutions** does it make while stopping?`,
    body: num(597, "rev", { abs: 2 }, [
      { value: 3750, misconception: M("revolutions-not-radians"), note: "3750 is the angle in radians. Divide by 2π to get revolutions." },
      { value: 1194, misconception: M("drops-half-rotation"), note: "This uses the starting angular velocity for the whole time. While slowing uniformly, the average is half of 300 rad/s." },
    ]),
    hints: ["For uniform slowing, the average angular velocity is halfway between the start and end values.", "Find the angle in radians, then convert to revolutions."],
    solution: r`$\Delta\theta = \omega_{\text{avg}}t = \dfrac{300 + 0}{2}(25) = 3750${rad}$. In revolutions: $\dfrac{3750}{2\pi} \approx 597$ rev.`,
  }),
  q("rk-6", [RK], 3, "choose-equation", 60, {
    prompt: r`You know a flywheel's initial angular velocity, its final angular velocity and its constant angular acceleration. You want the angle it turned through, and the time is **not** known. Which equation should you use?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$\omega = \omega_0 + \alpha t$`, rationale: "This contains t but not Δθ, so it cannot give the angle directly." },
        { id: "b", text: r`$\Delta\theta = \omega_0 t + \tfrac12\alpha t^2$`, rationale: "This needs the time, which you do not have." },
        { id: "c", text: r`$\omega^2 = \omega_0^2 + 2\alpha\Delta\theta$`, rationale: "It links ω, ω₀, α and Δθ with no t: exactly what you have and want." },
        { id: "d", text: r`$\Delta\theta = \tfrac12(\omega_0 + \omega)t$`, rationale: "This also needs the time." },
      ],
      correctChoiceId: "c",
    },
    hints: ["List the knowns and the unknown.", "Pick the equation that contains all of them and nothing else unknown."],
    solution: r`Knowns: $\omega_0$, $\omega$, $\alpha$. Unknown: $\Delta\theta$. Missing: $t$. The only equation without $t$ is $\omega^2 = \omega_0^2 + 2\alpha\Delta\theta$.`,
  }),
  q("rk-7", [RK], 4, "omega-after-angle", 90, {
    prompt: r`A wheel turning at $2.0${rps}$ speeds up with a constant angular acceleration of $1.5${rps2}$ while it turns through $20${rad}$. What is its final angular velocity?`,
    body: num(8.0, "rad/s", { abs: 0.05 }, [
      { value: 5.83, misconception: M("drops-half-rotation"), note: "The 2 in 2αΔθ has been dropped." },
    ]),
    hints: ["No time is given, so choose the equation without t.", r`Solve $\omega^2 = \omega_0^2 + 2\alpha\Delta\theta$ for ω.`],
    solution: r`$\omega^2 = (2.0)^2 + 2(1.5)(20) = 4.0 + 60 = 64$, so $\omega = 8.0${rps}$.`,
  }),
  q("rk-8", [RK], 3, "omega-after-time", 60, {
    prompt: r`A turbine spinning at $40${rps}$ has a constant angular acceleration of $-2.5${rps2}$. How long does it take for its angular velocity to fall to $15${rps}$?`,
    body: num(10, "s", { abs: 0.05 }),
    hints: [r`Rearrange $\omega = \omega_0 + \alpha t$ for $t$.`, "Keep the sign of α."],
    solution: r`$t = \dfrac{\omega - \omega_0}{\alpha} = \dfrac{15 - 40}{-2.5} = 10${s}$.`,
  }),
  q("rk-9", [RK], 3, "proportional", 60, {
    prompt: r`A wheel starts from rest with a constant angular acceleration. In a time $t$ it turns through an angle $\theta$. Through what **total** angle has it turned, measured from the start, after a time $2t$?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$2\theta$`, rationale: "That would be true at constant angular velocity. Here the wheel keeps speeding up." },
        { id: "b", text: r`$3\theta$`, rationale: r`$3\theta$ is the angle turned during the second interval alone (from $t$ to $2t$).` },
        { id: "c", text: r`$4\theta$`, rationale: r`From rest, $\Delta\theta = \tfrac12\alpha t^2 \propto t^2$; doubling $t$ multiplies the angle by 4.` },
        { id: "d", text: r`$8\theta$`, rationale: "The angle grows with the square of the time, not the cube." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Write the angle from rest in terms of α and t.", "How does it scale when t doubles?"],
    solution: r`From rest $\Delta\theta = \tfrac12\alpha t^2$. Replacing $t$ with $2t$ gives $\tfrac12\alpha(2t)^2 = 4 \cdot \tfrac12\alpha t^2 = 4\theta$.`,
  }),
  q("rk-10", [RK], 3, "proportional", 60, {
    prompt: r`A spinning wheel is braked with a constant angular acceleration and turns through an angle $\theta$ before stopping. If it had been spinning **twice as fast** initially, with the same braking angular acceleration, how far would it turn before stopping?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$\theta$`, rationale: "A faster wheel takes longer to stop and turns farther." },
        { id: "b", text: r`$2\theta$`, rationale: r`The stopping angle depends on $\omega_0^2$, not $\omega_0$.` },
        { id: "c", text: r`$4\theta$`, rationale: r`$\Delta\theta = \dfrac{\omega_0^2}{2|\alpha|}$, so doubling $\omega_0$ quadruples the angle.` },
        { id: "d", text: r`$\sqrt2\,\theta$`, rationale: "The angle grows faster than the starting angular velocity, not slower." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Use the equation without time, with final ω = 0.", r`How does $\Delta\theta$ depend on $\omega_0$?`],
    solution: r`$0 = \omega_0^2 + 2\alpha\Delta\theta \Rightarrow \Delta\theta = \dfrac{\omega_0^2}{2|\alpha|}$. Doubling $\omega_0$ multiplies $\omega_0^2$ by 4, so the angle becomes $4\theta$.`,
  }),
  q("rk-11", [RK], 3, "graph-area", 75, {
    prompt: r`A graph of a winch drum's angular velocity against time shows ω increasing steadily from $0$ to $8.0${rps}$ during the first $4.0${s}$, then staying at $8.0${rps}$ for the next $3.0${s}$. Through what total angle does the drum turn in the $7.0${s}$?`,
    body: num(40, "rad", { abs: 0.2 }, [
      { value: 56, misconception: M("drops-half-rotation"), note: "During the first 4 s ω was rising from 0, so the drum averaged only half of 8.0 rad/s." },
    ]),
    hints: ["On an ω–t graph, the area under the line is the angular displacement.", "Split the area into a triangle and a rectangle."],
    solution: r`Triangle: $\tfrac12(4.0)(8.0) = 16${rad}$. Rectangle: $(3.0)(8.0) = 24${rad}$. Total $40${rad}$.`,
  }),
  q("rk-12", [RK], 4, "angle-after-time", 90, {
    prompt: r`A motor winds a cable reel at $+10${rps}$ (counterclockwise positive). The motor is then switched into reverse, giving the reel a constant angular acceleration of $-2.0${rps2}$. What is the reel's angular displacement during the $8.0${s}$ after the switch?`,
    body: num(16, "rad", { abs: 0.2 }, [
      { value: 144, misconception: M("rotation-sign"), note: "The ½αt² term must carry the negative sign of α." },
    ]),
    hints: [r`Use $\Delta\theta = \omega_0 t + \tfrac12\alpha t^2$ with the signs included.`, "The reel stops and reverses partway through; the equation handles that automatically."],
    solution: r`$\Delta\theta = (10)(8.0) + \tfrac12(-2.0)(8.0)^2 = 80 - 64 = +16${rad}$. (The reel turns $25${rad}$ forward until it stops at $t = 5.0${s}$, then $9${rad}$ back.)`,
  }),
  q("rk-13", [RK], 3, "symbolic", 75, {
    prompt: r`A disc starts from rest and turns with constant angular acceleration $\alpha$. Write an expression for its angular velocity after it has turned through an angle $\theta$.`,
    body: {
      type: "expression",
      answer: "sqrt(2*alpha*theta)",
      variables: ["alpha", "theta"],
      domain: [0.5, 5],
      inputHint: "Type alpha for α and theta for θ. Use sqrt( ) for a square root.",
      commonErrors: [{ expr: "sqrt(alpha*theta)", misconception: M("drops-half-rotation"), note: "The equation without time is ω² = ω₀² + 2αΔθ: keep the 2." }],
    },
    hints: ["No time is mentioned. Which equation avoids it?", r`Set $\omega_0 = 0$ and solve for $\omega$.`],
    solution: r`$\omega^2 = 0 + 2\alpha\theta$, so $\omega = \sqrt{2\alpha\theta}$.`,
  }),
  q("rk-check-1", [RK], 1, "omega-after-time", 45, {
    prompt: r`A potter's wheel turning at $5.0${rps}$ speeds up with a constant angular acceleration of $2.0${rps2}$. What is its angular velocity $3.0${s}$ later?`,
    body: num(11, "rad/s", { abs: 0.05 }),
    hints: [r`Use $\omega = \omega_0 + \alpha t$.`, "Add the change in ω to the starting value."],
    solution: r`$\omega = 5.0 + (2.0)(3.0) = 11${rps}$.`,
  }),
  q("rk-check-2", [RK], 2, "angle-after-time", 45, {
    prompt: r`A wheel starts from rest with a constant angular acceleration of $4.0${rps2}$. Through what angle does it turn in $5.0${s}$?`,
    body: num(50, "rad", { abs: 0.2 }, [
      { value: 100, misconception: M("drops-half-rotation"), note: "Remember the ½ in ½αt²." },
    ]),
    hints: [r`Use $\Delta\theta = \omega_0 t + \tfrac12\alpha t^2$.`, r`$\omega_0 = 0$ here.`],
    solution: r`$\Delta\theta = \tfrac12(4.0)(5.0)^2 = 50${rad}$.`,
  }),
  q("rk-quiz-1", [RK], 3, "angle-after-time", 75, {
    prompt: r`A ceiling fan starts from rest and reaches $12${rps}$ in $4.0${s}$ with a constant angular acceleration. Through what angle does it turn during these $4.0${s}$?`,
    body: num(24, "rad", { abs: 0.1 }, [
      { value: 48, misconception: M("drops-half-rotation"), note: "This uses the final angular velocity for the whole time. Starting from rest, the average is half of 12 rad/s." },
    ]),
    hints: ["With constant α, the average angular velocity is the mean of the start and end values.", "Multiply the average by the time."],
    solution: r`$\Delta\theta = \tfrac12(\omega_0 + \omega)t = \tfrac12(0 + 12)(4.0) = 24${rad}$.`,
  }),
  q("rk-test-1", [RK, AQ], 3, "stopping-angle", 120, {
    prompt: r`A washing machine drum spinning at $120${rps}$ slows uniformly to rest while turning through $30$ revolutions. What is the magnitude of its angular acceleration?`,
    body: num(38.2, "rad/s²", { abs: 0.3 }, [
      { value: 240, misconception: M("revolutions-not-radians"), note: "30 revolutions must be converted to radians (×2π) before using the equation." },
    ]),
    hints: ["Convert the revolutions to radians.", "No time is given: use the equation without t, with final ω = 0."],
    solution: r`$\Delta\theta = 30 \times 2\pi \approx 188.5${rad}$. $0 = 120^2 + 2\alpha(188.5) \Rightarrow |\alpha| = \dfrac{14400}{377} \approx 38.2${rps2}$.`,
  }),
  q("rk-test-2", [RK], 4, "proportional", 75, {
    prompt: r`A wheel starts from rest with constant angular acceleration and turns through $10${rad}$ in the first $2.0${s}$. Through what angle does it turn in the **next** $2.0${s}$?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$10${rad}$`, rationale: "That would be right if it turned at constant angular velocity. It keeps speeding up." },
        { id: "b", text: r`$20${rad}$`, rationale: "The angle from rest grows with t², not t." },
        { id: "c", text: r`$30${rad}$`, rationale: r`After $4.0${s}$ the total is $4 \times 10 = 40${rad}$, so $30${rad}$ come in the second interval.` },
        { id: "d", text: r`$40${rad}$`, rationale: "40 rad is the total from the start, not the amount during the next 2.0 s." },
      ],
      correctChoiceId: "c",
    },
    hints: ["From rest, how does the total angle depend on time?", "Find the total after 4.0 s, then subtract the first 10 rad."],
    solution: r`$\Delta\theta \propto t^2$ from rest, so doubling the time gives $4 \times 10 = 40${rad}$ in total. The next $2.0${s}$ contribute $40 - 10 = 30${rad}$.`,
  }),

  // ───────────────────── Linking linear and angular motion ─────────────────────
  q("la-1", [LA], 1, "arc-length", 45, {
    prompt: r`A point on the rim of a wheel of radius $0.30${m}$ turns through an angle of $2.0${rad}$. How far does the point travel along its circular path?`,
    body: num(0.6, "m", { abs: 0.005 }),
    hints: ["Arc length equals radius times angle, with the angle in radians.", r`Use $s = r\theta$.`],
    solution: r`$s = r\theta = (0.30${m})(2.0) = 0.60${m}$.`,
  }),
  q("la-2", [LA], 2, "arc-length", 60, {
    prompt: r`A door $0.90${m}$ wide swings open through $60^\circ$. How far does the outer edge of the door travel?`,
    body: num(0.942, "m", { abs: 0.01 }, [
      { value: 54, misconception: M("revolutions-not-radians"), note: "s = rθ only works with θ in radians. 60° must be converted first." },
    ]),
    hints: [r`$s = r\theta$ needs the angle in radians.`, r`$60^\circ$ is one sixth of a full turn.`],
    solution: r`$60^\circ = \dfrac{\pi}{3}${rad}$. $s = r\theta = (0.90)\left(\dfrac{\pi}{3}\right) \approx 0.94${m}$.`,
  }),
  q("la-3", [LA], 2, "tangential-speed", 45, {
    prompt: r`A merry-go-round of radius $2.5${m}$ rotates at a steady $1.2${rps}$. How fast is a child sitting at the outer edge moving?`,
    body: num(3.0, "m/s", { abs: 0.02 }),
    hints: ["Linear speed of a point equals its distance from the axis times the angular speed.", r`Use $v = r\omega$.`],
    solution: r`$v = r\omega = (2.5)(1.2) = 3.0${ms}$.`,
  }),
  q("la-4", [LA], 2, "same-omega", 60, {
    prompt: r`On a rotating merry-go-round, Ana sits $1.0${m}$ from the centre and Ben sits $2.0${m}$ from the centre. How do their angular velocities and linear speeds compare?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Same angular velocity; Ben's linear speed is twice Ana's.", rationale: "Both complete a turn in the same time (same ω), and v = rω doubles with r." },
        { id: "b", text: "Same linear speed; Ben's angular velocity is half Ana's.", misconception: M("rigid-body-speeds"), rationale: "Points on one rigid object share ω, not linear speed. Ben goes around a bigger circle in the same time." },
        { id: "c", text: "Ben has both the larger angular velocity and the larger linear speed.", misconception: M("rigid-body-speeds"), rationale: "Ben moves faster, but both of them complete each turn together, so ω is the same." },
        { id: "d", text: "They have the same angular velocity and the same linear speed.", misconception: M("rigid-body-speeds"), rationale: "Same ω, yes, but Ben covers twice the distance per turn, so he moves faster." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Do they complete a revolution in the same time?", r`Then use $v = r\omega$.`],
    solution: r`The merry-go-round is rigid, so every point turns through the same angle in the same time: same ω. With $v = r\omega$, Ben at twice the radius moves twice as fast.`,
  }),
  q("la-5", [LA], 3, "tangential-speed", 75, {
    prompt: r`A grinding wheel of radius $0.20${m}$ spins at $300$ rpm. How fast is a point on its rim moving, in m/s?`,
    body: num(6.28, "m/s", { abs: 0.05 }, [
      { value: 60, misconception: M("revolutions-not-radians"), note: "v = rω needs ω in rad/s, not revolutions per minute." },
      { value: 1, misconception: M("revolutions-not-radians"), note: "That uses 5 rev/s as if it were 5 rad/s. Each revolution is 2π rad." },
    ]),
    hints: ["Convert rpm to rad/s first.", r`Then use $v = r\omega$.`],
    solution: r`$\omega = 300 \times \dfrac{2\pi}{60} = 10\pi \approx 31.4${rps}$. $v = r\omega = (0.20)(31.4) \approx 6.28${ms}$.`,
  }),
  q("la-6", [LA], 3, "rolling", 60, {
    prompt: r`A bicycle wheel of radius $0.35${m}$ rolls without slipping while the bike moves forward at $7.0${ms}$. What is the wheel's angular speed?`,
    body: num(20, "rad/s", { abs: 0.1 }),
    hints: ["When a wheel rolls without slipping, the bike's speed equals the rim speed of the wheel relative to the axle.", r`Rearrange $v = r\omega$.`],
    solution: r`Rolling without slipping: $v = r\omega$, so $\omega = \dfrac{v}{r} = \dfrac{7.0}{0.35} = 20${rps}$.`,
  }),
  q("la-7", [LA], 3, "belt", 90, {
    prompt: r`A belt that does not slip connects a small motor pulley of radius $0.040${m}$ to a larger pulley of radius $0.12${m}$. The motor pulley turns at $150${rps}$. What is the angular speed of the larger pulley?`,
    body: num(50, "rad/s", { abs: 0.2 }, [
      { value: 150, misconception: M("rigid-body-speeds"), note: "Pulleys linked by a belt share the belt's speed at their rims, not their angular speed." },
      { value: 450, misconception: M("rigid-body-speeds"), note: "The larger pulley must turn more slowly to give the same rim speed, not faster." },
    ]),
    hints: ["What quantity is the same at the rim of both pulleys?", r`Find the belt speed with $v = r\omega$, then use it for the larger pulley.`],
    solution: r`Belt speed: $v = (0.040)(150) = 6.0${ms}$. Larger pulley: $\omega = \dfrac{v}{r} = \dfrac{6.0}{0.12} = 50${rps}$.`,
  }),
  q("la-8", [LA], 3, "same-omega", 90, {
    prompt: "A rigid disc rotates about a fixed axle through its centre. Select **all** the statements that are correct.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "Every point on the disc has the same angular velocity." },
        { id: "b", text: "Every point on the disc has the same linear speed.", misconception: M("rigid-body-speeds"), rationale: "Linear speed is v = rω, so it grows with distance from the axle." },
        { id: "c", text: "A point's linear speed is proportional to its distance from the axle." },
        { id: "d", text: "A point exactly on the axle has zero linear speed." },
        { id: "e", text: "Points near the rim complete a revolution in less time than points near the axle.", misconception: M("rigid-body-speeds"), rationale: "The disc is rigid: every point completes a revolution in the same time." },
      ],
      correctChoiceIds: ["a", "c", "d"],
    },
    hints: ["Does any part of a rigid disc get ahead of another part in angle?", r`Think about $v = r\omega$ at different values of $r$.`],
    solution: r`A rigid disc turns as one piece: same ω and same period everywhere (a ✓, e ✗). Linear speed $v = r\omega$ grows with $r$ (c ✓, b ✗) and is zero on the axle (d ✓).`,
  }),
  q("la-9", [LA, CR], 3, "tangential-accel", 45, {
    prompt: r`A wheel of radius $0.40${m}$ has an angular acceleration of $5.0${rps2}$. What is the tangential acceleration of a point on its rim?`,
    body: num(2.0, "m/s²", { abs: 0.02 }),
    hints: ["Tangential acceleration is the rate at which a point's speed changes.", r`Use $a_t = r\alpha$.`],
    solution: r`$a_t = r\alpha = (0.40)(5.0) = 2.0${ms2}$.`,
  }),
  q("la-10", [LA], 3, "symbolic", 90, {
    prompt: r`A wheel of radius $R$ rolls without slipping. Starting from rest, its centre moves with constant linear acceleration $a$. Write an expression for the wheel's angular velocity after a time $t$.`,
    body: {
      type: "expression",
      answer: "a*t/R",
      variables: ["a", "t", "R"],
      domain: [1, 5],
      inputHint: "Use a, t and R (capital R). Use * and /.",
    },
    hints: ["First find the linear speed of the centre after time t.", "Then convert it to an angular velocity using the radius."],
    solution: r`$v = at$ (from rest). Rolling without slipping: $\omega = \dfrac{v}{R} = \dfrac{at}{R}$.`,
  }),
  q("la-check-1", [LA], 1, "same-omega", 45, {
    prompt: r`Two pebbles are stuck in the tread of a spinning bicycle wheel (the wheel is held off the ground): pebble A near the hub and pebble B at the rim. Which pebble has the greater angular velocity?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Pebble A", misconception: M("rigid-body-speeds"), rationale: "Both pebbles complete each turn together, so neither turns faster in angle." },
        { id: "b", text: "Pebble B", misconception: M("rigid-body-speeds"), rationale: "B moves faster through space, but it turns through the same angle per second as A." },
        { id: "c", text: "They have the same angular velocity.", rationale: "Points on a rigid wheel turn through the same angle in the same time." },
        { id: "d", text: "It depends on how fast the wheel spins.", rationale: "Whatever the spin rate, every point on the wheel shares it." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Angular velocity is angle turned per second.", "Does one pebble ever get ahead of the other in angle?"],
    solution: "The wheel is rigid, so both pebbles turn through the same angle every second: same ω. Pebble B has the greater linear speed because it is farther from the axle.",
  }),
  q("la-check-2", [LA], 1, "tangential-speed", 30, {
    prompt: r`A point $0.50${m}$ from the axis of a rotating platform moves with the platform at $8.0${rps}$. What is the point's linear speed?`,
    body: num(4.0, "m/s", { abs: 0.02 }),
    hints: [r`Use $v = r\omega$.`, "Multiply the distance from the axis by the angular speed."],
    solution: r`$v = r\omega = (0.50)(8.0) = 4.0${ms}$.`,
  }),
  q("la-quiz-1", [LA], 2, "same-omega", 60, {
    prompt: "A lawn sprinkler arm rotates at a steady rate. Compare a point at the tip of the arm with a point halfway along it.",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The tip has twice the angular velocity and the same linear speed.", misconception: M("rigid-body-speeds"), rationale: "The whole arm turns together, so the angular velocity is the same everywhere." },
        { id: "b", text: "Both have the same angular velocity; the tip has twice the linear speed.", rationale: "Same ω for a rigid arm; v = rω doubles with r." },
        { id: "c", text: "Both have the same angular velocity and the same linear speed.", misconception: M("rigid-body-speeds"), rationale: "The tip travels a circle twice as large in the same time, so it moves faster." },
        { id: "d", text: "The midpoint has twice the angular velocity of the tip.", misconception: M("rigid-body-speeds"), rationale: "Both points complete each turn together." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Do both points complete a turn in the same time?", r`Use $v = r\omega$.`],
    solution: r`The arm is rigid, so both points have the same ω. The tip is twice as far from the axis, so by $v = r\omega$ its speed is twice as large.`,
  }),
  q("la-test-1", [LA], 2, "tangential-speed", 60, {
    prompt: r`Thread unwinds from a spool of radius $0.050${m}$ at a steady $0.80${ms}$ without slipping. What is the spool's angular speed?`,
    body: num(16, "rad/s", { abs: 0.1 }),
    hints: ["The thread leaves the spool at the same speed as the spool's rim.", r`Rearrange $v = r\omega$.`],
    solution: r`$\omega = \dfrac{v}{r} = \dfrac{0.80}{0.050} = 16${rps}$.`,
  }),

  // ──────────────── Tangential and centripetal acceleration ────────────────
  q("cr-1", [CR], 2, "compute-centripetal", 60, {
    prompt: r`A point is $0.15${m}$ from the axis of a disc spinning at a constant $20${rps}$. What is the magnitude of its centripetal acceleration?`,
    body: num(60, "m/s²", { abs: 0.3 }, [
      { value: 3, misconception: M("centripetal-unsquared"), note: "rω is the point's speed (in m/s), not its acceleration. Centripetal acceleration is rω²." },
    ]),
    hints: [r`Centripetal acceleration can be written $a_c = r\omega^2$.`, "Square the angular speed before multiplying."],
    solution: r`$a_c = r\omega^2 = (0.15)(20)^2 = (0.15)(400) = 60${ms2}$, directed toward the axis.`,
  }),
  q("cr-2", [CR], 2, "constant-omega", 60, {
    prompt: r`A ceiling fan spins at a constant $10${rps}$. Which statement best describes the acceleration of a point on the tip of a blade?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "It has no acceleration, because the fan spins at a constant rate.", misconception: M("constant-omega-no-acceleration"), rationale: "The point's speed is constant, but its direction keeps changing, so it accelerates toward the centre." },
        { id: "b", text: "It has only a tangential acceleration, along its direction of motion.", misconception: M("tangential-centripetal-confusion"), rationale: "Tangential acceleration changes the speed, and α = 0 here, so a_t = rα = 0." },
        { id: "c", text: "It has only a centripetal acceleration, directed toward the axis.", rationale: "Constant ω means a_t = 0, but the direction of motion is turning, so a_c = rω² toward the axis." },
        { id: "d", text: "It has only an acceleration directed outward, away from the axis.", rationale: "The acceleration of a point moving in a circle points inward, toward the centre." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Is the point's speed changing? Is its direction changing?", "Each kind of change goes with one component of the acceleration."],
    solution: r`Constant ω means $\alpha = 0$, so $a_t = r\alpha = 0$: the speed does not change. The velocity's direction is always turning, though, so there is a centripetal acceleration $a_c = r\omega^2$ toward the axis.`,
  }),
  q("cr-3", [CR], 3, "compare-radii", 60, {
    prompt: r`Points A and B are on the same spinning disc. B is twice as far from the axis as A. What is the ratio of B's centripetal acceleration to A's?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$\tfrac12$`, misconception: M("rigid-body-speeds"), rationale: "That uses v²/r with the same v for both points. On a rigid disc they share ω, not v." },
        { id: "b", text: "1", rationale: "Same ω does not mean the same centripetal acceleration: a_c also depends on r." },
        { id: "c", text: "2", rationale: "With the same ω, a_c = rω² is proportional to r." },
        { id: "d", text: "4", rationale: "r is not squared in a_c = rω²; ω is." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Which quantity do the two points share?", r`Write $a_c$ in terms of that shared quantity and $r$.`],
    solution: r`Both share ω. $a_c = r\omega^2$, so doubling $r$ doubles $a_c$. (Using $v^2/r$ gives the same result once you note that B's speed is also doubled: $(2v)^2/(2r) = 2v^2/r$.)`,
  }),
  q("cr-4", [CR, LA], 3, "total-accel", 90, {
    prompt: r`At one instant, a wheel of radius $0.50${m}$ has angular velocity $4.0${rps}$ and angular acceleration $6.0${rps2}$. What is the magnitude of the total acceleration of a point on its rim?`,
    body: num(8.54, "m/s²", { abs: 0.05 }, [
      { value: 11, misconception: M("tangential-centripetal-confusion"), note: "The tangential and centripetal parts are perpendicular, so their magnitudes do not simply add." },
    ]),
    hints: [r`Find $a_t = r\alpha$ and $a_c = r\omega^2$ separately.`, "The two components are perpendicular to each other."],
    solution: r`$a_t = (0.50)(6.0) = 3.0${ms2}$ (along the rim); $a_c = (0.50)(4.0)^2 = 8.0${ms2}$ (toward the centre). Perpendicular, so $a = \sqrt{3.0^2 + 8.0^2} \approx 8.5${ms2}$.`,
  }),
  q("cr-5", [CR], 3, "direction", 75, {
    prompt: "A wheel spins counterclockwise and is speeding up. Which statement describes the direction of the acceleration of a point on its rim?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Exactly toward the centre of the wheel.", misconception: M("tangential-centripetal-confusion"), rationale: "That is only the centripetal part. Because the wheel speeds up, there is also a tangential part." },
        { id: "b", text: "Exactly along the point's direction of motion.", misconception: M("tangential-centripetal-confusion"), rationale: "That is only the tangential part. Any point moving in a circle also has a centripetal part." },
        { id: "c", text: "Partly toward the centre and partly forward along the direction of motion.", rationale: "The centripetal part turns the velocity; the tangential part (forward, since it is speeding up) increases the speed." },
        { id: "d", text: "Partly away from the centre and partly backward against the motion.", rationale: "Centripetal acceleration points inward, and a speeding-up point accelerates forward." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Is the point's speed changing? Is its direction changing?", "Combine the two parts."],
    solution: r`The changing direction gives a centripetal component toward the centre. The increasing speed gives a tangential component forward along the motion. The total acceleration points between them: inward and forward.`,
  }),
  q("cr-6", [CR, LA], 3, "compute-centripetal", 75, {
    prompt: r`A car moves at $25${ms}$ on tyres of radius $0.32${m}$ that roll without slipping. Relative to the axle, what is the centripetal acceleration of a small stone stuck in the tread?`,
    body: num(1953, "m/s²", { rel: 0.01 }, [
      { value: 78.1, misconception: M("centripetal-unsquared"), note: "That is v/r, the angular speed in rad/s. Centripetal acceleration is v²/r (or rω²)." },
    ]),
    hints: ["Relative to the axle, the stone moves in a circle at the car's speed.", r`Use $a_c = \dfrac{v^2}{r}$ or $a_c = r\omega^2$.`],
    solution: r`Rolling without slipping, the tread moves at $25${ms}$ relative to the axle. $a_c = \dfrac{v^2}{r} = \dfrac{625}{0.32} \approx 1950${ms2}$, about 200 times $g$.`,
  }),
  q("cr-7", [CR], 3, "ratio", 45, {
    prompt: "A centrifuge's angular velocity is doubled. By what factor does the centripetal acceleration of a sample in it change?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "It doubles.", misconception: M("centripetal-unsquared"), rationale: "a_c = rω² depends on ω squared." },
        { id: "b", text: "It is unchanged.", rationale: "The sample is at the same radius but going around faster, so a_c grows." },
        { id: "c", text: "It becomes 4 times as large.", rationale: "a_c = rω²: doubling ω multiplies a_c by 2² = 4." },
        { id: "d", text: "It becomes 8 times as large.", rationale: "a_c depends on ω², not ω³." },
      ],
      correctChoiceId: "c",
    },
    hints: [r`Write $a_c$ in terms of $r$ and $\omega$.`, "The sample stays at the same radius."],
    solution: r`$a_c = r\omega^2$ with $r$ fixed. Doubling ω multiplies $a_c$ by $2^2 = 4$.`,
  }),
  q("cr-check-1", [CR], 1, "compute-centripetal", 45, {
    prompt: r`A bead sits $0.20${m}$ from the centre of a turntable spinning at a constant $10${rps}$. What is its centripetal acceleration?`,
    body: num(20, "m/s²", { abs: 0.1 }, [
      { value: 2, misconception: M("centripetal-unsquared"), note: "rω is the bead's speed. Its centripetal acceleration is rω²." },
    ]),
    hints: [r`Use $a_c = r\omega^2$.`, "Square ω first."],
    solution: r`$a_c = r\omega^2 = (0.20)(10)^2 = 20${ms2}$, toward the centre.`,
  }),
  q("cr-check-2", [CR], 2, "constant-omega", 45, {
    prompt: "Which part of the acceleration of a point on a rotating object is present **only** when the object's angular velocity is changing?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The tangential acceleration", rationale: "a_t = rα, which is non-zero only when α ≠ 0." },
        { id: "b", text: "The centripetal acceleration", misconception: M("tangential-centripetal-confusion"), rationale: "a_c = rω² is present whenever the object is rotating at all, even at constant ω." },
        { id: "c", text: "Both parts", misconception: M("constant-omega-no-acceleration"), rationale: "At constant ω a point still accelerates toward the centre." },
        { id: "d", text: "Neither part", rationale: "When ω changes, the speed of each point changes, which needs a tangential acceleration." },
      ],
      correctChoiceId: "a",
    },
    hints: [r`Compare $a_t = r\alpha$ and $a_c = r\omega^2$.`, "Which one is zero when α = 0?"],
    solution: r`$a_t = r\alpha$ vanishes when ω is constant. $a_c = r\omega^2$ is there whenever the object rotates.`,
  }),
  q("cr-quiz-1", [CR], 3, "compute-centripetal", 90, {
    prompt: r`A centrifuge must give a sample $0.10${m}$ from its axis a centripetal acceleration of $9800${ms2}$ (1000 times $g$). What angular speed is needed?`,
    body: num(313, "rad/s", { abs: 1.5 }, [
      { value: 98000, misconception: M("centripetal-unsquared"), note: "That is ω². Take the square root to find ω." },
    ]),
    hints: [r`Rearrange $a_c = r\omega^2$ for $\omega$.`, "Don't forget the final square root."],
    solution: r`$\omega = \sqrt{\dfrac{a_c}{r}} = \sqrt{\dfrac{9800}{0.10}} = \sqrt{98000} \approx 313${rps}$ (about 3000 rpm).`,
  }),
  q("cr-test-1", [CR, AQ], 3, "compute-centripetal", 90, {
    prompt: r`A ladybird rides on a record turntable $0.12${m}$ from the centre. The turntable turns at a steady $45$ rpm. What is the ladybird's centripetal acceleration?`,
    body: num(2.665, "m/s²", { abs: 0.03 }, [
      { value: 0.565, misconception: M("centripetal-unsquared"), note: "rω is the ladybird's speed. Its acceleration is rω²." },
      { value: 243, misconception: M("revolutions-not-radians"), note: "ω must be in rad/s, not revolutions per minute." },
    ]),
    hints: ["Convert 45 rpm to rad/s.", r`Then use $a_c = r\omega^2$.`],
    solution: r`$\omega = 45 \times \dfrac{2\pi}{60} \approx 4.71${rps}$. $a_c = r\omega^2 = (0.12)(4.71)^2 \approx 2.67${ms2}$.`,
  }),

  // ─────────────────────────────── Torque ───────────────────────────────
  q("tm-1", [TM], 1, "perpendicular", 45, {
    prompt: r`You push on the end of a $0.25${m}$-long wrench with a force of $80${N}$, perpendicular to the handle. What torque do you exert about the bolt?`,
    body: num(20, "N·m", { abs: 0.1 }),
    hints: ["With a perpendicular force, torque is force times distance from the axis.", r`Use $\tau = rF$ when $\theta = 90^\circ$.`],
    solution: r`$\tau = rF\sin 90^\circ = (0.25)(80)(1) = 20${Nm}$.`,
  }),
  q("tm-2", [TM], 2, "angled-force", 75, {
    prompt: r`You pull on a door handle $0.40${m}$ from the hinges with a force of $50${N}$. Your pull makes an angle of $30^\circ$ with the surface of the door. What torque do you exert about the hinges?`,
    body: num(10, "N·m", { abs: 0.1 }, [
      { value: 20, misconception: M("torque-angle"), note: "Only the part of the force perpendicular to the door turns it. rF assumes a 90° angle." },
      { value: 17.3, misconception: M("torque-angle"), note: "That uses cos 30°, which picks out the part of the force along the door. The turning part uses sin θ." },
    ]),
    hints: [r`Use $\tau = rF\sin\theta$, where θ is the angle between the door (the position vector) and the force.`, "Only the perpendicular component of the force turns the door."],
    solution: r`$\tau = rF\sin\theta = (0.40)(50)\sin 30^\circ = (0.40)(50)(0.50) = 10${Nm}$.`,
  }),
  q("tm-3", [TM], 2, "zero-torque", 45, {
    prompt: "Which of these forces on a door produces **zero** torque about the hinges?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "A small force at the handle, perpendicular to the door.", rationale: "A perpendicular force at a distance from the hinges always gives a torque." },
        { id: "b", text: "A large force at the handle, directed along the door straight toward the hinges.", rationale: "Its line of action passes through the hinges: lever arm zero, so τ = 0 however large it is." },
        { id: "c", text: "A large force near the hinges, perpendicular to the door.", rationale: "A small lever arm gives a small torque, but not zero." },
        { id: "d", text: r`A force at the handle at $45^\circ$ to the door.`, rationale: "This has a perpendicular component, so it produces a torque." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Torque depends on the lever arm, not just the size of the force.", "Which force's line of action passes through the hinges?"],
    solution: r`A force whose line of action passes through the axis has a lever arm of zero ($\sin 0^\circ = 0$), so it produces no torque, however large it is.`,
  }),
  q("tm-4", [TM], 2, "lever-arm", 45, {
    prompt: r`A $120${N}$ force acts on a wheel along a line that passes $0.15${m}$ from the axle (measured perpendicular to the line of the force). What torque does it produce about the axle?`,
    body: num(18, "N·m", { abs: 0.1 }),
    hints: ["The perpendicular distance from the axis to the line of action is the lever arm.", "Torque equals force times lever arm."],
    solution: r`$\tau = F r_\perp = (120)(0.15) = 18${Nm}$.`,
  }),
  q("tm-5", [TM], 3, "angled-force", 120, {
    prompt: r`A bicycle crank arm is $0.17${m}$ long. At one instant it points forward at $60^\circ$ **above** the horizontal, and the rider pushes straight down on the pedal with $400${N}$. What torque does the rider exert about the crank axle?`,
    body: num(34, "N·m", { abs: 0.3 }, [
      { value: 68, misconception: M("torque-angle"), note: "The push is not perpendicular to the crank here, so rF overestimates the torque." },
      { value: 58.9, misconception: M("torque-angle"), note: "Check which angle you used. The lever arm of a vertical force is the horizontal distance from the axle: 0.17 cos 60°." },
    ]),
    hints: ["For a vertical force, the lever arm is the horizontal distance from the axle to the line of the force.", "Sketch the crank and find that horizontal distance."],
    solution: r`The lever arm of the vertical push is the horizontal distance from axle to pedal: $r_\perp = 0.17\cos 60^\circ = 0.085${m}$. $\tau = (400)(0.085) = 34${Nm}$. (Equivalently, the angle between crank and force is $150^\circ$ and $\sin 150^\circ = 0.50$.)`,
  }),
  q("tm-6", [TM], 3, "scaling", 90, {
    prompt: r`A force $F$ is applied a distance $r$ from an axis, at an angle $\theta$ to the position vector. Select **all** the changes that, on their own, exactly **double** the torque.`,
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: r`Doubling $F$.` },
        { id: "b", text: r`Doubling $r$ (keeping the same angle).` },
        { id: "c", text: r`Changing $\theta$ from $30^\circ$ to $90^\circ$.` },
        { id: "d", text: r`Moving the point where the force is applied halfway toward the axis.`, rationale: "Halving r halves the torque." },
        { id: "e", text: r`Changing $\theta$ from $45^\circ$ to $90^\circ$.`, rationale: "sin 45° ≈ 0.71 to sin 90° = 1 multiplies the torque by about 1.4, not 2." },
        { id: "f", text: r`Changing $\theta$ from $30^\circ$ to $60^\circ$.`, misconception: M("torque-angle"), rationale: "Torque depends on sin θ, not on θ itself: sin 60°/sin 30° ≈ 1.73." },
      ],
      correctChoiceIds: ["a", "b", "c"],
    },
    hints: [r`Use $\tau = rF\sin\theta$ and look at how each factor changes.`, r`Compare values of $\sin\theta$, not the angles themselves.`],
    solution: r`$\tau = rF\sin\theta$. Doubling $F$ or $r$ doubles τ (a ✓, b ✓). $\sin 90^\circ / \sin 30^\circ = 1/0.5 = 2$ (c ✓). Halving $r$ halves τ (d ✗). $\sin 90^\circ/\sin 45^\circ \approx 1.41$ (e ✗) and $\sin 60^\circ/\sin 30^\circ \approx 1.73$ (f ✗).`,
  }),
  q("tm-7", [TM], 2, "max-torque", 45, {
    prompt: "You can push with a fixed amount of force on the end of a wrench. In which direction should you push to get the largest torque on the bolt?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Perpendicular to the handle.", rationale: "sin 90° = 1, the largest possible value: the whole force turns the wrench." },
        { id: "b", text: "Along the handle, away from the bolt.", misconception: M("force-not-torque"), rationale: "A pull along the handle passes through the bolt and gives zero torque." },
        { id: "c", text: r`At $45^\circ$ to the handle.`, rationale: "Only part of the force (sin 45° ≈ 0.71 of it) turns the wrench." },
        { id: "d", text: "Along the handle, toward the bolt.", misconception: M("force-not-torque"), rationale: "This pushes straight through the axis: lever arm zero, torque zero." },
      ],
      correctChoiceId: "a",
    },
    hints: [r`$\tau = rF\sin\theta$ with $r$ and $F$ fixed.`, r`For which angle is $\sin\theta$ largest?`],
    solution: r`With $r$ and $F$ fixed, τ is largest when $\sin\theta = 1$, i.e. $\theta = 90^\circ$: push perpendicular to the handle.`,
  }),
  q("tm-8", [TM], 3, "symbolic", 75, {
    prompt: r`A force of magnitude $F$ acts on the end of a rod of length $L$. The force makes an angle $\theta$ with the rod. Write an expression for the magnitude of the torque about the other end of the rod.`,
    body: {
      type: "expression",
      answer: "L*F*sin(theta)",
      variables: ["L", "F", "theta"],
      domain: [0.2, 1.3],
      inputHint: "Type theta for θ and use sin( ) or cos( ).",
      commonErrors: [
        { expr: "L*F*cos(theta)", misconception: M("torque-angle"), note: "cos θ gives the part of the force along the rod, which does not turn it." },
        { expr: "L*F", misconception: M("torque-angle"), note: "That is only right if the force is perpendicular to the rod." },
      ],
    },
    hints: ["Which component of the force turns the rod?", "That component is opposite the angle θ in the force triangle."],
    solution: r`Only the component of $F$ perpendicular to the rod, $F\sin\theta$, turns it. $\tau = LF\sin\theta$.`,
  }),
  q("tm-9", [TM], 3, "compare-torques", 90, {
    prompt: r`Four forces act, one at a time, on a door hinged along one edge. Which produces the largest torque about the hinges?

- **A:** $40${N}$, $0.80${m}$ from the hinges, perpendicular to the door
- **B:** $60${N}$, $0.40${m}$ from the hinges, perpendicular to the door
- **C:** $100${N}$, $0.80${m}$ from the hinges, at $30^\circ$ to the door
- **D:** $150${N}$ at the hinges`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "A", rationale: r`$\tau_A = (0.80)(40) = 32${Nm}$: large, but not the largest.` },
        { id: "b", text: "B", rationale: r`$\tau_B = (0.40)(60) = 24${Nm}$.` },
        { id: "c", text: "C", rationale: r`$\tau_C = (0.80)(100)\sin 30^\circ = 40${Nm}$, the largest.` },
        { id: "d", text: "D", misconception: M("force-not-torque"), rationale: "D is the largest force, but it acts at the axis: lever arm zero, torque zero." },
      ],
      correctChoiceId: "c",
    },
    hints: [r`Work out $rF\sin\theta$ for each force.`, "A force at the hinges has no lever arm."],
    solution: r`$\tau_A = 32${Nm}$, $\tau_B = 24${Nm}$, $\tau_C = (0.80)(100)(0.50) = 40${Nm}$, $\tau_D = 0$. C wins, even though D is the largest force.`,
  }),
  q("tm-10", [TM], 3, "lever-arm", 90, {
    prompt: r`A horizontal sign arm is $2.0${m}$ long and hinged to a wall. A cable attached to its outer end runs up to the wall, making an angle of $37^\circ$ with the arm ($\sin 37^\circ = 0.60$, $\cos 37^\circ = 0.80$). The cable tension is $250${N}$. What torque does the cable exert about the hinge?`,
    body: num(300, "N·m", { abs: 1 }, [
      { value: 500, misconception: M("torque-angle"), note: "The cable is not perpendicular to the arm, so the full rF overestimates the torque." },
      { value: 400, misconception: M("torque-angle"), note: "cos 37° picks out the part of the tension along the arm, which pulls on the hinge but does not turn the arm." },
    ]),
    hints: ["Only the component of the tension perpendicular to the arm turns it.", "Equivalently, find the lever arm: the perpendicular distance from the hinge to the cable's line."],
    solution: r`$\tau = rT\sin\theta = (2.0)(250)(0.60) = 300${Nm}$. (Lever arm $= 2.0 \times 0.60 = 1.2${m}$.)`,
  }),
  q("tm-11", [TM], 2, "lever-arm", 45, {
    prompt: "What is the lever arm (moment arm) of a force about an axis?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The distance from the axis to the point where the force is applied.", rationale: "That equals the lever arm only when the force is perpendicular to the line joining them." },
        { id: "b", text: "The perpendicular distance from the axis to the line of action of the force.", rationale: "Yes: τ = F × (lever arm) for any direction of force." },
        { id: "c", text: "The length of the object being turned.", rationale: "The object's length matters only through where and how the force acts." },
        { id: "d", text: "The size of the force multiplied by its distance from the axis.", rationale: "That product (for a perpendicular force) is the torque, not the lever arm." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Picture extending the force arrow into a long line.", "Measure from the axis to that line by the shortest route."],
    solution: r`The lever arm $r_\perp$ is the perpendicular distance from the axis to the line of action. Then $\tau = Fr_\perp$, which is the same as $rF\sin\theta$ because $r_\perp = r\sin\theta$.`,
  }),
  q("tm-12", [TM], 3, "angled-force", 90, {
    prompt: r`A horizontal crank handle is $0.60${m}$ long. A $30${N}$ force is applied at its end, directed at $60^\circ$ from the **vertical**. What torque does the force produce about the crank's axle?`,
    body: num(9.0, "N·m", { abs: 0.1 }, [
      { value: 15.6, misconception: M("torque-angle"), note: "60° is measured from the vertical. The angle between the handle (horizontal) and the force is 30°." },
      { value: 18, misconception: M("torque-angle"), note: "rF is only right for a perpendicular force." },
    ]),
    hints: ["Find the angle between the handle and the force first.", "The handle is horizontal, so subtract from 90°."],
    solution: r`The force is $60^\circ$ from vertical, so $30^\circ$ from the horizontal handle. $\tau = (0.60)(30)\sin 30^\circ = 9.0${Nm}$.`,
  }),
  q("tm-13", [TM], 3, "required-lever-arm", 75, {
    prompt: r`A rusted bolt needs a torque of $45${Nm}$ to loosen it. The strongest perpendicular push you can manage is $150${N}$. What is the shortest wrench (distance from bolt to where you push) that will do the job?`,
    body: num(0.3, "m", { abs: 0.005 }),
    hints: [r`With a perpendicular push, $\tau = rF$.`, "Solve for r."],
    solution: r`$r = \dfrac{\tau}{F} = \dfrac{45}{150} = 0.30${m}$.`,
  }),
  q("tm-14", [TM], 2, "lever-arm", 45, {
    prompt: "Why are door handles placed on the edge of the door farthest from the hinges?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "A given push produces more torque there because the lever arm is larger.", rationale: "τ = rF: a larger r means less force is needed for the same torque." },
        { id: "b", text: "The door is lighter at that edge.", rationale: "A uniform door has the same mass per unit width everywhere." },
        { id: "c", text: "The force needed to open the door is the same anywhere; that edge is just easier to reach.", misconception: M("force-not-torque"), rationale: "Push near the hinges and you will find it much harder: it is torque, not force, that opens the door." },
        { id: "d", text: "The door's rotational inertia is smallest there.", rationale: "The door has one rotational inertia about its hinges; where you push does not change it." },
      ],
      correctChoiceId: "a",
    },
    hints: ["What turns a door: force alone, or something that depends on where the force acts?", r`Think about $\tau = rF$.`],
    solution: r`Opening the door needs a certain torque. Since $\tau = rF$, pushing at the largest $r$ needs the smallest force.`,
  }),
  q("tm-15", [TM], 4, "angled-force", 120, {
    prompt: r`A $3.0${m}$ vertical post is hinged at its base. A rope tied to the top of the post pulls with a tension of $200${N}$, directed $30^\circ$ **below** the horizontal. What is the magnitude of the torque the rope exerts about the base?`,
    body: num(520, "N·m", { abs: 2 }, [
      { value: 600, misconception: M("torque-angle"), note: "The rope is not perpendicular to the post, so rF overestimates the torque." },
      { value: 300, misconception: M("torque-angle"), note: "Check the angle: the post is vertical, so the angle between post and rope is 90° + 30° = 120°, not 30°." },
    ]),
    hints: ["Find the angle between the post (pointing up from the base) and the rope.", "Or: only the horizontal component of the tension turns a vertical post."],
    solution: r`The horizontal component of the tension, $200\cos 30^\circ \approx 173${N}$, acts $3.0${m}$ above the base: $\tau \approx 520${Nm}$. (Equivalently $rF\sin 120^\circ = (3.0)(200)(0.866)$.) The vertical component points along the post and gives no torque.`,
  }),
  q("tm-16", [TM], 2, "required-force", 45, {
    prompt: r`A wheel nut must be tightened to a torque of $70${Nm}$ using a wrench $0.35${m}$ long. What perpendicular force is needed at the end of the wrench?`,
    body: num(200, "N", { abs: 1 }),
    hints: [r`For a perpendicular force, $\tau = rF$.`, "Solve for F."],
    solution: r`$F = \dfrac{\tau}{r} = \dfrac{70}{0.35} = 200${N}$.`,
  }),
  q("tm-check-1", [TM], 1, "perpendicular", 30, {
    prompt: r`A $40${N}$ force is applied perpendicular to a lever, $0.30${m}$ from its pivot. What torque does it produce?`,
    body: num(12, "N·m", { abs: 0.05 }),
    hints: ["For a perpendicular force, torque is force times distance.", r`$\tau = rF$.`],
    solution: r`$\tau = rF = (0.30)(40) = 12${Nm}$.`,
  }),
  q("tm-check-2", [TM], 2, "angled-force", 60, {
    prompt: r`A $20${N}$ force acts on a rod $0.50${m}$ from its pivot, at $30^\circ$ to the rod. What torque does it produce about the pivot?`,
    body: num(5.0, "N·m", { abs: 0.05 }, [
      { value: 10, misconception: M("torque-angle"), note: "The force is not perpendicular to the rod. Include sin θ." },
      { value: 8.66, misconception: M("torque-angle"), note: "cos 30° gives the component along the rod. The turning component uses sin 30°." },
    ]),
    hints: [r`$\tau = rF\sin\theta$.`, "θ is the angle between the rod and the force."],
    solution: r`$\tau = (0.50)(20)\sin 30^\circ = (0.50)(20)(0.50) = 5.0${Nm}$.`,
  }),
  q("tm-quiz-1", [TM], 2, "angled-force", 75, {
    prompt: r`A mechanic pulls on a wrench $0.30${m}$ from the bolt with a force of $70${N}$ at $53^\circ$ to the handle ($\sin 53^\circ = 0.80$, $\cos 53^\circ = 0.60$). What torque does she exert on the bolt?`,
    body: num(16.8, "N·m", { abs: 0.1 }, [
      { value: 21, misconception: M("torque-angle"), note: "The pull is not perpendicular to the handle. Include sin θ." },
      { value: 12.6, misconception: M("torque-angle"), note: "cos 53° picks out the component along the handle. Use sin 53°." },
    ]),
    hints: [r`Use $\tau = rF\sin\theta$.`, "θ is the angle between the handle and the force."],
    solution: r`$\tau = (0.30)(70)(0.80) = 16.8${Nm}$.`,
  }),
  q("tm-quiz-2", [TM], 3, "compare-torques", 75, {
    prompt: r`Alex pushes on a door with $30${N}$, perpendicular to it, $0.90${m}$ from the hinges. Blake pushes the other way with $60${N}$, perpendicular to the door, $0.40${m}$ from the hinges. Which push produces the larger torque about the hinges?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Alex's", rationale: r`$\tau_A = (0.90)(30) = 27${Nm}$ and $\tau_B = (0.40)(60) = 24${Nm}$.` },
        { id: "b", text: "Blake's, because it is the larger force.", misconception: M("force-not-torque"), rationale: "Torque depends on the lever arm too. Blake pushes much closer to the hinges." },
        { id: "c", text: "They are equal.", rationale: r`Work them out: $27${Nm}$ and $24${Nm}$ are not equal.` },
        { id: "d", text: "It cannot be decided without the mass of the door.", rationale: "Torque depends only on the forces and where they act, not on the door's mass." },
      ],
      correctChoiceId: "a",
    },
    hints: [r`Compute $rF$ for each push.`, "Compare the products, not the forces."],
    solution: r`$\tau_{\text{Alex}} = 27${Nm}$, $\tau_{\text{Blake}} = 24${Nm}$. Alex's smaller force wins because of its much larger lever arm.`,
  }),
  q("tm-test-1", [TM], 3, "angled-force", 90, {
    prompt: r`A door is $0.80${m}$ wide. You push on its outer edge with $25${N}$, at $60^\circ$ to the surface of the door. What torque do you exert about the hinges?`,
    body: num(17.3, "N·m", { abs: 0.1 }, [
      { value: 20, misconception: M("torque-angle"), note: "The push is not perpendicular to the door. Include sin θ." },
      { value: 10, misconception: M("torque-angle"), note: "That uses sin 30° (or cos 60°). The angle between the door and the force is 60°." },
    ]),
    hints: [r`Use $\tau = rF\sin\theta$.`, "θ is measured between the door surface and the force."],
    solution: r`$\tau = (0.80)(25)\sin 60^\circ \approx (20)(0.866) \approx 17.3${Nm}$.`,
  }),

  // ───────────────────── Net torque and direction ─────────────────────
  q("nt-1", [NT], 1, "sign-direction", 45, {
    prompt: "You face a bolt head-on and use counterclockwise as the positive direction. You push on a wrench so that it turns the bolt clockwise. What is the sign of your torque?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Positive, because you are pushing with a positive amount of force.", misconception: M("rotation-sign"), rationale: "The sign of a torque describes the direction of the turning effect, not the size of the force." },
        { id: "b", text: "Negative, because it tends to turn the bolt clockwise.", rationale: "With counterclockwise positive, a clockwise turning effect is negative." },
        { id: "c", text: "Zero, because the bolt does not move.", rationale: "A torque can act even if friction or other torques keep the bolt from turning." },
        { id: "d", text: "It depends on how hard you push.", rationale: "The size of the force changes the size of the torque, not its sign." },
      ],
      correctChoiceId: "b",
    },
    hints: ["The sign of a torque tells you which way it tends to turn the object.", "Which direction is positive here?"],
    solution: "With counterclockwise chosen as positive, a torque that tends to turn the bolt clockwise is negative.",
  }),
  q("nt-2", [NT], 2, "net-two-forces", 60, {
    prompt: r`A light rod is pivoted at its centre. A $4.0${N}$ weight hangs $0.30${m}$ to the left of the pivot and a $3.0${N}$ weight hangs $0.30${m}$ to the right. Taking counterclockwise as positive, what is the net torque about the pivot?`,
    body: num(0.3, "N·m", { abs: 0.005 }, [
      { value: 2.1, misconception: M("torques-add-magnitudes"), note: "The two weights turn the rod in opposite directions, so their torques partly cancel." },
      { value: -0.3, misconception: M("rotation-sign"), note: "A weight on the left pulls that side down, which is counterclockwise: positive." },
    ]),
    hints: ["Decide which way each weight tends to turn the rod.", "Give each torque a sign, then add."],
    solution: r`Left weight: pulls the left side down, counterclockwise, $+(0.30)(4.0) = +1.2${Nm}$. Right weight: clockwise, $-(0.30)(3.0) = -0.90${Nm}$. Net: $+0.30${Nm}$ (counterclockwise).`,
  }),
  q("nt-3", [NT], 2, "direction-of-rotation", 60, {
    prompt: r`A seesaw is pivoted at its centre. A $300${N}$ child sits $1.5${m}$ to the left of the pivot and a $400${N}$ child sits $1.0${m}$ to the right. Ignoring the board's weight (it acts at the pivot), what happens when they lift their feet?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The left side goes down.", rationale: r`Left torque $= 450${Nm}$, right torque $= 400${Nm}$: the left side wins.` },
        { id: "b", text: "The right side goes down, because that child is heavier.", misconception: M("balance-equal-weights"), rationale: "It is torque, not weight alone, that decides. The lighter child sits farther out." },
        { id: "c", text: "The seesaw stays balanced.", rationale: r`$450${Nm} \neq 400${Nm}$, so the torques are not balanced.` },
        { id: "d", text: "It cannot be decided without the length of the board.", rationale: "Only the distances from the pivot matter, and those are given." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Compute each child's torque: weight times distance from the pivot.", "The larger torque wins."],
    solution: r`Left: $(300)(1.5) = 450${Nm}$ counterclockwise. Right: $(400)(1.0) = 400${Nm}$ clockwise. Net torque is counterclockwise, so the left side goes down.`,
  }),
  q("nt-4", [NT], 3, "net-several", 90, {
    prompt: r`A wheel turns on a fixed axle. Three forces act tangentially on it: $20${N}$ at the rim (radius $0.50${m}$) pushing counterclockwise, $12${N}$ at the rim pushing clockwise, and $10${N}$ at radius $0.20${m}$ pushing clockwise. Taking counterclockwise as positive, what is the net torque?`,
    body: num(2.0, "N·m", { abs: 0.02 }, [
      { value: 18, misconception: M("torques-add-magnitudes"), note: "The clockwise torques must be subtracted from the counterclockwise one." },
    ]),
    hints: ["Compute each torque as rF (each force is tangential, so perpendicular to the radius).", "Give clockwise torques a negative sign before adding."],
    solution: r`$\tau_{\text{net}} = (0.50)(20) - (0.50)(12) - (0.20)(10) = 10 - 6.0 - 2.0 = +2.0${Nm}$.`,
  }),
  q("nt-5", [NT], 3, "zero-net", 75, {
    prompt: r`A $30${N}$ force acts tangentially at radius $0.40${m}$ on a disc, turning it counterclockwise. What tangential force applied at radius $0.15${m}$, turning it clockwise, would make the net torque zero?`,
    body: num(80, "N", { abs: 0.3 }, [
      { value: 30, misconception: M("balance-equal-weights"), note: "Equal forces only cancel if they act at equal distances. The second force has a smaller lever arm." },
    ]),
    hints: ["For zero net torque, the clockwise torque must equal the counterclockwise torque.", r`Set $r_1F_1 = r_2F_2$.`],
    solution: r`$(0.40)(30) = (0.15)F \Rightarrow F = \dfrac{12}{0.15} = 80${N}$.`,
  }),
  q("nt-6", [NT], 3, "sign-direction", 90, {
    prompt: "A horizontal rod is pivoted at its centre and viewed from the front. Select **all** the forces below that produce a **clockwise** torque about the pivot.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "A downward force on the right end." },
        { id: "b", text: "An upward force on the right end.", rationale: "Lifting the right end turns the rod counterclockwise." },
        { id: "c", text: "A downward force on the left end.", rationale: "Pushing the left end down turns the rod counterclockwise." },
        { id: "d", text: "An upward force on the left end." },
        { id: "e", text: "A force on the right end pulling horizontally to the right, away from the pivot.", misconception: M("force-not-torque"), rationale: "Its line of action passes through the pivot: no lever arm, no torque." },
      ],
      correctChoiceIds: ["a", "d"],
    },
    hints: ["Imagine each force acting alone. Which way would the rod start to turn?", "A force along the rod through the pivot cannot turn it."],
    solution: r`Down on the right (a) and up on the left (d) both turn the rod clockwise. (b) and (c) turn it counterclockwise. (e) acts along the rod through the pivot, so it gives no torque.`,
  }),
  q("nt-7", [NT, TM], 4, "net-angled", 120, {
    prompt: r`A $1.0${m}$ rod is pivoted at its left end and lies horizontally. A $10${N}$ force pushes straight up on the right end. A $20${N}$ force acts at the midpoint, pointing to the right and $30^\circ$ **below** the rod. Taking counterclockwise as positive, what is the net torque about the pivot?`,
    body: num(5.0, "N·m", { abs: 0.05 }, [
      { value: 0, misconception: M("torque-angle"), note: "The 20 N force is not perpendicular to the rod. Its torque is (0.50)(20) sin 30°." },
      { value: 15, misconception: M("torques-add-magnitudes"), note: "The two torques turn the rod in opposite directions." },
    ]),
    hints: ["Find each torque's size with τ = rF sin θ.", "Decide the sense of each: the upward force lifts the far end; the angled force has a downward component."],
    solution: r`Upward force: $+(1.0)(10) = +10${Nm}$. Angled force: $(0.50)(20)\sin 30^\circ = 5.0${Nm}$, clockwise because its perpendicular component points down. Net: $+10 - 5.0 = +5.0${Nm}$.`,
  }),
  q("nt-8", [NT], 3, "symbolic", 90, {
    prompt: r`A stepped pulley has an inner drum of radius $r$ and an outer rim of radius $R$. A rope wound on the inner drum pulls tangentially with tension $T$, tending to turn the pulley counterclockwise. A rope wound on the outer rim is pulled tangentially with force $F$, tending to turn it clockwise. Taking counterclockwise as positive, write an expression for the net torque.`,
    body: {
      type: "expression",
      answer: "T*r - F*R",
      variables: ["T", "r", "F", "R"],
      domain: [1, 5],
      inputHint: "Use T, r, F and R exactly as given (r and R are different).",
      commonErrors: [
        { expr: "T*r + F*R", misconception: M("torques-add-magnitudes"), note: "The two ropes turn the pulley in opposite directions, so their torques have opposite signs." },
        { expr: "F*R - T*r", misconception: M("rotation-sign"), note: "Counterclockwise is positive, so the tension on the inner drum gives the positive torque." },
      ],
    },
    hints: ["Each rope's torque is its force times the radius it acts at.", "Which torque is positive?"],
    solution: r`Inner rope: $+Tr$ (counterclockwise). Outer rope: $-FR$ (clockwise). $\tau_{\text{net}} = Tr - FR$.`,
  }),
  q("nt-check-1", [NT], 1, "net-two-forces", 45, {
    prompt: r`Two $10${N}$ forces act tangentially on a wheel at the same radius $r$. One tends to turn it counterclockwise and the other clockwise. What is the net torque on the wheel?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Zero", rationale: "Equal torques in opposite directions cancel." },
        { id: "b", text: r`$(20${N})\,r$`, misconception: M("torques-add-magnitudes"), rationale: "The torques have opposite signs, so they cancel instead of adding." },
        { id: "c", text: r`$(10${N})\,r$`, rationale: "Each torque is (10 N) r, but they point in opposite senses." },
        { id: "d", text: "It depends on the wheel's mass.", rationale: "Net torque depends only on the forces and where they act." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Give each torque a sign.", "Add them."],
    solution: r`$\tau_{\text{net}} = +(10${N})r - (10${N})r = 0$.`,
  }),
  q("nt-check-2", [NT], 2, "net-two-forces", 60, {
    prompt: r`A light rod pivoted at its centre has a $5.0${N}$ weight hanging $0.20${m}$ left of the pivot and a $2.0${N}$ weight hanging $0.40${m}$ right of the pivot. Taking counterclockwise as positive, what is the net torque?`,
    body: num(0.2, "N·m", { abs: 0.005 }, [
      { value: 1.8, misconception: M("torques-add-magnitudes"), note: "The weights turn the rod in opposite directions, so subtract." },
    ]),
    hints: ["The left weight turns the rod counterclockwise; the right weight turns it clockwise.", "Add the signed torques."],
    solution: r`$\tau = +(0.20)(5.0) - (0.40)(2.0) = 1.0 - 0.80 = +0.20${Nm}$.`,
  }),
  q("nt-quiz-1", [NT], 3, "net-several", 90, {
    prompt: r`A wheel of radius $0.40${m}$ turns on an axle. Tangential forces act on it: $25${N}$ at the rim counterclockwise, $15${N}$ at the rim clockwise, and $30${N}$ clockwise on its hub at radius $0.10${m}$. Taking counterclockwise as positive, what is the net torque?`,
    body: num(1.0, "N·m", { abs: 0.02 }, [
      { value: 19, misconception: M("torques-add-magnitudes"), note: "Clockwise torques are negative. Subtract them from the counterclockwise torque." },
    ]),
    hints: ["Torque of each tangential force is r times F.", "Clockwise torques get a minus sign."],
    solution: r`$\tau = (0.40)(25) - (0.40)(15) - (0.10)(30) = 10 - 6.0 - 3.0 = +1.0${Nm}$.`,
  }),
  q("nt-test-1", [NT, TB], 3, "direction-of-rotation", 75, {
    prompt: r`A uniform metre stick is balanced on a pivot at its $50${cm}$ mark. A $2.0${N}$ weight is hung at the $20${cm}$ mark and a $1.5${N}$ weight at the $90${cm}$ mark. What happens when the stick is released?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The left end goes down, because the heavier weight is on the left.", misconception: M("balance-equal-weights"), rationale: "Compare torques, not weights. The lighter weight is farther from the pivot." },
        { id: "b", text: "The right end goes down.", rationale: "The right-hand torque is 0.60 N·m, the same as the left-hand torque." },
        { id: "c", text: "The stick stays balanced.", rationale: r`Left: $(2.0)(0.30) = 0.60${Nm}$; right: $(1.5)(0.40) = 0.60${Nm}$. The torques cancel.` },
        { id: "d", text: "It cannot be decided without the stick's mass.", rationale: "The stick's weight acts at its centre, which is at the pivot, so it gives no torque." },
      ],
      correctChoiceId: "c",
    },
    hints: ["Measure each distance from the pivot, not from the end of the stick.", "Compare the two torques."],
    solution: r`Left: $2.0${N}$ at $0.30${m}$ gives $0.60${Nm}$ counterclockwise. Right: $1.5${N}$ at $0.40${m}$ gives $0.60${Nm}$ clockwise. The net torque is zero, so the stick stays balanced.`,
  }),

  // ───────────────────── Rotational inertia: point masses ─────────────────────
  q("ip-1", [IP], 1, "single-mass", 45, {
    prompt: r`A $2.0${kg}$ ball is fixed to the end of a light rod and swung in a circle of radius $0.50${m}$ about the other end. Treating the ball as a point mass, what is its rotational inertia about the axis?`,
    body: num(0.5, "kg·m²", { abs: 0.005 }, [
      { value: 1, misconception: M("inertia-unsquared"), note: "That is mr. Rotational inertia uses the square of the distance: mr²." },
    ]),
    hints: [r`For a point mass, $I = mr^2$.`, "Square the distance before multiplying by the mass."],
    solution: r`$I = mr^2 = (2.0)(0.50)^2 = 0.50${kgm2}$.`,
  }),
  q("ip-2", [IP], 2, "several-masses", 60, {
    prompt: r`A light rod rotates about an axis through one point on it. A $1.0${kg}$ mass is fixed $0.40${m}$ from the axis and a $3.0${kg}$ mass is fixed $0.20${m}$ from the axis. What is the total rotational inertia?`,
    body: num(0.28, "kg·m²", { abs: 0.003 }, [
      { value: 1, misconception: M("inertia-unsquared"), note: "That adds mr for each mass. Each term should be mr²." },
    ]),
    hints: [r`Add $mr^2$ for each mass.`, "The rod is light, so it contributes nothing."],
    solution: r`$I = (1.0)(0.40)^2 + (3.0)(0.20)^2 = 0.16 + 0.12 = 0.28${kgm2}$.`,
  }),
  q("ip-3", [IP], 2, "ratio", 45, {
    prompt: r`A small mass on a light rotating rod is moved from $0.20${m}$ to $0.60${m}$ from the axis. By what factor does its rotational inertia change?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "It becomes 3 times as large.", misconception: M("inertia-unsquared"), rationale: "The distance triples, but I depends on the distance squared." },
        { id: "b", text: "It becomes 9 times as large.", rationale: "I = mr²: tripling r multiplies I by 3² = 9." },
        { id: "c", text: "It is unchanged, because the mass is unchanged.", misconception: M("inertia-mass-only"), rationale: "Rotational inertia depends on where the mass is, not just how much there is." },
        { id: "d", text: "It becomes 6 times as large.", rationale: "Tripling r does not multiply I by 6; the dependence is on r²." },
      ],
      correctChoiceId: "b",
    },
    hints: [r`$I = mr^2$.`, "By what factor does r change?"],
    solution: r`$r$ triples, so $r^2$ and $I$ become $3^2 = 9$ times as large.`,
  }),
  q("ip-4", [IP, DI], 3, "axis-choice", 75, {
    prompt: r`A dumbbell is made of two $1.5${kg}$ masses at the ends of a light rod $0.80${m}$ long. What is its rotational inertia about an axis perpendicular to the rod through **one of the masses**?`,
    body: num(0.96, "kg·m²", { abs: 0.01 }, [
      { value: 0.48, misconception: M("inertia-mass-only"), note: "That is the rotational inertia about the centre. A different axis gives a different rotational inertia." },
    ]),
    hints: ["How far is each mass from this axis?", "A mass located on the axis contributes nothing."],
    solution: r`The mass on the axis has $r = 0$. The other is $0.80${m}$ away: $I = (1.5)(0.80)^2 = 0.96${kgm2}$. About the centre it would be only $2(1.5)(0.40)^2 = 0.48${kgm2}$.`,
  }),
  q("ip-5", [IP], 3, "compare-arrangements", 90, {
    prompt: r`Each arrangement below is a point mass on a light rod that rotates about one end. Which has the **largest** rotational inertia?

- **A:** $4.0${kg}$ at $0.50${m}$
- **B:** $2.0${kg}$ at $0.80${m}$
- **C:** $8.0${kg}$ at $0.30${m}$
- **D:** $1.0${kg}$ at $1.0${m}$`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "A", rationale: r`$I_A = (4.0)(0.25) = 1.0${kgm2}$.` },
        { id: "b", text: "B", rationale: r`$I_B = (2.0)(0.64) = 1.28${kgm2}$, the largest.` },
        { id: "c", text: "C", misconception: M("inertia-mass-only"), rationale: r`C has the most mass, but it is close to the axis: $I_C = (8.0)(0.09) = 0.72${kgm2}$.` },
        { id: "d", text: "D", rationale: r`$I_D = (1.0)(1.0) = 1.0${kgm2}$: the farthest out, but the lightest.` },
      ],
      correctChoiceId: "b",
    },
    hints: [r`Compute $mr^2$ for each.`, "Distance counts twice (it is squared)."],
    solution: r`$I_A = 1.0$, $I_B = 1.28$, $I_C = 0.72$, $I_D = 1.0${kgm2}$. B is largest.`,
  }),
  q("ip-6", [IP], 3, "several-masses", 75, {
    prompt: r`Three $0.50${kg}$ beads are fixed on a light rod at $0$, $0.30${m}$ and $0.60${m}$ from one end. The rod rotates about an axis through that end (through the first bead). What is the rotational inertia?`,
    body: num(0.225, "kg·m²", { abs: 0.002 }, [
      { value: 0.45, misconception: M("inertia-unsquared"), note: "That adds m × r for each bead. Each distance must be squared." },
    ]),
    hints: ["The bead on the axis contributes nothing.", r`Add $mr^2$ for the other two beads.`],
    solution: r`$I = 0.50(0)^2 + 0.50(0.30)^2 + 0.50(0.60)^2 = 0 + 0.045 + 0.18 = 0.225${kgm2}$.`,
  }),
  q("ip-7", [IP], 2, "concept", 75, {
    prompt: "Select **all** the statements about the rotational inertia of a set of point masses that are correct.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: r`Its SI unit is $\text{kg}\cdot\text{m}^2$.` },
        { id: "b", text: "A mass located exactly on the axis contributes nothing." },
        { id: "c", text: "Doubling every mass (keeping the positions) doubles the rotational inertia." },
        { id: "d", text: "Doubling every distance from the axis (keeping the masses) doubles the rotational inertia.", misconception: M("inertia-unsquared"), rationale: "I depends on r², so doubling every distance multiplies I by 4." },
        { id: "e", text: "The rotational inertia is the same about every axis.", misconception: M("inertia-mass-only"), rationale: "Changing the axis changes every distance r, so I changes." },
      ],
      correctChoiceIds: ["a", "b", "c"],
    },
    hints: [r`Start from $I = \sum mr^2$.`, "Ask how each change affects m and r."],
    solution: r`$I = \sum mr^2$ has units kg·m² (a ✓). $r = 0$ gives no contribution (b ✓). I is proportional to the masses (c ✓) but to the square of the distances (d ✗: factor 4). Distances depend on the axis, so I does too (e ✗).`,
  }),
  q("ip-8", [IP], 3, "symbolic", 75, {
    prompt: r`Two small balls, each of mass $m$, are fixed to the ends of a light rod of length $L$. Write an expression for the rotational inertia about an axis perpendicular to the rod through its centre.`,
    body: {
      type: "expression",
      answer: "m*L^2/2",
      variables: ["m", "L"],
      domain: [1, 5],
      inputHint: "Use m and L, with ^ for powers.",
      commonErrors: [{ expr: "m*L", misconception: M("inertia-unsquared"), note: "Each ball contributes m × (distance)², not m × distance." }],
    },
    hints: ["How far is each ball from the centre?", r`Add $mr^2$ for both balls.`],
    solution: r`Each ball is $\tfrac{L}{2}$ from the axis: $I = 2m\left(\tfrac{L}{2}\right)^2 = \dfrac{mL^2}{2}$.`,
  }),
  q("ip-check-1", [IP], 1, "single-mass", 30, {
    prompt: r`A $3.0${kg}$ point mass is $0.20${m}$ from a rotation axis. What is its rotational inertia about that axis?`,
    body: num(0.12, "kg·m²", { abs: 0.002 }, [
      { value: 0.6, misconception: M("inertia-unsquared"), note: "Square the distance: I = mr²." },
    ]),
    hints: [r`$I = mr^2$.`, "Square 0.20 m first."],
    solution: r`$I = (3.0)(0.20)^2 = 0.12${kgm2}$.`,
  }),
  q("ip-check-2", [IP], 2, "ratio", 45, {
    prompt: "A small weight on a spinning rod is slid inward until it is half as far from the axis. Its rotational inertia becomes:",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "half as large.", misconception: M("inertia-unsquared"), rationale: "I depends on r², not r." },
        { id: "b", text: "one quarter as large.", rationale: r`$\left(\tfrac12\right)^2 = \tfrac14$.` },
        { id: "c", text: "unchanged.", misconception: M("inertia-mass-only"), rationale: "The mass is unchanged, but its distance from the axis is not, and that matters." },
        { id: "d", text: "twice as large.", rationale: "Moving mass toward the axis reduces rotational inertia." },
      ],
      correctChoiceId: "b",
    },
    hints: [r`$I = mr^2$.`, "If r is multiplied by some factor, what happens to r²?"],
    solution: r`Halving $r$ multiplies $r^2$, and so $I$, by $\tfrac14$.`,
  }),
  q("ip-quiz-1", [IP], 3, "several-masses", 90, {
    prompt: r`A light rod $1.0${m}$ long has a $0.40${kg}$ mass at each end and a $0.20${kg}$ mass at its centre. What is its rotational inertia about an axis perpendicular to the rod through **one end**?`,
    body: num(0.45, "kg·m²", { abs: 0.005 }, [
      { value: 0.2, misconception: M("inertia-mass-only"), note: "That is the rotational inertia about the centre. The axis here is at one end." },
      { value: 0.5, misconception: M("inertia-unsquared"), note: "Each term should be m r², with the distance squared." },
    ]),
    hints: ["Find each mass's distance from the end.", r`Add $mr^2$; the mass on the axis contributes nothing.`],
    solution: r`$I = 0.40(0)^2 + 0.20(0.50)^2 + 0.40(1.0)^2 = 0 + 0.050 + 0.40 = 0.45${kgm2}$.`,
  }),
  q("ip-test-1", [IP], 3, "several-masses", 90, {
    prompt: r`Four $0.25${kg}$ masses are fixed at the corners of a light square frame with sides $0.40${m}$. What is the rotational inertia about an axis perpendicular to the square through its centre?`,
    body: num(0.08, "kg·m²", { abs: 0.002 }, [
      { value: 0.283, misconception: M("inertia-unsquared"), note: "Each corner contributes m r², with r squared." },
    ]),
    hints: ["Each corner is half a diagonal from the centre.", r`The diagonal of a square of side $a$ is $a\sqrt2$.`],
    solution: r`Each corner is $r = \tfrac12(0.40\sqrt2) \approx 0.283${m}$ from the centre, so $r^2 = 0.080${m}^2$. $I = 4(0.25)(0.080) = 0.080${kgm2}$.`,
  }),

  // ──────────────── Mass distribution and extended objects ────────────────
  q("dist-1", [DI], 1, "hoop-vs-disc", 45, {
    prompt: "A thin hoop and a solid disc have the same mass and the same radius. About an axis through the centre, perpendicular to each, which has the larger rotational inertia?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The hoop", rationale: "All of the hoop's mass is at the full radius; much of the disc's mass is closer to the axis." },
        { id: "b", text: "The disc", rationale: "The disc has mass near the centre, which contributes little." },
        { id: "c", text: "They are equal, since the masses and radii are equal.", misconception: M("inertia-mass-only"), rationale: "Rotational inertia depends on how the mass is spread out, not just on the total mass and size." },
        { id: "d", text: "It depends on how fast they spin.", rationale: "Rotational inertia does not depend on the spin rate." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Where is most of each object's mass, relative to the axis?", "Mass far from the axis counts more."],
    solution: r`Hoop: $I = MR^2$, all mass at radius $R$. Disc: $I = \tfrac12MR^2$, since much of its mass is nearer the axis. The hoop's is twice as large.`,
  }),
  q("dist-2", [DI], 2, "shape-formula", 45, {
    prompt: r`A solid disc of mass $4.0${kg}$ and radius $0.30${m}$ rotates about its central axis. Using $I = \tfrac12MR^2$, what is its rotational inertia?`,
    body: num(0.18, "kg·m²", { abs: 0.002 }, [
      { value: 0.6, misconception: M("inertia-unsquared"), note: "The radius must be squared." },
    ]),
    hints: ["Substitute into the given formula.", "Square the radius."],
    solution: r`$I = \tfrac12(4.0)(0.30)^2 = \tfrac12(4.0)(0.090) = 0.18${kgm2}$.`,
  }),
  q("dist-3", [DI], 2, "shape-formula", 60, {
    prompt: r`A uniform rod of mass $3.0${kg}$ and length $1.2${m}$ rotates about an axis perpendicular to it through **one end**. Use: rod about its centre, $I = \tfrac{1}{12}ML^2$; rod about one end, $I = \tfrac13ML^2$. What is its rotational inertia?`,
    body: num(1.44, "kg·m²", { abs: 0.01 }, [
      { value: 0.36, misconception: M("inertia-mass-only"), note: "That is the rotational inertia about the centre. The axis is at the end." },
    ]),
    hints: ["Choose the formula for the axis described.", "Square the length."],
    solution: r`About one end: $I = \tfrac13(3.0)(1.2)^2 = \tfrac13(3.0)(1.44) = 1.44${kgm2}$.`,
  }),
  q("dist-4", [DI], 3, "compare-shapes", 75, {
    prompt: r`Four objects have the same mass $M$ and the same radius $R$, and each rotates about an axis through its centre. Their rotational inertias are: solid sphere $\tfrac25MR^2$, solid disc $\tfrac12MR^2$, thin spherical shell $\tfrac23MR^2$, thin hoop $MR^2$.

Put them in order from **smallest** to **largest** rotational inertia.`,
    body: {
      type: "ordering",
      items: [
        { id: "sphere", text: "Solid sphere" },
        { id: "disc", text: "Solid disc" },
        { id: "shell", text: "Thin spherical shell" },
        { id: "hoop", text: "Thin hoop" },
      ],
      correctOrder: ["sphere", "disc", "shell", "hoop"],
    },
    hints: ["Compare the fractions in front of MR².", "Write each fraction as a decimal."],
    solution: r`$0.40 < 0.50 < 0.67 < 1.0$: sphere, disc, shell, hoop. The more of the mass that sits far from the axis, the larger $I$.`,
  }),
  q("dist-5", [DI], 3, "axis-concept", 60, {
    prompt: "A uniform metre stick can be spun about an axis through its centre or about an axis through one end (both perpendicular to the stick). Which is harder to start spinning, and why?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "About the end, because more of the mass is far from the axis.", rationale: "About the end, I = ⅓ML², four times the central value of ML²/12." },
        { id: "b", text: "About the centre, because the stick is balanced there.", rationale: "Being balanced means gravity gives no torque, not that the stick is harder to spin." },
        { id: "c", text: "Neither: same mass, so same rotational inertia.", misconception: M("inertia-mass-only"), rationale: "Rotational inertia depends on the axis as well as the mass." },
        { id: "d", text: "About the end, because the stick is longer that way.", rationale: "The stick has the same length either way; what changes is how far its mass is from the axis." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Where is the mass relative to each axis?", "Mass far from the axis counts with r²."],
    solution: r`About the centre no part is more than $\tfrac{L}{2}$ away; about the end, half the stick is between $\tfrac{L}{2}$ and $L$ away. $I_{\text{end}} = \tfrac13ML^2$ is four times $I_{\text{centre}} = \tfrac1{12}ML^2$.`,
  }),
  q("dist-6", [DI], 3, "parallel-axis", 90, {
    prompt: r`A solid disc of mass $2.0${kg}$ and radius $0.20${m}$ swings about an axis perpendicular to it through a point on its **rim**. Using $I_{\text{cm}} = \tfrac12MR^2$ and the parallel-axis theorem $I = I_{\text{cm}} + Md^2$, find the rotational inertia about this axis.`,
    body: num(0.12, "kg·m²", { abs: 0.002 }, [
      { value: 0.04, misconception: M("inertia-mass-only"), note: "That is the value about the centre. Moving the axis away from the centre of mass increases I." },
    ]),
    hints: ["First find the rotational inertia about the centre.", "d is the distance from the centre of mass to the new axis."],
    solution: r`$I_{\text{cm}} = \tfrac12(2.0)(0.20)^2 = 0.040${kgm2}$. With $d = R = 0.20${m}$: $I = 0.040 + (2.0)(0.20)^2 = 0.040 + 0.080 = 0.12${kgm2}$.`,
  }),
  q("dist-7", [DI], 4, "scaling", 90, {
    prompt: r`Disc B is cut from the same sheet of metal as disc A (same thickness and material) but has **twice the radius**. By what factor is B's rotational inertia about its centre larger than A's?`,
    body: num(16, "", { abs: 0.05 }),
    hints: ["First: how does B's mass compare with A's? Think about area.", r`Then use $I = \tfrac12MR^2$ for both.`],
    solution: r`Twice the radius gives 4 times the area, so 4 times the mass. $I = \tfrac12MR^2$ then grows by $4 \times 2^2 = 16$.`,
  }),
  q("dist-8", [DI], 2, "concept", 75, {
    prompt: "A spinning figure skater pulls her arms in close to her body. Select **all** the statements that are correct.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "Her rotational inertia decreases." },
        { id: "b", text: "Her mass does not change." },
        { id: "c", text: "Her rotational inertia depends on which axis she spins about." },
        { id: "d", text: "Her rotational inertia stays the same because her mass is unchanged.", misconception: M("inertia-mass-only"), rationale: "Moving mass closer to the axis lowers I even though the total mass is the same." },
        { id: "e", text: "Moving mass closer to the axis increases rotational inertia.", rationale: "It decreases it: r gets smaller, and I depends on r²." },
      ],
      correctChoiceIds: ["a", "b", "c"],
    },
    hints: ["What changes when her arms come in: her mass, or where it is?", r`Recall $I = \sum mr^2$.`],
    solution: r`Same mass (b ✓), but her arms' mass is now closer to the axis, so $I$ drops (a ✓; d ✗, e ✗). I always depends on the axis (c ✓).`,
  }),
  q("dist-check-1", [DI], 1, "shape-formula", 30, {
    prompt: r`A thin ring of mass $1.5${kg}$ and radius $0.40${m}$ spins about its central axis ($I = MR^2$). What is its rotational inertia?`,
    body: num(0.24, "kg·m²", { abs: 0.002 }, [
      { value: 0.6, misconception: M("inertia-unsquared"), note: "Square the radius." },
    ]),
    hints: ["All of the ring's mass is at distance R.", "Square R before multiplying."],
    solution: r`$I = MR^2 = (1.5)(0.40)^2 = 0.24${kgm2}$.`,
  }),
  q("dist-check-2", [DI], 2, "hoop-vs-disc", 45, {
    prompt: "Two wheels have the same mass and radius. Wheel A is a solid disc. Wheel B is a bicycle wheel, with almost all its mass in the rim. Which has the **smaller** rotational inertia about its axle?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Wheel A (solid disc)", rationale: "Much of A's mass is near the axle, which contributes little." },
        { id: "b", text: "Wheel B (bicycle wheel)", rationale: "B's mass is concentrated at the largest radius, so it has the larger I." },
        { id: "c", text: "Neither: same mass and radius.", misconception: M("inertia-mass-only"), rationale: "The distribution of mass matters, not only the total." },
        { id: "d", text: "It depends on how fast they turn.", rationale: "Rotational inertia does not depend on the speed." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Where is each wheel's mass?", "Mass near the axle contributes little to I."],
    solution: r`The disc ($\approx \tfrac12MR^2$) has less rotational inertia than the rim-heavy wheel ($\approx MR^2$).`,
  }),
  q("dist-quiz-1", [DI], 3, "axis-concept", 60, {
    prompt: r`A uniform rod has $I = \tfrac1{12}ML^2$ about its centre and $I = \tfrac13ML^2$ about one end. How many times larger is the rotational inertia about the end?`,
    body: num(4, "", { abs: 0.02 }, [
      { value: 1, misconception: M("inertia-mass-only"), note: "The rod's mass is the same, but the axis is different, so I is different." },
    ]),
    hints: ["The rod and its mass are the same in both cases; only the fraction in front of ML² changes.", "Divide one fraction by the other."],
    solution: r`$\dfrac{\tfrac13ML^2}{\tfrac1{12}ML^2} = \dfrac{12}{3} = 4$.`,
  }),
  q("dist-test-1", [DI, RS], 3, "compare-shapes", 75, {
    prompt: "A solid cylinder and a thin-walled hollow cylinder have the same mass and radius. Each starts from rest on a frictionless axle and the same torque is applied to each. Which reaches an angular speed of 10 rad/s first?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The solid cylinder", rationale: "It has the smaller rotational inertia (½MR² vs MR²), so the same torque gives it a larger α." },
        { id: "b", text: "The hollow cylinder", rationale: "The hollow cylinder has all its mass at the rim, so it has the larger I and the smaller α." },
        { id: "c", text: "Both at the same time, since the masses are equal.", misconception: M("inertia-mass-only"), rationale: "Equal masses do not mean equal rotational inertias." },
        { id: "d", text: "It cannot be decided without knowing the torque.", rationale: "Whatever the torque, it is the same for both, so the smaller I wins." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Compare the rotational inertias.", r`Same τ, so $\alpha = \tau/I$.`],
    solution: r`Solid: $I = \tfrac12MR^2$; hollow: $I = MR^2$. With the same torque, $\alpha = \tau/I$ is twice as large for the solid cylinder, so it reaches $10${rps}$ in half the time.`,
  }),

  // ───────────────────────── Balancing torques ─────────────────────────
  q("tb-1", [TB], 1, "balance-condition", 45, {
    prompt: "A seesaw pivoted at its centre is balanced and at rest with one child on each side. Which statement must be true?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The two children have equal weights.", misconception: M("balance-equal-weights"), rationale: "A lighter child can balance a heavier one by sitting farther out." },
        { id: "b", text: "The two children sit at equal distances from the pivot.", misconception: M("balance-equal-weights"), rationale: "Equal distances only balance equal weights." },
        { id: "c", text: "The counterclockwise torque about the pivot equals the clockwise torque.", rationale: "Balance means zero net torque: weight × distance must match on both sides." },
        { id: "d", text: "The heavier child sits farther from the pivot.", rationale: "The opposite: the heavier child must sit closer." },
      ],
      correctChoiceId: "c",
    },
    hints: ["What makes a seesaw turn: force, or force and distance together?", "At balance, the turning effects cancel."],
    solution: r`Balance means zero net torque: $W_1 d_1 = W_2 d_2$. Weights and distances can differ as long as the products match.`,
  }),
  q("tb-2", [TB], 2, "seesaw-position", 45, {
    prompt: r`A $300${N}$ child sits $2.0${m}$ to the left of a seesaw's central pivot. Where must a $400${N}$ child sit, to the right of the pivot, to balance it?`,
    body: num(1.5, "m", { abs: 0.01 }, [
      { value: 2, misconception: M("balance-equal-weights"), note: "Equal distances balance equal weights. The heavier child must sit closer." },
    ]),
    hints: ["Set the counterclockwise torque equal to the clockwise torque.", r`$W_1 d_1 = W_2 d_2$.`],
    solution: r`$(300)(2.0) = (400)d \Rightarrow d = \dfrac{600}{400} = 1.5${m}$ to the right of the pivot.`,
  }),
  q("tb-3", [TB], 2, "metre-stick", 60, {
    prompt: r`A uniform metre stick is balanced at its $50${cm}$ mark. A $200${g_}$ mass hangs at the $20${cm}$ mark. What mass hung at the $90${cm}$ mark will balance the stick?`,
    body: num(150, "g", { abs: 0.5 }, [
      { value: 200, misconception: M("balance-equal-weights"), note: "The two masses are at different distances from the pivot, so equal masses will not balance." },
    ]),
    hints: ["Measure each distance from the pivot at 50 cm.", "Balance the torques; g cancels from both sides."],
    solution: r`Distances: $30${cm}$ and $40${cm}$. $(200)(30) = m(40) \Rightarrow m = 150${g_}$.`,
  }),
  q("tb-4", [TB], 3, "several-masses", 75, {
    prompt: r`On a seesaw with a central pivot, a $250${N}$ child sits $2.0${m}$ to the left and a $150${N}$ child sits $1.0${m}$ to the left. How far to the right of the pivot must a $500${N}$ adult sit to balance them?`,
    body: num(1.3, "m", { abs: 0.01 }),
    hints: ["Add the torques of both children on the left.", "Set that total equal to the adult's torque."],
    solution: r`Left: $(250)(2.0) + (150)(1.0) = 650${Nm}$. Right: $500d = 650 \Rightarrow d = 1.3${m}$.`,
  }),
  q("tb-5", [TB], 3, "beam-weight", 90, {
    prompt: r`A uniform metre stick of mass $100${g_}$ is placed on a pivot at its $30${cm}$ mark. What mass must be hung at the $0${cm}$ mark to balance it?`,
    body: num(66.7, "g", { abs: 0.5 }),
    hints: ["The stick's own weight acts at its centre of mass, the 50 cm mark.", "Find the distance of each weight from the pivot and balance the torques."],
    solution: r`The stick's weight acts $20${cm}$ right of the pivot; the hanging mass is $30${cm}$ left. $m(30) = (100)(20) \Rightarrow m \approx 66.7${g_}$.`,
  }),
  q("tb-6", [TB], 3, "balance-condition", 90, {
    prompt: r`A seesaw with a central pivot balances with a $300${N}$ child $2.0${m}$ left of the pivot and a $400${N}$ child $1.5${m}$ right of it. Select **all** the changes that keep it balanced.`,
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "Both children move to half their distances from the pivot." },
        { id: "b", text: "Both children move to twice their distances from the pivot." },
        { id: "c", text: r`Both children pick up identical $50${N}$ bags and stay where they are.`, misconception: M("balance-equal-weights"), rationale: r`The bags add $(50)(2.0) = 100${Nm}$ on the left but only $(50)(1.5) = 75${Nm}$ on the right.` },
        { id: "d", text: r`Both children move $0.50${m}$ farther from the pivot.`, rationale: r`Left: $(300)(2.5) = 750${Nm}$; right: $(400)(2.0) = 800${Nm}$. Not balanced.` },
        { id: "e", text: "The children swap places.", rationale: r`Left: $(400)(2.0) = 800${Nm}$; right: $(300)(1.5) = 450${Nm}$.` },
      ],
      correctChoiceIds: ["a", "b"],
    },
    hints: ["Balance holds when the two torques stay equal.", "Check each change by working out both torques."],
    solution: r`Scaling both distances by the same factor scales both torques equally (a ✓, b ✓). Adding equal weights or equal distances adds unequal torques, because the children are at different distances or have different weights (c, d ✗). Swapping places gives $800$ vs $450${Nm}$ (e ✗).`,
  }),
  q("tb-7", [TB], 3, "symbolic", 75, {
    prompt: r`A child of mass $m$ sits a distance $d$ from the central pivot of a seesaw. Write an expression for the distance from the pivot, on the other side, at which a child of mass $M$ must sit to balance the seesaw.`,
    body: {
      type: "expression",
      answer: "m*d/M",
      variables: ["m", "d", "M"],
      domain: [1, 5],
      inputHint: "Use m, d and M (m and M are different).",
    },
    hints: ["Each child's weight is mass times g.", "Set the two torques equal and solve for the unknown distance."],
    solution: r`$mgd = Mgx \Rightarrow x = \dfrac{md}{M}$. (g cancels.)`,
  }),
  q("tb-8", [TB], 3, "lever-force", 75, {
    prompt: r`A $1.2${m}$ crowbar rests on a small block that acts as a pivot $0.10${m}$ from the end wedged under a rock. You push straight down with $150${N}$ on the other end, perpendicular to the bar. What force does the bar exert on the rock (assume the bar is horizontal and the rock force is perpendicular to it)?`,
    body: num(1650, "N", { abs: 5 }),
    hints: ["How far from the pivot is your hand?", "Balance your torque against the rock's torque about the pivot."],
    solution: r`Your hand is $1.2 - 0.10 = 1.1${m}$ from the pivot. $(150)(1.1) = F(0.10) \Rightarrow F = 1650${N}$: an 11-fold force gain.`,
  }),
  q("tb-9", [TB], 3, "several-masses", 90, {
    prompt: r`A uniform metre stick is balanced at its $50${cm}$ mark. A $100${g_}$ mass hangs at the $10${cm}$ mark and a $50${g_}$ mass at the $30${cm}$ mark. At which mark must a $200${g_}$ mass be hung to balance the stick?`,
    body: num(75, "cm", { abs: 0.3 }),
    hints: ["Find the total counterclockwise torque from the two masses on the left (distances from 50 cm).", "Find the distance from the pivot for the 200 g mass, then convert it to a mark on the stick."],
    solution: r`Left: $(100)(40) + (50)(20) = 5000${g_}\cdot${cm}$. Right: $200d = 5000 \Rightarrow d = 25${cm}$, so the mass hangs at the $75${cm}$ mark.`,
  }),
  q("tb-10", [TB, SE], 4, "beam-weight", 90, {
    prompt: r`A uniform plank $4.0${m}$ long rests on a pivot $1.2${m}$ from its left end. A $20${kg}$ child sits on the left end, and the plank balances horizontally. What is the mass of the plank?`,
    body: num(30, "kg", { abs: 0.1 }),
    hints: ["The plank's weight acts at its centre. How far is that from the pivot?", "Balance the child's torque against the plank's torque."],
    solution: r`The plank's centre is $2.0 - 1.2 = 0.80${m}$ right of the pivot. $(20)(1.2) = m_p(0.80) \Rightarrow m_p = 30${kg}$.`,
  }),
  q("tb-check-1", [TB], 1, "seesaw-position", 45, {
    prompt: r`A $250${N}$ child sits $2.0${m}$ from the centre pivot of a seesaw. How far from the pivot, on the other side, should a $500${N}$ adult sit to balance it?`,
    body: num(1.0, "m", { abs: 0.01 }, [
      { value: 2, misconception: M("balance-equal-weights"), note: "Equal distances only balance equal weights." },
    ]),
    hints: ["Balance the two torques.", r`$W_1 d_1 = W_2 d_2$.`],
    solution: r`$(250)(2.0) = (500)d \Rightarrow d = 1.0${m}$.`,
  }),
  q("tb-check-2", [TB], 1, "balance-condition", 45, {
    prompt: "A parent and a small child want to balance on a seesaw. Where should they sit?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Both at the same distance from the pivot.", misconception: M("balance-equal-weights"), rationale: "Then the parent's larger weight gives the larger torque." },
        { id: "b", text: "The parent closer to the pivot than the child.", rationale: "A smaller lever arm for the larger weight can make the torques equal." },
        { id: "c", text: "The parent farther from the pivot than the child.", rationale: "That makes the parent's torque even larger." },
        { id: "d", text: "It is impossible for them to balance.", rationale: "Different weights balance when the distances compensate." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Torque = weight × distance.", "How can a big weight and a small weight give equal products?"],
    solution: r`For $W_{\text{parent}}d_{\text{parent}} = W_{\text{child}}d_{\text{child}}$ with the larger parent weight, the parent's distance must be smaller.`,
  }),
  q("tb-quiz-1", [TB], 3, "seesaw-position", 60, {
    prompt: r`A $35${kg}$ child sits $1.6${m}$ left of a seesaw's central pivot. Where must a $28${kg}$ child sit, to the right of the pivot, to balance?`,
    body: num(2.0, "m", { abs: 0.01 }, [
      { value: 1.6, misconception: M("balance-equal-weights"), note: "The lighter child needs a larger lever arm to give an equal torque." },
    ]),
    hints: ["Torque = mg × distance; g cancels.", "Solve for the unknown distance."],
    solution: r`$(35)(1.6) = (28)d \Rightarrow d = \dfrac{56}{28} = 2.0${m}$.`,
  }),
  q("tb-test-1", [TB], 3, "balance-point", 75, {
    prompt: r`A light rod $0.60${m}$ long has a $0.30${kg}$ mass at its left end and a $0.20${kg}$ mass at its right end. How far from the **left** end should a string be tied so that the rod hangs horizontally?`,
    body: num(0.24, "m", { abs: 0.003 }, [
      { value: 0.3, misconception: M("balance-equal-weights"), note: "The middle only works for equal masses. The balance point is closer to the heavier mass." },
    ]),
    hints: ["Call the distance from the left end x; the right mass is then 0.60 − x from the string.", "Balance the torques about the string."],
    solution: r`$0.30x = 0.20(0.60 - x) \Rightarrow 0.50x = 0.12 \Rightarrow x = 0.24${m}$, closer to the heavier mass.`,
  }),

  // ─────────────────────────── Static equilibrium ───────────────────────────
  q("se-1", [SE], 1, "conditions", 45, {
    prompt: "An extended object (such as a beam) is in static equilibrium. Which conditions must hold?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The net force on it is zero; the net torque need not be.", misconception: M("equilibrium-forces-only"), rationale: "With a non-zero net torque the object would start to rotate." },
        { id: "b", text: "The net torque on it is zero; the net force need not be.", rationale: "With a non-zero net force the object's centre of mass would accelerate." },
        { id: "c", text: "Both the net force and the net torque on it are zero.", rationale: "Static equilibrium means no translational and no rotational acceleration." },
        { id: "d", text: "All the forces on it are equal in size.", rationale: "The forces can have any sizes, as long as they cancel and so do their torques." },
      ],
      correctChoiceId: "c",
    },
    hints: ["What would a non-zero net force do?", "What would a non-zero net torque do?"],
    solution: r`At rest and staying at rest means no linear acceleration ($\Sigma F = 0$) and no angular acceleration ($\Sigma\tau = 0$). Both are required.`,
  }),
  q("se-2", [SE], 2, "two-supports", 90, {
    prompt: r`A uniform plank $6.0${m}$ long weighing $400${N}$ rests on supports at its two ends. A $600${N}$ person stands $2.0${m}$ from the **left** end. What upward force does the **left** support exert?`,
    body: num(600, "N", { abs: 2 }, [
      { value: 500, misconception: M("supports-share-equally"), note: "The supports share the load equally only when it is centred. The person is nearer the left support." },
    ]),
    hints: ["Take torques about the right support so that its force drops out.", "The plank's weight acts at its centre, 3.0 m from either end."],
    solution: r`About the right end: $L(6.0) = (400)(3.0) + (600)(4.0) = 1200 + 2400 = 3600$, so $L = 600${N}$. (Check: right support $= 1000 - 600 = 400${N}$.)`,
  }),
  q("se-3", [SE], 2, "force-condition", 45, {
    prompt: r`A uniform beam weighing $W_b$ rests on two supports, with a box of weight $W$ placed somewhere on it. Which statement about the two upward support forces $F_1$ and $F_2$ must be true?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$F_1 = F_2$`, misconception: M("supports-share-equally"), rationale: "The forces are equal only if the load is symmetric." },
        { id: "b", text: r`$F_1 + F_2 = W_b + W$`, rationale: "The net vertical force must be zero, wherever the box is." },
        { id: "c", text: r`$F_1 + F_2 = W$`, misconception: M("ignores-beam-weight"), rationale: "The supports also hold up the beam itself." },
        { id: "d", text: r`$F_1 + F_2 > W_b + W$`, rationale: "If the upward forces exceeded the weights, the beam would accelerate upward." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Apply the force condition for equilibrium.", "List every downward force on the beam."],
    solution: r`$\Sigma F_y = 0$: $F_1 + F_2 - W_b - W = 0$. How the total splits between the two supports depends on where the box is (that is what the torque condition decides).`,
  }),
  q("se-4", [SE], 3, "two-supports", 120, {
    prompt: r`A uniform beam $4.0${m}$ long weighing $200${N}$ rests on two supports, one at its left end ($x = 0$) and one at $x = 3.0${m}$. A $300${N}$ box sits at $x = 3.5${m}$. What upward force does the support at $x = 3.0${m}$ exert?`,
    body: num(483, "N", { abs: 2 }, [
      { value: 250, misconception: M("supports-share-equally"), note: "The load is not symmetric about the supports. Use the torque condition." },
    ]),
    hints: ["Take torques about the left support.", "The beam's weight acts at x = 2.0 m."],
    solution: r`About $x = 0$: $F(3.0) = (200)(2.0) + (300)(3.5) = 400 + 1050 = 1450$, so $F \approx 483${N}$. (The left support then pushes up with only $500 - 483 \approx 17${N}$.)`,
  }),
  q("se-5", [SE], 2, "choose-pivot", 45, {
    prompt: "When solving a static-equilibrium problem, why is it useful to take torques about the point where an unknown force acts?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "That unknown force has zero lever arm about that point, so it drops out of the torque equation.", rationale: "One fewer unknown in the equation." },
        { id: "b", text: "It is the only point about which the net torque is zero.", rationale: "For an object in equilibrium, the net torque is zero about every point." },
        { id: "c", text: "It makes the net force zero.", misconception: M("equilibrium-forces-only"), rationale: "The choice of pivot affects only the torque equation, not the force balance." },
        { id: "d", text: "The real pivot must always be used, and that is where the unknown force acts.", rationale: "You can choose any point; it need not be a physical pivot." },
      ],
      correctChoiceId: "a",
    },
    hints: ["What is the torque of a force about its own point of application?", "How does that help with unknowns?"],
    solution: r`A force acting at the chosen point has $r = 0$, so its torque is zero and it disappears from $\Sigma\tau = 0$, leaving fewer unknowns to solve for.`,
  }),
  q("se-6", [SE, TM], 3, "hinge-cable", 120, {
    prompt: r`A uniform horizontal beam $2.0${m}$ long weighing $150${N}$ is hinged to a wall at one end. A $100${N}$ sign hangs from its outer end. A cable from the outer end to the wall makes a $30^\circ$ angle with the beam. What is the tension in the cable?`,
    body: num(350, "N", { abs: 2 }, [
      { value: 175, misconception: M("torque-angle"), note: "The cable is not perpendicular to the beam. Only T sin 30° turns it." },
      { value: 202, misconception: M("torque-angle"), note: "The perpendicular component of the tension is T sin 30°, not T cos 30°." },
    ]),
    hints: ["Take torques about the hinge so that the unknown hinge force drops out.", "The beam's weight acts at its centre; the cable's lever arm involves sin 30°."],
    solution: r`About the hinge: $T(2.0)\sin 30^\circ = (150)(1.0) + (100)(2.0)$, so $T(1.0) = 350$ and $T = 350${N}$.`,
  }),
  q("se-7", [SE], 4, "hinge-force", 120, {
    prompt: r`A uniform horizontal beam $3.0${m}$ long weighing $200${N}$ is hinged to a wall at one end, with a $150${N}$ sign hanging from its outer end. A cable from the outer end to the wall, at $30^\circ$ to the beam, holds it level with a tension of $500${N}$. What is the **vertical** component of the force the hinge exerts on the beam?`,
    body: num(100, "N", { abs: 1 }),
    hints: ["Apply the vertical force condition to the beam.", "The cable's tension has a vertical component of T sin 30°."],
    solution: r`$\Sigma F_y = 0$: $H_y + (500)\sin 30^\circ - 200 - 150 = 0 \Rightarrow H_y = 350 - 250 = 100${N}$ (upward). (Check with torques about the hinge: $T(3.0)\sin 30^\circ = (200)(1.5) + (150)(3.0) = 750$, so $T = 500${N}$ as given.)`,
  }),
  q("se-8", [SE, NT], 4, "both-conditions", 90, {
    prompt: "A uniform rod lies on a frictionless horizontal table. Two forces of equal size act horizontally on it, perpendicular to the rod: one at each end, in opposite directions. Select **all** the statements that are correct.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "The net force on the rod is zero." },
        { id: "b", text: "The rod is in equilibrium.", misconception: M("equilibrium-forces-only"), rationale: "The two forces both turn the rod the same way, so the net torque is not zero." },
        { id: "c", text: "The rod starts to rotate." },
        { id: "d", text: "The rod's centre of mass stays at rest." },
        { id: "e", text: "The net torque is zero about the rod's centre.", misconception: M("torques-add-magnitudes"), rationale: "About the centre, both forces turn the rod in the same direction, so their torques add." },
      ],
      correctChoiceIds: ["a", "c", "d"],
    },
    hints: ["Check the force condition and the torque condition separately.", "About the centre, which way does each force turn the rod?"],
    solution: r`The forces cancel, so $\Sigma F = 0$ and the centre of mass stays at rest (a ✓, d ✓). Both forces turn the rod the same way, so $\Sigma\tau \ne 0$ and it starts rotating (c ✓). It is not in equilibrium (b ✗, e ✗).`,
  }),
  q("se-9", [SE], 3, "two-supports", 120, {
    prompt: r`A uniform $5.0${m}$ plank weighing $300${N}$ rests on supports at its ends. The right support can safely provide at most $450${N}$. How far from the **left** end can a $500${N}$ painter stand before the right support reaches its limit?`,
    body: num(3.0, "m", { abs: 0.02 }),
    hints: ["Take torques about the left support, with the right support force set to its limit.", "The plank's weight acts at 2.5 m."],
    solution: r`About the left end: $(450)(5.0) = (300)(2.5) + (500)x \Rightarrow 2250 = 750 + 500x \Rightarrow x = 3.0${m}$.`,
  }),
  q("se-10", [SE], 4, "tipping", 120, {
    prompt: r`A uniform plank $4.0${m}$ long weighing $200${N}$ rests on two supports at $x = 1.0${m}$ and $x = 3.0${m}$ (measured from its left end). A $400${N}$ person walks to the right past the support at $x = 3.0${m}$. How far beyond that support can the person go before the plank starts to tip?`,
    body: num(0.5, "m", { abs: 0.01 }),
    hints: ["At the point of tipping, the left support's force drops to zero.", "Take torques about the right support."],
    solution: r`At tipping, only the right support pushes up. About it: the plank's weight acts $1.0${m}$ to the left, giving $(200)(1.0) = 200${Nm}$; the person gives $400d$. $400d = 200 \Rightarrow d = 0.50${m}$.`,
  }),
  q("se-11", [SE], 3, "choose-pivot", 120, {
    prompt: r`A window-cleaning platform $6.0${m}$ long weighing $500${N}$ hangs from two vertical ropes, one at each end. A $700${N}$ worker stands $1.5${m}$ from the left end. What is the tension in the **left** rope?`,
    body: num(775, "N", { abs: 2 }, [
      { value: 600, misconception: M("supports-share-equally"), note: "The worker is off-centre, so the ropes do not share the load equally." },
    ]),
    hints: ["Take torques about the right rope's attachment point.", "Measure each lever arm from that point."],
    solution: r`About the right end: $T_L(6.0) = (500)(3.0) + (700)(4.5) = 1500 + 3150 = 4650 \Rightarrow T_L = 775${N}$. (Right rope: $1200 - 775 = 425${N}$.)`,
  }),
  q("se-12", [SE], 4, "hinge-cable", 120, {
    prompt: r`A uniform horizontal boom $3.0${m}$ long weighing $240${N}$ is hinged to a wall and carries a $400${N}$ load at its outer end. A cable attached at the boom's **midpoint** runs up to the wall at $53^\circ$ above the boom ($\sin 53^\circ = 0.80$). What is the cable tension?`,
    body: num(1300, "N", { abs: 5 }, [
      { value: 1040, misconception: M("torque-angle"), note: "Only the perpendicular component T sin 53° gives a torque about the hinge." },
    ]),
    hints: ["Take torques about the hinge.", "The cable is attached 1.5 m from the hinge."],
    solution: r`About the hinge: $T(1.5)(0.80) = (240)(1.5) + (400)(3.0) = 360 + 1200 = 1560 \Rightarrow T = 1300${N}$.`,
  }),
  q("se-13", [SE], 3, "choose-pivot", 60, {
    prompt: "Two students solve the same static-equilibrium problem for a beam on two supports. One takes torques about the left support, the other about the beam's centre. Assuming no mistakes, how do their answers for the support forces compare?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "They are the same.", rationale: "For an object in equilibrium the net torque is zero about every point, so any choice gives the same forces." },
        { id: "b", text: "Only the student using the left support is right, because that is a real support.", rationale: "The pivot for the torque equation can be any point." },
        { id: "c", text: "Only the student using the centre is right, because that is where the weight acts.", rationale: "The centre is a fine choice, but so is any other point." },
        { id: "d", text: "They differ, because torques depend on the pivot chosen.", rationale: "Individual torques depend on the pivot, but the forces that make the net torque zero do not." },
      ],
      correctChoiceId: "a",
    },
    hints: ["If an object is not rotating, about which points is the net torque zero?", "Can a choice of reference point change the physical forces?"],
    solution: r`An object in equilibrium has zero net torque about any point. The pivot choice only changes how convenient the algebra is, not the answer.`,
  }),
  q("se-14", [SE], 4, "ladder", 150, {
    prompt: r`A uniform ladder $5.0${m}$ long weighing $200${N}$ leans against a frictionless wall. Its foot is $3.0${m}$ from the wall and its top touches the wall $4.0${m}$ above the floor. What friction force must the floor exert on the ladder's foot to keep it from slipping?`,
    body: num(75, "N", { abs: 1 }),
    hints: ["Take torques about the foot of the ladder, which removes both floor forces.", "The wall pushes horizontally; its lever arm about the foot is the height of the top."],
    solution: r`About the foot: the weight acts $1.5${m}$ horizontally from the foot, giving $(200)(1.5) = 300${Nm}$; the wall force $N_w$ has lever arm $4.0${m}$. $4.0N_w = 300 \Rightarrow N_w = 75${N}$. Horizontal balance: friction $= N_w = 75${N}$ (toward the wall).`,
  }),
  q("se-check-1", [SE], 2, "two-supports", 90, {
    prompt: r`A uniform plank $4.0${m}$ long weighing $100${N}$ rests on supports at its ends. A $300${N}$ person stands $1.0${m}$ from the left end. What upward force does the **left** support exert?`,
    body: num(275, "N", { abs: 1 }, [
      { value: 200, misconception: M("supports-share-equally"), note: "The person is off-centre, nearer the left support, so it carries more." },
    ]),
    hints: ["Take torques about the right support.", "The plank's weight acts at its centre."],
    solution: r`About the right end: $L(4.0) = (100)(2.0) + (300)(3.0) = 1100 \Rightarrow L = 275${N}$. Right support: $400 - 275 = 125${N}$.`,
  }),
  q("se-check-2", [SE], 2, "force-condition", 60, {
    prompt: r`A seesaw board weighing $200${N}$ balances on its central pivot with a $300${N}$ child on one side and a $400${N}$ child on the other, both at rest. What upward force does the pivot exert on the board?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`$900${N}$`, rationale: "The pivot must balance all the weight: 200 + 300 + 400." },
        { id: "b", text: r`$700${N}$`, misconception: M("ignores-beam-weight"), rationale: "That leaves out the board's own weight." },
        { id: "c", text: r`$100${N}$`, rationale: "Weights on opposite sides both push down; they do not cancel." },
        { id: "d", text: "Zero, because the seesaw is balanced.", misconception: M("equilibrium-forces-only"), rationale: "Balanced means zero net torque and zero net force, which needs a large upward pivot force." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Use the force condition, not the torque condition.", "List every downward force."],
    solution: r`$\Sigma F_y = 0$: $F_{\text{pivot}} = 200 + 300 + 400 = 900${N}$.`,
  }),
  q("se-quiz-1", [SE], 3, "two-supports", 120, {
    prompt: r`A uniform bridge $10${m}$ long weighing $20\,000${N}$ rests on supports at its ends. A $15\,000${N}$ car is stopped $3.0${m}$ from the **left** end. What upward force does the **left** support exert?`,
    body: num(20500, "N", { abs: 50 }, [
      { value: 17500, misconception: M("supports-share-equally"), note: "The car is closer to the left support, so the left support carries more than half." },
    ]),
    hints: ["Take torques about the right support.", "The bridge's weight acts at 5.0 m from either end."],
    solution: r`About the right end: $L(10) = (20\,000)(5.0) + (15\,000)(7.0) = 205\,000 \Rightarrow L = 20\,500${N}$.`,
  }),
  q("se-quiz-2", [SE], 3, "load-shift", 60, {
    prompt: "A box sits at the middle of a plank supported at both ends. The box is slid slowly toward the left end. What happens to the two support forces?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "Both stay the same, each carrying half the total weight.", misconception: M("supports-share-equally"), rationale: "The torque condition shifts more of the load to the support nearer the box." },
        { id: "b", text: "The left force increases, the right force decreases, and their sum stays the same.", rationale: "The sum must equal the total weight; the torque condition sets how it is split." },
        { id: "c", text: "Both increase.", rationale: "Their sum always equals the total weight, which does not change." },
        { id: "d", text: "The left force decreases and the right force increases.", rationale: "The support closer to the load carries more of it." },
      ],
      correctChoiceId: "b",
    },
    hints: ["What does the force condition say about the sum?", "Take torques about the right support as the box moves left."],
    solution: r`$F_L + F_R$ always equals the total weight. Taking torques about the right end, the box's lever arm grows as it moves left, so $F_L$ must grow and $F_R$ must shrink.`,
  }),
  q("se-test-1", [SE], 3, "two-supports", 120, {
    prompt: r`A uniform diving board $3.0${m}$ long weighing $200${N}$ is bolted down at its left end ($x = 0$) and rests on a support (fulcrum) at $x = 1.0${m}$. A $600${N}$ diver stands at the right end ($x = 3.0${m}$). What upward force does the fulcrum exert?`,
    body: num(2100, "N", { abs: 5 }),
    hints: ["Take torques about the bolt, so the bolt's unknown force drops out.", "The board's weight acts at x = 1.5 m."],
    solution: r`About $x = 0$: $F(1.0) = (200)(1.5) + (600)(3.0) = 300 + 1800 = 2100 \Rightarrow F = 2100${N}$. The bolt must pull **down** with $2100 - 800 = 1300${N}$: a support force can be much larger than the total weight.`,
  }),
  q("se-test-2", [SE], 4, "both-conditions", 90, {
    prompt: "A uniform beam rests on two supports and is in static equilibrium. Select **all** the statements that must be true.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "The net force on the beam is zero." },
        { id: "b", text: "The net torque about the beam's centre is zero." },
        { id: "c", text: "The net torque about any point you choose is zero." },
        { id: "d", text: "The two support forces are equal.", misconception: M("supports-share-equally"), rationale: "They are equal only for a symmetric load." },
        { id: "e", text: "The beam has no linear or angular acceleration." },
        { id: "f", text: "The net torque is zero only about the beam's centre of mass.", rationale: "In equilibrium the net torque is zero about every point." },
      ],
      correctChoiceIds: ["a", "b", "c", "e"],
    },
    hints: ["Equilibrium needs both conditions.", "Does the pivot choice matter when the net force is zero?"],
    solution: r`Equilibrium: $\Sigma F = 0$ and $\Sigma\tau = 0$ about every point (a, b, c ✓), so no acceleration of either kind (e ✓). Support forces are equal only by symmetry (d ✗), and the torque condition is not special to the centre of mass (f ✗).`,
  }),

  // ─────────────────── Newton's second law for rotation ───────────────────
  q("rs-1", [RS], 1, "compute-alpha", 45, {
    prompt: r`A net torque of $12${Nm}$ acts on a wheel whose rotational inertia is $3.0${kgm2}$. What is the wheel's angular acceleration?`,
    body: num(4.0, "rad/s²", { abs: 0.02 }),
    hints: [r`Use $\tau_{\text{net}} = I\alpha$.`, "Solve for α."],
    solution: r`$\alpha = \dfrac{\tau_{\text{net}}}{I} = \dfrac{12}{3.0} = 4.0${rps2}$.`,
  }),
  q("rs-2", [RS], 2, "zero-torque", 45, {
    prompt: r`A wheel spins at $8.0${rps}$ on a frictionless axle. No torques act on it. What happens to its rotation?`,
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: r`It keeps spinning at $8.0${rps}$.`, rationale: "With zero net torque, α = 0, so ω stays constant: the rotational form of Newton's first law." },
        { id: "b", text: "It gradually slows down and stops.", misconception: M("zero-torque-no-rotation"), rationale: "Slowing down needs a torque opposing the spin (such as friction). Here there is none." },
        { id: "c", text: "It stops immediately.", misconception: M("zero-torque-no-rotation"), rationale: "A torque is needed to change ω, including to stop it." },
        { id: "d", text: "It speeds up.", rationale: "Speeding up needs a torque in the direction of the spin." },
      ],
      correctChoiceId: "a",
    },
    hints: [r`With no torques, what is α from $\tau_{\text{net}} = I\alpha$?`, "If α = 0, what happens to ω?"],
    solution: r`$\tau_{\text{net}} = 0 \Rightarrow \alpha = 0$, so ω is constant. A spinning object needs no torque to keep spinning, only to change its spin.`,
  }),
  q("rs-3", [RS], 2, "compute-torque", 45, {
    prompt: r`A turntable has rotational inertia $0.50${kgm2}$. What net torque is needed to give it an angular acceleration of $6.0${rps2}$?`,
    body: num(3.0, "N·m", { abs: 0.02 }),
    hints: [r`Use $\tau_{\text{net}} = I\alpha$.`, "Multiply."],
    solution: r`$\tau_{\text{net}} = I\alpha = (0.50)(6.0) = 3.0${Nm}$.`,
  }),
  q("rs-4", [RS, RK], 3, "with-kinematics", 90, {
    prompt: r`A grinding wheel with rotational inertia $0.20${kgm2}$ starts from rest. A motor applies a constant torque of $4.0${Nm}$ (ignore friction). How long does it take to reach $100${rps}$?`,
    body: num(5.0, "s", { abs: 0.03 }),
    hints: ["First find α from the torque and the rotational inertia.", r`Then use $\omega = \omega_0 + \alpha t$.`],
    solution: r`$\alpha = \dfrac{4.0}{0.20} = 20${rps2}$. $t = \dfrac{\omega}{\alpha} = \dfrac{100}{20} = 5.0${s}$.`,
  }),
  q("rs-5", [RS, RK], 3, "friction-torque", 90, {
    prompt: r`A flywheel with rotational inertia $2.5${kgm2}$ is spinning at $40${rps}$ when its motor is switched off. Friction in its bearings brings it to rest uniformly in $20${s}$. What is the magnitude of the frictional torque?`,
    body: num(5.0, "N·m", { abs: 0.03 }),
    hints: ["Find the angular acceleration from the change in ω and the time.", r`Then use $\tau = I\alpha$.`],
    solution: r`$|\alpha| = \dfrac{40}{20} = 2.0${rps2}$. $|\tau| = I|\alpha| = (2.5)(2.0) = 5.0${Nm}$.`,
  }),
  q("rs-6", [RS, DI], 3, "compare", 60, {
    prompt: "The same torque is applied to a thin hoop and to a solid disc of the same mass and radius, each on a frictionless axle through its centre. Which has the greater angular acceleration?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The hoop", rationale: "The hoop has the larger rotational inertia, so the same torque gives it the smaller α." },
        { id: "b", text: "The disc", rationale: "The disc's I = ½MR² is half the hoop's, so α = τ/I is twice as large." },
        { id: "c", text: "They are equal, since the masses are equal.", misconception: M("inertia-mass-only"), rationale: "Angular acceleration depends on rotational inertia, which depends on how the mass is distributed." },
        { id: "d", text: "It depends on how fast they are already spinning.", rationale: "α = τ/I does not depend on the current ω." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Compare the rotational inertias.", r`$\alpha = \tau/I$ with the same τ.`],
    solution: r`$I_{\text{disc}} = \tfrac12MR^2 < I_{\text{hoop}} = MR^2$. With the same τ, the disc's α is twice the hoop's.`,
  }),
  q("rs-7", [RS, NT], 4, "net-torque-alpha", 90, {
    prompt: r`An electric motor applies a torque of $9.0${Nm}$ to a rotor with rotational inertia $1.5${kgm2}$. Friction exerts an opposing torque of $1.5${Nm}$. What is the rotor's angular acceleration?`,
    body: num(5.0, "rad/s²", { abs: 0.02 }, [
      { value: 7, misconception: M("torques-add-magnitudes"), note: "Friction opposes the motor, so its torque subtracts." },
      { value: 6, misconception: M("torques-add-magnitudes"), note: "Use the net torque: the friction torque cannot be ignored." },
    ]),
    hints: ["Find the net torque first: the two torques act in opposite directions.", r`Then $\alpha = \tau_{\text{net}}/I$.`],
    solution: r`$\tau_{\text{net}} = 9.0 - 1.5 = 7.5${Nm}$. $\alpha = \dfrac{7.5}{1.5} = 5.0${rps2}$.`,
  }),
  q("rs-8", [RS, DI], 3, "tangential-force", 90, {
    prompt: r`A $2.0${kg}$ solid disc of radius $0.25${m}$ ($I = \tfrac12MR^2$) turns on a frictionless axle. A $5.0${N}$ force is applied tangentially to its rim. What is its angular acceleration?`,
    body: num(20, "rad/s²", { abs: 0.1 }),
    hints: ["Find I from the formula and the torque from the tangential force.", r`Then $\alpha = \tau/I$.`],
    solution: r`$I = \tfrac12(2.0)(0.25)^2 = 0.0625${kgm2}$. $\tau = (0.25)(5.0) = 1.25${Nm}$. $\alpha = \dfrac{1.25}{0.0625} = 20${rps2}$.`,
  }),
  q("rs-check-1", [RS], 1, "compute-alpha", 30, {
    prompt: r`A net torque of $6.0${Nm}$ acts on a wheel with rotational inertia $2.0${kgm2}$. What is its angular acceleration?`,
    body: num(3.0, "rad/s²", { abs: 0.02 }),
    hints: [r`$\tau_{\text{net}} = I\alpha$.`, "Divide the torque by the rotational inertia."],
    solution: r`$\alpha = \dfrac{6.0}{2.0} = 3.0${rps2}$.`,
  }),
  q("rs-check-2", [RS], 2, "zero-torque", 45, {
    prompt: "A merry-go-round is spinning. The net torque on it is exactly zero. Which statement is correct?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "It must be slowing down.", misconception: M("zero-torque-no-rotation"), rationale: "Slowing down requires a net torque against the spin." },
        { id: "b", text: "It keeps turning at a constant angular velocity.", rationale: "Zero net torque means zero angular acceleration, so ω does not change." },
        { id: "c", text: "It must be at rest.", misconception: M("zero-torque-no-rotation"), rationale: "Zero net torque means ω is constant, and a constant ω can be non-zero." },
        { id: "d", text: "It must be speeding up.", rationale: "Speeding up requires a net torque along the spin." },
      ],
      correctChoiceId: "b",
    },
    hints: [r`What does $\tau_{\text{net}} = 0$ tell you about α?`, "What does α = 0 tell you about ω?"],
    solution: r`$\tau_{\text{net}} = 0 \Rightarrow \alpha = 0 \Rightarrow \omega$ constant. A spinning object with no net torque keeps spinning at the same rate.`,
  }),
  q("rs-quiz-1", [RS], 3, "tangential-force", 75, {
    prompt: r`A thin hoop of mass $1.2${kg}$ and radius $0.50${m}$ ($I = MR^2$) turns on a frictionless axle. A $6.0${N}$ force is applied tangentially to its rim. What is its angular acceleration?`,
    body: num(10, "rad/s²", { abs: 0.05 }),
    hints: ["Find the torque and the rotational inertia.", r`Then $\alpha = \tau/I$.`],
    solution: r`$\tau = (0.50)(6.0) = 3.0${Nm}$; $I = (1.2)(0.50)^2 = 0.30${kgm2}$; $\alpha = \dfrac{3.0}{0.30} = 10${rps2}$.`,
  }),
  q("rs-test-1", [RS, RK], 3, "with-kinematics", 90, {
    prompt: r`A playground merry-go-round has rotational inertia $500${kgm2}$ and radius $2.0${m}$. Starting from rest, a child pushes tangentially on its edge with a steady $100${N}$ (ignore friction). How long does it take to reach $1.2${rps}$?`,
    body: num(3.0, "s", { abs: 0.02 }),
    hints: ["Find the torque, then α.", r`Use $\omega = \omega_0 + \alpha t$.`],
    solution: r`$\tau = (2.0)(100) = 200${Nm}$. $\alpha = \dfrac{200}{500} = 0.40${rps2}$. $t = \dfrac{1.2}{0.40} = 3.0${s}$.`,
  }),
  q("rs-test-2", [RS, SE], 4, "zero-torque", 90, {
    prompt: "The net torque on an object (about its centre of mass) is zero. Select **all** the statements that **could** be true.",
    body: {
      type: "multi_select",
      choices: [
        { id: "a", text: "The object is at rest." },
        { id: "b", text: "The object is rotating at a constant angular velocity." },
        { id: "c", text: "The object's rotation is speeding up.", rationale: "Speeding up needs α ≠ 0, which needs a net torque." },
        { id: "d", text: "The net force on the object is not zero." },
        { id: "e", text: "The object's rotation is slowing down.", misconception: M("zero-torque-no-rotation"), rationale: "Slowing down also needs α ≠ 0. A spinning object with no net torque keeps spinning." },
      ],
      correctChoiceIds: ["a", "b", "d"],
    },
    hints: ["Zero net torque fixes α. What does that allow for ω?", "Is the force condition tied to the torque condition?"],
    solution: r`Zero net torque means $\alpha = 0$: ω is constant, either zero (a ✓) or not (b ✓), but not changing (c ✗, e ✗). The torque condition says nothing about the net force: a falling ball has zero torque about its centre but a non-zero net force (d ✓).`,
  }),

  // ───────────────── Pulleys with rotational inertia ─────────────────
  q("ps-1", [PS], 2, "tension-concept", 60, {
    prompt: "A block hangs from a light string wrapped around a heavy pulley wheel. The block is released and accelerates downward while the pulley spins up. How does the string tension compare with the block's weight?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The tension equals the block's weight.", misconception: M("tension-equals-weight"), rationale: "If T = mg, the net force on the block would be zero and it would not accelerate." },
        { id: "b", text: "The tension is less than the block's weight.", rationale: "The block accelerates downward, so mg − T = ma > 0." },
        { id: "c", text: "The tension is greater than the block's weight.", rationale: "Then the block would accelerate upward." },
        { id: "d", text: "The tension is zero, because the block is falling.", misconception: M("ignores-pulley-inertia"), rationale: "The string must pull on the pulley to spin it up, so it pulls back on the block too." },
      ],
      correctChoiceId: "b",
    },
    hints: ["Apply Newton's second law to the block alone.", "Which way does the block accelerate?"],
    solution: r`For the block (down positive): $mg - T = ma$ with $a > 0$, so $T < mg$. The tension is also what torques the pulley, so it cannot be zero unless the pulley has no rotational inertia at all.`,
  }),
  q("ps-2", [PS, LA], 2, "string-link", 45, {
    prompt: r`A string unwinds without slipping from a pulley of radius $0.10${m}$ while the block hanging from it accelerates downward at $2.0${ms2}$. What is the pulley's angular acceleration?`,
    body: num(20, "rad/s²", { abs: 0.1 }),
    hints: ["The block's acceleration equals the tangential acceleration of the pulley's rim.", r`Use $a = r\alpha$.`],
    solution: r`$\alpha = \dfrac{a}{r} = \dfrac{2.0}{0.10} = 20${rps2}$.`,
  }),
  q("ps-3", [PS], 3, "disc-pulley-accel", 120, {
    prompt: r`A $2.0${kg}$ block hangs from a light string wrapped around a pulley that is a solid disc of mass $4.0${kg}$ and radius $0.20${m}$ ($I = \tfrac12MR^2$), on a frictionless axle. The block is released from rest. What is its acceleration?`,
    body: num(4.9, "m/s²", { abs: 0.03 }, [
      { value: 9.8, misconception: M("ignores-pulley-inertia"), note: "That is free fall. The pulley's rotational inertia holds the block back." },
    ]),
    hints: [r`Block: $mg - T = ma$. Pulley: $TR = I\alpha$ with $\alpha = a/R$.`, r`For a disc, $I/R^2 = \tfrac12 M$.`],
    solution: r`Pulley: $TR = \tfrac12MR^2 \cdot \dfrac{a}{R} \Rightarrow T = \tfrac12Ma$. Block: $mg - \tfrac12Ma = ma \Rightarrow a = \dfrac{mg}{m + M/2} = \dfrac{(2.0)(9.8)}{2.0 + 2.0} = 4.9${ms2}$.`,
  }),
  q("ps-4", [PS], 3, "tension-value", 90, {
    prompt: r`A $2.0${kg}$ block hangs from a string wrapped around a solid-disc pulley and accelerates downward at $4.9${ms2}$. What is the tension in the string?`,
    body: num(9.8, "N", { abs: 0.05 }, [
      { value: 19.6, misconception: M("tension-equals-weight"), note: "That is the block's weight. Since the block accelerates down, the tension must be less." },
    ]),
    hints: ["Apply Newton's second law to the block, taking down as positive.", r`$mg - T = ma$.`],
    solution: r`$T = m(g - a) = (2.0)(9.8 - 4.9) = 9.8${N}$, half the block's weight.`,
  }),
  q("ps-5", [PS, DI], 3, "compare-pulleys", 60, {
    prompt: "A hanging block drives a solid-disc pulley. The pulley is replaced by a thin hoop-shaped pulley with the same mass and radius. What happens to the block's acceleration?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "It decreases.", rationale: "The hoop has twice the rotational inertia, so it resists spinning up more and the block accelerates less." },
        { id: "b", text: "It increases.", rationale: "More rotational inertia means more resistance to spinning up, not less." },
        { id: "c", text: "It stays the same, since the pulley's mass is unchanged.", misconception: M("inertia-mass-only"), rationale: "What matters is the rotational inertia, and the hoop's is larger." },
        { id: "d", text: "It becomes g.", misconception: M("ignores-pulley-inertia"), rationale: "The block falls freely only if the pulley has no rotational inertia." },
      ],
      correctChoiceId: "a",
    },
    hints: ["Compare the rotational inertias of the two pulleys.", r`$a = \dfrac{mg}{m + I/R^2}$.`],
    solution: r`$a = \dfrac{mg}{m + I/R^2}$. The hoop's $I = MR^2$ is twice the disc's $\tfrac12MR^2$, so the denominator grows and $a$ decreases.`,
  }),
  q("ps-6", [PS], 4, "general-pulley", 120, {
    prompt: r`A $0.50${kg}$ mass hangs from a cord wrapped around a wheel of radius $0.10${m}$ with rotational inertia $0.020${kgm2}$ on a frictionless axle. The mass is released from rest. What is its acceleration?`,
    body: num(1.96, "m/s²", { abs: 0.02 }, [
      { value: 9.8, misconception: M("ignores-pulley-inertia"), note: "The wheel must be spun up as well, so the mass falls with much less than g." },
    ]),
    hints: [r`Write $mg - T = ma$ for the mass and $TR = I\alpha$, $\alpha = a/R$ for the wheel.`, r`Eliminate $T$: you should find $a = \dfrac{mg}{m + I/R^2}$.`],
    solution: r`$\dfrac{I}{R^2} = \dfrac{0.020}{0.010} = 2.0${kg}$. $a = \dfrac{(0.50)(9.8)}{0.50 + 2.0} = 1.96${ms2}$.`,
  }),
  q("ps-7", [PS], 4, "symbolic", 120, {
    prompt: r`A block of mass $m$ hangs from a light string wrapped around a solid-disc pulley of mass $M$ ($I = \tfrac12MR^2$) on a frictionless axle. Write an expression for the block's acceleration in terms of $m$, $M$ and $g$.`,
    body: {
      type: "expression",
      answer: "m*g/(m + M/2)",
      variables: ["m", "M", "g"],
      domain: [1, 10],
      inputHint: "Use m, M and g (m and M are different). Use parentheses.",
      commonErrors: [{ expr: "g", misconception: M("ignores-pulley-inertia"), note: "That is free fall: it treats the pulley as if it had no rotational inertia." }],
    },
    hints: [r`Block: $mg - T = ma$. Pulley: $TR = I\alpha$ with $\alpha = a/R$.`, "Substitute the disc formula; R cancels."],
    solution: r`Pulley: $T = \dfrac{I a}{R^2} = \tfrac12Ma$. Block: $mg - \tfrac12Ma = ma \Rightarrow a = \dfrac{mg}{m + M/2}$.`,
  }),
  q("ps-8", [PS, RS], 4, "measure-inertia", 150, {
    prompt: r`To measure a pulley's rotational inertia, a student hangs a $1.0${kg}$ mass from a string wound around its axle of radius $0.050${m}$ and releases it from rest. The mass falls $1.0${m}$ in $1.0${s}$. What is the rotational inertia of the pulley (ignore friction)?`,
    body: num(0.00975, "kg·m²", { rel: 0.02 }),
    hints: [r`Find the mass's acceleration from $\Delta y = \tfrac12at^2$.`, "Then find the tension from the hanging mass, the torque it gives, and the angular acceleration a/R."],
    solution: r`$a = \dfrac{2\Delta y}{t^2} = 2.0${ms2}$. $T = m(g - a) = (1.0)(7.8) = 7.8${N}$. $\tau = TR = 0.39${Nm}$, $\alpha = \dfrac{a}{R} = 40${rps2}$, so $I = \dfrac{\tau}{\alpha} = \dfrac{0.39}{40} \approx 0.0098${kgm2}$.`,
  }),
  q("ps-check-1", [PS], 1, "tension-concept", 45, {
    prompt: "A block hanging from a string wound on a heavy pulley accelerates downward at less than g. Why?",
    body: {
      type: "multiple_choice",
      choices: [
        { id: "a", text: "The string pulls up on the block with a tension, and that tension is what spins the pulley up.", rationale: "To give the pulley an angular acceleration, the string must exert a torque on it, so it also pulls back on the block." },
        { id: "b", text: "Gravity is weaker on objects attached to pulleys.", rationale: "The block's weight is still mg." },
        { id: "c", text: "The tension equals the block's weight, so the block barely moves.", misconception: M("tension-equals-weight"), rationale: "If T = mg the block would not accelerate at all." },
        { id: "d", text: "The pulley's mass pulls the block upward.", rationale: "The pulley pulls only through the string tension." },
      ],
      correctChoiceId: "a",
    },
    hints: ["What force spins up the pulley?", "Newton's third law: what does that force do to the block?"],
    solution: r`The string tension provides the torque $TR = I\alpha$ that spins the pulley up. The same tension pulls up on the block, so $mg - T = ma$ gives $a < g$.`,
  }),
  q("ps-check-2", [PS], 2, "disc-pulley-accel", 75, {
    prompt: r`A $1.0${kg}$ block hangs from a string wound around a solid-disc pulley of mass $1.0${kg}$. Using $a = \dfrac{mg}{m + M/2}$, what is the block's acceleration?`,
    body: num(6.53, "m/s²", { abs: 0.03 }, [
      { value: 9.8, misconception: M("ignores-pulley-inertia"), note: "That ignores the pulley. Its rotational inertia reduces the acceleration." },
    ]),
    hints: ["Substitute m = 1.0 kg and M = 1.0 kg.", "The denominator is m + M/2."],
    solution: r`$a = \dfrac{(1.0)(9.8)}{1.0 + 0.50} \approx 6.53${ms2}$.`,
  }),
  q("ps-quiz-1", [PS], 3, "disc-pulley-accel", 90, {
    prompt: r`A $3.0${kg}$ block hangs from a string wound around a solid-disc pulley of mass $2.0${kg}$ and radius $0.15${m}$ on a frictionless axle. What is the block's acceleration?`,
    body: num(7.35, "m/s²", { abs: 0.03 }, [
      { value: 9.8, misconception: M("ignores-pulley-inertia"), note: "The pulley's rotational inertia must be included." },
    ]),
    hints: [r`Combine $mg - T = ma$ with $TR = I\alpha$ and $\alpha = a/R$.`, r`For a disc, $I/R^2 = M/2$; the radius cancels.`],
    solution: r`$a = \dfrac{mg}{m + M/2} = \dfrac{(3.0)(9.8)}{3.0 + 1.0} = 7.35${ms2}$.`,
  }),
  q("ps-test-1", [PS], 4, "tension-value", 120, {
    prompt: r`A $1.5${kg}$ block hangs from a cord wrapped around a wheel of radius $0.15${m}$ and rotational inertia $0.045${kgm2}$ on a frictionless axle. What is the tension in the cord while the block falls?`,
    body: num(8.4, "N", { abs: 0.05 }, [
      { value: 14.7, misconception: M("tension-equals-weight"), note: "That is the block's weight. The block accelerates downward, so the tension is less." },
    ]),
    hints: [r`First find the acceleration: $a = \dfrac{mg}{m + I/R^2}$.`, r`Then use $mg - T = ma$.`],
    solution: r`$\dfrac{I}{R^2} = \dfrac{0.045}{0.0225} = 2.0${kg}$. $a = \dfrac{14.7}{3.5} = 4.2${ms2}$. $T = m(g - a) = (1.5)(5.6) = 8.4${N}$.`,
  }),

  // ───────────────────── AP-style multi-step practice ─────────────────────
  q("exam-1", [RK, LA], 4, "rolling-revolutions", 150, {
    prompt: r`A cyclist accelerates uniformly from rest to $6.0${ms}$ in $4.0${s}$. The bike's wheels have radius $0.30${m}$ and roll without slipping. How many revolutions does each wheel make during these $4.0${s}$?`,
    body: num(6.37, "rev", { abs: 0.05 }, [
      { value: 40, misconception: M("revolutions-not-radians"), note: "40 is the angle in radians. Divide by 2π for revolutions." },
    ]),
    hints: ["Find how far the bike travels.", "Rolling without slipping: distance = rθ. Then convert radians to revolutions."],
    solution: r`Distance: $\Delta x = \tfrac12(0 + 6.0)(4.0) = 12${m}$. Angle: $\theta = \dfrac{\Delta x}{r} = \dfrac{12}{0.30} = 40${rad}$. Revolutions: $\dfrac{40}{2\pi} \approx 6.37$.`,
  }),
  q("exam-2", [PS, RS], 5, "table-pulley", 180, {
    prompt: r`A $3.0${kg}$ block on a frictionless horizontal table is tied to a light string that passes over a pulley at the table's edge to a hanging $2.0${kg}$ block. The pulley is a solid disc of mass $2.0${kg}$ ($I = \tfrac12MR^2$), and the string does not slip. What is the acceleration of the blocks?`,
    body: num(3.27, "m/s²", { abs: 0.03 }, [
      { value: 3.92, misconception: M("ignores-pulley-inertia"), note: "That treats the pulley as massless. Its rotational inertia adds M/2 to the effective mass." },
    ]),
    hints: ["The string has different tensions on the two sides of a pulley with rotational inertia.", r`Write $m_2g - T_2 = m_2a$, $T_1 = m_1a$, and $(T_2 - T_1)R = I\alpha$ with $\alpha = a/R$.`],
    solution: r`Pulley: $(T_2 - T_1) = \tfrac12Ma$. Adding the three equations: $m_2g = (m_1 + m_2 + \tfrac12M)a$, so $a = \dfrac{(2.0)(9.8)}{3.0 + 2.0 + 1.0} \approx 3.27${ms2}$.`,
  }),
  q("exam-3", [SE, TM], 5, "hinge-force", 240, {
    prompt: r`A uniform horizontal beam $4.0${m}$ long weighing $300${N}$ is hinged to a wall at its left end. A $500${N}$ load hangs $3.0${m}$ from the hinge. A cable from the beam's right end runs up to the wall at $37^\circ$ above the horizontal ($\sin 37^\circ = 0.60$, $\cos 37^\circ = 0.80$). What is the **magnitude** of the force the hinge exerts on the beam?`,
    body: num(752, "N", { abs: 4 }),
    hints: ["Find the tension by taking torques about the hinge.", "Then use the horizontal and vertical force conditions to find the hinge components, and combine them."],
    solution: r`Torques about the hinge: $T(4.0)(0.60) = (300)(2.0) + (500)(3.0) = 2100$, so $T = 875${N}$. Horizontal: $H_x = T\cos 37^\circ = 700${N}$. Vertical: $H_y = 800 - T\sin 37^\circ = 800 - 525 = 275${N}$. $|H| = \sqrt{700^2 + 275^2} \approx 752${N}$.`,
  }),
  q("exam-4", [RS, LA, DI], 4, "rope-unwind", 180, {
    prompt: r`A rope is wrapped around a solid cylinder of mass $10${kg}$ and radius $0.30${m}$ ($I = \tfrac12MR^2$) that turns on a frictionless horizontal axle. Starting from rest, the rope is pulled with a constant $15${N}$ force, tangent to the cylinder. How much rope unwinds in the first $3.0${s}$?`,
    body: num(13.5, "m", { abs: 0.1 }),
    hints: ["Find I, the torque and then α.", "Find the angle turned in 3.0 s, then convert it to a length of rope."],
    solution: r`$I = \tfrac12(10)(0.30)^2 = 0.45${kgm2}$; $\tau = (15)(0.30) = 4.5${Nm}$; $\alpha = 10${rps2}$. $\theta = \tfrac12(10)(3.0)^2 = 45${rad}$. Rope: $s = R\theta = (0.30)(45) = 13.5${m}$.`,
  }),
  q("exam-5", [TB, SE], 4, "beam-weight", 180, {
    prompt: r`A uniform metre stick of mass $0.20${kg}$ is balanced on a pivot at its $40${cm}$ mark. A $0.30${kg}$ mass hangs at the $10${cm}$ mark. At which mark must a $0.25${kg}$ mass be hung to keep the stick balanced horizontally?`,
    body: num(68, "cm", { abs: 0.3 }, [
      { value: 76, misconception: M("ignores-beam-weight"), note: "The stick's own weight acts at its 50 cm mark, 10 cm to the right of the pivot, and helps balance the left side." },
    ]),
    hints: ["The stick's weight acts at 50 cm, which is not at the pivot.", "Balance all the torques about the 40 cm mark, then convert the distance to a mark."],
    solution: r`Left: $(0.30)(30) = 9.0${kg}\cdot${cm}$. Right: stick $(0.20)(10) = 2.0$, plus $(0.25)d$. $0.25d = 7.0 \Rightarrow d = 28${cm}$: the $68${cm}$ mark.`,
  }),
  q("exam-6", [RS, IP], 4, "inertia-change", 150, {
    prompt: r`A light rod with two $0.50${kg}$ masses, each $0.40${m}$ from the central axis, is spun up by a net torque of $0.80${Nm}$, giving an angular acceleration of $5.0${rps2}$. The masses are then moved in to $0.20${m}$ from the axis and the same torque is applied. What is the new angular acceleration?`,
    body: num(20, "rad/s²", { abs: 0.1 }, [
      { value: 10, misconception: M("inertia-unsquared"), note: "Halving the distance divides I by 4, not 2." },
      { value: 5, misconception: M("inertia-mass-only"), note: "The masses are unchanged, but moving them inward reduces the rotational inertia." },
    ]),
    hints: [r`Find the new rotational inertia with $I = \sum mr^2$.`, r`Then $\alpha = \tau/I$.`],
    solution: r`New $I = 2(0.50)(0.20)^2 = 0.040${kgm2}$ (it was $0.16${kgm2}$). $\alpha = \dfrac{0.80}{0.040} = 20${rps2}$: four times larger.`,
  }),
  q("exam-7", [CR, RK], 4, "accel-equal", 150, {
    prompt: r`A turntable starts from rest with a constant angular acceleration of $2.0${rps2}$. A coin sits on it $0.15${m}$ from the centre. After how long is the coin's centripetal acceleration equal in size to its tangential acceleration?`,
    body: num(0.707, "s", { abs: 0.01 }),
    hints: [r`Write $a_t = r\alpha$ and $a_c = r\omega^2$, and set them equal.`, r`Find ω, then use $\omega = \alpha t$.`],
    solution: r`$r\omega^2 = r\alpha \Rightarrow \omega^2 = \alpha = 2.0 \Rightarrow \omega \approx 1.41${rps}$. $t = \dfrac{\omega}{\alpha} = \dfrac{1.41}{2.0} \approx 0.71${s}$. (The radius cancels.)`,
  }),
];
