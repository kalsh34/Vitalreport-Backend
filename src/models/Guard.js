import mongoose from 'mongoose';
import { GUARD_STATUSES } from '../utils/constants.js';

const guardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  assignedSite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },
  assignedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  assignedShift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  status: {
    type: String,
    enum: GUARD_STATUSES,
    default: 'OFF_DUTY'
  },
  device: {
    deviceId: String,
    batteryLevel: Number,
    networkStatus: String,
    lastSeen: Date
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }
}, {
  timestamps: true
});

guardSchema.index({ lastLocation: '2dsphere' });
guardSchema.index({ employeeId: 1 });
guardSchema.index({ assignedSite: 1 });
guardSchema.index({ status: 1 });

const Guard = mongoose.model('Guard', guardSchema);

export default Guard;
