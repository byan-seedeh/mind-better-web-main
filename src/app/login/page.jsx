"use client"; // บ่งชี้การประมวลผลฝั่ง Client Component ระบบหน้าบ้าน
import React, { useState } from 'react'; // นำเข้าโมดูลหลัก React 
import * as Yup from 'yup'; // นำเข้าเครื่องมือสร้างกฎคัดกรองข้อมูลฟิลด์อินพุต
import { Formik, Form, Field, ErrorMessage } from 'formik'; // ไลบรารีคุมระบบฟอร์มลงทะเบียนอัจฉริยะ (SoC)
import { login } from '@/services/loginService'; // นำเข้าท่อสัญญาณยิง API ยืนยันตัวตนคนไข้
import { showErrorDialog } from '@/utils/webDialog'; // กล่องป็อปอัปเด้งแจ้งเตือนกรณีรหัสผ่านพิมพ์พลาด
import { useRouter } from 'next/navigation'; // โมดูลคุมนำทางย้ายพาร์ทหน้าจอ Next.js
import PrimaryButton from '@/components/PrimaryButton'; //Shared Component ปุ่มธีมม่วงหลัก

// 🔤 CONFIG VARIABLES: ย้ายข้อความอีเมลบัญชีแอดมินออกไปเป็นตัวแปรเพื่อง่ายต่อการสอบทานลอจิกสิทธิ์
const ADMIN_EMAIL_KEY = "admin@test.com";

export default function LoginPage() {
  const router = useRouter(); // เปิดเรียกชุดคำสั่งระบบสวิตช์นำทางย้ายเพจหน้าเว็บ
  const [showPassword] = useState(false); // ควบคุมมองเห็นรหัสผ่านดักจับ (YAGNI เคลียร์โค้ดฟุ่มเฟือยสะสมทิ้งออก)

  // จัดตั้งกฎดักกรองความปลอดภัยความถูกต้องของช่องกรอกข้อมูลผ่านระบบแบบแผนสากล Schema
  const validationSchema = Yup.object({
    email: Yup.string().email('Invalid email format').required('Email is required'),
    password: Yup.string().required('Password is required'),
  });

  /**
   * @description ฟังก์ชันควบคุมลูปขั้นตอนการยืนยันตัวตนและการกระจายตัวแปร Role ไปตามหน้าจอเป้าหมาย
   * @principles KISS / Guard Clauses - ปรับลดทอนความซับซ้อนเงื่อนไขพังเป็นเส้นตรงดิ่งอ่านง่ายใน 3 วินาที
   */
  const handleAuthSubmit = async (values) => {
    // ⏳ ยิงพารามิเตอร์ตรวจสอบสิทธิ์ล็อกอินข้ามไปหา API 後台
    const response = await login(values.email, values.password);

    // 🚨 Guard Clause: หากเซิร์ฟเวอร์แจ้งกลับสัญญานระบุผลลัพธ์เป็นเท็จ ล็อกอินไม่ผ่าน
    if (!response.result) {
      showErrorDialog(response.message); // สั่งดีดกล่องป็อปอัปเตือนและยกเลิกกระบวนการทำงานทันที
      return; // ตัดจบกระบวนการ (Linear Logic)
    }

    // ทำการเก็บบันทึกข้อมูลโปรไฟล์เซสชันลงหน่วยความจำถาวรตัวเครื่องผู้ใช้เพื่อยืนยันตัวตนค้างไว้
    localStorage.setItem('user', JSON.stringify(response.data));
    
    // 🔄 LINEAR ROLE ROUTING: ลอจิกแยกแยะเส้นทางเดินนำทางตามสิทธิ์ Role อีเมลผู้เข้าใช้ระบบ
    if (values.email === ADMIN_EMAIL_KEY) {
      router.push('/admin'); // ถ้าตรวจพบว่าเป็นเมลแอดมินกลาง ให้เปิดประตูพาส่งเข้าห้องควบคุมผู้ดูแลระบบ
    } else {
      router.push('/home'); // บัญชีคนไข้ทั่วไป พาส่งเข้าสู่หน้าแดชบอร์ดสรุปบริการของฝั่งยูสเซอร์
    }
  };

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF] font-sans antialiased text-[#432C81] px-4'>
      
      <div>
        <div className='text-3xl font-bold opacity-90'>Welcome to</div>
        <h1 className='text-5xl font-black tracking-tight mt-1 text-[#432C81]'>MindBetter</h1>
      </div>
      
      <div className='h-[20px]' />
      <img src='/assets/main-logo.png' className='w-full max-w-[400px] object-contain' alt="MindBetter Logo" />
      <div className='h-[40px]' />

      {/* ควบคุมพิกัดฟอร์มด้วย Formik เพื่อความคลีนในการประมวลผลข้อมูลหน้าจอ */}
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={validationSchema}
        onSubmit={handleAuthSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="flex flex-col items-center gap-3 w-full">
            
            <div className="w-full max-w-[300px]">
              <Field 
                className='w-full rounded-2xl p-[12px] bg-white text-black text-xs md:text-sm font-medium border border-transparent focus:border-[#432C81] outline-none transition-all' 
                name="email" 
                type="email" 
                placeholder="Enter your email"
              />
              <ErrorMessage className='text-red-500 text-left text-[11px] font-bold mt-1 px-2' name="email" component="div" />
            </div>
            
            <div className="w-full max-w-[300px]">
              <Field 
                className='w-full rounded-2xl p-[12px] bg-white text-black text-xs md:text-sm font-medium border border-transparent focus:border-[#432C81] outline-none transition-all' 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter your password"
              />
              <ErrorMessage className='text-red-500 text-left text-[11px] font-bold mt-1 px-2' name="password" component="div" />
            </div>
            
            <div className='h-[5px]' />

            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </PrimaryButton>
            
            <div className="mt-2 text-center text-xs font-semibold text-gray-500 tracking-wide">
              Don’t have an account?{" "}
              <button 
                type="button"
                onClick={() => router.push('/signup')} 
                className="text-[#432C81] hover:text-[#342163] font-bold underline transition-colors"
              >
                Sign up
              </button>
            </div>

          </Form>
        )}
      </Formik>

      <footer className='absolute bottom-6 text-[10px] text-gray-400 font-semibold tracking-wide'>
        Prince of Songkla University Hatyai Campus
      </footer>
    </div>
  );
}