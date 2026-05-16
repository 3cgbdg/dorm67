/**
 * Sheet — bottom drawer (Vaul).
 * <Sheet open={o} onOpenChange={setO}>
 *   <SheetPortal><SheetOverlay /><SheetContent>...</SheetContent></SheetPortal>
 * </Sheet>
 */
import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

function Sheet(props: React.ComponentProps<typeof Drawer.Root>) {
  return <Drawer.Root direction="bottom" {...props} />;
}

const SheetTrigger = Drawer.Trigger;
const SheetPortal = Drawer.Portal;
const SheetClose = Drawer.Close;

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Drawer.Overlay>
>(({ className, ...props }, ref) => (
  <Drawer.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/40", className)} {...props} />
));
SheetOverlay.displayName = "SheetOverlay";

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Drawer.Content>
>(({ className, children, ...props }, ref) => (
  <Drawer.Content
    ref={ref}
    className={cn(
      "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border border-border bg-surface p-4 pb-safe shadow-pop outline-none",
      className
    )}
    {...props}
  >
    <Drawer.Handle className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-surface-2" />
    {children}
  </Drawer.Content>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
const SheetTitle = Drawer.Title;
const SheetDescription = Drawer.Description;

export { Sheet, SheetTrigger, SheetPortal, SheetClose, SheetOverlay, SheetContent, SheetHeader, SheetTitle, SheetDescription };
