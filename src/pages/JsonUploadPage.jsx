import React, { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, X, Eye, XCircle } from 'lucide-react'
import { collection, addDoc, writeBatch, doc, getDocs, deleteDoc, serverTimestamp, query, limit } from 'firebase/firestore'
import { db } from '../../firebase'
import * as XLSX from 'xlsx'

// ---------- Config ---------- 
const COLUMN_MAPPINGS = {
  name: ["title", "name", "product name", "product", "product title"],
  name_lower: ["title", "name", "product name", "product", "product title"],
  description: ["description", "product description", "body (html)", "details"],
  stock: ["stock", "quantity", "qty", "available stock"],
  sku: ["sku", "variant sku", "baseSku"],
  category: ["category", "product category", "Type"],
  subcategory: ["subcategory", "sub category"],
  brand: ["brand", "vendor"],
  price: ["price", "mrp"],
  offerPrice: ["offerprice", "msrp", "compare at price"],
  image: [
    "image1", "image 1", "img1", "image2", "image 2", "img2",
    "image3", "image4", "image5"
  ],
  size: ["size"]
};

const CORE_FIELDS = new Set([
  "productid", "name", "name_lower", "description", "category",
  "subcategory", "baseSku", "brand", "price", "offerPrice",
  "stock", "timestamp", "images", "sellerId", "sizeVariants"
]);

// Flatten alias list
const ALIASES = Object.values(COLUMN_MAPPINGS)
  .flat()
  .map((v) => v.toLowerCase().trim());
const generateSeoUrl = (name = "", productId = "") => {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return `${slug}--${productId}`;
};


// ---------- Helpers ----------
function cleanHtml(text) {
  if (!text) return "";
  const temp = document.createElement("div");
  temp.innerHTML = text;
  return temp.textContent || temp.innerText || "";
}

function safeNumber(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : Math.floor(num);
}

function safeStr(val) {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  return s.toLowerCase() === "nan" ? "" : s;
}

function pickCol(possibleNames, columns) {
  for (let name of possibleNames) {
    for (let col of columns) {
      if (col.trim().toLowerCase() === name.trim().toLowerCase()) return col;
    }
  }
  return null;
}

function normalizeKeys(obj) {
  if (Array.isArray(obj)) return obj.map(normalizeKeys);
  if (obj && typeof obj === "object") {
    const out = {};
    for (let [k, v] of Object.entries(obj)) {
      out[k.trim().toLowerCase().replace(/\s+/g, "")] = normalizeKeys(v);
    }
    return out;
  }
  return obj;
}

const createProductId = (product, index) => {
  if (product.productId) return product.productId;
  if (product.sku) return `PID-${product.sku}`;
  if (product.baseSku) return `PID-${product.baseSku}`;
  return `PID-GEN-${Date.now()}-${index}`;
};

// ---------- Category Detection Logic ---------- 
const SUBCATEGORY_KEYWORDS = {
  clothing: [
    "tops", "tshirt", "kurti", "dress", "lehenga", "gown", "frock", "jumpsuit",
    "outfit", "men shirt", "men t-shirt", "womens dress", "partywear",
    "casualwear", "formalwear"
  ]
}

const CATEGORY_KEYWORDS = {
  clothing: [
    "clothing", "dress", "shirt", "shirts", "tshirt", "tshirts", "kurti", "tops", "blouse",
    "frock", "gown", "lehenga", "skirt", "trousers", "jeans", "pants", "shorts", "sweater",
    "hoodie", "jacket", "coat", "blazer", "cardigan", "saree", "salwar", "ethnic wear",
    "casual wear", "formal wear", "party wear", "nightdress", "jumper", "hooded jacket",
    "windbreaker", "tracksuit", "activewear", "yoga pants", "leggings", "sport shorts",
    "polo shirt", "men shirt", "men tshirt", "women shirt", "women dress", "fashion top",
    "blazer jacket", "evening gown", "cocktail dress", "maxi dress", "mini dress",
    "shirt dress", "summer dress", "winter dress", "party dress", "workout top", "crop top",
    "tank top", "long sleeve shirt", "short sleeve shirt", "tunic", "kaftan", "peplum top",
    "kimono", "bodysuit", "pajama set", "nightwear", "lingerie", "underwear", "sports bra",
    "swimwear", "bikini", "trousers suit", "linen shirt", "denim jacket", "leather jacket",
    "jean jacket", "corduroy pants", "culottes", "sweatshirt", "hoodie jacket", "poncho",
    "cape", "gilet", "waistcoat", "vest", "shirt jacket", "kimono jacket", "sarong",
    "sling dress", "robe", "athletic shirt", "sports shorts", "athletic leggings",
    "active leggings", "cycling shorts", "boardshorts", "hooded sweatshirt"
  ],
  mobile: [
    "smartphone",
    "android phone",
    "iphone",
    "dual sim phone",
    "gaming phone"
  ],
  laptop: [
    "gaming laptop",
    "macbook",
    "chromebook",
    "notebook",
    "ultrabook",
    "windows laptop"
  ],
  electronics: [
    "electronics", "electronic device", "gadgets", "home electronics", "consumer electronics",
    "smart electronics", "television", "tv", "led tv", "oled tv", "lcd tv", "smart tv",
    "smartwatch", "tablet", "earphones", "headphones", "bluetooth speaker", "camera", "dslr",
    "mirrorless camera", "point and shoot", "security camera", "webcam", "drone", "projector",
    "home theater", "soundbar", "amplifier", "router", "modem", "smart home", "wifi device",
    "network device", "gaming console", "playstation", "xbox", "nintendo", "switch", "media player",
    "dvd player", "blu-ray player", "smart light", "smart plug", "fitness tracker", "air purifier",
    "robot vacuum", "home appliance", "microwave", "refrigerator", "washing machine", "dishwasher",
    "oven", "coffee maker", "blender", "mixer", "juicer", "fan", "heater", "cooler", "humidifier",
    "thermostat", "charger", "adapter", "power bank", "usb hub", "keyboard", "mouse", "printer",
    "scanner", "fax machine", "projector screen", "tv box", "set top box", "monitor",
    "gaming monitor", "monitor stand", "vr headset", "vr device", "earbud", "noise cancelling headphones",
    "wireless headphones", "wired headphones", "speaker system", "sound system", "home security",
    "alarm system", "electric toothbrush", "hair dryer", "hair straightener", "iron", "shaver"
  ],
  footwear: [
    "sneakers",
    "boots",
    "formal shoes",
    "casual shoes",
    "running shoes",
    "sports shoes",
    "sandals",
    "slippers"
  ],
  jewellery: [
    "necklace",
    "ring",
    "bracelet",
    "earring",
    "bangle",
    "pendant",
    "mangalsutra",
    "brooch",
    "jewellery set"
  ],
  home: [
    "sofa",
    "table",
    "chair",
    "bed",
    "wardrobe",
    "painting",
    "wall frame",
    "photo frame",
    "kitchen items"
  ]
}

const JsonBulkUpload = () => {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [jsonData, setJsonData] = useState('')
  const [validationResults, setValidationResults] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadHistory, setUploadHistory] = useState([])
  const [existingProducts, setExistingProducts] = useState([])

  // Fetch and display collection stats (used after deletions/uploads)
  const fetchStats = async () => {
    try {
      const collectionsToCheck = ['products', 'items', 'documents', 'data']
      const stats = []
      for (const name of collectionsToCheck) {
        try {
          const snapshot = await getDocs(collection(db, name))
          stats.push({ collection: name, count: snapshot.size })
        } catch (err) {
          console.error(`Error fetching stats for ${name}:`, err)
          stats.push({ collection: name, error: err.message })
        }
      }
      console.log('Post-deletion stats:', stats)
      const productsStat = stats.find(s => s.collection === 'products')
      if (productsStat && typeof productsStat.count === 'number') {
        setMessage(prev => {
          const remainMsg = `Products remaining: ${productsStat.count}`
          return prev ? `${prev} | ${remainMsg}` : remainMsg
        })
      }
      return stats
    } catch (error) {
      console.error('fetchStats error:', error)
      return []
    }
  }

  // ---------- CSV/Excel Processing Functions ----------
  const processCSVExcelData = (data, sellerId = "") => {
    const columns = Object.keys(data[0] || {});
    const products = {};

    for (let row of data) {
      let productId = safeStr(row["Product ID"] || row["id"] || row["SKU"]);
      if (!productId) continue;

      const nameCol = pickCol(COLUMN_MAPPINGS.name, columns);
      const descCol = pickCol(COLUMN_MAPPINGS.description, columns);
      const skuCol = pickCol(COLUMN_MAPPINGS.sku, columns);
      const stockCol = pickCol(COLUMN_MAPPINGS.stock, columns);
      const priceCol = pickCol(COLUMN_MAPPINGS.price, columns);
      const offerCol = pickCol(COLUMN_MAPPINGS.offerPrice, columns);
      const sizeCol = pickCol(COLUMN_MAPPINGS.size, columns);
      const brandCol = pickCol(COLUMN_MAPPINGS.brand, columns);

      const name = nameCol ? safeStr(row[nameCol]) || "Untitled" : "Untitled";
      const description = descCol ? cleanHtml(row[descCol]) : "";

      // Detect category and subcategory
      const category = detectCategory(name, description);
      const subcategory = detectSubcategory(category, name, description);

      const price = priceCol ? safeNumber(row[priceCol]) : 0;
      const offerPrice = offerCol ? safeNumber(row[offerCol]) : price;
      const stock = stockCol ? safeNumber(row[stockCol]) : 0;
      const size = sizeCol ? safeStr(row[sizeCol]) : "";
      const baseSku = skuCol ? safeStr(row[skuCol]) : "";

      // Timestamp with unique milliseconds
      const timestamp = Date.now() + Math.floor(Math.random() * 1000);

      if (!products[productId]) {
        // Collect images
        const images = [];
        columns.forEach((col) => {
          if (col.toLowerCase().includes("image") || col.toLowerCase().includes("img")) {
            const val = safeStr(row[col]);
            if (val) images.push(val);
          }
        });

        products[productId] = {
          productId,
          name,
          name_lower: name.toLowerCase(),
          description,
          category,
          subcategory,
          baseSku,
          brand: brandCol ? safeStr(row[brandCol]) : "",
          price,
          offerPrice,
          stock: 0, // sum later
          timestamp,
          images,
          sellerId: sellerId,
          sizeVariants: [],
        };
      }

      // Add variant
      if (size) {
        products[productId].sizeVariants.push({
          size,
          stock,
          sku: baseSku,
          price,
        });
      }

      // Sum stock
      products[productId].stock += stock;

      // Add extra fields dynamically
      columns.forEach((col) => {
        const colClean = col.trim();
        if (
          !ALIASES.includes(colClean.toLowerCase()) &&
          !CORE_FIELDS.has(colClean) &&
          !colClean.toLowerCase().startsWith("image") &&
          colClean.toLowerCase() !== "size"
        ) {
          const val = safeStr(row[colClean]);
          if (val) products[productId][colClean] = val;
        }
      });
    }

    return Object.values(products).map(normalizeKeys);
  };

  const sampleJsonStructure = {
    products: [
      {
        name: "Sample Product",
        description: "Product description",
        price: 99.99,
        comparePrice: 129.99,
        sku: "SAMPLE-001",
        category: "Electronics",
        subcategory: "Smartphones",
        stock: 50,
        images: ["image1.jpg", "image2.jpg"],
        specifications: [
          { "key": "Brand", "value": "Sample Brand" },
          { "key": "Model", "value": "Sample Model" }
        ],
        weight: 0.5,
        dimensions: {
          length: 10,
          width: 5,
          height: 2
        },

        // You can add any custom fields - they will be preserved in database
        customField1: "Any custom value",
        customField2: 123,
        customObject: {
          key1: "value1",
          key2: "value2"
        },
        customArray: ["item1", "item2", "item3"],
        manufacturer: "Sample Manufacturer",
        warranty: "1 year",
        color: "Black",
        material: "Plastic",
        origin: "Made in India"
      }
    ],
    note: "You can add ANY custom fields to your products - all data will be preserved in the database. You can also upload a direct array of products without the 'products' wrapper. Specifications can be an object or array format. Only 'name' field is required."
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    console.log('File upload started:', file.name)
    const fileExtension = file.name.split('.').pop().toLowerCase()

    if (fileExtension === 'json') {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          console.log('JSON file read successfully, size:', event.target.result.length)
          setJsonData(event.target.result)
          validateJson(event.target.result)
        } catch (err) {
          console.error('Error reading JSON file:', err)
          alert('Error reading JSON file: ' + err.message)
        }
      }
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        alert('Error reading file: ' + error.message)
      }
      reader.readAsText(file)
    } else if (['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          let processedData

          if (fileExtension === 'csv') {
            const csvData = event.target.result
            const workbook = XLSX.read(csvData, { type: 'string' })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            processedData = XLSX.utils.sheet_to_json(sheet)
          } else {
            const data = new Uint8Array(event.target.result)
            const workbook = XLSX.read(data, { type: 'array' })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            processedData = XLSX.utils.sheet_to_json(sheet)
          }

          const sellerIdValue = '' // default sellerId
          const products = processCSVExcelData(processedData, sellerIdValue)
          const jsonStr = JSON.stringify({ products })
          setJsonData(jsonStr)
          validateJson(jsonStr)
        } catch (err) {
          console.error('Error processing Excel/CSV file:', err)
          alert('Error processing file. Please check the file format: ' + err.message)
        }
      }
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        alert('Error reading file: ' + error.message)
      }

      if (fileExtension === 'csv') {
        reader.readAsText(file)
      } else {
        reader.readAsArrayBuffer(file)
      }
    } else {
      alert('Unsupported file format. Please upload JSON, CSV, or Excel files.')
    }
  }

  const cancelUpload = () => {
    setUploadedFile(null)
    setJsonData('')
    setValidationResults(null)
    setMessage('')
    // Reset file input
    const fileInput = document.getElementById('file-upload')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const validateJson = (jsonString) => {
    try {
      console.log('Starting JSON validation...')
      let data
      try {
        data = JSON.parse(jsonString)
        console.log('JSON parsed successfully')
      } catch (parseErr) {
        console.warn('JSON parse failed during validation, treating as raw text document:', parseErr?.message)
        data = { _rawText: jsonString }
      }

      const results = {
        isValid: true,
        errors: [],
        warnings: [],
        recordCount: 0
      }

      // Accept ANY JSON format - convert everything to documents
      let documents = []

      if (Array.isArray(data)) {
        // Direct array format - each item becomes a document
        documents = data.map((item, index) => ({
          id: `item_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data: item,
          type: 'array_item',
          originalIndex: index
        }))
        console.log(`Detected array format with ${data.length} items`)
      } else if (typeof data === 'object' && data !== null) {
        // Object format - try to extract arrays or upload as single document
        if (data.products && Array.isArray(data.products)) {
          documents = data.products.map((item, index) => ({
            id: `product_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            data: item,
            type: 'product',
            originalIndex: index
          }))
          console.log(`Detected {products: []} format with ${data.products.length} items`)
        } else if (data.items && Array.isArray(data.items)) {
          documents = data.items.map((item, index) => ({
            id: `item_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            data: item,
            type: 'item',
            originalIndex: index
          }))
          console.log(`Detected {items: []} format with ${data.items.length} items`)
        } else if (data.data && Array.isArray(data.data)) {
          documents = data.data.map((item, index) => ({
            id: `data_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            data: item,
            type: 'data_item',
            originalIndex: index
          }))
          console.log(`Detected {data: []} format with ${data.data.length} items`)
        } else {
          // Upload the entire object as a single document
          const keys = Object.keys(data)
          documents = [{
            id: `object_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            data: data,
            type: 'object',
            keys: keys
          }]
          console.log(`Detected single object format with ${keys.length} keys`)
        }
      } else {
        // Primitive values (string, number, boolean) - upload as single document
        documents = [{
          id: `value_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data: data,
          type: 'primitive',
          valueType: typeof data
        }]
        console.log(`Detected primitive value: ${typeof data}`)
      }

      results.recordCount = documents.length
      console.log(`Found ${documents.length} documents to upload`)

      documents.forEach((doc, index) => {
        // Accept any data - no validation required
        console.log(`Document ${index + 1}: Type=${doc.type}, ID=${doc.id}`)
      })

      // Add category detection preview for first 5 documents (if they contain product-like data)
      const productLikeDocuments = documents.filter(doc =>
        doc.type === 'product' || doc.type === 'item' || doc.type === 'data_item' || doc.type === 'array_item'
      ).slice(0, 5)

      if (productLikeDocuments.length > 0) {
        results.categoryPreview = productLikeDocuments.map(doc => {
          const detected = detectCategory(doc.data)
          return {
            name: doc.data.name || doc.data.title || doc.data.productName || 'Unknown',
            detectedCategory: detected.category,
            detectedSubcategory: detected.subcategory,
            confidence: detected.confidence
          }
        })
      }

      // Always valid: even empty input is allowed, show a warning only
      if (documents.length === 0) {
        results.warnings.push('No documents detected; upload will store an empty placeholder')
        results.isValid = true
        // Create an empty placeholder document
        documents = [{
          id: `empty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data: { _empty: true },
          type: 'empty'
        }]
        results.recordCount = 1
      }

      setValidationResults(results)
      console.log('Validation completed:', results)
    } catch (error) {
      console.error('JSON validation error:', error)
      setValidationResults({
        isValid: true,
        errors: [],
        warnings: [`Validation exception handled: ${error.message}`],
        recordCount: 1
      })
    }
  }

  const processUpload = async () => {
    // Fully permissive: do not block processing based on validation

    setIsProcessing(true)
    setMessage('')

    try {
      console.log('Starting upload process...')
      alert('Upload process started - check console for details')

      // Test Firestore connection first
      try {
        const testCollection = collection(db, 'products')
        console.log('Firestore connection test - collection created:', testCollection.path)
        console.log('Firebase project ID:', db.app.options.projectId)

        // Test if we can read from products collection (checks Firestore rules)
        try {
          const testQuery = query(testCollection, limit(1))
          const testSnapshot = await getDocs(testQuery)
          console.log('Firestore read test successful, found products:', testSnapshot.size)
        } catch (readError) {
          console.error('Firestore read test failed - possible rules issue:', readError)
          console.error('Read error details:', {
            message: readError.message,
            code: readError.code,
            name: readError.name
          })
        }
      } catch (firestoreError) {
        console.error('Firestore connection error:', firestoreError)
        console.error('Firestore error details:', {
          message: firestoreError.message,
          code: firestoreError.code,
          name: firestoreError.name,
          stack: firestoreError.stack
        })
        setMessage(`Firestore connection error: ${firestoreError.message}. Please check your Firebase configuration.`)
        setIsProcessing(false)
        return
      }

      let data
      try {
        data = JSON.parse(jsonData)
        console.log('JSON data parsed successfully')
      } catch (parseErr) {
        console.warn('JSON parse failed, storing raw text as document:', parseErr?.message)
        // Fallback: treat the entire text as a single document
        data = { _rawText: jsonData }
      }

      // Convert ANY JSON data to upload format - treat everything as documents
      let documents = []

      if (Array.isArray(data)) {
        // If it's an array, upload each item as a document
        documents = data.map((item, index) => ({
          id: `item_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data: item,
          type: 'array_item',
          originalIndex: index
        }))
      } else if (typeof data === 'object' && data !== null) {
        // If it's an object, convert to array of key-value pairs or upload as single document
        const keys = Object.keys(data)
        if (keys.length > 0) {
          // Try to extract arrays from common object structures
          if (data.products && Array.isArray(data.products)) {
            documents = data.products.map((item, index) => ({
              id: `product_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              data: item,
              type: 'product',
              originalIndex: index
            }))
          } else if (data.items && Array.isArray(data.items)) {
            documents = data.items.map((item, index) => ({
              id: `item_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              data: item,
              type: 'item',
              originalIndex: index
            }))
          } else if (data.data && Array.isArray(data.data)) {
            documents = data.data.map((item, index) => ({
              id: `data_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              data: item,
              type: 'data_item',
              originalIndex: index
            }))
          } else {
            // Upload the entire object as a single document
            documents = [{
              id: `object_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              data: data,
              type: 'object',
              keys: keys
            }]
          }
        }
      } else {
        // For primitive values (string, number, boolean), wrap in object
        documents = [{
          id: `value_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data: data,
          type: typeof data,
          value: String(data)
        }]
      }

      console.log(`Found ${documents.length} documents to upload`)
      const startTime = Date.now()
      console.log(`Upload started at ${new Date().toLocaleTimeString()}`)

      let successCount = 0
      let errorCount = 0
      const errors = []
      let processedCount = 0

      // Process documents in smaller batches for better performance
      const batchSize = 100 // Reduced from 500 for faster processing

      for (let i = 0; i < documents.length; i += batchSize) {
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(documents.length / batchSize)}`)
        const batch = writeBatch(db)
        const batchDocuments = documents.slice(i, i + batchSize)

        batchDocuments.forEach((document, index) => {
          try {
            // Decide behavior based on file type: for .json uploads, store ONLY original fields
            const isJsonUpload = uploadedFile && uploadedFile.name.toLowerCase().endsWith('.json')
            let documentData = {}

            if (isJsonUpload) {
              // Strict mode for JSON uploads: write exactly what exists in the JSON
              const original = document.data
              if (original && typeof original === 'object' && !Array.isArray(original)) {
                documentData = {
                  approved: true,
                  status: "approved",
                  ...original
                }
              } else {
                // Firestore documents must be objects; wrap primitives minimally
                documentData = { value: original, approved: true, status: "approved" }
              }
            } else {
              // Non-JSON uploads (CSV/Excel) keep enhancement for dashboard compatibility
              let detectedCategory = { category: 'Other', subcategory: 'General', confidence: 0.1 }

              if (document.type === 'product' || document.type === 'item' || document.type === 'data_item') {
                const product = document.data
                detectedCategory = product.category ?
                  { category: product.category, subcategory: product.subCategory || product.subcategory || 'General', confidence: 1.0 } :
                  detectCategory(product)

                const attrs = product.attributes || {};

                const weight =
                  attrs['Weight (Kg)'] ||
                  attrs['Weight'] ||
                  null;

                const height =
                  attrs['Height'] ||
                  null;

                const width =
                  attrs['Width'] ||
                  null;

                const length =
                  attrs['Length'] ||
                  null;



                documentData = {
                  ...product,
                  stock: typeof product.stock === 'number' ? product.stock : 0,


                  // ✅ keep name as-is
                  name: product.name || product.title || 'Unknown Product',

                  category: product.category || product.Category || 'N/A',
                  subcategory: product.subcategory || product.subCategory || 'No SubCategory',
                  price: typeof product.price === 'number' ? product.price : 0,
                  offerPrice: typeof product.offerPrice === 'number' ? product.offerPrice : 0,

                  // ✅ SKU / product id
                  sku: (product.sku || product.productId || '').toString(),

                  // ✅ approved status
                  approved: true,
                  status: "approved",

                  // ✅ metadata only
                  uploadedAt: serverTimestamp(),
                  source: 'json-upload',
                  documentType: document.type,
                  originalIndex: document.originalIndex
                };

                if (successCount < 3) {
                  console.log('Uploading product:', {
                    originalProduct: product,
                    enhancedProduct: documentData,
                    detectedCategory: detectedCategory
                  })
                }
              } else {
                // Raw data from non-JSON sources: wrap with metadata for traceability
                documentData = {
                  originalData: document.data,
                  documentType: document.type,
                  uploadTimestamp: serverTimestamp(),
                  source: 'json-upload',
                  uploadId: document.id
                }

                if (document.type === 'string' || document.type === 'number' || document.type === 'boolean') {
                  documentData.value = document.value
                  documentData.dataType = document.type
                }

                if (document.type === 'object' && document.keys) {
                  documentData.objectKeys = document.keys
                  documentData.objectSize = document.keys.length
                }
              }
            }



            const docRef = doc(collection(db, 'products'))
            const autoId = docRef.id   // Firestore auto ID

            const seoUrl = generateSeoUrl(
              documentData.name || documentData.title || "product",
              autoId
            )

            batch.set(docRef, {
              ...documentData,

              // 🔑 IDs
              productid: autoId,

              // 🌐 SEO URL
              seourl: seoUrl
            })



            successCount++
            processedCount++

            // Show progress every 50 documents
            if (processedCount % 50 === 0) {
              console.log(`Progress: ${processedCount}/${documents.length} documents processed`)
            }
          } catch (error) {
            errorCount++
            const documentName = document.id || `Document ${index + i + 1}`
            errors.push(`${documentName}: ${error.message}`)
            console.error(`Error processing document ${index + i + 1}:`, error)
          }

        })

        try {
          await batch.commit()
          console.log(`Batch ${Math.floor(i / batchSize) + 1} committed successfully`)
        } catch (error) {
          console.error(`Error committing batch ${Math.floor(i / batchSize) + 1}:`, error)
          console.error('Batch commit error details:', {
            message: error.message,
            code: error.code,
            name: error.name
          })
          // If batch commit fails, count all documents in this batch as errors
          errorCount += batchDocuments.length
          errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`)
        }
      }

      console.log(`Upload process completed. Success: ${successCount}, Errors: ${errorCount}`)
      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000
      console.log(`Upload completed in ${duration} seconds (${(successCount / duration).toFixed(2)} products/second)`)

      // Update upload history
      const newUpload = {
        id: Date.now(),
        filename: uploadedFile.name,
        uploadDate: new Date().toLocaleString(),
        status: errorCount === 0 ? 'success' : errorCount < documents.length ? 'partial' : 'error',  // ✅ documents.length
        recordsProcessed: documents.length,  // ✅ documents.length
        recordsSuccess: successCount,
        recordsError: errorCount
      }

      setUploadHistory(prev => [newUpload, ...prev])

      if (errorCount === 0) {
        setMessage(`Successfully uploaded ${successCount} documents to Firebase! All JSON data has been stored.`)
      } else {
        setMessage(`Upload completed with ${successCount} successes and ${errorCount} errors. Check console for details.`)
        console.error('Upload errors:', errors)
      }

      // Log summary for debugging
      console.log('Upload Summary:', {
        totalProcessed: documents.length,
        successCount: successCount,
        errorCount: errorCount,
        firstDocumentSample: documents.length > 0 ? documents[0] : null,
        documentTypes: [...new Set(documents.map(d => d.type))].join(', ')
      })

      // Reset form
      setUploadedFile(null)
      setJsonData('')
      setValidationResults(null)

    } catch (error) {
      console.error('Error during bulk upload:', error)
      console.error('Error stack:', error.stack)
      console.error('Error name:', error.name)
      setMessage(`Error during upload: ${error.message}. Please check the console for details.`)
    } finally {
      setIsProcessing(false)
    }
  }



  const deleteAllProducts = async () => {
    const confirmDelete = window.confirm('Are you sure you want to delete ALL products from Firebase? This action cannot be undone and will permanently remove all product data.')

    if (!confirmDelete) return

    setIsProcessing(true)
    setMessage('Starting deletion process...')

    try {
      let totalDeleted = 0
      const deletionResults = []

      // Step 1: Delete from main 'products' collection
      setMessage('Deleting from products collection...')
      const productsCollection = collection(db, 'products')
      const productsSnapshot = await getDocs(productsCollection)

      if (!productsSnapshot.empty) {
        // Process in chunks of 400 to avoid Firebase batch size limits
        const chunkSize = 400
        let productsDeleted = 0
        const allDocs = productsSnapshot.docs

        for (let i = 0; i < allDocs.length; i += chunkSize) {
          const chunk = allDocs.slice(i, i + chunkSize)
          const batch = writeBatch(db)

          chunk.forEach((docSnapshot) => {
            batch.delete(docSnapshot.ref)
            productsDeleted++
          })

          await batch.commit()

          // Update progress message
          setMessage(`Deleting from products collection... (${productsDeleted}/${allDocs.length} processed)`)

          // Add a small delay between chunks to avoid rate limiting
          if (i + chunkSize < allDocs.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        totalDeleted += productsDeleted
        deletionResults.push({ collection: 'products', deleted: productsDeleted, status: 'success' })
        console.log(`Deleted ${productsDeleted} products from main collection`)
      } else {
        deletionResults.push({ collection: 'products', deleted: 0, status: 'empty' })
      }

      // Step 2: Delete from other potential product collections
      setMessage(`Checking other collections... (${totalDeleted} deleted so far)`)
      const otherCollections = ['items', 'documents', 'data']

      for (const collectionName of otherCollections) {
        try {
          const collectionRef = collection(db, collectionName)
          const snapshot = await getDocs(collectionRef)

          if (!snapshot.empty) {
            // Check if these are product-like documents
            const productLikeDocs = snapshot.docs.filter(doc => {
              const data = doc.data()
              return data && (
                data.name ||
                data.productName ||
                data.title ||
                data.category ||
                data.price ||
                data.type === 'product'
              )
            })

            if (productLikeDocs.length > 0) {
              // Process in chunks of 400 to avoid Firebase batch size limits
              const chunkSize = 400
              let collectionDeleted = 0

              for (let i = 0; i < productLikeDocs.length; i += chunkSize) {
                const chunk = productLikeDocs.slice(i, i + chunkSize)
                const batch = writeBatch(db)

                chunk.forEach((docSnapshot) => {
                  batch.delete(docSnapshot.ref)
                  collectionDeleted++
                })

                await batch.commit()

                // Update progress message
                setMessage(`Deleting from ${collectionName}... (${collectionDeleted}/${productLikeDocs.length} processed, ${totalDeleted + collectionDeleted} total)`)

                // Add a small delay between chunks to avoid rate limiting
                if (i + chunkSize < productLikeDocs.length) {
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              }

              totalDeleted += collectionDeleted
              deletionResults.push({ collection: collectionName, deleted: collectionDeleted, status: 'success' })
              console.log(`Deleted ${collectionDeleted} product-like documents from ${collectionName} collection`)
            } else {
              deletionResults.push({ collection: collectionName, deleted: 0, status: 'no_products' })
            }
          } else {
            deletionResults.push({ collection: collectionName, deleted: 0, status: 'empty' })
          }
        } catch (collectionError) {
          console.error(`Error deleting from ${collectionName}:`, collectionError)
          deletionResults.push({ collection: collectionName, deleted: 0, status: 'error', error: collectionError.message })
        }
      }

      // Step 3: Clear all relevant localStorage items
      setMessage('Clearing local storage...')
      localStorage.removeItem('uploadHistory')
      localStorage.removeItem('jsonUploadHistory')
      localStorage.removeItem('products_cache')
      localStorage.removeItem('documents_cache')

      // Final message
      const successfulDeletions = deletionResults.filter(r => r.status === 'success' && r.deleted > 0)
      if (totalDeleted > 0) {
        setMessage(`✅ Successfully deleted ${totalDeleted} products from ${successfulDeletions.length} collections. Deletion complete!`)
      } else {
        setMessage('ℹ️ No products found to delete in any collection.')
      }

      console.log('Deletion results:', deletionResults)
      console.log(`Total products deleted: ${totalDeleted}`)

      // Refresh stats after deletion
      await fetchStats()

    } catch (error) {
      console.error('Error during deletion process:', error)
      setMessage(`❌ Error occurred while deleting products: ${error.message}. Please try again.`)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // ---------- Category Detection Function ---------- 
  const detectCategory = (product) => {
    // Quick category detection with optimized keyword matching
    const searchableText = [
      product.name,
      product.title,
      product.productName,
      product.description,
      product.category,
      product.subcategory,
      product.subCategory,
      product.type,
      product.productType,
      product.tags,
      product.keywords
    ].filter(Boolean).map(field =>
      Array.isArray(field) ? field.join(' ') : String(field).toLowerCase()
    ).join(' ');

    // Quick category detection - check most common categories first
    if (searchableText.includes('phone') || searchableText.includes('smartphone') || searchableText.includes('mobile')) {
      return { category: 'Mobile', subcategory: 'Smartphone', confidence: 0.9 };
    }

    if (searchableText.includes('laptop') || searchableText.includes('notebook')) {
      return { category: 'Laptop', subcategory: 'Laptop', confidence: 0.9 };
    }

    // Check for clothing (most common category)
    const clothingKeywords = ['shirt', 'dress', 'tshirt', 'kurti', 'top', 'pant', 'jean', 'cloth'];
    const foundClothing = clothingKeywords.find(keyword => searchableText.includes(keyword));
    if (foundClothing) {
      return { category: 'Clothing', subcategory: foundClothing.charAt(0).toUpperCase() + foundClothing.slice(1), confidence: 0.8 };
    }

    // Check for mobile keywords
    const mobileKeywords = CATEGORY_KEYWORDS.mobile;
    const foundMobileKeywords = mobileKeywords.filter(keyword =>
      searchableText.includes(keyword.toLowerCase())
    );

    if (foundMobileKeywords.length > 0) {
      return {
        category: 'Mobile',
        subcategory: foundMobileKeywords[0].charAt(0).toUpperCase() + foundMobileKeywords[0].slice(1),
        confidence: Math.min(foundMobileKeywords.length * 0.2, 1.0)
      };
    }

    // Check for laptop keywords
    const laptopKeywords = CATEGORY_KEYWORDS.laptop;
    const foundLaptopKeywords = laptopKeywords.filter(keyword =>
      searchableText.includes(keyword.toLowerCase())
    );

    if (foundLaptopKeywords.length > 0) {
      return {
        category: 'Laptop',
        subcategory: foundLaptopKeywords[0].charAt(0).toUpperCase() + foundLaptopKeywords[0].slice(1),
        confidence: Math.min(foundLaptopKeywords.length * 0.2, 1.0)
      };
    }

    // Quick check for other categories
    if (searchableText.includes('tv') || searchableText.includes('television') || searchableText.includes('camera')) {
      return { category: 'Electronics', subcategory: 'Electronics', confidence: 0.7 };
    }

    if (searchableText.includes('shoe') || searchableText.includes('sandal') || searchableText.includes('boot')) {
      return { category: 'Footwear', subcategory: 'Footwear', confidence: 0.7 };
    }

    if (searchableText.includes('jewellery') || searchableText.includes('necklace') || searchableText.includes('ring')) {
      return { category: 'Jewellery', subcategory: 'Jewellery', confidence: 0.7 };
    }

    // Check for footwear keywords
    const footwearKeywords = CATEGORY_KEYWORDS.footwear;
    const foundFootwearKeywords = footwearKeywords.filter(keyword =>
      searchableText.includes(keyword.toLowerCase())
    );

    if (foundFootwearKeywords.length > 0) {
      return {
        category: 'Footwear',
        subcategory: foundFootwearKeywords[0].charAt(0).toUpperCase() + foundFootwearKeywords[0].slice(1),
        confidence: Math.min(foundFootwearKeywords.length * 0.2, 1.0)
      };
    }

    // Check for jewellery keywords
    const jewelleryKeywords = CATEGORY_KEYWORDS.jewellery;
    const foundJewelleryKeywords = jewelleryKeywords.filter(keyword =>
      searchableText.includes(keyword.toLowerCase())
    );

    if (foundJewelleryKeywords.length > 0) {
      return {
        category: 'Jewellery',
        subcategory: foundJewelleryKeywords[0].charAt(0).toUpperCase() + foundJewelleryKeywords[0].slice(1),
        confidence: Math.min(foundJewelleryKeywords.length * 0.2, 1.0)
      };
    }

    // Check for home keywords
    const homeKeywords = CATEGORY_KEYWORDS.home;
    const foundHomeKeywords = homeKeywords.filter(keyword =>
      searchableText.includes(keyword.toLowerCase())
    );

    if (foundHomeKeywords.length > 0) {
      return {
        category: 'Home',
        subcategory: foundHomeKeywords[0].charAt(0).toUpperCase() + foundHomeKeywords[0].slice(1),
        confidence: Math.min(foundHomeKeywords.length * 0.2, 1.0)
      };
    }

    // Default category if no match found
    return { category: 'Other', subcategory: 'General', confidence: 0.1 };
  }

  // ---------- Subcategory Detection Logic ----------
  function detectSubcategory(category, name = "", description = "") {
    const text = (name + " " + description).toLowerCase();

    if (category === "mobile") {
      if (text.includes("smartphone")) return "smartphone";
      if (text.includes("feature phone")) return "feature phone";
      return "mobile";
    }

    if (category === "laptop") {
      if (text.includes("gaming")) return "gaming laptop";
      if (text.includes("ultrabook")) return "ultrabook";
      return "laptop";
    }

    if (category === "electronics") {
      if (text.includes("tv")) return "tv";
      if (text.includes("camera")) return "camera";
      if (text.includes("headphone")) return "headphone";
      if (text.includes("speaker")) return "speaker";
      return "electronics";
    }

    if (category === "footwear") {
      if (text.includes("sneaker")) return "sneaker";
      if (text.includes("boot")) return "boot";
      if (text.includes("sandal")) return "sandal";
      if (text.includes("shoe")) return "shoe";
      return "footwear";
    }

    if (category === "jewellery") {
      if (text.includes("necklace")) return "necklace";
      if (text.includes("earring")) return "earring";
      if (text.includes("ring")) return "ring";
      if (text.includes("bracelet")) return "bracelet";
      if (text.includes("bangle")) return "bangle";
      if (text.includes("pendant")) return "pendant";
      return "jewellery";
    }

    if (category === "home") {
      if (text.includes("furniture")) return "furniture";
      if (text.includes("decoration")) return "decoration";
      if (text.includes("kitchen")) return "kitchen";
      if (text.includes("bedroom")) return "bedroom";
      if (text.includes("bathroom")) return "bathroom";
      return "home";
    }

    // Check clothing subcategories
    const clothingMap = SUBCATEGORY_KEYWORDS.clothing;
    // Handle both array and object forms gracefully
    if (Array.isArray(clothingMap)) {
      // If it's an array of keywords, return the first matching keyword as subcategory
      for (const keyword of clothingMap) {
        if (typeof keyword === 'string' && text.includes(keyword.toLowerCase())) {
          return keyword;
        }
      }
    } else if (clothingMap && typeof clothingMap === 'object') {
      // If it's an object of { subcat: [keywords...] }, check each list
      for (const [subcat, keywords] of Object.entries(clothingMap)) {
        const list = Array.isArray(keywords) ? keywords : [keywords];
        if (list.some(kw => typeof kw === 'string' && text.includes(kw.toLowerCase()))) {
          return subcat;
        }
      }
    }

    return category; // Default to category name if no specific subcategory found
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">JSON Bulk Upload</h1>
        <p className="text-gray-600 text-sm sm:text-base">Upload products in bulk using JSON files</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">Total Uploads</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{uploadHistory.length}</p>
            </div>
            <div className="text-blue-600">
              <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">Successful</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{uploadHistory.filter(upload => upload.status === 'success').length}</p>
            </div>
            <div className="text-green-600">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">Failed</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{uploadHistory.filter(upload => upload.status === 'error').length}</p>
            </div>
            <div className="text-red-600">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">Last Upload</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">{uploadHistory.length > 0 ? uploadHistory[0].uploadDate : 'No uploads yet'}</p>
            </div>
            <div className="text-purple-600">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Instructions */}
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6 border border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Upload Any JSON File</h3>
        <p className="text-gray-600 mb-4 text-sm sm:text-base">Upload ANY JSON data - products, configurations, settings, or any other JSON format. No specific structure required!</p>



        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center bg-white">
          <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-sm sm:text-base">Drag and drop your JSON, CSV, or Excel file here, or click to browse</p>
          <input
            type="file"
            accept=".json,.csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-2 rounded-lg hover:bg-blue-700 cursor-pointer inline-block text-sm sm:text-base transition-colors duration-200"
          >
            Choose File
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        {/* <button 
          onClick={deleteAllProducts}
          disabled={isProcessing}
          className="bg-red-600 text-white px-4 py-3 sm:px-6 rounded-lg hover:bg-red-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          <X className="w-4 h-4 mr-2" />
          {isProcessing ? 'Deleting All Products...' : 'Delete All Products from Firebase'}
        </button> */}
        {/* <button 
          onClick={() => {
            // Test button for debugging
            const testData = [
              {
                "name": "Test Product 1",
                "price": 99.99,
                "category": "Electronics",
                "subCategory": "Mobile"
              },
              {
                "name": "Test Product 2", 
                "price": 149.99,
                "category": "Clothing",
                "subCategory": "Shirts"
              }
            ]
            const jsonStr = JSON.stringify(testData)
            setJsonData(jsonStr)
            validateJson(jsonStr)
            setUploadedFile({ name: 'test_products.json' })
          }}
          className="bg-purple-600 text-white px-4 py-3 sm:px-6 rounded-lg hover:bg-purple-700 flex items-center justify-center text-sm sm:text-base"
        >
          <FileText className="w-4 h-4 mr-2" />
          Load Test Data
        </button>
        <button 
          onClick={async () => {
            // Test Firestore connection
            try {
              console.log('Testing Firestore connection...')
              const testCollection = collection(db, 'products')
              const testQuery = query(testCollection, limit(1))
              const testSnapshot = await getDocs(testQuery)
              console.log('Firestore connection test successful!')
              console.log('Found products:', testSnapshot.size)
              alert('Firestore connection successful!')
            } catch (error) {
              console.error('Firestore connection test failed:', error)
              alert(`Firestore connection failed: ${error.message}`)
            }
          }}
          className="bg-orange-600 text-white px-4 py-3 sm:px-6 rounded-lg hover:bg-orange-700 flex items-center justify-center text-sm sm:text-base"
        >
          <FileText className="w-4 h-4 mr-2" />
          Test Firestore
        </button> */}
      </div>

      {/* File Upload Section */}
      {uploadedFile && (
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6 relative border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-all">Uploaded File: {uploadedFile.name}</h3>
            <button
              onClick={cancelUpload}
              className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1"
              title="Cancel upload"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {validationResults && (
            <div className="mb-4">
              <div className={`p-3 sm:p-4 rounded-lg ${validationResults.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                <h4 className={`font-semibold mb-2 text-sm sm:text-base ${validationResults.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                  {validationResults.isValid ? 'Validation Passed' : 'Validation Failed'}
                </h4>
                <p className="text-gray-700 mb-2 text-sm sm:text-base">Records found: {validationResults.recordCount}</p>

                {validationResults.errors.length > 0 && (
                  <div className="mb-2">
                    <p className="text-red-600 font-medium">Errors:</p>
                    <ul className="text-red-700 text-sm list-disc list-inside">
                      {validationResults.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResults.warnings.length > 0 && (
                  <div>
                    <p className="text-yellow-600 font-medium">Warnings:</p>
                    <ul className="text-yellow-700 text-sm list-disc list-inside">
                      {validationResults.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResults.categoryPreview && validationResults.categoryPreview.length > 0 && (
                  <div className="mt-4">
                    <p className="text-blue-600 font-medium">Category Detection Preview (First 5 Products):</p>
                    <div className="mt-2 space-y-1">
                      {validationResults.categoryPreview.map((preview, index) => (
                        <div key={index} className="text-blue-700 text-sm">
                          • {preview.name} → {preview.detectedCategory} / {preview.detectedSubcategory}
                          (confidence: {Math.round(preview.confidence * 100)}%)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={() => {
                console.log('Upload button clicked')
                alert('Upload button clicked')
                processUpload()
              }}
              disabled={!validationResults?.isValid || isProcessing}
              className="bg-green-600 text-white px-4 py-3 sm:px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base transition-colors duration-200"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Process Upload'}
            </button>


          </div>

          {message && (
            <div className="mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm sm:text-base">{message}</p>
            </div>
          )}
        </div>
      )}

      {/* Upload History */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Upload History</h2>
          <p className="text-gray-600 text-xs sm:text-sm">Record of previous uploads</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">DATE & TIME</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">STATUS</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">TOTAL PRODUCTS</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">FILE NAME</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {uploadHistory.map((upload) => (
                <tr key={upload.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{upload.uploadDate}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(upload.status)}`}>
                      {upload.status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {upload.status === 'partial' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {upload.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                      {upload.status === 'success' ? 'Success' : upload.status === 'partial' ? 'Partial' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{upload.recordsProcessed}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 truncate max-w-[150px]">{upload.filename}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-red-500 hover:text-red-700 transition-colors duration-200">
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default JsonBulkUpload