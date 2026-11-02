import React, { useState } from 'react';
import { 
  X, Download, Printer, FileText, Globe, Code, CheckCircle2, 
  Layers, BookOpen, Sparkles, ArrowRight, ShieldCheck, FileCheck
} from 'lucide-react';
import { 
  downloadMarkdown, 
  downloadHtml, 
  downloadJson, 
  printOrSavePdf 
} from './helpExportUtils';

export const HelpDownloadModal = ({ 
  isOpen, 
  onClose, 
  currentModule, 
  allModules 
}) => {
  const [exportScope, setExportScope] = useState('all'); // 'all' | 'single'
  const [downloadSuccess, setDownloadSuccess] = useState(null); // 'pdf' | 'md' | 'html' | 'json'

  if (!isOpen) return null;

  const selectedModules = exportScope === 'single' ? [currentModule] : allModules;
  const isSingle = exportScope === 'single';

  const handleExport = (type) => {
    try {
      if (type === 'pdf') {
        printOrSavePdf(selectedModules);
      } else if (type === 'md') {
        downloadMarkdown(selectedModules);
      } else if (type === 'html') {
        downloadHtml(selectedModules);
      } else if (type === 'json') {
        downloadJson(selectedModules);
      }

      setDownloadSuccess(type);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" style={{ zIndex: 9999 }}>
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white border-b border-blue-900/40">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={11} className="text-blue-400" />
                Offline Documentation Export
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Download ERP Help & SOP Manual
              </h2>
              <p className="text-xs text-blue-100/75 max-w-lg leading-relaxed">
                Save comprehensive SOP guides, sub-feature documentation, and FAQs to your device for offline reading or team training.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6">
          
          {/* 1. SCOPE SELECTION */}
          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Step 1: Choose Documentation Scope
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: All Modules */}
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  exportScope === 'all'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-muted/30 hover:bg-muted/60 border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <BookOpen size={16} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Recommended
                  </span>
                </div>
                <div>
                  <div className="text-xs font-black text-foreground">
                    Complete ERP Operations Manual
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    All {allModules.length} core modules, complete feature breakdown, all 18+ SOP guides & FAQs.
                  </div>
                </div>
              </button>

              {/* Option B: Active Module Only */}
              <button
                type="button"
                onClick={() => setExportScope('single')}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  exportScope === 'single'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-muted/30 hover:bg-muted/60 border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <Layers size={16} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    Active Module
                  </span>
                </div>
                <div>
                  <div className="text-xs font-black text-foreground truncate">
                    {currentModule.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {currentModule.submodules?.length || 0} features, {currentModule.workflows?.length || 0} SOP workflows & tips.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. FORMAT SELECTION & INSTANT ACTIONS */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Step 2: Select Format & Download</span>
              <span className="text-[10px] font-normal normal-case text-muted-foreground">
                Target: <strong className="text-foreground">{isSingle ? currentModule.title : `Complete System (${allModules.length} Modules)`}</strong>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* FORMAT 1: PDF / PRINT */}
              <div className="p-4 rounded-2xl bg-card border border-border hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-3 group shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <Printer size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      PDF / Print
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-foreground pt-1">
                    Printable Manual / PDF
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Formatted document with cover page, table of contents, and clean page breaks. Select "Save as PDF" in print dialog.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {downloadSuccess === 'pdf' ? (
                    <>
                      <CheckCircle2 size={14} className="text-white" /> Opened Print Dialog
                    </>
                  ) : (
                    <>
                      <Printer size={14} /> Open Print / Save as PDF
                    </>
                  )}
                </button>
              </div>

              {/* FORMAT 2: MARKDOWN (.md) */}
              <div className="p-4 rounded-2xl bg-card border border-border hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-3 group shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      .MD File
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-foreground pt-1">
                    Markdown Documentation (.md)
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Lightweight markdown document ready for Notion, Obsidian, GitHub wiki, or offline text readers.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleExport('md')}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {downloadSuccess === 'md' ? (
                    <>
                      <CheckCircle2 size={14} className="text-white" /> Downloaded .md!
                    </>
                  ) : (
                    <>
                      <Download size={14} /> Download Markdown (.md)
                    </>
                  )}
                </button>
              </div>

              {/* FORMAT 3: OFFLINE HTML (.html) */}
              <div className="p-4 rounded-2xl bg-card border border-border hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-3 group shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Globe size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      .HTML File
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-foreground pt-1">
                    Standalone HTML Document (.html)
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Single-file offline webpage with modern styling and responsive tables. Opens directly in any browser without server.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleExport('html')}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {downloadSuccess === 'html' ? (
                    <>
                      <CheckCircle2 size={14} className="text-white" /> Downloaded .html!
                    </>
                  ) : (
                    <>
                      <Download size={14} /> Download HTML (.html)
                    </>
                  )}
                </button>
              </div>

              {/* FORMAT 4: STRUCTURED JSON (.json) */}
              <div className="p-4 rounded-2xl bg-card border border-border hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-3 group shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Code size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      .JSON Data
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-foreground pt-1">
                    Structured Data Export (.json)
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Clean JSON payload containing all module objects, sub-screens, workflows, and FAQs for system integration.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {downloadSuccess === 'json' ? (
                    <>
                      <CheckCircle2 size={14} className="text-white" /> Downloaded .json!
                    </>
                  ) : (
                    <>
                      <Download size={14} /> Download JSON (.json)
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* HINT BANNER */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>
              All documentation is generated client-side directly from your active ERP environment. No external network request is made.
            </span>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-muted/20 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            JTS Enterprise ERP v4.2 Knowledge Base
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-card hover:bg-muted border border-border text-xs font-black text-foreground transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpDownloadModal;
