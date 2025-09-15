
import * as z from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, {
    message: "יש להזין שם מלא"
  }),
  profession: z.string().min(2, {
    message: "יש להזין מקצוע"
  }),
  phone: z.string().min(10, {
    message: "יש להזין מספר טלפון תקין"
  }),
  email: z.string().email({
    message: "יש להזין כתובת אימייל תקינה"
  }),
  password: z.string().min(6, {
    message: "סיסמה חייבת להכיל לפחות 6 תווים"
  }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"]
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
