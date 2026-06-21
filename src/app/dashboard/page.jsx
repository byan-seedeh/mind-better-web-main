"use client"; // บ่งชี้โครงสร้าง Client Module หน้าบ้านสำหรับควบคุมคอนโทรลเลอร์ UI 

import React, { useEffect } from 'react'; 
import { useAuthen } from '@/utils/useAuthen'; 
import { useRouter } from 'next/navigation'; 

export default function Dashboard() {
  const router = useRouter(); 
  // 🎯 REFACTOR TIP: หาก useAuthen มีฟังก์ชันล้างสเตท เช่น logout หรือ คีย์ฟังก์ชันควบคุมเซสชัน ให้ดึงมาใช้ร่วมกัน
  const { isLoading, authenticated, logout } = useAuthen(); 

  // มาตรการรักษาความปลอดภัย (Security Gateway): ตรวจเช็กเซสชันรัดกุม
  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.replace('/login'); 
    }
  }, [isLoading, authenticated, router]);

  if (isLoading) {  
    return (
      <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF] font-sans antialiased text-[#432C81]'>
        <div className="animate-pulse font-semibold">กำลังตรวจสอบข้อมูลบัญชี...</div>
      </div>
    );
  }

  if (!authenticated) return null; 

  const handleUserLogout = () => {
    // 🛡️ REFACTOR FIX: ดักล้างเซสชันอย่างเป็นระบบ 
    if (typeof logout === 'function') {
      logout(); // ล้างสเตทแกนกลางในหน่วยความจำ React ทันที ป้องกันสเตทค้างข้ามหน้า
    } else {
      localStorage.removeItem('user'); 
      // 🎯 FORCE RELOAD OPTION: ในกรณีไม่มีระบบเคลียร์สเตทส่วนกลาง การใช้ window.location.href จะปลอดภัยที่สุด 
      // เพื่อล้างหน่วยความจำ SPA ใหม่ทั้งหมด ป้องกันบั๊กการดีดกลับหน้าเดิมออโต้
      window.location.href = '/login';
      return;
    }
    router.push('/login'); 
  };

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF] font-sans antialiased text-[#432C81] px-4 animate-fade-in'>
      <div className='max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-purple-50/40 space-y-6'>
        
        {/* ส่วนหัวข้อต้อนรับสื่อแบรนด์เนม MindBetter */}
        <div className="space-y-1">
          <div className='text-2xl font-semibold opacity-90'>Welcome to</div>
          <h1 className='text-4xl font-semibold tracking-tight text-[#432C81]'>MindBetter</h1>
        </div>
        
        <div className='h-[5px]' />
        
        {/* บล็อกแสดงสิทธิ์โปรไฟล์ผู้ใช้งาน */}
        <div className="bg-[#FAF9FE] border border-gray-100 p-4 rounded-2xl shadow-3xs text-left space-y-3">
          <div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">อีเมลผู้ใช้งาน (Account Email)</span>
            <div className='text-sm sm:text-base font-semibold text-[#432C81] truncate px-1'>
              {authenticated?.email || "-"}
            </div>
          </div>
          
          <div className="border-t border-gray-100/50 pt-2 flex justify-between items-center">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">สิทธิ์ระบบ (Role Priority)</span>
              <div className='text-xs font-semibold text-purple-700 uppercase px-1'>
                🎭 {authenticated?.role_name || "user"}
              </div>
            </div>
            
            {/* 🎨 DYNAMIC PRIORITY BADGE: ตกแต่งป้ายสิทธิ์เพิ่มเติมเพื่อเพิ่มมิติความสวยงาม */}
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${authenticated?.role_name === 'admin' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
              Active Session
            </span>
          </div>
        </div>
        
        <div className='h-[5px]' />
        
        {/* ปุ่มกดสัมผัสออกจากระบบ (Logout Controller Component) */}
        <div className='flex flex-col items-center w-full'>
          <button 
            type="button"
            onClick={handleUserLogout} 
            className='w-full min-h-[48px] max-w-[300px] rounded-xl bg-white border border-gray-200 shadow-3xs text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 cursor-pointer active:scale-[0.98] transition-all duration-200 text-center flex items-center justify-center'
          >
            🚪 ออกจากระบบบัญชีผู้ใช้
          </button>
        </div>

      </div>
    </div>
  );
}