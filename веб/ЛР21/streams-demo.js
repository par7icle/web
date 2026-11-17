const { Readable, Writable, Transform, pipeline } = require('stream');
const fs = require('fs');
const path = require('path');

const GROUP = 'ББМО-01-23';
const STUDENT = 'Диана (Группа 478 / ББМО-01-23)';

// --- TASK 1: READABLE STREAM ---
function runTask1() {
    console.log('=== Демонстрация Readable-потока ===\n');
    const chunks = [
        `Группа: ${GROUP}\n`,
        `Студент: ${STUDENT}\n`,
        'Лабораторная работа: №21\n',
        'Тема: Потоки данных (Streams) в Node.js и 1С\n'
    ];
    let index = 0;

    const readable = new Readable({
        read(size) {
            if (index < chunks.length) {
                this.push(chunks[index++]);
            } else {
                this.push(null);
            }
        }
    });

    let chunkCount = 0;
    let totalBytes = 0;

    readable.on('data', (chunk) => {
        chunkCount++;
        totalBytes += chunk.length;
        process.stdout.write(`[CHUNK ${chunkCount}] ${chunk.toString()}`);
    });

    readable.on('end', () => {
        console.log('\n[END] Поток завершён');
        console.log(`Всего получено чанков: ${chunkCount}`);
        console.log(`Общий размер данных: ${totalBytes} байт`);
    });

    readable.on('error', (err) => {
        console.error('Ошибка Readable потока:', err);
    });
}

// --- TASK 2: WRITABLE STREAM & BACKPRESSURE ---
function runTask2() {
    console.log('=== Демонстрация Writable-потока и Backpressure ===\n');
    let chunkCount = 0;

    const writable = new Writable({
        highWaterMark: 16, // Маленький буфер 16 байт для симуляции backpressure
        write(chunk, encoding, callback) {
            chunkCount++;
            console.log(`[WRITE] Обработка чанка #${chunkCount} (${chunk.length} байт): "${chunk.toString().trim()}"`);
            setTimeout(() => {
                callback();
            }, 30);
        }
    });

    writable.on('drain', () => {
        console.log('>>> [DRAIN] Буфер освободился, возобновление записи');
    });

    writable.on('finish', () => {
        console.log('\n[FINISH] Все данные успешно записаны в Writable-поток.');
    });

    const messages = [
        'Сообщение 1: Старт потока',
        'Сообщение 2: Пакет данных группы ББМО-01-23',
        'Сообщение 3: Превышение highWaterMark буфера',
        'Сообщение 4: Очередная порция данных',
        'Сообщение 5: Финал потока'
    ];

    let i = 0;
    function writeNext() {
        let ok = true;
        while (i < messages.length && ok) {
            const msg = messages[i];
            i++;
            ok = writable.write(msg + '\n');
            console.log(`Запись "${msg.slice(0, 20)}...": write() вернул ${ok}`);
            if (!ok && i < messages.length) {
                console.log('<<< [BACKPRESSURE] Буфер переполнен (false)! Ожидание события drain...');
                writable.once('drain', writeNext);
                return;
            }
        }
        if (i >= messages.length) {
            writable.end();
        }
    }

    writeNext();
}

// --- TASK 3: PIPE & PIPELINE ---
function runTask3() {
    console.log('=== Демонстрация pipe() и pipeline() ===\n');
    
    const inputPath = path.join(__dirname, 'input.txt');
    const outPipePath = path.join(__dirname, 'output-pipe.txt');
    const outPipelinePath = path.join(__dirname, 'output-pipeline.txt');
    const outChainPath = path.join(__dirname, 'output-chain.txt');

    fs.writeFileSync(inputPath, `Лабораторная работа 21\nГруппа: ${GROUP}\nСтудент: ${STUDENT}\nПотоковая обработка данных.\n`, 'utf-8');

    // 1. Успешный pipe
    console.log('--- 1. Демонстрация успешного pipe() ---');
    console.log(`Чтение: input.txt -> Запись: output-pipe.txt`);
    const r1 = fs.createReadStream(inputPath);
    const w1 = fs.createWriteStream(outPipePath);
    r1.pipe(w1);
    w1.on('finish', () => {
        console.log('✔ Копирование через pipe() завершено. Размер:', fs.statSync(outPipePath).size, 'байт\n');

        // 2. Демонстрация pipe с ошибкой
        console.log('--- 2. Демонстрация pipe() с ошибкой (демонстрация утечки) ---');
        console.log('Чтение: missing-file.txt');
        const rErr = fs.createReadStream('missing-file.txt');
        const wErr = fs.createWriteStream('output-err.txt');
        rErr.pipe(wErr);
        rErr.on('error', (err) => {
            console.log('✖ Ошибка в Readable:', err.code);
            console.log('⚠ Внимание: pipe() НЕ закрыл целевой поток wErr!');
            console.log('⚠ Свойство wErr.closed =', wErr.closed, '(возможна утечка ресурсов)\n');
            wErr.close();

            // 3. Демонстрация pipeline
            runPipelineDemo();
        });
    });

    function runPipelineDemo() {
        console.log('--- 3. Демонстрация безопасного pipeline() ---');
        pipeline(
            fs.createReadStream(inputPath),
            fs.createWriteStream(outPipelinePath),
            (err) => {
                if (err) {
                    console.error('pipeline failed:', err);
                } else {
                    console.log('✔ Копирование через pipeline() успешно завершено');
                }

                // 4. Демонстрация pipeline с ошибкой
                console.log('\n--- 4. Демонстрация pipeline() с ошибкой (автозакрытие) ---');
                const wDest = fs.createWriteStream('output-pipeline-err.txt');
                pipeline(
                    fs.createReadStream('missing-file-pipeline.txt'),
                    wDest,
                    (err) => {
                        console.log('✖ Ошибка перехвачена в callback pipeline:', err.code);
                        console.log('✔ Все потоки автоматически закрыты!');
                        console.log('✔ Свойство wDest.closed =', wDest.closed, '(утечек нет)\n');

                        // 5. Цепочка потоков Transform
                        runChainDemo();
                    }
                );
            }
        );
    }

    function runChainDemo() {
        console.log('--- 5. Цепочка Transform потоков ---');
        console.log('input.txt -> UpperCase -> Prefix [BBMO-01-23] -> output-chain.txt');

        const upperTransform = new Transform({
            transform(chunk, encoding, callback) {
                this.push(chunk.toString().toUpperCase());
                callback();
            }
        });

        const prefixTransform = new Transform({
            transform(chunk, encoding, callback) {
                const prefixed = chunk.toString().split('\n').map(l => l ? `[BBMO-01-23] ${l}` : l).join('\n');
                this.push(prefixed);
                callback();
            }
        });

        pipeline(
            fs.createReadStream(inputPath),
            upperTransform,
            prefixTransform,
            fs.createWriteStream(outChainPath),
            (err) => {
                if (err) console.error(err);
                else {
                    console.log('✔ Цепочка потоков успешно выполнена');
                    console.log('Результат в output-chain.txt:\n' + fs.readFileSync(outChainPath, 'utf-8'));
                }
            }
        );
    }
}

const task = process.argv[2] || '--all';
if (task === '--task1' || task === '1') runTask1();
else if (task === '--task2' || task === '2') runTask2();
else if (task === '--task3' || task === '3') runTask3();
else {
    runTask1();
    setTimeout(() => {
        console.log('\n' + '='.repeat(60) + '\n');
        runTask2();
        setTimeout(() => {
            console.log('\n' + '='.repeat(60) + '\n');
            runTask3();
        }, 300);
    }, 100);
}
