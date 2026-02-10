// lib/inventoryService.ts
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface FixedAsset {
  id?: string;
  name: string;
  serial: string;
  category: string;
  location: string;
  status: string;
  dateAcquired: string;
  acquisitionCost?: number;
  assetClass: string;
  assetNumber: string;
  qtyFunctioning?: number;
  qtyNotFunctioning?: number;
}

export interface ConsumableItem {
  id?: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  inventoryValue: number;
  reorderLevel: number;
  reorderTime: number;
  datePurchased: string;
  discontinued: boolean;
  status: string;
}

export interface IssuedItem {
  id?: string;
  consumableId: string;
  consumableName: string;
  issuedTo: string;
  department: string;
  dateIssued: string;
  quantityIssued: number;
  isMultiItem?: boolean;
  multiItemIds?: string[];
}

// ============================================================================
// FIXED ASSETS CRUD OPERATIONS
// ============================================================================

export const getFixedAssets = async (): Promise<FixedAsset[]> => {
  try {
    const q = query(collection(db, 'fixedAssets'), orderBy('assetNumber'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FixedAsset));
  } catch (error) {
    console.error('Error fetching fixed assets:', error);
    throw new Error('Failed to fetch fixed assets');
  }
};

export const addFixedAsset = async (asset: Omit<FixedAsset, 'id'>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, 'fixedAssets'), {
      ...asset,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log('Fixed asset added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding fixed asset:', error);
    throw new Error('Failed to add fixed asset');
  }
};

export const updateFixedAsset = async (id: string, asset: Partial<FixedAsset>): Promise<boolean> => {
  try {
    const docRef = doc(db, 'fixedAssets', id);
    const { id: _, ...updateData } = asset as FixedAsset;
    
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
    console.log('Fixed asset updated:', id);
    return true;
  } catch (error) {
    console.error('Error updating fixed asset:', error);
    throw new Error('Failed to update fixed asset');
  }
};

export const deleteFixedAsset = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'fixedAssets', id));
    console.log('Fixed asset deleted:', id);
    return true;
  } catch (error) {
    console.error('Error deleting fixed asset:', error);
    throw new Error('Failed to delete fixed asset');
  }
};

// ============================================================================
// CONSUMABLES CRUD OPERATIONS
// ============================================================================

export const getConsumables = async (): Promise<ConsumableItem[]> => {
  try {
    const q = query(collection(db, 'consumables'), orderBy('description'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ConsumableItem));
  } catch (error) {
    console.error('Error fetching consumables:', error);
    throw new Error('Failed to fetch consumables');
  }
};

export const addConsumable = async (item: ConsumableItem): Promise<boolean> => {
  try {
    const { id, ...data } = item;
    
    if (id) {
      await setDoc(doc(db, 'consumables', id), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      console.log('Consumable added with custom ID:', id);
    } else {
      const docRef = await addDoc(collection(db, 'consumables'), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      console.log('Consumable added with auto ID:', docRef.id);
    }
    return true;
  } catch (error) {
    console.error('Error adding consumable:', error);
    throw new Error('Failed to add consumable');
  }
};

export const updateConsumable = async (id: string, item: Partial<ConsumableItem>): Promise<boolean> => {
  try {
    const docRef = doc(db, 'consumables', id);
    const { id: _, ...updateData } = item as ConsumableItem;
    
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
    console.log('Consumable updated:', id);
    return true;
  } catch (error) {
    console.error('Error updating consumable:', error);
    throw new Error('Failed to update consumable');
  }
};

export const deleteConsumable = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'consumables', id));
    console.log('Consumable deleted:', id);
    return true;
  } catch (error) {
    console.error('Error deleting consumable:', error);
    throw new Error('Failed to delete consumable');
  }
};

// ============================================================================
// ISSUED ITEMS CRUD OPERATIONS (SEPARATE COLLECTION FOR CONSUMABLES)
// ============================================================================

export const getIssuedItems = async (): Promise<IssuedItem[]> => {
  try {
    const q = query(collection(db, 'consumablesIssuedItems'), orderBy('dateIssued', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as IssuedItem));
  } catch (error) {
    console.error('Error fetching issued items:', error);
    throw new Error('Failed to fetch issued items');
  }
};

export const addIssuedItem = async (item: IssuedItem): Promise<boolean> => {
  try {
    const { id, ...data } = item;
    
    if (id) {
      await setDoc(doc(db, 'consumablesIssuedItems', id), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      console.log('Issued item added with custom ID:', id);
    } else {
      const docRef = await addDoc(collection(db, 'consumablesIssuedItems'), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      console.log('Issued item added with auto ID:', docRef.id);
    }
    return true;
  } catch (error) {
    console.error('Error adding issued item:', error);
    throw new Error('Failed to add issued item');
  }
};

export const updateIssuedItem = async (id: string, item: Partial<IssuedItem>): Promise<boolean> => {
  try {
    const docRef = doc(db, 'consumablesIssuedItems', id);
    const { id: _, ...updateData } = item as IssuedItem;
    
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
    console.log('Issued item updated:', id);
    return true;
  } catch (error) {
    console.error('Error updating issued item:', error);
    throw new Error('Failed to update issued item');
  }
};

export const deleteIssuedItem = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'consumablesIssuedItems', id));
    console.log('Issued item deleted:', id);
    return true;
  } catch (error) {
    console.error('Error deleting issued item:', error);
    throw new Error('Failed to delete issued item');
  }
};

// ============================================================================
// BATCH OPERATIONS FOR MULTI-ITEM ISSUANCE
// ============================================================================

/**
 * Add multiple issued items in a batch operation
 * Used for issuing multiple consumables to the same person/department
 */
export const addIssuedItemsBatch = async (items: IssuedItem[]): Promise<boolean> => {
  try {
    // Use Promise.all to add all items concurrently
    const promises = items.map(item => addIssuedItem(item));
    await Promise.all(promises);
    console.log(`Batch added ${items.length} issued items`);
    return true;
  } catch (error) {
    console.error('Error in batch adding issued items:', error);
    throw new Error('Failed to add issued items in batch');
  }
};

/**
 * Delete multiple issued items in a batch operation
 * Used when deleting a multi-item issuance group
 */
export const deleteIssuedItemsBatch = async (ids: string[]): Promise<boolean> => {
  try {
    const promises = ids.map(id => deleteIssuedItem(id));
    await Promise.all(promises);
    console.log(`Batch deleted ${ids.length} issued items`);
    return true;
  } catch (error) {
    console.error('Error in batch deleting issued items:', error);
    throw new Error('Failed to delete issued items in batch');
  }
};

// ============================================================================
// HELPER FUNCTIONS FOR PURCHASING MODULE
// ============================================================================

export const updateConsumableQuantity = async (
  consumableId: string, 
  quantityToAdd: number
): Promise<boolean> => {
  try {
    const docRef = doc(db, 'consumables', consumableId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error('Consumable not found:', consumableId);
      throw new Error('Consumable not found');
    }
    
    const item = docSnap.data() as ConsumableItem;
    const newQuantity = item.quantity + quantityToAdd;
    const newInventoryValue = newQuantity * item.unitPrice;
    
    let newStatus: string;
    if (newQuantity === 0) {
      newStatus = 'Out of Stock';
    } else if (newQuantity <= item.reorderLevel) {
      newStatus = 'Low Stock';
    } else {
      newStatus = 'In Stock';
    }
    
    await updateDoc(docRef, {
      quantity: newQuantity,
      inventoryValue: newInventoryValue,
      status: newStatus,
      updatedAt: Timestamp.now()
    });
    
    console.log(`Consumable ${consumableId} updated: +${quantityToAdd} units (now ${newQuantity})`);
    return true;
  } catch (error) {
    console.error('Error updating consumable quantity:', error);
    throw new Error('Failed to update consumable quantity');
  }
};

export const createConsumableFromPurchase = async (
  itemName: string,
  category: string,
  unitPrice: number,
  quantity: number,
  datePurchased: string
): Promise<string | null> => {
  try {
    const consumables = await getConsumables();
    const nums = consumables
      .map(c => {
        const idStr = String(c.id || "");
        return Number(idStr.replace("CON-", ""));
      })
      .filter(n => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    const newId = `CON-${String(next).padStart(3, "0")}`;

    const inventoryValue = unitPrice * quantity;
    const defaultReorderLevel = Math.ceil(quantity * 0.2);
    
    let status: string;
    if (quantity === 0) {
      status = 'Out of Stock';
    } else if (quantity <= defaultReorderLevel) {
      status = 'Low Stock';
    } else {
      status = 'In Stock';
    }

    const newConsumable: ConsumableItem = {
      id: newId,
      name: itemName,
      description: category || 'General',
      unitPrice,
      quantity,
      inventoryValue,
      reorderLevel: defaultReorderLevel,
      reorderTime: 0,
      datePurchased,
      discontinued: false,
      status
    };

    const success = await addConsumable(newConsumable);
    return success ? newId : null;
  } catch (error) {
    console.error('Error creating consumable from purchase:', error);
    throw new Error('Failed to create consumable from purchase');
  }
};

export const createFixedAssetFromPurchase = async (
  itemName: string,
  serialNumber: string,
  assetClass: string,
  acquisitionCost: number,
  quantity: number,
  dateAcquired: string
): Promise<string | null> => {
  try {
    const assets = await getFixedAssets();
    const nums = assets
      .map(a => Number(a.assetNumber.replace("FA-", "")))
      .filter(n => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    const assetNumber = `FA-${String(next).padStart(3, "0")}`;

    const newAsset: Omit<FixedAsset, 'id'> = {
      name: itemName,
      serial: serialNumber || `SN-${Date.now()}`,
      category: assetClass,
      location: 'Main Office',
      status: 'Operational',
      dateAcquired,
      acquisitionCost,
      assetClass,
      assetNumber,
      qtyFunctioning: quantity,
      qtyNotFunctioning: 0
    };

    return await addFixedAsset(newAsset);
  } catch (error) {
    console.error('Error creating fixed asset from purchase:', error);
    throw new Error('Failed to create fixed asset from purchase');
  }
};

export const getConsumableById = async (id: string): Promise<ConsumableItem | null> => {
  try {
    const docRef = doc(db, 'consumables', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as ConsumableItem;
    }
    return null;
  } catch (error) {
    console.error('Error getting consumable:', error);
    throw new Error('Failed to get consumable');
  }
};

export const getFixedAssetById = async (id: string): Promise<FixedAsset | null> => {
  try {
    const docRef = doc(db, 'fixedAssets', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as FixedAsset;
    }
    return null;
  } catch (error) {
    console.error('Error getting fixed asset:', error);
    throw new Error('Failed to get fixed asset');
  }
};

export const getIssuedItemById = async (id: string): Promise<IssuedItem | null> => {
  try {
    const docRef = doc(db, 'consumablesIssuedItems', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as IssuedItem;
    }
    return null;
  } catch (error) {
    console.error('Error getting issued item:', error);
    throw new Error('Failed to get issued item');
  }
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a consumable has enough quantity before issuing
 */
export const validateConsumableQuantity = async (
  consumableId: string,
  requestedQuantity: number
): Promise<{ valid: boolean; available: number; message: string }> => {
  try {
    const consumable = await getConsumableById(consumableId);
    
    if (!consumable) {
      return {
        valid: false,
        available: 0,
        message: 'Consumable not found'
      };
    }
    
    if (consumable.discontinued) {
      return {
        valid: false,
        available: consumable.quantity,
        message: 'This item has been discontinued'
      };
    }
    
    if (consumable.quantity < requestedQuantity) {
      return {
        valid: false,
        available: consumable.quantity,
        message: `Insufficient quantity. Available: ${consumable.quantity}, Requested: ${requestedQuantity}`
      };
    }
    
    return {
      valid: true,
      available: consumable.quantity,
      message: 'Quantity available'
    };
  } catch (error) {
    console.error('Error validating consumable quantity:', error);
    return {
      valid: false,
      available: 0,
      message: 'Error checking quantity'
    };
  }
};