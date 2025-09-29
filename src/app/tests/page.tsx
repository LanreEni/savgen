"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

type TestData = {
  patientId: string;
  malaria?: string;
  genotype?: string;
  bloodGroup?: string;
  dateTaken: string;
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

  // 🔑 Access Key modal state
  const [showModal, setShowModal] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const ACCESS_KEY = "savgen25"; // change your key here

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

  // Handle input change for test form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit test result
  // Submit test result
const handleSubmitTest = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.patientId.trim()) {
    setMessage({ type: "error", text: "⚠️ Patient ID is required." });
    return;
  }
  setSubmitting(true);
  setMessage(null);

  try {
    // 🔍 Check if patient exists in patients collection
    const patientQ = query(
      collection(db, "patients"),
      where("patientId", "==", formData.patientId.trim())
    );
    const patientSnap = await getDocs(patientQ);

    if (patientSnap.empty) {
      // ❌ No patient with this ID
      setMessage({ type: "error", text: "❌ Patient ID not available." });
      setSubmitting(false);
      return;
    }

    // ✅ Patient exists → Add test record
    await addDoc(collection(db, "tests"), {
      patientId: formData.patientId.trim(),
      malaria: formData.malaria || null,
      genotype: formData.genotype || null,
      bloodGroup: formData.bloodGroup || null,
      dateTaken: new Date().toISOString(),
    });

    setMessage({ type: "success", text: "✅ Test submitted successfully!" });
    setPatientId(formData.patientId.trim()); // Prefill search input
    setFormData({ patientId: "", malaria: "", genotype: "", bloodGroup: "" });
  } catch (err) {
    console.error(err);
    setMessage({ type: "error", text: "❌ Failed to submit test." });
  }

  setSubmitting(false);
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
      // Fetch test records
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
        } else {
          setPatient(null);
        }
      }
    } catch (err) {
      setError("❌ Error searching records.");
      setRecords([]);
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <>
      {/* 🔑 Access Key Modal */}
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

      {/* Page Content (hidden until key is entered) */}
      {!showModal && (
        <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex flex-col items-center py-8 px-2 sm:px-4 space-y-8">
          {/* Test Submission Form */}
          <section className="w-full max-w-2xl bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
            <h2 className="text-2xl font-bold text-red-900 text-center mb-6">Submit Test Result</h2>
            <form onSubmit={handleSubmitTest} className="space-y-4">
              <input
                type="text"
                name="patientId"
                value={formData.patientId}
                onChange={handleChange}
                placeholder="Patient ID"
                className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold"
                required
              />
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg font-bold hover:scale-105 transition"
              >
                {submitting ? "Submitting..." : "Submit Test"}
              </button>
              {message && (
                <p className={`mt-2 text-center font-semibold ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
                  {message.text}
                </p>
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
                className="px-6 py-3 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg font-bold hover:scale-105 transition"
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

            {/* Combined Result Card */}
            {records.length > 0 && (
              <div className="bg-gradient-to-tr from-rose-50 to-rose-100 p-6 rounded-xl border border-rose-300 shadow-md">
                <h3 className="text-xl font-bold text-red-900 mb-4">
                  Patient ID: {records[0].patientId}
                </h3>
                {patient && (
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    Name: {patient.name} | Age: {(() => {
                      const dob = new Date(patient.dob);
                      const today = new Date();
                      let age = today.getFullYear() - dob.getFullYear();
                      const m = today.getMonth() - dob.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                      return age;
                    })()}
                  </h4>
                )}
                <ul className="space-y-4">
                  {records.map((rec, idx) => (
                    <li
                      key={idx}
                      className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-rose-200 pb-2 last:border-b-0"
                    >
                      <span className="font-semibold text-gray-700">
                        Malaria: <span className="text-red-900">{rec.malaria || "N/A"}</span>
                      </span>
                      <span className="font-semibold text-gray-700">
                        Genotype: <span className="text-red-900">{rec.genotype || "N/A"}</span>
                      </span>
                      <span className="font-semibold text-gray-700">
                        Blood Group: <span className="text-red-900">{rec.bloodGroup || "N/A"}</span>
                      </span>
                      <span className="font-semibold text-gray-700">
                        Date Taken:{" "}
                        <span className="text-red-900">
                          {rec.dateTaken ? new Date(rec.dateTaken).toLocaleDateString() : ""}
                        </span>
                      </span>
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