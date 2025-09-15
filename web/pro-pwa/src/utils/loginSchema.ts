
import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email({
    message: "יש להזין כתובת אימייל תקינה"
  }),
  password: z.string().min(6, {
    message: "סיסמה חייבת להכיל לפחות 6 תווים"
  }),
  rememberMe: z.boolean().optional()
});

export type LoginFormValues = z.infer<typeof loginSchema>;
