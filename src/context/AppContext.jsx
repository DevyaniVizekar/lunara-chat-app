import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  setDoc,
  collection,
  query,
  where
} from "firebase/firestore";
import { createContext, useCallback, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

export const AppContext = createContext();

const AppContextProvider = (props) => {

  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [chatData, setChatData] = useState([]);
  const [messagesId, setMessagesId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);

  const clearChatState = useCallback(() => {
    setChatData([]);
    setMessages([]);
    setMessagesId(null);
    setChatUser(null);
    setChatVisible(false);
  }, []);

  const loadUserData = useCallback(async (uid) => {
    clearChatState();

    try {
      const userRef = doc(db, "users", uid);
      let userSnap = await getDoc(userRef);

      // Recover if the authenticated account has no Firestore profile.
      if (!userSnap.exists()) {
        const currentUser = auth.currentUser;

        if (!currentUser || currentUser.uid !== uid) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        await setDoc(userRef, {
          id: uid,
          username: (currentUser.email || "user")
            .split("@")[0]
            .toLowerCase(),
          email: currentUser.email || "",
          name: "",
          avatar: "",
          bio: "Hey, there! I am using Lunara.",
          lastSeen: Date.now(),
        });

        userSnap = await getDoc(userRef);
      }

      if (!userSnap.exists()) {
        throw new Error("Your profile could not be loaded. Please try again.");
      }

      const profileData = userSnap.data();

      // Repair a missing chat document instead of leaving it absent.
     

      setUserData(profileData);

      // Update lastSeen without blocking navigation.
      updateDoc(doc(db, "users", uid), {
        lastSeen: Date.now(),
      }).catch((error) => {
        console.error("Could not update lastSeen:", error);
      });

      // New or incomplete profiles must complete profile setup.
      if (!profileData.name || !profileData.avatar) {
        navigate("/profile", { replace: true });
      } else {
        navigate("/chat", { replace: true });
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      setUserData(null);
      clearChatState();

      // Avoid an endless spinner when Firebase requests fail.
      if (
        error.code === "permission-denied" ||
        error.code === "unauthenticated"
      ) {
        await signOut(auth);
        navigate("/", { replace: true });
      }

      // Other errors are shown to the user; don't silently sign them out.
      import("react-toastify").then(({ toast }) => {
        toast.error(
          error.message || "Unable to load your account. Please try again."
        );
      });
    }
  }, [clearChatState, navigate]);

useEffect(() => {
  if (!userData?.id) {
    setChatData([]);
    return;
  }

  const messagesQuery = query(
    collection(db, "messages"),
    where("participantIds", "array-contains", userData.id)
  );

  let active = true;

  const unsubscribe = onSnapshot(
    messagesQuery,
    async (snapshot) => {
      try {
        const items = await Promise.all(
          snapshot.docs.map(async (messageDoc) => {
            const data = messageDoc.data();
            const otherId = (data.participantIds || []).find(
              (id) => id !== userData.id
            );

            if (!otherId) return null;

            const userSnap = await getDoc(doc(db, "users", otherId));

            if (!userSnap.exists()) return null;

            return {
              messageId: messageDoc.id,
              rId: otherId,
              lastMessage: data.lastMessage || "",
              updatedAt: data.updatedAt || 0,
              messageSeen: true,
              userData: userSnap.data()
            };
          })
        );

        if (active) {
          setChatData(
            items
              .filter(Boolean)
              .sort((a, b) => b.updatedAt - a.updatedAt)
          );
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      }
    },
    (error) => {
      console.error("Conversation listener failed:", error);
      if (active) setChatData([]);
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}, [userData?.id]);

  const value = {
    userData, setUserData,
    chatData, setChatData,
    loadUserData,
    messages, setMessages,
    messagesId, setMessagesId,
    chatUser, setChatUser,
    chatVisible, setChatVisible
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
