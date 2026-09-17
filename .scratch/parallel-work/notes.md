# Two large concurrent changes: named patterns from owners (BBA, strangler, parallel change, toggles, LSC/Rosie, Mikado, seams, stacked diffs)

Literature notes on introducing a replacement **beside** an old path, and on what trunk-based / small-step / stacked-diff practices actually say when two conceptually unrelated efforts collide on the same files. Claims are one fact each, quoted from a fetched owner page.

## Claims

- **c1** Fowler names Branch by Abstraction as a way to make a large-scale change gradually while still releasing the system while the change is in progress.
  Source: url:https://martinfowler.com/bliki/BranchByAbstraction.html (opening)
  > “Branch by Abstraction” is a technique for making a large-scale change to a software system in gradual way that allows you to release the system regularly while the change is still in-progress.

- **c2** Fowler’s BBA sequence is: introduce an abstraction over the old supplier, move clients onto it, add a second implementation behind the same abstraction, switch clients over, then delete the old supplier (and optionally the abstraction).
  Source: url:https://martinfowler.com/bliki/BranchByAbstraction.html (body + closing theme)
  > We create an abstraction layer that captures the interaction between one section of the client code and the current supplier. We change that section of the client code to call the supplier entirely through this abstraction layer.
  >
  > We build a new supplier that implements the features required by one part of the client code using the same abstraction layer. Once we are ready we switch that section of the client code to use the new supplier.
  >
  > We gradually swap out the flawed supplier until all the client code uses the new supplier. Once the flawed supplier isn't needed, we can delete it. We may also choose to delete the abstraction layer once we no longer need it for migration.
  >
  > Use an abstraction layer to allow multiple implementations to co-exist in the software system. … Ensure that the system builds and runs correctly at all times

- **c3** Fowler attributes the name to Paul Hammant (crediting Stacy Curl) in a trunk-based-development argument, not as Fowler’s invention.
  Source: url:https://martinfowler.com/bliki/BranchByAbstraction.html (note 1)
  > Paul Hammant introduced the term “Branch by Abstraction” while arguing in favor of Trunk Based Development (he credits Stacy Curl with originally coming up with it).

- **c4** Hammant’s original BBA steps match Fowler’s: abstraction, retarget clients, second implementation, switch, deprecate, delete old, then remove the abstraction if inelegant; he presents this as an alternative to a long source-control branch for a large swap (Hibernate to iBatis in his hypothetical).
  Source: url:https://paulhammant.com/blog/branch_by_abstraction.html (The steps to living Branch By Abstraction)
  > 1. Introduce an abstraction over the core bits of the big thing you’re going to change and commit
  > 2. Update all the bits of code that were formerly using the thing directly to use it via the new abstraction and commit
  > 3. Make a second implementation of the abstraction, with unit tests that specifically test its core functionality and commit
  > 4. Update all the code from (2) to use the new implementation (still via the abstraction)* and commit
  > 5. Deprecate the first implementation (or skip to 6 if you don’t want a respectful grace period).
  > 6. Delete the first implementation (its proven there is no need for you to go back).
  > 7. Remove the abstraction (if it is inelegant).

- **c5** Hammant’s synopsis is explicit that BBA is branching by an **abstraction in the shared trunk**, not by source control, not by `#ifdef`, and **not by if-condition**.
  Source: url:https://paulhammant.com/blog/branch_by_abstraction.html (Synopsis)
  > Application developers should branch by an **abstraction** in the shared branch:
  >
  > 1. instead of branching by **Source Control**
  > 2. instead of branching by **#ifdef**
  > 3. instead of branching by **if condition**

- **c6** Hammant’s later BBA site restates the same anti-conditional stance: BBA is not sprinkling conditionals; the characterizing last step is deleting the temporary abstraction (the analogue of merging a branch).
  Source: url:https://www.branchbyabstraction.com/ (Branch By Abstraction?)
  > And no, that doesn't mean sprinkle conditionals into your source code, it means to use an abstraction concept that's idiomatic for the programming language you are using.
  >
  > The removal of the abstraction (and old implementation) is the equivalent to the merge back from the branch that you've now avoided.

- **c7** Fowler’s BBA page *does* allow Feature Flags as a way to run the new supplier beside the old one during the build-out (a point of tension with Hammant c5–c6).
  Source: url:https://martinfowler.com/bliki/BranchByAbstraction.html (note 2)
  > While we are building the new feature we can use FeatureFlags to run the new supplier in test environments and compare its behavior to the flawed supplier.

- **c8** Humble (Continuous Delivery site) distinguishes BBA from feature toggles: both let you change mainline incrementally, but toggles hide **new features** at deploy/run time, while BBA is a **development** technique for large-scale replacement; they can be combined but typically BBA’s choice of implementation is developer-chosen or baked at build time.
  Source: url:https://continuousdelivery.com/2011/05/make-large-scale-changes-incrementally-with-branch-by-abstraction/ (Relationship to feature toggles)
  > People often confuse branch by abstraction with feature toggles. Both are patterns that allow you to make changes to your system incrementally on mainline. The difference is that feature toggles are intended to allow the development of new features, while keeping those features invisible to users when the system is running. Feature toggles are thus used at deploy time or run time to choose whether a particular feature or set of features is visible in the application.
  >
  > Branch by abstraction is a pattern for making large-scale changes to an application incrementally, and is thus a development technique. Branch by abstraction can of course be combined with feature toggles … But typically, the choice of implementation is chosen by the developers and either hard-coded or baked in at build time

- **c9** Humble places strangler *above* BBA: strangler incrementally replaces a **whole (usually legacy) system**; BBA incrementally changes the implementation of a **component**; the line blurs in a service-oriented architecture.
  Source: url:https://continuousdelivery.com/2011/05/make-large-scale-changes-incrementally-with-branch-by-abstraction/ (Relationship to strangler application)
  > The strangler application pattern involves incrementally replacing a whole system (usually legacy) with a completely new one. Thus it operates at a higher level of abstraction than branch by abstraction, which is for incrementally changing the implementation of a component of your system. The lines between the two start to blur if you have a service-oriented architecture.

- **c10** Humble’s stated payoff of BBA is that the code stays working throughout the restructuring, so the **release schedule is decoupled** from the architectural change and the team can stop the restructuring to ship something higher priority.
  Source: url:https://continuousdelivery.com/2011/05/make-large-scale-changes-incrementally-with-branch-by-abstraction/ (How branch by abstraction works)
  > The key benefit of branch by abstraction is that your code is working at all times throughout the re-structuring, enabling continuous delivery. That means your release schedule is completely decoupled from your architectural changes, and thus you can stop working on the restructuring at any point to do something else that is higher priority, such as putting out a release with an exciting new feature you just thought up.

- **c11** Humble is explicit that BBA is **not** a substitute for having a seam: in a big ball of mud, creating the abstraction can be hard; if a seam cannot be created by refactorings, he calls creating a VCS branch “an extreme move.”
  Source: url:https://continuousdelivery.com/2011/05/make-large-scale-changes-incrementally-with-branch-by-abstraction/ (Branch by abstraction compared with branching in version control)
  > The only other time it might be permissible to use branching is if your codebase uses the big ball of mud pattern. In this scenario even creating an abstraction layer can be hard. In order to do this, you must first find a "seam" (typically in the form of a set of interfaces if you're using a statically typed OO language) that you can put the abstraction layer over. If a seam was not readily available, you would normally create one through a series of refactorings, but if that's not possible for some reason then you might have to resort to creating a branch to get into a position to do this. Of course, this is an extreme move.

- **c12** Humble’s footnote on DVCS merge tools: they do not catch **semantic** conflicts, and longer-lived branches are harder to merge even with good tools.
  Source: url:https://continuousdelivery.com/2011/05/make-large-scale-changes-incrementally-with-branch-by-abstraction/ (footnote 1)
  > Firstly, as Martin Fowler points out, automated merge tools are incapable of catching semantic conflicts. Second, the longer the branch exists, the harder it is to merge, even with the best tools in the world.

- **c13** Hammant says BBA is **not a panacea**; architects should still prefer it to declaring a long feature branch “the only way.”
  Source: url:https://paulhammant.com/blog/branch_by_abstraction.html (Benefits)
  > Of course, BbA _is not a panacea_ . It is just a practice that developers/architects can often do it when architects with less nerve are suggesting yet another long running feature branch.

- **c14** Trunk-Based Development’s BBA page independently says BBA does not suit all change situations, in particular long parallel support of old APIs / previous releases.
  Source: url:https://trunkbaseddevelopment.com/branch-by-abstraction/ (Not a panacea)
  > Branch by Abstraction does not suit all ‘change’ situations.
  >
  > One is when you have got to support old APIs and previous releases for more than a short period of time. I.e. when your dependent customers (or detached clients apps) can choose their own upgrade moment.

- **c15** TBD’s BBA rules for the concurrent-work case: other developers already depending on the code must not be slowed down, and no commit to the shared repo may jeopardize going live.
  Source: url:https://trunkbaseddevelopment.com/branch-by-abstraction/ (Rules)
  > 1. There are also a lot of developers already depending on the code that is subject of the ’longer to complete’ change, and we do not want them to be slowed down in any way.
  > 2. No commit pushed to the shared repository should jeopardize the ability to go live.

- **c16** Fowler’s Strangler Fig is a **gradual modernization** metaphor: start with small additions, often new features, built on top of yet **separate from** the legacy, then move bits of behavior across.
  Source: url:https://martinfowler.com/bliki/StranglerFigApplication.html (body)
  > The alternative that my colleagues and I prefer, is to do a gradual process of modernization. Like the fig, it begins with small additions, often new features, that are built on top of, yet separate to the legacy code base. As we do this we move bits of behavior from the legacy system into the new code base.

- **c17** Fowler’s strangler write-up requires identifying **seams** so the system can be split, then replacing small isolated components; it also requires **transitional architecture** so new and legacy coexist (code that will later go away).
  Source: url:https://martinfowler.com/bliki/StranglerFigApplication.html (seams + transitional architecture)
  > Ideally, software should consist of clear components that can be replaced independently. Legacy systems rarely exhibit this characteristic, so there's considerable work in figuring out how to break it down into manageable pieces, This will involve identifying seams that we can insert into the system to allow it to be split.
  >
  > When doing this, people often balk at the necessity of building transitional architecture to allow the new and legacy system to coexist, code that will go away once the modernization is complete. While this may appear to be a waste, the reduced risk and earlier value from the gradual approach outweigh its costs.

- **c18** Fowler’s Parallel Change (also **expand and contract**) is a three-phase pattern for a backward-incompatible interface change: expand (old and new both live), migrate clients, contract (delete the old).
  Source: url:https://martinfowler.com/bliki/ParallelChange.html (opening + phases)
  > **Parallel change**, also known as **expand and contract**, is a pattern to implement backward-incompatible changes to an interface in a safe manner, by breaking the change into three distinct phases: expand, migrate, and contract.
  >
  > In the _expand_ phase you augment the interface to support both the old and the new versions. … Existing clients will continue to consume the old version, and the new changes can be introduced incrementally without affecting them.
  >
  > During the _migrate_ phase you update all clients using the old version to the new version. … Once all usages have been migrated to the new version, you perform the _contract_ phase to remove the old version

- **c19** Fowler states Parallel Change’s cost: during migrate the supplier must support **two versions**; if contract is skipped you can be worse than when you started.
  Source: url:https://martinfowler.com/bliki/ParallelChange.html (downside)
  > The downside of using parallel change is that during the migrate phase the supplier has to support two different versions, and clients could get confused about which version is new versus old. If the contract phase is not executed you might end up in a worse state than you started, therefore you need discipline to finish the transition successfully.

- **c20** Fowler relates Parallel Change to BBA: expand/contract can introduce the abstraction, or can do a large change **without** a replacement seam; with many clients, BBA is the better way to narrow the surface of change.
  Source: url:https://martinfowler.com/bliki/ParallelChange.html (BranchByAbstraction paragraph)
  > When implementing BranchByAbstraction, parallel change is a good way to introduce the abstraction layer between the clients and the supplier. It is also an alternative way to perform a large-scale change without introducing the abstraction layer as a seam for replacement on the supplier side. However, when you have a large number of clients, using branch by abstraction is a better strategy to narrow the surface of change and reduce confusion during the migrate phase.

- **c21** Sadalage/Fowler evolutionary database design uses the same Parallel Change idea as a **transition phase**: the database supports old and new access patterns at once (e.g. rename table + compatibility view), then the extra complexity is removed after downstreams migrate.
  Source: url:https://martinfowler.com/articles/evodb.html (Transition phase)
  > A **transition phase** is a period of time when the database supports both the old access pattern and the new ones simultaneously. This allows older systems time to migrate over to the new structures at their own pace.
  >
  > For the Rename Table example, the developer would create a script that renames the table `customer` to `client` and also creates a `view` named `customer` that existing applications can use. This Parallel Change supports new and old access. It does add complexity, so it's important that it gets removed once downsteam systems have had time to migrate.

- **c22** Hodgson (on martinfowler.com) defines Feature Toggles as shipping **alternative codepaths in one deployable** and choosing between them at runtime; Release Toggles specifically exist so incomplete work can live on trunk and still be deployed.
  Source: url:https://martinfowler.com/articles/feature-toggles.html (A Toggling Tale + Release Toggles)
  > We've seen the fundamental facility provided by Feature Toggles - being able to ship alternative codepaths within one deployable unit and choose between them at runtime.
  >
  > Release Toggles allow incomplete and un-tested codepaths to be shipped to production as latent code which may never be turned on.
  >
  > These are feature flags used to enable trunk-based development for teams practicing Continuous Delivery. They allow in-progress features to be checked into a shared integration branch (e.g. master or trunk) while still allowing that branch to be deployed to production at any time.

- **c23** Hodgson’s spline-reticulation story is the “feature and a large overhaul in the same codebase” case: the overhaul is hidden by a toggle so **other team members continue related work on trunk** instead of a long-lived branch.
  Source: url:https://martinfowler.com/articles/feature-toggles.html (A Toggling Tale)
  > You have been tasked with increasing the efficiency of the Spline Reticulation algorithm. You know this will require a fairly large overhaul of the implementation which will take several weeks. Meanwhile other members of your team will need to continue some ongoing work on related areas of the codebase.
  >
  > You want to avoid branching for this work if at all possible, based on previous painful experiences of merging long-lived branches in the past. Instead, you decide that the entire team will continue to work on trunk, but the developers working on the Spline Reticulation improvements will use a Feature Toggle to prevent their work from impacting the rest of the team or destabilizing the codebase.

- **c24** Hodgson is explicit about what toggles **cost** and do **not** remove: they add carrying-cost inventory (abstractions or conditionals plus extra testing); they create a combinatoric validation problem; savvy teams treat flags as inventory to keep low and **proactively remove**.
  Source: url:https://martinfowler.com/articles/feature-toggles.html (Feature Toggles introduce validation complexity + Managing the carrying cost)
  > With feature-flagged systems our Continuous Delivery process becomes more complex, particularly in regard to testing. We'll often need to test multiple codepaths for the same artifact as it moves through a CD pipeline.
  >
  > We can see that with a single toggle in play this introduces a requirement to double up on at least some of our testing. With multiple toggles in play we have a combinatoric explosion of possible toggle states. Validating behavior for each of these states would be a monumental task.
  >
  > Feature Flags have a tendency to multiply rapidly, particularly when first introduced. They are useful and cheap to create and so often a lot are created. However toggles do come with a carrying cost. They require you to introduce new abstractions or conditional logic into your code. They also introduce a significant testing burden.
  >
  > Savvy teams view their Feature Toggles as inventory which comes with a carrying cost, and work to keep that inventory as low as possible.

- **c25** Fowler’s Feature Flag bliki says release flags should be the **last** choice: first break the feature into releasable parts; then a Keystone Interface; only then release flags.
  Source: url:https://martinfowler.com/bliki/FeatureFlag.html (Release flags are the last thing you should do)
  > Release flags are a useful technique and lots of teams use them. However they should be your last choice when you're dealing with putting features into production.
  >
  > Your first choice should be to break the feature down so you can safely introduce parts of the feature into the product.
  >
  > If you really must hide a partly built feature, then the best way is to use a Keystone Interface: build all of it save the UI entry point and add that UI in a single release cycle.
  >
  > Only if you can't do small releases or a Keystone Interface should you employ release flags.

- **c26** Fowler’s Keystone Interface is: integrate all back-end work on mainline as **latent code**, hold the user-visible entry point until the end; he still points at Feature Flags when the UI cannot be packaged as a simple keystone.
  Source: url:https://martinfowler.com/bliki/KeystoneInterface.html (opening + when it fails)
  > A useful technique to deal with this tension is to build all the back-end code, integrate, but don't build the user-interface. The feature can be integrated and tested, but the UI is held back until the end until, like a keystone, it's added to complete the feature, revealing it to the users.
  >
  > That said, there are cases when the UI can't be packaged into a simple keystone. When that's the case then it's time to use Feature Flags.

- **c27** Trunk-Based Development’s one-line claim is: one trunk, resist long-lived development branches, using documented techniques so you avoid merge hell.
  Source: url:https://trunkbaseddevelopment.com/ (One line summary)
  > A source-control branching model, where developers collaborate on code in a single branch called ’trunk’ and resist any pressure to create other long-lived development branches by employing documented techniques. They therefore avoid merge hell, do not break the build, and live happily ever after.

- **c28** TBD’s caveats name the techniques for **longer** changes: become adept at BBA; use feature flags in day-to-day work; short-lived feature branches if used last only a couple of days.
  Source: url:https://trunkbaseddevelopment.com/ (Caveats) and url:https://trunkbaseddevelopment.com/short-lived-feature-branches/ (One key rule)
  > Teams should become adept with the related branch by abstraction technique for longer to achieve changes, and use feature flags in day to day development to allow for hedging on the order of releases
  >
  > One key rule is the length of life of the branch before it gets merged and deleted. Simply put, the branch should only last a couple of days. Any longer than two days, and there is a risk of the branch becoming a long-lived feature branch (the antithesis of trunk-based development).

- **c29** TBD short-lived branches are **not** a place for two developers to share colliding work: one developer (or a pair), no intermediate merges to other people’s short-lived branches, no other developers joining that branch.
  Source: url:https://trunkbaseddevelopment.com/short-lived-feature-branches/ (Another key rule + Breaking the contract)
  > Another key rule is how many developers are allowed congregate on a short-lived feature branch. Another simple answer: the developer count should stay at one (or two if pair-programming). These short-lived feature branches are not shared within a team for general development activity.
  >
  > If you merged the part-complete short-lived feature branches to anywhere else, then you have broken the contract of trunk-based development. For short-lived feature branches, these are **not** allowed:
  >
  > 1. intermediate merges to main (trunk) - at least where the commit was not able to go live on its own
  > 2. merges (intermediate or not) to other people’s short-lived feature branches
  > …
  > 5. other developers joining you on your short-lived feature branches - at least who are not your pair-programming partner.

- **c30** TBD’s named pitfall for “one story, one PR” is to **split** a refactor and the new functionality into successive trunk integrations, not one fat branch.
  Source: url:https://trunkbaseddevelopment.com/short-lived-feature-branches/ (Pitfalls)
  > A mistake in thinking for this way of working, is one pull-request for one Agile story/card (and no more). Getting out of that mind trap would be to practice (say) a pull-request for refactoring and see that integrated/merged into the trunk, then a pull-request for a piece of new functionality (and integrated into trunk), then perhaps another refactoring (trunk integrated again).

- **c31** Fowler’s Feature Branch pattern: isolation defers merge risk until the feature is done, prevents early detection of problems, and **discourages refactoring**; short (day-or-two) features are the case where it still integrates often enough.
  Source: url:https://martinfowler.com/bliki/FeatureBranch.html (body)
  > This has the consequence that two people, working on different feature branches, do not integrate their work until the second one merges their work into the common codebase.
  >
  > They allow all the work done on a feature to kept away from a teams common codebase until completion, which allows all the risk involved in a merge to be deferred until that point. However this isolation does prevent early detection of problems. More seriously, it also discourages refactoring - and a lack of refactoring often leads to serious deterioration in the health of a codebase.
  >
  > The consequences of using feature branch depend greatly on how long it takes to complete features. A team that typically completes features in a day or two are able to integrate frequently enough to avoid the problems of delayed integration.

- **c32** Fowler names **Semantic Conflict**: a merge that is textually clean but the program behaves differently (e.g. one side renames a function, the other adds a caller of the old name); tooling only protects against textual conflicts.
  Source: url:https://martinfowler.com/bliki/SemanticConflict.html (definition + first point)
  > By a semantic conflict I mean a situation where Jez and I make changes which can be safely merged on a textual level but cause the program to behave differently
  >
  > The simplest example is that of renaming a function. … The problem appears, however, if Jez adds more calls to this method on his feature branch. When the two get merged, the textual merge will work fine, but the program will not run the same way.
  >
  > So the first point here is that however powerful your tooling is, it will only protect you from textual conflicts. The particularly annoying point is that semantic conflicts are harder to spot and harder to fix.

- **c33** Fowler’s mitigations for semantic conflicts are Self-Testing Code and **merging more often** (CI), not a smarter merge algorithm; he notes short (couple-of-day) feature branches hit fewer of them.
  Source: url:https://martinfowler.com/bliki/SemanticConflict.html (strategies + note 2)
  > We can't automatically resolve semantic conflicts. … There are, however, a couple of strategies that can significantly help us deal with them
  >
  > The first of these is SelfTestingCode. … The other technique that helps is to merge more often. Jez's difficulties are much less if he discovers my change in a few hours rather than in a few days. That way he's no longer building a lot of code on the old semantics. This is why we are such big fans of continuous integration.
  >
  > If your features are built quickly, within a couple of days, then you'll run into less semantic conflicts (and if less than a day, then it's in effect the same as CI). However we don't see such short feature branches very often.

- **c34** Fowler’s CI article repeats the same split (textual vs semantic) and the operational rule: everyone pushes to mainline frequently so a conflict is found within hours while little has happened.
  Source: url:https://martinfowler.com/articles/continuousIntegration.html (Everyone Pushes Commits To the Mainline Every Day)
  > If everyone pushes to the mainline frequently, developers quickly find out if there's a conflict between two developers. The key to fixing problems quickly is finding them quickly. With developers committing every few hours a conflict can be detected within a few hours of it occurring, at that point not much has happened and it's easy to resolve. Conflicts that stay undetected for weeks can be very hard to resolve.
  >
  > Conflicts in the codebase come in different forms. The easiest to find and resolve are textual conflicts, often called “merge conflicts”, when two developers edit the same fragment of code in different ways. Version-control tools detect these easily once the second developer pulls the updated mainline into their working copy. The harder problem are Semantic Conflicts.

- **c35** Fowler quotes Kent Beck (XP Explained) as the CI cadence: no code sits unintegrated for more than a couple of hours.
  Source: url:https://martinfowler.com/articles/continuousIntegration.html (Everyone Pushes Commits To the Mainline Every Day)
  > No code sits unintegrated for more than a couple of hours.
  >
  > -- Kent Beck

- **c36** Fowler’s CI taxonomy: Feature Branching is only **semi-integration** until you **push**; two people can both pull mainline daily and still not have integrated with each other; CI is defined as high-frequency push-and-pull, not as “finish the feature then merge.”
  Source: url:https://martinfowler.com/articles/continuousIntegration.html (Styles of Integration)
  > Teams using feature branches will usually expect everyone to pull from mainline regularly, but this is semi-integration. If Rebecca and I are working on separate features, we might pull from mainline every day, but we don't see each other's changes until one of us completes our feature and integrates, pushing it to the mainline.
  >
  > This is only semi-integration because each developer combines the changes on mainline to their own local branch. Full integration can't happen until a developer pushes their changes
  >
  > If a team is doing Feature Branching and all its features are less than a day's work to build, then they are effectively the same as Continuous Integration. But Continuous Integration is different in that it's _defined_ as a high-frequency style. Continuous Integration makes a point of setting integration frequency as a target in itself, and not binding it to feature completion or release frequency.

- **c37** TBD’s “committing straight to the trunk” page is explicit that disjoint-region auto-merges are only **textually** clean: two changes can auto-merge with zero VCS conflict and still break each other in meaning; only the build catches that class of problem.
  Source: url:https://trunkbaseddevelopment.com/committing-straight-to-the-trunk/ (Challenges)
  > Why the fast build matters even more in this style: with small commits streaming into the trunk, most of the merging happens silently. Two changes that touch the same file in different regions reconcile automatically as “disjoint region” merges and never raise a clash for a human to resolve. That is a good thing - but it is only _textually_ clean. Two changes can auto-merge with zero VCS conflict and still break each other in meaning - one renames a function in one region, another adds a caller in another, and the lines never overlapped so nothing flagged it. The merge algorithm cannot catch that class of problem; only the build can.

- **c38** Google’s SWE book defines a Large-Scale Change as logically related edits that **cannot** be submitted as one atomic unit, including because the change would **always have merge conflicts**.
  Source: url:https://abseil.io/resources/swe-book/html/ch22.html (What Is a Large-Scale Change?)
  > In our experience, an LSC is any set of changes that are logically related but cannot practically be submitted as a single atomic unit. This might be because it touches so many files that the underlying tooling can’t commit them all at once, or it might be because the change is so large that it would always have merge conflicts.

- **c39** Google’s observation at their scale is the opposite of “land the refactor as one fat commit”: as the codebase and engineer count grow, the largest possible atomic change **decreases**.
  Source: url:https://abseil.io/resources/swe-book/html/ch22.html (opening)
  > At Google, we’ve long ago abandoned the idea of making sweeping changes across our codebase in these types of large atomic changes. Our observation has been that, as a codebase and the number of engineers working in it grows, the largest atomic change possible counterintuitively _decreases_—running all affected presubmit checks and tests becomes difficult, to say nothing of even ensuring that every file in the change is up to date before submission.

- **c40** Google LSCs are typically generated by automated tooling (ClangMR, JavacFlume, Refaster, etc.) and the majority have **near-zero functional impact** (textual/refactoring migrations); they are not theoretically limited to that class.
  Source: url:https://abseil.io/resources/swe-book/html/ch22.html (What Is a Large-Scale Change?)
  > LSCs at Google are almost always generated using automated tooling. Reasons for making an LSC vary, but the changes themselves generally fall into a few basic categories:
  >
  > * Cleaning up common antipatterns using codebase-wide analysis tooling
  > * Replacing uses of deprecated library features
  > * Enabling low-level infrastructure improvements, such as compiler upgrades
  > * Moving users from an old system to a newer one
  >
  > The majority of LSCs across Google actually have near-zero functional impact: they tend to be widespread textual updates for clarity, optimization, or future compatibility. But LSCs are not theoretically limited to this behavior-preserving/refactoring class of change.

- **c41** Rosie is Google’s change-management platform that **shards** one large parent change into smaller, independently testable/reviewable/submittable commits (not one parallel long-lived refactor branch).
  Source: url:https://abseil.io/resources/swe-book/html/ch22.html (Change Management + Sharding and Submitting)
  > At Google, this tool is called Rosie, and we discuss its use more completely in a few moments when we examine our LSC process. In many respects, Rosie is not just a tool, but an entire platform for making LSCs at Google scale. It provides the ability to split the large sets of comprehensive changes produced by tooling into smaller shards, which can be tested, reviewed, and submitted independently.
  >
  > After a global change has been generated, the author then starts running Rosie. Rosie takes a large change and shards it based upon project boundaries and ownership rules into changes that _can_ be submitted atomically. It then puts each individually sharded change through an independent test-mail-submit pipeline.

- **c42** Google requires each LSC shard to be independently committable (no interdependence, or dependent files grouped), and states that traditional refactoring models **break at large scales**.
  Source: url:https://abseil.io/resources/swe-book/html/ch22.html (Testing under Sharding + TL;DRs)
  > For any LSC process, individual shards should be committable independently. This means that they don’t have any interdependence or that the sharding mechanism can group dependent changes (such as to a header file and its implementation) together.
  >
  > Traditional models of refactoring break at large scales.

- **c43** Google’s merge-conflict barrier for a large atomic change is the same “somebody is always committing” fact that two fat tickets hit: at their scale you cannot sneak a whole-repo edit through; smaller file counts shrink merge-conflict probability.
  Source: url:https://abseil.io/resources/swe-book/html/ch22.html (Merge Conflicts)
  > As the size of a change grows, the potential for merge conflicts also increases. Every version control system we know of requires updating and merging, potentially with manual resolution, if a newer version of a file exists in the central repository. As the number of files in a change increases, the probability of encountering a merge conflict also grows and is compounded by the number of engineers working in the repository.
  >
  > If your company is small, you might be able to sneak in a change that touches every file in the repository on a weekend when nobody is doing development. … At a large, global company like Google, these approaches are just not feasible: somebody is always making changes to the repository.
  >
  > With few files in a change, the probability of merge conflicts shrinks, so they are more likely to be committed without problems.

- **c44** Google’s version-control chapter rejects long-lived **dev branches** as a stability strategy: the same commits will merge to trunk eventually; small merges by the author are easier than batching unrelated work; they prefer trunk-based development, tests/CI, a green build, and **runtime disable** of incomplete features.
  Source: url:https://abseil.io/resources/swe-book/html/ch16.html (Dev Branches)
  > We believe that a version control policy that makes extensive use of dev branches as a means toward product stability is inherently misguided. The same set of commits are going to be merged to trunk eventually. Small merges are easier than big ones. Merges done by the engineer who authored those changes are easier than batching unrelated changes and merging later (which will happen eventually if a team is sharing a dev branch).
  >
  > The alternative requires a different paradigm: trunk-based development, rely heavily on testing and CI, keep the build green, and disable incomplete/untested features at runtime. Everyone is responsible to sync to trunk and commit; no “merge strategy” meetings, no large/expensive merges. And, no heated discussions about which version of a library should be used—there can be only one. There must be a single Source of Truth.

- **c45** Kent Beck’s own 2012 wording (via X’s oEmbed of the tweet he wrote) is sequential: for each desired change, first make the change easy (possibly hard), **then** make the easy change.
  Source: url:https://publish.twitter.com/oembed?url=https://twitter.com/KentBeck/status/250733358307500032 (tweet 250733358307500032, 25 Sep 2012)
  > for each desired change, make the change easy (warning: this may be hard), then make the easy change

- **c46** Feathers’s own definition (publisher excerpt of *Working Effectively with Legacy Code*): a **seam** is a place you can alter behavior **without editing in that place**; object seams are one kind; the point is to exclude dependencies or substitute behavior without editing the call site.
  Source: url:https://www.informit.com/articles/article.aspx?p=359417&seqNum=2 (Seams)
  > A seam is a place where you can alter behavior in your program without editing in that place.
  >
  > This seam is what I call an _object seam_. We were able to change the method that is called without changing the method that calls it.
  >
  > If we can replace behavior at seams, we can selectively exclude dependencies in our tests. We can also run other code where those dependencies were if we want to sense conditions in the code and write tests against those conditions.

- **c47** Fowler’s Legacy Seam bliki (citing Feathers) adds the displacement use: once you have a seam you can redirect program flow to **new modules** as part of legacy displacement.
  Source: url:https://martinfowler.com/bliki/LegacySeam.html (opening + most valuable use)
  > When working with a legacy system it is valuable to identify and create seams: places where we can alter the behavior of the system without editing source code. Once we've found a seam, we can use it to break dependencies to simplify testing, insert probes to gain observability, and redirect program flow to new modules as part of legacy displacement.
  >
  > But probably the most valuable use of seams is that they allow us to migrate behavior away from the legacy. A seam might redirect high-value customers to a different shipping calculator. Effective legacy displacement is founded on introducing seams into the legacy system, and using them to gradually move behavior into a more modern environment.

- **c48** The Mikado Method’s authors (Ellnestam and Brolund), via Manning’s book page, describe a single-goal process: map intertwined dependencies and extract them one at a time so the “central issue” can be approached without collapsing the project; isolate and resolve core concerns with minimal disruption.
  Source: url:https://www.manning.com/books/the-mikado-method (about the technology + what's inside)
  > The game "pick-up sticks" is a good metaphor for the Mikado Method. You eliminate "technical debt" -- the legacy problems embedded in nearly every software system -- by following a set of easy-to-implement rules. You carefully extract each intertwined dependency until you expose the central issue, without collapsing the project.
  >
  > * Isolate and resolve core concerns while creating minimal disruption
  > * Create a roadmap for your changes

- **c49** Graphite’s vendor docs (labelled as such) define stacked diffs as a **series of small dependent changes** of one line of work, each a PR, merged independently; they claim frequent small merges reduce significant merge conflicts. This is a coordination tactic for *dependent* slices, not a statement that two unrelated colliding efforts should share a stack.
  Source: url:https://graphite.dev/guides/stacked-diffs (What are stacked diffs? + Benefits) — vendor docs
  > Stacked diffs, also known as stacked changes or stacked pull requests, is a workflow concept that involves stacking a series of small, dependent changes atop one another. This method allows developers to review and merge small changes independently
  >
  > Stacked diffs refer to a series of changes where each change depends on the previous one. Each 'diff' in the stack is a small, self-contained change that builds upon the change before it. This contrasts with the traditional model where large changes are reviewed in a single, monolithic pull request.
  >
  > 4. Reduced merge conflicts: By frequently merging small changes, the likelihood of significant merge conflicts is reduced.

- **c50** Phabricator’s own “Writing Reviewable Code” (Facebook/Phabricator practice): each commit is one cohesive idea; if you hit a preexisting bug while building a feature, **checkpoint the feature, fix the bug on clean HEAD, then rebase the feature on the fix** — two ideas, two commits, not one mixed change.
  Source: url:https://secure.phabricator.com/book/phabflavor/article/writing_reviewable_code/ (Many Small Commits)
  > Each commit should do one thing. Generally, this means that you should separate distinct changes into different commits when developing. For example, if you're developing a feature and run into a preexisting bug, stash or checkpoint your change, check out a clean HEAD/tip, fix the bug in one change, and then merge/rebase your new feature on top of your bugfix so that you have two changes, each with one idea ("add feature x", "fix a bug in y"), not one change with two ideas ("add feature x and fix a bug in y").

- **c51** Phabricator’s “Recommendations on Branching” (Facebook/Phabricator flavor text): do **not** put feature branches in the remote; control access with **runtime configuration**; multiple feature branches make interactions untestable until merge; if a new feature replaces an old one, **both must exist in the same codebase for a while**.
  Source: url:https://secure.phabricator.com/book/phabflavor/article/recommendations_on_branching/ (Overview + Feature Branches)
  > * Never put feature branches in the remote/origin/trunk.
  > * Control access to new features with runtime configuration, not branching.
  >
  > When you have multiple feature branches, it's impossible to test interactions between the features until they are merged.
  >
  > If a new feature replaces an older feature, both have to exist in the same codebase for a while. But even with feature branching, you generally have to do almost all this work anyway to avoid situations where you flip a switch and can't undo it.

- **c52** Humble records that BBA without an exit strategy leaves multiple technologies in play, which the team then has to understand — an acceptable trade-off only if visible.
  Source: url:https://continuousdelivery.com/2011/05/make-large-scale-changes-incrementally-with-branch-by-abstraction/ (How branch by abstraction works)
  > It's important to have an exit strategy for branch by abstraction. When you have the freedom not to push a large-scale change all the way through, it's very tempting just to leave it half-done once the most critical bits of migration have been completed. But having multiple technologies in play makes the system harder to maintain and means the team has to understand all of the moving parts that are in play. This may be an acceptable trade-off, but it should be visible to the whole team.

## Implications for two large concurrent changes

What the claims support, and only that:

A named set of **in-code** patterns exists for putting a replacement beside an old path so other work can keep landing: Branch by Abstraction (c1–c4, c15), Strangler Fig at system/legacy scale (c9, c16–c17), Parallel Change / expand–migrate–contract including evolutionary databases (c18–c21), Feature Toggles / flags (c22–c24, c51), Keystone Interface (c25–c26), and Feathers seams as the enabling point that lets you redirect without editing the call site (c46–c47). Humble separates BBA (component replacement on mainline) from toggles (hide a feature) and from strangler (whole-system replacement) (c8–c9). Hammant’s owner pages refuse “branch by if condition”; Fowler’s BBA note and Hodgson’s toggle article allow flags beside a second implementation (c5–c8, c22). That disagreement is in the sources.

Those patterns **require** an indirection (abstraction, seam, extra schema/API, or toggle point), two implementations or two access paths live at once, and a later delete/contract step (c2, c4, c6, c18–c21, c24, c52). They **explicitly do not** solve: long parallel support of old APIs (c14); a codebase with no seam / big ball of mud (c11); the carrying cost and combinatoric tests of leftover flags (c24); confusion and rot if contract/exit never runs (c19, c52); or semantic merge conflicts — merge tools only see text (c12, c32–c34, c37).

For two **conceptually unrelated** efforts that still collide on files, the trunk-based / CI / Phabricator / Google sources do not say “share a fat branch.” They say integrate to a single trunk in small steps so each collision is hours old (c27, c34–c36, c44); do not park two developers on one short-lived branch or merge those branches to each other (c29); split a refactor PR and a functionality PR rather than one story-sized branch (c30, c50); prefer runtime hiding or BBA over remote feature branches (c28, c51); and treat feature-branch isolation as something that delays detection and **discourages refactoring** (c31). Graphite stacked diffs are vendor docs for **dependent** slices of one line of work, not for two unrelated colliding tickets (c49). Humble’s BBA payoff is that a restructuring can be **paused** so a higher-priority feature still ships from a working mainline — coexistence via seam, not via two fat branches (c10).

Google Rosie/LSC, in the owners’ words, is a way to **land a refactor as many tiny independently committable shards** because a large atomic change would always hit merge conflicts and traditional refactoring breaks at scale (c38–c43). It is not described as a parallel long-lived refactor track running beside feature branches.

Beck’s own sentence is ordered: make the change easy, **then** make the easy change (c45). Combined with TBD’s refactor-then-feature PRs (c30) and Phabricator’s “two ideas, two commits” (c50), the sources describe the enabling slice as a **prerequisite** that lands first, not as a second fat parallel track.

The honest account of both sides touching the same module for different reasons is Fowler’s Semantic Conflict plus TBD’s disjoint-region auto-merge (c32–c34, c37): the VCS can be green and the program still wrong; tests and frequent mainline integration are what the owners offer, not a merge tool that understands intent.

## Failed fetches

Reached via `proxy: "http://127.0.0.1:23379"` unless noted.

- `https://twitter.com/KentBeck/status/250733358307500032` — HTTP 403; tweet text recovered from X oEmbed (`c45`).
- `https://testing.googleblog.com/2016/08/the-language-of-large-scale-changes.html` and `https://testing.googleblog.com/2017/05/code-health-large-scale-changes.html` — HTTP 404.
- `https://google.github.io/eng-practices/review/developer/small-cls.html` — fetch blocked (fake-IP/SSRF range).
- `https://cacm.acm.org/research/why-google-stores-billions-of-lines-of-code-in-a-single-repository/` — HTTP 403.
- `https://research.google/pubs/pub43751/` — fetched but was the wrong paper (SoC/memcached).
- `https://trunkbaseddevelopment.com/application-strangulation/` — HTTP 404.
- `https://martinfowler.com/articles/workflowsOfRefactoring.html` — HTTP 404 (infodeck lives at the trailing-slash URL and did not yield quoteable slide text).
- `https://graphite.dev/docs/stacking-changes`, `https://graphite.dev/docs/cli/creating-a-stack`, `https://www.graphite.com/docs/stacking` — HTTP 404; used `https://graphite.dev/guides/stacked-diffs` instead.
- `https://www.oreilly.com/library/view/tidy-first/9781098151238/` — HTTP 403; Beck primary used is the tweet oEmbed, not *Tidy First?*.
- `https://databaserefactoring.com/SplitColumns.html` — extract incomplete; expand/contract taken from Fowler/Sadalage `evodb` (`c21`).
- `https://livebook.manning.com/book/the-mikado-method/chapter-1` — paywall/stub; Mikado taken from Manning’s author/book page (`c48`).
- Wayback snapshots of the Beck tweet returned an interstitial, not the tweet body.

Google LSC/Rosie claims therefore rest on the first-party SWE book chapters on abseil.io (`c38–c44`), not the Testing Blog or ACM HTML.
