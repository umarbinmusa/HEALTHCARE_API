import mongoose from "mongoose";

const { Schema, model } = mongoose;

const appointmentSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    consultant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    reason: {
      type: String,
      required: true
    },

    appointmentDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "CANCELLED",
        "COMPLETED"
      ],
      default: "PENDING"
    },

    // Jitsi Video Consultation
    meetingLink: {
      type: String,
      default: null
    },

    meetingStatus: {
      type: String,
      enum: [
        "PENDING",
        "ACTIVE",
        "ENDED"
      ],
      default: "PENDING"
    }
  },
  { timestamps: true }
);

export default model(
  "Appointment",
  appointmentSchema
);