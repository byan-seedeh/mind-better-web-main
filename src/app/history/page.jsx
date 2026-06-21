"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import { getPhq9History } from "@/services/historyService";
import Navbar from "@/components/Navbar";

const CONFIG = {
  "2q": { title: "แบบคัดกรองภาวะซึมเศร้าเบื้องต้น (2Q)", max: 2 },
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
  if (type === "2q") return score > 0 ? "พบความเสี่ยงภาวะซึมเศร้า" : "ปกติ";
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
  const rawType = x.assessment_code ?? x.code ?? x.assessment_type ?? x.type ?? x.form_type ?? x.form;
  let type = normalizeType(rawType);

  const answers = Array.isArray(x.answers)
    ? x.answers.map((v) => Number(v)).filter((v) => Number.isFinite(v))
    : [];

  if (!type) {
    const maxFromApi = Number(x.max_score || x.total_score || x.score || 0);
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
      } finally {
        setLoading(false);
      }
    };

    loadAssessmentHistory();
  }, [isLoading, authenticated, router]);

  const groupedSessions = useMemo(() => {
    if (!items || !items.length) return [];
    const sorted = [...items].sort((a, b) => a.created - b.created);
    const sessions = [];

    sorted.forEach((item) => {
      const itemTime = item.created.getTime();
      const itemDateKey = item.created.toDateString();
      const cleanTypeCode = String(item.type || "9q").toLowerCase();

      const existingSession = sessions.find((s) => {
        const sessionTime = new Date(s.timestamp).getTime();
        const sessionDateKey = new Date(s.timestamp).toDateString();
        return sessionDateKey === itemDateKey && Math.abs(sessionTime - itemTime) < 30 * 60 * 1000 && !s.forms[cleanTypeCode];
      });

      if (existingSession) {
        existingSession.forms[cleanTypeCode] = item;
      } else {
        sessions.push({
          id: `session-${item.id}-${itemTime}`,
          timestamp: item.created,
          forms: { [cleanTypeCode]: item }
        });
      }
    });

    return sessions.reverse();
  }, [items]);

  const summaryStats = useMemo(() => {
    const totalCount = groupedSessions.length;
    let latestScore = 0;
    let trendDirection = "none";

    if (totalCount > 0) {
      const latestSession = groupedSessions[0];
      
      if (latestSession.forms['9q']) latestScore = latestSession.forms['9q'].score;
      else if (latestSession.forms['8q']) latestScore = latestSession.forms['8q'].score;
      else if (latestSession.forms['2q']) latestScore = latestSession.forms['2q'].score;

      if (totalCount >= 2) {
        const currentSession = groupedSessions[0];
        const previousSession = groupedSessions[1];

        let currentActiveScore = currentSession.forms['9q']?.score || currentSession.forms['8q']?.score || currentSession.forms['2q']?.score || 0;
        let previousActiveScore = previousSession.forms['9q']?.score || previousSession.forms['8q']?.score || previousSession.forms['2q']?.score || 0;

        if (currentActiveScore > previousActiveScore) trendDirection = "up";
        else if (currentActiveScore < previousActiveScore) trendDirection = "down";
        else trendDirection = "same";
      }
    }

    return { totalCount, latestScore, trendDirection };
  }, [groupedSessions]);

  const toggleSession = (id) => {
    setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
      <Navbar username={authenticated?.username} activeMenu="history" />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-3xl bg-white p-6 md:p-8 shadow-xl border border-purple-50/20">
          
          {/* Header Dashboard */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#432C81]">ประวัติการประเมินสุขภาพจิต</h1>
              <p className="text-xs text-gray-500 mt-1">สรุปภาพรวมแดชบอร์ดสถิติแนวโน้มการดูแลหัวใจและการทำแบบคัดกรองของคุณ</p>
            </div>
            <button
              onClick={() => router.push("/assessment")}
              className="rounded-xl bg-[#432C81] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#342163] cursor-pointer transition-all"
            >
              เริ่มประเมินรอบใหม่
            </button>
          </div>

          {/* แผงข้อมูลการ์ดสถิติ KPI */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#E6F7FF] p-5 border border-blue-100 shadow-3xs">
              <div className="text-xs text-[#432C81]/70 font-semibold uppercase tracking-wider">จำนวนครั้งเข้ารับการประเมินทั้งหมด</div>
              <div className="text-2xl font-semibold text-[#432C81] mt-3 flex items-baseline gap-1">
                {summaryStats.totalCount} <span className="text-xs font-normal text-gray-400">ครั้ง</span>
              </div>
            </div>
            
            <div className="rounded-2xl bg-[#F5F0FF] p-5 border border-purple-100 shadow-3xs">
              <div className="text-xs text-[#432C81]/70 font-semibold uppercase tracking-wider">คะแนนแบบประเมินครั้งล่าสุด</div>
              <div className="text-2xl font-semibold text-[#432C81] mt-3 flex items-baseline gap-1">
                {summaryStats.totalCount > 0 ? summaryStats.latestScore : "-"} <span className="text-xs font-normal text-gray-400">คะแนน</span>
              </div>
            </div>
            
            <div className="rounded-2xl bg-[#FFFBF0] p-5 border border-yellow-100 shadow-3xs">
              <div className="text-xs text-[#432C81]/70 font-semibold uppercase tracking-wider">แนวโน้มผลสถิติสุขภาพใจ</div>
              <div className="text-base font-semibold text-[#432C81] mt-3.5 flex items-center gap-1.5">
                {summaryStats.trendDirection === "none" && <span className="text-gray-400 font-semibold text-sm">ยังไม่มีข้อมูลเปรียบเทียบเพียงพอ</span>}
                {summaryStats.trendDirection === "up" && <span className="text-red-500 font-semibold flex items-center gap-1">↗️ มีสถิติแนวโน้มคะแนนสูงขึ้น</span>}
                {summaryStats.trendDirection === "down" && <span className="text-green-600 font-semibold flex items-center gap-1">↘️ สุขภาพใจดีขึ้น คะแนนลดลง</span>}
                {summaryStats.trendDirection === "same" && <span className="text-blue-500 font-semibold flex items-center gap-1">➡️ คะแนนรวมคงที่เท่าเดิม</span>}
              </div>
            </div>
          </div>

          {/* รายการประวัติแบบ Accordion รายข้อ */}
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-[#432C81] mb-4">⏱️ บันทึกประวัติการคัดกรองสุขภาพจิตอย่างละเอียดแยกรายรอบการประเมิน</h3>
            
            {loading ? (
              <div className="text-center text-gray-400 py-6 text-xs font-semibold">กำลังเชื่อมต่อฐานข้อมูลดึงไฟล์ประวัติ...</div>
            ) : err ? (
              <div className="text-center text-red-500 py-6 text-xs font-semibold">{err}</div>
            ) : groupedSessions.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-2xl text-xs font-semibold">
                ยังไม่มีบันทึกประวัติการตรวจสุขภาพจิตในฐานข้อมูลระบบแอปพลิเคชันของคุณ
              </div>
            ) : (
              <div className="space-y-4">
                {groupedSessions.map((session, index) => {
                  const dateLabel = new Date(session.timestamp).toLocaleString("th-TH", {
                    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
                  });

                  const isExpanded = !!expandedSessions[session.id]; 
                  const currentRoundNumber = groupedSessions.length - index; 

                  const topResultHeadlineText = session.forms['8q'] ? session.forms['8q'].result_text 
                                      : (session.forms['9q'] ? session.forms['9q'].result_text 
                                      : session.forms['2q']?.result_text || "คัดกรองเสร็จสิ้นขั้นตอน");

                  const activeOrderSequence = ["2q", "9q", "8q"];
                  const combinedPathLabels = activeOrderSequence
                    .filter(key => !!session.forms[key])
                    .map(key => key.toUpperCase())
                    .join(", ");

                  return (
                    <div key={session.id} className="rounded-2xl border border-gray-100 bg-[#FAF9FE] shadow-sm overflow-hidden transition-all duration-200">
                      <button 
                        onClick={() => toggleSession(session.id)} 
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-[#F2EEFE] transition-colors cursor-pointer"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                          <div className="text-sm sm:text-base font-semibold text-[#432C81] tracking-tight truncate">
                            ครั้งที่ {currentRoundNumber}: {topResultHeadlineText}
                          </div>
                          <div className="text-xs text-gray-400 font-semibold flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[#432C81]/80">ชุดเส้นทางแบบประเมิน ({combinedPathLabels})</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-400">{dateLabel} น.</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-semibold text-[#432C81] shrink-0">
                          <span>{isExpanded ? "ซ่อนรายละเอียด" : "ดูผลลัพธ์รายข้อ"}</span>
                          <span className={`inline-block transform transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}>➔</span>
                        </div>
                      </button>

                      {/* Drawer รายละเอียดภายใน */}
                      {isExpanded && ( 
                        <div className="border-t bg-white p-5 space-y-5 text-xs animate-fade-in">
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            📄 บันทึกรายละเอียดข้อมูลผลคะแนนดิบและข้อคำตอบแยกตามประเภทแบบฟอร์มประจำครั้งนี้
                          </div>

                          {/* 2Q Section */}
                          {session.forms['2q'] && (
                            <div className="p-4 rounded-xl bg-green-50/40 border border-green-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-green-500 text-white font-semibold text-[9px] px-2 py-0.5 rounded shadow-3xs">2Q</span>
                                <span className="font-semibold text-[#432C81]">{CONFIG['2q'].title}</span>
                                <span className="ml-auto font-semibold text-green-700">คะแนนรวมสะสม: {session.forms['2q'].score} / {CONFIG['2q'].max} แต้ม</span>
                              </div>
                              <p className="text-gray-600 font-medium">ผลวิเคราะห์วินิจฉัยทางการแพทย์เบื้องต้น: <span className="text-green-600 font-semibold">{session.forms['2q'].result_text}</span></p>
                              {session.forms['2q'].answers && session.forms['2q'].answers.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  {session.forms['2q'].answers.map((ansValueScore, ansIndexIdx) => (
                                    <div key={ansIndexIdx} className="bg-white px-3 py-1.5 rounded-lg border text-[11px] font-semibold text-gray-500 flex justify-between">
                                      <span>ข้อคำถามที่ {ansIndexIdx + 1}:</span> <span className="text-[#432C81] font-semibold">{ansValueScore} คะแนน</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 9Q Section */}
                          {session.forms['9q'] && (
                            <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-purple-500 text-white font-semibold text-[9px] px-2 py-0.5 rounded shadow-3xs">9Q</span>
                                <span className="font-semibold text-[#432C81]">{CONFIG['9q'].title}</span>
                                <span className="ml-auto font-semibold text-purple-700">คะแนนรวมสะสม: {session.forms['9q'].score} / {CONFIG['9q'].max} แต้ม</span>
                              </div>
                              <p className="text-gray-600 font-medium">ระดับระดับเกณฑ์ภาวะซึมเศร้า: <span className="text-purple-700 font-semibold">{session.forms['9q'].result_text}</span></p>
                              {session.forms['9q'].recommended && (
                                <p className="text-[11px] text-gray-500 bg-white/60 p-2.5 rounded-lg border border-purple-50/60 leading-relaxed"><span className="font-semibold text-purple-900">💡 แนวทางคำแนะนำแพทย์ประจำตัว:</span> {session.forms['9q'].recommended}</p>
                              )}
                              {session.forms['9q'].answers && session.forms['9q'].answers.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                  {session.forms['9q'].answers.map((ansValueScore, ansIndexIdx) => (
                                    <div key={ansIndexIdx} className="bg-white px-3 py-1.5 rounded-lg border text-[11px] font-semibold text-gray-500 flex justify-between">
                                      <span>ข้อคำถามที่ {ansIndexIdx + 1}:</span> <span className="text-[#432C81] font-semibold">{ansValueScore} คะแนน</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 8Q Section */}
                          {session.forms['8q'] && (
                            <div className="p-4 rounded-xl bg-red-50/40 border border-red-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-red-500 text-white font-semibold text-[9px] px-2 py-0.5 rounded shadow-3xs">8Q</span>
                                <span className="font-semibold text-[#432C81]">{CONFIG['8q'].title}</span>
                                <span className="ml-auto font-semibold text-red-600">คะแนนรวมสะสม: {session.forms['8q'].score} / {CONFIG['8q'].max} แต้ม</span>
                              </div>
                              <p className="text-gray-600 font-medium">เกณฑ์ระดับเฝ้าระวังอันตรายฆ่าตัวตาย: <span className="text-red-600 font-semibold">{session.forms['8q'].result_text}</span></p>
                              {session.forms['8q'].recommended && (
                                <p className="text-[11px] text-red-700 bg-white/60 p-2.5 rounded-lg border border-red-50 font-semibold leading-relaxed">⚠️ มาตรการดูแลเร่งด่วนฉุกเฉิน: {session.forms['8q'].recommended}</p>
                              )}
                              {session.forms['8q'].answers && session.forms['8q'].answers.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                  {session.forms['8q'].answers.map((ansValueScore, ansIndexIdx) => (
                                    <div key={ansIndexIdx} className="bg-white px-3 py-1.5 rounded-lg border text-[11px] font-semibold text-gray-500 flex justify-between">
                                      <span>ข้อคำถามที่ {ansIndexIdx + 1}:</span> <span className="text-[#432C81] font-semibold">{ansValueScore} คะแนน</span>
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