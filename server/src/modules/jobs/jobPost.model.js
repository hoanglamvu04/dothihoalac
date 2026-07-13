import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      unique: true,
      index: true,
    },
    jobType: {
      type: String,
      enum: [
        'full_time',
        'part_time',
        'internship',
        'temporary',
        'student',
        'construction',
        'service',
      ],
      required: true,
      index: true,
    },
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    salaryMin: { type: Number, min: 0, default: null },
    salaryMax: { type: Number, min: 0, default: null },
    salaryUnit: {
      type: String,
      enum: ['month', 'hour', 'day', 'project', 'negotiable'],
      default: 'month',
    },
    experienceLevel: {
      type: String,
      enum: ['none', 'under_1_year', '1_3_years', '3_5_years', 'over_5_years'],
      default: 'none',
    },
    workLocation: { type: String, required: true, maxlength: 500 },
    applicationMethod: { type: String, default: '', maxlength: 2000 },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    deadline: { type: Date, required: true, index: true },
    positionsCount: { type: Number, min: 1, default: 1 },
  },
  { timestamps: true, collection: 'jobposts' },
);
export default getOrCreateModel('JobPost', schema, 'jobposts');
