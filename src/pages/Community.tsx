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
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-green-100 py-4 px-6 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate("/")}
                    >
                        <img src="/ecofy-logo.png" alt="EcoFy" className="w-10 h-10" />
                        <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                            Midori
                        </span>
                    </div>
                    <div className="flex gap-2 items-center">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-gray-800">{userProfile?.name || "Eco Warrior"}</p>
                                    <p className="text-xs text-green-600">{userProfile?.totalPoints || 0} points</p>
                                </div>
                                <div
                                    className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
                                    onClick={() => navigate("/profile")}
                                >
                                    {(userProfile?.name || "U").charAt(0)}
                                </div>
                            </div>
                        ) : (
                            <Button
                                onClick={() => navigate("/auth")}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Join Community
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/chat")}
                            className="text-green-700 hover:bg-green-100"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Back to Chat</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Hero */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">Join {communityStats.totalMembers.toLocaleString()}+ Eco Warriors</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                        Midori Community 🌍
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Share tips, join challenges, and compete on the leaderboard. Together we're making a difference!
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex justify-center mb-8">
                    <div className="bg-white rounded-xl p-1 shadow-sm border border-green-100 inline-flex flex-wrap justify-center">
                        {[
                            { id: "feed", label: "Feed", icon: MessageSquare },
                            { id: "challenges", label: "Challenges", icon: Target },
                            { id: "leaderboard", label: "Leaderboard", icon: Trophy },
                            { id: "friends", label: "Friends", icon: Users }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all ${activeTab === tab.id
                                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                                    : "text-gray-600 hover:bg-green-50"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                        <Leaf className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-800">{communityStats.totalTips}</p>
                        <p className="text-sm text-gray-500">Tips Shared</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                        <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-800">{communityStats.totalLikes}</p>
                        <p className="text-sm text-gray-500">Total Likes</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                        <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-800">{communityStats.totalMembers.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Members</p>
                    </div>
                </div>

                {/* Feed Tab */}
                {activeTab === "feed" && (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Main Feed */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Filters & Sort */}
                            <div className="flex flex-wrap gap-3 items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-green-100">
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => setFilterCategory("all")}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${filterCategory === "all"
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                    >
                                        All
                                    </button>
                                    {(["reuse", "recycle", "lifestyle", "diy"] as const).map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setFilterCategory(cat)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${filterCategory === cat
                                                ? getCategoryColor(cat)
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                        >
                                            {getCategoryEmoji(cat)} {cat}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSortBy("recent")}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${sortBy === "recent" ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-gray-100"
                                            }`}
                                    >
                                        <Clock className="w-4 h-4" /> Recent
                                    </button>
                                    <button
                                        onClick={() => setSortBy("popular")}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${sortBy === "popular" ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-gray-100"
                                            }`}
                                    >
                                        <Flame className="w-4 h-4" /> Popular
                                    </button>
                                </div>
                            </div>

                            {/* New Tip Button */}
                            <Button
                                onClick={() => user ? setShowNewTipForm(!showNewTipForm) : navigate("/auth")}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-6 rounded-xl shadow-md"
                            >
                                <PlusCircle className="w-5 h-5 mr-2" />
                                Share Your Eco Tip (+10 points)
                            </Button>

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
                            <div className="space-y-4">
                                {filteredTips.length === 0 ? (
                                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-green-100">
                                        <Leaf className="w-12 h-12 text-green-300 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">No tips yet</h3>
                                        <p className="text-gray-500 mb-4">Be the first to share an eco tip!</p>
                                        <Button
                                            onClick={() => user ? setShowNewTipForm(true) : navigate("/auth")}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            Share a Tip
                                        </Button>
                                    </div>
                                ) : (
                                    filteredTips.map((tip) => (
                                        <div
                                            key={tip.id}
                                            className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                                                        {tip.authorName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{tip.authorName}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTimeAgo(tip.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(tip.category)}`}>
                                                    {getCategoryEmoji(tip.category)} {tip.category}
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

                {/* Challenges Tab */}
                {activeTab === "challenges" && (
                    <div className="space-y-6">
                        {/* Create Challenge Form */}
                        {showNewChallengeForm && (
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-200 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-green-500" />
                                        Create New Challenge
                                    </h3>
                                    <button onClick={() => setShowNewChallengeForm(false)} className="text-gray-400 hover:text-gray-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <Input
                                    placeholder="Challenge title (e.g., 'No Plastic Week')"
                                    value={newChallenge.title}
                                    onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                                    className="mb-3"
                                />

                                <Textarea
                                    placeholder="Describe the challenge and what participants should do..."
                                    value={newChallenge.description}
                                    onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                                    className="mb-3 min-h-[100px]"
                                />

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">Points Reward</label>
                                        <Input
                                            type="number"
                                            min="50"
                                            max="1000"
                                            value={newChallenge.points}
                                            onChange={(e) => setNewChallenge({ ...newChallenge, points: parseInt(e.target.value) || 100 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">Duration (days)</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="90"
                                            value={newChallenge.daysUntilDeadline}
                                            onChange={(e) => setNewChallenge({ ...newChallenge, daysUntilDeadline: parseInt(e.target.value) || 7 })}
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Select Icon</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {challengeIcons.map((icon) => (
                                            <button
                                                key={icon}
                                                onClick={() => setNewChallenge({ ...newChallenge, icon })}
                                                className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${newChallenge.icon === icon
                                                    ? "bg-green-100 ring-2 ring-green-500"
                                                    : "bg-gray-100 hover:bg-gray-200"
                                                    }`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Select Color Theme</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {challengeColors.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setNewChallenge({ ...newChallenge, color })}
                                                className={`w-10 h-10 rounded-lg bg-gradient-to-r ${color} transition-all ${newChallenge.color === color
                                                    ? "ring-2 ring-offset-2 ring-green-500"
                                                    : ""
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleCreateChallenge}
                                        className="bg-green-600 hover:bg-green-700 flex-1"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Zap className="w-4 h-4 mr-2" />
                                        )}
                                        Create Challenge (+25 pts)
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowNewChallengeForm(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {challenges.map((challenge) => {
                                const isJoined = user && challenge.participants.includes(user.uid);
                                const isLoading = joiningChallenge === challenge.id;
                                const daysRemaining = Math.ceil((challenge.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                                return (
                                    <div
                                        key={challenge.id}
                                        className="bg-white rounded-2xl overflow-hidden shadow-md border border-green-100 hover:shadow-lg transition-all group"
                                    >
                                        <div className={`bg-gradient-to-r ${challenge.color} p-6 text-white relative`}>
                                            {isJoined && (
                                                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 text-xs flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Joined
                                                </div>
                                            )}
                                            <div className="text-4xl mb-3">{challenge.icon}</div>
                                            <h3 className="text-xl font-bold mb-1">{challenge.title}</h3>
                                            <p className="text-white/80 text-sm">{challenge.description}</p>
                                        </div>
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Users className="w-4 h-4" />
                                                    <span className="text-sm">{challenge.participants.length} joined</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-green-600 font-bold">
                                                    <Star className="w-4 h-4 fill-current" />
                                                    +{challenge.points}
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> Time remaining
                                                    </span>
                                                    <span className={daysRemaining < 3 ? "text-red-500" : ""}>
                                                        {daysRemaining > 0 ? `${daysRemaining} days` : "Ended"}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full bg-gradient-to-r ${challenge.color}`}
                                                        style={{ width: `${Math.min(100, challenge.participants.length * 5)}%` }}
                                                    />
                                                </div>
                                            </div>
                                            {challenge.createdBy !== "system" && (
                                                <p className="text-xs text-gray-400 mb-3">Created by {challenge.createdByName}</p>
                                            )}
                                            <Button
                                                className={`w-full transition-transform ${isJoined
                                                    ? "bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-600"
                                                    : "bg-green-600 hover:bg-green-700 group-hover:scale-[1.02]"
                                                    }`}
                                                onClick={() => handleJoinChallenge(challenge.id)}
                                                disabled={isLoading || daysRemaining <= 0}
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : isJoined ? (
                                                    "Leave Challenge"
                                                ) : user ? (
                                                    "Join Challenge"
                                                ) : (
                                                    "Login to Join"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {challenges.length === 0 && (
                            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-green-100">
                                <Target className="w-12 h-12 text-green-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Loading challenges...</h3>
                                <p className="text-gray-500">Challenges will appear here shortly.</p>
                            </div>
                        )}

                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white text-center">
                            <Award className="w-12 h-12 mx-auto mb-4 opacity-90" />
                            <h3 className="text-2xl font-bold mb-2">Create Your Own Challenge</h3>
                            <p className="text-white/80 mb-6 max-w-md mx-auto">
                                Have an idea for a community challenge? Create one and earn 25 bonus points!
                            </p>
                            <Button
                                variant="secondary"
                                className="bg-white text-green-600 hover:bg-gray-100"
                                onClick={() => user ? setShowNewChallengeForm(true) : navigate("/auth")}
                            >
                                <PlusCircle className="w-4 h-4 mr-2" />
                                {user ? "Create Challenge" : "Login to Create"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Leaderboard Tab */}
                {activeTab === "leaderboard" && (
                    <div className="max-w-2xl mx-auto">
                        {/* Top 3 Podium */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {leaderboard.slice(0, 3).map((user, index) => {
                                const order = [1, 0, 2];
                                const heights = ["h-32", "h-40", "h-28"];
                                const colors = ["from-gray-300 to-gray-400", "from-yellow-400 to-yellow-500", "from-amber-500 to-amber-600"];
                                const i = order[index];
                                const leaderUser = leaderboard[i];
                                if (!leaderUser) return null;

                                return (
                                    <div key={leaderUser.id} className={`order-${index + 1}`}>
                                        <div className="flex flex-col items-center">
                                            <div className={`w-16 h-16 bg-gradient-to-br ${colors[i]} rounded-full flex items-center justify-center text-white text-xl font-bold mb-2 shadow-lg`}>
                                                {leaderUser.name.charAt(0)}
                                            </div>
                                            <p className="font-bold text-gray-800 text-center truncate w-full">{leaderUser.name}</p>
                                            <p className="text-sm text-green-600 font-medium">{leaderUser.points} pts</p>
                                            <div className={`${heights[i]} w-full bg-gradient-to-t ${colors[i]} rounded-t-xl mt-2 flex items-start justify-center pt-3`}>
                                                {i === 0 && <Crown className="w-8 h-8 text-white" />}
                                                {i === 1 && <Medal className="w-8 h-8 text-white" />}
                                                {i === 2 && <Medal className="w-8 h-8 text-white" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Full Leaderboard */}
                        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    Full Leaderboard
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {leaderboard.map((leaderUser) => (
                                    <div
                                        key={leaderUser.id}
                                        onClick={() => handleViewProfile(leaderUser.id)}
                                        className={`flex items-center gap-4 p-4 hover:bg-green-50 transition-colors cursor-pointer ${user?.uid === leaderUser.id ? "bg-green-50" : ""
                                            }`}
                                    >
                                        <div className="w-8 flex justify-center">
                                            {getRankIcon(leaderUser.rank)}
                                        </div>
                                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {leaderUser.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">
                                                {leaderUser.name}
                                                {user?.uid === leaderUser.id && (
                                                    <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">You</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500">{leaderUser.itemsRecycled} items recycled</p>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <div>
                                                <p className="font-bold text-green-600">{leaderUser.points}</p>
                                                <p className="text-xs text-gray-500">points</p>
                                            </div>
                                            <Eye className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {leaderboard.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p>No leaderboard data yet. Be the first to earn points!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Friends Tab */}
                {activeTab === "friends" && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {!user ? (
                            <div className="bg-white rounded-2xl p-8 text-center shadow-lg border border-green-100">
                                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Connect with Eco Warriors</h3>
                                <p className="text-gray-600 mb-4">Login to add friends and see their eco activities!</p>
                                <Button onClick={() => navigate("/auth")} className="bg-green-600 hover:bg-green-700">
                                    Login to Continue
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Friend Requests */}
                                {friendRequests.length > 0 && (
                                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-200">
                                        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                            <UserPlus className="w-5 h-5 text-orange-500" />
                                            Friend Requests ({friendRequests.length})
                                        </h3>
                                        <div className="space-y-3">
                                            {friendRequests.map((request) => (
                                                <div key={request.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                                            {request.fromUserName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-800">{request.fromUserName}</p>
                                                            <p className="text-xs text-gray-500">wants to be your friend</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAcceptFriendRequest(request)}
                                                            className="bg-green-500 hover:bg-green-600"
                                                        >
                                                            <UserCheck className="w-4 h-4 mr-1" />
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleRejectFriendRequest(request.id)}
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
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
                                    <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                        <UserPlus className="w-5 h-5 text-green-500" />
                                        Add Friends
                                    </h3>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            placeholder="Search users by name..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    {userSearch && (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.slice(0, 10).map((u) => (
                                                    <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-green-50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                                                                {u.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-800">{u.name}</p>
                                                                <p className="text-xs text-gray-500">{u.points} points</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleViewProfile(u.id)}
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleSendFriendRequest(u.id, u.name)}
                                                                disabled={sendingRequest === u.id}
                                                                className="bg-green-500 hover:bg-green-600"
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
                                                <p className="text-center text-gray-500 py-4">No users found</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* My Friends List */}
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
                                    <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-green-500" />
                                        My Friends ({friends.length})
                                    </h3>
                                    {friends.length > 0 ? (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {friends.map((friend) => (
                                                <button
                                                    key={friend.id}
                                                    onClick={() => handleViewProfile(friend.id)}
                                                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:shadow-md transition-all text-left"
                                                >
                                                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                        {friend.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-800">{friend.name}</p>
                                                        <p className="text-sm text-green-600">{friend.totalPoints} points</p>
                                                        <p className="text-xs text-gray-500">{friend.itemsRecycled} items recycled</p>
                                                    </div>
                                                    <Eye className="w-5 h-5 text-gray-400" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p>No friends yet!</p>
                                            <p className="text-sm mt-1">Search for users above to add friends</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Profile Modal */}
            {viewingProfile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                        {/* Profile Header */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white rounded-t-2xl">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold">
                                    {viewingProfile.name.charAt(0)}
                                </div>
                                <button
                                    onClick={() => setViewingProfile(null)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <h2 className="text-2xl font-bold">{viewingProfile.name}</h2>
                            <p className="text-white/80 text-sm">
                                Member since {viewingProfile.joinedAt.toLocaleDateString()}
                            </p>
                        </div>

                        {/* Profile Stats */}
                        <div className="p-6">
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                <div className="text-center p-3 bg-yellow-50 rounded-xl">
                                    <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-gray-800">{viewingProfile.totalPoints}</p>
                                    <p className="text-xs text-gray-500">Points</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-xl">
                                    <Leaf className="w-5 h-5 text-green-500 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-gray-800">{viewingProfile.itemsRecycled}</p>
                                    <p className="text-xs text-gray-500">Recycled</p>
                                </div>
                                <div className="text-center p-3 bg-blue-50 rounded-xl">
                                    <MessageSquare className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-gray-800">{viewingProfile.tipsShared}</p>
                                    <p className="text-xs text-gray-500">Tips</p>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-xl">
                                    <Target className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-gray-800">{viewingProfile.challengesJoined}</p>
                                    <p className="text-xs text-gray-500">Challenges</p>
                                </div>
                            </div>

                            {/* Active Challenges */}
                            {profileChallenges.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Target className="w-4 h-4 text-purple-500" />
                                        Active Challenges
                                    </h3>
                                    <div className="space-y-2">
                                        {profileChallenges.slice(0, 3).map((challenge) => (
                                            <div key={challenge.id} className={`p-3 rounded-xl bg-gradient-to-r ${challenge.color} text-white`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{challenge.icon}</span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{challenge.title}</p>
                                                        <p className="text-xs text-white/80">+{challenge.points} pts</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Tips with Images */}
                            {profileTips.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-green-500" />
                                        Recent Activity
                                    </h3>
                                    <div className="space-y-3">
                                        {profileTips.map((tip) => (
                                            <div key={tip.id} className="p-3 bg-gray-50 rounded-xl">
                                                <div className="flex gap-3">
                                                    {tip.imageUrl && (
                                                        <img
                                                            src={tip.imageUrl}
                                                            alt=""
                                                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(tip.category)}`}>
                                                                {getCategoryEmoji(tip.category)} {tip.category}
                                                            </span>
                                                        </div>
                                                        <p className="font-medium text-gray-800 text-sm">{tip.title}</p>
                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tip.content}</p>
                                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
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

                            {/* Empty state */}
                            {profileTips.length === 0 && profileChallenges.length === 0 && (
                                <div className="text-center py-6 text-gray-500">
                                    <Leaf className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm">No activity yet</p>
                                    <p className="text-xs">This user hasn't shared any tips or joined challenges</p>
                                </div>
                            )}

                            {/* Add Friend Button */}
                            {user && viewingProfile.id !== user.uid && !friends.some(f => f.id === viewingProfile.id) && (
                                <Button
                                    onClick={() => handleSendFriendRequest(viewingProfile.id, viewingProfile.name)}
                                    disabled={sendingRequest === viewingProfile.id}
                                    className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                >
                                    {sendingRequest === viewingProfile.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <UserPlus className="w-4 h-4 mr-2" />
                                    )}
                                    Add Friend
                                </Button>
                            )}

                            {friends.some(f => f.id === viewingProfile.id) && (
                                <div className="mt-4 text-center p-3 bg-green-100 rounded-xl text-green-700 font-medium flex items-center justify-center gap-2">
                                    <UserCheck className="w-5 h-5" />
                                    You're friends!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Community;
