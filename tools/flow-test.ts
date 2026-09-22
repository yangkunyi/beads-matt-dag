import { defaultPrefix, upsertFlowBlock } from "./flow.ts";

function expect(name: string, ok: boolean): void {
  if (!ok) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
}

expect("empty dir name becomes beads", defaultPrefix("/tmp/...") === "beads");
expect("strips hyphens", defaultPrefix("/tmp/Foo-Bar") === "foobar");
expect("leading digit gets a letter", defaultPrefix("/tmp/2cool") === "p2cool");

const inserted = upsertFlowBlock("# video-policy\n\nWhere the ideas are worked.\n");
expect("inserts after the title", inserted.startsWith("# video-policy\n\n<!-- BEGIN BEADS-DAG FLOW -->"));
expect("keeps the rest", inserted.includes("Where the ideas are worked."));
expect("names the installed contract, not a repo copy", inserted.includes("ask-loom/issue-tracker.md") && !inserted.includes("`docs/agents/issue-tracker.md`"));
expect("boots from attention", inserted.includes("loom attention --json"));
expect("overrides beads close/claim", inserted.includes("merged <branch>") && inserted.includes("`--claim`"));

const again = upsertFlowBlock(inserted);
expect("second init is idempotent", again === inserted);

const stale = `# t\n\n<!-- BEGIN BEADS-DAG FLOW -->\n## Agent skills\n\nold copy\n<!-- END BEADS-DAG FLOW -->\n\nrest\n`;
const replaced = upsertFlowBlock(stale);
expect(
	"replaces a stale block",
	replaced.includes("one copy per machine") && !replaced.includes("old copy") && replaced.includes("rest"),
);

console.log("ok");
