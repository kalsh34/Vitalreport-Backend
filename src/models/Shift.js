import mongoose from 'mongoose';
import { SHIFT_STATUSES } from '../utils/constants.js';

const shiftSchema = new mongoose.Schema({
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
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  status: {
    type: String,
    enum: SHIFT_STATUSES,
    default: 'SCHEDULED'
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

shiftSchema.index({ guard: 1 });
shiftSchema.index({ site: 1 });
shiftSchema.index({ status: 1 });
shiftSchema.index({ startTime: 1 });
shiftSchema.index({ endTime: 1 });

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;
