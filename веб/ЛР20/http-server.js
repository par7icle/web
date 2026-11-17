const http = require('http');
const url = require('url');

const PORT = 3000;
const GROUP = 'ББМО-01-23';
const GROUP_HEADER = encodeURIComponent(GROUP);
const STUDENT = 'Диана (Группа 478 / ББМО-01-23)';
const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

function formatTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Helper to log requests
    const logRequest = (status) => {
        console.log(`[${formatTimestamp()}] ${method} ${pathname} ${status}`);
    };

    // Helper to collect body stream
    const readBody = (callback) => {
        let chunks = [];
        let totalSize = 0;
        let tooLarge = false;

        req.on('data', (chunk) => {
            totalSize += chunk.length;
            if (totalSize > MAX_BODY_SIZE) {
                tooLarge = true;
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Payload Too Large', limit: '1MB' }));
                logRequest(413);
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            if (tooLarge) return;
            const buffer = Buffer.concat(chunks);
            callback(null, buffer);
        });

        req.on('error', (err) => {
            callback(err);
        });
    };

    // Routing
    if (method === 'GET' && pathname === '/') {
        // Task 1: /
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>ЛР20: HTTP Server</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h1>=== Лабораторная работа №20 ===</h1>
    <p><b>Группа:</b> ${GROUP}</p>
    <p><b>Метод:</b> ${method}</p>
    <p><b>URL:</b> ${pathname}</p>
    <p>Сервер на чистом модуле http успешно запущен и обрабатывает маршруты.</p>
</body>
</html>`);
        logRequest(200);
    } else if (method === 'GET' && pathname === '/about') {
        // Task 1: /about
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>О студенте</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h1>=== О студенте ===</h1>
    <p><b>Группа:</b> ${GROUP}</p>
    <p><b>Студент:</b> ${STUDENT}</p>
    <p><b>Дисциплина:</b> Серверная веб-разработка / Интеграция с 1С:Предприятие</p>
</body>
</html>`);
        logRequest(200);
    } else if (method === 'GET' && pathname === '/headers') {
        // Task 2: GET /headers
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const responseData = {
            headers: req.headers,
            method: method,
            url: pathname,
            httpVersion: req.httpVersion
        };
        res.end(JSON.stringify(responseData, null, 2));
        logRequest(200);
    } else if (method === 'GET' && pathname === '/headers/set') {
        // Task 2: GET /headers/set
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Powered-By': '1C-NodeJS-Bridge',
            'X-Group': GROUP_HEADER,
            'Cache-Control': 'no-cache'
        });
        res.end(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Установленные заголовки</title></head>
<body>
    <h2>Заголовки успешно установлены</h2>
    <p>X-Group: ${GROUP}</p>
    <p>X-Powered-By: 1C-NodeJS-Bridge</p>
    <p>Cache-Control: no-cache</p>
</body>
</html>`);
        logRequest(200);
    } else if (method === 'GET' && pathname === '/headers/check') {
        // Task 2: GET /headers/check
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const checkResult = {
            hasContentType: Boolean(req.headers['content-type']),
            hasXGroup: Boolean(req.headers['x-group']),
            hasUnknown: Boolean(req.headers['x-unknown'])
        };
        res.end(JSON.stringify(checkResult, null, 2));
        logRequest(200);
    } else if (method === 'POST' && pathname === '/echo') {
        // Task 3: POST /echo
        readBody((err, buffer) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
                logRequest(500);
                return;
            }
            const contentType = req.headers['content-type'] || 'text/plain';
            if (contentType.includes('application/json')) {
                try {
                    const data = JSON.parse(buffer.toString('utf-8'));
                    data.group = GROUP;
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(data, null, 2));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(buffer);
            }
            logRequest(200);
        });
    } else if (method === 'POST' && pathname === '/form') {
        // Task 3: POST /form
        readBody((err, buffer) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
                logRequest(500);
                return;
            }
            const formString = buffer.toString('utf-8');
            const params = new URLSearchParams(formString);
            const parsedForm = {};
            for (const [key, value] of params.entries()) {
                parsedForm[key] = value;
            }
            parsedForm._parsedAt = formatTimestamp();
            parsedForm._group = GROUP;
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(parsedForm, null, 2));
            logRequest(200);
        });
    } else {
        // Task 1: 404
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>404 Not Found</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h1>=== 404 Not Found ===</h1>
    <p>Путь <b>${pathname}</b> не найден</p>
</body>
</html>`);
        logRequest(404);
    }
});

if (process.argv.includes('--test')) {
    server.listen(PORT, async () => {
        console.log(`Сервер запущен на порту ${PORT}`);
        console.log(`Тестирование эндпоинтов...\n`);
        
        const fetch = (path, options = {}) => new Promise((resolve, reject) => {
            const req = http.request(`http://localhost:${PORT}${path}`, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
            });
            req.on('error', reject);
            if (options.body) req.write(options.body);
            req.end();
        });

        try {
            console.log('=== ТЕСТ 1: МАРШРУТИЗАЦИЯ ===');
            let res = await fetch('/');
            console.log(`GET /: Status ${res.status}`);
            res = await fetch('/about');
            console.log(`GET /about: Status ${res.status}`);
            res = await fetch('/unknown');
            console.log(`GET /unknown: Status ${res.status}`);

            console.log('\n=== ТЕСТ 2: ЗАГОЛОВКИ ===');
            res = await fetch('/headers', { headers: { 'User-Agent': 'Custom-Test-Agent/1.0', 'X-Custom-Test': 'Hello1C' } });
            console.log(`GET /headers:`, JSON.parse(res.body));
            res = await fetch('/headers/set');
            console.log(`GET /headers/set headers:`, {
                'content-type': res.headers['content-type'],
                'x-group': res.headers['x-group'],
                'x-powered-by': res.headers['x-powered-by'],
                'cache-control': res.headers['cache-control']
            });
            res = await fetch('/headers/check', { headers: { 'Content-Type': 'text/plain', 'X-Group': GROUP_HEADER } });
            console.log(`GET /headers/check:`, JSON.parse(res.body));

            console.log('\n=== ТЕСТ 3: ЧТЕНИЕ ТЕЛА (POST) ===');
            res = await fetch('/echo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Привет от 1С и Node.js!', student: 'Диана' })
            });
            console.log(`POST /echo (JSON):`, JSON.parse(res.body));

            res = await fetch('/form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'username=diana478&course=2&discipline=WebDevelopment'
            });
            console.log(`POST /form (urlencoded):`, JSON.parse(res.body));

            console.log('\nВсе тесты успешно завершены!');
        } catch (err) {
            console.error('Ошибка тестов:', err);
        } finally {
            server.close();
            process.exit(0);
        }
    });
} else {
    server.listen(PORT, () => {
        console.log(`Сервер запущен на порту ${PORT}`);
    });
}
