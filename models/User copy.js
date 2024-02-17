import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
  avatar: {
    type: String,
    default: 'K',
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  roles: {
    type: String,
    enum: ['admin', 'super'],
    default: 'admin',
  },
  accountId: {
    type: String,
  },
  accountToken: {
    type: String,
  },
  accessToken: {
    type: String,
  },
  phoneId: {
    type: String,
  },
  template: {
    type: Array,
  },
  approved: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model('User', UserSchema);
