import mongoose from 'mongoose';
const ChatSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  isComing: {
    type: Boolean,
    required: true,
  },
  message: {
    type: Object,
  },
  status: {
    type: String,
  },
  message_id: {
    type: String,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  msg_timestamp: {
    type: String,
  }
});

export default mongoose.model('Chat', ChatSchema);
