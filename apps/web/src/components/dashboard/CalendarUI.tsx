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
    <div className="bg-white border border-[#E4ECE7] rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-[#17201C]">Calendario de campañas</h2>
        <span className="text-[11px] font-semibold text-[#065F46] bg-[#E8F7F0] border border-[#0F8F6F]/20 px-2.5 py-1 rounded-full">Abril / Mayo 2026</span>
      </div>
      
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(day => (
          <div key={day} className="text-[10px] font-semibold text-[#64716B] text-center uppercase tracking-wider">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const dayNum = day.d <= 30 ? day.d : day.d - 30;
          const isToday = day.d === 27;
          
          let className = "aspect-square rounded-xl flex items-center justify-center text-xs cursor-pointer transition-all duration-150 ";
          if (isToday) {
            className += " bg-[#0F8F6F] text-white font-bold shadow-sm shadow-[#0F8F6F]/30 scale-105";
          } else if (day.h) {
            className += " bg-[#E8F7F0] text-[#065F46] font-semibold hover:bg-[#0F8F6F] hover:text-white hover:shadow-xs";
          } else {
            className += " text-[#64716B] hover:bg-[#F8FAF9] hover:text-[#17201C] font-medium";
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
