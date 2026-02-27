// User Service for Firestore operations
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    increment,
    serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

export interface RecyclingAction {
    id?: string;
    itemName: string;
    category: "reuse" | "recycle" | "upcycle" | "dispose";
    actionTaken: string;
    pointsEarned: number;
    carbonSaved: number;
    timestamp: Date;
}

export interface UserStats {
    totalPoints: number;
    totalCarbonSaved: number;
    itemsRecycled: number;
}

// Points configuration
export const POINTS_CONFIG = {
    reuse: { points: 50, carbon: 0.5 },
    upcycle: { points: 75, carbon: 0.7 },
    recycle: { points: 30, carbon: 0.3 },
    dispose: { points: 10, carbon: 0.1 }
};

// Record a recycling action
export async function recordRecyclingAction(
    userId: string,
    itemName: string,
    category: "reuse" | "recycle" | "upcycle" | "dispose",
    actionTaken: string
): Promise<{ pointsEarned: number; carbonSaved: number }> {
    const config = POINTS_CONFIG[category];
    const pointsEarned = config.points;
    const carbonSaved = config.carbon;

    // Add action to user's actions subcollection
    const actionsRef = collection(db, "users", userId, "actions");
    await addDoc(actionsRef, {
        itemName,
        category,
        actionTaken,
        pointsEarned,
        carbonSaved,
        timestamp: serverTimestamp()
    });

    // Update user's total stats
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        totalPoints: increment(pointsEarned),
        totalCarbonSaved: increment(carbonSaved),
        itemsRecycled: increment(1)
    });

    return { pointsEarned, carbonSaved };
}

// Get user's recent actions
export async function getUserActions(userId: string, limitCount: number = 10): Promise<RecyclingAction[]> {
    const actionsRef = collection(db, "users", userId, "actions");
    const q = query(actionsRef, orderBy("timestamp", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as RecyclingAction[];
}

// Get user stats
export async function getUserStats(userId: string): Promise<UserStats | null> {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return {
        totalPoints: data.totalPoints || 0,
        totalCarbonSaved: data.totalCarbonSaved || 0,
        itemsRecycled: data.itemsRecycled || 0
    };
}

// Get top users for leaderboard
export async function getLeaderboard(limitCount: number = 10) {
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("totalPoints", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        uid: doc.id,
        name: doc.data().name || "Eco Warrior",
        totalPoints: doc.data().totalPoints || 0,
        totalCarbonSaved: doc.data().totalCarbonSaved || 0,
        itemsRecycled: doc.data().itemsRecycled || 0
    }));
}

// Calculate user level based on points
export function calculateLevel(points: number): { level: number; title: string; nextLevelPoints: number } {
    const levels = [
        { minPoints: 0, level: 1, title: "Eco Beginner" },
        { minPoints: 100, level: 2, title: "Green Apprentice" },
        { minPoints: 300, level: 3, title: "Recycling Rookie" },
        { minPoints: 600, level: 4, title: "Earth Guardian" },
        { minPoints: 1000, level: 5, title: "Eco Warrior" },
        { minPoints: 1500, level: 6, title: "Planet Protector" },
        { minPoints: 2500, level: 7, title: "Sustainability Master" },
        { minPoints: 4000, level: 8, title: "Green Champion" },
        { minPoints: 6000, level: 9, title: "Eco Legend" },
        { minPoints: 10000, level: 10, title: "Earth Hero" }
    ];

    let currentLevel = levels[0];
    let nextLevel = levels[1];

    for (let i = 0; i < levels.length; i++) {
        if (points >= levels[i].minPoints) {
            currentLevel = levels[i];
            nextLevel = levels[i + 1] || { minPoints: currentLevel.minPoints + 5000, level: currentLevel.level + 1, title: "Eco Master" };
        }
    }

    return {
        level: currentLevel.level,
        title: currentLevel.title,
        nextLevelPoints: nextLevel.minPoints
    };
}
