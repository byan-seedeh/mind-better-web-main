"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import axios from "axios";
import Navbar from "@/components/Navbar";

/**
 * @description หน้าจอขับเคลื่อนระบบทำแบบประเมินสุขภาพจิต (2Q, 9Q, 8Q) ตามเกณฑ์ Workflow สธ.
 * @principles DRY - เรียกใช้งานแถบ Navbar และสี Palette เดียวกัน | YAGNI - ล้าง State จัดเก็บชั่วคราวที่ไม่จำเป็นออก
 */
export default function AssessmentPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  // กำหนดระดับโหมดหน้าจอ: 'menu' = เลือกฟอร์ม, '2q'/'9q'/'8q' = ตัวรหัสแบบทดสอบที่กำลังดำเนินการ
  const [currentForm, setCurrentForm] = useState("menu");
  const [questions, setQuestions] = useState([]);
  const [choices, setChoices] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  // States ควบคุมสถานะการเดินทีละข้อภายในฟอร์ม
  const [step, setStep] = useState(0);                 
  const [answers, setAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false); 
  const [saving, setSaving] = useState(false);

  // Guard Clause: ตรวจสอบสิทธิ์และการพิสูจน์ตัวตนผู้ใช้งาน
  useEffect(() => {
    if (!isLoading && !authenticated) router.replace("/login");
  }, [isLoading, authenticated, router]);

  /**
   * @description 📥 SoC: โหลดโครงสร้างประโยคคำถามและคะแนนตัวเลือกย่อยจากฐานข้อมูลกลาง MySQL
   * @param {string} code - รหัสชนิดแบบประเมิน ('2q', '9q', '8q')
   */
  const startAssessment = async (code) => {
    setFormLoading(true);
    try {
      const res = await axios.get(`http://localhost:8080/api/assessment/form/${code}`);
      if (res.data.result) {
        setQuestions(res.data.data.questions);
        setChoices(res.data.data.choices);
        setAnswers(Array(res.data.data.questions.length).fill(null)); 
        setStep(0);
        setShowResult(false);
        setCurrentForm(code);
      }
    } catch (err) {
      console.error("Failed loading form blueprint:", err);
    } finally {
      setFormLoading(false);
    }
  };

  // จัดการจัดเก็บคะแนนดิบลง Array ชั่วคราวรายข้อ
  const handleAnswerSelect = (scoreValue) => {
    const cp = [...answers];
    cp[step] = scoreValue;
    setAnswers(cp);
  };

  const isLast   = step === questions.length - 1;
  const canNext  = typeof answers[step] === "number";
  const progress = questions.length > 0 ? Math.round(((step + 1) / questions.length) * 100) : 0;

  // คำนวณยอดคะแนนดิบสะสมรวมผ่าน useMemo เพื่อป้องกันความซ้ำซ้อนการประมวลผล (SoC)
  const totalScore = useMemo(
    () => answers.reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0),
    [answers]
  );

  /**
   * @description 🧠 TDD Core Boundary: ฟังก์ชันบริสุทธิ์ใช้แมตช์ระดับความรุนแรงเพื่อแสดงในหน้าสรุปผล UI
   */
  const getUiSeverityText = (score) => {
    if (currentForm === "2q") return score > 0 ? "มีความเสี่ยงภาวะซึมเศร้า" : "ปกติ";
    if (currentForm === "8q") {
      if (score === 0) return "ไม่มีแนวโน้มฆ่าตัวตาย";
      if (score <= 8) return "แนวโน้มฆ่าตัวตายระดับน้อย";
      if (score <= 16) return "แนวโน้มฆ่าตัวตายระดับปานกลาง";
      return "แนวโน้มฆ่าตัวตายระดับรุนแรง";
    }
    if (score < 7) return "ไม่มีอาการหรือระดับน้อยมาก (< 7)";
    if (score <= 12) return "มีอาการระดับน้อย (7–12)";
    if (score <= 18) return "มีอาการระดับปานกลาง (13–18)";
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

  /**
   * @description 💾 ยิงบันทึกข้อมูลคะแนนดิบเข้าคลังเก็บ และเปลี่ยนผ่านหน้าจอตามคำสั่ง Clinical Workflow Rule Engine
   */
  const saveAndGoNext = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: authenticated?.user_id ?? null,
        assessment_code: currentForm, 
        answers: answers,             
      };
      
      const res = await axios.post("http://localhost:8080/api/assessment/save", payload);

      if (res.data.result) {
        const nextAction = res.data.data.next_action;
        
        // ดักจับว่าต้องส่งต่อคนไข้ไปคัดกรองฟอร์มระดับสูงขึ้นทันทีหรือไม่ (2Q -> 9Q หรือ 9Q -> 8Q)
        if (nextAction === "9q" || nextAction === "8q") {
          alert(`ผลการวิเคราะห์พบความเสี่ยง ระบบจะนำท่านเข้าสู่การทำแบบประเมิน ${nextAction.toUpperCase()} ต่อเนื่องทันทีตามเกณฑ์ สธ.`);
          startAssessment(nextAction);
        } else {
          router.replace(nextAction === "home" ? "/home" : "/history");
        }
      }
    } catch (error) {
      console.error("Network save failure:", error);
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
          
          {/* PANEL 1: MENU SELECTION */}
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

          {/* PANEL 2: ACTIVE QUESTION STEP */}
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
                  <button
                    key={c.score}
                    onClick={() => handleAnswerSelect(c.score)}
                    className={`w-full min-h-[48px] rounded-xl border px-4 py-3 text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${answers[step] === c.score ? "border-brand-main bg-[#EFEAFE] text-brand-main" : "border-transparent bg-[#F6F7FB] hover:bg-purple-50/50"}`}
                  >
                    {c.choice_text} ({c.score} คะแนน)
                  </button>
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

          {/* PANEL 3: SUMMARY OVERVIEW PANEL */}
          {showResult && (
            <div className="space-y-5 text-center max-w-xl mx-auto py-4 animate-fade-in">
              <h2 className="text-xl font-black text-brand-main">สรุปผลเบื้องต้นของชุดคำถาม {currentForm.toUpperCase()}</h2>

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