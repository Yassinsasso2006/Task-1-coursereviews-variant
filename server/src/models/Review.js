import mongoose from 'mongoose';


const reviewSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

//This is to make sure that a user can only submit one review per course. 
//The combination of courseCode and reviewedBy must be unique.
reviewSchema.index({ courseCode: 1, reviewedBy: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
