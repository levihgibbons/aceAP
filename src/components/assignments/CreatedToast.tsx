"use client";
/** Shows the "Assigned to N students" confirmation once after a redirect, then cleans the URL. */
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui";

export function CreatedToast({ assignedTo }: { assignedTo: number | null }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);
  useEffect(() => {
    if (assignedTo === null || shown.current) return;
    shown.current = true;
    toast({
      title: "Assignment created",
      description:
        assignedTo === 0
          ? "No students are in the class yet; it will reach them when they join."
          : `Assigned to ${assignedTo} student${assignedTo === 1 ? "" : "s"}.`,
      tone: "good",
    });
    router.replace(pathname, { scroll: false });
  }, [assignedTo, pathname, router, toast]);
  return null;
}
