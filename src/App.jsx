import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import imageCompression from 'browser-image-compression';
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
    role: '',
    propertyType: '',
  });
  const [formTouched, setFormTouched] = useState({});

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

  // Error state for validation
  const [submitError, setSubmitError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos(prev => [...prev, { url: ev.target.result, comment: '' }]);
      };
      reader.readAsDataURL(file);
    });
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

  // PDF generation
  const handleGeneratePDF = async () => {
    setSubmitError('');
    // Validate required fields
    if (!form.name || !form.cea || !form.mobile || !form.address) {
      setSubmitError('Please fill in all required fields.');
      return;
    }
    // Optionally: require at least one inventory item or photo
    // if (showInventory && !Object.values(inventory).some(room => Object.values(room || {}).some(i => i.checked))) {
    //   setSubmitError('Please check at least one inventory item.');
    //   return;
    // }
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      let y = 40;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('Property Handover Report', 40, y);
      y += 30;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Date: ${form.date}`, 40, y);
      y += 20;
      doc.text(`Salesperson: ${form.name}`, 40, y);
      y += 18;
      doc.text(`CEA Reg. No.: ${form.cea}`, 40, y);
      y += 18;
      doc.text(`Mobile: ${form.mobile}`, 40, y);
      y += 18;
      doc.text(`Property Address: ${form.address}`, 40, y, { maxWidth: 500 });
      y += 30;
      doc.text(`Role: ${form.role || '-'}`, 40, y);
      y += 18;
      doc.text(`Property Type: ${form.propertyType || '-'}`, 40, y);
      y += 30;
      // Inventory
      if (['HDB', 'Condo', 'Landed'].includes(form.propertyType)) {
        doc.setFont('helvetica', 'bold');
        doc.text('Inventory Checklist', 40, y);
        y += 20;
        doc.setFont('helvetica', 'normal');
        rooms.forEach(room => {
          const checkedItems = (inventory[room.key] ? Object.entries(inventory[room.key]) : []).filter(([idx, item]) => item.checked);
          if (checkedItems.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text(room.name, 50, y);
            y += 16;
            doc.setFont('helvetica', 'normal');
            checkedItems.forEach(([idx, item]) => {
              doc.text(`- ${room.items[idx]} (Qty: ${item.qty})`, 60, y);
              y += 14;
            });
            y += 6;
          }
        });
        y += 10;
      }
      // Photos
      if (photos.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Photos', 40, y);
        y += 20;
        for (let i = 0; i < photos.length; i++) {
          // Compress image
          let imgData = photos[i].url;
          try {
            const file = await fetch(imgData).then(r => r.blob());
            const compressed = await imageCompression(file, { maxWidthOrHeight: 600, maxSizeMB: 0.2 });
            imgData = await imageCompression.getDataUrlFromFile(compressed);
          } catch (e) { /* fallback to original */ }
          // Add image
          if (y > 700) { doc.addPage(); y = 40; }
          doc.addImage(imgData, 'JPEG', 50, y, 120, 90);
          if (photos[i].comment) {
            doc.setFont('helvetica', 'normal');
            doc.text(photos[i].comment, 180, y + 20, { maxWidth: 350 });
          }
          y += 110;
        }
      }
      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('Courtesy brought to you by #thepeoplesagency • Powered by Team Mindlink @2025', 40, 810);
      // Save
      let pdfBlob = doc.output('blob');
      // If over 2MB, warn user (jsPDF does not support further compression)
      if (pdfBlob.size > 2 * 1024 * 1024) {
        setSubmitError('PDF is too large (>2MB). Try reducing the number or size of photos.');
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
        <h1>Handover</h1>
        <p className="handover-intro">
          Create professional property handover reports with inventory tracking and photo documentation. 
          Perfect for HDB, Condo, and Landed properties in Singapore.
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
                  readOnly
                  disabled
                />
              </label>
            </div>
            <div className="handover-form-group">
              <label>
                Role
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="">Select Role</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="handover-form-group">
              <label>
                Property Type
                <select name="propertyType" value={form.propertyType} onChange={handleChange}>
                  <option value="">Select Type</option>
                  {propertyTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
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
            <button
              type="button"
              className="handover-photo-add-btn"
              onClick={handleAddPhotoClick}
              aria-label="Add Photo"
            >
              <span role="img" aria-label="camera" style={{ marginRight: 8 }}>📷</span>
              Add Photo
            </button>
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

      {/* Footer */}
      <footer className="handover-footer">
        Courtesy brought to you by #thepeoplesagency 7 Powered by Team Mindlink @2025
      </footer>
    </div>
  );
}

export default App;
