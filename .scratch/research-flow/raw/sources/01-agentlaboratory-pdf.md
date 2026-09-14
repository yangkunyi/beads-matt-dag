SOURCE-URL: https://aclanthology.org/2025.findings-emnlp.320.pdf
FETCHED: 2026-09-14T17:30:57+08:00
HTTP: 200
NOTE: Agent Laboratory paper (findings of EMNLP 2025), publisher PDF converted with pdftotext (full text).

         Agent Laboratory: Using LLM Agents as Research Assistants

         Samuel Schmidgall1,2 , Yusheng Su1 , Ze Wang1 , Ximeng Sun1 , Jialian Wu1 ,
         Xiaodong Yu1 , Jiang Liu1 , Michael Moor3 , Zicheng Liu1 , Emad Barsoum1 ,
                       1
                         AMD, 2 Johns Hopkins University, 3 ETH Zurich
                               Correspondence: schmi46@jhu.edu; jiang.liu@amd.com




                      Abstract                              plored. If the process of exploring ideas had less
                                                            limitations, researchers would be able to investi-
    Historically, scientific discovery has been
                                                            gate multiple concepts simultaneously, increasing
    a lengthy and costly process, demanding
    substantial time and resources from initial             the likelihood of scientific discovery.
    conception to final results. To accelerate                 In an effort to achieve this, recent work has ex-
    scientific discovery, reduce research costs,            plored the capability of LLMs to perform research
    and improve research quality, we introduce              ideation and automated paper generation, where
    Agent Laboratory, an autonomous LLM-                    LLM agents perform the role of human scientists
    based framework capable of completing the               (Schmidgall and Moor, 2025; Lu et al., 2024a; Ya-
    entire research process. This framework ac-             mada et al., 2025). These frameworks generate
    cepts a human-provided research idea and pro-
                                                            novel research ideas, write code, conduct experi-
    gresses through three stages–literature review,
    experimentation, and report writing–in order to         ments, and create scientific papers with automated
    produce research, including a code repository           peer-review systems to evaluate the work. How-
    and a research report, while enabling users to          ever, while these works demonstrate that current
    provide feedback and guidance at each stage.            LLMs can generate ideas judged to be more novel
    We deploy Agent Laboratory with various                 than those produced by human experts, (Si et al.,
    state-of-the-art LLMs and invite multiple re-           2024) indicates that LLMs still exhibit weaknesses
    searchers to assess its quality by participat-
                                                            in feasibility and implementation details, suggest-
    ing in a survey, providing human feedback
    to guide the research process, and then eval-           ing a complementary rather than replacement role
    uate the final paper. We found that: (1) Agent          for LLMs in research. Therefore, we aim to de-
    Laboratory driven by o1-preview generates               sign an autonomous agent pipeline that can assist
    the best research outcomes; (2) The generated           humans toward implementing their own research
    machine learning code is able to achieve state-         ideas.
    of-the-art performance compared to existing                In this work, we introduce Agent Laboratory,
    methods; (3) Incorporating human involvement            an autonomous pipeline for accelerating the indi-
    improves the overall quality of research; (4)
                                                            vidual’s ability to perform machine learning re-
    Agent Laboratory reduces research expenses,
    achieving an 84% decrease compared to previ-            search. Unlike previous approaches, where agents
    ous autonomous research methods. We hope                participate in their own research ideation indepen-
    Agent Laboratory enables researchers to allo-           dent of human input (Lu et al., 2024b; Baek et al.,
    cate more effort toward creative ideation rather        2024), Agent Laboratory is designed to assist
    than low-level coding and writing, ultimately           human scientists in executing their own research
    accelerating scientific discovery.                      ideas using language agents. Agent Laboratory
                                                            takes as input a human research idea and outputs
1   Introduction
                                                            a research report and code repository produced by
Scientists frequently face constraints that limit the       autonomous language agents, allowing various lev-
number of research ideas they can explore at any            els of human involvement, where feedback can be
given time, resulting in ideas being prioritized            provided at a frequency based on user preference.
based on predicted impact. While this process                  We hope that this work takes a step toward ac-
helps determine which concepts are worth investing          celerating scientific discovery in machine learning,
time in and how best to allocate limited resources          allowing researchers to allocate more effort toward
effectively, many high quality ideas remain unex-           creative ideation and experiment design rather than
                                                       5977
               Findings of the Association for Computational Linguistics: EMNLP 2025, pages 5977–6043
                         November 4-9, 2025 ©2025 Association for Computational Linguistics
Figure 1: Agent Laboratory takes as input a human research idea and a set of notes, provides this to a pipeline of
specialized LLM-driven agents, and produces a research report and code repository.


low-level coding and writing.                             2024; Kang and Xiong, 2024), question-answering
                                                          (Chen et al., 2024a; Lála et al., 2023), paper re-
2   Background & Related Work                             viewing (Liang et al., 2024; Weng et al., 2024), and
                                                          experiment outcome prediction (Luo et al., 2024;
Contemporary agent research leverages autoregres-         Ashokkumar et al., 2024). However, the effective-
sive large language models (LLMs) (Anthropic,             ness of LLM-driven research ideation (Baek et al.,
2024; Touvron et al., 2023b; Dubey et al., 2024;          2024; Li et al., 2024a; Si et al., 2024) remains de-
Achiam et al., 2023), typically transformer-based         bated, with mixed results on novelty and creativity
(Vaswani, 2017), which learn sequence prediction          (Si et al., 2024; Chakrabarty et al., 2024; Anderson
(p(xt |x<t ; θ)) from extensive text data (Brown,         et al., 2024; Zhou et al., 2024; Ashkinaze et al.,
2020). To improve real-world applicability, LLMs          2024; Padmakumar and He, 2024), suggesting po-
are structured into agents (Wu et al., 2023; Li           tential benefits from combining human guidance
et al., 2023; Chen et al., 2023; Qian et al., 2024)       with LLM workflows.
augmented with techniques like chain-of-thought              Recent work explores end-to-end autonomous
prompting (Wei et al., 2022), iterative refinement        research using LLM-based systems for tasks rang-
(Shinn et al., 2024), self-improvement (Huang             ing from nano-body discovery (Swanson et al.,
et al., 2022), and tool integration (Hao et al., 2024;    2024) and chemical experimentation (M. Bran
Qin et al., 2023; Schick et al., 2023). These agents      et al., 2024; Boiko et al., 2023) to full research
demonstrate efficacy in complex domains including         cycle automation including ideation, experimenta-
software engineering (Jimenez et al., 2023; Yang          tion, and manuscript generation (Lu et al., 2024a;
et al., 2024), medicine (Tu et al., 2024; Schmidgall      Yamada et al., 2025; Schmidgall and Moor, 2025).
et al., 2024), robotics (Brohan et al., 2022; Kim         Nevertheless, persistent concerns about the feasibil-
et al., 2024), web tasks (Gur et al., 2023; He et al.,    ity and detail in LLM ideation (Si et al., 2024) un-
2024), and game playing (Wang et al., 2023; Feng          derscore the potential value of human-in-the-loop
et al., 2024).                                            systems, motivating the co-pilot approach adopted
   While AI has historically supported scientific dis-    by Agent Laboratory.
covery across fields (Romera-Paredes et al., 2024;
Szymanski et al., 2023; Pyzer-Knapp et al., 2022),         3   Agent Laboratory
LLMs now show proficiency in specific research
tasks like code generation (Chen et al., 2021; Ni-         Overview. Agent      Laboratory sequences
jkamp et al., 2022), literature search (Ajith et al.,      through independent research paper collection
                                                      5978
and analysis, collaborative planning and data           interpretation, concluding the analysis and
preparation, and automated experimentation with         preparing for report writing.
comprehensive report generation. As depicted
in Figure 2, the workflow comprises three main          3.3    Report Writing
phases: (1) Literature Review, (2) Experimentation,     Report Writing Phase. PhD and Professor
and (3) Report Writing, which we detail below           agents synthesize research findings into an aca-
along with involved agents. Section 4 presents          demic report using the paper-solver module.
qualitative and quantitative analyses demonstrat-       This report generator summarizes the research into
ing Agent Laboratory’s research generation              a human-readable, structured format. The output
capabilities.                                           follows standard academic conventions (Abstract,
                                                        Introduction, Methods, etc.), aiming for conference
3.1 Literature Review                                   submission standards and user comprehension.
Literature Review. This phase gathers and curates
                                                        Paper Solver Workflow. The paper-solver
relevant research papers for the given idea, pro-
                                                        first generates a paper scaffold with standard sec-
viding references for later stages. The PhD agent
                                                        tions and LaTeX formatting, accessing arXiv for
uses the arXiv API to retrieve papers, performing
                                                        literature/citations. It then iteratively refines the
actions like summary (abstracts of top 20 papers),
                                                        paper using EDIT for precise LaTeX modifications,
full text (extracts complete content), and add
                                                        ensuring clarity and compilation. An adapted au-
paper (incorporates selections). This iterative pro-
                                                        tomated review system (LLM agents simulating
cess involves multiple queries and relevance evalu-
                                                        NeurIPS reviews) provides scores and feedback on
ations to build a comprehensive review. Once the
                                                        soundness, presentation, contribution, and overall
target number of relevant texts is curated via add
                                                        quality during iterations.
paper, the review is finalized.
                                                        Paper Refinement Phase. The PhD agent eval-
3.2 Experimentation                                     uates the paper with reviews from three simulated
Experimentation begins with plan formulation,           NeurIPS reviewers assessing originality, quality,
where PhD and Postdoc agents collaborate on a           clarity, and significance. Based on this feedback,
detailed research plan based on the literature re-      the PhD agent decides if the paper is complete or
view and objective. This plan outlines components       needs revisions. If revisions are needed, earlier
(models, datasets, steps), culminating in the Post-     stages (planning, experimentation, interpretation)
doc submitting it via plan. Next, in data prepara-      may be revisited to address comments, simulating
tion, the ML Engineer agent codes data preparation      the academic revision cycle until standards are met.
steps per the plan, using Python and potentially
                                                        3.3.1 Autonomous versus Co-Pilot Mode
searching HuggingFace (search HF). The SW En-
gineer agent submits the finalized, bug-checked         Agent Laboratory operates in two modes: au-
code via submit code.                                   tonomous and co-pilot. In autonomous mode,
   The running experiments phase is executed by         agents produce research based solely on the ini-
the ML Engineer using the mle-solver module to          tial idea, with no further human input; subtasks
implement the plan. This module autonomously            proceed sequentially upon completion. In co-pilot
generates, tests, and refines ML code iteratively.      mode, besides providing the initial idea, a human
Key mle-solver processes include: command ex-           reviews the output at the end of each subtask phase
ecution (modifying programs via REPLACE/EDIT),          (e.g., literature review, generated report). The hu-
code execution (with compilation checks/repairs),       man reviewer can then approve progression to the
program scoring (LLM reward model assessing             next subtask or request the agent repeat the current
plan alignment, 0-1 scale), self-reflection, and per-   subtask, providing high-level notes for improve-
formance stabilization (top program sampling, par-      ment (e.g., instructing the agent to include a spe-
allel modifications).                                   cific paper or experimental technique).
   Finally, results interpretation involves the PhD
                                                        4     Results
and Postdoc agents analyzing mle-solver out-
comes to derive insights. They discuss and              In this section, we present our main findings on
reach consensus on an interpretation suitable           the efficacy of Agent Laboratory to produce re-
for the report, which the Postdoc submits via           search. We begin our results by asking how hu-
                                                    5979
Figure 2: Agent Laboratory Workflow. This image illustrates the three primary phases of Agent Laboratory:
Literature Review, Experimentation, and Report Writing. The workflow integrates human input with LLM-driven
agents. Specialized tools like mle-solver for experimentation and paper-solver for report generation automate
research tasks, enabling collaboration between human researchers and agents to produce high-quality research
outputs.


man evaluators perceive papers generated by Agent         5. Does gender role play affect the accuracy on
Laboratory running in end-to-end autonomous                   of LLMs on answering math questions?
mode across five topics. Next, we examine hu-              These 5 questions across 3 LLM backends re-
man evaluation when using Agent Laboratory in           sulted in a total of 15 papers being written au-
collaborative co-pilot mode from both allowing the      tonomously by Agent Laboratory without any
researcher to choose any topic they want and from       human involvement. We then recruited 10 volun-
our set of preselected topics. We then provide a        teer PhD students to review 3 randomly assigned
detailed runtime analysis including cost, average       papers each. These researchers rated the experi-
time, and success rate by various models. Finally,      mental quality, report quality, and usefulness of the
we conclude with an evaluation of the mle-solver        generated outputs on a scale of 1 to 5. The goal
in isolation on MLE-Bench, a set of real-world          of this evaluation is to understand the differences
Kaggle challenges. The details of all surveys are       in quality of produced research based on the three
provided in Appendix E.                                 distinct LLM backbones, and to understand the
                                                        usefulness of Agent Laboratory in autonomous
4.1 Evaluation of quality by language model             mode. The details of the evaluation questions are
Our first experiment aims to evaluate how human-        provided here:
evaluated quality varies across three axes: experi-        • Experimental Quality: What is your percep-
ment quality, report quality, and usefulness. This            tion of the quality of the experimental results
evaluation was conducted by human participants                presented in this report?
using three different LLM backends: gpt-4o (Hurst          • Report Quality: What is your perception of
et al., 2024), o1-mini, and o1-preview (OpenAI,               the quality of the research report writing qual-
2024). Research questions were selected from a set            ity presented in this report?
of 5 templates:                                            • Usefulness: What is your perception of the
  1. Do LLMs exhibit cognitive biases, such as                usefulness of an AI assistant tool that can gen-
      confirmation bias or anchoring bias?                    erate the presented report autonomously?
  2. Are image transformers more or less sensitive         The results of this evaluation indicate vari-
      to pixel noise than convolutional networks?       ability in performance across different Agent
  3. Do LLMs improve accuracy on MedQA when             Laboratory LLM backends (Figure 3). gpt-4o
      asked to perform differential diagnosis?          consistently achieved lower scores, with an aver-
  4. Are LLMs sensitive to word order in multiple       age experimental quality rating of 2.6/5, a report
      choice benchmarks?                                quality rating of 3.0/5, and a usefulness rating of
                                                   5980
Figure 3: Average human evaluated scores from papers generated by Agent Laboratory in autonomous mode by
research question and LLM backend. Bottom row shows average scores across all topics by LLM backend.


4.0/5. In contrast, o1-mini generally outperformed      useful for research assistance, o1-mini achieves the
gpt-4o in experimental quality, with an average         highest experimental quality scores, and gpt-4o is
score of 3.2/5 (+0.6), while maintaining similar lev-   generally being outperformed in all areas. Topic-
els of report quality and usefulness at 3.2/5 (+0.2)    specific trends suggest there may exist variability
and 4.3/5 (+0.3), respectively. o1-preview demon-       in the performance of Agent Laboratory across
strated the highest usefulness and report quality,      difference areas of machine learning research and
averaging 4.4/5 (+0.4 from gpt-4o and +0.1 from         across backend models.
o1-mini) and 3.4/5 (+0.4 from gpt-4o and +0.2
from o1-mini) respectively, though its experimen-       4.1.1   Human reviewer scores by LLM
tal ratings were slightly lower than o1-mini at 2.9/5   Human reviewers assessed papers generated by
(+0.3 from gpt-4o and -0.3 from o1-mini). While         Agent Laboratory using NeurIPS-style criteria,
all backends perform comparably in terms of report      as shown in Figure 4. Comparing the same papers
and experimental quality, the o1-preview model          from Section 4.1, average human scores revealed
was as the most useful for research assistance, sug-    performance differences: overall ratings ranged
gesting that its outputs were better aligned with the   from 3.5/10 (gpt-4o) to 3.8/10 (o1-mini) and 4.0/10
expectations and needs of researchers.                  (o1-preview).
   From our results, the quality is demonstrated to        For quality, reviewers rated gpt-4o lowest (1.8/4)
vary based on the selected topic. We find that the      and o1-mini highest (2.3/4). Significance scores
overall highest average report quality to be 3.8/5      were similar (2.2–2.5/4). Clarity varied slightly,
and usefulness to be 4.5/5 for the word order topic     with gpt-4o at 2.6/4 and o1-mini lower at 2.1/4 (-
and the highest average experiment quality to be        0.5). Soundness was highest for o1-preview (2.2/4),
3.2/5 for the cognitive bias topic. Interestingly, we   compared to o1-mini (1.8, -0.4) and gpt-4o (1.7).
also find that word order has the lowest experiment     Presentation and contribution ratings followed simi-
quality at 2.7/5 along with the image noise topic.      lar trends, with average contribution at 2.1/4 across
The image noise topic was demonstrated to have          models, indicating a need for improved originality.
high variance based on the LLM backend, with an            These scores suggest o1-preview produced
experiment quality score of 1.5/5 for gpt-4o and        slightly better-rounded outputs, though significant
a 4.0/5 with o1-mini (+2.5 point difference) and        technical and methodological gaps remain across
a usefulness score of 2.5/5 for gpt-4o and a 4.5/5      all models. With an average NeurIPS acceptance
with o1-mini (+2.0 point difference).                   score of 5.9, papers produced autonomously fall
  In summary, the evaluation of quality across          below this threshold. These results demonstrate
LLM backends demonstrates clear differences in          that Agent Laboratory in autonomous mode re-
experimental quality, report quality, and usefulness.   quires refinement to meet human expectations for
While o1-preview is consistently rated as the most      high-quality research papers.
                                                    5981
Figure 4: Scores from NeurIPs-style evaluation of generated papers, including: quality, significance, clarity,
soundness, presentation, and contribution. (top) Split-violin plot comparing score distribution of automated
reviewers (left half) and human reviewers (right half). Human scores are not predictive of automated scores (-2.3
points lower on average). Automated (middle) and human (bottom) reviewer scores across NeurIPs-style criterion.


Automated versus Human Reviews. We com-                    4.2   Evaluation of co-pilot quality
pared automated and human reviewer scores (Fig-
ure 4). Automated reviewers showed notable dis-            We next evaluate the use of Agent Laboratory in
crepancies, tending to significantly overestimate          co-pilot mode, where a human researcher is pro-
the contribution of self-evaluated work. Automated         viding feedback at the end of each subtask (see
reviewers gave an average overall score of 6.1/10,         Section 3.3.1 for more details). We evaluate per-
whereas human reviewers averaged 3.8/10 (-2.3              formance across two measures: (1) the quality of
points). Similar gaps exist across criteria; e.g., aver-   Agent Laboratory as a tool for assisting their re-
age clarity was rated 3.6/4 by automated reviewers         search and (2) the quality of generated papers. We
versus 2.4/4 by humans. This pattern holds for all         first ask researchers to co-pilot Agent Laboratory
criteria. Contrary to prior work suggesting high           on a topic of their choice without limitations. We
alignment (Lu et al., 2024b), our findings show au-        then ask researchers to select a topic from the 5
tomated reviews do not align closely with human            topics introduced in Section 4.1, resulting in a total
reviews and are far below the NeurIPS 2024 aver-           of 2 papers per researcher which we refer to as
age acceptance score of 5.85* (our human scores            custom and preselected papers respectively. Af-
were -2.05 points lower). Our results highlight the        ter their papers are generated, we ask researchers
importance of providing human evaluations along-           to rate their experience using Agent Laboratory
side automated scores in future work for a better          during the process of generating custom and pres-
understanding of generated paper quality.                  elected papers. We then ask them to self-evaluate
                                                           the generated papers according to NeurIPS-style
                                                           criterion. Finally, we ask external researchers to
                                                           evaluate their paper comparing performance with
                                                           Agent Laboratory in autonomous mode. All ex-
     * https://papercopilot.com/statistics/neurips-        periments used an o1-mini backbone for all phases
statistics/neurips-2024-statistics                         except the literature review.
                                                       5982
                                         Figure 5: Co-pilot evaluation.


4.2.1 Quality as a tool                                   preselected topics scored higher (+0.25) on experi-
Evaluating Agent Laboratory as a research tool            ment quality (2.5/5). Compared to corresponding
involved assessing its effectiveness in co-pilot          o1-mini autonomous results, co-pilot scores were
mode. Post-generation, participants assessed the          lower across all metrics: report quality (-0.07), use-
tool via questions on a 1-5 scale (1=lowest, 5=high-      fulness (-0.55), and experiment quality (-0.82).
est):                                                        Optional feedback (75% response rate) on im-
    • Utility: How useful is Agent Laboratory             proving Agent Laboratory suggested enhancing
      for assisting your research?                        the interface (e.g., GUI, result inspection), adding
    • Continuation: How likely are you to con-            more figure options, and improving the literature
      tinue using Agent Laboratory for research?          review. Compared to autonomous mode reviews
    • Satisfaction: How much did you enjoy using          (Section 4.1), human co-pilots rated report quality,
      Agent Laboratory?                                   usefulness, and experiment quality lower, feedback
    • Usability: How easy was building a project          indicated this reduction stemmed from difficulty
      with Agent Laboratory?                              guiding agents to execute their exact vision. These
                                                          limitations are further discussed in Section 6.
   Overall scores averaged 3.5/5 for utility, 3.75/5
for continuation, 3.63/5 for satisfaction, and 4.0/5      4.2.2   Evaluation of co-pilot generated papers
for usability (Figure 5). Scores varied by topic type.
                                                          To assess the quality of papers generated by Agent
Custom experiments averaged: utility 3.75/5, con-
                                                          Laboratory in co-pilot mode, we conduct evalu-
tinuation 4.0/5, satisfaction 3.75/5, usability 3.75/5.
                                                          ations using two approaches: (1) researchers self-
Preselected topics averaged: utility 3.25/5, con-
                                                          assessed their generated papers based on NeurIPS-
tinuation 3.5/5, satisfaction 3.5/5, usability 4.25/5.
                                                          style criteria, and (2) external researchers pro-
Compared to custom topics, preselected topic rat-
                                                          vided evaluations of the same papers. This section
ings were lower, except for usability (-0.5 points
                                                          aims to understand differences in scores from self-
lower for custom). Utility and continuation in-
                                                          assessment and external assessment, as well as how
creased by +0.5 points and satisfaction by +0.25
                                                          assessments compare to Agent Laboratory in
points from preselected to custom.
                                                          fully autonomous mode. We use the same NeurIPS
   Using metrics from Section 4.1, we report aver-        criterion introduced in Section 4.1.1.
age co-pilot ratings of 2.38/5 for experimental qual-
ity, 3.13/5 for report quality, and 3.75/5 for useful-    Self-evaluation. From the results of the self-
ness. Custom topics scored higher on report quality       evaluation (Figure 5), we found that the aver-
(3.5/5, +0.75) and usefulness (4.0/5, +0.5), while        age overall score increased from evaluations pro-
                                                      5983
vided to papers generated in autonomous mode,           Significance declined slightly (-0.05), and contri-
with autonomous papers having an overall average        bution increased only marginally (+0.03). Our re-
of 3.8/10 and co-pilot papers at 4.13/10 (+0.33).       sults suggest that papers generated with human
These scores even improved across the best au-          involvement overall are evaluated more highly than
tonomous backend, o1-preview, which averaged            autonomously generated paper, with much of the
4.0/10. Across individual criterion, scores in-         focus of human involvement going toward making
creased for quality (+0.13), clarity (+0.48), sound-    the paper more presentable (presentation and clar-
ness (+0.35), and presentation (+0.33), but de-         ity) while there was less emphasis on improving ex-
creased for significance and contribution. The          perimental results (significance and contribution).
scores that decreased were significance (-0.3) and      Finally, we note that co-pilot overall scores, which
contribution (-0.1).                                    average at 4.38, are still -1.45 points below the aver-
                                                        age score of 5.85 for an accepted paper at NeurIPS
External evaluation. We compare scores pro-
                                                        2024. Increasing the overall score to match confer-
vided through self-evaluation with those provided
                                                        ence standards will likely result by improving the
by a set of external evaluators on the same pa-
                                                        contribution and significance of the paper results,
pers (Figure 5). We find that average scores across
                                                        which is consistently lower than other evaluation
most criteria, including quality, significance, clar-
                                                        metrics.
ity, soundness, presentation, and contribution, show
an improvement in the external assessments, with
an overall average of 4.38/10, up from 4.13/10          5   Discussion
in self-evaluations. The most significant improve-      Agent Laboratory is an LLM agent system de-
ments were observed in quality (+0.62), signifi-        signed to assist in performing end-to-end machine
cance (+0.25), and overall (+0.25) scores, suggest-     learning research. Functioning primarily as a co-
ing that external reviewers perceived the generated     pilot, it aims to accelerate scientific exploration
papers to be higher quality and more significant        through a human-centric approach, distinct from
than the researchers who produced them. How-            fully automated discovery systems. The Agent
ever, clarity scores decreased (-0.25), indicating      Laboratory workflow includes three stages liter-
potential issues in the articulation of ideas that      ature review, experimentation, and report writing.
might have been overlooked during self-assessment.      Evaluations assessed the quality of outputs gener-
While presentation scores did not improve (+0.0),       ated in autonomous mode using various LLM back-
soundness (+0.13) and contribution (+0.13) only         ends, employing metrics such as human ratings of
increased slightly.                                     experimental quality and report usefulness, along-
   Notably, the external evaluations also reinforce     side standard academic reviewer scores. The effec-
differences between scores preselected and custom       tiveness of Agent Laboratory was also examined
topics. Unlike with the self-evaluated papers, pa-      in its co-pilot mode, comparing it to autonomous
pers on preselected topics were rated slightly higher   operation and integrating researcher feedback.
overall, with improvements observed across several
                                                           Findings revealed performance differences be-
metrics, particularly in quality (+0.5) and signif-
                                                        tween LLM backends; for instance, o1-preview
icance (+0.5). These findings suggest that self-
                                                        showed higher perceived usefulness, while
evaluated reviewers perceive the work produced on
                                                        o1-mini demonstrated better experimental quality.
their custom topic as higher quality compared to
                                                        Although autonomous outputs were generally rated
the work produced on preselected topics, whereas
                                                        positively, human evaluations identified shortcom-
external evaluators find the opposite to be true.
                                                        ings in clarity and soundness relative to standards
Comparison with autonomous mode Compar-                 for high-quality research, highlighting that auto-
ing scores by external evaluators on autonomous         mated reviewer scores did not consistently align
and co-pilot papers (Figure 5), we find that the        with human assessments. The co-pilot mode, which
largest improvements were seen for quality, which       incorporates human feedback, generally produced
increased by +0.75, soundness, which improved by        higher-quality results across most evaluation met-
+0.48, and the overall score, which improved by         rics and received favorable utility and usability rat-
+0.58. Moderate gains were also observed in clar-       ings. Future research directions involve longitudi-
ity (+0.23) and presentation (+0.33). In contrast,      nal user studies and the exploration of automated
some metrics showed minimal or no improvement.          workflow optimization.
                                                    5984
6   Limitations                                          is that mle-solver and paper-solver are limited
                                                         to generating only two figures for the paper. This
While our results suggest that Agent Laboratory
                                                         can be solved in future work, by allowing all of
demonstrates strong performance as a research tool,
                                                         the figures generated by the mle-solver (without
we now turn to a discussion of limitations that could
                                                         restriction) to be incorporated into paper-solver
inform future work. While some of these are also
                                                         by detecting image files and providing those paths
limitations of LLMs themselves, others are not,
                                                         to the solver. Agent Laboratory is also not able
and we nonetheless provide a thorough and critical
                                                         to manage repository-level code on its own, but
discussion of our work. We hope that progress in
                                                         rather the appropriate files are provided to it at
autonomous research will address these limitations.
                                                         each necessary step and files are saved based on
6.1 Workflow limitations                                 which phase produced the file. Enabling flexible
                                                         repository-level file modification and execution is
Challenges         with       self-evaluation The
                                                         a clear next step for future work.
paper-solver is being evaluated for quality
by using LLMs emulated NeurIPS reviewers.                Challenges with hallucination While uncom-
This has two limitations: (1) while the reviewing        mon, we also found that in some of the research
agents were shown to have high alignment with            papers, particularly from lower performing models,
real reviewers (Lu et al., 2024b), qualitatively         such as gpt-4o, there were hallucinations regarding
research reports from Agent Laboratory are               experimental results that did not occur, such as the
less satisfying than research papers from The AI         following example from a gpt-4o paper on the topic
Scientist (Lu et al., 2024b), with ours having lower     of Are image transformers more or less sensitive
quality figures, despite Agent Laboratory papers         to noise than convolutional networks?: “Hyper-
obtaining higher scores overall. (2) The research        parameter optimization played a crucial role in
reports produced by Agent Laboratory are not             achieving these results. The learning rate was set
meant to replace the paper writing process done          at 0.001, with a batch size of 32, and the num-
by humans as it was in The AI Scientist, rather          ber of reasoning steps L = {l1 , l2 , ..., ln } varied
it is meant to provide a report for the human to         between 5 to 10, depending on the complexity of
understand what has been accomplished, so that           the query. The model was trained over 50 epochs,
they can scale up the experiment and write their         with early stopping criteria applied to prevent over-
own research report. However, we nonetheless use         fitting." While the issue of hallucination is more
NeurIPS reviewer scores as the heuristic for the         generally a problem with LLMs themselves, future
quality of our presented paper-solver, which             work must appropriately address these challenges
aims to evaluate the reports from the perspective        in order to prevent misinformation from being prop-
of a complete research paper. Additionally,              agated when using automated research tools.
contrasting with (Lu et al., 2024b) demonstrate
that LLMs perform less reliably for self-evaluation      6.2   Common failure modes
compared with human reviewers, with lower                In addition to the limitations outlined in Section 6.1,
agreement scores (53.3% vs. 56.1%). Although             we also outline common failure modes observed
LLMs demonstrate reasonable consistency, this            during the runtime of Agent Laboratory. We
may stem from reliance on superficial patterns           report a list of the most common failure modes
rather than robust evaluation criteria, resulting in     observed below:
discrepancies between LLM and human rankings.
This limits LLMs in subjective tasks like research          • Many of the more capable models (gpt-4o, o1-
idea evaluation, which is the foundation of                   mini, o1-preview) struggled with instruction-
mle-solver and paper-solver.                                  following during the literature review phase,
                                                              and had a tendency to repeatedly use the
Challenges with automated structure There are                 summarize command until the maximum
also some limitations that present themselves due             phase steps have been reached, leading to a
to the structure enforced in the workflow. For ex-            termination.
ample, paper-solver is encouraged to a organize
the paper into a relatively fixed structure (abstract,      • Retrieved papers during the literature review
introduction, etc), which disallows unique paper or-          phase had been observed to reach the maxi-
ganizations and section orders. Another limitation            mum token limit for some models.
                                                     5985
    • Experiments run by mle-solver sometimes            generating content that bypasses ethical oversight.
      obtain 0% accuracy for all tested methods          For instance, the misuse of autonomous research
      which is not corrected by the agent by the         agents in fields like cybersecurity could lead to the
      time mle-solver runs out of solving steps.         automated creation of malware (Xu et al., 2024;
                                                         Happe and Cito, 2023) or in environmental stud-
    • mle-solver has a tendency to edit line 0 more
                                                         ies, it may generate biased analyses that downplay
      than other lines in the code, causing to the
                                                         climate risks or overstate the benefits of certain
      replace command to more often lead to suc-
                                                         interventions. Moreover, as the platform matures,
      cessful code compiles.
                                                         the risk of its misuse increases if safeguards are not
    • Printed output from the data preparation or        implemented to ensure alignment with ethical re-
      experimental results can lead to the LLMs          search standards (Watkins, 2024; Jiao et al., 2024).
      reaching their token limit.                        Thus, while Agent Laboratory demonstrates im-
                                                         mense promise for accelerating scientific discovery,
    • mle-solver often generated the python              there is a need for robust governance mechanisms
      exit () command, which terminated the entire       to ensure that the underlying LLMs produce con-
      process. This had to be detected and removed       tent that aligns with ethical principles and societal
      manually.                                          values.
    • mle-solver has been observed to run system
      commands on the host computer using the
                                                         References
      subprocess . run () command. While nothing
      problematic has been observed, safeguards          Talor Abramovich, Meet Udeshi, Minghao Shao, Kilian
      should be implemented around this.                    Lieret, Haoran Xi, Kimberly Milner, Sofija Janch-
                                                            eska, John Yang, Carlos E Jimenez, Farshad Khor-
    • paper-solver often struggles to search for            rami, and 1 others. 2024. Enigma: Enhanced interac-
      relevant papers using the arXiv engine. Before        tive generative model agent for ctf challenges. arXiv
                                                            preprint arXiv:2409.16165.
      a search time-limit was enforced, it could take
      up to 100 tries for a successful search query      Josh Achiam, Steven Adler, Sandhini Agarwal, Lama
      to return any papers. A limit of 5 was place         Ahmad, Ilge Akkaya, Florencia Leoni Aleman,
      thereafter to prevent this cycle.                    Diogo Almeida, Janko Altenschmidt, Sam Altman,
                                                           Shyamal Anadkat, and 1 others. 2023. Gpt-4 techni-
7    Ethical considerations                                cal report. arXiv preprint arXiv:2303.08774.

Agent Laboratory offers potential to accelerate          Anirudh Ajith, Mengzhou Xia, Alexis Chevalier, Tanya
the field of machine learning research by automat-         Goyal, Danqi Chen, and Tianyu Gao. 2024. Lit-
ing time-intensive tasks and enabling researchers          search: A retrieval benchmark for scientific literature
                                                           search. arXiv preprint arXiv:2407.18940.
to focus on ideation and experimental design. How-
ever, its capabilities also bring ethical challenges     Altera AL, Andrew Ahn, Nic Becker, Stephanie Car-
that require careful consideration. The ability to au-     roll, Nico Christie, Manuel Cortes, Arda Demirci,
tonomously generate research code, reports, and ex-        Melissa Du, Frankie Li, Shuying Luo, and 1 others.
periment plans may inadvertently lower the barriers        2024. Project sid: Many-agent simulations toward ai
                                                           civilization. arXiv preprint arXiv:2411.00114.
to producing substandard or misleading scientific
outputs. This could overwhelm peer review sys-           Barrett R Anderson, Jash Hemant Shah, and Max
tems and jeopardize the integrity of academic dis-         Kreminski. 2024. Homogenization effects of large
course. Furthermore, the automated processes may           language models on human creative ideation. In
reflect or even amplify biases inherent in the un-         Proceedings of the 16th Conference on Creativity &
                                                           Cognition, pages 413–425.
derlying datasets or algorithms, leading to skewed
outcomes in research findings. Transparent dis-          AI Anthropic. 2024. The claude 3 model family: Opus,
closure of AI involvement in research outputs is           sonnet, haiku. Claude-3 Model Card, 1.
important in order to mitigate such risks and main-
tain accountability.                                     Joshua Ashkinaze, Julia Mendelsohn, Li Qiwei, Ceren
                                                            Budak, and Eric Gilbert. 2024. How ai ideas affect
   There are additional concerns about potential            the creativity, diversity, and evolution of human ideas:
misuse of Agent Laboratory for unethical pur-               Evidence from a large, dynamic experiment. arXiv
poses, such as developing harmful technologies or           preprint arXiv:2401.13481.
                                                     5986
Ashwini Ashokkumar, Luke Hewitt, Isaias Ghezae, and        Xiuying Chen, Tairan Wang, Taicheng Guo, Kehan Guo,
  Robb Willer. 2024. Predicting results of social sci-       Juexiao Zhou, Haoyang Li, Mingchen Zhuge, Jür-
  ence experiments using large language models. Tech-        gen Schmidhuber, Xin Gao, and Xiangliang Zhang.
  nical report, Technical report, Working Paper.             2024a. Scholarchemqa: Unveiling the power of lan-
                                                             guage models in chemical research question answer-
Jinheon Baek, Sujay Kumar Jauhar, Silviu Cucerzan,           ing. arXiv preprint arXiv:2407.16931.
   and Sung Ju Hwang. 2024. Researchagent: Iter-
   ative research idea generation over scientific liter-   Ziru Chen, Shijie Chen, Yuting Ning, Qianheng Zhang,
   ature with large language models. arXiv preprint           Boshi Wang, Botao Yu, Yifei Li, Zeyi Liao, Chen
   arXiv:2404.07738.                                         Wei, Zitong Lu, and 1 others. 2024b. Scienceagent-
                                                              bench: Toward rigorous assessment of language
Kevin Black, Noah Brown, Danny Driess, Adnan Es-
                                                              agents for data-driven scientific discovery. arXiv
  mail, Michael Equi, Chelsea Finn, Niccolo Fusai,
                                                              preprint arXiv:2410.05080.
  Lachy Groom, Karol Hausman, Brian Ichter, and 1
  others. 2024. π0 : A vision-language-action flow         Mike D’Arcy, Tom Hope, Larry Birnbaum, and
  model for general robot control. arXiv preprint            Doug Downey. 2024. Marg: Multi-agent review
  arXiv:2410.24164.                                          generation for scientific papers. arXiv preprint
Daniil A Boiko, Robert MacKnight, Ben Kline, and             arXiv:2401.04259.
  Gabe Gomes. 2023. Autonomous chemical research
  with large language models. Nature, 624(7992):570–       Xiang Deng, Yu Gu, Boyuan Zheng, Shijie Chen, Sam
  578.                                                       Stevens, Boshi Wang, Huan Sun, and Yu Su. 2024.
                                                             Mind2web: Towards a generalist agent for the web.
Anthony Brohan, Noah Brown, Justice Carbajal, Yevgen         Advances in Neural Information Processing Systems,
  Chebotar, Xi Chen, Krzysztof Choromanski, Tianli           36.
  Ding, Danny Driess, Avinava Dubey, Chelsea Finn,
  and 1 others. 2023. Rt-2: Vision-language-action         Ning Ding, Shang Qu, Linhai Xie, Yifei Li, Zaoqu Liu,
  models transfer web knowledge to robotic control.          Kaiyan Zhang, Yibai Xiong, Yuxin Zuo, Zhangren
  arXiv preprint arXiv:2307.15818.                           Chen, Ermo Hua, and 1 others. 2024. Automating
                                                             exploratory proteomics research via language models.
Anthony Brohan, Noah Brown, Justice Carbajal, Yev-           arXiv preprint arXiv:2411.03743.
  gen Chebotar, Joseph Dabis, Chelsea Finn, Keerthana
  Gopalakrishnan, Karol Hausman, Alex Herzog, Jas-         Abhimanyu Dubey, Abhinav Jauhri, Abhinav Pandey,
  mine Hsu, and 1 others. 2022. Rt-1: Robotics trans-        Abhishek Kadian, Ahmad Al-Dahle, Aiesha Letman,
  former for real-world control at scale. arXiv preprint     Akhil Mathur, Alan Schelten, Amy Yang, Angela
  arXiv:2212.06817.                                          Fan, and 1 others. 2024. The llama 3 herd of models.
                                                             arXiv preprint arXiv:2407.21783.
Tom B Brown. 2020. Language models are few-shot
  learners. arXiv preprint arXiv:2005.14165.               Richard Fang, Rohan Bindu, Akul Gupta, Qiusi
                                                             Zhan, and Daniel Kang. 2024.      Llm agents
Tuhin Chakrabarty, Philippe Laban, Divyansh Agar-
                                                             can autonomously hack websites. arXiv preprint
  wal, Smaranda Muresan, and Chien-Sheng Wu. 2024.
                                                             arXiv:2402.06664.
  Art or artifice? large language models and the false
  promise of creativity. In Proceedings of the CHI Con-    Alhussein Fawzi, Matej Balog, Aja Huang, Thomas Hu-
  ference on Human Factors in Computing Systems,             bert, Bernardino Romera-Paredes, Mohammadamin
  pages 1–34.                                                Barekatain, Alexander Novikov, Francisco J R Ruiz,
Jun Shern Chan, Neil Chowdhury, Oliver Jaffe, James          Julian Schrittwieser, Grzegorz Swirszcz, and 1 oth-
  Aung, Dane Sherburn, Evan Mays, Giulio Starace,            ers. 2022. Discovering faster matrix multiplication
  Kevin Liu, Leon Maksin, Tejal Patwardhan, and 1            algorithms with reinforcement learning. Nature,
  others. 2024. Mle-bench: Evaluating machine learn-         610(7930):47–53.
  ing agents on machine learning engineering. arXiv
  preprint arXiv:2410.07095.                               Xidong Feng, Yicheng Luo, Ziyan Wang, Hongrui Tang,
                                                             Mengyue Yang, Kun Shao, David Mguni, Yali Du,
Mark Chen, Jerry Tworek, Heewoo Jun, Qiming Yuan,            and Jun Wang. 2024. Chessgpt: Bridging policy
 Henrique Ponde De Oliveira Pinto, Jared Kaplan,             learning and language modeling. Advances in Neural
 Harri Edwards, Yuri Burda, Nicholas Joseph, Greg            Information Processing Systems, 36.
 Brockman, and 1 others. 2021. Evaluating large
 language models trained on code. arXiv preprint           Alireza Ghafarollahi and Markus J Buehler. 2024a. Pro-
 arXiv:2107.03374.                                           tagents: protein discovery via large language model
                                                             multi-agent collaborations combining physics and
Weize Chen, Yusheng Su, Jingwei Zuo, Cheng Yang,             machine learning. Digital Discovery.
 Chenfei Yuan, Chi-Min Chan, Heyang Yu, Yaxi Lu,
 Yi-Hsin Hung, Chen Qian, and 1 others. 2023. Agent-       Alireza Ghafarollahi and Markus J Buehler. 2024b.
 verse: Facilitating multi-agent collaboration and ex-       Sciagents: Automating scientific discovery through
 ploring emergent behaviors. In The Twelfth Interna-         multi-agent intelligent graph reasoning. arXiv
 tional Conference on Learning Representations.              preprint arXiv:2409.05556.
                                                       5987
Antoine Grosnit, Alexandre Maraval, James Doran,         Qian Huang, Jian Vora, Percy Liang, and Jure Leskovec.
  Giuseppe Paolo, Albert Thomas, Refinath Shahul           2024. Mlagentbench: Evaluating language agents
  Hameed Nabeezath Beevi, Jonas Gonzalez, Khy-             on machine learning experimentation. In Forty-first
  ati Khandelwal, Ignacio Iacobacci, Abdelhakim            International Conference on Machine Learning.
  Benechehab, and 1 others. 2024.      Large lan-
  guage models orchestrating structured reasoning        Aaron Hurst, Adam Lerer, Adam P Goucher, Adam
  achieve kaggle grandmaster level. arXiv preprint         Perelman, Aditya Ramesh, Aidan Clark, AJ Ostrow,
  arXiv:2411.03562.                                        Akila Welihinda, Alan Hayes, Alec Radford, and 1
                                                           others. 2024. Gpt-4o system card. arXiv preprint
Ken Gu, Ruoxi Shang, Ruien Jiang, Keying Kuang,            arXiv:2410.21276.
  Richard-John Lin, Donghe Lyu, Yue Mao, Youran
  Pan, Teng Wu, Jiaqian Yu, and 1 others. 2024. Blade:
                                                         Tal Ifargan, Lukas Hafner, Maor Kern, Ori Alcalay,
  Benchmarking language model agents for data-driven
                                                           and Roy Kishony. 2024. Autonomous llm-driven re-
  science. arXiv preprint arXiv:2408.09667.
                                                           search from data to human-verifiable research papers.
Siyuan Guo, Cheng Deng, Ying Wen, Hechang Chen,            arXiv preprint arXiv:2404.17605.
  Yi Chang, and Jun Wang. 2024. Ds-agent: Auto-
  mated data science by empowering large language        Junfeng Jiao, Saleh Afroogh, Yiming Xu, and Connor
  models with case-based reasoning. arXiv preprint         Phillips. 2024. Navigating llm ethics: Advancements,
  arXiv:2402.17453.                                        challenges, and future directions. arXiv preprint
                                                           arXiv:2406.18841.
Izzeddin Gur, Hiroki Furuta, Austin Huang, Mustafa
   Safdari, Yutaka Matsuo, Douglas Eck, and Aleksan-     Carlos E Jimenez, John Yang, Alexander Wettig,
   dra Faust. 2023. A real-world webagent with plan-       Shunyu Yao, Kexin Pei, Ofir Press, and Karthik
   ning, long context understanding, and program syn-      Narasimhan. 2023. Swe-bench: Can language mod-
   thesis. arXiv preprint arXiv:2307.12856.                els resolve real-world github issues? arXiv preprint
Nam Le Hai, Dung Manh Nguyen, and Nghi DQ Bui.             arXiv:2310.06770.
  2024. Repoexec: Evaluate code generation with
  a repository-level executable benchmark. arXiv         Liqiang Jing, Zhehui Huang, Xiaoyang Wang, Wen-
  preprint arXiv:2406.11927.                               lin Yao, Wenhao Yu, Kaixin Ma, Hongming Zhang,
                                                           Xinya Du, and Dong Yu. 2024. Dsbench: How far
Shibo Hao, Tianyang Liu, Zhen Wang, and Zhiting Hu.        are data science agents to becoming data science ex-
  2024. Toolkengpt: Augmenting frozen language             perts? arXiv preprint arXiv:2409.07703.
  models with massive tools via tool embeddings. Ad-
  vances in neural information processing systems, 36.   John Jumper, Richard Evans, Alexander Pritzel, Tim
                                                           Green, Michael Figurnov, Olaf Ronneberger, Kathryn
Andreas Happe and Jürgen Cito. 2023. Getting pwn’d         Tunyasuvunakool, Russ Bates, Augustin Žídek, Anna
  by ai: Penetration testing with large language mod-      Potapenko, and 1 others. 2021. Highly accurate
  els. In Proceedings of the 31st ACM Joint European       protein structure prediction with alphafold. nature,
  Software Engineering Conference and Symposium            596(7873):583–589.
  on the Foundations of Software Engineering, pages
  2082–2086.
                                                         Hao Kang and Chenyan Xiong. 2024. Researcharena:
Tomas Hayes, Roshan Rao, Halil Akin, Nicholas J            Benchmarking llms’ ability to collect and organize
  Sofroniew, Deniz Oktay, Zeming Lin, Robert Verkuil,      information as research agents. arXiv preprint
  Vincent Q Tran, Jonathan Deaton, Marius Wiggert,         arXiv:2406.10291.
  and 1 others. 2024. Simulating 500 million years
  of evolution with a language model. bioRxiv, pages     Ji Woong Kim, Tony Z Zhao, Samuel Schmidgall, An-
  2024–07.                                                  ton Deguet, Marin Kobilarov, Chelsea Finn, and Axel
                                                            Krieger. 2024. Surgical robot transformer (srt): Im-
Hongliang He, Wenlin Yao, Kaixin Ma, Wenhao Yu,             itation learning for surgical tasks. In 8th Annual
  Yong Dai, Hongming Zhang, Zhenzhong Lan, and              Conference on Robot Learning.
  Dong Yu. 2024. Webvoyager: Building an end-to-
  end web agent with large multimodal models. arXiv      Jakub Lála, Odhran O’Donoghue, Aleksandar Shtedrit-
  preprint arXiv:2401.13919.                                ski, Sam Cox, Samuel G Rodriques, and Andrew D
Xueyu Hu, Ziyu Zhao, Shuang Wei, Ziwei Chai, Qianli        White. 2023. Paperqa: Retrieval-augmented gener-
  Ma, Guoyin Wang, Xuwu Wang, Jing Su, Jingjing             ative agent for scientific research. arXiv preprint
  Xu, Ming Zhu, and 1 others. 2024. Infiagent-              arXiv:2312.07559.
  dabench: Evaluating agents on data analysis tasks.
  arXiv preprint arXiv:2401.05507.                       Steven A Lehr, Aylin Caliskan, Suneragiri Liyanage,
                                                            and Mahzarin R Banaji. 2024. Chatgpt as research
Jiaxin Huang, Shixiang Shane Gu, Le Hou, Yuexin Wu,         scientist: Probing gpt’s capabilities as a research li-
   Xuezhi Wang, Hongkun Yu, and Jiawei Han. 2022.           brarian, research ethicist, data generator, and data
   Large language models can self-improve. arXiv            predictor. Proceedings of the National Academy of
   preprint arXiv:2210.11610.                               Sciences, 121(35):e2404328121.
                                                     5988
Guohao Li, Hasan Hammoud, Hani Itani, Dmitrii                 Ashish Sabharwal, and Peter Clark. 2024. Discov-
  Khizbullin, and Bernard Ghanem. 2023. Camel:                erybench: Towards data-driven discovery with large
  Communicative agents for" mind" exploration of              language models. arXiv preprint arXiv:2407.01725.
  large language model society. Advances in Neural
  Information Processing Systems, 36:51991–52008.          Benjamin S Manning, Kehang Zhu, and John J Horton.
                                                             2024. Automated social science: Language models
Long Li, Weiwen Xu, Jiayan Guo, Ruochen Zhao,                as scientist and subjects. Technical report, National
  Xingxuan Li, Yuqian Yuan, Boqiang Zhang, Yuming            Bureau of Economic Research.
  Jiang, Yifei Xin, Ronghao Dang, and 1 others. 2024a.
  Chain of ideas: Revolutionizing research via novel       Daniel McDuff, Mike Schaekermann, Tao Tu, Anil
  idea development with llm agents. arXiv preprint           Palepu, Amy Wang, Jake Garrison, Karan Singhal,
  arXiv:2410.13185.                                          Yash Sharma, Shekoofeh Azizi, Kavita Kulkarni, and
                                                             1 others. 2023. Towards accurate differential diag-
Sihang Li, Jin Huang, Jiaxi Zhuang, Yaorui Shi, Xi-          nosis with large language models. arXiv preprint
  aochen Cai, Mingjun Xu, Xiang Wang, Linfeng                arXiv:2312.00164.
  Zhang, Guolin Ke, and Hengxing Cai. 2024b. Scil-
  itllm: How to adapt llms for scientific literature un-   Amil Merchant, Simon Batzner, Samuel S Schoenholz,
  derstanding. arXiv preprint arXiv:2408.15545.             Muratahan Aykol, Gowoon Cheon, and Ekin Dogus
                                                            Cubuk. 2023. Scaling deep learning for materials
Weixin Liang, Yuhui Zhang, Hancheng Cao, Binglu             discovery. Nature, 624(7990):80–85.
 Wang, Daisy Yi Ding, Xinyu Yang, Kailas Vodrahalli,
 Siyu He, Daniel Scott Smith, Yian Yin, and 1 others.      Erik Nijkamp, Bo Pang, Hiroaki Hayashi, Lifu Tu, Huan
 2024. Can large language models provide useful              Wang, Yingbo Zhou, Silvio Savarese, and Caiming
 feedback on research papers? a large-scale empirical        Xiong. 2022. Codegen: An open large language
 analysis. NEJM AI, 1(8):AIoa2400196.                         model for code with multi-turn program synthesis.
                                                              arXiv preprint arXiv:2203.13474.
Xinna Lin, Siqi Ma, Junjie Shan, Xiaojing Zhang,
  Shell Xu Hu, Tiannan Guo, Stan Z Li, and Kaicheng        OpenAI. 2022. Introducing chatgpt. https://openai.
  Yu. 2024. Biokgbench: A knowledge graph checking           com/index/chatgpt/. Blog post.
  benchmark of ai agent for biomedical science. arXiv      OpenAI. 2024. Introducing openai o1-preview. Ac-
  preprint arXiv:2407.00466.                                 cessed: 2024-09.
Yiren Liu, Si Chen, Haocong Cheng, Mengxia Yu, Xiao        Vishakh Padmakumar and He He. 2024. Does writing
   Ran, Andrew Mo, Yiliu Tang, and Yun Huang. 2024.          with language models reduce content diversity? In
   How ai processing delays foster creativity: Explor-       The Twelfth International Conference on Learning
   ing research question co-creation with an llm-based       Representations.
   agent. In Proceedings of the CHI Conference on
  Human Factors in Computing Systems, pages 1–25.          Huy Nhat Phan, Tien N Nguyen, Phong X Nguyen,
                                                             and Nghi DQ Bui. 2024. Hyperagent: Generalist
Chris Lu, Cong Lu, Robert Tjarko Lange, Jakob Foer-          software engineering agents to solve coding tasks at
  ster, Jeff Clune, and David Ha. 2024a. The ai scien-       scale. arXiv preprint arXiv:2409.16299.
  tist: Towards fully automated open-ended scientific
  discovery. arXiv preprint arXiv:2408.06292.              Ori Press, Andreas Hochlehnert, Ameya Prabhu,
                                                             Vishaal Udandarao, Ofir Press, and Matthias Bethge.
Chris Lu, Cong Lu, Robert Tjarko Lange, Jakob Fo-            2024. Citeme: Can language models accurately cite
  erster, Jeff Clune, and David Ha. 2024b. The AI            scientific claims? arXiv preprint arXiv:2407.12861.
  Scientist: Towards fully automated open-ended sci-
  entific discovery. arXiv preprint arXiv:2408.06292.      Pranav Putta, Edmund Mills, Naman Garg, Sumeet
                                                             Motwani, Chelsea Finn, Divyansh Garg, and Rafael
Xiaoliang Luo, Akilles Rechardt, Guangzhi Sun,               Rafailov. 2024. Agent q: Advanced reasoning and
  Kevin K Nejad, Felipe Yáñez, Bati Yilmaz, Kangjoo          learning for autonomous ai agents. arXiv preprint
  Lee, Alexandra O Cohen, Valentina Borghesani, An-          arXiv:2408.07199.
  ton Pashkov, and 1 others. 2024. Large language
  models surpass human experts in predicting neuro-        Edward O Pyzer-Knapp, Jed W Pitera, Peter WJ Staar,
  science results. Nature Human Behaviour, pages             Seiji Takeda, Teodoro Laino, Daniel P Sanders,
  1–11.                                                      James Sexton, John R Smith, and Alessandro Cu-
                                                             rioni. 2022. Accelerating materials discovery using
Andres M. Bran, Sam Cox, Oliver Schilter, Carlo Bal-         artificial intelligence, high performance computing
  dassari, Andrew D White, and Philippe Schwaller.           and robotics. npj Computational Materials, 8(1):84.
  2024. Augmenting large language models with chem-
  istry tools. Nature Machine Intelligence, pages 1–11.    Chen Qian, Yufan Dang, Jiahao Li, Wei Liu, Zihao
                                                             Xie, Yifei Wang, Weize Chen, Cheng Yang, Xin
Bodhisattwa Prasad Majumder, Harshit Surana, Dhruv           Cong, Xiaoyin Che, and 1 others. 2023. Experien-
  Agarwal, Bhavana Dalvi Mishra, Abhijeetsingh               tial co-learning of software-developing agents. arXiv
  Meena, Aryan Prakhar, Tirth Vora, Tushar Khot,             preprint arXiv:2312.17025.
                                                       5989
Chen Qian, Wei Liu, Hongzhang Liu, Nuo Chen, Yufan       Kyle Swanson, Wesley Wu, Nash L Bulaong, John E
  Dang, Jiahao Li, Cheng Yang, Weize Chen, Yusheng         Pak, and James Zou. 2024. The virtual lab: Ai agents
  Su, Xin Cong, and 1 others. 2024. Chatdev: Com-          design new sars-cov-2 nanobodies with experimental
  municative agents for software development. In Pro-      validation. bioRxiv, pages 2024–11.
  ceedings of the 62nd Annual Meeting of the Associa-
  tion for Computational Linguistics (Volume 1: Long     Nathan J Szymanski, Bernardus Rendy, Yuxing Fei,
  Papers), pages 15174–15186.                              Rishi E Kumar, Tanjin He, David Milsted, Matthew J
                                                           McDermott, Max Gallant, Ekin Dogus Cubuk, Amil
Yujia Qin, Shihao Liang, Yining Ye, Kunlun Zhu, Lan        Merchant, and 1 others. 2023. An autonomous labo-
  Yan, Yaxi Lu, Yankai Lin, Xin Cong, Xiangru Tang,        ratory for the accelerated synthesis of novel materials.
  Bill Qian, and 1 others. 2023. Toolllm: Facilitating     Nature, 624(7990):86–91.
  large language models to master 16000+ real-world
  apis. arXiv preprint arXiv:2307.16789.                 Hugo Touvron, Thibaut Lavril, Gautier Izacard, Xavier
                                                           Martinet, Marie-Anne Lachaux, Timothée Lacroix,
Bernardino    Romera-Paredes,      Mohammadamin            Baptiste Rozière, Naman Goyal, Eric Hambro, Faisal
  Barekatain, Alexander Novikov, Matej Balog,              Azhar, and 1 others. 2023a. Llama: Open and ef-
  M Pawan Kumar, Emilien Dupont, Francisco JR              ficient foundation language models. arXiv preprint
  Ruiz, Jordan S Ellenberg, Pengming Wang, Omar            arXiv:2302.13971.
  Fawzi, and 1 others. 2024. Mathematical discoveries
  from program search with large language models.        Hugo Touvron, Louis Martin, Kevin Stone, Peter Al-
  Nature, 625(7995):468–475.                               bert, Amjad Almahairi, Yasmine Babaei, Nikolay
                                                           Bashlykov, Soumya Batra, Prajjwal Bhargava, Shruti
Timo Schick, Jane Dwivedi-Yu, Roberto Dessi, Roberta       Bhosale, and 1 others. 2023b. Llama 2: Open foun-
  Raileanu, Maria Lomeli, Eric Hambro, Luke Zettle-        dation and fine-tuned chat models. arXiv preprint
  moyer, Nicola Cancedda, and Thomas Scialom. 2023.        arXiv:2307.09288.
  Toolformer: Language models can teach themselves
  to use tools. In Thirty-seventh Conference on Neural   Tao Tu, Anil Palepu, Mike Schaekermann, Khaled Saab,
  Information Processing Systems.                          Jan Freyberg, Ryutaro Tanno, Amy Wang, Brenna
                                                           Li, Mohamed Amin, Nenad Tomasev, and 1 others.
Samuel Schmidgall and Michael Moor. 2025. Agen-            2024. Towards conversational diagnostic ai. arXiv
  trxiv: Towards collaborative autonomous research.        preprint arXiv:2401.05654.
  arXiv preprint arXiv:2503.18102.
                                                         A Vaswani. 2017. Attention is all you need. Advances
Samuel Schmidgall, Rojin Ziaei, Carl Harris, Eduardo       in Neural Information Processing Systems.
  Reis, Jeffrey Jopling, and Michael Moor. 2024.
  Agentclinic: a multimodal agent benchmark to eval-     Shengye Wan, Cyrus Nikolaidis, Daniel Song, David
  uate ai in simulated clinical environments. arXiv        Molnar, James Crnkovich, Jayson Grace, Manish
  preprint arXiv:2405.07960.                               Bhatt, Sahana Chennabasappa, Spencer Whitman,
                                                           Stephanie Ding, and 1 others. 2024. Cyberseceval 3:
Dominik Schmidt, Zhengyao Jiang, and Yuxiang Un-           Advancing the evaluation of cybersecurity risks and
  known. 2024. Introducing weco aide.                      capabilities in large language models. arXiv preprint
                                                           arXiv:2408.01605.
Tianlin Shi, Andrej Karpathy, Linxi Fan, Jonathan Her-
   nandez, and Percy Liang. 2017. World of bits: An      Guanzhi Wang, Yuqi Xie, Yunfan Jiang, Ajay Man-
   open-domain platform for web-based agents. In In-       dlekar, Chaowei Xiao, Yuke Zhu, Linxi Fan, and
   ternational Conference on Machine Learning, pages       Anima Anandkumar. 2023. Voyager: An open-ended
   3135–3144. PMLR.                                        embodied agent with large language models. arXiv
                                                           preprint arXiv: Arxiv-2305.16291.
Noah Shinn, Federico Cassano, Ashwin Gopinath,
  Karthik Narasimhan, and Shunyu Yao. 2024. Re-          Lei Wang, Chen Ma, Xueyang Feng, Zeyu Zhang, Hao
  flexion: Language agents with verbal reinforcement       Yang, Jingsen Zhang, Zhiyuan Chen, Jiakai Tang,
  learning. Advances in Neural Information Process-        Xu Chen, Yankai Lin, and 1 others. 2024a. A survey
  ing Systems, 36.                                         on large language model based autonomous agents.
                                                           Frontiers of Computer Science, 18(6):186345.
Chenglei Si, Diyi Yang, and Tatsunori Hashimoto. 2024.
  Can llms generate novel research ideas? a large-       Xingyao Wang, Boxuan Li, Yufan Song, Frank F Xu, Xi-
  scale human study with 100+ nlp researchers. arXiv       angru Tang, Mingchen Zhuge, Jiayi Pan, Yueqi Song,
  preprint arXiv:2409.04109.                               Bowen Li, Jaskirat Singh, and 1 others. 2024b. Open-
                                                           devin: An open platform for ai software developers as
Xiaoshuai Song, Muxi Diao, Guanting Dong,                  generalist agents. arXiv preprint arXiv:2407.16741.
  Zhengyang Wang, Yujia Fu, Runqi Qiao, Zhexu
  Wang, Dayuan Fu, Huangxuan Wu, Bin Liang, and          Ryan Watkins. 2024. Guidance for researchers and peer-
  1 others. 2024. Cs-bench: A comprehensive bench-         reviewers on the ethical use of large language models
  mark for large language models towards computer          (llms) in scientific research workflows. AI and Ethics,
  science mastery. arXiv preprint arXiv:2406.08587.        4(4):969–974.
                                                     5990
Jason Wei, Xuezhi Wang, Dale Schuurmans, Maarten
   Bosma, Fei Xia, Ed Chi, Quoc V Le, Denny Zhou,
   and 1 others. 2022. Chain-of-thought prompting elic-
   its reasoning in large language models. Advances
   in neural information processing systems, 35:24824–
   24837.
Yixuan Weng, Minjun Zhu, Guangsheng Bao, Hongbo
  Zhang, Jindong Wang, Yue Zhang, and Linyi Yang.
  2024. Cycleresearcher: Improving automated
  research via automated review. arXiv preprint
  arXiv:2411.00816.
Qingyun Wu, Gagan Bansal, Jieyu Zhang, Yiran Wu,
  Shaokun Zhang, Erkang Zhu, Beibin Li, Li Jiang,
  Xiaoyun Zhang, and Chi Wang. 2023. Auto-
  gen: Enabling next-gen llm applications via multi-
  agent conversation framework. arXiv preprint
  arXiv:2308.08155.

Jiacen Xu, Jack W Stokes, Geoff McDonald, Xuesong
   Bai, David Marshall, Siyue Wang, Adith Swami-
   nathan, and Zhou Li. 2024. Autoattacker: A large lan-
   guage model guided system to implement automatic
   cyber-attacks. arXiv preprint arXiv:2403.01038.

Yutaro Yamada, Robert Tjarko Lange, Cong Lu, Shen-
  gran Hu, Chris Lu, Jakob Foerster, Jeff Clune, and
  David Ha. 2025. The ai scientist-v2: Workshop-level
  automated scientific discovery via agentic tree search.
  arXiv preprint arXiv:2504.08066.

John Yang, Carlos E Jimenez, Alexander Wettig, Kil-
  ian Lieret, Shunyu Yao, Karthik Narasimhan, and
  Ofir Press. 2024. Swe-agent: Agent-computer inter-
  faces enable automated software engineering. arXiv
  preprint arXiv:2405.15793.
Xingjian Zhang, Yutong Xie, Jin Huang, Jinge Ma,
  Zhaoying Pan, Qijia Liu, Ziyang Xiong, Tolga Er-
  gen, Dongsub Shim, Honglak Lee, and 1 others.
  2024. Massw: A new dataset and benchmark tasks
  for ai-assisted scientific workflows. arXiv preprint
  arXiv:2406.06357.
Yilun Zhou, Caiming Xiong, Silvio Savarese, and Chien-
   Sheng Wu. 2024. Shared imagination: Llms halluci-
   nate alike. arXiv preprint arXiv:2407.16604.




                                                        5991
A    Runtime statistics                                 this phase faster (56.8 seconds) but at a slightly
                                                        higher cost ($0.16). For Plan Formulation, gpt-4o
Runtime statistics for Agent Laboratory are de-
                                                        was both the fastest (23.3 seconds) and the cheap-
tailed to provide insight into the computational
                                                        est ($0.03), followed closely by o1-preview in cost
efficiency and monetary costs associated with dif-
                                                        ($0.04) but not in speed (33.1 seconds). The most
ferent phases of its workflow. In this evaluation,
                                                        expensive phase across models was Report Writing,
both the time required per phase (measured in sec-
                                                        where costs were driven by the increased computa-
onds) and the costs incurred (calculated in USD)
                                                        tional resources required for writing a long docu-
were analyzed to better understand the performance
                                                        ment. o1-preview incurred particularly high costs
of three model backends: gpt-4o, o1-mini, and o1-
                                                        in this phase ($9.58) despite producing comparable
preview. These measurements were recorded for
                                                        outputs in terms of task success rates.
each subtask, including Literature Review, Plan
Formulation, Data Preparation, Running Experi-          Success Rates Overall, every model exhibits rea-
ments, Results Interpretation, Report Writing, and      sonably high reliability, with o1-preview achieving
Report Refinement.                                      the highest average subtask success rate (95.7%)
Inference time Across all models, gpt-4o ex-            for the entire workflow. Both gpt-4o and o1-mini
hibited the fastest execution times, completing         followed closely at 94.3% and 92.8%. While most
the entire workflow in 1165.4 seconds, approxi-         tasks had 100% success rate for each model, the
mately 3.2x faster than o1-mini and 5.3x faster         literature review phase had a high rate of failure, at
than o1-preview, which required 3616.8 seconds          60%, 70%, and 80% for gpt-4o, o1-mini, and o1-
and 6201.3 seconds, respectively. In most subtasks,     preview respectively. The Data Preparation phase
gpt-4o demonstrated superior speed, particularly in     showed minor challenges, with o1-mini recording
Running Experiments and Report Writing phases,          an 80% success rate in Data Preparation, compared
where its times were significantly shorter than those   to gpt-4o’s 100% success rate and o1-preview at a
of o1-mini and o1-preview. For instance, in Run-        90% success rate.
ning Experiments, gpt-4o averaged 417.8 seconds,
                                                        B   Evaluating mle-solver on MLE-Bench
while o1-mini and o1-preview took 2082.5 seconds
and 4036.2 seconds, respectively. Similarly, for        Evaluating the entire Agent Laboratory workflow
Report Writing, gpt-4o completed the task in 572.5      does not contain much information about the abil-
seconds, compared to 827.7 seconds for o1-mini          ity of mle-solver specifically to solve individual
and 1854.2 seconds for o1-preview.                      ML problems. In order to evaluate mle-solver
                                                        more objectively, we use a subset of 10 ML chal-
Inference cost Monetary costs per workflow
                                                        lenges from MLE-Bench (Chan et al., 2024). MLE-
were also substantially lower for gpt-4o, which
                                                        Bench is a benchmark designed to assess the capa-
averaged just $2.33 for the entire process. This
                                                        bility of agents in handling real-world ML tasks on
is significantly more cost effective than previous
                                                        Kaggle competitions. This benchmark compares
autonomous research workflows (Lu et al., 2024b),
                                                        agent performances with human baselines, scoring
which cost around ∼$15 (6.4x more expensive) to
                                                        agents with Kaggle’s medal system, and incorporat-
complete using gpt-4o. Other models in our work-
                                                        ing mechanisms to mitigate contamination and pla-
flow has a lower cost efficiency, such as o1-mini
                                                        giarism risks. We include all challenges focusing
at $7.51, and o1-preview at $13.10, the latter be-
                                                        on text and tabular data from the low complexity
ing over 5.6x more expensive than gpt-4o. Among
                                                        category of MLE-Bench. We provide as input to
the individual subtasks, gpt-4o consistently had
                                                        mle-solver the following: Kaggle dataset descrip-
the lowest costs. For example, its costs for Data
                                                        tion, distilled knowledge from Kaggle notebooks,
Preparation and Report Writing were $0.09 and
                                                        as well as an accessible train and dev set. Instead
$1.73, respectively, compared to $3.03 and $2.58
                                                        of using an LLM scoring function, the mle-solver
for o1-mini, and $0.30 and $9.58 for o1-preview.
                                                        score is evaluated on the dev set, which is a 20%
Phase-level Observations From our observa-              random sample taken from the original training
tions at the phase-level, Literature Review was         set, and the training set is represented by the other
notably efficient for all models in terms of time       80% split. All data (dev, test, train) is placed into
and cost, with gpt-4o completing it in 92.9 seconds     arrays using the numpy library instead of provid-
at a cost of $0.12. Meanwhile, o1-mini completed        ing file locations in order to better emulate the
                                                    5992
Figure 6: Performance and Cost Evaluation. This table summarizes the runtime statistics, cost, and success rates of
Agent Laboratory across its workflow phases using three different model backends: gpt-4o, o1-mini, and o1-preview.
The metrics include average cost per phase (in USD), average time per phase (in seconds), and success rates for
each phase.




Figure 7: Average score of four methods (MLAB, OpenHands, AIDE, and mle-solver) on a subset of MLE-Bench.




                                                      5993
data preparation phase. Once all mle-solver steps       pabilities are extended through structured frame-
have concluded, the final code with the highest         works, enabling them to autonomously and semi-
score is evaluated on the actual Kaggle test set and    autonomously perform task execution and semi-
a benchmark score is recorded.                          autonomously perform task execution (Wu et al.,
   We compare average scores across several runs        2023; Li et al., 2023; Chen et al., 2023; Qian et al.,
from three other methods: MLAB (Huang et al.,           2024). These systems, referred to as agents, uti-
2024), gpt-4o backend), OpenHands (Wang et al.,         lize techniques such as chain-of-thought prompting
2024b), gpt-4o backend), and AIDE (Schmidt et al.,      (Wei et al., 2022), iterative refinement (Shinn et al.,
2024), o1-preview backend). While mle-solver            2024), self-improvement (Huang et al., 2022), and
submitted valid solutions for all MLE-Bench chal-       external tool integration to execute complex work-
lenges within two hours, prior methods often failed     flows (Hao et al., 2024; Qin et al., 2023; Schick
to submit, complicating scoring. We thus calcu-         et al., 2023). LLM agents have made remarkable
lated average scores by excluding invalid submis-       progress in solving tasks of real-world significance,
sions from other works and averaging valid ones.        such as software engineering (Jimenez et al., 2023;
We find that Agent Laboratory’s mle-solver is           Yang et al., 2024; Wang et al., 2024b), cybersecu-
more consistently high scoring than other solvers,      rity (Abramovich et al., 2024; Wan et al., 2024;
with mle-solver obtaining four medals (two gold,        Fang et al., 2024), and medical diagnosis (Tu et al.,
one silver, and one bronze) compared with Open-         2024; Schmidgall et al., 2024; McDuff et al., 2023).
Hands (gpt-4o) obtaining two medals (two gold),         There has also been progress in applying LLMs
AIDE (o1-preview) obtaining two medals (one             agents to embodied problems such as autonomous
gold, one bronze) and MLAB obtaining zero               robotics (Brohan et al., 2022; Kim et al., 2024;
medals. Additionally, mle-solver obtained above         Black et al., 2024; Brohan et al., 2023), web tasks
median human performance on six out of ten bench-       (Gur et al., 2023; Putta et al., 2024; Deng et al.,
marks, with AIDE obtaining five out of ten, Open-       2024; Shi et al., 2017; He et al., 2024), and game
Hands two out of ten, and MLAB zero out of ten.         playing (Wang et al., 2023; Feng et al., 2024; AL
A detailed overview is provided in Figure 7.            et al., 2024). For a broader overview of LLM
                                                        agents, refer to (Wang et al., 2024a).
C    Extended related work
                                                        Automated machine learning Automated ma-
Large language models The research agents in            chine learning is an area of active research, with
this paper are built on autoregressive large lan-       many approaches focused on using Kaggle, an on-
guage models (LLMs), which are trained on ex-           line platform for machine learning competitions,
tensive text corpora to predict conditional proba-      as a benchmark for evaluating agent performance.
bilities of token sequences, p(xt |x<t ; θ), and gen-   Notable efforts include MLE-Bench (Chan et al.,
erate text completions through sampling, where          2024), DS-bench (Jing et al., 2024), and MLAgent-
xt ∼ softmax(W · ht ), with ht as the hidden state      Bench (Huang et al., 2024) which propose using 75,
and W as the learned weight matrix mapping to           74, and 6 Kaggle challenges respectively as bench-
token probabilities. LLMs utilize transformer ar-       marks to measure the abilities of ML agents in
chitectures (Vaswani, 2017) to capture long-range       tasks such as data preparation, model development,
dependencies in text. These models, such as Claude      and submission. Several ML "solvers" which can
(Anthropic, 2024), Llama (Touvron et al., 2023a,b;      solve ML challenges have been introduced, such
Dubey et al., 2024), and ChatGPT (Hurst et al.,         as AIDE (Schmidt et al., 2024), CodeActAgent (re-
2024; OpenAI, 2022; Achiam et al., 2023), lever-        ferred to as “OpenHands") (Wang et al., 2024b),
age vast datasets and scaling techniques, thus en-      and ResearchAgent (referred to as “MLAB") from
abling them to perform a wide array of language-        MLAgentBench (Huang et al., 2024) which auto-
based tasks, such as translation, summarization,        mate feature implementation, bug fixing, and code
and reasoning, by generalizing patterns learned         refactoring with a high success rate. Agent K (Gros-
during pretraining to novel inputs (Brown, 2020).       nit et al., 2024) demonstrates the ability to solve
                                                        Kaggle challenges at the human-level with a chal-
LLM Agents While LLMs demonstrate strong
                                                        lenge URL provided as input.
understanding and reasoning abilities, they face
challenges when executing tasks in real-world sce-      AI in Scientific Discovery AI has been used to
narios. To overcome these limitations, their ca-        support scientific discovery across numerous disci-
                                                    5994
Figure 8: Graphical outline of paper-solver. This diagram showcases the step-by-step process of generating
and refining academic research reports using the Paper-Solver tool. The workflow starts with the creation of an
initial report scaffold (A) by iteratively generating LaTeX-based sections, followed by updates to ensure structural
completeness. (B) Research is performed through an Arxiv tool during relevant sections. In the Report Editing
phase (C), the language model applies targeted edits to improve the document, with LaTeX compilation verifying
the integrity of changes. Finally, the completed report undergoes a reward-based evaluation during the Paper Review
phase (D), ensuring alignment with academic standards and research goals.

                              Table 1: Hyperparameters for AGENT L ABORATORY.

                     Category                     Hyperparameter                       Value
                     Literature Review            Number of Paper Summaries            5
                                                  Full Text History Decay Steps        3
                                                  Agent temperature                    0.8
                     Data Preparation             Experiment Timeout                   120s
                     Running Experiments          mle-solver steps                     3
                                                  Code repair attempts                 2
                                                  Maximum top codes                    2
                                                  Error history length                 5
                                                  Code history length                  2
                                                  Number of comparison trials          2
                                                  Experiment Timeout                   600s
                                                  Score generation temperature         0.6
                                                  Repair temperature                   0.8
                                                  Initial code temperature             1.0
                                                  Solver temperature                   1.0
                     Paper Writing                paper-solver steps                   5
                                                  Maximum top papers                   1
                                                  Paper history length                 10
                                                  Number of Reviewers                  1
                                                  Number of comparison trials          2
                                                  Solver temperature                   1.0
                                                  Initial paper temperature            0.8
                     Paper Refinement             Number of Reviewers                  3



plines for decades. For instance, AI has been used          2023), chemistry (Jumper et al., 2021; Hayes et al.,
for discovery in mathematics (Romera-Paredes                2024), algorithm discovery (Fawzi et al., 2022),
et al., 2024), material science (Szymanski et al.,          and computational biology (Ding et al., 2024).
2023; Pyzer-Knapp et al., 2022; Merchant et al.,            These approaches position AI as a tool rather than

                                                       5995
an agent performing research in autonomous re-             experiment design, and iterative refinement using
search.                                                    feedback from reviewing agents aligned with hu-
                                                           man evaluation criterion. The AI Scientist (Lu
LLMs for research related tasks LLMs
                                                           et al., 2024a; Yamada et al., 2025) extends this
have demonstrated strong capabilities in diverse
                                                           automation to encompass end-to-end scientific dis-
research-related tasks, such as code generation
                                                           covery, including coding, experiment execution,
(Chen et al., 2021; Nijkamp et al., 2022), end-to-
                                                           and automated peer review for manuscript genera-
end software development (Qian et al., 2024, 2023;
                                                           tion. Despite these advancements, studies like (Si
Phan et al., 2024; Hai et al., 2024), code genera-
                                                           et al., 2024) highlight limitations in the feasibility
tion for discovery (Majumder et al., 2024; Ifargan
                                                           and implementation details of LLM ideation, indi-
et al., 2024; Hu et al., 2024; Guo et al., 2024; Gu
                                                           cating a complementary rather than replacement
et al., 2024; Ghafarollahi and Buehler, 2024a; Chen
                                                           role for LLMs in autonomous research.
et al., 2024b), research question-answering (Chen
et al., 2024a; Lála et al., 2023; Song et al., 2024;
                                                           C.1   Example Review
Lin et al., 2024), research ideation (Baek et al.,
2024; Ghafarollahi and Buehler, 2024b; Li et al.,             Example Review ( o1-mini | Word Order
2024a; Si et al., 2024), automated paper review-              Sensitivity )
ing (D’Arcy et al., 2024; Liang et al., 2024; Lu
et al., 2024b; Weng et al., 2024), literature search           "Strengths": [
(Ajith et al., 2024; Kang and Xiong, 2024; Press              "Comprehensive experimental design
et al., 2024; Li et al., 2024b), and predicting the out-      and methodology.",
come of experiments (Luo et al., 2024; Ashokku-               "Use of a well-known dataset (RACE)
mar et al., 2024; Lehr et al., 2024; Manning et al.,          for evaluation.",
2024; Zhang et al., 2024). Although LLMs have                 "Empirical validation of bias
made notable progress in solving the aforemen-                mitigation strategies.",
tioned tasks, ideation has struggled to progress,             "Clear presentation of results and
with some work showing that LLM ideation leads                analysis."],
to greater novelty than humans (Si et al., 2024),             Weaknesses": [
while others show reduced creativity (Chakrabarty             "Limited exploration of additional
et al., 2024) and greater homogeneous effects (An-            bias    mitigation     techniques.",
derson et al., 2024; Zhou et al., 2024) that may              "Lack of in-depth discussion on
limit creative discovery without human guidance.              limitations
   Additionally, research on human-AI collabora-              and societal impacts.",
tion has reached mixed conclusions about the idea             "The originality could be enhanced
novelty (Ashkinaze et al., 2024; Liu et al., 2024;            by exploring novel
Padmakumar and He, 2024). These findings sug-                 strategies."],
gest that, with the current LLMs, the strongest               "Originality": 3, "Quality": 4,
research systems would combine human-guided                   "Clarity": 3, "Significance": 3,
ideation with LLM-based workflows.                            "Questions": [
                                                              "Have you considered exploring
LLMs for autonomous research Recent ad-                       additional bias
vancements in automated scientific workflows have             mitigation     techniques     beyond
focused on leveraging LLMs to emulate the pro-                majority voting and entropy-based
cess of research. (Swanson et al., 2024) intro-               thresholding?",
duces a team of LLM agents working as scientists              "Can you provide more details on
alongside a human researcher who provides high-               the potential societal impacts
level feedback, with the end result being novel               of the model’s sensitivity to
nanobody binders aimed at addressing recent vari-             option order?",
ants of SARS-CoV-2. ChemCrow (M. Bran et al.,                 "What are the limitations of the
2024) and Coscientist (Boiko et al., 2023) demon-             current study, and how
strate the ability for autonomous ideation and ex-            might they be addressed in future
perimentation in chemistry. ResearchAgent (Baek               work?"],
et al., 2024) automates research idea generation,
                                                       5996
                                                   Complete String The complete string is typically
    "Limitations": [
                                                   set to the empty string. However, in the case when
    "The study is limited to the RACE
                                                   the number of steps reaches 70% of the way to-
    dataset and may not generalize
                                                   ward completion, the following is appended to the
    to other datasets.",
                                                   base prompt to encourage the agent to produce a
    "The bias mitigation strategies,
                                                   submission.
    while effective,
    do   not    completely   eliminate
                                                      Complete String (complete_str)
    sensitivity to option order."],
    "Ethical Concerns": false,                        You must finish this task and submit
    "Soundness": 3, "Presentation": 3,                as soon as possible!
    "Contribution": 3,
    "Overall": 7, "Confidence": 4,
    "Decision": "Accept"                              History Line

                                                      Step #{step}, Phase:       {phase},
C.2 Hardware                                          Feedback:      {feedback},     Your
                                                      response: {model_resp}
All experiments in this paper were run on a 2023
MacBook Pro with an Apple M3 Max processor
and 36 GB of memory.                               D.2   Context Prompts

D    Prompts                                          Context Prompt

D.1 Base Inference Prompt                             {sr_str}
                                                      {context_prompt}
    Base System Prompt

    You are {self.role_description()}           Context Prompt Second Round String
                                               (sr_string)
    Task instructions:{self.phase_prompt(phase)}
    {self.command_descriptions(phase)}
                                               The following are results from the
                                                previous experiments
    Base Prompt                                 Previous        Experiment         code:
                                               {self.prev_results_code}
    {context_prompt}
                                                Previous                        Results:
    History: {history_str}
                                               {self.prev_exp_results}
    Current Step #{step}
                                                Previous Interpretation of results:
    Phase: {phase}
                                               {self.prev_interpretation}
    {complete_str}
                                                Previous                         Report:
    [Objective] Your goal is to perform
                                               {self.prev_report}
    research on the following topic:
                                               {self.reviewer_response}
    {research_topic}
    Feedback: {feedback}
    Notes: {notes_str}                          Context Prompt Plan Formulation
    Your    previous    command    was:
    {self.prev_comm}.       Make sure           Current      Literature          Review:
    your new output is different.              {self.lit_review_summary}
    Please produce a single command
    below:                                      Context Prompt Data Preparation

                                                      Current      Literature            Review:
    Phase Notes (notes_str)
                                                      {self.lit_review_summary}
    Notes for the         task   objective:           Current Plan: {self.plan}
    {phase_notes}

                                               5997
   Context Prompt Results Interpretation
                                                  for a very simple experiment that
  Current      Literature    Review:              showcases your plan, not a complex
  {lit_review_sum}                                one.    You should integrate the
  Current Plan: {self.plan}                       provided literature review and come
  Current         Dataset      code:              up with plans on how to expand
  {self.dataset_code}                             and build on these works for the
  Current       Experiment     code:              given topic.    Your plans should
  {self.results_code}                             provide a clear outline for how to
  Current                   Results:              achieve the task, including what
  {self.exp_results}                              machine learning models to use and
                                                  implement, what types of datasets
                                                  should be searched for and used
   Context Prompt Report Refinement
                                                  to train the model, and the exact
  Current      Literature    Review:              details of the experiment.
  {lit_review_sum}
  Current Plan: {self.plan}
                                                  PhD Data Preparation Phase Prompt
  Current         Dataset      code:
  {self.dataset_code}                             You are a PhD student directing
  Current       Experiment     code:              a machine learning engineer, where
  {self.results_code}                             the machine learning engineer will
  Current                   Results:              be writing the code, and you
  {self.exp_results}                              can interact with them through
  Current Interpretation of results:              dialogue.
  {self.interpretation}                           Your goal is to help the ML engineer
                                                  produce code that prepares the data
D.3 Agent Phase Descriptions                      for the provided experiment. You
D.3.1   PhD Student phase                         should aim for very simple code to
                                                  prepare the data, not complex code.
   PhD Literature Review Phase Prompt             You should integrate the provided
                                                  literature review and the plan and
   Your goal is to perform a literature
                                                  come up with code to prepare data
   review for the presented task
                                                  for this experiment.
   and add papers to the literature
   review.
   You have access to arXiv and                   PhD Results Interpretation Phase Prompt
   can perform two search operations:
   (1) finding many different paper               You are a PhD student being directed
   summaries from a search query and              by a postdoc who will help you
   (2) getting a single full paper text           come up with an interpretation for
   for an arXiv paper.                            results from an experiment, and
                                                  you interact with them through
   PhD Literature Review Phase Prompt             dialogue.
                                                  Your goal is to interpret results
   You are a PhD student being directed           from    experiments     that    were
   by a postdoc who will help you                 previously run. You should read
   come up with a good plan, and                  through the code and look at the
   you interact with them through                 results to understand what occurred.
   dialogue.                                      You should then discuss with the
   Your goal is to produce plans that             postdoc your interpretation and
   would make good experiments for                use their feedback to improve your
   the given topic. You should aim                thoughts.     You should integrate

                                           5998
  the provided literature review,              simple code to prepare the data, not
  code, and plans to come up with an           complex code. You should integrate
  exciting interpretation that could           the provided literature review and
  make a compelling paper. Your plans          the plan and come up with code to
  should provide a clear outline that          prepare data for this experiment.
  can be used to write an academic
  paper.
                                           D.5   Postdoc Phase Descriptions
  Your interpretation should include
  numbers, relevant metrics to the             Postdoc Plan Formulation Prompt
  experiment (e.g., accuracy or loss)
  and measures of significance. You            You are directing a PhD student to
  must propagate this information              help them come up with a good plan,
  accurately.                                  and you interact with them through
  You must submit the interpretation           dialogue.
  during this phase in a reasonable            Your goal is to produce plans that
  amount of time. Do not delay the             would make good experiments for
  submission.                                  the given topic. You should aim
                                               for a very simple experiment that
                                               showcases your plan, not a complex
  PhD Report Refinement Phase Prompt
                                               one.    You should integrate the
  You are a PhD student who has                provided literature review and come
  submitted their paper to an ML               up with plans on how to expand
  conference called ICLR. Your goal            and build on these works for the
  was to write a research paper and            given topic.    Your plans should
  get high scores from the reviewers           provide a clear outline for how to
  so that it get accepted to the               achieve the task, including what
  conference.                                  machine learning models to use and
                                               implement, what types of datasets
  PhD Report Refinement Phase Prompt           should be searched for and used
                                               to train the model, and the exact
  You are a PhD student who has                details of the experiment.
  submitted their paper to an ML
  conference called ICLR. Your goal
                                               Postdoc Results Interpretation Phase
  was to write a research paper and
                                               Prompt
  get high scores from the reviewers
  so that it get accepted to the               You are directing a PhD student
  conference.                                  to help them come up with an
                                               interpretation for results from an
D.4 Machine Learning Engineer Phase            experiment, and you interact with
    Descriptions                               them through dialogue.
  ML Engineer Data Preparation Phase           Your   goal    is   to   interpret
  Prompt                                       results from experiments that
                                               were previously run. You should
  You are a machine learning engineer          read through the code and look
  being directed by a PhD student who          at the results to understand what
  will help you write the code, and            occurred. You should then discuss
  you can interact with them through           with the PhD student how they can
  dialogue.                                    interpret the results and give
  Your goal is to produce code that            their feedback to improve their
  prepares the data for the provided           thoughts.    You should integrate
  experiment.    You should aim for            the provided literature review,

                                        5999
   code, and plans to come up with an             where arXiv_paper_ID is the ID
   exciting interpretation that could             of the arXiv paper, PAPER_SUMMARY
   make a compelling paper. Your plans            is a brief summary of the paper,
   should provide a clear outline that            and ADD_PAPER is just the word
   can be used to write an academic               ADD_PAPER. You can only add one
   paper.                                         paper at a time.
   Your interpretation should include             Make sure to use ADD_PAPER when you
   numbers, relevant metrics to the               see a relevant paper. DO NOT use
   experiment (e.g., accuracy or loss)            SUMMARY too many times.
   and measures of significance. You              You can only use a single command
   must propagate this information                per inference turn. Do not use
   accurately. You must also complete             more than one command per inference.
   this in a reasonable amount of time            If you use multiple commands, then
   and then submit your results.                  only one of them will be executed,
                                                  not both.
D.6 Agent Command Description                     Make sure to extensively discuss
                                                  the experimental results in your
D.6.1   PhD Student Command Description           summary.
   PhD Student Literature Review Command          When performing a command, make
   Prompt                                         sure to include the three ticks
                                                  (```) at the top and bottom
   To collect paper summaries, use the            ```COMMAND
   following command:                             text
   ```SUMMARY                                     ```where COMMAND is the specific
   SEARCH QUERY                                   command you want to run (e.g.,
   ```                                            ADD_PAPER, FULL_TEXT, SUMMARY). Do
   where SEARCH QUERY is a string that            not use the word COMMAND make sure
   will be used to find papers with               to use the actual command, e.g.,
   semantically similar content and               your command should look exactly
   SUMMARY is just the word SUMMARY.              like this: ```ADD_PAPER
   To get the full paper text for                 text
   an arXiv paper, use the following              ```(where the command could be from
   command: ```FULL_TEXT                          ADD_PAPER, FULL_TEXT, SUMMARY)
   arXiv paper ID
   ```
   where arXiv paper ID is the ID
   of the arXiv paper (which can
   be found by using the SUMMARY                  PhD Student Plan Formulation Command
   command), and FULL_TEXT is just the            Prompt
   word FULL_TEXT. Make sure to read
   the full text using the FULL_TEXT              You can produce dialogue using the
   command before adding it to your               following command: ```DIALOGUE
   list of relevant papers.                       dialogue here
   If you believe a paper is relevant             ```
   to the research project proposal,              where ’dialogue here’ is the actual
   you can add it to the official                 dialogue you will send and DIALOGUE
   review after reading using the                 is just the word DIALOGUE.
   following command: ```ADD_PAPER
   arXiv_paper_ID
   PAPER_SUMMARY
   ```

                                           6000
PhD Student Data Preparation Command          SUBMIT_CODE, DIALOGUE).
Prompt

You can produce dialogue using the            PhD Student Results Interpretation Com-
following command: ```DIALOGUE                mand Prompt
dialogue here
```                                           You can produce dialogue using the
where ’dialogue here’ is the actual           following command: ```DIALOGUE
dialogue you will send and DIALOGUE           dialogue here
is just the word DIALOGUE.                    ```
When you and the ML engineer have             where ’dialogue here’ is the actual
finalized your dataset preparation            dialogue you will send and DIALOGUE
code and are ready to submit                  is just the word DIALOGUE. When
the final code, please use the                performing a command, make sure to
following command: ```SUBMIT_CODE             include the three ticks (```) at
code here                                     the top and bottom ```COMMAND
```                                           text
where ’code here’ is the finalized            ```where COMMAND is the specific
code you will send and SUBMIT_CODE            command you want to run (e.g.,
is just the word SUBMIT_CODE.                 DIALOGUE).
The submitted code must have a
HuggingFace dataset import and must       D.6.2   ML Engineer Agent Command
use an external HuggingFace dataset.              Description
If your code returns any errors,
they will be provided to you, and             ML Engineer Data Preparation Command
you are also able to see print                Prompt
statements.    Make sure function
                                              You can produce code using the
variables are created inside the
                                              following command: ```python
function or passed as a function
                                              code here
parameter. DO NOT CREATE A MAIN
                                              ```
FUNCTION.
                                              where code here is the actual
Make sure to submit code in a
                                              code you will execute in a Python
reasonable amount of time. Do not
                                              terminal, and python is just the
make the code too complex, try to
                                              word python. If your code returns
make it simple. Do not take too
                                              any errors, they will be provided
long to submit code. Submit the
                                              to you, and you are also able to
code early. You should submit the
                                              see print statements.     You will
code ASAP.
                                              receive all print statement results
You can only use a single command
                                              from the code. Make sure function
per inference turn. Do not use
                                              variables are created inside the
more than one command per inference.
                                              function or passed as a function
If you use multiple commands, then
                                              parameter.
only one of them will be executed,
                                              You can produce dialogue using the
not both.
                                              following command: ```DIALOGUE
When performing a command, make
                                              dialogue here
sure to include the three ticks
                                              ```
(```) at the top and bottom
                                              where dialogue here is the actual
```COMMAND
                                              dialogue you will send,         and
text
                                              DIALOGUE is just the word DIALOGUE.
```where COMMAND is the specific
                                              You also have access to HuggingFace
command you want to run (e.g.,
                                              datasets.     You can search the

                                       6001
   datasets repository using the                   where plan here is the actual plan
   following command: ```SEARCH_HF                 to be transmitted and PLAN is just
   search query here                               the word PLAN. Plan here should
   ```where search query here is the               provide a clear outline for how to
   query used to search HuggingFace                achieve the task, including what
   datasets, and SEARCH_HF is the                  machine learning models to use and
   word SEARCH_HF. This will return                implement, what types of datasets
   a list of HuggingFace dataset                   should be searched for and used
   descriptions which can be loaded                to train the model, and the exact
   into Python using the datasets                  details of the experiment.
   library. Your code MUST use an                  You can only use a SINGLE command
   external HuggingFace directory.                 per inference turn. Do not use
   You MUST use a HuggingFace dataset              more than one command per inference.
   in your code. DO NOT CREATE A MAIN              If you use multiple commands, then
   FUNCTION. Try to make the code very             only one of them will be executed,
   simple.                                         NOT BOTH.
   You can only use a SINGLE command               Make sure not to produce too much
   per inference turn. Do not use                  dialogue and to submit an plan in
   more than one command per inference.            reasonable time.
   If you use multiple commands, then              When performing a command, make
   only one of them will be executed,              sure to include the three ticks
   NOT BOTH.                                       (```) at the top and bottom
   When performing a command, make                 ```COMMAND
   sure to include the three ticks                 text
   (```) at the top and bottom                     ```where COMMAND is the specific
   ```COMMAND                                      command you want to run (e.g., PLAN,
   text                                            DIALOGUE).
   ```where COMMAND is the specific
   command you want to run (e.g.,
   python, DIALOGUE, SEARCH_HF).                   Postdoc Results Interpretation Command
                                                   Prompt
D.6.3   Postdoc Agent Command Description          When    you    believe    a    good
                                                   interpretation has been arrived at
   Postdoc Plan Formulation Command
                                                   between you and the PhD student
   Prompt
                                                   you can use the following command
   You can produce dialogue using the              to end the dialogue and submit the
   following command: ```DIALOGUE                  plan ```INTERPRETATION
   dialogue here                                   interpretation here
   ```                                             ```
   where dialogue here is the actual               where   interpretation    here   is
   dialogue you will send and DIALOGUE             the actual interpretation to be
   is just the word DIALOGUE.                      transmitted   and    INTERPRETATION
   When you believe a good plan                    is just the word INTERPRETATION.
   has been arrived at between you                 Please provide an INTERPRETATION
   and the PhD student you can                     in a reasonable amount of time.
   use the following command to end                You can produce dialogue using the
   the dialogue and submit the plan                following command: ```DIALOGUE
   ```PLAN                                         dialogue here
   plan here                                       ```
   ```                                             where dialogue here is the actual

                                            6002
   dialogue you will send and DIALOGUE            This tool allows you to entirely
   is just the word DIALOGUE.                     re-write/replace all of the current
   You must submit the interpretation             code and erase all existing code.
   during this phase in a reasonable              You can use this tool via the
   amount of time. Do not delay the               following command: ```REPLACE
   submission.    When performing a               <code here>
   command, make sure to include the              ```, where REPLACE is the word
   three ticks (```) at the top and               REPLACE and <code here> will be
   bottom ```COMMAND                              the new code that is replacing
   text                                           the entire set of old code. This
   ```where COMMAND is the specific               tool is useful if you want to make
   command you want to run (e.g.,                 very significant changes, such as
   INTERPRETATION, DIALOGUE).                     entirely changing the model, or the
                                                  learning process. Before changing
                                                  the existing code to be your new
D.7 Agent Role Description                        code, your new code will be tested
D.7.1   PhD Student Role Description              and if it returns an error it will
                                                  not replace the existing code. Try
   PhD Student Role Prompt                        limiting the use of rewriting and
   You are a computer science PhD                 aim for editing the code more.
   student at a top university.

D.7.2   Machine Learning Engineer Role            mle-solver Edit Tool
        Description
                                                  ============= CODE EDITING TOOL
   Machine Learning Engineer Role Prompt          =============
                                                  You also have access to a code
   You are a machine learning engineer
                                                  editing tool.
   working at a top university.
                                                  This tool allows you to replace
                                                  lines indexed n through m (n:m) of
D.7.3   Professor Agent                           the current code with as many lines
   Professor Role Prompt                          of new code as you want to add. This
                                                  removal is inclusive meaning that
   You are a computer science professor           line n and m and everything between
   at a top university.                           n and m is removed. This will be
                                                  the primary way that you interact
D.7.4   Postdoc Agent Role Description            with code.
   Postdoc Role Prompt                            You can edit code using the
                                                  following command: ```EDIT N M
   You   are   a  computer science                <new lines to replace old lines>
   postdoctoral student at a top                  ```EDIT is the word EDIT, N is the
   university.                                    first line index you want to replace
                                                  and M the the last line index
D.8 mle-solver Prompts                            you want to replace (everything
D.8.1 Tools                                       inbetween will also be removed),
   mle-solver Replace Tool                        and <new lines to replace old
                                                  lines> will be the new code that
   ============= REWRITE CODE EDITING             is replacing the old code. Before
   TOOL =============                             changing the existing code to be
   You also have access to a code                 your new code, your new code will be
   replacing tool.                                tested and if it returns an error it

                                           6003
will not replace the existing code.            original code as closely as
Your changes should significantly              possible.
change the functionality of the                You must wrap the code in the
code.                                          following ```python
                                               <code here>
Professor Agent Scoring System Prompt          ```
                                               Do not forget the opening ```python
You are a professor agent who is               and the closing ```.
serving as an expert reward model
that can read a research plan,
research code, and code output and             Code Repair Tool Prompt
are able to determine how well a
model followed the plan, built the             Provided here is the error: {error}
code, and got the proper output
scored from 0 to 1 as a float.                 Provided below is the code:

You must structure your score                  {code}
exactly in the following way:
```SCORE
<score here>                                   Initial Code Generation Prompt
```where SCORE is just the word
                                               {err_hist}
score, <score here> is a floating
                                               You should now use ```REPLACE to
point number between 0 and 1
                                               create initial code to solve the
representing how well the model
                                               challenge. Now please enter the
followed the plan, built the code,
                                               ```REPLACE command below:
and got the proper output

Professor Agent Scoring Prompt
                                               Initial Code Generation Error Prompt
Outlined in the following text is              (err_hist)
the research plan that the machine
learning engineer was tasked with              The following is a history of your
building: {outlined_plan}                      previous errors
The following text is the research             {errs}
code that the model produced:                  nDO NOT REPEAT THESE.
{code}
The following is the output from the
model: {code_return}                          Where the string errs is concatenation of the min-
                                           imum between five previous errors and the length
                                           of all errors (i.e. all errors until the number reaches
Code Repair Tool System Prompt             five, then only five).
You are an automated code repair
tool.                                          Initial Code Generation Error Prompt (err)
Your goal is to take in code and
an error and repair the code to                The following was the previous
make sure the same error does not              command generated: {model_resp}.
repeat itself, and also to remove              This was the error return {cmd_str}.
any other potential errors from                You should make sure not to repeat
the code without affecting the code            this error and to solve the
output.                                        presented problem.
Your output should match the

                                        6004
mle-solver System Prompt                    mle-solver         Role   Description
                                            (role_description)
{self.role_description()}.
The           following          are        You are an expert machine learning
your        task        instructions:       engineer working at a top university
{self.phase_prompt()}                       to write code to solve machine
Provided below are some insights            learning research challenges using
from a literature review summary:           your machine learning expertise.
{self.insights}
{self.code _reflect}
The     following      are     notes,
instructions, and general tips              mle-solver Command Description (com-
for you: {self.notes}                       mand_description)
You are given a machine learning
research task described, where              You also have access to tools which
the plan is described as follows:           can be interacted with using the
{self.plan}                                 following structure: ```COMMAND
{self.generate_dataset_descr_prompt()}      <command information here>
You should also try generating at           , where COMMAND is whichever
least two figures to showcase the           command you want to run (e.g., EDIT,
results, titled Figure_1.png and            REPLACE...), <command information
Figure_2.png                                here> is information used for the
Your method MUST not get 0%                 command, such as code to run or a
accuracy. If it does, you have done         search query, and ```are meant to
something wrong and must correct            encapsulate the command. ```must
this.    Make sure to check your            be included as part of the command
accuracy calculation is correct.            both at the beginning and at the end
Your goal is to solve the research          of the code. DO NOT FORGOT TO HAVE
plan as well as possible.         You       ```AT THE TOP AND BOTTOM OF CODE.
will receive a score after you              and this structure must be followed
write the code and should aim to            to execute a command correctly. YOU
maximize the score by following the         CAN ONLY EXECUTE A SINGLE COMMAND
plan instructions and writing high          AT A TIME! Do not try to perform
quality code.                               multiple commands EVER only one.
Before each experiment please               Make sure to import everything that
include     a     print    statement        you are using.
explaining     exactly    what    the       Reflect on the code before writing
results are meant to show in great          it to make sure there are no bugs
detail before printing the results          or compilation issues.
out.                                        YOU MUST USE COMMANDS PROPERLY. Do
The following are commands you have         not use the word COMMAND for the
access to:                                  command that is incorrect. You must
{self.command_descriptions()}. You          use an actual command (e.g., EDIT,
should try to have a diversity of           REPLACE...) NOT THE WORD COMMAND.
command responses if appropriate.           Do not make this mistake.
Do not repeat the same commend              Under no circumstances should you
too many times. Please consider             use tensorflow or keras. Only use
looking through your history and            pytorch for scikitlearn for deep
not repeating commands too many             learning.
times.



                                     6005
mle-solver Phase Prompt (phase_prompt)
                                                for fixing the code. Do not provide
You are an ML engineer and you will             entirely new code, just suggestions
be writing the code for a research              for edits.
project.
Your goal is to produce code that               Code Execution Success Prompt
obtains final results for a set of
                                                The following is the code that was
research experiments. You should
                                                executed:{code}
aim for simple code to collect
                                                The code executed successfully and
all results, not complex code.
                                                produced a valid result. Reflect
You should integrate the provided
                                                on how you can improve this
literature review and the plan
                                                result further or refine the
to make sure you are implementing
                                                methodology.     Provide detailed
everything outlined in the plan.
                                                suggestions without rewriting the
The dataset code will be added
                                                entire code.
to the beginning of your code
always, so this does not need to
be rewritten. Make sure you do not              Reflective Feedback Prompt
write functions, only loose code.               Please reflect on ideas for how to
I would recommend writing smaller               improve your current code. Examine
code so you do not run out of time              the provided code and think very
but make sure to work on all points             specifically (with precise ideas)
in the plan in the same code. You               on how to improve performance,
code should run every experiment                which methods to use, how to
outlined in the plan for a single               improve generalization on the test
code.                                           set with line-by-line examples
You   cannot    pip   install   new             below:
libraries,    but   many    machine
learning libraries already work.
If you wish to use a language
                                                Reflective Feedback System Prompt
model in your code, please use the
following:                                      Please reflect on the following
Anything you decide to print inside             sets of code:      {code_strs} and
your code will be provided to you               come up with generalizable insights
as input, and you will be able to               that will help you improve your
see that part of the code. Using                performance on this benchmark.
print statements is useful for
figuring out what is wrong and
                                            D.9 paper-solver Prompts
understanding your code better
                                                paper-solve Replacement Tool

Code Execution Error Prompt                     ============= PAPER REPLACING TOOL
                                                =============
The following is the code that was              You also have access to a paper
executed:{code}                                 replacing tool.
The     following    error     was              This tool allows you to entirely
returned:{error}                                re-write/replace all of the current
Reflect on why this error occurred              latex and erase all existing latex.
and how you can modify the code                 You can use this tool via the
to prevent it in the future. Your               following command: ```REPLACE
reflection should be thorough and               <latex here>
include line-by-line suggestions                ```, where REPLACE is the word

                                         6006
REPLACE and <latex here> will be              also avoid editing lines 0 0, and
the new latex that is replacing               should edit the main text of the
the entire set of old latex. This             paragraphs, such as editing lines
tool is useful if you want to make            in the middle of the text body.
very significant changes, such as
entirely changing the model, or the
                                              paper-solve Initial Report Generation arXiv
learning process. Before changing
                                              Search Prompt
the existing latex to be your new
latex, your new latex will be tested          Given the following research topic
and if it returns an error it will            {self.topic} and research plan:
not replace the existing latex. Try           {self.plan}
limiting the use of rewriting and             Please come up with a search query
aim for editing the latex more.               to find relevant papers on arXiv.
                                              Respond only with the search query
                                              and nothing else. This should be a
Postdoc Role Prompt                           a string that will be used to find
                                              papers with semantically similar
============= PAPER EDITING TOOL
                                              content. {att_str}
=============
You also have access to a paper
editing tool.                                 paper-solve Initial Report Generation arXiv
This tool allows you to replace               Search System Prompt
lines indexed n through m (n:m) of
                                              You are a research paper finder. You
the current latex with as many lines
                                              must find papers for the section
of new latex as you want to add.
                                              {section}.    Query must be text
This removal is inclusive meaning
                                              nothing else.
that line n and m and everything
between n and m is removed. This
will be the primary way that you            Where {err} is set to "The following was the
interact with latex.                      previous command generated: {model_resp}. This
You can edit latex using the              was the error return {cmd_str}. You should make
following command: ```EDIT N M            sure not to repeat this error and to solve the pre-
<new lines to replace old lines>          sented problem." when an error is present and is
```EDIT is the word EDIT, N is the        otherwise empty.
first line index you want to replace
and M the the last line index                 paper-solve Initial Report Generation
you want to replace (everything               Prompt
inbetween will also be removed),              {err}
and <new lines to replace old lines>          Here are related papers you can
will be the new latex that is                 cite:{section_related_work}.     You
replacing the old latex. Before               can cite them just by putting
changing the existing latex to be             the arxiv ID in parentheses, e.g.,
your new latex, your new latex                (arXiv 2308.11483v1)
will be tested and if it returns              Now please enter the ```REPLACE
an error it will not replace the              command to create the designated
existing latex. Your changes should           section, make sure to only write the
significantly change the latex. You           text for that section and nothing
should write new paragraphs and               else. Do not include packages or
update old ones. Try using the                section titles, just the section
edit command often. Make sure to              content:
generate lots of text. You should

                                       6007
paper-solve System Prompt
                                              write (ABSTRACT HERE) for abstract,
{ref_papers}                                  and write (INTRODUCTION HERE) for
{self.role_description()}.                    the introduction... etc. Your paper
The          following           are          should have the following sections:
your       task         instructions:         1. Abstract 2. Introduction, 3.
{self.phase_prompt()}                         Background, 4.     Related Work 5.
The     following      are     notes,         Methods, 6.     Experimental Setup
instructions, and general tips                7. Results, and 8. Discussion.
for you: {self.notes}                         Just create the scaffolding as
The following literature review               compilable latex. Your title should
was provided for the paper:                   start with Research Report: (title
{lit_review_str}                              here) where title here is a title
You are given a paper report                  you choose. For author write Agent
writing task.         The original            Laboratory.
research plan was described as
follows: {self.plan}
                                            paper-solve System Prompt (Method)
A team of research wrote the
following code, following this             Your only goal is to generate latex
plan: {self.exp_code}                       for the following {section}. DO NOT
After running this code, the                INCLUDE ANY PACKAGES OR ANY SECTION
following results were observed:            COMMANDS. DO NOT INCLUDE A TITLE
{self.exp_results}                          OR DATE ONLY TEXT. You only have
Provided was an interpretation of           to generate text for this specific
the experimental results:                   section and do not have to output
{self.insights}                             anything else. {length} I repeat
Your writing style should be boring         DO NOT INCLUDE ANY PACKAGES OR ANY
and objective.                              SECTION COMMANDS. DO NOT INCLUDE A
Your goal is to write a research           TITLE OR DATE ONLY TEXT. Use as many
paper as well as possible. You will         equations as you find necessary.
receive a score after you write the        You should include mathematical
paper and should aim to maximize            equations, numbers, and tables
the score by writing a high quality        where necessary. Remember that to
research paper. The paper length            include a percentage sign % you must
should be 8 pages or 4000 words in          add a backslash
total. It should be quite long and         % or else it will become a
comprehensive. Remember, the paper          comment.       Here are some tips
MUST BE LONG. {paper_progress}             {per_section_tips} {methods_str}
{cmd_set}
Provided here is your current paper
                                            paper-solve Command Description
{self.generate_paper_lines(self.paper_lines)}
{section_cmd}
                                              You also have access to tools which
                                              can be interacted with using the
paper-solve System Prompt (Scaffold)          following structure: ```COMMAND
                                              <command information here>
Your objective right now is to only           ```, where COMMAND is whichever
build the scaffolding for the paper.          command you want to run (e.g.,
You should not include any text in            EDIT,...), <command information
the body of the paper, but should             here> is information used for
have an empty scaffold for each of            the command and ```are meant to
the sections. Where the sections go,          encapsulate the command. ```must

                                       6008
   be included as part of the command                   contribution!)
   both at the beginning and at the                     - How do we verify that we solved it
   end of the command. DO NOT FORGOT                    (e.g., Experiments and results)
   TO HAVE ```AT THE TOP AND BOTTOM                     - This must only be a single
   OF COMMAND. and this structure must                  paragraph not more.
   be followed to execute a command                     Please make sure the abstract reads
   correctly. YOU CAN ONLY EXECUTE A                    smoothly and is well-motivated.
   SINGLE COMMAND AT A TIME! Do not try                 This should be one continuous
   to perform multiple commands EVER                    paragraph with no breaks between
   only one. {cmd_strings}.                             the lines.

   paper-solve Role Prompt                              paper-solve Section Tip (Introduction)

   You are a computer science PhD                       - Longer version of the Abstract,
   student at a top university who                      i.e. of the entire paper
   has submitted their paper to an                      - What are we trying to do and why
   ML conference called ICLR. Your                      is it relevant?
   goal was to write a research                         - Why is this hard?
   paper and get high scores from the                   - How do we solve it (i.e. our
   reviewers so that it get accepted                    contribution!)
   to the conference.     Your paper                    - How do we verify that we solved it
   should be approximately 8 pages                      (e.g., Experiments and results)
   and around 4000 words.        Your                   - New trend: specifically list your
   article should ONLY CONTAIN EIGHT                    contributions as bullet points
   sections as follows: 1. Abstract                     - Extra space? Future work!
   2. Introduction, 3. Background,
   4. Related Work 5. Methods, 6.                       paper-solve Section Tip (Related Work)
   Experimental Setup 7. Results, and
   8. Discussion.                                       - Academic siblings of our work, i.e.
                                                        alternative attempts in literature
                                                        at trying to solve the same problem.
   paper-solve Phase Prompt
                                                        - Goal is to “Compare and contrast”
   You are a PhD student who has                        - how does their approach differ
   submitted their paper to an ML                       in either assumptions or method?
   conference called ICLR. Your goal                    If their method is applicable
   was to write a research paper and                    to our Problem Setting I expect
   get high scores from the reviewers                   a comparison in the experimental
   so that it get accepted to the                       section. If not, there needs to
   conference.                                          be a clear statement why a given
                                                        method is not applicable.
D.9.1   Per section tips                                - Note: Just describing what another
                                                        paper is doing is not enough. We
The following tips are taken and modified from (Lu
                                                        need to compare and contrast.
et al., 2024b).

   paper-solve Section Tip (Abstract)                   paper-solve Section Tip (Background)

   - TL;DR of the paper                                 - Academic Ancestors of our work,
   - What are we trying to do and why                   i.e. all concepts and prior work
    is it relevant?                                     that are required for understanding
   - Why is this hard?                                  our method.
   - How do we solve it (i.e. our                       - Usually includes a subsection,

                                                 6009
 Problem Setting, which formally               actually been run and saved in the
 introduces the problem setting and            logs. Do not hallucinate results
 notation (Formalism) for our method.          that don’t exist.
 Highlights any specific assumptions           - Make sure you clearly and
 that are made that are unusual.               numerically report experimental
- Make sure to use mathematical                results in the results section.
 notation when necessary.                      - If results exist: compares to
- Note: If our paper introduces a              baselines and includes statistics
 novel problem setting as part of its          and confidence intervals.
 contributions, it’s best to have a            - If results exist:       includes
 separate Section.                             ablation studies to show that
                                               specific parts of the method are
                                               relevant.
paper-solve Section Tip (Methods)
                                               - Discusses limitations of the
- What we do.        Why we do it.             method.
All described using the general                - Make sure to include all the
 Formalism introduced in the Problem           results from the experiments, and
 Setting and building on top of the            include all relevant figures.
 concepts / foundations introduced
 in Background.                                paper-solve Section Tip (Discussion)
- Make sure you clearly report
 precise mathematical equations in             - Brief recap of the entire paper.
 the methods section and the precise           - To keep going with the analogy,
 methodology.                                  you can think of future work as
                                               (potential) academic offspring.

paper-solve Section Tip (Experimental      D.9.2   paper-solver Reviewer prompt
Setup)
                                           The following reviewer system prompt is taken
- How do we test that our stuff            from (Lu et al., 2024b).
works?      Introduces a specific
                                               NeurIPS Reviewer System Prompt
 instantiation    of   the   Problem
 Setting and specific implementation           You are an AI researcher who
 details of our Method for this                is reviewing a paper that was
 Problem Setting.                              submitted to a prestigious ML
- Do not imagine unknown hardware              venue. Be critical and cautious
 details.                                      in your decision. Respond in the
- Includes a description of                    following format:
 the dataset, evaluation metrics,
 important hyperparameters,      and           THOUGHT:
 implementation details.                       <THOUGHT>

paper-solve Section Tip (Results)              REVIEW JSON:
                                               ```json
- Shows the results of running                 <JSON>
 Method on our problem described in            ```
 Experimental Setup.                           In <THOUGHT>, first briefly discuss
-     Includes     statements     on           your intuitions and reasoning for
 hyperparameters and other potential           the evaluation.
 issues of fairness.                           Detail your high-level arguments,
- Only includes results that have              necessary choices and desired

                                        6010
outcomes of the review.                       For the "Decision" field, don’t
Do not make generic comments here,            use Weak Accept, Borderline Accept,
but be specific to your current               Borderline Reject, or Strong Reject.
paper.                                        Instead, only use Accept or Reject.
Treat this as the note-taking phase           This JSON will be automatically
of your review.                               parsed, so ensure the format is
                                              precise.
 In <JSON>, provide the review                """
 in JSON format with the following
 fields in the order:                         neurips_form = ("""
- "Summary": A summary of the paper           ## Review Form
 content and its contributions.               Below is a description of the
- "Strengths": A list of strengths            questions you will be asked on the
 of the paper.                                review form for each paper and some
- "Weaknesses": A list of weaknesses          guidelines on what to consider when
 of the paper.                                answering these questions.
- "Originality": A rating from 1 to           When writing your review, please
4 (low, medium, high, very high).             keep in mind that after decisions
- "Quality": A rating from 1 to 4             have been made,       reviews and
(low, medium, high, very high).               meta-reviews of accepted papers
- "Clarity": A rating from 1 to 4             and opted-in rejected papers will
(low, medium, high, very high).               be made public.
- "Significance": A rating from
1 to 4 (low, medium, high, very               1. Summary: Briefly summarize the
 high).                                       paper and its contributions. This
- "Questions": A set of clarifying            is not the place to critique the
 questions to be answered by the              paper; the authors should generally
 paper authors.                               agree with a well-written summary.
- "Limitations":        A set of              - Strengths and Weaknesses: Please
 limitations and potential negative           provide a thorough assessment of
 societal impacts of the work.                the strengths and weaknesses of
- "Ethical Concerns": A boolean               the paper, touching on each of the
value indicating whether there are            following dimensions:
 ethical concerns.                            - Originality:     Are the tasks
- "Soundness": A rating from 1 to 4           or methods new? Is the work a
(poor, fair, good, excellent).                novel combination of well-known
- "Presentation": A rating from 1             techniques? (This can be valuable!)
 to 4 (poor, fair, good, excellent).          Is it clear how this work differs
- "Contribution": A rating from 1             from previous contributions? Is
 to 4 (poor, fair, good, excellent).          related work adequately cited
- "Overall": A rating from 1 to               - Quality:     Is the submission
10 (very strong reject to award               technically sound? Are claims well
 quality).                                    supported (e.g., by theoretical
- "Confidence": A rating from 1 to            analysis or experimental results)?
 5 (low, medium, high, very high,             Are the methods used appropriate?
 absolute).                                   Is this a complete piece of work or
- "Decision": A decision that has             work in progress? Are the authors
 to be one of the following: Accept,          careful and honest about evaluating
 Reject.                                      both the strengths and weaknesses
                                              of their work


                                       6011
- Clarity: Is the submission clearly          are ethical issues with this paper,
written?    Is it well organized?             please flag the paper for an ethics
(If not, please make constructive             review. For guidance on when this
 suggestions for improving its                is appropriate, please review the
 clarity.)     Does it adequately             NeurIPS ethics guidelines.
 inform the reader? (Note that a
 superbly written paper provides              5.     Soundness:   Please assign
 enough information for an expert             the paper a numerical rating on
 reader to reproduce its results.)            the following scale to indicate
- Significance: Are the results               the soundness of the technical
 important? Are others (researchers           claims, experimental and research
 or practitioners) likely to use              methodology and on whether the
 the ideas or build on them? Does             central claims of the paper are
 the submission address a difficult           adequately supported with evidence.
 task in a better way than previous           4: excellent
work? Does it advance the state               3: good
 of the art in a demonstrable                 2: fair
way? Does it provide unique data,             1: poor
 unique conclusions about existing
 data, or a unique theoretical or
 experimental approach?                       6.   Presentation: Please assign
                                              the paper a numerical rating on
2. Questions: Please list up and              the following scale to indicate
carefully describe any questions              the quality of the presentation.
and suggestions for the authors.              This should take into account the
Think of the things where a response          writing style and clarity, as well
from the author can change your               as contextualization relative to
opinion, clarify a confusion or               prior work.
address a limitation. This can be             4: excellent
very important for a productive               3: good
rebuttal and discussion phase with            2: fair
the authors.                                  1: poor

3.      Limitations:     Have the             7. Contribution: Please assign the
authors adequately addressed the              paper a numerical rating on the
limitations and potential negative            following scale to indicate the
societal impact of their work? If             quality of the overall contribution
not, please include constructive              this paper makes to the research
suggestions for improvement.                  area being studied.        Are the
In general, authors should be                 questions being asked important?
rewarded rather than punished                 Does the paper bring a significant
for being up front about the                  originality    of   ideas    and/or
limitations of their work and                 execution?       Are the results
any potential negative societal               valuable to share with the broader
impact. You are encouraged to think           NeurIPS community.
through whether any critical points           4: excellent
are missing and provide these as              3: good
feedback for the authors.                     2: fair
                                              1: poor
4.   Ethical concerns:    If there


                                       6012
8.   Overall: Please provide an               evaluation. Please use sparingly.
"overall score" for this submission.          3:    Reject:    For instance, a
Choices:                                      paper    with    technical    flaws,
10: Award quality: Technically                weak     evaluation,      inadequate
flawless paper with groundbreaking            reproducibility and incompletely
impact on one or more areas of                addressed ethical considerations.
AI, with exceptionally strong                 2: Strong Reject: For instance, a
evaluation, reproducibility, and              paper with major technical flaws,
resources,    and no unaddressed              and/or poor evaluation, limited
ethical considerations.                       impact,     poor     reproducibility
9: Very Strong Accept: Technically            and mostly unaddressed ethical
flawless paper with groundbreaking            considerations.
impact on at least one area                   1: Very Strong Reject: For instance,
of   AI    and   excellent    impact          a paper with trivial results or
on multiple areas of AI, with                 unaddressed ethical considerations
flawless evaluation, resources, and
reproducibility, and no unaddressed           9.    Confidence: Please provide
ethical considerations.                       a "confidence score" for your
8:   Strong Accept:      Technically          assessment of this submission to
strong paper with, with novel                 indicate how confident you are in
ideas, excellent impact on at least           your evaluation. Choices:
one area of AI or high-to-excellent           5:   You are absolutely certain
impact on multiple areas of                   about your assessment.     You are
AI, with excellent evaluation,                very familiar with the related work
resources,    and reproducibility,            and checked the math/other details
and    no    unaddressed     ethical          carefully.
considerations.                               4:   You are confident in your
7: Accept: Technically solid paper,           assessment, but not absolutely
with high impact on at least one              certain.    It is unlikely, but
sub-area of AI or moderate-to-high            not impossible, that you did
impact on more than one area of AI,           not understand some parts of
with good-to-excellent evaluation,            the submission or that you are
resources,          reproducibility,          unfamiliar with some pieces of
and    no    unaddressed     ethical          related work.
considerations.                               3: You are fairly confident in
6:    Weak Accept:       Technically          your assessment. It is possible
solid,    moderate-to-high impact             that you did not understand some
paper, with no major concerns                 parts of the submission or that you
with    respect    to    evaluation,          are unfamiliar with some pieces of
resources,          reproducibility,          related work. Math/other details
ethical considerations.                       were not carefully checked.
5: Borderline accept: Technically             2: You are willing to defend your
solid paper where reasons to accept           assessment, but it is quite likely
outweigh reasons to reject, e.g.,             that you did not understand the
limited evaluation.      Please use           central parts of the submission or
sparingly.                                    that you are unfamiliar with some
4: Borderline reject: Technically             pieces of related work. Math/other
solid paper where reasons to reject,          details were not carefully checked.
e.g., limited evaluation, outweigh            1: Your assessment is an educated
reasons to accept, e.g., good                 guess. The submission is not in


                                       6013
your area or the submission was               questions to be answered by the
difficult to understand. Math/other           paper authors.
details were not carefully checked.           - "Limitations":       A set of
                                              limitations and potential negative
You must make sure that all                   societal impacts of the work.
sections are properly created:                - "Ethical Concerns": A boolean
abstract, introduction, methods,              value indicating whether there are
results, and discussion. Points               ethical concerns.
must be reduced from your scores if           - "Soundness": A rating from 1 to 4
any of these are missing.Respond              (poor, fair, good, excellent).
in the following format:                      - "Presentation": A rating from 1
                                              to 4 (poor, fair, good, excellent).
THOUGHT:                                      - "Contribution": A rating from 1
<THOUGHT>                                     to 4 (poor, fair, good, excellent).
REVIEW JSON:                                  - "Overall": A rating from 1 to
```json                                       10 (very strong reject to award
<JSON>                                        quality).
```                                           - "Confidence": A rating from 1 to
                                              5 (low, medium, high, very high,
In <THOUGHT>, first briefly discuss           absolute).
your intuitions and reasoning for             - "Decision": A decision that has
the evaluation.                               to be one of the following: Accept,
Detail your high-level arguments,             Reject.
necessary choices and desired
outcomes of the review.                       For the "Decision" field, don’t
Do not make generic comments here,            use Weak Accept, Borderline Accept,
but be specific to your current               Borderline Reject, or Strong Reject.
paper.                                        Instead, only use Accept or Reject.
Treat this as the note-taking phase           This JSON will be automatically
of your review.                               parsed, so ensure the format is
                                              precise.
 In <JSON>, provide the review
 in JSON format with the following              NeurIPS Reviewer Prompt
 fields in the order:
- "Summary": A summary of the paper             Outlined in the following text is
 content and its contributions.                 the research plan that the machine
- "Strengths": A list of strengths              learning engineer was tasked with
 of the paper.                                  building: {outlined_plan}
- "Weaknesses": A list of weaknesses
 of the paper.                                The following text is the research
- "Originality": A rating from 1 to           latex that the model produced:
4 (low, medium, high, very high).             {latex}
- "Quality": A rating from 1 to 4
(low, medium, high, very high).
                                          E     Survey questions
- "Clarity": A rating from 1 to 4
(low, medium, high, very high).           E.1     Expert Recruitment
- "Significance": A rating from
                                          We recruit participants by sending forms to Slack
1 to 4 (low, medium, high, very
                                          channels of research groups through direct com-
 high).
                                          munication with group members, as well as re-
- "Questions": A set of clarifying
                                          cruiting from in-person events. We screened all
                                          participants using their Google Scholar profiles,
                                       6014
with a minimum requirement of having published
at least one research paper (NeurIPS, ICLR, ACL,
EMNLP, etc). We reached out to all participants
who met this with annotation documents for those
who consented to participate. We recruited a total
of N = 18, with N = 10 participants for review-
ing and N = 8 for the co-pilot study. Of the 18
participants, 10 were PhD students from 4 different
institutions and 8 were industry researchers from 2
institutions. As compensation, co-pilot participants
were provided with co-authorship, human raters
will be provided with acknowledgments, and all
participants were provided with early access to the
tool.

E.2   Grading Research Report Autonomous
      Mode Preselected Topics




                                                   6015
                                               Grading Research Report #1




  Grading Research Report #1
  The goal of this assignment is to read a research report that was generated by an AI tool and
  provide quality ratings across various measures. You will be provided with a link to a report
  and you should read this report in its entirety

  You should read this report through the following lens of perception:

        You were provided with an AI assistant tool that you tasked to perform research on the
        following question: "Does gender role play affect the accuracy on of language models
        on answering math questions?". Given the question that you provided, the AI assistant
        tool performed its own literature search, experimentation, performed its own coding,
        executed the code, collected data, conducted an analysis, and wrote the presented
        research report. The goal of this assistant is not to perform research for you
        (automate you task) but instead to provide a foundation for you to accelerate your own
        research. You should be asking: is what this AI assistant produced useful for me to
        build off of instead comparing it to what a human would perform.

  Link to the research
  report: https://drive.google.com/file/d/19vjnzgbsrkiHL5OIxbCHZ_uU20jpzlxx/view?
  usp=sharing

  Once you have read the paper please answer the question below:

* Indicates required question




                                              6016
                                             Grading Research Report #1


1.   Let's assume you were provided with an AI assistant tool that you tasked to     *
     perform research on the following question: "Does gender role play affect the
     accuracy on of language models on answering math questions?"

     What is your perception of the quality of the experimental results presented
     in this report?

     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Low Quality
     2 - Low Quality
     3 - Medium Quality
     4 - High Quality
     5 - Very High Quality


           1    2      3   4   5




2.   Let's assume you were provided with a research paper answering the following    *
     question: "Does gender role play affect the accuracy on of language models
     on answering math questions?"


     What is your perception of the quality of the research report writing quality
     presented in this report?


     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Low Quality
     2 - Low Quality
     3 - Medium Quality
     4 - High Quality
     5 - Very High Quality


           1    2      3   4   5




                                            6017
                                             Grading Research Report #1


3.   Let's assume you were provided with a research paper answering the following           *
     question: "Does gender role play affect the accuracy on of language models
     on answering math questions?"

     What is your perception of the usefulness of the AI assistant tool presented
     in this report?

     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Low Usefulness
     2 - Low Usefulness
     3 - Medium Usefulness
     4 - High Usefulness
     5 - Very High Usefulness


           1    2      3   4   5




Review
Now assume you are a reviewer at NeurIPS 2025 and are reviewing a machine learning paper.
Please provide the following ratings from this perspective.




                                            6018
                                              Grading Research Report #1


4.   Let's assume you were provided with a research paper answering the following             *
     question: "Does gender role play affect the accuracy on of language models
     on answering math questions?"

     Quality: Is the submission technically sound? Are claims well supported (e.g., by
     theoretical analysis or experimental results)? Are the methods used appropriate? Is
     this a complete piece of work or work in progress? Are the authors careful and
     honest about evaluating both the strengths and weaknesses of their work


     1 - Low Quality
     2 - Medium Quality
     3 - High Quality
     4 - Very High Quality


           1    2    3   4




5.   Let's assume you were provided with a research paper answering the following             *
     question: "Does gender role play affect the accuracy on of language models
     on answering math questions?"


     Clarity: Is the submission clearly written? Is it well organized? (If not, please make
     constructive suggestions for improving its clarity.) Does it adequately inform the
     reader? (Note that a superbly written paper provides enough information for an
     expert reader to reproduce its results.)


     Please provide a rating 1-4, with the following rating descriptions:
     1 - Low Clarity
     2 - Medium Clarity
     3 - High Clarity
     4 - Very High Clarity


           1    2    3   4




                                             6019
                                             Grading Research Report #1


6.   Let's assume you were provided with a research paper answering the following         *
     question: "Does gender role play affect the accuracy on of language models
     on answering math questions?"

     Significance: Are the results important? Are others (researchers or practitioners)
     likely to use the ideas or build on them? Does the submission address a difficult
     task in a better way than previous work? Does it advance the state of the art in a
     demonstrable way? Does it provide unique data, unique conclusions about existing
     data, or a unique theoretical or experimental approach?


     Please provide a rating 1-4, with the following rating descriptions:
     1 - Low Significance
     2 - Medium Significance
     3 - High Significance
     4 - Very High Significance


           1    2   3    4




7.   Let's assume you were provided with a research paper answering the following         *
     question: "Does gender role play affect the accuracy on of language models
     on answering math questions?"


     Soundness: Please assign the paper a numerical rating on the following scale to
     indicate the soundness of the technical claims, experimental and research
     methodology and on whether the central claims of the paper are adequately
     supported with evidence.
     4: excellent
     3: good
     2: fair
     1: poor


           1    2   3    4




                                            6020
                                              Grading Research Report #1


8.   Let's assume you were provided with a research paper answering the following             *
     question: "Does gender role play affect the accuracy on of language models
     on answering math questions?"

     Presentation: Please assign the paper a numerical rating on the following scale to
     indicate the quality of the presentation. This should take into account the writing
     style and clarity, as well as contextualization relative to prior work.
     4: excellent
     3: good
     2: fair
     1: poor


           1    2   3    4




9.   Let's assume you were provided with a research paper answering the following             *
     question: "Does gender role play affect the accuracy on of language models
     on answering math questions?"


     Contribution: Please assign the paper a numerical rating on the following scale to
     indicate the quality of the overall contribution this paper makes to the research area
     being studied. Are the questions being asked important? Does the paper bring a
     significant originality of ideas and/or execution? Are the results valuable to share
     with the broader NeurIPS community.
     4: excellent
     3: good
     2: fair
     1: poor


           1    2   3    4




                                            6021
                                            Grading Research Report #1


10.   Let's assume you were provided with a research paper answering the following *
      question: "Does gender role play affect the accuracy on of language models
      on answering math questions?"

      Overall: Please provide an "overall score" for this submission. Choices:


      10: Award quality
      9: Very Strong Accept
      8: Strong Accept
      7: Accept
      6: Weak Accept
      5: Borderline accept
      4: Borderline reject
      3: Reject
      2: Strong Reject
      1: Very Strong Reject


            1   2    3    4   5    6   7    8     9     10




                                           6022
                                              Grading Research Report #1


11.   Let's assume you were provided with a research paper answering the following            *
      question:"Does gender role play affect the accuracy on of language models
      on answering math questions?"


      Confidence: Please provide a "confidence score" for your assessment of this
      submission to indicate how confident you are in your evaluation.

      Choices:
      5: You are absolutely certain about your assessment. You are very familiar with
      the related work and checked the math/other details carefully.
      4: You are confident in your assessment, but not absolutely certain. It is unlikely,
      but not impossible, that you did not understand some parts of the submission or
      that you are unfamiliar with some pieces of related work.
      3: You are fairly confident in your assessment. It is possible that you did not
      understand some parts of the submission or that you are unfamiliar with some
      pieces of related work. Math/other details were not carefully checked.
      2: You are willing to defend your assessment, but it is quite likely that you did not
      understand the central parts of the submission or that you are unfamiliar with
      some pieces of related work. Math/other details were not carefully checked.
      1: Your assessment is an educated guess. The submission is not in your area or
      the submission was difficult to understand. Math/other details were not carefully
      checked.


            1    2    3     4   5




12.   Let's assume you were provided with a research paper answering the following *
      question: "Does gender role play affect the accuracy on of language models
      on answering math questions?"

      "Decision": A decision that has to be one of the following: Accept, Reject.

      Mark only one oval.

            Accept

            Reject



                                             6023
E.3   Co-Pilot Grading Research Report
      Preselected Topics




                                         6024
                                         Co-Pilot Grading Research Report [Pre-Selected]




  Co-Pilot Grading Research Report [Pre-
  Selected]
  The goal of this assignment is to use Agent Laboratory as a research Co-Pilot and to
  determine how useful it was for implementing your research project.

  Please follow the build instructions provided for you in Agent Laboratory project directory.
  Please then run the Agent Laboratory file and as text provide a research topic FROM THE
  FOLLOWING CHOICES

  1. Do language models exhibit cognitive biases, such as confirmation bias or anchoring bias?
  2. Do language models improve accuracy on MedQA when asked to perform differential
  diagnosis?
  3. Are language models sensitive to word order in multiple choice benchmarks?
  4. Does gender role play affect the accuracy on of language models on answering math
  questions?
  5. Are image transformers more or less sensitive to pixel noise than convolutional networks?


  At the end of the simulation, you will then be provided with a report (as a PDF) and you
  should read this report in its entirety provide quality ratings across various measures. You
  should rate everything through the following lens of perception:

        Given the question that you provided, the AI assistant tool performed its own literature
        search, experimentation, performed its own coding, executed the code, collected data,
        conducted an analysis, and wrote the presented research report. The goal of this
        assistant is not to perform research for you (automate you task) but instead to provide
        a foundation for you to accelerate your own research.


  You should be asking: is what this AI assistant produced useful for me to build off
  of instead comparing it to what a human by themselves would perform.



  Once you have read the paper please answer the question below:

* Indicates required question




                                                 6025
                                       Co-Pilot Grading Research Report [Pre-Selected]


1.   What was the research topic you chose? *




2.   How easy was it for you to build a project using Agent Laboratory? *


     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Hard
     2 - Hard
     3 - Medium
     4 - Easy
     5 - Very Easy


           1    2    3    4   5




3.   How much did you enjoy using Agent Laboratory?                                      *

     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Unenjoyable
     2 - Unenjoyable
     3 - Neutral
     4 - Enjoyable
     5 - Very Enjoyable


           1    2    3    4   5




                                               6026
                                       Co-Pilot Grading Research Report [Pre-Selected]


4.   How useful is Agent Laboratory for research?                                        *

     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Useless
     2 - Useless
     3 - Medium
     4 - Useful
     5 - Very Useful


           1    2      3   4   5




5.   How likely are you to use Agent Laboratory again for research? *


     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Unlikely
     2 - Unlikely
     3 - Medium
     4 - Likely
     5 - Very Likely


           1    2      3   4   5




6.   [Optional] How could Agent Laboratory be improved for your research?




                                               6027
                                       Co-Pilot Grading Research Report [Pre-Selected]


7.   What is your perception of the quality of the experimental results presented        *
     in this report?

     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Low Quality
     2 - Low Quality
     3 - Medium Quality
     4 - High Quality
     5 - Very High Quality


           1    2   3    4    5




8.   What is your perception of the quality of the research report writing quality       *
     presented in this report?


     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Low Quality
     2 - Low Quality
     3 - Medium Quality
     4 - High Quality
     5 - Very High Quality


           1    2   3    4    5




                                               6028
                                                Co-Pilot Grading Research Report [Pre-Selected]


9.    What is your perception of the usefulness of the AI assistant tool presented                *
      in this report?

      Please provide a rating 1-5, with the following rating descriptions:
      1 - Very Low Usefulness
      2 - Low Usefulness
      3 - Medium Usefulness
      4 - High Usefulness
      5 - Very High Usefulness


            1       2       3       4       5




Review
Now assume you are a reviewer at NeurIPS 2025 and are reviewing a machine learning paper.
Please provide the following ratings from this perspective.



10.    Quality: Is the submission technically sound? Are claims well supported (e.g., by          *
       theoretical analysis or experimental results)? Are the methods used appropriate?
       Is this a complete piece of work or work in progress? Are the authors careful and
       honest about evaluating both the strengths and weaknesses of their work

       1 - Low Quality
       2 - Medium Quality
       3 - High Quality
       4 - Very High Quality


                1       2       3       4




                                                        6029
                                       Co-Pilot Grading Research Report [Pre-Selected]


11.   Clarity: Is the submission clearly written? Is it well organized? (If not, please make *
      constructive suggestions for improving its clarity.) Does it adequately inform the
      reader? (Note that a superbly written paper provides enough information for an
      expert reader to reproduce its results.)


      Please provide a rating 1-4, with the following rating descriptions:
      1 - Low Clarity
      2 - Medium Clarity
      3 - High Clarity
      4 - Very High Clarity


            1    2    3   4




12.   Significance: Are the results important? Are others (researchers or practitioners)    *
      likely to use the ideas or build on them? Does the submission address a difficult
      task in a better way than previous work? Does it advance the state of the art in a
      demonstrable way? Does it provide unique data, unique conclusions about
      existing data, or a unique theoretical or experimental approach?


      Please provide a rating 1-4, with the following rating descriptions:
      1 - Low Significance
      2 - Medium Significance
      3 - High Significance
      4 - Very High Significance


            1    2    3   4




                                               6030
                                     Co-Pilot Grading Research Report [Pre-Selected]


13.   Soundness: Please assign the paper a numerical rating on the following scale to    *
      indicate the soundness of the technical claims, experimental and research
      methodology and on whether the central claims of the paper are adequately
      supported with evidence.
      4: excellent
      3: good
      2: fair
      1: poor


            1   2    3   4




14.   Presentation: Please assign the paper a numerical rating on the following scale to *
      indicate the quality of the presentation. This should take into account the writing
      style and clarity, as well as contextualization relative to prior work.
      4: excellent
      3: good
      2: fair
      1: poor


            1   2    3   4




                                             6031
                                         Co-Pilot Grading Research Report [Pre-Selected]


15.   Contribution: Please assign the paper a numerical rating on the following scale to *
      indicate the quality of the overall contribution this paper makes to the research
      area being studied. Are the questions being asked important? Does the paper
      bring a significant originality of ideas and/or execution? Are the results valuable to
      share with the broader NeurIPS community.
      4: excellent
      3: good
      2: fair
      1: poor


            1    2    3      4




16.   Overall: Please provide an "overall score" for this submission. Choices: *


      10: Award quality
      9: Very Strong Accept
      8: Strong Accept
      7: Accept
      6: Weak Accept
      5: Borderline accept
      4: Borderline reject
      3: Reject
      2: Strong Reject
      1: Very Strong Reject


            1    2    3      4   5   6     7      8      9      10




                                                 6032
                                       Co-Pilot Grading Research Report [Pre-Selected]


17.   Confidence: Please provide a "confidence score" for your assessment of this             *
      submission to indicate how confident you are in your evaluation.

      Choices:
      5: You are absolutely certain about your assessment. You are very familiar with
      the related work and checked the math/other details carefully.
      4: You are confident in your assessment, but not absolutely certain. It is unlikely,
      but not impossible, that you did not understand some parts of the submission or
      that you are unfamiliar with some pieces of related work.
      3: You are fairly confident in your assessment. It is possible that you did not
      understand some parts of the submission or that you are unfamiliar with some
      pieces of related work. Math/other details were not carefully checked.
      2: You are willing to defend your assessment, but it is quite likely that you did not
      understand the central parts of the submission or that you are unfamiliar with
      some pieces of related work. Math/other details were not carefully checked.
      1: Your assessment is an educated guess. The submission is not in your area or
      the submission was difficult to understand. Math/other details were not carefully
      checked.


            1    2    3     4   5




18.   "Decision": A decision that has to be one of the following: Accept, Reject. *

      Mark only one oval.

            Accept

            Reject




19.   [Optional] Any additional feedback?




                                               6033
E.4   Co-Pilot Grading Research Report
      Custom Topics




                                         6034
                                                 Co-Pilot Grading Research Report




     Co-Pilot Grading Research Report
     The goal of this assignment is to use Agent Laboratory as a research Co-Pilot and to
     determine how useful it was for implementing your research project.

     Please follow the build instructions provided for you in Agent Laboratory project directory.
     Please then run the Agent Laboratory file and as text provide a research topic that you are
     interested in and would like the system to explore for you. This can be anything machine
     learning related.

     At the end of the simulation, you will then be provided with a report (as a PDF) and you
     should read this report in its entirety provide quality ratings across various measures. You
     should rate everything through the following lens of perception:

           Given the question that you provided, the AI assistant tool performed its own literature
           search, experimentation, performed its own coding, executed the code, collected data,
           conducted an analysis, and wrote the presented research report. The goal of this
           assistant is not to perform research for you (automate you task) but instead to provide
           a foundation for you to accelerate your own research.


     You should be asking: is what this AI assistant produced useful for me to build off of instead
     comparing it to what a human by themselves would perform.



     Once you have read the paper please answer the question below:

* Indicates required question



1.     What was the research topic you chose (please provide EXACT question)? *




                                                  6035
                                            Co-Pilot Grading Research Report


2.   How easy was it for you to build a project using Agent Laboratory? *

     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Hard
     2 - Hard
     3 - Medium
     4 - Easy
     5 - Very Easy


           1    2    3    4   5




3.   How much did you enjoy using Agent Laboratory?                            *


     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Unenjoyable
     2 - Unenjoyable
     3 - Neutral
     4 - Enjoyable
     5 - Very Enjoyable


           1    2    3    4   5




                                             6036
                                            Co-Pilot Grading Research Report


4.   How useful is Agent Laboratory for assisting your research? *

     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Useless
     2 - Useless
     3 - Medium
     4 - Useful
     5 - Very Useful


           1    2      3   4   5




5.   How likely are you to use Agent Laboratory again for research? *


     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Unlikely
     2 - Unlikely
     3 - Medium
     4 - Likely
     5 - Very Likely


           1    2      3   4   5




6.   [Optional] How could Agent Laboratory be improved for your research?




                                             6037
                                            Co-Pilot Grading Research Report


7.   What is your perception of the quality of the experimental results presented    *
     in this report?

     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Low Quality
     2 - Low Quality
     3 - Medium Quality
     4 - High Quality
     5 - Very High Quality


           1    2   3    4    5




8.   What is your perception of the quality of the research report writing quality   *
     presented in this report?


     Please provide a rating 1-5, with the following rating descriptions:
     1 - Very Low Quality
     2 - Low Quality
     3 - Medium Quality
     4 - High Quality
     5 - Very High Quality


           1    2   3    4    5




                                             6038
                                                Co-Pilot Grading Research Report


9.    What is your perception of the usefulness of the AI assistant tool presented          *
      in this report?

      Please provide a rating 1-5, with the following rating descriptions:
      1 - Very Low Usefulness
      2 - Low Usefulness
      3 - Medium Usefulness
      4 - High Usefulness
      5 - Very High Usefulness


            1       2       3       4       5




Review
Now assume you are a reviewer at NeurIPS 2025 and are reviewing a machine learning paper.
Please provide the following ratings from this perspective.



10.    Quality: Is the submission technically sound? Are claims well supported (e.g., by    *
       theoretical analysis or experimental results)? Are the methods used appropriate?
       Is this a complete piece of work or work in progress? Are the authors careful and
       honest about evaluating both the strengths and weaknesses of their work

       1 - Low Quality
       2 - Medium Quality
       3 - High Quality
       4 - Very High Quality


                1       2       3       4




                                                 6039
1/3/25, 1:13 PM                                         Co-Pilot Grading Research Report


            11.   Clarity: Is the submission clearly written? Is it well organized? (If not, please make *
                  constructive suggestions for improving its clarity.) Does it adequately inform the
                  reader? (Note that a superbly written paper provides enough information for an
                  expert reader to reproduce its results.)


                  Please provide a rating 1-4, with the following rating descriptions:
                  1 - Low Clarity
                  2 - Medium Clarity
                  3 - High Clarity
                  4 - Very High Clarity


                        1    2    3   4




            12.   Significance: Are the results important? Are others (researchers or practitioners)    *
                  likely to use the ideas or build on them? Does the submission address a difficult
                  task in a better way than previous work? Does it advance the state of the art in a
                  demonstrable way? Does it provide unique data, unique conclusions about
                  existing data, or a unique theoretical or experimental approach?


                  Please provide a rating 1-4, with the following rating descriptions:
                  1 - Low Significance
                  2 - Medium Significance
                  3 - High Significance
                  4 - Very High Significance


                        1    2    3   4




                                                         6040
                                          Co-Pilot Grading Research Report


13.   Soundness: Please assign the paper a numerical rating on the following scale to    *
      indicate the soundness of the technical claims, experimental and research
      methodology and on whether the central claims of the paper are adequately
      supported with evidence.
      4: excellent
      3: good
      2: fair
      1: poor


            1   2    3   4




14.   Presentation: Please assign the paper a numerical rating on the following scale to *
      indicate the quality of the presentation. This should take into account the writing
      style and clarity, as well as contextualization relative to prior work.
      4: excellent
      3: good
      2: fair
      1: poor


            1   2    3   4




                                           6041
                                             Co-Pilot Grading Research Report


15.   Contribution: Please assign the paper a numerical rating on the following scale to *
      indicate the quality of the overall contribution this paper makes to the research
      area being studied. Are the questions being asked important? Does the paper
      bring a significant originality of ideas and/or execution? Are the results valuable to
      share with the broader NeurIPS community.
      4: excellent
      3: good
      2: fair
      1: poor


            1    2    3      4




16.   Overall: Please provide an "overall score" for this submission. Choices: *


      10: Award quality
      9: Very Strong Accept
      8: Strong Accept
      7: Accept
      6: Weak Accept
      5: Borderline accept
      4: Borderline reject
      3: Reject
      2: Strong Reject
      1: Very Strong Reject


            1    2    3      4   5   6   7     8      9     10




                                              6042
                                            Co-Pilot Grading Research Report


17.   Confidence: Please provide a "confidence score" for your assessment of this             *
      submission to indicate how confident you are in your evaluation.

      Choices:
      5: You are absolutely certain about your assessment. You are very familiar with
      the related work and checked the math/other details carefully.
      4: You are confident in your assessment, but not absolutely certain. It is unlikely,
      but not impossible, that you did not understand some parts of the submission or
      that you are unfamiliar with some pieces of related work.
      3: You are fairly confident in your assessment. It is possible that you did not
      understand some parts of the submission or that you are unfamiliar with some
      pieces of related work. Math/other details were not carefully checked.
      2: You are willing to defend your assessment, but it is quite likely that you did not
      understand the central parts of the submission or that you are unfamiliar with
      some pieces of related work. Math/other details were not carefully checked.
      1: Your assessment is an educated guess. The submission is not in your area or
      the submission was difficult to understand. Math/other details were not carefully
      checked.


            1    2    3     4   5




18.   "Decision": A decision that has to be one of the following: Accept, Reject. *

      Mark only one oval.

            Accept

            Reject




19.   [Optional] Any additional feedback?




                                             6043
