// // "use client";
// // import React, { useEffect, useState, useMemo } from "react";
// // import { useRouter } from "next/navigation";
// // import { useAuthen } from "@/utils/useAuthen";
// // import Navbar from "@/components/Navbar";

// // // ==========================================
// // // 🔤 CONFIG & DATABASE SERVICE
// // // ==========================================
// // const CONFIG = {
// //   ADMIN_ROLE: "admin",
// //   ADMIN_EMAIL: "admin@test.com",
// //   ROUTES: { LOGIN: "/login" }, // 🎯 CLEAN LOGIC: ถอด ROUTES ของ User (/home, /history) ออกทั้งหมดเพื่อไม่ให้ลоจิกปนกัน
// //   TABS: { ASMS: "assessments", QS: "questions", CHOICES: "choices" }
// // };

// // const adminDbService = {
// //   loadMasterData: () => {
// //     if (typeof window === "undefined") return { assessments: [] };
// //     const saved = localStorage.getItem("mindbetter_config_data");
    
// //     if (!saved) {
// //       const initialShell = {
// //         assessments: [
// //           { 
// //             id: "2q", 
// //             code: "2q", 
// //             title: "แบบคัดกรองเบื้องต้น (2Q)", 
// //             questions: [
// //               { id: "2q-1", question_text: "ใน 2 สัปดาห์ที่ผ่านมา รวมวันนี้ ท่านรู้สึก หดหู่ เศร้า หรือท้อแท้สิ้นหวัง หรือไม่", yes_score: 1 },
// //               { id: "2q-2", question_text: "ใน 2 สัปดาห์ที่ผ่านมา รวมวันนี้ท่านรู้สึก เบื่อ ทำอะไรก็ไม่เพลิดเพลิน หรือไม่", yes_score: 1 }
// //             ], 
// //             choices: [
// //               { text: "ไม่มี", val: 0 },
// //               { text: "มี", val: 1 }
// //             ] 
// //           },
// //           { 
// //             id: "9q", 
// //             code: "9q", 
// //             title: "แบบประเมินมาตรฐาน (9Q)", 
// //             questions: [
// //               { id: "9q-1", question_text: "เบื่อ ไม่สนใจอยากทำอะไร", yes_score: 1 },
// //               { id: "9q-2", question_text: "ไม่สบายใจ ซึมเศร้า ท้อแท้", yes_score: 1 },
// //               { id: "9q-3", question_text: "หลับยากหรือหลับๆตื่นๆหรือหลับมากไป", yes_score: 1 },
// //               { id: "9q-4", question_text: "เหนื่อยง่ายหรือไม่ค่อยมีแรง", yes_score: 1 },
// //               { id: "9q-5", question_text: "เบื่ออาหารหรือกินมากเกินไป", yes_score: 1 },
// //               { id: "9q-6", question_text: "รู้สึกไม่ดีกับตัวเอง คิดว่าตัวเองล้มเหลวหรือครอบครัวผิดหวัง", yes_score: 1 },
// //               { id: "9q-7", question_text: "สมาธิไม่ดี เวลาทำอะไร", yes_score: 1 },
// //               { id: "9q-8", question_text: "พูดช้า ทำอะไรช้าลงจนคนอื่นสังเกตเห็นได้", yes_score: 1 },
// //               { id: "9q-9", question_text: "คิดทำร้ายตนเอง หรือคิดว่าถ้าตายไปคงจะดี", yes_score: 1 }
// //             ], 
// //             choices: [
// //               { text: "ไม่มีเลย", val: 0 },
// //               { text: "เป็นบางวัน (1-7 วัน)", val: 1 },
// //               { text: "เป็นบ่อย (> 7 วัน)", val: 2 },
// //               { text: "เป็นทุกวัน", val: 3 }
// //             ] 
// //           },
// //           { 
// //             id: "8q", 
// //             code: "8q", 
// //             title: "แบบเฝ้าระวังวิกฤต (8Q)", 
// //             questions: [
// //               { id: "8q-1", question_text: "คิดอยากตาย หรือ คิดว่าตายไปจะดีกว่า", yes_score: 1 },
// //               { id: "8q-2", question_text: "อยากทำร้ายตัวเอง หรือ ทำให้ตัวเองบาดเจ็บ", yes_score: 2 },
// //               { id: "8q-3", question_text: "คิดเกี่ยวกับการฆ่าตัวตาย", yes_score: 6 },
// //               { id: "8q-4", question_text: "มีแผนการที่จะฆ่าตัวตาย", yes_score: 8 },
// //               { id: "8q-5", question_text: "ได้เตรียมการที่จะทำร้ายตนเองหรือเตรียมการจะฆ่าตัวตาย", yes_score: 9 },
// //               { id: "8q-6", question_text: "ได้ทำให้ตนเองบาดเจ็บแต่ไม่ตั้งใจที่จะทำให้เสียชีวิต", yes_score: 4 },
// //               { id: "8q-7", question_text: "ได้พยายามฆ่าตัวตายโดยคาดหวังที่จะให้ตาย", yes_score: 10 },
// //               { id: "8q-8", question_text: "ตลอดชีวิตที่ผ่านมา ท่านเคยพยายามฆ่าตัวตาย", yes_score: 4 }
// //             ], 
// //             choices: [] 
// //           }
// //         ]
// //       };
// //       localStorage.setItem("mindbetter_config_data", JSON.stringify(initialShell));
// //       return initialShell;
// //     }
// //     return JSON.parse(saved);
// //   },
// //   saveMasterData: (data) => {
// //     if (typeof window !== "undefined") {
// //       localStorage.setItem("mindbetter_config_data", JSON.stringify(data));
// //     }
// //   }
// // };

// // export default function AdminPage() {
// //   const router = useRouter();
// //   const { isLoading, authenticated } = useAuthen();

// //   const [masterData, setMasterData] = useState({ assessments: [] });
// //   const [activeTab, setActiveTab] = useState(CONFIG.TABS.QS);
// //   const [selectedAsmId, setSelectedAsmId] = useState("2q");
// //   const [showAddForm, setShowAddForm] = useState(false);

// //   const [inputTitle, setInputTitle] = useState("");
// //   const [inputValue, setInputValue] = useState(0);
// //   const [editingIndex, setEditingIndex] = useState(null);

// //   // 🛡️ STRICT ROLE BOUNDARY PROTECTION: ตรวจเช็กสิทธิ์แอดมินแท้จริง หากผู้ใช้ไม่ใช่แอดมินให้ดีดไปหน้าล็อกอินหลักทันที ไม่เปิดท่อเชื่อมพาร์ทข้ามกันไปมา
// //   useEffect(() => {
// //     if (isLoading) return;
// //     if (!authenticated) {
// //       router.replace(CONFIG.ROUTES.LOGIN);
// //       return;
// //     }

// //     if (!authenticated.email && !authenticated.role_name) return;

// //     const role = String(authenticated.role_name || "").toLowerCase().trim();
// //     const email = String(authenticated.email || "").toLowerCase().trim();

// //     // 🎯หากไม่ใช่ Admin ตัวจริงตามรหัสหรือเมลระบบ บังคับให้ออกจากเซสชันหน้านี้ทันทีเพื่อ data integrity 
// //     if (role !== CONFIG.ADMIN_ROLE && email !== CONFIG.ADMIN_EMAIL) {
// //       router.replace(CONFIG.ROUTES.LOGIN);
// //     }
// //   }, [isLoading, authenticated, router]);

// //   useEffect(() => {
// //     setMasterData(adminDbService.loadMasterData());
// //   }, []);

// //   useEffect(() => {
// //     if (selectedAsmId === "8q" && activeTab === CONFIG.TABS.CHOICES) {
// //       setActiveTab(CONFIG.TABS.QS); 
// //     }
// //   }, [selectedAsmId, activeTab]);

// //   const currentAsm = useMemo(() => {
// //     return masterData.assessments.find(a => a.id === selectedAsmId) || null;
// //   }, [masterData, selectedAsmId]);

// //   const resetForm = () => {
// //     setEditingIndex(null); setInputTitle(""); setInputValue(0); setShowAddForm(false);
// //   };

// //   const commitUpdate = (newAsms) => {
// //     const newData = { assessments: newAsms };
// //     setMasterData(newData);
// //     adminDbService.saveMasterData(newData);
// //     resetForm();
// //   };

// //   const handleAddQ = () => {
// //     if (!inputTitle.trim()) return;
    
// //     let defaultYesScore = 1;
// //     if (selectedAsmId === "8q") {
// //       const qNum = (currentAsm?.questions?.length || 0) + 1;
// //       if (qNum === 2) defaultYesScore = 2;
// //       else if (qNum === 3) defaultYesScore = 6;
// //       else if (qNum === 4) defaultYesScore = 8;
// //       else if (qNum === 5) defaultYesScore = 9;
// //       else if (qNum === 6) defaultYesScore = 4;
// //       else if (qNum === 7) defaultYesScore = 10;
// //       else if (qNum === 8) defaultYesScore = 4;
// //     }

// //     const newQuestionObj = {
// //       id: `q-${Date.now()}`,
// //       question_text: inputTitle.trim(),
// //       yes_score: defaultYesScore
// //     };

// //     const nextAsms = masterData.assessments.map(asm => 
// //       asm.id === selectedAsmId ? { ...asm, questions: [...asm.questions, newQuestionObj] } : asm
// //     );
// //     commitUpdate(nextAsms);
// //   };

// //   const handleEditQ = (idx) => {
// //     if (!inputTitle.trim()) return;
// //     const nextAsms = masterData.assessments.map(asm => {
// //       if (asm.id === selectedAsmId) {
// //         const qs = [...asm.questions];
// //         qs[idx] = { ...qs[idx], question_text: inputTitle.trim() };
// //         return { ...asm, questions: qs };
// //       }
// //       return asm;
// //     });
// //     commitUpdate(nextAsms);
// //   };

// //   const handleAddChoice = () => {
// //     if (!inputTitle.trim()) return;
// //     const nextAsms = masterData.assessments.map(asm => 
// //       asm.id === selectedAsmId ? { ...asm, choices: [...asm.choices, { text: inputTitle.trim(), val: Number(inputValue) }] } : asm
// //     );
// //     commitUpdate(nextAsms);
// //   };

// //   const handleEditChoice = (idx) => {
// //     if (!inputTitle.trim()) return;
// //     const nextAsms = masterData.assessments.map(asm => {
// //       if (asm.id === selectedAsmId) {
// //         const cs = [...asm.choices]; 
// //         cs[idx] = { text: inputTitle.trim(), val: Number(inputValue) };
// //         return { ...asm, choices: cs };
// //       }
// //       return asm;
// //     });
// //     commitUpdate(nextAsms);
// //   };

// //   if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#E8FAFF] text-sm font-semibold animate-pulse">กำลังซิงค์ระบบฐานข้อมูลแอดมิน...</div>;
// //   if (!authenticated || (authenticated.role_name !== 'admin' && authenticated.email !== CONFIG.ADMIN_EMAIL)) return null;

// //   return (
// //     <div className="min-h-screen bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
// //       <Navbar username={authenticated?.username} activeMenu="admin" />

// //       <main className="mx-auto max-w-5xl px-4 py-8">
// //         <div className="rounded-3xl bg-white p-6 md:p-8 shadow-xl border border-purple-50/20">
          
// //           <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
// //             <div>
// //               <h1 className="text-2xl font-semibold tracking-tight">แผงจัดการแบบประเมินและเงื่อนไข</h1>
// //               <p className="text-[#432C81]/60 text-xs font-semibold mt-0.5">ระบบตั้งค่าจัดสรรระベーションคำถามทางคลินิก (Dynamic Scale Configurations)</p>
// //             </div>
// //             {/* 🎯 REFACTOR FIX: ถอดปุ่ม "ดู History รวม" ที่วิ่งข้ามไปพาร์ทหน้า User (/history) ออกไปอย่างเสร็จสรรพเพื่อรักษา Role Boundaries */}
// //             <div className="flex gap-2 shrink-0">
// //               <span className="bg-purple-50 text-[#432C81] text-[10px] font-semibold px-3 py-2 rounded-xl border border-purple-100">
// //                 🔒 Mode: Strict Security Administrator
// //               </span>
// //             </div>
// //           </header>

// //           <div className="mb-6 bg-[#FAF9FE] p-4 rounded-2xl border border-purple-50 flex items-center gap-3 shadow-3xs">
// //             <span className="text-xs font-semibold text-gray-400">เลือกแบบประเมินหลักเพื่อตั้งค่าข้อมูล:</span>
// //             <select value={selectedAsmId} onChange={(e) => { setSelectedAsmId(e.target.value); resetForm(); }} className="rounded-xl border border-gray-200 bg-white p-2 text-xs font-semibold text-[#432C81] outline-none cursor-pointer">
// //               {masterData.assessments.map(asm => <option key={asm.id} value={asm.id}>[{asm.code.toUpperCase()}] {asm.title}</option>)}
// //             </select>
// //           </div>

// //           <nav className="mb-6 flex gap-2">
// //             <button type="button" onClick={() => { setActiveTab(CONFIG.TABS.QS); resetForm(); }} className={`rounded-xl px-5 py-2.5 text-xs font-semibold transition-all ${activeTab === CONFIG.TABS.QS ? "bg-[#432C81] text-white shadow-md" : "bg-[#FAF9FE] text-[#432C81]"}`}>
// //               📋 จัดการคำถามย่อย ({currentAsm?.questions?.length || 0} ข้อ)
// //             </button>
// //             {selectedAsmId !== "8q" && (
// //               <button type="button" onClick={() => { setActiveTab(CONFIG.TABS.CHOICES); resetForm(); }} className={`rounded-xl px-5 py-2.5 text-xs font-semibold transition-all ${activeTab === CONFIG.TABS.CHOICES ? "bg-[#432C81] text-white shadow-md" : "bg-[#FAF9FE] text-[#432C81]"}`}>
// //                 ✨ จัดการตัวเลือกคะแนน ({currentAsm?.choices?.length || 0} ช้อยส์)
// //               </button>
// //             )}
// //           </nav>

// //           <div className="min-h-[350px]">
// //             {activeTab === CONFIG.TABS.QS ? (
// //               <div className="animate-fade-in">
// //                 <div className="flex justify-between items-center mb-6">
// //                   <h3 className="text-base font-semibold">รายการข้อคำถามของ [{currentAsm?.code.toUpperCase()}]</h3>
// //                   <button onClick={() => setShowAddForm(!showAddForm)} className="rounded-xl bg-[#432C81] text-white text-xs px-4 py-2 font-semibold cursor-pointer">{showAddForm ? "✕ ปิดช่องป้อน" : "＋ เพิ่มโจทย์คำถาม"}</button>
// //                 </div>
// //                 {showAddForm && (
// //                   <div className="mb-6 flex gap-2 animate-fade-in bg-gray-50 p-4 rounded-xl border">
// //                     <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="คีย์ระบุประโยคข้อความคำถามข้อใหม่..." className="flex-1 border p-3 rounded-2xl text-xs font-semibold outline-none focus:border-[#432C81]" />
// //                     <button onClick={handleAddQ} className="rounded-2xl bg-green-500 text-white px-6 font-semibold text-xs cursor-pointer">บันทึกเพิ่ม</button>
// //                   </div>
// //                 )}
// //                 <div className="space-y-3">
// //                   {currentAsm?.questions.map((q, i) => (
// //                     <div key={q.id || i} className="p-4 rounded-2xl bg-[#FAF9FE] border border-gray-100 flex justify-between items-start gap-3">
// //                       <div className="flex-1 min-w-0">
// //                         <div className="flex items-center gap-2 mb-1">
// //                           <span className="text-[10px] text-gray-400 font-semibold uppercase">ข้อที่ {i + 1}</span>
// //                           <span className="bg-purple-100 text-[#432C81] text-[9px] font-semibold px-2 py-0.5 rounded-md">
// //                             เกณฑ์: ไม่มี = 0 | มี = {q.yes_score || 1} คะแนน
// //                           </span>
// //                         </div>
// //                         {editingIndex === i ? (
// //                           <div className="flex gap-2 mt-2 animate-fade-in">
// //                             <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} className="flex-1 border bg-white px-3 py-2 text-xs rounded-xl font-semibold outline-none" />
// //                             <button onClick={() => handleEditQ(i)} className="rounded-lg bg-green-50 text-green-600 border border-green-200 px-3 py-1 text-xs font-semibold">เซฟ</button>
// //                             <button onClick={resetForm} className="rounded-lg bg-gray-100 text-gray-600 px-3 py-1 text-xs font-semibold">ยกเลิก</button>
// //                           </div>
// //                         ) : (
// //                           <p className="text-xs sm:text-sm font-semibold mt-1 leading-relaxed">{q.question_text || q}</p>
// //                         )}
// //                       </div>
// //                       {editingIndex !== i && (
// //                         <div className="flex gap-1 shrink-0">
// //                           <button onClick={() => { setEditingIndex(i); setInputTitle(q.question_text || q); }} className="rounded-lg bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 text-[10px] font-semibold cursor-pointer">แก้ไข</button>
// //                           <button onClick={() => { const next = currentAsm.questions.filter((_, idx) => idx !== i); commitUpdate(masterData.assessments.map(a => a.id === selectedAsmId ? { ...a, questions: next } : a)); }} className="rounded-lg bg-red-50 text-red-500 border border-red-100 px-2.5 py-1 text-[10px] font-semibold cursor-pointer">ลบ</button>
// //                         </div>
// //                       )}
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>
// //             ) : (
// //               <div className="animate-fade-in">
// //                 <div className="flex justify-between items-center mb-6">
// //                   <h3 className="text-base font-semibold">ตั้งค่าตัวเลือกและแต้มคะแนน [{currentAsm?.code.toUpperCase()}]</h3>
// //                   <button onClick={() => setShowAddForm(!showAddForm)} className="rounded-xl bg-[#432C81] text-white text-xs px-4 py-2 font-semibold cursor-pointer">{showAddForm ? "✕ ปิดช่องป้อน" : "＋ เพิ่มตัวเลือก"}</button>
// //                 </div>
// //                 {showAddForm && (
// //                   <div className="mb-6 flex gap-2 animate-fade-in bg-gray-50 p-4 rounded-xl border">
// //                     <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="พิมพ์ข้อความป้ายชื่อตัวเลือกคะแนน..." className="flex-1 border bg-white p-3 rounded-2xl text-xs font-semibold outline-none" />
// //                     <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="คะแนน" className="w-20 border bg-white p-3 rounded-2xl text-xs font-semibold text-center outline-none" />
// //                     <button onClick={handleAddChoice} className="rounded-2xl bg-green-500 text-white px-6 font-semibold text-xs cursor-pointer">บันทึกเพิ่ม</button>
// //                   </div>
// //                 )}
// //                 <div className="space-y-2">
// //                   {currentAsm?.choices.map((c, i) => (
// //                     <div key={i} className="p-4 rounded-2xl bg-[#FAF9FE] border border-gray-100 flex justify-between items-center gap-3">
// //                       <div className="flex-1 min-w-0">
// //                         {editingIndex === i ? (
// //                           <div className="flex gap-2 animate-fade-in">
// //                             <input type="text" value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} className="flex-1 border bg-white px-3 py-2 text-xs rounded-xl font-semibold outline-none" />
// //                             <input type="number" value={inputValue} onChange={(e) => setInputValue(parseInt(e.target.value) || 0)} className="w-20 border bg-white px-3 py-2 text-xs rounded-xl text-center font-semibold outline-none" />
// //                             <button onClick={() => handleEditChoice(i)} className="rounded-lg bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 text-xs font-semibold">เซฟ</button>
// //                             <button onClick={resetForm} className="rounded-lg bg-gray-100 text-gray-600 px-3 py-1.5 text-xs font-semibold">ยกเลิก</button>
// //                           </div>
// //                         ) : (
// //                           <div className="flex items-center gap-3">
// //                             <span className="text-xs sm:text-sm font-semibold text-[#432C81] truncate">{c.text || c.label}</span>
// //                             <span className="rounded-md bg-[#432C81] px-2.5 py-0.5 text-[10px] font-semibold text-white shrink-0">{c.val !== undefined ? c.val : c.value} คะแนน</span>
// //                           </div>
// //                         )}
// //                       </div>
// //                       {editingIndex !== i && (
// //                         <div className="flex gap-1 shrink-0">
// //                           <button onClick={() => { setEditingIndex(i); setInputTitle(c.text || c.label); setInputValue(c.val !== undefined ? c.val : c.value); }} className="rounded-lg bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 text-[10px] font-semibold cursor-pointer">แก้ไข</button>
// //                           <button onClick={() => { const next = currentAsm.choices.filter((_, idx) => idx !== i); commitUpdate(masterData.assessments.map(a => a.id === selectedAsmId ? { ...a, choices: next } : a)); }} className="rounded-lg bg-red-50 text-red-500 border border-red-100 px-2.5 py-1 text-[10px] font-semibold cursor-pointer">ลบ</button>
// //                         </div>
// //                       )}
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>
// //             )}
// //           </div>

// //           {/* LIVE PREVIEW COMPONENT */}
// //           <div className="mt-6 rounded-2xl bg-[#FAF9FE] p-5 border border-gray-100/70 text-xs animate-fade-in">
// //             <span className="bg-[#432C81] text-white text-[8px] font-semibold px-2 py-0.5 rounded uppercase block w-max mb-2">Live Dynamic Preview: {selectedAsmId.toUpperCase()}</span>
// //             <p className="mb-4 font-semibold tracking-tight text-[#432C81] leading-relaxed">
// //               {currentAsm?.questions[0]?.question_text || "🔴 ยังไม่มีระเบียบข้อคำถามในแบบประเมินชุดนี้"}
// //             </p>
// //             <div className="space-y-2 max-w-sm">
// //               {selectedAsmId === "8q" ? (
// //                 <>
// //                   <div className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold border text-[#432C81] flex justify-between items-center shadow-3xs">
// //                     <span>ไม่มี</span> <span className="text-[10px] text-gray-400 font-medium">(0 แต้ม)</span>
// //                   </div>
// //                   <div className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold border text-[#432C81] flex justify-between items-center shadow-3xs">
// //                     <span>มี</span> <span className="text-[10px] text-purple-600 font-bold">({currentAsm?.questions[0]?.yes_score || 1} แต้ม)</span>
// //                   </div>
// //                 </>
// //               ) : (
// //                 currentAsm?.choices.length === 0 ? (
// //                   <div className="text-[11px] text-gray-400 font-medium">🔴 ยังไม่มีป้ายตัวเลือกคะแนนในถังจัดเก็บ</div>
// //                 ) : (
// //                   currentAsm?.choices.map((choice, index) => (
// //                     <div key={index} className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold border text-[#432C81] flex justify-between items-center shadow-3xs">
// //                       <span>{choice.text || choice.label}</span> 
// //                       <span className="text-[10px] text-gray-400 font-medium">({choice.val !== undefined ? choice.val : choice.value} แต้ม)</span>
// //                     </div>
// //                   ))
// //                 )
// //               )}
// //             </div>
// //           </div>

// //         </div>
// //       </main>
// //     </div>
// //   );
// // }


// "use client";
// import React, { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useAuthen } from "@/utils/useAuthen";



// const initialChoices = [
//   { label: "ไม่เลย", value: 0 },
//   { label: "หลายวัน", value: 1 },
//   { label: "มากกว่าครึ่งหนึ่งของวัน", value: 2 },
//   { label: "แทบทุกวัน", value: 3 },
// ];

// const initialQuestions = [
//   "รู้สึกไม่สนใจหรือไม่เพลิดเพลินกับการทำสิ่งต่าง ๆ",
//   "รู้สึกเศร้า ท้อแท้ หรือหมดหวัง",
//   "มีปัญหาเรื่องการนอน (นอนไม่หลับ/หลับยาก/หลับมากไป)",
//   "รู้สึกเหนื่อยง่าย หรือไม่มีพลัง",
//   "เบื่ออาหาร หรือกินมากเกินไป",
//   "รู้สึกไม่ชอบตัวเอง คิดว่าตนล้มเหลว หรือทำให้ตัวเอง/ครอบครัวผิดหวัง",
//   "มีปัญหาเรื่องสมาธิ เช่น อ่านหนังสือ/ดูทีวีแล้วไม่ค่อยเข้าใจ",
//   "พูดหรือเคลื่อนไหวช้าลงจนคนอื่นสังเกตได้ หรือกระสับกระส่ายอยู่ไม่นิ่ง",
//   "คิดทำร้ายตนเอง หรือคิดว่าถ้าตายไปคงจะดีกว่า",
// ];

// export default function AdminPage() {
//   const router = useRouter();
//   const { isLoading, authenticated } = useAuthen();

//   const [questions, setQuestions] = useState(initialQuestions);
//   const [choices, setChoices] = useState(initialChoices);
//   const [activeTab, setActiveTab] = useState("questions"); // questions | choices
//   const [editingIndex, setEditingIndex] = useState(null);
//   const [editingText, setEditingText] = useState("");
//   const [editingValue, setEditingValue] = useState(0);
//   const [showAddForm, setShowAddForm] = useState(false);
//   const [newItemText, setNewItemText] = useState("");
//   const [newItemValue, setNewItemValue] = useState(0);

//   useEffect(() => {
//     if (!isLoading && !authenticated) {
//       router.replace("/login");
//       return;
//     }
    
//     // Admin ถ้าไม่ใช่ก็กลับหน้า homeเลย
//     if (authenticated && authenticated.email !== "admin@test.com") {
//       router.replace("/home");
//       return;
//     }
//   }, [isLoading, authenticated, router]);

//   // โหลดข้อมูลจาก localStorage
//   useEffect(() => {
//     try {
//       const savedQuestions = localStorage.getItem("admin_questions");
//       const savedChoices = localStorage.getItem("admin_choices");
      
//       if (savedQuestions) {
//         setQuestions(JSON.parse(savedQuestions));
//       }
//       if (savedChoices) {
//         setChoices(JSON.parse(savedChoices));
//       }
//     } catch (error) {
//       console.error("Error loading saved data:", error);
//     }
//   }, []);

//   // บันทึกข้อมูลลง localStorage
//   const saveToStorage = (newQuestions, newChoices) => {
//     try {
//       localStorage.setItem("admin_questions", JSON.stringify(newQuestions || questions));
//       localStorage.setItem("admin_choices", JSON.stringify(newChoices || choices));
//     } catch (error) {
//       console.error("Error saving data:", error);
//     }
//   };

//   const handleEditQuestion = (index) => { 
//     setEditingIndex(index);
//     setEditingText(questions[index]);
//   };

//   const handleSaveQuestion = (index) => {
//     const newQuestions = [...questions];
//     newQuestions[index] = editingText;
//     setQuestions(newQuestions);
//     saveToStorage(newQuestions, null);
//     setEditingIndex(null);
//     setEditingText("");
//   };

//   const handleDeleteQuestion = (index) => {
//     if (confirm("คุณแน่ใจหรือไม่ที่จะลบคำถามนี้?")) {
//       const newQuestions = questions.filter((_, i) => i !== index);
//       setQuestions(newQuestions);
//       saveToStorage(newQuestions, null);
//     }
//   };

//   const handleAddQuestion = () => {
//     if (newItemText.trim()) {
//       const newQuestions = [...questions, newItemText.trim()];
//       setQuestions(newQuestions);
//       saveToStorage(newQuestions, null);
//       setNewItemText("");
//       setShowAddForm(false);
//     }
//   };

//   const handleEditChoice = (index) => {
//     setEditingIndex(index);
//     setEditingText(choices[index].label);
//     setEditingValue(choices[index].value);
//   };

//   const handleSaveChoice = (index) => {
//     const newChoices = [...choices];
//     newChoices[index] = { label: editingText, value: editingValue };
//     setChoices(newChoices);
//     saveToStorage(null, newChoices);
//     setEditingIndex(null);
//     setEditingText("");
//     setEditingValue(0);
//   };

//   const handleDeleteChoice = (index) => {
//     if (confirm("คุณแน่ใจหรือไม่ที่จะลบตัวเลือกนี้?")) {
//       const newChoices = choices.filter((_, i) => i !== index);
//       setChoices(newChoices);
//       saveToStorage(null, newChoices);
//     }
//   };

//   const handleAddChoice = () => {
//     if (newItemText.trim()) {
//       const newChoices = [...choices, { label: newItemText.trim(), value: newItemValue }];
//       setChoices(newChoices);
//       saveToStorage(null, newChoices);
//       setNewItemText("");
//       setNewItemValue(0);
//       setShowAddForm(false);
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("user");
//     router.replace("/login");
//   };

//   const resetToDefault = () => {
//     if (confirm("คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้น?")) {
//       setQuestions(initialQuestions);
//       setChoices(initialChoices);
//       localStorage.removeItem("admin_questions");
//       localStorage.removeItem("admin_choices");
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
//         <div className="text-[#432C81] text-xl">Loading...</div>
//       </div>
//     );
//   }

//   if (!authenticated || authenticated.email !== "admin@test.com") {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
//         <div className="text-[#432C81] text-xl">Access Denied</div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#D0F8FF] p-4">
//       <div className="mx-auto max-w-6xl">
//         {/* Header */}
//         <div className="mb-6 flex items-center justify-between">
//           <div>
//             <h1 className="text-3xl font-bold text-[#432C81]">Admin Panel</h1>
//             <p className="text-[#432C81] opacity-70">จัดการคำถามและตัวเลือกการประเมิน PHQ-9</p>
//           </div>
//           <div className="flex gap-3">
//             <button
//               onClick={resetToDefault}
//               className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
//             >
//               รีเซ็ต
//             </button>
//             <button
//               onClick={() => router.push("/history")}
//               className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-600"
//             >
//               ดู History
//             </button>
//             <button
//               onClick={handleLogout}
//               className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
//             >
//               ออกจากระบบ
//             </button>
//           </div>
//         </div>

//         {/* Tabs */}
//         <div className="mb-6 flex gap-4">
//           <button
//             onClick={() => setActiveTab("questions")}
//             className={`rounded-lg px-6 py-3 font-semibold transition-colors ${
//               activeTab === "questions"
//                 ? "bg-[#432C81] text-white"
//                 : "bg-white text-[#432C81] hover:bg-[#EFEAFE]"
//             }`}
//           >
//             คำถาม ({questions.length})
//           </button>
//           <button
//             onClick={() => setActiveTab("choices")}
//             className={`rounded-lg px-6 py-3 font-semibold transition-colors ${
//               activeTab === "choices"
//                 ? "bg-[#432C81] text-white"
//                 : "bg-white text-[#432C81] hover:bg-[#EFEAFE]"
//             }`}
//           >
//             ตัวเลือก ({choices.length})
//           </button>
//         </div>

//         <div className="rounded-2xl bg-white p-6 shadow">
//           {/* Questions Tab */}
//           {activeTab === "questions" && (
//             <div>
//               <div className="mb-6 flex items-center justify-between">
//                 <h2 className="text-2xl font-bold text-[#432C81]">จัดการคำถาม</h2>
//                 <button
//                   onClick={() => setShowAddForm(!showAddForm)}
//                   className="rounded-lg bg-[#432C81] px-4 py-2 font-semibold text-white hover:opacity-90"
//                 >
//                   {showAddForm ? "ยกเลิก" : "เพิ่มคำถาม"}
//                 </button>
//               </div>

//               {/* Add Form */}
//               {showAddForm && (
//                 <div className="mb-6 rounded-lg bg-[#F6F7FB] p-4">
//                   <h3 className="mb-3 font-semibold text-[#432C81]">เพิ่มคำถามใหม่</h3>
//                   <div className="flex gap-3">
//                     <input
//                       type="text"
//                       value={newItemText}
//                       onChange={(e) => setNewItemText(e.target.value)}
//                       placeholder="กรอกคำถามใหม่..."
//                       className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
//                     />
//                     <button
//                       onClick={handleAddQuestion}
//                       className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-600"
//                     >
//                       เพิ่ม
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* Questions List */}
//               <div className="space-y-3">
//                 {questions.map((question, index) => (
//                   <div key={index} className="rounded-lg border border-gray-200 p-4">
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="flex-1">
//                         <div className="mb-2 text-sm font-medium text-[#432C81]">
//                           คำถามที่ {index + 1}
//                         </div>
//                         {editingIndex === index ? (
//                           <div className="flex gap-2">
//                             <textarea
//                               value={editingText}
//                               onChange={(e) => setEditingText(e.target.value)}
//                               className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
//                               rows="2"
//                             />
//                             <div className="flex flex-col gap-1">
//                               <button
//                                 onClick={() => handleSaveQuestion(index)}
//                                 className="rounded bg-green-500 px-3 py-1 text-sm font-semibold text-white hover:bg-green-600"
//                               >
//                                 บันทึก
//                               </button>
//                               <button
//                                 onClick={() => setEditingIndex(null)}
//                                 className="rounded bg-gray-500 px-3 py-1 text-sm font-semibold text-white hover:bg-gray-600"
//                               >
//                                 ยกเลิก
//                               </button>
//                             </div>
//                           </div>
//                         ) : (
//                           <p className="text-gray-700">{question}</p>
//                         )}
//                       </div>
//                       {editingIndex !== index && (
//                         <div className="flex gap-2">
//                           <button
//                             onClick={() => handleEditQuestion(index)}
//                             className="rounded bg-blue-500 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-600"
//                           >
//                             แก้ไข
//                           </button>
//                           <button
//                             onClick={() => handleDeleteQuestion(index)}
//                             className="rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600"
//                           >
//                             ลบ
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Choices Tab */}
//           {activeTab === "choices" && (
//             <div>
//               <div className="mb-6 flex items-center justify-between">
//                 <h2 className="text-2xl font-bold text-[#432C81]">จัดการตัวเลือก</h2>
//                 <button
//                   onClick={() => setShowAddForm(!showAddForm)}
//                   className="rounded-lg bg-[#432C81] px-4 py-2 font-semibold text-white hover:opacity-90"
//                 >
//                   {showAddForm ? "ยกเลิก" : "เพิ่มตัวเลือก"}
//                 </button>
//               </div>

//               {/* Add Form */}
//               {showAddForm && (
//                 <div className="mb-6 rounded-lg bg-[#F6F7FB] p-4">
//                   <h3 className="mb-3 font-semibold text-[#432C81]">เพิ่มตัวเลือกใหม่</h3>
//                   <div className="flex gap-3">
//                     <input
//                       type="text"
//                       value={newItemText}
//                       onChange={(e) => setNewItemText(e.target.value)}
//                       placeholder="กรอกข้อความตัวเลือก..."
//                       className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
//                     />
//                     <input
//                       type="number"
//                       value={newItemValue}
//                       onChange={(e) => setNewItemValue(parseInt(e.target.value) || 0)}
//                       placeholder="คะแนน"
//                       className="w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
//                     />
//                     <button
//                       onClick={handleAddChoice}
//                       className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-600"
//                     >
//                       เพิ่ม
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* Choices List */}
//               <div className="space-y-3">
//                 {choices.map((choice, index) => (
//                   <div key={index} className="rounded-lg border border-gray-200 p-4">
//                     <div className="flex items-center justify-between gap-3">
//                       <div className="flex-1">
//                         {editingIndex === index ? (
//                           <div className="flex gap-2">
//                             <input
//                               type="text"
//                               value={editingText}
//                               onChange={(e) => setEditingText(e.target.value)}
//                               className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
//                             />
//                             <input
//                               type="number"
//                               value={editingValue}
//                               onChange={(e) => setEditingValue(parseInt(e.target.value) || 0)}
//                               className="w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
//                             />
//                             <button
//                               onClick={() => handleSaveChoice(index)}
//                               className="rounded bg-green-500 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600"
//                             >
//                               บันทึก
//                             </button>
//                             <button
//                               onClick={() => setEditingIndex(null)}
//                               className="rounded bg-gray-500 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
//                             >
//                               ยกเลิก
//                             </button>
//                           </div>
//                         ) : (
//                           <div className="flex items-center gap-4">
//                             <span className="text-gray-700">{choice.label}</span>
//                             <span className="rounded-full bg-[#432C81] px-3 py-1 text-sm font-semibold text-white">
//                               {choice.value} คะแนน
//                             </span>
//                           </div>
//                         )}
//                       </div>
//                       {editingIndex !== index && (
//                         <div className="flex gap-2">
//                           <button
//                             onClick={() => handleEditChoice(index)}
//                             className="rounded bg-blue-500 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-600"
//                           >
//                             แก้ไข
//                           </button>
//                           <button
//                             onClick={() => handleDeleteChoice(index)}
//                             className="rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600"
//                           >
//                             ลบ
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Preview Section */}
//         <div className="mt-6 rounded-2xl bg-white p-6 shadow">
//           <h3 className="mb-4 text-xl font-bold text-[#432C81]">ตัวอย่างการแสดงผล</h3>
//           <div className="rounded-lg bg-[#F6F7FB] p-4">
//             <p className="mb-3 font-semibold text-[#432C81]">
//               {questions[0] || "ยังไม่มีคำถาม"}
//             </p>
//             <div className="space-y-2">
//               {choices.map((choice, index) => (
//                 <div
//                   key={index}
//                   className="rounded-lg bg-white px-4 py-2 text-[#432C81] shadow-sm"
//                 >
//                   {choice.label} ({choice.value})
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";

// ==========================================
// 🔒 CONFIGURATION & FIX MASTER DATA BLUEPRINT
// ==========================================
const CONFIG = {
  ADMIN_EMAIL: "admin@test.com",
  ROUTES: { LOGIN: "/login" },
  TABS: { QUESTIONS: "questions", CHOICES: "choices" }
};

// วางโครงสร้างข้อมูลพิมพ์เขียวเริ่มต้นผูกระบบ 2Q, 9Q, 8Q ตรงปกตามสเปกความสัมพันธ์ DB หลังบ้าน
const INITIAL_MASTER_DATA = {
  "2q": {
    code: "2q",
    title: "แบบคัดกรองเบื้องต้น (2Q)",
    questions: [
      { id: "2q-1", text: "ใน 2 สัปดาห์ที่ผ่านมา รวมวันนี้ ท่านรู้สึก หดหู่ เศร้า หรือท้อแท้สิ้นหวัง หรือไม่", yes_score: 1 },
      { id: "2q-2", text: "In the past 2 weeks, ท่านรู้สึก เบื่อ ทำอะไรก็ไม่เพลิดเพลิน หรือไม่", yes_score: 1 }
    ],
    choices: [
      { label: "ไม่มี", value: 0 },
      { label: "มี", value: 1 }
    ]
  },
  "9q": {
    code: "9q",
    title: "แบบประเมินมาตรฐาน (9Q)",
    questions: [
      { id: "9q-1", text: "เบื่อ ไม่สนใจอยากทำอะไร", yes_score: 1 },
      { id: "9q-2", text: "ไม่สบายใจ ซึมเศร้า ท้อแท้", yes_score: 1 },
      { id: "9q-3", text: "หลับยากหรือหลับๆตื่นๆหรือหลับมากไป", yes_score: 1 },
      { id: "9q-4", text: "เหนื่อยง่ายหรือไม่ค่อยมีแรง", yes_score: 1 },
      { id: "9q-5", text: "เบื่ออาหารหรือกินมากเกินไป", yes_score: 1 },
      { id: "9q-6", text: "รู้สึกไม่ดีกับตัวเอง คิดว่าตัวเองล้มเหลวหรือครอบครัวผิดหวัง", yes_score: 1 },
      { id: "9q-7", text: "สมาธิไม่ดี เวลาทำอะไร เช่น ดูโทรทัศน์ ฟังวิทยุ", yes_score: 1 },
      { id: "9q-8", text: "พูดช้า ทำอะไรช้าลงจนคนอื่นสังเกตเห็นได้", yes_score: 1 },
      { id: "9q-9", text: "คิดทำร้ายตนเอง หรือคิดว่าถ้าตายไปคงจะดี", yes_score: 1 }
    ],
    choices: [
      { label: "ไม่มีเลย", value: 0 },
      { label: "เป็นบางวัน (1-7 วัน)", value: 1 },
      { label: "เป็นบ่อย (> 7 วัน)", value: 2 },
      { label: "เป็นทุกวัน", value: 3 }
    ]
  },
  "8q": {
    code: "8q",
    title: "แบบเฝ้าระวังวิกฤต (8Q)",
    questions: [
      { id: "8q-1", text: "คิดอยากตาย หรือ คิดว่าตายไปจะดีกว่า", yes_score: 1 },
      { id: "8q-2", text: "อยากทำร้ายตัวเอง หรือ ทำให้ตัวเองบาดเจ็บ", yes_score: 2 },
      { id: "8q-3", text: "คิดเกี่ยวกับการฆ่าตัวตาย", yes_score: 6 },
      { id: "8q-4", text: "มีแผนการที่จะฆ่าตัวตาย", yes_score: 8 },
      { id: "8q-5", text: "ได้เตรียมการที่จะทำร้ายตนเองหรือเตรียมการจะฆ่าตัวตาย", yes_score: 9 },
      { id: "8q-6", text: "ได้ทำให้ตนเองบาดเจ็บแต่ไม่ตั้งใจที่จะทำให้เสียชีวิต", yes_score: 4 },
      { id: "8q-7", text: "ได้พยายามฆ่าตัวตายโดยคาดหวังที่จะให้ตาย", yes_score: 10 },
      { id: "8q-8", text: "ตลอดชีวิตที่ผ่านมา ท่านเคยพยายามฆ่าตัวตาย", yes_score: 4 }
    ],
    choices: [] // 🎯 8Q เป็นมาตรการ Yes/No Score แบบไดนามิกตามค่าน้ำหนักข้อคำถาม จึงล็อกไม่ให้เข้าแท็บช้อยส์รวม
  }
};

export default function AdminPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  // 📦 Clinical Control States 2Q, 9Q, 8Q Matrix
  const [selectedFormCode, setSelectedFormCode] = useState("2q"); 
  const [masterData, setMasterData] = useState({});
  const [activeTab, setActiveTab] = useState(CONFIG.TABS.QUESTIONS); 
  
  // Buffers & Editors States
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editingValue, setEditingValue] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [newItemValue, setNewItemValue] = useState(0);

  // 🛡️ SECURITY ROLE GUARD PERIMETER: สกัดกั้นเข้มงวด หากไม่ใช่แอดมินเมล CONFIG เตะไปล็อกอินหลักทันที ไร้ช่องเชื่อมข้ามสิทธิ์
  useEffect(() => {
    if (isLoading) return;
    if (!authenticated) {
      router.replace(CONFIG.ROUTES.LOGIN);
      return;
    }
    if (authenticated.email !== CONFIG.ADMIN_EMAIL) {
      router.replace(CONFIG.ROUTES.LOGIN); // 🎯 ปรับแก้ตามสั่ง: แอดมินจะไม่ดีดไปหน้า home ของยูสเซอร์เด็ดขาด ดีดไปหน้าล็อกอินเคลียร์สิทธิ์
      return;
    }
  }, [isLoading, authenticated, router]);

  // โหลดข้อมูลแบบประเมินจำลองแยกถังจากคลังความจำ
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("mindbetter_admin_master");
      if (savedData) {
        setMasterData(JSON.parse(savedData));
      } else {
        setMasterData(INITIAL_MASTER_DATA);
        localStorage.setItem("mindbetter_admin_master", JSON.stringify(INITIAL_MASTER_DATA));
      }
    } catch (error) {
      console.error("Error loading master data setup:", error);
    }
  }, []);

  // ดักลоจิกสกัดกั้น: หากแอดมินสลับไปโหมด 8Q แต่หน้าจอยังค้างที่แท็บ Choice ให้เด้งดีดกลับไปคำถามทันที ป้องกันระบบพัง
  useEffect(() => {
    if (selectedFormCode === "8q" && activeTab === CONFIG.TABS.CHOICES) {
      setActiveTab(CONFIG.TABS.QUESTIONS);
    }
    setEditingIndex(null);
    setShowAddForm(false);
  }, [selectedFormCode, activeTab]);

  // สกัดข้อมูลเฉพาะฟอร์มที่เลือกผ่านแคชระดับสูง
  const currentForm = useMemo(() => {
    return masterData[selectedFormCode] || { title: "", questions: [], choices: [] };
  }, [masterData, selectedFormCode]);

  const saveUpdate = (updatedForm) => {
    const nextMaster = { ...masterData, [selectedFormCode]: updatedForm };
    setMasterData(nextMaster);
    localStorage.setItem("mindbetter_admin_master", JSON.stringify(nextMaster));
  };

  // --- 📋 QUESTIONS CONTROLLER LOGIC ---
  const handleEditQuestion = (index) => {
    setEditingIndex(index);
    setEditingText(currentForm.questions[index].text);
    setEditingValue(currentForm.questions[index].yes_score || 1);
  };

  const handleSaveQuestion = (index) => {
    const updatedQs = [...currentForm.questions];
    updatedQs[index] = { ...updatedQs[index], text: editingText.trim(), yes_score: Number(editingValue) };
    
    saveUpdate({ ...currentForm, questions: updatedQs });
    setEditingIndex(null);
    setEditingText("");
  };

  const handleDeleteQuestion = (index) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อคำถามทางคลินิกข้อนี้?")) {
      const updatedQs = currentForm.questions.filter((_, i) => i !== index);
      saveUpdate({ ...currentForm, questions: updatedQs });
    }
  };

  const handleAddQuestion = () => {
    if (newItemText.trim()) {
      let dynamicYesScore = Number(newItemValue) || 1;
      
      // ลอจิกจำลองค่าน้ำหนักคะแนนตอบ "มี" อัตโนมัติสำหรับฟอร์ม 8Q ข้อคำถามถัดไปตาม Spec
      if (selectedFormCode === "8q" && !newItemValue) {
        const nextQNum = currentForm.questions.length + 1;
        const weights8Q = { 1:1, 2:2, 3:6, 4:8, 5:9, 6:4, 7:10, 8:4 };
        dynamicYesScore = weights8Q[nextQNum] || 1;
      }

      const newQ = {
        id: `${selectedFormCode}-${Date.now()}`,
        text: newItemText.trim(),
        yes_score: dynamicYesScore
      };

      saveUpdate({ ...currentForm, questions: [...currentForm.questions, newQ] });
      setNewItemText("");
      setNewItemValue(0);
      setShowAddForm(false);
    }
  };

  // --- ✨ CHOICES CONTROLLER LOGIC ---
  const handleEditChoice = (index) => {
    setEditingIndex(index);
    setEditingText(currentForm.choices[index].label);
    setEditingValue(currentForm.choices[index].value);
  };

  const handleSaveChoice = (index) => {
    const updatedChoices = [...currentForm.choices];
    updatedChoices[index] = { label: editingText.trim(), value: Number(editingValue) };
    
    saveUpdate({ ...currentForm, choices: updatedChoices });
    setEditingIndex(null);
    setEditingText("");
    setEditingValue(0);
  };

  const handleDeleteChoice = (index) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบตัวเลือกคะแนนสะสมชิ้นนี้?")) {
      const updatedChoices = currentForm.choices.filter((_, i) => i !== index);
      saveUpdate({ ...currentForm, choices: updatedChoices });
    }
  };

  const handleAddChoice = () => {
    if (newItemText.trim()) {
      const newChoice = { label: newItemText.trim(), value: Number(newItemValue) };
      saveUpdate({ ...currentForm, choices: [...currentForm.choices, newChoice] });
      setNewItemText("");
      setNewItemValue(0);
      setShowAddForm(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const resetToDefault = () => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะรีเซ็ตพิมพ์เขียวข้อมูลกลับเป็นค่าตั้งต้นโรงพยาบาล?")) {
      setMasterData(INITIAL_MASTER_DATA);
      localStorage.setItem("mindbetter_admin_master", JSON.stringify(INITIAL_MASTER_DATA));
      setEditingIndex(null);
      setShowAddForm(false);
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF] text-[#432C81] text-xl font-semibold animate-pulse">กำลังซิงค์ระบบฐานข้อมูลแอดมิน Matrix...</div>;
  if (!authenticated || authenticated.email !== CONFIG.ADMIN_EMAIL) return null;

  return (
    <div className="min-h-screen bg-[#D0F8FF] p-4 font-sans antialiased text-[#432C81]">
      <div className="mx-auto max-w-6xl">
        
        {/* Header Dashboard Area */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-purple-100/40 pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Admin Command Panel</h1>
            <p className="text-xs font-semibold opacity-70 mt-1">ระบบตั้งค่าจัดสรรระเบียนข้อสอบทางคลินิก (Multi-Scale 2Q / 9Q / 8Q Configurations)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={resetToDefault} className="rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-orange-600 transition-all cursor-pointer shadow-3xs">🔄 รีเซ็ตระบบ</button>
            <button onClick={handleLogout} className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-600 transition-all cursor-pointer shadow-3xs">🚪 ออกจากระบบบัญชี</button>
          </div>
        </div>

        {/* Dynamic Select Form Filter Row */}
        <div className="mb-6 bg-white p-4 rounded-2xl shadow-3xs border border-purple-50 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-400">เลือกแบบประเมินเพื่อเข้าจัดการคลังคำถาม:</span>
          <select 
            value={selectedFormCode} 
            onChange={(e) => setSelectedFormCode(e.target.value)} 
            className="rounded-xl border border-gray-200 bg-[#F6F7FB] p-2.5 text-xs font-bold text-[#432C81] outline-none cursor-pointer"
          >
            <option value="2q">[2Q] แบบคัดกรองภาวะซึมเศร้าเบื้องต้น</option>
            <option value="9q">[9Q] แบบประเมินโรคซึมเศร้าฉบับมาตรฐาน</option>
            <option value="8q">[8Q] แบบประเมินความเสี่ยงและพฤติกรรมทำร้ายตนเอง</option>
          </select>
        </div>

        {/* Tabs Control Navbar */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setActiveTab(CONFIG.TABS.QUESTIONS)}
            className={`rounded-xl px-5 py-3 text-xs font-semibold transition-all shadow-3xs cursor-pointer ${activeTab === CONFIG.TABS.QUESTIONS ? "bg-[#432C81] text-white" : "bg-white text-[#432C81] hover:bg-[#EFEAFE]"}`}
          >
            📋 รายการข้อคำถาม ({currentForm.questions?.length || 0} ข้อ)
          </button>
          {selectedFormCode !== "8q" && (
            <button
              onClick={() => setActiveTab(CONFIG.TABS.CHOICES)}
              className={`rounded-xl px-5 py-3 text-xs font-semibold transition-all shadow-3xs cursor-pointer ${activeTab === CONFIG.TABS.CHOICES ? "bg-[#432C81] text-white" : "bg-white text-[#432C81] hover:bg-[#EFEAFE]"}`}
            >
              ✨ ป้ายตัวเลือกแต้มคะแนน ({currentForm.choices?.length || 0} ช้อยส์)
            </button>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 md:p-8 shadow-xl border border-purple-50/20">
          
          {/* ========================================================
              [SUB-SECTION 1] QUESTIONS TAB IMPLEMENTATION
              ======================================================== */}
          {activeTab === CONFIG.TABS.QUESTIONS && (
            <div className="animate-fade-in">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold">คลังข้อคำถามของ {currentForm.title}</h2>
                <button
                  onClick={() => { setShowAddForm(!showAddForm); setNewItemText(""); }}
                  className="rounded-xl bg-[#432C81] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  {showAddForm ? "✕ ปิดฟอร์ม" : "＋ เพิ่มคำถามย่อย"}
                </button>
              </div>

              {showAddForm && (
                <div className="mb-6 rounded-2xl bg-[#F6F7FB] p-4 border border-gray-100 space-y-3 animate-fade-in">
                  <h3 className="font-semibold text-xs text-gray-500">แทรกประโยคโจทย์ข้อคำถามใหม่</h3>
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="พิมพ์ระบุเนื้อหาโจทย์ เช่น มีความรู้สึกท้อแท้สิ้นหวัง..."
                      className="flex-1 min-w-[240px] rounded-xl border bg-white px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#432C81]"
                    />
                    {selectedFormCode === "8q" && (
                      <input
                        type="number"
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(parseInt(e.target.value) || 0)}
                        placeholder="แต้ม Yes Score"
                        className="w-32 rounded-xl border bg-white px-3 py-2.5 text-xs font-semibold text-center outline-none"
                      />
                    )}
                    <button onClick={handleAddQuestion} className="rounded-xl bg-green-500 px-5 py-2 text-xs font-semibold text-white hover:bg-green-600">บันทึกเพิ่ม</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {currentForm.questions?.map((q, index) => (
                  <div key={q.id || index} className="rounded-2xl border border-gray-50 bg-[#FAF9FE] p-4 shadow-3xs flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">ข้อคำถามที่ {index + 1}</span>
                        <span className="bg-purple-100 text-[#432C81] text-[9px] font-semibold px-2 py-0.5 rounded">
                          ค่าน้ำหนักแต้มตอบ 'มี': {q.yes_score || 1} คะแนน
                        </span>
                      </div>
                      
                      {editingIndex === index ? (
                        <div className="flex flex-col gap-2 mt-2 w-full animate-fade-in">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none"
                            rows="2"
                          />
                          <div className="flex items-center gap-2">
                            {selectedFormCode === "8q" && (
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <span className="text-gray-400">แก้ไขแต้ม:</span>
                                <input 
                                  type="number" 
                                  value={editingValue} 
                                  onChange={(e) => setEditingValue(parseInt(e.target.value) || 0)}
                                  className="w-20 border rounded-lg p-1.5 text-center bg-white"
                                />
                              </div>
                            )}
                            <button onClick={() => handleSaveQuestion(index)} className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 ml-auto">เซฟข้อมูล</button>
                            <button onClick={() => setEditingIndex(null)} className="rounded-lg bg-gray-400 px-3 py-1.5 text-xs font-semibold text-white">ยกเลิก</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm font-semibold leading-relaxed mt-1">{q.text}</p>
                      )}
                    </div>
                    
                    {editingIndex !== index && (
                      <div className="flex gap-1 shrink-0 self-end sm:self-start">
                        <button onClick={() => handleEditQuestion(index)} className="rounded-lg bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 text-[10px] font-semibold cursor-pointer">แก้ไข</button>
                        <button onClick={() => handleDeleteQuestion(index)} className="rounded-lg bg-red-50 text-red-500 border border-red-100 px-3 py-1.5 text-[10px] font-semibold cursor-pointer">ลบ</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              [SUB-SECTION 2] CHOICES TAB IMPLEMENTATION
              ======================================================== */}
          {activeTab === CONFIG.TABS.CHOICES && selectedFormCode !== "8q" && (
            <div className="animate-fade-in">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold">จัดการป้ายตัวเลือกคะแนนสะสม [{selectedFormCode.toUpperCase()}]</h2>
                <button
                  onClick={() => { setShowAddForm(!showAddForm); setNewItemText(""); }}
                  className="rounded-xl bg-[#432C81] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  {showAddForm ? "✕ ปิดฟอร์ม" : "＋ เพิ่มช้อยส์คำตอบ"}
                </button>
              </div>

              {showAddForm && (
                <div className="mb-6 rounded-2xl bg-[#F6F7FB] p-4 border border-gray-100 flex gap-3 animate-fade-in">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="ป้ายชื่อ เช่น เป็นบางวัน..."
                    className="flex-1 rounded-xl border bg-white px-4 py-2.5 text-xs font-semibold outline-none"
                  />
                  <input
                    type="number"
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(parseInt(e.target.value) || 0)}
                    placeholder="คะแนน"
                    className="w-24 rounded-xl border bg-white px-3 py-2.5 text-xs font-semibold text-center outline-none"
                  />
                  <button onClick={handleAddChoice} className="rounded-xl bg-green-500 px-5 py-2 text-xs font-semibold text-white">บันทึก</button>
                </div>
              )}

              <div className="space-y-2">
                {currentForm.choices?.map((choice, index) => (
                  <div key={index} className="rounded-2xl border border-gray-50 bg-[#FAF9FE] p-4 flex justify-between items-center gap-3 shadow-3xs animate-fade-in">
                    <div className="flex-1 min-w-0">
                      {editingIndex === index ? (
                        <div className="flex gap-2 w-full animate-fade-in">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none"
                          />
                          <input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(parseInt(e.target.value) || 0)}
                            className="w-24 rounded-xl border bg-white px-3 py-2 text-xs text-center font-semibold outline-none"
                          />
                          <button onClick={() => handleSaveChoice(index)} className="rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-white">เซฟ</button>
                          <button onClick={() => setEditingIndex(null)} className="rounded-lg bg-gray-400 px-3 py-2 text-xs font-semibold text-white">ยกเลิก</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <span className="text-xs sm:text-sm font-semibold text-[#432C81]">{choice.label}</span>
                          <span className="rounded-md bg-[#432C81] px-2.5 py-0.5 text-[10px] font-semibold text-white shrink-0">
                            {choice.value} คะแนน
                          </span>
                        </div>
                      )}
                    </div>
                    {editingIndex !== index && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleEditChoice(index)} className="rounded-lg bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 text-[10px] font-semibold cursor-pointer">แก้ไข</button>
                        <button onClick={() => handleDeleteChoice(index)} className="rounded-lg bg-red-50 text-red-500 border border-red-100 px-2.5 py-1 text-[10px] font-semibold cursor-pointer">ลบ</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ========================================================
            🖼️ LIVE PREVIEW COMPONENT MATRIX (จำลองผลลัพธ์แยกตามรูปแบบฟอร์มจริง)
            ======================================================== */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-xl border border-purple-50/20 text-xs animate-fade-in">
          <span className="bg-[#432C81] text-white text-[8px] font-semibold px-2 py-0.5 rounded uppercase block w-max mb-3">Live Dynamic Preview: {selectedFormCode.toUpperCase()}</span>
          <div className="rounded-2xl bg-[#F6F7FB] p-4 border border-gray-100">
            <p className="mb-4 font-semibold text-sm text-[#432C81] leading-relaxed">
              {currentForm.questions && currentForm.questions[0] ? currentForm.questions[0].text : "🔴 ยังไม่มีระเบียบข้อคำถามในคลังถังข้อมูล"}
            </p>
            <div className="space-y-2 max-w-sm">
              {selectedFormCode === "8q" ? (
                <>
                  <div className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold border text-gray-500 flex justify-between items-center shadow-3xs">
                    <span>ไม่มี</span> <span className="text-[10px] text-gray-400 font-medium">(0 แต้ม)</span>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold border text-[#432C81] flex justify-between items-center shadow-3xs">
                    <span>มี</span> <span className="text-[10px] text-purple-600 font-bold">({currentForm.questions && currentForm.questions[0] ? currentForm.questions[0].yes_score : 1} แต้ม)</span>
                  </div>
                </>
              ) : (
                currentForm.choices?.length === 0 ? (
                  <div className="text-[11px] text-gray-400 font-medium py-2">🔴 ยังไม่มีป้ายตัวเลือกคะแนนในระบบคลังข้อมูล</div>
                ) : (
                  currentForm.choices?.map((choice, idx) => (
                    <div key={idx} className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold border text-gray-500 flex justify-between items-center shadow-3xs">
                      <span>{choice.label}</span> 
                      <span className="text-[10px] text-gray-400 font-semibold">({choice.value} แต้ม)</span>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}