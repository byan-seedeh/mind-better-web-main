"use client"; // แจ้งเตือน Next.js ให้ประมวลผลไฟล์นี้เป็น Client Component สำหรับควบคุมฝั่งหน้าบ้าน
import React from 'react'; // นำเข้าโมดูลหลักของ React
import { useRouter } from 'next/navigation'; // นำเข้าโมดูลสำหรับควบคุมระบบเปลี่ยนเส้นทางหน้าเพจ
import PrimaryButton from '@/components/PrimaryButton'; // นำเข้า Component ปุ่มหลักที่ใช้ร่วมกันส่วนกลาง

/**
 * @description หน้า Welcome Screen ต้อนรับด่านแรกสุดเพื่อให้ผู้ใช้งานเลือกเข้าสู่ระบบหรือลงทะเบียน
 * @principles KISS - เน้นการออกแบบเส้นทางเรียบง่ายไหลลื่น | DRY - แชร์ปุ่ม PrimaryButton คุมขนาด 300px เท่ากัน
 */
export default function Home() {
  const router = useRouter(); // ประกาศเปิดใช้งานระบบนำทางเปลี่ยนหน้าจอเพจ

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF] font-sans antialiased text-[#432C81] px-4'>
      
      {/* ส่วนหัวข้อแสดงข้อความต้อนรับเข้าสู่ระบบ */}
      <div className="animate-fade-in">
        <div className='text-3xl font-semibold opacity-95'>Welcome to</div>
        <h1 className='text-5xl font-black tracking-tight mt-1 text-[#432C81]'>MindBetter</h1>
      </div>
      
      <div className='h-[20px]' />
      {/* ส่วนโลโก้ภาพสัญลักษณ์หลักของระบบแอปพลิเคชัน */}
      <img src='/assets/main-logo.png' className='w-full max-w-[400px] object-contain' alt="MindBetter Logo" />
      <div className='h-[40px] md:h-[60px]' />
      
      {/* 🛡️ DRY - เรียกใช้งานปุ่มส่วนกลางคุมสัดส่วนความกว้างสมมาตรเท่ากันทุกเพจอย่างเป็นระบบ */}
      <div className='flex flex-col items-center gap-3 w-full'>
        <PrimaryButton onClick={() => router.push('/signup')}>
          Sign Up
        </PrimaryButton>
        
        <PrimaryButton variant="secondary" onClick={() => router.push('/login')}>
          Login
        </PrimaryButton>
      </div>

      {/* แถบแจ้งชื่อสถาบันสิทธิ์ส่วนท้ายหน้าจอเพจ */}
      <footer className='absolute bottom-6 text-[10px] text-gray-400 font-semibold tracking-wide'>
        Prince of Songkla University International College
      </footer>
    </div>
  );
}