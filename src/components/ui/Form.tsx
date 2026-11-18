/**
 * Form controls. All are native elements (they work without JavaScript and in
 * Server Components) styled with the design tokens.
 *   <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} hint="Your school email">
 *     <Input id="email" name="email" type="email" autoComplete="email" required />
 *   </Field>
 * Field wires up aria-describedby / aria-invalid on its single child control.
 *   <Select id="unit" name="unit"><option>…</option></Select>
 *   <Checkbox name="notify" label="Email me" description="…" />
 *   <Switch name="published" label="Published" defaultChecked />
 *   <RadioGroup name="role" legend="I am a…" options={[{ value: "student", label: "Student" }]} defaultValue="student" />
 */
import { Children, cloneElement, isValidElement, useId, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const CONTROL =
  "block w-full rounded-lg border border-line-strong bg-surface px-3 text-[0.9375rem] text-ink shadow-card transition-colors placeholder:text-faint hover:border-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted aria-[invalid=true]:border-bad";

export interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Visually hide the label (it stays accessible). */
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

interface DescribableProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

export function Field({ label, htmlFor, hint, error, required, hideLabel, className, children }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const only = Children.count(children) === 1 ? Children.only(children) : null;
  const control =
    only && isValidElement<DescribableProps>(only)
      ? cloneElement(only as ReactElement<DescribableProps>, {
          "aria-describedby": [only.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
          "aria-invalid": error ? true : only.props["aria-invalid"],
        })
      : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className={cn("block text-sm font-medium text-ink", hideLabel && "sr-only")}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-bad">
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {hint && error ? (
        <p id={hintId} className="sr-only">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends ComponentProps<"input"> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...rest }: InputProps) {
  return <input className={cn(CONTROL, "h-10", className)} {...rest} aria-invalid={invalid || rest["aria-invalid"] || undefined} />;
}

export interface TextareaProps extends ComponentProps<"textarea"> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, rows = 4, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(CONTROL, "min-h-20 py-2 leading-relaxed", className)}
      {...rest}
      aria-invalid={invalid || rest["aria-invalid"] || undefined}
    />
  );
}

export interface SelectProps extends ComponentProps<"select"> {
  invalid?: boolean;
}

export function Select({ className, invalid, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(CONTROL, "h-10 appearance-none pr-9", className)}
        {...rest}
        aria-invalid={invalid || rest["aria-invalid"] || undefined}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ label, description, id, className, ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={inputId}
        type="checkbox"
        aria-describedby={descId}
        className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded border-line-strong accent-accent disabled:cursor-not-allowed"
        {...rest}
      />
      <div className="min-w-0 text-sm">
        <label htmlFor={inputId} className="cursor-pointer font-medium text-ink">
          {label}
        </label>
        {description ? (
          <p id={descId} className="mt-0.5 text-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export interface SwitchProps extends Omit<ComponentProps<"input">, "type" | "role"> {
  label: ReactNode;
  description?: ReactNode;
  /** Put the label before the switch. */
  labelFirst?: boolean;
}

/** A real checkbox exposed as role="switch". */
export function Switch({ label, description, id, className, labelFirst = false, ...rest }: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = description ? `${inputId}-desc` : undefined;
  const control = (
    <span className="relative inline-flex h-6 w-10 shrink-0">
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        aria-describedby={descId}
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
        {...rest}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full border border-line-strong bg-sunken transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:opacity-50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow-card transition-transform peer-checked:translate-x-4"
      />
    </span>
  );
  return (
    <div className={cn("flex items-start gap-3", labelFirst && "flex-row-reverse justify-between", className)}>
      {control}
      <div className="min-w-0 text-sm">
        <label htmlFor={inputId} className="cursor-pointer font-medium text-ink">
          {label}
        </label>
        {description ? (
          <p id={descId} className="mt-0.5 text-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  legend: ReactNode;
  options: RadioOption[];
  defaultValue?: string;
  /** Controlled value (pair with onChange in a Client Component). */
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: ReactNode;
  hideLegend?: boolean;
  /** "cards" renders each option as a selectable tile. */
  variant?: "list" | "cards";
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function RadioGroup({
  name,
  legend,
  options,
  defaultValue,
  value,
  onChange,
  required,
  error,
  hideLegend,
  variant = "list",
  orientation = "vertical",
  className,
}: RadioGroupProps) {
  const groupId = useId();
  const errorId = error ? `${groupId}-error` : undefined;
  return (
    <fieldset className={cn("min-w-0", className)} aria-describedby={errorId} aria-invalid={error ? true : undefined}>
      <legend className={cn("mb-2 text-sm font-medium text-ink", hideLegend && "sr-only")}>{legend}</legend>
      <div className={cn("grid gap-2", orientation === "horizontal" && "sm:grid-flow-col sm:auto-cols-fr")}>
        {options.map((opt, i) => {
          const id = `${groupId}-${i}`;
          const descId = opt.description ? `${id}-desc` : undefined;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-start gap-3 text-sm",
                variant === "cards" &&
                  "rounded-lg border border-line-strong bg-surface p-3 transition-colors hover:border-faint has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
                opt.disabled && "cursor-not-allowed opacity-55",
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={opt.value}
                disabled={opt.disabled}
                required={required}
                aria-describedby={descId}
                {...(value !== undefined
                  ? { checked: value === opt.value, onChange: () => onChange?.(opt.value) }
                  : { defaultChecked: defaultValue === opt.value })}
                className={cn("mt-0.5 size-4 shrink-0 accent-accent", variant === "cards" && "focus-visible:outline-none")}
              />
              <span className="min-w-0">
                <span className="block font-medium text-ink">{opt.label}</span>
                {opt.description ? (
                  <span id={descId} className="mt-0.5 block text-muted">
                    {opt.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-bad">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
