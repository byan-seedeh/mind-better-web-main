import httpClient from "./httpClient";

/**
 * @description 🧠 UNIFIED ASSESSMENT SAVE SERVICE: เปลี่ยนผ่านจากการเซฟทับพาร์ท phq9 เดิม มารวมศูนย์ส่งก้อน Payload เข้าหาเครื่องยนต์จัดเก็บแบบแยกแถวใหม่ทุกครั้ง (Insert แยกเรคคอร์ด)
 */
export const savePhq9 = async (payload) => {
  // เปลี่ยนทิศทางจาก "/api/phq9/save" มารับส่งข้อมูลผ่าน Endpoint เส้นจริงของระบบคือ "/api/assessment/save"
  const res = await httpClient.post("/api/assessment/save", payload);
  return res.data;
};