import React, { useState } from 'react';
import { LogIn, AlertTriangle, ShieldCheck, Mail, Lock, Loader2, User as UserIcon, Check, Eye, EyeOff, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithPopup, googleProvider, auth, isFirebaseConfigured, db, doc, setDoc, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../firebase';

export default function Login() {
  const [loginMethod, setLoginMethod] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Google login failed. Please try again.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error("Invalid email or password.");
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error("Email/Password login is not enabled in Firebase Console.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsLoggingIn(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, { name: name }, { merge: true });
      toast.success("Registration successful! Please wait for admin approval.");
    } catch (error: any) {
      console.error("Registration failed:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Email is already registered.");
      } else if (error.code === 'auth/weak-password') {
        toast.error("Password should be at least 6 characters.");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-[#1140C9] overflow-hidden">
      {/* Left Side: Branding / Marketing */}
      <div className="hidden lg:flex flex-col w-full lg:w-[55%] relative overflow-hidden bg-[#0A2E9C] bg-gradient-to-br from-[#1140C9] to-[#0A2E9C]">
        {/* Background Rings / Wave pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <svg width="100%" height="100%" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
             <circle cx="800" cy="0" r="300" fill="none" stroke="white" strokeWidth="2" />
             <circle cx="800" cy="0" r="450" fill="none" stroke="white" strokeWidth="2" />
             <circle cx="800" cy="0" r="600" fill="none" stroke="white" strokeWidth="2" />
             <circle cx="800" cy="0" r="750" fill="none" stroke="white" strokeWidth="2" />
           </svg>
        </div>

        <div className="p-12 relative z-10 flex flex-col h-full text-white">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white text-[#1140C9] rounded-xl flex items-center justify-center font-black text-2xl">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold">Amar Supply</h1>
              <p className="text-sm text-blue-200">Business OS</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-5xl font-bold leading-[1.1] mb-6">
              Run your entire business from <span className="text-blue-300">one place</span>
            </h2>
            <p className="text-xl text-blue-100 mb-12 max-w-lg">
              POS, Inventory, Orders, CRM, Accounting, Logistics — all in one simple platform.
            </p>

            {/* Features Row */}
            <div className="grid grid-cols-4 gap-6 mb-12">
              {[
                { icon: 'shopping-bag', label: 'Smart POS', desc: 'Fast & Easy Billing', iconColor: 'text-[#3E80EA]', iconBg: 'bg-[#3E80EA]/20' },
                { icon: 'box', label: 'Inventory', desc: 'Track & Manage Stock', iconColor: 'text-[#1DAB61]', iconBg: 'bg-[#1DAB61]/20' },
                { icon: 'users', label: 'CRM', desc: 'Grow Customer Relationships', iconColor: 'text-[#A855F7]', iconBg: 'bg-[#A855F7]/20' },
                { icon: 'truck', label: 'Logistics', desc: 'Deliver Faster, Every Time', iconColor: 'text-[#EA580C]', iconBg: 'bg-[#EA580C]/20' },
              ].map((feature, i) => (
                <div key={i} className="flex flex-col">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.iconBg} ${feature.iconColor}`}>
                    {feature.icon === 'shopping-bag' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
                    {feature.icon === 'box' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
                    {feature.icon === 'users' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                    {feature.icon === 'truck' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
                  </div>
                  <h3 className="font-bold mb-1">{feature.label}</h3>
                  <p className="text-xs text-blue-200 leading-tight">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Mock Dashboard UI */}
            <div className="relative mt-8">
               <div className="absolute -left-12 top-4">
                  <svg width="40" height="80" viewBox="0 0 60 120" xmlns="http://www.w3.org/2000/svg" stroke="#3b82f6" fill="none" strokeWidth="2" strokeLinecap="round">
                     <path d="M50 0 C 30 20, 0 50, 0 100" />
                     <polygon points="-5,90 2,105 10,95" fill="#3b82f6" />
                  </svg>
               </div>
               <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] relative w-[105%] ml-5 mt-5 h-[380px] p-2 pr-0 pb-0">
                 <div className="w-full h-full bg-[#F8FAFC] rounded-tl-[12px] flex box-border border-t border-l border-gray-200 overflow-hidden relative">
                    <div className="w-[140px] bg-[#0F172A] p-4 flex flex-col gap-2 shrink-0 h-full overflow-hidden">
                       <div className="flex items-center gap-2 text-white mb-6">
                           <div className="w-5 h-5 bg-[#3E80EA] rounded text-[10px] flex items-center justify-center font-bold">A</div>
                           <span className="text-[11px] font-medium">Amar Supply</span>
                       </div>
                       {[
                         { i: 'layout-dashboard', text: 'Dashboard', bg: 'bg-[#1E293B] text-white', color: 'text-white' },
                         { i: 'shopping-cart', text: 'POS', bg: 'transparent', color: 'text-slate-400' },
                         { i: 'file-text', text: 'Orders', bg: 'transparent', color: 'text-slate-400' },
                         { i: 'box', text: 'Inventory', bg: 'transparent', color: 'text-slate-400' },
                         { i: 'users', text: 'Customers', bg: 'transparent', color: 'text-slate-400' },
                         { i: 'truck', text: 'Logistics', bg: 'transparent', color: 'text-slate-400' },
                       ].map((m, idx) => (
                           <div key={idx} className={`flex items-center gap-2 ${m.bg} ${m.color} p-2 rounded-lg`}>
                               <div className="w-3 h-3 opacity-80 bg-current mask-icon"></div>
                               <span className="text-[10px]">{m.text}</span>
                           </div>
                       ))}
                    </div>
                    <div className="flex-1 p-5 overflow-hidden flex flex-col gap-4">
                        <div className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-gray-200">
                            <span className="text-gray-400 text-[10px]">Search...</span>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                                <div className="w-5 h-5 bg-blue-100 rounded-full"></div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">Good morning, Ray 👋</h4>
                            <p className="text-[10px] text-gray-500">Here's what's happening with your business today.</p>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {['Total Sales', 'Orders', 'Customers', 'Profit'].map((lbl, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100">
                                    <h5 className="text-[9px] text-gray-500">{lbl}</h5>
                                    <div className="text-sm font-bold text-gray-900 mt-1 mb-1">
                                        {idx === 0 ? '৳ 8,540,000' : idx === 1 ? '1,248' : idx === 2 ? '2,856' : '৳ 1,245,300'}
                                    </div>
                                    <span className="text-[8px] text-green-500 font-medium">+12.5% from last month</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4 flex-1">
                            <div className="flex-[2] bg-white rounded-xl border border-gray-100 p-3 flex flex-col">
                                <span className="text-[11px] font-bold text-gray-800">Sales Overview</span>
                                <div className="flex-1 mt-2 border-b border-l border-gray-100 relative">
                                    <svg viewBox="0 0 100 50" className="absolute bottom-0 w-full h-[80%] drop-shadow-md" preserveAspectRatio="none">
                                        <path d="M0,40 Q15,30 30,35 T60,20 T80,25 T100,10" fill="none" stroke="#3b82f6" strokeWidth="2"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 space-y-2">
                                <span className="text-[11px] font-bold text-gray-800">Top Products</span>
                                {[1,2,3].map(i => (
                                    <div key={i} className="flex justify-between items-center border-b border-gray-50 py-1 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 bg-gray-100 rounded"></div>
                                            <span className="text-[9px] font-medium text-gray-700">Product {i}</span>
                                        </div>
                                        <span className="text-[9px] font-bold">৳ 1,250</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>

          <div className="mt-auto pt-16 flex items-center gap-8 border-t border-white/10 text-sm">
            <div className="mr-4">
              <span className="text-blue-200">Trusted by</span><br/>
              <span className="font-bold">1000+ businesses</span>
            </div>
            
            {[
              { icon: 'shopping-bag', val: '8.5M+', sub: 'BDT Sales Managed' },
              { icon: 'box', val: '50K+', sub: 'Orders Processed' },
              { icon: 'check-circle', val: '99.5%', sub: 'Successful Deliveries' }
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 border border-white/20 rounded-xl flex items-center justify-center">
                   {/* icons mock */}
                   <div className="w-4 h-4 border border-white/60 rounded flex items-center justify-center">
                      <div className="w-2 h-2 bg-white/60 rounded-sm"></div>
                   </div>
                </div>
                <div>
                  <span className="font-bold text-[15px]">{stat.val}</span><br/>
                  <span className="text-xs text-blue-200">{stat.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC]">
        <div className="p-6 flex justify-end">
          <div className="relative">
            <select className="appearance-none bg-white border border-gray-200 rounded-full py-2 pl-10 pr-10 text-sm font-medium text-gray-700 hover:bg-gray-50 outline-none cursor-pointer">
              <option value="en">English</option>
              <option value="bn">Bangla</option>
            </select>
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[520px] w-full mx-auto px-6 sm:px-12 py-10">
          <div className="bg-white rounded-[24px] shadow-xl shadow-gray-200/50 p-8 sm:p-12 w-full border border-gray-100">
            <div className="text-center mb-10">
              <h1 className="text-[28px] font-bold text-gray-900 mb-2">Welcome Back 👋</h1>
              <p className="text-[#64748B] font-medium">Login to your account and continue</p>
            </div>

            {!isFirebaseConfigured && (
              <div className="mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800 leading-relaxed">
                  Firebase configuration is missing. Please complete the setup to enable secure authentication.
                </p>
              </div>
            )}

            {loginMethod === 'login' ? (
              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-900">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-[14px] text-sm focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-900">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-11 pr-12 py-3.5 bg-white border border-gray-200 rounded-[14px] text-sm focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        className="peer appearance-none w-5 h-5 border-2 border-gray-200 rounded-[6px] checked:bg-[#2563EB] checked:border-[#2563EB] transition-all cursor-pointer"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <Check className="absolute text-white w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                    </div>
                    <span className="text-[14px] text-[#64748B] font-medium group-hover:text-gray-900 transition-colors">Remember me</span>
                  </label>
                  <button type="button" className="text-[14px] font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                    Forgot Password?
                  </button>
                </div>

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-[#2563EB] text-white rounded-[14px] font-bold text-[15px] hover:bg-[#1D4ED8] transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm shadow-blue-500/20"
                >
                  {isLoggingIn ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <div className="w-5 h-5 shrink-0 bg-white/20 rounded-md flex items-center justify-center">
                         <div className="w-2.5 h-2.5 border-2 border-white rounded-sm"></div>
                      </div>
                      Enter Dashboard
                    </>
                  )}
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-1 border-t border-gray-100"></div>
                  <span className="px-4 text-[13px] font-medium text-gray-400 uppercase tracking-widest">OR</span>
                  <div className="flex-1 border-t border-gray-100"></div>
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white border border-gray-200 text-gray-700 rounded-[14px] font-bold text-[15px] hover:bg-gray-50 transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                <p className="text-center text-[14px] text-gray-500 font-medium pt-2">
                  Don't have an account? <button type="button" onClick={() => setLoginMethod('register')} className="text-[#2563EB] font-bold hover:underline">Sign up</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-900">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-[14px] text-sm focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-900">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-[14px] text-sm focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-900">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      className="w-full pl-11 pr-12 py-3.5 bg-white border border-gray-200 rounded-[14px] text-sm focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-[#2563EB] text-white rounded-[14px] font-bold text-[15px] hover:bg-[#1D4ED8] transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm shadow-blue-500/20"
                >
                  {isLoggingIn ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <div className="w-5 h-5 shrink-0 bg-white/20 rounded-md flex items-center justify-center">
                         <UserIcon size={14} className="text-white" />
                      </div>
                      Create Account
                    </>
                  )}
                </button>

                <p className="text-center text-[14px] text-gray-500 font-medium pt-2">
                  Already have an account? <button type="button" onClick={() => setLoginMethod('login')} className="text-[#2563EB] font-bold hover:underline">Log in</button>
                </p>
              </form>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-[13px] font-medium text-gray-400">
            <Lock size={14} />
            <span>Your data is safe and secure with us</span>
          </div>
        </div>
      </div>
    </div>
  );
}
