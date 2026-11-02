"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Building2,
  CreditCard,
  ShoppingBag,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  Search,
  Lock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AdminRestaurantItem,
  AdminStats,
  AdminUserItem,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@swamiverse/types";

export default function AdminPage() {
  // --- Auth State ---
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Login inputs
  const [loginId, setLoginId] = useState("swami");
  const [loginPassword, setLoginPassword] = useState("swami12");
  const [loginLoading, setLoginLoading] = useState(false);

  // --- Dashboard Data State ---
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [restaurants, setRestaurants] = useState<AdminRestaurantItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "subscriptions" | "restaurants">("users");

  // --- Filtering & Search ---
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [restaurantFilter, setRestaurantFilter] = useState("ALL");

  // --- Modals State ---
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    roleName: "CASHIER",
    restaurantId: "",
    phone: "",
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Delete User Modal
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Create Restaurant Modal
  const [createRestaurantOpen, setCreateRestaurantOpen] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    plan: "PRO" as SubscriptionPlan,
    status: "ACTIVE" as SubscriptionStatus,
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });
  const [creatingRestaurant, setCreatingRestaurant] = useState(false);

  // Subscription Edit state per restaurant
  const [updatingSubId, setUpdatingSubId] = useState<string | null>(null);

  // Helper fetch with auth
  const authFetch = async (url: string, init?: RequestInit) => {
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem("swamiverse_admin_token") : null);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...init,
      credentials: "include",
      headers,
    });
    return res;
  };

  // Verify auth on mount
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("swamiverse_admin_token") : null;
    if (token) {
      setAdminToken(token);
    }

    const checkSession = async () => {
      try {
        const res = await fetch("/api/v1/admin/me", {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSession();
  }, []);

  // Fetch Dashboard Data
  const loadDashboardData = async () => {
    setDataLoading(true);
    try {
      const [resStats, resUsers, resRestaurants] = await Promise.all([
        authFetch("/api/v1/admin/stats"),
        authFetch("/api/v1/admin/users"),
        authFetch("/api/v1/admin/restaurants"),
      ]);

      if (resStats.ok) {
        const data = await resStats.json();
        setStats(data);
      }
      if (resUsers.ok) {
        const data = await resUsers.json();
        setUsers(data);
      }
      if (resRestaurants.ok) {
        const data = await resRestaurants.json();
        setRestaurants(data);
        if (data.length > 0 && !newUser.restaurantId) {
          setNewUser((prev) => ({ ...prev, restaurantId: data[0].id }));
        }
      }
    } catch (err) {
      toast.error("Failed to load dashboard data. Retrying...");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const res = await fetch("/api/v1/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: loginId.trim(), password: loginPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.message || "Invalid Admin ID or Password");
        setLoginLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("swamiverse_admin_token", data.token);
        setAdminToken(data.token);
      }

      setIsAuthenticated(true);
      toast.success("Welcome, Super Admin Swami!");
    } catch {
      toast.error("Can't connect to server. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await authFetch("/api/v1/admin/logout", { method: "POST" });
    } catch {
      // ignore
    }
    localStorage.removeItem("swamiverse_admin_token");
    setAdminToken(null);
    setIsAuthenticated(false);
    toast.info("Logged out from Admin Portal");
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.restaurantId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreatingUser(true);
    try {
      const res = await authFetch("/api/v1/admin/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.message || "Failed to create user");
        return;
      }

      toast.success(`User ${newUser.name} created successfully!`);
      setCreateUserOpen(false);
      setNewUser({
        name: "",
        email: "",
        password: "",
        roleName: "CASHIER",
        restaurantId: restaurants[0]?.id || "",
        phone: "",
      });
      loadDashboardData();
    } catch {
      toast.error("Network error while creating user");
    } finally {
      setCreatingUser(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;

    if (deleteUserTarget.email === "swami" || deleteUserTarget.name === "Swami Admin") {
      toast.error("The root Super Admin account cannot be deleted.");
      setDeleteUserTarget(null);
      return;
    }

    setDeletingUser(true);
    try {
      const res = await authFetch(`/api/v1/admin/users/${deleteUserTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Failed to delete user");
        return;
      }

      toast.success(`User ${deleteUserTarget.name} has been deleted.`);
      setDeleteUserTarget(null);
      loadDashboardData();
    } catch {
      toast.error("Network error while deleting user");
    } finally {
      setDeletingUser(false);
    }
  };

  // Toggle User Active
  const handleToggleUserActive = async (user: AdminUserItem) => {
    try {
      const res = await authFetch(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        toast.success(`User ${user.name} is now ${!user.isActive ? "active" : "inactive"}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
        );
      } else {
        toast.error("Could not update user status");
      }
    } catch {
      toast.error("Error updating user status");
    }
  };

  // Update Subscription Handler
  const handleUpdateSubscription = async (
    restaurantId: string,
    plan: SubscriptionPlan,
    status: SubscriptionStatus,
    expiresAt?: string | null
  ) => {
    setUpdatingSubId(restaurantId);
    try {
      const res = await authFetch(`/api/v1/admin/subscriptions/${restaurantId}`, {
        method: "PATCH",
        body: JSON.stringify({ plan, status, expiresAt }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.message || "Failed to update subscription");
        return;
      }

      toast.success("Subscription updated successfully!");
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === restaurantId
            ? {
                ...r,
                subscriptionPlan: plan,
                subscriptionStatus: status,
                subscriptionExpiresAt: expiresAt ?? r.subscriptionExpiresAt,
              }
            : r
        )
      );
      if (stats) {
        const activeCount = restaurants.filter(
          (r) => (r.id === restaurantId ? status : r.subscriptionStatus) === "ACTIVE"
        ).length;
        setStats({ ...stats, activeSubscriptions: activeCount });
      }
    } catch {
      toast.error("Error updating subscription");
    } finally {
      setUpdatingSubId(null);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
        u.restaurantName.toLowerCase().includes(userSearch.toLowerCase());

      const matchesRole =
        userRoleFilter === "ALL" ||
        u.roleName.toUpperCase() === userRoleFilter.toUpperCase();

      const matchesRestaurant =
        restaurantFilter === "ALL" || u.restaurantId === restaurantFilter;

      return matchesSearch && matchesRole && matchesRestaurant;
    });
  }, [users, userSearch, userRoleFilter, restaurantFilter]);

  // Loading Screen
  if (checkingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Logo size={48} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span>Loading Swamiverse Admin...</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: SUPER ADMIN LOGIN SCREEN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-[radial-gradient(50%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_85%),transparent)]"
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 shadow-2xl"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <Logo size={52} />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Lock className="h-3.5 w-3.5" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Swamiverse Super Admin
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Master control portal for users and subscriptions
            </p>
          </div>

          {/* Preset credentials callout */}
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Admin Credentials</span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-muted-foreground">
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground/80">Admin ID</span>
                <span className="font-mono font-medium text-foreground">swami</span>
              </div>
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground/80">Password</span>
                <span className="font-mono font-medium text-foreground">swami12</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-id">Admin ID</Label>
              <Input
                id="admin-id"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="swami"
                required
                className="h-11 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-pw">Password</Label>
              <PasswordInput
                id="admin-pw"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="swami12"
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loginLoading}
              className="mt-3 h-12 text-base font-medium shadow-lg"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <span>Sign In as Super Admin</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 border-t border-border/50 pt-4 text-center">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <span>Switch to standard restaurant login</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  // ==========================================
  // VIEW 2: AUTHENTICATED SUPER ADMIN PORTAL
  // ==========================================
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/95 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-foreground text-lg">Swamiverse</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
              Admin Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 border border-border/60 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">swami</span>
            <span className="text-muted-foreground font-mono">(Super Admin)</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={dataLoading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dataLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-9 text-xs">
              Dashboard
            </Button>
          </Link>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="h-9 gap-1 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Top Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Restaurants
              </CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats?.totalRestaurants ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Managed establishments</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats?.totalUsers ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Staff & owners accounts</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Subscriptions
              </CardTitle>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {stats?.activeSubscriptions ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active paid / pro plans</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Orders
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats?.totalOrders ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">System wide processed</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/80 gap-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>User Management ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`pb-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "subscriptions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Subscription Management ({restaurants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("restaurants")}
            className={`pb-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "restaurants"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Restaurants Directory</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: USER MANAGEMENT                                    */}
        {/* ========================================================= */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, restaurant..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                {/* Role Filter */}
                <Select value={userRoleFilter} onValueChange={(val) => setUserRoleFilter(val ?? "ALL")}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="CASHIER">Cashier</SelectItem>
                    <SelectItem value="WAITER">Waiter</SelectItem>
                    <SelectItem value="KITCHEN">Kitchen</SelectItem>
                  </SelectContent>
                </Select>

                {/* Restaurant Filter */}
                <Select value={restaurantFilter} onValueChange={(val) => setRestaurantFilter(val ?? "ALL")}>
                  <SelectTrigger className="w-[160px] h-9 text-xs">
                    <SelectValue placeholder="All Restaurants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Restaurants</SelectItem>
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add User Button */}
              <Button
                onClick={() => setCreateUserOpen(true)}
                className="h-9 gap-1.5 text-xs font-semibold shadow"
              >
                <Plus className="h-4 w-4" />
                <span>Create User</span>
              </Button>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="py-3 px-4 font-medium">User</th>
                      <th className="py-3 px-4 font-medium">Role</th>
                      <th className="py-3 px-4 font-medium">Restaurant</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Created</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSwami = u.email === "swami" || u.name === "Swami Admin";
                        return (
                          <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                <span>{u.name}</span>
                                {isSwami && (
                                  <span className="rounded bg-primary/20 text-primary px-1.5 py-0.2 text-[10px] font-bold">
                                    ROOT ADMIN
                                  </span>
                                )}
                              </div>
                              <div className="text-muted-foreground font-mono text-[11px]">
                                {u.email || "No email"}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  u.roleName.toLowerCase().includes("owner")
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-[10px] uppercase font-semibold"
                              >
                                {u.roleName}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-foreground">
                                {u.restaurantName}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => !isSwami && handleToggleUserActive(u)}
                                disabled={isSwami}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                  u.isActive
                                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                                }`}
                              >
                                {u.isActive ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3" />
                                    Disabled
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isSwami ? (
                                <span className="text-[11px] text-muted-foreground italic">
                                  Protected
                                </span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteUserTarget(u)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Delete user"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SUBSCRIPTION MANAGEMENT                            */}
        {/* ========================================================= */}
        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Restaurant Subscriptions</h3>
                <p className="text-xs text-muted-foreground">
                  Manage plan tiers (FREE, PRO, ENTERPRISE) and expiry dates per restaurant.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="py-3 px-4 font-medium">Restaurant</th>
                      <th className="py-3 px-4 font-medium">Plan Tier</th>
                      <th className="py-3 px-4 font-medium">Subscription Status</th>
                      <th className="py-3 px-4 font-medium">Expires At</th>
                      <th className="py-3 px-4 font-medium text-right">Save Updates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {restaurants.map((r) => {
                      return (
                        <SubscriptionRow
                          key={r.id}
                          restaurant={r}
                          onUpdate={handleUpdateSubscription}
                          isUpdating={updatingSubId === r.id}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: RESTAURANTS DIRECTORY                              */}
        {/* ========================================================= */}
        {activeTab === "restaurants" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Registered Establishments</h3>
                <p className="text-xs text-muted-foreground">
                  Overview of all dining spaces and branches on this platform.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((r) => (
                <Card key={r.id} className="border-border/70 shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {r.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5 font-mono">
                          ID: {r.id.slice(0, 8)}...
                        </CardDescription>
                      </div>
                      <Badge
                        variant={r.subscriptionPlan === "ENTERPRISE" ? "default" : "secondary"}
                        className="text-[10px] uppercase font-bold"
                      >
                        {r.subscriptionPlan}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Branches:</span>
                      <span className="font-medium text-foreground">{r.branchCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Staff Members:</span>
                      <span className="font-medium text-foreground">{r.userCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Total Orders:</span>
                      <span className="font-medium text-foreground">{r.orderCount}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Status:</span>
                      <span
                        className={`font-semibold ${
                          r.subscriptionStatus === "ACTIVE"
                            ? "text-emerald-500"
                            : "text-amber-500"
                        }`}
                      >
                        {r.subscriptionStatus}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: CREATE USER                                        */}
      {/* ========================================================= */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription className="text-xs">
              Add a new staff member or restaurant owner. As administrator, you have full control.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-3.5 mt-2">
            <div className="space-y-1">
              <Label htmlFor="restaurantId" className="text-xs">
                Assign to Restaurant *
              </Label>
              <Select
                value={newUser.restaurantId}
                onValueChange={(val) => setNewUser({ ...newUser, restaurantId: val ?? "" })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="userName" className="text-xs">
                Full Name *
              </Label>
              <Input
                id="userName"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="e.g. John Doe"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="userEmail" className="text-xs">
                Email / Login ID *
              </Label>
              <Input
                id="userEmail"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john@restaurant.com"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="userPassword" className="text-xs">
                Password (defaults to restaurant123 if blank)
              </Label>
              <Input
                id="userPassword"
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="restaurant123"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="userRole" className="text-xs">
                  Role *
                </Label>
                <Select
                  value={newUser.roleName}
                  onValueChange={(val) => setNewUser({ ...newUser, roleName: val ?? "CASHIER" })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="CASHIER">Cashier</SelectItem>
                    <SelectItem value="WAITER">Waiter</SelectItem>
                    <SelectItem value="KITCHEN">Kitchen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="userPhone" className="text-xs">
                  Phone (Optional)
                </Label>
                <Input
                  id="userPhone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateUserOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingUser}
                className="font-semibold"
              >
                {creatingUser ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL: DELETE USER CONFIRMATION                           */}
      {/* ========================================================= */}
      <Dialog
        open={Boolean(deleteUserTarget)}
        onOpenChange={(open) => !open && setDeleteUserTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <span>Confirm User Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to delete user{" "}
              <strong className="text-foreground">{deleteUserTarget?.name}</strong> (
              {deleteUserTarget?.email})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteUserTarget(null)}
              disabled={deletingUser}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteUser}
              disabled={deletingUser}
              className="font-semibold"
            >
              {deletingUser ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==============================================================
// Sub-component for individual Subscription Row in table
// ==============================================================
function SubscriptionRow({
  restaurant,
  onUpdate,
  isUpdating,
}: {
  restaurant: AdminRestaurantItem;
  onUpdate: (
    restaurantId: string,
    plan: SubscriptionPlan,
    status: SubscriptionStatus,
    expiresAt?: string | null
  ) => Promise<void>;
  isUpdating: boolean;
}) {
  const [plan, setPlan] = useState<SubscriptionPlan>(restaurant.subscriptionPlan);
  const [status, setStatus] = useState<SubscriptionStatus>(restaurant.subscriptionStatus);
  const [expiresAt, setExpiresAt] = useState<string>(
    restaurant.subscriptionExpiresAt ? restaurant.subscriptionExpiresAt.slice(0, 10) : ""
  );

  const hasChanges =
    plan !== restaurant.subscriptionPlan ||
    status !== restaurant.subscriptionStatus ||
    expiresAt !== (restaurant.subscriptionExpiresAt ? restaurant.subscriptionExpiresAt.slice(0, 10) : "");

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <div className="font-semibold text-foreground">{restaurant.name}</div>
        <div className="text-[11px] text-muted-foreground font-mono">
          Currency: {restaurant.currency}
        </div>
      </td>

      <td className="py-3 px-4">
        <Select value={plan} onValueChange={(val) => val && setPlan(val as SubscriptionPlan)}>
          <SelectTrigger className="w-[120px] h-8 text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FREE">FREE</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
          </SelectContent>
        </Select>
      </td>

      <td className="py-3 px-4">
        <Select value={status} onValueChange={(val) => val && setStatus(val as SubscriptionStatus)}>
          <SelectTrigger className="w-[120px] h-8 text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="TRIAL">TRIAL</SelectItem>
            <SelectItem value="EXPIRED">EXPIRED</SelectItem>
            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
          </SelectContent>
        </Select>
      </td>

      <td className="py-3 px-4">
        <Input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-[140px] h-8 text-xs font-mono"
        />
      </td>

      <td className="py-3 px-4 text-right">
        <Button
          size="sm"
          disabled={!hasChanges || isUpdating}
          onClick={() =>
            onUpdate(
              restaurant.id,
              plan,
              status,
              expiresAt ? new Date(expiresAt).toISOString() : null
            )
          }
          className="h-8 text-xs font-semibold"
        >
          {isUpdating ? "Saving..." : hasChanges ? "Save" : "Saved"}
        </Button>
      </td>
    </tr>
  );
}
