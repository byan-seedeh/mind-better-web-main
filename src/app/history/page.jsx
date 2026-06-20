"use client"; // บ่งชี้โครงสร้าง Client Module หน้าบ้านตรวจจับสถานะปุ่มกดสับ UI
import React, { useEffect, useMemo, useState } from "react"; // นำเข้าโมดูล Core Hooks พลังคำนวณความสม่ำเสมอของ React
import { useRouter } from "next/navigation"; // โมดูลคุมเส้นทางเดินพาร์ทนำทางหน้าจอเว็บ Next.js
import { useAuthen } from "@/utils/useAuthen"; // ฟังก์ชันคำสั่งเช็กสถานะสิทธิ์ล็อกอินบัญชียูสเซอร์คนไข้
import axios from "axios"; // ไลบรารีท่อแลกเปลี่ยนข้อมูลข้ามคลาวด์หาฝั่งเซิร์ฟเวอร์ API
import Navbar from "@/components/Navbar"; // 🛡️ DRY - ซิงค์ใช้โมดูลแถบเมนูด้านบนร่วมกันสม่ำเสมอล็อกสีแบรนด์ม่วง

// 🔤 FIXED CONFIG TO VARIABLE: ถอดที่อยู่ Hardcoded URL ลิงก์ตรงออกไปสวมตัวแปรคงที่กลางระบบคลาวด์
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function HistoryPage() {
  const router = useRouter(); // ประกาศใช้งานเครื่องมือนำทางเปิดเปลี่ยนย้ายหน้าจอเว็บ Next.js
  const { isLoading, authenticated } = useAuthen(); // ดึง State ยอดเช็กความพร้อมโปรไฟล์ข้อมูลส่วนบุคคล

  const [items, setItems] = useState([]); // ตัวแปรคลังอาเรย์สเตทเก็บแถวผลลัพธ์ประวัติตัดเกณฑ์ที่ดึงจาก MySQL
  const [loading, setLoading] = useState(true); // สเตทคุมการโชว์คำว่ากำลังโหลดระหว่างประมวลผลเน็ต
  const [err, setErr] = useState(""); // สเตทเก็บข้อความ Error ควบคุมการเด้งแจ้งเตือนกรณีหลังบ้านมีปัญหา
  const [expandedSessions, setExpandedSessions] = useState({}); // กล่องวัตถุจดจำสถานะสลับกางเปิดปิดการ์ด Accordion รายรอบ

  // ท่อเอฟเฟกต์ยิงซดดึงรอบประวัติคนไข้รายตัวมาจากฐานข้อมูล ดักจับเมื่อตรวจสอบสิทธิ์เสร็จสิ้น
  useEffect(() => {
    if (isLoading) return; // หากสถานะตรวจสอบตัวตนค้างประมวลผลอยู่ ให้ระงับหยุดรอข้อมูลดักค่าว่าง
    if (!authenticated) {
      router.replace("/login"); // สั่งดักความปลอดภัยสูงสุด: ดีดผู้บุกรุกไปหน้าล็อกอินหากยังไม่มีการเข้าระบบจริง
      return;
    }

    const loadAssessmentHistory = async () => {
      setLoading(true); // เปิดป้ายตั้งค่าเริ่มรันงานโหลดเน็ต
      setErr("");      // ล้างข้อความตกค้างเตือนภัยเดิมออกจากระบบ
      try {
        // ⏳ สั่งยิง Asynchronous ข้ามเน็ตไปกรองดึงประวัติเฉพาะรหัสไอดีผู้ใช้รายนี้ตรงพาร์ท Config
        const res = await axios.get(`${API_BASE_URL}/phq9/history/${authenticated.user_id}`);
        if (res.data.result) {
          setItems(res.data.data); // บรรจุประวัติดิบทั่งหมดที่ดึงมาลงในอาเรย์ State บันทึกคนไข้
        } else {
          throw new Error("Failed to load data"); // ดีดข้ามสายไปบล็อก Catch หากเซิร์ฟเวอร์ตอบปฏิเสธ
        }
      } catch (e) {
        setErr("ไม่สามารถดึงประวัติการทำแบบประเมินได้"); // ลงความขัดข้องทางเทคนิกลง State แจ้งผู้ใช้งาน
      } finally {
        setLoading(false); // สั่งสับคัตเอาต์ปิดสถานะโหลดคำว่ากำลังประมวลผลออกเสร็จสิ้น
      }
    };

    loadAssessmentHistory(); // เรียกรันฟังก์ชันหลักประมวลผลข้อมูล
  }, [isLoading, authenticated, router]);

  /**
   * @description 🎛️ SoC - ลอจิกจับมัดรวมฟอร์มย่อย (2Q, 9Q, 8Q) ที่ทำห่างกันไม่เกิน 5 นาทีให้รวมร่างเป็น "รอบประเมินเดียวกัน"
   * @returns {Array} รายการก้อนประวัติสรุปรอบจัดมิติเรียงจากใหม่สุดถอยหลังไปอดีต
   */
  const groupedSessions = useMemo(() => {
    if (!items.length) return []; // ถ้าไม่มีข้อมูลประวัติดิบส่งมาคิวรี ให้ดีดส่งอาร์เรย์เปล่าตัดจบงานทันที

    // เรียงเวลาจากอดีตไปหาปัจจุบัน (เก่าไปใหม่) เพื่อตั้งลูปจับคู่เงื่อนไขเวลามัดรวมรอบสะสม
    const sorted = [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const sessions = []; // กล่องคลังรองรับยอดมัดรวมชั่วคราว

    sorted.forEach((item) => {
      // ถอดรหัสแยกรหัสตัวย่อ Code ฟอร์มย่อยออกจากหัวแถวข้อความด้วย Regular Expression ปรับปรุงใหม่
      const matches = item.result_text.match(/^\[(2Q|9Q|8Q)\]\s*(.*)$/);
      const type = matches ? matches[1] : "9Q"; // ดักจับค่าว่าง: ถ้าถอดไม่ได้ บังคับให้เป็นฟอร์มหลัก 9Q ป้องกันเออร์เรอร์
      const actualText = matches ? matches[2] : item.result_text; // ข้อความแปลความหมายอาการดิบแท้จริง
      const itemTime = new Date(item.created_at).getTime(); // ตัวเลขเวลาแสตมป์มิลลิวินาทีของข้อคัดกรองแถวดังกล่าว

      // สแกนตรวจสอบหาดูว่าก่อนหน้านี้มีรอบประเมินใดที่เปิดรอไว้และมีระยะเวลาห่างกันไม่เกิน 5 นาที (5*60*1000 มิลลิวินาที)
      const existingSession = sessions.find((s) => {
        const sessionTime = new Date(s.timestamp).getTime();
        return Math.abs(sessionTime - itemTime) < 5 * 60 * 1000;
      });

      // จัดผังห่อหุ้มก้อนข้อมูล Payload สลัดผลลัพธ์รายฟอร์ม
      const dataPayload = {
        score: item.total_score,
        result_text: actualText,
        recommended_action: item.recommended_action
      };

      // ถ้ารอบเวลาดักจับแล้วพบว่าเข้าเกณฑ์ทำห่างไม่เกิน 5 นาที ให้ยัดสวมข้อมูลเข้าโครงสร้าง Object รอบเดิมทันที (มัดรวมสำเร็จ)
      if (existingSession) {
        existingSession.forms[type.toLowerCase()] = dataPayload;
      } else {
        // ถ้าระยะเวลาเปิดห่างกันเกินโควตา 5 นาที ให้สร้างสถาปนารอบการประเมินชุดรอบเบอร์ใหม่บรรจุเปิดซองคลัง
        sessions.push({
          id: item.id,
          timestamp: item.created_at,
          forms: { [type.toLowerCase()]: dataPayload }
        });
      }
    });

    return sessions.reverse(); // หมุนสลับด้านประวัติสรุปรอบ นำรอบใหม่ล่าสุดขึ้นมาขึ้นสังเวียนอันดับที่ 1 บรรทัดแรกบน UI
  }, [items]);

  // ฟังก์ชันสับสเตทเปิดแผงกางสไลด์กล่อง Accordion ดึงดูแต้มคำตอบย่อยด้านในของรอบเบอร์ที่คลิก
  const toggleSession = (id) => {
    setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ประมวลสถิติผลรวมรอบและรอบล่าสุดบันทึกเซฟเก็บเข้า useMemo ล้างปัญหาโหลดคำนวณสเตทซ้ำรุงรัง
  const stats = useMemo(() => ({
    count: groupedSessions.length, // นับยอดแต้มจำนวนรอบรวมที่เคยเข้าใช้บริการแบบประเมินแอป
    lastSession: groupedSessions[0] || null // ระบุตำแหน่งก้อนสถิติล่าสุดเพื่อนำไปถอดสลักพ่นวันเวลาคัดกรองล่าสุด
  }), [groupedSessions]);

  /**
   * @description 📈 พล็อตพิกัดและข้อมูลของกราฟ SVG Line Chart ลอยความชันอนุกรมเวลา (Pure SVG Engine บินเดี่ยวไร้คลังภายนอก)
   */
  const chartData = useMemo(() => {
    const chronologically = [...groupedSessions].reverse(); // ผังกราฟแนวโน้มจำต้องพล็อตค่าไทม์ไลน์ขยับจากซ้ายไปขวา (อดีตมุ่งหน้าสู่อนาคต)
    return chronologically.map((s, index) => ({
      label: `รอบที่ ${index + 1}`,
      // โฟกัสดึงยอดแต้ม 9Q มาพล็อตเป็นด่านหน้า หากรอบนั้นผ่านเฉพาะด่าน 2Q ให้ดึงแต้ม 2Q มาพล็อตคั่นกันเส้นพิกัดขาดหาย
      score: s.forms['9q'] ? s.forms['9q'].score : (s.forms['2q'] ? s.forms['2q'].score : 0)
    }));
  }, [groupedSessions]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-primary-light">Loading...</div>;

  return (
    <div className="min-h-screen w-full bg-primary-light font-sans antialiased">
      
      <Navbar username={authenticated?.username} activeMenu="history" />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-2xl bg-warm-white p-6 shadow-md border border-purple-50/20">
          
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#432C81]">ประวัติการประเมินสุขภาพจิต</h1>
              <p className="text-xs text-gray-500 mt-1">สรุปภาพรวมและสถิติประวัติการคัดกรองรายรอบของคุณ</p>
            </div>
            <button
              onClick={() => router.push("/assessment")}
              className="rounded-lg bg-[#432C81] px-4 py-2 text-xs font-bold text-white hover:bg-[#342163] cursor-pointer transition-all"
            >
              เริ่มประเมินรอบใหม่
            </button>
          </div>

          {/* สรุปยอดข้อมูลจำแนกตามสถาปัตยกรรม (Stats Summary Layout) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            {/* ✨ UI REFINEMENT FIX 1: ปรับแก้ฟอนต์ตัวเลขสถิติลงมาเป็น `font-semibold` และหน่วยนับเป็น `font-normal` สบายตาตรงสเปกมินิมอลละมุน */}
            <div className="rounded-xl bg-[#E6F7FF] p-4 border border-blue-100 shadow-3xs">
              <div className="text-sm text-[#432C81]/70 font-bold">จำนวนการเข้ารับการประเมินทั้งหมด</div>
              <div className="text-xl font-semibold text-[#432C81] mt-3">
                {stats.count} <span className="text-xs font-normal text-gray-400">ครั้ง</span>
              </div>
            </div>
            
            {/* ✨ UI REFINEMENT FIX 2: ปรับความโค้งมน ระยะห่าง mt-3 และความหนาเป็น `font-semibold` บาลานซ์สมมาตรเท่ากันเป๊ะสองฝั่ง */}
            <div className="rounded-xl bg-[#F5F0FF] p-4 border border-purple-100 shadow-3xs">
              <div className="text-sm text-[#432C81]/70 font-bold">Tanggal วันที่ประเมินล่าสุด</div>
              <div className="text-xl font-semibold text-[#432C81] mt-3">
                {stats.lastSession ? new Date(stats.lastSession.timestamp).toLocaleString("th-TH") : "-"}
              </div>
            </div>
          </div>

          {/* 📊 ส่วนแสดงผลพล็อตจุดความลาดชันแนวโน้มภาพรวมสุขภาพจิต (Pure SVG Engine) */}
          {chartData.length > 0 && (
            <div className="mt-6 rounded-2xl border border-purple-100 bg-[#FAF9FE] p-5">
              <h3 className="text-xs font-bold text-[#432C81] mb-4">📊 กราฟแสดงแนวโน้มภาวะสุขภาพจิตต่อเนื่อง</h3>
              <div className="relative w-full h-48 bg-white rounded-xl border p-4 flex items-end justify-between">
                
                <div className="absolute inset-x-0 top-1/4 border-b border-gray-100 border-dashed w-full"></div>
                <div className="absolute inset-x-0 top-2/4 border-b border-gray-100 border-dashed w-full"></div>
                <div className="absolute inset-x-0 top-3/4 border-b border-gray-100 border-dashed w-full"></div>

                <svg className="w-full h-full overflow-visible">
                  {(() => {
                    const paddingX = 40; 
                    const totalPoints = chartData.length;
                    
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
                        {totalPoints > 1 && (
                          <path d={pathD} fill="none" stroke="#432C81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        
                        {/* ปรับสเกลตัวอักษรยอดคะแนนเหนือกราฟรายสเต็ปลงมาเป็น `font-semibold` ดูพรีเมียมหรูหราขึ้นมหาศาล */}
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#432C81" className="transition-all hover:scale-125" />
                            <text x={p.x} y={`calc(${p.y} - 12px)`} textAnchor="middle" className="text-[10px] font-semibold fill-[#432C81]">
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
            <h3 className="text-sm font-bold text-[#432C81] mb-4">⏱️ รายการบันทึกประวัติการตรวจสุขภาพใจ</h3>
            
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

                  const topResultText = session.forms['8q'] ? session.forms['8q'].result_text 
                                      : (session.forms['9q'] ? session.forms['9q'].result_text 
                                      : session.forms['2q']?.result_text || "เสร็จสิ้น");

                  return (
                    <div key={session.id} className="rounded-xl border border-gray-100 bg-[#FAF9FE] shadow-2xs overflow-hidden transition-all">
                      
                      <button 
                        onClick={() => toggleSession(session.id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F2EEFE] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#432C81] bg-[#EFEAFE] px-2.5 py-1 rounded-full text-[10px]">
                            รอบที่ {groupedSessions.length - index}
                          </span>
                          <div>
                            <div className="text-xs sm:text-sm font-black text-[#432C81] max-w-[180px] sm:max-w-none truncate">
                              สรุป: {topResultText}
                            </div>
                            <div className="text-[9px] text-gray-400 font-medium mt-0.5">{dateLabel} น.</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#432C81] bg-white px-2.5 py-1.5 rounded-lg border shadow-3xs">
                          {isExpanded ? "▲ ซ่อน" : "▼ เปิดดูรายละเอียด"}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t bg-white p-4 flex flex-col gap-3 animate-fade-in">
                          
                          {/* 📐 ปรับแก้ไขระดับความหนาคะแนนผลลัพธ์รายฟอร์มภายใน Accordion สู่ `font-semibold` คลีนตาอย่างเสมอภาคกัน */}
                          {session.forms['2q'] && (
                            <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-100 flex items-start gap-3">
                              <span className="bg-blue-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">2Q</span>
                              <div className="text-xs">
                                <span className="font-bold text-[#432C81]">ผลคัดกรองเบื้องต้น: </span>
                                <span className={session.forms['2q'].score > 0 ? "text-orange-600 font-semibold" : "text-green-600 font-semibold"}>
                                  {session.forms['2q'].result_text} (คะแนนรวม: {session.forms['2q'].score}/2)
                                </span>
                              </div>
                            </div>
                          )}

                          {session.forms['9q'] && (
                            <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 flex items-start gap-3">
                              <span className="bg-purple-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">9Q</span>
                              <div className="text-xs">
                                <div>
                                  <span className="font-bold text-[#432C81]">ระดับภาวะซึมเศร้า: </span>
                                  <span className="text-purple-700 font-semibold">{session.forms['9q'].result_text} (คะแนนรวม: {session.forms['9q'].score}/27)</span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed"><span className="font-bold text-gray-700">คำแนะนำแพทย์:</span> {session.forms['9q'].recommended_action}</p>
                              </div>
                            </div>
                          )}

                          {session.forms['8q'] && (
                            <div className="p-3 rounded-xl bg-pink-50/40 border border-pink-100 flex items-start gap-3">
                              <span className="bg-pink-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">8Q</span>
                              <div className="text-xs">
                                <div>
                                  <span className="font-bold text-[#432C81]">แนวโน้มการทำร้ายตนเอง: </span>
                                  <span className="text-red-500 font-semibold">{session.forms['8q'].result_text} (คะแนนรวม: {session.forms['8q'].score}/8)</span>
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