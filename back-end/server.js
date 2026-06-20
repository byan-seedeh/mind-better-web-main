const express = require('express');
const app = express();
const port = 8080;
const bodyParser = require('body-parser');
const cors = require("cors");
const mysql = require('mysql');
const md5 = require('md5');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: "",
    database: 'mindbetter'
});

// ฟังก์ชันหัวใจหลัก: คำนวณแบบประเมินและตัดสินใจตาม Clinical Workflow 
function evaluateAssessment(code, totalScore, answers) {
    if (code === '2q') {
        const hasRisk = answers.some(score => Number(score) > 0);
        return {
            result_text: hasRisk ? "เป็นผู้มีความเสี่ยง หรือมีแนวโน้มที่จะเป็นโรคซึมเศร้า" : "ปกติ ไม่เป็นโรคซึมเศร้า",
            recommended_action: hasRisk ? "ควรเข้ารับการประเมินต่อด้วยแบบประเมินโรคซึมเศร้า 9Q" : "ดูแลสุขภาพใจตามปกติ ประเมินซ้ำเมื่อจำเป็น",
            next_action: hasRisk ? "9q" : "home" 
        };
    }
    
    if (code === '9q') {
        let resultText = "";
        let recommendedAction = "";
        let nextAction = "history";
        
        if (totalScore < 7) {
            resultText = "ไม่มีอาการของโรคซึมเศร้าหรือมีอาการระดับน้อยมาก";
            recommendedAction = "ดูแลสุขภาพกายใจต่อเนื่อง นอนให้พอ ออกกำลังกาย และประเมินซ้ำเมื่อจำเป็น";
        } else if (totalScore <= 12) {
            resultText = "มีอาการของโรคซึมเศร้า ระดับน้อย";
            recommendedAction = "ปรับพฤติกรรมการนอน-กิน พูดคุยกับคนใกล้ชิด และต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
            nextAction = "8q"; 
        } else if (totalScore <= 18) {
            resultText = "มีอาการของโรคซึมเศร้า ระดับปานกลาง";
            recommendedAction = "ควรปรึกษาแพทย์/นักจิตวิทยา และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q";
            nextAction = "8q";
        } else {
            resultText = "มีอาการของโรคซึมเศร้า ระดับรุนแรง";
            recommendedAction = "ควรพบแพทย์โดยเร็วที่สุด และจำเป็นต้องประเมินแนวโน้มการฆ่าตัวตายต่อด้วย 8Q ทันที";
            nextAction = "8q";
        }
        
        return { result_text: resultText, recommended_action: recommendedAction, next_action: nextAction };
    }
    
    if (code === '8q') {
        let resultText = "";
        let recommendedAction = "";
        if (totalScore === 0) {
            resultText = "ไม่มีแนวโน้มฆ่าตัวตายในปัจจุบัน";
            recommendedAction = "ติดตามดูแลอย่างต่อเนื่อง ประเมินซ้ำเมื่อสภาวะจิตใจเปลี่ยน";
        } else if (totalScore <= 8) {
            resultText = "มีแนวโน้มที่จะฆ่าตัวตายในปัจจุบัน ระดับน้อย";
            recommendedAction = "ควรให้การปรึกษาผ่อนคลายความเครียด ติดตามดูแลใกล้ชิด";
        } else if (totalScore <= 16) {
            resultText = "มีแนวโน้มที่จะฆ่าตัวตายในปัจจุบัน ระดับปานกลาง";
            recommendedAction = "ควรส่งพบแพทย์ นักจิตวิทยา หรือโทรสายด่วนสุขภาพจิต 1323 เพื่อวางแผนช่วยเหลือ";
        } else {
            resultText = "มีแนวโน้มที่จะฆ่าตัวตายในปัจจุบัน ระดับรุนแรง";
            recommendedAction = "⚠️ ต้องส่งต่อโรงพยาบาลที่มีจิตแพทย์ด่วนทันที หรือติดต่อสายด่วน 1669 ห้ามปล่อยให้อยู่คนเดียว";
        }
        
        return { result_text: resultText, recommended_action: recommendedAction, next_action: "history" };
    }
    
    return { result_text: "ทำแบบประเมินสำเร็จ", recommended_action: "-", next_action: "history" };
}

// ========================================================
// 🔑 AUTHENTICATION ENDPOINT
// ========================================================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = md5(password);
  
  const sql = "SELECT * FROM users WHERE email = ? AND password_hash = ?";
  pool.query(sql, [email, hashedPassword], (err, results) => {
    if (err) return res.json({ result: false, message: err.message });
    if (results.length === 0) return res.json({ result: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

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
  });
});

// ✅ Sign Up: POST /api/signup
app.post("/api/signup", (req, res) => {
    const { username, first_name, last_name, email, password } = req.body;
  
    if (!username || !first_name || !last_name || !email || !password) {
      return res.json({ result: false, message: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" });
    }
  
    // 1. ตรวจสอบก่อนว่า Email หรือ Username นี้เคยถูกใช้ไปแล้วหรือยัง
    const checkSql = "SELECT id FROM users WHERE email = ? OR username = ?";
    pool.query(checkSql, [email, username], (checkErr, checkResults) => {
      if (checkErr) return res.json({ result: false, message: checkErr.message });
      if (checkResults.length > 0) {
        return res.json({ result: false, message: "อีเมลหรือชื่อผู้ใช้งานนี้ถูกใช้ในระบบแล้ว" });
      }
  
      // 2. แฮชรหัสผ่านด้วย md5 ให้ตรงกับโครงสร้างตารางเดิมของระบบ
      const hashedPassword = md5(password);
  
      // 3. บันทึกข้อมูลลงฐานข้อมูล (กำหนดบทบาทเริ่มต้นเป็นทั่วไป role_id = 2, role_name = 'user')
      const insertSql = `
        INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, role_name) 
        VALUES (?, ?, ?, ?, ?, 2, 'user')
      `;
      
      pool.query(insertSql, [username, hashedPassword, first_name, last_name, email], (insertErr, result) => {
        if (insertErr) return res.json({ result: false, message: insertErr.message });
        
        res.json({
          result: true,
          message: "สมัครสมาชิกสำเร็จเรียบร้อยแล้ว!"
        });
      });
    });
  });
// ========================================================
// 📋 END-USER ASSESSMENT ENDPOINTS
// ========================================================

// ดึงคำถามและตัวเลือกตามประเภทของ Code (2q, 9q, 8q)
app.get("/api/assessment/form/:code", (req, res) => {
    const code = req.params.code;
    
    const sql = `
        SELECT q.id, q.question_number, q.question_text 
        FROM assessment_questions q
        JOIN assessments a ON q.assessment_id = a.id
        WHERE a.code = ?
        ORDER BY q.question_number ASC
    `;
    
    pool.query(sql, [code], (err, questions) => {
        if (err) return res.json({ result: false, message: "ดึงคำถามล้มเหลว: " + err.message });
        
        let choices = [];
        if (code === '2q') {
            choices = [
                { choice_text: "ไม่มี", score: 0 },
                { choice_text: "มี", score: 1 }
            ];
        } else if (code === '8q') {
            choices = [
                { choice_text: "ไม่มี", score: 0 },
                { choice_text: "มี", score: 1 }
            ];
        } else {
            choices = [
                { choice_text: "ไม่มีเลย", score: 0 },
                { choice_text: "เป็นบางวัน (1-7 วัน)", score: 1 },
                { choice_text: "เป็นบ่อย (> 7 วัน)", score: 2 },
                { choice_text: "เป็นทุกวัน", score: 3 }
            ];
        }
              
        res.json({
            result: true,
            data: { questions, choices }
        });
    });
});

// บันทึกและวิเคราะห์คำตอบลงตารางกลาง
app.post("/api/assessment/save", (req, res) => {
    const { user_id, assessment_code, answers } = req.body; 

    if (!user_id || !assessment_code || !answers) {
        return res.json({ result: false, message: "ข้อมูล Payload ไม่ครบถ้วน" });
    }

    pool.query("SELECT id FROM assessments WHERE code = ?", [assessment_code], (err1, searchRes) => {
        if (err1 || searchRes.length === 0) return res.json({ result: false, message: "ไม่พบประเภทแบบประเมินนี้" });
        
        const assessmentId = searchRes[0].id;
        const total_score = answers.reduce((sum, score) => sum + Number(score), 0);
        
        const evaluation = evaluateAssessment(assessment_code, total_score, answers);
        
        const sqlInsertResult = "INSERT INTO assessment_results (user_id, assessment_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?, ?)";
        pool.query(sqlInsertResult, [user_id, assessmentId, total_score, evaluation.result_text, evaluation.recommended_action], (err2, resultObj) => {
            if (err2) return res.json({ result: false, message: err2.message });
            
            const resultId = resultObj.insertId;
            const values = answers.map((score, index) => [resultId, index + 1, score]);
            const sqlInsertAnswers = "INSERT INTO assessment_answers (result_id, question_number, score) VALUES ?";
            
            pool.query(sqlInsertAnswers, [values], (err3) => {
                if (err3) return res.json({ result: false, message: err3.message });
                
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
            });
        });
    });
});

// ดึงประวัติแบบประเมินของรายบุคคล
app.get("/api/phq9/history/:user_id", (req, res) => {
    const userId = req.params.user_id;

    const sql = `
        SELECT r.id, a.code, a.title as assessment_title, r.total_score, r.result_text, r.recommended_action, r.created_at 
        FROM assessment_results r
        JOIN assessments a ON r.assessment_id = a.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
    `;
    pool.query(sql, [userId], (error, results) => {
        if (error) return res.json({ result: false, message: error.message });
        
        const mappedResults = results.map(item => ({
            id: item.id,
            total_score: item.total_score,
            result_text: `[${item.code.toUpperCase()}] ${item.result_text}`,
            recommended_action: item.recommended_action,
            created_at: item.created_at
        }));
        res.json({ result: true, data: mappedResults });
    });
});

// ฟีดเข้า Dashboard ทั้งระบบ
app.get("/api/phq9/all", (req, res) => {
    const sql = `
        SELECT r.id, r.user_id, a.code, r.total_score, r.result_text, r.recommended_action, r.created_at 
        FROM assessment_results r
        JOIN assessments a ON r.assessment_id = a.id
        ORDER BY r.created_at DESC
    `;
    pool.query(sql, (error, results) => {
        if (error) return res.json({ result: false, message: error.message });
        res.json({ result: true, data: results });
    });
});

// ========================================================
// 🛠️ ADMIN CONTROL PANEL API ENDPOINTS (MySQL CRUD)
// ========================================================

// [READ] ดึงรายการก้อนใหญ่ (แบบประเมินทั้งหมด)
app.get("/api/admin/assessments", (req, res) => {
    pool.query("SELECT * FROM assessments ORDER BY id ASC", (err, data) => {
        if (err) return res.json({ result: false, message: err.message });
        res.json({ result: true, data });
    });
});

// [CREATE] เพิ่มหัวข้อฟอร์มแบบประเมินใหม่
app.post("/api/admin/assessments", (req, res) => {
    const { code, title, description } = req.body;
    pool.query("INSERT INTO assessments (code, title, description) VALUES (?, ?, ?)", [code.toLowerCase(), title, description], (err) => {
        if (err) return res.json({ result: false, message: err.message });
        res.json({ result: true, message: "เพิ่มแบบประเมินสำเร็จ" });
    });
});

// [DELETE] ลบหัวข้อแบบประเมิน (Cascade จะทำลายคลังคำถามและผลคะแนนที่ผูกภายในออกให้หมด)
app.delete("/api/admin/assessments/:id", (req, res) => {
    pool.query("DELETE FROM assessments WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.json({ result: false, message: err.message });
        res.json({ result: true, message: "ลบแบบประเมินสำเร็จ" });
    });
});

// [READ] ดึงข้อคำถามย่อยทั้งหมดจำแนกตามไอดีแบบประเมิน
app.get("/api/admin/questions/:assessment_id", (req, res) => {
    pool.query("SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY question_number ASC", [req.params.assessment_id], (err, data) => {
        if (err) return res.json({ result: false, message: err.message });
        res.json({ result: true, data });
    });
});

// [CREATE] เพิ่มข้อคำถามใหม่ยัดลงโครงสร้างฟอร์มนั้นๆ
app.post("/api/admin/questions", (req, res) => {
    const { assessment_id, question_number, question_text } = req.body;
    pool.query("INSERT INTO assessment_questions (assessment_id, question_number, question_text) VALUES (?, ?, ?)", [assessment_id, question_number, question_text], (err) => {
        if (err) return res.json({ result: false, message: err.message });
        res.json({ result: true, message: "เพิ่มคำถามสำเร็จ" });
    });
});

// [UPDATE] แก้ไขเนื้อความข้อความคำถามย่อยรายข้อ
app.put("/api/admin/questions/:id", (req, res) => {
    const { question_text } = req.body;
    pool.query("UPDATE assessment_questions SET question_text = ? WHERE id = ?", [question_text, req.params.id], (err) => {
        if (err) return res.json({ result: false, message: err.message });
        res.json({ result: true, message: "แก้ไขคำถามสำเร็จ" });
    });
});

// [DELETE] ลบคำถามย่อยรายข้อออกจากสารบบ
app.delete("/api/admin/questions/:id", (req, res) => {
    pool.query("DELETE FROM assessment_questions WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.json({ result: false, message: err.message });
        res.json({ result: true, message: "ลบคำถามสำเร็จ" });
    });
});

app.listen(port, () => {
    console.log(`Dynamic Assessment backend listening at http://localhost:${port}`);
});