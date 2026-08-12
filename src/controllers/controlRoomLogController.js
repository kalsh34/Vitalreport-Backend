import ControlRoomLog from '../models/ControlRoomLog.js';
import { ApiSuccess, ApiError, paginate } from '../utils/helpers.js';

export const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, operator, category, site } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (operator) query.operator = operator;
    if (category) query.category = category;
    if (site) query.relatedSite = site;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const logs = await ControlRoomLog.find(query)
      .populate('operator', 'firstName lastName email')
      .populate('relatedGuard', 'employeeId firstName lastName')
      .populate('relatedSite', 'name address')
      .populate('relatedIncident', 'incidentNumber severity status')
      .skip(skip)
      .limit(queryLimit)
      .sort({ date: -1 });

    const total = await ControlRoomLog.countDocuments(query);

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
    return ApiError(res, 'Failed to fetch control room logs', 500, 'FETCH_LOGS_FAILED');
  }
};

export const createLog = async (req, res) => {
  try {
    const { event, category, description, actionTaken, relatedGuard, relatedSite, relatedIncident, status } = req.body;

    if (!event) {
      return ApiError(res, 'Event is required', 400, 'MISSING_EVENT');
    }

    const log = await ControlRoomLog.create({
      date: new Date(),
      operator: req.user._id,
      event,
      category: category || 'OTHER',
      description,
      actionTaken,
      relatedGuard,
      relatedSite,
      relatedIncident,
      status: status || 'OPEN'
    });

    const populatedLog = await ControlRoomLog.findById(log._id)
      .populate('operator', 'firstName lastName')
      .populate('relatedGuard', 'employeeId firstName lastName')
      .populate('relatedSite', 'name address');

    return ApiSuccess(res, populatedLog, 'Log entry created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create log entry', 500, 'CREATE_LOG_FAILED');
  }
};
