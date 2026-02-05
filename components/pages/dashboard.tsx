"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { TrendingUp, AlertCircle, Clock } from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts"
import CountUp from "react-countup"
import { db } from "@/lib/firebase"
import { collection, onSnapshot } from "firebase/firestore"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// -------------------- TYPES --------------------
interface FixedAsset {
  status: string
  id: string
  name: string
  quantity: number
  date: string | Date | null | any
}
interface Consumable {
  id: string
  item: string
  current: number
  threshold: number
  date: Date | string | any
}
interface Purchase {
  id: string
  item?: string
  quantity?: number
  supplier?: string
  date?: string | Date | any
  status?: string
}

// -------------------- DASHBOARD --------------------
export function Dashboard() {
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [showLowStock, setShowLowStock] = useState(true)
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState<number | "All">("All")
  const [yearFilter, setYearFilter] = useState<number | "All">("All")
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Received">("All")

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"]

  // -------------------- FETCH DATA --------------------
  useEffect(() => {
    setLoading(true)

    const unsubscribeFixedAssets = onSnapshot(
      collection(db, "fixedAssets"),
      snapshot => {
        const data: FixedAsset[] = snapshot.docs.map(doc => {
          const d = doc.data()
          
          // Handle date - keep as-is if string (YYYY-MM-DD format from inventory)
          let dateValue = d.dateAcquired || null
          if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
            // Convert Firestore Timestamp to local date string
            const jsDate = dateValue.toDate()
            const year = jsDate.getFullYear()
            const month = String(jsDate.getMonth() + 1).padStart(2, '0')
            const day = String(jsDate.getDate()).padStart(2, '0')
            dateValue = `${year}-${month}-${day}`
          }
          // If it's already a string in YYYY-MM-DD format, keep it as-is
          
          return {
            id: doc.id,
            name: d.name || "Unnamed Asset",
            quantity: Number(d.qtyFunctioning || 0) + Number(d.qtyNotFunctioning || 0),
            date: dateValue,
            status: d.status || "Operational",
          }
        })
        setFixedAssets(data)
        setLoading(false)
      }
    )
    
    const unsubscribeConsumables = onSnapshot(collection(db, "consumables"), snapshot => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data()
        // Match exact field names from inventory module
        const threshold = Number(d.reorderLevel || 0)
        const current = Number(d.quantity || 0)
        
        // Handle datePurchased field - keep as string or convert properly
        let dateValue = d.datePurchased || d.createdAt || new Date()
        if (typeof dateValue === 'object' && 'toDate' in dateValue) {
          // Convert Firestore Timestamp to local date string
          const jsDate = dateValue.toDate()
          const year = jsDate.getFullYear()
          const month = String(jsDate.getMonth() + 1).padStart(2, '0')
          const day = String(jsDate.getDate()).padStart(2, '0')
          dateValue = `${year}-${month}-${day}`
        } else if (typeof dateValue === 'string') {
          // Keep string dates as-is
          dateValue = dateValue
        } else if (dateValue instanceof Date) {
          const year = dateValue.getFullYear()
          const month = String(dateValue.getMonth() + 1).padStart(2, '0')
          const day = String(dateValue.getDate()).padStart(2, '0')
          dateValue = `${year}-${month}-${day}`
        }
        
        return {
          id: doc.id,
          item: d.name || "Unnamed Item",
          current,
          threshold,
          date: dateValue,
        }
      })
      setConsumables(data)
    })

    const unsubscribePurchases = onSnapshot(collection(db, "purchases"), snapshot => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data()
        
        // Handle date field - keep as string or convert properly
        let dateValue = d.date
        if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
          // Convert Firestore Timestamp to local date string
          const jsDate = dateValue.toDate()
          const year = jsDate.getFullYear()
          const month = String(jsDate.getMonth() + 1).padStart(2, '0')
          const day = String(jsDate.getDate()).padStart(2, '0')
          dateValue = `${year}-${month}-${day}`
        }
        
        return {
          id: doc.id,
          ...d,
          date: dateValue
        }
      })
      setPurchases(data)
      setLoading(false)
    })

    return () => {
      unsubscribeFixedAssets()
      unsubscribeConsumables()
      unsubscribePurchases()
    }
  }, [])

  // -------------------- FILTERED DATA --------------------
  const filteredFixedAssets = fixedAssets.filter(f => {
    if (monthFilter === "All" && yearFilter === "All") return true
    if (!f.date) return false
    
    // Parse date string in local time (avoid timezone shifts)
    let fDate: Date
    if (typeof f.date === 'string') {
      // Parse YYYY-MM-DD in local time
      const [year, month, day] = f.date.split('-').map(Number)
      fDate = new Date(year, month - 1, day)
    } else if (f.date instanceof Date) {
      fDate = f.date
    } else if (typeof f.date === 'object' && 'toDate' in f.date) {
      fDate = (f.date as any).toDate()
    } else {
      return false
    }
    
    // Check if date is valid
    if (isNaN(fDate.getTime())) return false
    
    if (monthFilter !== "All" && fDate.getMonth() + 1 !== monthFilter) return false
    if (yearFilter !== "All" && fDate.getFullYear() !== yearFilter) return false
    return true
  })

  const filteredConsumables = consumables.filter(c => {
    if (monthFilter === "All" && yearFilter === "All") return true
    if (!c.date) return false
    
    // Parse date string in local time (avoid timezone shifts)
    let cDate: Date
    if (typeof c.date === 'string') {
      // Parse YYYY-MM-DD in local time
      const [year, month, day] = c.date.split('-').map(Number)
      cDate = new Date(year, month - 1, day)
    } else if (c.date instanceof Date) {
      cDate = c.date
    } else if (typeof c.date === 'object' && 'toDate' in c.date) {
      cDate = (c.date as any).toDate()
    } else {
      return false
    }
    
    // Check if date is valid
    if (isNaN(cDate.getTime())) return false
    
    if (monthFilter !== "All" && cDate.getMonth() + 1 !== monthFilter) return false
    if (yearFilter !== "All" && cDate.getFullYear() !== yearFilter) return false
    return true
  })

  const filteredPurchases = purchases.filter(p => {
    if (statusFilter !== "All" && p.status !== statusFilter) return false
    if (!p.date) return true
    
    // Parse date string in local time (avoid timezone shifts)
    let pDate: Date
    if (typeof p.date === 'string') {
      // Parse YYYY-MM-DD in local time
      const [year, month, day] = p.date.split('-').map(Number)
      pDate = new Date(year, month - 1, day)
    } else if (p.date instanceof Date) {
      pDate = p.date
    } else if (typeof p.date === 'object' && 'toDate' in p.date) {
      pDate = (p.date as any).toDate()
    } else {
      return true
    }
    
    // Check if date is valid
    if (isNaN(pDate.getTime())) return true
    
    if (monthFilter !== "All" && pDate.getMonth() + 1 !== monthFilter) return false
    if (yearFilter !== "All" && pDate.getFullYear() !== yearFilter) return false
    return true
  })

  const isDateFiltered = monthFilter !== "All" || yearFilter !== "All"
  const activeFixedAssets = isDateFiltered ? filteredFixedAssets : fixedAssets
  const activeConsumables = isDateFiltered ? filteredConsumables : consumables
  const activePurchases = isDateFiltered ? filteredPurchases : purchases

  // -------------------- DERIVED DATA --------------------
  const totalFixedAssets = activeFixedAssets.reduce((acc, f) => acc + (f.quantity || 0), 0)
  const totalConsumables = activeConsumables.reduce((acc, c) => acc + (c.current || 0), 0)
  
  // LOW STOCK: items where current quantity is BELOW the reorder threshold
  const lowStockItems = activeConsumables.filter(c => {
    const current = Number(c.current) || 0
    const threshold = Number(c.threshold) || 0
    // Only consider items with a valid threshold and where current is below threshold
    return threshold > 0 && current < threshold
  })
  
  const lowStockCount = lowStockItems.length
  const pendingOrdersCount = activePurchases.filter(p => p.status === "Pending").length

  const lowStockData = activeConsumables
    .map(c => {
      const current = Number(c.current) || 0
      const threshold = Number(c.threshold) || 0
      return {
        name: c.item,
        current,
        threshold,
        low: threshold > 0 && current < threshold
      }
    })
    .sort((a, b) => Number(b.low) - Number(a.low))

  const trendMap = new Map<string, { assets: number; consumables: number }>()
  activeFixedAssets.forEach(f => {
    if (!f.date) return
    
    // Use the date string directly if available, otherwise parse
    let dateKey: string
    if (typeof f.date === 'string') {
      dateKey = f.date // Already in YYYY-MM-DD format
    } else if (f.date instanceof Date) {
      const year = f.date.getFullYear()
      const month = String(f.date.getMonth() + 1).padStart(2, '0')
      const day = String(f.date.getDate()).padStart(2, '0')
      dateKey = `${year}-${month}-${day}`
    } else if (typeof f.date === 'object' && 'toDate' in f.date) {
      const jsDate = (f.date as any).toDate()
      const year = jsDate.getFullYear()
      const month = String(jsDate.getMonth() + 1).padStart(2, '0')
      const day = String(jsDate.getDate()).padStart(2, '0')
      dateKey = `${year}-${month}-${day}`
    } else {
      return
    }
    
    if (!trendMap.has(dateKey)) trendMap.set(dateKey, { assets: 0, consumables: 0 })
    trendMap.get(dateKey)!.assets += f.quantity
  })
  
  activeConsumables.forEach(c => {
    if (!c.date) return
    
    // Use the date string directly if available, otherwise parse
    let dateKey: string
    if (typeof c.date === 'string') {
      dateKey = c.date // Already in YYYY-MM-DD format
    } else if (c.date instanceof Date) {
      const year = c.date.getFullYear()
      const month = String(c.date.getMonth() + 1).padStart(2, '0')
      const day = String(c.date.getDate()).padStart(2, '0')
      dateKey = `${year}-${month}-${day}`
    } else if (typeof c.date === 'object' && 'toDate' in c.date) {
      const jsDate = (c.date as any).toDate()
      const year = jsDate.getFullYear()
      const month = String(jsDate.getMonth() + 1).padStart(2, '0')
      const day = String(jsDate.getDate()).padStart(2, '0')
      dateKey = `${year}-${month}-${day}`
    } else {
      return
    }
    
    if (!trendMap.has(dateKey)) trendMap.set(dateKey, { assets: 0, consumables: 0 })
    trendMap.get(dateKey)!.consumables += c.current
  })
  
  const trendData = Array.from(trendMap.entries())
    .map(([date, val]) => ({ date, ...val }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // GROUP ASSETS BY STATUS FOR PIE CHART
  const statusMap = new Map<string, number>()
  activeFixedAssets.forEach(f => {
    const status = f.status || "Unknown"
    statusMap.set(status, (statusMap.get(status) || 0) + f.quantity)
  })
  
  const assetStatusData = Array.from(statusMap.entries()).map(([name, value]) => ({
    name,
    value
  }))

  if (loading) return <p className="p-6 text-center text-gray-500">Loading dashboard data...</p>

/* ================= PDF FUNCTION ================= */
const generatePDF = () => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const headerHeight = 50
  const footerHeight = 30
  let y = headerHeight

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
    doc.line(10, headerHeight - 10, pageWidth - 10, headerHeight - 10)
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
    doc.text("TEL: (02) 8888-9999 | EMAIL: orders@interworldshipping.com | VAT Reg No: 123-456-789-000", pageWidth / 2, pageHeight - 10, { align: "center" })
    doc.text(`Page ${pageNo} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" })
  }

  addHeader()

  /* ================= META & SUMMARY ================= */
  const reportDate = new Date().toLocaleString()
  const preparedBy = "Inventory Officer"

  doc.setFontSize(10)
  doc.text(`Report Date: ${reportDate}`, 14, y)
  y += 6
  doc.text(`Prepared By: ${preparedBy}`, 14, y)
  y += 10

  doc.setFontSize(14)
  doc.text("Executive Summary", 14, y)
  y += 8
  doc.setFontSize(11)
  doc.text(`• Total Fixed Assets: ${totalFixedAssets}`, 14, y)
  y += 6
  doc.text(`• Total Consumables: ${totalConsumables}`, 14, y)
  y += 6
  doc.text(`• Low Stock Items: ${lowStockCount}`, 14, y)
  y += 6
  doc.text(`• Pending Orders: ${pendingOrdersCount}`, 14, y)
  y += 10

  /* ================= HELPER FUNCTION TO DRAW TABLE ================= */
  const drawTable = (title: string, columns: string[], rows: any[][]) => {
    doc.setFontSize(14)
    doc.text(title, 14, y)
    y += 8

    autoTable(doc, {
      startY: y,
      head: [columns],
      body: rows,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: headerHeight, bottom: footerHeight, left: 14, right: 14 },
      pageBreak: "auto",
      didDrawPage: (data) => {
        const pageNo = (doc as any).getNumberOfPages()
        addHeader()
        addFooter(pageNo, pageNo)
      }
    })

    y = (doc as any).lastAutoTable?.finalY + 10 || y + 10
  }

  /* ================= DRAW TABLES ================= */
  drawTable(
    "Fixed Assets",
    ["Asset", "Quantity", "Status"],
    activeFixedAssets.map(f => [
      f.name ?? "N/A",
      f.quantity ?? 0,
      f.status ?? "Unknown"
    ])
  )

  drawTable(
    "Consumables",
    ["Item", "Current Qty", "Reorder Level"],
    activeConsumables.map(c => [
      c.item ?? "N/A",
      c.current ?? 0,
      c.threshold ?? 0
    ])
  )

  drawTable(
    "Purchase Orders",
    ["Item", "Quantity", "Supplier", "Status"],
    activePurchases.map(p => [
      p.item ?? "N/A",
      p.quantity ?? 0,
      p.supplier ?? "N/A",
      p.status ?? "Pending"
    ])
  )

  /* ================= DOWNLOAD ================= */
  doc.save("Dashboard_Report.pdf")

  /* ================= OPEN GMAIL ================= */
  const gmailUrl =
    `https://mail.google.com/mail/?view=cm&fs=1` +
    `&su=${encodeURIComponent("Dashboard Inventory Report")}` +
    `&body=${encodeURIComponent("Good day,\n\nPlease find attached the dashboard inventory report.\n\nRegards.")}`

  window.open(gmailUrl, "_blank")
}

  // -------------------- JSX --------------------
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Filters + Generate PDF Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 rounded-t-lg">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="border rounded-lg px-3 py-2"
            value={monthFilter}
            onChange={e =>
              setMonthFilter(e.target.value === "All" ? "All" : Number(e.target.value))
            }
          >
            <option value="All">All Months</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            className="border rounded-lg px-3 py-2"
            value={yearFilter}
            onChange={e =>
              setYearFilter(e.target.value === "All" ? "All" : Number(e.target.value))
            }
          >
            <option value="All">All Years</option>
            {[2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            className="border rounded-lg px-3 py-2"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Received">Received</option>
          </select>
        </div>

        {/* Generate PDF Button (aligned right) */}
        <div className="mt-2 md:mt-0">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={generatePDF}
          >
            Generate PDF & Email
          </button>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[ 
          { title: "Total Fixed Assets", value: totalFixedAssets, color: "#3B82F6", icon: <TrendingUp size={24} className="text-white" /> },
          { title: "Total Consumables", value: totalConsumables, color: "#10B981", icon: <TrendingUp size={24} className="text-white" /> },
          { title: "Low Stock Items", value: lowStockCount, color: "#EF4444", icon: <AlertCircle size={24} className="text-white" /> },
          { title: "Pending Orders", value: pendingOrdersCount, color: "#F59E0B", icon: <Clock size={24} className="text-white" /> }
        ].map((kpi, idx) => (
          <Card key={idx} className="p-6 shadow-md rounded-xl cursor-pointer" onClick={() => kpi.title === "Low Stock Items" && setShowLowStock(!showLowStock)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{kpi.title}</p>
                <h3 className="text-2xl font-bold mt-1"><CountUp end={kpi.value} duration={1.5} /></h3>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: kpi.color }}>{kpi.icon}</div>
            </div>
          </Card>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventory Trend */}
        <Card className="p-6 shadow-md rounded-xl">
          <h2 className="text-lg font-bold mb-4">Inventory Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="assets" stroke="#3B82F6" name="Fixed Assets" strokeWidth={2} />
              <Line type="monotone" dataKey="consumables" stroke="#10B981" name="Consumables" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Asset Status - FIXED VERSION */}
        <Card className="p-6 shadow-md rounded-xl">
          <h2 className="text-lg font-bold mb-4">Asset Distribution by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={assetStatusData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={80}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {assetStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Low Stock */}
        {showLowStock && (
        <Card className="p-6 shadow-md rounded-xl md:col-span-2">
          <h2 className="text-lg font-bold mb-4">Low Stock Items</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={lowStockData} margin={{ bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" name="Current Stock">
                {lowStockData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.low ? "#EF4444" : "#10B981"}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="threshold"
                name="Reorder Level"
                fill="#3B82F6"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
      </div>

      {/* Purchases Table */}
      <div className="space-y-4 mt-6">
        <h2 className="text-xl font-bold mb-2">Purchases</h2>
        <Card className="overflow-x-auto shadow-md rounded-xl">
          <table className="w-full text-sm table-auto border-collapse">
            <thead className="bg-gray-100">
              <tr>
                {["Item", "Qty", "Supplier", "Date", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-700 border-b border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p, idx) => {
                  const status = p.status?.trim() || "Pending"
                  const isReceived = status.toLowerCase() === "received"

                  return (
                    <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 border-b border-gray-200">{p.item || "Unknown"}</td>
                      <td className="px-4 py-3 border-b border-gray-200">{p.quantity || 0}</td>
                      <td className="px-4 py-3 border-b border-gray-200">{p.supplier || "Unknown"}</td>
                      <td className="px-4 py-3 border-b border-gray-200">{p.date || "N/A"}</td>
                      <td className="px-4 py-3 border-b border-gray-200">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: isReceived ? "#D1FAE5" : "#FEF3C7",
                            color: isReceived ? "#065F46" : "#92400E",
                          }}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}