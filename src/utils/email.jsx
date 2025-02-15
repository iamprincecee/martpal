import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.REACT_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.REACT_EMAILJS_PUBLIC_KEY;
const EMAILJS_SENDER_EMAIL = process.env.REACT_EMAILJS_SENDER_EMAIL;
const EMAILJS_SUBJECT = process.env.REACT_EMAILJS_SUBJECT || "Message from MartPal";

export const sendEmail = async (recipientEmail, recipientName, message) => {
  // Remove unwanted HTML tags from ReactQuill input
  const plainTextMessage = message
    .replace(/<\/?p>/g, "\n") // Convert paragraphs to new lines
    .replace(/<br\s*\/?>/g, "\n") // Convert line breaks to new lines
    .replace(/<\/?[^>]+(>|$)/g, "") // Remove any remaining HTML tags
    .trim();

  // Replace {{name}} with actual recipient name
  const personalizedMessage = plainTextMessage.replace(/{{name}}/g, recipientName || "Customer");

  const emailParams = {
    to_email: recipientEmail,
    to_name: recipientName || "Customer",
    from_email: EMAILJS_SENDER_EMAIL, // Load from .env
    subject: EMAILJS_SUBJECT, // Load from .env
    message: personalizedMessage,
  };

  try {
    const response = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, emailParams, EMAILJS_PUBLIC_KEY);
    console.log("📨 Email sent successfully:", response);
    return true;
  } catch (error) {
    console.error("❌ Email failed to send:", error);
    alert("Failed to send email. Please check the console for details.");
    return false;
  }
};
