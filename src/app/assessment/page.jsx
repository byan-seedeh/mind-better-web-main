"use client"; // บ่งชี้โครงสร้าง Client Module หน้าบ้านสำหรับควบคุมคอนโทรลเลอร์ UI และการจัดการ Event
import React, { useEffect, useState } from "react"; // นำเข้าโมดูล Core Hooks พลังคำนวณและจัดการสเตทของ React
import { useRouter } from "next/navigation"; // นำเข้าเครื่องมือชุดคำสั่งช่วยนำทางเปลี่ยนพาร์ทหน้าเพจของ Next.js
import { useAuthen } from "@/utils/useAuthen"; // นำเข้าโมดูลคำสั่งดักฟังสถานะและพิสูจน์สิทธิ์เข้าใช้งานระบบโปรไฟล์ผู้ใช้
import Navbar from "@/components/Navbar"; // 🛡️ DRY - เรียกนำเข้าแถบเมนูส่วนกลางสอดสีพาสเทลกระบอกเดียว
import axios from "axios"; // นำเข้าไลบรารีท่อส่งข้อมูลหลักสำหรับการสื่อสารพูดคุยกับฝั่งหลังบ้าน API

// 🔤 FIXED CONFIG TO VARIABLE: ถอดที่อยู่ Hardcoded URL ลิงก์ตรงออกไปสวมตัวแปรคงที่กลางระบบคลาวด์ ป้องกันสัญญานหลุดเมื่อขึ้นโปรดักชันจริง
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function AssessmentPage() {
  const router = useRouter(); // ประกาศเปิดใช้งานระบบนำทางและสั่งโหลดเปลี่ยนหน้าเพจ Next.js
  const { isLoading, authenticated } = useAuthen(); // แตก State ตรวจสอบความพร้อมของเซสชันและข้อมูลล็อกอินบัญชีผู้ใช้

  // 📦 Clinical Assessment States
  const [currentAsm, setCurrentAsm] = useState("2q"); // สเตทควบคุมฟอร์มปัจจุบัน เริ่มต้นที่คัดกรองเบื้องต้น "2q"
  const [questions, setQuestions] = useState([]); // คลังเก็บแถวรายการคำถามย่อยทางการแพทย์ที่ดึงมาจาก MySQL หลังบ้าน
  const [answers, setAnswers] = useState({}); // Object จดจำรหัสแต้มคำตอบที่คนไข้กดคลิกเลือกช้อยส์รายข้อไว้
  const [loadingData, setLoadingData] = useState(false); // สเตทกางม่านหมุนโหลดข้อมูลจากระบบเครือข่าย

  // 🛡️ Security Gate - Guard Clause: คัดกรองความปลอดภัยเซสชัน หากตรวจเจอว่าผู้ใช้แอบพิมพ์ลิงก์เข้ามาโดยยังไม่ล็อกอิน ให้เตะดีดไปหน้าแรก
  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.replace("/login"); // ส่งตัวเด้งกลับหน้าเข้าสู่ระบบล็อกอินหลักเพื่อความปลอดภัยสูงสุด
    }
  }, [isLoading, authenticated, router]);

  // ฟังก์ชัน Asynchronous สำหรับยิงดึงประโยคคำถามย่อยตามรหัสโค้ดระบบแบบประเมินปัจจุบัน (2q, 9q, 8q)
  const fetchCurrentQuestions = async (asmCode) => {
    setLoadingData(true); // สั่งกางม่านโหลดดักหน้าจอรอผลลัพธ์ข้อมูลดิบ
    try {
      // ⏳ สั่งยิงคำขอเหลื่อมเวลาดึงรายชื่อข้อคำถามย่อยตรงตามไอดีโค้ดแบบประเมินปัจจุบัน
      const res = await axios.get(`${API_BASE_URL}/assessment/form/${asmCode}`);
      if (res.data.result) {
        setQuestions(res.data.data.questions); // บรรจุประโยคคำถามลงอาเรย์ State ข้อคำถามย่อย
        
        // จัดเคลียร์ล้างกระดานจดจำแต้มคำตอบอันเก่าออกไปให้หมดเพื่อเริ่มทำชุดใหม่สะอาด ๆ
        const clearAns = {};
        res.data.data.questions.forEach(q => { clearAns[q.id] = null; });
        setAnswers(clearAns); // เคลียร์สเตทคำตอบให้พร้อมรับค่าใหม่
      }
    } catch (err) {
      console.error("Fetch current assessment questions stack error:", err);
    } finally {
      setLoadingData(false); // สับคัตเอาต์ปิดสถานะม่านโหลดแสดงการประมวลผลออกเสร็จสิ้น
    }
  };

  // เอฟเฟกต์ดักฟังการปรับเปลี่ยนตัวแปรสเตทรหัสฟอร์ม: สั่งรันชุดคิวรีดึงคำถามใหม่ทันทีเมื่อเกิดการเปลี่ยนผ่านบน Rule Engine
  useEffect(() => {
    if (authenticated) {
      fetchCurrentQuestions(currentAsm); // สั่งรันฟังก์ชันดึงคำถามอัปเดตตามรหัสโค้ดปัจจุบัน
    }
  }, [currentAsm, authenticated]);

  // ฟังก์ชันดักจับสถานการณ์คลิกเลือกช้อยส์แต้มคะแนนประเมินย่อยรายข้อ
  const handleSelectScore = (qId, scoreValue) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: scoreValue // ผูกจำค่าไอดีคำถามประกบคู่แต้มคะแนนดิบที่เลือก
    }));
  };

  // ฟังก์ชันประมวลผลคำนวณและตัดสินใจเปลี่ยนผ่านหน้าฟอร์ม (Workflow & Routing Submission)
  const handleSubmitAssessment = async () => {
    // 🔍 ลоจิกตรวจสอบความครบถ้วน: ตรวจดูว่าคนไข้คีย์ติ๊กเลือกคำตอบส่งมาครบถ้วนทุกข้อแล้วหรือยัง
    const unansCount = questions.filter(q => answers[q.id] === null).length;
    if (unansCount > 0) {
      alert("กรุณาตอบคำถามทางการแพทย์ให้ครบถ้วนทุกข้อก่อนกดปุ่มส่งผลประเมินครับ");
      return; // สั่งระงับยับยั้งการส่งข้อมูลดักความว่างเปล่าไว้ก่อน
    }

    // รวมคะแนนสะสมรวมของฟอร์มชุดปัจจุบันออกมารวมกันตรง ๆ
    const totalScore = Object.values(answers).reduce((acc, curr) => acc + (curr || 0), 0);
    const answersArray = questions.map(q => answers[q.id]);

    try {
      // 🧠 CLINICAL WORKFLOW RULE ENGINE: ส่งผลคะแนนดิบทั้งหมดกลับไปให้ระบบหลังบ้านวิเคราะห์คัดแยกทางเดินและเซฟลงฐานข้อมูล MySQL
      const res = await axios.post(`${API_BASE_URL}/assessment/save`, {
        user_id: authenticated.user_id, // FIX: อ้างอิงรหัสกุญแจหลักตรงสเปกระบบคือ .user_id
        assessment_code: currentAsm,    // ส่งรหัสบ่งชี้ประเภทคัดกรอง
        answers: answersArray           // ยิงก้อนอาร์เรย์แต้มคำตอบตรงๆ
      });

      if (res.data.result) {
        const nextAction = res.data.data.next_action;
        
        if (nextAction === "9q" || nextAction === "8q") {
          // หากระบบตรวจพบเงื่อนไขความเสี่ยงแทรกแซงตามเกณฑ์ สธ. ให้ทำการกระโดดสลับฟอร์มชุดถัดไปทันที
          alert(`ผลการวิเคราะห์พบความเสี่ยง ระบบจะนำท่านเข้าสู่การทำแบบประเมิน ${nextAction.toUpperCase()} ต่อเนื่องทันทีตามเกณฑ์ สธ.`);
          setCurrentAsm(nextAction); // ปรับค่าสเตทเพื่อดีดไปทำแบบประเมินถัดไป
        } else {
          // หากคะแนนปกติสมบูรณ์ดี สั่งพาดีดตัวนำทางไปหน้ารายงานประวัติรวมเพื่อจบขั้นตอน
          router.push("/history");
        }
      }
    } catch (e) {
      console.error("Process clinical workflow submission failure:", e);
    }
  };

  if (isLoading || !authenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-primary-light">Loading Control Window...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
      <Navbar username={authenticated?.username} activeMenu="assessment" />

      {/* บล็อกพื้นที่กระดานคอนเทนต์หลักสำหรับกางข้อคำถามรายข้อ */}
      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        <div className="rounded-3xl bg-white p-6 md:p-10 shadow-xl border border-purple-50/20">
          
          {/* ABSOLUTE CENTERING HEADER: จัดตำแหน่งหัวข้อประเภทแบบประเมินให้อยู่ตรงกึ่งกลางหน้าเพจทั้งหมดตามรูปดีไซน์พรีเมียม */}
          <div className="border-b pb-6 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white bg-[#432C81] px-2.5 py-1 rounded-md">
              Current Screening Mode: {currentAsm.toUpperCase()}
            </span>
            <h1 className="text-xl md:text-2xl font-black mt-3 text-[#432C81]">
              {currentAsm === "2q" && "แบบประเมินคัดกรองภาวะซึมเศร้าเบื้องต้น (2Q)"}
              {currentAsm === "9q" && "แบบประเมินโรคซึมเศร้าฉบับมาตรฐาน (9Q)"}
              {currentAsm === "8q" && "แบบประเมินความเสี่ยงและพฤติกรรมทำร้ายตนเอง (8Q)"}
            </h1>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">โปรดเลือกคำตอบที่ตรงกับความรู้สึกที่แท้จริงของคุณในช่วง 2 สัปดาห์ที่ผ่านมามากที่สุด</p>
          </div>

          {loadingData ? (
            <div className="py-20 text-center font-bold text-gray-400 text-xs animate-pulse">
              ⏳ กำลังซิงค์โครงสร้างคลังคำถามจากฐานข้อมูล...
            </div>
          ) : (
            <div className="mt-8 space-y-10">
              
              {/* DYNAMIC BUTTONS MATRIX GENERATOR: ลูปแสดงประโยคข้อคำถามรายข้อ พร้อมปุ่มกดตัวเลือกคะแนนแบบเป็นชุดๆ */}
              {questions.map((q, index) => {
                const currentChoices = currentAsm === "9q" ? [
                  { val: 0, text: "ไม่มีเลย" },
                  { val: 1, text: "เป็นบางวัน" },
                  { val: 2, text: "บ่อยครั้ง" },
                  { val: 3, text: "เป็นทุกวัน" }
                ] : [
                  { val: 0, text: "ไม่มี" },
                  { val: 1, text: "มี" }
                ];

                return (
                  <div 
                    key={q.id} 
                    className="pb-8 border-b border-gray-100 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in"
                  >
                    {/* จัดวางข้อความและปรับสเกลขนาดป้ายตัวหนังสือหัวข้อให้เด่นชัด สอดรับเท่ากันทั้งหมด */}
                    <div className="max-w-2xl">
                      {/* 📐 TEXT SIZE FIX: ปรับแก้ขนาดป้ายคำถามขึ้นมาเป็นขนาด text-xs sm:text-sm สมดุลกันทุกข้อหมดจด */}
                      <span className="text-xs sm:text-sm font-semibold text-[#F45CB0] uppercase tracking-wider block mb-1">
                        คำถามข้อที่ {index + 1}
                      </span>
                      <h2 className="text-base sm:text-xl font-bold text-[#432C81] leading-relaxed">
                        {q.question_text}
                      </h2>
                    </div>

                    {/* 📐 LONGER BUTTONS LAYOUT: จัดเรียงระนาบกึ่งกลางอย่างสมมาตรพรีเมียม และปุ่มขยายตัวยาวขึ้นตามสั่ง */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full max-w-2xl">
                      {currentChoices.map((option) => {
                        const isSelected = answers[q.id] === option.val;
                        return (
                          <div key={option.val}>
                            {/* 📏 BUTTON GAUGE REFACTOR & COMMENT FIX: ย้ายคอมเมนต์ออกจากจุดวิกฤตของแท็กปุ่มเปิดเรียบร้อย ปิดช่องโหว่เออร์เรอร์โครงสร้าง JSX 100% */}
                            <button
                              type="button"
                              onClick={() => handleSelectScore(q.id, option.val)}
                              className={`min-h-[48px] w-full sm:w-[200px] rounded-xl px-5 py-3 text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-3 shadow-3xs ${isSelected ? "bg-[#432C81] text-white border-[#432C81] shadow-md scale-[1.01]" : "bg-white text-gray-500 hover:bg-[#FAF9FE] border-gray-200"}`}
                            >
                              {/* 📐 FONT WEIGHT REFINEMENT: ปรับตัวเลขช้อยส์คำตอบให้อยู่ที่สัดส่วน font-semibold ไม่ทึบแข็งกระด้าง */}
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-semibold ${isSelected ? "bg-white text-[#432C81]" : "bg-gray-100 text-gray-600"}`}>
                                {option.val}
                              </span>
                              <span className="truncate">{option.text}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}

              {/* บล็อกจัดสัดส่วนปุ่มกดยืนยันเซฟบันทึกคะแนนสะสมท้ายกระดาน จัดกึ่งกลางสมมาตร */}
              <div className="pt-4 flex justify-center items-center">
                <button
                  onClick={handleSubmitAssessment}
                  className="w-full sm:w-[280px] rounded-2xl bg-[#F45CB0] hover:bg-[#e04fa0] py-3.5 text-sm font-black text-white shadow-lg active:scale-[0.98] transition-all duration-200 text-center cursor-pointer tracking-wide flex items-center justify-center gap-2"
                >
                  💾 บันทึกและทำขั้นตอนถัดไป ➔
                </button>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}