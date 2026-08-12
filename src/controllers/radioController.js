import RadioCommunication from '../models/RadioCommunication.js';
import Guard from '../models/Guard.js';
import Site from '../models/Site.js';
import { ApiSuccess, ApiError, paginate, generateId } from '../utils/helpers.js';
import { KPI_THRESHOLDS, TARGETS } from '../utils/constants.js';

export const getRadioCommunications = async (req, res) => {
  try {
    const { page = 1, limit = 20, guard, site, communicationType, status, startDate, endDate } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (guard) query.guard = guard;
    if (site) query.site = site;
    if (communicationType) query.communicationType = communicationType;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.sentAt = {};
      if (startDate) query.sentAt.$gte = new Date(startDate);
      if (endDate) query.sentAt.$lte = new Date(endDate);
    }

    const communications = await RadioCommunication.find(query)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('operator', 'firstName lastName')
      .skip(skip)
      .limit(queryLimit)
      .sort({ sentAt: -1 });

    const total = await RadioCommunication.countDocuments(query);

    return ApiSuccess(res, {
      communications,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch radio communications', 500, 'FETCH_RADIO_FAILED');
  }
};

export const getRadioCommunication = async (req, res) => {
  try {
    const communication = await RadioCommunication.findById(req.params.id)
      .populate('guard', 'employeeId firstName lastName phone')
      .populate('site', 'name address')
      .populate('operator', 'firstName lastName email');

    if (!communication) {
      return ApiError(res, 'Radio communication not found', 404, 'RADIO_NOT_FOUND');
    }

    return ApiSuccess(res, communication);
  } catch (error) {
    return ApiError(res, 'Failed to fetch radio communication', 500, 'FETCH_RADIO_COMM_FAILED');
  }
};

export const createRadioCommunication = async (req, res) => {
  try {
    const { guard, site, communicationType, message, notes } = req.body;

    if (!site) {
      return ApiError(res, 'Site is required', 400, 'MISSING_FIELDS');
    }

    const siteExists = await Site.findById(site);
    if (!siteExists) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    if (guard) {
      const guardExists = await Guard.findById(guard);
      if (!guardExists) {
        return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
      }
    }

    const communicationId = `RADIO-${generateId().substring(0, 8).toUpperCase()}`;

    const communication = await RadioCommunication.create({
      communicationId,
      guard,
      site,
      operator: req.user._id,
      communicationType: communicationType || 'RADIO',
      message,
      sentAt: new Date(),
      status: 'SENT',
      notes
    });

    const populatedCommunication = await RadioCommunication.findById(communication._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('operator', 'firstName lastName');

    return ApiSuccess(res, populatedCommunication, 'Radio communication created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create radio communication', 500, 'CREATE_RADIO_FAILED');
  }
};

export const updateRadioCommunication = async (req, res) => {
  try {
    const { status, acknowledgedAt, responseTimeSeconds, notes } = req.body;

    const communication = await RadioCommunication.findById(req.params.id);
    if (!communication) {
      return ApiError(res, 'Radio communication not found', 404, 'RADIO_NOT_FOUND');
    }

    if (status) communication.status = status;
    if (acknowledgedAt) communication.acknowledgedAt = new Date(acknowledgedAt);
    if (responseTimeSeconds !== undefined) communication.responseTimeSeconds = responseTimeSeconds;
    if (notes !== undefined) communication.notes = notes;

    if (status === 'ACKNOWLEDGED' && !communication.acknowledgedAt) {
      communication.acknowledgedAt = new Date();
      if (!communication.responseTimeSeconds) {
        communication.responseTimeSeconds = Math.round(
          (new Date() - new Date(communication.sentAt)) / 1000
        );
      }
    }

    await communication.save();

    const populatedCommunication = await RadioCommunication.findById(communication._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('operator', 'firstName lastName');

    return ApiSuccess(res, populatedCommunication, 'Radio communication updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update radio communication', 500, 'UPDATE_RADIO_FAILED');
  }
};

export const getRadioKPIs = async (req, res) => {
  try {
    const { site, startDate, endDate } = req.query;

    const query = {};
    if (site) query.site = site;

    if (startDate || endDate) {
      query.sentAt = {};
      if (startDate) query.sentAt.$gte = new Date(startDate);
      if (endDate) query.sentAt.$lte = new Date(endDate);
    }

    const communications = await RadioCommunication.find(query).lean();

    const totalCommunications = communications.length;
    const acknowledgedCommunications = communications.filter(c => c.status === 'ACKNOWLEDGED').length;
    const failedCommunications = communications.filter(c => c.status === 'FAILED').length;

    const responseTimes = communications
      .filter(c => c.responseTimeSeconds !== undefined && c.responseTimeSeconds !== null)
      .map(c => c.responseTimeSeconds);

    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    const responseCompliance = totalCommunications > 0
      ? Math.round((acknowledgedCommunications / totalCommunications) * 100)
      : 100;

    const availability = totalCommunications > 0
      ? Math.round(((totalCommunications - failedCommunications) / totalCommunications) * 100)
      : 100;

    const getStatus = (value, thresholds) => {
      if (value <= thresholds.green) return 'GREEN';
      if (value <= thresholds.yellow) return 'YELLOW';
      return 'RED';
    };

    return ApiSuccess(res, {
      totalCommunications,
      acknowledgedCommunications,
      failedCommunications,
      averageResponseTimeSeconds: avgResponseTime,
      responseCompliance,
      availability,
      responseTimeStatus: getStatus(avgResponseTime, KPI_THRESHOLDS.communicationResponseTime),
      availabilityStatus: (() => {
        if (availability >= 99) return 'GREEN';
        if (availability >= 95) return 'YELLOW';
        return 'RED';
      })(),
      period: {
        start: startDate || null,
        end: endDate || null
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to calculate radio KPIs', 500, 'RADIO_KPI_FAILED');
  }
};
