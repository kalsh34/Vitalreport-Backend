import DailyReport from '../models/DailyReport.js';
import WeeklyReport from '../models/WeeklyReport.js';
import MonthlyReport from '../models/MonthlyReport.js';
import Site from '../models/Site.js';
import { ApiSuccess, ApiError, paginate, generateReportNumber } from '../utils/helpers.js';

const getDailyReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, site, status, startDate, endDate } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (site) query.site = site;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const reports = await DailyReport.find(query)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(queryLimit)
      .sort({ date: -1 });

    const total = await DailyReport.countDocuments(query);

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
    return ApiError(res, 'Failed to fetch daily reports', 500, 'FETCH_DAILY_REPORTS_FAILED');
  }
};

const getDailyReport = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('versionHistory.changedBy', 'firstName lastName');

    if (!report) {
      return ApiError(res, 'Daily report not found', 404, 'DAILY_REPORT_NOT_FOUND');
    }

    return ApiSuccess(res, report);
  } catch (error) {
    return ApiError(res, 'Failed to fetch daily report', 500, 'FETCH_DAILY_REPORT_FAILED');
  }
};

const createDailyReport = async (req, res) => {
  try {
    const { date, site, title, executiveSummary, guardOperations, qrPatrol, gps, aes, radio, incidents, customerIssues, controlRoomActivity, kpiSummary, managementAttention, recommendations, attachments } = req.body;

    if (!date) {
      return ApiError(res, 'Date is required', 400, 'MISSING_DATE');
    }

    if (site) {
      const siteExists = await Site.findById(site);
      if (!siteExists) {
        return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
      }
    }

    const reportNumber = generateReportNumber('DR');
    const reportDate = new Date(date);
    const period = reportDate.toISOString().split('T')[0];

    const report = await DailyReport.create({
      reportNumber,
      date: reportDate,
      period,
      site,
      title,
      executiveSummary,
      guardOperations,
      qrPatrol,
      gps,
      aes,
      radio,
      incidents,
      customerIssues,
      controlRoomActivity,
      kpiSummary,
      managementAttention,
      recommendations,
      attachments,
      status: 'DRAFT',
      createdBy: req.user._id
    });

    const populatedReport = await DailyReport.findById(report._id)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName');

    return ApiSuccess(res, populatedReport, 'Daily report created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create daily report', 500, 'CREATE_DAILY_REPORT_FAILED');
  }
};

const updateDailyReport = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Daily report not found', 404, 'DAILY_REPORT_NOT_FOUND');
    }

    if (report.status === 'PUBLISHED' || report.status === 'ARCHIVED') {
      return ApiError(res, 'Cannot update published or archived reports', 400, 'INVALID_STATUS');
    }

    const { title, executiveSummary, guardOperations, qrPatrol, gps, aes, radio, incidents, customerIssues, controlRoomActivity, kpiSummary, managementAttention, recommendations, attachments } = req.body;

    if (title !== undefined) report.title = title;
    if (executiveSummary !== undefined) report.executiveSummary = executiveSummary;
    if (guardOperations) report.guardOperations = { ...report.guardOperations, ...guardOperations };
    if (qrPatrol) report.qrPatrol = { ...report.qrPatrol, ...qrPatrol };
    if (gps) report.gps = { ...report.gps, ...gps };
    if (aes) report.aes = { ...report.aes, ...aes };
    if (radio) report.radio = { ...report.radio, ...radio };
    if (incidents) report.incidents = { ...report.incidents, ...incidents };
    if (customerIssues) report.customerIssues = { ...report.customerIssues, ...customerIssues };
    if (controlRoomActivity) report.controlRoomActivity = { ...report.controlRoomActivity, ...controlRoomActivity };
    if (kpiSummary) report.kpiSummary = { ...report.kpiSummary, ...kpiSummary };
    if (managementAttention) report.managementAttention = managementAttention;
    if (recommendations) report.recommendations = recommendations;
    if (attachments) report.attachments = attachments;

    report.version += 1;
    report.versionHistory.push({
      version: report.version,
      changedBy: req.user._id,
      changedAt: new Date(),
      changes: 'Report updated'
    });

    await report.save();

    const populatedReport = await DailyReport.findById(report._id)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName');

    return ApiSuccess(res, populatedReport, 'Daily report updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update daily report', 500, 'UPDATE_DAILY_REPORT_FAILED');
  }
};

const approveDailyReport = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Daily report not found', 404, 'DAILY_REPORT_NOT_FOUND');
    }

    if (report.status !== 'UNDER_REVIEW' && report.status !== 'DRAFT') {
      return ApiError(res, 'Can only approve reports with UNDER_REVIEW or DRAFT status', 400, 'INVALID_STATUS');
    }

    report.status = 'APPROVED';
    report.approvedBy = req.user._id;
    report.approvedAt = new Date();

    await report.save();

    return ApiSuccess(res, report, 'Daily report approved successfully');
  } catch (error) {
    return ApiError(res, 'Failed to approve daily report', 500, 'APPROVE_DAILY_REPORT_FAILED');
  }
};

const returnDailyReport = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Daily report not found', 404, 'DAILY_REPORT_NOT_FOUND');
    }

    const { reason } = req.body;

    report.status = 'RETURNED';
    report.version += 1;
    report.versionHistory.push({
      version: report.version,
      changedBy: req.user._id,
      changedAt: new Date(),
      changes: 'Report returned for correction',
      reason: reason || 'Needs correction'
    });

    await report.save();

    return ApiSuccess(res, report, 'Daily report returned for correction');
  } catch (error) {
    return ApiError(res, 'Failed to return daily report', 500, 'RETURN_DAILY_REPORT_FAILED');
  }
};

const publishDailyReport = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Daily report not found', 404, 'DAILY_REPORT_NOT_FOUND');
    }

    if (report.status !== 'APPROVED') {
      return ApiError(res, 'Can only publish approved reports', 400, 'INVALID_STATUS');
    }

    report.status = 'PUBLISHED';
    report.publishedAt = new Date();

    await report.save();

    return ApiSuccess(res, report, 'Daily report published successfully');
  } catch (error) {
    return ApiError(res, 'Failed to publish daily report', 500, 'PUBLISH_DAILY_REPORT_FAILED');
  }
};

const getWeeklyReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, site, status, startDate, endDate } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (site) query.site = site;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.weekStart = {};
      if (startDate) query.weekStart.$gte = new Date(startDate);
      if (endDate) query.weekStart.$lte = new Date(endDate);
    }

    const reports = await WeeklyReport.find(query)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(queryLimit)
      .sort({ weekStart: -1 });

    const total = await WeeklyReport.countDocuments(query);

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
    return ApiError(res, 'Failed to fetch weekly reports', 500, 'FETCH_WEEKLY_REPORTS_FAILED');
  }
};

const getWeeklyReport = async (req, res) => {
  try {
    const report = await WeeklyReport.findById(req.params.id)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('guardPerformance.guard', 'employeeId firstName lastName')
      .populate('guardPerformance.site', 'name')
      .populate('sitePerformance.site', 'name')
      .populate('versionHistory.changedBy', 'firstName lastName');

    if (!report) {
      return ApiError(res, 'Weekly report not found', 404, 'WEEKLY_REPORT_NOT_FOUND');
    }

    return ApiSuccess(res, report);
  } catch (error) {
    return ApiError(res, 'Failed to fetch weekly report', 500, 'FETCH_WEEKLY_REPORT_FAILED');
  }
};

const createWeeklyReport = async (req, res) => {
  try {
    const { weekStart, weekEnd, site, title, executiveSummary, guardOperations, qrPatrol, gps, aes, radio, incidents, customerIssues, controlRoomActivity, kpiSummary, trendData, guardPerformance, sitePerformance, managementAttention, recommendations, attachments } = req.body;

    if (!weekStart || !weekEnd) {
      return ApiError(res, 'Week start and end dates are required', 400, 'MISSING_DATES');
    }

    if (site) {
      const siteExists = await Site.findById(site);
      if (!siteExists) {
        return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
      }
    }

    const reportNumber = generateReportNumber('WR');
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    const weekNumber = Math.ceil(((startDate - new Date(startDate.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
    const period = `${startDate.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;

    const report = await WeeklyReport.create({
      reportNumber,
      weekStart: startDate,
      weekEnd: endDate,
      period,
      site,
      title,
      executiveSummary,
      guardOperations,
      qrPatrol,
      gps,
      aes,
      radio,
      incidents,
      customerIssues,
      controlRoomActivity,
      kpiSummary,
      trendData,
      guardPerformance,
      sitePerformance,
      managementAttention,
      recommendations,
      attachments,
      status: 'DRAFT',
      createdBy: req.user._id
    });

    const populatedReport = await WeeklyReport.findById(report._id)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName');

    return ApiSuccess(res, populatedReport, 'Weekly report created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create weekly report', 500, 'CREATE_WEEKLY_REPORT_FAILED');
  }
};

const updateWeeklyReport = async (req, res) => {
  try {
    const report = await WeeklyReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Weekly report not found', 404, 'WEEKLY_REPORT_NOT_FOUND');
    }

    if (report.status === 'PUBLISHED' || report.status === 'ARCHIVED') {
      return ApiError(res, 'Cannot update published or archived reports', 400, 'INVALID_STATUS');
    }

    const { title, executiveSummary, guardOperations, qrPatrol, gps, aes, radio, incidents, customerIssues, controlRoomActivity, kpiSummary, trendData, guardPerformance, sitePerformance, managementAttention, recommendations, attachments } = req.body;

    if (title !== undefined) report.title = title;
    if (executiveSummary !== undefined) report.executiveSummary = executiveSummary;
    if (guardOperations) report.guardOperations = { ...report.guardOperations, ...guardOperations };
    if (qrPatrol) report.qrPatrol = { ...report.qrPatrol, ...qrPatrol };
    if (gps) report.gps = { ...report.gps, ...gps };
    if (aes) report.aes = { ...report.aes, ...aes };
    if (radio) report.radio = { ...report.radio, ...radio };
    if (incidents) report.incidents = { ...report.incidents, ...incidents };
    if (customerIssues) report.customerIssues = { ...report.customerIssues, ...customerIssues };
    if (controlRoomActivity) report.controlRoomActivity = { ...report.controlRoomActivity, ...controlRoomActivity };
    if (kpiSummary) report.kpiSummary = { ...report.kpiSummary, ...kpiSummary };
    if (trendData) report.trendData = { ...report.trendData, ...trendData };
    if (guardPerformance) report.guardPerformance = guardPerformance;
    if (sitePerformance) report.sitePerformance = sitePerformance;
    if (managementAttention) report.managementAttention = managementAttention;
    if (recommendations) report.recommendations = recommendations;
    if (attachments) report.attachments = attachments;

    report.version += 1;
    report.versionHistory.push({
      version: report.version,
      changedBy: req.user._id,
      changedAt: new Date(),
      changes: 'Report updated'
    });

    await report.save();

    return ApiSuccess(res, report, 'Weekly report updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update weekly report', 500, 'UPDATE_WEEKLY_REPORT_FAILED');
  }
};

const getMonthlyReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, site, status, month, year } = req.query;
    const { skip, limit: queryLimit } = paginate(null, parseInt(page), parseInt(limit));

    const query = {};
    if (site) query.site = site;
    if (status) query.status = status;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const reports = await MonthlyReport.find(query)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(queryLimit)
      .sort({ year: -1, month: -1 });

    const total = await MonthlyReport.countDocuments(query);

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
    return ApiError(res, 'Failed to fetch monthly reports', 500, 'FETCH_MONTHLY_REPORTS_FAILED');
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const report = await MonthlyReport.findById(req.params.id)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('guardPerformance.guard', 'employeeId firstName lastName')
      .populate('guardPerformance.site', 'name')
      .populate('sitePerformance.site', 'name')
      .populate('versionHistory.changedBy', 'firstName lastName');

    if (!report) {
      return ApiError(res, 'Monthly report not found', 404, 'MONTHLY_REPORT_NOT_FOUND');
    }

    return ApiSuccess(res, report);
  } catch (error) {
    return ApiError(res, 'Failed to fetch monthly report', 500, 'FETCH_MONTHLY_REPORT_FAILED');
  }
};

const createMonthlyReport = async (req, res) => {
  try {
    const { month, year, site, title, executiveSummary, guardOperations, qrPatrol, gps, aes, radio, incidents, customerIssues, controlRoomActivity, kpiSummary, trendData, guardPerformance, sitePerformance, incidentSeverityDistribution, systemUptime, reportCompletionRate, escalationCompliance, majorIncidents, recurringIssues, operationalRisks, correctiveActions, managementAttention, recommendations, attachments } = req.body;

    if (!month || !year) {
      return ApiError(res, 'Month and year are required', 400, 'MISSING_FIELDS');
    }

    if (site) {
      const siteExists = await Site.findById(site);
      if (!siteExists) {
        return ApiError(res, 'Site not found', 404, 'SITE_NOT_FOUND');
      }
    }

    const reportNumber = generateReportNumber('MR');
    const period = `${year}-${month.toString().padStart(2, '0')}`;

    const report = await MonthlyReport.create({
      reportNumber,
      month,
      year,
      period,
      site,
      title,
      executiveSummary,
      guardOperations,
      qrPatrol,
      gps,
      aes,
      radio,
      incidents,
      customerIssues,
      controlRoomActivity,
      kpiSummary,
      trendData,
      guardPerformance,
      sitePerformance,
      incidentSeverityDistribution,
      systemUptime,
      reportCompletionRate,
      escalationCompliance,
      majorIncidents,
      recurringIssues,
      operationalRisks,
      correctiveActions,
      managementAttention,
      recommendations,
      attachments,
      status: 'DRAFT',
      createdBy: req.user._id
    });

    const populatedReport = await MonthlyReport.findById(report._id)
      .populate('site', 'name address')
      .populate('createdBy', 'firstName lastName');

    return ApiSuccess(res, populatedReport, 'Monthly report created successfully', 201);
  } catch (error) {
    return ApiError(res, 'Failed to create monthly report', 500, 'CREATE_MONTHLY_REPORT_FAILED');
  }
};

const updateMonthlyReport = async (req, res) => {
  try {
    const report = await MonthlyReport.findById(req.params.id);
    if (!report) {
      return ApiError(res, 'Monthly report not found', 404, 'MONTHLY_REPORT_NOT_FOUND');
    }

    if (report.status === 'PUBLISHED' || report.status === 'ARCHIVED') {
      return ApiError(res, 'Cannot update published or archived reports', 400, 'INVALID_STATUS');
    }

    const { title, executiveSummary, guardOperations, qrPatrol, gps, aes, radio, incidents, customerIssues, controlRoomActivity, kpiSummary, trendData, guardPerformance, sitePerformance, incidentSeverityDistribution, systemUptime, reportCompletionRate, escalationCompliance, majorIncidents, recurringIssues, operationalRisks, correctiveActions, managementAttention, recommendations, attachments } = req.body;

    if (title !== undefined) report.title = title;
    if (executiveSummary !== undefined) report.executiveSummary = executiveSummary;
    if (guardOperations) report.guardOperations = { ...report.guardOperations, ...guardOperations };
    if (qrPatrol) report.qrPatrol = { ...report.qrPatrol, ...qrPatrol };
    if (gps) report.gps = { ...report.gps, ...gps };
    if (aes) report.aes = { ...report.aes, ...aes };
    if (radio) report.radio = { ...report.radio, ...radio };
    if (incidents) report.incidents = { ...report.incidents, ...incidents };
    if (customerIssues) report.customerIssues = { ...report.customerIssues, ...customerIssues };
    if (controlRoomActivity) report.controlRoomActivity = { ...report.controlRoomActivity, ...controlRoomActivity };
    if (kpiSummary) report.kpiSummary = { ...report.kpiSummary, ...kpiSummary };
    if (trendData) report.trendData = { ...report.trendData, ...trendData };
    if (guardPerformance) report.guardPerformance = guardPerformance;
    if (sitePerformance) report.sitePerformance = sitePerformance;
    if (incidentSeverityDistribution) report.incidentSeverityDistribution = { ...report.incidentSeverityDistribution, ...incidentSeverityDistribution };
    if (systemUptime !== undefined) report.systemUptime = systemUptime;
    if (reportCompletionRate !== undefined) report.reportCompletionRate = reportCompletionRate;
    if (escalationCompliance !== undefined) report.escalationCompliance = escalationCompliance;
    if (majorIncidents) report.majorIncidents = majorIncidents;
    if (recurringIssues) report.recurringIssues = recurringIssues;
    if (operationalRisks) report.operationalRisks = operationalRisks;
    if (correctiveActions) report.correctiveActions = correctiveActions;
    if (managementAttention) report.managementAttention = managementAttention;
    if (recommendations) report.recommendations = recommendations;
    if (attachments) report.attachments = attachments;

    report.version += 1;
    report.versionHistory.push({
      version: report.version,
      changedBy: req.user._id,
      changedAt: new Date(),
      changes: 'Report updated'
    });

    await report.save();

    return ApiSuccess(res, report, 'Monthly report updated successfully');
  } catch (error) {
    return ApiError(res, 'Failed to update monthly report', 500, 'UPDATE_MONTHLY_REPORT_FAILED');
  }
};

const approveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await DailyReport.findById(id) || await WeeklyReport.findById(id) || await MonthlyReport.findById(id);

    if (!report) {
      return ApiError(res, 'Report not found', 404, 'REPORT_NOT_FOUND');
    }

    if (report.status !== 'UNDER_REVIEW' && report.status !== 'DRAFT') {
      return ApiError(res, 'Can only approve reports with UNDER_REVIEW or DRAFT status', 400, 'INVALID_STATUS');
    }

    report.status = 'APPROVED';
    report.approvedBy = req.user._id;
    report.approvedAt = new Date();

    await report.save();

    return ApiSuccess(res, report, 'Report approved successfully');
  } catch (error) {
    return ApiError(res, 'Failed to approve report', 500, 'APPROVE_REPORT_FAILED');
  }
};

const returnReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await DailyReport.findById(id) || await WeeklyReport.findById(id) || await MonthlyReport.findById(id);

    if (!report) {
      return ApiError(res, 'Report not found', 404, 'REPORT_NOT_FOUND');
    }

    const { reason } = req.body;

    report.status = 'RETURNED';
    report.version += 1;
    report.versionHistory.push({
      version: report.version,
      changedBy: req.user._id,
      changedAt: new Date(),
      changes: 'Report returned for correction',
      reason: reason || 'Needs correction'
    });

    await report.save();

    return ApiSuccess(res, report, 'Report returned for correction');
  } catch (error) {
    return ApiError(res, 'Failed to return report', 500, 'RETURN_REPORT_FAILED');
  }
};

const publishReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await DailyReport.findById(id) || await WeeklyReport.findById(id) || await MonthlyReport.findById(id);

    if (!report) {
      return ApiError(res, 'Report not found', 404, 'REPORT_NOT_FOUND');
    }

    if (report.status !== 'APPROVED') {
      return ApiError(res, 'Can only publish approved reports', 400, 'INVALID_STATUS');
    }

    report.status = 'PUBLISHED';
    report.publishedAt = new Date();

    await report.save();

    return ApiSuccess(res, report, 'Report published successfully');
  } catch (error) {
    return ApiError(res, 'Failed to publish report', 500, 'PUBLISH_REPORT_FAILED');
  }
};

export {
  getDailyReports,
  getDailyReport,
  createDailyReport,
  updateDailyReport,
  approveDailyReport,
  returnDailyReport,
  publishDailyReport,
  getWeeklyReports,
  getWeeklyReport,
  createWeeklyReport,
  updateWeeklyReport,
  getMonthlyReports,
  getMonthlyReport,
  createMonthlyReport,
  updateMonthlyReport,
  approveReport,
  returnReport,
  publishReport
};
