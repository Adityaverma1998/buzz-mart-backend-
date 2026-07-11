import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Config } from "../config/index.ts";

export class EmailService {
    private transporter: Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: Config.SMTP_EMAIL,
                pass: Config.SMTP_PASSWORD,
            },
        });
    }

    async sendWelcomeEmail(toEmail: string, firstName: string): Promise<void> {
        const mailOptions = {
            from: `"BuzzMart" <${Config.SMTP_EMAIL}>`,
            to: toEmail,
            subject: "Welcome to BuzzMart! 🎉",
            html: this.getWelcomeTemplate(firstName),
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Welcome email sent to ${toEmail}`);
        } catch (error) {
            // Log the error but don't block registration
            console.error(`Failed to send welcome email to ${toEmail}:`, error);
        }
    }

    private getWelcomeTemplate(firstName: string): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                        🛒 BuzzMart
                                    </h1>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="color: #333333; margin: 0 0 16px 0; font-size: 22px;">
                                        Welcome, ${firstName}! 🎉
                                    </h2>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        Thank you for joining <strong>BuzzMart</strong>! We're excited to have you on board.
                                    </p>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        Your account has been created successfully. You can now explore our wide range of products, track your orders, and enjoy a seamless shopping experience.
                                    </p>

                                    <!-- CTA Button -->
                                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 14px 32px;">
                                                <a href="#" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                                    Start Shopping →
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 0;">
                                        If you have any questions, feel free to reach out to our support team.
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f8f9fa; padding: 24px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                                    <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
                                        © ${new Date().getFullYear()} BuzzMart. All rights reserved.
                                    </p>
                                    <p style="color: #aaaaaa; font-size: 12px; margin: 8px 0 0 0;">
                                        You received this email because you signed up for a BuzzMart account.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;
    }
}
