import GuardReport from '../models/GuardReport.js';
import Guard from '../models/Guard.js';
import Site from '../models/Site.js';
import { ApiSuccess, ApiError, paginate, generateReportNumber } from '../utils/helpers.js';

export const getGuardReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, guard, site, status, category, startDate, endDate } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (guard) query.guard = guard;
    if (site) query.site = site;
    if (status) query.status = status;
    if (category) query.category = category;

    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) query.submittedAt.$lte = new Date(endDate);
    }

    const reports = await GuardReport.find(query)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('post', 'name')
      .populate('reviewedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(queryLimit)
      .sort({ createdAt: -1 });

    const total = await GuardReport.countDocuments(query);

    return ApiSuccess(res, {
      reports,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total,
        pages: Math.ceil(total / queryLimit)
      }
    });
  } catch (error) {
    return ApiError(res, 'Failed to fetch guard reports', 500, 'FETCH_GUARD_REPORTS_FAILED');
  }
};

export const getGuardReport = async (req, res) => {
  try {
    const report = await GuardReport.findById(req.params.id)
      .populate('guard', 'employeeId firstName lastName phone')
      .populate('site', 'name address')
      .populate('post', 'name description')
      .populate('shift', 'startTime endTime status')
      .populate('reviewedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('relatedIncident', 'incidentNumber severity status')
      .populate('relatedAESEvent', 'eventId alarmType status');

    if (!report) {
      return ApiError(res, 'Guard report not found', 404, 'GUARD_REPORT_NOT_FOUND');
    }

    return ApiSuccess(res, report);
  } catch (error) {
    return ApiError(res, 'Failed to fetch guard report', 500, 'FETCH_GUARD_REPORT_FAILED');
  }
};

export const createGuardReport = async (req, res) => {
  try {
    const { guard, site, post, shift, category, priority, title, description, latitude, longitude, photos, attachments, witness, relatedCheckpoint, relatedIncident, relatedAESEvent, controlRoomNotes, actionTaken } = req.body;

    if (!guard || !site || !category || !title || !description) {
      return ApiError(res, 'Guard, site, category, title, and description are required', 400, 'MISSING_FIELDS');
    }

    const guardExists = await Guard.findById(guard);
    if (!guardExists) {
      return ApiError(res, 'Guard not found', 404, 'GUARD_NOT_FOUND');
    }

    const siteExists = await Site.findById(site);
    if (!siteExists) {
      return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
    }

    const reportNumber = generateReportNumber('GR');

    const report = await GuardReport.create({
      reportNumber,
      guard,
      site,
      post,
      shift,
      category,
      priority: priority || 'MEDIUM',
      title,
      description,
      location: latitude !== undefined && longitude !== undefined ? {
        type: 'Point',
        coordinates: [longitude, latitude]
      } : undefined,
      latitude,
      longitude,
      photos,
      attachments,
      witness,
      relatedCheckpoint,
      relatedIncident,
      relatedAESEvent,
      status: 'SUBMITTED',
      submittedAt: new Date(),
      controlRoomNotes,
      actionTaken
    });

    const populatedReport = await GuardReport.findById(report._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('post', 'name');

    return ApiSuccess(res, populatedReport, 'Guard report created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create guard report', 500, 'CREATE_GUARD_REPORT_FAILED');
  }
};

export const updateGuardReport = async (req, res) => {
  try {
    const report = await GuardReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Guard report not found', 404, 'GUARD_REPORT_NOT_FOUND');
    }

    if (!['DRAFT', 'RETURNED'].includes(report.status)) {
      return ApiError(res, 'Can only update reports with DRAFT or RETURNED status', 400, 'INVALID_STATUS');
    }

    const { category, priority, title, description, latitude, longitude, photos, attachments, witness, controlRoomNotes, actionTaken } = req.body;

    if (category) report.category = category;
    if (priority) report.priority = priority;
    if (title) report.title = title;
    if (description) report.description = description;
    if (latitude !== undefined && longitude !== undefined) {
      report.latitude = latitude;
      report.longitude = longitude;
      report.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }
    if (photos) report.photos = photos;
    if (attachments) report.attachments = attachments;
    if (witness !== undefined) report.witness = witness;
    if (controlRoomNotes !== undefined) report.controlRoomNotes = controlRoomNotes;
    if (actionTaken !== undefined) report.actionTaken = actionTaken;

    await report.save();

    const populatedReport = await GuardReport.findById(report._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address');

    return ApiSuccess(res, populatedReport, 'Guard report updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update guard report', 500, 'UPDATE_GUARD_REPORT_FAILED');
  }
};

export const reviewReport = async (req, res) => {
  try {
    const report = await GuardReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Guard report not found', 404, 'GUARD_REPORT_NOT_FOUND');
    }

    if (report.status !== 'SUBMITTED') {
      return ApiError(res, 'Can only review reports with SUBMITTED status', 400, 'INVALID_STATUS');
    }

    const { reviewNotes } = req.body;

    report.status = 'UNDER_REVIEW';
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    if (reviewNotes) report.reviewNotes = reviewNotes;

    await report.save();

    const populatedReport = await GuardReport.findById(report._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('reviewedBy', 'firstName lastName');

    return ApiSuccess(res, populatedReport, 'Report review started');
  } catch (error) {
    return ApiError(res, 'Failed to review report', 500, 'REVIEW_REPORT_FAILED');
  }
};

export const approveReport = async (req, res) => {
  try {
    const report = await GuardReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Guard report not found', 404, 'GUARD_REPORT_NOT_FOUND');
    }

    if (report.status !== 'UNDER_REVIEW') {
      return ApiError(res, 'Can only approve reports with UNDER_REVIEW status', 400, 'INVALID_STATUS');
    }

    const { approvalNotes } = req.body;

    report.status = 'APPROVED';
    report.approvedBy = req.user._id;
    report.approvedAt = new Date();
    if (approvalNotes) report.approvalNotes = approvalNotes;

    await report.save();

    const populatedReport = await GuardReport.findById(report._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address')
      .populate('approvedBy', 'firstName lastName');

    return ApiSuccess(res, populatedReport, 'Report approved successfully');
  } catch (error) {
    return ApiError(res, 'Failed to approve report', 500, 'APPROVE_REPORT_FAILED');
  }
};

export const returnReport = async (req, res) => {
  try {
    const report = await GuardReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Guard report not found', 404, 'GUARD_REPORT_NOT_FOUND');
    }

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(report.status)) {
      return ApiError(res, 'Can only return reports with SUBMITTED or UNDER_REVIEW status', 400, 'INVALID_STATUS');
    }

    const { reviewNotes } = req.body;

    if (!reviewNotes) {
      return ApiError(res, 'Review notes are required when returning a report', 400, 'MISSING_REVIEW_NOTES');
    }

    report.status = 'RETURNED';
    report.reviewNotes = reviewNotes;

    await report.save();

    const populatedReport = await GuardReport.findById(report._id)
      .populate('guard', 'employeeId firstName lastName')
      .populate('site', 'name address');

    return ApiSuccess(res, populatedReport, 'Report returned for correction');
  } catch (error) {
    return ApiError(res, 'Failed to return report', 500, 'RETURN_REPORT_FAILED');
  }
};
