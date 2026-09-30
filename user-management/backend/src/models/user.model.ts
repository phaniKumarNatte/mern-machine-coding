import { Schema, model, type HydratedDocument } from 'mongoose';
import type { IUser } from '../types/user.types';
import { AGE_MAX, AGE_MIN, EMAIL_REGEX, NAME_MAX_LENGTH } from '../utils/validation';

/**
 * The Mongoose schema is the last line of defence for data integrity.
 * Request validation (utils/validation.ts) gives friendly errors to API clients;
 * the schema guarantees bad data can't reach MongoDB even if some other code
 * path (a script, a future endpoint) forgets to validate.
 */
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: NAME_MAX_LENGTH,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      // `unique` creates a unique INDEX in MongoDB. It is not a validator:
      // violations surface as a MongoServerError with code 11000.
      unique: true,
      match: [EMAIL_REGEX, 'Email must be a valid email address'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: AGE_MIN,
      max: AGE_MAX,
      validate: { validator: Number.isInteger, message: 'Age must be a whole number' },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: { versionKey: false }, // hide Mongoose's internal `__v` field from API responses
  },
);

export type UserDocument = HydratedDocument<IUser>;

export const User = model<IUser>('User', userSchema);
