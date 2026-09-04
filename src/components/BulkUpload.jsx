import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
// Import xlsx directly but ensure it's properly configured in vite.config.js
import * as XLSX from 'xlsx';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const BulkUpload = ({ isOpen, onClose, onUpload, categories, subCategories }) => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, processing, success, error
  const fileInputRef = useRef(null);

  const requiredColumns = [
    'name', 'description', 'stock', 'sku', 'price', 'offerprice',
    'category', 'subcategory', 'brand', 'cashondelivery', 'image', 'attribute'
  ];

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      setErrors(['Only CSV or Excel files are supported']);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    parseFile(selectedFile);
  };

  const parseFile = (file) => {
    setIsProcessing(true);
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      // Parse CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('Parsed data:', results.data);
          console.log('Available categories:', categories);
          console.log('Available subcategories:', subCategories);
          validateData(results.data);
          setIsProcessing(false);
        },
        error: (error) => {
          setErrors([`File parsing error: ${error.message}`]);
          setIsProcessing(false);
        }
      });
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
      // Parse Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Convert to object format with headers
          if (jsonData.length > 0) {
            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            const parsedData = rows.map(row => {
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
              });
              return obj;
            }).filter(row => Object.values(row).some(val => val !== ''));
            
            console.log('Parsed Excel data:', parsedData);
            console.log('Available categories:', categories);
            console.log('Available subcategories:', subCategories);
            validateData(parsedData);
          } else {
            setErrors(['Excel file is empty']);
          }
          setIsProcessing(false);
        } catch (error) {
          setErrors([`Excel parsing error: ${error.message}`]);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const validateData = (data) => {
    const validationErrors = [];
    const validatedData = [];

    // Check if required columns exist
    if (data.length === 0) {
      validationErrors.push('File is empty or no data found');
      setErrors(validationErrors);
      return;
    }

    const fileColumns = Object.keys(data[0]);
    console.log('File columns (original):', fileColumns);
    
    // Create case-insensitive column mapping
    const columnMapping = {};
    fileColumns.forEach(col => {
      const normalizedCol = col.toLowerCase().trim();
      columnMapping[normalizedCol] = col;
    });
    
    console.log('Column mapping:', columnMapping);
    
    // Check for missing columns (case-insensitive)
    const missingColumns = requiredColumns.filter(col => {
      const normalizedRequired = col.toLowerCase();
      return !Object.keys(columnMapping).includes(normalizedRequired);
    });
    
    if (missingColumns.length > 0) {
      validationErrors.push(`Missing columns: ${missingColumns.join(', ')}`);
    }

    // Validate each row
    data.forEach((row, index) => {
      const rowErrors = [];
      const rowNumber = index + 2; // +2 because index starts from 0 and we have header

      // Helper function to get value with case-insensitive column name
      const getValue = (columnName) => {
        const normalizedName = columnName.toLowerCase();
        const actualColumnName = columnMapping[normalizedName];
        return actualColumnName ? row[actualColumnName] : undefined;
      };

      // Required field validation
      if (!getValue('name')?.trim()) rowErrors.push(`Row ${rowNumber}: Product name required`);
      if (!getValue('description')?.trim()) rowErrors.push(`Row ${rowNumber}: Description required`);
      if (!getValue('category')?.trim()) rowErrors.push(`Row ${rowNumber}: Category required`);
      if (!getValue('subcategory')?.trim()) rowErrors.push(`Row ${rowNumber}: SubCategory required`);
      if (!getValue('brand')?.trim()) rowErrors.push(`Row ${rowNumber}: Brand required`);
      if (!getValue('sku')?.trim()) rowErrors.push(`Row ${rowNumber}: SKU required`);

      // Price validation
      const price = parseFloat(getValue('price'));
      if (isNaN(price) || price <= 0) {
        rowErrors.push(`Row ${rowNumber}: Valid price required`);
      }

      // Offer Price validation
      const offerPriceValue = getValue('offerprice');
      const offerPrice = parseFloat(offerPriceValue);
      if (offerPriceValue && (isNaN(offerPrice) || offerPrice < 0)) {
        rowErrors.push(`Row ${rowNumber}: Valid offer price required`);
      }

      // Stock validation
      const stock = parseInt(getValue('stock'));
      if (isNaN(stock) || stock < 0) {
        rowErrors.push(`Row ${rowNumber}: Valid stock quantity required`);
      }

      // Cash on Delivery validation
      const codValue = getValue('cashondelivery');
      if (codValue && !['yes', 'no'].includes(codValue.toLowerCase())) {
        rowErrors.push(`Row ${rowNumber}: Cash on Delivery must be 'Yes' or 'No'`);
      }

      // Category validation
      const categoryValue = getValue('category');
      if (categoryValue && !categories.some(cat => cat.name.toLowerCase() === categoryValue.toLowerCase())) {
        const availableCategories = categories.map(cat => cat.name).join(', ');
        rowErrors.push(`Row ${rowNumber}: Category '${categoryValue}' not found. Available categories: ${availableCategories || 'None'}`);
      }

      // SubCategory validation
      const subcategoryValue = getValue('subcategory');
      if (subcategoryValue && !subCategories.some(sub => sub.name.toLowerCase() === subcategoryValue.toLowerCase())) {
        const availableSubCategories = subCategories.map(sub => sub.name).join(', ');
        rowErrors.push(`Row ${rowNumber}: SubCategory '${subcategoryValue}' not found. Available subcategories: ${availableSubCategories || 'None'}`);
      }

      // URL validation (basic)
      const imageValue = getValue('image');
      if (imageValue && !imageValue.startsWith('http')) {
        rowErrors.push(`Row ${rowNumber}: Invalid image URL`);
      }

      if (rowErrors.length === 0) {
        validatedData.push({
          name: getValue('name'),
          description: getValue('description'),
          category: getValue('category'),
          subCategory: getValue('subcategory'),
          brand: getValue('brand'),
          sku: getValue('sku'),
          price: price,
          offerPrice: offerPrice || 0,
          stock: stock,
          cashOnDelivery: getValue('cashondelivery') || 'Yes',
          image: getValue('image') || '',
          attributes: getValue('attribute') || '',
          date: new Date().toISOString().split('T')[0]
        });
      }

      validationErrors.push(...rowErrors);
    });

    setErrors(validationErrors);
    setParsedData(validatedData);
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      setErrors(['No valid data found for upload']);
      return;
    }

    setUploadStatus('processing');
    setUploadProgress(0);

    try {
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

      await onUpload(parsedData);
      
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
    const templateData = [
      {
        name: 'Sample Product 1',
        description: 'This is a sample product description with detailed features and specifications',
        stock: 50,
        sku: 'SP001',
        price: 999,
        offerprice: 799,
        category: 'Fashion',
        subcategory: 'Clothing',
        brand: 'Sample Brand',
        cashondelivery: 'Yes',
        image: 'https://example.com/image1.jpg',
        attribute: 'Color: Red, Size: M, Material: Cotton'
      },
      {
        name: 'Sample Product 2',
        description: 'Another sample product with advanced technology and modern design',
        stock: 25,
        sku: 'SP002',
        price: 15999,
        offerprice: 14999,
        category: 'Electronics',
        subcategory: 'Mobile',
        brand: 'Tech Brand',
        cashondelivery: 'No',
        image: 'https://example.com/image2.jpg',
        attribute: 'RAM: 8GB, Storage: 128GB, Color: Black'
      }
    ];

    try {
      // Create Excel workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      });
      
      // Create blob and download
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk_upload_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      // Fallback to CSV if Excel generation fails
      const csvContent = Papa.unparse(templateData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk_upload_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Product Upload</h2>
            <p className="text-sm text-gray-600 mt-1">Upload multiple products using Excel or CSV file</p>
          </div>
          <button
            onClick={handleClose}
            disabled={uploadStatus === 'processing'}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Template Download */}
          <div className="mb-6">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Excel Template
            </button>
            <p className="text-sm text-gray-600 mt-2">
              First download the Excel template and fill your product data
            </p>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{file.name}</p>
                  <p className="text-sm text-green-600">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop your Excel file here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to select file (Excel/CSV supported)
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
            accept=".csv,.xlsx,.xls"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="mt-6 flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-800">Processing file...</span>
            </div>
          )}

          {/* Upload Progress */}
          {uploadStatus === 'processing' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Uploading products...</span>
                <span className="text-sm text-blue-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="mt-6 flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                {parsedData.length} products successfully uploaded!
              </span>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800 mb-2">Validation Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Data Preview */}
          {parsedData.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">
                Valid Products Preview ({parsedData.length} items):
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-auto">
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div className="font-medium text-gray-700">Name</div>
                  <div className="font-medium text-gray-700">SKU</div>
                  <div className="font-medium text-gray-700">Category</div>
                  <div className="font-medium text-gray-700">Price</div>
                  <div className="font-medium text-gray-700">Stock</div>
                  {parsedData.slice(0, 5).map((item, index) => (
                    <React.Fragment key={index}>
                      <div className="text-gray-900 truncate">{item.name}</div>
                      <div className="text-gray-600">{item.sku}</div>
                      <div className="text-gray-600">{item.category}</div>
                      <div className="text-gray-900">₹{item.price}</div>
                      <div className="text-gray-600">{item.stock}</div>
                    </React.Fragment>
                  ))}
                  {parsedData.length > 5 && (
                    <div className="col-span-5 text-center text-gray-500 text-sm mt-2">
                      ... and {parsedData.length - 5} more items
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={uploadStatus === 'processing'}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={parsedData.length === 0 || uploadStatus === 'processing' || errors.length > 0}
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
                Upload {parsedData.length} Products
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;