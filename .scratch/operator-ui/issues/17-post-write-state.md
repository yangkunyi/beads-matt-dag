# operator-ui/17 — the operator surface's post-write state

**The finding:** three regressions the drain's review of the operator-ui round raised, all one shape —
state that used to be cleared by `location.reload()` and now has no cleaner, because a write re-reads the
store instead of reloading the page. Raised against the work that removed the reload (b2b8dff and the
commits around it).

**Why one ticket:** the three share a root cause and a fix method (give the state an owner); splitting
them would produce three tickets whose bodies mostly repeat this paragraph.

**On Main as c9edede.**

- [x] **A filter uncheck is undone on the next re-read, including the live poll's five-second tick.**
  `withNewValues` treated "the operator turned this off" and "the store has never offered this" as one
  fact, because both look like a value missing from the selection, so it re-selected whatever it found
  missing. `withNewlyOffered` keeps a second set of every value the store has ever offered and selects
  only what is new *there*. The rule is exported and driven directly by `overview-test.ts`, because this
  is React runtime state and no server render would have caught it.
- [x] **A successful create closed nothing.** `run(...)`'s boolean — the whole reason it returns one —
  was discarded, so the dialog stayed open with the fields filled and a second click made a second
  issue. Now the fields clear and the dialog closes only when the store accepted the create.
- [x] **A successful cross-domain connect left the kind-picker open.** `setPick(null)` ran only in the
  `catch`, so the same pair could be crossed twice. Moved into `finally`: the choice is spent on success
  and on refusal alike.
- [x] `tsc -p tsconfig.tools.json` clean, `overview-test.ts` ok, and the served page renders its three
  filter fieldsets with boxes checked and 32 list rows against the real store.
- [ ] **Not verified:** no browser pass. Hydration and real clicks are still only reasoned about — a
  human should uncheck a filter and wait five seconds, create an issue and watch the dialog, and cross
  two domains and watch the picker.
