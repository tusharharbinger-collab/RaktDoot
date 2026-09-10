'use strict';
const { Router } = require('express');
const controller = require('./notifications.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/unread-count', requireRole('manager', 'admin'), controller.getUnreadCount);
router.get('/', requireRole('manager', 'admin'), controller.getNotifications);
router.patch('/read-all', requireRole('manager', 'admin'), controller.markAllRead);
router.patch('/:id/read', requireRole('manager', 'admin'), controller.markRead);
router.delete('/clear-all', requireRole('manager', 'admin'), controller.clearAllNotifications);
router.delete('/:id', requireRole('manager', 'admin'), controller.deleteNotification);

module.exports = router;
