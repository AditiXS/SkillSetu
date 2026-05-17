import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Send, Clock, Play, CheckCircle, ArrowLeft,
  Video, VideoOff, Mic, MicOff, PhoneOff, Phone,
} from 'lucide-react';
import api from '../services/api';
import './SessionRoomPage.css';

// ── WebRTC config ────────────────────────────────────────────────────────────
const RTC_CONFIG = {
  iceTransportPolicy: 'all', // try direct first, fall back to TURN
  iceServers: [
    // Google STUN servers (free, always available)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // OpenRelay Project Free TURN Servers (maintained for robust cross-network WebRTC)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:80?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};
// ─────────────────────────────────────────────────────────────────────────────

const SessionRoomPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── Session / chat state ───────────────────────────────────────────────────
  const [session, setSession]             = useState(null);
  const [messages, setMessages]           = useState([]);
  const [newMessage, setNewMessage]       = useState('');
  const [loading, setLoading]             = useState(true);
  const [socket, setSocket]               = useState(null);
  const [showRating, setShowRating]       = useState(false);
  const [ratingForm, setRatingForm]       = useState({ teachingQuality: 5, communication: 5, helpfulness: 5, review: '' });
  const [timeUntilStart, setTimeUntilStart] = useState(null);
  const [sessionEndedByOther, setSessionEndedByOther] = useState(false);

  // ── Video call state ───────────────────────────────────────────────────────
  const [callState, setCallState]   = useState('idle'); // idle | calling | incoming | active
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff]     = useState(false);
  const [camError, setCamError]     = useState('');

  // ── Refs (not state — avoid re-render loops) ───────────────────────────────
  const messagesEndRef  = useRef(null);
  const localVideoRef   = useRef(null);
  const remoteVideoRef  = useRef(null);
  const peerRef         = useRef(null);   // RTCPeerConnection
  const localStreamRef  = useRef(null);   // local MediaStream
  const remoteStreamRef = useRef(null);
  const socketRef       = useRef(null);   // stable socket ref for WebRTC callbacks
  const pendingCandidatesRef = useRef([]); // queue for ICE candidates before remote description is set

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // ── Fetch session data ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const { session: s } = await api.getSession(id);
        setSession(s);
        const { messages: m } = await api.getMessages(id);
        setMessages(m);
        if (s.status === 'completed') {
          const hasRated = s.mentorId === currentUser.id ? s.mentorRated : s.learnerRated;
          if (!hasRated) setShowRating(true);
        }
      } catch (err) {
        console.error(err);
        navigate('/sessions');
      } finally {
        setLoading(false);
      }
    };
    fetchSessionData();
  }, [id, navigate, currentUser.id]);
  // ── Attach remote stream when UI activates ──────────────────────────────────
  useEffect(() => {
    if ((callState === 'active' || callState === 'calling') && remoteVideoRef.current && remoteStreamRef.current) {
      console.log('useEffect attaching remote stream to video element');
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(e => console.warn('Play prevented by browser:', e));
    }
  }, [callState]);

  // ── WebRTC helpers ─────────────────────────────────────────────────────────
  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    remoteStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const hangUp = useCallback((notify = true) => {
    if (notify && socketRef.current) {
      socketRef.current.emit('webrtc_call_end', { sessionId: id });
    }
    stopLocalStream();
    closePeer();
    setCallState('idle');
    setIsMicMuted(false);
    setIsCamOff(false);
    setCamError('');
  }, [id, stopLocalStream, closePeer]);

  const getUserMedia = async () => {
    try {
      console.log('Attempting to access camera and microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Media stream obtained successfully.');
      return stream;
    } catch (err) {
      console.warn('Camera access failed:', err.name, err.message);
      // Try audio-only if camera blocked
      try {
        console.log('Attempting audio-only fallback...');
        const audioOnly = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setCamError('Camera not available — audio only.');
        return audioOnly;
      } catch (audioErr) {
        console.error('Microphone access also failed:', audioErr.name, audioErr.message);
        setCamError('Could not access camera or microphone. Please check permissions and hardware.');
        return null;
      }
    }
  };

  const createPeer = useCallback((stream) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice_candidate', {
          sessionId: id,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      console.log('WebRTC ontrack received:', e.track.kind);
      
      // Some browsers don't populate e.streams, so we manually build the stream
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(e.track);

      // Force attachment if the video element is ready
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          console.log('Attaching newly constructed remote stream to video element');
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        remoteVideoRef.current.play().catch(err => console.warn('Play prevented in ontrack:', err));
      }
      
      // Also trigger a state update just to force React to re-evaluate the video tag
      setCallState(prev => prev);
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection State:', pc.connectionState);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        console.warn('WebRTC connection failed or disconnected. Hanging up.');
        hangUp(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC ICE Connection State:', pc.iceConnectionState);
    };

    peerRef.current = pc;
    return pc;
  }, [id, hangUp]);

  // ── Socket setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL.replace('/api', ''));
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.emit('join', currentUser.id);
    newSocket.emit('join_session', id);

    // Chat
    newSocket.on('new_message', (msg) => setMessages(prev => [...prev, msg]));

    // Session lifecycle
    newSocket.on('session_started', () =>
      setSession(prev => prev ? { ...prev, status: 'active' } : prev));

    newSocket.on('session_ended', () => {
      setSession(prev => prev ? { ...prev, status: 'completed' } : prev);
      setSessionEndedByOther(true);
      setShowRating(true);
      hangUp(false);
    });

    // ── WebRTC signaling ─────────────────────────────────────────────────────
    newSocket.on('webrtc_incoming_call', () => {
      setCallState('incoming');
    });

    newSocket.on('webrtc_call_rejected', () => {
      setCallState('idle');
      stopLocalStream();
      alert('Call was declined.');
    });

    // Callee accepted → caller creates offer
    newSocket.on('webrtc_call_accepted', async () => {
      const stream = await getUserMedia();
      if (!stream) return hangUp(false);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      newSocket.emit('webrtc_offer', { sessionId: id, offer });
      setCallState('active');
    });

    const flushIceCandidates = async () => {
      if (pendingCandidatesRef.current.length > 0) {
        console.log(`Processing ${pendingCandidatesRef.current.length} queued candidates...`);
        for (const cand of pendingCandidatesRef.current) {
          try {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.error('Error adding queued candidate:', e);
          }
        }
        pendingCandidatesRef.current = [];
      }
    };

    // Callee receives offer → creates answer
    newSocket.on('webrtc_offer', async ({ offer }) => {
      const stream = await getUserMedia();
      if (!stream) return hangUp(false);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushIceCandidates();
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      newSocket.emit('webrtc_answer', { sessionId: id, answer });
      setCallState('active');
    });

    // Caller receives answer
    newSocket.on('webrtc_answer', async ({ answer }) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIceCandidates();
      }
    });

    // ICE candidates
    newSocket.on('webrtc_ice_candidate', async ({ candidate }) => {
      if (peerRef.current && peerRef.current.remoteDescription) {
        try {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) { console.error('Error adding ICE candidate:', e); }
      } else {
        // Peer not ready or remote description not set yet, queue it
        pendingCandidatesRef.current.push(candidate);
      }
    });

    // Other side hung up
    newSocket.on('webrtc_call_ended', () => hangUp(false));
    // ─────────────────────────────────────────────────────────────────────────

    return () => {
      newSocket.close();
      hangUp(false);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session || session.status !== 'confirmed' || !session.scheduledDate) return;
    const tick = () => {
      const diff = new Date(session.scheduledDate) - Date.now();
      setTimeUntilStart(diff > 0 ? Math.ceil(diff / 1000) : null);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Call actions ───────────────────────────────────────────────────────────
  const startCall = async () => {
    setCallState('calling');
    socket.emit('webrtc_call_start', { sessionId: id });
  };

  const acceptCall = () => {
    socket.emit('webrtc_call_accept', { sessionId: id });
    setCallState('active'); // UI feedback; actual media starts after offer received
  };

  const rejectCall = () => {
    socket.emit('webrtc_call_reject', { sessionId: id });
    setCallState('idle');
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMicMuted(m => !m);
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCamOff(c => !c);
  };

  // ── Session actions ────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    try {
      const { message } = await api.sendMessage({ sessionId: id, content: newMessage, type: 'text' });
      socket.emit('send_message', message);
      setNewMessage('');
    } catch (err) { console.error(err); }
  };

  const handleAction = async (action) => {
    try {
      if (action === 'start') {
        const { session: s } = await api.startSession(id);
        setSession(s);
        setTimeUntilStart(null);
        socket.emit('session_started', { sessionId: id });
        socket.emit('send_message', { sessionId: id, senderId: 0, content: 'Session started! Timer is running.', type: 'system', createdAt: new Date() });
      } else if (action === 'complete') {
        hangUp(true);
        const { session: s } = await api.completeSession(id);
        setSession(s);
        socket.emit('session_ended', { sessionId: id });
        socket.emit('send_message', { sessionId: id, senderId: currentUser.id, content: 'Session completed. Please rate the session.', type: 'system', createdAt: new Date() });
        setShowRating(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const submitRatingModel = async (e) => {
    e.preventDefault();
    try {
      await api.submitRating({ sessionId: session.id, ...ratingForm });
      setShowRating(false);
      const { session: s } = await api.getSession(id);
      setSession(s);
      alert('Rating submitted successfully!');
    } catch (err) { alert(err.message); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <div className="sr-loading"><div className="sr-spinner"></div></div>;
  if (!session) return null;

  const isMentor = Number(session.mentorId) === Number(currentUser.id);
  const partner = isMentor ? session.learner : session.mentor;
  const isActive = session.status === 'active';

  return (
    <div className="sr-container">
      <div className={`sr-main ${callState === 'active' ? 'sr-main--call' : ''}`}>

        {/* ── Header ── */}
        <div className="sr-header">
          <div className="sr-header-left">
            <button className="sr-back-btn" onClick={() => navigate('/sessions')}><ArrowLeft size={18} /></button>
            <div className="sr-title-info">
              <h1>{session.topic}</h1>
              <p>with <strong>{partner?.fullName}</strong></p>
            </div>
          </div>
          <div className="sr-header-right">
            <div className="sr-status-badge" data-status={session.status}>
              {session.status.toUpperCase()}
            </div>
            {session.status === 'confirmed' && (
              timeUntilStart !== null ? (
                <button className="sr-action-btn start" disabled>
                  <Clock size={16}/>
                  {` Starts in ${Math.floor(timeUntilStart / 60)}m ${timeUntilStart % 60}s`}
                </button>
              ) : (
                <button className="sr-action-btn start" onClick={() => handleAction('start')}>
                  <Play size={16}/> Start Session
                </button>
              )
            )}
            {isActive && (
              <button className="sr-action-btn complete" onClick={() => handleAction('complete')}>
                <CheckCircle size={16}/> End Session
              </button>
            )}
          </div>
        </div>

        {/* ── Info bar ── */}
        <div className="sr-info-banner">
          <div className="sr-info-item"><Clock size={14}/> {session.duration} min scheduled</div>
          {session.creditsLocked > 0 && <div className="sr-info-item">💰 {session.creditsLocked} credits involved</div>}
        </div>

        {/* ── Session-ended-by-other banner ── */}
        {sessionEndedByOther && (
          <div className="sr-ended-banner">
            <span className="sr-ended-icon">🔔</span>
            <div>
              <strong>{partner?.fullName} has ended the session.</strong>
              <span> Please rate your experience below.</span>
            </div>
          </div>
        )}

        {/* ── Incoming call banner ── */}
        {callState === 'incoming' && (
          <div className="sr-incoming-call">
            <div className="sr-incoming-info">
              <span className="sr-call-pulse">📹</span>
              <div>
                <strong>{partner?.fullName} is calling...</strong>
                <p>Incoming video call</p>
              </div>
            </div>
            <div className="sr-incoming-actions">
              <button className="sr-call-btn reject" onClick={rejectCall}><PhoneOff size={18}/> Decline</button>
              <button className="sr-call-btn accept" onClick={acceptCall}><Phone size={18}/> Accept</button>
            </div>
          </div>
        )}

        {/* ── Body: video (when active) + chat (always) ── */}
        <div className="sr-body">

          {/* Video panel — only when call is active or calling */}
          {(callState === 'active' || callState === 'calling') && (
            <div className="sr-video-panel">
              {callState === 'calling' && (
                <div className="sr-calling-overlay">
                  <div className="sr-calling-spinner"/>
                  <p>Calling {partner?.fullName}…</p>
                  <button className="sr-call-btn reject" onClick={() => hangUp(true)}>
                    <PhoneOff size={18}/> Cancel
                  </button>
                </div>
              )}
              {/* Remote video */}
              <video
                ref={remoteVideoRef}
                className="sr-video-remote"
                autoPlay
                playsInline
                onLoadedMetadata={(e) => e.target.play().catch(console.warn)}
              />
              {/* Local video (PiP) */}
              <video
                ref={localVideoRef}
                className="sr-video-local"
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => e.target.play().catch(console.warn)}
              />
              {/* Camera error */}
              {camError && <div className="sr-cam-error">{camError}</div>}
              {/* Call controls */}
              {callState === 'active' && (
                <div className="sr-video-controls">
                  <button
                    className={`sr-vc-btn ${isMicMuted ? 'active' : ''}`}
                    onClick={toggleMic}
                    title={isMicMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMicMuted ? <MicOff size={18}/> : <Mic size={18}/>}
                  </button>
                  <button
                    className={`sr-vc-btn ${isCamOff ? 'active' : ''}`}
                    onClick={toggleCam}
                    title={isCamOff ? 'Start camera' : 'Stop camera'}
                  >
                    {isCamOff ? <VideoOff size={18}/> : <Video size={18}/>}
                  </button>
                  <button
                    className="sr-vc-btn end-call"
                    onClick={() => hangUp(true)}
                    title="End call"
                  >
                    <PhoneOff size={18}/>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chat panel */}
          <div className="sr-chat-area">
            {/* Start call button — only when session is active and no call running */}
            {isActive && callState === 'idle' && (
              <div className="sr-start-call-row">
                <button className="sr-start-call-btn" onClick={startCall}>
                  <Video size={16}/> Start Video Call
                </button>
              </div>
            )}

            <div className="sr-messages">
              {messages.map((m, i) =>
                m.type === 'system' ? (
                  <div key={i} className="sr-msg-system">
                    <div className="sr-sys-content">{m.content}</div>
                  </div>
                ) : (
                  <div key={i} className={`sr-message-row ${m.senderId === currentUser.id ? 'mine' : 'theirs'}`}>
                    {m.senderId !== currentUser.id && (
                      <div className="sr-msg-avatar">{partner?.fullName[0]}</div>
                    )}
                    <div className="sr-msg-bubble">
                      <div className="sr-msg-sender">{m.senderId === currentUser.id ? 'You' : partner?.fullName}</div>
                      <div className="sr-msg-text">{m.content}</div>
                      <div className="sr-msg-time">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="sr-input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder={session.status === 'completed' ? 'Session is complete' : 'Type your message…'}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                disabled={session.status === 'completed'}
              />
              <button type="submit" disabled={!newMessage.trim() || session.status === 'completed'}>
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Rating modal ── */}
      {showRating && (
        <div className="sr-modal-overlay">
          <div className="sr-modal">
            {isMentor ? (
              <>
                <h2>Rate Your Learner</h2>
                <p>Your feedback helps others know if this learner is legit and worth teaching. <strong>You earn credits for this!</strong></p>
                <form onSubmit={submitRatingModel}>
                  <div className="sr-rating-group">
                    <label>😊 Comfort &amp; Respectfulness</label>
                    <p style={{fontSize:'0.78rem',color:'#888',margin:'-6px 0 6px'}}>Was the learner respectful and made the session comfortable?</p>
                    <input type="range" min="1" max="5" value={ratingForm.teachingQuality} onChange={e => setRatingForm({...ratingForm, teachingQuality: parseInt(e.target.value)})} />
                    <span>{ratingForm.teachingQuality} / 5</span>
                  </div>
                  <div className="sr-rating-group">
                    <label>🎯 Engagement &amp; Effort</label>
                    <p style={{fontSize:'0.78rem',color:'#888',margin:'-6px 0 6px'}}>Did the learner actively participate and try to learn?</p>
                    <input type="range" min="1" max="5" value={ratingForm.communication} onChange={e => setRatingForm({...ratingForm, communication: parseInt(e.target.value)})} />
                    <span>{ratingForm.communication} / 5</span>
                  </div>
                  <div className="sr-rating-group">
                    <label>⏰ Punctuality &amp; Seriousness</label>
                    <p style={{fontSize:'0.78rem',color:'#888',margin:'-6px 0 6px'}}>Was the learner on time and serious about the session?</p>
                    <input type="range" min="1" max="5" value={ratingForm.helpfulness} onChange={e => setRatingForm({...ratingForm, helpfulness: parseInt(e.target.value)})} />
                    <span>{ratingForm.helpfulness} / 5</span>
                  </div>
                  <div className="sr-rating-group">
                    <label>Comments (Optional)</label>
                    <textarea rows="3" placeholder="Any notes for other mentors about this learner..." value={ratingForm.review} onChange={e => setRatingForm({...ratingForm, review: e.target.value})}></textarea>
                  </div>
                  <button type="submit" className="sr-submit-rating">Submit Feedback &amp; Earn Credits</button>
                </form>
              </>
            ) : (
              <>
                <h2>Rate Your Session</h2>
                <p>Your feedback helps maintain platform quality.</p>
                <div style={{background:'#fff8e1',border:'1px solid #ffe082',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'0.85rem',color:'#795548'}}>
                  ℹ️ As a learner, this feedback is your contribution to the community. Credits are not awarded for learner feedback.
                </div>
                <form onSubmit={submitRatingModel}>
                  <div className="sr-rating-group">
                    <label>Teaching Quality</label>
                    <input type="range" min="1" max="5" value={ratingForm.teachingQuality} onChange={e => setRatingForm({...ratingForm, teachingQuality: parseInt(e.target.value)})} />
                    <span>{ratingForm.teachingQuality} / 5</span>
                  </div>
                  <div className="sr-rating-group">
                    <label>Communication</label>
                    <input type="range" min="1" max="5" value={ratingForm.communication} onChange={e => setRatingForm({...ratingForm, communication: parseInt(e.target.value)})} />
                    <span>{ratingForm.communication} / 5</span>
                  </div>
                  <div className="sr-rating-group">
                    <label>Helpfulness</label>
                    <input type="range" min="1" max="5" value={ratingForm.helpfulness} onChange={e => setRatingForm({...ratingForm, helpfulness: parseInt(e.target.value)})} />
                    <span>{ratingForm.helpfulness} / 5</span>
                  </div>
                  <div className="sr-rating-group">
                    <label>Feedback (Optional)</label>
                    <textarea rows="3" placeholder="Leave a review..." value={ratingForm.review} onChange={e => setRatingForm({...ratingForm, review: e.target.value})}></textarea>
                  </div>
                  <button type="submit" className="sr-submit-rating">Submit Feedback</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionRoomPage;
