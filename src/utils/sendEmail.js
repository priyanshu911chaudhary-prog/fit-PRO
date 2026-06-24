import Mailgen from 'mailgen';
import nodemailer from 'nodemailer';
import ApiError from './ApiError.js';

const sendEmail=async (options) => {
    const mailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: 'AI Fitness',
            link: "https://ai-fitness.com",
        }
    });

    const emailTextual=mailGenerator.generatePlaintext(options.mailgenContent);
    const emailHtml = mailGenerator.generate(options.mailgenContent);

    const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: process.env.MAILTRAP_PORT,
        auth: {
            user: process.env.MAILTRAP_USER,
            pass: process.env.MAILTRAP_PASS,
        },
    });
    const mail={
        from: `AI Fitness <${process.env.MAILTRAP_USER}>`,
        to: options.email,
        subject: options.subject,
        text: emailTextual,
        html: emailHtml,
    };

    try{
        await transporter.sendMail(mail);
        console.log(`Email sent to ${options.email}`);
    }catch(error){
        throw new ApiError(500, "Failed to send email");
    }
}

const emailVerificationTemplate = (username, verificationLink) => {
    return {
        body: {
            name: username,
            intro: "Welcome to AI Fitness! We're excited to have you on board.",
            action: {
                instructions: "To get started, please verify your email address by clicking the button below:",
                button: {
                    text: "Verify Your Email Address",
                    link: verificationLink,
                    color: "#22BC66" // Optional: Customize the button color
                }
            },
            outro: "Need help or have questions? Just reply to this email and our team will get back to you as soon as possible."
        }
    };
};

const passwordResetTemplate = (username, resetLink) => {
    return {
        body: {
            name: username,
            intro: "You have requested to reset your password for your AI Fitness account.",
            action: {
                instructions: "To reset your password, please click the button below:",
                button: {
                    text: "Reset Your Password",
                    link: resetLink,
                    color: "#FF4136" // Optional: Customize the button color    
                }
            },
            outro: "If you did not request a password reset, please ignore this email or contact support if you have questions."
        }
    };
};

export { emailVerificationTemplate, passwordResetTemplate, sendEmail };