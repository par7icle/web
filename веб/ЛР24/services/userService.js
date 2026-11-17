const Joi = require('joi');
const User = require('../models/user');

const group = Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/);
const age = Joi.number().integer().min(16).max(100);
const course = Joi.number().integer().min(1).max(6);
const fields = {
    name: Joi.string().trim().min(2).max(100),
    email: Joi.string().trim().lowercase().email({ tlds: false }),
    group_name: group,
    age,
    course,
};
const update = Joi.object(fields).min(1);
const create = update.fork(['name', 'email', 'group_name', 'age'], field => field.required());
const filters = Joi.object({
    group_name: group,
    course,
    age_min: age,
    age_max: Joi.when('age_min', { is: Joi.exist(), then: age.min(Joi.ref('age_min')), otherwise: age }),
    page: Joi.number().integer().min(1).max(1000000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('name', '-name', 'age', '-age', 'created_at', '-created_at').default('name'),
});

function validate(schema, input) {
    const result = schema.validate(input, { abortEarly: false });
    if (result.error) {
        throw Object.assign(new Error('Validation failed'), {
            status: 400,
            details: result.error.details.map(({ path, message }) => ({ field: path.join('.'), message })),
        });
    }
    return result.value;
}

function requireUser(user) {
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    return user;
}

class UserService {
    static getAllUsers(db, query) {
        console.log('[SERVICE] Проверка фильтров, сортировки и пагинации');
        return User.findAll(db, validate(filters, query));
    }

    static async getUserById(db, id) {
        return requireUser(await User.findById(db, id));
    }

    static async createUser(db, data) {
        console.log('[SERVICE] Валидация нового пользователя');
        const user = validate(create, data);
        console.log('[SERVICE] Проверка уникальности email');
        if (await User.findByEmail(db, user.email)) {
            throw Object.assign(new Error('Email already exists'), { status: 409 });
        }
        const created = await User.create(db, user);
        console.log(`[SERVICE] Имитация email-уведомления: ${created.email}`);
        return created;
    }

    static async updateUser(db, id, data) {
        console.log(`[SERVICE] Валидация обновления пользователя: ${id}`);
        return requireUser(await User.update(db, id, validate(update, data)));
    }

    static async deleteUser(db, id) {
        requireUser(await User.delete(db, id));
        return { message: 'User deleted successfully' };
    }
}

module.exports = UserService;
