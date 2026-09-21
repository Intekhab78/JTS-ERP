import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, ShieldCheck, Rocket } from 'lucide-react';
import Login from './Login';
import Register from './Register';

const AuthLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(location.pathname === '/register');

  useEffect(() => {
    setIsRegister(location.pathname === '/register');
  }, [location.pathname]);

  const handleToggle = (path) => {
    setIsRegister(path === '/register');
    navigate(path, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#eaf0f6] flex items-center justify-center p-4 font-sans text-slate-800">
      
      {/* Desktop Layout */}
      <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-100 min-h-[650px] hidden md:flex relative">
        
        {/* Static Left Side (Branding) */}
        <div className="w-5/12 bg-[#fafbfc] p-10 lg:p-14 flex flex-col justify-center border-r border-slate-100 z-10 shrink-0 shadow-md">
          <div className="w-14 h-14 bg-[#e2e8f4] rounded-full flex items-center justify-center mb-10 shadow-sm border border-[#d1dff0]">
            <LayoutGrid className="text-[#0265dc]" size={24} />
          </div>
          
          <h1 className="text-4xl font-extrabold text-[#0f172a] leading-[1.1] mb-6 tracking-tight">
            Accelerate <br />
            <span className="text-[#0265dc]">
              Your Workflow
            </span>
          </h1>
          
          <p className="text-slate-500 text-sm leading-relaxed mb-10 font-medium">
            Secure, scalable, and intelligent enterprise resource planning tailored for high-stakes environments.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-xs font-bold text-slate-600">
              <ShieldCheck className="text-emerald-500 shrink-0" size={18} /> Enterprise-grade security
            </div>
            <div className="flex items-start gap-3 text-xs font-bold text-slate-600">
              <Rocket className="text-emerald-500 shrink-0" size={18} /> Intelligent automation
            </div>
          </div>
        </div>

        {/* Dynamic Right Side (Sliding Forms) */}
        <div className="w-7/12 relative overflow-hidden bg-white shrink-0">
          <div 
            className="flex w-[200%] h-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: isRegister ? 'translateX(-50%)' : 'translateX(0)' }}
          >
            {/* Login Panel */}
            <div className="w-1/2 p-10 lg:p-14 shrink-0 flex flex-col justify-center h-full">
              <Login onToggle={handleToggle} />
            </div>
            
            {/* Register Panel */}
            <div className="w-1/2 p-10 lg:p-14 shrink-0 flex flex-col justify-center h-full">
              <Register onToggle={handleToggle} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout (Stacked without slider) */}
      <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 md:hidden flex flex-col">
        <div className="bg-[#fafbfc] p-8 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 bg-[#e2e8f4] rounded-full flex items-center justify-center mb-4 border border-[#d1dff0]">
            <LayoutGrid className="text-[#0265dc]" size={18} />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">ERP Suite</h1>
        </div>
        <div className="p-8 flex-1">
          {isRegister ? <Register onToggle={handleToggle} /> : <Login onToggle={handleToggle} />}
        </div>
      </div>

    </div>
  );
};

export default AuthLayout;
