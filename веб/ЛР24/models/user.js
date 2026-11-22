const { ObjectId } = require('mongodb');

function idQuery(id) {
    return { _id: ObjectId.isValid(id) ? new ObjectId(id) : id };
}

class User {
    static async findAll(db, query) {
        const { group_name, course, age_min, age_max, sort, page, limit } = query;
        const filter = {};
        if (group_name) filter.group_name = group_name;
        if (course !== undefined) filter.course = course;
        if (age_min !== undefined || age_max !== undefined) {
            filter.age = {};
            if (age_min !== undefined) filter.age.$gte = age_min;
            if (age_max !== undefined) filter.age.$lte = age_max;
        }
        const descending = sort.startsWith('-');
        const field = descending ? sort.slice(1) : sort;
        const users = db.collection('users');
        console.log('[MODEL] User.findAll: MongoDB find / countDocuments');
        const [data, total] = await Promise.all([
            users.find(filter).sort({ [field]: descending ? -1 : 1, _id: 1 })
                .skip((page - 1) * limit).limit(limit).toArray(),
            users.countDocuments(filter),
        ]);
        return { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static findById(db, id) {
        console.log(`[MODEL] User.findById: ${id}`);
        return db.collection('users').findOne(idQuery(id));
    }

    static findByEmail(db, email) {
        console.log(`[MODEL] User.findByEmail: ${email}`);
        return db.collection('users').findOne({ email });
    }

    static async create(db, data) {
        console.log('[MODEL] User.create: MongoDB insertOne');
        const user = { ...data, created_at: new Date() };
        const { insertedId } = await db.collection('users').insertOne(user);
        return { ...user, _id: insertedId };
    }

    static update(db, id, data) {
        console.log(`[MODEL] User.update: ${id}`);
        return db.collection('users').findOneAndUpdate(idQuery(id), { $set: data }, { returnDocument: 'after' });
    }

    static async delete(db, id) {
        console.log(`[MODEL] User.delete: ${id}`);
        const { deletedCount } = await db.collection('users').deleteOne(idQuery(id));
        return deletedCount === 1;
    }
}

module.exports = User;
