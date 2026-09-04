import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, ShoppingBag, Mail, UserCheck } from 'lucide-react';
import { adminService } from '../firebase/services';
import { fcmUtils } from '../utils/fcmUtils';

const Register = () => {
  const [formData, setFormData] = useState({
    adminId: '', // Will be auto-generated
    fullName: '',
    email: '',
    role: 'Admin',
    password: '',
    confirmPassword: ''
  });

  // Function to generate unique Admin ID
  const generateAdminId = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `ADMIN_${timestamp}_${randomStr}`;
  };
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();



  // Generate Admin ID on component mount
  useEffect(() => {
    // Auto-generate Admin ID
    const adminId = generateAdminId();
    setFormData(prev => ({ ...prev, adminId }));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    console.log('Form submit triggered!');
    e.preventDefault();
    console.log('Form data:', formData);
    
    const newErrors = validateForm();
    console.log('Validation errors:', newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      console.log('Form has validation errors, stopping submission');
      return;
    }
    
    console.log('Starting form submission...');
    setIsLoading(true);
    
    try {
      // Check if admin with this email already exists
      const existingAdmin = await adminService.getByEmail(formData.email);
      if (existingAdmin) {
        setErrors({ email: 'Admin with this email already exists' });
        return;
      }

      // Generate FCM token for push notifications
      console.log('🔔 Generating FCM token for admin...');
      let fcmToken = null;
      let fcmTokenStatus = 'not_generated';
      
      try {
        if (fcmUtils.isSupported()) {
          const fcmResult = await fcmUtils.requestPermissionAndGetToken();
          if (fcmResult.success) {
            fcmToken = fcmResult.token;
            fcmTokenStatus = 'generated';
            console.log('✅ FCM token generated successfully:', fcmToken);
          } else {
            console.log('⚠️ FCM token generation failed:', fcmResult.error);
            fcmTokenStatus = 'failed';
          }
        } else {
          console.log('⚠️ FCM not supported in this browser');
          fcmTokenStatus = 'not_supported';
        }
      } catch (fcmError) {
        console.error('❌ Error generating FCM token:', fcmError);
        fcmTokenStatus = 'error';
      }
      
      // Prepare admin data for Firebase – including password and status
      const adminData = {
        adminId: formData.adminId,
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        password: formData.password, // Add password field
        status: 'active', // Add active status
        fcmToken: fcmToken
      };
      
      console.log('📤 Preparing to save admin data to Firebase:');
      console.log('👤 Admin ID:', adminData.adminId);
      console.log('📧 Email:', adminData.email);
      console.log('📊 Admin data (limited):', adminData);
      
      // Store admin data in Firebase Firestore
      try {
        const savedAdmin = await adminService.add(adminData);
        console.log('✅ Admin data saved to Firebase successfully!');
        console.log('📝 Saved admin details:', savedAdmin);
        

      } catch (saveError) {
        console.error('❌ Failed to save admin data to Firebase:', saveError);
        throw saveError;
      }
      
      console.log('✅ Admin registered successfully!');
      
      // Show success message and redirect to login
      alert('Registration successful! Admin account created. Please login with your credentials.');
      navigate('/login');
      
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <ShoppingBag size={32} className="text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Admin Register</h2>
          <p className="text-gray-400">Create your admin account</p>
        </div>

        {/* Registration Form */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{errors.general}</p>
              </div>
            )}



            {/* Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400 ${
                    errors.fullName ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400 ${
                    errors.email ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Role Field */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white ${
                  errors.role ? 'border-red-500' : 'border-gray-600'
                }`}
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
                <option value="moderator">Moderator</option>
                <option value="support">Support</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-400">{errors.role}</p>
              )}
            </div>



            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400 ${
                    errors.password ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white placeholder-gray-400 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
              )}
            </div>



            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              onClick={() => console.log('Button clicked!')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Login Link */}
            {/* <div className="text-center">
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-green-400 hover:text-green-300 font-medium"
                >
                  Sign in here
                </button>
              </p>
            </div> */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;