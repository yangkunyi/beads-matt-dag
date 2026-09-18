/**
 * shadcn Bubble: the body of a Message. Not portalled, no Slot — the page is server-rendered.
 */
import type { HTMLAttributes } from "react";
import { cn } from "./cn.ts";
import type { MessageFrom } from "./message.tsx";

export function Bubble({
	className,
	from,
	...props
}: HTMLAttributes<HTMLDivElement> & { from?: MessageFrom }) {
	return (
		<div
			className={cn(
				"rounded-lg px-3 py-2 text-sm",
				from === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
				className,
			)}
			{...props}
		/>
	);
}
