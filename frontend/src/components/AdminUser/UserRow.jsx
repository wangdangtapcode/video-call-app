import { useState } from "react";

export default function UserRow({ user, index, onBlock, onUnblock, onDelete, onRowClick, onRoleChange }) {
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);

  const handleRoleSave = () => {
    setEditingRole(false);
    if (selectedRole !== user.role) {
      if (window.confirm(`Are you sure you want to change role from ${user.role} to ${selectedRole}?`)) {
        onRoleChange(user.id, selectedRole);
      } else {
        // revert lại nếu cancel
        setSelectedRole(user.role);
      }
    }
  };

  const handleBlock = (id) => {
    if (window.confirm("Are you sure you want to block this user?")) {
      onBlock(id);
    }
  };

  const handleUnblock = (id) => {
    if (window.confirm("Are you sure you want to unblock this user?")) {
      onUnblock(id);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      onDelete(id);
    }
  };

  return (
    <tr className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
      <td className="p-3 border-b text-center">{user.id}</td>
      <td className="p-3 border-b font-medium">{user.fullName}</td>
      <td className="p-3 border-b">{user.email}</td>

      {/* Provider */}
      <td className="p-3 border-b text-center">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium
            ${
              user.provider === "GOOGLE"
                ? "bg-red-100 text-red-600"
                : user.provider === "FACEBOOK"
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-600"
            }`}
        >
          {user.provider || "LOCAL"}
        </span>
      </td>

      {/* Role (Editable with confirm) */}
      <td className="p-3 border-b text-center">
        {editingRole ? (
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            onBlur={handleRoleSave}
            className="px-2 py-1 rounded-md border text-xs font-medium"
            autoFocus
          >
            <option value="ADMIN">ADMIN</option>
            <option value="AGENT">AGENT</option>
            <option value="USER">USER</option>
          </select>
        ) : (
          <span
            onClick={() => setEditingRole(true)}
            className={`cursor-pointer px-2 py-1 rounded-full text-xs font-medium
              ${
                user.role === "ADMIN"
                  ? "bg-red-100 text-red-600"
                  : user.role === "AGENT"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-green-100 text-green-600"
              }`}
          >
            {user.role}
          </span>
        )}
      </td>

      {/* Status */}
      <td className="p-3 border-b text-center">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium
            ${
              user.status === "ONLINE"
                ? "bg-green-100 text-green-600"
                : user.status === "OFFLINE"
                ? "bg-gray-100 text-gray-600"
                : user.status === "BUSY"
                ? "bg-yellow-100 text-yellow-600"
                : user.status === "CALLING"
                ? "bg-blue-100 text-blue-600"
                : "bg-red-100 text-red-600"
            }`}
        >
          {user.status || "OFFLINE"}
        </span>
      </td>

      {/* Active */}
      <td className="p-3 border-b text-center">
        {user.active ? (
          <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs">Yes</span>
        ) : (
          <span className="px-2 py-1 bg-gray-300 text-gray-700 rounded-full text-xs">No</span>
        )}
      </td>

      {/* Actions */}
      <td className="p-3 border-b flex gap-2 justify-center">
        {onRowClick && (
          <button
            title="View"
            onClick={() => onRowClick(user.id)}
            className="p-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
          >
            👁️
          </button>
        )}
        {user.active ? (
          <button
            title="Block"
            onClick={() => handleBlock(user.id)}
            className="p-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition"
          >
            🔒
          </button>
        ) : (
          <button
            title="Unblock"
            onClick={() => handleUnblock(user.id)}
            className="p-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            🔓
          </button>
        )}
        <button
          title="Delete"
          onClick={() => handleDelete(user.id)}
          className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
        >
          🗑️
        </button>
      </td>
    </tr>
  );
}
