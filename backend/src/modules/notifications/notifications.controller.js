'use strict';
const notificationsService = require('./notifications.service');

function getNotifications(req, res, next) {
  try {
    const { unread_only, limit } = req.query;
    const notifications = notificationsService.getNotifications(req.user.id, {
      unread_only: unread_only === 'true' || unread_only === '1',
      limit,
    });
    const unreadCount = notificationsService.getUnreadCount(req.user.id);
    res.json({
      success: true,
      data: notifications,
      unreadCount,
      count: notifications.length,
    });
  } catch (err) {
    next(err);
  }
}

function markRead(req, res, next) {
  try {
    const notification = notificationsService.markRead(req.params.id, req.user.id);
    const unreadCount = notificationsService.getUnreadCount(req.user.id);
    res.json({ success: true, data: notification, unreadCount });
  } catch (err) {
    next(err);
  }
}

function markAllRead(req, res, next) {
  try {
    notificationsService.markAllRead(req.user.id);
    res.json({ success: true, unreadCount: 0 });
  } catch (err) {
    next(err);
  }
}

function getUnreadCount(req, res, next) {
  try {
    const unreadCount = notificationsService.getUnreadCount(req.user.id);
    res.json({ success: true, unreadCount });
  } catch (err) {
    next(err);
  }
}

function deleteNotification(req, res, next) {
  try {
    notificationsService.deleteNotification(req.params.id, req.user.id);
    const unreadCount = notificationsService.getUnreadCount(req.user.id);
    res.json({ success: true, id: req.params.id, unreadCount });
  } catch (err) {
    next(err);
  }
}

function clearAllNotifications(req, res, next) {
  try {
    notificationsService.clearAllNotifications(req.user.id);
    res.json({ success: true, unreadCount: 0 });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
};
