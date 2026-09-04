// Token Checker Utility
// This script checks all admin tokens in the database and identifies invalid ones

import { adminService } from '../firebase/services.js';

/**
 * Analyze FCM token format
 * @param {string} token - FCM token to analyze
 * @returns {Object} - Analysis result
 */
function analyzeToken(token) {
  if (!token || typeof token !== 'string') {
    return { 
      valid: false, 
      type: 'MISSING', 
      reason: 'Token is null or not a string',
      length: 0
    };
  }

  const length = token.length;
  const hasBase64Chars = /^[A-Za-z0-9_-]+$/.test(token);
  
  // Real FCM tokens are typically 152-163 characters long with base64-like characters
  if (length >= 140 && length <= 170 && hasBase64Chars) {
    return { 
      valid: true, 
      type: 'REAL_FCM', 
      reason: 'Valid FCM token format',
      length
    };
  }
  
  // Check for test token patterns
  if (token.includes('test_') || token.includes('mock_') || token.includes('fallback_')) {
    return { 
      valid: false, 
      type: 'TEST_TOKEN', 
      reason: 'Test/mock/fallback token detected',
      length
    };
  }
  
  // Check for emergency tokens
  if (token.includes('emergency_') || token.includes('basic_')) {
    return { 
      valid: false, 
      type: 'EMERGENCY_TOKEN', 
      reason: 'Emergency/basic token detected',
      length
    };
  }
  
  return { 
    valid: false, 
    type: 'UNKNOWN', 
    reason: `Unknown token format (length: ${length})`,
    length
  };
}

/**
 * Check all admin tokens in database
 */
export async function checkAllAdminTokens() {
  try {
    console.log('🔍 Checking all admin tokens in database...');
    
    const admins = await adminService.getAll();
    console.log(`📊 Found ${admins.length} admins in database`);
    
    const results = {
      total: admins.length,
      valid: 0,
      invalid: 0,
      missing: 0,
      details: []
    };
    
    for (const admin of admins) {
      const analysis = analyzeToken(admin.fcmToken);
      
      const adminResult = {
        adminId: admin.adminId,
        email: admin.email,
        fullName: admin.fullName,
        token: admin.fcmToken,
        analysis
      };
      
      results.details.push(adminResult);
      
      if (!admin.fcmToken) {
        results.missing++;
      } else if (analysis.valid) {
        results.valid++;
      } else {
        results.invalid++;
      }
      
      // Log each admin's token status
      console.log(`👤 ${admin.email}:`, {
        type: analysis.type,
        valid: analysis.valid,
        reason: analysis.reason,
        tokenLength: analysis.length
      });
    }
    
    console.log('\n📈 Summary:');
    console.log(`✅ Valid tokens: ${results.valid}`);
    console.log(`❌ Invalid tokens: ${results.invalid}`);
    console.log(`⚠️ Missing tokens: ${results.missing}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error checking admin tokens:', error);
    throw error;
  }
}

/**
 * Get list of admins with invalid tokens
 */
export async function getInvalidTokenAdmins() {
  try {
    const results = await checkAllAdminTokens();
    
    const invalidAdmins = results.details.filter(admin => 
      !admin.analysis.valid && admin.token
    );
    
    console.log(`🚨 Found ${invalidAdmins.length} admins with invalid tokens:`);
    invalidAdmins.forEach(admin => {
      console.log(`- ${admin.email}: ${admin.analysis.type} (${admin.analysis.reason})`);
    });
    
    return invalidAdmins;
    
  } catch (error) {
    console.error('❌ Error getting invalid token admins:', error);
    throw error;
  }
}

// Export for use in other components
export default { checkAllAdminTokens, getInvalidTokenAdmins, analyzeToken };