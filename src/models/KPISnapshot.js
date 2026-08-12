import mongoose from 'mongoose';

const kpiSnapshotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  period: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
    default: 'DAILY'
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },
  kpis: {
    alarmResponseTime: { value: Number, target: Number, status: String },
    alarmVerificationTime: { value: Number, target: Number, status: String },
    emergencyEscalationTime: { value: Number, target: Number, status: String },
    guardCheckInCompliance: { value: Number, target: Number, status: String },
    missedQRPatrols: { value: Number, target: Number, status: String },
    falseAlarmRate: { value: Number, target: Number, status: String },
    unverifiedAlarmRate: { value: Number, target: Number, status: String },
    incidentReportCompletion: { value: Number, target: Number, status: String },
    reportSubmissionOnTime: { value: Number, target: Number, status: String },
    guardAbsenceDetection: { value: Number, target: Number, status: String },
    communicationResponse: { value: Number, target: Number, status: String },
    radioAvailability: { value: Number, target: Number, status: String },
    systemUptime: { value: Number, target: Number, status: String },
    customerNotificationTime: { value: Number, target: Number, status: String },
    incidentClosureRate: { value: Number, target: Number, status: String },
    escalationCompliance: { value: Number, target: Number, status: String },
    controlRoomAttendance: { value: Number, target: Number, status: String },
    dailyLogAccuracy: { value: Number, target: Number, status: String },
    customerComplaints: { value: Number, target: Number, status: String }
  },
  guardAccountabilityScore: {
    qrPatrol: { type: Number, default: 0 },
    attendance: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    reporting: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  controlRoomScore: {
    guardAccountability: { type: Number, default: 0 },
    alarmEmergencyResponse: { type: Number, default: 0 },
    incidentManagement: { type: Number, default: 0 },
    reportingAccuracy: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    systemUptime: { type: Number, default: 0 },
    customerService: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    rating: { type: String }
  }
}, {
  timestamps: true
});

kpiSnapshotSchema.index({ date: 1 });
kpiSnapshotSchema.index({ period: 1 });
kpiSnapshotSchema.index({ site: 1 });

const KPISnapshot = mongoose.model('KPISnapshot', kpiSnapshotSchema);

export default KPISnapshot;
