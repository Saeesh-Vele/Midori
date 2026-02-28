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
import { Camera } from "lucide-react";

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
            content: "Hi there! 🌱 I'm Midori Buddy, your friendly eco-companion! Upload a photo of any item, and I'll help you discover the best ways to reuse, recycle, or give it new life. Let's make the planet a little greener together!",
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

    const navItems = [
        { label: "Eco Map", path: "/eco-map", icon: "🗺️" },
        { label: "Trip Calc", path: "/trip-calculator", icon: "🚗" },
        { label: "Community", path: "/community", icon: "👥" },
        { label: "Carbon", path: "/carbon", icon: "🌍" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
            {/* ── Premium Navbar ── */}
            <header
                style={{
                    background: "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    borderBottom: "1px solid rgba(34,197,94,0.15)",
                    boxShadow: "0 4px 32px rgba(34,197,94,0.07), 0 1px 0 rgba(255,255,255,0.9) inset",
                }}
                className="sticky top-0 z-50 py-3 px-6"
            >
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

                    {/* ── Logo ── */}
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2.5 group flex-shrink-0 focus:outline-none"
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    >
                        {/* Animated glow ring around logo */}
                        <span
                            className="relative flex items-center justify-center"
                            style={{ width: 40, height: 40 }}
                        >
                            <span
                                style={{
                                    position: "absolute",
                                    inset: -3,
                                    borderRadius: "50%",
                                    background: "conic-gradient(from 0deg, #22c55e, #10b981, #34d399, #22c55e)",
                                    opacity: 0.4,
                                    animation: "navbar-spin 4s linear infinite",
                                }}
                            />
                            <img
                                src="/ecofy-logo.png"
                                alt="Midori"
                                className="w-9 h-9 rounded-full relative z-10 group-hover:scale-105 transition-transform duration-200"
                                style={{ objectFit: "cover" }}
                            />
                        </span>
                        <span
                            className="text-xl font-extrabold tracking-tight select-none"
                            style={{
                                background: "linear-gradient(135deg, #16a34a 0%, #059669 50%, #22c55e 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Midori
                        </span>
                        {/* Live badge */}
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                background: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
                                color: "#15803d",
                                border: "1px solid #86efac",
                                borderRadius: 999,
                                padding: "1px 7px",
                                marginBottom: 1,
                                alignSelf: "flex-end",
                            }}
                        >
                            <span
                                style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: "50%",
                                    background: "#22c55e",
                                    boxShadow: "0 0 6px #22c55e",
                                    display: "inline-block",
                                    animation: "gentle-pulse 2s ease-in-out infinite",
                                }}
                            />
                            AI
                        </span>
                    </button>

                    {/* ── Nav Pills ── */}
                    <nav
                        className="hidden md:flex items-center"
                        style={{
                            background: "rgba(240,253,244,0.8)",
                            border: "1px solid rgba(134,239,172,0.4)",
                            borderRadius: 999,
                            padding: "4px 6px",
                            gap: 2,
                        }}
                    >
                        {navItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "6px 14px",
                                    borderRadius: 999,
                                    fontSize: "0.8rem",
                                    fontWeight: 500,
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#15803d",
                                    background: "transparent",
                                    transition: "background 0.18s, color 0.18s, transform 0.15s, box-shadow 0.18s",
                                    whiteSpace: "nowrap",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg,#22c55e,#10b981)";
                                    (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(34,197,94,0.35)";
                                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                    (e.currentTarget as HTMLButtonElement).style.color = "#15803d";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                                }}
                            >
                                <span style={{ fontSize: "0.85rem" }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* ── Right Actions ── */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Smart Camera CTA */}
                        <button
                            onClick={() => navigate("/smart-camera")}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "8px 18px",
                                borderRadius: 999,
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                border: "none",
                                cursor: "pointer",
                                background: "linear-gradient(135deg, #16a34a 0%, #059669 60%, #10b981 100%)",
                                color: "#fff",
                                boxShadow: "0 4px 16px rgba(34,197,94,0.38), 0 1px 0 rgba(255,255,255,0.18) inset",
                                transition: "transform 0.18s, box-shadow 0.18s",
                                letterSpacing: "-0.01em",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.03)";
                                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(34,197,94,0.48), 0 1px 0 rgba(255,255,255,0.18) inset";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = "none";
                                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(34,197,94,0.38), 0 1px 0 rgba(255,255,255,0.18) inset";
                            }}
                        >
                            <Camera size={15} style={{ flexShrink: 0 }} />
                            Smart Camera
                        </button>

                        {/* Auth / Points */}
                        {user ? (
                            <button
                                onClick={() => navigate("/profile")}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 7,
                                    padding: "7px 16px",
                                    borderRadius: 999,
                                    fontSize: "0.82rem",
                                    fontWeight: 700,
                                    border: "2px solid transparent",
                                    cursor: "pointer",
                                    background: "linear-gradient(#fff,#fff) padding-box, conic-gradient(from 0deg,#22c55e,#10b981,#059669,#22c55e) border-box",
                                    color: "#15803d",
                                    boxShadow: "0 2px 12px rgba(34,197,94,0.18)",
                                    transition: "transform 0.18s, box-shadow 0.18s",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(34,197,94,0.28)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = "none";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(34,197,94,0.18)";
                                }}
                            >
                                <Trophy
                                    size={14}
                                    style={{
                                        color: "#f59e0b",
                                        filter: "drop-shadow(0 0 4px rgba(245,158,11,0.5))",
                                    }}
                                />
                                <span>{userProfile?.totalPoints || 0} pts</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate("/auth")}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 7,
                                    padding: "7px 16px",
                                    borderRadius: 999,
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    border: "1.5px solid rgba(34,197,94,0.35)",
                                    cursor: "pointer",
                                    background: "rgba(240,253,244,0.9)",
                                    color: "#15803d",
                                    boxShadow: "0 2px 8px rgba(34,197,94,0.1)",
                                    transition: "all 0.18s",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,252,231,1)";
                                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(34,197,94,0.2)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(240,253,244,0.9)";
                                    (e.currentTarget as HTMLButtonElement).style.transform = "none";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(34,197,94,0.1)";
                                }}
                            >
                                <LogIn size={14} />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>

                {/* Keyframe for spinning logo ring */}
                <style>{`
                    @keyframes navbar-spin {
                        from { transform: rotate(0deg); }
                        to   { transform: rotate(360deg); }
                    }
                `}</style>
            </header>

            {/* Chat Container */}
            <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
                <ScrollArea className="h-[58vh] md:h-[60vh] pr-4" ref={scrollRef}>
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
                <div className="mt-6 flex flex-wrap gap-2 justify-center pb-24 md:pb-0">
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

            {/* ── Premium Mobile Bottom Nav ── */}
            <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex justify-around items-center w-[92%] max-w-sm px-4 py-3"
                style={{
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    borderRadius: 999,
                    boxShadow: "0 10px 30px rgba(34,197,94,0.15), 0 1px 0 rgba(255,255,255,0.8) inset",
                }}
            >
                {navItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="flex flex-col items-center gap-1.5 focus:outline-none w-14 group transition-transform duration-300"
                        style={{ color: "#15803d", background: "transparent", border: "none" }}
                    >
                        <span
                            className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 group-hover:bg-green-100 group-hover:scale-110"
                            style={{ fontSize: "1.2rem", boxShadow: "inset 0 0 0 1px rgba(34,197,94,0.0)" }}
                        >
                            {item.icon}
                        </span>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default EcoChatbot;
