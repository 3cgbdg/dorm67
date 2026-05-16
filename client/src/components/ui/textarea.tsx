/**
 * Textarea — multi-line input.
 * Props: autoGrow?, maxRows?, className, standard textarea props.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}

export type TextareaProps = React.ComponentProps<"textarea"> & {
  autoGrow?: boolean;
  maxRows?: number;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow, maxRows = 12, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoGrow) return;
      el.style.height = "auto";
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
      const maxH = lineHeight * maxRows;
      el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
    }, [autoGrow, maxRows]);

    React.useEffect(() => {
      resize();
    }, [resize, props.value, props.defaultValue]);

    return (
      <textarea
        className={cn(
          "min-h-[100px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
          autoGrow && "resize-none overflow-y-auto",
          className
        )}
        ref={mergeRefs(innerRef, ref)}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
