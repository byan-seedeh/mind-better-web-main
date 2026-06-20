"use client"; // บ่งชี้ Next.js ให้ประมวลผลไฟล์นี้เป็น Client Component สำหรับควบคุมฝั่งหน้าบ้าน
import React, { useState } from "react"; // นำเข้าเครื่องมือ React hooks สำหรับใช้สแตนด์บายคุมสเตทภายในคอมโพเนนต์
import { useRouter } from "next/navigation"; // นำระบบนำทางเปลี่ยนเส้นทางย่าน Next.js Navigation มาใช้ควบคุมทิศทาง
import axios from "axios"; // นำเข้าท่อส่งข้อมูลกลางเพื่อใช้ติดต่อสื่อสารยิงข้อมูลข้ามระบบหา API หลังบ้าน
import PrimaryButton from "@/components/PrimaryButton"; // นำเข้า Shared Component ปุ่มคุมธีมม่วงระนาบส่วนกลาง

// 🔤 FIXED CONFIG VARIABLES: ดึงตำแหน่งที่อยู่ API ปลายทางออกไปตั้งรับไว้ด้านนอกเพื่อให้ง่ายต่อการสลับ Domain Environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const PASSWORD_MIN_LENGTH = 4; // กำหนดค่าความยาวขั้นต่ำของรหัสผ่านตามนโยบายความปลอดภัยระบบ

// 🛡️ SUB-COMPONENT: กล่องแสดงสถานะแจ้งเตือน Error หรือบันทึกข้อมูลสำเร็จ (คลีนฟอนต์เป็น font-semibold)
const StatusAlert = ({ type, message }) => {
  if (!message) return null; // ลอจิก Guard Clause: หากไม่มีข้อความใดๆ ส่งมา ห้ามวาดเรนเดอร์ Element นี้ทิ้งไว้ใน DOM
  const isError = type === "error"; // ดักจับค่าบูลีนเพื่อแยกแยะระหว่างกล่องเตือนภัยหรือกล่องสำเร็จ
  return (
    <div className={`mb-4 rounded-xl p-3 text-xs font-semibold text-center border animate-fade-in
      ${isError ? "bg-red-50 text-red-500 border-red-100" : "bg-green-50 text-green-600 border-green-100"}`}>
      {isError ? "⚠️" : "🎉"} {message} {/* พ่นไอคอนนำสายตาตามประเภทสัญญานสถานะ */}
    </div>
  );
};

// 🛡️ REUSABLE INPUT FIELD COMPONENT: ช่องกรอกข้อมูลอัจฉริยะแบบแชร์ใช้ซ้ำตามหลัก DRY คลีนฟอนต์เป็น font-semibold
const InputField = ({ label, type = "text", value, onChange, placeholder }) => (
  <div className="space-y-1">
    {/* ป้ายกำกับช่องกรอก ปรับสเกลน้ำหนักความหนาลงมาอยู่ที่ font-semibold เรียบร้อย สบายตา */}
    <label className="block text-xs font-semibold text-[#432C81]/80">{label}</label>
    <input
      type={type} // รองรับ text, email, password ตามการเรียกใช้
      value={value} // ผูกค่าเข้ากับตัวแปรสเตทหลักหน้าบ้าน
      onChange={onChange} // ดักจับเหตุการณ์เมื่อผู้ใช้พิมพ์ข้อความลงช่องเพื่ออัปเดตสเตท
      placeholder={placeholder} // ข้อความแนะนำลอยจางภายในช่อง
      className="w-full rounded-xl border border-gray-200 bg-[#F6F7FB] px-4 py-2.5 text-xs font-medium text-[#432C81] outline-none focus:border-[#432C81] focus:bg-white transition-all duration-200"
    />
  </div>
);

/**
 * @description หน้าจอลงทะเบียนสมาชิกรายใหม่โปรเจกต์ MindBetter
 * @principles จัดกลุ่มสเตทมินิมอล ลดความซ้ำซ้อน และคุม Typography ล้างคลาสแข็งกระด้างออกทั้งหมด
 */
export default function SignUpPage() {
  const router = useRouter(); // ประกาศเปิดใช้ท่อนำทางย้ายหน้าจอเพจ

  // 🎛️ KISS PRINCIPLE: รวบฟิลด์กรอกทั้งหมดลง Object State แผงเดียว เพื่อให้อ่านง่ายและบริหารจัดการสเตทได้คลีน
  const [formData, setFormData] = useState({
    username: "", first_name: "", last_name: "", email: "", password: "", confirmPassword: ""
  });
  const [loading, setLoading] = useState(false); // สเตทล็อกสถานะป้องกันการกดยิงสมัครสมาชิกซ้ำซ้อนเบิ้ลระเบียนข้อมูล
  const [status, setStatus] = useState({ type: "", message: "" }); // สเตทบันทึกสัญญานข้อความแจ้งสถานะระบบ

  // ฟังก์ชันอัปเดตข้อมูลภายในฟิลด์ Object แบบไดนามิกตามรหัสชื่อฟิลด์คีย์คู่กรณี
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value })); // ใช้ Spread Operator ปรับสเตทเฉพาะฟิลด์ที่พิมพ์โดยรักษาค่าช่องอื่นไว้
  };

  // ฟังก์ชัน Asynchronous ควบคุมขั้นตอนการส่งข้อมูลขึ้นไปสมัครสมาชิกลงคลังหลังบ้าน MySQL
  const handleSignUp = async (e) => {
    e.preventDefault(); // สั่งเบรกระงับพฤติกรรมดั้งเดิมของฟอร์ม HTML ไม่ให้รีเฟรชหน้าจอเพจเองออโต้
    setStatus({ type: "", message: "" }); // ล้างค่ากล่องข้อความแจ้งเตือนเดิมออกเพื่อเตรียมรับผลลัพธ์รอบใหม่

    // สกัดแตกตัวแปรภายในฟอร์มออกมาจากโครงสร้าง Object State รวมศูนย์
    const { username, first_name, last_name, email, password, confirmPassword } = formData;

    // 🚨 ROBUST CLIENT VALIDATION PIPELINE: ด่านคัดกรองความถูกต้องข้อมูลก่อนส่งออกข้ามเน็ตเวิร์ก
    if (!username || !first_name || !last_name || !email || !password || !confirmPassword) {
      setStatus({ type: "error", message: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" }); // พ่นป้าย Error เตือนกรอกข้อมูลหลุดหล่น
      return; // สั่งตัดลูปการทำงานทันทีตามหลัก Guard Clause ป้องกันโค้ดไหลไปบรรทัดล่าง
    }
    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน" }); // สกัดกรณีพิมพ์คอนเฟิร์มรหัสพลาด
      return; // ตัดจบกระบวนการ
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setStatus({ type: "error", message: `รหัสผ่านควรมีความยาวอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร` }); // ตรวจสอบความปลอดภัยตามเกณฑ์นโยบาย
      return; // ตัดจบกระบวนการ
    }

    setLoading(true); // ปรับสเตทหลอดโหลดเป็นบวก เพื่อล็อกปุ่มกดปิดโอกาสยูสเซอร์กดเบิ้ลข้อมูลซ้ำซ้อน
    try {
      // ⏳ สั่งสตรีมมิ่งข้อมูล Asynchronous ส่ง Payload ผ่านเมธอด POST ไปที่ปลายทางเซิร์ฟเวอร์หลังบ้าน
      const res = await axios.post(`${API_BASE_URL}/signup`, {
        username: username.trim(), // ล้างช่องว่างส่วนเกินหัวท้ายสตริง (Sanitize String)
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        password: password
      });

      // หากฝั่งฐานข้อมูลตรวจสอบและคอมมิต Commit ลงตารางบัญชีสำเร็จเรียบร้อย
      if (res.data.result) {
        setStatus({ type: "success", message: "สมัครสมาชิกสำเร็จ! กำลังนำท่านไปหน้าล็อกอิน..." }); // พ่นป้ายข้อความสำเร็จสีเขียว
        setTimeout(() => router.push("/login"), 2000); // ดีเลย์หน่วงเวลาสายตาไว้ 2 วินาทีเพื่อให้ยูสเซอร์อ่านคำแจ้งเตือนก่อนดีดไปหน้าล็อกอิน
      } else {
        setStatus({ type: "error", message: res.data.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก" }); // แสดงคำปฏิเสธจากฝั่งเซิร์ฟเวอร์
      }
    } catch (err) {
      // ดักจับกรณีสัญญาณเน็ตเวิร์กขาดหาย หรือเซิร์ฟเวอร์ Express ขัดข้องล่มกลางคัน
      setStatus({ type: "error", message: "ระบบหลังบ้านขัดข้องหรือไม่สามารถเชื่อมต่อคลาวด์ฐานข้อมูลได้ในขณะนี้" });
    } finally {
      setLoading(false); // ปลดล็อกปุ่มกดคืนค่าสเตทปกติเมื่อท่อประมวลผลทำงานเสร็จสิ้นสมบูรณ์
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF] px-4 py-8 font-sans antialiased text-[#432C81]">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-xl border border-purple-50/50">
        
        {/* บล็อกข้อความหัวเรื่องหลัก ปรับน้ำหนักฟอนต์จาก font-black ลงมาเป็น font-semibold คลีน สวย ละมุนตา */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#432C81]">Create Account</h1>
          <p className="text-xs text-gray-500 mt-1 font-semibold">สมัครสมาชิกเพื่อเริ่มต้นประเมินและดูแลสุขภาพใจกับ MindBetter</p>
        </div>

        {/* เรียกเรนเดอร์คอมโพเนนต์ย่อยแสดงแถบป้ายเตือนความถูกต้องสถานะฟอร์ม */}
        <StatusAlert type={status.type} message={status.message} />

        {/* ฟอร์มรับข้อมูลสลักดักทิศทางการกดยืนยันผ่าน handleSignUp */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <InputField label="ชื่อผู้ใช้งาน (Username)" value={formData.username} onChange={(e) => updateField("username", e.target.value)} placeholder="เช่น byan_seedeh" />

          {/* แตก Layout เป็น 2 คอลัมน์สมมาตรซ้ายขวาสำหรับจัดวางช่องชื่อจริงและนามสกุลคู่กัน */}
          <div className="grid grid-cols-2 gap-3">
            <InputField label="ชื่อจริง" value={formData.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder="ชื่อจริง" />
            <InputField label="นามสกุล" value={formData.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder="นามสกุล" />
          </div>

          <InputField label="อีเมล (Email)" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="example@email.com" />
          <InputField label="รหัสผ่าน (Password)" type="password" value={formData.password} onChange={(e) => updateField("password", e.target.value)} placeholder="กรอกรหัสผ่าน" />
          <InputField label="ยืนยันรหัสผ่าน (Confirm Password)" type="password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" />

          <div className="pt-2 flex flex-col items-center gap-3 w-full">
            {/* ปุ่มหลักคำสั่งส่งข้อมูลคัดกรองลงทะเบียน */}
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "กำลังบันทึกข้อมูล..." : "ลงทะเบียนสมาชิก"}
            </PrimaryButton>
            
            {/* 🎯 BUG FIX: สลักคีย์เพิ่ม type="button" เพื่อจำแนกบริบทเด็ดขาด ไม่ให้ปุ่มย้อนกลับไปสับสนรันฟังก์ชัน Submit ฟอร์ม */}
            <PrimaryButton type="button" variant="secondary" onClick={() => router.push("/")}>
              ย้อนกลับหน้าแรก
            </PrimaryButton>
          </div>
        </form>

        {/* แผงข้อความทางเลือกนำทางส่วนท้ายการ์ด ปรับแต่งฟอนต์หนาเท่ากันหมดเพื่อความเรียบร้อยมินิมอล */}
        <div className="mt-5 text-center text-xs font-semibold text-gray-400">
          มีบัญชีผู้ใช้อยู่แล้ว?{" "}
          <button type="button" onClick={() => router.push("/login")} className="text-[#432C81] underline font-semibold hover:text-[#342163]">เข้าสู่ระบบที่นี่</button>
        </div>

      </div>
    </div>
  );
}