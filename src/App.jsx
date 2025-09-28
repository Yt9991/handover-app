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

const createInitialFormState = () => ({
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
  propertySize: '',
  numberOfRooms: '',
  propertyCondition: '',
  specialNotes: '',
  recommendations: '',
  agentCompany: '',
  agentEmail: '',
});

const LOCAL_STORAGE_KEYS = {
  agentData: 'handoverAgentData',
  signatures: 'handoverSignatures',
};

function App() {
  // Form state
  const [form, setForm] = useState(() => {
    const base = createInitialFormState();
    try {
      const savedAgentData = localStorage.getItem(LOCAL_STORAGE_KEYS.agentData);
      if (savedAgentData) {
        const agentData = JSON.parse(savedAgentData);
        return {
          ...base,
          ...Object.fromEntries(
            Object.entries(agentData).filter(([key]) => key in base)
          )
        };
      }
    } catch (error) {
      console.error('Error accessing saved agent data:', error);
    }
    return base;
  });
  const [formTouched, setFormTouched] = useState({});

  // Load agent details and signatures from local storage on component mount
  useEffect(() => {
    try {
      const savedSignatures = localStorage.getItem(LOCAL_STORAGE_KEYS.signatures);
      if (savedSignatures) {
        const parsed = JSON.parse(savedSignatures);
        setSignatures(prev => ({
          ...prev,
          ...parsed,
          // Auto-load default agent signature if no current agent signature exists
          agent: parsed.agent || parsed.agentDefault || prev.agent
        }));
      }
    } catch (error) {
      console.error('Error loading saved signatures:', error);
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


  // Save agent details to local storage - expanded to include more fields
  const saveAgentData = (name, value) => {
    const agentFields = ['name', 'cea', 'mobile', 'agentCompany', 'agentEmail'];
    if (agentFields.includes(name)) {
      try {
        const currentAgentData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.agentData) || '{}');
        const updatedAgentData = { ...currentAgentData, [name]: value };
        localStorage.setItem(LOCAL_STORAGE_KEYS.agentData, JSON.stringify(updatedAgentData));
      } catch (error) {
        console.error('Error saving agent data:', error);
      }
    }
  };

  // Save all current agent data as defaults
  const saveAsDefaults = () => {
    // Validate required fields before saving
    if (!form.name || !form.cea || !form.mobile) {
      alert('❌ Please fill in required fields (Name, CEA, Mobile) before saving as defaults.');
      return;
    }

    try {
      const agentDefaults = {
        name: form.name,
        cea: form.cea,
        mobile: form.mobile,
        agentCompany: form.agentCompany,
        agentEmail: form.agentEmail
      };
      localStorage.setItem(LOCAL_STORAGE_KEYS.agentData, JSON.stringify(agentDefaults));

      // Also save current signature as default if it exists
      if (signatures.agent) {
        const currentSignatures = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.signatures) || '{}');
        localStorage.setItem(LOCAL_STORAGE_KEYS.signatures, JSON.stringify({
          ...currentSignatures,
          agentDefault: signatures.agent
        }));
      }

      alert('✅ Your details have been saved as defaults for future reports!');
    } catch (error) {
      console.error('Error saving defaults:', error);
      alert('❌ Failed to save defaults. Please try again.');
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
      const dataUrl = sigRef.current.toDataURL();
      setSignatures(prev => ({
        ...prev,
        [type]: dataUrl
      }));
      try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.signatures) || '{}');
        localStorage.setItem(LOCAL_STORAGE_KEYS.signatures, JSON.stringify({
          ...stored,
          [type]: dataUrl,
        }));
      } catch (error) {
        console.error('Error saving signature:', error);
      }
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
    
    if (!sigRef.current) return;

    sigRef.current.clear();
    setSignatures(prev => ({
      ...prev,
      [type]: ''
    }));

    try {
      const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.signatures) || '{}');
      delete stored[type];
      localStorage.setItem(LOCAL_STORAGE_KEYS.signatures, JSON.stringify(stored));
    } catch (error) {
      console.error('Error clearing saved signature:', error);
    }
  };

  // Clear agent data from local storage
  const clearAgentData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.agentData);

    // Also clear default signature
    try {
      const currentSignatures = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.signatures) || '{}');
      delete currentSignatures.agentDefault;
      localStorage.setItem(LOCAL_STORAGE_KEYS.signatures, JSON.stringify(currentSignatures));
    } catch (error) {
      console.error('Error clearing signature defaults:', error);
    }

    setForm(prev => ({
      ...prev,
      name: '',
      cea: '',
      mobile: '',
      agentCompany: '',
      agentEmail: ''
    }));

    // Clear agent signature
    setSignatures(prev => ({
      ...prev,
      agent: ''
    }));

    if (agentSigRef.current) {
      agentSigRef.current.clear();
    }

    alert('✅ Saved defaults have been cleared.');
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
    setSignatures({ agent: '', vendor: '', purchaser: '', landlord: '', tenant: '' });
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

      // Property & Salesperson Information with 2-column layout
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PROPERTY & SALESPERSON INFORMATION', 50, y + 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Left column - Property Information
      const leftColumnX = 50;
      const rightColumnX = 320;
      const columnWidth = 250;

      let leftY = y + 40;
      let rightY = y + 40;

      // Property details (left column)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PROPERTY DETAILS', leftColumnX, leftY);
      leftY += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const addressLines = doc.splitTextToSize(`Address: ${form.address}`, columnWidth);
      doc.text(addressLines, leftColumnX, leftY);
      leftY += addressLines.length * 12;

      doc.text(`Type: ${form.propertyType || 'Not specified'}`, leftColumnX, leftY);
      leftY += 12;
      doc.text(`Size: ${form.propertySize || 'Not specified'}`, leftColumnX, leftY);
      leftY += 12;
      doc.text(`Rooms: ${form.numberOfRooms || 'Not specified'}`, leftColumnX, leftY);
      leftY += 12;
      doc.text(`Condition: ${form.propertyCondition || 'Not specified'}`, leftColumnX, leftY);
      leftY += 12;
      doc.text(`Date Generated: ${form.date}`, leftColumnX, leftY);
      leftY += 12;
      doc.text(`Inspection: ${form.inspectionDate} ${form.inspectionTime}`, leftColumnX, leftY);
      leftY += 15;

      // Salesperson details (right column)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('SALESPERSON DETAILS', rightColumnX, rightY);
      rightY += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Name: ${form.name}`, rightColumnX, rightY);
      rightY += 12;
      doc.text(`CEA: ${form.cea}`, rightColumnX, rightY);
      rightY += 12;
      doc.text(`Mobile: ${form.mobile}`, rightColumnX, rightY);
      rightY += 12;

      if (form.agentCompany) {
        doc.text(`Agency: ${form.agentCompany}`, rightColumnX, rightY);
        rightY += 12;
      }

      if (form.agentEmail) {
        const emailLines = doc.splitTextToSize(`Email: ${form.agentEmail}`, columnWidth);
        doc.text(emailLines, rightColumnX, rightY);
        rightY += emailLines.length * 12;
      }

      rightY += 5;

      // Transaction parties (right column continued)
      if (form.transactionType === 'sale') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('TRANSACTION PARTIES', rightColumnX, rightY);
        rightY += 15;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Vendor: ${form.vendorPurchaserName || 'Not specified'}`, rightColumnX, rightY);
        rightY += 12;
        doc.text(`Purchaser: ${form.purchaserName || 'Not specified'}`, rightColumnX, rightY);
        rightY += 12;
      } else if (form.transactionType === 'rental') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('TRANSACTION PARTIES', rightColumnX, rightY);
        rightY += 15;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Landlord: ${form.landlordTenantName || 'Not specified'}`, rightColumnX, rightY);
        rightY += 12;
        doc.text(`Tenant: ${form.tenantName || 'Not specified'}`, rightColumnX, rightY);
        rightY += 12;
      }

      // Special notes spanning both columns if present
      if (form.specialNotes) {
        const maxY = Math.max(leftY, rightY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SPECIAL NOTES', leftColumnX, maxY + 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const notesLines = doc.splitTextToSize(form.specialNotes, pageWidth - 100);
        doc.text(notesLines, leftColumnX, maxY + 30);
        y = maxY + 30 + (notesLines.length * 12) + 20;
      } else {
        y = Math.max(leftY, rightY) + 20;
      }
      setProgress(30);

      // INVENTORY SECTION WITH 2-COLUMN LAYOUT
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

        // Column setup
        const leftColumnX = 50;
        const rightColumnX = 320;
        const columnWidth = 240;
        let leftColumnY = inventoryY;
        let rightColumnY = inventoryY;
        let currentColumn = 'left'; // Start with left column
        let totalCheckedItems = 0;

        // Collect all rooms with checked items
        const roomsWithItems = [];
        rooms.forEach((room) => {
          const roomCheckedItems = [];
          room.items.forEach((itemName, itemIndex) => {
            const isChecked = inventory[room.key] && inventory[room.key][itemIndex] && inventory[room.key][itemIndex].checked;
            const qty = inventory[room.key] && inventory[room.key][itemIndex] ? inventory[room.key][itemIndex].qty || 1 : 1;

            if (isChecked) {
              roomCheckedItems.push(`${itemName} (Qty: ${qty})`);
              totalCheckedItems++;
            }
          });

          if (roomCheckedItems.length > 0) {
            roomsWithItems.push({
              name: room.name,
              items: roomCheckedItems
            });
          }
        });

        // Distribute rooms across columns
        roomsWithItems.forEach((room, roomIndex) => {
          let currentY = currentColumn === 'left' ? leftColumnY : rightColumnY;

          // Check if room + items will fit in current column
          const roomHeight = 15 + (room.items.length * 12) + 10; // title + items + spacing

          // If it doesn't fit, switch column or new page
          if (currentY + roomHeight > pageHeight - 120) { // More space for footer
            if (currentColumn === 'left') {
              // Try right column
              currentColumn = 'right';
              currentY = rightColumnY;

              // If right column also doesn't have space, new page
              if (currentY + roomHeight > pageHeight - 120) { // More space for footer
                doc.addPage();
                leftColumnY = rightColumnY = inventoryY = 60;
                currentColumn = 'left';
                currentY = leftColumnY;
              }
            } else {
              // New page, start with left column
              doc.addPage();
              leftColumnY = rightColumnY = inventoryY = 60;
              currentColumn = 'left';
              currentY = leftColumnY;
            }
          }

          const finalX = currentColumn === 'left' ? leftColumnX : rightColumnX;
          const finalY = currentY;

          // Room title
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`${room.name}:`, finalX, finalY);
          currentY = finalY + 15;

          // List items
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          room.items.forEach(item => {
            const itemLines = doc.splitTextToSize(`• ${item}`, columnWidth);
            doc.text(itemLines, finalX + 10, currentY);
            currentY += itemLines.length * 10;
          });

          currentY += 10; // Space between rooms

          // Update column heights
          if (currentColumn === 'left') {
            leftColumnY = currentY;
            // Switch to right column for next room
            currentColumn = 'right';
          } else {
            rightColumnY = currentY;
            // Switch to left column for next room
            currentColumn = 'left';
          }
        });

        // If no items were checked, show message
        if (totalCheckedItems === 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('No inventory items have been checked.', leftColumnX, inventoryY);
          leftColumnY = inventoryY + 20;
        }

        // Set final Y position
        y = Math.max(leftColumnY, rightColumnY) + 20;
      }

      setProgress(50);

      // Photos section with improved 2-column layout
      if (photos.length > 0) {
        if (y > 400) {
          doc.addPage();
          y = 40;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`PHOTO DOCUMENTATION (${photos.length} photos)`, 50, y);

        let photoY = y + 25;
        let photosPerPage = 0;
        const maxPhotosPerPage = 10; // Increased from 6 to 10 for better utilization
        const photoWidth = 90;
        const photoHeight = 68;
        const leftColumnX = 50;
        const rightColumnX = 320;
        const verticalSpacing = 85;

        for (let i = 0; i < Math.min(photos.length, 20); i++) { // Increased from 12 to 20
          if (photosPerPage >= maxPhotosPerPage) {
            doc.addPage();
            photoY = 40;
            photosPerPage = 0;
          }

          // Determine column position (left or right)
          const isLeftColumn = (photosPerPage % 2) === 0;
          const photoX = isLeftColumn ? leftColumnX : rightColumnX;
          const currentPhotoY = photoY + Math.floor(photosPerPage / 2) * verticalSpacing;

          let imgData = photos[i].url;
          try {
            const file = await fetch(imgData).then(r => r.blob());
            const compressed = await imageCompression(file, {
              maxWidthOrHeight: 300,
              maxSizeMB: 0.08,
              useWebWorker: true
            });
            imgData = await imageCompression.getDataUrlFromFile(compressed);
          } catch (e) { /* fallback */ }

          try {
            doc.addImage(imgData, 'JPEG', photoX, currentPhotoY, photoWidth, photoHeight);
          } catch (e) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('Photo', photoX + 5, currentPhotoY + 35);
          }

          if (photos[i].comment) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            const commentLines = doc.splitTextToSize(`${i + 1}: ${photos[i].comment}`, photoWidth - 5);
            doc.text(commentLines, photoX, currentPhotoY + photoHeight + 8);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(`Photo ${i + 1}`, photoX, currentPhotoY + photoHeight + 8);
          }

          photosPerPage++;

          // Move to next page if we've reached page limit and this completes a row
          if (photosPerPage >= maxPhotosPerPage && !isLeftColumn) {
            photoY = currentPhotoY + verticalSpacing;
          }
        }

        // Calculate final Y position based on number of rows used
        const totalRows = Math.ceil(Math.min(photosPerPage, maxPhotosPerPage) / 2);
        y = photoY + (totalRows * verticalSpacing) + 20;
      }
      setProgress(70);

      // Signatures section (unchanged)
      if (y > 300) {
        doc.addPage();
        y = 40;
      }

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

      // Add footer with disclaimer and page numbers to all pages
      const totalPages = doc.internal.getNumberOfPages();
      const footerY = pageHeight - 80; // Increased space from bottom

      const disclaimerText = 'This property inventory handover report has been specially prepared by the salesperson for informational purposes only. While every effort has been made to ensure the accuracy and completeness of the information contained herein, no warranties or representations are made regarding its accuracy. The recipient is responsible for conducting their own verification and due diligence. The provider of this report accepts no liability for any errors, omissions, or losses arising from its use.';
      const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 80);

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum);

        // Add disclaimer to each page (full width)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(66, 45, 42);
        doc.text('Disclaimer:', 40, footerY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(107, 81, 63);
        // Use full width for disclaimer text
        const fullWidthDisclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 80);
        doc.text(fullWidthDisclaimerLines, 40, footerY + 10);

        // Powered by line (full width)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(188, 158, 123);
        doc.text('Powered by Team Mindlink | #thepeoplesagency © 2025', 40, footerY + 10 + (fullWidthDisclaimerLines.length * 8) + 8);

        // Page numbers below everything (centered)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(139, 111, 69);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
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

        {/* Data Management Buttons */}
        <section className="handover-section handover-reset-card">
          <h2 className="handover-section-title">Data Management</h2>
          <div className="handover-reset-buttons">
            <button
              type="button"
              className="handover-reset-btn handover-save-defaults"
              onClick={saveAsDefaults}
              title="Save current salesperson details and signature as defaults for future reports"
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '10px',
                marginBottom: '10px',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
            >
              💾 Save as My Defaults
            </button>
            <button
              type="button"
              className="handover-reset-btn handover-reset-agent"
              onClick={clearAgentData}
              title="Clear saved salesperson defaults"
              style={{
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '10px',
                marginBottom: '10px',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#e68900'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#ff9800'}
            >
              🗑️ Clear My Defaults
            </button>
            <button
              type="button"
              className="handover-reset-btn handover-reset-all"
              onClick={resetAllData}
              title="Reset current form only (keeps saved defaults)"
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '10px',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#d32f2f'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f44336'}
            >
              🔄 Reset Current Form
            </button>
          </div>
          <p style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '10px',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            💡 <strong>Tip:</strong> Save your details as defaults to avoid retyping them for each report. Your data is stored securely on your device.
          </p>
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
      <footer className="handover-footer" style={{
        fontSize: '11px',
        lineHeight: '1.5',
        padding: '30px 20px',
        textAlign: 'center',
        color: '#666',
        borderTop: '1px solid #eee',
        marginTop: '40px'
      }}>
        <div style={{ marginBottom: '15px', fontWeight: '600', color: '#333' }}>
          Disclaimer:
        </div>
        <div style={{ marginBottom: '20px', maxWidth: '800px', margin: '0 auto' }}>
          This property inventory handover report has been specially prepared by the salesperson for informational purposes only. While every effort has been made to ensure the accuracy and completeness of the information contained herein, no warranties or representations are made regarding its accuracy. The recipient is responsible for conducting their own verification and due diligence. The provider of this report accepts no liability for any errors, omissions, or losses arising from its use.
        </div>
        <div style={{ fontWeight: '600', color: '#bc9e7b' }}>
          Powered by Team Mindlink | #thepeoplesagency © 2025
        </div>
      </footer>
    </div>
  );
}

export default App;
