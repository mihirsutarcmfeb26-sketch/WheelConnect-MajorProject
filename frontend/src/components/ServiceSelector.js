import React, { useState, useEffect, useRef } from 'react';
import { PREDEFINED_SERVICE_CATEGORIES, ALL_PREDEFINED_SERVICES } from '../constants/services';

let nextCustomId = 1;

/**
 * Grouped predefined-service checkboxes + unlimited custom service inputs.
 * Controlled component: pass the current flat list of selected service names in
 * `selectedServices` (a mix of predefined + custom names) and receive the updated flat
 * list back via `onChange` on every change. Used by both the Service Centre
 * registration form and the "Edit Service Center" form so this UI only exists once.
 */
const ServiceSelector = ({ selectedServices = [], onChange }) => {
  const [checkedPredefined, setCheckedPredefined] = useState(new Set());
  const [customServices, setCustomServices] = useState([]);
  const syncedKeyRef = useRef(null);

  // Sync local state whenever the parent hands us a genuinely different initial list
  // (e.g. once an existing center's services finish loading for the edit form).
  useEffect(() => {
    const list = selectedServices || [];
    const key = JSON.stringify(list);
    if (syncedKeyRef.current === key) return;
    syncedKeyRef.current = key;

    setCheckedPredefined(new Set(list.filter((s) => ALL_PREDEFINED_SERVICES.includes(s))));
    const customValues = list.filter((s) => !ALL_PREDEFINED_SERVICES.includes(s));
    setCustomServices(customValues.map((v) => ({ id: nextCustomId++, value: v })));
  }, [selectedServices]);

  const emitChange = (predefinedSet, customList) => {
    if (!onChange) return;
    const combined = [
      ...ALL_PREDEFINED_SERVICES.filter((s) => predefinedSet.has(s)),
      ...customList.map((c) => c.value.trim()).filter((v) => v.length > 0),
    ];
    onChange(combined);
  };

  const togglePredefined = (service) => {
    const next = new Set(checkedPredefined);
    if (next.has(service)) next.delete(service);
    else next.add(service);
    setCheckedPredefined(next);
    emitChange(next, customServices);
  };

  const addCustomService = () => {
    const next = [...customServices, { id: nextCustomId++, value: '' }];
    setCustomServices(next);
    emitChange(checkedPredefined, next);
  };

  const updateCustomService = (id, value) => {
    const next = customServices.map((c) => (c.id === id ? { ...c, value } : c));
    setCustomServices(next);
    emitChange(checkedPredefined, next);
  };

  const removeCustomService = (id) => {
    const next = customServices.filter((c) => c.id !== id);
    setCustomServices(next);
    emitChange(checkedPredefined, next);
  };

  return (
    <div>
      {PREDEFINED_SERVICE_CATEGORIES.map((group) => (
        <div key={group.category} className="mb-3">
          <div className="text-info small fw-bold mb-2">{group.category}</div>
          <div className="row g-2">
            {group.services.map((service, idx) => {
              const inputId = `svc-${group.category}-${idx}`;
              return (
                <div key={service} className="col-md-4 col-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={inputId}
                      checked={checkedPredefined.has(service)}
                      onChange={() => togglePredefined(service)}
                    />
                    <label className="form-check-label small text-light" htmlFor={inputId}>
                      {service}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-2">
        <div className="text-info small fw-bold mb-2">Custom Services</div>
        {customServices.map((c, idx) => (
          <div key={c.id} className="input-group input-group-sm mb-2">
            <span className="input-group-text bg-dark border-secondary text-muted" style={{ minWidth: '92px' }}>
              Custom {idx + 1}
            </span>
            <input
              type="text"
              className="form-control bg-dark text-white border-secondary"
              placeholder="e.g. Windshield Replacement"
              value={c.value}
              onChange={(e) => updateCustomService(c.id, e.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => removeCustomService(c.id)}
              title="Remove this custom service"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-outline-info btn-sm" onClick={addCustomService}>
          <i className="bi bi-plus-circle me-1"></i>
          {customServices.length === 0 ? 'Add Service' : 'Add Another'}
        </button>
      </div>
    </div>
  );
};

export default ServiceSelector;
