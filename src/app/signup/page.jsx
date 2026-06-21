"use client"; 

import React, { useState } from "react"; 
import { useRouter } from "next/navigation"; 
import axios from "axios"; 
import PrimaryButton from "@/components/PrimaryButton"; 

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const PASSWORD_MIN_LENGTH = 4; 

const StatusAlert = ({ type, message }) => {
  if (!message) return null; 
  const isError = type === "error"; 
  return (
    <div className={`mb-4 rounded-xl p-3 text-xs font-semibold text-center border animate-fade-in
      ${isError ? "bg-red-50 text-red-500 border-red-100" : "bg-green-50 text-green-600 border-green-100"}`}>
      {isError ? "⚠️" : "🎉"} {message} 
    </div>
  );
};

const InputField = ({ label, type = "text", value, onChange, placeholder }) => (
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-[#432C81]/80">{label}</label>
    <input
      type={type} 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      className="w-full rounded-xl border border-gray-200 bg-[#F6F7FB] px-4 py-2.5 text-xs font-medium text-[#432C81] outline-none focus:border-[#432C81] focus:bg-white transition-all duration-200"
    />
  </div>
);

export default function SignUpPage() {
  const router = useRouter(); 

  const [formData, setFormData] = useState({
    username: "", first_name: "", last_name: "", email: "", password: "", confirmPassword: ""
  });
  const [loading, setLoading] = useState(false); 
  const [status, setStatus] = useState({ type: "", message: "" }); 

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value })); 
  };

  const handleSignUp = async (e) => {
    e.preventDefault(); 
    setStatus({ type: "", message: "" }); 

    const { username, first_name, last_name, email, password, confirmPassword } = formData;

    if (!username || !first_name || !last_name || !email || !password || !confirmPassword) {
      setStatus({ type: "error", message: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" }); 
      return; 
    }
    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน" }); 
      return; 
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setStatus({ type: "error", message: `รหัสผ่านควรมีความยาวอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร` }); 
      return; 
    }

    setLoading(true); 
    try {
      const res = await axios.post(`${API_BASE_URL}/signup`, {
        username: username.trim(), 
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        password: password
      });

      if (res.data.result) {
        setStatus({ type: "success", message: "สมัครสมาชิกสำเร็จ! กำลังนำท่านไปหน้าล็อกอิน..." }); 
        setTimeout(() => router.push("/login"), 2000); 
      } else {
        setStatus({ type: "error", message: res.data.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก" }); 
      }
    } catch (err) {
      setStatus({ type: "error", message: "ระบบหลังบ้านขัดข้องหรือไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้" });
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF] px-4 py-8 font-sans antialiased text-[#432C81]">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-xl border border-purple-50/50">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#432C81]">Create Account</h1>
          <p className="text-xs text-gray-500 mt-1 font-semibold">สมัครสมาชิกเพื่อเริ่มต้นประเมินและดูแลสุขภาพใจกับ MindBetter</p>
        </div>

        <StatusAlert type={status.type} message={status.message} />

        <form onSubmit={handleSignUp} className="space-y-4">
          <InputField label="ชื่อผู้ใช้งาน (Username)" value={formData.username} onChange={(e) => updateField("username", e.target.value)} placeholder="เช่น byan_seedeh" />

          <div className="grid grid-cols-2 gap-3">
            <InputField label="ชื่อจริง" value={formData.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder="ชื่อจริง" />
            <InputField label="นามสกุล" value={formData.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder="นามสกุล" />
          </div>

          <InputField label="อีเมล (Email)" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="example@email.com" />
          <InputField label="รหัสผ่าน (Password)" type="password" value={formData.password} onChange={(e) => updateField("password", e.target.value)} placeholder="กรอกรหัสผ่าน" />
          <InputField label="ยืนยันรหัสผ่าน (Confirm Password)" type="password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" />

          <div className="pt-2 flex flex-col items-center gap-3 w-full">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "กำลังบันทึกข้อมูล..." : "ลงทะเบียนสมาชิก"}
            </PrimaryButton>
            
            <PrimaryButton type="button" variant="secondary" onClick={() => router.push("/")}>
              ย้อนกลับหน้าแรก
            </PrimaryButton>
          </div>
        </form>

        <div className="mt-5 text-center text-xs font-semibold text-gray-400">
          มีบัญชีผู้ใช้อยู่แล้ว?{" "}
          <button type="button" onClick={() => router.push("/login")} className="text-[#432C81] underline font-semibold hover:text-[#342163]">เข้าสู่ระบบที่นี่</button>
        </div>

      </div>
    </div>
  );
}