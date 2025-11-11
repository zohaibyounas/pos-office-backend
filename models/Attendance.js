import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    date: {
      type: String, // Format: "YYYY-MM-DD"
      required: true,
    },
    // ✅ Add userId field that generates unique ObjectId for each record
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(), // This makes each record unique
      required: true,
    },
    checkIn: {
      time: {
        type: Date,
        required: true,
      },
      location: String,
      notes: String,
    },
    checkOut: {
      time: Date,
      location: String,
      notes: String,
    },
    totalHours: {
      type: Number, // in hours
      default: 0,
    },
    status: {
      type: String,
      enum: ["present", "absent"], // ✅ Only two statuses now
      default: "absent", // ✅ Default to absent
    },
    overtime: {
      type: Number, // in hours
      default: 0,
    },
  },
  { timestamps: true }
);

// ✅ This will work with the existing userId_1_date_1 index
// because each record has a unique userId
// ✅ Also create our desired email-based index for future use
attendanceSchema.index({ email: 1, date: 1 }, { unique: true });

// Calculate total hours before saving and set status
attendanceSchema.pre("save", function (next) {
  if (this.checkIn && this.checkOut && this.checkOut.time) {
    const diffMs = this.checkOut.time - this.checkIn.time;
    this.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    // ✅ Set status based on total hours - ONLY TWO STATUSES
    if (this.totalHours > 0) {
      this.status = "present"; // ✅ Any hours > 0 = present
    } else {
      this.status = "absent"; // ✅ 0 hours = absent
    }

    // Calculate overtime (assuming 8 hours normal work day)
    if (this.totalHours > 8) {
      this.overtime = parseFloat((this.totalHours - 8).toFixed(2));
    }
  } else {
    // ✅ If only checked in (no check-out), set as present
    if (this.checkIn && this.checkIn.time) {
      this.status = "present"; // ✅ Checked in = present
    } else {
      this.status = "absent"; // ✅ No check-in = absent
    }
  }
  next();
});

export default mongoose.model("Attendance", attendanceSchema);
