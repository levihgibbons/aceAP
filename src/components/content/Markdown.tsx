/**
 * Markdown — the single renderer for authored/learner Markdown with math.
 *   <Markdown>{lesson.body}</Markdown>                 (long-form, .prose-lesson)
 *   <Markdown compact>{question.prompt}</Markdown>     (.prose-compact)
 *   <InlineMarkdown>{choice.text}</InlineMarkdown>     (no wrapping <p>; for short strings)
 *
 * - GFM (tables, strikethrough, task lists) + $inline$ / $$display$$ math via KaTeX.
 * - KaTeX runs with strict: "ignore" and throwOnError: false, so a malformed
 *   formula renders as its source instead of breaking the page.
 * - Raw HTML is NOT rendered (no rehype-raw); unsafe URLs are stripped by
 *   react-markdown's default urlTransform.
 * - External links open in a new tab with rel="noopener noreferrer".
 * No hooks and no "use client": works in Server and Client Components.
 */
import Link from "next/link";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/cn";

const remarkPlugins: Options["remarkPlugins"] = [remarkGfm, remarkMath];
const rehypePlugins: Options["rehypePlugins"] = [[rehypeKatex, { strict: "ignore", throwOnError: false, output: "htmlAndMathml" }]];

const isExternal = (href: string) => /^(https?:)?\/\//i.test(href) || /^mailto:/i.test(href);

const baseComponents: Components = {
  a({ href, children, node: _node, ...rest }) {
    void _node;
    if (!href) return <span>{children}</span>;
    if (isExternal(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
          {children}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    }
    if (href.startsWith("/")) {
      return (
        <Link href={href} {...rest}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
  table({ children, node: _node, ...rest }) {
    void _node;
    return (
      <div className="overflow-x-auto">
        <table {...rest}>{children}</table>
      </div>
    );
  },
  img({ src, alt, node: _node, ...rest }) {
    void _node;
    if (!src || typeof src !== "string") return null;
    // eslint-disable-next-line @next/next/no-img-element -- authored content images have unknown dimensions
    return <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className="h-auto max-w-full rounded-lg" {...rest} />;
  },
};

export interface MarkdownProps {
  children: string;
  compact?: boolean;
  className?: string;
}

export function Markdown({ children, compact = false, className }: MarkdownProps) {
  return (
    <div className={cn(compact ? "prose-lesson prose-compact" : "prose-lesson", className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={baseComponents} skipHtml>
        {children ?? ""}
      </ReactMarkdown>
    </div>
  );
}

const inlineComponents: Components = {
  ...baseComponents,
  p({ children }) {
    return <>{children}</>;
  },
};

/** Short strings (choices, labels): renders inline — no wrapping <p>. */
export function InlineMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("[&_code]:rounded [&_code]:bg-sunken [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em]", className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={inlineComponents} skipHtml>
        {children ?? ""}
      </ReactMarkdown>
    </span>
  );
}

export default Markdown;
