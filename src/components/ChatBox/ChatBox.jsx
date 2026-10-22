import React, { useContext, useEffect, useState } from 'react'
import './ChatBox.css'
import assets from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { toast } from 'react-toastify'
import upload from '../../lib/upload'

const ChatBox = () => {

  const { userData, messagesId, chatUser, messages, setMessages, chatVisible, setChatVisible } = useContext(AppContext)

  const [input, setInput] = useState("");

const sendMessage = async () => {
  const text = input.trim();

  if (!text || !messagesId || !userData?.id) return;

  setInput("");

  try {
    await updateDoc(doc(db, "messages", messagesId), {
      messages: arrayUnion({
        sId: userData.id,
        text,
        createdAt: new Date()
      }),
      lastMessage: text.slice(0, 30),
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Failed to send message:", error);
    setInput(text);
    toast.error(error.message || "Unable to send message.");
  }
};

  const sendImage = async (e) => {
  const file = e.target.files?.[0];

  if (!file || !messagesId || !userData?.id) return;

  try {
    const fileUrl = await upload(file);

    if (!fileUrl) {
      throw new Error("Image upload failed.");
    }

    await updateDoc(doc(db, "messages", messagesId), {
      messages: arrayUnion({
        sId: userData.id,
        image: fileUrl,
        createdAt: new Date()
      }),
      lastMessage: "Image",
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Failed to send image:", error);
    toast.error(error.message || "Unable to send image.");
  } finally {
    e.target.value = "";
  }
};

  const convertTimestamp = (timestamp) => {
  if (!timestamp) return "";

  const date =
    typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
};

  useEffect(() => {

    setMessages([]);
  
    if (!messagesId) return;
  
    const unSub = onSnapshot(
      doc(db, "messages", messagesId),
      (res) => {
  
        if (!res.exists()) {
          setMessages([]);
          return;
        }
  
        setMessages([...(res.data().messages || [])].reverse());
      }
    );
  
    return () => unSub();
  
  }, [messagesId]);

  return chatUser ? (
    <div className={`chat-box ${chatVisible ? "" : "hidden"}`}>
      <div className="chat-user">
        <img src={chatUser.userData.avatar} alt="" />
        <p>{chatUser.userData.name} {Date.now() - chatUser.userData.lastSeen <= 70000 ? <img src={assets.green_dot} className='dot' alt="" /> : null}</p>
        <img src={assets.help_icon} className='help' alt="" />
        <img onClick={() => setChatVisible(false)} src={assets.arrow_icon} className='arrow' alt="" />
      </div>


      <div className="chat-msg">
        {messages.map((msg, index) => (
          <div key={index} className={msg.sId === userData.id ? "s-msg" : "r-msg"}>
            {msg["image"]
              ? <img className='msg-img' src={msg.image} alt='' />
              : <p className='msg'>{msg.text} </p>
            }

            <div>
              <img src={msg.sId === userData.id ? userData.avatar : chatUser.userData.avatar} alt="" />
              <p>{convertTimestamp(msg.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>


      <div className="chat-input">
        <input onChange={(e) => setInput(e.target.value)} value={input} type="text" placeholder='Send a message' />
        <input onChange={sendImage} type="file" id='image' accept='image/png, image/jpeg' hidden />
        <label htmlFor="image">
          <img src={assets.gallery_icon} className="gallery" alt="" />
        </label>
        <img onClick={sendMessage} src={assets.send_button} alt="" />
      </div>
    </div>
  )
    : <div className={`chat-welcome ${chatVisible ? "" : "hidden"}`}>
      <img src={assets.logo_icon} alt="" />
      <p><i>Conversations, beautifully connected.</i></p>
    </div>
}

export default ChatBox