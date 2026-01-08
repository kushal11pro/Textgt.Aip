
import React, { useState, useEffect } from 'react';
import { MessageCircle, Mic, Image as ImageIcon, Eye, Zap, Menu, X, FileCode, Video, Key, ChevronLeft, ChevronRight, Settings, Command } from 'lucide-react';
import { AppMode } from '../types';
import { ChatInterface } from './ChatInterface';
import { LiveSession } from './LiveSession';
import { ImageGenInterface } from './ImageGenInterface';
import { VisionInterface } from './VisionInterface';
import { FastLab } from './FastLab';
import { CodeWorkspace } from './CodeWorkspace';
import { VideoGenInterface } from './VideoGenInterface';
import { ApiKeyModal } from './ApiKeyModal';
import { Logo } from './Logo';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.CHAT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [codePrompt, setCodePrompt] = useState<string>('');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCodeRedirect = (prompt: string) => {
    setCodePrompt(prompt);
    setActiveMode(AppMode.CODING);
  };

  const NavItem = ({ mode, icon: Icon, label }: { mode: AppMode; icon: any; label: string }) => {
    const isActive = activeMode === mode;
    return (
      <button
        onClick={() => {
          setActiveMode(mode);
          if (isMobile) setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
          isActive 
            ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)]' 
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
        }`}
      >
        <div className={`transition-all duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          <Icon size={18} />
        </div>
        {(isSidebarOpen || isMobile) && (
          <span className={`text-[13px] font-semibold tracking-tight transition-opacity duration-300 ${isActive ? 'text-white' : ''}`}>
            {label}
          </span>
        )}
      </button>
    );
  };

  const renderContent = () => {
    switch (activeMode) {
      case AppMode.CHAT: return <ChatInterface onCodeRequest={handleCodeRedirect} />;
      case AppMode.LIVE: return <LiveSession />;
      case AppMode.IMAGES: return <ImageGenInterface />;
      case AppMode.VIDEO: return <VideoGenInterface />;
      case AppMode.VISION: return <VisionInterface />;
      case AppMode.FAST: return <FastLab />;
      case AppMode.CODING: return <CodeWorkspace initialPrompt={codePrompt} onClearInitialPrompt={() => setCodePrompt('')} />;
      default: return <ChatInterface onCodeRequest={handleCodeRedirect} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#020202] text-[#f8fafc] overflow-hidden select-none">
      
      {/* Activity Bar (Slim Left Nav) */}
      {!isMobile && (
        <aside className="w-16 border-r border-white/5 bg-[#050505] flex flex-col items-center py-6 gap-6 z-[60]">
           <div className="p-2.5 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-4">
             <Logo size={20} />
           </div>
           <div className="flex flex-col gap-4">
             <button onClick={() => setActiveMode(AppMode.CHAT)} className={`p-2.5 rounded-xl transition-all ${activeMode === AppMode.CHAT ? 'text-white bg-white/5' : 'text-slate-700 hover:text-slate-400'}`}><MessageCircle size={20} /></button>
             <button onClick={() => setActiveMode(AppMode.CODING)} className={`p-2.5 rounded-xl transition-all ${activeMode === AppMode.CODING ? 'text-white bg-white/5' : 'text-slate-700 hover:text-slate-400'}`}><FileCode size={20} /></button>
             <button onClick={() => setActiveMode(AppMode.IMAGES)} className={`p-2.5 rounded-xl transition-all ${activeMode === AppMode.IMAGES ? 'text-white bg-white/5' : 'text-slate-700 hover:text-slate-400'}`}><ImageIcon size={20} /></button>
           </div>
           <div className="mt-auto flex flex-col gap-4">
             <button onClick={() => setIsKeyModalOpen(true)} className="p-2.5 rounded-xl text-slate-700 hover:text-indigo-400 transition-all"><Key size={20} /></button>
             <button className="p-2.5 rounded-xl text-slate-700 hover:text-white transition-all"><Settings size={20} /></button>
           </div>
        </aside>
      )}

      {/* Main Sidebar */}
      <aside 
        className={`
          relative h-full border-r border-white/5 bg-[#080808] flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-50
          ${isMobile ? 'fixed inset-y-0 left-0 w-72 shadow-2xl' : ''}
          ${!isMobile && (isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden')}
          ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        <div className="p-6 flex flex-col h-full gap-8">
          <div className="flex items-center justify-between">
             {(isSidebarOpen || isMobile) && (
               <div className="flex flex-col">
                 <span className="text-lg font-normal tracking-tight text-white italic">TextGpt ai</span>
                 <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Studio Core v3</span>
               </div>
             )}
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 p-2">
                <X size={20} />
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-8 overflow-y-auto no-scrollbar py-2">
            <div>
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mb-4 ml-4">Neural Hub</p>
              <div className="space-y-1">
                <NavItem mode={AppMode.CHAT} icon={MessageCircle} label="Nexus Node" />
                <NavItem mode={AppMode.VISION} icon={Eye} label="Optic Scanner" />
                <NavItem mode={AppMode.LIVE} icon={Mic} label="Nebula Link" />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mb-4 ml-4">Creative Engine</p>
              <div className="space-y-1">
                <NavItem mode={AppMode.IMAGES} icon={ImageIcon} label="Forge Studio" />
                <NavItem mode={AppMode.VIDEO} icon={Video} label="Veo Motion" />
                <NavItem mode={AppMode.FAST} icon={Zap} label="Quick Utilities" />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mb-4 ml-4">Dev Suite</p>
              <div className="space-y-1">
                <NavItem mode={AppMode.CODING} icon={FileCode} label="Codespace IDE" />
              </div>
            </div>
          </nav>

          <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-4 text-[9px] font-black text-slate-800 uppercase tracking-widest">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
             System Operational
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020202] relative">
        {/* Mobile Header */}
        {isMobile && (
          <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between glass-panel sticky top-0 z-40 bg-[#020202]/50 backdrop-blur-xl shrink-0">
             <div className="flex items-center gap-4">
               <button onClick={() => setIsSidebarOpen(true)} className="text-slate-200 p-2">
                 <Menu size={20} />
               </button>
               <span className="tracking-tighter text-xl font-normal italic">TextGpt ai</span>
             </div>
             <button onClick={() => setIsKeyModalOpen(true)} className="text-indigo-400 p-2">
               <Key size={18} />
             </button>
          </header>
        )}

        {/* Unified Tool Header (Desktop) */}
        {!isMobile && (
          <header className="h-14 border-b border-white/5 px-8 flex items-center justify-between shrink-0 bg-[#050505]/40 backdrop-blur-md">
             <div className="flex items-center gap-6">
               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-600 hover:text-white transition-colors">
                 {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
               </button>
               <div className="h-4 w-[1px] bg-white/5"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{activeMode.replace('_', ' ')} MODULE</span>
             </div>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full">
                   <Command size={10} className="text-slate-700" />
                   <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">K Neural Processing</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10"></div>
             </div>
          </header>
        )}
        
        <div className="flex-1 relative overflow-hidden bg-[#020202]">
          {renderContent()}
        </div>
      </main>

      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onClose={() => setIsKeyModalOpen(false)} 
        onSuccess={() => setIsKeyModalOpen(false)} 
      />
    </div>
  );
};

export default App;
