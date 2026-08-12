import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: [true, 'Site reference is required']
  },
  name: {
    type: String,
    required: [true, 'Post name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

postSchema.index({ site: 1 });

const Post = mongoose.model('Post', postSchema);

export default Post;
