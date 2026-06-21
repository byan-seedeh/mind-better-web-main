// =========================================================================
// 🚀 BACKEND SERVER.JS - PRODUCTION, SECURED & TRANSACTIONAL VERSION
// =========================================================================

const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const mysql = require('mysql');
const bcrypt = require('bcrypt');

const app = express();
const SALT_ROUNDS = 10;

const CONFIG = {
    PORT: process.env.PORT || 8080,
    DB_POOL_LIMIT: 10,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'mindbetter',
    ROLES: { USER_ID: 2, USER_NAME: 'user', ADMIN_NAME: 'admin' }
};

const SCORE_THRESHOLDS = {
    FORM_2Q: { HAS_RISK: 0 },
    FORM_9Q: { NORMAL: 7, MILD: 12, MODERATE: 18 },
    FORM_8Q: { NONE: 0, MILD: 4, MODERATE: 7 }
};

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const pool = mysql.createPool({
    connectionLimit: CONFIG.DB_POOL_LIMIT,
    host: CONFIG.DB_HOST,
    user: CONFIG.DB_USER,
    password: CONFIG.DB_PASSWORD,
    database: CONFIG.DB_NAME
});

// ⏳ ASYNC DATABASE QUERY ENGINE (PROMISE-BASED)
const dbQuery = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// =========================================================================
// 🧠 CLINICAL RULE ENGINE FUNCTIONS (BUSINESS LOGIC) WITH INPUT VALIDATION
// =========================================================================

function evaluate2Q(answers) {
    // 🛡️ Validation: ต้องมีคำตอบครบ 2 ข้อ
    if (!answers || answers.length !== 2) {
        throw new Error("ข้อมูลคำตอบแบบประเมิน 2Q ไม่ครบถ้วน");
    }
    const hasRisk = answers.some(score => Number(score) > SCORE_THRESHOLDS.FORM_2Q.HAS_RISK);
    return {
        result_text: hasRisk ? "พบความเสี่ยงภาวะซึมเศร้า" : "ปกติ",
        recommended_action: hasRisk ? "ควรเข้ารับการประเมินต่อด้วยแบบประเมินโรคซึมเศร้า 9Q" : "ดูแลสุขภาพใจตามปกติ ประเมินซ้ำเมื่อจำเป็น",
        next_action: hasRisk ? "9q" : "home"
    };
}

function evaluate9Q(totalScore) {
    let resultText = "ปกติ";
    let recommendedAction = "ดูแลสุขภาพกายใจต่อเนื่อง นอนให้พอ ออกกำลังกาย และประเมินซ้ำเมื่อจำเป็น";
    let nextAction = "history";

    if (totalScore >= SCORE_THRESHOLDS.FORM_9Q.NORMAL && totalScore <= SCORE_THRESHOLDS.FORM_9Q.MILD) {
        resultText = "ซึมเศร้าเล็กน้อย";
        recommendedAction = "ปรับพฤติกรรมการนอน-กิน พูดคุยกับคนใกล้ชิด และต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
        nextAction = "8q";
    } else if (totalScore <= SCORE_THRESHOLDS.FORM_9Q.MODERATE) {
        resultText = "ซึมเศร้าปานกลาง";
        recommendedAction = "ควรปรึกษาแพทย์/นักจิตวิทยา และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
        nextAction = "8q";
    } else if (totalScore > SCORE_THRESHOLDS.FORM_9Q.MODERATE) {
        resultText = "ซึมเศร้ารุนแรง";
        recommendedAction = "ควรพบแพทย์โดยเร็วที่สุด และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q ทันที";
        nextAction = "8q";
    }

    return { result_text: resultText, recommended_action: recommendedAction, next_action: nextAction };
}

function evaluate8Q(totalScore) {
    let resultText = "ไม่มีความเสี่ยงทำร้ายตนเอง";
    let recommendedAction = "ติดตามดูแลอย่างต่อเนื่อง ประเมินซ้ำเมื่อสภาวะจิตใจเปลี่ยน";

    if (totalScore > SCORE_THRESHOLDS.FORM_8Q.NONE && totalScore <= SCORE_THRESHOLDS.FORM_8Q.MILD) {
        resultText = "ระดับความเสี่ยงทำร้ายตนเอง: น้อย";
        recommendedAction = "ควรให้การปรึกษาผ่อนคลายความเครียด ติดตามดูแลใกล้ชิด";
    } else if (totalScore <= SCORE_THRESHOLDS.FORM_8Q.MODERATE) {
        resultText = "ระดับความเสี่ยงทำร้ายตนเอง: ปานกลาง";
        recommendedAction = "ควรส่งพบแพทย์ นักจิตวิทยา หรือโทรสายด่วนสุขภาพจิต 1323 เพื่อวางแผนช่วยเหลือ";
    } else if (totalScore > SCORE_THRESHOLDS.FORM_8Q.MODERATE) {
        resultText = "ระดับความเสี่ยงทำร้ายตนเอง: รุนแรงมาก";
        recommendedAction = "⚠️ ต้องส่งต่อโรงพยาบาลที่มีจิตแพทย์ด่วนทันที หรือติดต่อสายด่วน 1669 ห้ามปล่อยให้อยู่คนเดียว";
    }

    return { result_text: resultText, recommended_action: recommendedAction, next_action: "history" };
}

function evaluateAssessment(code, totalScore, answers) {
    switch (code.toLowerCase().trim()) {
        case '2q': return evaluate2Q(answers);
        case '9q': return evaluate9Q(totalScore);
        case '8q': return evaluate8Q(totalScore);
        default: return { result_text: "ทำแบบประเมินสำเร็จ", recommended_action: "-", next_action: "history" };
    }
}

// =========================================================================
// ⚡ RESTful API ENDPOINTS (AUTHENTICATION SYSTEM)
// =========================================================================

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ result: false, message: "กรุณากรอกอีเมลและรหัสผ่าน" });
        }

        const sql = "SELECT * FROM users WHERE email = ?";
        const results = await dbQuery(sql, [email]);
        
        if (results.length === 0) {
            return res.status(401).json({ result: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ result: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

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
        res.status(500).json({ result: false, message: "ระบบหลังบ้านขัดข้อง: " + err.message });
    }
});

app.post("/api/signup", async (req, res) => {
    try {
        const { username, first_name, last_name, email, password } = req.body;
      
        if (!username || !first_name || !last_name || !email || !password) {
            return res.status(400).json({ result: false, message: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" });
        }
      
        const checkResults = await dbQuery("SELECT id FROM users WHERE email = ? OR username = ?", [email, username]);
        if (checkResults.length > 0) {
            return res.status(400).json({ result: false, message: "อีเมลหรือชื่อผู้ใช้งานนี้ถูกใช้ในระบบแล้ว" });
        }
      
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const insertSql = `
            INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, role_name) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        await dbQuery(insertSql, [username, hashedPassword, first_name, last_name, email, CONFIG.ROLES.USER_ID, CONFIG.ROLES.USER_NAME]);
        res.status(201).json({ result: true, message: "สมัครสมาชิกสำเร็จเรียบร้อยแล้ว!" });
    } catch (err) {
        res.status(500).json({ result: false, message: "เกิดข้อผิดพลาดในการลงทะเบียน: " + err.message });
    }
});

// =========================================================================
// 📝 CLINICAL ASSESSMENT ENGINE (WITH DATABASE TRANSACTION)
// =========================================================================

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
        const choices = choicesMap[code.toLowerCase()] || choicesMap['default'];
                  
        res.json({ result: true, data: { questions, choices } });
    } catch (err) {
        res.status(500).json({ result: false, message: "ดึงข้อมูลโครงสร้างคำถามล้มเหลว: " + err.message });
    }
});

// 🎯 REFACTORED WITH TRANSACTION: เพื่อป้องกันข้อมูลตารางแม่-ลูกขัดแย้งกัน
app.post("/api/assessment/save", (req, res) => {
    const { user_id, assessment_code, answers } = req.body;

    if (!user_id || !assessment_code || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ result: false, message: "ข้อมูล Payload ไม่ครบถ้วนหรือไม่ถูกต้อง" });
    }

    // ใช้ getConnection จาก Pool เพื่อทำระบบ Manual Transaction Control
    pool.getConnection(async (err, connection) => {
        if (err) return res.status(500).json({ result: false, message: "Database Connection Error" });

        // แปลงฟังก์ชัน คิวรีให้ใช้ร่วมกับเฉพาะ Connection ท่อนี้
        const trxQuery = (sql, params) => {
            return new Promise((resolve, reject) => {
                connection.query(sql, params, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });
        };

        try {
            // 1. เริ่มต้นเปิด Transaction
            await trxQuery("START TRANSACTION", []);

            // 2. ค้นหาไอดีแบบประเมิน
            const searchRes = await trxQuery("SELECT id FROM assessments WHERE code = ?", [assessment_code]);
            if (searchRes.length === 0) {
                connection.rollback(() => connection.release());
                return res.status(404).json({ result: false, message: "ไม่พบประเภทแบบประเมินนี้" });
            }
            
            const assessmentId = searchRes[0].id;
            const total_score = answers.reduce((sum, score) => sum + Number(score), 0);
            
            // เรียก Clinical Rule Engine ตรวจสอบลอจิกทางการแพทย์
            const evaluation = evaluateAssessment(assessment_code, total_score, answers);
            
            // 3. บันทึกลงตารางแม่ (assessment_results)
            const sqlInsertResult = "INSERT INTO assessment_results (user_id, assessment_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?, ?)";
            const resultObj = await trxQuery(sqlInsertResult, [user_id, assessmentId, total_score, evaluation.result_text, evaluation.recommended_action]);
            
            const resultId = resultObj.insertId;
            const values = answers.map((score, index) => [resultId, index + 1, score]);
            
            // 4. บันทึกลงตารางลูก (assessment_answers)
            const sqlInsertAnswers = "INSERT INTO assessment_answers (result_id, question_number, score) VALUES ?";
            await trxQuery(sqlInsertAnswers, [values]);

            // 5. หากทุกอย่างผ่านด้วยดี ทำการ ยืนยันข้อมูลลงระบบ (Commit)
            await trxQuery("COMMIT", []);
            connection.release(); // คืนท่อเชื่อมต่อกลับเข้า Pool

            res.json({
                result: true,
                message: "บันทึกข้อมูลสำเร็จอย่างปลอดภัย",
                data: {
                    total_score,
                    result_text: evaluation.result_text,
                    recommended_action: evaluation.recommended_action,
                    next_action: evaluation.next_action
                }
            });

        } catch (error) {
            // ⚠️ เกิดข้อผิดพลาดจุดใดจุดหนึ่ง ให้ทำการยกเลิกทั้งหมด (Rollback) ทันที ข้อมูลไม่เสียหาย
            connection.rollback(() => {
                connection.release();
                res.status(500).json({ result: false, message: "ล้มเหลวในกระบวนการบันทึกข้อมูล (Rollback สำเร็จ): " + error.message });
            });
        }
    });
});

app.get("/api/phq9/history/:user_id", async (req, res) => {
    try {
        const userId = req.params.user_id;
        const sqlResults = `
            SELECT r.id, a.code, a.title as assessment_title, r.total_score, r.result_text, r.recommended_action, r.created_at 
            FROM assessment_results r
            JOIN assessments a ON r.assessment_id = a.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `;
        const results = await dbQuery(sqlResults, [userId]);
        
        const mappedResults = await Promise.all(results.map(async (item) => {
            const sqlAnswers = `
                SELECT score FROM assessment_answers 
                WHERE result_id = ? 
                ORDER BY question_number ASC
            `;
            const answersRows = await dbQuery(sqlAnswers, [item.id]);
            return {
                id: item.id,
                assessment_code: item.code,
                total_score: item.total_score,
                result_text: item.result_text,
                recommended_action: item.recommended_action,
                created_at: item.created_at,
                answers: answersRows.map(row => row.score)
            };
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
        res.status(500).json({ result: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลทั้งหมด: " + err.message }); 
    }
});

// =========================================================================
// 🛠️ ADMIN ROUTERS (SECURED & FIX VARIABLE BUGS)
// =========================================================================

app.get("/api/admin/assessments", async (req, res) => {
    try {
        const data = await dbQuery("SELECT * FROM assessments ORDER BY id ASC");
        res.json({ result: true, data });
    } catch (err) { 
        res.status(500).json({ result: false, message: err.message }); 
    }
});

app.post("/api/admin/assessments", async (req, res) => {
    try {
        const { code, title, description } = req.body;
        if (!code || !title) return res.status(400).json({ result: false, message: "กรุณากรอกข้อมูลที่จำเป็น" });
        
        await dbQuery("INSERT INTO assessments (code, title, description) VALUES (?, ?, ?)", [code.toLowerCase().trim(), title.trim(), description.trim()]);
        res.json({ result: true, message: "เพิ่มแบบประเมินสำเร็จ" });
    } catch (err) { 
        res.status(500).json({ result: false, message: err.message }); 
    }
});

app.delete("/api/admin/assessments/:id", async (req, res) => {
    try {
        await dbQuery("DELETE FROM assessments WHERE id = ?", [req.params.id]);
        res.json({ result: true, message: "ลบแบบประเมินสำเร็จ" });
    } catch (err) { 
        res.status(500).json({ result: false, message: err.message }); 
    }
});

// 🎯 FIX BUG: แก้ไขจากโค้ดเดิมที่ใส่ตัวแปรผิด และใช้ Parameterized Query ป้องกัน SQL Injection
app.get("/api/admin/questions/:assessment_id", async (req, res) => {
    try {
        const data = await dbQuery("SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_number ASC", [req.params.assessment_id]);
        res.json({ result: true, data });
    } catch (err) { 
        res.status(500).json({ result: false, message: err.message }); 
    }
});

app.post("/api/admin/questions", async (req, res) => {
    try {
        const { assessment_id, question_number, question_text } = req.body;
        await dbQuery("INSERT INTO assessment_questions (assessment_id, question_number, question_text) VALUES (?, ?, ?)", [assessment_id, question_number, question_text]);
        res.json({ result: true, message: "เพิ่มคำถามสำเร็จ" });
    } catch (err) { 
        res.status(500).json({ result: false, message: err.message }); 
    }
});

app.put("/api/admin/questions/:id", async (req, res) => {
    try {
        const { question_text } = req.body;
        await dbQuery("UPDATE assessment_questions SET question_text = ? WHERE id = ?", [question_text.trim(), req.params.id]);
        res.json({ result: true, message: "แก้ไขคำถามสำเร็จ" });
    } catch (err) { 
        res.status(500).json({ result: false, message: err.message }); 
    }
});

app.delete("/api/admin/questions/:id", async (req, res) => {
    try {
        await dbQuery("DELETE FROM assessment_questions WHERE id = ?", [req.params.id]);
        res.json({ result: true, message: "ลบคำถามสำเร็จ" });
    } catch (err) { 
        res.status(500).json({ result: false, message: err.message }); 
    }
});

// =========================================================================
// 🚀 START SERVER LISTEN
// =========================================================================
app.listen(CONFIG.PORT, () => {
    console.log(`Secured Dynamic Assessment backend listening at http://localhost:${CONFIG.PORT}`);
});