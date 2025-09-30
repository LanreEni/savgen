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
  lastUpdated?: string;
  cardRecorded?: boolean;
};

type PatientData = {
  patientId: string;
  name: string;
  dob: string;
  gender: string;
  phone?: string;
  bloodGroup?: string;
};

type SortField = "date" | "name" | "patientId" | "genotype";
type EditData = TestData & PatientData;

type DuplicateGroup = {
  patientId: string;
  patientName: string;
  records: TestData[];
};

// Constants
const ACCESS_KEY = "admin25";
const ACCESS_STORAGE_KEY = "accessGranted";

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

// Export to CSV (Excel-compatible)
const exportToCSV = (results: TestData[], patients: Record<string, PatientData>) => {
  const headers = ["Patient ID", "Name", "DOB", "Age", "Gender", "Phone", "Blood Group", "Malaria", "Genotype", "Card Recorded", "Date Taken", "Time"];
  
  const rows = results.map(rec => {
    const patient = patients[rec.patientId];
    const age = calculateAge(patient?.dob);
    const date = rec.dateTaken ? new Date(rec.dateTaken).toLocaleDateString() : "N/A";
    const time = rec.dateTaken ? new Date(rec.dateTaken).toLocaleTimeString() : "N/A";
    
    return [
      rec.patientId,
      patient?.name || "N/A",
      patient?.dob ? new Date(patient.dob).toLocaleDateString() : "N/A",
      age,
      patient?.gender || "N/A",
      patient?.phone || "N/A",
      patient?.bloodGroup || rec.bloodGroup || "N/A",
      rec.malaria || "N/A",
      rec.genotype || "N/A",
      rec.cardRecorded ? "Yes" : "No",
      date,
      time
    ];
  });
  
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `test_results_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export to PDF (basic HTML to PDF using print)
const exportToPDF = () => {
  window.print();
};

// Components
const AccessKeyModal = ({ keyInput, setKeyInput, handleLogin }: {
  keyInput: string;
  setKeyInput: (value: string) => void;
  handleLogin: () => void;
}) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-red-900">
        Enter Access Key
      </h2>
      <input
        type="password"
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleLogin()}
        placeholder="Access Key"
        className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4 focus:border-red-500 focus:outline-none"
      />
      <button
        onClick={handleLogin}
        className="w-full bg-red-700 text-white py-3 rounded-lg font-bold hover:bg-red-800 transition-colors"
      >
        Submit
      </button>
    </div>
  </div>
);

const DuplicatesModal = ({
  show,
  onClose,
  duplicates,
  onMerge,
  onMergeAll,
  patients,
}: {
  show: boolean;
  onClose: () => void;
  duplicates: DuplicateGroup[];
  onMerge: (group: DuplicateGroup) => void;
  onMergeAll: () => void;
  patients: Record<string, PatientData>;
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-red-900">Duplicate Records Found</h3>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Close
          </button>
        </div>

        {duplicates.length === 0 ? (
          <p className="text-center text-green-700 font-semibold py-8 text-lg">
            No duplicate records found!
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div>
                <p className="font-semibold text-gray-700">
                  Found {duplicates.length} patient(s) with multiple test records
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Click "Merge All Duplicates" to automatically merge all at once
                </p>
              </div>
              <button
                onClick={onMergeAll}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors"
              >
                Merge All Duplicates
              </button>
            </div>

            {duplicates.map((group, idx) => (
              <div key={idx} className="border-2 border-rose-200 rounded-lg p-4 bg-rose-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-red-900 text-lg">
                      {group.patientName} (ID: {group.patientId})
                    </p>
                    <p className="text-sm text-gray-600">
                      {group.records.length} records found
                    </p>
                  </div>
                  <button
                    onClick={() => onMerge(group)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                  >
                    Merge This Patient
                  </button>
                </div>
                <div className="space-y-2">
                  {group.records.map((rec, recIdx) => (
                    <div key={recIdx} className="text-sm bg-white p-3 rounded-lg border border-rose-300">
                      <span className="font-semibold">Record {recIdx + 1}:</span> Malaria: {rec.malaria || "—"} | Genotype: {rec.genotype || "—"} | Blood: {rec.bloodGroup || "—"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SearchControls = ({
  searchTerm,
  setSearchTerm,
  sortField,
  setSortField,
  onExportCSV,
  onExportPDF,
  onFindDuplicates,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onFindDuplicates: () => void;
}) => (
  <div className="space-y-4 mb-6">
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search across all fields..."
        className="flex-1 p-3 border-2 rounded-lg bg-white border-gray-300 focus:ring-2 focus:ring-red-400 focus:border-red-400 text-gray-900"
      />
      <select
        value={sortField}
        onChange={(e) => setSortField(e.target.value as SortField)}
        className="p-3 border-2 rounded-lg bg-white border-gray-300 focus:ring-2 focus:ring-red-400 text-gray-900 min-w-[180px]"
      >
        <option value="date">Sort by Date</option>
        <option value="name">Sort by Name (A-Z)</option>
        <option value="patientId">Sort by Patient ID</option>
        <option value="genotype">Sort by Genotype</option>
      </select>
    </div>
    
    <div className="flex flex-wrap gap-2">
      <button
        onClick={onFindDuplicates}
        className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors shadow-md"
      >
        Find & Merge Duplicates
      </button>
      <button
        onClick={onExportCSV}
        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
      >
        Export Excel
      </button>
      <button
        onClick={onExportPDF}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
      >
        Export PDF
      </button>
    </div>
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

  const inputFields: Array<{ key: keyof Omit<EditData, 'id' | 'cardRecorded' | 'lastUpdated'>; label: string; type: string }> = [
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <h3 className="text-2xl font-bold mb-4 text-red-900">Edit Record</h3>


        {inputFields.map(({ key, label, type }) => (
  <div key={key} className="mb-3">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      value={(editData[key as keyof EditData] || "") as string}
      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
      className="w-full border-2 border-gray-300 p-2 rounded-lg focus:border-red-400 focus:outline-none"
      placeholder={label}
    />
  </div>
))}

        <div className="mb-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={editData.cardRecorded || false}
              onChange={(e) => setEditData({ ...editData, cardRecorded: e.target.checked })}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm font-medium text-gray-700">Card Recorded</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Main component
export default function AllResults() {
  const [accessGranted, setAccessGranted] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [allResults, setAllResults] = useState<TestData[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [editData, setEditData] = useState<EditData | null>(null);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem(ACCESS_STORAGE_KEY);
    if (stored === "true") {
      setAccessGranted(true);
    }
  }, []);

  useEffect(() => {
    if (accessGranted) {
      fetchAllResults();
    }
  }, [accessGranted]);

  const handleLogin = useCallback(() => {
    if (keyInput === ACCESS_KEY) {
      setAccessGranted(true);
      sessionStorage.setItem(ACCESS_STORAGE_KEY, "true");
    } else {
      alert("Invalid Key");
    }
  }, [keyInput]);

  const fetchAllResults = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const testsSnap = await getDocs(
        query(collection(db, "tests"), orderBy("dateTaken", "desc"))
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
      setError("Failed to fetch results.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Universal search across all fields
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return allResults;
    
    const term = searchTerm.toLowerCase();
    return allResults.filter((rec) => {
      const patient = patients[rec.patientId];
      
      return (
        rec.patientId?.toLowerCase().includes(term) ||
        patient?.name?.toLowerCase().includes(term) ||
        rec.genotype?.toLowerCase().includes(term) ||
        rec.malaria?.toLowerCase().includes(term) ||
        rec.bloodGroup?.toLowerCase().includes(term) ||
        patient?.phone?.toLowerCase().includes(term)
      );
    });
  }, [allResults, patients, searchTerm]);

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];
    
    switch (sortField) {
      case "name":
        sorted.sort((a, b) => {
          const nameA = patients[a.patientId]?.name || "";
          const nameB = patients[b.patientId]?.name || "";
          return nameA.localeCompare(nameB);
        });
        break;
      case "patientId":
        sorted.sort((a, b) => a.patientId.localeCompare(b.patientId));
        break;
      case "genotype":
        sorted.sort((a, b) => (a.genotype || "").localeCompare(b.genotype || ""));
        break;
      case "date":
      default:
        sorted.sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime());
    }
    
    return sorted;
  }, [filteredResults, sortField, patients]);

  // Group results by date
  const groupedResults = useMemo(() => {
    const groups: Record<string, TestData[]> = {};
    
    sortedResults.forEach((result) => {
      const date = result.dateTaken
        ? new Date(result.dateTaken).toLocaleDateString()
        : "Unknown Date";
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(result);
    });
    
    return groups;
  }, [sortedResults]);

  // Sort dates descending
  const sortedDates = useMemo(() => {
    return Object.keys(groupedResults).sort((a, b) => {
      if (a === "Unknown Date") return 1;
      if (b === "Unknown Date") return -1;
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [groupedResults]);

  // Find duplicates
  const findDuplicates = useCallback(() => {
    const patientGroups: Record<string, TestData[]> = {};
    
    allResults.forEach(test => {
      if (!patientGroups[test.patientId]) {
        patientGroups[test.patientId] = [];
      }
      patientGroups[test.patientId].push(test);
    });
    
    const dupes: DuplicateGroup[] = [];
    Object.entries(patientGroups).forEach(([patientId, records]) => {
      if (records.length > 1) {
        dupes.push({
          patientId,
          patientName: patients[patientId]?.name || "Unknown",
          records
        });
      }
    });
    
    setDuplicates(dupes);
    setShowDuplicatesModal(true);
  }, [allResults, patients]);

  // Merge duplicate records
  const mergeDuplicates = useCallback(async (group: DuplicateGroup) => {
    if (!confirm(`Merge ${group.records.length} records for ${group.patientName}?`)) return;
    
    try {
      // Combine all values, preferring non-empty ones
      const merged = group.records.reduce((acc, rec) => ({
        malaria: acc.malaria || rec.malaria,
        genotype: acc.genotype || rec.genotype,
        bloodGroup: acc.bloodGroup || rec.bloodGroup,
        dateTaken: acc.dateTaken || rec.dateTaken,
        cardRecorded: acc.cardRecorded || rec.cardRecorded,
      }), {} as Partial<TestData>);
      
      // Remove undefined values (Firestore doesn't accept undefined)
      const updateData: any = { lastUpdated: new Date().toISOString() };
      if (merged.malaria) updateData.malaria = merged.malaria;
      if (merged.genotype) updateData.genotype = merged.genotype;
      if (merged.bloodGroup) updateData.bloodGroup = merged.bloodGroup;
      if (merged.dateTaken) updateData.dateTaken = merged.dateTaken;
      if (merged.cardRecorded !== undefined) updateData.cardRecorded = merged.cardRecorded;
      
      // Keep the first record, update it
      const keepRecord = group.records[0];
      await updateDoc(doc(db, "tests", keepRecord.id), updateData);
      
      // Delete the rest
      const deletePromises = group.records.slice(1).map(rec =>
        deleteDoc(doc(db, "tests", rec.id))
      );
      await Promise.all(deletePromises);
      
      // Refresh data
      await fetchAllResults();
      alert(`Successfully merged ${group.records.length} records!`);
      setShowDuplicatesModal(false);
    } catch (err) {
      console.error("Merge failed:", err);
      alert("Failed to merge records");
    }
  }, [fetchAllResults]);

  // Merge ALL duplicates at once
  const mergeAllDuplicates = useCallback(async () => {
    if (!confirm(`Merge all ${duplicates.length} patients with duplicate records? This cannot be undone.`)) return;
    
    try {
      let successCount = 0;
      
      for (const group of duplicates) {
        // Combine all values
        const merged = group.records.reduce((acc, rec) => ({
          malaria: acc.malaria || rec.malaria,
          genotype: acc.genotype || rec.genotype,
          bloodGroup: acc.bloodGroup || rec.bloodGroup,
          dateTaken: acc.dateTaken || rec.dateTaken,
          cardRecorded: acc.cardRecorded || rec.cardRecorded,
        }), {} as Partial<TestData>);
        
        // Remove undefined values (Firestore doesn't accept undefined)
        const updateData: any = { lastUpdated: new Date().toISOString() };
        if (merged.malaria) updateData.malaria = merged.malaria;
        if (merged.genotype) updateData.genotype = merged.genotype;
        if (merged.bloodGroup) updateData.bloodGroup = merged.bloodGroup;
        if (merged.dateTaken) updateData.dateTaken = merged.dateTaken;
        if (merged.cardRecorded !== undefined) updateData.cardRecorded = merged.cardRecorded;
        
        // Keep first record, update it
        const keepRecord = group.records[0];
        await updateDoc(doc(db, "tests", keepRecord.id), updateData);
        
        // Delete the rest
        const deletePromises = group.records.slice(1).map(rec =>
          deleteDoc(doc(db, "tests", rec.id))
        );
        await Promise.all(deletePromises);
        
        successCount++;
      }
      
      // Refresh data
      await fetchAllResults();
      alert(`Successfully merged ${successCount} patients!`);
      setShowDuplicatesModal(false);
    } catch (err) {
      console.error("Merge all failed:", err);
      alert("Failed to merge all records");
    }
  }, [duplicates, fetchAllResults]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    
    try {
      await deleteDoc(doc(db, "tests", id));
      setAllResults((prev) => prev.filter((rec) => rec.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete record");
    }
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editData) return;

    try {
      const { id, patientId, malaria, genotype, bloodGroup, dateTaken, name, dob, gender, phone, cardRecorded } = editData;
      
      await updateDoc(doc(db, "tests", id), { 
        patientId, 
        malaria, 
        genotype, 
        bloodGroup, 
        dateTaken,
        cardRecorded: cardRecorded || false,
        lastUpdated: new Date().toISOString()
      });
      
      await setDoc(
        doc(db, "patients", patientId),
        { patientId, name, dob, gender, phone, bloodGroup },
        { merge: true }
      );

      setAllResults((prev) => prev.map((rec) => 
        rec.id === id ? { ...editData, lastUpdated: new Date().toISOString() } : rec
      ));
      setPatients((prev) => ({
        ...prev,
        [patientId]: { patientId, name, dob, gender, phone, bloodGroup }
      }));
      
      setEditData(null);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update record");
    }
  }, [editData]);

  const totalTests = allResults.length;

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
      <section className="w-full max-w-7xl bg-white/95 p-6 sm:p-8 rounded-2xl shadow-2xl border border-red-200">
        <h2 className="text-3xl font-bold text-red-900 text-center mb-6">All Test Results</h2>

        <div className="mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border-2 border-blue-200 shadow-md">
            <h3 className="text-sm text-blue-700 font-semibold mb-1">Total Test Records</h3>
            <p className="text-4xl font-bold text-blue-900">{totalTests}</p>
          </div>
        </div>

        <SearchControls
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortField={sortField}
          setSortField={setSortField}
          onExportCSV={() => exportToCSV(sortedResults, patients)}
          onExportPDF={exportToPDF}
          onFindDuplicates={findDuplicates}
        />

        {loading && <p className="text-center text-red-900 font-semibold py-8">Loading...</p>}
        {error && <p className="text-red-700 font-semibold text-center mb-4 bg-red-50 p-4 rounded-lg">{error}</p>}
        {!loading && sortedDates.length === 0 && !error && (
          <p className="text-center text-gray-600 py-8">No results found.</p>
        )}

        {sortedDates.length > 0 && (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="border-2 border-rose-200 rounded-xl overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-red-700 to-red-900 text-white px-5 py-3">
                  <h3 className="text-lg font-bold">
                    {date} ({groupedResults[date].length} tests)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-rose-100 text-red-900 font-bold">
                        {["#", "Patient ID", "Name", "DOB", "Age", "Gender", "Phone", "Blood Group", "Malaria", "Genotype", "Card", "Time", "Last Updated", "Action"].map((header) => (
                          <th key={header} className="border border-rose-300 px-3 py-2 text-center text-sm">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedResults[date].map((rec, idx) => {
                        const patient = patients[rec.patientId];
                        const age = calculateAge(patient?.dob);
                        const testTime = rec.dateTaken ? new Date(rec.dateTaken).toLocaleTimeString() : "N/A";
                        const lastUpdated = rec.lastUpdated ? new Date(rec.lastUpdated).toLocaleString() : "N/A";
                        
                        return (
                          <tr key={rec.id} className="text-gray-700 text-center hover:bg-rose-50 transition-colors">
                            <td className="border border-rose-300 px-2 py-2 text-sm font-medium">{idx + 1}</td>
                            <td className="border border-rose-300 px-2 py-2 font-semibold text-sm">{rec.patientId}</td>
                            <td className="border border-rose-300 px-2 py-2 font-medium text-sm">{patient?.name || "N/A"}</td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">
                              {patient?.dob ? new Date(patient.dob).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="border border-rose-300 px-2 py-2 text-sm font-medium">{age}</td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">{patient?.gender || "N/A"}</td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">{patient?.phone || "N/A"}</td>
                            <td className="border border-rose-300 px-2 py-2 text-sm font-medium">
                              {patient?.bloodGroup || rec.bloodGroup || "N/A"}
                            </td>
                            <td className="border border-rose-300 px-2 py-2 text-sm font-semibold">{rec.malaria}</td>
                            <td className="border border-rose-300 px-2 py-2 text-sm font-semibold">{rec.genotype}</td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                                rec.cardRecorded 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {rec.cardRecorded ? "Yes" : "No"}
                              </span>
                            </td>
                            <td className="border border-rose-300 px-2 py-2 text-sm">{testTime}</td>
                            <td className="border border-rose-300 px-2 py-2 text-xs text-gray-600">{lastUpdated}</td>
                            <td className="border border-rose-300 px-2 py-2">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => setEditData({ ...rec, ...patient })}
                                  className="bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600 transition-colors text-xs font-semibold"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(rec.id)}
                                  className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold"
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
              </div>
            ))}
          </div>
        )}
      </section>

      <EditModal
        editData={editData}
        setEditData={setEditData}
        onSave={handleSaveEdit}
        onCancel={() => setEditData(null)}
      />

      <DuplicatesModal
        show={showDuplicatesModal}
        onClose={() => setShowDuplicatesModal(false)}
        duplicates={duplicates}
        onMerge={mergeDuplicates}
        onMergeAll={mergeAllDuplicates}
        patients={patients}
      />
    </div>
  );
}
