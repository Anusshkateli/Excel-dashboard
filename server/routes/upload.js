const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const Upload = require('../models/Upload');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.xls', '.xlsx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xls, .xlsx) are allowed'), false);
  }
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const analyzeColumnType = (values) => {
  if (values.length === 0) return 'string';
  
  let numberCount = 0;
  let dateCount = 0;
  
  for (const value of values.slice(0, 10)) {
    if (value === null || value === undefined || value === '') continue;
    
    if (typeof value === 'number' && !isNaN(value)) {
      numberCount++;
    } else if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime()) && value.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/)) {
        dateCount++;
      } else if (!isNaN(parseFloat(value))) {
        numberCount++;
      }
    }
  }
  
  if (numberCount > dateCount && numberCount > 0) return 'number';
  if (dateCount > 0) return 'date';
  return 'string';
};

const processExcelFile = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    if (sheetNames.length === 0) {
      throw new Error('No sheets found in the Excel file');
    }
    
    const firstSheet = workbook.Sheets[sheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
    
    if (jsonData.length === 0) {
      throw new Error('No data found in the Excel file');
    }
    
    const headers = jsonData[0];
    const rows = jsonData.slice(1);
    
    if (!headers || headers.length === 0) {
      throw new Error('No headers found in the Excel file');
    }
    
    const data = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined ? row[index] : null;
      });
      return obj;
    });
    
    const columns = headers.map(header => {
      const columnValues = data.map(row => row[header]).filter(val => val !== null && val !== undefined);
      const sampleValues = columnValues.slice(0, 5);
      const columnType = analyzeColumnType(columnValues);
      
      return {
        name: header,
        type: columnType,
        sampleValues
      };
    });
    
    return {
      data,
      columns,
      rowCount: rows.length
    };
  } catch (error) {
    throw new Error(`Failed to process Excel file: ${error.message}`);
  }
};

router.post('/', auth, uploadMiddleware.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;

    const processedData = await processExcelFile(filePath);

    const uploadRecord = new Upload({
      user: req.user.id,
      fileName: filename,
      originalName: originalname,
      filePath,
      fileSize: size,
      columns: processedData.columns,
      rowCount: processedData.rowCount,
      data: processedData.data,
      status: 'completed'
    });

    await uploadRecord.save();

    await User.findByIdAndUpdate(req.user.id, {
      $push: { uploads: uploadRecord._id }
    });

    res.status(201).json({
      message: 'File uploaded and processed successfully',
      upload: {
        id: uploadRecord._id,
        fileName: uploadRecord.originalName,
        columns: uploadRecord.columns,
        rowCount: uploadRecord.rowCount,
        createdAt: uploadRecord.createdAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      message: error.message || 'Error processing uploaded file' 
    });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const uploads = await Upload.find({ user: req.user.id })
      .select('-data')
      .sort({ createdAt: -1 });

    res.json({ uploads });
  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({ message: 'Error fetching uploaded files' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const upload = await Upload.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    res.json({ upload });
  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({ message: 'Error fetching upload data' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const upload = await Upload.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    try {
      await fs.unlink(upload.filePath);
    } catch (fileError) {
      console.error('Error deleting file from filesystem:', fileError);
    }

    await Upload.findByIdAndDelete(req.params.id);

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { uploads: req.params.id }
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete upload error:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

module.exports = router;