SOURCE-URL: https://snakemake.readthedocs.io/en/stable/
FETCHED: 2026-09-14T17:27:22+08:00
HTTP: 200

<!DOCTYPE html>

<html :class="{ 'dark' : darkMode === true }" data-content_root="./" lang="en" x-data="{ darkMode: $persist(window.matchMedia('(prefers-color-scheme: dark)').matches), activeSection: ''}">
<head>
<script>
    (function () {
      // Set initial color scheme
      if ((localStorage.getItem("_x_darkMode") === "true") || (window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.documentElement.classList.add("dark");
      }

      // Watch for media preference changes
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
        localStorage.setItem("_x_darkMode", event.matches);
        document.documentElement.classList.toggle("dark", event.matches);
      });
    })();
  </script>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<meta charset="utf-8"/>
<meta content="#ffffff" media="(prefers-color-scheme: light)" name="theme-color"/>
<meta content="#030711" media="(prefers-color-scheme: dark)" name="theme-color"/>
<meta content="width=device-width, initial-scale=1" name="viewport"/>
<title>Snakemake | Snakemake 9.27.0 documentation</title>
<meta content="Snakemake | Snakemake 9.27.0 documentation" property="og:title"/>
<meta content="Snakemake | Snakemake 9.27.0 documentation" name="twitter:title"/>
<link href="_static/pygments.css?v=e72c8e07" rel="stylesheet" type="text/css"/>
<link href="_static/theme.css?v=979577e3" rel="stylesheet" type="text/css"/>
<link href="_static/sphinx-argparse.css?v=24ffd50e" rel="stylesheet" type="text/css"/>
<link href="_static/sphinx-design.min.css?v=95c83b7e" rel="stylesheet" type="text/css"/>
<link href="_static/custom.css?v=e046c2ed" rel="stylesheet" type="text/css"/>
<link href="_static/awesome-sphinx-design.css?v=b1d4564d" rel="stylesheet" type="text/css"/>
<link href="_static/logo-snake.svg" rel="icon"/>
<link href="search.html" rel="search" title="Search"/>
<link href="genindex.html" rel="index" title="Index"/>
<link href="getting_started/installation.html" rel="next" title="Installation"/>
<script async type="text/javascript" src="/_/static/javascript/readthedocs-addons.js"></script><meta name="readthedocs-project-slug" content="snakemake" /><meta name="readthedocs-version-slug" content="stable" /><meta name="readthedocs-resolver-filename" content="/" /><meta name="readthedocs-http-status" content="200" /></head>
<body :class="{ 'overflow-hidden': showSidebar }" class="min-h-screen font-sans antialiased bg-background text-foreground" x-data="{ showSidebar: false, showScrollTop: false }">
<div @click.self="showSidebar = false" class="fixed inset-0 z-50 overflow-hidden bg-background/80 backdrop-blur-sm md:hidden" x-cloak="" x-show="showSidebar"></div><div class="relative flex flex-col min-h-screen" id="page"><a class="absolute top-0 left-0 z-[100] block bg-background p-4 text-xl transition -translate-x-full opacity-0 focus:translate-x-0 focus:opacity-100" href="#content">
      Skip to content
    </a><header class="sticky top-0 z-40 w-full border-b shadow-xs border-border bg-background/90 backdrop-blur"><div class="container flex items-center h-14">
<div class="hidden mr-4 md:flex">
<a class="flex items-center mr-6" href="#">
<img alt="Logo" class="mr-2 hidden dark:block" height="24" src="_static/logo-snake.svg" width="24"/>
<img alt="Logo" class="mr-2 dark:hidden" height="24" src="_static/logo-snake.svg" width="24"/><span class="hidden font-bold sm:inline-block text-clip whitespace-nowrap">Snakemake 9.27.0 documentation</span>
</a><nav class="flex items-center gap-6 text-sm font-medium">
<a class="transition-colors hover:text-foreground/80 text-foreground/60" href="https://snakemake.github.io" rel="noopener nofollow">Homepage</a>
<a class="transition-colors hover:text-foreground/80 text-foreground/60" href="https://snakemake.github.io/snakemake-plugin-catalog" rel="noopener nofollow">Plugin catalog</a>
<a class="transition-colors hover:text-foreground/80 text-foreground/60" href="https://snakemake.github.io/snakemake-workflow-catalog" rel="noopener nofollow">Workflow catalog</a>
<a class="transition-colors hover:text-foreground/80 text-foreground/60" href="https://snakemake-wrappers.readthedocs.io" rel="noopener nofollow">Wrappers</a>
<a class="transition-colors hover:text-foreground/80 text-foreground/60" href="https://snakemake-api.readthedocs.io" rel="noopener nofollow">API docs</a>
</nav></div><button @click="showSidebar = true" class="inline-flex items-center justify-center h-10 px-0 py-2 mr-2 text-base font-medium transition-colors rounded-md hover:text-accent-foreground hover:bg-transparent md:hidden" type="button">
<svg aria-hidden="true" fill="currentColor" height="24" viewbox="0 96 960 960" width="24" xmlns="http://www.w3.org/2000/svg">
<path d="M152.587 825.087q-19.152 0-32.326-13.174t-13.174-32.326q0-19.152 13.174-32.326t32.326-13.174h440q19.152 0 32.326 13.174t13.174 32.326q0 19.152-13.174 32.326t-32.326 13.174h-440Zm0-203.587q-19.152 0-32.326-13.174T107.087 576q0-19.152 13.174-32.326t32.326-13.174h320q19.152 0 32.326 13.174T518.087 576q0 19.152-13.174 32.326T472.587 621.5h-320Zm0-203.587q-19.152 0-32.326-13.174t-13.174-32.326q0-19.152 13.174-32.326t32.326-13.174h440q19.152 0 32.326 13.174t13.174 32.326q0 19.152-13.174 32.326t-32.326 13.174h-440ZM708.913 576l112.174 112.174q12.674 12.674 12.674 31.826t-12.674 31.826Q808.413 764.5 789.261 764.5t-31.826-12.674l-144-144Q600 594.391 600 576t13.435-31.826l144-144q12.674-12.674 31.826-12.674t31.826 12.674q12.674 12.674 12.674 31.826t-12.674 31.826L708.913 576Z"></path>
</svg>
<span class="sr-only">Toggle navigation menu</span>
</button>
<div class="flex items-center justify-between flex-1 gap-2 sm:gap-4 md:justify-end">
<div class="flex-1 w-full md:w-auto md:flex-none"><form @keydown.k.window.meta="$refs.search.focus()" action="search.html" class="relative flex items-center group" id="searchbox" method="get">
<input aria-label="Search the docs" class="inline-flex items-center font-medium transition-colors bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background border border-input hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground hover:placeholder-accent-foreground py-2 px-4 relative h-9 w-full justify-start rounded-[0.5rem] text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64" id="search-input" name="q" placeholder="Search ..." type="search" x-ref="search"/>
<kbd class="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none text-muted-foreground items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex group-hover:bg-accent group-hover:text-accent-foreground">
<span class="text-xs">⌘</span>
    K
  </kbd>
</form>
</div>
<nav class="flex items-center gap-1">
<button @click="darkMode = !darkMode" class="relative inline-flex items-center justify-center px-0 text-sm font-medium transition-colors rounded-md hover:bg-accent hover:text-accent-foreground h-9 w-9" title="Toggle color scheme" type="button">
<svg class="absolute transition-all scale-100 rotate-0 dark:-rotate-90 dark:scale-0" fill="currentColor" height="16" viewbox="0 96 960 960" width="16" xmlns="http://www.w3.org/2000/svg">
<path d="M480 685q45.456 0 77.228-31.772Q589 621.456 589 576q0-45.456-31.772-77.228Q525.456 467 480 467q-45.456 0-77.228 31.772Q371 530.544 371 576q0 45.456 31.772 77.228Q434.544 685 480 685Zm0 91q-83 0-141.5-58.5T280 576q0-83 58.5-141.5T480 376q83 0 141.5 58.5T680 576q0 83-58.5 141.5T480 776ZM80 621.5q-19.152 0-32.326-13.174T34.5 576q0-19.152 13.174-32.326T80 530.5h80q19.152 0 32.326 13.174T205.5 576q0 19.152-13.174 32.326T160 621.5H80Zm720 0q-19.152 0-32.326-13.174T754.5 576q0-19.152 13.174-32.326T800 530.5h80q19.152 0 32.326 13.174T925.5 576q0 19.152-13.174 32.326T880 621.5h-80Zm-320-320q-19.152 0-32.326-13.174T434.5 256v-80q0-19.152 13.174-32.326T480 130.5q19.152 0 32.326 13.174T525.5 176v80q0 19.152-13.174 32.326T480 301.5Zm0 720q-19.152 0-32.326-13.17Q434.5 995.152 434.5 976v-80q0-19.152 13.174-32.326T480 850.5q19.152 0 32.326 13.174T525.5 896v80q0 19.152-13.174 32.33-13.174 13.17-32.326 13.17ZM222.174 382.065l-43-42Q165.5 327.391 166 308.239t13.174-33.065q13.435-13.674 32.587-13.674t32.065 13.674l42.239 43q12.674 13.435 12.555 31.706-.12 18.272-12.555 31.946-12.674 13.674-31.445 13.413-18.772-.261-32.446-13.174Zm494 494.761-42.239-43q-12.674-13.435-12.674-32.087t12.674-31.565Q686.609 756.5 705.38 757q18.772.5 32.446 13.174l43 41.761Q794.5 824.609 794 843.761t-13.174 33.065Q767.391 890.5 748.239 890.5t-32.065-13.674Zm-42-494.761Q660.5 369.391 661 350.62q.5-18.772 13.174-32.446l41.761-43Q728.609 261.5 747.761 262t33.065 13.174q13.674 13.435 13.674 32.587t-13.674 32.065l-43 42.239q-13.435 12.674-31.706 12.555-18.272-.12-31.946-12.555Zm-495 494.761Q165.5 863.391 165.5 844.239t13.674-32.065l43-42.239q13.435-12.674 32.087-12.674t31.565 12.674Q299.5 782.609 299 801.38q-.5 18.772-13.174 32.446l-41.761 43Q231.391 890.5 212.239 890t-33.065-13.174ZM480 576Z"></path>
</svg>
<svg class="absolute transition-all scale-0 rotate-90 dark:rotate-0 dark:scale-100" fill="currentColor" height="16" viewbox="0 96 960 960" width="16" xmlns="http://www.w3.org/2000/svg">
<path d="M480 936q-151 0-255.5-104.5T120 576q0-138 90-239.5T440 218q25-3 39 18t-1 44q-17 26-25.5 55t-8.5 61q0 90 63 153t153 63q31 0 61.5-9t54.5-25q21-14 43-1.5t19 39.5q-14 138-117.5 229T480 936Zm0-80q88 0 158-48.5T740 681q-20 5-40 8t-40 3q-123 0-209.5-86.5T364 396q0-20 3-40t8-40q-78 32-126.5 102T200 576q0 116 82 198t198 82Zm-10-270Z"></path>
</svg>
</button>
</nav>
</div>
</div>
</header>
<div class="flex-1"><div class="container md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10"><aside :aria-hidden="!showSidebar" :class="{ 'translate-x-0': showSidebar }" class="fixed inset-y-0 left-0 md:top-14 z-50 md:z-30 bg-background md:bg-transparent transition-all duration-100 -translate-x-full md:translate-x-0 ml-0 p-6 md:p-0 md:-ml-2 md:h-[calc(100vh-3.5rem)] w-5/6 md:w-full overflow-y-auto border-r border-border md:sticky" id="left-sidebar">
<a class="justify-start text-sm md:!hidden bg-background" href="#">
<img alt="Logo" class="mr-2 hidden dark:block" height="16" src="_static/logo-snake.svg" width="16"/>
<img alt="Logo" class="mr-2 dark:hidden" height="16" src="_static/logo-snake.svg" width="16"/><span class="font-bold text-clip whitespace-nowrap">Snakemake 9.27.0 documentation</span>
</a>
<div class="relative overflow-hidden md:overflow-auto my-4 md:my-0">
<div class="overflow-y-auto h-full w-full relative pr-6"><nav class="flex md:hidden flex-col font-medium mt-4">
<a href="https://snakemake.github.io" rel="nofollow noopener">Homepage</a>
<a href="https://snakemake.github.io/snakemake-plugin-catalog" rel="nofollow noopener">Plugin catalog</a>
<a href="https://snakemake.github.io/snakemake-workflow-catalog" rel="nofollow noopener">Workflow catalog</a>
<a href="https://snakemake-wrappers.readthedocs.io" rel="nofollow noopener">Wrappers</a>
<a href="https://snakemake-api.readthedocs.io" rel="nofollow noopener">API docs</a>
</nav><nav class="table w-full min-w-full my-6 lg:my-8">
<p class="caption" role="heading"><span class="caption-text">Getting started</span></p>
<ul>
<li class="toctree-l1"><a class="reference internal" href="getting_started/installation.html">Installation</a></li>
<li class="toctree-l1"><a class="reference internal" href="getting_started/migration.html">Migration between Snakemake versions</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/best_practices.html">Best practices</a></li>
<li class="toctree-l1" x-data="{ expanded: $el.classList.contains('current') ? true : false }"><a :class="{ 'expanded' : expanded }" @click="expanded = !expanded" class="reference internal expandable" href="tutorial/tutorial.html">Tutorial: General use<button @click.prevent.stop="expanded = !expanded" type="button" x-cloak=""><span class="sr-only"></span><svg fill="currentColor" height="18px" stroke="none" viewbox="0 0 24 24" width="18px" xmlns="http://www.w3.org/2000/svg"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path></svg></button></a><ul x-cloak="" x-show="expanded">
<li class="toctree-l2"><a class="reference internal" href="tutorial/setup.html">Setup</a></li>
<li class="toctree-l2"><a class="reference internal" href="tutorial/basics.html">Basics: An example workflow</a></li>
<li class="toctree-l2"><a class="reference internal" href="tutorial/advanced.html">Advanced: Decorating the example workflow</a></li>
<li class="toctree-l2"><a class="reference internal" href="tutorial/additional_features.html">Additional Features</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="tutorial/interaction_visualization_reporting/tutorial.html">Tutorial: Interaction, Visualization, and Reporting</a></li>
</ul>
<p class="caption" role="heading"><span class="caption-text">Executing workflows</span></p>
<ul>
<li class="toctree-l1"><a class="reference internal" href="executing/cli.html">Command line interface</a></li>
<li class="toctree-l1"><a class="reference internal" href="executing/grouping.html">Job Grouping</a></li>
<li class="toctree-l1"><a class="reference internal" href="executing/caching.html">Between workflow caching</a></li>
<li class="toctree-l1"><a class="reference internal" href="executing/executors.html">Using executor plugins</a></li>
<li class="toctree-l1"><a class="reference internal" href="executing/interoperability.html">Interoperability</a></li>
<li class="toctree-l1"><a class="reference internal" href="executing/monitoring.html">Monitoring</a></li>
<li class="toctree-l1"><a class="reference internal" href="executing/provenance.html">Provenance</a></li>
</ul>
<p class="caption" role="heading"><span class="caption-text">Defining workflows</span></p>
<ul>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/writing_snakefiles.html">Writing Workflows</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/rules.html">Snakefiles and Rules</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/configuration.html">Configuration</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/modularization.html">Modularization</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/storage.html">Storage support</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/utils.html">Utils</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/deployment.html">Distribution and Reproducibility</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/reporting.html">Reports</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/testing.html">Automatically generating unit tests</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/foreign_wms.html">Integrating foreign workflow management systems</a></li>
<li class="toctree-l1"><a class="reference internal" href="snakefiles/debugging_workflows.html">Debugging workflows</a></li>
</ul>
<p class="caption" role="heading"><span class="caption-text">Project Info</span></p>
<ul>
<li class="toctree-l1"><a class="reference internal" href="project_info/citations.html">Citing and Citations</a></li>
<li class="toctree-l1"><a class="reference internal" href="project_info/more_resources.html">More Resources</a></li>
<li class="toctree-l1"><a class="reference internal" href="project_info/faq.html">Frequently Asked Questions</a></li>
<li class="toctree-l1"><a class="reference internal" href="project_info/contributing.html">Contributing</a></li>
<li class="toctree-l1"><a class="reference internal" href="project_info/codebase.html">Codebase and architecture</a></li>
<li class="toctree-l1"><a class="reference internal" href="project_info/authors.html">Credits</a></li>
<li class="toctree-l1"><a class="reference internal" href="project_info/history.html">Changelog</a></li>
<li class="toctree-l1"><a class="reference internal" href="project_info/license.html">License</a></li>
</ul>
</nav>
</div>
</div>
<button @click="showSidebar = false" class="absolute md:hidden right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100" type="button">
<svg class="h-4 w-4" fill="currentColor" height="24" stroke="none" viewbox="0 96 960 960" width="24" xmlns="http://www.w3.org/2000/svg">
<path d="M480 632 284 828q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 11 28t-11 28L536 576l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480 632Z"></path>
</svg>
</button>
</aside>
<main class="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_300px]">
<div class="w-full min-w-0 mx-auto">
<div id="content" role="main">
<section id="snakemake">
<span id="manual-main"></span><h1>Snakemake<a @click.prevent="window.navigator.clipboard.writeText($el.href); $el.setAttribute('data-tooltip', 'Copied!'); setTimeout(() =&gt; $el.setAttribute('data-tooltip', 'Copy link to this element'), 2000)" aria-label="Copy link to this element" class="headerlink" data-tooltip="Copy link to this element" href="#snakemake"><svg height="1em" viewbox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path></svg></a></h1>
<a class="reference external image-reference" href="https://gitpod.io/#https://github.com/snakemake/snakemake"><img alt="https://img.shields.io/badge/Gitpod-ready--to--code-blue?color=%23022c22" src="https://img.shields.io/badge/Gitpod-ready--to--code-blue?color=%23022c22"/>
</a>
<a class="reference external image-reference" href="https://bioconda.github.io/recipes/snakemake/README.html"><img alt="https://img.shields.io/conda/dn/bioconda/snakemake.svg?label=Bioconda&amp;color=%23064e3b" src="https://img.shields.io/conda/dn/bioconda/snakemake.svg?label=Bioconda&amp;color=%23064e3b"/>
</a>
<a class="reference external image-reference" href="https://www.python.org"><img alt="https://img.shields.io/pypi/pyversions/snakemake.svg?color=%23065f46" src="https://img.shields.io/pypi/pyversions/snakemake.svg?color=%23065f46"/>
</a>
<a class="reference external image-reference" href="https://pypi.python.org/pypi/snakemake"><img alt="https://img.shields.io/pypi/v/snakemake.svg?color=%23047857" src="https://img.shields.io/pypi/v/snakemake.svg?color=%23047857"/>
</a>
<a class="reference external image-reference" href="https://hub.docker.com/r/snakemake/snakemake"><img alt="https://img.shields.io/github/actions/workflow/status/snakemake/snakemake/docker-publish.yml?label=docker%20container&amp;branch=main&amp;color=%23059669" src="https://img.shields.io/github/actions/workflow/status/snakemake/snakemake/docker-publish.yml?label=docker%20container&amp;branch=main&amp;color=%23059669"/>
</a>
<a class="reference external image-reference" href="https://github.com/snakemake/snakemake/actions?query=branch%3Amain+workflow%3ACI"><img alt="https://img.shields.io/github/actions/workflow/status/snakemake/snakemake/main.yml?label=tests&amp;color=%2310b981" src="https://img.shields.io/github/actions/workflow/status/snakemake/snakemake/main.yml?label=tests&amp;color=%2310b981"/>
</a>
<a class="reference external image-reference" href="https://stackoverflow.com/questions/tagged/snakemake"><img alt="https://img.shields.io/badge/stack-overflow-orange.svg?color=%2334d399" src="https://img.shields.io/badge/stack-overflow-orange.svg?color=%2334d399"/>
</a>
<a class="reference external image-reference" href="https://discord.gg/NUdMtmr"><img alt="Discord" src="https://img.shields.io/discord/753690260830945390?label=discord%20chat&amp;color=%23a7f3d0"/>
</a>
<a class="reference external image-reference" href="https://bsky.app/profile/johanneskoester.bsky.social"><img alt="Bluesky" src="https://img.shields.io/badge/bluesky-follow-%23d1fae5"/>
</a>
<a class="reference external image-reference" href="https://fosstodon.org/@johanneskoester"><img alt="Mastodon" src="https://img.shields.io/badge/mastodon-follow-%23ecfdf5"/>
</a>
<a class="reference external image-reference" href="https://github.com/snakemake/snakemake/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/snakemake/snakemake?style=social"/>
</a>
<a class="reference external image-reference" href="https://github.com/sponsors/snakemake"><img alt="GitHub Sponsors" src="https://img.shields.io/github/sponsors/snakemake"/>
</a>
<p>The Snakemake workflow management system is a tool to create <strong>reproducible and scalable</strong> data analyses.
Workflows are described via a human readable, Python based language.
They can be seamlessly scaled to server, cluster, grid and cloud environments, without the need to modify the workflow definition.
Snakemake workflows can entail a description of required software, which will be automatically deployed to any execution environment.
Finally, workflow runs can be automatically turned into interactive portable browser based reports, which can be shared with collaborators via email or the cloud and combine results with all used parameters, code, and software.</p>
<p>Snakemake is <strong>highly popular</strong>, with &gt;11 new citations per week (<a class="reference external" href="https://badge.dimensions.ai/details/id/pub.1018944052" rel="nofollow noopener">old<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a> and <a class="reference external" href="https://badge.dimensions.ai/details/id/pub.1137313608" rel="nofollow noopener">new<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a> paper).
It has been mentioned in two Nature technology features (<a class="reference external" href="https://www.nature.com/articles/d41586-019-02619-z" rel="nofollow noopener">here<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a> and <a class="reference external" href="https://www.nature.com/articles/d41586-025-01241-6" rel="nofollow noopener">here<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>) and has more than <a class="reference external" href="https://anaconda.org/bioconda/snakemake" rel="nofollow noopener">1 million downloads on anaconda.org<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>.
For an introduction, please visit <a class="reference external" href="https://snakemake.github.io" rel="nofollow noopener">https://snakemake.github.io<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>.</p>
<section id="getting-started">
<span id="main-getting-started"></span><h2>Getting started<a @click.prevent="window.navigator.clipboard.writeText($el.href); $el.setAttribute('data-tooltip', 'Copied!'); setTimeout(() =&gt; $el.setAttribute('data-tooltip', 'Copy link to this element'), 2000)" aria-label="Copy link to this element" class="headerlink" data-tooltip="Copy link to this element" href="#getting-started" x-intersect.margin.0%.0%.-70%.0%="activeSection = '#getting-started'"><svg height="1em" viewbox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path></svg></a></h2>
<ul class="simple">
<li><p>To get a first impression, please visit <a class="reference external" href="https://snakemake.github.io" rel="nofollow noopener">https://snakemake.github.io<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>.</p></li>
<li><p>To properly understand what Snakemake can do for you please read our <a class="reference external" href="https://doi.org/10.12688/f1000research.29032.1" rel="nofollow noopener">“rolling” paper<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>.</p></li>
<li><p>News about Snakemake are published via <a class="reference external" href="https://bsky.app/profile/johanneskoester.bsky.social" rel="nofollow noopener">Bluesky<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a> and <a class="reference external" href="https://fosstodon.org/@johanneskoester" rel="nofollow noopener">Mastodon<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>.</p></li>
<li><p>To learn Snakemake, please do the <a class="reference internal" href="tutorial/tutorial.html#tutorial"><span class="std std-ref">Tutorial: General use</span></a>, and see the <a class="reference internal" href="project_info/faq.html#project-info-faq"><span class="std std-ref">FAQ</span></a>.</p></li>
<li><p><strong>Best practices</strong> for writing Snakemake workflows can be found <a class="reference internal" href="snakefiles/best_practices.html#snakefiles-best-practices"><span class="std std-ref">here</span></a>.</p></li>
</ul>
</section>
<section id="support">
<span id="main-support"></span><h2>Support<a @click.prevent="window.navigator.clipboard.writeText($el.href); $el.setAttribute('data-tooltip', 'Copied!'); setTimeout(() =&gt; $el.setAttribute('data-tooltip', 'Copy link to this element'), 2000)" aria-label="Copy link to this element" class="headerlink" data-tooltip="Copy link to this element" href="#support" x-intersect.margin.0%.0%.-70%.0%="activeSection = '#support'"><svg height="1em" viewbox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path></svg></a></h2>
<ul class="simple">
<li><p>If you like, consider sponsoring Snakemake development via <a class="reference external" href="https://github.com/sponsors/snakemake" rel="nofollow noopener">GitHub Sponsors<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>.</p></li>
<li><p>For releases, see <a class="reference internal" href="project_info/history.html#changelog"><span class="std std-ref">Changelog</span></a>.</p></li>
<li><p>Check <a class="reference internal" href="project_info/faq.html#project-info-faq"><span class="std std-ref">frequently asked questions (FAQ)</span></a>.</p></li>
<li><p>In case of <strong>questions</strong>, please post on <a class="reference external" href="https://stackoverflow.com/questions/tagged/snakemake" rel="nofollow noopener">stack overflow<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>.</p></li>
<li><p>To <strong>discuss</strong> with other Snakemake users, use the <a class="reference external" href="https://discord.gg/kHvtG6N" rel="nofollow noopener">discord server<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>. <strong>Please do not post questions there. Use stack overflow for questions.</strong></p></li>
<li><p>For <strong>bugs and feature requests</strong>, please use the <a class="reference external" href="https://github.com/snakemake/snakemake/issues" rel="nofollow noopener">issue tracker<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a>.</p></li>
<li><p>For <strong>contributions</strong>, visit Snakemake on <a class="reference external" href="https://github.com/snakemake/snakemake" rel="nofollow noopener">Github<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a> and read the <a class="reference internal" href="project_info/contributing.html#project-info-contributing"><span class="std std-ref">guidelines</span></a>.</p></li>
<li><p>Check out our <a class="reference external" href="https://github.com/snakemake/snakemake/blob/main/CODE_OF_CONDUCT.md" rel="nofollow noopener">code of conduct<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a> and refer to it for requests or concerns in that direction.</p></li>
</ul>
</section>
<section id="citation">
<h2>Citation<a @click.prevent="window.navigator.clipboard.writeText($el.href); $el.setAttribute('data-tooltip', 'Copied!'); setTimeout(() =&gt; $el.setAttribute('data-tooltip', 'Copy link to this element'), 2000)" aria-label="Copy link to this element" class="headerlink" data-tooltip="Copy link to this element" href="#citation" x-intersect.margin.0%.0%.-70%.0%="activeSection = '#citation'"><svg height="1em" viewbox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path></svg></a></h2>
<p>When using Snakemake, please cite our “rolling” paper</p>
<p><a class="reference external" href="https://doi.org/10.12688/f1000research.29032.1" rel="nofollow noopener">Mölder, F., Jablonski, K.P., Letcher, B., Hall, M.B., Tomkins-Tinch, C.H., Sochat, V., Forster, J., Lee, S., Twardziok, S.O., Kanitz, A., Wilm, A., Holtgrewe, M., Rahmann, S., Nahnsen, S., Köster, J., 2021. Sustainable data analysis with Snakemake. F1000Res 10, 33.<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></p>
<p>This paper will also be regularly updated when Snakemake receives new features.
See <a class="reference internal" href="project_info/citations.html"><span class="doc">Citations</span></a> for more information.</p>
</section>
<section id="maintainers">
<span id="id1"></span><h2>Maintainers<a @click.prevent="window.navigator.clipboard.writeText($el.href); $el.setAttribute('data-tooltip', 'Copied!'); setTimeout(() =&gt; $el.setAttribute('data-tooltip', 'Copy link to this element'), 2000)" aria-label="Copy link to this element" class="headerlink" data-tooltip="Copy link to this element" href="#maintainers" x-intersect.margin.0%.0%.-70%.0%="activeSection = '#maintainers'"><svg height="1em" viewbox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path></svg></a></h2>
<p>The Snakemake maintainers are:</p>
<ul class="simple">
<li><p><a class="reference external" href="https://github.com/johanneskoester" rel="nofollow noopener">Johannes Köster<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a> (lead developer)</p></li>
<li><p><a class="reference external" href="https://github.com/dlaehnemann" rel="nofollow noopener">David Lähnemann<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></p></li>
<li><p><a class="reference external" href="https://github.com/cmeesters" rel="nofollow noopener">Christian Meesters<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></p></li>
<li><p><a class="reference external" href="https://github.com/mbhall88" rel="nofollow noopener">Michael B. Hall<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></p></li>
<li><p><a class="reference external" href="https://github.com/fgvieira" rel="nofollow noopener">Filipe G. Vieira<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></p></li>
<li><p><a class="reference external" href="https://github.com/melund" rel="nofollow noopener">Morten E. Lund<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></p></li>
<li><p><a class="reference external" href="https://github.com/m-jahn" rel="nofollow noopener">Michael Jahn<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></p></li>
<li><p><a class="reference external" href="https://github.com/cademirch" rel="nofollow noopener">Cade Mirchandani<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></p></li>
</ul>
</section>
<section id="resources">
<span id="main-resources"></span><h2>Resources<a @click.prevent="window.navigator.clipboard.writeText($el.href); $el.setAttribute('data-tooltip', 'Copied!'); setTimeout(() =&gt; $el.setAttribute('data-tooltip', 'Copy link to this element'), 2000)" aria-label="Copy link to this element" class="headerlink" data-tooltip="Copy link to this element" href="#resources" x-intersect.margin.0%.0%.-70%.0%="activeSection = '#resources'"><svg height="1em" viewbox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path></svg></a></h2>
<dl class="simple">
<dt><a class="reference external" href="https://snakedeploy.readthedocs.io" rel="nofollow noopener">Snakedeploy<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></dt><dd><p>Snakedeploy is a toolbox for maintenance and deployment/setup tasks around Snakemake and Snakemake workflows.</p>
</dd>
<dt><a class="reference external" href="https://snakemake-wrappers.readthedocs.org" rel="nofollow noopener">Snakemake Wrappers Repository<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></dt><dd><p>The Snakemake Wrapper Repository is a collection of reusable wrappers that allow to quickly use popular tools from Snakemake rules and workflows.</p>
</dd>
<dt><a class="reference external" href="https://snakemake.github.io/snakemake-workflow-catalog" rel="nofollow noopener">Snakemake Workflow Catalog<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></dt><dd><p>An automatically scraped catalog of publicly available Snakemake workflows for any kind of data analysis.</p>
</dd>
<dt><a class="reference external" href="https://github.com/snakemake-workflows/docs" rel="nofollow noopener">Snakemake Workflows Project<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></dt><dd><p>This project provides a collection of high quality modularized and reusable workflows.
The provided code should also serve as a best-practices of how to build production ready workflows with Snakemake.
Everybody is invited to contribute.</p>
</dd>
<dt><a class="reference external" href="https://github.com/snakemake/snakemake-cluster-profiles" rel="nofollow noopener">Snakemake Cluster Profiles Project<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></dt><dd><p>This project provides Snakemake configuration profiles for various execution environments.
Please consider contributing your own if it is still missing.</p>
</dd>
<dt><a class="reference external" href="https://snakemake-api.readthedocs.io" rel="nofollow noopener">Snakemake API documentation<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></dt><dd><p>The documentation of the Snakemake API for programmatic access and development on Snakemake.</p>
</dd>
<dt><a class="reference external" href="https://conda-forge.org" rel="nofollow noopener">Conda-Forge<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></dt><dd><p>Conda-Forge is a community driven distribution of Conda packages that can be used from Snakemake for creating completely reproducible workflows by defining the used software versions and providing binaries.</p>
</dd>
<dt><a class="reference external" href="https://bioconda.github.io/" rel="nofollow noopener">Bioconda<svg fill="currentColor" height="1em" stroke="none" viewbox="0 96 960 960" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M188 868q-11-11-11-28t11-28l436-436H400q-17 0-28.5-11.5T360 336q0-17 11.5-28.5T400 296h320q17 0 28.5 11.5T760 336v320q0 17-11.5 28.5T720 696q-17 0-28.5-11.5T680 656V432L244 868q-11 11-28 11t-28-11Z"></path></svg></a></dt><dd><p>Bioconda, a partner project of conda-forge, is a community driven distribution of bioinformatics-related Conda packages that can be used from Snakemake for creating completely reproducible workflows by defining the used software versions and providing binaries.</p>
</dd>
</dl>




</section>
</section>
</div><div class="flex justify-between items-center pt-6 mt-12 border-t border-border gap-4">
<div class="ml-auto">
<a class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input hover:bg-accent hover:text-accent-foreground py-2 px-4" href="getting_started/installation.html">
        Installation
        <svg class="ml-2 h-4 w-4" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
<polyline points="9 18 15 12 9 6"></polyline>
</svg>
</a>
</div>
</div></div><aside class="hidden text-sm xl:block" id="right-sidebar">
<div class="sticky top-16 -mt-10 max-h-[calc(100vh-5rem)] h-full overflow-y-auto pt-6 space-y-2"><p class="font-medium">On this page</p>
<ul>
<li><a :data-current="activeSection === '#getting-started'" class="reference internal" href="#getting-started">Getting started</a></li>
<li><a :data-current="activeSection === '#support'" class="reference internal" href="#support">Support</a></li>
<li><a :data-current="activeSection === '#citation'" class="reference internal" href="#citation">Citation</a></li>
<li><a :data-current="activeSection === '#maintainers'" class="reference internal" href="#maintainers">Maintainers</a></li>
<li><a :data-current="activeSection === '#resources'" class="reference internal" href="#resources">Resources</a><ul>
</ul>
</li>
</ul>
<div id="ethical-ad-placement"></div>
</div>
</aside>
</main>
</div>
</div><footer class="py-6 border-t border-border md:py-0">
<div class="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
<div class="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
<p class="text-sm leading-loose text-center text-muted-foreground md:text-left">© 2014-2026, Johannes Koester Built with <a class="font-medium underline underline-offset-4" href="https://www.sphinx-doc.org" rel="noreferrer">Sphinx 9.1.0</a></p>
</div>
</div>
</footer>
</div>
<script src="_static/documentation_options.js?v=8507b56f"></script>
<script src="_static/doctools.js?v=fd6eb6e6"></script>
<script src="_static/sphinx_highlight.js?v=6ffebe34"></script>
<script defer="defer" src="_static/theme.js?v=d6a9845b"></script>
<script src="_static/design-tabs.js?v=f930bc37"></script>
<script src="_static/gurubase-widget.js?v=30476c0c"></script>
</body>
</html>