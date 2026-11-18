/** Skills a lesson teaches and the skills it builds on, each with the student's current level. Server Component. */
import Link from "next/link";
import { MasteryBadge } from "@/components/ui";
import type { MasteryLevel } from "@/modules/mastery/types";

export interface SkillChip {
  id: string;
  name: string;
  level: MasteryLevel;
  needsReview: boolean;
}

function SkillList({ skills }: { skills: SkillChip[] }) {
  return (
    <ul className="space-y-2">
      {skills.map((s) => (
        <li key={s.id} className="rounded-lg border border-line bg-surface px-3 py-2.5">
          <Link href={`/app/skills/${s.id}`} className="block text-sm font-medium leading-snug text-ink underline-offset-4 hover:underline">
            {s.name}
          </Link>
          <div className="mt-1.5">
            <MasteryBadge level={s.level} needsReview={s.needsReview} size="sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RelatedSkills({ taught, buildsOn }: { taught: SkillChip[]; buildsOn: SkillChip[] }) {
  return (
    <section aria-labelledby="related-skills-title" className="space-y-4">
      <div>
        <h2 id="related-skills-title" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Related skills
        </h2>
        <p className="mt-1 text-xs text-muted">Levels change only when you answer questions.</p>
      </div>
      {taught.length ? (
        <div>
          <p className="mb-2 text-xs font-medium text-ink-2">Taught in this lesson</p>
          <SkillList skills={taught} />
        </div>
      ) : (
        <p className="text-sm text-muted">This lesson isn&apos;t linked to specific skills.</p>
      )}
      {buildsOn.length ? (
        <div>
          <p className="mb-2 text-xs font-medium text-ink-2">Builds on</p>
          <SkillList skills={buildsOn} />
        </div>
      ) : null}
    </section>
  );
}
