const os = require('os');

const GROUP = "478"; // ББМО-01-23 / 478

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h} ч ${m} мин ${s} сек`;
}

function maskMac(mac) {
    if (!mac || mac === '00:00:00:00:00:00') return 'AA:BB:CC:**:**:**';
    const parts = mac.split(':');
    if (parts.length === 6) {
        return `${parts[0]}:${parts[1]}:${parts[2]}:**:**:**`;
    }
    return 'AA:BB:CC:**:**:**';
}

function showTask1() {
    console.log(`=== Информация о системе (группа ${GROUP}) ===`);
    const platform = os.platform();
    console.log(`Платформа:      ${platform}`);
    console.log(`Тип ОС:         ${os.type()}`);
    console.log(`Архитектура:    ${os.arch()}`);
    console.log(`Версия ОС:      ${os.release()}`);
    console.log(`Имя хоста:      ${os.hostname()}`);
    console.log(`Время работы:   ${formatUptime(os.uptime())}\n`);

    if (platform === 'win32') {
        console.log("Вы работаете в Windows");
    } else if (platform === 'linux') {
        console.log("Вы работаете в Linux");
    } else if (platform === 'darwin') {
        console.log("Вы работаете в macOS");
    } else {
        console.log("Неизвестная платформа");
    }
}

function showTask2() {
    console.log(`=== Ресурсы системы (группа ${GROUP}) ===`);
    const cpus = os.cpus();
    const coresCount = cpus.length;
    const model = cpus.length > 0 ? cpus[0].model : 'Unknown';
    let totalSpeed = 0;

    console.log(`Процессор:`);
    console.log(`  Модель:            ${model.trim()}`);
    console.log(`  Количество ядер:   ${coresCount}`);
    console.log(`  Частоты ядер:`);
    cpus.slice(0, 8).forEach((cpu, i) => {
        console.log(`    Ядро #${i + 1}: ${cpu.speed} МГц`);
        totalSpeed += cpu.speed;
    });
    if (cpus.length > 8) {
        console.log(`    ... и еще ${cpus.length - 8} ядер`);
        for (let i = 8; i < cpus.length; i++) totalSpeed += cpus[i].speed;
    }
    const avgSpeed = (totalSpeed / coresCount).toFixed(1);
    console.log(`  Средняя частота:   ${avgSpeed} МГц\n`);

    const totalMem = os.totalmem() / (1024 ** 3);
    const freeMem = os.freemem() / (1024 ** 3);
    const usedPercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

    console.log(`Оперативная память:`);
    console.log(`  Всего памяти:      ${totalMem.toFixed(2)} ГБ`);
    console.log(`  Свободно памяти:   ${freeMem.toFixed(2)} ГБ`);
    console.log(`  Использование:     ${usedPercent}%`);

    if ((freeMem / totalMem) < 0.20) {
        console.log(`  ⚠ ВНИМАНИЕ: Свободной памяти менее 20%!`);
    }

    console.log(`\nСредняя загрузка системы:`);
    const load = os.loadavg();
    if (os.platform() === 'win32') {
        console.log(`  1 мин: ${load[0]} | 5 мин: ${load[1]} | 15 мин: ${load[2]} (Для Windows: недоступно в API ОС)`);
    } else {
        console.log(`  1 мин: ${load[0].toFixed(2)} | 5 мин: ${load[1].toFixed(2)} | 15 мин: ${load[2].toFixed(2)}`);
    }
}

function showTask3() {
    console.log(`=== Сетевые интерфейсы ===`);
    const nets = os.networkInterfaces();
    let totalInterfaces = 0;
    let primaryInterface = null;

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4') {
                totalInterfaces++;
                const isInternal = net.internal ? 'да' : 'нет';
                console.log(`Интерфейс:    ${name}`);
                console.log(`  IPv4:       ${net.address}`);
                console.log(`  MAC:        ${maskMac(net.mac)}`);
                console.log(`  Внутренний: ${isInternal}\n`);
                if (!net.internal && !primaryInterface) {
                    primaryInterface = { name, ip: net.address };
                }
            }
        }
    }

    console.log(`Всего интерфейсов:    ${totalInterfaces}`);
    if (primaryInterface) {
        console.log(`Основной интерфейс:   ${primaryInterface.name} (${primaryInterface.ip})`);
    }

    console.log(`\n=== Информация о пользователе ===`);
    const user = os.userInfo();
    console.log(`Имя пользователя:     ${user.username}`);
    console.log(`UID:                  ${user.uid}`);
    console.log(`Домашняя директория:  ${user.homedir}`);
    console.log(`Группа:               ${GROUP}`);
    const isRoot = user.username.toLowerCase() === 'root' || user.uid === 0 ? 'да' : 'нет';
    console.log(`Проверка root:        ${isRoot}`);
}

const mode = process.argv[2] || 'all';

if (mode === 'info') {
    showTask1();
} else if (mode === 'resources') {
    showTask2();
} else if (mode === 'network') {
    showTask3();
} else {
    showTask1();
    console.log("\n------------------------------------------------------------\n");
    showTask2();
    console.log("\n------------------------------------------------------------\n");
    showTask3();
}
