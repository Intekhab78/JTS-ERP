import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, X, ChevronRight, ChevronLeft, Check, HelpCircle, 
  Compass, LayoutGrid, Search, Building2, Bell, BookOpen, ExternalLink 
} from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'welcome',
    targetId: null, // Centered welcome modal
    title: 'Welcome to JTS ERP! 👋',
    badge: 'Quick 1-Minute Tour',
    description: 'Welcome to your next-generation Enterprise Resource Planning platform. Manage your entire business—Sales & POS, Inventory, Purchases, Accounts, HR, and E-Commerce—all in one unified place.',
    icon: Sparkles,
    color: 'from-blue-600 to-indigo-600',
    placement: 'center',
    tip: 'Take this quick tour to learn where everything is located.'
  },
  {
    id: 'sidebar',
    targetId: 'tour-sidebar-modules',
    title: 'Module Navigation Menu',
    badge: 'Step 2 of 6',
    description: 'Access all business operations here: Sales & POS, Purchases, Inventory, Accounts, HR & Payroll, E-Commerce, and Administration. Click any module to expand its sub-screens.',
    icon: LayoutGrid,
    color: 'from-indigo-600 to-purple-600',
    placement: 'right',
    tip: 'Click the collapse button (<) at the top of the sidebar for more screen room.'
  },
  {
    id: 'search',
    targetId: 'tour-search-bar',
    title: 'Global Search',
    badge: 'Step 3 of 6',
    description: 'Find any module, screen, or transaction in seconds. Just type what you are looking for—like "POS", "Invoice", "Stock Transfer", or "Payroll".',
    icon: Search,
    color: 'from-purple-600 to-pink-600',
    placement: 'bottom',
    tip: 'You can search across all modules instantly.'
  },
  {
    id: 'company',
    targetId: 'tour-company-selector',
    title: 'Multi-Company & Branch Switcher',
    badge: 'Step 4 of 6',
    description: 'Operating multiple physical stores, warehouses, or legal entities? Switch your active branch here. Inventory, sales, and reports automatically adjust to your selected location.',
    icon: Building2,
    color: 'from-emerald-600 to-teal-600',
    placement: 'bottom',
    tip: 'Warehouse stock and POS billing adapt to your chosen branch.'
  },
  {
    id: 'notifications',
    targetId: 'tour-notifications',
    title: 'Real-Time Notifications',
    badge: 'Step 5 of 6',
    description: 'Stay on top of critical events: new web orders, low stock reorder alerts, manager approval requests, and return pickup statuses.',
    icon: Bell,
    color: 'from-amber-600 to-orange-600',
    placement: 'bottom',
    tip: 'Check your alerts daily to keep operations moving smoothly.'
  },
  {
    id: 'help',
    targetId: 'tour-help-center',
    title: 'Comprehensive Help Center & SOPs',
    badge: 'Step 6 of 6',
    description: 'Need help with any module? Visit our in-depth Help Center anytime for step-by-step SOP guides, keyboard shortcuts, FAQs, and feature breakdowns for every module.',
    icon: BookOpen,
    color: 'from-blue-600 to-cyan-600',
    placement: 'top',
    tip: 'Explore detailed guides for Sales, Returns, Payroll, and more!'
  }
];

export const ProductTourGuide = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Check if tour should run on mount
  useEffect(() => {
    const hasCompleted = localStorage.getItem('jts_tour_completed');
    if (!hasCompleted) {
      // Delay slightly for smooth page load
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStepIndex(0);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for manual launch events from anywhere in the app
  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStepIndex(0);
      setIsActive(true);
    };
    window.addEventListener('start-jts-tour', handleStartTour);
    return () => window.removeEventListener('start-jts-tour', handleStartTour);
  }, []);

  // Update target bounding box whenever step changes or window resizes
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStepIndex];
    if (!step.targetId) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right
        });
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem('jts_tour_completed', 'true');
  };

  const handleSkip = () => {
    setIsActive(false);
    if (dontShowAgain) {
      localStorage.setItem('jts_tour_completed', 'true');
    }
  };

  if (!isActive) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Calculate card position styles
  const getCardStyle = () => {
    if (!targetRect || currentStep.placement === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      };
    }

    const PADDING = 14;
    const CARD_WIDTH = 380;

    if (currentStep.placement === 'bottom') {
      const left = Math.max(16, Math.min(window.innerWidth - CARD_WIDTH - 16, targetRect.left));
      return {
        top: `${targetRect.bottom + PADDING}px`,
        left: `${left}px`,
        position: 'fixed'
      };
    }

    if (currentStep.placement === 'top') {
      const left = Math.max(16, Math.min(window.innerWidth - CARD_WIDTH - 16, targetRect.left));
      return {
        bottom: `${window.innerHeight - targetRect.top + PADDING}px`,
        left: `${left}px`,
        position: 'fixed'
      };
    }

    if (currentStep.placement === 'right') {
      return {
        top: `${Math.max(16, Math.min(window.innerHeight - 340, targetRect.top + 20))}px`,
        left: `${Math.min(window.innerWidth - CARD_WIDTH - 16, targetRect.right + PADDING)}px`,
        position: 'fixed'
      };
    }

    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      position: 'fixed'
    };
  };

  return (
    <div className="fixed inset-0 pointer-events-auto" style={{ zIndex: 9999 }}>
      {/* Dim Overlay with Spotlight Cutout */}
      {targetRect ? (
        <>
          <svg 
            className="fixed inset-0 w-full h-full pointer-events-auto transition-all duration-300"
            style={{ zIndex: 9999 }}
            onClick={(e) => {
              const clickX = e.clientX;
              const clickY = e.clientY;
              const isInside = 
                clickX >= targetRect.left - 6 &&
                clickX <= targetRect.right + 6 &&
                clickY >= targetRect.top - 6 &&
                clickY <= targetRect.bottom + 6;
              if (!isInside) {
                handleSkip();
              }
            }}
          >
            <defs>
              <mask id="tour-spotlight-mask">
                {/* White covers entire screen */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black cutout makes target area completely transparent & unblurred */}
                <rect 
                  x={Math.max(0, targetRect.left - 6)} 
                  y={Math.max(0, targetRect.top - 6)} 
                  width={targetRect.width + 12} 
                  height={targetRect.height + 12} 
                  rx="16" 
                  ry="16" 
                  fill="black" 
                />
              </mask>
            </defs>
            {/* Dimmed backdrop applied everywhere except the cutout */}
            <rect 
              x="0" 
              y="0" 
              width="100%" 
              height="100%" 
              fill="rgba(15, 23, 42, 0.75)" 
              mask="url(#tour-spotlight-mask)" 
            />
          </svg>

          {/* Highlight Glowing Ring around target (crystal clear interior) */}
          <div 
            className="fixed rounded-2xl pointer-events-none transition-all duration-300 border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.65)] ring-2 ring-blue-400/40"
            style={{
              top: Math.max(0, targetRect.top - 6),
              left: Math.max(0, targetRect.left - 6),
              width: targetRect.width + 12,
              height: targetRect.height + 12,
              zIndex: 10000
            }}
          />
        </>
      ) : (
        /* Full Backdrop for Centered Welcome modal where there is no target element */
        <div 
          className="fixed inset-0 bg-slate-950/75 transition-opacity duration-300"
          style={{ zIndex: 9999 }}
          onClick={handleSkip}
        />
      )}

      {/* Step Guide Tooltip / Card */}
      <div 
        style={{ ...getCardStyle(), zIndex: 10001 }}
        className="w-[90vw] max-w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 text-slate-900 dark:text-slate-100"
      >
        {/* Top Header Banner with Gradient */}
        <div className={`px-5 py-4 bg-gradient-to-r ${currentStep.color} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <StepIcon size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/80 block">
                {currentStep.badge}
              </span>
              <h4 className="text-sm font-black text-white leading-tight">
                {currentStep.title}
              </h4>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleSkip}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Skip tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>

          {/* Quick Tip Box */}
          {currentStep.tip && (
            <div className="p-2.5 rounded-xl bg-muted/60 border border-border/80 flex items-start gap-2 text-[11px] text-foreground">
              <Compass size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground">Pro-Tip:</strong> {currentStep.tip}
              </span>
            </div>
          )}

          {/* Progress Indicators & Don't Show Again */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex 
                      ? 'w-6 bg-blue-600' 
                      : idx < currentStepIndex 
                        ? 'w-2 bg-blue-300 dark:bg-blue-800' 
                        : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Don't show again
            </label>
          </div>

          {/* Footer Navigation Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors ${
                currentStepIndex === 0
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer'
              }`}
            >
              <ChevronLeft size={14} /> Back
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isLastStep ? (
                  <>
                    <Check size={14} /> Finish & Start
                  </>
                ) : (
                  <>
                    Next <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductTourGuide;
