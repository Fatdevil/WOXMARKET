/**
 * Helper to determine if an email is a platform admin.
 * Uses the ADMIN_EMAILS environment variable (comma-separated).
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const adminEmailsList = process.env.ADMIN_EMAILS || '';
  const admins = adminEmailsList.split(',').map(e => e.trim().toLowerCase());
  
  return admins.includes(email.toLowerCase());
}
