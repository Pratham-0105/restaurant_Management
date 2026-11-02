export type SubscriptionPlan = "FREE" | "PRO" | "ENTERPRISE";
export type SubscriptionStatus = "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELLED";

export interface AdminUserItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleName: string;
  roleId: string;
  restaurantId: string;
  restaurantName: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminRestaurantItem {
  id: string;
  name: string;
  currency: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string | null;
  branchCount: number;
  userCount: number;
  orderCount: number;
  createdAt: string;
}

export interface AdminStats {
  totalRestaurants: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalOrders: number;
}

