import mongoose from "mongoose";

const freelancerProfileSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      type: {
        type: String,
        enum: [
          "DOCTOR",
          "NURSE",
          "PHARMACIST",
          "LAB_SCIENTIST",
          "PHYSIOTHERAPIST",
          "MIDWIFE",
        ],
        required: true,
      },

      specialty: String,
      qualification: String,
      experience: Number,
      location: String,
      hourlyRate: Number,
      availability: String,
      bio: String,
    },
    { timestamps: true }
  );

export default mongoose.model(
  "FreelancerProfile",
  freelancerProfileSchema
);