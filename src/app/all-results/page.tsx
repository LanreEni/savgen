"use client";
import { useEffect, useState, useMemo } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";

type TestData = {
  id: string;
  patientId: string;
  malaria: string;
  genotype: string;
  bloodGroup?: string;
  dateTaken: string;
};

type PatientData = {
  patientId: string;
  name: string;
  dob: string;
  gender: string;
  phone?: string;
  bloodGroup?: string;
};

const ACCESS_KEY = "admin25";

export default function AllResults() {
  const [allResults, setAllResults] = useState<TestData[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"patientId" | "name" | "genotype">("patientId");

  const [accessGranted, setAccessGranted] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  const [editData, setEditData] = useState<any | null>(null); // merged record

  const fetchAllResults = async () => {
    setLoading(true);
    setError("");

    try {
      const snap = await getDocs(query(collection(db, "tests"), orderBy("dateTaken")));
      if (!snap.empty) {
        const results = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        setAllResults(results);

        // Fetch patients
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDoc(doc(db, "tests", id));
      setAllResults((prev) => prev.filter((rec: any) => rec.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("❌ Failed to delete record");
    }
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    try {
      // update test record
      const { id, patientId, malaria, genotype, bloodGroup, dateTaken } = editData;
      await updateDoc(doc(db, "tests", id), {
        patientId,
        malaria,
        genotype,
        bloodGroup,
        dateTaken,
      });

      // update patient record
      const { name, dob, gender, phone } = editData;
      const patientDocRef = doc(db, "patients", patientId);
      await setDoc(
        patientDocRef,
        {
          patientId,
          name,
          dob,
          gender,
          phone,
          bloodGroup,
        },
        { merge: true }
      );

      // update state
      setAllResults((prev) => prev.map((rec) => (rec.id === id ? editData : rec)));
      setPatients((prev) => ({
        ...prev,
        [patientId]: { patientId, name, dob, gender, phone, bloodGroup },
      }));

      setEditData(null);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update record");
    }
  };

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

  // 🔐 Access key gate
  if (!accessGranted) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 shadow-lg w-80">
          <h2 className="text-xl font-bold mb-4 text-center text-red-900">Enter Access Key</h2>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Access Key"
            className="w-full p-2 border rounded-lg mb-4"
          />
          <button
            onClick={() => {
              if (keyInput === ACCESS_KEY) {
                setAccessGranted(true);
                sessionStorage.setItem("accessGranted", "true");
              } else {
                alert("❌ Invalid Key");
              }
            }}
            className="w-full bg-red-700 text-white py-2 rounded-lg font-bold hover:bg-red-800"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex flex-col items-center py-8 px-2 sm:px-4">
      <section className="w-full max-w-6xl bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
        <h2 className="text-2xl font-bold text-red-900 text-center mb-6">All Test Results</h2>

        {/* Search + Export Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
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

          <button onClick={handleExportExcel} className="bg-green-600 text-white px-3 py-2 rounded-lg">
            Export Excel
          </button>
          <button onClick={handleExportPDF} className="bg-blue-600 text-white px-3 py-2 rounded-lg">
            Export PDF
          </button>
        </div>

        {/* Table */}
        {loading && <p className="text-center">Loading...</p>}
        {error && <p className="text-red-700 font-semibold text-center mb-4">{error}</p>}
        {!loading && filteredResults.length === 0 && <p className="text-center text-gray-600">No results found.</p>}

        {filteredResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-rose-200">
              <thead>
                <tr className="bg-rose-100 text-red-900 font-bold">
                  <th>#</th>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>DOB</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Phone</th>
                  <th>Blood Group</th>
                  <th>Malaria</th>
                  <th>Genotype</th>
                  <th>Date Taken</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((rec: any, idx) => {
                  const patient = patients[rec.patientId];
                  let age = "N/A";
                  if (patient?.dob) {
                    const dob = new Date(patient.dob);
                    const today = new Date();
                    age = (today.getFullYear() - dob.getFullYear()).toString();
                    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
                      age = (parseInt(age) - 1).toString();
                    }
                  }
                  return (
                    <tr key={rec.id} className="text-gray-700 text-center">
                      <td>{idx + 1}</td>
                      <td>{rec.patientId}</td>
                      <td>{patient?.name || "N/A"}</td>
                      <td>{patient?.dob || ""}</td>
                      <td>{age}</td>
                      <td>{patient?.gender || "N/A"}</td>
                      <td>{patient?.phone || ""}</td>
                      <td>{patient?.bloodGroup || rec.bloodGroup || ""}</td>
                      <td>{rec.malaria}</td>
                      <td>{rec.genotype}</td>
                      <td>{rec.dateTaken ? new Date(rec.dateTaken).toLocaleDateString() : ""}</td>
                      <td className="flex gap-2 justify-center">
                        <button
                          onClick={() =>
                            setEditData({
                              ...rec,
                              ...patients[rec.patientId],
                            })
                          }
                          className="bg-yellow-500 text-white px-2 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="bg-red-600 text-white px-2 py-1 rounded"
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
        )}
      </section>

      {/* Edit Modal */}
      {editData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Edit Record</h3>

            <input
              type="text"
              value={editData.name || ""}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full border p-2 mb-2"
              placeholder="Name"
            />
            <input
              type="date"
              value={editData.dob || ""}
              onChange={(e) => setEditData({ ...editData, dob: e.target.value })}
              className="w-full border p-2 mb-2"
              placeholder="DOB"
            />
            <input
              type="text"
              value={editData.gender || ""}
              onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
              className="w-full border p-2 mb-2"
              placeholder="Gender"
            />
            <input
              type="text"
              value={editData.phone || ""}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              className="w-full border p-2 mb-2"
              placeholder="Phone"
            />
            <input
              type="text"
              value={editData.bloodGroup || ""}
              onChange={(e) => setEditData({ ...editData, bloodGroup: e.target.value })}
              className="w-full border p-2 mb-2"
              placeholder="Blood Group"
            />
            <input
              type="text"
              value={editData.malaria || ""}
              onChange={(e) => setEditData({ ...editData, malaria: e.target.value })}
              className="w-full border p-2 mb-2"
              placeholder="Malaria"
            />
            <input
              type="text"
              value={editData.genotype || ""}
              onChange={(e) => setEditData({ ...editData, genotype: e.target.value })}
              className="w-full border p-2 mb-2"
              placeholder="Genotype"
            />
            <input
              type="date"
              value={editData.dateTaken || ""}
              onChange={(e) => setEditData({ ...editData, dateTaken: e.target.value })}
              className="w-full border p-2 mb-2"
              placeholder="Date Taken"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditData(null)} className="px-4 py-2 bg-gray-400 text-white rounded">
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-600 text-white rounded">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}