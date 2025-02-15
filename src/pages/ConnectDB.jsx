import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db as martpalDb } from "../services/firebase"; // MartPal's database

const ConnectDB = () => {
  const { user } = useAuth(); // Current user
  const [credentials, setCredentials] = useState({
    apiKey: "",
    authDomain: "",
    projectId: "",
  });
  const [connected, setConnected] = useState(false);
  const [landingPageDb, setLandingPageDb] = useState(null);
  const [collections, setCollections] = useState([]);
  const [collectionDetails, setCollectionDetails] = useState({
    name: "",
    fields: "",
  });
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const savedConnection = localStorage.getItem("landingPageDbConfig");
    const savedCollectionDetails = localStorage.getItem("collectionDetails");
    if (savedConnection) {
      const config = JSON.parse(savedConnection);
      connectToDatabase(config);
    }
    if (savedCollectionDetails) {
      setCollectionDetails(JSON.parse(savedCollectionDetails));
    }
  }, []);

  const connectToDatabase = async (config) => {
    try {
      const app =
        getApps().find((app) => app.name === "landingPage") ||
        initializeApp(config, "landingPage");
      const landingDb = getFirestore(app);
      setLandingPageDb(landingDb);
      localStorage.setItem("landingPageDbConfig", JSON.stringify(config));

      const collectionsList = await fetchCollections(landingDb);
      setCollections(collectionsList);

      setMessage(`Connected to ${config.projectId}. Collections: ${collectionsList.join(", ")}`);
      setConnected(true);
    } catch (error) {
      console.error("Error connecting to database:", error);
      setMessage("Failed to connect to the database. Please check your credentials.");
    }
  };

  const fetchCollections = async (landingDb) => {
    try {
      const collectionsList = [];
      const snapshot = await getDocs(collection(landingDb, "_")); // Replace "_" with valid root
      snapshot.forEach((doc) => collectionsList.push(doc.id));
      return collectionsList;
    } catch (error) {
      console.error("Error fetching collections:", error);
      setMessage("Unable to fetch collections. Please verify the database.");
      return [];
    }
  };

  const initializeMartPalLeads = async () => {
    try {
      if (!user) return; // Ensure user is logged in

      const leadsRef = doc(martpalDb, "leads", user.uid);

      // Create the main "leads" document for the user
      await setDoc(leadsRef, { initialized: true }, { merge: true });

      // Define the sub-collections to be created
      const subCollections = ["cold", "warm", "hot"];
      for (const subCollection of subCollections) {
        const subCollectionRef = collection(martpalDb, "leads", user.uid, subCollection);

        // Check if sub-collection exists by querying documents
        const snapshot = await getDocs(subCollectionRef);
        if (snapshot.empty) {
          // If empty, initialize it with a template
          console.log(`Initialized ${subCollection} sub-collection.`);
        }
      }
    } catch (error) {
      console.error("Error initializing leads collections in MartPal:", error);
    }
  };

  const checkForDuplicate = async (leadData) => {
    const martpalLeadsRef = collection(martpalDb, "leads", user.uid, "cold");
    const q = query(
      martpalLeadsRef,
      where("name", "==", leadData.name),
      where("platform", "==", leadData.platform),
      where("contact", "==", leadData.contact)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty; // Return true if duplicate exists
  };

  const importDataToMartPal = async () => {
    if (!collectionDetails.name || !landingPageDb || !user) {
      setMessage("Please specify the collection name to fetch data.");
      return;
    }

    try {
      const collectionRef = collection(landingPageDb, collectionDetails.name);
      const snapshot = await getDocs(collectionRef);

      const martpalLeadsColdRef = collection(
        martpalDb,
        "leads",
        user.uid,
        "cold"
      );

      let importedCount = 0;

      // Only initialize sub-collections if there is valid data
      const validData = [];
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();

        // Validate data (ensure all required fields are present)
        if (data.name && data.contact && data.platform) {
          validData.push(data);

          const formattedData = {
            ...data,
            status: "cold",
          };

          const isDuplicate = await checkForDuplicate(formattedData);
          if (!isDuplicate) {
            await addDoc(martpalLeadsColdRef, formattedData);
            importedCount++;
          }
        }
      }

      if (validData.length > 0) {
        await initializeMartPalLeads(); // Initialize sub-collections only if valid data exists
      }

      setToast(`Successfully imported ${importedCount} new documents to MartPal!`);
    } catch (error) {
      console.error("Error importing data to MartPal:", error);
      setMessage("Failed to import data. Please verify the collection and fields.");
    }
  };

  const handleCollectionSubmit = async (e) => {
    e.preventDefault();
    await importDataToMartPal();
  };

  const disconnectDatabase = async () => {
    try {
      const userLeadsRef = doc(martpalDb, "leads", user.uid);
      await deleteDoc(userLeadsRef);

      localStorage.removeItem("landingPageDbConfig");
      localStorage.removeItem("collectionDetails");
      setLandingPageDb(null);
      setConnected(false);
      setCollections([]);
      setMessage("Database disconnected, and imported data has been removed.");
    } catch (error) {
      console.error("Error disconnecting database:", error);
      setMessage("Failed to disconnect database. Please try again.");
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">Connect Database</h1>

      {!connected ? (
        <div className="card p-4 shadow-sm mb-4">
          <h5>Database Credentials</h5>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              connectToDatabase(credentials);
            }}
          >
            <div className="mb-3">
              <label htmlFor="apiKey" className="form-label">API Key</label>
              <input
                type="text"
                className="form-control"
                id="apiKey"
                value={credentials.apiKey}
                onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="authDomain" className="form-label">Auth Domain</label>
              <input
                type="text"
                className="form-control"
                id="authDomain"
                value={credentials.authDomain}
                onChange={(e) => setCredentials({ ...credentials, authDomain: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="projectId" className="form-label">Project ID</label>
              <input
                type="text"
                className="form-control"
                id="projectId"
                value={credentials.projectId}
                onChange={(e) => setCredentials({ ...credentials, projectId: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100">Connect DB</button>
          </form>
        </div>
      ) : (
        <>
          <div className="card p-4 shadow-sm mb-4">
            <h5>Connected to {credentials.projectId}</h5>
            <p>Available Collections: {collections.join(", ")}</p>
            <button className="btn btn-danger w-100" onClick={disconnectDatabase}>Disconnect DB</button>
          </div>

          <div className="card p-4 shadow-sm mb-4">
            <h5>Specify Collection and Fields</h5>
            <form onSubmit={handleCollectionSubmit}>
              <div className="mb-3">
                <label htmlFor="collectionName" className="form-label">Collection Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="collectionName"
                  value={collectionDetails.name}
                  onChange={(e) => setCollectionDetails({ ...collectionDetails, name: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-100">Import Data</button>
            </form>
          </div>
        </>
      )}

      {message && <p className="mt-3 text-center">{message}</p>}
      {toast && <div className="alert alert-success mt-3 text-center">{toast}</div>}
    </div>
  );
};

export default ConnectDB;
