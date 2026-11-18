import type { Metadata } from "next";
import { School } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { NewClassForm, type CourseGroup } from "@/components/teacher/NewClassForm";
import { categoryLabel } from "@/components/teacher/format";
import { getDb } from "@/db/client";
import { requireStaff } from "@/modules/auth/session";
import { staffOrganizations } from "@/modules/classrooms/service";
import { CONTENT_STATUS_LABEL, getCatalog } from "@/modules/curriculum/queries";

export const metadata: Metadata = { title: "New class" };

const STATUS_ORDER: Record<string, number> = { complete: 0, pilot_available: 1, lessons_in_development: 2, outline_available: 3, catalog_only: 4 };

export default async function NewClassPage() {
  const user = await requireStaff();
  const [catalog, orgs] = await Promise.all([getCatalog(), getDb().then((db) => staffOrganizations(db, user.id))]);

  const groups = new Map<string, CourseGroup>();
  for (const c of catalog) {
    if (c.availability !== "active") continue;
    const g = groups.get(c.category) ?? { category: c.category, label: categoryLabel(c.category), courses: [] };
    const status = CONTENT_STATUS_LABEL[c.contentStatus];
    g.courses.push({ id: c.id, name: c.name, status: c.contentStatus, statusLabel: status.label, statusDescription: status.description });
    groups.set(c.category, g);
  }
  for (const g of groups.values()) g.courses.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || a.name.localeCompare(b.name));
  const organizations = [...new Map(orgs.map((o) => [o.id, { id: o.id, name: o.name }])).values()];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Classes", href: "/teacher/classes" }, { label: "New class" }]}
        title="Create a class"
        description="Pick the AP course you teach. Pilot courses have complete, assessed lessons; outline-only courses list the official units but no lessons yet."
      />
      {organizations.length === 0 ? (
        <EmptyState
          icon={<School />}
          title="You’re not linked to a school yet"
          description="Classes belong to a school or organisation. Ask your school administrator to add you as a teacher, then come back to create a class."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Card>
            <NewClassForm groups={[...groups.values()]} organizations={organizations} />
          </Card>
          <aside className="space-y-4 text-sm text-muted">
            <h2 className="font-display text-base font-semibold text-ink">What the statuses mean</h2>
            <dl className="space-y-3">
              {Object.entries(CONTENT_STATUS_LABEL)
                .sort(([a], [b]) => (STATUS_ORDER[a] ?? 9) - (STATUS_ORDER[b] ?? 9))
                .map(([key, s]) => (
                  <div key={key}>
                    <dt className="font-medium text-ink-2">{s.label}</dt>
                    <dd>{s.description}</dd>
                  </div>
                ))}
            </dl>
          </aside>
        </div>
      )}
    </>
  );
}
