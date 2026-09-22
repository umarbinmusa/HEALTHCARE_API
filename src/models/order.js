import mongoose from "mongoose";

const { Schema, model } = mongoose;

const orderItemSchema = new Schema({
  drug: {
    type: Schema.Types.ObjectId,
    ref: "Drug",
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
  },

  unitPrice: {
    type: Number,
    required: true,
  },

  totalPrice: {
    type: Number,
    required: true,
  },
});

const orderSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    items: [orderItemSchema],

    totalAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      default: "COMPLETED",
    },
  },
  {
    timestamps: true,
  }
);

export default model("Order", orderSchema);