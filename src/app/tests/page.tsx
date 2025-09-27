"use client";
import { useState } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

type TestData = {
  patientId: string;
  malaria: string;
  genotype: string;
};

export default function Tests() {
  const [formData, setFormData] = useState<TestData>({
    patientId: "",
    malaria: "",
    genotype: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submit
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.patientId || !formData.malaria || !formData.genotype) {
      setMessage({ type: "error", text: "⚠️ Please fill in all required fields." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await addDoc(collection(db, "tests"), {
        patientId: formData.patientId,
        malaria: formData.malaria,
        genotype: formData.genotype,
        dateTaken: new Date().toISOString(),
      });
      setMessage({ type: "success", text: "✅ Test result submitted successfully!" });
      setFormData({ patientId: "", malaria: "", genotype: "" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "❌ Failed to save test result." });
    }
    setLoading(false);
  };

  // Button handler to record test now
  const handleRecordNow = () => {
    handleSubmit();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center py-8 px-2 sm:px-4">
      <section className="w-full max-w-lg bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
        <h2 className="text-2xl font-bold text-red-900 text-center mb-6">Record Test Result</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Patient ID */}
          <div>
            <label htmlFor="patientId" className="block font-semibold text-red-800 mb-1">
              Patient ID *
            </label>
            <input
              type="text"
              id="patientId"
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
              placeholder="Enter patient ID"
            />
          </div>

          // ...existing code...

          {/* Malaria Test */}
          <div>
            <label htmlFor="malaria" className="block font-semibold text-red-800 mb-1">
              🦠 Malaria Test *
            </label>
            <small className="block mb-1 text-gray-500">Select result</small>
            <select
              id="malaria"
              name="malaria"
              value={formData.malaria}
              onChange={handleChange}
              required
              className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
            >
              <option value="">Select...</option>
              <option value="Negative">Negative</option>
              <option value="Positive">Positive</option>
              <option value="Inconclusive">Inconclusive</option>
            </select>
          </div>

          {/* Genotype Test */}
          <div>
            <label htmlFor="genotype" className="block font-semibold text-red-800 mb-1">
              🧬 Genotype Test *
            </label>
            <small className="block mb-1 text-gray-500">Select genotype</small>
            <select
              id="genotype"
              name="genotype"
              value={formData.genotype}
              onChange={handleChange}
              required
              className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
            >
              <option value="">Select...</option>
              <option value="AA">AA (Normal)</option>
              <option value="AS">AS (Carrier)</option>
              <option value="AC">AC (Carrier)</option>
              <option value="SS">SS (Sickle Cell)</option>
              <option value="SC">SC (Sickle Cell)</option>
              <option value="CC">CC (Rare)</option>
            </select>
          </div>

          {/* Record Test Now Button */}
          <button
            type="button"
            onClick={handleRecordNow}
            className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white py-3 rounded-lg font-bold hover:scale-105 transition"
            disabled={loading}
          >
            {loading ? "Recording..." : "Record Test Now"}
          </button>
        </form>

        {/* Message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg font-semibold text-center ${
              message.type === "success"
                ? "bg-green-100 text-green-700 border border-green-400"
                : "bg-red-100 text-red-700 border border-red-400"
            }`}
          >
            {message.text}
          </div>
        )}
      </section>
    </div>
  );
}
