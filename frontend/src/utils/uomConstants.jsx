export const UOM_OPTIONS = [
  {
    category: 'Quantity',
    options: [
      { value: 'PCS', label: 'PCS / Piece' },
      { value: 'Box', label: 'Box' },
      { value: 'Pack', label: 'Pack' },
      { value: 'Bundle', label: 'Bundle' },
      { value: 'Carton', label: 'Carton' },
      { value: 'Dozen', label: 'Dozen' },
      { value: 'Set', label: 'Set' }
    ]
  },
  {
    category: 'Length',
    options: [
      { value: 'Meter', label: 'Meter' },
      { value: 'Centimeter', label: 'Centimeter' },
      { value: 'Feet', label: 'Feet' },
      { value: 'Inch', label: 'Inch' },
      { value: 'Yard', label: 'Yard' }
    ]
  },
  {
    category: 'Weight',
    options: [
      { value: 'Kilogram', label: 'Kilogram' },
      { value: 'Gram', label: 'Gram' },
      { value: 'Ton', label: 'Ton' },
      { value: 'Pound', label: 'Pound' }
    ]
  },
  {
    category: 'Volume',
    options: [
      { value: 'Liter', label: 'Liter' },
      { value: 'Milliliter', label: 'Milliliter' },
      { value: 'Gallon', label: 'Gallon' }
    ]
  }
];

export const renderUomOptions = () => {
  return UOM_OPTIONS.map((group) => (
    <optgroup key={group.category} label={group.category}>
      {group.options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </optgroup>
  ));
};
