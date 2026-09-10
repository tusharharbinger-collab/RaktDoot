'use strict';
const { Router } = require('express');
const controller = require('./assignments.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/driver/active', requireRole('driver'), controller.getActiveAssignment);
router.get('/', requireRole('manager', 'admin'), controller.getAllAssignments);
router.get('/:id', requireRole('manager', 'admin', 'driver'), controller.getAssignmentById);
router.post('/', requireRole('manager', 'admin'), controller.createAssignment);
router.put('/:id', requireRole('manager', 'admin'), controller.updateAssignmentDetails);
router.patch('/:id/status', requireRole('manager', 'admin', 'driver'), controller.updateAssignmentStatus);

module.exports = router;
