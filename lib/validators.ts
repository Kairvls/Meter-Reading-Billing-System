import { z } from "zod";
import { ACCOUNT_NUMBER_PATTERN } from "@/lib/account-number";

export const meterRecordSchema = z.object({
  date: z.string().min(1, "Date is required"),
  accountNumber: z
    .string()
    .min(1, "Account number is required")
    .regex(ACCOUNT_NUMBER_PATTERN, "Account number must be 00-0000-0000"),
  accountName: z.string().min(1, "Account name is required"),
  address: z.string().min(1, "Municipality / City is required"),
  homeAddress: z.string().optional().default(""),
  barangay: z.string().optional().default(""),
  streetBlock: z.string().optional().default(""),
  meterNumber: z.string().min(1, "Meter number is required"),
  meterReader: z.string().min(1, "Meter reader is required"),
  sepMeterReader: z.string().optional().default(""),
  remarks: z.string().min(1, "Remarks is required"),
  contactNumber: z.string().optional().default(""),
  landmark: z.string().optional().default(""),
  latitude: z.string().optional().default(""),
  longitude: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  dateReceived: z.string().optional().default(""),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
