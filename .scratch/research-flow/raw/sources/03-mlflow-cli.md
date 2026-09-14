SOURCE-URL: https://mlflow.org/docs/latest/cli.html
FETCHED: 2026-09-14T17:14:08+08:00
HTTP: 200



<!DOCTYPE html>
<!-- source: docs/source/cli.rst -->
<!--[if IE 8]><html class="no-js lt-ie9" lang="en" > <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en" > <!--<![endif]-->
<head>
  <meta charset="utf-8">
  
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>Command-Line Interface</title>
  
   
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <link rel="canonical" href="https://mlflow.org/docs/latest/cli.html">
  
  
    <link rel="shortcut icon" href="_static/favicon.ico"/>
  

  

  
    
        <!-- Google Tag Manager -->
        <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer',"GTM-N6WMTTJ");</script>
        <!-- End Google Tag Manager -->
    
  
  
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-16857946923"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'AW-16857946923');
  </script>
  <!-- Eng gtag -->

  

  
  <meta name="docsearch:docusaurus_tag" content="default" data-rh="true">
  <meta name="docusaurus_tag" content="default" data-rh="true">
  <meta name="docusaurus_version" content="current" data-rh="true">
  <meta name="docsearch:version" content="current" data-rh="true">
  <meta name="docusaurus_locale" content="en" data-rh="true">
  <meta name="docsearch:language" content="en" data-rh="true">

  
  
    

  

  
  
    <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600" rel="stylesheet">
    <link rel="stylesheet" href="_static/css/theme.css" type="text/css" />
    <link rel="stylesheet" href="_static/css/custom.css" type="text/css" />
    <link rel="stylesheet" href="_static/css/cards.css" type="text/css" />
    <link rel="stylesheet" href="_static/css/grids.css" type="text/css" />
    <link rel="stylesheet" href="_static/css/mobile.css" type="text/css" />
    <link rel="stylesheet" href="_static/css/simple-cards.css" type="text/css" />
    <link rel="stylesheet" href="_static/css/tabs.css" type="text/css" />
    
  
        <link rel="index" title="Index"
              href="genindex.html"/>
        <link rel="search" title="Search" href="search.html"/>
    <link rel="top" title="MLflow 3.16.0 documentation" href="index.html"/>
        <link rel="next" title="MLflow Authentication Python API" href="/auth/python-api.html"/>
        <link rel="prev" title="TypeScript API" href="/typescript_api/index.html"/> 

  
  <script src="_static/js/modernizr.min.js"></script>

</head>
<script type="text/javascript" src="_static/documentation_options.js"></script>
<script type="text/javascript" src="_static/jquery.js"></script>
<script type="text/javascript" src="_static/underscore.js"></script>
<script type="text/javascript" src="_static/doctools.js"></script>
<script type="text/javascript" src="_static/languagesections.js"></script>
<script type="text/javascript" src="_static/runllm.js"></script>

<body class="wy-body-for-nav" role="document">
  
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-N6WMTTJ"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
  

  
  <nav class="wy-nav-top header" role="navigation" aria-label="top navigation">
    <div class="header-container">
  <style scoped>
    .header-container {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;

      background-color: #fff;
      box-shadow: 0 1px 2px 0 #0000001a;
    }

    .logo-container {
      display: flex;
      gap: 12px;
      flex-direction: row;
      white-space: nowrap;
      align-items: center;
      justify-content: center;
    }

    a:hover {
      text-decoration: none;
      color: #0194e2;
    }
  </style>
  <div class="logo-container">
    <i
      data-toggle="wy-nav-top"
      class="wy-nav-top-menu-button db-icon db-icon-menu pull-left"
    ></i>
    <a href="index.html" class="wy-nav-top-logo">
      <img
        src="_static/MLflow-logo-final-black.png"
        alt="MLflow"
      />
    </a>
    <a
      style="overflow: hidden; text-overflow: ellipsis"
      class="header-link"
      href="/docs/latest"
      >Main Docs</a
    >
    <span style="overflow: hidden; text-overflow: ellipsis" class="header-link"
      >API Documentation</span
    >
  </div>
  <span class="header-link version">3.16.0</span>
</div>
  </nav>
  <page>
    

    <nav data-toggle="wy-nav-shift" class="wy-nav-side relative">
      <div class="wy-side-scroll">
  <div class="wy-side-nav-search">
    

    

    
<div role="search">
  <form id="rtd-search-form" class="wy-form" action="search.html" method="get">
  <input type="text" name="q" placeholder="Search" />
  <input type="hidden" name="check_keywords" value="yes" />
  <input type="hidden" name="area" value="default" />
  </form>
</div>


    
  </div>

  <div class="wy-menu wy-menu-vertical" data-spy="affix" role="navigation" aria-label="main navigation">
    
      <a href="index.html">Home</a>
    

    
      

      
        <ul class="current">
<li class="toctree-l1"><a class="reference internal" href="python_api/index.html">Python API</a></li>
<li class="toctree-l1"><a class="reference internal" href="typescript_api/index.html">TypeScript API</a></li>
<li class="toctree-l1 current"><a class="current reference internal" href="#">Command-Line Interface</a><ul>
<li class="toctree-l2"><a class="reference internal" href="#mlflow">mlflow</a><ul>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-agent">agent</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-agent-setup">setup</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-ai-commands">ai-commands</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-ai-commands-get">get</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-ai-commands-list">list</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-ai-commands-run">run</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-artifacts">artifacts</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-artifacts-download">download</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-artifacts-list">list</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-artifacts-log-artifact">log-artifact</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-artifacts-log-artifacts">log-artifacts</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-assistant">assistant</a></li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-autolog">autolog</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-autolog-claude">claude</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-crypto">crypto</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-crypto-rotate-kek">rotate-kek</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-datasets">datasets</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-datasets-list">list</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-db">db</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-db-migrate-to-default-workspace">migrate-to-default-workspace</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-db-move-resources">move-resources</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-db-upgrade">upgrade</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-demo">demo</a></li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-deployments">deployments</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-create">create</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-create-endpoint">create-endpoint</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-delete">delete</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-delete-endpoint">delete-endpoint</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-explain">explain</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-get">get</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-get-endpoint">get-endpoint</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-help">help</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-list">list</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-list-endpoints">list-endpoints</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-predict">predict</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-run-local">run-local</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-update">update</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-deployments-update-endpoint">update-endpoint</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-doctor">doctor</a></li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-experiments">experiments</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-experiments-create">create</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-experiments-csv">csv</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-experiments-delete">delete</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-experiments-get">get</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-experiments-rename">rename</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-experiments-restore">restore</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-experiments-search">search</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-experiments-update">update</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-gateway">gateway</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-gateway-start">start</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-gc">gc</a></li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-mcp">mcp</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-mcp-run">run</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-migrate-filestore">migrate-filestore</a></li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-models">models</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-models-build-docker">build-docker</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-models-generate-dockerfile">generate-dockerfile</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-models-predict">predict</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-models-prepare-env">prepare-env</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-models-serve">serve</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-models-update-pip-requirements">update-pip-requirements</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-run">run</a></li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-runs">runs</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-runs-create">create</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-runs-delete">delete</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-runs-describe">describe</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-runs-link-traces">link-traces</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-runs-list">list</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-runs-restore">restore</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-sagemaker">sagemaker</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-sagemaker-build-and-push-container">build-and-push-container</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-sagemaker-deploy-transform-job">deploy-transform-job</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-sagemaker-push-model">push-model</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-sagemaker-terminate-transform-job">terminate-transform-job</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-scorers">scorers</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-scorers-list">list</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-scorers-register-llm-judge">register-llm-judge</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-server">server</a></li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-skills">skills</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-skills-list">list</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-skills-view">view</a></li>
</ul>
</li>
<li class="toctree-l3"><a class="reference internal" href="#mlflow-traces">traces</a><ul>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-delete">delete</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-delete-assessment">delete-assessment</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-delete-tag">delete-tag</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-evaluate">evaluate</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-get">get</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-get-assessment">get-assessment</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-log-expectation">log-expectation</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-log-feedback">log-feedback</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-search">search</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-set-tag">set-tag</a></li>
<li class="toctree-l4"><a class="reference internal" href="#mlflow-traces-update-assessment">update-assessment</a></li>
</ul>
</li>
</ul>
</li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="auth/python-api.html">MLflow Authentication Python API</a></li>
<li class="toctree-l1"><a class="reference internal" href="auth/rest-api.html">MLflow Authentication REST API</a></li>
<li class="toctree-l1"><a class="reference internal" href="R-api.html">R API</a></li>
<li class="toctree-l1"><a class="reference internal" href="java_api/index.html">Java API</a></li>
<li class="toctree-l1"><a class="reference internal" href="rest-api.html">REST API</a></li>
</ul>

      
    
  </div>

  <div role="contentinfo">
    

    <p>
      <a id='feedbacklink' href="https://github.com/mlflow/mlflow/blob/master/CONTRIBUTING.md" target="_blank">Contribute</a>
    </p>
  </div>
</div>
    </nav>

    <main class="wy-grid-for-nav">
      <section data-toggle="wy-nav-shift" class="wy-nav-content-wrap">
        <div class="wy-nav-content">
          <div class="rst-content">
            










<div role="navigation" aria-label="breadcrumbs navigation">
  <ul class="wy-breadcrumbs">
    <li><a href="index.html">Documentation</a> <span class="db-icon db-icon-chevron-right"></span></li>
    
    
      <li>Command-Line Interface</li>
    
    
    <!-- <li class="wy-breadcrumbs-aside">
      <a href="https://github.com/mlflow/mlflow/blob/master/docs/source/cli.rst" class="fa fa-github"> Edit on GitHub</a>
    </li> -->
    
  </ul>
</div>
            <div role="main" class="document" itemscope="itemscope" itemtype="http://schema.org/Article">
              <div itemprop="articleBody">
                
  <div class="section" id="command-line-interface">
<span id="cli"></span><h1>Command-Line Interface<a class="headerlink" href="#command-line-interface" title="Permalink to this headline"> </a></h1>
<p>The MLflow command-line interface (CLI) provides a simple interface to various functionality in MLflow. You can use the CLI to run projects, start the tracking UI, create and list experiments, download run artifacts,
serve MLflow Python Function and scikit-learn models, serve MLflow Python Function and scikit-learn models, and serve models on
<a class="reference external" href="https://azure.microsoft.com/en-us/services/machine-learning-service/">Microsoft Azure Machine Learning</a>
and <a class="reference external" href="https://aws.amazon.com/sagemaker/">Amazon SageMaker</a>.</p>
<p>Each individual command has a detailed help screen accessible via <code class="docutils literal notranslate"><span class="pre">mlflow</span> <span class="pre">command_name</span> <span class="pre">--help</span></code>.</p>
<div class="admonition attention">
<p class="admonition-title">Attention</p>
<p>It is advisable to set the <code class="docutils literal notranslate"><span class="pre">MLFLOW_TRACKING_URI</span></code> environment variable by default,
as the CLI does not automatically connect to a tracking server. Without this,
the CLI will default to using the local filesystem where the command is executed,
rather than connecting to a localhost or remote HTTP server.
Setting <code class="docutils literal notranslate"><span class="pre">MLFLOW_TRACKING_URI</span></code> to the URL of your desired tracking server is required for most of the commands below.</p>
</div>
<div class="contents local topic" id="table-of-contents">
<p class="topic-title">Table of Contents</p>
<ul class="simple">
<li><p><a class="reference internal" href="#mlflow" id="id1">mlflow</a></p>
<ul>
<li><p><a class="reference internal" href="#mlflow-agent" id="id2">agent</a></p></li>
<li><p><a class="reference internal" href="#mlflow-ai-commands" id="id3">ai-commands</a></p></li>
<li><p><a class="reference internal" href="#mlflow-artifacts" id="id4">artifacts</a></p></li>
<li><p><a class="reference internal" href="#mlflow-assistant" id="id5">assistant</a></p></li>
<li><p><a class="reference internal" href="#mlflow-autolog" id="id6">autolog</a></p></li>
<li><p><a class="reference internal" href="#mlflow-crypto" id="id7">crypto</a></p></li>
<li><p><a class="reference internal" href="#mlflow-datasets" id="id8">datasets</a></p></li>
<li><p><a class="reference internal" href="#mlflow-db" id="id9">db</a></p></li>
<li><p><a class="reference internal" href="#mlflow-demo" id="id10">demo</a></p></li>
<li><p><a class="reference internal" href="#mlflow-deployments" id="id11">deployments</a></p></li>
<li><p><a class="reference internal" href="#mlflow-doctor" id="id12">doctor</a></p></li>
<li><p><a class="reference internal" href="#mlflow-experiments" id="id13">experiments</a></p></li>
<li><p><a class="reference internal" href="#mlflow-gateway" id="id14">gateway</a></p></li>
<li><p><a class="reference internal" href="#mlflow-gc" id="id15">gc</a></p></li>
<li><p><a class="reference internal" href="#mlflow-mcp" id="id16">mcp</a></p></li>
<li><p><a class="reference internal" href="#mlflow-migrate-filestore" id="id17">migrate-filestore</a></p></li>
<li><p><a class="reference internal" href="#mlflow-models" id="id18">models</a></p></li>
<li><p><a class="reference internal" href="#mlflow-run" id="id19">run</a></p></li>
<li><p><a class="reference internal" href="#mlflow-runs" id="id20">runs</a></p></li>
<li><p><a class="reference internal" href="#mlflow-sagemaker" id="id21">sagemaker</a></p></li>
<li><p><a class="reference internal" href="#mlflow-scorers" id="id22">scorers</a></p></li>
<li><p><a class="reference internal" href="#mlflow-server" id="id23">server</a></p></li>
<li><p><a class="reference internal" href="#mlflow-skills" id="id24">skills</a></p></li>
<li><p><a class="reference internal" href="#mlflow-traces" id="id25">traces</a></p></li>
</ul>
</li>
</ul>
</div>
<div class="section" id="mlflow">
<h2><a class="toc-backref" href="#id1">mlflow</a><a class="headerlink" href="#mlflow" title="Permalink to this headline"> </a></h2>
<p class="rubric">Usage</p>
<div class="highlight-shell notranslate"><div class="highlight"><pre><span></span>mlflow<span class="w"> </span><span class="o">[</span>OPTIONS<span class="o">]</span><span class="w"> </span>COMMAND<span class="w"> </span><span class="o">[</span>ARGS<span class="o">]</span>...
</pre></div>
</div>
<p class="rubric">Options</p>
<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-version">
<span class="sig-name descname"><span class="pre">--version</span></span><span class="sig-prename descclassname"></span><a class="headerlink" href="#cmdoption-mlflow-version" title="Permalink to this definition"> </a></dt>
<dd><p>Show the version and exit.</p>
</dd></dl>

<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-env-file">
<span class="sig-name descname"><span class="pre">--env-file</span></span><span class="sig-prename descclassname"> <span class="pre">&lt;env_file&gt;</span></span><a class="headerlink" href="#cmdoption-mlflow-env-file" title="Permalink to this definition"> </a></dt>
<dd><p>Load environment variables from a dotenv file before executing the command. Variables in the file will be loaded but won’t override existing environment variables.</p>
</dd></dl>

<div class="section" id="mlflow-agent">
<h3><a class="toc-backref" href="#id2">agent</a><a class="headerlink" href="#mlflow-agent" title="Permalink to this headline"> </a></h3>
<p>Coding-agent integrations for MLflow (prototype).</p>
<p class="rubric">Usage</p>
<div class="highlight-shell notranslate"><div class="highlight"><pre><span></span>mlflow<span class="w"> </span>agent<span class="w"> </span><span class="o">[</span>OPTIONS<span class="o">]</span><span class="w"> </span>COMMAND<span class="w"> </span><span class="o">[</span>ARGS<span class="o">]</span>...
</pre></div>
</div>
<div class="section" id="mlflow-agent-setup">
<h4>setup<a class="headerlink" href="#mlflow-agent-setup" title="Permalink to this headline"> </a></h4>
<p>[Experimental] Install MLflow skills and launch a coding agent to instrument this repo.</p>
<p class="rubric">Usage</p>
<div class="highlight-shell notranslate"><div class="highlight"><pre><span></span>mlflow<span class="w"> </span>agent<span class="w"> </span>setup<span class="w"> </span><span class="o">[</span>OPTIONS<span class="o">]</span>
</pre></div>
</div>
<p class="rubric">Options</p>
<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-agent-setup-agent">
<span class="sig-name descname"><span class="pre">--agent</span></span><span class="sig-prename descclassname"> <span class="pre">&lt;agent_name&gt;</span></span><a class="headerlink" href="#cmdoption-mlflow-agent-setup-agent" title="Permalink to this definition"> </a></dt>
<dd><p>Coding agent to set up. If omitted, picks from installed agents.</p>
<dl class="field-list simple">
<dt class="field-odd">Options</dt>
<dd class="field-odd"><p>claude | codex | opencode</p>
</dd>
</dl>
</dd></dl>

<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-agent-setup-print">
<span class="sig-name descname"><span class="pre">--print</span></span><span class="sig-prename descclassname"></span><a class="headerlink" href="#cmdoption-mlflow-agent-setup-print" title="Permalink to this definition"> </a></dt>
<dd><p>Print the composed task prompt to stdout and exit without launching the agent. Useful for passing the prompt into a custom invocation, e.g. <cite>claude –permission-mode auto “$(mlflow agent setup –agent claude –print)”</cite>.</p>
</dd></dl>

</div>
</div>
<div class="section" id="mlflow-ai-commands">
<h3><a class="toc-backref" href="#id3">ai-commands</a><a class="headerlink" href="#mlflow-ai-commands" title="Permalink to this headline"> </a></h3>
<p>Manage MLflow AI commands for LLMs.</p>
<p class="rubric">Usage</p>
<div class="highlight-shell notranslate"><div class="highlight"><pre><span></span>mlflow<span class="w"> </span>ai-commands<span class="w"> </span><span class="o">[</span>OPTIONS<span class="o">]</span><span class="w"> </span>COMMAND<span class="w"> </span><span class="o">[</span>ARGS<span class="o">]</span>...
</pre></div>
</div>
<div class="section" id="mlflow-ai-commands-get">
<h4>get<a class="headerlink" href="#mlflow-ai-commands-get" title="Permalink to this headline"> </a></h4>
<p>Get a specific AI command by key.</p>
<p class="rubric">Usage</p>
<div class="highlight-shell notranslate"><div class="highlight"><pre><span></span>mlflow<span class="w"> </span>ai-commands<span class="w"> </span>get<span class="w"> </span><span class="o">[</span>OPTIONS<span class="o">]</span><span class="w"> </span>KEY
</pre></div>
</div>
<p class="rubric">Arguments</p>
<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-ai-commands-get-arg-KEY">
<span id="cmdoption-mlflow-ai-commands-get-arg-key"></span><span class="sig-name descname"><span class="pre">KEY</span></span><span class="sig-prename descclassname"></span><a class="headerlink" href="#cmdoption-mlflow-ai-commands-get-arg-KEY" title="Permalink to this definition"> </a></dt>
<dd><p>Required argument</p>
</dd></dl>

</div>
<div class="section" id="mlflow-ai-commands-list">
<h4>list<a class="headerlink" href="#mlflow-ai-commands-list" title="Permalink to this headline"> </a></h4>
<p>List all available AI commands.</p>
<p class="rubric">Usage</p>
<div class="highlight-shell notranslate"><div class="highlight"><pre><span></span>mlflow<span class="w"> </span>ai-commands<span class="w"> </span>list<span class="w"> </span><span class="o">[</span>OPTIONS<span class="o">]</span>
</pre></div>
</div>
<p class="rubric">Options</p>
<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-ai-commands-list-namespace">
<span class="sig-name descname"><span class="pre">--namespace</span></span><span class="sig-prename descclassname"> <span class="pre">&lt;namespace&gt;</span></span><a class="headerlink" href="#cmdoption-mlflow-ai-commands-list-namespace" title="Permalink to this definition"> </a></dt>
<dd><p>Filter commands by namespace</p>
</dd></dl>

</div>
<div class="section" id="mlflow-ai-commands-run">
<h4>run<a class="headerlink" href="#mlflow-ai-commands-run" title="Permalink to this headline"> </a></h4>
<p>Get a command formatted for execution by an AI assistant.</p>
<p class="rubric">Usage</p>
<div class="highlight-shell notranslate"><div class="highlight"><pre><span></span>mlflow<span class="w"> </span>ai-commands<span class="w"> </span>run<span class="w"> </span><span class="o">[</span>OPTIONS<span class="o">]</span><span class="w"> </span>KEY
</pre></div>
</div>
<p class="rubric">Arguments</p>
<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-ai-commands-run-arg-KEY">
<span id="cmdoption-mlflow-ai-commands-run-arg-key"></span><span class="sig-name descname"><span class="pre">KEY</span></span><span class="sig-prename descclassname"></span><a class="headerlink" href="#cmdoption-mlflow-ai-commands-run-arg-KEY" title="Permalink to this definition"> </a></dt>
<dd><p>Required argument</p>
</dd></dl>

</div>
</div>
<div class="section" id="mlflow-artifacts">
<h3><a class="toc-backref" href="#id4">artifacts</a><a class="headerlink" href="#mlflow-artifacts" title="Permalink to this headline"> </a></h3>
<p>Upload, list, and download artifacts from an MLflow artifact repository.</p>
<p>To manage artifacts for a run associated with a tracking server, set the MLFLOW_TRACKING_URI
environment variable to the URL of the desired server.</p>
<p class="rubric">Usage</p>
<div class="highlight-shell notranslate"><div class="highlight"><pre><span></span>mlflow<span class="w"> </span>artifacts<span class="w"> </span><span class="o">[</span>OPTIONS<span class="o">]</span><span class="w"> </span>COMMAND<span class="w"> </span><span class="o">[</span>ARGS<span class="o">]</span>...
</pre></div>
</div>
<div class="section" id="mlflow-artifacts-download">
<h4>download<a class="headerlink" href="#mlflow-artifacts-download" title="Permalink to this headline"> </a></h4>
<p>Download an artifact file or directory to a local directory.
The output is the name of the file or directory on the local filesystem.</p>
<p>Either <code class="docutils literal notranslate"><span class="pre">--artifact-uri</span></code> or <code class="docutils literal notranslate"><span class="pre">--run-id</span></code> must be provided.</p>
<p class="rubric">Usage</p>
<div class="highlight-shell notranslate"><div class="highlight"><pre><span></span>mlflow<span class="w"> </span>artifacts<span class="w"> </span>download<span class="w"> </span><span class="o">[</span>OPTIONS<span class="o">]</span>
</pre></div>
</div>
<p class="rubric">Options</p>
<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-artifacts-download-r">
<span id="cmdoption-mlflow-artifacts-download-run-id"></span><span class="sig-name descname"><span class="pre">-r</span></span><span class="sig-prename descclassname"></span><span class="sig-prename descclassname"><span class="pre">,</span> </span><span class="sig-name descname"><span class="pre">--run-id</span></span><span class="sig-prename descclassname"> <span class="pre">&lt;run_id&gt;</span></span><a class="headerlink" href="#cmdoption-mlflow-artifacts-download-r" title="Permalink to this definition"> </a></dt>
<dd><p>Run ID from which to download</p>
</dd></dl>

<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-artifacts-download-a">
<span id="cmdoption-mlflow-artifacts-download-artifact-path"></span><span class="sig-name descname"><span class="pre">-a</span></span><span class="sig-prename descclassname"></span><span class="sig-prename descclassname"><span class="pre">,</span> </span><span class="sig-name descname"><span class="pre">--artifact-path</span></span><span class="sig-prename descclassname"> <span class="pre">&lt;artifact_path&gt;</span></span><a class="headerlink" href="#cmdoption-mlflow-artifacts-download-a" title="Permalink to this definition"> </a></dt>
<dd><p>For use with Run ID: if specified, a path relative to the run’s root directory to download</p>
</dd></dl>

<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-artifacts-download-u">
<span id="cmdoption-mlflow-artifacts-download-artifact-uri"></span><span class="sig-name descname"><span class="pre">-u</span></span><span class="sig-prename descclassname"></span><span class="sig-prename descclassname"><span class="pre">,</span> </span><span class="sig-name descname"><span class="pre">--artifact-uri</span></span><span class="sig-prename descclassname"> <span class="pre">&lt;artifact_uri&gt;</span></span><a class="headerlink" href="#cmdoption-mlflow-artifacts-download-u" title="Permalink to this definition"> </a></dt>
<dd><p>URI pointing to the artifact file or artifacts directory; use as an alternative to specifying –run_id and –artifact-path</p>
</dd></dl>

<dl class="std option">
<dt class="sig sig-object std" id="cmdoption-mlflow-artifacts-download-d">
<span id="cmdoption-mlflow-artifacts-download-dst-path"></span><span class="sig-name descname"><span class="pre">-d</span></span><span class="sig-prename descclassname"></span><span class="sig-prename descclassname"><span class="pre">,</span> </span><span class="sig-name descname"><span class="pre">--dst-path</span></span><span class="sig-prename descclassname"> <span class="pre">&lt;dst_path&gt;</span></span><a class="headerlink" href="#cmdoption-mlflow-artifacts-download-d" title="Permalink to this definition"> </a></dt>
<dd><p>Path of the local filesystem destination directory to which to download the specified artifacts. If the directory does not exist, it is created. If unspecified