import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, BookOpen, Sparkles, ChevronRight, CheckCircle2, 
  HelpCircle, ExternalLink, ArrowRight, Compass, ShieldCheck, 
  Terminal, Lightbulb, PlayCircle, Layers, ShoppingCart, 
  ShoppingBag, Package, BookOpen as BookIcon, Users, Globe, 
  Factory, Settings, Tag, Sliders, ChevronDown, Check, X, Download
} from 'lucide-react';
import { HELP_MODULES } from '../../data/helpCenterData';
import HelpDownloadModal from './HelpDownloadModal';

// Dynamic icon mapper
const ICON_MAP = {
  ShoppingCart,
  ShoppingBag,
  Package,
  BookOpen: BookIcon,
  Users,
  Globe,
  Layers,
  Factory,
  Settings
};

export const HelpCenter = () => {
  const navigate = useNavigate();
  const [selectedModuleId, setSelectedModuleId] = useState(HELP_MODULES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('submodules'); // 'submodules' | 'workflows' | 'faqs' | 'tips'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Find currently active module
  const currentModule = useMemo(() => {
    return HELP_MODULES.find(m => m.id === selectedModuleId) || HELP_MODULES[0];
  }, [selectedModuleId]);

  // Search filter across all modules, submodules, workflows, and FAQs
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const results = [];
    HELP_MODULES.forEach(mod => {
      // Check module level
      if (mod.title.toLowerCase().includes(q) || mod.summary.toLowerCase().includes(q)) {
        results.push({ type: 'module', module: mod, title: mod.title, snippet: mod.summary });
      }

      // Check submodules
      (mod.submodules || []).forEach(sub => {
        if (
          sub.name.toLowerCase().includes(q) || 
          sub.purpose.toLowerCase().includes(q) ||
          (sub.keyFeatures || []).some(f => f.toLowerCase().includes(q))
        ) {
          results.push({ 
            type: 'submodule', 
            module: mod, 
            submodule: sub, 
            title: `${mod.title} ➔ ${sub.name}`, 
            snippet: sub.purpose 
          });
        }
      });

      // Check workflows
      (mod.workflows || []).forEach(wf => {
        if (
          wf.title.toLowerCase().includes(q) ||
          (wf.steps || []).some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
        ) {
          results.push({
            type: 'workflow',
            module: mod,
            workflow: wf,
            title: `SOP: ${wf.title} (${mod.title})`,
            snippet: wf.steps?.[0]?.description || 'Step-by-step operating procedure'
          });
        }
      });

      // Check FAQs
      (mod.faqs || []).forEach(faq => {
        if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
          results.push({
            type: 'faq',
            module: mod,
            faq,
            title: `FAQ: ${faq.q}`,
            snippet: faq.a
          });
        }
      });
    });

    return results;
  }, [searchQuery]);

  const handleStartTour = () => {
    window.dispatchEvent(new CustomEvent('start-jts-tour'));
  };

  const handleSelectSearchResult = (result) => {
    setSelectedModuleId(result.module.id);
    if (result.type === 'submodule') setActiveTab('submodules');
    else if (result.type === 'workflow') setActiveTab('workflows');
    else if (result.type === 'faq') setActiveTab('faqs');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4 pb-8 max-w-[1440px] mx-auto">
      {/* 1. SLIM & COMPACT HERO HEADER WITH SEARCH & ACTIONS */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Left: Title & Subtitle */}
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} className="text-blue-400" />
              JTS ERP Knowledge & SOP Hub
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              ERP Operations & SOP Manual
            </h1>
            <p className="text-xs text-blue-100/75 max-w-lg leading-snug">
              In-depth documentation, sub-feature breakdowns, and step-by-step operating procedures for all modules.
            </p>
          </div>

          {/* Right: Compact Search Bar & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-60 md:w-68">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search modules, features, SOPs..."
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStartTour}
                className="flex-1 sm:flex-initial px-3 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              >
                <Compass size={14} />
                System Tour
              </button>

              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="Download or Print full ERP manual"
              >
                <Download size={14} />
                Download Manual
              </button>
            </div>
          </div>
        </div>

        {/* Ambient subtle light */}
        <div className="absolute right-0 top-0 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. LIVE SEARCH RESULTS OVERLAY (IF TYPING) */}
      {searchResults && (
        <div className="bg-card border-2 border-blue-500/30 rounded-2xl p-4 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-1.5 border-b border-border">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Search Results ({searchResults.length}) for "{searchQuery}"
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              Clear search
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-xs space-y-1">
              <p className="font-bold">No results found matching your search.</p>
              <p className="text-[11px]">Try searching for terms like "POS", "Return", "Invoice", "GRN", or "Stock".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto custom-scrollbar p-0.5">
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectSearchResult(res)}
                  className="p-2.5 rounded-xl bg-muted/40 hover:bg-blue-500/10 border border-border hover:border-blue-500/40 cursor-pointer transition-all space-y-0.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-foreground group-hover:text-blue-600 transition-colors">
                      {res.title}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase">
                      {res.type}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground line-clamp-1">
                    {res.snippet}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. MAIN WORKSPACE: COMPACT SIDEBAR + CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT: COMPACT MODULE LIST NAVIGATION */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-1.5">
          <div className="px-2 py-0.5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Modules ({HELP_MODULES.length})
            </span>
            <span className="text-[9px] bg-muted px-1.5 py-0.2 rounded font-bold text-muted-foreground">
              Select module
            </span>
          </div>

          <div className="space-y-1">
            {HELP_MODULES.map((mod) => {
              const isSelected = mod.id === selectedModuleId;
              const IconComp = ICON_MAP[mod.icon] || BookIcon;

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setSelectedModuleId(mod.id);
                    setOpenFaqIndex(null);
                  }}
                  className={`w-full text-left p-2 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between border ${
                    isSelected
                      ? `bg-card border-blue-500/60 shadow-xs ring-1 ring-blue-500/30`
                      : `bg-card/50 hover:bg-card border-border/70 hover:border-border`
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white shadow-2xs' : 'bg-muted text-muted-foreground'
                    }`}>
                      <IconComp size={15} />
                    </div>
                    <div className="truncate">
                      <div className={`text-xs font-bold truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                        {mod.title}
                      </div>
                      <div className="text-[9.5px] text-muted-foreground truncate">
                        {mod.category} · {mod.submodules?.length || 0} features
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={13} className={`shrink-0 transition-transform ${isSelected ? 'text-blue-600 translate-x-0.5' : 'text-muted-foreground/30'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: SELECTED MODULE DETAILED HELP VIEW */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-3.5">
          
          {/* Compact Module Banner */}
          <div className={`p-4 sm:p-4.5 rounded-xl bg-gradient-to-r ${currentModule.color} text-white shadow-xs space-y-1.5`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[9.5px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md text-white">
                {currentModule.category} · {currentModule.badge}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 active:scale-95 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer text-white shadow-2xs"
                  title="Download or Print this module guide"
                >
                  <Download size={12} /> Download Guide
                </button>

                {currentModule.liveRoute && (
                  <button
                    type="button"
                    onClick={() => navigate(currentModule.liveRoute)}
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer text-white shadow-2xs"
                  >
                    Open Live Module <ExternalLink size={12} />
                  </button>
                )}
              </div>
            </div>

            <h2 className="text-base sm:text-lg font-black text-white">
              {currentModule.title}
            </h2>

            <p className="text-xs text-white/90 leading-relaxed max-w-3xl">
              {currentModule.summary}
            </p>
          </div>

          {/* Sub-Section Navigation Tabs (Sleek Segmented Bar) */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('submodules')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'submodules'
                  ? 'bg-card text-foreground shadow-xs font-black border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              }`}
            >
              <Layers size={13} /> Features & Screens
              <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-bold">
                {currentModule.submodules?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workflows')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'workflows'
                  ? 'bg-card text-foreground shadow-xs font-black border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              }`}
            >
              <PlayCircle size={13} /> Step-by-Step SOPs
              <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-bold">
                {currentModule.workflows?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('faqs')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'faqs'
                  ? 'bg-card text-foreground shadow-xs font-black border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              }`}
            >
              <HelpCircle size={13} /> FAQs & Troubleshooting
              <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-bold">
                {currentModule.faqs?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tips')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tips'
                  ? 'bg-card text-foreground shadow-xs font-black border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              }`}
            >
              <Lightbulb size={13} /> Pro Tips & Shortcuts
            </button>
          </div>

          {/* TAB 1: SUBMODULES & SCREEN BREAKDOWN */}
          {activeTab === 'submodules' && (
            <div className="space-y-3">
              <div className="space-y-2.5">
                {(currentModule.submodules || []).map((sub, idx) => (
                  <div
                    key={sub.id || idx}
                    className="p-3.5 sm:p-4 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">
                          {sub.name}
                        </h4>
                      </div>

                      {sub.path && (
                        <button
                          type="button"
                          onClick={() => navigate(sub.path)}
                          className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Go to Screen <ArrowRight size={11} />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {sub.purpose}
                    </p>

                    {/* Key Features Bullet List */}
                    {sub.keyFeatures && sub.keyFeatures.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-foreground">
                          Key Capabilities:
                        </span>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
                          {sub.keyFeatures.map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-1.5 text-muted-foreground text-[11px]">
                              <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions Explained */}
                    {sub.actionsExplained && sub.actionsExplained.length > 0 && (
                      <div className="space-y-1 pt-1.5 border-t border-border/50">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-foreground">
                          Button & Action Definitions:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {sub.actionsExplained.map((act, aIdx) => (
                            <div key={aIdx} className="p-2 rounded-lg bg-muted/30 border border-border/60 space-y-0.5">
                              <div className="font-bold text-foreground text-[10.5px]">
                                {act.action}
                              </div>
                              <div className="text-[10px] text-muted-foreground leading-snug">
                                {act.desc}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP SOP WORKFLOWS */}
          {activeTab === 'workflows' && (
            <div className="space-y-3">
              {(currentModule.workflows || []).map((wf, wIdx) => (
                <div
                  key={wIdx}
                  className="rounded-xl bg-card border border-border/80 shadow-2xs overflow-hidden"
                >
                  <div className="px-3.5 py-2.5 bg-muted/35 border-b border-border/70 flex items-center justify-between flex-wrap gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[9.5px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        SOP #{wIdx + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">
                        {wf.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 text-[9.5px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">
                        ⏱️ Est. {wf.time}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {wf.difficulty}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 space-y-3">
                    <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200 dark:before:bg-blue-900">
                      {(wf.steps || []).map((st, sIdx) => (
                        <div key={sIdx} className="relative space-y-0.5">
                          <span className="absolute -left-5 top-0 w-4 h-4 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center ring-2 ring-card">
                            {st.stepNumber || sIdx + 1}
                          </span>
                          <div className="font-bold text-xs text-foreground">
                            {st.title}
                          </div>
                          <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                            {st.description}
                          </p>
                          {st.tip && (
                            <div className="inline-flex items-center gap-1 text-[10.5px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/60 font-medium mt-0.5">
                              💡 <strong>Tip:</strong> {st.tip}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: FAQS & TROUBLESHOOTING */}
          {activeTab === 'faqs' && (
            <div className="space-y-2">
              {(currentModule.faqs || []).map((faq, fIdx) => {
                const isOpen = openFaqIndex === fIdx;
                return (
                  <div
                    key={fIdx}
                    className="rounded-xl bg-card border border-border/80 overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : fIdx)}
                      className="w-full text-left p-3 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <HelpCircle size={14} className="text-blue-500 shrink-0" />
                        {faq.q}
                      </span>
                      <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 pt-0.5 text-xs text-muted-foreground leading-relaxed border-t border-border/50 bg-muted/10">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: PRO TIPS & SHORTCUTS */}
          {activeTab === 'tips' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(currentModule.tips || []).map((tip, tIdx) => (
                  <div
                    key={tIdx}
                    className="p-3 rounded-xl bg-card border border-border/80 flex items-start gap-2.5 shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <Lightbulb size={14} />
                    </div>
                    <div className="text-xs text-foreground font-medium leading-relaxed">
                      {tip}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 4. DOWNLOAD / EXPORT MODAL */}
      <HelpDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        currentModule={currentModule}
        allModules={HELP_MODULES}
      />
    </div>
  );
};

export default HelpCenter;
