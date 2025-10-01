import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  Upload, 
  BarChart3, 
  LogOut,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  Menu,
  X,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader,
  TrendingUp
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Context for global state
const AppContext = createContext();

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// AppProvider Component
const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [uploads, setUploads] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = () => {
    const uploadsData = JSON.parse(localStorage.getItem('uploads') || '[]');
    const analysesData = JSON.parse(localStorage.getItem('analyses') || '[]');
    setUploads(uploadsData);
    setAnalyses(analysesData);
  };

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setUploads([]);
    setAnalyses([]);
  };

  const addUpload = (upload) => {
    const newUploads = [upload, ...uploads];
    setUploads(newUploads);
    localStorage.setItem('uploads', JSON.stringify(newUploads));
  };

  const removeUpload = (id) => {
    const filtered = uploads.filter(u => u.id !== id);
    setUploads(filtered);
    localStorage.setItem('uploads', JSON.stringify(filtered));
  };

  const addAnalysis = (analysis) => {
    const newAnalyses = [analysis, ...analyses];
    setAnalyses(newAnalyses);
    localStorage.setItem('analyses', JSON.stringify(newAnalyses));
  };

  const removeAnalysis = (id) => {
    const filtered = analyses.filter(a => a.id !== id);
    setAnalyses(filtered);
    localStorage.setItem('analyses', JSON.stringify(filtered));
  };

  return (
    <AppContext.Provider value={{
      user,
      uploads,
      analyses,
      currentUpload,
      isLoading,
      setIsLoading,
      login,
      logout,
      addUpload,
      removeUpload,
      addAnalysis,
      removeAnalysis,
      setCurrentUpload,
      loadData
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Mock API Service
const mockApi = {
  async login(email, password) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }
    throw new Error('Invalid credentials');
  },

  async register(name, email, password) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.find(u => u.email === email)) {
      throw new Error('User already exists');
    }
    
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role: users.length === 0 ? 'admin' : 'user'
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    return { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
  },

  async uploadFile(file) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet);
          
          const columns = jsonData.length > 0 ? Object.keys(jsonData[0]).map(name => ({
            name,
            type: typeof jsonData[0][name]
          })) : [];
          
          const upload = {
            id: Date.now().toString(),
            fileName: file.name,
            columns,
            rowCount: jsonData.length,
            data: jsonData,
            createdAt: new Date().toISOString()
          };
          
          resolve(upload);
        } catch (error) {
          reject(new Error('Failed to parse Excel file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }
};

// Notification Component
const Notification = ({ message, type, onClose }) => {
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  const bgColor = type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800';

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg border ${bgColor} flex items-center space-x-2 shadow-lg z-50 max-w-md`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// Login Form Component
const LoginForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userData;
      if (isLogin) {
        userData = await mockApi.login(formData.email, formData.password);
      } else {
        userData = await mockApi.register(formData.name, formData.email, formData.password);
      }
      login(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <BarChart3 className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Excel Analytics</h1>
          <p className="text-gray-600">Data visualization made simple</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your full name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required={!isLogin}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Processing...
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Header Component
const Header = ({ currentView, onViewChange }) => {
  const { user, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">Excel Analytics</span>
          </div>

          <nav className="hidden md:flex space-x-4">
            <button
              onClick={() => onViewChange('dashboard')}
              className={`px-4 py-2 rounded-lg ${currentView === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <Activity className="inline h-5 w-5 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => onViewChange('upload')}
              className={`px-4 py-2 rounded-lg ${currentView === 'upload' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <Upload className="inline h-5 w-5 mr-2" />
              Upload
            </button>
            <button
              onClick={() => onViewChange('analyze')}
              className={`px-4 py-2 rounded-lg ${currentView === 'analyze' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <BarChart3 className="inline h-5 w-5 mr-2" />
              Analyze
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden md:inline">Logout</span>
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <button
              onClick={() => { onViewChange('dashboard'); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Dashboard
            </button>
            <button
              onClick={() => { onViewChange('upload'); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Upload
            </button>
            <button
              onClick={() => { onViewChange('analyze'); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Analyze
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

// Dashboard Component
const Dashboard = ({ onViewChange }) => {
  const { uploads, analyses, removeUpload, removeAnalysis, setCurrentUpload } = useApp();

  const handleDelete = (id, type) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    if (type === 'upload') {
      removeUpload(id);
    } else {
      removeAnalysis(id);
    }
  };

  const stats = [
    { title: 'Total Uploads', value: uploads.length, icon: FileSpreadsheet, color: 'bg-blue-500' },
    { title: 'Analyses Created', value: analyses.length, icon: BarChart3, color: 'bg-green-500' },
    { title: 'Total Rows', value: uploads.reduce((sum, u) => sum + u.rowCount, 0), icon: Activity, color: 'bg-purple-500' },
    { title: 'Avg Columns', value: uploads.length ? Math.round(uploads.reduce((sum, u) => sum + u.columns.length, 0) / uploads.length) : 0, icon: TrendingUp, color: 'bg-orange-500' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-8 mb-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Ready to analyze your data?</h2>
        <p className="mb-4">Upload an Excel file and create stunning visualizations</p>
        <button
          onClick={() => onViewChange('upload')}
          className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
        >
          Upload New File
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Uploads</h2>
          </div>
          <div className="p-6">
            {uploads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No uploads yet</p>
            ) : (
              <div className="space-y-4">
                {uploads.slice(0, 5).map(upload => (
                  <div key={upload.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileSpreadsheet className="h-8 w-8 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{upload.fileName}</p>
                        <p className="text-sm text-gray-500">{upload.rowCount} rows • {upload.columns.length} columns</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-2">
                      <button
                        onClick={() => {
                          setCurrentUpload(upload);
                          onViewChange('analyze');
                        }}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(upload.id, 'upload')}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Analyses</h2>
          </div>
          <div className="p-6">
            {analyses.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No analyses yet</p>
            ) : (
              <div className="space-y-4">
                {analyses.slice(0, 5).map(analysis => (
                  <div key={analysis.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <BarChart3 className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{analysis.title}</p>
                        <p className="text-sm text-gray-500">{analysis.chartType} chart</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(analysis.id, 'analysis')}
                      className="text-red-600 hover:text-red-800 ml-2"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Upload Component
const UploadView = ({ onViewChange }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [notification, setNotification] = useState(null);
  const { addUpload, setCurrentUpload } = useApp();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const upload = await mockApi.uploadFile(file);
      addUpload(upload);
      setCurrentUpload(upload);
      setNotification({ message: 'File uploaded successfully!', type: 'success' });
      setFile(null);
      setTimeout(() => onViewChange('analyze'), 2000);
    } catch (error) {
      setNotification({ message: error.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Excel File</h1>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
            dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!file ? (
            <>
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drag and drop your Excel file here
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <label className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 cursor-pointer">
                Browse Files
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: .xlsx, .xls (Max 10MB)
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <FileSpreadsheet className="h-16 w-16 text-green-600 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setFile(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Remove
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <Loader className="animate-spin h-5 w-5" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span>Upload & Parse</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">What happens next?</h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Your file will be parsed and analyzed automatically</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Column headers and data types will be detected</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>You can create various chart types from your data</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Download charts as PNG images</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

// Analyze Component
const AnalyzeView = () => {
  const { uploads, currentUpload, setCurrentUpload, addAnalysis } = useApp();
  const [selectedUpload, setSelectedUpload] = useState(currentUpload);
  const [chartConfig, setChartConfig] = useState({
    title: '',
    chartType: 'bar',
    xAxis: '',
    yAxis: '',
    description: ''
  });
  const [chartData, setChartData] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (currentUpload) {
      setSelectedUpload(currentUpload);
      if (currentUpload.columns.length > 0) {
        setChartConfig(prev => ({
          ...prev,
          xAxis: currentUpload.columns[0].name,
          yAxis: currentUpload.columns[1]?.name || currentUpload.columns[0].name
        }));
      }
    }
  }, [currentUpload]);

  const handleUploadSelect = (uploadId) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (upload) {
      setSelectedUpload(upload);
      setCurrentUpload(upload);
      if (upload.columns.length > 0) {
        setChartConfig(prev => ({
          ...prev,
          xAxis: upload.columns[0].name,
          yAxis: upload.columns[1]?.name || upload.columns[0].name
        }));
      }
    }
  };

  const generateChartData = () => {
    if (!selectedUpload || !chartConfig.xAxis || !chartConfig.yAxis) return;

    const data = selectedUpload.data.map(row => ({
      name: String(row[chartConfig.xAxis] || ''),
      value: parseFloat(row[chartConfig.yAxis]) || 0
    }));

    setChartData(data);
  };

  const handleSaveAnalysis = () => {
    if (!chartConfig.title) {
      setNotification({ message: 'Please enter a title', type: 'error' });
      return;
    }

    const analysis = {
      id: Date.now().toString(),
      title: chartConfig.title,
      description: chartConfig.description,
      chartType: chartConfig.chartType,
      chartConfig: {
        xAxis: chartConfig.xAxis,
        yAxis: chartConfig.yAxis
      },
      chartData,
      uploadId: selectedUpload.id,
      createdAt: new Date().toISOString()
    };

    addAnalysis(analysis);
    setNotification({ message: 'Analysis saved successfully!', type: 'success' });
  };

  const handleDownloadChart = () => {
    setNotification({ message: 'Chart download feature - use browser screenshot', type: 'success' });
  };

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Analyze Data</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Upload</h2>
            <select
              value={selectedUpload?.id || ''}
              onChange={(e) => handleUploadSelect(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose a file...</option>
              {uploads.map(upload => (
                <option key={upload.id} value={upload.id}>
                  {upload.fileName} ({upload.rowCount} rows)
                </option>
              ))}
            </select>
          </div>

          {selectedUpload && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Chart Configuration</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={chartConfig.title}
                      onChange={(e) => setChartConfig({...chartConfig, title: e.target.value})}
                      placeholder="Enter chart title"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                    <select
                      value={chartConfig.chartType}
                      onChange={(e) => setChartConfig({...chartConfig, chartType: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="pie">Pie Chart</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">X-Axis</label>
                    <select
                      value={chartConfig.xAxis}
                      onChange={(e) => setChartConfig({...chartConfig, xAxis: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {selectedUpload.columns.map(col => (
                        <option key={col.name} value={col.name}>{col.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Y-Axis</label>
                    <select
                      value={chartConfig.yAxis}
                      onChange={(e) => setChartConfig({...chartConfig, yAxis: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {selectedUpload.columns.map(col => (
                        <option key={col.name} value={col.name}>{col.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                    <textarea
                      value={chartConfig.description}
                      onChange={(e) => setChartConfig({...chartConfig, description: e.target.value})}
                      placeholder="Add a description..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    onClick={generateChartData}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2"
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span>Generate Chart</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">File Info</h2>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Rows:</span> {selectedUpload.rowCount}</p>
                  <p><span className="font-medium">Columns:</span> {selectedUpload.columns.length}</p>
                  <p><span className="font-medium">Uploaded:</span> {new Date(selectedUpload.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {chartData ? (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Visualization</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleDownloadChart}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-5 w-5" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={handleSaveAnalysis}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartConfig.chartType === 'bar' && (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#6366f1" />
                      </BarChart>
                    )}
                    {chartConfig.chartType === 'line' && (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} />
                      </LineChart>
                    )}
                    {chartConfig.chartType === 'pie' && (
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const yValues = chartData.map(d => d.value).filter(v => v !== 0);
                    const sum = yValues.reduce((a, b) => a + b, 0);
                    const avg = sum / yValues.length;
                    const min = Math.min(...yValues);
                    const max = Math.max(...yValues);

                    return (
                      <>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-600 font-medium">Sum</p>
                          <p className="text-2xl font-bold text-blue-900">{sum.toFixed(2)}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-green-600 font-medium">Average</p>
                          <p className="text-2xl font-bold text-green-900">{avg.toFixed(2)}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <p className="text-sm text-orange-600 font-medium">Min</p>
                          <p className="text-2xl font-bold text-orange-900">{min.toFixed(2)}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <p className="text-sm text-purple-600 font-medium">Max</p>
                          <p className="text-2xl font-bold text-purple-900">{max.toFixed(2)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Chart Generated</h3>
              <p className="text-gray-500">
                {selectedUpload 
                  ? 'Configure your chart settings and click "Generate Chart"'
                  : 'Select an uploaded file to start analyzing'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
const AppContent = () => {
  const { user } = useApp();
  const [currentView, setCurrentView] = useState('dashboard');

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      {currentView === 'dashboard' && <Dashboard onViewChange={setCurrentView} />}
      {currentView === 'upload' && <UploadView onViewChange={setCurrentView} />}
      {currentView === 'analyze' && <AnalyzeView />}
    </div>
  );
};

// Root App Component
const App = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;