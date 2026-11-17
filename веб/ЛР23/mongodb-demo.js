const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const crypto = require('crypto');

const { MongoClient } = require('mongodb');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const database = process.env.MONGODB_DB || 'bbmo_01_23';

async function runTask1() {
    console.log('=== ЗАДАНИЕ 1: ПОДКЛЮЧЕНИЕ К MONGODB ===\n');
    const client = new MongoClient(uri, { heartbeatFrequencyMS: 1000, serverSelectionTimeoutMS: 3000 });
    client.on('serverHeartbeatSucceeded', event => {
        console.log(`[HEARTBEAT] ${event.connectionId}: ${event.duration.toFixed(2)} мс`);
    });

    try {
        await client.connect();
        const db = client.db(database);
        const ping = await db.command({ ping: 1 });
        const { version } = await db.command({ buildInfo: 1 });
        const { authInfo } = await db.command({ connectionStatus: 1 });
        console.log(`Подключение установлено. ping: ok=${ping.ok}`);
        console.log(`Версия MongoDB: ${version}`);
        console.log(`База данных: ${db.databaseName}`);
        console.log(`Пользователь: ${authInfo.authenticatedUsers[0]?.user ?? 'без аутентификации'}`);

        const { databases } = await db.admin().listDatabases({ nameOnly: true, authorizedDatabases: true });
        console.log('Доступные БД:', databases.map(item => item.name).join(', '));
        const collections = await db.listCollections({}, { nameOnly: true }).toArray();
        console.log('Коллекции:', collections.map(item => item.name).join(', ') || 'нет');
        await Promise.race([once(client, 'serverHeartbeatSucceeded'), delay(1600, undefined, { ref: false })]);
    } finally {
        await client.close();
    }
    console.log('Соединение закрыто');

    const unavailable = new MongoClient('mongodb://127.0.0.1:1', { serverSelectionTimeoutMS: 750 });
    try {
        await unavailable.connect();
    } catch (error) {
        console.log(`Отказ подключения: [${error.name}] ${error.message}`);
    } finally {
        await unavailable.close();
    }
}

async function withStudents(task) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    const name = `students_demo_${crypto.randomUUID().replaceAll('-', '')}`;
    try {
        await client.connect();
        const students = await client.db(database).createCollection(name);
        try {
            await task(students);
        } finally {
            await students.drop();
        }
    } finally {
        await client.close();
    }
}

async function runTask2(students) {
    console.log('=== ЗАДАНИЕ 2: CRUD-ОПЕРАЦИИ И ПРОЕКЦИИ ===\n');

    // 1. INSERT
    console.log('--- 1. INSERT (insertOne & insertMany) ---');
    const res1 = await students.insertOne({
        name: 'Диана (Группа 478)',
        group_name: 'ББМО-01-23',
        course: 2,
        grade: 4.95
    });
    console.log(`✔ insertOne: insertedId=ObjectId("${res1.insertedId}")`);

    const manyDocs = [
        { name: 'Иван Иванов', group_name: 'ББМО-01-23', course: 2, grade: 4.50 },
        { name: 'Мария Смирнова', group_name: 'ББМО-01-23', course: 2, grade: 3.80 },
        { name: 'Петр Сидоров', group_name: 'ББМО-01-23', course: 2, grade: 4.20 },
        { name: 'Алексей Кузнецов', group_name: 'ББМО-02-23', course: 1, grade: 4.10 },
        { name: 'Елена Попова', group_name: 'ББМО-01-23', course: 2, grade: 2.90 }
    ];
    const resMany = await students.insertMany(manyDocs);
    console.log(`✔ insertMany: добавлено ${resMany.insertedCount} документов`);

    // 2. SELECT (find с фильтрами, сортировкой, пагинацией и проекцией)
    console.log('\n--- 2. SELECT (Поиск и фильтрация) ---');
    const allStudents = await students.find().toArray();
    console.log(`Всего документов в коллекции: ${allStudents.length}`);

    const filtered = await students.find({ group_name: 'ББМО-01-23' }).sort({ grade: -1 }).toArray();
    console.log(`Студенты группы ББМО-01-23 (сортировка grade: -1):`);
    filtered.forEach(s => console.log(`  - ${s.name}: курс ${s.course}, балл ${s.grade.toFixed(2)}`));

    console.log('\nПроекция (только name и grade, без _id):');
    const projected = await students.find({}, { projection: { name: 1, grade: 1, _id: 0 } }).limit(3).toArray();
    console.log(projected);

    // 3. UPDATE
    console.log('\n--- 3. UPDATE (updateOne & updateMany) ---');
    const upd1 = await students.updateOne({ name: 'Диана (Группа 478)' }, { $set: { grade: 5.00 } });
    console.log(`✔ updateOne: matchedCount=${upd1.matchedCount}, modifiedCount=${upd1.modifiedCount}`);

    const updMany = await students.updateMany({ group_name: 'ББМО-01-23' }, { $inc: { course: 1 } });
    console.log(`✔ updateMany ($inc: course+1): matchedCount=${updMany.matchedCount}, modifiedCount=${updMany.modifiedCount}`);

    // 4. DELETE
    console.log('\n--- 4. DELETE (deleteOne & deleteMany) ---');
    const del1 = await students.deleteOne({ name: 'Мария Смирнова' });
    console.log(`✔ deleteOne: deletedCount=${del1.deletedCount}`);

    const delMany = await students.deleteMany({ grade: { $lt: 3.0 } });
    console.log(`✔ deleteMany (grade < 3.0): deletedCount=${delMany.deletedCount}`);

}

async function runTask3(students) {
    console.log('\n=== ЗАДАНИЕ 3: КУРСОРЫ, АГРЕГАЦИИ И ИНДЕКСЫ ===\n');

    // Наполним тестовыми данными
    await students.insertMany([
        { name: 'Диана (Группа 478)', group_name: 'ББМО-01-23', course: 3, grade: 5.00 },
        { name: 'Иван Иванов', group_name: 'ББМО-01-23', course: 3, grade: 4.70 },
        { name: 'Петр Сидоров', group_name: 'ББМО-01-23', course: 3, grade: 4.30 },
        { name: 'Ольга Васильева', group_name: 'ББМО-02-23', course: 2, grade: 4.80 },
        { name: 'Дмитрий Федоров', group_name: 'ББМО-02-23', course: 2, grade: 3.90 }
    ]);

    // 1. Итерация через курсор (for await ... of)
    console.log('--- 1. Потоковая итерация через курсор (batchSize: 1000) ---');
    const cursor = students.find().batchSize(1000);
    let count = 0;
    for await (const doc of cursor) {
        count++;
        console.log(`[DOC #${count}] _id=${doc._id.toHexString().slice(0, 8)}... | ${doc.name} (${doc.group_name}) — балл: ${doc.grade}`);
    }
    await cursor.close();
    console.log(`✔ Курсор закрыт, обработано документов: ${count}`);

    // 2. Агрегационный pipeline ($match, $group, $sort)
    console.log('\n--- 2. Aggregation Pipeline ($match, $group, $sort) ---');
    console.log('Расчет среднего балла и численности по группам:');
    const aggResult = await students.aggregate([
        { $match: {} },
        { $group: { _id: '$group_name', avgGrade: { $avg: '$grade' }, studentCount: { $sum: 1 } } },
        { $sort: { avgGrade: -1 } }
    ]).toArray();

    aggResult.forEach(g => {
        console.log(`  Группа: ${g._id} | Ср. балл: ${g.avgGrade} | Студентов: ${g.studentCount}`);
    });

    // 3. Индексы и Explain
    console.log('\n--- 3. Индексы и Explain (executionStats) ---');
    const filter = { group_name: 'ББМО-01-23' };
    const before = await students.find(filter).explain('executionStats');
    console.log(`План до индекса: ${before.executionStats.executionStages.stage}`);
    const idx1 = await students.createIndex({ group_name: 1 });
    console.log(`✔ Создан индекс: ${idx1}`);
    const explain = await students.find(filter).hint(idx1).explain('executionStats');
    const stage = explain.executionStats.executionStages;
    const scan = stage.inputStage ?? stage;
    console.log(`Статистика выполнения explain:`);
    console.log(`  - Stage: ${stage.stage === scan.stage ? scan.stage : `${stage.stage} → ${scan.stage}`}`);
    console.log(`  - Index: ${scan.indexName}`);
    console.log(`  - Execution time: ${explain.executionStats.executionTimeMillis} ms`);
    console.log(`  - Keys examined: ${explain.executionStats.totalKeysExamined}`);

}

async function main() {
    const arg = process.argv[2] || '--all';
    if (arg === '--task1' || arg === '1') await runTask1();
    else if (arg === '--task2' || arg === '2') await withStudents(runTask2);
    else if (arg === '--task3' || arg === '3') await withStudents(runTask3);
    else {
        await runTask1();
        await withStudents(runTask2);
        await withStudents(runTask3);
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
