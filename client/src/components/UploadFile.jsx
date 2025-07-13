import { useRef, useState } from 'react';
import { socket } from '../socket';

const UploadFile = ({ room }) => {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result;

      // Send base64 data via socket
      socket.emit('uploadFile', {
        file: fileData,
        fileName: file.name,
        room
      });

      // Optional local preview
      if (file.type.startsWith('image/')) {
        setPreview(fileData);
        setTimeout(() => setPreview(null), 5000);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative">
      <button
        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
        onClick={() => inputRef.current.click()}
      >
        📎 Upload
      </button>
      <input
        type="file"
        accept="image/*,application/pdf"
        ref={inputRef}
        onChange={handleFileChange}
        hidden
      />
      {preview && (
        <div className="absolute top-[-90px] right-0 bg-white border shadow-lg p-2 rounded max-w-xs">
          <p className="text-sm font-semibold mb-1">Preview:</p>
          <img src={preview} alt="Preview" className="w-full h-auto rounded" />
        </div>
      )}
    </div>
  );
};

export default UploadFile;
