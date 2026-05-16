/**
 * AppDrawer — slide-over from right (Vaul), e.g. notifications on desktop.
 * Root is preconfigured with direction="right".
 *
 * Usage:
 * <AppDrawer open={o} onOpenChange={setO}>
 *   <AppDrawerPortal>
 *     <AppDrawerOverlay />
 *     <AppDrawerContent>...</AppDrawerContent>
 *   </AppDrawerPortal>
 * </AppDrawer>
 */
import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

function AppDrawer(props: React.ComponentProps<typeof Drawer.Root>) {
  return <Drawer.Root direction="right" modal {...props} />;
}

const AppDrawerTrigger = Drawer.Trigger;
const AppDrawerPortal = Drawer.Portal;
const AppDrawerClose = Drawer.Close;

const AppDrawerOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Drawer.Overlay>
>(({ className, ...props }, ref) => (
  <Drawer.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/40", className)} {...props} />
));
AppDrawerOverlay.displayName = "AppDrawerOverlay";

const AppDrawerContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Drawer.Content>
>(({ className, children, ...props }, ref) => (
  <Drawer.Content
    ref={ref}
    className={cn(
      "fixed bottom-2 right-2 top-2 z-50 flex w-[min(100vw-1rem,24rem)] flex-col rounded-2xl border border-border bg-surface shadow-pop outline-none md:bottom-4 md:right-4 md:top-4",
      className
    )}
    {...props}
  >
    {children}
  </Drawer.Content>
));
AppDrawerContent.displayName = "AppDrawerContent";

const AppDrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between gap-2 border-b border-border px-4 py-3", className)}
    {...props}
  />
);
const AppDrawerTitle = Drawer.Title;
const AppDrawerDescription = Drawer.Description;

export {
  AppDrawer,
  AppDrawerTrigger,
  AppDrawerPortal,
  AppDrawerClose,
  AppDrawerOverlay,
  AppDrawerContent,
  AppDrawerHeader,
  AppDrawerTitle,
  AppDrawerDescription,
};
