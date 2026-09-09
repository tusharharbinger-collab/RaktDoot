'use strict';
const assignmentsService = require('./assignments.service');
const { getIO } = require('../../sockets/socket.handler');

function getAllAssignments(req, res, next) {
  try {
    const { status, driver_id, destination_id, limit } = req.query;
    const assignments = assignmentsService.getAllAssignments({
      status,
      driver_id,
      destination_id,
      limit,
    });
    res.json({ success: true, data: assignments, count: assignments.length });
  } catch (err) {
    next(err);
  }
}

function getActiveAssignment(req, res, next) {
  try {
    const assignment = assignmentsService.getActiveAssignmentForDriver(req.user.id);
    res.json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
}

function getAssignmentById(req, res, next) {
  try {
    const assignment = assignmentsService.getAssignmentById(req.params.id);
    res.json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
}

const { sendDriverCollectionPush } = require('../../services/pushNotification.service');

function createAssignment(req, res, next) {
  try {
    const {
      destination_id,
      driver_id,
      source_name,
      source_lat,
      source_lng,
      urgency,
      notes,
    } = req.body;

    const assignment = assignmentsService.createAssignment({
      destination_id,
      driver_id,
      assigned_by: req.user.id,
      source_name,
      source_lat,
      source_lng,
      urgency,
      notes,
    });

    try {
      const io = getIO();
      const payload = {
        assignment,
        destination: {
          id: assignment.destination_id,
          name: assignment.destination_name,
          address: assignment.destination_address,
          lat: assignment.destination_lat,
          lng: assignment.destination_lng,
          radius_m: assignment.destination_radius_m,
          description: assignment.destination_description,
        },
      };

      // Notify driver in their private room
      io.to(`driver:${driver_id}`).emit('task_assigned', payload);
      io.to(`driver:${driver_id}`).emit('new_collection_request', payload);

      // Broadcast update to fleet monitors
      io.to('fleet-monitors').emit('assignment_status_changed', { assignment });
      io.to('fleet-monitors').emit('request_status_updated', { assignment });
    } catch (_) {}

    // Send Expo Push Notification asynchronously
    const urgencyLabel = assignment.urgency === 'emergency' ? '🚨 STAT / EMERGENCY' : assignment.urgency === 'urgent' ? '⚠️ URGENT' : '🩸';
    sendDriverCollectionPush({
      driverId: driver_id,
      title: `${urgencyLabel} Blood Collection Request`,
      body: `Pickup: ${assignment.source_name || 'Jankalyan HQ'} ➔ Destination: ${assignment.destination_name}`,
      data: {
        type: 'collection_request',
        assignmentId: assignment.id,
        destinationId: assignment.destination_id,
      },
    }).catch(() => {});

    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
}

function updateAssignmentStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    const assignment = assignmentsService.updateAssignmentStatus(
      req.params.id,
      status,
      req.user.id,
      req.user.role
    );

    try {
      const io = getIO();
      io.to('fleet-monitors').emit('assignment_status_changed', { assignment });
      io.to('fleet-monitors').emit('request_status_updated', { assignment });
      io.to(`driver:${assignment.driver_id}`).emit('assignment_status_changed', { assignment });

      // If work completed, broadcast special work_completed_alert to fleet monitors
      if (status === 'completed') {
        io.to('fleet-monitors').emit('work_completed_alert', {
          assignment_id: assignment.id,
          driver_id: assignment.driver_id,
          driver_name: assignment.driver_name,
          destination_id: assignment.destination_id,
          destination_name: assignment.destination_name,
          completed_at: assignment.completed_at || new Date().toISOString(),
          message: `WORK COMPLETED: Driver ${assignment.driver_name} reached ${assignment.destination_name} and completed the blood collection task!`,
        });
      }
    } catch (_) {}

    res.json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllAssignments,
  getActiveAssignment,
  getAssignmentById,
  createAssignment,
  updateAssignmentStatus,
};
