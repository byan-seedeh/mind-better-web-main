-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS mindbetter
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE mindbetter;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT DEFAULT 2,
    role_name VARCHAR(50) DEFAULT 'User',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PHQ9 RESULTS
-- =========================
CREATE TABLE phq9_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_score INT NOT NULL,
    result_text TEXT,
    recommended_action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_phq9_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- =========================
-- PHQ9 ANSWERS
-- =========================
CREATE TABLE phq9_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    result_id INT NOT NULL,
    question_number INT NOT NULL,
    score INT NOT NULL,

    CONSTRAINT fk_phq9_result
    FOREIGN KEY (result_id)
    REFERENCES phq9_results(id)
    ON DELETE CASCADE
);

-- =========================
-- ADMIN USER
-- password = 1234
-- =========================
INSERT INTO users (
    username,
    first_name,
    last_name,
    email,
    password_hash,
    role_id,
    role_name
)
VALUES (
    'admin',
    'System',
    'Administrator',
    'admin@test.com',
    MD5('1234'),
    1,
    'Admin'
);

-- =========================
-- TEST USER
-- password = 1234
-- =========================
INSERT INTO users (
    username,
    first_name,
    last_name,
    email,
    password_hash,
    role_id,
    role_name
)
VALUES (
    'user',
    'Test',
    'User',
    'user@test.com',
    MD5('1234'),
    2,
    'User'
);

-- =========================
-- SAMPLE PHQ9 RESULT
-- =========================
INSERT INTO phq9_results (
    user_id,
    total_score,
    result_text,
    recommended_action
)
VALUES (
    2,
    8,
    'มีอาการซึมเศร้าระดับเล็กน้อย',
    'ควรติดตามอาการและประเมินซ้ำ'
);

-- =========================
-- SAMPLE PHQ9 ANSWERS
-- =========================
INSERT INTO phq9_answers (
    result_id,
    question_number,
    score
)
VALUES
(1,1,1),
(1,2,0),
(1,3,1),
(1,4,1),
(1,5,0),
(1,6,1),
(1,7,1),
(1,8,1),
(1,9,2);