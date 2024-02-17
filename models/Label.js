import mongoose from 'mongoose';
const LabelSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  phoneNumbers: {
    type: Array,
  },
});

export default mongoose.model('Label', LabelSchema);
