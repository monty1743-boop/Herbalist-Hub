import { Resend } from "resend"
import { env } from "@/lib/env"

// Initialize Resend client
const resend = new Resend(env.RESEND_API_KEY)

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    if (!env.RESEND_API_KEY) {
      console.warn("Email service not configured. Skipping email send.")
      return false
    }

    const result = await resend.emails.send({
      from: env.SMTP_FROM || "HerbalistHub <noreply@herbalisthub.com>",
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (result.error) {
      console.error("Email send error:", result.error)
      return false
    }

    console.log("Email sent successfully:", result.data?.id)
    return true
  } catch (error) {
    console.error("Email service error:", error)
    return false
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${env.NEXTAUTH_URL}/auth/verify-email?token=${token}`
  
  const template: EmailTemplate = {
    to: email,
    subject: "Verify your HerbalistHub account",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify your HerbalistHub account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #22c55e; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background-color: #22c55e; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { 
              background-color: #f8f9fa; 
              padding: 20px; 
              text-align: center; 
              font-size: 14px; 
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to HerbalistHub</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thank you for signing up for HerbalistHub! To complete your registration, please verify your email address by clicking the button below:</p>
              
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              
              <p>This verification link will expire in 24 hours.</p>
              
              <p>If you didn't create an account with HerbalistHub, you can safely ignore this email.</p>
              
              <p>Best regards,<br>The HerbalistHub Team</p>
            </div>
            <div class="footer">
              <p>This email was sent from a secure, HIPAA-compliant system.</p>
              <p>&copy; 2025 HerbalistHub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to HerbalistHub!
      
      Hi ${name},
      
      Thank you for signing up for HerbalistHub! To complete your registration, please verify your email address by visiting this link:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with HerbalistHub, you can safely ignore this email.
      
      Best regards,
      The HerbalistHub Team
    `,
  }
  
  return sendEmail(template)
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const resetUrl = `${env.NEXTAUTH_URL}/auth/reset-password?token=${token}`
  
  const template: EmailTemplate = {
    to: email,
    subject: "Reset your HerbalistHub password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset your HerbalistHub password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #22c55e; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background-color: #22c55e; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { 
              background-color: #f8f9fa; 
              padding: 20px; 
              text-align: center; 
              font-size: 14px; 
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>You requested to reset your password for your HerbalistHub account. Click the button below to create a new password:</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              
              <p>This password reset link will expire in 1 hour.</p>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              
              <p>Best regards,<br>The HerbalistHub Team</p>
            </div>
            <div class="footer">
              <p>This email was sent from a secure, HIPAA-compliant system.</p>
              <p>&copy; 2025 HerbalistHub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hi ${name},
      
      You requested to reset your password for your HerbalistHub account. Visit this link to create a new password:
      
      ${resetUrl}
      
      This password reset link will expire in 1 hour.
      
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      
      Best regards,
      The HerbalistHub Team
    `,
  }
  
  return sendEmail(template)
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: string
): Promise<boolean> {
  const template: EmailTemplate = {
    to: email,
    subject: "Welcome to HerbalistHub!",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to HerbalistHub!</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #22c55e; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background-color: #22c55e; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { 
              background-color: #f8f9fa; 
              padding: 20px; 
              text-align: center; 
              font-size: 14px; 
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to HerbalistHub!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Your email has been successfully verified and your HerbalistHub account is now active!</p>
              
              <p>As a ${role.toLowerCase()}, you now have access to our comprehensive herbalist practice management platform.</p>
              
              <p style="text-align: center;">
                <a href="${env.NEXTAUTH_URL}/dashboard" class="button">Get Started</a>
              </p>
              
              <p>If you have any questions or need help getting started, please don't hesitate to reach out to our support team.</p>
              
              <p>Best regards,<br>The HerbalistHub Team</p>
            </div>
            <div class="footer">
              <p>This email was sent from a secure, HIPAA-compliant system.</p>
              <p>&copy; 2025 HerbalistHub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to HerbalistHub!
      
      Hi ${name},
      
      Your email has been successfully verified and your HerbalistHub account is now active!
      
      As a ${role.toLowerCase()}, you now have access to our comprehensive herbalist practice management platform.
      
      Visit ${env.NEXTAUTH_URL}/dashboard to get started.
      
      If you have any questions or need help getting started, please don't hesitate to reach out to our support team.
      
      Best regards,
      The HerbalistHub Team
    `,
  }
  
  return sendEmail(template)
}