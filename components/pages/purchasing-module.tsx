"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Check, Upload, Trash2, Edit2, FileText, TrendingUp, AlertCircle, Clock, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import {
  getPurchases,
  addPurchase,
  updatePurchase,
  deletePurchase,
  markPurchaseAsReceived,
  type Purchase
} from "@/lib/purchasingService"
import { getConsumables } from "@/lib/inventoryService"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import CountUp from "react-countup"
/* ========================================================================== */
/* TYPES */
/* ========================================================================== */

interface LowStockItem {
  id: string
  name: string
  quantity: number
  reorderLevel: number
  unitPrice: number
  category: string
}

interface PurchaseItem {
  itemName: string
  quantity: string
  unitPrice: string
  category: string
  serialNumber?: string
  assetClass?: string
  consumableId?: string
}

/* ========================================================================== */
/* COMPONENT */
/* ========================================================================== */

export default function PurchasingModule() {
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Received">("all")
  const [showLowStock, setShowLowStock] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formType, setFormType] = useState<"consumable" | "fixed-asset">("consumable")
  const [isScrolled, setIsScrolled] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const tableRef = useRef<HTMLDivElement | null>(null)
  
  /* Delete Confirmation Modal States */
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  /* ---------------- FILTER STATES ---------------- */
  const [typeFilter, setTypeFilter] = useState<"all" | "consumable" | "fixed-asset">("all")
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [yearFilter, setYearFilter] = useState<string>("all")

  /* ---------------- MULTI-ITEM PURCHASE ---------------- */
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    { itemName: "", quantity: "", unitPrice: "", category: "", serialNumber: "", assetClass: "", consumableId: "" }
  ])

  const [purchaseFormData, setPurchaseFormData] = useState({
    supplier: "",
    notes: "",
    date: new Date().toISOString().split("T")[0]
  })

  /* ========================================================================== */
  /* LOAD DATA */
  /* ========================================================================== */

  useEffect(() => { loadAllData() }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [purchasesData, consumablesData] = await Promise.all([
        getPurchases(),
        getConsumables()
      ])
      setPurchases(purchasesData)

      const lowStock = consumablesData
        .filter(i => i.quantity <= i.reorderLevel && !i.discontinued)
        .map(i => ({
          id: i.id || "",
          name: i.name,
          quantity: i.quantity,
          reorderLevel: i.reorderLevel,
          unitPrice: i.unitPrice,
          category: i.description
        }))

      setLowStockItems(lowStock)
    } finally {
      setLoading(false)
    }
  }

  /* ========================================================================== */
  /* HELPERS */
  /* ========================================================================== */

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return { bg: "#FEF3C7", text: "#92400E" }
      case "Received": return { bg: "#D1FAE5", text: "#065F46" }
      case "Cancelled": return { bg: "#FECACA", text: "#7F1D1D" }
      default: return { bg: "#E5E7EB", text: "#374151" }
    }
  }

  const handleDeleteAll = async () => {
    try {
      await Promise.all(filteredPurchases.map(p => deletePurchase(p.id!)))
      await loadAllData()
      setShowDeleteAllModal(false)
    } catch (error) {
      console.error("Failed to delete all purchases:", error)
    }
  }

  // Get unique years from purchases
  const availableYears = Array.from(new Set(purchases.map(p => new Date(p.date).getFullYear()))).sort((a, b) => b - a)

  const filteredPurchases = purchases
    .filter(p => typeFilter === "all" || p.type === typeFilter)
    .filter(p => {
      if (monthFilter === "all" && yearFilter === "all") return true
      
      const purchaseDate = new Date(p.date)
      const purchaseMonth = purchaseDate.getMonth() + 1 // 1-12
      const purchaseYear = purchaseDate.getFullYear()
      
      const monthMatch = monthFilter === "all" || parseInt(monthFilter) === purchaseMonth
      const yearMatch = yearFilter === "all" || parseInt(yearFilter) === purchaseYear
      
      return monthMatch && yearMatch
    })
    .filter(p => {
      if (statusFilter === "all") return true
      return p.status?.trim().toLowerCase() === statusFilter.toLowerCase()
    })
    
  /* ========================================================================== */
/* PDF EXPORT */
/* ========================================================================== */

const generatePDFAndOpenGmail = () => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const headerHeight = 50
  const footerHeight = 30

  /* ================= HEADER FUNCTION ================= */
  const addHeader = () => {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, headerHeight, "F")
    doc.addImage("/isc-globe.png.jpg", "PNG", 10, 8, 50, 24)

    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    const rightX = pageWidth - 10
    doc.text("INTER-WORLD SHIPPING CORPORATION", rightX, 10, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text("5F W. Deepz Bldg., MH Del Pilar St., Ermita, Manila", rightX, 16, { align: "right" })
    doc.text("Tel. No.: (02) 7070-3591", rightX, 22, { align: "right" })
    doc.text("www.interworldships.com", rightX, 28, { align: "right" })

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(10, 40, pageWidth - 10, 40)
  }

  /* ================= FOOTER FUNCTION ================= */
  const addFooter = (pageNo: number, totalPages: number) => {
    doc.setTextColor(59, 130, 246)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("INTER-WORLD SHIPPING CORPORATION", pageWidth / 2, pageHeight - 22, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text("123 Shipping Avenue, Port Area, Manila, Philippines 1000", pageWidth / 2, pageHeight - 16, { align: "center" })
    doc.text(
      "TEL: (02) 8888-9999 | EMAIL: orders@interworldshipping.com | VAT Reg No: 123-456-789-000",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    )

    doc.text(`Page ${pageNo} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" })
  }

  /* ================= INITIAL HEADER ================= */
  addHeader()

  /* ================= REPORT META ================= */
  const reportDate = new Date().toLocaleString()
  const preparedBy = "Inventory Officer"

  let currentY = headerHeight + 5
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Report Date: ${reportDate}`, 14, currentY)
  currentY += 6
  doc.text(`Prepared By: ${preparedBy}`, 14, currentY)
  currentY += 10

  /* ================= TITLE ================= */
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Purchase Orders Report", 14, currentY)
  currentY += 10

  /* ================= TABLE ================= */
  const columns = ["Item", "Type", "Supplier", "Qty", "Unit Price", "Total Cost", "Date", "Status"]
  const rows = filteredPurchases.map(p => [
    p.item ?? "N/A",
    p.type ?? "N/A",
    p.supplier ?? "N/A",
    p.quantity ?? 0,
    `₱${(p.unitPrice || 0).toFixed(2)}`,
    `₱${p.cost?.toLocaleString() ?? 0}`,
    p.date ?? "N/A",
    p.status ?? "Pending"
  ])

  autoTable(doc, {
    startY: currentY,
    head: [columns],
    body: rows,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: headerHeight, bottom: footerHeight, left: 10, right: 10 },
    pageBreak: "auto",
    didDrawPage: () => {
      const pageNo = (doc as any).getNumberOfPages()
      addHeader()
      addFooter(pageNo, pageNo)
    }
  })

  /* ================= GRAND TOTAL ================= */
  const grandTotal = filteredPurchases.reduce((sum, p) => sum + (p.cost || 0), 0)
  const finalY = (doc as any).lastAutoTable?.finalY || currentY

  const grandTotalY = finalY + 10
  if (grandTotalY > pageHeight - footerHeight) {
    doc.addPage()
    addHeader()
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setFillColor(230, 230, 250)
    doc.rect(10, headerHeight + 10, pageWidth - 20, 8, "F")
    doc.text(`Grand Total: ₱${grandTotal.toLocaleString()}`, 14, headerHeight + 16)
  } else {
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setFillColor(230, 230, 250)
    doc.rect(10, grandTotalY - 6, pageWidth - 20, 8, "F")
    doc.text(`Grand Total: ₱${grandTotal.toLocaleString()}`, 14, grandTotalY)
  }

  /* ================= SAVE PDF ================= */
  doc.save("purchase-orders-report.pdf")

  /* ================= OPEN GMAIL ================= */
  const subject = encodeURIComponent("Purchase Orders Receipt")
  const body = encodeURIComponent(
    "Good day,\n\nPlease find attached the purchase orders receipt.\n\nThank you."
  )
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`
  setTimeout(() => window.open(gmailUrl, "_blank"), 500)
}
  /* ----------------- SCROLL EFFECT ----------------- */
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  /* ----------------- MULTI-ITEM HANDLERS ----------------- */
  const addItemRow = () => {
    setPurchaseItems([...purchaseItems, { 
      itemName: "", 
      quantity: "", 
      unitPrice: "", 
      category: "", 
      serialNumber: "", 
      assetClass: "",
      consumableId: "" 
    }])
  }

  const removeItemRow = (index: number) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
    }
  }

  const updateItemRow = (index: number, field: keyof PurchaseItem, value: string) => {
    const updated = [...purchaseItems]
    updated[index] = { ...updated[index], [field]: value }
    setPurchaseItems(updated)
  }

  /* ----------------- PURCHASE FORM HANDLERS ----------------- */
  const handleAddPurchase = async () => {
    if (!purchaseFormData.supplier) {
      alert("Please fill in Supplier")
      return
    }

    // Validate all items
    for (let i = 0; i < purchaseItems.length; i++) {
      const item = purchaseItems[i]
      if (!item.itemName || !item.quantity) {
        alert(`Please fill in Item Name and Quantity for item ${i + 1}`)
        return
      }

      if (formType === "fixed-asset" && (!item.serialNumber || !item.assetClass)) {
        alert(`Please fill in Serial Number and Asset Class for fixed asset item ${i + 1}`)
        return
      }
    }

    try {
      // Create a purchase order for each item
      for (const item of purchaseItems) {
        const quantityMatch = item.quantity.match(/\d+/)
        const quantity = quantityMatch ? Number(quantityMatch[0]) : 0
        const unitPrice = Number(item.unitPrice) || 0
        const totalCost = quantity * unitPrice

        const newPurchase: Omit<Purchase, 'id'> = {
          item: item.itemName,
          quantity,
          supplier: purchaseFormData.supplier,
          cost: totalCost,
          date: purchaseFormData.date,
          type: formType,
          status: "Pending",
          receipt: null,
          unitPrice,
          category: item.category,
          consumableId: item.consumableId,
          serialNumber: item.serialNumber,
          assetClass: item.assetClass
        }

        if (editId) {
          const success = await updatePurchase(editId, newPurchase)
          if (!success) {
            alert('Failed to update purchase order')
            return
          }
        } else {
          const id = await addPurchase(newPurchase)
          if (!id) {
            alert('Failed to create purchase order')
            return
          }
        }
      }

      await loadAllData()
      resetForm()
    } catch (error) {
      console.error('Error adding purchase:', error)
      alert('Failed to save purchase order(s)')
    }
  }

  const resetForm = () => {
    setPurchaseFormData({
      supplier: "",
      notes: "",
      date: new Date().toISOString().split("T")[0]
    })
    setPurchaseItems([
      { itemName: "", quantity: "", unitPrice: "", category: "", serialNumber: "", assetClass: "", consumableId: "" }
    ])
    setEditId(null)
    setShowForm(false)
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
  }

  const handleEdit = (purchase: Purchase) => {
    setEditId(purchase.id || null)
    setFormType(purchase.type)
    setPurchaseFormData({
      supplier: purchase.supplier,
      notes: "",
      date: purchase.date || new Date().toISOString().split("T")[0]
    })
    setPurchaseItems([{
      itemName: purchase.item,
      quantity: purchase.quantity.toString(),
      unitPrice: purchase.unitPrice?.toString() || "",
      category: purchase.category || "",
      serialNumber: purchase.serialNumber || "",
      assetClass: purchase.assetClass || "",
      consumableId: purchase.consumableId || ""
    }])
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const success = await deletePurchase(id)
    if (success) {
      setPurchases(prev => prev.filter(p => p.id !== id))
    } else {
      alert('Failed to delete purchase order')
    }
  }

  const handleUploadReceipt = async (id: string) => {
    alert(`Receipt upload functionality - Purchase ID: ${id}`)
  }

  /* ----------------- MARK AS RECEIVED ----------------- */
  const openReceiveModal = (purchase: Purchase) => { 
    setSelectedPurchase(purchase)
    setShowReceiveModal(true) 
  }

  const confirmReceive = async () => {
    if (!selectedPurchase?.id) return
    const success = await markPurchaseAsReceived(selectedPurchase.id, selectedPurchase)
    if (success) {
      setPurchases(prev => prev.map(p => p.id === selectedPurchase.id ? { ...p, status: "Received" } : p))
      await loadAllData()
      alert('Purchase marked as received and inventory updated!')
    } else {
      alert('Failed to mark as received')
    }
    setSelectedPurchase(null)
    setShowReceiveModal(false)
  }

  const prefillPurchaseForm = (item: LowStockItem) => {
    setFormType("consumable")
    const qtyNeeded = Math.max(item.reorderLevel * 2 - item.quantity, 0)
    setPurchaseFormData({
      supplier: "",
      notes: "Reorder for low stock item",
      date: new Date().toISOString().split("T")[0]
    })
    setPurchaseItems([{
      itemName: item.name,
      quantity: qtyNeeded.toString(),
      unitPrice: item.unitPrice.toString(),
      category: item.category,
      serialNumber: "",
      assetClass: "",
      consumableId: item.id
    }])
    setShowForm(true)
    setEditId(null)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading purchasing data...</p>
      </div>
    </div>
  )

  const totalValue = purchases.reduce((sum, p) => sum + p.cost, 0)
  const pendingValue = purchases.filter(p => p.status === "Pending").reduce((sum, p) => sum + p.cost, 0)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className={`sticky top-0 z-50 bg-white border-b border-gray-200 transition-all duration-300 ${isScrolled ? "py-2" : "py-4"}`}>
        <h1 className={`font-display font-bold transition-all duration-300 ${isScrolled ? "text-xl" : "text-3xl"}`} style={{ color: "#1e3a5f" }}>
          Purchasing Management
        </h1>
        <p className={`font-sans transition-all duration-300 ${isScrolled ? "text-xs" : "text-sm"} text-gray-600`}>
          Manage purchase orders and track deliveries
        </p>
      </div>

    {/* Quick Stats - KPI Style */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { title: "Total Orders", value: purchases.length, color: "#3B82F6", icon: <TrendingUp size={24} className="text-white" /> },
        { title: "Low Stock Items", value: lowStockItems.length, color: "#EF4444", icon: <AlertCircle size={24} className="text-white" /> },
        { title: "Total Value", value: totalValue, color: "#10B981", icon: <Clock size={24} className="text-white" /> },
        { title: "Pending Value", value: pendingValue, color: "#F59E0B", icon: <Clock size={24} className="text-white" /> },
      ].map((kpi, idx) => (
        <Card
          key={idx}
          className="p-6 shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => kpi.title === "Low Stock Items" && setShowLowStock && setShowLowStock(!showLowStock)}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{kpi.title}</p>
              <h3 className="text-2xl font-bold mt-1">
                <CountUp end={kpi.value} duration={1.5} separator="," />
              </h3>
            </div>
            <div
              className="p-3 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: kpi.color }}
            >
              {kpi.icon}
            </div>
          </div>
        </Card>
      ))}
    </div>
      {/* Low Stock Items */}
      <div>
        <h2 className="font-bold text-xl mb-2">Low Stock Items (Click to Create Purchase Order)</h2>
        <div className="overflow-x-auto border rounded-lg bg-blue-50 shadow-md">
          <table className="w-full text-sm">
             <thead className="bg-linear-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Current Qty</th>
                <th className="px-4 py-2 text-left">Reorder Level</th>
                <th className="px-4 py-2 text-left">Qty Needed</th>
                <th className="px-4 py-2 text-left">Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-gray-500 text-center" colSpan={6}>No low-stock items 🎉</td>
                </tr>
              )}
              {lowStockItems.map(item => {
                const qtyNeeded = Math.max(item.reorderLevel * 2 - item.quantity, 0)
                return (
                  <tr key={item.id} className="border-t cursor-pointer hover:bg-red-100 transition-colors" onClick={() => prefillPurchaseForm(item)}>
                    <td className="px-4 py-2 font-medium">{item.name}</td>
                    <td className="px-4 py-2">{item.category}</td>
                    <td className="px-4 py-2 text-red-600 font-semibold">{item.quantity}</td>
                    <td className="px-4 py-2">{item.reorderLevel}</td>
                    <td className="px-4 py-2 font-bold text-red-700">{qtyNeeded}</td>
                    <td className="px-4 py-2">₱{item.unitPrice.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => { 
            setShowForm(!showForm)
            setEditId(null)
            setPurchaseFormData({ 
              supplier: "", 
              notes: "", 
              date: new Date().toISOString().split("T")[0]
            })
            setPurchaseItems([
              { itemName: "", quantity: "", unitPrice: "", category: "", serialNumber: "", assetClass: "", consumableId: "" }
            ])
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={18} /> Add Purchase Order
        </Button>
      </div>

      {/* Multi-Item Purchase Form */}
      {showForm && (
        <Card className="p-6 shadow-md rounded-lg bg-blue-50">
          <h3 className="font-display text-lg font-bold mb-4">
            {editId ? "Edit Purchase Order" : "Create New Purchase Order"}
          </h3>
          
          {/* Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Purchase Type</label>
            <select 
              value={formType} 
              onChange={(e) => setFormType(e.target.value as "consumable" | "fixed-asset")} 
              className="border p-2 rounded bg-white w-full md:w-64"
            >
              <option value="consumable">Consumable</option>
              <option value="fixed-asset">Fixed Asset</option>
            </select>
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Supplier *</label>
              <input 
                type="text" 
                placeholder="Supplier Name" 
                value={purchaseFormData.supplier} 
                onChange={(e) => setPurchaseFormData({ ...purchaseFormData, supplier: e.target.value })} 
                className="border p-2 rounded bg-white w-full" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Purchase Date *</label>
              <input 
                type="date" 
                value={purchaseFormData.date} 
                onChange={(e) => setPurchaseFormData({ ...purchaseFormData, date: e.target.value })} 
                className="border p-2 rounded bg-white w-full" 
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-md">Items</h4>
              <Button
                onClick={addItemRow}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1"
              >
                <Plus size={16} /> Add Item
              </Button>
            </div>

            {purchaseItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 mb-3 bg-white relative">
                {purchaseItems.length > 1 && (
                  <button
                    onClick={() => removeItemRow(index)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                    title="Remove item"
                  >
                    <X size={20} />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Item Name *</label>
                    <input 
                      type="text" 
                      placeholder="Item Name" 
                      value={item.itemName} 
                      onChange={(e) => updateItemRow(index, 'itemName', e.target.value)} 
                      className="border p-2 rounded bg-white w-full" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity *</label>
                    <input 
                      type="text" 
                      placeholder="e.g., 10, 5 boxes, 3 units" 
                      value={item.quantity} 
                      onChange={(e) => updateItemRow(index, 'quantity', e.target.value)} 
                      className="border p-2 rounded bg-white w-full" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Unit Price</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Price per unit" 
                      value={item.unitPrice} 
                      onChange={(e) => updateItemRow(index, 'unitPrice', e.target.value)} 
                      className="border p-2 rounded bg-white w-full" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <input 
                      type="text" 
                      placeholder="Category" 
                      value={item.category} 
                      onChange={(e) => updateItemRow(index, 'category', e.target.value)} 
                      className="border p-2 rounded bg-white w-full" 
                    />
                  </div>

                  {/* Fixed Asset Specific Fields */}
                  {formType === "fixed-asset" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Serial Number *</label>
                        <input 
                          type="text" 
                          placeholder="Serial Number" 
                          value={item.serialNumber} 
                          onChange={(e) => updateItemRow(index, 'serialNumber', e.target.value)} 
                          className="border p-2 rounded bg-white w-full" 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Asset Class *</label>
                        <select 
                          value={item.assetClass} 
                          onChange={(e) => updateItemRow(index, 'assetClass', e.target.value)} 
                          className="border p-2 rounded bg-white w-full"
                        >
                          <option value="">Select Asset Class</option>
                          <option value="Office Equipment">Office Equipment</option>
                          <option value="Electrical Equipment & Accessories">Electrical Equipment & Accessories</option>
                          <option value="Office Furniture">Office Furniture</option>
                          <option value="Communication Devices">Communication Devices</option>
                          <option value="IT Equipment">IT Equipment</option>
                          <option value="Safety Equipment">Safety Equipment</option>
                          <option value="Appliances">Appliances</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Total Cost for this item */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Item Total</label>
                    <input 
                      type="text" 
                      value={`₱${(
                        (Number(item.quantity.match(/\d+/)?.[0]) || 0) *
                        (Number(item.unitPrice) || 0)
                      ).toLocaleString()}`}
                      readOnly
                      className="border p-2 rounded bg-gray-100 w-full font-bold" 
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Grand Total */}
            <div className="mt-4 p-4 bg-blue-100 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Grand Total:</span>
                <span className="font-bold text-xl text-blue-700">
                  ₱{purchaseItems.reduce((sum, item) => {
                    const qty = Number(item.quantity.match(/\d+/)?.[0]) || 0
                    const price = Number(item.unitPrice) || 0
                    return sum + (qty * price)
                  }, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleAddPurchase} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editId ? "Save Changes" : "Create Purchase Order"}
            </Button>
            <Button onClick={() => { setShowForm(false); setEditId(null) }} className="bg-red-600 hover:bg-red-700 text-white">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ================= FILTER & TABLE ================= */}
      <div className="space-y-6" ref={tableRef}>
        {/* TABLE TITLE */}
        <h2 className="text-2xl font-extrabold text-gray-800 mb-4 text-left">
          Purchase Orders
        </h2>

        {/* FILTER BAR */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
          <div className="flex gap-3 flex-wrap">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Types</option>
              <option value="consumable">Consumables</option>
              <option value="fixed-asset">Fixed Assets</option>
            </select>

            {/* Month Filter */}
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>

            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* STATUS FILTER */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Received">Received</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generatePDFAndOpenGmail}
              className="bg-green-600 text-white flex gap-2"
            >
              <FileText size={16} /> Download & Email PDF
            </Button>

            <Button
              onClick={() => setShowDeleteAllModal(true)}
              className="bg-red-600 text-white flex gap-2"
            >
              <Trash2 size={16} /> Delete All
            </Button>
          </div>
        </div>

        {/* PURCHASE TABLE */}
        <div className="border rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto max-h-100">
            <table className="w-full text-sm bg-blue-100">
               <thead className="bg-linear-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                      No purchase orders found.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(p => {
                    const c = getStatusColor(p.status)

                    return (
                      <tr key={p.id} className="border-t hover:bg-blue-50">
                        <td className="px-4 py-2">{p.item}</td>
                        <td className="px-4 py-2 capitalize">{p.type}</td>
                        <td className="px-4 py-2">{p.supplier}</td>
                        <td className="px-4 py-2 text-center">{p.quantity}</td>
                        <td className="px-4 py-2">₱{p.unitPrice?.toFixed(2)}</td>
                        <td className="px-4 py-2 font-bold">₱{p.cost.toLocaleString()}</td>
                        <td className="px-4 py-2">{p.date}</td>

                        <td className="px-4 py-2">
                          <span
                            className="px-3 py-1 rounded-full text-xs"
                            style={{ background: c.bg, color: c.text }}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="px-4 py-2 flex justify-center gap-2">
                          {p.status === "Pending" && (
                            <button onClick={() => openReceiveModal(p)} title="Mark as Received">
                              <Check size={16} className="text-green-600" />
                            </button>
                          )}

                          <button onClick={() => handleUploadReceipt(p.id!)} title="Upload Receipt">
                            <Upload size={16} />
                          </button>

                          <button onClick={() => handleEdit(p)} title="Edit">
                            <Edit2 size={16} />
                          </button>

                          <button 
                            onClick={() => setDeleteTargetId(p.id!)} 
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DYNAMIC SUMMARY BELOW TABLE */}
        <div className="flex justify-between items-center text-gray-700 text-sm mt-2">
          <span>
            Total Records: <strong>{filteredPurchases.length}</strong>
          </span>
          <span>
            Total Value: <strong>
              ₱{filteredPurchases.reduce((sum, p) => sum + (p.cost || 0), 0).toLocaleString()}
            </strong>
          </span>
        </div>
      </div>


      {/* ================= DELETE ALL CONFIRM MODAL ================= */}
      <Dialog open={showDeleteAllModal} onOpenChange={setShowDeleteAllModal}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete All Purchase Orders?</DialogTitle>
            <DialogDescription>
              This action will permanently delete <strong>all filtered purchase orders</strong>. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteAllModal(false)}>Cancel</Button>
            <Button
              className="bg-red-600 text-white"
              onClick={handleDeleteAll}
            >
              Delete All
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE SINGLE ITEM MODAL */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Purchase Order?</DialogTitle>
            <DialogDescription>
              This action will permanently delete this purchase order. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
            <Button
              className="bg-red-600 text-white"
              onClick={async () => {
                if (!deleteTargetId) return
                await deletePurchase(deleteTargetId)
                setPurchases(prev => prev.filter(p => p.id !== deleteTargetId))
                setDeleteTargetId(null)
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  {/* ================= RECEIVE MODAL ================= */}
      {showReceiveModal && selectedPurchase && (
        <Dialog open onOpenChange={() => setShowReceiveModal(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Receipt</DialogTitle>
              <DialogDescription>
                Mark <strong>{selectedPurchase.item}</strong> as received?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowReceiveModal(false)}>Cancel</Button>
              <Button
                className="bg-green-600 text-white"
                onClick={async () => {
                  await markPurchaseAsReceived(selectedPurchase.id!, selectedPurchase)
                  await loadAllData()
                  setShowReceiveModal(false)
                }}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}