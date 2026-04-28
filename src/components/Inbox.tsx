import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Search, Filter, MoreVertical, Paperclip, Image as ImageIcon, Smile, 
  Send, Phone, Video, Info, Tag, User, Clock, CheckCircle, Package, AlertCircle,
  Facebook, Instagram, MessageCircle, Globe, ChevronDown, Check, Briefcase, FileText
} from 'lucide-react';

// --- Type Definitions ---
type Platform = 'whatsapp' | 'messenger' | 'instagram' | 'website';
type Status = 'open' | 'pending' | 'resolved';
type Priority = 'low' | 'medium' | 'high';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  totalOrders: number;
  lifetimeValue: number;
  tags: string[];
}

interface Message {
  id: string;
  content: string;
  sender: 'agent' | 'customer' | 'bot';
  timestamp: string;
  type: 'text' | 'image' | 'file';
  status?: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  contact: Contact;
  platform: Platform;
  status: Status;
  priority: Priority;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  assignee?: string;
  messages: Message[];
}

// --- Mock Data ---
const mockConversations: Conversation[] = [];

const platformIcons = {
  whatsapp: <MessageCircle className="text-green-500" size={16} />,
  messenger: <Facebook className="text-blue-500" size={16} />,
  instagram: <Instagram className="text-pink-500" size={16} />,
  website: <Globe className="text-gray-500" size={16} />
};

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(true);

  const activeConv = useMemo(() => conversations.find(c => c.id === activeConvId), [conversations, activeConvId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchSearch = c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [conversations, filterStatus, searchQuery]);

  const [showChannelSettings, setShowChannelSettings] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: replyText,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      status: 'sent'
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConvId) {
        return {
          ...c,
          lastMessage: replyText,
          lastMessageTime: newMessage.timestamp,
          messages: [...c.messages, newMessage]
        };
      }
      return c;
    }));
    setReplyText('');
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm relative">
      
      {/* Channel Settings Modal */}
      <AnimatePresence>
        {showChannelSettings && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-6 outline-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0066FF]">
                     <Globe size={20} />
                   </div>
                   <div>
                     <h3 className="text-base font-bold text-gray-900">Channel Integrations</h3>
                     <p className="text-xs text-gray-500">Connect messaging APIs</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowChannelSettings(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <AlertCircle size={20} className="rotate-45" /> {/* simple cross */}
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Facebook Messenger */}
                <div className="border border-gray-200 rounded-xl p-5 relative overflow-hidden group hover:border-blue-200 transition-colors">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Facebook size={24} className="text-blue-500" />
                      <div>
                        <h4 className="font-bold text-gray-900">Facebook Messenger API</h4>
                        <p className="text-xs text-gray-500">Connect Facebook Pages</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 rounded">Not Connected</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Page Access Token</label>
                      <input type="password" placeholder="EAAI..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">App Secret</label>
                      <input type="password" placeholder="••••••••••••••••" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" />
                    </div>
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors w-full sm:w-auto">
                      Connect Integration
                    </button>
                  </div>
                </div>

                {/* Instagram */}
                <div className="border border-gray-200 rounded-xl p-5 relative overflow-hidden group hover:border-pink-200 transition-colors">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Instagram size={24} className="text-pink-500" />
                      <div>
                        <h4 className="font-bold text-gray-900">Instagram Messaging API</h4>
                        <p className="text-xs text-gray-500">Connect IG Professional Account</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 rounded">Not Connected</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Access Token</label>
                      <input type="password" placeholder="IGQV..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-pink-500 focus:bg-white outline-none transition-all" />
                    </div>
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors w-full sm:w-auto">
                      Connect Integration
                    </button>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="border border-gray-200 rounded-xl p-5 relative overflow-hidden group hover:border-green-200 transition-colors">
                  <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <MessageCircle size={24} className="text-green-500" />
                      <div>
                        <h4 className="font-bold text-gray-900">WhatsApp Business API</h4>
                        <p className="text-xs text-gray-500">Official Cloud API</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 rounded">Not Connected</span>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone Number ID</label>
                        <input type="text" placeholder="1023456789..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:bg-white outline-none transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">WABA ID</label>
                        <input type="text" placeholder="WhatsApp Business Account ID" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:bg-white outline-none transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Permanent Access Token</label>
                      <input type="password" placeholder="EAAL..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:bg-white outline-none transition-all" />
                    </div>
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors w-full sm:w-auto">
                      Connect Integration
                    </button>
                  </div>
                </div>

              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
                <button onClick={() => setShowChannelSettings(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg text-xs font-bold hover:bg-gray-300 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEFT PANEL: Conversation List */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <MessageSquare size={20} className="text-[#0066FF]" />
              Unified Inbox
            </h2>
            <button 
              onClick={() => setShowChannelSettings(true)}
              className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded-lg transition-colors"
              title="Channel Integrations"
            >
              <Globe size={18} />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search messages..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'open', 'pending', 'resolved'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filterStatus === status 
                    ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/20' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
          {filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full text-left p-3 rounded-xl transition-all border ${
                activeConvId === conv.id 
                  ? 'bg-white border-[#0066FF]/20 shadow-sm ring-1 ring-[#0066FF]/20' 
                  : 'bg-transparent border-transparent hover:bg-white hover:border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 font-semibold text-gray-900 line-clamp-1">
                  {conv.contact.name}
                  {conv.unreadCount > 0 && (
                    <span className="bg-[#0066FF] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap ml-2">
                  {conv.lastMessageTime}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {platformIcons[conv.platform]}
                <span className="line-clamp-1 truncate">{conv.lastMessage}</span>
              </div>
              <div className="mt-2 flex gap-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  conv.status === 'open' ? 'bg-green-100 text-green-700' :
                  conv.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {conv.status}
                </span>
                {conv.priority === 'high' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-red-100 text-red-700">
                    High Priority
                  </span>
                )}
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* CENTER PANEL: Chat Window */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-white min-w-0">
          <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  {activeConv.contact.name}
                  <div className="w-2 h-2 rounded-full bg-green-500" title="Online"></div>
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  {platformIcons[activeConv.platform]}
                  <span className="capitalize">{activeConv.platform}</span>
                  <span>•</span>
                  <span>Assignee: {activeConv.assignee || 'Unassigned'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={activeConv.status}
                onChange={() => {}}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0066FF]"
              >
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                <Phone size={18} />
              </button>
              <button 
                onClick={() => setShowRightPanel(!showRightPanel)}
                className={`p-2 rounded-lg transition-colors ${showRightPanel ? 'bg-blue-50 text-[#0066FF]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                <Info size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {activeConv.messages.map((msg, idx) => {
              const isAgent = msg.sender === 'agent' || msg.sender === 'bot';
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                    isAgent 
                      ? 'bg-[#0066FF] text-white rounded-br-sm' 
                      : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm'
                  }`}>
                    <p className="text-[13px] leading-relaxed break-words">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {msg.sender === 'bot' ? 'Bot • ' : ''}{msg.timestamp}
                    </span>
                    {isAgent && msg.status && (
                      <Check size={12} className={msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="flex-1 relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 group focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/10 transition-all">
                <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                  <Smile size={18} />
                </button>
                <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                  <Paperclip size={18} />
                </button>
                <input 
                  type="text" 
                  placeholder="Type a message or type '/' for quick replies..." 
                  className="flex-1 px-3 py-3 bg-transparent border-none focus:outline-none text-[13px]"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={!replyText.trim()}
                className="w-12 h-[46px] flex items-center justify-center bg-[#0066FF] text-white rounded-xl hover:bg-[#0052CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-50 text-[#0066FF] rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-gray-900 font-bold text-lg">No Conversation Selected</h3>
            <p className="text-gray-500 mt-1">Select a conversation from the left to start chatting.</p>
          </div>
        </div>
      )}

      {/* RIGHT PANEL: Customer Details */}
      <AnimatePresence>
        {activeConv && showRightPanel && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto"
          >
            <div className="p-6 text-center border-b border-gray-100">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 text-[#0066FF] mx-auto flex items-center justify-center text-2xl font-bold mb-3 border border-blue-200 font-serif">
                {activeConv.contact.name.charAt(0)}
              </div>
              <h3 className="font-bold text-gray-900 text-base">{activeConv.contact.name}</h3>
              <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                <Clock size={12} /> Customer since 2023
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Contact Info</h4>
                <div className="space-y-3">
                   <div className="flex items-center gap-3 text-sm">
                      <Phone size={14} className="text-gray-400" />
                      <span className="text-gray-700">{activeConv.contact.phone}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm">
                      <FileText size={14} className="text-gray-400" />
                      <span className="text-gray-700">{activeConv.contact.email}</span>
                   </div>
                </div>
              </div>

              {/* Ecommerce Stats */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Order History</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Orders</p>
                    <p className="text-lg font-black text-[#0066FF]">{activeConv.contact.totalOrders}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">LTV (BDT)</p>
                    <p className="text-lg font-black text-green-600">৳{activeConv.contact.lifetimeValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                  Tags
                  <button className="text-[#0066FF] hover:underline text-[10px]">Edit</button>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeConv.contact.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium border border-gray-200">
                      {tag}
                    </span>
                  ))}
                  <button className="px-2 py-1 border border-dashed border-gray-300 text-gray-400 rounded text-xs hover:border-[#0066FF] hover:text-[#0066FF] transition-colors">
                    + Add Tag
                  </button>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Briefcase size={14} /> Internal Notes
                </h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <textarea 
                    className="w-full bg-transparent border-none focus:outline-none text-xs text-yellow-800 placeholder-yellow-600/50 resize-none h-20"
                    placeholder="Add a private note for your team..."
                  ></textarea>
                  <div className="flex justify-end mt-2">
                    <button className="text-[10px] font-bold text-yellow-700 bg-yellow-200/50 px-2.5 py-1.5 rounded hover:bg-yellow-200 transition-colors">
                      Save Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
