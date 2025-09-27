"use client";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, QueryDocumentSnapshot, DocumentData, query, where } from "firebase/firestore";

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

export default function AllResults() {
  const [results, setResults] = useState<TestData[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError("");
      try {
        const querySnapshot = await getDocs(collection(db, "tests"));
        const allResults = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => doc.data() as TestData);
        setResults(allResults);
        // Fetch all unique patient IDs
        const uniqueIds = Array.from(new Set(allResults.map(r => r.patientId)));
        const patientMap: Record<string, PatientData> = {};
        for (const pid of uniqueIds) {
          const patientQ = query(collection(db, "patients"), where("patientId", "==", pid));
          const patientSnap = await getDocs(patientQ);
          if (!patientSnap.empty) {
            patientMap[pid] = patientSnap.docs[0].data() as PatientData;
          }
        }
        setPatients(patientMap);
      } catch (err) {
        setError("❌ Failed to fetch results.");
        setResults([]);
        console.error(err);
      }
      setLoading(false);
    };
    fetchResults();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center py-8 px-2 sm:px-4">
      <section className="w-full max-w-3xl bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
        <h2 className="text-2xl font-bold text-red-900 text-center mb-6">All Test Results</h2>
        {loading && (
          <div className="flex justify-center my-6">
            <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-700"></span>
          </div>
        )}
        {error && (
          <p className="text-red-700 font-semibold text-center mb-4">{error}</p>
        )}
        {results.length > 0 ? (
          <ul className="space-y-4">
            {results.map((rec, idx) => {
              const patient = patients[rec.patientId];
              let age = '';
              if (patient) {
                const dob = new Date(patient.dob);
                const today = new Date();
                age = (today.getFullYear() - dob.getFullYear()).toString();
                const m = today.getMonth() - dob.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age = (parseInt(age) - 1).toString();
              }
              return (
                <li key={idx} className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-rose-200 pb-2 last:border-b-0">
                  <span className="font-semibold text-gray-700">Patient ID: <span className="text-red-900">{rec.patientId}</span></span>
                  <span className="font-semibold text-gray-700">Name: <span className="text-red-900">{patient ? patient.name : 'N/A'}</span></span>
                  <span className="font-semibold text-gray-700">Age: <span className="text-red-900">{patient ? age : 'N/A'}</span></span>
                  <span className="font-semibold text-gray-700">Malaria: <span className="text-red-900">{rec.malaria}</span></span>
                  <span className="font-semibold text-gray-700">Genotype: <span className="text-red-900">{rec.genotype}</span></span>
                  <span className="font-semibold text-gray-700">Date Taken: <span className="text-red-900">{rec.dateTaken ? new Date(rec.dateTaken).toLocaleDateString() : ''}</span></span>
                </li>
              );
            })}
          </ul>
        ) : (
          !loading && <p className="text-center text-gray-600">No test results found.</p>
        )}
      </section>
    </div>
  
  );
}
