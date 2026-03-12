import React from "react";

export interface CommandItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface Props {
  isOpen: boolean;
  items: CommandItem[];
  onClose: () => void;
  onSelect: (item: CommandItem) => void;
}

const CommandPalette: React.FC<Props> = ({
  isOpen,
  items,
  onClose,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-32"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b p-3 font-semibold">Search</div>

        <div className="max-h-80 overflow-y-auto">
          {items.map((item, i) => (
            <button
              key={i}
              className="flex w-full items-center gap-3 border-b px-4 py-3 text-left hover:bg-gray-100"
              onClick={() => onSelect(item)}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-xs text-gray-500">{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;