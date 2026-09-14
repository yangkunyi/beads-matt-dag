SOURCE-URL: https://docs.skypilot.co/en/latest/examples/managed-jobs.html
FETCHED: 2026-09-14T17:21:47+08:00
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
    
    <title>Managed Jobs &#8212; SkyPilot Docs</title>
  
  
  
  <script data-cfasync="false">
    document.documentElement.dataset.mode = localStorage.getItem("mode") || "";
    document.documentElement.dataset.theme = localStorage.getItem("theme") || "light";
  </script>
  
  <!-- Loaded before other Sphinx assets -->
  <link href="../_static/styles/theme.css?digest=5b4479735964841361fd" rel="stylesheet" />
<link href="../_static/styles/bootstrap.css?digest=5b4479735964841361fd" rel="stylesheet" />
<link href="../_static/styles/pydata-sphinx-theme.css?digest=5b4479735964841361fd" rel="stylesheet" />

  
  <link href="../_static/vendor/fontawesome/6.1.2/css/all.min.css?digest=5b4479735964841361fd" rel="stylesheet" />
  <link rel="preload" as="font" type="font/woff2" crossorigin href="../_static/vendor/fontawesome/6.1.2/webfonts/fa-solid-900.woff2" />
<link rel="preload" as="font" type="font/woff2" crossorigin href="../_static/vendor/fontawesome/6.1.2/webfonts/fa-brands-400.woff2" />
<link rel="preload" as="font" type="font/woff2" crossorigin href="../_static/vendor/fontawesome/6.1.2/webfonts/fa-regular-400.woff2" />

    <link rel="stylesheet" type="text/css" href="../_static/pygments.css?v=a746c00c" />
    <link rel="stylesheet" type="text/css" href="../_static/copybutton.css?v=76b2166b" />
    <link rel="stylesheet" type="text/css" href="../_static/togglebutton.css?v=13237357" />
    <link rel="stylesheet" type="text/css" href="../_static/design-style.1e8bd061cd6da7fc9cf755528e8ffc24.min.css?v=0a3b3ea7" />
    <link rel="stylesheet" type="text/css" href="../_static/custom.css?v=6fe21540" />
  
  <!-- Pre-loaded scripts that we'll load fully later -->
  <link rel="preload" as="script" href="../_static/scripts/bootstrap.js?digest=5b4479735964841361fd" />
<link rel="preload" as="script" href="../_static/scripts/pydata-sphinx-theme.js?digest=5b4479735964841361fd" />
  <script src="../_static/vendor/fontawesome/6.1.2/js/all.min.js?digest=5b4479735964841361fd"></script>

    <script data-url_root="../" id="documentation_options" src="../_static/documentation_options.js?v=2902ade1"></script>
    <script src="../_static/doctools.js?v=888ff710"></script>
    <script src="../_static/sphinx_highlight.js?v=4825356b"></script>
    <script src="../_static/clipboard.min.js?v=a7894cd8"></script>
    <script src="../_static/copybutton.js?v=a5fa425f"></script>
    <script>let toggleHintShow = 'Click to show';</script>
    <script>let toggleHintHide = 'Click to hide';</script>
    <script>let toggleOpenOnPrint = 'true';</script>
    <script src="../_static/togglebutton.js?v=4a39c7ea"></script>
    <script>var togglebuttonSelector = '.toggle, .admonition.dropdown';</script>
    <script src="../_static/design-tabs.js?v=36754332"></script>
    <script>DOCUMENTATION_OPTIONS.pagename = 'examples/managed-jobs';</script>
    <script src="../_static/custom.js?v=0ae96a79"></script>
    <link rel="icon" href="../_static/favicon.ico"/>
    <link rel="index" title="Index" href="../genindex.html" />
    <link rel="search" title="Search" href="../search.html" />
    <link rel="next" title="Checkpointing and recovery" href="checkpointing.html" />
    <link rel="prev" title="Autostop and Autodown" href="../reference/auto-stop.html" />
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="docsearch:language" content="en"/>
  <script async type="text/javascript" src="/_/static/javascript/readthedocs-addons.js"></script><meta name="readthedocs-project-slug" content="assemble-skypilot" /><meta name="readthedocs-version-slug" content="latest" /><meta name="readthedocs-resolver-filename" content="/examples/managed-jobs.html" /><meta name="readthedocs-http-status" content="200" /></head>
  
  
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
      action="../search.html"
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


<a class="navbar-brand logo" href="../index.html">
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
                      <a class="nav-link nav-internal" href="../docs/index.html">
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
                      <a class="nav-link nav-internal" href="../docs/index.html">
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
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../overview.html">Overview</a></li>
<li class="toctree-l1"><a class="reference internal" href="../getting-started/installation.html">Installation</a></li>
<li class="toctree-l1"><a class="reference internal" href="../getting-started/quickstart.html">Quickstart</a></li>
<li class="toctree-l1"><a class="reference internal" href="../getting-started/skill.html">Agent Skills</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="index.html">Examples</a><input class="toctree-checkbox" id="toctree-checkbox-1" name="toctree-checkbox-1" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-1"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../getting-started/tutorial.html">Quickstart: PyTorch</a></li>
<li class="toctree-l2 has-children"><a class="reference internal" href="agents/index.html">Agents</a><input class="toctree-checkbox" id="toctree-checkbox-2" name="toctree-checkbox-2" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-2"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="agents/autoresearch.html">Parallel Autoresearch</a></li>
<li class="toctree-l3"><a class="reference internal" href="agents/autonomous-code-optimization.html">Autonomous Code Optimization</a></li>
<li class="toctree-l3"><a class="reference internal" href="agents/gpu-job-management.html">GPU Job Management for Agents</a></li>
<li class="toctree-l3"><a class="reference internal" href="agents/slime.html">Scale Agentic RL with slime</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="training/index.html">Training</a><input class="toctree-checkbox" id="toctree-checkbox-3" name="toctree-checkbox-3" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-3"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="training/axolotl.html">Axolotl</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/deepspeed.html">DeepSpeed</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/distributed-pytorch.html">Distributed PyTorch</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/distributed-tensorflow.html">Distributed TensorFlow</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/fairseq2.html">Fairseq2</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/cosmos3-finetuning.html">Finetuning Cosmos 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/gpt-oss-finetuning.html">Finetuning GPT-OSS</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/llama-4-finetuning.html">Finetuning Llama 4</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/llama-3_1-finetuning.html">Finetuning Llama 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/llama-2-finetuning.html">Finetuning Llama 2</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/nanochat.html">nanochat</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/nemo.html">NeMo</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/nemorl.html">NeMo RL</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/openrlhf.html">OpenRLHF</a></li>
<li class="toctree-l3"><a class="reference external" href="https://github.com/meta-pytorch/monarch/tree/main/examples/skypilot">PyTorch Monarch</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/ray.html">Ray</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/torchtitan.html">TorchTitan</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/tpu.html">Training on TPUs</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/unsloth.html">Unsloth</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/verl.html">Verl (RLHF)</a></li>
<li class="toctree-l3"><a class="reference internal" href="training/skyrl.html">SkyRL</a></li>
<li class="toctree-l3"><a class="reference external" href="https://medium.com/google-cloud/streamline-ai-ml-model-development-on-gke-with-skypilot-and-vertex-ai-workbench-453729a8897c">Vertex AI</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="serving/index.html">Serving</a><input class="toctree-checkbox" id="toctree-checkbox-4" name="toctree-checkbox-4" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-4"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="serving/vllm.html">vLLM</a></li>
<li class="toctree-l3"><a class="reference internal" href="serving/sglang.html">SGLang</a></li>
<li class="toctree-l3"><a class="reference internal" href="serving/nvidia-dynamo.html">Nvidia Dynamo</a></li>
<li class="toctree-l3"><a class="reference internal" href="serving/ollama.html">Ollama</a></li>
<li class="toctree-l3"><a class="reference internal" href="serving/tgi.html">Hugging Face TGI</a></li>
<li class="toctree-l3"><a class="reference internal" href="serving/lorax.html">LoRAX</a></li>
<li class="toctree-l3"><a class="reference internal" href="serving/cog.html">Cog</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="models/index.html">Models</a><input class="toctree-checkbox" id="toctree-checkbox-5" name="toctree-checkbox-5" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-5"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="models/gpt-oss.html">OpenAI gpt-oss</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/deepseek-r1.html">DeepSeek-R1</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/deepseek-r1-distilled.html">DeepSeek-R1 Distilled</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/deepseek-janus.html">DeepSeek-Janus</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/gemma3.html">Gemma 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/llama-4.html">Llama 4</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/llama-3_2.html">Llama 3.2</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/llama-3_1.html">Llama 3.1</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/llama-3.html">Llama 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/llama-2.html">Llama 2</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/codellama.html">CodeLlama</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/pixtral.html">Pixtral</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/mixtral.html">Mixtral</a></li>
<li class="toctree-l3"><a class="reference external" href="https://docs.mistral.ai/deployment/self-deployment/skypilot/">Mistral 7B</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/qwen.html">Qwen 3</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/kimi-k2.html">Kimi K2</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/kimi-k2-thinking.html">Kimi K2 Thinking</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/yi.html">Yi</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/gemma.html">Gemma</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/dbrx.html">DBRX</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/gpt-2.html">GPT-2 via llm.c</a></li>
<li class="toctree-l3"><a class="reference internal" href="models/vicuna.html">Vicuna</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="applications/index.html">AI Applications</a><input class="toctree-checkbox" id="toctree-checkbox-6" name="toctree-checkbox-6" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-6"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="applications/rag.html">DeepSeek-R1 for RAG</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/deepseek-ocr.html">DeepSeek OCR with Pools</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/batch_inference.html">Large-Scale Batch Inference</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/pools_batch_inference.html">Batch Inference with vLLM</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/vector_database.html">Image Vector Database</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/redisvl-vector-search.html">RedisVL Vector Search</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/sam3-video-segmentation.html">SAM3 Video Segmentation</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/streamlit.html">Streamlit Web Apps</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/tabby.html">Tabby: Coding Assistant</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/localgpt.html">LocalGPT: Chat with PDF</a></li>
<li class="toctree-l3"><a class="reference internal" href="applications/stable_diffusion.html">Stable Diffusion</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="performance/index.html">AI Performance</a><input class="toctree-checkbox" id="toctree-checkbox-7" name="toctree-checkbox-7" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-7"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="performance/aws_efa.html">AWS EFA</a></li>
<li class="toctree-l3"><a class="reference internal" href="performance/gcp_gpu_direct_tcpx.html">GCP/GKE GPUDirect</a></li>
<li class="toctree-l3"><a class="reference internal" href="performance/coreweave_infiniband.html">Coreweave with InfiniBand</a></li>
<li class="toctree-l3"><a class="reference internal" href="performance/nebius_infiniband.html">Nebius with InfiniBand</a></li>
<li class="toctree-l3"><a class="reference internal" href="performance/together_infiniband.html">Together AI with InfiniBand</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="orchestrators/index.html">Orchestrators</a><input class="toctree-checkbox" id="toctree-checkbox-8" name="toctree-checkbox-8" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-8"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="orchestrators/airflow.html">Airflow</a></li>
<li class="toctree-l3"><a class="reference internal" href="orchestrators/cron.html">Cron</a></li>
<li class="toctree-l3"><a class="reference internal" href="orchestrators/github_actions.html">Github Actions</a></li>
<li class="toctree-l3"><a class="reference internal" href="orchestrators/prefect.html">Prefect</a></li>
<li class="toctree-l3"><a class="reference internal" href="orchestrators/temporal.html">Temporal</a></li>
</ul>
</li>
<li class="toctree-l2 has-children"><a class="reference internal" href="frameworks/index.html">Other Frameworks</a><input class="toctree-checkbox" id="toctree-checkbox-9" name="toctree-checkbox-9" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-9"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference external" href="https://nebius.com/blog/posts/bulk-object-storage-s3-data-migration-with-skypilot">Cross-cloud data transfer</a></li>
<li class="toctree-l3"><a class="reference internal" href="frameworks/dvc.html">DVC</a></li>

<li class="toctree-l3"><a class="reference internal" href="frameworks/jupyter.html">Jupyter</a></li>
<li class="toctree-l3"><a class="reference internal" href="frameworks/marimo.html">marimo</a></li>
<li class="toctree-l3"><a class="reference external" href="https://nebius.com/blog/posts/orchestrating-llm-fine-tuning-k8s-skypilot-mlflow">MLFlow</a></li>
<li class="toctree-l3"><a class="reference internal" href="frameworks/mpi.html">MPI</a></li>
<li class="toctree-l3"><a class="reference internal" href="frameworks/spyder.html">Spyder IDE</a></li>
</ul>
</li>
</ul>
</li>

<li class="toctree-l1"><a class="reference internal" href="../sky-computing.html">Concept: Sky Computing</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../skypilot-platform.html">SkyPilot Platform</a><input class="toctree-checkbox" id="toctree-checkbox-10" name="toctree-checkbox-10" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-10"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../sandboxes.html">Sandboxes</a></li>
</ul>
</li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Clusters</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="interactive-development.html">Start a Development Cluster</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/job-queue.html">Cluster Jobs</a></li>
<li class="toctree-l1"><a class="reference internal" href="auto-failover.html">Provisioning Compute</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/auto-stop.html">Autostop and Autodown</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Jobs</span></p>
<ul class="current nav bd-sidenav">
<li class="toctree-l1 current active"><a class="current reference internal" href="#">Managed Jobs</a></li>
<li class="toctree-l1"><a class="reference internal" href="checkpointing.html">Checkpointing and Recovery</a></li>
<li class="toctree-l1"><a class="reference internal" href="../running-jobs/distributed-jobs.html">Multi-Node Jobs</a></li>
<li class="toctree-l1"><a class="reference internal" href="../running-jobs/many-jobs.html">Many Parallel Jobs</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/training-guide.html">Model Training Guide</a></li>
<li class="toctree-l1"><a class="reference internal" href="pools.html">Using a Pool of Workers</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="batch/index.html">Batch Inference</a><input class="toctree-checkbox" id="toctree-checkbox-11" name="toctree-checkbox-11" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-11"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="batch/custom-formats.html">Custom I/O Formats</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="job-groups.html">Job Groups for RL</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Model Serving</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference external" href="https://skypilot.ai/blog/skypilot-endpoints">SkyPilot Endpoints</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../serving/sky-serve.html">SkyServe</a><input class="toctree-checkbox" id="toctree-checkbox-12" name="toctree-checkbox-12" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-12"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../serving/autoscaling.html">Autoscaling</a></li>
<li class="toctree-l2"><a class="reference internal" href="../serving/update.html">Updating a Service</a></li>
<li class="toctree-l2"><a class="reference internal" href="../serving/auth.html">Authorization</a></li>
<li class="toctree-l2"><a class="reference internal" href="../serving/spot-policy.html">Using Spot Instances for Serving</a></li>
<li class="toctree-l2"><a class="reference internal" href="../serving/https.html">HTTPS Encryption</a></li>
<li class="toctree-l2"><a class="reference internal" href="../serving/serve-high-availability.html">High Availability Controller</a></li>
</ul>
</li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Infra Choices</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1 has-children"><a class="reference internal" href="../reference/kubernetes/index.html">Using Kubernetes</a><input class="toctree-checkbox" id="toctree-checkbox-13" name="toctree-checkbox-13" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-13"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../reference/kubernetes/kubernetes-getting-started.html">Getting Started</a></li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../reference/kubernetes/kubernetes-setup.html">Kubernetes Cluster Setup</a><input class="toctree-checkbox" id="toctree-checkbox-14" name="toctree-checkbox-14" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-14"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../reference/kubernetes/kubernetes-deployment.html">Deployment Guides</a></li>
<li class="toctree-l3"><a class="reference internal" href="../reference/kubernetes/kubernetes-ports.html">Exposing Services</a></li>
</ul>
</li>
<li class="toctree-l2"><a class="reference internal" href="../reference/kubernetes/kubernetes-priorities.html">Priority and Preemption</a></li>
<li class="toctree-l2"><a class="reference internal" href="../reference/kubernetes/multi-kubernetes.html">Multiple Kubernetes Clusters</a></li>
<li class="toctree-l2"><a class="reference internal" href="../reference/kubernetes/kubernetes-pricing.html">Configuring Pricing</a></li>
<li class="toctree-l2"><a class="reference internal" href="../reference/kubernetes/skypilot-and-vanilla-k8s.html">SkyPilot vs. Vanilla Kubernetes</a></li>
<li class="toctree-l2 has-children"><a class="reference internal" href="../reference/kubernetes/examples/index.html">Examples</a><input class="toctree-checkbox" id="toctree-checkbox-15" name="toctree-checkbox-15" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-15"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../reference/kubernetes/examples/kueue-example.html">Kueue</a></li>
<li class="toctree-l3"><a class="reference internal" href="../reference/kubernetes/examples/use-docker-in-pod.html">Use Docker in Pods</a></li>
<li class="toctree-l3"><a class="reference external" href="https://gke-ai-labs.dev/docs/tutorials/skypilot/resource-management-using-kueue/">Dynamic Workload Scheduler</a></li>
<li class="toctree-l3"><a class="reference external" href="https://gke-ai-labs.dev/docs/tutorials/skypilot/resource-management-using-kueue/">Kueue with GKE DWS</a></li>
<li class="toctree-l3"><a class="reference external" href="https://gke-ai-labs.dev/docs/tutorials/skypilot/cross-region-capacity-chasing/">Multi-region Kubernetes</a></li>
</ul>
</li>
<li class="toctree-l2"><a class="reference internal" href="../reference/kubernetes/kubernetes-troubleshooting.html">Kubernetes Troubleshooting</a></li>
</ul>
</li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../reference/slurm/index.html">Using Slurm</a><input class="toctree-checkbox" id="toctree-checkbox-16" name="toctree-checkbox-16" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-16"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../reference/slurm/slurm-getting-started.html">Getting Started</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../reservations/existing-machines.html">Using Existing Machines</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reservations/reservations.html">Using Reservations</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../compute/cloud-vm.html">Using Cloud VMs</a><input class="toctree-checkbox" id="toctree-checkbox-17" name="toctree-checkbox-17" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-17"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../cloud-setup/quota.html">Requesting Quota Increase</a></li>
</ul>
</li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../compute/gpus.html">GPUs and Accelerators</a><input class="toctree-checkbox" id="toctree-checkbox-18" name="toctree-checkbox-18" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-18"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../reference/tpu.html">Using Google TPUs</a></li>
<li class="toctree-l2"><a class="reference internal" href="../reference/kubernetes/amd-gpu.html">Using AMD GPUs</a></li>
</ul>
</li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Data</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../reference/storage.html">Cloud Buckets</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/volumes.html">Volumes</a></li>
<li class="toctree-l1"><a class="reference internal" href="syncing-code-artifacts.html">Syncing Code, Git, and Files</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">User Guides</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../reference/recipes.html">SkyPilot Recipes</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/slurm-migration.html">Migrating from Slurm</a></li>
<li class="toctree-l1"><a class="reference internal" href="../running-jobs/external-links.html">External Links</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/async.html">Asynchronous Execution</a></li>
<li class="toctree-l1"><a class="reference internal" href="../running-jobs/environment-variables.html">Environment Variables and Secrets</a></li>
<li class="toctree-l1"><a class="reference internal" href="docker-containers.html">Docker Containers</a></li>
<li class="toctree-l1"><a class="reference internal" href="ports.html">Opening Ports</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/lifecycle-hooks.html">Lifecycle hooks</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/logging.html">Usage Collection</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/faq.html">Frequently Asked Questions</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">Administrator Guides</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1 has-children"><a class="reference internal" href="../reference/api-server/api-server.html">API Server Deployment</a><input class="toctree-checkbox" id="toctree-checkbox-19" name="toctree-checkbox-19" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-19"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2 has-children"><a class="reference internal" href="../reference/api-server/api-server-admin-deploy.html">Deploying API Server</a><input class="toctree-checkbox" id="toctree-checkbox-20" name="toctree-checkbox-20" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-20"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../reference/api-server/examples/api-server-metrics-setup.html"> API server metrics monitoring</a></li>
<li class="toctree-l3"><a class="reference internal" href="../reference/api-server/examples/api-server-gpu-metrics-setup.html"> GPU metrics monitoring</a></li>
<li class="toctree-l3"><a class="reference internal" href="../reference/api-server/examples/example-deploy-gke-nebius-okta.html"> Example: Deploy on GKE, GCP, and Nebius with Okta</a></li>
<li class="toctree-l3"><a class="reference internal" href="../reference/api-server/examples/api-server-in-docker.html"> Example: Deploy SkyPilot API Server in Docker</a></li>
<li class="toctree-l3"><a class="reference internal" href="../reference/api-server/examples/example-deploy-gcp-cloud-sql.html"> Example: Deploy on GKE with Cloud SQL</a></li>
</ul>
</li>
<li class="toctree-l2"><a class="reference internal" href="../reference/api-server/api-server-upgrade.html">Upgrades and High Availability</a></li>
<li class="toctree-l2"><a class="reference internal" href="../reference/api-server/api-server-tunning.html">Performance Best Practices</a></li>
<li class="toctree-l2"><a class="reference internal" href="../reference/api-server/api-server-troubleshooting.html">Troubleshooting</a></li>
<li class="toctree-l2"><a class="reference internal" href="../reference/api-server/helm-values-spec.html">Helm Chart Reference</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../reference/auth.html">Authentication and RBAC</a></li>
<li class="toctree-l1"><a class="reference internal" href="../admin/workspaces.html">Workspaces: Isolating Teams</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../cloud-setup/cloud-permissions/index.html">Cloud Accounts and Permissions</a><input class="toctree-checkbox" id="toctree-checkbox-21" name="toctree-checkbox-21" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-21"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2 has-children"><a class="reference internal" href="../cloud-setup/cloud-permissions/aws.html">AWS</a><input class="toctree-checkbox" id="toctree-checkbox-22" name="toctree-checkbox-22" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-22"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l3"><a class="reference internal" href="../cloud-setup/cloud-permissions/aws-eks-iam-roles.html">Using IAM Roles for S3 Access on EKS</a></li>
</ul>
</li>
<li class="toctree-l2"><a class="reference internal" href="../cloud-setup/cloud-permissions/gcp.html">GCP</a></li>
<li class="toctree-l2"><a class="reference internal" href="../cloud-setup/cloud-permissions/nebius.html">Nebius</a></li>
<li class="toctree-l2"><a class="reference internal" href="../cloud-setup/cloud-permissions/vsphere.html">vSphere</a></li>
<li class="toctree-l2"><a class="reference internal" href="../cloud-setup/cloud-permissions/kubernetes.html">Kubernetes</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../cloud-setup/policy.html">Admin Policies</a></li>
<li class="toctree-l1"><a class="reference internal" href="../cloud-setup/external-logging.html">External Logging Storage</a></li>
<li class="toctree-l1"><a class="reference internal" href="../cloud-setup/airgap.html">Airgapped Environments</a></li>
</ul>
<p aria-level="2" class="caption" role="heading"><span class="caption-text">References</span></p>
<ul class="nav bd-sidenav">
<li class="toctree-l1"><a class="reference internal" href="../reference/yaml-spec.html">SkyPilot YAML</a></li>


<li class="toctree-l1"><a class="reference internal" href="../reference/cli.html">CLI</a></li>
<li class="toctree-l1"><a class="reference internal" href="../reference/api.html">Python SDK</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../reference/config.html">Advanced Configuration</a><input class="toctree-checkbox" id="toctree-checkbox-23" name="toctree-checkbox-23" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-23"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../reference/config-sources.html">Configuration Sources</a></li>
</ul>
</li>
<li class="toctree-l1"><a class="reference internal" href="../reference/architecture/internals.html">SkyPilot Internals</a></li>
<li class="toctree-l1 has-children"><a class="reference internal" href="../developers/index.html">Developer Guides</a><input class="toctree-checkbox" id="toctree-checkbox-24" name="toctree-checkbox-24" type="checkbox"/><label class="toctree-toggle" for="toctree-checkbox-24"><i class="fa-solid fa-chevron-down"></i></label><ul>
<li class="toctree-l2"><a class="reference internal" href="../developers/CONTRIBUTING.html">Contributing to SkyPilot</a></li>
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
                  
  <section id="managed-jobs">
<span id="id1"></span><h1>Managed Jobs<a class="headerlink" href="#managed-jobs" title="Permalink to this heading">#</a></h1>
<p>SkyPilot <strong>managed jobs</strong> (<code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span></code>) manage the full lifecycle of a user job:</p>
<ul class="simple">
<li><p><strong>Provisioning and managing the resources</strong>, on either reserved clusters or elastic instances.</p></li>
<li><p><strong>Automatically recovering from failures</strong> (job preemptions, GPU errors, node crashes, etc.) and retrying application errors.</p></li>
<li><p><strong>Cleaning up the resources</strong> when done.</p></li>
</ul>
<p>Use managed jobs for scaling out — running a single job for long durations, or running many jobs in parallel.</p>
<div class="admonition seealso">
<p class="admonition-title">See also</p>
<p><a class="reference internal" href="pools.html"><span class="doc">Using a Pool of Workers</span></a> for running batch inference workloads or workloads with expensive worker setup.</p>
<p><a class="reference internal" href="job-groups.html#job-groups"><span class="std std-ref">Job Groups for RL</span></a> for running multiple heterogeneous tasks in parallel that
can communicate with each other (e.g., RL workloads).</p>
</div>
<p>To start a managed job, use <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span></code>:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>launch<span class="w"> </span>-n<span class="w"> </span>myjob<span class="w"> </span>hello_sky.yaml

<span class="go">Task from YAML spec: hello_sky.yaml</span>
<span class="go">Managed job &#39;myjob&#39; will be launched on (estimated):</span>
<span class="go">Considered resources (1 node):</span>
<span class="go">------------------------------------------------------------------------------------------</span>
<span class="go"> INFRA              INSTANCE      vCPUs   Mem(GB)   GPUS   COST ($)   CHOSEN</span>
<span class="go">------------------------------------------------------------------------------------------</span>
<span class="go"> AWS (us-east-1)    m6i.2xlarge   8       32        -      0.38          ✔</span>
<span class="go">------------------------------------------------------------------------------------------</span>
<span class="go">Launching a managed job &#39;myjob&#39;. Proceed? [Y/n]: Y</span>
<span class="go">... &lt;job is submitted and launched&gt;</span>
<span class="gp gp-VirtualEnv">(setup pid=2383)</span> <span class="go">Running setup.</span>
<span class="gp gp-VirtualEnv">(myjob, pid=2383)</span> <span class="go">Hello, SkyPilot!</span>
<span class="go">✓ Managed job finished: 1 (status: SUCCEEDED).</span>

<span class="go">Managed Job ID: 1</span>
<span class="go">📋 Useful Commands</span>
<span class="go">├── To cancel the job:                sky jobs cancel 1</span>
<span class="go">├── To stream job logs:               sky jobs logs 1</span>
<span class="go">├── To stream controller logs:        sky jobs logs --controller 1</span>
<span class="go">└── To view all managed jobs:         sky jobs queue</span>
</pre></div>
</div>
<p>The job is launched on a temporary SkyPilot cluster, managed end-to-end, and automatically cleaned up.</p>
<p>Managed jobs have several benefits:</p>
<ol class="arabic simple">
<li><p><a class="reference internal" href="#failure-recovery"><span class="std std-ref">Auto-recover from different failures</span></a>: Automatically recover from node crashes, job preemptions, GPU failures, NCCL timeouts, or hardware issues. Application errors can also be retried for a configurable number of times.</p></li>
<li><p><a class="reference internal" href="#scaling-to-many-jobs"><span class="std std-ref">Scale across infra (clusters, regions, clouds)</span></a>: Easily run and manage a large number of jobs across your infrastructure choices.</p></li>
<li><p><a class="reference internal" href="#pipeline"><span class="std std-ref">Managed pipelines</span></a>: Run pipelines that contain multiple tasks.
Useful for running a sequence of tasks that depend on each other, e.g., data
processing, training a model, and then running inference on it.</p></li>
<li><p><a class="reference internal" href="#spot-jobs"><span class="std std-ref">Use spot instances</span></a>: Optionally run on auto-recovering spot instances to save ~70% on GPU costs while maintaining reliability through automatic preemption recovery.</p></li>
</ol>
<nav class="contents local" id="contents">
<p class="topic-title">Contents</p>
<ul class="simple">
<li><p><a class="reference internal" href="#create-a-managed-job" id="id3">Create a managed job</a></p>
<ul>
<li><p><a class="reference internal" href="#work-with-managed-jobs" id="id4">Work with managed jobs</a></p></li>
<li><p><a class="reference internal" href="#viewing-jobs-in-dashboard" id="id5">Viewing jobs in dashboard</a></p></li>
</ul>
</li>
<li><p><a class="reference internal" href="#checkpointing-and-recovery" id="id6">Checkpointing and recovery</a></p>
<ul>
<li><p><a class="reference internal" href="#using-kubernetes-volumes" id="id7">Using Kubernetes volumes</a></p></li>
<li><p><a class="reference internal" href="#using-cloud-buckets" id="id8">Using cloud buckets</a></p></li>
<li><p><a class="reference internal" href="#real-world-examples" id="id9">Real-world examples</a></p></li>
<li><p><a class="reference internal" href="#recovering-from-application-failures" id="id10">Recovering from application failures</a></p>
<ul>
<li><p><a class="reference internal" href="#recovering-on-specific-exit-codes" id="id11">Recovering on specific exit codes</a></p></li>
</ul>
</li>
<li><p><a class="reference internal" href="#when-will-my-job-be-recovered" id="id12">When will my job be recovered?</a></p></li>
</ul>
</li>
<li><p><a class="reference internal" href="#running-on-spot-instances-optional" id="id13">Running on spot instances (optional)</a></p>
<ul>
<li><p><a class="reference internal" href="#either-spot-or-on-demand-reserved" id="id14">Either spot or on-demand/reserved</a></p></li>
</ul>
</li>
<li><p><a class="reference internal" href="#scaling-to-many-jobs" id="id15">Scaling to many jobs</a></p>
<ul>
<li><p><a class="reference internal" href="#submitting-many-jobs-at-once-with-num-jobs" id="id16">Submitting many jobs at once with <code class="docutils literal notranslate"><span class="pre">--num-jobs</span></code></a></p></li>
</ul>
</li>
<li><p><a class="reference internal" href="#managed-pipelines" id="id17">Managed pipelines</a></p></li>
<li><p><a class="reference internal" href="#file-uploads-for-managed-jobs" id="id18">File uploads for managed jobs</a></p>
<ul>
<li><p><a class="reference internal" href="#setting-the-job-files-bucket" id="id19">Setting the job files bucket</a></p></li>
</ul>
</li>
<li><p><a class="reference internal" href="#calling-skypilot-api-from-within-managed-jobs" id="id20">Calling SkyPilot API from within managed jobs</a></p></li>
<li><p><a class="reference internal" href="#how-it-works" id="id21">How it works</a></p>
<ul>
<li><p><a class="reference internal" href="#legacy-using-a-remote-jobs-controller" id="id22">[Legacy] Using a remote jobs controller</a></p>
<ul>
<li><p><a class="reference internal" href="#high-availability-controller" id="id23">High availability controller</a></p></li>
<li><p><a class="reference internal" href="#using-long-lived-credentials" id="id24">Using long-lived credentials</a></p></li>
<li><p><a class="reference internal" href="#customizing-controller-resources" id="id25">Customizing controller resources</a></p></li>
<li><p><a class="reference internal" href="#scaling-best-practices" id="id26">Scaling best practices</a></p></li>
<li><p><a class="reference internal" href="#migrating-from-a-remote-jobs-controller" id="id27">Migrating from a remote jobs controller</a></p></li>
</ul>
</li>
</ul>
</li>
</ul>
</nav>
<section id="create-a-managed-job">
<span id="managed-job-quickstart"></span><h2>Create a managed job<a class="headerlink" href="#create-a-managed-job" title="Permalink to this heading">#</a></h2>
<p>A managed job is created from a standard <a class="reference internal" href="../reference/yaml-spec.html#yaml-spec"><span class="std std-ref">SkyPilot YAML</span></a>. For example:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="c1"># qwen_finetune.yaml</span>
<span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">qwen-finetune</span>

<span class="nt">resources</span><span class="p">:</span>
<span class="w">  </span><span class="nt">accelerators</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">B200:8</span>

<span class="nt">envs</span><span class="p">:</span>
<span class="w">  </span><span class="c1"># Fill in your wandb key: copy from https://wandb.ai/authorize</span>
<span class="w">  </span><span class="c1"># Alternatively, you can use `--env WANDB_API_KEY=$WANDB_API_KEY`</span>
<span class="w">  </span><span class="c1"># to pass the key in the command line, during `sky jobs launch`.</span>
<span class="w">  </span><span class="nt">WANDB_API_KEY</span><span class="p">:</span>

<span class="c1"># Assume your working directory is under `~/transformers`.</span>
<span class="c1"># To get the code for this example, run:</span>
<span class="c1"># git clone https://github.com/huggingface/transformers.git ~/transformers</span>
<span class="nt">workdir</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">~/transformers</span>

<span class="nt">setup</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no">pip install -e .</span>
<span class="w">  </span><span class="no">cd examples/pytorch/language-modeling/</span>
<span class="w">  </span><span class="no">pip install -r requirements.txt</span>
<span class="w">  </span><span class="no">pip install wandb</span>

<span class="nt">run</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no">cd examples/pytorch/language-modeling/</span>
<span class="w">  </span><span class="no">torchrun --nproc_per_node=8 run_clm.py \</span>
<span class="w">    </span><span class="no">--model_name_or_path Qwen/Qwen3-8B \</span>
<span class="w">    </span><span class="no">--dataset_name wikitext \</span>
<span class="w">    </span><span class="no">--dataset_config_name wikitext-2-raw-v1 \</span>
<span class="w">    </span><span class="no">--do_train \</span>
<span class="w">    </span><span class="no">--do_eval \</span>
<span class="w">    </span><span class="no">--per_device_train_batch_size 1 \</span>
<span class="w">    </span><span class="no">--gradient_accumulation_steps 8 \</span>
<span class="w">    </span><span class="no">--learning_rate 2e-5 \</span>
<span class="w">    </span><span class="no">--num_train_epochs 3 \</span>
<span class="w">    </span><span class="no">--bf16 \</span>
<span class="w">    </span><span class="no">--report_to wandb \</span>
<span class="w">    </span><span class="no">--output_dir /tmp/qwen_finetune/</span>
</pre></div>
</div>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p><a class="reference internal" href="syncing-code-artifacts.html#sync-code-artifacts"><span class="std std-ref">Workdir</span></a> and <a class="reference internal" href="syncing-code-artifacts.html#sync-code-artifacts"><span class="std std-ref">file mounts with local files</span></a> will be <a class="reference internal" href="#intermediate-bucket"><span class="std std-ref">automatically uploaded to a cloud bucket</span></a>.
The bucket will be cleaned up after the job finishes.</p>
</div>
<p>To launch this YAML as a managed job, use <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span></code>:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>launch<span class="w"> </span>-n<span class="w"> </span>qwen-finetune<span class="w"> </span>qwen_finetune.yaml
</pre></div>
</div>
<p>To see all flags, you can run <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span> <span class="pre">--help</span></code> or see the <a class="reference internal" href="../reference/cli.html#sky-job-launch"><span class="std std-ref">CLI reference</span></a> for more information.</p>
<p>SkyPilot will launch and start monitoring the job.</p>
<ul class="simple">
<li><p>Under the hood, SkyPilot spins up a temporary cluster for the job.</p></li>
<li><p>If any failure happens (GPU errors, node crashes, or job preemptions), SkyPilot will automatically search for resources to re-launch the job.</p></li>
<li><p>Resources are cleaned up as soon as the job is finished.</p></li>
</ul>
<div class="admonition tip">
<p class="admonition-title">Tip</p>
<p>You can test your YAML on <a class="reference external" href="../getting-started/quickstart.html">unmanaged <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">launch</span></code></a> , then do a production run as a managed job using <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span></code>.</p>
</div>
<p><code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">launch</span></code> and <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span></code> have a similar interface, but are useful in different scenarios.</p>
<table class="table">
<thead>
<tr class="row-odd"><th class="head"><p><code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">launch</span></code> (cluster jobs)</p></th>
<th class="head"><p><code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span></code> (managed jobs)</p></th>
</tr>
</thead>
<tbody>
<tr class="row-even"><td><p>Long-lived, manually managed cluster</p></td>
<td><p>Dedicated auto-managed cluster for each job</p></td>
</tr>
<tr class="row-odd"><td><p>Failures must be manually recovered</p></td>
<td><p>Failures can be auto-recovered</p></td>
</tr>
<tr class="row-even"><td><p>Number of parallel jobs limited by cluster resources</p></td>
<td><p>Easily manage hundreds or thousands of jobs at once</p></td>
</tr>
<tr class="row-odd"><td><p>Good for interactive dev</p></td>
<td><p>Good for scaling out production jobs</p></td>
</tr>
</tbody>
</table>
<section id="work-with-managed-jobs">
<h3>Work with managed jobs<a class="headerlink" href="#work-with-managed-jobs" title="Permalink to this heading">#</a></h3>
<p>For a list of all commands and options, run <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">--help</span></code> or read the <a class="reference internal" href="../reference/cli.html#cli"><span class="std std-ref">CLI reference</span></a>.</p>
<p>See a list of managed jobs:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>queue
</pre></div>
</div>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="go">Fetching managed jobs...</span>
<span class="go">Managed jobs:</span>
<span class="go">ID  NAME           RESOURCES    SUBMITTED  TOT. DURATION  JOB DURATION  #RECOVERIES  STATUS</span>
<span class="go">2   qwen-rl        1x [H200:8]  2 hrs ago  2h 47m 18s     2h 36m 18s    0            RUNNING</span>
<span class="go">1   qwen-finetune  1x [B200:8]  4 hrs ago  4h 24m 26s     4h 17m 54s    0            RUNNING</span>
</pre></div>
</div>
<p>This command shows 50 managed jobs by default, use <code class="docutils literal notranslate"><span class="pre">--limit</span> <span class="pre">&lt;num&gt;</span></code> to show more jobs or use <code class="docutils literal notranslate"><span class="pre">--all</span></code> to show all jobs.</p>
<p>Stream the logs of a running managed job:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>logs<span class="w"> </span>-n<span class="w"> </span>qwen-finetune<span class="w">  </span><span class="c1"># by name</span>
<span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>logs<span class="w"> </span><span class="m">2</span><span class="w">           </span><span class="c1"># by job ID</span>
</pre></div>
</div>
<p>Cancel a managed job:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>cancel<span class="w"> </span>-n<span class="w"> </span>qwen-finetune<span class="w">  </span><span class="c1"># by name</span>
<span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>cancel<span class="w"> </span><span class="m">2</span><span class="w">           </span><span class="c1"># by job ID</span>
</pre></div>
</div>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>If any failure happens for a managed job, you can check <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">queue</span> <span class="pre">-a</span></code> for the brief reason
of the failure. For more details related to provisioning, check <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">logs</span> <span class="pre">--controller</span> <span class="pre">&lt;job_id&gt;</span></code>.</p>
</div>
</section>
<section id="viewing-jobs-in-dashboard">
<h3>Viewing jobs in dashboard<a class="headerlink" href="#viewing-jobs-in-dashboard" title="Permalink to this heading">#</a></h3>
<p>The SkyPilot dashboard, <code class="docutils literal notranslate"><span class="pre">sky</span> <span class="pre">dashboard</span></code> has a <strong>Jobs</strong> page that shows all managed jobs.</p>
<a class="reference internal image-reference" href="../_images/dashboard-managed-jobs.png"><img alt="Managed jobs dashboard" src="../_images/dashboard-managed-jobs.png" style="width: 800px;" /></a>
<p>The UI shows the same information as the CLI <code class="docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">queue</span> <span class="pre">-au</span></code>.</p>
</section>
</section>
<section id="checkpointing-and-recovery">
<span id="checkpointing"></span><h2>Checkpointing and recovery<a class="headerlink" href="#checkpointing-and-recovery" title="Permalink to this heading">#</a></h2>
<p>To recover quickly from failures (hardware issues, preemptions, etc.), your job should checkpoint its state periodically to persistent storage. When a job is auto-recovered after a failure, it can reload the latest checkpoint and resume from there instead of starting over.</p>
<p>SkyPilot supports several persistent storage options for checkpointing:</p>
<section id="using-kubernetes-volumes">
<h3>Using Kubernetes volumes<a class="headerlink" href="#using-kubernetes-volumes" title="Permalink to this heading">#</a></h3>
<p>On Kubernetes, <a class="reference internal" href="../reference/volumes.html#volumes-on-kubernetes"><span class="std std-ref">persistent volumes</span></a> provide high-performance storage for checkpoints. Volumes are ideal when your jobs run on Kubernetes clusters with shared filesystems (NFS, JuiceFS, Nebius shared filesystem, etc.).</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">resources</span><span class="p">:</span>
<span class="w">  </span><span class="nt">infra</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">k8s</span>

<span class="nt">volumes</span><span class="p">:</span>
<span class="w">  </span><span class="nt">/checkpoint</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">my-volume</span><span class="w">  </span><span class="c1"># Mount a persistent volume</span>

<span class="nt">run</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no"># Your training script saves checkpoints to /checkpoint</span>
<span class="w">  </span><span class="no">python train.py --checkpoint-dir /checkpoint</span>
</pre></div>
</div>
<p>Volumes offer better performance than cloud buckets. See <a class="reference internal" href="../reference/volumes.html#volumes-all"><span class="std std-ref">Volumes</span></a> for setup instructions.</p>
</section>
<section id="using-cloud-buckets">
<h3>Using cloud buckets<a class="headerlink" href="#using-cloud-buckets" title="Permalink to this heading">#</a></h3>
<p>In cases where a volume is not available, use <a class="reference internal" href="../reference/storage.html#sky-storage"><span class="std std-ref">cloud bucket mounts</span></a>:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">file_mounts</span><span class="p">:</span>
<span class="w">  </span><span class="nt">/checkpoint</span><span class="p">:</span>
<span class="w">    </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="c1"># NOTE: Fill in your bucket name</span>
<span class="w">    </span><span class="nt">mode</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">MOUNT_CACHED</span><span class="w"> </span><span class="c1"># or MOUNT</span>
</pre></div>
</div>
<p>To learn more about the different modes, see <a class="reference internal" href="../reference/storage.html#sky-storage"><span class="std std-ref">SkyPilot bucket mounting</span></a> and <a class="reference internal" href="../reference/training-guide.html#training-guide"><span class="std std-ref">high-performance training</span></a>.</p>
</section>
<section id="real-world-examples">
<h3>Real-world examples<a class="headerlink" href="#real-world-examples" title="Permalink to this heading">#</a></h3>
<p>See the <a class="reference internal" href="../reference/training-guide.html#training-guide"><span class="std std-ref">Model training guide</span></a> for more training examples and best practices.</p>
</section>
<section id="recovering-from-application-failures">
<span id="failure-recovery"></span><h3>Recovering from application failures<a class="headerlink" href="#recovering-from-application-failures" title="Permalink to this heading">#</a></h3>
<p>Hardware failures (e.g., node crashes) and preemptions are auto-recovered by default. However, <strong>user code failures (non-zero exit codes) are not auto-recovered by default</strong>.</p>
<p>In many cases, you’ll want jobs to automatically restart on application errors that are actually caused by transient hardware issues. For instance, if a training job crashes due to an NVIDIA driver issue or NCCL timeout, it should be recovered. To enable this, set <code class="code docutils literal notranslate"><span class="pre">max_restarts_on_errors</span></code> in <code class="code docutils literal notranslate"><span class="pre">resources.job_recovery</span></code> in the <a class="reference internal" href="../reference/yaml-spec.html#yaml-spec"><span class="std std-ref">SkyPilot YAML</span></a>.</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">resources</span><span class="p">:</span>
<span class="w">  </span><span class="nt">accelerators</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">A100:8</span>
<span class="w">  </span><span class="nt">job_recovery</span><span class="p">:</span>
<span class="w">    </span><span class="c1"># Restart the job up to 3 times on user code errors.</span>
<span class="w">    </span><span class="nt">max_restarts_on_errors</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">3</span>
</pre></div>
</div>
<p>This will restart the job, up to 3 times (for a total of 4 attempts), if your code has any non-zero exit code. Each restart runs on a newly provisioned temporary cluster.</p>
<section id="recovering-on-specific-exit-codes">
<h4>Recovering on specific exit codes<a class="headerlink" href="#recovering-on-specific-exit-codes" title="Permalink to this heading">#</a></h4>
<p>You can also specify a list of exit codes that should always trigger recovery, regardless of the <code class="code docutils literal notranslate"><span class="pre">max_restarts_on_errors</span></code> limit. This is useful when certain exit codes indicate transient errors that should always be retried (e.g., NCCL timeouts, specific GPU driver issues).</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">resources</span><span class="p">:</span>
<span class="w">  </span><span class="nt">accelerators</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">A100:8</span>
<span class="w">  </span><span class="nt">job_recovery</span><span class="p">:</span>
<span class="w">    </span><span class="nt">max_restarts_on_errors</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">3</span>
<span class="w">    </span><span class="c1"># Always recover if the job exits with code 33 or 34.</span>
<span class="w">    </span><span class="c1"># In a multi-node job, recovery is triggered if any node exits with a code in [33, 34].</span>
<span class="w">    </span><span class="c1"># Can also use a single integer: recover_on_exit_codes: 33</span>
<span class="w">    </span><span class="nt">recover_on_exit_codes</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">[</span><span class="nv">33</span><span class="p p-Indicator">,</span><span class="w"> </span><span class="nv">34</span><span class="p p-Indicator">]</span>
</pre></div>
</div>
<p>In this configuration:</p>
<ul class="simple">
<li><p>If the job exits with code 33 or 34, it will be recovered. Restarts triggered by these specific exit codes do not count towards the <cite>max_restarts_on_errors</cite> limit.</p></li>
<li><p>For any other non-zero exit code, the job will be recovered up to 3 times (as specified by <code class="code docutils literal notranslate"><span class="pre">max_restarts_on_errors</span></code>)</p></li>
</ul>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>For multi-node jobs, recovery is triggered if <strong>any</strong> node exits with a code in <code class="code docutils literal notranslate"><span class="pre">recover_on_exit_codes</span></code>.</p>
</div>
<div class="admonition warning">
<p class="admonition-title">Warning</p>
<p>You should <strong>not</strong> use exit code 137 in <code class="code docutils literal notranslate"><span class="pre">recover_on_exit_codes</span></code>. This code is used internally by SkyPilot and including it may interfere with proper recovery behavior.</p>
</div>
</section>
</section>
<section id="when-will-my-job-be-recovered">
<h3>When will my job be recovered?<a class="headerlink" href="#when-will-my-job-be-recovered" title="Permalink to this heading">#</a></h3>
<p>Here’s how various kinds of failures will be handled by SkyPilot:</p>
<table class="table">
<colgroup>
<col style="width: 33.3%" />
<col style="width: 66.7%" />
</colgroup>
<tbody>
<tr class="row-odd"><td><p>Hardware fails (GPU errors, node crashes, preemptions):</p></td>
<td><p>Tear down the old temporary cluster and provision a new one in another region, then restart the job.</p></td>
</tr>
<tr class="row-even"><td><p>User code fails (<code class="code docutils literal notranslate"><span class="pre">setup</span></code> or <code class="code docutils literal notranslate"><span class="pre">run</span></code> commands have non-zero exit code):</p></td>
<td><p>If the exit code is in <code class="code docutils literal notranslate"><span class="pre">recover_on_exit_codes</span></code>, always restart. Otherwise, if <code class="code docutils literal notranslate"><span class="pre">max_restarts_on_errors</span></code> is set, restart up to that many times. If neither condition is met, set the job to <code class="code docutils literal notranslate"><span class="pre">FAILED</span></code> or <code class="code docutils literal notranslate"><span class="pre">FAILED_SETUP</span></code>.</p></td>
</tr>
<tr class="row-odd"><td><p>Can’t find available resources due to capacity:</p></td>
<td><p>Try other infra (clusters, regions, or clouds) indefinitely until resources are found.</p></td>
</tr>
<tr class="row-even"><td><p>Cloud config/auth issue or invalid job configuration:</p></td>
<td><p>Mark the job as <code class="code docutils literal notranslate"><span class="pre">FAILED_PRECHECKS</span></code> and exit. Won’t be retried.</p></td>
</tr>
</tbody>
</table>
<p>To see the logs of user code (<code class="code docutils literal notranslate"><span class="pre">setup</span></code> or <code class="code docutils literal notranslate"><span class="pre">run</span></code> commands), use <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">logs</span> <span class="pre">&lt;job_id&gt;</span></code>. If there is a provisioning or recovery issue, you can see the provisioning logs by running <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">logs</span> <span class="pre">--controller</span> <span class="pre">&lt;job_id&gt;</span></code>.</p>
<div class="admonition tip">
<p class="admonition-title">Tip</p>
<p>Under the hood, SkyPilot uses a “controller” to provision, monitor, and recover the underlying temporary clusters. See <a class="reference internal" href="#jobs-controller"><span class="std std-ref">How it works</span></a>.</p>
</div>
</section>
</section>
<section id="running-on-spot-instances-optional">
<span id="spot-jobs"></span><h2>Running on spot instances (optional)<a class="headerlink" href="#running-on-spot-instances-optional" title="Permalink to this heading">#</a></h2>
<p>To reduce costs, managed jobs can optionally run on spot instances. Spot preemptions are auto-recovered by SkyPilot, just like hardware failures.</p>
<p>To run on spot instances, use <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span> <span class="pre">--use-spot</span></code>, or specify <code class="code docutils literal notranslate"><span class="pre">use_spot:</span> <span class="pre">true</span></code> in your SkyPilot YAML.</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">spot-job</span>

<span class="nt">resources</span><span class="p">:</span>
<span class="w">  </span><span class="nt">accelerators</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">A100:8</span>
<span class="w">  </span><span class="nt">use_spot</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">true</span>

<span class="nt">run</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">...</span>
</pre></div>
</div>
<div class="admonition tip">
<p class="admonition-title">Tip</p>
<p>Spot instances are cloud VMs that may be “preempted”.
The cloud provider can forcibly shut down the underlying VM and remove your access to it, interrupting the job running on that instance.</p>
<p>In exchange, spot instances are significantly cheaper than normal instances that are not subject to preemption (so-called “on-demand” instances).
Depending on the cloud and VM type, spot instances can be 70-90% cheaper.</p>
</div>
<p>SkyPilot automatically finds available spot instances across regions and clouds to maximize availability.
Any spot preemptions are automatically handled by SkyPilot without user intervention.</p>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>By default, a job will be restarted from scratch after each recovery (whether from preemption or hardware failure).
To avoid redoing work after recovery, implement <a class="reference internal" href="#checkpointing"><span class="std std-ref">checkpointing</span></a>.
Your application code can checkpoint its progress periodically to persistent storage (a <a class="reference internal" href="../reference/volumes.html#volumes-on-kubernetes"><span class="std std-ref">Kubernetes volume</span></a> or <a class="reference internal" href="../reference/storage.html#sky-storage"><span class="std std-ref">cloud bucket</span></a>). The program can then reload the latest checkpoint when restarted.</p>
</div>
<p>Here is <a class="reference internal" href="../reference/training-guide.html#qwen"><span class="std std-ref">an example of a training job</span></a> failing over different regions across AWS and GCP.</p>
<a class="reference internal image-reference" href="https://i.imgur.com/Vteg3fK.gif"><img alt="GIF for managed job auto-recovery across regions" class="align-center" src="https://i.imgur.com/Vteg3fK.gif" style="width: 600px;" /></a>
<p>Quick comparison between <em>managed spot jobs</em> vs. <em>launching unmanaged spot clusters</em>:</p>
<table class="table">
<colgroup>
<col style="width: 31.6%" />
<col style="width: 18.9%" />
<col style="width: 12.6%" />
<col style="width: 36.8%" />
</colgroup>
<thead>
<tr class="row-odd"><th class="head"><p>Command</p></th>
<th class="head"><p>Managed?</p></th>
<th class="head"><p>SSH-able?</p></th>
<th class="head"><p>Best for</p></th>
</tr>
</thead>
<tbody>
<tr class="row-even"><td><p><code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span> <span class="pre">--use-spot</span></code></p></td>
<td><p>Yes, preemptions are auto-recovered</p></td>
<td><p>No</p></td>
<td><p>Scaling out long-running jobs (e.g., data processing, training, batch inference)</p></td>
</tr>
<tr class="row-odd"><td><p><code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">launch</span> <span class="pre">--use-spot</span></code></p></td>
<td><p>No, preemptions are not handled</p></td>
<td><p>Yes</p></td>
<td><p>Interactive dev on spot instances (especially for hardware with low preemption rates)</p></td>
</tr>
</tbody>
</table>
<section id="either-spot-or-on-demand-reserved">
<h3>Either spot or on-demand/reserved<a class="headerlink" href="#either-spot-or-on-demand-reserved" title="Permalink to this heading">#</a></h3>
<p>By default, on-demand instances will be used (not spot instances). To use spot instances, you must specify <code class="code docutils literal notranslate"><span class="pre">--use-spot</span></code> on the command line or <code class="code docutils literal notranslate"><span class="pre">use_spot:</span> <span class="pre">true</span></code> in your SkyPilot YAML.</p>
<p>However, you can also tell SkyPilot to use <strong>both spot instance and on-demand instances</strong>, depending on availability. In your SkyPilot YAML, use <code class="docutils literal notranslate"><span class="pre">any_of</span></code> to specify either spot or on-demand/reserved instances as
candidate resources for a job. See documentation <a class="reference internal" href="auto-failover.html#multiple-resources"><span class="std std-ref">here</span></a> for more details.</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">resources</span><span class="p">:</span>
<span class="w">  </span><span class="nt">accelerators</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">A100:8</span>
<span class="w">  </span><span class="nt">any_of</span><span class="p">:</span>
<span class="w">    </span><span class="p p-Indicator">-</span><span class="w"> </span><span class="nt">use_spot</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">true</span>
<span class="w">    </span><span class="p p-Indicator">-</span><span class="w"> </span><span class="nt">use_spot</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">false</span>
</pre></div>
</div>
<p>In this example, SkyPilot will choose the cheapest resource to use, which almost certainly
will be spot instances. If spot instances are not available, SkyPilot will fall back to launching on-demand/reserved instances.</p>
</section>
</section>
<section id="scaling-to-many-jobs">
<span id="id2"></span><h2>Scaling to many jobs<a class="headerlink" href="#scaling-to-many-jobs" title="Permalink to this heading">#</a></h2>
<p>You can easily manage dozens, hundreds, or thousands of managed jobs at once. This is a great fit for batch jobs such as <strong>data processing</strong>, <strong>batch inference</strong>, or <strong>hyperparameter sweeps</strong>. To see an example launching many jobs in parallel, see <a class="reference internal" href="../running-jobs/many-jobs.html#many-jobs"><span class="std std-ref">Many Parallel Jobs</span></a>.</p>
<div class="admonition tip">
<p class="admonition-title">Tip</p>
<p>For workloads that can reuse the same environment across many jobs, consider using <a class="reference internal" href="pools.html#pool"><span class="std std-ref">Pools</span></a>. Pools provide faster cold-starts by maintaining a set of pre-provisioned workers that can be reused across job submissions.</p>
</div>
<p>To increase the maximum number of jobs that can run at once, see <a class="reference internal" href="../reference/api-server/api-server-tunning.html#consolidation-mode-resource-planning"><span class="std std-ref">Resource planning for managed jobs</span></a>.</p>
<section id="submitting-many-jobs-at-once-with-num-jobs">
<span id="num-jobs"></span><h3>Submitting many jobs at once with <code class="docutils literal notranslate"><span class="pre">--num-jobs</span></code><a class="headerlink" href="#submitting-many-jobs-at-once-with-num-jobs" title="Permalink to this heading">#</a></h3>
<p>When every job runs the same YAML and differs only in which slice of the work it
processes, use <code class="code docutils literal notranslate"><span class="pre">--num-jobs</span></code> to submit them all with one command:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>launch<span class="w"> </span>--num-jobs<span class="w"> </span><span class="m">10</span><span class="w"> </span>batch-job.yaml
</pre></div>
</div>
<p>This submits 10 independent managed jobs. Each job is launched on its own
cluster and is recovered independently if it is preempted or fails — exactly
as if you had run <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span></code> ten times.</p>
<p>Each job is given two environment variables that let it work out which slice of
the work is its own:</p>
<ul class="simple">
<li><p><code class="code docutils literal notranslate"><span class="pre">$SKYPILOT_JOB_RANK</span></code>: this job’s rank, an integer from <code class="code docutils literal notranslate"><span class="pre">0</span></code> to <code class="code docutils literal notranslate"><span class="pre">num_jobs</span> <span class="pre">-</span> <span class="pre">1</span></code>.</p></li>
<li><p><code class="code docutils literal notranslate"><span class="pre">$SKYPILOT_NUM_JOBS</span></code>: the total number of jobs submitted.</p></li>
</ul>
<p>Both are always set, so the same YAML also works when launched as a single job
(rank <code class="code docutils literal notranslate"><span class="pre">0</span></code> of <code class="code docutils literal notranslate"><span class="pre">1</span></code> job).</p>
<p>For example, to evaluate 1000 prompts across 10 jobs, job rank <code class="code docutils literal notranslate"><span class="pre">i</span></code> can
process prompts <code class="code docutils literal notranslate"><span class="pre">i</span> <span class="pre">*</span> <span class="pre">100</span></code> through <code class="code docutils literal notranslate"><span class="pre">(i</span> <span class="pre">+</span> <span class="pre">1)</span> <span class="pre">*</span> <span class="pre">100</span></code>:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="c1"># batch-job.yaml</span>
<span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">batch-workload</span>

<span class="nt">resources</span><span class="p">:</span>
<span class="w">  </span><span class="nt">accelerators</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">{</span><span class="nv">H100</span><span class="p p-Indicator">:</span><span class="nv">1</span><span class="p p-Indicator">,</span><span class="w"> </span><span class="nv">H200</span><span class="p p-Indicator">:</span><span class="nv">1</span><span class="p p-Indicator">}</span>

<span class="nt">run</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no">echo &quot;Job rank: $SKYPILOT_JOB_RANK out of $SKYPILOT_NUM_JOBS&quot;</span>
<span class="w">  </span><span class="no">echo &quot;Processing prompts from $(($SKYPILOT_JOB_RANK * 100)) to $((($SKYPILOT_JOB_RANK + 1) * 100))&quot;</span>
<span class="w">  </span><span class="no"># Actual business logic here...</span>
<span class="w">  </span><span class="no">echo &quot;Job $SKYPILOT_JOB_RANK finished&quot;</span>
</pre></div>
</div>
<p>Submitting it produces one job per rank:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>launch<span class="w"> </span>--num-jobs<span class="w"> </span><span class="m">10</span><span class="w"> </span>batch-job.yaml
<span class="go">YAML to run: batch-job.yaml</span>
<span class="go">Submitting 10 managed jobs. Each job will be launched on its own cluster.</span>
<span class="go">Managed job &#39;batch-workload&#39; will be launched on (estimated):</span>
<span class="go">...</span>
<span class="go">Launching 10 managed jobs &#39;batch-workload&#39;. Proceed? [Y/n]: Y</span>
<span class="go">Jobs submitted with IDs: 1-10.</span>
<span class="go">📋 Useful Commands</span>
<span class="go">├── Show all jobs:                      https://&lt;api-server&gt;/dashboard/jobs</span>
<span class="go">├── To stream job logs:                 sky jobs logs &lt;job-id&gt;</span>
<span class="go">├── To stream controller logs:          sky jobs logs --controller &lt;job-id&gt;</span>
<span class="go">└── To cancel all these jobs:           sky jobs cancel &lt;job-ids&gt;</span>
</pre></div>
</div>
<p>All 10 jobs are submitted immediately, but they do not necessarily all start at
once: how many run concurrently is bounded by the jobs controller’s capacity.
Jobs beyond that limit stay <code class="code docutils literal notranslate"><span class="pre">PENDING</span></code> and start as capacity frees up. See
<a class="reference internal" href="../reference/api-server/api-server-tunning.html#consolidation-mode-resource-planning"><span class="std std-ref">Resource planning for managed jobs</span></a> to raise the limit.</p>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>Use <code class="code docutils literal notranslate"><span class="pre">--num-jobs</span></code> when the jobs share one YAML — either because they
differ only by rank, or because each job works out its own assignment (e.g.,
a sweep agent that pulls its next configuration from a controller). If each
job needs different resources or a different launch command, launch them
separately instead — see <a class="reference internal" href="../running-jobs/many-jobs.html#many-jobs"><span class="std std-ref">Many Parallel Jobs</span></a> for that workflow.</p>
</div>
</section>
</section>
<section id="managed-pipelines">
<span id="pipeline"></span><h2>Managed pipelines<a class="headerlink" href="#managed-pipelines" title="Permalink to this heading">#</a></h2>
<p>A pipeline is a managed job that contains a sequence of tasks running one after another.</p>
<p>This is useful for running a sequence of tasks that depend on each other, e.g., training a model and then running inference on it.
Different tasks can have different resource requirements to use appropriate per-task resources, which saves costs, while  keeping the burden of managing the tasks off the user.</p>
<div class="admonition seealso">
<p class="admonition-title">See also</p>
<p><a class="reference internal" href="job-groups.html#job-groups"><span class="std std-ref">Job Groups for RL</span></a> for running multiple tasks <strong>in parallel</strong> instead of sequentially.</p>
</div>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>In other words, a managed job is either a single task, a pipeline (sequential tasks), or a <a class="reference internal" href="job-groups.html#job-groups"><span class="std std-ref">job group</span></a> (parallel tasks). All managed jobs are submitted by <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span></code>.</p>
</div>
<p>To run a pipeline, specify the sequence of tasks in a YAML file. Here is an example:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">pipeline</span>

<span class="nn">---</span>

<span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">train</span>

<span class="nt">resources</span><span class="p">:</span>
<span class="w">  </span><span class="nt">accelerators</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">V100:8</span>
<span class="w">  </span><span class="nt">any_of</span><span class="p">:</span>
<span class="w">    </span><span class="p p-Indicator">-</span><span class="w"> </span><span class="nt">use_spot</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">true</span>
<span class="w">    </span><span class="p p-Indicator">-</span><span class="w"> </span><span class="nt">use_spot</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">false</span>

<span class="nt">file_mounts</span><span class="p">:</span>
<span class="w">  </span><span class="nt">/checkpoint</span><span class="p">:</span>
<span class="w">    </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">train-eval</span><span class="w"> </span><span class="c1"># NOTE: Fill in your bucket name</span>
<span class="w">    </span><span class="nt">mode</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">MOUNT</span>

<span class="nt">setup</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no">echo setup for training</span>

<span class="nt">run</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no">echo run for training</span>
<span class="w">  </span><span class="no">echo save checkpoints to /checkpoint</span>

<span class="nn">---</span>

<span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">eval</span>

<span class="nt">resources</span><span class="p">:</span>
<span class="w">  </span><span class="nt">accelerators</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">T4:1</span>
<span class="w">  </span><span class="nt">use_spot</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">false</span>

<span class="nt">file_mounts</span><span class="p">:</span>
<span class="w">  </span><span class="nt">/checkpoint</span><span class="p">:</span>
<span class="w">    </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">train-eval</span><span class="w"> </span><span class="c1"># NOTE: Fill in your bucket name</span>
<span class="w">    </span><span class="nt">mode</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">MOUNT</span>

<span class="nt">setup</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no">echo setup for eval</span>

<span class="nt">run</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no">echo load trained model from /checkpoint</span>
<span class="w">  </span><span class="no">echo eval model on test set</span>
</pre></div>
</div>
<p>The YAML above defines a pipeline with two tasks. The first <code class="code docutils literal notranslate"><span class="pre">name:</span>
<span class="pre">pipeline</span></code> names the pipeline. The first task has name <code class="code docutils literal notranslate"><span class="pre">train</span></code> and the
second task has name <code class="code docutils literal notranslate"><span class="pre">eval</span></code>. The tasks are separated by a line with three
dashes <code class="code docutils literal notranslate"><span class="pre">---</span></code>. Each task has its own <code class="code docutils literal notranslate"><span class="pre">resources</span></code>, <code class="code docutils literal notranslate"><span class="pre">setup</span></code>, and
<code class="code docutils literal notranslate"><span class="pre">run</span></code> sections. Tasks are executed sequentially. If a task fails, later tasks are skipped.</p>
<div class="admonition tip">
<p class="admonition-title">Tip</p>
<p>To explicitly indicate a pipeline (sequential execution), you can add
<code class="code docutils literal notranslate"><span class="pre">execution:</span> <span class="pre">serial</span></code> to the header. This is optional since pipelines
are the default when <code class="code docutils literal notranslate"><span class="pre">execution</span></code> is omitted. Use <code class="code docutils literal notranslate"><span class="pre">execution:</span> <span class="pre">parallel</span></code>
for <a class="reference internal" href="job-groups.html#job-groups"><span class="std std-ref">job groups</span></a> instead.</p>
</div>
<p>To pass data between the tasks, use a shared file mount. In this example, the <code class="code docutils literal notranslate"><span class="pre">train</span></code> task writes its output to the <code class="code docutils literal notranslate"><span class="pre">/checkpoint</span></code> file mount, which the <code class="code docutils literal notranslate"><span class="pre">eval</span></code> task is then able to read from.</p>
<p>To submit the pipeline, the same command <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span></code> is used. The pipeline will be automatically launched and monitored by SkyPilot. You can check the status of the pipeline with <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">queue</span></code> or <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">dashboard</span></code>.</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>launch<span class="w"> </span>-n<span class="w"> </span>pipeline<span class="w"> </span>pipeline.yaml

<span class="gp">$ </span>sky<span class="w"> </span><span class="nb">jobs</span><span class="w"> </span>queue

<span class="go">Fetching managed job statuses...</span>
<span class="go">Managed jobs</span>
<span class="go">In progress jobs: 1 RECOVERING</span>
<span class="go">ID  TASK  NAME      REQUESTED                    SUBMITTED    TOT. DURATION  JOB DURATION  #RECOVERIES  STATUS</span>
<span class="go">8         pipeline  -                            50 mins ago  47m 45s        -             1            RECOVERING</span>
<span class="go"> ↳  0     train     1x [V100:8][Spot|On-demand]  50 mins ago  47m 45s        -             1            RECOVERING</span>
<span class="go"> ↳  1     eval      1x [T4:1]                    -            -              -             0            PENDING</span>
</pre></div>
</div>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>The <code class="code docutils literal notranslate"><span class="pre">$SKYPILOT_TASK_ID</span></code> environment variable is also available in the <code class="code docutils literal notranslate"><span class="pre">run</span></code> section of each task. It is unique for each task in the pipeline.
For example, the <code class="code docutils literal notranslate"><span class="pre">$SKYPILOT_TASK_ID</span></code> for the <code class="code docutils literal notranslate"><span class="pre">eval</span></code> task above is:
“sky-managed-2022-10-06-05-17-09-750781_pipeline_eval_8-1”.</p>
</div>
</section>
<section id="file-uploads-for-managed-jobs">
<h2>File uploads for managed jobs<a class="headerlink" href="#file-uploads-for-managed-jobs" title="Permalink to this heading">#</a></h2>
<p>For managed jobs, SkyPilot uses an intermediate bucket to store files used in the task, such as local <code class="code docutils literal notranslate"><span class="pre">file_mounts</span></code> and the <code class="code docutils literal notranslate"><span class="pre">workdir</span></code>.</p>
<p>If you do not configure a bucket, SkyPilot will automatically create a temporary bucket named <code class="code docutils literal notranslate"><span class="pre">skypilot-filemounts-{username}-{run_id}</span></code> for each job launch. SkyPilot automatically deletes the bucket after the job completes.</p>
<p><strong>Object store access is not necessary to use managed jobs.</strong> If cloud object storage is not available (e.g., Kubernetes deployments), SkyPilot automatically falls back to a two-hop upload that copies files to the jobs controller and then downloads them to the jobs.</p>
<div class="admonition tip">
<p class="admonition-title">Tip</p>
<p>To force disable using cloud buckets even when available, set <a class="reference internal" href="../reference/config.html#config-yaml-jobs-force-disable-cloud-bucket"><span class="std std-ref">jobs.force_disable_cloud_bucket</span></a> in your config:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="c1"># ~/.sky/config.yaml</span>
<span class="nt">jobs</span><span class="p">:</span>
<span class="w">  </span><span class="nt">force_disable_cloud_bucket</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">true</span>
</pre></div>
</div>
</div>
<section id="setting-the-job-files-bucket">
<span id="intermediate-bucket"></span><h3>Setting the job files bucket<a class="headerlink" href="#setting-the-job-files-bucket" title="Permalink to this heading">#</a></h3>
<p>If you want to use a pre-provisioned bucket for storing intermediate files, set <code class="code docutils literal notranslate"><span class="pre">jobs.bucket</span></code> in <code class="code docutils literal notranslate"><span class="pre">~/.sky/config.yaml</span></code>:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="c1"># ~/.sky/config.yaml</span>
<span class="nt">jobs</span><span class="p">:</span>
<span class="w">  </span><span class="nt">bucket</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">s3://my-bucket</span><span class="w">  </span><span class="c1"># Supports s3://, gs://, https://&lt;azure_storage_account&gt;.blob.core.windows.net/&lt;container&gt;, r2://, cos://&lt;region&gt;/&lt;bucket&gt;</span>
</pre></div>
</div>
<p>If you choose to specify a bucket, ensure that the bucket already exists and that you have the necessary permissions.</p>
<p>When using a pre-provisioned intermediate bucket with <code class="code docutils literal notranslate"><span class="pre">jobs.bucket</span></code>, SkyPilot creates job-specific directories under the bucket root to store files. They are organized in the following structure:</p>
<div class="highlight-text notranslate"><div class="highlight"><pre><span></span># cloud bucket, s3://my-bucket/ for example
my-bucket/
├── job-15891b25/            # Job-specific directory
│   ├── local-file-mounts/   # Files from local file mounts
│   ├── tmp-files/           # Temporary files
│   └── workdir/             # Files from workdir
└── job-cae228be/            # Another job&#39;s directory
    ├── local-file-mounts/
    ├── tmp-files/
    └── workdir/
</pre></div>
</div>
<p>When using a custom bucket (<code class="code docutils literal notranslate"><span class="pre">jobs.bucket</span></code>), the job-specific directories (e.g., <code class="code docutils literal notranslate"><span class="pre">job-15891b25/</span></code>) created by SkyPilot are removed when the job completes.</p>
<div class="admonition tip">
<p class="admonition-title">Tip</p>
<p>Multiple users can share the same intermediate bucket. Each user’s jobs will have their own unique job-specific directories, ensuring that files are kept separate and organized.</p>
</div>
</section>
</section>
<section id="calling-skypilot-api-from-within-managed-jobs">
<span id="nested-skypilot-managed-jobs"></span><h2>Calling SkyPilot API from within managed jobs<a class="headerlink" href="#calling-skypilot-api-from-within-managed-jobs" title="Permalink to this heading">#</a></h2>
<p>By default (<code class="code docutils literal notranslate"><span class="pre">api_server_access:</span> <span class="pre">true</span></code>), SkyPilot automatically injects API
server credentials into the job’s environment when the server supports it. This
means managed jobs can call the SkyPilot CLI/SDK to launch new workloads:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">setup</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no">pip install &quot;skypilot-nightly[remote]&quot;</span>

<span class="nt">run</span><span class="p">:</span><span class="w"> </span><span class="p p-Indicator">|</span>
<span class="w">  </span><span class="no">sky jobs launch -y -n nested --cpus 2 &quot;echo hello from nested job&quot;</span>
</pre></div>
</div>
<p>The credentials are automatically injected and revoked when the job finishes. To disable this, set <code class="code docutils literal notranslate"><span class="pre">api_server_access:</span> <span class="pre">false</span></code>.</p>
<p>When the launching job is a task of a <a class="reference internal" href="job-groups.html#job-groups"><span class="std std-ref">job group</span></a>, the new job attaches to that group: it is listed under the group and cancelled with it. See <a class="reference internal" href="job-groups.html#job-groups-dynamic-members"><span class="std std-ref">Launching jobs from inside a job group</span></a>. Pass <code class="code docutils literal notranslate"><span class="pre">--no-job-group</span></code> to launch a top-level job instead.</p>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>Credential injection requires the SkyPilot API server to have <a class="reference internal" href="../reference/auth.html#service-accounts"><span class="std std-ref">service accounts</span></a> enabled. If not enabled, injection is silently skipped.</p>
</div>
</section>
<section id="how-it-works">
<span id="jobs-controller"></span><h2>How it works<a class="headerlink" href="#how-it-works" title="Permalink to this heading">#</a></h2>
<p>Under the hood, SkyPilot manages the full lifecycle of each managed job: provisioning temporary clusters, monitoring job health, recovering from failures, and cleaning up resources.</p>
<p>With a <a class="reference internal" href="../reference/api-server/api-server.html#sky-api-server-remote"><span class="std std-ref">remote SkyPilot API server</span></a>, the API server manages jobs directly. The number of jobs that can run in parallel is bounded by the total memory available to the API server. See <a class="reference internal" href="../reference/api-server/api-server-tunning.html#consolidation-mode-resource-planning"><span class="std std-ref">Resource planning for managed jobs</span></a> for a capacity table and tuning guidance.</p>
<div class="admonition tip" id="jobs-consolidation-mode">
<p class="admonition-title">Tip</p>
<p>This is referred to as “consolidation mode” in <a class="reference internal" href="../reference/config.html#config-yaml-jobs-controller-consolidation-mode"><span class="std std-ref">SkyPilot configuration</span></a>.</p>
</div>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>When using a <a class="reference internal" href="../reference/api-server/api-server-upgrade.html#sky-api-server-upgrade-strategy"><span class="std std-ref">RollingUpdate upgrade strategy</span></a>, local <code class="docutils literal notranslate"><span class="pre">file_mounts</span></code> and <code class="docutils literal notranslate"><span class="pre">workdir</span></code> for managed jobs are stored on the pod’s ephemeral filesystem and may be lost when the old pod is replaced. To avoid this, enable <a class="reference internal" href="../reference/api-server/helm-values-spec.html#helm-values-storage-enabled"><span class="std std-ref">persistent storage</span></a> with a <code class="docutils literal notranslate"><span class="pre">ReadWriteMany</span></code> (RWX) PVC, or use <a class="reference internal" href="../reference/storage.html#sky-storage"><span class="std std-ref">cloud buckets</span></a> / <a class="reference internal" href="../reference/volumes.html#volumes-on-kubernetes"><span class="std std-ref">volumes</span></a> / <a class="reference internal" href="syncing-code-artifacts.html#sync-code-and-project-files-git"><span class="std std-ref">git</span></a> instead of local paths.</p>
</div>
<section id="legacy-using-a-remote-jobs-controller">
<span id="jobs-controller-remote"></span><h3>[Legacy] Using a remote jobs controller<a class="headerlink" href="#legacy-using-a-remote-jobs-controller" title="Permalink to this heading">#</a></h3>
<p>Alternatively, SkyPilot can launch a dedicated <strong>jobs controller</strong> – a small on-demand CPU VM or Kubernetes pod – to manage all jobs. This is used automatically when running with a local API server (no remote server deployed), or can be explicitly enabled.</p>
<a class="reference internal image-reference" href="../_images/jobs-consolidation-mode.svg"><img alt="Architecture diagram of SkyPilot remote API server with and without a remote jobs controller" class="align-center" src="../_images/jobs-consolidation-mode.svg" width="800" /></a>
<p>To use a remote jobs controller with a remote API server, set <code class="docutils literal notranslate"><span class="pre">consolidation_mode:</span> <span class="pre">false</span></code>:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="c1"># ~/.sky/config.yaml</span>
<span class="nt">jobs</span><span class="p">:</span>
<span class="w">  </span><span class="nt">controller</span><span class="p">:</span>
<span class="w">    </span><span class="nt">consolidation_mode</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">false</span>
</pre></div>
</div>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>You must <strong>restart the API server</strong> after changing this setting for it to take effect.</p>
</div>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>If you were using managed jobs before upgrading to a version with consolidation mode, your existing remote jobs controller will continue to be used automatically. See <a class="reference internal" href="#migrating-from-remote-controller"><span class="std std-ref">Migrating from a remote jobs controller</span></a> to switch to the default mode.</p>
</div>
<p>The controller cluster is automatically launched when the first managed job is submitted, and it is autostopped after it has been idle for 10 minutes (i.e., after all managed jobs finish and no new managed job is submitted in that duration).
Thus, <strong>no user action is needed</strong> to manage its lifecycle.</p>
<p>You can see the controller with <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">status</span> <span class="pre">-u</span></code> and refresh its status by using the <code class="code docutils literal notranslate"><span class="pre">-r/--refresh</span></code> flag.</p>
<p>While the cost of the jobs controller is negligible (~$0.25/hour when running and less than $0.004/hour when stopped),
you can still tear it down manually with
<code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">down</span> <span class="pre">&lt;job-controller-name&gt;</span></code>, where the <code class="docutils literal notranslate"><span class="pre">&lt;job-controller-name&gt;</span></code> can be found in the output of <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">status</span> <span class="pre">-u</span></code>.</p>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>Tearing down the jobs controller loses all logs and status information for the finished managed jobs. It is only allowed when there are no in-progress managed jobs to ensure no resource leakage.</p>
</div>
<section id="high-availability-controller">
<span id="managed-jobs-high-availability-controller"></span><h4>High availability controller<a class="headerlink" href="#high-availability-controller" title="Permalink to this heading">#</a></h4>
<div class="admonition warning">
<p class="admonition-title">Warning</p>
<p><strong>Deprecated.</strong> HA mode for the remote jobs controller is deprecated. By default, the API server runs the jobs controller directly via <a class="reference internal" href="#jobs-consolidation-mode"><span class="std std-ref">consolidation mode</span></a>, which already provides resilience through the Kubernetes Deployment and persistent database — no separate HA controller is needed.</p>
</div>
<p>High availability mode ensures the remote controller cluster remains resilient to failures by running it as a Kubernetes Deployment with automatic restarts and persistent storage. This helps maintain management capabilities even if the controller pod crashes or the node fails.</p>
<p>To enable high availability for Managed Jobs, set the <code class="docutils literal notranslate"><span class="pre">high_availability</span></code> flag to <code class="docutils literal notranslate"><span class="pre">true</span></code> under <code class="docutils literal notranslate"><span class="pre">jobs.controller</span></code> in your <code class="docutils literal notranslate"><span class="pre">~/.sky/config.yaml</span></code>, and ensure the controller runs on Kubernetes:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">jobs</span><span class="p">:</span>
<span class="w">  </span><span class="nt">controller</span><span class="p">:</span>
<span class="w">    </span><span class="nt">consolidation_mode</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">false</span>
<span class="hll"><span class="w">    </span><span class="nt">resources</span><span class="p">:</span>
</span><span class="hll"><span class="w">      </span><span class="nt">cloud</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">kubernetes</span>
</span><span class="w">    </span><span class="nt">high_availability</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">true</span>
</pre></div>
</div>
<p>This will deploy the controller as a Kubernetes Deployment with persistent storage, allowing automatic recovery on failures.</p>
</section>
<section id="using-long-lived-credentials">
<span id="managed-jobs-creds"></span><h4>Using long-lived credentials<a class="headerlink" href="#using-long-lived-credentials" title="Permalink to this heading">#</a></h4>
<p>Since the jobs controller is a long-lived instance that manages other cloud instances, it’s best to <strong>use static credentials that do not expire</strong>. If a credential expires, it could leave the controller with no way to clean up a job, leading to expensive cloud instance leaks.</p>
<p>To use long-lived static credentials for the jobs controller, just make sure the right credentials are in use by SkyPilot. They will be automatically uploaded to the jobs controller. <strong>If you’re already using local credentials that don’t expire, no action is needed.</strong></p>
<p>To set up credentials:</p>
<ul class="simple">
<li><p><strong>AWS</strong>: <a class="reference internal" href="../cloud-setup/cloud-permissions/aws.html#dedicated-aws-user"><span class="std std-ref">Create a dedicated SkyPilot IAM user</span></a> and use a static <code class="docutils literal notranslate"><span class="pre">~/.aws/credentials</span></code> file.</p></li>
<li><p><strong>GCP</strong>: <a class="reference internal" href="../cloud-setup/cloud-permissions/gcp.html#gcp-service-account"><span class="std std-ref">Create a GCP service account</span></a> with a static JSON key file.</p></li>
<li><p><strong>Other clouds</strong>: Make sure you are using credentials that do not expire.</p></li>
</ul>
</section>
<section id="customizing-controller-resources">
<span id="jobs-controller-custom-resources"></span><h4>Customizing controller resources<a class="headerlink" href="#customizing-controller-resources" title="Permalink to this heading">#</a></h4>
<p>You may want to customize the jobs controller resources for several reasons:</p>
<ol class="arabic simple">
<li><p>Increasing the maximum number of jobs that can be run concurrently, which is based on the controller’s memory allocation. (Default: ~600, see <a class="reference internal" href="#jobs-controller-sizing"><span class="std std-ref">best practices</span></a>)</p></li>
<li><p>Use a lower-cost controller (if you have a low number of concurrent managed jobs).</p></li>
<li><p>Enforcing the jobs controller to run on a specific location. (Default: cheapest location)</p></li>
<li><p>Changing the disk_size of the jobs controller to store more logs. (Default: 50GB)</p></li>
</ol>
<p>To achieve the above, you can specify custom configs in <code class="code docutils literal notranslate"><span class="pre">~/.sky/config.yaml</span></code> with the following fields:</p>
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">jobs</span><span class="p">:</span>
<span class="w">  </span><span class="c1"># NOTE: these settings only take effect for a new jobs controller, not if</span>
<span class="w">  </span><span class="c1"># you have an existing one.</span>
<span class="w">  </span><span class="nt">controller</span><span class="p">:</span>
<span class="w">    </span><span class="nt">resources</span><span class="p">:</span>
<span class="w">      </span><span class="c1"># All configs below are optional.</span>
<span class="w">      </span><span class="c1"># Specify the location of the jobs controller.</span>
<span class="w">      </span><span class="nt">infra</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">gcp/us-central1</span>
<span class="w">      </span><span class="c1"># Bump cpus to allow more managed jobs to be launched concurrently. (Default: 4+)</span>
<span class="w">      </span><span class="nt">cpus</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">8+</span>
<span class="w">      </span><span class="c1"># Bump memory to allow more managed jobs to be running at once.</span>
<span class="w">      </span><span class="c1"># By default, it scales with CPU (4x).</span>
<span class="w">      </span><span class="nt">memory</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">64+</span>
<span class="w">      </span><span class="c1"># Specify the disk_size in GB of the jobs controller.</span>
<span class="w">      </span><span class="nt">disk_size</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">100</span>
</pre></div>
</div>
<p>The <code class="code docutils literal notranslate"><span class="pre">resources</span></code> field has the same spec as a normal SkyPilot job; see <a class="reference external" href="https://docs.skypilot.co/en/latest/reference/yaml-spec.html">here</a>.</p>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>These settings will not take effect if you have an existing controller (either
stopped or live).  For them to take effect, tear down the existing controller
first, which requires all in-progress jobs to finish or be canceled.</p>
</div>
<p>To see your current jobs controller, use <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">status</span> <span class="pre">-u</span></code>.</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span>status<span class="w"> </span>-u<span class="w"> </span>--refresh

<span class="go">Clusters</span>
<span class="go">NAME                          INFRA             RESOURCES                                  STATUS   AUTOSTOP  LAUNCHED</span>
<span class="go">my-cluster-1                  AWS (us-east-1)   1x(cpus=16, m6i.4xlarge, ...)              STOPPED  -         1 week ago</span>
<span class="go">my-other-cluster              GCP (us-central1) 1x(cpus=16, n2-standard-16, ...)           STOPPED  -         1 week ago</span>
<span class="go">sky-jobs-controller-919df126  AWS (us-east-1)   1x(cpus=4, m6i.xlarge, disk_size=50)       STOPPED  10m       1 day ago</span>

<span class="go">Managed jobs</span>
<span class="go">No in-progress managed jobs.</span>

<span class="go">Services</span>
<span class="go">No live services.</span>
</pre></div>
</div>
<p>In this example, you can see the jobs controller (<code class="code docutils literal notranslate"><span class="pre">sky-jobs-controller-919df126</span></code>) is an m6i.xlarge on AWS, which is the default size.</p>
<p>To tear down the current controller, so that new resource config is picked up, use <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">down</span></code>.</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span>down<span class="w"> </span>sky-jobs-controller-919df126

<span class="go">WARNING: Tearing down the managed jobs controller. Please be aware of the following:</span>
<span class="go"> * All logs and status information of the managed jobs (output of `sky jobs queue`) will be lost.</span>
<span class="go"> * No in-progress managed jobs found. It should be safe to terminate (see caveats above).</span>
<span class="go">To proceed, please type &#39;delete&#39;: delete</span>
<span class="go">Terminating cluster sky-jobs-controller-919df126...done.</span>
<span class="go">Terminating 1 cluster ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% 0:00:00</span>
</pre></div>
</div>
<p>The next time you use <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">launch</span></code>, a new controller will be created with the updated resources.</p>
</section>
<section id="scaling-best-practices">
<span id="jobs-controller-sizing"></span><h4>Scaling best practices<a class="headerlink" href="#scaling-best-practices" title="Permalink to this heading">#</a></h4>
<div class="admonition tip">
<p class="admonition-title">Tip</p>
<p>It’s highly recommended to use <a class="reference internal" href="#managed-jobs-creds"><span class="std std-ref">long-lived credentials for cloud authentication</span></a>. This is so that the jobs controller credentials do not expire. This is particularly important in large production runs to avoid leaking resources.</p>
</div>
<p>The number of active jobs that the controller supports is based on available memory. There are two limits:</p>
<ul class="simple">
<li><p><strong>Actively launching job count</strong>: limit is <code class="docutils literal notranslate"><span class="pre">8</span> <span class="pre">*</span> <span class="pre">floor((memory</span> <span class="pre">-</span> <span class="pre">2GiB)</span> <span class="pre">/</span> <span class="pre">3.59GiB)</span></code>, with a maximum of 512 jobs.
A job counts towards this limit when it is first starting, launching instances, or recovering.</p>
<ul>
<li><p>The default controller size has 16 GiB memory, meaning <strong>24 jobs</strong> can be actively launching at once.</p></li>
</ul>
</li>
<li><p><strong>Running job count</strong>: limit is <code class="docutils literal notranslate"><span class="pre">200</span> <span class="pre">*</span> <span class="pre">floor((memory</span> <span class="pre">-</span> <span class="pre">2GiB)</span> <span class="pre">/</span> <span class="pre">3.59GiB)</span></code>, with a maximum of 2000 jobs.</p>
<ul>
<li><p>The default controller supports up to <strong>600 jobs</strong> running in parallel.</p></li>
</ul>
</li>
</ul>
<p>The default size is appropriate for most moderate use cases, but if you need to run hundreds or thousands of jobs at once, you should increase the controller size. Each additional ~3.6 GiB of controller memory adds capacity for 8 concurrent launches and 200 concurrently running jobs.</p>
<p>Increase CPU modestly as memory grows to keep controller responsiveness high, but note that the hard parallelism limits are driven by available memory.
A ratio of 4 GiB memory per CPU works well in our testing.</p>
<p>For absolute maximum parallelism, the following per-cloud configurations are recommended:</p>
<div class="sd-tab-set docutils">
<input checked="checked" id="sd-tab-item-0" name="sd-tab-set-0" type="radio">
</input><label class="sd-tab-label" for="sd-tab-item-0">
AWS</label><div class="sd-tab-content docutils">
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">jobs</span><span class="p">:</span>
<span class="w">  </span><span class="nt">controller</span><span class="p">:</span>
<span class="w">    </span><span class="nt">resources</span><span class="p">:</span>
<span class="w">      </span><span class="nt">infra</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">aws</span>
<span class="w">      </span><span class="nt">cpus</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">192</span>
<span class="w">      </span><span class="nt">memory</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">4x</span>
<span class="w">      </span><span class="nt">disk_size</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">500</span>
</pre></div>
</div>
</div>
<input id="sd-tab-item-1" name="sd-tab-set-0" type="radio">
</input><label class="sd-tab-label" for="sd-tab-item-1">
GCP</label><div class="sd-tab-content docutils">
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">jobs</span><span class="p">:</span>
<span class="w">  </span><span class="nt">controller</span><span class="p">:</span>
<span class="w">    </span><span class="nt">resources</span><span class="p">:</span>
<span class="w">      </span><span class="nt">infra</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">gcp</span>
<span class="w">      </span><span class="nt">cpus</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">128</span>
<span class="w">      </span><span class="nt">memory</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">4x</span>
<span class="w">      </span><span class="nt">disk_size</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">500</span>
</pre></div>
</div>
</div>
<input id="sd-tab-item-2" name="sd-tab-set-0" type="radio">
</input><label class="sd-tab-label" for="sd-tab-item-2">
Azure</label><div class="sd-tab-content docutils">
<div class="highlight-yaml notranslate"><div class="highlight"><pre><span></span><span class="nt">jobs</span><span class="p">:</span>
<span class="w">  </span><span class="nt">controller</span><span class="p">:</span>
<span class="w">    </span><span class="nt">resources</span><span class="p">:</span>
<span class="w">      </span><span class="nt">infra</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">azure</span>
<span class="w">      </span><span class="nt">cpus</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">96</span>
<span class="w">      </span><span class="nt">memory</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">4x</span>
<span class="w">      </span><span class="nt">disk_size</span><span class="p">:</span><span class="w"> </span><span class="l l-Scalar l-Scalar-Plain">500</span>
</pre></div>
</div>
</div>
</div>
<div class="admonition note">
<p class="admonition-title">Note</p>
<p>Remember to tear down your controller to apply these changes, as described above.</p>
</div>
<p>With this configuration, you can launch up to 512 jobs at once.</p>
</section>
<section id="migrating-from-a-remote-jobs-controller">
<span id="migrating-from-remote-controller"></span><h4>Migrating from a remote jobs controller<a class="headerlink" href="#migrating-from-a-remote-jobs-controller" title="Permalink to this heading">#</a></h4>
<p>If you were using managed jobs before upgrading to a version with default consolidation mode (0.12+), your existing remote jobs controller will continue to be used. SkyPilot does not auto-enable consolidation mode when an existing controller cluster is found.</p>
<p>To check if you have an existing controller:</p>
<div class="highlight-console notranslate"><div class="highlight"><pre><span></span><span class="gp">$ </span>sky<span class="w"> </span>status<span class="w"> </span>-u<span class="w"> </span><span class="p">|</span><span class="w"> </span>grep<span class="w"> </span>sky-jobs-controller
</pre></div>
</div>
<p>If a controller is listed, you are using a remote jobs controller. To migrate to the default mode (API server manages jobs directly):</p>
<ol class="arabic simple">
<li><p>Cancel all in-progress managed jobs: <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">jobs</span> <span class="pre">cancel</span> <span class="pre">-a</span></code></p></li>
<li><p>Tear down the controller: <code class="code docutils literal notranslate"><span class="pre">sky</span> <span class="pre">down</span> <span class="pre">&lt;controller-name&gt;</span></code></p></li>
<li><p>Restart the API server to pick up the change.</p></li>
</ol>
<p>After restart, the API server will manage jobs directly, and no separate controller cluster will be created.</p>
</section>
</section>
</section>
</section>


                </article>
              

              
              
              
              
                <footer class="prev-next-footer">
                  
<div class="prev-next-area">
    <a class="left-prev"
       href="../reference/auto-stop.html"
       title="previous page">
      <i class="fa-solid fa-angle-left"></i>
      <div class="prev-next-info">
        <p class="prev-next-subtitle">previous</p>
        <p class="prev-next-title">Autostop and Autodown</p>
      </div>
    </a>
    <a class="right-next"
       href="checkpointing.html"
       title="next page">
      <div class="prev-next-info">
        <p class="prev-next-subtitle">next</p>
        <p class="prev-next-title">Checkpointing and recovery</p>
      </div>
      <i class="fa-solid fa-angle-right"></i>
    </a>
</div>
                </footer>
              
            </div>
            
            
              
                <div class="bd-sidebar-secondary bd-toc"><div class="sidebar-secondary-items sidebar-secondary__inner">

  <div class="sidebar-secondary-item">

  <div class="page-toc tocsection onthispage">
    <i class="fa-solid fa-list"></i> On this page
  </div>
  <nav class="bd-toc-nav page-toc">
    <ul class="visible nav section-nav flex-column">
<li class="toc-h2 nav-item toc-entry"><a class="reference internal nav-link" href="#create-a-managed-job">Create a managed job</a><ul class="nav section-nav flex-column">
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#work-with-managed-jobs">Work with managed jobs</a></li>
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#viewing-jobs-in-dashboard">Viewing jobs in dashboard</a></li>
</ul>
</li>
<li class="toc-h2 nav-item toc-entry"><a class="reference internal nav-link" href="#checkpointing-and-recovery">Checkpointing and recovery</a><ul class="nav section-nav flex-column">
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#using-kubernetes-volumes">Using Kubernetes volumes</a></li>
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#using-cloud-buckets">Using cloud buckets</a></li>
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#real-world-examples">Real-world examples</a></li>
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#recovering-from-application-failures">Recovering from application failures</a><ul class="nav section-nav flex-column">
<li class="toc-h4 nav-item toc-entry"><a class="reference internal nav-link" href="#recovering-on-specific-exit-codes">Recovering on specific exit codes</a></li>
</ul>
</li>
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#when-will-my-job-be-recovered">When will my job be recovered?</a></li>
</ul>
</li>
<li class="toc-h2 nav-item toc-entry"><a class="reference internal nav-link" href="#running-on-spot-instances-optional">Running on spot instances (optional)</a><ul class="nav section-nav flex-column">
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#either-spot-or-on-demand-reserved">Either spot or on-demand/reserved</a></li>
</ul>
</li>
<li class="toc-h2 nav-item toc-entry"><a class="reference internal nav-link" href="#scaling-to-many-jobs">Scaling to many jobs</a><ul class="nav section-nav flex-column">
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#submitting-many-jobs-at-once-with-num-jobs">Submitting many jobs at once with <code class="docutils literal notranslate"><span class="pre">--num-jobs</span></code></a></li>
</ul>
</li>
<li class="toc-h2 nav-item toc-entry"><a class="reference internal nav-link" href="#managed-pipelines">Managed pipelines</a></li>
<li class="toc-h2 nav-item toc-entry"><a class="reference internal nav-link" href="#file-uploads-for-managed-jobs">File uploads for managed jobs</a><ul class="nav section-nav flex-column">
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#setting-the-job-files-bucket">Setting the job files bucket</a></li>
</ul>
</li>
<li class="toc-h2 nav-item toc-entry"><a class="reference internal nav-link" href="#calling-skypilot-api-from-within-managed-jobs">Calling SkyPilot API from within managed jobs</a></li>
<li class="toc-h2 nav-item toc-entry"><a class="reference internal nav-link" href="#how-it-works">How it works</a><ul class="nav section-nav flex-column">
<li class="toc-h3 nav-item toc-entry"><a class="reference internal nav-link" href="#legacy-using-a-remote-jobs-controller">[Legacy] Using a remote jobs controller</a><ul class="nav section-nav flex-column">
<li class="toc-h4 nav-item toc-entry"><a class="reference internal nav-link" href="#high-availability-controller">High availability controller</a></li>
<li class="toc-h4 nav-item toc-entry"><a class="reference internal nav-link" href="#using-long-lived-credentials">Using long-lived credentials</a></li>
<li class="toc-h4 nav-item toc-entry"><a class="reference internal nav-link" href="#customizing-controller-resources">Customizing controller resources</a></li>
<li class="toc-h4 nav-item toc-entry"><a class="reference internal nav-link" href="#scaling-best-practices">Scaling best practices</a></li>
<li class="toc-h4 nav-item toc-entry"><a class="reference internal nav-link" href="#migrating-from-a-remote-jobs-controller">Migrating from a remote jobs controller</a></li>
</ul>
</li>
</ul>
</li>
</ul>
  </nav></div>

  <div class="sidebar-secondary-item">

  
  <div class="tocsection editthispage">
    <a href="https://github.com/skypilot-org/skypilot/edit/master/docs/source/examples/managed-jobs.rst">
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
  <script src="../_static/scripts/bootstrap.js?digest=5b4479735964841361fd"></script>
<script src="../_static/scripts/pydata-sphinx-theme.js?digest=5b4479735964841361fd"></script>

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