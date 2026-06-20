import React, { useState, useEffect } from "react";
import { 
  Scissors, 
  Wind, 
  CreditCard, 
  Lock, 
  CheckCircle, 
  Search, 
  Copy, 
  Share2, 
  LogOut, 
  Calendar, 
  Phone, 
  User, 
  Download, 
  RefreshCw, 
  Gift, 
  ExternalLink, 
  Menu, 
  X,
  Sparkles,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GIFT_OPTIONS, STATUS_LABELS } from "./types";
import { formatJalali, toPersianDigits } from "./utils/jalali";

interface Client {
  id: string;
  fullName: string;
  mobile: string;
  normalizedMobile: string;
  gift: "blow-dry" | "beard-fade" | "credit-99k";
  trackingCode: string;
  createdAt: string;
  status: "registered" | "visited" | "reward-claimed";
}

export default function App() {
  // Navigation & Views
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  
  // Registration Form State
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [selectedGift, setSelectedGift] = useState<"blow-dry" | "beard-fade" | "credit-99k">("blow-dry");
  
  // Registration Result Screen
  const [registeredClient, setRegisteredClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Admin Dashboard State
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [giftFilter, setGiftFilter] = useState<string>("all");
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Status message timeout helper
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [smsSimulated, setSmsSimulated] = useState(false);

  // Load Admin auth persistence on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("star_admin_token");
    if (savedToken) {
      setIsAdminLoggedIn(true);
      fetchClients(savedToken);
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const resp = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setIsAdminLoggedIn(true);
        localStorage.setItem("star_admin_token", data.token);
        fetchClients(data.token);
        setAdminPassword("");
      } else {
        setLoginError(data.error || "رمز عبور وارد شده صحیح نیست.");
      }
    } catch (err) {
      setLoginError("خطا در ارتباط با سرور. لطفا مجددا تلاش کنید.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem("star_admin_token");
    setClients([]);
  };

  const fetchClients = async (token?: string) => {
    const activeToken = token || localStorage.getItem("star_admin_token");
    if (!activeToken) return;
    
    setIsLoadingClients(true);
    try {
      const resp = await fetch("/api/clients", {
        headers: { "x-admin-password": activeToken },
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setClients(data.clients);
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleUpdateStatus = async (clientId: string, newStatus: string) => {
    const activeToken = localStorage.getItem("star_admin_token");
    if (!activeToken) return;

    try {
      const resp = await fetch(`/api/clients/${clientId}/status`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-password": activeToken
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        // Update local state smoothly
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus as any } : c));
      } else {
        alert(data.error || "خطایی در ویرایش وضعیت رخ داد");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    if (!fullName.trim()) {
      setSubmitError("نام و نام خانوادگی الزامی است.");
      setIsSubmitting(false);
      return;
    }

    if (!mobile.trim()) {
      setSubmitError("شماره موبایل الزامی است.");
      setIsSubmitting(false);
      return;
    }

    try {
      const resp = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          mobile,
          gift: selectedGift
        })
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        setRegisteredClient(data.client);
        // Save to browser cache so if they re-visit, they see their ticket
        localStorage.setItem("star_style_ticket", JSON.stringify(data.client));
      } else {
        setSubmitError(data.error || "ثبت‌نام متاسفانه با خطا مواجه شد.");
      }
    } catch (err) {
      setSubmitError("بروز اشکال در برقراری ارتباط با سیستم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-load ticket from localStorage if exists
  useEffect(() => {
    const savedTicket = localStorage.getItem("star_style_ticket");
    if (savedTicket) {
      try {
        setRegisteredClient(JSON.parse(savedTicket));
      } catch (e) {
        // clear corrupted data
        localStorage.removeItem("star_style_ticket");
      }
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleShareWhatsApp = (client: Client) => {
    const giftTitle = GIFT_OPTIONS.find(g => g.id === client.gift)?.title || client.gift;
    const shareText = `سلاام! من در طرح لندینگ آسانسور سالن استار استایل (فرهاد) ثبت‌نام کردم و هدیه فوق‌العاده "${giftTitle}" را برنده شدم!\nکد پیگیری من: ${client.trackingCode}\nشما هم اسکن کنید و هدیه اختصاصی بگیرید!`;
    const encodedText = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
  };

  const handleSimulateSMS = (client: Client) => {
    setSmsSimulated(true);
    setTimeout(() => setSmsSimulated(false), 5000);
  };

  // KPI Calculations
  const stats = {
    total: clients.length,
    registered: clients.filter(c => c.status === "registered" || !c.status).length,
    visited: clients.filter(c => c.status === "visited").length,
    claimed: clients.filter(c => c.status === "reward-claimed").length,
  };

  // Filtering list
  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery) ||
      c.trackingCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" ? true : c.status === statusFilter;
    const matchesGift = giftFilter === "all" ? true : c.gift === giftFilter;

    return matchesSearch && matchesStatus && matchesGift;
  });

  // Export to standard CSV with UTF-8 BOM
  const exportToCSV = () => {
    // UTF-8 BOM representation
    const BOM = "\uFEFF";
    let csvContent = "نام و نام خانوادگی,شماره تماس,شماره تماس نرمالیزه,کد رهگیری,هدیه انتخابی,تاریخ ثبت نام,وضعیت\n";
    
    clients.forEach(c => {
      const giftLabel = GIFT_OPTIONS.find(g => g.id === c.gift)?.title || c.gift;
      let statusLabel = "ثبت شده";
      if (c.status === "visited") statusLabel = "مراجعه کرده";
      if (c.status === "reward-claimed") statusLabel = "هدیه تحویل داده شده";
      
      const formattedDate = formatJalali(c.createdAt, true).replace(/,/g, "-");

      csvContent += `"${c.fullName.replace(/"/g, '""')}","${c.mobile}","${c.normalizedMobile}","${c.trackingCode}","${giftLabel.replace(/"/g, '""')}","${formattedDate}","${statusLabel}"\n`;
    });

    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `StarStyle_Clients_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFormAndTicket = () => {
    setRegisteredClient(null);
    localStorage.removeItem("star_style_ticket");
    setFullName("");
    setMobile("");
    setSelectedGift("blow-dry");
  };

  const renderIcon = (name: string, size = 20, className = "") => {
    switch (name) {
      case "Wind":
        return <Wind size={size} className={className} />;
      case "Scissors":
        return <Scissors size={size} className={className} />;
      case "CreditCard":
        return <CreditCard size={size} className={className} />;
      default:
        return <Sparkles size={size} className={className} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-x-hidden antialiased">
      {/* Immersive Glowing Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-amber-600/10 rounded-full blur-[100px] sm:blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-zinc-800/15 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none z-0"></div>

      {/* Luxury Header */}
      <header className="sticky top-0 h-20 border-b border-zinc-900 flex items-center justify-between px-4 sm:px-12 backdrop-blur-md bg-black/40 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <span className="text-black font-black text-xl leading-none">S</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black bg-gradient-to-l from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              استار استایل (فرهاد)
            </h1>
            <p className="text-[10px] text-amber-500/80 tracking-widest font-bold">STAR STYLE VIP</p>
          </div>
        </div>

        <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium">
          {!isAdminMode ? (
            <button 
              onClick={() => {
                setIsAdminMode(true);
                if (localStorage.getItem("star_admin_token")) {
                  setIsAdminLoggedIn(true);
                  fetchClients();
                }
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-300 text-xs hover:border-amber-500/40 hover:text-amber-400 transition-all cursor-pointer font-bold flex items-center gap-1.5"
            >
              <Lock size={12} />
              ورود مدیریت
            </button>
          ) : (
            <button 
              onClick={() => {
                setIsAdminMode(false);
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs hover:bg-amber-500/20 transition-all cursor-pointer font-bold flex items-center gap-1.5"
            >
              صفحه اصلی بلیت
            </button>
          )}
        </nav>
      </header>

      {/* Main Content View with Animation Transitions */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10 z-10 flex flex-col justify-center">
        
        {/* VIEW 1: ADMIN MODE */}
        {isAdminMode ? (
          <div className="w-full">
            {!isAdminLoggedIn ? (
              // Admin Login Screen
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto my-12 bg-zinc-900/60 p-6 sm:p-8 rounded-3xl border border-zinc-800/80 backdrop-blur-md"
              >
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-500">
                    <Lock size={20} />
                  </div>
                  <h3 className="text-xl font-bold">ورود به پنل مدیریت</h3>
                  <p className="text-xs text-zinc-400 mt-1">جهت مشاهده و مدیریت مراجعین و تغییر وضعیت جوایز مراجع وارد شوید.</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 mr-1 font-bold">رمز عبور عبور مدیریت</label>
                    <input 
                      type="password" 
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500/80 outline-none transition-all placeholder:text-zinc-700 text-center tracking-widest font-mono"
                      required
                    />
                  </div>

                  {loginError && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg text-center font-bold">
                      {loginError}
                    </p>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>تایید و ورود</span>
                  </button>
                </form>
              </motion.div>
            ) : (
              // Admin Dashboard Screen
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Admin Navbar Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900/50 p-4 sm:p-6 rounded-3xl border border-zinc-800/60 backdrop-blur-sm gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <h2 className="text-xl font-extrabold text-zinc-100">پنل مدیریت سالن استار استایل</h2>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">کنترل جوایز، مراجعین ثبت‌شده آسانسور و وضعیت اعتبارات دیجیتال</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                    <button 
                      onClick={() => fetchClients()}
                      disabled={isLoadingClients}
                      className="px-3 py-2 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-zinc-700/50 flex-1 sm:flex-initial justify-center"
                    >
                      <RefreshCw size={14} className={isLoadingClients ? "animate-spin" : ""} />
                      به‌روزرسانی
                    </button>
                    
                    <button 
                      onClick={exportToCSV}
                      disabled={clients.length === 0}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial justify-center shadow-lg shadow-amber-500/10"
                    >
                      <Download size={14} />
                      خروجی اکسل (CSV)
                    </button>

                    <button 
                      onClick={handleAdminLogout}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial justify-center"
                    >
                      <LogOut size={14} />
                      خروج
                    </button>
                  </div>
                </div>

                {/* KPI Statistics Dashboard Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-zinc-900/30 p-4 sm:p-5 rounded-3xl border border-zinc-800/60 backdrop-blur-sm flex flex-col justify-between">
                    <span className="text-xs text-zinc-500 font-bold">کل مراجعین ثبت‌نامی</span>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono">{toPersianDigits(stats.total)}</span>
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full font-bold">نفر</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 p-4 sm:p-5 rounded-3xl border border-zinc-800/60 backdrop-blur-sm flex flex-col justify-between">
                    <span className="text-xs text-zinc-500 font-bold">وضعیت جدید (ثبت‌شده)</span>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">{toPersianDigits(stats.registered)}</span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full font-bold">در انتظار</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 p-4 sm:p-5 rounded-3xl border border-zinc-800/60 backdrop-blur-sm flex flex-col justify-between">
                    <span className="text-xs text-zinc-500 font-bold">مراجعه کرده به سالن</span>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">{toPersianDigits(stats.visited)}</span>
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full font-bold">مراجعه</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 p-4 sm:p-5 rounded-3xl border border-zinc-800/60 backdrop-blur-sm flex flex-col justify-between">
                    <span className="text-xs text-zinc-500 font-bold">هدیه تحویل داده شده</span>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">{toPersianDigits(stats.claimed)}</span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">تحویل شد</span>
                    </div>
                  </div>
                </div>

                {/* Filters & Dynamic List */}
                <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/70 overflow-hidden backdrop-blur-sm">
                  
                  {/* Search and Filters Header */}
                  <div className="p-4 sm:p-6 border-b border-zinc-800/65 flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-950/20">
                    {/* Search Field */}
                    <div className="relative w-full md:w-80">
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                        <Search size={16} />
                      </span>
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="جستجو با نام، موبایل یا کد رهگیری..."
                        className="w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl pr-10 pl-4 py-2.5 text-xs focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600 font-medium"
                      />
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                      {/* Status filter */}
                      <div>
                        <select 
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2.5 text-xs focus:border-amber-500 outline-none text-zinc-300 font-bold cursor-pointer"
                        >
                          <option value="all">همه وضعیت‌ها</option>
                          <option value="registered">ثبت شده</option>
                          <option value="visited">مراجعه کرده</option>
                          <option value="reward-claimed">هدیه تحویل شده</option>
                        </select>
                      </div>

                      {/* Gift Type filter */}
                      <div>
                        <select 
                          value={giftFilter}
                          onChange={(e) => setGiftFilter(e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2.5 text-xs focus:border-amber-500 outline-none text-zinc-300 font-bold cursor-pointer"
                        >
                          <option value="all">همه هدایا</option>
                          <option value="blow-dry">استایل مو (Blow Dry)</option>
                          <option value="beard-fade">فید ریش (Beard Fade)</option>
                          <option value="credit-99k">۹۹ هزار تومان اعتبار</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Clients Table / Mobile List */}
                  {isLoadingClients ? (
                    <div className="p-16 text-center text-zinc-500">
                      <RefreshCw className="animate-spin mx-auto mb-3 text-amber-500" size={24} />
                      <p className="text-sm font-semibold">در حال بارگذاری لیست کامل مشتریان...</p>
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="p-16 text-center text-zinc-500">
                      <Search className="mx-auto mb-3 text-zinc-700" size={32} />
                      <p className="text-sm font-semibold">هیچ کاربری با فیلترهای مشخص شده یافت نشد.</p>
                    </div>
                  ) : (
                    <div>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full border-collapse text-right text-xs">
                          <thead>
                            <tr className="bg-zinc-950/45 text-zinc-500 border-b border-zinc-800 font-bold">
                              <th className="p-4 pr-6">#</th>
                              <th className="p-4">نام و نام خانوادگی</th>
                              <th className="p-4">شماره موبایل</th>
                              <th className="p-4">کد رهگیری</th>
                              <th className="p-4">هدیه انتخابی</th>
                              <th className="p-4">تاریخ ثبت نام</th>
                              <th className="p-4">وضعیت کنونی</th>
                              <th className="p-4 pl-6 text-center">عملیات تغییر وضعیت</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/40">
                            {filteredClients.map((client, idx) => {
                              const giftDetail = GIFT_OPTIONS.find(g => g.id === client.gift);
                              const currentStatus = STATUS_LABELS[client.status] || STATUS_LABELS.registered;
                              
                              return (
                                <tr key={client.id} className="hover:bg-zinc-900/25 transition-colors">
                                  <td className="p-4 pr-6 font-mono text-zinc-500">{toPersianDigits(idx + 1)}</td>
                                  <td className="p-4 font-bold text-zinc-200">{client.fullName}</td>
                                  <td className="p-4 font-mono text-zinc-300" dir="ltr">{toPersianDigits(client.mobile)}</td>
                                  <td className="p-4">
                                    <span className="font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg font-bold">
                                      {client.trackingCode}
                                    </span>
                                  </td>
                                  <td className="p-4 font-medium text-zinc-400">
                                    <div className="flex items-center gap-1.5">
                                      {giftDetail && renderIcon(giftDetail.iconName, 14, "text-amber-500")}
                                      <span>{giftDetail?.title || client.gift}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-zinc-500 font-medium">
                                    {formatJalali(client.createdAt)}
                                  </td>
                                  <td className="p-4">
                                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${currentStatus.color}`}>
                                      {currentStatus.label}
                                    </span>
                                  </td>
                                  <td className="p-4 pl-6">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button 
                                        onClick={() => handleUpdateStatus(client.id, "registered")}
                                        disabled={client.status === "registered"}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                                          client.status === "registered"
                                            ? "bg-zinc-950 text-zinc-600 border-zinc-900 cursor-not-allowed"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-blue-500/30"
                                        }`}
                                      >
                                        ثبت شده
                                      </button>
                                      
                                      <button 
                                        onClick={() => handleUpdateStatus(client.id, "visited")}
                                        disabled={client.status === "visited"}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                                          client.status === "visited"
                                            ? "bg-zinc-950 text-zinc-600 border-zinc-900 cursor-not-allowed"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-purple-400 hover:border-purple-500/30"
                                        }`}
                                      >
                                        مراجعه کرده
                                      </button>
                                      
                                      <button 
                                        onClick={() => handleUpdateStatus(client.id, "reward-claimed")}
                                        disabled={client.status === "reward-claimed"}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                                          client.status === "reward-claimed"
                                            ? "bg-zinc-950 text-zinc-600 border-zinc-900 cursor-not-allowed"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-amber-400 hover:border-amber-500/35"
                                        }`}
                                      >
                                        تحویل هدیه
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card Layout */}
                      <div className="block md:hidden divide-y divide-zinc-800/50">
                        {filteredClients.map((client, idx) => {
                          const giftDetail = GIFT_OPTIONS.find(g => g.id === client.gift);
                          const currentStatus = STATUS_LABELS[client.status] || STATUS_LABELS.registered;
                          
                          return (
                            <div key={client.id} className="p-4 space-y-3 bg-zinc-900/10 hover:bg-zinc-900/30 transition-colors">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-sm font-extrabold text-zinc-100">{client.fullName}</h4>
                                  <span className="text-[10px] text-zinc-500 font-medium">{formatJalali(client.createdAt)}</span>
                                </div>
                                <span className="font-mono text-zinc-400 text-xs font-bold" dir="ltr">
                                  {toPersianDigits(client.mobile)}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-zinc-900 py-2">
                                <span className="text-zinc-400 text-xs flex items-center gap-1.5 font-medium">
                                  {giftDetail && renderIcon(giftDetail.iconName, 13, "text-amber-500")}
                                  {giftDetail?.title || client.gift}
                                </span>
                                
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentStatus.color}`}>
                                  {currentStatus.label}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="font-mono text-amber-500 bg-amber-500/5 border border-amber-500/25 px-2.5 py-1 rounded-lg text-xs font-bold">
                                  کد: {client.trackingCode}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  <select 
                                    value={client.status || "registered"}
                                    onChange={(e) => handleUpdateStatus(client.id, e.target.value)}
                                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-[10px] font-bold text-zinc-300 focus:border-amber-500 outline-none cursor-pointer"
                                  >
                                    <option value="registered">ثبت شده</option>
                                    <option value="visited">مراجعه کرده</option>
                                    <option value="reward-claimed">تحویل شد</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* VIEW 2: CLIENT REGISTRATION & SUCCESS LOBBY */
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 z-10 w-full">
            
            {/* Right side: Introducing info text and form / or Ticket if registered */}
            <div className="w-full lg:w-1/2 space-y-6 sm:space-y-8">
              
              <AnimatePresence mode="wait">
                {!registeredClient ? (
                  // REGISTRATION FORM
                  <motion.div
                    key="registration-form"
                    initial={{ opacity: 0, x: 25 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -25 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3 sm:space-y-4 text-center lg:text-right">
                      <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                        <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-amber-400 text-[10px] sm:text-xs font-bold tracking-widest leading-none">
                          <Sparkles size={11} className="animate-pulse text-amber-550" />
                          کمپین ویژه آسانسور
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-full text-zinc-300 text-[10px] sm:text-xs font-bold">
                          <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                          <span>🏢 استارمال، طبقه ۶</span>
                        </div>
                      </div>
                      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-white italic">
                        تیپت رو استار کن استایل رویایی تو <span className="text-amber-500">انتخاب کن</span>
                      </h2>
                      <p className="text-zinc-350 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto lg:mr-0 pl-0 lg:pl-4">
                        بارکد آسانسور مجتمع تجاری استارمال را اسکن کردید؟ سالن آرایش و استایل مردانه با خدمات لوکس و مدرن در <span className="text-amber-400 font-extrabold underline decoration-amber-500/40 underline-offset-4">طبقه ششم مجتمع استارمال</span> منتظر شما است. کافی‌ست در فرم زیر ثبت‌نام کرده و بلیت VIP دیجیتال خود را بلافاصله دریافت نمایید!
                      </p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-5 bg-zinc-900/40 p-5 sm:p-8 rounded-3xl border border-zinc-850 backdrop-blur-sm shadow-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1.5 mr-1 font-bold">نام و نام خانوادگی</label>
                          <div className="relative">
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                              <User size={15} />
                            </span>
                            <input 
                              type="text" 
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="مثال: امیرحسین علیزاده" 
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-4 py-3 text-sm focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600 text-right"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-zinc-400 mb-1.5 mr-1 font-bold">شماره موبایل</label>
                          <div className="relative">
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                              <Phone size={15} />
                            </span>
                            <input 
                              type="tel" 
                              value={mobile}
                              onChange={(e) => setMobile(e.target.value)}
                              placeholder="۰۹۱۲۳۴۵۶۷۸۹" 
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-4 py-3 text-sm focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600 text-left tracking-wider font-mono"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-2 mr-1 font-bold">انتخاب هدیه خوش‌آمدگویی (یکی از موارد)</label>
                        <div className="space-y-2.5">
                          {GIFT_OPTIONS.map((option) => (
                            <label 
                              key={option.id}
                              onClick={() => setSelectedGift(option.id)}
                              className={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                selectedGift === option.id 
                                  ? "bg-amber-500/[0.04] border-amber-500 text-zinc-100 shadow-[0_0_15px_rgba(245,158,11,0.05)]" 
                                  : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                              }`}
                            >
                              <div className="mt-1 flex items-center justify-center">
                                <input 
                                  type="radio" 
                                  name="gift"
                                  checked={selectedGift === option.id}
                                  onChange={() => setSelectedGift(option.id)}
                                  className="accent-amber-500 w-4.5 h-4.5 cursor-pointer"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {renderIcon(option.iconName, 15, selectedGift === option.id ? "text-amber-500" : "text-zinc-500")}
                                  <span className={`text-xs sm:text-sm font-bold leading-none ${selectedGift === option.id ? "text-amber-400" : "text-zinc-350"}`}>
                                    {option.title}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{option.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {submitError && (
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl text-center font-bold">
                          {submitError}
                        </p>
                      )}

                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black text-sm rounded-xl shadow-[0_10px_35px_rgba(245,158,11,0.2)] hover:shadow-[0_10px_45px_rgba(245,158,11,0.4)] transition-all active:scale-[0.98] cursor-pointer"
                      >
                        {isSubmitting ? "در حال ثبت اطلاعات گرانبهای شما..." : "دریافت بلیت دیجیتال VIP"}
                      </button>

                      <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                        با کلیک بر روی ثبت، هدیه گرانبهای انتخابی در سرور ثبت‌شده و به صورت مادام‌العمر منوط به مراجعه قابل دریافت است. فقط یک هدیه به ازای هر شماره تماس منحصربه‌فرد.
                      </p>

                      {/* Floor Location Badge Helper for Mobile */}
                      <div className="mt-4 pt-4 border-t border-zinc-900/80 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                          <Award size={16} />
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-zinc-300">📍 مجتمع تجاری استارمال، طبقه ۶</p>
                          <p className="text-[10px] text-zinc-500">لاین اختصاصی VIP فرهاد (با آسانسور مرکزی مجتمع)</p>
                        </div>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  // VIP RECEPTION / REGISTRATION SUCCESS SCREEN
                  <motion.div
                    key="success-ticket"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="text-center lg:text-right space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto lg:mr-0 text-emerald-400">
                        <CheckCircle size={24} />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black text-white italic">تبریک، بلیت اختصاصی صادر شد!</h3>
                      <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-md mx-auto lg:mr-0">
                        اطلاعات شما با موفقیت ثبت شد و বلیت دیجیتال شما اختصاص داده شد. تصویر این بلیت را ذخیره داشته باشید یا از دکمه‌های شبیه‌سازی برای کپی استفاده کنید.
                      </p>
                    </div>

                    {/* Simulation Utility Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <button 
                        onClick={() => handleShareWhatsApp(registeredClient)}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs text-zinc-300 font-bold cursor-pointer"
                      >
                        <Share2 size={14} className="text-emerald-500" />
                        اشتراک‌گذاری در واتساپ
                      </button>

                      <button 
                        onClick={() => handleSimulateSMS(registeredClient)}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-805 bg-zinc-900/50 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-xs text-zinc-300 font-bold cursor-pointer"
                      >
                        <Sparkles size={14} className="text-amber-500" />
                        شبیه‌سازی پیامک تاییدیه
                      </button>
                    </div>

                    {smsSimulated && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs leading-relaxed"
                      >
                        <p className="font-extrabold text-amber-400 mb-1 flex items-center gap-2">
                          <CheckCircle size={12} />
                          پیامک تایید به شماره {registeredClient.mobile} شبیه‌سازی شد:
                        </p>
                        <p className="text-zinc-400 font-mono">
                          "ثبت‌نام شما با موفقیت انجام شد. کد رهگیری شما: {registeredClient.trackingCode}"
                        </p>
                      </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={() => copyToClipboard(registeredClient.trackingCode)}
                        className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Copy size={13} />
                        {copiedCode ? "کد رهگیری کپی شد!" : "کپی کد رهگیری بلیت"}
                      </button>

                      <button 
                        onClick={resetFormAndTicket}
                        className="py-3 px-4 border border-zinc-800 bg-zinc-950/40 hover:text-amber-400 hover:border-amber-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        ثبت‌نام مجدد (شماره دیگر)
                      </button>
                    </div>

                    {/* Detailed Floor Guide Panel for Mobile */}
                    <div className="bg-gradient-to-l from-zinc-900 via-zinc-900/80 to-zinc-950 p-4 rounded-2xl border border-zinc-850 space-y-2 text-right">
                      <span className="text-[10px] text-amber-500 font-extrabold flex items-center justify-start gap-1.5 uppercase">
                        📍 راهنمای دقیق دسترسی آسانسور سالن
                      </span>
                      <p className="text-xs text-zinc-200 leading-relaxed font-bold">
                        لاین طلایی، طبقه ششم (۶) مجتمع تجاری استارمال
                      </p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        دسترسی بی‌دردسر: کافیست سوار آسانسور شیشه‌ای مجتمع تجاری استارمال شده و شاسی <span className="text-zinc-300">طبقه ۶</span> را بفشارید. پس از خارج شدن، سالن استار استایل (فرهاد) فوراً در انتهای لاین طلایی سمت راست شما نمایان است.
                      </p>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Left side: Premium Digital VIP Pass Ticket representation */}
            <div className="w-full lg:w-1/2 flex justify-center items-center py-4">
              
              <div className="w-full max-w-[380px] bg-zinc-900 rounded-[2.5rem] border-2 border-amber-500/30 overflow-hidden shadow-2xl relative transition-transform hover:scale-[1.02] duration-300">
                
                {/* Gold Ticket Header */}
                <div className="bg-gradient-to-l from-amber-600 to-amber-500 p-6 text-black flex justify-between items-center relative">
                  <div>
                    <div className="font-black italic text-xl tracking-tight leading-none">VIP PASS</div>
                    <span className="text-[9px] font-extrabold tracking-widest opacity-80 uppercase">STAR STYLE GENTS</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-black/15 flex items-center justify-center border border-black/10">
                    <Scissors size={15} className="text-zinc-950" />
                  </div>
                </div>

                {/* Ticket Body details */}
                <div className="p-8 space-y-6 relative bg-zinc-950/50">
                  
                  {/* Digital punch holes on sides representing custom high quality layouts */}
                  <div className="absolute -left-4.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-950 rounded-full border-r-2 border-amber-500/30 z-10"></div>
                  <div className="absolute -right-4.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-950 rounded-full border-l-2 border-amber-500/30 z-10"></div>

                  {/* Top info row */}
                  <div className="flex justify-between border-b border-zinc-900 pb-4.5 gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="block text-[10px] text-zinc-500 font-bold">نام مشتری (VIP)</span>
                      <span className="block text-sm font-black text-zinc-200 truncate">
                        {registeredClient?.fullName || "مهمان استار استایل"}
                      </span>
                    </div>

                    <div className="space-y-1 text-left">
                      <span className="block text-[10px] text-zinc-500 font-bold">کدرهگیری اختصاصی</span>
                      <span className="block text-sm font-mono font-bold text-amber-500 tracking-wider">
                        {registeredClient?.trackingCode || "ST-XXXX"}
                      </span>
                    </div>
                  </div>

                  {/* Bottom info row */}
                  <div className="flex justify-between border-b border-zinc-900 pb-4.5 gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="block text-[10px] text-zinc-500 font-bold">هدیه خوش‌آمدگویی</span>
                      <span className="block text-xs sm:text-sm font-bold text-zinc-350 truncate">
                        {registeredClient 
                          ? (GIFT_OPTIONS.find(g => g.id === registeredClient.gift)?.title || registeredClient.gift)
                          : (GIFT_OPTIONS.find(g => g.id === selectedGift)?.title || "سشوار و استایل لوکس")}
                      </span>
                    </div>

                    <div className="space-y-1 text-left">
                      <span className="block text-[10px] text-zinc-500 font-bold">مهلت اعتبار</span>
                      <span className="block text-xs font-bold text-zinc-200">
                        {registeredClient 
                          ? formatJalali(new Date(new Date(registeredClient.createdAt).getTime() + 60 * 24 * 60 * 60 * 1000), false) // Valid for 60 days
                          : "۶۰ روز پس از ثبت"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Aesthetic Simulated Barcode for scanning */}
                  <div className="pt-3 flex flex-col items-center gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-zinc-800 flex flex-col items-center">
                      <div className="flex gap-[2px] bg-white pb-1.5">
                        <div className="w-1.5 h-12 bg-black"></div>
                        <div className="w-0.5 h-12 bg-black"></div>
                        <div className="w-2.5 h-12 bg-black"></div>
                        <div className="w-1 h-12 bg-black"></div>
                        <div className="w-0.5 h-12 bg-black"></div>
                        <div className="w-3.5 h-12 bg-black"></div>
                        <div className="w-1.5 h-12 bg-black"></div>
                        <div className="w-0.5 h-12 bg-black"></div>
                        <div className="w-2 h-12 bg-black"></div>
                        <div className="w-1.5 h-12 bg-black"></div>
                        <div className="w-0.5 h-12 bg-black"></div>
                        <div className="w-3 h-12 bg-black"></div>
                        <div className="w-1 h-12 bg-black"></div>
                        <div className="w-0.5 h-12 bg-black"></div>
                        <div className="w-2 h-12 bg-black"></div>
                        <div className="w-1.5 h-12 bg-black"></div>
                        <div className="w-0.5 h-12 bg-black"></div>
                        <div className="w-3 h-12 bg-black"></div>
                      </div>
                      
                      <span className="text-[10px] font-mono tracking-[0.5em] text-zinc-800 font-bold select-none leading-none">
                        {registeredClient 
                          ? `ST${registeredClient.id.slice(-6)}` 
                          : "ST840294"
                        }
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-zinc-450 font-bold text-center leading-normal">
                      📍 آدرس: مجتمع تجاری استارمال، طبقه ششم (لاین VIP فرهاد)<br />
                      آرایشگاه استار استایل (فرهاد) - ویژه مراجعین آسانسور
                    </p>
                  </div>

                </div>

                <div className="bg-zinc-900 text-center py-4 border-t border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 font-bold flex items-center justify-center gap-1">
                    <Award size={12} className="text-amber-500" />
                    ارائه بلیت به آرایشگر هنگام مراجعه جهت تحویل
                  </span>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Elegant Footer conforming to instructions */}
      <footer className="mt-auto border-t border-zinc-900 bg-black/40 py-6 px-4 sm:px-12 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4 z-10 font-medium">
        <p dir="ltr">© {toPersianDigits(1405)} Star Style Gents. All rights reserved.</p>
        <p className="text-zinc-650">طراحی و توسعه لوکس ویژه کمپین مراجعین آسانسور استار استایل (فرهاد)</p>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            پشتیبانی فعال
          </span>
          <span>نسخه {toPersianDigits("2.1.0")}</span>
        </div>
      </footer>
    </div>
  );
}
