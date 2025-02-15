import React from 'react';
import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db as martpalDb } from "../services/firebase"; // MartPal's database
import { useAuth } from "../context/AuthContext"; // Auth Context to get current user

const Leads = () => {
  const [activeTab, setActiveTab] = useState("cold");
  const [leads, setLeads] = useState([]);
  const [platformFilter, setPlatformFilter] = useState(""); // Filter by platform
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // Get current user

  // Capitalize the first letter of a string
  const capitalize = (string) => {
    if (!string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  // Remove duplicates by checking `name`, `platform`, and `contact`
  const removeDuplicates = (leads) => {
    const uniqueLeads = new Map();
    leads.forEach((lead) => {
      const uniqueKey = `${lead.name.toLowerCase()}_${lead.platform.toLowerCase()}_${lead.contact.toLowerCase()}`;
      if (!uniqueLeads.has(uniqueKey)) {
        uniqueLeads.set(uniqueKey, lead);
      }
    });
    return Array.from(uniqueLeads.values());
  };

  useEffect(() => {
    if (!user) {
      console.error("No user found. Please log in.");
      return;
    }

    const fetchLeads = () => {
      setLoading(true);

      // Modify query to include user's UID
      let leadsQuery = query(collection(martpalDb, "leads", user.uid, activeTab));

      // Apply platform filter if specified
      if (platformFilter) {
        const normalizedPlatformFilter = platformFilter.toLowerCase();
        leadsQuery = query(
          collection(martpalDb, "leads", user.uid, activeTab),
          where("platform", ">=", normalizedPlatformFilter),
          where("platform", "<=", normalizedPlatformFilter + "\uf8ff")
        );
      }

      // Subscribe to Firestore for real-time updates
      const unsubscribe = onSnapshot(
        leadsQuery,
        (snapshot) => {
          const fetchedLeads = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Normalize data for consistent display
              name: capitalize(data.name),
              platform: capitalize(data.platform),
              contact: data.contact,
            };
          });

          // Remove duplicates and set the leads
          setLeads(removeDuplicates(fetchedLeads));
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching leads:", error);
          setLoading(false);
        }
      );

      return unsubscribe;
    };

    const unsubscribe = fetchLeads();
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [activeTab, platformFilter, user]);

  const handleTabClick = (status) => {
    setActiveTab(status);
    setPlatformFilter(""); // Reset platform filter when switching tabs
  };

  const handlePlatformFilterChange = (e) => {
    setPlatformFilter(e.target.value);
  };

  const moveLead = async (id, fromStatus, toStatus) => {
    try {
      const leadRef = doc(martpalDb, "leads", user.uid, fromStatus, id);
      const leadSnapshot = await getDoc(leadRef);

      if (leadSnapshot.exists()) {
        const leadData = leadSnapshot.data();
        const newLeadRef = doc(martpalDb, "leads", user.uid, toStatus, id);

        // Add the document to the new sub-collection and delete it from the old one
        await setDoc(newLeadRef, { ...leadData, status: toStatus });
        await deleteDoc(leadRef);

        console.log(`Lead ${id} moved from ${fromStatus} to ${toStatus}.`);
      } else {
        console.error("Lead does not exist in the current status.");
      }
    } catch (error) {
      console.error("Error moving lead:", error);
    }
  };

  const deleteLead = async (id) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      try {
        const leadRef = doc(martpalDb, "leads", user.uid, activeTab, id);
        await deleteDoc(leadRef);
        console.log(`Lead ${id} deleted successfully.`);
      } catch (error) {
        console.error("Error deleting lead:", error);
      }
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">Leads Overview</h1>

      {/* Tab Navigation */}
      <ul className="nav nav-tabs justify-content-center">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "cold" ? "active" : ""}`}
            onClick={() => handleTabClick("cold")}
          >
            Cold Leads
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "warm" ? "active" : ""}`}
            onClick={() => handleTabClick("warm")}
          >
            Warm Leads
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "hot" ? "active" : ""}`}
            onClick={() => handleTabClick("hot")}
          >
            Hot Leads
          </button>
        </li>
      </ul>

      {/* Platform Filter Dropdown */}
      <div className="mt-3 d-flex justify-content-between align-items-center">
        <select
          className="form-select w-auto"
          value={platformFilter}
          onChange={handlePlatformFilterChange}
        >
          <option value="">All Platforms</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <button
          className="btn btn-secondary"
          onClick={() => setPlatformFilter("")}
          disabled={!platformFilter}
        >
          Clear Filter
        </button>
      </div>

      {/* Leads Table */}
      <div className="mt-4">
        {loading ? (
          <p className="text-center">Loading...</p>
        ) : leads.length > 0 ? (
          <table className="table table-striped">
            <thead>
              <tr>
                <th>SN</th>
                <th>Customer's Name</th>
                <th>Contact Details</th>
                <th>Active Platform</th>
                <th>Order Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => (
                <tr key={lead.id}>
                  <td>{index + 1}</td>
                  <td>{lead.name}</td>
                  <td>{lead.contact}</td>
                  <td>{lead.platform}</td>
                  <td>{lead.orderRate || 0}</td>
                  <td>
                    {activeTab === "cold" && (
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => moveLead(lead.id, "cold", "warm")}
                      >
                        Move to Warm
                      </button>
                    )}
                    {activeTab === "warm" && (
                      <button
                        className="btn btn-success btn-sm me-2"
                        onClick={() => moveLead(lead.id, "warm", "hot")}
                      >
                        Move to Hot
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteLead(lead.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center">No leads found in this category.</p>
        )}
      </div>
    </div>
  );
};

export default Leads;
