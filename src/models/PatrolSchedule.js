import mongoose from 'mongoose';

const patrolScheduleSchema = new mongoose.Schema({
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
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  guard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guard'
  },
  scheduledTime: {
    type: Date
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    description: '0=Sunday, 6=Saturday'
  },
  frequency: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'CUSTOM'],
    default: 'DAILY'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

patrolScheduleSchema.index({ route: 1 });
patrolScheduleSchema.index({ site: 1 });
patrolScheduleSchema.index({ guard: 1 });
patrolScheduleSchema.index({ dayOfWeek: 1 });

const PatrolSchedule = mongoose.model('PatrolSchedule', patrolScheduleSchema);

export default PatrolSchedule;
