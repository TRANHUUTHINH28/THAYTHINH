
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import SimulationView from './components/SimulationView';
import Controls from './components/Controls';
import MeasurementTable from './components/MeasurementTable';
import { Measurement, SimulationState } from './types';
import { gaussianRandom, PHYSICS_CONSTANTS, calculateMagneticForce } from './utils/math';
import { 
  CloudUpload, 
  Loader2, 
  Target, 
  ChevronRight, 
  AlertCircle,
  PartyPopper,
  Database,
  BookOpen,
  RefreshCw,
  Layers,
  BarChart3,
} from 'lucide-react';

// URL Google Apps Script (Đảm bảo script của bạn hỗ trợ 9 cột)
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzkF2n5XZQ-X5apgiGgXaClLs8a5_wr-CrTMhNgpKkiXDgaMp6MRTQ4kPY5UrkeIepGJw/exec";

const MathEq: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`font-serif italic select-none flex items-center flex-wrap ${className}`}>
    {children}
  </div>
);

const Fraction: React.FC<{ top: React.ReactNode; bottom: React.ReactNode }> = ({ top, bottom }) => (
  <div className="inline-flex flex-col align-middle items-center px-1 mx-1">
    <div className="text-center text-sm md:text-base px-1 leading-none pb-1 mb-0.5">{top}</div>
    <div className="w-full h-[1.2px] bg-current"></div>
    <div className="text-center text-sm md:text-base px-1 leading-none pt-1 mt-0.5">{bottom}</div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<SimulationState>(() => ({
    targetB: 0.0175 + (Math.random() - 0.5) * 0.003, 
    fOffset: 0.210, 
    currentI: 0,
    currentDirection: 1,
    isBalanced: true,
    isOverheated: false,
    tiltAngle: 0,
  }));

  const initMeasurements = () => {
    const defaultI = [0.2, 0.4, 0.6, 0.8];
    return defaultI.map(i => ({
      id: crypto.randomUUID(),
      trueCurrent: i,
      trueF1: 0.210,
      trueF2: 0, 
      trueF: 0,
      inputI: i.toFixed(2),
      inputF1: '',
      inputF2: '',
      inputF: '',
      inputB: '',
      isValidated: false
    }));
  };

  const [measurements, setMeasurements] = useState<Measurement[]>(initMeasurements);
  const [displayedForce, setDisplayedForce] = useState<number>(session.fOffset);
  const [studentName, setStudentName] = useState<string>('');
  const [studentClass, setStudentClass] = useState<string>('');
  const [studentAvgB, setStudentAvgB] = useState<string>('');
  const [studentDeltaB, setStudentDeltaB] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCloudSaved, setIsCloudSaved] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{ type: 'success' | 'warning', message: string, percent: string } | null>(null);

  useEffect(() => {
    const fMag = calculateMagneticForce(session.currentI * session.currentDirection, session.targetB);
    const currentTilt = session.isBalanced ? 0 : fMag * 55;
    setSession(prev => ({ ...prev, tiltAngle: currentTilt, isOverheated: session.currentI > 0.8 }));
    
    const timer = setInterval(() => {
      const noise = gaussianRandom(0, 0.0035);
      setDisplayedForce(session.fOffset + fMag + noise);
    }, 100);
    return () => clearInterval(timer);
  }, [session.currentI, session.currentDirection, session.targetB, session.fOffset, session.isBalanced]);

  const handleCurrentChange = (val: number) => {
    if (hasSubmitted) return;
    setSession(prev => ({ ...prev, currentI: val, isBalanced: val === 0 }));
  };

  const handleToggleDirection = () => {
    if (hasSubmitted) return;
    setSession(prev => ({ ...prev, currentDirection: prev.currentDirection * -1, isBalanced: prev.currentI === 0 }));
  };

  const handleBalance = () => {
    if (hasSubmitted) return;
    // KHÔNG TỰ ĐIỀN DỮ LIỆU VÀO BẢNG - Học sinh phải tự nhìn màn hình và nhập
    setSession(prev => ({ ...prev, isBalanced: true }));
  };

  const handleReset = () => {
    setMeasurements(initMeasurements());
    setSession({
      targetB: 0.0175 + (Math.random() - 0.5) * 0.003,
      fOffset: 0.210,
      currentI: 0,
      currentDirection: 1,
      isBalanced: true,
      isOverheated: false,
      tiltAngle: 0,
    });
    setStudentAvgB(''); setStudentDeltaB('');
    setStudentName(''); setStudentClass('');
    setHasSubmitted(false); setIsCloudSaved(false); setSubmissionFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const systemResult = useMemo(() => {
    const baseB = parseFloat(session.targetB.toFixed(4));
    const noises = [0.0002, -0.0003, 0.0004, -0.0001].map(n => n + (Math.random() - 0.5) * 0.0002);
    
    const idealCalcs = measurements.map((m, idx) => {
      const iVal = parseFloat(m.inputI);
      const b_i = parseFloat((baseB + noises[idx]).toFixed(4));
      const fMag = PHYSICS_CONSTANTS.N * iVal * b_i * PHYSICS_CONSTANTS.L;
      return { i: iVal, f1: 0.210, f2: 0.210 + fMag, f: fMag, b: b_i };
    });

    const avgB = parseFloat((idealCalcs.reduce((acc, curr) => acc + curr.b, 0) / 4).toFixed(4));
    const deltaBs = idealCalcs.map(c => parseFloat(Math.abs(avgB - c.b).toFixed(4)));
    const avgDeltaB = parseFloat((deltaBs.reduce((acc, curr) => acc + curr, 0) / 4).toFixed(4));

    return { 
      avgB, 
      avgBRounded: avgB.toFixed(4).replace('.', ','),
      deltaB: avgDeltaB.toFixed(4).replace('.', ','),
      N: PHYSICS_CONSTANTS.N,
      L: PHYSICS_CONSTANTS.L,
      idealCalcs,
      deltaBs
    };
  }, [session.targetB, measurements]);

  const handleSync = async () => {
    if (!studentName.trim() || !studentClass.trim() || !studentAvgB.trim()) {
      return alert("Vui lòng điền đủ: Họ tên, Lớp và B trung bình.");
    }

    setIsSyncing(true);

    try {
      const studentVal = parseFloat(studentAvgB.replace(',', '.'));
      const errorPercent = (Math.abs(studentVal - systemResult.avgB) / systemResult.avgB) * 100;
      const errorStr = errorPercent.toFixed(2) + "%";
      
      const payload: Record<string, string> = {
        "Thời gian": new Date().toLocaleString('vi-VN'),
        "Học sinh": studentName,
        "Lớp": studentClass,
        "B trung bình (T)": studentAvgB,
        "Sai số (T)": studentDeltaB || "0,0000",
        "B hệ thống (T)": systemResult.avgBRounded,
        "Sai số hệ thống (T)": systemResult.deltaB,
        "Sai lệch (%)": errorStr,
        "Dữ liệu đo đạc": `Chi tiết bảng: ${measurements.map(m => `I=${m.inputI}:F1=${m.inputF1},F2=${m.inputF2},B=${m.inputB}`).join('|')}`
      };

      const formData = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => formData.append(key, value));

      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      setSubmissionFeedback({ 
        type: errorPercent <= 10 ? 'success' : 'warning', 
        message: `Đã nộp bài thành công! Toàn bộ kết quả đã được ghi nhận.`, 
        percent: errorPercent.toFixed(2) 
      });
      setHasSubmitted(true);
      setIsCloudSaved(true);
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi kết nối. Vui lòng kiểm tra lại Google Sheet URL.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <SimulationView 
              currentI={session.currentI * session.currentDirection} 
              tiltAngle={session.tiltAngle} 
              isBalanced={session.isBalanced} 
              displayedForce={displayedForce} 
            />
            
            <MeasurementTable 
              measurements={measurements} 
              systemB={systemResult.avgB}
              activeCurrent={session.currentI}
              onUpdateRow={(id, f, v) => setMeasurements(prev => prev.map(m => m.id === id ? {...m, [f]: v} : m))} 
            />

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-orange-500" />
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ghi nhận báo cáo thực hành</h3>
                </div>
                {isCloudSaved && (
                  <div className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-bounce">
                    <Database className="w-3 h-3" />
                    Đã lưu Sheet (9 Cột)
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Học sinh</label>
                    <input type="text" disabled={hasSubmitted} value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Tên của bạn..." className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lớp</label>
                    <input type="text" disabled={hasSubmitted} value={studentClass} onChange={(e) => setStudentClass(e.target.value)} placeholder="Ví dụ: 11A1..." className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>

                <div className="bg-[#050914] text-white rounded-[2.5rem] p-8 space-y-8 shadow-2xl border border-slate-800 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold italic text-sm relative z-10">
                    <ChevronRight className="w-4 h-4" />
                    <span>Học sinh tự tính toán kết quả cuối:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-3">
                      <label className="text-[11px] text-slate-400 font-bold tracking-wider uppercase ml-1">B trung bình (Tesla):</label>
                      <input type="text" disabled={hasSubmitted} value={studentAvgB} onChange={(e) => setStudentAvgB(e.target.value)} placeholder="0,0000" className="w-full px-6 py-4 rounded-2xl border border-slate-800 bg-[#0f172a] font-mono font-black text-2xl text-orange-400 focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] text-slate-400 font-bold tracking-wider uppercase ml-1">Sai số ΔB (Tesla):</label>
                      <input type="text" disabled={hasSubmitted} value={studentDeltaB} onChange={(e) => setStudentDeltaB(e.target.value)} placeholder="0,0000" className="w-full px-6 py-4 rounded-2xl border border-slate-800 bg-[#0f172a] font-mono font-black text-2xl text-orange-400 focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
                    </div>
                  </div>
                  <div className="flex justify-center py-2 relative z-10">
                    <div className="bg-[#5a46ff] text-white px-8 py-5 rounded-3xl font-mono font-black text-2xl shadow-[0_0_40px_rgba(90,70,255,0.3)] tracking-tight text-center">
                      B = {studentAvgB || "---"} ± {studentDeltaB || "---"} (T)
                    </div>
                  </div>
                </div>

                {!hasSubmitted && (
                  <button onClick={handleSync} disabled={isSyncing} className={`w-full flex items-center justify-center gap-3 py-6 rounded-2xl font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest text-lg ${isSyncing ? 'bg-slate-400 cursor-wait' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
                    {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CloudUpload className="w-6 h-6" />}
                    <span>{isSyncing ? "ĐANG GỬI DỮ LIỆU..." : "XÁC NHẬN NỘP BÀI"}</span>
                  </button>
                )}
              </div>
            </div>

            {hasSubmitted && (
              <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <div className="bg-indigo-600 px-8 py-8 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-white">
                    <BookOpen className="w-8 h-8" />
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight">Hướng dẫn giải & Đáp án</h3>
                      <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-80 italic">Physics MathType Format</p>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-16">
                  <section>
                    <div className="flex items-center gap-3 mb-10 text-indigo-600 font-black">
                      <Layers className="w-6 h-6" />
                      <h4 className="uppercase text-sm tracking-widest">PHÂN TÍCH CHI TIẾT 4 LẦN ĐO HỆ THỐNG</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {systemResult.idealCalcs.map((calc, idx) => (
                        <div key={idx} className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
                          <h5 className="font-black text-indigo-700 uppercase text-[10px] tracking-[0.2em] mb-6 flex items-center gap-2">
                             <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">{idx+1}</span>
                             LẦN ĐO {idx+1} (I = {calc.i} A)
                          </h5>
                          <div className="space-y-6">
                            <MathEq className="text-slate-600 text-base">
                              F<sub>{idx+1}</sub> = |{calc.f2.toFixed(3).replace('.', ',')} - 0,210| = <span className="text-indigo-800 font-bold ml-1">{calc.f.toFixed(3).replace('.', ',')} (N)</span>
                            </MathEq>
                            <MathEq className="text-slate-900 border-b border-slate-50 pb-4">
                              <span>B<sub>{idx+1}</sub> = </span>
                              <Fraction top={calc.f.toFixed(3).replace('.', ',')} bottom={`${systemResult.N} \u22C5 ${calc.i} \u22C5 ${systemResult.L}`} /> 
                              <span className="ml-2 text-indigo-700 font-black whitespace-nowrap"> ≈ {calc.b.toFixed(4).replace('.', ',')} (T)</span>
                            </MathEq>
                            {/* PHẦN TÍNH SAI SỐ CHI TIẾT Từng lần đo i */}
                            <MathEq className="text-slate-500 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                              <span>&Delta;B<sub>{idx+1}</sub> = |B<sub>tb</sub> - B<sub>{idx+1}</sub>| = |{systemResult.avgBRounded} - {calc.b.toFixed(4).replace('.', ',')}| = </span>
                              <span className="font-bold text-indigo-600 ml-1"> {systemResult.deltaBs[idx].toFixed(4).replace('.', ',')} (T)</span>
                            </MathEq>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-8 text-indigo-600 font-black">
                      <BarChart3 className="w-6 h-6" />
                      <h4 className="uppercase text-sm tracking-widest">KẾT QUẢ ĐỐI SOÁT HỆ THỐNG</h4>
                    </div>
                    
                    <div className="bg-[#e9fdf7] border-2 border-[#ccf6eb] p-10 rounded-[3rem] space-y-12">
                      <div className="space-y-6">
                        <p className="font-black text-[#0d9488] text-[10px] uppercase tracking-[0.2em]">B TRUNG BÌNH HỆ THỐNG:</p>
                        <MathEq className="text-[#134e4a] text-lg md:text-xl flex-wrap gap-y-6">
                          <span>B<sub>tb</sub> = </span>
                          <Fraction top={<span className="whitespace-nowrap italic">B<sub>1</sub> + B<sub>2</sub> + B<sub>3</sub> + B<sub>4</sub></span>} bottom="4" />
                          <span className="mx-3">=</span>
                          <Fraction top={<span className="whitespace-nowrap italic">({systemResult.idealCalcs.map(c => c.b.toFixed(4).replace('.', ',')).join(' + ')})</span>} bottom="4" />
                          <span className="ml-4 font-black text-[#0d9488] flex items-center gap-2 whitespace-nowrap">
                            <span> &rArr; B<sub>tb</sub> = </span>
                            <span className="text-3xl font-serif">{systemResult.avgBRounded} (T)</span>
                          </span>
                        </MathEq>
                      </div>

                      <div className="pt-10 border-t border-[#b2f1e1]/50 space-y-8">
                        <p className="font-black text-[#0d9488] text-[10px] uppercase tracking-[0.2em]">SAI SỐ TUYỆT ĐỐI HỆ THỐNG (CHI TIẾT):</p>
                        <MathEq className="text-[#134e4a] text-xl flex flex-wrap items-center gap-x-4 gap-y-8">
                          <div className="flex items-center">
                            <span>&Delta;B<sub>tb</sub> = </span>
                            <Fraction top={<span className="whitespace-nowrap italic">&Delta;B<sub>1</sub> + &Delta;B<sub>2</sub> + &Delta;B<sub>3</sub> + &Delta;B<sub>4</sub></span>} bottom="4" />
                          </div>
                          <span className="text-slate-400 mx-2">=</span>
                          <div className="flex items-center">
                            <Fraction top={<span className="whitespace-nowrap italic">({systemResult.deltaBs.map(d => d.toFixed(4).replace('.', ',')).join(' + ')})</span>} bottom="4" />
                            <span className="ml-4 font-black text-2xl text-[#0d9488] italic"> ≈ {systemResult.deltaB} (T)</span>
                          </div>
                        </MathEq>
                      </div>
                    </div>

                    <div className="mt-12 bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-center">
                         <p className="text-indigo-400 font-black uppercase text-xs tracking-[0.3em] mb-6">BÁO CÁO CHUẨN ĐỂ ĐỐI CHIẾU</p>
                         <MathEq className="text-white text-3xl md:text-5xl not-italic font-black flex items-center gap-4 justify-center w-full">
                            <span>B = {systemResult.avgBRounded} ± {systemResult.deltaB} (Tesla)</span>
                         </MathEq>
                    </div>
                  </section>

                  <div className="pt-16 border-t border-slate-100 flex flex-col items-center gap-10">
                    <button onClick={handleReset} className="group flex items-center gap-6 bg-slate-900 text-white px-16 py-8 rounded-[2.5rem] font-black uppercase tracking-[0.2em] hover:bg-teal-600 transition-all shadow-2xl active:scale-95 text-xl">
                      <RefreshCw className="w-8 h-8 group-hover:rotate-180 transition-transform duration-1000" />
                      <span>THỰC HIỆN LẠI THÍ NGHIỆM</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <Controls 
              currentI={session.currentI} 
              currentDirection={session.currentDirection} 
              onCurrentChange={handleCurrentChange} 
              onToggleDirection={handleToggleDirection} 
              onBalance={handleBalance} 
              onReset={() => { if(window.confirm("Bắt đầu thí nghiệm mới? Mọi dữ liệu đo đạc sẽ bị xóa.")) handleReset(); }} 
              isBalanced={session.isBalanced} 
              isOverheated={session.isOverheated} 
            />
            
            {submissionFeedback && (
              <div className={`p-6 rounded-2xl border-2 flex items-center gap-4 animate-in slide-in-from-right duration-500 shadow-lg ${submissionFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                 <div className="flex-1">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">Sai lệch so với đáp án:</p>
                   <p className={`font-black text-3xl ${submissionFeedback.type === 'success' ? 'text-emerald-600' : 'text-orange-600'}`}>{submissionFeedback.percent}%</p>
                 </div>
                 {submissionFeedback.type === 'success' ? <PartyPopper className="w-12 h-12 text-emerald-500" /> : <AlertCircle className="w-12 h-12 text-orange-500" />}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
