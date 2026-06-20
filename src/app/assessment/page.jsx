"use client"; // บ่งชี้โครงสร้าง Client Component เพื่อจัดการฝั่งหน้าบ้านคุมทัชหน้าจอ
import React, { useEffect, useMemo, useState } from "react"; // นำเข้าโมดูลหลัก React และ hooks 
import { useRouter } from "next/navigation"; // โมดูลเส้นทางเดินเปลี่ยนหน้าจอของ Next.js 
import { useAuthen } from "@/utils/useAuthen"; // โมดูลดักสิทธิ์เช็กค่าเซสชันบัญชีประวัติล็อกอินผู้ใช้งาน
import axios from "axios"; // ไลบรารีท่อยิงสัญญาณติดต่อสื่อสารส่งพารามิเตอร์หาหลังบ้าน API
import Navbar from "@/components/Navbar"; // 🛡️ DRY - เรียกแชร์แถบเมนูด้านบนร่วมกันสม่ำเสมอล็อกสีแบรนด์ม่วง

// 🔤 CONFIG VARIABLE MAP: ถอดไอดี URL เส้นทางลิงก์กระบอกตรงออกไปตั้งรับไว้ด้านนอกเพื่อสอดคล้อง Production Setup
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const ROUTING_ACTIONS = {
    NAV_9Q: "9q", // คีย์ส่งนำทางพาไปฟอร์ม 9Q
    NAV_8Q: "8q", // คีย์ส่งนำทางพาไปฟอร์ม 8Q
    NAV_HOME: "home" // คีย์ส่งพากลับหน้าจอ Dashboard ยูสเซอร์
};

const PHQ9_UI_LIMITS = { MIN: 7, MID: 12, HIGH: 18 };

export default function AssessmentPage() {
  const router = useRouter(); // เรียกใช้งานระบบนำทางย้ายพาร์ทหน้าเพจ
  const { isLoading, authenticated } = useAuthen(); // แตกสเตทอ่านค่าดักเช็กสถานะล็อกอินผู้ใช้งาน

  const [currentForm, setCurrentForm] = useState("menu");
  const [questions, setQuestions] = useState([]);
  const [choices, setChoices] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  const [step, setStep] = useState(0);                 
  const [answers, setAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false); 
  const [saving, setSaving] = useState(false);
  const [uiError, setUiError] = useState(""); // 🚨 สเตทดักฟังข้อผิดพลาดระบบสำหรับพ่นสีแดงเตือนคนไข้หน้าจอ UI

  useEffect(() => {
    if (!isLoading && !authenticated) router.replace("/login");
  }, [isLoading, authenticated, router]);

  // ⏳ Asynchronous คำขอดึงข้อมูลโครงสร้างประโยคข้อคำถามย่อยจาก MySQL
  const startAssessment = async (code) => {
    setFormLoading(true); // เปิดเอฟเฟกต์ม่านโหลดบังหน้าจอไว้ชั่วคราว
    setUiError("");      // ล้างป้ายเตือนภัยของเก่าออกให้หมดเกลี้ยง
    try {
      // ⏳ ยิงระเบิดสัญญาณดึงแปลนข้อคำถามมาจากคลังหลังบ้าน API ข้ามระบบ
      const res = await axios.get(`${API_BASE_URL}/assessment/form/${code}`);
      if (res.data.result) {
        setQuestions(res.data.data.questions);
        setChoices(res.data.data.choices);
        setAnswers(Array(res.data.data.questions.length).fill(null)); 
        setStep(0);
        setShowResult(false);
        currentForm === code ? null : setCurrentForm(code);
      } else {
        throw new Error(res.data.message || "โครงสร้างฟอร์มขัดข้อง");
      }
    } catch (err) {
      setUiError("เกิดปัญหาในการดึงชุดคำถามแพทย์จากฐานข้อมูล กรุณาลองใหม่อีกครั้ง");
      console.error("Load form error:", err);
    } finally {
      setFormLoading(false); // สับคัตเอาต์ปิดสถานะม่านโหลดบังหน้าจอออก
    }
  };

  const handleAnswerSelect = (scoreValue) => {
    const cp = [...answers];
    cp[step] = scoreValue;
    setAnswers(cp);
  };

  const isLast   = step === questions.length - 1;
  const canNext  = typeof answers[step] === "number";
  const progress = questions.length > 0 ? Math.round(((step + 1) / questions.length) * 100) : 0;

  const totalScore = useMemo(
    () => answers.reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0),
    [answers]
  );

  // 🧩 BEAUTIFUL FUNCTION REFACTOR: ล้างแต้มตัวเลข Magic Numbers ออก และเกลาให้กระชับโปร่งตาสุดๆ
  const getUiSeverityText = (score) => {
    if (currentForm === "2q") return score > 0 ? "มีความเสี่ยงภาวะซึมเศร้า" : "ปกติ";
    if (currentForm === "8q") {
      if (score === 0) return "ไม่มีแนวโน้มฆ่าตัวตาย";
      if (score <= 8) return "แนวโน้มฆ่าตัวตายระดับน้อย";
      if (score <= 16) return "แนวโน้มฆ่าตัวตายระดับปานกลาง";
      return "แนวโน้มฆ่าตัวตายระดับรุนแรง";
    }
    if (score < PHQ9_UI_LIMITS.MIN) return "ไม่มีอาการหรือระดับน้อยมาก (< 7)";
    if (score <= PHQ9_UI_LIMITS.MID) return "มีอาการระดับน้อย (7–12)";
    if (score <= PHQ9_UI_LIMITS.HIGH) return "มีอาการระดับปานกลาง (13–18)";
    return "มีอาการระดับรุนแรง (≥ 19)";
  };

  const handleNextStep = () => {
    if (!canNext) return;
    if (isLast) {
      setShowResult(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStep((s) => s + 1);
    }
  };

  const saveAndGoNext = async () => {
    setSaving(true);
    setUiError("");
    try {
      const payload = {
        user_id: authenticated?.user_id ?? null,
        assessment_code: currentForm, 
        answers: answers,             
      };
      
      const res = await axios.post(`${API_BASE_URL}/assessment/save`, payload);

      if (res.data.result) {
        const nextAction = res.data.data.next_action;
        
        if (nextAction === ROUTING_ACTIONS.NAV_9Q || nextAction === ROUTING_ACTIONS.NAV_8Q) {
          alert(`ผลการวิเคราะห์พบความเสี่ยง ระบบจะนำท่านเข้าสู่การทำแบบประเมิน ${nextAction.toUpperCase()} ต่อเนื่องทันทีตามเกณฑ์ สธ.`);
          startAssessment(nextAction);
        } else {
          router.replace(nextAction === ROUTING_ACTIONS.NAV_HOME ? "/home" : "/history");
        }
      } else {
        throw new Error(res.data.message || "เซิร์ฟเวอร์ปฏิเสธการเซฟบันทึก");
      }
    } catch (error) {
      setUiError("ระบบหลังบ้านไม่สามารถส่งผลบันทึกแต้มคะแนนได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ต");
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || formLoading) return <div className="flex min-h-screen items-center justify-center bg-primary-light">Loading...</div>;

  return (
    <div className="min-h-screen w-full bg-primary-light font-sans antialiased text-brand-main">
      <Navbar username={authenticated?.username} activeMenu="assessment" />
      
      <div className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl rounded-3xl bg-warm-white p-6 sm:p-10 shadow-xl border border-purple-50/40">
          
          {uiError && (
            <div className="mb-4 rounded-xl p-3 bg-red-50 text-red-600 border border-red-100 text-xs font-bold text-center animate-fade-in">
              ⚠️ {uiError}
            </div>
          )}

          {/* SCREEN PANEL 1: MENU SELECTION */}
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

          {/* SCREEN PANEL 2: ACTIVE QUESTION STEP */}
          {!showResult && currentForm !== "menu" && questions[step] && (
            <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
              <div className="mb-2">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-gray-400">
                  <span>ข้อ {step + 1} / {questions.length}</span>
                  <span>ความคืบหน้า {progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-light overflow-hidden">
                  <div className="h-full bg-brand-main transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-black leading-relaxed text-brand-main">
                ข้อ {questions[step].question_number}. {questions[step].question_text}
              </h3>

              <div className="grid gap-2 pt-2">
                {choices.map((c) => (
                  <div key={c.score}>
                    {/* 📏 MOBILE TOUCH TARGET LOGIC: ล็อกความสูงขั้นต่ำอย่างน้อย 48px เพื่อนิ้วสัมผัสกดทัชสกรีนได้ง่าย ล้างปัญหาเออร์เรอร์ Parsing ขยับคอมเมนต์เรียบร้อยครับ */}
                    <button
                      onClick={() => handleAnswerSelect(c.score)}
                      className={`w-full min-h-[48px] rounded-xl border px-4 py-3 text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer ${answers[step] === c.score ? "border-brand-main bg-[#EFEAFE] text-brand-main" : "border-transparent bg-[#F6F7FB] hover:bg-purple-50/50"}`}
                    >
                      {c.choice_text} ({c.score} คะแนน)
                    </button>
                  </div>
                ))}      
              </div>

              <div className="mt-8 pt-4 border-t flex items-center justify-between gap-3">
                <button onClick={() => step > 0 ? setStep(s => s - 1) : setCurrentForm("menu")} className="rounded-xl border bg-white px-5 py-2.5 text-xs font-bold text-brand-main shadow-3xs cursor-pointer">ย้อนกลับ</button>
                <button onClick={handleNextStep} disabled={!canNext} className="rounded-xl bg-brand-main text-white px-6 py-2.5 text-xs font-bold disabled:opacity-30 cursor-pointer shadow-sm">
                  {isLast ? "ดูผลลัพธ์" : "ถัดไป →"}
                </button>
              </div>
            </div>
          )}

          {/* SCREEN PANEL 3: SUMMARY OVERVIEW PANEL */}
          {showResult && (
            <div className="space-y-5 text-center max-w-xl mx-auto py-4 animate-fade-in">
              <h2 className="text-xl font-black text-brand-main">สรุปผลเบื้องต้นของชุดคำถาม {currentForm.toUpperCase()}</h2>

              {/* ✨ UI REFINEMENT: ปรับสเกลระดับฟอนต์คะแนนดิบสะสมฝั่งบอร์ดสรุปแบบสอบถามรายบุคคลเข้าสู่ `font-semibold` สวยงาม โปร่งตา ไม่แข็งกระด้าง */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl bg-[#E6F7FF] p-4 border border-blue-100">
                  <div className="text-[11px] font-bold text-brand-main/70">คะแนนสะสมดิบรวม</div>
                  <div className="text-3xl font-semibold text-brand-main mt-1">{totalScore} <span className="text-sm font-normal text-gray-500">คะแนน</span></div>
                </div>
                <div className="rounded-2xl bg-[#F5F0FF] p-4 border border-purple-100">
                  <div className="text-[11px] font-bold text-brand-main/70">วิเคราะห์ภาวะขั้นต้น</div>
                  <div className="text-sm font-semibold text-brand-main mt-2 leading-tight">{getUiSeverityText(totalScore)}</div>
                </div>
              </div>

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