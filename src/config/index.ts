import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({path:path.join(__dirname,`../../.env.${process.env.NODE_ENV}`)});

const {
    PORT,
    NODE_ENV,
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_DATABASE,
    DB_SYNCHRONIZE,
    DB_LOGGING,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    SMTP_EMAIL,
    SMTP_PASSWORD
} = process.env;

export const Config = {
    PORT: PORT || '5501',
    NODE_ENV: NODE_ENV || 'dev',
    DB_HOST: DB_HOST || 'localhost',
    DB_PORT: DB_PORT || '5432',
    DB_USER: DB_USER || 'postgres',
    DB_PASSWORD: DB_PASSWORD || 'postgres',
    DB_DATABASE: DB_DATABASE || 'auth_service',
    DB_SYNCHRONIZE: DB_SYNCHRONIZE === 'true' || true,
    DB_LOGGING: DB_LOGGING === 'true' || false,
    JWT_SECRET: JWT_SECRET || 'dev-secret-key-1234567890',
    JWT_EXPIRES_IN: JWT_EXPIRES_IN || '1h',
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    SMTP_EMAIL: SMTP_EMAIL || '',
    SMTP_PASSWORD: SMTP_PASSWORD || '',
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_placeholder'
}