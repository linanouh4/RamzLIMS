"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

const roles = ["admin", "lab", "reception"];

export default function Employees() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("reception");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id,username,full_name,role")
      .order("id", { ascending: true });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  }

  function openCreateModal() {
    setSelectedUser(null);
    setUsername("");
    setFullName("");
    setPassword("");
    setRole("reception");
    setOpenModal(true);
  }

  function openEditModal(user: any) {
    setSelectedUser(user);
    setUsername(user.username || "");
    setFullName(user.full_name || "");
    setPassword("");
    setRole(user.role || "reception");
    setOpenModal(true);
  }

  async function saveUser() {
    if (!username.trim() || !fullName.trim()) {
      alert("Please enter username and full name");
      return;
    }

    if (!selectedUser && !password.trim()) {
      alert("Please enter a password for the new user");
      return;
    }

    const payload: any = {
      username: username.trim(),
      full_name: fullName.trim(),
      role,
    };

    if (password.trim()) {
      payload.password = password.trim();
    }

    let error = null;

    if (selectedUser) {
      const result = await supabase
        .from("users")
        .update(payload)
        .eq("id", selectedUser.id);
      error = result.error;
    } else {
      const result = await supabase.from("users").insert([payload]);
      error = result.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    setOpenModal(false);
    loadUsers();
  }

  async function deleteUser(id: number) {
    if (!confirm("Delete this user?")) return;

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    loadUsers();
  }

  return (
    <ProtectedRoute adminOnly={true}>
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="flex flex-col gap-6 mb-8 md:flex-row md:justify-between md:items-end">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-3xl font-bold">Users</h1>
              <p className="text-gray-500 mt-2">
                Manage application users and roles.
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg"
          >
            + Add User
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center">No users found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left">ID</th>
                  <th className="p-4 text-left">Username</th>
                  <th className="p-4 text-left">Full Name</th>
                  <th className="p-4 text-left">Role</th>
                  <th className="p-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">{user.id}</td>
                    <td className="p-4">{user.username}</td>
                    <td className="p-4">{user.full_name}</td>
                    <td className="p-4 capitalize">{user.role}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
            <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {selectedUser ? "Edit User" : "Add User"}
                </h2>
                <button
                  onClick={() => setOpenModal(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border rounded-lg p-3"
                  >
                    {roles.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password {selectedUser ? "(leave empty to keep current)" : ""}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border rounded-lg p-3"
                    placeholder={selectedUser ? "New password" : "Password"}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setOpenModal(false)}
                    className="px-5 py-3 rounded-lg border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveUser}
                    className="px-5 py-3 rounded-lg bg-blue-700 text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
