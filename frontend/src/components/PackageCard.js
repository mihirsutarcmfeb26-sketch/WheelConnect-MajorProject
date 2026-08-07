import React from 'react';
import { parsePackageIncludes, formatDuration, formatPrice } from '../utils/packageDisplay';

/**
 * A clean, professional card for one Service Package - name, price, what's
 * included (parsed from the existing description field), and estimated
 * duration. Used for package selection, booking summaries, and payment
 * screens so the customer sees the same details everywhere.
 *
 * Pass onSelect to make it an interactive, selectable card (Package
 * Selection Screen). Omit it for a read-only summary card (Booking
 * Summary, Payment Checkout, Customer Dashboard, success screen).
 */
const PackageCard = ({ pkg, selected = false, onSelect, compact = false }) => {
  if (!pkg) return null;
  const includes = parsePackageIncludes(pkg.description);
  const duration = formatDuration(pkg.durationInMinutes);
  const interactive = typeof onSelect === 'function';

  return (
    <div
      className={`card h-100 text-white ${compact ? 'p-2' : 'p-3'} ${
        selected ? 'border-success bg-success bg-opacity-10' : 'border-secondary bg-dark'
      }`}
      style={{
        borderWidth: selected ? 2 : 1,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        overflowWrap: 'anywhere',
      }}
      onClick={interactive ? onSelect : undefined}
      role={interactive ? 'button' : undefined}
    >
      <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
        <h6 className={`fw-bold text-primary mb-0 text-break ${compact ? 'small' : ''}`} style={{ minWidth: 0 }}>
          <i className="bi bi-tools me-1"></i>
          {pkg.name}
        </h6>
        {selected && (
          <span className="badge bg-success flex-shrink-0">
            <i className="bi bi-check-circle-fill me-1"></i>Selected
          </span>
        )}
      </div>

      <div className={`fw-bold text-success mb-2 ${compact ? 'small' : 'fs-6'}`}>
        <i className="bi bi-currency-rupee"></i>
        {formatPrice(pkg.price)}
      </div>

      {includes ? (
        <ul className="list-unstyled small mb-2 text-light">
          {includes.map((item, idx) => (
            <li key={idx} className="mb-1 text-break">
              <i className="bi bi-check2 text-success me-1"></i>
              {item}
            </li>
          ))}
        </ul>
      ) : pkg.description ? (
        <p className="small text-light opacity-75 mb-2 text-break">{pkg.description}</p>
      ) : null}

      {duration && (
        <div className="small text-light opacity-75 mt-auto">
          <i className="bi bi-clock me-1"></i>
          Estimated Duration: {duration}
        </div>
      )}

      {interactive && !compact && (
        <button
          type="button"
          className={`btn btn-sm w-100 mt-2 ${selected ? 'btn-success' : 'btn-outline-light'}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {selected ? (
            <>
              <i className="bi bi-check2 me-1"></i>
              Selected
            </>
          ) : (
            'Select Package'
          )}
        </button>
      )}
    </div>
  );
};

export default PackageCard;
