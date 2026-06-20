"use client"; // บ่งชี้โครงสร้าง Client Module หน้าบ้านสำหรับควบคุมคอนโทรลเลอร์ UI และการจัดการ Event
import React from 'react'; // นำเข้าโมดูลหลักของไลบรารี React
import { useAuthen } from '@/utils/useAuthen'; // นำเข้าชุดคำสั่ง Custom Hook สำหรับดักฟังสถานะและพิสูจน์สิทธิ์เข้าใช้งานระบบ
import { useRouter } from 'next/navigation'; // นำเข้าเครื่องมือชุดคำสั่งช่วยนำทางเปลี่ยนพาร์ทหน้าเพจของ Next.js

/**
 * @description หน้าเพจตรวจสอบระบบบัญชีและประมวลผลการจำแนกสถานะผู้เข้าใช้งานส่วนบุคคล
 * @principles KISS - ตัดลอจิกซับซ้อนให้เดินเป็นเส้นตรง | DRY - ใช้ระบบความลาดชันฟอนต์และโทนสีพาสเทลรับเข้าชุดธีมหลัก
 */
export default function Dashboard() {
  const router = useRouter(); // ประกาศเปิดเรียกชุดคำสั่งระบบสวิตช์นำทางย้ายพาร์ทหน้าเพจระบบ
  const { isLoading, authenticated } = useAuthen(); // แตกสเตทอ่านค่าความมีอยู่และความพร้อมของก้อนโปรไฟล์ผู้ใช้งาน

  // 🚨 Robust Error Handling / Guard Clause: ดักสัญญานระหวังระบบกำลังโหลดข้อมูลบัญชีค้างอยู่
  if (isLoading) {  
    // คืนค่าโครงสร้างม่านป้ายสปินเนอร์คำว่า Loading ดักหน้าจอไว้เพื่อไม่ให้เกิดการกระตุกหลุดสายตาของผู้ใช้งาน
    return <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-primary-light font-sans antialiased text-brand-main'>Loading...</div>;
  }

  // มาตรการรักษาความปลอดภัย (Security Gateway): หากดักจับลอจิกแล้วพบว่าไม่มี Session ล็อกอินหลงเหลืออยู่จริง
  if (!authenticated) {
    router.replace('/login'); // สั่งเบรกและเตะนำทางผู้บุกรุกกลับไปตั้งหลักที่หน้าล็อกอินทันทีเพื่อความปลอดภัยของฐานข้อมูล
    return null; // ระงับการวาดโครงสร้างภาพองค์ประกอบ UI ลงหน้าจอหน้าต่างทันทีป้องกันช่องโหว่ข้อมูลรั่วไหล
  }

  // ฟังก์ชันควบคุมมาตรการออกจากระบบ ล้างสิทธิ์การถือครอง Token
  const handleUserLogout = () => {
    localStorage.removeItem('user'); // สั่งทำลายคราบลบก้อนเซสชันโปรไฟล์ที่เก็บสะสมค้างไว้ในหน่วยความจำเครื่องออกให้หมดเกลี้ยง
    router.push('/login'); // สั่งการเปลี่ยนเด้งพาร์ทเส้นทางพายูสเซอร์กลับไปหน้าเพจเข้าสู่ระบบเริ่มต้น
  };

  return (
    // คุมโทนระบบ Layout สัดส่วนความลาดชันมินิมอลพาสเทลตามมาตรฐาน Design System Tokens ของโปรเจกต์
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-primary-light font-sans antialiased text-brand-main px-4 animate-fade-in'>
      <div className='max-w-md w-full bg-warm-white rounded-3xl p-8 shadow-xl border border-purple-50/40 space-y-6'>
        
        {/* ส่วนหัวข้อต้อนรับสื่อแบรนด์เนม MindBetter */}
        <div className="space-y-1">
          <div className='text-2xl font-semibold opacity-90'>Welcome to</div>
          <h1 className='text-4xl font-black tracking-tight text-brand-main'>MindBetter</h1>
        </div>
        
        {/* เส้นระยะแบ่งช่องไฟช่องว่าง (Whitespace Management) เพื่อความโปร่งสบายตาแบบมินิมอล */}
        <div className='h-[5px]' />
        
        {/* บล็อกสถิติกล่องแสดงผลชื่อบัญชีอีเมลของผู้ล็อกอินเข้ารับการตรวจทานระบบ */}
        <div className="bg-[#FAF9FE] border border-gray-100 p-4 rounded-2xl shadow-3xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">สิทธิ์บัญชีผู้เข้าใช้งานในระบบ</span>
          {/* 📐 UI REFINEMENT FIX: ปรับเปลี่ยนสเกลความหนาตัวอักษรของข้อมูลสถิติอีเมลลงมาเป็นระดับ `font-semibold` สวยงาม โปร่งตา ไม่ทึบแข็งกระด้าง */}
          <div className='text-base sm:text-lg font-semibold text-brand-main truncate px-2'>
            {authenticated?.email}
          </div>
        </div>
        
        <div className='h-[5px]' />
        
        {/* บล็อกจัดสัดส่วนชุดปุ่มกดสัมผัสออกจากระบบ (Logout Controller Component) */}
        <div className='flex flex-col items-center w-full'>
          <button 
            onClick={handleUserLogout} // สั่งผูก Event เรียกใช้งานฟังก์ชันทำลายก้อน Token เมื่อโดนนิ้วคลิกจิ้มปุ่ม
            {/* 📏 MOBILE TOUCH TARGET LOGIC: ล็อกน้ำหนักส่วนสูงขั้นต่ำของปุ่มกดสัมผัสไม่ต่ำกว่า 48px เพื่อให้ทัชสกรีนได้ง่าย ลื่นไหลตรงหลักการแพทย์สากล */}
            className='w-full min-h-[48px] max-w-[300px] rounded-xl bg-white border border-gray-200 shadow-3xs text-xs font-black text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 cursor-pointer active:scale-[0.98] transition-all duration-200 text-center flex items-center justify-center'
          >
            🚪 ออกจากระบบบัญชีผู้ใช้
          </button>
        </div>

      </div>
    </div>
  );
}