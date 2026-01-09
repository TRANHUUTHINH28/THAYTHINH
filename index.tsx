
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

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
  // Lấy cấu hình từ LocalStorage
  const [apiUrl, setApiUrl] = useState<string>(localStorage.getItem('teacher_app_api_url') || '');
  const [userApiKey, setUserApiKey] = useState<string>(localStorage.getItem('teacher_app_gemini_key') || '');
  
  const [tempApiUrl, setTempApiUrl] = useState<string>(apiUrl);
  const [tempApiKey, setTempApiKey] = useState<string>(userApiKey);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('10');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isConfiguring, setIsConfiguring] = useState<boolean>(!apiUrl || !userApiKey);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [currentEval, setCurrentEval] = useState<Partial<EvaluationData>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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

  const fetchStudents = useCallback(async (url: string, silent = false) => {
    if (!url) return;
    if (!silent) setLoading(true);
    
    try {
      const response = await fetch(`${url}?action=getStudents&t=${Date.now()}`);
      if (!response.ok) throw new Error("Kết nối API thất bại");
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setStudents(data);
        const now = new Date();
        setLastUpdated(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
        if (!silent) setNotification({ message: 'Đồng bộ dữ liệu thành công!', type: 'success' });
      } else {
        throw new Error("Dữ liệu không hợp lệ");
      }
    } catch (error: any) {
      console.error(error);
      setNotification({ message: 'Lỗi kết nối Sheet. Kiểm tra URL.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  useEffect(() => {
    if (apiUrl && userApiKey) fetchStudents(apiUrl, true);
  }, [apiUrl, userApiKey, fetchStudents]);

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
    if (tempApiKey.length < 20) {
      setNotification({ message: 'API Key không hợp lệ', type: 'error' });
      return;
    }

    localStorage.setItem('teacher_app_api_url', tempApiUrl.trim());
    localStorage.setItem('teacher_app_gemini_key', tempApiKey.trim());
    
    setApiUrl(tempApiUrl.trim());
    setUserApiKey(tempApiKey.trim());
    setIsConfiguring(false);
    fetchStudents(tempApiUrl.trim());
    setNotification({ message: 'Đã lưu cấu hình!', type: 'success' });
  };

  const generateAiFeedback = async () => {
    if (!currentEval.tenHS) return;
    if (!userApiKey) {
      setNotification({ message: 'Vui lòng nhập API Key trong phần cài đặt', type: 'error' });
      return;
    }

    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: userApiKey });
      const prompt = `Bạn là một giáo viên THPT tâm lý và chuyên nghiệp. 
      Hãy viết 1 câu nhận xét ngắn gọn (dưới 25 chữ) cho học sinh "${currentEval.tenHS}" 
      dựa trên thông tin sau: Điểm/Trạng thái: "${currentEval.diem || 'Chưa có điểm'}", Thời điểm đánh giá: "${currentEval.loai}".
      Yêu cầu: Văn phong sư phạm, khích lệ, không sử dụng ký tự lạ.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const aiText = response.text || '';
      setCurrentEval(prev => ({ ...prev, noiDung: aiText.trim() }));
      setNotification({ message: 'AI đã soạn xong nhận xét!', type: 'success' });
    } catch (error: any) {
      console.error(error);
      setNotification({ message: 'API Key không đúng hoặc hết hạn.', type: 'error' });
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
      setNotification({ message: 'Đã lưu đánh giá!', type: 'success' });
      setTimeout(() => {
        setNotification(null);
        setModalOpen(false);
      }, 1500);
    } catch (error) {
      setNotification({ message: 'Lỗi khi lưu.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Màn hình Onboarding (Chào mừng khi chưa có config)
  if (!apiUrl || !userApiKey || isConfiguring) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl p-8 sm:p-12 space-y-8 animate-in zoom-in-95 duration-500">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🏫</div>
            <h1 className="text-3xl font-black text-gray-900 leading-tight italic">THPT PRO AI SETUP</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Cài đặt ứng dụng của bạn</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">1. Google Gemini API Key</label>
              <input 
                type="password" 
                placeholder="Dán API Key (AIza...)" 
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-mono text-sm"
              />
              <p className="text-[10px] text-indigo-500 font-bold ml-4 italic">
                Lấy Key miễn phí tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline">AI Studio →</a>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">2. Google Sheets Web App URL</label>
              <input 
                type="text" 
                placeholder="https://script.google.com/macros/s/..." 
                value={tempApiUrl}
                onChange={(e) => setTempApiUrl(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-mono text-[10px]"
              />
            </div>

            <button 
              onClick={saveConfig}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              LƯU & BẮT ĐẦU 🚀
            </button>
            
            {apiUrl && userApiKey && (
              <button 
                onClick={() => setIsConfiguring(false)}
                className="w-full py-3 text-gray-400 font-bold text-xs uppercase hover:text-gray-600"
              >
                Hủy thay đổi
              </button>
            )}
          </div>
          
          <div className="pt-4 border-t border-gray-50">
             <p className="text-center text-[9px] text-gray-300 font-bold uppercase tracking-widest">Dữ liệu được lưu trực tiếp trên trình duyệt của bạn</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl border-l-4 transform transition-all animate-in slide-in-from-right-10 ${
          notification.type === 'success' ? 'bg-white border-emerald-500 text-emerald-800' : 'bg-white border-rose-500 text-rose-800'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{notification.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-bold text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div onClick={() => window.location.reload()} className="cursor-pointer">
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent italic">
              THPT PRO AI
            </h1>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">Smart Teacher Assistant 4.0</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const now = new Date();
                if (apiUrl) fetchStudents(apiUrl);
              }}
              disabled={loading}
              className={`p-2.5 rounded-xl transition-all ${loading ? 'animate-spin bg-gray-100 text-gray-400' : 'hover:bg-indigo-50 text-indigo-600 active:scale-90'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button 
              onClick={() => setIsConfiguring(true)}
              className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors shadow-sm"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex flex-col items-center gap-6">
              <div className="flex p-1 bg-gray-100 rounded-2xl w-full max-w-sm">
                {['10', '11', '12'].map(grade => (
                  <button
                    key={grade}
                    onClick={() => { setSelectedGrade(grade); setSelectedClass(''); }}
                    className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                      selectedGrade === grade ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    KHỐI {grade}
                  </button>
                ))}
              </div>
              <div className="w-full max-w-sm relative">
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-lg font-black text-gray-800 focus:border-indigo-500 outline-none appearance-none text-center cursor-pointer transition-all shadow-inner"
                >
                  <option value="">-- CHỌN LỚP --</option>
                  {classes.map(c => <option key={c} value={c}>LỚP {c}</option>)}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">▼</div>
              </div>
            </div>
          </div>

          <div className="space-y-8 pb-32">
            {loading ? (
              <div className="flex flex-col items-center py-20 animate-pulse">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-xs font-black text-indigo-300 uppercase tracking-widest">Đang tải danh sách...</p>
              </div>
            ) : selectedClass ? (
              Object.keys(groupedStudents).sort((a,b) => Number(a) - Number(b)).map(groupName => (
                <section key={groupName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-5 pl-2">
                    <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase shadow-lg shadow-indigo-100">Nhóm {groupName}</span>
                    <div className="h-[1px] flex-1 bg-gray-200"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {groupedStudents[groupName].map((student, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all group active:scale-[0.98]">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-black text-gray-900 text-lg uppercase group-hover:text-indigo-600 transition-colors">{student.tenHS}</p>
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Mã HS: {student.lop}-{idx+1}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => openEvaluation(student, 'Trước Buổi')} className="w-12 h-12 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all font-black text-xs shadow-sm">TR</button>
                            <button onClick={() => openEvaluation(student, 'Sau Buổi')} className="w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all font-black text-xs shadow-sm">SAU</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="text-center py-20 bg-indigo-50/30 rounded-[3rem] border-2 border-dashed border-indigo-100">
                <div className="text-4xl mb-4 opacity-50">✨</div>
                <p className="text-indigo-300 font-black text-xs uppercase tracking-widest">Chọn lớp để bắt đầu đánh giá</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-300 overflow-hidden">
            <button onClick={() => setModalOpen(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-500 transition-all hover:rotate-90">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="mb-8">
              <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black text-white mb-2 shadow-sm ${currentEval.loai === 'Trước Buổi' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                {currentEval.loai?.toUpperCase()}
              </span>
              <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">{currentEval.tenHS}</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Điểm số / Trạng thái</label>
                <input type="text" placeholder="VD: 10, Khá, Vắng..." className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-black text-xl shadow-inner text-indigo-600" value={currentEval.diem} onChange={(e) => setCurrentEval({...currentEval, diem: e.target.value})} />
              </div>
              <div className="relative">
                <div className="flex justify-between items-center mb-3 ml-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nhận xét chuyên môn</label>
                  <button onClick={generateAiFeedback} disabled={isAiLoading} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isAiLoading ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-600 hover:scale-105 active:scale-95 shadow-sm border border-indigo-200'}`}>
                    {isAiLoading ? <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : '✨ GỢI Ý NHANH'}
                  </button>
                </div>
                <textarea rows={4} placeholder="Hãy viết gì đó khích lệ học sinh..." className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-sm shadow-inner leading-relaxed" value={currentEval.noiDung} onChange={(e) => setCurrentEval({...currentEval, noiDung: e.target.value})} />
              </div>
              <button onClick={submitEvaluation} disabled={submitting} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-[2rem] font-black text-lg hover:shadow-2xl hover:shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-3 mt-4">
                {submitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><span>GỬI LÊN HỆ THỐNG</span><span className="text-xl">🚀</span></>}
              </button>
            </div>
            {/* Background design element */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -z-10"></div>
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
