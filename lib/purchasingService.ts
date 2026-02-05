import { db } from './firebase'
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
} from 'firebase/firestore'
import { 
  updateConsumableQuantity, 
  createConsumableFromPurchase,
  createFixedAssetFromPurchase 
} from './inventoryService'

export interface Purchase {
  id?: string
  item: string
  quantity: number | string  // Updated to support both number and text like "1 box"
  supplier: string
  cost: number
  date: string
  type: "consumable" | "fixed-asset"
  status: "Pending" | "Received" | "Cancelled"
  receipt: string | null
  
  category?: string
  unitPrice?: number
  consumableId?: string
  
  serialNumber?: string
  condition?: "functioning" | "non-functioning"
  assetClass?: string
  
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface LowStockItem {
  id: string
  name: string
  quantity: number
  reorderLevel: number
  unitPrice: number
  category: string
}

const PURCHASES_COLLECTION = 'purchases'

// Helper function to extract numeric value from quantity string
const extractNumericQuantity = (quantity: number | string): number => {
  if (typeof quantity === 'number') return quantity
  
  const match = quantity.match(/\d+/)
  return match ? Number(match[0]) : 0
}

export const addPurchase = async (purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, PURCHASES_COLLECTION), {
      ...purchaseData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error adding purchase:', error)
    return null
  }
}

// New function to add multiple purchase orders at once
export const addMultiplePurchases = async (
  supplier: string,
  date: string,
  items: Array<{
    itemName: string
    quantity: string
    unitPrice: string
    category?: string
    serialNumber?: string
    assetClass?: string
    consumableId?: string
  }>,
  type: "consumable" | "fixed-asset"
): Promise<{ success: boolean; ids: string[] }> => {
  const createdIds: string[] = []
  
  try {
    for (const item of items) {
      const quantityMatch = item.quantity.match(/\d+/)
      const quantity = quantityMatch ? Number(quantityMatch[0]) : 0
      const unitPrice = Number(item.unitPrice) || 0
      const totalCost = quantity * unitPrice

      const purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'> = {
        item: item.itemName,
        quantity,
        supplier,
        cost: totalCost,
        date,
        type,
        status: "Pending",
        receipt: null,
        unitPrice,
        category: item.category,
        consumableId: item.consumableId,
        serialNumber: item.serialNumber,
        assetClass: item.assetClass
      }

      const id = await addPurchase(purchaseData)
      if (id) {
        createdIds.push(id)
      } else {
        // If one fails, we still continue with the rest
        console.error('Failed to create purchase for item:', item.itemName)
      }
    }

    return { success: createdIds.length > 0, ids: createdIds }
  } catch (error) {
    console.error('Error adding multiple purchases:', error)
    return { success: false, ids: createdIds }
  }
}

export const updatePurchase = async (id: string, purchaseData: Partial<Purchase>): Promise<boolean> => {
  try {
    if (typeof id !== 'string' || !id.trim()) {
      throw new Error('updatePurchase: invalid purchase ID')
    }

    const purchaseRef = doc(db, PURCHASES_COLLECTION, id)
    await updateDoc(purchaseRef, {
      ...purchaseData,
      updatedAt: Timestamp.now(),
    })

    return true
  } catch (error) {
    console.error('Error updating purchase:', error)
    return false
  }
}

export const deletePurchase = async (id: string): Promise<boolean> => {
  try {
    if (typeof id !== 'string' || !id.trim()) {
      throw new Error('deletePurchase: invalid purchase ID')
    }

    await deleteDoc(doc(db, PURCHASES_COLLECTION, id))
    return true
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return false
  }
}

export const getPurchases = async (): Promise<Purchase[]> => {
  try {
    const q = query(collection(db, PURCHASES_COLLECTION), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Purchase[]
  } catch (error) {
    console.error('Error getting purchases:', error)
    return []
  }
}

export const subscribeToPurchases = (callback: (purchases: Purchase[]) => void) => {
  const q = query(collection(db, PURCHASES_COLLECTION), orderBy('createdAt', 'desc'))
  
  return onSnapshot(q, (querySnapshot) => {
    const purchases = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Purchase[]
    callback(purchases)
  }, (error) => {
    console.error('Error in purchases subscription:', error)
  })
}

export const markPurchaseAsReceived = async (id: string, purchase: Purchase): Promise<boolean> => {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('markPurchaseAsReceived: invalid purchase ID')
    }

    // Extract numeric quantity from the quantity field (supports both number and text like "1 box")
    const numericQuantity = extractNumericQuantity(purchase.quantity)

    let inventorySuccess = false;

    if (purchase.type === 'consumable') {
      if (purchase.consumableId) {
        // Update existing consumable inventory with the numeric quantity
        inventorySuccess = await updateConsumableQuantity(
          purchase.consumableId, 
          numericQuantity
        );
      } else {
        // Create new consumable with the numeric quantity
        const newConsumableId = await createConsumableFromPurchase(
          purchase.item,
          purchase.category || 'General',
          purchase.unitPrice || 0,
          numericQuantity,
          purchase.date
        );
        
        if (newConsumableId) {
          inventorySuccess = true;
          await updatePurchase(id, { consumableId: newConsumableId });
        }
      }
    } else if (purchase.type === 'fixed-asset') {
      // Create fixed asset with the numeric quantity
      const newAssetId = await createFixedAssetFromPurchase(
        purchase.item,
        purchase.serialNumber || '',
        purchase.assetClass || 'General',
        purchase.cost,
        numericQuantity,
        purchase.date
      );
      
      inventorySuccess = !!newAssetId;
    }

    if (!inventorySuccess) {
      console.error('Failed to update inventory');
      return false;
    }

    // Mark the purchase as received
    const statusUpdate = await updatePurchase(id, { status: 'Received' });
    
    return statusUpdate;
  } catch (error) {
    console.error('Error marking purchase as received:', error)
    return false
  }
}

export const markPurchaseAsCancelled = async (id: string): Promise<boolean> => {
  return updatePurchase(id, { status: 'Cancelled' })
}

export const uploadReceiptReference = async (id: string, receiptName: string): Promise<boolean> => {
  return updatePurchase(id, { receipt: receiptName })
}

export const getLowStockItems = async (): Promise<LowStockItem[]> => {
  console.warn('getLowStockItems is deprecated - use getConsumables from inventoryService instead')
  return []
}

// Helper function to get purchases filtered by month and year
export const getPurchasesByMonthYear = async (month?: number, year?: number): Promise<Purchase[]> => {
  try {
    const allPurchases = await getPurchases()
    
    if (!month && !year) {
      return allPurchases
    }

    return allPurchases.filter(purchase => {
      const purchaseDate = new Date(purchase.date)
      const purchaseMonth = purchaseDate.getMonth() + 1 // 1-12
      const purchaseYear = purchaseDate.getFullYear()

      const monthMatch = !month || month === purchaseMonth
      const yearMatch = !year || year === purchaseYear

      return monthMatch && yearMatch
    })
  } catch (error) {
    console.error('Error getting purchases by month/year:', error)
    return []
  }
}

// Helper function to get available years from purchases
export const getAvailableYears = async (): Promise<number[]> => {
  try {
    const allPurchases = await getPurchases()
    const years = new Set(allPurchases.map(p => new Date(p.date).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  } catch (error) {
    console.error('Error getting available years:', error)
    return []
  }
}