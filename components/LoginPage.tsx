import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2, Settings, AlertCircle, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginPageProps {
  onLoginSuccess: (profile?: UserProfile) => void;
}

type AuthStep = 'INIT' | 'VERIFY_OTP';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<AuthStep>('INIT');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');

  // Google Auth State
  const [clientId, setClientId] = useState(() => localStorage.getItem('google_client_id') || '');
  const [showSettings, setShowSettings] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Google Sign-In if Client ID is present
    const win = window as any;
    if (clientId && win.google && step === 'INIT') {
      try {
        win.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnRef.current) {
          win.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: '100%',
            type: 'standard',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left'
          });
        }
      } catch (e) {
        console.error("Google Sign-In Error:", e);
      }
    }
  }, [clientId, step, showSettings]);

  const handleGoogleCallback = (response: any) => {
    try {
      const token = response.credential;
      const payload = parseJwt(token);
      
      const profile: UserProfile = {
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        iss: payload.iss
      };
      
      onLoginSuccess(profile);
    } catch (e) {
      setError("Failed to decode Google profile.");
    }
  };

  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return {};
    }
  };

  const saveClientId = () => {
    if (clientId.trim()) {
      localStorage.setItem('google_client_id', clientId.trim());
      setShowSettings(false);
      window.location.reload(); // Reload to re-init Google SDK cleanly
    }
  };

  // Handle Email/Password Submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    // Simulate Sending OTP
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setStep('VERIFY_OTP');
  };

  // Handle OTP Submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setIsLoading(true);
    // Simulate Verification Request
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsLoading(false);
    
    // Fallback profile for email login
    onLoginSuccess({
      name: email.split('@')[0],
      email: email,
      picture: ''
    });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden text-slate-200">
      
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#4338ca_0%,_#0f172a_50%)] opacity-40 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,_#ec4899_0%,_#0f172a_30%)] opacity-20 pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-10 relative">
        
        {/* Settings Toggle */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"
          title="Configure Google Client ID"
        >
          <Settings size={20} />
        </button>

        {showSettings ? (
          <div className="p-8 space-y-6 animate-in fade-in zoom-in duration-200">
             <div className="flex items-center gap-2 text-white font-bold text-xl">
               <Settings className="text-indigo-400" />
               Login Configuration
             </div>
             <p className="text-slate-400 text-sm">
               To enable real Google Sign-In, you must provide a Google Cloud Client ID. 
               This runs entirely in your browser.
             </p>
             <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Google Client ID</label>
                <input 
                  type="text" 
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="123456-abcde.apps.googleusercontent.com"
                />
             </div>
             <button
               onClick={saveClientId}
               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors"
             >
               Save & Reload
             </button>
             <button
               onClick={() => setShowSettings(false)}
               className="w-full text-slate-500 hover:text-white py-2 text-sm transition-colors"
             >
               Cancel
             </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-8 pb-4 text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                  <span className="font-bold text-xl text-white">T</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {step === 'INIT' ? 'Welcome back' : 'Verify Identity'}
              </h1>
              <p className="text-slate-400 text-sm">
                {step === 'INIT' 
                  ? 'Sign in to your TextGpt account' 
                  : `We sent a code to ${email}`
                }
              </p>
            </div>

            {/* Form Area */}
            <div className="px-8 pb-8">
              {step === 'INIT' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  
                  {/* Google Login Container */}
                  <div className="w-full min-h-[44px]">
                     {clientId ? (
                        <div ref={googleBtnRef} className="w-full flex justify-center"></div>
                     ) : (
                        <button
                          onClick={() => setShowSettings(true)}
                          className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-medium py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors shadow-sm opacity-80"
                        >
                           <AlertCircle size={18} className="text-amber-600" />
                           Setup Google Login
                        </button>
                     )}
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-xs text-slate-500 uppercase font-semibold">Or with Email</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 ml-1">Email or Phone</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                        <input 
                          type="text" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                          placeholder="name@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 ml-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {error && <p className="text-red-400 text-xs">{error}</p>}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
                      {!isLoading && <ArrowRight size={18} />}
                    </button>
                  </form>
                </div>
              )}

              {step === 'VERIFY_OTP' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className="w-12 h-14 text-center text-2xl font-bold bg-slate-950 border border-slate-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-white"
                      />
                    ))}
                  </div>

                  {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                  <button
                    onClick={handleVerifyOtp}
                    disabled={isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                     {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Verify Code'}
                  </button>

                  <div className="text-center">
                    <button 
                      onClick={() => setStep('INIT')}
                      className="text-slate-500 text-sm hover:text-indigo-400 flex items-center gap-2 mx-auto transition-colors"
                    >
                      <ArrowLeft size={14} /> Back to Login
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="bg-slate-950/50 px-8 py-4 border-t border-slate-800 flex items-center justify-center gap-6">
               <div className="flex items-center gap-1 text-xs text-slate-500">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <span>Secure Encrypted Login</span>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};