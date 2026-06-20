"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import PrimaryButton from '@/components/PrimaryButton';

/**
 * @description หน้า Welcome Screen แรกสุดของระบบสำหรับการเลือกเข้าสู่ระบบหรือลงทะเบียน
 * @principles KISS - เน้นการทำงานแบบเส้นตรงไร้ Logic ซับซ้อน | YAGNI - มีเฉพาะ UI Elements ที่จำเป็นในการนำทาง
 */
export default function Home() {
  const router = useRouter();

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-primary-light font-sans antialiased text-brand-main px-4'>
      
      {/* ส่วนหัวข้อต้อนรับ (Hero Branding) */}
      <div className="animate-fade-in">
        <div className='text-3xl font-bold opacity-90'>Welcome to</div>
        <h1 className='text-5xl font-black tracking-tight mt-1 text-brand-main'>MindBetter</h1>
      </div>
      
      <div className='h-[20px]' />
      {/* โลโก้หลักของแอปพลิเคชัน */}
      <img src='/assets/main-logo.png' className='w-full max-w-[400px] object-contain' alt="MindBetter Logo" />
      <div className='h-[40px] md:h-[60px]' />
      
      {/* 🛡️ DRY - เรียกใช้งาน Shared Components (PrimaryButton) ในการนำทางหลัก */}
      <div className='flex flex-col items-center gap-3 w-full'>
        <PrimaryButton onClick={() => router.push('/signup')}>
          Sign Up
        </PrimaryButton>
        
        <PrimaryButton variant="secondary" onClick={() => router.push('/login')}>
          Login
        </PrimaryButton>
      </div>

      {/* ลิขสิทธิ์และสถาบันส่วนท้ายหน้า */}
      <footer className='absolute bottom-6 text-[10px] text-gray-400 font-semibold tracking-wide'>
        Prince of Songkla University International College
      </footer>
    </div>
  );
}