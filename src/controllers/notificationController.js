import Notification from '../models/Notification.js';
import { ApiSuccess, ApiError, paginate } from '../utils/helpers.js';

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead, type } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = { user: req.user._id };
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .skip(skip)
      .limit(queryLimit)
      .sort({ createdAt: -1 });

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

    return ApiSuccess(res, {
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch notifications', 500, 'FETCH_NOTIFICATIONS_FAILED');
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return ApiError(res, 'Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return ApiSuccess(res, notification, 'Notification marked as read');
  } catch (error) {
    return ApiError(res, 'Failed to mark notification as read', 500, 'MARK_READ_FAILED');
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return ApiSuccess(res, {
      modifiedCount: result.modifiedCount
    }, 'All notifications marked as read');
  } catch (error) {
    return ApiError(res, 'Failed to mark all notifications as read', 500, 'MARK_ALL_READ_FAILED');
  }
};
