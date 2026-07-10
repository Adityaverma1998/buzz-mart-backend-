import { z } from "zod";

export const registerSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    phone: z.string().optional(),
    role: z.enum(["admin", "customer"]).optional()
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required")
});

export const oauthLoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    provider: z.enum(["google", "github", "facebook"]),
    providerUserId: z.string().min(1, "Provider user ID is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required")
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OAuthLoginInput = z.infer<typeof oauthLoginSchema>;

export const firebaseLoginSchema = z.object({
    idToken: z.string().min(1, "Firebase ID Token is required")
});

export type FirebaseLoginInput = z.infer<typeof firebaseLoginSchema>;

