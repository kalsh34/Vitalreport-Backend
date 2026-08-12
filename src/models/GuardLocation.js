import mongoose from 'mongoose';
import { LOCATION_STATUSES } from '../utils/constants.js';

const guardLocationSchema = new mongoose.Schema({
  guard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guard',
    required: [true, 'Guard reference is required']
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required']
    }
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required']
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required']
  },
  accuracyM: {
    type: Number
  },
  batteryLevel: {
    type: Number
  },
  networkStatus: {
    type: String,
    trim: true
  },
  deviceId: {
    type: String,
    trim: true
  },
  locationStatus: {
    type: String,
    enum: LOCATION_STATUSES,
    default: 'INSIDE_GEOFENCE'
  },
  distanceFromSiteM: {
    type: Number
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

guardLocationSchema.index({ location: '2dsphere' });
guardLocationSchema.index({ guard: 1 });
guardLocationSchema.index({ shift: 1 });
guardLocationSchema.index({ recordedAt: 1 });
guardLocationSchema.index({ locationStatus: 1 });

const GuardLocation = mongoose.model('GuardLocation', guardLocationSchema);

export default GuardLocation;
