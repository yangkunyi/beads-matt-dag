SOURCE-URL: https://www.nature.com/articles/s41586-025-09442-9
FETCHED: 2026-09-14T17:27:24+08:00
HTTP: 200

The Virtual Lab of AI agents designs new SARS-CoV-2 nanobodies | Nature
Skip to main content
Thank you for visiting nature.com. You are using a browser version with limited support for CSS. To obtain
the best experience, we recommend you use a more up to date browser (or turn off compatibility mode in
Internet Explorer). In the meantime, to ensure continued support, we are displaying the site without styles
and JavaScript.
Advertisement
View all journals
Saved research
Search
Account
Log in
Content
Explore content
About the journal
Publish with us
Subscribe
Sign up for alerts
RSS feed
nature
articles
article
Article
Published: 29 July 2025
The Virtual Lab of AI agents designs new SARS-CoV-2 nanobodies
Kyle Swanson
ORCID: orcid.org/0000-0002-7385-7844 1 ,
Wesley Wu
ORCID: orcid.org/0000-0003-4594-0699 2 ,
Nash L. Bulaong 2 ,
John E. Pak
ORCID: orcid.org/0000-0002-2998-9735 2 &
…
James Zou
ORCID: orcid.org/0000-0001-8880-4764 1 , 2 , 3
Show authors
Nature
volume 646 , pages 716–723 ( 2025 ) Cite this article
Save article
View saved research
81k Accesses
228 Citations
607 Altmetric
Metrics details
Abstract
Science frequently benefits from teams of interdisciplinary researchers 1 , 2 , 3 , but many scientists do not have easy access to experts from multiple fields 4 , 5 . Although large language models (LLMs) have shown an impressive ability to aid researchers across diverse domains, their uses have been largely limited to answering specific scientific questions rather than performing open-ended research 6 , 7 , 8 , 9 , 10 , 11 . Here we expand the capabilities of LLMs for science by introducing the Virtual Lab, an artificial intelligence (AI)–human research collaboration to perform sophisticated, interdisciplinary science research. The Virtual Lab consists of an LLM Principal Investigator agent guiding a team of LLM scientist agents through a series of research meetings, with a human researcher providing high-level feedback. We applied the Virtual Lab to design nanobody binders to recent variants of SARS-CoV-2. The Virtual Lab created a novel computational nanobody design pipeline that incorporates the protein language model ESM, the protein folding model AlphaFold-Multimer and the computational biology software Rosetta and designed 92 new nanobodies. Experimental validation reveals a range of functional nanobodies with promising binding profiles across SARS-CoV-2 variants. In particular, two new nanobodies exhibit improved binding to the recent JN.1 or KP.3 variants 12 , 13 while maintaining strong binding to the ancestral viral spike protein, suggesting that these are suitable candidates for further investigation. This work demonstrates how the Virtual Lab can rapidly make an impactful, real-world scientific discovery.
This is a preview of subscription content, access via your institution
Access options
Access through your institution
Access Nature and 54 other Nature Portfolio journals
Get Nature+, our best-value online-access subscription
27,99 € / 30 days
cancel any time
Learn more
Subscription info for Chinese customers
We have a dedicated website for our Chinese customers. Please go to naturechina.com to subscribe to this journal.
Go to naturechina.com
Buy this article
Purchase on SpringerLink
Instant access to the full article PDF.
39,95 €
Prices may be subject to local taxes which are calculated during checkout
Additional access options:
Log in
Learn about institutional subscriptions
Read our FAQs
Contact customer support
Fig. 1: The Virtual Lab architecture.
Fig. 2: Virtual Lab for nanobody design.
Fig. 3: Nb21 nanobody analysis.
Fig. 4: Experimental validation of Virtual Lab nanobodies.
Fig. 5: Virtual Lab discussion analysis.
Similar content being viewed by others
Antibody–nanobody combination increases their neutralizing activity against SARS-CoV-2 and nanobody H11-H4 is effective against Alpha, Kappa and Delta variants
Article
Open access
11 June 2022
AI-assisted scaffold-based nanobody design identifies Nb01 as a promising pan-variant candidate targeting SARS-CoV-2 3CLpro
Article
Open access
31 August 2026
A cell-free nanobody engineering platform rapidly generates SARS-CoV-2 neutralizing nanobodies
Article
Open access
17 September 2021
Explore related subjects
Discover the latest articles and news in related subjects.
Computational models
Computer science
Data availability
The computational results of the nanobody design pipeline and the experimental ELISA binding data are available on Zenodo at https://doi.org/10.5281/zenodo.15331308 (ref. 62 ).
Code availability
Code for the Virtual Lab, full discussions by the agents and computational scores for the designed nanobodies are available on GitHub at https://github.com/zou-group/virtual_lab and on Zenodo at https://doi.org/10.5281/zenodo.15320491 (ref. 63 ).
References
Porter, A. L. & Rafols, I. Is science becoming more interdisciplinary? Measuring and mapping six research fields over time. Scientometrics 81 , 719–745 (2009).
Article
Google Scholar
Sijp, W. Paper authorship goes hyper. Nature Index www.nature.com/nature-index/news/paper-authorship-goes-hyper (2018).
Castelvecchi, D. Physics paper sets record with more than 5,000 authors. Nature https://doi.org/10.1038/nature.2015.17567 (2015).
Specht, A. & Crowston, K. Interdisciplinary collaboration from diverse science teams can produce significant outcomes. PLoS ONE 17 , e0278043 (2022).
Article
CAS
PubMed
PubMed Central
Google Scholar
Cohen, J. J. et al. Tackling the challenge of interdisciplinary energy research: a research toolkit. Energy Res. Soc. Sci. 74 , 101966 (2021).
Article
Google Scholar
Kung, T. H. et al. Performance of ChatGPT on USMLE: potential for AI-assisted medical education using large language models. PLOS Digit. Health 2 , e0000198 (2023).
Article
PubMed
PubMed Central
Google Scholar
Singhal, K. et al. Large language models encode clinical knowledge. Nature 620 , 172–180 (2023).
Article
ADS
CAS
PubMed
PubMed Central
Google Scholar
Laurent, J. M. et al. LAB-Bench: measuring capabilities of language models for biology research. Preprint at https://doi.org/10.48550/arXiv.2407.10362 (2024).
Guo, T. et al. What can large language models do in chemistry? A comprehensive benchmark on eight tasks. Adv. Neural Inf. Process. Syst. 36 , 59662–59688 (2023).
ADS
Google Scholar
Sun, L. et al. SciEval: a multi-level large language model evaluation benchmark for scientific research. Proc. AAAI Conf. Artif. Intell. 38 , 19053–19061 (2024).
Google Scholar
Stribling, D. et al. The model student: GPT-4 performance on graduate biomedical science exams. Sci. Rep. 14 , 5670 (2024).
Article
ADS
CAS
PubMed
PubMed Central
Google Scholar
Kaku, Y. et al. Virological characteristics of the SARS-CoV-2 JN.1 variant. Lancet Infect. Dis. 24 , e82 (2024).
Article
CAS
PubMed
Google Scholar
Kaku, Y. et al. Virological characteristics of the SARS-CoV-2 KP.3, LB.1, and KP.2.3 variants. Lancet Infect. Dis. 24 , e482–e483 (2024).
Article
CAS
PubMed
Google Scholar
Jumper, J. et al. Highly accurate protein structure prediction with AlphaFold. Nature 596 , 583–589 (2021).
Article
ADS
CAS
PubMed
PubMed Central
Google Scholar
Callaway, E. Chemistry Nobel goes to developers of AlphaFold AI that predicts protein structures. Nature 634 , 525–526 (2024).
Article
ADS
CAS
PubMed
Google Scholar
Bromham, L., Dinnage, R. & Hua, X. Interdisciplinary research has consistently lower funding success. Nature 534 , 684–687 (2016).
Article
ADS
CAS
PubMed
Google Scholar
OpenAI et al. GPT-4 Technical Report. Preprint at https://doi.org/10.48550/arXiv.2303.08774 (2024).
Anthropic. The Claude 3 Model Family: Opus, Sonnet, Haiku (Anthropic, 2024).
Simon, E., Swanson, K. & Zou, J. Language models for biological research: a primer. Nat. Methods 21 , 1422–1429 (2024).
Article
CAS
PubMed
Google Scholar
M. Bran, A. et al. Augmenting large language models with chemistry tools. Nat. Mach. Intell. 6 , 525–535 (2024).
Article
PubMed
PubMed Central
Google Scholar
Boiko, D. A., MacKnight, R., Kline, B. & Gomes, G. Autonomous chemical research with large language models. Nature 624 , 570–578 (2023).
Article
ADS
CAS
PubMed
PubMed Central
Google Scholar
Lu, C. et al. The AI scientist: towards fully automated open-ended scientific discovery. Preprint at https://doi.org/10.48550/arXiv.2408.06292 (2024).
Si, C., Yang, D. & Hashimoto, T. Can LLMs generate novel research ideas? A large-scale human study with 100+ NLP researchers. in 13th Int. Conf. Learn. Represent. https://openreview.net/pdf?id=M23dTGWCZy (ICLR, 2025).
Wu, Q. et al. AutoGen: enabling next-gen LLM applications via multi-agent conversation. In 1st Conf. Lang. Model. https://openreview.net/forum?id=BAakY1hNKS (COLM, 2024).
Gao, S. et al. Empowering biomedical discovery with AI agents. Cell 187 , 6125–6151 (2024).
Article
CAS
PubMed
Google Scholar
Lin, Z. et al. Evolutionary-scale prediction of atomic-level protein structure with a language model. Science 379 , 1123–1130 (2023).
Article
ADS
MathSciNet
CAS
PubMed
Google Scholar
Evans, R. et al. Protein complex prediction with AlphaFold-Multimer. Preprint at https://doi.org/10.1101/2021.10.04.463034 (2021).
Boorla, V. S. et al. De novo design and Rosetta‐based assessment of high‐affinity antibody variable regions (Fv) against the SARS‐CoV ‐2 spike receptor binding domain (RBD). Proteins Struct. Funct. Bioinformatics 91 , 196–208 (2023).
Article
CAS
Google Scholar
OpenAI et al. GPT-4o System Card. Preprint at https://doi.org/10.48550/arXiv.2410.21276 (2024).
Cao, Y. et al. Omicron escapes the majority of existing SARS-CoV-2 neutralizing antibodies. Nature 602 , 657–663 (2022).
Article
ADS
CAS
PubMed
Google Scholar
Planas, D. et al. Considerable escape of SARS-CoV-2 Omicron to antibody neutralization. Nature 602 , 671–675 (2022).
Article
ADS
CAS
PubMed
Google Scholar
Hanke, L. et al. An alpaca nanobody neutralizes SARS-CoV-2 by blocking receptor interaction. Nat. Commun. 11 , 4420 (2020).
Article
ADS
CAS
PubMed
PubMed Central
Google Scholar
Huo, J. et al. Neutralizing nanobodies bind SARS-CoV-2 spike RBD and block interaction with ACE2. Nat. Struct. Mol. Biol. 27 , 846–854 (2020).
Article
CAS
PubMed
Google Scholar
Xiang, Y. et al. Versatile and multivalent nanobodies efficiently neutralize SARS-CoV-2. Science 370 , 1479–1484 (2020).
Article
ADS
CAS
PubMed
PubMed Central
Google Scholar
Wrapp, D. et al. Structural basis for potent neutralization of betacoronaviruses by single-domain camelid antibodies. Cell 181 , 1004–1015.e15 (2020).
Article
CAS
PubMed
PubMed Central
Google Scholar
Yin, R. & Pierce, B. G. Evaluation of AlphaFold antibody–antigen modeling with implications for improving predictive accuracy. Protein Sci. 33 , e4865 (2024).
Article
CAS
PubMed
PubMed Central
Google Scholar
Yang, J. et al. Computational design and modeling of nanobodies toward SARS‐CoV‐2 receptor binding domain. Chem. Biol. Drug Des. 98 , 1–18 (2021).
Article
CAS
PubMed
PubMed Central
Google Scholar
Hie, B. L. et al. Efficient evolution of human antibodies from general protein language models. Nat. Biotechnol. 42 , 275–283 (2024).
Article
CAS
PubMed
Google Scholar
Planas, D. et al. Escape of SARS-CoV-2 variants KP.1.1, LB.1, and KP3.3 from approved monoclonal antibodies. Pathog. Immun. 10 , 1 (2024).
Article
PubMed
PubMed Central
Google Scholar
Chan, C.-M. et al. ChatEval: towards better LLM-based evaluators through multi-agent debate. In 12th Int. Conf. Learn. Represent. https://openreview.net/forum?id=FQepisCUWu (ICLR, 2024).
Liu, Z., Zhang, Y., Li, P., Liu, Y. & Yang, D. A dynamic LLM-powered agent network for task-oriented agent collaboration. In 1st Conf. on Lang. Model. https://openreview.net/forum?id=XII0Wp1XA9 (COLM, 2024).
Talebirad, Y. & Nadiri, A. Multi-agent collaboration: harnessing the power of intelligent LLM agents. Preprint at https://doi.org/10.48550/arXiv.2306.03314 (2023).
Wei, J. et al. Chain-of-thought prompting elicits reasoning in large language models. In Proc. 36th International Conference on Neural Information Processing Systems 24824–24837 (Curran Associates, 2024).
Cheng, J. et al. Dated data: tracing knowledge cutoffs in large language models. In 1st Conf. Lang. Model. https://openreview.net/forum?id=wS7PxDjy6m (COLM, 2024).
Abramson, J. et al. Accurate structure prediction of biomolecular interactions with AlphaFold 3. Nature 630 , 493–500 (2024).
Article
ADS
CAS
PubMed
PubMed Central
Google Scholar
Lewis, P. et al. Retrieval-augmented generation for knowledge-intensive NLP tasks. Adv. Neural Inf. Process. Syst. 33 , 9459–9474 (2020).
Google Scholar
Gao, Y. et al. Retrieval-augmented generation for large language models: a survey. Preprint at https://doi.org/10.48550/arXiv.2312.10997 (2024).
Ding, N. et al. Parameter-efficient fine-tuning of large-scale pre-trained language models. Nat. Mach. Intell. 5 , 220–235 (2023).
Article
Google Scholar
White, J. et al. A prompt pattern catalog to enhance prompt engineering with ChatGPT. In Proc. 30th Conference on Pattern Languages of Programs 1–31 (Hillside Group, 2023).
Ji, Z. et al. Survey of hallucination in natural language generation. ACM Comput. Surv. 55 , 1–38 (2023).
Article
Google Scholar
Meng, E. C. et al. UCSF ChimeraX: tools for structure building and analysis. Protein Sci. 32 , e4792 (2023).
Article
CAS
PubMed
PubMed Central
Google Scholar
Yuksekgonul, M. et al. Optimizing generative AI by backpropagating language model feedback. Nature 639 , 609–616 (2025).
Article
ADS
CAS
PubMed
Google Scholar
Peeperkorn, M., Kouwenhoven, T., Brown, D. & Jordanous, A. Is temperature the creativity parameter of large language models? In 15th Int. Conf. Comput. Creativity (Association for Computational Creativity, 2024).
Chen, H. & Ding, N. Probing the “creativity” of large language models: can models produce divergent semantic association? In Findings of the Association for Computational Linguistics: EMNLP 2023 (eds Bouamor, H., Pino, J. & Bali, K.) 12881–12888 (Association for Computational Linguistics, 2023).
Chen, L. et al. Are more LLM calls all you need? Towards the scaling properties of compound AI systems. In 38th Annual Conference on Neural Information Processing Systems (NeurIPS, 2024).
Mirdita, M. et al. ColabFold: making protein folding accessible to all. Nat. Methods 19 , 679–682 (2022).
Article
CAS
PubMed
PubMed Central
Google Scholar
Kumar, S., Karuppanan, K. & Subramaniam, G. Omicron (BA.1) and sub-variants (BA.1.1, BA.2, and BA.3) of SARS-CoV-2 spike infectivity and pathogenicity: A comparative sequence and structural-based computational assessment. J. Med. Virol. 94 , 4780–4791 (2022).
Article
CAS
PubMed
PubMed Central
Google Scholar
Puccinelli, R. R. et al. Open-source milligram-scale, four channel, automated protein purification system. PLoS ONE 19 , e0297879 (2024).
Article
CAS
PubMed
PubMed Central
Google Scholar
Saez, N. J. & Vincentelli, R. in Structural Genomics: General Applications (ed. Chen, Y. W.) 33–53 (Humana Press, 2014).
Pardon, E. et al. A general protocol for the generation of Nanobodies for structural biology. Nat. Protoc. 9 , 674–693 (2014).
Article
CAS
PubMed
PubMed Central
Google Scholar
Byrum, J. R. et al. MultiSero: an open-source multiplex-ELISA platform for measuring antibody responses to infection. Pathogens 12 , 671 (2023).
Article
CAS
PubMed
PubMed Central
Google Scholar
Swanson, K., Wu, W., Bulaong, N., Pak, J. & Zou, J. Virtual Lab Data. Zenodo https://doi.org/10.5281/zenodo.15331309 (2025).
Swanson, K. Virtual Lab Code. Zenodo https://doi.org/10.5281/zenodo.15320492 (2025).
Download references
Acknowledgements
The authors thank E. Simon and J. Silberg for their discussions of this work. K.S. acknowledges support from the Knight-Hennessy Scholarship and the Stanford Bio-X Fellowship. J.Z. is supported by funding from the Chan Zuckerberg Biohub, San Francisco.
Author information
Authors and Affiliations
Department of Computer Science, Stanford University, Stanford, CA, USA
Kyle Swanson & James Zou
Chan Zuckerberg Biohub, San Francisco, CA, USA
Wesley Wu, Nash L. Bulaong, John E. Pak & James Zou
Department of Biomedical Data Science, Stanford University, Stanford, CA, USA
James Zou
Authors Kyle Swanson View author publications
Search author on: PubMed Google Scholar
Wesley Wu View author publications
Search author on: PubMed Google Scholar
Nash L. Bulaong View author publications
Search author on: PubMed Google Scholar
John E. Pak View author publications
Search author on: PubMed Google Scholar
James Zou View author publications
Search author on: PubMed Google Scholar
Contributions
K.S. built the Virtual Lab framework and applied the Virtual Lab to create and run the computational nanobody design pipeline. W.W., N.L.B. and J.E.P. conducted the nanobody validation experiments. J.E.P. and J.Z. supervised the work. All authors contributed to the manuscript.
Corresponding authors
Correspondence to
John E. Pak or James Zou .
Ethics declarations
Competing interests
The authors declare no competing interests.
Peer review
Peer review information
Nature thanks Bryan Briney, Olivier Elemento, Eric Topol and the other, anonymous, reviewer(s) for their contribution to the peer review of this work. Peer reviewer reports are available.
Additional information
Publisher’s note Springer Nature remains neutral with regard to jurisdictional claims in published maps and institutional affiliations.
Extended data figures and tables
Extended Data Fig. 1 Virtual Lab parallel meetings.
The workflow for parallel meetings in the Virtual Lab. A set of meetings (team or individual) is run with the same agenda and agents but with different randomness in the LLM underlying the agents (with a high LLM temperature to encourage creativity across meetings). The answer from each parallel meeting is then provided to an agent in an individual meeting (with a low LLM temperature for consistency), and this agent is asked to merge the best components of the answers from each parallel meeting into a single optimal answer.
Extended Data Fig. 2 Ty1 nanobody analysis.
a-c , Evolution of mutant nanobody scores across four rounds of optimization. a , The distribution of ESM LLR values for proposed Ty1 mutant nanobodies across each round of optimization, with ESM LLR values computed relative to the input nanobody sequence from the previous round. Shown are the ESM LLR values of the top 20 proposed mutant nanobodies per input nanobody. b , The AF ipLDDT and the RS dG of the top five proposed nanobodies, selected by WS, at the end of each round of optimization. c , The distribution of WS values of the top five proposed nanobodies at the end of each round of optimization. d-f , Analysis of the final set of 23 mutant nanobodies selected across all rounds of optimization. d , The distribution of ESM LLR WT values (ESM LLR of the mutant sequence compared to the wild-type sequence) for the selected nanobodies and the wild-type nanobody. e , The AF ipLDDT and RS dG values of the selected nanobodies and the wild-type nanobody. f , The structure (predicted by AlphaFold-Multimer followed by Rosetta relaxation) of the receptor binding domain of the KP.3 spike protein (cyan) and the nanobody mutant Ty1 V32F-G59D-N54S-F32S (green). Side chains are shown for interface residues (within 4Å of the opposite chain). Mutant nanobody residues are in pink. (PyMol 3.1.3, Schrödinger, LLC.).
Extended Data Fig. 3 H11-D4 nanobody analysis.
a-c , Evolution of mutant nanobody scores across four rounds of optimization. a , The distribution of ESM LLR values for proposed H11-D4 mutant nanobodies across each round of optimization, with ESM LLR values computed relative to the input nanobody sequence from the previous round. Shown are the ESM LLR values of the top 20 proposed mutant nanobodies per input nanobody. b , The AF ipLDDT and the RS dG of the top five proposed nanobodies, selected by WS, at the end of each round of optimization. c , The distribution of WS values of the top five proposed nanobodies at the end of each round of optimization. d-f , Analysis of the final set of 23 mutant nanobodies selected across all rounds of optimization. d , The distribution of ESM LLR WT values (ESM LLR of the mutant sequence compared to the wild-type sequence) for the selected nanobodies and the wild-type nanobody. e , The AF ipLDDT and RS dG values of the selected nanobodies and the wild-type nanobody. f , The structure (predicted by AlphaFold-Multimer followed by Rosetta relaxation) of the receptor binding domain of the KP.3 spike protein (cyan) and the nanobody mutant H11-D4 A14P-Y88V-K74T-R27L (green). Side chains are shown for interface residues (within 4Å of the opposite chain). Mutant nanobody residues are in pink. (PyMol 3.1.3, Schrödinger, LLC.).
Extended Data Fig. 4 VHH-72 nanobody analysis.
a-c , Evolution of mutant nanobody scores across four rounds of optimization. a , The distribution of ESM LLR values for proposed VHH-72 mutant nanobodies across each round of optimization, with ESM LLR values computed relative to the input nanobody sequence from the previous round. Shown are the ESM LLR values of the top 20 proposed mutant nanobodies per input nanobody. b , The AF ipLDDT and the RS dG of the top five proposed nanobodies, selected by WS, at the end of each round of optimization. c , The distribution of WS values of the top five proposed nanobodies at the end of each round of optimization. d-f , Analysis of the final set of 23 mutant nanobodies selected across all rounds of optimization. d , The distribution of ESM LLR WT values (ESM LLR of the mutant sequence compared to the wild-type sequence) for the selected nanobodies and the wild-type nanobody. e , The AF ipLDDT and RS dG values of the selected nanobodies and the wild-type nanobody. f , The structure (predicted by AlphaFold-Multimer followed by Rosetta relaxation) of the receptor binding domain of the KP.3 spike protein (cyan) and the nanobody mutant VHH-72 R27Y-E31D-F37V-D89E (green). Side chains are shown for interface residues (within 4Å of the opposite chain). Mutant nanobody residues are in pink. (PyMol 3.1.3, Schrödinger, LLC.).
Extended Data Fig. 5 Workflow for nanobody experimental validation.
The four categories of experiments (nanobody expression, SARS-CoV-2 spike RBD expression, antigen array printing, and multiplexed ELISA) are enclosed in boxes. The ribbons representation of a nanobody (blue) and the RBD (purple) were rendered with ChimeraX 51 from PDB accession numbers 6XZN and 6M0J, respectively. Unique RBD and control proteins of the array are shown as colored spots with fiducial markers shown as black spots. Portions of this figure were created in BioRender. Bulaong, N. (2025) https://BioRender.com/6du2yu4 .
Extended Data Fig. 6 Nanobody expression.
Periplasmic extracts containing soluble nanobody were separated by reducing SDS-PAGE and stained with Coomassie blue. An equal volume of periplasmic extract (8.3 uL) was loaded for each sample. Identifiers for each nanobody (A1 to H12) are shown, with the 4 unmutated parental nanobodies highlighted in yellow and the 92 Virtual Lab designs unhighlighted. The expected molecular weight for the nanobodies (~15 kDa) is enclosed in a red box. Uncropped images of samples analyzed once by SDS-PAGE are shown.
Extended Data Fig. 7 Virtual Lab additional discussion analysis.
a , The number of words (space-separated tokens) written by the Virtual Lab (human researcher and each LLM agent) in the tools selection phase. b , The number of words written by the Virtual Lab in AlphaFold implementation. c , The number of words written by the Virtual Lab in Rosetta implementation. d , The number of words written by the Virtual Lab in the team selection phase. e , The number of words written by the Virtual Lab in implementation agent selection.
Extended Data Table 1 Nanobody score analysis Full size table
Supplementary information
Supplementary Information (download PDF )
This file contains Supplementary Notes 1–6, Supplementary Figs. 1–3, Supplementary Table 1, Supplementary Boxes 1–3 and references.
Reporting Summary (download PDF )
Peer Review File (download PDF )
Rights and permissions
Springer Nature or its licensor (e.g. a society or other partner) holds exclusive rights to this article under a publishing agreement with the author(s) or other rightsholder(s); author self-archiving of the accepted manuscript version of this article is solely governed by the terms of such publishing agreement and applicable law.
Reprints and permissions
About this article
Cite this article
Swanson, K., Wu, W., Bulaong, N.L. et al. The Virtual Lab of AI agents designs new SARS-CoV-2 nanobodies.
Nature 646 , 716–723 (2025). https://doi.org/10.1038/s41586-025-09442-9
Download citation
Received : 26 November 2024
Accepted : 22 July 2025
Published : 29 July 2025
Version of record : 03 September 2025
Issue date : 16 October 2025
DOI : https://doi.org/10.1038/s41586-025-09442-9
Share this article
Anyone you share the following link with will be able to read this content:
Get shareable link Sorry, a shareable link is not currently available for this article.
Copy shareable link to clipboard
Provided by the Springer Nature SharedIt content-sharing initiative
Access through your institution
Buy or subscribe
Advertisement
Explore content
Research articles
News
Opinion
Research Analysis
Careers
Books & Culture
Podcasts
Videos
Current issue
Browse issues
Collections
Subjects
Follow us on Facebook
Follow us on Bluesky
Follow us on X
Subscribe
Sign up for alerts
RSS feed
About the journal
Journal Staff
About the Editors
Research Cross-Journal Editorial Team
Journal Information
Journal Metrics
Our publishing models
Editorial Values Statement
Editorial policies
Journalistic Principles
History of Nature
Awards
Contact
Send a news tip
Publish with us
For Authors
For Referees
Language editing services
Open access funding
Submit manuscript
Search
Search articles by subject, keyword or author
Show results from
All journals
This journal
Search
Advanced search
Quick links
Explore articles by subject
Find a job
Guide to authors
Editorial policies
Nature
( Nature )
ISSN 1476-4687 (online)
ISSN 0028-0836 (print)
nature.com footer links
About Nature Portfolio
About us
Press releases
Press office
Contact us
Discover content
Journals A-Z
Articles by subject
protocols.io
Nature Index
Publishing policies
Nature portfolio policies
Open access
Author & Researcher services
Reprints & permissions
Research data
Language editing
Scientific editing
Nature Masterclasses
Research Solutions
Libraries & institutions
Librarian service & tools
Librarian portal
Open research
Recommend to library
Advertising & partnerships
Advertising
Partnerships & Services
Media kits
Branded
content
Professional development
Nature Awards
Nature Careers
Nature
Conferences
Regional websites
Nature Africa
Nature China
Nature India
Nature Japan
Nature Middle East
Privacy
Policy
Use
of cookies
Your privacy choices/Manage cookies
Legal
notice
Accessibility
statement
Terms & Conditions
Your US state privacy rights
© 2026 Springer Nature Limited
Close
Sign up for the Nature Briefing: AI and Robotics newsletter — what matters in AI and robotics research, free to your inbox weekly.
Email address
Sign up
I agree my information will be processed in accordance with the Nature and Springer Nature Limited Privacy Policy .
Close
Get the most important science stories of the day, free in your inbox.
Sign up for Nature Briefing: AI and Robotics
