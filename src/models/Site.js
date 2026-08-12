import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true
  },
  clientName: {
    type: String,
    trim: true
  },
  address: {
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
      type: [Number],
      default: [0, 0]
    }
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  geofenceRadius: {
    type: Number,
    default: 200,
    min: 10,
    max: 5000
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  siteManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  contactPerson: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

siteSchema.index({ location: '2dsphere' });
siteSchema.index({ name: 1 });
siteSchema.index({ status: 1 });

const Site = mongoose.model('Site', siteSchema);

export default Site;
