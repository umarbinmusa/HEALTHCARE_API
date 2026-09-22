import mongoose from "mongoose";

const { Schema, model } = mongoose;

const labTestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String },
    description: { type: String },
    price: { type: Number, default: 0 },
    sampleType: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default model("LabTest", labTestSchema);
