import AuditLog from '../models/AuditLog.js';
import { ApiSuccess, ApiError, paginate } from '../utils/helpers.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, user, action, resource, startDate, endDate } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (user) query.user = user;
    if (action) query.action = { $regex: action, $options: 'i' };
    if (resource) query.resource = { $regex: resource, $options: 'i' };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'firstName lastName email')
      .skip(skip)
      .limit(queryLimit)
      .sort({ timestamp: -1 });

    const total = await AuditLog.countDocuments(query);

    return ApiSuccess(res, {
      logs,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch audit logs', 500, 'FETCH_AUDIT_LOGS_FAILED');
  }
};
