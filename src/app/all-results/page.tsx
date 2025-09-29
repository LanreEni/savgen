"use client";
import { useEffect, useState, useMemo } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";

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
  bloodGroup?: string; // ✅ Added
};

export default function AllResults() {
  const [allResults, setAllResults] = useState<TestData[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"patientId" | "name" | "genotype">("patientId");

  const fetchAllResults = async () => {
    setLoading(true);
    setError("");

    try {
      const snap = await getDocs(query(collection(db, "tests"), orderBy("dateTaken")));
      if (!snap.empty) {
        const results = snap.docs.map((doc) => doc.data() as TestData);
        setAllResults(results);

        const uniqueIds = Array.from(new Set(results.map((r) => r.patientId)));
        const patientMap: Record<string, PatientData> = {};

        for (const pid of uniqueIds) {
          const patientSnap = await getDocs(query(collection(db, "patients"), where("patientId", "==", pid)));
          if (!patientSnap.empty) {
            patientMap[pid] = patientSnap.docs[0].data() as PatientData;
          }
        }

        setPatients(patientMap);
      } else {
        setError("No results found in database.");
      }
    } catch (err) {
      console.error(err);
      setError("❌ Failed to fetch results.");
    }

    setTimeout(() => setLoading(false), 10);
  };

  useEffect(() => {
    fetchAllResults();
  }, []);

  const filteredResults = useMemo(() => {
    return allResults.filter((rec) => {
      const patient = patients[rec.patientId];
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      if (searchField === "patientId") return rec.patientId?.toLowerCase().includes(term);
      if (searchField === "name") return patient?.name?.toLowerCase().includes(term);
      if (searchField === "genotype") return (rec.genotype ?? "").toLowerCase().includes(term);
      return true;
    });
  }, [allResults, patients, searchTerm, searchField]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex flex-col items-center py-8 px-2 sm:px-4">
      <section className="w-full max-w-5xl bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
        <h2 className="text-2xl font-bold text-red-900 text-center mb-6">All Test Results</h2>

        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="flex-1 p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold"
          />
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as any)}
            className="p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold"
          >
            <option value="patientId">Patient ID</option>
            <option value="name">Name</option>
            <option value="genotype">Genotype</option>
          </select>
        </div>

        {loading && (
          <div className="flex justify-center my-6">
            <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-700"></span>
          </div>
        )}

        {error && <p className="text-red-700 font-semibold text-center mb-4">{error}</p>}

        {!loading && filteredResults.length === 0 && (
          <p className="text-center text-gray-600">No results found.</p>
        )}

        {filteredResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-rose-200">
              <thead>
                <tr className="bg-rose-100 text-red-900 font-bold">
                  <th className="border border-rose-300 px-4 py-2">#</th>
                  <th className="border border-rose-300 px-4 py-2">Patient ID</th>
                  <th className="border border-rose-300 px-4 py-2">Name</th>
                  <th className="border border-rose-300 px-4 py-2">Age</th>
                  <th className="border border-rose-300 px-4 py-2">Gender</th>
                  <th className="border border-rose-300 px-4 py-2">Blood Group</th> {/* ✅ Added */}
                  <th className="border border-rose-300 px-4 py-2">Malaria</th>
                  <th className="border border-rose-300 px-4 py-2">Genotype</th>
                  <th className="border border-rose-300 px-4 py-2">Date Taken</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((rec, idx) => {
                  const patient = patients[rec.patientId];
                  let age = "N/A";
                  if (patient) {
                    const dob = new Date(patient.dob);
                    const today = new Date();
                    age = (today.getFullYear() - dob.getFullYear()).toString();
                    const m = today.getMonth() - dob.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                      age = (parseInt(age) - 1).toString();
                    }
                  }
                  return (
                    <tr key={idx} className="text-gray-700 text-center">
                      <td className="border border-rose-300 px-2 py-1">{idx + 1}</td>
                      <td className="border border-rose-300 px-2 py-1">{rec.patientId}</td>
                      <td className="border border-rose-300 px-2 py-1">{patient?.name || "N/A"}</td>
                      <td className="border border-rose-300 px-2 py-1">{age}</td>
                      <td className="border border-rose-300 px-2 py-1">{patient?.gender || "N/A"}</td>
                      <td className="border border-rose-300 px-2 py-1">{patient?.bloodGroup || "N/A"}</td> {/* ✅ Added */}
                      <td className="border border-rose-300 px-2 py-1">{rec.malaria}</td>
                      <td className="border border-rose-300 px-2 py-1">{rec.genotype}</td>
                      <td className="border border-rose-300 px-2 py-1">
                        {rec.dateTaken ? new Date(rec.dateTaken).toLocaleDateString() : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}