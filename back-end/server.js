// นำเข้าโมดูล Express สำหรับสร้างระบบ RESTful API Server หลังบ้าน
const express = require('express');
// ประกาศอินสแตนซ์ของ Express Application เพื่อใช้งานฟังก์ชันควบคุมเส้นทางเดินของข้อมูล
const app = express();
// นำเข้าโมดูล Body-Parser สำหรับแปลงโครงสร้างข้อมูลที่ส่งมาจากหน้าบ้านใน Request Body
const bodyParser = require('body-parser');
// นำเข้าโมดูล CORS เพื่อปลดล็อกการสิทธิ์เข้าถึงข้ามโดเมนระหว่างพอร์ตหน้าบ้านและหลังบ้าน
const cors = require("cors");
// นำเข้าโมดูล MySQL สำหรับติดต่อสั่งการและคิวรีข้อมูลในระบบฐานข้อมูลเชิงสัมพันธ์
const mysql = require('mysql');
// นำเข้าโมดูล MD5 สำหรับใช้แฮชรหัสผ่านเพื่อความปลอดภัยในการจัดเก็บลงตารางข้อมูล
const md5 = require('md5');

// 🔤 VARIABLE CLEANING: สกัดค่า Fixed Code/ตัวเลข/ข้อความระบบ ออกเป็น Configuration Object ส่วนกลาง
const CONFIG = {
    // กำหนดพอร์ตในการรันระบบผ่าน Environment Variables หรือใช้พอร์ต 8080 เป็นค่าเริ่มต้น
    PORT: process.env.PORT || 8080,
    // กำหนดจำนวนท่อเชื่อมต่อฐานข้อมูลสูงสุดในคลัง Pool สำหรับบริหารจัดการทรัพยากร
    DB_POOL_LIMIT: 10,
    // กำหนดโฮสต์ปลายทางของเซิร์ฟเวอร์ฐานข้อมูล
    DB_HOST: process.env.DB_HOST || 'localhost',
    // กำหนดชื่อผู้ใช้งานในการเข้าถึงระบบฐานข้อมูล MySQL
    DB_USER: process.env.DB_USER || 'root',
    // กำหนดรหัสผ่านในการเข้าถึงฐานข้อมูล
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    // กำหนดชื่อฐานข้อมูลหลักที่แอปพลิเคชันเชื่อมต่อใช้งาน
    DB_NAME: process.env.DB_NAME || 'mindbetter',
    // กำหนดค่า Role ID เริ่มต้นสำหรับกลุ่มผู้ใช้งานทั่วไปที่ทำการลงทะเบียนสมาชิกใหม่
    DEFAULT_ROLE_ID: 2,
    // กำหนดชื่อสิทธิ์เริ่มต้นของบัญชีผู้ใช้ทั่วไป
    DEFAULT_ROLE_NAME: 'user'
};

// ❓ WORKFLOW METRIC TOKENS: แปลงเกณฑ์คะแนนทางการแพทย์ที่เป็นตัวเลข Fixed ทั้งหมดให้เป็นค่าคงที่ส่วนกลาง
const SCORE_THRESHOLDS = {
    // เกณฑ์คะแนนขั้นต่ำในการตรวจพบความเสี่ยงฟอร์มย่อ 2Q (ถ้ามีข้อใดข้อหนึ่งมากกว่า 0 ถือว่าเสี่ยง)
    FORM_2Q_HAS_RISK: 0,
    // เกณฑ์คะแนนสูงสุดของสภาวะปกติในฟอร์มหลัก 9Q (ถ้าน้อยกว่า 7 คือปกติ)
    FORM_9Q_NORMAL: 7,
    // เกณฑ์คะแนนสูงสุดของภาวะซึมเศร้าระดับน้อยในฟอร์ม 9Q
    FORM_9Q_MILD: 12,
    // เกณฑ์คะแนนสูงสุดของภาวะซึมเศร้าระดับปานกลางในฟอร์ม 9Q
    FORM_9Q_MODERATE: 18,
    // เกณฑ์คะแนนสำหรับสภาวะไม่มีแนวโน้มทำร้ายตนเองในฟอร์ม 8Q
    FORM_8Q_NONE: 0,
    // เกณฑ์คะแนนสูงสุดของแนวโน้มทำร้ายตนเองระดับน้อยในฟอร์ม 8Q
    FORM_8Q_MILD: 8,
    // เกณฑ์คะแนนสูงสุดของแนวโน้มทำร้ายตนเองระดับปานกลางในฟอร์ม 8Q
    FORM_8Q_MODERATE: 16
};

// เปิดใช้งานคลาส CORS เพื่ออนุญาตให้ Next.js ฝั่งหน้าบ้านส่งคำขอข้ามพอร์ตมาคุยกับ API ได้
app.use(cors());
// เปิดฟังก์ชันแปลงรูปแบบข้อมูลจากฟอร์มประเภท URL-Encoded
app.use(bodyParser.urlencoded({ extended: false }));
// เปิดฟังก์ชันแปลงข้อมูลประเภท JSON Object ส่วนกลางให้กับระบบหลังบ้านทั้งหมด
app.use(bodyParser.json());

// เริ่มต้นสร้างระบบ Connection Pool ในการบริหารท่อส่งข้อมูลฐานข้อมูลเพื่อรองรับโหลดผู้ใช้พร้อมกัน
const pool = mysql.createPool({
    connectionLimit: CONFIG.DB_POOL_LIMIT, // ดึงจำนวนท่อเชื่อมต่อสูงสุดจากตัวแปรส่วนกลาง CONFIG
    host: CONFIG.DB_HOST,                 // ดึงตำแหน่งโฮสต์ฐานข้อมูลจาก Config
    user: CONFIG.DB_USER,                 // ดึงชื่อผู้ใช้ฐานข้อมูลจาก Config
    password: CONFIG.DB_PASSWORD,         // ดึงรหัสผ่านฐานข้อมูลจาก Config
    database: CONFIG.DB_NAME              // ดึงชื่อฐานข้อมูลเป้าหมายจาก Config
});

// ⏳ CONCURRENCY REFACTOR: สกัดการ Query แบบ Callback Hell มาเป็นรูปแบบ Promise เพื่อรองรับ Async/Await ให้สวยงาม
const dbQuery = (sql, params) => {
    // คืนค่าโครงสร้าง Promise สำหรับใช้ดักสถานะ Asynchronous ในกระบวนการทำงาน
    return new Promise((resolve, reject) => {
        // เรียกรันคำสั่งคิวรีข้อมูลผ่านระบบ Connection Pool
        pool.query(sql, params, (err, results) => {
            // ถ้าเกิดความผิดพลาดในระบบ SQL ให้ส่งสถานะ Reject ออกไปเพื่อตัดจบกระบวนการทำงาน
            if (err) return reject(err);
            // ถ้าคิวรีสำเร็จ ให้ส่งผลลัพธ์ข้อมูลกลับออกไปด้วยคำสั่ง Resolve
            resolve(results);
        });
    });
};

/**
 * @description 🧩 FUNCTION REFACTOR: ฟังก์ชันสมองกลประเมินระดับคะแนนตามหลัก Clinical Workflow และจัดเส้นทาง (Data Routing)
 */
function evaluateAssessment(code, totalScore, answers) {
    // แยกแยะตรรกะการคำนวณกรณีผู้ใช้ส่งผลคะแนนจากฟอร์มย่อ 2Q เข้ามาประมวลผล
    if (code === '2q') {
        // เช็กอาร์เรย์คำตอบรายข้อว่ามีข้อใดข้อหนึ่งตอบว่าเสี่ยง (> เกณฑ์ศูนย์) หรือไม่ด้วยคำสั่ง .some()
        const hasRisk = answers.some(score => Number(score) > SCORE_THRESHOLDS.FORM_2Q_HAS_RISK);
        // คืนค่าผลวิเคราะห์และระบุป้ายเส้นทางถัดไป (ถ้าเสี่ยงดีดไป 9q ทันที ถ้าปกติให้กลับหน้าหลัก home)
        return {
            result_text: hasRisk ? "เป็นผู้มีความเสี่ยง หรือมีแนวโน้มที่จะเป็นโรคซึมเศร้า" : "ปกติ ไม่เป็นโรคซึมเศร้า",
            recommended_action: hasRisk ? "ควรเข้ารับการประเมินต่อด้วยแบบประเมินโรคซึมเศร้า 9Q" : "ดูแลสุขภาพใจตามปกติ ประเมินซ้ำเมื่อจำเป็น",
            next_action: hasRisk ? "9q" : "home" 
        };
    }
    
    // แยกแยะตรรกะการคำนวณกรณีผู้ใช้ส่งผลคะแนนจากฟอร์มหลัก 9Q เข้ามาประมวลผล
    if (code === '9q') {
        // ประกาศตัวแปรรับข้อความระดับชั้นความรุนแรงสะสม
        let resultText = "";
        // ประกาศตัวแปรรับข้อความคำแนะนำของแพทย์ประจำระดับ
        let recommendedAction = "";
        // กำหนดสถานะเป้าหมายหน้าจอถัดไปเริ่มต้นให้วิ่งไปหน้าประวัติรวม (history)
        let nextAction = "history";
        
        // ตะแกรงคัดกรองขั้นที่ 1: คะแนนรวมน้อยกว่าเกณฑ์ปกติ (< 7 คะแนน)
        if (totalScore < SCORE_THRESHOLDS.FORM_9Q_NORMAL) {
            resultText = "ไม่มีอาการของโรคซึมเศร้าหรือมีอาการระดับน้อยมาก";
            recommendedAction = "ดูแลสุขภาพกายใจต่อเนื่อง นอนให้พอ ออกกำลังกาย และประเมินซ้ำเมื่อจำเป็น";
        // ตะแกรงคัดกรองขั้นที่ 2: มีอาการระดับน้อย (คะแนนอยู่ระหว่าง 7 - 12 คะแนน)
        } else if (totalScore <= SCORE_THRESHOLDS.FORM_9Q_MILD) {
            resultText = "มีอาการของโรคซึมเศร้า ระดับน้อย";
            recommendedAction = "ปรับพฤติกรรมการนอน-กิน พูดคุยกับคนใกล้ชิด และต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
            nextAction = "8q"; // 🔄 ปรับเปลี่ยนเส้นทางเดินเอกสาร (State Transition) บังคับให้หน้าบ้านพาผู้ใช้ไปทำฟอร์ม 8Q ต่อ
        // ตะแกรงคัดกรองขั้นที่ 3: มีอาการระดับปานกลาง (คะแนนอยู่ระหว่าง 13 - 18 คะแนน)
        } else if (totalScore <= SCORE_THRESHOLDS.FORM_9Q_MODERATE) {
            resultText = "มีอาการของโรคซึมเศร้า ระดับปานกลาง";
            recommendedAction = "ควรปรึกษาแพทย์/นักจิตวิทยา และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
            nextAction = "8q"; // สั่งคำสั่ง Routing บังคับดีดผู้ใช้ไปทำแบบประเมิน 8Q ต่อเนื่องทันที
        // ตะแกรงคัดกรองขั้นสุดท้าย: ตรวจพบภาวะซึมเศร้าระดับรุนแรงวิกฤต (ตั้งแต่ 19 คะแนนขึ้นไป)
        } else {
            resultText = "มีอาการของโรคซึมเศร้า ระดับรุนแรง";
            recommendedAction = "ควรพบแพทย์โดยเร็วที่สุด และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q ทันที";
            nextAction = "8q"; // บังคับเล็งท่อส่งตัวคนไข้เข้าสู่แบบประเมินเฝ้าระวัง 8Q ด่วนที่สุด
        }
        
        // คืนก้อน Object สรุปผลลัพธ์ทางการแพทย์ออกไปให้จุดบันทึก API
        return { result_text: resultText, recommended_action: recommendedAction, next_action: nextAction };
    }
    
    // แยกแยะตรรกะการคำนวณกรณีผู้ใช้ส่งผลคะแนนจากฟอร์มเฝ้าระวังฆ่าตัวตาย 8Q เข้ามาประมวลผล
    if (code === '8q') {
        // ประกาศตัวแปรรับข้อความสรุปสภาวะของ 8Q
        let resultText = "";
        // ประกาศตัวแปรรับถ้อยคำแนะนำมาตรการช่วยเหลือด่วนฉุกเฉิน
        let recommendedAction = "";
        
        // ระดับที่ 1: ปกติ คะแนนดิบสะสมเท่ากับ 0 พอดีเป๊ะ
        if (totalScore === SCORE_THRESHOLDS.FORM_8Q_NONE) {
            resultText = "ไม่มีแนวโน้มฆ่าตัวตายในปัจจุบัน";
            recommendedAction = "ติดตามดูแลอย่างต่อเนื่อง ประเมินซ้ำเมื่อสภาวะจิตใจเปลี่ยน";
        // ระดับที่ 2: มีแนวโน้มระดับน้อย (คะแนนอยู่ระหว่าง 1 - 8 คะแนน)
        } else if (totalScore <= SCORE_THRESHOLDS.FORM_8Q_MILD) {
            resultText = "มีแนวโน้มที่จะฆ่าตัวตายในปัจจุบัน ระดับน้อย";
            recommendedAction = "ควรให้การปรึกษาผ่อนคลายความเครียด ติดตามดูแลใกล้ชิด";
        // ระดับที่ 3: มีแนวโน้มระดับปานกลาง (คะแนนอยู่ระหว่าง 9 - 16 คะแนน)
        } else if (totalScore <= SCORE_THRESHOLDS.FORM_8Q_MODERATE) {
            resultText = "มีแนวโน้มที่จะฆ่าตัวตายในปัจจุบัน ระดับปานกลาง";
            recommendedAction = "ควรส่งพบแพทย์ นักจิตวิทยา หรือโทรสายด่วนสุขภาพจิต 1323 เพื่อวางแผนช่วยเหลือ";
        // ระดับสูงสุด: มีแนวโน้มระดับรุนแรงวิกฤตอันตราย (คะแนนดิบสะสมเกิน 16 คะแนนขึ้นไป)
        } else {
            resultText = "มีแนวโน้มที่จะฆ่าตัวตายในปัจจุบัน ระดับรุนแรง";
            recommendedAction = "⚠️ ต้องส่งต่อโรงพยาบาลที่มีจิตแพทย์ด่วนทันที หรือติดต่อสายด่วน 1669 ห้ามปล่อยให้อยู่คนเดียว";
        }
        
        // คืนค่าผลลัพธ์และล็อกเป้าหมายปลายทางสุดท้ายให้พายูสเซอร์กลับไปที่หน้าแสดงประวัติรวม (history)
        return { result_text: resultText, recommended_action: recommendedAction, next_action: "history" };
    }
    
    // คืนค่าสำรองกรณีฉุกเฉินถ้ารหัสแบบประเมินไม่ตรงตัวใดเลย ป้องกันระบบหยุดทำงาน
    return { result_text: "ทำแบบประเมินสำเร็จ", recommended_action: "-", next_action: "history" };
}

// ========================================================
// ⚡ RESTful API ENDPOINTS (Async/Await & Try-Catch Engine)
// ========================================================

// 🚨 ERROR HANDLING & CONCURRENCY: จัดการระบบเข้าสู่ระบบให้ปลอดภัย คลีน และรันงานเส้นตรง
app.post("/api/login", async (req, res) => {
    // ใช้บล็อก try ครอบลอจิกการทำงานหลักเพื่อดักฟังและจับ Error ระหว่างประมวลผล
    try {
        // แกะสกัดข้อมูลตัวแปร email และ password ออกมาจากโครงสร้าง Request Body ที่ส่งมา
        const { email, password } = req.body;
        // ทำการเข้ารหัสผ่านรหัสดิบด้วยลอจิกแฮชความปลอดภัยประเภท MD5 เพื่อเตรียมนำไปเช็กในตาราง
        const hashedPassword = md5(password);
        // เขียนคำสั่ง SQL Query แบบผูกตัวแปร Placeholder (?) ป้องกันช่องโหว่ SQL Injection เด็ดขาด
        const sql = "SELECT * FROM users WHERE email = ? AND password_hash = ?";
        
        // ⏳ สั่งรอคำสั่งคิวรีข้อมูลแบบ Asynchronous สั่งหยุดรอผลลัพธ์ผ่านคำสั่ง await โค้ดรันโปร่งใสอ่านง่าย
        const results = await dbQuery(sql, [email, hashedPassword]);
        
        // ดักเช็กข้อมูล: หากคลังตารางค้นหาแล้วไม่พบข้อมูลผู้ใช้รายนี้อยู่เลย (ความยาวอาเรย์เท่ากับ 0)
        if (results.length === 0) {
            // ส่งผลลัพธ์การล็อกอินเป็นเท็จ และส่งคำแจ้งเตือนกลับหน้าบ้านทันทีแบบตัดจบการทำงาน
            return res.json({ result: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

        // ดึงแถวข้อมูลโปรไฟล์ผู้ใช้งานลำดับแรกสุดออกมาบรรจุในตัวแปรยูสเซอร์
        const user = results[0];
        // คืนก้อนข้อมูลโปรไฟล์ที่จำเป็นกลับออกไปให้ Frontend นำไปใช้จดจำเซสชันการเข้าสู่ระบบ
        res.json({
            result: true,
            data: {
                user_id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role_id: user.role_id,
                role_name: user.role_name
            }
        });
    // ดักจับเคสฉุกเฉินกรณีเซิร์ฟเวอร์ฐานข้อมูลขัดข้องทางเทคนิคหรือเน็ตเวิร์กขาดหาย
    } catch (err) {
        // ส่งสถานะ HTTP 500 (Internal Server Error) กลับไปแจ้งหน้าบ้านอย่างมีมาตรฐานสากล
        res.status(500).json({ result: false, message: "ระบบฐานข้อมูลหลังบ้านขัดข้อง: " + err.message });
    }
});

// ปรับปรุงฟังก์ชันระบบลงทะเบียนสมัครสมาชิกใหม่ให้เป็นแบบ Asynchronous พร้อมตรวจสอบดักข้อผิดพลาดละเอียดยิบ
app.post("/api/signup", async (req, res) => {
    try {
        // แกะตัวแปรพารามิเตอร์การสมัครทั้งหมดออกมาจาก Request Body ของระบบหน้าบ้าน
        const { username, first_name, last_name, email, password } = req.body;
      
        // ด่านคัดกรองความสมบูรณ์: หากตรวจพบว่ามีช่องข้อมูลตัวใดตัวหนึ่งลืมคีย์หรือถูกปล่อยว่างไว้
        if (!username || !first_name || !last_name || !email || !password) {
            // สั่งหยุดระบบและส่งคำเตือนเด้งกลับหน้าบ้านทันที (Guard Clause Pattern)
            return res.json({ result: false, message: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" });
        }
      
        // ด่านคัดกรองความซ้ำซ้อน: เขียนคำสั่ง SQL ยิงไปตรวจดูว่ามีใครชิงใช้อีเมลหรือชื่อบัญชีนี้ไปก่อนแล้วหรือไม่
        const checkSql = "SELECT id FROM users WHERE email = ? OR username = ?";
        // สั่งรันคำสั่งเช็กและหยุดรอผลลัพธ์ข้อมูลแบบเหลื่อมเวลา Asynchronous
        const checkResults = await dbQuery(checkSql, [email, username]);
        
        // หากผลลัพธ์ระบุว่าเจอแถวซ้ำ (ความยาวอาเรย์มากกว่า 0)
        if (checkResults.length > 0) {
            // สั่งปฏิเสธการลงทะเบียนและส่งข้อความแจ้งเตือนกลับหน้าบ้านเพื่อความปลอดภัยของระบบ ข้อมูลไม่ปนกัน
            return res.json({ result: false, message: "อีเมลหรือชื่อผู้ใช้งานนี้ถูกใช้ในระบบแล้ว" });
        }
      
        // นำรหัสผ่านดิบที่ผ่านด่านตรวจสอบความปลอดภัยแล้ว มาทำการเข้าลอจิกแฮชตัวเลขด้วยระบบ MD5
        const hashedPassword = md5(password);
        // เขียนคำสั่ง SQL คำสั่ง INSERT สำหรับบรรจุข้อมูลผู้ใช้งานรายใหม่ลงตารางฐานข้อมูลผู้ใช้
        const insertSql = `
            INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, role_name) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        // สั่งเซฟข้อมูลสมาชิกใหม่ลงตาราง MySQL โดยดึงสิทธิ์และบทบาทเริ่มต้นมาจากตัวแปร CONFIG
        await dbQuery(insertSql, [
            username, 
            hashedPassword, 
            first_name, 
            last_name, 
            email, 
            CONFIG.DEFAULT_ROLE_ID, 
            CONFIG.DEFAULT_ROLE_NAME
        ]);
            
        // ส่งคำตอบรับสำเร็จแจ้งหน้าบ้านว่าบันทึกสมาชิกใหม่บรรจุลงระบบ MySQL เรียบร้อยแล้ว
        res.json({ result: true, message: "สมัครสมาชิกสำเร็จเรียบร้อยแล้ว!" });
    } catch (err) {
        // ดักจับข้อผิดพลาดกรณีโครงสร้างคิวรีขัดข้องและส่งรายงานกลับหน้าบ้านในรูปแบบมาตรฐาน
        res.status(500).json({ result: false, message: "เกิดข้อผิดพลาดในการลงทะเบียนฐานข้อมูล: " + err.message });
    }
});

// เส้นทาง API สำหรับดึงข้อคำถามและจับคู่สร้างช้อยส์คะแนนแบบไดนามิกจำแนกตามรหัส Code ฟอร์ม
app.get("/api/assessment/form/:code", async (req, res) => {
    try {
        // ดึงรหัสพารามิเตอร์รหัสแบบประเมิน (เช่น 2q, 9q) ออกมาจากเส้นทางระบบ URL Path
        const code = req.params.code;
        // เขียนคำสั่ง Query เชื่อมสองตารางเพื่อคัดกรองเนื้อหาคำถามย่อยเรียงลำดับข้อจาก 1 ขึ้นไป
        const sql = `
            SELECT q.id, q.question_number, q.question_text 
            FROM assessment_questions q
            JOIN assessments a ON q.assessment_id = a.id
            WHERE a.code = ?
            ORDER BY q.question_number ASC
        `;
        
        // สั่งดึงข้อมูลคำถามย่อยทั้งหมดมาจากตาราง MySQL แบบ Asynchronous
        const questions = await dbQuery(sql, [code]);
        
        // 5. อื่นๆ (DESIGN PATTERN): ใช้เทคนิค Object Mapping จัดคลังตัวเลือกแทนการเขียนสวิตช์เงื่อนไขยาวรุงรัง
        const choicesMap = {
            '2q': [{ choice_text: "ไม่มี", score: 0 }, { choice_text: "มี", score: 1 }],
            '8q': [{ choice_text: "ไม่มี", score: 0 }, { choice_text: "มี", score: 1 }],
            'default': [
                { choice_text: "ไม่มีเลย", score: 0 },
                { choice_text: "เป็นบางวัน (1-7 วัน)", score: 1 },
                { choice_text: "เป็นบ่อย (> 7 วัน)", score: 2 },
                { choice_text: "เป็นทุกวัน", score: 3 }
            ]
        };
        
        // ทำการคัดกรองช้อยส์ตามรหัสฟอร์ม หากไม่เข้าเงื่อนไขใดเลยให้ดึงตัวเลือกมาตรฐาน 'default' มาใช้งาน
        const choices = choicesMap[code] || choicesMap['default'];
                  
        // ส่งก้อนคำถามย่อยและช้อยส์คะแนนกลับออกไปให้หน้าบ้านนำไปวาดหน้าจอทำแบบทดสอบ
        res.json({ result: true, data: { questions, choices } });
    } catch (err) {
        // แจ้งเตือนสถานะความล้มเหลวกรณีดึงฟอร์มคำถามย่อยไม่สำเร็จ
        res.status(500).json({ result: false, message: "ดึงข้อมูลโครงสร้างคำถามล้มเหลว: " + err.message });
    }
});

// เส้นทาง API สำหรับประมวลผลสรุปคะแนนดิบและแยกบันทึกข้อมูลสัมพันธ์ลงตารางแม่และตารางลูกอย่างมีประสิทธิภาพ
app.post("/api/assessment/save", async (req, res) => {
    try {
        // แกะตัวแปรพารามิเตอร์ไอดีผู้ทำ รหัสฟอร์ม และอาเรย์ชุดคำตอบออกมาจาก Request Body
        const { user_id, assessment_code, answers } = req.body; 

        // ดักจับพารามิเตอร์ตกหล่น: หากตรวจพบว่าก้อนข้อมูลตัวใดตัวหนึ่งลืมแนบส่งมา
        if (!user_id || !assessment_code || !answers) {
            // สั่งหยุดทำงานและตอบกลับปฏิเสธข้อมูลกระบวนการทันที ป้องกันตรรกะระบบขัดข้อง
            return res.json({ result: false, message: "ข้อมูล Payload ไม่ครบถ้วน" });
        }

        // ยิงคำสั่งอ่านไอดี Primary Key ของแบบประเมินชุดดังกล่าวออกมาจากตารางผูกหัวข้อ
        const searchRes = await dbQuery("SELECT id FROM assessments WHERE code = ?", [assessment_code]);
        // Guard Clause: เช็กความมีอยู่ของหัวข้อ หากไม่มีในตารางฐานข้อมูลหลักให้ดีดแจ้งเตือนตัดจบงาน
        if (searchRes.length === 0) return res.json({ result: false, message: "ไม่พบประเภทแบบประเมินนี้" });
        
        // สกัดดึงรหัสไอดีหลักของแบบประเมินเก็บไว้ในตัวแปรเฉพาะ
        const assessmentId = searchRes[0].id;
        // ทำการรวบรวมและคำนวณยอดอาเรย์ชุดคะแนนคำตอบสะสมรวมทั้งหมดให้เป็นตัวเลขก้อนเดียวด้วยคำสั่ง .reduce()
        const total_score = answers.reduce((sum, score) => sum + Number(score), 0);
        // สั่งให้กลไก Workflowประเมินและตัดสินใจตัดเกณฑ์คะแนนพร้อมระบุหน้าจอถัดไป (next_action)
        const evaluation = evaluateAssessment(assessment_code, total_score, answers);
        
        // เตรียมคำสั่ง SQL บันทึกข้อมูลสรุปภาพรวมลงตารางแม่หลัก (Master Record)
        const sqlInsertResult = "INSERT INTO assessment_results (user_id, assessment_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?, ?)";
        // ส่งบันทึกข้อมูลลงตารางแม่ และรอรับก้อนข้อมูลยืนยันไอดีรอบจากระบบ MySQL ออโต้รัน
        const resultObj = await dbQuery(sqlInsertResult, [user_id, assessmentId, total_score, evaluation.result_text, evaluation.recommended_action]);
        
        // ยึดไอดีรอบการทำที่ฐานข้อมูลรันและส่งกลับมาสดๆ นำมาตั้งเป็น Foreign Key เชื่อมสัมพันธ์ความสัมพันธ์
        const resultId = resultObj.insertId;
        // นำฟังก์ชัน .map() แปลงอาเรย์คำตอบดิบรายข้อให้กลายเป็นอาเรย์ 2 มิติเพื่อใช้ยิงแบบกลุ่มประสิทธิภาพสูง
        const values = answers.map((score, index) => [resultId, index + 1, score]);
        // เขียนคำสั่งคิวรีสำหรับรวบยอดนำชุดคำตอบย่อยลงตารางลูก (Child Record) ทั้งหมดในทีเดียว
        const sqlInsertAnswers = "INSERT INTO assessment_answers (result_id, question_number, score) VALUES ?";
        
        // 📊 HIGH-PERFORMANCE BULK INSERTION: สั่งบันทึกชุดคำตอบย่อยทุกข้อโครมเดียวเสร็จในคำสั่งเดียว ประหยัดแรงฐานข้อมูล
        await dbQuery(sqlInsertAnswers, [values]);
            
        // ส่งข้อมูลผลวิเคราะห์แพทย์และสัญญาณเส้นทางถัดไปกลับไปให้ Frontend รับลูกเปลี่ยนหน้าจอได้อย่างราบรื่น
        res.json({
            result: true,
            message: "บันทึกข้อมูลสำเร็จ",
            data: {
                total_score,
                result_text: evaluation.result_text,
                recommended_action: evaluation.recommended_action,
                next_action: evaluation.next_action  
            }
        });
    } catch (err) {
        // ดักจับจับความเสียหายของระบบเน็ตเวิร์กหรือคิวรี และส่งข้อความเตือนภัย Internal Error 500
        res.status(500).json({ result: false, message: "ล้มเหลวในกระบวนการบันทึกข้อมูลแบบประเมิน: " + err.message });
    }
});

// เส้นทาง API สำหรับการเรียกอ่านประวัติไทม์ไลน์บันทึกสุขภาพจิตรายบุคคลของผู้ใช้งานที่ระบุไอดี
app.get("/api/phq9/history/:user_id", async (req, res) => {
    try {
        // สกัดอ่านรหัสไอดีผู้ใช้งานเป้าหมายออกความต้องการพารามิเตอร์ URL 
        const userId = req.params.user_id;
        // เขียนคำสั่ง SQL ทำการผูกตารางหัวข้อและผลลัพธ์เพื่อควบรวมประวัติ จัดลำดับรอบล่าสุดขึ้นก่อน
        const sql = `
            SELECT r.id, a.code, a.title as assessment_title, r.total_score, r.result_text, r.recommended_action, r.created_at 
            FROM assessment_results r
            JOIN assessments a ON r.assessment_id = a.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `;
        // ยิงสั่งดึงก้อนข้อมูลประวัติทั้งหมดของยูสเซอร์รายดังกล่าวมาจาก MySQL ท่อ Pool
        const results = await dbQuery(sql, [userId]);
        
        // นำคำสั่ง .map() จัดฟอร์แมตป้ายสตริงข้อความหัวกระดาษรหัส Code ให้หน้าบ้านแกะกล่องใช้งานได้ทันที
        const mappedResults = results.map(item => ({
            id: item.id,
            total_score: item.total_score,
            result_text: `[${item.code.toUpperCase()}] ${item.result_text}`,
            recommended_action: item.recommended_action,
            created_at: item.created_at
        }));
        // ส่งก้อนข้อมูลประวัติโชว์ผลลัพธ์ฉบับคลีนและสวยงามกลับออกไปให้ฝั่งหน้าบ้านเรนเดอร์ UI
        res.json({ result: true, data: mappedResults });
    } catch (err) {
        // พ่นแจ้งข้อผิดพลาดระบบคิวรีขัดข้องให้หน้าบ้านรับทราบผ่านรหัส HTTP 500
        res.status(500).json({ result: false, message: "ดึงประวัติล้มเหลว: " + err.message });
    }
});

// เส้นทาง API สำหรับดึงข้อมูลประวัติการทำแบบทดสอบของคนไข้ทุกคนในระบบเพื่อป้อนให้แดชบอร์ดแอดมินหลังบ้าน
app.get("/api/phq9/all", async (req, res) => {
    try {
        // เขียนคำสั่งคิวรีดึงข้อมูลผลลัพธ์ประวัติทั้งหมดในระบบ จัดเรียงเวลาถอยหลังสู่อดีต
        const sql = `
            SELECT r.id, r.user_id, a.code, r.total_score, r.result_text, r.recommended_action, r.created_at 
            FROM assessment_results r
            JOIN assessments a ON r.assessment_id = a.id
            ORDER BY r.created_at DESC
        `;
        // รันผลคิวรีข้อมูลดิบทั้งหมดมาจากฐานข้อมูลสะสมกลาง
        const results = await dbQuery(sql);
        // คืนก้อนข้อมูลประวัติรวมทั้งหมดส่งกลับไปให้แผงควบคุมระบบแอดมินคำนวณยอดเคสสะสม
        res.json({ result: true, data: results });
    } catch (err) {
        // ส่งข้อความความผิดพลาดระบบแอดมินขัดข้อง
        res.status(500).json({ result: false, message: err.message });
    }
});

// ========================================================
// 🛠️ ADMIN SYSTEM OPERATIONS (MySQL CRUD Endpoints)
// ========================================================

// [READ]: เรียกอ่านข้อมูลหัวข้อฟอร์มแบบประเมินหลักทั้งหมดที่มีในตารางขึ้นโชว์บนแผงควบคุมแอดมิน
app.get("/api/admin/assessments", async (req, res) => {
    try {
        // อ่านรายการฟอร์มหลักทั้งหมดเรียงลำดับตามตัวเลขรหัสไอดีจากน้อยไปมาก
        const data = await dbQuery("SELECT * FROM assessments ORDER BY id ASC");
        // คืนค่าก้อนหัวข้อส่งกลับไปให้แผงหน้าต่างแอดมินเรนเดอร์
        res.json({ result: true, data });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// [CREATE]: สั่งเพิ่มและบันทึกหัวข้อฟอร์มแบบประเมินประเภทใหม่แกะกล่องบรรจุลงฐานข้อมูล
app.post("/api/admin/assessments", async (req, res) => {
    try {
        // สกัดแยกตัวแปรรายละเอียดฟอร์มชุดใหม่ออกมาจากพารามิเตอร์ Request Body 
        const { code, title, description } = req.body;
        // ยิงคำสั่ง INSERT บันทึกข้อมูลหัวข้อใหม่ โดยแปลงรหัสระบบให้เป็นตัวพิมพ์เล็กเพื่อความปลอดภัยลอจิก
        await dbQuery("INSERT INTO assessments (code, title, description) VALUES (?, ?, ?)", [code.toLowerCase().trim(), title.trim(), description.trim()]);
        // ส่งสัญญาณข้อความยืนยันความสำเร็จกลับไปให้แผงควบคุม
        res.json({ result: true, message: "เพิ่มแบบประเมินสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// [DELETE]: ลบทำลายหัวข้อแบบประเมินรวมถึงโครงสร้างข้อคำถามย่อยภายในออกด้วยรหัสไอดีหลัก
app.delete("/api/admin/assessments/:id", async (req, res) => {
    try {
        // ยิงคำสั่ง DELETE ทำลายข้อมูลแบบประเมินตัวดังกล่าวทิ้งโดยอ้างอิงไอดีพารามิเตอร์ปลายทาง
        await dbQuery("DELETE FROM assessments WHERE id = ?", [req.params.id]);
        // ส่งข้อความยืนยันเสร็จสิ้นลบข้อมูลฟอร์มสำเร็จกลับไปที่หน้าบ้านแอดมิน
        res.json({ result: true, message: "ลบแบบประเมินสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// [READ]: เรียกอ่านรายชื่อประโยคข้อคำถามย่อยทั้งหมดที่ผูกพ่วงอยู่ภายใต้ไอดีของฟอร์มที่แอดมินเลือกอยู่
app.get("/api/admin/questions/:assessment_id", async (req, res) => {
    try {
        // กรองดึงข้อคำถามย่อยจำแนกตามไอดีและจัดเรียงตามลำดับข้อคำถาม (question_number) จากข้อ 1 เสมอ
        const data = await dbQuery("SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_number ASC", [req.params.assessment_id]);
        // ส่งก้อนรายการคำถามย่อยกลับไปให้แผงหน้าจอแอดมินนำไปแสดงผลเรียงบรรทัด
        res.json({ result: true, data });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// [CREATE]: เพิ่มและบรรจุประโยคคำถามย่อยข้อใหม่เข้าไปผูกโครงสร้างใต้ไอดีแบบประเมินเป้าหมาย
app.post("/api/admin/questions", async (req, res) => {
    try {
        // แตกแยกตัวแปรไอดีแบบประเมิน ลำดับเลขข้อ และเนื้อความประโยคคำถามใหม่ออกมาจากก้อน body
        const { assessment_id, question_number, question_text } = req.body;
        // สั่ง INSERT ข้อมูลข้อคำถามใหม่บรรจุลงในตารางข้อคำถาม MySQL ของแอปตรงๆ
        await dbQuery("INSERT INTO assessment_questions (assessment_id, question_number, question_text) VALUES (?, ?, ?)", [assessment_id, question_number, question_text]);
        // ตอบกลับยืนยันระบบลงคลังคำถามย่อยข้อใหม่เสร็จสมบูรณ์ปลอดภัย
        res.json({ result: true, message: "เพิ่มคำถามสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// [UPDATE]: เปลี่ยนแปลงและแก้ไขถ้อยคำประโยคเนื้อความคำถามย่อยรายข้อผ่านรหัสไอดีข้อหลัก
app.put("/api/admin/questions/:id", async (req, res) => {
    try {
        // ดึงข้อความคำถามประโยคใหม่ฉบับแก้ไขมาจากข้อมูลโครงสร้าง Request Body
        const { question_text } = req.body;
        // ยิงคำสั่ง UPDATE แก้ไขเนื้อความคำถามเดิมในระบบ MySQL ทันทีตามตัวแปรไอดีข้อเป้าหมาย
        await dbQuery("UPDATE assessment_questions SET question_text = ? WHERE id = ?", [question_text.trim(), req.params.id]);
        // ส่งผลตอบรับการอัปเดตข้อมูลประโยคคำถามย่อยสำเร็จเสร็จสิ้นกลับไป
        res.json({ result: true, message: "แก้ไขคำถามสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// [DELETE]: สั่งทำลายและลบประโยคข้อคำถามย่อยรายข้อออกจากคลังระบบตารางแอปพลิเคชัน
app.delete("/api/admin/questions/:id", async (req, res) => {
    try {
        // ยิงคำสั่ง DELETE นำข้อมูลคำถามข้อดังกล่าวออกจากระบบฐานข้อมูลทันทีตามรหัสไอดีข้อ
        await dbQuery("DELETE FROM assessment_questions WHERE id = ?", [req.params.id]);
        // ส่งสัญญาณยืนยันการกวาดล้างคำถามย่อยข้อนั้นเสร็จสิ้นกลับไป
        res.json({ result: true, message: "ลบคำถามสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// เปิดสัญญาณให้พอร์ตของระบบเซิร์ฟเวอร์หลังบ้านเปิดประตูสแตนด์บายรับสัญญาณเน็ตตาม Config สากล
app.listen(CONFIG.PORT, () => {
    // สั่งพ่นข้อความ Log ยืนยันบนหน้าต่าง Terminal แจ้งสถานะระบบพร้อมให้บริการเต็มรูปแบบ 100%
    console.log(`Dynamic Assessment backend listening at http://localhost:${CONFIG.PORT}`);
});