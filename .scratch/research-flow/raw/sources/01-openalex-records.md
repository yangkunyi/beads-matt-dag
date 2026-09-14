SOURCE-URL: https://api.openalex.org/works/https://doi.org/<doi>
FETCHED: 2026-09-14T17:35:03+08:00
HTTP: 200
NOTE: OpenAlex /works records (title, year, venue, citation count, abstract reconstructed from abstract_inverted_index, landing page) for the DOIs below. These are the receipts for abstract-only papers.

{
 "doi": "10.48550/arXiv.2408.06292",
 "openalex": "https://openalex.org/W4402952666",
 "title": "The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery",
 "year": 2024,
 "date": "2024-08-12",
 "venue": "arXiv (Cornell University)",
 "cited_by": 114,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/2408.06292",
 "oa_pdf": "https://arxiv.org/pdf/2408.06292",
 "abstract": "One of the grand challenges of artificial general intelligence is developing agents capable of conducting scientific research and discovering new knowledge. While frontier models have already been used as aides to human scientists, e.g. for brainstorming ideas, writing code, or prediction tasks, they still conduct only a small part of the scientific process. This paper presents the first comprehensive framework for fully automatic scientific discovery, enabling frontier large language models to perform research independently and communicate their findings. We introduce The AI Scientist, which generates novel research ideas, writes code, executes experiments, visualizes results, describes its findings by writing a full scientific paper, and then runs a simulated review process for evaluation. In principle, this process can be repeated to iteratively develop ideas in an open-ended fashion, acting like the human scientific community. We demonstrate its versatility by applying it to three distinct subfields of machine learning: diffusion modeling, transformer-based language modeling, and learning dynamics. Each idea is implemented and developed into a full paper at a cost of less than $15 per paper. To evaluate the generated papers, we design and validate an automated reviewer, which we show achieves near-human performance in evaluating paper scores. The AI Scientist can produce papers that exceed the acceptance threshold at a top machine learning conference as judged by our automated reviewer. This approach signifies the beginning of a new era in scientific discovery in machine learning: bringing the transformative benefits of AI agents to the entire research process of AI itself, and taking us closer to a world where endless affordable creativity and innovation can be unleashed on the world's most challenging problems. Our code is open-sourced at https://github.com/SakanaAI/AI-Scientist"
}
{
 "doi": "10.48550/arXiv.2504.08066",
 "openalex": "https://openalex.org/W4414827381",
 "title": "The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search",
 "year": 2025,
 "date": "2025-04-10",
 "venue": "arXiv (Cornell University)",
 "cited_by": 30,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/2504.08066",
 "oa_pdf": "https://arxiv.org/pdf/2504.08066",
 "abstract": "AI is increasingly playing a pivotal role in transforming how scientific discoveries are made. We introduce The AI Scientist-v2, an end-to-end agentic system capable of producing the first entirely AI generated peer-review-accepted workshop paper. This system iteratively formulates scientific hypotheses, designs and executes experiments, analyzes and visualizes data, and autonomously authors scientific manuscripts. Compared to its predecessor (v1, Lu et al., 2024 arXiv:2408.06292), The AI Scientist-v2 eliminates the reliance on human-authored code templates, generalizes effectively across diverse machine learning domains, and leverages a novel progressive agentic tree-search methodology managed by a dedicated experiment manager agent. Additionally, we enhance the AI reviewer component by integrating a Vision-Language Model (VLM) feedback loop for iterative refinement of content and aesthetics of the figures. We evaluated The AI Scientist-v2 by submitting three fully autonomous manuscripts to a peer-reviewed ICLR workshop. Notably, one manuscript achieved high enough scores to exceed the average human acceptance threshold, marking the first instance of a fully AI-generated paper successfully navigating a peer review. This accomplishment highlights the growing capability of AI in conducting all aspects of scientific research. We anticipate that further advancements in autonomous scientific discovery technologies will profoundly impact human knowledge generation, enabling unprecedented scalability in research productivity and significantly accelerating scientific breakthroughs, greatly benefiting society at large. We have open-sourced the code at https://github.com/SakanaAI/AI-Scientist-v2 to foster the future development of this transformative technology. We also discuss the role of AI in science, including AI safety."
}
{
 "doi": "10.48550/arXiv.2502.13138",
 "http": "000",
 "error": ""
}
{
 "doi": "10.48550/arXiv.2501.04227",
 "openalex": "https://openalex.org/W4406231153",
 "title": "Agent Laboratory: Using LLM Agents as Research Assistants",
 "year": 2025,
 "date": "2025-01-08",
 "venue": "arXiv (Cornell University)",
 "cited_by": 29,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/2501.04227",
 "oa_pdf": "https://arxiv.org/pdf/2501.04227",
 "abstract": "Historically, scientific discovery has been a lengthy and costly process, demanding substantial time and resources from initial conception to final results. To accelerate scientific discovery, reduce research costs, and improve research quality, we introduce Agent Laboratory, an autonomous LLM-based framework capable of completing the entire research process. This framework accepts a human-provided research idea and progresses through three stages--literature review, experimentation, and report writing to produce comprehensive research outputs, including a code repository and a research report, while enabling users to provide feedback and guidance at each stage. We deploy Agent Laboratory with various state-of-the-art LLMs and invite multiple researchers to assess its quality by participating in a survey, providing human feedback to guide the research process, and then evaluate the final paper. We found that: (1) Agent Laboratory driven by o1-preview generates the best research outcomes; (2) The generated machine learning code is able to achieve state-of-the-art performance compared to existing methods; (3) Human involvement, providing feedback at each stage, significantly improves the overall quality of research; (4) Agent Laboratory significantly reduces research expenses, achieving an 84% decrease compared to previous autonomous research methods. We hope Agent Laboratory enables researchers to allocate more effort toward creative ideation rather than low-level coding and writing, ultimately accelerating scientific discovery."
}
{
 "doi": "10.48550/arXiv.2502.18864",
 "http": "404",
 "error": "<!doctype html>\n<html lang=en>\n<title>404 Not Found</title>\n<h1>Not Found</h1>\n<p>The requested URL was not found on the server. If you entered the URL manually please check your spelling and try agai"
}
{
 "doi": "10.48550/arXiv.2505.13400",
 "openalex": "https://openalex.org/W4417287919",
 "title": "Robin: A multi-agent system for automating scientific discovery",
 "year": 2025,
 "date": "2025-05-19",
 "venue": "arXiv (Cornell University)",
 "cited_by": 9,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/2505.13400",
 "oa_pdf": "https://arxiv.org/pdf/2505.13400",
 "abstract": "Scientific discovery is driven by the iterative process of background research, hypothesis generation, experimentation, and data analysis. Despite recent advancements in applying artificial intelligence to scientific discovery, no system has yet automated all of these stages in a single workflow. Here, we introduce Robin, the first multi-agent system capable of fully automating the key intellectual steps of the scientific process. By integrating literature search agents with data analysis agents, Robin can generate hypotheses, propose experiments, interpret experimental results, and generate updated hypotheses, achieving a semi-autonomous approach to scientific discovery. By applying this system, we were able to identify a novel treatment for dry age-related macular degeneration (dAMD), the major cause of blindness in the developed world. Robin proposed enhancing retinal pigment epithelium phagocytosis as a therapeutic strategy, and identified and validated a promising therapeutic candidate, ripasudil. Ripasudil is a clinically-used rho kinase (ROCK) inhibitor that has never previously been proposed for treating dAMD. To elucidate the mechanism of ripasudil-induced upregulation of phagocytosis, Robin then proposed and analyzed a follow-up RNA-seq experiment, which revealed upregulation of ABCA1, a critical lipid efflux pump and possible novel target. All hypotheses, experimental plans, data analyses, and data figures in the main text of this report were produced by Robin. As the first AI system to autonomously discover and validate a novel therapeutic candidate within an iterative lab-in-the-loop framework, Robin establishes a new paradigm for AI-driven scientific discovery."
}
{
 "doi": "10.48550/arXiv.2503.18102",
 "openalex": "https://openalex.org/W6929277517",
 "title": "AgentRxiv: Towards Collaborative Autonomous Research",
 "year": 2025,
 "date": "2025-03-23",
 "venue": null,
 "cited_by": 5,
 "type": "preprint",
 "landing": "http://hdl.handle.net/20.500.11850/794599",
 "oa_pdf": null,
 "abstract": "Progress in scientific discovery is rarely the result of a single \"Eureka\" moment, but is rather the product of hundreds of scientists incrementally working together toward a common goal. While existing agent workflows are capable of producing research autonomously, they do so in isolation, without the ability to continuously improve upon prior research results. To address these challenges, we introduce AgentRxiv-a framework that lets LLM agent laboratories upload and retrieve reports from a shared preprint server in order to collaborate, share insights, and iteratively build on each other's research. We task agent laboratories to develop new reasoning and prompting techniques and find that agents with access to their prior research achieve higher performance improvements compared to agents operating in isolation (11.4% relative improvement over baseline on MATH-500). We find that the best performing strategy generalizes to benchmarks in other domains (improving on average by 3.3%). Multiple agent laboratories sharing research through AgentRxiv are able to work together towards a common goal, progressing more rapidly than isolated laboratories, achieving higher overall accuracy (13.7% relative improvement over baseline on MATH-500). These findings suggest that autonomous agents may play a role in designing future AI systems alongside humans. We hope that AgentRxiv allows agents to collaborate toward research goals and enables researchers to accelerate discovery."
}
{
 "doi": "10.48550/arXiv.2506.13131",
 "openalex": "https://openalex.org/W4415108068",
 "title": "AlphaEvolve: A coding agent for scientific and algorithmic discovery",
 "year": 2025,
 "date": "2025-06-16",
 "venue": "arXiv (Cornell University)",
 "cited_by": 13,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/2506.13131",
 "oa_pdf": "https://arxiv.org/pdf/2506.13131",
 "abstract": "In this white paper, we present AlphaEvolve, an evolutionary coding agent that substantially enhances capabilities of state-of-the-art LLMs on highly challenging tasks such as tackling open scientific problems or optimizing critical pieces of computational infrastructure. AlphaEvolve orchestrates an autonomous pipeline of LLMs, whose task is to improve an algorithm by making direct changes to the code. Using an evolutionary approach, continuously receiving feedback from one or more evaluators, AlphaEvolve iteratively improves the algorithm, potentially leading to new scientific and practical discoveries. We demonstrate the broad applicability of this approach by applying it to a number of important computational problems. When applied to optimizing critical components of large-scale computational stacks at Google, AlphaEvolve developed a more efficient scheduling algorithm for data centers, found a functionally equivalent simplification in the circuit design of hardware accelerators, and accelerated the training of the LLM underpinning AlphaEvolve itself. Furthermore, AlphaEvolve discovered novel, provably correct algorithms that surpass state-of-the-art solutions on a spectrum of problems in mathematics and computer science, significantly expanding the scope of prior automated discovery methods (Romera-Paredes et al., 2023). Notably, AlphaEvolve developed a search algorithm that found a procedure to multiply two $4 \\times 4$ complex-valued matrices using $48$ scalar multiplications; offering the first improvement, after 56 years, over Strassen's algorithm in this setting. We believe AlphaEvolve and coding agents like it can have a significant impact in improving solutions of problems across many areas of science and computation."
}
{
 "doi": "10.1038/s41586-023-06924-6",
 "openalex": "https://openalex.org/W4389727268",
 "title": "Mathematical discoveries from program search with large language models",
 "year": 2023,
 "date": "2023-12-14",
 "venue": "Nature",
 "cited_by": 471,
 "type": "article",
 "landing": "https://doi.org/10.1038/s41586-023-06924-6",
 "oa_pdf": "https://www.nature.com/articles/s41586-023-06924-6_reference.pdf",
 "abstract": "Abstract Large language models (LLMs) have demonstrated tremendous capabilities in solving complex tasks, from quantitative reasoning to understanding natural language. However, LLMs sometimes suffer from confabulations (or hallucinations), which can result in them making plausible but incorrect statements 1,2 . This hinders the use of current large models in scientific discovery. Here we introduce FunSearch (short for searching in the function space), an evolutionary procedure based on pairing a pretrained LLM with a systematic evaluator. We demonstrate the effectiveness of this approach to surpass the best-known results in important problems, pushing the boundary of existing LLM-based approaches 3 . Applying FunSearch to a central problem in extremal combinatorics\u2014the cap set problem\u2014we discover new constructions of large cap sets going beyond the best-known ones, both in finite dimensional and asymptotic cases. This shows that it is possible to make discoveries for established open problems using LLMs. We showcase the generality of FunSearch by applying it to an algorithmic problem, online bin packing, finding new heuristics that improve on widely used baselines. In contrast to most computer search approaches, FunSearch searches for programs that describe how to solve a problem, rather than what the solution is. Beyond being an effective and scalable strategy, discovered programs tend to be more interpretable than raw solutions, enabling feedback loops between domain experts and FunSearch, and the deployment of such programs in real-world applications."
}
{
 "doi": "10.1038/s41586-023-06792-0",
 "openalex": "https://openalex.org/W4389991792",
 "title": "Autonomous chemical research with large language models",
 "year": 2023,
 "date": "2023-12-20",
 "venue": "Nature",
 "cited_by": 982,
 "type": "article",
 "landing": "https://doi.org/10.1038/s41586-023-06792-0",
 "oa_pdf": "https://www.nature.com/articles/s41586-023-06792-0.pdf",
 "abstract": "Abstract Transformer-based large language models are making significant strides in various fields, such as natural language processing 1\u20135 , biology 6,7 , chemistry 8\u201310 and computer programming 11,12 . Here, we show the development and capabilities of Coscientist, an artificial intelligence system driven by GPT-4 that autonomously designs, plans and performs complex experiments by incorporating large language models empowered by tools such as internet and documentation search, code execution and experimental automation. Coscientist showcases its potential for accelerating research across six diverse tasks, including the successful reaction optimization of palladium-catalysed cross-couplings, while exhibiting advanced capabilities for (semi-)autonomous experimental design and execution. Our findings demonstrate the versatility, efficacy and explainability of artificial intelligence systems like Coscientist in advancing research."
}
{
 "doi": "10.48550/arXiv.2304.05376",
 "openalex": "https://openalex.org/W4365597205",
 "title": "ChemCrow: Augmenting large-language models with chemistry tools",
 "year": 2023,
 "date": "2023-04-11",
 "venue": "arXiv (Cornell University)",
 "cited_by": 135,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/2304.05376",
 "oa_pdf": "https://arxiv.org/pdf/2304.05376",
 "abstract": "Over the last decades, excellent computational chemistry tools have been developed. Integrating them into a single platform with enhanced accessibility could help reaching their full potential by overcoming steep learning curves. Recently, large-language models (LLMs) have shown strong performance in tasks across domains, but struggle with chemistry-related problems. Moreover, these models lack access to external knowledge sources, limiting their usefulness in scientific applications. In this study, we introduce ChemCrow, an LLM chemistry agent designed to accomplish tasks across organic synthesis, drug discovery, and materials design. By integrating 18 expert-designed tools, ChemCrow augments the LLM performance in chemistry, and new capabilities emerge. Our agent autonomously planned and executed the syntheses of an insect repellent, three organocatalysts, and guided the discovery of a novel chromophore. Our evaluation, including both LLM and expert assessments, demonstrates ChemCrow's effectiveness in automating a diverse set of chemical tasks. Surprisingly, we find that GPT-4 as an evaluator cannot distinguish between clearly wrong GPT-4 completions and Chemcrow's performance. Our work not only aids expert chemists and lowers barriers for non-experts, but also fosters scientific advancement by bridging the gap between experimental and computational chemistry."
}
{
 "doi": "10.1038/s41586-023-06734-w",
 "openalex": "https://openalex.org/W4389132715",
 "title": "An autonomous laboratory for the accelerated synthesis of inorganic materials",
 "year": 2023,
 "date": "2023-11-29",
 "venue": "Nature",
 "cited_by": 960,
 "type": "article",
 "landing": "https://doi.org/10.1038/s41586-023-06734-w",
 "oa_pdf": "https://www.nature.com/articles/s41586-023-06734-w.pdf",
 "abstract": ", we introduce the A-Lab, an autonomous laboratory for the solid-state synthesis of inorganic powders. This platform uses computations, historical data from the literature, machine learning (ML) and active learning to plan and interpret the outcomes of experiments performed using robotics. Over 17 days of continuous operation, the A-Lab realized 41 novel compounds from a set of 58 targets including a variety of oxides and phosphates that were identified using large-scale ab initio phase-stability data from the Materials Project and Google DeepMind. Synthesis recipes were proposed by natural-language models trained on the literature and optimized using an active-learning approach grounded in thermodynamics. Analysis of the failed syntheses provides direct and actionable suggestions to improve current techniques for materials screening and synthesis design. The high success rate demonstrates the effectiveness of artificial-intelligence-driven platforms for autonomous materials discovery and motivates further integration of computations, historical knowledge and robotics."
}
{
 "doi": "10.48550/arXiv.2511.02824",
 "openalex": "https://openalex.org/W4416437085",
 "title": "Kosmos: An AI Scientist for Autonomous Discovery",
 "year": 2025,
 "date": "2025-11-04",
 "venue": "arXiv (Cornell University)",
 "cited_by": 14,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/2511.02824",
 "oa_pdf": "https://arxiv.org/pdf/2511.02824",
 "abstract": "Data-driven scientific discovery requires iterative cycles of literature search, hypothesis generation, and data analysis. Substantial progress has been made towards AI agents that can automate scientific research, but all such agents remain limited in the number of actions they can take before losing coherence, thus limiting the depth of their findings. Here we present Kosmos, an AI scientist that automates data-driven discovery. Given an open-ended objective and a dataset, Kosmos runs for up to 12 hours performing cycles of parallel data analysis, literature search, and hypothesis generation before synthesizing discoveries into scientific reports. Unlike prior systems, Kosmos uses a structured world model to share information between a data analysis agent and a literature search agent. The world model enables Kosmos to coherently pursue the specified objective over 200 agent rollouts, collectively executing an average of 42,000 lines of code and reading 1,500 papers per run. Kosmos cites all statements in its reports with code or primary literature, ensuring its reasoning is traceable. Independent scientists found 79.4% of statements in Kosmos reports to be accurate, and collaborators reported that a single 20-cycle Kosmos run performed the equivalent of 6 months of their own research time on average. Furthermore, collaborators reported that the number of valuable scientific findings generated scales linearly with Kosmos cycles (tested up to 20 cycles). We highlight seven discoveries made by Kosmos that span metabolomics, materials science, neuroscience, and statistical genetics. Three discoveries independently reproduce findings from preprinted or unpublished manuscripts that were not accessed by Kosmos at runtime, while four make novel contributions to the scientific literature."
}
{
 "doi": "10.48550/arXiv.2409.13740",
 "http": "200",
 "error": "{\"id\":\"https://openalex.org/W4403795293\",\"doi\":\"https://doi.org/10.48550/arxiv.2409.13740\",\"display_name\":\"Language agents achieve superhuman synthesis of scientific knowledge\",\"publication_year\":2024"
}
{
 "doi": "10.1038/s41586-024-07146-0",
 "http": "200",
 "error": ""
}
{
 "doi": "10.1016/j.patter.2023.100804",
 "openalex": "https://openalex.org/W4385576721",
 "title": "Leakage and the reproducibility crisis in machine-learning-based science",
 "year": 2023,
 "date": "2023-08-04",
 "venue": "Patterns",
 "cited_by": 986,
 "type": "article",
 "landing": "https://doi.org/10.1016/j.patter.2023.100804",
 "oa_pdf": "http://www.cell.com/article/S2666389923001599/pdf",
 "abstract": "Machine-learning (ML) methods have gained prominence in the quantitative sciences. However, there are many known methodological pitfalls, including data leakage, in ML-based science. We systematically investigate reproducibility issues in ML-based science. Through a survey of literature in fields that have adopted ML methods, we find 17 fields where leakage has been found, collectively affecting 294 papers and, in some cases, leading to wildly overoptimistic conclusions. Based on our survey, we introduce a detailed taxonomy of eight types of leakage, ranging from textbook errors to open research problems. We propose that researchers test for each type of leakage by filling out model info sheets, which we introduce. Finally, we conduct a reproducibility study of civil war prediction, where complex ML models are believed to vastly outperform traditional statistical models such as logistic regression (LR). When the errors are corrected, complex ML models do not perform substantively better than decades-old LR models."
}
{
 "doi": "10.48550/arXiv.1909.06674",
 "openalex": "https://openalex.org/W2970043916",
 "title": "A Step Toward Quantifying Independently Reproducible Machine Learning Research",
 "year": 2019,
 "date": "2019-09-14",
 "venue": "arXiv (Cornell University)",
 "cited_by": 59,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/1909.06674",
 "oa_pdf": "https://arxiv.org/pdf/1909.06674",
 "abstract": "What makes a paper independently reproducible? Debates on reproducibility center around intuition or assumptions but lack empirical results. Our field focuses on releasing code, which is important, but is not sufficient for determining reproducibility. We take the first step toward a quantifiable answer by manually attempting to implement 255 papers published from 1984 until 2017, recording features of each paper, and performing statistical analysis of the results. For each paper, we did not look at the authors code, if released, in order to prevent bias toward discrepancies between code and paper."
}
{
 "doi": "10.7759/cureus.39238",
 "openalex": "https://openalex.org/W4377115988",
 "title": "High Rates of Fabricated and Inaccurate References in ChatGPT-Generated Medical Content",
 "year": 2023,
 "date": "2023-05-19",
 "venue": "Cureus",
 "cited_by": 287,
 "type": "article",
 "landing": "https://doi.org/10.7759/cureus.39238",
 "oa_pdf": "https://assets.cureus.com/uploads/original_article/pdf/158289/20230618-23404-wiiz34.pdf",
 "abstract": "Background The availability of large language models such as Chat Generative Pre-trained Transformer (ChatGPT, OpenAI) has enabled individuals from diverse backgrounds to access medical information. However, concerns exist about the accuracy of ChatGPT responses and the references used to generate medical content. Methods This observational study investigated the authenticity and accuracy of references in medical articles generated by ChatGPT. ChatGPT-3.5 generated 30 short medical papers, each with at least three references, based on standardized prompts encompassing various topics and therapeutic areas. Reference authenticity and accuracy were verified by searching Medline, Google Scholar, and the Directory of Open Access Journals. The authenticity and accuracy of individual ChatGPT-generated reference elements were also determined. Results Overall, 115 references were generated by ChatGPT, with a mean of 3.8\u00b11.1 per paper. Among these references, 47% were fabricated, 46% were authentic but inaccurate, and only 7% were authentic and accurate. The likelihood of fabricated references significantly differed based on prompt variations; yet the frequency of authentic and accurate references remained low in all cases. Among the seven components evaluated for each reference, an incorrect PMID number was most common, listed in 93% of papers. Incorrect volume (64%), page numbers (64%), and year of publication (60%) were the next most frequent errors. The mean number of inaccurate components was 4.3\u00b12.8 out of seven per reference. Conclusions The findings of this study emphasize the need for caution when seeking medical information on ChatGPT since most of the references provided were found to be fabricated or inaccurate. Individuals are advised to verify medical information from reliable sources and avoid relying solely on artificial intelligence-generated content."
}
{
 "doi": "10.1038/s41467-025-59231-1",
 "http": "000",
 "error": ""
}
{
 "doi": "10.1038/s44160-022-00231-0",
 "openalex": "https://openalex.org/W4318486595",
 "title": "The rise of self-driving labs in chemical and materials sciences",
 "year": 2023,
 "date": "2023-01-30",
 "venue": "Nature Synthesis",
 "cited_by": 571,
 "type": "article",
 "landing": "https://doi.org/10.1038/s44160-022-00231-0",
 "oa_pdf": "https://www.nature.com/articles/s44160-022-00231-0.pdf",
 "abstract": "Accelerating the discovery of new molecules and materials, as well as developing green and sustainable ways to synthesize them, will help to address global challenges in energy, sustainability and healthcare. The recent growth of data science and automated experimentation techniques has resulted in the advent of self-driving labs (SDLs) via the integration of machine learning, lab automation and robotics. An SDL is a machine-learning-assisted modular experimental platform that iteratively operates a series of experiments selected by the machine learning algorithm to achieve a user-defined objective. These intelligent robotic assistants help researchers to accelerate the pace of fundamental and applied research through rapid exploration of the chemical space. In this Review, we introduce SDLs and provide a roadmap for their implementation by non-expert scientists. We present the status quo of successful SDL implementations in the field and discuss their current limitations and future opportunities to accelerate finding solutions for societal needs. Self-driving labs (SDLs) combine machine learning with automated experimental platforms, enabling rapid exploration of the chemical space and accelerating the pace of materials and molecular discovery. In this Review, the application of SDLs, their limitations and future opportunities are discussed, and a roadmap is provided for their implementation by non-expert scientists."
}
{
 "doi": "10.1038/s41586-020-2442-3",
 "http": "404",
 "error": "<!doctype html>\n<html lang=en>\n<title>404 Not Found</title>\n<h1>Not Found</h1>\n<p>The requested URL was not found on the server. If you entered the URL manually please check your spelling and try agai"
}
{
 "doi": "10.48550/arXiv.2502.13138",
 "openalex": "https://openalex.org/W4407760093",
 "title": "AIDE: AI-Driven Exploration in the Space of Code",
 "year": 2025,
 "date": "2025-02-18",
 "venue": "arXiv (Cornell University)",
 "cited_by": 4,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/2502.13138",
 "oa_pdf": "https://arxiv.org/pdf/2502.13138",
 "abstract": "Machine learning, the foundation of modern artificial intelligence, has driven innovations that have fundamentally transformed the world. Yet, behind advancements lies a complex and often tedious process requiring labor and compute intensive iteration and experimentation. Engineers and scientists developing machine learning models spend much of their time on trial-and-error tasks instead of conceptualizing innovative solutions or research hypotheses. To address this challenge, we introduce AI-Driven Exploration (AIDE), a machine learning engineering agent powered by large language models (LLMs). AIDE frames machine learning engineering as a code optimization problem, and formulates trial-and-error as a tree search in the space of potential solutions. By strategically reusing and refining promising solutions, AIDE effectively trades computational resources for enhanced performance, achieving state-of-the-art results on multiple machine learning engineering benchmarks, including our Kaggle evaluations, OpenAI MLE-Bench and METRs RE-Bench."
}

--- also: Cureus / JMIR / ACM / Kapoor / Raff / A-Lab SDL review / mobile robotic chemist (Crossref) ---

===== additional OpenAlex records (second pass) =====

{
 "doi": "10.7759/cureus.39238",
 "http": "000",
 "error": ""
}
{
 "doi": "10.2196/53164",
 "openalex": "https://openalex.org/W4398203672",
 "title": "Hallucination Rates and Reference Accuracy of ChatGPT and Bard for Systematic Reviews: Comparative Analysis",
 "year": 2024,
 "date": "2024-05-22",
 "venue": "Journal of Medical Internet Research",
 "cited_by": 383,
 "type": "review",
 "landing": "https://doi.org/10.2196/53164",
 "oa_pdf": null,
 "abstract": "Background Large language models (LLMs) have raised both interest and concern in the academic community. They offer the potential for automating literature search and synthesis for systematic reviews but raise concerns regarding their reliability, as the tendency to generate unsupported (hallucinated) content persist. Objective The aim of the study is to assess the performance of LLMs such as ChatGPT and Bard (subsequently rebranded Gemini) to produce references in the context of scientific writing. Methods The performance of ChatGPT and Bard in replicating the results of human-conducted systematic reviews was assessed. Using systematic reviews pertaining to shoulder rotator cuff pathology, these LLMs were tested by providing the same inclusion criteria and comparing the results with original systematic review references, serving as gold standards. The study used 3 key performance metrics: recall, precision, and F1-score, alongside the hallucination rate. Papers were considered \u201challucinated\u201d if any 2 of the following information were wrong: title, first author, or year of publication. Results In total, 11 systematic reviews across 4 fields yielded 33 prompts to LLMs (3 LLMs\u00d711 reviews), with 471 references analyzed. Precision rates for GPT-3.5, GPT-4, and Bard were 9.4% (13/139), 13.4% (16/119), and 0% (0/104) respectively (P<.001). Recall rates were 11.9% (13/109) for GPT-3.5 and 13.7% (15/109) for GPT-4, with Bard failing to retrieve any relevant papers (P<.001). Hallucination rates stood at 39.6% (55/139) for GPT-3.5, 28.6% (34/119) for GPT-4, and 91.4% (95/104) for Bard (P<.001). Further analysis of nonhallucinated papers retrieved by GPT models revealed significant differences in identifying various criteria, such as randomized studies, participant criteria, and intervention criteria. The study also noted the geographical and open-access biases in the papers retrieved by the LLMs. Conclusions Given their current performance, it is not recommended for LLMs to be deployed as the primary or exclusive tool for conducting systematic reviews. Any references generated by such models warrant thorough validation by researchers. The high occurrence of hallucinations in LLMs highlights the necessity for refining their training and functionality before confidently using them for rigorous academic purposes."
}
{
 "doi": "10.1145/3624918.3625329",
 "openalex": "https://openalex.org/W4388955808",
 "title": "ChatGPT Hallucinates when Attributing Answers",
 "year": 2023,
 "date": "2023-11-23",
 "venue": null,
 "cited_by": 48,
 "type": "conference-paper",
 "landing": "https://doi.org/10.1145/3624918.3625329",
 "oa_pdf": "https://dl.acm.org/doi/pdf/10.1145/3624918.3625329",
 "abstract": "Can ChatGPT provide evidence to support its answers? Does the evidence it suggests actually exist and does it really support the answer? We investigate these questions using a collection of domain-specific knowledge-based questions, specifically prompting ChatGPT to provide both an answer and supporting evidence in the form of references to external sources. We also investigate how different prompts impact answers and evidence."
}
{
 "doi": "10.1038/s41586-024-07146-0",
 "openalex": "https://openalex.org/W4392504765",
 "title": "Artificial intelligence and illusions of understanding in scientific research",
 "year": 2024,
 "date": "2024-03-06",
 "venue": "Nature",
 "cited_by": 639,
 "type": "article",
 "landing": "https://doi.org/10.1038/s41586-024-07146-0",
 "oa_pdf": null,
 "abstract": null
}
{
 "doi": "10.48550/arXiv.2502.13138",
 "openalex": "https://openalex.org/W4407760093",
 "title": "AIDE: AI-Driven Exploration in the Space of Code",
 "year": 2025,
 "date": "2025-02-18",
 "venue": "arXiv (Cornell University)",
 "cited_by": 4,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/2502.13138",
 "oa_pdf": "https://arxiv.org/pdf/2502.13138",
 "abstract": "Machine learning, the foundation of modern artificial intelligence, has driven innovations that have fundamentally transformed the world. Yet, behind advancements lies a complex and often tedious process requiring labor and compute intensive iteration and experimentation. Engineers and scientists developing machine learning models spend much of their time on trial-and-error tasks instead of conceptualizing innovative solutions or research hypotheses. To address this challenge, we introduce AI-Driven Exploration (AIDE), a machine learning engineering agent powered by large language models (LLMs). AIDE frames machine learning engineering as a code optimization problem, and formulates trial-and-error as a tree search in the space of potential solutions. By strategically reusing and refining promising solutions, AIDE effectively trades computational resources for enhanced performance, achieving state-of-the-art results on multiple machine learning engineering benchmarks, including our Kaggle evaluations, OpenAI MLE-Bench and METRs RE-Bench."
}
{
 "doi": "10.1016/j.patter.2023.100804",
 "openalex": "https://openalex.org/W4385576721",
 "title": "Leakage and the reproducibility crisis in machine-learning-based science",
 "year": 2023,
 "date": "2023-08-04",
 "venue": "Patterns",
 "cited_by": 986,
 "type": "article",
 "landing": "https://doi.org/10.1016/j.patter.2023.100804",
 "oa_pdf": "http://www.cell.com/article/S2666389923001599/pdf",
 "abstract": "Machine-learning (ML) methods have gained prominence in the quantitative sciences. However, there are many known methodological pitfalls, including data leakage, in ML-based science. We systematically investigate reproducibility issues in ML-based science. Through a survey of literature in fields that have adopted ML methods, we find 17 fields where leakage has been found, collectively affecting 294 papers and, in some cases, leading to wildly overoptimistic conclusions. Based on our survey, we introduce a detailed taxonomy of eight types of leakage, ranging from textbook errors to open research problems. We propose that researchers test for each type of leakage by filling out model info sheets, which we introduce. Finally, we conduct a reproducibility study of civil war prediction, where complex ML models are believed to vastly outperform traditional statistical models such as logistic regression (LR). When the errors are corrected, complex ML models do not perform substantively better than decades-old LR models."
}
{
 "doi": "10.48550/arXiv.1909.06674",
 "openalex": "https://openalex.org/W2970043916",
 "title": "A Step Toward Quantifying Independently Reproducible Machine Learning Research",
 "year": 2019,
 "date": "2019-09-14",
 "venue": "arXiv (Cornell University)",
 "cited_by": 59,
 "type": "preprint",
 "landing": "http://arxiv.org/abs/1909.06674",
 "oa_pdf": "https://arxiv.org/pdf/1909.06674",
 "abstract": "What makes a paper independently reproducible? Debates on reproducibility center around intuition or assumptions but lack empirical results. Our field focuses on releasing code, which is important, but is not sufficient for determining reproducibility. We take the first step toward a quantifiable answer by manually attempting to implement 255 papers published from 1984 until 2017, recording features of each paper, and performing statistical analysis of the results. For each paper, we did not look at the authors code, if released, in order to prevent bias toward discrepancies between code and paper."
}
{
 "doi": "10.1038/s44160-022-00231-0",
 "openalex": "https://openalex.org/W4318486595",
 "title": "The rise of self-driving labs in chemical and materials sciences",
 "year": 2023,
 "date": "2023-01-30",
 "venue": "Nature Synthesis",
 "cited_by": 571,
 "type": "article",
 "landing": "https://doi.org/10.1038/s44160-022-00231-0",
 "oa_pdf": "https://www.nature.com/articles/s44160-022-00231-0.pdf",
 "abstract": "Accelerating the discovery of new molecules and materials, as well as developing green and sustainable ways to synthesize them, will help to address global challenges in energy, sustainability and healthcare. The recent growth of data science and automated experimentation techniques has resulted in the advent of self-driving labs (SDLs) via the integration of machine learning, lab automation and robotics. An SDL is a machine-learning-assisted modular experimental platform that iteratively operates a series of experiments selected by the machine learning algorithm to achieve a user-defined objective. These intelligent robotic assistants help researchers to accelerate the pace of fundamental and applied research through rapid exploration of the chemical space. In this Review, we introduce SDLs and provide a roadmap for their implementation by non-expert scientists. We present the status quo of successful SDL implementations in the field and discuss their current limitations and future opportunities to accelerate finding solutions for societal needs. Self-driving labs (SDLs) combine machine learning with automated experimental platforms, enabling rapid exploration of the chemical space and accelerating the pace of materials and molecular discovery. In this Review, the application of SDLs, their limitations and future opportunities are discussed, and a roadmap is provided for their implementation by non-expert scientists."
}
{
 "doi": "10.1038/s41586-020-2442-2",
 "openalex": "https://openalex.org/W3042021489",
 "title": "A mobile robotic chemist",
 "year": 2020,
 "date": "2020-07-08",
 "venue": "Nature",
 "cited_by": 1548,
 "type": "article",
 "landing": "https://doi.org/10.1038/s41586-020-2442-2",
 "oa_pdf": "https://strathprints.strath.ac.uk/74759/1/Burger_etal_Nature_2020_A_mobile_robotic.pdf",
 "abstract": null
}
{
 "doi": "10.7759/cureus.39238",
 "openalex": "https://openalex.org/W4377115988",
 "title": "High Rates of Fabricated and Inaccurate References in ChatGPT-Generated Medical Content",
 "year": 2023,
 "date": "2023-05-19",
 "venue": "Cureus",
 "cited_by": 287,
 "type": "article",
 "landing": "https://doi.org/10.7759/cureus.39238",
 "oa_pdf": "https://assets.cureus.com/uploads/original_article/pdf/158289/20230618-23404-wiiz34.pdf",
 "abstract": "Background The availability of large language models such as Chat Generative Pre-trained Transformer (ChatGPT, OpenAI) has enabled individuals from diverse backgrounds to access medical information. However, concerns exist about the accuracy of ChatGPT responses and the references used to generate medical content. Methods This observational study investigated the authenticity and accuracy of references in medical articles generated by ChatGPT. ChatGPT-3.5 generated 30 short medical papers, each with at least three references, based on standardized prompts encompassing various topics and therapeutic areas. Reference authenticity and accuracy were verified by searching Medline, Google Scholar, and the Directory of Open Access Journals. The authenticity and accuracy of individual ChatGPT-generated reference elements were also determined. Results Overall, 115 references were generated by ChatGPT, with a mean of 3.8\u00b11.1 per paper. Among these references, 47% were fabricated, 46% were authentic but inaccurate, and only 7% were authentic and accurate. The likelihood of fabricated references significantly differed based on prompt variations; yet the frequency of authentic and accurate references remained low in all cases. Among the seven components evaluated for each reference, an incorrect PMID number was most common, listed in 93% of papers. Incorrect volume (64%), page numbers (64%), and year of publication (60%) were the next most frequent errors. The mean number of inaccurate components was 4.3\u00b12.8 out of seven per reference. Conclusions The findings of this study emphasize the need for caution when seeking medical information on ChatGPT since most of the references provided were found to be fabricated or inaccurate. Individuals are advised to verify medical information from reliable sources and avoid relying solely on artificial intelligence-generated content."
}
