SOURCE-URL: https://huggingface.co/papers/2407.13168
FETCHED: 2026-09-14T17:17:16+08:00
HTTP: 200

Paper page - SciCode: A Research Coding Benchmark Curated by Scientists
Hugging Face
Models
Datasets
Spaces
Buckets new
Docs
Enterprise
Pricing
Website
Tasks
HuggingChat
Collections
Languages
Organizations
Community
Blog
Posts
Daily Papers
Hardware
Learn
Discord
Forum
GitHub
Solutions
Team & Enterprise
Hugging Face PRO
Enterprise Support
Inference Providers
Inference Endpoints
Storage Buckets
Log In
Sign Up
<a href=\"https://scicode-bench.github.io\" rel=\"nofollow\">https://scicode-bench.github.io</a></p>\n","updatedAt":"2024-07-22T07:59:02.430Z","author":{"_id":"6610c90c6c59fff43622eef7","avatarUrl":"/avatars/f832a3918101aa5f0834f1456b154c37.svg","fullname":"Yanxin Lu","name":"amber1120","type":"user","isPro":false,"isHf":false,"isHfAdmin":false,"isMod":false,"isUserFollowing":false}},"numEdits":0,"identifiedLanguage":{"language":"en","probability":0.3557124435901642},"editors":["amber1120"],"editorAvatarUrls":["/avatars/f832a3918101aa5f0834f1456b154c37.svg"],"reactions":[],"isReport":false},"replies":[{"id":"66a24e137fe09e2a65d89b38","author":{"_id":"5f1158120c833276f61f1a84","avatarUrl":"https://cdn-avatars.huggingface.co/v1/production/uploads/1608042047613-5f1158120c833276f61f1a84.jpeg","fullname":"Niels Rogge","name":"nielsr","type":"user","isPro":false,"isHf":true,"isHfAdmin":false,"isMod":false,"followerCount":1302,"isUserFollowing":false},"createdAt":"2024-07-25T13:07:31.000Z","type":"comment","data":{"edited":false,"hidden":false,"latest":{"raw":"Hi @amber1120 congrats on this work!\n\nAre you planning to share the dataset on the hub? Here's a guide: https://huggingface.co/docs/datasets/loading.\n\nThe dataset could then be loaded in 2 lines of code, like so:\n\n```python\nfrom datasets import load_dataset\n\ndataset = load_dataset(\"your-hf-organization/scicode\")\n```\nIt could then also be linked to this paper, as explained here: https://huggingface.co/docs/hub/en/datasets-cards#linking-a-paper.\n\nWe could also set up a Space using Gradio for the leaderboard.\n\nLet me know if you need any help!\n\nCheers,\nNiels\nOpen-source @ HF","html":"<p>Hi <span class=\"SVELTE_PARTIAL_HYDRATER contents\" data-target=\"UserMention\" data-props=\"{&quot;user&quot;:&quot;amber1120&quot;}\"><span class=\"inline-block\"><span class=\"contents\"><a href=\"/amber1120\">@<span class=\"underline\">amber1120</span></a></span> </span></span> congrats on this work!</p>\n<p>Are you planning to share the dataset on the hub? Here's a guide: <a href=\"https://huggingface.co/docs/datasets/loading\">https://huggingface.co/docs/datasets/loading</a>.</p>\n<p>The dataset could then be loaded in 2 lines of code, like so:</p>\n<pre><code class=\"language-python\"><span class=\"hljs-keyword\">from</span> datasets <span class=\"hljs-keyword\">import</span> load_dataset\n\ndataset = load_dataset(<span class=\"hljs-string\">\"your-hf-organization/scicode\"</span>)\n</code></pre>\n<p>It could then also be linked to this paper, as explained here: <a href=\"https://huggingface.co/docs/hub/en/datasets-cards#linking-a-paper\">https://huggingface.co/docs/hub/en/datasets-cards#linking-a-paper</a>.</p>\n<p>We could also set up a Space using Gradio for the leaderboard.</p>\n<p>Let me know if you need any help!</p>\n<p>Cheers,<br>Niels<br>Open-source @ HF</p>\n","updatedAt":"2024-07-25T13:07:31.796Z","author":{"_id":"5f1158120c833276f61f1a84","avatarUrl":"https://cdn-avatars.huggingface.co/v1/production/uploads/1608042047613-5f1158120c833276f61f1a84.jpeg","fullname":"Niels Rogge","name":"nielsr","type":"user","isPro":false,"isHf":true,"isHfAdmin":false,"isMod":false,"followerCount":1302,"isUserFollowing":false}},"numEdits":0,"identifiedLanguage":{"language":"en","probability":0.8660281896591187},"editors":["nielsr"],"editorAvatarUrls":["https://cdn-avatars.huggingface.co/v1/production/uploads/1608042047613-5f1158120c833276f61f1a84.jpeg"],"reactions":[{"reaction":"👍","users":["clefourrier"],"count":1}],"isReport":false,"parentCommentId":"669e11468580d17cb6f5bb2e"}}]},{"id":"669f08163de1a03833c69ba2","author":{"_id":"63d3e0e8ff1384ce6c5dd17d","avatarUrl":"https://cdn-avatars.huggingface.co/v1/production/uploads/1674830754237-63d3e0e8ff1384ce6c5dd17d.jpeg","fullname":"Librarian Bot (Bot)","name":"librarian-bot","type":"user","isPro":false,"isHf":false,"isHfAdmin":false,"isMod":false,"followerCount":380,"isUserFollowing":false},"createdAt":"2024-07-23T01:32:06.000Z","type":"comment","data":{"edited":false,"hidden":false,"latest":{"raw":"This is an automated message from the [Librarian Bot](https://huggingface.co/librarian-bots). I found the following papers similar to this paper. \n\nThe following papers were recommended by the Semantic Scholar API \n\n* [BigCodeBench: Benchmarking Code Generation with Diverse Function Calls and Complex Instructions](https://huggingface.co/papers/2406.15877) (2024)\n* [PLUM: Preference Learning Plus Test Cases Yields Better Code Language Models](https://huggingface.co/papers/2406.06887) (2024)\n* [CodeRAG-Bench: Can Retrieval Augment Code Generation?](https://huggingface.co/papers/2406.14497) (2024)\n* [AICoderEval: Improving AI Domain Code Generation of Large Language Models](https://huggingface.co/papers/2406.04712) (2024)\n* [A Survey on Large Language Models for Code Generation](https://huggingface.co/papers/2406.00515) (2024)\n\n\n Please give a thumbs up to this comment if you found it helpful!\n\n If you want recommendations for any Paper on Hugging Face checkout [this](https://huggingface.co/spaces/librarian-bots/recommend_similar_papers) Space\n\n You can directly ask Librarian Bot for paper recommendations by tagging it in a comment: `@librarian-bot recommend`","html":"<p>This is an automated message from the <a href=\"https://huggingface.co/librarian-bots\">Librarian Bot</a>. I found the following papers similar to this paper. </p>\n<p>The following papers were recommended by the Semantic Scholar API </p>\n<ul>\n<li><a href=\"https://huggingface.co/papers/2406.15877\">BigCodeBench: Benchmarking Code Generation with Diverse Function Calls and Complex Instructions</a> (2024)</li>\n<li><a href=\"https://huggingface.co/papers/2406.06887\">PLUM: Preference Learning Plus Test Cases Yields Better Code Language Models</a> (2024)</li>\n<li><a href=\"https://huggingface.co/papers/2406.14497\">CodeRAG-Bench: Can Retrieval Augment Code Generation?</a> (2024)</li>\n<li><a href=\"https://huggingface.co/papers/2406.04712\">AICoderEval: Improving AI Domain Code Generation of Large Language Models</a> (2024)</li>\n<li><a href=\"https://huggingface.co/papers/2406.00515\">A Survey on Large Language Models for Code Generation</a> (2024)</li>\n</ul>\n<p> Please give a thumbs up to this comment if you found it helpful!</p>\n<p> If you want recommendations for any Paper on Hugging Face checkout <a href=\"https://huggingface.co/spaces/librarian-bots/recommend_similar_papers\">this</a> Space</p>\n<p> You can directly ask Librarian Bot for paper recommendations by tagging it in a comment: <code>@librarian-bot recommend</code></p>\n","updatedAt":"2024-07-23T01:32:06.002Z","author":{"_id":"63d3e0e8ff1384ce6c5dd17d","avatarUrl":"https://cdn-avatars.huggingface.co/v1/production/uploads/1674830754237-63d3e0e8ff1384ce6c5dd17d.jpeg","fullname":"Librarian Bot (Bot)","name":"librarian-bot","type":"user","isPro":false,"isHf":false,"isHfAdmin":false,"isMod":false,"followerCount":380,"isUserFollowing":false}},"numEdits":0,"identifiedLanguage":{"language":"en","probability":0.704921305179596},"editors":["librarian-bot"],"editorAvatarUrls":["https://cdn-avatars.huggingface.co/v1/production/uploads/1674830754237-63d3e0e8ff1384ce6c5dd17d.jpeg"],"reactions":[],"isReport":false}}],"primaryEmailConfirmed":false,"paper":{"id":"2407.13168","authors":[{"_id":"669dcf3b7f28c43e09d5497d","user":{"_id":"64ead5f1213a0415bd22d0e4","avatarUrl":"/avatars/2797e96d93b999a3e5f816935eb43673.svg","isPro":false,"fullname":"Minyang Tian","user":"mtian8","type":"user","name":"mtian8"},"name":"Minyang Tian","status":"extracted_pending","statusLastChangedAt":"2024-07-22T03:17:16.720Z","hidden":false},{"_id":"669dcf3b7f28c43e09d5497e","user":{"_id":"6009aa9126e23ab5edb47afd","avatarUrl":"/avatars/f8afa9cf648227ad5817323451ede378.svg","isPro":false,"fullname":"Luyu Gao","user":"Luyu","type":"user","name":"Luyu"},"name":"Luyu Gao","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:12:44.059Z","hidden":false},{"_id":"669dcf3b7f28c43e09d5497f","user":{"_id":"660ec5a2509153ca49775a7c","avatarUrl":"/avatars/97570fc245cc8ec7628da9c13bd35b71.svg","isPro":false,"fullname":"Hao Peng","user":"haopeng01","type":"user","name":"haopeng01"},"name":"Shizhuo Dylan Zhang","status":"extracted_pending","statusLastChangedAt":"2024-07-22T03:17:16.720Z","hidden":false},{"_id":"669dcf3b7f28c43e09d54980","name":"Xinan Chen","hidden":false},{"_id":"669dcf3b7f28c43e09d54981","name":"Cunwei Fan","hidden":false},{"_id":"669dcf3b7f28c43e09d54982","name":"Xuefei Guo","hidden":false},{"_id":"669dcf3b7f28c43e09d54983","name":"Roland Haas","hidden":false},{"_id":"669dcf3b7f28c43e09d54984","name":"Pan Ji","hidden":false},{"_id":"669dcf3b7f28c43e09d54985","name":"Kittithat Krongchon","hidden":false},{"_id":"669dcf3b7f28c43e09d54986","name":"Yao Li","hidden":false},{"_id":"669dcf3b7f28c43e09d54987","user":{"_id":"661551375e8f1eaaba4c53b3","avatarUrl":"/avatars/1d41150d06ce4e4726269b9c48cbbc10.svg","isPro":false,"fullname":"LiuShengyang","user":"LSY3579","type":"user","name":"LSY3579"},"name":"Shengyan Liu","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:31:26.403Z","hidden":false},{"_id":"669dcf3b7f28c43e09d54988","name":"Di Luo","hidden":false},{"_id":"669dcf3b7f28c43e09d54989","user":{"_id":"630394e6eedc089484c367e5","avatarUrl":"/avatars/26560adc1466cad5b5646d1a2aea3c76.svg","isPro":false,"fullname":"MA YUTAO","user":"mytkkb","type":"user","name":"mytkkb"},"name":"Yutao Ma","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:30:46.216Z","hidden":false},{"_id":"669dcf3b7f28c43e09d5498a","name":"Hao Tong","hidden":false},{"_id":"669dcf3b7f28c43e09d5498b","name":"Kha Trinh","hidden":false},{"_id":"669dcf3b7f28c43e09d5498c","user":{"_id":"624fa0a20f724e866aa833c6","avatarUrl":"/avatars/be97e25a08b9a69200d8c7cc9a756410.svg","isPro":false,"fullname":"Chenyu Tian","user":"CYBruce","type":"user","name":"CYBruce"},"name":"Chenyu Tian","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:13:53.923Z","hidden":false},{"_id":"669dcf3b7f28c43e09d5498d","name":"Zihan Wang","hidden":false},{"_id":"669dcf3b7f28c43e09d5498e","user":{"_id":"6717b1a510c78be6e4335dd4","avatarUrl":"/avatars/368e4af45151d2756726f45ec9cb0b64.svg","isPro":false,"fullname":"Bohao Wu","user":"nlogn-27","type":"user","name":"nlogn-27"},"name":"Bohao Wu","status":"claimed_verified","statusLastChangedAt":"2024-11-22T16:30:46.015Z","hidden":false},{"_id":"669dcf3b7f28c43e09d5498f","user":{"_id":"645862428eef89b5c3c25ba1","avatarUrl":"/avatars/b46887a16d17c6e552d26a5a140e81e0.svg","isPro":false,"fullname":"Yanyu Xiong","user":"yxiong5","type":"user","name":"yxiong5"},"name":"Yanyu Xiong","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:28:56.221Z","hidden":false},{"_id":"669dcf3b7f28c43e09d54990","user":{"_id":"65306f8b2168c2bddd37930d","avatarUrl":"/avatars/3c476272977cc7d6241dc1d6d63bd377.svg","isPro":false,"fullname":"Shengzhu Yin","user":"shengzhu","type":"user","name":"shengzhu"},"name":"Shengzhu Yin","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:28:47.804Z","hidden":false},{"_id":"669dcf3b7f28c43e09d54991","name":"Minhui Zhu","hidden":false},{"_id":"669dcf3b7f28c43e09d54992","name":"Kilian Lieret","hidden":false},{"_id":"669dcf3b7f28c43e09d54993","user":{"_id":"6610c90c6c59fff43622eef7","avatarUrl":"/avatars/f832a3918101aa5f0834f1456b154c37.svg","isPro":false,"fullname":"Yanxin Lu","user":"amber1120","type":"user","name":"amber1120"},"name":"Yanxin Lu","status":"claimed_verified","statusLastChangedAt":"2024-07-22T07:08:39.863Z","hidden":false},{"_id":"669dcf3b7f28c43e09d54994","user":{"_id":"64881deb8e004bb92b0f4845","avatarUrl":"/avatars/30a1e016d469bf7eb42c713351a9f65c.svg","isPro":false,"fullname":"Genglin Liu","user":"genglinliu","type":"user","name":"genglinliu"},"name":"Genglin Liu","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:16:25.059Z","hidden":false},{"_id":"669dcf3b7f28c43e09d54995","user":{"_id":"647e94f7770c299e56fc996f","avatarUrl":"/avatars/6b53e9ece40e1ebd4a5297b47ebd8b91.svg","isPro":false,"fullname":"Yufeng Du","user":"yufeng16","type":"user","name":"yufeng16"},"name":"Yufeng Du","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:16:33.054Z","hidden":false},{"_id":"669dcf3b7f28c43e09d54996","user":{"_id":"61ecb698382b3b92fea7305f","avatarUrl":"/avatars/b1bcf0d9ade12172810cb65dc9c4e4d8.svg","isPro":false,"fullname":"Tianhua Tao","user":"Tianhua","type":"user","name":"Tianhua"},"name":"Tianhua Tao","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:16:40.367Z","hidden":false},{"_id":"669dcf3b7f28c43e09d54997","user":{"_id":"65b7a5657817e067a5ad45d8","avatarUrl":"/avatars/f8792352f16be80bd138ffc911138be1.svg","isPro":false,"fullname":"Ofir Press","user":"ofirpress","type":"user","name":"ofirpress"},"name":"Ofir Press","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:16:47.364Z","hidden":false},{"_id":"669dcf3b7f28c43e09d54998","name":"Jamie Callan","hidden":false},{"_id":"669dcf3b7f28c43e09d54999","user":{"_id":"677eef9d26d2ab07cfbcf6c6","avatarUrl":"https://cdn-avatars.huggingface.co/v1/production/uploads/no-auth/drlFgINAvi8M44TSME5-F.png","isPro":false,"fullname":"Eliu Huerta","user":"elihu13","type":"user","name":"elihu13"},"name":"Eliu Huerta","status":"extracted_pending","statusLastChangedAt":"2025-01-08T21:36:43.745Z","hidden":false},{"_id":"669dcf3b7f28c43e09d5499a","user":{"_id":"660ec5a2509153ca49775a7c","avatarUrl":"/avatars/97570fc245cc8ec7628da9c13bd35b71.svg","isPro":false,"fullname":"Hao Peng","user":"haopeng01","type":"user","name":"haopeng01"},"name":"Hao Peng","status":"admin_assigned","statusLastChangedAt":"2024-07-22T10:18:14.706Z","hidden":false}],"publishedAt":"2024-07-18T05:15:24.000Z","submittedOnDailyAt":"2024-07-22T00:00:00.000Z","title":"SciCode: A Research Coding Benchmark Curated by Scientists","submittedOnDailyBy":{"_id":"6610c90c6c59fff43622eef7","avatarUrl":"/avatars/f832a3918101aa5f0834f1456b154c37.svg","isPro":false,"fullname":"Yanxin Lu","user":"amber1120","type":"user","name":"amber1120"},"summary":"Since language models (LMs) now outperform average humans on many challenging\ntasks, it has become increasingly difficult to develop challenging,\nhigh-quality, and realistic evaluations. We address this issue by examining\nLMs' capabilities to generate code for solving real scientific research\nproblems. Incorporating input from scientists and AI researchers in 16 diverse\nnatural science sub-fields, including mathematics, physics, chemistry, biology,\nand materials science, we created a scientist-curated coding benchmark,\nSciCode. The problems in SciCode naturally factorize into multiple subproblems,\neach involving knowledge recall, reasoning, and code synthesis. In total,\nSciCode contains 338 subproblems decomposed from 80 challenging main problems.\nIt offers optional descriptions specifying useful scientific background\ninformation and scientist-annotated gold-standard solutions and test cases for\nevaluation. Claude3.5-Sonnet, the best-performing model among those tested, can\nsolve only 4.6% of the problems in the most realistic setting. We believe that\nSciCode demonstrates both contemporary LMs' progress towards becoming helpful\nscientific assistants and sheds light on the development and evaluation of\nscientific AI in the future.","upvotes":17,"discussionId":"669dcf3c7f28c43e09d549ca","ai_summary":"SciCode, a scientist-curated coding benchmark, evaluates language models' ability to solve scientific research problems across various fields, highlighting current capabilities and future challenges in AI-assisted science.","ai_keywords":["language models","coding benchmark","knowledge recall","reasoning","code synthesis","scientific AI"],"ai_summary_model":"Qwen/Qwen2.5-Coder-32B-Instruct"},"canReadDatabase":false,"canManagePapers":false,"canSubmit":false,"hasHfLevelAccess":false,"upvoted":false,"upvoters":[{"_id":"6610c90c6c59fff43622eef7","avatarUrl":"/avatars/f832a3918101aa5f0834f1456b154c37.svg","isPro":false,"fullname":"Yanxin Lu","user":"amber1120","type":"user"},{"_id":"669e16ac6582d2ef7072060c","avatarUrl":"/avatars/b9acbd53a75e67b2d97da2f0c94b112e.svg","isPro":false,"fullname":"Xiaotong Cui","user":"SuperDoglikecoding","type":"user"},{"_id":"644e1b1d9b4e87c31bab0a14","avatarUrl":"/avatars/88bb4c4a67dc8958069e9014f5e73a0b.svg","isPro":false,"fullname":"Michael Barry","user":"MichaelBarryUK","type":"user"},{"_id":"662dd19f9e6d371ab71b91ce","avatarUrl":"https://cdn-avatars.huggingface.co/v1/production/uploads/662dd19f9e6d371ab71b91ce/mZBPw_Zs8ZlEFGlbekAoH.jpeg","isPro":false,"fullname":"Yezhaohui Wang","user":"HaruTeru","type":"user"},{"_id":"6039478ab3ecf716b1a5fd4d","avatarUrl":"https://cdn-avatars.huggingface.co/v1/production/uploads/6039478ab3ecf716b1a5fd4d/_Thy4E7taiSYBLKxEKJbT.jpeg","isPro":true,"fullname":"taesiri","user":"taesiri","type":"user"},{"_id":"6448e1fbe988635a3d6aa97d","avatarUrl":"https://cdn-avatars.huggingface.co/v1/production/uploads/noauth/eG4R9-3hgrimttP7ep3dN.jpeg","isPro":false,"fullname":"Shawn/Yuxuan Tong","user":"tongyx361","type":"user"},{"_id":"655ac762cb17ec19ef82719b","avatarUrl":"https://cdn-avatars.huggingface.co/v1/production/uploads/655ac762cb17ec19ef82719b/1kDncYrGLYS_2SR8cNdAL.png","isPro":false,"fullname":"Jay","user":"matlok","type":"user"},{"_id":"64881deb8e004bb92b0f4845","avatarUrl":"/avatars/30a1e016d469bf7eb42c713351a9f65c.svg","isPro":false,"fullname":"Genglin Liu","user":"genglinliu","type":"user"},{"_id":"66897660e1bb46446f255db2","avatarUrl":"/avatars/51c517843f29bfd50e99e21547511a07.svg","isPro":false,"fullname":"Charlie Waters","user":"charliewaters","type":"user"},{"_id":"6689857212de1f2acc920945","avatarUrl":"/avatars/d451966e6ad81a0cf9b838ae3d3aef33.svg","isPro":false,"fullname":"Chet Down","user":"ChetDown","type":"user"},{"_id":"66898509377ee64785add814","avatarUrl":"/avatars/b7d9563c0dada2ffb3d1cc300753e004.svg","isPro":false,"fullname":"John Leon","user":"1john","type":"user"},{"_id":"64ead5f1213a0415bd22d0e4","avatarUrl":"/avatars/2797e96d93b999a3e5f816935eb43673.svg","isPro":false,"fullname":"Minyang Tian","user":"mtian8","type":"user"}],"acceptLanguages":["*"],"dailyPaperRank":0,"markdownContentUrl":"https://huggingface.co/buckets/huggingchat/papers-content/resolve/2407/2407.13168.md","query":{}}"> Papers arxiv:2407.13168
Copy markdown
SciCode: A Research Coding Benchmark Curated by Scientists
Published on Jul 18, 2024
· Submitted by
Yanxin Lu on Jul 22, 2024
Upvote 17
+9
Authors: Minyang Tian ,
Luyu Gao ,
Shizhuo Dylan Zhang ,
Xinan Chen ,
Cunwei Fan ,
Xuefei Guo ,
Roland Haas ,
Pan Ji ,
Kittithat Krongchon ,
Yao Li ,
Shengyan Liu ,
Di Luo ,
Yutao Ma ,
Hao Tong ,
Kha Trinh ,
Chenyu Tian ,
Zihan Wang ,
Bohao Wu ,
Yanyu Xiong ,
Shengzhu Yin ,
Minhui Zhu ,
Kilian Lieret
+ 8 authors
Abstract
SciCode, a scientist-curated coding benchmark, evaluates language models' ability to solve scientific research problems across various fields, highlighting current capabilities and future challenges in AI-assisted science.
Generated by Qwen/Qwen2.5-Coder-32B-Instruct
Since language models (LMs) now outperform average humans on many challenging
tasks, it has become increasingly difficult to develop challenging,
high-quality, and realistic evaluations. We address this issue by examining
LMs' capabilities to generate code for solving real scientific research
problems. Incorporating input from scientists and AI researchers in 16 diverse
natural science sub-fields, including mathematics, physics, chemistry, biology,
and materials science, we created a scientist-curated coding benchmark ,
SciCode. The problems in SciCode naturally factorize into multiple subproblems,
each involving knowledge recall , reasoning , and code synthesis . In total,
SciCode contains 338 subproblems decomposed from 80 challenging main problems.
It offers optional descriptions specifying useful scientific background
information and scientist-annotated gold-standard solutions and test cases for
evaluation. Claude3.5-Sonnet, the best-performing model among those tested, can
solve only 4.6% of the problems in the most realistic setting. We believe that
SciCode demonstrates both contemporary LMs' progress towards becoming helpful
scientific assistants and sheds light on the development and evaluation of
scientific AI in the future.
View arXiv page View PDF Add to collection
Community
amber1120
Paper author Paper submitter Jul 22, 2024
https://scicode-bench.github.io
See translation
1 reply
·
nielsr
Jul 25, 2024
Hi @ amber1120 congrats on this work!
Are you planning to share the dataset on the hub? Here's a guide: https://huggingface.co/docs/datasets/loading .
The dataset could then be loaded in 2 lines of code, like so:
from datasets import load_dataset
dataset = load_dataset( "your-hf-organization/scicode" )
It could then also be linked to this paper, as explained here: https://huggingface.co/docs/hub/en/datasets-cards#linking-a-paper .
We could also set up a Space using Gradio for the leaderboard.
Let me know if you need any help!
Cheers,
Niels
Open-source @ HF
See translation
👍
1
1
+
librarian-bot
Jul 23, 2024
This is an automated message from the Librarian Bot . I found the following papers similar to this paper.
The following papers were recommended by the Semantic Scholar API
BigCodeBench: Benchmarking Code Generation with Diverse Function Calls and Complex Instructions (2024)
PLUM: Preference Learning Plus Test Cases Yields Better Code Language Models (2024)
CodeRAG-Bench: Can Retrieval Augment Code Generation? (2024)
AICoderEval: Improving AI Domain Code Generation of Large Language Models (2024)
A Survey on Large Language Models for Code Generation (2024)
Please give a thumbs up to this comment if you found it helpful!
If you want recommendations for any Paper on Hugging Face checkout this Space
You can directly ask Librarian Bot for paper recommendations by tagging it in a comment: @librarian-bot recommend
See translation
Reply
Edit Preview
Upload images, audio, and videos by dragging in the text input, pasting, or clicking here .
Tap or paste here to upload images
Comment · Sign up or log in to comment
Upvote 17
+5
Get this paper in your agent:
hf papers read 2407.13168
Don't have the latest CLI? curl -LsSf https://hf.co/cli/install.sh | bash
Models citing this paper 0
No model linking this paper
Cite arxiv.org/abs/2407.13168 in a model README.md to link it from this page.
Datasets citing this paper 5
SciCode1/SciCode
Viewer • Updated Feb 17, 2025 • 80 • 16.9k • 16
shhu2001/SciCode-Verified
Viewer • Updated Aug 7 • 64 • 2.63k • 1
akshathmangudi/SciCode
Viewer • Updated Jan 11 • 1.08k • 853
BubsyGaming/SciCode
Viewer • Updated May 14 • 80 • 85
Browse 5 datasets citing this paper Spaces citing this paper 1
🌈
SaylorTwift/benchmark-holo-deck
Collections including this paper 10
LLMs
Collection
469 items • Updated Mar 29 • 44
Code Generation
Collection
12 items • Updated Aug 1, 2025
Papers - Benchmarks - Coding
Collection
5 items • Updated Jul 23, 2024
LLMs
Collection
12 items • Updated Jan 16
Browse 10 collections that include this paper
System theme
Company
TOS Privacy About Careers Website
Models Datasets Spaces Pricing Docs
