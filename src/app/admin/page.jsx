"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import axios from "axios";

/**
 * @description หน้าแผงควบคุมหลักสำหรับผู้ดูแลระบบ (Admin Command Room) เพื่อจัดการแบบประเมินและกฎเกณฑ์การแพทย์
 * @principles SoC - แบ่งกลุ่มการบริหารคลังด้วยเมนูแท็บย่อย | KISS - เพิ่มโครงสร้าง Guard Clauses ป้องกันการเจาะข้อมูลหลังบ้าน
 */
export default function AdminPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  // ชุดข้อมูลเชื่อมโยง Backend MySQL เครือข่ายคลังข้อมูล
  const [assessments, setAssessments] = useState([]);
  const [selectedAsm, setSelectedAsm] = useState(null); 
  const [questions, setQuestions] = useState([]);
  const [allUserLogs, setAllUserLogs] = useState([]);    

  // ⚙️ Clinical Workflow Rule Engine (ตรรกะแบบ BA ผูกการเปลี่ยนผ่านหน้าแบบไดนามิก)
  const [routingRules, setRoutingRules] = useState([
    { id: 1, source: "2q", threshold: 1, operator: ">=", target: "9q", label: "หากมีอาการเสี่ยงใน 2Q ให้ทำ 9Q ต่อเนื่อง" },
    { id: 2, source: "9q", threshold: 7, operator: ">=", target: "8q", label: "หากซึมเศร้าระดับน้อยขึ้นไป (>=7) ให้คัดกรอง 8Q ทันที" },
    { id: 3, source: "9q", threshold: 7, operator: "<", target: "home", label: "หากคะแนน 9Q ปกติ (<7) ให้จบกระบวนการกลับหน้าแรก" }
  ]);

  const [activeTab, setActiveTab] = useState("dashboard"); 
  const [loadingData, setLoadingData] = useState(false);

  // States ควบคุมส่วนป็อปอัปและฟอร์ม CRUD สำหรับป้อนคำถามและฟอร์มใหม่
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editingThreshold, setEditingThreshold] = useState(0);

  const [newAsmCode, setNewAsmCode] = useState("");
  const [newAsmTitle, setNewAsmTitle] = useState("");
  const [newAsmDesc, setNewAsmDesc] = useState("");
  const [newQText, setNewQText] = useState("");

  // 🛡️ Security Gate - Guard Clauses: คัดกรองความปลอดภัยระดับสูงสุดก่อนปล่อยผ่านข้อมูลหลังบ้าน (KISS)
  useEffect(() => {
    if (isLoading) return;
    if (!authenticated) {
      router.replace("/login");
      return;
    }
    // ตรวจสอบสิทธิ์บัญชี หากอีเมลไม่ใช่แอดมินกลาง ให้ดีดเด้งกลับหน้าโฮมผู้ป่วยทันทีเพื่อความปลอดภัยข้อมูล
    if (authenticated.email !== "admin@test.com") {
      router.replace("/home");
    }
  }, [isLoading, authenticated, router]);

  const fetchAssessments = async () => {
    setLoadingData(true);
    try {
      const res = await axios.get("http://localhost:8080/api/admin/assessments");
      if (res.data.result) {
        setAssessments(res.data.data);
        if (res.data.data.length > 0 && !selectedAsm) {
          setSelectedAsm(res.data.data[0]); 
        }
      }
    } catch (err) { console.error("Load forms failure:", err); }
    setLoadingData(false);
  };

  const fetchQuestions = async (asmId) => {
    if (!asmId) return;
    try {
      const res = await axios.get(`http://localhost:8080/api/admin/questions/${asmId}`);
      if (res.data.result) setQuestions(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchUserLogs = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/phq9/all");
      if (res.data.result) setAllUserLogs(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (authenticated?.email === "admin@test.com") {
      fetchAssessments();
      fetchUserLogs();
    }
  }, [authenticated]);

  useEffect(() => {
    if (selectedAsm) fetchQuestions(selectedAsm.id);
  }, [selectedAsm]);

  // ========================================================
  // 🧠 DYNAMIC OPERATIONS: MANAGEMENT OPERATIONS (CRUD)
  // ========================================================
  const handleAddAssessment = async () => {
    if (!newAsmCode.trim() || !newAsmTitle.trim()) {
      alert("กรุณากรอกข้อมูลรหัสระบบย่อและชื่อฟอร์มให้ครบถ้วน");
      return;
    }
    try {
      const res = await axios.post("http://localhost:8080/api/admin/assessments", {
        code: newAsmCode.toLowerCase().trim(),
        title: newAsmTitle.trim(),
        description: newAsmDesc.trim()
      });
      if (res.data.result) {
        fetchAssessments();
        setNewAsmCode(""); setNewAsmTitle(""); setNewAsmDesc("");
        setShowAddForm(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteAssessment = async (id, title) => {
    if (confirm(`⚠️ ยืนยันการลบแบบประเมิน "${title}"? โครงสร้างคำถามภายในจะถูกลบทันที`)) {
      try {
        const res = await axios.delete(`http://localhost:8080/api/admin/assessments/${id}`);
        if (res.data.result) {
          setSelectedAsm(null);
          fetchAssessments();
        }
      } catch (e) { console.error(e); }
    }
  };

  const handleAddQuestion = async () => {
    if (!newQText.trim() || !selectedAsm) return;
    try {
      const res = await axios.post("http://localhost:8080/api/admin/questions", {
        assessment_id: selectedAsm.id,
        question_number: questions.length + 1,
        question_text: newQText.trim()
      });
      if (res.data.result) {
        fetchQuestions(selectedAsm.id);
        setNewQText("");
        setShowAddForm(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveQuestionEdit = async (qId) => {
    if (!editingText.trim()) return;
    try {
      const res = await axios.put(`http://localhost:8080/api/admin/questions/${qId}`, {
        question_text: editingText.trim()
      });
      if (res.data.result) {
        fetchQuestions(selectedAsm.id);
        setEditingId(null);
        setEditingText("");
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteQuestion = async (qId) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อคำถามคำถามข้อนี้ออกจากระบบ?")) {
      try {
        const res = await axios.delete(`http://localhost:8080/api/admin/questions/${qId}`);
        if (res.data.result) fetchQuestions(selectedAsm.id);
      } catch (e) { console.error(e); }
    }
  };

  const handleSaveRuleThreshold = (id) => {
    const updatedRules = routingRules.map(rule => rule.id === id ? { ...rule, threshold: editingThreshold } : rule);
    setRoutingRules(updatedRules);
    setEditingId(null);
    alert("💾 อัปเดตเงื่อนไขเกณฑ์คะแนนบน Rule Engine สำเร็จ!");
  };

  // 📊 SoC - คํานวณตัวชี้วัดความรุนแรงและยอดเคสสะสม (Dashboard KPI Blocks)
  const dashboardKPI = useMemo(() => {
    const totalCases = allUserLogs.length;
    // ปรับสีกลุ่มแจ้งเตือนระดับวิกฤตความเสี่ยงสูง (High Priority: Red Alert)
    const highRiskCases = allUserLogs.filter(log => 
      log.result_text?.includes("รุนแรง") || log.result_text?.includes("เสี่ยง")
    ).length;
    return { totalCases, highRiskCases };
  }, [allUserLogs]);

  const handleAdminLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (isLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-light">
        <div className="text-sm font-bold text-brand-main animate-pulse">กำลังซิงค์ระบบฐานข้อมูลกลาง...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary-light font-sans antialiased text-brand-main">
      
      <header className="sticky top-0 z-10 w-full bg-white/95 backdrop-blur border-b shadow-xs px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-base sm:text-lg font-black tracking-tight text-brand-main">🛡️ Admin Control Room</div>
          <button onClick={handleAdminLogout} className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer transition-colors">ออกจากระบบ</button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-3xl bg-warm-white p-6 md:p-8 shadow-xl border border-purple-50/20">
          
          <div className="border-b pb-5">
            <h1 className="text-2xl font-black tracking-tight text-brand-main">แผงจัดการแบบประเมินและเงื่อนไข</h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">ระบบตั้งค่าเงื่อนไขแบบเรียลไทม์ผ่านโครงสร้างสถาปัตยกรรม MySQL และ Workflow Engine</p>
          </div>

          {/* แถบเมนูย่อยแยกสัดส่วนความรับผิดชอบ (Tabs Navigation Component) */}
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { id: "dashboard", label: "📈 แดชบอร์ดสรุป" },
              { id: "assessments", label: `🗂️ คลังชุดแบบประเมิน (${assessments.length})` },
              { id: "questions", label: "❓ จัดการคำถามย่อย" },
              { id: "routing", label: "⚙️ ตั้งค่าเงื่อนไขคะแนน (Rule Engine)" }
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
            
            {/* TAB 1: DASHBOARD OVERVIEW */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl p-5 bg-blue-50/60 border border-blue-100 shadow-3xs">
                    <div className="text-[11px] font-bold text-blue-600 uppercase">สถิติจำนวนการทำแบบประเมินรวม</div>
                    <div className="text-4xl font-black mt-1 text-brand-main">{dashboardKPI.totalCases} <span className="text-xs font-bold text-gray-400">ครั้ง</span></div>
                  </div>
                  {/* สีแสดงความเสี่ยงกลุ่มสำคัญระดับวิกฤต (High Priority: Red Alert ตามดีไซน์) */}
                  <div className="rounded-2xl p-5 bg-red-50/60 border border-red-100 shadow-3xs animate-pulse">
                    <div className="text-[11px] font-bold text-red-500 uppercase">🚨 จำนวนเคสกลุ่มเสี่ยงวิกฤต (High Risk)</div>
                    <div className="text-4xl font-black mt-1 text-red-600">{dashboardKPI.highRiskCases} <span className="text-xs font-bold text-gray-400">ราย</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ASSESSMENTS CONFIGURATION */}
            {activeTab === "assessments" && (
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
                        <button onClick={() => { setSelectedAsm(asm); setActiveTab("questions"); }} className="text-xs font-bold text-purple-700 hover:underline cursor-pointer">📂 จัดการคำถาม</button>
                        {!["2q", "9q", "8q"].includes(asm.code.toLowerCase()) && (
                          <button onClick={() => handleDeleteAssessment(asm.id, asm.title)} className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer">ลบออก</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: QUESTIONS MANAGEMENT */}
            {activeTab === "questions" && (
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

            {/* TAB 4: ROUTING RULES ENGINE */}
            {activeTab === "routing" && (
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
                            <span className="text-xs sm:text-sm font-black text-brand-main">{rule.operator} {rule.threshold} คะแนน</span>
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