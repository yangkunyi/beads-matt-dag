SOURCE-URL: https://optuna.readthedocs.io/en/stable/reference/cli.html
FETCHED: 2026-09-14T17:19:27+08:00
HTTP: 200



<!DOCTYPE html>
<html class="writer-html5" lang="en" data-content_root="../">
<head>
  <meta charset="utf-8" />
  <meta name="readthedocs-addons-api-version" content="1"><meta name="viewport" content="width=device-width, initial-scale=1" />

  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>optuna.cli &mdash; Optuna 5.0.0 documentation</title>
      <link rel="stylesheet" type="text/css" href="../_static/pygments.css?v=03e43079" />
      <link rel="stylesheet" type="text/css" href="../_static/css/theme.css?v=9edc463e" />
      <link rel="stylesheet" type="text/css" href="../_static/graphviz.css?v=4ae1632d" />
      <link rel="stylesheet" type="text/css" href="../_static/copybutton.css?v=76b2166b" />
      <link rel="stylesheet" type="text/css" href="../_static/sg_gallery.css?v=fd6457a4" />
      <link rel="stylesheet" type="text/css" href="../_static/sg_gallery-binder.css?v=f4aeca0c" />
      <link rel="stylesheet" type="text/css" href="../_static/sg_gallery-dataframe.css?v=2082cf3c" />
      <link rel="stylesheet" type="text/css" href="../_static/sg_gallery-rendered-html.css?v=1277b6f3" />
      <link rel="stylesheet" type="text/css" href="../_static/css/custom.css?v=d0d4e556" />

  
    <link rel="shortcut icon" href="../_static/favicon.ico"/>
      <script src="../_static/jquery.js?v=5d32c60e"></script>
      <script src="../_static/_sphinx_javascript_frameworks_compat.js?v=2cd50e6c"></script>
      <script src="../_static/documentation_options.js?v=05a7714e"></script>
      <script src="../_static/doctools.js?v=fd6eb6e6"></script>
      <script src="../_static/sphinx_highlight.js?v=6ffebe34"></script>
      <script src="../_static/clipboard.min.js?v=a7894cd8"></script>
      <script src="../_static/copybutton.js?v=a56c686a"></script>
      <script src="../_static/sg-tags.js?v=d80f6fa4"></script>
    <script src="../_static/js/theme.js"></script>
    <script src="../_static/js/versions.js"></script>
    <link rel="index" title="Index" href="../genindex.html" />
    <link rel="search" title="Search" href="../search.html" />
    <link rel="next" title="optuna.distributions" href="distributions.html" />
    <link rel="prev" title="optuna.artifacts" href="artifacts.html" /> 
<script async type="text/javascript" src="/_/static/javascript/readthedocs-addons.js"></script><meta name="readthedocs-project-slug" content="optuna" /><meta name="readthedocs-version-slug" content="stable" /><meta name="readthedocs-resolver-filename" content="/reference/cli.html" /><meta name="readthedocs-http-status" content="200" /></head>

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

          
          
          <a href="../index.html">
            
              <img src="../_static/optuna-logo.png" class="logo" alt="Logo"/>
          </a>
<div role="search">
  <form id="rtd-search-form" class="wy-form" action="../search.html" method="get">
    <input type="text" name="q" placeholder="Search docs" aria-label="Search docs" />
    <input type="hidden" name="check_keywords" value="yes" />
    <input type="hidden" name="area" value="default" />
  </form>
</div>
        </div><div class="wy-menu wy-menu-vertical" data-spy="affix" role="navigation" aria-label="Navigation menu">
              <p class="caption" role="heading"><span class="caption-text">Contents:</span></p>
<ul class="current">
<li class="toctree-l1"><a class="reference internal" href="../installation.html">Installation</a></li>
<li class="toctree-l1"><a class="reference internal" href="../tutorial/index.html">Tutorial</a></li>
<li class="toctree-l1 current"><a class="reference internal" href="index.html">API Reference</a><ul class="current">
<li class="toctree-l2"><a class="reference internal" href="optuna.html">optuna</a></li>
<li class="toctree-l2"><a class="reference internal" href="artifacts.html">optuna.artifacts</a></li>
<li class="toctree-l2 current"><a class="current reference internal" href="#">optuna.cli</a></li>
<li class="toctree-l2"><a class="reference internal" href="distributions.html">optuna.distributions</a></li>
<li class="toctree-l2"><a class="reference internal" href="exceptions.html">optuna.exceptions</a></li>
<li class="toctree-l2"><a class="reference internal" href="importance.html">optuna.importance</a></li>
<li class="toctree-l2"><a class="reference internal" href="integration.html">optuna.integration</a></li>
<li class="toctree-l2"><a class="reference internal" href="logging.html">optuna.logging</a></li>
<li class="toctree-l2"><a class="reference internal" href="pruners.html">optuna.pruners</a></li>
<li class="toctree-l2"><a class="reference internal" href="samplers/index.html">optuna.samplers</a></li>
<li class="toctree-l2"><a class="reference internal" href="search_space.html">optuna.search_space</a></li>
<li class="toctree-l2"><a class="reference internal" href="storages.html">optuna.storages</a></li>
<li class="toctree-l2"><a class="reference internal" href="study.html">optuna.study</a></li>
<li class="toctree-l2"><a class="reference internal" href="terminator.html">optuna.terminator</a></li>
<li class="toctree-l2"><a class="reference internal" href="trial.html">optuna.trial</a></li>
<li class="toctree-l2"><a class="reference internal" href="visualization/index.html">optuna.visualization</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../faq.html">FAQ</a></li>
</ul>

        </div>
      </div>
    </nav>

    <section data-toggle="wy-nav-shift" class="wy-nav-content-wrap"><nav class="wy-nav-top" aria-label="Mobile navigation menu" >
          <i data-toggle="wy-nav-top" class="fa fa-bars"></i>
          <a href="../index.html">Optuna</a>
      </nav>

      <div class="wy-nav-content">
        <div class="rst-content">
          <!-- This file is necessary to remove "Edit on Github" button from readthedocs by following https://docs.readthedocs.io/en/stable/guides/remove-edit-buttons.html#remove-links-from-top-right-corner --><div role="navigation" aria-label="Page navigation">
  <ul class="wy-breadcrumbs">
      <li><a href="../index.html" class="icon icon-home" aria-label="Home"></a></li>
          <li class="breadcrumb-item"><a href="index.html">API Reference</a></li>
      <li class="breadcrumb-item active">optuna.cli</li>

  </ul>
  <hr/>
</div>
          <div role="main" class="document" itemscope="itemscope" itemtype="http://schema.org/Article">
           <div itemprop="articleBody">
             
  <section id="optuna-cli">
<span id="module-optuna.cli"></span><h1>optuna.cli<a class="headerlink" href="#optuna-cli" title="Link to this heading"></a></h1>
<p>The <a class="reference internal" href="#module-optuna.cli" title="optuna.cli"><code class="xref py py-mod docutils literal notranslate"><span class="pre">cli</span></code></a> module implements Optuna’s command-line functionality.</p>
<p>For detail, please see the result of</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>optuna<span class="w"> </span>--help
</pre></div>
</div>
<div class="admonition seealso">
<p class="admonition-title">See also</p>
<p>The <a class="reference internal" href="../tutorial/20_recipes/004_cli.html#cli"><span class="std std-ref">Command-Line Interface</span></a> tutorial provides use-cases with examples.</p>
</div>
</section>


           </div>
          </div>
          <footer><div class="rst-footer-buttons" role="navigation" aria-label="Footer">
        <a href="artifacts.html" class="btn btn-neutral float-left" title="optuna.artifacts" accesskey="p" rel="prev"><span class="fa fa-arrow-circle-left" aria-hidden="true"></span> Previous</a>
        <a href="distributions.html" class="btn btn-neutral float-right" title="optuna.distributions" accesskey="n" rel="next">Next <span class="fa fa-arrow-circle-right" aria-hidden="true"></span></a>
    </div>

  <hr/>

  <div role="contentinfo">
    <p>&#169; Copyright 2018, Optuna Contributors.</p>
  </div>

  Built with <a href="https://www.sphinx-doc.org/">Sphinx</a> using a
    <a href="https://github.com/readthedocs/sphinx_rtd_theme">theme</a>
    provided by <a href="https://readthedocs.org">Read the Docs</a>.
  
    <a href="../privacy.html">Privacy Policy</a>.
     


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