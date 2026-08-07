import React from 'react';
import ServiceCenterMap from './ServiceCenterMap';

const GoogleMapPicker = ({ onSelectCenter, selectedCenterId }) => {
  return (
    <ServiceCenterMap
      onSelectCenter={onSelectCenter}
      selectedCenterId={selectedCenterId}
    />
  );
};

export default GoogleMapPicker;
