import React, { useState } from 'react';
import Lucide from '@/components/Base/Lucide';

interface QuickReply {
  id: string;
  keyword?: string;
  text: string;
  type?: string;
  category?: string;
  documents?:
    | {
        name: string;
        type: string;
        size: number;
        url: string;
        lastModified: number;
      }[]
    | null;
  images?: string[] | null;
  videos?:
    | {
        name: string;
        type: string;
        size: number;
        url: string;
        lastModified: number;
        thumbnail?: string;
      }[]
    | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  // Computed properties for compatibility
  title?: string;
  description?: string;
}

interface QuickRepliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickReplies: QuickReply[];
  categories: string[];
  onSelectReply: (reply: QuickReply) => void;
  onUpdateReply: (id: string, keyword: string, text: string, type: 'all' | 'self') => void;
  onDeleteReply: (id: string, type: 'all' | 'self') => void;
}

const QuickRepliesModal: React.FC<QuickRepliesModalProps> = ({
  isOpen,
  onClose,
  quickReplies,
  categories,
  onSelectReply,
  onUpdateReply,
  onDeleteReply,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'self'>('all');
  const [category, setCategory] = useState('all');
  const [filter, setFilter] = useState('');
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);

  if (!isOpen) return null;

  const filteredReplies = quickReplies
    .filter(reply => activeTab === 'all' || reply.type === 'self')
    .filter(reply => category === 'all' || reply.category === category)
    .filter(reply => 
      (reply.keyword ?? '').toLowerCase().includes(filter.toLowerCase()) ||
      (reply.text ?? '').toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => (a.keyword ?? '').localeCompare(b.keyword ?? ''));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Animated Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Floating Modal - Centered */}
      <div className="relative w-full max-w-6xl max-h-[85vh] animate-in zoom-in-95 duration-300">
        {/* Main Container with Glassmorphism */}
        <div className="relative overflow-hidden">
          {/* Background Glow Effects */}
          <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/10 to-white/20 dark:from-gray-800/20 dark:via-gray-800/10 dark:to-gray-800/20 rounded-3xl blur-2xl opacity-75"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-white/10 via-white/5 to-white/10 dark:from-gray-800/10 dark:via-gray-800/5 dark:to-gray-800/10 rounded-3xl blur-3xl opacity-50"></div>
          
          {/* Main Content */}
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-gray-600/40 overflow-hidden shadow-2xl">
            {/* Header Section */}
            <div className="relative p-6 border-b border-white/20 dark:border-gray-600/30 bg-white/20 dark:bg-gray-800/30 backdrop-blur-md">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-white/20 to-white/10 dark:from-gray-700/20 dark:to-gray-700/10 rounded-full blur-xl"></div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/20 to-white/10 dark:from-gray-700/20 dark:to-gray-700/10 rounded-full blur-xl"></div>
              
              <div className="relative flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  {/* Icon Container */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-white/20 dark:bg-gray-700/40 backdrop-blur-sm rounded-2xl border border-white/30 dark:border-gray-600/40 flex items-center justify-center shadow-lg">
                      <Lucide
                        icon="MessageSquare"
                        className="w-6 h-6 text-gray-700 dark:text-gray-300 drop-shadow-lg"
                      />
                    </div>
                    {/* Floating dots */}
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                  
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                      Quick Replies
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      Select and manage your instant response templates
                    </p>
                  </div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="group relative p-2 hover:scale-105 transition-all duration-300"
                  title="Close (ESC)"
                >
                  <div className="absolute inset-0 bg-white/20 dark:bg-gray-700/40 backdrop-blur-sm rounded-xl group-hover:bg-white/30 dark:group-hover:bg-gray-600/50 transition-all duration-300 border border-white/30 dark:border-gray-600/40"></div>
                  <Lucide
                    icon="X"
                    className="relative w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300"
                  />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
              {/* Enhanced Tabs */}
              <div className="flex space-x-3 mb-6">
                {[
                  { key: 'all', label: 'All Replies', icon: 'MessageSquare', count: quickReplies.filter(r => r.type === 'all').length },
                  { key: 'self', label: 'Personal', icon: 'User', count: quickReplies.filter(r => r.type === 'self').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    className={`group relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm border ${
                      activeTab === tab.key
                        ? "bg-white/25 dark:bg-gray-800/40 backdrop-blur-md border border-white/40 dark:border-gray-600/40 shadow-lg shadow-white/20 dark:shadow-gray-800/20 transform scale-105 text-gray-800 dark:text-gray-100"
                        : "bg-white/20 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/40 border-white/30 dark:border-gray-600/40 hover:scale-105 hover:shadow-lg"
                    }`}
                    onClick={() => setActiveTab(tab.key as 'all' | 'self')}
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon={tab.icon as any} className="w-4 h-4" />
                      <span>{tab.label}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        activeTab === tab.key 
                          ? "bg-white/20 dark:bg-gray-700/40 text-gray-700 dark:text-gray-300" 
                          : "bg-white/20 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300"
                      }`}>
                        {tab.count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Enhanced Search and Filter Bar */}
              <div className="mb-6">
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Category Filter */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-white/20 dark:bg-gray-700/40 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="relative px-4 py-3 border border-white/30 dark:border-gray-600/40 rounded-xl bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 font-medium min-w-[180px]"
                    >
                      <option value="all">📂 All Categories</option>
                      {categories
                        .filter((cat) => cat !== "all")
                        .map((cat) => (
                          <option key={cat} value={cat}>
                            🏷️ {cat}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {/* Search Input */}
                  <div className="relative flex-1 group">
                    <div className="absolute inset-0 bg-white/20 dark:bg-gray-700/40 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Search through your quick replies..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full px-4 py-3 pl-12 border border-white/30 dark:border-gray-600/40 rounded-xl bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 font-medium"
                      />
                      <Lucide
                        icon="Search"
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Replies Grid */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar">
                {filteredReplies.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="relative mx-auto mb-4">
                      <div className="w-20 h-20 bg-white/20 dark:bg-gray-700/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 dark:border-gray-600/40">
                        <Lucide icon="MessageSquare" className="w-10 h-10 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-white/30 dark:bg-gray-600/40 rounded-full animate-bounce"></div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">No quick replies found</h3>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">Try adjusting your filters or create new ones</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredReplies.map((reply) => (
                      <div
                        key={reply.id}
                        className="group relative p-4 bg-white/10 dark:bg-gray-800/20 hover:bg-white/20 dark:hover:bg-gray-700/40 rounded-xl transition-all duration-300 backdrop-blur-md border border-white/20 dark:border-gray-600/30 shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer overflow-hidden"
                        onClick={() => {
                          if (editingReply?.id !== reply.id) {
                            onSelectReply(reply);
                            onClose();
                          }
                        }}
                      >
                        {/* Hover Glow Effect */}
                        <div className="absolute inset-0 bg-white/10 dark:bg-gray-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                        
                        {editingReply?.id === reply.id ? (
                          <div className="relative space-y-4">
                            <input
                              className="w-full px-4 py-3 border border-white/30 dark:border-gray-600/40 rounded-xl bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm text-gray-200 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-gray-400"
                              value={editingReply.keyword}
                              onChange={(e) =>
                                setEditingReply({
                                  ...editingReply,
                                  keyword: e.target.value,
                                })
                              }
                              placeholder="Keyword"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <select
                              className="w-full px-4 py-3 border border-white/30 dark:border-gray-600/40 rounded-xl bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm text-gray-200 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                              value={editingReply.category || ""}
                              onChange={(e) =>
                                setEditingReply({
                                  ...editingReply,
                                  category: e.target.value,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">Select Category</option>
                              {categories
                                .filter((cat: string) => cat !== "all")
                                .map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                            </select>
                            <textarea
                              className="w-full px-4 py-3 border border-white/30 dark:border-gray-600/40 rounded-xl bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm text-gray-200 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-gray-400 resize-none"
                              value={editingReply.text || ""}
                              onChange={(e) =>
                                setEditingReply({
                                  ...editingReply,
                                  text: e.target.value,
                                })
                              }
                              placeholder="Message text (optional)"
                              rows={3}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex space-x-3">
                              <button
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white rounded-xl hover:from-green-600/90 hover:to-emerald-600/90 transition-all duration-300 hover:scale-105 shadow-lg shadow-green-500/30 border border-green-400/50 font-semibold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                                                onUpdateReply(
                                reply.id,
                                editingReply.keyword ?? "",
                                editingReply.text || "",
                                (editingReply.type as 'all' | 'self') || "all"
                              );
                                  setEditingReply(null);
                                }}
                              >
                                <Lucide icon="Save" className="w-5 h-5 inline mr-2" />
                                Save
                              </button>
                              <button
                                className="px-4 py-3 bg-white/20 dark:bg-gray-700/40 text-gray-300 dark:text-gray-400 rounded-xl hover:bg-white/30 dark:hover:bg-gray-600/50 transition-all duration-300 hover:scale-105 border border-white/30 dark:border-gray-600/40 font-semibold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingReply(null);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Header with Keyword and Category */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <span className="px-3 py-1 bg-white/25 dark:bg-gray-700/40 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-full text-sm font-bold border border-white/30 dark:border-gray-600/40 shadow-sm">
                                  {reply.keyword}
                                </span>
                                {reply.category && (
                                  <span className="px-2 py-1 bg-white/20 dark:bg-gray-700/40 backdrop-blur-sm text-gray-600 dark:text-gray-400 rounded-full text-sm border border-white/30 dark:border-gray-600/40 font-medium">
                                    {reply.category}
                                  </span>
                                )}
                              </div>
                              
                                                             {/* Action Buttons */}
                               <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                 <button
                                   className="p-1.5 text-blue-500 hover:bg-blue-500/20 backdrop-blur-sm rounded-lg transition-all duration-300 hover:scale-110 border border-blue-400/30 hover:border-blue-400/50"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setEditingReply(reply);
                                   }}
                                 >
                                   <Lucide icon="PencilLine" className="w-4 h-4" />
                                 </button>
                                 <button
                                   className="p-1.5 text-red-500 hover:bg-red-500/20 backdrop-blur-sm rounded-lg transition-all duration-300 hover:scale-110 border border-red-400/30 hover:border-red-400/50"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     onDeleteReply(reply.id, (reply.type as 'all' | 'self') || "all");
                                   }}
                                 >
                                   <Lucide icon="Trash" className="w-4 h-4" />
                                 </button>
                               </div>
                            </div>
                            
                            {/* Message Text */}
                            {reply.text && (
                              <p
                                className="text-gray-900 dark:text-gray-300 mb-4 leading-relaxed font-medium"
                                style={{
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {reply.text}
                              </p>
                            )}
                            
                            {/* Media Preview Grid */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Documents */}
                              {reply.documents && reply.documents.length > 0 &&
                                reply.documents.map((doc, index) => (
                                  <div key={index} className="relative group">
                                    <div className="p-3 bg-white/20 dark:bg-gray-700/40 backdrop-blur-sm rounded-xl border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/50 transition-all duration-300">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-lg flex items-center justify-center">
                                          <Lucide icon="File" className="w-4 h-4 text-blue-300" />
                                        </div>
                                        <span className="text-sm text-gray-300 dark:text-gray-400 truncate font-medium">
                                          {doc.name}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              
                              {/* Images */}
                              {(reply.images?.length ?? 0) > 0 &&
                                (reply.images as string[]).map((img, index) => (
                                  <div key={index} className="relative group">
                                    <div className="relative overflow-hidden rounded-xl border border-white/30 dark:border-gray-600/40">
                                      <img
                                        src={img}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-20 object-cover hover:scale-110 transition-transform duration-300"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                  </div>
                                ))}
                              
                              {/* Videos */}
                              {reply.videos && reply.videos.length > 0 &&
                                reply.videos.map((video, index) => (
                                  <div key={`video-${index}`} className="relative group">
                                    <div className="w-full h-20 bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-purple-600/30 backdrop-blur-sm rounded-xl border border-purple-400/40 dark:border-purple-500/40 flex items-center justify-center relative overflow-hidden">
                                      {video.thumbnail ? (
                                        <img
                                          src={video.thumbnail}
                                          alt={`Video ${index + 1}`}
                                          className="w-full h-full object-cover rounded-xl"
                                        />
                                      ) : (
                                        <Lucide
                                          icon="Video"
                                          className="w-8 h-8 text-purple-300"
                                        />
                                      )}
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-all duration-300">
                                        <div className="bg-black/60 backdrop-blur-sm rounded-full p-2 group-hover:scale-110 transition-transform duration-300">
                                          <Lucide
                                            icon="Play"
                                            className="w-4 h-4 text-white"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                            
                            {/* Hover Indicator */}
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="px-2 py-1 bg-white/20 dark:bg-gray-700/40 backdrop-blur-sm rounded-full text-xs text-gray-600 dark:text-gray-400 border border-white/30 dark:border-gray-600/40">
                                Click to use
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default QuickRepliesModal;
