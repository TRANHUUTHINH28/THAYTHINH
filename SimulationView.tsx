import React from 'react';

interface SimulationViewProps {
  currentI: number;
  tiltAngle: number;
  isBalanced: boolean;
  displayedForce: number; 
}

const SimulationView: React.FC<SimulationViewProps> = ({ currentI, tiltAngle, isBalanced, displayedForce }) => {
  const width = 600;
  const height = 450;
  
  // Tọa độ gốc của trục quay
  const pivotX = 250; 
  const pivotY = 100; 
  const beamLength = 420;
  const tableY = height - 50;

  // Khoảng cách từ trục quay đến các điểm chốt treo
  const leftHangOffset = -170;
  const rightHangOffset = 200;
  
  // Thông số vật treo
  const dynoWidth = 44;
  const dynoHeight = 90;
  const dynoHangY = 40; 
  
  // Chiều cao khung dây dài (100) để không lọt vào khe từ khi nghiêng
  const coilHeight = 100; 
  // Dây treo ngắn (90) để cạnh trên cao hơn nam châm
  const coilHangY = 90; 

  // Nam châm 3D hình chữ U
  const magnetCenterX = pivotX + rightHangOffset;
  const magnetBaseY = tableY - 15;
  const magnetWidth = 120;
  const magnetPoleWidth = 25;
  const magnetPoleHeight = 120; 
  const magnetBaseThickness = 20;
  
  // Thông số 3D (Độ sâu/Bề rộng khung)
  const depth3D = 48; 
  const depthY = -28;

  const colors = {
    red: '#dc2626', redLight: '#ef4444', redDark: '#991b1b',
    blue: '#2563eb', blueLight: '#3b82f6', blueDark: '#1e40af',
    grey: '#71717a', greyLight: '#a1a1aa', greyDark: '#3f3f46',
    copper: '#b45309', // Màu đồng đậm hơn một chút để sắc nét
    metal: '#94a3b8',
    metalLight: '#e2e8f0',
    metalDark: '#475569'
  };

  // Path cho khung dây: hình chữ nhật 3D không có các đường kẻ phụ bên trong
  const coilPath = `M 0 0 L ${depth3D} ${depthY} L ${depth3D} ${depthY + coilHeight} L 0 ${coilHeight} Z`;

  const motionStyle = {
    transition: 'transform 700ms cubic-bezier(0.4, 0, 0.2, 1)'
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden relative">
      <div className="absolute top-4 left-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-10 shadow-lg border border-slate-700">
        Mô phỏng cơ học đồng bộ (Lực kế thế hệ mới)
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none bg-slate-50">
        <defs>
          <linearGradient id="beamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#cbd5e1', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#94a3b8', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#64748b', stopOpacity: 1 }} />
          </linearGradient>

          {/* Gradient cho thân lực kế */}
          <linearGradient id="dynoBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#94a3b8', stopOpacity: 1 }} />
            <stop offset="20%" style={{ stopColor: '#e2e8f0', stopOpacity: 1 }} />
            <stop offset="80%" style={{ stopColor: '#e2e8f0', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#64748b', stopOpacity: 1 }} />
          </linearGradient>

          {/* Gradient cho màn hình LCD */}
          <linearGradient id="lcdGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#064e3b', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#065f46', stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* 1. Môi trường cố định */}
        <path d={`M 0 ${tableY} L ${depth3D} ${tableY+depthY} H ${width+depth3D} L ${width} ${tableY} Z`} fill="#1e293b" />
        <rect x="0" y={tableY} width={width} height={height - tableY} fill="#0f172a" />
        <rect x={pivotX - 10} y={pivotY} width="20" height={tableY - pivotY} fill="url(#beamGrad)" rx="2" />

        {/* 2. Nam châm 3D hình chữ U (Cố định) */}
        <g transform={`translate(${magnetCenterX}, ${magnetBaseY})`}>
          {/* Đế nam châm */}
          <g stroke="#000" strokeWidth="0.8">
            <path d={`M ${-magnetWidth/2} ${-magnetBaseThickness} L ${-magnetWidth/2+depth3D} ${-magnetBaseThickness+depthY} H ${magnetWidth/2+depth3D} L ${magnetWidth/2} ${-magnetBaseThickness} Z`} fill={colors.greyLight} />
            <rect x={-magnetWidth/2} y={-magnetBaseThickness} width={magnetWidth} height={magnetBaseThickness} fill={colors.grey} />
            <path d={`M ${magnetWidth/2} ${-magnetBaseThickness} L ${magnetWidth/2+depth3D} ${-magnetBaseThickness+depthY} V ${depthY} L ${magnetWidth/2} 0 Z`} fill={colors.greyDark} />
          </g>
          {/* Cực Bắc (N - Đỏ) */}
          <g transform={`translate(${-magnetWidth/2}, 0)`} stroke="#000" strokeWidth="0.8">
            <path d={`M 0 ${-magnetPoleHeight} L ${depth3D} ${-magnetPoleHeight+depthY} H ${magnetPoleWidth+depth3D} L ${magnetPoleWidth} ${-magnetPoleHeight} Z`} fill={colors.redLight} />
            <rect x="0" y={-magnetPoleHeight} width={magnetPoleWidth} height={magnetPoleHeight - magnetBaseThickness} fill={colors.red} />
            <path d={`M ${magnetPoleWidth} ${-magnetPoleHeight} L ${magnetPoleWidth+depth3D} ${-magnetPoleHeight+depthY} V ${-magnetBaseThickness+depthY} L ${magnetPoleWidth} ${-magnetBaseThickness} Z`} fill={colors.redDark} />
            <text x={magnetPoleWidth/2} y={-magnetPoleHeight+35} textAnchor="middle" fill="white" className="text-[16px] font-black">N</text>
          </g>
          {/* Cực Nam (S - Xanh) */}
          <g transform={`translate(${magnetWidth/2 - magnetPoleWidth}, 0)`} stroke="#000" strokeWidth="0.8">
            <path d={`M 0 ${-magnetPoleHeight} L ${depth3D} ${-magnetPoleHeight+depthY} H ${magnetPoleWidth+depth3D} L ${magnetPoleWidth} ${-magnetPoleHeight} Z`} fill={colors.blueLight} />
            <rect x="0" y={-magnetPoleHeight} width={magnetPoleWidth} height={magnetPoleHeight - magnetBaseThickness} fill={colors.blue} />
            <path d={`M ${magnetPoleWidth} ${-magnetPoleHeight} L ${magnetPoleWidth+depth3D} ${-magnetPoleHeight+depthY} V ${-magnetBaseThickness+depthY} L ${magnetPoleWidth} ${-magnetBaseThickness} Z`} fill={colors.blueDark} />
            <text x={magnetPoleWidth/2} y={-magnetPoleHeight+35} textAnchor="middle" fill="white" className="text-[16px] font-black">S</text>
          </g>
        </g>

        {/* 3. HỆ THỐNG QUAY ĐỒNG BỘ */}
        <g transform={`rotate(${tiltAngle}, ${pivotX}, ${pivotY})`} style={motionStyle}>
          {/* Thanh đòn cân */}
          <rect x={pivotX - beamLength/2} y={pivotY - 6} width={beamLength} height="12" rx="6" fill="url(#beamGrad)" stroke="#1e293b" strokeWidth="0.5" />
          <circle cx={pivotX} cy={pivotY} r="8" fill="#0f172a" />
          
          {/* Các chốt treo dây cố định trên thanh */}
          <circle cx={pivotX + leftHangOffset} cy={pivotY} r="4" fill="#1e293b" />
          <circle cx={pivotX + rightHangOffset} cy={pivotY} r="4" fill="#1e293b" />

          {/* Cụm Lực kế (Treo bên trái) */}
          <g transform={`translate(${pivotX + leftHangOffset}, ${pivotY})`}>
            <g transform={`rotate(${-tiltAngle})`} style={motionStyle}>
              {/* Móc treo trên */}
              <path d="M -5 0 A 5 5 0 0 1 5 0 L 5 10 L -5 10 Z" fill="none" stroke="#64748b" strokeWidth="2" />
              <line x1="0" y1="0" x2="0" y2={dynoHangY} stroke="#334155" strokeWidth="2.5" />
              
              <g transform={`translate(${-dynoWidth/2}, ${dynoHangY})`}>
                {/* Thân chính lực kế */}
                <rect width={dynoWidth} height={dynoHeight} rx="6" fill="url(#dynoBodyGrad)" stroke="#475569" strokeWidth="1" />
                
                {/* Viền màn hình LCD */}
                <rect x="4" y="24" width={dynoWidth-8} height="32" rx="3" fill="#1e293b" />
                
                {/* Màn hình LCD */}
                <rect x="6" y="26" width={dynoWidth-12} height="28" rx="2" fill="url(#lcdGrad)" />
                
                {/* Giá trị số */}
                <text x={dynoWidth/2} y="46" textAnchor="middle" fill="#34d399" className="text-[13px] font-mono font-black shadow-sm" style={{ filter: 'drop-shadow(0px 0px 1px #064e3b)' }}>
                  {displayedForce.toFixed(3)}
                </text>

                {/* Đơn vị đo */}
                <text x={dynoWidth - 10} y="52" textAnchor="end" fill="#059669" className="text-[6px] font-bold">NEWTON</text>
                
                {/* Nút bấm trang trí */}
                <circle cx={12} cy={dynoHeight - 15} r="3" fill="#475569" />
                <circle cx={22} cy={dynoHeight - 15} r="3" fill="#475569" />
                <circle cx={32} cy={dynoHeight - 15} r="3" fill="#dc2626" />
                
                {/* Khe trang trí */}
                <line x1="8" y1="12" x2={dynoWidth-8} y2="12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="16" x2={dynoWidth-8} y2="16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Móc treo dưới */}
              <path d={`M -6 ${dynoHangY + dynoHeight} L 6 ${dynoHangY + dynoHeight} L 0 ${dynoHangY + dynoHeight + 10} Z`} fill="#475569" />
              <path d={`M 0 ${dynoHangY + dynoHeight + 10} Q 5 ${dynoHangY + dynoHeight + 15} 0 ${dynoHangY + dynoHeight + 20}`} fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />

              {/* Dây nối từ lực kế xuống sàn - Nét liền */}
              <line x1="0" y1={dynoHangY + dynoHeight + 15} x2="0" y2={tableY - pivotY + 80} stroke="#1e293b" strokeWidth="1.5" />
            </g>
          </g>

          {/* Cụm Khung dây (Treo bên phải) */}
          <g transform={`translate(${pivotX + rightHangOffset}, ${pivotY})`}>
            <g transform={`rotate(${-tiltAngle})`} style={motionStyle}>
              <g transform={`translate(${-depth3D/2}, ${coilHangY})`}>
                {/* Dây treo chữ V */}
                <line x1={depth3D/2} y1={-coilHangY} x2="0" y2="0" stroke="#334155" strokeWidth="1.2" />
                <line x1={depth3D/2} y1={-coilHangY} x2={depth3D} y2={depthY} stroke="#334155" strokeWidth="1.2" />
                
                {/* KHUNG DÂY: Sắc nét, không còn hiệu ứng glow nhòe */}
                <path 
                  d={coilPath} 
                  fill="none" 
                  stroke={colors.copper} 
                  strokeWidth="3.5" 
                  strokeLinejoin="round"
                />
              </g>
            </g>
          </g>
        </g>

        {/* Ampe kế phụ cố định */}
        <g transform="translate(500, 20)">
          <rect width="80" height="50" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <text x="40" y="32" textAnchor="middle" fill="#60a5fa" className="text-[12px] font-mono font-black uppercase">{currentI.toFixed(2)} A</text>
        </g>
      </svg>

      <div className="bg-slate-900 p-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-t border-slate-800">
        Phòng thí nghiệm thực hành 11.1: Khung dây giữa khe từ
      </div>
    </div>
  );
};

export default SimulationView;