# operator-ui/16 — dialogs and pickers, shadcn-shaped

**What to build:** the shadcn component shapes the Tailwind move bought us — a dialog for create and
a popover picker for the cross-domain edge choice — replacing the permanently open create panel and
the bare button pair.

Hand-rolled in `ui/kit.tsx` on the same tokens, not a Radix pull-in: the page is server-rendered and
its tests read the markup, so a component that renders nothing until it is open would empty out the
served page.

- [x] create opens in a dialog instead of a standing panel
- [x] the cross-domain edge choice uses the same dialog/popover shape
- [x] the served page still carries the create form, its type select, and the three filter fieldsets
- [x] Escape closes the dialog and the overlay click closes the dialog
- [x] `tsc -p tsconfig.tools.json` clean and `overview-test.ts` ok
