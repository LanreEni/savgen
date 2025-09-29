"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
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

// Types
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

type SearchField = "patientId" | "name" | "genotype";

type EditData = TestData & PatientData;

// Constants
const ACCESS_KEY = "admin25";
const ACCESS_STORAGE_KEY = "accessGranted";

// Custom hooks
const useAuth = () => {
  const [accessGranted, setAccessGranted] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(ACCESS_STORAGE_KEY);
    if (stored === "true") {
      setAccessGranted(true);
    }
  }, []);

  const handleLogin = useCallback(() => {
    if (keyInput === ACCESS_KEY) {
      setAccessGranted(true);
      sessionStorage.setItem(ACCESS_STORAGE_KEY, "true");
    } else {
      alert("❌ Invalid Key");
    }
  }, [keyInput]);

  return { accessGranted, keyInput, setKeyInput, handleLogin };
};

const useTestData = () => {
  const [allResults, setAllResults] = useState<TestData[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAllResults = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const testsSnap = await getDocs(
        query(collection(db, "tests"), orderBy("dateTaken"))
      );
      
      if (testsSnap.empty) {
        setError("No results found in database.");
        return;
      }

      const results = testsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as TestData
      );
      setAllResults(results);

      // Fetch patient data
      const uniquePatientIds = [...new Set(results.map((r) => r.patientId))];
      const patientPromises = uniquePatientIds.map(async (patientId) => {
        const patientSnap = await getDocs(
          query(collection(db, "patients"), where("patientId", "==", patientId))
        );
        return patientSnap.empty
          ? null
          : { [patientId]: patientSnap.docs[0].data() as PatientData };
      });

      const patientResults = await Promise.all(patientPromises);
      const patientMap = Object.assign(
        {},
        ...patientResults.filter(Boolean)
      );
      setPatients(patientMap);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("❌ Failed to fetch results.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllResults();
  }, [fetchAllResults]);

  return { allResults, patients, loading, error, setAllResults, setPatients };
};

const usePatientModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [allPatients, setAllPatients] = useState<PatientData[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [testPatientIds, setTestPatientIds] = useState<Set<string>>(new Set());
  const [patientSearchTerm, setPatientSearchTerm] = useState("");

  const fetchAllPatients = useCallback(async () => {
    if (!showModal) return;

    setLoadingPatients(true);
    try {
      // Fetch all patients
      const patientsSnap = await getDocs(collection(db, "patients"));
      const patientsData = patientsSnap.docs.map(
        (doc) => doc.data() as PatientData
      );
      setAllPatients(patientsData);

      // Fetch all test patient IDs to determine who has tests
      const testsSnap = await getDocs(collection(db, "tests"));
      const testIds = new Set(
        testsSnap.docs.map((d) => (d.data() as TestData).patientId)
      );
      setTestPatientIds(testIds);
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  }, [showModal]);

  useEffect(() => {
    fetchAllPatients();
  }, [fetchAllPatients]);

  const filteredPatients = useMemo(() => {
    if (!patientSearchTerm.trim()) return allPatients;
    
    const term = patientSearchTerm.toLowerCase();
    return allPatients.filter((patient) =>
      patient.name?.toLowerCase().includes(term) ||
      patient.patientId?.toLowerCase().includes(term) ||
      patient.phone?.toLowerCase().includes(term)
    );
  }, [allPatients, patientSearchTerm]);

  return {
    showModal,
    setShowModal,
    allPatients: filteredPatients,
    loadingPatients,
    testPatientIds,
    patientSearchTerm,
    setPatientSearchTerm,
    refetchPatients: fetchAllPatients,
  };
};

// Utility functions
const calculateAge = (dob: string): string => {
  if (!dob) return "N/A";
  
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  
  return age.toString();
};

// Components
const AccessKeyModal = ({ keyInput, setKeyInput, handleLogin }: {
  keyInput: string;
  setKeyInput: (value: string) => void;
  handleLogin: () => void;
}) => (
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

const SearchControls = ({
  searchTerm,
  setSearchTerm,
  searchField,
  setSearchField,
  onShowPatients,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchField: SearchField;
  setSearchField: (field: SearchField) => void;
  onShowPatients: () => void;
}) => (
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
      onChange={(e) => setSearchField(e.target.value as SearchField)}
      className="p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold"
    >
      <option value="patientId">Patient ID</option>
      <option value="name">Name</option>
      <option value="genotype">Genotype</option>
    </select>
    <button
      onClick={onShowPatients}
      className="px-4 py-2 bg-rose-100 border border-rose-300 text-red-900 font-semibold rounded-lg shadow hover:bg-rose-200 transition-colors"
    >
      👥 View All Patients
    </button>
  </div>
);

const ResultsTable = ({
  results,
  patients,
  onEdit,
  onDelete,
}: {
  results: TestData[];
  patients: Record<string, PatientData>;
  onEdit: (data: EditData) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="overflow-x-auto">
    <table className="min-w-full border-collapse border border-rose-200">
      <thead>
        <tr className="bg-rose-100 text-red-900 font-bold">
          {["#", "Patient ID", "Name", "DOB", "Age", "Gender", "Phone", "Blood Group", "Malaria", "Genotype", "Date Taken", "Action"].map((header) => (
            <th key={header} className="border border-rose-300 px-4 py-2 text-center">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {results.map((rec, idx) => {
          const patient = patients[rec.patientId];
          const age = calculateAge(patient?.dob);
          
          return (
            <tr key={rec.id} className="text-gray-700 text-center hover:bg-rose-50">
              <td className="border border-rose-300 px-2 py-2">{idx + 1}</td>
              <td className="border border-rose-300 px-2 py-2">{rec.patientId}</td>
              <td className="border border-rose-300 px-2 py-2">{patient?.name || "N/A"}</td>
              <td className="border border-rose-300 px-2 py-2">
                {patient?.dob ? new Date(patient.dob).toLocaleDateString() : "N/A"}
              </td>
              <td className="border border-rose-300 px-2 py-2">{age}</td>
              <td className="border border-rose-300 px-2 py-2">{patient?.gender || "N/A"}</td>
              <td className="border border-rose-300 px-2 py-2">{patient?.phone || "N/A"}</td>
              <td className="border border-rose-300 px-2 py-2">
                {patient?.bloodGroup || rec.bloodGroup || "N/A"}
              </td>
              <td className="border border-rose-300 px-2 py-2">{rec.malaria}</td>
              <td className="border border-rose-300 px-2 py-2">{rec.genotype}</td>
              <td className="border border-rose-300 px-2 py-2">
                {rec.dateTaken ? new Date(rec.dateTaken).toLocaleDateString() : "N/A"}
              </td>
              <td className="border border-rose-300 px-2 py-2">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => onEdit({ ...rec, ...patient })}
                    className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(rec.id)}
                    className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const EditModal = ({
  editData,
  setEditData,
  onSave,
  onCancel,
}: {
  editData: EditData | null;
  setEditData: (data: EditData) => void;
  onSave: () => void;
  onCancel: () => void;
}) => {
  if (!editData) return null;

  const inputFields = [
    { key: "name", label: "Name", type: "text" },
    { key: "dob", label: "Date of Birth", type: "date" },
    { key: "gender", label: "Gender", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "bloodGroup", label: "Blood Group", type: "text" },
    { key: "malaria", label: "Malaria", type: "text" },
    { key: "genotype", label: "Genotype", type: "text" },
    { key: "dateTaken", label: "Date Taken", type: "date" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-red-900">Edit Record</h3>
        
        {inputFields.map(({ key, label, type }) => (
          <input
            key={key}
            type={type}
            value={editData[key as keyof EditData] || ""}
            onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
            className="w-full border p-2 mb-2 rounded"
            placeholder={label}
          />
        ))}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const PatientsModal = ({
  show,
  onClose,
  patients,
  loading,
  testPatientIds,
  searchTerm,
  setSearchTerm,
  onDeletePatient,
}: {
  show: boolean;
  onClose: () => void;
  patients: PatientData[];
  loading: boolean;
  testPatientIds: Set<string>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onDeletePatient: (patientId: string) => void;
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-900">👥 All Registered Patients</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Search bar in modal */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, patient ID, or phone..."
            className="w-full p-3 border rounded-lg bg-blue-50 border-blue-200 focus:ring-2 focus:ring-blue-400 text-black font-semibold"
          />
        </div>

        {/* Legend */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
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
          <p className="text-center">Loading patients...</p>
        ) : patients.length === 0 ? (
          <p className="text-center text-red-700 font-semibold">⚠️ No patients found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-rose-200">
              <thead>
                <tr className="bg-rose-100 text-red-900 font-bold">
                  {["#", "Patient ID", "Name", "DOB", "Age", "Gender", "Phone", "Blood Group", "Status", "Actions"].map((header) => (
                    <th key={header} className="border border-rose-300 px-3 py-2 text-center">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((patient, idx) => {
                  const age = calculateAge(patient.dob);
                  const hasTest = testPatientIds.has(patient.patientId);
                  
                  return (
                    <tr 
                      key={patient.patientId} 
                      className={`text-center text-gray-700 transition-colors ${
                        hasTest 
                          ? "hover:bg-rose-50 bg-white" 
                          : "hover:bg-yellow-200 bg-yellow-100"
                      }`}
                    >
                      <td className="border border-rose-300 px-3 py-2">{idx + 1}</td>
                      <td className="border border-rose-300 px-3 py-2 font-medium">{patient.patientId}</td>
                      <td className="border border-rose-300 px-3 py-2 font-medium">{patient.name}</td>
                      <td className="border border-rose-300 px-3 py-2">
                        {patient.dob ? new Date(patient.dob).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="border border-rose-300 px-3 py-2">{age}</td>
                      <td className="border border-rose-300 px-3 py-2">{patient.gender}</td>
                      <td className="border border-rose-300 px-3 py-2">{patient.phone || "N/A"}</td>
                      <td className="border border-rose-300 px-3 py-2">{patient.bloodGroup || "N/A"}</td>
                      <td className="border border-rose-300 px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          hasTest 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {hasTest ? "Has Tests" : "No Tests"}
                        </span>
                      </td>
                      <td className="border border-rose-300 px-3 py-2">
                        <button
                          onClick={() => onDeletePatient(patient.patientId)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
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
      </div>
    </div>
  );
};

// Main component
export default function AllResults() {
  const { accessGranted, keyInput, setKeyInput, handleLogin } = useAuth();
  const { allResults, patients, loading, error, setAllResults, setPatients } = useTestData();
  const { 
    showModal, 
    setShowModal, 
    allPatients, 
    loadingPatients, 
    testPatientIds, 
    patientSearchTerm, 
    setPatientSearchTerm,
    refetchPatients
  } = usePatientModal();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("patientId");
  const [editData, setEditData] = useState<EditData | null>(null);

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return allResults;
    
    const term = searchTerm.toLowerCase();
    return allResults.filter((rec) => {
      const patient = patients[rec.patientId];
      
      switch (searchField) {
        case "patientId":
          return rec.patientId?.toLowerCase().includes(term);
        case "name":
          return patient?.name?.toLowerCase().includes(term);
        case "genotype":
          return rec.genotype?.toLowerCase().includes(term);
        default:
          return true;
      }
    });
  }, [allResults, patients, searchTerm, searchField]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    
    try {
      await deleteDoc(doc(db, "tests", id));
      setAllResults((prev) => prev.filter((rec) => rec.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("❌ Failed to delete record");
    }
  }, [setAllResults]);

  const handleDeletePatient = useCallback(async (patientId: string) => {
    if (!confirm("Are you sure you want to delete this patient? This will also delete all their test records.")) return;
    
    try {
      // Delete patient document
      await deleteDoc(doc(db, "patients", patientId));
      
      // Delete all test records for this patient
      const testsToDelete = allResults.filter(test => test.patientId === patientId);
      const deletePromises = testsToDelete.map(test => deleteDoc(doc(db, "tests", test.id)));
      await Promise.all(deletePromises);
      
      // Update local state
      setAllResults(prev => prev.filter(rec => rec.patientId !== patientId));
      setPatients(prev => {
        const newPatients = { ...prev };
        delete newPatients[patientId];
        return newPatients;
      });
      
      // Refresh modal data
      await refetchPatients();
      
      alert("✅ Patient and all related test records deleted successfully");
    } catch (err) {
      console.error("Delete patient failed:", err);
      alert("❌ Failed to delete patient");
    }
  }, [allResults, setAllResults, setPatients, refetchPatients]);

  const handleSaveEdit = useCallback(async () => {
    if (!editData) return;

    try {
      const { id, patientId, malaria, genotype, bloodGroup, dateTaken, name, dob, gender, phone } = editData;
      
      // Update test record
      await updateDoc(doc(db, "tests", id), { patientId, malaria, genotype, bloodGroup, dateTaken });
      
      // Update patient record
      await setDoc(
        doc(db, "patients", patientId),
        { patientId, name, dob, gender, phone, bloodGroup },
        { merge: true }
      );

      // Update local state
      setAllResults((prev) => prev.map((rec) => (rec.id === id ? editData : rec)));
      setPatients((prev) => ({
        ...prev,
        [patientId]: { patientId, name, dob, gender, phone, bloodGroup }
      }));
      
      setEditData(null);
    } catch (err) {
      console.error("Update failed:", err);
      alert("❌ Failed to update record");
    }
  }, [editData, setAllResults, setPatients]);

  if (!accessGranted) {
    return (
      <AccessKeyModal
        keyInput={keyInput}
        setKeyInput={setKeyInput}
        handleLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex flex-col items-center py-8 px-2 sm:px-4">
      <section className="w-full max-w-6xl bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
        <h2 className="text-2xl font-bold text-red-900 text-center mb-6">All Test Results</h2>

        <SearchControls
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchField={searchField}
          setSearchField={setSearchField}
          onShowPatients={() => setShowModal(true)}
        />

        {loading && <p className="text-center text-red-900 font-semibold">Loading...</p>}
        {error && <p className="text-red-700 font-semibold text-center mb-4">{error}</p>}
        {!loading && filteredResults.length === 0 && !error && (
          <p className="text-center text-gray-600">No results found.</p>
        )}

        {filteredResults.length > 0 && (
          <ResultsTable
            results={filteredResults}
            patients={patients}
            onEdit={setEditData}
            onDelete={handleDelete}
          />
        )}
      </section>

      <EditModal
        editData={editData}
        setEditData={setEditData}
        onSave={handleSaveEdit}
        onCancel={() => setEditData(null)}
      />

      <PatientsModal
        show={showModal}
        onClose={() => setShowModal(false)}
        patients={allPatients}
        loading={loadingPatients}
        testPatientIds={testPatientIds}
        searchTerm={patientSearchTerm}
        setSearchTerm={setPatientSearchTerm}
        onDeletePatient={handleDeletePatient}
      />
    </div>
  );
}