/**
 * Local UI listen ports. This machine already binds 8765–8768 (AutoSCI / LITHE).
 * Attention UI prefers 8770; if taken and the operator did not pass --port, try the next few.
 */
export const ATTENTION_UI_PORT = 8770;

const FALLBACK_SPAN = 20;

export function parseListenPort(value: string | undefined, fallback: number): number {
	if (value === undefined) return fallback;
	const port = Number(value);
	if (!Number.isInteger(port) || port < 0 || port > 65535) {
		throw new Error("--port needs an integer 0–65535");
	}
	return port;
}

export function isAddressInUse(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const code = "code" in error ? String((error as { code?: unknown }).code) : "";
	return code === "EADDRINUSE" || /address already in use/i.test(error.message);
}

export type Bindable = {
	listen(port: number, host?: string, listeningListener?: () => void): Bindable;
	address(): { port: number; address: string; family: string } | null;
	once(event: "error", listener: (err: Error) => void): Bindable;
};

export function listenLocalUi(options: {
	server: Bindable;
	host: string;
	port: number;
	explicit: boolean;
	name: string;
}): void {
	const { server, host, explicit, name } = options;
	const preferred = options.port;
	const ceiling = explicit || preferred === 0 ? preferred : preferred + FALLBACK_SPAN;
	let port = preferred;

	const fail = (err: Error): void => {
		process.stderr.write(`${name}: cannot bind http://${host}:${port}: ${err.message}\n`);
		process.exit(1);
	};

	const attempt = (): void => {
		server.once("error", (err) => {
			if (!explicit && preferred !== 0 && isAddressInUse(err) && port < ceiling) {
				port += 1;
				attempt();
				return;
			}
			fail(err);
		});
		server.listen(port, host, () => {
			const actual = server.address()?.port ?? port;
			process.stderr.write(`${name} listening on http://${host}:${actual}\n`);
		});
	};
	attempt();
}
