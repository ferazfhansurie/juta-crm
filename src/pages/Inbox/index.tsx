import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/Base/Button";
import { FormInput, FormTextarea } from "@/components/Base/Form";
import { Menu, Tab } from "@/components/Base/Headless";

interface Chat {
  id: string;
  name: string;
  type: string;
  timestamp: number;
  chat_pic: string;
  chat_pic_full: string;
  pin: boolean;
  mute: boolean;
  mute_until: number;
  archive: boolean;
  unread: number;
  unread_mention: boolean;
  read_only: boolean;
  not_spam: boolean;
}

function Main() {
  const [chatBox, setChatBox] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null); // Set error type to string
  const chatBoxRef = useRef<HTMLDivElement>(null); // Specify ref type

  useEffect(() => {
    fetchChats();
  }, []);

  const showChatBox = () => {
    setChatBox(!chatBox);
  };

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/whapi/chats');
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      const data = response.body;
      
  
    } catch (error) {
      console.error(error);
      setError('Failed to fetch chats');
    }
  };

  return (
    <div>
      <Button onClick={showChatBox}>Toggle Chat</Button>
      {chatBox && (
        <div ref={chatBoxRef}>
          <h2>Chats</h2>
          {error ? (
            <div>Error: {error}</div>
          ) : (
            <ul>
              {chats.map((chat) => (
                <li key={chat.id}>
                  <div>Name: {chat.name}</div>
                  <div>Type: {chat.type}</div>
                  <div>Timestamp: {chat.timestamp}</div>
                  <div>
                    Chat Pic: <img src={chat.chat_pic} alt="Chat Pic" />
                  </div>
                  <div>
                    Chat Pic Full:{" "}
                    <img src={chat.chat_pic_full} alt="Chat Pic Full" />
                  </div>
                  <div>Pin: {chat.pin ? "Yes" : "No"}</div>
                  <div>Mute: {chat.mute ? "Yes" : "No"}</div>
                  <div>Mute Until: {chat.mute_until}</div>
                  <div>Archive: {chat.archive ? "Yes" : "No"}</div>
                  <div>Unread Messages: {chat.unread}</div>
                  <div>
                    Unread Mention: {chat.unread_mention ? "Yes" : "No"}
                  </div>
                  <div>Read Only: {chat.read_only ? "Yes" : "No"}</div>
                  <div>Not Spam: {chat.not_spam ? "Yes" : "No"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default Main;
