"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

type TestData = {
  patientId: string;
  malaria: string;
  genotype: string;
  dateTaken: string;
};

type PatientData = {
  patientId: string;
  name: string;
  dob: string;
  gender: string;
  phone?: string;
};

export default function Search() {
  const [patientId, setPatientId] = useState("");
  const [records, setRecords] = useState<TestData[]>([]);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔑 Access key modal state
  const [showModal, setShowModal] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const ACCESS_KEY = "savgen25"; // change if needed

  useEffect(() => {
    if (sessionStorage.getItem("hasAccess") === "true") {
      setShowModal(false);
    }
  }, []);

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput === ACCESS_KEY) {
      sessionStorage.setItem("hasAccess", "true");
      setShowModal(false);
    } else {
      alert("❌ Invalid key. Please try again.");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecords([]);
    setError("");
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
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center py-8 px-2 sm:px-4">
      {/* 🔑 Access Key Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border border-red-200">
            <h2 className="text-xl font-bold text-red-900 mb-4 text-center">Enter Access Key</h2>
            <form onSubmit={handleKeySubmit} className="flex flex-col gap-4">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter key"
                className="p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold"
              />
              <button
                type="submit"
                className="py-2 px-4 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg font-bold hover:scale-105 transition"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Search Section */}
      {!showModal && (
        <section className="w-full max-w-2xl bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
          <h2 className="text-2xl font-bold text-red-900 text-center mb-6">
            Search Patient Records
          </h2>

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

          <div className="flex justify-center mb-8">
            <a
              href="/all-results"
              className="inline-block px-6 py-2 bg-rose-100 border border-rose-300 text-red-900 font-semibold rounded-lg shadow hover:bg-rose-200 transition"
            >
              📋 View All Results
            </a>
          </div>

          {error && (
            <p className="text-red-700 font-semibold text-center mb-4">{error}</p>
          )}

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
                      Malaria: <span className="text-red-900">{rec.malaria}</span>
                    </span>
                    <span className="font-semibold text-gray-700">
                      Genotype: <span className="text-red-900">{rec.genotype}</span>
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
      )}
    </div>
  );
}
