import mongoose from 'mongoose';

const patrolRouteSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: [true, 'Site reference is required']
  },
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  estimatedDuration: {
    type: Number,
    description: 'Estimated duration in minutes'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

patrolRouteSchema.index({ site: 1 });

const PatrolRoute = mongoose.model('PatrolRoute', patrolRouteSchema);

export default PatrolRoute;
