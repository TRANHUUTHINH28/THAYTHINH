
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const APP_NAME = "SỔ TAY THẦY THỊNH";
// Link Script thầy đã cung cấp
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7evEAkUxAsDo7cL464jkqPyuB_lPauKiPEDXhFqTyO-OSc7nwWcRp6zpnSBdiuHV9/exec";

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
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('10');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [currentEval, setCurrentEval] = useState<Partial<EvaluationData>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showNotify = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Hàm lấy dữ liệu với xử lý lỗi chuyên sâu
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getStudents&t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors', // Chế độ này yêu cầu Script phải được Deploy là "Anyone"
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) throw new Error("Mạng không ổn định");
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setStudents(data);
        if (data.length === 0) showNotify('Danh sách học sinh đang trống!', 'error');
      } else {
        throw new Error("Dữ liệu sai định dạng");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      showNotify('Lỗi: Thầy hãy kiểm tra lại quyền truy cập (Deploy) của Script!', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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

  const openEvaluation = (student: Student, type: 'Trước Buổi' | 'Sau Buổi') => {
    setCurrentEval({ tenHS: student.tenHS, lop: student.lop, loai: type, diem: '', noiDung: '' });
    setModalOpen(true);
  };

  const generateAiFeedback = async () => {
    if (!currentEval.tenHS) return;
    setIsAiLoading(true);
    try {
      // @ts-ignore
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Bạn là trợ lý thầy Thịnh. Viết 1 nhận xét cực ngắn (<10 chữ) cho học sinh "${currentEval.tenHS}" đạt mức "${currentEval.diem || 'Tốt'}". Ngôn ngữ khích lệ.`;
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt 
      });
      setCurrentEval(prev => ({ ...prev, noiDung: response.text?.trim() || 'Em hoàn thành tốt!' }));
      showNotify('AI đã gợi ý xong!', 'success');
    } catch (error) {
      showNotify('AI đang bận, thầy vui lòng thử lại sau!', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const submitEvaluation = async () => {
    if (!currentEval.diem && !currentEval.noiDung) {
      showNotify('Thầy chưa nhập nội dung gì cả!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      // Gửi POST bằng cách sử dụng text/plain để tránh lỗi CORS preflight của Apps Script
      await fetch(SCRIPT_URL, { 
        method: 'POST', 
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(currentEval) 
      });
      
      // Vì no-cors không đọc được response, chúng ta giả định thành công nếu không crash
      showNotify('Đã ghi sổ thành công!', 'success');
      setTimeout(() => setModalOpen(false), 800);
    } catch (error) {
      showNotify('Lỗi gửi dữ liệu. Thầy kiểm tra mạng nhé!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFDFF] font-sans pb-20">
      {/* Thông báo nổi */}
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 rounded-2xl shadow-2xl border-l-8 bg-white flex items-center gap-4 transition-all animate-in slide-in-from-top-full duration-500 ${
          notification.type === 'success' ? 'border-emerald-500 text-emerald-900' : 'border-rose-500 text-rose-900'
        }`}>
          <span className="text-2xl">{notification.type === 'success' ? '✅' : '⚠️'}</span>
          <div className="flex flex-col">
            <span className="font-black text-[10px] uppercase tracking-widest leading-none mb-1">Thông báo</span>
            <span className="font-bold text-xs">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header tối giản chuyên nghiệp */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40 px-8 py-6 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
            {APP_NAME}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${students.length > 0 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              {students.length > 0 ? `ONLINE - ${students.length} HS` : 'ĐANG KẾT NỐI...'}
            </span>
          </div>
        </div>
        <button 
          onClick={fetchStudents} 
          disabled={loading}
          className={`w-12 h-12 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-2xl transition-all ${loading ? 'animate-spin' : ''}`}
        >
          <span className="text-xl leading-none">🔄</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-10">
        {/* Bộ lọc Khối & Lớp */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex-1">
            {['10', '11', '12'].map(grade => (
              <button 
                key={grade} 
                onClick={() => { setSelectedGrade(grade); setSelectedClass(''); }} 
                className={`flex-1 py-4 px-6 rounded-xl text-[11px] font-black uppercase transition-all ${selectedGrade === grade ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Khối {grade}
              </button>
            ))}
          </div>
          <div className="md:w-72">
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-full bg-white border border-slate-100 rounded-2xl px-8 py-5 text-[11px] font-black uppercase outline-none focus:ring-4 ring-blue-50 cursor-pointer shadow-sm text-slate-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_20px_center] bg-no-repeat"
            >
              <option value="">-- CHỌN LỚP --</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-32 text-center flex flex-col items-center gap-6">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Đang đồng bộ dữ liệu với Google...</p>
          </div>
        ) : selectedClass ? (
          Object.keys(groupedStudents).sort().map(group => (
            <div key={group} className="mb-14 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="flex items-center gap-6 mb-8 opacity-40">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] italic text-slate-800">NHÓM {group}</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedStudents[group].map((s, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between min-h-[14rem]">
                    <div className="text-center">
                      <p className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight group-hover:text-blue-600 transition-colors mb-2">{s.tenHS}</p>
                      <span className="text-[9px] font-black text-slate-300 uppercase bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 tracking-widest">LỚP {s.lop}</span>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => openEvaluation(s, 'Trước Buổi')} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-900 hover:text-white transition-all text-[10px] font-black uppercase active:scale-95 shadow-sm">Trước</button>
                      <button onClick={() => openEvaluation(s, 'Sau Buổi')} className="flex-1 py-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase active:scale-95 shadow-sm shadow-blue-50">Sau buổi</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-40 text-center flex flex-col items-center">
            <div className="text-8xl mb-8 opacity-10 grayscale select-none">📂</div>
            <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Thầy vui lòng chọn lớp để bắt đầu</p>
          </div>
        )}
      </main>

      {/* Modal Đánh giá */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden relative border border-white">
             <div className={`h-2.5 ${currentEval.loai === 'Trước Buổi' ? 'bg-slate-300' : 'bg-blue-600'}`}></div>
             <button onClick={() => setModalOpen(false)} className="absolute top-8 right-10 text-slate-300 hover:text-slate-600 text-4xl font-light transition-colors">×</button>
             
             <div className="p-10 sm:p-14">
               <div className="mb-10">
                  <span className={`inline-block px-6 py-2 rounded-full text-[9px] font-black text-white uppercase tracking-widest mb-4 shadow-lg ${currentEval.loai === 'Trước Buổi' ? 'bg-slate-400 shadow-slate-100' : 'bg-blue-600 shadow-blue-100'}`}>{currentEval.loai}</span>
                  <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">{currentEval.tenHS}</h2>
               </div>

               <div className="space-y-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Xếp loại / Điểm số</label>
                     <input type="text" placeholder="Ví dụ: 10, Tốt, Vắng..." className="w-full bg-slate-50 border-2 border-slate-50 rounded-[1.8rem] px-8 py-6 text-2xl font-black text-blue-600 uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={currentEval.diem} onChange={(e) => setCurrentEval({...currentEval, diem: e.target.value})} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lời nhận xét</label>
                       <button onClick={generateAiFeedback} disabled={isAiLoading} className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-2 uppercase tracking-widest active:scale-95 transition-all">
                          {isAiLoading ? '⌛ Đang nghĩ...' : '✨ AI soạn nhanh'}
                       </button>
                    </div>
                    <textarea rows={3} placeholder="Dặn dò thêm cho học sinh?" className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] px-8 py-6 text-sm font-bold text-slate-700 leading-relaxed resize-none outline-none focus:border-blue-600 transition-all shadow-inner" value={currentEval.noiDung} onChange={(e) => setCurrentEval({...currentEval, noiDung: e.target.value})} />
                  </div>

                  <button onClick={submitEvaluation} disabled={submitting} className="w-full bg-slate-950 text-white py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black active:scale-[0.97] transition-all disabled:opacity-50">
                    {submitting ? 'ĐANG GỬI DỮ LIỆU...' : 'XÁC NHẬN GHI SỔ 🚀'}
                  </button>
               </div>
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
