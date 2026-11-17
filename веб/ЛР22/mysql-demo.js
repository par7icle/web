require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'student',
    password: process.env.DB_PASS || 'student_pass123',
    database: process.env.DB_NAME || 'bbmo_01_23'
};

async function runTask1() {
    console.log('=== ЗАДАНИЕ 1: ОДИНОЧНОЕ СОЕДИНЕНИЕ И ПУЛ ===\n');
    
    // 1. Одиночное соединение
    console.log('--- 1. Одиночное соединение (createConnection) ---');
    try {
        const conn = await mysql.createConnection(config);
        console.log('✔ Подключение установлено');
        const [rows] = await conn.execute('SELECT VERSION() AS ver, DATABASE() AS db, USER() AS usr');
        console.log(`Версия MySQL: ${rows[0].ver}`);
        console.log(`Текущая БД: ${rows[0].db}`);
        console.log(`Пользователь: ${rows[0].usr}`);
        await conn.end();
        console.log('✖ Соединение закрыто\n');
    } catch (e) {
        console.error('Ошибка одиночного соединения:', e.message);
    }

    // 2. Пул соединений
    console.log('--- 2. Пул соединений (createPool) ---');
    const pool = mysql.createPool({ ...config, connectionLimit: 10 });
    console.log('✔ Пул создан (лимит: 10)');
    const [rowsPool] = await pool.query('SELECT VERSION() AS ver, DATABASE() AS db');
    console.log(`Версия MySQL: ${rowsPool[0].ver}`);
    console.log(`Текущая БД: ${rowsPool[0].db}`);
    console.log('Максимум соединений в пуле: 10');
    console.log('✔ Пул готов к работе\n');

    // 3. Ошибка авторизации
    console.log('--- 3. Демонстрация ошибки подключения (неверный пароль) ---');
    try {
        const badConn = await mysql.createConnection({ ...config, password: 'wrong_password_123' });
        await badConn.end();
    } catch (err) {
        console.log(`✖ Код ошибки: [${err.code}]`);
        console.log(`Сообщение: ${err.message}\n`);
    }

    await pool.end();
}

async function runTask2() {
    console.log('=== ЗАДАНИЕ 2: СОЗДАНИЕ ТАБЛИЦЫ И CRUD-ОПЕРАЦИИ ===\n');
    const pool = mysql.createPool({ ...config, connectionLimit: 10 });

    try {
        // 1. Создание таблицы
        console.log('--- 1. Создание таблицы students ---');
        await pool.query('DROP TABLE IF EXISTS students');
        await pool.query(`
            CREATE TABLE students (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                group_name VARCHAR(20) NOT NULL,
                course INT NOT NULL,
                grade DECIMAL(3, 2) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✔ Таблица students успешно создана');

        // 2. INSERT
        console.log('\n--- 2. INSERT (Добавление студентов) ---');
        const [res1] = await pool.execute(
            'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
            ['Диана', 'ББМО-01-23', 2, 4.95]
        );
        console.log(`✔ Добавлен студент 1: insertId=${res1.insertId}, affectedRows=${res1.affectedRows}`);

        const [res2] = await pool.execute(
            'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
            ['Мария Иванова', 'ББМО-01-23', 2, 3.80]
        );
        console.log(`✔ Добавлен студент 2: insertId=${res2.insertId}, affectedRows=${res2.affectedRows}`);

        const [res3] = await pool.execute(
            'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
            ['Петр Сидоров', 'ББМО-01-23', 2, 4.20]
        );
        console.log(`✔ Добавлен студент 3: insertId=${res3.insertId}, affectedRows=${res3.affectedRows}`);

        // 3. SELECT с фильтром и сортировкой
        console.log('\n--- 3. SELECT (Группа ББМО-01-23, сортировка по grade DESC) ---');
        const [students] = await pool.execute(
            'SELECT id, name, group_name, course, grade FROM students WHERE group_name = ? ORDER BY grade DESC',
            ['ББМО-01-23']
        );
        students.forEach(s => {
            console.log(`  id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${parseFloat(s.grade).toFixed(2)}`);
        });

        // 4. UPDATE с проверкой affectedRows и changedRows
        console.log('\n--- 4. UPDATE ---');
        const [upd1] = await pool.execute('UPDATE students SET grade = ? WHERE id = ?', [5.00, 1]);
        console.log(`✔ Обновлён студент id=1: affectedRows=${upd1.affectedRows}, changedRows=${upd1.changedRows}`);
        const [upd2] = await pool.execute('UPDATE students SET grade = ? WHERE id = ?', [5.00, 1]);
        console.log(`✔ Повторное обновление того же значения: affectedRows=${upd2.affectedRows}, changedRows=${upd2.changedRows}`);

        // 5. DELETE
        console.log('\n--- 5. DELETE ---');
        const [delRes] = await pool.execute('DELETE FROM students WHERE id = ?', [2]);
        console.log(`✔ Удалён студент id=2: affectedRows=${delRes.affectedRows}`);

        // 6. Защита от SQL-инъекций
        console.log('\n--- 6. Защита от SQL-инъекций ---');
        const maliciousInput = "'; DROP TABLE students; --";
        console.log(`Попытка инъекции: "${maliciousInput}"`);
        const [injRes] = await pool.execute('SELECT * FROM students WHERE name = ?', [maliciousInput]);
        console.log(`✔ Параметризованный запрос безопасен (найдено совпадений: ${injRes.length})`);
        const [checkTable] = await pool.query('SHOW TABLES LIKE "students"');
        console.log(`Таблица students существует: ${checkTable.length === 1 ? 'да' : 'нет'}`);

    } finally {
        await pool.end();
    }
}

async function runTask3() {
    console.log('=== ЗАДАНИЕ 3: ОБРАБОТКА ОШИБОК И ТРАНЗАКЦИИ ===\n');
    const pool = mysql.createPool({ ...config, connectionLimit: 10 });

    try {
        console.log('--- 1. Категории ошибок MySQL ---');
        // 1. ECONNREFUSED
        try {
            const badHost = await mysql.createConnection({ ...config, port: 9999, connectTimeout: 1000 });
            await badHost.end();
        } catch (e) {
            console.log(`[${e.code || 'ECONNREFUSED'}] Ошибка сети: сервер недоступен на localhost:9999`);
        }

        // 2. ER_ACCESS_DENIED_ERROR
        try {
            const badAuth = await mysql.createConnection({ ...config, user: 'fake_user' });
            await badAuth.end();
        } catch (e) {
            console.log(`[${e.code}] Ошибка аутентификации: неверный пользователь или пароль`);
        }

        // 3. ER_PARSE_ERROR
        try {
            await pool.query('SELECT * FRM students');
        } catch (e) {
            console.log(`[${e.code}] Синтаксическая ошибка SQL: ошибочное ключевое слово FRM`);
        }

        // 4. ER_DUP_ENTRY
        try {
            await pool.execute('INSERT INTO students (id, name, group_name, course, grade) VALUES (1, "Тест", "ББМО", 1, 4.0)');
            await pool.execute('INSERT INTO students (id, name, group_name, course, grade) VALUES (1, "Тест Дубль", "ББМО", 1, 4.0)');
        } catch (e) {
            console.log(`[${e.code}] Дублирование уникального ключа: попытка вставить существующий id=1`);
        }

        // 5. ER_BAD_NULL_ERROR
        try {
            await pool.execute('INSERT INTO students (name, group_name, course, grade) VALUES (NULL, "ББМО", 1, 4.0)');
        } catch (e) {
            console.log(`[${e.code}] NULL в NOT NULL столбце: столбец name не может быть NULL`);
        }

        // 2. Транзакции
        console.log('\n--- 2. Демонстрация транзакций (COMMIT / ROLLBACK) ---');
        const conn = await pool.getConnection();
        try {
            console.log('Старт транзакции (beginTransaction)...');
            await conn.beginTransaction();

            await conn.execute('INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
                ['Транзакционный Студент 1', 'ББМО-01-23', 2, 4.70]);
            await conn.execute('INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
                ['Транзакционный Студент 2', 'ББМО-01-23', 2, 4.85]);

            await conn.commit();
            console.log('✔ Транзакция успешно зафиксирована (COMMIT)');
        } catch (err) {
            await conn.rollback();
            console.error('✖ Ошибка транзакции, выполнен ROLLBACK:', err.message);
        }

        // Откатываемая транзакция
        try {
            console.log('\nДемонстрация отката транзакции при сбое...');
            await conn.beginTransaction();
            await conn.execute('INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
                ['Студент до ошибки', 'ББМО-01-23', 2, 4.50]);
            
            // Искусственная ошибка дублирования ключа
            await conn.execute('INSERT INTO students (id, name, group_name, course, grade) VALUES (1, "Дубль", "ББМО", 1, 4.0)');
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            console.log('✔ Произошла ошибка, транзакция корректно откатана (ROLLBACK)');
            const [[result]] = await conn.execute('SELECT COUNT(*) AS total FROM students WHERE name = ?', ['Студент до ошибки']);
            console.log(`Записей «Студент до ошибки» после ROLLBACK: ${result.total}`);
        } finally {
            conn.release();
            console.log('✔ Соединение возвращено в пул (connection.release())');
        }

    } finally {
        await pool.end();
    }
}

async function main() {
    const arg = process.argv[2] || '--all';
    if (arg === '--task1' || arg === '1') await runTask1();
    else if (arg === '--task2' || arg === '2') await runTask2();
    else if (arg === '--task3' || arg === '3') await runTask3();
    else {
        await runTask1();
        await runTask2();
        await runTask3();
    }
}

main().catch(console.error);
