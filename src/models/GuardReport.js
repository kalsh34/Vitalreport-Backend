import mongoose from 'mongoose';
import { GUARD_REPORT_STATUSES } from '../utils/constants.js';

const guardReportSchema = new mongoose.Schema({
  reportNumber: {
    type: String,
    required: [true, 'Report number is required'],
    unique: true,
    trim: true
  },
  guard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guard',
    required: [true, 'Guard reference is required']
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: [true, 'Site reference is required']
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number]
    }
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  photos: [{
    type: String
  }],
  attachments: [{
    type: String
  }],
  witness: {
    type: String,
    trim: true
  },
  relatedCheckpoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatrolCheckpoint'
  },
  relatedIncident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident'
  },
  relatedAESEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AESEvent'
  },
  status: {
    type: String,
    enum: GUARD_REPORT_STATUSES,
    default: 'DRAFT'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  approvalNotes: {
    type: String
  },
  submittedAt: {
    type: Date
  },
  controlRoomNotes: {
    type: String
  },
  actionTaken: {
    type: String
  }
}, {
  timestamps: true
});

guardReportSchema.index({ guard: 1 });
guardReportSchema.index({ site: 1 });
guardReportSchema.index({ status: 1 });
guardReportSchema.index({ category: 1 });
guardReportSchema.index({ reportNumber: 1 });
guardReportSchema.index({ submittedAt: 1 });

const GuardReport = mongoose.model('GuardReport', guardReportSchema);

export default GuardReport;
