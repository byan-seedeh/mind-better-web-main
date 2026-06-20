"use client"; // บ่งชี้โครงสร้าง Client Component หน้าบ้านสำหรับควบคุมคอนโทรลเลอร์ UI และการจัดการวงจรชีวิตระบบ
import React, { useEffect, useState, useMemo } from "react"; // นำเข้าโมดูลหลักและ React Hooks สำหรับจำค่าสเตทและแคชผลลัพธ์
import { useRouter } from "next/navigation"; // นำเข้าเครื่องมือชุดคำสั่งช่วยนำทางเปลี่ยนพาร์ทหน้าเพจของ Next.js Navigation
import { useAuthen } from "@/utils/useAuthen"; // นำเข้าโมดูล custom hook สำหรับดักฟังสถานะและพิสูจน์สิทธิ์เข้าใช้งานโปรไฟล์ผู้ใช้
import { showErrorDialog, showSuccessDialog } from "@/utils/webDialog"; // 🛡️ เปลี่ยนจาก alert() ดั้งเดิมมาใช้งานกล่องแจ้งเตือนป็อปอัปพรีเมียมของระบบ
import Navbar from "@/components/Navbar"; // เรียกนำเข้าแถบเมนูส่วนกลางแชร์ใช้ร่วมกันส่วนกลางตามหลักการ DRY
import axios from "axios"; // นำเข้าไลบรารีท่อส่งข้อมูลกลางสำหรับยิง HTTP Request เชื่อมต่อกับระบบหลังบ้าน API

// 🔤 CENTRAL CONFIGURATION OBJECT: รวบรวมตำแหน่งที่อยู่โดเมนเนมของระบบเซิร์ฟเวอร์ไว้ส่วนกลาง
const CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
  ROUTES: {
    LOGIN: "/login",
    HISTORY: "/history"
  }
};

// ❓ CLINICAL ASSESSMENT INPUT CHOICES DICTIONARY: จัดหมวดตารางตัวเลือกคำตอบและแต้มคะแนนสากลแยกสัดส่วนชัดเจนนอกบล็อกเรนเดอร์
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

/**
 * @description หน้าจอแกนหลักระบบทำแบบประเมินสุขภาพจิตคัดกรองอัจฉริยะ (Clinical Screening Dynamic Flow)
 * @principles Separation of Concerns (SoC) - สกัดลоจิกตัวแปรแยกสัดส่วนชัดเจน | Typography Consistent - ล้างฟอนต์หนาทึบออก
 */
export default function AssessmentPage() {
  const router = useRouter(); // ประกาศเปิดใช้งานระบบนำทางและสั่งโหลดเปลี่ยนหน้าเพจของ Next.js
  const { isLoading, authenticated } = useAuthen(); // เรียกใช้งานตัวแปรดักฟังสถานะความพร้อมและสิทธิ์เซสชันบัญชีล็อกอิน

  // 📦 Clinical Assessment Core States
  const [currentFormCode, setCurrentFormCode] = useState("2q"); // สเตทจดจำรหัสแบบประเมินปัจจุบัน เริ่มต้นที่ฟอร์มคัดกรองเบื้องต้น "2q"
  const [questionsList, setQuestionsList] = useState([]); // สเตทอาเรย์จัดเก็บรายการโจทย์คำถามทางการแพทย์ที่ดึงซิงค์มาจาก MySQL
  const [answersMap, setAnswersMap] = useState({}); // สเตทระเบียบ Object ผูกหน่วยความจำจดจำค่าคำตอบรายข้อ `[รหัสข้อ]: แต้มคะแนน`
  const [loadingData, setLoadingData] = useState(false); // สเตทควบคุมสัญญาณหมุนและกางหน้าต่างโหลดเดอร์หน้าจอ

  // 🛡️ SECURITY AUTATION GUARD: คัดกรองความปลอดภัยเซสชัน หากตรวจสอบพบว่าผู้ใช้แอบพิมพ์ URL เข้ามาดื้อๆ โดยไม่ได้เข้าสู่ระบบ
  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.replace(CONFIG.ROUTES.LOGIN); // ดีดส่งกลับหน้าจอล็อกอินบัญชีหลักทันทีและทำลายประวัติการย้อนกลับ (Strict Security Boundary)
    }
  }, [isLoading, authenticated, router]);

  /**
   * @description ฟังก์ชัน Asynchronous สำหรับยิงดึงรายการโจทย์คำถามและโครงสร้างช้อยส์ตรงตามรหัสฟอร์มปัจจุบัน
   */
  const fetchAssessmentForm = async (formCode) => {
    setLoadingData(true); // ปรับสถานะหลอดโหลดเดอร์เป็นบวกเพื่อขึ้นแท่นประมวลผลหน้าจอเพจ
    try {
      // ⏳ สั่งสตรีมข้อมูลยิง HTTP GET Request ข้ามระบบไปดึงชุดคำถามประจำรหัสฟอร์มจากเซิร์ฟเวอร์หลังบ้าน Node.js
      const res = await axios.get(`${CONFIG.API_BASE_URL}/assessment/form/${formCode}`);
      if (res.data && res.data.result) {
        setQuestionsList(res.data.data.questions); // บรรจุอาเรย์โจทย์คำถามทางการแพทย์ลงไปประทับค้างในสเตทหน้าบ้าน
        
        // จัดการล้างกระดานและเซ็ตตั้งต้น Object ตารางคำตอบให้เป็นค่าว่างเปล่า (null) เพื่อรองรับการทำข้อสอบรอบใหม่สะอาดๆ
        const initialAnswers = {};
        res.data.data.questions.forEach((q) => { initialAnswers[q.id] = null; });
        setAnswersMap(initialAnswers); // ติดตั้งโครงสร้างคำตอบตั้งต้น
      }
    } catch (err) {
      console.error("Fetch current assessment questions core engine error:", err);
    } finally {
      setLoadingData(false); // ยกเลิกสวิตช์ม่านหมุนโหลดข้อมูลออกไปเมื่อประมวลผลเสร็จสิ้นทุกกระบวนการ
    }
  };

  // เอฟเฟกต์สั่งรันเรียกคิวรีดึงข้อมูลคำถามรอบใหม่ สัญญาณจะทำงานทันทีออโต้เมื่อระบบตรวจพบการขยับเปลี่ยนค่ารหัสฟอร์มคัดกรอง
  useEffect(() => {
    if (authenticated) {
      fetchAssessmentForm(currentFormCode); // สั่งรันเครื่องยนต์ดาวน์โหลดชุดคำถามสอดรับตามรหัสโมเดลปัจจุบัน
    }
  }, [currentFormCode, authenticated]);

  // ฟังก์ชันดักจับสถานการณ์เมื่อคนไข้กดคลิกจิ้มปุ่มเลือกช้อยส์ข้อคำตอบเพื่อบันทึกแต้มคะแนนดิบรายข้อ
  const handleSelectScore = (questionId, scoreValue) => {
    setAnswersMap((prevMap) => ({
      ...prevMap,
      [questionId]: scoreValue // คีย์เขียนบันทึกทับแต้มคะแนนสะสมลงรหัสกุญแจจำเพาะของคำถามไอดีข้อนั้นๆ
    }));
  };

  // 📐 OPTIMIZATION PORT: ใช้ useMemo จัดรูปแบบช้อยส์คำตอบดึงมาสแตนด์บายล่วงหน้าตามหลักความเสถียร ไม่สั่งคีย์ตัวแปรซ้ำภายในลูปเรนเดอร์
  const currentChoicesOptions = useMemo(() => {
    return ASSESSMENT_CHOICES[currentFormCode] || ASSESSMENT_CHOICES["9q"]; // คัดสรรตัวเลือกคำตอบที่สอดคล้องตามรหัสประเภทฟอร์มปัจจุบัน
  }, [currentFormCode]);

  // ฟังก์ชัน Asynchronous ควบคุมลูปประมวลผลและตัดสินใจเปลี่ยนหน้าจอส่งคะแนนขึ้นระบบคลาวด์หลังบ้าน (Conditional Submitter Workflow)
  const handleSubmitAssessment = async () => {
    // 🔍 DATA COMPLETENESS VALIDATION PIPELINE: สแกนตรวจเช็กความครบถ้วนว่าคนไข้คีย์เลือกคำตอบส่งมาครบทุกช่องแล้วหรือยัง
    const unansweredCount = questionsList.filter((q) => answersMap[q.id] === null).length;
    
    if (unansweredCount > 0) { // ลоจิก Guard Clause: หากตรวจพบว่ามีช่องว่างหลุดรอดเหลือค้างอย่างน้อยหนึ่งข้อขึ้นไป
      showErrorDialog("กรุณาตอบคำถามทางการแพทย์ให้ครบถ้วนทุกข้อก่อนกดปุ่มส่งผลประเมินครับ"); // พ่นพิมพ์กล่องแจ้งสัญญานเตือนความถูกต้องพรีเมียม
      return; // สั่งระงับระบบและตัดจบลูปการทำงานทันที ป้องกันระเบียนระเบิดข้อมูลพังค้างในระบบฐานข้อมูล
    }

    // จัดแมปกระจายสกัดค่าตัวเลขแต้มคะแนนดิบจากระเบียบ Object ให้ออกมาเป็นโครงสร้าง Flat Array เรียงลำดับตามข้อคำถาม
    const answersPayloadArray = questionsList.map((q) => answersMap[q.id]);

    try {
      // ⏳ สตรีมส่งก้อน Payload ขนาดใหญ่ข้ามท่อระบบเน็ตเวิร์กไปบันทึกถาวรลงระบบ MySQL ด้วยระเบียบวิธี POST Method
      const res = await axios.post(`${CONFIG.API_BASE_URL}/assessment/save`, {
        user_id: authenticated.user_id, // ผูกเชื่อมรหัส Foreign Key โยงบัญชีเจ้าของไข้ผู้ทำประวัติระบบ (.user_id ตรงปกตามระเบียบสากล)
        assessment_code: currentFormCode, // ติดป้ายกำกับรหัสประเภทฟอร์มแบบประเมินรอบปัจจุบัน ('2q', '9q', '8q')
        answers: answersPayloadArray // แนบก้อนชุดคำตอบดิบส่งหลังบ้านไปประมวลผลคำนวณสถิติ
      });

      if (res.data && res.data.result) { // หากระบบหลังบ้านทำการวินิจฉัยและสลักคีย์บันทึกข้อมูลสำเร็จเรียบร้อย
        const nextActionRouteToken = res.data.data.next_action; // แกะดักฟังเหรียญสัญญาณจัดเส้นทาง Dynamic Routing ที่สะท้อนตอบกลับมา
        
        if (nextActionRouteToken === "9q" || nextActionRouteToken === "8q") { // กรณีผลคะแนนดิบตกเกณฑ์ความเสี่ยงวิกฤตทางการแพทย์ตามระเบียบ สธ.
          // เปลี่ยนรูปแบบจาก alert แจ้งเตือนแบบเดิม มาใช้กล่องป็อปอัปสำเร็จสีเขียวคมชัดระดับพรีเมียมเพื่อความน่าเชื่อถือระบบ
          showSuccessDialog(`ระบบตรวจพบเงื่อนไขความเสี่ยงสะสมต่อเนื่องตามเกณฑ์ สธ. เพื่อความปลอดภัยของท่านระบบจะนำเข้าสู่ขั้นการทำแบบประเมิน ${nextActionRouteToken.toUpperCase()} ต่อเนื่องทันที`);
          setCurrentFormCode(nextActionRouteToken); // ปรับเปลี่ยน State ประเภทฟอร์มขยับลูปย้ายท่อคำถามไปหน้าถัดไปทันทีอย่างราบรื่น
        } else { // กรณีผลการประเมินคะแนนดิบตกเกณฑ์ปลอดภัย สุขภาพกายใจปกติดีเรียบร้อย
          router.push(CONFIG.ROUTES.HISTORY); // ส่งนำทางดีดผู้ใช้งานปลายทางสลับพาร์ทหน้าจอตรงไปที่หน้ารายงานประวัติรวมส่วนกลางทันทีเพื่อจบกระบวนการ Pipeline
        }
      }
    } catch (e) {
      console.error("Process clinical conditional routing submission failure architecture error:", e);
    }
  };

  // ดักจัดการม่านบังสายตากรณีสัญญานตรวจสอบความพร้อมสิทธิ์บัญชีล็อกอินใน UseAuthen กำลังรันกระบวนการดึงข้อมูลค้างท่อ
  if (isLoading || !authenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-[#E8FAFF] text-sm font-semibold text-[#432C81]">กำลังโหลดหน้าต่างแบบประเมิน...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
      {/* เรียกใช้งานแถบเมนูด้านบนส่วนกลางร่วมกัน ล็อกค่าขนาด Poppins สมมาตรเท่ากันทุกหน้าเว็บเพจ */}
      <Navbar username={authenticated?.username} activeMenu="assessment" />

      {/* บล็อกพื้นที่ควบคุมเนื้อหาหลักหน้าจอ Max-Width ระดับ 4X สมสัดส่วนกึ่งกลางหน้าจอ */}
      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        <div className="rounded-3xl bg-white p-6 md:p-10 shadow-xl border border-purple-50/20">
          
          {/* =========================================================================
              📐 ABSOLUTE COMPACT HEADER AREA (จัดตำแหน่งป้ายกำกับและชื่อแบบประเมิน คลีน ฟอนต์หนา font-semibold เท่ากันหมด)
              ========================================================================= */}
          <div className="border-b pb-6 text-center animate-fade-in">
            {/* ป้ายประทับบ่งชี้โหมดคัดกรองทางคลินิกปัจจุบัน คลีนTypographyความหนาลงมาเป็นระดับ font-semibold เรียบร้อยสวยงาม */}
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white bg-[#432C81] px-2.5 py-1 rounded-md">
              Current Screening Mode: {currentFormCode.toUpperCase()}
            </span>
            {/* หัวเรื่องหลักของกระดานข้อสอบ ปรับสไตล์ฟอนต์ให้ละมุนตาที่สัดส่วน font-semibold คลีน ไม่หนาแข็งกระด้าง */}
            <h1 className="text-xl md:text-2xl font-semibold mt-3 text-[#432C81]">
              {currentFormCode === "2q" && "แบบประเมินคัดกรองภาวะซึมเศร้าเบื้องต้น (2Q)"}
              {currentFormCode === "9q" && "แบบประเมินโรคซึมเศร้าฉบับมาตรฐาน (9Q)"}
              {currentFormCode === "8q" && "แบบประเมินความเสี่ยงและพฤติกรรมทำร้ายตนเอง (8Q)"}
            </h1>
            <p className="text-xs text-gray-500 mt-1.5 font-semibold">โปรดเลือกคำตอบที่ตรงกับความรู้สึกที่แท้จริงของคุณในช่วง 2 สัปดาห์ที่ผ่านมามากที่สุด</p>
          </div>

          {/* แสดงสถานะสัญญานระเบียบดาวน์โหลดแอนิเมชันชั่วคราวกรณีรอท่อข้อมูล SQL ซิงค์หัวข้อคำถามข้ามเครือข่าย */}
          {loadingData ? (
            <div className="py-20 text-center font-semibold text-gray-400 text-xs animate-pulse">
              ⏳ กำลังซิงค์โครงสร้างคลังคำถามจากระบบฐานข้อมูลกลาง...
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              
              {/* =========================================================================
                  📐 DYNAMIC QUESTIONS MATRIX GENERATOR (แผงลูปแสดงโจทย์คำถาม พร้อมปุ่มตัวเลือกขยายขนาดกว้างพอดีสากล)
                  ========================================================================= */}
              {questionsList.map((q, index) => {
                return (
                  <div 
                    key={q.id} 
                    className="pb-8 border-b border-gray-100 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in"
                  >
                    {/* บล็อกจัดแสดงระเบียบสายตาประโยคโจทย์ข้อคำถาม คลีนสเกลความหนาเป็นระดับ font-semibold เสมอกันทั้งหมด */}
                    <div className="max-w-2xl">
                      {/* สลักหมายเลขลำดับข้อคำถามสีสันสะดุดตานำทางสายตา */}
                      <span className="text-xs font-semibold text-[#F45CB0] uppercase tracking-wider block mb-1">
                        คำถามข้อที่ {index + 1}
                      </span>
                      {/* ตัวอักษรโจทย์คำถาม ปรับเปลี่ยนดีไซน์ความหนาลงมาเป็น font-semibold คมชัด นุ่มนวล สมมาตร */}
                      <h2 className="text-base sm:text-lg font-semibold text-[#432C81] leading-relaxed">
                        {q.question_text}
                      </h2>
                    </div>

                    {/* 📐 LONGER & SMOOTH BUTTONS MATRIX: จัดเรียงระนาบกึ่งกลางอย่างสมมาตรพรีเมียม และปุ่มขยายขนาดกว้างขึ้นกดง่ายตามหลัก UX */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1 w-full max-w-2xl">
                      {currentChoicesOptions.map((option) => {
                        const isSelected = answersMap[q.id] === option.val; // ตรวจสอบเช็กค่าสถานะว่าตรงกับไอดีแต้มที่ยูสเซอร์กดเลือกคลิกไว้หรือไม่
                        return (
                          <div key={option.val} className="w-full sm:w-auto">
                            {/* ปุ่มคำสั่งตัวเลือกแต้มคะแนนสะสมรายข้อ คลีนคอมเมนต์หลุดออกจากแท็กวิกฤต JSX สมบูรณ์แบบป้องกันหน้าเว็บ Crash */}
                            <button
                              type="button" // สลักระบุชนิดปุ่มเด็ดขาด ปิดช่องโหว่พฤติกรรมทับซ้อนฟอร์ม HTML ยุคเก่า
                              onClick={() => handleSelectScore(q.id, option.val)} // เรียกใช้กลไกผูกค่าสเตทจดจำคำตอบประจำไอดีข้อเมื่อเกิดเหตุการณ์คลิกสัมผัสปุ่ม
                              className={`min-h-[46px] w-full sm:w-[220px] rounded-xl px-5 py-3 text-xs font-semibold border transition-all cursor-pointer flex items-center justify-start gap-3 shadow-3xs ${isSelected ? "bg-[#432C81] text-white border-[#432C81] shadow-md scale-[1.005]" : "bg-white text-gray-500 hover:bg-[#FAF9FE] border-gray-200"}`}
                            >
                              {/* วงกลมระบุเลขดัชนีแต้มคะแนนประดับช้อยส์คำตอบ คลีนน้ำหนักความหนาให้อยู่ในสัดส่วน font-semibold ละมุนสายตา */}
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0 ${isSelected ? "bg-white text-[#432C81]" : "bg-gray-100 text-gray-600"}`}>
                                {option.val}
                              </span>
                              {/* ข้อความอธิบายความหมายช้อยส์ตัวเลือก พร้อมระบบบีบตัดคำอัจฉริยะกรณีประโยคยาวส่วนเกิน */}
                              <span className="truncate text-left font-semibold">{option.text}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}

              {/* =========================================================================
                  💾 SUBMISSION CORE ACTION BUTTON (บล็อกวางปุ่มกดยืนยันเซฟคะแนนสะสมท้ายกระดาน จัดกึ่งกลางสมมาตร สวย คลีนตา)
                  ========================================================================= */}
              <div className="pt-4 flex justify-center items-center">
                <button
                  type="button" // ตรึงชนิดคุณสมบัติแยกขาดจากระเบียบฟอร์ม
                  onClick={handleSubmitAssessment} // ผูกท่อส่งผลคำนวณและจัดคัดกรองข้ามเน็ตเวิร์กเข้าเครื่องยนต์ Rule Engine หลังบ้าน
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