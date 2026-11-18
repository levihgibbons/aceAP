"use client";
/**
 * Markdown note editor with live preview, wiki-link autocomplete and autosave.
 *
 *  - Autosave: a debounced PUT 1s after the last change (POST on the first
 *    save of a new note, then the URL is replaced with the note's own page).
 *    Ctrl/Cmd+S saves immediately. Unsaved work is flushed when leaving.
 *  - `[[` opens suggestions from /api/vault/link-targets (your notes and
 *    curriculum concepts). ↑/↓ choose, Enter/Tab insert, Esc closes.
 *  - The preview renders [[links]] as real links via wikiToMarkdown, using
 *    the server's resolution of the last save plus on-demand lookups.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Bold,
  BookOpen,
  Brackets,
  Check,
  CloudOff,
  Eye,
  FileText,
  Heading2,
  Italic,
  List,
  Loader2,
  PencilLine,
  Sigma,
  SquareSigma,
  Trash2,
} from "lucide-react";
import { Markdown } from "@/components/content/Markdown";
import { Button, Dialog, Input, Kbd, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { normaliseTitle, parseTags, uniqueWikiLinks } from "@/modules/vault/links";
import { vaultFetch, VaultRequestError } from "./client";
import { ShareButton } from "./ShareDialog";
import { TagInput } from "./TagInput";
import {
  WIKI_PROSE_CLASSES,
  lookupFromLinks,
  lookupLink,
  wikiToMarkdown,
  type LinkLookup,
  type StoredLink,
} from "./wiki";

export interface EditorNote {
  id: string | null;
  title: string;
  body: string;
  /** Explicit tags only (tags that come from #hashtags in the body are derived). */
  tags: string[];
  folder: string;
  links: StoredLink[];
  updatedAt: string | null;
}

export interface NoteEditorProps {
  initial: EditorNote;
  folders: string[];
  knownTags: string[];
}

interface Draft {
  title: string;
  body: string;
  tags: string[];
  folder: string;
}

type SaveStatus =
  | { kind: "saved"; at: string | null }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "needs_title" }
  | { kind: "new" }
  | { kind: "error"; message: string };

interface SavedNote {
  id: string;
  href: string;
  title: string;
  updatedAt: string;
  links: StoredLink[];
}

interface Suggestion {
  kind: "note" | "skill" | "new";
  title: string;
  detail: string;
}

const AUTOSAVE_MS = 1000;

type ToolId = "bold" | "italic" | "heading" | "list" | "inline-math" | "display-math" | "wiki";
const TOOLS: { id: ToolId; label: string; shortcut?: string; icon: ReactNode }[] = [
  { id: "bold", label: "Bold", shortcut: "Ctrl+B", icon: <Bold className="size-4" /> },
  { id: "italic", label: "Italic", shortcut: "Ctrl+I", icon: <Italic className="size-4" /> },
  { id: "heading", label: "Heading", icon: <Heading2 className="size-4" /> },
  { id: "list", label: "Bulleted list", icon: <List className="size-4" /> },
  { id: "inline-math", label: "Inline math", icon: <Sigma className="size-4" /> },
  { id: "display-math", label: "Display math", icon: <SquareSigma className="size-4" /> },
  {
    id: "wiki",
    label: "Link a note or concept",
    shortcut: "Ctrl+K",
    icon: <Brackets className="size-4" />,
  },
];

const MIRROR_PROPS = [
  "box-sizing",
  "width",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-style",
  "font-variant",
  "font-weight",
  "font-stretch",
  "font-size",
  "line-height",
  "font-family",
  "text-align",
  "text-transform",
  "text-indent",
  "letter-spacing",
  "word-spacing",
  "tab-size",
];

/** Pixel position of a character offset inside a textarea (mirror-div technique). */
function caretCoords(
  el: HTMLTextAreaElement,
  pos: number,
): { top: number; left: number; lineHeight: number } {
  const cs = window.getComputedStyle(el);
  const div = document.createElement("div");
  for (const p of MIRROR_PROPS) div.style.setProperty(p, cs.getPropertyValue(p));
  Object.assign(div.style, {
    position: "absolute",
    visibility: "hidden",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    top: "0",
    left: "-9999px",
    height: "auto",
  });
  div.textContent = el.value.slice(0, pos);
  const span = document.createElement("span");
  span.textContent = el.value.slice(pos) || ".";
  div.appendChild(span);
  document.body.appendChild(div);
  const lineHeight = parseFloat(cs.lineHeight) || 24;
  const top = span.offsetTop - el.scrollTop;
  const left = span.offsetLeft - el.scrollLeft;
  document.body.removeChild(div);
  return { top, left, lineHeight };
}

function findLinkQuery(value: string, caret: number): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const open = before.lastIndexOf("[[");
  if (open < 0) return null;
  const query = before.slice(open + 2);
  if (/[[\]\n|]/.test(query) || query.length > 80) return null;
  return { start: open, query };
}

export function NoteEditor({ initial, folders, knownTags }: NoteEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const uid = useId();
  const ids = {
    title: `${uid}-title`,
    titleError: `${uid}-title-error`,
    folder: `${uid}-folder`,
    folders: `${uid}-folders`,
    tags: `${uid}-tags`,
    body: `${uid}-body`,
    list: `${uid}-ac`,
    help: `${uid}-help`,
  };

  const [noteId, setNoteId] = useState<string | null>(initial.id);
  const [draft, setDraft] = useState<Draft>({
    title: initial.title,
    body: initial.body,
    tags: initial.tags,
    folder: initial.folder,
  });
  const [links, setLinks] = useState<StoredLink[]>(initial.links);
  const [status, setStatus] = useState<SaveStatus>(
    initial.id
      ? { kind: "saved", at: initial.updatedAt }
      : { kind: initial.title.trim() ? "new" : "needs_title" },
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [view, setView] = useState<"write" | "preview">("write");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Refs used by timers/handlers so they always see the latest values.
  const latest = useRef<Draft>(draft);
  const idRef = useRef<string | null>(initial.id);
  const version = useRef(initial.id ? 0 : initial.title.trim() || initial.body ? 1 : 0);
  const savedVersion = useRef(0);
  const saving = useRef(false);
  const again = useRef(false);
  const timer = useRef<number | null>(null);
  const manual = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<[number, number] | null>(null);
  const saveRef = useRef<() => Promise<void>>(async () => undefined);

  // ───────────────────────────── saving ─────────────────────────────────────

  const save = useCallback(async () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (saving.current) {
      again.current = true;
      return;
    }
    const data = latest.current;
    if (!data.title.trim()) {
      setStatus({ kind: "needs_title" });
      return;
    }
    const v = version.current;
    if (idRef.current && v === savedVersion.current) {
      setStatus((s) => (s.kind === "saved" ? s : { kind: "saved", at: null }));
      return;
    }
    saving.current = true;
    setStatus({ kind: "saving" });
    try {
      const payload = { title: data.title, body: data.body, tags: data.tags, folder: data.folder };
      let note: SavedNote;
      if (!idRef.current) {
        note = (
          await vaultFetch<{ note: SavedNote }>("/api/vault/notes", {
            method: "POST",
            json: payload,
          })
        ).note;
        idRef.current = note.id;
        setNoteId(note.id);
        window.history.replaceState(null, "", note.href);
      } else {
        note = (
          await vaultFetch<{ note: SavedNote }>(`/api/vault/notes/${idRef.current}`, {
            method: "PUT",
            json: payload,
          })
        ).note;
      }
      savedVersion.current = v;
      setLinks(note.links);
      setTitleError(null);
      setStatus(version.current === v ? { kind: "saved", at: note.updatedAt } : { kind: "dirty" });
      if (manual.current) setAnnounce("Note saved.");
      manual.current = false;
    } catch (e) {
      const err = e instanceof VaultRequestError ? e : null;
      const message = e instanceof Error ? e.message : "Couldn't save.";
      if (err?.status === 409 || (err?.status === 422 && /title/i.test(message)))
        setTitleError(message);
      setStatus({ kind: "error", message });
      setAnnounce(`Not saved: ${message}`);
      again.current = false;
      manual.current = false;
      return;
    } finally {
      saving.current = false;
    }
    if (again.current || version.current !== savedVersion.current) {
      again.current = false;
      timer.current = window.setTimeout(() => void saveRef.current(), AUTOSAVE_MS);
    }
  }, []);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const change = useCallback(
    (patch: Partial<Draft>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      version.current += 1;
      setDraft(next);
      if ("title" in patch) setTitleError(null);
      if (!next.title.trim()) {
        setStatus({ kind: "needs_title" });
        return;
      }
      setStatus((s) => (s.kind === "saving" ? s : { kind: "dirty" }));
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void save(), AUTOSAVE_MS);
    },
    [save],
  );

  const saveNow = useCallback(() => {
    manual.current = true;
    if (!latest.current.title.trim()) {
      setStatus({ kind: "needs_title" });
      setAnnounce("Add a title to save this note.");
      document.getElementById(ids.title)?.focus();
      return;
    }
    void save();
  }, [save, ids.title]);

  // Ctrl/Cmd+S anywhere on the page.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);

  // Warn before closing the tab with unsaved work; flush on in-app navigation.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (version.current !== savedVersion.current && latest.current.title.trim()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    const timers = timer;
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timers.current) window.clearTimeout(timers.current);
      const data = latest.current;
      if (idRef.current && version.current !== savedVersion.current && data.title.trim()) {
        void fetch(`/api/vault/notes/${idRef.current}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            body: data.body,
            tags: data.tags,
            folder: data.folder,
          }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
  }, []);

  // ─────────────────────────── text editing ─────────────────────────────────

  useLayoutEffect(() => {
    const sel = pendingSelection.current;
    const el = textarea.current;
    if (sel && el) {
      el.focus();
      el.setSelectionRange(sel[0], sel[1]);
      pendingSelection.current = null;
    }
  }, [draft.body]);

  const setBody = (body: string, selStart: number, selEnd = selStart) => {
    pendingSelection.current = [selStart, selEnd];
    change({ body });
  };

  const wrap = (before: string, after: string, placeholder: string) => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || placeholder;
    setBody(
      value.slice(0, s) + before + selected + after + value.slice(e),
      s + before.length,
      s + before.length + selected.length,
    );
  };

  const prefixLines = (prefix: string) => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const lineEnd = value.indexOf("\n", e) === -1 ? value.length : value.indexOf("\n", e);
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const allHave = lines.every((l) => l.startsWith(prefix));
    const next = lines
      .map((l) => (allHave ? l.slice(prefix.length) : prefix + l.replace(/^(#{1,6} |- |\* )/, "")))
      .join("\n");
    setBody(
      value.slice(0, lineStart) + next + value.slice(lineEnd),
      lineStart,
      lineStart + next.length,
    );
  };

  const displayMath = () => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const inner = value.slice(s, e) || "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}";
    const lead = s > 0 && value[s - 1] !== "\n" ? "\n\n" : "";
    const block = `${lead}$$\n${inner}\n$$\n`;
    setBody(
      value.slice(0, s) + block + value.slice(e),
      s + lead.length + 3,
      s + lead.length + 3 + inner.length,
    );
  };

  // ──────────────────────────── autocomplete ────────────────────────────────

  const [ac, setAc] = useState<{
    start: number;
    query: string;
    items: Suggestion[];
    active: number;
    top: number;
    left: number;
    loading: boolean;
  } | null>(null);
  const acAbort = useRef<AbortController | null>(null);
  const acTimer = useRef<number | null>(null);

  const closeAc = () => {
    acAbort.current?.abort();
    if (acTimer.current) window.clearTimeout(acTimer.current);
    setAc(null);
  };

  const updateAc = (value: string, caret: number) => {
    const el = textarea.current;
    const found = findLinkQuery(value, caret);
    if (!el || !found) {
      if (acTimer.current) window.clearTimeout(acTimer.current);
      acAbort.current?.abort();
      setAc(null);
      return;
    }
    const c = caretCoords(el, found.start);
    const maxLeft = Math.max(0, el.clientWidth - 296);
    const top = el.offsetTop + c.top + c.lineHeight + 4;
    const left = el.offsetLeft + Math.min(Math.max(0, c.left), maxLeft);
    setAc((prev) => ({
      start: found.start,
      query: found.query,
      items: prev?.query === found.query ? prev.items : (prev?.items ?? []),
      active: 0,
      top,
      left,
      loading: true,
    }));
    if (acTimer.current) window.clearTimeout(acTimer.current);
    acTimer.current = window.setTimeout(async () => {
      acAbort.current?.abort();
      const ctrl = new AbortController();
      acAbort.current = ctrl;
      try {
        const res = await vaultFetch<{
          notes: { id: string; title: string; folder: string }[];
          skills: { id: string; name: string; courseName: string }[];
        }>(`/api/vault/link-targets?q=${encodeURIComponent(found.query.trim())}`, {
          signal: ctrl.signal,
        });
        const own = normaliseTitle(latest.current.title);
        const items: Suggestion[] = [
          ...res.notes
            .filter((n) => normaliseTitle(n.title) !== own)
            .map((n) => ({
              kind: "note" as const,
              title: n.title,
              detail: n.folder ? `Note · ${n.folder}` : "Note",
            })),
          ...res.skills.map((s) => ({
            kind: "skill" as const,
            title: s.name,
            detail: `Concept · ${s.courseName}`,
          })),
        ];
        const q = found.query.trim();
        if (
          q &&
          !items.some((i) => normaliseTitle(i.title) === normaliseTitle(q)) &&
          !/[#^]/.test(q)
        )
          items.push({ kind: "new", title: q, detail: "New note — link now, write it later" });
        setAc((prev) =>
          prev && prev.query === found.query ? { ...prev, items, active: 0, loading: false } : prev,
        );
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setAc((prev) => (prev ? { ...prev, items: [], loading: false } : prev));
      }
    }, 120);
  };

  const insertLink = (title: string) => {
    const el = textarea.current;
    if (!el || !ac) return;
    const caret = el.selectionStart;
    const value = el.value;
    const closing = value.slice(caret).startsWith("]]") ? 2 : 0;
    const next = `${value.slice(0, ac.start)}[[${title}]]${value.slice(caret + closing)}`;
    const pos = ac.start + title.length + 4;
    closeAc();
    setBody(next, pos);
  };

  const onTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (ac && ac.items.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const d = e.key === "ArrowDown" ? 1 : -1;
        setAc({ ...ac, active: (ac.active + d + ac.items.length) % ac.items.length });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertLink(ac.items[ac.active].title);
        return;
      }
    }
    if (ac && e.key === "Escape") {
      e.preventDefault();
      closeAc();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "b") {
        e.preventDefault();
        wrap("**", "**", "bold text");
      } else if (k === "i") {
        e.preventDefault();
        wrap("_", "_", "italic text");
      } else if (k === "k") {
        e.preventDefault();
        startWikiLink();
      }
    }
  };

  const startWikiLink = () => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e);
    const next = `${value.slice(0, s)}[[${selected}]]${value.slice(e)}`;
    const caret = s + 2 + selected.length;
    setBody(next, caret);
    window.requestAnimationFrame(() => updateAc(next, caret));
  };

  // ───────────────────────────── preview ────────────────────────────────────

  const deferredBody = useDeferredValue(draft.body);
  const [resolved, setResolved] = useState<LinkLookup>(() => new Map());
  const lookup = useMemo(() => {
    const m: LinkLookup = new Map(resolved);
    for (const [k, v] of lookupFromLinks(links)) m.set(k, v);
    return m;
  }, [resolved, links]);
  const previewMd = useMemo(() => wikiToMarkdown(deferredBody, lookup), [deferredBody, lookup]);
  const bodyTags = useMemo(() => parseTags(deferredBody), [deferredBody]);

  useEffect(() => {
    const unknown = uniqueWikiLinks(deferredBody)
      .filter((l) => !lookupLink(lookup, l))
      .map((l) => l.target)
      .slice(0, 30);
    if (unknown.length === 0) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const qs = new URLSearchParams(unknown.map((u) => ["resolve", u]));
        const res = await vaultFetch<{
          resolved: {
            key: string;
            type: "note" | "skill" | "unresolved";
            id: string;
            title: string;
            href: string | null;
          }[];
        }>(`/api/vault/link-targets?${qs.toString()}`, { signal: ctrl.signal });
        setResolved((prev) => {
          const m = new Map(prev);
          for (const r of res.resolved)
            m.set(r.key, { type: r.type, id: r.id, title: r.title, href: r.href });
          return m;
        });
      } catch {
        // Preview falls back to "unresolved" styling; saving still resolves links on the server.
      }
    }, 400);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [deferredBody, lookup]);

  // ───────────────────────────── delete ─────────────────────────────────────

  const onDelete = async () => {
    if (!idRef.current) return;
    setDeleting(true);
    try {
      await vaultFetch(`/api/vault/notes/${idRef.current}`, { method: "DELETE" });
      savedVersion.current = version.current;
      idRef.current = null;
      toast({
        title: "Note deleted",
        description: `“${latest.current.title}” was deleted.`,
        tone: "neutral",
      });
      router.push("/app/vault");
    } catch (e) {
      setDeleting(false);
      setConfirmDelete(false);
      toast({
        title: "Couldn't delete the note",
        description: e instanceof Error ? e.message : undefined,
        tone: "bad",
      });
    }
  };

  // ───────────────────────────── toolbar ────────────────────────────────────

  const runTool = (id: ToolId) => {
    if (id === "bold") wrap("**", "**", "bold text");
    else if (id === "italic") wrap("_", "_", "italic text");
    else if (id === "heading") prefixLines("## ");
    else if (id === "list") prefixLines("- ");
    else if (id === "inline-math") wrap("$", "$", "x^2");
    else if (id === "display-math") displayMath();
    else startWikiLink();
  };
  const tools = TOOLS;
  const [toolIndex, setToolIndex] = useState(0);
  const onToolbarKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (toolIndex + 1) % tools.length;
    else if (e.key === "ArrowLeft") next = (toolIndex - 1 + tools.length) % tools.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tools.length - 1;
    if (next >= 0) {
      e.preventDefault();
      setToolIndex(next);
      e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
    }
  };

  const activeOptionId = ac && ac.items.length ? `${ids.list}-${ac.active}` : undefined;

  return (
    <div className="space-y-4">
      {/* Status + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SaveIndicator status={status} onRetry={saveNow} />
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton
            noteId={noteId}
            noteTitle={draft.title}
            disabledReason="Save the note first (give it a title)."
          />
          {noteId ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 aria-hidden="true" className="size-4" />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          ) : null}
          <Link
            href={noteId ? `/app/vault?note=${noteId}` : "/app/vault"}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-medium text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <BookOpen aria-hidden="true" className="size-4" />
            {noteId ? "Open in vault" : "Back to vault"}
          </Link>
        </div>
      </div>

      {/* Title / folder / tags */}
      <div className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
        <label htmlFor={ids.title} className="sr-only">
          Title
        </label>
        <input
          id={ids.title}
          value={draft.title}
          onChange={(e) => change({ title: e.target.value })}
          placeholder="Untitled note"
          maxLength={200}
          autoFocus={!initial.id && !initial.title}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? ids.titleError : undefined}
          className="w-full rounded-md bg-transparent font-display text-2xl font-semibold tracking-[-0.015em] text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:text-[1.75rem]"
        />
        {titleError ? (
          <p id={ids.titleError} role="alert" className="mt-1 text-sm font-medium text-bad">
            {titleError}
          </p>
        ) : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <label htmlFor={ids.folder} className="block text-sm font-medium text-ink">
              Folder
            </label>
            <Input
              id={ids.folder}
              value={draft.folder}
              list={folders.length ? ids.folders : undefined}
              onChange={(e) => change({ folder: e.target.value })}
              placeholder="e.g. Calculus/Unit 2"
              maxLength={200}
            />
            {folders.length ? (
              <datalist id={ids.folders}>
                {folders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label htmlFor={ids.tags} className="block text-sm font-medium text-ink">
              Tags
            </label>
            <TagInput
              id={ids.tags}
              tags={draft.tags}
              onChange={(tags) => change({ tags })}
              suggestions={knownTags}
              bodyTags={bodyTags}
            />
          </div>
        </div>
      </div>

      {/* Editor + preview */}
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-2 py-1.5">
          <div
            role="toolbar"
            aria-label="Formatting"
            aria-controls={ids.body}
            onKeyDown={onToolbarKey}
            className="flex flex-wrap items-center gap-0.5"
          >
            {tools.map((t, i) => (
              <button
                key={t.id}
                type="button"
                tabIndex={i === toolIndex ? 0 : -1}
                onFocus={() => setToolIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setView("write");
                  runTool(t.id);
                }}
                aria-label={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
                title={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
                className="inline-flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-sunken hover:text-ink"
              >
                <span aria-hidden="true">{t.icon}</span>
              </button>
            ))}
          </div>
          <div
            role="group"
            aria-label="Editor view"
            className="inline-flex rounded-lg border border-line-strong bg-surface p-0.5 lg:hidden"
          >
            {(
              [
                { id: "write", label: "Write", icon: PencilLine },
                { id: "preview", label: "Preview", icon: Eye },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium",
                  view === v.id ? "bg-accent-soft text-accent-ink" : "text-muted hover:text-ink",
                )}
              >
                <v.icon aria-hidden="true" className="size-3.5" />
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-line">
          <div className={cn("relative", view === "preview" && "hidden lg:block")}>
            <label htmlFor={ids.body} className="sr-only">
              Note text (Markdown)
            </label>
            <textarea
              ref={textarea}
              id={ids.body}
              value={draft.body}
              onChange={(e) => {
                change({ body: e.target.value });
                updateAc(e.target.value, e.target.selectionStart);
              }}
              onKeyDown={onTextareaKeyDown}
              onClick={(e) => updateAc(e.currentTarget.value, e.currentTarget.selectionStart)}
              onBlur={() => window.setTimeout(() => setAc(null), 150)}
              spellCheck
              placeholder={
                "Write in Markdown. Type [[ to link a note or concept, #tag to tag, $x^2$ for math."
              }
              aria-describedby={ids.help}
              aria-autocomplete="list"
              aria-controls={ac ? ids.list : undefined}
              aria-activedescendant={activeOptionId}
              className="block min-h-[50vh] w-full resize-y bg-surface px-4 py-4 font-mono text-[0.875rem] leading-relaxed text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent lg:min-h-[62vh]"
            />
            {ac ? (
              <div
                style={{ top: ac.top, left: ac.left }}
                className="absolute z-20 w-72 overflow-hidden rounded-lg border border-line bg-surface shadow-overlay"
              >
                <ul
                  id={ids.list}
                  role="listbox"
                  aria-label="Link suggestions"
                  className="max-h-64 overflow-y-auto py-1"
                >
                  {ac.items.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-muted">
                      {ac.loading ? "Searching…" : "No matches. Keep typing a title."}
                    </li>
                  ) : (
                    ac.items.map((s, i) => (
                      <li
                        key={`${s.kind}-${s.title}`}
                        id={`${ids.list}-${i}`}
                        role="option"
                        aria-selected={i === ac.active}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertLink(s.title);
                        }}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 px-3 py-1.5",
                          i === ac.active ? "bg-accent-soft" : "hover:bg-surface-2",
                        )}
                      >
                        <span aria-hidden="true" className="mt-0.5 text-muted">
                          {s.kind === "skill" ? (
                            <Brackets className="size-3.5" />
                          ) : s.kind === "note" ? (
                            <FileText className="size-3.5" />
                          ) : (
                            <PencilLine className="size-3.5" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">
                            {s.title}
                          </span>
                          <span className="block truncate text-xs text-muted">{s.detail}</span>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}
          </div>
          <section
            aria-label="Preview"
            className={cn(
              "min-h-[50vh] bg-surface-2/60 px-5 py-4 lg:min-h-[62vh]",
              view === "write" && "hidden lg:block",
            )}
          >
            <p
              aria-hidden="true"
              className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-faint"
            >
              Preview
            </p>
            {deferredBody.trim() ? (
              <Markdown className={cn("text-[1rem]", WIKI_PROSE_CLASSES)}>{previewMd}</Markdown>
            ) : (
              <p className="text-sm text-muted">Nothing to preview yet.</p>
            )}
          </section>
        </div>
        <p
          id={ids.help}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-surface-2 px-4 py-2 text-xs text-muted"
        >
          <span>
            <Kbd>[[</Kbd> link a note or concept
          </span>
          <span>
            <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save now
          </span>
          <span>
            <code className="font-mono">$x^2$</code> inline math ·{" "}
            <code className="font-mono">$$…$$</code> display
          </span>
          <span>Changes save automatically.</span>
        </p>
      </div>

      <div aria-live="polite" role="status" className="sr-only">
        {announce}
      </div>
      <div aria-live="polite" className="sr-only">
        {ac && !ac.loading
          ? `${ac.items.length} ${ac.items.length === 1 ? "suggestion" : "suggestions"}. Use the arrow keys, then Enter to insert.`
          : ""}
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this note?"
        size="sm"
        description={`“${draft.title || "Untitled note"}” will be permanently deleted.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => void onDelete()}>
              Delete note
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-2">
          Links to it from your other notes will show as not-yet-created links. If you shared it
          with a class, your teacher will no longer see it. This can&apos;t be undone.
        </p>
      </Dialog>
    </div>
  );
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const base = "inline-flex items-center gap-1.5 text-[0.8125rem]";
  switch (status.kind) {
    case "saved":
      return (
        <p className={cn(base, "text-muted")}>
          <Check aria-hidden="true" className="size-4 text-good" />
          Saved
          {status.at ? (
            <span className="text-faint">
              ·{" "}
              {new Date(status.at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          ) : null}
        </p>
      );
    case "saving":
      return (
        <p className={cn(base, "text-muted")}>
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Saving…
        </p>
      );
    case "dirty":
      return <p className={cn(base, "text-muted")}>Unsaved changes</p>;
    case "needs_title":
      return <p className={cn(base, "text-warn")}>Add a title to save</p>;
    case "new":
      return <p className={cn(base, "text-muted")}>Not saved yet — it saves as you write</p>;
    case "error":
      return (
        <div className={cn(base, "flex-wrap text-bad")}>
          <CloudOff aria-hidden="true" className="size-4" />
          <span className="font-medium">Unsaved —</span>
          <button
            type="button"
            onClick={onRetry}
            className="font-medium underline underline-offset-4"
          >
            retry
          </button>
          <span className="text-muted">({status.message})</span>
        </div>
      );
  }
}
