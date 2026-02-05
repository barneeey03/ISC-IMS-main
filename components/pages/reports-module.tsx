"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Filter } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import * as XLSX from "xlsx"

export function ReportsModule() {
  const [reportType, setReportType] = useState("asset")
  const [dateRange, setDateRange] = useState("month")
  const [category, setCategory] = useState("all")
  const [isScrolled, setIsScrolled] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const assetSummary = [
    { status: "Operational", count: 18, percentage: 78 },
    { status: "Maintenance", count: 4, percentage: 17 },
    { status: "Retired", count: 1, percentage: 5 },
  ]

  const consumableSummary = [
    { name: "Engine Oil (10W-40)", stock: 250, usage: "45/month", value: "$1,250" },
    { name: "Hydraulic Fluid", stock: 15, usage: "30/month", value: "$450" },
    { name: "Safety Equipment", stock: 42, usage: 5, value: "$2,100" },
  ]

  const purchaseHistory = [
    { month: "October", orders: 12, value: "$18,500", received: 11 },
    { month: "November", orders: 15, value: "$22,300", received: 14 },
    { month: "December", orders: 10, value: "$15,800", received: 8 },
  ]

  // -------------------------
  // FIXED EXPORT PDF (WORKING)
  // -------------------------
  async function handleExportPDF() {
    if (!reportRef.current) return

    try {
      const element = reportRef.current

      // ⭐ Prevent sticky / scroll issues
      document.body.classList.add("html2canvas-reset")

      // ⭐ Wait a moment for DOM to visually settle
      await new Promise((r) => setTimeout(r, 150))

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#FFFFFF",
        logging: false,

        // ⭐ Prevent foreignObject errors from ShadCN components
        removeContainer: true,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      })

      document.body.classList.remove("html2canvas-reset")

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let remaining = imgHeight
      let position = 0

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      remaining -= pageHeight

      while (remaining > 0) {
        pdf.addPage()
        position = remaining - imgHeight
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        remaining -= pageHeight
      }

      pdf.save(`report-${reportType}.pdf`)
    } catch (err) {
      console.error("PDF Export Error:", err)
      alert("PDF export failed. Check console for details.")
      document.body.classList.remove("html2canvas-reset")
    }
  }

  // -------------------------
  // EXPORT EXCEL
  // -------------------------
  function handleExportExcel() {
    let data: any[] = []

    if (reportType === "asset") {
      data = assetSummary.map((item) => ({
        Status: item.status,
        Count: item.count,
        Percentage: item.percentage + "%",
      }))
    }

    if (reportType === "consumable") {
      data = consumableSummary.map((item) => ({
        Item: item.name,
        Stock: item.stock,
        Usage: item.usage,
        Value: item.value,
      }))
    }

    if (reportType === "purchase") {
      data = purchaseHistory.map((row) => ({
        Month: row.month,
        Orders: row.orders,
        Value: row.value,
        Received: row.received,
        Fulfillment: Math.round((row.received / row.orders) * 100) + "%",
      }))
    }

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report")

    XLSX.writeFile(workbook, `report-${reportType}.xlsx`)
  }

  // -------------------------
  // HEADER SCROLL EFFECT
  // -------------------------
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      className="p-6 lg:p-8 space-y-6"
      ref={reportRef}
      style={{ backgroundColor: "white" }} // IMPORTANT for PDF
    >
      {/* Sticky Header */}
      <div
        className={`sticky top-0 z-50 bg-white border-b transition-all duration-300 ${
          isScrolled ? "py-2" : "py-4"
        }`}
      >
        <h1
          className={`font-display font-bold transition-all duration-300 ${
            isScrolled ? "text-xl" : "text-3xl"
          }`}
        >
          Reports & Analytics
        </h1>

        <p className={`${isScrolled ? "text-xs" : "text-sm"} transition-all`}>
          Generate and export comprehensive inventory reports
        </p>
      </div>

      {/* FILTER CARD */}
      <Card className="p-6 shadow-md rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} />
          <h2 className="font-display text-lg font-bold">Report Filters</h2>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="asset">Asset Report</option>
              <option value="consumable">Consumable Report</option>
              <option value="purchase">Purchase History</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="all">All Categories</option>
              <option value="propulsion">Propulsion</option>
              <option value="navigation">Navigation</option>
              <option value="safety">Safety</option>
              <option value="power">Power Systems</option>
            </select>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleExportPDF}
            className="flex items-center gap-2 rounded-lg"
            style={{ backgroundColor: "#10B981", color: "white" }}
          >
            <Download size={18} />
            Export PDF
          </Button>

          <Button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-lg"
            style={{ backgroundColor: "#F59E0B", color: "white" }}
          >
            <Download size={18} />
            Export Excel
          </Button>
        </div>
      </Card>

      {/* Asset Report */}
      {reportType === "asset" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold" style={{ color: "var(--deep-navy-blue)" }}>
            Asset Status Summary
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assetSummary.map((item) => (
              <Card key={item.status} className="p-6 border-0 shadow-md rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {item.status}
                    </p>
                    <h3 className="font-display text-3xl font-bold mt-2" style={{ color: "var(--deep-navy-blue)" }}>
                      {item.count}
                    </h3>
                    <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor:
                            item.status === "Operational"
                              ? "#10B981"
                              : item.status === "Maintenance"
                              ? "#F59E0B"
                              : "#EF4444",
                        }}
                      />
                    </div>
                    <p className="font-sans text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>
                      {item.percentage}% of total assets
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6 border-0 shadow-md rounded-lg">
            <h3 className="font-display text-lg font-bold mb-4" style={{ color: "var(--deep-navy-blue)" }}>
              Asset Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "var(--muted)" }}>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Category
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Count
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Value
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { category: "Propulsion", count: 8, value: "$450,000", status: "Operational" },
                    { category: "Navigation", count: 6, value: "$180,000", status: "Operational" },
                    { category: "Safety", count: 5, value: "$75,000", status: "Operational" },
                    { category: "Power Systems", count: 4, value: "$120,000", status: "Mixed" },
                  ].map((row) => (
                    <tr key={row.category} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-3 font-sans font-medium" style={{ color: "var(--deep-navy-blue)" }}>
                        {row.category}
                      </td>
                      <td className="px-4 py-3 font-sans" style={{ color: "var(--muted-foreground)" }}>
                        {row.count}
                      </td>
                      <td className="px-4 py-3 font-sans font-medium" style={{ color: "var(--ocean-blue)" }}>
                        {row.value}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-sans font-medium"
                          style={{
                            backgroundColor: "#D1FAE5",
                            color: "#065F46",
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Consumable Report */}
      {reportType === "consumable" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold" style={{ color: "var(--deep-navy-blue)" }}>
            Consumable Inventory Report
          </h2>

          <Card className="p-6 border-0 shadow-md rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "var(--muted)" }}>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Item
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Current Stock
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Monthly Usage
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Inventory Value
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Projection
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {consumableSummary.map((item) => (
                    <tr key={item.name} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-3 font-sans font-medium" style={{ color: "var(--deep-navy-blue)" }}>
                        {item.name}
                      </td>
                      <td className="px-4 py-3 font-sans" style={{ color: "var(--muted-foreground)" }}>
                        {item.stock} units
                      </td>
                      <td className="px-4 py-3 font-sans" style={{ color: "var(--muted-foreground)" }}>
                        {item.usage}
                      </td>
                      <td className="px-4 py-3 font-sans font-medium" style={{ color: "var(--ocean-blue)" }}>
                        {item.value}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-sans font-medium"
                          style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}
                        >
                          In Stock
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Purchase History Report */}
      {reportType === "purchase" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold" style={{ color: "var(--deep-navy-blue)" }}>
            Purchase History
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 border-0 shadow-md rounded-lg">
              <p className="font-sans text-sm" style={{ color: "var(--muted-foreground)" }}>
                Total Orders (90 days)
              </p>
              <h3 className="font-display text-3xl font-bold mt-2" style={{ color: "var(--deep-navy-blue)" }}>
                37
              </h3>
            </Card>
            <Card className="p-6 border-0 shadow-md rounded-lg">
              <p className="font-sans text-sm" style={{ color: "var(--muted-foreground)" }}>
                Total Spend
              </p>
              <h3 className="font-display text-3xl font-bold mt-2" style={{ color: "var(--ocean-blue)" }}>
                $56,600
              </h3>
            </Card>
            <Card className="p-6 border-0 shadow-md rounded-lg">
              <p className="font-sans text-sm" style={{ color: "var(--muted-foreground)" }}>
                On-Time Delivery Rate
              </p>
              <h3 className="font-display text-3xl font-bold mt-2" style={{ color: "#10B981" }}>
                95%
              </h3>
            </Card>
          </div>

          <Card className="p-6 border-0 shadow-md rounded-lg">
            <h3 className="font-display text-lg font-bold mb-4" style={{ color: "var(--deep-navy-blue)" }}>
              Monthly Purchase Activity
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "var(--muted)" }}>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Month
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Orders
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Value
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Received
                    </th>
                    <th
                      className="px-4 py-3 text-left font-display font-bold"
                      style={{ color: "var(--deep-navy-blue)" }}
                    >
                      Fulfillment Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.map((row) => (
                    <tr key={row.month} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-3 font-sans font-medium" style={{ color: "var(--deep-navy-blue)" }}>
                        {row.month}
                      </td>
                      <td className="px-4 py-3 font-sans" style={{ color: "var(--muted-foreground)" }}>
                        {row.orders}
                      </td>
                      <td className="px-4 py-3 font-sans font-medium" style={{ color: "var(--ocean-blue)" }}>
                        {row.value}
                      </td>
                      <td className="px-4 py-3 font-sans" style={{ color: "var(--muted-foreground)" }}>
                        {row.received}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-sans font-medium"
                          style={{
                            backgroundColor: "#D1FAE5",
                            color: "#065F46",
                          }}
                        >
                          {Math.round((row.received / row.orders) * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
