"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

type PatientData = {
  id: string;
  patientId: string;
  name: string;
  dob: string;
  gender: string;
  phone?: string;
  bloodGroup?: string;
  registeredAt?: string;
};

type TestData = {
  patientId: string;
};

const ACCESS_KEY = "admin25";

export default function AllPatients() {
  const [accessGranted, setAccessGranted] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [allPatients, setAllPatients] = useState<PatientData[]>([]);
  const [testPatientIds, setTestPatientIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "hasTests" | "noTests">("all");

  useEffect(() => {
    const stored = sessionStorage.getItem("accessGranted");
    if (stored === "true") {
      setAccessGranted(true);
    }
  }, []);

  useEffect(() => {
    if (accessGranted) {
      fetchData();
    }
  }, [accessGranted]);

  const handleLogin = () => {
    if (keyInput === ACCESS_KEY) {
      setAccessGranted(true);
      sessionStorage.setItem("accessGranted", "true");
    } else {
      alert("❌ Invalid Key");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const patientsSnap = await getDocs(collection(db, "patients"));
      const patientsData = patientsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as PatientData));
      setAllPatients(patientsData);

      const testsSnap = await getDocs(collection(db, "tests"));
      const testIds = new Set(
        testsSnap.docs.map((d) => (d.data() as TestData).patientId)
      );
      setTestPatientIds(testIds);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async (patientId: string, docId: string) => {
    if (!confirm("Are you sure you want to delete this patient?")) return;

    try {
      await deleteDoc(doc(db, "patients", docId));
      
      const testsSnap = await getDocs(collection(db, "tests"));
      const deletePromises = testsSnap.docs
        .filter((d) => (d.data() as TestData).patientId === patientId)
        .map((d) => deleteDoc(doc(db, "tests", d.id)));
      await Promise.all(deletePromises);

      setAllPatients((prev) => prev.filter((p) => p.id !== docId));
      alert("✅ Patient deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("❌ Failed to delete patient");
    }
  };

  const calculateAge = (dob: string): string => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age.toString();
  };

  // Format time for display
  const formatRegistrationTime = (registeredAt?: string): string => {
    if (!registeredAt) return "N/A";
    try {
      const date = new Date(registeredAt);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return "N/A";
    }
  };

  const filteredPatients = allPatients.filter((patient) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      patient.name?.toLowerCase().includes(term) ||
      patient.patientId?.toLowerCase().includes(term) ||
      patient.phone?.toLowerCase().includes(term);
    
    const hasTest = testPatientIds.has(patient.patientId);
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "hasTests" && hasTest) ||
      (statusFilter === "noTests" && !hasTest);
    
    return matchesSearch && matchesStatus;
  });

  const groupedPatients = filteredPatients.reduce((groups, patient) => {
    const date = patient.registeredAt
      ? new Date(patient.registeredAt).toLocaleDateString()
      : "Unknown Date";
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(patient);
    return groups;
  }, {} as Record<string, PatientData[]>);

  const sortedDates = Object.keys(groupedPatients).sort((a, b) => {
    if (a === "Unknown Date") return 1;
    if (b === "Unknown Date") return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const totalPatients = allPatients.length;
  const testedPatients = allPatients.filter((p) =>
    testPatientIds.has(p.patientId)
  ).length;
  const pendingPatients = totalPatients - testedPatients;

  if (!accessGranted) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 shadow-lg w-80">
          <h2 className="text-xl font-bold mb-4 text-center text-red-900">
            Enter Access Key
          </h2>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Access Key"
            className="w-full p-2 border rounded-lg mb-4"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-red-700 text-white py-2 rounded-lg font-bold hover:bg-red-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black py-8 px-2 sm:px-4">
      <div className="w-full max-w-7xl mx-auto bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
        <h2 className="text-3xl font-bold text-red-900 text-center mb-6">
          All Registered Patients
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow">
            <h3 className="text-sm text-blue-700 font-semibold mb-1">Total Patients</h3>
            <p className="text-3xl font-bold text-blue-900">{totalPatients}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow">
            <h3 className="text-sm text-green-700 font-semibold mb-1">Tested</h3>
            <p className="text-3xl font-bold text-green-900">{testedPatients}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200 shadow">
            <h3 className="text-sm text-yellow-700 font-semibold mb-1">Pending Tests</h3>
            <p className="text-3xl font-bold text-yellow-900">{pendingPatients}</p>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, patient ID, or phone..."
            className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-semibold"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === "all"
                ? "bg-red-700 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All Patients ({totalPatients})
          </button>
          <button
            onClick={() => setStatusFilter("hasTests")}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === "hasTests"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Has Tests ({testedPatients})
          </button>
          <button
            onClick={() => setStatusFilter("noTests")}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === "noTests"
                ? "bg-yellow-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            No Tests ({pendingPatients})
          </button>
        </div>

        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Legend:</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-300"></div>
              <span>Has test records</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300"></div>
              <span>No test records yet</span>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-red-900 font-semibold">Loading...</p>
        ) : sortedDates.length === 0 ? (
          <p className="text-center text-gray-600">No patients found.</p>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="border border-rose-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-red-700 to-red-900 text-white px-4 py-3">
                  <h3 className="text-lg font-bold">
                    {date} ({groupedPatients[date].length} patients)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-rose-100 text-red-900 font-bold">
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">#</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">Patient ID</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">Name</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">DOB</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">Age</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">Gender</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">Phone</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">Blood Group</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">Time</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">Status</th>
                        <th className="border border-rose-300 px-3 py-2 text-center text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedPatients[date].map((patient, idx) => {
                        const age = calculateAge(patient.dob);
                        const hasTest = testPatientIds.has(patient.patientId);
                        const regTime = formatRegistrationTime(patient.registeredAt);

                        return (
                          <tr
                            key={patient.id}
                            className={`text-center text-gray-700 transition-colors ${
                              hasTest
                                ? "hover:bg-rose-50 bg-white"
                                : "hover:bg-yellow-200 bg-yellow-100"
                            }`}
                          >
                            <td className="border border-rose-300 px-2 py-2 text-sm">{idx + 1}</td>
                            <td className="border border-rose-300 px-2 py-2 font-medium text-sm">
                              {patient.patientId}
                            </td>
                            <td className="border border-rose-300 px-2 py-2 font-medium text-sm">
                              {patient.name}
                            </td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">
                              {patient.dob ? new Date(patient.dob).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">{age}</td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">{patient.gender}</td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">
                              {patient.phone || "N/A"}
                            </td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">
                              {patient.bloodGroup || "N/A"}
                            </td>
                            <td className="border border-rose-300 px-2 py-2 text-sm font-medium">
                              {regTime}
                            </td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  hasTest
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {hasTest ? "Has Tests" : "No Tests"}
                              </span>
                            </td>
                            <td className="border border-rose-300 px-2 py-2">
                              <button
                                onClick={() => handleDeletePatient(patient.patientId, patient.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
