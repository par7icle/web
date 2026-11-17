const Router = require('@koa/router');
const controller = require('../controllers/userController');

const users = new Router({ prefix: '/api/users' });
users.get('/', controller.list);
users.get('/:id', controller.get);
users.post('/', controller.create);
users.put('/:id', controller.update);
users.delete('/:id', controller.delete);

module.exports = users;
