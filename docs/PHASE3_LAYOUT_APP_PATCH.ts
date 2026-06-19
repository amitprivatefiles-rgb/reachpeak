// =====================================================================
// PHASE 3 PATCH — Layout.tsx and App.tsx
// =====================================================================
//
// ─── 1. src/components/Layout.tsx ───
//
// ADD to the lucide-react import:
//   FileText
//
// ADD this nav item to BOTH adminNavItems and userNavItems arrays,
// between "Campaigns" and "Contacts":
//   { id: 'templates', label: 'Templates', icon: FileText },
//
// Example (admin):
//   const adminNavItems = [
//     { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
//     { id: 'approvals', label: 'Campaign Approvals', icon: CheckSquare, ... },
//     { id: 'campaigns', label: 'All Campaigns', icon: Megaphone },
//     { id: 'templates', label: 'Templates', icon: FileText },    // ← ADD
//     { id: 'contacts', label: 'All Contacts', icon: Users },
//     ...
//   ];
//
// ─── 2. src/App.tsx ───
//
// ADD import:
//   import { Templates } from './components/Templates';
//
// ADD to the page-switching logic (in the renderPage function or switch):
//   case 'templates': return <Templates />;
//
// =====================================================================
