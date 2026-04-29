import React from 'react';

export function CalendarUI() {
  const days = [
    {d:1,h:false},{d:2,h:false},{d:3,h:true},{d:4,h:false},{d:5,h:false},{d:6,h:false},{d:7,h:true},
    {d:8,h:false},{d:9,h:false},{d:10,h:true},{d:11,h:false},{d:12,h:false},{d:13,h:false},{d:14,h:true},
    {d:15,h:true},{d:16,h:false},{d:17,h:false},{d:18,h:true},{d:19,h:false},{d:20,h:false},{d:21,h:false},
    {d:22,h:true},{d:23,h:false},{d:24,h:false},{d:25,h:false},{d:26,h:false},{d:27,h:true},{d:28,h:false},
    {d:29,h:false},{d:30,h:true},{d:31,h:false},{d:32,h:false},{d:33,h:true},{d:34,h:false},{d:35,h:false}
  ];

  return (
    <div className="bg-[#FDFCF5] border border-[#EDE8D0] rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-[#2c2a1e]">Calendario de campañas</h2>
        <span className="text-[11px] font-medium text-[#908c72] bg-[#F5F1DF] px-2.5 py-1 rounded-md">Abril / Mayo 2026</span>
      </div>
      
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(day => (
          <div key={day} className="text-[10px] font-medium text-[#908c72] text-center uppercase">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const dayNum = day.d <= 30 ? day.d : day.d - 30;
          const isToday = day.d === 27;
          
          let className = "aspect-square rounded-lg flex items-center justify-center text-[11px] cursor-pointer transition-all duration-200 ";
          if (isToday) {
            className += " bg-[#1D9E75] text-white font-bold shadow-md shadow-[#1D9E75]/30 ring-2 ring-offset-1 ring-[#1D9E75]/50 ring-offset-[#FDFCF5] scale-105";
          } else if (day.h) {
            className += " bg-wavo-green/20 text-wavo-green font-semibold hover:bg-wavo-green hover:text-white hover:shadow-sm";
          } else {
            className += " text-[#908c72] hover:bg-[#EDE8D0] hover:text-[#2c2a1e] font-medium";
          }

          return (
            <div key={i} className={className}>
              {dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}
