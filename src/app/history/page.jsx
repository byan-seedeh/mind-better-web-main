"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import axios from "axios";
import Navbar from "@/components/Navbar";

/**
 * @description หน้าจอแสดงประวัติการทำแบบคัดกรองสุขภาพจิต จัดกลุ่มรายรอบแบบไทม์ไลน์และพล็อตกราฟแนวโน้ม
 * @principles SoC - จัดรูปกลุ่มข้อมูลผ่าน useMemo | DRY - ซิงค์ใช้ตัวควบคุม Navbar ร่วมกัน | YAGNI - ล้างโค้ด Recharts เก่าออกทั้งหมด
 */
export default function HistoryPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [expandedSessions, setExpandedSessions] = useState({}); // เก็บสถานะการสลับเปิด/ปิด Accordion รายรอบ

  // ดึงประวัติดิบจากตารางหลังบ้าน MySQL
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
        const res = await axios.get(`http://localhost:8080/api/phq9/history/${authenticated.user_id}`);
        if (res.data.result) {
          setItems(res.data.data);
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

  /**
   * @description 🎛️ SoC: ลอจิกควบรวมฟอร์ม (2Q, 9Q, 8Q) ที่ทำห่างกันไม่เกิน 5 นาทีให้มัดรวมเป็น "รอบเดียวกัน"
   * @returns {Array} รายการรอบการประเมินเรียงจากใหม่ไปเก่า
   */
  const groupedSessions = useMemo(() => {
    if (!items.length) return [];

    // เรียงเวลาจากเก่าไปใหม่ก่อนเพื่อคำนวณจับคู่รอบสะสม
    const sorted = [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const sessions = [];

    sorted.forEach((item) => {
      // ใช้ Regular Expression ในการแยก Code ฟอร์มออกจากข้อความผลลัพธ์
      const matches = item.result_text.match(/^\[(2Q|9Q|8Q)\]\s*(.*)$/);
      const type = matches ? matches[1] : "9Q";
      const actualText = matches ? matches[2] : item.result_text;
      const itemTime = new Date(item.created_at).getTime();

      // ตรวจสอบว่ามีรอบการประเมินที่ทำห่างกันไม่เกิน 5 นาทีอยู่ก่อนหน้าแล้วหรือไม่
      const existingSession = sessions.find((s) => {
        const sessionTime = new Date(s.timestamp).getTime();
        return Math.abs(sessionTime - itemTime) < 5 * 60 * 1000;
      });

      const dataPayload = {
        score: item.total_score,
        result_text: actualText,
        recommended_action: item.recommended_action
      };

      if (existingSession) {
        existingSession.forms[type.toLowerCase()] = dataPayload;
      } else {
        sessions.push({
          id: item.id,
          timestamp: item.created_at,
          forms: { [type.toLowerCase()]: dataPayload }
        });
      }
    });

    return sessions.reverse(); // หมุนกลับเอาประวัติล่าสุดขึ้นเป็นอันดับแรกใน UI
  }, [items]);

  // ฟังก์ชันควบคุมการกางกล่องดูคะแนนแบบทดสอบย่อย
  const toggleSession = (id) => {
    setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // คำนวณค่าสถิติพื้นฐานสำหรับการสรุปยอดในการ์ด Stat ด้านบน
  const stats = useMemo(() => ({
    count: groupedSessions.length,
    lastSession: groupedSessions[0] || null
  }), [groupedSessions]);

  /**
   * @description 📈 TDD/SoC: แปลงรอบการประเมินเป็นพิกัดสำหรับนำไปวาดโครงสร้าง Pure SVG Line Graph
   */
  const chartData = useMemo(() => {
    const chronologically = [...groupedSessions].reverse(); // กราฟเส้นแนวโน้มจำเป็นต้องพล็อตจากซ้ายไปขวา (เก่าไปใหม่)
    return chronologically.map((s, index) => ({
      label: `รอบที่ ${index + 1}`,
      score: s.forms['9q'] ? s.forms['9q'].score : (s.forms['2q'] ? s.forms['2q'].score : 0)
    }));
  }, [groupedSessions]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-primary-light">Loading...</div>;

  return (
    <div className="min-h-screen w-full bg-primary-light font-sans antialiased">
      
      {/* 🛡️ DRY - นำเข้าโมดูล Navbar ตัวเดียวกับหน้าโฮมและหน้าอื่นๆ สไตล์สีจะล็อกสม่ำเสมอทันที */}
      <Navbar username={authenticated?.username} activeMenu="history" />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-2xl bg-warm-white p-6 shadow-md border border-purple-50/20">
          
          {/* ส่วนหัวแสดงความหมายและคำแนะนำของหน้า */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-brand-main">ประวัติการประเมินสุขภาพจิต</h1>
              <p className="text-xs text-gray-500 mt-1">สรุปภาพรวมและสถิติประวัติการคัดกรองรายรอบของคุณ</p>
            </div>
            <button
              onClick={() => router.push("/assessment")}
              className="rounded-lg bg-brand-main px-4 py-2 text-xs font-bold text-warm-white hover:bg-[#342163] cursor-pointer transition-all"
            >
              เริ่มประเมินรอบใหม่
            </button>
          </div>

          {/* สรุปยอดข้อมูลจำแนกตามสถาปัตยกรรม (Stats Summary Layout) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 📐 ปรับแก้ไขสเกลฟอนต์ให้เท่ากัน: เปลี่ยนเป็น text-xl font-bold และ mt-3 เท่ากันทั้งสองฝั่ง */}
            <div className="rounded-xl bg-[#E6F7FF] p-4 border border-blue-100">
              <div className="text-sm text-brand-main/70 font-bold">จำนวนการเข้ารับการประเมินทั้งหมด</div>
              <div className="text-xl font-bold text-brand-main mt-3">
                {stats.count} <span className="text-xs font-semibold text-gray-400">ครั้ง</span>
              </div>
            </div>
            
            <div className="rounded-xl bg-[#F5F0FF] p-4 border border-purple-100">
              <div className="text-sm text-brand-main/70 font-bold">วันที่ประเมินล่าสุด</div>
              <div className="text-xl font-bold text-brand-main mt-3">
                {stats.lastSession ? new Date(stats.lastSession.timestamp).toLocaleString("th-TH") : "-"}
              </div>
            </div>
          </div>

          {/* 📊 ส่วนแสดงผลพล็อตจุดความลาดชันแนวโน้มภาพรวมสุขภาพจิต (Pure SVG Engine) */}
          {chartData.length > 0 && (
            <div className="mt-6 rounded-2xl border border-purple-100 bg-[#FAF9FE] p-5">
              <h3 className="text-xs font-bold text-brand-main mb-4">📊 กราฟแสดงแนวโน้มภาวะสุขภาพจิตต่อเนื่อง</h3>
              <div className="relative w-full h-48 bg-white rounded-xl border p-4 flex items-end justify-between">
                
                {/* วาดเส้นไกด์ไลน์ (Dashed Line Grid) สำหรับวัดระดับสายตา */}
                <div className="absolute inset-x-0 top-1/4 border-b border-gray-100 border-dashed w-full"></div>
                <div className="absolute inset-x-0 top-2/4 border-b border-gray-100 border-dashed w-full"></div>
                <div className="absolute inset-x-0 top-3/4 border-b border-gray-100 border-dashed w-full"></div>

                <svg className="w-full h-full overflow-visible">
                  {(() => {
                    const paddingX = 40; 
                    const totalPoints = chartData.length;
                    
                    // ทำการ Mapping มิติตัวแปรคะแนน 0-27 คะแนน ออกเป็นอัตราส่วนพิกัดร้อยละเปอร์เซ็นต์บนหน้าจอแบบ Dynamic
                    const points = chartData.map((d, i) => {
                      const x = totalPoints > 1 
                        ? `calc(${paddingX}px + (100% - ${paddingX * 2}px) * ${i / (totalPoints - 1)})`
                        : "50%";
                      const y = `${100 - (d.score / 27) * 70 - 15}%`;
                      return { x, y, score: d.score, label: d.label };
                    });

                    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                    return (
                      <>
                        {/* ลากเส้นเชื่อมความชันกรณีมีข้อมูลมากกว่า 1 จุดข้อมูลขึ้นไป */}
                        {totalPoints > 1 && (
                          <path d={pathD} fill="none" stroke="#432C81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        
                        {/* พลอตจุดกลมและป้ายคะแนนสะสมกำกับข้อมูลรายรอบ */}
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#432C81" className="transition-all hover:scale-125" />
                            <text x={p.x} y={`calc(${p.y} - 12px)`} textAnchor="middle" className="text-[10px] font-black fill-brand-main">
                              {p.score} คะแนน
                            </text>
                            <text x={p.x} y="105%" textAnchor="middle" className="text-[9px] fill-gray-400 font-bold">
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}

          {/* Timeline History List Section */}
          <div className="mt-8">
            <h3 className="text-sm font-bold text-brand-main mb-4">⏱️ รายการบันทึกประวัติการตรวจสุขภาพใจ</h3>
            
            {loading ? (
              <div className="text-center text-gray-400 py-6 text-xs font-bold">กำลังโหลดข้อมูลประวัติ...</div>
            ) : err ? (
              <div className="text-center text-red-500 py-6 text-xs font-bold">{err}</div>
            ) : groupedSessions.length === 0 ? (
              <div className="text-center text-gray-400 py-6 text-xs font-bold">ยังไม่มีประวัติการทำแบบประเมินในระบบ</div>
            ) : (
              <div className="grid gap-3">
                {groupedSessions.map((session, index) => {
                  const dateLabel = new Date(session.timestamp).toLocaleString("th-TH", {
                    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
                  });

                  const isExpanded = !!expandedSessions[session.id];

                  // แสดงระดับผลลัพธ์ที่รุนแรงที่สุดที่มีในรอบนั้นๆ ขึ้นมาโชว์ที่ด้านหน้าแผงควบคุม (Priority Alert Mapping)
                  const topResultText = session.forms['8q'] ? session.forms['8q'].result_text 
                                      : (session.forms['9q'] ? session.forms['9q'].result_text 
                                      : session.forms['2q']?.result_text || "เสร็จสิ้น");

                  return (
                    <div key={session.id} className="rounded-xl border border-gray-100 bg-[#FAF9FE] shadow-2xs overflow-hidden transition-all">
                      
                      {/* คอนโทรลเลอร์ Accordion ส่วนหัวของรอบการทดสอบนั้นๆ */}
                      <button 
                        onClick={() => toggleSession(session.id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F2EEFE] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-brand-main bg-[#EFEAFE] px-2.5 py-1 rounded-full text-[10px]">
                            รอบที่ {groupedSessions.length - index}
                          </span>
                          <div>
                            <div className="text-xs sm:text-sm font-black text-brand-main max-w-[180px] sm:max-w-none truncate">
                              สรุป: {topResultText}
                            </div>
                            <div className="text-[9px] text-gray-400 font-medium mt-0.5">{dateLabel} น.</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-brand-main bg-white px-2.5 py-1.5 rounded-lg border shadow-3xs">
                          {isExpanded ? "▲ ซ่อน" : "▼ เปิดดูรายละเอียด"}
                        </span>
                      </button>

                      {/* รายละเอียดเนื้อหาฟอร์มแบบทดสอบย่อยที่จะสไลด์กางเปิดออกมา (Accordion Content Block) */}
                      {isExpanded && (
                        <div className="border-t bg-white p-4 flex flex-col gap-3 animate-fade-in">
                          
                          {/* รายละเอียดส่วนของฟอร์มคัดกรองเบื้องต้น 2Q */}
                          {session.forms['2q'] && (
                            <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-100 flex items-start gap-3">
                              <span className="bg-blue-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">2Q</span>
                              <div className="text-xs">
                                <span className="font-bold text-brand-main">ผลคัดกรองเบื้องต้น: </span>
                                <span className={session.forms['2q'].score > 0 ? "text-orange-600 font-bold" : "text-green-600 font-bold"}>
                                  {session.forms['2q'].result_text} (คะแนนรวม: {session.forms['2q'].score}/2)
                                </span>
                              </div>
                            </div>
                          )}

                          {/* รายละเอียดส่วนของฟอร์มคัดกรองโรคซึมเศร้า 9Q */}
                          {session.forms['9q'] && (
                            <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 flex items-start gap-3">
                              <span className="bg-purple-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">9Q</span>
                              <div className="text-xs">
                                <div>
                                  <span className="font-bold text-brand-main">ระดับภาวะซึมเศร้า: </span>
                                  <span className="text-purple-700 font-bold">{session.forms['9q'].result_text} (คะแนนรวม: {session.forms['9q'].score}/27)</span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed"><span className="font-bold text-gray-700">คำแนะนำแพทย์:</span> {session.forms['9q'].recommended_action}</p>
                              </div>
                            </div>
                          )}

                          {/* รายละเอียดส่วนของฟอร์มคัดกรองเฝ้าระวังฆ่าตัวตาย 8Q */}
                          {session.forms['8q'] && (
                            <div className="p-3 rounded-xl bg-pink-50/40 border border-pink-100 flex items-start gap-3">
                              <span className="bg-pink-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">8Q</span>
                              <div className="text-xs">
                                <div>
                                  <span className="font-bold text-brand-main">แนวโน้มการทำร้ายตนเอง: </span>
                                  <span className="text-red-500 font-bold">{session.forms['8q'].result_text} (คะแนนรวม: {session.forms['8q'].score}/8)</span>
                                </div>
                                <p className="text-[11px] text-red-700 mt-1 font-bold leading-relaxed">⚠️ มาตรการฉุกเฉิน: {session.forms['8q'].recommended_action}</p>
                              </div>
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

          {/* ส่วนแจ้งเตือนความปลอดภัยฉุกเฉินวิกฤต (Crisis Hotline Support) */}
          {stats.lastSession?.forms['8q'] && Number(stats.lastSession.forms['8q'].score) >= 4 && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 border border-red-100 text-xs text-red-800 font-bold leading-relaxed animate-pulse">
              🚨 ระบบตรวจพบสัญญานเฝ้าระวังระดับสูง: หากคุณกำลังมีความเครียดสะสมรุนแรงหรือมีความคิดทำร้ายตนเอง โปรดติดต่อสายด่วนสุขภาพจิต 1323 หรือ 1669 / โรงพยาบาลใกล้บ้านทันทีเพื่อรับความช่วยเหลืออย่างอบอุ่นฟรีตลอด 24 ชั่วโมง
            </div>
          )}

        </div>
      </main>
    </div>
  );
}