
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

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
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('10');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isConfiguring, setIsConfiguring] = useState<boolean>(!apiUrl);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [currentEval, setCurrentEval] = useState<Partial<EvaluationData>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Kiểm tra trạng thái AI - Chế độ "Mềm" (Không chặn tính năng)
  const isAiReady = useMemo(() => {
    try {
      const key = process.env.API_KEY;
      return !!key && key.length > 10;
    } catch {
      return false;
    }
  }, []);

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
        if (!silent) showNotify('Đồng bộ dữ liệu thành công!', 'success');
      } else {
        throw new Error("Dữ liệu không đúng định dạng");
      }
    } catch (error) {
      if (!silent) showNotify('Lỗi kết nối Sheet. Thầy kiểm tra lại link nhé!', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiUrl) fetchStudents(apiUrl, true);
  }, [apiUrl, fetchStudents]);

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
    if (!cleanUrl.includes('script.google.com')) {
      showNotify('Link App Script không hợp lệ!', 'error');
      return;
    }
    localStorage.setItem('teacher_app_api_url', cleanUrl);
    setApiUrl(cleanUrl);
    setIsConfiguring(false);
    fetchStudents(cleanUrl);
  };

  const openEvaluation = (student: Student, type: 'Trước Buổi' | 'Sau Buổi') => {
    setCurrentEval({ 
      tenHS: student.tenHS, 
      lop: student.lop, 
      loai: type, 
      diem: '', 
      noiDung: '' 
    });
    setModalOpen(true);
  };

  const generateAiFeedback = async () => {
    if (!currentEval.tenHS) return;
    
    setIsAiLoading(true);
    try {
      // Dùng trực tiếp key, không check isAiReady nữa để xem nó có thực sự mất không
      const apiKey = process.env.API_KEY;
      
      if (!apiKey) {
        showNotify('Lỗi: Hệ thống vẫn chưa nạp được mã API từ Vercel. Thầy hãy thử lại sau!', 'error');
        setIsAiLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      const prompt = `Bạn là trợ lý cho thầy Thịnh. Viết 1 câu nhận xét ngắn dưới 10 chữ cho HS "${currentEval.tenHS}" vừa có kết quả "${currentEval.diem || 'tích cực'}". Giọng văn khích lệ, chuyên nghiệp.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = response.text?.trim() || 'Em đã hoàn thành tốt nhiệm vụ.';
      setCurrentEval(prev => ({ ...prev, noiDung: text }));
      showNotify('AI đã soạn xong nhận xét!', 'success');
    } catch (error: any) {
      console.error("AI Error:", error);
      showNotify('AI báo lỗi: Có thể mã API chưa được kích hoạt đúng.', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const submitEvaluation = async () => {
    if (!apiUrl) return;
    setSubmitting(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(currentEval)
      });
      showNotify('Đã lưu vào Sổ tay thành công!', 'success');
      setTimeout(() => setModalOpen(false), 800);
    } catch (error) {
      showNotify('Lỗi khi lưu dữ liệu. Thầy kiểm tra mạng nhé!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 space-y-6 text-center border border-slate-100">
          <div className="text-6xl mb-4">💎</div>
          <h1 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">{APP_NAME}</h1>
          <input 
            type="text" 
            placeholder="Dán link App Script của thầy..." 
            value={tempApiUrl}
            onChange={(e) => setTempApiUrl(e.target.value)}
            className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 text-xs font-mono"
          />
          <button onClick={saveConfig} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest text-sm">
            KẾT NỐI NGAY 🚀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 font-sans">
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-10 py-6 rounded-2xl shadow-2xl border-b-4 bg-white transform transition-all animate-in slide-in-from-top-12 duration-500 ${
          notification.type === 'success' ? 'border-blue-500 text-blue-900' : 'border-rose-500 text-rose-900'
        }`}>
          <div className="flex items-center gap-4 font-black text-xs uppercase">
            <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40 px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent italic uppercase tracking-tighter leading-none">
            {APP_NAME}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isAiReady ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isAiReady ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isAiReady ? 'AI ĐÃ SẴN SÀNG' : 'AI ĐANG CHỜ MÃ'}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fetchStudents(apiUrl)} className="w-12 h-12 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all active:scale-90 border border-blue-100">
            <span className="text-lg">🔄</span>
          </button>
          <button onClick={() => setIsConfiguring(true)} className="w-12 h-12 flex items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
            <span className="text-lg">⚙️</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 mt-12">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-12 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex bg-slate-100 p-2 rounded-2xl w-full md:w-auto">
              {['10', '11', '12'].map(grade => (
                <button 
                  key={grade} 
                  onClick={() => { setSelectedGrade(grade); setSelectedClass(''); }} 
                  className={`flex-1 md:flex-none px-10 py-4 rounded-xl font-black text-xs transition-all uppercase ${selectedGrade === grade ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  KHỐI {grade}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-72">
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)} 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 font-black text-xs uppercase outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
              >
                <option value="">-- CHỌN LỚP --</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
            </div>
        </div>

        <div className="space-y-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               <div className="text-slate-300 font-black text-[10px] uppercase tracking-widest">Đang tải dữ liệu...</div>
            </div>
          ) : selectedClass ? (
            Object.keys(groupedStudents).sort().map(group => (
              <div key={group} className="animate-in fade-in slide-in-from-bottom-10 duration-700">
                <div className="flex items-center gap-6 mb-8 px-4">
                  <span className="font-black text-xs text-slate-800 uppercase tracking-widest italic">NHÓM {group}</span>
                  <div className="h-[2px] flex-1 bg-slate-50"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {groupedStudents[group].map((s, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-blue-500 hover:shadow-xl transition-all duration-500">
                      <div className="mb-10">
                        <p className="font-black text-slate-900 text-2xl uppercase tracking-tighter group-hover:text-blue-600 transition-colors leading-none mb-3">{s.tenHS}</p>
                        <span className="text-[9px] font-black text-slate-300 uppercase bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">HS LỚP {s.lop}</span>
                      </div>
                      <div className="flex gap-3 w-full">
                        <button onClick={() => openEvaluation(s, 'Trước Buổi')} className="flex-1 h-14 flex items-center justify-center bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest active:scale-95">Trước</button>
                        <button onClick={() => openEvaluation(s, 'Sau Buổi')} className="flex-1 h-14 flex items-center justify-center bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest active:scale-95">Sau</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-52 opacity-10">
               <div className="text-[12rem] leading-none mb-10">📂</div>
               <p className="font-black text-2xl italic uppercase tracking-[0.4em] text-slate-400">Chọn lớp để ghi sổ thầy nhé!</p>
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative border border-slate-100 overflow-hidden">
             <div className={`absolute top-0 left-0 right-0 h-2 ${currentEval.loai === 'Trước Buổi' ? 'bg-blue-600' : 'bg-emerald-600'}`}></div>
             <button onClick={() => setModalOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-500 text-4xl font-light">×</button>
            
            <div className="mb-8">
                <span className={`px-8 py-3 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg ${currentEval.loai === 'Trước Buổi' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{currentEval.loai}</span>
                <h2 className="text-4xl font-black text-slate-900 uppercase mt-8 italic tracking-tighter leading-none">{currentEval.tenHS}</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Xếp loại / Điểm số</label>
                 <input 
                  type="text" 
                  placeholder="Ví dụ: Tốt, 10, Khá..." 
                  className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] focus:border-blue-600 outline-none font-black text-blue-700 text-3xl uppercase transition-all shadow-inner" 
                  value={currentEval.diem} 
                  onChange={(e) => setCurrentEval({...currentEval, diem: e.target.value})} 
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lời nhận xét</span>
                  <button 
                    onClick={generateAiFeedback} 
                    disabled={isAiLoading} 
                    className={`text-[10px] font-black px-6 py-3 rounded-full flex items-center gap-3 transition-all ${isAiLoading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95'}`}
                  >
                    {isAiLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : '✨ AI SOẠN NHANH'}
                  </button>
                </div>
                <textarea 
                  rows={3} 
                  placeholder="Thầy Thịnh muốn nhắn gì cho em học sinh không?" 
                  className="w-full px-10 py-8 bg-slate-50 border-2 border-slate-50 rounded-[2.2rem] focus:border-blue-600 outline-none text-base font-bold leading-relaxed resize-none shadow-inner transition-all placeholder:text-slate-200" 
                  value={currentEval.noiDung} 
                  onChange={(e) => setCurrentEval({...currentEval, noiDung: e.target.value})} 
                />
              </div>

              <button 
                onClick={submitEvaluation} 
                disabled={submitting} 
                className="w-full py-7 bg-slate-950 text-white rounded-[2rem] font-black shadow-2xl hover:bg-black active:scale-[0.98] transition-all uppercase tracking-[0.4em] mt-4 text-sm"
              >
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
