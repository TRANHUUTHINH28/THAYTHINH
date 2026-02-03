
import React from 'react';
import { Measurement } from '../types';
import { FileSpreadsheet } from 'lucide-react';
import { PHYSICS_CONSTANTS } from '../utils/math';

interface MeasurementTableProps {
  measurements: Measurement[];
  systemB: number;
  activeCurrent: number;
  onUpdateRow: (id: string, field: keyof Measurement, value: string) => void;
}

const MeasurementTable: React.FC<MeasurementTableProps> = ({ 
  measurements, 
  activeCurrent,
  onUpdateRow 
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-teal-200 overflow-hidden">
      {/* Header Bảng */}
      <div className="p-6 border-b border-teal-100 bg-teal-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 p-2.5 rounded-xl shadow-lg shadow-teal-200">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-teal-900 tracking-tight">Bảng 11.1. Ghi chép số liệu thí nghiệm</h3>
            <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">Dành cho học sinh thực hành</p>
          </div>
        </div>

        {/* Thông số thiết bị */}
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-teal-200 flex items-center gap-3 shadow-sm">
            <div className="text-center">
              <p className="text-[9px] font-bold text-teal-400 uppercase tracking-tighter leading-none mb-1">Số vòng dây (N)</p>
              <p className="text-sm font-black text-teal-700 font-mono leading-none">{PHYSICS_CONSTANTS.N}</p>
            </div>
            <div className="w-px h-6 bg-teal-100"></div>
            <div className="text-center">
              <p className="text-[9px] font-bold text-teal-400 uppercase tracking-tighter leading-none mb-1">Chiều dài (L)</p>
              <p className="text-sm font-black text-teal-700 font-mono leading-none">{PHYSICS_CONSTANTS.L} <span className="text-[10px] font-sans">m</span></p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] text-teal-700 uppercase bg-teal-100/50 font-black tracking-widest border-b border-teal-100">
            <tr>
              <th className="px-4 py-5 text-center">Lần đo</th>
              <th className="px-2 py-5 text-center bg-teal-600 text-white">I (A)</th>
              <th className="px-2 py-5 text-center italic">F<sub>1</sub> (N)</th>
              <th className="px-2 py-5 text-center italic">F<sub>2</sub> (N)</th>
              <th className="px-2 py-5 text-center text-teal-800 italic font-black">F = |F₂ - F₁|</th>
              <th className="px-2 py-5 text-center text-teal-900 font-black">B (Tesla)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {measurements.map((m, idx) => {
              const isActive = Math.abs(parseFloat(m.inputI) - activeCurrent) < 0.05;
              const isMeasuringZero = Math.abs(activeCurrent) < 0.01;

              return (
                <tr key={m.id} className={`transition-all duration-300 ${isActive ? 'bg-teal-50/80 ring-2 ring-inset ring-teal-500/20' : 'hover:bg-teal-50/30'}`}>
                  <td className="px-4 py-5 font-black text-teal-400 text-center">
                    {(isActive || isMeasuringZero) && <span className="inline-block w-2 h-2 bg-teal-500 rounded-full mr-2 animate-pulse"></span>}
                    Lần {idx + 1}
                  </td>
                  <td className={`px-1 py-4 ${isActive ? 'bg-teal-100/50' : 'bg-teal-50/30'}`}>
                    <input type="text" value={m.inputI} readOnly className="w-full bg-transparent border-none px-1 py-2 font-mono text-center text-teal-700 font-black" />
                  </td>
                  <td className="px-1 py-4">
                    <input 
                      type="text" 
                      value={m.inputF1} 
                      onChange={(e) => onUpdateRow(m.id, 'inputF1', e.target.value)} 
                      placeholder="Ghi số liệu..." 
                      className={`w-full bg-white border rounded-lg px-1 py-2 font-mono text-center text-slate-600 outline-none text-xs ${isMeasuringZero ? 'border-teal-400 ring-2 ring-teal-100 shadow-sm' : 'border-teal-100'}`} 
                    />
                  </td>
                  <td className="px-1 py-4">
                    <input 
                      type="text" 
                      value={m.inputF2} 
                      onChange={(e) => onUpdateRow(m.id, 'inputF2', e.target.value)} 
                      placeholder="Ghi số liệu..." 
                      className={`w-full bg-white border rounded-lg px-1 py-2 font-mono text-center text-slate-600 outline-none text-xs ${isActive ? 'border-teal-400 ring-2 ring-teal-100 shadow-sm' : 'border-teal-100'}`} 
                    />
                  </td>
                  <td className="px-1 py-4">
                    <input 
                      type="text" 
                      value={m.inputF} 
                      onChange={(e) => onUpdateRow(m.id, 'inputF', e.target.value)} 
                      placeholder="0,000" 
                      className="w-full bg-teal-50 border border-teal-100 rounded-lg px-1 py-2 font-mono text-center font-bold text-teal-700 text-xs shadow-inner" 
                    />
                  </td>
                  <td className="px-1 py-4">
                    <input 
                      type="text" 
                      value={m.inputB} 
                      onChange={(e) => onUpdateRow(m.id, 'inputB', e.target.value)} 
                      placeholder="0,000" 
                      className="w-full bg-teal-100/30 border border-teal-200 rounded-lg px-1 py-2 font-mono text-center font-black text-teal-800 text-xs" 
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-teal-900 flex items-center justify-between text-[10px] text-teal-300 italic">
        * Chú ý: Cảm ứng từ B được tính bằng biểu thức: B = F / (N.I.L)
      </div>
    </div>
  );
};

export default MeasurementTable;
