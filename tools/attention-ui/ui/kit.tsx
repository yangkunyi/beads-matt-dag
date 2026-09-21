/**
 * shadcn-style primitives on Radix + CVA. Dialog content stays in the DOM when closed so the
 * served page's tests can read the capture form.
 */
import { Slot } from "@radix-ui/react-slot";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import {
	useEffect,
	type ButtonHTMLAttributes,
	type ComponentProps,
	type HTMLAttributes,
	type InputHTMLAttributes,
	type LabelHTMLAttributes,
	type ReactNode,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
} from "react";
import { X } from "lucide-react";
import { cn } from "./cn.ts";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-3",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:opacity-90",
				outline: "border border-border bg-background hover:bg-accent",
				ghost: "hover:bg-accent",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

export function Button({
	className,
	variant,
	type = "button",
	asChild = false,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "button";
	return <Comp type={asChild ? undefined : type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
	return (
		<span
			className={cn(
				"inline-flex h-5 items-center rounded-full border border-border bg-accent px-2 text-[11px] font-semibold",
				className,
			)}
			{...props}
		/>
	);
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return <label className={cn("text-sm font-medium", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			className={cn(
				"h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
			{...props}
		/>
	);
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			className={cn(
				"min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
			{...props}
		/>
	);
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			className={cn(
				"h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
			{...props}
		/>
	);
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
			<div aria-hidden="true" className="absolute inset-0 bg-black/50" onClick={props.onClose} />
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
					<Button variant="ghost" aria-label={`Close ${props.title}`} onClick={props.onClose} className="shrink-0">
						<X aria-hidden="true" size={16} />
					</Button>
				</div>
				{props.description === undefined ? null : <p className="mb-3 text-sm text-muted-foreground">{props.description}</p>}
				{props.children}
			</div>
		</div>
	);
}

export const Tabs = TabsPrimitive.Root;
export const TabsList = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) => (
	<TabsPrimitive.List className={cn("flex flex-col gap-1", className)} {...props} />
);
export const TabsTrigger = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) => (
	<TabsPrimitive.Trigger
		className={cn(
			"flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent data-[state=active]:bg-accent data-[state=active]:font-medium data-[state=active]:text-foreground",
			className,
		)}
		{...props}
	/>
);
export const TabsContent = TabsPrimitive.Content;

export function ScrollArea({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<ScrollAreaPrimitive.Root className={cn("overflow-hidden", className)}>
			<ScrollAreaPrimitive.Viewport className="h-full w-full">{children}</ScrollAreaPrimitive.Viewport>
			<ScrollAreaPrimitive.Scrollbar
				orientation="vertical"
				className="flex w-2 touch-none select-none bg-transparent p-px"
			>
				<ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
			</ScrollAreaPrimitive.Scrollbar>
		</ScrollAreaPrimitive.Root>
	);
}

export function Separator({ className, ...props }: ComponentProps<typeof SeparatorPrimitive.Root>) {
	return <SeparatorPrimitive.Root className={cn("h-px w-full bg-border", className)} {...props} />;
}

export function TooltipProvider({ children }: { children: ReactNode }) {
	return <TooltipPrimitive.Provider delayDuration={200}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
	return (
		<TooltipPrimitive.Root>
			<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Content
					side="right"
					className="z-50 rounded-md border border-border bg-card px-2 py-1 text-xs shadow-md"
				>
					{label}
				</TooltipPrimitive.Content>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
}
