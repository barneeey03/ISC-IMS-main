import { db } from "./firebase"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore"

// ==================== TYPES ====================

export interface Variant {
  id: string
  label: string
  price: number
}

export interface ItemWithVariants {
  id: string
  name: string
  variants: Variant[]
}

export interface Supplier {
  tin: string
  id: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  items: ItemWithVariants[]
  createdAt?: Timestamp
}

export interface PurchaseRecord {
  itemName: string
  id: string
  supplierId: string
  supplierName: string
  item: string
  variant: string
  unitPrice: number
  quantity: number
  total: number
  createdAt?: Timestamp
}

export interface CurrentPurchase {
  id: string
  supplierId: string
  supplierName: string
  item: string
  variant: string
  unitPrice: number
  quantity: number
  total: number
  status: "pending" | "ordered"
  createdAt: Timestamp
  orderedAt?: Timestamp
}

export interface PurchaseHistory {
  id: string
  supplierId: string
  supplierName: string
  item: string
  variant: string
  unitPrice: number
  quantity: number
  total: number
  orderedAt: Timestamp
  receivedAt: Timestamp
}

const SUPPLIERS_COLLECTION = "suppliers"
const PURCHASE_RECORDS_COLLECTION = "purchaseRecords"
const CURRENT_PURCHASES_COLLECTION = "current_purchases"
const PURCHASE_HISTORY_COLLECTION = "purchase_history"

// ==================== SUPPLIER OPERATIONS ====================

/**
 * Add a new supplier
 */
export const addSupplier = async (supplierData: Omit<Supplier, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), {
      ...supplierData,
      createdAt: Timestamp.now(),
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error adding supplier:", error)
    return { success: false, error }
  }
}

/**
 * Update an existing supplier
 */
export const updateSupplier = async (id: string, supplierData: Partial<Supplier>) => {
  try {
    const supplierRef = doc(db, SUPPLIERS_COLLECTION, id)
    await updateDoc(supplierRef, supplierData)
    return { success: true }
  } catch (error) {
    console.error("Error updating supplier:", error)
    return { success: false, error }
  }
}

/**
 * Delete a supplier
 */
export const deleteSupplier = async (id: string) => {
  try {
    await deleteDoc(doc(db, SUPPLIERS_COLLECTION, id))
    return { success: true }
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return { success: false, error }
  }
}

/**
 * Get all suppliers (one-time fetch)
 */
export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const q = query(collection(db, SUPPLIERS_COLLECTION), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Supplier[]
  } catch (error) {
    console.error("Error getting suppliers:", error)
    return []
  }
}

/**
 * Subscribe to real-time supplier updates
 */
export const subscribeToSuppliers = (callback: (suppliers: Supplier[]) => void) => {
  const q = query(collection(db, SUPPLIERS_COLLECTION), orderBy("createdAt", "desc"))

  return onSnapshot(q, (querySnapshot) => {
    const suppliers = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Supplier[]
    callback(suppliers)
  })
}

/**
 * Update variants for a specific item within a supplier
 */
export const updateSupplierItemVariants = async (supplierId: string, itemId: string, updatedItem: ItemWithVariants) => {
  try {
    const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierId)

    // First, fetch the current supplier data
    const suppliers = await getSuppliers()
    const supplier = suppliers.find((s) => s.id === supplierId)

    if (!supplier) {
      return { success: false, error: "Supplier not found" }
    }

    // Update the specific item
    const updatedItems = supplier.items.map((item) => (item.id === itemId ? updatedItem : item))

    // Update the supplier document
    await updateDoc(supplierRef, { items: updatedItems })
    return { success: true }
  } catch (error) {
    console.error("Error updating supplier item variants:", error)
    return { success: false, error }
  }
}

// ==================== PURCHASE RECORD OPERATIONS (LEGACY) ====================

/**
 * Add a new purchase record
 */
export const addPurchaseRecord = async (purchaseData: Omit<PurchaseRecord, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, PURCHASE_RECORDS_COLLECTION), {
      ...purchaseData,
      createdAt: Timestamp.now(),
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error adding purchase record:", error)
    return { success: false, error }
  }
}

/**
 * Delete a purchase record
 */
export const deletePurchaseRecord = async (id: string) => {
  try {
    await deleteDoc(doc(db, PURCHASE_RECORDS_COLLECTION, id))
    return { success: true }
  } catch (error) {
    console.error("Error deleting purchase record:", error)
    return { success: false, error }
  }
}

/**
 * Get all purchase records (one-time fetch)
 */
export const getPurchaseRecords = async (): Promise<PurchaseRecord[]> => {
  try {
    const q = query(collection(db, PURCHASE_RECORDS_COLLECTION), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseRecord[]
  } catch (error) {
    console.error("Error getting purchase records:", error)
    return []
  }
}

/**
 * Subscribe to real-time purchase record updates
 */
export const subscribeToPurchaseRecords = (callback: (records: PurchaseRecord[]) => void) => {
  const q = query(collection(db, PURCHASE_RECORDS_COLLECTION), orderBy("createdAt", "desc"))

  return onSnapshot(q, (querySnapshot) => {
    const records = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseRecord[]
    callback(records)
  })
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate a unique ID for items and variants (client-side)
 * This is a temporary ID until Firebase assigns the real one
 */
export const generateClientId = () => {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ==================== CURRENT PURCHASES OPERATIONS ====================

/**
 * Add a new current purchase (status: pending)
 */
export const addCurrentPurchase = async (purchaseData: Omit<CurrentPurchase, "id" | "createdAt" | "status">) => {
  try {
    const docRef = await addDoc(collection(db, CURRENT_PURCHASES_COLLECTION), {
      ...purchaseData,
      status: "pending",
      createdAt: Timestamp.now(),
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error adding current purchase:", error)
    return { success: false, error }
  }
}

/**
 * Update current purchase status to 'ordered'
 */
export const markPurchaseAsOrdered = async (id: string) => {
  try {
    const purchaseRef = doc(db, CURRENT_PURCHASES_COLLECTION, id)
    await updateDoc(purchaseRef, {
      status: "ordered",
      orderedAt: Timestamp.now(),
    })
    return { success: true }
  } catch (error) {
    console.error("Error marking purchase as ordered:", error)
    return { success: false, error }
  }
}

/**
 * Mark multiple purchases as ordered
 */
export const markMultiplePurchasesAsOrdered = async (ids: string[]) => {
  try {
    const promises = ids.map((id) => markPurchaseAsOrdered(id))
    await Promise.all(promises)
    return { success: true }
  } catch (error) {
    console.error("Error marking multiple purchases as ordered:", error)
    return { success: false, error }
  }
}

/**
 * Move purchase from current to history (mark as received)
 */
export const markPurchaseAsReceived = async (purchase: CurrentPurchase) => {
  try {
    // Add to purchase history
    const historyData: Omit<PurchaseHistory, "id"> = {
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      item: purchase.item,
      variant: purchase.variant,
      unitPrice: purchase.unitPrice,
      quantity: purchase.quantity,
      total: purchase.total,
      orderedAt: purchase.orderedAt || purchase.createdAt,
      receivedAt: Timestamp.now(),
    }

    await addDoc(collection(db, PURCHASE_HISTORY_COLLECTION), historyData)

    // Delete from current purchases
    await deleteDoc(doc(db, CURRENT_PURCHASES_COLLECTION, purchase.id))

    return { success: true }
  } catch (error) {
    console.error("Error marking purchase as received:", error)
    return { success: false, error }
  }
}

/**
 * Delete a current purchase
 */
export const deleteCurrentPurchase = async (id: string) => {
  try {
    await deleteDoc(doc(db, CURRENT_PURCHASES_COLLECTION, id))
    return { success: true }
  } catch (error) {
    console.error("Error deleting current purchase:", error)
    return { success: false, error }
  }
}

/**
 * Subscribe to real-time current purchases updates
 */
export const subscribeToCurrentPurchases = (callback: (purchases: CurrentPurchase[]) => void) => {
  const q = query(collection(db, CURRENT_PURCHASES_COLLECTION), orderBy("createdAt", "desc"))

  return onSnapshot(q, (querySnapshot) => {
    const purchases = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CurrentPurchase[]
    callback(purchases)
  })
}

// ==================== PURCHASE HISTORY OPERATIONS ====================

/**
 * Get all purchase history records
 */
export const getPurchaseHistory = async (): Promise<PurchaseHistory[]> => {
  try {
    const q = query(collection(db, PURCHASE_HISTORY_COLLECTION), orderBy("receivedAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseHistory[]
  } catch (error) {
    console.error("Error getting purchase history:", error)
    return []
  }
}

/**
 * Subscribe to real-time purchase history updates
 */
export const subscribeToPurchaseHistory = (callback: (records: PurchaseHistory[]) => void) => {
  const q = query(collection(db, PURCHASE_HISTORY_COLLECTION), orderBy("receivedAt", "desc"))

  return onSnapshot(q, (querySnapshot) => {
    const records = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseHistory[]
    callback(records)
  })
}
