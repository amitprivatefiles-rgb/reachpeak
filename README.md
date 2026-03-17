# WhatsApp Campaign Management System

A comprehensive backend-driven system for managing WhatsApp marketing campaigns, phone numbers, failures, retries, and user access.

## Features

### User Roles

**Admin**
- Full system control
- Create and manage campaigns
- Upload phone numbers using Excel or CSV
- Edit message status
- Manage failed and retry numbers
- Create users and assign roles
- View and edit all reports and dashboard data

**User**
- View-only access
- Login and view dashboard
- View campaigns, contacts, and retry data
- Cannot edit anything or upload files

### Dashboard Metrics

The dashboard displays comprehensive metrics including:
- Total Contacts
- Numbers Uploaded Today
- Total Messages Sent Today
- Total Messages Failed Today
- Campaign Start Times (Top 3 active campaigns)
- Messages Pending for Retry
- Active Campaigns
- Completed Campaigns
- Delivery Rate Percentage
- Failure Rate Percentage
- Blacklisted Numbers
- Active Agents
- Last Upload Time

### Campaign Management

Create and manage unlimited campaigns with:
- Campaign Name
- Campaign Type (Promotion, Follow-up, Offer, Reminder)
- Start/End Time
- Total Numbers, Messages Sent/Failed
- Pending Retry
- Delivery/Failure Percentage
- Campaign Priority
- Message Version (A or B)
- Campaign Cost
- Estimated Revenue
- ROI
- Status (Running, Paused, Completed)

### Contact Database

Supports 10,000+ phone numbers with:
- Phone Number, Name
- Source (Excel, Facebook, Instagram, Website, WhatsApp, Manual)
- City, State
- Campaign Assignment
- Message Status
- Delivery Status
- Attempt Count
- Last Sent Date
- Lead Type (Hot, Warm, Cold)
- Notes
- Blacklist Flag

**Features:**
- Excel/CSV Upload
- Duplicate Prevention
- Edit/Delete Records
- Assign Campaigns
- Search and Filter

### Failed and Retry System

Track and manage failed messages:
- Maximum 3 retry attempts
- Automatic blacklisting after 3 failures
- Failure reason tracking
- Retry status management
- Success/failure rate metrics

### Lead Source Tracking

Monitor performance by source:
- Total numbers per source
- Messages sent/failed
- Converted leads
- Conversion rates

### Agent Tracking

Assign campaigns to agents and track:
- Campaigns handled
- Numbers processed
- Failures
- Conversions
- Follow ups

### Reports

Generate downloadable CSV reports for:
- Campaign performance
- Contact database
- Failed messages
- Agent performance

### Activity Logs

Complete audit trail of:
- Who uploaded data
- Who edited campaigns
- Who retried numbers
- Who changed statuses
- Date and time of every action

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account (already configured)

### Initial Setup

1. The system uses Supabase for authentication and database

2. **Create your first admin user** using Supabase Dashboard:
   - Go to your Supabase project
   - Navigate to Authentication > Users
   - Click "Add User"
   - Enter email and password
   - After creating the user, go to SQL Editor and run:

   ```sql
   INSERT INTO profiles (id, email, full_name, role, is_active)
   VALUES (
     'USER_ID_FROM_AUTH',
     'admin@example.com',
     'Admin User',
     'admin',
     true
   );
   ```

3. Log in with your admin credentials

### Usage

#### For Admins

**Creating a Campaign:**
1. Go to Campaigns page
2. Click "New Campaign"
3. Fill in campaign details
4. Click "Create Campaign"

**Uploading Contacts:**
1. Go to Contacts page
2. Click "Upload"
3. Select source and campaign (optional)
4. Upload CSV file with columns: phone, name, city, state
5. System will automatically skip duplicates

**Managing Failed Messages:**
1. Go to Failed & Retry page
2. View failed messages
3. Click "Retry" to retry a number
4. Numbers are automatically blacklisted after 3 attempts

**Creating Users:**
1. Go to User Management (Admin only)
2. Click "Create User"
3. Enter user details and select role
4. User can now log in with their credentials

**Generating Reports:**
1. Go to Reports page
2. Select report type
3. Optionally set date range
4. Click "Download Report"

#### For Users

- View all metrics and data
- Use filters and search to find information
- Cannot make any changes to the system

## Data Safety

The system includes:
- Duplicate prevention
- Data validation
- Automatic blacklisting
- Row Level Security (RLS)
- Activity logging
- Campaign locking after completion

## Technical Details

### Built With

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Supabase for backend
- Lucide React for icons

### Database Schema

The system uses the following tables:
- profiles (user accounts)
- campaigns (campaign data)
- contacts (phone numbers)
- failed_messages (retry tracking)
- agents (agent information)
- campaign_agents (agent assignments)
- lead_sources (source tracking)
- activity_logs (audit trail)
- dashboard_metrics (daily metrics)

All tables have Row Level Security enabled with role-based access control.

## Security

- Authentication required for all pages
- Role-based access control
- Row Level Security on all database tables
- Admin-only actions are protected
- User actions are logged
- Passwords are securely hashed

## Support

For issues or questions, contact your system administrator.
