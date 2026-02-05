import {
  getFixedAssets,
  addFixedAsset,
  updateFixedAsset,
  deleteFixedAsset,
  getConsumables,
  addConsumable as addConsumableToDb,
  updateConsumable as updateConsumableInDb,
  deleteConsumable as deleteConsumableFromDb,
  getIssuedItems,
  addIssuedItem as addIssuedItemToDb,
  deleteIssuedItem as deleteIssuedItemFromDb,
  type FixedAsset,
  type ConsumableItem,
  type IssuedItem,
} from "@/lib/inventoryService"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Plus, Search, Calendar, X, Edit2, Trash2, Filter } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { Button } from "../ui/button"
import { Card } from "../ui/card"

interface MultiItemEntry {
  consumableId: string
  consumableName: string
  quantityIssued: number
}

type InventoryTab = "fixed-assets" | "consumables" | "issued-items"

export function InventoryModule() {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    type: "asset" | "consumable" | "issued"
    name: string
  } | null>(null)
  const [activeTab, setActiveTab] = useState<InventoryTab>("fixed-assets")
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [showConsumableForm, setShowConsumableForm] = useState(false)
  const [showIssuedItemForm, setShowIssuedItemForm] = useState(false)
  const [showMultiItemForm, setShowMultiItemForm] = useState(false)
  const [editingIssuedItem, setEditingIssuedItem] = useState<IssuedItem | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [loading, setLoading] = useState(true)

  const ASSET_CLASS_OPTIONS = [
    "Office Equipment",
    "Electrical Equipment & Accessories",
    "Office Furniture",
    "Communication Devices",
    "IT Equipment",
    "Safety Equipment",
    "Appliances",
  ]
  const ASSET_STATUS_OPTIONS = ["Operational", "Maintenance", "Non-operational"]
  const [consumableCategoryFilter, setConsumableCategoryFilter] = useState("All")
  const [highlightReorder, setHighlightReorder] = useState(false);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([])
  const [consumables, setConsumables] = useState<ConsumableItem[]>([])
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null)
  const [editingConsumable, setEditingConsumable] = useState<ConsumableItem | null>(null)
  const [issuedItems, setIssuedItems] = useState<IssuedItem[]>([])
  const [consumableSortOrder, setConsumableSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [showOnlyReorder, setShowOnlyReorder] = useState(false)
  const [assetClassFilter, setAssetClassFilter] = useState("All")
  const [assetStatusFilter, setAssetStatusFilter] = useState("All")
  const [assetSortAsc, setAssetSortAsc] = useState(true)
  const [assetSearchQuery, setAssetSearchQuery] = useState("")
  const [consumableSearchQuery, setConsumableSearchQuery] = useState("")
  const [issuedItemSearchQuery, setIssuedItemSearchQuery] = useState("")
  const [issuedItemCategoryFilter, setIssuedItemCategoryFilter] = useState("All")
  const [issuedItemDateFrom, setIssuedItemDateFrom] = useState("")
  const [issuedItemDateTo, setIssuedItemDateTo] = useState("")
  const [showIssuedItemDateFilter, setShowIssuedItemDateFilter] = useState(false)

  // Fixed Assets
  const [assetDateFrom, setAssetDateFrom] = useState("")
  const [assetDateTo, setAssetDateTo] = useState("")
  const [showAssetDateFilter, setShowAssetDateFilter] = useState(false)

  // Consumables
  const [consumableDateFrom, setConsumableDateFrom] = useState("")
  const [consumableDateTo, setConsumableDateTo] = useState("")
  const [showConsumableDateFilter, setShowConsumableDateFilter] = useState(false)

  // Load data from Firebase on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [assetsData, consumablesData, issuedItemsData] = await Promise.all([
        getFixedAssets(), 
        getConsumables(),
        getIssuedItems()
      ])
      setFixedAssets(assetsData)
      setConsumables(consumablesData)
      setIssuedItems(issuedItemsData)
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load inventory data. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Operational":
        return { bg: "#D1FAE5", text: "#065F46" }
      case "Maintenance":
        return { bg: "#FEF3C7", text: "#92400E" }
      case "Non-operational":
        return { bg: "#FECACA", text: "#7F1D1D" }
      case "In Stock":
        return { bg: "#D1FAE5", text: "#065F46" }
      case "Low Stock":
        return { bg: "#FEE2E2", text: "#7F1D1D" }
      case "Out of Stock":
        return { bg: "#FCA5A5", text: "#7F1D1D" }
      default:
        return { bg: "#E5E7EB", text: "#374151" }
    }
  }

  const generateNextAssetNumber = () => {
    const nums = fixedAssets.map((a) => Number(a.assetNumber.replace("FA-", ""))).filter((n) => !isNaN(n))
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return `FA-${String(next).padStart(3, "0")}`
  }

  const generateNextConsumableId = () => {
    const nums = consumables
      .map((c) => {
        const idStr = String(c.id || "")
        return Number(idStr.replace("CON-", ""))
      })
      .filter((n) => !isNaN(n))
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return `CON-${String(next).padStart(3, "0")}`
  }

  const generateNextIssuedItemId = () => {
    const nums = issuedItems
      .map((i) => {
        const idStr = String(i.id || "")
        return Number(idStr.replace("ISSUE-", ""))
      })
      .filter((n) => !isNaN(n))
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return `ISSUE-${String(next).padStart(3, "0")}`
  }

  const computeStatus = (quantity: number, reorderLevel: number) => {
    if (quantity === 0) return "Out of Stock"
    if (quantity <= reorderLevel) return "Low Stock"
    return "In Stock"
  }

  // Fixed Assets CRUD with Firebase
  const addAsset = async (asset: any) => {
    try {
      const newAsset = {
        ...asset,
        assetNumber: asset.assetNumber || generateNextAssetNumber(),
        acquisitionCost: Number(asset.acquisitionCost || 0),
      }

      const id = await addFixedAsset(newAsset)
      if (id) {
        setFixedAssets((prev) => [...prev, { ...newAsset, id }])
        toast.success("Fixed asset added successfully")
      }
    } catch (error) {
      console.error("Error adding asset:", error)
      toast.error("Failed to add fixed asset")
    }
  }

  const updateAsset = async (updated: FixedAsset) => {
    try {
      const { id, ...data } = updated
      if (id && (await updateFixedAsset(id, data))) {
        setFixedAssets((prev) => prev.map((a) => (a.id === id ? updated : a)))
        toast.success("Fixed asset updated successfully")
      }
    } catch (error) {
      console.error("Error updating asset:", error)
      toast.error("Failed to update fixed asset")
    }
  }

  const deleteAsset = async (id: string) => {
    try {
      if (await deleteFixedAsset(id)) {
        setFixedAssets((prev) => prev.filter((a) => a.id !== id))
        toast.success("Fixed asset deleted successfully")
      }
    } catch (error) {
      console.error("Error deleting asset:", error)
      toast.error("Failed to delete fixed asset")
    }
  }

  // Consumables CRUD with Firebase
  const addConsumable = async (item: Omit<ConsumableItem, "id" | "inventoryValue" | "status">) => {
    try {
      const inventoryValue = item.unitPrice * item.quantity
      const status = computeStatus(item.quantity, item.reorderLevel)

      const formattedId = generateNextConsumableId()

      const newItem = { ...item, id: formattedId, inventoryValue, status }
      const success = await addConsumableToDb(newItem)

      if (success) {
        setConsumables((prev) => [...prev, newItem])
        toast.success("Consumable added successfully")
      }
    } catch (error) {
      console.error("Error adding consumable:", error)
      toast.error("Failed to add consumable")
    }
  }

  const updateConsumable = async (updated: ConsumableItem) => {
    try {
      const inventoryValue = updated.unitPrice * updated.quantity
      const status = computeStatus(updated.quantity, updated.reorderLevel)

      const { id, ...data } = { ...updated, inventoryValue, status }
      if (id && (await updateConsumableInDb(id, data))) {
        setConsumables((prev) => prev.map((i) => (i.id === id ? { ...updated, inventoryValue, status } : i)))
        toast.success("Consumable updated successfully")
      }
    } catch (error) {
      console.error("Error updating consumable:", error)
      toast.error("Failed to update consumable")
    }
  }

  const deleteConsumable = async (id: string) => {
    try {
      if (await deleteConsumableFromDb(id)) {
        setConsumables((prev) => prev.filter((i) => i.id !== id))
        toast.success("Consumable deleted successfully")
      }
    } catch (error) {
      console.error("Error deleting consumable:", error)
      toast.error("Failed to delete consumable")
    }
  }

 const addIssuedItem = async (item: Omit<IssuedItem, "id">) => {
  try {
    const newItem: IssuedItem = {
      ...item,
      id: generateNextIssuedItemId(),
    }

    // Deduct quantity from consumable
    const consumable = consumables.find((c) => c.id === item.consumableId)
    if (consumable) {
      const updatedQuantity = consumable.quantity - item.quantityIssued
      const status = computeStatus(updatedQuantity, consumable.reorderLevel)

      const updated = {
        ...consumable,
        quantity: updatedQuantity,
        inventoryValue: consumable.unitPrice * updatedQuantity,
        status,
      }
      await updateConsumable(updated)
    }

    // Save to Firebase
    const success = await addIssuedItemToDb(newItem)
    if (success) {
      setIssuedItems((prev) => [...prev, newItem])
      toast.success("Item issued successfully")
    }
  } catch (error) {
    console.error("Error issuing item:", error)
    toast.error("Failed to issue item")
  }
}

const addMultipleIssuedItems = async (
  issuedTo: string,
  department: string,
  dateIssued: string,
  items: MultiItemEntry[]
) => {
  try {
    const newItems: IssuedItem[] = []
    const itemIds: string[] = []

    // Create individual issued items for each consumable
    for (let i = 0; i < items.length; i++) {
      const entry = items[i]
      
      // Generate unique ID by getting the next available number and adding index
      const baseNum = issuedItems
        .map((item) => {
          const idStr = String(item.id || "")
          return Number(idStr.replace("ISSUE-", ""))
        })
        .filter((n) => !isNaN(n))
      const nextNum = (baseNum.length ? Math.max(...baseNum) : 0) + 1 + i
      const itemId = `ISSUE-${String(nextNum).padStart(3, "0")}`
      
      itemIds.push(itemId)
      
      const newItem: IssuedItem = {
        id: itemId,
        consumableId: entry.consumableId,
        consumableName: entry.consumableName,
        issuedTo,
        department,
        dateIssued,
        quantityIssued: entry.quantityIssued,
        isMultiItem: true,
        multiItemIds: itemIds,
      }

      newItems.push(newItem)

      // Deduct quantity from consumable
      const consumable = consumables.find((c) => c.id === entry.consumableId)
      if (consumable) {
        const updatedQuantity = consumable.quantity - entry.quantityIssued
        const status = computeStatus(updatedQuantity, consumable.reorderLevel)

        const updated = {
          ...consumable,
          quantity: updatedQuantity,
          inventoryValue: consumable.unitPrice * updatedQuantity,
          status,
        }
        await updateConsumable(updated)
      }
    }

    // Update all items with the complete multiItemIds array
    const updatedItems = newItems.map(item => ({
      ...item,
      multiItemIds: itemIds
    }))

    // Save all items to Firebase
    for (const item of updatedItems) {
      await addIssuedItemToDb(item)
    }

    setIssuedItems((prev) => [...prev, ...updatedItems])
    toast.success(`${items.length} items issued successfully`)
  } catch (error) {
    console.error("Error issuing multiple items:", error)
    toast.error("Failed to issue multiple items")
  }
}

const deleteIssuedItem = async (id: string) => {
  try {
    const itemToDelete = issuedItems.find((i) => i.id === id)

    if (itemToDelete) {
      // Return quantity back to consumable
      const consumable = consumables.find((c) => c.id === itemToDelete.consumableId)
      if (consumable) {
        const updatedQuantity = consumable.quantity + itemToDelete.quantityIssued
        const status = computeStatus(updatedQuantity, consumable.reorderLevel)

        const updated = {
          ...consumable,
          quantity: updatedQuantity,
          inventoryValue: consumable.unitPrice * updatedQuantity,
          status,
        }
        await updateConsumable(updated)
      }

      // Delete from Firebase
      const success = await deleteIssuedItemFromDb(id)
      if (success) {
        setIssuedItems((prev: any[]) => prev.filter((i) => i.id !== id))
        // Don't show toast here - it's shown in the onClick handler
      }
    }
  } catch (error) {
    console.error("Error deleting issued item:", error)
    toast.error("Failed to delete issued item")
  }
}

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  const isDateInRange = (dateStr: string, fromDate: string, toDate: string): boolean => {
    if (!dateStr) return true
    if (!fromDate && !toDate) return true

    const date = parseLocalDate(dateStr)

    const from = fromDate ? parseLocalDate(fromDate) : null
    const to = toDate ? parseLocalDate(toDate) : null

    if (to) {
      to.setHours(23, 59, 59, 999)
    }

    if (from && to) {
      return date >= from && date <= to
    }

    if (from) {
      return date >= from
    }

    if (to) {
      return date <= to
    }

    return true
  }

  const filteredFixedAssets = fixedAssets
    .filter((a) => assetClassFilter === "All" || a.assetClass === assetClassFilter)
    .filter((a) => assetStatusFilter === "All" || a.status === assetStatusFilter)
    .filter((a) => isDateInRange(a.dateAcquired, assetDateFrom, assetDateTo))
    .filter((a) => {
      if (!assetSearchQuery) return true
      const query = assetSearchQuery.toLowerCase()
      return (
        a.assetNumber.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query) ||
        a.serial.toLowerCase().includes(query) ||
        a.assetClass.toLowerCase().includes(query)
      )
    })
    .slice()
    .sort((a, b) => {
      const aNum = Number(a.assetNumber.replace("FA-", ""))
      const bNum = Number(b.assetNumber.replace("FA-", ""))
      return assetSortAsc ? aNum - bNum : bNum - aNum
    })

  const filteredConsumables = showOnlyReorder
    ? consumables.filter((i) => i.quantity <= i.reorderLevel && !i.discontinued)
    : consumables

  const consumableCategories = ["All", ...Array.from(new Set(consumables.map((i) => i.description).filter(Boolean)))]

 const displayedConsumables = filteredConsumables
  .filter((i) => consumableCategoryFilter === "All" || i.description === consumableCategoryFilter)
  .filter((i) => {
    const dateField = i.datePurchased || ""
    return isDateInRange(dateField, consumableDateFrom, consumableDateTo)
  })
  .filter((i) => {
    if (!consumableSearchQuery) return true
    const query = consumableSearchQuery.toLowerCase()
    return (
      (i.id && i.id.toLowerCase().includes(query)) ||
      i.name.toLowerCase().includes(query) ||
      i.description.toLowerCase().includes(query)
    )
  })
  .slice()
  .sort((a, b) => {
    if (consumableSortOrder === "asc") {
      return a.name.localeCompare(b.name)
    }
    if (consumableSortOrder === "desc") {
      return b.name.localeCompare(a.name)
    }
    // default: sort by description
    return a.description.localeCompare(b.description)
  })

  const issuedItemCategories = [
    "All",
    ...Array.from(
      new Set(
        issuedItems
          .map((i) => {
            const consumable = consumables.find((c) => c.id === i.consumableId)
            return consumable?.description
          })
          .filter(Boolean),
      ),
    ),
  ]

  const displayedIssuedItems = issuedItems
    .filter((i) => {
      const consumable = consumables.find((c) => c.id === i.consumableId)
      return issuedItemCategoryFilter === "All" || consumable?.description === issuedItemCategoryFilter
    })
    .filter((i) => isDateInRange(i.dateIssued, issuedItemDateFrom, issuedItemDateTo))
    .filter((i) => {
      if (!issuedItemSearchQuery) return true
      const query = issuedItemSearchQuery.toLowerCase()
      return (
        i.consumableName.toLowerCase().includes(query) ||
        i.issuedTo.toLowerCase().includes(query) ||
        i.department.toLowerCase().includes(query)
      )
    })

  const clearAssetDateFilter = () => {
    setAssetDateFrom("")
    setAssetDateTo("")
  }

  const clearConsumableDateFilter = () => {
    setConsumableDateFrom("")
    setConsumableDateTo("")
  }

  const clearIssuedItemDateFilter = () => {
    setIssuedItemDateFrom("")
    setIssuedItemDateTo("")
  }

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading inventory....</div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div
        className={`sticky top-0 z-50 bg-white border-b transition-all duration-300 ${isScrolled ? "py-2" : "py-4"}`}
      >
        <h1 className={`font-display font-bold ${isScrolled ? "text-xl" : "text-3xl"}`}>Inventory Management</h1>
      </div>

      <div className="flex gap-4 border-b overflow-x-auto">
        {["fixed-assets", "consumables", "issued-items"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setEditingAsset(null)
              setEditingConsumable(null)
              setEditingIssuedItem(null)
              setActiveTab(tab as InventoryTab)
            }}
            className={`px-4 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab === "fixed-assets" ? "Fixed Assets" : tab === "consumables" ? "Consumables" : "Issued Items"}
          </button>
        ))}
      </div>

      {/* ... existing fixed-assets tab ... */}
      {activeTab === "fixed-assets" && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <h2 className="font-bold text-xl">Fixed Assets</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                  className="border p-2 pl-10 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
              <select
                value={assetClassFilter}
                onChange={(e) => setAssetClassFilter(e.target.value)}
                className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Classes</option>
                {ASSET_CLASS_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
              <select
                value={assetStatusFilter}
                onChange={(e) => setAssetStatusFilter(e.target.value)}
                className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Statuses</option>
                {ASSET_STATUS_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
              <Button
                variant="ghost"
                onClick={() => setShowAssetDateFilter(!showAssetDateFilter)}
                className={showAssetDateFilter ? "bg-blue-50" : ""}
              >
                <Calendar size={16} className="mr-1" />
                Date Filter
              </Button>
              <Button variant="ghost" onClick={() => setAssetSortAsc((s) => !s)}>
                {assetSortAsc ? "Sort: FA ↑" : "Sort: FA ↓"}
              </Button>
              <Button
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white bg-transparent"
                onClick={() => generatePDF("fixed-assets", filteredFixedAssets, [], [])}
              >
                Export PDF
              </Button>
              <Button
                onClick={() => {
                  setShowAssetForm(true)
                  setEditingAsset(null)
                }}
              >
                <Plus size={18} className="mr-1" /> New Asset
              </Button>
            </div>
          </div>

          {showAssetDateFilter && (
            <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">From:</label>
                  <input
                    type="date"
                    value={assetDateFrom}
                    onChange={(e) => setAssetDateFrom(e.target.value)}
                    className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">To:</label>
                  <input
                    type="date"
                    value={assetDateTo}
                    onChange={(e) => setAssetDateTo(e.target.value)}
                    className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAssetDateFilter}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X size={16} className="mr-1" /> Clear
                </Button>
                {(assetDateFrom || assetDateTo) && (
                  <span className="text-sm text-gray-600">
                    Showing {filteredFixedAssets.length} asset{filteredFixedAssets.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </Card>
          )}

          {showAssetForm && (
            <AssetForm
              onClose={() => setShowAssetForm(false)}
              onSave={editingAsset ? updateAsset : addAsset}
              defaultValues={editingAsset}
              generateNextAssetNumber={generateNextAssetNumber}
              assetClassOptions={ASSET_CLASS_OPTIONS}
            />
          )}

          <div className="shadow-md rounded-lg overflow-x-auto max-h-125 overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-linear-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Asset #</th>
                  <th className="px-4 py-3 text-left font-semibold">Asset Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Serial #</th>
                  <th className="px-4 py-3 text-center font-semibold">Functioning</th>
                  <th className="px-4 py-3 text-center font-semibold">Non-functioning</th>
                  <th className="px-4 py-3 text-center font-semibold">Quantity</th>
                  <th className="px-4 py-3 text-left font-semibold">Date Purchased</th>
                  <th className="px-4 py-3 text-right font-semibold">Acquisition Cost</th>
                  <th className="px-4 py-3 text-left font-semibold">Asset Class</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFixedAssets.map((asset, idx) => {
                  const color = getStatusColor(asset.status)
                  const totalQuantity = (Number(asset.qtyFunctioning) || 0) + (Number(asset.qtyNotFunctioning) || 0)

                  return (
                    <tr
                      key={asset.id}
                      className={`border-t transition-colors ${
                        idx % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-blue-50 hover:bg-blue-100"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-blue-700">{asset.assetNumber}</td>
                      <td className="px-4 py-3">{asset.name}</td>
                      <td className="px-4 py-3 text-gray-600">{asset.serial}</td>
                      <td className="px-4 py-3 text-center">{Number(asset.qtyFunctioning) || 0}</td>
                      <td className="px-4 py-3 text-center">{Number(asset.qtyNotFunctioning) || 0}</td>
                      <td className="px-4 py-3 text-center font-semibold">{totalQuantity}</td>
                      <td className="px-4 py-3">{asset.dateAcquired}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">
                        ₱{Number(asset.acquisitionCost || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{asset.assetClass}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: color.bg, color: color.text }}
                        >
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingAsset(asset)
                              setShowAssetForm(true)
                            }}
                            className="p-2 hover:bg-blue-100 rounded transition-colors"
                            title="Edit asset"
                          >
                            <Edit2 size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (!asset.id) return;

                              const confirmDelete = window.confirm("Are you sure you want to delete this asset?");
                              if (confirmDelete) {
                                deleteAsset(asset.id);
                              }
                            }}
                            className="p-2 hover:bg-red-100 rounded transition-colors"
                            title="Delete asset"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Fixed Assets Totals */}
            <div className="mt-2 bg-gray-50 p-3 rounded-b-lg flex justify-between items-center shadow-inner">
              <span className="text-sm font-medium text-gray-700">
                Total Records: <span className="font-bold">{filteredFixedAssets.length}</span>
              </span>
              <span className="text-sm font-medium text-gray-700">
                Total Value:{" "}
                <span className="font-bold text-green-700">
                  ₱{filteredFixedAssets.reduce((sum, a) => sum + (Number(a.acquisitionCost) || 0), 0).toLocaleString()}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

{/* ... existing consumables tab ... */}
{activeTab === "consumables" && (
  <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
      <h2 className="font-bold text-xl">Consumables</h2>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search items..."
            value={consumableSearchQuery}
            onChange={(e) => setConsumableSearchQuery(e.target.value)}
            className="border p-2 pl-10 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
          />
        </div>

        {/* Dropdown for Alphabetical Filter */}
        <select
          value={consumableSortOrder}
          onChange={(e) => setConsumableSortOrder(e.target.value as "none" | "asc" | "desc")}
          className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="none">Sort: None</option>
          <option value="asc">Sort: A → Z</option>
          <option value="desc">Sort: Z → A</option>
        </select>

        <select
          value={consumableCategoryFilter}
          onChange={(e) => setConsumableCategoryFilter(e.target.value)}
          className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {consumableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <Button
          variant="ghost"
          onClick={() => setShowConsumableDateFilter(!showConsumableDateFilter)}
          className={showConsumableDateFilter ? "bg-blue-50" : ""}
        >
          <Calendar size={16} className="mr-1" />
          Date Filter
        </Button>

        <Button
          variant="ghost"
          onClick={() => setShowOnlyReorder((r) => !r)}
          className={showOnlyReorder ? "bg-red-50" : ""}
        >
          <Filter size={16} className="mr-1" />
          {showOnlyReorder ? "Show All" : "Reorder Only"}
        </Button>

        <Button
          variant="outline"
          className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white bg-transparent"
          onClick={() => generatePDF("consumables", [], displayedConsumables, [])}
        >
          Export PDF
        </Button>

        <Button
          onClick={() => {
            setShowConsumableForm(true)
            setEditingConsumable(null)
          }}
        >
          <Plus size={18} className="mr-1" /> New Item
        </Button>
      </div>
    </div>

          {showConsumableDateFilter && (
            <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">From:</label>
                  <input
                    type="date"
                    value={consumableDateFrom}
                    onChange={(e) => setConsumableDateFrom(e.target.value)}
                    className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">To:</label>
                  <input
                    type="date"
                    value={consumableDateTo}
                    onChange={(e) => setConsumableDateTo(e.target.value)}
                    className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearConsumableDateFilter}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X size={16} className="mr-1" /> Clear
                </Button>
                {(consumableDateFrom || consumableDateTo) && (
                  <span className="text-sm text-gray-600">
                    Showing {displayedConsumables.length} item{displayedConsumables.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </Card>
          )}

          {showConsumableForm && (
            <ConsumableForm
              onClose={() => setShowConsumableForm(false)}
              onSave={editingConsumable ? updateConsumable : addConsumable}
              defaultValues={editingConsumable}
            />
          )}

          <div className="shadow-md rounded-lg overflow-x-auto max-h-125 overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 bg-linear-to-r from-blue-500 to-blue-600 text-white">
                  <th className="px-4 py-3 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-right font-semibold">Unit Price</th>
                  <th className="px-4 py-3 text-center font-semibold">Qty in Stock</th>
                  <th className="px-4 py-3 text-right font-semibold">Inventory Value</th>
                  <th className="px-4 py-3 text-center font-semibold">Reorder Level</th>
                  <th className="px-4 py-3 text-center font-semibold">Qty in Reorder</th>
                  <th className="px-4 py-3 text-center font-semibold">Date Purchased</th>
                  <th className="px-4 py-3 text-center font-semibold">Discontinued</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedConsumables.map((item, idx) => {
                  const needsReorder = item.quantity <= item.reorderLevel && !item.discontinued
                  const rowClass =
                    highlightReorder && needsReorder
                      ? item.quantity === 0
                        ? "bg-red-200 hover:bg-red-300"
                        : "bg-yellow-100 hover:bg-yellow-200"
                      : idx % 2 === 0
                        ? "bg-white hover:bg-blue-50"
                        : "bg-blue-50 hover:bg-blue-100"

                  return (
                    <tr key={item.id} className={`border-t transition-colors ${rowClass}`}>
                      <td className="px-4 py-3 font-medium text-blue-700">{item.id}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 text-right">₱{item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">
                        ₱{item.inventoryValue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">{item.reorderLevel}</td>
                      <td className="px-4 py-3 text-center">{item.reorderTime}</td>
                      <td className="px-4 py-3 text-center">{item.datePurchased}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.discontinued ? "bg-gray-200 text-gray-700" : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item.discontinued ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: getStatusColor(item.status).bg,
                            color: getStatusColor(item.status).text,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingConsumable(item)
                              setShowConsumableForm(true)
                            }}
                            className="p-2 hover:bg-blue-100 rounded transition-colors"
                            title="Edit item"
                          >
                            <Edit2 size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (!item.id) return;

                              const confirmDelete = window.confirm("Are you sure you want to delete this item?");
                              if (confirmDelete) {
                                deleteConsumable(item.id);
                              }
                            }}
                            className="p-2 hover:bg-red-100 rounded transition-colors"
                            title="Delete item"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Consumables Totals */}
            <div className="mt-2 bg-gray-50 p-3 rounded-b-lg flex justify-between items-center shadow-inner">
              <span className="text-sm font-medium text-gray-700">
                Total Records: <span className="font-bold">{displayedConsumables.length}</span>
              </span>
              <span className="text-sm font-medium text-gray-700">
                Total Value:{" "}
                <span className="font-bold text-green-700">
                  ₱{displayedConsumables.reduce((sum, i) => sum + (i.inventoryValue || 0), 0).toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "issued-items" && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <h2 className="font-bold text-xl">Issued Items</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search issued items..."
                  value={issuedItemSearchQuery}
                  onChange={(e) => setIssuedItemSearchQuery(e.target.value)}
                  className="border p-2 pl-10 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
              <select
                value={issuedItemCategoryFilter}
                onChange={(e) => setIssuedItemCategoryFilter(e.target.value)}
                className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {issuedItemCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                onClick={() => setShowIssuedItemDateFilter(!showIssuedItemDateFilter)}
                className={showIssuedItemDateFilter ? "bg-blue-50" : ""}
              >
                <Calendar size={16} className="mr-1" />
                Date Filter
              </Button>
              <Button
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white bg-transparent"
                onClick={() => generatePDF("issued-items", [], [], displayedIssuedItems)}
              >
                Export PDF
              </Button>
              <Button
              onClick={() => {
                setShowMultiItemForm(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={18} className="mr-1" /> Issue Multiple Items
            </Button>
            <Button
              onClick={() => {
                setShowIssuedItemForm(true)
                setEditingIssuedItem(null)
              }}
            >
              <Plus size={18} className="mr-1" /> Issue Single Item
            </Button>
            </div>
          </div>

          {showIssuedItemDateFilter && (
            <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">From:</label>
                  <input
                    type="date"
                    value={issuedItemDateFrom}
                    onChange={(e) => setIssuedItemDateFrom(e.target.value)}
                    className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">To:</label>
                  <input
                    type="date"
                    value={issuedItemDateTo}
                    onChange={(e) => setIssuedItemDateTo(e.target.value)}
                    className="border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearIssuedItemDateFilter}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X size={16} className="mr-1" /> Clear
                </Button>
                {(issuedItemDateFrom || issuedItemDateTo) && (
                  <span className="text-sm text-gray-600">
                    Showing {displayedIssuedItems.length} item{displayedIssuedItems.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </Card>
          )}

          {showIssuedItemForm && (
            <IssuedItemForm
              onClose={() => setShowIssuedItemForm(false)}
              onSave={editingIssuedItem ? deleteIssuedItem : addIssuedItem}
              defaultValues={editingIssuedItem}
              consumables={consumables}
            />
          )}

          {showMultiItemForm && (
            <MultiItemForm
              onClose={() => setShowMultiItemForm(false)}
              onSave={addMultipleIssuedItems}
              consumables={consumables}
            />
          )}

          <div className="shadow-md rounded-lg overflow-x-auto max-h-125 overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-linear-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Item</th>
                  <th className="px-4 py-3 text-left font-semibold">Issued To</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-center font-semibold">Date Issued</th>
                  <th className="px-4 py-3 text-center font-semibold">Quantity Issued</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
             <tbody>
                {displayedIssuedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-t transition-colors ${
                      idx % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-blue-50 hover:bg-blue-100"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-blue-700">
                      {item.consumableName}
                      {item.isMultiItem && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          Multi-Item
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{item.issuedTo}</td>
                    <td className="px-4 py-3">{item.department}</td>
                    <td className="px-4 py-3 text-center">{item.dateIssued}</td>
                    <td className="px-4 py-3 text-center font-semibold">{item.quantityIssued}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingIssuedItem(item)
                            setShowIssuedItemForm(true)
                          }}
                          className="p-2 hover:bg-blue-100 rounded transition-colors"
                          title="Edit item"
                          disabled={item.isMultiItem}
                        >
                          <Edit2 size={16} className={item.isMultiItem ? "text-gray-400" : "text-blue-600"} />
                        </button>
                        <button
                          onClick={() => {
                            if (!item.id) return;

                            const confirmDelete = window.confirm("Are you sure you want to delete this issued item?");
                            if (confirmDelete) {
                              deleteIssuedItem(item.id);
                              toast.success("Item deleted successfully");
                            }
                          }}
                          className="p-2 hover:bg-red-100 rounded transition-colors"
                          title="Delete item"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>  
       
            {/* Issued Items Totals */}
            <div className="mt-2 bg-gray-50 p-3 rounded-b-lg flex justify-between items-center shadow-inner">
              <span className="text-sm font-medium text-gray-700">
                Total Records: <span className="font-bold">{displayedIssuedItems.length}</span>
              </span>
              <span className="text-sm font-medium text-gray-700">
                Total Quantity Issued:{" "}
                <span className="font-bold text-blue-700">
                  {displayedIssuedItems.reduce((sum, i) => sum + i.quantityIssued, 0)}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ... existing form components ...

function AssetForm({
  onClose,
  onSave,
  defaultValues,
  generateNextAssetNumber,
  assetClassOptions,
}: {
  onClose: () => void
  onSave: (asset: any) => void
  defaultValues?: FixedAsset | null
  generateNextAssetNumber: () => string
  assetClassOptions: string[]
}) {
  const isEdit = Boolean(defaultValues?.id)

  const [form, setForm] = useState({
    name: defaultValues?.name || "",
    serial: defaultValues?.serial || "",
    category: defaultValues?.category || "",
    location: defaultValues?.location || "",
    status: defaultValues?.status || "Operational",
    dateAcquired: defaultValues?.dateAcquired || "",
    acquisitionCost: defaultValues?.acquisitionCost ? String(defaultValues.acquisitionCost) : "",
    assetClass: defaultValues?.assetClass || "",
    assetNumber: defaultValues?.assetNumber || "",
    qtyFunctioning: defaultValues?.qtyFunctioning || 0,
    qtyNotFunctioning: defaultValues?.qtyNotFunctioning || 0,
  })

  const [dynamicClasses, setDynamicClasses] = useState<string[]>(assetClassOptions)
  const [showAddClass, setShowAddClass] = useState(false)
  const [newClassName, setNewClassName] = useState("")

  const previewAssetNumber = isEdit ? form.assetNumber : generateNextAssetNumber()

  const handleChange = (e: any) => {
    const { name, value, type } = e.target
    setForm((prev) => ({ ...prev, [name]: type === "number" ? Number(value) : value }))
  }

  const handleSubmit = () => {
    const prepared = {
      ...form,
      acquisitionCost: Number(form.acquisitionCost || 0),
      assetNumber: isEdit ? form.assetNumber : form.assetNumber.trim() !== "" ? form.assetNumber : previewAssetNumber,
    }

    if (isEdit) {
      onSave({ id: defaultValues!.id, ...prepared })
    } else {
      onSave(prepared)
    }

    onClose()
  }

  return (
    <Card className="p-6 mb-4 bg-blue-100">
      <h3 className="font-bold text-lg mb-3">{isEdit ? "Edit Asset" : "Add Asset"}</h3>

      <div className="grid grid-cols-2 gap-4">
        <input
          name="assetNumber"
          value={form.assetNumber || previewAssetNumber}
          onChange={handleChange}
          className="border p-2 rounded bg-white"
          placeholder="Asset #"
        />
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="border p-2 rounded bg-white"
          placeholder="Asset Name"
        />
        <input
          name="serial"
          value={form.serial}
          onChange={handleChange}
          className="border p-2 rounded bg-white"
          placeholder="Serial #"
        />
        <input
          name="qtyFunctioning"
          type=""
          value={form.qtyFunctioning}
          onChange={handleChange}
          className="border p-2 rounded bg-white"
          placeholder="Qty Functioning"
        />
        <input
          name="qtyNotFunctioning"
          type=""
          value={form.qtyNotFunctioning}
          onChange={handleChange}
          className="border p-2 rounded bg-white"
          placeholder="Qty Non-functioning"
        />

        <input
          type="number"
          value={Number(form.qtyFunctioning || 0) + Number(form.qtyNotFunctioning || 0)}
          readOnly
          className="border p-2 rounded bg-gray-100"
          placeholder="Total Quantity"
        />

        <input
          type="date"
          name="dateAcquired"
          value={form.dateAcquired}
          onChange={handleChange}
          className="border p-2 rounded bg-white"
        />

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              name="assetClass"
              value={form.assetClass}
              onChange={handleChange}
              className="border p-2 rounded flex-1 bg-white"
            >
              <option value="">Select Asset Class</option>
              {dynamicClasses.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>

            <Button variant="outline" onClick={() => setShowAddClass(true)}>
              Add Class
            </Button>
          </div>

          {showAddClass && (
            <div className="flex gap-2 mt-1 items-center">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Enter new class"
                className="border p-2 rounded flex-1 bg-white"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (newClassName.trim() && !dynamicClasses.includes(newClassName.trim())) {
                    setDynamicClasses((prev) => [...prev, newClassName.trim()])
                    setForm((prev) => ({ ...prev, assetClass: newClassName.trim() }))
                    setNewClassName("")
                    setShowAddClass(false)
                  }
                }}
              >
                Add
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setNewClassName("")
                  setShowAddClass(false)
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        <select name="status" value={form.status} onChange={handleChange} className="border p-2 rounded bg-white">
          <option value="Operational">Operational</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Non-operational">Non-operational</option>
        </select>

        <input
          type=""
          name="acquisitionCost"
          value={form.acquisitionCost}
          onChange={handleChange}
          className="border p-2 rounded bg-white"
          placeholder="Acquisition Cost"
        />
      </div>

      <div className="flex gap-3 mt-4">
        <Button onClick={handleSubmit}>Save</Button>
        <Button variant="secondary" onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
          Cancel
        </Button>
      </div>
    </Card>
  )
}

function ConsumableForm({
  onClose,
  onSave,
  defaultValues,
}: {
  onClose: () => void
  onSave: (item: any) => void
  defaultValues?: ConsumableItem | null
}) {
  const isEdit = Boolean(defaultValues?.id)

  const DEFAULT_CATEGORIES = ["Medical materials", "Office Supplies"]

  const [form, setForm] = useState({
    name: defaultValues?.name || "",
    category: defaultValues?.description || "",
    unitPrice: defaultValues?.unitPrice !== undefined ? String(defaultValues.unitPrice) : "",
    quantity: defaultValues?.quantity !== undefined ? String(defaultValues.quantity) : "",
    reorderLevel: defaultValues?.reorderLevel !== undefined ? String(defaultValues.reorderLevel) : "",
    datePurchased: defaultValues?.datePurchased || "",
    quantityReorder: defaultValues?.reorderTime !== undefined ? String(defaultValues.reorderTime) : "",
    discontinued: defaultValues?.discontinued ?? false,
  })

  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const computeLocalStatus = (quantity: number, reorderLevel: number) => {
    if (quantity === 0) return "Out of Stock"
    if (quantity <= reorderLevel) return "Low Stock"
    return "In Stock"
  }

  const handleSubmit = () => {
    const numeric = {
      unitPrice: Number(form.unitPrice || 0),
      quantity: Number(form.quantity || 0),
      reorderLevel: Number(form.reorderLevel || 0),
      quantityReorder: Number(form.quantityReorder || 0),
    }

    const prepared = {
      ...form,
      description: form.category,
      ...numeric,
      reorderTime: numeric.quantityReorder,
      inventoryValue: numeric.unitPrice * numeric.quantity,
      status: computeLocalStatus(numeric.quantity, numeric.reorderLevel),
    }

    if (isEdit) {
      onSave({ id: defaultValues!.id, ...prepared })
    } else {
      const { inventoryValue, status, ...raw } = prepared
      onSave(raw)
    }

    onClose()
  }

  return (
    <Card className="p-6 mb-4 bg-blue-100">
      <h3 className="font-bold text-lg mb-3">{isEdit ? "Edit Consumable" : "Add Consumable"}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="mb-1 font-medium">Item Name</label>
          <input name="name" value={form.name} onChange={handleChange} className="border p-2 rounded bg-white" />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Category</label>
          <div className="flex gap-2">
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="border p-2 rounded flex-1 bg-white"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
            <Button variant="outline" onClick={() => setShowAddCategory(true)}>
              Add
            </Button>
          </div>

          {showAddCategory && (
            <div className="flex gap-2 mt-1 items-center">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter new category"
                className="border p-2 rounded flex-1 bg-white"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const trimmed = newCategoryName.trim()
                  if (trimmed && !categories.includes(trimmed)) {
                    setCategories((prev) => [...prev, trimmed])
                    setForm((prev) => ({ ...prev, category: trimmed }))
                    setNewCategoryName("")
                    setShowAddCategory(false)
                  }
                }}
              >
                Add
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setNewCategoryName("")
                  setShowAddCategory(false)
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Unit Price</label>
          <input
            name="unitPrice"
            type="number"
            value={form.unitPrice}
            onChange={handleChange}
            className="border p-2 rounded bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Quantity in Stock</label>
          <input
            name="quantity"
            type="number"
            value={form.quantity}
            onChange={handleChange}
            className="border p-2 rounded bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Inventory Value</label>
          <input
            disabled
            className="border p-2 rounded bg-gray-50"
            value={(Number(form.unitPrice || 0) * Number(form.quantity || 0)).toFixed(2)}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Reorder Level</label>
          <input
            name="reorderLevel"
            type="number"
            value={form.reorderLevel}
            onChange={handleChange}
            className="border p-2 rounded bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Date Purchased</label>
          <input
            name="datePurchased"
            type="date"
            value={form.datePurchased}
            onChange={handleChange}
            className="border p-2 rounded bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Quantity in Reorder</label>
          <input
            name="quantityReorder"
            type="number"
            value={form.quantityReorder}
            onChange={handleChange}
            className="border p-2 rounded bg-white"
          />
        </div>

        <div className="flex items-center mt-6">
          <input
            type="checkbox"
            name="discontinued"
            checked={form.discontinued}
            onChange={handleChange}
            className="mr-2"
          />
          <label className="font-medium">Discontinued?</label>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button onClick={handleSubmit}>Save</Button>
        <Button variant="secondary" onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
          Cancel
        </Button>
      </div>
    </Card>
  )
}

function IssuedItemForm({
  onClose,
  onSave,
  defaultValues,
  consumables,
}: {
  onClose: () => void
  onSave: (item: any) => void
  defaultValues?: IssuedItem | null
  consumables: ConsumableItem[]
}) {
  const isEdit = Boolean(defaultValues?.id)

  const [form, setForm] = useState({
    consumableId: defaultValues?.consumableId || "",
    consumableName: defaultValues?.consumableName || "",
    issuedTo: defaultValues?.issuedTo || "",
    department: defaultValues?.department || "",
    dateIssued: defaultValues?.dateIssued || "",
    quantityIssued: defaultValues?.quantityIssued || 1,
  })

  const [consumableSearchQuery, setConsumableSearchQuery] = useState("")

  const handleChange = (e: any) => {
    const { name, value, type } = e.target

    if (name === "consumableId") {
      const selected = consumables.find((c) => c.id === value)
      setForm((prev) => ({
        ...prev,
        consumableId: value,
        consumableName: selected?.name || "",
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }))
    }
  }

  const handleSubmit = () => {
    if (!form.consumableId || !form.issuedTo || !form.department || !form.dateIssued || !form.quantityIssued) {
      alert("Please fill in all fields")
      return
    }

    if (isEdit) {
      onSave({
        id: defaultValues!.id,
        ...form,
      })
    } else {
      onSave({
        ...form,
      })
    }

    onClose()
  }

  const selectedConsumable = consumables.find((c) => c.id === form.consumableId)
  const availableQuantity = selectedConsumable?.quantity || 0

  // Filter and sort consumables alphabetically by name
  const filteredAndSortedConsumables = consumables
    .filter((c) => {
      if (!consumableSearchQuery) return true
      const query = consumableSearchQuery.toLowerCase()
      return (
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        (c.id && c.id.toLowerCase().includes(query))
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Card className="p-6 mb-4 bg-blue-100">
      <h3 className="font-bold text-lg mb-3">{isEdit ? "Edit Issued Item" : "Issue Item"}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="mb-1 font-medium">Select Item *</label>
          
          {/* Search input for consumables */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search consumables..."
              value={consumableSearchQuery}
              onChange={(e) => setConsumableSearchQuery(e.target.value)}
              className="border p-2 pl-10 rounded w-full bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            name="consumableId"
            value={form.consumableId}
            onChange={handleChange}
            className="border p-2 rounded bg-white"
          >
            <option value="">Select a consumable...</option>
            {filteredAndSortedConsumables.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Available: {c.quantity})
              </option>
            ))}
          </select>
          {consumableSearchQuery && (
            <p className="text-xs text-gray-500 mt-1">
              Showing {filteredAndSortedConsumables.length} of {consumables.length} items
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Item Name</label>
          <input
            type="text"
            value={form.consumableName}
            readOnly
            className="border p-2 rounded bg-gray-50"
            placeholder="Auto-filled"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Issued To *</label>
          <input
            name="issuedTo"
            value={form.issuedTo}
            onChange={handleChange}
            className="border p-2 rounded bg-white"
            placeholder="Name of person"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Department *</label>
          <input
            name="department"
            value={form.department}
            onChange={handleChange}
            className="border p-2 rounded bg-white"
            placeholder="Department"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Date Issued *</label>
          <input
            type="date"
            name="dateIssued"
            value={form.dateIssued}
            onChange={handleChange}
            className="border p-2 rounded bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Quantity Issued * (Available: {availableQuantity})</label>
          <input
            name="quantityIssued"
            type="number"
            value={form.quantityIssued}
            onChange={handleChange}
            min="1"
            max={availableQuantity}
            className="border p-2 rounded bg-white"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button onClick={handleSubmit}>Save</Button>
        <Button variant="secondary" onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
          Cancel
        </Button>
      </div>
    </Card>
  )
}

function MultiItemForm({
  onClose,
  onSave,
  consumables,
}: {
  onClose: () => void
  onSave: (issuedTo: string, department: string, dateIssued: string, items: MultiItemEntry[]) => void
  consumables: ConsumableItem[]
}) {
  const [form, setForm] = useState({
    issuedTo: "",
    department: "",
    dateIssued: "",
  })

  const [items, setItems] = useState<MultiItemEntry[]>([])
  const [currentItem, setCurrentItem] = useState<MultiItemEntry>({
    consumableId: "",
    consumableName: "",
    quantityIssued: 1,
  })

  const [consumableSearchQuery, setConsumableSearchQuery] = useState("")

  const handleFormChange = (e: any) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (e: any) => {
    const { name, value, type } = e.target

    if (name === "consumableId") {
      const selected = consumables.find((c) => c.id === value)
      setCurrentItem((prev) => ({
        ...prev,
        consumableId: value,
        consumableName: selected?.name || "",
      }))
    } else {
      setCurrentItem((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }))
    }
  }

  const addItem = () => {
    if (!currentItem.consumableId || !currentItem.quantityIssued) {
      alert("Please select an item and quantity")
      return
    }

    const isDuplicate = items.some((i) => i.consumableId === currentItem.consumableId)
    if (isDuplicate) {
      alert("This item is already added")
      return
    }

    setItems((prev) => [...prev, { ...currentItem }])
    setCurrentItem({ consumableId: "", consumableName: "", quantityIssued: 1 })
    setConsumableSearchQuery("")
  }

  const removeItem = (consumableId: string) => {
    setItems((prev) => prev.filter((i) => i.consumableId !== consumableId))
  }

  const handleSubmit = () => {
    if (!form.issuedTo || !form.department || !form.dateIssued || items.length === 0) {
      alert("Please fill in all fields and add at least one item")
      return
    }

    onSave(form.issuedTo, form.department, form.dateIssued, items)
    onClose()
  }

  const selectedConsumable = consumables.find((c) => c.id === currentItem.consumableId)
  const availableQuantity = selectedConsumable?.quantity || 0

  // Filter and sort consumables alphabetically by name
  const filteredAndSortedConsumables = consumables
    .filter((c) => {
      if (!consumableSearchQuery) return true
      const query = consumableSearchQuery.toLowerCase()
      return (
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        (c.id && c.id.toLowerCase().includes(query))
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Card className="p-6 mb-4 bg-blue-100">
      <h3 className="font-bold text-lg mb-3">Issue Multiple Items</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col">
          <label className="mb-1 font-medium">Issued To *</label>
          <input
            name="issuedTo"
            value={form.issuedTo}
            onChange={handleFormChange}
            className="border p-2 rounded bg-white"
            placeholder="Name of person"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Department *</label>
          <input
            name="department"
            value={form.department}
            onChange={handleFormChange}
            className="border p-2 rounded bg-white"
            placeholder="Department"
          />
        </div>

        <div className="flex flex-col col-span-2">
          <label className="mb-1 font-medium">Date Issued *</label>
          <input
            type="date"
            name="dateIssued"
            value={form.dateIssued}
            onChange={handleFormChange}
            className="border p-2 rounded bg-white"
          />
        </div>
      </div>

      <div className="border-t pt-4 mb-4">
        <h4 className="font-semibold mb-3">Add Items</h4>

        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Select Item *</label>
            
            {/* Search input for consumables */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search consumables..."
                value={consumableSearchQuery}
                onChange={(e) => setConsumableSearchQuery(e.target.value)}
                className="border p-2 pl-10 rounded w-full bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              name="consumableId"
              value={currentItem.consumableId}
              onChange={handleItemChange}
              className="border p-2 rounded bg-white"
            >
              <option value="">Select a consumable...</option>
              {filteredAndSortedConsumables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Available: {c.quantity})
                </option>
              ))}
            </select>
            {consumableSearchQuery && (
              <p className="text-xs text-gray-500 mt-1">
                Showing {filteredAndSortedConsumables.length} of {consumables.length} items
              </p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-1 font-medium">Quantity * (Available: {availableQuantity})</label>
            <input
              name="quantityIssued"
              type="number"
              value={currentItem.quantityIssued}
              onChange={handleItemChange}
              min="1"
              max={availableQuantity}
              className="border p-2 rounded bg-white mt-9"
            />
          </div>

          <div className="flex items-end">
            <Button onClick={addItem} className="w-full mt-9">
              <Plus size={16} className="mr-1" /> Add Item
            </Button>
          </div>
        </div>

        {items.length > 0 && (
          <div>
            <h5 className="font-medium mb-2">Selected Items:</h5>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.consumableId} className="flex justify-between items-center bg-white p-2 rounded border">
                  <span>
                    {item.consumableName} - Qty: {item.quantityIssued}
                  </span>
                  <button
                    onClick={() => removeItem(item.consumableId)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <Button onClick={handleSubmit}>Save</Button>
        <Button variant="secondary" onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
          Cancel
        </Button>
      </div>
    </Card>
  )
}

// ================= PDF GENERATION =================

const generatePDF = (
  type: InventoryTab | string,
  assets: FixedAsset[],
  consumablesData: ConsumableItem[],
  issuedItemsData: IssuedItem[],
) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const headerHeight = 50
  const footerHeight = 30

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

  /* ================= TITLE & META ================= */
  const titleY = headerHeight + 5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(
    type === "fixed-assets"
      ? "Fixed Assets Inventory"
      : type === "consumables"
        ? "Consumables Inventory"
        : "Issued Items Report",
    pageWidth / 2,
    titleY,
    { align: "center" },
  )

  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 10, titleY + 8, { align: "right" })

  /* ================= TABLE HELPER ================= */
  const drawTable = (columns: string[], rows: any[][], totals?: { records: number; value?: number }) => {
    autoTable(doc, {
      startY: titleY + 15,
      head: [columns],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: headerHeight, bottom: footerHeight, left: 10, right: 10 },
      pageBreak: "auto",
      didDrawPage: () => {
        const pageNo = (doc as any).getNumberOfPages()
        addHeader()
        addFooter(pageNo, pageNo)
      },
    })

    if (!totals) return

    let finalY = (doc as any).lastAutoTable.finalY + 14

    if (finalY + 26 > pageHeight - footerHeight) {
      doc.addPage()
      addHeader()
      addFooter((doc as any).getNumberOfPages(), (doc as any).getNumberOfPages())
      finalY = headerHeight + 20
    }

    const boxWidth = 120
    const boxX = (pageWidth - boxWidth) / 2

    doc.setFillColor(245, 245, 245)
    doc.roundedRect(boxX, finalY - 10, boxWidth, 26, 4, 4, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(40)

    doc.text(`Total Records: ${totals.records}`, pageWidth / 2, finalY, { align: "center" })
    if (totals.value !== undefined) {
      doc.text(`Total Value: ₱${totals.value.toLocaleString()}`, pageWidth / 2, finalY + 12, { align: "center" })
    }
  }

  /* ================= DRAW TABLE ================= */
  if (type === "fixed-assets") {
    drawTable(
      [
        "Asset #",
        "Name",
        "Serial #",
        "Qty Functioning",
        "Qty Non-functioning",
        "Total Qty",
        "Date Acquired",
        "Acquisition Cost",
        "Asset Class",
        "Status",
      ],
      assets.map((a) => [
        a.assetNumber ?? "",
        a.name ?? "",
        a.serial ?? "",
        a.qtyFunctioning ?? 0,
        a.qtyNotFunctioning ?? 0,
        Number(a.qtyFunctioning ?? 0) + Number(a.qtyNotFunctioning ?? 0),
        a.dateAcquired ?? "",
        `₱${Number(a.acquisitionCost ?? 0).toLocaleString()}`,
        a.assetClass ?? "",
        a.status ?? "",
      ]),
      {
        records: assets.length,
        value: assets.reduce((sum, a) => sum + (Number(a.acquisitionCost) || 0), 0),
      },
    )
  } else if (type === "consumables") {
    drawTable(
      [
        "ID",
        "Name",
        "Category",
        "Unit Price",
        "Qty in Stock",
        "Inventory Value",
        "Reorder Level",
        "Qty in Reorder",
        "Date Purchased",
        "Discontinued",
        "Status",
      ],
      consumablesData.map((c) => [
        c.id ?? "",
        c.name ?? "",
        c.description ?? "",
        `₱${c.unitPrice?.toFixed(2) ?? "0.00"}`,
        c.quantity ?? 0,
        `₱${c.inventoryValue?.toFixed(2) ?? "0.00"}`,
        c.reorderLevel ?? 0,
        c.reorderTime ?? "",
        c.datePurchased ?? "",
        c.discontinued ? "Yes" : "No",
        c.status ?? "",
      ]),
      {
        records: consumablesData.length,
        value: consumablesData.reduce((sum, i) => sum + (i.inventoryValue || 0), 0),
      },
    )
  } else if (type === "issued-items") {
    drawTable(
      ["Item", "Issued To", "Department", "Date Issued", "Quantity Issued"],
      issuedItemsData.map((i) => [
        i.consumableName ?? "",
        i.issuedTo ?? "",
        i.department ?? "",
        i.dateIssued ?? "",
        i.quantityIssued ?? 0,
      ]),
      {
        records: issuedItemsData.length,
      },
    )
  }

  /* ================= SAVE ================= */
  doc.save(
    `${type === "fixed-assets" ? "FixedAssets" : type === "consumables" ? "Consumables" : "IssuedItems"}_Inventory.pdf`,
  )
}