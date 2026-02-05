"use client"

import React from "react"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Menu,
  X,
  LogOut,
  Factory,
  BarChart2,
} from "lucide-react"

import LogoGlobe from "@/public/logo-globe.png"

type Page = "dashboard" | "inventory" | "purchasing" | "reports" | "supplier"

interface SidebarProps {
  currentPage: Page
  onPageChange: (page: Page) => void
  onLogout?: () => void
}

export function Sidebar({ currentPage, onPageChange, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false)

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "purchasing", label: "Purchasing", icon: ShoppingCart },
    { id: "supplier", label: "Supplier", icon: Factory },
    // Removed Reports
  ]

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem("authToken")
      window.location.href = "/login-page"
    }
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg text-white"
        style={{ backgroundColor: "#1F2937" }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          ${isOpen ? "w-64" : "w-0"}
          fixed lg:relative lg:w-64
          h-screen
          overflow-hidden
          transition-all duration-300
          flex flex-col
          shadow-lg
          z-40
        `}
        style={{ backgroundColor: "#1F2937" }}
      >
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: "#374151" }}>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={LogoGlobe.src} alt="Logo" />
            </div>
            <div className="leading-tight">
              <h1 className="font-bold text-white text-sm">
                Inter-World Shipping Corporation
              </h1>
              <p className="text-[10px] mt-1 text-gray-300">Inventory System</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id as any)
                  if (window.innerWidth < 1024) setIsOpen(false)
                }}
                className={`
                  w-full px-4 py-3 rounded-lg flex items-center gap-3
                  text-sm font-medium transition-all
                  ${isActive ? "text-white" : "text-gray-400 hover:text-white"}
                `}
                style={{
                  backgroundColor: isActive ? "#2563EB" : "transparent",
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t" style={{ borderColor: "#374151" }}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full px-4 py-3 rounded-lg flex items-center gap-3 
                       text-sm font-medium transition-all
                       focus:outline-none active:bg-transparent text-gray-400 hover:text-white"
            style={{ backgroundColor: "transparent" }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Dark background (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-lg shadow-xl w-80">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Confirm Logout
            </h2>

            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to logout?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                No
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
