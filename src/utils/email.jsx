import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE_ID = "service_ilzhaeq";  
const EMAILJS_TEMPLATE_ID = "template_szxkj6d";  
const EMAILJS_PUBLIC_KEY = "dwbAAVnMs5bbgO4nq";  

export const sendEmail = async (recipientEmail, recipientName, message) => {
  // Remove unwanted HTML tags from ReactQuill input
  const plainTextMessage = message
    .replace(/<\/?p>/g, "\n") // Convert paragraphs to new lines
    .replace(/<br>/g, "\n")   // Convert line breaks to new lines
    .replace(/<\/?[^>]+(>|$)/g, "") // Remove any other remaining HTML tags
    .trim();

  // Replace {{name}} with actual recipient name
  const personalizedMessage = plainTextMessage.replace(/{{name}}/g, recipientName || "Customer");

  const emailParams = {
    to_email: recipientEmail,
    to_name: recipientName || "Customer",
    from_email: "ashervan97@gmail.com",  // Replace with your verified EmailJS sender email
    subject: "Important Message from MartPal",
    message: personalizedMessage, // Send plain text message
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
