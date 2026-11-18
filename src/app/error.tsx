"use client";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4">
      <ErrorState
        title="Something went wrong"
        description="This page couldn't load. Your saved work is safe — try again, or come back in a moment."
        retry={reset}
      />
    </main>
  );
}
