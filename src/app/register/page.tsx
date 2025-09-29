"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

type PatientData = {
  patientId: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
};

export default function RegisterPatient() {
  const [formData, setFormData] = useState<PatientData>({
    patientId: "",
    name: "",
    dob: "",
    gender: "",
    phone: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔑 Access Key State
  const [showModal, setShowModal] = useState(true);
  const [keyInput, setKeyInput] = useState("");

  useEffect(() => {
    // If already unlocked in this session, skip modal
    const hasAccess = sessionStorage.getItem("hasAccess");
    if (hasAccess === "true") {
      setShowModal(false);
    }
  }, []);

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctKey = "savgen25"; // 🔑 change this to your secret key
    if (keyInput === correctKey) {
      sessionStorage.setItem("hasAccess", "true");
      setShowModal(false);
    } else {
      alert("❌ Wrong key, try again.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.name || !formData.dob || !formData.gender) {
      setMessage({ type: "error", text: "⚠️ Please fill in all required fields." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await addDoc(collection(db, "patients"), formData);
      setMessage({ type: "success", text: "✅ Patient registered successfully!" });
      setFormData({ patientId: "", name: "", dob: "", gender: "", phone: "" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "❌ Failed to register patient." });
    }
    setLoading(false);
  };

  // Optionally: Generate Patient ID
  const generateId = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";

    const letter = letters[Math.floor(Math.random() * letters.length)];
    const numberPart = Array.from({ length: 3 }, () => digits[Math.floor(Math.random() * 10)]).join("");

    const pos = Math.floor(Math.random() * 4);
    const id = numberPart.slice(0, pos) + letter + numberPart.slice(pos);

    setFormData((prev) => ({ ...prev, patientId: id }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center py-8 px-2 sm:px-4">
      {/* 🔑 Access Key Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-300 max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold text-red-900 mb-4">Enter Access Key</h2>
            <form onSubmit={handleKeySubmit} className="space-y-4">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter secret key"
                className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
                required
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white py-3 rounded-lg font-bold hover:scale-105 transition"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Actual Register Form */}
      {!showModal && (
        <section className="w-full max-w-lg bg-white/95 p-6 sm:p-8 rounded-2xl shadow-xl border border-red-200">
          <h2 className="text-2xl font-bold text-red-900 text-center mb-6">Register Patient</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Patient ID with Generate Button */}
            <div>
              <label htmlFor="patientId" className="block font-semibold text-red-800 mb-1">
                Patient ID *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="patientId"
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleChange}
                  className="flex-1 p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
                  placeholder="Enter or generate ID"
                />
                <button
                  type="button"
                  onClick={generateId}
                  className="bg-gradient-to-r from-red-700 to-red-900 text-white px-4 py-2 rounded-lg font-semibold hover:scale-105 transition"
                >
                  Generate
                </button>
              </div>
            </div>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block font-semibold text-red-800 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
                placeholder="Enter full name"
                required
              />
            </div>
            {/* DOB */}
            <div>
              <label htmlFor="dob" className="block font-semibold text-red-800 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
                required
              />
            </div>
            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block font-semibold text-red-800 mb-1">
                Gender *
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
                required
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block font-semibold text-red-800 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg bg-rose-50 border-rose-200 focus:ring-2 focus:ring-red-400 text-black font-bold placeholder:text-gray-700"
                placeholder="Enter phone number (optional)"
              />
            </div>
            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white py-3 rounded-lg font-bold hover:scale-105 transition disabled:opacity-60"
            >
              {loading ? "Registering..." : "Register Patient"}
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
      )}
    </div>
  );
}
