import { initializeApp, cert } from "firebase-admin";
import { Config } from "./index.ts";
import logger from "../logger.ts";

let firebaseApp;

// Initialize Firebase Admin SDK if credentials are provided
if (Config.FIREBASE_PROJECT_ID && Config.FIREBASE_CLIENT_EMAIL && Config.FIREBASE_PRIVATE_KEY) {
    try {
        firebaseApp = initializeApp({
            credential: cert({
                projectId: Config.FIREBASE_PROJECT_ID,
                clientEmail: Config.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines (e.g. \n as a string) with literal newlines
                privateKey: Config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            })
        });
        logger.info("Firebase Admin SDK initialized successfully");
    } catch (error) {
        logger.error("Failed to initialize Firebase Admin SDK:", error);
    }
} else {
    logger.warn("Firebase environment variables are incomplete. Firebase Admin SDK is NOT initialized.");
}

export { firebaseApp };
