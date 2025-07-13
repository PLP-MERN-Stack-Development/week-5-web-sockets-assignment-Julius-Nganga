import { useState } from 'react';
import ChatRoom from './components/ChatRoom';

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    if (username.trim()) {
      setIsLoggedIn(true);
      Notification.requestPermission(); // Ask browser permission
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex items-center justify-center p-4">
      {!isLoggedIn ? (
        <div className="bg-white p-6 rounded shadow w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-4">Enter your username</h2>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            placeholder="e.g. Julius"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Join Chat
          </button>
        </div>
      ) : (
        <div className="w-full h-full max-w-5xl bg-white rounded shadow overflow-hidden">
          <ChatRoom username={username} />
        </div>
      )}
    </div>
  );
}

export default App;
