import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  Upload, 
  BarChart3, 
  PieChart, 
  LogOut,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  Plus,
  Menu,
  X,
  LineChart,
  Activity,
  Users,
  Database,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';

ChartJS.register(...registerables);

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Upload {
  id: string;
  fileName: string;
  originalName?: string;
  columns: Array<{name: string, type: string, sampleValues: any[]}>;
  rowCount: number;
  createdAt: string;
}

interface Analysis {
  id: string;
  title: string;
  description?: string;
  chartType: string;
  chartConfig: any;
  chartData: any;
  insights?: any;
  createdAt: string;
  downloadCount?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface DataState {
  uploads: Upload[];
  analyses: Analysis[];
  currentUpload: Upload | null;
  currentAnalysis: Analysis | null;
  isLoading: boolean;
}

interface LoginPayload {
  user: User;
  token: string;
}

// Redux Store Setup
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token'),
    isLoading: false,
    isAuthenticated: !!localStorage.getItem('token')
  } as AuthState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
    },
    loginSuccess: (state, action: PayloadAction<LoginPayload>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('token', action.payload.token);
    },
    loginFailure: (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
    }
  }
});

const dataSlice = createSlice({
  name: 'data',
  initialState: {
    uploads: [],
    analyses: [],
    currentUpload: null,
    currentAnalysis: null,
    isLoading: false
  } as DataState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setUploads: (state, action: PayloadAction<Upload[]>) => {
      state.uploads = action.payload;
    },
    setAnalyses: (state, action: PayloadAction<Analysis[]>) => {
      state.analyses = action.payload;
    },
    setCurrentUpload: (state, action: PayloadAction<Upload | null>) => {
      state.currentUpload = action.payload;
    },
    setCurrentAnalysis: (state, action: PayloadAction<Analysis | null>) => {
      state.currentAnalysis = action.payload;
    },
    addUpload: (state, action: PayloadAction<Upload>) => {
      state.uploads.unshift(action.payload);
    },
    addAnalysis: (state, action: PayloadAction<Analysis>) => {
      state.analyses.unshift(action.payload);
    },
    removeUpload: (state, action: PayloadAction<string>) => {
      state.uploads = state.uploads.filter(upload => upload.id !== action.payload);
    },
    removeAnalysis: (state, action: PayloadAction<string>) => {
      state.analyses = state.analyses.filter(analysis => analysis.id !== action.payload);
    }
  }
});

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    data: dataSlice.reducer
  }
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

// API Service
const apiService = {
  async login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  async register(name: string, email: string, password: string) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    return response.json();
  },

  async getProfile(token: string) {
    const response = await fetch('/api/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async uploadFile(file: File, token: string) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return response.json();
  },

  async getUploads(token: string) {
    const response = await fetch('/api/upload', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async getUploadData(uploadId: string, token: string) {
    const response = await fetch(`/api/upload/${uploadId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async deleteUpload(uploadId: string, token: string) {
    const response = await fetch(`/api/upload/${uploadId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async createAnalysis(analysisData: any, token: string) {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(analysisData)
    });
    return response.json();
  },

  async getAnalyses(token: string) {
    const response = await fetch('/api/analyze', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async deleteAnalysis(analysisId: string, token: string) {
    const response = await fetch(`/api/analyze/${analysisId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
};

// Notification Component
const Notification: React.FC<{message: string, type: 'success' | 'error' | 'info', onClose: () => void}> = 
  ({ message, type, onClose }) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: AlertCircle
  };
  
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg border ${colors[type]} flex items-center space-x-2 shadow-lg z-50`}>
      <Icon className="h-5 w-5" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// Login Form Component
const LoginForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    dispatch(authSlice.actions.loginStart());

    try {
      let response;
      if (isLogin) {
        response = await apiService.login(formData.email, formData.password);
      } else {
        response = await apiService.register(formData.name, formData.email, formData.password);
      }

      if (response.token) {
        dispatch(authSlice.actions.loginSuccess(response));
      } else {
        setError(response.message || 'Authentication failed');
        dispatch(authSlice.actions.loginFailure());
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      dispatch(authSlice.actions.loginFailure());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
        <div className="text-center mb-8">
          <BarChart3 className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Excel Analytics</h1>
          <p className="text-gray-600">Data visualization made simple</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your full name"
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
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter your password (min 6 characters)"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Test:</h4>
          <p className="text-xs text-gray-600">
            Email: demo@example.com<br />
            Password: demo123
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Or create your own account above
          </p>
        </div>
      </div>
    </div>
  );
};

// File Upload Component
const FileUpload: React.FC<{onFileUploaded: (upload: Upload) => void}> = ({ onFileUploaded }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { token } = useSelector((state: RootState) => state.auth);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiService.uploadFile(file, token!);
      clearInterval(interval);
      setUploadProgress(100);

      if (response.upload) {
        onFileUploaded(response.upload);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 1000);
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      setUploading(false);
      setUploadProgress(0);
      alert(`Upload failed: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Excel File</h3>
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div>
            <Loader className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
            <p className="text-lg font-medium text-gray-900">Uploading and Processing...</p>
            <div className="mt-4 bg-gray-200 rounded-full h-2 w-64 mx-auto">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-600">{uploadProgress}% complete</p>
          </div>
        ) : (
          <div>
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Drop your Excel file here
            </h4>
            <p className="text-gray-600 mb-4">
              or click to browse your files
            </p>
            <input
              type="file"
              onChange={handleFileInput}
              accept=".xlsx,.xls"
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer transition duration-200"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </label>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">📋 File Requirements:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Supported formats: .xlsx, .xls</li>
          <li>• Maximum file size: 10MB</li>
          <li>• First row should contain column headers</li>
          <li>• Data should start from the second row</li>
          <li>• Numbers should be in numeric format (not text)</li>
        </ul>
      </div>
    </div>
  );
};

// Chart Builder Component
const ChartBuilder: React.FC<{upload: Upload, onAnalysisCreated: (analysis: Analysis) => void}> = 
  ({ upload, onAnalysisCreated }) => {
  const [analysisConfig, setAnalysisConfig] = useState({
    title: '',
    description: '',
    chartType: 'bar',
    xAxis: { column: '', label: '' },
    yAxis: { column: '', label: '' }
  });
  const [isCreating, setIsCreating] = useState(false);
  const { token } = useSelector((state: RootState) => state.auth);

  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: BarChart3, description: 'Compare categories' },
    { value: 'line', label: 'Line Chart', icon: LineChart, description: 'Show trends over time' },
    { value: 'pie', label: 'Pie Chart', icon: PieChart, description: 'Show proportions' },
    { value: 'scatter', label: 'Scatter Plot', icon: Activity, description: 'Show correlations' },
    { value: 'area', label: 'Area Chart', icon: Activity, description: 'Show volume over time' }
  ];

  const handleCreateAnalysis = async () => {
    if (!analysisConfig.title || !analysisConfig.xAxis.column || !analysisConfig.yAxis.column) {
      alert('Please fill in the title and select both X and Y axis columns');
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiService.createAnalysis({
        uploadId: upload.id,
        title: analysisConfig.title,
        description: analysisConfig.description,
        chartType: analysisConfig.chartType,
        xAxis: {
          column: analysisConfig.xAxis.column,
          label: analysisConfig.xAxis.label || analysisConfig.xAxis.column
        },
        yAxis: {
          column: analysisConfig.yAxis.column,
          label: analysisConfig.yAxis.label || analysisConfig.yAxis.column
        }
      }, token!);

      if (response.analysis) {
        onAnalysisCreated(response.analysis);
      } else {
        throw new Error(response.message || 'Failed to create analysis');
      }
    } catch (error: any) {
      alert(`Failed to create analysis: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Get numeric columns for Y-axis
  const numericColumns = upload.columns.filter(col => col.type === 'number');

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Create Chart Analysis</h3>
        <p className="text-gray-600">File: {upload.originalName || upload.fileName} ({upload.rowCount} rows)</p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Title *</label>
            <input
              type="text"
              value={analysisConfig.title}
              onChange={(e) => setAnalysisConfig({...analysisConfig, title: e.target.value})}
              placeholder="e.g., Sales by Region Analysis"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={analysisConfig.description}
              onChange={(e) => setAnalysisConfig({...analysisConfig, description: e.target.value})}
              placeholder="Optional description"
              className="w-full"
            />
          </div>
        </div>

        {/* Chart Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Chart Type</label>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {chartTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setAnalysisConfig({...analysisConfig, chartType: type.value})}
                className={`
                  flex flex-col items-center p-4 rounded-lg border-2 transition-colors text-center
                  ${analysisConfig.chartType === type.value 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <type.icon className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">{type.label}</span>
                <span className="text-xs text-gray-500 mt-1">{type.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Axis Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">X-Axis Column *</label>
            <select
              value={analysisConfig.xAxis.column}
              onChange={(e) => setAnalysisConfig({
                ...analysisConfig, 
                xAxis: {column: e.target.value, label: e.target.value}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select X-axis column</option>
              {upload.columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.type}) - Sample: {col.sampleValues[0]}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Categories or labels for the chart</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Y-Axis Column *</label>
            <select
              value={analysisConfig.yAxis.column}
              onChange={(e) => setAnalysisConfig({
                ...analysisConfig, 
                yAxis: {column: e.target.value, label: e.target.value}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Y-axis column</option>
              {numericColumns.length > 0 ? (
                numericColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.type}) - Sample: {col.sampleValues[0]}
                  </option>
                ))
              ) : (
                <option disabled>No numeric columns found</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">Numeric values to plot</p>
          </div>
        </div>

        {numericColumns.length === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800">
                No numeric columns detected in your data. Make sure your Excel file has at least one column with numeric values.
              </p>
            </div>
          </div>
        )}

        {/* Preview */}
        {analysisConfig.xAxis.column && analysisConfig.yAxis.column && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Chart Preview Settings:</h4>
            <p className="text-sm text-gray-600">
              <strong>Chart Type:</strong> {chartTypes.find(t => t.value === analysisConfig.chartType)?.label}<br />
              <strong>X-Axis:</strong> {analysisConfig.xAxis.column}<br />
              <strong>Y-Axis:</strong> {analysisConfig.yAxis.column}
            </p>
          </div>
        )}

        {/* Create Button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleCreateAnalysis}
            disabled={isCreating || !analysisConfig.title || !analysisConfig.xAxis.column || !analysisConfig.yAxis.column}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center"
          >
            {isCreating ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Creating Chart...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Create Analysis
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Chart Display Component
const ChartDisplay: React.FC<{analysis: Analysis, onBack: () => void}> = ({ analysis, onBack }) => {
  const downloadChart = () => {
    // Create a canvas element to render the chart for download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // This is a simplified version - in a real app you'd use Chart.js's toBase64Image()
      alert('Chart download feature would be implemented here. In a real app, this would generate and download a PNG/PDF file.');
    }
  };

  const renderChart = () => {
    const { chartType, chartData, chartConfig } = analysis;
    const commonProps = { 
      data: chartData, 
      options: {
        ...chartConfig.options,
        responsive: true,
        maintainAspectRatio: false
      }
    };

    switch (chartType) {
      case 'bar':
        return <Bar {...commonProps} />;
      case 'line':
      case 'area':
        return <Line {...commonProps} />;
      case 'pie':
        return <Pie {...commonProps} />;
      case 'scatter':
        return <Scatter {...commonProps} />;
      default:
        return <Bar {...commonProps} />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex justify-between items-start">
        <div>
          <div className="flex items-center mb-2">
            <button
              onClick={onBack}
              className="mr-3 text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
            <h3 className="text-xl font-semibold text-gray-900">{analysis.title}</h3>
          </div>
          {analysis.description && <p className="text-gray-600 mb-2">{analysis.description}</p>
          )}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Type: {analysis.chartType}</span>
            <span>Created: {new Date(analysis.createdAt).toLocaleDateString()}</span>
            <span>Downloads: {analysis.downloadCount || 0}</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={downloadChart}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition duration-200"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>