import mongoose from "mongoose";

const { Schema, model } = mongoose;

const freelanceJobSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    freelancerType: {
      type: String,
      enum: [
        "DOCTOR",
        "NURSE",
        "PHARMACIST",
        "LAB_SCIENTIST",
        "PHYSIOTHERAPIST",
        "MIDWIFE"
      ],
      required: true
    },
    location: { type: String },
    budget: { type: Number },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, default: "OPEN" }
  },
  { timestamps: true }
);

export default model("FreelanceJob", freelanceJobSchema);
