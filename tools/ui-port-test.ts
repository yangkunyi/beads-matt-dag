#!/usr/bin/env bun
/**
 *   bun tools/ui-port-test.ts
 */
import {
	ATTENTION_UI_PORT,
	isAddressInUse,
	listenLocalUi,
	parseListenPort,
	type Bindable,
} from "./ui-port";

let failed = 0;
function expect(label: string, cond: unknown, detail?: unknown): void {
	if (cond) return;
	failed += 1;
	console.error(`FAIL ${label}${detail === undefined ? "" : `: ${JSON.stringify(detail)}`}`);
}

expect("attention preferred is 8770", ATTENTION_UI_PORT === 8770);
expect("omitted port uses fallback", parseListenPort(undefined, 8770) === 8770);
expect("explicit 0 is ephemeral", parseListenPort("0", 8770) === 0);
expect("explicit 8772 sticks", parseListenPort("8772", 8770) === 8772);

let threw = false;
try {
	parseListenPort("nope", 8770);
} catch {
	threw = true;
}
expect("non-integer port throws", threw);

const busy = Object.assign(new Error("Failed to start server. Is port 8770 in use?"), { code: "EADDRINUSE" });
expect("EADDRINUSE code", isAddressInUse(busy));
expect("plain error is not in-use", !isAddressInUse(new Error("boom")));

const tried: number[] = [];
let bound: number | null = null;
let onError: ((err: Error) => void) | undefined;
const fake: Bindable = {
	once(_event, listener) {
		onError = listener;
		return fake;
	},
	listen(port, _host, listeningListener) {
		tried.push(port);
		if (port === 8770) {
			onError?.(busy);
			return fake;
		}
		bound = port;
		listeningListener?.();
		return fake;
	},
	address() {
		return bound === null ? null : { port: bound, address: "127.0.0.1", family: "IPv4" };
	},
};
listenLocalUi({ server: fake, host: "127.0.0.1", port: 8770, explicit: false, name: "attention-ui" });
expect("fallback skips busy preferred", tried[0] === 8770 && bound === 8771, { tried, bound });

if (failed > 0) {
	console.error(`${failed} failed`);
	process.exit(1);
}
console.log("ok");
