import mongoose from 'mongoose';
import { AES_ALARM_TYPES, AES_STATUSES } from '../utils/constants.js';

const aesEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: [true, 'Event ID is required'],
    unique: true,
    trim: true
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: [true, 'Site reference is required']
  },
  zone: {
    type: String,
    trim: true
  },
  alarmType: {
    type: String,
    required: [true, 'Alarm type is required'],
    enum: AES_ALARM_TYPES
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  operatorAction: {
    type: String
  },
  verifiedAt: {
    type: Date
  },
  verificationResult: {
    type: String
  },
  falseAlarm: {
    type: Boolean,
    default: false
  },
  escalated: {
    type: Boolean,
    default: false
  },
  escalatedAt: {
    type: Date
  },
  customerNotification: {
    type: String
  },
  resolvedAt: {
    type: Date
  },
  resolution: {
    type: String
  },
  status: {
    type: String,
    enum: AES_STATUSES,
    default: 'RECEIVED'
  },
  notes: {
    type: String
  },
  responseTimeSeconds: {
    type: Number
  },
  verificationTimeSeconds: {
    type: Number
  }
}, {
  timestamps: true
});

aesEventSchema.index({ site: 1 });
aesEventSchema.index({ alarmType: 1 });
aesEventSchema.index({ status: 1 });
aesEventSchema.index({ receivedAt: 1 });

const AESEvent = mongoose.model('AESEvent', aesEventSchema);

export default AESEvent;
