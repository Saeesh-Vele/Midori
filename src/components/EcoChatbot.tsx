import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import {
    Send,
    ImagePlus,
    Leaf,
    Sparkles,
    Bot,
    User,
    Recycle,
    Lightbulb,
    Trash2,
    ArrowUpCircle,
    X,
    Trophy,
    LogIn
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { analyzeWasteImage, chatWithEcofy, type WasteAnalysis, type ChatMessage } from "@/services/gemini";
import ReuseRecyclePanel from "@/components/chat/ReuseRecyclePanel";
import FeedbackButtons from "@/components/FeedbackButtons";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
    id: string;
    type: "user" | "bot";
    content: string;
    image?: string;
    analysis?: WasteAnalysis;
    timestamp: Date;
}

const EcoChatbot = () => {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            type: "bot",
            content: "Hi there! 🌱 I'm EcoFy Buddy, your friendly eco-companion! Upload a photo of any item, and I'll help you discover the best ways to reuse, recycle, or give it new life. Let's make the planet a little greener together!",
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showAnalysis, setShowAnalysis] = useState<WasteAnalysis | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() && !selectedImage) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: "user",
            content: inputValue || "What can I do with this item?",
            image: selectedImage || undefined,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            if (selectedImage) {
                // Analyze the image
                const analysis = await analyzeWasteImage(selectedImage);

                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: "bot",
                    content: `I found a **${analysis.itemName}**! It's made of ${analysis.material}. ${getCategoryEmoji(analysis.category)} Based on my analysis, I recommend to **${analysis.category}** this item. Here's what you can do:`,
                    analysis,
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, botMessage]);
                setShowAnalysis(analysis);
                setSelectedImage(null);
            } else {
                // Regular chat - build conversation history for context
                const conversationHistory: ChatMessage[] = messages
                    .filter(msg => !msg.image) // Skip image messages for history
                    .map(msg => ({
                        role: msg.type === "user" ? "user" as const : "model" as const,
                        content: msg.content
                    }));

                const response = await chatWithEcofy(inputValue, conversationHistory);
                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: "bot",
                    content: response,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                type: "bot",
                content: "Oops! I had trouble analyzing that. Please try again with a clearer image. 📸",
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const getCategoryEmoji = (category: string) => {
        switch (category) {
            case "reuse": return "🔁";
            case "upcycle": return "🛠️";
            case "recycle": return "♻️";
            case "dispose": return "🗑️";
            default: return "🌱";
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "reuse": return <Recycle className="w-5 h-5" />;
            case "upcycle": return <ArrowUpCircle className="w-5 h-5" />;
            case "recycle": return <Recycle className="w-5 h-5" />;
            case "dispose": return <Trash2 className="w-5 h-5" />;
            default: return <Leaf className="w-5 h-5" />;
        }
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
                    <div className="flex gap-1 items-center flex-wrap">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/eco-map")}
                            className="text-green-700 hover:bg-green-100 text-sm px-3"
                        >
                            🗺️ Eco Map
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/trip-calculator")}
                            className="text-green-700 hover:bg-green-100 text-sm px-3"
                        >
                            🚗 Trip Calculator
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/community")}
                            className="text-green-700 hover:bg-green-100 text-sm px-3"
                        >
                            👥 Community
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/carbon")}
                            className="text-green-700 hover:bg-green-100 text-sm px-3"
                        >
                            🌍 Carbon Calculator
                        </Button>
                        {user ? (
                            <Button
                                onClick={() => navigate("/profile")}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 flex items-center gap-2"
                            >
                                <Trophy className="w-4 h-4" />
                                {userProfile?.totalPoints || 0} pts
                            </Button>
                        ) : (
                            <Button
                                onClick={() => navigate("/auth")}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 flex items-center gap-2"
                            >
                                <LogIn className="w-4 h-4" />
                                Login
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Container */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                <ScrollArea className="h-[60vh] pr-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.type === "user" ? "flex-row-reverse" : ""} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                {/* Avatar */}
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${message.type === "user"
                                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                                    : "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 text-white"
                                    }`}>
                                    {message.type === "user" ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                                </div>

                                {/* Message Content */}
                                <div className={`max-w-[75%] ${message.type === "user" ? "items-end" : "items-start"}`}>
                                    <div className={`rounded-2xl p-5 ${message.type === "user"
                                        ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-tr-sm shadow-lg"
                                        : "bg-white/90 backdrop-blur-xl shadow-xl border border-gray-100 rounded-tl-sm"
                                        }`}>
                                        {message.image && (
                                            <div className="relative mb-4 rounded-xl overflow-hidden shadow-md">
                                                <img
                                                    src={message.image}
                                                    alt="Uploaded item"
                                                    className="max-w-full max-h-56 object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                            </div>
                                        )}
                                        {message.type === "bot" ? (
                                            <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-2 prose-p:text-gray-700 prose-p:my-1 prose-strong:text-gray-800 prose-ul:my-2 prose-li:my-0.5 prose-hr:my-3 prose-hr:border-gray-200">
                                                <ReactMarkdown>{message.content}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="text-sm leading-relaxed">
                                                {message.content}
                                            </p>
                                        )}

                                        {/* Analysis Badge - Enhanced */}
                                        {message.analysis && (
                                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-md ${message.analysis.category === "reuse" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" :
                                                    message.analysis.category === "upcycle" ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white" :
                                                        message.analysis.category === "recycle" ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" :
                                                            "bg-gradient-to-r from-orange-500 to-amber-600 text-white"
                                                    }`}>
                                                    {getCategoryIcon(message.analysis.category)}
                                                    {message.analysis.category.charAt(0).toUpperCase() + message.analysis.category.slice(1)}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                                                    <Sparkles className="w-3 h-3" />
                                                    {Math.round(message.analysis.confidence * 100)}% accurate
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    <span className="text-xs text-gray-400 mt-2 block px-2 font-medium">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Loading Indicator - Enhanced */}
                        {isLoading && (
                            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-lg">
                                    <Sparkles className="w-6 h-6 animate-pulse" />
                                </div>
                                <div className="bg-white/90 backdrop-blur-xl shadow-xl border border-gray-100 rounded-2xl rounded-tl-sm p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-1.5">
                                            <span className="w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-bounce shadow-md" style={{ animationDelay: "0ms" }} />
                                            <span className="w-3 h-3 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full animate-bounce shadow-md" style={{ animationDelay: "150ms" }} />
                                            <span className="w-3 h-3 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full animate-bounce shadow-md" style={{ animationDelay: "300ms" }} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">🔍 Analyzing your item with AI...</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">This may take a few seconds</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Reuse vs Recycle Panel */}
                {showAnalysis && (
                    <div className="mt-6">
                        <ReuseRecyclePanel analysis={showAnalysis} />
                        <FeedbackButtons onClose={() => setShowAnalysis(null)} />
                    </div>
                )}

                {/* Selected Image Preview */}
                {selectedImage && (
                    <div className="mt-4 relative inline-block">
                        <img
                            src={selectedImage}
                            alt="Selected"
                            className="h-20 rounded-lg border-2 border-green-400 shadow-md"
                        />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Input Area */}
                <div className="mt-4 bg-white rounded-2xl shadow-lg border border-green-100 p-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-green-600 hover:bg-green-100 rounded-full"
                        >
                            <ImagePlus className="w-5 h-5" />
                        </Button>

                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                            placeholder="Ask about waste management or upload an image..."
                            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                        />

                        <Button
                            onClick={handleSendMessage}
                            disabled={isLoading || (!inputValue.trim() && !selectedImage)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full px-6"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Send
                        </Button>
                    </div>
                </div>

                {/* Quick Tips */}
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {["📦 Cardboard Box", "🍾 Plastic Bottle", "👕 Old Clothes", "📱 Electronics"].map((tip) => (
                        <button
                            key={tip}
                            onClick={() => setInputValue(`How do I handle ${tip.slice(2)}?`)}
                            className="px-4 py-2 bg-white/80 hover:bg-green-50 border border-green-200 rounded-full text-sm text-gray-600 transition-colors"
                        >
                            {tip}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EcoChatbot;
