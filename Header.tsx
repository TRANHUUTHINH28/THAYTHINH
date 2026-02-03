
import React from 'react';
import { Microscope, Info } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Microscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Virtual Lab: Cân Dòng Điện</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Physics Education Series</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex gap-4">
              <a href="#" className="text-sm font-medium text-indigo-600">Thí nghiệm</a>
              <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Lý thuyết</a>
              <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Báo cáo</a>
            </nav>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">
              <Info className="w-4 h-4" />
              <span className="text-xs font-semibold">Hướng dẫn</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
