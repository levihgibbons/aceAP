/**
 * Sub-navigation shared by the vault pages (server component).
 */
import { TabLinks } from "@/components/ui";

export function VaultNav({ current }: { current: "notes" | "graph" | "export" }) {
  return (
    <TabLinks
      label="Knowledge vault sections"
      current={current}
      className="mb-6"
      items={[
        { id: "notes", label: "Notes", href: "/app/vault" },
        { id: "graph", label: "Graph", href: "/app/vault/graph" },
        { id: "export", label: "Export", href: "/app/vault/export" },
      ]}
    />
  );
}
