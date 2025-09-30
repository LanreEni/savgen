"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

type TestData = {
  patientId: string;
  malaria?: string;
  genotype?: string;
  bloodGroup?: string;
  dateTaken: string;
  lastUpdated?: string;
};

type PatientData = {
  patientId: string;
  name: string;
  dob: string;
  gender: string;
  phone?: string;
};

export default function TestAndSearch() {
  const [formData, setFormData] = useState({
    patientId: "",
    malaria: "",
    genotype: "",
    bloodGroup: "",
  });
  const [patientId, setPatientId] = useState("");
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [records, setRecords] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Track if we're updating existing record
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // 🔑 Access Key modal state
  const [showModal, setShowModal] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const ACCESS_KEY = "savgen25";

  useEffect(() => {
    const hasAccess = sessionStorage.getItem("hasAccess");
    if (hasAccess === "true") {
      setShowModal(false);
    }
  }, []);

  const handleKeySubmit = () => {
    if (keyInput === ACCESS_KEY) {
      sessionStorage.setItem("hasAccess", "true");
      setShowModal(false);
    } else {
      alert("❌ Wrong key, try again!");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Check for existing test record when Patient ID is entered
  const checkExistingTest = async (pid: string) => {
    if (!pid.trim()) return;
    
    try {
      const q = query(collection(db, "tests"), where("patientId", "==", pid.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Found existing test record
        const existingTest = querySnapshot.docs[0];
        const testData = existingTest.data() as TestData;
        
        setFormData({
          patientId: pid.trim(),
          malaria: testData.malaria || "",
          genotype: testData.genotype || "",
          bloodGroup: testData.bloodGroup || "",
        });
        setExistingRecordId(existingTest.id);
        setIsUpdateMode(true);
        setMessage({ type: "success", text: "📝 Existing record loaded. You can update it." });
      } else {
        setIsUpdateMode(false);
        setExistingRecordId(null);
      }
    } catch (err) {
      console.error("Error checking existing test:", err);
    }
  };

  // Trigger check when Patient ID field loses focus
  const handlePatientIdBlur = () => {
    if (formData.patientId.trim()) {
      checkExistingTest(formData.patientId);
    }
  };

  // Submit or Update test result
  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId.trim()) {
      setMessage({ type: "error", text: "⚠️ Patient ID is required." });
      return;
    }
    setSubmitting(true);
    setMessage(null);

    try {
      // 🔍 Check if patient exists
      const patientQ = query(
        collection(db, "patients"),
        where("patientId", "==", formData.patientId.trim())
      );
      const patientSnap = await getDocs(patientQ);

      if (patientSnap.empty) {
        setMessage({ type: "error", text: "❌ Patient ID not found. Please register patient first." });
        setSubmitting(false);
        return;
      }

      // Check if updating existing record
      if (isUpdateMode && existingRecordId) {
        // ✏️ UPDATE existing record
        const testRef = doc(db, "tests", existingRecordId);
        await updateDoc(testRef, {
          malaria: formData.malaria || null,
          genotype: formData.genotype || null,
          bloodGroup: formData.bloodGroup || null,
          lastUpdated: new Date().toISOString(),
        });
        setMessage({ type: "success", text: "✅ Test record updated successfully!" });
      } else {
        // ➕ CREATE new record
        await addDoc(collection(db, "tests"), {
          patientId: formData.patientId.trim(),
          malaria: formData.malaria || null,
          genotype: formData.genotype || null,
          bloodGroup: formData.bloodGroup || null,
          dateTaken: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });
        setMessage({ type: "success", text: "✅ Test submitted successfully!" });
      }

      setPatientId(formData.patientId.trim());
      clearForm();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "❌ Failed to submit test." });
    }

    setSubmitting(false);
  };

  // Clear form
  const clearForm = () => {
    setFormData({ patientId: "", malaria: "", genotype: "", bloodGroup: "" });
    setIsUpdateMode(false);
    setExistingRecordId(null);
  };

  // Search patient records
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecords([]);
    setError("");
    setPatient(null);

    if (!patientId.trim()) {
      setError("❌ Please enter a Patient ID");
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, "tests"), where("patientId", "==", patientId.trim()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError("⚠️ No record found for this Patient ID.");
        setRecords([]);
        setPatient(null);
      } else {
        const allRecords = querySnapshot.docs.map(doc => doc.data() as TestData);
        setRecords(allRecords);
        
        // Fetch patient info
        const patientQ = query(collection(db, "patients"), where("patientId", "==", patientId.trim()));
        const patientSnap = await getDocs(patientQ);
        if (!patientSnap.empty) {
          setPatient(patientSnap.docs[0].data() as PatientData);
        }
      }
    } catch (err) {
      setError("❌ Error searching records.");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80 text-center">
            <h2 className="text-lg font-bold text-red-900 mb-4">Enter Access Key</h2>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter key"
              className="w-full border p-2 rounded mb-4"
            />
            <button
              onClick={handleKeySubmit}
              className="bg-gradient-to-r from-red-700 to-red-900 text-white px-4 py-2 rounded-lg font-semibold hover:scale-105 transition"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {!showModal && (
        <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex flex-col items-center py-8 px-2 sm:px-4 space-y-8">
          {/* Test Submission Form */}
          <section className="w-full max-w-2xl bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-red-900">
                {isUpdateMode ? "Update Test Result" : "Submit Test Result"}
              </h2>
              {isUpdateMode && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                  ✏️ Edit Mode
                </span>
              )}
            </div>
            
            <form onSubmit={handleSubmitTest} className="space-y-4">
              <div>
                <input
                  type="text"
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleChange}
                  onBlur={handlePatientIdBlur}
                  placeholder="Patient ID"
                  className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  💡 Enter Patient ID and tab out to load existing test data
                </p>
              </div>

              <select
                name="malaria"
                value={formData.malaria}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold"
              >
                <option value="">Select Malaria Result (Optional)</option>
                <option value="Negative">Negative</option>
                <option value="Positive">Positive</option>
                <option value="Inconclusive">Inconclusive</option>
              </select>

              <select
                name="genotype"
                value={formData.genotype}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold"
              >
                <option value="">Select Genotype (Optional)</option>
                <option value="AA">AA</option>
                <option value="AS">AS</option>
                <option value="AC">AC</option>
                <option value="SS">SS</option>
                <option value="SC">SC</option>
                <option value="CC">CC</option>
              </select>

              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold"
              >
                <option value="">Select Blood Group (Optional)</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg font-bold hover:scale-105 transition disabled:opacity-60"
                >
                  {submitting ? "Processing..." : isUpdateMode ? "Update Test" : "Submit Test"}
                </button>
                
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition"
                >
                  Clear
                </button>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-center font-semibold ${
                  message.type === "success" 
                    ? "bg-green-100 text-green-700 border border-green-400" 
                    : "bg-red-100 text-red-700 border border-red-400"
                }`}>
                  {message.text}
                </div>
              )}
            </form>
          </section>

          {/* Search Form */}
          <section className="w-full max-w-2xl bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
            <h2 className="text-2xl font-bold text-red-900 text-center mb-6">Search Patient Records</h2>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter Patient ID"
                className="flex-1 p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg font-bold hover:scale-105 transition disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>

            {error && <p className="text-red-700 font-semibold text-center mb-4">{error}</p>}

            {loading && (
              <div className="flex justify-center my-6">
                <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-700"></span>
              </div>
            )}

            {records.length > 0 && (
              <div className="bg-gradient-to-tr from-rose-50 to-rose-100 p-6 rounded-xl border border-rose-300 shadow-md">
                <h3 className="text-xl font-bold text-red-900 mb-4">
                  Patient ID: {records[0].patientId}
                </h3>
                {patient && (
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Name: {patient.name} | Age: {(() => {
                      const dob = new Date(patient.dob);
                      const today = new Date();
                      let age = today.getFullYear() - dob.getFullYear();
                      const m = today.getMonth() - dob.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                      return age;
                    })()} | Gender: {patient.gender}
                  </h4>
                )}
                <ul className="space-y-4">
                  {records.map((rec, idx) => (
                    <li
                      key={idx}
                      className="bg-white p-4 rounded-lg shadow border border-rose-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="text-sm text-gray-600">Malaria:</span>
                          <p className="font-bold text-red-900">{rec.malaria || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Genotype:</span>
                          <p className="font-bold text-red-900">{rec.genotype || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Blood Group:</span>
                          <p className="font-bold text-red-900">{rec.bloodGroup || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Date Taken:</span>
                          <p className="font-bold text-red-900">
                            {rec.dateTaken ? new Date(rec.dateTaken).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        {rec.lastUpdated && (
                          <div className="col-span-2">
                            <span className="text-xs text-gray-500">
                              Last updated: {new Date(rec.lastUpdated).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
