# Setting Up Your First Admin User

Since this is a fresh installation, you need to create your first admin user to access the system.

## Method 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Create an authentication user**
   - Navigate to **Authentication** > **Users** in the sidebar
   - Click **Add User** > **Create new user**
   - Enter:
     - Email: `admin@example.com` (or your preferred email)
     - Password: Create a strong password
     - Check "Auto Confirm User" (important!)
   - Click **Create User**
   - **Copy the User ID** from the user list (you'll need this in the next step)

3. **Create the admin profile**
   - Navigate to **SQL Editor** in the sidebar
   - Click **New Query**
   - Paste this SQL (replace `YOUR_USER_ID` with the ID you copied):

   ```sql
   INSERT INTO profiles (id, email, full_name, role, is_active)
   VALUES (
     'YOUR_USER_ID',
     'admin@example.com',
     'System Administrator',
     'admin',
     true
   );
   ```

   - Click **Run** to execute the query

4. **Log in**
   - Go to your application
   - Log in with the email and password you created
   - You now have full admin access!

## Method 2: Using SQL Editor Only

If you prefer to do everything in SQL:

```sql
-- Note: This requires using Supabase's admin API
-- It's easier to use Method 1 above

-- After creating the auth user through the dashboard UI,
-- run this to create the profile:
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT
  id,
  email,
  'System Administrator',
  'admin',
  true
FROM auth.users
WHERE email = 'admin@example.com'
LIMIT 1;
```

## Creating Additional Users

Once you're logged in as admin, you can create additional users through the app:

1. Go to **User Management** (sidebar)
2. Click **Create User**
3. Fill in the user details
4. Select the role (Admin or User)
5. Click **Create User**

The system will automatically create both the authentication account and profile.

## Security Notes

- Use a strong password for admin accounts
- Don't share admin credentials
- Create separate user accounts for team members
- Regularly review the Activity Logs in Settings

## Troubleshooting

**"Access Denied" after login:**
- Verify the profile was created with `role = 'admin'`
- Check that `is_active = true`
- Query the profiles table: `SELECT * FROM profiles WHERE email = 'your@email.com'`

**Can't create profile:**
- Make sure you're using the exact User ID from the auth.users table
- Verify the email matches exactly
- Check for typos in the SQL query

**Need to reset admin password:**
- Go to Supabase Dashboard > Authentication > Users
- Click on the user
- Click "Reset Password" or edit the user
