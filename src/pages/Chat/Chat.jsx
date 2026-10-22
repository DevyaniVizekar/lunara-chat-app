
import React, { useContext, useEffect, useState } from "react";
import "./Chat.css";
import LeftSidebar from "../../components/LeftSidebar/LeftSidebar";
import ChatBox from "../../components/ChatBox/ChatBox";
import RightSidebar from "../../components/RightSidebar/RightSidebar";
import { AppContext } from "../../context/AppContext";
import { auth } from "../../config/firebase";
import { useNavigate } from "react-router-dom";

const Chat = () => {
  const { chatData, userData } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userData) {
      setLoading(false);
      return;
    }

    // Never leave a signed-out visitor on the chat screen.
    if (!auth.currentUser) {
      navigate("/", { replace: true });
      return;
    }

    // A signed-in user without loaded profile data should not
    // remain on /chat indefinitely.
    const timeout = setTimeout(() => {
      if (!userData) {
        navigate("/profile", { replace: true });
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [userData, navigate]);

  if (loading && !userData) {
    return (
      <div className="chat">
        <p className="loading">Loading your account...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="chat">
        <p className="loading">
          Your account could not be loaded.
        </p>
        <button onClick={() => window.location.reload()}>
          Try again
        </button>
        <button onClick={() => navigate("/", { replace: true })}>
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat-container">
        <LeftSidebar />
        <ChatBox />
        <RightSidebar />
      </div>
    </div>
  );
};

export default Chat;
