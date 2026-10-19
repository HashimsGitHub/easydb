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
      </nav>

      <div class="flex items-center gap-3">
        <a href="#demo" class="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-brand-500/25 flex items-center gap-2">
          <span>Try Demo</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
        <a href="https://github.com/HashimsGitHub/easydb" target="_blank" rel="noopener noreferrer" class="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700/60" title="GitHub Repository">
          <svg class="w-5 h-5 fill-currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
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
                <div class="text-xs uppercase tracking-widest text-brand-400 font-bold">Unified Data Engine</div>
                <div class="text-lg font-semibold">Fast SQL Indexing &bull; Infinite Document Scale &bull; Media Cloud</div>
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

            <!-- Global Tenant & Collection Input -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block font-medium text-slate-400 mb-1">x-tenant-id</label>
                <input id="demo-tenant" type="text" value="demo_store" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-brand-500">
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
                <label class="block text-xs font-medium text-slate-400 mb-1">Browse to select file (Max 100MB)</label>
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
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easydb.hashim-hilal-0eb.workers.dev/api/v1/insert \\
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
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easydb.hashim-hilal-0eb.workers.dev/api/v1/find \\
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
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X PUT https://easydb.hashim-hilal-0eb.workers.dev/api/v1/update \\
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
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X DELETE https://easydb.hashim-hilal-0eb.workers.dev/api/v1/delete \\
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
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easydb.hashim-hilal-0eb.workers.dev/api/v1/media/upload \\
  -H "x-tenant-id: demo_store" \\
  -F "file=@photo.jpg"</pre>
          </div>

          <!-- 6. Media Download -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-brand-400 font-bold">GET /api/v1/media/download</span>
              <span>Download File by Name</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -OJ "https://easydb.hashim-hilal-0eb.workers.dev/api/v1/media/download?filename=photo.jpg" \\
  -H "x-tenant-id: demo_store"</pre>
          </div>

          <!-- 7. Media List -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-sky-400 font-bold">GET /api/v1/media/list</span>
              <span>List Tenant Media</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X GET "https://easydb.hashim-hilal-0eb.workers.dev/api/v1/media/list" \\
  -H "x-tenant-id: demo_store"</pre>
          </div>

          <!-- 8. Media Delete -->
          <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span class="text-rose-400 font-bold">DELETE /api/v1/media/delete</span>
              <span>Delete Media</span>
            </div>
            <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X DELETE "https://easydb.hashim-hilal-0eb.workers.dev/api/v1/media/delete?filename=photo.jpg" \\
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
