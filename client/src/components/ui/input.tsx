/**
 * Input — text field.
 * Props: leftIcon?, rightIcon?, error?, helpText?, className, standard input props.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  helpText?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, error, helpText, id, ...props }, ref) => {
    const input = (
      <input
        type={type}
        id={id}
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
          leftIcon && "pl-10",
          rightIcon && "pr-10",
          error && "border-danger focus-visible:ring-danger/40",
          className
        )}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={helpText || error ? `${id}-desc` : undefined}
        {...props}
      />
    );

    if (!leftIcon && !rightIcon && !helpText && !error) {
      return input;
    }

    return (
      <div className="w-full space-y-1">
        <div className="relative">
          {leftIcon ? (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
              {leftIcon}
            </span>
          ) : null}
          {input}
          {rightIcon ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
              {rightIcon}
            </span>
          ) : null}
        </div>
        {helpText && !error ? (
          <p id={id ? `${id}-desc` : undefined} className="text-xs text-ink-soft">
            {helpText}
          </p>
        ) : null}
        {error ? (
          <p id={id ? `${id}-desc` : undefined} className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
