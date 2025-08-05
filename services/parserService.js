import { createRequire } from 'module';
import mammoth from 'mammoth';
import path from 'path';
import fs from 'fs/promises';

// Fix for pdf-parse with ES modules
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export const extractTextFromFile = async (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  try {
    // Read file from disk if path is available (disk storage)
    let fileBuffer;
    if (file.path) {
      fileBuffer = await fs.readFile(file.path);
    } else if (file.buffer) {
      fileBuffer = file.buffer;
    } else {
      throw new Error('No file data available');
    }
    
    if (ext === '.pdf') {
      return await extractFromPDF(fileBuffer);
    } else if (ext === '.docx') {
      return await extractFromDOCX(fileBuffer);
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
};

const extractFromPDF = async (buffer) => {
  try {
    const data = await pdf(buffer);
    
    // Check if PDF contains text
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('This PDF appears to be scanned/image-based. Please use a PDF with selectable text, or click "Apply Manually".');
    }
    
    console.log(`Extracted ${data.text.length} characters from PDF`);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
};

const extractFromDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    
    // Check if DOCX contains text
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('This document appears to be empty.');
    }
    
    console.log(`Extracted ${result.value.length} characters from DOCX`);
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file');
  }
};