"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function Navbar({ username, activeMenu }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.replace("/login");
  };

  // จัดการ Dynamic CSS สำหรับเมนูที่ถูกเลือก (Active Menu Line)
  const navLinkClass = (menuName) => `
    font-semibold text-[#432C81] transition-all duration-200 text-xs md:text-sm
    ${activeMenu === menuName ? "opacity-100 underline decoration-2 underline-offset-4 font-black" : "opacity-60 hover:opacity-100"}`.trim();

  return (
    <header className="sticky top-0 z-10 w-full bg-white/90 backdrop-blur-xs border-b border-purple-100 shadow-2xs px-4 md:px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        
        {/* ชื่อผู้ใช้งาน / เอกลักษณ์ของระบบ */}
        <div className="text-sm md:text-base font-black text-[#432C81] tracking-tight">
          👋 Hi {username || "User"}!
        </div>

        {/* แถบเมนูนำทางส่วนกลาง (Navigation) */}
        <nav className="flex items-center gap-4 md:gap-8">
          <button onClick={() => router.push("/home")} className={navLinkClass("home")}>Home</button>
          <button onClick={() => router.push("/assessment")} className={navLinkClass("assessment")}>Assessment</button>
          <button onClick={() => router.push("/history")} className={navLinkClass("history")}>History</button>
        </nav>

        {/* ปุ่มออกจากระบบ */}
        <button
          onClick={handleLogout}
          className="rounded-xl bg-[#432C81] px-4 py-2 text-[10px] md:text-xs font-bold text-white shadow-xs hover:bg-[#342163] active:scale-[0.98] transition-all"
        >
          Logout
        </button>
      </div>
    </header>
  );
}