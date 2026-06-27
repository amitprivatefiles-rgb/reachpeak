import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageSquare, Send, Paperclip, FileText, Image, Video, Search,
  Clock, Check, CheckCheck, AlertCircle, X, Loader2, Smile, ArrowLeft,
  Phone, User, File, ChevronDown,
} from 'lucide-react';

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_direction: string;
  unread_count: number;
  window_expires_at: string | null;
  is_open: boolean;
}

interface Message {
  id: string;
  direction: string;
  message_type: string;
  content: any;
  media_url: string | null;
  status: string;
  wamid: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  template_name: string | null;
  error_message: string | null;
}

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  body_text: string | null;
  components: any;
}

export function Inbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      setConversations(data);
      setFilteredConversations(data);
    }
    setLoading(false);
  }, [user]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversation: Conversation) => {
    setMessagesLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, direction, message_type, content, media_url, status, wamid, created_at, sent_at, delivered_at, read_at, template_name, error_message')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setMessagesLoading(false);

    // Also fetch by contact phone as fallback (for messages before conversation_id was added)
    if (!data || data.length === 0) {
      const { data: phoneData } = await supabase
        .from('messages')
        .select('id, direction, message_type, content, media_url, status, wamid, created_at, sent_at, delivered_at, read_at, template_name, error_message')
        .or(`wa_from.eq.${conversation.contact_phone},wa_to.eq.${conversation.contact_phone}`)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });

      if (phoneData && phoneData.length > 0) {
        setMessages(phoneData);
      }
    }
  }, [user]);

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await supabase.functions.invoke('mark-read', {
        body: { conversation_id: conversationId },
      });
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  }, []);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('templates')
      .select('id, name, language, category, status, body_text, components')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (data) setTemplates(data);
  }, [user]);

  // Initial load
  useEffect(() => {
    fetchConversations();
    fetchTemplates();
  }, [fetchConversations, fetchTemplates]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredConversations(
        conversations.filter(c =>
          c.contact_phone.includes(q) ||
          c.contact_name?.toLowerCase().includes(q) ||
          c.last_message_preview?.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, conversations]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const conversationsChannel = supabase
      .channel('inbox-conversations')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(conversationsChannel); };
  }, [user, fetchConversations]);

  // Messages realtime for active conversation
  useEffect(() => {
    if (!activeConversation || !user) return;

    const messagesChannel = supabase
      .channel(`inbox-messages-${activeConversation.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConversation.id}`,
      }, () => {
        fetchMessages(activeConversation);
      })
      .subscribe();

    return () => { supabase.removeChannel(messagesChannel); };
  }, [activeConversation, user, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Open a conversation
  const openConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setShowMobileChat(true);
    fetchMessages(conv);
    if (conv.unread_count > 0) {
      markAsRead(conv.id);
    }
  };

  // Check if 24h window is open
  const isWindowOpen = (conv: Conversation | null): boolean => {
    if (!conv?.window_expires_at) return false;
    return new Date(conv.window_expires_at) > new Date();
  };

  // Send text message
  const sendTextMessage = async () => {
    if (!messageText.trim() || !activeConversation || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          to: activeConversation.contact_phone,
          type: 'text',
          text: messageText.trim(),
          conversation_id: activeConversation.id,
        },
      });
      if (error) throw error;
      setMessageText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err: any) {
      alert('Failed to send: ' + (err.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  // Send template message
  const sendTemplate = async (template: Template) => {
    if (!activeConversation || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          to: activeConversation.contact_phone,
          type: 'template',
          template: {
            name: template.name,
            language: template.language || 'en_US',
            components: template.components || [],
          },
          conversation_id: activeConversation.id,
        },
      });
      if (error) throw error;
      setShowTemplates(false);
    } catch (err: any) {
      alert('Failed to send template: ' + (err.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  // Upload and send media
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: string) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || !user) return;
    setUploading(true);
    setShowAttachMenu(false);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');

      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          to: activeConversation.contact_phone,
          type: mediaType,
          media_url: publicUrl,
          caption: file.name,
          filename: file.name,
          conversation_id: activeConversation.id,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert('Failed to send file: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Status icon for outbound messages
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'sent': return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-blue-400" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-400" />;
      case 'queued':
      case 'sending': return <Clock className="w-3 h-3 text-gray-500" />;
      default: return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  // Render message content
  const renderMessageContent = (msg: Message) => {
    const content = msg.content;
    const type = msg.message_type;

    // Text
    if (type === 'text') {
      const body = msg.direction === 'inbound' ? content?.text?.body : content?.text?.body;
      return <p className="text-sm whitespace-pre-wrap break-words">{body || content?.body || ''}</p>;
    }

    // Template
    if (type === 'template') {
      const tplName = msg.template_name || content?.template?.name || 'template';
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FileText className="w-3 h-3" />
            <span>Template: {tplName}</span>
          </div>
          {content?.template?.components?.map((comp: any, i: number) => {
            if (comp.type === 'body') {
              return <p key={i} className="text-sm">{comp.text}</p>;
            }
            return null;
          })}
        </div>
      );
    }

    // Image
    if (type === 'image') {
      const url = msg.media_url || content?.image?.link;
      const cap = content?.image?.caption || content?.caption;
      return (
        <div className="space-y-1">
          {url && (
            <img
              src={url}
              alt="Image"
              className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition"
              onClick={() => window.open(url, '_blank')}
            />
          )}
          {cap && <p className="text-sm">{cap}</p>}
        </div>
      );
    }

    // Video
    if (type === 'video') {
      const url = msg.media_url || content?.video?.link;
      const cap = content?.video?.caption || content?.caption;
      return (
        <div className="space-y-1">
          {url && <video src={url} controls className="max-w-[280px] rounded-lg" />}
          {cap && <p className="text-sm">{cap}</p>}
        </div>
      );
    }

    // Audio
    if (type === 'audio') {
      const url = msg.media_url || content?.audio?.link;
      return url ? <audio src={url} controls className="max-w-[240px]" /> : null;
    }

    // Document
    if (type === 'document') {
      const url = msg.media_url || content?.document?.link;
      const filename = content?.document?.filename || content?.filename || 'Document';
      return (
        <a
          href={url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition"
        >
          <File className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <span className="text-sm text-blue-400 truncate">{filename}</span>
        </a>
      );
    }

    // Location
    if (type === 'location') {
      const lat = content?.location?.latitude;
      const lng = content?.location?.longitude;
      return (
        <a
          href={`https://maps.google.com/?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 underline"
        >
          📍 View Location
        </a>
      );
    }

    // Sticker
    if (type === 'sticker') {
      const url = msg.media_url;
      return url ? <img src={url} alt="Sticker" className="w-24 h-24" /> : <span>Sticker</span>;
    }

    // Button reply (quick-reply tap on a template button)
    if (type === 'button') {
      const buttonText = content?.button?.text || content?.text || '';
      return (
        <div className="space-y-0.5">
          <p className="text-sm whitespace-pre-wrap break-words">{buttonText}</p>
          <p className="text-[10px] text-gray-500 italic">Button reply</p>
        </div>
      );
    }

    // Interactive reply (button_reply or list_reply from interactive messages)
    if (type === 'interactive') {
      const inter = content?.interactive;
      let replyText = '';
      let replyType = 'Interactive reply';
      if (inter?.type === 'button_reply') {
        replyText = inter.button_reply?.title || '';
        replyType = 'Button reply';
      } else if (inter?.type === 'list_reply') {
        replyText = inter.list_reply?.title || '';
        replyType = 'List selection';
      } else {
        replyText = inter?.button_reply?.title || inter?.list_reply?.title || '';
      }
      return (
        <div className="space-y-0.5">
          <p className="text-sm whitespace-pre-wrap break-words">{replyText}</p>
          <p className="text-[10px] text-gray-500 italic">{replyType}</p>
        </div>
      );
    }

    // Reaction
    if (type === 'reaction') {
      const emoji = content?.reaction?.emoji || '👍';
      return <p className="text-2xl">{emoji}</p>;
    }

    // Contacts shared
    if (type === 'contacts') {
      const name = content?.contacts?.[0]?.name?.formatted_name || 'Contact';
      return <p className="text-sm">👤 {name}</p>;
    }

    // Fallback
    return <p className="text-sm text-gray-400">[{type || 'unknown'} message]</p>;
  };

  // Window time remaining
  const getWindowTimeLeft = (conv: Conversation | null) => {
    if (!conv?.window_expires_at) return null;
    const expires = new Date(conv.window_expires_at);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-950 rounded-xl overflow-hidden border border-gray-800">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const type = file.type.startsWith('image/') ? 'image'
            : file.type.startsWith('video/') ? 'video'
            : file.type.startsWith('audio/') ? 'audio'
            : 'document';
          handleFileUpload(e, type);
        }}
      />

      {/* Left Panel — Conversation List */}
      <div className={`w-full lg:w-[380px] border-r border-gray-800 flex flex-col flex-shrink-0 ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white mb-3">Inbox</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <MessageSquare className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">No conversations yet</p>
              <p className="text-gray-500 text-xs mt-1">Messages from contacts will appear here</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition border-b border-gray-800/50 ${
                  activeConversation?.id === conv.id
                    ? 'bg-gray-800/70'
                    : 'hover:bg-gray-800/40'
                }`}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {(conv.contact_name || conv.contact_phone).charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-sm font-medium truncate">
                      {conv.contact_name || formatPhoneDisplay(conv.contact_phone)}
                    </h3>
                    <span className={`text-xs flex-shrink-0 ml-2 ${
                      conv.unread_count > 0 ? 'text-emerald-400' : 'text-gray-500'
                    }`}>
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-gray-400 text-xs truncate flex-1">
                      {conv.last_message_direction === 'outbound' && (
                        <span className="text-gray-500">You: </span>
                      )}
                      {conv.last_message_preview || 'No messages'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel — Chat Thread */}
      <div className={`flex-1 flex flex-col ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowMobileChat(false); setActiveConversation(null); }}
                  className="lg:hidden p-1 text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {(activeConversation.contact_name || activeConversation.contact_phone).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">
                    {activeConversation.contact_name || formatPhoneDisplay(activeConversation.contact_phone)}
                  </h3>
                  <p className="text-gray-400 text-xs">
                    {activeConversation.contact_phone}
                  </p>
                </div>
              </div>

              {/* 24h Window Indicator */}
              <div className="flex items-center gap-2">
                {isWindowOpen(activeConversation) ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-xs font-medium">
                      Window: {getWindowTimeLeft(activeConversation)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-red-400 text-xs font-medium">Window closed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.02) 0%, transparent 70%)' }}>
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">No messages in this conversation</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 ${
                        msg.direction === 'outbound'
                          ? 'bg-emerald-700/80 text-white rounded-br-md'
                          : 'bg-gray-800 text-white rounded-bl-md'
                      } ${msg.status === 'failed' ? 'border border-red-500/50' : ''}`}
                      >
                        {renderMessageContent(msg)}

                        <div className={`flex items-center gap-1 mt-1 ${
                          msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className="text-[10px] text-gray-300/60">
                            {formatMessageTime(msg.created_at)}
                          </span>
                          {msg.direction === 'outbound' && <StatusIcon status={msg.status} />}
                          {msg.status === 'failed' && msg.error_message && (
                            <span className="text-[10px] text-red-400 ml-1">{msg.error_message}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-800 bg-gray-900/50 p-3">
              {!isWindowOpen(activeConversation) && (
                <div className="mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-amber-400 text-xs">
                    24-hour window expired. Use a template to message this contact.
                  </p>
                </div>
              )}

              {/* Template Picker */}
              {showTemplates && (
                <div className="mb-3 max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg p-2 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-medium text-gray-300">Approved Templates</span>
                    <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {templates.length === 0 ? (
                    <p className="text-gray-500 text-xs px-2 py-3 text-center">No approved templates</p>
                  ) : (
                    templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => sendTemplate(tpl)}
                        disabled={sending}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{tpl.name}</span>
                          <span className="text-gray-500 text-xs">{tpl.language}</span>
                        </div>
                        {tpl.body_text && (
                          <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{tpl.body_text}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Attachment */}
                <div className="relative">
                  <button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
                    disabled={uploading || (!isWindowOpen(activeConversation))}
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </button>
                  {showAttachMenu && (
                    <div className="absolute bottom-12 left-0 bg-gray-800 border border-gray-700 rounded-lg p-1 shadow-xl z-10 min-w-[140px]">
                      <button
                        onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*'); fileInputRef.current?.click(); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                      >
                        <Image className="w-4 h-4 text-blue-400" /> Image
                      </button>
                      <button
                        onClick={() => { fileInputRef.current?.setAttribute('accept', 'video/*'); fileInputRef.current?.click(); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                      >
                        <Video className="w-4 h-4 text-purple-400" /> Video
                      </button>
                      <button
                        onClick={() => { fileInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx'); fileInputRef.current?.click(); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                      >
                        <File className="w-4 h-4 text-amber-400" /> Document
                      </button>
                    </div>
                  )}
                </div>

                {/* Template Button */}
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={`p-2 rounded-lg transition ${
                    !isWindowOpen(activeConversation)
                      ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </button>

                {/* Text Input */}
                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isWindowOpen(activeConversation) ? 'Type a message...' : 'Use a template to start'}
                  disabled={!isWindowOpen(activeConversation) || sending}
                  rows={1}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ maxHeight: '120px' }}
                />

                {/* Send */}
                <button
                  onClick={sendTextMessage}
                  disabled={!messageText.trim() || !isWindowOpen(activeConversation) || sending}
                  className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">WhatsApp Inbox</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Select a conversation to view messages and reply. Only contacts who have messaged you will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Format phone number for display
function formatPhoneDisplay(phone: string): string {
  if (phone.length > 10) {
    return '+' + phone.substring(0, phone.length - 10) + ' ' + phone.substring(phone.length - 10);
  }
  return phone;
}
