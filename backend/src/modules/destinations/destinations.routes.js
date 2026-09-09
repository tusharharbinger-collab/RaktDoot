'use strict';
const { Router } = require('express');
const controller = require('./destinations.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/', requireRole('manager', 'admin'), controller.getAllDestinations);
router.get('/home', requireRole('driver', 'manager', 'admin'), controller.getHomeDestination);
router.post('/', requireRole('manager', 'admin'), controller.createDestination);
router.get('/:id', requireRole('manager', 'admin'), controller.getDestinationById);
router.patch('/:id', requireRole('manager', 'admin'), controller.updateDestination);
router.delete('/:id', requireRole('manager', 'admin'), controller.deleteDestination);

module.exports = router;
