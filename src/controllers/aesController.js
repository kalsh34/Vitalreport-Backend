import AESEvent from '../models/AESEvent.js';
import Site from '../models/Site.js';
import { ApiSuccess, ApiError, paginate, generateId } from '../utils/helpers.js';
import { KPI_THRESHOLDS } from '../utils/constants.js';

export const getAESEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, site, alarmType, status, startDate, endDate } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (site) query.site = site;
    if (alarmType) query.alarmType = alarmType;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.receivedAt = {};
      if (startDate) query.receivedAt.$gte = new Date(startDate);
      if (endDate) query.receivedAt.$lte = new Date(endDate);
    }

    const events = await AESEvent.find(query)
      .populate('site', 'name address')
      .populate('operator', 'firstName lastName')
      .skip(skip)
      .limit(queryLimit)
      .sort({ receivedAt: -1 });

    const total = await AESEvent.countDocuments(query);

    return ApiSuccess(res, {
      events,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch AES events', 500, 'FETCH_AES_EVENTS_FAILED');
  }
};

export const getAESEvent = async (req, res) => {
  try {
    const event = await AESEvent.findById(req.params.id)
      .populate('site', 'name address location')
      .populate('operator', 'firstName lastName email');

    if (!event) {
      return ApiError(res, 'AES event not found', 404, 'AES_EVENT_NOT_FOUND');
    }

    return ApiSuccess(res, event);
  } catch (error) {
    return ApiError(res, 'Failed to fetch AES event', 500, 'FETCH_AES_EVENT_FAILED');
  }
};

export const createAESEvent = async (req, res) => {
  try {
    const { site, zone, alarmType, operatorAction, notes } = req.body;

    if (!site || !alarmType) {
      return ApiError(res, 'Site and alarm type are required', 400, 'MISSING_FIELDS');
    }

    const siteExists = await Site.findById(site);
    if (!siteExists) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    const eventId = `AES-${generateId().substring(0, 8).toUpperCase()}`;

    const event = await AESEvent.create({
      eventId,
      site,
      zone,
      alarmType,
      receivedAt: new Date(),
      operator: req.user._id,
      operatorAction,
      notes
    });

    const populatedEvent = await AESEvent.findById(event._id)
      .populate('site', 'name address')
      .populate('operator', 'firstName lastName');

    return ApiSuccess(res, populatedEvent, 'AES event created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create AES event', 500, 'CREATE_AES_EVENT_FAILED');
  }
};

export const updateAESEvent = async (req, res) => {
  try {
    const { status, operatorAction, verificationResult, falseAlarm, escalated, resolution, notes, customerNotification } = req.body;

    const event = await AESEvent.findById(req.params.id);
    if (!event) {
      return ApiError(res, 'AES event not found', 404, 'AES_EVENT_NOT_FOUND');
    }

    if (status) {
      const previousStatus = event.status;
      event.status = status;

      if (status === 'VERIFIED' && previousStatus === 'RECEIVED') {
        const now = new Date();
        event.verifiedAt = now;
        event.verificationTimeSeconds = Math.round((now - new Date(event.receivedAt)) / 1000);
      }

      if (status === 'FALSE_ALARM') {
        event.falseAlarm = true;
      }

      if (status === 'ESCALATED') {
        event.escalated = true;
        event.escalatedAt = new Date();
      }

      if (status === 'RESOLVED') {
        event.resolvedAt = new Date();
      }
    }

    if (operatorAction !== undefined) event.operatorAction = operatorAction;
    if (verificationResult !== undefined) event.verificationResult = verificationResult;
    if (falseAlarm !== undefined) event.falseAlarm = falseAlarm;
    if (escalated !== undefined) event.escalated = escalated;
    if (resolution !== undefined) event.resolution = resolution;
    if (notes !== undefined) event.notes = notes;
    if (customerNotification !== undefined) event.customerNotification = customerNotification;

    await event.save();

    const populatedEvent = await AESEvent.findById(event._id)
      .populate('site', 'name address')
      .populate('operator', 'firstName lastName');

    return ApiSuccess(res, populatedEvent, 'AES event updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update AES event', 500, 'UPDATE_AES_EVENT_FAILED');
  }
};

export const getAESKPIs = async (req, res) => {
  try {
    const { site, startDate, endDate } = req.query;

    const query = {};
    if (site) query.site = site;

    if (startDate || endDate) {
      query.receivedAt = {};
      if (startDate) query.receivedAt.$gte = new Date(startDate);
      if (endDate) query.receivedAt.$lte = new Date(endDate);
    }

    const events = await AESEvent.find(query).lean();

    const totalAlarms = events.length;
    const verifiedAlarms = events.filter(e => e.status === 'VERIFIED' || e.status === 'ESCALATED' || e.status === 'RESOLVED').length;
    const falseAlarms = events.filter(e => e.falseAlarm || e.status === 'FALSE_ALARM').length;
    const criticalAlarms = events.filter(e => ['BURGLARY', 'PANIC', 'FIRE', 'MEDICAL'].includes(e.alarmType)).length;

    const responseTimes = events
      .filter(e => e.responseTimeSeconds !== undefined && e.responseTimeSeconds !== null)
      .map(e => e.responseTimeSeconds);

    const verificationTimes = events
      .filter(e => e.verificationTimeSeconds !== undefined && e.verificationTimeSeconds !== null)
      .map(e => e.verificationTimeSeconds);

    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    const avgVerificationTime = verificationTimes.length > 0
      ? Math.round(verificationTimes.reduce((a, b) => a + b, 0) / verificationTimes.length)
      : 0;

    const falseAlarmRate = totalAlarms > 0
      ? Math.round((falseAlarms / totalAlarms) * 100)
      : 0;

    const unverifiedRate = totalAlarms > 0
      ? Math.round(((totalAlarms - verifiedAlarms - falseAlarms) / totalAlarms) * 100)
      : 0;

    const getStatus = (value, thresholds) => {
      if (value <= thresholds.green) return 'GREEN';
      if (value <= thresholds.yellow) return 'YELLOW';
      return 'RED';
    };

    return ApiSuccess(res, {
      totalAlarms,
      verifiedAlarms,
      falseAlarms,
      criticalAlarms,
      averageResponseTimeSeconds: avgResponseTime,
      averageVerificationTimeSeconds: avgVerificationTime,
      falseAlarmRate,
      unverifiedAlarmRate,
      responseTimeStatus: getStatus(avgResponseTime, KPI_THRESHOLDS.alarmResponseTime),
      verificationTimeStatus: getStatus(avgVerificationTime, KPI_THRESHOLDS.alarmVerificationTime),
      falseAlarmRateStatus: getStatus(falseAlarmRate, KPI_THRESHOLDS.falseAlarmRate),
      unverifiedRateStatus: getStatus(unverifiedRate, KPI_THRESHOLDS.unverifiedAlarmRate),
      period: {
        start: startDate || null,
        end: endDate || null
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to calculate AES KPIs', 500, 'AES_KPI_FAILED');
  }
};
