import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Permission name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

permissionSchema.index({ name: 1 });

const Permission = mongoose.model('Permission', permissionSchema);

export default Permission;
