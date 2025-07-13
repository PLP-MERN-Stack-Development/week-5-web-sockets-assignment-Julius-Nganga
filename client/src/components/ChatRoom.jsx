import { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
import UploadFile from './UploadFile';
import MessageList from './MessageList';

const rooms = ['general', 'sports', 'tech', 'random'];
const MESSAGES_PER_PAGE = 15;

const ChatRoom = ({ username }) => {
  const [room, setRoom] = useState('general');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Smooth scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    socket.emit('login', username);

    socket.on('initialMessages', (initialMsgs) => {
      setMessages(initialMsgs);
      scrollToBottom();
    });

    socket.on('olderMessages', (older) => {
      setMessages((prev) => [...older, ...prev]);
    });

    socket.on('chatMessage', (msg) => {
      if (msg.room === room) {
        setMessages((prev) => [...prev, msg]);
        playSound();
        showBrowserNotification(`${msg.sender}: ${msg.text}`);
        scrollToBottom();
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.room]: (prev[msg.room] || 0) + 1
        }));
      }
    });

    socket.on('fileMessage', (msg) => {
      if (msg.room === room) {
        setMessages((prev) => [...prev, msg]);
        playSound();
        showBrowserNotification(`${msg.sender} sent a file`);
        scrollToBottom();
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.room]: (prev[msg.room] || 0) + 1
        }));
      }
    });

    socket.on('notification', (msg) => {
      addSystemMessage(msg);
    });

    socket.on('typing', (user) => setTypingUser(user));
    socket.on('stopTyping', () => setTypingUser(null));
    socket.on('onlineUsers', (users) => setOnlineUsers(users));

    socket.on('messageReaction', ({ messageId, user, reaction }) => {
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === messageId
            ? {
                ...msg,
                reactions: {
                  ...msg.reactions,
                  [reaction]: (msg.reactions?.[reaction] || 0) + 1
                }
              }
            : msg
        )
      );
    });

    // Reconnection logic
    socket.io.on('reconnect', () => {
      socket.emit('login', username);
      socket.emit('joinRoom', room);
      setPage(0);
    });

    return () => {
      socket.off('initialMessages');
      socket.off('olderMessages');
      socket.off('chatMessage');
      socket.off('fileMessage');
      socket.off('notification');
      socket.off('typing');
      socket.off('stopTyping');
      socket.off('onlineUsers');
      socket.off('messageReaction');
      socket.io.off('reconnect');
    };
  }, [room]);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const showBrowserNotification = (text) => {
    if (Notification.permission === 'granted') {
      new Notification('Chat Notification', { body: text });
    }
  };

  const addSystemMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      { sender: 'System', text, timestamp: new Date().toISOString() }
    ]);
    playSound();
    showBrowserNotification(text);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    socket.emit('chatMessage', { text: message, room });
    setMessage('');
    socket.emit('stopTyping', room);
  };

  const handleTyping = () => {
    socket.emit('typing', room);
    setTimeout(() => socket.emit('stopTyping', room), 1000);
  };

  const handleRoomSwitch = (newRoom) => {
    setRoom(newRoom);
    setMessages([]);
    setPage(0);
    setUnreadCounts((prev) => ({ ...prev, [newRoom]: 0 }));
    socket.emit('joinRoom', newRoom);
  };

  const handleReact = (messageId, reaction) => {
    socket.emit('reactMessage', { messageId, reaction, room });
  };

  const loadOlderMessages = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    socket.emit('loadMore', { room, page: nextPage });
  };

  const filteredMessages = searchTerm
    ? messages.filter(
        (msg) =>
          msg.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.sender?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : messages;

  return (
    <div className="flex flex-col h-full w-full">
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Top Bar */}
      <div className="flex flex-wrap justify-between items-center p-2 bg-blue-100">
        <div className="flex flex-wrap gap-2">
          {rooms.map((r) => (
            <button
              key={r}
              onClick={() => handleRoomSwitch(r)}
              className={`relative px-3 py-1 rounded ${
                r === room ? 'bg-blue-600 text-white' : 'bg-white text-black'
              }`}
            >
              #{r}
              {unreadCounts[r] > 0 && r !== room && (
                <span className="absolute -top-1 -right-2 text-xs bg-red-500 text-white px-1 rounded-full">
                  {unreadCounts[r]}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-700 mt-2 sm:mt-0">
          Online: {onlineUsers.length}
        </p>
      </div>

      {/* Search & Load More */}
      <div className="flex items-center gap-2 p-2 border-b">
        <button
          onClick={loadOlderMessages}
          className="text-sm text-blue-600 hover:underline"
        >
          ⬆ Load older messages
        </button>
        <input
          type="text"
          placeholder="🔍 Search messages"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-1 border rounded text-sm"
        />
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-scroll p-4 bg-gray-50">
        <MessageList
          messages={filteredMessages}
          currentUser={username}
          onReact={handleReact}
        />
        {typingUser && (
          <p className="text-sm italic text-gray-500 mt-1">{typingUser} is typing...</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex items-center gap-2 p-2 border-t">
        <input
          type="text"
          value={message}
          placeholder={`Message #${room}`}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
        >
          Send
        </button>
        <UploadFile room={room} />
      </div>
    </div>
  );
};

export default ChatRoom;
