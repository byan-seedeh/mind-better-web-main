"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import { showErrorDialog, showSuccessDialog } from "@/utils/webDialog";
import Navbar from "@/components/Navbar";
import axios from "axios";

const CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
  ROUTES: {
    LOGIN: "/login",
    HISTORY: "/history"
  }
};

const ASSESSMENT_CHOICES = {
  "2q": [
    { val: 0, text: "ไม่มี" },
    { val: 1, text: "มี" }
  ],
  "8q": [
    { val: 0, text: "ไม่มี" },
    { val: 1, text: "มี" }
  ],
  "9q": [
    { val: 0, text: "ไม่มีเลย" },
    { val: 1, text: "เป็นบางวัน (1-7 วัน)" },
    { val: 2, text: "เป็นบ่อย (> 7 วัน)" },
    { val: 3, text: "เป็นทุกวัน" }
  ]
};

export default function AssessmentPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  const [currentFormCode, setCurrentFormCode] = useState("2q");
  const [questionsList, setQuestionsList] = useState([]);
  const [answersMap, setAnswersMap] = useState({});
  const [loadingData, setLoadingData] = useState(false);

  // Security Router Guard
  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.replace(CONFIG.ROUTES.LOGIN);
    }
  }, [isLoading, authenticated, router]);

  // Fetch Questions Engine
  const fetchAssessmentForm = async (formCode) => {
    setLoadingData(true);
    try {
      const res = await axios.get(`${CONFIG.API_BASE_URL}/assessment/form/${formCode}`);
      if (res.data && res.data.data) {
        const questions = res.data.data.questions || [];
        setQuestionsList(questions);
        
        const initialAnswers = {};
        questions.forEach((q) => { 
          initialAnswers[q.id] = null; 
        });
        setAnswersMap(initialAnswers);
      }
    } catch (err) {
      console.error("Fetch assessment form error:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchAssessmentForm(currentFormCode);
    }
  }, [currentFormCode, authenticated]);

  const handleSelectScore = (questionId, scoreValue) => {
    setAnswersMap((prevMap) => ({
      ...prevMap,
      [questionId]: scoreValue
    }));
  };

  const currentChoicesOptions = useMemo(() => {
    return ASSESSMENT_CHOICES[currentFormCode] || ASSESSMENT_CHOICES["9q"];
  }, [currentFormCode]);

  // Submit Pipeline
  const handleSubmitAssessment = async () => {
    const unansweredCount = questionsList.filter((q) => answersMap[q.id] === null).length;
    
    if (unansweredCount > 0) {
      showErrorDialog("กรุณาตอบคำถามทางการแพทย์ให้ครบถ้วนทุกข้อก่อนกดปุ่มส่งผลประเมินครับ");
      return;
    }

    const answersPayloadArray = questionsList.map((q) => answersMap[q.id]);

    try {
      const res = await axios.post(`${CONFIG.API_BASE_URL}/assessment/save`, {
        user_id: authenticated.user_id,
        assessment_code: currentFormCode,
        answers: answersPayloadArray
      });

      if (res.data && res.data.result) {
        const nextActionRouteToken = res.data.data?.next_action;
        
        if (nextActionRouteToken === "9q" || nextActionRouteToken === "8q") {
          showSuccessDialog(`ระบบตรวจพบเงื่อนไขความเสี่ยงสะสมต่อเนื่องตามเกณฑ์ สธ. เพื่อความปลอดภัยของท่านระบบจะนำเข้าสู่ขั้นการทำแบบประเมิน ${nextActionRouteToken.toUpperCase()} ต่อเนื่องทันที`);
          setCurrentFormCode(nextActionRouteToken);
        } else {
          router.push(CONFIG.ROUTES.HISTORY);
        }
      }
    } catch (e) {
      console.error("Submission workflow error:", e);
      showErrorDialog("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
    }
  };

  if (isLoading || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8FAFF] text-sm font-semibold text-[#432C81]">
        กำลังโหลดหน้าต่างแบบประเมิน...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
      <Navbar username={authenticated?.username} activeMenu="assessment" />

      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        <div className="rounded-3xl bg-white p-6 md:p-10 shadow-xl border border-purple-50/20">
          
          {/* Header */}
          <div className="border-b pb-6 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white bg-[#432C81] px-2.5 py-1 rounded-md">
              Current Screening Mode: {currentFormCode.toUpperCase()}
            </span>
            <h1 className="text-xl md:text-2xl font-semibold mt-3 text-[#432C81]">
              {currentFormCode === "2q" && "แบบประเมินคัดกรองภาวะซึมเศร้าเบื้องต้น (2Q)"}
              {currentFormCode === "9q" && "แบบประเมินโรคซึมเศร้าฉบับมาตรฐาน (9Q)"}
              {currentFormCode === "8q" && "แบบประเมินความเสี่ยงและพฤติกรรมทำร้ายตนเอง (8Q)"}
            </h1>
            <p className="text-xs text-gray-500 mt-1.5 font-semibold">
              โปรดเลือกคำตอบที่ตรงกับความรู้สึกที่แท้จริงของคุณในช่วง 2 สัปดาห์ที่ผ่านมามากที่สุด
            </p>
          </div>

          {/* Questions Matrix */}
          {loadingData ? (
            <div className="py-20 text-center font-semibold text-gray-400 text-xs animate-pulse">
              ⏳ กำลังซิงค์โครงสร้างคลังคำถามจากระบบฐานข้อมูลกลาง...
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {questionsList.map((q, index) => {
                return (
                  <div key={q.id} className="pb-8 border-b border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="max-w-2xl">
                      <span className="text-xs font-semibold text-[#F45CB0] uppercase tracking-wider block mb-1">
                        คำถามข้อที่ {index + 1}
                      </span>
                      <h2 className="text-base sm:text-lg font-semibold text-[#432C81] leading-relaxed">
                        {q.question_text}
                      </h2>
                    </div>

                    {/* Choices Options */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1 w-full max-w-2xl">
                      {currentChoicesOptions.map((option) => {
                        const isSelected = answersMap[q.id] === option.val;
                        return (
                          <div key={option.val} className="w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleSelectScore(q.id, option.val)}
                              className={`min-h-[46px] w-full sm:w-[220px] rounded-xl px-5 py-3 text-xs font-semibold border transition-all cursor-pointer flex items-center justify-start gap-3 shadow-3xs ${
                                isSelected 
                                  ? "bg-[#432C81] text-white border-[#432C81] shadow-md scale-[1.005]" 
                                  : "bg-white text-gray-500 hover:bg-[#FAF9FE] border-gray-200"
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                                isSelected ? "bg-white text-[#432C81]" : "bg-gray-100 text-gray-600"
                              }`}>
                                {option.val}
                              </span>
                              <span className="truncate text-left font-semibold">{option.text}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Submit Action */}
              <div className="pt-4 flex justify-center items-center">
                <button
                  type="button"
                  onClick={handleSubmitAssessment}
                  className="w-full sm:w-[280px] rounded-2xl bg-[#F45CB0] hover:bg-[#e04fa0] py-3.5 text-sm font-semibold text-white shadow-md active:scale-[0.98] transition-all duration-200 text-center tracking-wide flex items-center justify-center gap-2 cursor-pointer"
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