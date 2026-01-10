import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

const APP_NAME = "SỔ TAY THẦY THỊNH";

interface Student {
  khoi: string;
  lop: string;
  nhom: string;
  tenHS: string;
}

interface EvaluationData {
  lop: string;
  tenHS: string;
  loai: 'Trước Buổi' | 'Sau Buổi';
  noiDung: string;
  diem: string;
}

const App = () => {
  const [apiUrl, setApiUrl] = useState<string>(localStorage.getItem('teacher_app_api_url') || '');
  const [tempApiUrl, setTempApiUrl] = useState<string>(apiUrl);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(localStorage.getItem('teacher_app_gemini_key') || '');
  const [tempGeminiKey, setTempGeminiKey] = useState<string>(geminiApiKey);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('10');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isConfiguring, setIsConfiguring] = useState<boolean>(!apiUrl || !geminiApiKey);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [currentEval, setCurrentEval] = useState<Partial<EvaluationData>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [lastAiCallTime, setLastAiCallTime] = useState<number>(0);

  const isAiReady = useMemo(() => {
    return geminiApiKey.length > 20; // API key Google thường dài hơn 20 ký tự
  }, [geminiApiKey]);

  const showNotify = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchStudents = useCallback(async (url: string, silent = false) => {
    if (!url) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${url}?action=getStudents&t=${Date.now()}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setStudents(data);
        if (!silent) showNotify('Cập nhật danh sách thành công!', 'success');
      }
    } catch (error) {
      if (!silent) showNotify('Lỗi kết nối App Script!', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiUrl && !isConfiguring) fetchStudents(apiUrl, true);
  }, [apiUrl, isConfiguring, fetchStudents]);

  const classes = useMemo(() => {
    const filtered = students.filter(s => s.khoi === selectedGrade);
    return Array.from(new Set(filtered.map(s => s.lop))).sort();
  }, [students, selectedGrade]);

  const groupedStudents = useMemo(() => {
    const filtered = students.filter(s => s.khoi === selectedGrade && s.lop === selectedClass);
    const groups: Record<string, Student[]> = {};
    filtered.forEach(s => {
      const groupName = s.nhom || "Khác";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(s);
    });
    return groups;
  }, [students, selectedGrade, selectedClass]);

  const saveConfig = () => {
    const cleanUrl = tempApiUrl.trim();
    const cleanKey = tempGeminiKey.trim();
    
    if (!cleanUrl.includes('script.google.com')) {
      showNotify('Link App Script không hợp lệ!', 'error');
      return;
    }
    
    if (!cleanKey || cleanKey.length < 20) {
      showNotify('API Key không hợp lệ! Cần ít nhất 20 ký tự.', 'error');
      return;
    }
    
    localStorage.setItem('teacher_app_api_url', cleanUrl);
    localStorage.setItem('teacher_app_gemini_key', cleanKey);
    setApiUrl(cleanUrl);
    setGeminiApiKey(cleanKey);
    setIsConfiguring(false);
    fetchStudents(cleanUrl);
    showNotify('Cấu hình đã lưu thành công!', 'success');
  };

  const openEvaluation = (student: Student, type: 'Trước Buổi' | 'Sau Buổi') => {
    setCurrentEval({ tenHS: student.tenHS, lop: student.lop, loai: type, diem: '', noiDung: '' });
    setModalOpen(true);
  };

  const generateAiFeedback = async () => {
    if (!currentEval.tenHS) return;
    
    if (!isAiReady) {
      showNotify('Chưa có API Key! Vui lòng cấu hình lại.', 'error');
      return;
    }

    // Kiểm tra rate limit: tối thiểu 4 giây giữa các lần gọi (tránh vượt 15 requests/phút)
    const now = Date.now();
    const timeSinceLastCall = now - lastAiCallTime;
    if (timeSinceLastCall < 4000) {
      const waitTime = Math.ceil((4000 - timeSinceLastCall) / 1000);
      showNotify(`Vui lòng đợi ${waitTime} giây nữa để tránh quá tải!`, 'error');
      return;
    }

    setIsAiLoading(true);
    setLastAiCallTime(now);
    
    try {
      const prompt = `Bạn là trợ lý của thầy Thịnh. Viết 1 câu nhận xét học tập cực ngắn (dưới 15 chữ) cho học sinh "${currentEval.tenHS}" vừa được chấm điểm/xếp loại là "${currentEval.diem || 'Tốt'}". Ngôn ngữ gần gũi, khích lệ, tích cực.`;

      // Thử các models theo thứ tự
      const models = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      let response;
      let lastError;
      
      for (const model of models) {
        try {
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }]
            })
          });

          if (response.ok) {
            break; // Thành công, thoát loop
          }
          
          const errorData = await response.json();
          lastError = errorData;
          console.log(`Model ${model} failed:`, errorData);
        } catch (err) {
          console.log(`Model ${model} error:`, err);
          lastError = err;
        }
      }

      if (!response || !response.ok) {
        throw new Error(JSON.stringify(lastError));
      }

      const data = await response.json();
      
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Em làm tốt lắm, cố gắng nhé!';
      setCurrentEval(prev => ({ ...prev, noiDung: resultText }));
      showNotify('AI đã soạn xong!', 'success');
    } catch (error: any) {
      console.error("AI Error:", error);
      
      // Log chi tiết để debug
      const errorMsg = error.message || JSON.stringify(error);
      console.log("Error details:", errorMsg);
      
      if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API key not valid") || errorMsg.includes("invalid")) {
        showNotify('API Key không hợp lệ! Vui lòng tạo key mới.', 'error');
      } else if (errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        showNotify('Vượt giới hạn 15 lần/phút. Đợi 1-2 phút hoặc dùng key khác!', 'error');
      } else if (errorMsg.includes("403") || errorMsg.includes("permission")) {
        showNotify('Key chưa được kích hoạt. Thử tạo key mới!', 'error');
      } else if (errorMsg.includes("400")) {
        showNotify('Lỗi request. Kiểm tra lại model name hoặc key!', 'error');
      } else {
        showNotify(`Lỗi: ${errorMsg.substring(0, 50)}...`, 'error');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const submitEvaluation = async () => {
    if (!apiUrl) return;
    setSubmitting(true);
    try {
      await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(currentEval) });
      showNotify('Lưu thành công!', 'success');
      setTimeout(() => setModalOpen(false), 800);
    } catch (error) {
      showNotify('Lỗi lưu dữ liệu!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-12 space-y-8 text-center border border-slate-100">
          <div className="text-7xl mb-2">📒</div>
          <div>
            <h1 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">{APP_NAME}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Cấu hình hệ thống</p>
          </div>
          
          <div className="space-y-6 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">1. Link Google App Script</label>
              <input 
                type="text" 
                placeholder="https://script.google.com/macros/s/..." 
                value={tempApiUrl}
                onChange={(e) => setTempApiUrl(e.target.value)}
                className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 text-xs font-mono transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">2. Google Gemini API Key</label>
              <div className="relative">
                <input 
                  type={showApiKey ? "text" : "password"}
                  placeholder="AIza..." 
                  value={tempGeminiKey}
                  onChange={(e) => setTempGeminiKey(e.target.value)}
                  className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 text-xs font-mono transition-all pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 italic px-2">
                * Lấy API Key tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">aistudio.google.com/app/apikey</a>
              </p>
              <div className={`mt-3 px-4 py-3 rounded-xl border-2 ${isAiReady ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{isAiReady ? '✅' : '⚠️'}</span>
                  <span className={`text-[10px] font-black uppercase tracking-tight ${isAiReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isAiReady ? 'API Key hợp lệ' : 'Chưa nhập API Key'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={saveConfig} 
            disabled={!tempApiUrl || !tempGeminiKey}
            className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all uppercase tracking-[0.2em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            LƯU VÀ VÀO SỔ 🚀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FBFC] pb-32 font-sans">
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 rounded-2xl shadow-2xl border-b-4 bg-white transform transition-all animate-in slide-in-from-top-12 duration-500 ${
          notification.type === 'success' ? 'border-blue-500 text-blue-900' : 'border-rose-500 text-rose-900'
        }`}>
          <div className="flex items-center gap-4 font-black text-[11px] uppercase tracking-tight">
            <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent italic uppercase tracking-tighter leading-none">
            {APP_NAME}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isAiReady ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isAiReady ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isAiReady ? 'AI ONLINE' : 'AI OFFLINE'}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fetchStudents(apiUrl)} className="w-12 h-12 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
            <span className="text-lg">🔄</span>
          </button>
          <button onClick={() => setIsConfiguring(true)} className="w-12 h-12 flex items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
            <span className="text-lg">⚙️</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 mt-12">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-12 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex bg-slate-100 p-2 rounded-2xl w-full md:w-auto overflow-x-auto">
              {['10', '11', '12'].map(grade => (
                <button key={grade} onClick={() => { setSelectedGrade(grade); setSelectedClass(''); }} className={`px-10 py-4 rounded-xl font-black text-xs transition-all uppercase whitespace-nowrap ${selectedGrade === grade ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>KHỐI {grade}</button>
              ))}
            </div>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full md:w-72 bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 font-black text-xs uppercase outline-none focus:border-blue-600 transition-all cursor-pointer">
                <option value="">-- CHỌN LỚP --</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>

        {selectedClass ? (
          Object.keys(groupedStudents).sort().map(group => (
            <div key={group} className="mb-16 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="flex items-center gap-6 mb-8 px-4">
                <span className="font-black text-[11px] text-slate-800 uppercase tracking-[0.2em] italic">NHÓM {group}</span>
                <div className="h-[1px] flex-1 bg-slate-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {groupedStudents[group].map((s, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-blue-500 hover:shadow-xl transition-all duration-300">
                    <div className="mb-10 text-center">
                      <p className="font-black text-slate-900 text-2xl uppercase tracking-tighter mb-3 leading-none group-hover:text-blue-600 transition-colors">{s.tenHS}</p>
                      <span className="text-[8px] font-black text-slate-300 uppercase bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 tracking-widest">HỌC SINH {s.lop}</span>
                    </div>
                    <div className="flex gap-3 w-full">
                      <button onClick={() => openEvaluation(s, 'Trước Buổi')} className="flex-1 h-14 flex items-center justify-center bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] uppercase active:scale-95">Trước</button>
                      <button onClick={() => openEvaluation(s, 'Sau Buổi')} className="flex-1 h-14 flex items-center justify-center bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all font-black text-[10px] uppercase active:scale-95">Sau</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-40 opacity-10 select-none grayscale">
             <div className="text-[10rem] leading-none mb-6">📂</div>
             <p className="font-black text-xl italic uppercase tracking-[0.3em] text-slate-400">Chọn lớp để bắt đầu thầy nhé!</p>
          </div>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative border border-slate-100 overflow-hidden">
             <div className={`absolute top-0 left-0 right-0 h-2 ${currentEval.loai === 'Trước Buổi' ? 'bg-blue-600' : 'bg-emerald-600'}`}></div>
             <button onClick={() => setModalOpen(false)} className="absolute top-8 right-10 text-slate-300 hover:text-slate-500 text-4xl font-light transition-colors">×</button>
            <div className="mb-8 mt-4">
                <span className={`px-8 py-3 rounded-full text-[10px] font-black text-white uppercase tracking-widest ${currentEval.loai === 'Trước Buổi' ? 'bg-blue-600 shadow-blue-100' : 'bg-emerald-600 shadow-emerald-100'}`}>{currentEval.loai}</span>
                <h2 className="text-4xl font-black text-slate-900 uppercase mt-8 italic tracking-tighter leading-none">{currentEval.tenHS}</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Xếp loại / Điểm</label>
                 <input type="text" placeholder="Tốt, 10, Khá..." className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] focus:border-blue-600 outline-none font-black text-blue-700 text-3xl uppercase transition-all shadow-inner" value={currentEval.diem} onChange={(e) => setCurrentEval({...currentEval, diem: e.target.value})} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center px-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lời nhận xét</span>
                  <button 
                    onClick={generateAiFeedback} 
                    disabled={isAiLoading || !isAiReady} 
                    className={`text-[10px] font-black px-6 py-3 rounded-full flex items-center gap-3 transition-all ${
                        isAiLoading || !isAiReady ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95'
                    }`}
                  >
                    {isAiLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : '✨ AI SOẠN NHANH'}
                  </button>
                </div>
                <textarea rows={3} placeholder="Dặn dò gì thêm không thầy?" className="w-full px-10 py-8 bg-slate-50 border-2 border-slate-100 rounded-[2.2rem] focus:border-blue-600 outline-none text-base font-bold leading-relaxed resize-none shadow-inner transition-all" value={currentEval.noiDung} onChange={(e) => setCurrentEval({...currentEval, noiDung: e.target.value})} />
              </div>
              <button onClick={submitEvaluation} disabled={submitting} className="w-full py-7 bg-slate-950 text-white rounded-[2rem] font-black shadow-2xl hover:bg-black transition-all uppercase tracking-[0.3em] mt-4 text-sm active:scale-95 disabled:opacity-50">
                {submitting ? 'ĐANG LƯU DỮ LIỆU...' : 'HOÀN TẤT GHI SỔ 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
