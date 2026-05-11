import { Avatar as UiAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  src?: string;
  name?: string;
  className?: string;
};

export function Avatar({ src, name = "User", className }: Props) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <UiAvatar className={className}>
      <AvatarImage src={src} alt={name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </UiAvatar>
  );
}
