"use client"; // บ่งชี้ให้ Next.js ทราบว่าไฟล์นี้เป็น Client Component สำหรับควบคุมหน้าบ้านและตรวจจับ UI หน้าจอ
import React, { useEffect, useMemo, useState } from "react"; // นำเข้าโมดูล Core Hooks ของ React สำหรับควบคุมสเตทความมีอยู่
import { useRouter } from "next/navigation"; // นำเข้าโมดูลช่วยคุมเส้นทางเดินและเปลี่ยนหน้าจอ (Routing) ของหน้าต่างเว็บ
import { useAuthen } from "@/utils/useAuthen"; // นำเข้าโมดูลคำสั่งดักฟังสถานะสิทธิ์ตรวจสอบการเข้าระบบโปรไฟล์ผู้ใช้งาน
import axios from "axios"; // นำเข้าไลบรารีท่อส่งข้อมูลหลักสำหรับการสื่อสารพูดคุยกับฝั่งหลังบ้าน API
import Navbar from "@/components/Navbar"; // นำเข้าแชร์แถบเมนูด้านบนส่วนกลางเพื่อความเป็นระเบียบเรียบร้อยของ UI

// 🔤 FIXED CODE TO VARIABLE: ถอดลิงก์ URL ที่เคยเขียนฝังตรงๆ ออกไปเก็บไว้ในค่าคงที่เพื่อง่ายเวลาขึ้นระบบจริง (Production Ready)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// ลงทะเบียนชื่อรหัสสถานะความลาดชันปลายทางสำหรับคุมลอจิกการเปลี่ยนฟอร์มอัจฉริยะของแอปพลิเคชันตามคำสั่งหลังบ้าน
const ROUTING_ACTIONS = {
    NAV_9Q: "9q", // รหัสส่งต่อไปฟอร์มประเมินโรคซึมเศร้า 9Q
    NAV_8Q: "8q", // รหัสส่งต่อไปฟอร์มเฝ้าระวังฆ่าตัวตาย 8Q
    NAV_HOME: "home" // รหัสส่งกลับหน้า Dashboard แรกสุดหลังทำเสร็จสิ้น
};

// ลงทะเบียนค่าคงที่เกณฑ์ตัวเลขระดับชั้นคะแนนโรคซึมเศร้า 9Q เพื่อขจัดปัญหารหัส Magic Numbers ฝังลึก
const PHQ9_UI_LIMITS = { MIN: 7, MID: 12, HIGH: 18 };

export default function AssessmentPage() {
  const router = useRouter(); // ประกาศใช้งานระบบควบคุมการนำทางและสั่งเปลี่ยนย้ายหน้าเพจ Next.js
  const { isLoading, authenticated } = useAuthen(); // แตก State ตรวจสอบความพร้อมของเซสชันและข้อมูลล็อกอินบัญชีผู้ใช้

  // กำหนดสถานะโหมดหน้าจอ: 'menu' = เลือกประเภทฟอร์ม, '2q'/'9q'/'8q' = ตัวรหัสแบบทดสอบที่กำลังดำเนินการอยู่
  const [currentForm, setCurrentForm] = useState("menu");
  // สเตทสำหรับจัดเก็บก้อนอาเรย์ชุดประโยคข้อคำถามย่อยทางการแพทย์ที่ยิงดึงมาจากฐานข้อมูล MySQL 
  const [questions, setQuestions] = useState([]);
  // สเตทสำหรับเก็บก้อนตัวเลือกช้อยส์คำตอบรายข้อและแต้มคะแนนดิบประจำช้อยส์ (เช่น ไม่มี=0, มี=1)
  const [choices, setChoices] = useState([]);
  // สเตทคุมการขึ้นป้าย Loading หมุนๆ ตอนหน้าบ้านกำลังส่งสัญญาณกวาดดึงชุดข้อคำถามย่อย
  const [formLoading, setFormLoading] = useState(false);

  // สเตทควบคุมลำดับขั้นข้อคำถามในปัจจุบัน (เริ่มนับสตาร์ทจากดัชนีข้อที่ 0 เป็นข้อคำถามแรกสุด)
  const [step, setStep] = useState(0);                 
  // อาเรย์สเตทหลักประจำหน้าจอสำหรับจัดเก็บคะแนนดิบตัวเลขคำตอบรายข้อที่คนไข้กดเลือกส่งมา
  const [answers, setAnswers] = useState([]);
  // สเตทควบคุมการสลับสับโหมดแสดงผลหน้าจอไปโชว์กระดานแผงสรุปแต้มคะแนนสะสมเบื้องต้น
  const [showResult, setShowResult] = useState(false); 
  // สเตทล็อกปุ่มกดส่งคะแนนชั่วคราว ป้องกันผู้ใช้กดย้ำๆ ตอนสัญญาณช้าจนเกิดข้อมูลเบิ้ลซ้ำใน MySQL
  const [saving, setSaving] = useState(false);
  // 🚨 ERROR HANDLING ON FRONTEND: สเตทจัดการ Error Message เพื่อเอาไว้พ่นแจ้งเตือนปัญหาระบบเน็ตล่มบนกระดาน UI
  const [uiError, setUiError] = useState("");

  // ด่านคัดกรองความปลอดภัยขั้นต้น: คอยดักฟังสถานะ หากตรวจเจอว่าผู้ใช้ยังไม่ได้ล็อกอิน ให้ดีดส่งไปหน้า /login ทันที
  useEffect(() => {
    if (!isLoading && !authenticated) router.replace("/login");
  }, [isLoading, authenticated, router]);

  // ⏳ CONCURRENCY Engine: ฟังก์ชันเรียกเปิดฟอร์มและ Fetch โครงสร้างข้อมูลแบบประเมินย่อด้วยรูปแบบ Async/Await คลีนที่สุด
  const startAssessment = async (code) => {
    setFormLoading(true); // สั่งเปิดม่านสถานะโหลดหมุนๆ บังหน้าจอไว้ก่อนเพื่อความนุ่มนวลในการเปลี่ยนผ่าน UI
    setUiError("");      // ทำความสะอาดและเคลียร์ข้อความเตือน Error ระบบของเก่าที่เคยค้างอยู่ให้เกลี้ยง
    try {
      // ⏳ ยิงคำขอ Asynchronous ข้ามเน็ตไปดึงชุดคำถามมาจากคลังหลังบ้านคลาวด์ผ่านตัวแปร Base URL
      const res = await axios.get(`${API_BASE_URL}/assessment/form/${code}`);
      // ดักเช็กข้อมูล: หากผลลัพธ์จากเซิร์ฟเวอร์แจ้งสัญญานยืนยันกลับมาว่าประมวลผลผ่านฉลุย
      if (res.data.result) {
        setQuestions(res.data.data.questions); // บรรจุชุดประโยคข้อคำถามย่อยลง State คำถามหลัก
        setChoices(res.data.data.choices);     // บรรจุชุดข้อมูลตัวเลือกช้อยส์คะแนนลง State ช้อยส์
        setAnswers(Array(res.data.data.questions.length).fill(null)); // 🧠 ลอจิกฉลาด: สร้างอาเรย์ช่องว่างรองรับคะแนนรอไว้ล่วงหน้าตามจำนวนข้อจริง
        setStep(0);                            // รีเซ็ตลำดับการเดินข้อคำถามย้อนกลับไปตั้งต้นที่คำถามข้อแรกสุดเสมอ
        setShowResult(false);                  // สั่งปิดเพจกระดานหน้าจอแผงสรุปแต้มคะแนนลงชั่วคราว
        currentForm === code ? null : setCurrentForm(code); // อัปเดตบอกระบบหน้าบ้านว่าปัจจุบันแอปพลิเคชันกำลังขับเคลื่อนอยู่ในฟอร์มรหัสใด
      } else {
        // หากเซิร์ฟเวอร์ส่งสัญญาณข้อมูลกลับมาไม่ตรงสเปก ให้ทำลายกระบวนการและโยน Error ออกไปหาบล็อก Catch
        throw new Error(res.data.message || "โครงสร้างแบบฟอร์มผิดพลาด");
      }
    } catch (err) {
      // 🚨 Error Handling ด่านหน้าบ้าน: เก็บข้อความระบุปัญหาเน็ตเวิร์กลงสเตทเพื่อนำไปพ่นสีแดงบอกคนไข้บนหน้าจอ
      setUiError("เกิดปัญหาในการดึงชุดคำถามแพทย์จากฐานข้อมูล กรุณาลองใหม่อีกครั้ง");
      console.error("Load form error:", err); // พ่นประวัติเออร์เรอร์เก็บลง Console สำหรับโปรแกรมเมอร์ไว้ตรวจสอบซ่อม
    } finally {
      setFormLoading(false); // สั่งปิดม่านสถานะโหลดหมุนๆ ดักหน้าจอออกเสมอไม่ว่าสัญญาณคำขอจะสำเร็จหรือพัง
    }
  };

  // ฟังก์ชันควบคุมลอจิกข้อมูลเมื่อคนไข้กดจิ้มคลิกตัวเลือกปุ่มคะแนนช้อยส์ในข้อปัจจุบัน
  const handleAnswerSelect = (scoreValue) => {
    const cp = [...answers]; // ทำการโคลนนิ่งชุดอาเรย์คำตอบเดิมออกมาเป็นก้อนก้อนใหม่ (ป้องกัน State ดั้งเดิมเกิดการกลายพันธุ์)
    cp[step] = scoreValue;   // นำคะแนนช้อยส์ประจำข้อที่คนไข้จิ้มเข้าไปบรรจุสวมแทนที่ดัชนีตำแหน่งข้อปัจจุบัน
    setAnswers(cp);          // เซ็ตคำสั่งบันทึกอาเรย์ชุดอัปเดตใหม่ล่าสุดกลับคืนสเตทหลักหน้าจอ
  };

  // 1. VARIABLE SIMPLIFICATION: ใช้คำนวณสภาวะแบบเส้นตรงเพื่อลดความรุงรังของหน่วยความจำสเตท
  const isLast   = step === questions.length - 1; // ตัวแปรบูลีนดักจับว่าปัจจุบันผู้ใช้เดินทางมาทำถึงคำถามข้อสุดท้ายแล้วหรือยัง
  const canNext  = typeof answers[step] === "number"; // ตัวแปร Guard Clause ดักเช็กว่าข้อคำถามปัจจุบันผู้ใช้งานทำการเลือกกดตอบแล้วหรือยัง
  const progress = questions.length > 0 ? Math.round(((step + 1) / questions.length) * 100) : 0; // คำนวณเปอร์เซ็นต์ความคืบหน้าหลอดพลัง

  // 🧩 FUNCTION / MEMOIZATION: ใช้ useMemo คุมการรวมคะแนนดิบสะสมรวม เพื่อป้องกันหน้าจอคำนวณซ้ำซ้อนโดยไม่จำเป็น
  const totalScore = useMemo(
    () => answers.reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0),
    [answers]
  );

  // 🧩 BEAUTIFUL FUNCTION: เกลาลอจิกจัดระเบียบกลุ่มคัดแยกข้อความระดับความรุนแรงหน้าบ้านให้โปร่งตาและเรียกใช้งาน Configuration Tokens
  const getUiSeverityText = (score) => {
    if (currentForm === "2q") return score > 0 ? "มีความเสี่ยงภาวะซึมเศร้า" : "ปกติ"; // ลอจิกประเมินตัดเกณฑ์กรณีทำฟอร์มย่อ 2Q
    if (currentForm === "8q") { // กลไกเงื่อนไขจำแนกระดับสภาวะแนวโน้มการทำร้ายตัวเองประจำฟอร์ม 8Q
      if (score === 0) return "ไม่มีแนวโน้มฆ่าตัวตาย";
      if (score <= 8) return "แนวโน้มฆ่าตัวตายระดับน้อย";
      if (score <= 16) return "แนวโน้มฆ่าตัวตายระดับปานกลาง";
      return "แนวโน้มฆ่าตัวตายระดับรุนแรง";
    }
    // กลไกเงื่อนไขจำแนกโรคซึมเศร้าประจำฟอร์มหลัก 9Q โดยนำตัวแปร Token คงที่มาใช้เปรียบเทียบ
    if (score < PHQ9_UI_LIMITS.MIN) return "ไม่มีอาการหรือระดับน้อยมาก (< 7)";
    if (score <= PHQ9_UI_LIMITS.MID) return "มีอาการระดับน้อย (7–12)";
    if (score <= PHQ9_UI_LIMITS.HIGH) return "มีอาการระดับปานกลาง (13–18)";
    return "มีอาการระดับรุนแรง (≥ 19)";
  };

  // ฟังก์ชันควบคุมขั้นตอนการกดปุ่มสั่งสลับเปลี่ยนข้อคำถามย่อยขยับไปข้างหน้าทีละข้อ
  const handleNextStep = () => {
    if (!canNext) return; // ด่านความปลอดภัยสูงสุด: ถ้าข้อปัจจุบันยังไม่กดจิ้มคำตอบ ห้ามปล่อยให้ข้ามข้อเด็ดขาด
    if (isLast) {
      setShowResult(true); // หากคำนวณแล้วว่าเป็นคำถามข้อสุดท้าย ให้สั่งเปิดแผงหน้าจอแผงสรุปยอดแต้มคำตอบขึ้นมาทันที
      window.scrollTo({ top: 0, behavior: "smooth" }); // สั่งเลื่อนเพจสกอลบาร์ขึ้นหัวแถวเพจแบบนุ่มนวลเพื่อเปลี่ยนมุมมองสายตา
    } else {
      setStep((s) => s + 1); // หากยังไม่ถึงข้อสุดท้าย ให้บวกเพิ่มตัวเลขตำแหน่งข้อขึ้น 1 สเต็ปเพื่อก้าวไปข้อถัดไป
    }
  };

  // ฟังก์ชันระดับหัวใจหลัก: ควบคุมการกดส่งคะแนนรอบสุดท้ายเพื่อยิงเซฟลง MySQL และแกะกล่องอ่านทิศทางส่งต่อคนไข้ (Rule Engine)
  const saveAndGoNext = async () => {
    setSaving(true);   // ล็อกสถานะปุ่มส่งข้อมูลทันที ป้องกันผู้ใช้กดย้ำเบิ้ลส่งคำขอซ้ำซ้อนเข้าเซิร์ฟเวอร์ตอนเน็ตหน่วง
    setUiError("");    // ล้างและปัดกวาดป้ายข้อความข้อผิดพลาดระบบอันเก่าออกจากแผง UI
    try {
      // ทำการจัดชุดห่อก้อน Payload โครงสร้างเชิงสัมพันธ์ส่งข้ามระบบไปหา API
      const payload = {
        user_id: authenticated?.user_id ?? null, // แนบรหัสประจำตัวไอดีผู้ใช้ที่กำลังล็อกอินทำแบบประเมินอยู่
        assessment_code: currentForm,           // แนบรหัสระบุประเภทแบบคัดกรองทางการแพทย์
        answers: answers,                       // แนบก้อนชุดอาเรย์คะแนนคำตอบดิบรายข้อครบถ้วนทุกช่อง
      };
      
      // ⏳ สั่งยิงข้อมูลข้ามระบบแบบ Asynchronous วิ่งตรงไปหาประตูทางเข้าฐานข้อมูลหลังบ้านตามตัวแปร API คอนฟิก
      const res = await axios.post(`${API_BASE_URL}/assessment/save`, payload);

      // ดักฟังผลลัพธ์: หากเซิร์ฟเวอร์หลังบ้านยืนยันผลกลับมาว่าทำการประมวลผลเซฟลงตารางข้อมูลเสร็จสมบูรณ์
      if (res.data.result) {
        const nextAction = res.data.data.next_action; // สกัดดึงคำสั่งนำทางส่งตัวคนไข้ (next_action) ออกมาจากผลลัพธ์หลังบ้าน
        
        // 🧠 CLINICAL WORKFLOW LOGIC: ตรวจเช็กคำสั่งสลับฟอร์มอัตโนมัติ (เช่น 2Q ตรวจเจอความเสี่ยง ต้องพาเข้า 9Q ทันทีต่อเนื่อง)
        if (nextAction === ROUTING_ACTIONS.NAV_9Q || nextAction === ROUTING_ACTIONS.NAV_8Q) {
          // เด้งกล่องข้อความเตือนให้ผู้ใช้งานรับทราบมาตรการคัดกรองต่อเนื่องตามเกณฑ์ของกระทรวงสาธารณสุข
          alert(`ผลการวิเคราะห์พบความเสี่ยง ระบบจะนำท่านเข้าสู่การทำแบบประเมิน ${nextAction.toUpperCase()} ต่อเนื่อทันทีตามเกณฑ์ สธ.`);
          startAssessment(nextAction); // สั่งรันลูปฟังก์ชัน Fetch ดึงข้อคำถามฟอร์มระดับสูงขึ้นมาสวมทับในหน้าจอทันทีอย่างไร้รอยต่อ
        } else {
          // หากไม่มีเงื่อนไขอันตรายแทรกแซง ให้สั่งระบบเปิดกล่องนำทางผู้ใช้ไปยังหน้าเป้าหมายปกติที่หลังบ้านสั่งการมา
          router.replace(nextAction === ROUTING_ACTIONS.NAV_HOME ? "/home" : "/history");
        }
      } else {
        // ดีด Error แจ้งข้อผิดพลาดระบบกรณีหลังบ้านส่งข้อมูลขัดข้องกลับมา
        throw new Error(res.data.message || "เซิร์ฟเวอร์ปฏิเสธการยืนยันข้อมูล");
      }
    } catch (error) {
      // 🚨 Robust Error Handling: จัดเก็บข้อความเน็ตหลุดลง State เพื่อพ่นป้ายเตือนกรอบสีแดงแจ้งคนไข้บนหน้าจอ
      setUiError("ระบบไม่สามารถส่งผลคะแนนได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      console.error("Save failed:", error); // บันทึกข้อผิดพลาด Technical Log ลงตัวเครื่องไว้ตรวจสอบซ่อมแซม
    } finally {
      setSaving(false); // ปลดล็อกสเตทปุ่มกดส่งข้อมูลให้กลับมาเปิดให้ใช้งานกดได้ปกติเสร็จสิ้นกระบวนการ
    }
  };

  // ดักฟังระบบ: หากเพจแอปยังซิงค์ค่าผู้ใช้ไม่เสร็จสิ้น หรือกำลังปั่นดึงชุดข้อมูลคำถาม ให้ขึ้นม่านโหลดดักหน้าจอไว้ก่อน
  if (isLoading || formLoading) return <div className="flex min-h-screen items-center justify-center bg-primary-light">Loading...</div>;

  return (
    <div className="min-h-screen w-full bg-primary-light font-sans antialiased text-brand-main">
      {/* 🛡️ DRY: เรียกแชร์ Navbar เมนูกลาง คุมโทนระบบสีพาสเทลและฟอนต์ Poppins สม่ำเสมอเท่ากันทุกหน้าจอ */}
      <Navbar username={authenticated?.username} activeMenu="assessment" />
      
      <div className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl rounded-3xl bg-warm-white p-6 sm:p-10 shadow-xl border border-purple-50/40">
          
          {/* กรอบพ่นแถบคำเตือนสีแดงแจ้ง Error บนกระดาน UI กรณีระบบเน็ตเวิร์กขาดหายหรือฐานข้อมูลล่ม */}
          {uiError && (
            <div className="mb-4 rounded-xl p-3 bg-red-50 text-red-600 border border-red-100 text-xs font-bold text-center animate-fade-in">
              ⚠️ {uiError}
            </div>
          )}

          {/* ========================================================
              SCREEN PANEL 1: MENU SELECTION (หน้าหลักสำหรับเลือกเปิดชุดฟอร์มประเมิน)
              ======================================================== */}
          {currentForm === "menu" && (
            <div className="space-y-8 text-center">
              <div>
                <h2 className="text-3xl font-black text-brand-main tracking-tight">เลือกแบบประเมินสุขภาพใจ</h2>
                <p className="mt-2 text-gray-400 text-xs font-medium">... โปรดเลือกแบบประเมินที่ต้องการทดสอบ เพื่อความแม่นยำในการวิเคราะห์ผลลัพธ์ ...</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
                {[
                  { id: "2q", title: "แบบคัดกรองโรคซึมเศร้า 2Q", desc: "แบบประเมินเบื้องต้นเพื่อคัดกรองความเสี่ยงภาวะซึมเศร้าอย่างรวดเร็ว", bg: "bg-[#E3F9FD]", border: "border-blue-100", text: "text-[#1E74FD]" },
                  { id: "9q", title: "แบบประเมินโรคซึมเศร้า 9Q (PHQ-9)", desc: "แบบประเมินระดับความรุนแรงของภาวะซึมเศร้าตามเกณฑ์มาตรฐาน สธ.", bg: "bg-[#F4F0FF]", border: "border-purple-100", text: "text-brand-main" },
                  { id: "8q", title: "แบบประเมินการฆ่าตัวตาย 8Q", desc: "แบบประเมินเพื่อเฝ้าระวังความเสี่ยงและแนวโน้มการทำร้ายตัวเอง", bg: "bg-[#FFF0F3]", border: "border-red-100", text: "text-[#E43D84]" }
                ].map((item) => (
                  <div key={item.id} className={`flex flex-col justify-between rounded-2xl p-5 border ${item.bg} ${item.border} shadow-2xs`}>
                    <div>
                      <h3 className={`font-black text-base mb-2 ${item.text}`}>{item.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed mb-6">{item.desc}</p>
                    </div>
                    <button onClick={() => startAssessment(item.id)} className="w-full py-2.5 bg-white text-brand-main border border-purple-50 rounded-xl text-xs font-black shadow-3xs hover:bg-gray-50 cursor-pointer transition-colors text-center">เริ่มประเมิน →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              SCREEN PANEL 2: ACTIVE QUESTION STEP (แผงหน้ากระดานตอบข้อคำถามย่อยทีละข้อ)
              ======================================================== */}
          {!showResult && currentForm !== "menu" && questions[step] && (
            <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
              {/* แถบหลอดวัดระดับความคืบหน้าเชิงตัวเลขร้อยละเปอร์เซ็นต์ */}
              <div className="mb-2">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-gray-400">
                  <span>ข้อ {step + 1} / {questions.length}</span>
                  <span>ความคืบหน้า {progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-light overflow-hidden">
                  <div className="h-full bg-brand-main transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* โจทย์ประโยคคำถามทางการแพทย์ประจำสเต็ปปัจจุบัน */}
              <h3 className="text-base sm:text-lg font-black leading-relaxed text-brand-main">
                ข้อ {questions[step].question_number}. {questions[step].question_text}
              </h3>

              {/* รายการปุ่มช้อยส์คะแนนคำตอบรายข้อ คุมความกว้างสมดุลและสัดส่วนสัมผัส */}
              <div className="grid gap-2 pt-2">
                {choices.map((c) => (
                  <div key={c.score}>
                    {/* 📏 MOBILE TOUCH TARGET LOGIC: ล็อกความสูงขั้นต่ำอย่างน้อย 48px เพื่อให้ใช้นิ้วกดทัชสกรีนได้แม่นยำและง่ายที่สุด (ย้ายคอมเมนต์ออกมานอกแท็กเรียบร้อยครับ) */}
                    <button
                      onClick={() => handleAnswerSelect(c.score)}
                      className={`w-full min-h-[48px] rounded-xl border px-4 py-3 text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${answers[step] === c.score ? "border-brand-main bg-[#EFEAFE] text-brand-main" : "border-transparent bg-[#F6F7FB] hover:bg-purple-50/50"}`}
                    >
                      {c.choice_text} ({c.score} คะแนน)
                    </button>
                  </div>
                ))}      
              </div>

              {/* บล็อกชุดปุ่มนำทางกดย้อนกลับและการเดินหน้าข้อถัดไป */}
              <div className="mt-8 pt-4 border-t flex items-center justify-between gap-3">
                <button onClick={() => step > 0 ? setStep(s => s - 1) : setCurrentForm("menu")} className="rounded-xl border bg-white px-5 py-2.5 text-xs font-bold text-brand-main shadow-3xs cursor-pointer">ย้อนกลับ</button>
                {/* ปุ่มถัดไปจะถูก Disable ปิดตายอัตโนมัติหาก CanNext ตรวจเจอว่าคนไข้ยังไม่ได้เลือกจิ้มช้อยส์ในข้อปัจจุบัน */}
                <button onClick={handleNextStep} disabled={!canNext} className="rounded-xl bg-brand-main text-white px-6 py-2.5 text-xs font-bold disabled:opacity-30 cursor-pointer shadow-sm">
                  {isLast ? "ดูผลลัพธ์" : "ถัดไป →"}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              SCREEN PANEL 3: SUMMARY OVERVIEW PANEL (หน้าแผงสรุปแต้มคะแนนและวิเคราะห์ขั้นต้น)
              ======================================================== */}
          {showResult && (
            <div className="space-y-5 text-center max-w-xl mx-auto py-4 animate-fade-in">
              <h2 className="text-xl font-black text-brand-main">สรุปผลเบื้องต้นของชุดคำถาม {currentForm.toUpperCase()}</h2>

              {/* การ์ดนำเสนอตัวเลขสรุปผลคะแนนดิบสะสมรวมและระดับชั้นจำแนกอาการ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl bg-[#E6F7FF] p-4 border border-blue-100">
                  <div className="text-[11px] font-bold text-brand-main/70">คะแนนสะสมดิบรวม</div>
                  <div className="text-3xl font-black text-brand-main mt-1">{totalScore} คะแนน</div>
                </div>
                <div className="rounded-2xl bg-[#F5F0FF] p-4 border border-purple-100">
                  <div className="text-[11px] font-bold text-brand-main/70">วิเคราะห์ภาวะขั้นต้น</div>
                  <div className="text-sm font-black text-brand-main mt-2 leading-tight">{getUiSeverityText(totalScore)}</div>
                </div>
              </div>

              {/* ชุดปุ่มกดสั่งการยืนยันผลเพื่อทำความสะอาดและยัด Payload วิ่งไปหาหลังบ้านเซฟลง MySQL */}
              <div className="mt-8 pt-4 border-t flex justify-center gap-3">
                <button onClick={() => setShowResult(false)} className="rounded-xl border bg-white px-5 py-2.5 text-xs font-bold text-brand-main shadow-3xs cursor-pointer">แก้ไขคำตอบ</button>
                <button onClick={saveAndGoNext} disabled={saving} className="rounded-xl bg-brand-main text-white px-6 py-2.5 text-xs font-bold shadow-md hover:bg-[#342163] cursor-pointer">
                  {saving ? "กำลังบันทึก..." : "💾 ยืนยันผลและไปต่อ"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}