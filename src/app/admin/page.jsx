"use client"; // บ่งชี้โครงสร้าง Client Module หน้าบ้านสำหรับควบคุมคอนโทรลเลอร์ UI และการจัดการ Event
import React, { useEffect, useState, useMemo } from "react"; // นำเข้าโมดูล Core Hooks พลังคำนวณและจัดการสเตทของ React
import { useRouter } from "next/navigation"; // นำเข้าเครื่องมือชุดคำสั่งช่วยนำทางเปลี่ยนพาร์ทหน้าเพจของ Next.js
import { useAuthen } from "@/utils/useAuthen"; // นำเข้าโมดูลคำสั่งดักฟังสถานะและพิสูจน์สิทธิ์เข้าใช้งานระบบโปรไฟล์ผู้ใช้
import axios from "axios"; // นำเข้าไลบรารีท่อส่งข้อมูลหลักสำหรับการสื่อสารพูดคุยกับฝั่งหลังบ้าน API

// 🔤 FIXED CONFIG TO VARIABLE: ถอดที่อยู่ Hardcoded URL ลิงก์ตรงออกไปสวมตัวแปรคงที่กลางระบบคลาวด์ ป้องกันสัญญานหลุดเมื่อขึ้นโปรดักชันจริง
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// ลงทะเบียนชื่อคีย์ประจำปุ่มแท็บเมนูย่อยของระบบแอดมิน เพื่อป้องกันปัญหาพิมพ์ชื่อคีย์ผิดกลางทาง (DRY Principle)
const ADMIN_KEYS = {
    EMAIL_VERIFY: "admin@test.com", // บัญชีอีเมลแอดมินกลางระบบสำหรับใช้ดักจับคัดกรองความปลอดภัยขั้นสูง
    TAB_DASHBOARD: "dashboard",     // ชื่อคีย์ประจำหน้ากระดานแสดงแดชบอร์ดสรุปสถิติรวม
    TAB_ASSESSMENTS: "assessments", // ชื่อคีย์ประจำหน้าต่างคลังจัดการหัวข้อฟอร์มประเมินหลัก
    TAB_QUESTIONS: "questions",     // ชื่อคีย์ประจำหน้าต่างจัดการแก้ไขประโยคคำถามย่อยรายข้อ
    TAB_ROUTING: "routing"          // ชื่อคีย์ประจำหน้าตั้งค่าระดับชั้นเกณฑ์คะแนนเปลี่ยนฟอร์ม (Rule Engine)
};

/**
 * @description หน้าแผงควบคุมหลักสำหรับผู้ดูแลระบบ (Admin Command Room) เพื่อจัดการแบบประเมินและกฎเกณฑ์การแพทย์
 * @principles SoC - แบ่งกลุ่มการบริหารคลังด้วยเมนูแท็บย่อย | KISS - เพิ่มโครงสร้าง Guard Clauses ป้องกันการเจาะข้อมูลหลังบ้าน
 */
export default function AdminPage() {
  const router = useRouter(); // ประกาศเปิดใช้งานระบบนำทางและสั่งโหลดเปลี่ยนหน้าเพจ Next.js
  const { isLoading, authenticated } = useAuthen(); // แตก State ตรวจสอบความพร้อมของเซสชันและข้อมูลล็อกอินบัญชีผู้ใช้

  // ชุดข้อมูลเชื่อมโยง Backend MySQL เครือข่ายคลังข้อมูลหลัก
  const [assessments, setAssessments] = useState([]); // อาเรย์เก็บรายการหัวข้อแบบประเมินหลักทั้งหมดที่มีในระบบ
  const [selectedAsm, setSelectedAsm] = useState(null); // ตัวแปรเก็บ Object แบบประเมินตัวที่แอดมินกำลังเลือกคลิกดูอยู่
  const [questions, setQuestions] = useState([]); // อาเรย์จัดเก็บประโยคข้อคำถามย่อยประจำหัวข้อฟอร์มที่เลือก
  const [allUserLogs, setAllUserLogs] = useState([]); // อาเรย์คลังเก็บแถวประวัติข้อมูลการทำแบบทดสอบรวมของคนไข้ทุกคน
  const [uiError, setUiError] = useState(""); // สเตทจัดการ Error Alert สำหรับพ่นคำเตือนสีแดงบอกแอดมินบน UI เวลาเน็ตเวิร์กขัดข้อง

  // ⚙️ Clinical Workflow Rule Engine (ตรรกะแบบ BA ผูกการเปลี่ยนผ่านหน้าแบบไดนามิกจำลองไว้แสดงผลบน UI)
  const [routingRules, setRoutingRules] = useState([
    { id: 1, source: "2q", threshold: 1, operator: ">=", target: "9q", label: "หากมีอาการเสี่ยงใน 2Q ให้ทำ 9Q ต่อเนื่อง" },
    { id: 2, source: "9q", threshold: 7, operator: ">=", target: "8q", label: "หากซึมเศร้าระดับน้อยขึ้นไป (>=7) ให้คัดกรอง 8Q ทันที" },
    { id: 3, source: "9q", threshold: 7, operator: "<", target: "home", label: "หากคะแนน 9Q ปกติ (<7) ให้จบกระบวนการกลับหน้าแรก" }
  ]);

  const [activeTab, setActiveTab] = useState(ADMIN_KEYS.TAB_DASHBOARD); // กำหนดสเตทปุ่มแท็บเริ่มต้นให้ล็อกพิกัดไปหน้ากระดานแดชบอร์ด
  const [loadingData, setLoadingData] = useState(false); // สเตทเปิดม่านโหลดเพื่อรอบันทึกข้อมูลก้อนใหญ่จากฝั่ง API

  // States ควบคุมส่วนป็อปอัปและฟอร์ม CRUD สำหรับป้อนคำถามและฟอร์มใหม่
  const [showAddForm, setShowAddForm] = useState(false); // สถานะเปิดปิดกล่องป้อนข้อมูลคำถามหรือฟอร์มชุดใหม่
  const [editingId, setEditingId] = useState(null); // สถานะจดจำไอดีคำถามแถวที่ผู้ดูแลระบบกดคลิกปุ่มแก้ไขอยู่
  const [editingText, setEditingText] = useState(""); // สเตทเก็บตัวอักษรถ้อยคำประโยคคำถามใหม่ฉบับปรับปรุงแก้ไข
  const [editingThreshold, setEditingThreshold] = useState(0); // สเตทเก็บตัวเลขเกณฑ์แต้มคะแนนทดสอบที่แอดมินเลือกกรอกแก้

  const [newAsmCode, setNewAsmCode] = useState(""); // สเตทเก็บรหัสย่อฟอร์มใหม่ เช่น 5q
  const [newAsmTitle, setNewAsmTitle] = useState(""); // สเตทเก็บชื่อเรียกแบบประเมินตัวใหม่
  const [newAsmDesc, setNewAsmDesc] = useState(""); // สเตทเก็บคำอธิบายวัตถุประสงค์สั้นๆ ของฟอร์มใหม่
  const [newQText, setNewQText] = useState(""); // สเตทเก็บประโยคข้อความคำถามย่อยข้อใหม่ที่กำลังคีย์ป้อน

  // 🛡️ Security Gate - Guard Clauses: คัดกรองความปลอดภัยระดับสูงสุด คัดบัญชีแปลกปลอมออกจากเพจแอดมินด่วนที่สุด (KISS)
  useEffect(() => {
    if (isLoading) return; // ถ้าสถานะเช็กเซสชันยังโหลดข้อมูลดิบไม่เสร็จสิ้น ให้สั่งระงับหยุดรอข้อมูลดักค่าว่างไว้ก่อน
    if (!authenticated) {
      router.replace("/login"); // มาตรการความปลอดภัยที่ 1: ถ้าไม่พบบัญชีล็อกอินค้างไว้ ให้ดีดส่งไปหน้าเข้าสู่ระบบทันที
      return; // ตัดจบกระบวนการทำงานทันทีเพื่อป้องกันลอจิกหลุดพัง
    }
    // มาตรการความปลอดภัยที่ 2: ถ้าตรวจอีเมลบัญชีแล้วไม่ใช่แอดมินกลางตัวจริง ให้สั่งดีดเด้งพายูสเซอร์กลับหน้าแรกผู้ป่วยทันที
    if (authenticated.email !== ADMIN_KEYS.EMAIL_VERIFY) {
      router.replace("/home"); // ส่งตัวกลับหน้าแดชบอร์ดหลักของยูสเซอร์ปกติ
    }
  }, [isLoading, authenticated, router]);

  // ฟังก์ชัน Asynchronous ดึงข้อมูลรายการหัวข้อแบบประเมินหลักทั้งหมดมาจากคลังระบบหลังบ้าน API
  const fetchAssessments = async () => {
    setLoadingData(true); // สั่งเปิดหลอดป้ายแสดงการประมวลผลข้อมูลดักหน้าแผงควบคุมไว้
    setUiError("");      // เช็ดปัดกวาดทำความสะอาดป้ายข้อความ Error อันเก่าออกจากหน้าจอให้โล่ง
    try {
      // ⏳ สั่งยิงคำขอเหลื่อมเวลาดึงรายชื่อแบบประเมินหลักมาจากหลังบ้านผ่านตัวแปร API คอนฟิกกลาง
      const res = await axios.get(`${API_BASE_URL}/admin/assessments`);
      if (res.data.result) {
        setAssessments(res.data.data); // บรรจุชุดรายการก้อนข้อมูลลงในอาเรย์สเตทแบบประเมินหลัก
        // ลอจิกฉลาด: ถ้าในตารางมีแบบประเมินสแตนด์บายอยู่แล้วและแอดมินยังไม่ได้ล็อกเป้าเลือก ให้เปิดตัวแรกสุดโชว์รอไว้
        if (res.data.data.length > 0 && !selectedAsm) {
          setSelectedAsm(res.data.data[0]); // บันทึกสเตทเปิดซองข้อมูลฟอร์มตัวแรกสุด
        }
      }
    } catch (err) {
      setUiError("ไม่สามารถซิงค์ดึงคลังหัวข้อแบบประเมินจากฐานข้อมูลหลักหลังบ้านได้"); // บันทึกคำเตือนกรณีเซิร์ฟเวอร์ขัดข้อง
    } finally {
      setLoadingData(false); // สับคัตเอาต์ปิดสถานะม่านโหลดแสดงการประมวลผลออกเสร็จสิ้น
    }
  };

  // ฟังก์ชัน Asynchronous เรียกดึงรายชื่อประโยคคำถามย่อยจัดเรียงตามไอดีแบบประเมินหลักตัวที่คลิกเลือกอยู่
  const fetchQuestions = async (asmId) => {
    if (!asmId) return; // ลอจิกกันเหนียว: ถ้าพารามิเตอร์ไอดีหลุดหล่นว่างมา ให้ส่งสัญญานหยุดตัดจบกระบวนการ
    try {
      // ยิงคำขอเชื่อมต่อดึงประวัติคำถามย่อยตามไอดีระบบที่แผงแอดมินเลือกอยู่
      const res = await axios.get(`${API_BASE_URL}/admin/questions/${asmId}`);
      if (res.data.result) setQuestions(res.data.data); // บรรจุแถวประโยคคำถามลงอาเรย์ State ข้อคำถามย่อย
    } catch (err) { console.error("Fetch questions list error:", err); } // บันทึก Technical Log ลงระบบ
  };

  // ฟังก์ชัน Asynchronous ดึงแถวข้อมูลประวัติรวมทั้งหมดของเคสคนไข้ทุกคนมาส่งให้ระบบแดชบอร์ดวิเคราะห์ยอด
  const fetchUserLogs = async () => {
    try {
      // ดึงรอบบันทึกข้อมูลดิบทั้งหมดสะสมมาจากตารางผลลัพธ์ประวัติหลักหลังบ้าน
      const res = await axios.get(`${API_BASE_URL}/phq9/all`);
      if (res.data.result) setAllUserLogs(res.data.data); // บรรจุแถวข้อมูลลงในอาเรย์สเตทคลังล็อกบันทึกรวมคนไข้
    } catch (err) { console.error("Load all patient logs failure:", err); }
  };

  // เอฟเฟกต์ซิงค์ข้อมูล: สั่งยิงคิวรีคลังระบบฐานข้อมูลทันทีที่ด่านผ่านประตูยืนยันผลแล้วว่าเป็นเมลแอดมินตัวจริง
  useEffect(() => {
    if (authenticated?.email === ADMIN_KEYS.EMAIL_VERIFY) {
      fetchAssessments(); // สั่งทำงานโหลดรายการแบบประเมินหลัก
      fetchUserLogs();    // สั่งทำงานโหลดล็อกแถวประวัติเคสรวมของคนไข้
    }
  }, [authenticated]);

  // เอฟเฟกต์ดักฟังการกดคลิกเลือกสลับฟอร์ม: สั่งซดคิวรีคำถามข้อใหม่ทันทีเมื่อแอดมินกดเปลี่ยนตัวเลือกบน UI
  useEffect(() => {
    if (selectedAsm) fetchQuestions(selectedAsm.id); // สั่งรันอัปเดตชุดคำถามย่อยรายข้อมัดคู่ไอดี
  }, [selectedAsm]);

  // ========================================================
  // 🧠 DYNAMIC OPERATIONS: MANAGEMENT OPERATIONS (CRUD)
  // ========================================================

  // ฟังก์ชัน CRUD [CREATE]: บันทึกเพิ่มหัวข้อชุดแบบประเมินประเภทใหม่แกะกล่องบรรจุลงฐานข้อมูล MySQL
  const handleAddAssessment = async () => {
    // กฎดักความสมบูรณ์ข้อมูล: หากพิมพ์ปล่อยฟิลด์รหัสย่อระบบหรือหัวชื่อฟอร์มว่างทิ้งไว้
    if (!newAsmCode.trim() || !newAsmTitle.trim()) {
      alert("กรุณากรอกข้อมูลรหัสระบบย่อและชื่อฟอร์มให้ครบถ้วนก่อนสั่งเซฟ"); // เด้งป็อปอัปตักเตือนแอดมิน
      return; // สั่งหยุดยกเลิกกระบวนการทำงานทันที (Guard Clause)
    }
    try {
      // ยิงส่งคำขอเพิ่มแถวข้อมูลฟอร์มหลักใหม่ แปลงรหัสย่อเป็นตัวพิมพ์เล็กเพื่อสมานลอจิกระบบเก็บข้อมูล
      const res = await axios.post(`${API_BASE_URL}/admin/assessments`, {
        code: newAsmCode.toLowerCase().trim(),
        title: newAsmTitle.trim(),
        description: newAsmDesc.trim()
      });
      if (res.data.result) {
        fetchAssessments(); // สั่งรีโหลดเรียกซดข้อมูลคลังภาพรวมใหม่เพื่อให้เนื้อหาอัปเดตตรงปกบนแผง UI
        setNewAsmCode(""); setNewAsmTitle(""); setNewAsmDesc(""); // ล้างคราบข้อความบนอินพุตช่องอินพุตฟิลด์ให้สะอาด
        setShowAddForm(false); // สั่งพับปิดซ่อนกล่องแผงกรอกข้อมูลชุดฟอร์มใหม่เก็บลงไป
      }
    } catch (e) { console.error(e); }
  };

  // ฟังก์ชัน CRUD [DELETE]: สั่งทำลายและลบหัวข้อแบบประเมินรวมถึงล้างทำลายคลังคำถามย่อยภายในออกตามรหัสไอดี
  const handleDeleteAssessment = async (id, title) => {
    // ขึ้นกล่อง Double-Check ยืนยันมาตรการอันตรายตัด Cascade ป้องกันความเสียหายข้อมูลก่อนสั่งทำลาย
    if (confirm(`⚠️ ยืนยันการลบแบบประเมิน "${title}"? โครงสร้างคำถามภายในจะถูกลบทันที`)) {
      try {
        // ส่งสัญญาณคำขอ DELETE นำแถวข้อมูลพาร์ทไอดีดังกล่าวออกจากระบบตารางฐานข้อมูลหลัก
        const res = await axios.delete(`${API_BASE_URL}/admin/assessments/${id}`);
        if (res.data.result) {
          setSelectedAsm(null); // เคลียร์ปัดกวาดตัวแปรจดจำการเลือกหัวข้อฟอร์มออกชั่วคราว
          fetchAssessments(); // โหลดคิวรีรายการคลังข้อมูลภาพรวมที่เหลืออัปเดตขึ้น UI ใหม่
        }
      } catch (e) { console.error(e); }
    }
  };

  // ฟังก์ชัน CRUD [CREATE]: บันทึกเพิ่มประโยคข้อคำถามย่อยข้อใหม่เข้าไปผูกโครงสร้างสัมพันธ์ภายใต้ไอดีฟอร์มใหญ่
  const handleAddQuestion = async () => {
    if (!newQText.trim() || !selectedAsm) return; // กรองสิทธิ์: หากข้อความปล่อยว่างหรือไม่มีเป้าหมายผูกแบบประเมิน ให้ระงับทันที
    try {
      // นำความยาวอาเรย์คำถามข้อเดิมมาบวกเพิ่มขึ้น 1 เพื่อสแตนด์บายตั้งลำดับเลขข้ออัตโนมัติ (question_number)
      const res = await axios.post(`${API_BASE_URL}/admin/questions`, {
        assessment_id: selectedAsm.id,
        question_number: questions.length + 1,
        question_text: newQText.trim()
      });
      if (res.data.result) {
        fetchQuestions(selectedAsm.id); // สั่งรันดึงชุดข้อคำถามย่อยรอบปัจจุบันขึ้นมาอัปเดตจัดผังเรนเดอร์ใหม่บนหน้าจอ UI
        setNewQText("");                // เคลียร์ค่าว่างในอินพุตช่องพิมพ์ประโยคคำถามย่อยให้โล่ง
        setShowAddForm(false);          // สั่งปิดสไลด์พับกล่องแผงรับข้อมูลป้อนคำถามย่อยลงเก็บ
      }
    } catch (e) { console.error(e); }
  };

  // ฟังก์ชัน CRUD [UPDATE]: สั่งแก้ไขและอัปเดตถ้อยคำเนื้อความในประโยคคำถามย่อยรายข้ออ้างอิงเลขไอดีข้อ
  const handleSaveQuestionEdit = async (qId) => {
    if (!editingText.trim()) return; // ดักค่าว่าง: ถ้าลบข้อความออกจนว่างเปล่า ห้ามปล่อยสั่งบันทึกทับ
    try {
      // ยิงคำสั่ง PUT สั่งเปลี่ยนถ้อยคำทับประโยคคำถามเดิมในตาราง MySQL ตามรหัสเลขไอดีข้อคำถามตรงๆ
      const res = await axios.put(`${API_BASE_URL}/admin/questions/${qId}`, {
        question_text: editingText.trim()
      });
      if (res.data.result) {
        fetchQuestions(selectedAsm.id); // เรียกซดอ่านชุดคำถามไฟล์ปัจจุบันขึ้นมาแสดงผลใหม่ตรงปกบนกระดานเพจ
        setEditingId(null);             // ปลดล็อกเคลียร์สถานะไอดีการเลือกกรอกแก้ออกจากหน้าจอ UI
        setEditingText("");             // ล้างค่าตัวหนังสือคงค้างในสเตทแก้ไขประโยค
      }
    } catch (e) { console.error(e); }
  };

  // ฟังก์ชัน CRUD [DELETE]: สั่งลบและทำลายประโยคคำถามย่อยเดี่ยวข้อดังกล่าวออกจากตารางสารบบแอป
  const handleDeleteQuestion = async (qId) => {
    // ถามทวนความปลอดภัยเพื่อป้องกันนิ้วผู้ดูแลระบบพลาดลั่นโดนปุ่มทำลายข้อมูลโดยอุบัติเหตุ
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อคำถามคำถามข้อนี้ออกจากระบบ?")) {
      try {
        // ยิงสั่งลบแถวประโยคคำถามข้อดังกล่าวออกจากระบบตารางฐานข้อมูลทันทีอ้างอิงไอดีข้อ
        const res = await axios.delete(`${API_BASE_URL}/admin/questions/${qId}`);
        if (res.data.result) fetchQuestions(selectedAsm.id); // คิวรีอัปเดตรายการคำถามที่คงเหลืออยู่มาเรนเดอร์ใหม่
      } catch (e) { console.error(e); }
    }
  };

  // ฟังก์ชันจัดเซฟบันทึกเกณฑ์ตัวเลขคะแนนทางการแพทย์บน Rule Engine หน้าบ้านจำลองของกระบวนการ BA
  const handleSaveRuleThreshold = (id) => {
    // กวาดลูปอัปเดตเปลี่ยนค่าตัวเลข Threshold คะแนนชิ้นที่ระบุไอดีบนอาเรย์เงื่อนไขหน้าจอจำลอง
    const updatedRules = routingRules.map(rule => rule.id === id ? { ...rule, threshold: editingThreshold } : rule);
    setRoutingRules(updatedRules); // ส่งค่าอาเรย์ชุดปรับปรุงล่าสุดบันทึกคืนกลับสเตทหลักหน้าบ้าน
    setEditingId(null);            // ล้างปลดล็อกรหัสแก้ออก
    alert("💾 อัปเดตเงื่อนไขเกณฑ์คะแนนบน Rule Engine สำเร็จ!"); // แสดงกล่องป็อปอัปยืนยันผลงาน
  };

  // 📊 SoC & useMemo: แยกส่วนแยกหน้าที่ความรับผิดชอบลอจิกคํานวณยอดรวมสถิติเคสคนไข้ (KPI Block Summary)
  const dashboardKPI = useMemo(() => {
    const totalCases = allUserLogs.length; // นับจำนวนแถวรวมของสถิติตัวเลขรายประวัติคัดกรองทั้งหมดในระบบฐานข้อมูล
    // 🎨 PRIORITY COLOR MAPPING: คัดกรองนับเฉพาะเคสสัญญานอันตรายสีแดงที่ส่งเสียงเตือนระดับชั้นวิกฤตความเสี่ยงสูง (High Risk Alert)
    const highRiskCases = allUserLogs.filter(log => 
      log.result_text?.includes("รุนแรง") || log.result_text?.includes("เสี่ยง")
    ).length;
    return { totalCases, highRiskCases }; // ส่งออกตัวแปรสถิติฉบับคำนวณคลีนๆ ไปวางป้อนตาราง UI
  }, [allUserLogs]);

  // ฟังก์ชันจัดเคลียร์กลไกล็อกเอาต์ผู้ดูแลระบบลบเซสชันถาวรตัวเครื่อง
  const handleAdminLogout = () => {
    localStorage.removeItem("user"); // กวาดทำลายลบก้อนประวัติโปรไฟล์ส่วนตัวเซสชันออกให้เกลี้ยง
    router.push("/login"); // สั่งเปลี่ยนเส้นทางนำทางดีดเด้งพากลับไปตั้งหลักเพจล็อกอินเริ่มต้น
  };

  // ดักฟัง: หากแอปกำลังซิงค์เช็กความพร้อมบัญชี หรือติดหน้าประมวลผลดึงไฟล์ข้อมูล ให้ขึ้นหลอดข้อความ Loading พ่นค้างดัก UI ไว้
  if (isLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-light">
        <div className="text-sm font-bold text-brand-main animate-pulse">กำลังซิงค์ระบบฐานข้อมูลกลาง...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary-light font-sans antialiased text-brand-main">
      
      {/* ส่วนหัวแถบขอบบาร์ Header หลักประจำห้องควบคุม Command Room ของแอดมิน */}
      <header className="sticky top-0 z-10 w-full bg-white/95 backdrop-blur border-b shadow-xs px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-base sm:text-lg font-black tracking-tight text-brand-main">🛡️ Admin Control Room</div>
          <button onClick={handleAdminLogout} className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer transition-colors">ออกจากระบบ</button>
        </div>
      </header>

      {/* พื้นที่กระดานคอนเทนต์บริหารคลังหลักส่วนกลาง */}
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-3xl bg-warm-white p-6 md:p-8 shadow-xl border border-purple-50/20">
          
          <div className="border-b pb-5">
            <h1 className="text-2xl font-black tracking-tight text-brand-main">แผงจัดการแบบประเมินและเงื่อนไข</h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">ระบบตั้งค่าเงื่อนไขแบบเรียลไทม์ผ่านโครงสร้างสถาปัตยกรรม MySQL และ Workflow Engine</p>
          </div>

          {/* แถบกรอบแสดงป้ายข้อความสีแดงดักจับจุดขัดข้อง API เครือข่ายระบบเน็ตหลังบ้าน */}
          {uiError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-bold text-center">
              ⚠️ {uiError}
            </div>
          )}

          {/* สวิตช์แผงแท็บปุ่มกนนำทางสลับกลุ่มความรับผิดชอบอิงชื่อคีย์ Token ระบบคงที่ */}
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { id: ADMIN_KEYS.TAB_DASHBOARD, label: "📈 แดชบอร์ดสรุป" },
              { id: ADMIN_KEYS.TAB_ASSESSMENTS, label: `🗂️ คลังชุดแบบประเมิน (${assessments.length})` },
              { id: ADMIN_KEYS.TAB_QUESTIONS, label: "❓ จัดการคำถามย่อย" },
              { id: ADMIN_KEYS.TAB_ROUTING, label: "⚙️ ตั้งค่าเงื่อนไขคะแนน (Rule Engine)" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowAddForm(false); }}
                className={`rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${activeTab === tab.id ? "bg-brand-main text-warm-white shadow-md" : "bg-[#FAF9FE] text-brand-main hover:bg-purple-50/40"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 border-t pt-6">
            
            {/* ========================================================
                TAB MODULE 1: DASHBOARD OVERVIEW (แผงกระดานแดชบอร์ดสรุปสถิติ)
                ======================================================== */}
            {activeTab === ADMIN_KEYS.TAB_DASHBOARD && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 📐 UI REFINEMENT CARD 1: ปรับแต่งสเกลตัวเลขอักษรจำนวนสะสมรวมลงมาอยู่ที่ระดับ `font-semibold` และหน่วยนับเป็น `font-normal` ละมุนตาตรงปกเข้าชุดหน้าจอประวัติคนไข้ */}
                  <div className="rounded-2xl p-5 bg-blue-50/60 border border-blue-100 shadow-3xs">
                    <div className="text-[11px] font-bold text-blue-600 uppercase">สถิติจำนวนการทำแบบประเมินรวม</div>
                    <div className="text-4xl font-semibold mt-1 text-brand-main">{dashboardKPI.totalCases} <span className="text-xs font-normal text-gray-400">ครั้ง</span></div>
                  </div>
                  {/* 🔴 HIGH PRIORITY RED ALVERT CARD 2: ปรับสเกลตัวเลขนับเคสวิกฤตอันตรายความสำคัญสีแดงลงมาที่ขนาดความหนา `font-semibold` คลีนช่องไฟระยะสายตาได้อย่างยอดเยี่ยมบาลานซ์สมส่วน */}
                  <div className="rounded-2xl p-5 bg-red-50/60 border border-red-100 shadow-3xs animate-pulse">
                    <div className="text-[11px] font-bold text-red-500 uppercase">🚨 จำนวนเคสกลุ่มเสี่ยงวิกฤต (High Risk)</div>
                    <div className="text-4xl font-semibold mt-1 text-red-600">{dashboardKPI.highRiskCases} <span className="text-xs font-normal text-gray-400">ราย</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB MODULE 2: ASSESSMENTS CONFIGURATION (แผงเพจเพิ่มลดคลังฟอร์มใหญ่)
                ======================================================== */}
            {activeTab === ADMIN_KEYS.TAB_ASSESSMENTS && (
              <div className="animate-fade-in space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs sm:text-sm font-black text-brand-main">คลังหัวข้อแบบประเมินหลักในฐานข้อมูล</h2>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="rounded-xl bg-brand-main px-4 py-2 text-[11px] font-bold text-warm-white shadow-xs cursor-pointer">{showAddForm ? "✕ ปิดฟอร์ม" : "＋ สร้างแบบประเมินใหม่"}</button>
                </div>

                {showAddForm && (
                  <div className="rounded-2xl bg-gray-50/80 p-4 border border-gray-200 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" value={newAsmCode} onChange={(e) => setNewAsmCode(e.target.value)} placeholder="รหัสสากลย่อ เช่น 2q / 9q" className="bg-white border text-xs px-3 py-2.5 rounded-xl outline-none focus:border-brand-main font-medium" />
                      <input type="text" value={newAsmTitle} onChange={(e) => setNewAsmTitle(e.target.value)} placeholder="ชื่อแบบประเมินย่อทางการ" className="bg-white border text-xs px-3 py-2.5 rounded-xl outline-none focus:border-brand-main sm:col-span-2 font-medium" />
                      <input type="text" value={newAsmDesc} onChange={(e) => setNewAsmDesc(e.target.value)} placeholder="คำอธิบายวัตถุประสงค์สั้นๆ ของชุดคัดกรองนี้" className="bg-white border text-xs px-3 py-2.5 rounded-xl outline-none focus:border-brand-main sm:col-span-3 font-medium" />
                    </div>
                    <button onClick={handleAddAssessment} className="rounded-xl bg-green-600 text-white px-4 py-2 text-xs font-bold cursor-pointer shadow-xs">บันทึกฟอร์มลง MySQL</button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {assessments.map((asm) => (
                    <div key={asm.id} className="rounded-2xl border bg-white p-4 flex flex-col justify-between shadow-3xs border-gray-100 hover:shadow-2xs transition-all">
                      <div>
                        <span className="text-[9px] font-black uppercase text-warm-white bg-brand-main px-2 py-0.5 rounded-md">{asm.code}</span>
                        <h4 className="font-black text-sm mt-3 text-brand-main leading-snug">{asm.title}</h4>
                      </div>
                      <div className="mt-5 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <button onClick={() => { setSelectedAsm(asm); setActiveTab(ADMIN_KEYS.TAB_QUESTIONS); }} className="text-xs font-bold text-purple-700 hover:underline cursor-pointer">📂 จัดการคำถาม</button>
                        {/* มาตรการล็อกป้องกัน: ล็อกพาร์ทระงับปุ่มทำลายล้างฟอร์มหลักมาตรฐาน 2Q/9Q/8Q ออกถาวร ป้องกันข้อมูลพังเสียหาย */}
                        {!["2q", "9q", "8q"].includes(asm.code.toLowerCase()) && (
                          <button onClick={() => handleDeleteAssessment(asm.id, asm.title)} className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer">ลบออก</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================
                TAB MODULE 3: QUESTIONS MANAGEMENT (แผงเพจกางจัดการประโยคคำถามย่อย)
                ======================================================== */}
            {activeTab === ADMIN_KEYS.TAB_QUESTIONS && (
              <div className="animate-fade-in space-y-4">
                <div className="bg-[#FAF9FE] p-4 rounded-2xl border border-purple-50 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">เลือกฟอร์มเพื่อแก้ไข:</span>
                    <select value={selectedAsm ? selectedAsm.id : ""} onChange={(e) => { const found = assessments.find(a => a.id === parseInt(e.target.value)); if (found) setSelectedAsm(found); }} className="rounded-xl border border-gray-200 bg-white p-2 text-xs font-bold text-brand-main outline-none">
                      {assessments.map(a => <option key={a.id} value={a.id}>[{a.code.toUpperCase()}] {a.title}</option>)}
                    </select>
                  </div>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="rounded-xl bg-brand-main px-4 py-2 text-[11px] font-bold text-warm-white shadow-xs cursor-pointer">{showAddForm ? "✕ ยกเลิก" : `＋ เพิ่มข้อคำถามย่อย`}</button>
                </div>

                {showAddForm && selectedAsm && (
                  <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 animate-fade-in">
                    <div className="flex gap-2">
                      <input type="text" value={newQText} onChange={(e) => setNewQText(e.target.value)} placeholder="กรอกประโยคข้อความคำถามทางการแพทย์ที่ต้องการเพิ่ม..." className="flex-1 bg-white border text-xs px-3 py-2.5 rounded-xl outline-none focus:border-brand-main font-medium" />
                      <button onClick={handleAddQuestion} className="rounded-xl bg-green-600 text-white px-5 py-2 text-xs font-bold shadow-xs cursor-pointer">เพิ่ม</button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {questions.map((q) => (
                    <div key={q.id} className="rounded-xl border border-gray-100 bg-white p-4 flex justify-between items-start gap-4 shadow-3xs">
                      <div className="flex-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">ข้อที่ {q.question_number}</span>
                        {editingId === q.id ? (
                          <div className="flex gap-2 mt-2 animate-fade-in">
                            <input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} className="flex-1 border text-xs px-3 py-2 rounded-xl outline-none" />
                            <button onClick={() => handleSaveQuestionEdit(q.id)} className="rounded-xl bg-green-50 text-green-600 text-xs px-3 py-1 font-bold border border-green-200">บันทึก</button>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm font-bold mt-1 text-brand-main">{q.question_text}</p>
                        )}
                      </div>
                      {editingId !== q.id && (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingId(q.id); setEditingText(q.question_text); }} className="rounded-lg bg-blue-50 text-blue-600 font-bold text-[10px] px-2.5 py-1 border border-blue-100 cursor-pointer">แก้ไข</button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="rounded-lg bg-red-50 text-red-500 font-bold text-[10px] px-2.5 py-1 border border-red-100 cursor-pointer">ลบ</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================
                TAB MODULE 4: ROUTING RULES ENGINE (แผงตั้งค่าเกณฑ์เงื่อนไขคะแนนไดนามิก)
                ======================================================== */}
            {activeTab === ADMIN_KEYS.TAB_ROUTING && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl">
                  <h3 className="text-xs font-black text-brand-main uppercase tracking-wide">🧠 Clinical Workflow Rule Engine (ระบบเปลี่ยนผ่านหน้าโรงพยาบาล)</h3>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">โมดูลนี้ทำหน้าที่เสมือนปัญญาประดิษฐ์คัดกรองระดับคะแนนดิบสะสมของฟอร์มต้นทาง เพื่อวิเคราะห์และตัดสินใจส่งเคสคนไข้ข้ามฟอร์มไปยังฟอร์มถัดไปโดยอัตโนมัติอย่างปลอดภัยตามมาตรฐาน สมุดเกณฑ์ สธ.</p>
                </div>

                <div className="space-y-2">
                  {routingRules.map((rule) => (
                    <div key={rule.id} className="rounded-xl border border-gray-100 bg-white p-4 flex justify-between items-center gap-4 shadow-3xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-100 text-purple-700 font-black text-[9px] px-2 py-0.5 rounded uppercase">จาก: {rule.source}</span>
                          <span className="text-gray-300 text-xs">➔</span>
                          <span className="bg-blue-100 text-blue-700 font-black text-[9px] px-2 py-0.5 rounded uppercase">ส่งต่อไป: {rule.target}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 font-bold">{rule.label}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block font-medium">เกณฑ์คะแนนขั้นต่ำ</span>
                          {editingId === `rule-${rule.id}` ? (
                            <div className="flex items-center gap-1 mt-1 animate-fade-in">
                              <span className="text-xs font-black text-brand-main">{rule.operator}</span>
                              <input 
                                type="number" 
                                value={editingThreshold} 
                                onChange={(e) => setEditingThreshold(parseInt(e.target.value) || 0)} 
                                className="w-14 border rounded-lg text-center p-1 text-xs font-black outline-none border-brand-main bg-white"
                              />
                              <button onClick={() => handleSaveRuleThreshold(rule.id)} className="bg-green-600 text-white rounded-lg px-2 py-1 text-[10px] font-bold shadow-xs">เซฟ</button>
                            </div>
                          ) : (
                            // ✨ UI REFINEMENT DETIAL: ปรับแต้มคะแนนเงื่อนไข Rule Engine ฝั่งขวาลงมาเป็นความหนา `font-semibold` ให้สอดคล้องกันละมุนตาทั้งเพจ
                            <span className="text-xs sm:text-sm font-semibold text-brand-main">{rule.operator} {rule.threshold} คะแนน</span>
                          )}
                        </div>
                        {editingId !== `rule-${rule.id}` && (
                          <button 
                            onClick={() => { setEditingId(`rule-${rule.id}`); setEditingThreshold(rule.threshold); }} 
                            className="rounded-xl bg-neutral-light hover:bg-purple-50 border border-purple-50/50 px-3 py-1.5 text-[11px] font-bold text-brand-main shadow-3xs cursor-pointer transition-colors"
                          >
                            ตั้งเกณฑ์
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}