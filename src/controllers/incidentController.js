import Incident from '../models/Incident.js';
import Guard from '../models/Guard.js';
import Site from '../models/Site.js';
import { ApiSuccess, ApiError, paginate, generateReportNumber } from '../utils/helpers.js';

export const getIncidents = async (req, res) => {
  try {
    const { page = 1, limit = 20, site, guard, severity, status, startDate, endDate } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (site) query.site = site;
    if (guard) query.guard = guard;
    if (severity) query.severity = severity;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.reportedAt = {};
      if (startDate) query.reportedAt.$gte = new Date(startDate);
      if (endDate) query.reportedAt.$lte = new Date(endDate);
    }

    const incidents = await Incident.find(query)
      .populate('site', 'name address')
      .populate('post', 'name')
      .populate('guard', 'employeeId firstName lastName')
      .populate('reportedBy', 'firstName lastName')
      .populate('relatedGuardReport', 'reportNumber title')
      .populate('relatedAESEvent', 'eventId alarmType')
      .skip(skip)
      .limit(queryLimit)
      .sort({ reportedAt: -1 });

    const total = await Incident.countDocuments(query);

    return ApiSuccess(res, {
      incidents,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch incidents', 500, 'FETCH_INCIDENTS_FAILED');
  }
};

export const getIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('site', 'name address location')
      .populate('post', 'name description')
      .populate('guard', 'employeeId firstName lastName phone')
      .populate('reportedBy', 'firstName lastName email')
      .populate('relatedGuardReport', 'reportNumber title description')
      .populate('relatedAESEvent', 'eventId alarmType status')
      .populate('actions.performedBy', 'firstName lastName');

    if (!incident) {
      return ApiError(res, 'Incident not found', 404, 'INCIDENT_NOT_FOUND');
    }

    return ApiSuccess(res, incident);
  } catch (error) {
    return ApiError(res, 'Failed to fetch incident', 500, 'FETCH_INCIDENT_FAILED');
  }
};

export const createIncident = async (req, res) => {
  try {
    const { site, post, guard, incidentType, type, category, severity, description, title, latitude, longitude, guardExplanation, controlRoomNotes, actionTaken, rootCause, relatedGuardReport, relatedAESEvent, severityNote, isSOS } = req.body;

    const finalIncidentType = incidentType || type || category || 'OTHER';

    if (!site || !severity || !description) {
      return ApiError(res, 'Site, severity, and description are required', 400, 'MISSING_FIELDS');
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

    const incidentNumber = generateReportNumber('INC');

    const incident = await Incident.create({
      incidentNumber,
      site,
      post,
      guard,
      reportedBy: req.user._id,
      incidentType: finalIncidentType,
      title: title || (isSOS ? `SOS - ${finalIncidentType}` : undefined),
      severity,
      description,
      location: latitude !== undefined && longitude !== undefined ? {
        type: 'Point',
        coordinates: [longitude, latitude]
      } : undefined,
      latitude,
      longitude,
      reportedAt: new Date(),
      guardExplanation,
      controlRoomNotes,
      actionTaken,
      rootCause,
      relatedGuardReport,
      relatedAESEvent,
      severityNote,
      isSOS: isSOS || false
    });

    const populatedIncident = await Incident.findById(incident._id)
      .populate('site', 'name address')
      .populate('post', 'name')
      .populate('guard', 'employeeId firstName lastName')
      .populate('reportedBy', 'firstName lastName');

    return ApiSuccess(res, populatedIncident, 'Incident created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create incident', 500, 'CREATE_INCIDENT_FAILED');
  }
};

export const updateIncident = async (req, res) => {
  try {
    const { incidentType, severity, description, guardExplanation, controlRoomNotes, actionTaken, rootCause, severityNote, latitude, longitude } = req.body;

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return ApiError(res, 'Incident not found', 404, 'INCIDENT_NOT_FOUND');
    }

    if (incidentType) incident.incidentType = incidentType;
    if (severity) incident.severity = severity;
    if (description) incident.description = description;
    if (guardExplanation !== undefined) incident.guardExplanation = guardExplanation;
    if (controlRoomNotes !== undefined) incident.controlRoomNotes = controlRoomNotes;
    if (actionTaken !== undefined) incident.actionTaken = actionTaken;
    if (rootCause !== undefined) incident.rootCause = rootCause;
    if (severityNote !== undefined) incident.severityNote = severityNote;
    if (latitude !== undefined && longitude !== undefined) {
      incident.latitude = latitude;
      incident.longitude = longitude;
      incident.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }

    await incident.save();

    const populatedIncident = await Incident.findById(incident._id)
      .populate('site', 'name address')
      .populate('post', 'name')
      .populate('guard', 'employeeId firstName lastName')
      .populate('reportedBy', 'firstName lastName');

    return ApiSuccess(res, populatedIncident, 'Incident updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update incident', 500, 'UPDATE_INCIDENT_FAILED');
  }
};

export const escalateIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return ApiError(res, 'Incident not found', 404, 'INCIDENT_NOT_FOUND');
    }

    if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') {
      return ApiError(res, 'Cannot escalate a resolved or closed incident', 400, 'INVALID_STATUS');
    }

    const { notes } = req.body;

    incident.status = 'ESCALATED';
    incident.escalatedAt = new Date();
    incident.actions.push({
      action: 'ESCALATED',
      performedBy: req.user._id,
      performedAt: new Date(),
      notes: notes || 'Incident escalated'
    });

    await incident.save();

    const populatedIncident = await Incident.findById(incident._id)
      .populate('site', 'name address')
      .populate('guard', 'employeeId firstName lastName')
      .populate('actions.performedBy', 'firstName lastName');

    return ApiSuccess(res, populatedIncident, 'Incident escalated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to escalate incident', 500, 'ESCALATE_INCIDENT_FAILED');
  }
};

export const resolveIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return ApiError(res, 'Incident not found', 404, 'INCIDENT_NOT_FOUND');
    }

    if (incident.status === 'CLOSED') {
      return ApiError(res, 'Cannot resolve a closed incident', 400, 'INVALID_STATUS');
    }

    const { resolution, actionTaken, rootCause } = req.body;

    incident.status = 'RESOLVED';
    incident.resolvedAt = new Date();
    if (resolution) incident.controlRoomNotes = resolution;
    if (actionTaken) incident.actionTaken = actionTaken;
    if (rootCause) incident.rootCause = rootCause;
    incident.actions.push({
      action: 'RESOLVED',
      performedBy: req.user._id,
      performedAt: new Date(),
      notes: resolution || 'Incident resolved'
    });

    await incident.save();

    const populatedIncident = await Incident.findById(incident._id)
      .populate('site', 'name address')
      .populate('guard', 'employeeId firstName lastName')
      .populate('actions.performedBy', 'firstName lastName');

    return ApiSuccess(res, populatedIncident, 'Incident resolved successfully');
  } catch (error) {
    return ApiError(res, 'Failed to resolve incident', 500, 'RESOLVE_INCIDENT_FAILED');
  }
};

export const closeIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return ApiError(res, 'Incident not found', 404, 'INCIDENT_NOT_FOUND');
    }

    if (incident.status !== 'RESOLVED') {
      return ApiError(res, 'Can only close resolved incidents', 400, 'INVALID_STATUS');
    }

    const { notes } = req.body;

    incident.status = 'CLOSED';
    incident.closedAt = new Date();
    incident.actions.push({
      action: 'CLOSED',
      performedBy: req.user._id,
      performedAt: new Date(),
      notes: notes || 'Incident closed'
    });

    await incident.save();

    const populatedIncident = await Incident.findById(incident._id)
      .populate('site', 'name address')
      .populate('guard', 'employeeId firstName lastName')
      .populate('actions.performedBy', 'firstName lastName');

    return ApiSuccess(res, populatedIncident, 'Incident closed successfully');
  } catch (error) {
    return ApiError(res, 'Failed to close incident', 500, 'CLOSE_INCIDENT_FAILED');
  }
};
