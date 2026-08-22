"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
const roles = ["admin", "lab", "reception", "technician"];
export default function Employees() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("reception");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    
    loadUsers();
  }, []);
async function uploadSignature(
  e: React.ChangeEvent<HTMLInputElement>
) {
  const file = e.target.files?.[0];
  if (!file) return;

  const extension = file.name.split(".").pop();
  const fileName = `signature-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("signatures")
    .upload(fileName, file);

  if (uploadError) {
    alert(uploadError.message);
    return;
  }

  const { data } = supabase.storage
    .from("signatures")
    .getPublicUrl(fileName);

  setSignature(data.publicUrl);

  alert("Signature uploaded successfully");
}

async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id,username,full_name,role,signature")
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
    setSignature("");
    setOpenModal(true);
  }

  function openEditModal(user: any) {
    setSelectedUser(user);
    setUsername(user.username || "");
    setFullName(user.full_name || "");
    setPassword("");
    setRole(user.role || "reception");
    setSignature(user.signature || "");
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

  try {
    if (selectedUser) {
      // بيانات المستخدم الذي سيتم تعديله
      const updateData: any = {
        username: username.trim(),
        full_name: fullName.trim(),
        role: role,
        signature: signature || null,
      };

      // تغيير كلمة المرور فقط إذا أدخلنا كلمة جديدة
      if (password.trim()) {
        updateData.password = password.trim();
      }

      console.log("UPDATING USER ID:", selectedUser.id);
      console.log("UPDATE DATA:", updateData);

      const { data: updatedUser, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", selectedUser.id)
        .select("id, username, full_name, role, signature");

      console.log("UPDATED USER:", updatedUser);
      console.log("UPDATE ERROR:", error);

      if (error) {
        alert("SAVE ERROR: " + error.message);
        return;
      }

      if (!updatedUser || updatedUser.length === 0) {
        alert(
          "لم يتم تعديل المستخدم. تحقق من صلاحيات UPDATE في Supabase."
        );
        return;
      }

      alert("تم تعديل المستخدم بنجاح");

    } else {
      // إنشاء مستخدم جديد
      const { data: newUser, error } = await supabase
        .from("users")
        .insert([
          {
            username: username.trim(),
            full_name: fullName.trim(),
            password: password.trim(),
            role: role,
            signature: signature || null,
          },
        ])
        .select("id, username, full_name, role, signature");

      console.log("CREATED USER:", newUser);
      console.log("CREATE ERROR:", error);

      if (error) {
        alert("SAVE ERROR: " + error.message);
        return;
      }

      alert("تم إنشاء المستخدم بنجاح");
    }

    setOpenModal(false);
    await loadUsers();

  } catch (err) {
    console.error("SAVE USER ERROR:", err);
    alert("حدث خطأ أثناء حفظ المستخدم");
  }
}
async function deleteUser(id: number) {
  if (!confirm("Delete this user?")) return;

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadUsers();
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
<div>
  <label className="block text-sm font-medium mb-2">
    Role
  </label>

  <select
    value={role}
    onChange={(e) => setRole(e.target.value)}
    className="w-full border rounded-lg p-3"
  >
    {roles.map((r) => (
      <option key={r} value={r}>
        {r}
      </option>
    ))}
  </select>
</div>
               <div>
  <label className="block text-sm font-medium mb-2">
    Signature
  </label>

  <input
    type="file"
    accept="image/*"
    onChange={uploadSignature}
    className="w-full border rounded-lg p-3"
  />

  {signature && (
  <>
    <img
      src={signature}
      alt="Signature"
      className="mt-3 h-16 border rounded object-contain"
    />
    <p>{signature}</p>
  </>
)}
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
