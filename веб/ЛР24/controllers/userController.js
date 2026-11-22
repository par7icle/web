const UserService = require('../services/userService');

class UserController {
    static async list(ctx) {
        const result = await UserService.getAllUsers(ctx.db, ctx.query);
        ctx.status = 200;
        ctx.body = result;
    }

    static async get(ctx) {
        const user = await UserService.getUserById(ctx.db, ctx.params.id);
        ctx.status = 200;
        ctx.body = { data: user };
    }

    static async create(ctx) {
        const user = await UserService.createUser(ctx.db, ctx.request.body);
        ctx.status = 201;
        ctx.body = { data: user };
    }

    static async update(ctx) {
        const user = await UserService.updateUser(ctx.db, ctx.params.id, ctx.request.body);
        ctx.status = 200;
        ctx.body = { data: user };
    }

    static async delete(ctx) {
        const res = await UserService.deleteUser(ctx.db, ctx.params.id);
        ctx.status = 200;
        ctx.body = res;
    }
}

module.exports = UserController;
