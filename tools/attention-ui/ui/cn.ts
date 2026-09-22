import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn's `cn`: conditional classes, then Tailwind conflict resolution. */
export function cn(...parts: ClassValue[]): string {
	return twMerge(clsx(parts));
}
