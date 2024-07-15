import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
}

interface AssistantInfo {
  name: string;
  description: string;
  instructions: string;
}

interface MessageListProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  assistantName: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onSendMessage, assistantName }) => {
  const [newMessage, setNewMessage] = useState('');

  const myMessageClass = "flex flex-col w-full max-w-[320px] leading-1.5 p-1 bg-[#dcf8c6] text-black rounded-tr-xl rounded-tl-xl rounded-br-sm rounded-bl-xl self-end ml-auto mr-2 text-left";
  const otherMessageClass = "bg-gray-700 text-white rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-sm p-1 self-start text-left";

  const handleSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        onSendMessage(newMessage);
        setNewMessage('');
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white relative">
      <div className="flex items-center justify-between p-2 border-b border-gray-300 bg-gray-100">
        <div className="flex items-center">
          <div className="w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-3">
            <span className="text-lg capitalize">{assistantName.charAt(0)}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-800 capitalize">{assistantName}</div>
            <div className="text-sm text-gray-600">+123456789</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: "150px" }}>
        {messages.slice().reverse().map((message, index) => (
          <div
            className={`p-2 mb-2 rounded ${message.from_me ? myMessageClass : otherMessageClass}`}
            key={index}
            style={{
              maxWidth: '70%',
              width: `${message.type === 'image' || message.type === 'document' ? '350' : Math.min((message.text?.length || 0) * 10, 350)}px`,
              minWidth: '75px'
            }}
          >
            {message.type === 'text' && (
              <div className="whitespace-pre-wrap break-words">
                {message.text}
              </div>
            )}
            <div className="message-timestamp text-xs text-gray-500 mt-1">
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2 px-2 mb-0 mt-2">
        <div className="flex items-center">
          <textarea
            className="flex-grow px-2 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-md mr-2 ml-2 resize-none bg-gray-100 text-gray-800"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            onKeyDown={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
};

const Main: React.FC = () => {
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from_me: true, type: 'text', text: 'Hello!', createdAt: '2024-05-29T10:00:00Z' },
    { from_me: false, type: 'text', text: 'Hi there!', createdAt: '2024-05-29T10:01:00Z' }
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssistantInfo();
  }, []);

  const fetchAssistantInfo = async () => {
    try {
      const response = await axios.get('https://api.openai.com/v1/assistants/asst_bFQpgPcgRiP8jaKihKwkhQAn', {
        headers: {
          'Authorization': `Bearer YOUR_API_KEY`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const { name, description = "", instructions = "" } = response.data;
      setAssistantInfo({ name, description, instructions });
    } catch (error) {
      console.error("Error fetching assistant information:", error);
      setError("Failed to fetch assistant information");
    }
  };

  const updateAssistantInfo = async () => {
    if (!assistantInfo) return;
    try {
      const response = await axios.post('https://api.openai.com/v1/assistants/asst_bFQpgPcgRiP8jaKihKwkhQAn', {
        name: assistantInfo.name,
        description: assistantInfo.description,
        instructions: assistantInfo.instructions
      }, {
        headers: {
          'Authorization': `Bearer YOUR_API_KEY`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      setAssistantInfo(response.data);
    } catch (error) {
      console.error("Error updating assistant information:", error);
      setError("Failed to update assistant information");
    }
  };

  const sendMessageToAssistant = async (messageText: string) => {
    const newMessage: ChatMessage = {
      from_me: true,
      type: 'text',
      text: messageText,
      createdAt: new Date().toISOString(),
    };

    // Clear dummy messages if they are present
    if (messages.some(message => message.createdAt === '2024-05-29T10:00:00Z' || message.createdAt === '2024-05-29T10:01:00Z')) {
      setMessages([newMessage]);
    } else {
      setMessages([newMessage, ...messages]);
    }

    try {
      const response = await axios.post('https://api.openai.com/v1/assistants/asst_bFQpgPcgRiP8jaKihKwkhQAn/messages', {
        message: messageText,
      }, {
        headers: {
          'Authorization': `Bearer YOUR_API_KEY`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      const assistantResponse: ChatMessage = {
        from_me: false,
        type: 'text',
        text: response.data.text,
        createdAt: new Date().toISOString(),
      };

      setMessages([assistantResponse, ...messages]);

    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
    }
  };

  return (
    <div className="flex" style={{ height: '100vh' }}>
      <div className="w-1/2 p-6 h-full overflow-auto">
        <div className="flex flex-col mb-4">
          {assistantInfo && (
            <>
              <div className="mb-2 text-lg font-semibold capitalize">{assistantInfo.name}</div>
            </>
          )}
        </div>
        <div className="mb-4">
          <label className="mb-2 text-md font-semibold capitalize" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="w-full p-2 border border-gray-300 rounded text-sm"
            placeholder="Name your assistant"
            value={assistantInfo ? assistantInfo.name : ''}
            onChange={(e) => setAssistantInfo({ ...assistantInfo!, name: e.target.value })}
          />
        </div>
        <div className="mb-4">
          <label className="mb-2 text-md font-semibold" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="w-full p-2 border border-gray-300 rounded h-32 text-sm"
            placeholder="Add a short description of what this assistant does"
            value={assistantInfo ? assistantInfo.description : ''}
            onChange={(e) => setAssistantInfo({ ...assistantInfo!, description: e.target.value })}
          />
        </div>
        <div className="mb-4">
          <label className="mb-2 text-md font-semibold" htmlFor="instructions">
            Instructions
          </label>
          <textarea
            id="instructions"
            className="w-full p-2 border border-gray-300 rounded h-32 text-sm"
            placeholder="What does your assistant do?"
            value={assistantInfo ? assistantInfo.instructions : ''}
            onChange={(e) => setAssistantInfo({ ...assistantInfo!, instructions: e.target.value })}
          />
        </div>
        <button onClick={updateAssistantInfo} className="px-4 py-2 bg-primary text-white rounded">
          Update Assistant
        </button>
        {error && <div className="mt-4 text-red-500">{error}</div>}
      </div>
      <div className="w-1/2 border-l border-gray-300 h-full">
        <MessageList messages={messages} onSendMessage={sendMessageToAssistant} assistantName={assistantInfo?.name || 'Juta Assistant'} />
      </div>
    </div>
  );
}

export default Main;