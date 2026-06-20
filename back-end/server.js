// =========================================================================
// 🚀 BACKEND SERVER.JS - REFACTORED, CLEAN & SECURED VERSION (MINDBETTER)
// =========================================================================
// ผู้พัฒนา: Byan Seedeh (UX/UI Designer & Full-Stack Developer)
// คุณสมบัติ: เขียนคอมเมนต์อธิบายละเอียดทุกบรรทัด, ปลอดภัยด้วย Bcrypt, โครงสร้าง Clean Code
// =========================================================================

// นำเข้าโมดูล Express เพื่อใช้จัดการระบบ Routing และ HTTP Request/Response
const express = require('express');
// นำเข้าโมดูล Body-Parser เพื่อแปลงข้อมูลที่ส่งมาจากหน้าบ้านให้อยู่ในรูป Object ที่เรียกใช้งานง่าย
const bodyParser = require('body-parser');
// นำเข้าโมดูล CORS สำหรับปลดล็อกสิทธิ์ให้เว็บหน้าบ้าน (Next.js) สามารถยิง API ข้ามพอร์ตมาหาหลังบ้านได้
const cors = require("cors");
// นำเข้าโมดูล MySQL สำหรับเชื่อมต่อและจัดการคิวรีข้อมูลในฐานข้อมูล
const mysql = require('mysql');
// นำเข้าโมดูล Bcrypt เพื่อใช้แฮชรหัสผ่านอย่างปลอดภัยตามมาตรฐานความปลอดภัยระดับสูง (แทนที่ MD5 เดิม)
const bcrypt = require('bcrypt');

// ประกาศอินสแตนซ์ของ Express Application เพื่อเริ่มต้นตั้งค่าเซิร์ฟเวอร์
const app = express();
// กำหนดจำนวนรอบในการสร้าง Salt สำหรับ Bcrypt (ยิ่งเยอะยิ่งปลอดภัย แต่ใช้เวลาประมวลผลนานขึ้น)
const SALT_ROUNDS = 10;

// 🔤 CENTRAL CONFIGURATION OBJECT: รวบรวมค่าคงที่และ Configuration ทั้งหมดไว้ที่จุดเดียว
const CONFIG = {
    PORT: process.env.PORT || 8080,                // กำหนดพอร์ตในการรันเซิร์ฟเวอร์ (ค่าเริ่มต้น 8080)
    DB_POOL_LIMIT: 10,                             // จำกัดจำนวนท่อเชื่อมต่อฐานข้อมูลพร้อมกันสูงสุด 10 ท่อ
    DB_HOST: process.env.DB_HOST || 'localhost',   // ที่อยู่ของ Database Server
    DB_USER: process.env.DB_USER || 'root',        // ชื่อผู้ใช้งานระบบฐานข้อมูล
    DB_PASSWORD: process.env.DB_PASSWORD || '',    // รหัสผ่านระบบฐานข้อมูล
    DB_NAME: process.env.DB_NAME || 'mindbetter',  // ชื่อฐานข้อมูลที่ใช้งาน
    ROLES: {
        USER_ID: 2,                                // รหัสไอดีบทบาทของคนไข้/ผู้ใช้งานทั่วไป
        USER_NAME: 'user',                         // ชื่อเรียกบทบาทของผู้ใช้งานทั่วไป
        ADMIN_NAME: 'admin'                        // ชื่อเรียกบทบาทของผู้ดูแลระบบ
    }
};

// ❓ CLINICAL THRESHOLDS CONSTANTS: กำหนดเกณฑ์คะแนนทางการแพทย์เป็นค่าคงที่เพื่อเลี่ยง Magic Numbers
const SCORE_THRESHOLDS = {
    FORM_2Q: { HAS_RISK: 0 },                      // ฟอร์ม 2Q: ตอบ "มี" (>0) ข้อใดข้อหนึ่งถือว่าเสี่ยง
    FORM_9Q: { NORMAL: 7, MILD: 12, MODERATE: 18 }, // ฟอร์ม 9Q: ช่วงแบ่งระดับ ปกติ, น้อย, ปานกลาง, รุนแรง
    FORM_8Q: { NONE: 0, MILD: 4, MODERATE: 7 }     // ฟอร์ม 8Q: ช่วงแบ่งระดับความเสี่ยงการทำร้ายตนเอง
};

// 🛡️ APPLICATION MIDDLEWARES SETUP
app.use(cors());                                    // เปิดใช้งาน CORS ให้รองรับการเข้าถึงจากโดเมนอื่น
app.use(bodyParser.urlencoded({ extended: false })); // รองรับการแกะข้อมูลที่ส่งมาจากฟอร์มประเภท URL-Encoded
app.use(bodyParser.json());                         // รองรับการแกะข้อมูลที่เป็น JSON Payload ส่วนกลาง

// 🌊 DATABASE CONNECTION POOL: สร้างระบบจัดการการเชื่อมต่อเพื่อประสิทธิภาพในการสลับใช้งานท่อเชื่อมข้อมูล
const pool = mysql.createPool({
    connectionLimit: CONFIG.DB_POOL_LIMIT,          // นำค่าจำกัดจำนวน Pool สูงสุดจาก CONFIG มาตั้งค่า
    host: CONFIG.DB_HOST,                           // นำที่อยู่โฮสต์จาก CONFIG มาตั้งค่า
    user: CONFIG.DB_USER,                           // นำชื่อผู้ใช้จาก CONFIG มาตั้งค่า
    password: CONFIG.DB_PASSWORD,                   // นำรหัสผ่านจาก CONFIG มาตั้งค่า
    database: CONFIG.DB_NAME                        // นำชื่อฐานข้อมูลจาก CONFIG มาตั้งค่า
});

// ⏳ ASYNC DATABASE QUERY ENGINE: แปลงฟังก์ชันการทำงานของ MySQL จาก Callback ให้เป็น Promise
const dbQuery = (sql, params) => {
    return new Promise((resolve, reject) => {
        // เรียกใช้ฟังก์ชัน query ผ่านระบบ Pool
        pool.query(sql, params, (err, results) => {
            if (err) return reject(err);            // หากเกิดข้อผิดพลาด ให้ปฏิเสธคำขอและส่ง Error ออกไป
            resolve(results);                       // หากทำงานสำเร็จ ให้ส่งผลลัพธ์ (Rows/Data) กลับคืนไป
        });
    });
};

// =========================================================================
// 🧠 CLINICAL RULE ENGINE FUNCTIONS (BUSINESS LOGIC)
// =========================================================================

// ฟังก์ชันสำหรับประเมินผลแบบสอบถามคัดกรองเบื้องต้น 2Q
function evaluate2Q(answers) {
    // ใช้ .some() ตรวจสอบว่าในอาร์เรย์คำตอบมีค่าคะแนนข้อใดมากกว่าเกณฑ์เสี่ยง (0) หรือไม่
    const hasRisk = answers.some(score => Number(score) > SCORE_THRESHOLDS.FORM_2Q.HAS_RISK);
    return {
        result_text: hasRisk ? "พบความเสี่ยงภาวะซึมเศร้า" : "ปกติ", // ถ้าเสี่ยงให้แสดงข้อความเตือน
        recommended_action: hasRisk ? "ควรเข้ารับการประเมินต่อด้วยแบบประเมินโรคซึมเศร้า 9Q" : "ดูแลสุขภาพใจตามปกติ ประเมินซ้ำเมื่อจำเป็น",
        next_action: hasRisk ? "9q" : "home"       // ถ้าเสี่ยงบังคับไปทำแบบประเมิน 9Q ต่อ ถ้าปกติส่งกลับหน้าหลัก (Home)
    };
}

// ฟังก์ชันสำหรับประเมินผลแบบประเมินโรคซึมเศร้ามาตรฐาน 9Q
function evaluate9Q(totalScore) {
    let resultText = "ปกติ";                        // กำหนดค่าเริ่มต้นข้อความผลลัพธ์
    let recommendedAction = "ดูแลสุขภาพกายใจต่อเนื่อง นอนให้พอ ออกกำลังกาย และประเมินซ้ำเมื่อจำเป็น"; // กำหนดคำแนะนำเริ่มต้น
    let nextAction = "history";                     // ปลายทางเริ่มต้นหากผลปกติ คือส่งไปหน้าแสดงประวัติรวม

    // ตรวจสอบกรณีคะแนนอยู่ในช่วงเสี่ยงเล็กน้อย
    if (totalScore >= SCORE_THRESHOLDS.FORM_9Q.NORMAL && totalScore <= SCORE_THRESHOLDS.FORM_9Q.MILD) {
        resultText = "ซึมเศร้าเล็กน้อย";
        recommendedAction = "ปรับพฤติกรรมการนอน-กิน พูดคุยกับคนใกล้ชิด และต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
        nextAction = "8q";                          // เปลี่ยนปลายทางเป็นแบบประเมินความเสี่ยงฆ่าตัวตาย 8Q
    } 
    // ตรวจสอบกรณีคะแนนอยู่ในช่วงเสี่ยงปานกลาง
    else if (totalScore <= SCORE_THRESHOLDS.FORM_9Q.MODERATE) {
        resultText = "ซึมเศร้าปานกลาง";
        recommendedAction = "ควรปรึกษาแพทย์/นักจิตวิทยา และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
        nextAction = "8q";                          // เปลี่ยนปลายทางเพื่อส่งไปทำแบบประเมิน 8Q
    } 
    // ตรวจสอบกรณีคะแนนสูงกว่าเกณฑ์ปานกลาง (เข้าขั้นรุนแรง)
    else if (totalScore > SCORE_THRESHOLDS.FORM_9Q.MODERATE) {
        resultText = "ซึมเศร้ารุนแรง";
        recommendedAction = "ควรพบแพทย์โดยเร็วที่สุด และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q ทันที";
        nextAction = "8q";                          // สภาวะวิกฤต บังคับไปทำฟอร์ม 8Q ทันที
    }

    // ส่งวัตถุผลลัพธ์การคัดกรองกลับไปใช้งาน
    return { result_text: resultText, recommended_action: recommendedAction, next_action: nextAction };
}

// ฟังก์ชันสำหรับประเมินผลแบบสอบถามเฝ้าระวังพฤติกรรมทำร้ายตนเอง 8Q
function evaluate8Q(totalScore) {
    let resultText = "ไม่มีความเสี่ยงทำร้ายตนเอง";    // กำหนดค่าเริ่มต้นข้อความผลลัพธ์
    let recommendedAction = "ติดตามดูแลอย่างต่อเนื่อง ประเมินซ้ำเมื่อสภาวะจิตใจเปลี่ยน"; // กำหนดคำแนะนำเริ่มต้น

    // ตรวจสอบคะแนนกรณีมีความเสี่ยงน้อย
    if (totalScore > SCORE_THRESHOLDS.FORM_8Q.NONE && totalScore <= SCORE_THRESHOLDS.FORM_8Q.MILD) {
        resultText = "ระดับความเสี่ยงทำร้ายตนเอง: น้อย";
        recommendedAction = "ควรให้การปรึกษาผ่อนคลายความเครียด ติดตามดูแลใกล้ชิด";
    } 
    // ตรวจสอบคะแนนกรณีมีความเสี่ยงปานกลาง
    else if (totalScore <= SCORE_THRESHOLDS.FORM_8Q.MODERATE) {
        resultText = "ระดับความเสี่ยงทำร้ายตนเอง: ปานกลาง";
        recommendedAction = "ควรส่งพบแพทย์ นักจิตวิทยา หรือโทรสายด่วนสุขภาพจิต 1323 เพื่อวางแผนช่วยเหลือ";
    } 
    // ตรวจสอบคะแนนกรณีมีความเสี่ยงรุนแรงมาก
    else if (totalScore > SCORE_THRESHOLDS.FORM_8Q.MODERATE) {
        resultText = "ระดับความเสี่ยงทำร้ายตนเอง: รุนแรงมาก";
        recommendedAction = "⚠️ ต้องส่งต่อโรงพยาบาลที่มีจิตแพทย์ด่วนทันที หรือติดต่อสายด่วน 1669 ห้ามปล่อยให้อยู่คนเดียว";
    }

    // ส่งผลลัพธ์กลับ โดยล็อกปลายทางหน้าจอสุดท้ายไว้ที่หน้าประวัติรวม (history) เสมอ
    return { result_text: resultText, recommended_action: recommendedAction, next_action: "history" };
}

// ฟังก์ชันหลัก (Facade/Router) ในการเลือกเรียกใช้ฟังก์ชันย่อยตามรหัสแบบประเมินที่ส่งเข้ามา
function evaluateAssessment(code, totalScore, answers) {
    switch (code) {
        case '2q': return evaluate2Q(answers);       // ถ้ารหัสเป็น 2q ให้วิ่งไปฟังก์ชันคำนวณของ 2Q
        case '9q': return evaluate9Q(totalScore);    // ถ้ารหัสเป็น 9q ให้วิ่งไปฟังก์ชันคำนวณของ 9Q
        case '8q': return evaluate8Q(totalScore);    // ถ้ารหัสเป็น 8q ให้วิ่งไปฟังก์ชันคำนวณของ 8Q
        default: return { result_text: "ทำแบบประเมินสำเร็จ", recommended_action: "-", next_action: "history" };
    }
}

// =========================================================================
// ⚡ RESTful API ENDPOINTS (AUTHENTICATION SYSTEM)
// =========================================================================

// API เส้นทางสำหรับตรวจเช็กสิทธิ์และเข้าสู่ระบบ (Login)
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;       // สกัดอีเมลและรหัสผ่านจากข้อมูลที่หน้าบ้านส่งมา
        const sql = "SELECT * FROM users WHERE email = ?"; // เตรียมคำสั่ง SQL ค้นหายูสเซอร์จากอีเมล
        const results = await dbQuery(sql, [email]); // รันคำสั่งคิวรีข้อมูลในระบบฐานข้อมูล
        
        // หากไม่พบข้อมูลอีเมลในระบบ
        if (results.length === 0) {
            return res.status(401).json({ result: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

        const user = results[0];                     // ดึงข้อมูลแถวแรกสุดของผู้ใช้งานออกมา
        // 🛡️ ตรวจเช็กความถูกต้อง: เปรียบเทียบรหัสผ่านที่ส่งมากับค่าแฮชในเบสผ่านโมดูล Bcrypt
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        // ถ้ารหัสผ่านไม่ตรงกัน
        if (!isMatch) {
            return res.status(401).json({ result: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

        // หากผ่านเงื่อนไขทั้งหมด ให้ส่งข้อมูลสำคัญกลับไปให้หน้าบ้านจัดเก็บลง Session/Context
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
    } catch (err) {
        // จัดการกรณีระบบล่มภายใน ให้ส่งรหัส 500 กลับไป
        res.status(500).json({ result: false, message: "ระบบฐานข้อมูลขัดข้อง: " + err.message });
    }
});

// API เส้นทางสำหรับสมัครบัญชีคนไข้รายใหม่ (Signup)
app.post("/api/signup", async (req, res) => {
    try {
        const { username, first_name, last_name, email, password } = req.body; // รับตัวแปรทั้งหมดจากโครงสร้างข้อมูล
      
        // ตรวจสอบความสมบูรณ์ของ Payload ว่ากรอกข้อมูลครบทุกช่องหรือไม่
        if (!username || !first_name || !last_name || !email || !password) {
            return res.status(400).json({ result: false, message: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" });
        }
      
        // ทำการคิวรีเพื่อเช็กว่ามีคนใช้ชื่อบัญชีหรืออีเมลนี้สมัครไปก่อนหน้านี้แล้วหรือยัง
        const checkResults = await dbQuery("SELECT id FROM users WHERE email = ? OR username = ?", [email, username]);
        if (checkResults.length > 0) {
            return res.status(400).json({ result: false, message: "อีเมลหรือชื่อผู้ใช้งานนี้ถูกใช้ในระบบแล้ว" });
        }
      
        // 🛡️ เข้ารหัสลับ: แฮชรหัสผ่านของผู้ใช้ผ่านฟังก์ชัน bcrypt.hash ก่อนจัดเก็บลงตาราง
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const insertSql = `
            INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, role_name) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        // รันคำสั่งบันทึกข้อมูลสมาชิกใหม่ โดยผูกบทบาทตั้งต้นเป็นระดับคนไข้ทั่วไป (User)
        await dbQuery(insertSql, [username, hashedPassword, first_name, last_name, email, CONFIG.ROLES.USER_ID, CONFIG.ROLES.USER_NAME]);
        res.status(201).json({ result: true, message: "สมัครสมาชิกสำเร็จเรียบร้อยแล้ว!" });
    } catch (err) {
        res.status(500).json({ result: false, message: "เกิดข้อผิดพลาดในการลงทะเบียน: " + err.message });
    }
});

// =========================================================================
// 📝 CLINICAL ASSESSMENT ENGINE ENDPOINTS
// =========================================================================

// API เส้นทางสำหรับดึงรายการโจทย์คำถามและตัวเลือกคะแนนขึ้นไปแสดงบนหน้าจอทำฟอร์ม
app.get("/api/assessment/form/:code", async (req, res) => {
    try {
        const code = req.params.code;               // ดึงตัวแปรรหัสแบบประเมินจาก URL Params
        const sql = `
            SELECT q.id, q.question_number, q.question_text 
            FROM assessment_questions q
            JOIN assessments a ON q.assessment_id = a.id
            WHERE a.code = ?
            ORDER BY q.question_number ASC
        `;
        const questions = await dbQuery(sql, [code]); // รันคำสั่งดึงรายละเอียดของคำถามที่ผูกกับรหัสนั้น ๆ
        
        // ตารางจัดเก็บตัวเลือกคำตอบทางสถิติ (Static Choices Mapping) ตามโครงสร้างสากล
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
        // เลือกชิ้นข้อมูล Choices หากไม่พบในแมปให้ดึงชุดค่าของ default ฟอร์ม 9Q มาใช้งานแทน
        const choices = choicesMap[code] || choicesMap['default'];
                  
        res.json({ result: true, data: { questions, choices } }); // ส่งโครงสร้างคำถามพร้อมตัวเลือกกลับไปให้หน้าบ้าน
    } catch (err) {
        res.status(500).json({ result: false, message: "ดึงข้อมูลโครงสร้างคำถามล้มเหลว: " + err.message });
    }
});

// API เส้นทางสำหรับรับบันทึกผลการคัดกรอง และประเมินทิศทางหน้าถัดไปแบบไดนามิก
app.post("/api/assessment/save", async (req, res) => {
    try {
        const { user_id, assessment_code, answers } = req.body; // แตกตัวแปร Payload ออกมาจาก Request Body

        // เช็กความครบถ้วนของข้อมูลก่อนประมวลผลต่อ
        if (!user_id || !assessment_code || !answers) {
            return res.status(400).json({ result: false, message: "ข้อมูล Payload ไม่ครบถ้วน" });
        }

        // ค้นหาข้อมูล ID แท้จริงของแบบประเมินประเภทนั้น ๆ เพื่อนำไปเชื่อมคีย์นอก (Foreign Key)
        const searchRes = await dbQuery("SELECT id FROM assessments WHERE code = ?", [assessment_code]);
        if (searchRes.length === 0) return res.status(404).json({ result: false, message: "ไม่พบประเภทแบบประเมินนี้" });
        
        const assessmentId = searchRes[0].id;        // สกัดได้รหัส primary key ของแบบประเมิน
        // คำนวณหาคะแนนรวมดิบจากอาร์เรย์คะแนนรายข้อสะสมที่ส่งมาจากผู้ใช้
        const total_score = answers.reduce((sum, score) => sum + Number(score), 0);
        // เรียกสมองกลคำนวณทางคลินิก (Rule Engine) เพื่อหารูปประโยคคำวินิจฉัยและเส้นทางถัดไป
        const evaluation = evaluateAssessment(assessment_code, total_score, answers);
        
        // สั่งบันทึกข้อมูลสรุปลงตารางแม่ (assessment_results) ด้วยลอจิก INSERT INTO (ไม่เขียนทับแถวเดิมเด็ดขาด)
        const sqlInsertResult = "INSERT INTO assessment_results (user_id, assessment_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?, ?)";
        const resultObj = await dbQuery(sqlInsertResult, [user_id, assessmentId, total_score, evaluation.result_text, evaluation.recommended_action]);
        
        const resultId = resultObj.insertId;         // ดึงตัวเลขรหัส ID แถวล่าสุดที่เพิ่งงอกในตารางแม่มาถือไว้
        // แปลงมิติอาร์เรย์ของคำตอบให้อยู่ในรูปแบบ Bulk Layout `[[result_id, q_num, score], ...]`
        const values = answers.map((score, index) => [resultId, index + 1, score]);
        // สั่งประหยัดสัญญาณช่องสื่อสารโดยการทำ Bulk Insert บันทึกคำตอบรายข้อทั้งหมดลงตารางลูก (assessment_answers) ในทีเดียว
        const sqlInsertAnswers = "INSERT INTO assessment_answers (result_id, question_number, score) VALUES ?";
        
        await dbQuery(sqlInsertAnswers, [values]);   // รันคำสั่งบันทึกข้อมูลตารางลูก
            
        // ส่งแพ็กเกจข้อมูลลอจิกสะท้อนกลับไปหน้าบ้าน เพื่อให้หน้าบ้านใช้เปลี่ยน State หน้าจอแบบเรียลไทม์
        res.json({
            result: true,
            message: "บันทึกข้อมูลสำเร็จ",
            data: {
                total_score,
                result_text: evaluation.result_text,
                recommended_action: evaluation.recommended_action,
                next_action: evaluation.next_action  // 🎯 ตัวแปรนำทาง เช่น '9q', '8q' หรือ 'history'
            }
        });
    } catch (err) {
        res.status(500).json({ result: false, message: "ล้มเหลวในกระบวนการบันทึกข้อมูล: " + err.message });
    }
});

// API เส้นทางสำหรับดึงประวัติการทำฟอร์มทั้งหมดของรายบุคคล โดยดึงโครงสร้างตารางแม่ประกบตารางลูกพร้อมกัน
app.get("/api/phq9/history/:user_id", async (req, res) => {
    try {
        const userId = req.params.user_id;           // แกะค่ารหัสประจำตัวคนไข้จาก URL Parameter
        // ดึงรายการผลสรุปหลักทั้งหมดที่เกี่ยวข้องกับคนไข้รายนี้ เรียงลำดับจากเวลาล่าสุดถอยหลังไปอดีต
        const sqlResults = `
            SELECT r.id, a.code, a.title as assessment_title, r.total_score, r.result_text, r.recommended_action, r.created_at 
            FROM assessment_results r
            JOIN assessments a ON r.assessment_id = a.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `;
        const results = await dbQuery(sqlResults, [userId]);
        
        // 🔄 ใช้ Promise.all รันลูปดึงข้อมูลข้อคำตอบย่อยจากตารางลูกแบบอะซิงโครนัสขนานกันไปเพื่อเพิ่มความเร็ว
        const mappedResults = await Promise.all(results.map(async (item) => {
            // คิวรีดึงชุดคะแนนเรียงลำดับตามข้อคำถามจากตารางลูก
            const sqlAnswers = `
                SELECT score FROM assessment_answers 
                WHERE result_id = ? 
                ORDER BY question_number ASC
            `;
            const answersRows = await dbQuery(sqlAnswers, [item.id]);
            // ผูกมัดแพ็กข้อมูลใหม่โดยนำระเบียนตารางลูกแปลงเป็นอาเรย์ตัวเลข [0, 2, 1] ผนึกเข้ากับโมเดลหลักตารางแม่
            return {
                id: item.id,
                assessment_code: item.code,
                total_score: item.total_score,
                result_text: item.result_text,
                recommended_action: item.recommended_action,
                created_at: item.created_at,
                answers: answersRows.map(row => row.score) // 🎯 ผนึกคำตอบเรียงข้อแนบส่งกลับไปด้วยเสร็จสรรพ
            };
        }));

        res.json({ result: true, data: mappedResults }); // ส่งก้อนประวัติความสัมพันธ์ตารางแม่-ลูกที่สมบูรณ์กลับไป
    } catch (err) {
        res.status(500).json({ result: false, message: "ดึงประวัติล้มเหลว: " + err.message });
    }
});

// API เส้นทางสำหรับดึงประวัติภาพรวมของคนไข้ทุกคนในระบบ (สำหรับทำแผงควบคุมหลักหรือระบบแอดมิน)
app.get("/api/phq9/all", async (req, res) => {
    try {
        const sql = `
            SELECT r.id, r.user_id, a.code, r.total_score, r.result_text, r.recommended_action, r.created_at 
            FROM assessment_results r
            JOIN assessments a ON r.assessment_id = a.id
            ORDER BY r.created_at DESC
        `;
        const results = await dbQuery(sql);          // ดึงประวัติรวมทั้งหมดแบบไม่คัดกรอง ID รายบุคคล
        res.json({ result: true, data: results });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// =========================================================================
// 🛠️ ADMIN ROUTERS & CORE CRUD OPERATIONS (ระบบหลังบ้านส่วนของแอดมิน)
// =========================================================================

// ดึงรายการประเภทแบบประเมินทั้งหมดในระบบขึ้นมาตรวจดู
app.get("/api/admin/assessments", async (req, res) => {
    try {
        const data = await dbQuery("SELECT * FROM assessments ORDER BY id ASC");
        res.json({ result: true, data });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// สั่งเพิ่มรูปแบบประเภทแบบประเมินใหม่เข้าไปในระบบ
app.post("/api/admin/assessments", async (req, res) => {
    try {
        const { code, title, description } = req.body;
        // ปรับแต่งข้อความ สกัดช่องว่างส่วนเกินออก ก่อนทำการบันทึก
        await dbQuery("INSERT INTO assessments (code, title, description) VALUES (?, ?, ?)", [code.toLowerCase().trim(), title.trim(), description.trim()]);
        res.json({ result: true, message: "เพิ่มแบบประเมินสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// ลบประเภทฟอร์มแบบประเมินที่ไม่ใช้งานออกตาม ID
app.delete("/api/admin/assessments/:id", async (req, res) => {
    try {
        await dbQuery("DELETE FROM assessments WHERE id = ?", [req.params.id]);
        res.json({ result: true, message: "ลบแบบประเมินสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// ดึงโจทย์คำถามทั้งหมดที่อยู่ภายใต้ฟอร์มไอดีที่กำหนดออกมาตรวจดู
app.get("/api/admin/questions/:assessment_id", async (req, res) => {
    try {
        const data = await dbQuery("SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_number ASC", [req.params.assessment_id]);
        res.json({ result: true, data });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// สั่งสร้างหัวข้อโจทย์คำถามข้อใหม่ผูกเข้ากับฟอร์มนั้น ๆ
app.post("/api/admin/questions", async (req, res) => {
    try {
        const { assessment_id, question_number, question_text } = req.body;
        await dbQuery("INSERT INTO assessment_questions (assessment_id, question_number, question_text) VALUES (?, ?, ?)", [assessment_id, question_number, question_text]);
        res.json({ result: true, message: "เพิ่มคำถามสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// ปรับปรุงแก้ไขข้อความรูปประโยคของตัวโจทย์คำถามตามเลขไอดีข้อ
app.put("/api/admin/questions/:id", async (req, res) => {
    try {
        const { question_text } = req.body;
        await dbQuery("UPDATE assessment_questions SET question_text = ? WHERE id = ?", [question_text.trim(), req.params.id]);
        res.json({ result: true, message: "แก้ไขคำถามสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// สั่งลบหัวข้อคำถามข้อนั้น ๆ ออกจากสารบบฐานข้อมูล
app.delete("/api/admin/questions/:id", async (req, res) => {
    try {
        await dbQuery("DELETE FROM assessment_questions WHERE id = ?", [req.params.id]);
        res.json({ result: true, message: "ลบคำถามสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

// =========================================================================
// 🚀 START SERVER LISTEN
// =========================================================================
// สั่งให้ระบบเซิร์ฟเวอร์ Express เริ่มต้นสแตนด์บายรอรับ HTTP Request ตามพอร์ตที่สกัดไว้จาก Config
app.listen(CONFIG.PORT, () => {
    console.log(`Secured Dynamic Assessment backend listening at http://localhost:${CONFIG.PORT}`);
});