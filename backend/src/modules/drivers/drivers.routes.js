'use strict';
const { Router } = require('express');
const controller = require('./drivers.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();

// All driver routes require authentication
router.use(authenticate);

router.get('/', requireRole('manager', 'admin'), controller.getAllDrivers);
router.patch('/profile', requireRole('driver', 'manager', 'admin'), controller.updateProfile);
router.put('/profile', requireRole('driver', 'manager', 'admin'), controller.updateProfile);
router.get('/:id', requireRole('manager', 'admin', 'driver'), controller.getDriverById);
router.put('/status', requireRole('driver', 'manager', 'admin'), controller.updateStatus);
router.post('/push-token', requireRole('driver'), controller.registerPushToken);

module.exports = router;
