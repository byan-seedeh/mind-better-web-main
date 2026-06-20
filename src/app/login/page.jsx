"use client";
import React, { useState } from 'react';
import * as Yup from 'yup';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { login } from '@/services/loginService';
import { showErrorDialog } from '@/utils/webDialog';
import { useRouter } from 'next/navigation';
import PrimaryButton from '@/components/PrimaryButton';

/**
 * @description หน้าเข้าสู่ระบบแอปพลิเคชัน (Authentication Screen)
 * @principles SoC - ควบคุมฟอร์มผ่าน Formik & Schema ผ่าน Yup | KISS - จัดการ Routing ลอจิกเส้นทางเดินแบบ Guard Clauses
 */
export default function LoginPage() {
  const router = useRouter();
  const [showPassword] = useState(false); // ควบคุมการมองเห็นรหัสผ่าน (YAGNI เคลียร์โค้ดที่ไม่ได้ใช้ออก)

  // กฎการตรวจสอบความปลอดภัยของอินพุตฟิลด์อีเมลและรหัสผ่าน
  const validationSchema = Yup.object({
    email: Yup.string().email('Invalid email format').required('Email is required'),
    password: Yup.string().required('Password is required'),
  });

  /**
   * @description จัดการ Flow การยืนยันตัวตนและการเปลี่ยน Role ไปยังหน้าที่กำหนด
   * @param {object} values - ประกอบด้วย email และ password จาก Formik
   */
  const handleAuthSubmit = async (values) => {
    const response = await login(values.email, values.password);

    // Guard Clause: ถ้าเซิร์ฟเวอร์ตอบกลับว่า ล็อกอินไม่ผ่าน ให้สั่งแจ้งเตือนตัดจบฟังก์ชันทันที (KISS)
    if (!response.result) {
      showErrorDialog(response.message);
      return;
    }

    // เซฟเก็บข้อมูลโปรไฟล์ยูสเซอร์ลงเครื่อง (MySQL Session Tracking)
    localStorage.setItem('user', JSON.stringify(response.data));
    
    // ดักจับการนำทางด้วยการเขียนคำสั่งเส้นตรง (Linear Role Routing)
    if (values.email === 'admin@test.com') {
      router.push('/admin');
    } else {
      router.push('/home');
    }
  };

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-primary-light font-sans antialiased text-brand-main px-4'>
      
      {/* โลโก้คำต้อนรับแบรนด์ระบบ */}
      <div>
        <div className='text-3xl font-bold opacity-90'>Welcome to</div>
        <h1 className='text-5xl font-black tracking-tight mt-1 text-brand-main'>MindBetter</h1>
      </div>
      
      <div className='h-[20px]' />
      <img src='/assets/main-logo.png' className='w-full max-w-[400px] object-contain' alt="MindBetter Logo" />
      <div className='h-[40px]' />

      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={validationSchema}
        onSubmit={handleAuthSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="flex flex-col items-center gap-3 w-full">
            
            {/* ช่องกรอกข้อมูลบัญชีอีเมล */}
            <div className="w-full max-w-[300px]">
              <Field 
                className='w-full rounded-2xl p-[12px] bg-warm-white text-black text-xs md:text-sm font-medium border border-transparent focus:border-brand-main outline-none transition-all' 
                name="email" 
                type="email" 
                placeholder="Enter your email"
              />
              <ErrorMessage className='text-red-500 text-left text-[11px] font-bold mt-1 px-2' name="email" component="div" />
            </div>
            
            {/* ช่องกรอกรหัสผ่านผ่านระบบความปลอดภัย */}
            <div className="w-full max-w-[300px]">
              <Field 
                className='w-full rounded-2xl p-[12px] bg-warm-white text-black text-xs md:text-sm font-medium border border-transparent focus:border-brand-main outline-none transition-all' 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter your password"
              />
              <ErrorMessage className='text-red-500 text-left text-[11px] font-bold mt-1 px-2' name="password" component="div" />
            </div>
            
            <div className='h-[5px]' />

            {/* 🛡️ DRY - เรียกใช้งานปุ่มร่วมตัวหลัก ควบคุมขนาด ทัช และฟอนต์ Poppins ผ่านจุดเดียว */}
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </PrimaryButton>
            
            {/* ✨ ลิงก์สลับหน้ามินิมอลตามดีไซน์สากล (Don't have an account? Sign up) */}
            <div className="mt-2 text-center text-xs font-semibold text-gray-500 tracking-wide">
              Don’t have an account?{" "}
              <button 
                type="button"
                onClick={() => router.push('/signup')} 
                className="text-brand-main hover:text-[#342163] font-bold underline transition-colors"
              >
                Sign up
              </button>
            </div>

          </Form>
        )}
      </Formik>

      <footer className='absolute bottom-6 text-[10px] text-gray-400 font-semibold tracking-wide'>
        Prince of Songkla University International College
      </footer>
    </div>
  );
}