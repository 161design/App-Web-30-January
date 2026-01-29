import React, { useState, useEffect, createContext, useContext, useRef, useCallback, useMemo } from 'react';
import './App.css';
import imageCompression from 'browser-image-compression';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Calendar date picker component
function DatePickerCalendar({ value, onChange, minDate = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const selectDate = (day) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = selected.toISOString().split('T')[0];
    onChange(dateStr);
    setIsOpen(false);
  };

  const isSelected = (day) => {
    if (!value) return false;
    const selected = new Date(value);
    return selected.getDate() === day && 
           selected.getMonth() === currentMonth.getMonth() && 
           selected.getFullYear() === currentMonth.getFullYear();
  };

  const isDisabled = (day) => {
    if (!minDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date < new Date(minDate);
  };

  const isToday = (day) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === currentMonth.getMonth() && 
           today.getFullYear() === currentMonth.getFullYear();
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const clearDate = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={formatDisplayDate(value)}
          onClick={() => setIsOpen(!isOpen)}
          readOnly
          className="input-field w-full cursor-pointer pr-20"
          placeholder="DD/MM/YYYY"
          data-testid="date-picker-input"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={clearDate}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="Clear date"
            >
              <Icons.X />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary"
            data-testid="calendar-toggle-btn"
          >
            <Icons.Calendar />
          </button>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-card border border-border rounded-sm shadow-lg p-3 w-72" data-testid="calendar-popup">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-foreground">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before first day of month */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8" />
            ))}
            
            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const disabled = isDisabled(day);
              const selected = isSelected(day);
              const today = isToday(day);
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => !disabled && selectDate(day)}
                  disabled={disabled}
                  className={`w-8 h-8 rounded text-sm transition-all
                    ${selected ? 'bg-primary text-primary-foreground font-semibold' : ''}
                    ${today && !selected ? 'border border-primary text-primary' : ''}
                    ${disabled ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-muted text-foreground'}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
          
          {/* Quick Actions */}
          <div className="flex justify-between mt-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => selectDate(new Date().getDate())}
              className="text-xs text-primary hover:underline"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Calendar Icon
Icons.Calendar = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

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

// Image Compression Options
const compressionOptions = {
  maxSizeMB: 0.5,          // Max file size 500KB
  maxWidthOrHeight: 1200,  // Max dimension 1200px
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.7
};

// Annotation Colors
const ANNOTATION_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
];

// Photo Annotation Modal Component
function PhotoAnnotationModal({ photo, onSave, onClose }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentColor, setCurrentColor] = useState('#ef4444'); // Default red
  const [annotations, setAnnotations] = useState([]);
  const [tempAnnotation, setTempAnnotation] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef(new Image());

  // Load image and set canvas size
  useEffect(() => {
    const img = imageRef.current;
    img.onload = () => {
      const maxWidth = Math.min(800, window.innerWidth - 100);
      const maxHeight = Math.min(600, window.innerHeight - 300);
      
      let width = img.width;
      let height = img.height;
      
      // Scale down if needed
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      setCanvasSize({ width, height });
      setImageLoaded(true);
    };
    img.src = photo;
  }, [photo]);

  // Draw on canvas
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
    
    // Draw saved annotations
    annotations.forEach(ann => {
      drawEllipse(ctx, ann);
    });
    
    // Draw temporary annotation while drawing
    if (tempAnnotation) {
      drawEllipse(ctx, tempAnnotation);
    }
  }, [imageLoaded, annotations, tempAnnotation, canvasSize]);

  const drawEllipse = (ctx, { startX, startY, endX, endY, color }) => {
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    const radiusX = Math.abs(endX - startX) / 2;
    const radiusY = Math.abs(endY - startY) / 2;
    
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleStart = (e) => {
    e.preventDefault();
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPoint(pos);
  };

  const handleMove = (e) => {
    if (!isDrawing || !startPoint) return;
    e.preventDefault();
    const pos = getMousePos(e);
    setTempAnnotation({
      startX: startPoint.x,
      startY: startPoint.y,
      endX: pos.x,
      endY: pos.y,
      color: currentColor
    });
  };

  const handleEnd = (e) => {
    if (!isDrawing || !startPoint) return;
    e.preventDefault();
    
    const pos = getMousePos(e.changedTouches ? e.changedTouches[0] : e);
    const newAnnotation = {
      startX: startPoint.x,
      startY: startPoint.y,
      endX: pos.x,
      endY: pos.y,
      color: currentColor
    };
    
    // Only add if it has some size
    if (Math.abs(newAnnotation.endX - newAnnotation.startX) > 5 && 
        Math.abs(newAnnotation.endY - newAnnotation.startY) > 5) {
      setAnnotations(prev => [...prev, newAnnotation]);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
    setTempAnnotation(null);
  };

  const handleUndo = () => {
    setAnnotations(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setAnnotations([]);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const annotatedImage = canvas.toDataURL('image/jpeg', 0.9);
    onSave(annotatedImage);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} data-testid="annotation-modal">
        <div className="modal-header">
          <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
            <Icons.Edit /> Annotate Photo
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icons.X />
          </button>
        </div>
        
        <div className="modal-content">
          {/* Color Picker */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-muted-foreground">Color:</span>
            <div className="flex gap-2">
              {ANNOTATION_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setCurrentColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    currentColor === color.value ? 'border-primary scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  data-testid={`color-${color.name.toLowerCase()}`}
                />
              ))}
            </div>
            <div className="flex-1" />
            <button 
              onClick={handleUndo} 
              className="btn-outline text-sm"
              disabled={annotations.length === 0}
              data-testid="undo-btn"
            >
              <Icons.Undo /> Undo
            </button>
            <button 
              onClick={handleClear} 
              className="btn-outline text-sm"
              disabled={annotations.length === 0}
              data-testid="clear-btn"
            >
              <Icons.Trash /> Clear
            </button>
          </div>
          
          {/* Instructions */}
          <p className="text-xs text-muted-foreground mb-3">
            Draw circles/ellipses by clicking and dragging on the image. Choose color above.
          </p>
          
          {/* Canvas Container */}
          <div 
            ref={containerRef}
            className="flex justify-center bg-muted/50 rounded-sm p-2 overflow-auto"
            style={{ maxHeight: '60vh' }}
          >
            {imageLoaded ? (
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                className="cursor-crosshair border border-border rounded-sm"
                style={{ touchAction: 'none' }}
                data-testid="annotation-canvas"
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <button onClick={onClose} className="btn-outline">Cancel</button>
            <button onClick={handleSave} className="btn-primary" data-testid="save-annotation-btn">
              <Icons.Check /> Save Annotation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Undo Icon
Icons.Undo = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>;

// Photo Upload Component with Compression and Annotation
function PhotoUpload({ photos, setPhotos, maxPhotos = 10 }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 });
  const [annotatingIndex, setAnnotatingIndex] = useState(null);

  const compressAndAddPhoto = async (file) => {
    try {
      // Compress the image
      const compressedFile = await imageCompression(file, compressionOptions);
      
      // Convert to base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.readAsDataURL(compressedFile);
      });
    } catch (error) {
      console.error('Compression error:', error);
      // Fallback to original if compression fails
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.readAsDataURL(file);
      });
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setCompressing(true);
    setCompressionProgress({ current: 0, total: files.length });
    
    const newPhotos = [];
    for (let i = 0; i < files.length; i++) {
      if (photos.length + newPhotos.length >= maxPhotos) break;
      
      setCompressionProgress({ current: i + 1, total: files.length });
      const compressed = await compressAndAddPhoto(files[i]);
      newPhotos.push(compressed);
    }
    
    // If single photo, open annotation immediately
    if (newPhotos.length === 1) {
      setPhotos(prev => [...prev, ...newPhotos]);
      setAnnotatingIndex(photos.length); // Index of the new photo
    } else {
      setPhotos(prev => [...prev, ...newPhotos]);
    }
    
    setCompressing(false);
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnnotationSave = (annotatedImage) => {
    setPhotos(prev => prev.map((photo, i) => i === annotatingIndex ? annotatedImage : photo));
    setAnnotatingIndex(null);
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
            disabled={photos.length >= maxPhotos || compressing}
            data-testid="camera-btn"
          >
            <Icons.Camera /> Camera
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline text-sm"
            disabled={photos.length >= maxPhotos || compressing}
            data-testid="gallery-btn"
          >
            <Icons.Image /> Gallery
          </button>
        </div>
      </div>
      
      {/* Compression Progress */}
      {compressing && (
        <div className="bg-primary/10 border border-primary/30 rounded-sm p-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-primary">
              Compressing image {compressionProgress.current} of {compressionProgress.total}...
            </span>
          </div>
          <div className="mt-2 h-1 bg-primary/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(compressionProgress.current / compressionProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {photos.length > 0 && (
        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group">
              <img 
                src={photo} 
                alt={`Photo ${idx + 1}`}
                className="w-full h-20 object-cover rounded-sm border border-border cursor-pointer"
                onClick={() => setAnnotatingIndex(idx)}
                title="Click to annotate"
              />
              {/* Annotate button overlay */}
              <button
                type="button"
                onClick={() => setAnnotatingIndex(idx)}
                className="absolute bottom-1 left-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                title="Annotate"
                data-testid={`annotate-photo-${idx}`}
              >
                <Icons.Edit />
              </button>
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
      
      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground">Click on any photo to annotate with circles/ellipses</p>
      )}
      
      {photos.length === 0 && !compressing && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-sm p-8 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <Icons.Image />
          <p className="text-muted-foreground mt-2">Click to upload photos or use camera</p>
          <p className="text-xs text-muted-foreground mt-1">Images will be auto-compressed and you can annotate them</p>
        </div>
      )}
      
      {/* Annotation Modal */}
      {annotatingIndex !== null && photos[annotatingIndex] && (
        <PhotoAnnotationModal
          photo={photos[annotatingIndex]}
          onSave={handleAnnotationSave}
          onClose={() => setAnnotatingIndex(null)}
        />
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

// Chart Colors
const CHART_COLORS = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#22c55e',
  verified: '#3b82f6',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e'
};

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
          projectMap[project] = { total: 0, open: 0, resolved: 0, in_progress: 0, lastQueryNo: 0 };
        }
        projectMap[project].total++;
        if (snag.status === 'open') projectMap[project].open++;
        if (snag.status === 'resolved') projectMap[project].resolved++;
        if (snag.status === 'in_progress') projectMap[project].in_progress++;
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

  // Prepare chart data
  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Open', value: stats.open_snags, color: CHART_COLORS.open },
      { name: 'In Progress', value: stats.in_progress_snags, color: CHART_COLORS.in_progress },
      { name: 'Resolved', value: stats.resolved_snags, color: CHART_COLORS.resolved },
      { name: 'Verified', value: stats.verified_snags, color: CHART_COLORS.verified },
    ].filter(item => item.value > 0);
  }, [stats]);

  const priorityChartData = useMemo(() => {
    if (!stats || !stats.total_snags) return [];
    // Calculate from projectStats or estimate
    const high = stats.high_priority || 0;
    const remaining = stats.total_snags - high;
    const medium = Math.floor(remaining * 0.6);
    const low = remaining - medium;
    return [
      { name: 'High', value: high, fill: CHART_COLORS.high },
      { name: 'Medium', value: medium, fill: CHART_COLORS.medium },
      { name: 'Low', value: low, fill: CHART_COLORS.low },
    ].filter(item => item.value > 0);
  }, [stats]);

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
      
      {/* Charts Section */}
      {stats && stats.total_snags > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Status Pie Chart */}
          <div className="card p-6">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Icons.List /> Status Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '4px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Building-wise Bar Chart */}
          {projectStats.length > 0 && (
            <div className="card p-6">
              <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icons.Building /> Snags by Building
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '4px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="open" name="Open" stackId="a" fill={CHART_COLORS.open} />
                    <Bar dataKey="in_progress" name="In Progress" stackId="a" fill={CHART_COLORS.in_progress} />
                    <Bar dataKey="resolved" name="Resolved" stackId="a" fill={CHART_COLORS.resolved} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
      
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

// Pagination Component
function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) {
  const pageNumbers = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{startItem}</span> to{' '}
          <span className="font-medium text-foreground">{endItem}</span> of{' '}
          <span className="font-medium text-foreground">{totalItems}</span> results
        </span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="input-field py-1 px-2 text-sm"
          data-testid="items-per-page"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="pagination-btn"
          data-testid="pagination-first"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination-btn"
          data-testid="pagination-prev"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {startPage > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="pagination-btn">1</button>
            {startPage > 2 && <span className="px-2 text-muted-foreground">...</span>}
          </>
        )}
        
        {pageNumbers.map((number) => (
          <button
            key={number}
            onClick={() => onPageChange(number)}
            className={`pagination-btn ${currentPage === number ? 'pagination-btn-active' : ''}`}
            data-testid={`pagination-page-${number}`}
          >
            {number}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2 text-muted-foreground">...</span>}
            <button onClick={() => onPageChange(totalPages)} className="pagination-btn">{totalPages}</button>
          </>
        )}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination-btn"
          data-testid="pagination-next"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="pagination-btn"
          data-testid="pagination-last"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const ws = useWebSocket();

  useEffect(() => {
    loadSnags();
    loadProjects();
  }, [filters.status, filters.priority, filters.project]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.priority, filters.project, filters.search]);

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

  // Filter snags by search
  const filteredSnags = useMemo(() => {
    return snags.filter(snag => {
      if (!filters.search) return true;
      const search = filters.search.toLowerCase();
      return (
        snag.description?.toLowerCase().includes(search) ||
        snag.location?.toLowerCase().includes(search) ||
        snag.project_name?.toLowerCase().includes(search) ||
        String(snag.query_no).includes(search)
      );
    });
  }, [snags, filters.search]);

  // Paginate filtered snags
  const totalPages = Math.ceil(filteredSnags.length / itemsPerPage);
  const paginatedSnags = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSnags.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSnags, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of table
    document.querySelector('[data-testid="snags-page"]')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

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
            <>
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
                  {paginatedSnags.map((snag) => (
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
              
              {/* Pagination */}
              {filteredSnags.length > 10 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredSnags.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              )}
            </>
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
  const [authorities, setAuthorities] = useState([]);
  const [suggestedAuthorities, setSuggestedAuthorities] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
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
    assigned_authority_id: '',
    due_date: '',
  });

  useEffect(() => {
    loadContractors();
    loadAuthorities();
  }, []);

  // Fetch suggested authorities when project changes
  useEffect(() => {
    if (formData.project_name) {
      fetchSuggestedAuthorities(formData.project_name);
    } else {
      setSuggestedAuthorities([]);
    }
  }, [formData.project_name]);

  const loadContractors = async () => {
    try {
      const data = await api.get('/api/users/contractors');
      setContractors(data);
    } catch (err) {
      console.error('Failed to load contractors:', err);
    }
  };

  const loadAuthorities = async () => {
    try {
      const data = await api.get('/api/users/authorities');
      setAuthorities(data);
    } catch (err) {
      console.error('Failed to load authorities:', err);
    }
  };

  const fetchSuggestedAuthorities = async (projectName) => {
    setLoadingSuggestions(true);
    try {
      const data = await api.get(`/api/buildings/${encodeURIComponent(projectName)}/suggested-authorities`);
      setSuggestedAuthorities(data.suggested_authorities || []);
    } catch (err) {
      console.error('Failed to fetch suggested authorities:', err);
      setSuggestedAuthorities([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAutoAssign = () => {
    if (suggestedAuthorities.length > 0) {
      // Auto-assign the top suggested authority
      setFormData({ ...formData, assigned_authority_id: suggestedAuthorities[0].id });
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
        assigned_authority_id: formData.assigned_authority_id || null,
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
              <label className="label flex items-center gap-2">
                <Icons.Calendar /> Due Date
              </label>
              <DatePickerCalendar
                value={formData.due_date}
                onChange={(val) => setFormData({ ...formData, due_date: val })}
                minDate={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          {/* Assign Authority with Auto-Suggest */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Assign Responsible Authority</label>
              {suggestedAuthorities.length > 0 && (
                <button
                  type="button"
                  onClick={handleAutoAssign}
                  className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors flex items-center gap-1"
                  data-testid="auto-assign-btn"
                >
                  <Icons.Zap /> Auto-Assign
                </button>
              )}
            </div>
            
            {/* Suggested Authorities */}
            {loadingSuggestions && (
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                Analyzing building history...
              </div>
            )}
            
            {suggestedAuthorities.length > 0 && !loadingSuggestions && (
              <div className="mb-2 p-2 bg-primary/5 border border-primary/20 rounded-sm">
                <p className="text-xs text-primary font-medium mb-2 flex items-center gap-1">
                  <Icons.Sparkles /> Suggested based on building history:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedAuthorities.map((auth) => (
                    <button
                      key={auth.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, assigned_authority_id: auth.id })}
                      className={`text-xs px-2 py-1 rounded border transition-all ${
                        formData.assigned_authority_id === auth.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:border-primary'
                      }`}
                    >
                      {auth.name} ({auth.snag_count} snags)
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <select
              value={formData.assigned_authority_id}
              onChange={(e) => setFormData({ ...formData, assigned_authority_id: e.target.value })}
              className="input-field w-full"
              data-testid="input-authority"
            >
              <option value="">Not Assigned</option>
              {authorities.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
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
