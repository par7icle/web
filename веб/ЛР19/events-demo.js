const EventEmitter = require('events');

const GROUP = "478"; // ББМО-01-23 / 478

console.log("============================================================");
console.log(`ЛАБОРАТОРНАЯ РАБОТА №19: МОДУЛЬ EVENTS (ГРУППА ${GROUP})`);
console.log("============================================================\n");

// ============================================================
// ЗАДАНИЕ 1: Создание простого EventEmitter и подписка
// ============================================================
console.log("--- ЗАДАНИЕ 1: Базовый EventEmitter (greet, info) ---");
const emitter1 = new EventEmitter();

emitter1.on('greet', (name) => {
    console.log(`[Событие greet] Привет, ${name}! Рады видеть вас в системе.`);
});

emitter1.on('info', () => {
    console.log(`[Событие info] Информация: учебная группа ${GROUP}, лабораторная работа №19.`);
});

emitter1.emit('greet', 'Иван');
emitter1.emit('info');
console.log();

// ============================================================
// ЗАДАНИЕ 2: Разница между on, once и removeListener
// ============================================================
console.log("--- ЗАДАНИЕ 2: Управление подписками (on vs once, removeListener) ---");
const ticker = new EventEmitter();

let onCount = 0;
let onceCount = 0;

function tickListener() {
    onCount++;
    console.log(`  -> Слушатель .on(): вызов #${onCount}`);
}

ticker.on('tick', tickListener);

ticker.once('tick', () => {
    onceCount++;
    console.log(`  -> Слушатель .once(): вызов #${onceCount} (сработает только один раз)`);
});

console.log("Эмитим событие 'tick' 3 раза подряд:");
console.log("Итерация 1:");
ticker.emit('tick');
console.log("Итерация 2:");
ticker.emit('tick');
console.log("Итерация 3:");
ticker.emit('tick');

console.log(`Итог вызовов: .on = ${onCount} раза, .once = ${onceCount} раз.`);

console.log("Отписываем слушатель tickListener через removeListener()...");
ticker.removeListener('tick', tickListener);
console.log("Слушателей события 'tick' после отписки:", ticker.listenerCount('tick'));
ticker.emit('tick'); // Ничего не вызовется
console.log();

// ============================================================
// ЗАДАНИЕ 3: Наследование от EventEmitter (DatabaseConnection)
// ============================================================
console.log("--- ЗАДАНИЕ 3: Наследование от EventEmitter (DatabaseConnection) ---");

class DatabaseConnection extends EventEmitter {
    constructor(dbName) {
        super();
        this.dbName = dbName;
        this.isConnected = false;
    }

    connect() {
        console.log(`[DB] Попытка подключения к базе "${this.dbName}"...`);
        setTimeout(() => {
            this.isConnected = true;
            this.emit('connect', { dbName: this.dbName, status: 'CONNECTED', timestamp: new Date().toISOString() });
        }, 100);
    }

    query(sql) {
        if (!this.isConnected) {
            this.emit('error', new Error('Невозможно выполнить запрос: соединение с БД отсутствует!'));
            return;
        }
        console.log(`[DB] Выполнение запроса: "${sql}"`);
        const fakeRows = [
            { id: 1, name: 'Иван Иванов', group: GROUP, grade: 4.8 },
            { id: 2, name: 'Анна Смирнова', group: GROUP, grade: 5.0 }
        ];
        this.emit('query', { sql, rows: fakeRows, count: fakeRows.length });
    }

    close() {
        if (this.isConnected) {
            this.isConnected = false;
            this.emit('close', { dbName: this.dbName, status: 'CLOSED' });
        }
    }
}

const db = new DatabaseConnection("StudentDB_1C");

db.on('connect', (info) => {
    console.log(`✓ Событие [connect]: Успешно подключено к "${info.dbName}" в ${info.timestamp}`);
    // После подключения выполняем запрос
    db.query("SELECT * FROM students WHERE group = '478'");
});

db.on('query', (res) => {
    console.log(`✓ Событие [query]: Получено ${res.count} записей по запросу:`);
    console.log(res.rows);
    // Закрываем соединение
    db.close();
});

db.on('close', (info) => {
    console.log(`✓ Событие [close]: Соединение с "${info.dbName}" успешно закрыто.`);
});

db.on('error', (err) => {
    console.error(`✖ Событие [error]: ${err.message}`);
});

db.connect();
