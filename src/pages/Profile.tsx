import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserActions, calculateLevel, type RecyclingAction } from "@/services/userService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Leaf,
    Trophy,
    Recycle,
    Zap,
    TrendingUp,
    LogOut,
    ArrowLeft,
    Award,
    Calendar
} from "lucide-react";

const Profile = () => {
    const { user, userProfile, logout, loading } = useAuth();
    const navigate = useNavigate();
    const [recentActions, setRecentActions] = useState<RecyclingAction[]>([]);
    const [actionsLoading, setActionsLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        const loadActions = async () => {
            if (user) {
                try {
                    const actions = await getUserActions(user.uid, 10);
                    setRecentActions(actions);
                } catch (error) {
                    console.error("Error loading actions:", error);
                }
                setActionsLoading(false);
            }
        };
        loadActions();
    }, [user]);

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const levelInfo = calculateLevel(userProfile?.totalPoints || 0);
    const progressToNext = userProfile ?
        ((userProfile.totalPoints - (levelInfo.nextLevelPoints - 500)) / 500) * 100 : 0;

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "reuse": return "bg-blue-500";
            case "upcycle": return "bg-purple-500";
            case "recycle": return "bg-green-500";
            case "dispose": return "bg-orange-500";
            default: return "bg-gray-500";
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <Button
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={() => navigate("/chat")}
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back to Chat
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-5 h-5 mr-2" />
                            Logout
                        </Button>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-4xl shadow-xl">
                            {userProfile?.name?.charAt(0).toUpperCase() || "E"}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{userProfile?.name || "Eco Warrior"}</h1>
                            <p className="text-green-100">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Award className="w-5 h-5 text-yellow-300" />
                                <span className="font-semibold text-yellow-300">Level {levelInfo.level}</span>
                                <span className="text-green-100">• {levelInfo.title}</span>
                            </div>
                        </div>
                    </div>

                    {/* Level Progress */}
                    <div className="mt-6 bg-white/10 rounded-xl p-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span>Level {levelInfo.level}</span>
                            <span>{userProfile?.totalPoints || 0} / {levelInfo.nextLevelPoints} XP</span>
                        </div>
                        <Progress value={Math.min(progressToNext, 100)} className="h-3 bg-white/20" />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="max-w-4xl mx-auto px-4 -mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-shadow">
                        <CardContent className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-3">
                                <Trophy className="w-7 h-7 text-white" />
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{userProfile?.totalPoints || 0}</p>
                            <p className="text-gray-500 font-medium">Eco Points</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-shadow">
                        <CardContent className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-3">
                                <Leaf className="w-7 h-7 text-white" />
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{(userProfile?.totalCarbonSaved || 0).toFixed(1)}</p>
                            <p className="text-gray-500 font-medium">kg CO₂ Saved</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-shadow">
                        <CardContent className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center mx-auto mb-3">
                                <Recycle className="w-7 h-7 text-white" />
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{userProfile?.itemsRecycled || 0}</p>
                            <p className="text-gray-500 font-medium">Items Processed</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Card className="bg-white shadow-xl border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {actionsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : recentActions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Recycle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No recycling actions yet.</p>
                                <Button
                                    className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600"
                                    onClick={() => navigate("/chat")}
                                >
                                    Start Recycling!
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentActions.map((action, index) => (
                                    <div
                                        key={action.id || index}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className={`w-10 h-10 rounded-full ${getCategoryColor(action.category)} flex items-center justify-center text-xl`}>
                                            {getCategoryEmoji(action.category)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800">{action.itemName}</p>
                                            <p className="text-sm text-gray-500">{action.actionTaken}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-600">+{action.pointsEarned} pts</p>
                                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {action.timestamp.toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Profile;
