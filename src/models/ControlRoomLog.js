import mongoose from 'mongoose';

const controlRoomLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Operator reference is required']
  },
  event: {
    type: String,
    required: [true, 'Event is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['GUARD_ACTIVITY', 'AES_ALARM', 'RADIO', 'INCIDENT', 'PATROL', 'GPS', 'REPORT', 'SYSTEM', 'OTHER'],
    default: 'OTHER'
  },
  description: {
    type: String
  },
  actionTaken: {
    type: String
  },
  relatedGuard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guard'
  },
  relatedSite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },
  relatedIncident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident'
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'ESCALATED'],
    default: 'OPEN'
  }
}, {
  timestamps: true
});

controlRoomLogSchema.index({ date: 1 });
controlRoomLogSchema.index({ operator: 1 });
controlRoomLogSchema.index({ category: 1 });
controlRoomLogSchema.index({ relatedSite: 1 });

const ControlRoomLog = mongoose.model('ControlRoomLog', controlRoomLogSchema);

export default ControlRoomLog;
