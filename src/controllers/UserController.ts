import type { Request, Response, NextFunction } from "express";
import { UserService } from "../services/UserService.ts";
import { registerSchema, loginSchema, oauthLoginSchema, firebaseLoginSchema } from "../validators/authValidator.ts";

export class UserController {
    private userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService;
    }

    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate request body
            const validatedData = registerSchema.parse(req.body);

            // Register the user
            const user = await this.userService.register(validatedData);

            // Sanitize output (remove password hash)
            const { password, ...sanitizedUser } = user;

            res.status(201).json({
                message: "User registered successfully",
                data: sanitizedUser
            });
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate request body
            const validatedData = loginSchema.parse(req.body);

            // Log the user in
            const { user, token } = await this.userService.login(validatedData);

            // Sanitize output (remove password hash)
            const { password, ...sanitizedUser } = user;

            res.status(200).json({
                message: "Login successful",
                data: {
                    user: sanitizedUser,
                    token
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async oauthLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate request body
            const validatedData = oauthLoginSchema.parse(req.body);

            // Log in via OAuth
            const { user, token } = await this.userService.oauthLogin(validatedData);

            // Sanitize output (remove password hash)
            const { password, ...sanitizedUser } = user;

            res.status(200).json({
                message: "OAuth login successful",
                data: {
                    user: sanitizedUser,
                    token
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async firebaseLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validatedData = firebaseLoginSchema.parse(req.body);
            const { user, token } = await this.userService.firebaseLogin(validatedData);
            const { password, ...sanitizedUser } = user;

            res.status(200).json({
                message: "Firebase login successful",
                data: {
                    user: sanitizedUser,
                    token
                }
            });
        } catch (error) {
            next(error);
        }
    }
}
