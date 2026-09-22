import mongoose from "mongoose";

const { Schema, model } = mongoose;
const orderItemSchema = new Schema(

  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    drug: {
      type: Schema.Types.ObjectId,
      ref: "Drug",
      required: true,
    },

    quantity: Number,

    unitPrice: Number,

    totalPrice: Number,
  },
  { timestamps: true }
);

export default model("OrderItem", orderItemSchema);