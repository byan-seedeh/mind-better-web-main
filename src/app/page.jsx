"use client"; // แจ้งเตือน Next.js ให้ประมวลผลไฟล์นี้เป็น Client Component สำหรับควบคุมฝั่งหน้าบ้าน

import React, { useEffect } from 'react'; // นำเข้าโมดูลหลักและ React Lifecycle Hooks
import { useRouter } from 'next/navigation'; // นำเข้าโมดูลสำหรับควบคุมระบบเปลี่ยนเส้นทางหน้าเพจ
import { useAuthen } from "@/utils/useAuthen"; // นำเข้าโมดูล Custom Hook สำหรับดักฟังสถานะล็อกอิน
import Image from 'next/image'; // เปลี่ยนมาใช้ Next.js Image Component เพื่อทำ Automatic Image Optimization
import PrimaryButton from '@/components/PrimaryButton'; // นำเข้า Component ปุ่มหลักที่ใช้ร่วมกันส่วนกลาง

// 🔤 CENTRALIZED ROUTES OBJECT: รวบรวมตำแหน่งพาร์ทหน้าจอไว้ส่วนกลางตามหลัก DRY
const ROUTES = {
  SIGNUP: '/signup',
  LOGIN: '/login',
  DASHBOARD: '/history'
};

export default function Home() {
  const router = useRouter(); 
  const { isLoading, authenticated } = useAuthen(); 

  // 🔄 WORKFLOW GUARD AUTOMATION: หากยูสเซอร์ล็อกอินค้างไว้ ให้ดีดไปหน้าประวัติรวมทันที
  useEffect(() => {
    if (!isLoading && authenticated) {
      router.replace(ROUTES.DASHBOARD); 
    }
  }, [isLoading, authenticated, router]); 

  // 🛡️ UX PROTECTOR: หากระบบกำลังตรวจเช็กสิทธิ์ล็อกอินค้าง ให้แสดงหน้าจอ Loading นิ่งๆ 
  // เพื่อป้องกันหน้าจอแวบแสดงปุ่มซ้ำซ้อน (Anti-Flickering UI)
  if (isLoading) {
    return (
      <div className='flex justify-center items-center min-h-screen bg-[#D0F8FF] font-sans antialiased text-[#432C81]'>
        <div className="animate-pulse text-lg font-medium">Loading MindBetter...</div>
      </div>
    );
  }

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF] font-sans antialiased text-[#432C81] px-4'>
      
      {/* ส่วนหัวข้อแสดงข้อความต้อนรับเข้าสู่ระบบพร้อมเอฟเฟกต์เด้งสมูท */}
      <div className="animate-fade-in">
        <div className='text-3xl font-semibold opacity-95'>Welcome to</div>
        <h1 className='text-5xl font-black tracking-tight mt-1 text-[#432C81]'>MindBetter</h1>
      </div>
      
      <div className='h-[20px]' /> 
      
      {/* 🛡️ OPTIMIZED IMAGE HANDLING */}
      <div className="relative w-full max-w-[400px] h-[200px]">
        <Image 
          src='/assets/main-logo.png' 
          alt="MindBetter Logo" 
          fill 
          sizes="(max-w-768px) 100vw, 400px"
          style={{ objectFit: 'contain' }}
          priority 
        />
      </div>
      
      <div className='h-[40px] md:h-[60px]' /> 
      
      {/* 🛡️ DRY BUTTONS LAYOUT MATRIX */}
      <div className='flex flex-col items-center gap-3 w-full'>
        <PrimaryButton onClick={() => router.push(ROUTES.SIGNUP)}>
          Sign Up
        </PrimaryButton>
        
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