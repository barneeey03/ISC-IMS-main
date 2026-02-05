"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/pages/dashboard"
import { InventoryModule } from "@/components/pages/inventory-module"
import PurchasingModule from "@/components/pages/purchasing-module" // ✅ default import
import { ReportsModule } from "@/components/pages/reports-module"
import { SupplierModule } from "@/components/pages/supplier"

type Page = "dashboard" | "inventory" | "purchasing" | "reports" | "supplier"

type Supplier = {
  id: string
  name: string
  tinNumber?: string
  [key: string]: any
}

export function InventorySystem() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard")

  const handleSupplierUpdate = (updatedSuppliers: Supplier[]) => {
    console.log("Suppliers updated:", updatedSuppliers)
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "inventory":
        return <InventoryModule />
      case "purchasing":
        return <PurchasingModule /> 
      case "reports":
        return <ReportsModule />
      case "supplier":
        return <SupplierModule onSupplierUpdate={handleSupplierUpdate} />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
    </div>
  )
}
