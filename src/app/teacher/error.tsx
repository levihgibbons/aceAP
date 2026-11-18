"use client";

import { SegmentError } from "@/components/shell/SegmentError";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return <SegmentError error={error} retry={retry} homeHref="/teacher" />;
}
