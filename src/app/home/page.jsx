"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import Navbar from "@/components/Navbar";

/**
 * @description หน้าแดชบอร์ดหลักต้อนรับผู้ใช้งานหลังผ่านการตรวจสอบสิทธิ์
 * @principles KISS - จัดการเลย์เอาต์แยกเป็นส่วนแบนเนอร์นำทางและส่วนคุณประโยชน์อย่างชัดเจน
 */
export default function HomePage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  // Guard Clause: ดักจับและคัดกรองสิทธิ์การเข้าถึงหน้าจอ (KISS)
  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-primary-light">Loading...</div>;
  if (!authenticated) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-brand-main">
      {/* 🛡️ DRY - เรียกใช้งานแถบเมนูศูนย์กลาง สีและฟอนต์ Poppins จะเท่ากันทุกหน้า */}
      <Navbar username={authenticated?.username} activeMenu="home" />

      {/* พื้นที่เนื้อหาหลัก (Main Content) */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
        
        {/* ส่วน Hero Area / แบนเนอร์หลักชวนทำแบบทดสอบ */}
        <div className="w-full rounded-3xl bg-white/70 border border-white p-6 sm:p-10 shadow-sm flex flex-col items-center justify-center text-center">
          
          <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden p-2 shadow-2xs">
            <img 
              src="/assets/banner.png" 
              className="w-full h-auto object-contain" 
              alt="ตรวจสุขภาพใจวันนี้ ฟรีไม่มีค่าใช้จ่าย" 
            />
          </div>

          <div className="h-[30px]" />

          {/* ปุ่มเริ่มประเมิน: ปรับความโค้งมนเป็น rounded-2xl คุมสเปกสัมผัสขั้นต่ำระดับสากล */}
          <button
            onClick={() => router.push("/assessment")}
            className="w-[240px] rounded-2xl bg-[#F45CB0] hover:bg-[#e04fa0] py-3.5 text-sm font-black text-warm-white shadow-lg active:scale-[0.98] transition-all duration-200 text-center cursor-pointer"
          >
            เริ่มประเมินเลย
          </button>

        </div>

        {/* ส่วน Feature Highlights Grid (3 การ์ดสื่อใจด้านล่าง) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* การ์ดที่ 1 - เข้าใจสุขภาพจิตตัวเอง */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#E3F9FD] rounded-2xl border border-blue-100 shadow-2xs hover:scale-[1.02] hover:shadow-sm transition-all duration-300">
            <img src="/assets/1.png" className="w-16 h-16 object-contain mb-3" alt="Icon Brain" />
            <div className="text-xs sm:text-sm font-black text-[#E43D84]">เข้าใจสุขภาพจิตตัวเอง</div>
          </div>

          {/* การ์ดที่ 2 - ลดความเสี่ยงภาวะเรื้อรัง */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#FFF0F3] rounded-2xl border border-red-50 shadow-2xs hover:scale-[1.02] hover:shadow-sm transition-all duration-300">
            <img src="/assets/2.png" className="w-16 h-16 object-contain mb-3" alt="Icon Stress" />
            <div className="text-xs sm:text-sm font-black text-[#1E74FD]">ลดความเสี่ยงภาวะเรื้อรัง</div>
          </div>

          {/* การ์ดที่ 3 - ส่งเสริมความเข้าใจ */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#F4F0FF] rounded-2xl border border-purple-100 shadow-2xs hover:scale-[1.02] hover:shadow-sm transition-all duration-300">
            <img src="/assets/3.png" className="w-16 h-16 object-contain mb-3" alt="Icon Love" />
            <div className="text-xs sm:text-sm font-black text-[#A546FA]">ส่งเสริมความเข้าใจ</div>
          </div>

        </div>

      </main>
    </div>
  );
}