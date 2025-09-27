import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import imageCompression from 'browser-image-compression';
import SignaturePad from 'react-signature-canvas';
import './App.css';

const today = new Date().toISOString().slice(0, 10);

const roles = ['Vendor', 'Purchaser', 'Landlord', 'Tenant'];
const propertyTypes = ['HDB', 'Condo', 'Landed', 'Commercial', 'Industrial'];

const defaultRooms = [
  {
    key: 'living',
    name: 'Living Room',
    items: [
      'Ceiling Light',
      'Wall Light',
      'Down Light',
      'Ceiling/Wall Fan',
      'Aircon',
    ],
  },
  {
    key: 'dining',
    name: 'Dining Room',
    items: [
      'Ceiling Light',
      'Wall Fan',
      'Aircon',
    ],
  },
  {
    key: 'kitchen',
    name: 'Kitchen',
    items: [
      'Ceiling Light',
      'Refrigerator',
      'Cooker Hob',
      'Cooker Hood',
      'Oven',
      'Cabinets',
    ],
  },
  {
    key: 'master',
    name: 'Master Bedroom',
    items: [
      'Ceiling Light',
      'Wall Light',
      'Down Light',
      'Fan',
      'Aircon',
      'Wardrobe',
    ],
  },
  {
    key: 'other',
    name: 'Other Areas',
    items: [
      'Back Yard',
      'Store Room',
      'Balcony',
      'Utility Room',
      'Ceiling Light',
    ],
  },
];

function App() {
  // Form state
  const [form, setForm] = useState({
    name: '',
    cea: '',
    mobile: '',
    address: '',
    date: today,
    transactionType: '',
    propertyType: '',
    vendorPurchaserName: '',
    purchaserName: '',
    landlordTenantName: '',
    tenantName: '',
    inspectionDate: today,
    inspectionTime: new Date().toTimeString().slice(0, 5),
    // New enhanced fields
    propertySize: '',
    numberOfRooms: '',
    propertyCondition: '',
    specialNotes: '',
    recommendations: '',
    agentCompany: '',
    agentEmail: '',
    // Removed template selection - using compact format only
  });
  const [formTouched, setFormTouched] = useState({});

  // Load agent details from local storage on component mount
  useEffect(() => {
    const savedAgentData = localStorage.getItem('handoverAgentData');
    if (savedAgentData) {
      try {
        const agentData = JSON.parse(savedAgentData);
        setForm(prev => ({
          ...prev,
          name: agentData.name || '',
          cea: agentData.cea || '',
          mobile: agentData.mobile || ''
        }));
      } catch (error) {
        console.error('Error loading agent data:', error);
      }
    }
  }, []);

  // Inventory state
  const [rooms, setRooms] = useState(() => {
    // Add 1 Bedroom and 1 Bathroom by default
    const base = [...defaultRooms];
    base.splice(4, 0, {
      key: 'bedroom1',
      name: 'Bedroom 1',
      items: ['Ceiling Light', 'Wall Light', 'Down Light', 'Fan', 'Aircon', 'Wardrobe'],
    });
    base.splice(5, 0, {
      key: 'bathroom1',
      name: 'Bathroom 1',
      items: ['Ceiling Light'],
    });
    return base;
  });
  const [expanded, setExpanded] = useState({});
  const [inventory, setInventory] = useState({});

  // Photo state
  const [photos, setPhotos] = useState([]); // { url, comment }
  const fileInputRef = useRef();

  // Signature state
  const [signatures, setSignatures] = useState({
    agent: '',
    vendor: '',
    purchaser: '',
    landlord: '',
    tenant: ''
  });
  const agentSigRef = useRef();
  const vendorSigRef = useRef();
  const purchaserSigRef = useRef();
  const landlordSigRef = useRef();
  const tenantSigRef = useRef();

  // Error state for validation
  const [submitError, setSubmitError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Typing effect state
  const [typingText, setTypingText] = useState('');
  const [typingIndex, setTypingIndex] = useState(0);

  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupError, setSignupError] = useState('');

  // Modern typing effect with word-by-word animation
  const fullText = "Forget the old-school way — we make handover reports fast, fuss-free, and solid.\nWhether it's HDB, Condo, Landed, Commercial, or Industrial — we got your back.\nLet's go digital! 🚀";
  const words = fullText.split(' ');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');

  // Modern typing effect - word by word with fade-in
  useEffect(() => {
    if (currentWordIndex < words.length) {
      const timeout = setTimeout(() => {
        const newWord = words[currentWordIndex];
        setDisplayText(prev => prev + (currentWordIndex > 0 ? ' ' : '') + newWord);
        setCurrentWordIndex(currentWordIndex + 1);
      }, 100); // Faster, more modern timing
      return () => clearTimeout(timeout);
    }
  }, [currentWordIndex, words]);


  // Save agent details to local storage
  const saveAgentData = (name, value) => {
    if (['name', 'cea', 'mobile'].includes(name)) {
      const currentAgentData = JSON.parse(localStorage.getItem('handoverAgentData') || '{}');
      const updatedAgentData = { ...currentAgentData, [name]: value };
      localStorage.setItem('handoverAgentData', JSON.stringify(updatedAgentData));
    }
  };

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Auto-save agent details
    saveAgentData(name, value);
  };
  const handleBlur = (e) => {
    const { name } = e.target;
    setFormTouched((prev) => ({ ...prev, [name]: true }));
  };

  // Inventory handlers
  const handleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const handleItemCheck = (roomKey, itemIdx) => {
    setInventory((prev) => {
      const room = prev[roomKey] || {};
      const item = room[itemIdx] || { checked: false, qty: 0, name: rooms.find(r => r.key === roomKey).items[itemIdx] };
      return {
        ...prev,
        [roomKey]: {
          ...room,
          [itemIdx]: { ...item, checked: !item.checked },
        },
      };
    });
  };
  const handleQtyChange = (roomKey, itemIdx, qty) => {
    setInventory((prev) => {
      const room = prev[roomKey] || {};
      const item = room[itemIdx] || { checked: false, qty: 0, name: rooms.find(r => r.key === roomKey).items[itemIdx] };
      return {
        ...prev,
        [roomKey]: {
          ...room,
          [itemIdx]: { ...item, qty: Math.max(0, Number(qty) || 0) },
        },
      };
    });
  };
  const handleAddRoom = (type) => {
    // type: 'bedroom' or 'bathroom'
    const count = rooms.filter(r => r.key.startsWith(type)).length;
    const newKey = `${type}${count + 1}`;
    setRooms((prev) => {
      const idx = type === 'bedroom' ? prev.findIndex(r => r.key.startsWith('bathroom')) : prev.length - 1;
      const newRoom = {
        key: newKey,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${count + 1}`,
        items: type === 'bedroom'
          ? ['Ceiling Light', 'Wall Light', 'Down Light', 'Fan', 'Aircon', 'Wardrobe']
          : ['Ceiling Light'],
      };
      const newRooms = [...prev];
      newRooms.splice(idx, 0, newRoom);
      return newRooms;
    });
  };
  const handleAddCustomItem = (roomKey) => {
    const customName = prompt('Enter custom item name:');
    if (!customName || customName.trim() === '') return;
    
    // Add the custom item without any limits
    setRooms((prev) => prev.map(r => 
      r.key === roomKey 
        ? { ...r, items: [...r.items, customName.trim()] } 
        : r
    ));
  };

  const handleRemoveCustomItem = (roomKey, itemIdx) => {
    setRooms((prev) => prev.map(r => 
      r.key === roomKey 
        ? { ...r, items: r.items.filter((_, idx) => idx !== itemIdx) } 
        : r
    ));
  };

  // Photo handlers
  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 100 photos total (increased from 30)
    if (photos.length + files.length > 100) {
      setSubmitError(`Maximum 100 photos allowed. You currently have ${photos.length} photos and are trying to add ${files.length} more.`);
      e.target.value = '';
      return;
    }
    
    // Compress images before adding to state
    for (const file of files) {
      try {
        // Compress image for better performance and smaller file sizes
        const compressedFile = await imageCompression(file, {
          maxWidthOrHeight: 800, // Higher resolution for better quality
          maxSizeMB: 0.5, // Larger size for better quality
          useWebWorker: true,
          fileType: 'image/jpeg'
        });
        
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPhotos(prev => [...prev, { url: ev.target.result, comment: '' }]);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original file if compression fails
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPhotos(prev => [...prev, { url: ev.target.result, comment: '' }]);
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };
  const handleRemovePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };
  const handlePhotoComment = (idx, comment) => {
    setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, comment } : p));
  };
  const handleAddPhotoClick = () => {
    fileInputRef.current.click();
  };

  // Signature handlers
  const handleSignatureChange = (type) => {
    let sigRef;
    switch(type) {
      case 'agent': sigRef = agentSigRef; break;
      case 'vendor': sigRef = vendorSigRef; break;
      case 'purchaser': sigRef = purchaserSigRef; break;
      case 'landlord': sigRef = landlordSigRef; break;
      case 'tenant': sigRef = tenantSigRef; break;
      default: return;
    }
    
    if (sigRef.current) {
      setSignatures(prev => ({
        ...prev,
        [type]: sigRef.current.toDataURL()
      }));
    }
  };

  const clearSignature = (type) => {
    let sigRef;
    switch(type) {
      case 'agent': sigRef = agentSigRef; break;
      case 'vendor': sigRef = vendorSigRef; break;
      case 'purchaser': sigRef = purchaserSigRef; break;
      case 'landlord': sigRef = landlordSigRef; break;
      case 'tenant': sigRef = tenantSigRef; break;
      default: return;
    }
    
    if (sigRef.current) {
      sigRef.current.clear();
      setSignatures(prev => ({
        ...prev,
        [type]: ''
      }));
    }
  };

  // Clear agent data from local storage
  const clearAgentData = () => {
    localStorage.removeItem('handoverAgentData');
    setForm(prev => ({
      ...prev,
      name: '',
      cea: '',
      mobile: ''
    }));
  };

  // Reset all form data
  const resetAllData = () => {
    setForm({
      name: '',
      cea: '',
      mobile: '',
      address: '',
      date: today,
      transactionType: '',
      propertyType: '',
      vendorPurchaserName: '',
      purchaserName: '',
      landlordTenantName: '',
      tenantName: '',
      inspectionDate: today,
      inspectionTime: new Date().toTimeString().slice(0, 5),
    });
    setInventory({});
    setPhotos([]);
    setSignatures({ agent: null, vendor: null, purchaser: null, landlord: null, tenant: null });
    setFormTouched({});
    setSubmitError('');
    
    // Clear all signatures
    if (agentSigRef.current) agentSigRef.current.clear();
    if (vendorSigRef.current) vendorSigRef.current.clear();
    if (purchaserSigRef.current) purchaserSigRef.current.clear();
    if (landlordSigRef.current) landlordSigRef.current.clear();
    if (tenantSigRef.current) tenantSigRef.current.clear();
  };

  // Handle email signup
  const handleSignup = (e) => {
    e.preventDefault();
    setSignupError('');
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      setSignupError('Please enter a valid email address');
      return;
    }

    // Save to local storage (in a real app, this would be sent to a server)
    const existingEmails = JSON.parse(localStorage.getItem('handoverSignups') || '[]');
    if (!existingEmails.includes(signupEmail)) {
      existingEmails.push(signupEmail);
      localStorage.setItem('handoverSignups', JSON.stringify(existingEmails));
    }
    
    setSignupSuccess(true);
    setSignupEmail('');
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setSignupSuccess(false);
    }, 3000);
  };

  // Main PDF generation function - using compact format only
  const handleGeneratePDF = async () => {
    setSubmitError('');
    // Validate required fields
    if (!form.name || !form.cea || !form.mobile || !form.address) {
      setSubmitError('Please fill in all required fields.');
      return;
    }
    setGenerating(true);
    setProgress(0);
    try {
      await generateCompactPDF();
    } catch {
      setSubmitError('Failed to generate PDF. Please try again.');
    }
    setGenerating(false);
    setProgress(0);
  };

  // Standard PDF generation (existing)
  const _generateStandardPDF = async () => {
    setSubmitError('');
    // Validate required fields
    if (!form.name || !form.cea || !form.mobile || !form.address) {
      setSubmitError('Please fill in all required fields.');
      return;
    }
    setGenerating(true);
    setProgress(0);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      setProgress(10);
      
      // Header with gradient-like effect
      doc.setFillColor(188, 158, 123);
      doc.rect(0, 0, pageWidth, 80, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('PROPERTY HANDOVER REPORT', 40, 35);
      
      // Subtitle
      doc.setFontSize(12);
      doc.text('Professional Property Inspection & Inventory Report', 40, 55);
      
      // Reset text color
      doc.setTextColor(66, 45, 42);
      
      let y = 120;
      
      // Property Information Box
      doc.setFillColor(250, 248, 246);
      doc.setDrawColor(188, 158, 123);
      doc.rect(40, y, pageWidth - 80, 120, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('PROPERTY INFORMATION', 50, y + 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Property Address: ${form.address}`, 50, y + 40);
      doc.text(`Property Type: ${form.propertyType || 'Not specified'}`, 50, y + 55);
      doc.text(`Date Generated: ${form.date}`, 50, y + 70);
      doc.text(`Inspection Date: ${form.inspectionDate}`, 50, y + 85);
      doc.text(`Inspection Time: ${form.inspectionTime}`, 50, y + 100);
      
      y += 140;
      
      // Agent Information Box
      doc.setFillColor(250, 248, 246);
      doc.rect(40, y, pageWidth - 80, 140, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('AGENT INFORMATION', 50, y + 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Salesperson: ${form.name}`, 50, y + 40);
      doc.text(`CEA Registration: ${form.cea}`, 50, y + 55);
      doc.text(`Mobile: ${form.mobile}`, 50, y + 70);
      doc.text(`Company: ${form.agentCompany || 'Not specified'}`, 50, y + 85);
      doc.text(`Email: ${form.agentEmail || 'Not specified'}`, 50, y + 100);
      doc.text(`Property Size: ${form.propertySize || 'Not specified'}`, 50, y + 115);
      
      y += 160;
      setProgress(20);
      
      // Parties Information Box
      doc.setFillColor(250, 248, 246);
      doc.rect(40, y, pageWidth - 80, 80, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('PARTIES INVOLVED', 50, y + 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      if (form.transactionType === 'sale') {
        doc.text(`Vendor: ${form.vendorPurchaserName || 'Not specified'}`, 50, y + 40);
        doc.text(`Purchaser: ${form.purchaserName || 'Not specified'}`, 50, y + 55);
      } else if (form.transactionType === 'rental') {
        doc.text(`Landlord: ${form.landlordTenantName || 'Not specified'}`, 50, y + 40);
        doc.text(`Tenant: ${form.tenantName || 'Not specified'}`, 50, y + 55);
      }
      
      y += 100;
      
      // Property Condition & Details Section
      if (y > 600) {
        doc.addPage();
        y = 40;
      }
      
      doc.setFillColor(250, 248, 246);
      doc.rect(40, y, pageWidth - 80, 120, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('PROPERTY ASSESSMENT', 50, y + 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Property Condition: ${form.propertyCondition || 'Not assessed'}`, 50, y + 40);
      doc.text(`Number of Rooms: ${form.numberOfRooms || 'Not specified'}`, 50, y + 55);
      
      if (form.specialNotes) {
        doc.text('Special Notes:', 50, y + 70);
        const specialNotesLines = doc.splitTextToSize(form.specialNotes, pageWidth - 100);
        doc.text(specialNotesLines, 50, y + 85);
      }
      
      y += 140;
      setProgress(30);
      
      // Inventory Section
      if (['HDB', 'Condo', 'Landed'].includes(form.propertyType)) {
        // Check if we need a new page
        if (y > 600) {
          doc.addPage();
          y = 40;
        }
        
        // Collect all inventory items first
        const allInventoryItems = [];
        rooms.forEach(room => {
          const checkedItems = (inventory[room.key] ? Object.entries(inventory[room.key]) : []).filter(([idx, item]) => item.checked && item.qty > 0);
          if (checkedItems.length > 0) {
            allInventoryItems.push({
              roomName: room.name,
              items: checkedItems.map(([idx, item]) => ({
                name: room.items[idx],
                qty: item.qty
              }))
            });
          }
        });
        
        // If no inventory items, skip this section
        if (allInventoryItems.length === 0) {
          // Still add a small section to indicate no items
          doc.setFillColor(250, 248, 246);
          doc.rect(40, y, pageWidth - 80, 80, 'FD');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text('INVENTORY CHECKLIST', 50, y + 20);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text('No inventory items checked', 50, y + 40);
          
          y += 100;
        } else {
          // Process inventory with proper pagination
          let currentPageStart = 0;
          let isFirstInventoryPage = true;
          
          while (currentPageStart < allInventoryItems.length) {
            // Check if we need a new page
            if (y > 600) {
              doc.addPage();
              y = 40;
            }
            
            // Calculate how many rooms can fit on this page
            const maxItemsPerPage = Math.floor((pageHeight - y - 100) / 20); // 20pt per item
            const itemsOnThisPage = Math.min(maxItemsPerPage, allInventoryItems.length - currentPageStart);
            
            // Add inventory section header
            doc.setFillColor(250, 248, 246);
            doc.rect(40, y, pageWidth - 80, Math.min(200, (itemsOnThisPage * 20) + 60), 'FD');
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('INVENTORY CHECKLIST', 50, y + 20);
            
            if (isFirstInventoryPage) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(10);
              doc.text(`Total Rooms: ${allInventoryItems.length}`, 50, y + 40);
              y += 20;
            }
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            let inventoryY = y + (isFirstInventoryPage ? 60 : 40);
            
            // Add rooms for this page
            for (let i = currentPageStart; i < currentPageStart + itemsOnThisPage; i++) {
              const room = allInventoryItems[i];
              
              // Check if we need a new page for this room
              if (inventoryY > pageHeight - 100) {
                doc.addPage();
                inventoryY = 60;
              }
              
              doc.setFont('helvetica', 'bold');
              doc.text(`${room.roomName}:`, 50, inventoryY);
              inventoryY += 15;
              
              doc.setFont('helvetica', 'normal');
              room.items.forEach(item => {
                // Check if we need a new page for this item
                if (inventoryY > pageHeight - 100) {
                  doc.addPage();
                  inventoryY = 60;
                }
                
                doc.text(`✓ ${item.name} (Qty: ${item.qty})`, 60, inventoryY);
                inventoryY += 12;
              });
              
              inventoryY += 8; // Space between rooms
            }
            
            currentPageStart += itemsOnThisPage;
            isFirstInventoryPage = false;
            
            // Update y position for next section
            y = inventoryY + 20;
          }
        }
      }
      setProgress(50);
      
      // Photos Section
      if (photos.length > 0) {
        // Check if we need a new page
        if (y > 500) {
          doc.addPage();
          y = 40;
        }
        
        doc.setFillColor(250, 248, 246);
        doc.rect(40, y, pageWidth - 80, 300, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('PHOTO DOCUMENTATION', 50, y + 20);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Total Photos: ${photos.length}`, 50, y + 40);
        
        let photoY = y + 60;
        let photosPerPage = 0;
        const maxPhotosPerPage = 8; // 8 photos per page for maximum space utilization
        
        for (let i = 0; i < photos.length; i++) {
          // Check if we need a new page for photos
          if (photosPerPage >= maxPhotosPerPage) {
            doc.addPage();
            y = 40;
            photoY = y + 40;
            photosPerPage = 0;
            
            // Add header for new photo page
            doc.setFillColor(250, 248, 246);
            doc.rect(40, y, pageWidth - 80, 60, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('PHOTO DOCUMENTATION (continued)', 50, y + 20);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Photos ${i + 1}-${Math.min(i + maxPhotosPerPage, photos.length)} of ${photos.length}`, 50, y + 40);
            photoY = y + 60;
          }
          
          // Further compress for PDF (images are already compressed when added)
          let imgData = photos[i].url;
          try {
            const file = await fetch(imgData).then(r => r.blob());
            const compressed = await imageCompression(file, { 
              maxWidthOrHeight: 300, // Smaller for PDF
              maxSizeMB: 0.1, // Smaller for PDF
              useWebWorker: true
            });
            imgData = await imageCompression.getDataUrlFromFile(compressed);
          } catch (e) { 
            console.warn('Image compression failed, using original:', e);
            // fallback to original 
          }
          
          // Add image with border (smaller size for more photos per page)
          doc.setDrawColor(188, 158, 123);
          doc.rect(50, photoY, 80, 60, 'S');
          
          try {
            doc.addImage(imgData, 'JPEG', 50, photoY, 80, 60);
          } catch (e) {
            console.warn('Failed to add image to PDF:', e);
            // Add placeholder text if image fails
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('Image failed to load', 55, photoY + 30);
          }
          
          // Add comment if exists (smaller text)
          if (photos[i].comment) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Photo ${i + 1}: ${photos[i].comment}`, 140, photoY + 15, { maxWidth: 200 });
          }
          
          photoY += 70; // Reduced spacing between photos
          photosPerPage++;
        }
        
        y += 320;
      }
      setProgress(70);
      
      // Recommendations Section
      if (form.recommendations) {
        if (y > 500) {
          doc.addPage();
          y = 40;
        }
        
        doc.setFillColor(250, 248, 246);
        doc.rect(40, y, pageWidth - 80, 100, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('RECOMMENDATIONS', 50, y + 20);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const recommendationsLines = doc.splitTextToSize(form.recommendations, pageWidth - 100);
        doc.text(recommendationsLines, 50, y + 40);
        
        y += 120;
      }
      
      setProgress(80);
      
      // Signature Section
      if (y > 500) {
        doc.addPage();
        y = 40;
      }
      
      doc.setFillColor(250, 248, 246);
      doc.rect(40, y, pageWidth - 80, 150, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('SIGNATURES', 50, y + 20);
      
      // Agent Signature Box
      doc.setDrawColor(59, 130, 246);
      doc.rect(50, y + 40, 200, 60, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Agent Signature', 55, y + 55);
      doc.text(`Name: ${form.name}`, 55, y + 70);
      doc.text(`CEA: ${form.cea}`, 55, y + 85);
      
      // Add agent signature if available
      if (signatures.agent) {
        try {
          doc.addImage(signatures.agent, 'PNG', 55, y + 45, 180, 25);
        } catch (e) {
          doc.text('Signature captured', 55, y + 90);
        }
      }
      
      // Transaction-specific signature boxes
      if (form.transactionType === 'sale') {
        // Vendor Signature Box
        doc.rect(300, y + 40, 200, 60, 'S');
        doc.text('Vendor Signature', 305, y + 55);
        doc.text(`Name: ${form.vendorPurchaserName || '________________'}`, 305, y + 70);
        doc.text('Date: ________________', 305, y + 85);
        
        if (signatures.vendor) {
          try {
            doc.addImage(signatures.vendor, 'PNG', 305, y + 45, 180, 25);
          } catch (e) {
            doc.text('Signature captured', 305, y + 90);
          }
        }
        
        // Purchaser Signature Box
        doc.rect(50, y + 120, 200, 60, 'S');
        doc.text('Purchaser Signature', 55, y + 135);
        doc.text(`Name: ${form.purchaserName || '________________'}`, 55, y + 150);
        doc.text('Date: ________________', 55, y + 165);
        
        if (signatures.purchaser) {
          try {
            doc.addImage(signatures.purchaser, 'PNG', 55, y + 125, 180, 25);
          } catch (e) {
            doc.text('Signature captured', 55, y + 170);
          }
        }
      } else if (form.transactionType === 'rental') {
        // Landlord Signature Box
        doc.rect(300, y + 40, 200, 60, 'S');
        doc.text('Landlord Signature', 305, y + 55);
        doc.text(`Name: ${form.landlordTenantName || '________________'}`, 305, y + 70);
        doc.text('Date: ________________', 305, y + 85);
        
        if (signatures.landlord) {
          try {
            doc.addImage(signatures.landlord, 'PNG', 305, y + 45, 180, 25);
          } catch (e) {
            doc.text('Signature captured', 305, y + 90);
          }
        }
        
        // Tenant Signature Box
        doc.rect(50, y + 120, 200, 60, 'S');
        doc.text('Tenant Signature', 55, y + 135);
        doc.text(`Name: ${form.tenantName || '________________'}`, 55, y + 150);
        doc.text('Date: ________________', 55, y + 165);
        
        if (signatures.tenant) {
          try {
            doc.addImage(signatures.tenant, 'PNG', 55, y + 125, 180, 25);
          } catch (e) {
            doc.text('Signature captured', 55, y + 170);
          }
        }
      }
      
      // Summary Section
      if (y > 400) {
        doc.addPage();
        y = 40;
      }
      
      doc.setFillColor(250, 248, 246);
      doc.rect(40, y, pageWidth - 80, 120, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('REPORT SUMMARY', 50, y + 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      // Calculate summary statistics
      const totalInventoryItems = Object.values(inventory).reduce((total, room) => {
        return total + Object.values(room).filter(item => item.checked && item.qty > 0).length;
      }, 0);
      
      const totalPhotos = photos.length;
      const totalRooms = rooms.length;
      
      doc.text(`Total Rooms Inspected: ${totalRooms}`, 50, y + 40);
      doc.text(`Total Inventory Items: ${totalInventoryItems}`, 50, y + 55);
      doc.text(`Total Photos Documented: ${totalPhotos}`, 50, y + 70);
      doc.text(`Report Generated: ${new Date().toLocaleString()}`, 50, y + 85);
      
      y += 140;
      setProgress(90);
      
      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(107, 81, 63);
      doc.text('Powered by #thepeoplesagency 2025', 40, pageHeight - 20);
      doc.text('Professional Property Handover Report', 40, pageHeight - 35);
      // Save
      let pdfBlob = doc.output('blob');
      // If over 10MB, warn user (increased limit for more photos)
      if (pdfBlob.size > 10 * 1024 * 1024) {
        setSubmitError('PDF is too large (>10MB). Try reducing the number of photos or contact support for larger reports.');
        setGenerating(false);
        return;
      }
      setProgress(100);
      doc.save(generateFilename());
    } catch {
      setSubmitError('Failed to generate PDF. Please try again.');
    }
    setGenerating(false);
    setProgress(0);
  };

  // Compact PDF generation with optimized layout
  const generateCompactPDF = async () => {
    setGenerating(true);
    setProgress(0);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      setProgress(10);
      
      // Compact header
      doc.setFillColor(188, 158, 123);
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('PROPERTY HANDOVER REPORT', 40, 35);
      
      doc.setTextColor(66, 45, 42);
      let y = 100;
      
      // Combined information section
      doc.setFillColor(250, 248, 246);
      doc.rect(40, y, pageWidth - 80, 200, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PROPERTY & AGENT INFORMATION', 50, y + 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Property: ${form.address}`, 50, y + 40);
      doc.text(`Type: ${form.propertyType || 'Not specified'} | Size: ${form.propertySize || 'Not specified'}`, 50, y + 55);
      doc.text(`Agent: ${form.name} (CEA: ${form.cea}) | Mobile: ${form.mobile}`, 50, y + 70);
      doc.text(`Date: ${form.date} | Inspection: ${form.inspectionDate} ${form.inspectionTime}`, 50, y + 85);
      
      if (form.transactionType === 'sale') {
        doc.text(`Vendor: ${form.vendorPurchaserName || 'Not specified'} | Purchaser: ${form.purchaserName || 'Not specified'}`, 50, y + 100);
      } else if (form.transactionType === 'rental') {
        doc.text(`Landlord: ${form.landlordTenantName || 'Not specified'} | Tenant: ${form.tenantName || 'Not specified'}`, 50, y + 100);
      }
      
      if (form.propertyCondition) {
        doc.text(`Condition: ${form.propertyCondition}`, 50, y + 115);
      }
      
      if (form.specialNotes) {
        const notesLines = doc.splitTextToSize(`Notes: ${form.specialNotes}`, pageWidth - 100);
        doc.text(notesLines, 50, y + 130);
      }
      
      y += 220;
      setProgress(30);
      
      // Compact inventory
      if (['HDB', 'Condo', 'Landed'].includes(form.propertyType)) {
        if (y > 600) {
          doc.addPage();
          y = 40;
        }
        
        doc.setFillColor(250, 248, 246);
        doc.rect(40, y, pageWidth - 80, 150, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('INVENTORY SUMMARY', 50, y + 20);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        let inventoryY = y + 40;
        
        const allInventoryItems = [];
        rooms.forEach(room => {
          const checkedItems = (inventory[room.key] ? Object.entries(inventory[room.key]) : []).filter(([idx, item]) => item.checked && item.qty > 0);
          if (checkedItems.length > 0) {
            allInventoryItems.push({
              roomName: room.name,
              items: checkedItems.map(([idx, item]) => `${room.items[idx]} (${item.qty})`)
            });
          }
        });
        
        allInventoryItems.forEach(room => {
          if (inventoryY > pageHeight - 100) {
            doc.addPage();
            inventoryY = 60;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text(`${room.roomName}:`, 50, inventoryY);
          inventoryY += 12;
          
          doc.setFont('helvetica', 'normal');
          room.items.forEach(item => {
            if (inventoryY > pageHeight - 100) {
              doc.addPage();
              inventoryY = 60;
            }
            doc.text(`• ${item}`, 60, inventoryY);
            inventoryY += 10;
          });
          inventoryY += 5;
        });
        
        y += 170;
      }
      setProgress(50);
      
      // Compact photos
      if (photos.length > 0) {
        if (y > 400) {
          doc.addPage();
          y = 40;
        }
        
        doc.setFillColor(250, 248, 246);
        doc.rect(40, y, pageWidth - 80, 200, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`PHOTO DOCUMENTATION (${photos.length} photos)`, 50, y + 20);
        
        let photoY = y + 40;
        let photosPerPage = 0;
        const maxPhotosPerPage = 6;
        
        for (let i = 0; i < Math.min(photos.length, 12); i++) { // Limit to 12 photos in compact
          if (photosPerPage >= maxPhotosPerPage) {
            doc.addPage();
            photoY = 40;
            photosPerPage = 0;
          }
          
          let imgData = photos[i].url;
          try {
            const file = await fetch(imgData).then(r => r.blob());
            const compressed = await imageCompression(file, { 
              maxWidthOrHeight: 200,
              maxSizeMB: 0.05,
              useWebWorker: true
            });
            imgData = await imageCompression.getDataUrlFromFile(compressed);
          } catch (e) { /* fallback */ }
          
          doc.setDrawColor(188, 158, 123);
          doc.rect(50, photoY, 60, 45, 'S');
          
          try {
            doc.addImage(imgData, 'JPEG', 50, photoY, 60, 45);
          } catch (e) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('Photo', 55, photoY + 25);
          }
          
          photoY += 55;
          photosPerPage++;
        }
        
        y += 220;
      }
      setProgress(70);
      
      // Improved signature section
      if (y > 300) {
        doc.addPage();
        y = 40;
      }
      
      doc.setFillColor(250, 248, 246);
      doc.rect(40, y, pageWidth - 80, 200, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('SIGNATURES', 50, y + 20);
      
      // Agent signature
      doc.setDrawColor(59, 130, 246);
      doc.rect(50, y + 40, 200, 50, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Agent Signature', 55, y + 55);
      doc.text(`Name: ${form.name}`, 55, y + 70);
      doc.text(`CEA: ${form.cea}`, 55, y + 85);
      
      if (signatures.agent) {
        try {
          doc.addImage(signatures.agent, 'PNG', 55, y + 45, 180, 20);
        } catch (e) {
          doc.text('Signature captured', 55, y + 90);
        }
      }
      
      // Transaction signatures - side by side layout
      if (form.transactionType === 'sale') {
        // Vendor signature
        doc.rect(300, y + 40, 200, 50, 'S');
        doc.text('Vendor Signature', 305, y + 55);
        doc.text(`Name: ${form.vendorPurchaserName || '________________'}`, 305, y + 70);
        doc.text('Date: ________________', 305, y + 85);
        
        if (signatures.vendor) {
          try {
            doc.addImage(signatures.vendor, 'PNG', 305, y + 45, 180, 20);
          } catch (e) {
            doc.text('Signature captured', 305, y + 90);
          }
        }
        
        // Purchaser signature
        doc.rect(50, y + 110, 200, 50, 'S');
        doc.text('Purchaser Signature', 55, y + 125);
        doc.text(`Name: ${form.purchaserName || '________________'}`, 55, y + 140);
        doc.text('Date: ________________', 55, y + 155);
        
        if (signatures.purchaser) {
          try {
            doc.addImage(signatures.purchaser, 'PNG', 55, y + 115, 180, 20);
          } catch (e) {
            doc.text('Signature captured', 55, y + 160);
          }
        }
      } else if (form.transactionType === 'rental') {
        // Landlord signature
        doc.rect(300, y + 40, 200, 50, 'S');
        doc.text('Landlord Signature', 305, y + 55);
        doc.text(`Name: ${form.landlordTenantName || '________________'}`, 305, y + 70);
        doc.text('Date: ________________', 305, y + 85);
        
        if (signatures.landlord) {
          try {
            doc.addImage(signatures.landlord, 'PNG', 305, y + 45, 180, 20);
          } catch (e) {
            doc.text('Signature captured', 305, y + 90);
          }
        }
        
        // Tenant signature
        doc.rect(50, y + 110, 200, 50, 'S');
        doc.text('Tenant Signature', 55, y + 125);
        doc.text(`Name: ${form.tenantName || '________________'}`, 55, y + 140);
        doc.text('Date: ________________', 55, y + 155);
        
        if (signatures.tenant) {
          try {
            doc.addImage(signatures.tenant, 'PNG', 55, y + 115, 180, 20);
          } catch (e) {
            doc.text('Signature captured', 55, y + 160);
          }
        }
      }
      
      setProgress(90);
      
      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(107, 81, 63);
      doc.text('Powered by #thepeoplesagency 2025', 40, pageHeight - 20);
      
      setProgress(100);
      doc.save(generateFilename());
    } catch {
      setSubmitError('Failed to generate compact PDF. Please try again.');
    }
    setGenerating(false);
    setProgress(0);
  };


  // Helper function to generate consistent filename
  const generateFilename = () => {
    const cleanAddress = form.address.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
    return `Inventory_Report_${cleanAddress}_Powered_by_thepeoplesagency.pdf`;
  };

  // Validation
  const _required = ['name', 'cea', 'mobile', 'address'];
  const isFieldInvalid = (field) => !form[field] && formTouched[field];

  // Only show inventory for HDB, Condo, Landed
  const showInventory = ['HDB', 'Condo', 'Landed'].includes(form.propertyType);

  return (
    <div className="handover-app-root">
      {/* Header */}
      <header className="handover-header">
        <div className="handover-logo-container">
          <img 
            src="/png/120x120.png" 
            alt="Handover App Logo" 
            className="handover-main-logo"
          />
        </div>
        <h1 className="handover-header-interactive">Welcome to Handover!</h1>
        <p className="handover-intro">
          <span className="modern-typing-text">{displayText}</span>
          <span className="modern-cursor">|</span>
        </p>
      </header>

      {/* Main Content */}
      <main className="handover-main">
        {/* Form Section */}
        <section className="handover-section handover-form-card">
          <h2 className="handover-section-title">Property & Agent Details</h2>
          <form className="handover-form" autoComplete="off">
            <div className="handover-form-group">
              <label>
                Salesperson Name <span className="handover-required">*</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={isFieldInvalid('name') ? 'handover-invalid' : ''}
                  required
                />
              </label>
            </div>
            <div className="handover-form-group">
              <label>
                CEA Registration Number <span className="handover-required">*</span>
                <input
                  type="text"
                  name="cea"
                  value={form.cea}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={isFieldInvalid('cea') ? 'handover-invalid' : ''}
                  required
                />
              </label>
            </div>
            <div className="handover-form-group">
              <label>
                Mobile Number <span className="handover-required">*</span>
                <input
                  type="tel"
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={isFieldInvalid('mobile') ? 'handover-invalid' : ''}
                  required
                  inputMode="numeric"
                  pattern="[0-9]+"
                  maxLength={12}
                />
              </label>
            </div>
            
            <div className="handover-form-group">
              <label>
                Agent Company
                <input
                  type="text"
                  name="agentCompany"
                  value={form.agentCompany}
                  onChange={handleChange}
                  placeholder="Your company name"
                />
              </label>
            </div>
            
            <div className="handover-form-group">
              <label>
                Agent Email
                <input
                  type="email"
                  name="agentEmail"
                  value={form.agentEmail}
                  onChange={handleChange}
                  placeholder="your.email@company.com"
                />
              </label>
            </div>
            
            <div className="handover-form-group">
              <label>
                Property Address <span className="handover-required">*</span>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={isFieldInvalid('address') ? 'handover-invalid' : ''}
                  required
                  rows={2}
                />
              </label>
            </div>
            <div className="handover-form-group">
              <label>
                Date Generated
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                />
              </label>
            </div>
            <div className="handover-form-group">
              <label>
                Transaction Type
                <select name="transactionType" value={form.transactionType} onChange={handleChange}>
                  <option value="">Select Transaction Type</option>
                  <option value="sale">Sale (Vendor & Purchaser)</option>
                  <option value="rental">Rental (Landlord & Tenant)</option>
                </select>
              </label>
            </div>
            <div className="handover-form-group">
              <label>
                Property Type
                <select name="propertyType" value={form.propertyType} onChange={handleChange}>
                  <option value="">Select Property Type</option>
                  {propertyTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            
            {/* Show fields based on transaction type */}
            {form.transactionType === 'sale' && (
              <>
                <div className="handover-form-group">
                  <label>
                    Vendor Name
                    <input
                      type="text"
                      name="vendorPurchaserName"
                      value={form.vendorPurchaserName}
                      onChange={handleChange}
                      placeholder="Enter vendor name"
                    />
                  </label>
                </div>
                <div className="handover-form-group">
                  <label>
                    Purchaser Name
                    <input
                      type="text"
                      name="purchaserName"
                      value={form.purchaserName}
                      onChange={handleChange}
                      placeholder="Enter purchaser name"
                    />
                  </label>
                </div>
              </>
            )}
            
            {form.transactionType === 'rental' && (
              <>
                <div className="handover-form-group">
                  <label>
                    Landlord Name
                    <input
                      type="text"
                      name="landlordTenantName"
                      value={form.landlordTenantName}
                      onChange={handleChange}
                      placeholder="Enter landlord name"
                    />
                  </label>
                </div>
                <div className="handover-form-group">
                  <label>
                    Tenant Name
                    <input
                      type="text"
                      name="tenantName"
                      value={form.tenantName}
                      onChange={handleChange}
                      placeholder="Enter tenant name"
                    />
                  </label>
                </div>
              </>
            )}
            <div className="handover-form-group">
              <label>
                Date Inspected
                <input
                  type="date"
                  name="inspectionDate"
                  value={form.inspectionDate}
                  onChange={handleChange}
                />
              </label>
            </div>
            <div className="handover-form-group">
              <label>
                Time Inspected
                <input
                  type="time"
                  name="inspectionTime"
                  value={form.inspectionTime}
                  onChange={handleChange}
                />
              </label>
            </div>
            
            {/* Enhanced Property Details */}
            <div className="handover-form-group">
              <label>
                Property Size (sqft)
                <input
                  type="text"
                  name="propertySize"
                  value={form.propertySize}
                  onChange={handleChange}
                  placeholder="e.g., 1200 sqft"
                />
              </label>
            </div>
            
            <div className="handover-form-group">
              <label>
                Number of Rooms
                <input
                  type="number"
                  name="numberOfRooms"
                  value={form.numberOfRooms}
                  onChange={handleChange}
                  placeholder="e.g., 4"
                  min="1"
                />
              </label>
            </div>
            
            <div className="handover-form-group">
              <label>
                Property Condition
                <select name="propertyCondition" value={form.propertyCondition} onChange={handleChange}>
                  <option value="">Select Condition</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Needs Renovation">Needs Renovation</option>
                </select>
              </label>
            </div>
            
            <div className="handover-form-group">
              <label>
                Special Notes
                <textarea
                  name="specialNotes"
                  value={form.specialNotes}
                  onChange={handleChange}
                  placeholder="Any special observations or notes about the property..."
                  rows={3}
                />
              </label>
            </div>
            
            <div className="handover-form-group">
              <label>
                Recommendations
                <textarea
                  name="recommendations"
                  value={form.recommendations}
                  onChange={handleChange}
                  placeholder="Any recommendations for the property..."
                  rows={3}
                />
              </label>
            </div>
            
          </form>
        </section>

        {/* Inventory Section */}
        {showInventory && (
          <section className="handover-section handover-inventory-card">
            <h2 className="handover-section-title">Property Inventory</h2>
            <div className="handover-inventory-list">
              {rooms.map((room, rIdx) => (
                <div key={room.key} className="handover-room-card">
                  <div
                    className="handover-room-header"
                    onClick={() => handleExpand(room.key)}
                    tabIndex={0}
                    role="button"
                    aria-expanded={!!expanded[room.key]}
                  >
                    <span className={`handover-chevron${expanded[room.key] ? ' expanded' : ''}`}>▶</span>
                    <span className="handover-room-title">{room.name}</span>
                  </div>
                  <div
                    className="handover-room-body"
                    style={{
                      maxHeight: expanded[room.key] ? 500 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
                    }}
                  >
                    {expanded[room.key] && (
                      <div className="handover-room-items">
                        {room.items.map((item, iIdx) => {
                          // Check if this is a custom item (added after the default items)
                          const isCustomItem = iIdx >= (defaultRooms.find(r => r.key === room.key)?.items.length || 0);
                          
                          return (
                            <div key={iIdx} className="handover-inventory-item">
                              <input
                                type="checkbox"
                                checked={!!(inventory[room.key]?.[iIdx]?.checked)}
                                onChange={() => handleItemCheck(room.key, iIdx)}
                                id={`inv-${room.key}-${iIdx}`}
                              />
                              <label htmlFor={`inv-${room.key}-${iIdx}`}>{item}</label>
                            <input
                              type="number"
                              min={0}
                              value={inventory[room.key]?.[iIdx]?.qty || 0}
                              onChange={e => handleQtyChange(room.key, iIdx, e.target.value)}
                              className="handover-qty-input"
                              style={{ width: 50, marginLeft: 8 }}
                              disabled={!inventory[room.key]?.[iIdx]?.checked}
                            />
                              {isCustomItem && (
                                <button
                                  type="button"
                                  className="handover-remove-custom-btn"
                                  onClick={() => handleRemoveCustomItem(room.key, iIdx)}
                                  title="Remove custom item"
                                  style={{ 
                                    marginLeft: 8, 
                                    padding: '2px 6px', 
                                    fontSize: '12px',
                                    backgroundColor: '#ff4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          className="handover-add-custom-btn"
                          onClick={() => handleAddCustomItem(room.key)}
                          title="Add unlimited custom items"
                        >
                          + Add Custom Item (Unlimited)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="handover-room-actions">
                <button type="button" className="handover-add-room-btn" onClick={() => handleAddRoom('bedroom')}>
                  + Add Bedroom
                </button>
                <button type="button" className="handover-add-room-btn" onClick={() => handleAddRoom('bathroom')}>
                  + Add Bathroom
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Photo Capture Section */}
        <section className="handover-section handover-photo-card">
          <h2 className="handover-section-title">Property Photos</h2>
          <div className="handover-photo-header">
            <div className="handover-photo-header-left">
              <button
                type="button"
                className="handover-photo-add-btn"
                onClick={handleAddPhotoClick}
                aria-label="Add Photo"
                disabled={photos.length >= 100}
              >
                <span role="img" aria-label="camera" style={{ marginRight: 8 }}>📷</span>
                Add Photo
              </button>
              <span className="handover-photo-counter">
                {photos.length}/100 photos
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handlePhotoChange}
            />
          </div>
          <div className="handover-photo-grid">
            {photos.map((photo, idx) => (
              <div className="handover-photo-item" key={idx}>
                <div className="handover-photo-thumb-wrap">
                  <img src={photo.url} alt={`Photo ${idx + 1}`} className="handover-photo-thumb" />
                  <button
                    type="button"
                    className="handover-photo-remove"
                    onClick={() => handleRemovePhoto(idx)}
                    aria-label="Remove Photo"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  className="handover-photo-comment"
                  placeholder="Add comment..."
                  value={photo.comment}
                  onChange={e => handlePhotoComment(idx, e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Signature Section */}
        <section className="handover-section handover-signature-card">
          <h2 className="handover-section-title">Digital Signatures</h2>
          
          {/* Agent Signature */}
          <div className="handover-signature-group">
            <label className="handover-signature-label">Agent Signature</label>
            <div className="handover-signature-container">
              <SignaturePad
                ref={agentSigRef}
                canvasProps={{
                  className: 'handover-signature-canvas',
                  width: 400,
                  height: 150
                }}
                onEnd={() => handleSignatureChange('agent')}
              />
              <button
                type="button"
                className="handover-signature-clear"
                onClick={() => clearSignature('agent')}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Sale Transaction Signatures */}
          {form.transactionType === 'sale' && (
            <>
              {/* Vendor Signature */}
              <div className="handover-signature-group">
                <label className="handover-signature-label">Vendor Signature</label>
                <div className="handover-signature-container">
                  <SignaturePad
                    ref={vendorSigRef}
                    canvasProps={{
                      className: 'handover-signature-canvas',
                      width: 400,
                      height: 150
                    }}
                    onEnd={() => handleSignatureChange('vendor')}
                  />
                  <button
                    type="button"
                    className="handover-signature-clear"
                    onClick={() => clearSignature('vendor')}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Purchaser Signature */}
              <div className="handover-signature-group">
                <label className="handover-signature-label">Purchaser Signature</label>
                <div className="handover-signature-container">
                  <SignaturePad
                    ref={purchaserSigRef}
                    canvasProps={{
                      className: 'handover-signature-canvas',
                      width: 400,
                      height: 150
                    }}
                    onEnd={() => handleSignatureChange('purchaser')}
                  />
                  <button
                    type="button"
                    className="handover-signature-clear"
                    onClick={() => clearSignature('purchaser')}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Rental Transaction Signatures */}
          {form.transactionType === 'rental' && (
            <>
              {/* Landlord Signature */}
              <div className="handover-signature-group">
                <label className="handover-signature-label">Landlord Signature</label>
                <div className="handover-signature-container">
                  <SignaturePad
                    ref={landlordSigRef}
                    canvasProps={{
                      className: 'handover-signature-canvas',
                      width: 400,
                      height: 150
                    }}
                    onEnd={() => handleSignatureChange('landlord')}
                  />
                  <button
                    type="button"
                    className="handover-signature-clear"
                    onClick={() => clearSignature('landlord')}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Tenant Signature */}
              <div className="handover-signature-group">
                <label className="handover-signature-label">Tenant Signature</label>
                <div className="handover-signature-container">
                  <SignaturePad
                    ref={tenantSigRef}
                    canvasProps={{
                      className: 'handover-signature-canvas',
                      width: 400,
                      height: 150
                    }}
                    onEnd={() => handleSignatureChange('tenant')}
                  />
                  <button
                    type="button"
                    className="handover-signature-clear"
                    onClick={() => clearSignature('tenant')}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Reset Buttons */}
        <section className="handover-section handover-reset-card">
          <div className="handover-reset-buttons">
            <button
              type="button"
              className="handover-reset-btn handover-reset-agent"
              onClick={clearAgentData}
              title="Clear saved agent details"
            >
              Clear Agent Data
            </button>
            <button
              type="button"
              className="handover-reset-btn handover-reset-all"
              onClick={resetAllData}
              title="Reset all form data"
            >
              Reset All
            </button>
          </div>
        </section>

        {/* Submit Button */}
        <section className="handover-section handover-submit-card">
          {submitError && <div className="handover-error-msg">{submitError}</div>}
          
          {generating && (
            <div className="handover-progress-container" style={{ marginBottom: '20px' }}>
              <div className="handover-progress-bar" style={{ width: `${progress}%` }}></div>
              <div style={{ textAlign: 'center', marginTop: '0.5rem', color: '#bc9e7b', fontWeight: '600' }}>
                {progress < 30 && 'Preparing document...'}
                {progress >= 30 && progress < 50 && 'Processing inventory...'}
                {progress >= 50 && progress < 70 && 'Adding photos...'}
                {progress >= 70 && progress < 90 && 'Finalizing report...'}
                {progress >= 90 && 'Almost done...'}
              </div>
            </div>
          )}
          
          <button
            className="handover-submit-btn"
            onClick={handleGeneratePDF}
            disabled={generating}
            type="button"
          >
            {generating ? `Generating PDF... ${progress}%` : 'Generate PDF Report'}
          </button>
        </section>
      </main>

      {/* Installation Guide Section */}
      <section className="handover-section handover-install-card">
        <div className="handover-install-content">
          <h3 className="handover-install-title">📱 Install This App on Your Phone</h3>
          <p className="handover-install-description">
            Add this app to your home screen for quick access and better experience!
          </p>
          
          <div className="handover-install-steps">
            <div className="handover-install-step">
              <div className="handover-step-number">1</div>
              <div className="handover-step-content">
                <h4>iPhone Users</h4>
                <p>Tap the <strong>Share button</strong> (□↑) → <strong>"Add to Home Screen"</strong> → <strong>"Add"</strong></p>
              </div>
            </div>
            
            <div className="handover-install-step">
              <div className="handover-step-number">2</div>
              <div className="handover-step-content">
                <h4>Android Users</h4>
                <p>Tap the <strong>Menu</strong> (⋮) → <strong>"Add to Home screen"</strong> → <strong>"Add"</strong></p>
              </div>
            </div>
            
            <div className="handover-install-step">
              <div className="handover-step-number">3</div>
              <div className="handover-step-content">
                <h4>Desktop Users</h4>
                <p>Look for the <strong>Install icon</strong> (⊕) in your browser address bar and click it</p>
              </div>
            </div>
          </div>
          
          <div className="handover-install-benefits">
            <h4>✨ Benefits of Installing:</h4>
            <ul>
              <li>🚀 <strong>Faster access</strong> - Launch like a native app</li>
              <li>📱 <strong>Home screen icon</strong> - Easy to find and use</li>
              <li>💾 <strong>Offline capability</strong> - Works without internet</li>
              <li>🔄 <strong>Auto-updates</strong> - Always get the latest features</li>
              <li>🔔 <strong>Notifications</strong> - Stay updated on new features</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Signup Section */}
      <section className="handover-section handover-signup-card">
        <div className="handover-signup-content">
          <h3 className="handover-signup-title">🚀 Stay Updated with Our Innovations!</h3>
          <p className="handover-signup-description">
            Love this app? Sign up to get notified about our latest innovations and new features!
          </p>
          
          <form onSubmit={handleSignup} className="handover-signup-form">
            <div className="handover-signup-input-group">
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="Enter your email address"
                className="handover-signup-input"
                required
              />
              <button type="submit" className="handover-signup-btn">
                Subscribe
              </button>
            </div>
            
            {signupError && (
              <div className="handover-signup-error">
                {signupError}
              </div>
            )}
            
            {signupSuccess && (
              <div className="handover-signup-success">
                ✅ Thank you! We'll keep you updated on our latest innovations.
              </div>
            )}
          </form>
          
          <p className="handover-signup-note">
            We respect your privacy. No spam, just innovation updates!
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="handover-footer">
        Powered by #thepeoplesagency 2025
      </footer>
    </div>
  );
}

export default App;
