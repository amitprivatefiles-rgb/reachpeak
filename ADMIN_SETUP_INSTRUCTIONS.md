# Admin Account Setup Instructions

## Your Admin Credentials
- **Email:** admin@reachpeak.in
- **Password:** Amisha@#$2025

## Setup Steps

### Step 1: Create the Authentication User

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** > **Users** in the sidebar
4. Click **Add User** > **Create new user**
5. Enter the following:
   - **Email:** `admin@reachpeak.in`
   - **Password:** `Amisha@#$2025`
   - **Important:** Check the box for "Auto Confirm User"
6. Click **Create User**
7. **Copy the User ID** that appears in the user list (it will be a UUID like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Step 2: Create the Admin Profile

1. In the Supabase Dashboard, navigate to **SQL Editor**
2. Click **New Query**
3. Copy and paste the SQL below
4. **Replace `YOUR_USER_ID_HERE`** with the actual User ID you copied from Step 1
5. Click **Run** to execute

```sql
-- Create admin profile for admin@reachpeak.in
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  'YOUR_USER_ID_HERE',  -- REPLACE THIS with the actual User ID
  'admin@reachpeak.in',
  'System Administrator',
  'admin',
  true
);
```

### Step 3: Verify the Setup

Run this query to verify the profile was created correctly:

```sql
SELECT * FROM profiles WHERE email = 'admin@reachpeak.in';
```

You should see one row with:
- email: admin@reachpeak.in
- role: admin
- is_active: true

### Step 4: Log In

1. Go to your application
2. Use these credentials:
   - Email: `admin@reachpeak.in`
   - Password: `Amisha@#$2025`
3. You now have full admin access!

## Quick Alternative: Run After Creating Auth User

If you prefer, after creating the auth user in Step 1, you can run this SQL which automatically finds the user ID:

```sql
-- Automatically create admin profile using the auth user
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT
  id,
  email,
  'System Administrator',
  'admin',
  true
FROM auth.users
WHERE email = 'admin@reachpeak.in'
LIMIT 1;
```

## Troubleshooting

**If login fails:**
1. Verify the auth user exists: Go to Authentication > Users and check for admin@reachpeak.in
2. Verify the profile exists: Run `SELECT * FROM profiles WHERE email = 'admin@reachpeak.in'`
3. Ensure the user ID in the profile matches the auth user ID
4. Check that `is_active = true` and `role = 'admin'`

**To reset the password:**
1. Go to Supabase Dashboard > Authentication > Users
2. Find admin@reachpeak.in
3. Click on the user
4. Click "Send Password Recovery" or manually reset the password

## Security Note

After logging in, please:
1. Consider changing the password to something even more secure
2. Create separate user accounts for team members
3. Never share these admin credentials
