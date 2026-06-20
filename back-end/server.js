// =========================================================================
// 🚀 BACKEND SERVER.JS - REFACTORED & CLEAN CODE (FOR MINDBETTER PROJECT)
// =========================================================================
// ผู้พัฒนา: Byan Seedeh (UX/UI Designer & Full-Stack Developer)
// ระบบ: Dynamic Assessment Management System (2Q -> 9Q -> 8Q Workflow)
// =========================================================================

// นำเข้าโมดูล Express สำหรับสร้างระบบ RESTful API Server หลังบ้าน
const express = require('express');
// ประกาศอินสแตนซ์ของ Express Application เพื่อใช้งานฟังก์ชันควบคุมเส้นทางเดินของข้อมูล
const app = express();
// นำเข้าโมดูล Body-Parser สำหรับแปลงโครงสร้างข้อมูลที่ส่งมาจากหน้าบ้านใน Request Body
const bodyParser = require('body-parser');
// นำเข้าโมดูล CORS เพื่อปลดล็อกสิทธิ์เข้าถึงข้ามโดเมนระหว่างพอร์ตหน้าบ้าน (Next.js) และหลังบ้าน (Express)
const cors = require("cors");
// นำเข้าโมดูล MySQL สำหรับติดต่อสั่งการและคิวรีข้อมูลในระบบฐานข้อมูลเชิงสัมพันธ์
const mysql = require('mysql');
// นำเข้าโมดูล MD5 สำหรับใช้แฮชรหัสผ่านเพื่อความปลอดภัยในการจัดเก็บลงตารางข้อมูล
const md5 = require('md5');

// 🔤 CONFIGURATION OBJECT: สกัดค่าคงที่ ตัวแปรระบบ และการตั้งค่าฐานข้อมูลมาไว้ส่วนกลาง เพื่อให้ง่ายต่อการดูแลรักษา
const CONFIG = {
    PORT: process.env.PORT || 8080,
    DB_POOL_LIMIT: 10,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'mindbetter',
    DEFAULT_ROLE_ID: 2,
    DEFAULT_ROLE_NAME: 'user'
};

// ❓ SCORE THRESHOLDS: กำหนดเกณฑ์คะแนนทางการแพทย์ตามมาตรฐานของกระทรวงสาธารณสุขเป็นค่าคงที่
// ป้องกันการใช้ Magic Numbers (ตัวเลขที่ลอยมาเฉยๆ โดยไม่มีคำอธิบาย) ในโค้ด
const SCORE_THRESHOLDS = {
    FORM_2Q_HAS_RISK: 0,  // เกณฑ์ 2Q: ถ้าข้อใดข้อหนึ่งมากกว่า 0 แสดงว่ามีแนวโน้มเสี่ยง
    FORM_9Q_NORMAL: 7,    // เกณฑ์ 9Q: คะแนนต่ำกว่า 7 = ปกติ
    FORM_9Q_MILD: 12,     // เกณฑ์ 9Q: คะแนน 7-12 = ซึมเศร้าเล็กน้อย
    FORM_9Q_MODERATE: 18, // เกณฑ์ 9Q: คะแนน 13-18 = ซึมเศร้าปานกลาง (ถ้าเกินกว่านี้คือ รุนแรง)
    FORM_8Q_NONE: 0,      // เกณฑ์ 8Q: คะแนนเป็น 0 = ไม่มีความเสี่ยงทำร้ายตนเอง
    FORM_8Q_MILD: 4,      // เกณฑ์ 8Q: คะแนน 1-4 = เสี่ยงน้อย
    FORM_8Q_MODERATE: 7   // เกณฑ์ 8Q: คะแนน 5-7 = เสี่ยงปานกลาง (ถ้าเกินกว่านี้คือ รุนแรงมาก)
};

// 🛡️ MIDDLEWARES SETUP
// เปิดใช้งาน CORS เพื่ออนุญาตให้ Next.js หน้าบ้านส่ง HTTP Request ข้ามพอร์ตมาคุยกับ API หลังบ้านได้
app.use(cors());
// เปิดฟังก์ชันแปลงรูปแบบข้อมูลจากฟอร์มประเภท URL-Encoded
app.use(bodyParser.urlencoded({ extended: false }));
// เปิดฟังก์ชันแปลงข้อมูลประเภท JSON Object ส่วนกลางให้กับระบบหลังบ้านทั้งหมด
app.use(bodyParser.json());

// 🌊 DATABASE CONNECTION POOL
// สร้างระบบ Connection Pool ในการบริหารท่อส่งข้อมูล เพื่อช่วยสลับและนำท่อเชื่อมต่อกลับมาใช้ใหม่
// รองรับกรณีที่มีผู้ใช้งานเข้ามาทำแบบประเมินพร้อมๆ กันจำนวนมาก ไม่ให้ฐานข้อมูลล่ม
const pool = mysql.createPool({
    connectionLimit: CONFIG.DB_POOL_LIMIT,
    host: CONFIG.DB_HOST,
    user: CONFIG.DB_USER,
    password: CONFIG.DB_PASSWORD,
    database: CONFIG.DB_NAME
});

// ⏳ ASYNC DB QUERY ENGINE
// แปลงคำสั่ง Query ของโมดูล mysql จากรูปแบบเดิมที่เป็น Callback Hell ให้เป็นรูปแบบ Promise
// เพื่อให้เขียนโค้ดด้วย Async/Await ได้อย่างคลีน อ่านง่าย และจัดการข้อผิดพลาดด้วย Try-Catch ได้สมบูรณ์แบบ
const dbQuery = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) return reject(err); // หาก SQL พังหรือหา Table ไม่เจอ ให้ส่ง Error ออกไปทันที
            resolve(results);           // หากสำเร็จ ส่งผลลัพธ์ข้อมูลแถว (Rows) กลับออกไป
        });
    });
};

/**
 * @description 🧠 CLINICAL RULE ENGINE FUNCTION
 * ฟังก์ชันหลักในการคำนวณคะแนนดิบ คัดกรองระดับความรุนแรง และจัดเส้นทางเดินหน้าจอ (Data Routing)
 * @param {string} code - รหัสแบบประเมิน ('2q', '9q', '8q')
 * @param {number} totalScore - คะแนนรวมดิบที่คำนวณได้จากหน้าบ้าน
 * @param {Array} answers - อาร์เรย์ของคะแนนที่ผู้ใช้เลือกตอบในแต่ละข้อ
 * @returns {Object} { result_text, recommended_action, next_action }
 */
function evaluateAssessment(code, totalScore, answers) {
    // 🟢 ตรรกะประเมินฟอร์มคัดกรองเบื้องต้น 2Q
    if (code === '2q') {
        // ใช้คำสั่ง .some() ตรวจดูว่าในอาเรย์คำตอบ มีข้อไหนที่ผู้ใช้ตอบว่า "มี" (> 0) หรือไม่
        const hasRisk = answers.some(score => Number(score) > SCORE_THRESHOLDS.FORM_2Q_HAS_RISK);
        return {
            result_text: hasRisk ? "พบความเสี่ยงภาวะซึมเศร้า" : "ปกติ",
            recommended_action: hasRisk ? "ควรเข้ารับการประเมินต่อด้วยแบบประเมินโรคซึมเศr้า 9Q" : "ดูแลสุขภาพใจตามปกติ ประเมินซ้ำเมื่อจำเป็น",
            next_action: hasRisk ? "9q" : "home" // หากเสี่ยงส่งไป 9Q ต่อ ถ้าปกติให้ดีดกลับหน้าหลัก (Home)
        };
    }
    
    // 🟣 ตรรกะประเมินฟอร์มโรคซึมเศร้ามาตรฐาน 9Q
    if (code === '9q') {
        let resultText = "";
        let recommendedAction = "";
        let nextAction = "history"; // ค่าเริ่มต้นหากไม่เสี่ยงมาก ให้ส่งไปหน้าประวัติรวม
        
        if (totalScore < SCORE_THRESHOLDS.FORM_9Q_NORMAL) {
            resultText = "ปกติ";
            recommendedAction = "ดูแลสุขภาพกายใจต่อเนื่อง นอนให้พอ ออกกำลังกาย และประเมินซ้ำเมื่อจำเป็น";
        } else if (totalScore <= SCORE_THRESHOLDS.FORM_9Q_MILD) {
            resultText = "ซึมเศร้าเล็กน้อย";
            recommendedAction = "ปรับพฤติกรรมการนอน-กิน พูดคุยกับคนใกล้ชิด และต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
            nextAction = "8q"; // 🔄 สั่งเปลี่ยน State บังคับให้หน้าบ้านพาผู้ใช้ไปทำฟอร์ม 8Q ต่อทันที
        } else if (totalScore <= SCORE_THRESHOLDS.FORM_9Q_MODERATE) {
            resultText = "ซึมเศร้าปานกลาง";
            recommendedAction = "ควรปรึกษาแพทย์/นักจิตวิทยา และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
            nextAction = "8q"; // บังคับดีดไปทำแบบประเมินความเสี่ยงต่อด้วย 8Q
        } else {
            resultText = "ซึมเศร้ารุนแรง";
            recommendedAction = "ควรพบแพทย์โดยเร็วที่สุด และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q ทันที";
            nextAction = "8q"; // สภาวะวิกฤต บังคับเข้าสู่กระบวนการคัดกรองพฤติกรรมทำร้ายตนเองด่วนที่สุด
        }
        
        return { result_text: resultText, recommended_action: recommendedAction, next_action: nextAction };
    }
    
    // 🔴 ตรรกะประเมินฟอร์มเฝ้าระวังความเสี่ยงและพฤติกรรมทำร้ายตนเอง 8Q
    if (code === '8q') {
        let resultText = "";
        let recommendedAction = "";
        
        if (totalScore === SCORE_THRESHOLDS.FORM_8Q_NONE) {
            resultText = "ไม่มีความเสี่ยงทำร้ายตนเอง";
            recommendedAction = "ติดตามดูแลอย่างต่อเนื่อง ประเมินซ้ำเมื่อสภาวะจิตใจเปลี่ยน";
        } else if (totalScore <= SCORE_THRESHOLDS.FORM_8Q_MILD) {
            resultText = "ระดับความเสี่ยงทำร้ายตนเอง: น้อย";
            recommendedAction = "ควรให้การปรึกษาผ่อนคลายความเครียด ติดตามดูแลใกล้ชิด";
        } else if (totalScore <= SCORE_THRESHOLDS.FORM_8Q_MODERATE) {
            resultText = "ระดับความเสี่ยงทำร้ายตนเอง: ปานกลาง";
            recommendedAction = "ควรส่งพบแพทย์ นักจิตวิทยา หรือโทรสายด่วนสุขภาพจิต 1323 เพื่อวางแผนช่วยเหลือ";
        } else {
            resultText = "ระดับความเสี่ยงทำร้ายตนเอง: รุนแรงมาก";
            recommendedAction = "⚠️ ต้องส่งต่อโรงพยาบาลที่มีจิตแพทย์ด่วนทันที หรือติดต่อสายด่วน 1669 ห้ามปล่อยให้อยู่คนเดียว";
        }
        
        // จุดสิ้นสุดลูปการคัดกรอง ล็อกเป้าหมายปลายทางสุดท้ายให้พาผู้ใช้กลับไปที่หน้าแสดงประวัติรวม (History)
        return { result_text: resultText, recommended_action: recommendedAction, next_action: "history" };
    }
    
    return { result_text: "ทำแบบประเมินสำเร็จ", recommended_action: "-", next_action: "history" };
}

// =========================================================================
// ⚡ RESTful API ENDPOINTS (AUTHENTICATION & ASSESSMENT SYSTEM)
// =========================================================================

/**
 * @route   POST /api/login
 * @desc    ตรวจสอบความถูกต้องของบัญชีและเข้าสู่ระบบด้วย Email + Password
 */
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = md5(password); // แฮชรหัสผ่านในรูปแบบ MD5 เพื่อเปรียบเทียบกับใน Database
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

/**
 * @route   POST /api/signup
 * @desc    ลงทะเบียนบัญชีผู้ใช้งานคนไข้รายใหม่
 */
app.post("/api/signup", async (req, res) => {
    try {
        const { username, first_name, last_name, email, password } = req.body;
      
        if (!username || !first_name || !last_name || !email || !password) {
            return res.json({ result: false, message: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" });
        }
      
        // ตรวจสอบความซ้ำซ้อนของข้อมูลบัญชีผู้ใช้งาน
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

/**
 * @route   GET /api/assessment/form/:code
 * @desc    ดึงชุดคำถามและตัวเลือกคะแนน (Choices) ตามรหัสแบบประเมินเพื่อไปเรนเดอร์ในหน้าจอทำข้อสอบ
 */
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
        
        // Static Mapping ตัวเลือกคำตอบและเกณฑ์คะแนนตามรูปแบบสากลของแต่ละฟอร์ม
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

/**
 * @route   POST /api/assessment/save
 * @desc    บันทึกผลการคัดกรองลงฐานข้อมูล (การันตีลอจิก INSERT INTO แตกแถวข้อมูลใหม่ทุกครั้ง ไม่ลบทับอันเก่า)
 */
app.post("/api/assessment/save", async (req, res) => {
    try {
        const { user_id, assessment_code, answers } = req.body; 

        if (!user_id || !assessment_code || !answers) {
            return res.json({ result: false, message: "ข้อมูล Payload ไม่ครบถ้วน" });
        }

        // ค้นหา ID แท้จริงของตัวแบบประเมินจากตารางหลักเพื่อเอาไปทำ Foreign Key
        const searchRes = await dbQuery("SELECT id FROM assessments WHERE code = ?", [assessment_code]);
        if (searchRes.length === 0) return res.json({ result: false, message: "ไม่พบประเภทแบบประเมินนี้" });
        
        const assessmentId = searchRes[0].id;
        // รวมคะแนนดิบสะสมจากอาร์เรย์คำตอบรายข้อที่หน้าบ้านยิงเข้ามา
        const total_score = answers.reduce((sum, score) => sum + Number(score), 0);
        // ประมวลผลเกณฑ์ระดับความเสี่ยงและคำแนะนำทางการแพทย์ผ่าน Rule Engine
        const evaluation = evaluateAssessment(assessment_code, total_score, answers);
        
        // บันทึกผลลัพธ์การคัดกรองหลักลงตารางแม่ (assessment_results) ด้วยคำสั่ง INSERT (สร้างแถวใหม่เสมอ)
        const sqlInsertResult = "INSERT INTO assessment_results (user_id, assessment_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?, ?)";
        const resultObj = await dbQuery(sqlInsertResult, [user_id, assessmentId, total_score, evaluation.result_text, evaluation.recommended_action]);
        
        // ดึง Primary Key (insertId) ล่าสุดที่เพิ่งเจนเนอเรตจากตารางแม่ไปเป็นรหัสโยงในตารางลูก
        const resultId = resultObj.insertId;
        // จัดแมปเตรียมก้อนข้อมูลคำตอบแบบ Bulk Payload เพื่อประหยัดช่องสัญญาณการยิง SQL
        const values = answers.map((score, index) => [resultId, index + 1, score]);
        // บันทึกคำตอบรายข้อลงตารางลูก (assessment_answers) เพื่อเก็บบันทึกประวัติย้อนหลังอย่างละเอียด
        const sqlInsertAnswers = "INSERT INTO assessment_answers (result_id, question_number, score) VALUES ?";
        
        await dbQuery(sqlInsertAnswers, [values]);
            
        res.json({
            result: true,
            message: "บันทึกข้อมูลสำเร็จ",
            data: {
                total_score,
                result_text: evaluation.result_text,
                recommended_action: evaluation.recommended_action,
                next_action: evaluation.next_action  // หน้าบ้านจะแกะตัวแปรนี้ไปทำ Conditional Router นำทางไปแบบสอบถามถัดไป
            }
        });
    } catch (err) {
        res.status(500).json({ result: false, message: "ล้มเหลวในกระบวนการบันทึกข้อมูลแบบประเมิน: " + err.message });
    }
});

/**
 * @route   GET /api/phq9/history/:user_id
 * @desc    🎯 DATA RELATIONSHIP ENGINE: ดึงผลลัพธ์ประวัติจากตารางแม่ พร้อม Query เชื่อมโยงคำตอบรายข้อจากตารางลูก
 * ช่วยแก้ปัญหาข้อมูลคำตอบรายข้อข้างในว่างเปล่าได้อย่างเบ็ดเสร็จ
 */
app.get("/api/phq9/history/:user_id", async (req, res) => {
    try {
        const userId = req.params.user_id;
        
        // ขั้นตอนที่ 1: สั่ง Query ผลการคัดกรองทั้งหมดของยูสเซอร์คนดังกล่าวจากตารางแม่ (assessment_results)
        const sqlResults = `
            SELECT r.id, a.code, a.title as assessment_title, r.total_score, r.result_text, r.recommended_action, r.created_at 
            FROM assessment_results r
            JOIN assessments a ON r.assessment_id = a.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `;
        const results = await dbQuery(sqlResults, [userId]);
        
        // ขั้นตอนที่ 2: ใช้ Promise.all ควบคู่กับลูปดึงคะแนนคำตอบรายข้อจากตารางลูก (assessment_answers) มาผูกติดไปด้วย
        const mappedResults = await Promise.all(results.map(async (item) => {
            const sqlAnswers = `
                SELECT score FROM assessment_answers 
                WHERE result_id = ? 
                ORDER BY question_number ASC
            `;
            const answersRows = await dbQuery(sqlAnswers, [item.id]);
            // สกัด Rows ในรูปของอาเรย์ตัวเลขคะแนนล้วน เช่น [0, 1, 3, 2] ให้หน้าบ้านดึงไปแสดงแยกช่องได้ง่าย
            const answersArray = answersRows.map(row => row.score);

            return {
                id: item.id,
                assessment_code: item.code, // ป้ายระบุโค้ดแบบประเมินสำหรับให้หน้าบ้านใช้จัดเส้นทาง '2q', '9q', '8q'
                total_score: item.total_score,
                result_text: item.result_text,
                recommended_action: item.recommended_action,
                created_at: item.created_at,
                answers: answersArray // 🎯 จุดสำคัญ: แนบชุดคะแนนคำตอบรายข้อส่งกลับออกไปเพื่อนำไปกางในแผงรายละเอียดของหน้าจอประวัติ
            };
        }));

        res.json({ result: true, data: mappedResults });
    } catch (err) {
        res.status(500).json({ result: false, message: "ดึงประวัติล้มเหลว: " + err.message });
    }
});

/**
 * @route   GET /api/phq9/all
 * @desc    ดึงประวัติผลประเมินรวมของคนไข้ทุกคนในระบบ (สำหรับใช้ในระบบหลังบ้านหรือระบบแดชบอร์ดแอดมิน)
 */
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

// =========================================================================
// 🛠️ ADMIN SYSTEM OPERATIONS (MySQL CRUD OPERATIONS FOR BACKOFFICE APP)
// =========================================================================

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

// เริ่มต้นรันเซิร์ฟเวอร์ Express ตามพอร์ตที่กำหนดใน Config
app.listen(CONFIG.PORT, () => {
    console.log(`Dynamic Assessment backend listening at http://localhost:${CONFIG.PORT}`);
});