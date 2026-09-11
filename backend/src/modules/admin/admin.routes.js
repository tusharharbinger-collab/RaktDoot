'use strict';
const { Router } = require('express');
const controller = require('./admin.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/users', controller.listUsers);
router.post('/users', controller.createUser);
router.put('/users/:id', controller.updateUser);
router.patch('/users/:id', controller.updateUser);
router.all('/users/:id/password', controller.changeUserPassword);
router.delete('/users/:id', controller.deleteUser);
router.get('/telemetry', controller.getTelemetry);

module.exports = router;
