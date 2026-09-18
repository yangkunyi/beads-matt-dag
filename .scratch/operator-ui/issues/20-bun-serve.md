# operator-ui/20 — the operator surface listens with `Bun.serve`

**What to build:** `tools/operator-ui/serve.ts` still answers the same routes through
`handleOverviewRequest`. The listener is `Bun.serve`, not `node:http`. The runtime is already bun;
the Node HTTP server is a leftover adapter.

`handleOverviewRequest` stays the request seam: the overview tests that post JSON at it do not need a
socket. `createOverviewServer` still exposes `listen` / `address` / `close` / `once("error")` so the
three live-socket cases keep driving a real port.

- [ ] `serve.ts` does not import `node:http`
- [ ] `createOverviewServer` listens with `Bun.serve`
- [ ] GET `/`, GET `/overview`, GET `/app.js`, POST `/comment`, and a matching ETag 304 still behave
- [ ] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
