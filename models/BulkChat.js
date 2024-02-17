import mongoose from 'mongoose';
const BulkChatSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  template: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
});

export default mongoose.model('BulkChat', BulkChatSchema);
