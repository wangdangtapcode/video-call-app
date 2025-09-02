// src/components/admin/UserTable.jsx
import UserRow from "./UserRow";

export default function UserTable({
  users,
  isLoading,
  onBlock,
  onUnblock,
  onDelete,
  onRowClick,
  page = 0,
  totalPages = 1,
  usersPerPage = 5,
  onPageChange,
  onRoleChange,
}) {
  if (isLoading) return <p className="p-4 text-gray-600">Loading users...</p>;

  const pages = totalPages > 0 ? totalPages : 1; // đảm bảo ít nhất 1 nút
  const emptyRows = usersPerPage - users.length; // số hàng trống cần thêm

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 text-gray-600 uppercase text-sm">
          <tr>
            <th className="p-3 border-b text-center">ID</th>
            <th className="p-3 border-b">Full Name</th>
            <th className="p-3 border-b">Email</th>
            <th className="p-3 border-b text-center">Provider</th>
            <th className="p-3 border-b text-center">Role</th>
            <th className="p-3 border-b text-center">Status</th>
            <th className="p-3 border-b text-center">Active</th>
            <th className="p-3 border-b text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {users.map((u, idx) => (
            <UserRow
              key={u.id}
              user={u}
              index={idx}
              onBlock={onBlock}
              onUnblock={onUnblock}
              onDelete={onDelete}
              onRowClick={onRowClick}
              onRoleChange={onRoleChange}
            />
          ))}

          {/* Hàng trống để đủ size */}
          {emptyRows > 0 &&
            Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-12">
                <td colSpan={8} />
              </tr>
            ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>

        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`px-3 py-1 border rounded ${
              i === page ? "bg-blue-500 text-white" : ""
            }`}
          >
            {i + 1}
          </button>
        ))}

        <button
          disabled={page + 1 === pages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
