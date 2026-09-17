/**
 * A small shadcn-style kit: the same pieces shadcn ships as copy-paste primitives, styled with the
 * kit CSS and Tailwind utilities rather than a component library. Not a second component library —
 * just Button, Card, Badge, Label, Textarea, Dialog, Popover.
 *
 * Dialog and Popover keep their content in the DOM when closed (a `hidden` wrapper) rather than
 * portal-mounting it. The page is server-rendered and its tests read the markup, so a component
 * that renders nothing until it opens would empty out the served page.
 */

import { useEffect, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X } from "lucide-react";
import { cn } from "./cn.ts";

export function Button({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
	return <button type={type} className={cn("btn", className)} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("card", className)} {...props} />;
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
	return <span className={cn("badge", className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return <label className={cn("label", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <textarea className={cn("textarea", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
	return <input className={cn("input", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
	return <select className={cn("select", className)} {...props} />;
}

function useEscape(active: boolean, onClose: () => void): void {
	useEffect(() => {
		if (!active) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [active, onClose]);
}

/** A modal shell that stays in the DOM: closed it is `hidden`, open it is a centred card. */
export function Dialog(props: {
	id?: string;
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	className?: string;
	children: ReactNode;
}) {
	useEscape(props.open, props.onClose);
	return (
		<div
			id={props.id}
			data-dialog={props.open ? "open" : "closed"}
			className={cn("fixed inset-0 z-50 items-center justify-center p-4", props.open ? "flex" : "hidden")}
		>
			<div
				data-dialog-overlay=""
				aria-hidden="true"
				className="absolute inset-0 bg-black/50"
				onClick={props.onClose}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={props.title}
				className={cn(
					"relative z-10 max-h-[85vh] w-full max-w-xl overflow-auto rounded-lg border border-border bg-card p-4 shadow-xl",
					props.className,
				)}
			>
				<div className="mb-3 flex items-start justify-between gap-4">
					<h2 className="text-base font-semibold">{props.title}</h2>
					<Button aria-label={`Close ${props.title}`} onClick={props.onClose} className="shrink-0">
						<X aria-hidden="true" size={16} />
					</Button>
				</div>
				{props.description === undefined ? null : <p className="muted mb-3">{props.description}</p>}
				{props.children}
			</div>
		</div>
	);
}

/** An anchored panel for a choice that belongs to what is under it. Absent when closed. */
export function Popover(props: {
	label: string;
	open: boolean;
	className?: string;
	children: ReactNode;
}) {
	if (!props.open) return null;
	return (
		<div
			role="dialog"
			aria-label={props.label}
			className={cn(
				"absolute z-20 w-72 rounded-lg border border-border bg-card p-3 shadow-xl",
				props.className,
			)}
		>
			{props.children}
		</div>
	);
}
