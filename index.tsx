
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

  const fetchStudents = useCallback(async (url: string, silent = false) => {
    if (!url) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${url}?action=getStudents&t=${Date.now()}`);
      if (!response.ok) throw new Error("Kết nối API thất bại");
      const data = await response.json();
      if (Array.isArray(data)) {
        setStudents(data);
        if (!silent) setNotification({ message: 'Đồng bộ dữ liệu thành công!', type: 'success' });
      } else {
        throw new Error("Dữ liệu không hợp lệ");
      }
    } catch (error: any) {
      setNotification({ message: 'Lỗi kết nối Sheet. Kiểm tra URL.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 3000);
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
    if (!tempApiUrl.trim().startsWith('https://script.google.com')) {
      setNotification({ message: 'URL Web App không đúng định dạng', type: 'error' });
      return;
    }
    localStorage.setItem('teacher_app_api_url', tempApiUrl.trim());
    setApiUrl(tempApiUrl.trim());
    setIsConfiguring(false);
    fetchStudents(tempApiUrl.trim());
    setNotification({ message: 'Đã lưu cấu hình!', type: 'success' });
  };

  const openEvaluation = (student: Student, type: 'Trước Buổi' | 'Sau Buổi') => {
    setCurrentEval({ tenHS: student.tenHS, lop: student.lop, loai: type, diem: '', noiDung: '' });
    setModalOpen(true);
  };

  const generateAiFeedback = async () => {
    if (!currentEval.tenHS) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Bạn là một giáo viên tâm lý. Hãy viết 1 câu nhận xét ngắn (dưới 20 chữ) cho học sinh "${currentEval.tenHS}" dựa trên trạng thái: "${currentEval.diem || 'Đang theo dõi'}", Thời điểm: "${currentEval.loai}". Văn phong tích cực.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setCurrentEval(prev => ({ ...prev, noiDung: response.text?.trim() || '' }));
      setNotification({ message: 'AI đã soạn xong!', type: 'success' });
    } catch (error: any) {
      setNotification({ message: 'Lỗi AI. Kiểm tra API_KEY trên Vercel.', type: 'error' });
    } finally {
      setIsAiLoading(false);
      setTimeout(() => setNotification(null), 3000);
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
      setNotification({ message: 'Đã lưu thành công!', type: 'success' });
      setTimeout(() => { setNotification(null); setModalOpen(false); }, 1500);
    } catch (error) {
      setNotification({ message: 'Lỗi lưu dữ liệu.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-500">
          <div className="text-center">
            <div className="text-5xl mb-4">📖</div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">{APP_NAME}</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Thiết lập kết nối dữ liệu</p>
          </div>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Dán link Web App từ Google Sheets tại đây..." 
              value={tempApiUrl}
              onChange={(e) => setTempApiUrl(e.target.value)}
              className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-mono text-[10px]"
            />
            <button onClick={saveConfig} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
              BẮT ĐẦU SỬ DỤNG 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-xl border-l-4 transform transition-all animate-in slide-in-from-right-10 ${
          notification.type === 'success' ? 'bg-white border-blue-500 text-blue-800' : 'bg-white border-rose-500 text-rose-800'
        }`}>
          <div className="flex items-center gap-3 font-bold text-sm">
            <span>{notification.type === 'success' ? '✨' : '⚠️'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic leading-tight">
            {APP_NAME}
          </h1>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.3em]">Smart Teacher Assistant</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => apiUrl && fetchStudents(apiUrl)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">🔄</button>
          <button onClick={() => setIsConfiguring(true)} className="p-3 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">⚙️</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
              {['10', '11', '12'].map(grade => (
                <button key={grade} onClick={() => { setSelectedGrade(grade); setSelectedClass(''); }} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${selectedGrade === grade ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                  KHỐI {grade}
                </button>
              ))}
            </div>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full sm:w-48 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2.5 font-black text-slate-700 focus:border-blue-500 outline-none cursor-pointer">
              <option value="">-- CHỌN LỚP --</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-6 pb-20">
          {loading ? (
            <div className="text-center py-20 text-slate-300 font-black text-xs uppercase tracking-widest animate-pulse">Đang đồng bộ dữ liệu...</div>
          ) : selectedClass ? (
            Object.keys(groupedStudents).sort().map(group => (
              <div key={group} className="animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-4 pl-2 font-black text-[10px] text-blue-600 tracking-widest uppercase">
                  <span>NHÓM {group}</span>
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupedStudents[group].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-[1.8rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex justify-between items-center group">
                      <div>
                        <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{s.tenHS}</p>
                        <p className="text-[9px] font-bold text-slate-300 mt-0.5 tracking-wider">MÃ: {s.lop}-{i+1}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => openEvaluation(s, 'Trước Buổi')} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-black text-[10px]">TR</button>
                        <button onClick={() => openEvaluation(s, 'Sau Buổi')} className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-black text-[10px]">SAU</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 opacity-30 italic font-medium text-slate-400">Chọn khối và lớp để xem danh sách học sinh</div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black text-white ${currentEval.loai === 'Trước Buổi' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                  {currentEval.loai?.toUpperCase()}
                </span>
                <h2 className="text-2xl font-black text-slate-900 uppercase mt-1 tracking-tighter italic">{currentEval.tenHS}</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-300 hover:text-slate-500 text-2xl">×</button>
            </div>
            <div className="space-y-5">
              <input type="text" placeholder="Điểm/Trạng thái..." className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none font-black text-lg text-blue-600" value={currentEval.diem} onChange={(e) => setCurrentEval({...currentEval, diem: e.target.value})} />
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nhận xét AI</span>
                  <button onClick={generateAiFeedback} disabled={isAiLoading} className="text-[9px] font-black text-blue-600 hover:underline disabled:opacity-30">✨ AI SOẠN NHANH</button>
                </div>
                <textarea rows={3} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none text-sm font-medium leading-relaxed" value={currentEval.noiDung} onChange={(e) => setCurrentEval({...currentEval, noiDung: e.target.value})} />
              </div>
              <button onClick={submitEvaluation} disabled={submitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-base shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-2">
                {submitting ? 'ĐANG GỬI...' : 'LƯU VÀO HỆ THỐNG 🚀'}
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
