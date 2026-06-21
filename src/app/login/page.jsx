"use client";
import React from 'react';
import * as Yup from 'yup';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { login } from '@/services/loginService';
import { showErrorDialog } from '@/utils/webDialog';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PrimaryButton from '@/components/PrimaryButton';

export default function LoginPage() {
  const router = useRouter();

  const validationSchema = Yup.object({
    email: Yup.string().email('รูปแบบอีเมลไม่ถูกต้อง').required('กรุณากรอกอีเมล'),
    password: Yup.string().required('กรุณากรอกรหัสผ่าน'),
  });

  const handleAuthSubmit = async (values, { setSubmitting }) => {
    try {
      const response = await login(values.email, values.password);

      if (!response || !response.result) {
        showErrorDialog(response ? response.message : "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      // บันทึกข้อมูลโปรไฟล์ลง LocalStorage (แนะนำให้หลังจากนี้ย้ายไประบบ HttpOnly Cookie เพื่อความปลอดภัยสูงสุด)
      localStorage.setItem('user', JSON.stringify(response.data));
      
      // 🎯 ดึงสถานะบทบาทเพื่อใช้กระจายทิศทางอย่างรัดกุม
      const userRole = String(response.data.role_name || "").toLowerCase().trim(); 
      
      // ส่งสัญญาณบังคับอัปเดตหน้าต่างเบราว์เซอร์เพื่อให้ Custom Hook โหลดสิทธิ์ใหม่ไร้ข้อผิดพลาด
      if (userRole === 'admin') {
        router.push('/admin'); 
      } else {
        router.push('/home'); 
      }
    } catch (error) {
      showErrorDialog("ระบบเน็ตเวิร์กขัดข้อง ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ในขณะนี้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#E8FAFF] font-sans antialiased text-[#432C81] px-4'>
      <div className='animate-fade-in'>
        <div className='text-3xl font-semibold opacity-80'>Welcome to</div>
        <h1 className='text-5xl font-semibold tracking-tight mt-1 text-[#432C81]'>MindBetter</h1>
      </div>
      
      <div className='h-[30px]' />
      
      <div className="relative w-full max-w-[320px] h-[120px] animate-fade-in">
        <Image 
          src='/assets/main-logo.png' 
          alt="MindBetter Logo" 
          fill
          priority
          style={{ objectFit: 'contain' }}
        />
      </div>
      
      <div className='h-[40px]' />

      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={validationSchema}
        onSubmit={handleAuthSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="flex flex-col items-center gap-3 w-full animate-fade-in">
            <div className="w-full max-w-[300px]">
              <Field 
                className='w-full rounded-2xl p-[14px] bg-white text-black text-sm font-medium border border-gray-100 focus:border-[#432C81] outline-none transition-all shadow-3xs' 
                name="email" 
                type="email" 
                placeholder="ระบุอีเมลของคุณ"
              />
              <ErrorMessage className='text-red-500 text-left text-[11px] font-semibold mt-1.5 px-2' name="email" component="div" />
            </div>
            
            <div className="w-full max-w-[300px]">
              <Field 
                className='w-full rounded-2xl p-[14px] bg-white text-black text-sm font-medium border border-gray-100 focus:border-[#432C81] outline-none transition-all shadow-3xs' 
                name="password" 
                type="password" 
                placeholder="ระบุรหัสผ่านของคุณ"
              />
              <ErrorMessage className='text-red-500 text-left text-[11px] font-semibold mt-1.5 px-2' name="password" component="div" />
            </div>
            
            <div className='h-[10px]' />

            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </PrimaryButton>
            
            <div className="mt-4 text-center text-xs font-semibold text-gray-500">
              ยังไม่มีบัญชีผู้ใช้งานใช่ไหม?{" "}
              <button 
                type="button"
                onClick={() => router.push('/signup')} 
                className="text-[#432C81] hover:underline font-semibold transition-colors cursor-pointer"
              >
                สมัครสมาชิกที่นี่
              </button>
            </div>
          </Form>
        )}
      </Formik>

      <footer className='absolute bottom-8 text-[10px] text-gray-400 font-semibold tracking-widest uppercase'>
        Prince of Songkla University Hatyai Campus
      </footer>
    </div>
  );
}