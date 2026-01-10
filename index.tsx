
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

  const showNotify = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchStudents = useCallback(async (url: string, silent = false) => {
    if (!url) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${url}?action=getStudents&t=${Date.now()}`);
      if (!response.ok) throw new Error("Kết nối API thất bại");
      const data = await response.json();
      if (Array.isArray(data)) {
        setStudents(data);
        if (!silent) showNotify('Đồng bộ dữ liệu thành công!', 'success');
      } else {
        throw new Error("Dữ liệu không hợp lệ");
      }
    } catch (error: any) {
      showNotify('Lỗi kết nối Sheet. Kiểm tra URL App Script.', 'error');
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
    const trimmedUrl = tempApiUrl.trim();
    if (!trimmedUrl.startsWith('https://script.google.com')) {
      showNotify('URL Web App không đúng định dạng Google Script', 'error');
      return;
    }
    localStorage.setItem('teacher_app_api_url', trimmedUrl);
    setApiUrl(trimmedUrl);
    setIsConfiguring(false);
    fetchStudents(trimmedUrl);
  };

  const openEvaluation = (student: Student, type: 'Trước Buổi' | 'Sau Buổi') => {
    setCurrentEval({ tenHS: student.tenHS, lop: student.lop, loai: type, diem: '', noiDung: '' });
    setModalOpen(true);
  };

  const generateAiFeedback = async () => {
    if (!currentEval.tenHS) return;
    
    // Kiểm tra API Key từ môi trường Vercel
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey === "undefined") {
      showNotify('Lỗi: Chưa nhận được API_KEY. Hãy Redeploy trên Vercel!', 'error');
      return;
    }

    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Bạn là một giáo viên chuyên nghiệp. Hãy viết 1 câu nhận xét ngắn (dưới 12 chữ) cho học sinh "${currentEval.tenHS}". 
      Kết quả đánh giá: "${currentEval.diem || 'ổn định'}". Thời điểm: "${currentEval.loai}". 
      Văn phong: Gần gũi, khích lệ.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const aiText = result.text?.trim().replace(/^"|"$/g, '') || '';
      setCurrentEval(prev => ({ ...prev, noiDung: aiText }));
      showNotify('AI đã soạn xong nhận xét!', 'success');
    } catch (error: any) {
      console.error("AI Error:", error);
      const msg = error.message?.toLowerCase();
      if (msg?.includes('apikey') || msg?.includes('invalid')) {
        showNotify('Lỗi: API Key không hợp lệ hoặc sai.', 'error');
      } else if (msg?.includes('safety')) {
        showNotify('Lỗi: Nội dung bị AI chặn do quy tắc an toàn.', 'error');
      } else {
        showNotify('AI đang bận hoặc quá tải. Thử lại sau 5 giây.', 'error');
      }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentEval)
      });
      showNotify('Đã lưu thành công vào Google Sheet!', 'success');
      setTimeout(() => setModalOpen(false), 1000);
    } catch (error) {
      showNotify('Lỗi khi gửi dữ liệu lên Sheet.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-500">
          <div className="text-center">
            <div className="text-5xl mb-4">🏫</div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">{APP_NAME}</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Cấu hình hệ thống quản lý</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Google Web App URL</label>
              <input 
                type="text" 
                placeholder="Dán link triển khai từ Google Sheets..." 
                value={tempApiUrl}
                onChange={(e) => setTempApiUrl(e.target.value)}
                className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-mono text-[10px]"
              />
            </div>
            <button onClick={saveConfig} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all uppercase">
              Bắt đầu kết nối 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border-b-4 transform transition-all animate-in slide-in-from-top-10 ${
          notification.type === 'success' ? 'bg-white border-blue-500 text-blue-800' : 'bg-white border-rose-500 text-rose-800'
        }`}>
          <div className="flex items-center gap-3 font-black text-xs uppercase tracking-tight">
            <span>{notification.type === 'success' ? '✅' : '❌'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/80">
        <div>
          <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic leading-tight uppercase">
            {APP_NAME}
          </h1>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.3em]">Smart Education Management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => apiUrl && fetchStudents(apiUrl)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">🔄</button>
          <button onClick={() => setIsConfiguring(true)} className="p-3 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">⚙️</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-white p-6 rounded-[2.2rem] shadow-sm border border-slate-100 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
              {['10', '11', '12'].map(grade => (
                <button key={grade} onClick={() => { setSelectedGrade(grade); setSelectedClass(''); }} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${selectedGrade === grade ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  KHỐI {grade}
                </button>
              ))}
            </div>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full sm:w-48 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2.5 font-black text-slate-700 focus:border-blue-500 outline-none cursor-pointer appearance-none text-center uppercase text-xs">
              <option value="">-- CHỌN LỚP --</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-6 pb-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-slate-300 font-black text-[10px] uppercase tracking-widest">Đang cập nhật danh sách...</div>
            </div>
          ) : selectedClass ? (
            Object.keys(groupedStudents).sort().map(group => (
              <div key={group} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-4 pl-2 font-black text-[10px] text-blue-600 tracking-widest uppercase">
                  <span>NHÓM {group}</span>
                  <div className="h-px flex-1 bg-slate-200/60"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupedStudents[group].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-[1.8rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all flex justify-between items-center group">
                      <div>
                        <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{s.tenHS}</p>
                        <p className="text-[9px] font-bold text-slate-300 mt-0.5 tracking-wider uppercase">Lớp: {s.lop} • Nhóm: {s.nhom}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => openEvaluation(s, 'Trước Buổi')} className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] shadow-sm active:scale-90 uppercase">Trước</button>
                        <button onClick={() => openEvaluation(s, 'Sau Buổi')} className="w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all font-black text-[10px] shadow-sm active:scale-90 uppercase">Sau</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
               <div className="text-6xl mb-4 grayscale opacity-20">📋</div>
               <p className="opacity-30 italic font-bold text-slate-400 text-sm">Vui lòng chọn khối và lớp</p>
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 relative">
             <button onClick={() => setModalOpen(false)} className="absolute top-6 right-8 text-slate-300 hover:text-slate-500 text-3xl font-light">×</button>
            
            <div className="mb-6">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-wider ${currentEval.loai === 'Trước Buổi' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                  {currentEval.loai}
                </span>
                <h2 className="text-2xl font-black text-slate-900 uppercase mt-2 tracking-tighter italic">{currentEval.tenHS}</h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Điểm / Trạng thái</label>
                 <input type="text" placeholder="Ví dụ: 9.5, Tốt, Vắng..." className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-black text-lg text-blue-600 transition-all uppercase" value={currentEval.diem} onChange={(e) => setCurrentEval({...currentEval, diem: e.target.value})} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nội dung đánh giá</span>
                  <button 
                    onClick={generateAiFeedback} 
                    disabled={isAiLoading} 
                    className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full transition-all ${isAiLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                  >
                    {isAiLoading ? <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span> : '✨'} 
                    {isAiLoading ? 'AI ĐANG SOẠN...' : 'AI SOẠN NHANH'}
                  </button>
                </div>
                <textarea rows={3} placeholder="Nhập nhận xét của thầy hoặc nhấn AI soạn nhanh..." className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none text-sm font-medium leading-relaxed transition-all resize-none" value={currentEval.noiDung} onChange={(e) => setCurrentEval({...currentEval, noiDung: e.target.value})} />
              </div>

              <button onClick={submitEvaluation} disabled={submitting} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-base shadow-xl hover:bg-black transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 uppercase">
                {submitting ? 'ĐANG LƯU...' : 'Lưu vào sổ tay 🚀'}
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
