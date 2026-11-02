"use client";

import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  LayoutGrid,
  Plus,
  Printer,
  QrCode,
  Receipt,
  ReceiptText,
  Search,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Suspense, useMemo, useState } from "react";
import { ChannelBadge, TypeBadge } from "@/components/orders/channel-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusNote, useNoteToast } from "@/components/ui/status-note";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/use-branch";
import { useCategories, useMenuItems, type MenuItem } from "@/hooks/use-menu";
import {
  useBillPreview,
  useCheckoutOrder,
  useCreateOrder,
  useManagedOrders,
  useOrder,
  type ManagedOrder,
  type OrderTab,
} from "@/hooks/use-orders";
import { usePrintOrderUsb, usePrintTestSlip } from "@/hooks/use-print";
import { useSettings } from "@/hooks/use-settings";
import { useFloors } from "@/hooks/use-tables";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { openReceiptPrint } from "@/lib/print";
import { buildUpiUri } from "@/lib/upi";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading billing terminal…</div>}>
      <BillingContent />
    </Suspense>
  );
}

type BillingFilter = "active" | "history" | "all";
type PaymentMethod = "CASH" | "UPI" | "CARD" | "OTHER";

function BillingContent() {
  const { branchId } = useBranch();
  const { note, clear: clearNote, toast } = useNoteToast();
  const { data: settings } = useSettings(branchId);
  const printUsb = usePrintOrderUsb(branchId);
  const printTest = usePrintTestSlip(branchId);

  // Filter tabs: active (unpaid), history (paid/closed), all
  const [tab, setTab] = useState<BillingFilter>("active");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Fetch active & history orders
  const { data: activeOrders, isLoading: loadingActive } = useManagedOrders(branchId, "active");
  const { data: historyOrders, isLoading: loadingHistory } = useManagedOrders(branchId, "history");

  // Select active or recent bill
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // New Quick Bill modal state
  const [newBillOpen, setNewBillOpen] = useState(false);

  // Aggregate orders according to selected tab
  const allOrders = useMemo(() => {
    const active = activeOrders ?? [];
    const history = historyOrders ?? [];
    if (tab === "active") return active.filter((o) => o.status === "OPEN");
    if (tab === "history") return history.filter((o) => o.status === "PAID");
    // "all": show active first, then history
    return [...active, ...history];
  }, [activeOrders, historyOrders, tab]);

  // Filtered by search & type
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      if (typeFilter !== "ALL" && order.type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const numMatch = order.orderNumber.toLowerCase().includes(q);
      const guestMatch = (order.guestName ?? "").toLowerCase().includes(q);
      const customerMatch = (order.customer?.name ?? "").toLowerCase().includes(q);
      const phoneMatch = (order.customer?.phone ?? "").includes(q);
      const tableMatch = order.table
        ? `table ${order.table.number}`.includes(q) || (order.table.name ?? "").toLowerCase().includes(q)
        : false;
      return numMatch || guestMatch || customerMatch || phoneMatch || tableMatch;
    });
  }, [allOrders, search, typeFilter]);

  // Current selected order (default to first active order if none selected)
  const activeSelectedId = selectedOrderId ?? filteredOrders[0]?.id ?? null;
  const { data: selectedOrder, isLoading: loadingDetail } = useOrder(branchId, activeSelectedId);

  // Quick stats
  const unpaidCount = (activeOrders ?? []).filter((o) => o.status === "OPEN").length;
  const unpaidAmount = (activeOrders ?? [])
    .filter((o) => o.status === "OPEN")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const paidCount = (historyOrders ?? []).filter((o) => o.status === "PAID").length;
  const paidAmount = (historyOrders ?? [])
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  // Print handlers
  const handlePrintBrowser = (orderId: string) => {
    if (!branchId) return;
    openReceiptPrint(orderId, branchId);
    toast.success("Print dialog opened for bill");
  };

  const handlePrintThermal = (orderId: string) => {
    if (!branchId) return;
    printUsb.mutate(
      { orderId },
      {
        onSuccess: (r) => {
          if (r.unsupportedChars?.length) {
            toast.warning(`Printed, but some characters (${r.unsupportedChars.join(" ")}) are not supported by the printer.`);
          } else {
            toast.success("Sent directly to thermal printer");
          }
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Could not print to thermal printer");
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-5 pb-10">
      <StatusNote note={note} onClear={clearNote} />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Billing & Invoicing
            </h1>
            <Badge variant="outline" className="h-6 gap-1 border-primary/30 bg-primary/5 text-xs text-primary">
              <ReceiptText className="h-3.5 w-3.5" /> Live Register
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Settle active restaurant bills, collect cash or UPI QR payments, and print customer receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/pos">
            <Button variant="outline" size="sm" type="button">
              <ShoppingCart className="mr-1.5 h-4 w-4" /> Open POS
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            disabled={printTest.isPending}
            onClick={() =>
              printTest.mutate(undefined, {
                onSuccess: () => toast.success("Test slip sent to printer"),
                onError: (e) => toast.error(e instanceof ApiError ? e.message : "Test print failed"),
              })
            }
          >
            <Printer className="mr-1.5 h-4 w-4" />
            {printTest.isPending ? "Testing…" : "Test Printer"}
          </Button>

          <Button className="h-9 gap-1.5" onClick={() => setNewBillOpen(true)}>
            <Plus className="h-4 w-4" /> New Quick Bill
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/80 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Unpaid / Open Bills</span>
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(unpaidAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            <span className="font-semibold text-amber-600 dark:text-amber-400">{unpaidCount} tables/orders</span> currently awaiting payment
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Paid Bills (Today)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(paidAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{paidCount} bills settled</span> and printed today
          </CardContent>
        </Card>

        <Card className="border-border/80 sm:col-span-2 lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Receipt & Invoice Printing
            </CardDescription>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Printer className="h-4 w-4 text-primary" />
              Thermal & Browser Print Ready
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Default: <span className="font-medium text-foreground">{settings?.branch.printerPaperWidthMm ?? 80}mm paper</span> · Dynamic UPI QR enabled
          </CardContent>
        </Card>
      </div>

      {/* Main Billing Workspace */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Left Column: Bills Directory (5 cols) */}
        <div className="flex flex-col gap-3 lg:col-span-5">
          <Card className="border-border">
            <CardHeader className="p-4 pb-3">
              <div className="flex flex-col gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order #, table, customer…"
                    className="pl-9 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Tabs value={tab} onValueChange={(v) => setTab(v as BillingFilter)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="active" className="text-xs">
                        Unpaid ({unpaidCount})
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-xs">
                        Paid Today ({paidCount})
                      </TabsTrigger>
                      <TabsTrigger value="all" className="text-xs">
                        All
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Order Type Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {["ALL", "DINE_IN", "TAKEAWAY", "DELIVERY"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={cn(
                        "rounded-full px-2.5 py-1 font-medium transition-colors whitespace-nowrap",
                        typeFilter === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80",
                      )}
                    >
                      {t === "ALL" ? "All Types" : t === "DINE_IN" ? "Dine-in" : t === "TAKEAWAY" ? "Takeaway" : "Delivery"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="max-h-[620px] overflow-y-auto p-2 pt-0">
              {loadingActive || loadingHistory ? (
                <div className="flex flex-col gap-2 p-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <FileText className="mb-2 h-8 w-8 stroke-1 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No bills found</p>
                  <p className="text-xs">
                    {tab === "active" ? "There are no unpaid orders right now." : "No orders match your filter."}
                  </p>
                  {tab === "active" && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setNewBillOpen(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Create a bill
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredOrders.map((order) => {
                    const isSelected = order.id === activeSelectedId;
                    const isPaid = order.status === "PAID";
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={cn(
                          "group relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3.5 transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                            : "border-border/80 bg-card hover:border-border hover:bg-accent/30",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-foreground">
                              #{order.orderNumber}
                            </span>
                            <TypeBadge type={order.type} />
                            {order.table && (
                              <Badge variant="outline" className="text-[11px] font-normal">
                                Table {order.table.name ?? order.table.number}
                              </Badge>
                            )}
                          </div>
                          <span className="text-base font-bold tabular-nums text-foreground">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate">
                            {order.guestName ?? order.customer?.name ?? "Walk-in guest"}
                            {order.customer?.phone ? ` · ${order.customer.phone}` : ""}
                          </span>
                          <span className="shrink-0 text-[11px]">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex h-2 w-2 rounded-full",
                                isPaid ? "bg-emerald-500" : "bg-amber-500",
                              )}
                            />
                            <span className={cn("font-medium", isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                              {isPaid ? "PAID" : "UNPAID BILL"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                              title="Print bill now"
                              onClick={() => handlePrintBrowser(order.id)}
                            >
                              <Printer className="mr-1 h-3.5 w-3.5" /> Print
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Bill Terminal & Settlement (7 cols) */}
        <div className="lg:col-span-7">
          {loadingDetail ? (
            <Card className="p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-40 w-full mb-4" />
              <Skeleton className="h-32 w-full" />
            </Card>
          ) : !selectedOrder ? (
            <Card className="flex h-96 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <ReceiptText className="mb-3 h-12 w-12 stroke-1 text-muted-foreground/40" />
              <p className="text-base font-semibold text-foreground">Select a bill to view or print</p>
              <p className="text-xs max-w-sm mt-1">
                Choose any order from the left column to view invoice items, collect cash/UPI payment, or print the receipt.
              </p>
            </Card>
          ) : (
            <BillTerminal
              order={selectedOrder}
              branchId={branchId}
              settings={settings}
              onPrintBrowser={() => handlePrintBrowser(selectedOrder.id)}
              onPrintThermal={() => handlePrintThermal(selectedOrder.id)}
              onRefresh={() => setSelectedOrderId(selectedOrder.id)}
            />
          )}
        </div>
      </div>

      {/* New Quick Bill Dialog */}
      <QuickBillDialog
        open={newBillOpen}
        onOpenChange={setNewBillOpen}
        branchId={branchId}
        onCreated={(newOrder) => {
          setSelectedOrderId(newOrder.id);
          toast.success(`Bill #${newOrder.orderNumber} created!`);
          handlePrintBrowser(newOrder.id);
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Interactive Bill Terminal Component
// -----------------------------------------------------------------------------
interface BillTerminalProps {
  order: NonNullable<ReturnType<typeof useOrder>["data"]>;
  branchId: string | null;
  settings: ReturnType<typeof useSettings>["data"];
  onPrintBrowser: () => void;
  onPrintThermal: () => void;
  onRefresh: () => void;
}

function BillTerminal({
  order,
  branchId,
  settings,
  onPrintBrowser,
  onPrintThermal,
  onRefresh,
}: BillTerminalProps) {
  const isPaid = order.status === "PAID";
  const { toast } = useNoteToast();
  const checkout = useCheckoutOrder(branchId);

  // Settlement inputs
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [tenderedText, setTenderedText] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [tipAmount, setTipAmount] = useState<number>(0);

  // Server-priced preview
  const billPreviewQuery = useBillPreview(
    branchId,
    order.id,
    {
      discountPercent,
      tipAmount,
    },
    !isPaid,
  );

  const billPreview = billPreviewQuery.data;
  const totalDue = billPreview?.totalDue ?? Number(order.totalAmount);
  const subtotal = billPreview?.subtotal ?? Number(order.subtotal);
  const taxAmount = billPreview?.taxAmount ?? Number(order.taxAmount);
  const discountAmount = billPreview?.discountAmount ?? Number(order.discountAmount);

  // Tendered cash calculation
  const tendered = Number(tenderedText) || 0;
  const changeDue = tendered > totalDue ? Math.round((tendered - totalDue) * 100) / 100 : 0;

  // Dynamic UPI URI
  const upiVpa = settings?.restaurant.upiVpa;
  const upiName = settings?.restaurant.upiPayeeName || settings?.restaurant.name;
  const upiUri = useMemo(() => {
    if (!upiVpa || totalDue <= 0) return null;
    return buildUpiUri({
      vpa: upiVpa,
      name: upiName,
      amount: totalDue,
      note: `Bill ${order.orderNumber}`,
    });
  }, [upiVpa, upiName, totalDue, order.orderNumber]);

  // Handle Complete Settlement & Print
  const handleSettleAndPrint = () => {
    if (!branchId) return;
    checkout.mutate(
      {
        orderId: order.id,
        dto: {
          discountPercent,
          tipAmount,
          payments: [
            {
              method: paymentMethod,
              amount: totalDue,
              tendered: paymentMethod === "CASH" && tendered > 0 ? tendered : undefined,
            },
          ],
        },
      },
      {
        onSuccess: (res) => {
          toast.success(`Bill #${order.orderNumber} settled successfully!`);
          onRefresh();
          // Trigger print immediately upon settlement
          onPrintBrowser();
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Payment checkout failed");
        },
      },
    );
  };

  return (
    <Card className="border-border shadow-sm">
      {/* Bill Header */}
      <CardHeader className="border-b border-border/80 p-5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-foreground">
                Bill #{order.orderNumber}
              </span>
              <ChannelBadge channel={order.channel} />
              <TypeBadge type={order.type} />
              {order.table && (
                <Badge variant="outline" className="font-semibold">
                  Table {order.table.name ?? order.table.number}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Created {new Date(order.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              {order.guestName ? ` · Guest: ${order.guestName}` : order.customer?.name ? ` · Customer: ${order.customer.name}` : ""}
            </p>
          </div>

          {/* Quick Print Toolbar */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onPrintBrowser}>
              <Printer className="h-3.5 w-3.5" /> Print Bill (Browser / PDF)
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onPrintThermal}>
              <Receipt className="h-3.5 w-3.5" /> Thermal (USB)
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 p-5">
        {/* Itemized Table */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bill Items ({order.items.length})
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="py-2.5 pl-3 pr-2">Item</th>
                  <th className="px-2 py-2.5 text-center">Qty</th>
                  <th className="px-2 py-2.5 text-right">Price</th>
                  <th className="py-2.5 pl-2 pr-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/20">
                    <td className="py-2 pl-3 pr-2">
                      <div className="font-medium text-foreground">{item.nameSnapshot}</div>
                      {item.modifiers.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {item.modifiers.map((m) => m.nameSnapshot).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums text-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(item.unitPriceSnapshot)}
                    </td>
                    <td className="py-2 pl-2 pr-3 text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Breakdown & Discounts */}
        <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-foreground">{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount adjustment if open */}
            {!isPaid && (
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="text-muted-foreground">Discount (%)</span>
                <div className="flex items-center gap-1.5">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(pct)}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        discountPercent === pct
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80",
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount Applied</span>
                <span className="tabular-nums font-medium">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-muted-foreground">
              <span>GST / Taxes</span>
              <span className="tabular-nums font-medium text-foreground">{formatCurrency(taxAmount)}</span>
            </div>

            <div className="my-1 border-t border-border" />

            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-foreground">Grand Total Due</span>
              <span className="text-2xl font-extrabold tabular-nums text-primary">
                {formatCurrency(totalDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Settlement Actions */}
        {isPaid ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Bill Paid & Settled</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paid via {order.payments?.[0]?.method ?? "Cash"} on{" "}
                {new Date(order.billedAt ?? order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Button className="gap-2" onClick={onPrintBrowser}>
                <Printer className="h-4 w-4" /> Print Customer Receipt
              </Button>
              <Button variant="outline" className="gap-2" onClick={onPrintThermal}>
                <Receipt className="h-4 w-4" /> Thermal Print (USB)
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Collection
              </Label>
              <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/30">
                Awaiting Settlement
              </Badge>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "CASH", label: "Cash", icon: Banknote },
                { id: "UPI", label: "UPI QR", icon: QrCode },
                { id: "CARD", label: "Card", icon: CreditCard },
                { id: "OTHER", label: "Other", icon: Receipt },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id as PaymentMethod)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                    paymentMethod === id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Cash Tendered Input */}
            {paymentMethod === "CASH" && (
              <div className="flex flex-col gap-3 rounded-lg bg-secondary/30 p-3.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tendered" className="text-xs">
                    Cash Tendered
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Bill: {formatCurrency(totalDue)}
                  </span>
                </div>
                <Input
                  id="tendered"
                  type="number"
                  placeholder={String(totalDue)}
                  value={tenderedText}
                  onChange={(e) => setTenderedText(e.target.value)}
                  className="h-10 text-base font-semibold"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[totalDue, 100, 200, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedText(String(amt))}
                      className="rounded border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {changeDue > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Change to Return:</span>
                    <span className="text-base tabular-nums">{formatCurrency(changeDue)}</span>
                  </div>
                )}
              </div>
            )}

            {/* UPI QR Display */}
            {paymentMethod === "UPI" && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-secondary/20 p-4 text-center">
                {upiUri ? (
                  <>
                    <div className="rounded-lg bg-white p-2.5 shadow-sm">
                      <QRCodeSVG value={upiUri} size={160} level="M" />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Scan with any UPI App (GPay, PhonePe, Paytm)</p>
                      <p className="text-muted-foreground">Payee: {upiName} ({upiVpa})</p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    UPI VPA not configured in Settings. You can still record UPI payment.
                  </p>
                )}
              </div>
            )}

            {/* Settle & Print Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                size="lg"
                className="h-12 text-base font-semibold gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={checkout.isPending}
                onClick={handleSettleAndPrint}
              >
                <Printer className="h-5 w-5" />
                {checkout.isPending ? "Settling & Printing…" : `Collect ${formatCurrency(totalDue)} & Print Bill`}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={onPrintBrowser}
              >
                <FileText className="h-4 w-4" /> Print Provisional Estimate (Table Slip)
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Quick Bill Modal: Instantly create a new bill
// -----------------------------------------------------------------------------
interface QuickBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string | null;
  onCreated: (order: { id: string; orderNumber: string }) => void;
}

function QuickBillDialog({ open, onOpenChange, branchId, onCreated }: QuickBillDialogProps) {
  const { toast } = useNoteToast();
  const createOrder = useCreateOrder(branchId);
  const floorsQuery = useFloors(branchId);
  const tables = floorsQuery.data?.flatMap((f) => f.tables) ?? [];
  const { data: menuItems, isLoading: loadingMenu } = useMenuItems(branchId);
  const { data: categories } = useCategories(branchId);

  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("TAKEAWAY");
  const [tableId, setTableId] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [selectedCat, setSelectedCat] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  // Items added to quick bill
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);

  const addItem = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + Number(c.item.price) * c.quantity, 0);

  const filteredItems = useMemo(() => {
    return (menuItems ?? []).filter((item) => {
      if (!item.isActive) return false;
      if (selectedCat !== "ALL" && item.categoryId !== selectedCat) return false;
      if (search.trim()) {
        return item.name.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });
  }, [menuItems, selectedCat, search]);

  const handleCreateBill = () => {
    if (cart.length === 0) {
      toast.error("Please add at least one item to the bill");
      return;
    }
    if (orderType === "DINE_IN" && !tableId) {
      toast.error("Please select a table for Dine-in");
      return;
    }

    createOrder.mutate(
      {
        type: orderType,
        tableId: orderType === "DINE_IN" ? tableId : undefined,
        guestName: guestName.trim() || undefined,
        items: cart.map((c) => ({
          menuItemId: c.item.id,
          quantity: c.quantity,
          modifierIds: [],
        })),
      },
      {
        onSuccess: (order) => {
          onOpenChange(false);
          setCart([]);
          setGuestName("");
          setTableId("");
          onCreated(order);
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Failed to create bill");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Create Quick Bill
          </DialogTitle>
          <DialogDescription>
            Select items and order type to generate an instant bill and print receipt.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Menu Selector (7 cols) */}
          <div className="flex flex-col gap-3 md:col-span-7">
            {/* Order Settings */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Order Type</Label>
                <div className="mt-1 grid grid-cols-2 gap-1 rounded-lg border p-1">
                  <button
                    type="button"
                    onClick={() => setOrderType("TAKEAWAY")}
                    className={cn(
                      "rounded py-1 text-xs font-medium",
                      orderType === "TAKEAWAY" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    Takeaway
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("DINE_IN")}
                    className={cn(
                      "rounded py-1 text-xs font-medium",
                      orderType === "DINE_IN" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    Dine-In
                  </button>
                </div>
              </div>

              {orderType === "DINE_IN" ? (
                <div>
                  <Label className="text-xs">Table</Label>
                  <select
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-xs font-medium"
                  >
                    <option value="">Select Table…</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.name ?? t.number} (Seats {t.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Customer Name (Optional)</Label>
                  <Input
                    placeholder="Walk-in"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Menu Item Search & Category */}
            <div className="flex gap-2">
              <Input
                placeholder="Search dish or beverage…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCat("ALL")}
                className={cn(
                  "rounded-full px-2.5 py-0.5 whitespace-nowrap",
                  selectedCat === "ALL" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}
              >
                All
              </button>
              {(categories ?? []).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat.id)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 whitespace-nowrap",
                    selectedCat === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Items Grid */}
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border p-2">
              {loadingMenu ? (
                <p className="p-4 text-center text-xs text-muted-foreground">Loading menu…</p>
              ) : filteredItems.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">No menu items found</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item)}
                      className="flex flex-col items-start rounded-lg border border-border p-2 text-left hover:border-primary hover:bg-secondary/40 transition-colors"
                    >
                      <span className="font-medium text-xs text-foreground line-clamp-1">{item.name}</span>
                      <span className="text-xs text-primary font-semibold tabular-nums mt-0.5">
                        {formatCurrency(item.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart & Bill Summary (5 cols) */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-secondary/20 p-3.5 md:col-span-5">
            <div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-foreground">Current Bill</span>
                <span className="text-xs text-muted-foreground">{cart.length} items</span>
              </div>

              <div className="mt-2 flex max-h-56 flex-col divide-y divide-border/60 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    Click items from menu to add to bill
                  </p>
                ) : (
                  cart.map(({ item, quantity }) => (
                    <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex-1 pr-2">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-muted-foreground">{formatCurrency(item.price)} each</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-secondary font-bold hover:bg-secondary/80"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold tabular-nums">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-secondary font-bold hover:bg-secondary/80"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Total:</span>
                <span className="text-xl font-bold tabular-nums text-primary">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              <Button
                className="w-full gap-2 font-semibold"
                disabled={cart.length === 0 || createOrder.isPending}
                onClick={handleCreateBill}
              >
                <Printer className="h-4 w-4" />
                {createOrder.isPending ? "Creating…" : "Generate & Print Bill"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
