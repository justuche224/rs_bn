import nodemailer from "nodemailer";
import type { MailOptions } from "../types/mail.types.js";

/**
 * Mail service for sending emails
 */
class MailService {
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize the nodemailer transporter
   */
  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: "ecohavest.org",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAILER_EMAIL,
        pass: process.env.MAILER_PASSWORD,
      },
      logger: process.env.NODE_ENV !== "production",
      debug: process.env.NODE_ENV !== "production",
    });
  }

  /**
   * Send an email
   */
  async sendMail({ to, subject, text, html }: MailOptions): Promise<void> {
    const mailOptions = {
      from: process.env.MAILER_EMAIL,
      to,
      subject,
      text,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send email: ${error.message}`);
      }
      throw new Error("Failed to send email");
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const subject = "Reset your password";
    const { text, html } = this.getPasswordResetTemplate(resetUrl);

    await this.sendMail({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(
    email: string,
    verificationUrl: string
  ): Promise<void> {
    const subject = "Verify your email address";
    const { text, html } = this.getVerificationEmailTemplate(verificationUrl);

    await this.sendMail({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Get password reset email template
   */
  private getPasswordResetTemplate(resetUrl: string): {
    text: string;
    html: string;
  } {
    const text = `Reset your password for EcoHarvest. Click the link to reset your password: ${resetUrl}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #eaeaea;
          border-radius: 5px;
        }
        .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 1px solid #eaeaea;
        }
        .content {
          padding: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>You've requested to reset your password for your EcoHarvest account.</p>
          <p>Click the button below to reset your password. This link will expire in 30 minutes.</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EcoHarvest. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return { text, html };
  }

  /**
   * Get verification email template
   */
  private getVerificationEmailTemplate(verificationUrl: string): {
    text: string;
    html: string;
  } {
    const text = `Welcome to EcoHarvest! Please verify your email address by clicking the following link: ${verificationUrl}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #eaeaea;
          border-radius: 5px;
        }
        .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 1px solid #eaeaea;
        }
        .content {
          padding: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to EcoHarvest!</h1>
        </div>
        <div class="content">
          <p>Thank you for signing up with EcoHarvest. To get started, please verify your email address.</p>
          <p>Click the button below to verify your email address:</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </p>
          <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EcoHarvest. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return { text, html };
  }

  /**
   * Send deposit notification email
   */
  async sendDepositNotification(
    email: string,
    amount: string,
    currency: string,
    status: string
  ): Promise<void> {
    let subject = "";
    if (status === "PENDING") {
      subject = `Your ${currency} deposit has been received`;
    } else {
      subject = `Your ${currency} deposit is now ${status.toLowerCase()}`;
    }

    const { text, html } = this.getDepositTemplate(amount, currency, status);

    await this.sendMail({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Send withdrawal notification email
   */
  async sendWithdrawalNotification(
    email: string,
    amount: string,
    currency: string,
    status: string,
    rejectionReason?: string
  ): Promise<void> {
    let subject = "";
    if (status === "PENDING") {
      subject = `Your ${currency} withdrawal request has been received`;
    } else {
      subject = `Your ${currency} withdrawal is now ${status.toLowerCase()}`;
    }

    const { text, html } = this.getWithdrawalTemplate(
      amount,
      currency,
      status,
      rejectionReason
    );

    await this.sendMail({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Send investment notification email
   */
  async sendInvestmentNotification(
    email: string,
    amount: string,
    planType: string,
    currency: string,
    status: string
  ): Promise<void> {
    let subject = "";
    if (status === "ACTIVE") {
      subject = `Your ${planType} investment has been activated`;
    } else if (status === "COMPLETED") {
      subject = `Your ${planType} investment is now complete`;
    } else {
      subject = `Your ${planType} investment status is now ${status.toLowerCase()}`;
    }

    const { text, html } = this.getInvestmentTemplate(
      amount,
      planType,
      currency,
      status
    );

    await this.sendMail({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Get deposit email template
   */
  private getDepositTemplate(
    amount: string,
    currency: string,
    status: string
  ): { text: string; html: string } {
    let statusMessage = "";
    let buttonText = "";
    let buttonUrl = process.env.FRONTEND_URL || "https://ecohavest.org";

    if (status === "PENDING") {
      statusMessage =
        "Your deposit is being processed and will be credited to your account soon.";
      buttonText = "View Deposit Status";
    } else if (status === "APPROVED") {
      statusMessage =
        "Your deposit has been approved and credited to your account.";
      buttonText = "View Dashboard";
    } else if (status === "REJECTED") {
      statusMessage =
        "Your deposit has been rejected. Please contact support for more information.";
      buttonText = "Contact Support";
    } else if (status === "FAILED") {
      statusMessage =
        "Your deposit has failed. Please try again or contact support for assistance.";
      buttonText = "Try Again";
    }

    const text = `
    Deposit Notification
    
    Amount: ${amount} ${currency}
    Status: ${status}
    
    ${statusMessage}
    
    Visit our website to view your deposit details: ${buttonUrl}
    `;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Deposit Notification</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #eaeaea;
          border-radius: 5px;
        }
        .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 1px solid #eaeaea;
        }
        .content {
          padding: 20px 0;
        }
        .amount {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
        }
        .status {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: bold;
          color: white;
          background-color: ${
            status === "APPROVED"
              ? "#4CAF50"
              : status === "PENDING"
              ? "#FF9800"
              : status === "REJECTED" || status === "FAILED"
              ? "#F44336"
              : "#2196F3"
          };
        }
        .message {
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Deposit Notification</h1>
        </div>
        <div class="content">
          <div class="amount">${amount} ${currency}</div>
          <p>Status: <span class="status">${status}</span></p>
          <div class="message">
            <p>${statusMessage}</p>
          </div>
          <p style="text-align: center;">
            <a href="${buttonUrl}" class="button">${buttonText}</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EcoHarvest. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return { text, html };
  }

  /**
   * Get withdrawal email template
   */
  private getWithdrawalTemplate(
    amount: string,
    currency: string,
    status: string,
    rejectionReason?: string
  ): { text: string; html: string } {
    let statusMessage = "";
    let buttonText = "";
    let buttonUrl = process.env.FRONTEND_URL || "https://ecohavest.org";

    if (status === "PENDING") {
      statusMessage = "Your withdrawal request is being processed.";
      buttonText = "View Withdrawal Status";
    } else if (status === "APPROVED") {
      statusMessage =
        "Your withdrawal has been approved and funds are being sent to your wallet.";
      buttonText = "View Dashboard";
    } else if (status === "REJECTED") {
      statusMessage = `Your withdrawal has been rejected. ${
        rejectionReason
          ? `Reason: ${rejectionReason}`
          : "Please contact support for more information."
      }`;
      buttonText = "Contact Support";
    }

    const text = `
    Withdrawal Notification
    
    Amount: ${amount} ${currency}
    Status: ${status}
    ${rejectionReason ? `Rejection Reason: ${rejectionReason}` : ""}
    
    ${statusMessage}
    
    Visit our website to view your withdrawal details: ${buttonUrl}
    `;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Withdrawal Notification</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #eaeaea;
          border-radius: 5px;
        }
        .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 1px solid #eaeaea;
        }
        .content {
          padding: 20px 0;
        }
        .amount {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
        }
        .status {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: bold;
          color: white;
          background-color: ${
            status === "APPROVED"
              ? "#4CAF50"
              : status === "PENDING"
              ? "#FF9800"
              : status === "REJECTED"
              ? "#F44336"
              : "#2196F3"
          };
        }
        .message {
          margin: 20px 0;
        }
        .reason {
          margin: 15px 0;
          padding: 10px;
          background-color: #f8f8f8;
          border-left: 4px solid #F44336;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Withdrawal Notification</h1>
        </div>
        <div class="content">
          <div class="amount">${amount} ${currency}</div>
          <p>Status: <span class="status">${status}</span></p>
          ${
            rejectionReason
              ? `<div class="reason"><strong>Reason:</strong> ${rejectionReason}</div>`
              : ""
          }
          <div class="message">
            <p>${statusMessage}</p>
          </div>
          <p style="text-align: center;">
            <a href="${buttonUrl}" class="button">${buttonText}</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EcoHarvest. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return { text, html };
  }

  /**
   * Get investment email template
   */
  private getInvestmentTemplate(
    amount: string,
    planType: string,
    currency: string,
    status: string
  ): { text: string; html: string } {
    let statusMessage = "";
    let buttonText = "";
    let buttonUrl = process.env.FRONTEND_URL || "https://ecohavest.org";

    if (status === "ACTIVE") {
      statusMessage = `Your ${planType} investment of ${amount} ${currency} has been activated and is generating returns.`;
      buttonText = "View Investment";
    } else if (status === "COMPLETED") {
      statusMessage = `Your ${planType} investment has completed its term. Check your balance for the returns.`;
      buttonText = "View Dashboard";
    } else if (status === "CANCELLED") {
      statusMessage = `Your ${planType} investment has been cancelled.`;
      buttonText = "Contact Support";
    } else {
      statusMessage = `Your ${planType} investment status has been updated to ${status}.`;
      buttonText = "View Investment";
    }

    const text = `
    Investment Notification
    
    Plan: ${planType}
    Amount: ${amount} ${currency}
    Status: ${status}
    
    ${statusMessage}
    
    Visit our website to view your investment details: ${buttonUrl}
    `;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Investment Notification</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #eaeaea;
          border-radius: 5px;
        }
        .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 1px solid #eaeaea;
        }
        .content {
          padding: 20px 0;
        }
        .plan {
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          margin: 10px 0;
        }
        .amount {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
        }
        .status {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: bold;
          color: white;
          background-color: ${
            status === "ACTIVE"
              ? "#4CAF50"
              : status === "PENDING"
              ? "#FF9800"
              : status === "COMPLETED"
              ? "#2196F3"
              : status === "CANCELLED"
              ? "#F44336"
              : "#757575"
          };
        }
        .message {
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Investment Notification</h1>
        </div>
        <div class="content">
          <div class="plan">${planType}</div>
          <div class="amount">${amount} ${currency}</div>
          <p>Status: <span class="status">${status}</span></p>
          <div class="message">
            <p>${statusMessage}</p>
          </div>
          <p style="text-align: center;">
            <a href="${buttonUrl}" class="button">${buttonText}</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EcoHarvest. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return { text, html };
  }
}

// Export a singleton instance
export const mailService = new MailService();
