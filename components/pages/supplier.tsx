
"use client"
import { Toaster, toast } from "react-hot-toast"
import type React from "react"
import { useState, useCallback, useMemo, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Phone,
  Mail,
  User,
  Home,
  Layers,
  Package,
  ChevronLeft,
  ChevronRight,
  SearchIcon,
  Send,
  Download,
  FileText,
  Filter,
  ShoppingCart,
  Archive,
} from "lucide-react"

// Firebase imports
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, onSnapshot } from "firebase/firestore"

// --- IMPORTS FROM DATABASE SERVICE ---
import {
  type Supplier,
  type ItemWithVariants,
  type Variant,
  type PurchaseRecord,
  type CurrentPurchase,
  type PurchaseHistory,
  subscribeToSuppliers,
  subscribeToPurchaseRecords,
  subscribeToCurrentPurchases,
  subscribeToPurchaseHistory,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  updateSupplierItemVariants,
  addCurrentPurchase,
  markPurchaseAsReceived,
  markPurchaseAsOrdered,
  deleteCurrentPurchase,
  generateClientId,
} from "@/lib/supplierService"

// ----------------------- Theme helpers -----------------------
const COLORS = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
  addItem: "bg-green-600 hover:bg-green-700 text-white",
  editBtn: "bg-blue-100 hover:bg-blue-200 text-blue-700",
  deleteBtn: "bg-red-100 hover:bg-red-200 text-red-700",
  variantManage: "bg-purple-100 hover:bg-purple-200 text-purple-700",
}

// ========== INTERFACES ==========
interface IssuedItem {
  id: string
  supplierId: string
  itemName: string
  variant: string
  quantity: number
  crewName: string
  issuedDate: string
  createdAt?: any
}

interface InventoryRecord {
  id: string
  supplierId: string
  itemName: string
  variant: string
  totalStock: number
  totalValue: number
  datePurchased: string
  purchaseId: string
}

// --------------------------------------------------------------------------------------------------
// Variant Management Modal
// --------------------------------------------------------------------------------------------------
interface VariantManagementModalProps {
  item: ItemWithVariants
  supplierId: string
  onSave: (supplierId: string, updatedItem: ItemWithVariants) => void
  onClose: () => void
}

const VariantManagementModal: React.FC<VariantManagementModalProps> = ({ item, supplierId, onSave, onClose }) => {
  const [variants, setVariants] = useState<Variant[]>(item.variants)
  const [newVariant, setNewVariant] = useState({ label: "", price: 0 })

  const handleAddVariant = () => {
    if (newVariant.label.trim() && newVariant.price >= 0) {
      setVariants((prev) => [
        ...prev,
        { id: generateClientId(), label: newVariant.label.trim(), price: Number(newVariant.price) },
      ])
      setNewVariant({ label: "", price: 0 })
    }
  }

  const handleUpdateVariant = (id: string, key: "label" | "price", value: any) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [key]: key === "price" ? Number(value) : String(value) } : v)),
    )
  }

  const handleDeleteVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id))
  }

  const handleSave = () => {
    const finalVariants = variants.filter((v) => v.label.trim() !== "" && v.price >= 0)
    if (finalVariants.length === 0) {
      alert("An item must have at least one variant.")
      return
    }
    const updatedItem = { ...item, variants: finalVariants }
    onSave(supplierId, updatedItem)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
      <Card className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all p-6 space-y-6">
        <div className="flex justify-between items-start border-b pb-3">
          <h2 className="text-2xl font-extrabold text-purple-700">Manage Variants for: {item.name}</h2>
          <Button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full">
            <X size={20} />
          </Button>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border p-3 rounded-lg bg-gray-50">
          <h3 className="font-semibold text-gray-700 sticky top-0 bg-gray-50 pb-2">
            Existing Variants ({variants.length})
          </h3>
          {variants.length === 0 && <p className="text-sm text-gray-500">No variants defined. Add one below.</p>}
          {variants.map((v) => (
            <div key={v.id} className="flex gap-3 items-center p-2 bg-white border rounded-lg shadow-sm">
              <input
                className="p-2 border border-gray-300 rounded-lg grow text-sm"
                placeholder="Variant Label (e.g., Low Cut, 2XL, With Reflector)"
                value={v.label}
                onChange={(e) => handleUpdateVariant(v.id, "label", e.target.value)}
              />
              <input
                type="number"
                className="p-2 border border-gray-300 rounded-lg w-24 text-right text-sm font-mono"
                placeholder="Price"
                value={v.price}
                onChange={(e) => handleUpdateVariant(v.id, "price", Number(e.target.value))}
                min={0}
              />
              <Button
                onClick={() => handleDeleteVariant(v.id)}
                className={`${COLORS.deleteBtn} p-2 rounded-lg shrink-0`}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-3">
          <h3 className="font-semibold text-gray-700">Add New Variant</h3>
          <div className="flex gap-3 items-center">
            <input
              className="p-2 border border-gray-300 rounded-lg grow"
              placeholder="Variant Label"
              value={newVariant.label}
              onChange={(e) => setNewVariant({ ...newVariant, label: e.target.value })}
            />
            <input
              type="number"
              className="p-2 border border-gray-300 rounded-lg w-24 text-right"
              placeholder="Price"
              value={newVariant.price}
              onChange={(e) => setNewVariant({ ...newVariant, price: Number(e.target.value) })}
              min={0}
            />
            <Button
              onClick={handleAddVariant}
              className={`${COLORS.addItem} p-2 rounded-lg shrink-0`}
              title="Add new variant"
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={handleSave} className={`${COLORS.primary} px-4 py-2`}>
            Save Variants
          </Button>
          <Button onClick={onClose} className={`bg-red-600 hover:bg-red-700 text-white px-4 py-2`}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}

// --------------------------------------------------------------------------------------------------
// Supplier Detail Modal
// --------------------------------------------------------------------------------------------------
interface SupplierDetailModalProps {
  supplier: Supplier | null
  onClose: () => void
}

const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({ supplier, onClose }) => {
  if (!supplier) return null

  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all p-8 space-y-6">
        <div className="flex justify-between items-start border-b pb-3">
          <h2 className="text-3xl font-extrabold text-gray-900">{supplier.name} Details</h2>
          <Button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full">
            <X size={20} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <div className="flex items-center gap-2">
            <User size={18} className="text-gray-600" />
            <p>
              <span className="font-semibold">Contact Person:</span> {supplier.contactPerson || "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={18} className="text-gray-600" />
            <p>
              <span className="font-semibold">Phone:</span> {supplier.phone || "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-gray-600" />
            <p>
              <span className="font-semibold">Email:</span> {supplier.email || "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Home size={18} className="text-gray-600" />
            <p>
              <span className="font-semibold">Address:</span> {supplier.address || "N/A"}
            </p>
          </div>
        </div>

        <hr />

        <div className="space-y-4">
          <h3 className="font-bold text-xl text-gray-800">Complete Product List:</h3>
          {supplier.items.length === 0 && <p className="text-gray-500">No items listed for this supplier.</p>}

          <div className="space-y-5">
            {supplier.items.map((item, i) => (
              <div key={item.id || i} className="border border-gray-200 p-4 rounded-lg bg-gray-50 shadow-inner">
                <strong className="text-lg text-gray-900 block font-extrabold mb-2">{item.name}</strong>
                <div className="text-sm space-y-1">
                  {item.variants.map((v, vi) => (
                    <div
                      key={v.id || vi}
                      className="flex justify-between items-start border-b border-gray-200 pb-2 pt-1 last:border-b-0 last:pb-0"
                    >
                      <span className="flex-1 pr-4 text-gray-600">{v.label}</span>
                      <span className="font-extrabold text-gray-900 shrink-0">₱{Number(v.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button onClick={onClose} className={`${COLORS.secondary} px-4 py-2`}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}

// --------------------------------------------------------------------------------------------------
// Current Purchases Table Component
// --------------------------------------------------------------------------------------------------
interface CurrentPurchasesTableProps {
  purchases: CurrentPurchase[];
  suppliers: Supplier[];
  onMarkAsReceived: (purchase: CurrentPurchase) => void;
  onDelete: (id: string) => void;
}

const CurrentPurchasesTable: React.FC<CurrentPurchasesTableProps> = ({
  purchases,
  suppliers,
  onMarkAsReceived,
  onDelete,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activePurchaseTab, setActivePurchaseTab] = useState<'pending' | 'ordered'>('pending');

  const getSupplierName = (supplierId: string) => {
    return suppliers.find((s) => s.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getSupplierEmail = (supplierId: string) => {
    return suppliers.find((s) => s.id === supplierId)?.email || null;
  };

  const sortedPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [purchases]);

  const pendingPurchases = useMemo(() => {
    return sortedPurchases.filter((p) => p.status === 'pending');
  }, [sortedPurchases]);

  const orderedPurchases = useMemo(() => {
    return sortedPurchases.filter((p) => p.status === 'ordered');
  }, [sortedPurchases]);

  if (purchases.length === 0) {
    return (
      <Card className="p-8 text-center bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
        <div className="flex flex-col items-center justify-center space-y-4">
          <ShoppingCart className="w-16 h-16 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-700">No Current Purchases</h3>
          <p className="text-gray-500 max-w-md">Add items from the purchase form above to get started.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-6 border-b border-gray-200 bg-white rounded-t-xl p-4 shadow-sm">
        <button
          className={`pb-3 px-4 font-semibold transition-all duration-200 flex items-center gap-2 ${
            activePurchaseTab === 'pending'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActivePurchaseTab('pending')}
        >
          <FileText size={18} /> Pending Orders ({pendingPurchases.length})
        </button>
        <button
          className={`pb-3 px-4 font-semibold transition-all duration-200 flex items-center gap-2 ${
            activePurchaseTab === 'ordered'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActivePurchaseTab('ordered')}
        >
          <Send size={18} /> Ordered ({orderedPurchases.length})
        </button>
      </div>

      <Card className="overflow-hidden border border-gray-200 shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-white uppercase">
                  Supplier
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-white uppercase">
                  Item
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-white uppercase">
                  Variant
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-white uppercase">
                  Qty
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-white uppercase">
                  Unit Price
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-white uppercase">
                  Total
                </th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-white uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {(activePurchaseTab === 'pending' ? pendingPurchases : orderedPurchases).map((p, idx) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                    {getSupplierName(p.supplierId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{p.item}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.variant}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">{p.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800 text-right">
                    ₱{Number(p.unitPrice).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-lg font-bold text-green-700 font-mono">
                      ₱{Number(p.total).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={async () => {
                          setLoadingId(p.id);
                          try {
                            await new Promise((resolve) => {
                              onMarkAsReceived(p);
                              setTimeout(resolve, 500);
                            });
                          } finally {
                            setLoadingId(null);
                          }
                        }}
                        disabled={loadingId === p.id}
                        className={`px-3 py-1 ${
                          loadingId === p.id
                            ? 'bg-green-200 text-green-600 cursor-not-allowed'
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                        } text-sm rounded font-semibold transition-colors`}
                        title="Mark this purchase as received"
                      >
                        {loadingId === p.id ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full"></span>
                            Processing...
                          </span>
                        ) : (
                          'Received'
                        )}
                      </Button>
                      <Button
                        onClick={() => onDelete(p.id)}
                        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded transition-colors"
                        title="Delete this purchase"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// --------------------------------------------------------------------------------------------------
// Purchase History Table
// --------------------------------------------------------------------------------------------------
const PurchaseHistoryTable = ({ purchases, suppliers }: { purchases: PurchaseHistory[]; suppliers: Supplier[] }) => {
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>("")

  const getSupplierName = (supplierId: string) => suppliers.find((s) => s.id === supplierId)?.name || "Unknown"

  // Get unique years and months from purchase history
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    purchases.forEach((p) => {
      const year = new Date(p.receivedAt.toMillis()).getFullYear().toString()
      years.add(year)
    })
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [purchases])

  const availableMonths = useMemo(() => {
    if (!selectedYear) return []
    const months = new Set<string>()
    purchases.forEach((p) => {
      const date = new Date(p.receivedAt.toMillis())
      if (date.getFullYear().toString() === selectedYear) {
        months.add((date.getMonth() + 1).toString())
      }
    })
    return Array.from(months).sort((a, b) => Number(a) - Number(b))
  }, [purchases, selectedYear])

  // Filter purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesSupplier = !selectedSupplier || p.supplierId === selectedSupplier
      const date = new Date(p.receivedAt.toMillis())
      const matchesYear = !selectedYear || date.getFullYear().toString() === selectedYear
      const matchesMonth = !selectedMonth || (date.getMonth() + 1).toString() === selectedMonth
      return matchesSupplier && matchesYear && matchesMonth
    })
  }, [purchases, selectedSupplier, selectedYear, selectedMonth])

const handleExportPDF = async () => {
  if (filteredPurchases.length === 0) {
    toast.error("No purchase history to export")
    return
  }

  const jsPDF = (await import("jspdf")).default
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const leftMargin = 20
  const rightMargin = 15
  const tableWidth = pageWidth - leftMargin - rightMargin

  // ===========================
  // FILTERED SUPPLIERS ONLY
  // ===========================
  const uniqueSupplierIds = Array.from(new Set(filteredPurchases.map(p => p.supplierId)))

  const filteredSupplierDetails = suppliers.filter(s => uniqueSupplierIds.includes(s.id))

  // ===========================
  // HEADER (same as before)
  // ===========================
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, 40, "F")

  try {
    doc.addImage("/isc-globe.png.jpg", "PNG", 10, 8, 50, 24)
  } catch (error) {
    console.log("Logo not found, continuing without it")
  }

  doc.setTextColor(0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  const rightX = pageWidth - 10
  doc.text("INTER-WORLD SHIPPING CORPORATION", rightX, 10, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("5F W. Deepz Bldg., MH Del Pilar St., Ermita, Manila", rightX, 16, { align: "right" })
  doc.text("Tel. No.: (02) 7070-3591", rightX, 22, { align: "right" })
  doc.text("www.interworldships.com", rightX, 28, { align: "right" })

  doc.setLineWidth(0.5)
  doc.line(10, 40, pageWidth - 10, 40)

  // Title
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("PURCHASE HISTORY REPORT", pageWidth / 2, 48, { align: "center" })

  // -------------------------
  // 2 COLUMN DETAILS SECTION
  // -------------------------
  const colLeftX = 20
  const colRightX = pageWidth / 2 + 20
  const detailsY = 58

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("NAME: Angelica De Jesus", colLeftX, detailsY)
  doc.text("DEPARTMENT: Recruitment", colLeftX, detailsY + 6)

  doc.text("DATE REQUESTED:", colRightX, detailsY)
  doc.text("DATE NEEDED:", colRightX, detailsY + 6)

  let currentY = 78

  // ===========================
  // SUPPLIER DETAILS TABLE (FILTERED ONLY)
  // ===========================
  const supplierTableBody = filteredSupplierDetails.map((s) => [
    s.name || "N/A",
    s.address || "N/A",
    s.contactPerson || "N/A",
    s.phone || "N/A",
    s.email || "N/A",
  ])

  autoTable(doc, {
    startY: currentY,
    head: [["SUPPLIER DETAILS"]],
    body: [],
    theme: "grid",
    tableWidth: tableWidth,
    styles: {
      fontSize: 9,
      cellPadding: 4,
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      fontSize: 10,
    },
    margin: { left: leftMargin, right: rightMargin },
  })

  currentY = (doc as any).lastAutoTable.finalY + 4

  autoTable(doc, {
    startY: currentY,
    head: [["Supplier Name", "Address", "Contact Person", "Contact No.", "Email"]],
    body: supplierTableBody,
    theme: "grid",
    tableWidth: tableWidth,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      fontSize: 9,
    },
    margin: { left: leftMargin, right: rightMargin },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.20 },
      1: { cellWidth: tableWidth * 0.25 },
      2: { cellWidth: tableWidth * 0.20 },
      3: { cellWidth: tableWidth * 0.15 },
      4: { cellWidth: tableWidth * 0.20 },
    },
  })

  currentY = (doc as any).lastAutoTable.finalY + 8

  // ===========================
  // PURCHASE TABLE
  // ===========================
    const tableData = filteredPurchases.map((p) => [
      p.variant,
      p.quantity.toString(),
      p.item,
      `P${Number(p.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `P${Number(p.total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ])

  const totalQuantity = filteredPurchases.reduce((sum, p) => sum + p.quantity, 0)
  const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.total, 0)

  autoTable(doc, {
    startY: currentY,
    head: [["DESCRIPTION", "QUANTITY", "ITEM", "AMOUNT", "TOTAL"]],
    body: tableData,
    foot: [
      ["", totalQuantity.toString(), "", "TOTAL", `P${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
    ],
    theme: "grid",
    tableWidth: tableWidth,
    styles: {
      fontSize: 9,
      cellPadding: 4,
      halign: "center",
      valign: "middle",
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    margin: { left: leftMargin, right: rightMargin },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.28 },
      1: { cellWidth: tableWidth * 0.15 },
      2: { cellWidth: tableWidth * 0.27 },
      3: { cellWidth: tableWidth * 0.15 },
      4: { cellWidth: tableWidth * 0.15 }, // INCREASED
    },
  })

    // Footer - Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")

    const col1X = pageWidth / 2 - 60
    const col2X = pageWidth / 2
    const col3X = pageWidth / 2 + 60

    doc.text("PREPARED BY:", col1X, finalY, { align: "center" })
    doc.text("NOTED BY:", col2X, finalY, { align: "center" })
    doc.text("APPROVED BY:", col3X, finalY, { align: "center" })

    doc.line(col1X - 25, finalY + 15, col1X + 25, finalY + 15)
    doc.line(col2X - 25, finalY + 15, col2X + 25, finalY + 15)
    doc.line(col3X - 25, finalY + 15, col3X + 25, finalY + 15)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("ANGELICA DE JESUS", col1X, finalY + 20, { align: "center" })
    doc.text("MELBA B. LORENZO", col2X, finalY + 20, { align: "center" })
    doc.text("JAMES NIKKO R. HOSANA", col3X, finalY + 20, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text("Recruitment Coordinator", col1X, finalY + 25, { align: "center" })
    doc.text("Crewing Manager", col2X, finalY + 25, { align: "center" })
    doc.text("President/CEO", col3X, finalY + 25, { align: "center" })

    // Footer text
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text("ISC-FAT-003 Rev.00/ 05 January 2026.", 14, pageHeight - 10, { align: "left" })

    // Save PDF
    const fileName = `PurchaseRequest_${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)

    toast.success("Purchase request exported to PDF")
  }

  if (purchases.length === 0) {
    return (
      <Card className="p-8 text-center bg-gray-50">
        <p className="text-gray-500">No purchase history yet.</p>
      </Card>
    )
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Archive className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Purchase History</h2>
            <p className="text-gray-500 text-sm">All received purchases</p>
          </div>
        </div>
        <Button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 rounded-lg"
        >
          <Download size={18} /> Export PDF
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Filter size={16} /> Filter Purchase History
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value)
                setSelectedMonth("")
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!selectedYear}
            >
              <option value="">All Months</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {monthNames[Number(month) - 1]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => {
              setSelectedSupplier("")
              setSelectedYear("")
              setSelectedMonth("")
            }}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg text-sm"
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Supplier</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Item</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Variant</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase">Qty</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase">Unit Price</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase">Total</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Date Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No purchase history found for selected filters
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {getSupplierName(p.supplierId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{p.item}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.variant}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">{p.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      ₱{Number(p.unitPrice).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700 font-mono">
                      ₱{Number(p.total).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(p.receivedAt.toMillis()).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4 bg-green-50 border border-green-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-green-600 font-medium">Total Records</p>
            <p className="text-2xl font-bold text-green-900">{filteredPurchases.length}</p>
          </div>
          <div>
            <p className="text-sm text-green-600 font-medium">Total Items</p>
            <p className="text-2xl font-bold text-green-900">
              {filteredPurchases.reduce((sum, p) => sum + p.quantity, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-green-600 font-medium">Total Amount</p>
            <p className="text-2xl font-bold text-green-900">
              ₱{filteredPurchases.reduce((sum, p) => sum + p.total, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// --------------------------------------------------------------------------------------------------
// Inventory Tab Component
// --------------------------------------------------------------------------------------------------
const InventoryTab = ({
  currentPurchases,
  suppliers,
  purchaseHistory,
  issuedItems,
}: {
  currentPurchases: CurrentPurchase[]
  suppliers: Supplier[]
  purchaseHistory: PurchaseHistory[]
  issuedItems: IssuedItem[]
}) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })

  // Combine received purchases into inventory and deduct issued items
  const inventory = useMemo(() => {
    const items: Record<string, InventoryRecord> = {}

    purchaseHistory.forEach((p) => {
      const key = `${p.supplierId}-${p.item}-${p.variant}`
      if (!items[key]) {
        items[key] = {
          id: generateClientId(),
          supplierId: p.supplierId,
          itemName: p.item,
          variant: p.variant,
          totalStock: 0,
          totalValue: 0,
          datePurchased: new Date(p.receivedAt.toMillis()).toISOString().split("T")[0],
          purchaseId: p.id,
        }
      }
      items[key].totalStock += p.quantity
      items[key].totalValue += p.total
    })

    // Deduct issued items from inventory
    ;(issuedItems || []).forEach((issued) => {
      const key = `${issued.supplierId}-${issued.itemName}-${issued.variant}`
      if (items[key]) {
        items[key].totalStock = Math.max(0, items[key].totalStock - issued.quantity)
      }
    })

    return Object.values(items)
  }, [purchaseHistory, issuedItems])

  // Filter inventory
  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.variant.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSupplier = !selectedSupplier || item.supplierId === selectedSupplier
      const itemDate = new Date(item.datePurchased)
      const matchesDate =
        (!dateRange.start || itemDate >= new Date(dateRange.start)) &&
        (!dateRange.end || itemDate <= new Date(dateRange.end))
      return matchesSearch && matchesSupplier && matchesDate
    })
  }, [inventory, searchQuery, selectedSupplier, dateRange])

const handleExportPDF = async () => {
  if (filtered.length === 0) {
    toast.error("No inventory records to export")
    return
  }

  const jsPDF = (await import("jspdf")).default
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const headerHeight = 40

  /* ================= HEADER ================= */
  const addHeader = () => {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, headerHeight, "F")
    doc.addImage("/isc-globe.png.jpg", "PNG", 10, 8, 50, 24)

    doc.setTextColor(0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    const rightX = pageWidth - 10
    doc.text("INTER-WORLD SHIPPING CORPORATION", rightX, 10, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text("5F W. Deepz Bldg., MH Del Pilar St., Ermita, Manila", rightX, 16, { align: "right" })
    doc.text("Tel. No.: (02) 7070-3591", rightX, 22, { align: "right" })
    doc.text("www.interworldships.com", rightX, 28, { align: "right" })

    doc.setLineWidth(0.5)
    doc.line(10, 40, pageWidth - 10, 40)
  }

  /* ================= FOOTER ================= */
  const addFooter = (pageNo: number, totalPages: number) => {
    doc.setTextColor(59, 130, 246)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("INTER-WORLD SHIPPING CORPORATION", pageWidth / 2, pageHeight - 22, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text("123 Shipping Avenue, Port Area, Manila, Philippines 1000", pageWidth / 2, pageHeight - 16, {
      align: "center",
    })
    doc.text(
      "TEL: (02) 8888-9999 | EMAIL: orders@interworldshipping.com | VAT Reg No: 123-456-789-000",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    )

    doc.text(`Page ${pageNo} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" })
  }

  addHeader()

  // table data
  const tableData = filtered.map((item, idx) => [
    idx + 1,
    item.itemName,
    item.variant,
    item.datePurchased,
    item.totalStock.toString(),
    `₱${Number(item.totalValue).toLocaleString()}`,
  ])

  // Create table
  autoTable(doc, {
    startY: 45, // below header
    head: [["#", "Item Name", "Variant", "Date Purchased", "Total Stock", "Total Value"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },

    // This ensures header/footer appear on every page
    didDrawPage: (data) => {
      // Header & Footer
      addHeader()
      const pageNo = doc.getNumberOfPages()
      const totalPages = doc.getNumberOfPages()
      addFooter(pageNo, totalPages)
    },
  })

  // Add final footer after table renders
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(i, totalPages)
  }

  doc.save(`Inventory_${new Date().toISOString().split("T")[0]}.pdf`)
  toast.success("Inventory exported to PDF")
}


  const getSupplierName = (supplierId: string) => suppliers.find((s) => s.id === supplierId)?.name || "Unknown"

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Filter size={20} /> Filter & Search
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Item/Variant</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <SearchIcon size={18} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 rounded-lg"
          >
            <Download size={18} /> Export PDF
          </Button>
          <Button
            onClick={() => {
              setSearchQuery("")
              setSelectedSupplier("")
              setDateRange({ start: "", end: "" })
            }}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg"
          >
            Reset
          </Button>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card className="overflow-hidden border border-gray-200 shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Item Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Variant</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Date Purchased</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase">Total Stock</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase">Total Value</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No inventory records found
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.itemName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.variant}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.datePurchased}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">{item.totalStock}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-green-700">
                      ₱{Number(item.totalValue).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => {
                            const newStock = prompt(`Edit stock for ${item.itemName}:`, item.totalStock.toString())
                            if (newStock && !isNaN(Number(newStock)) && Number(newStock) >= 0) {
                              toast.success(`Stock updated to ${newStock} units`)
                            }
                          }}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs flex items-center gap-1"
                        >
                          <Edit2 size={14} /> Edit
                        </Button>
                        <Button
                          onClick={() => {
                            if (confirm(`Delete ${item.itemName} from inventory?`)) {
                              toast.success(`${item.itemName} deleted`)
                            }
                          }}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </Button>
                        <Button
                          onClick={() => {
                            toast.success(`Viewing details for ${item.itemName}`)
                          }}
                          className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs flex items-center gap-1"
                        >
                          <FileText size={14} /> View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Total Items</p>
          <p className="text-2xl font-bold text-blue-900">{filtered.length}</p>
        </Card>
        <Card className="p-4 bg-green-50 border border-green-200">
          <p className="text-sm text-green-600 font-medium">Total Stock</p>
          <p className="text-2xl font-bold text-green-900">
            {filtered.reduce((sum, item) => sum + item.totalStock, 0)}
          </p>
        </Card>
        <Card className="p-4 bg-purple-50 border border-purple-200">
          <p className="text-sm text-purple-600 font-medium">Total Value</p>
          <p className="text-2xl font-bold text-purple-900">
            ₱{Number(filtered.reduce((sum, item) => sum + item.totalValue, 0)).toLocaleString()}
          </p>
        </Card>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------------------------------
// Issued Items Tab Component
// --------------------------------------------------------------------------------------------------
const IssuedItemsTab = ({
  suppliers,
  purchaseHistory,
  issuedItems,
  setIssuedItems,
}: {
  suppliers: Supplier[]
  purchaseHistory: PurchaseHistory[]
  issuedItems: IssuedItem[]
  setIssuedItems: (items: IssuedItem[]) => void
}) => {
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [formData, setFormData] = useState({
    supplierId: "",
    items: [{ itemName: "", variant: "", quantity: 1 }],
    crewName: "",
    issuedDate: new Date().toISOString().split("T")[0],
  })

  const inventory = useMemo(() => {
    const items: Record<string, any> = {}
    purchaseHistory.forEach((p) => {
      const key = `${p.supplierId}-${p.item}-${p.variant}`
      if (!items[key]) {
        items[key] = { supplierId: p.supplierId, itemName: p.item, variant: p.variant, available: 0 }
      }
      items[key].available += p.quantity
    })
    return Object.values(items)
  }, [purchaseHistory])

  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemName: "", variant: "", quantity: 1 }],
    })
  }

  const handleRemoveItemRow = (idx: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx),
    })
  }

  const handleIssueItems = async () => {
    if (
      !formData.supplierId ||
      !formData.crewName ||
      formData.items.some((i) => !i.itemName || !i.variant || i.quantity < 1)
    ) {
      toast.error("Please fill in all fields")
      return
    }

    try {
      const newIssued = formData.items.map((item) => ({
        id: generateClientId(),
        supplierId: formData.supplierId,
        itemName: item.itemName,
        variant: item.variant,
        quantity: item.quantity,
        crewName: formData.crewName,
        issuedDate: formData.issuedDate,
        createdAt: new Date(),
      }))

      // Save each issued item to Firebase
      for (const item of newIssued) {
        await addDoc(collection(db, "issuedItems"), {
          ...item,
          createdAt: new Date(),
        })
      }

      setIssuedItems([...issuedItems, ...newIssued])
      toast.success(`Issued ${formData.items.length} item(s) to ${formData.crewName}`)

      setFormData({
        supplierId: "",
        items: [{ itemName: "", variant: "", quantity: 1 }],
        crewName: "",
        issuedDate: new Date().toISOString().split("T")[0],
      })
      setShowIssueForm(false)
    } catch (error) {
      console.error("[v0] Error issuing items:", error)
      toast.error("Failed to issue items. Please try again.")
    }
  }

  const handleExportPDF = async () => {
  if (filtered.length === 0) {
    toast.error("No issued items to export")
    return
  }

  const jsPDF = (await import("jspdf")).default
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const headerHeight = 40

  /* ================= HEADER ================= */
  const addHeader = () => {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, headerHeight, "F")
    doc.addImage("/isc-globe.png.jpg", "PNG", 10, 8, 50, 24)

    doc.setTextColor(0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    const rightX = pageWidth - 10
    doc.text("INTER-WORLD SHIPPING CORPORATION", rightX, 10, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text("5F W. Deepz Bldg., MH Del Pilar St., Ermita, Manila", rightX, 16, { align: "right" })
    doc.text("Tel. No.: (02) 7070-3591", rightX, 22, { align: "right" })
    doc.text("www.interworldships.com", rightX, 28, { align: "right" })

    doc.setLineWidth(0.5)
    doc.line(10, 40, pageWidth - 10, 40)
  }

  /* ================= FOOTER ================= */
  const addFooter = (pageNo: number, totalPages: number) => {
    doc.setTextColor(59, 130, 246)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("INTER-WORLD SHIPPING CORPORATION", pageWidth / 2, pageHeight - 22, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text("123 Shipping Avenue, Port Area, Manila, Philippines 1000", pageWidth / 2, pageHeight - 16, {
      align: "center",
    })
    doc.text(
      "TEL: (02) 8888-9999 | EMAIL: orders@interworldshipping.com | VAT Reg No: 123-456-789-000",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    )

    doc.text(`Page ${pageNo} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" })
  }

  addHeader()

  // Title
  doc.setTextColor(0)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Issued Items Report", pageWidth / 2, 52, { align: "center" })

  // Generated Date
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 58, { align: "center" })

  // Table data
  const tableData = filtered.map((item, idx) => [
    idx + 1,
    item.itemName,
    item.variant,
    item.quantity.toString(),
    item.crewName,
    item.issuedDate,
  ])

  autoTable(doc, {
    startY: 65, // below title
    head: [["#", "Item Name", "Variant", "Quantity", "Issued To", "Date Issued"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    // This ensures header/footer appear on every page
    didDrawPage: (data) => {
      // Header & Footer
      addHeader()
      const pageNo = doc.getNumberOfPages()
      const totalPages = doc.getNumberOfPages()
      addFooter(pageNo, totalPages)
    },
  })

  // Add final footer after table renders
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(i, totalPages)
  }

  doc.save(`IssuedItems_${new Date().toISOString().split("T")[0]}.pdf`)
  toast.success("Issued items exported to PDF")
}
    const filtered = useMemo(() => {
      return issuedItems.filter((item) => {
        const matchesSearch =
          (item.itemName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          (item.crewName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        const itemDate = new Date(item.issuedDate)
        const matchesDate =
        (!dateRange.start || itemDate >= new Date(dateRange.start)) &&
        (!dateRange.end || itemDate <= new Date(dateRange.end))
      return matchesSearch && matchesDate
    })
  }, [issuedItems, searchQuery, dateRange])

  const getSupplierName = (supplierId: string) => suppliers.find((s) => s.id === supplierId)?.name || "Unknown"

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex gap-4 flex-wrap">
        <Button
          onClick={() => setShowIssueForm(!showIssueForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-lg"
        >
          <Plus size={18} /> Issue Items
        </Button>
        <Button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 rounded-lg"
        >
          <Download size={18} /> Export PDF
        </Button>
      </div>

      {/* Issue Form */}
      {showIssueForm && (
        <Card className="p-6 bg-white border border-blue-200 shadow-lg space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Plus size={20} /> New Issue
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Crew Name</label>
              <input
                type="text"
                placeholder="Enter crew/person name"
                value={formData.crewName}
                onChange={(e) => setFormData({ ...formData, crewName: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Issued Date</label>
              <input
                type="date"
                value={formData.issuedDate}
                onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3">Items to Issue</h4>
            {formData.items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-3">
                <select
                  value={item.itemName}
                  onChange={(e) => {
                    const updated = [...formData.items]
                    updated[idx].itemName = e.target.value
                    setFormData({ ...formData, items: updated })
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">-- Item --</option>
                  {inventory
                  .filter((inv) => inv.supplierId === formData.supplierId)
                  .map((inv, index) => (
                    <option key={`${inv.itemName}-${index}`} value={inv.itemName}>
                      {inv.itemName}
                    </option>
                  ))}
                </select>

                <select
                  value={item.variant}
                  onChange={(e) => {
                    const updated = [...formData.items]
                    updated[idx].variant = e.target.value
                    setFormData({ ...formData, items: updated })
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">-- Variant --</option>
                  {inventory
                    .filter((inv) => inv.supplierId === formData.supplierId && inv.itemName === item.itemName)
                    .map((inv) => (
                      <option key={inv.variant} value={inv.variant}>
                        {inv.variant} (Avail: {inv.available})
                      </option>
                    ))}
                </select>

                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => {
                    const updated = [...formData.items]
                    updated[idx].quantity = Math.max(1, Number(e.target.value || 1))
                    setFormData({ ...formData, items: updated })
                  }}
                  className="w-20 p-2 border border-gray-300 rounded-lg text-sm"
                />

                <Button
                  onClick={() => handleRemoveItemRow(idx)}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}

            <Button
              onClick={handleAddItemRow}
              className="mt-2 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded-lg"
            >
              <Plus size={14} className="mr-1 inline" /> Add Item
            </Button>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleIssueItems}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Issue Items
            </Button>
            <Button
              onClick={() => setShowIssueForm(false)}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 bg-gray-50 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search item or crew..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <SearchIcon size={16} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </Card>

      {/* Issued Items Table */}
      <Card className="overflow-hidden border border-gray-200 shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Item Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Variant</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase">Qty</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Issued To</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">Date Issued</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No issued items found
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.itemName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.variant}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{item.crewName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.issuedDate}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={async () => {
                            const newQty = prompt(`Edit quantity for ${item.itemName}:`, item.quantity.toString())
                            if (newQty && !isNaN(Number(newQty)) && Number(newQty) > 0) {
                              try {
                                await updateDoc(doc(db, "issuedItems", item.id), {
                                  quantity: Number(newQty),
                                })
                                const updatedItems = issuedItems.map((i) =>
                                  i.id === item.id ? { ...i, quantity: Number(newQty) } : i,
                                )
                                setIssuedItems(updatedItems)
                                toast.success(`Quantity updated to ${newQty}`)
                              } catch (error) {
                                console.error("[v0] Error updating quantity:", error)
                                toast.error("Failed to update quantity")
                              }
                            }
                          }}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs flex items-center gap-1"
                        >
                          <Edit2 size={14} /> Edit
                        </Button>
                        <Button
                          onClick={async () => {
                            if (confirm(`Delete issue record for ${item.itemName}?`)) {
                              try {
                                await deleteDoc(doc(db, "issuedItems", item.id))
                                const updatedItems = issuedItems.filter((i) => i.id !== item.id)
                                setIssuedItems(updatedItems)
                                toast.success(`${item.itemName} removed from issued items`)
                              } catch (error) {
                                console.error("[v0] Error deleting issued item:", error)
                                toast.error("Failed to delete item")
                              }
                            }
                          }}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </Button>
                        <Button
                          onClick={() => {
                            toast.success(
                              `Viewing details: ${item.itemName} (${item.variant}) - ${item.quantity} units issued to ${item.crewName}`,
                            )
                          }}
                          className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs flex items-center gap-1"
                        >
                          <FileText size={14} /> View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-600 font-medium">Total Items Issued</p>
        <p className="text-2xl font-bold text-blue-900">
          {filtered.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
        </p>     
     </Card>
    </div>
  )
}

// --------------------------------------------------------------------------------------------------
// Main SupplierModule Component
// --------------------------------------------------------------------------------------------------
export function SupplierModule({ onSupplierUpdate }: any) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [currentPurchases, setCurrentPurchases] = useState<CurrentPurchase[]>([])
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([])
  const [issuedItems, setIssuedItems] = useState<IssuedItem[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedSupplierForModal, setSelectedSupplierForModal] = useState<Supplier | null>(null)
  const [selectedItemForVariantEdit, setSelectedItemForVariantEdit] = useState<{
    item: ItemWithVariants
    supplierId: string
  } | null>(null)
  const [activeTab, setActiveTab] = useState<"supplier" | "purchasing" | "inventory" | "issued">("supplier")

  // Firebase subscriptions
  useEffect(() => {
    setLoading(true)

    const unsubscribeSuppliers = subscribeToSuppliers((suppliersList) => {
      setSuppliers(suppliersList)
      setLoading(false)
    })

    const unsubscribePurchases = subscribeToPurchaseRecords((purchasesList) => {
      setPurchases(purchasesList)
    })

    const unsubscribeCurrentPurchases = subscribeToCurrentPurchases((currentList) => {
      setCurrentPurchases(currentList)
    })

    const unsubscribePurchaseHistory = subscribeToPurchaseHistory((historyList) => {
      setPurchaseHistory(historyList)
    })

    return () => {
      unsubscribeSuppliers()
      unsubscribePurchases()
      unsubscribeCurrentPurchases()
      unsubscribePurchaseHistory()
    }
  }, [])

  // Load issued items from Firebase
  useEffect(() => {
    const unsubscribeIssuedItems = onSnapshot(collection(db, "issuedItems"), (snapshot) => {
      const items: IssuedItem[] = []
      snapshot.forEach((doc) => {
        items.push({ ...doc.data(), id: doc.id } as IssuedItem)
      })
      setIssuedItems(items)
    })

    return () => {
      unsubscribeIssuedItems()
    }
  }, [])

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplierForModal(supplier)
  }
  const handleCloseModal = () => setSelectedSupplierForModal(null)

  const handleManageVariants = (supplierId: string, item: ItemWithVariants) => {
    setSelectedItemForVariantEdit({ item, supplierId })
  }
  const handleCloseVariantModal = () => setSelectedItemForVariantEdit(null)

  const handleSaveVariants = useCallback(async (supplierId: string, updatedItem: ItemWithVariants) => {
    const result = await updateSupplierItemVariants(supplierId, updatedItem.id, updatedItem)
    if (!result.success) {
      alert("Failed to update variants")
    }
  }, [])

  // form states
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    tin: "",
    address: "",
    items: [] as { id: string | null; name: string; variantLabel: string; cost: number }[],
  })

  const addItemField = () =>
    setForm({ ...form, items: [...form.items, { id: null, name: "", variantLabel: "", cost: 0 }] })

  const updateItem = (index: number, key: "name" | "cost" | "variantLabel", value: any) => {
    const updated = [...form.items]
    // @ts-ignore
    updated[index][key] = value
    setForm({ ...form, items: updated })
  }

  const removeItem = (index: number) => {
    const updated = [...form.items]
    updated.splice(index, 1)
    setForm({ ...form, items: updated })
  }

  const handleSaveSupplier = async () => {
    if (!form.name.trim()) {
      alert("Please enter a supplier name")
      return
    }

    const itemMap = new Map<string, ItemWithVariants>()

    form.items.forEach((formItem) => {
      const itemName = formItem.name.trim()
      if (!itemName) return

      const newVariant: Variant = {
        id: generateClientId(),
        label: formItem.variantLabel.trim() || "",
        price: Number(formItem.cost) || 0,
      }

      if (itemMap.has(itemName)) {
        itemMap.get(itemName)!.variants.push(newVariant)
      } else {
        itemMap.set(itemName, {
          id: formItem.id || generateClientId(),
          name: itemName,
          variants: [newVariant],
        })
      }
    })

    const groupedItems: ItemWithVariants[] = Array.from(itemMap.values())

    const supplierData = {
      name: form.name,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      address: form.address,
      tin: form.tin,
      items: groupedItems,
    }

    let result
    if (editId) {
      result = await updateSupplier(editId, supplierData)
    } else {
      result = await addSupplier(supplierData)
    }

    if (result.success) {
      setForm({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        items: [],
        tin: "",
      })
      setShowForm(false)
      setEditId(null)

      try {
        onSupplierUpdate && onSupplierUpdate(suppliers)
      } catch (e) {
        /* ignore */
      }
    } else {
      alert(`Failed to ${editId ? "update" : "add"} supplier`)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditId(supplier.id)
    const flattenedItems = supplier.items.flatMap((item) =>
      item.variants.map((variant) => ({
        id: item.id,
        name: item.name,
        variantLabel: variant.label,
        cost: variant.price,
      })),
    )

    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      items: flattenedItems,
      tin: supplier.tin || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      const result = await deleteSupplier(id)
      if (!result.success) {
        alert("Failed to delete supplier")
      }
    }
  }

  // purchasing states
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [selectedItemName, setSelectedItemName] = useState<string>("")
  const [selectedVariantLabel, setSelectedVariantLabel] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)

  const selectedSupplierData = suppliers.find((s) => s.id === selectedSupplier)
  const selectedItem = selectedSupplierData?.items.find((i) => i.name === selectedItemName)
  const selectedVariant = selectedItem?.variants.find((v) => v.label === selectedVariantLabel)
  const total = (selectedVariant?.price ?? 0) * Math.max(1, quantity)

  const handlePurchase = async () => {
    if (!selectedSupplierData || !selectedItemName || !selectedVariant || quantity < 1) {
      toast.error("Please select a supplier, item, variant, and quantity.")
      return
    }

    const purchaseData: Omit<CurrentPurchase, "id" | "createdAt" | "status"> = {
      supplierId: selectedSupplierData.id,
      supplierName: selectedSupplierData.name,
      item: selectedItemName,
      variant: selectedVariant.label,
      unitPrice: selectedVariant.price,
      quantity: quantity,
      total: total,
    }

    const result = await addCurrentPurchase(purchaseData)

    if (result.success) {
      setSelectedSupplier("")
      setSelectedItemName("")
      setSelectedVariantLabel("")
      setQuantity(1)

      toast.success("Item added to current purchases!", {
        duration: 4000,
        style: {
          background: "#3b82f6",
          color: "#fff",
          fontWeight: "600",
          fontSize: "14px",
          borderRadius: "8px",
          padding: "12px 16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        },
      })
    } else {
      toast.error("Failed to add item to current purchases.")
    }
  }

  const handleDeleteCurrentPurchase = async (id: string) => {
    if (confirm("Are you sure you want to delete this purchase?")) {
      const result = await deleteCurrentPurchase(id)
      if (!result.success) {
        alert("Failed to delete purchase.")
      } else {
        alert("Purchase deleted successfully!")
      }
    }
  }

  const handleMarkAsReceived = async (purchase: CurrentPurchase) => {
    if (confirm(`Mark "${purchase.item} (${purchase.variant})" as received?`)) {
      try {
        // First update status to 'ordered' if it's still pending
        if (purchase.status === "pending") {
          await markPurchaseAsOrdered(purchase.id)
        }
        
        const result = await markPurchaseAsReceived(purchase)
        if (result.success) {
          toast.success(`✓ "${purchase.item}" marked as received!`, {
            duration: 3000,
            style: {
              background: "#10b981",
              color: "#fff",
              fontWeight: "600",
              fontSize: "14px",
              borderRadius: "8px",
              padding: "12px 16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            },
          })
        } else {
          toast.error("Failed to mark purchase as received. Please try again.")
        }
      } catch (error) {
        console.error("[v0] Error marking purchase as received:", error)
        toast.error("An unexpected error occurred. Please try again.")
      }
    }
  }

  const handleCancelOrder = () => {
    setSelectedSupplier("")
    setSelectedItemName("")
    setSelectedVariantLabel("")
    setQuantity(1)
  }

  // ---------- UI niceties: search + pagination + collapsible ----------
  const [query, setQuery] = useState("")
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const pageSize = 6
  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson || "").toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q),
    )
  }, [query, suppliers])

  const pageCount = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize))
  const currentSuppliers = filteredSuppliers.slice((page - 1) * pageSize, page * pageSize)

  const toggleExpand = (id: string) => setExpandedSupplierId((prev) => (prev === id ? null : id))

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supplier data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 overflow-auto min-h-screen bg-linear-to-r from-gray-50 to-blue-50">
      {/* Modals */}
      <SupplierDetailModal supplier={selectedSupplierForModal} onClose={handleCloseModal} />
      {selectedItemForVariantEdit && (
        <VariantManagementModal
          item={selectedItemForVariantEdit.item}
          supplierId={selectedItemForVariantEdit.supplierId}
          onSave={handleSaveVariants}
          onClose={handleCloseVariantModal}
        />
      )}

      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Supplier & Purchasing Management</h1>
        <p className="text-blue-100">Manage suppliers, purchases, inventory, and issued items</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200 bg-white rounded-t-xl p-4 shadow-sm overflow-x-auto">
        {[
          { id: "supplier", label: "Supplier Management", icon: User },
          { id: "purchasing", label: "Purchasing", icon: ShoppingCart },
          { id: "inventory", label: "Inventory", icon: Package },
          { id: "issued", label: "Issued Items", icon: Archive },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`pb-3 px-4 font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
              activeTab === id ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => {
              setActiveTab(id as any)
              setPage(1)
            }}
          >
            <Icon size={20} /> {label}
          </button>
        ))}
      </div>

      {/* SUPPLIER TAB */}
      {activeTab === "supplier" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900"></h1>
              <p className="mt-1 text-sm text-gray-500"></p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  placeholder="Search supplier, contact or phone..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <SearchIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
              </div>

              <Button
                className={`${COLORS.primary} flex items-center gap-2 px-4 py-2`}
                onClick={() => {
                  setShowForm(true)
                  setEditId(null)
                  setForm({ name: "", contactPerson: "", phone: "", email: "", tin: "", address: "", items: [] })
                }}
              >
                <Plus size={18} /> Add Supplier
              </Button>
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <Card className="p-6 shadow-xl rounded-xl border border-blue-100 bg-white space-y-4">
              <h3 className="text-xl font-bold mb-4 border-b pb-2 text-gray-700">
                {editId ? "Edit Supplier" : "Add New Supplier"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Supplier Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Contact Person"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                />
                <input
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="TIN Number"
                  value={form.tin || ""}
                  onChange={(e) => setForm({ ...form, tin: e.target.value })}
                />
                <input
                  className="p-3 border border-gray-300 rounded-lg col-span-1 md:col-span-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <h4 className="mt-6 font-bold pt-2 border-t text-gray-700">Items and Variants</h4>
              <p className="text-sm text-gray-500 mb-4">
                Enter each unique item/variant combination on a separate row. Items with the <strong>same name</strong>{" "}
                will be grouped under one item entry.
              </p>

              {form.items.map((item, index) => (
                <div key={index} className="flex gap-3 items-center mb-3">
                  <input
                    className="p-3 border border-gray-300 rounded-lg grow"
                    placeholder="Item name (e.g. Safety Shoes)"
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                  />

                  <input
                    className="p-3 border border-gray-300 rounded-lg w-40"
                    placeholder="Variant (e.g., Low Cut, 2XL)"
                    value={item.variantLabel}
                    onChange={(e) => updateItem(index, "variantLabel", e.target.value)}
                  />

                  <input
                    type="number"
                    className="p-3 border border-gray-300 rounded-lg w-32 text-right"
                    placeholder="Price"
                    value={item.cost !== undefined && item.cost !== null ? item.cost : ""}
                    onChange={(e) => updateItem(index, "cost", e.target.value ? Number(e.target.value) : undefined)}
                    min={0}
                  />

                  <Button
                    onClick={() => removeItem(index)}
                    className={`${COLORS.deleteBtn} p-3 rounded-lg`}
                    title="Remove row"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}

              <Button
                onClick={addItemField}
                className={`${COLORS.addItem} flex items-center gap-1 px-2 py-1 mt-2 mx-auto`}
              >
                <Plus size={18} /> Add Item/Variant Row
              </Button>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button onClick={handleSaveSupplier} className={`${COLORS.primary} px-4 py-2`}>
                  {editId ? "Save Changes" : "Add Supplier"}
                </Button>
                <Button
                  onClick={() => {
                    setShowForm(false)
                    setEditId(null)
                    setForm({ name: "", contactPerson: "", phone: "", email: "", tin: "", address: "", items: [] })
                  }}
                  className={`bg-red-600 hover:bg-red-700 text-white px-4 py-2`}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {/* Supplier list */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 pt-2 pb-1">Existing Suppliers</h2>
            <p className="text-sm text-gray-500 mb-4 border-b pb-4">
              Click any supplier row to view the full details. Use the action buttons to edit or manage item variants.
            </p>

            {suppliers.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No suppliers yet. Click "Add Supplier" to create one.</p>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {currentSuppliers.length === 0 && (
                    <p className="text-center text-gray-500 py-6">No suppliers found.</p>
                  )}

                  {currentSuppliers.map((s) => {
                    const isExpanded = expandedSupplierId === s.id
                    return (
                      <Card key={s.id} className="p-0 overflow-hidden border border-gray-200">
                        <div
                          className="flex justify-between items-center p-4 cursor-pointer"
                          onClick={() => toggleExpand(s.id)}
                        >
                          <div>
                            <div className="text-lg font-extrabold text-blue-700">{s.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {s.contactPerson || "—"} · {s.phone || "—"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(s)
                              }}
                              className={`${COLORS.editBtn} p-2 rounded-lg`}
                              title="Edit Supplier"
                            >
                              <Edit2 size={16} />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(s.id)
                              }}
                              className={`${COLORS.deleteBtn} p-2 rounded-lg`}
                              title="Delete Supplier"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 border-t bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                <User size={16} className="text-gray-600" />
                                <span className="text-sm">{s.contactPerson || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone size={16} className="text-gray-600" />
                                <span className="text-sm">{s.phone || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail size={16} className="text-gray-600" />
                                <span className="text-sm">{s.email || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Home size={16} className="text-gray-600" />
                                <span className="text-sm">{s.address || "N/A"}</span>
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                                <Package size={14} className="text-blue-500" /> Items ({s.items.length}):
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {s.items.map((item) => (
                                  <Button
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleManageVariants(s.id, item)
                                    }}
                                    className={`${COLORS.variantManage} text-xs h-auto py-1 px-3 shadow-sm`}
                                    title={`Manage variants for ${item.name}`}
                                  >
                                    <Layers size={14} className="mr-1" /> {item.name} ({item.variants.length})
                                  </Button>
                                ))}
                                {s.items.length === 0 && <span className="text-gray-500 italic">No items listed.</span>}
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <Button onClick={() => handleViewDetails(s)} className={`${COLORS.secondary} px-3 py-2`}>
                                View Details
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min(page * pageSize, filteredSuppliers.length) === 0 ? 0 : (page - 1) * pageSize + 1}{" "}
                    - {Math.min(page * pageSize, filteredSuppliers.length)} of {filteredSuppliers.length}
                  </div>

                  <div className="flex gap-2 items-center">
                    <Button
                      className="p-2 rounded"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft size={18} />
                    </Button>
                    <div className="text-sm font-medium">
                      {page} / {pageCount}
                    </div>
                    <Button
                      className="p-2 rounded"
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      disabled={page === pageCount}
                    >
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* PURCHASING TAB */}
      {activeTab === "purchasing" && (
        <div className="space-y-10">
          <Card className="p-8 bg-white rounded-xl shadow-lg space-y-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-50 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Create New Purchase</h2>
                <p className="text-gray-500 text-sm lg:text-base">
                  Select supplier, item, and variant to add to your purchase list
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-semibold text-gray-700 flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                      1
                    </span>
                    Supplier
                  </label>
                  <select
                    className="p-3 border border-gray-300 rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                    value={selectedSupplier}
                    onChange={(e) => {
                      setSelectedSupplier(e.target.value)
                      setSelectedItemName("")
                      setSelectedVariantLabel("")
                      setQuantity(1)
                    }}
                  >
                    <option value="" disabled>
                      -- Choose Supplier --
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSupplierData && (
                  <div className="space-y-2">
                    <label className="font-semibold text-gray-700 flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        2
                      </span>
                      Item
                    </label>
                    <select
                      className="p-3 border border-gray-300 rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                      value={selectedItemName}
                      onChange={(e) => {
                        setSelectedItemName(e.target.value)
                        setSelectedVariantLabel("")
                        setQuantity(1)
                      }}
                    >
                      <option value="" disabled>
                        -- Choose Item --
                      </option>
                      {selectedSupplierData.items.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedItem && (
                  <div className="space-y-2">
                    <label className="font-semibold text-gray-700 flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        3
                      </span>
                      Variant
                    </label>
                    <select
                      className="p-3 border border-gray-300 rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                      value={selectedVariantLabel}
                      onChange={(e) => setSelectedVariantLabel(e.target.value)}
                    >
                      <option value="" disabled>
                        -- Choose Variant --
                      </option>
                      {selectedItem.variants.map((v) => (
                        <option key={v.id} value={v.label}>
                          {v.label} — ₱{Number(v.price).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedVariant && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="font-semibold text-gray-700 flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        4
                      </span>
                      Quantity
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        className="p-3 border border-gray-300 rounded-lg w-full text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                        value={quantity}
                        min={1}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="px-4 py-3 bg-gray-500 hover:bg-gray-400 transition-all rounded-lg"
                        >
                          -
                        </Button>
                        <Button
                          onClick={() => setQuantity((q) => q + 1)}
                          className="px-4 py-3 bg-gray-500 hover:bg-gray-400 transition-all rounded-lg"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-lg transition-transform transform hover:scale-[1.02] duration-200">
                    <h3 className="font-extrabold text-xl text-blue-700 border-b border-blue-300 pb-3 mb-5 text-center">
                      Order Summary
                    </h3>
                    <div className="space-y-3 text-gray-700">
                      <div className="flex justify-between">
                        <span>Supplier:</span>
                        <span className="font-semibold text-gray-900">{selectedSupplierData?.name || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Item:</span>
                        <span className="font-semibold text-gray-900">{selectedItemName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Variant:</span>
                        <span className="font-semibold text-gray-900">{selectedVariantLabel || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unit Price:</span>
                        <span className="font-mono font-bold text-gray-900">
                          ₱{selectedVariant?.price.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className="font-mono font-bold text-gray-900">{quantity}</span>
                      </div>
                      <div className="flex justify-between bg-blue-50 p-3 rounded-lg font-bold text-blue-800">
                        TOTAL:<span className="text-green-700 text-lg">₱{total.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
                      <Button
                        className="w-full sm:w-1/2 py-3 text-white bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg transition-all rounded-lg"
                        onClick={handleCancelOrder}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="w-full sm:w-1/2 py-3 text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all rounded-lg flex justify-center items-center gap-2"
                        onClick={handlePurchase}
                        disabled={!selectedSupplierData || !selectedItemName || !selectedVariantLabel || quantity < 1}
                      >
                        <Plus size={20} /> Add to Purchases
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Current Purchases</h2>
                <p className="text-gray-500 text-sm">Manage pending and ordered purchases</p>
              </div>
            </div>
            <CurrentPurchasesTable
              purchases={currentPurchases}
              suppliers={suppliers}
              onMarkAsReceived={handleMarkAsReceived}
              onDelete={handleDeleteCurrentPurchase}
            />
          </div>

          <div className="space-y-4">
            <PurchaseHistoryTable purchases={purchaseHistory} suppliers={suppliers} />
          </div>
        </div>
      )}

      {activeTab === "inventory" && (
        <InventoryTab currentPurchases={currentPurchases} suppliers={suppliers} purchaseHistory={purchaseHistory} issuedItems={issuedItems} />
      )}

      {activeTab === "issued" && (
        <IssuedItemsTab
          suppliers={suppliers}
          purchaseHistory={purchaseHistory}
          issuedItems={issuedItems}
          setIssuedItems={setIssuedItems}
        />
      )}
    </div>
  )
}

export default function SupplierManagement() {
  return <SupplierModule onSupplierUpdate={() => {}} />
}
