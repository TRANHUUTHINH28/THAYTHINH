
import React from 'react';
import { Zap, Scale, RefreshCcw, ArrowRightLeft } from 'lucide-react';

interface ControlsProps {
  currentI: number;
  currentDirection: number;
  onCurrentChange: (val: number) => void;
  onToggleDirection: () => void;
  onBalance: () => void;
  onReset: () => void;
  isBalanced: boolean;
  isOverheated: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  currentI, 
  currentDirection,
  onCurrentChange, 
  onToggleDirection,
  onBalance, 
  onReset,
  isBalanced,
  isOverheated
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Bảng Điều Khiển
        </h3>
        <button 
          onClick={onReset}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
          title="Làm mới thí nghiệm"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Cường độ dòng điện (I)</span>
            <span className={`font-mono ${isOverheated ? 'text-red-600 font-bold' : 'text-blue-600'}`}>
              {currentI.toFixed(2)} A
            </span>
          </label>
          <input 
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentI}
            onChange={(e) => onCurrentChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0.0A</span>
            <span className="text-red-300">Cảnh báo nhiệt (0.8A+)</span>
            <span>1.0A</span>
          </div>
        </div>

        {/* Nút Đổi Chiều Dòng Điện */}
        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={onToggleDirection}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all shadow-sm border
              ${currentDirection === 1 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100'
              }`}
          >
            <ArrowRightLeft className={`w-4 h-4 ${currentDirection === -1 ? 'rotate-180' : ''} transition-transform duration-300`} />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] uppercase font-bold opacity-60">Thao tác dòng điện</span>
              <span>Đổi chiều dòng điện</span>
            </span>
          </button>
        </div>

        {isOverheated && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-xs flex items-start gap-2 animate-pulse">
            <span className="font-bold">⚠️ CẢNH BÁO:</span> 
            Khung dây đang bị nóng do dòng điện cao! Sai số đo lường sẽ tăng lên.
          </div>
        )}

        <div className="pt-2 grid grid-cols-1 gap-3">
          <button 
            onClick={onBalance}
            disabled={isBalanced && currentI > 0}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all shadow-sm
              ${isBalanced 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
              }`}
          >
            <Scale className="w-5 h-5" />
            {isBalanced ? 'Đã Cân Bằng' : 'Nhấn để Cân Bằng & Đo'}
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500 border-t pt-4">
        <p className="font-semibold mb-1 text-slate-700">Mẹo thí nghiệm:</p>
        <ol className="list-decimal list-inside space-y-1.5 ml-1 leading-relaxed">
          <li>Chỉnh $I=0$, nhấn <span className="text-indigo-600 font-bold">Cân bằng</span> để lấy $F_1$.</li>
          <li>Tăng $I$, khung dây sẽ bị hút xuống hoặc đẩy lên tùy chiều dòng điện.</li>
          <li>Nhấn <span className="text-indigo-600 font-bold">Cân bằng</span> để lấy $F_2$ mới.</li>
          <li>Đổi chiều dòng điện để quan sát sự đảo hướng của lực từ.</li>
        </ol>
      </div>
    </div>
  );
};

export default Controls;
