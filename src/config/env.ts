import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  WHATSAPP_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  VERIFY_TOKEN: z.string().min(1),
  ADMIN_PHONE: z.string().min(1),
  DEEPSEEK_API_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
});

export const env = envSchema.parse(process.env);
