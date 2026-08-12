import mongoose from 'mongoose';

const radioCommunicationSchema = new mongoose.Schema({
  communicationId: {
    type: String,
    required: [true, 'Communication ID is required'],
    unique: true,
    trim: true
  },
  guard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guard'
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: [true, 'Site reference is required']
  },
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  communicationType: {
    type: String,
    enum: ['RADIO', 'PHONE', 'SMS', 'IN_PERSON', 'AES'],
    default: 'RADIO'
  },
  message: {
    type: String
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  acknowledgedAt: {
    type: Date
  },
  responseTimeSeconds: {
    type: Number
  },
  status: {
    type: String,
    enum: ['SENT', 'ACKNOWLEDGED', 'FAILED'],
    default: 'SENT'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

radioCommunicationSchema.index({ guard: 1 });
radioCommunicationSchema.index({ site: 1 });
radioCommunicationSchema.index({ sentAt: 1 });

const RadioCommunication = mongoose.model('RadioCommunication', radioCommunicationSchema);

export default RadioCommunication;
