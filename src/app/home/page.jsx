"use client"; // คอมไพล์ในฐานะ Client Module คุมความมีอยู่และวงจรชีวิตฝั่งหน้าบ้าน
import React, { useEffect } from "react"; // นำเข้าโมดูลหลัก React และรหัสจัดการวงจรชีวิตคอมโพเนนต์
import { useRouter } from "next/navigation"; // โมดูลชุดคำสั่งนำทางย้ายสลับเพจหน้าต่าง Next.js Navigation
import { useAuthen } from "@/utils/useAuthen"; // ชุดโมดูลดักสิทธิ์ล็อกอินคัดกรองความปลอดภัยเซสชันผู้ใช้
import Image from "next/image"; // 🛡️ เปลี่ยนมาใช้ Next.js Image เพื่อเพิ่มความเร็วระบบและบีบอัดขนาดภาพออโต้ (Performance Engine)
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
      {/* 🛡️ DRY PRINCIPLE - เรียกใช้งานแถบเมนูด้านบนร่วมส่วนกลาง สเกลสีและน้ำหนักตัวอักษรจะเที่ยงตรงสม่ำเสมอกันทุกหน้าจอเพจ */}
      <Navbar username={authenticated?.username} activeMenu="home" />

      {/* บล็อกจัดแสดงพื้นที่เนื้อหาหลักบน Dashboard หน้าต่างแอป */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
        
        {/* แผงกรอบ Hero แบนเนอร์ภาพหลักและปุ่มนำทางเข้าสู่การทำฟอร์มสุขภาพจิต - ปรับแต่งให้นุ่มนวลและสัดส่วนสมมาตร */}
        <div className="w-full rounded-3xl bg-white/70 border border-white shadow-sm flex flex-col items-center overflow-hidden pb-8 sm:pb-10 animate-fade-in">
          
          {/* 🖼️ BANNER HANDLING: ขึงพิกัดโครงสร้างการแสดงผลรูปแบนเนอร์หลักให้สามารถแผ่ขยายได้เต็มพื้นที่ความกว้างอย่างสวยงาม */}
          <div className="w-full relative h-[220px] sm:h-[320px] md:h-[380px]">
            <Image 
              src="/assets/banner.png" 
              alt="ตรวจสุขภาพใจวันนี้ ฟรีไม่มีค่าใช้จ่าย" 
              fill
              priority // สั่งกระบวนการจัดลำดับให้ดาวน์โหลดรูปภาพฮีโร่ตัวนี้ขึ้นมาโชว์ด้วยความเร็วสูงสุด (LCP Performance Optimization)
              style={{ objectFit: 'cover' }} // สั่งจัดการให้รูปภาพแผ่ขยายตัดมุมสัดส่วนพอดีขอบกล่องด้านนอกสวยงาม
            />
          </div>

          {/* ระยะช่องไฟด้านล่างของรูปแบนเนอร์ก่อนถึงตำแหน่งวางปุ่มกดคัดกรอง */}
          <div className="h-[25px] md:h-[35px]" />

          {/* ปุ่มเริ่มประเมิน: ปรับแก้ Typography จากความหนาระดับ font-black ลงมาอยู่ที่ระดับ font-semibold คลีน ละมุนตา ไม่แข็งกระด้าง */}
          <button
            type="button" // สลักชนิดปุ่มให้ชัดเจนป้องกันบั๊กพฤติกรรมฟอร์ม HTML
            onClick={() => router.push(ROUTES.ASSESSMENT)} // ย้ายพาร์ทพายูสเซอร์เปิดประตูเข้าสู่แดนระบบทำข้อสอบคัดกรอง
            className="w-[240px] rounded-2xl bg-[#F45CB0] hover:bg-[#e04fa0] py-3.5 text-sm font-semibold text-white shadow-md active:scale-[0.98] transition-all duration-200 text-center cursor-pointer"
          >
            เริ่มประเมินเลย
          </button>

        </div>

        {/* แผงคุณประโยชน์โครงสร้าง 3 กล่องการ์ดสื่อใจ สไตล์ละมุนพาสเทลคุม Visual Balance ปรับฟอนต์หนาระดับ font-semibold เท่ากันหมด */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* กล่องคุณสมบัติที่ 1: เข้าใจสุขภาพใจตนเอง */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#E3F9FD] rounded-2xl border border-blue-100 shadow-3xs hover:scale-[1.02] hover:shadow-sm transition-all duration-300">
            <div className="relative w-16 h-16 mb-3">
              <Image src="/assets/1.png" alt="Icon Brain" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#E43D84]">เข้าใจสุขภาพจิตตัวเอง</div>
          </div>

          {/* กล่องคุณสมบัติที่ 2: ลดความเสี่ยงภาวะเรื้อรัง */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#FFF0F3] rounded-2xl border border-red-50 shadow-3xs hover:scale-[1.02] hover:shadow-sm transition-all duration-300">
            <div className="relative w-16 h-16 mb-3">
              <Image src="/assets/2.png" alt="Icon Stress" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#1E74FD]">ลดความเสี่ยงภาวะเรื้อรัง</div>
          </div>

          {/* กล่องคุณสมบัติที่ 3: ส่งเสริมความเข้าใจ */}
          <div className="flex flex-col items-center justify-center text-center p-6 bg-[#F4F0FF] rounded-2xl border border-purple-100 shadow-3xs hover:scale-[1.02] hover:shadow-sm transition-all duration-300">
            <div className="relative w-16 h-16 mb-3">
              <Image src="/assets/3.png" alt="Icon Heart" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#A546FA]">ส่งเสริมความเข้าใจ</div>
          </div>

        </div>

      </main>
    </div>
  );
}