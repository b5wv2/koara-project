import { LayoutDashboard, Users, Database, Package, ShieldCheck, Tag, Settings, CreditCard, Banknote, Palette } from 'lucide-react';

/**
 * Navigation item definitions for Admin and Merchant dashboards.
 */
export const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'merchants', icon: Users, label: 'Store Management' },
  { key: 'ledger', icon: Database, label: 'Global Ledger' },
  { key: 'kyc', icon: ShieldCheck, label: 'KYC Requests' },
  { key: 'withdrawals', icon: Banknote, label: 'Withdrawals' },
  { key: 'catalog', icon: Package, label: 'Product Catalog' },
];

export const MERCHANT_NAV_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'products', icon: Package, label: 'Gift Cards' },
  { key: 'topups', icon: Package, label: 'Direct Top-ups' },
  { key: 'promotions', icon: Tag, label: 'Promotions' },
  { key: 'customization', icon: Palette, label: 'Store Customization' },
  { key: 'settings', icon: Settings, label: 'Store Settings' },
  { key: 'payouts', icon: CreditCard, label: 'Payment Details' },
];
