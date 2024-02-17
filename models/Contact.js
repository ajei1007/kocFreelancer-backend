import mongoose from 'mongoose';
const ContactSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  label: {
    type: Array,
    default: ["unknown"],
  },
  allowed: {
    type: Boolean,
    default: false,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

export default mongoose.model('Contact', ContactSchema);
