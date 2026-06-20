"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import { getPhq9History } from "@/services/historyService";
import Navbar from "@/components/Navbar";

/* ================================
 * 1) CONFIG สเปกเกณฑ์คะแนนสูงสุดประจำฟอร์ม (ใช้คู่ตัวเลขสากลของโปรเจกต์)
 * ================================ */
const CONFIG = {
  "2q": { title: "แบบคัดกรองภาวะซึมเศr้าเบื้องต้น (2Q)", max: 2 },
  "9q": { title: "แบบประเมินโรคซึมเศร้าฉบับมาตรฐาน (9Q)", max: 27 },
  "8q": { title: "แบบประเมินความเสี่ยงและพฤติกรรมทำร้ายตนเอง (8Q)", max: 8 }
};

const normalizeType = (raw) => {
  const s = String(raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s === "q2" || /^(phq)?2q?$/.test(s) || s === "2q") return "2q";
  if (s === "q9" || /^(phq)?9q?$/.test(s) || s === "9q") return "9q";
  if (s === "q8" || /^(phq)?8q?$/.test(s) || s === "8q") return "8q";
  return null;
};

const severityOf = (type, score) => {
  if (type === "2q") {
    return score > 0 ? "พบความเสี่ยงภาวะซึมเศร้า" : "ปกติ";
  }
  if (type === "9q") {
    if (score >= 20) return "ซึมเศร้ารุนแรง";
    if (score >= 15) return "ซึมเศร้าค่อนข้างรุนแรง";
    if (score >= 10) return "ซึมเศร้าปานกลาง";
    if (score >= 5) return "ซึมเศร้าเล็กน้อย";
    return "ปกติ";
  }
  if (type === "8q") {
    if (score >= 8) return "ระดับความเสี่ยงทำร้ายตนเอง: รุนแรงมาก";
    if (score >= 5) return "ระดับความเสี่ยงทำร้ายตนเอง: ปานกลาง";
    if (score >= 1) return "ระดับความเสี่ยงทำร้ายตนเอง: น้อย";
    return "ไม่มีความเสี่ยงทำร้ายตนเอง";
  }
  return "ประเมินผลสำเร็จ";
};

const toItem = (x) => {
  const rawType = x.assessment_code ?? x.assessment_type ?? x.type ?? x.form_type ?? x.form;
  let type = normalizeType(rawType);

  const answers = Array.isArray(x.answers)
    ? x.answers.map((v) => Number(v)).filter((v) => Number.isFinite(v))
    : [];

  // ลอจิกดักกรองแยกแยะประเภทฟอร์มทางการแพทย์จากจำนวนข้อและเพดานคะแนนดิบจริงในฐานข้อมูล
  if (!type) {
    const maxFromApi = Number(x.max_score || x.score);
    if (answers.length === 2 || maxFromApi === 2) type = "2q";
    else if (answers.length === 8 || maxFromApi === 8) type = "8q";
    else if (answers.length === 9 || maxFromApi === 27) type = "9q";
    else type = "9q";
  }

  const max = CONFIG[type]?.max || 27;
  let score = Number(x.total_score || x.score || 0);
  score = Math.min(Math.max(score, 0), max);

  const created = new Date(x.created_at || x.createdAt || x.date || 0);

  return {
    id: x.id ?? `${type}-${created.getTime()}`,
    type,
    score,
    max,
    created,
    answers,
    result_text: x.result_text || severityOf(type, score),
    recommended: x.recommended_action || x.recommended || ""
  };
};

export default function HistoryPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [expandedSessions, setExpandedSessions] = useState({});

  useEffect(() => {
    if (isLoading) return;
    if (!authenticated) {
      router.replace("/login");
      return;
    }

    const loadAssessmentHistory = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await getPhq9History(authenticated.user_id);
        if (res?.result) {
          const list = (Array.isArray(res.data) ? res.data : []).map(toItem);
          setItems(list);
        } else {
          throw new Error("Failed to load data");
        }
      } catch (e) {
        setErr("ไม่สามารถดึงประวัติการทำแบบประเมินได้");
      } district: {
        setLoading(false);
      }
    };

    loadAssessmentHistory();
  }, [isLoading, authenticated, router]);

  /**
   * @description 🧠 CRITICAL WORKFLOW MERGER: รวบรวมฟอร์มย่อย (2q, 9q, 8q) ที่ทำต่อเนื่องร่วมในเซสชันเดียวกัน (ห่างกันไม่เกิน 8 นาที) เข้าเป็น "รอบการประเมินเดียวกัน" เพื่อแสดงลำดับต่อกันเป็นทอด ๆ ได้ถูกต้องตรงตามหลัก Clinical Path
   */
  const groupedSessions = useMemo(() => {
    if (!items || !items.length) return [];

    // เรียงประวัติจาก อดีต ➔ ปัจจุบัน เพื่อทำการสแกนควบแน่นจับกลุ่มตามเวลา
    const sorted = [...items].sort((a, b) => a.created - b.created);
    const sessions = [];

    sorted.forEach((item) => {
      const itemTime = item.created.getTime();

      // มองหาเซสชันรอบทำแบบประเมินที่มีอยู่แล้วในช่วงเวลาใกล้เคียงกัน (ภายในช่วงกว้าง 8 นาทีครอบคลุมการกดทำแบบสอบถาม)
      const existingSession = sessions.find((s) => {
        const sessionTime = new Date(s.timestamp).getTime();
        return Math.abs(sessionTime - itemTime) < 8 * 60 * 1000;
      });

      if (existingSession) {
        existingSession.forms[item.type] = item;
      } else {
        sessions.push({
          id: `session-${item.id}-${itemTime}`,
          timestamp: item.created,
          forms: { [item.type]: item }
        });
      }
    });

    // กลับหัวอาเรย์เพื่อให้ครั้งที่ทำล่าสุดโผล่ขึ้นบรรทัดบนสุดสม่ำเสมอกันทั้งหน้าเพจ
    return sessions.reverse();
  }, [items]);

  const toggleSession = (id) => {
    setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#E8FAFF] text-sm font-semibold text-[#432C81]">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
      <Navbar username={authenticated?.username} activeMenu="history" />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-3xl bg-white p-6 md:p-8 shadow-xl border border-purple-50/20">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#432C81]">ประวัติการประเมินสุขภาพจิต</h1>
              <p className="text-xs text-gray-500 mt-1">บันทึกประวัติและผลลัพธ์การดูแลหัวใจของคุณอย่างละเอียด</p>
            </div>
            <button
              onClick={() => router.push("/assessment")}
              className="rounded-xl bg-[#432C81] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#342163] cursor-pointer transition-all"
            >
              เริ่มประเมินรอบใหม่
            </button>
          </div>

          {/* ========================================================
              ⏱️ NEW HISTORY TIMELINE LIST (ตัดกราฟออกหมด คงไว้เฉพาะกรอบข้อมูลชุดเส้นทางที่ถูกต้อง)
              ======================================================== */}
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">⏱️ บันทึกประวัติการคัดกรองสุขภาพจิตอย่างละเอียด</h3>
            
            {loading ? (
              <div className="text-center text-gray-400 py-6 text-xs font-semibold">กำลังโหลดข้อมูลประวัติ...</div>
            ) : err ? (
              <div className="text-center text-red-500 py-6 text-xs font-semibold">{err}</div>
            ) : groupedSessions.length === 0 ? (
              <div className="text-center text-gray-400 py-6 text-xs font-semibold">ยังไม่มีประวัติการทำแบบประเมินในระบบ</div>
            ) : (
              <div className="space-y-4">
                {groupedSessions.map((session, index) => {
                  const dateLabel = new Date(session.timestamp).toLocaleString("th-TH", {
                    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
                  });

                  const isExpanded = !!expandedSessions[session.id];
                  const currentRoundNumber = groupedSessions.length - index;

                  // สกัดหาลำดับชื่อแบบประเมินทั้งหมดที่มีอยู่จริงในรอบนั้นเพื่อเอาไปร้อยเรียงเป็นป้ายชุดเส้นทาง (เช่น 2Q, 9Q, 8Q)
                  const orderOrder = ["2q", "9q", "8q"];
                  const pathLabels = orderOrder
                    .filter(k => !!session.forms[k])
                    .map(k => k.toUpperCase())
                    .join(", ");

                  // ดึงข้อความเกณฑ์ผลลัพธ์วินิจฉัยจากฟอร์มที่มีลำดับความรุนแรงหรือความเสี่ยงสูงสุดขึ้นโชว์ประดับที่หัวกล่อง
                  const mainResultText = session.forms['8q'] ? session.forms['8q'].result_text 
                                      : (session.forms['9q'] ? session.forms['9q'].result_text 
                                      : session.forms['2q']?.result_text || "เสร็จสิ้นขั้นตอน");

                  return (
                    <div 
                      key={session.id} 
                      className="rounded-2xl border border-gray-100 bg-[#FAF9FE] shadow-xs overflow-hidden transition-all duration-200"
                    >
                      {/* 📐 ACCORDION HEADER BUTTON: ดีดระนาบตัวอักษรเป็น font-semibold เท่ากันหมด สวยคลีนตา */}
                      <button 
                        onClick={() => toggleSession(session.id)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-[#F2EEFE] transition-colors cursor-pointer"
                      >
                        <div className="space-y-1 flex-1 min-w-0 pr-4">
                          {/* ป้ายหัวข้อกล่องสรุปครั้งที่ทำ พร้อมผลวิเคราะห์เกณฑ์ระดับอาการหนาเด่นชัดระดับ semibold */}
                          <div className="text-sm sm:text-base font-semibold text-[#432C81] tracking-tight truncate">
                            ครั้งที่ {currentRoundNumber}: {mainResultText}
                          </div>
                          {/* 📐 ชุดเส้นทางแบบประเมินเรียงตัวอักษรตรงปก 2Q, 9Q, 8Q ตามก้อนข้อมูลจริงประจำรอบ */}
                          <div className="text-xs text-gray-400 font-semibold flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[#432C81]/80">ชุดเส้นทางแบบประเมิน ({pathLabels})</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-400">{dateLabel} น.</span>
                          </div>
                        </div>

                        {/* ข้อความนำทางด้านขวาสไตล์มินิมอล */}
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#432C81] shrink-0">
                          <span>{isExpanded ? "ซ่อนรายละเอียด" : "ดูผลลัพธ์รายข้อ"}</span>
                          <span className={`inline-block transform transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}>➔</span>
                        </div>
                      </button>

                      {/* 📐 INNER CONTENT DETAILS: เมื่อกดคลิกกางลงมา จะแสดงบล็อกรายงานประวัติไล่ลำดับตั้งแต่ 2Q, 9Q, 8Q ออกมาเป็นแผงชุดอย่างสมบูรณ์แบบครบถ้วนตามสั่ง */}
                      {isExpanded && (
                        <div className="border-t bg-white p-5 space-y-4 animate-fade-in text-xs">
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">📄 รายละเอียดคะแนนและผลประเมินแยกรายข้อประจำครั้งนี้</div>

                          {/* 🟢 STEP 1: เรนเดอร์กล่องบันทึกข้อมูลของฟอร์ม 2Q คัดกรองเบื้องต้น (หากมีประวัติในรอบนั้น) */}
                          {session.forms['2q'] && (
                            <div className="p-4 rounded-xl bg-green-50/40 border border-green-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-green-500 text-white font-semibold text-[9px] px-2 py-0.5 rounded shadow-3xs">2Q</span>
                                <span className="font-semibold text-[#432C81]">{CONFIG['2q'].title}</span>
                                <span className="ml-auto font-semibold text-green-700">คะแนนรวม: {session.forms['2q'].score} / {CONFIG['2q'].max}</span>
                              </div>
                              <p className="text-gray-600 font-medium">ผลวิเคราะห์วินิจฉัย: <span className="text-green-600 font-semibold">{session.forms['2q'].result_text}</span></p>
                              {session.forms['2q'].answers && session.forms['2q'].answers.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  {session.forms['2q'].answers.map((ans, idx) => (
                                    <div key={idx} className="bg-white px-3 py-1.5 rounded-lg border text-[11px] font-semibold text-gray-500 flex justify-between">
                                      <span>ข้อที่ {idx + 1}:</span> <span className="text-[#432C81] font-semibold">{ans} คะแนน</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 🟣 STEP 2: เรนเดอร์กล่องบันทึกข้อมูลของฟอร์ม 9Q โรคซึมเศร้ามาตรฐาน (หากมีประวัติในรอบนั้น) */}
                          {session.forms['9q'] && (
                            <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-purple-500 text-white font-semibold text-[9px] px-2 py-0.5 rounded shadow-3xs">9Q</span>
                                <span className="font-semibold text-[#432C81]">{CONFIG['9q'].title}</span>
                                <span className="ml-auto font-semibold text-purple-700">คะแนนรวม: {session.forms['9q'].score} / {CONFIG['9q'].max}</span>
                              </div>
                              <p className="text-gray-600 font-medium">ระดับภาวะซึมเศร้า: <span className="text-purple-700 font-semibold">{session.forms['9q'].result_text}</span></p>
                              {session.forms['9q'].recommended && (
                                <p className="text-[11px] text-gray-500 bg-white/60 p-2.5 rounded-lg border border-purple-50"><span className="font-semibold text-purple-900">💡 คำแนะนำจากแพทย์:</span> {session.forms['9q'].recommended}</p>
                              )}
                              {session.forms['9q'].answers && session.forms['9q'].answers.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                  {session.forms['9q'].answers.map((ans, idx) => (
                                    <div key={idx} className="bg-white px-3 py-1.5 rounded-lg border text-[11px] font-semibold text-gray-500 flex justify-between">
                                      <span>ข้อที่ {idx + 1}:</span> <span className="text-[#432C81] font-semibold">{ans} คะแนน</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 🔴 STEP 3: เรนเดอร์กล่องบันทึกข้อมูลของฟอร์ม 8Q คัดกรองความเสี่ยงทำร้ายตนเองวิกฤต (หากมีประวัติในรอบนั้น) */}
                          {session.forms['8q'] && (
                            <div className="p-4 rounded-xl bg-red-50/40 border border-red-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-red-500 text-white font-semibold text-[9px] px-2 py-0.5 rounded shadow-3xs">8Q</span>
                                <span className="font-semibold text-[#432C81]">{CONFIG['8q'].title}</span>
                                <span className="ml-auto font-semibold text-red-600">คะแนนรวม: {session.forms['8q'].score} / {CONFIG['8q'].max}</span>
                              </div>
                              <p className="text-gray-600 font-medium">เกณฑ์เฝ้าระวังฆ่าตัวตาย: <span className="text-red-600 font-semibold">{session.forms['8q'].result_text}</span></p>
                              {session.forms['8q'].recommended && (
                                <p className="text-[11px] text-red-700 bg-white/60 p-2.5 rounded-lg border border-red-50 font-semibold">⚠️ มาตรการดูแลเร่งด่วน: {session.forms['8q'].recommended}</p>
                              )}
                              {session.forms['8q'].answers && session.forms['8q'].answers.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                  {session.forms['8q'].answers.map((ans, idx) => (
                                    <div key={idx} className="bg-white px-3 py-1.5 rounded-lg border text-[11px] font-semibold text-gray-500 flex justify-between">
                                      <span>ข้อที่ {idx + 1}:</span> <span className="text-[#432C81] font-semibold">{ans} คะแนน</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}