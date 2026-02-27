import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    Leaf,
    TrendingDown,
    RefreshCcw,
    ArrowLeft,
    CheckCircle2,
    Lightbulb,
    Car,
    UtensilsCrossed,
    Zap,
    Trash2,
    Share2
} from "lucide-react";

interface CarbonResultProps {
    footprint: number;
    answers: {
        transport: string;
        diet: string;
        waste: string;
        electricity: number;
    };
    onReset: () => void;
}

const CarbonResult = ({ footprint, answers, onReset }: CarbonResultProps) => {
    const navigate = useNavigate();

    const getFootprintLevel = () => {
        if (footprint < 6) return { label: "Low", color: "text-green-600", bg: "bg-green-100", emoji: "🌿" };
        if (footprint < 10) return { label: "Average", color: "text-yellow-600", bg: "bg-yellow-100", emoji: "⚡" };
        return { label: "High", color: "text-red-600", bg: "bg-red-100", emoji: "🔥" };
    };

    const level = getFootprintLevel();
    const avgFootprint = 8.5; // Average carbon footprint in tons
    const percentDiff = Math.round(((footprint - avgFootprint) / avgFootprint) * 100);

    const getSuggestions = () => {
        const suggestions = [];

        if (answers.transport === "car") {
            suggestions.push({
                icon: <Car className="w-5 h-5" />,
                title: "Try public transit or carpooling",
                impact: "Could save up to 2 tons CO₂/year"
            });
        }

        if (answers.diet === "omnivore") {
            suggestions.push({
                icon: <UtensilsCrossed className="w-5 h-5" />,
                title: "Have one meat-free day per week",
                impact: "Could save 0.5 tons CO₂/year"
            });
        }

        if (answers.electricity > 50) {
            suggestions.push({
                icon: <Zap className="w-5 h-5" />,
                title: "Switch to LED bulbs & unplug devices",
                impact: "Could save 0.3 tons CO₂/year"
            });
        }

        if (answers.waste === "none" || answers.waste === "some") {
            suggestions.push({
                icon: <Trash2 className="w-5 h-5" />,
                title: "Start recycling & composting",
                impact: "Could save 0.5 tons CO₂/year"
            });
        }

        // Always add at least one positive suggestion
        if (suggestions.length === 0) {
            suggestions.push({
                icon: <Leaf className="w-5 h-5" />,
                title: "Keep up the great work!",
                impact: "You're already making a difference"
            });
        }

        return suggestions;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-green-100 py-4 px-6 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate("/")}
                    >
                        <img src="/ecofy-logo.png" alt="EcoFy" className="w-10 h-10" />
                        <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                            EcoFy
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/chat")}
                        className="text-green-700 hover:bg-green-100"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Chat
                    </Button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Results Card */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-green-100 mb-8 text-center">
                    <div className="mb-6">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${level.bg} ${level.color}`}>
                            {level.emoji} {level.label} Carbon Footprint
                        </span>
                    </div>

                    {/* Big Number */}
                    <div className="mb-6">
                        <div className="relative inline-block">
                            <span className="text-7xl md:text-8xl font-black bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                                {footprint}
                            </span>
                            <span className="absolute -top-2 -right-12 text-xl text-gray-500">tons</span>
                        </div>
                        <p className="text-gray-500 mt-2">CO₂ per year</p>
                    </div>

                    {/* Comparison */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${percentDiff < 0 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        }`}>
                        <TrendingDown className={`w-4 h-4 ${percentDiff > 0 ? "rotate-180" : ""}`} />
                        <span className="text-sm font-medium">
                            {Math.abs(percentDiff)}% {percentDiff < 0 ? "below" : "above"} average ({avgFootprint} tons)
                        </span>
                    </div>

                    {/* Visual Gauge */}
                    <div className="mt-8 mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>Low</span>
                            <span>Average</span>
                            <span>High</span>
                        </div>
                        <div className="h-4 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full relative">
                            <div
                                className="absolute w-6 h-6 bg-white border-4 border-gray-800 rounded-full -top-1 transform -translate-x-1/2 shadow-lg"
                                style={{ left: `${Math.min(100, Math.max(0, (footprint / 15) * 100))}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Suggestions */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100 mb-6">
                    <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        Personalized Tips to Reduce Your Footprint
                    </h3>

                    <div className="space-y-3">
                        {getSuggestions().map((suggestion, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border border-green-100"
                            >
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 flex-shrink-0">
                                    {suggestion.icon}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">{suggestion.title}</p>
                                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {suggestion.impact}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={onReset}
                        variant="outline"
                        className="flex-1 gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Calculate Again
                    </Button>
                    <Button
                        onClick={() => navigate("/chat")}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 gap-2"
                    >
                        <Leaf className="w-4 h-4" />
                        Get Help with Waste
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: 'My Carbon Footprint - EcoFy',
                                    text: `My carbon footprint is ${footprint} tons CO₂/year! Calculate yours at EcoFy.`,
                                });
                            }
                        }}
                    >
                        <Share2 className="w-4 h-4" />
                        Share
                    </Button>
                </div>

                {/* Quote */}
                <div className="mt-8 text-center">
                    <p className="text-gray-500 italic">
                        "The greatest threat to our planet is the belief that someone else will save it."
                    </p>
                    <p className="text-sm text-gray-400 mt-1">— Robert Swan</p>
                </div>
            </div>
        </div>
    );
};

export default CarbonResult;
