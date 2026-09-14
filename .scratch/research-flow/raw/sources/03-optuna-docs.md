SOURCE-URL: https://optuna.readthedocs.io/en/stable/
FETCHED: 2026-09-14T17:13:31+08:00
HTTP: 200



<!DOCTYPE html>
<html class="writer-html5" lang="en" data-content_root="./">
<head>
  <meta charset="utf-8" />
  <meta name="readthedocs-addons-api-version" content="1"><meta name="viewport" content="width=device-width, initial-scale=1" />

  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Optuna: A hyperparameter optimization framework &mdash; Optuna 5.0.0 documentation</title>
      <link rel="stylesheet" type="text/css" href="_static/pygments.css?v=03e43079" />
      <link rel="stylesheet" type="text/css" href="_static/css/theme.css?v=9edc463e" />
      <link rel="stylesheet" type="text/css" href="_static/graphviz.css?v=4ae1632d" />
      <link rel="stylesheet" type="text/css" href="_static/copybutton.css?v=76b2166b" />
      <link rel="stylesheet" type="text/css" href="_static/sg_gallery.css?v=fd6457a4" />
      <link rel="stylesheet" type="text/css" href="_static/sg_gallery-binder.css?v=f4aeca0c" />
      <link rel="stylesheet" type="text/css" href="_static/sg_gallery-dataframe.css?v=2082cf3c" />
      <link rel="stylesheet" type="text/css" href="_static/sg_gallery-rendered-html.css?v=1277b6f3" />
      <link rel="stylesheet" type="text/css" href="_static/css/custom.css?v=d0d4e556" />

  
    <link rel="shortcut icon" href="_static/favicon.ico"/>
      <script src="_static/jquery.js?v=5d32c60e"></script>
      <script src="_static/_sphinx_javascript_frameworks_compat.js?v=2cd50e6c"></script>
      <script src="_static/documentation_options.js?v=05a7714e"></script>
      <script src="_static/doctools.js?v=fd6eb6e6"></script>
      <script src="_static/sphinx_highlight.js?v=6ffebe34"></script>
      <script src="_static/clipboard.min.js?v=a7894cd8"></script>
      <script src="_static/copybutton.js?v=a56c686a"></script>
      <script src="_static/sg-tags.js?v=d80f6fa4"></script>
    <script src="_static/js/theme.js"></script>
    <script src="_static/js/versions.js"></script>
    <link rel="index" title="Index" href="genindex.html" />
    <link rel="search" title="Search" href="search.html" />
    <link rel="next" title="Installation" href="installation.html" /> 
<script async type="text/javascript" src="/_/static/javascript/readthedocs-addons.js"></script><meta name="readthedocs-project-slug" content="optuna" /><meta name="readthedocs-version-slug" content="stable" /><meta name="readthedocs-resolver-filename" content="/" /><meta name="readthedocs-http-status" content="200" /></head>

<body class="wy-body-for-nav">
    <div class="navbar">
        <div class="navbar ml-auto">
            <ul class="navbar-nav">
                <li>
                    <a href="https://optuna.org/#key_features" class="header_link">Key Features</a>
                </li>
                <li>
                    <a href="https://optuna.org/#code_examples" class="header_link">Code Examples</a>
                </li>
                <li>
                    <a href="https://optuna.org/#installation" class="header_link">Installation</a>
                </li>
                <li>
                    <a href="https://optuna.org/#dashboard" class="header_link">Dashboard</a>
                </li>
                <li>
                    <a href="https://optuna.org/#hub" class="header_link">OptunaHub</a>
                </li>
                <li>
                    <a href="https://optuna.org/#blog" class="header_link">Blog</a>
                </li>
                <li>
                    <a href="https://optuna.org/#video" class="header_link">Videos</a>
                </li>
                <li>
                    <a href="https://optuna.org/#paper" class="header_link">Paper</a>
                </li>
            </ul>
        </div>
    </div>
     

  <div class="wy-grid-for-nav">
    <nav data-toggle="wy-nav-shift" class="wy-nav-side">
      <div class="wy-side-scroll">
        <div class="wy-side-nav-search" >

          
          
          <a href="#">
            
              <img src="_static/optuna-logo.png" class="logo" alt="Logo"/>
          </a>
<div role="search">
  <form id="rtd-search-form" class="wy-form" action="search.html" method="get">
    <input type="text" name="q" placeholder="Search docs" aria-label="Search docs" />
    <input type="hidden" name="check_keywords" value="yes" />
    <input type="hidden" name="area" value="default" />
  </form>
</div>
        </div><div class="wy-menu wy-menu-vertical" data-spy="affix" role="navigation" aria-label="Navigation menu">
              <p class="caption" role="heading"><span class="caption-text">Contents:</span></p>
<ul>
<li class="toctree-l1"><a class="reference internal" href="installation.html">Installation</a></li>
<li class="toctree-l1"><a class="reference internal" href="tutorial/index.html">Tutorial</a></li>
<li class="toctree-l1"><a class="reference internal" href="reference/index.html">API Reference</a></li>
<li class="toctree-l1"><a class="reference internal" href="faq.html">FAQ</a></li>
</ul>

        </div>
      </div>
    </nav>

    <section data-toggle="wy-nav-shift" class="wy-nav-content-wrap"><nav class="wy-nav-top" aria-label="Mobile navigation menu" >
          <i data-toggle="wy-nav-top" class="fa fa-bars"></i>
          <a href="#">Optuna</a>
      </nav>

      <div class="wy-nav-content">
        <div class="rst-content">
          <!-- This file is necessary to remove "Edit on Github" button from readthedocs by following https://docs.readthedocs.io/en/stable/guides/remove-edit-buttons.html#remove-links-from-top-right-corner --><div role="navigation" aria-label="Page navigation">
  <ul class="wy-breadcrumbs">
      <li><a href="#" class="icon icon-home" aria-label="Home"></a></li>
      <li class="breadcrumb-item active">Optuna: A hyperparameter optimization framework</li>

  </ul>
  <hr/>
</div>
          <div role="main" class="document" itemscope="itemscope" itemtype="http://schema.org/Article">
           <div itemprop="articleBody">
             
  <p><a class="reference internal" href="https://raw.githubusercontent.com/optuna/optuna/master/docs/image/optuna-logo.png"><img alt="OPTUNA" src="https://raw.githubusercontent.com/optuna/optuna/master/docs/image/optuna-logo.png" width="800" /></a></p>
<section id="optuna-a-hyperparameter-optimization-framework">
<h1>Optuna: A hyperparameter optimization framework<a class="headerlink" href="#optuna-a-hyperparameter-optimization-framework" title="Link to this heading"></a></h1>
<p><em>Optuna</em> is an automatic hyperparameter optimization software framework,
particularly designed for machine learning. It features an imperative,
<em>define-by-run</em> style user API. Thanks to our <em>define-by-run</em> API, the
code written with Optuna enjoys high modularity, and the user of Optuna
can dynamically construct the search spaces for the hyperparameters.</p>
<section id="key-features">
<h2>Key Features<a class="headerlink" href="#key-features" title="Link to this heading"></a></h2>
<p>Optuna has modern functionalities as follows:</p>
<ul class="simple">
<li><p><a class="reference internal" href="tutorial/10_key_features/001_first.html"><span class="doc">Lightweight, versatile, and platform agnostic architecture</span></a></p>
<ul>
<li><p>Handle a wide variety of tasks with a simple installation that has few requirements.</p></li>
</ul>
</li>
<li><p><a class="reference internal" href="tutorial/10_key_features/002_configurations.html"><span class="doc">Pythonic search spaces</span></a></p>
<ul>
<li><p>Define search spaces using familiar Python syntax including conditionals and loops.</p></li>
</ul>
</li>
<li><p><a class="reference internal" href="tutorial/10_key_features/003_efficient_optimization_algorithms.html"><span class="doc">Efficient optimization algorithms</span></a></p>
<ul>
<li><p>Adopt state-of-the-art algorithms for sampling hyperparameters and efficiently pruning unpromising trials.</p></li>
</ul>
</li>
<li><p><a class="reference internal" href="tutorial/10_key_features/004_distributed.html"><span class="doc">Easy parallelization</span></a></p>
<ul>
<li><p>Scale studies to tens or hundreds of workers with little or no changes to the code.</p></li>
</ul>
</li>
<li><p><a class="reference internal" href="tutorial/10_key_features/005_visualization.html"><span class="doc">Quick visualization</span></a></p>
<ul>
<li><p>Inspect optimization histories from a variety of plotting functions.</p></li>
</ul>
</li>
</ul>
</section>
<section id="basic-concepts">
<h2>Basic Concepts<a class="headerlink" href="#basic-concepts" title="Link to this heading"></a></h2>
<p>We use the terms <em>study</em> and <em>trial</em> as follows:</p>
<ul class="simple">
<li><p>Study: optimization based on an objective function</p></li>
<li><p>Trial: a single execution of the objective function</p></li>
</ul>
<p>Please refer to sample code below. The goal of a <em>study</em> is to find out
the optimal set of hyperparameter values (e.g., <code class="docutils literal notranslate"><span class="pre">classifier</span></code> and
<code class="docutils literal notranslate"><span class="pre">svm_c</span></code>) through multiple <em>trials</em> (e.g., <code class="docutils literal notranslate"><span class="pre">n_trials=100</span></code>). Optuna is
a framework designed for the automation and the acceleration of the
optimization <em>studies</em>.</p>
<p><a class="reference external" href="http://colab.research.google.com/github/optuna/optuna-examples/blob/main/quickstart.ipynb"><img alt="Open in Colab" src="https://colab.research.google.com/assets/colab-badge.svg" /></a></p>
<div class="highlight-python notranslate"><div class="highlight"><pre><span></span><span class="kn">import</span><span class="w"> </span><span class="nn">...</span>

<span class="c1"># Define an objective function to be minimized.</span>
<span class="k">def</span><span class="w"> </span><span class="nf">objective</span><span class="p">(</span><span class="n">trial</span><span class="p">):</span>

    <span class="c1"># Invoke suggest methods of a Trial object to generate hyperparameters.</span>
    <span class="n">regressor_name</span> <span class="o">=</span> <span class="n">trial</span><span class="o">.</span><span class="n">suggest_categorical</span><span class="p">(</span><span class="s1">'classifier'</span><span class="p">,</span> <span class="p">[</span><span class="s1">'SVR'</span><span class="p">,</span> <span class="s1">'RandomForest'</span><span class="p">])</span>
    <span class="k">if</span> <span class="n">regressor_name</span> <span class="o">==</span> <span class="s1">'SVR'</span><span class="p">:</span>
        <span class="n">svr_c</span> <span class="o">=</span> <span class="n">trial</span><span class="o">.</span><span class="n">suggest_float</span><span class="p">(</span><span class="s1">'svr_c'</span><span class="p">,</span> <span class="mf">1e-10</span><span class="p">,</span> <span class="mf">1e10</span><span class="p">,</span> <span class="n">log</span><span class="o">=</span><span class="kc">True</span><span class="p">)</span>
        <span class="n">regressor_obj</span> <span class="o">=</span> <span class="n">sklearn</span><span class="o">.</span><span class="n">svm</span><span class="o">.</span><span class="n">SVR</span><span class="p">(</span><span class="n">C</span><span class="o">=</span><span class="n">svr_c</span><span class="p">)</span>
    <span class="k">else</span><span class="p">:</span>
        <span class="n">rf_max_depth</span> <span class="o">=</span> <span class="n">trial</span><span class="o">.</span><span class="n">suggest_int</span><span class="p">(</span><span class="s1">'rf_max_depth'</span><span class="p">,</span> <span class="mi">2</span><span class="p">,</span> <span class="mi">32</span><span class="p">)</span>
        <span class="n">regressor_obj</span> <span class="o">=</span> <span class="n">sklearn</span><span class="o">.</span><span class="n">ensemble</span><span class="o">.</span><span class="n">RandomForestRegressor</span><span class="p">(</span><span class="n">max_depth</span><span class="o">=</span><span class="n">rf_max_depth</span><span class="p">)</span>

    <span class="n">X</span><span class="p">,</span> <span class="n">y</span> <span class="o">=</span> <span class="n">sklearn</span><span class="o">.</span><span class="n">datasets</span><span class="o">.</span><span class="n">fetch_california_housing</span><span class="p">(</span><span class="n">return_X_y</span><span class="o">=</span><span class="kc">True</span><span class="p">)</span>
    <span class="n">X_train</span><span class="p">,</span> <span class="n">X_val</span><span class="p">,</span> <span class="n">y_train</span><span class="p">,</span> <span class="n">y_val</span> <span class="o">=</span> <span class="n">sklearn</span><span class="o">.</span><span class="n">model_selection</span><span class="o">.</span><span class="n">train_test_split</span><span class="p">(</span><span class="n">X</span><span class="p">,</span> <span class="n">y</span><span class="p">,</span> <span class="n">random_state</span><span class="o">=</span><span class="mi">0</span><span class="p">)</span>

    <span class="n">regressor_obj</span><span class="o">.</span><span class="n">fit</span><span class="p">(</span><span class="n">X_train</span><span class="p">,</span> <span class="n">y_train</span><span class="p">)</span>
    <span class="n">y_pred</span> <span class="o">=</span> <span class="n">regressor_obj</span><span class="o">.</span><span class="n">predict</span><span class="p">(</span><span class="n">X_val</span><span class="p">)</span>

    <span class="n">error</span> <span class="o">=</span> <span class="n">sklearn</span><span class="o">.</span><span class="n">metrics</span><span class="o">.</span><span class="n">mean_squared_error</span><span class="p">(</span><span class="n">y_val</span><span class="p">,</span> <span class="n">y_pred</span><span class="p">)</span>

    <span class="k">return</span> <span class="n">error</span>  <span class="c1"># An objective value linked with the Trial object.</span>

<span class="n">study</span> <span class="o">=</span> <span class="n">optuna</span><span class="o">.</span><span class="n">create_study</span><span class="p">()</span>  <span class="c1"># Create a new study.</span>
<span class="n">study</span><span class="o">.</span><span class="n">optimize</span><span class="p">(</span><span class="n">objective</span><span class="p">,</span> <span class="n">n_trials</span><span class="o">=</span><span class="mi">100</span><span class="p">)</span>  <span class="c1"># Invoke optimization of the objective function.</span>
</pre></div>
</div>
</section>
<section id="web-dashboard">
<h2>Web Dashboard<a class="headerlink" href="#web-dashboard" title="Link to this heading"></a></h2>
<p><a class="reference external" href="https://github.com/optuna/optuna-dashboard">Optuna Dashboard</a> is a real-time web dashboard for Optuna.
You can check the optimization history, hyperparameter importance, etc. in graphs and tables.
You don’t need to create a Python script to call <a class="reference external" href="https://optuna.readthedocs.io/en/stable/reference/visualization/index.html">Optuna’s visualization</a> functions.
Feature requests and bug reports are welcome!</p>
<img alt="https://user-images.githubusercontent.com/5564044/204975098-95c2cb8c-0fb5-4388-abc4-da32f56cb4e5.gif" src="https://user-images.githubusercontent.com/5564044/204975098-95c2cb8c-0fb5-4388-abc4-da32f56cb4e5.gif" />
<p><code class="docutils literal notranslate"><span class="pre">optuna-dashboard</span></code> can be installed via pip:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>pip<span class="w"> </span>install<span class="w"> </span>optuna-dashboard
</pre></div>
</div>
<div class="admonition tip">
<p class="admonition-title">Tip</p>
<p>Please check out the <a class="reference external" href="https://optuna-dashboard.readthedocs.io/en/stable/getting-started.html">getting started</a> section of Optuna Dashboard’s official documentation.</p>
</div>
</section>
<section id="optunahub">
<h2>OptunaHub<a class="headerlink" href="#optunahub" title="Link to this heading"></a></h2>
<p><a class="reference external" href="https://hub.optuna.org/">OptunaHub</a> is a feature-sharing platform for Optuna.
You can use the registered features and publish your packages.
For more details, please refer to <a class="reference external" href="https://optuna.github.io/optunahub/">the official documentation</a>.</p>
<a class="reference external image-reference" href="https://hub.optuna.org/"><img alt="_images/optunahub-introduction.png" src="_images/optunahub-introduction.png" style="width: 800px;" />
</a>
<p><code class="docutils literal notranslate"><span class="pre">optunahub</span></code> can be installed via pip:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>pip<span class="w"> </span>install<span class="w"> </span>optunahub
</pre></div>
</div>
</section>
<section id="communication">
<h2>Communication<a class="headerlink" href="#communication" title="Link to this heading"></a></h2>
<ul class="simple">
<li><p><a class="reference external" href="https://github.com/optuna/optuna/discussions">GitHub Discussions</a> for questions.</p></li>
<li><p><a class="reference external" href="https://github.com/optuna/optuna/issues">GitHub Issues</a> for bug
reports and feature requests.</p></li>
</ul>
</section>
<section id="contribution">
<h2>Contribution<a class="headerlink" href="#contribution" title="Link to this heading"></a></h2>
<p>Any contributions to Optuna are welcome! When you send a pull request,
please follow the <a class="reference external" href="https://github.com/optuna/optuna/blob/master/CONTRIBUTING.md">contribution guide</a>.</p>
</section>
<section id="license">
<h2>License<a class="headerlink" href="#license" title="Link to this heading"></a></h2>
<p>MIT License (see <a class="reference external" href="https://github.com/optuna/optuna/blob/master/LICENSE">LICENSE</a>).</p>
<p>Optuna uses the codes from SciPy and fdlibm projects (see <a class="reference internal" href="license_thirdparty.html"><span class="doc">Third-party License</span></a>).</p>
</section>
<section id="reference">
<h2>Reference<a class="headerlink" href="#reference" title="Link to this heading"></a></h2>
<p>Takuya Akiba, Shotaro Sano, Toshihiko Yanase, Takeru Ohta, and Masanori
Koyama. 2019. Optuna: A Next-generation Hyperparameter Optimization
Framework. In KDD (<a class="reference external" href="https://arxiv.org/abs/1907.10902">arXiv</a>).</p>
<div class="toctree-wrapper compound">
<p class="caption" role="heading"><span class="caption-text">Contents:</span></p>
<ul>
<li class="toctree-l1"><a class="reference internal" href="installation.html">Installation</a></li>
<li class="toctree-l1"><a class="reference internal" href="tutorial/index.html">Tutorial</a><ul>
<li class="toctree-l2"><a class="reference internal" href="tutorial/index.html#key-features">Key Features</a></li>
<li class="toctree-l2"><a class="reference internal" href="tutorial/index.html#recipes">Recipes</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="reference/index.html">API Reference</a><ul>
<li class="toctree-l2"><a class="reference internal" href="reference/optuna.html">optuna</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/artifacts.html">optuna.artifacts</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/cli.html">optuna.cli</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/distributions.html">optuna.distributions</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/exceptions.html">optuna.exceptions</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/importance.html">optuna.importance</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/integration.html">optuna.integration</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/logging.html">optuna.logging</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/pruners.html">optuna.pruners</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/samplers/index.html">optuna.samplers</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/search_space.html">optuna.search_space</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/storages.html">optuna.storages</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/study.html">optuna.study</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/terminator.html">optuna.terminator</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/trial.html">optuna.trial</a></li>
<li class="toctree-l2"><a class="reference internal" href="reference/visualization/index.html">optuna.visualization</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="faq.html">FAQ</a><ul>
<li class="toctree-l2"><a class="reference internal" href="faq.html#can-i-use-optuna-with-x-where-x-is-your-favorite-ml-library">Can I use Optuna with X? (where X is your favorite ML library)</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-to-define-objective-functions-that-have-own-arguments">How to define objective functions that have own arguments?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#can-i-use-optuna-without-remote-rdb-servers">Can I use Optuna without remote RDB servers?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-save-and-resume-studies">How can I save and resume studies?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-to-suppress-log-messages-of-optuna">How to suppress log messages of Optuna?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-to-save-machine-learning-models-trained-in-objective-functions">How to save machine learning models trained in objective functions?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-obtain-reproducible-optimization-results">How can I obtain reproducible optimization results?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-are-exceptions-from-trials-handled">How are exceptions from trials handled?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-are-nans-returned-by-trials-handled">How are NaNs returned by trials handled?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#what-happens-when-i-dynamically-alter-a-search-space">What happens when I dynamically alter a search space?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-use-two-gpus-for-evaluating-two-trials-simultaneously">How can I use two GPUs for evaluating two trials simultaneously?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-test-my-objective-functions">How can I test my objective functions?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-do-i-avoid-running-out-of-memory-oom-when-optimizing-studies">How do I avoid running out of memory (OOM) when optimizing studies?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-output-a-log-only-when-the-best-value-is-updated">How can I output a log only when the best value is updated?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-do-i-suggest-variables-which-represent-the-proportion-that-is-are-in-accordance-with-dirichlet-distribution">How do I suggest variables which represent the proportion, that is, are in accordance with Dirichlet distribution?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-optimize-a-model-with-some-constraints">How can I optimize a model with some constraints?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-parallelize-optimization">How can I parallelize optimization?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-solve-the-error-that-occurs-when-performing-parallel-optimization-with-sqlite3">How can I solve the error that occurs when performing parallel optimization with SQLite3?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#can-i-monitor-trials-and-make-them-failed-automatically-when-they-are-killed-unexpectedly">Can I monitor trials and make them failed automatically when they are killed unexpectedly?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-deal-with-permutation-as-a-parameter">How can I deal with permutation as a parameter?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-ignore-duplicated-samples">How can I ignore duplicated samples?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-delete-all-the-artifacts-uploaded-to-a-study">How can I delete all the artifacts uploaded to a study?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#can-i-specify-parameter-starting-points-before-optimization">Can I specify parameter starting points before optimization?</a></li>
<li class="toctree-l2"><a class="reference internal" href="faq.html#how-can-i-resolve-case-sensitivity-issues-with-mysql">How can I resolve case sensitivity issues with MySQL?</a></li>
</ul>
</li>
</ul>
</div>
</section>
</section>
<section id="indices-and-tables">
<h1>Indices and tables<a class="headerlink" href="#indices-and-tables" title="Link to this heading"></a></h1>
<ul class="simple">
<li><p><a class="reference internal" href="genindex.html"><span class="std std-ref">Index</span></a></p></li>
<li><p><a class="reference internal" href="py-modindex.html"><span class="std std-ref">Module Index</span></a></p></li>
<li><p><a class="reference internal" href="search.html"><span class="std std-ref">Search Page</span></a></p></li>
</ul>
</section>


           </div>
          </div>
          <footer><div class="rst-footer-buttons" role="navigation" aria-label="Footer">
        <a href="installation.html" class="btn btn-neutral float-right" title="Installation" accesskey="n" rel="next">Next <span class="fa fa-arrow-circle-right" aria-hidden="true"></span></a>
    </div>

  <hr/>

  <div role="contentinfo">
    <p>&#169; Copyright 2018, Optuna Contributors.</p>
  </div>

  Built with <a href="https://www.sphinx-doc.org/">Sphinx</a> using a
    <a href="https://github.com/readthedocs/sphinx_rtd_theme">theme</a>
    provided by <a href="https://readthedocs.org">Read the Docs</a>.
  
    <a href="privacy.html">Privacy Policy</a>.
     


</footer>
        </div>
      </div>
    </section>
  </div>
  <script>
      jQuery(function () {
          SphinxRtdTheme.Navigation.enable(true);
      });
  </script> 

</body>
</html>