import mongoose from 'mongoose';

const patrolEventSchema = new mongoose.Schema({
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
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatrolRoute'
  },
  checkpoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatrolCheckpoint',
    required: [true, 'Checkpoint reference is required']
  },
  checkpointName: {
    type: String,
    trim: true
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
  accuracyM: {
    type: Number
  },
  geofenceStatus: {
    type: String,
    enum: ['INSIDE_GEOFENCE', 'OUTSIDE_GEOFENCE']
  },
  scannedAt: {
    type: Date,
    default: Date.now
  },
  deviceId: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

patrolEventSchema.index({ guard: 1 });
patrolEventSchema.index({ site: 1 });
patrolEventSchema.index({ shift: 1 });
patrolEventSchema.index({ checkpoint: 1 });
patrolEventSchema.index({ scannedAt: 1 });

const PatrolEvent = mongoose.model('PatrolEvent', patrolEventSchema);

export default PatrolEvent;
