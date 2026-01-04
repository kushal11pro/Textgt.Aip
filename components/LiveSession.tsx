import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, Schema } from '@google/genai';
import { Mic, MicOff, Activity, Image as ImageIcon, X, Download, Loader2, FileCode, ExternalLink, Globe, Smartphone } from 'lucide-react';
import { decodeAudioData, createPcmBlob, base64ToUint8Array } from '../utils/audioUtils';
import { saveToHistory, loadFromHistory } from '../utils/history';
import { getApiKey } from '../utils/apiKey';
import { CodeFile } from '../types';

// Constants for Code Workspace Storage (Must match CodeWorkspace.tsx)
const FILES_KEY = 'textgpt_code_files';
const CHAT_KEY = 'textgpt_code_chat';

// Tool Declarations
const generateImageTool: FunctionDeclaration = {
  name: 'generate_image',
  description: 'Generate an image based on a text prompt. Use this when the user asks to create, generate, draw, or make an image/picture/photo.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'The detailed description of the image.' }
    },
    required: ['prompt']
  }
};

const generateCodeTool: FunctionDeclaration = {
  name: 'generate_code',
  description: 'Generate code for a web application, website, or script.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: 'The detailed description of the code.' }
    },
    required: ['description']
  }
};

const googleSearchTool: FunctionDeclaration = {
  name: 'google_search',
  description: 'Search the internet for real-time information, news, weather, sports scores, or facts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The search query.' }
    },
    required: ['query']
  }
};

const openAppTool: FunctionDeclaration = {
  name: 'open_app',
  description: 'Open external applications or websites like WhatsApp, YouTube, Google Maps, Calendar, etc.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: { 
        type: Type.STRING, 
        description: 'The name of the app: "whatsapp", "youtube", "maps", "calendar", "facebook", "twitter", "instagram".' 
      },
      content: {
        type: Type.STRING,
        description: 'Optional content: message for WhatsApp, search query for YouTube/Maps, event title for Calendar.'
      }
    },
    required: ['appName']
  }
};

interface ActionCard {
  type: 'link' | 'image' | 'code';
  title: string;
  url?: string;
  content?: string;
  icon?: any;
}

export const LiveSession: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // UI States
  const [activeCard, setActiveCard] = useState<ActionCard | null>(null);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  const [toolStatus, setToolStatus] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animRef = useRef<number>(0);

  const cleanup = () => {
    if (sessionRef.current) {
      sessionRef.current.then(s => s.close());
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }
    scheduledSources.current.forEach(s => s.stop());
    scheduledSources.current.clear();
    setIsConnected(false);
    setStatus('disconnected');
    setIsSpeaking(false);
    setActiveCard(null);
    setIsProcessingTool(false);
  };

  // --- Tool Handlers ---

  const performGoogleSearch = async (query: string): Promise<string> => {
    setToolStatus('Searching Google...');
    setIsProcessingTool(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) return "API Key missing";

      const ai = new GoogleGenAI({ apiKey });
      // Use standard model for search
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: query }] },
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const text = response.text || "No results found.";
      
      // Extract sources for UI
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
         const firstLink = chunks.find((c: any) => c.web)?.web;
         if (firstLink) {
             setActiveCard({
                 type: 'link',
                 title: `Result: ${firstLink.title}`,
                 url: firstLink.uri,
                 icon: Globe,
                 content: text.slice(0, 100) + '...'
             });
         }
      }

      return text;
    } catch (e) {
      console.error(e);
      return "Error connecting to Google Search.";
    } finally {
      setIsProcessingTool(false);
    }
  };

  const handleOpenApp = async (appName: string, content: string = ''): Promise<string> => {
    setToolStatus(`Opening ${appName}...`);
    setIsProcessingTool(true);
    
    let url = '';
    const encoded = encodeURIComponent(content);
    const name = appName.toLowerCase();

    if (name.includes('whatsapp')) {
        url = `https://wa.me/?text=${encoded}`;
    } else if (name.includes('youtube')) {
        url = content ? `https://www.youtube.com/results?search_query=${encoded}` : `https://www.youtube.com`;
    } else if (name.includes('map')) {
        url = content ? `https://www.google.com/maps/search/?api=1&query=${encoded}` : `https://maps.google.com`;
    } else if (name.includes('calendar')) {
        url = `https://calendar.google.com/calendar/r/eventedit?text=${encoded}`;
    } else if (name.includes('twitter') || name.includes('x.com')) {
        url = `https://twitter.com/intent/tweet?text=${encoded}`;
    } else if (name.includes('facebook')) {
        url = `https://www.facebook.com`;
    } else {
        url = `https://www.google.com/search?q=${appName}`;
    }

    setActiveCard({
        type: 'link',
        title: `Open ${appName.charAt(0).toUpperCase() + appName.slice(1)}`,
        url: url,
        icon: Smartphone,
        content: content ? `Action: ${content}` : 'Launch App'
    });

    setIsProcessingTool(false);
    return `I've prepared a card to open ${appName}. Please click it to proceed.`;
  };

  const generateImageFromVoice = async (prompt: string): Promise<string> => {
    setToolStatus('Generating image...');
    setIsProcessingTool(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) return "API Key missing";

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: '1:1' } }
      });

      let imageUrl = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      
      if (imageUrl) {
          setActiveCard({
              type: 'image',
              title: 'Generated Image',
              url: imageUrl,
              content: prompt,
              icon: ImageIcon
          });
          return "Image displayed.";
      }
      return "Failed to generate image.";
    } catch (e) {
        return "Error generating image.";
    } finally {
        setIsProcessingTool(false);
    }
  };

  const generateCodeFromVoice = async (description: string): Promise<string> => {
    setToolStatus('Writing code...');
    setIsProcessingTool(true);
    try {
        const apiKey = getApiKey();
        if (!apiKey) return "API Key missing";

        const ai = new GoogleGenAI({ apiKey });
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              files: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    filename: { type: Type.STRING },
                    content: { type: Type.STRING },
                    language: { type: Type.STRING }
                  },
                  required: ["filename", "content", "language"]
                }
              }
            },
            required: ["files", "explanation"]
        };

        const existingFiles = loadFromHistory<CodeFile[]>(FILES_KEY, []);
        let prompt = `Create code for: ${description}. Generate multiple files if needed. Return JSON.`;
        if (existingFiles.length > 0) {
            prompt += `\n\nCurrent Files: ${existingFiles.map(f => f.filename).join(', ')}. Update/Create as needed.`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                systemInstruction: "Expert full-stack developer. Structured JSON output."
            }
        });

        const jsonStr = response.text;
        if (!jsonStr) return "Failed.";

        const result = JSON.parse(jsonStr);
        if (result.files) {
            const newFilesMap = new Map(existingFiles.map(f => [f.filename, f]));
            result.files.forEach((f: CodeFile) => newFilesMap.set(f.filename, f));
            saveToHistory(FILES_KEY, Array.from(newFilesMap.values()));
            
            const existingChat = loadFromHistory<any[]>(CHAT_KEY, []);
            saveToHistory(CHAT_KEY, [...existingChat, { role: 'user', text: description }, { role: 'model', text: result.explanation }]);

            setActiveCard({
                type: 'code',
                title: 'Code Generated',
                content: `Created ${result.files.length} files. Check Code Studio.`,
                icon: FileCode
            });
            return "Code generated and saved.";
        }
        return "Format error.";
    } catch (e) {
        return "Error writing code.";
    } finally {
        setIsProcessingTool(false);
    }
  };

  // --- Session Management ---

  const startSession = async () => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
          alert("API Key not found. Please sign in.");
          return;
      }
      
      setStatus('connecting');
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      nextStartTimeRef.current = audioContextRef.current.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `You are a highly capable AI assistant with access to the internet and apps. 
          1. Use 'google_search' for real-time info, news, or facts. 
          2. Use 'open_app' to help users open WhatsApp, YouTube, Maps, Calendar, etc. 
          3. Use 'generate_image' and 'generate_code' when asked.
          If asked to set an alarm/reminder, use 'open_app' with 'calendar' or 'clock'.
          Always inform the user what you are doing.`,
          tools: [{ functionDeclarations: [generateImageTool, generateCodeTool, googleSearchTool, openAppTool] }],
        },
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
            setStatus('connected');
            setIsConnected(true);
            
            if (!inputContextRef.current) return;
            const source = inputContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                    let result = "Done";
                    if (fc.name === 'generate_image') {
                        result = await generateImageFromVoice(fc.args['prompt'] as string);
                    } else if (fc.name === 'generate_code') {
                        result = await generateCodeFromVoice(fc.args['description'] as string);
                    } else if (fc.name === 'google_search') {
                        result = await performGoogleSearch(fc.args['query'] as string);
                    } else if (fc.name === 'open_app') {
                        result = await handleOpenApp(fc.args['appName'] as string, fc.args['content'] as string);
                    }
                    sessionPromise.then(session => session.sendToolResponse({
                        functionResponses: { name: fc.name, id: fc.id, response: { result } }
                    }));
                }
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              setIsSpeaking(true);
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(base64ToUint8Array(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                scheduledSources.current.delete(source);
                if (scheduledSources.current.size === 0) setIsSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              scheduledSources.current.add(source);
            }
            if (msg.serverContent?.turnComplete) setIsSpeaking(false);
          },
          onclose: () => cleanup(),
          onerror: () => { cleanup(); setStatus('error'); }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (e) {
      console.error(e);
      cleanup();
      setStatus('error');
    }
  };

  // Visualizer Loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    let hue = 0;
    const draw = () => {
      if (!ctx || !canvasRef.current) return;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      const cx = canvasRef.current.width / 2;
      const cy = canvasRef.current.height / 2;
      if (isConnected) {
        hue += 1;
        ctx.strokeStyle = `hsl(${hue % 360}, 70%, 60%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const r = 50 + (isSpeaking ? Math.random() * 20 : 0);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        if (isSpeaking) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
          ctx.strokeStyle = `hsl(${(hue + 180) % 360}, 50%, 50%)`;
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isConnected, isSpeaking]);

  return (
    <div className="flex flex-col h-full bg-slate-900 items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900 pointer-events-none" />
      
      <div className="z-10 text-center space-y-8 flex flex-col items-center w-full max-w-lg">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">TextGpt Live</h2>
          <p className="text-slate-400">Voice with Internet & App Access</p>
        </div>

        <div className="relative w-full flex flex-col items-center gap-6">
          <div className="relative">
             <canvas ref={canvasRef} width={300} height={300} className="rounded-full bg-slate-800/50 shadow-2xl backdrop-blur-sm" />
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               {isConnected ? <Activity className={`w-12 h-12 ${isSpeaking ? 'text-indigo-400' : 'text-slate-500'} transition-colors`} /> : <MicOff className="w-12 h-12 text-slate-600" />}
             </div>
          </div>

          {/* Action Card Overlay */}
          {activeCard && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-slate-800 p-4 rounded-xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300 flex flex-col items-center text-center gap-3">
                  <button onClick={() => setActiveCard(null)} className="absolute top-2 right-2 text-slate-500 hover:text-white"><X size={16}/></button>
                  
                  {activeCard.type === 'image' && activeCard.url ? (
                      <div className="relative w-full">
                        <img src={activeCard.url} alt="Generated" className="w-full rounded-lg" />
                        <a href={activeCard.url} download="gen.png" className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white rounded"><Download size={14} /></a>
                      </div>
                  ) : activeCard.type === 'link' ? (
                      <div className="space-y-3 w-full">
                          <div className="w-12 h-12 bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto text-indigo-400">
                              {activeCard.icon ? <activeCard.icon size={24} /> : <ExternalLink size={24} />}
                          </div>
                          <h3 className="font-bold text-white text-lg">{activeCard.title}</h3>
                          {activeCard.content && <p className="text-sm text-slate-400 line-clamp-3">{activeCard.content}</p>}
                          {activeCard.url && (
                             <a href={activeCard.url} target="_blank" rel="noopener noreferrer" className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors">
                                Open Link
                             </a>
                          )}
                      </div>
                  ) : (
                      <div className="space-y-3">
                           <FileCode size={40} className="mx-auto text-emerald-400" />
                           <h3 className="font-bold text-white">{activeCard.title}</h3>
                           <p className="text-sm text-slate-400">{activeCard.content}</p>
                      </div>
                  )}
              </div>
          )}

           {isProcessingTool && (
              <div className="absolute top-full mt-4 flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full text-indigo-300 text-sm backdrop-blur-sm border border-slate-700/50">
                  <Loader2 className="animate-spin" size={14} />
                  {toolStatus || 'Thinking...'}
              </div>
           )}
        </div>

        <div className="flex justify-center gap-4">
          {!isConnected ? (
            <button
              onClick={startSession}
              disabled={status === 'connecting'}
              className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-700 disabled:opacity-50"
            >
              {status === 'connecting' ? 'Connecting...' : 'Start Session'}
              <Mic className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <button
              onClick={cleanup}
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white transition-all duration-200 bg-red-600 rounded-full hover:bg-red-700"
            >
              End Session
            </button>
          )}
        </div>
        
        {status === 'error' && <p className="text-red-400 text-sm mt-4">Connection failed.</p>}
      </div>
    </div>
  );
};
