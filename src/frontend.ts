import { Tier, TIERS, formatBytes } from "./tiers";

export function renderLandingPage(heroImageUrl: string, logoIconUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EasyDB — The Edge-Native NoSQL & Media Database</title>
  <link rel="icon" type="image/webp" href="${logoIconUrl}">
  <link rel="apple-touch-icon" href="${logoIconUrl}">
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

  <!-- Navbar -->
  <header class="sticky top-0 z-50 glass border-b border-slate-800/80">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img src="${logoIconUrl}" alt="EasyDB Icon" class="h-10 w-10 rounded-xl object-contain shadow-lg shadow-brand-500/20 border border-slate-700/60 p-1 bg-slate-900/90">
        <div>
          <span class="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-400 bg-clip-text text-transparent">EasyDB</span>
          <span class="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full uppercase tracking-wider">v1.0 Live</span>
        </div>
      </div>

      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
        <a href="#features" class="hover:text-brand-400 transition">Features</a>
        <a href="#comparison" class="hover:text-brand-400 transition">vs MongoDB</a>
        <a href="#demo" class="hover:text-brand-400 transition">Live Demo</a>
        <a href="#api" class="hover:text-brand-400 transition">API Reference</a>
        <a href="/pricing" class="hover:text-brand-400 transition">Pricing</a>
      </nav>

      <div class="hidden md:flex items-center gap-3">
        <a href="/dashboard" class="px-4 py-2 rounded-lg glass hover:bg-slate-800 text-slate-200 font-semibold text-sm transition border border-slate-700/80 flex items-center gap-2">
          <span>Dashboard</span>
        </a>
        <a href="/api/v1/auth/github/login" class="px-4 py-2 rounded-lg glass hover:bg-slate-800 text-slate-200 font-semibold text-sm transition border border-slate-700/80 flex items-center gap-2">
          <span>Sign Up with GitHub</span>
        </a>
        <a href="#demo" class="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-brand-500/25 flex items-center gap-2">
          <span>Try Demo</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
        <a href="https://github.com/HashimsGitHub/easydb" target="_blank" rel="noopener noreferrer" class="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700/60" title="GitHub Repository">
          <svg class="w-5 h-5 fill-currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </a>
      </div>

      <button onclick="toggleMobileMenu()" id="mobile-menu-btn" class="md:hidden p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition border border-slate-700/60" aria-label="Toggle menu" aria-expanded="false">
        <svg id="mobile-menu-icon-open" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        <svg id="mobile-menu-icon-close" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <div id="mobile-menu" class="hidden md:hidden border-t border-slate-800/80 px-4 sm:px-6 py-4 space-y-4">
      <nav class="flex flex-col gap-1 text-sm font-medium text-slate-300">
        <a href="#features" onclick="toggleMobileMenu()" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-brand-400 transition">Features</a>
        <a href="#comparison" onclick="toggleMobileMenu()" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-brand-400 transition">vs MongoDB</a>
        <a href="#demo" onclick="toggleMobileMenu()" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-brand-400 transition">Live Demo</a>
        <a href="#api" onclick="toggleMobileMenu()" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-brand-400 transition">API Reference</a>
        <a href="/pricing" class="px-2 py-2 rounded-lg hover:bg-slate-800/80 hover:text-brand-400 transition">Pricing</a>
      </nav>
      <div class="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
        <a href="/dashboard" class="px-4 py-2.5 rounded-lg glass hover:bg-slate-800 text-slate-200 font-semibold text-sm transition border border-slate-700/80 text-center">Dashboard</a>
        <a href="/api/v1/auth/github/login" class="px-4 py-2.5 rounded-lg glass hover:bg-slate-800 text-slate-200 font-semibold text-sm transition border border-slate-700/80 text-center">Sign Up with GitHub</a>
        <a href="#demo" onclick="toggleMobileMenu()" class="px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-brand-500/25 text-center">Try Demo</a>
        <a href="https://github.com/HashimsGitHub/easydb" target="_blank" rel="noopener noreferrer" class="px-4 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700/60 text-center flex items-center justify-center gap-2">
          <svg class="w-4 h-4 fill-currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          <span>GitHub Repository</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative pt-12 pb-20 overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto space-y-6">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-brand-500/30 text-brand-300 text-xs font-semibold tracking-wide">
          <span class="flex h-2 w-2 rounded-full bg-brand-400 animate-pulse"></span>
          <span>Next-Generation NoSQL + SQL Speed + Media Cloud</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          The Direct Drop-in <br>
          <span class="bg-gradient-to-r from-brand-400 via-accent-400 to-blue-500 bg-clip-text text-transparent">MongoDB Alternative</span>
          <br>Without Atlas Fees.
        </h1>

        <p class="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
          <strong>EasyDB</strong> delivers the schemaless JSON flexibility of MongoDB paired with ultra-fast edge SQL indexing and native binary media storage. Zero cluster provisioning. Zero idle fees.
        </p>

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
            <div class="text-xs text-slate-400 font-medium mt-1">JSON Docs + Media CDN</div>
          </div>
          <div class="p-4 rounded-xl glass-card">
            <div class="text-2xl font-bold text-purple-400">AI & MCP Ready</div>
            <div class="text-xs text-slate-400 font-medium mt-1">Direct Agent Connectivity</div>
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
        <p class="mt-2 text-3xl sm:text-4xl font-extrabold text-white">Why EasyDB Outclasses Traditional MongoDB</p>
        <p class="mt-4 text-base text-slate-400">MongoDB revolutionized JSON documents, but Atlas clusters remain expensive, heavy to manage, and still require separate third-party S3 buckets for media files. EasyDB fixes all of it.</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse rounded-2xl overflow-hidden glass-card">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-900/80 text-slate-200">
              <th class="p-5 font-semibold">Capability</th>
              <th class="p-5 font-bold text-brand-400 text-base bg-brand-500/10 border-x border-brand-500/20">EasyDB (Next-Gen)</th>
              <th class="p-5 font-semibold text-slate-400">MongoDB Atlas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            <tr>
              <td class="p-5 font-medium">Architecture & Deployment</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">100% Serverless Edge (300+ Cities)</td>
              <td class="p-5 text-slate-400">Regional Cluster Nodes (M10, M20 VMs)</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Query & Indexing Speed</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">Lightning Fast SQLite Edge Indexing</td>
              <td class="p-5 text-slate-400">Heavy B-Tree Index on Remote Cluster</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Binary & Media Storage</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-brand-300 font-semibold">Native Built-In Media Store + CDN URLs</td>
              <td class="p-5 text-slate-400">Requires Extra AWS S3 / Separate Bucket</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Idle & Base Monthly Cost</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-emerald-400 font-bold">$0.00 / Pay only for requests</td>
              <td class="p-5 text-slate-400">$60 - $500+/mo for dedicated nodes</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Multi-Tenancy</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">Built-in Header-based Tenant Partitioning</td>
              <td class="p-5 text-slate-400">Requires Manual DB / Collection Routing</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">AI Agent & MCP Integration</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-accent-400 font-semibold">Direct Native Tool Calling & REST</td>
              <td class="p-5 text-slate-400">Requires Heavy Node/Python Drivers</td>
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
        <p class="mt-3 text-sm sm:text-base text-slate-400">Execute live CRUD queries and binary media operations against this running EasyDB instance.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Controls Column -->
        <div class="lg:col-span-5 space-y-6">
          <div class="glass-card p-6 rounded-2xl space-y-5">
            <!-- Tabs -->
            <div class="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              <button id="tab-doc" onclick="switchDemoTab('doc')" class="flex-1 py-2 rounded-lg text-sm font-semibold transition bg-brand-500 text-slate-950 shadow">
                📄 Document DB
              </button>
              <button id="tab-media" onclick="switchDemoTab('media')" class="flex-1 py-2 rounded-lg text-sm font-semibold transition text-slate-400 hover:text-white">
                🖼️ Media Store
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
              <div class="grid grid-cols-2 gap-2 pt-0.5">
                <div class="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[11px]">
                  <span class="text-slate-400 block text-[10px]">Document Quota</span>
                  <strong class="text-white">Max 100 entries</strong>
                </div>
                <div class="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[11px]">
                  <span class="text-slate-400 block text-[10px]">Media Storage</span>
                  <strong class="text-white">Max 5 files (100MB ea)</strong>
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
            <div class="p-4 flex-1 overflow-auto bg-[#0a0f1d] font-mono text-xs leading-relaxed text-slate-200">
              <pre id="response-output" class="whitespace-pre-wrap">// Click "🚀 Seed eCommerce Demo (6 Products)" or any action on the left to see live JSON responses from EasyDB...</pre>
            </div>

            <!-- Inspector Footer Action -->
            <div class="bg-slate-900/60 px-4 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span id="response-summary">Ready for execution</span>
              <button onclick="clearResponse()" class="hover:text-brand-400 transition">Clear</button>
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
          <h3 class="text-xl font-bold text-white">Edge SQL Indexing</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Every document is indexed in an edge SQLite lookup catalog. Lookups and partition filters happen in sub-milliseconds near your users worldwide.
          </p>
        </div>

        <div class="p-8 rounded-2xl glass-card space-y-4">
          <div class="h-12 w-12 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 flex items-center justify-center text-2xl font-bold">
            📦
          </div>
          <h3 class="text-xl font-bold text-white">Infinite Schemaless JSON</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Store nested objects, dynamic schema documents, and high-velocity datasets. Built-in multi-tenancy ensures zero cross-tenant data leakage.
          </p>
        </div>

        <div class="p-8 rounded-2xl glass-card space-y-4">
          <div class="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl font-bold">
            🖼️
          </div>
          <h3 class="text-xl font-bold text-white">Built-in Media Cloud</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            No need to set up S3 or configure IAM bucket policies. Upload media directly to EasyDB and get instant, CDN-accelerated asset URLs.
          </p>
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
        <p class="mt-3 text-sm text-slate-400">Complete suite of document and binary media endpoints ready to plug into your apps or AI agents.</p>
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

      <!-- Category 2: Media Storage Endpoints -->
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center gap-2 mb-4">
          <span class="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">🖼️ Binary Media Cloud APIs (Max 100MB)</span>
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

  <!-- Footer -->
  <footer class="border-t border-slate-800 py-12 glass">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
      <div class="flex items-center gap-2.5">
        <img src="${logoIconUrl}" alt="EasyDB Icon" class="h-6 w-6 rounded-md object-contain">
        <span class="text-brand-400 font-bold">EasyDB</span>
        <span>&bull; Serverless NoSQL, SQL Indexing & Media Cloud</span>
      </div>
      <div class="flex items-center gap-6">
        <a href="https://github.com/HashimsGitHub/easydb" target="_blank" class="hover:text-white transition">GitHub Repository</a>
        <a href="/health" class="hover:text-white transition">Health Status</a>
        <a href="/api/v1/hero" class="hover:text-white transition">Hero Asset</a>
      </div>
    </div>
  </footer>

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

    function toggleMobileMenu() {
      const menu = document.getElementById('mobile-menu');
      const isOpen = !menu.classList.contains('hidden');
      menu.classList.toggle('hidden', isOpen);
      document.getElementById('mobile-menu-icon-open').classList.toggle('hidden', !isOpen);
      document.getElementById('mobile-menu-icon-close').classList.toggle('hidden', isOpen);
      document.getElementById('mobile-menu-btn').setAttribute('aria-expanded', String(!isOpen));
    }

    function loadDocPreset(type) {
      document.getElementById('doc-payload').value = JSON.stringify(presets[type] || {}, null, 2);
    }

    function generateDocId() {
      document.getElementById('doc-id').value = 'prod_' + Math.random().toString(36).substring(2, 7);
    }

    function switchDemoTab(tab) {
      const isDoc = tab === 'doc';
      document.getElementById('panel-doc').classList.toggle('hidden', !isDoc);
      document.getElementById('panel-media').classList.toggle('hidden', isDoc);
      document.getElementById('tab-doc').className = isDoc
        ? 'flex-1 py-2 rounded-lg text-sm font-semibold transition bg-brand-500 text-slate-950 shadow'
        : 'flex-1 py-2 rounded-lg text-sm font-semibold transition text-slate-400 hover:text-white';
      document.getElementById('tab-media').className = !isDoc
        ? 'flex-1 py-2 rounded-lg text-sm font-semibold transition bg-brand-500 text-slate-950 shadow'
        : 'flex-1 py-2 rounded-lg text-sm font-semibold transition text-slate-400 hover:text-white';
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

    // Media file size limit check: 100MB
    document.getElementById('media-file-input').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 100 * 1024 * 1024) {
        alert('File size exceeds 100MB limit (' + (file.size / (1024 * 1024)).toFixed(2) + ' MB). Please choose a file under 100MB.');
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
        alert('Please browse and select a file first.');
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        alert('File size exceeds 100MB limit (' + (file.size / (1024 * 1024)).toFixed(2) + ' MB). Please choose a file under 100MB.');
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
      const fileName = prompt('Enter the file name to download:', defaultName);
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
<body class="bg-[#090d16] text-slate-100 antialiased min-h-screen flex items-center justify-center p-6">
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
  usage: {
    docStorageBytes: number;
    mediaStorageBytes: number;
    collections: number;
    requestsThisMonth: number;
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
  const { tenantId, email, githubLogin, currentTierId, tiers, apiKeyLast4, keyRotatedAt, createdAt, usage } = opts;
  const currentTier = tiers[currentTierId] || tiers.free;
  const maskedKey = apiKeyLast4 ? `edb_live_${"•".repeat(12)}${apiKeyLast4}` : "edb_live_••••••••••••••••";

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
            <li>${formatBytes(t.docStorageBytes)} document storage</li>
            <li>${formatBytes(t.mediaStorageBytes)} media storage</li>
            <li>${formatBytes(t.maxUploadBytes)} max file size</li>
            <li>${t.maxCollections === null ? "Unlimited" : t.maxCollections} collections</li>
          </ul>
          ${isCurrent
            ? `<div class="pt-1 text-center text-xs text-brand-400 font-semibold">You're on this plan</div>`
            : id === "free"
            ? ""
            : `<a href="/api/v1/billing/paypal/subscribe?plan=${id}" class="block w-full text-center py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold transition">Upgrade</a>`}
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
<body class="bg-[#090d16] text-slate-100 antialiased min-h-screen">
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
        <code id="masked-key" class="block bg-slate-950/80 border border-slate-700/60 rounded-lg px-4 py-3 text-brand-300 text-sm break-all">${maskedKey}</code>
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
        <h2 class="font-bold text-white">Usage this period</h2>
        ${usageBar("Document storage", usage.docStorageBytes, currentTier.docStorageBytes, formatBytes(usage.docStorageBytes), formatBytes(currentTier.docStorageBytes))}
        ${usageBar("Media storage", usage.mediaStorageBytes, currentTier.mediaStorageBytes, formatBytes(usage.mediaStorageBytes), formatBytes(currentTier.mediaStorageBytes))}
        ${usageBar("Collections", usage.collections, currentTier.maxCollections, String(usage.collections), currentTier.maxCollections === null ? "Unlimited" : String(currentTier.maxCollections))}
        ${usageBar("Requests this month", usage.requestsThisMonth, currentTier.requestsPerMonth, usage.requestsThisMonth.toLocaleString(), currentTier.requestsPerMonth.toLocaleString())}
        <p class="text-[11px] text-slate-500">Request count is tracked for visibility only — it isn't enforced yet.</p>
      </div>
    </div>

    <div class="space-y-4">
      <h2 class="font-bold text-white">Subscription Plan</h2>
      <div class="grid sm:grid-cols-3 gap-4">
        ${planCards}
      </div>
    </div>

    <div class="text-center">
      <a href="/" class="text-sm text-slate-400 hover:text-brand-400 transition">← Back to EasyDB</a>
    </div>
  </div>

  <script>
    document.getElementById('rotate-btn').addEventListener('click', async () => {
      if (!confirm('Rotate your API key? Your current key will stop working immediately.')) return;
      const errorEl = document.getElementById('rotate-error');
      const resultEl = document.getElementById('rotate-result');
      errorEl.classList.add('hidden');
      try {
        const res = await fetch('/api/v1/auth/dashboard/rotate-key', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to rotate key');
        document.getElementById('new-key').textContent = data.apiSecret;
        resultEl.classList.remove('hidden');
        document.getElementById('masked-key').textContent = 'edb_live_' + '•'.repeat(12) + data.apiSecret.slice(-4);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    });
  </script>
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
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${formatBytes(t.docStorageBytes)} document storage</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${formatBytes(t.mediaStorageBytes)} media (blob) storage</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${formatBytes(t.maxUploadBytes)} max file upload size</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${t.maxCollections === null ? "Unlimited" : "Up to " + t.maxCollections} collections</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> MCP AI Server integration</li>
            <li class="flex gap-2"><span class="text-brand-400">✓</span> ${isFree ? "Community / Discord support" : id === "developer" ? "Email support" : "Priority support"}</li>
          </ul>
          <div>${cta}</div>
        </div>`;
    })
    .join("");

  const rows: Array<[string, (t: Tier) => string]> = [
    ["Price", (t) => `$${t.priceUsd}/mo`],
    ["Requests / month", (t) => t.requestsPerMonth.toLocaleString()],
    ["Document storage", (t) => formatBytes(t.docStorageBytes)],
    ["Media (blob) storage", (t) => formatBytes(t.mediaStorageBytes)],
    ["Max file upload size", (t) => formatBytes(t.maxUploadBytes)],
    ["Collections", (t) => (t.maxCollections === null ? "Unlimited" : String(t.maxCollections))],
  ];

  const tableRows = rows
    .map(
      ([label, fn]) => `
        <tr class="border-b border-slate-800/80">
          <td class="py-3 pr-4 text-slate-400">${label}</td>
          ${tierOrder.map((id) => `<td class="py-3 px-4 text-center text-slate-200 font-medium">${fn(TIERS[id as string])}</td>`).join("")}
        </tr>`
    )
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
<body class="bg-[#090d16] text-slate-100 antialiased min-h-screen">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-14">

    <div class="text-center space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-brand-500/30 text-brand-300 text-xs font-semibold">
        <span class="flex h-2 w-2 rounded-full bg-brand-400 animate-pulse"></span>
        <span>Serverless pricing, no idle cluster tax</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold text-white">Simple, Generous Pricing</h1>
      <p class="text-slate-400 max-w-xl mx-auto">A free tier built for real projects, and paid tiers priced well below MongoDB Atlas. All tiers include full CRUD, media storage, and MCP AI agent access.</p>
    </div>

    <div class="grid sm:grid-cols-3 gap-6">
      ${planCards}
    </div>

    <div class="space-y-4">
      <h2 class="text-xl font-bold text-white text-center">Compare Plans</h2>
      <div class="overflow-x-auto rounded-xl border border-slate-700/60">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-700/60 bg-slate-800/40">
              <th class="text-left py-3 pr-4 pl-4 text-slate-400 font-semibold">Feature</th>
              ${tierOrder.map((id) => `<th class="py-3 px-4 text-center text-white font-bold">${TIERS[id as string].name}</th>`).join("")}
            </tr>
          </thead>
          <tbody class="pl-4">
            ${tableRows}
          </tbody>
        </table>
      </div>
      <p class="text-center text-xs text-slate-500">Document/media storage, max file size, and collection limits are enforced live. Monthly request counts are tracked on your <a href="/dashboard" class="text-brand-400 hover:underline">dashboard</a> for visibility, not yet hard-enforced.</p>
    </div>

    <div class="text-center">
      <a href="/" class="text-sm text-slate-400 hover:text-brand-400 transition">← Back to EasyDB</a>
    </div>
  </div>
</body>
</html>`;
}
