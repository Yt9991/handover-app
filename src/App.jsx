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

  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupError, setSignupError] = useState('');

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
      const item = room[itemIdx] || { checked: false, qty: 1, name: rooms.find(r => r.key === roomKey).items[itemIdx] };
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
      const item = room[itemIdx] || { checked: false, qty: 1, name: rooms.find(r => r.key === roomKey).items[itemIdx] };
      return {
        ...prev,
        [roomKey]: {
          ...room,
          [itemIdx]: { ...item, qty: Math.max(1, Number(qty) || 1) },
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
    if (!customName) return;
    setRooms((prev) => prev.map(r => r.key === roomKey ? { ...r, items: [...r.items, customName] } : r));
  };

  // Photo handlers
  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 30 photos total
    if (photos.length + files.length > 30) {
      setSubmitError(`Maximum 30 photos allowed. You currently have ${photos.length} photos and are trying to add ${files.length} more.`);
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

  // PDF generation
  const handleGeneratePDF = async () => {
    setSubmitError('');
    // Validate required fields
    if (!form.name || !form.cea || !form.mobile || !form.address) {
      setSubmitError('Please fill in all required fields.');
      return;
    }
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
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
      doc.rect(40, y, pageWidth - 80, 100, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('AGENT INFORMATION', 50, y + 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Salesperson: ${form.name}`, 50, y + 40);
      doc.text(`CEA Registration: ${form.cea}`, 50, y + 55);
      doc.text(`Mobile: ${form.mobile}`, 50, y + 70);
      doc.text(`Role: ${form.role || 'Not specified'}`, 50, y + 85);
      
      y += 120;
      
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
      // Inventory Section
      if (['HDB', 'Condo', 'Landed'].includes(form.propertyType)) {
        // Check if we need a new page
        if (y > 600) {
          doc.addPage();
          y = 40;
        }
        
        doc.setFillColor(250, 248, 246);
        doc.rect(40, y, pageWidth - 80, 200, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('INVENTORY CHECKLIST', 50, y + 20);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        let inventoryY = y + 40;
        
        rooms.forEach(room => {
          const checkedItems = (inventory[room.key] ? Object.entries(inventory[room.key]) : []).filter(([idx, item]) => item.checked);
          if (checkedItems.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text(`${room.name}:`, 50, inventoryY);
            inventoryY += 15;
            doc.setFont('helvetica', 'normal');
            checkedItems.forEach(([idx, item]) => {
              doc.text(`✓ ${room.items[idx]} (Qty: ${item.qty})`, 60, inventoryY);
              inventoryY += 12;
            });
            inventoryY += 5;
          }
        });
        
        y += 220;
      }
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
        
        let photoY = y + 40;
        let photosPerPage = 0;
        const maxPhotosPerPage = 3; // 3 photos per page for better layout
        
        for (let i = 0; i < photos.length; i++) {
          // Check if we need a new page for photos
          if (photosPerPage >= maxPhotosPerPage) {
            doc.addPage();
            y = 40;
            photoY = y + 40;
            photosPerPage = 0;
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
          } catch (e) { /* fallback to original */ }
          
          // Add image with border
          doc.setDrawColor(188, 158, 123);
          doc.rect(50, photoY, 100, 75, 'S');
          doc.addImage(imgData, 'JPEG', 50, photoY, 100, 75);
          
          // Add comment if exists
          if (photos[i].comment) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Photo ${i + 1}: ${photos[i].comment}`, 160, photoY + 20, { maxWidth: 300 });
          }
          
          photoY += 90;
          photosPerPage++;
        }
        
        y += 320;
      }
      
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
      
      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(107, 81, 63);
      doc.text('Powered by #thepeoplesagency 2025', 40, pageHeight - 20);
      // Save
      let pdfBlob = doc.output('blob');
      // If over 5MB, warn user (increased limit for more photos)
      if (pdfBlob.size > 5 * 1024 * 1024) {
        setSubmitError('PDF is too large (>5MB). Try reducing the number of photos or contact support for larger reports.');
        setGenerating(false);
        return;
      }
      doc.save('handover-report.pdf');
    } catch (err) {
      setSubmitError('Failed to generate PDF. Please try again.');
    }
    setGenerating(false);
  };

  // Validation
  const required = ['name', 'cea', 'mobile', 'address'];
  const isFieldInvalid = (field) => !form[field] && formTouched[field];

  // Only show inventory for HDB, Condo, Landed
  const showInventory = ['HDB', 'Condo', 'Landed'].includes(form.propertyType);

  return (
    <div className="handover-app-root">
      {/* Header */}
      <header className="handover-header">
        <h1>Welcome to Handover!</h1>
        <p className="handover-intro">
          Forget the old-school way — we make handover reports fast, fuss-free, and solid.<br/>
          Whether it's HDB, Condo, Landed, Commercial, or Industrial — we got your back.<br/>
          Let's go digital, Smart <span className="singapore-text">Singapore!</span> <span className="rocket-emoji">🚀</span>
        </p>
      </header>

      {/* Main Content */}
      <main className="handover-main">
        {/* Form Section */}
        <section className="handover-section handover-form-card">
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
          </form>
        </section>

        {/* Inventory Section */}
        {showInventory && (
          <section className="handover-section handover-inventory-card">
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
                        {room.items.map((item, iIdx) => (
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
                              min={1}
                              value={inventory[room.key]?.[iIdx]?.qty || 1}
                              onChange={e => handleQtyChange(room.key, iIdx, e.target.value)}
                              className="handover-qty-input"
                              style={{ width: 50, marginLeft: 8 }}
                              disabled={!inventory[room.key]?.[iIdx]?.checked}
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          className="handover-add-custom-btn"
                          onClick={() => handleAddCustomItem(room.key)}
                        >
                          + Add Custom Item
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
          <div className="handover-photo-header">
            <div className="handover-photo-header-left">
              <button
                type="button"
                className="handover-photo-add-btn"
                onClick={handleAddPhotoClick}
                aria-label="Add Photo"
                disabled={photos.length >= 30}
              >
                <span role="img" aria-label="camera" style={{ marginRight: 8 }}>📷</span>
                Add Photo
              </button>
              <span className="handover-photo-counter">
                {photos.length}/30 photos
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
          <h3 className="handover-signature-title">Digital Signatures</h3>
          
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
          <button
            className="handover-submit-btn"
            onClick={handleGeneratePDF}
            disabled={generating}
            type="button"
          >
            {generating ? 'Generating PDF...' : 'Generate PDF'}
          </button>
        </section>
      </main>

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
