"use client"; // บ่งชี้ให้ Next.js ทราบว่าไฟล์นี้เป็น Client Component สำหรับควบคุมหน้าบ้านและการทำงานของ UI
import React, { useEffect, useMemo, useState } from "react"; // นำเข้าโมดูล Core Hooks ของ React สำหรับควบคุมสเตทและการจำค่า
import { useRouter } from "next/navigation"; // นำเข้าโมดูลช่วยนำทางและเปลี่ยนย้ายหน้าเพจของ Next.js Navigation
import { useAuthen } from "@/utils/useAuthen"; // นำเข้าโมดูล custom hook สำหรับดักฟังและพิสูจน์สิทธิ์การล็อกอินของผู้ใช้
import { getPhq9History } from "@/services/historyService"; // นำเข้าฟังก์ชันดึงประวัติการทำแบบประเมินสุขภาพจิตจากบริการ Service หลังบ้าน
import Navbar from "@/components/Navbar"; // นำเข้าส่วนประกอบแถบเมนูด้านบน (Navigation Bar) ประจำเว็บไซต์

/* =========================================================================
 * 1) CONFIGURATION OBJECT - สเปกและเกณฑ์คะแนนสูงสุดประจำฟอร์มแบบประเมินแต่ละประเภท
 * ========================================================================= */
const CONFIG = {
  "2q": { title: "แบบคัดกรองภาวะซึมเศร้าเบื้องต้น (2Q)", max: 2 }, // กำหนดชื่อเต็มและคะแนนเต็มสูงสุดของแบบประเมิน 2Q ตามโครงสร้าง MySQL
  "9q": { title: "แบบประเมินโรคซึมเศร้าฉบับมาตรฐาน (9Q)", max: 27 }, // กำหนดชื่อเต็มและคะแนนเต็มสูงสุดของแบบประเมิน PHQ-9
  "8q": { title: "แบบประเมินความเสี่ยงและพฤติกรรมทำร้ายตนเอง (8Q)", max: 8 } // กำหนดชื่อเต็มและคะแนนเต็มสูงสุดของแบบประเมิน 8Q
};

/**
 * @description ฟังก์ชันทำความสะอาดและแปลงค่าประเภทแบบประเมินให้สวมรหัสตัวพิมพ์เล็กมาตรฐานระดับสากล
 */
const normalizeType = (raw) => {
  const s = String(raw || "").toLowerCase().replace(/[^a-z0-9]/g, ""); // แปลงเป็นสายอักขระตัวพิมพ์เล็กและลบเครื่องหมายพิเศษทิ้งทั้งหมด
  if (s === "q2" || /^(phq)?2q?$/.test(s) || s === "2q") return "2q"; // ดักจับแมปสัญญานระบุฟอร์มย่อเริ่มต้น 2Q
  if (s === "q9" || /^(phq)?9q?$/.test(s) || s === "9q") return "9q"; // ดักจับแมปสัญญานระบุฟอร์มมาตรฐานหลัก 9Q
  if (s === "q8" || /^(phq)?8q?$/.test(s) || s === "8q") return "8q"; // ดักจับแมปสัญญานระบุฟอร์มเฝ้าระวังวิกฤต 8Q
  return null; // คืนค่ากลับออกไปเป็น null กรณีที่รหัสดิบไม่สอดรับเกณฑ์ใดเลย
};

/**
 * @description ฟังก์ชันประมวลผลคำนวณเกณฑ์ระดับความรุนแรงทางการแพทย์เพื่อนำไปปักป้ายระบุหน้ากรอบข้อความหลัก
 */
const severityOf = (type, score) => {
  if (type === "2q") { // คำนวณขอบเขตเกณฑ์ระดับอาการสำหรับฟอร์มย่อ 2Q
    return score > 0 ? "พบความเสี่ยงภาวะซึมเศร้า" : "ปกติ"; // มีอาการตั้งแต่ 1 คะแนนขึ้นไปถือว่าพบเงื่อนไขความเสี่ยงแทรกแซง
  }
  if (type === "9q") { // คำนวณขอบเขตเกณฑ์ระดับอาการสำหรับฟอร์มซึมเศร้ามาตรฐาน 9Q
    if (score >= 20) return "ซึมเศร้ารุนแรง"; // ตกเกณฑ์ช่วงวิกฤตระดับสูงสุด 20-27 แต้ม
    if (score >= 15) return "ซึมเศร้าค่อนข้างรุนแรง"; // ตกเกณฑ์ช่วงระดับ 15-19 แต้ม
    if (score >= 10) return "ซึมเศร้าปานกลาง"; // ตกเกณฑ์ช่วงระดับ 10-14 แต้ม
    if (score >= 5) return "ซึมเศร้าเล็กน้อย"; // ตกเกณฑ์ช่วงระดับ 5-9 แต้ม
    return "ปกติ"; // คะแนนดิบสะสมรวมต่ำกว่า 5 คะแนน
  }
  if (type === "8q") { // คำนวณขอบเขตเกณฑ์ระดับอาการสำหรับฟอร์มป้องกันพฤติกรรมทำร้ายตนเอง 8Q
    if (score >= 8) return "ระดับความเสี่ยงทำร้ายตนเอง: รุนแรงมาก"; // ตกสเกลเพดานแต้มสูงสุด 8 คะแนนเต็ม
    if (score >= 5) return "ระดับความเสี่ยงทำร้ายตนเอง: ปานกลาง"; // ตกเกณฑ์ช่วงคะแนน 5-7 แต้ม
    if (score >= 1) return "ระดับความเสี่ยงทำร้ายตนเอง: น้อย"; // ตกเกณฑ์ช่วงคะแนน 1-4 แต้ม
    return "ไม่มีความเสี่ยงทำร้ายตนเอง"; // คะแนนดิบสะสมรวมเท่ากับ 0 คะแนนพอดีเป๊ะ
  }
  return "ประเมินผลสำเร็จ"; // ข้อความสรุปกรณีสำรองระบบทั่วไป
};

/**
 * @description ฟังก์ชันจัดระเบียบปรับแต่งคุณสมบัติก้อนข้อมูลดิบ (Data Parser) ให้พร้อมเสิร์ฟแผงคอนโทรลเลอร์หน้าบ้าน
 */
const toItem = (x) => {
  const rawType = x.assessment_code ?? x.assessment_type ?? x.type ?? x.form_type ?? x.form; // ดักดึงฟิลด์บ่งชี้ประเภทจากฐานข้อมูลเชิงสัมพันธ์
  let type = normalizeType(rawType); // รันคำสั่งแปลงรูปข้อความเป็นมาตรฐานเดียวกัน

  const answers = Array.isArray(x.answers) // ตรวจเช็กคลังอาร์เรย์คำตอบรายข้อว่าแนบมาในรูปแบบ Array หรือไม่
    ? x.answers.map((v) => Number(v)).filter((v) => Number.isFinite(v)) // แมปเปลี่ยนโครงสร้างข้อมูลให้เป็นสมาชิกตัวเลขดิบฉบับสมบูรณ์
    : []; // คืนค่าอาร์เรย์ว่างเปล่าดักไว้กรณีที่ข้อมูลหลุดสูญหาย

  if (!type) { // ลоจิกเดาจำแนกประเภทฟอร์มกรณีที่ระบบหลังบ้านลืมผูกชื่อสลักพาร์ทข้อความส่งมา
    const maxFromApi = Number(x.max_score || x.score); // สกัดตรวจสอบเพดานคะแนนดิบรวมของแบบสอบถาม
    if (answers.length === 2 || maxFromApi === 2) type = "2q"; // คัดกรองเข้าเงื่อนไขฟอร์ม 2Q ทันที
    else if (answers.length === 8 || maxFromApi === 8) type = "8q"; // คัดกรองเข้าเงื่อนไขฟอร์ม 8Q ทันที
    else if (answers.length === 9 || maxFromApi === 27) type = "9q"; // คัดกรองเข้าเงื่อนไขฟอร์ม 9Q ทันที
    else type = "9q"; // ล็อกเป็นค่าฟอลแบ็กสำรองป้องกันระบบ Crash
  }

  const max = CONFIG[type]?.max || 27; // ดึงฐานเพดานแต้มเต็มสูงสุดของสเกลฟอร์มประเภทนั้น ๆ
  let score = Number(x.total_score || x.score || 0); // ดึงแต้มคะแนนสะสมรวมดิบที่บันทึกสำเร็จจริง
  score = Math.min(Math.max(score, 0), max); // บังคับให้ขอบข่ายตัวเลขตกอยู่ในกรอบสเกลคะแนนที่ถูกต้อง 0 ถึง Max สากล

  const created = new Date(x.created_at || x.createdAt || x.date || 0); // จัดรูปข้อความไทม์แสตมป์ดิบให้ออกมาเป็นโครงสร้าง JavaScript Date

  return { // ส่งมัดก้อน Object บันทึกประวัติข้อมูลฉบับสมบูรณ์ออกไปกระจายหน้าจอ
    id: x.id ?? `${type}-${created.getTime()}`, // ควบคุมรหัสกุญแจหลักประจำแถวข้อมูล
    type, // ประเภทตัวย่อฟอร์มประเมินย่อย
    score, // ผลรวมแต้มคะแนนรวมดิบ
    max, // แต้มเต็มเพดานสูงสุดประจำสเกล
    created, // วันเวลาแสตมป์ระบบที่ทำแบบทดสอบ
    answers, // อาร์เรย์คะแนนรายข้อคำตอบย่อย
    result_text: x.result_text || severityOf(type, score), // ข้อความวินิจฉัยเกณฑ์อาการประจำยอดคะแนน
    recommended: x.recommended_action || x.recommended || "" // ข้อความคำชี้แนะหรือมาตรการดูแลช่วยเหลือทางการแพทย์
  };
};

/* =========================================================================
 * 3) COMPONENT CONROLLER WINDOW IMPLEMENTATION
 * ========================================================================= */
export default function HistoryPage() {
  const router = useRouter(); // ประกาศติดตั้งฟังก์ชันช่วยนำทางเปลี่ยนย้ายพาร์ทหน้าเพจระบบ Next.js
  const { isLoading, authenticated } = useAuthen(); // แตกสเตทดักฟังความพร้อมในการสกัดเช็กระบบรักษาความปลอดภัยโปรไฟล์ผู้ใช้งาน

  const [items, setItems] = useState([]); // สเตทอาเรย์หลักสำหรับจดจำลิสต์ประวัติการประเมินดิบที่ดึงซิงค์มาจากคลาวด์หลังบ้าน
  const [loading, setLoading] = useState(true); // สเตทควบคุมสัญญาณหมุนและกางหน้าต่างโหลดเดอร์รอรับก้อนคอนเทนต์เครือข่าย
  const [err, setErr] = useState(""); // สเตทเก็บคำอธิบายอาการข้อผิดพลาดกรณีท่อส่งสัญญาณ API เกิดสภาวะล่มดาวน์
  const [expandedSessions, setExpandedSessions] = useState({}); // สเตทควบคุมตัวแปรบูลีนเปิด/ปิด การสไลด์กางกล่องดูสถิติรายละเอียดรายข้อด้านใน

  // เอฟเฟกต์ยิงตรวจซิงค์ข้อมูลประวัติจากตาราง MySQL ทำงานอัตโนมัติรอบเดียวเมื่อผ่านเกณฑ์ล็อกอินเซสชัน
  useEffect(() => {
    if (isLoading) return; // หากหลอดสัญญานตรวจสอบความพร้อมสิทธิ์ผู้ใช้งานยังวิ่งไม่เสร็จสิ้น สั่งตัดลูปจบระงับขั้นตอนไปก่อน
    if (!authenticated) { // หากผลการพิสูจน์สิทธิ์ระบุว่ายูสเซอร์แอบคีย์พิมพ์ลิงก์บราวเซอร์เข้ามาโดยยังไม่ได้ทำสัญญานล็อกอินบัญชีจริง
      router.replace("/login"); // สั่งการดีดตัวทำลายเส้นทางเด้งพาผู้ใช้กลับหน้าจอล็อกอินกลางเว็บทันทีเพื่อความปลอดภัยข้อมูล
      return; // สิ้นสุดรอบคำสั่ง
    }

    const loadAssessmentHistory = async () => { // ประกาศชุดฟังก์ชันเหลื่อมเวลาคิวรีก้อนข้อมูล Asynchronous Flow
      setLoading(true); // ปรับค่าสเตทสั่งเปิดระบบป้ายข้อความกำลังประมวลผลข้อมูลรอรับผลลัพธ์
      setErr(""); // เคลียร์สลายสัญญาณคำแจ้งเตือนเออร์เรอร์ก้อนเก่าทิ้งไปให้สะอาดกระดาน
      try {
        const res = await getPhq9History(authenticated.user_id); // ยิงคำขอเชื่อมต่อข้ามเว็บบลูทูธไปซิงค์ประวัติผ่าน Service แกนหลัก
        if (res?.result) { // หากผลลัพธ์จาก SQL ขานสัญญาณตอบกลับมาเป็นบวก (true) บ่งชี้การคิวรีสมบูรณ์
          const list = (Array.isArray(res.data) ? res.data : []).map(toItem); // แปลงอาร์เรย์อาคารดิบผ่านกลไกแปลงรูปข้อมูลจัดระเบียบให้เสถียร
          setItems(list); // บรรจุอาเรย์ประวัติฉบับเรียบร้อยลงไปประทับค้างสเตทหน้าระบบคอนโทรลเลอร์
        } else {
          throw new Error("Failed to load data"); // พ่นรหัสขัดข้องทางเทคนิคทันทีหากโครงสร้าง Response พังยุบตัว
        }
      } catch (e) {
        setErr("ไม่สามารถดึงประวัติการทำแบบประเมินได้"); // บันทึกข้อความแจ้งอาการขัดข้องลงระบบสเตทเพื่อพิมพ์แจ้งเตือนคนไข้หน้าเว็บ
      } finally {
        setLoading(false); // สับสวิตช์ปิดระบบสัญญาณหมุนโหลดคอนเทนต์ออกไปเสร็จสิ้นเมื่อระบบคิวรีหลุดลูป Try-Catch
      }
    };

    loadAssessmentHistory(); // เรียกสั่งรันการทำงานของฟังก์ชัน Async ดึงประวัติตัวด้านบนสุดทำงานทันทีอย่างไร้รอยต่อ
  }, [isLoading, authenticated, router]); // มัดรวมชุดพารามิเตอร์ดักฟังการปรับค่ารันระบบเอฟเฟกต์ซ้ำซ้อน

  /**
   * @description 🧠 CLINICAL SESSION GROUPING ENGINE (ลоจิกควบรวมฟอร์มประจำรอบการประเมินอัจฉริยะ)
   * ขยายขอบเขตหน้าต่างเวลาขึ้นเป็นระดับ 30 นาทีครอบคลุมการนั่งทำแบบทดสอบ เพื่อการันตีการมัดรวมแบบประเมิน
   * ทุกตัว (2Q ➔ 9Q ➔ 8Q) ให้อยู่รวมเป็นชุดเดียวกันในกล่องรอบนั้น ไม่แตกแขนงแยกกล่องแยกครั้งให้สับสนกระดาน
   */
  const groupedSessions = useMemo(() => {
    if (!items || !items.length) return []; // หากฐานข้อมูลประวัติสะสมยังคงโล่งหรือว่างเปล่า ให้คืนค่าอาร์เรย์ว่างกลับออกไปทันที

    // ทำการโคลนและจัดหมวดเรียงลำดับเวลาแสตมป์จาก อดีต ➔ ปัจจุบัน เพื่อทำการสแกนจับกลุ่มมัดช่วงเวลาต่อเนื่อง (Chronological Grouping)
    const sorted = [...items].sort((a, b) => a.created - b.created);
    const sessions = []; // ตั้งต้นตะกร้าอาร์เรย์เปล่าสำหรับใช้จัดระเบียบกลุ่มรอบประวัติครั้งการทำชุดใหม่

    sorted.forEach((item) => { // ลูปเดินสายตาเจาะอ่านก้อนประวัติการทำรายแถวข้อมูลดิบอย่างละเอียดถี่ถ้วน
      const itemTime = item.created.getTime(); // แปลงค่าวันเวลาแสตมป์ของเรคคอร์ดข้อคำถามนั้นให้ออกมาเป็นตัวเลขสถิติมิลลิวินาที

      // 🎯 HIGH-STABILITY SESSION CONTROL WINDOW: ตรวจเช็กมองหากล่องรอบการทำเดิมที่เวลาสอดคล้องกันค้างในอาเรย์
      const existingSession = sessions.find((s) => {
        const sessionTime = new Date(s.timestamp).getTime(); // แปลงเวลาปักหมุดเริ่มต้นของกลุ่มรอบเดิมให้เป็นตัวเลขมิลลิวินาทีดิบ
        // ประกาศเงื่อนไข: ช่วงเวลาห่างกันห้ามเกินเกณฑ์ช่วงกว้าง 30 นาที และในตะกร้ารอบเดิมนั้นต้องยังไม่มีแบบประเมินรหัสนี้ฝังค้างอยู่ซ้ำซ้อน
        return Math.abs(sessionTime - itemTime) < 30 * 60 * 1000 && !s.forms[item.type];
      });

      if (existingSession) { // หากลоจิกตรวจสอบแล้วพบว่ารอบดังกล่าวเข้าข่ายเป็นเซสชันชุดการประเมินต่อเนื่องเดียวกัน
        existingSession.forms[item.type] = item; // ทำการฝังแนบส่งตัวแบบประเมินย่อย (2Q, 9Q หรือ 8Q) ลงไปรวมศูนย์ฝากฝังไว้ในรอบนั้นทันที!
      } else { // หากลоจิกวิเคราะห์แล้วพบว่าเวลาห่างกันยาวเกินพิกัด หรือเป็นฟอร์มประเมินรหัสตัวเดิมที่ผู้ใช้เริ่มกดคลิกทำซ้ำรอบใหม่
        sessions.push({ // สั่งประกาศตั้งสถาปนากรุปตั้งตัวเปิดกล่องเซสชัน "ครั้งที่ประเมินรอบใหม่" แยกอิสระออกมาอีกหนึ่งรายการ
          id: `session-${item.id}-${itemTime}`, // เจนรหัสไอดีจำเพาะกลุ่มเพื่อใช้คุมคอนโทรลเลอร์เอฟเฟกต์การกางหน้าจอแยกกล่อง
          timestamp: item.created, // แสตมป์ล็อกวันเวลาตั้งหลักของกรอบรอบการทำโดยอ้างอิงเวลาจริงของตัวคำถามข้อนี้
          forms: { [item.type]: item } // ผูกประเดิมฝังชิ้นงานแบบประเมินย่อยตัวแรกสุดลงไปประจำการประดับกล่องใหม่
        });
      }
    });

    // ตีกลับด้านอาร์เรย์ผลลัพธ์รอบการจัดกลุ่มทั้งหมด (Reverse) เพื่อดีดให้ "ครั้งประเมินล่าสุด" ขึ้นแสดงอยู่แถวบนสุดของตารางประวัติเสมอ
    return sessions.reverse();
  }, [items]); // มัดตรวจจับความเคลื่อนไหวความเปลี่ยนผันของตัวแปรข้อมูลดิบประวัติหลักเมื่อมีการขยับค่าคลังคะแนน

  /**
   * @description 📊 1) DYNAMIC STATISTICS KPI CALCULATOR (เครื่องยนต์สกัดวิเคราะห์สถิติตัวนับการ์ด 3 ช่องด้านบน)
   */
  const summaryStats = useMemo(() => {
    const totalCount = groupedSessions.length; // สกัดนับยอดรวมของจำนวนครั้งประเมินจริงทั้งหมดที่ผ่านกลไกหลอมรวมกลุ่มเวลาเสร็จสิ้นเรียบร้อย
    let latestScore = 0; // ตั้งค่าเริ่มต้นแต้มคะแนนดิบครั้งล่าสุดของฟอร์มหลักหลักสากลเป็น 0
    let trendDirection = "none"; // ตั้งสถานะทิศทางแนวโน้มประมวลผลเริ่มต้นให้ออกมาเป็นค่าว่างเปล่า (none) เพื่อความปลอดภัยระบบ

    if (totalCount > 0) { // ปลดล็อกลоจิกดึงสถิติคู่กรณีที่ฐานข้อมูลรอบประวัติมีค่าการทำรายงานสะสมหลงเหลืออยู่อย่างน้อยหนึ่งครั้ง
      const latestSession = groupedSessions[0]; // หยิบรอบประวัติครั้งบนสุด (ครั้งล่าสุดในอนุกรมเวลาปัจจุบัน) ออกมาเป็นโมเดลแกนหลัก
      
      // ควานหาแต้มคะแนนดิบสะสมรวมจากแบบประเมินหลักที่มีนัยสำคัญสูงสุดประจำรอบล่าสุดขึ้นมาสลัก (9q > 8q > 2q)
      if (latestSession.forms['9q']) latestScore = latestSession.forms['9q'].score; // ดึงแต้มคะแนนดิบจากฟอร์มหลักโรคซึมเศร้ามาตรฐาน 9Q
      else if (latestSession.forms['8q']) latestScore = latestSession.forms['8q'].score; // ดึงแต้มคะแนนดิบจากฟอร์มเฝ้าระวังความเสี่ยง 8Q ทดแทน
      else if (latestSession.forms['2q']) latestScore = latestSession.forms['2q'].score; // ดึงแต้มคะแนนจากฟอร์มคัดกรองเบื้องต้นย่อสุด 2Q ทดแทน

      if (totalCount >= 2) { // เงื่อนไขในการเปรียบเทียบหาเส้นสโลปความลาดชันแนวโน้มสะสม (ระบบจำเป็นต้องมีประวัติอย่างน้อย 2 ครั้งขึ้นไป)
        const currentSession = groupedSessions[0]; // ตัวแปรอ้างอิงสถิติครั้งที่ประเมินล่าสุดปัจจุบัน (ครั้งที่ N)
        const previousSession = groupedSessions[1]; // ตัวแปรอ้างอิงสถิติครั้งที่ประเมินถอยหลังถัดไปในอดีต (ครั้งที่ N-1)

        let currentActiveScore = currentSession.forms['9q']?.score || currentSession.forms['8q']?.score || currentSession.forms['2q']?.score || 0; // สกัดแต้มครั้งปัจจุบัน
        let previousActiveScore = previousSession.forms['9q']?.score || previousSession.forms['8q']?.score || previousSession.forms['2q']?.score || 0; // สกัดแต้มครั้งในอดีต

        // ทำการคัดกรองคำนวณเปรียบเทียบสัดส่วนตัวเลขเพื่อแยกแยะชนิดมาตรวัดทิศทางแนวโน้มสถิติ
        if (currentActiveScore > previousActiveScore) trendDirection = "up"; // คะแนนดิบรอบใหม่สูงกว่ารอบเก่า สรุปสถานะแนวโน้มทิศทางขยับพุ่งสูงขึ้น (ความเสี่ยงเพิ่ม)
        else if (currentActiveScore < previousActiveScore) trendDirection = "down"; // คะแนนดิบรอบใหม่ต่ำลงกว่ารอบเก่า สรุปสถานะแนวโน้มทิศทางทุเลาปรับลดลง (ความเสี่ยงลดลง ดีต่อสุขภาพใจ)
        else trendDirection = "same"; // แต้มสถิติตัวเลขคงที่เท่าเดิมไม่เปลี่ยนแปลง สรุปสถานะแนวโน้มทิศทางเท่าเดิมคงที่
      }
    }

    return { totalCount, latestScore, trendDirection }; // ส่งกล่อง Object ผลสรุปดัชนี KPI ทั้ง 3 หมวดออกไปวางบนโครงสร้างการ์ด UI ด้านบน
  }, [groupedSessions]); // ดักฟังความเคลื่อนไหวความเปลี่ยนผันของอาร์เรย์กลุ่มรอบประวัติอย่างใกล้ชิดป้องกันบั๊กตัวเลขนิ่งค้าง

  /**
   * @description 📊 2) GRAPH ANCHOR POINTS GENERATOR (เครื่องยนต์แมปค่าพิกัดพล็อตจุดแนวโน้มบนกระดานกราฟ SVG โค้งมน)
   */
  const chartPointsData = useMemo(() => {
    const chronologically = [...groupedSessions].reverse(); // สั่งคัดลอกก้อนข้อมูลรอบและกลับหัวสเกลพล็อตจาก อดีต ➔ ปัจจุบัน (ซ้ายวิ่งไปขวาตามอนุกรมเวลาสากล)
    return chronologically.map((s, index) => {
      let activeValueScore = 0; // ตั้งค่าฐานตัวเลขคะแนนสะสมที่จะดึงไปพล็อตจุดเหนือกราฟเส้นตรงความชันเริ่มต้นเป็น 0
      let maxScaleCeil = 27; // ตั้งเกณฑ์เพดานหารค่าร้อยละพิกัดแกนดั้งเดิมอ้างอิงจากฟอร์ม 9Q สากลเป็นฐานคะแนนสูงสุดหลัก

      if (s.forms['9q']) { // คัดสกัดคะแนนจากฟอร์มหลัก 9Q ประจำรอบเวลาคาบเกี่ยวนั้นมาคำนวณความชัน
        activeValueScore = s.forms['9q'].score; // ดึงแต้มรวมดิบของฟอร์ม 9Q
        maxScaleCeil = CONFIG['9q'].max; // ตรึงตัวหารเพดานไว้ที่ 27 คะแนนตามเกณฑ์ทางการแพทย์จริง
      } else if (s.forms['8q']) { // ดึงแต้มคะแนนจากฟอร์มรอง 8Q มาคำนวณพล็อตทดแทนกรณีรอบนั้นคนไข้ไม่ตกเกณฑ์ทำฟอร์มหลัก 9Q
        activeValueScore = s.forms['8q'].score; // ดึงแต้มรวมดิบของฟอร์ม 8Q
        maxScaleCeil = CONFIG['8q'].max; // ตรึงตัวหารเพดานปรับฐานไว้ที่ 8 คะแนนเต็มสเกล เพื่อป้องกันจุดกราฟตกจมดินผิดเพี้ยน
      } else if (s.forms['2q']) { // ดึงแต้มคะแนนจากฟอร์มเบื้องต้น 2Q มาคำนวณพล็อตทดแทนกรณีทำเฉพาะด่านแรกสะอาดๆ
        activeValueScore = s.forms['2q'].score; // ดึงแต้มรวมดิบของฟอร์ม 2Q
        maxScaleCeil = CONFIG['2q'].max; // ตรึงตัวหารเพดานปรับฐานไว้ที่ 2 คะแนนเต็มสเกล เพื่อรักษาความลาดชันภาพรวม
      }

      return {
        roundLabel: `${index + 1}`, // สลักตัวเลขรหัสลำดับรอบใต้แกนแนวนอนของกราฟเรียงลำดับจาก 1, 2, 3 ตามประวัติจริงในอดีตมุ่งหน้าสู่ปัจจุบัน
        scoreValue: activeValueScore, // บรรจุค่าตัวเลขแต้มคะแนนที่จะส่งไปวาดบนพื้นที่ระนาบ SVG Graph
        maxScale: maxScaleCeil // บรรจุค่าเพดานคะแนนดิบสำหรับนำไปคำนวณหาสัดส่วนร้อยละ (%) การขึงพิกัดแกนตั้งแกนนอนแนวตั้ง
      };
    });
  }, [groupedSessions]); // ผูกมัดสัญญานระแวดระวังการขยับสเตทกลุ่มประวัติรายรอบ

  /**
   * @description 🎯 BUG FIX TRIGGER: เพิ่มฟังก์ชันควบคุมตัวแปรจัดการคลิกเปิดกางกล่องตามชื่อเดิมเป๊ะๆ ปิดจุด ReferenceError 100%
   */
  const toggleSession = (id) => {
    setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] })); // สลับประทับค่าบูลีนผูกจำสถานะตามเลขไอดีเฉพาะของแต่ละครั้งประเมิน
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#E8FAFF] text-sm font-semibold text-[#432C81]">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen w-full bg-[#E8FAFF] font-sans antialiased text-[#432C81]">
      {/* เรียกใช้งานแถบเมนูด้านบนร่วมส่วนกลาง คลีน สะอาด สไตล์พาสเทลกระบอกเดียว */}
      <Navbar username={authenticated?.username} activeMenu="history" />

      {/* บล็อกจัดวางพิกัดพื้นที่กระดานคอนเทนต์ขนาดใหญ่สุด Max-Width 5X กลางเพจหน้าต่างหลัก */}
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-3xl bg-white p-6 md:p-8 shadow-xl border border-purple-50/20">
          
          {/* ส่วนหัวแสดงหัวข้อหลักของหน้ารายงานประวัติการคัดกรองสุขภาพใจ */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#432C81]">ประวัติการประเมินสุขภาพจิต</h1>
              <p className="text-xs text-gray-500 mt-1">สรุปภาพรวมแดชบอร์ดสถิติแนวโน้มการดูแลหัวใจและการทำแบบคัดกรองของคุณ</p>
            </div>
            {/* ปุ่มทางลัดนำทางสำหรับดีดพายูสเซอร์เปิดประตูเข้าหน้าห้องทำแบบทดสอบเริ่มประเมินเคสรอบใหม่ */}
            <button
              onClick={() => router.push("/assessment")}
              className="rounded-xl bg-[#432C81] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#342163] cursor-pointer transition-all"
            >
              เริ่มประเมินรอบใหม่
            </button>
          </div>

          {/* =========================================================================
              📊 1) NEW CARD BUTTONS MATRIX (กล่องแผงข้อมูลการ์ดสถิติ 3 ช่องด้านบนสุด คลีน มินิมอล ฟอนต์หนาเท่ากัน)
              ========================================================================= */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            
            {/* การ์ดช่องที่ 1: สรุปนับจำนวนครั้งรวมทั้งหมดที่ผ่านการมัดรวมกลุ่ม Session ประวัติเรียบร้อยแล้ว */}
            <div className="rounded-2xl bg-[#E6F7FF] p-5 border border-blue-100 shadow-3xs transition-all hover:scale-[1.005]">
              <div className="text-xs text-[#432C81]/70 font-semibold uppercase tracking-wider">จำนวนครั้งเข้ารับการประเมินทั้งหมด</div>
              <div className="text-2xl font-semibold text-[#432C81] mt-3 flex items-baseline gap-1">
                {summaryStats.totalCount} <span className="text-xs font-normal text-gray-400">ครั้ง</span>
              </div>
            </div>
            
            {/* การ์ดช่องที่ 2: สรุปแต้มคะแนนดิบรวมของแบบสอบถามตัวแปรหลักที่มีนัยสำคัญล่าสุดประจำรอบการทำครั้งล่าสุด */}
            <div className="rounded-2xl bg-[#F5F0FF] p-5 border border-purple-100 shadow-3xs transition-all hover:scale-[1.005]">
              <div className="text-xs text-[#432C81]/70 font-semibold uppercase tracking-wider">คะแนนแบบประเมินครั้งล่าสุด</div>
              <div className="text-2xl font-semibold text-[#432C81] mt-3 flex items-baseline gap-1">
                {summaryStats.totalCount > 0 ? summaryStats.latestScore : "-"} <span className="text-xs font-normal text-gray-400">คะแนน</span>
              </div>
            </div>
            
            {/* การ์ดช่องที่ 3: สรุปทิศทางแนวโน้มการเปลี่ยนแปลงของระดับชั้นคะแนนประเมินปัจจุบันเปรียบเทียบกับครั้งก่อนหน้าในอดีต */}
            <div className="rounded-2xl bg-[#FFFBF0] p-5 border border-yellow-100 shadow-3xs transition-all hover:scale-[1.005]">
              <div className="text-xs text-[#432C81]/70 font-semibold uppercase tracking-wider">แนวโน้มผลสถิติสุขภาพใจ</div>
              <div className="text-base font-semibold text-[#432C81] mt-3.5 flex items-center gap-1.5">
                {summaryStats.trendDirection === "none" && <span className="text-gray-400 font-semibold text-sm">ยังไม่มีข้อมูลเปรียบเทียบเพียงพอ</span>}
                {summaryStats.trendDirection === "up" && <span className="text-red-500 font-semibold flex items-center gap-1">↗️ มีสถิติแนวโน้มคะแนนสูงขึ้น</span>}
                {summaryStats.trendDirection === "down" && <span className="text-green-600 font-semibold flex items-center gap-1">↘️ สุขภาพใจดีขึ้น คะแนนลดลง</span>}
                {summaryStats.trendDirection === "same" && <span className="text-blue-500 font-semibold flex items-center gap-1">➡️ คะแนนรวมคงที่เท่าเดิม</span>}
              </div>
            </div>

          </div>

          {/* =========================================================================
              📊 2) GRAPH TRENDS DISPLAY (กล่องวาดแผงกราฟแนวโน้มคะแนนจากจำนวนครั้งสไตล์โค้งมนละมุนตา Pure SVG)
              ========================================================================= */}
          {chartPointsData.length >= 2 && ( // กราฟเส้นแนวโน้มความชันจะเปิดฉากเรนเดอร์ทำสัญญานโชว์ตัวเมื่อระบบตรวจเช็กพบประวัติขั้นต่ำ 2 ครั้งขึ้นไปเท่านั้น
            <div className="mt-6 rounded-3xl border border-purple-100/70 bg-[#FAF9FE] p-5">
              <h3 className="text-xs font-semibold text-[#432C81] mb-4">📈 กราฟเส้นแสดงแนวโน้มความลาดชันคะแนนดิบประมวลผลจากจำนวนครั้งการทำประเมินจริง</h3>
              
              {/* ตู้กระจกโครงสร้างกรอบกราฟ ขึงตาราง Grid แดชนำสายตาบางๆ ด้านหลังสุด */}
              <div className="relative w-full h-56 bg-white rounded-2xl border border-gray-100 p-4 flex items-end justify-between overflow-hidden">
                <div className="absolute inset-x-0 top-1/4 border-b border-gray-100 border-dashed w-full"></div>
                <div className="absolute inset-x-0 top-2/4 border-b border-gray-100 border-dashed w-full"></div>
                <div className="absolute inset-x-0 top-3/4 border-b border-gray-100 border-dashed w-full"></div>

                {/* ตัวบอร์ดกระดาน SVG Engine หลัก วาดรูปความชันแบบเส้นตรงโค้งมนด้วยสมการ Bezier */}
                <svg className="w-full h-full" style={{ overflow: 'visible' }}>
                  {/* เมทริกซ์นิยามตัวแปร: สั่งทำสีเงาสะท้อนโปร่งแสง Gradient สีม่วงละลายจางลงไปด้านล่างพื้นหลัง */}
                  <defs>
                    <linearGradient id="historyTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#432C81" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#432C81" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const totalPoints = chartPointsData.length; // จำนวนจุดทั้งหมดที่มีนัยสำคัญบนกระดานกราฟ
                    
                    // คำนวณกระจายค่าพิกัดจุดพลอตแต่ละอันออกมาในรูปตัวเลขดิบ (0-100) เพื่อป้องกันตัวอักษรร้อยละฉีกขาดออกจากแกนเส้นตรงสโลป
                    const points = chartPointsData.map((d, i) => {
                      const x = totalPoints > 1 ? 10 + (i / (totalPoints - 1)) * 80 : 50; // กระจายพิกัดแนวนอนแกน X ให้เว้นช่องไฟห่างเท่าๆ กัน
                      const y = 80 - (d.scoreValue / d.maxScale) * 65; // แมปค่าความสูงแกนตั้ง Y ผันแปรตามสัดส่วนแต้มจริงเทียบยอดเต็มเพดานสูงสุดของฟอร์มตัวนั้น
                      return { ...d, x, y };
                    });

                    let linePathString = ""; // ตั้งต้นสายอักขระเส้นขอบกราฟหลักเป็นค่าว่างเปล่า
                    let areaPathString = ""; // ตั้งต้นสายอักขระถมสีเงาใต้พื้นที่เป็นค่าว่างเปล่า

                    if (points.length > 0) { // ประกอบคำสั่งพิกัด SVG Path ลากโยงจุดจากอดีตมุ่งหน้ากวาดความชันยาวมาหาปัจจุบันทางด้านขวา
                      linePathString = `M ${points[0].x}% ${points[0].y}%`; // ปักหมุดพิกัดเริ่มต้นที่จุดแรกสุดในอดีต (จุดที่ 1 ซ้ายสุด)
                      for (let i = 0; i < points.length - 1; i++) {
                        const p0 = points[i]; // พิกัดจุดต้นทางตัวแปรปัจจุบัน
                        const p1 = points[i + 1]; // พิกัดจุดปลายทางตัวแปรถัดไปในอนุกรมเวลา
                        // คำนวณหาสมการควบคุมองศาดัดโค้งดึงระนาบเส้นกราฟให้มีความสมูทโค้งลาดเอียงพลิ้วไหวอย่างมีมิติสากล (Smooth Control Factor = 0.4)
                        const cpX1 = p0.x + (p1.x - p0.x) * 0.4;
                        const cpY1 = p0.y;
                        const cpX2 = p0.x + (p1.x - p0.x) * 0.6;
                        const cpY2 = p1.y;
                        
                        // ถักทอท่อสัญญานคำสั่งวาดความชัน C (Cubic Bezier) ถอดแบบสเปกความพรีเมียมจากวิดีโออ้างอิงเป๊ะๆ
                        linePathString += ` C ${cpX1}% ${cpY1}%, ${cpX2}% ${cpY2}%, ${p1.x}% ${p1.y}%`;
                      }
                      // ร่างขอบพิกัดถมปิดแกนล่างสุดของกระดานเพื่อเตรียมปูเฉดเงาสีพาสเทลม่วงให้เต็มกรอบความสูงอย่างเนียนตา
                      areaPathString = `${linePathString} L ${points[points.length - 1].x}% 85% L ${points[0].x}% 85% Z`;
                    }

                    return (
                      <>
                        {/* ปูเฉดถมพื้นเงาสะท้อนโปร่งแสงใต้เส้นลาดเอียงความลาดชันความความชันกราฟ (Area Gradient Color Layer) */}
                        {points.length > 1 && <path d={areaPathString} fill="url(#historyTrendGradient)" />}
                        {/* ลากโครงเส้นสัญญานแนวโน้มขอบหลักสีม่วงเข้มตัดมุมสมูทโค้งมนละมุนสายตา (Curved Stroke Path Line) */}
                        {points.length > 1 && <path d={linePathString} fill="none" stroke="#432C81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                        
                        {/* ลูปเรนเดอร์พล็อตหัวจุดกลมประจํารอบ พร้อมตอกป้ายสรุปยอดตัวเลขคะแนนกำกับเหนือกราฟเส้นสโลปคุมระนาบ font-semibold */}
                        {points.map((p, i) => (
                          <g key={i}>
                            {/* พล็อตหัวจุดวงกลมสีหลักตัดพิกัด */}
                            <circle cx={`${p.x}%`} cy={`${p.y}%`} r="4.5" fill="#432C81" />
                            {/* ป้ายตัวหนังสือข้อความสรุปคะแนนดิบสะสมรายข้อเหนือหัวจุดพิกัดเส้นโค้ง */}
                            <text x={`${p.x}%`} y={`calc(${p.y}% - 12px)`} textAnchor="middle" className="text-[10px] font-semibold fill-[#432C81]">
                              {p.scoreValue} คะแนน
                            </text>
                            {/* ป้ายพิมพ์ระบุข้อความสลักหมายเลขครั้งที่ ใต้ฐานขอบแนวรากแกนระนาบด้านล่างสุดของตารางกราฟ */}
                            <text x={`${p.x}%`} y="106%" textAnchor="middle" className="text-[9px] fill-gray-400 font-semibold">
                              ครั้งที่ {p.roundLabel}
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

          {/* ========================================================
              ⏱️ 3) NEW HISTORY TIMELINE LIST ACCORDION (กล่องข้อความควบแน่นเป็นก้อนของครั้งที่ทำ กางดูรายละเอียด 2Q -> 9Q -> 8Q)
              ======================================================== */}
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-[#432C81] mb-4">⏱️ บันทึกประวัติการคัดกรองสุขภาพจิตอย่างละเอียดแยกรายรอบการประเมิน</h3>
            
            {/* กล่องตรวจสอบสลักสลับดักม่านสายตากรณีรอซิงค์เครือข่าย หรือกรณีคลังประวัติตาราง MySQL ว่างเปล่าสมบูรณ์ */}
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
                  // แปลงรูปข้อความวันเวลาแสตมป์ของรอบดังกล่าวให้ออกมาเป็นภาษาไทยสรุปอ่านง่าย ชัดเจน มินิมอล
                  const dateLabel = new Date(session.timestamp).toLocaleString("th-TH", {
                    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
                  });

                  const isExpanded = !!expandedSessions[session.id]; // แปลงคีย์ไอดีของรอบดังกล่าวให้สลักค่าบูลีนควบคุมเอฟเฟกต์การสไลด์เปิดกางดูผลลัพธ์ย่อยด้านใน
                  const currentRoundNumber = groupedSessions.length - index; // ตัวเลขระบุสลักจำนวน "ครั้งที่ X" ไล่เรียงจากอดีตขึ้นหาปัจจุบันตัวหนาคมชัดพอดีสายตา

                  // ดึงข้อความสรุปเกณฑ์ระดับอาการจากฟอร์มที่มีลำดับความเสี่ยงสูงสุดประดับไว้เหนือขอบหัวข้อหลัก (8q > 9q > 2q)
                  const topResultHeadlineText = session.forms['8q'] ? session.forms['8q'].result_text 
                                      : (session.forms['9q'] ? session.forms['9q'].result_text 
                                      : session.forms['2q']?.result_text || "คัดกรองเสร็จสิ้นขั้นตอน");

                  // 📐 DATA MAPPING SYNTAX FIX: ล้างโมเดลลูกศรฟังก์ชันผิดหลัก JSX ออกไป รังสรรค์การจับคู่ประเภท 2q, 9q, 8q เข้ากรอบป้ายเท่ๆ สวยงาม
                  const activeOrderSequence = ["2q", "9q", "8q"];
                  const combinedPathLabels = activeOrderSequence
                    .filter(key => !!session.forms[key]) // ดึงเอาเฉพาะฟอร์มรหัสตัวที่มีก้อน Object ข้อมูลจริงพ่วงในรอบเวลานั้นๆ
                    .map(key => key.toUpperCase()) // แปลงถ้อยคำสายอักขระให้เป็นตัวอักษรพิมพ์ใหญ่เด่นชัด
                    .join(", "); // ผูกมัดด้วยเครื่องหมายจุลภาคคั่นจัด Whitespace คลีนๆ

                  return (
                    <div 
                      key={session.id} 
                      className="rounded-2xl border border-gray-100 bg-[#FAF9FE] shadow-sm overflow-hidden transition-all duration-200"
                    >
                      {/* 📐 ACCORDION TRIGGER HEADER ROW: แถวกรอบปุ่มกดสั่งกาง/ปิดรายละเอียดรอบ คุมน้ำหนักอักษรเป็น font-semibold เสมอกันทั้งหน้าจอเพจ */}
                      <button 
                        onClick={() => toggleSession(session.id)} // สั่งคลี่ขยายโครงสร้างหรือพับเก็บกล่องตารางคะแนนย่อยภายในเมื่อเกิดสถานการณ์คลิกจิ้มปุ่มแถว
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-[#F2EEFE] transition-colors cursor-pointer"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                          {/* บรรทัดบนสุด: สลักพิมพ์ข้อความชื่อ "ครั้งที่ X: [ผลเกณฑ์วินิจฉัยทางการแพทย์สูงสุดประจำรอบ]" น้ำหนักตัวอักษรระดับ font-semibold คลีนตา */}
                          <div className="text-sm sm:text-base font-semibold text-[#432C81] tracking-tight truncate">
                            ครั้งที่ {currentRoundNumber}: {topResultHeadlineText}
                          </div>
                          {/* บรรทัดล่างสุด: แจ้งป้ายแท็กชุดเส้นทางเดินเอกสารแบบประเมินย่อยที่คนไข้ได้ทำจริงประจำครั้ง พร้อมวันเวลากำกับละเอียด */}
                          <div className="text-xs text-gray-400 font-semibold flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[#432C81]/80">ชุดเส้นทางแบบประเมิน ({combinedPathLabels || "9Q"})</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-400">{dateLabel} น.</span>
                          </div>
                        </div>

                        {/* ปุ่มทิศทางบอกสถานะควบคุมนำสายตาฝั่งขวามือเรียบง่ายสไตล์มินิมอล */}
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#432C81] shrink-0">
                          <span>{isExpanded ? "ซ่อนรายละเอียด" : "ดูผลลัพธ์รายข้อ"}</span>
                          <span className={`inline-block transform transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}>➔</span>
                        </div>
                      </button>

                      {/* =========================================================================
                          📐 SLIDE DRAWER ANALYSIS COMPONENT (กางแผงรายงาน แสดงประวัติไล่ลำดับตั้งแต่ 2Q ➔ 9Q ➔ 8Q ลงมาเป็นแผงชุดอย่างโปร่งตา ชัดเจน)
                          ========================================================================= */}
                      {isExpanded && ( // บล็อกกางแผงคอนเทนต์ข้อมูลรายข้อภายในจะสไลด์เลื่อนตัวเรนเดอร์พ่นค่าออกมาโชว์เมื่อสถานะบูลีนคอยดักเป็นบวก
                        <div className="border-t bg-white p-5 space-y-5 animate-fade-in text-xs">
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">📄 บันทึกรายละเอียดข้อมูลผลคะแนนดิบและข้อคำตอบแยกตามประเภทแบบฟอร์มประจำครั้งนี้</div>

                          {/* 🟢 STEP 1: เรนเดอร์กล่องรายงานสรุปประวัติผลคะแนนดิบและชุดช้อยส์คำตอบของ ฟอร์มคัดกรองเบื้องต้น 2Q (หากรอบนั้นมีการทำจริง) */}
                          {session.forms['2q'] && (
                            <div className="p-4 rounded-xl bg-green-50/40 border border-green-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-green-500 text-white font-semibold text-[9px] px-2 py-0.5 rounded shadow-3xs">2Q</span>
                                <span className="font-semibold text-[#432C81]">{CONFIG['2q'].title}</span>
                                <span className="ml-auto font-semibold text-green-700">คะแนนรวมสะสม: {session.forms['2q'].score} / {CONFIG['2q'].max} แต้ม</span>
                              </div>
                              <p className="text-gray-600 font-medium">ผลวิเคราะห์วินิจฉัยทางการแพทย์เบื้องต้น: <span className="text-green-600 font-semibold">{session.forms['2q'].result_text}</span></p>
                              
                              {/* กางตารางกล่องเล็กย่อย สรุปผลแต้มคำตอบรายข้อที่คนไข้คีย์เลือกจิ้มปุ่มตอบไว้ภายในฟอร์ม 2Q */}
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

                          {/* 🟣 STEP 2: เรนเดอร์กล่องรายงานสรุปแต้มคะแนนดิบและชุดช้อยส์คำตอบของ ฟอร์มโรคซึมเศร้ามาตรฐาน 9Q (หากรอบนั้นมีการทำจริง) */}
                          {session.forms['9q'] && (
                            <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-purple-500 text-white font-semibold text-[9px] px-2 py-0.5 rounded shadow-3xs">9Q</span>
                                <span className="font-semibold text-[#432C81]">{CONFIG['9q'].title}</span>
                                <span className="ml-auto font-semibold text-purple-700">คะแนนรวมสะสม: {session.forms['9q'].score} / {CONFIG['9q'].max} แต้ม</span>
                              </div>
                              <p className="text-gray-600 font-medium">ระดับระดับเกณฑ์ภาวะซึมเศร้า: <span className="text-purple-700 font-semibold">{session.forms['9q'].result_text}</span></p>
                              {/* กล่องถ้อยคำชี้แนะหรือมาตรการดูแลปรับพฤติกรรมจากจิตแพทย์ประจำระดับอาการของฟอร์ม 9Q */}
                              {session.forms['9q'].recommended && (
                                <p className="text-[11px] text-gray-500 bg-white/60 p-2.5 rounded-lg border border-purple-50/60 leading-relaxed"><span className="font-semibold text-purple-900">💡 แนวทางคำแนะนำแพทย์ประจำตัว:</span> {session.forms['9q'].recommended}</p>
                              )}
                              
                              {/* กางตาราง Grid บล็อกเล็กแจกแจงสถิติแต้มตัวเลขคะแนนแยกย่อยละเอียดครบถ้วนทั้ง 9 ข้อคำถามของฟอร์ม 9Q */}
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

                          {/* 🔴 STEP 3: เรนเดอร์กล่องรายงานสรุปแต้มคะแนนดิบและชุดช้อยส์คำตอบของ ฟอร์มเฝ้าระวังฆ่าตัวตายวิกฤตอันตราย 8Q (หากรอบนั้นมีการทำจริง) */}
                          {session.forms['8q'] && (
                            <div className="p-4 rounded-xl bg-red-50/40 border border-red-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-red-500 text-white font-semibold text-[9px] px-2 py-0.5 rounded shadow-3xs">8Q</span>
                                <span className="font-semibold text-[#432C81]">{CONFIG['8q'].title}</span>
                                <span className="ml-auto font-semibold text-red-600">คะแนนรวมสะสม: {session.forms['8q'].score} / {CONFIG['8q'].max} แต้ม</span>
                              </div>
                              <p className="text-gray-600 font-medium">เกณฑ์ระดับเฝ้าระวังอันตรายฆ่าตัวตาย: <span className="text-red-600 font-semibold">{session.forms['8q'].result_text}</span></p>
                              {/* สายด่วนฉุกเฉินหรือมาตรการแทรกแซงส่งตัวด่วนทางการแพทย์กรณีคนไข้เกิดวิกฤตทางอารมณ์รุนแรงในฟอร์ม 8Q */}
                              {session.forms['8q'].recommended && (
                                <p className="text-[11px] text-red-700 bg-white/60 p-2.5 rounded-lg border border-red-50 font-semibold leading-relaxed">⚠️ มาตรการดูแลเร่งด่วนฉุกเฉิน: {session.forms['8q'].recommended}</p>
                              )}
                              
                              {/* กางตาราง Grid บล็อกสรุปแต้มตัวเลขคะแนนรายข้อคำตอบย่อยอย่างละเอียดครบครันทั้ง 8 ข้อของฟอร์ม 8Q */}
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