import mongoose from 'mongoose';

const patrolCheckpointSchema = new mongoose.Schema({
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatrolRoute',
    required: [true, 'Route reference is required']
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: [true, 'Site reference is required']
  },
  name: {
    type: String,
    required: [true, 'Checkpoint name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  qrCode: {
    type: String,
    required: [true, 'QR code is required'],
    unique: true,
    trim: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

patrolCheckpointSchema.index({ route: 1 });
patrolCheckpointSchema.index({ site: 1 });
patrolCheckpointSchema.index({ qrCode: 1 });

const PatrolCheckpoint = mongoose.model('PatrolCheckpoint', patrolCheckpointSchema);

export default PatrolCheckpoint;
