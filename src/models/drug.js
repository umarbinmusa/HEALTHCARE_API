import mongoose from "mongoose";

const { Schema, model } = mongoose;

const drugSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String
    },
    description: {
      type: String
    },
    price: {
      type: Number,
      required: true
    },
    stock: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
     reorderLevel: {
      type: Number,
      default: 10,
    },
  },
  { timestamps: true }
);

export default model("Drug", drugSchema);
