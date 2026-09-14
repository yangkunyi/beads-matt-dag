SOURCE-URL: https://sankalp.bearblog.dev/autoresearch/
FETCHED: 2026-09-14T17:25:25+08:00
HTTP: 200

Auto-research with codex: How I achieved a 232x Faster Kernel over baseline with Codex in GPU Mode's qr_v2 problem – sankalp's blog
↑
sankalp's blog
Home Featured Blog About
Auto-research with codex: How I achieved a 232x Faster Kernel over baseline with Codex in GPU Mode's qr_v2 problem
08 Jul, 2026
Table of Contents
Intro
Contest in short
Problem intro
Why this problem is auto-research-able
Learning Enough to Ask Better Questions
(Optional) Math for QR decomposition: Householder reflections
Make serial work small with the help of the blocked Householder algorithm
Other challenges
Codex-maxxing
Kernel progress breakthroughs
Breakthrough ideas
Introducing idea diversity to escape the local maxima
Implementation Hints
What I could have done better
Conclusion
References
Acknowledgements
Intro
Contest in short
GPU Mode, in collab with Core Automation, recently hosted an auto-research themed contest. The problem statement was to implement batched square compact-Householder QR factorization aka QR decomposition . I placed 12th out of 183 participants, ending up with a 232x speedup over the baseline solution. This post is about how I got there. I will go through my approach, learnings, and bottlenecks I ran into during the contest. It was my first serious attempt at auto-research. Some people will call this "loop engineering", and honestly that is fine too.
Note that you don't need to go through the mathematics or the problem itself in detail to follow most of this blog post. I have focused on my approach while keeping the math and the problem itself secondary as most people who will read this won't have participated in the contest.
You can check out the full contest page here: Problem Link and Leaderboard
This contest was part of GPU Mode's Linear Algebra Kernels in the Age of Research series.
Problem intro
We were given a batch of square FP32 CUDA matrices A with shape batch x n x n , and had to return the same compact Householder QR representation as torch.geqrf(A) : an H matrix whose upper triangle is R and whose lower triangle stores Householder vectors, plus a tau vector of reflector coefficients. The checker rebuilt Q with torch.linalg.householder_product(H, tau) , took R = triu(H) , and verified:
A ≈ Q R , Q ⊤ Q ≈ I , Q ⊤ A ≈ R
Among correct submissions, the leaderboard ranked runtime by geometric mean across shapes and conditioning cases. The important sizes were batched square matrices like 512 x 512 , with larger 1024 , 2048 , and 4096 cases too. Low-bit FP16, FP8, or NVFP4 was allowed internally, but returned factors still had to satisfy FP32-style QR checks.
A tiny 3 x 3 example is:
A = [ 12 − 51 4 6 167 − 68 − 4 24 − 41 ] = [ 6 / 7 − 69 / 175 − 58 / 175 3 / 7 158 / 175 6 / 175 − 2 / 7 6 / 35 − 33 / 35 ] ⏟ Q [ 14 21 − 14 0 175 − 70 0 0 35 ] ⏟ R
Here Q is orthogonal, which means its columns are unit-length and perpendicular to each other, and R is upper triangular, which means everything below the diagonal is zero. The contest was not asking us to print dense Q and R directly; it asked for the compact Householder version that lets the checker reconstruct Q and read R from the upper triangle.
For the 3×3 example above, the very first reflector maps the first column (12, 6, −4) straight onto (−14, 0, 0) in one shot. The −14 becomes R 11 . How that works is in the math section.
Why this problem is auto-research-able
GPU Mode provides participants with the popcorn CLI making it agent-friendly. Agents can use this to test, benchmark, and submit to the leaderboard directly. The checker also provided shape-wise feedback along with the overall geometric mean timing.
Astute observers will notice this is an apt setup for writing a loop. Agents yearn for tight feedback loops. They allow them to hill-climb to their heart's content.
GPU Mode contests usually give you some way to iterate on kernels. Either you submit directly, or a sponsor like Modal chips in credits. Here the organizers basically allowed unlimited submissions as long as you spaced them out. If you didn't, the queues got long and everybody's runs timed out. At one point the workspace even ran out of Modal credits because everyone had been hammering submissions. It's a nice way to make learning accessible.
Over the course of 14 days, I made over 1500 submissions.
Learning Enough to Ask Better Questions
I have known the basics of GPU kernel optimization (mainly in Triton with some understanding of CUDA) for a year, but haven't worked in this domain professionally. What I am trying to tell you is that I was an underdog among the people around me on the leaderboard. The person just above me on the leaderboard (CUDA Colonel) is a principal engineer at NVIDIA.
Anyway aura farming aside, since I know the basics and had recently read about GatedDeltaNet, I was fresh on the general GPU kernel lingo.
The better you know something, the better you can prompt the LLMs, because you convert unknown unknowns into known unknowns.
At the same time, it's worth noting that this contest was doable without domain knowledge - like you probably won't make it to the top 10, but you can get a respectable speedup over baseline by just relying on your harness/agent loop or whatever.
My first steps in the contest were to learn what QR decomposition is and how it can be done. There are a bunch of ways to do it - like Gram-Schmidt and Householder reflections. The contest mandated Householder reflections. I went back and forth with Claude and watched a few YouTube videos to build intuition. After my discussions with Claude, it was clear that we needed to use the blocked Householder algorithm as the main architecture with the trailing WY-update. As it turns out, GPT-5.5 also had a good idea about this. QR decomposition is a fairly well known problem.
I found the concept interesting as matrix decompositions show up in several modern optimizer variants for LLM training, especially in methods that use matrix preconditioning, such as Shampoo-style optimizers and related approaches. Muon (used by Kimi) is another good example: instead of treating a weight update as one giant flattened vector, it keeps the matrix structure around and orthogonalizes the momentum update, usually through a few Newton-Schulz iterations that approximate the polar factor.
(Optional) Math for QR decomposition: Householder reflections
I recommend skimming through this section if you are curious about the math otherwise feel free to skip. The only thing to note is that
there is a sequential dependency in Householder QR which makes it problematic to do GEMM. We use blocked Householder to make it more matrix-multiplication shaped.
The contract
Quickly reviewing the contract: input is a batch of square FP32 matrices A ; output is the compact (H, tau) format that torch.geqrf returns. The upper triangle of H is R . Below the diagonal, H stores the Householder vectors, and tau stores one scalar per column. The checker rebuilds Q from (H, tau) and verifies A ≈ QR .
Mirrors
Forget matrices for a second. In a bathroom mirror, your reflection is exactly as far behind the glass as you are in front of it, straight through.
If x ⟂ is the part of x sticking out perpendicular to the glass, reflection just subtracts that part twice:
x reflected = x − 2 x ⟂
So a Householder reflection is about finding the perpendicular part and subtracting it twice.
Storing the mirror
A Householder vector is the mirror, stored compactly. In code, we don't carry around the whole mirror plane. We store one vector v sticking straight out of it. The mirror is everything perpendicular to v , and the reflection moves along v .
The perpendicular part is just the shadow of x along v , which is v ⊤ x v ⊤ v copies of v . Plug that into the subtraction above:
ℋ x = x − τ v ( v ⊤ x ) , τ = 2 v ⊤ v
So tau is just 2 v ⊤ v : the factor of 2 and the length of v bundled into one precomputed number. v picks the mirror, tau scales the update. (I'll write the mathematical reflector as ℋ j and reserve H for the compact output matrix.)
Householder reflection in 2D
tau = 0.00
A simplified 2D Householder step. Drag the orange vector: the purple mirror changes so the green reflected vector lands on the horizontal axis. In higher dimensions, landing on the axis is exactly what makes the below-diagonal entries become zero.
Why QR cares about mirrors
QR wants to turn A into an upper-triangular matrix R . Column 1 should become something like (*, 0, 0) , column 2 should have zeros below row 2, and so on.
A Householder mirror is useful because it can do that to a column in one shot. Take the first column of the 3×3 example above: (12, 6, -4) . We want to send it to the x-axis so the lower entries become zero. A reflection can only change direction, not length, so the target must also have length 14. One valid target is (-14, 0, 0) . After that reflection, the 6 and -4 entries are gone, which is exactly what we wanted.
How do we find the mirror? It sits halfway between the column and its target, so v , the vector poking through the mirror, is just the column minus its target:
v = (12, 6, -4) - (-14, 0, 0) = (26, 6, -4)
The Householder update
Then compute tau = 2 / (vᵀv) . The reflector itself is:
ℋ = I − τ v v ⊤ , τ = 2 v ⊤ v
ℋ x = ( I − τ v v ⊤ ) x
ℋ x = x − τ v ( v ⊤ x )
ℋ A active = ( I − τ v v ⊤ ) A active
ℋ A active = A active − τ v ( v ⊤ A active )
This turns the current column into (-14, 0, 0) and rewrites the other columns consistently, so the next reflector is built from the updated matrix.
We keep doing this once per column. In rough notation, the repeated updates look like:
A ( 1 ) = A ( 0 ) − τ 1 v 1 ( v 1 ⊤ A ( 0 ) )
A ( 2 ) = A ( 1 ) − τ 2 v 2 ( v 2 ⊤ A ( 1 ) )
A ( 3 ) = A ( 2 ) − τ 3 v 3 ( v 3 ⊤ A ( 2 ) )
⋯
R = A ( n )
Each line uses the matrix produced by the previous line. Each reflector zeroes out everything below the diagonal of its column without disturbing the columns already finished. After the last one, A has walked down to an upper-triangular R :
A = ℋ 1 ℋ 2 ⋯ ℋ n ⏟ Q R
Mirrors don't change lengths or angles, so each ℋ j is orthogonal, and so is their product Q . That's where the orthogonality the checker verifies comes from for free.
What's the compact format
Once column j is processed, everything below its diagonal is dead space. geqrf reuses those slots to stash the tail of v_j (the leading 1 is implicit). On and above the diagonal you're looking at R ; below it, the reflectors; and tau rides along as a separate vector. That's why the checker needs both H and tau to rebuild Q .
Compact geqrf storage (n = 6)
hover a column
H (upper triangle = R, below diagonal = reflector tails)
tau (one scalar per reflector)
r entries of R
tail of v j
τ j
One matrix, two payloads. Hover (or tap) any column j: the below-diagonal slots of that column are zero after reflector j fires, so geqrf reuses them to store the tail of v j . The leading 1 (shown on the diagonal when highlighted) is implicit. Pair each column with its τ j and the checker can rebuild Q.
Make serial work small with the help of the blocked Householder algorithm
Householder QR zeroes out A below the diagonal one column at a time. Each step builds a reflector from the current column and applies it to everything on the right. The problem is reflector j+1 is built from the matrix after reflector j has already hit it. So you can't reorder the steps and you can't fuse them. It's serial, and the serial matrix-vector work runs in the slow vector lanes of the SM while the tensor cores just sit there idle.
Householder QR, one reflector at a time (n = 5)
math view: zeros appear, trailing block gets rewritten
original a
final entry of R
rewritten by this reflector
0 zeroed (v j gets stashed here)
Reflector j zeroes column j below the diagonal and finalizes row j of R. But it also rewrites the entire orange trailing block, and reflector j+1 can only be built from that rewritten block. That data dependency is the serial chain the blocked algorithm attacks.
The classic fix is the blocked algorithm. You pick a narrow panel of b columns (say 32 or 64) and do all the serial work inside it. That's fine, because the panel is only b columns wide, so it stays cheap. Then, instead of applying the panel's b reflectors to the rest of the matrix one at a time, you compress them into a single rank-b update (the "WY representation") and hit the entire trailing block in one shot with three back-to-back matrix multiplies. The serial work stays confined to the panel, and everything else turns into GEMMs, which is exactly the shape the tensor cores want.
Concretely, the WY representation collapses a panel's b reflectors into a single rank- b update. Stack the panel's Householder vectors as columns of V = [ v 1 , v 2 , … , v b ] , build a small b × b upper-triangular T , then:
ℋ 1 ℋ 2 ⋯ ℋ b = I − V T V ⊤
and the trailing-block update becomes three GEMM-shaped steps:
W = V ⊤ A trail
Z = T ⊤ W
A trail ← A trail − V Z
Blocked Householder (n = 6, panel width b = 2)
confine the serial work, GEMM the rest
final entry of R
stored v (panel, serial)
rewritten by the rank-b update
untouched
The serial column-by-column work from the previous figure still happens. But only inside the narrow blue panel, where it's cheap. The b reflectors are then compressed into I − V T V ⊤ and slam the whole trailing block at once: three GEMMs instead of b separate rank-1 updates. The panel then slides onto the orange block and the story repeats.
The panel is where the serial matrix-vector work is stuck, but it is only b columns wide. Everything to its right is the big trailing block, and that is pure GEMM. As the panel walks down the diagonal, the trailing block shrinks.
If you want to understand the math, I recommend brainstorming with Claude. Also check out Mike's writeup where he has covered math in a more descriptive and visual way than me. He placed 5th in the contest and shared his learnings focusing on the problem.
Other challenges
Two more things proved to be challenging: reliably using low precision internally (especially for ill-conditioned inputs), and coping with the wide spread of shapes (n = 32, 176, 352, 512, 1024, 2048, 4096) and batch sizes, where the largest matrices had too few batches to fill the tensor cores while n = 32 was so small we had to pack many matrices into one kernel launch.
Codex-maxxing
Why I picked Codex
I participated with ChatGPT Pro (200 USD subscription) and Claude Pro (20 USD subscription). I also used Modal for profiling (they provide 30 USD worth of credits free every month btw).
I chose Codex mainly because:
I had the bigger subscription.
From prior experience, my intuition was that OpenAI models are better at Triton.
/compaction works very well in Codex.
Setting up the harness
After I got a basic understanding, I asked Codex to do the basic setup: add problem_statement.md, mention basic details in AGENTS.md on how to submit and use popcorn CLI, and maintain a log.md where we did bookkeeping of the submissions and their status (accept/reject along with shape-wise timings). If we have to contrast with Karpathy's auto-research, my AGENTS.md and problem_statement.md were initially my program.md .
Logs serve as the evidence of the ideas that worked and didn't work. Future agent sessions could read the logs and quickly check if an idea had been tried or not. I put more investment into logging after the 3000 µs mark as things started to get harder.
Just tell it what to do
The cool thing about Codex is you can just tell it to do stuff and it will actually do the stuff. You can make it work for hours if you give it a detailed enough prompt with targets. It knows all the math and code, and it has all the feedback it needs. I had this intuition, but I was still surprised by how much GPT-5.5 could push the performance beyond the baseline solution (which was the torch.geqrf/cuSolver function).
My initial few sessions were manual prompts to implement a solution in Triton and optimize for the n = 512 and n = 1024 shapes, as they had the most weight in the final geometric mean.
Steering with /goal
However, if you want to make the model loop until a certain objective is achieved, use /goal . You can give specific, achievable, quantitative goals. I found that giving a good numeric goal followed by specific criteria worked well.
Example: "Use only Triton or CUDA and beat our active best's n = 512 timings. Try several ideas either by submitting directly to the leaderboard or using Modal profiling. Remove cuSolver altogether in the new set of experiments. We will only use it as a fallback."
At one point, this goal ran for over a day.
I gave inputs every 2-3 hours to move the model in the direction I wanted. I also let it run without supervision overnight on some days. In the initial few days, my instructions were mostly around steering the model to try out different ideas (more on this later) for different shapes, shouting at it to use more Triton, less PyTorch, and fewer fallbacks! A lesson I learned here: I often had the itch to check on my agents frequently, but you gotta trust it and let it do its work. Get out of the agent's way you must; steer it back only when it gets stuck.
Checking in without pausing the loop
When using /goal , you can ask the model questions without pausing the loop by using /btw or /side . This creates a temporary thread with context from your main conversation. I liked this way of checking on the agent and providing oversight.
I would ask questions like: Are you winning son? What algorithm/changes are there in the current active submission? Explain this concept to me. What are the ideas you are currently working on? What's the progress? What are some recent breakthroughs? Can we transfer it to another shape? What are your next best ideas? Based on the responses, I would consult Claude to improve
my understanding of the concepts and bottlenecks involved and then provide my thoughts to Codex. After questioning, I would just go back to the main thread and dump thoughts to steer the model.
if a /goal or some loop type thing is running, then either you can queue up the instruction in codex to ask stuff or you can do /btw. (img me checking on codex to ask what's it doing, what next ideas are etc.). if you do esc to interrupt the loop, then the /goal pauses https://t.co/Yx6EpH5PKo pic.twitter.com/imqZc6RPkz
sankalp (@dejavucoder) June 27, 2026
The baseline torch.geqrf path was around 419 ms (419,000 µs) overall. I was able to reach 5000 µs within a day on the n = 512 shape after implementing the blocked Householder route for that shape. This was the shape weighted most heavily in the geomean.
The 232x number above comes from comparing the rough 419,000 µs baseline to the final 1,805 µs tracked result. The lineage chart below starts from the first recovered point in my tracked submission history, so it shows the later 108,803 to 1,805 µs arc rather than the full baseline-to-final ratio.
When optimizing kernels, making the work more matrix-shaped so the tensor cores stop being idle is your life's purpose.
Optimizations were much harder after the 3000 µs point. I had to get more involved in the loop in terms of learning the concepts and steering the model. I gave Modal profiling access to Codex and let it run torch profiling / nsys profiling to test out different ideas, compare implementations, and sweep parameters faster. (Later on, the organizers also provided a way to do NCU profiling.)
Kernel progress breakthroughs
QR v2 · B200 full-table geomean
103 best submissions · Jun 15 – Jun 30, 2026 · 108,803 → 1,805 µs (−98.34%)
new best
big jump (≥2.5%)
hover / tap a dot · scroll or pinch to zoom, drag to pan, double-click to zoom in
+
−
↺
Breakthrough ideas
The rough structural evolution of the QR kernel, from baseline/library-heavy paths toward custom panel work, fused assembly, and GEMM-shaped trailing updates:
# |
Structural change |
What it did |
Type |
Geomean |
1 |
torch.geqrf everywhere |
Generic QR for every shape |
starting point |
>108.8k µs |
2 |
Blocked WY QR on n512 |
Panel factor + trailing update |
algorithm / routing |
108.8k µs |
3 |
Blocked route on all shapes |
n32 full-QR, LARFB16 updates |
algorithm / routing |
10.2k µs |
4 |
Triton panels + grouped WY |
panel16/32 kernels, grouped updates |
kernel / runtime |
4.3k µs |
5 |
Cholesky-ORHR for n4096 |
Gram, Cholesky, rebuilt reflectors |
algorithm / routing |
4.0k µs |
6 |
CUDA graph replay |
Capture routes, kill launch overhead |
kernel / runtime |
3.4k µs |
7 |
Fused V/T layout assembly |
No slice copies, cats, temporaries |
kernel / runtime |
2.75k µs |
8 |
split16 panels + tail-Gram |
Skip full WY near tails |
algorithm / routing |
2.5k µs |
9 |
Fixed-shape kernel specialization |
Hardcoded rows, fused reductions |
kernel / runtime |
2.0k µs |
10 |
Composed superpanels, custom Cholesky |
V256/T256 packs, direct-H returns |
kernel / runtime |
1.80k µs |
There was a lot of back and forth on profiling the entire shape and then identifying the bottlenecks. For this problem, launch overhead and panel overhead dominated. We were rarely memory or compute bound. Most of the effort was spent finding ways to reduce panel overhead and make the WY-update more GEMM-able.
Questions I found myself repeatedly asking:
What is panel overhead/launch overhead? How do we solve it?
What info are we missing and how can we get it?
What's the latest profile that you have done? What's your take on it?
Look for fusion candidates. Are there Triton fusion-level candidates?
Look for possible compiler-based optimizations. What can we convert from a runtime signal to a static signal? The idea was to give compiler hints. I once had a 200 µs jump because of this
Asked it a few times to look at Triton-generated compiled artifacts
What are some numerical tricks to exploit the precision slack?
Can you deploy sub-agents to do some math and find possible optimizations?
Deploy agents to search for bugs that may be bogging us down
Are there reduction fusions possible? I saw Codex discover one and then I started hammering it often. Reductions are operations like doing a sum or finding max. Since work needs to be done to iterate through the entire sequence, we can perform multiple of these in a single go.
Asking good questions is all you need
Introducing idea diversity to escape the local maxima
A major challenge I started facing in the 3000 -> 1800 µs range was the model getting stuck in local maxima.
This looked like endless hand-tuning of parameters and small variants of the same idea.
A couple of years ago, agents got stuck in (doom) loops because they were not smart enough or just didn't have the knowledge (or the verification loop was not robust enough). People used to experiment with sampling, temperature variation and different decoding strategies for this.
Then over time, models got smart enough, pretrained on newer knowledge, and we got tons of RL scaling and inference-time compute (training the model to think for a larger number of tokens).
Now the models struggle with finding new ideas and "research taste" - what next best idea/experiment should we do given the verifier feedback, prior evidence, and our evals (profiler feedback in our case). Good idea generation is the next great adventure. I recently wrote an article too on this theme.
I used the following strategies to help the model get out of local maxima:
The beam-of-candidates idea: keep multiple promising idea families alive instead of forcing every experiment to beat the current best immediately.
Beam of candidates: For a long time, I did a dumb thing. I kept a single best candidate against which new candidates were tested. If the agent tries a new structural idea or a significantly big change, then it's highly likely that it would score less than our current best submission. However, after a few iterations, that change may outperform our best candidate. With this observation, I introduced some instructions to maintain a beam of 3-5 candidates.
Human in the loop: I would act as the secret sauce to steer the model when it was stuck for long times without improvement
Encourage the model to take more risks and try ambitious ideas. You will not believe it but this worked. Also, Claude would often give up after a few rounds, with excuses like "we have exhausted all optimizations to reach x geomean"; Codex, on the other hand, is more persistent.
Use a stronger advisor model that produces more varied ideas. In my harness, this would look like an instruction
in AGENTS.md to encourage the model to use headless calls claude -p to get ideas, provide profiling data, etc.
Instruct the model to frequently use sub-agents to try out ambitious ideas, search the web for blogs and papers, go through the list I mentioned above, and find micro-optimizations
Profile using NCU and Modal, compare the results, and work on bottlenecks that both Modal and NCU profiling pointed out
Cleanup
Clear context, start fresh
Clean up the environment, move older submission files to archives
Occasional iterations to simplify code, remove dead code, renaming/refactoring
A multi-agent swarm approach is something I thought of but didn't try.
I think the strong advisor strategy (like GPT-5.6 Sol or Fable) is going to be a standard strategy in auto-research flows. Think very big models with state-of-the-art training. Claude Code provides an /advisor command for this too.
We're bringing the advisor strategy to the Claude Platform.
Pair Opus as an advisor with Sonnet or Haiku as an executor, and get near Opus-level intelligence in your agents at a fraction of the cost. pic.twitter.com/fRkegyMs5t
Claude (@claudeai) April 9, 2026
Implementation Hints
My directory structure looked like this by the end:
qr/
├── submission.py # the live entry
├── submission_*.py (560) # named submission variants (crystal_rain, blue_reply, …)
├── modal_b200_*.py (119) # Modal B200 probe / compare scripts
│
├── AGENTS.md # top-level notes / logs
├── attempts_log.md
├── claude_ideas.md
├── leaps.md
├── problem_statement.md
│
├── docs/ ( 68) # per-experiment writeups & status docs
├── code/ # the actual QR kernel source tree
├── scripts/ # summarizers, timing, submit helpers
├── archive/ # cleaned-out old submissions & probes
│ ├── submissions_20260616_17/
│ ├── submissions_20260618_20/
│ ├── probe_scripts_cleanup_20260627/
│ └── …
├── submit_logs/ # logs provided by the evaluator for each submission
└── profile.*/ # captured NCU profile runs
Here's what my AGENTS.md looked like by the end:
Leaderboard Agent Notes
This workspace is for leaderboard-style optimization work. Follow these standing instructions unless the user explicitly overrides them.
Submission Discipline
Don't hesitate to use sub-agents. Give them relevant instructions so they can do their task.
Profile after major changes or major score gains.
Use an advisor model when you are stuck or need fresh ideas. It can help break tunnel vision.
Don't be afraid to implement hard tasks.
Don't hesitate to take risks.
Be open to new ideas and search the internet at times for new idea exposure.
Before submitting, run the cheapest available sanity check for the candidate file.
Keep submission logs under submit_logs/ .
Always save submit output into a timestamped log.
Space leaderboard submissions out. Do not stack rapid back-to-back submissions unless explicitly asked.
Treat a timeout as inconclusive, not as a correctness/performance rejection.
Treat a completed residual failure or timing regression as real evidence.
Only completed pass/fail/timing output is evidence.
Beam Search Discipline
Do not optimize as a single-incumbent hill climb. Maintain a small beam of active idea families so that local negative results do not prematurely kill useful ingredients.
Keep a live beam note in docs/ .
Each beam entry should record the parent candidate, hypothesis, exact changed functions or gates, current best candidate/log, and next singleton, combination, or kill decision.
Keep at least 3 active beams when there is enough work:
one exploit beam near the current best,
one near-miss beam,
one structural/high-risk beam from profiling or external ideas,
one cleanup/compile-time beam only if it has not consumed the whole search.
Use sub-agents to work different beams, not many variants of the same tiny parameter unless explicitly asked for a parallel sweep.
Do not declare a family dead after isolated singletons fail.
If two ideas are individually neutral or slightly slower but touch independent costs, try combining them before retiring the family unless correctness risk is high.
Preserve near-misses as beam material when they show a repeatable isolated win, improve one important case, remove overhead, or change an algorithmic surface that can combine with another beam.
Kill a beam only with a clear reason: inherent correctness failure, repeated meaningful regression after a reasonable retune, singleton and plausible combinations both lose, profile evidence shows the targeted cost is no longer material, or implementation cost is blocking higher-value beams.
After every 3-5 submissions, update the beam note with the current beam ranking and next combination candidates.
Promotion / Git Hygiene
When a new candidate is promoted into the active file, stage the promoted candidate, active file, evidence docs/logs, and any archive moves.
Commit after promotion unless the user says not to.
Use a lower-case commit subject and describe both what changed and what made the improvement in the commit body.
Profiling / Evidence Habits
Prefer current active evidence over older sidecar timings.
Keep raw profile logs and JSON under submit_logs/ .
When a candidate is rejected or promoted, update the relevant doc in docs/ .
Use rg for searching when possible.
Archive older candidates, profile logs, and probe scripts so the root stays navigable.
Known Tried Ideas
Do not mirror every attempt summary here. Check docs/ before repeating an idea, and update the relevant doc when an idea is rejected or promoted.
Do not repeat rejected ideas as-is. If revisiting one, make the algorithmic difference explicit in the doc/log.
If a platform or evaluator rule rejects a class of ideas, record it clearly so future agents do not rediscover the same invalid path.
What I could have done better
While there is scope for improvement in my simple harness, most of my shortcomings were problem-specific. I had these realizations after scanning the top 10 submissions and reading Mike's writeup.
The n = 512 and n = 1024 cases had multiple input distributions such as dense, clustered, rank-deficient, mixed, and near-rank families. The faster kernels had written data detectors and exploited distributions, e.g. low-rank cases have lots of zeros, so how do we exploit this? I could have pushed Codex more here or at least inquired more in this regard.
Top 10 solutions more aggressively removed library functions. For example, the 2nd and 5th solutions used custom triangular inverse instead of using PyTorch triangular solve. My solution had lots of back and forth between PyTorch and Triton.
Could have kept the trailing matrix resident in fp16 instead of repeatedly moving between representations. This was an unknown unknown for me and was purely a domain expertise miss.
I should have had the beam of candidates from the start
Write a more robust profiler to test the mixed precision cases
Wasn't able to use tcgen05 instructions, NVIDIA's fifth-generation tensor-core instructions on Blackwell, to exploit B200 tensor cores more
Conclusion
I placed 12th out of 183, with a 232x speedup over baseline. More importantly, I learned a lot about GPU kernel optimization, auto-research (or loop engineering?) basics, and some B200-specific details.
I also concluded that domain expertise accelerates both harness design and human-in-the-loop steering. I also had a couple of observations. There is a spectrum for how domain-specific engineers want to make things. On the left, people want to make a general harness that can self-improve. On the other end, people are interested in making very problem/environment-specific harnesses. I personally lean toward problem-specific harnesses.
I hope you enjoyed reading this and learned something new. If you liked this blog, please like/upvote/share!
By the way, the second contest in the series, eigen decomposition , is currently going on. See you on the leaderboard.
References
I used the following to revise or learn new concepts.
Modal GPU glossary
How to Optimize a CUDA Matmul Kernel for cuBLAS-like Performance: a Worklog
Outperforming cuBLAS on NVIDIA B200
Outperforming cuBLAS on H100: a Worklog
Fast QR decomposition on NVIDIA B200 GPUs - Mike's writeup helped me revise the problem itself lol.
Additional references that I wish to go through:
Simon's blog - CuteDSL and B200-specific things.
gau-nernst blog - gau-nernst placed 2nd.
Acknowledgements
Mark Saroufim , Rohan Anil , for hosting the contest. Sinatras for detecting reward hacks and encouraging me initially.
Mike placed 5th and wrote an amazing writeup that decodes the problem and has great visuals.
Levidiamode for valuable posts around GPU kernels, Tokenbender for nudging me to write this, and CUDA colonel for providing tips on the GPU Mode server.
Claude Opus 4.8 and GPT-5.5 (Codex) helped with editing and math-related writing.
Powered by Bear ʕ•ᴥ•ʔ
