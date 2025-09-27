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
      const currentRooms = rooms.find(r => r.key === roomKey);
      const itemName = currentRooms?.items[itemIdx];

      const item = room[itemIdx] || { checked: false, qty: 0, name: itemName };

      const newInventory = {
        ...prev,
        [roomKey]: {
          ...room,
          [itemIdx]: {
            ...item,
            checked: !item.checked,
            qty: !item.checked ? Math.max(1, item.qty) : item.qty // Set qty to 1 when checking
          },
        },
      };

      return newInventory;
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

    // Get current room to calculate the new index
    const currentRoom = rooms.find(r => r.key === roomKey);
    const newItemIndex = currentRoom ? currentRoom.items.length : 0;

    // Update both states together
    setRooms((prev) => {
      const newRooms = prev.map(r =>
        r.key === roomKey
          ? { ...r, items: [...r.items, customName.trim()] }
          : r
      );
      return newRooms;
    });

    // Immediately update inventory with the calculated index
    setInventory((prevInventory) => {
      const room = prevInventory[roomKey] || {};

      const newInventory = {
        ...prevInventory,
        [roomKey]: {
          ...room,
          [newItemIndex]: { checked: true, qty: 1, name: customName.trim() }
        }
      };

      return newInventory;
    });
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


  // NEW SIMPLIFIED PDF GENERATION - GUARANTEED TO CAPTURE ALL ITEMS
  const generateCompactPDF = async () => {
    setGenerating(true);
    setProgress(0);
    try {
      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4',
        compress: true,
        precision: 2
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      setProgress(10);

      // Header
      doc.setFillColor(188, 158, 123);
      doc.rect(0, 0, pageWidth, 60, 'F');

      try {
        const logoImg = new Image();
        logoImg.src = '/png/120x120.png';
        doc.addImage(logoImg, 'PNG', pageWidth - 80, 5, 50, 50);
      } catch (e) {
        console.warn('Logo could not be added to PDF:', e);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('PROPERTY HANDOVER REPORT', 40, 35);

      // Tagline
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Your Trusted Partner in Property Transitions', 40, 50);

      doc.setTextColor(66, 45, 42);
      let y = 100;

      // Property & Salesperson Information
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PROPERTY & SALESPERSON INFORMATION', 50, y + 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Property: ${form.address}`, 50, y + 40);
      doc.text(`Type: ${form.propertyType || 'Not specified'} | Size: ${form.propertySize || 'Not specified'}`, 50, y + 55);
      doc.text(`Salesperson: ${form.name} (CEA: ${form.cea}) | Mobile: ${form.mobile}`, 50, y + 70);
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

      // NEW SIMPLIFIED INVENTORY SECTION
      if (['HDB', 'Condo', 'Landed'].includes(form.propertyType)) {
        if (y > 600) {
          doc.addPage();
          y = 40;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('INVENTORY CHECKLIST', 50, y + 20);

        let inventoryY = y + 40;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        // COMPLETELY NEW APPROACH - ITERATE THROUGH ALL ROOMS AND ITEMS DIRECTLY
        let totalCheckedItems = 0;

        rooms.forEach((room) => {
          // Check if we need a new page
          if (inventoryY > pageHeight - 150) {
            doc.addPage();
            inventoryY = 60;
          }

          // Collect all checked items for this room
          const roomCheckedItems = [];

          // Go through ALL items in the room
          room.items.forEach((itemName, itemIndex) => {
            // Check if this item is checked in inventory
            const isChecked = inventory[room.key] && inventory[room.key][itemIndex] && inventory[room.key][itemIndex].checked;
            const qty = inventory[room.key] && inventory[room.key][itemIndex] ? inventory[room.key][itemIndex].qty || 1 : 1;

            if (isChecked) {
              roomCheckedItems.push(`${itemName} (Qty: ${qty})`);
              totalCheckedItems++;
            }
          });

          // Only add room to PDF if it has checked items
          if (roomCheckedItems.length > 0) {
            // Room title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`${room.name}:`, 50, inventoryY);
            inventoryY += 15;

            // List all checked items
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            roomCheckedItems.forEach(item => {
              if (inventoryY > pageHeight - 50) {
                doc.addPage();
                inventoryY = 60;
              }
              doc.text(`• ${item}`, 60, inventoryY);
              inventoryY += 12;
            });

            inventoryY += 5; // Space between rooms
          }
        });

        // If no items were checked, show message
        if (totalCheckedItems === 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('No inventory items have been checked.', 50, inventoryY);
          inventoryY += 20;
        }

        y = inventoryY + 20;
      }

      setProgress(50);

      // Photos section (unchanged)
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

        for (let i = 0; i < Math.min(photos.length, 12); i++) {
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

          if (photos[i].comment) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(`Photo ${i + 1}: ${photos[i].comment}`, 120, photoY + 10, { maxWidth: 150 });
          }

          photoY += 55;
          photosPerPage++;
        }

        y += 220;
      }
      setProgress(70);

      // Signatures section (unchanged)
      if (y > 300) {
        doc.addPage();
        y = 40;
      }

      doc.setFillColor(250, 248, 246);
      doc.rect(40, y, pageWidth - 80, 220, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('SIGNATURES', 50, y + 20);

      // Salesperson signature
      doc.setDrawColor(59, 130, 246);
      doc.rect(50, y + 40, 200, 60, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Salesperson Signature', 55, y + 55);

      if (signatures.agent) {
        try {
          doc.addImage(signatures.agent, 'PNG', 55, y + 60, 180, 20);
        } catch (e) {
          doc.text('Signature captured', 55, y + 65);
        }
      }

      doc.text(`Name: ${form.name}`, 55, y + 85);
      doc.text(`CEA: ${form.cea}`, 55, y + 95);

      // Transaction signatures
      if (form.transactionType === 'sale') {
        doc.rect(300, y + 40, 200, 60, 'S');
        doc.text('Vendor Signature', 305, y + 55);

        if (signatures.vendor) {
          try {
            doc.addImage(signatures.vendor, 'PNG', 305, y + 60, 180, 20);
          } catch (e) {
            doc.text('Signature captured', 305, y + 65);
          }
        }

        doc.text(`Name: ${form.vendorPurchaserName || '________________'}`, 305, y + 85);
        doc.text(`Date: ${form.inspectionDate}`, 305, y + 95);

        doc.rect(50, y + 120, 200, 60, 'S');
        doc.text('Purchaser Signature', 55, y + 135);

        if (signatures.purchaser) {
          try {
            doc.addImage(signatures.purchaser, 'PNG', 55, y + 140, 180, 20);
          } catch (e) {
            doc.text('Signature captured', 55, y + 145);
          }
        }

        doc.text(`Name: ${form.purchaserName || '________________'}`, 55, y + 165);
        doc.text(`Date: ${form.inspectionDate}`, 55, y + 175);
      } else if (form.transactionType === 'rental') {
        doc.rect(300, y + 40, 200, 60, 'S');
        doc.text('Landlord Signature', 305, y + 55);

        if (signatures.landlord) {
          try {
            doc.addImage(signatures.landlord, 'PNG', 305, y + 60, 180, 20);
          } catch (e) {
            doc.text('Signature captured', 305, y + 65);
          }
        }

        doc.text(`Name: ${form.landlordTenantName || '________________'}`, 305, y + 85);
        doc.text(`Date: ${form.inspectionDate}`, 305, y + 95);

        doc.rect(50, y + 120, 200, 60, 'S');
        doc.text('Tenant Signature', 55, y + 135);

        if (signatures.tenant) {
          try {
            doc.addImage(signatures.tenant, 'PNG', 55, y + 140, 180, 20);
          } catch (e) {
            doc.text('Signature captured', 55, y + 145);
          }
        }

        doc.text(`Name: ${form.tenantName || '________________'}`, 55, y + 165);
        doc.text(`Date: ${form.inspectionDate}`, 55, y + 175);
      }

      setProgress(90);

      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(107, 81, 63);
      doc.text('Powered by Team Mindlink, #thepeoplesagency ©2025', 40, pageHeight - 20);

      // Add page numbers
      const totalPages = doc.internal.getNumberOfPages();
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(139, 111, 69);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 70, pageHeight - 10, { align: 'right' });
      }

      setProgress(100);
      doc.save(generateFilename());
    } catch (error) {
      console.error('PDF generation error:', error);
      setSubmitError('Failed to generate PDF. Please try again.');
    }
    setGenerating(false);
    setProgress(0);
  };


  // Helper function to generate consistent filename
  const generateFilename = () => {
    const cleanAddress = form.address.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
    return `Inventory Report Powered by #thepeoplesagency - ${cleanAddress}.pdf`;
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
          <h2 className="handover-section-title">Property & Salesperson Details</h2>
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
                Salesperson Company
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
                Salesperson Email
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
                      maxHeight: expanded[room.key] ? '2000px' : 0,
                      overflow: expanded[room.key] ? 'visible' : 'hidden',
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
          
          {/* Salesperson Signature */}
          <div className="handover-signature-group">
            <label className="handover-signature-label">Salesperson Signature</label>
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
              title="Clear saved salesperson details"
            >
              Clear Salesperson Data
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
        Powered by Team Mindlink, #thepeoplesagency ©2025
      </footer>
    </div>
  );
}

export default App;
