// src/components/admin/UserRow.jsx
export default function UserRow({ user, index, onBlock, onUnblock, onDelete }) {
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
      <td className="p-3 border-b">{user.id}</td>
      <td className="p-3 border-b font-medium">{user.fullName}</td>
      <td className="p-3 border-b">{user.email}</td>
      <td className="p-3 border-b">
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold
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
      </td>
      <td className="p-3 border-b text-center">
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold
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
      <td className="p-3 border-b text-center">
        {user.active ? (
          <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs">Yes</span>
        ) : (
          <span className="px-2 py-1 bg-gray-300 text-gray-700 rounded-full text-xs">No</span>
        )}
      </td>
      <td className="p-3 border-b flex gap-2 justify-center">
        {user.active ? (
          <button
            onClick={() => handleBlock(user.id)}
            className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition"
          >
            Block
          </button>
        ) : (
          <button
            onClick={() => handleUnblock(user.id)}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            Unblock
          </button>
        )}
        <button
          onClick={() => handleDelete(user.id)}
          className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
