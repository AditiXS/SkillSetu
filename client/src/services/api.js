const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');
const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const handleResponse = async (res) => {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    console.error("Non-JSON response from server:", text);
    throw new Error(`Connection error (Status ${res.status}). Please check your API URL.`);
  }
  
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

const api = {
  // Auth
  register: async (data) => handleResponse(await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })),
  login: async (data) => handleResponse(await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })),
  firebaseLogin: async (data) => handleResponse(await fetch(`${API_URL}/auth/firebase-login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })),
  getProfile: async () => handleResponse(await fetch(`${API_URL}/auth/profile`, { headers: getHeaders() })),
  updateAuthProfile: async (data) => handleResponse(await fetch(`${API_URL}/auth/profile`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) })),
  forgotPassword: async (data) => handleResponse(await fetch(`${API_URL}/auth/forgot-password`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })),
  resetPassword: async (data) => handleResponse(await fetch(`${API_URL}/auth/reset-password`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })),

  // Profile (with file uploads)
  getPublicProfile: async (id) => {
    const url = id ? `${API_URL}/profile/${id}` : `${API_URL}/profile`;
    return handleResponse(await fetch(url, { headers: getHeaders() }));
  },
  updateProfile: async (formData) => {
    const res = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    return handleResponse(res);
  },
  addCertificate: async (formData) => {
    const res = await fetch(`${API_URL}/profile/certificates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    return handleResponse(res);
  },
  featureCertificate: async (certId) => handleResponse(await fetch(`${API_URL}/profile/certificates/${certId}/feature`, { method: 'PUT', headers: getHeaders() })),

  // Community
  getFeed: async () => handleResponse(await fetch(`${API_URL}/community/feed`, { headers: getHeaders() })),
  postAchievement: async (formData) => handleResponse(await fetch(`${API_URL}/community/achievements`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData })),
  deleteAchievement: async (id) => handleResponse(await fetch(`${API_URL}/community/achievements/${id}`, { method: 'DELETE', headers: getHeaders() })),
  likeAchievement: async (id) => handleResponse(await fetch(`${API_URL}/community/achievements/${id}/like`, { method: 'PUT', headers: getHeaders() })),
  postComment: async (commentData) => handleResponse(await fetch(`${API_URL}/community/achievements/comment`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(commentData) })),

  getCommunities: async () => handleResponse(await fetch(`${API_URL}/community`, { headers: getHeaders() })),
  createCommunity: async (data) => handleResponse(await fetch(`${API_URL}/community`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })),
  joinCommunity: async (id) => handleResponse(await fetch(`${API_URL}/community/${id}/join`, { method: 'POST', headers: getHeaders() })),
  getCommunityDetails: async (id) => handleResponse(await fetch(`${API_URL}/community/${id}`, { headers: getHeaders() })),
  deleteCommunity: async (id) => handleResponse(await fetch(`${API_URL}/community/${id}`, { method: 'DELETE', headers: getHeaders() })),

  // Users / Marketplace
  searchUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return handleResponse(await fetch(`${API_URL}/users/search?${query}`, { headers: getHeaders() }));
  },
  getUserProfile: async (id) => handleResponse(await fetch(`${API_URL}/users/${id}`, { headers: getHeaders() })),
  getLeaderboard: async () => handleResponse(await fetch(`${API_URL}/users/leaderboard`, { headers: getHeaders() })),

  // Sessions
  createSessionRequest: async (data) => handleResponse(await fetch(`${API_URL}/sessions/request`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })),
  getRequests: async (type = 'received') => handleResponse(await fetch(`${API_URL}/sessions/requests?type=${type}`, { headers: getHeaders() })),
  acceptRequest: async (id) => handleResponse(await fetch(`${API_URL}/sessions/request/${id}/accept`, { method: 'PUT', headers: getHeaders() })),
  rejectRequest: async (id) => handleResponse(await fetch(`${API_URL}/sessions/request/${id}/reject`, { method: 'PUT', headers: getHeaders() })),
  getMySessions: async () => handleResponse(await fetch(`${API_URL}/sessions/my`, { headers: getHeaders() })),
  getSession: async (id) => handleResponse(await fetch(`${API_URL}/sessions/${id}`, { headers: getHeaders() })),
  startSession: async (id) => handleResponse(await fetch(`${API_URL}/sessions/${id}/start`, { method: 'PUT', headers: getHeaders() })),
  completeSession: async (id) => handleResponse(await fetch(`${API_URL}/sessions/${id}/complete`, { method: 'PUT', headers: getHeaders() })),

  // Messages
  getMessages: async (sessionId) => handleResponse(await fetch(`${API_URL}/messages/${sessionId}`, { headers: getHeaders() })),
  sendMessage: async (data) => handleResponse(await fetch(`${API_URL}/messages`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })),

  // Ratings
  submitRating: async (data) => handleResponse(await fetch(`${API_URL}/ratings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })),
  getUserRatings: async (userId) => handleResponse(await fetch(`${API_URL}/ratings/user/${userId}`, { headers: getHeaders() })),

  // Wallet / Credits
  getWallet: async () => handleResponse(await fetch(`${API_URL}/credits`, { headers: getHeaders() })),

  // Notifications
  getNotifications: async () => handleResponse(await fetch(`${API_URL}/notifications`, { headers: getHeaders() })),
  markNotificationRead: async (id) => handleResponse(await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT', headers: getHeaders() })),
  markAllNotificationsRead: async () => handleResponse(await fetch(`${API_URL}/notifications/read-all`, { method: 'PUT', headers: getHeaders() })),

  // Admin
  getAdminAnalytics: async () => handleResponse(await fetch(`${API_URL}/admin/analytics`, { headers: getHeaders() })),
  getAdminUsers: async () => handleResponse(await fetch(`${API_URL}/admin/users`, { headers: getHeaders() })),
  getAdminSessions: async () => handleResponse(await fetch(`${API_URL}/admin/sessions`, { headers: getHeaders() })),
  verifyUser: async (id) => handleResponse(await fetch(`${API_URL}/admin/verify/${id}`, { method: 'PUT', headers: getHeaders() })),
  deleteUser: async (id) => handleResponse(await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', headers: getHeaders() })),
  createRecruiter: async (email) => handleResponse(await fetch(`${API_URL}/admin/recruiters`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email }) })),
  getTopTalent: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return handleResponse(await fetch(`${API_URL}/admin/talent?${query}`, { headers: getHeaders() }));
  },
};

export const saveAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify({
    id: user?.id,
    fullName: user?.fullName,
    email: user?.email,
    role: user?.role || 'user'
  }));
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => !!localStorage.getItem('token');
export const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');

export { api };
export default api;
