
import { useRef, useState } from "react";
import Webcam from "react-webcam";
import {
  Camera,
  RefreshCcw,
  Loader2,
  Droplets,
  Recycle,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { analyzeWasteImage, WasteAnalysis } from "@/services/gemini";
// ⚠️ adjust path ONLY if your gemini file location differs

export default function SmartCamera() {
  const webcamRef = useRef<Webcam>(null);

  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<WasteAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  // ================= CAPTURE =================
  const capture = async () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) return;

    setImage(screenshot);
    setLoading(true);

    try {
      const analysis = await analyzeWasteImage(screenshot);
      setResult(analysis);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const retake = () => {
    setImage(null);
    setResult(null);
  };

  // ================= SEGREGATION LOGIC =================
  const getSegregation = () => {
    if (!result) return null;

    const material = result.material.toLowerCase();

    if (material.includes("organic") || material.includes("food")) {
      return {
        label: "Wet Waste",
        color: "bg-green-100 text-green-700",
        icon: <Droplets size={20} />,
      };
    }

    if (material.includes("electronic") || material.includes("battery")) {
      return {
        label: "E-Waste",
        color: "bg-yellow-100 text-yellow-700",
        icon: <Zap size={20} />,
      };
    }

    if (
      material.includes("chemical") ||
      material.includes("medical") ||
      material.includes("hazard")
    ) {
      return {
        label: "Hazardous Waste",
        color: "bg-red-100 text-red-700",
        icon: <AlertTriangle size={20} />,
      };
    }

    return {
      label: "Dry Waste",
      color: "bg-blue-100 text-blue-700",
      icon: <Recycle size={20} />,
    };
  };

  const segregation = getSegregation();

  // ================= UI =================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100 p-6">
      <div className="backdrop-blur-xl bg-white/70 border border-white/40 shadow-2xl rounded-3xl w-full max-w-3xl p-8 space-y-6">

        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-emerald-700 flex justify-center items-center gap-3">
          <Camera size={30} />
          EcoFy Smart Segregation Scanner
        </h2>

        {/* ================= CAMERA ================= */}
        {!image ? (
          <>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded-2xl border-4 border-emerald-200 shadow-md"
            />

            <button
              onClick={capture}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-lg transition"
            >
              Capture & Analyze
            </button>
          </>
        ) : (
          <>
            <img
              src={image}
              alt="Captured"
              className="rounded-2xl border-4 border-emerald-200 shadow-md"
            />

            {/* Loading */}
            {loading && (
              <div className="flex justify-center items-center gap-3 text-emerald-600 text-lg">
                <Loader2 className="animate-spin" />
                Analyzing Waste with AI...
              </div>
            )}

            {/* ================= RESULT ================= */}
            {!loading && result && (
              <div className="space-y-6">

                {/* Item */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{result.itemName}</h3>
                  <p className="text-gray-600">
                    Material: {result.material}
                  </p>
                </div>

                {/* Segregation Badge */}
                {segregation && (
                  <div
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-lg ${segregation.color}`}
                  >
                    {segregation.icon}
                    {segregation.label}
                  </div>
                )}

                {/* Confidence */}
                <div>
                  <p className="font-medium mb-1 text-center">
                    AI Confidence: {(result.confidence * 100).toFixed(0)}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-emerald-500 h-4 rounded-full transition-all duration-700"
                      style={{ width: `${result.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* ===== REUSE IDEAS ===== */}
                <div className="bg-blue-50 p-5 rounded-2xl">
                  <h4 className="font-bold text-blue-800 mb-2">
                    ♻️ Reuse Ideas
                  </h4>
                  <ul className="list-disc list-inside text-gray-700">
                    {result.reuse.ideas.map((idea, idx) => (
                      <li key={idx}>{idea}</li>
                    ))}
                  </ul>
                </div>

                {/* ===== RECYCLE INFO ===== */}
                <div className="bg-green-50 p-5 rounded-2xl">
                  <h4 className="font-bold text-green-800 mb-2">
                    🔄 Recycling Instructions
                  </h4>
                  <ul className="list-disc list-inside text-gray-700">
                    {result.recycle.instructions.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                {/* Carbon */}
                <div className="bg-emerald-50 p-5 rounded-2xl">
                  <p className="font-semibold text-emerald-800">
                    🌍 Carbon Saved: {result.carbonSaved}
                  </p>
                  <p className="text-gray-600 mt-2">{result.funFact}</p>
                </div>
              </div>
            )}

            {/* Retake */}
            <button
              onClick={retake}
              className="w-full flex justify-center items-center gap-2 bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-medium"
            >
              <RefreshCcw size={18} />
              Retake
            </button>
          </>
        )}
      </div>
    </div>
  );
}

