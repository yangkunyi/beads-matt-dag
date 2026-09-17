import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn's `cn`: conditional classes, then Tailwind conflict resolution, so a caller's class beats
 * the component's own rather than depending on where the stylesheet happens to declare them.
 */
export function cn(...parts: ClassValue[]): string {
	return twMerge(clsx(parts));
}
