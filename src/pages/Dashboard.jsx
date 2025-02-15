import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore"; // Correct imports
import { db } from "../services/firebase";

const Dashboard = () => {
  const { user } = useAuth();
  const [userName, setUserName] = useState(""); // Initialize userName state
  const [counts, setCounts] = useState({ cold: 0, warm: 0, hot: 0 }); // Initialize counts for lead segments

  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        try {
          console.log("User UID:", user.uid); // Log user UID
          const userDoc = await getDoc(doc(db, "users", user.uid)); // Fetch user's Firestore doc
          
          if (userDoc.exists()) {
            setUserName(userDoc.data().name); // Set userName from Firestore data
          } else {
            console.error("User document not found!"); // If document is not found
            setUserName("User"); // Fallback to "User" if document doesn't exist
          }
        } catch (error) {
          console.error("Error fetching user name:", error);
        }
      } else {
        console.error("User is not authenticated");
      }
    };

    const fetchLeadCounts = async () => {
      if (user) {
        try {
          const segments = ["cold", "warm", "hot"];
          const countsPromises = segments.map(async (segment) => {
            const segmentRef = collection(db, "leads", user.uid, segment); // User-specific sub-collections
            const snapshot = await getDocs(segmentRef);
            return { segment, count: snapshot.size }; // Get count of documents in each segment
          });

          const countsResults = await Promise.all(countsPromises);
          const updatedCounts = countsResults.reduce(
            (acc, { segment, count }) => ({ ...acc, [segment]: count }),
            {}
          );

          setCounts(updatedCounts);
        } catch (error) {
          console.error("Error fetching lead counts:", error);
        }
      }
    };

    fetchUserName();
    fetchLeadCounts();
  }, [user]); // Run the effect when `user` changes

  return (
    <div className="container mt-5">
      <h1 className="text-center">Welcome to MartPal, {userName}!</h1>
      <div className="row mt-4">
        <div className="col-md-4">
          <div className="card text-white bg-primary mb-3">
            <div className="card-header">Cold Leads</div>
            <div className="card-body">
              <h5 className="card-title">{counts.cold}</h5>
              <p className="card-text">Customers who have just subscribed.</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-white bg-warning mb-3">
            <div className="card-header">Warm Leads</div>
            <div className="card-body">
              <h5 className="card-title">{counts.warm}</h5>
              <p className="card-text">Customers who are responsive.</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-white bg-success mb-3">
            <div className="card-header">Hot Leads</div>
            <div className="card-body">
              <h5 className="card-title">{counts.hot}</h5>
              <p className="card-text">Customers very likely to buy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
