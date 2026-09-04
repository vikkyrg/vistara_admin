import { adminService } from '../firebase/services';

/**
 * Utility to fix existing admin records that might be missing password field
 */

export const fixExistingAdmins = async () => {
  try {
    console.log('Checking existing admins for missing password fields...');
    
    // Get all admins
    const admins = await adminService.getAll();
    console.log('Found admins:', admins.length);
    
    const adminsToFix = admins.filter(admin => !admin.password);
    console.log('Admins missing password field:', adminsToFix.length);
    
    if (adminsToFix.length === 0) {
      console.log('All admins have password field. No fixes needed.');
      return { fixed: 0, total: admins.length };
    }
    
    // Fix each admin by adding a default password
    const fixPromises = adminsToFix.map(async (admin) => {
      const defaultPassword = 'admin123'; // Default password - user should change this
      console.log(`Fixing admin: ${admin.email}`);
      
      await adminService.update(admin.id, {
        ...admin,
        password: defaultPassword
      });
      
      return admin.email;
    });
    
    const fixedAdmins = await Promise.all(fixPromises);
    console.log('Fixed admins:', fixedAdmins);
    
    return {
      fixed: fixedAdmins.length,
      total: admins.length,
      fixedEmails: fixedAdmins,
      defaultPassword: 'admin123'
    };
    
  } catch (error) {
    console.error('Error fixing existing admins:', error);
    throw error;
  }
};

export const checkAdminPasswordField = async (email) => {
  try {
    const admin = await adminService.getByEmail(email);
    if (!admin) {
      return { exists: false, hasPassword: false };
    }
    
    return {
      exists: true,
      hasPassword: !!admin.password,
      admin: admin
    };
  } catch (error) {
    console.error('Error checking admin:', error);
    throw error;
  }
};