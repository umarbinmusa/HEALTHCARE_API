import mongoose from "mongoose";

const { Schema, model } = mongoose;

const labOrderSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    testName: { type: String, required: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PENDING"
    },
    result: { type: String },
    resultNotes: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export default model("LabOrder", labOrderSchema);
