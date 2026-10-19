// Public surface of the stock module, split by concern:
//  - ./types        stock record/consumption/reorder types + Firestore document schema
//  - ./products     per-product packaging (tube/bottle sizes, scoped developer lines) + doc ids
//  - ./reorder      low/out status and the reorder list
//  - ./consumption  grams a saved session charges against stock, and shortages
//  - ./firestore    read/write I/O against the dyeStock collection
// Pure logic never imports ./firestore, so its tests can import those files directly
// without pulling in Firebase; app code keeps a single import from this module.
export {
  stockRecordSchema, type StockRecord, type StockStatus, type ReorderItem, type StockConsumption, type StockShortage,
} from "./types";
export {
  LOW_STOCK_THRESHOLD_GRAMS, DEVELOPER_BOTTLE_SIZE_GRAMS, getShadeTubeSizeGrams, getBrandScopedDeveloperLines,
  getScopedDeveloperVolumes, shadeStockId, developerStockId,
} from "./products";
export { getStockStatus, stockById, suggestReorderPacks, buildReorderList } from "./reorder";
export { computeStockConsumption, findStockShortages } from "./consumption";
export {
  subscribeToStock, setShadeStockGrams, setDeveloperStockGrams, stopTrackingStock, consumeStock,
  reconcileStockConsumption, restockOneTube,
} from "./firestore";
