
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

  // KIỂM TRA MÃ AI: Đèn xanh là OK, Đèn đỏ là cần Redeploy
  const apiKeyStatus = useMemo(() => {
    try {
      return !!process.env.API_KEY;
    } catch {
      return false;
    }
  }, []);

  const showNotify = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 8000);
  };

  const fetchStudents = useCallback(async (url: string, silent = false) => {
    if (!url) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${url}?action=getStudents&t=${Date.now()}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setStudents(data);
        if (!silent) showNotify('Đã cập nhật danh sách học sinh!', 'success');
      }
    } catch (error) {
      if (!silent) showNotify('Không thể kết nối Sheet. Thầy kiểm tra lại link App Script nhé!', 'error');
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
    if (!tempApiUrl.includes('script.google.com')) {
      showNotify('Link App Script không hợp lệ thầy ơi!', 'error');
      return;
    }
    localStorage.setItem('teacher_app_api_url', tempApiUrl.trim());
    setApiUrl(tempApiUrl.trim());
    setIsConfiguring(false);
    fetchStudents(tempApiUrl.trim());
  };

  const openEvaluation = (student: Student, type: 'Trước Buổi' | 'Sau Buổi') => {
    setCurrentEval({ tenHS: student.tenHS, lop: student.lop, loai: type, diem: '', noiDung: '' });
    setModalOpen(true);
  };

  const generateAiFeedback = async () => {
    if (!currentEval.tenHS) return;
    
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      showNotify('CHƯA CÓ MÃ AI: Thầy hãy Lưu code này vào GitHub để Vercel tự động tạo bản mới nhất nhé!', 'error');
      return;
    }

    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const prompt = `Viết 1 câu nhận xét ngắn dưới 8 chữ cho học sinh "${currentEval.tenHS}" đạt điểm "${currentEval.diem || 'khá'}". Ngôn ngữ GV khích lệ.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = response.text?.trim() || 'Học sinh rất cố gắng.';
      setCurrentEval(prev => ({ ...prev, noiDung: text }));
      showNotify('AI đã soạn xong!', 'success');
    } catch (error: any) {
      console.error("AI Error:", error);
      showNotify('Lỗi mã AI. Thầy hãy kiểm tra mã trên AI Studio hoặc đợi 1 phút thử lại.', 'error');
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
      showNotify('Lưu thành công vào Sổ tay!', 'success');
      setTimeout(() => setModalOpen(false), 800);
    } catch (error) {
      showNotify('Lỗi khi lưu dữ liệu vào Google Sheet.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 space-y-6 text-center animate-in zoom-in-95 duration-500">
          <div className="text-6xl mb-2">📚</div>
          <h1 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">{APP_NAME}</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Cài đặt kết nối dữ liệu</p>
          <input 
            type="text" 
            placeholder="Dán link App Script của thầy vào đây..." 
            value={tempApiUrl}
            onChange={(e) => setTempApiUrl(e.target.value)}
            className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 text-xs font-mono transition-all"
          />
          <button onClick={saveConfig} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all uppercase tracking-widest text-sm">
            BẮT ĐẦU NGAY 🚀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans selection:bg-blue-100">
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 rounded-2xl shadow-2xl border-b-4 bg-white transform transition-all animate-in slide-in-from-top-12 duration-500 max-w-[90vw] ${
          notification.type === 'success' ? 'border-blue-500 text-blue-800' : 'border-rose-500 text-rose-800'
        }`}>
          <div className="flex items-center gap-4 font-black text-[11px] uppercase tracking-tight leading-relaxed">
            <span className="text-xl">{notification.type === 'success' ? '✅' : '❌'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40 px-8 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic uppercase tracking-tighter leading-none">
            {APP_NAME}
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`w-2 h-2 rounded-full ${apiKeyStatus ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${apiKeyStatus ? 'text-emerald-600' : 'text-rose-600'}`}>
              {apiKeyStatus ? 'AI: ĐÃ KẾT NỐI' : 'AI: CHƯA CÓ MÃ'}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fetchStudents(apiUrl)} className="p-3.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all active:scale-90 shadow-sm border border-blue-100">
            <span className="text-lg">🔄</span>
          </button>
          <button onClick={() => setIsConfiguring(true)} className="p-3.5 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all active:scale-90">
            <span className="text-lg">⚙️</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-10">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              {['10', '11', '12'].map(grade => (
                <button 
                  key={grade} 
                  onClick={() => { setSelectedGrade(grade); setSelectedClass(''); }} 
                  className={`px-8 py-3 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest ${selectedGrade === grade ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  KHỐI {grade}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64">
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)} 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-xs uppercase outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">-- CHỌN LỚP CỦA THẦY --</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-[10px]">▼</div>
            </div>
        </div>

        <div className="space-y-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6 animate-pulse">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               <div className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">Đang đồng bộ dữ liệu...</div>
            </div>
          ) : selectedClass ? (
            Object.keys(groupedStudents).sort().map(group => (
              <div key={group} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-4 mb-6 px-2">
                  <span className="font-black text-[11px] text-blue-600 uppercase tracking-[0.2em] whitespace-nowrap">NHÓM {group}</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-100 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {groupedStudents[group].map((s, i) => (
                    <div key={i} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300">
                      <div className="mb-8">
                        <p className="font-black text-slate-900 text-xl uppercase tracking-tight group-hover:text-blue-600 transition-colors leading-tight">{s.tenHS}</p>
                        <div className="flex gap-2 mt-1.5">
                           <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">HS-{i+10}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full">
                        <button onClick={() => openEvaluation(s, 'Trước Buổi')} className="flex-1 h-14 flex items-center justify-center bg-blue-50 text-blue-600 rounded-[1.2rem] hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95">Trước</button>
                        <button onClick={() => openEvaluation(s, 'Sau Buổi')} className="flex-1 h-14 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-[1.2rem] hover:bg-emerald-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95">Sau</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-40 opacity-20">
               <div className="text-9xl mb-8">📔</div>
               <p className="font-black text-xl italic uppercase tracking-widest text-slate-400">Thầy hãy chọn khối và lớp nhé</p>
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-400 relative border border-slate-100">
             <button onClick={() => setModalOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-500 text-4xl font-light">×</button>
            
            <div className="mb-10">
                <span className={`px-6 py-2.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg ${currentEval.loai === 'Trước Buổi' ? 'bg-blue-600 shadow-blue-100' : 'bg-emerald-600 shadow-emerald-100'}`}>{currentEval.loai}</span>
                <h2 className="text-3xl font-black text-slate-900 uppercase mt-6 italic tracking-tighter leading-none">{currentEval.tenHS}</h2>
                <p className="text-[10px] font-bold text-slate-300 mt-2 uppercase tracking-[0.3em]">Nhật ký học tập thông minh</p>
            </div>

            <div className="space-y-7">
              <div className="space-y-2.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-[0.2em]">Xếp loại / Điểm</label>
                 <input 
                  type="text" 
                  placeholder="Ví dụ: Tốt, 10, Khá..." 
                  className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[2rem] focus:border-blue-500 outline-none font-black text-blue-600 text-2xl uppercase transition-all shadow-inner" 
                  value={currentEval.diem} 
                  onChange={(e) => setCurrentEval({...currentEval, diem: e.target.value})} 
                />
              </div>

              <div className="space-y-3.5">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lời nhận xét</span>
                  <button 
                    onClick={generateAiFeedback} 
                    disabled={isAiLoading} 
                    className={`text-[9px] font-black px-6 py-3 rounded-full flex items-center gap-2.5 transition-all shadow-sm ${isAiLoading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white active:scale-95 border border-indigo-100'}`}
                  >
                    {isAiLoading ? <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span> : '✨'} AI SOẠN NHANH
                  </button>
                </div>
                <textarea 
                  rows={4} 
                  placeholder="Thầy muốn nhắn gì cho học sinh không?" 
                  className="w-full px-8 py-7 bg-slate-50 border-2 border-slate-50 rounded-[2.2rem] focus:border-blue-500 outline-none text-sm font-semibold leading-relaxed resize-none shadow-inner transition-all placeholder:text-slate-300" 
                  value={currentEval.noiDung} 
                  onChange={(e) => setCurrentEval({...currentEval, noiDung: e.target.value})} 
                />
              </div>

              <button 
                onClick={submitEvaluation} 
                disabled={submitting} 
                className="w-full py-7 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-black active:scale-[0.98] transition-all uppercase tracking-[0.4em] mt-3 flex justify-center items-center gap-4"
              >
                {submitting ? (
                  <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> ĐANG LƯU...</>
                ) : 'HOÀN TẤT GHI SỔ 🚀'}
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
