/**
 * Select — dropdown single choice (Radix).
 * API: value, onValueChange, options[{value,label}], placeholder?, className?
 */
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  className?: string;
  placeholder?: string;
};

export function Select({ value, onValueChange, options, className, placeholder = "Select an option" }: Props) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-ring focus:ring-offset-2 focus:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-ink-soft [&>span]:line-clamp-1",
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft opacity-70" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "relative z-50 max-h-96 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface text-ink shadow-pop"
          )}
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => {
              if (option.value === "") {
                if (import.meta.env.DEV) {
                  console.warn(
                    "[Select] Radix Select.Item cannot use value=\"\". Use a non-empty sentinel (see DORM_SELECT_PLACEHOLDER).",
                    option.label
                  );
                }
                return null;
              }
              return (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:bg-brand-soft data-[state=checked]:text-brand data-[state=checked]:font-medium"
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
