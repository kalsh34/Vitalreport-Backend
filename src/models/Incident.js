import mongoose from 'mongoose';
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES } from '../utils/constants.js';

const incidentSchema = new mongoose.Schema({
  incidentNumber: {
    type: String,
    required: [true, 'Incident number is required'],
    unique: true,
    trim: true
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
  guard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guard'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  incidentType: {
    type: String,
    required: [true, 'Incident type is required'],
    trim: true
  },
  severity: {
    type: String,
    enum: INCIDENT_SEVERITIES,
    required: [true, 'Severity is required']
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
  reportedAt: {
    type: Date,
    default: Date.now
  },
  firstResponseAt: {
    type: Date
  },
  escalatedAt: {
    type: Date
  },
  customerNotifiedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  closedAt: {
    type: Date
  },
  guardExplanation: {
    type: String
  },
  controlRoomNotes: {
    type: String
  },
  actionTaken: {
    type: String
  },
  rootCause: {
    type: String
  },
  status: {
    type: String,
    enum: INCIDENT_STATUSES,
    default: 'OPEN'
  },
  relatedGuardReport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuardReport'
  },
  relatedAESEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AESEvent'
  },
  actions: [{
    action: {
      type: String
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date
    },
    notes: {
      type: String
    }
  }],
  severityNote: {
    type: String
  },
  isSOS: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

incidentSchema.index({ site: 1 });
incidentSchema.index({ guard: 1 });
incidentSchema.index({ severity: 1 });
incidentSchema.index({ status: 1 });
incidentSchema.index({ incidentNumber: 1 });
incidentSchema.index({ reportedAt: 1 });

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;
