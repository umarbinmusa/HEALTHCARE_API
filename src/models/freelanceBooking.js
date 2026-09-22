import mongoose from "mongoose";

const freelanceBookingSchema =
  new mongoose.Schema(
    {
      patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      freelancer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FreelancerProfile",
        required: true,
      },

      service: {
        type: String,
        required: true,
      },

      date: Date,

      status: {
        type: String,
        default: "PENDING",
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "FreelanceBooking",
  freelanceBookingSchema
);