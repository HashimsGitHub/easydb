import { Tier, TIERS, formatBytes } from "./tiers";

// Themed replacement for window.alert/confirm/prompt. Exposes async
// edbAlert(message, opts), edbConfirm(message, opts) and edbPrompt(message, defaultValue, opts).
const DIALOG_SNIPPET = `
  <div id="edb-dialog" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edb-dialog-title">
    <div id="edb-dialog-backdrop" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
    <div class="relative w-full max-w-md rounded-2xl border border-slate-700/70 bg-[#0d1424] shadow-2xl shadow-black/60 overflow-hidden">
      <div id="edb-dialog-accent" class="h-1 bg-gradient-to-r from-brand-500 to-blue-500"></div>
      <div class="p-6 space-y-4">
        <div class="flex items-start gap-3">
          <div id="edb-dialog-icon" class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-brand-500/10 text-brand-400 border border-brand-500/30 text-lg font-bold">i</div>
          <div class="min-w-0 flex-1">
            <h3 id="edb-dialog-title" class="text-base font-bold text-white"></h3>
            <p id="edb-dialog-message" class="mt-1.5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words"></p>
          </div>
        </div>
        <input id="edb-dialog-input" type="text" class="hidden w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" autocomplete="off">
        <div class="flex justify-end gap-2 pt-1">
          <button id="edb-dialog-cancel" type="button" class="hidden px-4 py-2 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition">Cancel</button>
          <button id="edb-dialog-ok" type="button" class="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-brand-500/20">OK</button>
        </div>
      </div>
    </div>
  </div>
  <script>
    (function () {
      var root = document.getElementById('edb-dialog');
      var titleEl = document.getElementById('edb-dialog-title');
      var msgEl = document.getElementById('edb-dialog-message');
      var inputEl = document.getElementById('edb-dialog-input');
      var okBtn = document.getElementById('edb-dialog-ok');
      var cancelBtn = document.getElementById('edb-dialog-cancel');
      var iconEl = document.getElementById('edb-dialog-icon');
      var accentEl = document.getElementById('edb-dialog-accent');
      var lastFocus = null;
      var queue = Promise.resolve();

      var VARIANTS = {
        info:    { icon: 'i', iconCls: 'bg-brand-500/10 text-brand-400 border-brand-500/30', accent: 'from-brand-500 to-blue-500', ok: 'bg-brand-500 hover:bg-brand-400 shadow-brand-500/20' },
        warning: { icon: '!', iconCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30', accent: 'from-amber-500 to-orange-500', ok: 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' },
        error:   { icon: '\\u00d7', iconCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30', accent: 'from-rose-500 to-red-500', ok: 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20' },
        danger:  { icon: '!', iconCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30', accent: 'from-rose-500 to-red-500', ok: 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20' }
      };

      function show(kind, message, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
          var v = VARIANTS[opts.variant || 'info'] || VARIANTS.info;
          lastFocus = document.activeElement;
          titleEl.textContent = opts.title || (kind === 'confirm' ? 'Please confirm' : kind === 'prompt' ? 'Input required' : 'Notice');
          msgEl.textContent = message;
          iconEl.textContent = v.icon;
          iconEl.className = 'shrink-0 w-10 h-10 rounded-full flex items-center justify-center border text-lg font-bold ' + v.iconCls;
          accentEl.className = 'h-1 bg-gradient-to-r ' + v.accent;
          okBtn.className = 'px-4 py-2 rounded-lg text-slate-950 font-semibold text-sm transition shadow-lg ' + v.ok;
          okBtn.textContent = opts.okText || (kind === 'alert' ? 'OK' : 'Confirm');
          cancelBtn.textContent = opts.cancelText || 'Cancel';
          cancelBtn.classList.toggle('hidden', kind === 'alert');
          inputEl.classList.toggle('hidden', kind !== 'prompt');
          inputEl.value = kind === 'prompt' && opts.defaultValue ? opts.defaultValue : '';
          root.classList.remove('hidden');

          function finish(result) {
            root.classList.add('hidden');
            okBtn.onclick = cancelBtn.onclick = null;
            document.removeEventListener('keydown', onKey, true);
            document.getElementById('edb-dialog-backdrop').onclick = null;
            if (lastFocus && lastFocus.focus) lastFocus.focus();
            resolve(result);
          }
          function accept() { finish(kind === 'prompt' ? inputEl.value : true); }
          function dismiss() { finish(kind === 'prompt' ? null : kind === 'alert'); }
          function onKey(e) {
            if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
            else if (e.key === 'Enter') { e.preventDefault(); accept(); }
            else if (e.key === 'Tab') {
              var items = kind === 'alert' ? [okBtn] : kind === 'prompt' ? [inputEl, cancelBtn, okBtn] : [cancelBtn, okBtn];
              var i = items.indexOf(document.activeElement);
              e.preventDefault();
              items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
            }
          }
          okBtn.onclick = accept;
          cancelBtn.onclick = dismiss;
          document.getElementById('edb-dialog-backdrop').onclick = dismiss;
          document.addEventListener('keydown', onKey, true);
          (kind === 'prompt' ? inputEl : okBtn).focus();
          if (kind === 'prompt') inputEl.select();
        });
      }

      // Serialize so overlapping dialogs never clobber each other.
      function enqueue(kind, message, opts) {
        var run = queue.then(function () { return show(kind, message, opts); });
        queue = run.catch(function () {});
        return run;
      }

      window.edbAlert = function (message, opts) { return enqueue('alert', message, opts); };
      window.edbConfirm = function (message, opts) { return enqueue('confirm', message, opts); };
      window.edbPrompt = function (message, defaultValue, opts) {
        return enqueue('prompt', message, Object.assign({ defaultValue: defaultValue }, opts || {}));
      };
    })();
  </script>`;

function renderSiteNavigation(logoUrl = "/logo", isLandingPage = false): string {
  return `
  <header class="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3">
        <img src="${logoUrl}" alt="EasyDB Icon" class="h-10 w-10 rounded-xl object-contain border border-slate-700/60 p-1 bg-slate-900/90">
        <span class="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-teal-400 bg-clip-text text-transparent">EasyDB</span>
        <span class="px-2 py-0.5 text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full uppercase tracking-wider">v2.0 Live</span>
      </a>
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
        <a href="/" class="hover:text-teal-400 transition">Home</a>
        ${isLandingPage ? `<a href="#features" class="hover:text-teal-400 transition">Features</a><a href="#api" class="hover:text-teal-400 transition">API Reference</a>` : ""}
        <a href="/agents" class="hover:text-teal-400 transition">For AI Agents</a>
        <a href="/pricing" class="hover:text-teal-400 transition">Pricing</a>
      </nav>
      <div class="hidden md:flex items-center gap-3">
        <a href="/dashboard" class="px-4 py-2 rounded-lg bg-slate-900/70 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition border border-slate-700/80">My Dashboard</a>
        <a href="/api/v1/auth/github/login" class="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition">Sign Up with GitHub</a>
      </div>
      <button onclick="toggleMobileMenu()" id="mobile-menu-btn" class="md:hidden p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition border border-slate-700/60" aria-label="Toggle menu" aria-expanded="false">
        <svg id="mobile-menu-icon-open" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        <svg id="mobile-menu-icon-close" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div id="mobile-menu" class="hidden md:hidden border-t border-slate-800/80 px-4 sm:px-6 py-4 space-y-4">
      <nav class="flex flex-col gap-1 text-sm font-medium text-slate-300">
        <a href="/" onclick="toggleMobileMenu()" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-teal-400 transition">Home</a>
        ${isLandingPage ? `<a href="#features" onclick="toggleMobileMenu()" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-teal-400 transition">Features</a><a href="#api" onclick="toggleMobileMenu()" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-teal-400 transition">API Reference</a>` : ""}
        <a href="/agents" onclick="toggleMobileMenu()" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-teal-400 transition">For AI Agents</a>
        <a href="/pricing" onclick="toggleMobileMenu()" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-teal-400 transition">Pricing</a>
      </nav>
      <div class="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
        <a href="/dashboard" class="px-4 py-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition border border-slate-700/80 text-center">My Dashboard</a>
        <a href="/api/v1/auth/github/login" class="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition text-center">Sign Up with GitHub</a>
      </div>
    </div>
  </header>
  <script>
    function toggleMobileMenu() {
      const menu = document.getElementById('mobile-menu');
      const isOpen = !menu.classList.contains('hidden');
      menu.classList.toggle('hidden', isOpen);
      document.getElementById('mobile-menu-icon-open').classList.toggle('hidden', !isOpen);
      document.getElementById('mobile-menu-icon-close').classList.toggle('hidden', isOpen);
      document.getElementById('mobile-menu-btn').setAttribute('aria-expanded', String(!isOpen));
    }
  </script>`;
}

function renderSiteFooter(logoUrl = "/logo"): string {
  return `
  <footer class="border-t border-slate-800 py-8 sm:py-12 bg-slate-950/60">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
      <div class="flex items-center gap-2.5">
        <img src="${logoUrl}" alt="EasyDB Icon" class="h-6 w-6 rounded-md object-contain">
        <span>Copyright 2026 &bull; EasyDB &bull; <a href="mailto:support@easy-db.cloud" class="hover:text-white transition">support@easy-db.cloud</a></span>
      </div>
      <div class="flex items-center gap-6">
        <a href="https://github.com/HashimsGitHub/easydb" target="_blank" rel="noopener noreferrer" class="hover:text-white transition">GitHub Repository</a>
        <a href="/admin" class="hover:text-white transition">Admin</a>
      </div>
    </div>
  </footer>`;
}

export function renderLandingPage(heroImageUrl: string, logoIconUrl: string, healthJson: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EasyDB — NoSQL, SQL &amp; Object Storage in One Edge Database</title>
  <link rel="icon" type="image/png" href="${logoIconUrl}">
  <link rel="apple-touch-icon" href="${logoIconUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="EasyDB">
  <meta property="og:title" content="EasyDB — NoSQL, SQL &amp; Object Storage in One Edge Database">
  <meta property="og:url" content="https://easy-db.cloud/">
  <meta property="og:image" content="${logoIconUrl}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:image" content="${logoIconUrl}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            brand: {
              50: '#f0fdfa',
              100: '#ccfbf1',
              400: '#2dd4bf',
              500: '#14b8a6',
              600: '#0d9488',
              700: '#0f766e',
            },
            accent: {
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
            }
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
    .hero-glow {
      background: radial-gradient(circle at 50% 30%, rgba(20, 184, 166, 0.15) 0%, rgba(14, 165, 233, 0.1) 40%, transparent 70%);
    }
    .glass {
      background: rgba(17, 24, 39, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }
    .glass-card:hover {
      border-color: rgba(45, 212, 191, 0.3);
    }
  </style>
</head>
<body class="bg-[#090d16] text-slate-100 antialiased selection:bg-brand-500 selection:text-white min-h-screen">

  <!-- Glow Background -->
  <div class="fixed inset-0 hero-glow pointer-events-none -z-10"></div>

  ${renderSiteNavigation(logoIconUrl, true)}

  <!-- Hero Section -->
  <section class="relative pt-12 pb-20 overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto space-y-6">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-brand-500/30 text-brand-300 text-xs font-semibold tracking-wide">
          <span class="flex h-2 w-2 rounded-full bg-brand-400 animate-pulse"></span>
          <span>v2.0 — NoSQL + SQL + Object Storage, One API</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          The Direct Drop-in <br>
          <span class="bg-gradient-to-r from-brand-400 via-accent-400 to-blue-500 bg-clip-text text-transparent">NoSQL, SQL &amp; Object Storage</span>
          <br>In One Serverless Database.
        </h1>

        <p class="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
          <strong>EasyDB</strong> gives you all three data capabilities behind one simple REST API: schemaless JSON documents (NoSQL), relational SQL tables, and native object storage for files and media. Per-tenant isolation, zero cluster provisioning, zero idle fees.</p>

        <div class="flex flex-wrap justify-center gap-4 pt-2">
          <a href="#demo" class="px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-slate-950 font-bold text-base transition shadow-xl shadow-brand-500/20 flex items-center gap-2">
            <span>Launch Live Playground</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </a>
          <a href="#comparison" class="px-6 py-3.5 rounded-xl glass hover:bg-slate-800 text-slate-200 font-semibold text-base transition border border-slate-700/80">
            See Comparison Matrix
          </a>
        </div>

        <!-- Metrics Strip -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 text-left">
          <div class="p-4 rounded-xl glass-card">
            <div class="text-2xl font-bold text-brand-400">&lt; 15ms</div>
            <div class="text-xs text-slate-400 font-medium mt-1">Global Edge Latency</div>
          </div>
          <div class="p-4 rounded-xl glass-card">
            <div class="text-2xl font-bold text-accent-400">100% Serverless</div>
            <div class="text-xs text-slate-400 font-medium mt-1">Zero VM or Node Fees</div>
          </div>
          <div class="p-4 rounded-xl glass-card">
            <div class="text-2xl font-bold text-emerald-400">All-in-One</div>
            <div class="text-xs text-slate-400 font-medium mt-1">NoSQL + SQL + Object Storage</div>
          </div>
          <div class="p-4 rounded-xl glass-card">
            <div class="text-2xl font-bold text-purple-400">AI Agent Ready</div>
            <div class="text-xs text-slate-400 font-medium mt-1">SKILL.md &amp; llms.txt Included</div>
          </div>
        </div>
      </div>

      <!-- Hero Visual Image -->
      <div class="mt-14 relative max-w-5xl mx-auto">
        <div class="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-500 via-accent-500 to-purple-600 opacity-30 blur-2xl -z-10"></div>
        <div class="rounded-2xl overflow-hidden border border-slate-700/70 shadow-2xl glass-card p-2 sm:p-3">
          <div class="rounded-xl overflow-hidden relative aspect-video sm:aspect-[21/9] bg-slate-950 flex items-center justify-center">
            <img src="${heroImageUrl}" alt="EasyDB Architecture Hero" class="w-full h-full object-cover rounded-lg" onerror="this.src='/api/v1/hero'">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
              <div class="text-white">
                <div class="text-xs uppercase tracking-widest text-brand-400 font-bold"></div>
                <div class="text-lg font-semibold"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Comparison Section -->
  <section id="comparison" class="py-20 border-t border-slate-800/80 bg-slate-950/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto mb-14">
        <h2 class="text-xs font-bold uppercase tracking-wider text-brand-400">The Modern Data Stack</h2>
        <p class="mt-2 text-3xl sm:text-4xl font-extrabold text-white">One Database. Three Capabilities. No Stack Sprawl.</p>
        <p class="mt-4 text-base text-slate-400">A typical app needs a document store, a relational database and a file bucket from three different vendors. EasyDB gives you NoSQL, SQL and object storage behind a single API key, with the cost of a serverless platform.</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse rounded-2xl overflow-hidden glass-card">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-900/80 text-slate-200">
              <th class="p-5 font-semibold">Capability</th>
              <th class="p-5 font-bold text-brand-400 text-base bg-brand-500/10 border-x border-brand-500/20">EasyDB (Next-Gen)</th>
              <th class="p-5 font-semibold text-slate-400">Typical Multi-Vendor Stack</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            <tr>
              <td class="p-5 font-medium">Architecture & Deployment</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">100% Serverless Edge (300+ Cities)</td>
              <td class="p-5 text-slate-400">Regional cluster nodes and VMs to manage</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">NoSQL Documents</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">Schemaless JSON collections with edge indexing</td>
              <td class="p-5 text-slate-400">Separate managed document cluster</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Relational SQL</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">Typed tables, filters, ordering &amp; paging via REST</td>
              <td class="p-5 text-slate-400">Second database, driver and connection pool</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Object Storage</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-brand-300 font-semibold">Built-in object storage for files &amp; media</td>
              <td class="p-5 text-slate-400">Separate S3-style bucket and IAM setup</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Idle & Base Monthly Cost</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-emerald-400 font-bold">$0.00 / Pay only for requests</td>
              <td class="p-5 text-slate-400">Fixed monthly cost per service</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Multi-Tenancy</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">Built-in Header-based Tenant Partitioning</td>
              <td class="p-5 text-slate-400">Manual per-service tenant routing</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">AI Agent Integration</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-accent-400 font-semibold">Plain REST + Ready-made SKILL.md</td>
              <td class="p-5 text-slate-400">Multiple drivers and SDKs</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Interactive Live Demo Section -->
  <section id="demo" class="py-20 relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto mb-12">
        <h2 class="text-xs font-bold uppercase tracking-wider text-brand-400">Interactive Playground</h2>
        <p class="mt-2 text-3xl sm:text-4xl font-extrabold text-white">Test EasyDB In Real-Time</p>
        <p class="mt-3 text-sm sm:text-base text-slate-400">Run live NoSQL, SQL and object storage operations against this running EasyDB instance.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Controls Column -->
        <div class="lg:col-span-5 space-y-6">
          <div class="glass-card p-6 rounded-2xl space-y-5">
            <!-- Tabs -->
            <div class="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              <button id="tab-doc" onclick="switchDemoTab('doc')" class="flex-1 py-2 rounded-lg text-sm font-semibold transition bg-brand-500 text-slate-950 shadow">
                📄 NoSQL
              </button>
              <button id="tab-sql" onclick="switchDemoTab('sql')" class="flex-1 py-2 rounded-lg text-sm font-semibold transition text-slate-400 hover:text-white">
                🗄️ SQL
              </button>
              <button id="tab-media" onclick="switchDemoTab('media')" class="flex-1 py-2 rounded-lg text-sm font-semibold transition text-slate-400 hover:text-white">
                🖼️ Object Storage
              </button>
            </div>

            <!-- Sandbox Safeguards & Quota Banner -->
            <div class="rounded-xl bg-slate-900/90 border border-brand-500/30 p-3.5 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-brand-400 font-bold">
                  <span>🛡️</span>
                  <span>Free Sandbox Quota</span>
                </div>
                <span class="text-[10px] text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">🔒 demo_store active</span>
              </div>
              <p class="text-slate-400 text-[11px] leading-relaxed">
                To prevent misuse during this free preview, tenant is locked to <strong class="text-white">demo_store</strong> with active safeguards:
              </p>
              <div class="grid grid-cols-3 gap-2 pt-0.5">
                <div class="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[11px]">
                  <span class="text-slate-400 block text-[10px]">NoSQL Documents</span>
                  <strong class="text-white">Max 100 entries</strong>
                </div>
                <div class="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[11px]">
                  <span class="text-slate-400 block text-[10px]">SQL</span>
                  <strong class="text-white">5 tables, 256KB</strong>
                </div>
                <div class="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[11px]">
                  <span class="text-slate-400 block text-[10px]">Object Storage</span>
                  <strong class="text-white">5 files (100MB ea)</strong>
                </div>
              </div>
              <p class="text-[10px] text-slate-500 italic">
                * User onboarding and dedicated custom tenant registration coming soon.
              </p>
            </div>

            <!-- Global Tenant & Collection Input -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block font-medium text-slate-400 mb-1">x-tenant-id (Locked)</label>
                <input id="demo-tenant" type="text" value="demo_store" readonly class="w-full bg-slate-900/60 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-300 font-mono text-xs cursor-not-allowed">
              </div>
              <div>
                <label class="block font-medium text-slate-400 mb-1">Collection</label>
                <input id="demo-collection" type="text" value="products" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-brand-500">
              </div>
            </div>

            <!-- Document Form -->
            <div id="panel-doc" class="space-y-4">
              <!-- Seed eCommerce Button -->
              <button onclick="seedEcommerce()" class="w-full py-2.5 rounded-lg bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-400 hover:to-accent-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-brand-500/20">
                <span>🚀 Seed eCommerce Demo (6 Products)</span>
              </button>

              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-xs font-medium text-slate-400">Document ID (_id)</label>
                  <button onclick="generateDocId()" class="text-[11px] text-brand-400 hover:underline">Generate UUID</button>
                </div>
                <input id="doc-id" type="text" value="prod_001" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500">
              </div>

              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-xs font-medium text-slate-400">JSON Payload (Schemaless)</label>
                  <div class="flex gap-2 text-[11px]">
                    <button onclick="loadDocPreset('product')" class="text-brand-400 hover:underline">Product</button>
                    <button onclick="loadDocPreset('user')" class="text-brand-400 hover:underline">User</button>
                    <button onclick="loadDocPreset('sensor')" class="text-brand-400 hover:underline">IoT</button>
                  </div>
                </div>
                <textarea id="doc-payload" rows="6" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500 leading-relaxed"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-2">
                <button onclick="executeAction('insert')" class="px-3 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5">
                  <span>➕ Insert</span>
                </button>
                <button onclick="executeAction('find')" class="px-3 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5">
                  <span>🔍 Find All</span>
                </button>
                <button onclick="executeAction('update')" class="px-3 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5">
                  <span>✏️ Update</span>
                </button>
                <button onclick="executeAction('delete')" class="px-3 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition flex items-center justify-center gap-1.5">
                  <span>🗑️ Delete</span>
                </button>
              </div>
            </div>

            <!-- SQL Form -->
            <div id="panel-sql" class="space-y-4 hidden">
              <button onclick="seedSql()" class="w-full py-2.5 rounded-lg bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-400 hover:to-accent-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-brand-500/20">
                <span>🚀 Seed SQL Demo (products table, 6 rows)</span>
              </button>

              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Table</label>
                <input id="sql-table" type="text" value="products" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500">
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Row / Set values (JSON, used by Insert &amp; Update)</label>
                <textarea id="sql-data" rows="4" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500 leading-relaxed">{ "id": 7, "name": "Webcam 4K", "category": "Peripherals", "price": 79.5, "quantity": 60, "inStock": 1 }</textarea>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Where (JSON, used by Select, Update &amp; Delete)</label>
                <textarea id="sql-where" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500 leading-relaxed">{ "price": { "gt": 100 } }</textarea>
                <p class="text-[10px] text-slate-500 mt-1">Operators: eq, ne, gt, gte, lt, lte, like, in. Update and Delete require a where.</p>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-1">
                <button onclick="sqlAction('insert')" class="px-3 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition">➕ Insert Row</button>
                <button onclick="sqlAction('select')" class="px-3 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-400 text-slate-950 font-bold text-xs transition">🔍 Select</button>
                <button onclick="sqlAction('update')" class="px-3 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition">✏️ Update</button>
                <button onclick="sqlAction('delete')" class="px-3 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition">🗑️ Delete</button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button onclick="sqlAction('tables')" class="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700">📂 List Tables</button>
                <button onclick="sqlAction('drop')" class="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700">💥 Drop Table</button>
              </div>

              <div class="pt-3 border-t border-slate-800 space-y-3">
                <div>
                  <label class="block text-xs font-medium text-slate-400 mb-1">Native SQL <span class="text-slate-500">(one statement, use ? for values)</span></label>
                  <textarea id="sql-raw" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500 leading-relaxed">SELECT name, price FROM products WHERE price > ? ORDER BY price DESC</textarea>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-400 mb-1">Args (JSON array, one value per ?)</label>
                  <input id="sql-args" type="text" value="[100]" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500">
                  <p class="text-[10px] text-slate-500 mt-1">Allowed: SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, DROP TABLE. No comments, PRAGMA or ATTACH.</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button onclick="sqlRaw()" class="py-2.5 rounded-lg bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-400 hover:to-accent-400 text-slate-950 font-bold text-xs transition">▶ Run Native SQL</button>
                  <button onclick="sqlTransactionDemo()" class="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700">🔒 Transaction Demo</button>
                </div>
                <p class="text-[10px] text-slate-500">Transaction Demo sends 3 statements in one atomic request; the last one fails on purpose, so the earlier price change is rolled back.</p>
              </div>
            </div>

            <!-- Media Form -->
            <div id="panel-media" class="space-y-4 hidden">
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Browse to select file (Max 100MB, up to 5 demo files)</label>
                <input id="media-file-input" type="file" class="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-slate-950 hover:file:bg-brand-400 cursor-pointer">
              </div>

              <div class="grid grid-cols-2 gap-2 pt-1">
                <button onclick="uploadMediaFile()" class="px-3 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow">
                  <span>⬆️ Upload</span>
                </button>
                <button onclick="downloadMediaFile()" class="px-3 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow">
                  <span>⬇️ Download Media</span>
                </button>
              </div>

              <div class="pt-2">
                <button onclick="executeAction('list-media')" class="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700 flex items-center justify-center gap-1.5">
                  <span>📂 List Tenant Media</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Live Response Inspector Column -->
        <div class="lg:col-span-7 space-y-4">
          <div class="glass-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col h-[520px]">
            <!-- Inspector Header -->
            <div class="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="flex gap-1.5">
                  <div class="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <span class="text-xs font-mono text-slate-400 ml-2">Response Inspector</span>
              </div>
              <div class="flex items-center gap-3 text-xs font-mono">
                <span id="response-status" class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">200 OK</span>
                <span id="response-time" class="text-slate-400">⚡ 0ms</span>
              </div>
            </div>

            <!-- Inspector Body -->
            <div class="p-4 flex-1 overflow-auto bg-[#0a0f1d] font-mono text-xs leading-relaxed text-accent-400">
              <pre id="response-output" class="whitespace-pre-wrap">// Click "🚀 Seed eCommerce Demo (6 Products)" or any action on the left to see live JSON responses from EasyDB (NoSQL, SQL or Object Storage)...</pre>
            </div>

            <!-- Inspector Footer Action -->
            <div class="bg-slate-900/60 px-4 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span id="response-summary">Ready for execution</span>
              <button onclick="clearResponse()" class="hover:text-brand-400 transition">Clear</button>
            </div>
          </div>

          <!-- Service Status -->
          <div id="status" class="glass-card rounded-2xl overflow-hidden border border-slate-800 scroll-mt-24">
            <div class="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span class="text-xs font-mono text-slate-400">Service Status</span>
              <span class="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span class="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Operational
              </span>
            </div>
            <div class="p-4 bg-[#0a0f1d] font-mono text-xs leading-relaxed text-accent-400 overflow-auto max-h-56">
              <pre id="status-output" class="whitespace-pre-wrap">${escapeHtml(healthJson)}</pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="features" class="py-20 border-t border-slate-800/80 bg-slate-950/40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h2 class="text-xs font-bold uppercase tracking-wider text-brand-400">Core Architecture</h2>
        <p class="mt-2 text-3xl sm:text-4xl font-extrabold text-white">All-In-One Unified Database</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-8 rounded-2xl glass-card space-y-4">
          <div class="h-12 w-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center text-2xl font-bold">
            ⚡
          </div>
          <h3 class="text-xl font-bold text-white">Relational SQL</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Create typed tables and run inserts, filtered selects, updates and deletes over plain REST, or send native SQL and atomic transactions. Every tenant gets a private, isolated SQL namespace with built-in quotas.</p>
        </div>

        <div class="p-8 rounded-2xl glass-card space-y-4">
          <div class="h-12 w-12 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 flex items-center justify-center text-2xl font-bold">
            📦
          </div>
          <h3 class="text-xl font-bold text-white">NoSQL Document Store</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Store nested objects, dynamic schema documents, and high-velocity datasets. Built-in multi-tenancy ensures zero cross-tenant data leakage.
          </p>
        </div>

        <div class="p-8 rounded-2xl glass-card space-y-4">
          <div class="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl font-bold">
            🖼️
          </div>
          <h3 class="text-xl font-bold text-white">Object Storage</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            No need to set up S3 or configure IAM bucket policies. Upload files and media directly to EasyDB and get instant, CDN-accelerated asset URLs.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Quick API Reference -->
  <section id="api" class="py-20 border-t border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto mb-12">
        <h2 class="text-xs font-bold uppercase tracking-wider text-brand-400">Developer First</h2>
        <p class="mt-2 text-3xl sm:text-4xl font-extrabold text-white">Dead Simple REST & SDK Interface</p>
        <p class="mt-3 text-sm text-slate-400">NoSQL, SQL and object storage endpoints ready to plug into your apps or AI agents.</p>
      </div>

      <!-- Category 1: Document Database Endpoints -->
      <div class="max-w-6xl mx-auto mb-10">
        <div class="flex items-center gap-2 mb-4">
          <span class="px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-400 text-xs font-bold border border-brand-500/20">📄 NoSQL Document APIs</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- 1. Insert -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-emerald-400 font-bold">POST /api/v1/insert</span>
              <span>Insert / Upsert</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easy-db.cloud/api/v1/insert \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collection": "products",
    "id": "prod_001",
    "data": { "name": "Headphones", "price": 149.99, "quantity": 85 }
  }'</pre>
          </div>

          <!-- 2. Find -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-accent-400 font-bold">POST /api/v1/find</span>
              <span>Query Collection</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easy-db.cloud/api/v1/find \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{ "collection": "products" }'</pre>
          </div>

          <!-- 3. Update -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-amber-400 font-bold">PUT /api/v1/update</span>
              <span>Update Document</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X PUT https://easy-db.cloud/api/v1/update \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collection": "products",
    "id": "prod_001",
    "data": { "price": 129.99, "quantity": 90 }
  }'</pre>
          </div>

          <!-- 4. Delete -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-rose-400 font-bold">DELETE /api/v1/delete</span>
              <span>Delete Document</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X DELETE https://easy-db.cloud/api/v1/delete \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collection": "products",
    "id": "prod_001"
  }'</pre>
          </div>

        </div>
      </div>

      <!-- Category: SQL Endpoints -->
      <div class="max-w-6xl mx-auto mb-10">
        <div class="flex items-center gap-2 mb-4">
          <span class="px-2.5 py-1 rounded-md bg-accent-500/10 text-accent-400 text-xs font-bold border border-accent-500/20">🗄️ Relational SQL APIs</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-emerald-400 font-bold">POST /api/v1/sql/tables</span>
              <span>Create Table</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easy-db.cloud/api/v1/sql/tables \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "products",
    "columns": [
      { "name": "id", "type": "INTEGER", "primaryKey": true },
      { "name": "name", "type": "TEXT", "notNull": true },
      { "name": "price", "type": "REAL" }
    ]
  }'</pre>
          </div>

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-emerald-400 font-bold">POST /api/v1/sql/insert</span>
              <span>Insert Rows</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easy-db.cloud/api/v1/sql/insert \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "products",
    "rows": [
      { "id": 1, "name": "Headphones", "price": 149.99 },
      { "id": 2, "name": "Keyboard", "price": 129.0 }
    ]
  }'</pre>
          </div>

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-accent-400 font-bold">POST /api/v1/sql/select</span>
              <span>Query Rows</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easy-db.cloud/api/v1/sql/select \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "products",
    "where": { "price": { "gt": 100 } },
    "orderBy": "price",
    "order": "desc",
    "limit": 10
  }'</pre>
          </div>

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-amber-400 font-bold">PUT /api/v1/sql/update</span>
              <span>Update Rows</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X PUT https://easy-db.cloud/api/v1/sql/update \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "products",
    "set": { "price": 139.99 },
    "where": { "id": 1 }
  }'</pre>
          </div>

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-rose-400 font-bold">DELETE /api/v1/sql/delete</span>
              <span>Delete Rows</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X DELETE https://easy-db.cloud/api/v1/sql/delete \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{ "table": "products", "where": { "id": 2 } }'</pre>
          </div>

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-sky-400 font-bold">GET /api/v1/sql/tables</span>
              <span>List Tables</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl https://easy-db.cloud/api/v1/sql/tables \\
  -H "x-tenant-id: demo_store"</pre>
          </div>

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-emerald-400 font-bold">POST /api/v1/sql/query</span>
              <span>Native SQL</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easy-db.cloud/api/v1/sql/query \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{ "sql": "SELECT name, price FROM products WHERE price > ? ORDER BY price DESC",
        "args": [100] }'

# Response: { "success": true, "columns": [...], "rows": [{ "name": "...", "price": 599.95 }], "count": 3 }
# Add "format": "array" to get rows as arrays. Max 1000 rows per statement.

# Allowed: SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, DROP TABLE
# You can create, change and drop your own tables freely.
# One statement per query, ? placeholders only. Use plain table names (products) - they are private to you.
#
# Not available (EasyDB manages these for you): CREATE/DROP DATABASE, TRUNCATE, PRAGMA,
# ATTACH, indexes, views, triggers, WITH. These return a clear explanation, e.g.
#   403 { "error": "Not allowed: DROP DATABASE is not available. EasyDB manages the database for you.",
#         "hint": "Your account already has its own private database ... Use CREATE TABLE / DROP TABLE ..." }</pre>
          </div>

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-emerald-400 font-bold">POST /api/v1/sql/query</span>
              <span>Transaction (native SQL)</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easy-db.cloud/api/v1/sql/query \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{ "statements": [
        { "sql": "UPDATE accounts SET balance = balance - ? WHERE id = ?", "args": [50, 1] },
        { "sql": "UPDATE accounts SET balance = balance + ? WHERE id = ?", "args": [50, 2] },
        { "sql": "SELECT id, balance FROM accounts ORDER BY id" }
      ] }'

# All statements commit together, or none do (max 25).
# Response: { "success": true, "results": [ one entry per statement ] }</pre>
          </div>

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-emerald-400 font-bold">POST /api/v1/sql/batch</span>
              <span>Transaction (JSON operations)</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easy-db.cloud/api/v1/sql/batch \\
  -H "x-tenant-id: demo_store" \\
  -H "Content-Type: application/json" \\
  -d '{ "operations": [
        { "op": "insert", "table": "products", "row": { "id": 8, "name": "Mouse", "price": 25 } },
        { "op": "update", "table": "products", "set": { "quantity": 5 }, "where": { "id": 8 } },
        { "op": "select", "table": "products", "where": { "id": 8 } }
      ] }'

# ops: createTable, insert, select, update, delete (max 25), atomic.</pre>
          </div>

          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs md:col-span-2">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-sky-400 font-bold">Python</span>
              <span>sqlite-style helper over HTTP</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">import requests

class EasyDB:
    def __init__(self, tenant="demo_store", base="https://easy-db.cloud/api/v1/sql"):
        self.h, self.base, self.pending = {"x-tenant-id": tenant}, base, []

    def execute(self, sql, args=()):
        self.pending.append({"sql": sql, "args": list(args)})

    def commit(self):
        r = requests.post(self.base + "/query", headers=self.h, json={"statements": self.pending})
        self.pending = []
        r.raise_for_status()          # on error nothing was saved
        return r.json()["results"]

    def query(self, sql, args=()):
        r = requests.post(self.base + "/query", headers=self.h, json={"sql": sql, "args": list(args)})
        r.raise_for_status()
        return r.json()["rows"]

db = EasyDB()
db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)")
db.execute("INSERT INTO users (name) VALUES (?)", ("Alice",))
db.commit()

for row in db.query("SELECT * FROM users"):
    print(row)</pre>
          </div>

        </div>
      </div>

      <!-- Category 2: Media Storage Endpoints -->
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center gap-2 mb-4">
          <span class="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">🖼️ Object Storage APIs (Max 100MB)</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- 5. Media Upload -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-purple-400 font-bold">POST /api/v1/media/upload</span>
              <span>Upload File (Form-Data / Binary)</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easy-db.cloud/api/v1/media/upload \\
  -H "x-tenant-id: demo_store" \\
  -F "file=@photo.jpg"</pre>
          </div>

          <!-- 6. Media Download -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-brand-400 font-bold">GET /api/v1/media/download</span>
              <span>Download File by Name</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -OJ "https://easy-db.cloud/api/v1/media/download?filename=photo.jpg" \\
  -H "x-tenant-id: demo_store"</pre>
          </div>

          <!-- 7. Media List -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-sky-400 font-bold">GET /api/v1/media/list</span>
              <span>List Tenant Media</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X GET "https://easy-db.cloud/api/v1/media/list" \\
  -H "x-tenant-id: demo_store"</pre>
          </div>

          <!-- 8. Media Delete -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-rose-400 font-bold">DELETE /api/v1/media/delete</span>
              <span>Delete Media</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X DELETE "https://easy-db.cloud/api/v1/media/delete?filename=photo.jpg" \\
  -H "x-tenant-id: demo_store"</pre>
          </div>

        </div>
      </div>

    </div>
  </section>

  ${renderSiteFooter(logoIconUrl)}

  <script>
    const presets = {
      product: {
        productId: "PROD-001",
        name: "Wireless Noise-Cancelling Headphones",
        category: "Electronics",
        price: 149.99,
        quantity: 85,
        description: "Over-ear headphones with 30hr battery and ANC.",
        inStock: true
      },
      user: {
        name: "Hashim Hilal",
        email: "hashim@example.com",
        role: "Lead Architect",
        tags: ["nosql", "edge", "cloudflare"],
        active: true
      },
      sensor: {
        deviceId: "iot-sensor-88",
        temperature: 24.8,
        humidity: 58.2,
        battery: 98,
        timestamp: new Date().toISOString()
      }
    };

    const ecommerceProducts = [
      { id: "prod_001", data: { productId: "PROD-001", name: "Wireless Noise-Cancelling Headphones", category: "Electronics", price: 149.99, quantity: 85, description: "Over-ear headphones with 30hr battery and ANC.", inStock: true } },
      { id: "prod_002", data: { productId: "PROD-002", name: "Ergonomic Mechanical Keyboard", category: "Peripherals", price: 129.00, quantity: 42, description: "Tenkeyless mechanical keyboard with Cherry MX switches.", inStock: true } },
      { id: "prod_003", data: { productId: "PROD-003", name: "4K Ultra-Wide Curved Monitor", category: "Displays", price: 599.95, quantity: 18, description: "34-inch QHD curved 144Hz HDR display.", inStock: true } },
      { id: "prod_004", data: { productId: "PROD-004", name: "USB-C 12-in-1 Docking Station", category: "Accessories", price: 89.99, quantity: 200, description: "Single-cable docking hub with 100W PD.", inStock: true } },
      { id: "prod_005", data: { productId: "PROD-005", name: "Smart Fitness Tracker Band", category: "Wearables", price: 49.99, quantity: 320, description: "Heart rate, SpO2, and sleep tracker.", inStock: true } },
      { id: "prod_006", data: { productId: "PROD-006", name: "Portable SSD 1TB NVMe", category: "Storage", price: 119.00, quantity: 0, description: "High-speed USB 3.2 Gen 2 external SSD.", inStock: false } }
    ];

    function loadDocPreset(type) {
      document.getElementById('doc-payload').value = JSON.stringify(presets[type] || {}, null, 2);
    }

    function generateDocId() {
      document.getElementById('doc-id').value = 'prod_' + Math.random().toString(36).substring(2, 7);
    }

    function switchDemoTab(tab) {
      ['doc', 'sql', 'media'].forEach(function (t) {
        document.getElementById('panel-' + t).classList.toggle('hidden', t !== tab);
        document.getElementById('tab-' + t).className = t === tab
          ? 'flex-1 py-2 rounded-lg text-sm font-semibold transition bg-brand-500 text-slate-950 shadow'
          : 'flex-1 py-2 rounded-lg text-sm font-semibold transition text-slate-400 hover:text-white';
      });
    }

    function clearResponse() {
      document.getElementById('response-output').textContent = '// Ready...';
      document.getElementById('response-summary').textContent = 'Cleared';
      document.getElementById('response-time').textContent = '⚡ 0ms';
    }

    async function seedEcommerce() {
      const tenant = document.getElementById('demo-tenant').value || 'demo_store';
      const output = document.getElementById('response-output');
      const timeBadge = document.getElementById('response-time');
      const statusBadge = document.getElementById('response-status');
      const summary = document.getElementById('response-summary');

      output.textContent = '// Seeding 6 eCommerce products into collection "products"...';
      const startTime = performance.now();
      let count = 0;

      for (let i = 0; i < ecommerceProducts.length; i++) {
        const item = ecommerceProducts[i];
        try {
          await fetch('/api/v1/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
            body: JSON.stringify({ collection: 'products', id: item.id, data: item.data })
          });
          count++;
        } catch (e) {}
      }

      // Query products collection after seeding
      const findRes = await fetch('/api/v1/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
        body: JSON.stringify({ collection: 'products' })
      });
      const data = await findRes.json();
      const elapsed = Math.round(performance.now() - startTime);

      timeBadge.textContent = '⚡ ' + elapsed + 'ms';
      statusBadge.textContent = '200 OK';
      statusBadge.className = 'px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      output.textContent = JSON.stringify(data, null, 2);
      summary.textContent = 'Successfully seeded ' + count + ' products in ' + elapsed + 'ms';
      document.getElementById('demo-collection').value = 'products';
      document.getElementById('doc-id').value = 'prod_001';
      loadDocPreset('product');
    }

    async function executeAction(action) {
      const tenant = document.getElementById('demo-tenant').value || 'demo_store';
      const collection = document.getElementById('demo-collection').value || 'products';
      const docId = document.getElementById('doc-id').value;
      const output = document.getElementById('response-output');
      const statusBadge = document.getElementById('response-status');
      const timeBadge = document.getElementById('response-time');
      const summary = document.getElementById('response-summary');

      output.textContent = '// Executing ' + action.toUpperCase() + ' request...';
      const startTime = performance.now();

      try {
        let res, data;
        if (action === 'insert') {
          let payload = {};
          try { payload = JSON.parse(document.getElementById('doc-payload').value); } catch(e){}
          res = await fetch('/api/v1/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
            body: JSON.stringify({ collection, id: docId, data: payload })
          });
        } else if (action === 'find') {
          res = await fetch('/api/v1/find', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
            body: JSON.stringify({ collection })
          });
        } else if (action === 'update') {
          let payload = {};
          try { payload = JSON.parse(document.getElementById('doc-payload').value); } catch(e){}
          res = await fetch('/api/v1/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
            body: JSON.stringify({ collection, id: docId, data: payload })
          });
        } else if (action === 'delete') {
          res = await fetch('/api/v1/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
            body: JSON.stringify({ collection, id: docId })
          });
        } else if (action === 'list-media') {
          res = await fetch('/api/v1/media/list', {
            method: 'GET',
            headers: { 'x-tenant-id': tenant }
          });
        }

        const elapsed = Math.round(performance.now() - startTime);
        timeBadge.textContent = '⚡ ' + elapsed + 'ms';
        statusBadge.textContent = res.status + ' ' + res.statusText;
        statusBadge.className = res.ok
          ? 'px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20';

        data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
        summary.textContent = 'Action ' + action.toUpperCase() + ' finished in ' + elapsed + 'ms';
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
        statusBadge.textContent = 'Client Error';
        statusBadge.className = 'px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20';
      }
    }

    const sqlSeedRows = [
      { id: 1, name: "Wireless Noise-Cancelling Headphones", category: "Electronics", price: 149.99, quantity: 85, inStock: 1 },
      { id: 2, name: "Ergonomic Mechanical Keyboard", category: "Peripherals", price: 129.0, quantity: 42, inStock: 1 },
      { id: 3, name: "4K Ultra-Wide Curved Monitor", category: "Displays", price: 599.95, quantity: 18, inStock: 1 },
      { id: 4, name: "USB-C 12-in-1 Docking Station", category: "Accessories", price: 89.99, quantity: 200, inStock: 1 },
      { id: 5, name: "Smart Fitness Tracker Band", category: "Wearables", price: 49.99, quantity: 320, inStock: 1 },
      { id: 6, name: "Portable SSD 1TB NVMe", category: "Storage", price: 119.0, quantity: 0, inStock: 0 }
    ];

    async function sqlCall(method, route, body) {
      const res = await fetch('/api/v1/sql/' + route, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': document.getElementById('demo-tenant').value || 'demo_store' },
        body: body ? JSON.stringify(body) : undefined
      });
      return { res, data: await res.json().catch(function () { return { error: 'Invalid response' }; }) };
    }

    function showSqlResult(res, data, startTime, label) {
      const elapsed = Math.round(performance.now() - startTime);
      document.getElementById('response-time').textContent = '⚡ ' + elapsed + 'ms';
      const badge = document.getElementById('response-status');
      badge.textContent = res.status + ' ' + res.statusText;
      badge.className = res.ok
        ? 'px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20';
      document.getElementById('response-output').textContent = JSON.stringify(data, null, 2);
      document.getElementById('response-summary').textContent = label + ' finished in ' + elapsed + 'ms';
    }

    function parseJsonField(id, fallback) {
      const raw = document.getElementById(id).value.trim();
      if (!raw) return fallback;
      return JSON.parse(raw);
    }

    async function seedSql() {
      const table = document.getElementById('sql-table').value || 'products';
      const output = document.getElementById('response-output');
      output.textContent = '// Creating SQL table "' + table + '" and inserting 6 rows...';
      const startTime = performance.now();
      try {
        const created = await sqlCall('POST', 'tables', {
          table,
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true },
            { name: 'name', type: 'TEXT', notNull: true },
            { name: 'category', type: 'TEXT' },
            { name: 'price', type: 'REAL' },
            { name: 'quantity', type: 'INTEGER' },
            { name: 'inStock', type: 'INTEGER' }
          ]
        });
        if (!created.res.ok && !/already exists/i.test(created.data.error || '')) {
          showSqlResult(created.res, created.data, startTime, 'Create table');
          return;
        }
        await sqlCall('DELETE', 'delete', { table, where: { id: { gte: 0 } } });
        const inserted = await sqlCall('POST', 'insert', { table, rows: sqlSeedRows });
        if (!inserted.res.ok) { showSqlResult(inserted.res, inserted.data, startTime, 'Seed'); return; }
        const selected = await sqlCall('POST', 'select', { table, orderBy: 'id' });
        showSqlResult(selected.res, selected.data, startTime, 'Seed SQL demo');
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
      }
    }

    async function sqlRaw() {
      const output = document.getElementById('response-output');
      output.textContent = '// Executing native SQL...';
      const startTime = performance.now();
      try {
        const sql = document.getElementById('sql-raw').value;
        const args = parseJsonField('sql-args', []);
        const r = await sqlCall('POST', 'query', { sql, args });
        showSqlResult(r.res, r.data, startTime, 'Native SQL');
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
      }
    }

    async function sqlTransactionDemo() {
      const output = document.getElementById('response-output');
      output.textContent = '// Running 3 statements in one transaction...';
      const startTime = performance.now();
      try {
        const table = document.getElementById('sql-table').value || 'products';
        const r = await sqlCall('POST', 'query', {
          statements: [
            { sql: 'UPDATE ' + table + ' SET price = price + ? WHERE id = ?', args: [1, 1] },
            { sql: 'SELECT id, price FROM ' + table + ' WHERE id = ?', args: [1] },
            { sql: 'INSERT INTO ' + table + ' (id, name) VALUES (?, ?)', args: [1, 'Duplicate id fails'] }
          ]
        });
        r.data.note = 'The 3rd statement violates the primary key, so the whole transaction rolled back: the price change was NOT saved.';
        showSqlResult(r.res, r.data, startTime, 'Transaction demo');
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
      }
    }

    async function sqlAction(action) {
      const table = document.getElementById('sql-table').value || 'products';
      const output = document.getElementById('response-output');
      output.textContent = '// Executing SQL ' + action.toUpperCase() + ' request...';
      const startTime = performance.now();
      try {
        let r;
        if (action === 'insert') r = await sqlCall('POST', 'insert', { table, rows: [parseJsonField('sql-data', {})] });
        else if (action === 'select') r = await sqlCall('POST', 'select', { table, where: parseJsonField('sql-where', undefined), limit: 50 });
        else if (action === 'update') r = await sqlCall('PUT', 'update', { table, set: parseJsonField('sql-data', {}), where: parseJsonField('sql-where', undefined) });
        else if (action === 'delete') r = await sqlCall('DELETE', 'delete', { table, where: parseJsonField('sql-where', undefined) });
        else if (action === 'tables') r = await sqlCall('GET', 'tables');
        else if (action === 'drop') r = await sqlCall('DELETE', 'tables', { table });
        showSqlResult(r.res, r.data, startTime, 'SQL ' + action.toUpperCase());
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
        const badge = document.getElementById('response-status');
        badge.textContent = 'Client Error';
        badge.className = 'px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20';
      }
    }

    // Media file size limit check: 100MB
    document.getElementById('media-file-input').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 100 * 1024 * 1024) {
        edbAlert('File size exceeds 100MB limit (' + (file.size / (1024 * 1024)).toFixed(2) + ' MB). Please choose a file under 100MB.', { title: 'File too large', variant: 'warning' });
        e.target.value = '';
      }
    });

    async function uploadMediaFile() {
      const fileInput = document.getElementById('media-file-input');
      const file = fileInput ? fileInput.files[0] : null;
      const output = document.getElementById('response-output');
      const statusBadge = document.getElementById('response-status');
      const timeBadge = document.getElementById('response-time');
      const summary = document.getElementById('response-summary');

      if (!file) {
        edbAlert('Please browse and select a file first.', { title: 'No file selected', variant: 'warning' });
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        edbAlert('File size exceeds 100MB limit (' + (file.size / (1024 * 1024)).toFixed(2) + ' MB). Please choose a file under 100MB.', { title: 'File too large', variant: 'warning' });
        return;
      }

      const tenant = document.getElementById('demo-tenant').value || 'demo_store';
      output.textContent = '// Uploading ' + file.name + ' (' + file.size + ' bytes)...';
      const startTime = performance.now();

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/v1/media/upload', {
          method: 'POST',
          headers: { 'x-tenant-id': tenant },
          body: formData
        });

        const elapsed = Math.round(performance.now() - startTime);
        timeBadge.textContent = '⚡ ' + elapsed + 'ms';
        statusBadge.textContent = res.status + ' ' + res.statusText;
        statusBadge.className = res.ok
          ? 'px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20';

        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
        summary.textContent = 'Uploaded ' + file.name + ' in ' + elapsed + 'ms';
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
        statusBadge.textContent = 'Client Error';
        statusBadge.className = 'px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20';
      }
    }

    async function downloadMediaFile() {
      const fileInput = document.getElementById('media-file-input');
      const defaultName = fileInput && fileInput.files[0] ? fileInput.files[0].name : 'test-sample.txt';
      const fileName = await edbPrompt('Enter the file name to download:', defaultName, { title: 'Download file', okText: 'Download' });
      if (!fileName) return;

      const tenant = document.getElementById('demo-tenant').value || 'demo_store';
      const output = document.getElementById('response-output');
      output.textContent = '// Requesting download for "' + fileName + '"...';

      try {
        const res = await fetch('/api/v1/media/download?filename=' + encodeURIComponent(fileName), {
          headers: { 'x-tenant-id': tenant }
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Download request failed' }));
          output.textContent = JSON.stringify(err, null, 2);
          return;
        }

        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        output.textContent = '// ✅ Download completed for "' + fileName + '" (' + blob.size + ' bytes)';
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
      }
    }

    // Initialize with eCommerce product preset on load
    loadDocPreset('product');
  </script>
${DIALOG_SNIPPET}
</body>
</html>`;
}

export interface AuthResultPageOptions {
  tenantId: string;
  isNew: boolean;
  apiSecret?: string;
  email: string | null;
  needsEmail: boolean;
}

export function renderAuthResultPage(opts: AuthResultPageOptions): string {
  const { tenantId, isNew, apiSecret, email, needsEmail } = opts;

  const secretBlock = isNew && apiSecret
    ? `
        <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
          <p class="text-amber-300 text-sm font-semibold">⚠️ This secret is shown once. Save it now — EasyDB cannot display it again.</p>
          <div class="flex items-center gap-2">
            <code id="api-secret" class="flex-1 block bg-slate-950/80 border border-slate-700/60 rounded-lg px-4 py-3 text-brand-300 text-sm break-all">${apiSecret}</code>
            <button onclick="navigator.clipboard.writeText(document.getElementById('api-secret').textContent)" class="px-3 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition border border-slate-700/60">Copy</button>
          </div>
          <p class="text-xs text-slate-400">Use it as <code class="text-slate-300">Authorization: Bearer ${apiSecret}</code> on every request instead of <code class="text-slate-300">x-tenant-id</code>.</p>
        </div>`
    : `
        <div class="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5">
          <p class="text-slate-300 text-sm">Welcome back! You're already registered — this login did not issue a new secret. If you lost your original secret, use <code class="text-slate-200">POST /api/v1/auth/rotate-key</code> with your current key to generate a new one.</p>
        </div>`;

  const emailBlock = needsEmail
    ? `
        <div class="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 space-y-3">
          <p class="text-slate-300 text-sm">GitHub didn't share a public email for your account. Add one so we can reach you for support and billing:</p>
          <form id="email-form" class="flex items-center gap-2">
            <input type="email" required placeholder="you@example.com" class="flex-1 bg-slate-950/80 border border-slate-700/60 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500/60">
            <button type="submit" class="px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-semibold text-sm transition">Save</button>
          </form>
          <p id="email-status" class="text-xs text-slate-500"></p>
        </div>
        <script>
          document.getElementById('email-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = e.target.querySelector('input');
            const status = document.getElementById('email-status');
            try {
              const res = await fetch('/api/v1/auth/email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ${apiSecret || ""}'
                },
                body: JSON.stringify({ email: input.value })
              });
              const data = await res.json();
              status.textContent = res.ok ? '✅ Saved.' : ('Error: ' + (data.error || 'request failed'));
            } catch (err) {
              status.textContent = 'Error: ' + err.message;
            }
          });
        </script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EasyDB — Registration Complete</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: { fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }, colors: { brand: { 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6' } } } }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-[#090d16] text-slate-100 antialiased min-h-screen flex flex-col">
  ${renderSiteNavigation()}
  <main class="w-full flex-1 flex items-center justify-center p-6">
  <div class="w-full max-w-lg space-y-6">
    <div class="text-center space-y-2">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-brand-500/30 text-brand-300 text-xs font-semibold">
        <span class="flex h-2 w-2 rounded-full bg-brand-400"></span>
        <span>${isNew ? "Tenant Provisioned" : "Signed In"}</span>
      </div>
      <h1 class="text-2xl font-bold text-white">Welcome to EasyDB</h1>
      <p class="text-slate-400 text-sm">Tenant ID: <code class="text-brand-300">${tenantId}</code>${email ? ` · ${email}` : ""}</p>
    </div>

    ${secretBlock}
    ${emailBlock}

    <div class="text-center">
      <a href="/" class="text-sm text-slate-400 hover:text-brand-400 transition">← Back to EasyDB</a>
    </div>
  </div>
    </main>
    ${renderSiteFooter()}
</body>
</html>`;
}

export interface DashboardPageOptions {
  tenantId: string;
  email: string | null;
  githubLogin: string;
  currentTierId: string;
  tiers: Record<string, Tier>;
  apiKeyLast4: string | null;
  keyRotatedAt: string | null;
  createdAt: string;
  tierExpiresAt: string | null;
  usage: {
    docStorageBytes: number;
    mediaStorageBytes: number;
    collections: number;
    requestsThisMonth: number;
    sqlStorageBytes: number;
    sqlRowsRead: number;
    sqlRowsWritten: number;
  };
}

function usageBar(label: string, used: number, limit: number | null, usedLabel: string, limitLabel: string): string {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-brand-500";
  return `
    <div class="space-y-1.5">
      <div class="flex items-center justify-between text-sm">
        <span class="text-slate-300">${label}</span>
        <span class="text-slate-400 font-mono text-xs">${usedLabel} / ${limitLabel}</span>
      </div>
      <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div class="h-full ${barColor} rounded-full" style="width: ${pct}%"></div>
      </div>
    </div>`;
}

export function renderDashboardPage(opts: DashboardPageOptions): string {
  const { tenantId, email, githubLogin, currentTierId, tiers, apiKeyLast4, keyRotatedAt, createdAt, tierExpiresAt, usage } = opts;
  const currentTier = tiers[currentTierId] || tiers.free;
  const maskedKey = apiKeyLast4 ? `edb_live_${"•".repeat(12)}${apiKeyLast4}` : "edb_live_••••••••••••••••";

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const resetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const hasPendingDowngrade = Boolean(tierExpiresAt);
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const planOrder: Array<keyof typeof tiers> = ["free", "developer", "scale"];
  const planCards = planOrder
    .map((id) => {
      const t = tiers[id as string];
      const isCurrent = id === currentTierId;
      return `
        <div class="rounded-xl border ${isCurrent ? "border-brand-500/50 bg-brand-500/5" : "border-slate-700/60 bg-slate-800/40"} p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-white">${t.name}</h3>
            ${isCurrent ? `<span class="px-2 py-0.5 text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full uppercase">Current Plan</span>` : ""}
          </div>
          <p class="text-2xl font-extrabold text-white">$${t.priceUsd}<span class="text-sm font-medium text-slate-400">/mo</span></p>
          <ul class="text-xs text-slate-400 space-y-1">
            <li>${t.requestsPerMonth.toLocaleString()} requests/mo</li>
            <li>${formatBytes(t.docStorageBytes)} NoSQL document storage</li>
            <li>${formatBytes(t.mediaStorageBytes)} object storage</li>
            <li>${formatBytes(t.sqlStorageBytes)} SQL storage &middot; ${t.maxSqlTables} tables</li>
            <li>${formatBytes(t.maxUploadBytes)} max file size</li>
            <li>${t.maxCollections === null ? "Unlimited" : t.maxCollections} collections</li>
          </ul>
          ${isCurrent
            ? `<div class="pt-1 text-center text-xs text-brand-400 font-semibold">You're on this plan</div>`
            : id === "free"
            ? hasPendingDowngrade
              ? `<div class="pt-1 text-center text-xs text-slate-500">Downgrade already scheduled</div>`
              : `<button type="button" id="downgrade-btn" class="block w-full text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-xs font-bold transition">Downgrade to Free</button>`
            : `<a href="/api/v1/billing/paypal/subscribe?plan=${id}" class="block w-full text-center py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition">Change Plan</a>`}
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EasyDB — Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: { fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }, colors: { brand: { 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488' } } } }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code { font-family: 'JetBrains Mono', monospace; }
    .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.07); }
  </style>
</head>
<body class="bg-[#090d16] text-slate-100 antialiased min-h-screen flex flex-col">
  ${renderSiteNavigation()}
  <main class="w-full flex-1">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Dashboard</h1>
        <p class="text-slate-400 text-sm">Tenant <code class="text-brand-300">${tenantId}</code> · GitHub @${githubLogin}${email ? ` · ${email}` : ""}</p>
      </div>
      <a href="/api/v1/auth/logout" class="px-4 py-2 rounded-lg glass hover:bg-slate-800 text-slate-300 text-sm font-semibold transition">Logout</a>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <div class="glass rounded-xl p-6 space-y-4">
        <h2 class="font-bold text-white">API Secret</h2>
        <div class="flex items-center gap-2">
          <code id="masked-key" data-masked="${maskedKey}" class="flex-1 block bg-slate-950/80 border border-slate-700/60 rounded-lg px-4 py-3 text-brand-300 text-sm break-all">${maskedKey}</code>
          <button id="toggle-key-btn" type="button" title="Show API key" class="shrink-0 px-3 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700/60">
            <svg id="eye-open" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <svg id="eye-closed" class="w-4 h-4 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
          </button>
          <button id="copy-key-btn" type="button" title="Copy API key" class="shrink-0 px-3 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700/60">Copy</button>
        </div>
        <p class="text-xs text-slate-500">${keyRotatedAt ? `Last rotated ${keyRotatedAt}` : `Issued ${createdAt}`}</p>
        <button id="rotate-btn" class="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-sm font-semibold transition">🔄 Rotate API Key</button>
        <div id="rotate-result" class="hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <p class="text-amber-300 text-xs font-semibold">⚠️ Shown once — save it now.</p>
          <div class="flex items-center gap-2">
            <code id="new-key" class="flex-1 block bg-slate-950/80 border border-slate-700/60 rounded-lg px-3 py-2 text-brand-300 text-xs break-all"></code>
            <button onclick="navigator.clipboard.writeText(document.getElementById('new-key').textContent)" class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700/60">Copy</button>
          </div>
        </div>
        <p id="rotate-error" class="hidden text-xs text-red-400"></p>
      </div>

      <div class="glass rounded-xl p-6 space-y-4">
        <div>
          <h2 class="font-bold text-white">Usage this period</h2>
          <p class="text-[11px] text-slate-500">NoSQL, SQL and object storage figures are totals across your account; request and SQL row counters reset monthly.</p>
        </div>
        ${usageBar("NoSQL document storage", usage.docStorageBytes, currentTier.docStorageBytes, formatBytes(usage.docStorageBytes), formatBytes(currentTier.docStorageBytes))}
        ${usageBar("Object storage", usage.mediaStorageBytes, currentTier.mediaStorageBytes, formatBytes(usage.mediaStorageBytes), formatBytes(currentTier.mediaStorageBytes))}
        ${usageBar("Collections", usage.collections, currentTier.maxCollections, String(usage.collections), currentTier.maxCollections === null ? "Unlimited" : String(currentTier.maxCollections))}
        ${usageBar("SQL storage", usage.sqlStorageBytes, currentTier.sqlStorageBytes, formatBytes(usage.sqlStorageBytes), formatBytes(currentTier.sqlStorageBytes))}
        ${usageBar("SQL rows read this month", usage.sqlRowsRead, currentTier.sqlRowsReadPerMonth, usage.sqlRowsRead.toLocaleString(), currentTier.sqlRowsReadPerMonth.toLocaleString())}
        ${usageBar("SQL rows written this month", usage.sqlRowsWritten, currentTier.sqlRowsWrittenPerMonth, usage.sqlRowsWritten.toLocaleString(), currentTier.sqlRowsWrittenPerMonth.toLocaleString())}
        ${usageBar("Requests this month", usage.requestsThisMonth, currentTier.requestsPerMonth, usage.requestsThisMonth.toLocaleString(), currentTier.requestsPerMonth.toLocaleString())}
        <p class="text-[11px] text-slate-500">${fmtDate(periodStart)} – ${fmtDate(periodEnd)} (UTC) · requests over your plan's monthly limit are rejected with a 429 until the counter resets on ${fmtDate(resetDate)}.</p>
      </div>
    </div>

    <div class="space-y-4">
      <h2 class="font-bold text-white">Subscription Plan</h2>
      ${hasPendingDowngrade
        ? `<div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Billing has been cancelled — no further charges. Your <strong>${currentTier.name}</strong> access continues until <strong>${fmtDateTime(tierExpiresAt!)}</strong>, the end of your already-paid period, then switches to Free automatically.</div>`
        : ""}
      <div class="grid sm:grid-cols-3 gap-4">
        ${planCards}
      </div>
      <p id="downgrade-error" class="hidden text-xs text-red-400"></p>
    </div>

    <div class="text-center">
      <a href="/" class="text-sm text-slate-400 hover:text-brand-400 transition">← Back to EasyDB</a>
    </div>
  </div>
  </main>
  ${renderSiteFooter()}

  <script>
    let revealedKey = null;
    let keyVisible = false;

    document.getElementById('toggle-key-btn').addEventListener('click', async () => {
      const keyEl = document.getElementById('masked-key');
      const eyeOpen = document.getElementById('eye-open');
      const eyeClosed = document.getElementById('eye-closed');

      if (keyVisible) {
        keyEl.textContent = keyEl.dataset.masked;
        keyVisible = false;
        eyeOpen.classList.remove('hidden');
        eyeClosed.classList.add('hidden');
        return;
      }

      try {
        if (!revealedKey) {
          const res = await fetch('/api/v1/auth/dashboard/reveal-key');
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to load API key');
          revealedKey = data.apiKey;
        }
        keyEl.textContent = revealedKey;
        keyVisible = true;
        eyeOpen.classList.add('hidden');
        eyeClosed.classList.remove('hidden');
      } catch (err) {
        edbAlert(err.message, { title: 'Something went wrong', variant: 'error' });
      }
    });

    document.getElementById('copy-key-btn').addEventListener('click', async () => {
      try {
        if (!revealedKey) {
          const res = await fetch('/api/v1/auth/dashboard/reveal-key');
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to load API key');
          revealedKey = data.apiKey;
        }
        await navigator.clipboard.writeText(revealedKey);
      } catch (err) {
        edbAlert(err.message, { title: 'Something went wrong', variant: 'error' });
      }
    });

    document.getElementById('rotate-btn').addEventListener('click', async () => {
      if (!(await edbConfirm('Rotate your API key? Your current key will stop working immediately.', { title: 'Rotate API key', variant: 'danger', okText: 'Rotate key' }))) return;
      const errorEl = document.getElementById('rotate-error');
      const resultEl = document.getElementById('rotate-result');
      errorEl.classList.add('hidden');
      try {
        const res = await fetch('/api/v1/auth/dashboard/rotate-key', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to rotate key');
        document.getElementById('new-key').textContent = data.apiSecret;
        resultEl.classList.remove('hidden');
        revealedKey = null;
        keyVisible = false;
        document.getElementById('eye-open').classList.remove('hidden');
        document.getElementById('eye-closed').classList.add('hidden');
        const newMasked = 'edb_live_' + '•'.repeat(12) + data.apiSecret.slice(-4);
        const keyEl = document.getElementById('masked-key');
        keyEl.dataset.masked = newMasked;
        keyEl.textContent = newMasked;
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    });

    const downgradeBtn = document.getElementById('downgrade-btn');
    if (downgradeBtn) {
      downgradeBtn.addEventListener('click', async () => {
        if (!(await edbConfirm('Downgrade to the Free plan? Billing will stop immediately with no further charges, but your current plan stays active until the end of your already-paid period, then switches to Free automatically.', { title: 'Downgrade to Free', variant: 'warning', okText: 'Downgrade' }))) return;
        const errorEl = document.getElementById('downgrade-error');
        errorEl.classList.add('hidden');
        downgradeBtn.disabled = true;
        try {
          const res = await fetch('/api/v1/billing/paypal/downgrade-to-free', { method: 'POST' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to schedule downgrade');
          location.reload();
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('hidden');
          downgradeBtn.disabled = false;
        }
      });
    }
  </script>
${DIALOG_SNIPPET}
</body>
</html>`;
}

export function renderPricingPage(): string {
  const tierOrder: Array<keyof typeof TIERS> = ["free", "developer", "scale"];

  const planCards = tierOrder
    .map((id) => {
      const t = TIERS[id as string];
      const isFree = id === "free";
      const cta = isFree
        ? `<a href="/api/v1/auth/github/login" class="block w-full text-center py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-brand-500/20">Get Started Free</a>`
        : `<a href="/api/v1/billing/paypal/subscribe?plan=${id}" class="block w-full text-center py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-brand-500/20">Upgrade with PayPal</a>
           <p class="text-center text-[11px] text-slate-500 mt-2">You'll be asked to sign in with GitHub first if you haven't already</p>`;

      return `
        <div class="rounded-2xl border ${isFree ? "border-brand-500/40 bg-brand-500/5" : "border-slate-700/60 bg-slate-800/40"} p-7 space-y-5 flex flex-col">
          <div>
            <h3 class="text-lg font-bold text-white">${t.name}</h3>
            <p class="mt-2"><span class="text-3xl font-extrabold text-white">$${t.priceUsd}</span><span class="text-slate-400 text-sm">/mo USD</span></p>
          </div>
          <ul class="text-sm text-slate-300 space-y-2.5 flex-1">
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${t.requestsPerMonth.toLocaleString()} requests / month</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${formatBytes(t.docStorageBytes)} NoSQL document storage</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${formatBytes(t.mediaStorageBytes)} object storage (files &amp; media)</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${formatBytes(t.sqlStorageBytes)} SQL storage, up to ${t.maxSqlTables} tables</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${(t.sqlRowsReadPerMonth / 1_000_000).toLocaleString()}M SQL rows read / ${t.sqlRowsWrittenPerMonth >= 1_000_000 ? (t.sqlRowsWrittenPerMonth / 1_000_000).toLocaleString() + "M" : (t.sqlRowsWrittenPerMonth / 1000).toLocaleString() + "k"} rows written per month</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${formatBytes(t.maxUploadBytes)} max file upload size</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${t.maxCollections === null ? "Unlimited" : "Up to " + t.maxCollections} collections</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> AI agent toolkit (SKILL.md &amp; llms.txt)</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${isFree ? "Community / Discord support" : id === "developer" ? "Email support" : "Priority support"}</li>
          </ul>
          <div>${cta}</div>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EasyDB — Pricing</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: { fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }, colors: { brand: { 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488' } } } }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-[#090d16] text-slate-100 antialiased min-h-screen flex flex-col">
  ${renderSiteNavigation()}
  <main class="w-full flex-1">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-14">

    <div class="text-center space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-brand-500/30 text-brand-300 text-xs font-semibold">
        <span class="flex h-2 w-2 rounded-full bg-brand-400 animate-pulse"></span>
        <span>Serverless pricing, no idle cluster tax</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold text-white">Simple, Generous Pricing</h1>
      <p class="text-slate-400 max-w-xl mx-auto">A free tier built for real projects, and paid tiers priced well below managed multi-vendor stacks. Every tier includes NoSQL documents, relational SQL, object storage, and our AI agent toolkit (SKILL.md &amp; llms.txt) for Claude Code, Codex and more.</p>
    </div>

    <div class="grid sm:grid-cols-3 gap-6">
      ${planCards}
    </div>

    <div class="text-center">
      <a href="/" class="text-sm text-slate-400 hover:text-brand-400 transition">← Back to EasyDB</a>
    </div>
  </div>
  </main>
  ${renderSiteFooter()}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderAgentsPage(skillMd: string): string {
  const preview = escapeHtml(skillMd);
  const promptText = "Read https://easy-db.cloud/SKILL.md and use it to build against the EasyDB API. Ask me for my API key (or use the demo_store sandbox) before writing data.";

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EasyDB — For AI Coding Agents</title>
  <meta name="description" content="Download SKILL.md and give your AI coding agent (Claude Code, Codex, Copilot, Cursor) everything it needs to use the EasyDB API.">
  <link rel="alternate" type="text/markdown" href="/SKILL.md">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: { fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }, colors: { brand: { 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488' } } } }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-[#090d16] text-slate-100 antialiased min-h-screen flex flex-col">
  ${renderSiteNavigation()}
  <main class="w-full flex-1">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-10">

    <div class="text-center space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-brand-500/30 text-brand-300 text-xs font-semibold">
        <span class="flex h-2 w-2 rounded-full bg-brand-400 animate-pulse"></span>
        <span>Built for Claude Code, Codex, Copilot, Cursor &amp; friends</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold text-white">EasyDB for AI Coding Agents</h1>
      <p class="text-slate-400 max-w-2xl mx-auto">Give your agent one file and it knows every endpoint, auth mode, quota and pitfall, so it can start using EasyDB correctly on the first try.</p>
    </div>

    <div class="grid sm:grid-cols-2 gap-4">
      <div class="rounded-2xl border border-brand-500/40 bg-brand-500/5 p-6 space-y-4">
        <h2 class="font-bold text-white">SKILL.md</h2>
        <p class="text-sm text-slate-400">The complete agent guide in markdown.</p>
        <div class="flex flex-wrap gap-2">
          <a href="/SKILL.md?download=1" download="SKILL.md" class="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-semibold text-sm transition">Download</a>
          <button id="copy-skill" type="button" class="px-4 py-2 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition">Copy</button>
          <a href="/SKILL.md" class="px-4 py-2 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition">Raw</a>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 space-y-4">
        <h2 class="font-bold text-white">llms.txt</h2>
        <p class="text-sm text-slate-400">A short index that AI tools use to discover the docs.</p>
        <div class="flex flex-wrap gap-2">
          <a href="/llms.txt?download=1" download="llms.txt" class="px-4 py-2 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition">Download</a>
          <a href="/llms.txt" class="px-4 py-2 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition">View</a>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <h2 class="text-xl font-bold text-white">Use it with your agent</h2>

      <div class="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-2">
        <h3 class="text-sm font-semibold text-brand-300">Any agent: paste this prompt</h3>
        <pre id="prompt-text" class="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap">${escapeHtml(promptText)}</pre>
        <button id="copy-prompt" type="button" class="text-xs px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition">Copy prompt</button>
      </div>

      <div class="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-2">
        <h3 class="text-sm font-semibold text-brand-300">Claude Code: install as a skill</h3>
        <pre class="text-xs sm:text-sm text-slate-300 overflow-x-auto">mkdir -p .claude/skills/easydb
curl -o .claude/skills/easydb/SKILL.md https://easy-db.cloud/SKILL.md</pre>
        <p class="text-xs text-slate-500">Use <code>~/.claude/skills/easydb/</code> instead to make it available in every project.</p>
      </div>

      <div class="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-2">
        <h3 class="text-sm font-semibold text-brand-300">Codex, Copilot, Cursor and others: add to your project instructions</h3>
        <pre class="text-xs sm:text-sm text-slate-300 overflow-x-auto">mkdir -p docs
curl -o docs/easydb.md https://easy-db.cloud/SKILL.md
echo "For EasyDB (easy-db.cloud) API usage, read docs/easydb.md" >> AGENTS.md</pre>
      </div>

      <p class="text-sm text-slate-400">Keep your API key out of the file and the chat: set it as <code class="text-brand-300">EASYDB_API_KEY</code> in your environment. Get a key by <a href="/api/v1/auth/github/login" class="text-brand-400 hover:underline">signing in with GitHub</a>, or try the shared <code class="text-brand-300">demo_store</code> sandbox with no key.</p>
    </div>

    <div class="space-y-3">
      <h2 class="text-xl font-bold text-white">Preview: SKILL.md</h2>
      <pre class="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 text-xs text-slate-300 overflow-auto max-h-[32rem] whitespace-pre-wrap">${preview}</pre>
    </div>

    <div class="text-center">
      <a href="/" class="text-sm text-slate-400 hover:text-brand-400 transition">← Back to EasyDB</a>
    </div>
  </div>

  <script>
    function wireCopy(btnId, getText) {
      var btn = document.getElementById(btnId);
      btn.addEventListener('click', async function () {
        var label = btn.textContent;
        try {
          await navigator.clipboard.writeText(await getText());
          btn.textContent = 'Copied!';
        } catch (e) {
          btn.textContent = 'Copy failed';
        }
        setTimeout(function () { btn.textContent = label; }, 1800);
      });
    }
    wireCopy('copy-skill', function () { return fetch('/SKILL.md').then(function (r) { return r.text(); }); });
    wireCopy('copy-prompt', function () { return document.getElementById('prompt-text').textContent; });
  </script>
  </main>
  ${renderSiteFooter()}
</body>
</html>`;
}


const ADMIN_HEAD = `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{brand:{400:'#38bdf8'}}}}}</script>`;

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderAdminLoginPage(configured: boolean): string {
  return `<!DOCTYPE html>
<html lang="en"><head>${ADMIN_HEAD}<title>EasyDB Admin Login</title></head>
<body class="bg-slate-950 text-slate-200 min-h-screen flex flex-col" style="font-family:'Plus Jakarta Sans',sans-serif">
${renderSiteNavigation()}
<main class="flex-1 flex items-center justify-center p-6">
<form id="f" class="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8 space-y-4">
  <h1 class="text-xl font-bold">Admin Login</h1>
  ${configured ? "" : `<p class="text-sm text-amber-400">Admin credentials are not configured on this server.</p>`}
  <input id="u" autocomplete="username" placeholder="Username" required class="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
  <input id="p" type="password" autocomplete="current-password" placeholder="Password" required class="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
  <p id="err" class="text-sm text-red-400 hidden"></p>
  <button class="w-full rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2 text-sm">Sign in</button>
  <a href="/" class="block text-center text-xs text-slate-400 hover:text-white">&larr; Back to site</a>
</form>
<script>
document.getElementById('f').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const err = document.getElementById('err');
  err.classList.add('hidden');
  const r = await fetch('/api/v1/admin/login', { method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ username: document.getElementById('u').value, password: document.getElementById('p').value }) });
  if (r.ok) { location.reload(); return; }
  const d = await r.json().catch(() => ({}));
  err.textContent = d.error || 'Login failed';
  err.classList.remove('hidden');
});
</script></main>${renderSiteFooter()}</body></html>`;
}

export interface AdminTenantRow {
  tenantId: string;
  email: string | null;
  githubLogin: string;
  tier: string;
  tierName: string;
  priceUsd: number;
  tierExpiresAt: string | null;
  createdAt: string | null;
  lastSeenAt: string | null;
  blocked: boolean;
  notes: string;
  tags: string;
  sqlTables: number | null;
  sqlTablesQuota: number;
  sqlStorageBytes: number;
  sqlStorageQuotaBytes: number;
  sqlRowsRead: number;
  sqlRowsReadQuota: number;
  sqlRowsWritten: number;
  sqlRowsWrittenQuota: number;
  collectionsQuota: number | null;
  documents: number;
  collections: number;
  docBytes: number;
  mediaFiles: number;
  mediaBytes: number;
  docQuotaBytes: number;
  mediaQuotaBytes: number;
  requestsThisMonth: number;
  requestQuota: number;
  paypal: {
    subscriptionId: string | null;
    synced: boolean;
    status: string | null;
    startTime: string | null;
    payerEmail: string | null;
    priceMonthly: number | null;
    currency: string | null;
    lastPayment: number | null;
    lastPaymentAt: string | null;
    nextBillingAt: string | null;
    failedPayments: number;
    collected30d: number;
    syncedAt: string | null;
    mismatch: string;
  };
}

export interface AdminAuditRow {
  at: string;
  action: string;
  tenantId: string;
  detail: string;
}

export interface AdminPageOptions {
  azure: { account: string; table: string; container: string };
  audit: AdminAuditRow[];
  tenants: AdminTenantRow[];
  tierCounts: Record<string, number>;
  totals: {
    documents: number;
    docBytes: number;
    mediaFiles: number;
    mediaBytes: number;
    sqlTables: number;
    sqlStorageBytes: number;
    sqlRowsRead: number;
    sqlRowsWritten: number;
  };
  sqlTablesUnavailable: boolean;
  formatBytes: (n: number) => string;
}

export function renderAdminPage(opts: AdminPageOptions): string {
  const { tenants, tierCounts, totals, formatBytes, audit, azure, sqlTablesUnavailable } = opts;
  const e = escapeHtml;
  const a = escapeAttr;
  const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Revenue is taken from PayPal's own data (active subscriptions, plan price from PayPal);
  // tenants not yet synced are excluded so the figure always matches the PayPal dashboard.
  const active = tenants.filter((t) => t.paypal.synced && t.paypal.status === "ACTIVE");
  const priceOf = (t: AdminTenantRow) => t.paypal.priceMonthly ?? 0;
  const payers = active;
  const mrr = active.reduce((sum, t) => sum + priceOf(t), 0);
  const collected30d = tenants.reduce((sum, t) => sum + t.paypal.collected30d, 0);
  const churning = tenants.filter((t) => t.tierExpiresAt);
  const atRisk = churning.reduce((sum, t) => sum + (t.paypal.priceMonthly ?? t.priceUsd), 0);
  const unsynced = tenants.filter((t) => t.paypal.subscriptionId && !t.paypal.synced).length;
  const mismatches = tenants.filter((t) => t.paypal.mismatch).length;
  const pastDue = tenants.filter((t) => t.paypal.failedPayments > 0).length;
  const lastSync = tenants.map((t) => t.paypal.syncedAt || "").sort().pop() || "never";
  const blockedCount = tenants.filter((t) => t.blocked).length;
  const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const newThisMonth = tenants.filter((t) => t.createdAt && Date.parse(t.createdAt.replace(" ", "T") + "Z") >= monthAgo).length;
  const conversion = tenants.length ? Math.round((payers.length / tenants.length) * 100) : 0;
  const arpu = payers.length ? mrr / payers.length : 0;

  const revenueByPlan = Object.entries(
    payers.reduce<Record<string, { n: number; sum: number }>>((acc, t) => {
      const x = (acc[t.tierName] ||= { n: 0, sum: 0 });
      x.n++;
      x.sum += priceOf(t);
      return acc;
    }, {})
  )
    .map(([name, x]) => `<span class="px-3 py-1 rounded bg-slate-800 text-sm">${e(name)}: <b>${x.n}</b> = <b>${usd(x.sum)}</b>/mo</span>`)
    .join(" ");

  const tierOptions = ["free", "developer", "scale"]
    .map((id) => `<option value="${id}">${id[0].toUpperCase() + id.slice(1)}</option>`)
    .join("");

  const rows = tenants
    .map((t) => {
      const emailHref = t.email ? `mailto:${a(encodeURIComponent(t.email))}` : "";
      const tags = t.tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">${e(x)}</span>`)
        .join(" ");
      return `<tr class="border-t border-slate-800 tenant-row" data-search="${a((t.tenantId + " " + (t.email || "") + " " + t.githubLogin + " " + t.tags + " " + t.notes).toLowerCase())}" data-tier="${a(t.tier)}" data-status="${t.blocked ? "blocked" : "active"}" data-mismatch="${t.paypal.mismatch ? "1" : ""}">
        <td data-label="Tenant ID" class="px-4 py-3 font-mono text-xs">${e(t.tenantId)}</td>
        <td data-label="Email" class="px-4 py-3">${t.email ? `<a class="text-sky-300 hover:underline" href="${emailHref}">${e(t.email)}</a>` : "—"}<div class="text-xs text-slate-500">@${e(t.githubLogin)}</div><div class="mt-1 flex flex-wrap gap-1">${tags}</div>${t.notes ? `<div class="text-xs text-slate-500 mt-1 max-w-xs truncate" title="${a(t.notes)}">📝 ${e(t.notes)}</div>` : ""}</td>
        <td data-label="Plan" class="px-4 py-3"><span class="px-2 py-0.5 rounded bg-slate-800 text-brand-400 text-xs font-semibold">${e(t.tierName)}</span>${
          t.tierExpiresAt ? `<div class="text-xs text-amber-400">cancels ${e(t.tierExpiresAt)}</div>` : ""
        }<div class="text-xs text-slate-500">Starts ${e(t.paypal.startTime || (t.paypal.subscriptionId ? "not synced" : t.createdAt || "—"))}</div><div class="text-xs text-slate-500">Period ends ${e(t.tierExpiresAt || t.paypal.nextBillingAt || (t.paypal.status === "ACTIVE" ? "no scheduled end" : "—"))}</div></td>
        <td data-label="PayPal" class="px-4 py-3 text-xs">${
          t.paypal.subscriptionId
            ? t.paypal.synced
              ? `<div class="font-semibold ${t.paypal.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400"}">${e(t.paypal.status || "?")}</div>
                 <div>${t.paypal.priceMonthly != null ? e(`${t.paypal.priceMonthly.toFixed(2)} ${t.paypal.currency || ""}`) + "/mo" : "—"}</div>
                 <div class="text-slate-500">last ${t.paypal.lastPayment != null ? e(t.paypal.lastPayment.toFixed(2)) : "—"} ${e((t.paypal.lastPaymentAt || "").slice(0, 10))}</div>
                 <div class="text-slate-500">next ${e((t.paypal.nextBillingAt || "—").slice(0, 10))}</div>
                 <div class="text-slate-500">30d collected ${t.paypal.collected30d.toFixed(2)}</div>
                 ${t.paypal.failedPayments ? `<div class="text-red-400">${t.paypal.failedPayments} failed payment(s)</div>` : ""}
                 <div class="text-slate-600 font-mono">${e(t.paypal.subscriptionId)}</div>
                 ${t.paypal.payerEmail ? `<div class="text-slate-500">${e(t.paypal.payerEmail)}</div>` : ""}`
              : `<div class="text-slate-500">Not synced</div><div class="text-slate-600 font-mono">${e(t.paypal.subscriptionId)}</div>`
            : `<span class="text-slate-500">No subscription</span>`
        }${t.paypal.mismatch ? `<div class="mt-1 text-red-400 font-semibold">⚠ ${e(t.paypal.mismatch)}</div>` : ""}</td>
        <td data-label="Status" class="px-4 py-3">${t.blocked ? `<span class="text-red-400 text-xs font-semibold">PAUSED</span>` : `<span class="text-emerald-400 text-xs font-semibold">Active</span>`}</td>
        <td data-label="Documents" class="px-4 py-3">${t.documents.toLocaleString()} docs<div class="text-xs text-slate-500">${t.collections} collections &bull; ${formatBytes(t.docBytes)} / ${formatBytes(t.docQuotaBytes)}</div></td>
        <td data-label="Media" class="px-4 py-3">${t.mediaFiles.toLocaleString()} files<div class="text-xs text-slate-500">${formatBytes(t.mediaBytes)} / ${formatBytes(t.mediaQuotaBytes)}</div></td>
        <td data-label="Requests" class="px-4 py-3">${t.requestsThisMonth.toLocaleString()} / ${t.requestQuota.toLocaleString()}<div class="text-xs text-slate-500">this month (UTC)</div></td>
        <td data-label="SQL" class="px-4 py-3 text-xs">
          <div>Tables ${t.sqlTables == null ? "unavailable" : `${t.sqlTables.toLocaleString()} / ${t.sqlTablesQuota.toLocaleString()}`}</div>
          <div>Storage ${formatBytes(t.sqlStorageBytes)} / ${formatBytes(t.sqlStorageQuotaBytes)}</div>
          <div>Rows read ${t.sqlRowsRead.toLocaleString()} / ${t.sqlRowsReadQuota.toLocaleString()}</div>
          <div>Rows written ${t.sqlRowsWritten.toLocaleString()} / ${t.sqlRowsWrittenQuota.toLocaleString()}</div>
        </td>
        <td data-label="Activity" class="px-4 py-3 text-xs text-slate-400">${e(t.createdAt || "—")}<div>seen ${e(t.lastSeenAt || "never")}</div></td>
        <td data-label="Manage" class="px-4 py-3 text-xs whitespace-nowrap space-y-1">
          <div class="flex gap-2">
            <button class="act text-sky-400 hover:underline" title="${t.blocked ? "Resume tenant access" : "Temporarily pause tenant access"}" data-act="${t.blocked ? "unblock" : "block"}" data-id="${a(t.tenantId)}">${t.blocked ? "Resume" : "Pause"}</button>
            <button class="act text-red-400 hover:underline" data-act="delete" data-id="${a(t.tenantId)}">Delete</button>
            <button class="act text-slate-300 hover:underline" data-act="notes" data-id="${a(t.tenantId)}" data-notes="${a(t.notes)}" data-tags="${a(t.tags)}">Notes</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  const quotaAlerts = tenants.flatMap((t) => {
    const metrics: Array<{ name: string; used: number; limit: number; display: (value: number) => string }> = [
      { name: "Document storage", used: t.docBytes, limit: t.docQuotaBytes, display: formatBytes },
      { name: "Media storage", used: t.mediaBytes, limit: t.mediaQuotaBytes, display: formatBytes },
      ...(t.collectionsQuota === null ? [] : [{ name: "Collections", used: t.collections, limit: t.collectionsQuota, display: (n: number) => n.toLocaleString() }]),
      { name: "Requests this month", used: t.requestsThisMonth, limit: t.requestQuota, display: (n) => n.toLocaleString() },
      { name: "SQL storage", used: t.sqlStorageBytes, limit: t.sqlStorageQuotaBytes, display: formatBytes },
      { name: "SQL rows read this month", used: t.sqlRowsRead, limit: t.sqlRowsReadQuota, display: (n) => n.toLocaleString() },
      { name: "SQL rows written this month", used: t.sqlRowsWritten, limit: t.sqlRowsWrittenQuota, display: (n) => n.toLocaleString() },
      { name: "SQL tables", used: t.sqlTables ?? 0, limit: t.sqlTablesQuota, display: (n) => n.toLocaleString() },
    ];
    if (t.sqlTables == null) metrics.pop();
    return metrics.flatMap((metric) => {
      if (metric.limit <= 0) return [];
      const percent = (metric.used / metric.limit) * 100;
      const thresholds = [50, 70, 100].filter((threshold) => percent >= threshold);
      if (!thresholds.length) return [];
      return [{ tenant: t, metric, percent, thresholds, level: thresholds[thresholds.length - 1] }];
    });
  }).sort((left, right) => right.level - left.level || right.percent - left.percent);
  const notificationRows = quotaAlerts.map(({ tenant, metric, percent, thresholds, level }) => {
    const color = level >= 100 ? "text-red-300 bg-red-500/10 border-red-500/30" : level >= 70 ? "text-amber-300 bg-amber-500/10 border-amber-500/30" : "text-sky-300 bg-sky-500/10 border-sky-500/30";
    const milestones = thresholds.map((threshold) => `<span class="rounded px-1.5 py-0.5 ${threshold === 100 ? "bg-red-500/20 text-red-300" : threshold === 70 ? "bg-amber-500/20 text-amber-300" : "bg-sky-500/20 text-sky-300"}">${threshold}%</span>`).join(" ");
    const email = tenant.email ? `<a class="text-sky-300 hover:underline" href="mailto:${a(encodeURIComponent(tenant.email))}">${e(tenant.email)}</a>` : `<span class="text-slate-500">No email on file</span>`;
    return `<tr class="border-t border-slate-800"><td class="px-3 py-2"><div class="font-mono text-xs">${e(tenant.tenantId)}</div>${email}</td><td class="px-3 py-2">${e(metric.name)}</td><td class="px-3 py-2">${e(metric.display(metric.used))} / ${e(metric.display(metric.limit))}<div class="text-xs text-slate-500">${Math.round(percent)}% used</div></td><td class="px-3 py-2"><div class="inline-flex gap-1 rounded border px-2 py-1 text-xs ${color}">${milestones}</div></td></tr>`;
  }).join("");

  const tierBadges = Object.entries(tierCounts)
    .map(([name, n]) => `<span class="px-3 py-1 rounded bg-slate-800 text-sm">${e(name)}: <b>${n}</b></span>`)
    .join(" ");
  const card = (label: string, value: string, sub = "") =>
    `<div class="rounded-lg border border-slate-800 p-4"><div class="text-xs text-slate-400">${label}</div><div class="text-2xl font-bold mt-1">${value}</div>${sub ? `<div class="text-xs text-slate-500 mt-1">${sub}</div>` : ""}</div>`;

  return `<!DOCTYPE html>
<html lang="en"><head>${ADMIN_HEAD}<title>EasyDB Admin</title><style>
@media (max-width: 767px) {
  .resp-table thead { display: none; }
  .resp-table, .resp-table tbody, .resp-table tr, .resp-table td { display: block; width: 100%; }
  .resp-table tr.tenant-row { margin-bottom: .75rem; border: 1px solid #1e293b; border-radius: .5rem; padding: .25rem 0; }
  .resp-table td[data-label] { display: flex; gap: .75rem; padding: .4rem .9rem !important; border: 0; word-break: break-word; }
  .resp-table td[data-label]::before { content: attr(data-label); flex: 0 0 5.5rem; font-size: .65rem; text-transform: uppercase; color: #64748b; padding-top: .15rem; }
  .resp-table td[data-label] > * { min-width: 0; }
}
</style></head>
<body class="bg-slate-950 text-slate-200 min-h-screen flex flex-col" style="font-family:'Plus Jakarta Sans',sans-serif">
${renderSiteNavigation()}
<main class="w-full flex-1">
<div class="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
  <div class="flex flex-wrap items-center justify-between gap-3 mb-8">
    <h1 class="text-2xl font-bold">Admin Dashboard</h1>
    <div class="flex flex-wrap gap-4 text-sm">
      <a href="/admin/export.csv" class="text-slate-400 hover:text-white">Export CSV</a>
      <a href="/" class="text-slate-400 hover:text-white">Site</a>
      <button id="logout" class="text-slate-400 hover:text-white">Sign out</button>
    </div>
  </div>
  <div class="flex flex-wrap items-center gap-3 mb-3 text-xs text-slate-400">
    <button id="sync" class="rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-3 py-1.5">Refresh from PayPal</button>
    <span id="syncmsg">Kept in sync automatically (PayPal webhooks + every 15 min). Last update: ${e(lastSync)}${unsynced ? ` &bull; <span class="text-amber-400">${unsynced} subscription(s) not synced</span>` : ""}</span>
  </div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
    ${card("PayPal MRR (active subs)", usd(mrr), `ARR ${usd(mrr * 12)}`)}
    ${card("Collected, last 30 days", usd(collected30d), "gross, per PayPal transactions")}
    ${card("Paying tenants", String(payers.length), `${conversion}% conversion &bull; ARPU ${usd(arpu)}`)}
    ${card("Revenue at risk", usd(atRisk), `${churning.length} cancelling &bull; ${pastDue} with failed payments`)}
  </div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
    ${card("Total tenants", tenants.length.toLocaleString(), `${newThisMonth} new in 30 days`)}
    ${card("Paused", String(blockedCount))}
    ${card("Plan mismatches", String(mismatches), "should be 0 — PayPal is the source of truth")}
    ${card("Unsynced subscriptions", String(unsynced))}
  </div>
  <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
    ${card("Documents", totals.documents.toLocaleString())}
    ${card("Document storage", formatBytes(totals.docBytes))}
    ${card("Media", `${totals.mediaFiles.toLocaleString()} files`, formatBytes(totals.mediaBytes))}
  </div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
    ${card("SQL tables", sqlTablesUnavailable ? "Unavailable" : totals.sqlTables.toLocaleString(), sqlTablesUnavailable ? "Turso table metadata could not be loaded" : "across all tenants")}
    ${card("SQL storage", formatBytes(totals.sqlStorageBytes))}
    ${card("SQL rows read", totals.sqlRowsRead.toLocaleString(), "this month (UTC)")}
    ${card("SQL rows written", totals.sqlRowsWritten.toLocaleString(), "this month (UTC)")}
  </div>
  ${sqlTablesUnavailable ? `<div class="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">SQL table counts are unavailable. Check the Turso connection configuration; SQL storage and row counters below are from Cloudflare D1.</div>` : ""}
  <h2 class="text-lg font-bold mt-8 mb-3">Notifications <span class="text-sm font-normal text-slate-400">(${quotaAlerts.length} quota alerts at 50%, 70% or 100%)</span></h2>
  <div class="mb-6 overflow-x-auto rounded-lg border border-slate-800">
    <table class="w-full text-sm text-left"><thead class="bg-slate-900 text-xs uppercase text-slate-400"><tr><th class="px-3 py-2">Tenant / Email</th><th class="px-3 py-2">Quota</th><th class="px-3 py-2">Usage</th><th class="px-3 py-2">Thresholds reached</th></tr></thead>
      <tbody>${notificationRows || `<tr><td colspan="4" class="px-3 py-4 text-slate-500">No tenants have reached 50% of a tracked quota.</td></tr>`}</tbody>
    </table>
  </div>
  <div class="mb-2 flex flex-wrap gap-2 items-center"><span class="text-xs text-slate-400">Plans:</span> ${tierBadges}</div>
  <div class="mb-6 flex flex-wrap gap-2 items-center"><span class="text-xs text-slate-400">Revenue:</span> ${revenueByPlan || `<span class="text-xs text-slate-500">No paying tenants</span>`}</div>

  <div class="mb-4 rounded-lg border border-slate-800 p-4 text-xs text-slate-400">
    <div class="text-slate-300 font-semibold mb-1">Azure backend (single shared setup &mdash; no per-tenant tables or containers)</div>
    Storage account <code class="text-sky-300">${e(azure.account)}</code> &bull;
    Table <code class="text-sky-300">${e(azure.table)}</code> (PartitionKey <code>tenantId__collection</code>, RowKey <code>docId</code>) &bull;
    Container <code class="text-sky-300">${e(azure.container)}</code> (blob path <code>tenantId/fileName</code>).
    Tenant identities and emails are joined from Cloudflare D1; SQL tables use tenant-specific hashed prefixes.
    <div class="mt-2 flex flex-wrap gap-3"><a class="text-sky-300 hover:underline" href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer">Azure Portal</a><a class="text-sky-300 hover:underline" href="https://turso.tech/app" target="_blank" rel="noopener noreferrer">Turso Dashboard</a><a class="text-sky-300 hover:underline" href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Cloudflare Dashboard</a><span class="text-slate-500">Sign in to provider consoles separately; service credentials are never shown here.</span></div>
  </div>

  <div class="flex flex-wrap gap-3 mb-4">
    <input id="q" placeholder="Search ID, email, GitHub, tag, note…" class="flex-1 min-w-[12rem] w-full sm:w-auto rounded bg-slate-900 border border-slate-700 px-3 py-2 text-sm">
    <select id="ft" class="rounded bg-slate-900 border border-slate-700 px-3 py-2 text-sm"><option value="">All plans</option>${tierOptions}</select>
    <select id="fs" class="rounded bg-slate-900 border border-slate-700 px-3 py-2 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="blocked">Paused</option></select>
    <label class="flex items-center gap-2 text-sm text-slate-300"><input id="fm" type="checkbox"> Mismatches only</label>
  </div>

  <div class="overflow-x-auto rounded-lg border border-slate-800">
    <table class="w-full text-sm text-left resp-table">
      <thead class="bg-slate-900 text-xs uppercase text-slate-400"><tr>
        <th class="px-4 py-3">Tenant ID</th><th class="px-4 py-3">Email</th><th class="px-4 py-3">Plan</th><th class="px-4 py-3">PayPal</th><th class="px-4 py-3">Status</th>
        <th class="px-4 py-3">Documents</th><th class="px-4 py-3">Media</th><th class="px-4 py-3">Requests</th><th class="px-4 py-3">SQL</th><th class="px-4 py-3">Activity</th><th class="px-4 py-3">Manage</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="11" class="px-4 py-6 text-center text-slate-500">No tenants yet.</td></tr>`}</tbody>
    </table>
  </div>
  <h2 class="text-lg font-bold mt-10 mb-3">Admin activity log</h2>
  <div class="overflow-x-auto rounded-lg border border-slate-800">
    <table class="w-full text-xs text-left"><tbody>${
      audit.map((x) => `<tr class="border-t border-slate-800"><td class="px-4 py-2 text-slate-400">${e(x.at)}</td><td class="px-4 py-2 font-semibold">${e(x.action)}</td><td class="px-4 py-2 font-mono">${e(x.tenantId)}</td><td class="px-4 py-2 text-slate-400">${e(x.detail)}</td></tr>`).join("") ||
      `<tr><td class="px-4 py-3 text-slate-500">No admin actions yet.</td></tr>`
    }</tbody></table>
  </div>
</div>
</main>
${renderSiteFooter()}
<script>
const post = async (path, body) => {
  const r = await fetch(path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { alert(d.error || 'Request failed'); if (r.status === 401) location.reload(); return null; }
  return d;
};
document.querySelectorAll('.act').forEach((b) => b.addEventListener('click', async () => {
  const id = b.dataset.id, act = b.dataset.act;
  let res = null;
  if (act === 'block' || act === 'unblock') {
    if (!confirm((act === 'block' ? 'Temporarily pause access for ' : 'Resume access for ') + id + '?')) return;
    res = await post('/api/v1/admin/tenant/block', { tenantId: id, blocked: act === 'block' });
  } else if (act === 'delete') {
    const c = prompt('This permanently deletes the tenant, its documents, media and API key.\\nType the tenant ID to confirm:\\n' + id);
    if (c === null) return;
    res = await post('/api/v1/admin/tenant/delete', { tenantId: id, confirm: c });
    if (res && res.externalFailures) alert(res.externalFailures + ' external storage item(s) could not be removed.');
  } else if (act === 'notes') {
    const tags = prompt('Tags (comma separated):', b.dataset.tags || '');
    if (tags === null) return;
    const notes = prompt('Notes:', b.dataset.notes || '');
    if (notes === null) return;
    res = await post('/api/v1/admin/tenant/notes', { tenantId: id, tags, notes });
  }
  if (res) location.reload();
}));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const filter = () => {
  const mm = document.getElementById('fm').checked;
  const q = document.getElementById('q').value.toLowerCase(), t = document.getElementById('ft').value, st = document.getElementById('fs').value;
  document.querySelectorAll('.tenant-row').forEach((r) => {
    const show = (!q || r.dataset.search.includes(q)) && (!t || r.dataset.tier === t) && (!st || r.dataset.status === st) && (!mm || r.dataset.mismatch);
    r.style.display = show ? '' : 'none';
  });
};
['q','ft','fs','fm'].forEach((id) => document.getElementById(id).addEventListener('input', filter));
document.getElementById('sync').addEventListener('click', async (ev) => {
  ev.target.disabled = true;
  const msg = document.getElementById('syncmsg');
  let failed = 0;
  for (let i = 0; i < 100; i++) {
    const d = await post('/api/v1/admin/paypal/sync', {});
    if (!d) { ev.target.disabled = false; return; }
    failed += d.failed;
    msg.textContent = 'Syncing… ' + d.remaining + ' remaining';
    if (d.remaining === 0) break;
  }
  if (failed) alert(failed + ' subscription(s) could not be fetched from PayPal.');
  location.reload();
});
document.getElementById('logout').addEventListener('click', async () => { await post('/api/v1/admin/logout', {}); location.reload(); });
</script>
</body></html>`;
}
