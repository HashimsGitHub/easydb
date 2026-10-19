export function renderLandingPage(heroImageUrl: string, logoIconUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EasyDB — The Edge-Native NoSQL &amp; Media Database</title>
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
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
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
            <div class="text-2xl font-bold text-purple-400">AI &amp; MCP Ready</div>
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
              <td class="p-5 font-medium">Architecture &amp; Deployment</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">100% Serverless Edge (300+ Cities)</td>
              <td class="p-5 text-slate-400">Regional Cluster Nodes (M10, M20 VMs)</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Query &amp; Indexing Speed</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">Lightning Fast SQLite Edge Indexing</td>
              <td class="p-5 text-slate-400">Heavy B-Tree Index on Remote Cluster</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Binary &amp; Media Storage</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-brand-300 font-semibold">Native Built-In Media Store + CDN URLs</td>
              <td class="p-5 text-slate-400">Requires Extra AWS S3 / Separate Bucket</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Idle &amp; Base Monthly Cost</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-emerald-400 font-bold">$0.00 / Pay only for requests</td>
              <td class="p-5 text-slate-400">$60 - $500+/mo for dedicated nodes</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">Multi-Tenancy</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-white font-medium">Built-in Header-based Tenant Partitioning</td>
              <td class="p-5 text-slate-400">Requires Manual DB / Collection Routing</td>
            </tr>
            <tr>
              <td class="p-5 font-medium">AI Agent &amp; MCP Integration</td>
              <td class="p-5 bg-brand-500/5 border-x border-brand-500/20 text-accent-400 font-semibold">Direct Native Tool Calling &amp; REST</td>
              <td class="p-5 text-slate-400">Requires Heavy Node/Python Drivers</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════════════════
       INTERACTIVE LIVE DEMO SECTION — eCommerce Playground
  ═══════════════════════════════════════════════════════════════ -->
  <section id="demo" class="py-20 relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto mb-12">
        <h2 class="text-xs font-bold uppercase tracking-wider text-brand-400">Interactive Playground</h2>
        <p class="mt-2 text-3xl sm:text-4xl font-extrabold text-white">Test EasyDB In Real-Time</p>
        <p class="mt-3 text-sm sm:text-base text-slate-400">
          Seed a live <strong class="text-white">eCommerce product catalog</strong> and run CRUD operations against this running EasyDB instance — no sign-up required.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <!-- ── Controls Column ── -->
        <div class="lg:col-span-5 space-y-4">
          <div class="glass-card p-6 rounded-2xl space-y-5">

            <!-- Tabs -->
            <div class="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              <button id="tab-doc" onclick="switchDemoTab('doc')"
                class="flex-1 py-2 rounded-lg text-sm font-semibold transition bg-brand-500 text-slate-950 shadow">
                📄 Document DB
              </button>
              <button id="tab-media" onclick="switchDemoTab('media')"
                class="flex-1 py-2 rounded-lg text-sm font-semibold transition text-slate-400 hover:text-white">
                🖼️ Media Store
              </button>
            </div>

            <!-- Tenant & Collection -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block font-medium text-slate-400 mb-1">x-tenant-id</label>
                <input id="demo-tenant" type="text" value="demo_store"
                  class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-brand-500">
              </div>
              <div>
                <label class="block font-medium text-slate-400 mb-1">Collection</label>
                <input id="demo-collection" type="text" value="products"
                  class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-brand-500">
              </div>
            </div>

            <!-- ── Document Panel ── -->
            <div id="panel-doc" class="space-y-4">

              <!-- Seed Banner -->
              <div class="rounded-xl bg-gradient-to-br from-brand-500/10 via-accent-500/5 to-purple-500/10 border border-brand-500/25 p-4 space-y-3">
                <div class="flex items-start gap-3">
                  <span class="text-2xl mt-0.5">🛒</span>
                  <div>
                    <p class="text-sm font-bold text-white">eCommerce Demo Dataset</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">
                      Inserts <strong class="text-brand-300">6 realistic products</strong> with ID, name, category, price, quantity &amp; description into your <code class="bg-slate-800 px-1 rounded text-brand-300">products</code> collection.
                    </p>
                  </div>
                </div>
                <button onclick="seedEcommerceData()" id="seed-btn"
                  class="w-full py-2.5 rounded-lg bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-400 hover:to-accent-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                  <span id="seed-btn-text">🚀 Seed eCommerce Demo Data</span>
                </button>
                <div class="flex gap-2">
                  <button onclick="browseProducts()"
                    class="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700">
                    📊 Browse Table View
                  </button>
                  <button onclick="executeAction('find')"
                    class="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700">
                    {} Raw JSON
                  </button>
                </div>
              </div>

              <!-- Doc ID -->
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-xs font-medium text-slate-400">Document ID (_id)</label>
                  <button onclick="generateDocId()" class="text-[11px] text-brand-400 hover:underline">Generate UUID</button>
                </div>
                <input id="doc-id" type="text" value="prod_001"
                  class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500">
              </div>

              <!-- Payload -->
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-xs font-medium text-slate-400">JSON Payload (Schemaless)</label>
                  <div class="flex gap-2 text-[11px]">
                    <button onclick="loadDocPreset('product')" class="text-brand-400 hover:underline">Product</button>
                    <button onclick="loadDocPreset('user')"    class="text-brand-400 hover:underline">User</button>
                    <button onclick="loadDocPreset('sensor')"  class="text-brand-400 hover:underline">IoT</button>
                  </div>
                </div>
                <textarea id="doc-payload" rows="6"
                  class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500 leading-relaxed"></textarea>
              </div>

              <!-- CRUD Buttons -->
              <div class="grid grid-cols-2 gap-2">
                <button onclick="executeAction('insert')"
                  class="px-3 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5">
                  ➕ Insert
                </button>
                <button onclick="executeAction('find')"
                  class="px-3 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5">
                  🔍 Find All
                </button>
                <button onclick="executeAction('update')"
                  class="px-3 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5">
                  ✏️ Update
                </button>
                <button onclick="executeAction('delete')"
                  class="px-3 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition flex items-center justify-center gap-1.5">
                  🗑️ Delete
                </button>
              </div>
            </div>

            <!-- ── Media Panel ── -->
            <div id="panel-media" class="space-y-4 hidden">
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Upload File (Image, PDF, Document)</label>
                <input id="media-file-input" type="file"
                  class="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-slate-950 hover:file:bg-brand-400 cursor-pointer">
              </div>
              <button onclick="executeAction('list-media')"
                class="w-full py-2.5 rounded-lg bg-accent-500 hover:bg-accent-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5">
                📂 List Tenant Media
              </button>
            </div>

          </div>
        </div>

        <!-- ── Response / Table Column ── -->
        <div class="lg:col-span-7 space-y-4">

          <!-- Product Table Panel (shown when browseProducts() is called) -->
          <div id="product-table-panel" class="hidden glass-card rounded-2xl overflow-hidden border border-brand-500/20">
            <div class="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono text-brand-400 font-bold">🛒 products</span>
                <span id="product-count-badge"
                  class="px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 text-[10px] font-bold border border-brand-500/20">
                  0 docs
                </span>
              </div>
              <button onclick="hideProductTable()" class="text-xs text-slate-500 hover:text-slate-300 transition">✕ Hide Table</button>
            </div>
            <div class="overflow-x-auto max-h-64">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-900/80 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th class="px-3 py-2.5 font-semibold">ID</th>
                    <th class="px-3 py-2.5 font-semibold">Name</th>
                    <th class="px-3 py-2.5 font-semibold">Category</th>
                    <th class="px-3 py-2.5 font-semibold text-right">Price</th>
                    <th class="px-3 py-2.5 font-semibold text-right">Qty</th>
                    <th class="px-3 py-2.5 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody id="product-table-body" class="divide-y divide-slate-800/50 text-slate-300"></tbody>
              </table>
            </div>
          </div>

          <!-- JSON Inspector -->
          <div class="glass-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col" style="height:460px">
            <div class="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-2">
                <div class="flex gap-1.5">
                  <div class="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <span class="text-xs font-mono text-slate-400 ml-2">Response Inspector</span>
              </div>
              <div class="flex items-center gap-3 text-xs font-mono">
                <span id="response-status"
                  class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  200 OK
                </span>
                <span id="response-time" class="text-slate-400">⚡ 0ms</span>
              </div>
            </div>

            <div class="p-4 flex-1 overflow-auto bg-[#0a0f1d] font-mono text-xs leading-relaxed text-slate-200">
              <pre id="response-output" class="whitespace-pre-wrap">// 👋 Welcome to the EasyDB Interactive Playground!
//
// 🛒 eCommerce Demo — try it in 3 steps:
//   1. Click  "🚀 Seed eCommerce Demo Data"  (inserts 6 products)
//   2. Click  "📊 Browse Table View"         (visual product grid)
//   3. Edit the payload &amp; click "✏️ Update"  (modify any product live)
//
// The "products" collection is pre-selected.
// Switch the collection name to store any other JSON data!</pre>
            </div>

            <div class="bg-slate-900/60 px-4 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
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
          <div class="h-12 w-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center text-2xl font-bold">⚡</div>
          <h3 class="text-xl font-bold text-white">Edge SQL Indexing</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Every document is indexed in an edge SQLite lookup catalog. Lookups and partition filters happen in sub-milliseconds near your users worldwide.
          </p>
        </div>

        <div class="p-8 rounded-2xl glass-card space-y-4">
          <div class="h-12 w-12 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 flex items-center justify-center text-2xl font-bold">📦</div>
          <h3 class="text-xl font-bold text-white">Infinite Schemaless JSON</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Store nested objects, dynamic schema documents, and high-velocity datasets. Built-in multi-tenancy ensures zero cross-tenant data leakage.
          </p>
        </div>

        <div class="p-8 rounded-2xl glass-card space-y-4">
          <div class="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl font-bold">🖼️</div>
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
        <p class="mt-2 text-3xl sm:text-4xl font-extrabold text-white">Dead Simple REST &amp; SDK Interface</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
          <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span class="text-emerald-400 font-bold">POST /api/v1/insert</span>
            <span>JSON Insert</span>
          </div>
          <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easydb.hashim-hilal-0eb.workers.dev/api/v1/insert \\
  -H "x-tenant-id: my_store" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collection": "products",
    "id": "prod_001",
    "data": {
      "name": "Wireless Headphones",
      "price": 79.99,
      "quantity": 150
    }
  }'</pre>
        </div>

        <div class="glass-card rounded-2xl p-6 space-y-3 font-mono text-xs">
          <div class="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span class="text-accent-400 font-bold">POST /api/v1/find</span>
            <span>Fast Edge Query</span>
          </div>
          <pre class="text-slate-300 overflow-x-auto whitespace-pre">curl -X POST https://easydb.hashim-hilal-0eb.workers.dev/api/v1/find \\
  -H "x-tenant-id: my_store" \\
  -H "Content-Type: application/json" \\
  -d '{ "collection": "products" }'</pre>
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
        <span>&bull; Serverless NoSQL, SQL Indexing &amp; Media Cloud</span>
      </div>
      <div class="flex items-center gap-6">
        <a href="https://github.com/HashimsGitHub/easydb" target="_blank" class="hover:text-white transition">GitHub Repository</a>
        <a href="/health" class="hover:text-white transition">Health Status</a>
        <a href="/api/v1/hero" class="hover:text-white transition">Hero Asset</a>
      </div>
    </div>
  </footer>

  <!-- ═══════════════════════════════════════════════════════════════
       JAVASCRIPT — eCommerce Seed + Interactive Playground Logic
  ═══════════════════════════════════════════════════════════════ -->
  <script>

    // ─── eCommerce Seed Dataset ─────────────────────────────────────
    const ECOMMERCE_PRODUCTS = [
      {
        id: 'prod_001',
        data: {
          productId: 'PROD-001',
          name: 'Wireless Noise-Cancelling Headphones',
          category: 'Electronics',
          price: 149.99,
          quantity: 85,
          description: 'Over-ear headphones with 30hr battery, ANC, and premium audio drivers. Perfect for remote work and travel.',
          brand: 'SoundWave',
          sku: 'SW-ANC-X1',
          inStock: true,
          tags: ['audio', 'wireless', 'ANC', 'electronics']
        }
      },
      {
        id: 'prod_002',
        data: {
          productId: 'PROD-002',
          name: 'Ergonomic Mechanical Keyboard',
          category: 'Peripherals',
          price: 129.00,
          quantity: 42,
          description: 'Tenkeyless mechanical keyboard with Cherry MX Red switches, RGB backlighting, and aluminium top plate.',
          brand: 'KeyForge',
          sku: 'KF-TKL-RGB',
          inStock: true,
          tags: ['keyboard', 'mechanical', 'RGB', 'gaming']
        }
      },
      {
        id: 'prod_003',
        data: {
          productId: 'PROD-003',
          name: '4K Ultra-Wide Curved Monitor',
          category: 'Displays',
          price: 599.95,
          quantity: 18,
          description: '34" QHD curved VA panel, 144Hz, 1ms MPRT, HDR400. Ideal for developers, designers, and gamers alike.',
          brand: 'VisionEdge',
          sku: 'VE-34C-QHD',
          inStock: true,
          tags: ['monitor', '4K', 'ultrawide', 'HDR']
        }
      },
      {
        id: 'prod_004',
        data: {
          productId: 'PROD-004',
          name: 'USB-C 12-in-1 Docking Station',
          category: 'Accessories',
          price: 89.99,
          quantity: 200,
          description: 'Single cable solution: 3x USB-A, 2x USB-C, HDMI, DisplayPort, SD card, 100W PD charging, Gigabit Ethernet.',
          brand: 'HubMax',
          sku: 'HM-DOCK-12',
          inStock: true,
          tags: ['dock', 'USB-C', 'hub', 'accessories']
        }
      },
      {
        id: 'prod_005',
        data: {
          productId: 'PROD-005',
          name: 'Smart Fitness Tracker Band',
          category: 'Wearables',
          price: 49.99,
          quantity: 320,
          description: 'Track heart rate, SpO2, sleep, steps, and 20+ workout modes. 7-day battery, waterproof IP68, AMOLED display.',
          brand: 'FitPulse',
          sku: 'FP-BAND-S3',
          inStock: true,
          tags: ['fitness', 'wearable', 'health', 'smartband']
        }
      },
      {
        id: 'prod_006',
        data: {
          productId: 'PROD-006',
          name: 'Portable SSD 1TB NVMe',
          category: 'Storage',
          price: 119.00,
          quantity: 0,
          description: 'Pocket-sized NVMe SSD with 2000 MB/s read speed over USB 3.2 Gen 2. Aluminium body, shock-resistant.',
          brand: 'SwiftDrive',
          sku: 'SD-SSD-1TB',
          inStock: false,
          tags: ['SSD', 'storage', 'NVMe', 'portable']
        }
      }
    ];

    // ─── JSON Presets ────────────────────────────────────────────────
    const presets = {
      product: {
        productId: 'PROD-NEW',
        name: 'Custom Product Name',
        category: 'Electronics',
        price: 99.99,
        quantity: 50,
        description: 'Add your product description here.',
        brand: 'YourBrand',
        sku: 'SKU-001',
        inStock: true,
        tags: ['example', 'custom']
      },
      user: {
        name: 'Hashim Hilal',
        email: 'hashim@example.com',
        role: 'Lead Architect',
        tags: ['nosql', 'edge', 'cloudflare'],
        active: true
      },
      sensor: {
        deviceId: 'iot-sensor-88',
        temperature: 24.8,
        humidity: 58.2,
        battery: 98,
        timestamp: new Date().toISOString()
      }
    };

    // ─── Seed Function ───────────────────────────────────────────────
    async function seedEcommerceData() {
      const btn = document.getElementById('seed-btn');
      const btnText = document.getElementById('seed-btn-text');
      const tenant = document.getElementById('demo-tenant').value || 'demo_store';
      const output = document.getElementById('response-output');
      const summary = document.getElementById('response-summary');

      btn.disabled = true;
      btnText.textContent = '⏳ Seeding 6 products...';
      output.textContent = '// Seeding eCommerce demo dataset...\\n// Inserting 6 products into the "products" collection...\\n';

      let inserted = 0;
      const startTime = performance.now();

      for (const product of ECOMMERCE_PRODUCTS) {
        try {
          const res = await fetch('/api/v1/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
            body: JSON.stringify({ collection: 'products', id: product.id, data: product.data })
          });
          const data = await res.json();
          inserted++;
          output.textContent += '// ✅ Inserted: ' + product.data.name + ' (' + product.id + ')\\n';
        } catch (err) {
          output.textContent += '// ❌ Failed: ' + product.id + ' — ' + err.message + '\\n';
        }
      }

      const elapsed = Math.round(performance.now() - startTime);
      document.getElementById('response-time').textContent = '⚡ ' + elapsed + 'ms';
      document.getElementById('response-status').textContent = '200 OK';
      document.getElementById('response-status').className = 'px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

      output.textContent += '\\n// ─────────────────────────────────────────\\n';
      output.textContent += '// ✅ Seeded ' + inserted + '/6 products in ' + elapsed + 'ms\\n';
      output.textContent += '// Click "📊 Browse Table View" to see them!';

      summary.textContent = 'Seeded ' + inserted + ' products in ' + elapsed + 'ms — click Browse Table View!';
      btnText.textContent = '✅ Re-Seed Dataset';
      btn.disabled = false;

      // Auto-open table after seed
      setTimeout(() => browseProducts(), 300);
    }

    // ─── Browse Products Table ───────────────────────────────────────
    async function browseProducts() {
      const tenant = document.getElementById('demo-tenant').value || 'demo_store';
      const output = document.getElementById('response-output');
      const startTime = performance.now();

      output.textContent = '// Fetching products collection...';

      try {
        const res = await fetch('/api/v1/find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant },
          body: JSON.stringify({ collection: 'products' })
        });
        const data = await res.json();
        const elapsed = Math.round(performance.now() - startTime);

        document.getElementById('response-time').textContent = '⚡ ' + elapsed + 'ms';
        document.getElementById('response-status').textContent = res.status + ' ' + res.statusText;
        document.getElementById('response-status').className = res.ok
          ? 'px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20';

        output.textContent = JSON.stringify(data, null, 2);
        document.getElementById('response-summary').textContent = 'Found ' + (data.documents?.length || 0) + ' products in ' + elapsed + 'ms';

        // Render table
        renderProductTable(data.documents || []);
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
      }
    }

    function renderProductTable(docs) {
      const panel = document.getElementById('product-table-panel');
      const tbody = document.getElementById('product-table-body');
      const badge = document.getElementById('product-count-badge');

      badge.textContent = docs.length + ' doc' + (docs.length !== 1 ? 's' : '');

      if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-slate-500 italic">No products found — seed the dataset first!</td></tr>';
        panel.classList.remove('hidden');
        return;
      }

      tbody.innerHTML = docs.map(doc => {
        const inStock = doc.inStock !== false && doc.quantity > 0;
        const statusBadge = inStock
          ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">In Stock</span>'
          : '<span class="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 text-[10px] font-bold">Out of Stock</span>';

        return \`<tr class="hover:bg-slate-800/30 transition cursor-pointer" onclick="loadProductInEditor('\${doc._id}', \${JSON.stringify(JSON.stringify(doc)).replace(/\\\\/g,'\\\\\\\\').replace(/'/g, "\\\\'")})">\`
          + '<td class="px-3 py-2.5 font-mono text-brand-400 font-semibold">' + (doc._id || '—') + '</td>'
          + '<td class="px-3 py-2.5 text-white font-medium">' + (doc.name || '—') + '</td>'
          + '<td class="px-3 py-2.5 text-slate-400">' + (doc.category || '—') + '</td>'
          + '<td class="px-3 py-2.5 text-right text-emerald-400 font-semibold">$' + (doc.price != null ? Number(doc.price).toFixed(2) : '—') + '</td>'
          + '<td class="px-3 py-2.5 text-right text-slate-300">' + (doc.quantity != null ? doc.quantity : '—') + '</td>'
          + '<td class="px-3 py-2.5 text-center">' + statusBadge + '</td>'
          + '</tr>';
      }).join('');

      panel.classList.remove('hidden');
    }

    function loadProductInEditor(id, rawJson) {
      try {
        const doc = JSON.parse(rawJson);
        const { _id, ...data } = doc;
        document.getElementById('doc-id').value = id;
        document.getElementById('doc-payload').value = JSON.stringify(data, null, 2);
        document.getElementById('demo-collection').value = 'products';
        document.getElementById('response-summary').textContent = 'Loaded "' + id + '" into editor — edit and click Update!';
      } catch(e) {}
    }

    function hideProductTable() {
      document.getElementById('product-table-panel').classList.add('hidden');
    }

    // ─── Generic CRUD Action ─────────────────────────────────────────
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
        let res;
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

        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
        summary.textContent = action.toUpperCase() + ' finished in ' + elapsed + 'ms';

        // Auto-refresh table if find on products collection
        if (action === 'find' && collection === 'products' && data.documents) {
          renderProductTable(data.documents);
        }
      } catch (err) {
        output.textContent = '// Error: ' + err.message;
        statusBadge.textContent = 'Client Error';
        statusBadge.className = 'px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20';
      }
    }

    // ─── Media Upload ────────────────────────────────────────────────
    document.getElementById('media-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const tenant = document.getElementById('demo-tenant').value || 'demo_store';
      const output = document.getElementById('response-output');
      output.textContent = '// Uploading ' + file.name + ' (' + file.size + ' bytes)...';
      const startTime = performance.now();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/v1/media/upload', {
        method: 'POST',
        headers: { 'x-tenant-id': tenant },
        body: formData
      });
      const elapsed = Math.round(performance.now() - startTime);
      document.getElementById('response-time').textContent = '⚡ ' + elapsed + 'ms';
      document.getElementById('response-status').textContent = res.status + ' ' + res.statusText;
      const data = await res.json();
      output.textContent = JSON.stringify(data, null, 2);
    });

    // ─── Utility ─────────────────────────────────────────────────────
    function loadDocPreset(type) {
      const preset = presets[type] || {};
      document.getElementById('doc-payload').value = JSON.stringify(preset, null, 2);
      if (type === 'product') {
        document.getElementById('doc-id').value = 'prod_new_' + Math.random().toString(36).substring(2, 6);
        document.getElementById('demo-collection').value = 'products';
      }
    }

    function generateDocId() {
      document.getElementById('doc-id').value = 'doc_' + Math.random().toString(36).substring(2, 9);
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

    // Initialize with product preset
    loadDocPreset('product');
  </script>
</body>
</html>`;
}
