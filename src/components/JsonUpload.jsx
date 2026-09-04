import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const JsonUpload = ({ isOpen, onClose, onUpload }) => {
  const [file, setFile] = useState(null);
  const [jsonData, setJsonData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, processing, success, error
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'json') {
      setErrors(['Only JSON files are supported']);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    parseJsonFile(selectedFile);
  };

  const parseJsonFile = (file) => {
    setIsProcessing(true);
    
    // Check file size first (limit to 5MB for browser memory)
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
      setErrors([`File too large (${(file.size/1024/1024).toFixed(1)}MB). Maximum allowed: 5MB. Try uploading smaller batches.`]);
      setIsProcessing(false);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Replace NaN with null and fix trailing commas to make valid JSON
        let jsonText = e.target.result
          .replace(/:\s*NaN/g, ': null')
          .replace(/,\s*([}\]])/g, '$1');
        let jsonContent = JSON.parse(jsonText);
        
        // Check if it's an array
        if (!Array.isArray(jsonContent)) {
          setErrors(['JSON file must be in array format']);
          setIsProcessing(false);
          return;
        }

        // No product count limit - allow unlimited products

        // Process in chunks to avoid memory issues
        let processedData = [];
        const originalLength = jsonContent.length;
        
        const processChunk = (startIndex) => {
          const chunkSize = 50;
          const endIndex = Math.min(startIndex + chunkSize, originalLength);
          const chunk = jsonContent.slice(startIndex, endIndex);
          
          // Clean NaN values for current chunk
          const cleanedChunk = chunk.map(item => ({
            ...item,
            price: Number.isNaN(Number(item.price)) ? 0 : Number(item.price),
            offerPrice: Number.isNaN(Number(item.offerPrice)) ? 0 : Number(item.offerPrice),
            stock: Number.isNaN(Number(item.stock)) ? 0 : Number(item.stock),
            rating: Number.isNaN(Number(item.rating)) ? 0 : Number(item.rating),
            size: item.size === null || item.size === undefined ? NaN : item.size,
            variants: Array.isArray(item.variants) ? item.variants.map(variant => ({
              ...variant,
              price: Number.isNaN(Number(variant.price)) ? 0 : Number(variant.price),
              stock: Number.isNaN(Number(variant.stock)) ? 0 : Number(variant.stock),
              size: variant.size === null || variant.size === undefined ? NaN : variant.size
            })) : []
          }));
          
          // Accumulate processed data
          processedData = processedData.concat(cleanedChunk);
          
          // Continue processing or validate
          if (endIndex < originalLength) {
            setTimeout(() => processChunk(endIndex), 10); // Small delay to prevent blocking
          } else {
            // All chunks processed, now validate
            validateJsonData(processedData);
            setIsProcessing(false);
          }
        };
        
        // Start chunk processing
        processChunk(0);
        
      } catch (error) {
        setErrors([`JSON parsing error: ${error.message}`]);
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      setErrors(['File reading error occurred']);
      setIsProcessing(false);
    };
    
    reader.readAsText(file);
  };

  const validateJsonData = (data) => {
    const validationErrors = [];
    const validatedData = [];

    data.forEach((item, index) => {
      const rowNumber = index + 1;
      const rowErrors = [];

      // Check required fields
      if (!item.name || !item.name.trim()) {
        rowErrors.push(`Row ${rowNumber}: 'name' field required`);
      }
      if (!item.description || !item.description.trim()) {
        rowErrors.push(`Row ${rowNumber}: 'description' field required`);
      }
      if (!item.category || !item.category.trim()) {
        rowErrors.push(`Row ${rowNumber}: 'category' field required`);
      }
      if (!item.price || isNaN(parseFloat(item.price)) || parseFloat(item.price) <= 0) {
        rowErrors.push(`Row ${rowNumber}: Valid 'price' field required`);
      }
      if (!item.stock || isNaN(parseInt(item.stock)) || parseInt(item.stock) < 0) {
        rowErrors.push(`Row ${rowNumber}: Valid 'stock' field required`);
      }

      // Validate images array if present
      if (item.images && !Array.isArray(item.images)) {
        rowErrors.push(`Row ${rowNumber}: Images must be an array`);
      }
      
      // Validate variants array if present (both variants and sizeVariants)
      const variantsToCheck = item.variants || item.sizeVariants;
      if (variantsToCheck) {
        if (!Array.isArray(variantsToCheck)) {
          rowErrors.push(`Row ${rowNumber}: Variants must be an array`);
        } else if (variantsToCheck.length > 0) {
          variantsToCheck.forEach((variant, vIndex) => {
            if (!variant.sku) {
              rowErrors.push(`Row ${rowNumber}, Variant ${vIndex + 1}: SKU is required`);
            }
            // Size is optional, can be NaN or any value
            if (isNaN(parseInt(variant.stock)) || parseInt(variant.stock) < 0) {
              rowErrors.push(`Row ${rowNumber}, Variant ${vIndex + 1}: Valid stock is required`);
            }
            if (isNaN(parseFloat(variant.price)) || parseFloat(variant.price) <= 0) {
              rowErrors.push(`Row ${rowNumber}, Variant ${vIndex + 1}: Valid price is required`);
            }
          });
        }
      }
      
      // Validate rating if present
      if (item.rating && (isNaN(parseFloat(item.rating)) || parseFloat(item.rating) < 0 || parseFloat(item.rating) > 5)) {
        rowErrors.push(`Row ${rowNumber}: Rating must be between 0 and 5`);
      }
      
      // Validate cashOnDelivery type
      if (item.cashOnDelivery !== undefined && typeof item.cashOnDelivery !== 'boolean') {
        rowErrors.push(`Row ${rowNumber}: cashOnDelivery must be true or false`);
      }

      if (rowErrors.length === 0) {
          const processedItem = {
            ...item,
            productId: item.productId || `PROD_${Date.now()}_${index}`,
            price: parseFloat(item.price),
            stock: parseInt(item.stock),
            offerPrice: item.offerPrice ? parseFloat(item.offerPrice) : 0,
            rating: item.rating ? parseFloat(item.rating) : 0,
            cashOnDelivery: item.cashOnDelivery !== undefined ? item.cashOnDelivery : true,
            timestamp: item.timestamp || new Date().toISOString(),
            images: item.images || (item.image ? [item.image] : []),
            variants: Array.isArray(item.variants) ? item.variants.map(v => ({
              sku: v.sku || '',
              size: v.size || '',
              price: parseFloat(v.price) || 0,
              stock: parseInt(v.stock) || 0,
              color: v.color || '',
              material: v.material || ''
            })) : (Array.isArray(item.sizeVariants) ? item.sizeVariants.map(v => ({
              sku: v.sku || '',
              size: v.size || '',
              price: parseFloat(v.price) || 0,
              stock: parseInt(v.stock) || 0,
              color: v.color || '',
              material: v.material || ''
            })) : []),
            sizeVariants: Array.isArray(item.sizeVariants) ? item.sizeVariants.map(v => ({
              sku: v.sku || '',
              size: v.size || '',
              price: parseFloat(v.price) || 0,
              stock: parseInt(v.stock) || 0,
              color: v.color || '',
              material: v.material || ''
            })) : (Array.isArray(item.variants) ? item.variants.map(v => ({
              sku: v.sku || '',
              size: v.size || '',
              price: parseFloat(v.price) || 0,
              stock: parseInt(v.stock) || 0,
              color: v.color || '',
              material: v.material || ''
            })) : []),
            subcategory: item.subcategory || item.subCategory || '',
            date: new Date().toISOString().split('T')[0]
          };
          
          // Debug logging for sizeVariants
          console.log('Processing item:', item.name);
          console.log('Original sizeVariants:', item.sizeVariants);
          console.log('Processed sizeVariants:', processedItem.sizeVariants);
          
          validatedData.push(processedItem);
      }

      validationErrors.push(...rowErrors);
    });

    setErrors(validationErrors);
    setJsonData(validatedData);
  };

  const handleUpload = async () => {
    if (jsonData.length === 0) {
      setErrors(['No valid data found for upload']);
      return;
    }

    setUploadStatus('processing');
    setUploadProgress(0);

    try {
      // Debug logging before upload
      console.log('Uploading data:', jsonData);
      jsonData.forEach((item, index) => {
        console.log(`Item ${index + 1} sizeVariants:`, item.sizeVariants);
      });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onUpload(jsonData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');
      
      // Auto close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      setUploadStatus('error');
      setErrors([`Upload failed: ${error.message}`]);
    }
  };

  const downloadTemplate = () => {
    // Empty template structure - users will add their own product data
    const templateData = [
      {
        productId: "",
        name: "",
        description: "",
        category: "",
        subcategory: "",
        sku: "",
        brand: "",
        price: 0,
        offerPrice: 0,
        stock: 0,
        rating: 0,
        timestamp: "",
        images: [],
        cashOnDelivery: true,
        variants: [
          {
            sku: "SKU_175759456000_3xtwwv",
            size: "S",
            price: 343,
            stock: 25,
            color: "Red",
            material: "Cotton"
          },
          {
            sku: "SKU_175759456001_3xtwwv",
            size: "M",
            price: 343,
            stock: 30,
            color: "Blue",
            material: "Cotton"
          }
        ],
        sizeVariants: [
          {
            sku: "SKU_175759456000_3xtwwv",
            size: "S",
            price: 343,
            stock: 25,
            color: "Red",
            material: "Cotton"
          },
          {
            sku: "SKU_175759456001_3xtwwv",
            size: "M",
            price: 343,
            stock: 30,
            color: "Blue",
            material: "Cotton"
          }
        ]
      }
    ];

    // Ensure no NaN values by explicitly checking and converting
    const cleanTemplateData = templateData.map(item => ({
      ...item,
      price: Number.isNaN(item.price) ? 0 : item.price,
      offerPrice: Number.isNaN(item.offerPrice) ? 0 : item.offerPrice,
      stock: Number.isNaN(item.stock) ? 0 : item.stock,
      rating: Number.isNaN(item.rating) ? 0 : item.rating
    }));

    const jsonString = JSON.stringify(cleanTemplateData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-template-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setJsonData([]);
    setErrors([]);
    setUploadProgress(0);
    setUploadStatus('idle');
    setIsProcessing(false);
    onClose();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">JSON Bulk Upload</h2>
            <p className="text-sm text-gray-400 mt-1">Upload multiple products using JSON file</p>
          </div>
          <button
            onClick={handleClose}
            disabled={uploadStatus === 'processing'}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Template Download */}
          <div className="mb-6">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Flexible JSON Upload Enabled!</span>
              </div>
              <p className="text-sm text-green-300">
                 You can now upload JSON files in any format. Missing fields will be automatically filled with default values.
               </p>
               <p className="text-xs text-green-400 mt-1">
                 Only "name" field is required - all other fields are optional!
               </p>
            </div>
            
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download JSON Template (Optional)
            </button>
            <p className="text-sm text-gray-400 mt-2">
              Template download is optional - you can use any JSON format<br/>
              <span className="text-yellow-400">⚠️ 5MB file size limit (unlimited products)</span>
            </p>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-green-500 bg-green-900/20' : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-green-400" />
                <div>
                  <p className="font-medium text-green-400">{file.name}</p>
                  <p className="text-sm text-green-300">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-2">
                  Drop your JSON file here
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  or click to select file (only .json files)
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Select File
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="mt-6 flex items-center justify-center gap-3 p-4 bg-blue-900/50 rounded-lg">
              <Loader className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-blue-300">Processing file...</span>
            </div>
          )}

          {/* Upload Progress */}
          {uploadStatus === 'processing' && (
            <div className="mt-6 p-4 bg-blue-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-300">Uploading products...</span>
                <span className="text-sm text-blue-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="mt-6 flex items-center gap-3 p-4 bg-green-900/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-medium">
                {jsonData.length} products successfully uploaded!
              </span>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-6 p-4 bg-red-900/50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-300 mb-2">Validation Errors:</h4>
                  <ul className="text-sm text-red-400 space-y-1 max-h-40 overflow-y-auto">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Data Preview */}
          {jsonData.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-white mb-3">
                Valid Products Preview ({jsonData.length} items):
              </h4>
              <div className="bg-gray-700 rounded-lg p-4 max-h-60 overflow-auto">
                <div className="space-y-4">
                  {jsonData.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-800 rounded border border-gray-700 space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">Product ID</div>
                          <div className="text-white font-medium">{item.productId || 'Auto-generated'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Name</div>
                          <div className="text-white font-medium">{item.name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Category</div>
                          <div className="text-white">{item.category}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">Price</div>
                          <div className="text-white">₹{item.price}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Offer Price</div>
                          <div className="text-green-400">₹{item.offerPrice || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Stock</div>
                          <div className="text-white">{item.stock}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Rating</div>
                          <div className="text-yellow-400">{item.rating || 'N/A'} ⭐</div>
                        </div>
                      </div>
                      
                      {item.images && item.images.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Images ({item.images.length})</div>
                          <div className="text-blue-400 text-sm truncate">{item.images[0]}</div>
                          {item.images.length > 1 && (
                            <div className="text-gray-500 text-xs">+{item.images.length - 1} more images</div>
                          )}
                        </div>
                      )}
                      
                      {(item.variants && item.variants.length > 0) || (item.sizeVariants && item.sizeVariants.length > 0) ? (
                        <div>
                          <div className="text-sm text-gray-400 mb-1">
                            {item.variants && item.variants.length > 0 ? `Variants (${item.variants.length})` : ''}
                            {item.variants && item.variants.length > 0 && item.sizeVariants && item.sizeVariants.length > 0 ? ' | ' : ''}
                            {item.sizeVariants && item.sizeVariants.length > 0 ? `Size Variants (${item.sizeVariants.length})` : ''}
                          </div>
                          <div className="space-y-2">
                            {item.variants && item.variants.length > 0 && (
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Variants:</div>
                                <div className="flex flex-wrap gap-1">
                                  {item.variants.slice(0, 3).map((variant, vIndex) => (
                                    <span key={vIndex} className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded">
                                      {variant.size} - ₹{variant.price}
                                    </span>
                                  ))}
                                  {item.variants.length > 3 && (
                                    <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                                      +{item.variants.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {item.sizeVariants && item.sizeVariants.length > 0 && (
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Size Variants:</div>
                                <div className="flex flex-wrap gap-1">
                                  {item.sizeVariants.slice(0, 3).map((variant, vIndex) => (
                                    <span key={vIndex} className="px-2 py-1 bg-purple-900 text-purple-300 text-xs rounded">
                                      {variant.size} - ₹{variant.price} (Stock: {variant.stock})
                                    </span>
                                  ))}
                                  {item.sizeVariants.length > 3 && (
                                    <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                                      +{item.sizeVariants.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">Brand</div>
                          <div className="text-gray-300">{item.brand || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">COD</div>
                          <div className={`text-sm ${item.cashOnDelivery ? 'text-green-400' : 'text-red-400'}`}>
                            {item.cashOnDelivery ? 'Available' : 'Not Available'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700 bg-gray-900 flex-shrink-0">
          <button
            onClick={handleClose}
            disabled={uploadStatus === 'processing'}
            className="px-6 py-2 text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={jsonData.length === 0 || uploadStatus === 'processing' || errors.length > 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploadStatus === 'processing' ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {jsonData.length} Products
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonUpload;