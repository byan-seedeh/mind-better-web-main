"use client";
import React from "react";

export default function PrimaryButton({ 
  children, 
  onClick, 
  type = "button", 
  disabled = false, 
  variant = "primary",  // primary, secondary, hero
}) {
  
  // 📏 ระยะห่าง (Padding) อย่างน้อย 10-16px และเว้นระยะทัชบน Mobile สูงอย่างน้อย 48px
  const baseStyle = "rounded-2xl font-bold tracking-wide active:scale-[0.98] transition-all duration-200 disabled:opacity-50 text-center flex items-center justify-center font-sans";
  
  // จัดขนาดปุ่มและขนาดฟอนต์ (Typography & Size Scale) ตามหลัก Hierarchy ที่คุณศึกษามา
  const sizes = {
    primary: "w-[300px] py-3 text-sm min-h-[48px] shadow-md",             // ปุ่มหลักมาตรฐาน
    secondary: "w-[300px] py-3 text-sm min-h-[48px] border",             // ปุ่มรองมาตรฐาน
    hero: "w-[320px] py-4 text-base min-h-[54px] shadow-lg text-md"      // ปุ่มเด่นพิเศษบน Hero Area / แบนเนอร์
  };

  // แมตช์สีจากระบบ Palette ในภาพ image_aea691.png
  const variants = {
    primary: "bg-brand-main text-warm-white hover:bg-[#342163]",
    secondary: "bg-warm-white border-purple-100 text-brand-main hover:bg-neutral-light",
    hero: "bg-[#F45CB0] text-warm-white hover:bg-[#e04fa0]" // สำหรับปุ่มเริ่มประเมินหน้าโฮม
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${sizes[variant === "hero" ? "hero" : variant]} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}