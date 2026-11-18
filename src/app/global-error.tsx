"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <main style={{ maxWidth: "28rem", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>AceAP couldn&apos;t load</h1>
          <p>Something went wrong while loading the app. Your saved work is safe.</p>
          <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.6rem 1rem", borderRadius: "0.6rem", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
