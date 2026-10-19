import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose, { Document, Model, Schema } from "mongoose";
import { signAccessToken, signRefreshToken } from "../lib/auth/jwt";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  authProvider: "local" | "google" | "microsoft";
  providerId?: string | null;
  password?: string;
  isVerified: boolean;
  googleId?: string | null;
  microsoftId?: string | null;
  refreshToken?: string;
  previousRefreshToken?: string;
  previousRefreshTokenExpiry?: Date;
  forgotPasswordToken?: string;
  forgotPasswordTokenExpiry?: Date;
  emailVerificationToken?: string;
  emailVerificationTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  generateAccessToken(hasProfile?: boolean): Promise<string>;
  generateRefreshToken(): Promise<string>;
  generateTemporaryToken(durationMs?: number): {
    unhasedToken: string;
    hashedToken: string;
    tokenExpiry: Date;
  };
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "microsoft"],
      default: "local",
    },
    providerId: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        if (!this.isNew && !this.isSelected("password")) return false;
        return this.authProvider === "local";
      },
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: function (this: IUser) {
        return this.authProvider !== "local";
      },
    },
    googleId: {
      type: String,
      default: null,
    },
    microsoftId: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    previousRefreshToken: {
      type: String,
      select: false,
    },
    previousRefreshTokenExpiry: {
      type: Date,
      select: false,
    },
    forgotPasswordToken: {
      type: String,
      select: false,
    },
    forgotPasswordTokenExpiry: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationTokenExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function (hasProfile?: boolean): Promise<string> {
  let isProfileComplete = hasProfile;
  if (isProfileComplete === undefined) {
    try {
      const { Profile } = await import("./profile");
      const profile = await Profile.findOne({ user: this._id });
      isProfileComplete = !!profile?.isProfileComplete;
    } catch {
      isProfileComplete = false;
    }
  }
  return await signAccessToken({
    userId: this._id.toString(),
    email: this.email,
    hasProfile: isProfileComplete,
  });
};

userSchema.methods.generateRefreshToken = async function (): Promise<string> {
  return await signRefreshToken({
    userId: this._id.toString(),
    email: this.email,
  });
};

userSchema.methods.generateTemporaryToken = function (durationMs = 15 * 60 * 1000) {
  const unhasedToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(unhasedToken).digest("hex");
  const tokenExpiry = new Date(Date.now() + durationMs);

  return {
    unhasedToken,
    unhashedToken: unhasedToken,
    hashedToken,
    tokenExpiry,
  };
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
