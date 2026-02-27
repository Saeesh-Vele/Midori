import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    increment,
    Timestamp,
    getDocs,
    limit,
    where,
    setDoc
} from "firebase/firestore";
import {
    Users,
    Leaf,
    ThumbsUp,
    MessageSquare,
    PlusCircle,
    TrendingUp,
    Sparkles,
    ArrowLeft,
    Send,
    Heart,
    Trophy,
    Target,
    Award,
    Flame,
    BookmarkPlus,
    Share2,
    Filter,
    Clock,
    Crown,
    Medal,
    Star,
    ChevronDown,
    ChevronUp,
    X,
    Image as ImageIcon,
    Loader2,
    Check,
    Calendar,
    Zap,
    UserPlus,
    Eye,
    UserCheck,
    UserX,
    Search
} from "lucide-react";

interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: Date;
}

interface Tip {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    title: string;
    content: string;
    imageUrl?: string;
    category: "reuse" | "recycle" | "lifestyle" | "diy" | "challenge";
    likes: string[];
    comments: Comment[];
    saves: string[];
    timestamp: Date;
}

interface Challenge {
    id: string;
    title: string;
    description: string;
    points: number;
    participants: string[]; // Array of user IDs who joined
    deadline: Date;
    icon: string;
    color: string;
    createdBy: string;
    createdByName: string;
    createdAt: Date;
}

interface LeaderboardUser {
    id: string;
    name: string;
    points: number;
    itemsRecycled: number;
    rank: number;
}

interface FriendRequest {
    id: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    status: "pending" | "accepted" | "rejected";
    createdAt: Date;
}

interface UserProfileData {
    id: string;
    name: string;
    email: string;
    totalPoints: number;
    itemsRecycled: number;
    tipsShared: number;
    challengesJoined: number;
    joinedAt: Date;
    friends: string[];
}


const defaultChallenges = [
    {
        title: "Zero Waste Week",
        description: "Go an entire week without sending anything to landfill",
        points: 500,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        icon: "🗑️",
        color: "from-emerald-500 to-green-600"
    },
    {
        title: "Plastic-Free Challenge",
        description: "Avoid single-use plastics for the entire month",
        points: 1000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        icon: "🚫",
        color: "from-blue-500 to-cyan-600"
    },
    {
        title: "Upcycle 5 Items",
        description: "Transform 5 would-be trash items into something useful",
        points: 250,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        icon: "✨",
        color: "from-purple-500 to-pink-600"
    }
];

const challengeIcons = ["🌱", "♻️", "🗑️", "🚫", "✨", "🌍", "💧", "🔋", "🚲", "🌳"];
const challengeColors = [
    "from-emerald-500 to-green-600",
    "from-blue-500 to-cyan-600",
    "from-purple-500 to-pink-600",
    "from-orange-500 to-red-500",
    "from-teal-500 to-emerald-600",
    "from-indigo-500 to-purple-600"
];

const Community = () => {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const [tips, setTips] = useState<Tip[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [showNewTipForm, setShowNewTipForm] = useState(false);
    const [showNewChallengeForm, setShowNewChallengeForm] = useState(false);
    const [newTip, setNewTip] = useState({ title: "", content: "", category: "reuse" as Tip["category"] });
    const [newChallenge, setNewChallenge] = useState({
        title: "",
        description: "",
        points: 100,
        daysUntilDeadline: 7,
        icon: "🌱",
        color: "from-emerald-500 to-green-600"
    });
    const [activeTab, setActiveTab] = useState<"feed" | "challenges" | "leaderboard" | "friends">("feed");
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [joiningChallenge, setJoiningChallenge] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [communityStats, setCommunityStats] = useState({
        totalMembers: 0,
        totalTips: 0,
        totalLikes: 0
    });

    // Friends feature state
    const [friends, setFriends] = useState<UserProfileData[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [allUsers, setAllUsers] = useState<LeaderboardUser[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const [viewingProfile, setViewingProfile] = useState<UserProfileData | null>(null);
    const [profileTips, setProfileTips] = useState<Tip[]>([]);
    const [profileChallenges, setProfileChallenges] = useState<Challenge[]>([]);
    const [sendingRequest, setSendingRequest] = useState<string | null>(null);

    // Fetch challenges from Firestore in real-time
    useEffect(() => {
        const q = query(collection(db, "challenges"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                // Initialize with default challenges if none exist
                for (const challenge of defaultChallenges) {
                    await addDoc(collection(db, "challenges"), {
                        ...challenge,
                        participants: [],
                        deadline: Timestamp.fromDate(challenge.deadline),
                        createdBy: "system",
                        createdByName: "EcoFy",
                        createdAt: serverTimestamp()
                    });
                }
                return;
            }

            const fetchedChallenges: Challenge[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedChallenges.push({
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    points: data.points,
                    participants: data.participants || [],
                    deadline: data.deadline?.toDate() || new Date(),
                    icon: data.icon,
                    color: data.color,
                    createdBy: data.createdBy,
                    createdByName: data.createdByName,
                    createdAt: data.createdAt?.toDate() || new Date()
                });
            });
            setChallenges(fetchedChallenges);
        });

        return () => unsubscribe();
    }, []);

    // Fetch tips from Firestore in real-time
    useEffect(() => {
        const q = query(collection(db, "communityTips"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTips: Tip[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedTips.push({
                    id: doc.id,
                    authorId: data.authorId,
                    authorName: data.authorName,
                    authorAvatar: data.authorAvatar,
                    title: data.title,
                    content: data.content,
                    imageUrl: data.imageUrl,
                    category: data.category,
                    likes: data.likes || [],
                    comments: (data.comments || []).map((c: any) => ({
                        ...c,
                        timestamp: c.timestamp?.toDate() || new Date()
                    })),
                    saves: data.saves || [],
                    timestamp: data.timestamp?.toDate() || new Date()
                });
            });
            setTips(fetchedTips);

            // Calculate stats
            const totalLikes = fetchedTips.reduce((acc, t) => acc + t.likes.length, 0);
            setCommunityStats(prev => ({
                ...prev,
                totalTips: fetchedTips.length,
                totalLikes
            }));
        });

        return () => unsubscribe();
    }, []);

    // Fetch leaderboard
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(10));
                const snapshot = await getDocs(q);
                const users: LeaderboardUser[] = [];
                let rank = 1;
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    users.push({
                        id: doc.id,
                        name: data.name || "Anonymous",
                        points: data.totalPoints || 0,
                        itemsRecycled: data.itemsRecycled || 0,
                        rank: rank++
                    });
                });
                setLeaderboard(users);
                setAllUsers(users); // Also set for friend search
                setCommunityStats(prev => ({ ...prev, totalMembers: users.length > 0 ? Math.max(users.length * 12, 100) : 150 }));
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            }
        };
        fetchLeaderboard();
    }, []);

    // Fetch friend requests
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "friendRequests"),
            where("toUserId", "==", user.uid),
            where("status", "==", "pending")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests: FriendRequest[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                requests.push({
                    id: doc.id,
                    fromUserId: data.fromUserId,
                    fromUserName: data.fromUserName,
                    toUserId: data.toUserId,
                    status: data.status,
                    createdAt: data.createdAt?.toDate() || new Date()
                });
            });
            setFriendRequests(requests);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch friends list with real-time updates
    useEffect(() => {
        if (!user) return;

        // Listen to current user's document for friends array changes
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userDocRef, async (snapshot) => {
            if (!snapshot.exists()) {
                setFriends([]);
                return;
            }

            const userData = snapshot.data();
            const friendIds = userData.friends || [];

            if (friendIds.length === 0) {
                setFriends([]);
                return;
            }

            // Fetch friend profiles
            try {
                const friendProfiles: UserProfileData[] = [];
                for (const friendId of friendIds.slice(0, 20)) {
                    const friendSnapshot = await getDocs(query(collection(db, "users"), where("__name__", "==", friendId)));
                    if (!friendSnapshot.empty) {
                        const data = friendSnapshot.docs[0].data();
                        friendProfiles.push({
                            id: friendId,
                            name: data.name || "Anonymous",
                            email: data.email || "",
                            totalPoints: data.totalPoints || 0,
                            itemsRecycled: data.itemsRecycled || 0,
                            tipsShared: data.tipsShared || 0,
                            challengesJoined: data.challengesJoined || 0,
                            joinedAt: data.createdAt?.toDate() || new Date(),
                            friends: data.friends || []
                        });
                    }
                }
                setFriends(friendProfiles);
            } catch (error) {
                console.error("Error fetching friends:", error);
            }
        });

        return () => unsubscribe();
    }, [user]);

    // Send friend request
    const handleSendFriendRequest = async (toUserId: string, toUserName: string) => {
        if (!user) {
            navigate("/auth");
            return;
        }

        setSendingRequest(toUserId);
        try {
            // Check if request already exists
            const existingQ = query(
                collection(db, "friendRequests"),
                where("fromUserId", "==", user.uid),
                where("toUserId", "==", toUserId)
            );
            const existing = await getDocs(existingQ);

            if (!existing.empty) {
                toast({
                    title: "Already sent",
                    description: "You've already sent a request to this user",
                });
                setSendingRequest(null);
                return;
            }

            await addDoc(collection(db, "friendRequests"), {
                fromUserId: user.uid,
                fromUserName: userProfile?.name || "Anonymous",
                toUserId,
                toUserName,
                status: "pending",
                createdAt: serverTimestamp()
            });

            toast({
                title: "Friend request sent! 🤝",
                description: `Request sent to ${toUserName}`,
            });
        } catch (error) {
            console.error("Error sending friend request:", error);
            toast({
                title: "Error",
                description: "Failed to send request. Please try again.",
                variant: "destructive"
            });
        }
        setSendingRequest(null);
    };

    // Accept friend request
    const handleAcceptFriendRequest = async (request: FriendRequest) => {
        if (!user) return;

        try {
            // Update request status
            await updateDoc(doc(db, "friendRequests", request.id), {
                status: "accepted"
            });

            // Add each other as friends
            const myRef = doc(db, "users", user.uid);
            const theirRef = doc(db, "users", request.fromUserId);

            await updateDoc(myRef, {
                friends: arrayUnion(request.fromUserId)
            });
            await updateDoc(theirRef, {
                friends: arrayUnion(user.uid)
            });

            // Award points for making a friend
            await updateDoc(myRef, { totalPoints: increment(5) });
            await updateDoc(theirRef, { totalPoints: increment(5) });

            toast({
                title: "Friend added! 🎉",
                description: `You and ${request.fromUserName} are now friends! +5 points`,
            });
        } catch (error) {
            console.error("Error accepting friend request:", error);
            toast({
                title: "Error",
                description: "Failed to accept request. Please try again.",
                variant: "destructive"
            });
        }
    };

    // Reject friend request
    const handleRejectFriendRequest = async (requestId: string) => {
        try {
            await updateDoc(doc(db, "friendRequests", requestId), {
                status: "rejected"
            });
            toast({
                title: "Request declined",
                description: "Friend request has been declined.",
            });
        } catch (error) {
            console.error("Error rejecting friend request:", error);
        }
    };

    // View user profile
    const handleViewProfile = async (userId: string) => {
        try {
            const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", userId)));
            if (userDoc.empty) return;

            const data = userDoc.docs[0].data();
            setViewingProfile({
                id: userId,
                name: data.name || "Anonymous",
                email: data.email || "",
                totalPoints: data.totalPoints || 0,
                itemsRecycled: data.itemsRecycled || 0,
                tipsShared: 0,
                challengesJoined: 0,
                joinedAt: data.createdAt?.toDate() || new Date(),
                friends: data.friends || []
            });

            // Fetch their tips
            const tipsQ = query(
                collection(db, "communityTips"),
                where("authorId", "==", userId),
                orderBy("timestamp", "desc"),
                limit(5)
            );
            const tipsSnap = await getDocs(tipsQ);
            const userTips: Tip[] = [];
            tipsSnap.forEach((doc) => {
                const tipData = doc.data();
                userTips.push({
                    id: doc.id,
                    authorId: tipData.authorId,
                    authorName: tipData.authorName,
                    title: tipData.title,
                    content: tipData.content,
                    imageUrl: tipData.imageUrl,
                    category: tipData.category,
                    likes: tipData.likes || [],
                    comments: tipData.comments || [],
                    saves: tipData.saves || [],
                    timestamp: tipData.timestamp?.toDate() || new Date()
                });
            });
            setProfileTips(userTips);

            // Fetch their challenges
            const userChallenges: Challenge[] = challenges.filter(c =>
                c.participants.includes(userId)
            );
            setProfileChallenges(userChallenges);

            // Update counts
            setViewingProfile(prev => prev ? {
                ...prev,
                tipsShared: userTips.length,
                challengesJoined: userChallenges.length
            } : null);
        } catch (error) {
            console.error("Error viewing profile:", error);
        }
    };

    // Filter users for search
    const filteredUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) &&
        u.id !== user?.uid &&
        !friends.some(f => f.id === u.id)
    );


    // Handle joining/leaving a challenge
    const handleJoinChallenge = async (challengeId: string) => {
        if (!user) {
            navigate("/auth");
            return;
        }

        setJoiningChallenge(challengeId);
        try {
            const challengeRef = doc(db, "challenges", challengeId);
            const challenge = challenges.find(c => c.id === challengeId);

            if (challenge?.participants.includes(user.uid)) {
                // Leave challenge
                await updateDoc(challengeRef, {
                    participants: arrayRemove(user.uid)
                });
                toast({
                    title: "Left Challenge",
                    description: `You've left "${challenge.title}"`,
                });
            } else {
                // Join challenge
                await updateDoc(challengeRef, {
                    participants: arrayUnion(user.uid)
                });

                // Award bonus points for joining
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                    totalPoints: increment(5)
                });

                toast({
                    title: "Joined Challenge! 🎉",
                    description: `You've joined "${challenge?.title}". +5 bonus points!`,
                });
            }
        } catch (error) {
            console.error("Error joining challenge:", error);
            toast({
                title: "Error",
                description: "Failed to update challenge. Please try again.",
                variant: "destructive"
            });
        }
        setJoiningChallenge(null);
    };

    // Handle creating a new challenge
    const handleCreateChallenge = async () => {
        if (!user || !newChallenge.title.trim() || !newChallenge.description.trim()) {
            if (!user) navigate("/auth");
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "challenges"), {
                title: newChallenge.title,
                description: newChallenge.description,
                points: newChallenge.points,
                participants: [user.uid], // Creator auto-joins
                deadline: Timestamp.fromDate(new Date(Date.now() + newChallenge.daysUntilDeadline * 24 * 60 * 60 * 1000)),
                icon: newChallenge.icon,
                color: newChallenge.color,
                createdBy: user.uid,
                createdByName: userProfile?.name || user.displayName || "Anonymous",
                createdAt: serverTimestamp()
            });

            // Award points for creating a challenge
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                totalPoints: increment(25)
            });

            toast({
                title: "Challenge Created! 🌟",
                description: `"${newChallenge.title}" is now live! +25 points for creating a challenge!`,
            });

            setNewChallenge({
                title: "",
                description: "",
                points: 100,
                daysUntilDeadline: 7,
                icon: "🌱",
                color: "from-emerald-500 to-green-600"
            });
            setShowNewChallengeForm(false);
        } catch (error) {
            console.error("Error creating challenge:", error);
            toast({
                title: "Error",
                description: "Failed to create challenge. Please try again.",
                variant: "destructive"
            });
        }
        setIsSubmitting(false);
    };



    const handleLike = async (tipId: string) => {
        if (!user) {
            navigate("/auth");
            return;
        }

        const tipRef = doc(db, "communityTips", tipId);
        const tip = tips.find(t => t.id === tipId);

        if (tip?.likes.includes(user.uid)) {
            await updateDoc(tipRef, {
                likes: arrayRemove(user.uid)
            });
        } else {
            await updateDoc(tipRef, {
                likes: arrayUnion(user.uid)
            });
        }
    };

    const handleSave = async (tipId: string) => {
        if (!user) {
            navigate("/auth");
            return;
        }

        const tipRef = doc(db, "communityTips", tipId);
        const tip = tips.find(t => t.id === tipId);

        if (tip?.saves.includes(user.uid)) {
            await updateDoc(tipRef, {
                saves: arrayRemove(user.uid)
            });
        } else {
            await updateDoc(tipRef, {
                saves: arrayUnion(user.uid)
            });
        }
    };

    const handleAddComment = async (tipId: string) => {
        if (!user || !newComment[tipId]?.trim()) return;

        const tipRef = doc(db, "communityTips", tipId);
        const comment = {
            id: Date.now().toString(),
            authorId: user.uid,
            authorName: userProfile?.name || user.displayName || "Anonymous",
            content: newComment[tipId],
            timestamp: Timestamp.now()
        };

        await updateDoc(tipRef, {
            comments: arrayUnion(comment)
        });

        setNewComment(prev => ({ ...prev, [tipId]: "" }));
    };

    // Handle image selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast({
                    title: "Image too large",
                    description: "Please select an image under 5MB",
                    variant: "destructive"
                });
                return;
            }
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Remove selected image
    const removeSelectedImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmitTip = async () => {
        if (!user || !newTip.title.trim() || !newTip.content.trim()) {
            if (!user) navigate("/auth");
            return;
        }

        setIsSubmitting(true);
        try {
            let imageUrl = "";

            // Upload image if selected
            if (selectedImage) {
                const imageRef = ref(storage, `community-tips/${user.uid}/${Date.now()}_${selectedImage.name}`);
                await uploadBytes(imageRef, selectedImage);
                imageUrl = await getDownloadURL(imageRef);
            }

            await addDoc(collection(db, "communityTips"), {
                authorId: user.uid,
                authorName: userProfile?.name || user.displayName || "Anonymous",
                title: newTip.title,
                content: newTip.content,
                category: newTip.category,
                imageUrl: imageUrl || null,
                likes: [],
                comments: [],
                saves: [],
                timestamp: serverTimestamp()
            });

            // Award points for sharing a tip (more points if includes image)
            const pointsToAward = imageUrl ? 15 : 10;
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                totalPoints: increment(pointsToAward)
            });

            toast({
                title: "Tip Shared! 🌱",
                description: `Your eco tip has been posted! +${pointsToAward} points${imageUrl ? " (bonus for image!)" : ""}`,
            });

            setNewTip({ title: "", content: "", category: "reuse" });
            removeSelectedImage();
            setShowNewTipForm(false);
        } catch (error) {
            console.error("Error submitting tip:", error);
            toast({
                title: "Error",
                description: "Failed to post tip. Please try again.",
                variant: "destructive"
            });
        }
        setIsSubmitting(false);
    };

    const getCategoryColor = (category: Tip["category"]) => {
        switch (category) {
            case "reuse": return "bg-blue-100 text-blue-700 border-blue-200";
            case "recycle": return "bg-green-100 text-green-700 border-green-200";
            case "lifestyle": return "bg-purple-100 text-purple-700 border-purple-200";
            case "diy": return "bg-orange-100 text-orange-700 border-orange-200";
            case "challenge": return "bg-pink-100 text-pink-700 border-pink-200";
        }
    };

    const getCategoryEmoji = (category: Tip["category"]) => {
        switch (category) {
            case "reuse": return "🔁";
            case "recycle": return "♻️";
            case "lifestyle": return "🌍";
            case "diy": return "🛠️";
            case "challenge": return "🏆";
        }
    };

    const formatTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const filteredTips = tips
        .filter(tip => filterCategory === "all" || tip.category === filterCategory)
        .sort((a, b) => {
            if (sortBy === "popular") {
                return b.likes.length - a.likes.length;
            }
            return b.timestamp.getTime() - a.timestamp.getTime();
        });

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
            case 2: return <Medal className="w-5 h-5 text-gray-400" />;
            case 3: return <Medal className="w-5 h-5 text-amber-600" />;
            default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</span>;
        }
    };

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #fafffe 35%, #f0fdfa 65%, #faf5ff08 100%)' }}>
            {/* ──── Frosted Header ──── */}
            <div className="bg-white/70 backdrop-blur-2xl border-b border-white/60 py-3 px-4 sm:px-6 sticky top-0 z-50" style={{ boxShadow: '0 1px 24px rgba(0,0,0,0.04)' }}>
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div
                        className="flex items-center gap-2.5 cursor-pointer group"
                        onClick={() => navigate("/")}
                    >
                        <div className="relative">
                            <img src="/ecofy-logo.png" alt="EcoFy" className="w-9 h-9 relative z-10" />
                            <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-lg scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent tracking-tight">
                            Midori
                        </span>
                    </div>
                    <div className="flex gap-2 items-center">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-gray-800">{userProfile?.name || "Eco Warrior"}</p>
                                    <p className="text-xs font-semibold text-emerald-600 tabular-nums">{userProfile?.totalPoints || 0} pts</p>
                                </div>
                                <div
                                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold cursor-pointer ring-2 ring-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                                    onClick={() => navigate("/profile")}
                                >
                                    {(userProfile?.name || "U").charAt(0)}
                                </div>
                            </div>
                        ) : (
                            <Button
                                onClick={() => navigate("/auth")}
                                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-md shadow-emerald-200 h-10"
                            >
                                Join Community
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/chat")}
                            className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl font-semibold"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Back</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                {/* ──── Ambient Hero ──── */}
                <div className="relative text-center mb-10 overflow-hidden">
                    {/* Ambient gradient orbs */}
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-300/20 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute -top-10 right-0 w-48 h-48 bg-teal-300/15 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute bottom-0 left-1/3 w-56 h-56 bg-violet-300/10 rounded-full blur-[100px] pointer-events-none" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-emerald-700 px-4 py-2 rounded-full mb-5 shadow-sm border border-white/60">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider">{communityStats.totalMembers.toLocaleString()}+ Eco Warriors active</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight leading-[1.1]">
                            Midori <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Community</span> 🌍
                        </h1>
                        <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto font-medium leading-relaxed">
                            Share tips, crush challenges, and climb the leaderboard with the eco community.
                        </p>
                    </div>
                </div>

                {/* ──── Animated Segmented Tab Bar ──── */}
                <div className="flex justify-center mb-10">
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-white/60 inline-flex flex-wrap justify-center gap-1">
                        {[
                            { id: "feed", label: "Feed", icon: MessageSquare },
                            { id: "challenges", label: "Challenges", icon: Target },
                            { id: "leaderboard", label: "Rankings", icon: Trophy },
                            { id: "friends", label: "Network", icon: Users }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm transition-all duration-300 min-h-[44px] ${activeTab === tab.id
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200/60"
                                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-100' : ''}`} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ──── Premium Stat Cards ──── */}
                <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-10">
                    {[
                        { icon: Leaf, value: communityStats.totalTips, label: 'TIPS SHARED', color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600' },
                        { icon: Heart, value: communityStats.totalLikes, label: 'TOTAL LIKES', color: 'rose', bg: 'bg-rose-100', text: 'text-rose-500' },
                        { icon: TrendingUp, value: communityStats.totalMembers.toLocaleString(), label: 'MEMBERS', color: 'violet', bg: 'bg-violet-100', text: 'text-violet-500' }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/60 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.bg} rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.text}`} />
                            </div>
                            <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums tracking-tight">{stat.value}</p>
                            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Feed Tab */}
                {activeTab === "feed" && (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Feed */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Filters & Sort */}
                            <div className="flex flex-wrap gap-4 items-center justify-between bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => setFilterCategory("all")}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterCategory === "all"
                                            ? "bg-gray-800 text-white shadow-md shadow-gray-200"
                                            : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-100 shadow-sm"
                                            }`}
                                    >
                                        All Focus
                                    </button>
                                    {(["reuse", "recycle", "lifestyle", "diy"] as const).map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setFilterCategory(cat)}
                                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filterCategory === cat
                                                ? getCategoryColor(cat) + " shadow-md"
                                                : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-100 shadow-sm"
                                                }`}
                                        >
                                            {getCategoryEmoji(cat)} {cat}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSortBy("recent")}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${sortBy === "recent" ? "bg-gray-800 text-white" : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm"
                                            }`}
                                    >
                                        <Clock className="w-4 h-4" /> Recent
                                    </button>
                                    <button
                                        onClick={() => setSortBy("popular")}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${sortBy === "popular" ? "bg-rose-500 text-white shadow-md shadow-rose-200" : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm"
                                            }`}
                                    >
                                        <Flame className="w-4 h-4" /> Trending
                                    </button>
                                </div>
                            </div>

                            {/* New Tip Button Header - Refined look */}
                            {!showNewTipForm && (
                                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-sm border border-white flex items-center gap-4 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm">
                                        {(userProfile?.name || "U").charAt(0)}
                                    </div>
                                    <button
                                        onClick={() => user ? setShowNewTipForm(true) : navigate("/auth")}
                                        className="flex-1 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl py-3.5 px-5 text-left text-gray-500 font-medium border border-gray-100"
                                    >
                                        Share your green highlight of the week...
                                    </button>
                                    <Button
                                        onClick={() => user ? setShowNewTipForm(true) : navigate("/auth")}
                                        size="icon"
                                        className="bg-emerald-600 hover:bg-emerald-700 rounded-xl w-12 h-12 flex-shrink-0 shadow-md shadow-emerald-200"
                                    >
                                        <PlusCircle className="w-6 h-6" />
                                    </Button>
                                </div>
                            )}

                            {/* New Tip Form */}
                            {showNewTipForm && (
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-200 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-green-500" />
                                            Share Your Tip
                                        </h3>
                                        <button onClick={() => { setShowNewTipForm(false); removeSelectedImage(); }} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <Input
                                        placeholder="Give your tip a catchy title..."
                                        value={newTip.title}
                                        onChange={(e) => setNewTip({ ...newTip, title: e.target.value })}
                                        className="mb-3"
                                    />

                                    <Textarea
                                        placeholder="Share your eco wisdom... What's a tip that has helped you live more sustainably?"
                                        value={newTip.content}
                                        onChange={(e) => setNewTip({ ...newTip, content: e.target.value })}
                                        className="mb-3 min-h-[120px]"
                                    />


                                    {/* Image Upload Section - Disabled (requires Firebase Blaze plan)
                                    <div className="mb-4">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            className="hidden"
                                            id="tip-image-upload"
                                        />

                                        {imagePreview ? (
                                            <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-48 object-cover"
                                                />
                                                <button
                                                    onClick={removeSelectedImage}
                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-md"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                    <ImageIcon className="w-3 h-3" />
                                                    +5 bonus points!
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                <ImageIcon className="w-5 h-5" />
                                                Add an image (+5 bonus points)
                                            </button>
                                        )}
                                    </div>
                                    */}

                                    <div className="flex gap-2 mb-4 flex-wrap">
                                        {(["reuse", "recycle", "lifestyle", "diy"] as const).map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => setNewTip({ ...newTip, category: cat })}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${newTip.category === cat
                                                    ? getCategoryColor(cat) + " ring-2 ring-offset-2 ring-green-400"
                                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                                    }`}
                                            >
                                                {getCategoryEmoji(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSubmitTip}
                                            className="bg-green-600 hover:bg-green-700 flex-1"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4 mr-2" />
                                            )}
                                            Post Tip (+10 pts)
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => { setShowNewTipForm(false); removeSelectedImage(); }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Tips List */}
                            <div className="space-y-6">
                                {filteredTips.length === 0 ? (
                                    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 text-center shadow-sm border border-white">
                                        <Leaf className="w-16 h-16 text-emerald-200 mx-auto mb-6" />
                                        <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Your feed is a blank canvas</h3>
                                        <p className="text-gray-500 mb-8 font-medium">Be the first to plant a seed of inspiration!</p>
                                        <Button
                                            onClick={() => user ? setShowNewTipForm(true) : navigate("/auth")}
                                            className="bg-emerald-600 hover:bg-emerald-700 rounded-full px-8 py-6 text-lg font-bold shadow-lg shadow-emerald-200 uppercase tracking-wide"
                                        >
                                            Share Impact
                                        </Button>
                                    </div>
                                ) : (
                                    filteredTips.map((tip) => (
                                        <div
                                            key={tip.id}
                                            className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group"
                                        >
                                            <div className="flex items-start justify-between mb-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-bold shadow-sm ring-1 ring-gray-200 relative">
                                                        {tip.authorName.charAt(0)}
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 leading-none mb-1 text-lg">{tip.authorName}</p>
                                                        <p className="text-sm font-semibold text-gray-400 flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {formatTimeAgo(tip.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${getCategoryColor(tip.category)} shadow-sm`}>
                                                    {getCategoryEmoji(tip.category)} <span className="ml-1">{tip.category}</span>
                                                </span>
                                            </div>

                                            {/* Display tip image if exists */}
                                            {tip.imageUrl && (
                                                <div className="mb-4 -mx-6 -mt-1">
                                                    <img
                                                        src={tip.imageUrl}
                                                        alt={tip.title}
                                                        className="w-full h-64 object-cover"
                                                    />
                                                </div>
                                            )}

                                            <h3 className="font-bold text-lg text-gray-800 mb-2">{tip.title}</h3>
                                            <p className="text-gray-600 mb-4 leading-relaxed">{tip.content}</p>

                                            {/* Actions */}
                                            <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleLike(tip.id)}
                                                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${user && tip.likes.includes(user.uid)
                                                        ? "text-red-500"
                                                        : "text-gray-500 hover:text-red-500"
                                                        }`}
                                                >
                                                    <Heart className={`w-4 h-4 ${user && tip.likes.includes(user.uid) ? "fill-current" : ""}`} />
                                                    {tip.likes.length}
                                                </button>
                                                <button
                                                    onClick={() => setExpandedComments(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(tip.id)) {
                                                            next.delete(tip.id);
                                                        } else {
                                                            next.add(tip.id);
                                                        }
                                                        return next;
                                                    })}
                                                    className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-green-500 transition-colors"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    {tip.comments.length}
                                                    {expandedComments.has(tip.id) ? (
                                                        <ChevronUp className="w-3 h-3" />
                                                    ) : (
                                                        <ChevronDown className="w-3 h-3" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleSave(tip.id)}
                                                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${user && tip.saves.includes(user.uid)
                                                        ? "text-yellow-500"
                                                        : "text-gray-500 hover:text-yellow-500"
                                                        }`}
                                                >
                                                    <BookmarkPlus className={`w-4 h-4 ${user && tip.saves.includes(user.uid) ? "fill-current" : ""}`} />
                                                    Save
                                                </button>
                                                <button
                                                    className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-500 transition-colors ml-auto"
                                                    onClick={() => {
                                                        navigator.share?.({
                                                            title: tip.title,
                                                            text: tip.content,
                                                            url: window.location.href
                                                        });
                                                    }}
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                    Share
                                                </button>
                                            </div>

                                            {/* Comments Section */}
                                            {expandedComments.has(tip.id) && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {/* Existing Comments */}
                                                    {tip.comments.length > 0 && (
                                                        <div className="space-y-3 mb-4">
                                                            {tip.comments.map((comment) => (
                                                                <div key={comment.id} className="flex gap-3">
                                                                    <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                                        {comment.authorName.charAt(0)}
                                                                    </div>
                                                                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-sm font-medium text-gray-800">{comment.authorName}</span>
                                                                            <span className="text-xs text-gray-400">{formatTimeAgo(comment.timestamp)}</span>
                                                                        </div>
                                                                        <p className="text-sm text-gray-600">{comment.content}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Add Comment */}
                                                    {user ? (
                                                        <div className="flex gap-2">
                                                            <Input
                                                                placeholder="Write a comment..."
                                                                value={newComment[tip.id] || ""}
                                                                onChange={(e) => setNewComment(prev => ({ ...prev, [tip.id]: e.target.value }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        handleAddComment(tip.id);
                                                                    }
                                                                }}
                                                                className="flex-1"
                                                            />
                                                            <Button
                                                                onClick={() => handleAddComment(tip.id)}
                                                                size="icon"
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                <Send className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => navigate("/auth")}
                                                            className="text-sm text-green-600 hover:underline"
                                                        >
                                                            Log in to comment
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Active Challenges Preview */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
                                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-green-500" />
                                    Active Challenges
                                </h3>
                                <div className="space-y-3">
                                    {challenges.slice(0, 2).map((challenge) => (
                                        <div
                                            key={challenge.id}
                                            className="p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 cursor-pointer hover:shadow-sm transition-all"
                                            onClick={() => setActiveTab("challenges")}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">{challenge.icon}</span>
                                                <span className="font-medium text-gray-800 text-sm">{challenge.title}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>{challenge.participants.length} participants</span>
                                                <span className="text-green-600 font-medium">+{challenge.points} pts</span>
                                            </div>
                                        </div>
                                    ))}
                                    {challenges.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-2">Loading challenges...</p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full mt-3 text-green-600 hover:bg-green-50"
                                    onClick={() => setActiveTab("challenges")}
                                >
                                    View All Challenges
                                </Button>
                            </div>

                            {/* Top Contributors */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
                                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    Top Contributors
                                </h3>
                                <div className="space-y-3">
                                    {leaderboard.slice(0, 5).map((user) => (
                                        <div key={user.id} className="flex items-center gap-3">
                                            {getRankIcon(user.rank)}
                                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                                                <p className="text-xs text-gray-500">{user.points} points</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full mt-3 text-green-600 hover:bg-green-50"
                                    onClick={() => setActiveTab("leaderboard")}
                                >
                                    View Full Leaderboard
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════ Challenges Tab ════ */}
                {activeTab === "challenges" && (
                    <div className="space-y-8">
                        {/* Create Challenge Form */}
                        {showNewChallengeForm && (
                            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-black text-xl text-gray-900 flex items-center gap-3 tracking-tight">
                                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                                            <Zap className="w-5 h-5 text-violet-600" />
                                        </div>
                                        New Challenge
                                    </h3>
                                    <button onClick={() => setShowNewChallengeForm(false)} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400 transition-all">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <Input
                                    placeholder="Challenge title (e.g., 'No Plastic Week')"
                                    value={newChallenge.title}
                                    onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                                    className="mb-4 rounded-xl border-gray-200 focus:border-emerald-300 focus:ring-emerald-200 bg-gray-50/50 h-12 font-medium"
                                />

                                <Textarea
                                    placeholder="Describe the challenge and what participants should do..."
                                    value={newChallenge.description}
                                    onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                                    className="mb-4 min-h-[100px] rounded-xl border-gray-200 focus:border-emerald-300 focus:ring-emerald-200 bg-gray-50/50 resize-none"
                                />

                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Points Reward</label>
                                        <Input
                                            type="number"
                                            min="50"
                                            max="1000"
                                            value={newChallenge.points}
                                            onChange={(e) => setNewChallenge({ ...newChallenge, points: parseInt(e.target.value) || 100 })}
                                            className="rounded-xl border-gray-200 bg-gray-50/50 h-11"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Duration (days)</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="90"
                                            value={newChallenge.daysUntilDeadline}
                                            onChange={(e) => setNewChallenge({ ...newChallenge, daysUntilDeadline: parseInt(e.target.value) || 7 })}
                                            className="rounded-xl border-gray-200 bg-gray-50/50 h-11"
                                        />
                                    </div>
                                </div>

                                <div className="mb-5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Icon</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {challengeIcons.map((icon) => (
                                            <button
                                                key={icon}
                                                onClick={() => setNewChallenge({ ...newChallenge, icon })}
                                                className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all ${newChallenge.icon === icon
                                                    ? "bg-emerald-100 ring-2 ring-emerald-500 shadow-sm"
                                                    : "bg-gray-50 hover:bg-gray-100 border border-gray-100"
                                                    }`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Color Theme</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {challengeColors.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setNewChallenge({ ...newChallenge, color })}
                                                className={`w-11 h-11 rounded-xl bg-gradient-to-r ${color} transition-all ${newChallenge.color === color
                                                    ? "ring-2 ring-offset-2 ring-emerald-500 scale-110"
                                                    : "hover:scale-105"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleCreateChallenge}
                                        className="bg-emerald-600 hover:bg-emerald-700 flex-1 rounded-xl h-12 font-bold shadow-md shadow-emerald-200 transition-all hover:shadow-lg"
                                        disabled={isSubmitting || !newChallenge.title.trim() || !newChallenge.description.trim()}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        ) : (
                                            <Zap className="w-5 h-5 mr-2" />
                                        )}
                                        Launch Challenge
                                        <span className="ml-2 text-emerald-200 text-sm">+25 pts</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowNewChallengeForm(false)}
                                        className="rounded-xl h-12 border-gray-200 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Challenge Grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {challenges.map((challenge) => {
                                const isJoined = user && challenge.participants.includes(user.uid);
                                const isLoading = joiningChallenge === challenge.id;
                                const daysRemaining = Math.ceil((challenge.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                const participantProgress = Math.min(100, challenge.participants.length * 5);
                                const difficulty = challenge.points >= 200 ? 'Hard' : challenge.points >= 100 ? 'Medium' : 'Easy';
                                const difficultyColor = difficulty === 'Hard' ? 'bg-red-100 text-red-600' : difficulty === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600';

                                return (
                                    <div
                                        key={challenge.id}
                                        className="bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-white hover:shadow-[0_12px_40px_rgb(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 group"
                                    >
                                        {/* Card Header */}
                                        <div className={`bg-gradient-to-br ${challenge.color} p-5 sm:p-6 text-white relative overflow-hidden`}>
                                            {/* Decorative circle */}
                                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                                            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />

                                            <div className="relative z-10">
                                                <div className="flex items-start justify-between mb-3">
                                                    <span className="text-3xl">{challenge.icon}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${difficultyColor}`}>
                                                            {difficulty}
                                                        </span>
                                                        {isJoined && (
                                                            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
                                                                <Check className="w-3 h-3" /> Joined
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-black mb-1 tracking-tight">{challenge.title}</h3>
                                                <p className="text-white/70 text-sm font-medium line-clamp-2">{challenge.description}</p>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-5 sm:p-6">
                                            {/* Stats Row */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    {/* Participant avatar stack */}
                                                    <div className="flex -space-x-2">
                                                        {[...Array(Math.min(3, challenge.participants.length))].map((_, i) => (
                                                            <div key={i} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 border-2 border-white">
                                                                {String.fromCharCode(65 + i)}
                                                            </div>
                                                        ))}
                                                        {challenge.participants.length > 3 && (
                                                            <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-[10px] font-black text-emerald-600 border-2 border-white">
                                                                +{challenge.participants.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-semibold text-gray-400">{challenge.participants.length} joined</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-xl">
                                                    <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                                                    <span className="text-sm font-black text-emerald-600 tabular-nums">+{challenge.points}</span>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between text-xs mb-1.5">
                                                    <span className="font-semibold text-gray-400 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> Time remaining
                                                    </span>
                                                    <span className={`font-black tabular-nums ${daysRemaining < 3 ? 'text-red-500' : 'text-gray-500'}`}>
                                                        {daysRemaining > 0 ? `${daysRemaining}d left` : 'Ended'}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full bg-gradient-to-r ${challenge.color} transition-all duration-1000 ease-out`}
                                                        style={{ width: `${participantProgress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {challenge.createdBy !== "system" && (
                                                <p className="text-xs font-medium text-gray-300 mb-4">by {challenge.createdByName}</p>
                                            )}

                                            {/* CTA Button */}
                                            <Button
                                                className={`w-full rounded-xl h-11 font-bold transition-all duration-300 ${isJoined
                                                    ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-200"
                                                    : "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 group-hover:shadow-lg"
                                                    }`}
                                                onClick={() => handleJoinChallenge(challenge.id)}
                                                disabled={isLoading || daysRemaining <= 0}
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : isJoined ? (
                                                    <span className="flex items-center gap-2"><UserX className="w-4 h-4" /> Leave Challenge</span>
                                                ) : user ? (
                                                    <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Join Challenge</span>
                                                ) : (
                                                    "Login to Join"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Empty State */}
                        {challenges.length === 0 && (
                            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 text-center shadow-sm border border-white">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Target className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Loading challenges...</h3>
                                <p className="text-gray-400 font-medium">Challenges will appear here shortly.</p>
                            </div>
                        )}

                        {/* Create Challenge CTA */}
                        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-3xl p-8 sm:p-10 text-white text-center overflow-hidden">
                            {/* Decorative */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-5">
                                    <Award className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">Create Your Own Challenge</h3>
                                <p className="text-white/70 mb-7 max-w-md mx-auto font-medium">
                                    Have an idea for a community challenge? Create one and earn 25 bonus points!
                                </p>
                                <Button
                                    className="bg-white text-emerald-600 hover:bg-gray-50 rounded-xl h-12 px-8 font-bold shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                                    onClick={() => user ? setShowNewChallengeForm(true) : navigate("/auth")}
                                >
                                    <PlusCircle className="w-5 h-5 mr-2" />
                                    {user ? "Create Challenge" : "Login to Create"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════ Leaderboard / Rankings Tab ════ */}
                {activeTab === "leaderboard" && (
                    <div className="max-w-2xl mx-auto space-y-8">
                        {/* Podium - Top 3 */}
                        {leaderboard.length >= 3 && (
                            <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
                                {/* 2nd Place */}
                                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xl font-black mb-2 ring-4 ring-gray-200 shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => handleViewProfile(leaderboard[1].id)}>
                                        {leaderboard[1].name.charAt(0)}
                                    </div>
                                    <p className="font-black text-gray-800 text-center text-sm truncate w-full">{leaderboard[1].name}</p>
                                    <p className="text-xs font-bold text-emerald-600 tabular-nums">{leaderboard[1].points} pts</p>
                                    <div className="h-24 sm:h-28 w-full bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-2xl mt-3 flex items-start justify-center pt-3 relative">
                                        <span className="text-2xl">🥈</span>
                                    </div>
                                </div>
                                {/* 1st Place */}
                                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="relative">
                                        <div className="absolute -inset-2 bg-yellow-400/20 rounded-full blur-xl" />
                                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-300 to-amber-400 rounded-full flex items-center justify-center text-white text-2xl font-black mb-2 ring-4 ring-yellow-300 shadow-xl cursor-pointer hover:scale-105 transition-transform" onClick={() => handleViewProfile(leaderboard[0].id)}>
                                            {leaderboard[0].name.charAt(0)}
                                        </div>
                                    </div>
                                    <p className="font-black text-gray-900 text-center text-sm sm:text-base truncate w-full">{leaderboard[0].name}</p>
                                    <p className="text-sm font-black text-emerald-600 tabular-nums">{leaderboard[0].points} pts</p>
                                    <div className="h-32 sm:h-36 w-full bg-gradient-to-t from-yellow-300 to-amber-200 rounded-t-2xl mt-3 flex items-start justify-center pt-3 relative shadow-lg shadow-amber-200/30">
                                        <Crown className="w-8 h-8 text-amber-600" />
                                    </div>
                                </div>
                                {/* 3rd Place */}
                                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xl font-black mb-2 ring-4 ring-amber-200 shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => handleViewProfile(leaderboard[2].id)}>
                                        {leaderboard[2].name.charAt(0)}
                                    </div>
                                    <p className="font-black text-gray-800 text-center text-sm truncate w-full">{leaderboard[2].name}</p>
                                    <p className="text-xs font-bold text-emerald-600 tabular-nums">{leaderboard[2].points} pts</p>
                                    <div className="h-20 sm:h-24 w-full bg-gradient-to-t from-amber-200 to-amber-100 rounded-t-2xl mt-3 flex items-start justify-center pt-3 relative">
                                        <span className="text-2xl">🥉</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Full Rankings */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-white overflow-hidden">
                            <div className="p-5 border-b border-gray-50">
                                <h3 className="font-black text-base text-gray-900 flex items-center gap-2.5 tracking-tight">
                                    <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                                        <Trophy className="w-4 h-4 text-yellow-600" />
                                    </div>
                                    Full Rankings
                                    {leaderboard.length > 0 && (
                                        <span className="ml-auto text-xs font-semibold text-gray-300">{leaderboard.length} members</span>
                                    )}
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {leaderboard.map((leaderUser) => {
                                    const isCurrentUser = user?.uid === leaderUser.id;
                                    const percentile = leaderboard.length > 0 ? Math.round((leaderUser.rank / leaderboard.length) * 100) : 0;
                                    return (
                                        <div
                                            key={leaderUser.id}
                                            onClick={() => handleViewProfile(leaderUser.id)}
                                            className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer transition-all duration-200 ${isCurrentUser
                                                ? "bg-emerald-50/50 hover:bg-emerald-50"
                                                : "hover:bg-gray-50"
                                                }`}
                                        >
                                            <div className="w-8 flex justify-center">
                                                {leaderUser.rank <= 3 ? (
                                                    <span className="text-lg">{leaderUser.rank === 1 ? '🥇' : leaderUser.rank === 2 ? '🥈' : '🥉'}</span>
                                                ) : (
                                                    <span className="text-sm font-black text-gray-300 tabular-nums">#{leaderUser.rank}</span>
                                                )}
                                            </div>
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold ring-1 ring-gray-200 flex-shrink-0">
                                                {leaderUser.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                                    <span className="truncate">{leaderUser.name}</span>
                                                    {isCurrentUser && (
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider flex-shrink-0">You</span>
                                                    )}
                                                </p>
                                                <p className="text-xs font-medium text-gray-400">{leaderUser.itemsRecycled} items recycled</p>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                {percentile <= 25 && (
                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hidden sm:block">Top {percentile}%</span>
                                                )}
                                                <div>
                                                    <p className="font-black text-emerald-600 tabular-nums text-sm">{leaderUser.points}</p>
                                                    <p className="text-[10px] font-semibold text-gray-300 uppercase">pts</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {leaderboard.length === 0 && (
                                <div className="p-12 text-center">
                                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Trophy className="w-7 h-7 text-gray-300" />
                                    </div>
                                    <p className="font-bold text-gray-400">No leaderboard data yet.</p>
                                    <p className="text-sm text-gray-300 mt-1">Be the first to earn points!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ════ Friends / Network Tab ════ */}
                {activeTab === "friends" && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {!user ? (
                            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-10 sm:p-12 text-center shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-white">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                    <Users className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Connect with Eco Warriors</h3>
                                <p className="text-gray-400 mb-6 max-w-sm mx-auto font-medium">Login to add friends, share tips, and see each other's eco activities!</p>
                                <Button onClick={() => navigate("/auth")} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 px-8 font-bold shadow-md shadow-emerald-200">
                                    Login to Continue
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Friend Requests */}
                                {friendRequests.length > 0 && (
                                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-white">
                                        <h3 className="font-black text-base text-gray-900 mb-5 flex items-center gap-2.5 tracking-tight">
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                                <UserPlus className="w-4 h-4 text-amber-600" />
                                            </div>
                                            Friend Requests
                                            <span className="ml-1 w-6 h-6 bg-amber-500 text-white rounded-full text-xs font-black flex items-center justify-center">{friendRequests.length}</span>
                                        </h3>
                                        <div className="space-y-3">
                                            {friendRequests.map((request) => (
                                                <div key={request.id} className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold ring-1 ring-gray-200">
                                                            {request.fromUserName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-800 text-sm">{request.fromUserName}</p>
                                                            <p className="text-xs font-medium text-gray-400">wants to connect</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAcceptFriendRequest(request)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-9 px-4 font-bold shadow-sm"
                                                        >
                                                            <UserCheck className="w-4 h-4 mr-1" />
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleRejectFriendRequest(request.id)}
                                                            className="rounded-xl h-9 border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Add Friends Search */}
                                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-white">
                                    <h3 className="font-black text-base text-gray-900 mb-5 flex items-center gap-2.5 tracking-tight">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <UserPlus className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        Find People
                                    </h3>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <Input
                                            placeholder="Search people by name..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="pl-11 rounded-xl border-gray-200 bg-gray-50/50 h-11 focus:border-emerald-300 focus:ring-emerald-200"
                                        />
                                    </div>
                                    {userSearch && (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.slice(0, 10).map((u) => (
                                                    <div key={u.id} className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl hover:bg-emerald-50/50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold ring-1 ring-gray-200">
                                                                {u.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-800 text-sm">{u.name}</p>
                                                                <p className="text-xs font-semibold text-emerald-600 tabular-nums">{u.points} pts</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleViewProfile(u.id)}
                                                                className="rounded-xl h-9 border-gray-200"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleSendFriendRequest(u.id, u.name)}
                                                                disabled={sendingRequest === u.id}
                                                                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-9"
                                                            >
                                                                {sendingRequest === u.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <UserPlus className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-6 text-center">
                                                    <p className="text-sm font-medium text-gray-400">No users found matching "{userSearch}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* My Friends List */}
                                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-white">
                                    <h3 className="font-black text-base text-gray-900 mb-5 flex items-center gap-2.5 tracking-tight">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-blue-600" />
                                        </div>
                                        My Friends
                                        <span className="ml-1 text-xs font-bold text-gray-300">{friends.length}</span>
                                    </h3>
                                    {friends.length > 0 ? (
                                        <div className="grid sm:grid-cols-2 gap-3">
                                            {friends.map((friend) => (
                                                <button
                                                    key={friend.id}
                                                    onClick={() => handleViewProfile(friend.id)}
                                                    className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-emerald-50/30 hover:border-emerald-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group"
                                                >
                                                    <div className="relative">
                                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg ring-1 ring-gray-200">
                                                            {friend.name.charAt(0)}
                                                        </div>
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-800 text-sm truncate">{friend.name}</p>
                                                        <p className="text-xs font-semibold text-emerald-600 tabular-nums">{friend.totalPoints} pts</p>
                                                        <p className="text-[11px] font-medium text-gray-400">{friend.itemsRecycled} items recycled</p>
                                                    </div>
                                                    <Eye className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <Users className="w-7 h-7 text-gray-300" />
                                            </div>
                                            <p className="font-bold text-gray-400">No friends yet!</p>
                                            <p className="text-sm font-medium text-gray-300 mt-1">Search for people above to start connecting</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ════ Premium Profile Modal ════ */}
            {
                viewingProfile && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000] p-4" onClick={() => setViewingProfile(null)}>
                        <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            {/* Profile Header */}
                            <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 sm:p-8 text-white rounded-t-3xl relative overflow-hidden">
                                {/* Decorative */}
                                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="relative">
                                            <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-black">
                                                {viewingProfile.name.charAt(0)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setViewingProfile(null)}
                                            className="w-9 h-9 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight">{viewingProfile.name}</h2>
                                    <p className="text-white/60 text-sm font-medium mt-1">
                                        Member since {viewingProfile.joinedAt.toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Profile Body */}
                            <div className="p-6 sm:p-8">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
                                    {[
                                        { icon: Trophy, value: viewingProfile.totalPoints, label: 'Points', color: 'yellow' },
                                        { icon: Leaf, value: viewingProfile.itemsRecycled, label: 'Recycled', color: 'emerald' },
                                        { icon: MessageSquare, value: viewingProfile.tipsShared, label: 'Tips', color: 'blue' },
                                        { icon: Target, value: viewingProfile.challengesJoined, label: 'Challenges', color: 'violet' }
                                    ].map((stat, idx) => (
                                        <div key={idx} className={`text-center p-3 bg-${stat.color === 'yellow' ? 'amber' : stat.color}-50/50 rounded-2xl`}>
                                            <stat.icon className={`w-4 h-4 text-${stat.color === 'yellow' ? 'amber' : stat.color}-500 mx-auto mb-1.5`} />
                                            <p className="text-lg font-black text-gray-900 tabular-nums">{stat.value}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Active Challenges */}
                                {profileChallenges.length > 0 && (
                                    <div className="mb-5">
                                        <h3 className="font-black text-sm text-gray-900 mb-3 flex items-center gap-2 tracking-tight">
                                            <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                                                <Target className="w-3 h-3 text-violet-600" />
                                            </div>
                                            Active Challenges
                                        </h3>
                                        <div className="space-y-2">
                                            {profileChallenges.slice(0, 3).map((challenge) => (
                                                <div key={challenge.id} className={`p-3.5 rounded-2xl bg-gradient-to-r ${challenge.color} text-white`}>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-lg">{challenge.icon}</span>
                                                        <div className="flex-1">
                                                            <p className="font-bold text-sm">{challenge.title}</p>
                                                            <p className="text-xs text-white/70 font-medium">+{challenge.points} pts</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recent Tips */}
                                {profileTips.length > 0 && (
                                    <div className="mb-5">
                                        <h3 className="font-black text-sm text-gray-900 mb-3 flex items-center gap-2 tracking-tight">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                            </div>
                                            Recent Activity
                                        </h3>
                                        <div className="space-y-2.5">
                                            {profileTips.map((tip) => (
                                                <div key={tip.id} className="p-3.5 bg-gray-50/80 rounded-2xl">
                                                    <div className="flex gap-3">
                                                        {tip.imageUrl && (
                                                            <img
                                                                src={tip.imageUrl}
                                                                alt=""
                                                                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${getCategoryColor(tip.category)}`}>
                                                                    {getCategoryEmoji(tip.category)} {tip.category}
                                                                </span>
                                                            </div>
                                                            <p className="font-bold text-gray-800 text-sm">{tip.title}</p>
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tip.content}</p>
                                                            <div className="flex items-center gap-3 mt-2 text-xs font-medium text-gray-400">
                                                                <span className="flex items-center gap-1">
                                                                    <Heart className="w-3 h-3" /> {tip.likes.length}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <MessageSquare className="w-3 h-3" /> {tip.comments.length}
                                                                </span>
                                                                <span>{formatTimeAgo(tip.timestamp)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Empty State */}
                                {profileTips.length === 0 && profileChallenges.length === 0 && (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                            <Leaf className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="font-bold text-gray-400 text-sm">No activity yet</p>
                                        <p className="text-xs text-gray-300 mt-1">This user hasn't shared any tips or joined challenges</p>
                                    </div>
                                )}

                                {/* Actions */}
                                {user && viewingProfile.id !== user.uid && !friends.some(f => f.id === viewingProfile.id) && (
                                    <Button
                                        onClick={() => handleSendFriendRequest(viewingProfile.id, viewingProfile.name)}
                                        disabled={sendingRequest === viewingProfile.id}
                                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 font-bold shadow-md shadow-emerald-200 transition-all hover:shadow-lg"
                                    >
                                        {sendingRequest === viewingProfile.id ? (
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        ) : (
                                            <UserPlus className="w-5 h-5 mr-2" />
                                        )}
                                        Add Friend
                                    </Button>
                                )}

                                {friends.some(f => f.id === viewingProfile.id) && (
                                    <div className="mt-4 text-center p-3.5 bg-emerald-50 rounded-2xl text-emerald-700 font-bold text-sm flex items-center justify-center gap-2">
                                        <UserCheck className="w-5 h-5" />
                                        You're friends!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Community;
