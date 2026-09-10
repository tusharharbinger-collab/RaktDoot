'use strict';
const { Router } = require('express');
const controller = require('./worklogs.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/stats', requireRole('manager', 'admin'), controller.getStats);
router.get('/:id', requireRole('manager', 'admin', 'driver'), controller.getWorkLogById);
router.get('/', requireRole('manager', 'admin', 'driver'), controller.getAllWorkLogs);

module.exports = router;
