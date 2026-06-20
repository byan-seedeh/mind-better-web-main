"use client"; // คอมไพล์ในฐานะ Client Module คุมความมีอยู่ฝั่งหน้าบ้าน
import React from "react"; // นำเข้าโมดูลหลัก React 
import { useRouter } from "next/navigation"; // โมดูลชุดคำสั่งนำทางย้ายสลับเพจหน้าต่าง Next.js
import { useAuthen } from "@/utils/useAuthen"; // ชุดโมดูลดักสิทธิ์ล็อกอินคัดกรองความปลอดภัยเซสชันผู้ใช้
import Navbar from "@/components/Navbar"; // 🛡️ DRY - เรียกนำเข้าแถบเมนูส่วนกลางสอดสีพาสเทลกระบอกเดียว

export default function HomePage() {
  const router = useRouter(); // เรียกใช้งานระบบเปิดประตูปุ่มนำทางสลับหน้าจอเว็บ
  const { isLoading, authenticated } = useAuthen(); // สกัดตัวแปรดักฟังสถานะความพร้อมข้อมูลประวัติยูสเซอร์

  // 🚨 Guard Clause: ดักกรองสิทธิ์ หากตรวจเจอว่าผู้ใช้แอบพิมพ์ลิงก์เข้ามาโดยยังไม่ล็อกอิน ให้เตะดีดไปหน้าแรก
  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">Loading...</div>;
  if (!authenticated) {
    router.replace("/login"); // สั่งดีดเปลี่ยนพาร์ทเส้นทางตัดกระบวนการทันที
    return null; // ปิดตายห้ามเรนเดอร์ Element บน UI วาดหน้าจอ (Security Boundary)
  }

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
      {/* 🛡️ DRY - เรียกใช้งานแถบเมนูด้านบนร่วมส่วนกลาง สีและขนาด Poppins จะเท่ากันทุกหน้าจออย่างไร้รอยต่อ */}
      <Navbar username={authenticated?.username} activeMenu="home" />

      {/* บล็อกจัดแสดงพื้นที่เนื้อหาหลักบน Dashboard หน้าต่างแอป */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
        
        {/* แผงกรอบ Hero แบนเนอร์ภาพหลักและปุ่มนำทางเข้าสู่การทำฟอร์มสุขภาพจิต */}
        <div className="w-full rounded-3xl bg-white/70 border border-white p-6 sm:p-10 shadow-sm flex flex-col items-center justify-center text-center">
          
          <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden p-2 shadow-2xs">
            <img 
              src="/assets/banner.png" 
              className="w-full h-auto object-contain" 
              alt="ตรวจสุขภาพใจวันนี้ ฟรีไม่มีค่าใช้จ่าย" 
            />
          </div>

          <div className="h-[30px]" />

          {/* ปุ่มเริ่มประเมิน: ตกแต่งขอบเหลี่ยมขอบมนด้วยสไตล์สากล rounded-2xl สัมผัสขั้นต่ำระดับพรีเมียม */}
          <button
            onClick={() => router.push("/assessment")}
            className="w-[240px] rounded-2xl bg-[#F45CB0] hover:bg-[#e04fa0] py-3.5 text-sm font-black text-white shadow-lg active:scale-[0.98] transition-all duration-200 text-center cursor-pointer"
          >
            เริ่มประเมินเลย
          </button>

        </div>

        {/* แผงคุณประโยชน์โครงสร้าง 3 กล่องการ์ดสื่อใจ สไตล์ละมุนพาสเทลคุม Visual Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* กล่องคุณสมบัติที่ 1 */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#E3F9FD] rounded-2xl border border-blue-100 shadow-2xs hover:scale-[1.02] hover:shadow-sm transition-all duration-300">
            <img src="/assets/1.png" className="w-16 h-16 object-contain mb-3" alt="Icon Brain" />
            <div className="text-xs sm:text-sm font-black text-[#E43D84]">เข้าใจสุขภาพจิตตัวเอง</div>
          </div>

          {/* กล่องคุณสมบัติที่ 2 */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#FFF0F3] rounded-2xl border border-red-50 shadow-2xs hover:scale-[1.02] hover:shadow-sm transition-all duration-300">
            <img src="/assets/2.png" className="w-16 h-16 object-contain mb-3" alt="Icon Stress" />
            <div className="text-xs sm:text-sm font-black text-[#1E74FD]">ลดความเสี่ยงภาวะเรื้อรัง</div>
          </div>

          {/* กล่องคุณสมบัติที่ 3 */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#F4F0FF] rounded-2xl border border-purple-100 shadow-2xs hover:scale-[1.02] hover:shadow-sm transition-all duration-300">
            <img src="/assets/3.png" className="w-16 h-16 object-contain mb-3" alt="Icon Heart" />
            <div className="text-xs sm:text-sm font-black text-[#A546FA]">ส่งเสริมความเข้าใจ</div>
          </div>

        </div>

      </main>
    </div>
  );
}