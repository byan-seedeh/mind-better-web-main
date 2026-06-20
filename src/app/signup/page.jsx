"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import PrimaryButton from "@/components/PrimaryButton";

// ========================================================
// 1. ISOLATED SUB-COMPONENTS (SoC - Separation of Concerns)
// ========================================================

// ส่วนจัดการการแสดงสถานะแจ้งเตือนข้อผิดพลาดหรือสำเร็จแยกเป็นสัดส่วน
const StatusAlert = ({ type, message }) => {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div className={`mb-4 rounded-xl p-3 text-xs font-bold text-center border animate-fade-in
      ${isError ? "bg-red-50 text-red-500 border-red-100" : "bg-green-50 text-green-600 border-green-100"}`}>
      {isError ? "⚠️" : "🎉"} {message}
    </div>
  );
};

// 🛡️ DRY - ตัวควบคุมช่องกรอกข้อมูลอัจฉริยะชิ้นเดียว เพื่อแชร์ใช้ซ้ำทุกฟิลด์ในหน้าจอ
const InputField = ({ label, type = "text", value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs font-bold mb-1 text-brand-main/80">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-200 bg-[#F6F7FB] px-4 py-2.5 text-xs font-medium text-brand-main outline-none focus:border-brand-main focus:bg-white transition-all duration-200"
    />
  </div>
);

// ========================================================
// 2. PURE VALIDATION LOGIC (TDD & SoC Boundary)
// ========================================================
/**
 * @description ฟังก์ชันบริสุทธิ์ (Pure Function) ตรวจสอบความถูกต้องของข้อมูลก่อนส่งไปหา Server หลังบ้าน
 * @returns {object} { isValid: boolean, errorMsg: string }
 */
const validateSignUpForm = ({ username, firstName, lastName, email, password, confirmPassword }) => {
  if (!username || !firstName || !lastName || !email || !password || !confirmPassword) {
    return { isValid: false, errorMsg: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" };
  }
  if (password !== confirmPassword) {
    return { isValid: false, errorMsg: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน" };
  }
  if (password.length < 4) {
    return { isValid: false, errorMsg: "รหัสผ่านควรมีความยาวอย่างน้อย 4 ตัวอักษร" };
  }
  return { isValid: true, errorMsg: "" };
};

// ========================================================
// 3. MAIN PAGE COMPONENT
// ========================================================
export default function SignUpPage() {
  const router = useRouter();

  // 🎛️ KISS - รวมกลุ่มข้อมูลฟอร์มให้อยู่ใน Object State เดียว ลดการประกาศ useState ฟุ่มเฟือย
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  // ฟังก์ชันอัปเดต State อัจฉริยะแบบ Dynamic
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * @description ฟังก์ชันหลักในการควบคุม Flow ข้อมูลเมื่อผู้ใช้ส่งฟอร์มสมัครสมาชิก
   */
  const handleSignUp = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    // 1. เรียกรัน Logic ตรวจสอบข้อมูล (สอดคล้องกับแนวคิด TDD แยกคำนวณ)
    const validation = validateSignUpForm(formData);
    if (!validation.isValid) {
      setStatus({ type: "error", message: validation.errorMsg });
      return;
    }

    // 2. ส่วนส่งคำขอข้อมูลไปยัง API ของระบบหลังบ้าน (MySQL)
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8080/api/signup", {
        username: formData.username.trim(),
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      if (res.data.result) {
        setStatus({ type: "success", message: "สมัครสมาชิกสำเร็จ! กำลังนำท่านไปหน้าล็อกอิน..." });
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setStatus({ type: "error", message: res.data.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก" });
      }
    } catch (err) {
      console.error("Sign up failure:", err);
      setStatus({ type: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านได้" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-light px-4 py-8 font-sans antialiased text-brand-main">
      <div className="w-full max-w-md rounded-3xl bg-warm-white p-6 md:p-8 shadow-xl border border-purple-50/50">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black tracking-tight text-brand-main">Create Account</h1>
          <p className="text-xs text-gray-400 mt-1 font-medium">สมัครสมาชิกเพื่อเริ่มต้นประเมินและดูแลสุขภาพใจกับ MindBetter</p>
        </div>

        <StatusAlert type={status.type} message={status.message} />

        <form onSubmit={handleSignUp} className="space-y-4">
          <InputField label="ชื่อผู้ใช้งาน (Username)" value={formData.username} onChange={(e) => updateField("username", e.target.value)} placeholder="เช่น byan_seedeh" />

          <div className="grid grid-cols-2 gap-3">
            <InputField label="ชื่อจริง" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder="ชื่อจริง" />
            <InputField label="นามสกุล" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder="นามสกุล" />
          </div>

          <InputField label="อีเมล (Email)" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="example@email.com" />
          <InputField label="รหัสผ่าน (Password)" type="password" value={formData.password} onChange={(e) => updateField("password", e.target.value)} placeholder="กรอกรหัสผ่าน" />
          <InputField label="ยืนยันรหัสผ่าน (Confirm Password)" type="password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" />

          {/* 🛡️ DRY - เรียกใช้กลุ่มปุ่มส่วนกลางคุมสัดส่วนความกว้างสมดุล 300px และสูงขั้นต่ำ 48px */}
          <div className="pt-2 flex flex-col items-center gap-3 w-full">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "กำลังบันทึกข้อมูล..." : "ลงทะเบียนสมาชิก"}
            </PrimaryButton>
            
            <PrimaryButton variant="secondary" onClick={() => router.push("/")}>
              ย้อนกลับหน้าแรก
            </PrimaryButton>
          </div>
        </form>

        <div className="mt-5 text-center text-xs font-semibold text-gray-400">
          มีบัญชีผู้ใช้อยู่แล้ว?{" "}
          <button onClick={() => router.push("/login")} className="text-brand-main underline font-bold hover:text-[#342163]">เข้าสู่ระบบที่นี่</button>
        </div>

      </div>
    </div>
  );
}