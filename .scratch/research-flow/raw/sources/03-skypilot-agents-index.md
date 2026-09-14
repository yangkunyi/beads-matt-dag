SOURCE-URL: https://docs.skypilot.co/en/latest/examples/agents/index.html
FETCHED: 2026-09-14T17:21:45+08:00
HTTP: 200


<!DOCTYPE html>


<html lang="en" data-content_root="" >

  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-92WF3MDCJV"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-92WF3MDCJV');
    </script>
    
    <title>Agents &#8212; SkyPilot Docs</title>
  
  
  
  <script data-cfasync="false">
    document.documentElement.dataset.mode = localStorage.getItem("mode") || "";
    document.documentElement.dataset.theme = localStorage.getItem("theme") || "light";
  </script>
  
  <!-- Loaded before other Sphinx assets -->
  <link href="../../_static/styles/theme.css?digest=5b4479735964841361fd" rel="stylesheet" />
<link href="../../_static/styles/bootstrap.css?digest=5b4479735964841361fd" rel="stylesheet" />
<link href="../../_static/styles/pydata-sphinx-theme.css?digest=5b4479735964841361fd" rel="stylesheet" />

  
  <link href="../../_static/vendor/fontawesome/6.1.2/css/all.min.css?digest=5b4479735964841361fd" rel="stylesheet" />
  <link rel="preload" as="font" type="font/woff2" crossorigin href="../../_static/vendor/fontawesome/6.1.2/webfonts/fa-solid-900.woff2" />
<link rel="preload" as="font" type="font/woff2" crossorigin href="../../_static/vendor/fontawesome/6.1.2/webfonts/fa-brands-400.woff2" />
<link rel="preload" as="font" type="font/woff2" crossorigin href="../../_static/vendor/fontawesome/6.1.2/webfonts/fa-regular-400.woff2" />

    <link rel="stylesheet" type="text/css" href="../../_static/pygments.css?v=a746c00c" />
    <link rel="stylesheet" type="text/css" href="../../_static/copybutton.css?v=76b2166b" />
    <link rel="stylesheet" type="text/css" href="../../_static/togglebutton.css?v=13237357" />
    <link rel="stylesheet" type="text/css" href="../../_static/design-style.1e8bd061cd6da7fc9cf755528e8ffc24.min.css?v=0a3b3ea7" />
    <link rel="stylesheet" type="text/css" href="../../_static/custom.css?v=6fe21540" />
  
  <!-- Pre-loaded scripts that we'll load fully later -->
  <link rel="preload" as="script" href="../../_static/scripts/bootstrap.js?digest=5b4479735964841361fd" />
<link rel="preload" as="script" href="../../_static/scripts/pydata-sphinx-theme.js?digest=5b4479735964841361fd" />
  <script src="../../_static/vendor/fontawesome/6.1.2/js/all.min.js?digest=5b4479735964841361fd"></script>

    <script data-url_root="../../" id="documentation_options" src="../../_static/documentation_options.js?v=2902ade1"></script>
    <script src="../../_static/doctools.js?v=888ff710"></script>
    <script src="../../_static/sphinx_highlight.js?v=4825356b"></script>
    <script src="../../_static/clipboard.min.js?v=a7894cd8"></script>
    <script src="../../_static/copybutton.js?v=a5fa425f"></script>
    <script>let toggleHintShow = 'Click to show';</script>
    <script>let toggleHintHide = 'Click to hide';</script>
    <script>let toggleOpenOnPrint = 'true';</script>
    <script src="../../_static/togglebutton.js?v=4a39c7ea"></script>
    <script>var togglebuttonSelector = '.toggle, .admonition.dropdown';</script>
    <script src="../../_static/design-tabs.js?v=36754332"></script>
    <script>DOCUMENTATION_OPTIONS.pagename = 'examples/agents/index';</script>
    <script src="../../_static/custom.js?v=0ae96a79"></script>
    <link rel="icon" href="../../_static/favicon.ico"/>
    <link rel="index" title="Index" href="../../genindex.html" />
    <link rel="search" title="Search" href="../../search.html" />
    <link rel="next" title="Parallel Autoresearch with SkyPilot" href="autoresearch.html" />
    <link rel="prev" title="Quickstart: PyTorch" href="../../getting-started/tutorial.html" />
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="docsearch:language" content="en"/>
  <script async type="text/javascript" src="/_/static/javascript/readthedocs-addons.js"></script><meta name="readthedocs-project-slug" content="assemble-skypilot" /><meta name="readthedocs-version-slug" content="latest" /><meta name="readthedocs-resolver-filename" content="/examples/agents/index.html" /><meta name="readthedocs-http-status" content="200" /></head>
  
  
  <body data-bs-spy="scroll" data-bs-target=".bd-toc-nav" data-offset="180" data-bs-root-margin="0px 0px -60%" data-default-mode="">

  
  
  <a class="skip-link" href="#main-content">Skip to main content</a>
  
  <div id="pst-scroll-pixel-helper"></div>

  
  <button type="button" class="btn rounded-pill" id="pst-back-to-top">
    <i class="fa-solid fa-arrow-up"></i>
    Back to top
  </button>

  
  <input type="checkbox"
          class="sidebar-toggle"
          name="__primary"
          id="__primary"/>
  <label class="overlay overlay-primary" for="__primary"></label>
  
  <input type="checkbox"
          class="sidebar-toggle"
          name="__secondary"
          id="__secondary"/>
  <label class="overlay overlay-secondary" for="__secondary"></label>
  
  <div class="search-button__wrapper">
    <div class="search-button__overlay"></div>
    <div class="search-button__search-container">
<form class="bd-search d-flex align-items-center"
      action="../../search.html"
      method="get">
  <i class="fa-solid fa-magnifying-glass"></i>
  <input type="search"
         class="form-control"
         name="q"
         id="search-input"
         placeholder="Search the docs ..."
         aria-label="Search the docs ..."
         autocomplete="off"
         autocorrect="off"
         autocapitalize="off"
         spellcheck="false"/>
  <span class="search-button__kbd-shortcut"><kbd class="kbd-shortcut__modifier">Ctrl</kbd>+<kbd>K</kbd></span>
</form></div>
  </div>


  <div class="bd-header-announcement container-fluid bd-header-announcement">
    <div class="bd-header-announcement__content"><a class="sky-announcement" href="https://skypilot.ai/blog/skypilot-the-company"><span class="sky-announcement__pill">New</span><span class="sky-announcement__text">Announcing SkyPilot Platform and our $20M seed</span><span class="sky-announcement__arrow" aria-hidden="true">&rarr;</span></a></div>
  </div>

  
    <nav class="bd-header navbar navbar-expand-lg bd-navbar">
<div class="bd-header__inner bd-page-width">
  <label class="sidebar-toggle primary-toggle" for="__primary">
    <span class="fa-solid fa-bars"></span>
  </label>
  
  
  <div class=" navbar-header-items__start">
    
      <div class="navbar-item">


<a class="navbar-brand logo" href="../../index.html">
    <!-- Official brand logo (Design Assets / Main Logo / Logo-default.svg). Dark/light
         toggling does not work for external SVGs in the navbar, so the logo SVG is
         hardcoded here and the wordmark text color is toggled via --logo-text-color in
         custom.css. The paper-plane icon keeps its brand gradient in both themes. -->
    <svg width="120" height="27" viewBox="0 0 120 27" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M19.9412 25.7475C19.8586 26.0559 19.8173 26.2101 19.7563 26.304C19.5594 26.6072 19.1653 26.7128 18.8432 26.5486C18.7435 26.4978 18.6306 26.385 18.4048 26.1592L11.404 19.1583C11.2528 19.0072 11.1772 18.9316 11.1184 18.8506C10.9335 18.5961 10.8496 18.2821 10.8827 17.9694C10.8932 17.8698 10.921 17.7665 10.9765 17.5601L11.5864 15.2925C11.6051 15.223 11.6145 15.1882 11.6132 15.1631C11.609 15.0817 11.544 15.0168 11.4627 15.0125C11.4375 15.0112 11.4027 15.0206 11.3332 15.0393L9.06561 15.6492C8.85918 15.7047 8.75597 15.7325 8.65636 15.743C8.34359 15.7762 8.02964 15.6922 7.77517 15.5074C7.69412 15.4485 7.61855 15.3729 7.46739 15.2218L0.466549 8.22092C0.240767 7.99514 0.127876 7.88225 0.0770811 7.78256C-0.087064 7.46041 0.018533 7.06631 0.321763 6.86939C0.415599 6.80846 0.569811 6.76714 0.878234 6.68449L25.3823 0.118653C25.6907 0.0360115 25.845 -0.00530918 25.9567 0.000546532C26.3178 0.0194692 26.6062 0.307965 26.6252 0.66903C26.631 0.780763 26.5897 0.934974 26.5071 1.2434L19.9412 25.7475ZM5.49158 8.37365C5.35296 8.41094 5.28364 8.42958 5.24146 8.45702C5.10514 8.5457 5.05774 8.72296 5.13159 8.86785C5.15444 8.91269 5.20519 8.96344 5.3067 9.06494L8.7344 12.4926C8.79108 12.5493 8.81942 12.5777 8.84981 12.5997C8.94524 12.669 9.06297 12.7005 9.18026 12.6881C9.21761 12.6842 9.25632 12.6737 9.33373 12.6529L14.9869 11.1324C15.1259 11.095 15.1954 11.0763 15.2457 11.0789C15.4084 11.0873 15.5384 11.2173 15.5468 11.38C15.5494 11.4303 15.5307 11.4998 15.4933 11.6388L13.9728 17.292C13.952 17.3694 13.9416 17.4081 13.9376 17.4455C13.9252 17.5627 13.9567 17.6805 14.026 17.7759C14.0481 17.8063 14.0764 17.8346 14.1331 17.8913L17.5608 21.319C17.6623 21.4205 17.713 21.4713 17.7579 21.4941C17.9028 21.568 18.08 21.5206 18.1687 21.3843C18.1961 21.3421 18.2148 21.2728 18.2521 21.1341L22.7607 4.37145C22.7981 4.23243 22.8168 4.16292 22.8142 4.11259C22.8058 3.94994 22.6758 3.81997 22.5131 3.81155C22.4628 3.80895 22.3933 3.82764 22.2543 3.86503L5.49158 8.37365Z" fill="#094AD0"/>
    <mask id="skp_navbar_mask" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="27" height="27">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M19.9412 25.7475C19.8586 26.0559 19.8173 26.2101 19.7563 26.304C19.5594 26.6072 19.1653 26.7128 18.8432 26.5486C18.7435 26.4978 18.6306 26.385 18.4048 26.1592L11.404 19.1583C11.2528 19.0072 11.1772 18.9316 11.1184 18.8506C10.9335 18.5961 10.8496 18.2821 10.8827 17.9694C10.8932 17.8698 10.921 17.7665 10.9765 17.5601L11.5864 15.2925C11.6051 15.223 11.6145 15.1882 11.6132 15.1631C11.609 15.0817 11.544 15.0168 11.4627 15.0125C11.4375 15.0112 11.4027 15.0206 11.3332 15.0393L9.06561 15.6492C8.85918 15.7047 8.75597 15.7325 8.65636 15.743C8.34359 15.7762 8.02964 15.6922 7.77517 15.5074C7.69412 15.4485 7.61855 15.3729 7.46739 15.2218L0.466549 8.22092C0.240767 7.99514 0.127876 7.88225 0.0770811 7.78256C-0.087064 7.46041 0.018533 7.06631 0.321763 6.86939C0.415599 6.80846 0.569811 6.76714 0.878234 6.68449L25.3823 0.118653C25.6907 0.0360115 25.845 -0.00530918 25.9567 0.000546532C26.3178 0.0194692 26.6062 0.307965 26.6252 0.66903C26.631 0.780763 26.5897 0.934974 26.5071 1.2434L19.9412 25.7475ZM5.49158 8.37365C5.35296 8.41094 5.28364 8.42958 5.24146 8.45702C5.10514 8.5457 5.05774 8.72296 5.13159 8.86785C5.15444 8.91269 5.20519 8.96344 5.3067 9.06494L8.7344 12.4926C8.79108 12.5493 8.81942 12.5777 8.84981 12.5997C8.94524 12.669 9.06297 12.7005 9.18026 12.6881C9.21761 12.6842 9.25632 12.6737 9.33373 12.6529L14.9869 11.1324C15.1259 11.095 15.1954 11.0763 15.2457 11.0789C15.4084 11.0873 15.5384 11.2173 15.5468 11.38C15.5494 11.4303 15.5307 11.4998 15.4933 11.6388L13.9728 17.292C13.952 17.3694 13.9416 17.4081 13.9376 17.4455C13.9252 17.5627 13.9567 17.6805 14.026 17.7759C14.0481 17.8063 14.0764 17.8346 14.1331 17.8913L17.5608 21.319C17.6623 21.4205 17.713 21.4713 17.7579 21.4941C17.9028 21.568 18.08 21.5206 18.1687 21.3843C18.1961 21.3421 18.2148 21.2728 18.2521 21.1341L22.7607 4.37145C22.7981 4.23243 22.8168 4.16292 22.8142 4.11259C22.8058 3.94994 22.6758 3.81997 22.5131 3.81155C22.4628 3.80895 22.3933 3.82764 22.2543 3.86503L5.49158 8.37365Z" fill="#075BF9"/>
    </mask>
    <g mask="url(#skp_navbar_mask)">
    <circle cx="26.4068" cy="0.230604" r="20.6093" fill="url(#skp_navbar_grad)"/>
    </g>
    <path d="M68.287 23.838C67.5607 25.7874 66.4742 26.6621 64.051 26.6621H62.0265V24.5127H63.7593C65.2829 24.5127 65.4103 24.0379 65.8451 22.8132L65.9908 22.3134L60.7298 8.7791H63.8233L65.8687 14.5658C65.8715 14.5742 66.6749 17.0231 67.1303 18.7173C67.1743 18.8806 67.4198 18.8817 67.465 18.7188C67.9571 16.9451 68.7921 14.5715 68.7941 14.5658L70.8958 8.75016H73.8935L68.287 23.838Z" fill="var(--logo-text-color)"/>
    <path d="M39.6397 3.91699C43.3374 3.917 46.1406 5.5665 46.4073 9.24036H43.3573C43.1393 7.31595 41.7614 6.21625 39.6347 6.21625C37.3385 6.21626 35.912 7.24097 35.912 8.89044C35.912 10.34 37.1454 11.0149 39.175 11.4398L41.06 11.8395C44.5173 12.5893 46.7649 13.5391 46.7649 17.2379C46.7649 20.5369 43.6502 22.6113 39.707 22.6113C35.3327 22.6113 32.7213 20.8119 32.6254 16.7631H35.6753C35.7725 19.2373 37.3198 20.312 39.7119 20.312C42.0566 20.312 43.6514 19.2373 43.6763 17.5378C43.7 15.6384 42.3706 15.1636 40.0745 14.6888L38.1895 14.2888C34.8256 13.5641 32.8721 12.1895 32.8721 9.21536C32.8721 6.01635 35.8622 3.91699 39.6397 3.91699Z" fill="var(--logo-text-color)"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M105.786 8.51614C109.798 8.51616 112.24 11.1154 112.24 15.4891C112.24 19.8627 109.798 22.4869 105.786 22.4869C101.75 22.4869 99.2842 19.8627 99.2841 15.4891C99.2841 11.1154 101.75 8.51614 105.786 8.51614ZM105.786 10.6905C103.443 10.6905 102.184 12.515 102.184 15.4891C102.184 18.4632 103.442 20.3125 105.786 20.3125C108.131 20.3125 109.338 18.4631 109.338 15.4891C109.338 12.515 108.13 10.6905 105.786 10.6905Z" fill="var(--logo-text-color)"/>
    <path d="M51.4422 14.4867C51.4422 14.6347 51.6257 14.7038 51.7242 14.5933C53.6496 12.4332 54.9274 11.0166 56.9181 8.78146H60.3256L54.5349 15.0811C54.4804 15.1404 54.4781 15.2308 54.5294 15.2928L60.3129 22.2825H56.736L51.7297 15.9482C51.635 15.8284 51.4423 15.8952 51.4422 16.0479V22.2825H48.5419V4.43786H51.4422V14.4867Z" fill="var(--logo-text-color)"/>
    <path d="M92.4147 22.2804H89.5142V8.81716H92.4147V22.2804Z" fill="var(--logo-text-color)"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M81.7739 4.3435C85.8591 4.34353 87.9372 6.79276 87.9372 9.94178C87.9372 13.0658 85.8591 15.54 81.7739 15.5401H77.7621V22.2757H74.7408V4.3435H81.7739ZM77.7621 13.0159H81.9197C83.7324 13.0159 84.8922 11.6662 84.8922 9.94178C84.8922 8.19235 83.7349 6.8677 81.9197 6.86766H77.7621V13.0159Z" fill="var(--logo-text-color)"/>
    <path d="M97.5128 22.2738H94.6148V4.3435H97.5128V22.2738Z" fill="var(--logo-text-color)"/>
    <path d="M117.416 8.81464H119.979L119.984 11.014H117.421V18.9031C117.421 19.7028 117.82 20.0777 118.55 20.0777H120V22.2674H117.731C115.58 22.2674 114.54 21.5925 114.54 19.1932V11.014H112.437V8.81464H114.54V6.14989L117.416 5.37943V8.81464Z" fill="var(--logo-text-color)"/>
    <path d="M92.4881 7.0677H89.442V4.3435H92.4881V7.0677Z" fill="var(--logo-text-color)"/>
    <defs>
    <radialGradient id="skp_navbar_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(26.4068 0.230604) rotate(90) scale(20.6093)">
    <stop offset="0.253189" stop-color="#6293F8"/>
    <stop offset="1" stop-color="#6293F8" stop-opacity="0"/>
    </radialGradient>
    </defs>
    </svg>
</a></div>
    
  </div>
  
  <div class=" navbar-header-items">
    
    <div class="me-auto navbar-header-items__center">
      
        <div class="navbar-item">
<nav class="navbar-nav">
  <p class="sidebar-header-items__title"
     role="heading"
     aria-level="1"
     aria-label="Site Navigation">
    Site Navigation
  </p>
  <ul class="bd-navbar-elements navbar-nav">
    
                    <li class="nav-item current active">
                      <a class="nav-link nav-internal" href="../../docs/index.html">
                        Docs
                      </a>
                    </li>
                

                    <li class="nav-item">
                      <a class="nav-link nav-external" href="https://skypilot.ai/case-studies">
                        Case Studies
                      </a>
                    </li>
                

                    <li class="nav-item">
                      <a class="nav-link nav-external" href="https://skypilot.ai/blog">
                        Blog
                      </a>
                    </li>
                
  </ul>
</nav></div>
      
    </div>
    
    
    <div class="navbar-header-items__end">
      
        <div class="navbar-item navbar-persistent--container">
          

 <script>
 document.write(`
   <button class="btn navbar-btn search-button-field search-button__button" title="Search" aria-label="Search" data-bs-placement="bottom" data-bs-toggle="tooltip">
    <i class="fa-solid fa-magnifying-glass"></i>
    <span class="search-button__default-text">Search</span>
    <span class="search-button__kbd-shortcut"><kbd class="kbd-shortcut__modifier">Ctrl</kbd>+<kbd class="kbd-shortcut__modifier">K</kbd></span>
   </button>
 `);
 </script>
        </div>
      
      
        <div class="navbar-item">

<script>
document.write(`
  <button class="btn btn-sm navbar-btn theme-switch-button" title="light/dark" aria-label="light/dark" data-bs-placement="bottom" data-bs-toggle="tooltip">
    <span class="theme-switch nav-link" data-mode="light"><i class="fa-solid fa-sun fa-lg"></i></span>
    <span class="theme-switch nav-link" data-mode="dark"><i class="fa-solid fa-moon fa-lg"></i></span>
    <span class="theme-switch nav-link" data-mode="auto"><i class="fa-solid fa-circle-half-stroke fa-lg"></i></span>
  </button>
`);
</script></div>
      
        <div class="navbar-item"><ul class="navbar-icon-links navbar-nav"
    aria-label="Icon Links">
        <li class="nav-item">
          
          
          
          
          
          
          
          
          <a href="https://slack.skypilot.co/" title="Slack" class="nav-link" rel="noopener" target="_blank" data-bs-toggle="tooltip" data-bs-placement="bottom"><span><i class="fab fa-slack fa-lg" aria-hidden="true"></i></span>
            <span class="sr-only">Slack</span></a>
        </li>
        <li class="nav-item">
          
          
          
          
          
          
          
          
          <a href="https://twitter.com/skypilot_org" title="Twitter" class="nav-link" rel="noopener" target="_blank" data-bs-toggle="tooltip" data-bs-placement="bottom"><span><i class="fab fa-twitter fa-lg" aria-hidden="true"></i></span>
            <span class="sr-only">Twitter</span></a>
        </li>
        <li class="nav-item">
          
          
          
          
          
          
          
          
          <a href="https://github.com/skypilot-org/skypilot/" title="GitHub" class="nav-link" rel="noopener" target="_blank" data-bs-toggle="tooltip" data-bs-placement="bottom"><span><i class="fab fa-github fa-lg" aria-hidden="true"></i></span>
            <span class="sr-only">GitHub</span></a>
        </li>
</ul></div>
      
        <div class="navbar-item">
<a class="sky-cta" href="https://skypilot.ai/" target="_blank" rel="noopener noreferrer">
    <span class="sky-cta__label-full">Try SkyPilot Platform</span>
    <span class="sky-cta__label-short">Try Platform</span>
    <span class="sky-cta__arrow" aria-hidden="true">&rarr;</span>
</a></div>
      
    </div>
    
  </div>
  
  
    <div class="navbar-persistent--mobile">

 <script>
 document.write(`
   <button class="btn navbar-btn search-button-field search-button__button" title="Search" aria-label="Search" data-bs-placement="bottom" data-bs-toggle="tooltip">
    <i class="fa-solid fa-magnifying-glass"></i>
    <span class="search-button__default-text">Search</span>
    <span class="search-button__kbd-shortcut"><kbd class="kbd-shortcut__modifier">Ctrl</kbd>+<kbd class="kbd-shortcut__modifier">K</kbd></span>
   </button>
 `);
 </script>
    </div>
  

  
    <label class="sidebar-toggle secondary-toggle" for="__secondary" tabindex="0">
      <span class="fa-solid fa-outdent"></span>
    </label>
  
</div>

    </nav>
  
  <div class="bd-container">
    <div class="bd-container__inner bd-page-width">
      
      <div class="bd-sidebar-primary bd-sidebar">
        

  
  <div class="sidebar-header-items sidebar-primary__section">
    
    
      <div class="sidebar-header-items__center">
        
          <div class="navbar-item">
<nav class="navbar-nav">
  <p class="sidebar-header-items__title"
     role="heading"
     aria-level="1"
     aria-label="Site Navigation">
    Site Navigation
  </p>
  <ul class="bd-navbar-elements navbar-nav">
    
                    <li class="nav-item current active">
                      <a class="nav-link nav-internal" href="../../docs/index.html">
                        Docs
                      </a>
                    </li>
                

                    <li class="nav-item">
                      <a class="nav-link nav-external" href="https://skypilot.ai/case-studies">
                        Case Studies
                      </a>
                    </li>
                

                    <li class="nav-item">
                      <a class="nav-link nav-external" href="https://skypilot.ai/blog">
                        Blog
                      </a>
                    </li>
                
  </ul>
</nav></div>
        
      </div>
    
    
    
      <div class="sidebar-header-items__end">
        
          <div class="navbar-item">

<script>
document.write(`
  <button class="btn btn-sm navbar-btn theme-switch-button" title="light/dark" aria-label="light/dark" data-bs-placement="bottom" data-bs-toggle="tooltip">
    <span class="theme-switch nav-link" data-mode="light"><i class="fa-solid fa-sun fa-lg"></i></span>
    <span class="theme-switch nav-link" data-mode="dark"><i class="fa-solid fa-moon fa-lg"></i></span>
    <span class="theme-switch nav-link" data-mode="auto"><i class="fa-solid fa-circle-half-stroke fa-lg"></i></span>
  </button>
`);
</script></div>
        
          <div class="navbar-item"><ul class="navbar-icon-links navbar-nav"
    aria-label="Icon Links">
        <li class="nav-item">
          
          
          
          
          
          
          
          
          <a href="https://slack.skypilot.co/" title="Slack" class="nav-link" rel="noopener" target="_blank" data-bs-toggle="tooltip" data-bs-placement="bottom"><span><i class="fab fa-slack fa-lg" aria-hidden="true"></i></span>
            <span class="sr-only">Slack</span></a>
        </li>
        <li class="nav-item">
          
          
          
          
          
          
          
          
          <a href="https://twitter.com/skypilot_org" title="Twitter" class="nav-link" rel="noopener" target="_blank" data-bs-toggle="tooltip" data-bs-placement="bottom"><span><i class="fab fa-twitter fa-lg" aria-hidden="true"></i></span>
            <span class="sr-only">Twitter</span></a>
        </li>
        <li class="nav-item">
          
          
          
          
          
          
          
          
          <a href="https://github.com/skypilot-org/skypilot/" title="GitHub" class="nav-link" rel="noopener" target="_blank" data-bs-toggle="tooltip" data-bs-placement="bottom"><span><i class="fab fa-github fa-lg" aria-hidden="true"></i></span>
            <span class="sr-only">GitHub</span></a>
        </li>
</ul></div>
        
          <div class="navbar-item">
<a class="sky-cta" href="https://skypilot.ai/" target="_blank" rel="noopener noreferrer">
    <span class="sky-cta__label-full">Try SkyPilot Platform</span>
    <span class="sky-cta__label-short">Try Platform</span>
    <span class="sky-cta__arrow" aria-hidden="true">&rarr;</span>
</a></div>
        
      </div>
    
  </div>
  
    <div class="sidebar-primary-items__start sidebar-primary__section">
        <div class="sidebar-primary-item">
<nav class="bd-docs-nav bd-links" aria-label="SkyPilot">
    <!-- <p class="bd-links__title" role="heading" aria-level="1">SkyPilot</p> -->
    <div class="bd-toc-item navbar-nav"><p aria-level="2" class="caption" role="heading"><span class="caption-text">Getting Started</span></p>
<ul class="current nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../../overview.html">Overview</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../getting-started/installation.html">Installation</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../getting-started/quickstart.html">Quickstart</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../getting-started/skill.html">Agent Skills</a></li>
<li class="toctree-l1 current active has-children"><a class="reference internal" href="../index.html">Examples</a><input checked="" class="toctree-checkbox" id="toctree-checkbox-1" name="toctree-checkbox-1" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-1"><i class="fa-solid fa-chevron-down"></i></label><ul class="current">
<li class="toctree-l2"><a class="reference internal" href="../../getting-started/tutorial.html">Quickstart: PyTorch</a></li>
<li class="toctree-l2 current active has-children"><a class="current reference internal" href="#">Agents</a><input checked="" class="toctree-checkbox" id="toctree-checkbox-2" name="toctree-checkbox-2" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-2"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="autoresearch.html">Parallel Autoresearch</a></li>
<li class="toctree-l3"><a class="reference internal" href="autonomous-code-optimization.html">Autonomous Code Optimization</a></li>
<li class="toctree-l3"><a class="reference internal" href="gpu-job-management.html">GPU Job Management for Agents</a></li>
<li class="toctree-l3"><a class="reference internal" href="slime.html">Scale Agentic RL with slime</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../training/index.html">Training</a><input class="toctree-checkbox" id="toctree-checkbox-3" name="toctree-checkbox-3" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-3"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../training/axolotl.html">Axolotl</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/deepspeed.html">DeepSpeed</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/distributed-pytorch.html">Distributed PyTorch</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/distributed-tensorflow.html">Distributed TensorFlow</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/fairseq2.html">Fairseq2</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/cosmos3-finetuning.html">Finetuning Cosmos 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/gpt-oss-finetuning.html">Finetuning GPT-OSS</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/llama-4-finetuning.html">Finetuning Llama 4</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/llama-3_1-finetuning.html">Finetuning Llama 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/llama-2-finetuning.html">Finetuning Llama 2</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/nanochat.html">nanochat</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/nemo.html">NeMo</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/nemorl.html">NeMo RL</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/openrlhf.html">OpenRLHF</a></li>
<li class="toctree-l3"><a class="reference external" href="https://github.com/meta-pytorch/monarch/tree/main/examples/skypilot">PyTorch Monarch</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/ray.html">Ray</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/torchtitan.html">TorchTitan</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/tpu.html">Training on TPUs</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/unsloth.html">Unsloth</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/verl.html">Verl (RLHF)</a></li>
<li class="toctree-l3"><a class="reference internal" href="../training/skyrl.html">SkyRL</a></li>
<li class="toctree-l3"><a class="reference external" href="https://medium.com/google-cloud/streamline-ai-ml-model-development-on-gke-with-skypilot-and-vertex-ai-workbench-453729a8897c">Vertex AI</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../serving/index.html">Serving</a><input class="toctree-checkbox" id="toctree-checkbox-4" name="toctree-checkbox-4" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-4"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../serving/vllm.html">vLLM</a></li>
<li class="toctree-l3"><a class="reference internal" href="../serving/sglang.html">SGLang</a></li>
<li class="toctree-l3"><a class="reference internal" href="../serving/nvidia-dynamo.html">Nvidia Dynamo</a></li>
<li class="toctree-l3"><a class="reference internal" href="../serving/ollama.html">Ollama</a></li>
<li class="toctree-l3"><a class="reference internal" href="../serving/tgi.html">Hugging Face TGI</a></li>
<li class="toctree-l3"><a class="reference internal" href="../serving/lorax.html">LoRAX</a></li>
<li class="toctree-l3"><a class="reference internal" href="../serving/cog.html">Cog</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../models/index.html">Models</a><input class="toctree-checkbox" id="toctree-checkbox-5" name="toctree-checkbox-5" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-5"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../models/gpt-oss.html">OpenAI gpt-oss</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/deepseek-r1.html">DeepSeek-R1</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/deepseek-r1-distilled.html">DeepSeek-R1 Distilled</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/deepseek-janus.html">DeepSeek-Janus</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/gemma3.html">Gemma 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/llama-4.html">Llama 4</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/llama-3_2.html">Llama 3.2</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/llama-3_1.html">Llama 3.1</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/llama-3.html">Llama 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/llama-2.html">Llama 2</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/codellama.html">CodeLlama</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/pixtral.html">Pixtral</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/mixtral.html">Mixtral</a></li>
<li class="toctree-l3"><a class="reference external" href="https://docs.mistral.ai/deployment/self-deployment/skypilot/">Mistral 7B</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/qwen.html">Qwen 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/kimi-k2.html">Kimi K2</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/kimi-k2-thinking.html">Kimi K2 Thinking</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/yi.html">Yi</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/gemma.html">Gemma</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/dbrx.html">DBRX</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/gpt-2.html">GPT-2 via llm.c</a></li>
<li class="toctree-l3"><a class="reference internal" href="../models/vicuna.html">Vicuna</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../applications/index.html">AI Applications</a><input class="toctree-checkbox" id="toctree-checkbox-6" name="toctree-checkbox-6" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-6"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../applications/rag.html">DeepSeek-R1 for RAG</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/deepseek-ocr.html">DeepSeek OCR with Pools</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/batch_inference.html">Large-Scale Batch Inference</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/pools_batch_inference.html">Batch Inference with vLLM</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/vector_database.html">Image Vector Database</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/redisvl-vector-search.html">RedisVL Vector Search</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/sam3-video-segmentation.html">SAM3 Video Segmentation</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/streamlit.html">Streamlit Web Apps</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/tabby.html">Tabby: Coding Assistant</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/localgpt.html">LocalGPT: Chat with PDF</a></li>
<li class="toctree-l3"><a class="reference internal" href="../applications/stable_diffusion.html">Stable Diffusion</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../performance/index.html">AI Performance</a><input class="toctree-checkbox" id="toctree-checkbox-7" name="toctree-checkbox-7" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-7"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../performance/aws_efa.html">AWS EFA</a></li>
<li class="toctree-l3"><a class="reference internal" href="../performance/gcp_gpu_direct_tcpx.html">GCP/GKE GPUDirect</a></li>
<li class="toctree-l3"><a class="reference internal" href="../performance/coreweave_infiniband.html">Coreweave with InfiniBand</a></li>
<li class="toctree-l3"><a class="reference internal" href="../performance/nebius_infiniband.html">Nebius with InfiniBand</a></li>
<li class="toctree-l3"><a class="reference internal" href="../performance/together_infiniband.html">Together AI with InfiniBand</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../orchestrators/index.html">Orchestrators</a><input class="toctree-checkbox" id="toctree-checkbox-8" name="toctree-checkbox-8" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-8"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../orchestrators/airflow.html">Airflow</a></li>
<li class="toctree-l3"><a class="reference internal" href="../orchestrators/cron.html">Cron</a></li>
<li class="toctree-l3"><a class="reference internal" href="../orchestrators/github_actions.html">Github Actions</a></li>
<li class="toctree-l3"><a class="reference internal" href="../orchestrators/prefect.html">Prefect</a></li>
<li class="toctree-l3"><a class="reference internal" href="../orchestrators/temporal.html">Temporal</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../frameworks/index.html">Other Frameworks</a><input class="toctree-checkbox" id="toctree-checkbox-9" name="toctree-checkbox-9" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-9"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference external" href="https://nebius.com/blog/posts/bulk-object-storage-s3-data-migration-with-skypilot">Cross-cloud data transfer</a></li>
<li class="toctree-l3"><a class="reference internal" href="../frameworks/dvc.html">DVC</a></li>

<li class="toctree-l3"><a class="reference internal" href="../frameworks/jupyter.html">Jupyter</a></li>
<li class="toctree-l3"><a class="reference internal" href="../frameworks/marimo.html">marimo</a></li>
<li class="toctree-l3"><a class="reference external" href="https://nebius.com/blog/posts/orchestrating-llm-fine-tuning-k8s-skypilot-mlflow">MLFlow</a></li>
<li class="toctree-l3"><a class="reference internal" href="../frameworks/mpi.html">MPI</a></li>
<li class="toctree-l3"><a class="reference internal" href="../frameworks/spyder.html">Spyder IDE</a></li>
</ul>
</li>
</ul>
</li>

<li class="toctree-l1"><a class="reference internal" href="../../sky-computing.html">Concept: Sky Computing</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../../skypilot-platform.html">SkyPilot Platform</a><input class="toctree-checkbox" id="toctree-checkbox-10" name="toctree-checkbox-10" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-10"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../../sandboxes.html">Sandboxes</a></li>
</ul>
</li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Clusters</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../interactive-development.html">Start a Development Cluster</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/job-queue.html">Cluster Jobs</a></li>
<li class="toctree-l1"><a class="reference internal" href="../auto-failover.html">Provisioning Compute</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/auto-stop.html">Autostop and Autodown</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Jobs</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../managed-jobs.html">Managed Jobs</a></li>
<li class="toctree-l1"><a class="reference internal" href="../checkpointing.html">Checkpointing and Recovery</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../running-jobs/distributed-jobs.html">Multi-Node Jobs</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../running-jobs/many-jobs.html">Many Parallel Jobs</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/training-guide.html">Model Training Guide</a></li>
<li class="toctree-l1"><a class="reference internal" href="../pools.html">Using a Pool of Workers</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../batch/index.html">Batch Inference</a><input class="toctree-checkbox" id="toctree-checkbox-11" name="toctree-checkbox-11" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-11"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../batch/custom-formats.html">Custom I/O Formats</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../job-groups.html">Job Groups for RL</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Model Serving</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference external" href="https://skypilot.ai/blog/skypilot-endpoints">SkyPilot Endpoints</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../../serving/sky-serve.html">SkyServe</a><input class="toctree-checkbox" id="toctree-checkbox-12" name="toctree-checkbox-12" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-12"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../../serving/autoscaling.html">Autoscaling</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../serving/update.html">Updating a Service</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../serving/auth.html">Authorization</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../serving/spot-policy.html">Using Spot Instances for Serving</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../serving/https.html">HTTPS Encryption</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../serving/serve-high-availability.html">High Availability Controller</a></li>
</ul>
</li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Infra Choices</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1 has-children"><a class="reference internal" href="../../reference/kubernetes/index.html">Using Kubernetes</a><input class="toctree-checkbox" id="toctree-checkbox-13" name="toctree-checkbox-13" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-13"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../../reference/kubernetes/kubernetes-getting-started.html">Getting Started</a></li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../../reference/kubernetes/kubernetes-setup.html">Kubernetes Cluster Setup</a><input class="toctree-checkbox" id="toctree-checkbox-14" name="toctree-checkbox-14" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-14"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../../reference/kubernetes/kubernetes-deployment.html">Deployment Guides</a></li>
<li class="toctree-l3"><a class="reference internal" href="../../reference/kubernetes/kubernetes-ports.html">Exposing Services</a></li>
</ul>
</li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/kubernetes/kubernetes-priorities.html">Priority and Preemption</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/kubernetes/multi-kubernetes.html">Multiple Kubernetes Clusters</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/kubernetes/kubernetes-pricing.html">Configuring Pricing</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/kubernetes/skypilot-and-vanilla-k8s.html">SkyPilot vs. Vanilla Kubernetes</a></li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../../reference/kubernetes/examples/index.html">Examples</a><input class="toctree-checkbox" id="toctree-checkbox-15" name="toctree-checkbox-15" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-15"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../../reference/kubernetes/examples/kueue-example.html">Kueue</a></li>
<li class="toctree-l3"><a class="reference internal" href="../../reference/kubernetes/examples/use-docker-in-pod.html">Use Docker in Pods</a></li>
<li class="toctree-l3"><a class="reference external" href="https://gke-ai-labs.dev/docs/tutorials/skypilot/resource-management-using-kueue/">Dynamic Workload Scheduler</a></li>
<li class="toctree-l3"><a class="reference external" href="https://gke-ai-labs.dev/docs/tutorials/skypilot/resource-management-using-kueue/">Kueue with GKE DWS</a></li>
<li class="toctree-l3"><a class="reference external" href="https://gke-ai-labs.dev/docs/tutorials/skypilot/cross-region-capacity-chasing/">Multi-region Kubernetes</a></li>
</ul>
</li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/kubernetes/kubernetes-troubleshooting.html">Kubernetes Troubleshooting</a></li>
</ul>
</li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../../reference/slurm/index.html">Using Slurm</a><input class="toctree-checkbox" id="toctree-checkbox-16" name="toctree-checkbox-16" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-16"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../../reference/slurm/slurm-getting-started.html">Getting Started</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../../reservations/existing-machines.html">Using Existing Machines</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reservations/reservations.html">Using Reservations</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../../compute/cloud-vm.html">Using Cloud VMs</a><input class="toctree-checkbox" id="toctree-checkbox-17" name="toctree-checkbox-17" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-17"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../../cloud-setup/quota.html">Requesting Quota Increase</a></li>
</ul>
</li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../../compute/gpus.html">GPUs and Accelerators</a><input class="toctree-checkbox" id="toctree-checkbox-18" name="toctree-checkbox-18" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-18"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../../reference/tpu.html">Using Google TPUs</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/kubernetes/amd-gpu.html">Using AMD GPUs</a></li>
</ul>
</li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Data</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../../reference/storage.html">Cloud Buckets</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/volumes.html">Volumes</a></li>
<li class="toctree-l1"><a class="reference internal" href="../syncing-code-artifacts.html">Syncing Code, Git, and Files</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">User Guides</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../../reference/recipes.html">SkyPilot Recipes</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/slurm-migration.html">Migrating from Slurm</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../running-jobs/external-links.html">External Links</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/async.html">Asynchronous Execution</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../running-jobs/environment-variables.html">Environment Variables and Secrets</a></li>
<li class="toctree-l1"><a class="reference internal" href="../docker-containers.html">Docker Containers</a></li>
<li class="toctree-l1"><a class="reference internal" href="../ports.html">Opening Ports</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/lifecycle-hooks.html">Lifecycle hooks</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/logging.html">Usage Collection</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/faq.html">Frequently Asked Questions</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Administrator Guides</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1 has-children"><a class="reference internal" href="../../reference/api-server/api-server.html">API Server Deployment</a><input class="toctree-checkbox" id="toctree-checkbox-19" name="toctree-checkbox-19" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-19"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2 has-children"><a class="reference internal" href="../../reference/api-server/api-server-admin-deploy.html">Deploying API Server</a><input class="toctree-checkbox" id="toctree-checkbox-20" name="toctree-checkbox-20" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-20"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../../reference/api-server/examples/api-server-metrics-setup.html"> API server metrics monitoring</a></li>
<li class="toctree-l3"><a class="reference internal" href="../../reference/api-server/examples/api-server-gpu-metrics-setup.html"> GPU metrics monitoring</a></li>
<li class="toctree-l3"><a class="reference internal" href="../../reference/api-server/examples/example-deploy-gke-nebius-okta.html"> Example: Deploy on GKE, GCP, and Nebius with Okta</a></li>
<li class="toctree-l3"><a class="reference internal" href="../../reference/api-server/examples/api-server-in-docker.html"> Example: Deploy SkyPilot API Server in Docker</a></li>
<li class="toctree-l3"><a class="reference internal" href="../../reference/api-server/examples/example-deploy-gcp-cloud-sql.html"> Example: Deploy on GKE with Cloud SQL</a></li>
</ul>
</li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/api-server/api-server-upgrade.html">Upgrades and High Availability</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/api-server/api-server-tunning.html">Performance Best Practices</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/api-server/api-server-troubleshooting.html">Troubleshooting</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../reference/api-server/helm-values-spec.html">Helm Chart Reference</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/auth.html">Authentication and RBAC</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../admin/workspaces.html">Workspaces: Isolating Teams</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../../cloud-setup/cloud-permissions/index.html">Cloud Accounts and Permissions</a><input class="toctree-checkbox" id="toctree-checkbox-21" name="toctree-checkbox-21" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-21"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2 has-children"><a class="reference internal" href="../../cloud-setup/cloud-permissions/aws.html">AWS</a><input class="toctree-checkbox" id="toctree-checkbox-22" name="toctree-checkbox-22" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-22"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../../cloud-setup/cloud-permissions/aws-eks-iam-roles.html">Using IAM Roles for S3 Access on EKS</a></li>
</ul>
</li>
<li class="toctree-l2"><a class="reference internal" href="../../cloud-setup/cloud-permissions/gcp.html">GCP</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../cloud-setup/cloud-permissions/nebius.html">Nebius</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../cloud-setup/cloud-permissions/vsphere.html">vSphere</a></li>
<li class="toctree-l2"><a class="reference internal" href="../../cloud-setup/cloud-permissions/kubernetes.html">Kubernetes</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../../cloud-setup/policy.html">Admin Policies</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../cloud-setup/external-logging.html">External Logging Storage</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../cloud-setup/airgap.html">Airgapped Environments</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">References</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../../reference/yaml-spec.html">SkyPilot YAML</a></li>


<li class="toctree-l1"><a class="reference internal" href="../../reference/cli.html">CLI</a></li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/api.html">Python SDK</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../../reference/config.html">Advanced Configuration</a><input class="toctree-checkbox" id="toctree-checkbox-23" name="toctree-checkbox-23" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-23"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../../reference/config-sources.html">Configuration Sources</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../../reference/architecture/internals.html">SkyPilot Internals</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../../developers/index.html">Developer Guides</a><input class="toctree-checkbox" id="toctree-checkbox-24" name="toctree-checkbox-24" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-24"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../../developers/CONTRIBUTING.html">Contributing to SkyPilot</a></li>
<li class="toctree-l2"><a class="reference external" href="https://docs.google.com/document/d/1oWox3qb3Kz3wXXSGg9ZJWwijoa99a3PIQUHBR8UgEGs/edit?usp=sharing">Guide: Adding a New Cloud</a></li>
</ul>
</li>
</ul>
</div>
</nav></div>
    </div>
  
  
  <div class="sidebar-primary-items__end sidebar-primary__section">
  </div>
  
  <div id="rtd-footer-container"></div>


      </div>
      
      <main id="main-content" class="bd-main">
        
        
          <div class="bd-content">
            <div class="bd-article-container">
              
              <div class="bd-header-article"></div>
              
              
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WDLMDR6J"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

              
                
<div id="searchbox"></div>
                <article class="bd-article" role="main">
                  
  <section id="agents">
<h1>Agents<a class="headerlink" href="#agents" title="Permalink to this heading">#</a></h1>
<div class="toctree-wrapper compound">
<ul>
<li class="toctree-l1"><a class="reference internal" href="autoresearch.html">Parallel Autoresearch</a></li>
<li class="toctree-l1"><a class="reference internal" href="autonomous-code-optimization.html">Autonomous Code Optimization</a></li>
<li class="toctree-l1"><a class="reference internal" href="gpu-job-management.html">GPU Job Management for Agents</a></li>
<li class="toctree-l1"><a class="reference internal" href="slime.html">Scale Agentic RL with slime</a></li>
</ul>
</div>
</section>


                </article>
              

              
              
              
              
                <footer class="prev-next-footer">
                  
<div class="prev-next-area">
    <a class="left-prev"
       href="../../getting-started/tutorial.html"
       title="previous page">
      <i class="fa-solid fa-angle-left"></i>
      <div class="prev-next-info">
        <p class="prev-next-subtitle">previous</p>
        <p class="prev-next-title">Quickstart: PyTorch</p>
      </div>
    </a>
    <a class="right-next"
       href="autoresearch.html"
       title="next page">
      <div class="prev-next-info">
        <p class="prev-next-subtitle">next</p>
        <p class="prev-next-title">Parallel Autoresearch with SkyPilot</p>
      </div>
      <i class="fa-solid fa-angle-right"></i>
    </a>
</div>
                </footer>
              
            </div>
            
            
              
                <div class="bd-sidebar-secondary bd-toc"><div class="sidebar-secondary-items sidebar-secondary__inner">

  <div class="sidebar-secondary-item">

  
  <div class="tocsection editthispage">
    <a href="https://github.com/skypilot-org/skypilot/edit/master/docs/source/examples/agents/index.rst">
      <i class="fa-solid fa-pencil"></i>
      
      
        
          Edit on GitHub
        
      
    </a>
  </div>
</div>

</div></div>
              
            
          </div>
          <footer class="bd-footer-content">
            
          </footer>
        
      </main>
    </div>
  </div>
  
  <!-- Scripts loaded after <body> so the DOM is not blocked -->
  <script src="../../_static/scripts/bootstrap.js?digest=5b4479735964841361fd"></script>
<script src="../../_static/scripts/pydata-sphinx-theme.js?digest=5b4479735964841361fd"></script>

  <footer class="bd-footer">
<div class="bd-footer__inner bd-page-width">
  
    <div class="footer-items__start">
      
        <div class="footer-item">

  <p class="copyright">
    
      © Copyright 2026, SkyPilot Team.
      <br/>
    
  </p>
</div>
      
    </div>
  
  
  
</div>

  </footer>
  </body>
</html>