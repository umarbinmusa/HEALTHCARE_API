import mongoose from "mongoose";

const { Schema, model } = mongoose;

const outpatientPrescriptionSchema = new Schema(
  {
    drug: { type: Schema.Types.ObjectId, ref: "Drug" },
    dosage: { type: String },
    duration: { type: String }
  },
  { _id: false }
);

const outpatientRecordSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    consultant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    temp: { type: String },
    bp: { type: String },
    weight: { type: String },
    pulse: { type: String },
    notes: { type: String },
    diagnosis: { type: String },
    prescriptions: [outpatientPrescriptionSchema],
    status: { type: String, default: "COMPLETED" }
  },
  { timestamps: true }
);

export default model("OutpatientRecord", outpatientRecordSchema);
