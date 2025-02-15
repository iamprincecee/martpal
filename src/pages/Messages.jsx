import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db as martpalDb } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { sendWhatsAppMessage } from "../utils/whatsapp";
import { sendEmail } from "../utils/email";

const Messages = () => {
  const { user } = useAuth();
  const [activeSegment, setActiveSegment] = useState("cold");
  const [platformFilter, setPlatformFilter] = useState("");
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [message, setMessage] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [templates, setTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (!user) return;

    const leadsQuery = collection(martpalDb, "leads", user.uid, activeSegment);
    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const fetchedLeads = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeads(fetchedLeads);
    });

    const templatesRef = collection(martpalDb, "templates", user.uid, "messages");
    const unsubscribeTemplates = onSnapshot(templatesRef, (snapshot) => {
      const fetchedTemplates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTemplates(fetchedTemplates);
    });

    return () => {
      unsubscribe();
      unsubscribeTemplates();
    };
  }, [user, activeSegment]);

  useEffect(() => {
    if (platformFilter) {
      setFilteredLeads(leads.filter((lead) => lead.platform === platformFilter.toLowerCase()));
    } else {
      setFilteredLeads(leads);
    }
  }, [platformFilter, leads]);

  const handleSegmentChange = (e) => {
    setActiveSegment(e.target.value);
    setSelectedLeads([]);
    setSelectAll(false);
  };

  const handlePlatformChange = (e) => {
    setPlatformFilter(e.target.value);
    setSelectedLeads([]);
    setSelectAll(false);
  };

  const handleLeadSelection = (leadId) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAll = (e) => {
    setSelectAll(e.target.checked);
    setSelectedLeads(e.target.checked ? filteredLeads.map((lead) => lead.id) : []);
  };


  const scheduleMessage = async () => {
    if (!selectedLeads.length || !message || !scheduledTime) {
      alert("Please select leads, write a message, and pick a time before scheduling.");
      return;
    }

    try {
      await Promise.all(
        selectedLeads.map(async (leadId) => {
          const lead = filteredLeads.find((l) => l.id === leadId);
          if (!lead) return;

          const leadRef = doc(collection(martpalDb, "scheduledMessages", user.uid, "messages"), leadId);
          await setDoc(leadRef, {
            message,
            scheduledTime,
            status: "scheduled",
            leadId,
            platform: lead.platform,
            contact: lead.contact,
          });
        })
      );

      alert("Messages scheduled successfully!");
      setScheduledTime("");
      setSelectedLeads([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Error scheduling messages:", error);
    }
  };

  const sendMessageNow = async () => {
    if (!selectedLeads.length) {
      alert("Please select at least one lead before sending.");
      return;
    }

    if (!message.trim()) {
      alert("Please write a message before sending.");
      return;
    }

    try {
      await Promise.all(
        selectedLeads.map(async (leadId) => {
          const lead = filteredLeads.find((l) => l.id === leadId);
          if (!lead) {
            console.warn(`⚠️ Lead not found: ${leadId}`);
            return;
          }

          let sendSuccess = false;
          const leadName = lead.name || "Customer"; // Ensure name is always defined


          if (lead.platform === "whatsapp") {
            sendSuccess = await sendWhatsAppMessage(lead.contact, leadName, message);
          } else if (lead.platform === "email") {
            sendSuccess = await sendEmail(lead.contact, leadName, message);
          }
          if (sendSuccess) {
            console.log(`✅ Message successfully sent to ${lead.name}`);
          } else {
            console.warn(`⚠️ Failed to send message to ${lead.name}`);
          }
        })
      );

      alert("Messages sent successfully!");
      setSelectedLeads([]);
      setMessage("");
    } catch (error) {
      console.error("Error sending messages:", error);
    }
  };

  const saveTemplate = async () => {
    if (newTemplateName.trim() && message.trim()) {
      await addDoc(collection(martpalDb, "templates", user.uid, "messages"), {
        name: newTemplateName,
        content: message,
      });
      setNewTemplateName("");
    }
  };

  const deleteTemplate = async (id) => {
    await deleteDoc(doc(martpalDb, "templates", user.uid, "messages", id));
  };

  const loadTemplate = (content) => {
    setMessage(content); // Ensure message field updates correctly when loading a template
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">Send Messages</h1>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <select className="form-select w-auto" value={activeSegment} onChange={handleSegmentChange}>
          <option value="cold">Cold Leads</option>
          <option value="warm">Warm Leads</option>
          <option value="hot">Hot Leads</option>
        </select>
        <select className="form-select w-auto" value={platformFilter} onChange={handlePlatformChange}>
          <option value="">All Platforms</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
            </th>
            <th>Name</th>
            <th>Platform</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          {filteredLeads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedLeads.includes(lead.id)}
                  onChange={() => handleLeadSelection(lead.id)}
                />
              </td>
              <td>{lead.name}</td>
              <td>{lead.platform}</td>
              <td>{lead.contact}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <label className="form-label mt-3">Schedule Message (Optional)</label>
      <input
        type="datetime-local"
        className="form-control mb-3"
        value={scheduledTime}
        onChange={(e) => setScheduledTime(e.target.value)}
      />


      <ReactQuill theme="snow" value={message} onChange={setMessage} />

      <button className="btn btn-primary me-2" onClick={sendMessageNow}>
        Send Now
      </button>
      <button className="btn btn-warning" onClick={scheduleMessage}>
        Schedule Message
      </button>

      <h4 className="mt-4">Message Templates</h4>
      <input
        type="text"
        className="form-control mb-2"
        placeholder="Template Name"
        value={newTemplateName}
        onChange={(e) => setNewTemplateName(e.target.value)}
      />
      <button className="btn btn-success mb-3" onClick={saveTemplate}>
        Save Template
      </button>

      {templates.map((template) => (
        <div key={template.id} className="d-flex justify-content-between align-items-center mb-2">
          <span>{template.name}</span>
          <button className="btn btn-info btn-sm me-2" onClick={() => loadTemplate(template.content)}>
            Load
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => deleteTemplate(template.id)}>
            Delete
          </button>
        </div>
      ))} 
    </div>
  );
};


export default Messages;
