import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { createContext, useEffect, useState } from "react";
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

  const clearChatState = () => {
    setChatData([]);
    setMessages([]);
    setMessagesId(null);
    setChatUser(null);
    setChatVisible(false);
  };

  const loadUserData = async (uid) => {

    clearChatState();
    
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await signOut(auth);
        navigate("/");
        return;
      }
      const userData = userSnap.data();
      
      setUserData(userData);
      
      if (userData.avatar && userData.name) {
        navigate('/chat');
      } else {
        navigate('/profile')
      }
      await updateDoc(userRef, {
        lastSeen: Date.now()
      })
      setInterval(async () => {
        if (auth.currentUser) {
          await updateDoc(userRef, {
            lastSeen: Date.now()
          })
        }
      }, 60000);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (userData) {
      const chatRef = doc(db, "chats", userData.id);

      const unSub = onSnapshot(chatRef, async (res) => {

        if (!res.exists()) {
          setChatData([]);
          return;
        }

        const chatItems = res.data().chatsData || [];
        const tempData = [];

        for (const item of chatItems) {
          const userRef = doc(db, "users", item.rId);
          const userSnap = await getDoc(userRef);

          tempData.push({
            ...item,
            userData: userSnap.data(),
          });
        }

        setChatData(tempData.sort((a, b) => b.updatedAt - a.updatedAt));
      });
      return () => {
        unSub();
      }
    }
  }, [userData])

  const value = {
    userData, setUserData,
    chatData, setChatData,
    loadUserData,
    messages, setMessages,
    messagesId, setMessagesId,
    chatUser, setChatUser,
    chatVisible, setChatVisible
  }

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  )
}

export default AppContextProvider
