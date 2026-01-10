
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
      const data = await response.json();
      if (Array.isArray(data)) {
        setStudents(data);
        if (!silent) showNotify('Đồng bộ dữ liệu thành công!', 'success');
      }
    } catch (error) {
      if (!silent) showNotify('Lỗi kết nối Sheet. Kiểm tra lại URL.', 'error');
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
      showNotify('URL Web App không đúng!', 'error');
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
    setIsAiLoading(true);
    try {
      // Khởi tạo AI trực tiếp từ biến môi trường
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Viết 1 câu nhận xét ngắn dưới 10 chữ cho học sinh "${currentEval.tenHS}", kết quả: "${currentEval.diem || 'tốt'}". Văn phong giáo viên, khích lệ.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setCurrentEval(prev => ({ ...prev, noiDung: response.text?.trim() || '' }));
      showNotify('AI đã soạn xong!', 'success');
    } catch (error: any) {
      console.error(error);
      showNotify('Lỗi: Thầy hãy nhấn Redeploy trên Vercel để kích hoạt mã API.', 'error');
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
      showNotify('Đã gửi dữ liệu thành công!', 'success');
      setTimeout(() => setModalOpen(false), 800);
    } catch (error) {
      showNotify('Lỗi lưu dữ liệu.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-6 text-center">
          <div className="text-5xl">🏫</div>
          <h1 className="text-2xl font-black italic uppercase">{APP_NAME}</h1>
          <input 
            type="text" 
            placeholder="Dán link App Script vào đây..." 
            value={tempApiUrl}
            onChange={(e) => setTempApiUrl(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 border-2 rounded-2xl outline-none focus:border-blue-500 text-sm font-mono"
          />
          <button onClick={saveConfig} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
            KẾT NỐI NGAY 🚀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border-b-4 bg-white transform transition-all animate-in slide-in-from-top-10 ${
          notification.type === 'success' ? 'border-blue-500 text-blue-800' : 'border-rose-500 text-rose-800'
        }`}>
          <div className="flex items-center gap-3 font-black text-xs uppercase">
            <span>{notification.type === 'success' ? '✅' : '❌'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic uppercase tracking-tighter">
          {APP_NAME}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => fetchStudents(apiUrl)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl">🔄</button>
          <button onClick={() => setIsConfiguring(true)} className="p-3 text-slate-400 hover:bg-slate-100 rounded-xl">⚙️</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border mb-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              {['10', '11', '12'].map(grade => (
                <button key={grade} onClick={() => { setSelectedGrade(grade); setSelectedClass(''); }} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${selectedGrade === grade ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                  KHỐI {grade}
                </button>
              ))}
            </div>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full sm:w-48 bg-slate-50 border-2 rounded-2xl px-4 py-2 font-black text-xs uppercase outline-none focus:border-blue-500">
              <option value="">-- CHỌN LỚP --</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-20 text-slate-300 font-black text-xs uppercase animate-pulse">Đang tải dữ liệu...</div>
          ) : selectedClass ? (
            Object.keys(groupedStudents).sort().map(group => (
              <div key={group} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-4 pl-2 font-black text-[10px] text-blue-600 uppercase tracking-widest">
                  <span>NHÓM {group}</span>
                  <div className="h-px flex-1 bg-slate-200/50"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupedStudents[group].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-[1.5rem] border shadow-sm flex justify-between items-center group hover:border-blue-500 transition-all">
                      <div>
                        <p className="font-black text-slate-900 uppercase tracking-tight">{s.tenHS}</p>
                        <p className="text-[9px] font-bold text-slate-300 uppercase">Lớp: {s.lop} • Nhóm: {s.nhom}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEvaluation(s, 'Trước Buổi')} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-black text-[10px]">TR</button>
                        <button onClick={() => openEvaluation(s, 'Sau Buổi')} className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-black text-[10px]">SAU</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 opacity-20 font-black text-sm italic">Vui lòng chọn lớp học</div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 relative">
             <button onClick={() => setModalOpen(false)} className="absolute top-6 right-8 text-slate-300 hover:text-slate-500 text-3xl">×</button>
            <div className="mb-6">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black text-white uppercase ${currentEval.loai === 'Trước Buổi' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{currentEval.loai}</span>
                <h2 className="text-2xl font-black text-slate-900 uppercase mt-2 italic tracking-tighter">{currentEval.tenHS}</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Điểm / Trạng thái</label>
                 <input type="text" placeholder="Ví dụ: 9.5, Tốt, Vắng..." className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:border-blue-500 outline-none font-black text-blue-600 uppercase" value={currentEval.diem} onChange={(e) => setCurrentEval({...currentEval, diem: e.target.value})} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Nhận xét</span>
                  <button onClick={generateAiFeedback} disabled={isAiLoading} className="text-[10px] font-black px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1">
                    {isAiLoading ? <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span> : '✨'} AI SOẠN NHANH
                  </button>
                </div>
                <textarea rows={3} className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:border-blue-500 outline-none text-sm font-medium resize-none shadow-inner" value={currentEval.noiDung} onChange={(e) => setCurrentEval({...currentEval, noiDung: e.target.value})} />
              </div>
              <button onClick={submitEvaluation} disabled={submitting} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black active:scale-95 transition-all uppercase">
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
