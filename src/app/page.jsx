"use client"; // แจ้งเตือน Next.js ให้ประมวลผลไฟล์นี้เป็น Client Component สำหรับควบคุมฝั่งหน้าบ้าน
import React, { useEffect } from 'react'; // นำเข้าโมดูลหลักและ React Lifecycle Hooks สำหรับควบคุมเอฟเฟกต์หน้าจอ
import { useRouter } from 'next/navigation'; // นำเข้าโมดูลสำหรับควบคุมระบบเปลี่ยนเส้นทางหน้าเพจย่าน Next.js Navigation
import { useAuthen } from "@/utils/useAuthen"; // นำเข้าโมดูล Custom Hook สำหรับดักฟังสถานะล็อกอินของยูสเซอร์
import Image from 'next/image'; // 🛡️ เปลี่ยนมาใช้ Next.js Image Component เพื่อทำ Automatic Image Optimization
import PrimaryButton from '@/components/PrimaryButton'; // นำเข้า Component ปุ่มหลักที่ใช้ร่วมกันส่วนกลาง

// 🔤 CENTRALIZED ROUTES OBJECT: รวบรวมตำแหน่งพาร์ทหน้าจอไว้ส่วนกลางตามหลัก DRY ป้องกันปัญหาพาร์ทพังเมื่อมีการรีแฟกทอร์โฟลเดอร์
const ROUTES = {
  SIGNUP: '/signup',
  LOGIN: '/login',
  DASHBOARD: '/history'
};

/**
 * @description หน้า Welcome Screen ต้อนรับด่านแรกสุดเพื่อให้ผู้ใช้งานเลือกเข้าสู่ระบบหรือลงทะเบียน
 * @principles KISS - เน้นการออกแบบเส้นทางเรียบง่ายไหลลื่น | DRY - แชร์ปุ่ม PrimaryButton คุมขนาดสมมาตร
 */
export default function Home() {
  const router = useRouter(); // ประกาศเปิดใช้งานระบบนำทางเปลี่ยนหน้าจอเพจ
  const { isLoading, authenticated } = useAuthen(); // เรียกใช้ตัวแปรดักฟังสถานะประวัติเซสชันล็อกอินปัจจุบันของผู้ใช้งาน

  // 🔄 WORKFLOW GUARD AUTOMATION: ตรวจเช็กเซสชันล่วงหน้า หากยูสเซอร์ล็อกอินบัญชีค้างไว้แล้ว ให้ดีดไปหน้าแดชบอร์ดทันที ไม่ต้องผ่านหน้าแรกซ้ำซ้อน
  useEffect(() => {
    // หากผ่านด่านดาวน์โหลดข้อมูลตรวจสิทธิ์แล้ว และมีหลักฐานว่าบัญชีล็อกอินค้างอยู่ในระบบจริง
    if (!isLoading && authenticated) {
      router.replace(ROUTES.DASHBOARD); // ใช้คำสั่ง .replace เพื่อทำลายประวัติการย้อนกลับ ดันผู้ใช้ไปหน้าประวัติรวมออโต้
    }
  }, [isLoading, authenticated, router]); // มัดรวมชุดดักฟังความเปลี่ยนผันของตัวแปร

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF] font-sans antialiased text-[#432C81] px-4'>
      
      {/* ส่วนหัวข้อแสดงข้อความต้อนรับเข้าสู่ระบบพร้อมเอฟเฟกต์เด้งสมูท */}
      <div className="animate-fade-in">
        <div className='text-3xl font-semibold opacity-95'>Welcome to</div> {/* */}
        <h1 className='text-5xl font-black tracking-tight mt-1 text-[#432C81]'>MindBetter</h1> {/* */}
      </div>
      
      <div className='h-[20px]' /> {/* เว้นช่องไฟกึ่งกลางแนวตั้ง */}
      
      {/* 🛡️ OPTIMIZED IMAGE HANDLING: ปรับโฉมตัวดึงรูปภาพโลโก้หลักของระบบให้ประมวลผลเร็วขึ้น รองรับ Lazy Loading อัตโนมัติ */}
      <div className="relative w-full max-w-[400px] h-[200px]">
        <Image 
          src='/assets/main-logo.png' 
          alt="MindBetter Logo" 
          fill 
          sizes="(max-w-768px) 100vw, 400px"
          style={{ objectFit: 'contain' }}
          priority // สั่งให้ภาพโลโก้ซึ่งเป็นพระเอกของหน้าจอนี้ดาวน์โหลดล่วงหน้าด้วยความเร็วสูงสุด (LCP Optimization)
        />
      </div>
      
      <div className='h-[40px] md:h-[60px]' /> {/* เว้นช่องว่างขยับบล็อกปุ่ม */}
      
      {/* 🛡️ DRY BUTTONS LAYOUT MATRIX - เรียกใช้งานปุ่มแชร์คอมโพเนนต์ส่วนกลางคุมสัดส่วนความกว้างสมมาตรเท่ากัน */}
      <div className='flex flex-col items-center gap-3 w-full'>
        {/* ปุ่มนำทางโยงดีดตัวพายูสเซอร์รายใหม่ไปหน้าลงทะเบียนสมัครสมาชิก */}
        <PrimaryButton onClick={() => router.push(ROUTES.SIGNUP)}>
          Sign Up
        </PrimaryButton>
        
        {/* ปุ่มนำทางย้ายพาร์ทพายูสเซอร์รายเดิมดีดหน้าจอไปหน้าจอล็อกอินเข้าสู่ระบบ */}
        <PrimaryButton variant="secondary" onClick={() => router.push(ROUTES.LOGIN)}>
          Login
        </PrimaryButton>
      </div>

      {/* แถบแจ้งชื่อสถาบันสิทธิ์ส่วนท้ายหน้าจอเพจเพื่อความน่าเชื่อถือระบบ */}
      <footer className='absolute bottom-6 text-[10px] text-gray-400 font-semibold tracking-wide'>
        Prince of Songkla University Hatyai Campus
      </footer>
    </div>
  );
}