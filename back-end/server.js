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
    connectionLimit: CONFIG.DB_POOL_LIMIT, // ดึงจำนวนท่อเชื่อมต่อสูงสุดจากตัวแปรส่วนกลาง CONFIG CONFIG
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

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = md5(password);
        const sql = "SELECT * FROM users WHERE email = ? AND password_hash = ?";
        
        const results = await dbQuery(sql, [email, hashedPassword]);
        
        if (results.length === 0) {
            return res.json({ result: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

        const user = results[0];
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
        res.status(500).json({ result: false, message: "ระบบฐานข้อมูลหลังบ้านขัดข้อง: " + err.message });
    }
});

app.post("/api/signup", async (req, res) => {
    try {
        const { username, first_name, last_name, email, password } = req.body;
      
        if (!username || !first_name || !last_name || !email || !password) {
            return res.json({ result: false, message: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" });
        }
      
        const checkSql = "SELECT id FROM users WHERE email = ? OR username = ?";
        const checkResults = await dbQuery(checkSql, [email, username]);
        
        if (checkResults.length > 0) {
            return res.json({ result: false, message: "อีเมลหรือชื่อผู้ใช้งานนี้ถูกใช้ในระบบแล้ว" });
        }
      
        const hashedPassword = md5(password);
        const insertSql = `
            INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, role_name) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        await dbQuery(insertSql, [
            username, 
            hashedPassword, 
            first_name, 
            last_name, 
            email, 
            CONFIG.DEFAULT_ROLE_ID, 
            CONFIG.DEFAULT_ROLE_NAME
        ]);
            
        res.json({ result: true, message: "สมัครสมาชิกสำเร็จเรียบร้อยแล้ว!" });
    } catch (err) {
        res.status(500).json({ result: false, message: "เกิดข้อผิดพลาดในการลงทะเบียนฐานข้อมูล: " + err.message });
    }
});

app.get("/api/assessment/form/:code", async (req, res) => {
    try {
        const code = req.params.code;
        const sql = `
            SELECT q.id, q.question_number, q.question_text 
            FROM assessment_questions q
            JOIN assessments a ON q.assessment_id = a.id
            WHERE a.code = ?
            ORDER BY q.question_number ASC
        `;
        
        const questions = await dbQuery(sql, [code]);
        
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
        
        const choices = choicesMap[code] || choicesMap['default'];
                  
        res.json({ result: true, data: { questions, choices } });
    } catch (err) {
        res.status(500).json({ result: false, message: "ดึงข้อมูลโครงสร้างคำถามล้มเหลว: " + err.message });
    }
});

app.post("/api/assessment/save", async (req, res) => {
    try {
        const { user_id, assessment_code, answers } = req.body; 

        if (!user_id || !assessment_code || !answers) {
            return res.json({ result: false, message: "ข้อมูล Payload ไม่ครบถ้วน" });
        }

        const searchRes = await dbQuery("SELECT id FROM assessments WHERE code = ?", [assessment_code]);
        if (searchRes.length === 0) return res.json({ result: false, message: "ไม่พบประเภทแบบประเมินนี้" });
        
        const assessmentId = searchRes[0].id;
        const total_score = answers.reduce((sum, score) => sum + Number(score), 0);
        const evaluation = evaluateAssessment(assessment_code, total_score, answers);
        
        const sqlInsertResult = "INSERT INTO assessment_results (user_id, assessment_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?, ?)";
        const resultObj = await dbQuery(sqlInsertResult, [user_id, assessmentId, total_score, evaluation.result_text, evaluation.recommended_action]);
        
        const resultId = resultObj.insertId;
        const values = answers.map((score, index) => [resultId, index + 1, score]);
        const sqlInsertAnswers = "INSERT INTO assessment_answers (result_id, question_number, score) VALUES ?";
        
        await dbQuery(sqlInsertAnswers, [values]);
            
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
        res.status(500).json({ result: false, message: "ล้มเหลวในกระบวนการบันทึกข้อมูลแบบประเมิน: " + err.message });
    }
});

app.get("/api/phq9/history/:user_id", async (req, res) => {
    try {
        const userId = req.params.user_id;
        const sql = `
            SELECT r.id, a.code, a.title as assessment_title, r.total_score, r.result_text, r.recommended_action, r.created_at 
            FROM assessment_results r
            JOIN assessments a ON r.assessment_id = a.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `;
        const results = await dbQuery(sql, [userId]);
        
        const mappedResults = results.map(item => ({
            id: item.id,
            total_score: item.total_score,
            result_text: `[${item.code.toUpperCase()}] ${item.result_text}`,
            recommended_action: item.recommended_action,
            created_at: item.created_at
        }));
        res.json({ result: true, data: mappedResults });
    } catch (err) {
        res.status(500).json({ result: false, message: "ดึงประวัติล้มเหลว: " + err.message });
    }
});

app.get("/api/phq9/all", async (req, res) => {
    try {
        const sql = `
            SELECT r.id, r.user_id, a.code, r.total_score, r.result_text, r.recommended_action, r.created_at 
            FROM assessment_results r
            JOIN assessments a ON r.assessment_id = a.id
            ORDER BY r.created_at DESC
        `;
        const results = await dbQuery(sql);
        res.json({ result: true, data: results });
    } catch (err) {
        res.status(500).json({ result: false, message: err.message });
    }
});

// ========================================================
// 🛠️ ADMIN SYSTEM OPERATIONS (MySQL CRUD Endpoints)
// ========================================================
app.get("/api/admin/assessments", async (req, res) => {
    try {
        const data = await dbQuery("SELECT * FROM assessments ORDER BY id ASC");
        res.json({ result: true, data });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

app.post("/api/admin/assessments", async (req, res) => {
    try {
        const { code, title, description } = req.body;
        await dbQuery("INSERT INTO assessments (code, title, description) VALUES (?, ?, ?)", [code.toLowerCase().trim(), title.trim(), description.trim()]);
        res.json({ result: true, message: "เพิ่มแบบประเมินสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

app.delete("/api/admin/assessments/:id", async (req, res) => {
    try {
        await dbQuery("DELETE FROM assessments WHERE id = ?", [req.params.id]);
        res.json({ result: true, message: "ลบแบบประเมินสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

app.get("/api/admin/questions/:assessment_id", async (req, res) => {
    try {
        const data = await dbQuery("SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_number ASC", [req.params.assessment_id]);
        res.json({ result: true, data });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

app.post("/api/admin/questions", async (req, res) => {
    try {
        const { assessment_id, question_number, question_text } = req.body;
        await dbQuery("INSERT INTO assessment_questions (assessment_id, question_number, question_text) VALUES (?, ?, ?)", [assessment_id, question_number, question_text]);
        res.json({ result: true, message: "เพิ่มคำถามสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

app.put("/api/admin/questions/:id", async (req, res) => {
    try {
        const { question_text } = req.body;
        await dbQuery("UPDATE assessment_questions SET question_text = ? WHERE id = ?", [question_text.trim(), req.params.id]);
        res.json({ result: true, message: "แก้ไขคำถามสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

app.delete("/api/admin/questions/:id", async (req, res) => {
    try {
        await dbQuery("DELETE FROM assessment_questions WHERE id = ?", [req.params.id]);
        res.json({ result: true, message: "ลบคำถามสำเร็จ" });
    } catch (err) { res.status(500).json({ result: false, message: err.message }); }
});

app.listen(CONFIG.PORT, () => {
    console.log(`Dynamic Assessment backend listening at http://localhost:${CONFIG.PORT}`);
});