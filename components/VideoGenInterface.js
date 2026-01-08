import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Video, Download, Loader2, Clapperboard, Film, Play, Maximize2, Monitor, Cpu } from 'lucide-react';

export const VideoGenInterface = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    const win = window;
    if (win.aistudio) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await win.aistudio.openSelectKey();
      }
    }

    setIsGenerating(true); setError(null); setVideoUrl(null); setStatus('System Warm-up');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      setStatus('Linking Veo Motion Engine');
      let op = await ai.models.generateVideos({ 
        model: 'veo-3.1-fast-generate-preview', 
        prompt, 
        config: { 
          numberOfVideos: 1,
          resolution: '720p', 
          aspectRatio: '16:9' 
        } 
      });

      while (!op.done) {
        setStatus('Synthesizing Temporal Frames');
        await new Promise(r => setTimeout(r, 10000));
        op = await ai.operations.getVideosOperation({ operation: op });
      }

      const downloadUri = op.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadUri) {
          setVideoUrl(`${downloadUri}&key=${process.env.API_KEY}`);
          setStatus('');
      } else {
          setError("Engine failure: Sequence URI null.");
      }
    } catch (err) {
      if (err.message?.includes("Requested entity was not found")) {
        const win = window;
        if (win.aistudio) await win.aistudio.openSelectKey();
      }
      setError(err.message || "Temporal logic error.");
    } finally { setIsGenerating(false); if (!videoUrl) setStatus(''); }
  };

  return (
    <div className="h-full bg-[#020202] flex flex-col overflow-hidden font-sans relative">
      <div className="flex-1 overflow-y-auto p-12 relative z-10">
        <div className="max-w-5xl mx-auto space-y-16">
          <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                 <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                   <Film size={32} className="text-white" />
                 </div>
                 <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">Veo Motion</h2>
              </div>
            </div>
            <div className="flex gap-8">
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Standard</span>
                  <span className="text-xs font-bold text-white px-3 py-1 bg-white/5 rounded-lg">720P HD</span>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-4 space-y-8">
               <div className="bg-[#050505] border border-white/5 rounded-[32px] p-8 space-y-8 shadow-2xl">
                  <textarea 
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)} 
                    placeholder="High-speed chase through a neon-lit cyber city..." 
                    className="w-full h-48 bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-slate-800" 
                  />
                  <button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3">
                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Clapperboard size={20} />}
                    {isGenerating ? 'Synthesizing...' : 'Action'}
                  </button>
               </div>
               {error && <p className="text-xs text-red-400 p-4 bg-red-950/20 rounded-xl">{error}</p>}
            </div>

            <div className="lg:col-span-8 flex flex-col gap-8">
               {isGenerating ? (
                 <div className="aspect-video bg-[#050505] border border-white/10 rounded-[40px] flex flex-col items-center justify-center space-y-10 animate-pulse">
                    <Loader2 className="w-16 h-16 text-indigo-400 animate-spin" />
                    <p className="text-white font-black text-lg uppercase tracking-tighter">{status}</p>
                 </div>
               ) : videoUrl ? (
                 <div className="bg-[#050505] rounded-[48px] overflow-hidden border border-white/10 aspect-video relative group">
                    <video src={videoUrl} controls autoPlay className="w-full h-full object-cover" />
                 </div>
               ) : (
                 <div className="aspect-video bg-[#050505] border border-white/5 border-dashed rounded-[40px] flex flex-col items-center justify-center text-center p-12">
                    <Monitor size={40} className="text-slate-800 mb-6" />
                    <h4 className="text-xl font-black text-white uppercase tracking-tighter">Production Stage</h4>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};