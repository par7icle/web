const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const { once } = require('node:events');
const { connect } = require('./db');
const users = require('./routes/users');

const GROUP = 'ББМО-01-23';

function createApp(db) {
    const app = new Koa();
    app.context.db = db;
    app.use(async (ctx, next) => {
        ctx.set('X-Group', encodeURIComponent(GROUP));
        console.log(`[REQUEST] ${ctx.method} ${ctx.path}`);
        try {
            await next();
            if (!ctx.body && ctx.status === 404) ctx.throw(404, 'Route not found');
        } catch (error) {
            const status = error.code === 11000 ? 409 : error.status || 500;
            const message = error.code === 11000 ? 'Email already exists' : error.message;
            ctx.status = status;
            ctx.body = {
                error: status >= 500 ? 'Internal server error' : message,
                status,
                ...(error.details ? { details: error.details } : {}),
            };
            if (status >= 500) ctx.app.emit('error', error, ctx);
        } finally {
            console.log(`[RESPONSE] ${ctx.method} ${ctx.path} → ${ctx.status}`);
        }
    });
    app.use(bodyParser({ enableTypes: ['json'] }));
    app.use(users.routes()).use(users.allowedMethods());
    return app;
}

async function main() {
    const testing = process.argv.includes('--test');
    const { client, db } = await connect();
    const server = createApp(db).listen(testing ? 0 : Number(process.env.PORT ?? 3000), '127.0.0.1');
    server.once('close', () => void client.close());
    try {
        await once(server, 'listening');
        const origin = `http://127.0.0.1:${server.address().port}`;
        console.log(`Koa: ${origin} | MongoDB: ${db.databaseName}`);
        if (testing) await require('./demo')({ db, origin, task: process.argv[3] });
    } finally {
        if (testing || !server.listening) {
            server.close();
            await client.close();
        }
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = { createApp };
