import React from 'react';
import { ReceiptItem } from '../types';

interface Props {
  items: ReceiptItem[];
  onChange: (items: ReceiptItem[]) => void;
}

const ItemsEditor: React.FC<Props> = ({ items, onChange }) => {
  const handleChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const addItem = () => {
    onChange([...items, { name: '', price: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="grid grid-cols-12 gap-2 bg-gray-50 px-4 py-2 border-b text-xs font-semibold text-gray-500 uppercase">
        <div className="col-span-7">Item Name</div>
        <div className="col-span-4">Price</div>
        <div className="col-span-1"></div>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {items.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">
                No items added yet. Click 'Add Item' or use AI Auto-Fill.
            </div>
        )}
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-100 items-center">
            <div className="col-span-7">
              <input 
                type="text" 
                value={item.name}
                placeholder="Item name"
                onChange={(e) => handleChange(index, 'name', e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none focus:border-b focus:border-primary"
              />
            </div>
            <div className="col-span-4 relative">
              <span className="absolute left-0 text-gray-400 text-sm">$</span>
              <input 
                type="number" 
                value={item.price}
                onChange={(e) => handleChange(index, 'price', parseFloat(e.target.value))}
                className="w-full bg-transparent pl-4 text-sm focus:outline-none focus:border-b focus:border-primary"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <button 
                onClick={() => removeItem(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <button 
        onClick={addItem}
        className="w-full py-2 text-sm text-primary hover:bg-gray-50 font-medium transition-colors border-t"
      >
        + Add Row
      </button>
    </div>
  );
};

export default ItemsEditor;
