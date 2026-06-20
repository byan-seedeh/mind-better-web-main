"use client"; // บ่งชี้ Next.js ให้ประมวลผลไฟล์นี้เป็น Client Component สำหรับควบคุมระบบฝั่งหน้าบ้าน
import React from 'react'; // นำเข้าโมดูลหลัก React
import * as Yup from 'yup'; // นำเข้าไลบรารีสร้างกฎคัดกรองความถูกต้องของข้อมูลอินพุต (Validation Schema)
import { Formik, Form, Field, ErrorMessage } from 'formik'; // ไลบรารีคุมสเตทและวงจรชีวิตของฟอร์มอย่างเป็นระบบ (SoC)
import { login } from '@/services/loginService'; // นำเข้าฟังก์ชันส่งสัญญาณ API เพื่อยิงสิทธิ์ยืนยันตัวตนคนไข้
import { showErrorDialog } from '@/utils/webDialog'; // กล่องป็อปอัปแจ้งเตือนกรณีข้อมูลล็อกอินผิดพลาด
import { useRouter } from 'next/navigation'; // โมดูลสำหรับควบคุมระบบนำทางย้ายพาร์ทเพจของ Next.js Navigation
import Image from 'next/image'; // 🛡️ เปลี่ยนมาใช้ Next.js Image เพื่อเพิ่มความเร็วในการดาวน์โหลดหน้าแรก (LCP Optimization)
import PrimaryButton from '@/components/PrimaryButton'; // นำเข้า Shared Component ปุ่มธีมม่วงระนาบส่วนกลาง

export default function LoginPage() {
  const router = useRouter(); // ประกาศเปิดใช้งานระบบควบคุมทิศทางนำทางย้ายหน้าจอ

  // 🛡️ SYSTEM LOCALIZATION: ปรับเปลี่ยนข้อความแจ้งเตือนความถูกต้องฟอร์มหน้าบ้านเป็นภาษาไทยให้เป็นมาตรฐานเดียวกับระบบ
  const validationSchema = Yup.object({
    email: Yup.string().email('รูปแบบอีเมลไม่ถูกต้อง').required('กรุณากรอกอีเมล'),
    password: Yup.string().required('กรุณากรอกรหัสผ่าน'),
  });

  /**
   * @description ฟังก์ชัน Asynchronous ควบคุมลูปขั้นตอนการยืนยันตัวตนและการกระจายสิทธิ์ (Dynamic Routing)
   * @principles Guard Clauses - ตัดจบเงื่อนไขพัง | Dynamic Authorization - เช็กสิทธิ์จริงจากหลังบ้าน ป้องกันช่องโหว่ Hardcode
   */
  const handleAuthSubmit = async (values) => {
    try {
      // ⏳ ยิงพารามิเตอร์ Payload ไปตรวจสอบสิทธิ์ที่เซิร์ฟเวอร์หลังบ้านผ่าน Method Asynchronous
      const response = await login(values.email, values.password);

      // 🚨 GUARD CLAUSE: หากเซิร์ฟเวอร์ตรวจสอบแล้วไม่ผ่าน สั่งดีดป็อปอัปแจ้งข้อผิดพลาดและตัดวงจรการทำงานทันที
      if (!response || !response.result) {
        showErrorDialog(response ? response.message : "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return; // ตัดจบกระบวนการทำงานทันที โค้ดบรรทัดล่างจะไม่ถูกรันต่อ
      }

      // ทำการจัดเก็บข้อมูลโปรไฟล์ผู้ใช้งานและ Token สิทธิ์ลงหน่วยความจำเครื่อง (LocalStorage)
      localStorage.setItem('user', JSON.stringify(response.data));
      
      // 🎯 DYNAMIC AUTHORIZATION ROUTING: ดึงค่าบทบาทจริงจากระบบฐานข้อมูลหลังบ้านมาเช็ก ป้องกันช่องโหว่ความปลอดภัย
      const userRole = response.data.role_name; 
      
      if (userRole === 'admin') {
        router.push('/admin'); // หากเป็นผู้ดูแลระบบ ส่งเข้าห้องควบคุมกลาง Dashboard แอดมิน
      } else {
        router.push('/home'); // หากเป็นผู้ใช้งานทั่วไป/คนไข้ ส่งเข้าหน้าหลักระบบบริการประเมินใจ
      }
    } catch (error) {
      showErrorDialog("ระบบเน็ตเวิร์กขัดข้อง ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ในขณะนี้");
    }
  };

  return (
    <div className='flex flex-col justify-center items-center w-full text-center min-h-screen bg-[#D0F8FF] font-sans antialiased text-[#432C81] px-4'>
      
      {/* ส่วนหัวบล็อกข้อความต้อนรับ ปรับน้ำหนักตัวอักษรลงมาเป็น font-semibold คลีน ละมุนตา */}
      <div>
        <div className='text-3xl font-semibold opacity-90'>Welcome to</div>
        <h1 className='text-5xl font-semibold tracking-tight mt-1 text-[#432C81]'>MindBetter</h1>
      </div>
      
      <div className='h-[20px]' />
      
      {/* 🛡️ OPTIMIZED IMAGE PORT: ปรับปรุงการโหลดภาพโลโก้หลักให้รวดเร็วและใช้ Lazy Loading อัตโนมัติ */}
      <div className="relative w-full max-w-[400px] h-[150px]">
        <Image 
          src='/assets/main-logo.png' 
          alt="MindBetter Logo" 
          fill
          sizes="(max-w-768px) 100vw, 400px"
          style={{ objectFit: 'contain' }}
          priority // สั่งให้ดาวน์โหลดภาพหลักด่วนที่สุดเพราะเป็นคอนเทนต์หน้าแรกสุด
        />
      </div>
      
      <div className='h-[40px]' />

      {/* ควบคุมพิกัดแผงฟอร์มผ่านสถาปัตยกรรม Formik */}
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={validationSchema}
        onSubmit={handleAuthSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="flex flex-col items-center gap-3 w-full">
            
            {/* ช่องกรอกข้อมูลอีเมลผู้เข้าใช้งาน */}
            <div className="w-full max-w-[300px]">
              <Field 
                className='w-full rounded-2xl p-[12px] bg-white text-black text-xs md:text-sm font-medium border border-transparent focus:border-[#432C81] outline-none transition-all' 
                name="email" 
                type="email" 
                placeholder="ระบุอีเมลของคุณ"
              />
              {/* ป้ายเตือนเออร์เรอร์ ปรับฟอนต์ลงมาเป็น font-semibold ตาม Spec มินิมอลเรียบร้อย */}
              <ErrorMessage className='text-red-500 text-left text-[11px] font-semibold mt-1 px-2 animate-fade-in' name="email" component="div" />
            </div>
            
            {/* ช่องกรอกข้อมูลรหัสผ่านลับความปลอดภัย */}
            <div className="w-full max-w-[300px]">
              <Field 
                className='w-full rounded-2xl p-[12px] bg-white text-black text-xs md:text-sm font-medium border border-transparent focus:border-[#432C81] outline-none transition-all' 
                name="password" 
                type="password" 
                placeholder="ระบุรหัสผ่านของคุณ"
              />
              <ErrorMessage className='text-red-500 text-left text-[11px] font-semibold mt-1 px-2 animate-fade-in' name="password" component="div" />
            </div>
            
            <div className='h-[5px]' />

            {/* ปุ่มกดยืนยันคำขอส่งฟอร์มเข้าสู่ระบบ */}
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </PrimaryButton>
            
            {/* ทางเลือกลิงก์เปลี่ยนเส้นทางพายูสเซอร์รายใหม่ไปหน้าสมัครบัญชี */}
            <div className="mt-2 text-center text-xs font-semibold text-gray-500 tracking-wide">
              ยังไม่มีบัญชีผู้ใช้งานใช่ไหม?{" "}
              <button 
                type="button"
                onClick={() => router.push('/signup')} 
                className="text-[#432C81] hover:text-[#342163] font-semibold underline transition-colors"
              >
                สมัครสมาชิกที่นี่
              </button>
            </div>

          </Form>
        )}
      </Formik>

      {/* ส่วนขอบแจ้งสิทธิ์แสดงที่ตั้งวิทยาเขตมหาวิทยาลัยอย่างเป็นทางการ */}
      <footer className='absolute bottom-6 text-[10px] text-gray-400 font-semibold tracking-wide'>
        Prince of Songkla University Hatyai Campus
      </footer>
    </div>
  );
}