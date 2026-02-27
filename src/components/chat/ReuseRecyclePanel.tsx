import { WasteAnalysis } from "@/services/gemini";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { recordRecyclingAction, POINTS_CONFIG } from "@/services/userService";
import {
    Recycle,
    Lightbulb,
    Clock,
    Leaf,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Wrench,
    Sparkles,
    TreePine,
    Zap,
    Award,
    ChevronDown,
    ChevronUp,
    Target,
    Shield,
    TrendingUp,
    Heart,
    Trophy,
    Loader2,
    PartyPopper
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReuseRecyclePanelProps {
    analysis: WasteAnalysis;
}

const ReuseRecyclePanel = ({ analysis }: ReuseRecyclePanelProps) => {
    const { user, userProfile, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"reuse" | "recycle">("reuse");
    const [expandedSection, setExpandedSection] = useState<string | null>("ideas");
    const [recordingAction, setRecordingAction] = useState<string | null>(null);
    const [earnedPoints, setEarnedPoints] = useState<{ pointsEarned: number; carbonSaved: number } | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    const handleActionClick = async (actionType: "reuse" | "recycle" | "upcycle" | "dispose", actionDescription: string) => {
        if (!user) {
            navigate("/auth");
            return;
        }

        setRecordingAction(actionType);
        try {
            const result = await recordRecyclingAction(
                user.uid,
                analysis.itemName,
                actionType,
                actionDescription
            );
            setEarnedPoints(result);
            setShowCelebration(true);
            await refreshProfile();

            // Hide celebration after 3 seconds
            setTimeout(() => setShowCelebration(false), 3000);
        } catch (error) {
            console.error("Error recording action:", error);
        } finally {
            setRecordingAction(null);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "Easy": return "from-green-400 to-emerald-500";
            case "Medium": return "from-yellow-400 to-orange-500";
            case "Hard": return "from-red-400 to-rose-500";
            default: return "from-gray-400 to-gray-500";
        }
    };

    const getDifficultyEmoji = (difficulty: string) => {
        switch (difficulty) {
            case "Easy": return "🟢";
            case "Medium": return "🟡";
            case "Hard": return "🔴";
            default: return "⚪";
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Celebration Overlay */}
            {showCelebration && earnedPoints && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4 animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <PartyPopper className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Amazing! 🎉</h2>
                        <p className="text-gray-600 mb-4">You earned eco-points for taking action!</p>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-4 mb-4">
                            <div className="flex items-center justify-center gap-4">
                                <div className="text-center">
                                    <Trophy className="w-8 h-8 mx-auto mb-1" />
                                    <p className="text-3xl font-bold">+{earnedPoints.pointsEarned}</p>
                                    <p className="text-sm opacity-80">Points</p>
                                </div>
                                <div className="w-px h-16 bg-white/30"></div>
                                <div className="text-center">
                                    <Leaf className="w-8 h-8 mx-auto mb-1" />
                                    <p className="text-3xl font-bold">+{earnedPoints.carbonSaved.toFixed(1)}</p>
                                    <p className="text-sm opacity-80">kg CO₂</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">
                            Total Points: <span className="font-bold text-green-600">{(userProfile?.totalPoints || 0) + earnedPoints.pointsEarned}</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Hero Card - Item Summary */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-500 to-teal-500 rounded-3xl p-6 text-white shadow-2xl">
                {/* Animated background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                <div className="relative z-10">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{analysis.itemName}</h2>
                                <p className="text-white/80 flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                                        {analysis.material}
                                    </span>
                                    <span className="text-sm">
                                        {Math.round(analysis.confidence * 100)}% confident
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-xl border border-white/30`}>
                                {analysis.category === "reuse" && <Recycle className="w-5 h-5" />}
                                {analysis.category === "upcycle" && <TrendingUp className="w-5 h-5" />}
                                {analysis.category === "recycle" && <Recycle className="w-5 h-5" />}
                                {analysis.category === "dispose" && <AlertTriangle className="w-5 h-5" />}
                                <span className="font-semibold capitalize">{analysis.category}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Leaf className="w-4 h-4" />
                                <span className="text-xs text-white/70">Carbon Saved</span>
                            </div>
                            <p className="text-xl font-bold">{analysis.carbonSaved}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs text-white/70">Time Needed</span>
                            </div>
                            <p className="text-xl font-bold">{analysis.reuse.timeNeeded}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Target className="w-4 h-4" />
                                <span className="text-xs text-white/70">Difficulty</span>
                            </div>
                            <p className="text-xl font-bold">{getDifficultyEmoji(analysis.reuse.difficulty)} {analysis.reuse.difficulty}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                <button
                    onClick={() => setActiveTab("reuse")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${activeTab === "reuse"
                        ? "bg-white text-blue-600 shadow-lg"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    <Lightbulb className="w-5 h-5" />
                    Reuse & Upcycle
                </button>
                <button
                    onClick={() => setActiveTab("recycle")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${activeTab === "recycle"
                        ? "bg-white text-green-600 shadow-lg"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    <Recycle className="w-5 h-5" />
                    Recycle & Dispose
                </button>
            </div>

            {/* Content Panels */}
            <div className="relative overflow-hidden">
                {/* Reuse Panel */}
                <div className={`transition-all duration-500 ${activeTab === "reuse" ? "opacity-100 translate-x-0" : "opacity-0 absolute inset-0 -translate-x-full"}`}>
                    <div className="space-y-4">
                        {/* DIY Ideas Section */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 overflow-hidden shadow-lg">
                            <button
                                onClick={() => setExpandedSection(expandedSection === "ideas" ? null : "ideas")}
                                className="w-full flex items-center justify-between p-5 hover:bg-white/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <Wrench className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-blue-900 text-lg">💡 DIY Ideas</h3>
                                        <p className="text-sm text-blue-600">{analysis.reuse.ideas.length} creative ways to reuse</p>
                                    </div>
                                </div>
                                {expandedSection === "ideas" ? <ChevronUp className="w-5 h-5 text-blue-500" /> : <ChevronDown className="w-5 h-5 text-blue-500" />}
                            </button>

                            {expandedSection === "ideas" && (
                                <div className="px-5 pb-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {analysis.reuse.ideas.map((idea, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-4 bg-white/80 backdrop-blur-xl rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-shadow"
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        >
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-gray-800">{idea}</p>
                                            </div>
                                            <button
                                                onClick={() => handleActionClick("reuse", idea)}
                                                disabled={recordingAction !== null}
                                                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                                            >
                                                {recordingAction === "reuse" ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        I Did This!
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Environmental Impact */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <TreePine className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg mb-1">🌍 Environmental Impact</h3>
                                    <p className="text-white/90">{analysis.reuse.environmentalBenefit}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recycle Panel */}
                <div className={`transition-all duration-500 ${activeTab === "recycle" ? "opacity-100 translate-x-0" : "opacity-0 absolute inset-0 translate-x-full"}`}>
                    <div className="space-y-4">
                        {/* Recycling Status Banner */}
                        <div className={`rounded-2xl p-5 ${analysis.recycle.canRecycle ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-orange-500 to-amber-600"} text-white shadow-lg`}>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                                    {analysis.recycle.canRecycle ? (
                                        <CheckCircle2 className="w-8 h-8" />
                                    ) : (
                                        <AlertTriangle className="w-8 h-8" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold">
                                        {analysis.recycle.canRecycle ? "✅ Recyclable!" : "⚠️ Special Disposal Required"}
                                    </h3>
                                    <p className="text-white/80">
                                        {analysis.recycle.canRecycle
                                            ? "This item can be recycled through standard programs"
                                            : "This item needs special handling"
                                        }
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleActionClick("recycle", "Properly recycled this item")}
                                    disabled={recordingAction !== null}
                                    className="flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all border border-white/30 disabled:opacity-50"
                                >
                                    {recordingAction === "recycle" ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            I Recycled It!
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Step-by-Step Instructions */}
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-green-200 p-5 shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Zap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-green-900 text-lg">📋 Step-by-Step Guide</h3>
                                    <p className="text-sm text-green-600">Follow these steps for proper disposal</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {analysis.recycle.instructions.map((instruction, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-4 bg-white rounded-xl p-4 border border-green-100 shadow-sm"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-700 pt-2">{instruction}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Safety & Warnings Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Safety Tips */}
                            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-yellow-200 p-5 shadow-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-amber-900">⚡ Safety Tips</h3>
                                </div>
                                <ul className="space-y-2">
                                    {analysis.recycle.safetyTips.map((tip, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm text-amber-900 bg-white/60 p-3 rounded-lg">
                                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* What NOT to Do */}
                            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200 p-5 shadow-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-rose-500 rounded-xl flex items-center justify-center">
                                        <XCircle className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-red-900">🚫 Avoid These</h3>
                                </div>
                                <ul className="space-y-2">
                                    {analysis.recycle.doNot.map((item, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm text-red-900 bg-white/60 p-3 rounded-lg">
                                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fun Fact Footer */}
            <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">🧠 Did You Know?</h3>
                        <p className="text-white/90">{analysis.funFact}</p>
                    </div>
                </div>
            </div>

            {/* User Stats / Login Prompt */}
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl p-5 border border-green-200 shadow-lg">
                {user ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                                <Heart className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="text-green-700 font-medium">Your Eco Stats 🌱</p>
                                <p className="text-2xl font-bold text-green-800">{userProfile?.totalPoints || 0} Points</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-green-600">{userProfile?.itemsRecycled || 0} items processed</p>
                            <p className="font-bold text-green-800">{(userProfile?.totalCarbonSaved || 0).toFixed(1)} kg CO₂ saved</p>
                            <button
                                onClick={() => navigate("/profile")}
                                className="mt-2 text-sm text-green-600 hover:text-green-800 underline"
                            >
                                View Profile →
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                                <Trophy className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="text-green-800 font-bold text-lg">Earn Eco Points!</p>
                                <p className="text-green-600 text-sm">Sign up to track your recycling progress</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate("/auth")}
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
                        >
                            Join EcoFy
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReuseRecyclePanel;
