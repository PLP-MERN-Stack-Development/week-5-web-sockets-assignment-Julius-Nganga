import React from 'react';

const emojis = ['❤️', '😂', '👍', '🔥', '😮'];

const MessageList = ({ messages, currentUser, onReact }) => {
  const isImage = (fileData) => fileData?.startsWith('data:image/');

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`p-2 rounded ${
            msg.sender === currentUser ? 'bg-blue-100 self-end' : 'bg-gray-200 self-start'
          } max-w-[75%]`}
        >
          <div className="text-sm text-gray-700 font-semibold">
            {msg.sender || 'System'}
            <span className="text-xs text-gray-500 ml-2">
              {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* TEXT MESSAGE */}
          {msg.text && <div className="mt-1">{msg.text}</div>}

          {/* FILE MESSAGE */}
          {msg.file && (
            <div className="mt-2">
              {isImage(msg.file) ? (
                <img
                  src={msg.file}
                  alt={msg.fileName}
                  className="max-w-full max-h-48 rounded border"
                />
              ) : (
                <a
                  href={msg.file}
                  download={msg.fileName}
                  className="text-blue-600 underline text-sm"
                >
                  Download {msg.fileName}
                </a>
              )}
            </div>
          )}

          {/* REACTIONS */}
          <div className="flex gap-1 mt-2 items-center flex-wrap">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(index, emoji)}
                className="text-xl hover:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Display reaction counts */}
          {msg.reactions && (
            <div className="mt-1 text-xs text-gray-600 flex gap-2">
              {Object.entries(msg.reactions).map(([emoji, count]) => (
                <span key={emoji}>
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessageList;
