import { z } from "zod";

export const meterRecordSchema = z.object({
  date: z.string().min(1, "Date is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountName: z.string().min(1, "Account name is required"),
  address: z.string().min(1, "Address is required"),
  meterNumber: z.string().min(1, "Meter number is required"),
  meterReader: z.string().min(1, "Meter reader is required"),
  remarks: z.string().min(1, "Remarks is required"),
  contactNumber: z.string().optional().default(""),
  landmark: z.string().optional().default(""),
  dateReceived: z.string().optional().default(""),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
