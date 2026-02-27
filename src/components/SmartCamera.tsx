
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
  Leaf,
  Sparkles,
  Lightbulb,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import { analyzeWasteImage, WasteAnalysis } from "@/services/gemini";

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
        badgeBg: "bg-green-100 text-green-700 border-green-200",
        barColor: "bg-gradient-to-r from-green-400 to-emerald-500",
        cardBg: "bg-green-50 border-green-100",
        icon: <Droplets size={18} className="text-green-600" />,
        iconBg: "bg-green-100",
      };
    }

    if (material.includes("electronic") || material.includes("battery")) {
      return {
        label: "E-Waste",
        badgeBg: "bg-amber-100 text-amber-700 border-amber-200",
        barColor: "bg-gradient-to-r from-amber-400 to-orange-500",
        cardBg: "bg-amber-50 border-amber-100",
        icon: <Zap size={18} className="text-amber-600" />,
        iconBg: "bg-amber-100",
      };
    }

    if (
      material.includes("chemical") ||
      material.includes("medical") ||
      material.includes("hazard")
    ) {
      return {
        label: "Hazardous Waste",
        badgeBg: "bg-red-100 text-red-700 border-red-200",
        barColor: "bg-gradient-to-r from-red-400 to-rose-500",
        cardBg: "bg-red-50 border-red-100",
        icon: <AlertTriangle size={18} className="text-red-600" />,
        iconBg: "bg-red-100",
      };
    }

    return {
      label: "Dry Waste",
      badgeBg: "bg-blue-100 text-blue-700 border-blue-200",
      barColor: "bg-gradient-to-r from-blue-400 to-indigo-500",
      cardBg: "bg-blue-50 border-blue-100",
      icon: <Recycle size={18} className="text-blue-600" />,
      iconBg: "bg-blue-100",
    };
  };

  const segregation = getSegregation();
  const confidencePct = result ? Math.round(result.confidence * 100) : 0;

  // ================= UI =================
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 relative overflow-hidden">

      {/* ── Decorative floating eco elements (same style as LandingPage) ── */}

      {/* Corner clusters */}
      <div className="absolute top-0 left-0 text-5xl opacity-20 -rotate-12 select-none pointer-events-none">
        🌿🍃🌱
      </div>
      <div className="absolute top-8 right-16 text-4xl opacity-15 rotate-45 select-none pointer-events-none">
        🌿
      </div>
      <div className="absolute bottom-10 left-8 text-5xl opacity-20 select-none pointer-events-none">
        🌱🌿
      </div>
      <div className="absolute bottom-8 right-10 text-3xl opacity-15 -rotate-12 select-none pointer-events-none">
        ♻️
      </div>

      {/* Floating / bouncing leaves */}
      <div className="absolute top-1/4 left-6 text-3xl opacity-30 animate-bounce select-none pointer-events-none" style={{ animationDelay: '0s', animationDuration: '3s' }}>
        🍃
      </div>
      <div className="absolute top-1/3 right-8 text-2xl opacity-20 animate-bounce select-none pointer-events-none" style={{ animationDelay: '1s', animationDuration: '4s' }}>
        🌿
      </div>
      <div className="absolute bottom-1/3 left-14 text-2xl opacity-25 animate-bounce select-none pointer-events-none" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}>
        🌱
      </div>
      <div className="absolute top-2/3 right-12 text-2xl opacity-20 animate-bounce select-none pointer-events-none" style={{ animationDelay: '1.5s', animationDuration: '4.5s' }}>
        🍃
      </div>

      {/* Soft green blur blobs */}
      <div className="absolute top-16 left-1/3 w-36 h-36 bg-green-200 rounded-full blur-3xl opacity-25 pointer-events-none" />
      <div className="absolute bottom-24 right-1/4 w-48 h-48 bg-emerald-200 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-4 w-24 h-24 bg-green-300 rounded-full blur-2xl opacity-20 pointer-events-none" />

      {/* Bottom green strip */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 opacity-50 pointer-events-none" />
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Hero Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4 text-sm font-medium">
            <Camera size={15} />
            AI-Powered Waste Scanner
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Smart Segregation Scanner
          </h1>
          <p className="text-gray-500 text-base">
            Point your camera at any waste item for instant AI analysis
          </p>
        </div>

        {/* ── Main Card ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
          <div className="p-6 space-y-5">

            {/* ── CAMERA / IMAGE ── */}
            {!image ? (
              <>
                {/* Webcam */}
                <div className="relative rounded-xl overflow-hidden border-2 border-green-100 shadow-inner">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full block rounded-xl"
                  />
                  {/* Live pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200 shadow-sm">
                    <span
                      className="w-2 h-2 rounded-full bg-green-500"
                      style={{ animation: "gentle-pulse 2s ease-in-out infinite" }}
                    />
                    LIVE
                  </div>
                </div>

                {/* Capture button */}
                <button
                  onClick={capture}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3.5 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 text-base"
                >
                  <Sparkles size={18} />
                  Capture &amp; Analyze
                  <Camera size={18} />
                </button>
              </>
            ) : (
              <>
                {/* Captured image */}
                <div className="relative rounded-xl overflow-hidden border-2 border-green-100 shadow-inner">
                  <img
                    src={image}
                    alt="Captured"
                    className="w-full block rounded-xl"
                  />
                  {/* Scan shimmer during loading */}
                  {loading && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          height: "3px",
                          background:
                            "linear-gradient(90deg, transparent, #22c55e, #10b981, transparent)",
                          animation: "scanDown 2s linear infinite",
                          boxShadow: "0 0 12px 3px rgba(34,197,94,0.4)",
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* ── Loading State ── */}
                {loading && (
                  <div className="flex flex-col items-center gap-3 py-5 bg-green-50 rounded-xl border border-green-100">
                    <Loader2 size={30} className="text-emerald-500 animate-spin" />
                    <div className="text-center">
                      <p className="font-semibold text-gray-700 text-sm">Analyzing with AI...</p>
                      <p className="text-xs text-gray-400 mt-0.5">Identifying material &amp; waste category</p>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full bg-emerald-400"
                          style={{ animation: `gentle-pulse 1.4s ease-in-out ${i * 0.22}s infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Results ── */}
                {!loading && result && (
                  <div className="space-y-4 fade-in">

                    {/* Item name + material */}
                    <div className="text-center py-4 px-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                      <h2 className="text-2xl font-bold text-gray-800 mb-1">{result.itemName}</h2>
                      <span className="inline-block bg-white text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200 shadow-sm">
                        {result.material}
                      </span>
                    </div>

                    {/* Segregation badge */}
                    {segregation && (
                      <div className={`flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl border font-semibold text-base ${segregation.badgeBg}`}>
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${segregation.iconBg}`}>
                          {segregation.icon}
                        </span>
                        {segregation.label}
                      </div>
                    )}

                    {/* Confidence bar */}
                    <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                          <BarChart3 size={14} className="text-green-500" />
                          AI Confidence
                        </div>
                        <span className="text-sm font-bold text-gray-700">{confidencePct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${segregation?.barColor ?? "bg-gradient-to-r from-green-400 to-emerald-500"}`}
                          style={{ width: `${confidencePct}%` }}
                        />
                      </div>
                    </div>

                    {/* Reuse Ideas */}
                    <div className="bg-blue-50 rounded-xl border border-blue-100 px-5 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Lightbulb size={14} className="text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-blue-800 text-sm">♻️ Reuse Ideas</h4>
                      </div>
                      <ul className="space-y-1.5">
                        {result.reuse.ideas.map((idea, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                            {idea}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recycling Instructions */}
                    <div className="bg-green-50 rounded-xl border border-green-100 px-5 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                          <RotateCcw size={14} className="text-green-600" />
                        </div>
                        <h4 className="font-semibold text-green-800 text-sm">🔄 Recycling Instructions</h4>
                      </div>
                      <ol className="space-y-2">
                        {result.recycle.instructions.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                            <span className="flex-shrink-0 w-5 h-5 rounded-md bg-white border border-green-200 text-green-700 text-xs font-bold flex items-center justify-center shadow-sm">
                              {idx + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Carbon Saved + Fun Fact */}
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl px-5 py-4 text-white">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Leaf size={15} className="text-green-100" />
                        <span className="font-semibold text-sm">
                          Carbon Saved:&nbsp;
                          <span className="text-white font-bold">{result.carbonSaved}</span>
                        </span>
                      </div>
                      <p className="text-xs text-green-100 leading-relaxed">
                        💡 {result.funFact}
                      </p>
                    </div>
                  </div>
                )}

                {/* Retake button */}
                <button
                  onClick={retake}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-3 rounded-xl transition-all duration-200 text-sm hover:-translate-y-0.5 active:scale-95"
                >
                  <RefreshCcw size={15} />
                  Retake Photo
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-gray-400 mt-5">
          Powered by Gemini AI · EcoFy Smart Waste Scanner
        </p>
      </div>

      <style>{`
        @keyframes scanDown {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
