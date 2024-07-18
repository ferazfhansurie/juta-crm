import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, updateDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L"
};

let companyId = "001"; // Adjust the companyId as needed

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
}

interface InstructionField {
  title: string;
  content: string;
}

interface AssistantInfo {
  name: string;
  description: string;
  instructions: InstructionField[];
}

interface MessageListProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  assistantName: string;
  deleteThread: () => void;
  threadId: string; // Add this line
}

const MessageList: React.FC<MessageListProps> = ({ messages, onSendMessage, assistantName, deleteThread, threadId }) => {
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
          </div>
        </div>
        <div>
          <button 
            onClick={deleteThread} 
            className={`px-4 py-2 text-white rounded flex items-center ${!threadId ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-500'} active:scale-95`}
            disabled={!threadId}
          >
            Delete Thread
          </button>
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
            value={newMessage || ""}
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
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo>({
    name: '',
    description: '',
    instructions: [],
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [response, setResponse] = useState<string>('');
  const [threadId, setThreadId] = useState<string>('');
  const [isScrolledToBottom, setIsScrolledToBottom] = useState<boolean>(false);
  const updateButtonRef = useRef<HTMLButtonElement>(null);
  const [isFloating, setIsFloating] = useState(true);
  
  useEffect(() => {
    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchFirebaseConfig(companyId);
    }
  }, [companyId]);

  const fetchCompanyId = async () => {
    const user = getAuth().currentUser;
    if (!user) {
      console.error("No user is logged in");
      setError("No user is logged in");
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("User document does not exist");
        setError("User document does not exist");
        return;
      }
  
      const dataUser = docUserSnapshot.data();
      setCompanyId(dataUser.companyId);
      setThreadId(dataUser.threadid); // Set threadId here
    } catch (error) {
      console.error("Error fetching company ID:", error);
      setError("Failed to fetch company ID");
    }
  };

  const fetchFirebaseConfig = async (companyId: string) => {
    try {
      const companyDoc = await getDoc(doc(firestore, "companies", companyId));
      const tokenDoc = await getDoc(doc(firestore, "setting", "token"));
      if (companyDoc.exists() && tokenDoc.exists()) {
        const companyData = companyDoc.data();
        const tokenData = tokenDoc.data();
        
        console.log("Company Data:", companyData); // Log company data
        // console.log("Token Data:", tokenData); // Log token data
  
        setAssistantId(companyData.assistantId);
        setApiKey(tokenData.openai);
  
        console.log("Fetched Assistant ID:", companyData.assistantId);
        // console.log("Fetched API Key:", tokenData.openai);
      } else {
        console.error("Company or token document does not exist");
      }
    } catch (error) {
      console.error("Error fetching Firebase config:", error);
      setError("Failed to fetch Firebase config");
    }
  };

  const handleInstructionChange = (index: number, field: string, value: string) => {
    const newInstructions = [...assistantInfo.instructions];
    newInstructions[index] = { ...newInstructions[index], [field]: value };
    setAssistantInfo({ ...assistantInfo, instructions: newInstructions });
  };
  
  const addInstructionField = () => {
    setAssistantInfo(prevState => ({
      ...prevState,
      instructions: [...prevState.instructions, { title: '', content: '' }]
    }));
  };
  
  const deleteInstructionField = (index: number) => {
    setAssistantInfo(prevState => ({
      ...prevState,
      instructions: prevState.instructions.filter((_, i) => i !== index)
    }));
  };
  
  const getCombinedInstructions = () => {
    return assistantInfo.instructions.map(inst => `# ${inst.title}\n${inst.content}`).join('\n\n');
  };

  const fetchAssistantInfo = async (assistantId: string, apiKey: string) => {
    console.log("Fetching assistant info with ID:", assistantId);
    try {
      const response = await axios.get(`https://api.openai.com/v1/assistants/${assistantId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const { name, description = "", instructions = "" } = response.data;
      const parsedInstructions = instructions ? instructions.split('\n\n').map((inst: { split: (arg0: string) => [any, ...any[]]; }) => {
        const [title, ...content] = inst.split('\n');
        return { title: title.replace('# ', ''), content: content.join('\n') };
      }) : [];
      setAssistantInfo({ name, description, instructions: parsedInstructions });
    } catch (error) {
      console.error("Error fetching assistant information:", error);
      setError("Failed to fetch assistant information");
    }
  };

  const updateAssistantInfo = async () => {
    if (!assistantInfo || !assistantId || !apiKey) {
      console.error("Assistant info, assistant ID, or API key is missing.");
      setError("Assistant info, assistant ID, or API key is missing.");
      return;
    }

    console.log("Updating assistant info with ID:", assistantId);

    const payload = {
      name: assistantInfo.name || '',
      description: assistantInfo.description || '',
      instructions: getCombinedInstructions()
    };

    console.log("Payload being sent:", payload);

    try {
      const response = await axios.post(`https://api.openai.com/v1/assistants/${assistantId}`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      console.log('Assistant info updated successfully:', response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Error is an AxiosError
        console.error('Error updating assistant information:', error.response?.data);
        setError(`Failed to update assistant information: ${error.response?.data.error.message}`);
      } else {
        // Generic error handling
        console.error('Error updating assistant information:', error);
        setError('Failed to update assistant information');
      }
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
    setMessages(prevMessages => {
      if (prevMessages.some(message => message.createdAt === '2024-05-29T10:00:00Z' || message.createdAt === '2024-05-29T10:01:00Z')) {
        return [newMessage];
      } else {
        return [newMessage, ...prevMessages];
      }
    });
  
    console.log("Sending message with Assistant ID:", assistantId); // Log assistantId
  
    try {
      const user = getAuth().currentUser;
      if (!user) {
        console.error("User not authenticated");
        setError("User not authenticated");
        return;
      }
  
      const res = await axios.get(`https://buds-359313.et.r.appspot.com/api/assistant-test/`, {
        params: {
          message: messageText,
          email: user.email!,
          assistantid: assistantId
        },
      });
      const data = res.data;
      console.log(data);
      setResponse(data.answer);
  
      const assistantResponse: ChatMessage = {
        from_me: false,
        type: 'text',
        text: data.answer,
        createdAt: new Date().toISOString(),
      };
  
      setMessages(prevMessages => [assistantResponse, ...prevMessages]);
      setThreadId(user.email!); // Update the threadId to user email as a placeholder
  
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error calling API');
      setError("Failed to send message");
    }
  };

  useEffect(() => {
    if (assistantId && apiKey) {
      fetchAssistantInfo(assistantId, apiKey);
    }
  }, [assistantId, apiKey]);

  const deleteThread = async () => {
    const user = getAuth().currentUser;
    if (!user) {
      console.error("No user is logged in");
      setError("No user is logged in");
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("User document does not exist");
        setError("User document does not exist");
        return;
      }
  
      await updateDoc(docUserRef, { threadid: '' });
      setThreadId(''); // Clear threadId in state
      console.log(`Thread ID set to empty string successfully.`);
      // Clear the messages state
      setMessages([]);
    } catch (error) {
      console.error("Error updating thread ID:", error);
      setError("Failed to update thread ID");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setError(null);
    const { name, value } = e.target;
    setAssistantInfo({ ...assistantInfo!, [name]: value });
  };
  
  const handleFocus = () => {
    setError(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight;
      setIsFloating(!scrolledToBottom);
    };
  
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize on mount
  
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
            onChange={handleInputChange}
            onFocus={handleFocus}
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
            onChange={handleInputChange}
            onFocus={handleFocus}
          />
        </div>
        <div className="mb-4">
          <label className="mb-2 text-md font-semibold" htmlFor="instructions">
            Instructions
          </label>
          {assistantInfo.instructions.map((instruction, index) => (
            <div key={index} className="mb-2 flex items-center">
              <div className="flex-grow">
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded mb-1 text-sm"
                  placeholder="Title"
                  value={instruction.title}
                  onChange={(e) => handleInstructionChange(index, 'title', e.target.value)}
                  onFocus={handleFocus}
                />
                <textarea
                  className="w-full p-2 border border-gray-300 rounded h-24 text-sm"
                  placeholder="Content"
                  value={instruction.content}
                  onChange={(e) => handleInstructionChange(index, 'content', e.target.value)}
                  onFocus={handleFocus}
                />
              </div>
              <button
                onClick={() => deleteInstructionField(index)}
                className="ml-2 text-red-500 hover:text-red-700"
                onFocus={handleFocus}
              >
                ✖
              </button>
            </div>
          ))}
        </div>
        <div>
          <button 
            onClick={addInstructionField} 
            className="px-4 py-2 m-2 bg-primary text-white rounded active:scale-95"
            onFocus={handleFocus}>
            Add Instruction
          </button>
        </div>
        <div>
          <button 
            ref={updateButtonRef}
            onClick={updateAssistantInfo} 
            className={`px-4 py-2 m-2 bg-primary text-white rounded transition-transform ${isFloating ? 'fixed bottom-4 left-20' : 'relative'} hover:bg-primary active:scale-95`}
            onFocus={handleFocus}
          >
            Update Assistant
          </button>
        </div>
        {error && <div className="mt-4 text-red-500">{error}</div>}
      </div>
      <div className="w-1/2 border-l border-gray-300 h-full">
      <MessageList 
        messages={messages} 
        onSendMessage={sendMessageToAssistant} 
        assistantName={assistantInfo?.name || 'Juta Assistant'} 
        deleteThread={deleteThread} 
        threadId={threadId} // Pass threadId to MessageList
      />
        {response && (
          <div className="p-4">
            <h4 className="font-semibold">Assistant Response:</h4>
            <p>{response}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Main;