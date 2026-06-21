"use client"; 

import React, { useEffect } from "react"; 
import { useRouter } from "next/navigation"; 
import { useAuthen } from "@/utils/useAuthen"; 
import Image from "next/image"; 
import Navbar from "@/components/Navbar"; 

const ROUTES = {
  LOGIN: "/login",
  ASSESSMENT: "/assessment"
};

export default function HomePage() {
  const router = useRouter(); 
  const { isLoading, authenticated } = useAuthen(); 

  // 🛡️ SECURITY GUARD AUTOMATION: สกัดคนไม่ได้ล็อกอินให้ออกไปหน้าแรก
  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.replace(ROUTES.LOGIN); 
    }
  }, [isLoading, authenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8FAFF] text-sm font-semibold text-[#432C81]">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
      <Navbar username={authenticated?.username} activeMenu="home" />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
        
        {/* BANNER CARD BLOCK */}
        <div className="w-full rounded-3xl bg-white/70 border border-white shadow-sm flex flex-col items-center overflow-hidden pb-6 sm:pb-8 animate-fade-in">
          
          {/* กรอบครอบดีไซน์แบนเนอร์ - ปรับความโค้งมนและ Padding เล็กน้อยเพื่อให้รูปภาพลอยเด่นอยู่ในบล็อก */}
          <div className="w-full px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="w-full relative h-[160px] sm:h-[240px] md:h-[280px] bg-white rounded-2xl overflow-hidden shadow-2xs border border-purple-50/50">
              <Image 
                src="/assets/banner.png" 
                alt="ตรวจสุขภาพใจวันนี้ ฟรีไม่มีค่าใช้จ่าย" 
                fill
                priority 
                // ปรับให้ภาพเต็มในลักษณะ 'contain' เพื่อรักษาเนื้อหาภาพให้ครบถ้วนในกรอบ (หรือเปลี่ยนเป็น 'fill' หากภาพดีไซน์มาให้ยืดได้)
                style={{ objectFit: 'contain' }} 
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="h-[20px] sm:h-[25px]" />

          <button
            type="button" 
            onClick={() => router.push(ROUTES.ASSESSMENT)} 
            className="w-[240px] rounded-2xl bg-[#F45CB0] hover:bg-[#e04fa0] py-3.5 text-sm font-semibold text-white shadow-md active:scale-[0.98] transition-all duration-200 text-center tracking-wide cursor-pointer"
          >
            เริ่มประเมินเลย
          </button>
        </div>

        {/* EXPANDED EQUAL BOX MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#E3F9FD] rounded-2xl border border-blue-100 shadow-3xs min-h-[170px] gap-3">
            <div className="relative w-16 h-16">
              <Image src="/assets/1.png" alt="Icon Brain" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="text-sm sm:text-base font-semibold text-[#E43D84] tracking-tight">เข้าใจสุขภาพจิตตัวเอง</div>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#FFF0F3] rounded-2xl border border-red-50 shadow-3xs min-h-[170px] gap-3">
            <div className="relative w-16 h-16">
              <Image src="/assets/2.png" alt="Icon Stress" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="text-sm sm:text-base font-semibold text-[#1E74FD] tracking-tight">ลดความเสี่ยงภาวะเรื้อรัง</div>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#F4F0FF] rounded-2xl border border-purple-100 shadow-3xs min-h-[170px] gap-3">
            <div className="relative w-16 h-16">
              <Image src="/assets/3.png" alt="Icon Heart" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="text-sm sm:text-base font-semibold text-[#A546FA] tracking-tight">ส่งเสริมความเข้าใจ</div>
          </div>
        </div>

      </main>
    </div>
  );
}