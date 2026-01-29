import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import './App.css';

// Auth Context
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// WebSocket Context for real-time updates
const WebSocketContext = createContext(null);
const useWebSocket = () => useContext(WebSocketContext);

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Construct WebSocket URL properly
const getWebSocketUrl = () => {
  if (!API_URL) return null;
  return API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws';
};

const WS_URL = getWebSocketUrl();

// API Helper
const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }
    
    return response.json();
  },
  
  get: (endpoint) => api.request(endpoint),
  post: (endpoint, data) => api.request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint) => api.request(endpoint, { method: 'DELETE' }),
};

// WebSocket Provider for real-time updates
function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef(new Set());

  const connect = useCallback(() => {
    if (!WS_URL) {
      console.log('WebSocket URL not configured');
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Authenticate with token
        const token = localStorage.getItem('authToken');
        if (token) {
          wsRef.current.send(JSON.stringify({ type: 'auth', token }));
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message:', message);
          
          if (message.type === 'snag_update' || message.type === 'notification') {
            setLastUpdate(message);
            // Notify all listeners
            listenersRef.current.forEach(listener => listener(message));
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Attempt reconnect after 3 seconds only if WS_URL exists
        if (WS_URL) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      connect();
    }
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastUpdate, subscribe, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Auth Provider
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('authToken', data.access_token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Icons
const Icons = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Bell: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  LogOut: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Download: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Filter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
  X: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Eye: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  Edit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Menu: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Camera: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Image: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Location: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Building: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  CheckCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

// Login Page
function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('manager@pmc.com');
  const [password, setPassword] = useState('manager123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-sm flex items-center justify-center mx-auto mb-4">
              <Icons.Building />
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">PMC Snag List</h1>
            <p className="text-muted-foreground">Admin Dashboard</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-sm text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
                placeholder="Enter your email"
                data-testid="login-email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                placeholder="Enter your password"
                data-testid="login-password"
                required
              />
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary w-full" data-testid="login-submit">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Default: manager@pmc.com / manager123
          </p>
        </div>
      </div>
    </div>
  );
}

// Sidebar
function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const ws = useWebSocket();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard },
    { id: 'snags', label: 'Snags', icon: Icons.List },
    { id: 'users', label: 'Users', icon: Icons.Users },
    { id: 'notifications', label: 'Notifications', icon: Icons.Bell },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">P</span>
          </div>
          {!collapsed && <span className="font-heading font-bold text-foreground">PMC Snag</span>}
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="lg:hidden text-muted-foreground hover:text-foreground"
          data-testid="toggle-sidebar"
        >
          <Icons.Menu />
        </button>
      </div>
      
      {/* Real-time connection indicator */}
      {!collapsed && (
        <div className="px-4 py-2">
          <div className={`flex items-center gap-2 text-xs ${ws?.isConnected ? 'text-snag-resolved' : 'text-muted-foreground'}`}>
            <div className={`w-2 h-2 rounded-full ${ws?.isConnected ? 'bg-snag-resolved animate-pulse' : 'bg-muted-foreground'}`} />
            {ws?.isConnected ? 'Live Sync Active' : 'Connecting...'}
          </div>
        </div>
      )}
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
            data-testid={`nav-${item.id}`}
          >
            <item.icon />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className={`flex items-center gap-3 mb-4 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">{user?.name?.charAt(0) || 'U'}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          )}
        </div>
        <button onClick={logout} className="sidebar-nav-item text-destructive hover:bg-destructive/10" data-testid="logout-btn">
          <Icons.LogOut />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

// Project Search Autocomplete Component
function ProjectSearchInput({ value, onChange, projects, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value) {
      const filtered = projects.filter(p => 
        p.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  }, [value, projects]);

  return (
    <div className="relative">
      <div className="relative">
        <Icons.Search />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="input-field w-full pl-10"
          placeholder="Type to search or add new project..."
          data-testid="project-search-input"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          <Icons.Building />
        </div>
      </div>
      
      {isOpen && (filteredProjects.length > 0 || value) && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-sm shadow-lg max-h-60 overflow-y-auto">
          {value && !projects.includes(value) && (
            <button
              type="button"
              onClick={() => { onSelect(value); setIsOpen(false); }}
              className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-2 text-primary"
            >
              <Icons.Plus /> Create "{value}"
            </button>
          )}
          {filteredProjects.map((project) => (
            <button
              key={project}
              type="button"
              onClick={() => { onSelect(project); setIsOpen(false); }}
              className="w-full px-4 py-3 text-left hover:bg-muted text-foreground"
            >
              {project}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Photo Upload Component
function PhotoUpload({ photos, setPhotos, maxPhotos = 10 }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (photos.length >= maxPhotos) break;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotos(prev => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Photos ({photos.length}/{maxPhotos})</label>
        <div className="flex gap-2">
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="btn-outline text-sm"
            disabled={photos.length >= maxPhotos}
            data-testid="camera-btn"
          >
            <Icons.Camera /> Camera
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline text-sm"
            disabled={photos.length >= maxPhotos}
            data-testid="gallery-btn"
          >
            <Icons.Image /> Gallery
          </button>
        </div>
      </div>
      
      {photos.length > 0 && (
        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group">
              <img 
                src={photo} 
                alt={`Photo ${idx + 1}`}
                className="w-full h-20 object-cover rounded-sm border border-border"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icons.X />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {photos.length === 0 && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-sm p-8 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <Icons.Image />
          <p className="text-muted-foreground mt-2">Click to upload photos or use camera</p>
        </div>
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }) {
  const styles = {
    open: 'bg-snag-open/15 text-snag-open border-snag-open/30',
    in_progress: 'bg-snag-progress/15 text-snag-progress border-snag-progress/30',
    resolved: 'bg-snag-resolved/15 text-snag-resolved border-snag-resolved/30',
    verified: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  };
  
  const labels = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    verified: 'Verified',
  };
  
  return (
    <span className={`badge ${styles[status] || styles.open}`}>
      {labels[status] || status}
    </span>
  );
}

// Priority Badge Component
function PriorityBadge({ priority }) {
  const styles = {
    high: 'bg-priority-high/15 text-priority-high border-priority-high/30',
    medium: 'bg-priority-medium/15 text-priority-medium border-priority-medium/30',
    low: 'bg-priority-low/15 text-priority-low border-priority-low/30',
  };
  
  return (
    <span className={`badge ${styles[priority] || styles.medium}`}>
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </span>
  );
}

// Dashboard Page
function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentSnags, setRecentSnags] = useState([]);
  const [projectStats, setProjectStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const ws = useWebSocket();

  useEffect(() => {
    loadData();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!ws?.subscribe) return;
    
    const unsubscribe = ws.subscribe((message) => {
      if (message.type === 'snag_update') {
        console.log('Dashboard received update:', message.event);
        setLastUpdateTime(new Date());
        // Reload data on any snag change
        loadData();
      }
    });
    
    return unsubscribe;
  }, [ws]);

  const loadData = async () => {
    try {
      const [statsData, snagsData] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/snags'),
      ]);
      setStats(statsData);
      setRecentSnags(snagsData.slice(0, 5));
      
      // Calculate project-wise stats
      const projectMap = {};
      snagsData.forEach(snag => {
        const project = snag.project_name || 'Uncategorized';
        if (!projectMap[project]) {
          projectMap[project] = { total: 0, open: 0, resolved: 0, lastQueryNo: 0 };
        }
        projectMap[project].total++;
        if (snag.status === 'open') projectMap[project].open++;
        if (snag.status === 'resolved') projectMap[project].resolved++;
        if (snag.query_no > projectMap[project].lastQueryNo) {
          projectMap[project].lastQueryNo = snag.query_no;
        }
      });
      setProjectStats(Object.entries(projectMap).map(([name, data]) => ({ name, ...data })));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Snags', value: stats?.total_snags || 0, color: 'text-foreground', icon: Icons.List },
    { label: 'Open', value: stats?.open_snags || 0, color: 'text-snag-open', icon: Icons.Clock },
    { label: 'In Progress', value: stats?.in_progress_snags || 0, color: 'text-snag-progress', icon: Icons.Edit },
    { label: 'Resolved', value: stats?.resolved_snags || 0, color: 'text-snag-resolved', icon: Icons.CheckCircle },
    { label: 'High Priority', value: stats?.high_priority || 0, color: 'text-priority-high', icon: Icons.Bell },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your snag management</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card p-6" data-testid={`stat-${card.label.toLowerCase().replace(' ', '-')}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon />
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
      
      {/* Building-wise Stats */}
      {projectStats.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-heading text-xl font-semibold text-foreground flex items-center gap-2">
              <Icons.Building /> Building-wise Snag Summary
            </h2>
          </div>
          <div className="card-content">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectStats.map((project) => (
                <div key={project.name} className="bg-muted/50 rounded-sm p-4 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{project.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-medium">{project.total}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last #: </span>
                      <span className="font-mono font-medium">{project.lastQueryNo}</span>
                    </div>
                    <div>
                      <span className="text-snag-open">Open: </span>
                      <span className="font-medium">{project.open}</span>
                    </div>
                    <div>
                      <span className="text-snag-resolved">Resolved: </span>
                      <span className="font-medium">{project.resolved}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          <h2 className="font-heading text-xl font-semibold text-foreground">Recent Snags</h2>
        </div>
        <div className="card-content">
          {recentSnags.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No snags yet. Create your first snag!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Project</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSnags.map((snag) => (
                    <tr key={snag.id}>
                      <td className="font-mono text-xs">#{snag.query_no}</td>
                      <td>{snag.project_name}</td>
                      <td>{snag.location}</td>
                      <td><StatusBadge status={snag.status} /></td>
                      <td><PriorityBadge priority={snag.priority} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Last Update Indicator */}
      {lastUpdateTime && (
        <div className="text-xs text-muted-foreground text-center">
          Last synced: {lastUpdateTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// Snags Page
function SnagsPage() {
  const { user } = useAuth();
  const [snags, setSnags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSnag, setSelectedSnag] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', project: '', search: '' });
  const [projects, setProjects] = useState([]);
  const [realtimeUpdate, setRealtimeUpdate] = useState(null);
  const ws = useWebSocket();

  useEffect(() => {
    loadSnags();
    loadProjects();
  }, [filters.status, filters.priority, filters.project]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!ws?.subscribe) return;
    
    const unsubscribe = ws.subscribe((message) => {
      if (message.type === 'snag_update') {
        console.log('Snags page received update:', message.event);
        setRealtimeUpdate({ event: message.event, time: new Date() });
        
        // Update snags list based on event
        if (message.event === 'created') {
          loadSnags();
          loadProjects();
        } else if (message.event === 'updated') {
          loadSnags();
        } else if (message.event === 'deleted') {
          setSnags(prev => prev.filter(s => s.id !== message.data.id));
        }
      }
    });
    
    return unsubscribe;
  }, [ws]);

  const loadSnags = async () => {
    try {
      let url = '/api/snags?';
      if (filters.status) url += `status=${filters.status}&`;
      if (filters.priority) url += `priority=${filters.priority}&`;
      if (filters.project) url += `project_name=${filters.project}&`;
      const data = await api.get(url);
      setSnags(data);
    } catch (err) {
      console.error('Failed to load snags:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await api.get('/api/projects/names');
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const handleExport = async (format) => {
    const token = localStorage.getItem('authToken');
    const url = `${API_URL}/api/snags/export/${format}`;
    
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `snag_list.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const filteredSnags = snags.filter(snag => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      snag.description?.toLowerCase().includes(search) ||
      snag.location?.toLowerCase().includes(search) ||
      snag.project_name?.toLowerCase().includes(search) ||
      String(snag.query_no).includes(search)
    );
  });

  const canCreate = ['manager', 'inspector'].includes(user?.role);
  const canExport = ['manager', 'authority'].includes(user?.role);

  return (
    <div className="space-y-6" data-testid="snags-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Snags</h1>
          <p className="text-muted-foreground mt-1">{filteredSnags.length} total snags</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canExport && (
            <>
              <button onClick={() => handleExport('excel')} className="btn-outline" data-testid="export-excel">
                <Icons.Download /> Excel
              </button>
              <button onClick={() => handleExport('pdf')} className="btn-outline" data-testid="export-pdf">
                <Icons.Download /> PDF
              </button>
            </>
          )}
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary" data-testid="create-snag-btn">
              <Icons.Plus /> New Snag
            </button>
          )}
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              <Icons.Search />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-field w-full pl-10"
              placeholder="Search by description, location, project or ID..."
              data-testid="search-snags"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-field"
              data-testid="filter-status"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="verified">Verified</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="input-field"
              data-testid="filter-priority"
            >
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filters.project}
              onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              className="input-field"
              data-testid="filter-project"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {(filters.status || filters.priority || filters.project || filters.search) && (
              <button 
                onClick={() => setFilters({ status: '', priority: '', project: '', search: '' })}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Snags Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredSnags.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No snags found. {canCreate && 'Create your first snag!'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Project</th>
                  <th>Location</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Contractor</th>
                  <th>Photos</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSnags.map((snag) => (
                  <tr key={snag.id} data-testid={`snag-row-${snag.id}`}>
                    <td className="font-mono text-xs font-semibold text-primary">#{snag.query_no}</td>
                    <td className="font-medium">{snag.project_name}</td>
                    <td>{snag.location}</td>
                    <td className="max-w-xs truncate">{snag.description}</td>
                    <td><StatusBadge status={snag.status} /></td>
                    <td><PriorityBadge priority={snag.priority} /></td>
                    <td>{snag.assigned_contractor_name || '-'}</td>
                    <td>
                      {snag.photos?.length > 0 ? (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Icons.Image /> {snag.photos.length}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedSnag(snag)}
                        className="p-2 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground"
                        data-testid={`view-snag-${snag.id}`}
                      >
                        <Icons.Eye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {showCreateModal && (
        <CreateSnagModal 
          projects={projects}
          onClose={() => setShowCreateModal(false)} 
          onCreated={() => { setShowCreateModal(false); loadSnags(); loadProjects(); }}
        />
      )}
      
      {selectedSnag && (
        <SnagDetailModal 
          snag={selectedSnag} 
          onClose={() => setSelectedSnag(null)}
          onUpdated={() => { setSelectedSnag(null); loadSnags(); }}
        />
      )}
    </div>
  );
}

// Create Snag Modal
function CreateSnagModal({ projects, onClose, onCreated }) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    location: '',
    project_name: '',
    possible_solution: '',
    utm_coordinates: '',
    priority: 'medium',
    cost_estimate: '',
    assigned_contractor_id: '',
    due_date: '',
  });

  useEffect(() => {
    loadContractors();
  }, []);

  const loadContractors = async () => {
    try {
      const data = await api.get('/api/users/contractors');
      setContractors(data);
    } catch (err) {
      console.error('Failed to load contractors:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        photos: photos,
        cost_estimate: formData.cost_estimate ? parseFloat(formData.cost_estimate) : null,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        assigned_contractor_id: formData.assigned_contractor_id || null,
      };
      await api.post('/api/snags', payload);
      onCreated();
    } catch (err) {
      alert('Failed to create snag: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} data-testid="create-snag-modal">
        <div className="modal-header">
          <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
            <Icons.Plus /> Create New Snag
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icons.X />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-content space-y-4">
          {/* Project Search */}
          <div>
            <label className="label">Project/Building Name *</label>
            <ProjectSearchInput
              value={formData.project_name}
              onChange={(val) => setFormData({ ...formData, project_name: val })}
              projects={projects}
              onSelect={(val) => setFormData({ ...formData, project_name: val })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Each building has its own snag numbering (e.g., Building A: #1, #2... Building B: #1, #2...)
            </p>
          </div>
          
          <div>
            <label className="label">Location *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input-field w-full"
              placeholder="e.g., Floor 3, Room 302, Near Window"
              required
              data-testid="input-location"
            />
          </div>
          
          <div>
            <label className="label">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field w-full h-24 resize-none"
              placeholder="Describe the snag in detail..."
              required
              data-testid="input-description"
            />
          </div>
          
          <div>
            <label className="label">Possible Solution</label>
            <textarea
              value={formData.possible_solution}
              onChange={(e) => setFormData({ ...formData, possible_solution: e.target.value })}
              className="input-field w-full h-20 resize-none"
              placeholder="Suggested fix or solution..."
              data-testid="input-solution"
            />
          </div>
          
          {/* Photo Upload */}
          <PhotoUpload photos={photos} setPhotos={setPhotos} maxPhotos={10} />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input-field w-full"
                data-testid="input-priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Cost Estimate ($)</label>
              <input
                type="number"
                value={formData.cost_estimate}
                onChange={(e) => setFormData({ ...formData, cost_estimate: e.target.value })}
                className="input-field w-full"
                placeholder="0.00"
                min="0"
                step="0.01"
                data-testid="input-cost"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Assign Contractor</label>
              <select
                value={formData.assigned_contractor_id}
                onChange={(e) => setFormData({ ...formData, assigned_contractor_id: e.target.value })}
                className="input-field w-full"
                data-testid="input-contractor"
              >
                <option value="">Not Assigned</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="input-field w-full"
                data-testid="input-due-date"
              />
            </div>
          </div>
          
          <div>
            <label className="label flex items-center gap-2"><Icons.Location /> GPS Coordinates (UTM)</label>
            <input
              type="text"
              value={formData.utm_coordinates}
              onChange={(e) => setFormData({ ...formData, utm_coordinates: e.target.value })}
              className="input-field w-full"
              placeholder="e.g., 32N 500000 4500000"
              data-testid="input-utm"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading || !formData.project_name} className="btn-primary" data-testid="submit-snag">
              {loading ? 'Creating...' : 'Create Snag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Snag Detail Modal with Role-Based Update Fields
function SnagDetailModal({ snag, onClose, onUpdated }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [contractors, setContractors] = useState([]);
  const [photos, setPhotos] = useState(snag.photos || []);
  const [formData, setFormData] = useState({
    description: snag.description,
    location: snag.location,
    possible_solution: snag.possible_solution || '',
    priority: snag.priority,
    status: snag.status,
    cost_estimate: snag.cost_estimate || '',
    assigned_contractor_id: snag.assigned_contractor_id || '',
    due_date: snag.due_date ? snag.due_date.split('T')[0] : '',
    authority_feedback: snag.authority_feedback || '',
    utm_coordinates: snag.utm_coordinates || '',
  });

  const isManager = user?.role === 'manager';
  const isInspector = user?.role === 'inspector';
  const isContractor = user?.role === 'contractor';
  const isAuthority = user?.role === 'authority';
  const canEdit = isManager || isInspector;

  useEffect(() => {
    if (canEdit) loadContractors();
  }, [canEdit]);

  const loadContractors = async () => {
    try {
      const data = await api.get('/api/users/contractors');
      setContractors(data);
    } catch (err) {
      console.error('Failed to load contractors:', err);
    }
  };

  const handleUpdate = async (updates) => {
    setLoading(true);
    try {
      await api.put(`/api/snags/${snag.id}`, updates);
      onUpdated();
    } catch (err) {
      alert('Update failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    const updates = {
      ...formData,
      photos: photos,
      cost_estimate: formData.cost_estimate ? parseFloat(formData.cost_estimate) : null,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      assigned_contractor_id: formData.assigned_contractor_id || null,
    };
    await handleUpdate(updates);
  };

  const handleContractorComplete = () => {
    handleUpdate({ contractor_completed: true, work_completed_date: new Date().toISOString() });
  };

  const handleContractorStartWork = () => {
    handleUpdate({ work_started_date: new Date().toISOString() });
  };

  const handleAuthorityApprove = () => {
    handleUpdate({ authority_approved: true, authority_feedback: formData.authority_feedback });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()} data-testid="snag-detail-modal">
        <div className="modal-header">
          <div>
            <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
              <span className="text-primary font-mono">#{snag.query_no}</span>
              <span className="text-muted-foreground">|</span>
              {snag.project_name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{snag.location}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={snag.status} />
            <PriorityBadge priority={snag.priority} />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4">
              <Icons.X />
            </button>
          </div>
        </div>
        
        <div className="modal-content">
          {editMode && canEdit ? (
            /* Edit Mode - Manager/Inspector */
            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/30 rounded-sm p-3 mb-4">
                <p className="text-sm text-primary font-medium">Editing as {user?.role?.toUpperCase()}</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="verified">Verified</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field w-full h-24 resize-none"
                />
              </div>
              
              <div>
                <label className="label">Possible Solution</label>
                <textarea
                  value={formData.possible_solution}
                  onChange={(e) => setFormData({ ...formData, possible_solution: e.target.value })}
                  className="input-field w-full h-20 resize-none"
                />
              </div>
              
              <PhotoUpload photos={photos} setPhotos={setPhotos} maxPhotos={10} />
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="label">Cost Estimate ($)</label>
                  <input
                    type="number"
                    value={formData.cost_estimate}
                    onChange={(e) => setFormData({ ...formData, cost_estimate: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Assign Contractor</label>
                  <select
                    value={formData.assigned_contractor_id}
                    onChange={(e) => setFormData({ ...formData, assigned_contractor_id: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">Not Assigned</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">GPS Coordinates (UTM)</label>
                  <input
                    type="text"
                    value={formData.utm_coordinates}
                    onChange={(e) => setFormData({ ...formData, utm_coordinates: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              </div>
              
              {(isManager || isAuthority) && (
                <div>
                  <label className="label">Authority Feedback</label>
                  <textarea
                    value={formData.authority_feedback}
                    onChange={(e) => setFormData({ ...formData, authority_feedback: e.target.value })}
                    className="input-field w-full h-20 resize-none"
                    placeholder="Feedback or notes from authority..."
                  />
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button onClick={() => setEditMode(false)} className="btn-outline">Cancel</button>
                <button onClick={handleSaveEdit} disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <p className="text-foreground mt-1">{snag.description}</p>
                  </div>
                  {snag.possible_solution && (
                    <div>
                      <label className="text-sm text-muted-foreground">Possible Solution</label>
                      <p className="text-foreground mt-1">{snag.possible_solution}</p>
                    </div>
                  )}
                  {snag.authority_feedback && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-sm p-3">
                      <label className="text-sm text-amber-500 font-medium">Authority Feedback</label>
                      <p className="text-foreground mt-1">{snag.authority_feedback}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Contractor</label>
                      <p className="text-foreground">{snag.assigned_contractor_name || 'Not Assigned'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Cost Estimate</label>
                      <p className="text-foreground">{snag.cost_estimate ? `$${snag.cost_estimate}` : '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Due Date</label>
                      <p className="text-foreground">{formatDate(snag.due_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Created</label>
                      <p className="text-foreground">{formatDate(snag.created_at)}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Created By</label>
                    <p className="text-foreground">{snag.created_by_name}</p>
                  </div>
                  {snag.utm_coordinates && (
                    <div>
                      <label className="text-sm text-muted-foreground">GPS Coordinates</label>
                      <p className="font-mono text-sm text-foreground">{snag.utm_coordinates}</p>
                    </div>
                  )}
                  {snag.work_started_date && (
                    <div>
                      <label className="text-sm text-muted-foreground">Work Started</label>
                      <p className="text-foreground">{formatDate(snag.work_started_date)}</p>
                    </div>
                  )}
                  {snag.work_completed_date && (
                    <div>
                      <label className="text-sm text-muted-foreground">Work Completed</label>
                      <p className="text-foreground">{formatDate(snag.work_completed_date)}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Photos */}
              {snag.photos && snag.photos.length > 0 && (
                <div className="mt-6">
                  <label className="text-sm text-muted-foreground mb-3 block">Photos ({snag.photos.length})</label>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {snag.photos.map((photo, idx) => (
                      <img 
                        key={idx} 
                        src={photo} 
                        alt={`Snag photo ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-sm border border-border cursor-pointer hover:opacity-80"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Role-Based Actions */}
              <div className="mt-6 pt-6 border-t border-border">
                {/* Contractor Actions */}
                {isContractor && snag.assigned_contractor_id === user?.id && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-sm p-4 mb-4">
                    <h3 className="font-semibold text-green-500 mb-3 flex items-center gap-2">
                      <Icons.Users /> Contractor Actions
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {!snag.work_started_date && (
                        <button 
                          onClick={handleContractorStartWork}
                          disabled={loading}
                          className="btn-outline border-green-500 text-green-500 hover:bg-green-500/10"
                          data-testid="start-work"
                        >
                          <Icons.Clock /> Start Work
                        </button>
                      )}
                      {snag.work_started_date && !snag.work_completed_date && (
                        <button 
                          onClick={handleContractorComplete}
                          disabled={loading}
                          className="btn-primary bg-green-500 hover:bg-green-600"
                          data-testid="mark-complete"
                        >
                          <Icons.Check /> Mark as Completed
                        </button>
                      )}
                      {snag.work_completed_date && (
                        <span className="text-green-500 flex items-center gap-2">
                          <Icons.CheckCircle /> Work Completed
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Authority Actions */}
                {isAuthority && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-sm p-4 mb-4">
                    <h3 className="font-semibold text-amber-500 mb-3 flex items-center gap-2">
                      <Icons.CheckCircle /> Authority Actions
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="label text-amber-500">Add Feedback</label>
                        <textarea
                          value={formData.authority_feedback}
                          onChange={(e) => setFormData({ ...formData, authority_feedback: e.target.value })}
                          className="input-field w-full h-20 resize-none"
                          placeholder="Enter your feedback or approval notes..."
                        />
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={handleAuthorityApprove}
                          disabled={loading || snag.status === 'resolved'}
                          className="btn-primary bg-amber-500 hover:bg-amber-600"
                          data-testid="approve-snag"
                        >
                          <Icons.Check /> Approve Work
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Manager/Inspector Actions */}
                {canEdit && (
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setEditMode(true)} 
                      className="btn-primary"
                      data-testid="edit-snag"
                    >
                      <Icons.Edit /> Edit Snag
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Users Page
function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.get('/api/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const canCreate = user?.role === 'manager';

  const roleColors = {
    manager: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    inspector: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    contractor: 'bg-green-500/15 text-green-400 border-green-500/30',
    authority: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };

  const roleIcons = {
    manager: Icons.Users,
    inspector: Icons.Eye,
    contractor: Icons.Edit,
    authority: Icons.CheckCircle,
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">{users.length} team members</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary" data-testid="create-user-btn">
            <Icons.Plus /> Add User
          </button>
        )}
      </div>
      
      {/* Role Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(roleColors).map(([role, color]) => {
          const RoleIcon = roleIcons[role];
          return (
            <div key={role} className={`badge ${color} flex items-center gap-2`}>
              <RoleIcon />
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </div>
          );
        })}
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          users.map((u) => {
            const RoleIcon = roleIcons[u.role] || Icons.Users;
            return (
              <div key={u.id} className="card p-6" data-testid={`user-card-${u.id}`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold">{u.name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{u.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    <span className={`badge mt-2 ${roleColors[u.role] || roleColors.inspector} flex items-center gap-1 w-fit`}>
                      <RoleIcon /> {u.role}
                    </span>
                  </div>
                </div>
                {u.phone && (
                  <p className="text-sm text-muted-foreground mt-4">{u.phone}</p>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {showCreateModal && (
        <CreateUserModal 
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadUsers(); }}
        />
      )}
    </div>
  );
}

// Create User Modal
function CreateUserModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'contractor',
    phone: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/register', formData);
      onCreated();
    } catch (err) {
      alert('Failed to create user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const roleDescriptions = {
    contractor: 'Can view assigned snags and mark them as completed',
    inspector: 'Can create and edit snags, view all snags',
    authority: 'Can approve completed work and provide feedback',
    manager: 'Full access to all features including user management',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="create-user-modal">
        <div className="modal-header">
          <h2 className="font-heading text-xl font-semibold">Create New User</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icons.X />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-content space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field w-full"
              placeholder="Full name"
              required
              data-testid="user-name"
            />
          </div>
          
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field w-full"
              placeholder="email@example.com"
              required
              data-testid="user-email"
            />
          </div>
          
          <div>
            <label className="label">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-field w-full"
              placeholder="Minimum 6 characters"
              minLength={6}
              required
              data-testid="user-password"
            />
          </div>
          
          <div>
            <label className="label">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input-field w-full"
              data-testid="user-role"
            >
              <option value="contractor">Contractor</option>
              <option value="inspector">Inspector</option>
              <option value="authority">Authority</option>
              <option value="manager">Manager</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">{roleDescriptions[formData.role]}</p>
          </div>
          
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field w-full"
              placeholder="+1 234 567 8900"
              data-testid="user-phone"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary" data-testid="submit-user">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Notifications Page
function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.get('/api/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6" data-testid="notifications-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-outline" data-testid="mark-all-read">
            <Icons.Check /> Mark all as read
          </button>
        )}
      </div>
      
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Icons.Bell />
            <p className="mt-2">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`p-4 flex items-start gap-4 ${!notif.read ? 'bg-primary/5' : ''}`}
                data-testid={`notification-${notif.id}`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.read ? 'bg-muted' : 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatTime(notif.created_at)}</p>
                </div>
                {!notif.read && (
                  <button 
                    onClick={() => markAsRead(notif.id)}
                    className="text-xs text-primary hover:underline flex-shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Main App
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage />;
      case 'snags': return <SnagsPage />;
      case 'users': return <UsersPage />;
      case 'notifications': return <NotificationsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <AuthProvider>
      <WebSocketProvider>
        <AppContent 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          renderPage={renderPage}
        />
      </WebSocketProvider>
    </AuthProvider>
  );
}

function AppContent({ activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed, renderPage }) {
  const { user, loading } = useAuth();
  const ws = useWebSocket();

  // Connect WebSocket when user logs in
  useEffect(() => {
    if (user && ws?.connect) {
      ws.connect();
    }
  }, [user, ws]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      <main className={`main-content ${sidebarCollapsed ? 'main-content-expanded' : ''}`}>
        <div className="max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
