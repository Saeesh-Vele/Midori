import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, X, MessageSquare, Check } from "lucide-react";

interface FeedbackButtonsProps {
    onClose?: () => void;
}

const FeedbackButtons = ({ onClose }: FeedbackButtonsProps) => {
    const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null);
    const [showThanks, setShowThanks] = useState(false);

    const handleFeedback = (type: "helpful" | "not-helpful") => {
        setFeedback(type);
        setShowThanks(true);

        // Auto-hide after 2 seconds
        setTimeout(() => {
            setShowThanks(false);
            if (onClose) onClose();
        }, 2000);
    };

    if (showThanks) {
        return (
            <div className="mt-4 bg-green-100 border border-green-200 rounded-xl p-4 text-center animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-center gap-2 text-green-700">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">
                        {feedback === "helpful"
                            ? "Thanks for your feedback! 🌱"
                            : "We'll improve! Thanks for letting us know 💚"}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">Was this suggestion helpful?</span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeedback("helpful")}
                        className={`gap-1 ${feedback === "helpful" ? "bg-green-100 border-green-300 text-green-700" : "hover:bg-green-50 hover:border-green-300 hover:text-green-700"}`}
                    >
                        <ThumbsUp className="w-4 h-4" />
                        Yes
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeedback("not-helpful")}
                        className={`gap-1 ${feedback === "not-helpful" ? "bg-orange-100 border-orange-300 text-orange-700" : "hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700"}`}
                    >
                        <ThumbsDown className="w-4 h-4" />
                        No
                    </Button>

                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FeedbackButtons;
