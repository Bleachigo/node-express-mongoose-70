import { Schema, model } from 'mongoose';

const balloonSchema = new Schema(
  {
    color: {
      type: String,
      required: [true, 'Color is required'],
      enum: ['red', 'green', 'blue'],
    },
    shape: {
      type: String,
      required: [true, 'Shape is required'],
      enum: ['round', 'heart', 'star'],
    },
    size: {
      type: Number,
      required: [true, 'Size is required'],
      min: 20,
      max: 100,
      validate: {
        validator: function (v) {
          return Number.isInteger(v);
        },
        message: (props) => {
          return `You have entered ${props.value}. Must be an integer (20-100)`;
        },
      },
    },
    price: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        delete ret._id;
      },
    },
  },
);

export const Balloon = model('Balloon', balloonSchema);
