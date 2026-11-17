const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

module.exports = async function demo({ db, origin, task }) {
    const caseId = randomUUID().slice(0, 8);
    const createdIds = [];
    const sample = {
        name: 'Диана (группа 478)', email: `diana-${caseId}@example.com`,
        group_name: 'ББМО-01-23', age: 20, course: 2,
    };

    async function request(method, path, expected, payload, report) {
        const response = await fetch(`${origin}/api/users${path}`, {
            method,
            ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
        });
        const result = await response.json();
        const group = decodeURIComponent(response.headers.get('x-group'));
        assert.equal(response.status, expected, JSON.stringify(result));
        assert.equal(group, 'ББМО-01-23');
        console.log(`${method} /api/users${decodeURIComponent(path)} → HTTP ${response.status}`);
        if (report) console.log(report(result, group));
        if (response.status === 201) createdIds.push(result.data._id);
        return result;
    }

    const create = (data = sample) => request('POST', '', 201, data, result =>
        `Пользователь: ${result.data.name} | _id: ${result.data._id}`);

    try {
        if (!task || task === '1') {
            const { data: user } = await create();
            await request('GET', '', 200, null, (result, group) =>
                `Количество: ${result.pagination.total} | X-Group: ${group}`);
            await request('GET', `/${user._id}`, 200, null, result => result.data.name);
            const updated = await request('PUT', `/${user._id}`, 200, { age: 21 }, result => `Возраст: ${result.data.age}`);
            assert.equal(updated.data.age, 21);
            await request('DELETE', `/${user._id}`, 200, null, result => result.message);
            await request('GET', `/${user._id}`, 404, null, result => JSON.stringify(result));
        }

        if (!task || task === '2') {
            await create();
            await request('POST', '', 400, { ...sample, name: 'Д', email: 'invalid' },
                result => result.details.map(error => `Joi [${error.field}] ${error.message}`).join('\n'));
            await request('POST', '', 409, sample, result => JSON.stringify(result));
        }

        if (!task || task === '3') {
            const fixtures = [
                ['Диана', 20, 2, 'ББМО-01-23'], ['Иван', 21, 2, 'ББМО-01-23'],
                ['Мария', 19, 2, 'ББМО-01-23'], ['Пётр', 22, 3, 'ББМО-01-23'],
                ['Алексей', 18, 1, 'ББМО-02-23'],
            ].map(([name, age, course, group_name], index) => ({
                name, age, course, group_name, email: `demo-${caseId}-${index}@example.com`,
            }));
            const { ObjectId } = require('mongodb');
            const ids = fixtures.map(() => new ObjectId());
            await db.collection('users').insertMany(fixtures.map((fixture, index) => ({
                ...fixture, _id: ids[index], created_at: new Date(),
            })));
            createdIds.push(...ids.map(id => id.toHexString()));
            const summarize = result => [
                JSON.stringify(result.pagination),
                ...result.data.map(user => `  ${user.name} | возраст ${user.age} | курс ${user.course} | ${user.group_name}`),
            ].join('\n');
            await request('GET', '?page=1&limit=2', 200, null, summarize);
            await request('GET', '?page=2&limit=2', 200, null, summarize);
            const filter = new URLSearchParams({
                group_name: 'ББМО-01-23', course: '2', age_min: '18', age_max: '21', sort: '-age',
            });
            const result = await request('GET', `?${filter}`, 200, null, summarize);
            assert.ok(result.data.some(user => user.name === 'Диана'));
            assert.ok(result.data.every(user => user.course === 2 && user.age >= 18 && user.age <= 21));
            await request('GET', '?page=0', 400, null, body => JSON.stringify(body));
        }
    } finally {
        const { ObjectId } = require('mongodb');
        await db.collection('users').deleteMany({ _id: { $in: createdIds.map(id => new ObjectId(id)) } });
    }
};
