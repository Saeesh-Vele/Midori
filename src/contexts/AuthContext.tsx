import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    type User
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/services/firebase";

interface UserProfile {
    uid: string;
    name: string;
    email: string;
    totalPoints: number;
    totalCarbonSaved: number;
    itemsRecycled: number;
    createdAt: Date;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signup: (email: string, password: string, name: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile from Firestore
    const fetchUserProfile = async (uid: string) => {
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserProfile({
                    uid,
                    name: data.name || "",
                    email: data.email || "",
                    totalPoints: data.totalPoints || 0,
                    totalCarbonSaved: data.totalCarbonSaved || 0,
                    itemsRecycled: data.itemsRecycled || 0,
                    createdAt: data.createdAt?.toDate() || new Date()
                });
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchUserProfile(user.uid);
        }
    };

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchUserProfile(currentUser.uid);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Sign up new user
    const signup = async (email: string, password: string, name: string) => {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

        // Update display name
        await updateProfile(newUser, { displayName: name });

        // Create user document in Firestore
        await setDoc(doc(db, "users", newUser.uid), {
            name,
            email,
            totalPoints: 0,
            totalCarbonSaved: 0,
            itemsRecycled: 0,
            createdAt: serverTimestamp()
        });

        await fetchUserProfile(newUser.uid);
    };

    // Log in existing user
    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    // Log out
    const logout = async () => {
        await signOut(auth);
        setUserProfile(null);
    };

    const value = {
        user,
        userProfile,
        loading,
        signup,
        login,
        logout,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
