import { Compass } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4">
      <EmptyState
        icon={<Compass className="size-6" aria-hidden />}
        title="We couldn't find that page"
        description="It may have moved, or you may not have access to it."
        action={<ButtonLink href="/">Back to AceAP</ButtonLink>}
      />
    </main>
  );
}
