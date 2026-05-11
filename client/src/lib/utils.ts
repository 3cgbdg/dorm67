import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(value: Date | string | number | { toDate(): Date } | null | undefined): string {
  if (!value) return "";
  try {
    // Handle Firestore Timestamp objects (have a .toDate() method)
    const date = typeof value === "object" && "toDate" in value
      ? value.toDate()
      : new Date(value as string | number | Date);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "";
  }
}

export function timeAgo(value: string | { toDate(): Date } | undefined | null): string {
  if (!value) return "";
  try {
    const date = typeof value === "string" ? new Date(value) : value.toDate();
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return "just now";
    const secs = Math.floor(diffMs / 1000);
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  } catch {
    return "";
  }
}

export function getErrorMessage(error: any): string {
  if (!error) return "Something went wrong. Please try again.";
  const msg = error?.message || String(error);

  const lowerMsg = msg.toLowerCase();

  // Auth errors
  if (lowerMsg.includes("invalid-login-credentials") || lowerMsg.includes("user-not-found") || lowerMsg.includes("wrong-password")) {
    return "Incorrect email or password. Please try again.";
  }
  if (lowerMsg.includes("email-already-in-use")) {
    return "An account with this email already exists.";
  }
  if (lowerMsg.includes("weak-password")) {
    return "Password is too weak. Please use a stronger password.";
  }
  if (lowerMsg.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (lowerMsg.includes("network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }

  // Firestore / general errors
  if (lowerMsg.includes("permission-denied") || lowerMsg.includes("missing or insufficient permissions")) {
    return "You don't have permission to do this.";
  }
  if (lowerMsg.includes("failed to fetch") || lowerMsg.includes("cors")) {
    return "Server connection failed. Please try again later.";
  }

  // Strip technical prefix
  if (lowerMsg.includes("firebase") || lowerMsg.includes("auth/") || lowerMsg.includes("firestore")) {
    return "Something went wrong on our end. Please try again.";
  }

  return msg.length > 80 ? "An unexpected error occurred. Please try again." : msg;
}

export function handleAppError(error: any, toastObj: any) {
  const message = getErrorMessage(error);
  if (toastObj && toastObj.error) {
    toastObj.error(message);
  }
}
