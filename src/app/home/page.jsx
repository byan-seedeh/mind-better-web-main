"use client"; // คอมไพล์ในฐานะ Client Module คุมความมีอยู่และวงจรชีวิตฝั่งหน้าบ้าน
import React, { useEffect } from "react"; // นำเข้าโมดูลหลัก React และรหัสจัดการวงจรชีวิตคอมโพเนนต์
import { useRouter } from "next/navigation"; // โมดูลชุดคำสั่งนำทางย้ายสลับเพจหน้าต่าง Next.js Navigation
import { useAuthen } from "@/utils/useAuthen"; // ชุดโมดูลดักสิทธิ์ล็อกอินคัดกรองความปลอดภัยเซสชันผู้ใช้
import Image from "next/image"; // เปลี่ยนมาใช้ Next.js Image เพื่อเพิ่มความเร็วระบบและบีบอัดขนาดภาพออโต้ (Performance Engine)
import Navbar from "@/components/Navbar"; // เรียกนำเข้าแถบเมนูส่วนกลางแชร์ใช้ร่วมกันส่วนกลางตามหลัก DRY

// 🔤 CENTRALIZED ROUTES OBJECT: ประกาศรวมศูนย์พาร์ทเส้นทางของเว็บแอปพลิเคชัน เพื่อให้ง่ายต่อการดูแลรักษา
const ROUTES = {
  LOGIN: "/login",
  ASSESSMENT: "/assessment"
};

export default function HomePage() {
  const router = useRouter(); // เรียกใช้งานระบบเปิดประตูปุ่มนำทางสลับหน้าจอเว็บ
  const { isLoading, authenticated } = useAuthen(); // สกัดตัวแปรดักฟังสถานะความพร้อมข้อมูลประวัติเซสชันยูสเซอร์

  // 🛡️ SECURITY GUARD AUTOMATION: ดักกรองสิทธิ์ หากตรวจเจอยูสเซอร์แอบพิมพ์คีย์ URL เข้ามาดื้อๆ โดยไม่ได้ล็อกอิน ให้เตะดีดทันที
  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.replace(ROUTES.LOGIN); // สั่งเปลี่ยนพาร์ทเส้นทางตัดกระบวนการทันทีด้วย .replace เพื่อไม่ให้กด Back ย้อนกลับมาได้
    }
  }, [isLoading, authenticated, router]);

  // ดักช่วงจังหวะเวลาที่แอปพลิเคชันกำลังประมวลผลดึงไฟล์คุกกี้เซสชันขึ้นมาตรวจสอบความปลอดภัย
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#E8FAFF] text-sm font-semibold text-[#432C81]">กำลังโหลดข้อมูล...</div>;
  }

  // หากไม่มีหลักฐานการยืนยันสิทธิ์ตัวตน ห้ามเรนเดอร์เนื้อหาหน้าจอ UI ตัวนี้เด็ดขาด (Strict Security Perimeter)
  if (!authenticated) return null;

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
      {/* 🛡️ แถบเมนูด้านบนส่วนกลาง ปรับฟอนต์ Hi Bae! และปุ่ม Logout เป็น font-semibold เรียบร้อยตาม Spec */}
      <Navbar username={authenticated?.username} activeMenu="home" />

      {/* บล็อกจัดวางพิกัดพื้นที่กระดานคอนเทนต์หลัก คุมช่องไฟระหว่างก้อนบนและล่างให้เสมอกันด้วย space-y-4 */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
        
        {/* =========================================================================
            🖼️ BANNER CARD BLOCK: ปรับขนาดขอบและความสูงกล่องแบนเนอร์ให้กระชับ เต็มกรอบพอดี โดยคงปุ่มขนาดใหญ่ไว้
            ========================================================================= */}
        <div className="w-full rounded-3xl bg-white/70 border border-white shadow-sm flex flex-col items-center overflow-hidden pb-6 sm:pb-8 animate-fade-in">
          
          {/* 📐 COMPACT SIZE: หดความสูงขอบรูปแบนเนอร์ลงมาเพื่อให้ก้อนข้อความดูพอดีคำ ไม่หนาเทอะทะเกินไป */}
          <div className="w-full relative h-[160px] sm:h-[220px] md:h-[260px]">
            <Image 
              src="/assets/banner.png" 
              alt="ตรวจสุขภาพใจวันนี้ ฟรีไม่มีค่าใช้จ่าย" 
              fill
              priority // สั่งดาวน์โหลดรูปภาพแบนเนอร์หลักด่วนที่สุด (LCP Performance Optimization)
              style={{ objectFit: 'cover' }} // สั่งจัดการให้รูปภาพแผ่ขยายตัดมุมสัดส่วนพอดีขอบกล่องด้านนอกพอดี
            />
          </div>

          {/* ระยะช่องไฟระหว่างขอบรูปแบนเนอร์และปุ่มเริ่มประเมิน */}
          <div className="h-[20px] sm:h-[25px]" />

          {/* 🎯 STANDARD BUTTON: คงขนาดปุ่มเริ่มประเมินให้มีสัดส่วนใหญ่เต็มตาตามดีไซน์เดิมของคุณ (w-[240px] py-3.5 text-sm) */}
          <button
            type="button" // สลักชนิดปุ่มให้ชัดเจนป้องกันบั๊กพฤติกรรมฟอร์ม HTML
            onClick={() => router.push(ROUTES.ASSESSMENT)} // ย้ายพาร์ทเข้าสู่ระบบทำข้อสอบคัดกรอง
            className="w-[240px] rounded-2xl bg-[#F45CB0] hover:bg-[#e04fa0] py-3.5 text-sm font-semibold text-white shadow-md active:scale-[0.98] transition-all duration-200 text-center tracking-wide cursor-pointer"
          >
            เริ่มประเมินเลย
          </button>

        </div>

        {/* =========================================================================
            📐 EXPANDED EQUAL BOX MATRIX: ขยายขนาดกรอบรูปภาพไอคอน ขยายฟอนต์ และเพิ่มมิติความสูงของกล่อง 3 ใบด้านล่างให้ใหญ่เด่นชัดสะดุดตา
            ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* กล่องคุณสมบัติที่ 1: เข้าใจสุขภาพใจตนเอง (ขยายความสูงกล่องเป็น min-h-[170px], รูปไอคอนเป็น w-16 h-16, และฟอนต์ใหญ่ขึ้น) */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#E3F9FD] rounded-2xl border border-blue-100 shadow-3xs hover:scale-[1.01] hover:shadow-sm transition-all duration-300 min-h-[170px] gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <Image src="/assets/1.png" alt="Icon Brain" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="text-sm sm:text-base font-semibold text-[#E43D84] tracking-tight">เข้าใจสุขภาพจิตตัวเอง</div>
          </div>

          {/* กล่องคุณสมบัติที่ 2: ลดความเสี่ยงภาวะเรื้อรัง */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#FFF0F3] rounded-2xl border border-red-50 shadow-3xs hover:scale-[1.01] hover:shadow-sm transition-all duration-300 min-h-[170px] gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <Image src="/assets/2.png" alt="Icon Stress" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="text-sm sm:text-base font-semibold text-[#1E74FD] tracking-tight">ลดความเสี่ยงภาวะเรื้อรัง</div>
          </div>

          {/* กล่องคุณสมบัติที่ 3: ส่งเสริมความเข้าใจ */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#F4F0FF] rounded-2xl border border-purple-100 shadow-3xs hover:scale-[1.01] hover:shadow-sm transition-all duration-300 min-h-[170px] gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <Image src="/assets/3.png" alt="Icon Heart" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="text-sm sm:text-base font-semibold text-[#A546FA] tracking-tight">ส่งเสริมความเข้าใจ</div>
          </div>

        </div>

      </main>
    </div>
  );
}