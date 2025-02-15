import axios from "axios";

const ULTRAMSG_INSTANCE_ID = import.meta.env.VITE_ULTRAMSG_INSTANCE_ID;
const ULTRAMSG_TOKEN = import.meta.env.VITE_ULTRAMSG_TOKEN;
const ULTRAMSG_API_URL = `${import.meta.env.VITE_ULTRAMSG_API_URL}/${ULTRAMSG_INSTANCE_ID}/messages/chat`;

export const sendWhatsAppMessage = async (phoneNumber, recipientName = "Customer", message) => {
  if (!phoneNumber || !message) {
    console.error("❌ Missing phone number or message. Cannot send WhatsApp message.");
    return false;
  }

  // Convert message from HTML to plain text
  const plainTextMessage = message
    .replace(/<\/?p>/g, "\n") // Convert paragraphs to new lines
    .replace(/<br\s*\/?>/g, "\n") // Convert line breaks to new lines
    .replace(/<\/?[^>]+(>|$)/g, "") // Remove any other remaining HTML tags
    .trim();

  // Replace {{name}} with actual recipient name
  const personalizedMessage = plainTextMessage.replace(/{{name}}/g, recipientName);

  try {
    const response = await axios.post(ULTRAMSG_API_URL, {
      token: ULTRAMSG_TOKEN,
      to: phoneNumber,
      body: personalizedMessage, // Send the cleaned message
      priority: 10,
    });

    console.log("📨 WhatsApp Message Sent:", response.data);
    return true;
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error.response?.data || error.message);
    return false;
  }
};
