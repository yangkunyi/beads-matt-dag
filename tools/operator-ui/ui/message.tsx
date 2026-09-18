/**
 * shadcn Message: a thread post. Not portalled. `from` is the speaker — the operator vs anyone else.
 */
import type { HTMLAttributes } from "react";
import { cn } from "./cn.ts";

export type MessageFrom = "user" | "assistant";

export function Message({
	className,
	from,
	...props
}: HTMLAttributes<HTMLElement> & { from: MessageFrom }) {
	return (
		<article
			data-from={from}
			className={cn("flex flex-col gap-1", from === "user" ? "items-end" : "items-start", className)}
			{...props}
		/>
	);
}

export function MessageContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("max-w-[85%]", className)} {...props} />;
}
