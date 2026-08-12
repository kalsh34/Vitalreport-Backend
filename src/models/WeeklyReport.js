import mongoose from 'mongoose';
import { REPORT_DOC_STATUSES } from '../utils/constants.js';

const weeklyReportSchema = new mongoose.Schema({
  reportNumber: {
    type: String,
    required: [true, 'Report number is required'],
    unique: true,
    trim: true
  },
  weekStart: {
    type: Date,
    required: [true, 'Week start date is required']
  },
  weekEnd: {
    type: Date,
    required: [true, 'Week end date is required']
  },
  period: {
    type: String,
    description: 'e.g. 2026-W31'
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },
  title: {
    type: String
  },
  executiveSummary: {
    type: String
  },
  guardOperations: {
    guardsOnDuty: { type: Number, default: 0 },
    guardsAbsent: { type: Number, default: 0 },
    guardAccountability: { type: Number, default: 0 },
    patrolCompliance: { type: Number, default: 0 },
    locationCompliance: { type: Number, default: 0 },
    narrative: { type: String }
  },
  qrPatrol: {
    scheduledPatrols: { type: Number, default: 0 },
    completedPatrols: { type: Number, default: 0 },
    missedPatrols: { type: Number, default: 0 },
    compliancePercent: { type: Number, default: 0 },
    narrative: { type: String }
  },
  gps: {
    activeGuards: { type: Number, default: 0 },
    onlineGuards: { type: Number, default: 0 },
    offlineGuards: { type: Number, default: 0 },
    outsideGeofenceEvents: { type: Number, default: 0 },
    narrative: { type: String }
  },
  aes: {
    totalAlarms: { type: Number, default: 0 },
    verifiedAlarms: { type: Number, default: 0 },
    falseAlarms: { type: Number, default: 0 },
    criticalAlarms: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    averageVerificationTime: { type: Number, default: 0 },
    narrative: { type: String }
  },
  radio: {
    communications: { type: Number, default: 0 },
    responseCompliance: { type: Number, default: 0 },
    communicationIssues: { type: Number, default: 0 },
    narrative: { type: String }
  },
  incidents: {
    total: { type: Number, default: 0 },
    open: { type: Number, default: 0 },
    resolved: { type: Number, default: 0 },
    critical: { type: Number, default: 0 },
    escalated: { type: Number, default: 0 },
    narrative: { type: String }
  },
  customerIssues: {
    notifications: { type: Number, default: 0 },
    complaints: { type: Number, default: 0 },
    clientRelatedIncidents: { type: Number, default: 0 },
    narrative: { type: String }
  },
  controlRoomActivity: {
    majorActions: { type: String },
    escalations: { type: String },
    importantObservations: { type: String }
  },
  kpiSummary: {
    alarmResponse: { value: Number, status: String },
    qrPatrolCompliance: { value: Number, status: String },
    alarmVerification: { value: Number, status: String },
    falseAlarmRate: { value: Number, status: String },
    criticalEscalation: { value: Number, status: String },
    incidentReports: { value: Number, status: String },
    systemUptime: { value: Number, status: String },
    customerComplaints: { value: Number, status: String }
  },
  trendData: {
    alarmResponseTrend: { type: [Number] },
    qrPatrolTrend: { type: [Number] },
    falseAlarmTrend: { type: [Number] },
    incidentTrend: { type: [Number] }
  },
  guardPerformance: [{
    guard: { type: mongoose.Schema.Types.ObjectId, ref: 'Guard' },
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    accountabilityScore: { type: Number },
    patrolCompliance: { type: Number },
    attendance: { type: Number }
  }],
  sitePerformance: [{
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    score: { type: Number },
    incidents: { type: Number },
    compliance: { type: Number }
  }],
  managementAttention: [{
    type: String
  }],
  recommendations: [{
    type: String
  }],
  attachments: [{
    type: String
  }],
  status: {
    type: String,
    enum: REPORT_DOC_STATUSES,
    default: 'DRAFT'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  publishedAt: {
    type: Date
  },
  version: {
    type: Number,
    default: 1
  },
  versionHistory: [{
    version: { type: Number },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date },
    changes: { type: String },
    reason: { type: String }
  }]
}, {
  timestamps: true
});

weeklyReportSchema.index({ weekStart: 1 });
weeklyReportSchema.index({ site: 1 });
weeklyReportSchema.index({ status: 1 });
weeklyReportSchema.index({ reportNumber: 1 });

const WeeklyReport = mongoose.model('WeeklyReport', weeklyReportSchema);

export default WeeklyReport;
