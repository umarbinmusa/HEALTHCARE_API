import mongoose from "mongoose";
const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    full_name: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["ADMIN", "CONSULTANT", "PATIENT", "PHARMACY", "LAB"],
      default: "PATIENT",
    }
  },
  { timestamps: true }
);

export default model("User", userSchema);
