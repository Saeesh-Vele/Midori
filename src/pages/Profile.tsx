import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserActions, calculateLevel, type RecyclingAction } from "@/services/userService";
import { Button } from "@/components/ui/button";
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
    Calendar,
    Flame,
    Target,
    TreePine,
    Sparkles,
    ChevronRight,
    Clock,
    Filter,
    Star,
    Shield,
    Droplets,
    Heart,
    Crown
} from "lucide-react";

// ─── Achievement badge definitions ────────────────────────────────
const ACHIEVEMENTS = [
    { id: "first_scan", icon: "📸", label: "First Scan", desc: "Scanned your first item", threshold: 1, field: "itemsRecycled" as const },
    { id: "eco_5", icon: "♻️", label: "Eco Five", desc: "Recycled 5 items", threshold: 5, field: "itemsRecycled" as const },
    { id: "eco_25", icon: "🌿", label: "Green Machine", desc: "Recycled 25 items", threshold: 25, field: "itemsRecycled" as const },
    { id: "eco_100", icon: "🏆", label: "Century Club", desc: "Recycled 100 items", threshold: 100, field: "itemsRecycled" as const },
    { id: "carbon_1", icon: "🍃", label: "Carbon Cutter", desc: "Saved 1 kg CO₂", threshold: 1, field: "totalCarbonSaved" as const },
    { id: "carbon_10", icon: "🌳", label: "Tree Hugger", desc: "Saved 10 kg CO₂", threshold: 10, field: "totalCarbonSaved" as const },
    { id: "points_500", icon: "⭐", label: "Star Player", desc: "Earned 500 points", threshold: 500, field: "totalPoints" as const },
    { id: "points_2000", icon: "💎", label: "Diamond Rank", desc: "Earned 2,000 points", threshold: 2000, field: "totalPoints" as const },
];

// ─── Daily challenges ─────────────────────────────────────────────
const DAILY_CHALLENGES = [
    { title: "Scan & Sort", desc: "Scan 3 items using the smart camera today", xp: 75, icon: "📸" },
    { title: "Green Commute", desc: "Log a zero-emission trip on the eco map", xp: 50, icon: "🚲" },
    { title: "Share a Tip", desc: "Post an eco-tip in the community feed", xp: 60, icon: "💬" },
    { title: "Upcycle Hero", desc: "Upcycle at least 1 item today", xp: 80, icon: "✨" },
    { title: "Carbon Tracker", desc: "Check your carbon footprint in the calculator", xp: 40, icon: "📊" },
];

// ─── Skeleton loaders ─────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }: { className?: string }) => (
    <div className={`profile-skeleton ${className}`} />
);

const StatCardSkeleton = () => (
    <div className="profile-stat-card">
        <SkeletonBlock className="w-12 h-12 rounded-2xl mb-3" />
        <SkeletonBlock className="w-20 h-8 mb-2" />
        <SkeletonBlock className="w-16 h-4" />
    </div>
);

const ActivitySkeleton = () => (
    <div className="profile-activity-item">
        <SkeletonBlock className="w-11 h-11 rounded-xl" />
        <div className="flex-1 space-y-2">
            <SkeletonBlock className="w-3/4 h-4" />
            <SkeletonBlock className="w-1/2 h-3" />
        </div>
        <SkeletonBlock className="w-16 h-5" />
    </div>
);

// ─── Types for filter ─────────────────────────────────────────────
type ActivityFilter = "all" | "reuse" | "recycle" | "upcycle" | "dispose";

const Profile = () => {
    const { user, userProfile, logout, loading } = useAuth();
    const navigate = useNavigate();
    const [recentActions, setRecentActions] = useState<RecyclingAction[]>([]);
    const [actionsLoading, setActionsLoading] = useState(true);
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
    const [mounted, setMounted] = useState(false);

    // Pick a daily challenge deterministically based on date
    const dailyChallenge = useMemo(() => {
        const day = new Date().getDate();
        return DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];
    }, []);

    // Streak simulation (based on items recycled count for demo)
    const streakDays = useMemo(() => {
        return Math.min(Math.floor((userProfile?.itemsRecycled || 0) / 2) + 1, 7);
    }, [userProfile?.itemsRecycled]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        const loadActions = async () => {
            if (user) {
                try {
                    const actions = await getUserActions(user.uid, 20);
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

    // ─── Loading state ────────────────────────────────────────────
    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-hero">
                    <div className="profile-hero-inner">
                        <div className="profile-hero-top">
                            <SkeletonBlock className="w-24 h-8 rounded-lg" />
                            <SkeletonBlock className="w-20 h-8 rounded-lg" />
                        </div>
                        <div className="profile-hero-identity">
                            <SkeletonBlock className="w-[100px] h-[100px] rounded-full" />
                            <div className="space-y-3">
                                <SkeletonBlock className="w-48 h-8" />
                                <SkeletonBlock className="w-36 h-5" />
                                <SkeletonBlock className="w-28 h-6 rounded-full" />
                            </div>
                        </div>
                        <div className="profile-xp-container">
                            <SkeletonBlock className="w-full h-5 rounded-full" />
                        </div>
                    </div>
                </div>
                <div className="profile-content">
                    <div className="profile-stats-grid">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    // ─── Level calculations ───────────────────────────────────────
    const totalPoints = userProfile?.totalPoints || 0;
    const levelInfo = calculateLevel(totalPoints);

    // Calculate XP within the current level range
    const levels = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];
    const currentLevelMin = levels[levelInfo.level - 1] ?? 0;
    const currentLevelMax = levelInfo.nextLevelPoints;
    const xpInLevel = totalPoints - currentLevelMin;
    const xpNeeded = currentLevelMax - currentLevelMin;
    const progressPercent = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100;
    const xpRemaining = Math.max(currentLevelMax - totalPoints, 0);

    // Smart insights
    const treesSaved = ((userProfile?.totalCarbonSaved || 0) / 21).toFixed(1); // avg tree absorbs ~21 kg/yr
    const bottlesSaved = Math.round((userProfile?.itemsRecycled || 0) * 0.6);

    // Unlocked achievements
    const unlockedAchievements = ACHIEVEMENTS.filter(a => {
        const val = userProfile?.[a.field] || 0;
        return val >= a.threshold;
    });
    const lockedAchievements = ACHIEVEMENTS.filter(a => {
        const val = userProfile?.[a.field] || 0;
        return val < a.threshold;
    });

    // Activity filter
    const filteredActions = activityFilter === "all"
        ? recentActions
        : recentActions.filter(a => a.category === activityFilter);

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "reuse": return "profile-cat-reuse";
            case "upcycle": return "profile-cat-upcycle";
            case "recycle": return "profile-cat-recycle";
            case "dispose": return "profile-cat-dispose";
            default: return "profile-cat-default";
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

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <div className={`profile-page ${mounted ? "profile-mounted" : ""}`}>
            {/* ═══════════════════ HERO HEADER ═══════════════════ */}
            <div className="profile-hero">
                <div className="profile-hero-orb profile-hero-orb--1" />
                <div className="profile-hero-orb profile-hero-orb--2" />
                <div className="profile-hero-orb profile-hero-orb--3" />

                <div className="profile-hero-inner">
                    {/* Top bar */}
                    <div className="profile-hero-top">
                        <Button
                            variant="ghost"
                            className="profile-back-btn"
                            onClick={() => navigate("/chat")}
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            Back
                        </Button>
                        <Button
                            variant="ghost"
                            className="profile-logout-btn"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-1.5" />
                            Logout
                        </Button>
                    </div>

                    {/* Identity section */}
                    <div className="profile-hero-identity">
                        <div className="profile-avatar-wrapper">
                            <div className="profile-avatar-ring" />
                            <div className="profile-avatar">
                                {userProfile?.name?.charAt(0).toUpperCase() || "E"}
                            </div>
                            <div className="profile-level-badge">
                                <Crown className="w-3 h-3" />
                                <span>{levelInfo.level}</span>
                            </div>
                        </div>

                        <div className="profile-hero-info">
                            <h1 className="profile-name">{userProfile?.name || "Eco Warrior"}</h1>
                            <p className="profile-email">{user?.email}</p>
                            <div className="profile-title-badge">
                                <Award className="w-3.5 h-3.5" />
                                <span>{levelInfo.title}</span>
                            </div>
                        </div>
                    </div>

                    {/* XP Progress */}
                    <div className="profile-xp-container">
                        <div className="profile-xp-labels">
                            <span className="profile-xp-level">
                                <Zap className="w-3.5 h-3.5" />
                                Level {levelInfo.level}
                            </span>
                            <span className="profile-xp-numbers">
                                {totalPoints.toLocaleString()} / {currentLevelMax.toLocaleString()} XP
                            </span>
                        </div>
                        <div className="profile-xp-track">
                            <div
                                className="profile-xp-fill"
                                style={{ width: `${progressPercent}%` }}
                            />
                            <div
                                className="profile-xp-glow"
                                style={{ left: `${progressPercent}%` }}
                            />
                        </div>
                        <p className="profile-xp-remaining">
                            <Sparkles className="w-3 h-3" />
                            {xpRemaining.toLocaleString()} XP to Level {levelInfo.level + 1}
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
            <div className="profile-content">

                {/* ──── Stats Grid ──── */}
                <div className="profile-stats-grid">
                    <div className="profile-stat-card profile-stat-card--points profile-stagger-1">
                        <div className="profile-stat-icon profile-stat-icon--points">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <p className="profile-stat-value">{totalPoints.toLocaleString()}</p>
                        <p className="profile-stat-label">Eco Points</p>
                        <div className="profile-stat-trend">
                            <TrendingUp className="w-3 h-3" />
                            <span>Top {Math.max(1, Math.floor(100 - totalPoints / 10))}%</span>
                        </div>
                    </div>

                    <div className="profile-stat-card profile-stat-card--carbon profile-stagger-2">
                        <div className="profile-stat-icon profile-stat-icon--carbon">
                            <Leaf className="w-6 h-6" />
                        </div>
                        <p className="profile-stat-value">{(userProfile?.totalCarbonSaved || 0).toFixed(1)}</p>
                        <p className="profile-stat-label">kg CO₂ Saved</p>
                        <div className="profile-stat-trend profile-stat-trend--green">
                            <TreePine className="w-3 h-3" />
                            <span>≈ {treesSaved} trees/yr</span>
                        </div>
                    </div>

                    <div className="profile-stat-card profile-stat-card--items profile-stagger-3">
                        <div className="profile-stat-icon profile-stat-icon--items">
                            <Recycle className="w-6 h-6" />
                        </div>
                        <p className="profile-stat-value">{userProfile?.itemsRecycled || 0}</p>
                        <p className="profile-stat-label">Items Processed</p>
                        <div className="profile-stat-trend profile-stat-trend--blue">
                            <Droplets className="w-3 h-3" />
                            <span>≈ {bottlesSaved} bottles</span>
                        </div>
                    </div>
                </div>

                {/* ──── Two-column layout ──── */}
                <div className="profile-two-col">

                    {/* Left Column */}
                    <div className="profile-col-left">

                        {/* Weekly Streak */}
                        <div className="profile-card profile-stagger-4">
                            <div className="profile-card-header">
                                <div className="profile-card-title">
                                    <Flame className="w-5 h-5 text-orange-500" />
                                    <h3>Weekly Eco Streak</h3>
                                </div>
                                <span className="profile-streak-count">{streakDays} day{streakDays !== 1 ? "s" : ""} 🔥</span>
                            </div>
                            <div className="profile-streak-grid">
                                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                                    <div key={i} className={`profile-streak-day ${i < streakDays ? "profile-streak-day--active" : ""}`}>
                                        <div className="profile-streak-circle">
                                            {i < streakDays ? "✓" : ""}
                                        </div>
                                        <span>{day}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="profile-streak-motivation">
                                {streakDays >= 7
                                    ? "🎉 Perfect week! You're unstoppable!"
                                    : streakDays >= 4
                                        ? "💪 Great momentum! Keep it up!"
                                        : "🌱 Every day counts. Build your streak!"}
                            </p>
                        </div>

                        {/* Daily Challenge */}
                        <div className="profile-card profile-daily-challenge profile-stagger-5">
                            <div className="profile-daily-glow" />
                            <div className="profile-card-header">
                                <div className="profile-card-title">
                                    <Target className="w-5 h-5 text-emerald-500" />
                                    <h3>Today's Challenge</h3>
                                </div>
                                <span className="profile-daily-xp">+{dailyChallenge.xp} XP</span>
                            </div>
                            <div className="profile-daily-body">
                                <span className="profile-daily-icon">{dailyChallenge.icon}</span>
                                <div>
                                    <h4 className="profile-daily-title">{dailyChallenge.title}</h4>
                                    <p className="profile-daily-desc">{dailyChallenge.desc}</p>
                                </div>
                            </div>
                            <Button
                                className="profile-daily-cta"
                                onClick={() => navigate("/chat")}
                            >
                                <Zap className="w-4 h-4 mr-1.5" />
                                Accept Challenge
                            </Button>
                        </div>

                        {/* Smart Insights */}
                        <div className="profile-card profile-stagger-6">
                            <div className="profile-card-header">
                                <div className="profile-card-title">
                                    <Sparkles className="w-5 h-5 text-purple-500" />
                                    <h3>Eco Insights</h3>
                                </div>
                            </div>
                            <div className="profile-insights-grid">
                                <div className="profile-insight">
                                    <span className="profile-insight-icon">🌳</span>
                                    <div>
                                        <p className="profile-insight-value">{treesSaved}</p>
                                        <p className="profile-insight-label">Trees equivalent saved/yr</p>
                                    </div>
                                </div>
                                <div className="profile-insight">
                                    <span className="profile-insight-icon">🧴</span>
                                    <div>
                                        <p className="profile-insight-value">{bottlesSaved}</p>
                                        <p className="profile-insight-label">Plastic bottles diverted</p>
                                    </div>
                                </div>
                                <div className="profile-insight">
                                    <span className="profile-insight-icon">📊</span>
                                    <div>
                                        <p className="profile-insight-value">Top {Math.max(1, Math.floor(100 - totalPoints / 10))}%</p>
                                        <p className="profile-insight-label">Community rank</p>
                                    </div>
                                </div>
                                <div className="profile-insight">
                                    <span className="profile-insight-icon">⚡</span>
                                    <div>
                                        <p className="profile-insight-value">{((userProfile?.totalCarbonSaved || 0) * 3.2).toFixed(0)} L</p>
                                        <p className="profile-insight-label">Water saved (est.)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="profile-col-right">

                        {/* Achievements */}
                        <div className="profile-card profile-stagger-4">
                            <div className="profile-card-header">
                                <div className="profile-card-title">
                                    <Star className="w-5 h-5 text-yellow-500" />
                                    <h3>Achievements</h3>
                                </div>
                                <span className="profile-badge-count">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
                            </div>
                            <div className="profile-achievements-grid">
                                {unlockedAchievements.map(a => (
                                    <div key={a.id} className="profile-achievement profile-achievement--unlocked" title={a.desc}>
                                        <span className="profile-achievement-icon">{a.icon}</span>
                                        <span className="profile-achievement-label">{a.label}</span>
                                    </div>
                                ))}
                                {lockedAchievements.map(a => (
                                    <div key={a.id} className="profile-achievement profile-achievement--locked" title={a.desc}>
                                        <span className="profile-achievement-icon">🔒</span>
                                        <span className="profile-achievement-label">{a.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="profile-card profile-stagger-5">
                            <div className="profile-card-header">
                                <div className="profile-card-title">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    <h3>Recent Activity</h3>
                                </div>
                                <div className="profile-activity-filters">
                                    {(["all", "recycle", "reuse", "upcycle", "dispose"] as ActivityFilter[]).map(f => (
                                        <button
                                            key={f}
                                            className={`profile-filter-chip ${activityFilter === f ? "profile-filter-chip--active" : ""}`}
                                            onClick={() => setActivityFilter(f)}
                                        >
                                            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="profile-activity-list">
                                {actionsLoading ? (
                                    <>
                                        <ActivitySkeleton />
                                        <ActivitySkeleton />
                                        <ActivitySkeleton />
                                    </>
                                ) : filteredActions.length === 0 ? (
                                    <div className="profile-empty-state">
                                        <div className="profile-empty-illustration">
                                            <div className="profile-empty-planet">🌍</div>
                                            <div className="profile-empty-leaf profile-empty-leaf--1">🌿</div>
                                            <div className="profile-empty-leaf profile-empty-leaf--2">🍃</div>
                                            <div className="profile-empty-leaf profile-empty-leaf--3">🌱</div>
                                        </div>
                                        <h4 className="profile-empty-title">
                                            {activityFilter !== "all"
                                                ? `No ${activityFilter} actions yet`
                                                : "Your eco journey starts here!"}
                                        </h4>
                                        <p className="profile-empty-desc">
                                            Every item you scan, sort, and recycle shows up here.
                                            <br />Start making a difference today! 🌱
                                        </p>
                                        <Button
                                            className="profile-empty-cta"
                                            onClick={() => navigate("/chat")}
                                        >
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Start Your First Action
                                        </Button>
                                    </div>
                                ) : (
                                    filteredActions.map((action, index) => (
                                        <div
                                            key={action.id || index}
                                            className="profile-activity-item"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className={`profile-activity-icon ${getCategoryColor(action.category)}`}>
                                                {getCategoryEmoji(action.category)}
                                            </div>
                                            <div className="profile-activity-info">
                                                <p className="profile-activity-name">{action.itemName}</p>
                                                <p className="profile-activity-action">{action.actionTaken}</p>
                                            </div>
                                            <div className="profile-activity-meta">
                                                <span className="profile-activity-points">+{action.pointsEarned}</span>
                                                <span className="profile-activity-time">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTimeAgo(action.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ──── Sticky CTA (mobile) ──── */}
                <div className="profile-sticky-cta">
                    <Button
                        className="profile-sticky-btn"
                        onClick={() => navigate("/chat")}
                    >
                        <Recycle className="w-5 h-5 mr-2" />
                        Scan &amp; Recycle
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
