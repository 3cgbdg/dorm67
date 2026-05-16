import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  title: string;
  description: string;
  onConfirm: () => void;
  triggerLabel?: string;
  /** @deprecated use `danger` */
  destructive?: boolean;
  danger?: boolean;
};

export function ConfirmDialog({
  title,
  description,
  onConfirm,
  triggerLabel = "Confirm",
  destructive = false,
  danger = false,
}: Props) {
  const isDanger = danger || destructive;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={isDanger ? "danger" : "outline"}>
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
