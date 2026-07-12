import type { Repository } from "typeorm";
import { User } from "../entities/User.ts";
import { UserDevice } from "../entities/UserDevice.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Config } from "../config/index.ts";
import createHttpError from "http-errors";
import type { RegisterInput, LoginInput, OAuthLoginInput, FirebaseLoginInput } from "../validators/authValidator.ts";
import { getAuth } from "firebase-admin/auth";
import type { EmailService } from "./EmailService.ts";

export class UserService {
    private userRepository: Repository<User>;
    private deviceRepository: Repository<UserDevice>;
    private emailService: EmailService;

    constructor(userRepository: Repository<User>, deviceRepository: Repository<UserDevice>, emailService: EmailService) {
        this.userRepository = userRepository;
        this.deviceRepository = deviceRepository;
        this.emailService = emailService;
    }

    async register(input: RegisterInput): Promise<User> {
        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
            where: { email: input.email }
        });

        if (existingUser) {
            throw new createHttpError.BadRequest("Email is already registered");
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(input.password, 12);

        // Create new user entity instance
        const user = new User();
        user.firstName = input.firstName;
        user.lastName = input.lastName;
        user.email = input.email;
        user.password = hashedPassword;
        if (input.phone !== undefined) {
            user.phone = input.phone;
        }
        user.provider = "local";
        user.role = input.role || "customer";

        const savedUser = await this.userRepository.save(user);
        await this.saveDeviceToken(savedUser, input.fcmToken);

        // Send welcome email (fire-and-forget, don't block registration)
        this.emailService.sendWelcomeEmail(savedUser.email, savedUser.firstName);

        return savedUser;
    }

    async login(input: LoginInput): Promise<{ user: User; token: string }> {
        // Find user by email
        const user = await this.userRepository.findOne({
            where: { email: input.email }
        });

        if (!user) {
            throw new createHttpError.Unauthorized("Invalid email or password");
        }

        // OAuth accounts registered without a password cannot log in locally
        if (!user.password) {
            throw new createHttpError.Unauthorized("This account is configured for social login. Please sign in using your OAuth provider.");
        }
        // Verify password
        const isPasswordCorrect = await bcrypt.compare(input.password, user.password);
        if (!isPasswordCorrect) {
            throw new createHttpError.Unauthorized("Invalid email or password");
        }

        // Generate JWT token
        const token = this.generateToken(user);

        await this.saveDeviceToken(user, input.fcmToken);

        return { user, token };
    }

    async oauthLogin(input: OAuthLoginInput): Promise<{ user: User; token: string }> {
        let user = await this.userRepository.findOne({
            where: { email: input.email }
        });

        if (user) {
            // If the user exists but didn't have OAuth details configured, update them
            if (user.provider === "local" || !user.providerUserId) {
                user.provider = input.provider;
                user.providerUserId = input.providerUserId;
                user = await this.userRepository.save(user);
            } else if (user.provider !== input.provider) {
                throw new createHttpError.Conflict(`Email is already associated with a different login provider: ${user.provider}`);
            }
        } else {
            // Register a new user for this OAuth provider
            user = new User();
            user.firstName = input.firstName;
            user.lastName = input.lastName;
            user.email = input.email;
            user.provider = input.provider;
            user.providerUserId = input.providerUserId;
            user.role = "customer"; // Default role for social register

            user = await this.userRepository.save(user);
        }

        const token = this.generateToken(user);

        await this.saveDeviceToken(user, input.fcmToken);

        return { user, token };
    }

    async firebaseLogin(input: FirebaseLoginInput): Promise<{ user: User; token: string }> {
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(input.idToken);
        } catch (error) {
            throw new createHttpError.Unauthorized("Invalid or expired Firebase token");
        }

        const { uid, email, name, firebase } = decodedToken;
        const provider = firebase?.sign_in_provider || "google.com";

        if (!email) {
            throw new createHttpError.BadRequest("Email not provided by authentication provider");
        }

        let user = await this.userRepository.findOne({
            where: { email }
        });

        let firstName = "Social";
        let lastName = "User";
        if (name) {
            const parts = name.trim().split(/\s+/);
            if (parts.length > 0) {
                firstName = parts[0] || "Social";
                if (parts.length > 1) {
                    lastName = parts.slice(1).join(" ") || "User";
                }
            }
        }

        if (user) {
            if (user.provider === "local" || !user.providerUserId) {
                user.provider = provider;
                user.providerUserId = uid;
                user = await this.userRepository.save(user);
            } else if (user.providerUserId !== uid) {
                throw new createHttpError.Conflict("Email is already associated with another OAuth account.");
            }
        } else {
            user = new User();
            user.firstName = firstName;
            user.lastName = lastName;
            user.email = email;
            user.provider = provider;
            user.providerUserId = uid;
            user.role = "customer";

            user = await this.userRepository.save(user);
        }

        const token = this.generateToken(user);

        await this.saveDeviceToken(user, input.fcmToken);

        return { user, token };
    }

    private async saveDeviceToken(user: User, fcmToken?: string): Promise<void> {
        if (!fcmToken) return;

        const existingDevice = await this.deviceRepository.findOne({
            where: { fcmToken },
            relations: { user: true }
        });

        if (existingDevice) {
            if (existingDevice.user.id !== user.id) {
                existingDevice.user = user;
                await this.deviceRepository.save(existingDevice);
            }
        } else {
            const device = new UserDevice();
            device.fcmToken = fcmToken;
            device.user = user;
            await this.deviceRepository.save(device);
        }
    }

    private generateToken(user: User): string {
        return jwt.sign(
            {
                sub: user.id,
                role: user.role,
                email: user.email
            },
            Config.JWT_SECRET,
            {
                expiresIn: Config.JWT_EXPIRES_IN as any
            }
        );
    }
}
