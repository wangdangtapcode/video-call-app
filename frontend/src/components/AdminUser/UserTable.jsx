// src/components/admin/UserTable.jsx
import UserRow from "./UserRow";

export default function UserTable({ users, isLoading, onBlock, onUnblock, onDelete, onRowClick }) {
  if (isLoading) return <p className="p-4 text-gray-600">Loading users...</p>;

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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
