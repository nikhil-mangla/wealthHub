import React, { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Menu, X, TrendingUp, Shield, Target, Users, Mail, Phone, MapPin, LogOut, Plus, Trash2 } from "lucide-react";

console.log("VITE_BACKEND_URL =", import.meta.env.VITE_BACKEND_URL);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://wealthhub.onrender.com";
const API = `${BACKEND_URL}/api`;
console.log("Using API:", API);

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attach 401 handler
    const respInterceptor = axios.interceptors.response.use(
      (r) => r,
      (err) => {
        const status = err?.response?.status;
        if (status === 401) {
          localStorage.removeItem("access_token");
          delete axios.defaults.headers.common["Authorization"];
          setUser(null);
          if (window.location.pathname !== "/login") {
            window.location.assign("/login");
          }
        }
        return Promise.reject(err);
      }
    );

    const token = localStorage.getItem("access_token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios
        .get(`${API}/auth/me`)
        .then((res) => setUser(res.data))
        .catch(() => {
          setUser(null);
          delete axios.defaults.headers.common["Authorization"];
          localStorage.removeItem("access_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      axios.interceptors.response.eject(respInterceptor);
    };
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const token = res.data.access_token;
    localStorage.setItem("access_token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    const me = await axios.get(`${API}/auth/me`);
    setUser(me.data);
  };

  const register = async (name, email, password) => {
    await axios.post(`${API}/auth/register`, { name, email, password });
    await login(email, password);
  };

  const logout = async () => {
    localStorage.removeItem("access_token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    window.location.assign("/login");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="glass-card fixed w-full z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <div className="relative">
                <TrendingUp className="h-8 w-8 text-blue-600 group-hover:text-purple-600 transition-all duration-300" />
                <div className="absolute inset-0 bg-blue-400 blur-lg opacity-0 group-hover:opacity-50 transition-opacity"></div>
              </div>
              <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">WealthHub</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-transparent hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:bg-clip-text font-medium transition-all duration-300">Home</Link>
            <Link to="/calculator" className="text-gray-700 hover:text-transparent hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:bg-clip-text font-medium transition-all duration-300">Calculator</Link>
            <Link to="/plans" className="text-gray-700 hover:text-transparent hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:bg-clip-text font-medium transition-all duration-300">Plans</Link>
            <Link to="/about" className="text-gray-700 hover:text-transparent hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:bg-clip-text font-medium transition-all duration-300">About</Link>
            <Link to="/contact" className="text-gray-700 hover:text-transparent hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:bg-clip-text font-medium transition-all duration-300">Contact</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-transparent hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:bg-clip-text font-medium transition-all duration-300">Dashboard</Link>
                <button onClick={handleLogout} className="flex items-center text-gray-700 hover:text-red-600 font-medium transition-all duration-300">
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                <span className="relative z-10">Login</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden glass-card border-t border-white/30">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <Link to="/" className="block py-2 text-gray-700 hover:text-blue-600 transition">Home</Link>
            <Link to="/calculator" className="block py-2 text-gray-700 hover:text-blue-600 transition">Calculator</Link>
            <Link to="/plans" className="block py-2 text-gray-700 hover:text-blue-600 transition">Plans</Link>
            <Link to="/about" className="block py-2 text-gray-700 hover:text-blue-600 transition">About</Link>
            <Link to="/contact" className="block py-2 text-gray-700 hover:text-blue-600 transition">Contact</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="block py-2 text-gray-700 hover:text-blue-600 transition">Dashboard</Link>
                <button onClick={handleLogout} className="block w-full text-left py-2 text-gray-700 hover:text-red-600 transition">Logout</button>
              </>
            ) : (
              <Link to="/login" className="block py-2 text-blue-600 font-medium">Login</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animated-float">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
              Plan for Your <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">Financial Goals</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto drop-shadow-lg">
              Secure your future with smart investment planning for child education, college funds, and retirement
            </p>
            <button 
              onClick={() => navigate("/calculator")} 
              className="relative overflow-hidden glass-card text-gray-900 px-10 py-4 rounded-full text-lg font-bold hover:scale-105 transition-all duration-300 group shadow-2xl"
            >
              <span className="relative z-10">Start Planning Now</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-30 transition-opacity"></div>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="glass-card rounded-2xl p-8 transition-all duration-300 hover:scale-105 group">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl group-hover:scale-110 transition-transform"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Target className="h-8 w-8 text-white relative z-10" />
                </div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-3">Child Education</h3>
              <p className="text-gray-700">Plan ahead for your child's education with strategic investment options</p>
            </div>

            <div className="glass-card rounded-2xl p-8 transition-all duration-300 hover:scale-105 group">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl group-hover:scale-110 transition-transform"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-white relative z-10" />
                </div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-800 bg-clip-text text-transparent mb-3">College Planning</h3>
              <p className="text-gray-700">Build a robust college fund with calculated investment strategies</p>
            </div>

            <div className="glass-card rounded-2xl p-8 transition-all duration-300 hover:scale-105 group">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl group-hover:scale-110 transition-transform"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white relative z-10" />
                </div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-3">Retirement Security</h3>
              <p className="text-gray-700">Secure your retirement with long-term wealth accumulation plans</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Calculator = () => {
  const [formData, setFormData] = useState({
    age: 30,
    monthly_investment: 5000,
    goal_amount: 1000000,
    risk_profile: "moderate"
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/calculate`, formData);
      setResult(response.data);
    } catch (error) {
      console.error("Calculation error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>
      <div className="max-w-6xl mx-auto relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 text-center drop-shadow-lg">Investment Calculator</h1>

        <div className="glass-card rounded-2xl p-8 mb-8 transition-all duration-300 hover:shadow-2xl">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                className="glass-input w-full px-4 py-3 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Monthly Investment (₹)</label>
              <input
                type="number"
                value={formData.monthly_investment}
                onChange={(e) => setFormData({ ...formData, monthly_investment: parseFloat(e.target.value) })}
                className="glass-input w-full px-4 py-3 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Goal Amount (₹)</label>
              <input
                type="number"
                value={formData.goal_amount}
                onChange={(e) => setFormData({ ...formData, goal_amount: parseFloat(e.target.value) })}
                className="glass-input w-full px-4 py-3 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Risk Profile</label>
              <select
                value={formData.risk_profile}
                onChange={(e) => setFormData({ ...formData, risk_profile: e.target.value })}
                className="glass-input w-full px-4 py-3 rounded-xl outline-none"
              >
                <option value="conservative">Conservative (7% return)</option>
                <option value="moderate">Moderate (10% return)</option>
                <option value="aggressive">Aggressive (13% return)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-full font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Calculating..." : "Calculate Projection"}
          </button>
        </div>

        {result && (
          <div className="glass-card rounded-2xl p-8 animate-fadeIn">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">Investment Projection</h2>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="glass-card rounded-xl p-6 border-2 border-blue-300 hover:scale-105 transition-transform">
                <p className="text-sm font-semibold text-gray-600 mb-1">Total Invested</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">₹{result.total_invested.toLocaleString('en-IN')}</p>
              </div>
              <div className="glass-card rounded-xl p-6 border-2 border-green-300 hover:scale-105 transition-transform">
                <p className="text-sm font-semibold text-gray-600 mb-1">Projected Value</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-800 bg-clip-text text-transparent">₹{result.projected_value.toLocaleString('en-IN')}</p>
              </div>
              <div className="glass-card rounded-xl p-6 border-2 border-purple-300 hover:scale-105 transition-transform">
                <p className="text-sm font-semibold text-gray-600 mb-1">Years to Goal</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">{result.years_to_goal}</p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={result.projection} margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
                  <XAxis 
                    dataKey="year" 
                    label={{ value: "Years", position: "insideBottom", offset: -10 }} 
                    stroke="#666"
                    style={{ fontSize: '14px' }}
                  />
                  <YAxis 
                    stroke="#666"
                    style={{ fontSize: '14px' }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                    label={{ 
                      value: "Amount (₹)", 
                      angle: -90, 
                      position: "insideLeft",
                      offset: 10,
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip 
                    formatter={(value) => `₹${value.toLocaleString('en-IN')}`} 
                    contentStyle={{
                      background: 'rgba(255,255,255,0.9)', 
                      backdropFilter: 'blur(10px)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontSize: '14px'
                    }} 
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="value" stroke="url(#blueGradient)" strokeWidth={3} name="Portfolio Value" dot={{fill: '#3B82F6', r: 4}} />
                  <Line type="monotone" dataKey="invested" stroke="url(#greenGradient)" strokeWidth={3} name="Amount Invested" dot={{fill: '#10B981', r: 4}} />
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Plans = () => {
  const plans = [
    {
      title: "Education Savings Plan",
      description: "Build a comprehensive education fund for your children with tax-advantaged investment options",
      features: ["Tax-free growth", "Flexible withdrawals", "Multiple investment options", "State tax benefits"],
      icon: <Target className="h-12 w-12 text:white" />,
      gradient: "from-blue-400 to-blue-600"
    },
    {
      title: "College Fund Strategy",
      description: "Structured investment plans designed specifically for college expenses and higher education",
      features: ["High-yield returns", "Age-based portfolios", "Automatic rebalancing", "Low management fees"],
      icon: <TrendingUp className="h-12 w-12 text-white" />,
      gradient: "from-green-400 to-emerald-600"
    },
    {
      title: "Retirement Planning",
      description: "Secure your retirement with diversified portfolios and long-term wealth building strategies",
      features: ["Compound growth", "Risk management", "Regular income streams", "Estate planning"],
      icon: <Shield className="h-12 w-12 text-white" />,
      gradient: "from-purple-400 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-40 left-10 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center drop-shadow-lg">Investment Plans</h1>
        <p className="text-xl text-white/90 mb-12 text-center max-w-3xl mx-auto drop-shadow">
          Choose from our expertly designed investment plans tailored to your financial goals
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div key={index} className="glass-card rounded-2xl p-8 hover:scale-105 transition-all duration-300 group">
              <div className={`relative w-16 h-16 mb-6 bg-gradient-to-br ${plan.gradient} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                {plan.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{plan.title}</h3>
              <p className="text-gray-700 mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-gray-700">
                    <div className={`w-2 h-2 bg-gradient-to-r ${plan.gradient} rounded-full mr-3`}></div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link 
                to="/calculator" 
                className={`block text-center bg-gradient-to-r ${plan.gradient} text-white py-3 rounded-full font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105`}
              >
                Calculate Returns
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const About = () => {
  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-40 right-10 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 text-center drop-shadow-lg">About WealthHub</h1>

        <div className="glass-card rounded-2xl p-8 mb-8 hover:scale-105 transition-all duration-300">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            At WealthHub, we believe that everyone deserves access to professional financial planning tools and advice. 
            Our mission is to empower individuals and families to achieve their financial goals through smart investment 
            strategies and comprehensive planning.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We specialize in helping families plan for major life milestones including child education, college expenses, 
            and retirement security. Our platform combines cutting-edge technology with proven investment strategies to 
            deliver personalized financial solutions.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 hover:scale-105 transition-all duration-300">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">Our Team</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-4 group">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl w-16 h-16 flex items:center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Expert Advisors</h3>
                <p className="text-gray-700">Certified financial planners</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 group">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Data Scientists</h3>
                <p className="text-gray-700">Advanced analytics team</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/contact`, formData);
      setSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Contact form error:", error);
    }
  };

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 text-center drop-shadow-lg">Contact Us</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass-card rounded-2xl p-8 hover:scale-105 transition-all duration-300">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">Get in Touch</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4 group">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Email</h3>
                  <p className="text-gray-700">contact@wealthhub.com</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Phone</h3>
                  <p className="text-gray-700">+91 xxxxxxxxxx</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Address</h3>
                  <p className="text-gray-700">main street<br />Bangalore</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <h2 className="text-2xl font:bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">Send a Message</h2>
            {submitted && (
              <div className="glass-card border-2 border-green-400 text-green-700 px-4 py-3 rounded-xl mb-4 font-semibold">
                Message sent successfully!
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="glass-input w-full px-4 py-3 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="glass-input w-full px-4 py-3 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea required rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="glass-input w-full px-4 py-3 rounded-xl outline-none resize-none"></textarea>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-full font-bold hover:shadow-xl hover:scale-105 transition-all duration-300">Send Message</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "Authentication error");
    }
  };

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-md mx-auto relative z-10">
        <div className="glass-card rounded-2xl p-8 hover:scale-105 transition-all duration-300 shadow-2xl">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 text-center">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          {error && (
            <div className="glass-card border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 font-semibold">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-input w-full px-4 py-3 rounded-xl outline-none" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="glass-input w-full px-4 py-3 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="glass-input w-full px-4 py-3 rounded-xl outline-none" />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-full font-bold hover:shadow-xl hover:scale-105 transition-all duration-300">
              {mode === "login" ? "Login" : "Register"}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button className="text-blue-600" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, loading, logout } = useAuth();
  const [goals, setGoals] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_type: "Education",
    target_amount: 50000,
    current_amount: 0,
    monthly_investment: 500,
    risk_profile: "moderate"
  });

  useEffect(() => {
    if (!loading) loadGoals();
  }, [loading]);

  const loadGoals = async () => {
    try {
      const response = await axios.get(`${API}/goals`);
      setGoals(response.data);
    } catch (error) {
      console.error("Load goals error:", error);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/goals`, newGoal);
      setShowAddGoal(false);
      setNewGoal({
        goal_type: "Education",
        target_amount: 50000,
        current_amount: 0,
        monthly_investment: 500,
        risk_profile: "moderate"
      });
      loadGoals();
    } catch (error) {
      console.error("Add goal error:", error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      await axios.delete(`${API}/goals/${goalId}`);
      loadGoals();
    } catch (error) {
      console.error("Delete goal error:", error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">Welcome back, {user.name}!</h1>
          <p className="text-white/90 text-lg drop-shadow">Track your financial goals and investment progress</p>
        </div>

        <div className="mb-8">
          <button onClick={() => setShowAddGoal(!showAddGoal)} className="glass-card text-gray-900 px-6 py-3 rounded-full font-bold hover:scale-105 transition-all duration-300 flex items-center space-x-2 shadow-xl">
            <Plus className="h-5 w-5" />
            <span>Add New Goal</span>
          </button>
        </div>

        {showAddGoal && (
          <div className="glass-card rounded-2xl p-8 mb-8 animate-fadeIn">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">Create New Goal</h2>
            <form onSubmit={handleAddGoal} className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Goal Type</label>
                <select value={newGoal.goal_type} onChange={(e) => setNewGoal({ ...newGoal, goal_type: e.target.value })} className="glass-input w-full px-4 py-3 rounded-xl outline-none">
                  <option value="Education">Education</option>
                  <option value="College">College</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Amount (₹)</label>
                <input type="number" required value={newGoal.target_amount} onChange={(e) => setNewGoal({ ...newGoal, target_amount: parseFloat(e.target.value) })} className="glass-input w-full px-4 py-3 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Amount (₹)</label>
                <input type="number" required value={newGoal.current_amount} onChange={(e) => setNewGoal({ ...newGoal, current_amount: parseFloat(e.target.value) })} className="glass-input w-full px-4 py-3 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Monthly Investment (₹)</label>
                <input type="number" required value={newGoal.monthly_investment} onChange={(e) => setNewGoal({ ...newGoal, monthly_investment: parseFloat(e.target.value) })} className="glass-input w-full px-4 py-3 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Risk Profile</label>
                <select value={newGoal.risk_profile} onChange={(e) => setNewGoal({ ...newGoal, risk_profile: e.target.value })} className="glass-input w-full px-4 py-3 rounded-xl outline-none">
                  <option value="conservative">Conservative</option>
                  <option value="moderate">Moderate</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-full font-bold hover:scale-105 transition-all duration-300 shadow-xl">Create Goal</button>
              </div>
            </form>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No goals yet</h2>
            <p className="text-gray-700">Start by adding your first financial goal</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {goals.map((goal) => {
              const progress = (goal.current_amount / goal.target_amount) * 100;
              return (
                <div key={goal.id} className="glass-card rounded-2xl p-8 hover:scale-105 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{goal.goal_type}</h3>
                      <p className="text-gray-700">Target: ₹{goal.target_amount.toLocaleString('en-IN')}</p>
                    </div>
                    <button onClick={() => handleDeleteGoal(goal.id)} className="glass-card p-2 rounded-xl text-red-500 hover:text-red-700 hover:scale-110 transition-all">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
                      <span>Progress</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="glass-card rounded-full h-4 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="glass-card rounded-xl p-3">
                      <p className="text-gray-600 font-semibold">Current Amount</p>
                      <p className="font-bold text-gray-900 text-lg">₹{goal.current_amount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="glass-card rounded-xl p-3">
                      <p className="text-gray-600 font-semibold">Monthly Investment</p>
                      <p className="font-bold text-gray-900 text-lg">₹{goal.monthly_investment.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App; 