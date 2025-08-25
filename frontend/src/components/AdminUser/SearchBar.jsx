// src/components/admin/SearchBar.jsx
export default function SearchBar({ value, onChange, onOpenModal }) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Search users..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={onOpenModal}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition"
      >
        + Add User
      </button>
    </div>
  );
}
