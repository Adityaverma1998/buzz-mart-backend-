import { Router } from "express";
import { AppDataSource } from "../config/data-source.ts";
import { User } from "../entities/User.ts";
import { UserService } from "../services/UserService.ts";
import { UserController } from "../controllers/UserController.ts";

const router = Router();

// Instantiate dependencies and perform manual Dependency Injection (DI)
const userRepository = AppDataSource.getRepository(User);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Wire up routes wrapping handlers in arrow functions to maintain "this" context
router.post("/register", (req, res, next) => userController.register(req, res, next));
router.post("/login", (req, res, next) => userController.login(req, res, next));
router.post("/oauth-login", (req, res, next) => userController.oauthLogin(req, res, next));
router.post("/firebase-login", (req, res, next) => userController.firebaseLogin(req, res, next));

export default router;
