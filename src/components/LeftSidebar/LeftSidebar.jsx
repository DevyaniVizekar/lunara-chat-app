import React, { useContext, useEffect, useState } from 'react'
import './LeftSidebar.css'
import assets from '../../assets/assets'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  getDocs,
  query,
  setDoc,
  doc,
  where
} from "firebase/firestore";
import { db } from '../../config/firebase'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'

const LeftSidebar = () => {

  const navigate = useNavigate();
  const { userData, chatData, chatUser, setChatUser, setMessagesId, messagesId, chatVisible, setChatVisible } = useContext(AppContext);
  const [user, setUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);


  const inputHandler = async (e) => {
    try {
      const input = e.target.value;
      if (input) {
        setShowSearch(true);
        const userRef = collection(db, 'users');
        const q = query(userRef, where("username", "==", input.toLowerCase()));
        const querySnap = await getDocs(q);
        if (!querySnap.empty && querySnap.docs[0].data().id !== userData.id) {
          let userExist = false
          chatData.map((user) => {
            if (user.rId === querySnap.docs[0].data().id) {
              userExist = true;
            }
          })
          if (!userExist) {
            setUser(querySnap.docs[0].data());
          }
        }
        else {
          setUser(null);
        }
      }
      else {
        setShowSearch(false);
      }

    } catch (error) {
      console.error(error);
    }
  }

const addChat = async () => {
  if (!user || !userData?.id) {
    toast.error("Please sign in and select a user.");
    return;
  }

  const existingChat = chatData.find(
    (item) => item.rId === user.id
  );

  if (existingChat) {
    setMessagesId(existingChat.messageId);
    setChatUser(existingChat);
    setShowSearch(false);
    setChatVisible(true);
    return;
  }

  try {
    const newMessageRef = doc(collection(db, "messages"));

    await setDoc(newMessageRef, {
      participantIds: [userData.id, user.id],
      messages: [],
      lastMessage: "",
      updatedAt: Date.now()
    });

    setMessagesId(newMessageRef.id);

    setChatUser({
      messageId: newMessageRef.id,
      lastMessage: "",
      rId: user.id,
      updatedAt: Date.now(),
      messageSeen: true,
      userData: user
    });

    setShowSearch(false);
    setChatVisible(true);
  } catch (error) {
    console.error("Failed to create conversation:", error);
    toast.error(error.message || "Unable to start this conversation.");
  }
};

 const setChat = (item) => {
  if (!item?.messageId || !item?.userData) return;

  setMessagesId(item.messageId);
  setChatUser(item);
  setChatVisible(true);
};

  useEffect(() => {
    const updateChatUserData = async () => {
      if (chatUser) {
        const userRef = doc(db, "users", chatUser.userData.id);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        setChatUser(prev => ({ ...prev, userData: userData }))
      }
    }
    updateChatUserData();
  }, [chatData])



  return (
    <div className={`ls ${chatVisible ? "hidden" : ""}`}>
      <div className="ls-top">
        <div className="ls-nav">
          <img src={assets.logo} className='logo' alt="" />
          <div className="menu">
            <img src={assets.menu_icon} alt="" />
            <div className="sub-menu">
              <p onClick={() => navigate('/profile')}>Edit Profile</p>
              <hr />
              <p onClick={() => navigate('/')}>Logout</p>
            </div>
          </div>
        </div>
        <div className="ls-search">
          <img src={assets.search_icon} alt="" />
          <input onChange={inputHandler} type="text" placeholder='Search here...' />
        </div>
      </div>
      <div className="ls-list">
        {showSearch && user
          ? <div onClick={addChat} className='friends add-user'>
            <img src={user.avatar} alt="" />
            <p>{user.name}</p>
          </div>
          : chatData.map((item, index) => (
            <div onClick={() => setChat(item)} key={index} className={`friends ${item.messageSeen || item.messageId === messagesId ? "" : "border"}`}>
              <img src={item.userData.avatar} alt="" />
              <div>
                <p>{item.userData.name}</p>
                <span>{item.lastMessage}</span>
              </div>
            </div>
          ))
        }

      </div>
    </div>
  )
}

export default LeftSidebar
