'use strict';
const destinationsService = require('./destinations.service');
const { getIO } = require('../../sockets/socket.handler');

function getAllDestinations(req, res, next) {
  try {
    const destinations = destinationsService.getAllDestinations();
    res.json({ success: true, data: destinations, count: destinations.length });
  } catch (err) {
    next(err);
  }
}

function getHomeDestination(req, res, next) {
  try {
    const home = destinationsService.getHomeDestination();
    res.json({ success: true, data: home });
  } catch (err) {
    next(err);
  }
}

function getDestinationById(req, res, next) {
  try {
    const destination = destinationsService.getDestinationById(req.params.id);
    res.json({ success: true, data: destination });
  } catch (err) {
    next(err);
  }
}

function createDestination(req, res, next) {
  try {
    const { name, address, lat, lng, radius_m, description } = req.body;
    const destination = destinationsService.createDestination({
      name,
      address,
      lat,
      lng,
      radius_m,
      description,
      created_by: req.user.id,
    });

    try {
      const io = getIO();
      io.to('fleet-monitors').emit('destination_updated', {
        action: 'create',
        destination,
      });
    } catch (_) {}

    res.status(201).json({ success: true, data: destination });
  } catch (err) {
    next(err);
  }
}

function updateDestination(req, res, next) {
  try {
    const destination = destinationsService.updateDestination(req.params.id, req.body);

    try {
      const io = getIO();
      io.to('fleet-monitors').emit('destination_updated', {
        action: 'update',
        destination,
      });
    } catch (_) {}

    res.json({ success: true, data: destination });
  } catch (err) {
    next(err);
  }
}

function deleteDestination(req, res, next) {
  try {
    const result = destinationsService.deleteDestination(req.params.id);

    try {
      const io = getIO();
      io.to('fleet-monitors').emit('destination_updated', {
        action: 'delete',
        destinationId: req.params.id,
      });
    } catch (_) {}

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllDestinations,
  getHomeDestination,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
};
