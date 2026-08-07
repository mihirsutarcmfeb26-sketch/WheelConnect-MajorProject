import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ChatWindow = ({ bookingId, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const resp = await api.get(`/api/chat/booking/${bookingId}`);
      setMessages(resp.data);
      setError('');
    } catch (err) {
      console.error('Failed to load chat messages:', err);
      setError('Could not load chat messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000); // Polling chat every 4s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText || !inputText.trim()) return;

    setSending(true);
    try {
      await api.post('/api/chat/send', {
        bookingId: bookingId,
        message: inputText.trim(),
      });
      setInputText('');
      fetchMessages();
    } catch (err) {
      console.error('Failed to send chat message:', err);
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card bg-dark text-white border border-secondary shadow-lg">
      <div className="card-header bg-secondary bg-opacity-25 d-flex justify-content-between align-items-center py-3">
        <h6 className="fw-bold mb-0 text-primary">
          <i className="bi bi-chat-dots-fill me-2"></i>
          Booking #{bookingId} Service Chat
        </h6>
        {onClose && (
          <button className="btn-close btn-close-white btn-sm" onClick={onClose}></button>
        )}
      </div>

      <div className="card-body overflow-auto p-3" style={{ height: '320px' }}>
        {loading ? (
          <div className="text-center py-4 text-muted">Loading chat conversation...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-chat-left-text fs-3 d-block mb-2"></i>
            No messages yet. Send a message to start communicating.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUserId === user?.id;
            return (
              <div
                key={msg.id}
                className={`d-flex flex-column mb-3 ${isMe ? 'align-items-end' : 'align-items-start'}`}
              >
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="small text-muted fw-semibold">{msg.senderName || 'User'}</span>
                  <span className="badge bg-secondary style-badge">{msg.senderRole}</span>
                </div>
                <div
                  className={`p-3 rounded-3 max-w-75 ${
                    isMe ? 'bg-primary text-white' : 'bg-secondary bg-opacity-50 text-light'
                  }`}
                  style={{ maxWidth: '80%' }}
                >
                  <p className="mb-0 small">{msg.message}</p>
                </div>
                <span className="text-muted extra-small mt-1" style={{ fontSize: '0.7rem' }}>
                  {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="alert alert-danger mx-3 my-1 py-1 small">{error}</div>}

      <div className="card-footer bg-transparent border-top border-secondary p-3">
        <form onSubmit={handleSend} className="d-flex gap-2">
          <input
            type="text"
            className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="gradient-btn px-4" disabled={sending || !inputText.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
