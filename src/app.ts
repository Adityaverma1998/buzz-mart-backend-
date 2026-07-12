import express from 'express';
import logger from './logger.ts';
import type { Request, Response, NextFunction } from 'express';
import "reflect-metadata";
import authRouter from "./routes/authRouter.ts";
import productRouter from "./routes/productRouter.ts";
import categoryRouter from "./routes/categoryRouter.ts";
import brandRouter from "./routes/brandRouter.ts";
import { ZodError } from "zod";
import type { ZodIssue } from "zod";

const app = express();

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }
    next();
});

app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

app.get('/', (req, res) => {
    res.send("Hello World maza a gya h !");
});

// Mount routers
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/brands", brandRouter);

import cartRouter from "./routes/cartRouter.ts";
import addressRouter from "./routes/addressRouter.ts";
import checkoutRouter from "./routes/checkoutRouter.ts";
import orderRouter from "./routes/orderRouter.ts";
import adminOrderRouter from "./routes/adminOrderRouter.ts";
import adminReportRouter from "./routes/adminReportRouter.ts";
import userEventLogRouter from "./routes/userEventLogRouter.ts";

app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/addresses", addressRouter);
app.use("/api/v1/checkout", checkoutRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/admin/orders", adminOrderRouter);
app.use("/api/v1/admin/reports", adminReportRouter);
app.use("/api/v1/event-logs", userEventLogRouter);

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
        logger.warn('Validation Error', { errors: err.issues });
        res.status(400).json({
            errors: err.issues.map((issue: ZodIssue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }))
        });
        return;
    }

    logger.error('Error occurred', err);

    const statusCode = err.statusCode || err.status || 500;
    const response: { message: string; stack?: string } = {
        message: err.message || 'Internal Server Error'
    };

    if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json({
        errors: [
            {
                type: err.name || 'InternalServerError',
                ...response
            }
        ]
    });
});

export default app;
