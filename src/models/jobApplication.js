import mongoose from "mongoose";

const { Schema, model } = mongoose;

const jobApplicationSchema = new Schema(
  {
    freelancer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: Schema.Types.ObjectId, ref: "FreelanceJob", required: true },
    status: { type: String, default: "PENDING" }
  },
  { timestamps: true }
);

export default model("JobApplication", jobApplicationSchema);
