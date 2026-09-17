/**
 * A small shadcn-style kit: the same pieces shadcn ships as copy-paste primitives, styled with the
 * kit CSS rather than Tailwind. Not a second component library — just Button, Card, Badge, Label,
 * Textarea so the operator page is not a pile of unstyled HTML.
 */

import type {
	ButtonHTMLAttributes,
	HTMLAttributes,
	InputHTMLAttributes,
	LabelHTMLAttributes,
	SelectHTMLAttributes,
	TextareaHTMLAttributes,
} from "react";
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
