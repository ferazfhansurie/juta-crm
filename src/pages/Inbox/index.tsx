import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";

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

const MessageList = () => {
  const [newMessage, setNewMessage] = useState('');
  const dummyMessages = [
    { id: 1, from_me: true, type: 'text', text: { body: 'Hello!' }, createdAt: '2024-05-29T10:00:00Z' },
    { id: 2, from_me: false, type: 'text', text: { body: 'Hi there!' }, createdAt: '2024-05-29T10:01:00Z' }
  ];
  const myMessageClass = "flex flex-col w-full max-w-[320px] leading-1.5 p-1 bg-[#dcf8c6] text-black rounded-tr-xl rounded-tl-xl rounded-br-sm rounded-bl-xl self-end ml-auto mr-2 text-left";
  const otherMessageClass = "bg-gray-700 text-white rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-sm p-1 self-start text-left";
  return (
    <div className="flex flex-col w-full h-full bg-white relative">
      <div className="flex items-center justify-between p-2 border-b border-gray-300 bg-gray-100">
        <div className="flex items-center">
          <div className="w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-3">
            <span className="text-lg">A</span>
          </div>
          <div>
            <div className="font-semibold text-gray-800">Alice</div>
            <div className="text-sm text-gray-600">+123456789</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: "150px" }}>
        {dummyMessages.slice().reverse().map((message) => (
          <div
            className={`p-2 mb-2 rounded ${message.from_me ? myMessageClass : otherMessageClass}`}
            key={message.id}
            style={{
              maxWidth: '70%',
              width: `${message.type === 'image' || message.type === 'document' ? '350' : Math.min((message.text?.body?.length || 0) * 10, 350)}px`,
              minWidth: '75px'
            }}
          >
            {message.type === 'text' && (
              <div className="whitespace-pre-wrap break-words">
                {message.text.body}
              </div>
            )}
            <div className="message-timestamp text-xs text-gray-500 mt-1">
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-300 py-1 px-2">
        <div className="flex items-center">
          <textarea
            className="flex-grow px-5 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-lg mr-2 ml-4 resize-none bg-gray-100 text-gray-800"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                setNewMessage('');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

function Main() {
  const [assistantInfo, setAssistantInfo] = useState<any>(null);
  const [chatBox, setChatBox] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAssistantInfo();
  }, []);

  const fetchAssistantInfo = async () => {
    try {
      const response = await axios.get('https://api.openai.com/v1/assistants/asst_bFQpgPcgRiP8jaKihKwkhQAn', {
        headers: {
          'Authorization': `Bearer `,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      setAssistantInfo(response.data);
    } catch (error) {
      console.error("Error fetching assistant information:", error);
      setError("Failed to fetch assistant information");
    }
  };

  return (
    <div className="flex"   style={{ height: '100vh' }}>
      <div className="w-1/2 p-6 h-full overflow-auto ">
        <div className="flex flex-col mb-4">
          {assistantInfo && (
            <>
              <div className="mb-2 text-lg font-semibold">{assistantInfo.name} - {assistantInfo.model}</div>
            </>
          )}
        </div>
        <div className="mb-4">
          <label className="mb-2 text-lg font-semibold" htmlFor="instructions">
            Instructions
          </label>
          <textarea
            id="instructions"
            className="w-full p-2 border border-gray-300 rounded h-96"
            value={assistantInfo ? assistantInfo.instructions : ''}
          />
        </div>
      </div>
      <div className="w-1/2 border-l border-gray-300 h-full">
        <MessageList />
      </div>
    </div>
  );
}

export default Main;
